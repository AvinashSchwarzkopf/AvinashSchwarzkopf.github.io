/* Conway's Game of Life — quiet background texture for the page header.
   Sparse glider seeding, slow tick, honors prefers-reduced-motion. */
(function () {
  var host = document.querySelector('.life-head');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var btn = host.querySelector('.life-toggle');

  var CELL = 9;            // px per cell (css px)
  var TICK = 260;          // ms between generations
  var cols, rows, grid, next, dpr, raf, last = 0, running = true;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GLIDER   = [[1,0],[2,1],[0,2],[1,2],[2,2]];
  var LWSS     = [[0,0],[3,0],[4,1],[0,2],[4,2],[1,3],[2,3],[3,3],[4,3]];
  var BLINKER  = [[0,0],[1,0],[2,0]];
  var BLOCK    = [[0,0],[1,0],[0,1],[1,1]];

  function idx(x, y) { return y * cols + x; }

  function stamp(shape, ox, oy) {
    for (var i = 0; i < shape.length; i++) {
      var x = ox + shape[i][0], y = oy + shape[i][1];
      if (x >= 0 && x < cols && y >= 0 && y < rows) grid[idx(x, y)] = 1;
    }
  }

  function seed() {
    grid = new Uint8Array(cols * rows);
    next = new Uint8Array(cols * rows);
    // a handful of gliders drifting in from the left, plus still lifes for anchor
    var gliders = Math.max(3, Math.round(cols / 22));
    for (var i = 0; i < gliders; i++) {
      stamp(GLIDER, Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
    }
    stamp(LWSS, Math.floor(cols * 0.15), Math.floor(rows * 0.6));
    stamp(LWSS, Math.floor(cols * 0.72), Math.floor(rows * 0.25));
    for (var j = 0; j < 4; j++) {
      stamp(Math.random() < 0.5 ? BLINKER : BLOCK,
            Math.floor(Math.random() * cols),
            Math.floor(Math.random() * rows));
    }
  }

  function step() {
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            // toroidal wrap, so gliders re-enter instead of dying at the edge
            var nx = (x + dx + cols) % cols;
            var ny = (y + dy + rows) % rows;
            n += grid[idx(nx, ny)];
          }
        }
        var alive = grid[idx(x, y)];
        next[idx(x, y)] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
    var t = grid; grid = next; next = t;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(47, 79, 79, 0.16)';
    var r = CELL * 0.34;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (!grid[idx(x, y)]) continue;
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL);
    rows = Math.ceil(h / CELL);
    seed();
    draw();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (ts - last < TICK) return;
    last = ts;
    step();
    draw();
  }

  function start() {
    if (raf) return;
    running = true;
    if (btn) btn.textContent = 'Pause';
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = null;
    running = false;
    if (btn) btn.textContent = 'Play';
  }

  resize();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  // don't burn cycles on a backgrounded tab
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (running) start();
  });

  if (btn) {
    btn.addEventListener('click', function () { running ? stop() : start(); });
  }

  if (reduced) { stop(); }   // one static generation, no motion
  else { start(); }
}());
