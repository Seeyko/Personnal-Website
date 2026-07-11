"""Compile la scène « La Rencontre » (Blip & Cathode) : tables de beats (ms)
-> keyframes CSS. Sort index.html (démo standalone) + fragment.html (intégration).
Cycle maître : 17 000 ms.
"""
import sys, pathlib
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from frames import blip_svg_inner, cathode_svg_inner

CYCLE = 17000.0

EASES = {
    'lin': 'linear',
    'sine': 'ease-in-out',
    'out2': 'cubic-bezier(.3,.65,.4,1)',
    'out3': 'cubic-bezier(.2,.75,.3,1)',
    'launch': 'cubic-bezier(.2,.7,.42,1)',
    'launchbig': 'cubic-bezier(.16,.75,.35,1)',
    'fallin': 'cubic-bezier(.53,.02,.8,.4)',
    'fallinlong': 'cubic-bezier(.5,0,.78,.35)',
    'inout': 'cubic-bezier(.45,.05,.55,.95)',
    'in3': 'cubic-bezier(.6,0,.9,.5)',
    'pop': 'cubic-bezier(.25,1.5,.45,1)',
}

def pct(ms):
    v = round(ms / CYCLE * 100, 4)
    s = f'{v:.4f}'.rstrip('0').rstrip('.')
    return s + '%'

def kf(name, table, fmt):
    """table: [(ms, value, ease|None)] ; ease s'applique au segment SUIVANT."""
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
    stops = frame_windows_to_stops(windows)
    body = ''.join(f'{pct(t)}{{opacity:{v}}}' for t, v in stops)
    return f'@keyframes {name}{{{body}}}'

def check_cover(wd, label):
    evs = sorted((s, e) for ws in wd.values() for s, e in ws)
    t = 0
    for s, e in evs:
        assert s == t, f'{label}: trou/chevauchement à {t}..{s}'
        t = e
    assert t == CYCLE, f'{label}: fin à {t}'

# ================= FENÊTRES DE FRAMES =================
STEP = 185           # 1 frame de marche ; 1 pas = 370 ms
WALK_IN_T0, WALK_IN_N = 1900, 16      # -> fin 4860
WALK_OUT_T0, WALK_OUT_N = 11430, 12   # -> fin 13650

BW = {}
def bwin(n, s, e):
    BW.setdefault(n, []).append((s, e))

bwin('stand', 0, 1900)
for i in range(WALK_IN_N):
    t = WALK_IN_T0 + i * STEP
    bwin('walk-' + 'abcd'[i % 4], t, t + STEP)
bwin('walk-a', 4860, 4950)            # dernier contact étiré (décélération)
bwin('stand', 4950, 5150)
bwin('look-up', 5150, 5450)
bwin('blink-half', 5450, 5520)
bwin('blink-full', 5520, 5590)
bwin('look-up', 5590, 5850)
bwin('anticip', 5850, 6140)
bwin('hop', 6140, 6540)
bwin('land', 6540, 6700)
bwin('look-up', 6700, 7900)
bwin('blush-happy', 7900, 9900)
bwin('blush-smirk', 9900, 10300)
bwin('blush-blink', 10300, 10370)     # double-blink complice
bwin('blush-smirk', 10370, 10440)
bwin('blush-blink', 10440, 10510)
bwin('blush-smirk', 10510, 11000)
bwin('anticip', 11000, 11250)
bwin('hop', 11250, 11430)             # hop-tour (flip au sommet)
for i in range(WALK_OUT_N):
    t = WALK_OUT_T0 + i * STEP
    bwin('walk-' + 'abcd'[i % 4], t, t + STEP)
bwin('walk-a', 13650, 13780)
bwin('stand', 13780, CYCLE)
check_cover(BW, 'blip')

