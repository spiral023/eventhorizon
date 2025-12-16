"""
Sentry Tunnel Endpoint
Proxies Sentry events from frontend to avoid ad-blocker issues.
See: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
"""
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import httpx
from app.core.config import settings

router = APIRouter(prefix="/sentry-tunnel", tags=["sentry"])


@router.post("")
async def sentry_tunnel(request: Request):
    """
    Tunnel endpoint for Sentry events.
    Forwards events from frontend to Sentry to bypass ad-blockers.
    """
    try:
        # Get the raw body
        body = await request.body()

        # Parse the envelope to extract the DSN
        envelope = body.decode('utf-8')

        # Extract DSN from the first line (envelope header)
        lines = envelope.split('\n')
        if not lines:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid envelope format"}
            )

        # Get DSN from environment (frontend should use same org)
        # The frontend DSN should point to the same Sentry org
        sentry_host = "https://o4510541574111232.ingest.de.sentry.io"

        # Forward to Sentry
        async with httpx.AsyncClient() as client:
            sentry_response = await client.post(
                f"{sentry_host}/api/4510541685391440/envelope/",
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
