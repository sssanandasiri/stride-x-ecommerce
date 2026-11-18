"""
Safe handling of uploaded product photos.

Never trust what a browser says about a file ("it's a jpg", "it's small").
We check the real bytes with Pillow, limit size, and ignore the original file
name (a name like ../../evil.py must never reach the disk).
"""
from PIL import Image, UnidentifiedImageError

MAX_BYTES = 5 * 1024 * 1024      # 5 MB
MAX_PIXELS = 25_000_000          # e.g. 5000 x 5000
ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def check_image(upload):
    """Return the safe file extension for `upload`, or raise ValueError with a message for the admin."""
    if upload.size > MAX_BYTES:
        raise ValueError("That image is too large. The maximum is 5 MB.")
    try:
        upload.seek(0)
        with Image.open(upload) as img:
            image_format = img.format
            if image_format not in ALLOWED_FORMATS:
                raise ValueError("Please upload a JPG, PNG or WebP image.")
            if img.width * img.height > MAX_PIXELS:
                raise ValueError("That image's dimensions are too large.")
            img.verify()  # checks the file isn't corrupt
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ValueError("That file isn't a valid image.") from exc
    upload.seek(0)
    return ALLOWED_FORMATS[image_format]
