(function () {
  var PARTS = [
    { id: 'base',   name: 'Base plate', note: 'Pod floor panel' },
    { id: 'motor',  name: 'Motor',      note: 'Out of the hatch winch' },
    { id: 'blades', name: 'Blades',     note: 'Bent heat-shield trim' },
    { id: 'guard',  name: 'Guard cage', note: 'Formerly a seat back' },
    { id: 'cable',  name: 'Power cable',note: 'To the solar panel' }
  ];
  var WHY = {
    motor:  'The motor rolls off the bench and across the dust. It needs something to stand on first.',
    blades: 'Blades with nothing to turn them. Comet spins them by hand. That is a hobby, not a fan.',
    guard:  'A cage around nothing. The guard goes on over the blades, once there are blades.',
    cable:  'Power goes on last. Kepler has seen what a live blade does to antennae.',
    base:   'The base is already on. One is plenty.'
  };
  var CABLE_EARLY = 'A cable connected to nothing. Very safe. Not useful. Power goes on last.';
  var step = 0;
  var bench = document.getElementById('bench');
  var tray = document.getElementById('tray');
  var svg = bench.querySelector('svg');

  Solve.shuffle(PARTS).forEach(function (p) {
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
        base: 'Base down. The fan now has a floor, which is more than the colony had this morning.',
        motor: 'Motor bolted on. It hums faintly, out of habit.',
        blades: 'Blades on the shaft. Comet gives them a test flick. Kepler says nothing, loudly.',
        guard: 'Cage over the blades. Antennae are now optional to protect, rather than mandatory.',
        cable: 'Cable to the panel, last, as it should be.'
      };
      Solve.feedback('<span class="tag">Fits</span>' + good[id], 'good');
      if (step === PARTS.length) built();
    } else {
      chip.classList.remove('wrong'); void chip.offsetWidth; chip.classList.add('wrong');
      setTimeout(function () { chip.classList.remove('wrong'); }, 700);
      bench.classList.remove('shake'); void bench.offsetWidth; bench.classList.add('shake');
      var msg = (id === 'cable' && step < 2) ? CABLE_EARLY : WHY[id];
      if (id === 'cable' && step >= 2) msg = WHY.cable;
      if (id === 'guard' && step === 2) msg = 'The cage goes over the blades. Fitting it now means taking it off again in a minute.';
      if (id === 'blades' && step === 0) msg = 'Blades first means holding them in the air while someone finds a motor. Start from the bottom.';
      Solve.feedback('<span class="tag">Not yet</span>' + msg, 'warn');
    }
  }

  function attachDrag(chip) {
    var sx, sy, ghost = null, dragging = false, pid = null;
    chip.addEventListener('pointerdown', function (e) {
      if (chip.classList.contains('used')) return;
      sx = e.clientX; sy = e.clientY; pid = e.pointerId; dragging = false;
      try { chip.setPointerCapture(pid); } catch (x) {}
    });
    chip.addEventListener('pointermove', function (e) {
      if (pid === null || e.pointerId !== pid) return;
      if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
        dragging = true;
        ghost = chip.cloneNode(true); ghost.classList.add('drag-ghost');
        ghost.style.width = chip.offsetWidth + 'px';
        document.body.appendChild(ghost); chip.classList.add('dragging');
      }
      if (dragging) {
        ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
        bench.classList.toggle('over', overBench(e));
      }
    });
    function end(e) {
      if (pid === null) return;
      var wasDrag = dragging;
      if (dragging) {
        var hit = overBench(e);
        ghost.remove(); ghost = null; chip.classList.remove('dragging'); bench.classList.remove('over');
        if (hit) attempt(chip.dataset.id, chip);
      }
      pid = null; dragging = false;
      chip.dataset.dragged = wasDrag ? '1' : '';
      if (wasDrag) setTimeout(function () { chip.dataset.dragged = ''; }, 60);
    }
    chip.addEventListener('pointerup', end);
    chip.addEventListener('pointercancel', end);
    chip.addEventListener('click', function (e) {
      if (chip.dataset.dragged === '1') { chip.dataset.dragged = ''; return; }
      attempt(chip.dataset.id, chip);
    });
  }
  function overBench(e) {
    var r = bench.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  function built() {
    document.getElementById('drop-hint').hidden = true;
    document.getElementById('round-label').innerHTML = '<strong>Round 2 of 3</strong> · Switch it on';
    document.getElementById('switch-row').hidden = false;
  }

  document.getElementById('switch').addEventListener('click', function () {
    bench.classList.add('running');
    document.getElementById('switch-row').hidden = true;
    document.getElementById('gauge').hidden = false;
    Solve.feedback('<span class="tag">It works</span>Dust leaves the bench at speed. Comet: “Wind is basically air.” Kepler is watching the helmet gauge.', 'good');
    ask(0);
  });

  var QS = [
    { q: 'The fan is running. What has it done to the oxygen supply?',
      a: [
        { t: 'Nothing. It moves gas around, it doesn’t make any.', ok: true },
        { t: 'Raised it a little. Fast dust counts as wind.', why: 'The gauge does not move. Wind is just the same thin CO<sub>2</sub> going somewhere else. Making oxygen takes chemistry.' },
        { t: 'Raised it a lot. It’s a very good fan.', why: 'It is a very good fan. The gauge still does not move. A fan moves gas; electrolysis makes oxygen.' }
      ],
      right: 'Correct, and the gauge agrees. Blowing regolith around is exercise, not chemistry.' },
    { q: 'Kepler wants to keep the fan. What is it actually good for?',
      a: [
        { t: 'Pointing at the sky to make more atmosphere', why: 'Mars air is about 0.6% of Earth’s pressure and 95% CO<sub>2</sub>. The fan moves very little of it, and none of that is breathable.' },
        { t: 'Mixing the air inside the sealed habitat', ok: true },
        { t: 'Blowing dust onto the solar panel', why: 'The panel goes dim and so does Kepler’s expression. Dust on a panel cuts its power.' }
      ],
      right: 'Sealed habitats need fans to push air through the life-support gear and keep oxygen evenly mixed. On the ISS they run day and night; without them, exhaled CO<sub>2</sub> can pool around a sleeping astronaut’s head.' }
  ];

  function ask(i) {
    var Q = QS[i];
    document.getElementById('round-label').innerHTML = '<strong>Round ' + (i + 2) + ' of 3</strong> · ' + (i === 0 ? 'Check the gauge' : 'Give it a job');
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
              Solve.finish({ who: 'Kepler', line: 'It spins. It still doesn’t make oxygen. It can stay.',
                fact: 'Real habitats need air circulation as much as air. The colony now has both a fan and a reason for it.' });
            }, 900);
          }
        } else {
          b.classList.add('wrong');
          document.getElementById('g-tx').textContent = 'unchanged';
          Solve.feedback('<span class="tag">Kepler checks the gauge</span>' + opt.why, 'warn');
        }
      });
      box.appendChild(b);
    });
    setTimeout(function () { quiz.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
  }
})();
