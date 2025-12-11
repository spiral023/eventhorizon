import uuid

import boto3
from botocore.config import Config
from fastapi import HTTPException

from app.core.config import settings

EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
}


def _get_s3_client():
    region = settings.AWS_DEFAULT_REGION
    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=f"https://s3.{region}.amazonaws.com",
        config=Config(s3={"addressing_style": "virtual"}),
    )


def generate_avatar_upload_url(user_id, content_type: str, file_size: int):
    if not settings.STORAGE_BUCKET:
        raise HTTPException(status_code=500, detail="Storage bucket not configured")

    if content_type not in settings.AVATAR_ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="File type not allowed")

    max_bytes = settings.AVATAR_MAX_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {settings.AVATAR_MAX_SIZE_MB}MB allowed.",
        )

    ext = EXTENSION_MAP.get(content_type, "bin")
    key = f"avatars/{user_id}/{uuid.uuid4()}.{ext}"

    s3_client = _get_s3_client()
    params = {
        "Bucket": settings.STORAGE_BUCKET,
        "Key": key,
        "ContentType": content_type,
        "CacheControl": "public, max-age=31536000, immutable",
    }

    upload_url = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params=params,
        ExpiresIn=300,  # 5 minutes
    )

    base_url = settings.STORAGE_BUCKET_BASE_URL or f"https://{settings.STORAGE_BUCKET}.s3.{settings.AWS_DEFAULT_REGION}.amazonaws.com"
    public_url = f"{base_url}/{key}"

    return upload_url, public_url
