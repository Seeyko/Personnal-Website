#!/usr/bin/env python3
"""Key a footer « home scene » video shot on an exact, flat magenta backdrop.

For a video whose backdrop is one flat colour (≈ #F305F1, ± compression noise).
key_magenta.py decides region by region what is sky; on a video those yes/no
decisions flip from one frame to the next and the matte flickers. Here:

  * every decision is continuous in the pixel's colour, so the matte is as
    steady over time as the source: each pixel loses the share of the key it
    carries (its magenta-ness above the clean foreground's around it), that
    share becomes transparency and the rest is unmixed;
  * the clouds are not taken from the video. The video model repaints them pink
    and violet during the loop, which no key can undo: they come from the first
    frame, as a still layer behind the keyed foreground;
  * pink or salmon light the model painted on the leaves takes the colour of
    the clean foliage around it.

Writes, for one theme:

  frontend/assets/footer/home-scene[-<theme>]-{<hd width>,1280}.{mp4,webm}
      « stacked » videos: colour block on top, alpha block below (alpha in grey,
      0.03 + 0.94·a), recomposed by the WebGL shader in site-footer.js.
  frontend/assets/footer/home-scene[-<theme>]-poster-{1792,960}.webp
      RGBA stills (first frame of the loop).

and prints the SCENES entry to paste in frontend/js/components/site-footer.js.

Usage (from the repo root):
    python tools/footer-scene/key_exact.py "C:/…/footer-default.mp4"
    python tools/footer-scene/key_exact.py video.mp4 --theme default --preview out/

Nothing below the sea line (found on the first frame, + 2.5 % of the height) is
touched. Needs ffmpeg/ffprobe on PATH, numpy and Pillow.
"""

import argparse
import math
import shutil
import sys
import tempfile
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import key_magenta as km  # noqa: E402

LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)
POSTERS = (1792, 960)
SD_WIDTH = 1280


def ramp(x, lo, hi):
    return np.clip((x - lo) / (hi - lo), 0.0, 1.0)


