(function () {
  var tray = document.getElementById('tray');
  var targets = document.getElementById('targets');
  var speedRow = document.getElementById('speed-row');
  var speedEl = document.getElementById('speed');
  var fanSvg = document.getElementById('fan-svg');
  var bench = document.getElementById('bench');
  var bayCaption = document.getElementById('bay-caption');
  var learned = document.getElementById('learned');
  var deeperBtn = document.getElementById('deeper-btn');
  var deeper = document.getElementById('deeper');
  var helpAudio = document.getElementById('help-audio');

  var placed = { frame: false, motor: false, blades: false };
  var built = false;
  var speed = 0;
  var aimed = null;
  var seen = {};
  var finished = false, finishArmed = false;
  var spoken = {}, talked = {};
  var playGen = 0;
  var idleTimer = null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CAPTIONS = {
    dust: 'Dust', ribbon: 'Ribbon', papers: 'Papers',
    blanket: 'A sleeper', gauge: 'Oxygen gauge'
  };

  if (window.Solve && Solve.installHelp) {
    Solve.installHelp({ hints: {}, goals: {}, happening: {} });
  }

  var LINES = {
    openC:      { who: 'Comet',  clip: 'fan_open_c',         line: "Scrap, a motor, and a little optimism. I can work with that." },
    openK:      { who: 'Kepler', clip: 'fan_open_k',         line: "If we put it together, we can see what it actually does." },
    snapC:      { who: 'Comet',  clip: 'fan_snap_c',         line: "It sat down like it belonged there." },
    builtC:     { who: 'Comet',  clip: 'fan_built_c',        line: "It's a fan. Obviously. Let's see if the air agrees." },
    spinK:      { who: 'Kepler', clip: 'fan_spin_k',         line: "It moves. That's a start." },
    dustC:      { who: 'Comet',  clip: 'fan_dust_c',         line: "Dust didn't stand a chance. I like this already." },
    ribbonC:    { who: 'Comet',  clip: 'fan_ribbon_c',       line: "The ribbon is having a better day than I am." },
    paperC:     { who: 'Comet',  clip: 'fan_paper_c',        line: "Papers everywhere. Still counts as moving air." },
    blanketK:   { who: 'Kepler', clip: 'fan_blanket_k',      line: "The sleeper gets a breeze. That's a real job." },
    gaugeC:     { who: 'Comet',  clip: 'fan_gauge_c',        line: "The gauge didn't even blink. So it moves air. It does not make air." },
    learnedK:   { who: 'Kepler', clip: 'fan_learned_k',      line: "A fan moves air. It does not make oxygen. Once we have air, we will still need this." },
    nudgePart:  { who: 'Comet',  clip: 'fan_nudge_part_c',   line: "The parts snap. I already tried one." },
    nudgeSpeed: { who: 'Comet',  clip: 'fan_nudge_speed_c',  line: "It has a speed dial. I would use it." },
    nudgeGauge: { who: 'Comet',  clip: 'fan_nudge_gauge_c',  line: "The oxygen gauge is still sitting there, looking unimpressed." }
  };
  var TARGET_LINE = { dust: 'dustC', ribbon: 'ribbonC', papers: 'paperC', blanket: 'blanketK', gauge: 'gaugeC' };

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
    box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap');
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
    if (thenKey) {
      setTimeout(function () {
        if (gen !== playGen || spoken[thenKey]) return;
        onEnd();
      }, 12000);
    }
  }

  showLine('openC');
  spoken.openC = true;
  setTimeout(function () {
    if (talked.openK || built || finished) return;
    talked.openK = true;
    showLine('openK');
    spoken.openK = true;
  }, 4000);

  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (finished) return;
    idleTimer = setTimeout(idleNudge, 8000);
  }
  function idleNudge() {
    if (finished || finishArmed) return;
    if (!built) playLine('nudgePart');
    else if (speed < 0.08) playLine('nudgeSpeed');
    else if (!seen.gauge) playLine('nudgeGauge');
    resetIdle();
  }
  resetIdle();

  function allPlaced() { return placed.frame && placed.motor && placed.blades; }

  function snap(part) {
    if (placed[part] || finished) return;
    placed[part] = true;
    var vis = document.getElementById('vis-' + part);
    if (vis) {
      vis.classList.add('on');
      vis.classList.remove('wiggle'); void vis.offsetWidth; vis.classList.add('wiggle');
    }
    var chip = document.getElementById('part-' + part);
    if (chip) chip.classList.add('used');
    if (!talked.snap) { talked.snap = true; playLine('snapC'); }
    resetIdle();
    if (allPlaced() && !built) completeBuild();
  }

  function completeBuild() {
    built = true;
    document.body.classList.add("fan-built");
    tray.hidden = true;
    targets.hidden = false;
    speedRow.hidden = false;
    playLine('builtC');
  }

  function setSpeed(v) {
    speed = Math.max(0, Math.min(1, v));
    speedEl.value = String(Math.round(speed * 100));
    fanSvg.classList.toggle('running', speed > 0.06);
    var dur = (1.15 - speed * 0.85).toFixed(2) + 's';
    fanSvg.style.setProperty('--spin', dur);
    if (speed > 0.06 && !talked.spin) { talked.spin = true; playLine('spinK'); }
    if (aimed) applyAim(aimed, false);
    resetIdle();
  }
  speedEl.addEventListener('input', function () { setSpeed(Number(speedEl.value) / 100); });

  function showTarget(id) {
    document.querySelectorAll('.tgt').forEach(function (g) {
      g.classList.toggle('show', g.id === 'vis-' + id);
      g.classList.remove('blowing');
    });
    bayCaption.textContent = CAPTIONS[id] || '';
  }

  function applyAim(id, announce) {
    aimed = id;
    showTarget(id);
    document.querySelectorAll('.tbtn').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-target') === id ? 'true' : 'false');
    });
    var vis = document.getElementById('vis-' + id);
    var blowing = speed > 0.06;
    if (vis) vis.classList.toggle('blowing', blowing);
    if (blowing) {
      var btn = document.querySelector('.tbtn[data-target="' + id + '"]');
      if (btn) btn.classList.add('seen');
      if (!seen[id]) {
        seen[id] = true;
        if (announce !== false && TARGET_LINE[id]) playLine(TARGET_LINE[id]);
      }
      if (id === 'gauge' && !finishArmed) beginFinish();
    } else if (announce !== false) {
      playLine('nudgeSpeed');
    }
  }

  function beginFinish() {
    if (finishArmed) return;
    finishArmed = true;
    learned.hidden = false;
    setTimeout(function () {
      if (finished) return;
      finished = true;
      if (window.Solve && Solve.finish) {
        Solve.finish({
          who: 'Kepler',
          line: 'A fan moves air. It does not make oxygen.',
          fact: 'Once there is oxygen, the colony will still need something to move it around. That fan has a real job \u2014 just not the one Comet first hoped for.',
          resultClip: 'fan_learned_k'
        });
      }
    }, 2400);
  }

  // Tap or drag parts onto the bench
  function bindPart(chip) {
    var part = chip.getAttribute('data-part');
    chip.addEventListener('click', function () { snap(part); });
    var start = null, ghost = null;
    chip.addEventListener('pointerdown', function (e) {
      if (placed[part] || e.button) return;
      start = { x: e.clientX, y: e.clientY };
      try { chip.setPointerCapture(e.pointerId); } catch (err) {}
    });
    chip.addEventListener('pointermove', function (e) {
      if (!start) return;
      if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        ghost = chip.cloneNode(true);
        ghost.className = 'chip drag-ghost';
        document.body.appendChild(ghost);
        chip.classList.add('dragging');
      }
      if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
    });
    function end(e) {
      if (!start) return;
      var hadGhost = !!ghost;
      if (ghost && ghost.parentNode) ghost.remove();
      ghost = null; chip.classList.remove('dragging');
      var over = document.elementFromPoint(e.clientX, e.clientY);
      start = null;
      if (hadGhost && over && bench.contains(over)) snap(part);
    }
    chip.addEventListener('pointerup', end);
    chip.addEventListener('pointercancel', function () {
      start = null; if (ghost && ghost.parentNode) ghost.remove(); ghost = null; chip.classList.remove('dragging');
    });
  }
  document.querySelectorAll('.chip').forEach(bindPart);

  document.querySelectorAll('.tbtn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyAim(btn.getAttribute('data-target'), true); });
  });

  deeperBtn.addEventListener('click', function () {
    var open = deeper.hidden;
    deeper.hidden = !open;
    deeperBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    deeperBtn.textContent = open ? 'Close deeper' : 'Go deeper';
    if (open) { try { deeper.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  });

  window.__fanToy = {
    assembleAll: function () { ['frame', 'motor', 'blades'].forEach(snap); },
    snap: snap,
    setSpeed: setSpeed,
    aim: function (id) { applyAim(id, true); },
    counts: function () {
      return {
        placed: Object.keys(placed).filter(function (k) { return placed[k]; }),
        built: built, speed: speed, aimed: aimed, seen: Object.keys(seen),
        finished: finished, doneOpen: !!(document.getElementById('done') && !document.getElementById('done').hidden)
      };
    }
  };
})();
