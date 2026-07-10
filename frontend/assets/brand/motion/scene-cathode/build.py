"""Compile la scène « Cathode s'allume » : tables de beats (ms) -> keyframes CSS.
Sort index.html (démo standalone) + fragment.html (livrable).
Cycle 16 s : OFF -> boot bloom CRT -> vie/regards -> neige -> 3 zaps de chaîne -> extinction.
"""
import pathlib, sys
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from frames import (shell_svg_inner, antenna_svg_inner, eyes_svg_inner,
                    mouth_svg_inner, static_svg_inner, srects, HEART,
                    ZGLYPH_A, ZGLYPH_B)

CYCLE = 16000.0
A = 'animation'

EASES = {
    'lin': 'linear',
    'sine': 'ease-in-out',
    'inout': 'cubic-bezier(.45,.05,.55,.95)',
    'out2': 'cubic-bezier(.3,.65,.4,1)',
    'out3': 'cubic-bezier(.2,.75,.3,1)',
    'in3': 'cubic-bezier(.6,0,.9,.5)',
    'launch': 'cubic-bezier(.2,.7,.42,1)',
    'fallin': 'cubic-bezier(.53,.02,.8,.4)',
    'pop': 'cubic-bezier(.25,1.5,.45,1)',
    'drag': 'cubic-bezier(.25,.35,.6,.9)',
    'step': 'step-end',
}

def pct(ms):
    v = round(ms / CYCLE * 100, 4)
    s = f'{v:.4f}'.rstrip('0').rstrip('.')
    return s + '%'

def kf(name, table, fmt):
    lines = [f'@keyframes {name}{{']
    for ms, val, ease in table:
        e = f'animation-timing-function:{EASES[ease]};' if ease else ''
        lines.append(f'{pct(ms)}{{{fmt(val)}{e}}}')
    lines.append('}')
    return ''.join(lines)

def frame_windows_to_stops(windows):
    ws = sorted(windows)
    merged = []
    for s, e in ws:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(e, merged[-1][1]))
        else:
            merged.append((s, e))
    stops = [(0, 1 if (merged and merged[0][0] == 0) else 0)]
    for s, e in merged:
        if s > 0:
            stops.append((s, 1))
        if e < CYCLE:
            stops.append((e, 0))
    out = {}
    for t, v in stops:
        out[t] = v
    return sorted(out.items())

def frame_kf(name, windows):
    body = ''.join(f'{pct(t)}{{opacity:{v}}}' for t, v in frame_windows_to_stops(windows))
    return f'@keyframes {name}{{{body}}}'

def seq_windows(seq):
    """[(t, frame|None)] -> {frame: [fenêtres]} ; None = tout caché."""
    d = {}
    for (t, f), (t2, _f2) in zip(seq, seq[1:] + [(CYCLE, None)]):
        if f is not None and t2 > t:
            d.setdefault(f, []).append((t, t2))
    return d

# ================= TABLES DE BEATS (ms sur 16000) =================

# ---- coque : tilt (deg, pivot pieds), Y (px scène), X ----
SHELL_TILT = [
    (0, 0, 'lin'),
    (2440, 0, 'inout'), (2520, -.9, 'out2'), (2700, .35, 'inout'), (2900, 0, 'inout'),
    (3060, -1.8, 'inout'), (3200, -2.4, 'out2'), (3330, 1.6, 'inout'),
    (3520, -.7, 'inout'), (3700, .3, 'inout'), (3880, 0, 'sine'),
    (4820, 0, 'out2'), (5050, -2.0, 'inout'), (5750, -1.9, 'in3'),
    (5920, -2.3, 'out3'), (6180, 2.1, 'inout'), (6350, 1.8, 'inout'), (6850, 1.9, 'out2'),
    (7100, 0, 'inout'),
    (7450, -.8, 'inout'), (7700, .8, 'inout'), (7950, -.6, 'inout'),
    (8200, .4, 'inout'), (8400, 0, 'sine'),
    (8600, -.4, 'sine'), (9050, -1.3, 'in3'), (9200, -1.6, 'out3'),
    (9300, 2.6, 'inout'), (9460, -1.4, 'inout'), (9620, .7, 'inout'),
    (9800, -.3, 'inout'), (9980, 0, 'sine'),
    (10650, -.5, 'in3'), (10850, -.6, 'out3'),
    (11100, 1.0, 'inout'), (11300, -.5, 'inout'), (11500, .2, 'inout'), (11700, 0, 'sine'),
    (12050, -.8, 'inout'), (12250, .4, 'inout'), (12450, 0, 'inout'),
    (12600, .6, 'inout'), (12900, .4, 'out3'),
    (13250, -.6, 'inout'), (13450, .3, 'inout'), (13650, 0, 'sine'),
    (13900, -.5, 'sine'), (14400, -1.1, 'in3'), (14900, -1.3, 'out2'),
    (15080, .8, 'inout'), (15300, -.3, 'inout'), (15550, .1, 'inout'),
    (15800, 0, 'lin'), (16000, 0, None),
]
SHELL_Y = [
    (0, 0, 'lin'), (3070, 0, 'launch'), (3200, -24, 'fallin'), (3330, 0, 'lin'),
    (7430, 0, 'launch'), (7540, -3, 'fallin'), (7650, 0, 'launch'),
    (7760, -2, 'fallin'), (7870, 0, 'lin'),
    (8500, 0, 'sine'), (9200, 2.5, 'out3'),
    (9250, 2.5, 'launch'), (9310, -8, 'fallin'), (9400, 0, 'lin'),
    (11090, 0, 'launch'), (11170, -3, 'fallin'), (11260, 0, 'lin'),
    (12080, 0, 'launch'), (12150, -2, 'fallin'), (12240, 0, 'lin'),
    (13270, 0, 'launch'), (13340, -2, 'fallin'), (13430, 0, 'lin'),
    (15080, 0, 'sine'), (15400, 1.5, 'sine'), (15900, 0, 'lin'), (16000, 0, None),
]
SHELL_X = [
    (0, 0, 'lin'), (9290, 0, 'out3'), (9380, 7, 'inout'), (9560, -2.5, 'inout'),
    (9720, 1, 'inout'), (9880, 0, 'sine'), (16000, 0, None),
]

