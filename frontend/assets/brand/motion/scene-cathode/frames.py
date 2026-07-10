"""Frames pixel pour la scène « Cathode s'allume ».
- 3 frames de coque redessinées (base / squash / stretch) à volume conservé,
  antenne séparée (rotation ressort), LED en overlay.
- Contenu d'écran en demi-pixels (grille 16x12 dans l'aperture 8x6) :
  yeux (5 frames), bouches (6 frames), 4 frames de neige, cœur, zzz.
Tout le phosphore = currentColor pour le zap de chaîne.
"""
import random

W24 = 24

def check24(rows, name):
    for i, r in enumerate(rows):
        if len(r) != W24:
            raise SystemExit(f"{name} row {i} len {len(r)}: {r!r}")
    if len(rows) != 24:
        raise SystemExit(f"{name} has {len(rows)} rows")

E = "." * 24

# ---------------- COQUE (sans antenne, écran sombre, LED éteinte='Z') ----------------
SHELL_BASE = [
    E, E, E, E, E,
    "....KKKKKKKKKKKKKK......",
    "...KWWWWWWWWWWWWWCK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KWCKKKKKKKKKKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKKKKKKKKKKCSK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KSCCCCCCCCAZCSZK.....",
    "...KSSSSSSSSSSSSSZK.....",
    "....KKKKKKKKKKKKKK......",
    ".....KKK......KKK.......",
    ".....KKK......KKK.......",
    E, E,
]
# SQUASH : tête -1px (aperture rows 10-15), rangée C du bas supprimée,
# renflement +1px de chaque côté SOUS l'écran (volume conservé), pattes écartées.
SHELL_SQUASH = [
    E, E, E, E, E, E,
    "....KKKKKKKKKKKKKK......",
    "...KWWWWWWWWWWWWWCK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KWCKKKKKKKKKKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "..KWWCKKKKKKKKKKCSSK....",
    "..KSSCCCCCCCCAZCSZZK....",
    "..KSSSSSSSSSSSSSSZZK....",
    "...KKKKKKKKKKKKKKKK.....",
    "....KKK........KKK......",
    "....KKK........KKK......",
    E, E,
]
# STRETCH : tête +1px plus haut (aperture rows 8-13), une rangée C dupliquée,
# pattes plus étroites (repliées).
SHELL_STRETCH = [
    E, E, E, E,
    "....KKKKKKKKKKKKKK......",
    "...KWWWWWWWWWWWWWCK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KWCKKKKKKKKKKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKbbbbbbbbKCSK.....",
    "...KWCKBBBBBBBBKCSK.....",
    "...KWCKKKKKKKKKKCSK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KWCCCCCCCCCCCCSK.....",
    "...KSCCCCCCCCAZCSZK.....",
    "...KSSSSSSSSSSSSSZK.....",
    "....KKKKKKKKKKKKKK......",
    "......KK......KK........",
    "......KK......KK........",
    E, E,
]
for nm, m in (('base', SHELL_BASE), ('squash', SHELL_SQUASH), ('stretch', SHELL_STRETCH)):
    check24(m, nm)

SHELL_PAL = {
    'K': '#12120f', 'W': '#fff8e8', 'C': '#f2e2c4', 'S': '#cdb894', 'Z': '#a08a60',
    'B': '#0d0d0c', 'b': '#181815', 'A': '#ffb000', 'R': '#ff3333',
}

def rects(rows, pal, ox=0.0, oy=0.0, s=1.0):
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            c = row[x]
            if c in '. ':
                x += 1
                continue
            x0 = x
            while x < len(row) and row[x] == c:
                x += 1
            fill = pal[c]
            out.append(f'<rect x="{ox + x0 * s:g}" y="{oy + y * s:g}" '
                       f'width="{(x - x0) * s:g}" height="{s:g}" fill="{fill}"/>')
    return ''.join(out)

SHELL_FRAMES = {'base': SHELL_BASE, 'squash': SHELL_SQUASH, 'stretch': SHELL_STRETCH}

def shell_svg_inner(prefix='cath'):
    return ''.join(
        f'<g class="{prefix}-sf {prefix}-sf-{n}">{rects(m, SHELL_PAL)}</g>'
        for n, m in SHELL_FRAMES.items())

# ---------------- ANTENNE (séparée, origine base (17,5)) ----------------
def antenna_svg_inner(prefix='cath'):
    stem = ('<rect x="16" y="3" width="1" height="2" fill="#55554a"/>'
            '<rect x="17" y="3" width="1" height="2" fill="#2c2c26"/>')
    ball = ('<rect x="15" y="1" width="1" height="2" fill="#12120f"/>'
            '<rect x="16" y="1" width="2" height="2" fill="#ff3333"/>'
            '<rect x="16" y="1" width="1" height="1" fill="#ff7a66"/>'
            '<rect x="18" y="1" width="1" height="2" fill="#12120f"/>')
    return f'{stem}<g class="{prefix}-ball">{ball}</g>'

