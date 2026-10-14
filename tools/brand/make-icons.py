#!/usr/bin/env python3
"""Generate every icon the app needs from the two source images in brand/.

    python3 tools/brand/make-icons.py

Needs Pillow (`pip install pillow`) and, for the macOS .icns, `iconutil`
(ships with macOS). The generated files are committed, so this only has to be
run when brand/logo.png or brand/app-icon.png changes.

  brand/app-icon.png  ->  apps/desktop/build/   (app icon: .icns, .ico, PNG sizes)
  brand/logo.png      ->  apps/desktop/src/renderer/src/assets/logo.png (in-app logo)
                          apps/desktop/src/renderer/public/favicon.*     (favicon)
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
APP_ICON = ROOT / "brand" / "app-icon.png"
LOGO = ROOT / "brand" / "logo.png"
BUILD = ROOT / "apps" / "desktop" / "build"
RENDERER = ROOT / "apps" / "desktop" / "src" / "renderer"

LINUX_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
ICNS_SIZES = [16, 32, 64, 128, 256, 512, 1024]


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def square_crop(image: Image.Image, margin: float) -> Image.Image:
    """Crop to the opaque area and center it on a transparent square with a margin."""
    bbox = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox is None:
        raise SystemExit("image is fully transparent")
    cropped = image.crop(bbox)
    side = int(max(cropped.size) * (1 + 2 * margin))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2), cropped)
    return canvas


def resize(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.Resampling.LANCZOS)


def make_app_icons() -> None:
    # The source already has transparent padding around the rounded square;
    # recenter it on a square canvas so every size has the same breathing room.
    icon = square_crop(load(APP_ICON), margin=0.10)
    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / "icons").mkdir(exist_ok=True)

    resize(icon, 1024).save(BUILD / "icon.png")
    for size in LINUX_SIZES:
        resize(icon, size).save(BUILD / "icons" / f"{size}x{size}.png")

    resize(icon, 256).save(BUILD / "icon.ico", sizes=[(s, s) for s in ICO_SIZES])

    if shutil.which("iconutil") is None:
        print("iconutil not found: skipping icon.icns (run this script on macOS)", file=sys.stderr)
        return
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        for size in ICNS_SIZES:
            base = resize(icon, size)
            if size <= 512:
                base.save(iconset / f"icon_{size}x{size}.png")
            half = size // 2
            if half in (16, 32, 128, 256, 512):
                base.save(iconset / f"icon_{half}x{half}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(BUILD / "icon.icns")], check=True)


def make_logo_and_favicon() -> None:
    logo = square_crop(load(LOGO), margin=0.04)

    assets = RENDERER / "src" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    resize(logo, 256).save(assets / "logo.png", optimize=True)

    public = RENDERER / "public"
    public.mkdir(parents=True, exist_ok=True)
    resize(logo, 256).save(public / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    resize(logo, 64).save(public / "favicon.png", optimize=True)


if __name__ == "__main__":
    make_app_icons()
    make_logo_and_favicon()
    print("done")