# ---- antenne : ressort amorti (rotation base) + boule (fouet, origine haut du stem) ----
ANT_ROT = [
    (0, .5, 'sine'), (1200, -.6, 'sine'), (2400, .4, 'inout'),
    (3080, 3, 'drag'), (3220, 6, 'inout'), (3350, -9, 'out3'),
    (3500, 7, 'inout'), (3660, -4.5, 'inout'), (3820, 2.8, 'inout'),
    (3990, -1.6, 'inout'), (4180, .9, 'inout'), (4400, -.4, 'inout'), (4700, .3, 'sine'),
    (5000, .3, 'out2'), (5150, 2.6, 'inout'), (5350, -1.2, 'inout'),
    (5550, .5, 'inout'), (5800, 0, 'sine'),
    (6130, -2.8, 'out2'), (6350, 1.4, 'inout'), (6560, -.6, 'inout'), (6800, .2, 'sine'),
    (7200, 1.2, 'inout'), (7420, -.6, 'inout'),
    (7550, 1.4, 'inout'), (7800, -1.3, 'inout'), (8050, 1, 'inout'),
    (8300, -.6, 'inout'), (8550, .2, 'sine'),
    (9050, 1, 'sine'), (9200, 1.4, 'lin'),
    (9310, -16, 'out3'), (9480, 18, 'inout'), (9640, -12, 'inout'),
    (9800, 7.5, 'inout'), (9960, -4.5, 'inout'), (10130, 2.7, 'inout'),
    (10320, -1.5, 'inout'), (10520, .8, 'inout'), (10750, -.3, 'sine'),
    (11120, -3.5, 'out3'), (11300, 2.6, 'inout'), (11480, -1.3, 'inout'),
    (11650, .5, 'inout'), (11850, 0, 'sine'),
    (12080, 2.8, 'out3'), (12260, -2, 'inout'), (12440, .9, 'inout'), (12620, -.3, 'sine'),
    (13290, 2.4, 'out3'), (13470, -1.7, 'inout'), (13650, .7, 'inout'), (13850, -.2, 'sine'),
    (14300, .8, 'sine'), (14800, 1.2, 'sine'),
    (15100, -4, 'out3'), (15300, 3.2, 'inout'), (15500, -1.8, 'inout'),
    (15700, .9, 'inout'), (15880, .5, 'lin'), (16000, .5, None),
]
BALL_ROT = [
    (0, -.7, 'sine'), (1300, .8, 'sine'), (2400, -.5, 'inout'),
    (3140, -4, 'drag'), (3300, -8, 'inout'), (3430, 12, 'out3'),
    (3590, -9, 'inout'), (3750, 6, 'inout'), (3920, -3.6, 'inout'),
    (4100, 2, 'inout'), (4300, -1, 'inout'), (4550, .4, 'inout'), (4800, -.3, 'sine'),
    (5080, -.4, 'out2'), (5230, -3.4, 'inout'), (5440, 1.8, 'inout'),
    (5640, -.8, 'inout'), (5880, .3, 'sine'),
    (6210, 3.6, 'out2'), (6440, -2, 'inout'), (6650, .9, 'inout'), (6880, -.3, 'sine'),
    (7280, -1.6, 'inout'), (7500, .8, 'inout'),
    (7630, -1.8, 'inout'), (7880, 1.7, 'inout'), (8130, -1.3, 'inout'),
    (8380, .8, 'inout'), (8620, -.3, 'sine'),
    (9130, -1.2, 'lin'),
    (9390, 20, 'out3'), (9560, -24, 'inout'), (9720, 16, 'inout'),
    (9880, -10, 'inout'), (10040, 6, 'inout'), (10210, -3.5, 'inout'),
    (10400, 1.9, 'inout'), (10600, -1, 'inout'), (10830, .4, 'sine'),
    (11200, 4.5, 'out3'), (11380, -3.4, 'inout'), (11560, 1.7, 'inout'),
    (11730, -.7, 'inout'), (11930, .2, 'sine'),
    (12160, -3.6, 'out3'), (12340, 2.6, 'inout'), (12520, -1.2, 'inout'), (12700, .4, 'sine'),
    (13370, -3, 'out3'), (13550, 2.2, 'inout'), (13730, -1, 'inout'), (13930, .3, 'sine'),
    (14400, -1, 'sine'), (14900, -1.5, 'sine'),
    (15180, 5.5, 'out3'), (15380, -4.2, 'inout'), (15580, 2.4, 'inout'),
    (15760, -1.2, 'inout'), (15920, -.7, 'lin'), (16000, -.7, None),
]

