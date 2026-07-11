"""Frames pixel redessinées pour la scène « Skate session ».
Blip : 13 poses (déformations dessinées en pixels — squash à volume conservé,
paupières en rangées d'encre, jambe de poussée, tuck aérien, grimace d'impact).
Deck : 3 états (normal / flex-mid / flex-deep) redessinés pour le pop et l'impact.
"""
import sys
LAB = '/tmp/claude-0/-home-user-Personnal-Website/66c4dd44-f8bb-56c7-87cd-bde1f5775501/scratchpad/motion-lab'
sys.path.insert(0, LAB)
from maps import BLIP, BLIP_PAL, scan

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

def swap_rows(base, repl):
    rows = list(base)
    for y, r in repl.items():
        rows[y] = r
    return pad(rows)

# ---------------- BLIP ----------------
# stance skate : pieds écartés (avant col 15-17, arrière col 7-9)
STANCE = {
    21: ".......KKK.....KKK......",
    22: ".......KKK.....KKK......",
}
RIDE = swap_rows(BLIP, STANCE)

# regard loin devant (pupilles haut-droite) — avant l'ollie
LOOK_AHEAD = swap_rows(RIDE, {
    11: "......KLGWEGGWEGK.......",
    12: "......KLGWEGGWEGDK......",
    13: "......KLGWWGGWWGDK......",
})

# regard en arrière (pupilles haut-gauche) — fier de son trick
LOOK_BACK = swap_rows(RIDE, {
    11: "......KLGEWGGEWGK.......",
    12: "......KLGEWGGEWGDK......",
    13: "......KLGWWGGWWGDK......",
})

# blink 2 étapes (paupières = rangées d'encre qui descendent)
BLINK_HALF = swap_rows(RIDE, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGEEGGEEGDK......",
})
BLINK_FULL = swap_rows(RIDE, {
    11: "......KLGGGGGGGGK.......",
    12: "......KLGGGGGGGGDK......",
    13: "......KLGEEGGEEGDK......",
})

# PUSH-A : jambe arrière levée en arrière (préparation / recover du kick)
PUSH_A = swap_rows(BLIP, {
    21: "....KKK........KKK......",
    22: "...............KKK......",
})

# PUSH-B : jambe arrière tendue bas-arrière (contact du stroke), regard route
# jambe épaisse en diagonale, visible contre le deck ambre
PUSH_B = swap_rows(BLIP, {
    11: "......KLGWEGGWEGK.......",
    12: "......KLGWEGGWEGDK......",
    13: "......KLGWWGGWWGDK......",
    21: ".....KKK.......KKK......",
    22: "....KKK........KKK......",
    23: "...KKK..................",
})

# CROUCH : tassé de 2 px, élargi en bas (volume conservé), pattes écartées
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

# CROUCH_DEEP : tassé de 3 px, très large, yeux déterminés (1 rangée), bouche pressée
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

# STRETCH : étiré +1 px (pop de l'ollie), pattes tendues pointe, pupilles hautes
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

# TUCK : pattes repliées sous le corps (vol), pupilles basses (il regarde le sol),
# petite bouche o excitée
TUCK = swap_rows(BLIP, {
    11: "......KLGWWGGWWGK.......",
    12: "......KLGEEGGEEGDK......",
    13: "......KLGEEGGEEGDK......",
    15: "......KLGGGEEGGGDK......",
    16: "......KLGGGEEGGGDK......",
    21: "........KK....KK........",
    22: "........................",
})

# LAND : squash 3 px + grimace d'impact (yeux serrés, bouche grimaçante 2 rangées)
LAND = swap_rows(CROUCH_DEEP, {
    15: "......KLGEEEEEEGDK......",
    16: "......KLGEEEEEEGDK......",
})

