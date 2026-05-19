#!/usr/bin/env python3
"""Generate a 3D Fronius-style string inverter icon for k-flow-card."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SIZE = 360 * SCALE
OUT = Path(__file__).resolve().parent.parent / "dist" / "fronius-inverter-icon.png"
FINAL_SIZE = (280, 220)

# Fronius brand red (stylized accent, not a logo)
FRONIUS_RED = (227, 6, 19)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def draw_quad(
    draw: ImageDraw.ImageDraw,
    pts: list[tuple[float, float]],
    fill: tuple[int, int, int, int],
) -> None:
    draw.polygon([(int(x), int(y)) for x, y in pts], fill=fill)


def draw_quad_gradient_v(
    draw: ImageDraw.ImageDraw,
    pts: list[tuple[float, float]],
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
    steps: int = 24,
) -> None:
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = pts
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        xt0l, yt0l = lerp(x0, x3, t0), lerp(y0, y3, t0)
        xt0r, yt0r = lerp(x1, x2, t0), lerp(y1, y2, t0)
        xt1l, yt1l = lerp(x0, x3, t1), lerp(y0, y3, t1)
        xt1r, yt1r = lerp(x1, x2, t1), lerp(y1, y2, t1)
        col = lerp_rgb(top, bottom, (t0 + t1) * 0.5) + (255,)
        draw_quad(draw, [(xt0l, yt0l), (xt0r, yt0r), (xt1r, yt1r), (xt1l, yt1l)], col)


def draw_quad_gradient_h(
    draw: ImageDraw.ImageDraw,
    pts: list[tuple[float, float]],
    left: tuple[int, int, int],
    right: tuple[int, int, int],
    steps: int = 20,
) -> None:
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = pts
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        xl0, xl1 = lerp(x0, x3, t0), lerp(x0, x3, t1)
        xr0, xr1 = lerp(x1, x2, t0), lerp(x1, x2, t1)
        yl0, yl1 = lerp(y0, y3, t0), lerp(y0, y3, t1)
        yr0, yr1 = lerp(y1, y2, t0), lerp(y1, y2, t1)
        col = lerp_rgb(left, right, (t0 + t1) * 0.5) + (255,)
        draw_quad(draw, [(xl0, yl0), (xr0, yr0), (xr1, yr1), (xl1, yl1)], col)


def draw_box_3d(
    base: Image.Image,
    origin: tuple[int, int],
    width: int,
    height: int,
    depth: int,
) -> tuple[Image.Image, list[tuple[float, float]]]:
    ox, oy = origin
    d, skew = depth, int(depth * 0.42)
    f_tl, f_tr = (ox, oy), (ox + width, oy)
    f_br, f_bl = (ox + width, oy + height), (ox, oy + height)
    r_tr, r_br = (f_tr[0] + d, f_tr[1] - skew), (f_br[0] + d, f_br[1] - skew)
    t_tl, t_tr = (f_tl[0] + d, f_tl[1] - skew), (f_tr[0] + d, f_tr[1] - skew)

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    right = [f_tr, r_tr, r_br, f_br]
    top = [f_tl, f_tr, t_tr, t_tl]
    front = [f_tl, f_tr, f_br, f_bl]
    draw_quad_gradient_v(ld, right, (105, 110, 118), (78, 84, 92), 28)
    draw_quad_gradient_h(ld, top, (242, 244, 248), (212, 218, 226), 22)
    draw_quad_gradient_v(ld, front, (252, 253, 255), (225, 230, 238), 32)

    ed = ImageDraw.Draw(layer)
    ed.line([f_tl, f_tr], fill=(255, 255, 255, 130), width=max(2, SCALE))
    ed.line([f_tl, f_bl], fill=(255, 255, 255, 95), width=max(2, SCALE))
    ed.line([f_br, r_br], fill=(35, 40, 48, 150), width=max(2, SCALE))

    return Image.alpha_composite(base, layer), front


def fp(
    front: list[tuple[float, float]],
    rx: float,
    ry: float,
) -> tuple[int, int]:
    (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
    top = (lerp(fx0, fx1, rx), lerp(fy0, fy1, rx))
    bot = (lerp(fx3, fx2, rx), lerp(fy3, fy2, rx))
    return int(lerp(top[0], bot[0], ry)), int(lerp(top[1], bot[1], ry))


def quad_on_front(
    front: list[tuple[float, float]],
    rx: float,
    ry: float,
    rw: float,
    rh: float,
) -> list[tuple[float, float]]:
    def p(tu: float, tv: float) -> tuple[float, float]:
        (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
        top = (lerp(fx0, fx1, tu), lerp(fy0, fy1, tu))
        bot = (lerp(fx3, fx2, tu), lerp(fy3, fy2, tu))
        return lerp(top[0], bot[0], tv), lerp(top[1], bot[1], tv)

    return [
        p(rx, ry),
        p(rx + rw, ry),
        p(rx + rw, ry + rh),
        p(rx, ry + rh),
    ]


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    cx = SIZE // 2
    sd.ellipse(
        (cx - int(SIZE * 0.32), SIZE - int(SIZE * 0.12), cx + int(SIZE * 0.34), SIZE - int(SIZE * 0.03)),
        fill=(0, 0, 0, 60),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=SIZE // 30))
    img = Image.alpha_composite(img, shadow)

    # Wide wall-mount enclosure (Fronius Symo / Primo proportions)
    bw, bh = int(SIZE * 0.58), int(SIZE * 0.38)
    depth = int(SIZE * 0.09)
    ox = cx - bw // 2 - depth // 3
    oy = int(SIZE * 0.22)

    img, front = draw_box_3d(img, (ox, oy), bw, bh, depth)
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Signature red accent bar (left edge of face)
    red_pts = quad_on_front(front, 0.04, 0.08, 0.07, 0.84)
    draw_quad_gradient_v(d, red_pts, (250, 40, 50), (170, 8, 18), 16)

    # Stylized angular "F" cutout in accent (negative space)
    f_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    fd = ImageDraw.Draw(f_layer)
    fx0, fy0 = fp(front, 0.055, 0.14)
    fx1, fy1 = fp(front, 0.095, 0.14)
    fx2, fy2 = fp(front, 0.095, 0.38)
    fx3, fy3 = fp(front, 0.075, 0.38)
    fx4, fy4 = fp(front, 0.075, 0.22)
    fx5, fy5 = fp(front, 0.055, 0.22)
    fd.polygon([(fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3), (fx4, fy4), (fx5, fy5)], fill=(252, 253, 255, 200))
    fx6, fy6 = fp(front, 0.055, 0.48)
    fx7, fy7 = fp(front, 0.095, 0.48)
    fx8, fy8 = fp(front, 0.095, 0.58)
    fx9, fy9 = fp(front, 0.055, 0.58)
    fd.polygon([(fx6, fy6), (fx7, fy7), (fx8, fy8), (fx9, fy9)], fill=(252, 253, 255, 200))
    layer = Image.alpha_composite(layer, f_layer)

    # Dark LCD / status panel
    lcd = quad_on_front(front, 0.16, 0.14, 0.72, 0.42)
    draw_quad(d, lcd, (42, 46, 52, 255))
    inner = quad_on_front(front, 0.18, 0.17, 0.68, 0.36)
    draw_quad_gradient_v(d, inner, (28, 32, 38), (12, 14, 18), 14)

    # Glass reflection on display
    gloss_pts = quad_on_front(front, 0.20, 0.19, 0.42, 0.18)
    draw_quad(d, gloss_pts, (90, 110, 135, 50))

    # Green operating LED (right of display)
    lx, ly = fp(front, 0.86, 0.34)
    r = max(4, SIZE // 60)
    d.ellipse((lx - r - 1, ly - r - 1, lx + r + 2, ly + r + 2), fill=(18, 70, 38, 255))
    d.ellipse((lx - r, ly - r, lx + r, ly + r), fill=(48, 200, 95, 255))

    # Bottom ventilation grille (horizontal fins)
    vent_top = fp(front, 0.5, 0.62)[1]
    fin_h = max(2, SIZE // 120)
    gap = max(4, SIZE // 55)
    n_fins = 6
    x0, _ = fp(front, 0.18, 0.62)
    x1, _ = fp(front, 0.82, 0.62)
    span = x1 - x0
    total_h = n_fins * fin_h + (n_fins - 1) * gap
    y0 = vent_top
    for i in range(n_fins):
        y = y0 + i * (fin_h + gap)
        d.rounded_rectangle((x0, y, x1, y + fin_h), radius=1, fill=(145, 152, 162, 240))
        d.line([(x0 + 2, y + 1), (x1 - 2, y + 1)], fill=(200, 206, 214, 100), width=1)

    # DC / AC cable glands (bottom corners)
    for rx in (0.22, 0.78):
        px, py = fp(front, rx, 0.88)
        pw = max(6, SIZE // 55)
        d.rounded_rectangle((px - pw, py, px + pw, py + int(bh * 0.06)), radius=2, fill=(118, 124, 132, 255))
        d.rectangle((px - 2, py + int(bh * 0.06), px + 2, py + int(bh * 0.10)), fill=(72, 78, 88, 255))

    # Wall bracket lip
    bx0, by0 = fp(front, 0.12, 1.0)
    bx1, _ = fp(front, 0.88, 1.0)
    d.rectangle((bx0, by0, bx1, by0 + max(4, SIZE // 70)), fill=(130, 136, 146, 230))

    img = Image.alpha_composite(img, layer)

    img = img.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({FINAL_SIZE[0]}x{FINAL_SIZE[1]}, 3D Fronius-style, transparent)")


if __name__ == "__main__":
    main()
