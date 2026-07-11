#!/usr/bin/env python3
"""Scene 'idle vivant' — Blip ne fait rien, et pourtant tout vit.
Genere les frames pixel (neutre / squash / stretch / paupieres / bouches / vapeur)
+ tout le CSS keyframes (pistes fluides et pistes steppees) + index.html / fragment.html.
"""
import sys, math, os

ML = '/tmp/claude-0/-home-user-Personnal-Website/66c4dd44-f8bb-56c7-87cd-bde1f5775501/scratchpad/motion-lab'
sys.path.insert(0, ML)
from maps import BLIP_PAL, scan

SC = os.path.dirname(os.path.abspath(__file__))
T = 16000.0  # duree du cycle maitre (ms)

BLANK = "." * 24
def pad26(d):
    """d: dict {row_index: string24} -> liste de 26 rangees"""
    rows = []
    for y in range(26):
        r = d.get(y, BLANK)
        if len(r) != 24:
            raise SystemExit(f"row {y} len {len(r)}: {r!r}")
        rows.append(r)
    return rows

# ---------------------------------------------------------------- MAPS
# Pointe du curseur (overlay, suit les frames via translate steppee)
TIP = pad26({
    3: "......K.................",
    4: "......KK................",
    5: "......KWK...............",
    6: "......KWWK..............",
    7: "......KLLWK.............",
})

# Corps NEUTRE (visage blanchi, sans pointe, sans pattes)
BODY_N = pad26({
    8:  "......KLGLWK............",
    9:  "......KLGGLWK...........",
    10: "......KLGGGLWK..........",
    11: "......KLGGGGLWK.........",
    12: "......KLGGGGGLWK........",
    13: "......KLGGGGGGGGK.......",
    14: "......KLGGGGGGGGDK......",
    15: "......KLGGGGGGGGDK......",
    16: "......KLGGGGGGGGDK......",
    17: "......KLGGGGGGGGDK......",
    18: "......KLGGGGGGGGDK......",
    19: "......KLGGGGGGGDDK......",
    20: "......KLGDGDGDGDZK......",
    21: "......KGDDDDDDDZZK......",
    22: "......KKKKKKKKKKKK......",
})

# Corps SQUASH (expiration) : 1 rangee plus bas, ventre plus large — volume conserve
BODY_SQ = pad26({
    9:  "......KLGLWK............",
    10: "......KLGGLWK...........",
    11: "......KLGGGLWK..........",
    12: "......KLGGGGLWK.........",
    13: "......KLGGGGGGLWK.......",
    14: "......KLGGGGGGGGGDK.....",
    15: "......KLGGGGGGGGGDK.....",
    16: "......KLGGGGGGGGGDK.....",
    17: ".....KLGGGGGGGGGGDK.....",
    18: ".....KLGGGGGGGGGGDK.....",
    19: ".....KLGGGGGGGGGDDK.....",
    20: ".....KLGDGDGDGDGDZK.....",
    21: ".....KGDDDDDDDDDZZK.....",
    22: ".....KKKKKKKKKKKKKK.....",
})

# Corps STRETCH (etirement) : 2 rangees plus haut, plus etroit — volume conserve
BODY_ST = pad26({
    6:  "......KLGLWK............",
    7:  "......KLGGLWK...........",
    8:  "......KLGGGLWK..........",
    9:  "......KLGGGGLWK.........",
    10: "......KLGGGGGLWK........",
    11: "......KLGGGGGGGGK.......",
    12: "......KLGGGGGGGDK.......",
    13: "......KLGGGGGGGDK.......",
    14: "......KLGGGGGGGDK.......",
    15: "......KLGGGGGGGDK.......",
    16: "......KLGGGGGGGDK.......",
    17: "......KLGGGGGGGDK.......",
    18: "......KLGGGGGGGDK.......",
    19: "......KLGGGGGGDDK.......",
    20: "......KLGDGDGDGZK.......",
    21: "......KGDDDDDDZZK.......",
    22: "......KKKKKKKKKKK.......",
})

# Visage (overlay) : yeux r13-15, blush r16, smirk r17-18
EYES = pad26({
    13: ".........WE..WE.........",
    14: ".........EE..EE.........",
    15: ".........EE..EE.........",
})
BLUSH = pad26({16: "........A.....A........."})
BLUSH_WARM = pad26({16: ".......A.......A........"})
M_SMIRK = pad26({
    17: ".............E..........",
    18: ".........EEEE...........",
})
M_O = pad26({
    17: "..........EEE...........",
    18: "..........EEE...........",
})
# Paupieres (rangees d'encre verte, respectent la parite scanline)
LID1 = pad26({13: ".........GG..GG........."})
LID2 = pad26({13: ".........GG..GG.........",
              14: ".........gg..gg........."})
