"""Compile la scène « La jongle du cœur » : tables de beats (ms) -> keyframes CSS.
Sort index.html (démo standalone) + fragment.html (livrable d'intégration).
"""
import sys, pathlib
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from frames import blip_svg_inner, heart_svg_inner

CYCLE = 12000.0

EASES = {
    'lin': 'linear',
    'sine': 'ease-in-out',
    'out2': 'cubic-bezier(.3,.65,.4,1)',
    'out3': 'cubic-bezier(.2,.75,.3,1)',
    'launch': 'cubic-bezier(.2,.7,.42,1)',
    'launchg': 'cubic-bezier(.25,.6,.5,1)',
    'launchbig': 'cubic-bezier(.16,.75,.35,1)',
    'fallin': 'cubic-bezier(.53,.02,.8,.4)',
    'fallinlong': 'cubic-bezier(.5,0,.78,.35)',
    'inout': 'cubic-bezier(.45,.05,.55,.95)',
    'in3': 'cubic-bezier(.6,0,.9,.5)',
    'pop': 'cubic-bezier(.25,1.5,.45,1)',
    'drag': 'cubic-bezier(.25,.35,.6,.9)',
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
    """fenêtres [start,end) -> stops (ms, opacity) pour step-end."""
    ws = sorted(windows)
    # merge adjacentes
    merged = []
    for s, e in ws:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(e, merged[-1][1]))
        else:
            merged.append((s, e))
    stops = []
    vis0 = merged and merged[0][0] == 0
    stops.append((0, 1 if vis0 else 0))
    for s, e in merged:
        if s > 0:
            stops.append((s, 1))
        if e < CYCLE:
            stops.append((e, 0))
    # dédoublonne (garde le dernier)
    out = {}
    for t, v in stops:
        out[t] = v
    return sorted(out.items())

def frame_kf(name, windows):
    stops = frame_windows_to_stops(windows)
    body = ''.join(f'{pct(t)}{{opacity:{v}}}' for t, v in stops)
    return f'@keyframes {name}{{{body}}}'