# ---- yeux/bouche : glissements avec anticipation inverse, overshoot, arcs en Y ----
EYES_X = [
    (0, 0, 'lin'), (4600, 0, 'in3'), (4700, .28, 'out3'), (4900, -1.02, 'inout'),
    (5060, -.78, 'inout'), (5220, -.88, 'sine'), (5700, -.82, 'in3'),
    (5880, -1.05, 'out3'), (6120, .92, 'inout'), (6300, .72, 'inout'),
    (6460, .82, 'sine'), (6900, .78, 'out2'),
    (7120, 0, 'lin'),
    (9280, 0, 'lin'), (9300, .45, 'lin'), (9360, -.45, 'lin'),
    (9430, .35, 'lin'), (9500, 0, 'inout'),
    (9860, 0, 'out2'), (9960, -.75, 'inout'), (10080, -.6, 'out2'),
    (10200, .7, 'inout'), (10320, .55, 'out2'), (10440, 0, 'lin'),
    (11480, 0, 'out2'), (11680, -.78, 'sine'), (11900, -.72, 'in3'),
    (12220, -.72, 'out3'), (12420, .85, 'inout'), (12600, .72, 'inout'), (13060, .78, 'inout'),
    (13400, .75, 'out2'), (13700, 0, 'lin'), (16000, 0, None),
]
EYES_Y = [
    (0, 0, 'lin'), (4600, 0, 'inout'), (4760, .3, 'inout'), (4940, .04, 'sine'),
    (5860, .06, 'inout'), (6000, .32, 'inout'), (6180, .03, 'sine'),
    (7150, 0, 'sine'),
    (8460, 0, 'in3'), (9040, .55, 'lin'), (9200, .6, 'out3'),
    (9280, -.4, 'inout'), (9420, -.22, 'sine'), (9640, 0, 'lin'),
    (11480, 0, 'out2'), (11680, -.5, 'sine'), (11900, -.45, 'inout'),
    (12100, -.45, 'inout'), (12420, -.05, 'sine'), (12700, .02, 'sine'),
    (13400, 0, 'sine'), (13750, .3, 'sine'), (14200, .55, 'lin'),
    (14900, .6, 'lin'), (15100, 0, 'lin'), (16000, 0, None),
]
MOUTH_X = [
    (0, 0, 'lin'), (4720, 0, 'out2'), (4980, -.4, 'inout'), (5750, -.36, 'out2'),
    (6200, .36, 'inout'), (6950, .32, 'out2'), (7220, 0, 'lin'),
    (11560, 0, 'out2'), (11760, -.3, 'inout'), (12300, -.28, 'out2'),
    (12520, .34, 'inout'), (13120, .3, 'out2'), (13780, 0, 'lin'), (16000, 0, None),
]

# ---- contenu écran : opacité (flicker fluorescent au boot), scaleY (zaps), jitter ----
CONTENT_O = [
    (0, 0, 'lin'), (3440, 0, 'lin'), (3460, .45, 'lin'), (3530, .15, 'lin'),
    (3600, .75, 'lin'), (3680, .4, 'lin'), (3780, .92, 'lin'), (3900, 1, 'lin'),
    (13900, 1, 'sine'), (14800, .8, 'lin'), (15080, .85, 'lin'),
    (15085, 0, 'lin'), (16000, 0, None),
]
CONTENT_SY = [
    (0, 1, 'lin'),
    (10800, 1, 'inout'), (10870, 1.06, 'in3'), (10930, .045, 'lin'),
    (11060, .045, 'pop'), (11210, 1.13, 'inout'), (11330, .96, 'inout'), (11440, 1, 'lin'),
    (11900, 1, 'inout'), (11960, 1.05, 'in3'), (12020, .045, 'lin'),
    (12140, .045, 'pop'), (12290, 1.12, 'inout'), (12400, .97, 'inout'), (12500, 1, 'lin'),
    (13100, 1, 'inout'), (13160, 1.05, 'in3'), (13220, .045, 'lin'),
    (13340, .045, 'pop'), (13490, 1.11, 'inout'), (13600, .98, 'inout'), (13700, 1, 'lin'),
    (14950, 1, 'inout'), (15010, 1.04, 'in3'), (15080, .05, 'lin'),
    (15100, .05, 'lin'), (15900, 1, 'lin'), (16000, 1, None),
]
CONTENT_JX = [
    (0, 0, 'lin'), (6498, 0, 'lin'), (6500, .5, 'lin'), (6560, 0, 'lin'),
    (9250, 0, 'lin'), (9290, .4, 'lin'), (9330, -.35, 'lin'), (9380, .3, 'lin'),
    (9440, -.3, 'lin'), (9500, .2, 'lin'), (9560, -.2, 'lin'), (9690, 0, 'lin'),
    (10800, 0, 'lin'), (10870, -.25, 'lin'), (10930, .2, 'lin'), (11060, 0, 'lin'),
    (11900, 0, 'lin'), (11960, -.2, 'lin'), (12020, .15, 'lin'), (12140, 0, 'lin'),
    (13100, 0, 'lin'), (13160, -.2, 'lin'), (13220, .15, 'lin'), (13340, 0, 'lin'),
    (14950, 0, 'lin'), (15010, -.15, 'lin'), (15080, 0, 'lin'), (16000, 0, None),
]

