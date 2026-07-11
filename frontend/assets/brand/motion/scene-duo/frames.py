"""Frames pixel redessinées pour la scène « La Rencontre » (Blip & Cathode).
Blip : 14 poses complètes (walk cycle 4 frames patte lointaine assombrie,
crouch/hop/land à volume conservé, blush ^^, blinks avec blush).
Cathode : coque + antenne séparée + 9 états d'écran (sommeil, réveil 2 frames,
pupilles trackables, wide, glitch, cœur 3 frames de pulse, yeux heureux) + smile + zZ.
"""
import sys
LAB = '/tmp/claude-0/-home-user-Personnal-Website/66c4dd44-f8bb-56c7-87cd-bde1f5775501/scratchpad/motion-lab'
sys.path.insert(0, LAB)
from maps import BLIP, BLIP_PAL, CATHODE_PAL, scan

W24 = 24

def pad(rows):
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

def rowspans(spans):
    row = ['.'] * 24
    for x0, x1, ch in spans:
        for x in range(x0, x1 + 1):
            row[x] = ch
    return ''.join(row)

def swap_rows(base, repl):
    rows = list(base)
    for y, r in repl.items():
        rows[y] = r
    return pad(rows)

# ================= BLIP =================
# pattes visibles sur fond sombre : proche = D (#1fae00), lointaine = Z (#12851a)
LEGS_STAND = {
    21: rowspans([(8, 10, 'Z'), (14, 16, 'D')]),
    22: rowspans([(8, 10, 'Z'), (14, 16, 'D')]),
}
STAND = swap_rows(BLIP, LEGS_STAND)

# yeux vers le HAUT (regarde Cathode, plus grand que lui)
LOOK_UP = swap_rows(STAND, {
    11: "......KLGEEGGEEGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGWWGGWWGDK......",
})

BLINK_HALF = swap_rows(STAND, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGEEGGEEGDK......",
})
BLINK_FULL = swap_rows(STAND, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGGGGGGGGDK......",
    13: "......KLGEEGGEEGDK......",
})

# --- walk cycle : patte proche = K (encre), patte lointaine = Z (ombre verte) ---
def walk(legs21, legs22):
    return swap_rows(BLIP, {21: rowspans(legs21), 22: rowspans(legs22)})

WALK_A = walk([(6, 8, 'Z'), (14, 16, 'D')], [(5, 7, 'Z'), (15, 17, 'D')])   # contact, proche devant
WALK_B = walk([(9, 11, 'D'), (13, 15, 'Z')], [(9, 11, 'D')])                # passage, lointaine levée
WALK_C = walk([(6, 8, 'D'), (14, 16, 'Z')], [(5, 7, 'D'), (15, 17, 'Z')])   # contact, lointaine devant
WALK_D = walk([(9, 11, 'Z'), (13, 15, 'D')], [(9, 11, 'Z')])                # passage, proche levée

# --- anticipation : tassé de 2px, élargi en bas, volume conservé ---
ANTICIP = pad([
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
    ".......ZZZ......DDD.....",
    ".......ZZZ......DDD.....",
    "........................",
])

# --- hop : étiré, yeux hauts excités, pattes RENTRÉES sous le corps ---
HOP = pad([
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
    ".........ZZ....DD.......",
    "..........ZZ..DD........",
    "........................",
    "........................",
])

# --- land : très tassé, bouche pressée, pattes très écartées ---
LAND = pad([
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
    ".....ZZZ........DDD.....",
    ".....ZZZ........DDD.....",
    "........................",
])

# --- blush heureux : yeux fermés ^ ^, double blush, grand sourire ---
BLUSH_HAPPY = swap_rows(STAND, {
    11: "......KLGEGGGGEGK.......",
    12: "......KLEGEGGEGEDK......",
    13: "......KLGGGGGGGGDK......",
    14: "......KLAAGGGGAADK......",
    15: "......KLEGGGGGEGDK......",
    16: "......KLGEEEEEGGDK......",
})

# --- blush smirk : visage de base + double blush (l'après-glow) ---
BLUSH_SMIRK = swap_rows(STAND, {
    14: "......KLAAGGGGAADK......",
})
BLUSH_BLINK = swap_rows(STAND, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGGGGGGGGDK......",
    13: "......KLGEEGGEEGDK......",
    14: "......KLAAGGGGAADK......",
})

BLIP_FRAMES = {
    'stand': STAND,
    'walk-a': WALK_A, 'walk-b': WALK_B, 'walk-c': WALK_C, 'walk-d': WALK_D,
    'look-up': LOOK_UP,
    'blink-half': BLINK_HALF, 'blink-full': BLINK_FULL,
    'anticip': ANTICIP, 'hop': HOP, 'land': LAND,
    'blush-happy': BLUSH_HAPPY, 'blush-smirk': BLUSH_SMIRK, 'blush-blink': BLUSH_BLINK,
}

def rects(rows, palette):
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
            fill, *op = palette[c]
            opac = f' opacity="{op[0]}"' if op else ''
            out.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{fill}"{opac}/>')
    return ''.join(out)

def blip_frame_group(name, rows):
    return f'<g class="duo-bf duo-bf-{name}">{rects(scan(rows, 0, 23), BLIP_PAL)}</g>'

def blip_svg_inner():
    return ''.join(blip_frame_group(n, r) for n, r in BLIP_FRAMES.items())

