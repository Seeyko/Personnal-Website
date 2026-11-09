#!/usr/bin/env python3
"""Die-cut sticker pipeline for the /things page.

Reads tools/stickers/sources.json, and for every item:
  source (URL, local file or iconify logo) -> background removal -> trim
  -> die-cut sticker render (white paper contour, paper grain, edge shading)
  -> frontend/assets/things/{id}.webp (transparent, 800x600, < 120 KB)

Usage:
  python tools/stickers/make_stickers.py                 # every item in sources.json
  python tools/stickers/make_stickers.py --only go ps4   # some items
  python tools/stickers/make_stickers.py --sheet out.png # also write a contact sheet
  python tools/stickers/make_stickers.py --set-json      # also set "image" in fr/en things.json

See README.md in this folder. Downloads are cached in --cache-dir (default
tools/stickers/.cache, gitignored), so re-runs are cheap and idempotent.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

try:
    import cv2
except ImportError:  # pragma: no cover
    sys.exit("opencv-python-headless is required: pip install -r tools/stickers/requirements.txt")

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT_DIR = REPO / "frontend" / "assets" / "things"
DATA_FILES = [REPO / "frontend" / "data" / lang / "things.json" for lang in ("fr", "en")]
UA = "tomandrieu-stickers/1.0 (+https://tomandrieu.com; personal portfolio)"

# Output geometry (final pixels). Everything is rendered at SS x and downsampled.
W, H = 800, 600
SS = 2
BORDER = 30          # die-cut white contour thickness, same for every item
MARGIN = 14          # transparent breathing room around the cut line
MAX_BYTES = 120_000
COVERAGE = 0.40      # max share of the inner box a silhouette may fill (keeps blocky items from looking huge)

PAPER = np.array([251, 250, 246], np.float32)  # very slightly warm off-white


# ─── Sources ──────────────────────────────────────────────────────────────────

def fetch(url: str, cache: Path) -> bytes:
    cache.mkdir(parents=True, exist_ok=True)
    ext = Path(url.split("?")[0]).suffix[:6] or ".bin"
    path = cache / (hashlib.sha1(url.encode()).hexdigest()[:16] + ext)
    if path.exists() and path.stat().st_size > 0:
        return path.read_bytes()
    last = None
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*,*/*"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            path.write_bytes(data)
            return data
        except Exception as e:  # noqa: BLE001 - retry on anything network-ish
            last = e
            code = getattr(e, "code", None)
            if code in (403, 404, 410):
                break
            # Wikimedia answers 429 when requests come too fast: back off politely
            time.sleep((15 if code == 429 else 5) * (attempt + 1))
    raise RuntimeError(f"download failed: {url}: {last}")


def iconify_svg(ref: str, cache: Path) -> str:
    """ref = 'iconify:<set>:<name>' -> standalone SVG markup, from the npm package @iconify-json/<set>."""
    _, prefix, name = ref.split(":", 2)
    js = cache / f"iconify-{prefix}.json"
    if not js.exists():
        meta = json.loads(fetch(f"https://registry.npmjs.org/@iconify-json/{prefix}/latest", cache / "npm-meta"))
        tgz = fetch(meta["dist"]["tarball"], cache / "npm")
        with tarfile.open(fileobj=io.BytesIO(tgz)) as tf:
            js.write_bytes(tf.extractfile("package/icons.json").read())
    data = json.loads(js.read_text())
    icon = data["icons"].get(name)
    if icon is None and name in data.get("aliases", {}):
        icon = {**data["icons"][data["aliases"][name]["parent"]], **data["aliases"][name]}
    if icon is None:
        raise RuntimeError(f"iconify icon not found: {ref}")
    w = icon.get("width", data.get("width", 16))
    h = icon.get("height", data.get("height", 16))
    left, top = icon.get("left", 0), icon.get("top", 0)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'viewBox="{left} {top} {w} {h}" width="{w}" height="{h}">{icon["body"]}</svg>')


def render_svg(svg: str, long_side: int = 1800) -> Image.Image:
    import resvg_py  # lazy: only needed for vector sources
    import re
    m = re.search(r'viewBox="[^"]*?([\d.]+) ([\d.]+)"', svg)
    w, h = (float(m.group(1)), float(m.group(2))) if m else (1, 1)
    kw = {"width": long_side} if w >= h else {"height": long_side}
    png = resvg_py.svg_to_bytes(svg_string=svg, **kw)
    return Image.open(io.BytesIO(bytes(png))).convert("RGBA")


def compose_layers(spec: dict, cache: Path) -> Image.Image:
    """Build the source from several (already transparent) images.

    spec["compose"] = {"size": [W, H], "layers": [{"source", "crop"?, "box": [x0, y0, x1, y1]}, ...]}
    Each layer is cropped (fractions), trimmed to its alpha, fitted inside its box (fractions of
    the canvas, aspect kept, bottom-centred) and pasted in order, later layers on top.
    """
    comp = spec["compose"]
    W, H = comp.get("size", [1600, 1200])
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for layer in comp["layers"]:
        im = load_source(layer, cache)
        if "crop" in layer:
            x0, y0, x1, y1 = layer["crop"]
            im = im.crop((round(x0 * im.width), round(y0 * im.height), round(x1 * im.width), round(y1 * im.height)))
        bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        bx0, by0, bx1, by1 = layer["box"]
        bw, bh = (bx1 - bx0) * W, (by1 - by0) * H
        s = min(bw / im.width, bh / im.height)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        x = round(bx0 * W + (bw - im.width) / 2)
        y = round(by1 * H - im.height)
        canvas.alpha_composite(im, (x, y))
    return canvas


def load_source(spec: dict, cache: Path) -> Image.Image:
    if "compose" in spec:
        return compose_layers(spec, cache)
    src = spec["source"]
    if src.startswith("iconify:"):
        svg = iconify_svg(src, cache)
        if spec.get("color"):  # recolour single-colour marks (currentColor / one fill)
            import re
            svg = re.sub(r'fill="(?!none)[^"]*"', f'fill="{spec["color"]}"', svg)
            svg = svg.replace("currentColor", spec["color"])
        return render_svg(svg)
    if src.startswith(("http://", "https://")):
        data = fetch(src, cache / "src")
    else:
        p = (HERE / src) if not os.path.isabs(src) else Path(src)
        data = p.read_bytes()
    if data[:5] == b"<?xml" or b"<svg" in data[:512]:
        return render_svg(data.decode("utf-8", "replace"))
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGBA")


# ─── Matting ──────────────────────────────────────────────────────────────────

_SESSIONS: dict = {}


def matte_rembg(img: Image.Image, model: str, cache: Path) -> np.ndarray:
    os.environ.setdefault("U2NET_HOME", str(cache / "models"))
    from rembg import new_session, remove  # lazy import: heavy
    if model not in _SESSIONS:
        _SESSIONS[model] = new_session(model)
    rgb = img.convert("RGB")
    # isnet works at 1024; feed a bounded size and upscale the mask back.
    scale = min(1.0, 2048 / max(rgb.size))
    small = rgb.resize((round(rgb.width * scale), round(rgb.height * scale)), Image.LANCZOS) if scale < 1 else rgb
    mask = remove(small, session=_SESSIONS[model], only_mask=True, post_process_mask=False)
    mask = mask.resize(rgb.size, Image.LANCZOS)
    return np.asarray(mask, np.float32) / 255.0


def matte_white(img: Image.Image, tol: float) -> np.ndarray:
    """Key out a near-white background connected to the image border."""
    a = np.asarray(img.convert("RGB"), np.float32)
    dist = 255.0 - a.min(axis=2)               # 0 for pure white
    bg = (dist < tol).astype(np.uint8)
    n, lab = cv2.connectedComponents(bg, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(border))
    # soft ramp on the band just inside the cut, so edges are anti-aliased
    alpha = np.clip((dist - tol * 0.35) / (tol * 0.9), 0, 1)
    alpha[~outside] = 1.0
    return alpha


def clean_alpha(alpha: np.ndarray, keep: str, erode: int, fill_holes: bool, opening: int = 0) -> np.ndarray:
    hard = (alpha > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, connectivity=8)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        biggest = areas.max()
        if keep == "largest":
            ok = [1 + int(np.argmax(areas))]
        else:  # drop specks
            ok = [i + 1 for i, a in enumerate(areas) if a >= biggest * 0.004]
        keepmask = np.isin(lab, ok)
        # include soft edge pixels next to kept components
        keepmask = cv2.dilate(keepmask.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        alpha = alpha * keepmask
    if fill_holes:
        alpha = np.maximum(alpha, holes(alpha > 0.5).astype(np.float32))
    if opening > 0:  # cut thin spurs (shadow drips, cables) off the silhouette
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * opening + 1, 2 * opening + 1))
        alpha = np.minimum(alpha, cv2.dilate(cv2.erode(alpha, k), k))
    if erode > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * erode + 1, 2 * erode + 1))
        alpha = cv2.erode(alpha, k)
    alpha[alpha < 0.03] = 0
    return alpha


def holes(mask: np.ndarray) -> np.ndarray:
    """Pixels enclosed by mask (not reachable from the image border)."""
    m = mask.astype(np.uint8)
    h, w = m.shape
    pad = np.zeros((h + 2, w + 2), np.uint8)
    pad[1:-1, 1:-1] = m
    ff = pad.copy()
    cv2.floodFill(ff, np.zeros((h + 4, w + 4), np.uint8), (0, 0), 1)
    return (ff[1:-1, 1:-1] == 0)


# ─── Sticker render ───────────────────────────────────────────────────────────

def place(rgba: np.ndarray, spec: dict) -> np.ndarray:
    """Trim, scale and center the cut-out on the SS-sized canvas. Returns float RGBA (premultiplied)."""
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha > 0.04)
    if len(xs) == 0:
        raise RuntimeError("empty matte")
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = rgba[y0:y1, x0:x1]
    ch, cw = crop.shape[:2]
    bw = (W - 2 * (BORDER + MARGIN)) * SS
    bh = (H - 2 * (BORDER + MARGIN)) * SS
    s = min(bw / cw, bh / ch)
    coverage = float((crop[..., 3] > 0.5).sum()) * s * s / (bw * bh)
    if coverage > COVERAGE:
        s *= (COVERAGE / coverage) ** 0.5
    s *= float(spec.get("scale", 1.0))
    nw, nh = max(1, round(cw * s)), max(1, round(ch * s))
    pm = crop.copy()
    pm[..., :3] *= pm[..., 3:4]
    interp = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
    pm = cv2.resize(pm, (nw, nh), interpolation=interp)
    pm = np.clip(pm, 0, 1)
    canvas = np.zeros((H * SS, W * SS, 4), np.float32)
    ox = (W * SS - nw) // 2 + round(float(spec.get("dx", 0)) * SS)
    oy = (H * SS - nh) // 2 + round(float(spec.get("dy", 0)) * SS)
    canvas[oy:oy + nh, ox:ox + nw] = pm
    return canvas


def die_cut(art_alpha: np.ndarray, bridge: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Smooth, rounded contour BORDER px outside the silhouette (anti-aliased, float 0..1).

    Separate parts (e.g. the Tailscale dots) are bridged into one piece of paper,
    like a real die-cut sticker: closing with growing radius, then convex hull as a last resort.
    """
    r = BORDER * SS
    solid = (art_alpha > 0.35)
    solid = solid | holes(solid)
    d = cv2.distanceTransform((~solid).astype(np.uint8), cv2.DIST_L2, 5)
    grown = (d <= r).astype(np.uint8)
    k = r * bridge
    for _ in range(4):
        if cv2.connectedComponents(grown, connectivity=8)[0] <= 2:
            break
        kk = int(k) * 2 + 1
        ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kk, kk))
        grown = cv2.morphologyEx(grown, cv2.MORPH_CLOSE, ker)
        k *= 1.6
    if cv2.connectedComponents(grown, connectivity=8)[0] > 2:
        pts = cv2.findNonZero(grown)
        hull = cv2.convexHull(pts)
        cv2.fillConvexPoly(grown, hull, 1)
    # blur + threshold rounds concave corners and irons out jaggies of the silhouette
    soft = cv2.GaussianBlur(grown.astype(np.float32), (0, 0), r * 0.5, borderType=cv2.BORDER_CONSTANT)
    cut = (soft > 0.45).astype(np.uint8)
    cut = cut | holes(cut > 0).astype(np.uint8)
    cut = np.maximum(cut, solid.astype(np.uint8))
    # anti-aliased edge from the signed distance of the binary cut
    inside = cv2.distanceTransform(cut, cv2.DIST_L2, 5)
    outside = cv2.distanceTransform(1 - cut, cv2.DIST_L2, 5)
    sd = inside - outside
    return np.clip(sd / (SS * 0.8) + 0.5, 0, 1), inside