CW = {
    'lids':   [(0, 2950), (15150, CYCLE)],
    'half':   [(2950, 3080), (5680, 5800), (14250, 14400), (14550, 15150)],
    'open':   [(3080, 5680), (5800, 6820), (11000, 14250), (14400, 14550)],
    'wide':   [(6820, 7180)],
    'glitch': [(7180, 7260)],
    'heart-s': [(7260, 7380), (7640, 8440), (8700, 9500), (9760, 10200)],
    'heart-b': [(7380, 7560), (8440, 8620), (9500, 9680)],
    'heart-m': [(7560, 7640), (8620, 8700), (9680, 9760)],
    'happy':  [(10200, 11000)],
}
check_cover(CW, 'cathode')
SMILE_W = [(5300, 6820), (10200, 12700)]

# ================= PISTES FLUIDES — BLIP =================
BX = [
    (0, -150, 'lin'), (1900, -150, 'lin'), (4550, 110, 'out3'), (4950, 138, 'sine'),
    (5850, 138, 'inout'), (6120, 134, 'launchbig'), (6540, 145, 'out2'), (6900, 142, 'lin'),
    (8000, 142, 'inout'), (8200, 139, 'inout'), (8400, 139, 'inout'), (8600, 145, 'inout'),
    (8800, 145, 'inout'), (9000, 139, 'inout'), (9200, 139, 'inout'), (9350, 144, 'inout'),
    (9500, 142, 'lin'),
    (11000, 142, 'inout'), (11240, 147, 'launch'), (11430, 126, 'lin'),
    (11480, 126, 'in3'), (11900, 92, 'lin'), (13780, -150, 'lin'),
    (CYCLE, -150, None),
]

def walk_bob(t0, amps):
    """contacts régulières à 370 ms, apex à +185 ; amps = liste d'amplitudes."""
    out = []
    for k, a in enumerate(amps):
        t = t0 + k * 370
        out.append((t, 0, 'launch'))
        out.append((t + 185, -a, 'fallin'))
    return out

BB = ([(0, 0, 'lin')]
    + walk_bob(1900, [2.5, 4, 4, 4, 4, 4, 3.2, 2.2])
    + [(4860, 0, 'out2'), (5040, -1.4, 'inout'), (5230, 0, 'sine'),
       (5850, 0, 'inout'), (6120, 2, 'lin'),
       (6140, 2, 'launchbig'), (6350, -31, 'fallinlong'), (6540, 0, 'out2'),
       (6620, 1.2, 'out2'), (6700, 0, 'launch'), (6790, -7, 'fallin'),
       (6880, 0, 'out2'), (6960, -2, 'fallin'), (7040, 0, 'sine'),
       # dandine : transferts de poids
       (8000, 0, 'inout'), (8200, -1.5, 'inout'), (8400, 0, 'inout'),
       (8600, -1.5, 'inout'), (8800, 0, 'inout'), (9000, -1.5, 'inout'),
       (9200, 0, 'inout'), (9350, -1.2, 'inout'), (9500, 0, 'sine'),
       (10050, -0.9, 'sine'), (10600, 0, 'sine'),
       (11000, 0, 'inout'), (11230, 1.5, 'lin'),
       (11250, 1.5, 'launch'), (11340, -9, 'fallin'), (11430, 0, 'launch'),
       # marche de sortie, skip de joie au 4e pas
       (11615, -3, 'fallin'), (11800, 0, 'launch'), (11985, -3.5, 'fallin'),
       (12170, 0, 'launch'), (12355, -3.5, 'fallin'),
       (12540, 0, 'launchbig'), (12720, -10, 'fallinlong'), (12910, 0, 'launch'),
       (13095, -3.5, 'fallin'), (13280, 0, 'launch'), (13465, -3, 'fallin'),
       (13650, 0, 'lin'), (CYCLE, 0, None)])

def walk_lean(t0, n, hi=4.4, lo=2.4, first=None):
    out = []
    for i in range(n):
        v = hi if i % 2 == 0 else lo
        if i == 0 and first is not None:
            v = first
        out.append((t0 + i * STEP, v, 'inout'))
    return out

