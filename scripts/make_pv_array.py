#!/usr/bin/env python3
"""Generate a realistic multi-panel PV array icon for the flow diagram.

Background matches the card/SVG area (#161b22 in k-flow-card.js).
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 2  # supersample for smoother edges, downscale on save
OUT = Path(__file__).resolve().parent.parent / "dist" / "pv-icon.png"
MAX_WIDTH = 860  # cap after trim; height follows aspect ratio
TRIM_PAD = 6
CANVAS_PAD = 28 * SCALE  # margin around panel cluster (scaled coords)

# Same as Energy Flow card shell background (SVG sits on this in k-flow-card.js)
SVG_BACKGROUND = (22, 27, 34, 255)  # #161b22


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1: tuple[int, ...], c2: tuple[int, ...], t: float) -> tuple[int, ...]:
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(len(c1)))


def trim_to_content(img: Image.Image, pad: int = TRIM_PAD, bg: tuple[int, ...] = SVG_BACKGROUND) -> Image.Image:
    """Crop to panel content; ignore flat background and faint ground shadow."""
    r, g, b, _ = bg
    px = img.load()
    w, h = img.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            if pa < 48:
                continue
            if max(abs(pr - r), abs(pg - g), abs(pb - b)) <= 8:
                continue
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if not found:
        return img
    x0 = max(0, min_x - pad)
    y0 = max(0, min_y - pad)
    x1 = min(w, max_x + 1 + pad)
    y1 = min(h, max_y + 1 + pad)
    return img.crop((x0, y0, x1, y1))


def panel_cluster_bbox(
    origin_x: int,
    origin_y: int,
    step_x: int,
    step_y: int,
    panel_w: int,
    panel_h: int,
    tilt: int,
    rows: int = 3,
    cols: int = 3,
) -> tuple[int, int, int, int]:
    """Axis-aligned bounds for the 3×3 panel array (scaled coordinates)."""
    skew = int(panel_h * 0.06)
    margin_x = panel_w // 2 + tilt + 12
    margin_y = panel_h // 2 + skew + 22  # feet + rail below front row
    min_x = min_y = 10**9
    max_x = max_y = 0
    for row in range(rows):
        for col in range(cols):
            cx = origin_x + col * step_x + row * 36
            cy = origin_y + row * step_y + col * 18
            min_x = min(min_x, cx - margin_x)
            min_y = min(min_y, cy - margin_y)
            max_x = max(max_x, cx + margin_x)
            max_y = max(max_y, cy + margin_y)
    return min_x, min_y, max_x, max_y


def draw_soft_shadow(
    base: Image.Image,
    cx: int,
    cy: int,
    rx: int,
    ry: int,
    alpha: int = 55,
) -> None:
    w, h = base.size
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(6, rx // 14)))
    base.alpha_composite(shadow)


def draw_panel(
    draw: ImageDraw.ImageDraw,
    glare: ImageDraw.ImageDraw,
    shadow: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    panel_w: int,
    panel_h: int,
    tilt: int,
    sun_angle: float = 0.35,
    cell_rows: int = 6,
    cell_cols: int = 10,
) -> list[tuple[int, int]]:
    """Draw one tilted panel; returns face quad for overlap shadows."""
    skew = int(panel_h * 0.06)
    tl = (cx - panel_w // 2 + tilt, cy - panel_h // 2)
    tr = (cx + panel_w // 2 + tilt, cy - panel_h // 2 - skew)
    br = (cx + panel_w // 2 - tilt, cy + panel_h // 2)
    bl = (cx - panel_w // 2 - tilt, cy + panel_h // 2 - skew)
    quad = [tl, tr, br, bl]
    center = (cx, cy)

    def inset_poly(points: list[tuple[int, int]], factor: float) -> list[tuple[int, int]]:
        return [
            (
                int(center[0] + (p[0] - center[0]) * (1 - factor)),
                int(center[1] + (p[1] - center[1]) * (1 - factor)),
            )
            for p in points
        ]

    # Frame depth: outer bezel → mid → inner lip
    draw.polygon(quad, fill=(198, 204, 212, 255))
    bezel = inset_poly(quad, 0.025)
    draw.polygon(bezel, fill=(168, 174, 184, 255))
    lip = inset_poly(quad, 0.055)
    draw.polygon(lip, fill=(138, 145, 156, 255))

    face = inset_poly(quad, 0.09)
    draw.polygon(face, fill=(12, 22, 38, 255))

    def face_pt(u: float, v: float) -> tuple[int, int]:
        top = (
            int(face[0][0] + (face[1][0] - face[0][0]) * u),
            int(face[0][1] + (face[1][1] - face[0][1]) * u),
        )
        bot = (
            int(face[3][0] + (face[2][0] - face[3][0]) * u),
            int(face[3][1] + (face[2][1] - face[3][1]) * u),
        )
        return (
            int(top[0] + (bot[0] - top[0]) * v),
            int(top[1] + (bot[1] - top[1]) * v),
        )

    # Photovoltaic cells — dark blue-black with subtle wafer variation
    for r in range(cell_rows):
        for c in range(cell_cols):
            t0, t1 = c / cell_cols, (c + 1) / cell_cols
            s0, s1 = r / cell_rows, (r + 1) / cell_rows
            p1, p2 = face_pt(t0, s0), face_pt(t1, s0)
            p3, p4 = face_pt(t1, s1), face_pt(t0, s1)
            u_mid = (t0 + t1) / 2
            v_mid = (s0 + s1) / 2
            # Brighter toward sun (upper-left), darker lower-right
            light = 1.0 - 0.22 * u_mid - 0.18 * v_mid + 0.08 * math.sin((r * 3 + c) * 1.7)
            base = lerp_color((8, 18, 32), (32, 58, 92), light)
            tint = ((r + c) % 5) * 2
            fill = (min(48, base[0] + tint), min(70, base[1] + tint), min(105, base[2] + tint * 2), 255)
            draw.polygon([p1, p2, p3, p4], fill=fill)

    lw = max(1, panel_w // 110)
    grid_color = (6, 14, 28, 235)
    for i in range(cell_rows + 1):
        t = i / cell_rows
        a = (
            int(face[0][0] + (face[3][0] - face[0][0]) * t),
            int(face[0][1] + (face[3][1] - face[0][1]) * t),
        )
        b = (
            int(face[1][0] + (face[2][0] - face[1][0]) * t),
            int(face[1][1] + (face[2][1] - face[1][1]) * t),
        )
        draw.line([a, b], fill=grid_color, width=lw)

    for i in range(cell_cols + 1):
        t = i / cell_cols
        a = (
            int(face[0][0] + (face[1][0] - face[0][0]) * t),
            int(face[0][1] + (face[1][1] - face[0][1]) * t),
        )
        b = (
            int(face[3][0] + (face[2][0] - face[3][0]) * t),
            int(face[3][1] + (face[2][1] - face[3][1]) * t),
        )
        draw.line([a, b], fill=grid_color, width=lw)

    # Silver busbars (5 per cell — typical mono panel)
    bus_w = max(1, panel_w // 130)
    for c in range(cell_cols):
        for b in range(5):
            u = (c + (b + 1) / 6) / cell_cols
            p_top = face_pt(u, 0.04)
            p_bot = face_pt(u, 0.96)
            draw.line([p_top, p_bot], fill=(200, 208, 220, 175), width=bus_w)

    # Half-cell finger lines (fine horizontal conductors)
    finger_w = max(1, panel_w // 200)
    fingers_per_cell = 8
    for r in range(cell_rows):
        for c in range(cell_cols):
            t0, t1 = c / cell_cols, (c + 1) / cell_cols
            s0, s1 = r / cell_rows, (r + 1) / cell_rows
            for f in range(1, fingers_per_cell):
                v = s0 + (s1 - s0) * f / fingers_per_cell
                p_l = face_pt(t0 + 0.02, v)
                p_r = face_pt(t1 - 0.02, v)
                draw.line([p_l, p_r], fill=(45, 72, 108, 90), width=finger_w)

    # Glass glare — soft sky reflection from upper-left
    gw = max(14, panel_w // 5)
    glare.polygon(
        [
            (face[0][0] + gw // 5, face[0][1] + gw // 6),
            (face[0][0] + gw * 2, face[0][1] + gw // 4),
            (face[0][0] + int(gw * 1.35), face[0][1] + int(gw * 1.6)),
            (face[0][0] + gw // 3, face[0][1] + int(gw * 2.1)),
            (face[0][0] + 6, face[0][1] + int(gw * 1.1)),
        ],
        fill=(120, 185, 235, 48),
    )
    glare.polygon(
        [
            (face[1][0] - gw, face[1][1] + gw // 3),
            (face[1][0] - gw // 3, face[1][1] + gw // 2),
            (face[1][0] - gw // 2, face[1][1] + gw),
            (face[1][0] - int(gw * 0.9), face[1][1] + gw // 3),
        ],
        fill=(90, 150, 210, 28),
    )

    # Frame highlights (anodized aluminum catch light)
    draw.line([tl, tr], fill=(235, 240, 248, 255), width=max(2, panel_w // 65))
    draw.line([tl, bl], fill=(210, 218, 228, 255), width=max(1, panel_w // 85))
    draw.line([br, tr], fill=(95, 102, 115, 200), width=max(1, panel_w // 95))

    # Ground-mount feet
    foot_w = max(14, panel_w // 7)
    foot_h = max(8, panel_h // 14)
    for dx in (panel_w // 6, panel_w - panel_w // 6 - foot_w):
        fx = bl[0] + dx
        fy = bl[1] + 3
        draw.polygon(
            [
                (fx, fy),
                (fx + foot_w, fy),
                (fx + foot_w - 5, fy + foot_h),
                (fx - 4, fy + foot_h),
            ],
            fill=(120, 128, 140, 230),
        )
        shadow.polygon(
            [
                (fx + 3, fy + foot_h),
                (fx + foot_w, fy + foot_h),
                (fx + foot_w + 8, fy + foot_h + 6),
                (fx - 2, fy + foot_h + 6),
            ],
            fill=(0, 0, 0, 35),
        )

    # Rail along bottom edge of frame
    rail = [
        (bl[0] + panel_w // 12, bl[1] + 2),
        (br[0] - panel_w // 12, br[1] + 2),
        (br[0] - panel_w // 12, br[1] + 8),
        (bl[0] + panel_w // 12, bl[1] + 8),
    ]
    draw.polygon(rail, fill=(150, 158, 170, 220))

    return face


def draw_overlap_shadow(shadow_draw: ImageDraw.ImageDraw, front_face: list[tuple[int, int]]) -> None:
    """Darken area under a front panel where it covers rear panels."""
    cx = sum(p[0] for p in front_face) / 4
    cy = sum(p[1] for p in front_face) / 4
    inset = [
        (int(cx + (p[0] - cx) * 0.97), int(cy + (p[1] - cy) * 0.97))
        for p in front_face
    ]
    shadow_draw.polygon(inset, fill=(0, 0, 0, 42))


def main() -> None:
    panel_w, panel_h = 200 * SCALE, 118 * SCALE
    tilt = 14 * SCALE
    step_x, step_y = 168 * SCALE, 72 * SCALE
    origin_x, origin_y = 118 * SCALE, 108 * SCALE

    bx0, by0, bx1, by1 = panel_cluster_bbox(
        origin_x, origin_y, step_x, step_y, panel_w, panel_h, tilt
    )
    w = bx1 - bx0 + CANVAS_PAD * 2
    h = by1 - by0 + CANVAS_PAD * 2
    offset_x = CANVAS_PAD - bx0
    offset_y = CANVAS_PAD - by0

    img = Image.new("RGBA", (w, h), SVG_BACKGROUND)

    # Tight ground shadow under the array (not full canvas width)
    shadow_cx = (bx0 + bx1) // 2 + offset_x
    shadow_cy = by1 + offset_y + int(8 * SCALE)
    draw_soft_shadow(
        img,
        shadow_cx,
        shadow_cy,
        int((bx1 - bx0) * 0.42),
        int(14 * SCALE),
        alpha=42,
    )

    panels: list[tuple[float, int, int, int]] = []
    for row in range(3):
        for col in range(3):
            cx = origin_x + col * step_x + row * 36 + offset_x
            cy = origin_y + row * step_y + col * 18 + offset_y
            depth = row + col + (col * 0.1)
            panels.append((depth, cx, cy, row))

    panels.sort(key=lambda p: p[0])

    draw = ImageDraw.Draw(img)
    glare = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glare_draw = ImageDraw.Draw(glare)
    overlap_shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    overlap_draw = ImageDraw.Draw(overlap_shadow)

    faces: list[list[tuple[int, int]]] = []
    for _, cx, cy, row in panels:
        sun = 0.28 + row * 0.04
        face = draw_panel(
            draw, glare_draw, overlap_draw, cx, cy, panel_w, panel_h, tilt, sun_angle=sun
        )
        faces.append(face)

    # Overlap shadows for front panels (painted after all panels, before glare)
    for face in faces[3:]:
        draw_overlap_shadow(overlap_draw, face)

    img = Image.alpha_composite(img, overlap_shadow)
    img = Image.alpha_composite(img, glare)

    # Downscale from supersampled render, then trim empty transparent margins
    img = img.resize((img.width // SCALE, img.height // SCALE), Image.Resampling.LANCZOS)
    img = trim_to_content(img)

    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        img = img.resize(
            (MAX_WIDTH, max(1, int(img.height * ratio))),
            Image.Resampling.LANCZOS,
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({img.width}x{img.height}, background #161b22)")


if __name__ == "__main__":
    main()
