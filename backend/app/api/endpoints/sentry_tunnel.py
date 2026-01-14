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

        sentry_host = f"{parsed.scheme}://{parsed.netloc}"
        sentry_url = f"{sentry_host}/api/{project_id}/envelope/"

        # Forward to Sentry
        async with httpx.AsyncClient() as client:
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