BL = ([(0, 0, 'lin'), (1900, 0, 'out2')]
    + walk_lean(1900 + STEP, WALK_IN_N - 1)
    + [(4860, 3, 'out2'), (5080, 6.5, 'inout'), (5350, -2.5, 'inout'),
       (5620, 1.2, 'inout'), (5850, 0, 'inout'), (6120, -7, 'lin'),
       (6140, -7, 'launchbig'), (6350, 9, 'inout'), (6540, 3, 'out2'),
       (6700, -3, 'inout'), (6880, 1.5, 'inout'), (7040, 0, 'sine'),
       (8000, -4.5, 'inout'), (8400, 4.5, 'inout'), (8800, -4.5, 'inout'),
       (9200, 3.5, 'inout'), (9500, 0, 'sine'),
       (9900, -1.1, 'sine'), (10400, 0.9, 'sine'), (10750, -0.4, 'sine'),
       (11000, 0, 'inout'), (11230, 4, 'lin'),
       (11250, 4, 'launch'), (11430, -6, 'out2')]
    + walk_lean(11430 + STEP, WALK_OUT_N - 1)
    + [(13650, 2, 'sine'), (14100, 0, 'lin'), (CYCLE, 0, None)])

FLIP = [(0, 1, 'lin'), (11339, 1, 'lin'), (11340, -1, 'lin'),
        (13999, -1, 'lin'), (14000, 1, 'lin'), (CYCLE, 1, None)]

def bshadow_table():
    t = []
    for ms, y, ease in BB:
        h = max(0.0, -y)
        s = round(max(.55, 1 - h / 110), 3)
        o = round(max(.18, .5 - h / 160), 3)
        t.append((ms, (s, o), ease))
    return t

# ================= PISTES FLUIDES — CATHODE =================
ANT = [
    (0, 62, 'sine'), (900, 64.5, 'sine'), (1800, 62, 'sine'),
    (2650, 62, 'out2'), (2720, 55, 'inout'), (2800, 63, 'sine'), (2870, 62, 'inout'),
    (2950, 62, 'inout'), (3040, 68, 'launchbig'),            # anticipation vers le bas
    (3180, -10, 'inout'), (3330, 6, 'inout'), (3470, -3, 'inout'),
    (3600, 1.5, 'inout'), (3720, 0, 'sine'),                 # ressort amorti
    (4300, 1.2, 'sine'), (5000, -0.8, 'sine'), (5700, 0.5, 'sine'), (6300, 0, 'inout'),
    (6820, 0, 'in3'), (6920, -13, 'inout'), (7060, 9, 'inout'),
    (7200, -4.5, 'inout'), (7340, 2, 'inout'), (7460, 0, 'sine'),   # sursaut
    (8500, 2.4, 'out2'), (8800, 0, 'sine'), (9560, 2.4, 'out2'), (9860, 0, 'sine'),
    (10600, 0.9, 'sine'), (11600, -0.6, 'sine'), (12800, 0.5, 'sine'), (13800, 0, 'inout'),
    (14950, 0, 'inout'), (15100, -4, 'fallinlong'),          # remonte avant de tomber
    (15450, 68, 'out2'), (15600, 55, 'inout'), (15760, 65.5, 'inout'),
    (15940, 60.2, 'inout'), (16200, 62.6, 'sine'), (16600, 62, 'sine'),
    (CYCLE, 62, None),
]

CEYES = [
    (0, (0, 0), 'lin'), (3050, (0, 0), 'pop'), (3200, (-1.35, 0.25), 'inout'),
    (3360, (-1.0, 0.3), 'sine'), (4950, (-0.75, 0.65), 'sine'),
    (6000, (-0.75, 0.65), 'inout'), (6420, (-0.85, -0.55), 'out2'),
    (6700, (-0.8, 0.3), 'inout'), (6900, (-0.75, 0.6), 'sine'),
    (11000, (-0.8, 0.65), 'sine'), (11500, (-0.85, 0.6), 'sine'),
    (13650, (-1.35, 0.3), 'inout'), (14250, (-1.35, 0.3), 'inout'),
    (14900, (-0.15, 0.4), 'sine'), (15150, (0, 0.3), 'sine'),
    (CYCLE, (0, 0), None),
]

