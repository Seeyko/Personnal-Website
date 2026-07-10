"""Compile la scène « Skate session » : tables de beats (ms) -> keyframes CSS.
Sol parallaxe, roues et vibration de roulage sont ÉCHANTILLONNÉS depuis un
profil de vitesse intégré (les kicks accélèrent réellement le monde).
Sort index.html (démo standalone) + fragment.html (livrable d'intégration).
"""
import sys, pathlib, random, math
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from frames import blip_svg_inner, deck_svg_inner

CYCLE = 12000.0

EASES = {
    'lin': 'linear',
    'sine': 'ease-in-out',
    'out2': 'cubic-bezier(.3,.65,.4,1)',
    'out3': 'cubic-bezier(.2,.75,.3,1)',
    'in3': 'cubic-bezier(.6,0,.9,.5)',
    'inout': 'cubic-bezier(.45,.05,.55,.95)',
    'pop': 'cubic-bezier(.25,1.5,.45,1)',
    'launch': 'cubic-bezier(.2,.7,.42,1)',
    'launch2': 'cubic-bezier(.16,.6,.4,1)',
    'apex': 'cubic-bezier(.4,0,.6,1)',
    'fallin': 'cubic-bezier(.45,.03,.8,.4)',
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

# ================= PROFIL DE VITESSE (px/s, couche proche) =================
# les 3 kicks accélèrent, friction douce entre, l'air conserve, le scrub
# d'atterrissage freine un peu ; v(0) == v(12000) pour une boucle propre.
SPEED = [(0, 130), (900, 105), (1250, 105), (1650, 150), (2200, 138),
         (2550, 138), (2950, 185), (3500, 170), (3800, 170), (4200, 220),
         (6250, 205), (7350, 195), (7420, 180), (9000, 165), (12000, 130)]

def v_at(t):
    for (t0, v0), (t1, v1) in zip(SPEED, SPEED[1:]):
        if t0 <= t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return SPEED[-1][1]

# distance cumulée (trapèzes, pas 10 ms)
_D = [0.0]
for i in range(1, 1201):
    t0, t1 = (i - 1) * 10, i * 10
    _D.append(_D[-1] + (v_at(t0) + v_at(t1)) / 2 * 0.01)
def dist(t):
    i = int(t / 10)
    if i >= 1200:
        return _D[1200]
    f = (t / 10) - i
    return _D[i] + (_D[i + 1] - _D[i]) * f

D_TOTAL = _D[1200]
P_NEAR, P_FAR, FAR_K = 32, 40, 0.45
S_NEAR = round(D_TOTAL / P_NEAR) * P_NEAR / D_TOTAL
S_FAR = round(D_TOTAL * FAR_K / P_FAR) * P_FAR / (D_TOTAL * FAR_K)
DEG_PER_PX = 2.7
S_WHEEL = round(D_TOTAL * DEG_PER_PX / 360) * 360 / (D_TOTAL * DEG_PER_PX)

def sampled(step, fn, ease='lin'):
    t, out = 0, []
    while t < CYCLE:
        out.append((t, fn(t), ease))
        t += step
    out.append((CYCLE, fn(CYCLE), None))
    return out

GNEAR = sampled(100, lambda t: -dist(t) * S_NEAR)
GFAR = sampled(100, lambda t: -dist(t) * FAR_K * S_FAR)
WHEEL = sampled(100, lambda t: dist(t) * DEG_PER_PX * S_WHEEL)

# ---- l'obstacle : borne pixel qui défile AVEC le sol ; Blip l'ollie ----
# centre de l'obstacle sous le rig (x centre-monde ~236) à l'apex t=6820
OBST_T0, OBST_T1, OBST_APEX = 5400, 8600, 6820
OBST_W = 26
def obst_x(t):
    # solidaire de la couche proche : même intégrale de vitesse
    return 223 + (dist(OBST_APEX) - dist(t)) * S_NEAR
OBST = [(0, (0, 500), 'lin'), (OBST_T0 - 1, (0, 500), 'lin')]
t = OBST_T0
while t < OBST_T1:
    OBST.append((t, (1, round(obst_x(t), 1)), 'lin'))
    t += 100
OBST.append((OBST_T1, (0, round(obst_x(OBST_T1), 1)), 'lin'))
OBST.append((CYCLE, (0, 500), None))

# vibration de roulage : bruit déterministe, amplitude ~ vitesse, nulle en l'air
AIR = (6250, 7360)
rng = random.Random(42)
_noise = [rng.random() for _ in range(200)]
def rumble(t):
    if AIR[0] <= t <= AIR[1] or t <= 0 or t >= CYCLE:
        return 0.0
    amp = 0.95 * v_at(t) / 220.0
    return round(-amp * _noise[int(t / 90) % 200], 2)
RUMBLE = sampled(90, rumble, 'sine')

# ================= TABLES DE BEATS =================
# Kicks : ant 900/2350/3650, stroke 1300/2570/3830, ollie pop 6250, land 7350.
JUMP_Y = [
    (0, 0, 'lin'), (6250, 0, 'launch2'), (6620, -56, 'apex'),
    (6820, -62, 'apex'), (7020, -56, 'fallin'), (7350, 0, 'lin'),
    (12000, 0, None),
]
DECK_R = [
    (0, 0, 'lin'),
    # le board tangue légèrement sous chaque poussée (poids sur le tail)
    (1300, 0, 'inout'), (1500, -.8, 'inout'), (1750, .4, 'inout'), (2000, 0, 'lin'),
    (2570, 0, 'inout'), (2770, -.9, 'inout'), (3020, .4, 'inout'), (3270, 0, 'lin'),
    (3830, 0, 'inout'), (4030, -1, 'inout'), (4300, .5, 'inout'), (4560, 0, 'lin'),
    (6180, 0, 'in3'), (6270, -16, 'out3'), (6500, -13, 'inout'),
    (6800, -5, 'inout'), (7100, 4, 'inout'), (7350, 3, 'out3'),
    (7420, -1, 'inout'), (7600, .5, 'inout'), (7800, 0, 'lin'), (12000, 0, None),
]
RIG_X = [
    (0, 0, 'sine'), (1100, -2, 'inout'), (1300, -3, 'out2'), (1650, 6, 'inout'),
    (2200, 2, 'inout'), (2450, 0, 'inout'), (2850, 8, 'inout'),
    (3400, 3, 'inout'), (3750, 1, 'inout'), (4150, 10, 'inout'),
    (4800, 5, 'sine'), (6250, 5, 'out2'), (6700, 10, 'inout'),
    (7350, 8, 'out3'), (7500, 4, 'inout'), (8300, 2, 'sine'),
    (10500, 0, 'sine'), (12000, 0, None),
]
BLIP_Y = [
    (0, 0, 'sine'), (1150, 0, 'inout'), (1300, 3, 'inout'), (1600, 3, 'out2'),
    (1900, 0, 'sine'), (2450, 0, 'inout'), (2570, 3, 'inout'),
    (2900, 3, 'out2'), (3200, 0, 'sine'), (3720, 0, 'inout'),
    (3830, 4, 'inout'), (4180, 4, 'out2'), (4500, 0, 'sine'),
    (6250, 0, 'launch'), (6450, -7, 'inout'), (6750, -1, 'inout'),
    (7000, 0, 'lin'), (7350, 0, 'out3'), (7600, -4, 'inout'),
    (7850, 2, 'inout'), (8100, -1.5, 'inout'), (8350, .7, 'inout'),
    (8600, 0, 'sine'),
    # petit rebond de contentement pendant le smug (transfert de poids)
    (9700, 0, 'inout'), (9950, -2, 'inout'), (10250, 1, 'inout'),
    (10550, 0, 'sine'), (12000, 0, None),
]
BLEAN = [
    (0, -1, 'sine'), (500, .8, 'sine'), (900, -1, 'inout'),
    (1050, -4.5, 'inout'), (1250, -3, 'out2'), (1500, 7, 'pop'),
    (1750, 4, 'inout'), (2100, .5, 'sine'),
    (2350, -5, 'inout'), (2520, -3.5, 'out2'), (2800, 8, 'pop'),
    (3050, 4, 'inout'), (3400, 0, 'sine'),
    (3650, -5.5, 'inout'), (3800, -4, 'out2'), (4080, 9, 'pop'),
    (4350, 5, 'inout'), (4700, -2, 'sine'), (5100, -3, 'sine'),
    (5600, -1, 'inout'), (6000, 2.5, 'inout'), (6250, 2, 'out2'),
    (6400, -7, 'inout'), (6800, -2, 'inout'), (7100, 3, 'inout'),
    (7350, 3, 'out3'), (7480, 10, 'inout'), (7700, -4.5, 'inout'),
    (7950, 2.5, 'inout'), (8200, -1.2, 'inout'), (8450, .5, 'inout'),
    (8700, -.5, 'sine'), (9000, -2.5, 'sine'), (9600, -1, 'sine'),
    (10300, .8, 'sine'), (11200, -1, 'sine'), (12000, -1, None),
]
SHAKE = [
    (0, 0, 'lin'), (7350, 0, 'out3'), (7395, 2.5, 'inout'),
    (7480, -1.2, 'inout'), (7570, .6, 'inout'), (7680, 0, 'lin'),
    (12000, 0, None),
]

BLIP_WINDOWS = {
    'ride': [(0, 900), (1800, 2250), (3080, 3550), (4360, 4800),
             (7900, 8600), (10870, 12000)],
    'crouch': [(900, 1150), (2250, 2450), (3550, 3720), (5600, 5950),
               (7650, 7900)],
    'push-a': [(1150, 1300), (1600, 1800), (2450, 2570), (2900, 3080),
               (3720, 3830), (4180, 4360)],
    'push-b': [(1300, 1600), (2570, 2900), (3830, 4180)],
    'blink-half': [(4800, 4880), (4990, 5070), (10600, 10680), (10790, 10870)],
    'blink-full': [(4880, 4990), (10680, 10790)],
    'look-ahead': [(5070, 5600)],
    'crouch-deep': [(5950, 6270)],
    'stretch': [(6270, 6520), (7120, 7350)],
    'tuck': [(6520, 7120)],
    'land': [(7350, 7650)],
    'look-back': [(8600, 9400)],
    'smug': [(9400, 10600)],
}
DECK_WINDOWS = {
    'flex-mid': [(6180, 6270), (7520, 7700)],
    'flex-deep': [(7350, 7520)],
}
def complement(wd):
    marks = sorted({0, CYCLE} | {t for ws in wd.values() for w in ws for t in w})
    occ = []
    for a, b in zip(marks, marks[1:]):
        mid = (a + b) / 2
        if not any(s <= mid < e for ws in wd.values() for s, e in ws):
            occ.append((a, b))
    return occ
DECK_WINDOWS['normal'] = complement(dict(DECK_WINDOWS))

def check_cover(wd):
    evs = sorted((s, e) for ws in wd.values() for s, e in ws)
    t = 0
    for s, e in evs:
        assert s == t, f'trou/chevauchement à {t}..{s}'
        t = e
    assert t == CYCLE, f'fin à {t}'
check_cover(BLIP_WINDOWS)
check_cover(DECK_WINDOWS)

# ================= POUSSIÈRE / IMPACT =================
def dust_table(bursts, dur, dx, dy, s1, o0=.85):
    """bursts: [ms] ; chaque burst : apparait, dérive (dx,dy), grossit, s'éteint."""
    t = [(0, (0, 0, 0, .5), 'lin')] if bursts[0] > 0 else []
    for ms in bursts:
        if ms > 0:
            t.append((ms - 1, (0, 0, 0, .5), 'lin'))
        t.append((ms, (o0, 0, 0, .6), 'out3'))
        t.append((ms + dur, (0, dx, dy, s1), 'lin'))
    t.append((CYCLE, (0, 0, 0, .5), None))
    return t

PUSH_DUST = dust_table([1380, 2650, 3900], 300, -24, -7, 1.5)
POP_SCUFF = dust_table([6270], 260, -18, -4, 1.3, .7)
LAND_L = dust_table([7360], 420, -30, -9, 1.9, .95)
LAND_R = dust_table([7360], 420, 24, -7, 1.7, .9)

# ombre : dérivée de JUMP_Y (échelle + opacité selon la hauteur)
def shadow_table():
    t = []
    for ms, y, ease in JUMP_Y:
        h = -y
        t.append((ms, (round(max(.5, 1 - h / 200), 3),
                       round(max(.24, .6 - h / 220), 3)), ease))
    return t

# lignes de vent (2 balayages chacune pendant la grande vitesse / le vol)
WIND1 = [
    (0, (0, 460), 'lin'), (4450, (0, 460), 'lin'), (4470, (.32, 430), 'lin'),
    (4880, (0, -90), 'lin'), (6350, (0, 460), 'lin'), (6370, (.38, 430), 'lin'),
    (6820, (0, -90), 'lin'), (12000, (0, 460), None),
]
WIND2 = [
    (0, (0, 470), 'lin'), (5150, (0, 470), 'lin'), (5170, (.26, 440), 'lin'),
    (5600, (0, -90), 'lin'), (6820, (0, 470), 'lin'), (6840, (.32, 440), 'lin'),
    (7300, (0, -90), 'lin'), (12000, (0, 470), None),
]

# ================= CSS =================
A = 'animation'
css = []
css.append(kf('skate-gnear', GNEAR, lambda v: f'background-position-x:{v:.1f}px;'))
css.append(kf('skate-gfar', GFAR, lambda v: f'background-position-x:{v:.1f}px;'))
css.append(kf('skate-wheel', WHEEL, lambda v: f'transform:rotate({v:.1f}deg);'))
css.append(kf('skate-rumble', RUMBLE, lambda v: f'transform:translateY({v}px);'))
css.append(kf('skate-jy', JUMP_Y, lambda v: f'transform:translateY({v}px);'))
css.append(kf('skate-dr', DECK_R, lambda v: f'transform:rotate({v}deg);'))
css.append(kf('skate-rx', RIG_X, lambda v: f'transform:translateX({v}px);'))
css.append(kf('skate-by', BLIP_Y, lambda v: f'transform:translateY({v}px);'))
css.append(kf('skate-bl', BLEAN, lambda v: f'transform:rotate({v}deg);'))
css.append(kf('skate-cam', SHAKE, lambda v: f'transform:translateY({v}px);'))
css.append(kf('skate-shp', shadow_table(),
              lambda v: f'transform:scaleX({v[0]});opacity:{v[1]};'))
for nm, tb in (('pdust', PUSH_DUST), ('scuff', POP_SCUFF),
               ('landl', LAND_L), ('landr', LAND_R)):
    css.append(kf(f'skate-{nm}', tb,
        lambda v: f'opacity:{v[0]};transform:translate({v[1]}px,{v[2]}px) scale({v[3]});'))
css.append(kf('skate-wind1', WIND1, lambda v: f'opacity:{v[0]};transform:translateX({v[1]}px);'))
css.append(kf('skate-wind2', WIND2, lambda v: f'opacity:{v[0]};transform:translateX({v[1]}px);'))
css.append(kf('skate-obst', OBST, lambda v: f'opacity:{v[0]};transform:translateX({v[1]}px);'))
for n, ws in BLIP_WINDOWS.items():
    css.append(frame_kf(f'skate-bfk-{n}', ws))
for n, ws in DECK_WINDOWS.items():
    css.append(frame_kf(f'skate-dfk-{n}', ws))

frames_css = ''.join(
    f'#ms-skate .skate-bf-{n}{{{A}:skate-bfk-{n} 12s step-end infinite;}}'
    for n in BLIP_WINDOWS)
frames_css += ''.join(
    f'#ms-skate .skate-df-{n}{{{A}:skate-dfk-{n} 12s step-end infinite;}}'
    for n in DECK_WINDOWS)

STYLE = f'''
#ms-skate{{position:relative;width:460px;height:420px;margin:0 auto;overflow:hidden;}}
#ms-skate .skate-cam{{position:absolute;inset:0;{A}:skate-cam 12s linear infinite;}}
#ms-skate .skate-gnear{{position:absolute;left:0;right:0;top:369px;height:3px;
  background:repeating-linear-gradient(90deg,#2c6418 0 10px,transparent 10px {P_NEAR}px);
  {A}:skate-gnear 12s linear infinite;}}
#ms-skate .skate-gline{{position:absolute;left:0;right:0;top:373px;height:1px;background:#16300d;}}
#ms-skate .skate-gfar{{position:absolute;left:0;right:0;top:383px;height:2px;opacity:.75;
  background:repeating-linear-gradient(90deg,#16300d 0 6px,transparent 6px {P_FAR}px);
  {A}:skate-gfar 12s linear infinite;}}
#ms-skate .skate-wind{{position:absolute;left:0;width:58px;height:2px;opacity:0;
  border-radius:1px;
  background:linear-gradient(90deg,transparent,#3f8f22 45%,#6fd23c 80%,transparent);}}
#ms-skate .skate-wind1{{top:206px;{A}:skate-wind1 12s linear infinite;}}
#ms-skate .skate-wind2{{top:322px;{A}:skate-wind2 12s linear infinite;}}
#ms-skate .skate-obst{{position:absolute;left:0;top:342px;width:{OBST_W}px;height:28px;
  opacity:0;{A}:skate-obst 12s linear infinite;}}
#ms-skate .skate-obst svg{{display:block;width:100%;height:100%;
  filter:drop-shadow(0 0 4px rgba(255,176,0,.18));}}
#ms-skate .skate-rig{{position:absolute;left:146px;top:0;width:168px;height:420px;
  {A}:skate-rx 12s linear infinite;}}
#ms-skate .skate-shadow{{position:absolute;left:8px;top:364px;width:152px;height:11px;
  border-radius:50%;background:#1d3f10;{A}:skate-shp 12s linear infinite;}}
#ms-skate .skate-jump{{position:absolute;inset:0;{A}:skate-jy 12s linear infinite;}}
#ms-skate .skate-deckp{{position:absolute;left:0;top:322px;width:168px;height:56px;
  transform-origin:42px 48px;{A}:skate-dr 12s linear infinite;}}
#ms-skate .skate-deckp svg{{display:block;width:168px;height:56px;
  filter:drop-shadow(0 0 5px rgba(255,176,0,.14));}}
#ms-skate .skate-df{{opacity:0;}}
#ms-skate .skate-df-normal{{opacity:1;}}
#ms-skate .skate-wsp{{transform-box:fill-box;transform-origin:center;
  {A}:skate-wheel 12s linear infinite;}}
#ms-skate .skate-w2{{animation-delay:-.04s;}}
#ms-skate .skate-blip{{position:absolute;left:0;top:175px;width:168px;height:168px;}}
#ms-skate .skate-rumble{{width:168px;height:168px;{A}:skate-rumble 12s linear infinite;}}
#ms-skate .skate-by{{width:168px;height:168px;{A}:skate-by 12s linear infinite;}}
#ms-skate .skate-blean{{width:168px;height:168px;transform-origin:50% 92%;
  {A}:skate-bl 12s linear infinite;}}
#ms-skate .skate-blean svg{{display:block;width:168px;height:168px;
  filter:drop-shadow(0 0 6px rgba(51,255,0,.16));}}
#ms-skate .skate-bf{{opacity:0;}}
#ms-skate .skate-bf-ride{{opacity:1;}}
#ms-skate .skate-dust{{position:absolute;width:26px;height:16px;opacity:0;
  transform-origin:50% 80%;}}
#ms-skate .skate-dust svg{{display:block;width:100%;height:100%;}}
#ms-skate .skate-pdust{{left:-6px;top:352px;{A}:skate-pdust 12s linear infinite;}}
#ms-skate .skate-scuff{{left:-2px;top:356px;{A}:skate-scuff 12s linear infinite;}}
#ms-skate .skate-landl{{left:12px;top:352px;{A}:skate-landl 12s linear infinite;}}
#ms-skate .skate-landr{{left:126px;top:352px;{A}:skate-landr 12s linear infinite;}}
{frames_css}
{''.join(css)}
@media (prefers-reduced-motion:reduce){{
  #ms-skate *{{animation:none !important;}}
}}
'''

DUST_SVG = '''<svg viewBox="0 0 26 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="2" y="8" width="4" height="4" fill="#eaffdd"/><rect x="19" y="6" width="4" height="4" fill="#eaffdd"/>
<rect x="10" y="2" width="3" height="3" fill="#8dff5a"/><rect x="14" y="11" width="3" height="3" fill="#8dff5a"/>
</svg>'''

# borne de chantier pixel (rayures ambre/rouge) — l'obstacle du trick
OBST_SVG = '''<svg viewBox="0 0 13 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="5" y="1" width="3" height="2" fill="#ffb000"/>
<rect x="4" y="3" width="5" height="2" fill="#ff3333"/>
<rect x="4" y="5" width="5" height="2" fill="#ffb000"/>
<rect x="3" y="7" width="7" height="2" fill="#ff3333"/>
<rect x="3" y="9" width="7" height="2" fill="#ffb000"/>
<rect x="1" y="11" width="11" height="2" fill="#b87800"/>
<rect x="0" y="13" width="13" height="1" fill="#12120f"/>
</svg>'''

def scene_html():
    return f'''<div class="mscene" id="ms-skate">
<div class="skate-cam">
<div class="skate-gnear"></div><div class="skate-gline"></div><div class="skate-gfar"></div>
<div class="skate-wind skate-wind1"></div><div class="skate-wind skate-wind2"></div>
<div class="skate-obst">{OBST_SVG}</div>
<div class="skate-rig">
<div class="skate-shadow"></div>
<div class="skate-dust skate-pdust">{DUST_SVG}</div>
<div class="skate-dust skate-scuff">{DUST_SVG}</div>
<div class="skate-dust skate-landl">{DUST_SVG}</div>
<div class="skate-dust skate-landr">{DUST_SVG}</div>
<div class="skate-jump">
<div class="skate-deckp"><svg viewBox="0 0 24 8" xmlns="http://www.w3.org/2000/svg"><g shape-rendering="crispEdges">{deck_svg_inner()}</g></svg></div>
<div class="skate-blip"><div class="skate-rumble"><div class="skate-by"><div class="skate-blean">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">{blip_svg_inner()}</svg>
</div></div></div></div>
</div>
</div>
</div>
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
      var del = a.effect.getTiming().delay || 0;
      a.currentTime = ((t - del) % d + d) % d + del; a.pause();
    });
  });});
})();
</script>'''

index = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blip — skate session</title>
<style>html,body{{margin:0;background:#0a0a0a;min-height:100%;}}
.demo-wrap{{padding-top:60px;}}
.demo-cap{{color:#2a5a1e;font:12px/1.4 monospace;text-align:center;margin-top:14px;}}</style>
</head><body>
<div class="demo-wrap">{fragment}
<div class="demo-cap">&gt; blip --push --push --push --ollie session.sk8</div>
</div>
{HARNESS}
</body></html>'''
(HERE / 'index.html').write_text(index)
print(f'built: fragment {len(fragment)} chars ; index {len(index)} chars ; '
      f'D={D_TOTAL:.0f}px near_snap={S_NEAR:.4f} wheel_turns={D_TOTAL*DEG_PER_PX*S_WHEEL/360:.0f}')
