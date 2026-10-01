#!/usr/bin/env python3
"""Key the magenta background out of a footer « home scene » video.

Takes a painting video shot on a flat magenta background (≈ #DF00EC) and writes
everything the footer needs for one theme:

  frontend/assets/footer/home-scene[-<theme>]-{1792,1280}.{mp4,webm}
      « stacked » videos: colour block on top, alpha block below (alpha in grey,
      0.03 + 0.94·a), recomposed by the WebGL shader in site-footer.js.
  frontend/assets/footer/home-scene[-<theme>]-poster-{1792,960}.webp
      RGBA stills (first frame of the loop).
  <source folder>/<source name>-alpha.webm
      VP9 with real alpha, for use outside the site (Chrome/Firefox/editors).

It then updates the theme's colorH / alphaH / totalH in SCENES
(frontend/js/components/site-footer.js), since the alpha block only covers the
rows where the sky actually is.

Usage (from the repo root):
    python tools/footer-scene/key_magenta.py "C:/…/footer-terminal.mp4"
    python tools/footer-scene/key_magenta.py video.mp4 --theme retro90s --horizon 0.62

The theme is read from the file name (footer-<theme>.mp4) unless --theme is
given. Needs ffmpeg/ffprobe on PATH, numpy and Pillow.

How the key works
  * key colour: median of the strongly magenta pixels of the first frame;
  * "core" background: pixels close to the key colour; the matte is only
    computed in a thin band around the core, so pink flowers or magenta-ish
    details far from the sky stay opaque;
  * alpha from magenta-ness m = min(R, B) − G, linear between --lo (opaque) and
    --hi × m(key) (transparent); colour unmixed: F = (C − (1 − a)·K) / a, then a
    light despill;
  * despeck: near the sky, opaque pixels that stray from the local foreground
    colour towards the key (sky trapped in a cloud or between leaves, smeared
    purple by chroma subsampling) are repainted with that local colour;
  * transparent pixels get a push-pull fill of the nearby foreground colours so
    the edges don't pick up magenta when the video is compressed or filtered;
  * the last --loop-blend frames are cross-faded into the first ones for a
    seamless loop.
"""

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
ASSETS = REPO / 'frontend' / 'assets' / 'footer'
FOOTER_JS = REPO / 'frontend' / 'js' / 'components' / 'site-footer.js'
THEMES = ('default', 'terminal', 'blueprint', 'retro90s', 'fps')

# Output variants: width of the video, width of the poster.
VARIANTS = (('hd', 1792, 1792), ('sd', 1280, 960))
ALPHA_LO, ALPHA_SPAN = 0.03, 0.94          # alpha stored as 0.03 + 0.94·a (see shader)
PROC_MAX_W = 2240                           # keying resolution cap (source is often 2×)


# ─── ffmpeg helpers ─────────────────────────────────────────────────────────

def probe(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets',
         '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets',
         '-of', 'json', str(path)],
        check=True, capture_output=True, text=True).stdout
    s = json.loads(out)['streams'][0]
    num, den = (int(x) for x in s['r_frame_rate'].split('/'))
    return int(s['width']), int(s['height']), f'{num}/{den}', int(s['nb_read_packets'])


def read_frames(path, w, h, limit=None):
    """Yield RGB float32 frames (0..255) scaled to w × h."""
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), *(['-frames:v', str(limit)] if limit else []),
           '-vf', f'scale={w}:{h}:flags=area', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = w * h * 3
    try:
        while True:
            buf = proc.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32)
    finally:
        proc.stdout.close()
        proc.wait()


class Encoder:
    """An ffmpeg process fed raw frames on stdin."""

    def __init__(self, out, w, h, fps, pix_in, args, log):
        self.out = out
        self.log = open(log, 'w')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', pix_in,
               '-s', f'{w}x{h}', '-r', fps, '-i', '-', '-an', *args, str(out)]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=self.log)

    def write(self, frame):
        self.proc.stdin.write(np.ascontiguousarray(frame).tobytes())

    def close(self):
        self.proc.stdin.close()
        code = self.proc.wait()
        self.log.close()
        if code:
            raise RuntimeError(f'ffmpeg failed for {self.out} (see {self.log.name})')


BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
YUV709 = 'scale=out_color_matrix=bt709:out_range=tv,format={}'


