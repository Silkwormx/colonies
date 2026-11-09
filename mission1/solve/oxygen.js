(function () {
  var cell = document.getElementById('cell');
  var GOAL = 6;
  var round = 0; // 0 Kepler, 1 Comet, 2 quiz
  var tanks = [0, 0];
  var tankEls = [document.getElementById('tank-k'), document.getElementById('tank-c')];
  // Strict model: every O₂ made also makes exactly 2 H₂. H₂ is never stored.
  // escaped = hMade - hStored, and hStored is always 0, so escaped catches up to hMade as H₂ vents.
  var hMade = 0, oMade = 0, hEscaped = 0, oKept = 0, oLost = 0, hStored = 0;
  var roundHMade = 0, roundOMade = 0, roundHEsc = 0, roundOKept = 0, roundOLost = 0;
  var bubbles = [], running = true, last = 0, spawnAcc = 0, batch = null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = reduce ? 34 : 48;

  fetch('help.json').then(function (r) { return r.json(); }).then(function (h) {
    var H = h.oxygen;
    Solve.installHelp({
      hints: H.hints_by_step,
      goals: H.goals,
      happening: H.happening,
      step: 'fill',
      goal: 'fill_k',
      happeningStep: 'intro'
    });
  });

  setActive();
  paintCounters();

  function setActive() {
    tankEls.forEach(function (t, i) { t.classList.toggle('active', i === round); });
  }

  function paintCounters() {
    // Invariant: hMade === 2 * oMade always. hEscaped === hMade - hStored (hStored = 0).
    document.getElementById('c-h-made').textContent = hMade;
    document.getElementById('c-o-made').textContent = oMade;
    document.getElementById('c-o-kept').textContent = oKept;
    document.getElementById('c-h-esc').textContent = hEscaped;
  }

  function resetRoundStats() {
    roundHMade = roundOMade = roundHEsc = roundOKept = roundOLost = 0;
  }

  function showResult(who) {
    // Flush any in-flight H₂ so the line is exact: escaped == made, made == 2 * oMade
    flushHydrogen();
    var box = document.getElementById('ox-results');
    var line = roundHMade + ' H₂ made, ' + roundOMade + ' O₂ made. ' +
      roundOKept + ' O₂ in the tank. ' + roundHEsc + ' H₂ escaped — twice the oxygen, because water is H₂O.';
    if (roundOLost) {
      line = roundHMade + ' H₂ made, ' + roundOMade + ' O₂ made. ' +
        roundOKept + ' O₂ in the tank, ' + roundOLost + ' O₂ missed. ' +
        roundHEsc + ' H₂ escaped — always two H₂ for every O₂ the cell made.';
    }
    var why = '2 H₂O → 2 H₂ + O₂. Hydrogen is not stored here; all of it vents.';
    var host = document.createElement('div');
    box.appendChild(host);
    var clip = (roundOLost === 0 && roundOKept === GOAL && roundHMade === GOAL * 2 && roundHEsc === GOAL * 2)
      ? (who.indexOf('Kepler') === 0 ? 'oxygen_r_k_ok' : 'oxygen_r_c_ok')
      : (roundOLost ? 'oxygen_r_miss' : 'oxygen_r_ok');
    Solve.setResultLine(host, clip,
      '<div class="nums">' + who + ': ' + line + '</div><p class="why">' + why + '</p>');
  }

  function makeBubble(kind) {
    var w = cell.clientWidth, h = cell.clientHeight;
    var startX = kind === 'h' ? w * 0.22 + 8 : w * 0.78 - 8;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bub ' + (kind === 'o' ? 'o2' : 'h2');
    b.innerHTML = kind === 'o' ? 'O<sub>2</sub>' : 'H<sub>2</sub>';
    b.setAttribute('aria-label', kind === 'o' ? 'Oxygen bubble' : 'Hydrogen bubble');
    var obj = {
      el: b, kind: kind,
      x: startX, y: h - 40,
      tx: 30 + Math.random() * (w - 60),
      phase: Math.random() * 6,
      done: false
    };
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(obj); });
    b.addEventListener('click', function () { tap(obj); });
    cell.appendChild(b);
    bubbles.push(obj);
    place(obj);
    if (kind === 'h') { hMade++; roundHMade++; }
    else { oMade++; roundOMade++; }
    paintCounters();
    return obj;
  }

  function spawnBatch() {
    // One electrolysis step: exactly 1 O₂ + 2 H₂
    makeBubble('o');
    makeBubble('h');
    makeBubble('h');
  }

  function place(o) {
    o.el.style.transform = 'translate(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px)';
  }

  function escapeH(o, viaTap) {
    if (o.done || o.kind !== 'h') return;
    o.done = true;
    hEscaped++; roundHEsc++;
    paintCounters();
    o.el.classList.add(viaTap ? 'nope' : 'pop');
    if (viaTap) {
      Solve.feedback('<span class="tag">H<sub>2</sub></span>Hydrogen vents. It is not stored. The escaped count goes up by one.', 'warn');
    }
    setTimeout(function () { if (o.el && o.el.parentNode) o.el.remove(); }, 520);
  }

  function flushHydrogen() {
    // Force every remaining H₂ to count as escaped so the result line is exact
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var o = bubbles[i];
      if (!o.done && o.kind === 'h') escapeH(o, false);
    }
  }

  function tap(o) {
    if (o.done || round > 1) return;
    if (o.kind === 'o') {
      o.done = true;
      o.el.classList.add('pop');
      tanks[round]++; oKept++; roundOKept++;
      updateTank(round);
      paintCounters();
      if (tanks[round] === 1) {
        Solve.feedback('<span class="tag">Oxygen</span>Into the tank. The cell made two H₂ with this O₂; those H₂ vent on their own.', 'good');
      }
      if (tanks[round] >= GOAL) nextRound();
      setTimeout(function () { if (o.el && o.el.parentNode) o.el.remove(); }, 520);
    } else {
      escapeH(o, true);
    }
  }

  function updateTank(i) {
    var t = tankEls[i];
    t.querySelector('.bar i').style.width = (tanks[i] / GOAL * 100) + '%';
    t.querySelector('.tx').textContent = tanks[i] + ' of ' + GOAL + (tanks[i] >= GOAL ? ' · full' : '');
    t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
  }

  function nextRound() {
    var who = round === 0 ? 'Kepler’s tank' : 'Comet’s tank';
    showResult(who);
    round++;
    setActive();
    if (round === 1) {
      resetRoundStats();
      document.getElementById('round-label').innerHTML = '<strong>Round 2 of 3</strong> · Fill Comet’s tank';
      Solve.setGoal('fill_c');
      Solve.feedback('<span class="tag">Kepler’s tank is full</span>Next: fill Comet’s tank the same way.', 'good');
    } else {
      running = false;
      cell.classList.add('paused');
      // Clear leftover bubbles for the quiz
      bubbles.forEach(function (o) { if (!o.done) { o.done = true; if (o.el.parentNode) o.el.remove(); } });
      document.getElementById('round-label').innerHTML = '<strong>Round 3 of 3</strong> · The count';
      Solve.setHintStep('quiz');
      Solve.setGoal('quiz');
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
        Solve.feedback('<span class="tag">Right</span>2 H<sub>2</sub>O → 2 H<sub>2</sub> + O<sub>2</sub>. Two hydrogen escape for every oxygen you keep. The counters match that ratio.', 'good');
        setTimeout(function () {
          Solve.finish({
            who: 'Comet',
            line: 'Tanks full. The hydrogen all vented.',
            fact: 'Electrolysis of melted ice is one main way a Mars base could make oxygen. It costs a lot of electricity — that is the next problem.',
            resultClip: 'oxygen_r_done'
          });
        }, 700);
      } else {
        btn.classList.add('wrong');
        Solve.feedback('<span class="tag">Count again</span>' + (btn.dataset.a === 'same'
          ? 'Water is H<sub>2</sub>O: two hydrogen for each oxygen. Split it and twice as many H<sub>2</sub> come out.'
          : 'Other way round. Water holds more hydrogen than oxygen, so more H<sub>2</sub> leaves.'), 'warn');
      }
    });
  });

  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (running) {
      spawnAcc += dt;
      // Slower batch spawn so three bubbles (1 O + 2 H) are readable
      if (spawnAcc > (reduce ? 1.8 : 1.35)) { spawnAcc = 0; spawnBatch(); }
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var o = bubbles[i];
        if (o.done) continue;
        o.phase += dt * 2.2;
        o.y -= SPEED * dt * (o.kind === 'h' ? 1.15 : 1);
        o.x += (o.tx - o.x) * dt * 0.35 + Math.sin(o.phase) * 0.35;
        place(o);
        if (o.y < -30) {
          if (o.kind === 'h') {
            escapeH(o, false);
          } else {
            o.done = true; o.el.remove();
            oLost++; roundOLost++;
            paintCounters();
            if (oLost === 1 || oLost % 4 === 0) {
              Solve.feedback('<span class="tag">O<sub>2</sub> missed</span>An oxygen bubble left unused. The two H₂ made with it still vented. Tap O₂ while it is in reach.', '');
            }
          }
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__solveTest = {
    tapNextO: function () {
      for (var i = 0; i < bubbles.length; i++) if (!bubbles[i].done && bubbles[i].kind === 'o') { tap(bubbles[i]); return true; }
      return false;
    },
    counts: function () {
      return {
        hMade: hMade, oMade: oMade, hEscaped: hEscaped, oKept: oKept, oLost: oLost,
        hStored: hStored, ratioOk: hMade === 2 * oMade, escOk: hEscaped === hMade - hStored
      };
    },
    flushHydrogen: flushHydrogen
  };
})();
