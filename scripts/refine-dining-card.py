"""Prepare a native-resolution dining preview with conservative edge refinement."""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


image_dir = Path(__file__).resolve().parents[1] / "public" / "images"
with Image.open(image_dir / "dining.jpg") as source:
    image = ImageOps.exif_transpose(source).convert("RGB")
    image = ImageOps.autocontrast(image, cutoff=0.25, preserve_tone=True)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    image = ImageEnhance.Brightness(image).enhance(1.01)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=135, threshold=3))
    destination = image_dir / "dining-card-refined.webp"
    image.save(destination, "WEBP", quality=98, method=6)
    print(f"Saved {destination.name}: {image.width} x {image.height}; {destination.stat().st_size:,} bytes")