def h264_args():
    return ['-vf', YUV709.format('yuv420p'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
            '-profile:v', 'high', '-level', '4.2', *BT709, '-movflags', '+faststart']


def vp9_args(pix='yuv420p', crf='33'):
    return ['-vf', YUV709.format(pix), '-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0',
            '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', *BT709]


# ─── image helpers ──────────────────────────────────────────────────────────

def dilate(mask, r):
    """Square max filter of radius r (separable, numpy only)."""
    out = mask.copy()
    for axis in (0, 1):
        src = out.copy()
        for d in range(1, r + 1):
            out[tuple(slice(d, None) if a == axis else slice(None) for a in (0, 1))] |= \
                src[tuple(slice(None, -d) if a == axis else slice(None) for a in (0, 1))]
            out[tuple(slice(None, -d) if a == axis else slice(None) for a in (0, 1))] |= \
                src[tuple(slice(d, None) if a == axis else slice(None) for a in (0, 1))]
    return out


def resize(arr, w, h):
    """Lanczos resize of a float32 H×W or H×W×C array."""
    if arr.ndim == 2:
        return np.asarray(Image.fromarray(arr, 'F').resize((w, h), Image.LANCZOS))
    return np.stack([resize(arr[..., c], w, h) for c in range(arr.shape[2])], -1)


def box_down(arr):
    h, w = arr.shape[:2]
    h2, w2 = h // 2 * 2, w // 2 * 2
    a = arr[:h2, :w2]
    return (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) * 0.25


def up_to(arr, h, w):
    return resize(arr.astype(np.float32), w, h)


def push_pull_fill(rgb, alpha):
    """Colour for transparent pixels, pulled from the nearest foreground."""
    levels = [(rgb * alpha[..., None], alpha)]
    while min(levels[-1][1].shape) > 4:
        p, a = levels[-1]
        levels.append((box_down(p), box_down(a)))
    p, a = levels[-1]
    mean = p.reshape(-1, 3).sum(0) / max(a.sum(), 1e-6)
    fill = np.where(a[..., None] > 1e-4, p / np.maximum(a, 1e-4)[..., None], mean)
    for p, a in reversed(levels[:-1]):
        h, w = a.shape
        coarse = up_to(fill, h, w)
        own = p / np.maximum(a, 1e-4)[..., None]
        k = np.clip(a * 4.0, 0.0, 1.0)[..., None]
        fill = own * k + coarse * (1.0 - k)
    return fill


# ─── keying ─────────────────────────────────────────────────────────────────

def magenta(rgb):
    return np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]


def estimate_key(rgb):
    m = magenta(rgb)
    core = m > 0.7 * m.max()
    if core.sum() < 1000:
        sys.exit('No magenta background found in the first frame (try --key).')
    return np.median(rgb[core], axis=0)


def despeck(rgb, a, key, reach, horizon):
    """Repaint the purple specks left near the sky with the local foreground.

    Each pixel is compared with the push-pull colour F of the clearly
    non-magenta pixels around it: t is how far it moved from F towards the key
    K, cos how well K − F explains the move. A speck moves straight towards K
    (cos high, t > a few %), or, inside the blue clouds, towards K and darker
    (lower cos, but bluer than red). Red roofs or flowers next to green
    foliage move towards red, not towards K, and are kept.
    """
    if reach <= 0:
        return rgb
    near = dilate(a < 0.5, reach)
    near[horizon:] = False
    near &= a > 0.15
    clean = ((magenta(rgb) < -15) & (a > 0.5)).astype(np.float32)
    f = push_pull_fill(rgb, clean)
    kf = key - f
    d = rgb - f
    dot = (d * kf).sum(-1)
    kf_n = np.sqrt((kf ** 2).sum(-1)) + 1e-3
    t = dot / kf_n ** 2
    cos = dot / (kf_n * (np.sqrt((d ** 2).sum(-1)) + 1e-3))
    bluish = np.clip((rgb[..., 2] - rgb[..., 0] + 25) / 20, 0, 1)
    gate = np.maximum(np.clip((cos - 0.78) / 0.1, 0, 1), np.clip((cos - 0.2) / 0.2, 0, 1) * bluish)
    amount = np.clip((t - 0.02) / 0.05, 0, 1) * np.clip((t * kf_n - 6) / 8, 0, 1)
    w = (amount * gate * near)[..., None]
    return rgb + w * (f - rgb)


