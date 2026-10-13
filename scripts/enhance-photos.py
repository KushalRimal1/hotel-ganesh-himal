"""Create gently enhanced dining previews while preserving original photos.

Requires Pillow: python -m pip install Pillow
Run from the project root: python scripts/enhance-photos.py
"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


IMAGE_DIR = Path(__file__).resolve().parents[1] / "public" / "images"
PHOTOS = {
    "dining.jpg": "dining-enhanced.webp",
    "fulldining.jpeg": "fulldining-enhanced.webp",
}


def enhance(source: Path, destination: Path) -> None:
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        original_size = image.size
        # Conservative tone and edge adjustments avoid excessive halos and colour shifts.
        image = ImageOps.autocontrast(image, cutoff=0.2, preserve_tone=True)
        image = ImageEnhance.Contrast(image).enhance(1.035)
        image = ImageEnhance.Color(image).enhance(0.98)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=3))
        image = image.resize((image.width * 2, image.height * 2), Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=3))
        image.save(destination, "WEBP", quality=94, method=6)
        print(f"{source.name}: {original_size} -> {destination.name}: {image.size}, {destination.stat().st_size:,} bytes")


if __name__ == "__main__":
    for filename, output in PHOTOS.items():
        enhance(IMAGE_DIR / filename, IMAGE_DIR / output)
