#!/usr/bin/env python3
"""Remove studio background from a product PNG (rembg or edge flood-fill)."""
from __future__ import annotations

import argparse
import io
from collections import deque
from pathlib import Path

from PIL import Image


def _rgb(px: tuple) -> tuple[int, int, int]:
    return px[0], px[1], px[2]


def _similar(c: tuple[int, int, int], ref: tuple[int, int, int], tol: int) -> bool:
    return max(abs(c[i] - ref[i]) for i in range(3)) <= tol


def flood_background(
    im: Image.Image,
    ref: tuple[int, int, int],
    edge_tol: int,
    grow_tol: int,
) -> Image.Image:
    """Mark background as transparent: border flood, then one-pixel grow pass."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    is_bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int, tol: int) -> None:
        if is_bg[y][x]:
            return
        if _similar(_rgb(px[x, y]), ref, tol):
            is_bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0, edge_tol)
        try_seed(x, h - 1, edge_tol)
    for y in range(h):
        try_seed(0, y, edge_tol)
        try_seed(w - 1, y, edge_tol)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
                if _similar(_rgb(px[nx, ny]), ref, edge_tol):
                    is_bg[ny][nx] = True
                    q.append((nx, ny))

    # Grow into soft shadow (connected to border flood only)
    grow_q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if is_bg[y][x]:
                grow_q.append((x, y))
    while grow_q:
        x, y = grow_q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
                if _similar(_rgb(px[nx, ny]), ref, grow_tol):
                    is_bg[ny][nx] = True
                    grow_q.append((nx, ny))

    out = im.convert("RGBA")
    op = out.load()
    defringe_tol = grow_tol + 10
    for y in range(h):
        for x in range(w):
            r, g, b, a = op[x, y]
            if is_bg[y][x] or _similar((r, g, b), ref, defringe_tol):
                op[x, y] = (r, g, b, 0)
            else:
                op[x, y] = (r, g, b, 255)

    bbox = out.split()[3].getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


def rembg_background(im: Image.Image, flatten_rgb: tuple[int, int, int] = (230, 230, 230)) -> Image.Image:
    """AI background removal (best for product photos)."""
    from rembg import remove

    rgba = im.convert("RGBA")
    flat = Image.new("RGBA", rgba.size, flatten_rgb + (255,))
    flat.paste(rgba, (0, 0), rgba)
    buf = io.BytesIO()
    flat.convert("RGB").save(buf, format="PNG")
    out = Image.open(io.BytesIO(remove(buf.getvalue()))).convert("RGBA")
    bbox = out.split()[3].getbbox()
    return out.crop(bbox) if bbox else out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("-o", "--output", type=Path, default=None)
    parser.add_argument("--rembg", action="store_true", help="Use rembg (pip install 'rembg[cpu]')")
    parser.add_argument("--ref", default="230,230,230", help="Background RGB for flood-fill (default: 230,230,230)")
    parser.add_argument("--edge-tol", type=int, default=14)
    parser.add_argument("--grow-tol", type=int, default=32)
    args = parser.parse_args()

    ref = tuple(int(x) for x in args.ref.split(","))  # type: ignore
    out_path = args.output or args.input
    im = Image.open(args.input)
    if args.rembg:
        result = rembg_background(im, ref)
    else:
        result = flood_background(im, ref, args.edge_tol, args.grow_tol)
    result.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({result.size[0]}x{result.size[1]}, RGBA)")


if __name__ == "__main__":
    main()