# ================= TABLES DE BEATS =================
# Rebonds : impact 0 / 1750 / 3650(gag) / catch 5150 / hops 7000-8600 / gros lancer 9700 -> boucle
HEART_Y = [
    (0, 0, 'out3'), (100, 14, 'lin'), (150, 14, 'launch'), (900, -110, 'fallin'),
    (1750, 0, 'out3'), (1850, 14, 'lin'), (1900, 14, 'launch'),
    (2760, -135, 'fallin'),
    (3650, 0, 'out3'), (3750, 14, 'lin'), (3800, 14, 'launchg'),
    (4420, -85, 'fallin'), (5150, 0, 'out3'),
    (5300, 20, 'lin'), (5320, 20, 'inout'), (5560, -26, 'fallin'), (5760, 2, 'out2'),
    (5900, -7, 'fallin'), (6040, 0, 'sine'), (6520, -2, 'sine'),
    (7000, 0, 'inout'), (7200, 13, 'launch'), (7300, -16, 'fallin'), (7460, 3, 'out2'),
    (7600, 0, 'inout'), (7720, 13, 'launch'), (7820, -16, 'fallin'), (7990, 3, 'out2'),
    (8130, 0, 'inout'), (8250, 13, 'launch'), (8350, -16, 'fallin'), (8520, 3, 'out2'),
    (8660, 0, 'sine'), (9020, -2, 'sine'), (9400, 0, 'out3'),
    (9540, 14, 'lin'), (9560, 14, 'out3'),
    (9700, 20, 'launchbig'), (10850, -160, 'fallinlong'), (12000, 0, None),
]
HEART_X = [
    (0, 0, 'lin'), (3800, 0, 'drag'), (5150, 120, 'lin'),
    (7200, 120, 'inout'), (7390, 82, 'lin'), (7720, 82, 'inout'), (7910, 42, 'lin'),
    (8250, 42, 'inout'), (8440, 2, 'out2'), (8660, 0, 'lin'), (12000, 0, None),
]
HEART_R = [
    (0, 0, 'out2'), (150, -3, 'launch'), (900, 7, 'lin'), (1750, -3, 'out2'),
    (1900, -6, 'launch'), (2760, -9, 'lin'), (3650, 4, 'out2'),
    (3800, 2, 'launchg'), (4420, 13, 'lin'), (5150, 19, 'out3'),
    (5320, 10, 'inout'), (5560, -8, 'inout'), (5780, 4, 'inout'), (5960, -2, 'inout'),
    (6150, 0, 'sine'), (6600, 1.5, 'sine'), (7080, 0, 'inout'),
    (7280, 5, 'inout'), (7480, -3, 'inout'), (7620, 1, 'inout'),
    (7800, 5, 'inout'), (8010, -3, 'inout'), (8150, 1, 'inout'),
    (8330, 5, 'inout'), (8540, -3, 'inout'), (8700, 0, 'sine'),
    (9050, -1.5, 'sine'), (9400, 0, 'inout'), (9700, -6, 'launchbig'),
    (10850, 195, 'fallinlong'), (12000, 360, None),
]
BLIP_X = [
    # micro-danse du jongleur : il se recale sous le cœur, revient à 0 avant chaque impact
    (0, 0, 'inout'), (600, 3, 'inout'), (1200, 3, 'inout'), (1560, 0, 'lin'),
    (1750, 0, 'inout'), (2350, -3, 'inout'), (2950, -3, 'inout'), (3450, 0, 'lin'),
    (4180, 0, 'out2'), (4300, -7, 'in3'), (4720, 55, 'lin'),
    (5020, 127, 'out3'), (5170, 119, 'inout'), (5350, 120, 'lin'),
    (7130, 120, 'inout'), (7330, 81, 'lin'), (7663, 81, 'inout'), (7863, 41, 'lin'),
    (8196, 41, 'inout'), (8396, 1, 'out2'), (8600, 0, 'lin'),
    # pas d'ajustement sous le grand vol
    (10450, 0, 'inout'), (10750, -4, 'inout'), (11050, 2, 'inout'), (11450, 0, 'lin'),
    (12000, 0, None),
]
BLIP_LEAN = [
    (0, -1.2, 'inout'), (300, 1.2, 'out2'), (900, 0, 'sine'),
    (1650, -.5, 'inout'), (1780, -1.2, 'inout'), (2050, 1.2, 'out2'), (2760, 0, 'sine'),
    (3560, -.5, 'inout'), (3680, -1.2, 'inout'), (3950, 2, 'out2'),
    (4150, 3.5, 'pop'), (4330, -5, 'inout'), (4600, 9, 'inout'), (4950, 12, 'out2'),
    (5100, -3, 'inout'), (5330, 1, 'inout'), (5600, 0, 'sine'),
    (7060, -1, 'inout'), (7180, -6, 'inout'), (7400, -4, 'inout'),
    (7590, -1, 'inout'), (7710, -6, 'inout'), (7930, -4, 'inout'),
    (8122, -1, 'inout'), (8240, -6, 'inout'), (8470, -3, 'inout'), (8700, 0, 'sine'),
    (9430, -1.5, 'inout'), (9720, 1, 'out2'), (9950, 0, 'sine'),
    (10750, -1, 'inout'), (11050, .8, 'inout'), (11400, 0, 'inout'),
    (11800, 0, 'inout'), (12000, -1.2, None),
]
BLIP_BOB = [
    (0, 0, 'lin'), (4320, 0, 'inout'), (4405, -3, 'inout'), (4510, 0, 'inout'),
    (4615, -3, 'inout'), (4720, 0, 'inout'), (4825, -3, 'inout'), (4930, 0, 'inout'),
    (5040, -2, 'inout'), (5150, 0, 'lin'),
    (5900, 0, 'sine'), (6300, -1.5, 'sine'), (6700, 0, 'lin'),
    (7130, 0, 'out3'), (7230, -13, 'fallin'), (7330, 0, 'lin'),
    (7663, 0, 'out3'), (7763, -13, 'fallin'), (7863, 0, 'lin'),
    (8196, 0, 'out3'), (8296, -13, 'fallin'), (8396, 0, 'lin'),
    (9000, -1, 'sine'), (9300, 0, 'lin'), (10400, -1, 'sine'), (11000, 0, 'lin'),
    (12000, 0, None),
]

