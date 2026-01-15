"""
Sentry Tunnel Endpoint
Proxies Sentry events from frontend to avoid ad-blocker issues.
See: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
"""
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import httpx
import json
from urllib.parse import urlparse
from app.core.config import settings

router = APIRouter(prefix="/sentry-tunnel", tags=["sentry"])

# Security limits
MAX_ENVELOPE_SIZE = 200 * 1024  # 200 KB cap for Sentry envelopes
SENTRY_TIMEOUT = 5.0  # seconds


@router.post("")
async def sentry_tunnel(request: Request):
    """
    Tunnel endpoint for Sentry events.
    Forwards events from frontend to Sentry to bypass ad-blockers.
    SECURED: Limits size, enforces HTTPS, restricts to configured Sentry host.
    """
    try:
        # 1. Size Check
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_ENVELOPE_SIZE:
             return JSONResponse(
                status_code=413,
                content={"error": "Payload too large"},
            )
            
        # Get the raw body (check actual size if header was missing/lied)
        body = await request.body()
        if len(body) > MAX_ENVELOPE_SIZE:
            return JSONResponse(
                status_code=413,
                content={"error": "Payload too large"},
            )

        # Parse the envelope header to extract the DSN
        envelope = body.decode("utf-8", errors="replace")
        lines = envelope.split("\n", 1)
        if not lines or not lines[0].strip():
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid envelope format"},
            )

        try:
            header = json.loads(lines[0])
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid envelope header"},
            )

        dsn = header.get("dsn")
        if not dsn:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing DSN in envelope"},
            )

        parsed = urlparse(dsn)
        project_id = parsed.path.lstrip("/").split("/", 1)[0]
        if not parsed.scheme or not parsed.netloc or not project_id:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid DSN format"},
            )

        # 2. Host Validation (SSRF Prevention)
        # Only allow tunneling if we have a configured SENTRY_DSN
        if not settings.SENTRY_DSN:
             return JSONResponse(
                status_code=503,
                content={"error": "Sentry tunnel not configured on server"},
            )

        allowed = urlparse(settings.SENTRY_DSN)
        if parsed.netloc != allowed.netloc:
             return JSONResponse(
                status_code=403,
                content={"error": f"Unauthorized Sentry host: {parsed.netloc}"},
            )

        # 3. Enforce HTTPS
        sentry_host = f"https://{parsed.netloc}"
        sentry_url = f"{sentry_host}/api/{project_id}/envelope/"

        # Forward to Sentry with 4. Timeout
        async with httpx.AsyncClient(timeout=SENTRY_TIMEOUT) as client:
            sentry_response = await client.post(
                sentry_url,
                content=body,
                headers={
                    "Content-Type": request.headers.get("Content-Type", "application/x-sentry-envelope"),
                }
            )

        return Response(
            content=sentry_response.content,
            status_code=sentry_response.status_code,
            headers=dict(sentry_response.headers)
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Tunnel error: {str(e)}"}
        )
