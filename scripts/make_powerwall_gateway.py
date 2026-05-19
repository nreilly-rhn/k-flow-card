#!/usr/bin/env python3
"""Generate a 3D wall-mounted backup gateway icon (Powerwall-style) for k-flow-card."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SIZE = 320 * SCALE
OUT = Path(__file__).resolve().parent.parent / "dist" / "powerwall-gateway-icon.png"
FINAL_SIZE = (250, 250)


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
    """Vertical gradient on a quad (TL, TR, BR, BL) by slicing top to bottom."""
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
) -> tuple[list[tuple[float, float]], list[tuple[float, float]], list[tuple[float, float]]]:
    """Draw isometric-ish enclosure; return front/top/right quads for detailing."""
    ox, oy = origin
    d = depth
    skew = int(depth * 0.42)

    # Front face corners (clockwise from top-left)
    f_tl = (ox, oy)
    f_tr = (ox + width, oy)
    f_br = (ox + width, oy + height)
    f_bl = (ox, oy + height)

    # Extrude toward upper-right (depth + lift)
    r_tr = (f_tr[0] + d, f_tr[1] - skew)
    r_br = (f_br[0] + d, f_br[1] - skew)
    t_tl = (f_tl[0] + d, f_tl[1] - skew)
    t_tr = (f_tr[0] + d, f_tr[1] - skew)

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    # Paint back-to-front: right, top, front
    right = [f_tr, r_tr, r_br, f_br]
    draw_quad_gradient_v(ld, right, (118, 124, 132), (88, 94, 102), 28)

    top = [f_tl, f_tr, t_tr, t_tl]
    draw_quad_gradient_h(ld, top, (238, 241, 246), (210, 216, 224), 22)

    front = [f_tl, f_tr, f_br, f_bl]
    draw_quad_gradient_v(ld, front, (248, 250, 253), (218, 224, 232), 32)

    # Edge highlights
    ed = ImageDraw.Draw(layer)
    ed.line([f_tl, f_tr], fill=(255, 255, 255, 120), width=max(2, SCALE))
    ed.line([f_tl, f_bl], fill=(255, 255, 255, 90), width=max(2, SCALE))
    ed.line([f_tr, r_tr], fill=(255, 255, 255, 70), width=max(1, SCALE // 2))
    ed.line([f_tl, t_tl], fill=(255, 255, 255, 70), width=max(1, SCALE // 2))
    ed.line([f_br, r_br], fill=(40, 45, 52, 140), width=max(2, SCALE))
    ed.line([f_bl, f_br], fill=(60, 65, 72, 120), width=max(2, SCALE))

    composite = Image.alpha_composite(base, layer)
    return composite, front, top, right


def draw_recessed_panel(
    base: Image.Image,
    front: list[tuple[float, float]],
    rel_x: float,
    rel_y: float,
    rel_w: float,
    rel_h: float,
) -> Image.Image:
    (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front

    def interp(tu: float, tv: float) -> tuple[float, float]:
        top = (lerp(fx0, fx1, tu), lerp(fy0, fy1, tu))
        bot = (lerp(fx3, fx2, tu), lerp(fy3, fy2, tu))
        return lerp(top[0], bot[0], tv), lerp(top[1], bot[1], tv)

    p_tl = interp(rel_x, rel_y)
    p_tr = interp(rel_x + rel_w, rel_y)
    p_br = interp(rel_x + rel_w, rel_y + rel_h)
    p_bl = interp(rel_x, rel_y + rel_h)

    inset = 0.04
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Recess shadow (outer bezel)
    draw_quad(d, [p_tl, p_tr, p_br, p_bl], (48, 52, 58, 255))
    i_tl = interp(rel_x + inset, rel_y + inset * 0.8)
    i_tr = interp(rel_x + rel_w - inset, rel_y + inset * 0.8)
    i_br = interp(rel_x + rel_w - inset, rel_y + rel_h - inset * 0.6)
    i_bl = interp(rel_x + inset, rel_y + rel_h - inset * 0.6)
    draw_quad_gradient_v(d, [i_tl, i_tr, i_br, i_bl], (32, 36, 42), (12, 14, 18), 18)

    # Glass sheen
    gloss = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    g_tl = interp(rel_x + inset * 1.5, rel_y + inset)
    g_tr = interp(rel_x + rel_w * 0.55, rel_y + inset)
    g_br = interp(rel_x + rel_w * 0.45, rel_y + rel_h * 0.4)
    g_bl = interp(rel_x + inset * 2, rel_y + rel_h * 0.45)
    draw_quad(gd, [g_tl, g_tr, g_br, g_bl], (120, 140, 165, 45))
    layer = Image.alpha_composite(layer, gloss)
    return Image.alpha_composite(base, layer)


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # Ground shadow
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    cx = SIZE // 2
    sd.ellipse(
        (cx - int(SIZE * 0.28), SIZE - int(SIZE * 0.14), cx + int(SIZE * 0.32), SIZE - int(SIZE * 0.04)),
        fill=(0, 0, 0, 65),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=SIZE // 28))
    img = Image.alpha_composite(img, shadow)

    bw, bh = int(SIZE * 0.42), int(SIZE * 0.50)
    depth = int(SIZE * 0.11)
    ox = cx - bw // 2 - depth // 3
    oy = int(SIZE * 0.14)

    img, front, _top, _right = draw_box_3d(img, (ox, oy), bw, bh, depth)
    img = draw_recessed_panel(img, front, 0.11, 0.12, 0.78, 0.36)

    draw = ImageDraw.Draw(img)

    # Map point on front face for details
    def fp(rx: float, ry: float) -> tuple[int, int]:
        (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
        top = (lerp(fx0, fx1, rx), lerp(fy0, fy1, rx))
        bot = (lerp(fx3, fx2, rx), lerp(fy3, fy2, rx))
        return int(lerp(top[0], bot[0], ry)), int(lerp(top[1], bot[1], ry))

    # Status LED with 3D bump
    lx, ly = fp(0.82, 0.54)
    r = max(5, SIZE // 52)
    draw.ellipse((lx - r - 1, ly - r - 1, lx + r + 2, ly + r + 2), fill=(20, 80, 45, 255))
    draw.ellipse((lx - r, ly - r, lx + r, ly + r), fill=(50, 210, 100, 255))
    draw.ellipse((lx - r + 2, ly - r + 1, lx + r - 3, ly + r - 4), fill=(140, 255, 180, 90))

    # Vent slots (recessed)
    vent_y = fp(0.5, 0.66)[1]
    slot_w = max(3, SIZE // 85)
    gap = max(6, SIZE // 42)
    n = 5
    span = n * slot_w + (n - 1) * gap
    sx = fp(0.5, 0.66)[0] - span // 2
    for i in range(n):
        x = sx + i * (slot_w + gap)
        draw.rounded_rectangle(
            (x, vent_y, x + slot_w, vent_y + max(4, SIZE // 75)),
            radius=1,
            fill=(100, 108, 118, 255),
        )
        draw.line([(x + 1, vent_y + 1), (x + slot_w - 1, vent_y + 1)], fill=(170, 176, 184, 120), width=1)

    # Bottom conduit (3D port)
    px, py = fp(0.5, 0.92)
    pw, ph = int(bw * 0.14), int(bh * 0.05)
    draw.rounded_rectangle((px - pw, py, px + pw, py + ph), radius=3, fill=(130, 136, 146, 255))
    draw.rectangle((px - 2, py + ph, px + 2, py + ph + int(bh * 0.06)), fill=(70, 76, 86, 255))

    # Mount feet (3D)
    for rx in (0.28, 0.72):
        fx, fy = fp(rx, 1.02)
        draw.polygon(
            [(fx - 12, fy), (fx + 12, fy), (fx + 8, fy + 10), (fx - 8, fy + 10)],
            fill=(120, 128, 138, 240),
        )
        draw.polygon(
            [(fx - 8, fy), (fx + 8, fy), (fx + 5, fy + 5), (fx - 5, fy + 5)],
            fill=(170, 178, 188, 200),
        )

    img = img.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({FINAL_SIZE[0]}x{FINAL_SIZE[1]}, 3D, transparent background)")


if __name__ == "__main__":
    main()
