#!/usr/bin/env python3
"""Generate a Fronius GEN24 / Primo-style wall inverter icon for k-flow-card."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SIZE = 320 * SCALE
OUT = Path(__file__).resolve().parent.parent / "dist" / "fronius-inverter-icon.png"
OUT_LEGACY = Path(__file__).resolve().parent.parent / "dist" / "powerwall-gateway-icon.png"
FINAL_SIZE = (250, 250)

# Fronius brand red (accent only — stylized, not the logo)
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
    d = depth
    skew = int(depth * 0.38)

    f_tl = (ox, oy)
    f_tr = (ox + width, oy)
    f_br = (ox + width, oy + height)
    f_bl = (ox, oy + height)

    r_tr = (f_tr[0] + d, f_tr[1] - skew)
    r_br = (f_br[0] + d, f_br[1] - skew)
    t_tl = (f_tl[0] + d, f_tl[1] - skew)
    t_tr = (f_tr[0] + d, f_tr[1] - skew)

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    right = [f_tr, r_tr, r_br, f_br]
    draw_quad_gradient_v(ld, right, (195, 200, 208), (165, 172, 182), 28)

    top = [f_tl, f_tr, t_tr, t_tl]
    draw_quad_gradient_h(ld, top, (252, 253, 255), (235, 238, 244), 22)

    front = [f_tl, f_tr, f_br, f_bl]
    draw_quad_gradient_v(ld, front, (255, 255, 255), (236, 239, 244), 32)

    ed = ImageDraw.Draw(layer)
    ed.line([f_tl, f_tr], fill=(255, 255, 255, 150), width=max(2, SCALE))
    ed.line([f_tl, f_bl], fill=(255, 255, 255, 110), width=max(2, SCALE))
    ed.line([f_br, r_br], fill=(120, 128, 138, 120), width=max(2, SCALE))

    composite = Image.alpha_composite(base, layer)
    return composite, front


def fp_on_front(
    front: list[tuple[float, float]], rx: float, ry: float
) -> tuple[int, int]:
    (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
    top = (lerp(fx0, fx1, rx), lerp(fy0, fy1, rx))
    bot = (lerp(fx3, fx2, rx), lerp(fy3, fy2, rx))
    return int(lerp(top[0], bot[0], ry)), int(lerp(top[1], bot[1], ry))


def draw_display_panel(base: Image.Image, front: list[tuple[float, float]]) -> Image.Image:
    """Large dark display band — signature GEN24 front."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def interp(tu: float, tv: float) -> tuple[float, float]:
        (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
        top = (lerp(fx0, fx1, tu), lerp(fy0, fy1, tu))
        bot = (lerp(fx3, fx2, tu), lerp(fy3, fy2, tu))
        return lerp(top[0], bot[0], tv), lerp(top[1], bot[1], tv)

    margin_x, margin_y = 0.08, 0.10
    panel_w, panel_h = 0.84, 0.38
    p_tl = interp(margin_x, margin_y)
    p_tr = interp(margin_x + panel_w, margin_y)
    p_br = interp(margin_x + panel_w, margin_y + panel_h)
    p_bl = interp(margin_x, margin_y + panel_h)

    draw_quad(d, [p_tl, p_tr, p_br, p_bl], (18, 20, 24, 255))
    inset = 0.012
    i_tl = interp(margin_x + inset, margin_y + inset)
    i_tr = interp(margin_x + panel_w - inset, margin_y + inset)
    i_br = interp(margin_x + panel_w - inset, margin_y + panel_h - inset * 2)
    i_bl = interp(margin_x + inset, margin_y + panel_h - inset * 2)
    draw_quad_gradient_v(d, [i_tl, i_tr, i_br, i_bl], (28, 30, 36), (8, 9, 12), 16)

    gloss = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    g_tl = interp(margin_x + 0.02, margin_y + 0.02)
    g_tr = interp(margin_x + panel_w * 0.65, margin_y + 0.02)
    g_br = interp(margin_x + panel_w * 0.5, margin_y + panel_h * 0.35)
    g_bl = interp(margin_x + 0.04, margin_y + panel_h * 0.4)
    draw_quad(gd, [g_tl, g_tr, g_br, g_bl], (90, 110, 130, 35))
    layer = Image.alpha_composite(layer, gloss)

    return Image.alpha_composite(base, layer)


def draw_red_accent(base: Image.Image, front: list[tuple[float, float]]) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def interp(tu: float, tv: float) -> tuple[float, float]:
        (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
        top = (lerp(fx0, fx1, tu), lerp(fy0, fy1, tu))
        bot = (lerp(fx3, fx2, tu), lerp(fy3, fy2, tu))
        return lerp(top[0], bot[0], tv), lerp(top[1], bot[1], tv)

    y = 0.50
    p_l = interp(0.08, y)
    p_r = interp(0.92, y)
    h = max(3, SIZE // 120)
    d.line([(int(p_l[0]), int(p_l[1])), (int(p_r[0]), int(p_r[1]))], fill=FRONIUS_RED + (255,), width=h)
    return Image.alpha_composite(base, layer)


def draw_vent_grille(base: Image.Image, front: list[tuple[float, float]]) -> Image.Image:
    """Horizontal vent slots across lower front."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def interp(tu: float, tv: float) -> tuple[float, float]:
        (fx0, fy0), (fx1, fy1), (fx2, fy2), (fx3, fy3) = front
        top = (lerp(fx0, fx1, tu), lerp(fy0, fy1, tu))
        bot = (lerp(fx3, fx2, tu), lerp(fy3, fy2, tu))
        return lerp(top[0], bot[0], tv), lerp(top[1], bot[1], tv)

    y_start, y_end = 0.58, 0.88
    n_slots = 9
    for i in range(n_slots):
        t = (i + 0.5) / n_slots
        ty = y_start + (y_end - y_start) * t
        p_l = interp(0.10, ty)
        p_r = interp(0.90, ty)
        slot_h = max(2, SIZE // 140)
        y0 = int(p_l[1] - slot_h // 2)
        d.rounded_rectangle(
            (int(p_l[0]), y0, int(p_r[0]), y0 + slot_h),
            radius=1,
            fill=(175, 182, 192, 255),
        )
        d.line([(int(p_l[0]) + 2, y0 + 1), (int(p_r[0]) - 2, y0 + 1)], fill=(220, 226, 234, 90), width=1)

    return Image.alpha_composite(base, layer)


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    cx = SIZE // 2
    sd.ellipse(
        (cx - int(SIZE * 0.30), SIZE - int(SIZE * 0.13), cx + int(SIZE * 0.34), SIZE - int(SIZE * 0.03)),
        fill=(0, 0, 0, 55),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=SIZE // 30))
    img = Image.alpha_composite(img, shadow)

    # Slightly wider than tall — GEN24 wall unit proportions
    bw = int(SIZE * 0.48)
    bh = int(SIZE * 0.52)
    depth = int(SIZE * 0.09)
    ox = cx - bw // 2 - depth // 4
    oy = int(SIZE * 0.12)

    img, front = draw_box_3d(img, (ox, oy), bw, bh, depth)
    img = draw_display_panel(img, front)
    img = draw_red_accent(img, front)
    img = draw_vent_grille(img, front)

    draw = ImageDraw.Draw(img)

    # Status LEDs (small row under display)
    for i, rx in enumerate((0.22, 0.35, 0.50, 0.65, 0.78)):
        lx, ly = fp_on_front(front, rx, 0.54)
        r = max(3, SIZE // 95)
        col = (55, 200, 95, 255) if i == 2 else (90, 98, 108, 255)
        draw.ellipse((lx - r, ly - r, lx + r, ly + r), fill=col)

    # Bottom cable / conduit area
    px, py = fp_on_front(front, 0.5, 0.93)
    pw = int(bw * 0.12)
    ph = max(4, SIZE // 75)
    draw.rounded_rectangle((px - pw, py, px + pw, py + ph), radius=2, fill=(140, 148, 158, 255))

    # Wall-mount feet
    for rx in (0.26, 0.74):
        fx, fy = fp_on_front(front, rx, 1.01)
        draw.polygon(
            [(fx - 10, fy), (fx + 10, fy), (fx + 7, fy + 8), (fx - 7, fy + 8)],
            fill=(185, 192, 202, 230),
        )

    img = img.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    img.save(OUT_LEGACY, "PNG", optimize=True)
    print(f"Wrote {OUT} and {OUT_LEGACY} ({FINAL_SIZE[0]}x{FINAL_SIZE[1]})")


if __name__ == "__main__":
    main()
