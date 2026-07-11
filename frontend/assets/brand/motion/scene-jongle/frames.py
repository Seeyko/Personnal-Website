"""Frames pixel redessinées pour la scène « La jongle du cœur ».
Blip : 11 poses complètes (déformations dessinées en pixels, pas en transform).
Cœur : 3 frames (normal / squash / stretch) à volume ~conservé (26-28 cellules).
"""
import sys
LAB = '/tmp/claude-0/-home-user-Personnal-Website/66c4dd44-f8bb-56c7-87cd-bde1f5775501/scratchpad/motion-lab'
sys.path.insert(0, LAB)
from maps import BLIP, BLIP_PAL, scan

W24 = 24

def pad(rows):
    """complète chaque rangée à 24 chars et vérifie."""
    out = []
    for i, r in enumerate(rows):
        if len(r) < W24:
            r = r + '.' * (W24 - len(r))
        if len(r) != W24:
            raise SystemExit(f"row {i} len {len(r)}: {r!r}")
        out.append(r)
    while len(out) < 24:
        out.append('.' * W24)
    return out

# ---------------- BLIP FRAMES ----------------
# base = BLIP (yeux mi-hauteur, smirk) -> STAND_MID
STAND_MID = pad(list(BLIP))

def swap_rows(base, repl):
    rows = list(base)
    for y, r in repl.items():
        rows[y] = r
    return pad(rows)

# yeux vers le HAUT : encre en haut du bloc-œil, blanc dessous
STAND_UP = swap_rows(BLIP, {
    11: "......KLGEEGGEEGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGWWGGWWGDK......",
})

# blink : paupières descendent en 2 étapes
BLINK_HALF = swap_rows(BLIP, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGEEGGEEGDK......",
})
BLINK_FULL = swap_rows(BLIP, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGGGGGGGGDK......",
    13: "......KLGEEGGEEGDK......",
})

# ALARM : yeux écarquillés (blanc au-dessus), bouche grande ouverte
ALARM = swap_rows(BLIP, {
    11: "......KLGWWGGWWGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGEEGGEEGDK......",
    15: "......KLGGEEEGGGDK......",
    16: "......KLGGEEEGGGDK......",
})

# RUN : regard vers le haut-droite (pupilles à droite), bouche o inquiète
_RUN_FACE = {
    11: "......KLGWEGGWEGK.......",
    12: "......KLGWEGGWEGDK......",
    13: "......KLGWWGGWWGDK......",
    15: "......KLGGEEGGGGDK......",
    16: "......KLGGEEGGGGDK......",
}
RUN1 = swap_rows(BLIP, {**_RUN_FACE,
    21: ".......KKK.....KKK......",
    22: "...............KKK......",
})
RUN2 = swap_rows(BLIP, {**_RUN_FACE,
    21: ".........KKK..KKK.......",
    22: ".........KKK............",
})

# RELIEF : yeux fermés heureux ^ ^, double blush, grand sourire
RELIEF = swap_rows(BLIP, {
    11: "......KLGEGGGGEGK.......",
    12: "......KLEGEGGEGEDK......",
    13: "......KLGGGGGGGGDK......",
    14: "......KLAAGGGGAADK......",
    15: "......KLEGGGGGEGDK......",
    16: "......KLGEEEEEGGDK......",
})

# CROUCH : tassé de 2px, élargi de 1px de chaque côté en bas,
# triangle raccourci d'1 rangée, yeux 2 rangées (plissés), pattes écartées courtes
CROUCH = pad([
    "........................",
    "........................",
    "........................",
    "......K.................",
    "......KK................",
    "......KWK...............",
    "......KWWK..............",
    "......KLLWK.............",
    "......KLGLWK............",
    "......KLGGLWK...........",
    "......KLGGGLWK..........",
    "......KLGGGGGLWK........",
    "......KLGEEGGEEGK.......",
    "......KLGEEGGEEGDK......",
    "......KLAGGGGGAGDK......",
    "......KLGGGGGEGGDK......",
    "......KLGEEEEGGGDK......",
    ".....KLGGGGGGGGGDDK.....",
    ".....KLGDGDGDGDGDZK.....",
    ".....KGDDDDDDDDDZZK.....",
    ".....KKKKKKKKKKKKKK.....",
    ".......KKK......KKK.....",
    ".......KKK......KKK.....",
    "........................",
])

# CROUCH_DEEP : tassé de 3px, très large en bas, yeux serrés (1 rangée),
# bouche pressée (effort), pattes très écartées
CROUCH_DEEP = pad([
    "........................",
    "........................",
    "........................",
    "........................",
    "......K.................",
    "......KK................",
    "......KWK...............",
    "......KWWK..............",
    "......KLLWK.............",
    "......KLGLWK............",
    "......KLGGLWK...........",
    "......KLGGGGLWK.........",
    "......KLGGGGGLWK........",
    "......KLGEEGGEEGK.......",
    "......KLAGGGGGAGDK......",
    "......KLGGGGGGGGDK......",
    "......KLGEEEEEGGDK......",
    "....KLGGGGGGGGGGGDDK....",
    "....KLGDGDGDGDGDGDZK....",
    "....KGDDDDDDDDDDDZZK....",
    "....KKKKKKKKKKKKKKKK....",
    ".....KKK........KKK.....",
    ".....KKK........KKK.....",
    "........................",
])