# ---------------- CONTENU ÉCRAN : grille 16x12 en demi-pixels ----------------
HP = {
    'P': 'currentColor', 'W': '#f2fff0', 'w': '#cfe9c8',
    'N': '#e9f6e9', 'n': '#93a393', 'K': '#0d0d0c', 'k': '#1c221c',
}

def pad16(rows):
    out = []
    for r in rows:
        if len(r) < 16:
            r = r + '.' * (16 - len(r))
        if len(r) != 16:
            raise SystemExit(f"screen row len {len(r)}: {r!r}")
        out.append(r)
    while len(out) < 12:
        out.append('.' * 16)
    return out

def srects(rows, ox=7.0, oy=9.0):
    return rects(pad16(rows), HP, ox, oy, 0.5)

BLANK = []
EYES = {
    'open': [
        "................", "................",
        "..PP........PP..",
        "..PP........PP..",
        "..PP........PP..",
    ],
    'half': [
        "................", "................", "................",
        "..PP........PP..",
        "..PP........PP..",
    ],
    'shut': [
        "................", "................", "................", "................",
        ".PPP........PPP.",
    ],
    'wide': [
        "................",
        ".PPPP......PPPP.",
        ".PWPP......PPWP.",
        ".PPPP......PPPP.",
        ".PPPP......PPPP.",
    ],
    'happy': [
        "................", "................",
        "..PP........PP..",
        ".P..P......P..P.",
    ],
}
MOUTHS = {
    'smile': [
        "................", "................", "................", "................",
        "................", "................", "................", "................",
        "..PP........PP..",
        "..PP........PP..",
        "....PPPPPPPP....",
        "....PPPPPPPP....",
    ],
    'grin': [
        "................", "................", "................", "................",
        "................", "................", "................",
        ".PP..........PP.",
        "..PP........PP..",
        "...PPPPPPPPPP...",
        "....PPPPPPPP....",
        ".....PPPPPP.....",
    ],
    'o': [
        "................", "................", "................", "................",
        "................", "................", "................", "................",
        ".......PP.......",
        "......P..P......",
        ".......PP.......",
    ],
    'flat': [
        "................", "................", "................", "................",
        "................", "................", "................", "................",
        "................",
        ".....PPPPPP.....",
    ],
    'wavy': [
        "................", "................", "................", "................",
        "................", "................", "................", "................",
        "......PP..PP....",
        "....PP..PP......",
    ],
    'sleep': [
        "................", "................", "................", "................",
        "................", "................", "................", "................",
        "................",
        "......PPPP......",
    ],
}

HEART = [
    ".......P.P......",
    "......PWPPP.....",
    ".......PPP......",
    "........P.......",
]
ZGLYPH_A = [  # z à cols 7-9, rows 4-6
    "................", "................", "................", "................",
    ".......PPP......",
    "........P.......",
    ".......PPP......",
]
ZGLYPH_B = [  # z à cols 10-12, rows 5-7
    "................", "................", "................", "................",
    "................",
    "..........PPP...",
    "...........P....",
    "..........PPP...",
]

def make_static(seed):
    rng = random.Random(seed)
    rows = []
    for y in range(12):
        row = ''.join(rng.choice('KKKkNnKKwKkK') for _ in range(16))
        rows.append(row)
    return rows

STATIC = {f'n{i+1}': make_static(70 + i * 13) for i in range(4)}

def eyes_svg_inner(prefix='cath'):
    return ''.join(f'<g class="{prefix}-ef {prefix}-ef-{n}">{srects(m)}</g>'
                   for n, m in EYES.items())

def mouth_svg_inner(prefix='cath'):
    return ''.join(f'<g class="{prefix}-mf {prefix}-mf-{n}">{srects(m)}</g>'
                   for n, m in MOUTHS.items())

def static_svg_inner(prefix='cath'):
    out = []
    for n, m in STATIC.items():
        out.append(f'<g class="{prefix}-nf {prefix}-nf-{n}">'
                   f'<rect x="7" y="9" width="8" height="6" fill="#10130f"/>'
                   f'{srects(m)}</g>')
    return ''.join(out)

if __name__ == '__main__':
    print('shell frames ok, screen frames:', ', '.join(EYES), '|', ', '.join(MOUTHS))
