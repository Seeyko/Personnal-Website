/* ============================================================
   CURSOR SPRITES — the non-Blip cursors of the intro swarm.

   window.CursorSprites = { list, get(id), svg(id) }

   Each sprite: { id, label, w, h, hotX, hotY, tool, markup }
   - markup : complete <svg viewBox="0 0 w h" shape-rendering="crispEdges">
              made of one <path> per colour; 1 grid unit = 1 pixel, integer
              coordinates only, no anti-aliasing. width/height attrs = w/h,
              scale it with CSS (keep integer multiples for crisp pixels).
   - hotX/Y : hotspot in grid units (top-left of that pixel). To pin a sprite
              rendered at scale s on point (x,y): left = x - hotX*s,
              top = y - hotY*s — same convention as Blip's (6,3).
   - tool   : what the cursor naturally does in the swarm —
              'select' | 'type' | 'click' | 'measure' | 'move' | 'paint'.

   Palette (tint per theme by setting these on any ancestor):
     C  main fill ......... currentColor            (set `color`)
     K  outline / ink ..... var(--cs-ink,#111)      (1px, 4-connected)
     D  ink-coloured fill . var(--cs-ink,#111)      (mac arrow body, handles)
     W  paper / highlight . var(--cs-paper,#fff)
     A  accent ............ var(--cs-accent,currentColor)
   Assumes `color` contrasts with --cs-ink (the outline), like a classic
   white-on-black OS cursor.

   Sprites are authored below as ASCII masks. `ring` letters are grown
   around the drawn pixels one 4-connected layer at a time (explicit K
   pixels are kept as-is and never get a ring), so outlines stay uniform.
   ============================================================ */
