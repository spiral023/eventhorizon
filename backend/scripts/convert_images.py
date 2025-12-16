import argparse
import os
import sys
import logging
from pathlib import Path
from PIL import Image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def convert_images(source_dir, output_format, quality=80, delete_original=False):
    """
    Converts images in a directory to the specified format.
    """
    source_path = Path(source_dir)
    
    if not source_path.exists():
        logger.error(f"Directory '{source_dir}' not found.")
        return

    # Extensions to look for
    supported_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff'}
    
    # We want to find files that match extensions but are NOT already the target format
    files = [
        f for f in source_path.iterdir() 
        if f.is_file() 
        and f.suffix.lower() in supported_extensions 
        and f.suffix.lower() != f'.{output_format.lower()}'
    ]
    
    if not files:
        logger.info(f"No matching images found in '{source_dir}' to convert.")
        return

    logger.info(f"Found {len(files)} images. Converting to {output_format.upper()}...")

    success_count = 0
    
    for file_path in files:
        try:
            target_path = file_path.with_suffix(f'.{output_format.lower()}')
            
            # Skip if target already exists and is newer than source (basic incremental check)
            if target_path.exists() and target_path.stat().st_mtime > file_path.stat().st_mtime:
                logger.debug(f"Skipping {file_path.name} (target exists and is newer)")
                continue

            with Image.open(file_path) as img:
                # Handle RGBA for formats that don't support it (like JPEG)
                if output_format.lower() in ['jpeg', 'jpg'] and img.mode == 'RGBA':
                    img = img.convert('RGB')
                
                # Save
                img.save(target_path, format=output_format, quality=quality)
                logger.info(f"Converted: {file_path.name} -> {target_path.name}")
                success_count += 1
            
            if delete_original:
                try:
                    file_path.unlink()
                    logger.info(f"Deleted original: {file_path.name}")
                except OSError as e:
                    logger.error(f"Error deleting {file_path.name}: {e}")

        except Exception as e:
            logger.error(f"Failed to convert {file_path.name}: {e}")

    logger.info(f"Batch complete. {success_count}/{len(files)} images processed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert images to WebP or AVIF.")
    parser.add_argument("--source_dir", default="/app/nanobanana-output", help="Path to the directory containing images")
    parser.add_argument("--format", default="webp", choices=["webp", "avif"], help="Target format (default: webp)")
    parser.add_argument("--quality", type=int, default=80, help="Image quality (0-100)")
    parser.add_argument("--delete-original", action="store_true", help="Delete the original file after successful conversion")

    args = parser.parse_args()
    
    convert_images(args.source_dir, args.format, args.quality, args.delete_original)