class Keyer:
    def __init__(self, key, opts, h, scale):
        self.key = np.asarray(key, np.float32)
        self.mk = float(min(self.key[0], self.key[2]) - self.key[1])
        self.lo = opts.lo
        self.hi = opts.hi * self.mk
        self.core_dist = opts.core_dist
        self.band = max(1, round(opts.band * scale))
        self.horizon = int(opts.horizon * h) if opts.horizon else h
        self.reach = max(0, round(opts.despeck * scale))

    def core(self, rgb):
        """Pure background: the key colour, or a darker shade of it (sky seen
        between leaves comes out darker after compression)."""
        m = magenta(rgb)
        hi = rgb.max(-1)
        dist = np.sqrt(((rgb - self.key) ** 2).sum(-1))
        core = (dist < self.core_dist) & (m > 0.6 * self.mk)
        core |= (m > 50) & (m > 0.7 * hi) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 0.35 * hi)
        core[self.horizon:] = False
        return core

    def __call__(self, rgb):
        core = self.core(rgb)
        band = dilate(core, self.band)
        band[self.horizon:] = False
        m = magenta(rgb)

        # Two-colour model in the band: the pixel is a mix of the nearest
        # background colour K and the nearest sure-foreground colour F, alpha is
        # the projection of C on the K→F segment. Falls back to magenta-ness
        # where K and F are too close to tell apart.
        k_loc = push_pull_fill(rgb, core.astype(np.float32))
        f_loc = push_pull_fill(rgb, (~band).astype(np.float32))
        kf = f_loc - k_loc
        kf2 = (kf ** 2).sum(-1)
        a_proj = ((rgb - k_loc) * kf).sum(-1) / np.maximum(kf2, 1.0)
        a_mag = (self.hi - m) / (self.hi - self.lo)
        a = np.where(kf2 > 60.0 ** 2, a_proj, a_mag)
        a = np.clip(a, 0.0, 1.0)
        a = np.where(band, a, 1.0)
        a[core] = 0.0
        a = np.where(a < 0.04, 0.0, np.where(a > 0.97, 1.0, a)).astype(np.float32)

        # Unmix the background out of the partial pixels.
        safe = np.maximum(a, 1e-3)[..., None]
        fg = (rgb - (1.0 - a)[..., None] * k_loc) / safe
        fg = np.where(((a > 0.02) & band)[..., None], fg, rgb)
        fg = np.clip(fg, 0.0, 255.0)

        # Despill: near the sky, nothing may be more magenta than the local
        # foreground (edge fringes, compression bleed between leaves).
        near = dilate(band, self.band * 4)
        near[self.horizon:] = False
        cap = np.maximum(magenta(f_loc), self.lo)
        spill = np.maximum(magenta(fg) - cap, 0.0) * near
        fg[..., 0] -= spill
        fg[..., 2] -= spill
        fg = np.clip(fg, 0.0, 255.0)
        fg = despeck(fg, a, self.key, self.reach, self.horizon)

        fill = push_pull_fill(fg, a)
        colour = np.where((a > 0.0)[..., None], fg, fill)
        return colour, a


# ─── pipeline ───────────────────────────────────────────────────────────────

def ceil16(x):
    return int(math.ceil(x / 16.0) * 16)


def asset_base(theme):
    return 'home-scene' if theme == 'default' else f'home-scene-{theme}'


def alpha_cover(src, keyer_args, sw, sh, frames):
    """Fraction of the picture height (from the top) that has any transparency."""
    w = 560
    h = round(sh * w / sw)
    keyer = Keyer(*keyer_args(h, w / 2230))
    lowest = 0
    for i, rgb in enumerate(read_frames(src, w, h)):
        if i % 4 and i < frames - 1:
            continue
        rows = np.where(dilate(keyer.core(rgb), keyer.band + 2).any(1))[0]
        if len(rows):
            lowest = max(lowest, rows.max() + 1)
    return min(1.0, lowest / h + 0.01)


