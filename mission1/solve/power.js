(function () {
  var DEV = [
    { id: 'melt',  name: 'Ice melter',      cost: 3, note: 'Ice in, water out' },
    { id: 'cell',  name: 'Electrolysis cell', cost: 4, note: 'Water in, oxygen out' },
    { id: 'fan',   name: 'The fan',          cost: 1, note: 'Keeps the air mixed' },
    { id: 'heat',  name: 'Habitat heater',   cost: 2, note: 'Keeps the ants above −70 °C' },
    { id: 'radio', name: 'Radio to Earth',   cost: 2, note: 'Earth would like an update' },
    { id: 'snack', name: 'Snack warmer',     cost: 3, note: 'Comet’s. Non-negotiable, per Comet' },
    { id: 'light', name: 'Lights',           cost: 1, note: 'Optional at noon' }
  ];
  var ROUNDS = [
    { label: 'Noon', sky: 'Sun high', cap: 10, src: 'From the solar panel', dust: 0,
      goal: 'Keep oxygen coming and the air moving.', need: ['melt', 'cell', 'fan'], forbid: [],
      win: 'Oxygen line and fan, inside budget. Kepler writes the number down.' },
    { label: 'Afternoon', sky: 'Dust has settled', cap: 10, src: 'From a dusty solar panel', dust: 3,
      goal: 'Same job. The panel has been dusted, by Mars.', need: ['melt', 'cell', 'fan'], forbid: [],
      win: 'Clean panel, full output. Real rovers lost power to dust for years; Spirit and Opportunity were rescued by passing winds now and then.' },
    { label: 'Night', sky: 'No sun', cap: 4, src: 'From the battery, charged by day', dust: 0,
      goal: 'Get through the night. Breathe from the tank you filled today.', need: ['fan', 'heat'], forbid: ['cell', 'melt'],
      win: 'Heat and air, on battery. The oxygen made at noon is what they breathe at midnight. That is the whole trick.' }
  ];
  var r = 0, on = {}, dustLeft = 0;
  var devBox = document.getElementById('devices');
  var stage = document.getElementById('stage');

  DEV.forEach(function (d) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'dev'; b.dataset.id = d.id; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="cost">' + d.cost + '</span><b>' + d.name + '</b><small>' + d.note + '</small>';
    b.addEventListener('click', function () {
      on[d.id] = !on[d.id];
      b.classList.toggle('on', !!on[d.id]); b.setAttribute('aria-pressed', on[d.id] ? 'true' : 'false');
      update();
    });
    devBox.appendChild(b);
  });

  function cap() { var R = ROUNDS[r]; return R.dust ? Math.max(0, R.cap - dustLeft * 2 - (dustLeft ? 1 : 0)) : R.cap; }
  function used() { var u = 0; DEV.forEach(function (d) { if (on[d.id]) u += d.cost; }); return u; }
  function update() {
    var u = used(), c = cap();
    document.getElementById('used').textContent = u;
    document.getElementById('cap').textContent = c;
    var m = document.querySelector('.meter');
    document.getElementById('meter-fill').style.width = Math.min(100, c ? u / c * 100 : (u ? 100 : 0)) + '%';
    m.classList.toggle('is-over', u > c);
    document.getElementById('over').textContent = u > c ? 'Over by ' + (u - c) : '';
  }

  function setRound(i) {
    r = i; var R = ROUNDS[i];
    document.getElementById('round-label').innerHTML = '<strong>Round ' + (i + 1) + ' of 3</strong> · ' + R.label;
    document.getElementById('sky-tag').textContent = R.sky;
    document.getElementById('goal').textContent = R.goal;
    document.getElementById('src').textContent = R.src;
    stage.classList.toggle('night', i === 2);
    var layer = document.getElementById('dust-layer'); layer.innerHTML = '';
    dustLeft = R.dust;
    var spots = [[34, 48], [58, 40], [74, 62]];
    for (var k = 0; k < R.dust; k++) {
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'dust'; d.setAttribute('aria-label', 'Brush dust off the panel');
      d.style.left = spots[k][0] + '%'; d.style.top = spots[k][1] + '%';
      d.addEventListener('click', function (e) {
        var t = e.currentTarget; if (t.classList.contains('gone')) return;
        t.classList.add('gone'); dustLeft--; update();
        if (dustLeft === 0) Solve.feedback('<span class="tag">Panel clean</span>Back to full output. Dust blocks sunlight; a clean panel is a free upgrade.', 'good');
      });
      layer.appendChild(d);
    }
    on = {}; devBox.querySelectorAll('.dev').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
    update();
  }

  function trip(msg) {
    stage.classList.remove('tripped'); void stage.offsetWidth; stage.classList.add('tripped');
    on = {}; devBox.querySelectorAll('.dev').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
    update();
    Solve.feedback('<span class="tag">Breaker tripped</span>' + msg + ' Everything is off. Kepler resets it without comment.', 'warn');
  }

  document.getElementById('run').addEventListener('click', function () {
    var R = ROUNDS[r], u = used(), c = cap();
    if (u > c) {
      var m = 'Asked for ' + u + ' units from a supply of ' + c + '.';
      if (r === 1 && dustLeft) m = 'The dusty panel only gives ' + c + ' units. Brush the dust off the panel first.';
      else if (r === 2 && on.cell) m = 'The electrolysis cell wants 4 units on its own, and the battery has 4 in total.';
      else if (on.snack) m = 'The snack warmer took 3 units the oxygen line needed.';
      trip(m); return;
    }
    var missing = R.need.filter(function (id) { return !on[id]; });
    var bad = R.forbid.filter(function (id) { return on[id]; });
    if (bad.length) {
      Solve.feedback('<span class="tag">Fits, but</span>No sun, so no new water worth splitting tonight. Turn off the melter and the cell; the tank you filled at noon covers the night.', 'warn'); return;
    }
    if (missing.length) {
      var names = { melt: 'Without the melter there is no liquid water, and electrolysis needs liquid water.',
        cell: 'Without the electrolysis cell, the water just sits there being water.',
        fan: 'Without the fan, oxygen pools in one corner and exhaled CO<sub>2</sub> in another.',
        heat: 'Without heat, a Mars night drops well below −70 °C. Comet has noticed.' };
      Solve.feedback('<span class="tag">Something’s missing</span>' + names[missing[0]], 'warn'); return;
    }
    var extra = on.snack ? ' The snack warmer also ran. Comet considers this a policy win.' : '';
    Solve.feedback('<span class="tag">Holds</span>' + R.win + extra, 'good');
    document.getElementById('run').disabled = true;
    setTimeout(function () {
      document.getElementById('run').disabled = false;
      if (r < 2) { setRound(r + 1); window.scrollTo({ top: stage.offsetTop - 70, behavior: 'smooth' }); }
      else Solve.finish({ who: 'Comet', line: 'We have a budget now. I have been told that is the opposite of snacks.',
        fact: 'Power is the quiet bottleneck of every real Mars plan. Solar output drops with dust and disappears at night, which is why NASA has also studied small nuclear reactors for surface power.' });
    }, 1900);
  });

  setRound(0);
})();