BLIP_WINDOWS = {
    'crouch': [(0,150),(1750,1900),(3650,3800),(5400,5560),(7000,7130),(7533,7663),(8066,8196),(9400,9560)],
    'stretch': [(150,330),(1900,2080),(3800,3980),(7130,7330),(7663,7863),(8196,8396),(9700,9880)],
    'stand-up': [(330,900),(1130,1680),(2080,2600),(2830,3560),(3980,4150),(8600,8950),(9180,9400),(9880,10600),(10830,11800)],
    'stand-mid': [(1680,1750),(3560,3650),(5560,5700),(6900,7000),(7330,7533),(7863,8066),(8396,8600),(11800,12000)],
    'blink-half': [(900,970),(1060,1130),(2600,2670),(2760,2830),(8950,9020),(9110,9180),(10600,10670),(10760,10830)],
    'blink-full': [(970,1060),(2670,2760),(9020,9110),(10670,10760)],
    'alarm': [(4150,4320),(5055,5150)],
    'run1': [(4320,4425),(4530,4635),(4740,4845),(4950,5055)],
    'run2': [(4425,4530),(4635,4740),(4845,4950)],
    'crouch-deep': [(5150,5400),(9560,9700)],
    'relief': [(5700,6900)],
}

HEART_WINDOWS = {
    's': [(0,140),(1750,1890),(5150,5400)],
    't': [(140,320),(1620,1750),(1890,2060),(3520,3650),(3790,3960),(5020,5150),(9660,10050),(11800,12000)],
}
# 'n' = complément
def complement(windows_dict):
    marks = sorted({0, CYCLE} | {t for ws in windows_dict.values() for w in ws for t in w})
    occ = []
    for a, b in zip(marks, marks[1:]):
        mid = (a + b) / 2
        busy = any(s <= mid < e for ws in windows_dict.values() for s, e in ws)
        if not busy:
            occ.append((a, b))
    return occ
HEART_WINDOWS['n'] = complement({k: v for k, v in HEART_WINDOWS.items()})

# vérification de couverture des frames Blip
def check_cover(wd):
    evs = sorted((s, e) for ws in wd.values() for s, e in ws)
    t = 0
    for s, e in evs:
        assert s == t, f'trou/chevauchement à {t}..{s}'
        t = e
    assert t == CYCLE, f'fin à {t}'
check_cover(BLIP_WINDOWS)

# ================= PROPS =================
def burst_table(spikes, s0=.5, s1=1.6, o0=.85, dur=170):
    """spikes: [(ms, scale_boost)] -> table (ms, (o,s), ease) avec resets step."""
    t = []
    if spikes[0][0] > 0:
        t.append((0, (0, s0), 'lin'))
    for ms, boost in spikes:
        if ms > 0:
            t.append((ms - 1, (0, s0), 'lin'))   # reset juste avant
        t.append((ms, (o0, s0), 'out3'))
        t.append((ms + dur, (0, s1 * boost), 'lin'))
    t.append((CYCLE, (0, s0), None))
    return t

PUFF = burst_table([(0, 1), (1750, 1), (5150, 1.35)])
MARK = [
    (0, (0, .3, 0), 'lin'), (4149, (0, .3, 0), 'lin'),
    (4150, (0, .3, 0), 'pop'), (4270, (1, 1.22, -2), 'inout'), (4400, (1, 1, 1), 'lin'),
    (4780, (1, 1, 0), 'inout'), (4930, (0, .7, 4), 'lin'), (CYCLE, (0, .3, 0), None),
]
SWEAT = [
    (0, (0, 0), 'lin'), (5750, (0, 0), 'lin'), (5790, (1, 2), 'lin'),
    (6050, (1, 11), 'fallin'), (6360, (0, 36), 'lin'), (CYCLE, (0, 0), None),
]

# ombre du cœur : dérivée de HEART_Y
def hshadow_table():
    t = []
    for ms, y, ease in HEART_Y:
        h = max(0.0, -y)
        s = max(.38, 1 - h / 250)
        o = max(.16, .55 - h / 330)
        t.append((ms, (round(s, 3), round(o, 3)), ease))
    return t

