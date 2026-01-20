from fastapi import APIRouter

from app.api.endpoints import (
    activities,
    ai,
    auth,
    dev,
    emails,
    events,
    misc,
    rooms,
    search,
    sentry_tunnel,
    users,
)
from app.core.config import settings

router = APIRouter()

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(ai.router)
router.include_router(emails.router)
if settings.APP_ENV.lower() != "production":
    router.include_router(dev.router)
router.include_router(sentry_tunnel.router)

router.include_router(misc.router)
router.include_router(search.router)
router.include_router(activities.router)
router.include_router(rooms.router)
router.include_router(events.router)