def cloudish(c):
    """0..1: bright and nearly neutral (white, cream), or a bright blue / violet / pink pastel."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    lo, hi = c.min(-1), c.max(-1)
    neutral = ramp(lo, 150.0, 190.0) * ramp(hi - lo, 70.0, 40.0)
    pastel = ramp(b - g, -6.0, 6.0) * ramp(r + g + b, 330.0, 420.0)
    return np.maximum(neutral, pastel)


def grow(seed, allowed, step=3, limit=800):
    """Region growing: what `seed` reaches through `allowed`."""
    out = seed & allowed
    for _ in range(limit):
        nxt = km.dilate(out, step) & allowed
        if nxt.sum() == out.sum():
            break
        out = nxt
    return out


class ExactKeyer(km.Keyer):
    clouds = None   # (colour, alpha, zone, keep) of the still cloud layer, set by freeze_clouds()

    def matte(self, rgb):
        hz = self.horizon
        core = self.core(rgb)
        band = km.dilate(core, self.band)
        band[hz:] = False
        m = km.magenta(rgb)

        # Foreground reference F: colour of the nearest pixels that hold no key at all.
        notkey = ~band & ~km.key_hue(rgb, 0.12) & (m < self.lo)
        notkey[hz:] = True
        k_loc = km.push_pull_fill(rgb, core.astype(np.float32))
        f = km.push_pull_fill(rgb, notkey.astype(np.float32))
        # F is trusted near clean pixels. Deep inside a tainted body (a cloud
        # painted pink) it comes from far away: assume a neutral foreground.
        near = np.clip(km.box_soft(km.dilate(notkey, 2 * self.band + 2).astype(np.float32), self.band), 0.0, 1.0)
        mf = near * np.clip(km.magenta(f), -150.0, 0.0)
        mk = np.maximum(km.magenta(k_loc), 60.0) * (self.hi / self.mk)   # self.hi = --hi × m(key)

        # How much of the key each pixel carries: its magenta-ness above the
        # foreground's own. That share becomes transparency, the rest is unmixed.
        amt = np.clip((m - mf) / np.maximum(mk - mf, 1.0), 0.0, 1.0)
        amt[notkey] = 0.0
        amt[core] = 1.0
        t = 1.0 - amt
        fg = (rgb - amt[..., None] * k_loc) / np.maximum(t, 0.05)[..., None]
        # Right at the edge, a mostly transparent pixel's own colour is unreliable
        # (the video model lights leaf tips with the backdrop): lean on F there.
        lean = (band * near * ramp(t, 0.9, 0.6))[..., None]
        fg = np.clip(fg + lean * (f - fg), 0.0, 255.0)
        spill = np.maximum(km.magenta(fg) - (mf + 10.0), 0.0) * ~notkey
        fg[..., 0] -= spill
        fg[..., 2] -= spill
        a = np.where(t < 0.04, 0.0, np.where(t > 0.97, 1.0, t)).astype(np.float32)
        fg = self.depink(np.clip(fg, 0.0, 255.0), a)
        fg = self.dewarm(fg, a)
        return fg, a, core

    def depink(self, colour, a):
        """Pink light the video model painted on the scene (mauve specks, pink
        rims): the pixel takes the clean colour around it, at its own luminance."""
        r, g, b = colour[..., 0], colour[..., 1], colour[..., 2]
        w = ramp(r - g, 15.0, 35.0) * ramp(b - g, -15.0, 5.0) * ramp(r, 100.0, 120.0) * (a > 0.0)
        w[self.horizon:] = 0.0
        if not w.any():
            return colour
        ref = km.push_pull_fill(colour, ((w < 0.05) & (a > 0.5)).astype(np.float32))
        recol = np.clip(ref * np.clip((colour @ LUM) / np.maximum(ref @ LUM, 1.0), 0.6, 1.4)[..., None], 0.0, 255.0)
        return colour + w[..., None] * (recol - colour)

    def dewarm(self, colour, a):
        """Leaves next to the sky that the video model lit with the backdrop
        (salmon / orange once keyed): the backdrop adds red and blue alike, so a
        bright warm pixel loses the blue it has above what the clean foliage
        around has for the same green, and as much red. Dark ones (branches) are
        left alone."""
        r, g, b = colour[..., 0], colour[..., 1], colour[..., 2]
        reach = max(2, round(10 * self.band / 6))
        zone = np.clip(km.box_soft(km.dilate(a < 0.5, reach).astype(np.float32), 2), 0.0, 1.0) * (a > 0.0)
        zone[self.horizon:] = 0.0
        warm = ramp(r - g, 20.0, 40.0) * ramp(r, 130.0, 150.0)
        leafy = ((r - g < 21.0) & (g > 1.25 * b) & (a > 0.5)).astype(np.float32)
        ref = km.push_pull_fill(colour, leafy)
        around = ramp(km.box_soft(leafy, 3 * reach), 0.04, 0.12)        # foliage close by
        rho = np.clip(ref[..., 2] / np.maximum(ref[..., 1], 1.0), 0.3, 0.8)
        extra = np.maximum(b - rho * g, 0.0) * zone * warm * around
        out = colour.copy()
        out[..., 0] -= np.minimum(extra, np.maximum(r - g, 0.0))
        out[..., 2] -= extra
        return out

    def freeze_clouds(self, first):
        """Cloud layer from a clean frame, and the zone where the video's own
        clouds are dropped: everything that is not solid scenery in that frame."""
        hz = self.horizon
        c0, a0, core0 = self.matte(first)
        is_cloud = (cloudish(c0) > 0.5) & (a0 > 0.04)
        is_cloud[hz:] = False
        sky = km.dilate(core0, 2)
        raw = grow(sky, is_cloud | sky) & ~core0 & (a0 > 0.0)
        # Thin rims are not clouds (the pale edge of the foliage, the sea line):
        # keep what survives an opening, and what is still joined to the sky.
        r = max(2, round(4 * self.band / 6))
        opened = ~km.dilate(~raw, r)
        opened = grow(opened, raw, step=2, limit=r + 4)      # back to the edge, wisps included
        cloud0 = grow(sky, opened | sky) & opened
        solid0 = (a0 > 0.5) & ~cloud0
        solid0[hz:] = True
        # The pale edge of the leaves in front of a cloud is not cloud either:
        # keep the layer clear of them, and paint the cloud on under that edge
        # so nothing shows when the leaves move...
        leaves = km.dilate((a0 > 0.5) & (cloudish(c0) < 0.2), r)
        leaves[hz:] = False
        strict = cloud0 & ~leaves
        cc = km.push_pull_fill(c0, strict.astype(np.float32))
        ac = a0 * strict
        # ...where the cloud goes on behind them: of what shows between the
        # leaves around, most is cloud (not the odd rim that follows a leaf out
        # into the open sky).
        n_cloud = km.box_soft(strict.astype(np.float32), 6 * r)
        n_sky = km.box_soft((a0 < 0.5).astype(np.float32), 6 * r)
        ac[(n_cloud > 1.5 * n_sky + 0.01) & (leaves | solid0)] = 1.0
        ac[hz:] = 0.0
        if not strict.any():
            return                                           # no cloud to freeze (terminal: green ones)
        # The scenery only sways by a few px: further out in the sky, whatever
        # the video shows is a repainted cloud or what is left of one.
        reach = max(4, round(42 * self.band / 6))
        keep = np.clip(km.box_soft(km.dilate(solid0, reach).astype(np.float32), max(2, reach // 4)), 0.0, 1.0)
        self.clouds = (cc, ac, ~solid0, keep)

    def __call__(self, rgb):
        hz = self.horizon
        fg, a, _ = self.matte(rgb)
        if self.clouds is not None:
            cc, ac, zone, keep = self.clouds
            # The frame's solid scenery. Outside the first frame's own, a faint
            # pixel is what is left of a repainted cloud, not a leaf.
            s = a * (1.0 - cloudish(fg) * zone) * keep * np.where(zone, ramp(a, 0.25, 0.6), 1.0)
            out_a = s + (1.0 - s) * ac
            fg = (s[..., None] * fg + ((1.0 - s) * ac)[..., None] * cc) / np.maximum(out_a, 1e-3)[..., None]
            a = np.where(out_a < 0.04, 0.0, np.where(out_a > 0.97, 1.0, out_a)).astype(np.float32)
        fill = km.push_pull_fill(fg, a)
        out = np.where((a > 0.0)[..., None], fg, fill)
        # Last word: no pixel above the horizon keeps the key's hue.
        top = out[:hz]
        s = np.maximum(km.magenta(top), 0.0) * km.key_hue(top, 0.12)
        top[..., 0] -= s
        top[..., 2] -= s
        return out, a


def make_keyer(first, w, h, clouds=True):
    key = km.estimate_key(first)
    opts = argparse.Namespace(lo=12, hi=0.9, core_dist=80, band=6, despeck=0, derim=0,
                              horizon=km.find_horizon(first, key))
    keyer = ExactKeyer(key, opts, h, w / 2230)
    if clouds:
        keyer.freeze_clouds(first)
    return keyer


# ─── pipeline ───────────────────────────────────────────────────────────────

_keyer = None


def _init(first, w, h, clouds):
    global _keyer
    _keyer = make_keyer(first, w, h, clouds)


def _work(frame):
    colour, a = _keyer(frame.astype(np.float32))
    return colour.round().clip(0, 255).astype(np.uint8), (a * 255).round().astype(np.uint8)


def looped(src, w, h, n, blend):
    """Frames [blend, n − blend), then the last `blend` cross-faded into the
    first ones, so the last frame flows back into the first."""
    head = []
    for i, rgb in enumerate(km.read_frames(src, w, h)):
        if i < blend:
            head.append(rgb)
            continue
        if i >= n - blend:
            j = i - (n - blend)
            t = (j + 1) / (blend + 1)
            rgb = rgb * (1.0 - t) + head[j] * t
        yield rgb.round().astype(np.uint8)


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('source', type=Path)
    ap.add_argument('--theme', choices=km.THEMES, default='default')
    ap.add_argument('--video-clouds', action='store_true', help="keep the video's own clouds (not frozen)")
    ap.add_argument('--loop-blend', type=int, default=8, help='frames cross-faded for the loop (0: off)')
    ap.add_argument('--jobs', type=int, default=6)
    ap.add_argument('--preview', type=Path, help='also write the keyed video over cream and black, to this folder')
    opts = ap.parse_args()

    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            sys.exit(f'{tool} not found on PATH')
    src = opts.source.resolve()
    sw, sh, fps, n = km.probe(src)
    blend = max(0, min(opts.loop_blend, n // 4))
    first = next(km.read_frames(src, sw, sh, limit=1))
    probe_keyer = make_keyer(first, sw, sh, clouds=False)
    horizon = probe_keyer.horizon / sh
    print(f'{src.name}: {sw}×{sh}, {n} frames @ {fps} → theme "{opts.theme}"')
    print('key colour: #%02X%02X%02X, keying stops at %.1f%% of the height' % (*(int(round(c)) for c in probe_keyer.key), horizon * 100))

    aspect = sw / sh
    base = km.asset_base(opts.theme)
    tmp = Path(tempfile.mkdtemp(prefix='footer-key-'))
    sizes, encoders = {}, []
    for tier, w in (('hd', min(sw, km.PROC_MAX_W) // 2 * 2), ('sd', SD_WIDTH)):
        color_h = km.ceil16(w / aspect)
        alpha_h = min(color_h, km.ceil16(color_h * horizon))
        sizes[tier] = (w, color_h, alpha_h)
        for ext, args in (('mp4', km.h264_args(w, color_h + alpha_h)), ('webm', km.vp9_args())):
            out = tmp / f'{base}-{w}.{ext}'
            encoders.append((tier, km.Encoder(out, w, color_h + alpha_h, fps, 'rgb24', args, tmp / f'{out.name}.log')))
    previews = []
    if opts.preview:
        opts.preview.mkdir(parents=True, exist_ok=True)
        for name, bg in (('cream', (248, 247, 244)), ('black', (10, 10, 10))):
            out = opts.preview / f'{base}-on-{name}.mp4'
            previews.append((np.array(bg, np.float32),
                             km.Encoder(out, sw, sh, fps, 'rgb24', km.h264_args(sw, sh), tmp / f'{out.name}.log')))

    with Pool(opts.jobs, initializer=_init, initargs=(first, sw, sh, not opts.video_clouds)) as pool:
        for i, (c8, a8) in enumerate(pool.imap(_work, looped(src, sw, sh, n, blend))):
            colour, a = c8.astype(np.float32), a8.astype(np.float32) / 255.0
            for tier, enc in encoders:
                w, color_h, alpha_h = sizes[tier]
                c = km.resize(colour, w, color_h)
                al = np.clip(km.resize(a, w, color_h)[:alpha_h], 0.0, 1.0)
                grey = (km.ALPHA_LO + km.ALPHA_SPAN * al) * 255.0
                enc.write(np.vstack([c, np.repeat(grey[..., None], 3, -1)]).round().clip(0, 255).astype(np.uint8))
            for bg, enc in previews:
                enc.write((colour * a[..., None] + bg * (1.0 - a[..., None])).round().clip(0, 255).astype(np.uint8))
            if i == 0:
                for poster_w in POSTERS:
                    poster_h = round(poster_w / aspect)
                    rgba = np.dstack([km.resize(colour, poster_w, poster_h),
                                      np.clip(km.resize(a, poster_w, poster_h), 0.0, 1.0) * 255])
                    Image.fromarray(rgba.round().clip(0, 255).astype(np.uint8), 'RGBA').save(
                        tmp / f'{base}-poster-{poster_w}.webp', quality=86, method=6, exact=False)
            print(f'\r  frame {i + 1}/{n - blend}', end='', flush=True)
    print()
    for _, enc in [*encoders, *previews]:
        enc.close()

    km.ASSETS.mkdir(parents=True, exist_ok=True)
    for f in sorted([*tmp.glob(f'{base}-*.mp4'), *tmp.glob(f'{base}-*.webm'), *tmp.glob(f'{base}-poster-*.webp')]):
        shutil.copy2(f, km.ASSETS / f.name)
        print(f'  → {(km.ASSETS / f.name).relative_to(km.REPO)}  ({f.stat().st_size / 1e6:.2f} MB)')
    shutil.rmtree(tmp, ignore_errors=True)

    g = math.gcd(sw, sh)
    print(f'SCENES.{opts.theme} (site-footer.js): aspect: {sw // g} / {sh // g},')
    for tier, (w, color_h, alpha_h) in sizes.items():
        poster_w = POSTERS[0] if tier == 'hd' else POSTERS[1]
        print(f"    {tier}: {{ name: '{base}-{w}', poster: '{base}-poster-{poster_w}.webp', "
              f"colorH: {color_h}, alphaH: {alpha_h}, totalH: {color_h + alpha_h} }},")
    print('Then bump ASSET_VERSION there and the ?v= of site-footer.js in index.html.')


if __name__ == '__main__':
    main()