LID3 = pad26({13: ".........GG..GG.........",
              14: ".........gg..gg.........",
              15: ".........KK..KK........."})

FOOT_L = pad26({23: "........KKK.............",
                24: "........KKK............."})
FOOT_R = pad26({23: "..............KKK.......",
                24: "..............KKK......."})

LID_PAL = {'G': ('#33ff00',), 'g': ('#2ce000',), 'K': ('#12120f',)}
FACE_PAL = {'E': ('#12120f',), 'W': ('#eaffdd',), 'A': ('#ffb000',)}

# Vapeur : 4 frames de volutes en S qui defilent (le motif descend => la volute monte)
STEAM_PAL = {'s': ('#8a877f', .9), 't': ('#bdb5a3', .8)}
def wisp(phase):
    rows = []
    for y in range(9):
        x = round(2 + 1.4 * math.sin(2 * math.pi * (y / 5.5 + phase)))
        x = max(0, min(3, x))
        row = ['.'] * 5
        if y <= 1:
            row[x] = 't'          # sommet : brin leger qui se dissout
        elif y <= 4:
            row[x] = 's'          # milieu : brin simple
        else:
            row[x] = 's'          # base : volute epaisse (2px)
            row[x + 1] = 's'
        rows.append(''.join(row))
    return rows
WISPS = [wisp(p) for p in (0.0, 0.25, 0.5, 0.75)]

# ---------------------------------------------------------------- RENDER HELPERS
def rects(rows, pal):
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
            ent = pal[c]
            op = f' opacity="{ent[1]}"' if len(ent) > 1 else ''
            out.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{ent[0]}"{op}/>')
    return ''.join(out)

def g(cls, inner, tf=None):
    t = f' transform="{tf}"' if tf else ''
    return f'<g class="{cls}"{t}>{inner}</g>'

S = lambda m: scan(m, 4, 21)   # scanlines CRT fixes en espace ecran (rangees paires)

# ---------------------------------------------------------------- CSS GENERATORS
EASE = {
    'lin':  'linear',
    'io':   'cubic-bezier(.42,0,.58,1)',
    'soft': 'cubic-bezier(.45,.05,.55,.95)',
    'out':  'cubic-bezier(.19,.85,.36,1)',
    'in':   'cubic-bezier(.6,.04,.85,.4)',
    'whip': 'cubic-bezier(.18,.89,.35,1.14)',
}
def pct(ms): return f'{ms / T * 100:.3f}%'

def fluid(name, track, fmt):
    """track: [(ms, vals-tuple, ease)] -> @keyframes avec easing par segment"""
    out = [f'@keyframes {name}{{']
    for ms, vals, ez in track:
        out.append(f'{pct(ms)}{{transform:{fmt.format(*vals)};animation-timing-function:{EASE[ez]}}}')
    out.append('}')
    return ''.join(out)

def fluid_op(name, track):
    out = [f'@keyframes {name}{{']
    for ms, v, ez in track:
        out.append(f'{pct(ms)}{{opacity:{v};animation-timing-function:{EASE[ez]}}}')
    out.append('}')
    return ''.join(out)

def stepped_op(name, spans):
    """spans: [(on_ms, off_ms)] -> opacity 0/1 instantanee (double-pourcentage)"""
    evs = []
    for a, b in spans:
        evs += [(a, 1), (b, 0)]
    evs.sort()
    cur = 1 if (spans and spans[0][0] == 0) else 0
    kf = [f'0%{{opacity:{cur}}}']
    for ms, v in evs:
        if ms == 0:
            continue
        kf.append(f'{pct(ms - 1.2)}{{opacity:{cur}}}')
        cur = v
        kf.append(f'{pct(ms)}{{opacity:{cur}}}')
    kf.append(f'100%{{opacity:{cur}}}')
    return f'@keyframes {name}{{{"".join(kf)}}}'

def stepped_tf(name, segments, mapping, fmt):
    """segments: [(start_ms, key)] -> transform steppee synchro avec les frames"""
    kf = []
    prev = None
    for i, (ms, key) in enumerate(segments):
        v = fmt.format(*mapping[key])
        if i == 0:
            kf.append(f'0%{{transform:{v}}}')
        else:
            kf.append(f'{pct(ms - 1.2)}{{transform:{prev}}}')
            kf.append(f'{pct(ms)}{{transform:{v}}}')
        prev = v
    kf.append(f'100%{{transform:{prev}}}')
    return f'@keyframes {name}{{{"".join(kf)}}}'