# ---- couleur du phosphore (stepped) : vert -> cyan -> magenta -> teal ----
PHOSPHOR = [
    (0, '#33ff00', None), (11000, '#29e0ff', None),
    (12060, '#ff45d8', None), (13260, '#27ffc4', None), (16000, '#27ffc4', None),
]
GLOW_C = [
    (0, '#37ff37', None), (11000, '#2ae0ff', None),
    (12060, '#ff4ade', None), (13260, '#2affc0', None), (16000, '#2affc0', None),
]

# ---- boot : point, ligne, bloom, flash ----
BOOTDOT_O = [
    (0, 0, 'lin'), (2538, 0, 'lin'), (2550, .7, 'lin'), (2600, .25, 'lin'),
    (2660, .85, 'lin'), (2710, .45, 'lin'), (2760, 1, 'lin'), (2790, 0, 'lin'),
    (16000, 0, None),
]
BOOTLINE_SX = [
    (0, .05, 'lin'), (2778, .05, 'out3'), (2980, 1.05, 'inout'),
    (3060, 1, 'lin'), (16000, 1, None),
]
BOOTLINE_O = [
    (0, 0, 'lin'), (2776, 0, 'lin'), (2780, .9, 'lin'), (2900, 1, 'lin'),
    (3080, 1, 'lin'), (3160, 0, 'lin'), (16000, 0, None),
]
BLOOM_SY = [
    (0, .08, 'lin'), (3038, .08, 'pop'), (3210, 1, 'lin'), (16000, 1, None),
]
BLOOM_O = [
    (0, 0, 'lin'), (3036, 0, 'lin'), (3040, 1, 'out3'), (3320, .55, 'sine'),
    (3520, .2, 'lin'), (3650, 0, 'lin'), (16000, 0, None),
]
FLASH_O = [
    (0, 0, 'lin'), (3040, 0, 'lin'), (3060, .95, 'out3'), (3280, .18, 'sine'),
    (3460, 0, 'lin'), (16000, 0, None),
]

# ---- zaps : ligne blanche pendant l'écrasement + point d'extinction ----
ZAPLINE_O = [
    (0, 0, 'lin'), (10928, 0, 'lin'), (10930, .95, 'lin'), (11000, .7, 'lin'),
    (11058, .9, 'lin'), (11060, 0, 'lin'),
    (12018, 0, 'lin'), (12020, .95, 'lin'), (12090, .7, 'lin'), (12138, .9, 'lin'),
    (12140, 0, 'lin'),
    (13218, 0, 'lin'), (13220, .95, 'lin'), (13290, .7, 'lin'), (13338, .9, 'lin'),
    (13340, 0, 'lin'),
    (15078, 0, 'lin'), (15080, .95, 'lin'), (15180, .8, 'lin'), (15258, 0, 'lin'),
    (16000, 0, None),
]
ZAPLINE_SX = [
    (0, 1, 'lin'), (15080, 1, 'in3'), (15258, .07, 'lin'),
    (15262, 1, 'lin'), (16000, 1, None),
]
OFFDOT_O = [
    (0, 0, 'lin'), (15252, 0, 'lin'), (15258, 1, 'lin'), (15420, .6, 'sine'),
    (15780, 0, 'lin'), (16000, 0, None),
]
OFFDOT_S = [
    (0, 1, 'lin'), (15258, 1, 'lin'), (15700, .5, 'lin'), (16000, .5, None),
]

# ---- LED, glint, glow ambiant, ombre ----
LED_RED = [
    (0, .25, 'sine'), (500, .95, 'sine'), (1100, .25, 'sine'), (1600, .95, 'sine'),
    (2100, .3, 'lin'), (2250, 1, 'lin'), (2320, .2, 'lin'), (2400, 1, 'lin'),
    (2450, 0, 'lin'), (15050, 0, 'sine'), (15150, .2, 'sine'), (15600, .8, 'sine'),
    (16000, .25, None),
]
LED_GRN = [
    (0, 0, 'lin'), (2450, 0, 'lin'), (2455, 1, 'lin'), (14950, 1, 'lin'),
    (15250, 0, 'lin'), (16000, 0, None),
]
GLINT_O = [
    (0, .13, 'lin'), (2620, .13, 'lin'), (2790, 0, 'lin'), (15320, 0, 'lin'),
    (15600, .11, 'sine'), (16000, .13, None),
]
GLOW_O = [
    (0, 0, 'lin'), (3035, 0, 'lin'), (3055, .55, 'out3'), (3300, .16, 'sine'),
    (3900, .2, 'sine'), (5900, .16, 'sine'), (7900, .21, 'sine'),
    (9245, .2, 'lin'), (9260, .45, 'lin'), (9330, .25, 'lin'), (9400, .5, 'lin'),
    (9480, .3, 'lin'), (9560, .45, 'lin'), (9690, .22, 'lin'),
    (10800, .2, 'lin'), (10930, .06, 'lin'), (11080, .3, 'out2'), (11400, .18, 'sine'),
    (12020, .06, 'lin'), (12160, .28, 'out2'), (12500, .18, 'sine'),
    (13220, .06, 'lin'), (13360, .26, 'out2'), (13700, .17, 'sine'),
    (14700, .14, 'sine'), (15080, .05, 'lin'), (15300, .12, 'lin'),
    (15750, 0, 'lin'), (16000, 0, None),
]
POOL_O = [(t, round(v * .55, 3), e) for t, v, e in GLOW_O]
SHADOW = [
    (0, (1, .5), 'lin'), (2940, (1, .5), 'out3'), (3080, (1.04, .55), 'launch'),
    (3200, (.86, .34), 'fallin'), (3330, (1.07, .6), 'out3'), (3520, (1, .5), 'sine'),
    (9250, (1, .5), 'out3'), (9310, (.9, .4), 'fallin'), (9400, (1.05, .58), 'out3'),
    (9540, (1, .5), 'sine'), (16000, (1, .5), None),
]