# STRETCH : pointe 1px plus haut, une rangée de triangle en plus,
# pattes tendues sur la pointe (3 rangées, étroites), yeux hauts excités
STRETCH = pad([
    "......K.................",
    "......KK................",
    "......KWK...............",
    "......KWWK..............",
    "......KLLWK.............",
    "......KLGLWK............",
    "......KLGGLWK...........",
    "......KLGGGLWK..........",
    "......KLGGGGLWK.........",
    "......KLGGGGGLWK........",
    "......KLGGGGGGLWK.......",
    "......KLGEEGGEEGK.......",
    "......KLGEEGGEEGDK......",
    "......KLGWWGGWWGDK......",
    "......KLAGGGGGAGDK......",
    "......KLGGGGGEGGDK......",
    "......KLGEEEEGGGDK......",
    "......KLGGGGGGGDDK......",
    "......KLGDGDGDGDZK......",
    "......KKKKKKKKKKKK......",
    ".........KK....KK.......",
    ".........KK....KK.......",
    ".........KK....KK.......",
    "........................",
])

BLIP_FRAMES = {
    'stand-mid':  STAND_MID,
    'stand-up':   STAND_UP,
    'blink-half': BLINK_HALF,
    'blink-full': BLINK_FULL,
    'alarm':      ALARM,
    'run1':       RUN1,
    'run2':       RUN2,
    'relief':     RELIEF,
    'crouch':     CROUCH,
    'crouch-deep': CROUCH_DEEP,
    'stretch':    STRETCH,
}

def rects(rows, palette, scale=1):
    """émet les <rect> fusionnés horizontalement (comme sprite.render)."""
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            c = row[x]
            if c in ('.', ' '):
                x += 1
                continue
            x0 = x
            while x < len(row) and row[x] == c:
                x += 1
            fill = palette[c][0]
            out.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{fill}"/>')
    return ''.join(out)

def blip_frame_group(name, rows):
    return f'<g class="jongle-bf jongle-bf-{name}">{rects(scan(rows,0,23), BLIP_PAL)}</g>'

# ---------------- HEART FRAMES ----------------
# viewBox unifiée 0 0 100 90, bas-centre du cœur à (50,85) pour les 3 frames.
RED = '#ff3333'
RED_D = '#c21f1f'
BIT = '#33ff00'

def heart_group(name, cells, bit, off, shade=()):
    ox, oy = off
    parts = [f'<g class="jongle-hf jongle-hf-{name}">']
    for (cx, cy) in cells:
        parts.append(f'<rect x="{cx+ox}" y="{cy+oy}" width="10" height="10" fill="{RED}"/>')
    for (cx, cy) in shade:
        parts.append(f'<rect x="{cx+ox}" y="{cy+oy}" width="10" height="10" fill="{RED_D}"/>')
    bx, by = bit
    parts.append(f'<rect class="jongle-bit" x="{bx+ox}" y="{by+oy}" width="10" height="10" fill="{BIT}"/>')
    parts.append('</g>')
    return ''.join(parts)

# NORMAL 70x60 -> offset (15,25) ; ombre = rangée basse
H_NORMAL_CELLS = [(10,0),(20,0),(40,0),
    (0,10),(10,10),(20,10),(30,10),(40,10),(60,10),
    (0,20),(10,20),(20,20),(30,20),(40,20),(50,20),(60,20),
    (10,30),(20,30),(30,30),(40,30),
    (20,40),(30,40)]
H_NORMAL_SHADE = [(50,0),(50,30),(40,40),(30,50)]
H_NORMAL_BIT = (50,10)

# SQUASH 80x50 -> offset (10,35), plus large et plus bas, 26 cellules
H_SQUASH_CELLS = [(10,0),(20,0),(50,0),
    (0,10),(10,10),(20,10),(30,10),(40,10),(50,10),(70,10),
    (0,20),(10,20),(20,20),(30,20),(40,20),(50,20),(60,20),
    (20,30),(30,30),(40,30)]
H_SQUASH_SHADE = [(60,0),(70,20),(50,30),(30,40),(40,40)]
H_SQUASH_BIT = (60,10)

# STRETCH 60x70 -> offset (20,15), plus étroit et plus haut, 28 cellules
H_STRETCH_CELLS = [(10,0),(40,0),
    (0,10),(10,10),(20,10),(30,10),(50,10),
    (0,20),(10,20),(20,20),(30,20),(40,20),
    (0,30),(10,30),(20,30),(30,30),(40,30),
    (10,40),(20,40),(30,40),
    (20,50)]
H_STRETCH_SHADE = [(50,20),(50,30),(40,40),(30,50),(20,60),(30,60)]
H_STRETCH_BIT = (40,10)

def heart_svg_inner():
    return (heart_group('n', H_NORMAL_CELLS, H_NORMAL_BIT, (15,25), H_NORMAL_SHADE)
        + heart_group('s', H_SQUASH_CELLS, H_SQUASH_BIT, (10,35), H_SQUASH_SHADE)
        + heart_group('t', H_STRETCH_CELLS, H_STRETCH_BIT, (20,15), H_STRETCH_SHADE))

def blip_svg_inner():
    return ''.join(blip_frame_group(n, r) for n, r in BLIP_FRAMES.items())

if __name__ == '__main__':
    print('frames ok:', ', '.join(BLIP_FRAMES))