def seg_spans(segments, key):
    spans = []
    for i, (ms, k) in enumerate(segments):
        if k == key:
            end = segments[i + 1][0] if i + 1 < len(segments) else T
            spans.append((ms, end))
    # fusionne les spans contigus & gere le bouclage (dernier == premier)
    return spans

# ---------------------------------------------------------------- TIMELINE
# Frames de corps : n = inspire (haut), sq = expire (tasse), st = etirement
SEG = [(0, 'n'), (1400, 'sq'), (2600, 'n'), (4300, 'sq'), (5600, 'n'),
       (8200, 'sq'), (9000, 'n'), (10400, 'sq'), (11400, 'n'),
       (12600, 'sq'), (13000, 'st'), (14200, 'sq'), (14800, 'n')]

# Corps (fluide) : anticipation / whip / overshoot / settle sur chaque beat
BODY = [
    (0,     (0, -.40, 0.0),  'soft'),
    (1400,  (0,  .10, 0.2),  'soft'),
    (2050,  (0,  .30, 0.2),  'io'),
    (2600,  (0,  .30, 0.1),  'out'),
    (2950,  (0, -.45, -0.2), 'soft'),
    (4300,  (0,  .15, 0.0),  'io'),
    (4450,  (0.2, .22, 0.5), 'io'),      # anticipation (amorce a droite)
    (4750,  (-0.9, .32, -2.7), 'whip'),  # transfert de poids a gauche
    (5080,  (-0.68, .28, -2.05), 'io'),
    (5600,  (-0.75, .05, -2.3), 'out'),
    (6200,  (-0.7, -.28, -2.2), 'soft'),
    (6650,  (-0.65, -.1, -2.15), 'in'),
    (6950,  (-1.35, .15, -3.7), 'whip'), # anticipation profonde avant le cafe
    (7280,  (1.65, .35, 6.9),  'io'),    # whip vers le cafe, overshoot
    (7560,  (1.32, .22, 5.6),  'io'),
    (7900,  (1.5,  .3,  6.3),  'soft'),
    (8200,  (1.5,  .38, 6.4),  'soft'),
    (8800,  (1.58, .55, 6.7),  'io'),    # bob de reniflage vers la tasse
    (9050,  (1.48, .3,  6.15), 'soft'),
    (9450,  (1.55, .45, 6.5),  'in'),
    (9600,  (1.75, .55, 7.3),  'whip'),  # petite plongee avant le retour
    (9980,  (-0.55, -.2, -1.7), 'io'),   # overshoot au-dela de la verticale
    (10330, (0.18, .12, 0.55), 'io'),
    (10650, (0,   .2, -0.1),   'io'),
    (11050, (-0.62, .25, -1.95), 'out'), # transfert de poids n.2 (avant les taps)
    (11400, (-0.55, 0, -1.8),  'io'),
    (11550, (-0.6, .18, -1.9), 'io'),    # micro-rebonds sympathiques aux taps
    (11700, (-0.55, -.05, -1.72), 'io'),
    (11900, (-0.6, .18, -1.9), 'io'),
    (12050, (-0.55, -.05, -1.72), 'io'),
    (12280, (-0.58, .12, -1.85), 'io'),
    (12550, (-0.2, .3, -0.6),  'in'),
    (12950, (0, 1.65, 0.3),    'out'),   # accroupi (anticipation du stretch)
    (13150, (0, -0.95, -0.4),  'io'),    # lancee
    (13420, (0, -0.55, 0.25),  'io'),
    (13800, (0, -0.72, -0.15), 'io'),    # tremblement au sommet
    (14100, (0, -0.6, 0.1),    'in'),
    (14360, (0, 0.95, 0.3),    'out'),   # retombee compressee
    (14650, (0, -0.28, -0.3),  'io'),    # rebond
    (14960, (0, 0.22, 0.12),   'io'),
    (15350, (0, -0.30, -0.05), 'soft'),
    (16000, (0, -0.40, 0.0),   'soft'),
]