CATB = [
    (0, (0, 1), 'lin'), (6820, (0, 1), 'lin'), (6840, (1.5, .985), 'pop'),
    (6950, (-5, 1.02), 'fallin'), (7050, (0, .955), 'out2'),
    (7150, (0, 1.02), 'inout'), (7260, (0, 1), 'lin'),
    (7380, (0, 1), 'out2'), (7450, (-1.4, 1.006), 'inout'), (7580, (0, 1), 'lin'),
    (8440, (0, 1), 'out2'), (8510, (-1.4, 1.006), 'inout'), (8640, (0, 1), 'lin'),
    (9500, (0, 1), 'out2'), (9570, (-1.4, 1.006), 'inout'), (9700, (0, 1), 'lin'),
    (CYCLE, (0, 1), None),
]

CLEAN = [
    (0, 0, 'lin'), (7260, 0, 'inout'), (7600, -2.6, 'sine'), (8600, -2.0, 'sine'),
    (9500, -2.6, 'sine'), (10500, -2.2, 'inout'), (11100, -0.8, 'sine'),
    (11700, -1.7, 'sine'), (13400, -1.9, 'sine'), (14600, -0.3, 'sine'),
    (15400, 0, 'sine'), (CYCLE, 0, None),
]

WASH = [
    (0, 0, 'lin'), (7255, 0, 'lin'), (7260, .12, 'out2'), (7380, .2, 'out2'),
    (7700, .11, 'sine'), (8440, .2, 'out2'), (8760, .11, 'sine'),
    (9500, .2, 'out2'), (9820, .11, 'sine'), (10150, .1, 'inout'),
    (10250, 0, 'lin'), (CYCLE, 0, None),
]
CGLOW = [(ms, round(min(.5, v * 2.4), 3), e) for ms, v, e in WASH]

ZZGATE = [
    (0, 1, 'lin'), (2870, 1, 'out2'), (2950, 0, 'lin'),
    (15650, 0, 'sine'), (15950, 1, 'lin'), (CYCLE, 1, None),
]

# ================= PROPS =================
SPARK = [
    (0, (0, .4), 'lin'), (3170, (0, .4), 'lin'), (3180, (.95, .5), 'out3'),
    (3430, (0, 1.7), 'lin'), (CYCLE, (0, .4), None),
]
PUFF = [
    (0, (0, .5), 'lin'), (6535, (0, .5), 'lin'), (6540, (.9, .55), 'out3'),
    (6790, (0, 1.6), 'lin'), (CYCLE, (0, .5), None),
]
HEARTP = [  # (opacity, ty, tx) petit coeur qui s'échappe de Blip
    (0, (0, 0, 0), 'lin'), (8295, (0, 0, 0), 'lin'), (8300, (0, 2, 0), 'out2'),
    (8390, (.95, -4, 1), 'sine'), (8800, (.85, -18, -3), 'sine'),
    (9150, (.55, -30, 2), 'sine'), (9500, (0, -41, 0), 'lin'),
    (CYCLE, (0, 0, 0), None),
]
NOTE = [    # cycle alterné : Blip fredonne
    (0, (0, 0, 0), 'lin'), (8995, (0, 0, 0), 'lin'), (9000, (0, 2, 0), 'out2'),
    (9090, (.9, -2, 1), 'sine'), (9450, (.8, -14, -2), 'sine'),
    (9800, (0, -24, 1), 'lin'), (CYCLE, (0, 0, 0), None),
]

