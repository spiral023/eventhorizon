import time
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwk, jwt
from jose.utils import base64url_decode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import sentry_sdk

from app.core.config import settings
from app.db.session import get_db
from app.models.domain import User

bearer_scheme = HTTPBearer(auto_error=False)


class _JWKSCache:
    def __init__(self) -> None:
        self._jwks: dict | None = None
        self._expires_at: float = 0

    async def get(self) -> dict:
        now = time.time()
        if self._jwks and now < self._expires_at:
            return self._jwks
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(settings.BETTER_AUTH_JWKS_URL)
            response.raise_for_status()
            self._jwks = response.json()
            self._expires_at = now + settings.BETTER_AUTH_JWKS_CACHE_SECONDS
            return self._jwks


_jwks_cache = _JWKSCache()


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _validate_claims(payload: dict) -> None:
    now = int(time.time())
    exp = payload.get("exp")
    if exp and now >= int(exp):
        raise _credentials_exception()

    aud = payload.get("aud")
    expected_aud = settings.BETTER_AUTH_AUDIENCE
    if expected_aud:
        valid_aud = (
            isinstance(aud, str)
            and aud == expected_aud
            or isinstance(aud, list)
            and expected_aud in aud
        )
        if not valid_aud:
            raise _credentials_exception()

    expected_iss = settings.BETTER_AUTH_ISSUER
    if expected_iss and payload.get("iss") != expected_iss:
        raise _credentials_exception()


async def _decode_token(token: str) -> dict:
    jwks = await _jwks_cache.get()
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise _credentials_exception()

    key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key_data:
        raise _credentials_exception()

    public_key = jwk.construct(key_data)
    message, encoded_signature = token.rsplit(".", 1)
    decoded_signature = base64url_decode(encoded_signature.encode())
    if not public_key.verify(message.encode(), decoded_signature):
        raise _credentials_exception()

    payload = jwt.get_unverified_claims(token)
    _validate_claims(payload)
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _credentials_exception()

    try:
        payload = await _decode_token(credentials.credentials)
        user_identifier: str | None = payload.get("sub")
        user_email: str | None = payload.get("email")
    except httpx.HTTPError:
        raise _credentials_exception()

    user = None
    if user_identifier:
        try:
            user_uuid = UUID(str(user_identifier))
            result = await db.execute(select(User).where(User.id == user_uuid))
            user = result.scalar_one_or_none()
        except ValueError:
            user = None

    if user is None and user_email:
        result = await db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

    if user is None and user_email:
        # Create a minimal local user record from claims so downstream endpoints work.
        name = payload.get("name", "") or ""
        first_name, _, last_name = name.partition(" ")
        first_name = first_name or user_email.split("@")[0]
        last_name = last_name or ""
        try:
            user = User(
                email=user_email,
                first_name=first_name,
                last_name=last_name,
                hashed_password="better-auth",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            logging.info("Created local user from Better Auth claims: %s", user_email)
        except Exception as exc:  # pragma: no cover - defensive logging
            await db.rollback()
            logging.exception("Failed to create user from Better Auth claims: %s", user_email)
            raise _credentials_exception() from exc

    if user is None or not user.is_active:
        raise _credentials_exception()
    
    # Set user context for Sentry
    if settings.SENTRY_DSN:
        sentry_sdk.set_user({"id": str(user.id), "email": user.email})
        
    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