# ---- cœur & zzz (contenu d'écran) ----
HEART_T = [
    (0, (0, 2.2, .3), 'lin'), (7648, (0, 2.2, .3), 'pop'),
    (7690, (.08, 1.9, 1.12), 'inout'), (7860, (.02, 1.6, 1), 'inout'),
    (8060, (-.08, .9, 1.06), 'inout'), (8220, (.05, .35, 1), 'inout'),
    (8350, (-.03, -.3, .96), 'lin'), (8360, (0, 2.2, .3), 'lin'), (16000, (0, 2.2, .3), None),
]
HEART_O = [
    (0, 0, 'lin'), (7648, 0, 'lin'), (7660, 1, 'lin'), (8180, 1, 'lin'),
    (8350, 0, 'lin'), (16000, 0, None),
]
Z1_T = [
    (0, (0, 1.6), 'lin'), (14040, (0, 1.6), 'out2'), (14300, (.3, .4), 'inout'),
    (14550, (-.15, -.7), 'inout'), (14800, (.15, -1.9), 'lin'),
    (14810, (0, 1.6), 'lin'), (16000, (0, 1.6), None),
]
Z1_O = [
    (0, 0, 'lin'), (14040, 0, 'lin'), (14060, .9, 'lin'), (14620, .8, 'lin'),
    (14800, 0, 'lin'), (16000, 0, None),
]
Z2_T = [
    (0, (0, 1.8), 'lin'), (14420, (0, 1.8), 'out2'), (14700, (-.25, .3), 'inout'),
    (14950, (.15, -.8), 'inout'), (15150, (-.1, -2), 'lin'),
    (15160, (0, 1.8), 'lin'), (16000, (0, 1.8), None),
]
Z2_O = [
    (0, 0, 'lin'), (14420, 0, 'lin'), (14440, .75, 'lin'), (14950, .7, 'lin'),
    (15150, 0, 'lin'), (16000, 0, None),
]

# ================= FENÊTRES DE FRAMES =================
SHELL_WINDOWS = {
    'squash':  [(2930, 3080), (3320, 3470), (9380, 9540)],
    'stretch': [(3080, 3320), (9250, 9380)],
}
def complement(wd):
    marks = sorted({0, CYCLE} | {t for ws in wd.values() for w in ws for t in w})
    out = []
    for a, b in zip(marks, marks[1:]):
        mid = (a + b) / 2
        if not any(s <= mid < e for ws in wd.values() for s, e in ws):
            out.append((a, b))
    return out
SHELL_WINDOWS['base'] = complement(dict(SHELL_WINDOWS))

# sync : l'aperture + l'antenne suivent la tête (squash +1px / stretch -1px)
SYNC = [(0, 0, 'step')]
for t0, t1 in SHELL_WINDOWS['squash']:
    SYNC += [(t0, 1, 'step'), (t1, 0, 'step')]
for t0, t1 in SHELL_WINDOWS['stretch']:
    SYNC += [(t0, -1, 'step'), (t1, 0, 'step')]
SYNC = sorted({t: (t, v, e) for t, v, e in SYNC}.values())
# aux frontières squash<->stretch le dernier écrit gagne : reconstruire proprement
def sync_table():
    evs = []
    for t0, t1 in SHELL_WINDOWS['squash']:
        evs.append((t0, t1, 1))
    for t0, t1 in SHELL_WINDOWS['stretch']:
        evs.append((t0, t1, -1))
    marks = sorted({0, CYCLE} | {t for a, b, _ in evs for t in (a, b)})
    table = []
    for a, b in zip(marks, marks[1:]):
        mid = (a + b) / 2
        v = 0
        for t0, t1, val in evs:
            if t0 <= mid < t1:
                v = val
        table.append((a, v, 'step'))
    table.append((CYCLE, 0, None))
    return table
SYNC = sync_table()

EYE_SEQ = [
    (0, None),
    (3900, 'half'), (4000, 'open'),
    (4380, 'half'), (4450, 'shut'), (4540, 'half'), (4620, 'open'),
    (7000, 'half'), (7070, 'shut'), (7140, 'open'), (7210, 'shut'), (7290, 'open'),
    (7400, 'happy'), (8400, 'open'), (8460, 'half'),
    (9050, 'shut'), (9250, 'wide'),
    (10450, 'open'), (10650, 'half'), (10930, 'open'),
    (12300, 'happy'), (13100, 'open'), (13340, 'half'),
    (14000, 'shut'), (15080, None),
]
MOUTH_SEQ = [
    (0, None),
    (3900, 'smile'), (7400, 'grin'), (8400, 'smile'), (8460, 'flat'),
    (9250, 'o'), (10500, 'smile'), (10650, 'flat'), (11060, 'smile'),
    (12300, 'wavy'), (13340, 'sleep'), (15080, None),
]
EYE_WINDOWS = seq_windows(EYE_SEQ)
MOUTH_WINDOWS = seq_windows(MOUTH_SEQ)