# ================= CSS =================
A = 'animation'
css = []
css.append(kf('duo-bx', BX, lambda v: f'transform:translateX({v}px);'))
css.append(kf('duo-bb', BB, lambda v: f'transform:translateY({v}px);'))
css.append(kf('duo-bl', BL, lambda v: f'transform:rotate({v}deg);'))
css.append(kf('duo-bflipk', FLIP, lambda v: f'transform:scaleX({v});'))
css.append(kf('duo-bsh', bshadow_table(), lambda v: f'transform:scale({v[0]});opacity:{v[1]};'))
css.append(kf('duo-antk', ANT, lambda v: f'transform:rotate({v}deg);'))
css.append(kf('duo-ceyesk', CEYES, lambda v: f'transform:translate({v[0]}px,{v[1]}px);'))
css.append(kf('duo-catbk', CATB, lambda v: f'transform:translateY({v[0]}px) scaleY({v[1]});'))
css.append(kf('duo-cleank', CLEAN, lambda v: f'transform:rotate({v}deg);'))
css.append(kf('duo-washk', WASH, lambda v: f'opacity:{v};'))
css.append(kf('duo-cglowk', CGLOW, lambda v: f'opacity:{v};'))
css.append(kf('duo-zzgatek', ZZGATE, lambda v: f'opacity:{v};'))
css.append(kf('duo-sparkk', SPARK, lambda v: f'opacity:{v[0]};transform:scale({v[1]});'))
css.append(kf('duo-puffk', PUFF, lambda v: f'opacity:{v[0]};transform:scale({v[1]});'))
css.append(kf('duo-heartpk', HEARTP, lambda v: f'opacity:{v[0]};transform:translate({v[2]}px,{v[1]}px);'))
css.append(kf('duo-notek', NOTE, lambda v: f'opacity:{v[0]};transform:translate({v[2]}px,{v[1]}px);'))
for name, ws in BW.items():
    css.append(frame_kf(f'duo-bfk-{name}', ws))
for name, ws in CW.items():
    css.append(frame_kf(f'duo-cfk-{name}', ws))
css.append(frame_kf('duo-smilek', SMILE_W))
# boucles courtes indépendantes (diviseurs de 17000)
css.append('@keyframes duo-breathk{0%{transform:scale(1,1)}55%{transform:scale(1.005,.988)}100%{transform:scale(1,1)}}')
css.append('@keyframes duo-ledk{0%,100%{opacity:.35}50%{opacity:1}}')
css.append('@keyframes duo-zfloat{0%{transform:translateY(0);opacity:0}18%{opacity:.85}70%{opacity:.4}100%{transform:translateY(-3.4px);opacity:0}}')
css.append('@keyframes duo-cshk{0%,100%{transform:scaleX(1)}55%{transform:scaleX(1.018)}}')
css.append('@keyframes duo-mote1{0%{transform:translate(0,0);opacity:0}20%{opacity:.3}80%{opacity:.12}100%{transform:translate(26px,-64px);opacity:0}}')
css.append('@keyframes duo-mote2{0%{transform:translate(0,0);opacity:0}25%{opacity:.22}75%{opacity:.1}100%{transform:translate(-30px,-52px);opacity:0}}')

frames_css = ''.join(
    f'#ms-duo .duo-bf-{n}{{{A}:duo-bfk-{n} 17s step-end infinite;}}' for n in BW)
frames_css += ''.join(
    f'#ms-duo .duo-cf-{n}{{{A}:duo-cfk-{n} 17s step-end infinite;}}' for n in CW)

