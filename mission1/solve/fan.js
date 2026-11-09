(function () {
  var PARTS = [
    { id: 'base',   name: 'Base plate', note: 'Pod floor panel' },
    { id: 'motor',  name: 'Motor',      note: 'Out of the hatch winch' },
    { id: 'blades', name: 'Blades',     note: 'Bent heat-shield trim' },
    { id: 'guard',  name: 'Guard cage', note: 'Formerly a seat back' },
    { id: 'cable',  name: 'Power cable',note: 'To the solar panel' }
  ];
  var WHY = {
    motor:  'The motor needs a base to stand on first.',
    blades: 'Blades need a motor to turn them. Put the motor on before the blades.',
    guard:  'The guard goes on over the blades, once there are blades.',
    cable:  'Power goes on last, after the fan is built.',
    base:   'The base is already on. One is enough.'
  };
  var step = 0;
  var bench = document.getElementById('bench');
  var tray = document.getElementById('tray');
  var svg = bench.querySelector('svg');

  var HELP = null;
  fetch('help.json').then(function (r) { return r.json(); }).then(function (h) {
    HELP = h.fan;
    var hints = {};
    Object.keys(HELP.hints_by_step).forEach(function (k) { hints[k] = HELP.hints_by_step[k]; });
    Solve.installHelp({
      hints: hints,
      goals: HELP.goals,
      happening: HELP.happening,
      step: 'build',
      goal: 'build',
      happeningStep: 'build'
    });
    updateNext();
  });

  function updateNext() {
    if (step >= PARTS.length) return;
    var name = PARTS[step].name;
    Solve.setHappening('build', '<p class="next-need">Next part: <span>' + name + '</span> · ' + step + ' of 5 on</p>');
  }

  var ORDER = PARTS.slice();
  Solve.shuffle(ORDER).forEach(function (p) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chip'; c.dataset.id = p.id;
    c.innerHTML = '<b>' + p.name + '</b><small>' + p.note + '</small>';
    tray.appendChild(c);
    attachDrag(c);
  });

  function attempt(id, chip) {
    var want = PARTS[step].id;
    if (id === want) {
      svg.querySelector('.p-' + id).classList.add('on');
      chip.classList.add('used');
      step++;
      document.getElementById('placed').textContent = step;
      var good = {
        base: 'Base down. The fan has a floor.',
        motor: 'Motor bolted on.',
        blades: 'Blades on the shaft.',
        guard: 'Cage over the blades.',
        cable: 'Cable to the panel, last.'
      };
      Solve.feedback('<span class="tag">Fits</span>' + good[id], 'good');
      if (step === PARTS.length) built();
      else updateNext();
    } else {
      chip.classList.remove('wrong'); void chip.offsetWidth; chip.classList.add('wrong');
      setTimeout(function () { chip.classList.remove('wrong'); }, 700);
      bench.classList.remove('shake'); void bench.offsetWidth; bench.classList.add('shake');
      var msg = WHY[id] || 'Not yet. Check the next part label.';
      if (id === 'guard' && step === 2) msg = 'The cage goes over the blades. Fit the blades first.';
      if (id === 'blades' && step === 0) msg = 'Start from the bottom. Put the base plate on first.';
      if (id === 'cable' && step < 4) msg = 'Power goes on last. Finish the fan body first.';
      Solve.feedback('<span class="tag">Not yet</span>' + msg, 'warn');
    }
  }

  function attachDrag(chip) {
    var sx, sy, ghost = null, dragging = false, pid = null, lx = 0, ly = 0;
    function point(e) {
      var x = e.clientX, y = e.clientY;
      if ((x == null || (x === 0 && y === 0)) && e.touches && e.touches[0]) {
        x = e.touches[0].clientX; y = e.touches[0].clientY;
      }
      if (x != null) { lx = x; ly = y; }
      return { clientX: lx, clientY: ly };
    }
    function startDrag(e) {
      if (chip.classList.contains('used')) return;
      var pt = point(e); sx = pt.clientX; sy = pt.clientY; dragging = false;
      pid = e.pointerId != null ? e.pointerId : 1;
      try { if (e.pointerId != null) chip.setPointerCapture(e.pointerId); } catch (x) {}
    }
    function moveDrag(e) {
      if (pid === null) return;
      if (e.pointerId != null && e.pointerId !== pid) return;
      var pt = point(e);
      if (!dragging && Math.hypot(pt.clientX - sx, pt.clientY - sy) > 8) {
        dragging = true;
        ghost = chip.cloneNode(true); ghost.classList.add('drag-ghost');
        ghost.style.width = chip.offsetWidth + 'px';
        document.body.appendChild(ghost); chip.classList.add('dragging');
      }
      if (dragging) {
        ghost.style.left = pt.clientX + 'px'; ghost.style.top = pt.clientY + 'px';
        bench.classList.toggle('over', overBench(pt));
      }
    }
    function end(e) {
      if (pid === null) return;
      var wasDrag = dragging;
      var pt = point(e || {});
      if (dragging) {
        var hit = overBench(pt);
        if (ghost) ghost.remove(); ghost = null; chip.classList.remove('dragging'); bench.classList.remove('over');
        if (hit) attempt(chip.dataset.id, chip);
      }
      pid = null; dragging = false;
      chip.dataset.dragged = wasDrag ? '1' : '';
      if (wasDrag) setTimeout(function () { chip.dataset.dragged = ''; }, 60);
    }
    chip.addEventListener('pointerdown', startDrag);
    chip.addEventListener('pointermove', moveDrag);
    chip.addEventListener('pointerup', end);
    chip.addEventListener('pointercancel', end);
    // Desktop mouse fallback (some automation paths skip pointer capture)
    chip.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', function (e) { if (pid !== null) moveDrag(e); });
    window.addEventListener('mouseup', function (e) { if (pid !== null) end(e); });
    chip.addEventListener('click', function () {
      if (chip.dataset.dragged === '1') { chip.dataset.dragged = ''; return; }
      attempt(chip.dataset.id, chip);
    });
  }
  function overBench(e) {
    var r = bench.getBoundingClientRect();
    var x = e.clientX, y = e.clientY;
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function built() {
    document.getElementById('drop-hint').hidden = true;
    document.getElementById('round-label').innerHTML = '<strong>Round 2 of 3</strong> · Switch it on';
    document.getElementById('switch-row').hidden = false;
    Solve.setHintStep('gauge');
    Solve.setGoal('gauge');
    Solve.setHappening('running');
  }

  document.getElementById('switch').addEventListener('click', function () {
    bench.classList.add('running');
    document.getElementById('switch-row').hidden = true;
    document.getElementById('gauge').hidden = false;
    Solve.feedback('<span class="tag">It works</span>Dust leaves the bench. The oxygen gauge has not moved.', 'good');
    ask(0);
  });

  var QS = [
    { q: 'The fan is running. What has it done to the oxygen supply?',
      a: [
        { t: 'Nothing. It moves gas around; it does not make any.', ok: true },
        { t: 'Raised it a little.', why: 'The gauge did not move. A fan moves gas; it does not make oxygen.' },
        { t: 'Raised it a lot.', why: 'The gauge still did not move. Making oxygen takes chemistry, not wind.' }
      ],
      right: 'Correct. The gauge agrees. Blowing dust around is not chemistry.' },
    { q: 'What is the fan actually good for?',
      a: [
        { t: 'Pointing at the sky to thicken the atmosphere', why: 'Mars air is about 0.6% of Earth’s pressure and mostly CO₂. The fan does not change that.' },
        { t: 'Mixing the air inside the sealed habitat', ok: true },
        { t: 'Blowing dust onto the solar panel', why: 'Dust on a panel cuts its power. That is the wrong job.' }
      ],
      right: 'Sealed habitats need fans to push air through life support and keep oxygen mixed. On the ISS they run day and night.' }
  ];

  function ask(i) {
    var Q = QS[i];
    document.getElementById('round-label').innerHTML = '<strong>Round ' + (i + 2) + ' of 3</strong> · ' + (i === 0 ? 'Check the gauge' : 'Give it a job');
    Solve.setHintStep(i === 0 ? 'gauge' : 'job');
    Solve.setGoal(i === 0 ? 'gauge' : 'job');
    var quiz = document.getElementById('quiz'); quiz.hidden = false;
    document.getElementById('q').textContent = Q.q;
    var box = document.getElementById('choices'); box.innerHTML = '';
    Q.a.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.textContent = opt.t;
      b.addEventListener('click', function () {
        if (opt.ok) {
          b.classList.add('right');
          box.querySelectorAll('.choice').forEach(function (x) { x.disabled = true; });
          Solve.feedback('<span class="tag">Right</span>' + Q.right, 'good');
          if (i === 0) {
            document.getElementById('g-tx').textContent = 'still unchanged';
            setTimeout(function () { ask(1); }, 1400);
          } else {
            setTimeout(function () {
              Solve.finish({
                who: 'Kepler',
                line: 'It spins. It still does not make oxygen. It can stay.',
                fact: 'Real habitats need air circulation as much as air. The colony now has both a fan and a reason for it.',
                resultClip: 'fan_r_done'
              });
            }, 900);
          }
        } else {
          b.classList.add('wrong');
          document.getElementById('g-tx').textContent = 'unchanged';
          Solve.feedback('<span class="tag">Check the gauge</span>' + opt.why, 'warn');
        }
      });
      box.appendChild(b);
    });
    setTimeout(function () { quiz.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
  }
})();