def patch_scenes(theme, sizes, aspect_txt):
    js = FOOTER_JS.read_text(encoding='utf-8')
    base = asset_base(theme)
    for tier, (w, color_h, alpha_h) in sizes.items():
        pattern = re.compile(
            rf"({tier}: \{{ name: '{re.escape(base)}-{w}', poster: '[^']+', )"
            r"colorH: \d+, alphaH: \d+, totalH: \d+")
        js, n = pattern.subn(rf"\g<1>colorH: {color_h}, alphaH: {alpha_h}, totalH: {color_h + alpha_h}", js)
        if n != 1:
            return False
    block = re.compile(rf"(\n        {theme}: \{{\n            aspect: )(\d+) / (\d+),")
    found = block.search(js)
    if not found:
        return False
    num, den = (int(x) for x in aspect_txt.split(' / '))
    if abs(int(found[2]) / int(found[3]) - num / den) > 1e-4:   # keep "2230 / 930" when unchanged
        js = js[:found.start()] + f'{found[1]}{aspect_txt},' + js[found.end():]
    FOOTER_JS.write_text(js, encoding='utf-8')
    return True


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('source', type=Path)
    ap.add_argument('--theme', choices=THEMES, help='default: read from footer-<theme>.mp4')
    ap.add_argument('--key', help='key colour as hex (default: estimated)')
    ap.add_argument('--lo', type=float, default=24, help='magenta-ness kept fully opaque (default 24)')
    ap.add_argument('--hi', type=float, default=0.9, help='fraction of key magenta-ness that is fully transparent')
    ap.add_argument('--core-dist', type=float, default=80, help='RGB distance to the key for "pure background"')
    ap.add_argument('--band', type=float, default=4, help='matte band around the background, px at 2230 wide')
    ap.add_argument('--despeck', type=float, default=35,
                    help='reach of the purple-speck pass around the sky, px at 2230 wide (0: off)')
    ap.add_argument('--horizon', type=float, help='rows below this fraction of the height stay opaque')
    ap.add_argument('--loop-blend', type=int, default=8, help='frames cross-faded for the loop (0: off)')
    ap.add_argument('--no-patch', action='store_true', help="don't touch site-footer.js")
    ap.add_argument('--no-alpha-webm', action='store_true', help='skip the standalone transparent WebM')
    ap.add_argument('--preview', type=Path, help='also write QA PNGs (first frame) to this folder')
    ap.add_argument('--preview-only', action='store_true', help='write the QA PNGs and stop (to tune the key)')
    opts = ap.parse_args()

    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            sys.exit(f'{tool} not found on PATH')
    src = opts.source.resolve()
    theme = opts.theme
    if not theme:
        stem = src.stem.lower()
        theme = next((t for t in THEMES if stem.endswith(t)), None)
        if not theme:
            sys.exit(f'Theme not found in "{src.name}": name it footer-<theme>.mp4 or pass --theme')

    sw, sh, fps, n = probe(src)
    blend = max(0, min(opts.loop_blend, n // 4))
    pw = min(sw, PROC_MAX_W)
    ph = round(sh * pw / sw)
    print(f'{src.name}: {sw}×{sh}, {n} frames @ {fps} → theme "{theme}", keyed at {pw}×{ph}')

    first = next(read_frames(src, pw, ph, limit=1))
    if opts.key:
        hx = opts.key.lstrip('#')
        key = [int(hx[i:i + 2], 16) for i in (0, 2, 4)]
    else:
        key = estimate_key(first)
    print('key colour: #%02X%02X%02X' % tuple(int(round(c)) for c in key))

    if opts.preview_only:
        folder = opts.preview or src.parent / 'key-preview'
        write_preview(folder, asset_base(theme), *Keyer(key, opts, ph, pw / 2230)(first))
        print(f'preview written to {folder}')
        return

    keyer_args = lambda h, scale: (key, opts, h, scale)  # noqa: E731
    cover = alpha_cover(src, keyer_args, sw, sh, n)
    print(f'transparency reaches {cover:.1%} of the height')
    keyer = Keyer(*keyer_args(ph, pw / 2230))

    aspect = sw / sh
    g = math.gcd(sw, sh)
    aspect_txt = f'{sw // g} / {sh // g}'
    sizes, encoders, posters = {}, [], {}
    base = asset_base(theme)
    tmp = Path(tempfile.mkdtemp(prefix='footer-key-'))
    out_paths = []
    for tier, w, poster_w in VARIANTS:
        color_h = ceil16(w / aspect)
        alpha_h = min(color_h, ceil16(color_h * cover))
        sizes[tier] = (w, color_h, alpha_h)
        posters[tier] = (poster_w, round(poster_w / aspect))
        for ext, args in (('mp4', h264_args()), ('webm', vp9_args())):
            out = tmp / f'{base}-{w}.{ext}'
            encoders.append((tier, Encoder(out, w, color_h + alpha_h, fps, 'rgb24', args, tmp / f'{out.name}.log')))
            out_paths.append(out)
    alpha_webm = None
    if not opts.no_alpha_webm:
        aw = min(sw, 2230) // 2 * 2
        ah = round(aw / aspect) // 2 * 2
        alpha_webm = src.with_name(f'{src.stem}-alpha.webm')
        encoders.append(('alpha', Encoder(alpha_webm, aw, ah, fps, 'rgba',
                                          vp9_args('yuva420p', '30') + ['-auto-alt-ref', '0'], tmp / 'alpha.log')))

    def emit(index, rgb):
        colour, a = keyer(rgb)
        for tier, enc in encoders:
            if tier == 'alpha':
                aw, ah = enc_size[enc]
                c = resize(colour, aw, ah)
                al = resize(a, aw, ah)
                enc.write(np.dstack([c, np.clip(al, 0, 1) * 255]).round().clip(0, 255).astype(np.uint8))
                continue
            w, color_h, alpha_h = sizes[tier]
            c = resize(colour, w, color_h)
            al = np.clip(resize(a, w, color_h)[:alpha_h], 0.0, 1.0)
            grey = (ALPHA_LO + ALPHA_SPAN * al) * 255.0
            stacked = np.vstack([c, np.repeat(grey[..., None], 3, -1)])
            enc.write(stacked.round().clip(0, 255).astype(np.uint8))
        if index == 0:
            for tier, (poster_w, poster_h) in posters.items():
                c = resize(colour, poster_w, poster_h)
                al = np.clip(resize(a, poster_w, poster_h), 0.0, 1.0) * 255
                rgba = np.dstack([c, al]).round().clip(0, 255).astype(np.uint8)
                Image.fromarray(rgba, 'RGBA').save(tmp / f'{base}-poster-{poster_w}.webp',
                                                   quality=86, method=6, exact=False)
            if opts.preview:
                write_preview(opts.preview, base, colour, a)

    enc_size = {}
    if alpha_webm:
        enc_size[encoders[-1][1]] = (aw, ah)

    # Loop: play frames [blend, n − blend), then frames n − blend.. cross-faded
    # into 0.. so the last frame flows back into the first one.
    head = []
    out_index = 0
    for i, rgb in enumerate(read_frames(src, pw, ph)):
        if i < blend:
            head.append(rgb)
            continue
        if i >= n - blend:
            j = i - (n - blend)
            t = (j + 1) / (blend + 1)
            rgb = rgb * (1.0 - t) + head[j] * t
        emit(out_index, rgb)
        out_index += 1
        print(f'\r  frame {out_index}/{n - blend}', end='', flush=True)
    print()
    for _, enc in encoders:
        enc.close()

    ASSETS.mkdir(parents=True, exist_ok=True)
    for f in [*out_paths, *(tmp / f'{base}-poster-{pw_}.webp' for pw_, _ in posters.values())]:
        shutil.copy2(f, ASSETS / f.name)
        print(f'  → {(ASSETS / f.name).relative_to(REPO)}  ({f.stat().st_size / 1e6:.2f} MB)')
    if alpha_webm:
        print(f'  → {alpha_webm}  (transparent WebM)')
    shutil.rmtree(tmp, ignore_errors=True)

    entry = {t: dict(colorH=c, alphaH=a, totalH=c + a) for t, (_, c, a) in sizes.items()}
    if opts.no_patch:
        print('SCENES sizes:', json.dumps(entry))
    elif patch_scenes(theme, sizes, aspect_txt):
        print(f'site-footer.js: SCENES.{theme} updated {json.dumps(entry)}')
    else:
        print(f'⚠ site-footer.js: SCENES.{theme} not found, set by hand: aspect {aspect_txt}, {json.dumps(entry)}')


def write_preview(folder, base, colour, a):
    folder.mkdir(parents=True, exist_ok=True)
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    checker = np.where(((yy // 24 + xx // 24) % 2)[..., None] == 0, 200.0, 140.0) * np.ones(3)
    for name, bg in (('checker', checker), ('dark', np.full((h, w, 3), (12, 14, 18), np.float32)),
                     ('light', np.full((h, w, 3), (246, 241, 232), np.float32))):
        comp = colour * a[..., None] + bg * (1.0 - a[..., None])
        Image.fromarray(comp.round().clip(0, 255).astype(np.uint8)).save(folder / f'{base}-{name}.png')
    Image.fromarray((a * 255).round().astype(np.uint8)).save(folder / f'{base}-matte.png')


if __name__ == '__main__':
    main()