STATIC_WINDOWS = {
    'n1': [(9250, 9323), (9542, 9615), (11060, 11115)],
    'n2': [(6500, 6560), (9396, 9469), (13340, 13395)],
    'n3': [(9323, 9396), (9615, 9690), (12140, 12195)],
    'n4': [(9469, 9542)],
}

# ================= CSS =================
P = 'cath'
ID = f'#ms-cathode'
css = []
css.append(kf(f'{P}-tilt', SHELL_TILT, lambda v: f'transform:rotate({v}deg);'))
css.append(kf(f'{P}-sy', SHELL_Y, lambda v: f'transform:translateY({v}px);'))
css.append(kf(f'{P}-sx', SHELL_X, lambda v: f'transform:translateX({v}px);'))
css.append(kf(f'{P}-ant', ANT_ROT, lambda v: f'transform:rotate({v}deg);'))
css.append(kf(f'{P}-ball', BALL_ROT, lambda v: f'transform:rotate({v}deg);'))
css.append(kf(f'{P}-eyx', EYES_X, lambda v: f'transform:translateX({v}px);'))
css.append(kf(f'{P}-eyy', EYES_Y, lambda v: f'transform:translateY({v}px);'))
css.append(kf(f'{P}-mox', MOUTH_X, lambda v: f'transform:translateX({v}px);'))
css.append(kf(f'{P}-co', CONTENT_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-csy', CONTENT_SY, lambda v: f'transform:scaleY({v});'))
css.append(kf(f'{P}-cjx', CONTENT_JX, lambda v: f'transform:translateX({v}px);'))
css.append(kf(f'{P}-phos', PHOSPHOR, lambda v: f'color:{v};'))
css.append(kf(f'{P}-glowc', GLOW_C, lambda v: f'background-color:{v};'))
css.append(kf(f'{P}-bdot', BOOTDOT_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-blsx', BOOTLINE_SX, lambda v: f'transform:scaleX({v});'))
css.append(kf(f'{P}-blo', BOOTLINE_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-bloomy', BLOOM_SY, lambda v: f'transform:scaleY({v});'))
css.append(kf(f'{P}-bloomo', BLOOM_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-flash', FLASH_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-zlo', ZAPLINE_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-zlsx', ZAPLINE_SX, lambda v: f'transform:scaleX({v});'))
css.append(kf(f'{P}-odo', OFFDOT_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-ods', OFFDOT_S, lambda v: f'transform:scale({v});'))
css.append(kf(f'{P}-ledr', LED_RED, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-ledg', LED_GRN, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-glint', GLINT_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-glow', GLOW_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-pool', POOL_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-shad', SHADOW, lambda v: f'transform:scaleX({v[0]});opacity:{v[1]};'))
css.append(kf(f'{P}-sync', SYNC, lambda v: f'transform:translateY({v}px);'))
css.append(kf(f'{P}-heart', HEART_T,
              lambda v: f'transform:translate({v[0]}px,{v[1]}px) scale({v[2]});'))
css.append(kf(f'{P}-hearto', HEART_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-z1t', Z1_T, lambda v: f'transform:translate({v[0]}px,{v[1]}px);'))
css.append(kf(f'{P}-z1o', Z1_O, lambda v: f'opacity:{v};'))
css.append(kf(f'{P}-z2t', Z2_T, lambda v: f'transform:translate({v[0]}px,{v[1]}px);'))
css.append(kf(f'{P}-z2o', Z2_O, lambda v: f'opacity:{v};'))
for n, ws in SHELL_WINDOWS.items():
    css.append(frame_kf(f'{P}-sfk-{n}', ws))
for n, ws in EYE_WINDOWS.items():
    css.append(frame_kf(f'{P}-efk-{n}', ws))
for n, ws in MOUTH_WINDOWS.items():
    css.append(frame_kf(f'{P}-mfk-{n}', ws))
for n, ws in STATIC_WINDOWS.items():
    css.append(frame_kf(f'{P}-nfk-{n}', ws))
css.append(f'@keyframes {P}-band{{0%{{transform:translateY(0)}}100%{{transform:translateY(8.4px)}}}}')

D = '16s'
frames_css = ''.join(
    f'{ID} .{P}-sf-{n}{{{A}:{P}-sfk-{n} {D} step-end infinite;}}' for n in SHELL_WINDOWS)
frames_css += ''.join(
    f'{ID} .{P}-ef-{n}{{{A}:{P}-efk-{n} {D} step-end infinite;}}' for n in EYE_WINDOWS)
frames_css += ''.join(
    f'{ID} .{P}-mf-{n}{{{A}:{P}-mfk-{n} {D} step-end infinite;}}' for n in MOUTH_WINDOWS)
frames_css += ''.join(
    f'{ID} .{P}-nf-{n}{{{A}:{P}-nfk-{n} {D} step-end infinite;}}' for n in STATIC_WINDOWS)

STYLE = f'''
{ID}{{position:relative;width:460px;height:420px;margin:0 auto;overflow:hidden;}}
{ID} .{P}-glow{{position:absolute;left:76px;top:140px;width:280px;height:220px;
  border-radius:50%;filter:blur(34px);opacity:0;background-color:#37ff37;
  {A}:{P}-glow {D} linear infinite,{P}-glowc {D} step-end infinite;}}
{ID} .{P}-pool{{position:absolute;left:106px;top:372px;width:220px;height:30px;
  border-radius:50%;filter:blur(16px);opacity:0;background-color:#37ff37;
  {A}:{P}-pool {D} linear infinite,{P}-glowc {D} step-end infinite;}}
{ID} .{P}-ground{{position:absolute;left:20px;right:20px;top:390px;height:2px;
  background:repeating-linear-gradient(90deg,#242018 0 8px,transparent 8px 14px);}}
{ID} .{P}-ground2{{position:absolute;left:44px;right:44px;top:396px;height:1px;
  background:repeating-linear-gradient(90deg,#18150f 0 5px,transparent 5px 13px);}}
{ID} .{P}-shadow{{position:absolute;left:122px;top:384px;width:180px;height:13px;
  border-radius:50%;background:#131408;opacity:.5;
  {A}:{P}-shad {D} linear infinite;}}
{ID} .{P}-rig{{position:absolute;left:62px;top:82px;width:336px;height:336px;
  {A}:{P}-sx {D} linear infinite;}}
{ID} .{P}-rigy{{width:336px;height:336px;{A}:{P}-sy {D} linear infinite;}}
{ID} .{P}-tilt{{width:336px;height:336px;transform-origin:50% 92%;
  {A}:{P}-tilt {D} linear infinite;}}
{ID} .{P}-tilt > svg{{display:block;width:336px;height:336px;}}
{ID} .{P}-sf{{opacity:0;}}
{ID} .{P}-sf-base{{opacity:1;}}
{ID} .{P}-syncA,{ID} .{P}-syncS{{{A}:{P}-sync {D} step-end infinite;}}
{ID} .{P}-ant{{transform-box:fill-box;transform-origin:50% 100%;
  {A}:{P}-ant {D} linear infinite;}}
{ID} .{P}-ball{{transform-box:fill-box;transform-origin:50% 100%;
  {A}:{P}-ball {D} linear infinite;}}
{ID} .{P}-ledr{{opacity:0;filter:drop-shadow(0 0 1.2px #ff4747);
  {A}:{P}-ledr {D} linear infinite;}}
{ID} .{P}-ledg{{opacity:0;filter:drop-shadow(0 0 1.2px #86ff6e);
  {A}:{P}-ledg {D} linear infinite;}}
{ID} .{P}-scr{{color:#33ff00;{A}:{P}-phos {D} step-end infinite;}}
{ID} .{P}-czap{{transform-box:fill-box;transform-origin:50% 50%;
  {A}:{P}-csy {D} linear infinite;}}
{ID} .{P}-cjit{{{A}:{P}-cjx {D} linear infinite;}}
{ID} .{P}-content{{opacity:0;{A}:{P}-co {D} linear infinite;}}
{ID} .{P}-eyx{{{A}:{P}-eyx {D} linear infinite;}}
{ID} .{P}-eyy{{{A}:{P}-eyy {D} linear infinite;}}
{ID} .{P}-mox{{{A}:{P}-mox {D} linear infinite;}}
{ID} .{P}-ef,{ID} .{P}-mf,{ID} .{P}-nf{{opacity:0;}}
{ID} .{P}-heart{{opacity:0;{A}:{P}-hearto {D} linear infinite;}}
{ID} .{P}-heartt{{{A}:{P}-heart {D} linear infinite;transform-box:fill-box;
  transform-origin:50% 50%;}}
{ID} .{P}-z1{{opacity:0;{A}:{P}-z1o {D} linear infinite;}}
{ID} .{P}-z1t{{{A}:{P}-z1t {D} linear infinite;}}
{ID} .{P}-z2{{opacity:0;{A}:{P}-z2o {D} linear infinite;}}
{ID} .{P}-z2t{{{A}:{P}-z2t {D} linear infinite;}}
{ID} .{P}-band{{{A}:{P}-band 2.7s linear infinite;}}
{ID} .{P}-bdot{{opacity:0;{A}:{P}-bdot {D} linear infinite;}}
{ID} .{P}-blwrap{{transform-box:fill-box;transform-origin:50% 50%;
  {A}:{P}-blsx {D} linear infinite;}}
{ID} .{P}-bline{{opacity:0;{A}:{P}-blo {D} linear infinite;
  filter:drop-shadow(0 0 1.5px #9dff7a);}}
{ID} .{P}-bloom{{opacity:0;transform-box:fill-box;transform-origin:50% 50%;
  {A}:{P}-bloomo {D} linear infinite,{P}-bloomy {D} linear infinite;}}
{ID} .{P}-flash{{opacity:0;{A}:{P}-flash {D} linear infinite;}}
{ID} .{P}-zlwrap{{transform-box:fill-box;transform-origin:50% 50%;
  {A}:{P}-zlsx {D} linear infinite;}}
{ID} .{P}-zline{{opacity:0;{A}:{P}-zlo {D} linear infinite;
  filter:drop-shadow(0 0 2px currentColor);}}
{ID} .{P}-odot{{opacity:0;transform-box:fill-box;transform-origin:50% 50%;
  filter:drop-shadow(0 0 2px currentColor);
  {A}:{P}-odo {D} linear infinite,{P}-ods {D} linear infinite;}}
{ID} .{P}-glint{{opacity:.13;{A}:{P}-glint {D} linear infinite;}}
{frames_css}
{''.join(css)}
@media (prefers-reduced-motion:reduce){{
  {ID} *{{animation:none !important;}}
  {ID} .{P}-content{{opacity:1;}}
  {ID} .{P}-ef-open,{ID} .{P}-mf-smile{{opacity:1;}}
  {ID} .{P}-ledg{{opacity:1;}}
  {ID} .{P}-glow{{opacity:.18;}}
  {ID} .{P}-pool{{opacity:.1;}}
  {ID} .{P}-glint{{opacity:0;}}
}}
'''

# ================= SVG =================
SCAN = ''.join(f'<rect x="7" y="{9.6 + i}" width="8" height=".28" fill="#000" opacity=".17"/>'
               for i in range(6))
GLINTS = ('<g class="cath-glint">'
          '<rect x="8" y="9.7" width="1.3" height=".45" fill="#fff"/>'
          '<rect x="9.6" y="10.6" width=".8" height=".4" fill="#fff"/>'
          '<rect x="8.4" y="12.9" width=".6" height=".35" fill="#fff"/></g>')

svg = f'''<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<defs><clipPath id="cath-clip"><rect x="7" y="9" width="8" height="6"/></clipPath></defs>
{shell_svg_inner()}
<g class="cath-syncA"><g class="cath-ant">{antenna_svg_inner()}</g></g>
<rect class="cath-ledr" x="14" y="17" width="1" height="1" fill="#ff4747"/>
<rect class="cath-ledg" x="14" y="17" width="1" height="1" fill="#86ff6e"/>
<g class="cath-syncS"><g class="cath-scr" clip-path="url(#cath-clip)">
<g class="cath-czap"><g class="cath-cjit"><g class="cath-content">
<rect x="7" y="9" width="8" height="6" fill="currentColor" opacity=".13"/>
<g class="cath-band"><rect x="7" y="7.4" width="8" height="1.3" fill="#fff" opacity=".055"/></g>
<g class="cath-eyx"><g class="cath-eyy">{eyes_svg_inner()}</g></g>
<g class="cath-mox">{mouth_svg_inner()}</g>
<g class="cath-heart"><g class="cath-heartt">{srects(HEART)}</g></g>
<g class="cath-z1"><g class="cath-z1t">{srects(ZGLYPH_A)}</g></g>
<g class="cath-z2"><g class="cath-z2t">{srects(ZGLYPH_B)}</g></g>
</g></g></g>
<rect class="cath-bdot" x="10.55" y="11.55" width=".9" height=".8" fill="#eaffdf"/>
<g class="cath-blwrap"><rect class="cath-bline" x="7.15" y="11.62" width="7.7" height=".7" fill="#d9ffcc"/></g>
<g class="cath-bloom"><rect x="7" y="9" width="8" height="6" fill="#7dff5a"/></g>
<rect class="cath-flash" x="7" y="9" width="8" height="6" fill="#ffffff"/>
<g class="cath-zlwrap"><rect class="cath-zline" x="7" y="11.6" width="8" height=".75" fill="#ffffff"/></g>
<rect class="cath-odot" x="10.6" y="11.6" width=".85" height=".72" fill="#ffffff"/>
{static_svg_inner()}
{SCAN}
{GLINTS}
</g></g>
</svg>'''

def scene_html():
    return f'''<div class="mscene" id="ms-cathode">
<div class="cath-glow"></div>
<div class="cath-pool"></div>
<div class="cath-ground"></div><div class="cath-ground2"></div>
<div class="cath-shadow"></div>
<div class="cath-rig"><div class="cath-rigy"><div class="cath-tilt">
{svg}
</div></div></div>
<style>{STYLE}</style>
</div>'''

fragment = scene_html()
(HERE / 'fragment.html').write_text(fragment)

HARNESS = '''<script>/* harnais de test : index.html#t=MS fige le cycle à t (absent du fragment) */
(function(){
  var m = location.hash.match(/t=(\\d+)/);
  if (!m) return;
  var t = +m[1];
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    document.getAnimations().forEach(function(a){
      var d = a.effect.getTiming().duration;
      a.currentTime = t % d; a.pause();
    });
  });});
})();
</script>'''

index = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cathode s'allume</title>
<style>html,body{{margin:0;background:#0a0a0a;min-height:100%;}}
.demo-wrap{{padding-top:60px;}}
.demo-cap{{color:#2a5a1e;font:12px/1.4 monospace;text-align:center;margin-top:14px;}}</style>
</head><body>
<div class="demo-wrap">{fragment}
<div class="demo-cap">&gt; cathode --power-on channel.surf</div>
</div>
{HARNESS}
</body></html>'''
(HERE / 'index.html').write_text(index)
print('built: fragment.html', len(fragment), 'chars ; index.html', len(index), 'chars')
