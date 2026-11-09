(function () {
  // Power Budget: rank survival priorities, then handle a dust cut, then night battery.
  var DEVICES = {
    air:   { id: 'air',   name: 'Habitat air',         cost: 2, note: 'Air to breathe — minutes without it', rank: 1 },
    heat:  { id: 'heat',  name: 'Habitat heater',      cost: 2, note: 'Keeps the cold out at night',  rank: 2 },
    split: { id: 'split', name: 'Water-splitting rig', cost: 3, note: 'Makes oxygen from melted ice',        rank: 3 },
    radio: { id: 'radio', name: 'Radio to Earth',      cost: 1, note: 'Useful, not needed to stay alive',   rank: 4 },
    light: { id: 'light', name: 'Work lights',         cost: 1, note: 'Helpful for chores, least important', rank: 5 }
  };
  var ORDER = ['air', 'heat', 'split', 'radio', 'light'];
  var RANK_LABEL = ['1st', '2nd', '3rd', '4th', '5th'];

  var step = 'rank'; // rank | dust | night
  var rankIds = Solve.shuffle(ORDER.slice());
  // Never start already solved
  var _guard = 0;
  while (rankIds.join() === ORDER.join() && _guard++ < 10) rankIds = Solve.shuffle(ORDER.slice());
  var on = {};
  var dustLeft = 0;
  var dusty = false;
  var cleaned = false;
  var baseCap = 10;
  var shown = [];
  var rankLocked = false;

  var rankList = document.getElementById('rank-list');
  var rankPanel = document.getElementById('rank-panel');
  var loadPanel = document.getElementById('load-panel');
  var stage = document.getElementById('stage');
  var devBox = document.getElementById('devices');

  fetch('help.json').then(function (r) { return r.json(); }).then(function (h) {
    var H = h.power;
    Solve.installHelp({
      hints: H.hints_by_step,
      goals: H.goals,
      happening: H.happening,
      step: 'rank',
      goal: 'rank',
      happeningStep: 'rank'
    });
  });

  function renderRank() {
    rankList.innerHTML = '';
    rankIds.forEach(function (id, i) {
      var d = DEVICES[id];
      var li = document.createElement('li');
      li.className = 'rank-row' + (rankLocked ? ' ok' : '');
      li.dataset.id = id;
      li.setAttribute('draggable', rankLocked ? 'false' : 'true');
      li.innerHTML =
        '<span class="rank-num">' + (i + 1) + '</span>' +
        '<div><b>' + d.name + '</b><small>' + d.note + '</small></div>' +
        '<div class="rank-moves">' +
          '<button type="button" data-dir="up" aria-label="Move up" ' + (rankLocked || i === 0 ? 'disabled' : '') + '>▲</button>' +
          '<button type="button" data-dir="down" aria-label="Move down" ' + (rankLocked || i === rankIds.length - 1 ? 'disabled' : '') + '>▼</button>' +
        '</div>';
      if (!rankLocked) {
        li.querySelectorAll('button').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            moveRank(id, btn.getAttribute('data-dir'));
          });
        });
        attachDrag(li);
      }
      rankList.appendChild(li);
    });
  }

  function moveRank(id, dir) {
    var i = rankIds.indexOf(id);
    if (i < 0) return;
    var j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rankIds.length) return;
    var t = rankIds[i]; rankIds[i] = rankIds[j]; rankIds[j] = t;
    renderRank();
  }

  function attachDrag(li) {
    li.addEventListener('dragstart', function (e) {
      li.classList.add('dragging');
      e.dataTransfer.setData('text/plain', li.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', function () { li.classList.remove('dragging'); });
    li.addEventListener('dragover', function (e) {
      e.preventDefault();
      li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', function () { li.classList.remove('drag-over'); });
    li.addEventListener('drop', function (e) {
      e.preventDefault();
      li.classList.remove('drag-over');
      var from = e.dataTransfer.getData('text/plain');
      var to = li.dataset.id;
      if (!from || from === to) return;
      var a = rankIds.indexOf(from), b = rankIds.indexOf(to);
      if (a < 0 || b < 0) return;
      rankIds.splice(a, 1);
      rankIds.splice(b, 0, from);
      renderRank();
    });
    // Touch-friendly long-press reorder: tap row then tap target to swap
    li.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      if (rankList._pick && rankList._pick !== li.dataset.id) {
        var a = rankIds.indexOf(rankList._pick), b = rankIds.indexOf(li.dataset.id);
        if (a >= 0 && b >= 0) {
          var t = rankIds[a]; rankIds[a] = rankIds[b]; rankIds[b] = t;
        }
        rankList._pick = null;
        rankList.querySelectorAll('.rank-row').forEach(function (r) { r.style.outline = ''; });
        renderRank();
      } else {
        rankList._pick = li.dataset.id;
        rankList.querySelectorAll('.rank-row').forEach(function (r) {
          r.style.outline = r.dataset.id === li.dataset.id ? '2px solid var(--accent)' : '';
        });
      }
    });
  }

  function checkRank() {
    var wrongAt = -1;
    for (var i = 0; i < ORDER.length; i++) {
      if (rankIds[i] !== ORDER[i]) { wrongAt = i; break; }
    }
    if (wrongAt < 0) {
      rankLocked = true;
      renderRank();
      Solve.feedback('<span class="tag">Order set</span>Air, then heat, then the oxygen rig, then radio, then lights.', 'good');
      document.getElementById('check-rank').disabled = true;
      setTimeout(startDust, 1400);
      return;
    }
    var got = DEVICES[rankIds[wrongAt]].name;
    var want = DEVICES[ORDER[wrongAt]].name;
    var why = {
      0: 'Without air you last only minutes. Air belongs at the top.',
      1: 'After air, cold is next. The heater is second.',
      2: 'The water-splitting rig makes more oxygen, but only after air and heat.',
      3: 'Radio helps later. Keep it above lights.',
      4: 'Lights are last. Useful, not needed to stay alive.'
    };
    Solve.feedback('<span class="tag">Not yet</span>Slot ' + (wrongAt + 1) + ' has ' + got + '. ' + why[wrongAt], 'warn');
  }

  function cap() {
    if (step === 'night') return 4;
    if (step === 'dust') {
      if (dustLeft > 0) return Math.max(0, 4); // fully dusty
      if (!cleaned) return 4;
      return 8; // cleaned
    }
    return baseCap;
  }

  function used() {
    var u = 0;
    shown.forEach(function (id) { if (on[id]) u += DEVICES[id].cost; });
    return u;
  }

  function updateMeter() {
    var u = used(), c = cap();
    var shortfall = Math.max(0, u - c);
    var spare = Math.max(0, c - u);
    document.getElementById('used').textContent = u;
    document.getElementById('cap').textContent = c;
    var supplyLabel = document.getElementById('supply-label');
    if (supplyLabel) {
      supplyLabel.textContent = step === 'night' ? 'Battery holds' : 'Panel makes';
    }
    var m = document.querySelector('.meter');
    var status = document.getElementById('meter-status');
    document.getElementById('meter-fill').style.width = Math.min(100, c ? (u / c * 100) : (u ? 100 : 0)) + '%';
    m.classList.toggle('is-over', u > c);
    if (status) {
      status.classList.toggle('is-over', u > c);
      status.classList.toggle('is-low', u <= c && spare <= 1 && u > 0);
      if (u > c) {
        status.textContent = 'Not enough power. ' + shortfall + ' short.';
      } else {
        status.textContent = 'Enough power. ' + spare + ' spare.';
      }
    }
  }

  function renderDevices(ids) {
    shown = ids;
    devBox.innerHTML = '';
    ids.forEach(function (id) {
      var d = DEVICES[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dev' + (on[id] ? ' on' : '') + (id === 'air' || id === 'heat' ? ' must' : '');
      b.dataset.id = d.id;
      b.setAttribute('aria-pressed', on[id] ? 'true' : 'false');
      var prio = RANK_LABEL[ORDER.indexOf(id)] + ' priority';
      b.innerHTML =
        '<span class="cost-label">draws ' + d.cost + '</span>' +
        '<b>' + d.name + '</b>' +
        '<small>' + d.note + '</small>' +
        '<span class="prio-tag">' + prio + '</span>';
      b.addEventListener('click', function () {
        on[d.id] = !on[d.id];
        b.classList.toggle('on', !!on[d.id]);
        b.setAttribute('aria-pressed', on[d.id] ? 'true' : 'false');
        updateMeter();
      });
      devBox.appendChild(b);
    });
    updateMeter();
  }

  function placeDust(n) {
    var layer = document.getElementById('dust-layer');
    layer.innerHTML = '';
    dustLeft = n;
    dusty = n > 0;
    var veil = document.getElementById('dust-veil');
    veil.hidden = n === 0;
    document.getElementById('clean-row').hidden = n === 0 && cleaned;
    document.getElementById('clean-note').textContent = n > 0
      ? 'Dust is blocking the sunlight'
      : (cleaned ? 'Panel cleaned · more power again' : '');
    var spots = [[38, 44], [55, 38], [72, 50]];
    for (var k = 0; k < n; k++) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'dust';
      d.setAttribute('aria-label', 'Brush dust off the panel');
      d.style.left = spots[k][0] + '%';
      d.style.top = spots[k][1] + '%';
      d.addEventListener('click', function (e) {
        var t = e.currentTarget;
        if (t.classList.contains('gone')) return;
        t.classList.add('gone');
        dustLeft--;
        if (dustLeft === 0) {
          cleaned = true;
          dusty = false;
          document.getElementById('dust-veil').hidden = true;
          document.getElementById('clean-note').textContent = 'Panel cleaned · more power again';
          document.getElementById('clean').disabled = true;
          var m = document.querySelector('.meter');
          m.classList.remove('is-drop'); void m.offsetWidth; m.classList.add('is-drop');
          Solve.feedback('<span class="tag">Cleared</span>Sunlight is back. You have more power, but not a full noon amount.', 'good');
        } else {
          Solve.feedback('<span class="tag">Brushing</span>Still ' + dustLeft + ' dusty spot' + (dustLeft === 1 ? '' : 's') + ' left.', '');
        }
        updateMeter();
      });
      layer.appendChild(d);
    }
  }

  function startDust() {
    step = 'dust';
    rankPanel.hidden = true;
    loadPanel.hidden = false;
    stage.classList.remove('night');
    document.getElementById('round-label').innerHTML = '<strong>Step 2 of 3</strong> · Dust';
    document.getElementById('sky-tag').textContent = 'Dust on the panel';
    var _g = document.getElementById('goal'); if (_g) { _g.textContent = ''; _g.hidden = true; }
    document.getElementById('src').textContent = 'Dusty panel · less power';
    cleaned = false;
    // All devices start ON so the overload is obvious
    on = { air: true, heat: true, split: true, radio: true, light: true };
    placeDust(3);
    renderDevices(ORDER.slice());
    var m = document.querySelector('.meter');
    m.classList.remove('is-drop'); void m.offsetWidth; m.classList.add('is-drop');
    Solve.setHintStep('dust');
    Solve.setGoal('dust');
    Solve.setHappening('dust');
    updateMeter();
    window.scrollTo({ top: stage.offsetTop - 70, behavior: 'smooth' });
  }

  function startNight() {
    step = 'night';
    stage.classList.add('night');
    document.getElementById('round-label').innerHTML = '<strong>Step 3 of 3</strong> · Night';
    document.getElementById('sky-tag').textContent = 'No sun';
    var _g2 = document.getElementById('goal'); if (_g2) { _g2.textContent = ''; _g2.hidden = true; }
    document.getElementById('src').textContent = 'Night battery · 4 units saved in the day';
    document.getElementById('clean-row').hidden = true;
    document.getElementById('dust-veil').hidden = true;
    document.getElementById('dust-layer').innerHTML = '';
    dustLeft = 0; dusty = false;
    on = { air: false, heat: false, split: false, radio: false, light: false };
    // Split still offered but costly — teach turning lowest off; need only air+heat
    renderDevices(['air', 'heat', 'radio', 'light']);
    Solve.setHintStep('night');
    Solve.setGoal('night');
    Solve.setHappening('night');
    updateMeter();
    window.scrollTo({ top: stage.offsetTop - 70, behavior: 'smooth' });
  }

  document.getElementById('clean').addEventListener('click', function () {
    if (dustLeft <= 0) return;
    // Clean all remaining spots
    document.querySelectorAll('.dust:not(.gone)').forEach(function (d) { d.classList.add('gone'); });
    dustLeft = 0;
    cleaned = true;
    dusty = false;
    document.getElementById('dust-veil').hidden = true;
    document.getElementById('clean').disabled = true;
    document.getElementById('clean-note').textContent = 'Panel cleaned · more power again';
    var m = document.querySelector('.meter');
    m.classList.remove('is-drop'); void m.offsetWidth; m.classList.add('is-drop');
    Solve.feedback('<span class="tag">Cleared</span>Sunlight is back. You have more power, but not a full noon amount.', 'good');
    updateMeter();
  });

  document.getElementById('check-rank').addEventListener('click', checkRank);

  document.getElementById('run').addEventListener('click', function () {
    var u = used(), c = cap();
    if (step === 'dust') {
      if (u > c) {
        var msg = dusty
          ? 'Dust still covers the panel. Clean it, or turn off less important devices first.'
          : 'You asked for more power than you have. Turn off the least important devices first.';
        stage.classList.remove('tripped'); void stage.offsetWidth; stage.classList.add('tripped');
        Solve.feedback('<span class="tag">Breaker tripped</span>' + msg, 'warn');
        return;
      }
      if (!on.air) {
        Solve.feedback('<span class="tag">Missing</span>Air is off. Without it you last only minutes.', 'warn');
        return;
      }
      if (!on.heat) {
        Solve.feedback('<span class="tag">Missing</span>The heater is off. Mars nights get far colder than freezing.', 'warn');
        return;
      }
      // Soft teach: if they kept extras while dusty/cleaned but under cap — still OK if air+heat on
      var extras = ['light', 'radio', 'split'].filter(function (id) { return on[id]; });
      if (dusty && extras.length) {
        Solve.feedback('<span class="tag">Tight</span>Air and heat fit, but dust still cuts the panel. Clean it when you can.', 'good');
      } else {
        Solve.feedback('<span class="tag">Holds</span>Air and heat stayed on. You turned the less important ones off first.', 'good');
      }
      document.getElementById('run').disabled = true;
      setTimeout(function () {
        document.getElementById('run').disabled = false;
        startNight();
      }, 1600);
      return;
    }
    if (step === 'night') {
      if (u > c) {
        stage.classList.remove('tripped'); void stage.offsetWidth; stage.classList.add('tripped');
        Solve.feedback('<span class="tag">Breaker tripped</span>The battery holds only this many units. Turn something off first.', 'warn');
        return;
      }
      if (!on.air || !on.heat) {
        Solve.feedback('<span class="tag">Missing</span>Night still needs air and the heater.', 'warn');
        return;
      }
      Solve.feedback('<span class="tag">Holds</span>Battery covers air and heat until morning.', 'good');
      document.getElementById('run').disabled = true;
      setTimeout(function () {
        Solve.finish({
          who: 'Kepler',
          line: 'You kept the crew alive through dust and night.',
          fact: 'On Mars, dust storms can cover solar panels for many Mars days and cut power sharply. Crews plan cleaning and hard priorities ahead of time.',
          resultClip: 'power_r_done'
        });
      }, 1200);
    }
  });

  // Initial UI
  var _g0 = document.getElementById('goal'); if (_g0) { _g0.textContent = ''; _g0.hidden = true; }
  renderRank();

  window.__powerTest = {
    order: ORDER,
    rankIds: function () { return rankIds.slice(); },
    setRank: function (ids) { rankIds = ids.slice(); renderRank(); },
    step: function () { return step; },
    cap: cap,
    used: used,
    startDust: startDust,
    startNight: startNight,
    devices: DEVICES
  };
})();