def paper_layer(cut: np.ndarray, inside: np.ndarray, seed: int) -> np.ndarray:
    h, w = cut.shape
    rng = np.random.default_rng(seed)
    grain = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 0.8) * 2.2
    mottle = cv2.GaussianBlur(rng.normal(0, 1, (h // 16 + 1, w // 16 + 1)).astype(np.float32), (0, 0), 1.2)
    mottle = cv2.resize(mottle, (w, h), interpolation=cv2.INTER_CUBIC) * 3.0
    base = PAPER[None, None, :] + (grain + mottle)[..., None]

    # Edge shading: the cut edge is a thin bevel lit from the top-left, so the
    # border reads as thick paper (bright lip on the lit side, soft falloff on the other).
    r = BORDER * SS
    band = np.clip(1 - inside / (r * 0.28), 0, 1) ** 1.4
    blur = cv2.GaussianBlur(cut.astype(np.float32), (0, 0), r * 0.18, borderType=cv2.BORDER_CONSTANT)
    gx = cv2.Sobel(blur, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blur, cv2.CV_32F, 0, 1, ksize=3)
    norm = np.sqrt(gx * gx + gy * gy) + 1e-6
    # outward normal = -grad; light comes from the top-left (-x, -y)
    lx, ly = -0.55, -0.83
    lit = (-gx / norm) * lx + (-gy / norm) * ly
    shade = band * (np.where(lit > 0, 6.0 * lit, 26.0 * lit) - 6.0)
    # a hair-thin darker rim right at the cut so white-on-white still separates
    rim = np.clip(1 - inside / (SS * 1.4), 0, 1) * -22.0
    rgb = base + (shade + rim)[..., None]

    # laminate: faint diagonal sheen, brighter top-left
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sheen = ((1 - (xx / w * 0.6 + yy / h * 0.4)) - 0.5) * 3.0
    rgb = rgb + sheen[..., None]
    return np.clip(rgb, 0, 255) / 255.0


def warp_quad(rgba: np.ndarray, quad, aspect: float) -> np.ndarray:
    """Perspective-correct 4 corners (fractions: TL, TR, BR, BL) into an upright rectangle."""
    hh, ww = rgba.shape[:2]
    src = np.float32([[x * ww, y * hh] for x, y in quad])
    qw = int(max(np.linalg.norm(src[1] - src[0]), np.linalg.norm(src[2] - src[3])))
    qh = int(qw * float(aspect))
    dst = np.float32([[0, 0], [qw, 0], [qw, qh], [0, qh]])
    m = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(rgba, m, (qw, qh), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return np.clip(out, 0, 1)


def flatten_fabric(rgba: np.ndarray, alpha: np.ndarray, opt: dict) -> np.ndarray:
    """Even out stains on a light, low-saturation surface (e.g. a cream seat) inside the matte.

    Pixels brighter than min_v and less saturated than max_s form the region; its low-frequency
    colour (normalised Gaussian, sigma as a fraction of the width) is replaced by the region's
    median colour, so blotches vanish while the fine weave and edge shading (keep) remain.
    """
    rgb = rgba[..., :3]
    hsv = cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32) / 255
    region = (alpha > 0.5) & (hsv[..., 2] > float(opt.get("min_v", 0.55))) & (hsv[..., 1] < float(opt.get("max_s", 0.3)))
    region = cv2.morphologyEx(region.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(region, connectivity=8)
    if n <= 1:
        return rgba
    region = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.float32)
    region = np.maximum(region, holes(region > 0.5).astype(np.float32))
    sigma = float(opt.get("sigma", 0.03)) * rgb.shape[1]
    w = cv2.GaussianBlur(region, (0, 0), sigma) + 1e-6
    low = cv2.GaussianBlur(rgb * region[..., None], (0, 0), sigma) / w[..., None]
    target = np.median(rgb[region > 0.5], axis=0)
    if "color" in opt:
        target = np.float32(opt["color"]) / 255
    keep = float(opt.get("keep", 0.25))
    if "detail" in opt:  # keep only the fine weave (high-pass, px) on top of the smoothed shading
        hp = rgb - cv2.GaussianBlur(rgb, (0, 0), float(opt["detail"]))
        fixed = target + keep * (low - target) + hp
    else:
        fixed = rgb - low + (target + keep * (low - target))
    soft = cv2.GaussianBlur(region, (0, 0), 2.0)[..., None]  # feather the boundary
    out = rgba.copy()
    out[..., :3] = np.clip(rgb * (1 - soft) + fixed * soft, 0, 1)
    return out


def book_depth(rgba: np.ndarray, depth: float) -> np.ndarray:
    """Give a flat cover some volume: cream page edges below/right, a darker back board, spine shading."""
    hh, ww = rgba.shape[:2]
    d = max(4, round(depth * ww))
    out = np.zeros((hh + d, ww + d, 4), np.float32)
    # back board, shifted by d
    out[d:d + hh, d:d + ww, :3] = rgba[..., :3].mean(axis=(0, 1)) * 0.45
    out[d:d + hh, d:d + ww, 3] = rgba[..., 3]
    # page block, shifted by ~2/3 d, with fine horizontal/vertical page lines
    p = round(d * 0.7)
    yy, xx = np.mgrid[0:hh, 0:ww]
    lines = 0.93 + 0.05 * np.sin((xx + yy) * 2.1)
    page = np.stack([0.96 * lines, 0.94 * lines, 0.88 * lines], -1).astype(np.float32)
    out[p:p + hh, p:p + ww, :3] = np.where(rgba[..., 3:4] > 0, page, out[p:p + hh, p:p + ww, :3])
    out[p:p + hh, p:p + ww, 3] = np.maximum(out[p:p + hh, p:p + ww, 3], rgba[..., 3])
    # cover on top, with a soft hinge shade near the spine (left) and a faint edge highlight
    cov = rgba.copy()
    x = np.linspace(0, 1, ww, dtype=np.float32)[None, :, None]
    shade = 1 - 0.22 * np.exp(-((x - 0.035) / 0.012) ** 2) - 0.10 * np.clip(1 - x / 0.03, 0, 1)
    cov[..., :3] = np.clip(cov[..., :3] * shade, 0, 1)
    a = cov[..., 3:4]
    out[:hh, :ww, :3] = cov[..., :3] * a + out[:hh, :ww, :3] * (1 - a)
    out[:hh, :ww, 3] = np.maximum(out[:hh, :ww, 3], cov[..., 3])
    return out


def deck_mask(hh: int, ww: int) -> np.ndarray:
    """Skateboard deck seen flat (vertical): rectangle with round nose and tail, anti-aliased."""
    ss = 4
    m = np.zeros((hh * ss, ww * ss), np.uint8)
    r = ww * ss // 2
    cv2.rectangle(m, (0, r), (ww * ss - 1, hh * ss - 1 - r), 255, -1)
    cv2.ellipse(m, (ww * ss // 2, r), (ww * ss // 2, r), 0, 180, 360, 255, -1)
    cv2.ellipse(m, (ww * ss // 2, hh * ss - 1 - r), (ww * ss // 2, r), 0, 0, 180, 255, -1)
    return cv2.resize(m.astype(np.float32) / 255, (ww, hh), interpolation=cv2.INTER_AREA)


def deck_fan(rgba: np.ndarray, parts: list) -> np.ndarray:
    """Cut several decks out of one photo and lay them side by side, slightly fanned."""
    decks = []
    for part in parts:
        d = warp_quad(rgba, part["quad"], part.get("aspect", 3.9))
        d[..., 3] = deck_mask(*d.shape[:2])
        h0 = 1400
        d = cv2.resize(d, (round(d.shape[1] * h0 / d.shape[0]), h0), interpolation=cv2.INTER_AREA)
        im = Image.fromarray((np.clip(d, 0, 1) * 255).astype(np.uint8), "RGBA")
        im = im.rotate(float(part.get("tilt", 0)), resample=Image.BICUBIC, expand=True)
        decks.append(im)
    gap = -int(decks[0].width * 0.08)
    W_ = sum(d.width for d in decks) + gap * (len(decks) - 1)
    H_ = max(d.height for d in decks)
    canvas = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    x = 0
    for d in decks:
        canvas.alpha_composite(d, (x, (H_ - d.height) // 2))
        x += d.width + gap
    return np.asarray(canvas, np.float32) / 255.0


def render(spec: dict, img: Image.Image, cache: Path, item_id: str) -> Image.Image:
    rgba = np.asarray(img, np.float32) / 255.0
    if "crop" in spec:  # fractions [x0, y0, x1, y1]
        hh, ww = rgba.shape[:2]
        x0, y0, x1, y1 = spec["crop"]
        rgba = rgba[round(y0 * hh):round(y1 * hh), round(x0 * ww):round(x1 * ww)]
        img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    if spec.get("trim_white"):  # drop near-white margins around a scanned/photographed cover
        m = rgba[..., :3].mean(axis=2) < 0.94
        ys, xs = np.where(m)
        rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    if "inpaint" in spec:  # erase overlays (badges, text) given as [x0, y0, x1, y1] fractions of the crop
        hh, ww = rgba.shape[:2]
        m = np.zeros((hh, ww), np.uint8)
        for x0, y0, x1, y1 in spec["inpaint"]:
            m[round(y0 * hh):round(y1 * hh), round(x0 * ww):round(x1 * ww)] = 255
        rgb = cv2.inpaint((rgba[..., :3] * 255).astype(np.uint8), m, 9, cv2.INPAINT_NS).astype(np.float32) / 255
        soft = cv2.GaussianBlur(cv2.dilate(m, np.ones((15, 15), np.uint8)).astype(np.float32) / 255, (0, 0), 6)[..., None]
        rgb = rgb * (1 - soft) + cv2.GaussianBlur(rgb, (0, 0), 12) * soft  # smooth the fill
        rgba = rgba.copy()
        rgba[..., :3] = rgb
        img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    if "quad" in spec:  # perspective fix: 4 corners (fractions) TL, TR, BR, BL -> upright rectangle
        rgba = warp_quad(rgba, spec["quad"], spec.get("quad_aspect", 1.0))
        img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    if "decks" in spec:  # several decks from one photo, composed as a small fan
        rgba = deck_fan(rgba, spec["decks"])
        img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")

    mode = spec.get("matte", "auto")
    if mode == "auto":
        mode = "alpha" if (rgba[..., 3] < 0.5).mean() > 0.02 else "rembg"
    if mode == "alpha":
        alpha = rgba[..., 3].copy()
        if spec.get("alpha_min"):  # drop a faint baked-in watermark / haze below this opacity
            m = float(spec["alpha_min"])
            alpha = np.clip((alpha - m) / (1 - m), 0, 1)
    elif mode == "white":
        alpha = matte_white(img, float(spec.get("tol", 22)))
        alpha = np.minimum(alpha, rgba[..., 3])
    elif mode == "rembg":
        alpha = matte_rembg(img, spec.get("model", "isnet-general-use"), cache)
    elif mode == "deck":  # skateboard deck seen flat: rectangle with round nose and tail
        alpha = deck_mask(*rgba.shape[:2])
    elif mode == "poly":  # hand-traced outline: list of polygons in fractions of the (cropped) image
        hh, ww = rgba.shape[:2]
        ss = 4
        m = np.zeros((hh * ss, ww * ss), np.uint8)
        for poly in spec["polys"]:
            cv2.fillPoly(m, [np.int32([[x * ww * ss, y * hh * ss] for x, y in poly])], 255, lineType=cv2.LINE_AA)
        alpha = cv2.resize(m.astype(np.float32) / 255, (ww, hh), interpolation=cv2.INTER_AREA)
    elif mode == "none":
        alpha = np.ones(rgba.shape[:2], np.float32)
    else:
        raise ValueError(f"unknown matte mode {mode}")
    if "add_polys" in spec:  # hand-traced parts the matte missed (polygons, fractions), merged into the alpha
        hh, ww = alpha.shape
        ss = 4
        m = np.zeros((hh * ss, ww * ss), np.uint8)
        for poly in spec["add_polys"]:
            cv2.fillPoly(m, [np.int32([[x * ww * ss, y * hh * ss] for x, y in poly])], 255, lineType=cv2.LINE_AA)
        alpha = np.maximum(alpha, cv2.resize(m.astype(np.float32) / 255, (ww, hh), interpolation=cv2.INTER_AREA))
    if "add_ellipses" in spec:  # parts the matte missed: [cx, cy, rx, ry] fractions, merged into the alpha
        hh, ww = alpha.shape
        ss = 4
        m = np.zeros((hh * ss, ww * ss), np.uint8)
        for cx, cy, rx, ry in spec["add_ellipses"]:
            cv2.ellipse(m, (round(cx * ww * ss), round(cy * hh * ss)), (round(rx * ww * ss), round(ry * hh * ss)), 0, 0, 360, 255, -1)
        alpha = np.maximum(alpha, cv2.resize(m.astype(np.float32) / 255, (ww, hh), interpolation=cv2.INTER_AREA))
    alpha = clean_alpha(alpha, spec.get("keep", "all"), int(spec.get("erode", 1 if mode == "rembg" else 0)),
                        bool(spec.get("fill_holes", False)), int(spec.get("open", 0)))
    if spec.get("shape") == "ellipse":  # round objects: replace a ragged matte by its fitted ellipse
        cs, _ = cv2.findContours((alpha > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        (cx, cy), (ew, eh), ang = cv2.fitEllipse(max(cs, key=cv2.contourArea))
        k = float(spec.get("shape_shrink", 0.0))
        ss = 4
        m = np.zeros((alpha.shape[0] * ss, alpha.shape[1] * ss), np.uint8)
        cv2.ellipse(m, ((cx * ss, cy * ss), (ew * ss * (1 - k), eh * ss * (1 - k)), ang), 255, -1)
        alpha = cv2.resize(m.astype(np.float32) / 255, alpha.shape[::-1], interpolation=cv2.INTER_AREA)
    if "flatten" in spec:  # clean stains off a light fabric (e.g. a cream seat)
        rgba = flatten_fabric(rgba, alpha, spec["flatten"])
    rgba = rgba.copy()
    rgba[..., 3] = alpha
    if spec.get("book"):  # front cover -> book: page block peeking out right and bottom, soft spine shade
        rgba = book_depth(rgba, float(spec["book"]) if not isinstance(spec["book"], bool) else 0.03)
    if spec.get("rotate"):  # after matting, so the turned corners stay transparent
        pm = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
        pm = pm.rotate(float(spec["rotate"]), resample=Image.BICUBIC, expand=True)
        rgba = np.asarray(pm, np.float32) / 255.0

    art = place(rgba, spec)                   # premultiplied
    cut, inside = die_cut(art[..., 3], float(spec.get("bridge", 1.0)))
    seed = int(hashlib.sha1(item_id.encode()).hexdigest()[:8], 16)
    paper = paper_layer(cut, inside, seed)

    a = art[..., 3:4]
    rgb = art[..., :3] + paper * (1 - a)      # art (premultiplied) over paper
    out_a = np.maximum(cut, art[..., 3])
    pm = np.dstack([rgb * out_a[..., None], out_a])
    # downsample premultiplied, then un-premultiply
    pm = cv2.resize(pm, (W, H), interpolation=cv2.INTER_AREA)
    alpha_f = pm[..., 3:4]
    rgb_f = np.where(alpha_f > 1e-4, pm[..., :3] / np.maximum(alpha_f, 1e-4), 0)
    out = np.dstack([np.clip(rgb_f, 0, 1), np.clip(alpha_f, 0, 1)])
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def save_webp(img: Image.Image, path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    for q in (88, 84, 80, 75, 70, 64, 58):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, alpha_quality=100, method=6)
        if buf.tell() <= MAX_BYTES:
            break
    path.write_bytes(buf.getvalue())
    return buf.tell()


# ─── JSON update (safe against concurrent edits) ─────────────────────────────

def set_images(ids: list[str]) -> None:
    for f in DATA_FILES:
        data = json.loads(f.read_text(encoding="utf-8"))   # re-read right before writing
        changed = 0
        for item in data.get("items", []):
            if item.get("id") in ids:
                val = f"/assets/things/{item['id']}.webp"
                if item.get("image") != val:
                    item["image"] = val
                    changed += 1
        if changed:
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  {f.relative_to(REPO)}: {changed} image field(s) set")


def contact_sheet(ids: list[str], path: Path) -> None:
    cols = 6
    tw, th = 300, 225
    rows = (len(ids) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (230, 238, 236))
    for i, item_id in enumerate(ids):
        p = OUT_DIR / f"{item_id}.webp"
        if not p.exists():
            continue
        tile = Image.new("RGB", (tw, th), (226 + (i % 2) * 8, 236, 232 - (i % 3) * 6))
        st = Image.open(p).convert("RGBA").resize((tw - 30, th - 22), Image.LANCZOS)
        tile.paste(st, (15, 11), st)
        sheet.paste(tile, ((i % cols) * tw, (i // cols) * th))
    sheet.save(path)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", nargs="*", help="item ids to (re)build")
    ap.add_argument("--manifest", default=str(HERE / "sources.json"))
    ap.add_argument("--cache-dir", default=str(HERE / ".cache"))
    ap.add_argument("--out-dir", default=str(OUT_DIR))
    ap.add_argument("--sheet", help="write a contact sheet PNG of the outputs")
    ap.add_argument("--set-json", action="store_true", help='set "image" on built items in fr/en things.json')
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    items = manifest["items"]
    ids = args.only or [k for k in items if not k.startswith("_")]
    cache = Path(args.cache_dir)
    out_dir = Path(args.out_dir)
    done, failed = [], []
    for item_id in ids:
        spec = items.get(item_id)
        if not spec or not spec.get("source"):
            failed.append((item_id, "no source in manifest"))
            print(f"✗ {item_id}: no source in manifest")
            continue
        try:
            img = load_source(spec, cache)
            st = render(spec, img, cache, item_id)
            size = save_webp(st, out_dir / f"{item_id}.webp")
            done.append(item_id)
            print(f"✓ {item_id}: {size / 1024:.1f} KB")
        except Exception as e:  # noqa: BLE001 - report and continue with the others
            failed.append((item_id, str(e)))
            print(f"✗ {item_id}: {e}")
    if args.sheet:
        contact_sheet(ids, Path(args.sheet))
    if args.set_json and done:
        set_images(done)
    if failed:
        print("\nFailed:", ", ".join(f"{i} ({r})" for i, r in failed))
        sys.exit(1 if not done else 0)


if __name__ == "__main__":
    main()
