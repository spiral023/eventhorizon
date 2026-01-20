from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/version")
async def get_version():
    return {"version": settings.PROJECT_VERSION}


@router.get("/health")
async def health_check():
    return {"status": "ok"}
