#!/usr/bin/env python3
"""Generate a wall-mounted backup gateway icon (Powerwall-style) for k-flow-card."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SIZE = 280 * SCALE
OUT = Path(__file__).resolve().parent.parent / "dist" / "powerwall-gateway-icon.png"
FINAL_SIZE = (250, 250)


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill,
    outline=None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2 + int(SIZE * 0.02)

    # Soft drop shadow
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sw, sh = int(SIZE * 0.42), int(SIZE * 0.52)
    sd.rounded_rectangle(
        (cx - sw // 2 + 8, cy - sh // 2 + 14, cx + sw // 2 + 12, cy + sh // 2 + 16),
        radius=int(SIZE * 0.04),
        fill=(0, 0, 0, 70),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=SIZE // 35))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    # Wall-mount back plate (subtle)
    plate_w, plate_h = int(SIZE * 0.44), int(SIZE * 0.54)
    px0, py0 = cx - plate_w // 2, cy - plate_h // 2
    rounded_rect(
        draw,
        (px0 - 4, py0 - 4, px0 + plate_w + 4, py0 + plate_h + 4),
        int(SIZE * 0.035),
        fill=(120, 128, 138, 90),
    )

    # Main enclosure — off-white housing
    body = (px0, py0, px0 + plate_w, py0 + plate_h)
    rounded_rect(draw, body, int(SIZE * 0.038), fill=(232, 235, 240, 255))
    rounded_rect(
        draw,
        (px0 + 3, py0 + 3, px0 + plate_w - 3, py0 + plate_h - 3),
        int(SIZE * 0.032),
        fill=(245, 247, 250, 255),
        outline=(210, 216, 224, 255),
        width=max(2, SIZE // 140),
    )

    # Left edge highlight / right edge shade (3D)
    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.polygon(
        [
            (px0 + 8, py0 + 12),
            (px0 + 18, py0 + 12),
            (px0 + 14, py0 + plate_h - 12),
            (px0 + 6, py0 + plate_h - 12),
        ],
        fill=(255, 255, 255, 45),
    )
    hd.polygon(
        [
            (px0 + plate_w - 8, py0 + 14),
            (px0 + plate_w - 2, py0 + 18),
            (px0 + plate_w - 2, py0 + plate_h - 14),
            (px0 + plate_w - 10, py0 + plate_h - 10),
        ],
        fill=(0, 0, 0, 35),
    )
    img = Image.alpha_composite(img, highlight)
    draw = ImageDraw.Draw(img)

    # Dark glass display panel (signature gateway look)
    gw = int(plate_w * 0.78)
    gh = int(plate_h * 0.38)
    gx0 = cx - gw // 2
    gy0 = py0 + int(plate_h * 0.14)
    rounded_rect(draw, (gx0, gy0, gx0 + gw, gy0 + gh), int(SIZE * 0.028), fill=(28, 32, 38, 255))
    rounded_rect(
        draw,
        (gx0 + 4, gy0 + 4, gx0 + gw - 4, gy0 + gh - 4),
        int(SIZE * 0.024),
        fill=(18, 22, 28, 255),
    )
    # Glass reflection
    rounded_rect(
        draw,
        (gx0 + 8, gy0 + 8, gx0 + int(gw * 0.55), gy0 + int(gh * 0.35)),
        int(SIZE * 0.018),
        fill=(80, 95, 115, 55),
    )

    # Status LED (green, typical gateway)
    led_r = max(4, SIZE // 55)
    led_x = gx0 + gw - int(gw * 0.18)
    led_y = gy0 + gh + int(plate_h * 0.06)
    draw.ellipse(
        (led_x - led_r, led_y - led_r, led_x + led_r, led_y + led_r),
        fill=(40, 200, 90, 255),
    )
    draw.ellipse(
        (led_x - led_r - 2, led_y - led_r - 2, led_x + led_r + 1, led_y + led_r + 1),
        fill=(120, 255, 160, 80),
    )

    # Vent slots below display
    vent_y = gy0 + gh + int(plate_h * 0.12)
    slot_w = max(2, SIZE // 90)
    gap = max(5, SIZE // 45)
    total_slots = 5
    span = total_slots * slot_w + (total_slots - 1) * gap
    sx = cx - span // 2
    for i in range(total_slots):
        x = sx + i * (slot_w + gap)
        draw.rounded_rectangle(
            (x, vent_y, x + slot_w, vent_y + max(3, SIZE // 70)),
            radius=1,
            fill=(180, 186, 194, 220),
        )

    # Bottom conduit / cable gland hint
    cable_y = py0 + plate_h - int(plate_h * 0.08)
    draw.rounded_rectangle(
        (cx - int(plate_w * 0.08), cable_y, cx + int(plate_w * 0.08), cable_y + int(plate_h * 0.05)),
        radius=3,
        fill=(160, 168, 178, 255),
    )
    draw.rectangle(
        (cx - 2, cable_y + int(plate_h * 0.05), cx + 2, cable_y + int(plate_h * 0.11)),
        fill=(90, 98, 108, 255),
    )

    # Wall bracket feet
    foot_y = py0 + plate_h + 2
    for dx in (-int(plate_w * 0.28), int(plate_w * 0.28)):
        fx = cx + dx
        draw.polygon(
            [
                (fx - 10, foot_y),
                (fx + 10, foot_y),
                (fx + 7, foot_y + 8),
                (fx - 7, foot_y + 8),
            ],
            fill=(150, 158, 168, 230),
        )

    img = img.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({FINAL_SIZE[0]}x{FINAL_SIZE[1]}, transparent background)")


if __name__ == "__main__":
    main()