# Pointe (follow-through) : lag oppose au corps puis oscillation amortie
TIPW = [
    (0, -0.4), (1500, 0.5), (2700, -0.6), (2900, 0.9), (3300, -0.3),
    (4400, 0.2), (4750, 2.2), (5100, -1.2), (5450, 0.6), (5800, -0.2),
    (6300, 0.3), (6950, 2.8), (7280, -3.8), (7650, 1.8), (8000, -0.8),
    (8400, 0.4), (8800, 0.0), (9550, -1.2), (9950, 3.4), (10350, -2.0),
    (10700, 1.1), (11050, -0.5), (11400, 0.2), (11700, -0.5), (11900, 0.3),
    (12100, -0.4), (12300, 0.2), (12950, 1.6), (13150, -2.6), (13500, 1.4),
    (13850, -0.6), (14100, 0.3), (14360, 2.6), (14700, -2.2), (15050, 1.2),
    (15400, -0.6), (15750, 0.2), (16000, -0.4),
]
TIPW = [(ms, (r,), 'io') for ms, r in TIPW]

# Yeux : dart instantane-rapide, retour lent qui derive (arc x+y)
EYES_TK = [
    (0, (0, 0), 'io'), (2450, (0, 0), 'io'),
    (2560, (0.35, 0), 'out'),            # anticipation opposee
    (2700, (-1, 0), 'soft'),             # dart a gauche
    (3600, (-1, 0.12), 'io'),
    (4700, (0.18, 0), 'io'),             # retour lent, leger overshoot
    (5150, (0, 0), 'io'), (6900, (0, 0), 'out'),
    (7080, (1, 0.6), 'soft'),            # regard bas-droite vers la tasse
    (8750, (1.05, 0.72), 'soft'),        # suit le bob de reniflage
    (9250, (1, 0.6), 'io'), (9700, (0.9, 0.4), 'io'),
    (10150, (-0.3, 0), 'io'), (10600, (0, 0), 'io'),
    (10720, (0, 0), 'out'),
    (10860, (1, 0), 'soft'),             # dart droite (il a entendu un truc)
    (11650, (1, 0.1), 'io'), (12350, (0, 0), 'io'),
    (14380, (0, 0), 'out'), (14550, (0, -0.6), 'io'),  # regarde en l'air apres le stretch
    (15250, (0, 0), 'io'), (16000, (0, 0), 'io'),
]
def flip_glances(track):
    out = []
    for ms, (x, y), ez in track:
        if 2450 <= ms <= 5150 or 10720 <= ms <= 12350:
            x = -x
        out.append((ms, (x, y), ez))
    return out

# Pattes
FR = [(0, (0,), 'io'), (4550, (0,), 'out'), (4720, (-1,), 'io'),
      (5330, (-1,), 'in'), (5540, (0,), 'io'),
      (11250, (0,), 'out'), (11330, (-1.2,), 'in'), (11450, (0,), 'out'),
      (11580, (-1.2,), 'in'), (11700, (0,), 'out'), (11830, (-1.2,), 'in'),
      (11950, (0,), 'out'), (12080, (-0.7,), 'in'), (12200, (0,), 'io'),
      (16000, (0,), 'io')]
FL = [(0, (0,), 'io'), (7300, (0,), 'out'), (7480, (-1,), 'io'),
      (9350, (-1,), 'in'), (9620, (0,), 'io'), (16000, (0,), 'io')]

# Ombre : derivee automatiquement du corps (action secondaire)
SHADOW = [(ms, (x * 0.75, 1 + 0.085 * y), ez) for ms, (x, y, r), ez in BODY]

# Paupieres
L1 = [(1000, 1040), (3800, 3840), (5700, 5740), (7900, 8300), (8900, 9200),
      (10450, 10490), (12700, 12800), (15300, 15340)]
L3 = [(1040, 1140), (3840, 3940), (5740, 5860), (5980, 6100),
      (10490, 10590), (12800, 14250), (15340, 15440)]
L2 = [(1140, 1200), (3940, 4000), (6100, 6160), (8300, 8900),
      (10590, 10650), (14250, 14350), (15440, 15500)]

MO_SPAN = [(8300, 8900), (12750, 14350)]   # "ooh" au-dessus du cafe + baillement du stretch
MS_SPAN = [(0, 8300), (8900, 12750), (14350, 16000)]

BW = [(0, 0, 'io'), (7400, 0, 'io'), (7900, 1, 'io'),
      (9500, 1, 'io'), (10200, 0, 'io'), (16000, 0, 'io')]
GLINT = [(0, 0, 'io'), (6700, 0, 'io'), (6820, 1, 'out'), (7100, 0, 'io'),
         (13450, 0, 'io'), (13570, 1, 'out'), (13850, 0, 'io'), (16000, 0, 'io')]