(function () {
  'use strict';

  var FILL = {
    K: 'var(--cs-ink,#111)',
    W: 'var(--cs-paper,#fff)',
    C: 'currentColor',
    A: 'var(--cs-accent,currentColor)'
  };
  var ALIAS = { D: 'K' }; // D shares the ink colour but counts as a filled shape

  // ---------- mask helpers ----------
  function toGrid(rows) {
    return rows.map(function (r) { return r.split(''); });
  }

  // Paste `top` onto `base` at (dx,dy); '.' in top is transparent.
  function overlay(base, top, dx, dy) {
    var out = toGrid(base), t = toGrid(top);
    var h = Math.max(out.length, dy + t.length);
    var w = Math.max(out[0].length, dx + t[0].length);
    for (var y = 0; y < h; y++) {
      out[y] = out[y] || [];
      for (var x = 0; x < w; x++) if (out[y][x] === undefined) out[y][x] = '.';
    }
    t.forEach(function (row, y) {
      row.forEach(function (c, x) { if (c !== '.') out[y + dy][x + dx] = c; });
    });
    return out.map(function (r) { return r.join(''); });
  }

  // Grow one 4-connected layer of `letter` around every filled, non-K pixel.
  function grow(g, letter) {
    var h = g.length, w = g[0].length, add = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (g[y][x] !== '.') continue;
      var n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (var i = 0; i < 4; i++) {
        var c = g[n[i][1]] && g[n[i][1]][n[i][0]];
        if (c && c !== '.' && c !== 'K') { add.push([x, y]); break; }
      }
    }
    add.forEach(function (p) { g[p[1]][p[0]] = letter; });
  }

  // Grid -> <svg>, one <path> per colour, horizontal runs merged.
  function toSvg(g) {
    var h = g.length, w = g[0].length, d = {};
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w;) {
        var c = g[y][x];
        if (c === '.') { x++; continue; }
        var k = ALIAS[c] || c, n = 1;
        while (x + n < w && (ALIAS[g[y][x + n]] || g[y][x + n]) === k) n++;
        d[k] = (d[k] || '') + 'M' + x + ' ' + y + 'h' + n + 'v1h-' + n + 'z';
        x += n;
      }
    }
    var body = ['K', 'W', 'C', 'A'].filter(function (k) { return d[k]; }).map(function (k) {
      return '<path fill="' + FILL[k] + '" d="' + d[k] + '"/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" width="' + w + '" height="' + h +
      '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  // ---------- shared parts ----------
  // Windows-95 arrow, 12x19, hotspot (0,0). Body only; outline is grown.
  var ARROW = [
    'K...........', // 0
    'K...........', // 1
    '.C..........', // 2
    '.CC.........', // 3
    '.CCC........', // 4
    '.CCCC.......', // 5
    '.CCCCC......', // 6
    '.CCCCCC.....', // 7
    '.CCCCCCC....', // 8
    '.CCCCCCCC...', // 9
    '.CCCCCCCCC..', // 10
    '.CCCCCC...KK', // 11
    '.CCC.CC.....', // 12
    '.CC..CC.....', // 13
    '.C....CC....', // 14
    'K.....CC....', // 15
    'K......CC...', // 16
    '.......CC...', // 17
    '............'  // 18
  ];

  // ---------- sprite definitions ----------
  var DEFS = [
    {
      id: 'arrow-mac', label: 'Arrow (classic Mac)', tool: 'select', hot: [1, 1], ring: ['W'],
      rows: [
        'W..........',
        '.D.........',
        '.DD........',
        '.DDD.......',
        '.DDDD......',
        '.DDDDD.....',
        '.DDDDDD....',
        '.DDDDDDD...',
        '.DDDDDDDD..',
        '.DDDDDDDDD.',
        '.DDDDD.....',
        '.DD.DD.....',
        '.D...DD....',
        '.....DD....',
        '......DD...',
        '......DD...',
        '...........'
      ]
    },
    { id: 'arrow-win', label: 'Arrow (Windows 95)', tool: 'select', hot: [0, 0], rows: ARROW },
    {
      id: 'hand-point', label: 'Pointing hand', tool: 'click', hot: [5, 0],
      rows: [
        '.................',
        '.....CC..........',
        '.....CC..........',
        '.....CC..........',
        '.....CC..........',
        '.....CC..........',
        '.....CCKCC.......',
        '.....CCKCCKCC....',
        '.....CCKCCKCCKC..',
        '.CC..CCCCCCCCKCC.',
        '.CCC.CCCCCCCCCCC.',
        '..CCCCCCCCCCCCCC.',
        '...CCCCCCCCCCCCC.',
        '...CCCCCCCCCCCCC.',
        '....CCCCCCCCCCC..',
        '....CCCCCCCCCCC..',
        '.....CCCCCCCCC...',
        '.....CCCCCCCCC...',
        '.................'
      ]
    },
    {
      id: 'hand-grab', label: 'Grabbing hand', tool: 'move', hot: [8, 6],
      rows: [
        '.................',
        '....CC.CC.CC.CC..',
        '....CCKCCKCCKCC..',
        '....CCKCCKCCKCC..',
        '..CCCCCCCCCCCCCC.',
        '.CCCKCCCCCCCCCCC.',
        '.CCCCKCCCCCCCCCC.',
        '..CCCCCCCCCCCCCC.',
        '...CCCCCCCCCCCC..',
        '....CCCCCCCCCCC..',
        '....CCCCCCCCCCC..',
        '.....CCCCCCCCC...',
        '.................'
      ]
    },
    {
      id: 'ibeam', label: 'I-beam (text)', tool: 'type', hot: [4, 8],
      rows: [
        '.........',
        '.CCC.CCC.',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '....C....',
        '.CCC.CCC.',
        '.........'
      ]
    },
    {
      id: 'caret-block', label: 'Terminal block caret', tool: 'type', hot: [1, 7],
      rows: [
        '........',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '.CCCCCC.',
        '........'
      ]
    },
    {
      id: 'crosshair', label: 'Precision crosshair', tool: 'measure', hot: [8, 8],
      rows: [
        '.................',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '.CCCCCCC.CCCCCCC.',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '........C........',
        '.................'
      ]
    },
    {
      id: 'reticle', label: 'FPS reticle', tool: 'measure', hot: [9, 9],
      rows: [
        '...................',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '...................',
        '...................',
        '...................',
        '...................',
        '.CCCC....A....CCCC.',
        '...................',
        '...................',
        '...................',
        '...................',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '...................'
      ]
    },
    {
      id: 'move', label: 'Move (4-way)', tool: 'move', hot: [9, 9],
      rows: [
        '...................',
        '.........C.........',
        '........CCC........',
        '.......CCCCC.......',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '...C.....C.....C...',
        '..CC.....C.....CC..',
        '.CCCCCCCCCCCCCCCCC.',
        '..CC.....C.....CC..',
        '...C.....C.....C...',
        '.........C.........',
        '.........C.........',
        '.........C.........',
        '.......CCCCC.......',
        '........CCC........',
        '.........C.........',
        '...................'
      ]
    },
    {
      id: 'resize-nwse', label: 'Diagonal resize', tool: 'move', hot: [7, 7],
      rows: [
        '...............',
        '.CCCCC.........',
        '.CCCC..........',
        '.CCC...........',
        '.CC.C..........',
        '.C...C.........',
        '......C........',
        '.......C.......',
        '........C......',
        '.........C...C.',
        '..........C.CC.',
        '...........CCC.',
        '..........CCCC.',
        '.........CCCCC.',
        '...............'
      ]
    },
    {
      id: 'resize-ew', label: 'Horizontal resize', tool: 'move', hot: [9, 3],
      rows: [
        '...................',
        '...C...........C...',
        '..CC...........CC..',
        '.CCCCCCCCCCCCCCCCC.',
        '..CC...........CC..',
        '...C...........C...',
        '...................'
      ]
    },
    {
      id: 'wait', label: 'Hourglass (wait)', tool: 'measure', hot: [6, 7],
      rows: [
        '.............',
        '.CCCCCCCCCCC.',
        '.KKKKKKKKKKK.',
        '..WAAAAAAAW..',
        '..WWAAAAAWW..',
        '...WWAAAWW...',
        '....WWAWW....',
        '.....WAW.....',
        '.....WAW.....',
        '....WWAWW....',
        '...WWWAWWW...',
        '..WWWAAAWWW..',
        '..WAAAAAAAW..',
        '.KKKKKKKKKKK.',
        '.CCCCCCCCCCC.',
        '.............'
      ]
    },
    {
      id: 'progress', label: 'Working in background', tool: 'select', hot: [0, 0],
      rows: overlay(ARROW, [
        'DDDDD.',
        'WAAAW.',
        '.WAW..',
        '..A...',
        '.WAW..',
        'WAAAW.',
        'DDDDD.',
        '......'
      ], 12, 13)
    },
    {
      id: 'not-allowed', label: 'Not allowed', tool: 'click', hot: [7, 7],
      rows: [
        '...............',
        '.....AAAAA.....',
        '...AAAAAAAAA...',
        '..AAAA...AAAA..',
        '..AAAA.....AA..',
        '.AAAAAA....AAA.',
        '.AA..AAA....AA.',
        '.AA...AAA...AA.',
        '.AA....AAA..AA.',
        '.AAA....AAAAAA.',
        '..AA.....AAAA..',
        '..AAAA...AAAA..',
        '...AAAAAAAAA...',
        '.....AAAAA.....',
        '...............'
      ]
    },
    {
      id: 'help', label: 'Help', tool: 'select', hot: [0, 0],
      rows: overlay(ARROW, [
        '.AAAA..',
        'AA..AA.',
        '....AA.',
        '...AA..',
        '..AA...',
        '.......',
        '..AA...',
        '.......'
      ], 12, 2)
    },
    {
      id: 'copy', label: 'Copy', tool: 'move', hot: [0, 0],
      rows: overlay(ARROW, [
        '..KKKKK..',
        '.KAAAAAK.',
        'KAAAKAAAK',
        'KAAAKAAAK',
        'KAKKKKKAK',
        'KAAAKAAAK',
        'KAAAKAAAK',
        '.KAAAAAK.',
        '..KKKKK..'
      ], 9, 11)
    },
    {
      id: 'pencil', label: 'Pencil', tool: 'paint', hot: [1, 15],
      rows: [
        '.................',
        '.................',
        '.............AA..',
        '............AAA..',
        '...........KKAA..',
        '..........CCKK...',
        '.........CCCC....',
        '........CCCC.....',
        '.......CCCC......',
        '......CCCC.......',
        '.....CCCC........',
        '....CCCC.........',
        '...WWCC..........',
        '..WWWW...........',
        '..WW.............',
        '.K...............',
        '.................'
      ]
    },
    {
      id: 'brush', label: 'Paint brush', tool: 'paint', hot: [1, 15],
      rows: [
        '.................',
        '.................',
        '..............C..',
        '.............CC..',
        '............CC...',
        '...........CC....',
        '..........CC.....',
        '.........CC......',
        '.......WCC.......',
        '......WWW........',
        '.....KWWW........',
        '....AAKW.........',
        '...AAAA..........',
        '..AAAA...........',
        '..AA.............',
        '.AA..............',
        '.................'
      ]
    },
    {
      id: 'bucket', label: 'Paint bucket', tool: 'paint', hot: [15, 17],
      rows: [
        '...................',
        '........CCC........',
        '.......C...C.......',
        '......C.....C......',
        '.....C.......C.....',
        '....KKKKKKKKKKK....',
        '...KAAAAAAAAAAAK...',
        '...CKKKKKKKKKKKA...',
        '...CCCCCCCCCCCKA...',
        '....CCCCCCCCCCKA...',
        '....CCCCCCCCCCKA...',
        '....CCCCCCCCCCKA...',
        '.....CCCCCCCCK.A...',
        '.....CCCCCCCCK.A...',
        '.....CCCCCCCCK.....',
        '..............AAA..',
        '..............AAA..',
        '...............A...',
        '...................',
        '...................'
      ]
    },
    {
      id: 'zoom', label: 'Magnifier', tool: 'measure', hot: [7, 7],
      rows: [
        '...................',
        '.....CCCCC.........',
        '...CCCCCCCCC.......',
        '..CCCKKKKKCCC......',
        '..CCKWWWWWKCC......',
        '.CCKWWWKWWWKCC.....',
        '.CCKWWWKWWWKCC.....',
        '.CCKWKKKKKWKCC.....',
        '.CCKWWWKWWWKCC.....',
        '.CCKWWWKWWWKCC.....',
        '..CCKWWWWWKCC......',
        '..CCCKKKKKCCC......',
        '...CCCCCCCCCC......',
        '.....CCCCCCCCC.....',
        '............CCC....',
        '.............CCC...',
        '..............CCC..',
        '...............C...',
        '...................'
      ]
    }
  ];

  // ---------- build ----------
  var list = DEFS.map(function (def) {
    var g = toGrid(def.rows);
    (def.ring || ['K']).forEach(function (letter) { grow(g, letter); });
    return Object.freeze({
      id: def.id,
      label: def.label,
      w: g[0].length,
      h: g.length,
      hotX: def.hot[0],
      hotY: def.hot[1],
      tool: def.tool,
      markup: toSvg(g)
    });
  });

  var byId = {};
  list.forEach(function (s) { byId[s.id] = s; });

  window.CursorSprites = Object.freeze({
    list: Object.freeze(list),
    get: function (id) { return byId[id] || null; },
    svg: function (id) { return byId[id] ? byId[id].markup : ''; }
  });
})();
