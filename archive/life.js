/* Conway's Game of Life — quiet little animated window in the intro text.
   Fixed logical grid; resize only rescales the rendered canvas. */
(function () {
  var host = document.querySelector('.life-box');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var ctx = canvas.getContext('2d');

  var CELL = 3;            // px per cell — small enough that the gun still fits a little window
  var TICK = 128;          // ms between generations
  // The simulation runs on a grid larger than the canvas. A dead boundary turns
  // an arriving glider into a stable 2x2 block, so the boundary is pushed
  // MARGIN cells off-screen and gliders are erased VANISH cells past the edge —
  // both happen out of frame, so a glider simply leaves.
  var MARGIN = 10;
  var VANISH = 5;
  var cols, rows, simCols, simRows;
  var grid, next, brightness, dpr, raf, lastTick = 0, lastFrame = 0, running = true;
  var widthPx = 0, heightPx = 0;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GOSPER_L = [
    [0,4],[0,5],[1,4],[1,5],
    [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],
    [15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
    [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],
    [24,0],[24,1],[24,5],[24,6],
    [34,2],[34,3],[35,2],[35,3]
  ];
  var GOSPER_R = GOSPER_L.map(function (cell) { return [35 - cell[0], cell[1]]; });

  // simulation coords: visible cell (x, y) lives at (x + MARGIN, y) in the grid
  function idx(x, y) { return y * simCols + x; }
  function simIdx(x, y) { return y * simCols + (x + MARGIN); }

  function stamp(shape, ox, oy) {
    for (var i = 0; i < shape.length; i++) {
      var x = ox + shape[i][0];
      var y = oy + shape[i][1];
      if (x >= 0 && x < cols && y >= 0 && y < rows) grid[simIdx(x, y)] = 1;
    }
  }

  function seed() {
    simCols = cols + MARGIN * 2;
    simRows = rows + MARGIN;
    grid = new Uint8Array(simCols * simRows);
    next = new Uint8Array(simCols * simRows);
    brightness = new Float32Array(cols * rows);

    var gunX = Math.max(0, cols - 36);
    stamp(GOSPER_R, gunX, 1);

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        brightness[y * cols + x] = grid[simIdx(x, y)] ? 1 : 0;
      }
    }
  }

  function step() {
    for (var y = 0; y < simRows; y++) {
      for (var x = 0; x < simCols; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            var nx = x + dx;
            var ny = y + dy;
            if (nx < 0 || nx >= simCols || ny < 0 || ny >= simRows) continue;
            n += grid[idx(nx, ny)];
          }
        }
        var i = idx(x, y);
        var alive = grid[i];
        next[i] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
    var t = grid; grid = next; next = t;
    vanish();
  }

  // Erase whatever has drifted more than VANISH cells past the visible edge, so
  // nothing collects off-screen and grows back into frame.
  function vanish() {
    var keepL = MARGIN - VANISH;
    var keepR = MARGIN + cols + VANISH;
    for (var y = 0; y < simRows; y++) {
      var rowStart = y * simCols;
      if (y >= rows + VANISH) {
        grid.fill(0, rowStart, rowStart + simCols);
        continue;
      }
      grid.fill(0, rowStart, rowStart + keepL);
      grid.fill(0, rowStart + keepR, rowStart + simCols);
    }
  }

  function draw(elapsedSinceFrame) {
    elapsedSinceFrame = elapsedSinceFrame || 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = '#fff';
    var r = CELL * 0.34;
    var risePerMs = 1 / TICK;
    var fadePerMs = 1 / (TICK * 2);
    var frameTime = Math.min(elapsedSinceFrame, 50);
    var scaleX = widthPx / (cols * CELL);
    var scaleY = heightPx / (rows * CELL);
    ctx.save();
    ctx.scale(scaleX, scaleY);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x;
        var current = brightness[i];
        if (grid[simIdx(x, y)]) {
          brightness[i] = Math.min(1, current + risePerMs * frameTime);
        } else {
          brightness[i] = Math.max(0, current - fadePerMs * frameTime);
        }
        if (brightness[i] <= 0.02) { brightness[i] = 0; continue; }
        ctx.globalAlpha = brightness[i];
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function resize() {
    var w = host.clientWidth;
    var h = host.clientHeight;
    widthPx = w;
    heightPx = h;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!grid || !grid.length) {
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      seed();
    }
    draw();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!lastFrame) lastFrame = ts;
    if (ts - lastTick >= TICK) {
      lastTick = ts;
      step();
    }
    draw(ts - lastFrame);
    lastFrame = ts;
  }

  function start() {
    if (raf) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = null;
    running = false;
  }

  resize();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (running) start();
  });

  if (reduced) { stop(); } else { start(); }
}());