# ---------------------------------------------------------------- SVG SCENE
def build_svg():
    cup = (
        '<rect x="1" y="3" width="5" height="1" fill="#12120f"/>'
        '<rect x="1" y="4" width="1" height="1" fill="#12120f"/><rect x="2" y="4" width="3" height="1" fill="#ffb000"/><rect x="5" y="4" width="1" height="1" fill="#12120f"/><rect x="7" y="4" width="1" height="1" fill="#12120f"/>'
        '<rect x="1" y="5" width="1" height="1" fill="#12120f"/><rect x="2" y="5" width="3" height="1" fill="#f2e2c4"/><rect x="5" y="5" width="2" height="1" fill="#12120f"/><rect x="8" y="5" width="1" height="1" fill="#12120f"/>'
        '<rect x="1" y="6" width="1" height="1" fill="#12120f"/><rect x="2" y="6" width="3" height="1" fill="#f2e2c4"/><rect x="5" y="6" width="1" height="1" fill="#12120f"/><rect x="8" y="6" width="1" height="1" fill="#12120f"/>'
        '<rect x="1" y="7" width="1" height="1" fill="#12120f"/><rect x="2" y="7" width="3" height="1" fill="#f2e2c4"/><rect x="5" y="7" width="2" height="1" fill="#12120f"/><rect x="8" y="7" width="1" height="1" fill="#12120f"/>'
        '<rect x="1" y="8" width="1" height="1" fill="#12120f"/><rect x="2" y="8" width="2" height="1" fill="#f2e2c4"/><rect x="4" y="8" width="1" height="1" fill="#cdb894"/><rect x="5" y="8" width="1" height="1" fill="#12120f"/><rect x="7" y="8" width="1" height="1" fill="#12120f"/>'
        '<rect x="1" y="9" width="5" height="1" fill="#12120f"/>'
    )
    wf = ''.join(g(f'idle-wf idle-wf{i+1}', rects(W, STEAM_PAL)) for i, W in enumerate(WISPS))
    wisps = (
        g('idle-wpos', g('idle-wisp idle-wisp-1', g('idle-wsway', wf)), 'translate(30.7,19.5)') +
        g('idle-wpos', g('idle-wisp idle-wisp-2', g('idle-wsway', wf)), 'translate(32.4,20.6)')
    )
    anchors = ('<rect x="5" y="1" width=".01" height=".01" fill="#000" fill-opacity="0"/>'
               '<rect x="18.99" y="22.99" width=".01" height=".01" fill="#000" fill-opacity="0"/>')
    face = g('idle-facef',
             g('idle-eyes', rects(EYES, FACE_PAL)) +
             g('idle-lid idle-lid-1', rects(LID1, LID_PAL)) +
             g('idle-lid idle-lid-2', rects(LID2, LID_PAL)) +
             g('idle-lid idle-lid-3', rects(LID3, LID_PAL)) +
             g('idle-blush', rects(BLUSH, FACE_PAL)) +
             g('idle-blush-warm', rects(BLUSH_WARM, FACE_PAL)) +
             g('idle-mouth idle-m-smirk', rects(M_SMIRK, FACE_PAL)) +
             g('idle-mouth idle-m-o', rects(M_O, FACE_PAL)))
    body = g('idle-bodywrap',
             anchors +
             g('idle-bf idle-bf-n', rects(S(BODY_N), BLIP_PAL)) +
             g('idle-bf idle-bf-sq', rects(S(BODY_SQ), BLIP_PAL)) +
             g('idle-bf idle-bf-st', rects(S(BODY_ST), BLIP_PAL)) +
             g('idle-tipf', g('idle-tip', rects(TIP, BLIP_PAL))) +
             face)
    blip = g('idle-blip',
             '<rect class="idle-shadow" x="7" y="25.25" width="12" height="1" rx=".5" fill="#000" opacity=".5"/>' +
             g('idle-foot idle-foot-l', rects(FOOT_L, BLIP_PAL)) +
             g('idle-foot idle-foot-r', rects(FOOT_R, BLIP_PAL)) +
             body,
             'translate(8,11)')
    motes = (
        '<rect class="idle-mote idle-mote-1" x="12" y="15" width=".7" height=".7" fill="#33ff00"/>'
        '<rect class="idle-mote idle-mote-2" x="40" y="10" width=".6" height=".6" fill="#33ff00"/>'
        '<rect class="idle-mote idle-mote-3" x="27" y="19" width=".5" height=".5" fill="#33ff00"/>'
    )
    return f'''<svg class="idle-svg" viewBox="0 0 52 42" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="Blip, curseur pixel vivant, patiente a cote d'un cafe fumant">
<defs><radialGradient id="idle-glowg" cx="50%" cy="55%" r="60%">
<stop offset="0%" stop-color="#33ff00" stop-opacity=".16"/><stop offset="100%" stop-color="#33ff00" stop-opacity="0"/></radialGradient></defs>
<ellipse class="idle-glow" cx="24" cy="30" rx="19" ry="11" fill="url(#idle-glowg)"/>
{motes}
<g class="idle-ground"><rect x="5" y="36" width="42" height=".7" fill="#141b0f" opacity=".9"/><rect x="5" y="36.7" width="42" height=".35" fill="#0d120b"/></g>
<g class="idle-coffee" transform="translate(30,26)">
<rect x="1" y="10.25" width="6" height=".8" rx=".4" fill="#000" opacity=".45"/>
<g class="idle-cup">{cup}</g>
<rect class="idle-glint" x="3" y="4" width="1" height="1" fill="#ffdd66"/>
</g>
{wisps}
{blip}
</svg>'''

