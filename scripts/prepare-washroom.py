"""Create a clean washroom image, preserving the original camera photo."""

from pathlib import Path
from PIL import Image, ImageOps


image_dir = Path(__file__).resolve().parents[1] / "public" / "images"
with Image.open(image_dir / "washroom.jpg") as source:
    image = ImageOps.exif_transpose(source).convert("RGB")
    # The device label is in the bottom floor strip, below all bathroom fixtures.
    image = image.crop((0, 0, image.width, image.height - round(image.height * 0.07)))
    output = image_dir / "washroom-clean.webp"
    image.save(output, "WEBP", quality=94, method=6)
    print(f"Saved {output.name}: {image.width} x {image.height}")