STYLE = f'''
#ms-duo{{position:relative;width:460px;height:420px;margin:0 auto;overflow:hidden;}}
#ms-duo .duo-ground{{position:absolute;left:20px;right:20px;top:390px;height:2px;
  background:repeating-linear-gradient(90deg,#1e3b14 0 8px,transparent 8px 14px);}}
#ms-duo .duo-ground2{{position:absolute;left:44px;right:44px;top:396px;height:1px;
  background:repeating-linear-gradient(90deg,#142a0e 0 5px,transparent 5px 13px);}}
#ms-duo .duo-mote{{position:absolute;width:3px;height:3px;background:#2f7a1d;opacity:0;}}
#ms-duo .duo-mote1{{left:96px;top:150px;{A}:duo-mote1 8.5s linear infinite;}}
#ms-duo .duo-mote2{{left:360px;top:120px;{A}:duo-mote2 8.5s linear infinite;animation-delay:-4.2s;}}
#ms-duo .duo-sh-blip{{position:absolute;left:84px;top:386px;width:0;height:0;
  {A}:duo-bx 17s linear infinite;}}
#ms-duo .duo-sh-blip i{{position:absolute;left:-44px;top:0;width:88px;height:10px;
  border-radius:50%;background:#16320e;{A}:duo-bsh 17s linear infinite;}}
#ms-duo .duo-sh-cath{{position:absolute;left:283px;top:385px;width:110px;height:12px;
  border-radius:50%;background:#171713;{A}:duo-cshk 3.4s ease-in-out infinite;}}
#ms-duo .duo-cglow{{position:absolute;left:268px;top:248px;width:150px;height:120px;opacity:0;
  background:radial-gradient(closest-side,rgba(255,51,51,.5),transparent 70%);
  {A}:duo-cglowk 17s linear infinite;}}
#ms-duo .duo-blip{{position:absolute;left:0;top:222px;width:168px;height:168px;
  {A}:duo-bx 17s linear infinite;}}
#ms-duo .duo-bflip{{width:168px;height:168px;{A}:duo-bflipk 17s linear infinite;}}
#ms-duo .duo-blean{{width:168px;height:168px;transform-origin:50% 96%;
  {A}:duo-bl 17s linear infinite;}}
#ms-duo .duo-bbob{{width:168px;height:168px;{A}:duo-bb 17s linear infinite;}}
#ms-duo .duo-bbob > svg{{display:block;width:168px;height:168px;
  filter:drop-shadow(0 0 6px rgba(51,255,0,.16));}}
#ms-duo .duo-bf{{opacity:0;}}
#ms-duo .duo-bf-blush-smirk{{opacity:1;}}
#ms-duo .duo-puff{{position:absolute;left:56px;top:146px;width:56px;height:30px;opacity:0;
  transform-origin:50% 75%;{A}:duo-puffk 17s linear infinite;}}
#ms-duo .duo-puff svg{{display:block;width:100%;height:100%;}}
#ms-duo .duo-heartp{{position:absolute;left:64px;top:56px;width:22px;height:20px;opacity:0;
  {A}:duo-heartpk 17s linear infinite;}}
#ms-duo .duo-heartp svg,#ms-duo .duo-note svg{{display:block;width:100%;height:100%;}}
#ms-duo .duo-notegate{{position:absolute;left:104px;top:64px;width:16px;height:20px;opacity:0;}}
#ms-duo.duo-alt .duo-notegate{{opacity:1;}}
#ms-duo .duo-note{{width:100%;height:100%;opacity:0;{A}:duo-notek 17s linear infinite;}}
#ms-duo .duo-cath{{position:absolute;left:264px;top:222px;width:168px;height:168px;}}
#ms-duo .duo-cbounce{{width:168px;height:168px;transform-origin:50% 92%;
  {A}:duo-catbk 17s linear infinite;}}
#ms-duo .duo-clean{{width:168px;height:168px;transform-origin:50% 92%;
  {A}:duo-cleank 17s linear infinite;}}
#ms-duo .duo-cbreath{{width:168px;height:168px;transform-origin:50% 92%;
  {A}:duo-breathk 3.4s ease-in-out infinite;}}
#ms-duo .duo-cbreath > svg{{display:block;width:168px;height:168px;
  filter:drop-shadow(0 0 7px rgba(255,235,190,.10));}}
#ms-duo .duo-spark{{position:absolute;left:100px;top:-6px;width:40px;height:36px;opacity:0;
  transform-origin:50% 60%;{A}:duo-sparkk 17s linear infinite;}}
#ms-duo .duo-spark svg{{display:block;width:100%;height:100%;}}
#ms-duo .duo-ant{{transform-box:fill-box;transform-origin:50% 100%;
  {A}:duo-antk 17s linear infinite;}}
#ms-duo .duo-ceyes{{{A}:duo-ceyesk 17s linear infinite;}}
#ms-duo .duo-cf{{opacity:0;}}
#ms-duo .duo-cf-heart-s{{opacity:1;}}
#ms-duo .duo-smile{{opacity:0;{A}:duo-smilek 17s step-end infinite;}}
#ms-duo .duo-wash{{opacity:0;{A}:duo-washk 17s linear infinite;}}
#ms-duo .duo-zz{{opacity:0;{A}:duo-zzgatek 17s linear infinite;}}
#ms-duo .duo-z{{{A}:duo-zfloat 1.7s linear infinite;}}
#ms-duo .duo-z2{{animation-delay:-.85s;}}
#ms-duo .duo-led{{{A}:duo-ledk 1.7s ease-in-out infinite;}}
{frames_css}
{''.join(css)}
@media (prefers-reduced-motion:reduce){{
  #ms-duo *{{animation:none !important;}}
  #ms-duo .duo-blip,#ms-duo .duo-sh-blip{{transform:translateX(142px);}}
  #ms-duo .duo-cglow{{opacity:.22;}}
  #ms-duo .duo-wash{{opacity:.12;}}
}}
'''

