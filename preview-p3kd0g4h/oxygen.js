(function () {
  var GOAL_O = 6;
  var cell = document.getElementById('cell');
  var gas = document.getElementById('gas');
  var rig = document.getElementById('rig');
  var jugCol = document.getElementById('jug-col');
  var jugWater = document.getElementById('jug-water');
  var iceBtn = document.getElementById('ice-btn');
  var powerEl = document.getElementById('power');
  var waterEl = document.getElementById('water');
  var fillH = document.getElementById('fill-h');
  var fillO = document.getElementById('fill-o');
  var amtH = document.getElementById('amt-h');
  var amtO = document.getElementById('amt-o');
  var nH = document.getElementById('n-h');
  var nO = document.getElementById('n-o');
  var vesselH = document.getElementById('vessel-h');
  var vesselO = document.getElementById('vessel-o');
  var ratioEl = document.getElementById('ratio');
  var learned = document.getElementById('learned');
  var deeperBtn = document.getElementById('deeper-btn');
  var deeper = document.getElementById('deeper');
  var helpAudio = document.getElementById('help-audio');

  var hMade = 0, oMade = 0;
  var pendingH = 0, pendingO = 0;
  var iceInJug = 0;       // melted cubes waiting / in the jug
  var cellWater = 0;      // 0-100, fed by melt, used slowly by splits
  var power = 0;          // 0-1
  var finished = false, finishArmed = false;
  var bubbles = [];
  var last = 0, spawnAcc = 0;
  var idleTimer = null;
  var talked = {};
  var spoken = {};
  var playGen = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.Solve && Solve.installHelp) {
    Solve.installHelp({ hints: {}, goals: {}, happening: {} });
  }

  var LINES = {
    openK:       { who: 'Kepler', clip: 'ox_open_k',      line: "Ice, a little power, and a steady hand. That's the whole machine." },
    openC:       { who: 'Comet',  clip: 'ox_open_c',      line: "Drop the ice. I'll handle the commentary." },
    iceC:        { who: 'Comet',  clip: 'ox_ice_c',       line: "It melts. That's the useful part." },
    powerC:      { who: 'Comet',  clip: 'ox_power_c',     line: "The rods are awake. I love a good glow." },
    bubC:        { who: 'Comet',  clip: 'ox_bub_c',       line: "Two of those, one of these. Send them home." },
    booksK:      { who: 'Kepler', clip: 'ox_books_k',     line: "Two parts hydrogen. One part oxygen. Water keeps its own books." },
    pairC:       { who: 'Comet',  clip: 'ox_pair_c',      line: "That's a set. Two to one, every time." },
    wideC:       { who: 'Comet',  clip: 'ox_wide_c',      line: "The wide tank is keeping pace with the skinny one. That's twice the gas, same water." },
    breatheK:    { who: 'Kepler', clip: 'ox_breathe_k',   line: "The skinny tank is the one we breathe. The other we keep." },
    panelC:      { who: 'Comet',  clip: 'ox_panel_c',     line: "The panel is working for a living now." },
    nearC:       { who: 'Comet',  clip: 'ox_near_c',      line: "Colony air, coming up. And a tank of fuel, because chemistry has a sense of humor." },
    enoughC:     { who: 'Comet',  clip: 'ox_enough_c',    line: "Look at that. Enough air, and a little dance to go with it." },
    doneK:       { who: 'Kepler', clip: 'ox_done_k',      line: "Enough air for now. The hydrogen we keep for later." },
    learnedK:    { who: 'Kepler', clip: 'ox_learned_k',   line: "Water splits into two parts hydrogen and one part oxygen. The oxygen is what you breathe. The hydrogen keeps for later." },
    nudgeIce:    { who: 'Comet',  clip: 'ox_nudge_ice_c', line: "The ice goes in the jug. I already checked." },
    nudgePower:  { who: 'Comet',  clip: 'ox_nudge_power_c', line: "The water is waiting on a current." },
    nudgeTap:    { who: 'Comet',  clip: 'ox_nudge_tap_c', line: "Tap a bubble. It knows which tank it belongs to." },
    homeH:       { who: 'Comet',  clip: 'ox_home_h_c',    line: "That one wants the wide tank." },
    homeO:       { who: 'Comet',  clip: 'ox_home_o_c',    line: "Oxygen takes the skinny tank." }
  };

  function muted() { return !!(window.Solve && Solve.isMuted && Solve.isMuted()); }

  function showLine(key) {
    var item = LINES[key];
    if (!item) return;
    var box = document.getElementById('talk');
    var face = document.getElementById('talk-face');
    var whoEl = document.getElementById('talk-who');
    var lineEl = document.getElementById('talk-line');
    whoEl.textContent = item.who;
    lineEl.textContent = item.line;
    if (item.clip) lineEl.setAttribute('data-clip', item.clip);
    face.src = item.who === 'Comet' ? '../art/comet_portrait.jpg' : '../art/kepler_portrait.jpg';
    face.alt = item.who;
    box.classList.remove('is-swap');
    void box.offsetWidth;
    box.classList.add('is-swap');
  }

  function playLine(key, thenKey) {
    showLine(key);
    var item = LINES[key];
    var already = spoken[key];
    if (item && item.clip && !already) spoken[key] = true;
    resetIdle();
    if (!item || !item.clip || already || muted() || !window.Solve || !Solve.speakClip) {
      if (thenKey) setTimeout(function () { playLine(thenKey); }, 3200);
      return;
    }
    var gen = ++playGen;
    function onEnd() {
      if (gen !== playGen) return;
      helpAudio.removeEventListener('ended', onEnd);
      if (thenKey) playLine(thenKey);
    }
    if (thenKey) helpAudio.addEventListener('ended', onEnd);
    try { Solve.speakClip(item.clip); } catch (e) {
      helpAudio.removeEventListener('ended', onEnd);
      if (thenKey) setTimeout(function () { playLine(thenKey); }, 3200);
    }
    // Safety if ended never fires (blocked autoplay, missing file)
    if (thenKey) {
      setTimeout(function () {
        if (gen !== playGen) return;
        if (spoken[thenKey]) return;
        onEnd();
      }, 12000);
    }
  }

  // Opening: show Kepler now; bootAutoRead (from .instr-line clips) plays both
  // opening lines if audio is on. We follow with Comet's line in the talk box.
  showLine('openK');
  spoken.openK = true; // bootAutoRead will play it; don't play twice
  setTimeout(function () {
    if (!talked.openC) { talked.openC = true; showLine('openC'); spoken.openC = true; }
  }, 4200);

  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (finished) return;
    idleTimer = setTimeout(idleNudge, 8000);
  }
  function idleNudge() {
    if (finished || finishArmed) return;
    if (iceInJug === 0 && cellWater < 12) playLine('nudgeIce');
    else if (power < 0.08) playLine('nudgePower');
    else if (bubbles.some(function (b) { return !b.done && !b.homing; })) playLine('nudgeTap');
    resetIdle();
  }
  resetIdle();

  function paintTanks() {
    fillO.style.height = Math.min(100, (oMade / GOAL_O) * 100) + '%';
    fillH.style.height = Math.min(100, (hMade / (GOAL_O * 2)) * 100) + '%';
    if (oMade === 0 && hMade === 0) {
      nH.textContent = '\u2014'; nO.textContent = '\u2014';
      amtH.innerHTML = 'H<sub>2</sub>'; amtO.innerHTML = 'O<sub>2</sub>';
    } else {
      nH.textContent = String(hMade); nO.textContent = String(oMade);
      amtH.innerHTML = hMade + ' H<sub>2</sub>';
      amtO.innerHTML = oMade + ' O<sub>2</sub>';
    }
  }
  function paintWater() {
    waterEl.style.height = Math.max(8, Math.min(78, 8 + cellWater * 0.7)) + '%';
    // Jug water glyph grows with melt waiting to flow / already in jug
    var jh = Math.min(1, (iceInJug + cellWater / 40) / 4);
    var top = 86 - jh * 42;
    jugWater.setAttribute('d',
      'M26 ' + top.toFixed(1) + 'h24l-1.5 ' + (96 - top).toFixed(1) +
      'c-0.4 3-2.2 5-5.5 5H33c-3.2 0-5-2-5.4-5z');
    jugWater.setAttribute('opacity', String(0.2 + jh * 0.7));
    document.body.classList.toggle('flowing', iceInJug > 0 || cellWater > 8);
  }
  function setPower(v) {
    power = Math.max(0, Math.min(1, v));
    powerEl.value = String(Math.round(power * 100));
    powerEl.setAttribute('aria-valuenow', powerEl.value);
    document.body.classList.toggle('powered', power > 0.04);
    document.body.style.setProperty('--pwr', String(power));
    if (power > 0.04 && !talked.power) { talked.power = true; playLine('powerC'); }
    if (power > 0.8 && !talked.panel) { talked.panel = true; playLine('panelC'); }
    resetIdle();
  }
  powerEl.addEventListener('input', function () { setPower(Number(powerEl.value) / 100); });

  function pulse(el, cls) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 480);
  }

  function collect(kind) {
    if (kind === 'h') { hMade++; pendingH++; pulse(vesselH, 'pulse'); }
    else { oMade++; pendingO++; pulse(vesselO, 'pulse'); }
    paintTanks();
    if (!talked.books && (hMade + oMade) >= 3) { talked.books = true; playLine('booksK'); }
    if (!talked.wide && oMade >= 2 && hMade === oMade * 2) { talked.wide = true; playLine('wideC'); }
    if (!talked.breathe && oMade >= 3) { talked.breathe = true; playLine('breatheK'); }
    if (!talked.near && oMade >= 5 && oMade < GOAL_O) { talked.near = true; playLine('nearC'); }
    if (pendingH >= 2 && pendingO >= 1) {
      pendingH -= 2; pendingO -= 1;
      pulse(ratioEl, 'pop');
      pulse(vesselH, 'pairflash');
      pulse(vesselO, 'pairflash');
      if (!talked.pair) { talked.pair = true; playLine('pairC'); }
    }
    if (!finishArmed && oMade >= GOAL_O && hMade >= GOAL_O * 2) beginFinish();
  }

  function rigBox() { return rig.getBoundingClientRect(); }
  function localPoint(el, fx, fy) {
    var r = el.getBoundingClientRect(), g = rigBox();
    return { x: r.left - g.left + r.width * fx, y: r.top - g.top + r.height * fy };
  }
  function tankTarget(kind) {
    var vessel = kind === 'h' ? vesselH : vesselO;
    var fill = kind === 'h' ? fillH : fillO;
    var g = rigBox();
    var v = vessel.getBoundingClientRect();
    var s = fill.getBoundingClientRect();
    var y = (s.height > 6 ? s.top - g.top + 8 : v.bottom - g.top - 16);
    return { x: v.left - g.left + v.width / 2, y: y };
  }

  function place(o) {
    o.el.style.left = o.x.toFixed(1) + 'px';
    o.el.style.top = o.y.toFixed(1) + 'px';
  }

  function sendHome(o) {
    if (o.done || o.homing) return;
    o.homing = true;
    o.el.classList.add('home');
    var tgt = tankTarget(o.kind);
    o.x = tgt.x; o.y = tgt.y;
    place(o);
    var travel = reduce ? 80 : 460;
    setTimeout(function () {
      if (o.done) return;
      o.done = true;
      o.el.classList.add('pop');
      collect(o.kind);
      setTimeout(function () { if (o.el && o.el.parentNode) o.el.remove(); }, 320);
      bubbles = bubbles.filter(function (b) { return b !== o; });
    }, travel);
  }

  function bounceWrong(o) {
    o.el.classList.remove('bounce'); void o.el.offsetWidth; o.el.classList.add('bounce');
    playLine(o.kind === 'h' ? 'homeH' : 'homeO');
  }

  function bindBubble(obj) {
    var startX = 0, startY = 0, lastX = 0, lastY = 0, t0 = 0, dragged = false;
    obj.el.addEventListener('pointerdown', function (e) {
      if (obj.done || obj.homing) return;
      e.preventDefault();
      try { obj.el.setPointerCapture(e.pointerId); } catch (err) {}
      startX = lastX = e.clientX; startY = lastY = e.clientY; t0 = Date.now(); dragged = false;
    });
    obj.el.addEventListener('pointermove', function (e) {
      if (obj.done || obj.homing || !t0) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 8) {
        dragged = true;
        var g = rigBox();
        obj.x = e.clientX - g.left; obj.y = e.clientY - g.top;
        place(obj);
      }
      lastX = e.clientX; lastY = e.clientY;
    });
    function end(e) {
      if (!t0 || obj.done || obj.homing) { t0 = 0; return; }
      var dt = Math.max(16, Date.now() - t0);
      var vx = (lastX - startX) / dt, vy = (lastY - startY) / dt;
      t0 = 0;
      if (!dragged) { sendHome(obj); return; }
      // Flick: if mostly toward the matching tank, send home; otherwise bounce back.
      var tgt = tankTarget(obj.kind);
      var g = rigBox();
      var toward = { x: tgt.x - (obj.x), y: tgt.y - obj.y };
      var other = tankTarget(obj.kind === 'h' ? 'o' : 'h');
      var distHome = Math.hypot(obj.x - tgt.x, obj.y - tgt.y);
      var distOther = Math.hypot(obj.x - other.x, obj.y - other.y);
      var flickedUp = vy < -0.05 || (dragged && obj.y < g.height * 0.55);
      if (distHome < distOther || flickedUp) sendHome(obj);
      else bounceWrong(obj);
    }
    obj.el.addEventListener('pointerup', end);
    obj.el.addEventListener('pointercancel', function () { t0 = 0; });
  }

  function makeBubble(kind) {
    var rod = cell.querySelector(kind === 'h' ? '.rod.neg' : '.rod.pos');
    var start = localPoint(rod, 0.5, 0.12);
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'bub ' + (kind === 'o' ? 'o2' : 'h2');
    el.innerHTML = kind === 'o' ? 'O<sub>2</sub>' : 'H<sub>2</sub>';
    el.setAttribute('aria-label', kind === 'o' ? 'Oxygen bubble. Tap to send it to the oxygen tank.' : 'Hydrogen bubble. Tap to send it to the hydrogen tank.');
    var obj = { el: el, kind: kind, x: start.x, y: start.y, phase: Math.random() * 6, done: false, homing: false, hover: false };
    gas.appendChild(el);
    bubbles.push(obj);
    place(obj);
    bindBubble(obj);
    if (!talked.bub) { talked.bub = true; playLine('bubC'); }
    return obj;
  }

  function spawnBatch() {
    if (cellWater < 8 || finishArmed) return;
    var live = bubbles.filter(function (b) { return !b.done; }).length;
    if (live >= 6) return;
    makeBubble('h'); makeBubble('h'); makeBubble('o');
    cellWater = Math.max(0, cellWater - 6);
    paintWater();
  }

  function dropIce() {
    if (finished) return;
    resetIdle();
    var col = jugCol.getBoundingClientRect();
    var cube = document.createElement('span');
    cube.className = 'ice-cube falling';
    var startX = 10 + Math.random() * 18;
    cube.style.left = startX + 'px';
    cube.style.top = '0px';
    cube.style.setProperty('--fall', Math.round(col.height * 0.42) + 'px');
    jugCol.appendChild(cube);
    if (!talked.ice) { talked.ice = true; playLine('iceC'); }
    var meltAt = reduce ? 120 : 560;
    setTimeout(function () {
      cube.classList.remove('falling'); cube.classList.add('melt');
      iceInJug += 1;
      paintWater();
      setTimeout(function () { if (cube.parentNode) cube.remove(); }, reduce ? 80 : 700);
    }, meltAt);
  }
  iceBtn.addEventListener('click', dropIce);
  iceBtn.addEventListener('pointerdown', function (e) {
    // Keep the button snappy on touch; click still fires for accessibility.
    if (e.pointerType === 'touch') { /* let click follow */ }
  });

  deeperBtn.addEventListener('click', function () {
    var open = deeper.hidden;
    deeper.hidden = !open;
    deeperBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    deeperBtn.textContent = open ? 'Close deeper' : 'Go deeper';
    document.body.classList.toggle('deeper-open', open);
    if (open) { try { deeper.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  });

  function sparkle(host) {
    if (reduce) return;
    var r = host.getBoundingClientRect(), g = rigBox();
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var ang = (i / 10) * Math.PI * 2, dist = 18 + Math.random() * 28;
      s.style.left = (r.left - g.left + r.width * 0.5) + 'px';
      s.style.top = (r.top - g.top + r.height * 0.35) + 'px';
      s.style.setProperty('--sx', (Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--sy', (Math.sin(ang) * dist - 10) + 'px');
      gas.appendChild(s);
      (function (el) { setTimeout(function () { if (el.parentNode) el.remove(); }, 1000); })(s);
    }
  }

  function beginFinish() {
    if (finishArmed) return;
    finishArmed = true;
    sparkle(vesselO);
    document.getElementById('talk').classList.add('dance');
    playLine('enoughC');
    learned.hidden = false;
    setTimeout(function () { playLine('learnedK'); }, 2200);
    setTimeout(function () {
      if (finished) return;
      finished = true;
      if (window.Solve && Solve.finish) {
        Solve.finish({
          who: 'Kepler',
          line: 'Enough air for now. The hydrogen we keep for later.',
          fact: 'Melted ice, split with electricity, is one way a Mars base can make oxygen. It costs a lot of power \u2014 that is the next problem.',
          resultClip: 'ox_learned_k'
        });
      }
    }, 5200);
  }

  function hoverY() {
    var c = cell.getBoundingClientRect(), g = rigBox();
    return c.top - g.top + 22;
  }

  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    // Melted ice trickles from the jug into the cell
    if (iceInJug > 0 && cellWater < 100) {
      var flow = dt * 28;
      iceInJug = Math.max(0, iceInJug - flow / 20);
      cellWater = Math.min(100, cellWater + flow);
      paintWater();
    }
    if (!finishArmed && power > 0.05 && cellWater >= 8) {
      var interval = 1.7 - power * 1.1; // 1.7s at low, 0.6s at high
      spawnAcc += dt;
      if (spawnAcc >= interval) { spawnAcc = 0; spawnBatch(); }
    }
    if (!reduce) {
      var hy = hoverY();
      for (var i = 0; i < bubbles.length; i++) {
        var o = bubbles[i];
        if (o.done || o.homing) continue;
        o.phase += dt * 2.2;
        if (!o.hover) {
          o.y -= (26 + power * 22) * dt;
          o.x += Math.sin(o.phase) * 0.25;
          if (o.y <= hy) o.hover = true;
        } else {
          o.y = hy + Math.sin(o.phase) * 2.2;
          o.x += Math.sin(o.phase * 0.8) * 0.15;
        }
        place(o);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  paintTanks();
  paintWater();

  window.__oxygenToy = {
    dropIce: dropIce,
    setPower: setPower,
    tapNext: function () {
      for (var i = 0; i < bubbles.length; i++) {
        if (!bubbles[i].done && !bubbles[i].homing) { sendHome(bubbles[i]); return true; }
      }
      return false;
    },
    tapAll: function () {
      bubbles.slice().forEach(function (b) { if (!b.done && !b.homing) sendHome(b); });
    },
    counts: function () {
      return { hMade: hMade, oMade: oMade, ratioOk: hMade === 2 * oMade, goal: GOAL_O, water: Math.round(cellWater), power: power, ice: iceInJug };
    },
    finishNow: function () {
      while (oMade < GOAL_O) { collect('h'); collect('h'); collect('o'); }
    }
  };
})();
