#!/usr/bin/env python3
"""Prepare a footer painting for the video model (fal pixelcult/loopback-video).

The painting is generated on flat magenta. Keying magenta out of the *video*
leaves pink on the moving leaves: the video model blurs the leaf edges into the
background, lights the foliage with it, and the encoder smears it. So the
magenta is keyed out of the *still* instead (sharp, nothing moves), and the
painting is put back on the colour the sky will show on the site: the page
background of its theme. Whatever the video model then blends into the leaves
is that page colour, which is invisible once the video sits on the page.

For each image this writes, next to it in a `loopback/` folder:
  footer-<theme>-loopback.png   the painting on the theme's page colour (send it to fal)
  footer-<theme>-still.png      the keyed painting, RGBA (reference matte)

Usage (from the repo root):
    python tools/footer-scene/prep_loopback.py footer-default.webp footer-fps.webp ...
    python tools/footer-scene/prep_loopback.py image.png --theme blueprint

The theme is read from the file name (footer-<theme>.*, retro works too)
unless --theme is given. Then animate the -loopback.png files and key the videos
with key_magenta.py --bg <theme colour> (the colour is printed here).
"""

import argparse
import sys
import types
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import key_magenta as km  # noqa: E402

# Page colour behind the footer scene, per theme (body background; fps has a
# fixed sky gradient, this is its colour around the scene). `derim` /
# `derim_warm`: same passes as key_magenta.py, for paintings whose generator
# painted magenta light on the foliage.
THEMES = {
    'default':   dict(bg='#F8F7F4'),
    'terminal':  dict(bg='#0A0A0A'),
    'blueprint': dict(bg='#003366', derim=160),
    'retro90s':  dict(bg='#C0C0C0'),
    'fps':       dict(bg='#ECD7AE', derim=160, derim_warm=True),
}


def hex_rgb(value):
    value = value.lstrip('#')
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def theme_of(path, forced):
    if forced:
        return forced
    stem = path.stem.lower()
    for name in THEMES:
        if stem.endswith(name):
            return name
    if stem.endswith('retro'):
        return 'retro90s'
    sys.exit(f'Theme not found in "{path.name}": name it footer-<theme>.png or pass --theme')


def prepare(path, theme, out_dir):
    cfg = THEMES[theme]
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    h, w, _ = rgb.shape
    key = km.estimate_key(rgb)
    opts = types.SimpleNamespace(lo=12, hi=0.9, core_dist=80, band=6, despeck=35,
                                 horizon=km.find_horizon(rgb, key),
                                 derim=cfg.get('derim', 0), derim_warm=cfg.get('derim_warm', False))
    colour, alpha = km.Keyer(key, opts, h, w / 2230)(rgb)

    # Video models want even sizes.
    w2, h2 = w // 2 * 2, h // 2 * 2
    colour, alpha = colour[:h2, :w2], alpha[:h2, :w2]
    bg = hex_rgb(cfg['bg'])
    flat = colour * alpha[..., None] + bg * (1.0 - alpha[..., None])

    out_dir.mkdir(parents=True, exist_ok=True)
    base = f'footer-{theme}'
    Image.fromarray(flat.round().clip(0, 255).astype(np.uint8)).save(out_dir / f'{base}-loopback.png')
    rgba = np.dstack([colour, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(out_dir / f'{base}-still.png')
    key_hex = '#%02X%02X%02X' % tuple(int(round(c)) for c in key)
    print(f'{path.name} → {theme}: {w2}×{h2}, key {key_hex}, sky stops at {opts.horizon:.0%}, '
          f'page colour {cfg["bg"]}')
    print(f'  → {out_dir / (base + "-loopback.png")}')


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('images', type=Path, nargs='+')
    ap.add_argument('--theme', choices=THEMES, help='default: read from the file name')
    ap.add_argument('--out', type=Path, help='output folder (default: <image folder>/loopback)')
    opts = ap.parse_args()
    if opts.theme and len(opts.images) > 1:
        sys.exit('--theme only works with a single image')
    for path in opts.images:
        prepare(path, theme_of(path, opts.theme), opts.out or path.parent / 'loopback')


if __name__ == '__main__':
    main()
