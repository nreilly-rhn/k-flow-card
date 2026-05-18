#!/usr/bin/env python3
"""Generate a multi-panel PV array icon with transparent background."""
from PIL import Image, ImageDraw

W, H = 860, 637
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))


def draw_panel(draw, glare_draw, cx, cy, panel_w, panel_h, tilt, cell_rows=4, cell_cols=6, glare_strength=70):
    tl = (cx - panel_w // 2 + tilt, cy - panel_h // 2)
    tr = (cx + panel_w // 2 + tilt, cy - panel_h // 2 - int(panel_h * 0.05))
    br = (cx + panel_w // 2 - tilt, cy + panel_h // 2)
    bl = (cx - panel_w // 2 - tilt, cy + panel_h // 2 - int(panel_h * 0.05))
    quad = [tl, tr, br, bl]
    center = (cx, cy)

    def inset_poly(points, factor):
        return [
            (
                int(center[0] + (p[0] - center[0]) * (1 - factor)),
                int(center[1] + (p[1] - center[1]) * (1 - factor)),
            )
            for p in points
        ]

    draw.polygon(quad, fill=(175, 182, 194, 255))
    face = inset_poly(quad, 0.07)
    draw.polygon(face, fill=(22, 62, 112, 255))

    def face_pt(u, v):
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

    for r in range(cell_rows):
        for c in range(cell_cols):
            t0, t1 = c / cell_cols, (c + 1) / cell_cols
            s0, s1 = r / cell_rows, (r + 1) / cell_rows
            p1, p2 = face_pt(t0, s0), face_pt(t1, s0)
            p3, p4 = face_pt(t1, s1), face_pt(t0, s1)
            shade = 24 + int(38 * ((r + c) % 3))
            blue = 88 + int(22 * (r / max(cell_rows - 1, 1)))
            draw.polygon([p1, p2, p3, p4], fill=(shade, blue, 148, 255))

    lw = max(1, panel_w // 90)
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
        draw.line([a, b], fill=(10, 28, 55, 220), width=lw)

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
        draw.line([a, b], fill=(10, 28, 55, 220), width=lw)

    gw = max(8, panel_w // 8)
    glare_draw.polygon(
        [
            (face[0][0] + gw // 3, face[0][1] + gw // 4),
            (face[0][0] + gw * 2, face[0][1] + gw // 3),
            (face[0][0] + int(gw * 1.5), face[0][1] + gw * 2),
            (face[0][0] + 4, face[0][1] + int(gw * 1.2)),
        ],
        fill=(90, 165, 235, glare_strength),
    )

    draw.line([tl, tr], fill=(230, 236, 244, 255), width=max(2, panel_w // 70))
    draw.line([tl, bl], fill=(200, 208, 218, 255), width=max(1, panel_w // 90))

    foot_w = max(12, panel_w // 8)
    for dx in (panel_w // 5, panel_w - panel_w // 5 - foot_w):
        fx = bl[0] + dx
        draw.polygon(
            [
                (fx, bl[1] + 4),
                (fx + foot_w, bl[1] + 4),
                (fx + foot_w - 4, bl[1] + foot_w // 2),
                (fx - 3, bl[1] + foot_w // 2),
            ],
            fill=(150, 158, 170, 220),
        )

    return quad


# 3x3 staggered array (back → front for paint order)
panel_w, panel_h = 200, 118
tilt = 14
step_x, step_y = 168, 72
origin_x, origin_y = 118, 108

panels = []
for row in range(3):
    for col in range(3):
        cx = origin_x + col * step_x + row * 36
        cy = origin_y + row * step_y + col * 18
        panels.append((row + col, cx, cy))  # sort key: back first

panels.sort(key=lambda p: p[0])

draw = ImageDraw.Draw(img)
glare = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glare_draw = ImageDraw.Draw(glare)

for _, cx, cy in panels:
    draw_panel(draw, glare_draw, cx, cy, panel_w, panel_h, tilt)

img = Image.alpha_composite(img, glare)

out = "/home/nreilly/git/github.com/nreilly-rhn/k-flow-card/dist/pv-array.png"
img.save(out, "PNG", optimize=True)
print(f"Wrote {out} ({W}x{H})")