# ================= CSS =================
css_parts = []
A = 'animation'
css_parts.append(kf('jongle-hy', HEART_Y, lambda v: f'transform:translateY({v}px);'))
css_parts.append(kf('jongle-hx', HEART_X, lambda v: f'transform:translateX({v}px);'))
css_parts.append(kf('jongle-hr', HEART_R, lambda v: f'transform:rotate({v}deg);'))
css_parts.append(kf('jongle-bx', BLIP_X, lambda v: f'transform:translateX({v}px);'))
css_parts.append(kf('jongle-bl', BLIP_LEAN, lambda v: f'transform:rotate({v}deg);'))
css_parts.append(kf('jongle-bb', BLIP_BOB, lambda v: f'transform:translateY({v}px);'))
css_parts.append(kf('jongle-puff', PUFF, lambda v: f'opacity:{v[0]};transform:scale({v[1]});'))
css_parts.append(kf('jongle-mark', MARK, lambda v: f'opacity:{v[0]};transform:translateY({v[2]}px) scale({v[1]});'))
css_parts.append(kf('jongle-sweat', SWEAT, lambda v: f'opacity:{v[0]};transform:translateY({v[1]}px);'))
css_parts.append(kf('jongle-hsh', hshadow_table(), lambda v: f'transform:scale({v[0]});opacity:{v[1]};'))
for name, ws in BLIP_WINDOWS.items():
    css_parts.append(frame_kf(f'jongle-bfk-{name}', ws))
for name, ws in HEART_WINDOWS.items():
    css_parts.append(frame_kf(f'jongle-hfk-{name}', ws))
css_parts.append('@keyframes jongle-bitp{0%,100%{opacity:1}50%{opacity:.4}}')

frames_css = ''.join(
    f'#ms-jongle .jongle-bf-{n}{{{A}:jongle-bfk-{n} 12s step-end infinite;}}'
    for n in BLIP_WINDOWS)
frames_css += ''.join(
    f'#ms-jongle .jongle-hf-{n}{{{A}:jongle-hfk-{n} 12s step-end infinite;}}'
    for n in HEART_WINDOWS)

STYLE = f'''
#ms-jongle{{position:relative;width:460px;height:420px;margin:0 auto;overflow:hidden;}}
#ms-jongle .jongle-ground{{position:absolute;left:20px;right:20px;top:390px;height:2px;
  background:repeating-linear-gradient(90deg,#1e3b14 0 8px,transparent 8px 14px);}}
#ms-jongle .jongle-ground2{{position:absolute;left:44px;right:44px;top:396px;height:1px;
  background:repeating-linear-gradient(90deg,#142a0e 0 5px,transparent 5px 13px);}}
#ms-jongle .jongle-sh{{position:absolute;top:386px;width:0;height:0;}}
#ms-jongle .jongle-sh-blip{{left:226px;{A}:jongle-bx 12s linear infinite;}}
#ms-jongle .jongle-sh-heart{{left:191px;top:388px;{A}:jongle-hx 12s linear infinite;}}
#ms-jongle .jongle-sh-el{{position:absolute;border-radius:50%;background:#16320e;}}
#ms-jongle .jongle-sh-blip .jongle-sh-el{{left:-48px;top:0;width:96px;height:10px;opacity:.55;}}
#ms-jongle .jongle-sh-heart .jongle-sh-el{{left:-24px;top:0;width:48px;height:8px;
  {A}:jongle-hsh 12s linear infinite;}}
#ms-jongle .jongle-blip{{position:absolute;left:146px;top:222px;width:168px;height:168px;
  {A}:jongle-bx 12s linear infinite;}}
#ms-jongle .jongle-lean{{width:168px;height:168px;transform-origin:50% 96%;
  {A}:jongle-bl 12s linear infinite;}}
#ms-jongle .jongle-bob{{position:relative;width:168px;height:168px;
  {A}:jongle-bb 12s linear infinite;}}
#ms-jongle .jongle-bob > svg{{position:absolute;left:0;top:0;width:168px;height:168px;
  filter:drop-shadow(0 0 6px rgba(51,255,0,.16));}}
#ms-jongle .jongle-puff svg,#ms-jongle .jongle-mark svg{{display:block;width:100%;height:100%;}}
#ms-jongle .jongle-bf{{opacity:0;}}
#ms-jongle .jongle-bf-stand-mid{{opacity:1;}}
#ms-jongle .jongle-heart{{position:absolute;left:164px;top:192px;width:55px;height:49.5px;
  {A}:jongle-hx 12s linear infinite;}}
#ms-jongle .jongle-hyy{{width:100%;height:100%;{A}:jongle-hy 12s linear infinite;}}
#ms-jongle .jongle-hrr{{width:100%;height:100%;transform-origin:50% 60%;
  {A}:jongle-hr 12s linear infinite;}}
#ms-jongle .jongle-hrr svg{{display:block;width:55px;height:49.5px;
  filter:drop-shadow(0 0 5px rgba(255,51,51,.38));}}
#ms-jongle .jongle-hf{{opacity:0;}}
#ms-jongle .jongle-hf-n{{opacity:1;}}
#ms-jongle .jongle-bit{{{A}:jongle-bitp 1.5s ease-in-out infinite;}}
#ms-jongle .jongle-puff{{position:absolute;left:18px;top:4px;width:32px;height:22px;opacity:0;
  transform-origin:50% 70%;{A}:jongle-puff 12s linear infinite;}}
#ms-jongle .jongle-mark{{position:absolute;left:120px;top:-34px;width:12px;height:30px;opacity:0;
  transform-origin:50% 100%;{A}:jongle-mark 12s linear infinite;}}
#ms-jongle .jongle-sweat{{position:absolute;left:114px;top:58px;width:7px;height:11px;opacity:0;
  background:#bfeaff;box-shadow:0 -4px 0 -2px #eaffdd;{A}:jongle-sweat 12s linear infinite;}}
{frames_css}
{''.join(css_parts)}
@media (prefers-reduced-motion:reduce){{
  #ms-jongle *{{animation:none !important;}}
}}
'''

