"""
Development and testing endpoints.
These endpoints should be disabled in production.
"""
from fastapi import APIRouter
import sentry_sdk

router = APIRouter(prefix="/dev", tags=["development"])


@router.get("/sentry/test-error")
async def test_sentry_error():
    """
    Test endpoint that triggers a Sentry error.
    This should appear in your Sentry dashboard.
    """
    raise Exception("Test Sentry Backend Integration - This is a test error!")


@router.get("/sentry/test-message")
async def test_sentry_message():
    """
    Test endpoint that sends a message to Sentry.
    """
    sentry_sdk.capture_message("Test message from EventHorizon Backend", level="info")
    return {"message": "Test message sent to Sentry"}


@router.get("/sentry/test-transaction")
async def test_sentry_transaction():
    """
    Test endpoint that creates a transaction for performance monitoring.
    """
    with sentry_sdk.start_transaction(op="test", name="Test Transaction"):
        with sentry_sdk.start_span(op="test.operation", description="Test operation"):
            # Simulate some work
            import time
            time.sleep(0.1)

        with sentry_sdk.start_span(op="test.database", description="Fake DB query"):
            time.sleep(0.05)

    return {"message": "Test transaction completed"}
