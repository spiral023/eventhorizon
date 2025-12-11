from io import BytesIO
from typing import Literal, Tuple

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException
from PIL import Image, ImageOps

from app.core.config import settings

EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
}

# Mapping of desired output format -> (Pillow format name, MIME, file extension)
OUTPUT_FORMATS = {
    "webp": ("WEBP", "image/webp", "webp"),
    "avif": ("AVIF", "image/avif", "avif"),
    "jpeg": ("JPEG", "image/jpeg", "jpg"),
    "jpg": ("JPEG", "image/jpeg", "jpg"),
    "png": ("PNG", "image/png", "png"),
}


def _get_s3_client():
    region = settings.AWS_DEFAULT_REGION
    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=f"https://s3.{region}.amazonaws.com",
        config=Config(s3={"addressing_style": "virtual"}),
    )


def _bucket_base_url() -> str:
    return (
        settings.STORAGE_BUCKET_BASE_URL
        or f"https://{settings.STORAGE_BUCKET}.s3.{settings.AWS_DEFAULT_REGION}.amazonaws.com"
    )


def _public_url(key: str) -> str:
    return f"{_bucket_base_url()}/{key}"


def _normalize_output_format(desired: str | None) -> Tuple[str, str, str]:
    """
    Returns (pillow_format, mime, ext). Falls back to WEBP if requested format is unavailable.
    """
    requested = (desired or settings.AVATAR_OUTPUT_FORMAT or "webp").lower()
    format_tuple = OUTPUT_FORMATS.get(requested)

    if format_tuple:
        pillow_format = format_tuple[0]
        available_formats = {fmt.upper() for fmt in Image.registered_extensions().values()}
        if pillow_format in available_formats:
            return format_tuple

    # Default fallback to WEBP which Pillow supports out of the box
    fallback = OUTPUT_FORMATS["webp"]
    return fallback


def generate_avatar_upload_url(user_id, content_type: str, file_size: int):
    """
    Returns a presigned URL and the upload key for the original avatar upload.
    The caller must later trigger processing via process_avatar_upload.
    """
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
    # Deterministic original key so we can process & overwrite safely
    key = f"avatars/{user_id}/orig.{ext}"

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

    return upload_url, _public_url(key), key


def _center_crop_and_resize(img: Image.Image, size: int) -> Image.Image:
    # Normalize EXIF orientation and crop to a centered square before resizing
    img = ImageOps.exif_transpose(img)
    cropped = ImageOps.fit(img, (size, size), method=Image.Resampling.LANCZOS)
    return cropped


def process_avatar_upload(
    user_id,
    upload_key: str,
    desired_format: Literal["webp", "avif", "jpeg", "jpg", "png"] | None = None,
) -> str:
    """
    Downloads the uploaded avatar, resizes/crops, stores optimized version, and returns the public URL.
    """
    if not settings.STORAGE_BUCKET:
        raise HTTPException(status_code=500, detail="Storage bucket not configured")

    expected_prefix = f"avatars/{user_id}/"
    if not upload_key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="Invalid upload key for this user")

    s3_client = _get_s3_client()
    try:
        obj = s3_client.get_object(Bucket=settings.STORAGE_BUCKET, Key=upload_key)
    except ClientError as exc:
        status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 500)
        raise HTTPException(status_code=status, detail="Could not read uploaded avatar") from exc

    raw_bytes = obj["Body"].read()
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            target_size = settings.AVATAR_PROCESSED_SIZE
            processed = _center_crop_and_resize(img, target_size)

            pillow_format, mime, ext = _normalize_output_format(desired_format)
            buffer = BytesIO()

            save_kwargs = {"quality": 88}
            if pillow_format == "WEBP":
                save_kwargs["method"] = 6
            if pillow_format in ("JPEG",):
                processed = processed.convert("RGB")

            processed.save(buffer, format=pillow_format, **save_kwargs)
            buffer.seek(0)

            target_key = f"avatars/{user_id}/avatar_{target_size}.{ext}"
            s3_client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=target_key,
                Body=buffer.getvalue(),
                ContentType=mime,
                CacheControl="public, max-age=31536000, immutable",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to process avatar") from exc

    return _public_url(target_key)
