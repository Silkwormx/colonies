(function () {
  var cell = document.getElementById('cell');
  var GOAL = 6;
  var round = 0;                    // 0 Kepler, 1 Comet, 2 quiz
  var tanks = [0, 0];
  var tankEls = [document.getElementById('tank-k'), document.getElementById('tank-c')];
  var hReleased = 0, oKept = 0, oLost = 0, hTaps = 0;
  var bubbles = [], queue = [], running = true, last = 0, spawnAcc = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = reduce ? 34 : 48;     // px per second, unhurried
  var H_LINES = [
    'Hydrogen. Light, flammable, and no use to lungs. Let it go.',
    'Still hydrogen. The cell makes two of these for every oxygen. That is the recipe, not a fault.',
    'Hydrogen again. Kepler would like it to leave quietly.',
    'Hydrogen. Useful someday for fuel. Today it is just in the way.'
  ];

  function refill() { queue = Solve.shuffle(['h', 'h', 'o']); }
  refill();
  setActive();

  function setActive() {
    tankEls.forEach(function (t, i) { t.classList.toggle('active', i === round); });
  }

  function spawn() {
    if (!queue.length) refill();
    var kind = queue.shift();
    var w = cell.clientWidth, h = cell.clientHeight;
    var startX = kind === 'h' ? w * 0.22 + 8 : w * 0.78 - 8;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bub ' + (kind === 'o' ? 'o2' : 'h2');
    b.innerHTML = kind === 'o' ? 'O<sub>2</sub>' : 'H<sub>2</sub>';
    b.setAttribute('aria-label', kind === 'o' ? 'Oxygen bubble' : 'Hydrogen bubble');
    var obj = { el: b, kind: kind, x: startX, y: h - 40, tx: 30 + Math.random() * (w - 60), phase: Math.random() * 6, done: false };
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(obj); });
    b.addEventListener('click', function () { tap(obj); });
    cell.appendChild(b);
    bubbles.push(obj);
    place(obj);
  }

  function place(o) {
    o.el.style.transform = 'translate(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px)';
  }

  function tap(o) {
    if (o.done || round > 1) return;
    o.done = true;
    if (o.kind === 'o') {
      o.el.classList.add('pop');
      tanks[round]++; oKept++;
      updateTank(round);
      if (tanks[round] >= GOAL) nextRound();
      else if (tanks[round] === 1) Solve.feedback('<span class="tag">Oxygen</span>Into the tank. Each bubble came off the positive electrode, one for every two water molecules split.', 'good');
    } else {
      o.el.classList.add('nope');
      hReleased++;
      document.getElementById('h-count').textContent = hReleased;
      Solve.feedback('<span class="tag">Not that one</span>' + H_LINES[hTaps++ % H_LINES.length], 'warn');
    }
    setTimeout(function () { o.el.remove(); }, 520);
  }

  function updateTank(i) {
    var t = tankEls[i];
    t.querySelector('.bar i').style.width = (tanks[i] / GOAL * 100) + '%';
    t.querySelector('.tx').textContent = tanks[i] + ' of ' + GOAL + (tanks[i] >= GOAL ? ' · full' : '');
    t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
  }

  function nextRound() {
    round++;
    setActive();
    if (round === 1) {
      document.getElementById('round-label').innerHTML = '<strong>Round 2 of 3</strong> · Fill Comet’s tank';
      Solve.feedback('<span class="tag">Kepler’s tank is full</span>Kepler: “Six hours. I’ll take it.” Comet has been holding his breath, which is not how helmets work.', 'good');
    } else {
      running = false;
      cell.classList.add('paused');
      document.getElementById('round-label').innerHTML = '<strong>Round 3 of 3</strong> · The count';
      Solve.clearFeedback();
      var q = document.getElementById('quiz'); q.hidden = false;
      setTimeout(function () { q.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
    }
  }

  document.querySelectorAll('#quiz .choice').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.a === 'two') {
        btn.classList.add('right');
        document.querySelectorAll('#quiz .choice').forEach(function (b) { b.disabled = true; });
        Solve.feedback('<span class="tag">Right</span>2 H<sub>2</sub>O → 2 H<sub>2</sub> + O<sub>2</sub>. Water splits two hydrogen to one oxygen, by molecules and by volume. Every breath leaves twice as much hydrogen behind.', 'good');
        setTimeout(function () {
          Solve.finish({ who: 'Comet', line: 'Twelve bubbles of oxygen. I would like to thank the hydrogen for leaving.',
            fact: 'Real plan, same chemistry: electrolysis of melted ice is one of the main ways a Mars base could make oxygen. It costs a lot of electricity, which is game three’s problem.' });
        }, 700);
      } else {
        btn.classList.add('wrong');
        Solve.feedback('<span class="tag">Count again</span>' + (btn.dataset.a === 'same'
          ? 'Water is H<sub>2</sub>O: two hydrogen atoms for each oxygen. Split it and the hydrogen comes out ahead.'
          : 'Other way round. Water has more hydrogen than oxygen in it, so more hydrogen comes out.'), 'warn');
      }
    });
  });

  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (running) {
      spawnAcc += dt;
      if (spawnAcc > (reduce ? 1.0 : 0.72)) { spawnAcc = 0; spawn(); }
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var o = bubbles[i];
        if (o.done) continue;
        o.phase += dt * 2.2;
        o.y -= SPEED * dt * (o.kind === 'h' ? 1.08 : 1);
        o.x += (o.tx - o.x) * dt * 0.35 + Math.sin(o.phase) * 0.35;
        place(o);
        if (o.y < -30) {
          o.done = true; o.el.remove();
          if (o.kind === 'h') { hReleased++; document.getElementById('h-count').textContent = hReleased; }
          else { oLost++; if (oLost === 1 || oLost % 4 === 0) Solve.feedback('<span class="tag">One got away</span>An oxygen bubble joined the Martian atmosphere, which is a fraction of a percent oxygen and was not expecting the gift. The cell makes more.', ''); }
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // test hook
  window.__solveTest = { tapNextO: function () { for (var i = 0; i < bubbles.length; i++) if (!bubbles[i].done && bubbles[i].kind === 'o') { tap(bubbles[i]); return true; } return false; } };
})();