# SMUG : yeux fermés heureux ^ ^, double blush, grand sourire (après le trick)
SMUG = swap_rows(RIDE, {
    11: "......KLGEGGGGEGK.......",
    12: "......KLEGEGGEGEDK......",
    13: "......KLGGGGGGGGDK......",
    14: "......KLAAGGGGAADK......",
    15: "......KLEGGGGGEGDK......",
    16: "......KLGEEEEEGGDK......",
})

BLIP_FRAMES = {
    'ride':        RIDE,
    'look-ahead':  LOOK_AHEAD,
    'look-back':   LOOK_BACK,
    'blink-half':  BLINK_HALF,
    'blink-full':  BLINK_FULL,
    'push-a':      PUSH_A,
    'push-b':      PUSH_B,
    'crouch':      CROUCH,
    'crouch-deep': CROUCH_DEEP,
    'stretch':     STRETCH,
    'tuck':        TUCK,
    'land':        LAND,
    'smug':        SMUG,
}

# ---------------- DECK (grille 24×8) ----------------
# A ambre, Z dessous sombre, K trucks
DECK_PAL = {'A': ('#ffb000',), 'Z': ('#b87800',), 'K': ('#12120f',)}

DECK_NORMAL = [
    ".A....................A.",
    ".AA..................AA.",
    "..AAAAAAAAAAAAAAAAAAAA..",
    "..ZZZZZZZZZZZZZZZZZZZZ..",
    ".....KK..........KK.....",
]
DECK_FLEX_MID = [
    ".A....................A.",
    ".AA..................AA.",
    "..AAAAAA........AAAAAA..",
    "..ZZZZZZAAAAAAAAZZZZZZ..",
    ".....KK..........KK.....",
]
DECK_FLEX_DEEP = [
    ".A....................A.",
    ".AA..................AA.",
    "..AAAA............AAAA..",
    "..ZZZZAAAAAAAAAAAAZZZZ..",
    ".....KKZZZZZZZZZZKK.....",
]
DECK_FRAMES = {
    'normal':    DECK_NORMAL,
    'flex-mid':  DECK_FLEX_MID,
    'flex-deep': DECK_FLEX_DEEP,
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
            fill = palette[c][0]
            out.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{fill}"/>')
    return ''.join(out)

def blip_frame_group(name, rows):
    return f'<g class="skate-bf skate-bf-{name}">{rects(scan(rows, 0, 23), BLIP_PAL)}</g>'

def blip_svg_inner():
    return ''.join(blip_frame_group(n, r) for n, r in BLIP_FRAMES.items())

# roues : cercles vecteur + 4 rayons (groupe tournant, cercle invisible pour
# centrer le bbox de fill-box)
def wheel(cx, cy, r, cls):
    sp = r * 0.72
    return (
        f'<g><circle cx="{cx}" cy="{cy}" r="{r}" fill="#ff3333"/>'
        f'<g class="skate-wsp {cls}">'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none"/>'
        f'<line x1="{cx-sp}" y1="{cy}" x2="{cx+sp}" y2="{cy}" stroke="#8a1414" stroke-width="0.5"/>'
        f'<line x1="{cx}" y1="{cy-sp}" x2="{cx}" y2="{cy+sp}" stroke="#8a1414" stroke-width="0.5"/>'
        f'</g>'
        f'<circle cx="{cx}" cy="{cy}" r="0.32" fill="#12120f"/></g>'
    )

def deck_svg_inner():
    frames = ''.join(
        f'<g class="skate-df skate-df-{n}">{rects(r, DECK_PAL)}</g>'
        for n, r in DECK_FRAMES.items())
    wheels = wheel(6.0, 5.56, 1.3, 'skate-w1') + wheel(18.0, 5.56, 1.3, 'skate-w2')
    return frames + wheels

for n, r in BLIP_FRAMES.items():
    pad(r)
for n, r in DECK_FRAMES.items():
    for i, row in enumerate(r):
        assert len(row) == 24, (n, i, row)

if __name__ == '__main__':
    print('frames ok:', ', '.join(BLIP_FRAMES), '| deck:', ', '.join(DECK_FRAMES))
