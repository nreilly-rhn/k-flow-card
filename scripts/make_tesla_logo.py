#!/usr/bin/env python3
"""Generate a Tesla-style T logo PNG (transparent) for the gateway hub icon."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SIZE = 280 * SCALE
OUT = Path(__file__).resolve().parent.parent / "dist" / "tesla-logo-icon.png"
FINAL = (250, 250)

# Tesla brand red
RED = (232, 33, 39)
RED_DARK = (180, 24, 28)
SILVER = (220, 224, 230)


def draw_tesla_t(draw: ImageDraw.ImageDraw, cx: float, cy: float, h: float, color: tuple[int, int, int, int]) -> None:
    """Stylized Tesla T (curved cap + stem), centered at (cx, cy)."""
    w = h * 1.05
    top_y = cy - h * 0.42
    cap_h = h * 0.22
    stem_w = h * 0.14
    cap_outer = [
        (cx - w * 0.52, top_y + cap_h * 0.35),
        (cx - w * 0.48, top_y),
        (cx + w * 0.48, top_y),
        (cx + w * 0.52, top_y + cap_h * 0.35),
        (cx + w * 0.38, top_y + cap_h),
        (cx - w * 0.38, top_y + cap_h),
    ]
    draw.polygon(cap_outer, fill=color)
    stem = [
        (cx - stem_w, top_y + cap_h * 0.85),
        (cx + stem_w, top_y + cap_h * 0.85),
        (cx + stem_w * 0.85, cy + h * 0.42),
        (cx - stem_w * 0.85, cy + h * 0.42),
    ]
    draw.polygon(stem, fill=color)


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cx, cy = SIZE / 2, SIZE / 2 - SIZE * 0.02
    logo_h = SIZE * 0.52

    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    draw_tesla_t(gd, cx, cy, logo_h * 1.08, RED + (90,))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=SIZE // 18))
    img = Image.alpha_composite(img, glow)

    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    draw_tesla_t(ld, cx, cy + 2, logo_h, RED_DARK + (200,))
    draw_tesla_t(ld, cx, cy, logo_h, RED + (255,))
    # Highlight on cap
    cap_hi = [
        (cx - logo_h * 0.2, cy - logo_h * 0.28),
        (cx + logo_h * 0.2, cy - logo_h * 0.28),
        (cx + logo_h * 0.12, cy - logo_h * 0.18),
        (cx - logo_h * 0.12, cy - logo_h * 0.18),
    ]
    ld.polygon(cap_hi, fill=(255, 120, 120, 80))

    img = Image.alpha_composite(img, layer)
    img = img.resize(FINAL, Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({FINAL[0]}x{FINAL[1]})")


if __name__ == "__main__":
    main()
