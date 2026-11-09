(function () {
  var ctx = null;
  function audio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // Bell-like strike: inharmonic partials with exponential decay. Cracked = short, buzzy, damped.
  function strike(o) {
    var ac = audio(); if (!ac) return;
    var t = ac.currentTime + 0.02;
    var out = ac.createGain(); out.gain.value = o.quiet ? 0.28 : 0.6;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.quiet ? 1800 : 9000;
    out.connect(lp); lp.connect(ac.destination);
    var ratios = [1, 2.0, 2.76, 3.9, 5.4], amps = [1, 0.5, 0.35, 0.2, 0.12];
    var decay = o.cracked ? 0.22 : 2.4;
    ratios.forEach(function (r, i) {
      var osc = ac.createOscillator(); var g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = o.f * r * (o.cracked ? (1 + (i % 2 ? 0.012 : -0.008)) : 1);
      var d = decay / (1 + i * 0.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25 * amps[i], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + d + 0.05);
    });
    if (o.cracked) {
      // rattle: noise burst through a bandpass, amplitude-chopped
      var len = Math.floor(ac.sampleRate * 0.3), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
      for (var k = 0; k < len; k++) ch[k] = (Math.random() * 2 - 1) * (Math.sin(k / ac.sampleRate * 2 * Math.PI * 38) > 0 ? 1 : 0.25);
      var n = ac.createBufferSource(); n.buffer = buf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f * 1.5; bp.Q.value = 3;
      var ng = ac.createGain(); ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t);
    }
  }

  var DOME_SVG = function (segs) {
    return '<svg viewBox="0 0 240 150" aria-hidden="true">' +
      '<ellipse class="ripple" cx="120" cy="88" rx="96" ry="62"/><ellipse class="ripple" cx="120" cy="88" rx="96" ry="62"/><ellipse class="ripple" cx="120" cy="88" rx="96" ry="62"/>' +
      '<g class="shell"><path d="M30 128 A90 90 0 0 1 210 128 Z" fill="rgba(200,225,235,0.10)" stroke="#d8c4a8" stroke-width="2"/>' +
      (segs ? '<g class="seg" data-seg="0"><path d="M30 128 A90 90 0 0 1 75 50 L120 128Z" fill="rgba(0,0,0,0)" stroke="none"/></g>' +
              '<g class="seg" data-seg="1"><path d="M75 50 A90 90 0 0 1 165 50 L120 128Z" fill="rgba(0,0,0,0)" stroke="none"/></g>' +
              '<g class="seg" data-seg="2"><path d="M165 50 A90 90 0 0 1 210 128 L120 128Z" fill="rgba(0,0,0,0)" stroke="none"/></g>' : '') +
      '<path d="M75 50 L120 128 M165 50 L120 128" stroke="#d8c4a8" stroke-width="1" opacity=".45"/>' +
      '<path d="M44 92 Q120 70 196 92" fill="none" stroke="#d8c4a8" stroke-width="1" opacity=".35"/>' +
      '<rect class="patch" x="132" y="58" width="22" height="16" rx="2" fill="#8a5a32" stroke="#e8a05a" transform="rotate(18 143 66)"/>' +
      '<path d="M50 84 Q60 60 84 48" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="20" y="126" width="200" height="10" rx="3" fill="#6b5442"/></g></svg>';
  };

  var domes = document.getElementById('domes'), answers = document.getElementById('answers');
  var round = 0, stage = 'judge';

  function ringDome(el, o) {
    strike(o);
    el.classList.remove('ringing', 'clear', 'dull'); void el.offsetWidth;
    el.classList.add('ringing', o.cracked ? 'dull' : 'clear');
    var bar = el.querySelector('.ring-len i');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = 'width ' + (o.cracked ? 0.25 : 1.8) + 's ease-out'; bar.style.width = o.cracked ? '12%' : '100%'; }
    var cap = el.querySelector('.cap');
    if (cap) cap.innerHTML = round === 1 ? (o.cracked ? '<b>Dull.</b> Short, with a rattle.' : '<b>Clear.</b> Rings on for a while.') : '<b>Rang.</b> Watch how long it lasts.';
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('ringing'); }, o.cracked ? 400 : 2600);
    el.dataset.rung = '1';
  }

  function makeDome(o, label) {
    var b = document.createElement('div');
    b.className = 'dome'; b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.setAttribute('aria-label', 'Ring ' + label);
    b.innerHTML = DOME_SVG(false) + '<div class="ring-len"><i></i></div><span class="cap">' + label + ' · tap to ring</span>';
    b.addEventListener('click', function () { ringDome(b, o); });
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ringDome(b, o); } });
    return b;
  }

  function choice(text, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = text;
    b.addEventListener('click', function () { fn(b); }); answers.appendChild(b); return b;
  }
  function needRing(el) {
    if (el.dataset.rung) return false;
    Solve.feedback('<span class="tag">Ring it first</span>Tap the habitat. Guessing is how you end up patching good walls.', 'warn');
    return true;
  }
  function label(i, txt) { round = i; document.getElementById('round-label').innerHTML = '<strong>Round ' + i + ' of 3</strong>'; document.getElementById('goal').textContent = txt; }

  // Round 1: sealed
  function r1() {
    label(1, 'Habitat shell one. Is it sealed?');
    var o = { f: 392, cracked: false };
    domes.className = 'domes'; domes.innerHTML = ''; answers.className = 'answers'; answers.innerHTML = '';
    var d = makeDome(o, 'Shell one'); domes.appendChild(d);
    choice('Seal holds', function (b) {
      if (needRing(d)) return;
      b.classList.add('right'); answers.querySelectorAll('.choice').forEach(function (x) { x.disabled = true; });
      Solve.feedback('<span class="tag">Correct</span>Long and clear means the shell vibrates as one piece. Engineers tap-test real structures the same way, listening for the dull spot.', 'good');
      setTimeout(r2, 1700);
    });
    choice('Leak', function (b) {
      if (needRing(d)) return;
      b.classList.add('wrong');
      Solve.feedback('<span class="tag">Comet patches it anyway</span>A perfectly good wall now has a patch on it. Listen again: it rang long and clear. That is the sound of a sealed shell.', 'warn');
    });
  }

  // Round 2: cracked, then find the panel
  var crackSeg = 1;
  function r2() {
    label(2, 'Shell two. Comet would like to take his helmet off in here.');
    var o = { f: 349, cracked: true };
    domes.innerHTML = ''; answers.innerHTML = '';
    var d = makeDome(o, 'Shell two'); domes.appendChild(d);
    document.getElementById('cg').hidden = false;
    choice('Seal holds', function (b) {
      if (needRing(d)) return;
      b.classList.add('wrong');
      document.getElementById('cg-fill').style.width = '35%';
      Solve.feedback('<span class="tag">Hiss</span>Comet unlatches his helmet. The gauge drops. Kepler: “Helmet on.” That ring was short and rattly. That is a crack.', 'warn');
      setTimeout(function () { document.getElementById('cg-fill').style.width = '100%'; }, 1800);
    });
    choice('Leak', function (b) {
      if (needRing(d)) return;
      b.classList.add('right');
      Solve.feedback('<span class="tag">Correct</span>Dull and short. Now find which panel is cracked. Tap each panel and listen.', 'good');
      findPanel(d);
    });
  }
  function findPanel(d) {
    crackSeg = Math.floor(Math.random() * 3);
    d.innerHTML = DOME_SVG(true) + '<div class="ring-len"><i></i></div><span class="cap">Tap a panel: left, top or right</span>';
    var dd = d.cloneNode(true); d.replaceWith(dd); d = dd;
    d.removeAttribute('role'); d.removeAttribute('tabindex');
    var names = ['left', 'top', 'right'];
    d.querySelectorAll('.seg').forEach(function (s) {
      s.addEventListener('click', function (e) {
        e.stopPropagation(); var i = +s.dataset.seg;
        d.querySelectorAll('.seg').forEach(function (x) { x.classList.remove('hot'); }); s.classList.add('hot');
        ringDome(d, { f: 349 + i * 20, cracked: i === crackSeg });
      });
    });
    answers.className = 'answers three'; answers.innerHTML = '';
    names.forEach(function (nm, i) {
      choice('Patch ' + nm, function (b) {
        if (i !== crackSeg) {
          b.classList.add('wrong');
          Solve.feedback('<span class="tag">That one rang clear</span>Patching a sound panel is just decorating. Tap each panel; the cracked one dies quickly.', 'warn'); return;
        }
        b.classList.add('right'); answers.querySelectorAll('.choice').forEach(function (x) { x.disabled = true; });
        var p = d.querySelector('.patch');
        var pos = [[52, 92, -30], [110, 46, 0], [168, 92, 30]][i];
        p.setAttribute('x', pos[0]); p.setAttribute('y', pos[1]); p.setAttribute('transform', 'rotate(' + pos[2] + ' ' + (pos[0] + 11) + ' ' + (pos[1] + 8) + ')');
        d.classList.add('patched');
        setTimeout(function () { ringDome(d, { f: 349, cracked: false }); }, 500);
        Solve.feedback('<span class="tag">Patched</span>Second ring: clear. Kepler: “Seal holds.” Comet’s helmet stays on anyway, as a matter of principle.', 'good');
        setTimeout(r3, 3000);
      });
    });
  }

  // Round 3: Mars air — quieter, judge by length not loudness
  function r3() {
    label(3, 'Outside now, in Mars air. Everything sounds quieter. Which shell is sealed?');
    document.getElementById('air-tag').textContent = 'Outside, thin CO₂ air';
    document.getElementById('stage').classList.add('mars');
    document.getElementById('cg').hidden = true;
    domes.className = 'domes two'; domes.innerHTML = ''; answers.className = 'answers'; answers.innerHTML = '';
    var sealedLeft = Math.random() < 0.5;
    var A = makeDome({ f: 330, cracked: !sealedLeft, quiet: true }, 'Shell A');
    var B = makeDome({ f: 370, cracked: sealedLeft, quiet: true }, 'Shell B');
    domes.appendChild(A); domes.appendChild(B);
    function pick(isLeft, b) {
      if (!A.dataset.rung || !B.dataset.rung) { Solve.feedback('<span class="tag">Ring both</span>Compare them. In thin air, the difference is in how long the ring lasts.', 'warn'); return; }
      if (isLeft === sealedLeft) {
        b.classList.add('right'); answers.querySelectorAll('.choice').forEach(function (x) { x.disabled = true; });
        Solve.feedback('<span class="tag">Correct</span>Quiet is not the same as cracked. Perseverance’s microphones found Mars sound much fainter than on Earth, with high pitches arriving slightly faster than low ones. Length still tells the truth.', 'good');
        setTimeout(function () {
          Solve.finish({ who: 'Kepler', line: 'Seal holds.', fact: 'Real habitats are pressure vessels: the air inside pushes out on every seam, all the time. Finding leaks, by sound, pressure drop or anything else, is a permanent job.' });
        }, 1600);
      } else {
        b.classList.add('wrong');
        Solve.feedback('<span class="tag">That one cut off short</span>Both are quiet out here. The sealed one keeps ringing; the cracked one stops almost at once. Ring them again.', 'warn');
      }
    }
    choice('Shell A is sealed', function (b) { pick(true, b); });
    choice('Shell B is sealed', function (b) { pick(false, b); });
    window.__ring = { sealedLeft: sealedLeft };
  }
  window.__ringTest = { crack: function () { return crackSeg; } };
  r1();
})();