# ---------------------------------------------------------------- CSS
def build_css():
    kf = []
    kf.append(stepped_op('idle-kbfn', seg_spans(SEG, 'n')))
    kf.append(stepped_op('idle-kbfsq', seg_spans(SEG, 'sq')))
    kf.append(stepped_op('idle-kbfst', seg_spans(SEG, 'st')))
    kf.append(stepped_tf('idle-kfacef', SEG, {'n': (0,), 'sq': (1,), 'st': (-1,)}, 'translateY({}px)'))
    kf.append(stepped_tf('idle-ktipf', SEG, {'n': (0,), 'sq': (1,), 'st': (-2,)}, 'translateY({}px)'))
    kf.append(fluid('idle-kbody', BODY, 'translate({0}px,{1}px) rotate({2}deg)'))
    kf.append(fluid('idle-ktip', TIPW, 'rotate({0}deg)'))
    kf.append(fluid('idle-keyes', EYES_TK, 'translate({0}px,{1}px)'))
    kf.append(fluid('idle-keyesb', flip_glances(EYES_TK), 'translate({0}px,{1}px)'))
    kf.append(fluid('idle-kfr', FR, 'translateY({0}px)'))
    kf.append(fluid('idle-kfl', FL, 'translateY({0}px)'))
    kf.append(fluid('idle-kshadow', SHADOW, 'translateX({0}px) scaleX({1:.3f})'))
    kf.append(stepped_op('idle-kl1', L1))
    kf.append(stepped_op('idle-kl2', L2))
    kf.append(stepped_op('idle-kl3', L3))
    kf.append(stepped_op('idle-kmo', MO_SPAN))
    kf.append(stepped_op('idle-kms', MS_SPAN))
    kf.append(fluid_op('idle-kbw', BW))
    kf.append(fluid_op('idle-kglint', GLINT))
    # vapeur : montee 3200ms, ondulation 1600ms, frames 800ms — tout divise 16000
    kf.append('@keyframes idle-krise{0%{transform:translateY(1.2px) scale(.82);opacity:0}'
              '14%{opacity:.8}55%{opacity:.55}88%{opacity:0}100%{transform:translateY(-7.5px) scale(1.18);opacity:0}}')
    kf.append('@keyframes idle-ksway{0%{transform:translateX(-.55px)}100%{transform:translateX(.55px)}}')
    for i in range(4):
        a, b = i * 25, (i + 1) * 25
        frames = [f'0%{{opacity:{1 if i == 0 else 0}}}']
        if i > 0:
            frames.append(f'{a - .01:.2f}%{{opacity:0}}')
            frames.append(f'{a}%{{opacity:1}}')
        frames.append(f'{b - .01:.2f}%{{opacity:1}}')
        if b < 100:
            frames.append(f'{b}%{{opacity:0}}')
        frames.append('100%%{opacity:%s}' % (1 if i == 0 else 0))
        kf.append(f'@keyframes idle-kwf{i + 1}{{{"".join(frames)}}}')
    kf.append('@keyframes idle-kglow{0%,100%{opacity:.55}50%{opacity:.8}}')
    kf.append('@keyframes idle-kmote1{0%{transform:translate(0,0)}50%{transform:translate(1.5px,-2.5px)}100%{transform:translate(0,0)}}')
    kf.append('@keyframes idle-kmote2{0%{transform:translate(0,0)}50%{transform:translate(-2px,1.5px)}100%{transform:translate(0,0)}}')
    kf.append('@keyframes idle-kmote3{0%{transform:translate(0,0)}50%{transform:translate(1px,1.8px)}100%{transform:translate(0,0)}}')
    kf.append('@keyframes idle-ktwinkle{0%,100%{opacity:.06}50%{opacity:.22}}')

    css = f'''
#ms-idle{{width:min(460px,92vw);margin:0 auto}}
#ms-idle .idle-svg{{width:100%;height:auto;display:block}}
#ms-idle .idle-blip{{filter:drop-shadow(0 0 1.1px rgba(51,255,0,.28))}}
#ms-idle .idle-bf{{opacity:0}}
#ms-idle .idle-bf-n{{opacity:1;animation:idle-kbfn 16s linear infinite}}
#ms-idle .idle-bf-sq{{animation:idle-kbfsq 16s linear infinite}}
#ms-idle .idle-bf-st{{animation:idle-kbfst 16s linear infinite}}
#ms-idle .idle-bodywrap{{transform-box:fill-box;transform-origin:50% 100%;animation:idle-kbody 16s linear infinite}}
#ms-idle .idle-facef{{animation:idle-kfacef 16s linear infinite}}
#ms-idle .idle-tipf{{animation:idle-ktipf 16s linear infinite}}
#ms-idle .idle-tip{{transform-box:fill-box;transform-origin:50% 100%;animation:idle-ktip 16s linear infinite}}
#ms-idle .idle-eyes{{animation:idle-keyes 16s linear infinite}}
#ms-idle.idle-alt .idle-eyes{{animation-name:idle-keyesb}}
#ms-idle .idle-lid{{opacity:0}}
#ms-idle .idle-lid-1{{animation:idle-kl1 16s linear infinite}}
#ms-idle .idle-lid-2{{animation:idle-kl2 16s linear infinite}}
#ms-idle .idle-lid-3{{animation:idle-kl3 16s linear infinite}}
#ms-idle .idle-m-o{{opacity:0;animation:idle-kmo 16s linear infinite}}
#ms-idle .idle-m-smirk{{animation:idle-kms 16s linear infinite}}
#ms-idle .idle-blush-warm{{opacity:0;animation:idle-kbw 16s linear infinite}}
#ms-idle .idle-foot-r{{animation:idle-kfr 16s linear infinite}}
#ms-idle .idle-foot-l{{animation:idle-kfl 16s linear infinite}}
#ms-idle .idle-shadow{{transform-box:fill-box;transform-origin:50% 50%;animation:idle-kshadow 16s linear infinite}}
#ms-idle .idle-glint{{opacity:0;animation:idle-kglint 16s linear infinite}}
#ms-idle .idle-glow{{animation:idle-kglow 1s cubic-bezier(.45,.05,.55,.95) infinite}}
#ms-idle .idle-wisp{{opacity:1}}
#ms-idle .idle-wisp-1{{animation:idle-krise 3200ms linear infinite}}
#ms-idle .idle-wisp-2{{animation:idle-krise 3200ms linear infinite;animation-delay:-1600ms}}
#ms-idle .idle-wsway{{animation:idle-ksway 1600ms cubic-bezier(.45,.05,.55,.95) infinite alternate}}
#ms-idle .idle-wisp-2 .idle-wsway{{animation-delay:-800ms}}
#ms-idle .idle-wf{{opacity:0}}
#ms-idle .idle-wf1{{animation:idle-kwf1 800ms linear infinite}}
#ms-idle .idle-wf2{{animation:idle-kwf2 800ms linear infinite}}
#ms-idle .idle-wf3{{animation:idle-kwf3 800ms linear infinite}}
#ms-idle .idle-wf4{{animation:idle-kwf4 800ms linear infinite}}
#ms-idle .idle-wisp-2 .idle-wf1{{animation-delay:-400ms}}
#ms-idle .idle-wisp-2 .idle-wf2{{animation-delay:-400ms}}
#ms-idle .idle-wisp-2 .idle-wf3{{animation-delay:-400ms}}
#ms-idle .idle-wisp-2 .idle-wf4{{animation-delay:-400ms}}
#ms-idle .idle-mote{{opacity:.12}}
#ms-idle .idle-mote-1{{animation:idle-kmote1 16s cubic-bezier(.45,.05,.55,.95) infinite,idle-ktwinkle 4s ease-in-out infinite}}
#ms-idle .idle-mote-2{{animation:idle-kmote2 8s cubic-bezier(.45,.05,.55,.95) infinite,idle-ktwinkle 4s ease-in-out infinite 1.3s}}
#ms-idle .idle-mote-3{{animation:idle-kmote3 16s cubic-bezier(.45,.05,.55,.95) infinite,idle-ktwinkle 4s ease-in-out infinite 2.6s}}
@media (prefers-reduced-motion:reduce){{
#ms-idle *{{animation:none!important}}
#ms-idle .idle-wisp-1{{opacity:.35}}#ms-idle .idle-wisp-1 .idle-wf1{{opacity:1}}
#ms-idle .idle-wisp-2{{opacity:0}}
}}
{''.join(kf)}'''
    return css