PUFF_SVG = '''<svg viewBox="0 0 56 30" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="4" y="16" width="7" height="7" fill="#eaffdd" opacity=".8"/><rect x="44" y="13" width="7" height="7" fill="#eaffdd" opacity=".8"/>
<rect x="18" y="6" width="5" height="5" fill="#8dff5a" opacity=".8"/><rect x="32" y="20" width="5" height="5" fill="#8dff5a" opacity=".8"/>
</svg>'''
SPARK_SVG = '''<svg viewBox="0 0 40 36" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="18" y="0" width="4" height="8" fill="#ffb000"/><rect x="18" y="26" width="4" height="8" fill="#ffb000"/>
<rect x="2" y="15" width="8" height="4" fill="#ffb000"/><rect x="30" y="15" width="8" height="4" fill="#ffb000"/>
<rect x="8" y="6" width="4" height="4" fill="#fff8e8"/><rect x="28" y="24" width="4" height="4" fill="#fff8e8"/>
</svg>'''
HEARTP_SVG = '''<svg viewBox="0 0 7 6" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="1" y="0" width="2" height="1" fill="#ff3333"/><rect x="4" y="0" width="2" height="1" fill="#ff3333"/>
<rect x="0" y="1" width="7" height="2" fill="#ff3333"/><rect x="1" y="3" width="5" height="1" fill="#ff3333"/>
<rect x="2" y="4" width="3" height="1" fill="#c21f1f"/><rect x="3" y="5" width="1" height="1" fill="#c21f1f"/>
</svg>'''
NOTE_SVG = '''<svg viewBox="0 0 8 10" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="5" y="0" width="1" height="7" fill="#ffb000"/><rect x="6" y="0" width="2" height="2" fill="#ffb000"/>
<rect x="3" y="6" width="3" height="3" fill="#ffb000"/>
</svg>'''

JS = '''<script>(function(){
var r=document.getElementById('ms-duo');if(!r)return;
var n=0;setInterval(function(){n++;r.classList.toggle('duo-alt',n%2===1);},17000);
})();</script>'''

def scene_html():
    return f'''<div class="mscene" id="ms-duo">
<div class="duo-ground"></div><div class="duo-ground2"></div>
<div class="duo-mote duo-mote1"></div><div class="duo-mote duo-mote2"></div>
<div class="duo-cglow"></div>
<div class="duo-sh-cath"></div>
<div class="duo-sh-blip"><i></i></div>
<div class="duo-cath">
<div class="duo-cbounce"><div class="duo-clean"><div class="duo-cbreath">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">{cathode_svg_inner()}</svg>
</div></div></div>
<div class="duo-spark">{SPARK_SVG}</div>
</div>
<div class="duo-blip"><div class="duo-bflip">
<div class="duo-blean"><div class="duo-bbob">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">{blip_svg_inner()}</svg>
</div></div>
<div class="duo-puff">{PUFF_SVG}</div>
<div class="duo-heartp">{HEARTP_SVG}</div>
<div class="duo-notegate"><div class="duo-note">{NOTE_SVG}</div></div>
</div></div>
<style>{STYLE}</style>
{JS}
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
      a.currentTime = t;
      a.pause();
    });
  });});
})();
</script>'''

index = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blip &amp; Cathode — la rencontre</title>
<style>html,body{{margin:0;background:#0a0a0a;min-height:100%;}}
.demo-wrap{{padding-top:60px;}}
.demo-cap{{color:#2a5a1e;font:12px/1.4 monospace;text-align:center;margin-top:14px;}}</style>
</head><body>
<div class="demo-wrap">{fragment}
<div class="demo-cap">&gt; ./rencontre --blip --cathode</div>
</div>
{HARNESS}
</body></html>'''
(HERE / 'index.html').write_text(index)
print('built: fragment.html', len(fragment), 'chars ; index.html', len(index), 'chars')