# ================= CATHODE =================
CPAL = dict(CATHODE_PAL)
CPAL['H'] = ('#33ff00', '.5')     # ligne de glitch forte
CPAL['I'] = ('#33ff00', '.22')    # ligne de glitch faible
CPAL['Q'] = ('#c21f1f',)          # rouge ombré (bas du coeur)

# coque SANS antenne, écran vide (scanlines b/B alternées comme le CRT d'origine)
CATH_SHELL = pad([
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
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
    "...KSCCCCCCCCARCSZK.....",
    "...KSSSSSSSSSSSSSZK.....",
    "....KKKKKKKKKKKKKK......",
    ".....ZZZ......ZZZ.......",
    ".....ZZZ......ZZZ.......",
    "........................",
    "........................",
])

ANTENNA = pad([
    "........................",
    "...............KRRK.....",
    "...............KRRK.....",
    "................ZZ......",
    "................ZZ......",
])

def overlay(d, pal=None):
    """d: dict y -> list de spans (x0,x1,ch) ; émet des rects."""
    pal = pal or CPAL
    out = []
    for y in sorted(d):
        for x0, x1, ch in d[y]:
            fill, *op = pal[ch]
            opac = f' opacity="{op[0]}"' if op else ''
            out.append(f'<rect x="{x0}" y="{y}" width="{x1 - x0 + 1}" height="1" fill="{fill}"{opac}/>')
    return ''.join(out)

# états d'écran (zone x7-14, y9-14)
SCR = {
    # sommeil : paupières basses + petite bouche de ronfleur
    'lids': {12: [(7, 9, 'G'), (12, 14, 'G')], 14: [(10, 11, 'G')]},
    # réveil : pupilles 1px mi-ouvertes
    'half': {11: [(8, 8, 'G'), (13, 13, 'G')]},
    # wide : yeux écarquillés 2x3 (sursaut)
    'wide': {9: [(7, 8, 'G'), (12, 13, 'G')], 10: [(7, 8, 'G'), (12, 13, 'G')],
             11: [(7, 8, 'G'), (12, 13, 'G')]},
    # glitch de boot (1 frame)
    'glitch': {10: [(7, 14, 'H')], 11: [(10, 11, 'W')], 12: [(7, 14, 'I')]},
    # coeur pulse : 3 tailles, heartbit vert en lobe haut-droit, bas ombré
    'heart-s': {10: [(10, 10, 'R'), (12, 12, 'G')], 11: [(9, 13, 'R')],
                12: [(10, 12, 'R')], 13: [(11, 11, 'Q')]},
    'heart-m': {10: [(9, 10, 'R'), (12, 12, 'G'), (13, 13, 'R')], 11: [(8, 14, 'R')],
                12: [(9, 13, 'R')], 13: [(10, 12, 'Q')], 14: [(11, 11, 'Q')]},
    'heart-b': {9: [(9, 10, 'R'), (12, 13, 'R')],
                10: [(8, 12, 'R'), (13, 13, 'G'), (14, 14, 'R')],
                11: [(8, 14, 'R')], 12: [(9, 13, 'R')],
                13: [(10, 12, 'Q')], 14: [(11, 11, 'Q')]},
    # yeux heureux ^ ^
    'happy': {10: [(8, 8, 'G'), (13, 13, 'G')],
              11: [(7, 7, 'G'), (9, 9, 'G'), (12, 12, 'G'), (14, 14, 'G')]},
}
PUPILS = {10: [(8, 8, 'G'), (13, 13, 'G')], 11: [(8, 8, 'G'), (13, 13, 'G')]}
SMILE = {13: [(8, 8, 'G'), (13, 13, 'G')], 14: [(9, 12, 'G')]}
Z_SMALL = {9: [(7, 9, 'G')], 10: [(8, 8, 'G')], 11: [(7, 9, 'G')]}
Z_BIG = {9: [(11, 13, 'G')], 10: [(12, 12, 'G')], 11: [(11, 13, 'G')]}

def cathode_svg_inner():
    p = []
    p.append(f'<g class="duo-shell">{rects(CATH_SHELL, CPAL)}</g>')
    p.append(f'<g class="duo-ant">{rects(ANTENNA, CPAL)}</g>')
    p.append('<rect class="duo-led" x="14" y="17" width="1" height="1" fill="#ff7b6b"/>')
    p.append('<clipPath id="duo-scrclip"><rect x="7" y="9" width="8" height="6"/></clipPath>')
    p.append('<g clip-path="url(#duo-scrclip)">')
    p.append('<rect class="duo-wash" x="7" y="9" width="8" height="6" fill="#ff3333"/>')
    for name, d in SCR.items():
        if name == 'heart-s':
            # bit vert pulsé à la cadence rituelle
            pass
        p.append(f'<g class="duo-cf duo-cf-{name}">{overlay(d)}</g>')
    p.append(f'<g class="duo-cf duo-cf-open"><g class="duo-ceyes">{overlay(PUPILS)}</g></g>')
    p.append(f'<g class="duo-smile">{overlay(SMILE)}</g>')
    p.append(f'<g class="duo-zz"><g class="duo-z duo-z1">{overlay(Z_SMALL)}</g>'
             f'<g class="duo-z duo-z2">{overlay(Z_BIG)}</g></g>')
    p.append('</g>')
    return ''.join(p)

if __name__ == '__main__':
    print('blip frames:', ', '.join(BLIP_FRAMES))
    print('cathode ok, screen states:', ', '.join(SCR), '+ open/smile/zz')