JS = '''(function(){
var root=document.getElementById('ms-idle');if(!root)return;
var drv=root.querySelector('.idle-bf-n');if(!drv)return;
drv.addEventListener('animationiteration',function(e){
if(e.animationName!=='idle-kbfn')return;
root.classList.toggle('idle-alt',Math.random()<0.5);
});
})();'''

def build_fragment():
    return (f'<div class="mscene" id="ms-idle">\n{build_svg()}\n'
            f'<style>{build_css()}</style>\n<script>{JS}</script>\n</div>\n')

def build_index(fragment):
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blip — idle vivant</title>
<style>html,body{{margin:0;min-height:100vh;background:#0a0a0a;display:grid;place-items:center}}</style>
</head><body>
{fragment}
<script>/* harnais de test : ?t=MS fige toutes les animations a l'instant MS */
(function(){{var m=location.search.match(/[?&]t=(\\d+)/);if(!m)return;var t=+m[1];
function scrub(){{document.getAnimations().forEach(function(a){{a.pause();a.currentTime=t;}});}}
requestAnimationFrame(function(){{requestAnimationFrame(scrub);}});
}})();</script>
</body></html>
'''

# ---------------------------------------------------------------- CONTACT SHEET
def compose_state(body, tip_dy, face_dy, lids=(), mouth='smirk', label=''):
    inner = rects(FOOT_L, BLIP_PAL) + rects(FOOT_R, BLIP_PAL)
    inner += rects(S(body), BLIP_PAL)
    inner += g('t', rects(TIP, BLIP_PAL), f'translate(0,{tip_dy})')
    face = rects(EYES, FACE_PAL)
    for l in lids:
        face += rects({1: LID1, 2: LID2, 3: LID3}[l], LID_PAL)
    face += rects(BLUSH, FACE_PAL)
    face += rects(M_SMIRK if mouth == 'smirk' else M_O, FACE_PAL)
    inner += g('f', face, f'translate(0,{face_dy})')
    return (f'<figure><svg viewBox="0 0 24 26" width="192" xmlns="http://www.w3.org/2000/svg" '
            f'shape-rendering="crispEdges">{inner}</svg><figcaption>{label}</figcaption></figure>')

def build_sheet():
    figs = [
        compose_state(BODY_N, 0, 0, (), 'smirk', 'neutre'),
        compose_state(BODY_SQ, 1, 1, (), 'smirk', 'squash'),
        compose_state(BODY_ST, -2, -1, (), 'o', 'stretch + bouche O'),
        compose_state(BODY_N, 0, 0, (1,), 'smirk', 'lid1'),
        compose_state(BODY_N, 0, 0, (2,), 'smirk', 'lid2'),
        compose_state(BODY_N, 0, 0, (3,), 'smirk', 'lid3 ferme'),
    ]
    steam = ''.join(
        f'<figure><svg viewBox="0 0 5 9" width="90" xmlns="http://www.w3.org/2000/svg" '
        f'shape-rendering="crispEdges" style="background:#111">{rects(W, STEAM_PAL)}</svg>'
        f'<figcaption>w{i + 1}</figcaption></figure>'
        for i, W in enumerate(WISPS))
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{background:#0a0a0a;color:#8f8;font:12px monospace;display:flex;flex-wrap:wrap;gap:14px;padding:16px}}
figure{{margin:0;text-align:center}}</style></head><body>{figs and ''.join(figs)}{steam}</body></html>'''

if __name__ == '__main__':
    frag = build_fragment()
    open(os.path.join(SC, 'fragment.html'), 'w').write(frag)
    open(os.path.join(SC, 'index.html'), 'w').write(build_index(frag))
    open(os.path.join(SC, 'frames.html'), 'w').write(build_sheet())
    print('written: fragment.html index.html frames.html')