PUFF_SVG = '''<svg viewBox="0 0 32 22" width="32" height="22" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="2" y="10" width="5" height="5" fill="#eaffdd"/><rect x="24" y="8" width="5" height="5" fill="#eaffdd"/>
<rect x="12" y="2" width="4" height="4" fill="#8dff5a"/><rect x="18" y="14" width="4" height="4" fill="#8dff5a"/>
</svg>'''
MARK_SVG = '''<svg viewBox="0 0 12 30" width="12" height="30" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="3" y="0" width="6" height="17" fill="#ffb000"/><rect x="3" y="23" width="6" height="6" fill="#ffb000"/>
</svg>'''

def scene_html():
    return f'''<div class="mscene" id="ms-jongle">
<div class="jongle-ground"></div><div class="jongle-ground2"></div>
<div class="jongle-sh jongle-sh-blip"><div class="jongle-sh-el"></div></div>
<div class="jongle-sh jongle-sh-heart"><div class="jongle-sh-el"></div></div>
<div class="jongle-blip"><div class="jongle-lean"><div class="jongle-bob">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">{blip_svg_inner()}</svg>
<div class="jongle-puff">{PUFF_SVG}</div>
<div class="jongle-mark">{MARK_SVG}</div>
<div class="jongle-sweat"></div>
</div></div></div>
<div class="jongle-heart"><div class="jongle-hyy"><div class="jongle-hrr">
<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">{heart_svg_inner()}</svg>
</div></div></div>
<style>{STYLE}</style>
</div>'''

fragment = scene_html()
(HERE / 'fragment.html').write_text(fragment)

HARNESS = '''<script>/* harnais de test : index.html#t=MS fige le cycle à t (retiré du fragment) */
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
<title>Blip — la jongle du cœur</title>
<style>html,body{{margin:0;background:#0a0a0a;min-height:100%;}}
.demo-wrap{{padding-top:60px;}}
.demo-cap{{color:#2a5a1e;font:12px/1.4 monospace;text-align:center;margin-top:14px;}}</style>
</head><body>
<div class="demo-wrap">{fragment}
<div class="demo-cap">&gt; blip --juggle heartbit.dat</div>
</div>
{HARNESS}
</body></html>'''
(HERE / 'index.html').write_text(index)
print('built: fragment.html', len(fragment), 'chars ; index.html', len(index), 'chars')
