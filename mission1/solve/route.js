(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    ice:    '<path d="M-12 6 L-4 -10 L8 -8 L13 6 L2 12Z" fill="#cfe6ee" opacity=".85"/><path d="M-4 -10 L2 12 M8 -8 L-12 6" stroke="#7eb8c9" stroke-width="1" opacity=".7"/>',
    melt:   '<rect x="-11" y="-9" width="22" height="18" rx="3" fill="#6b5442"/><path d="M-6 -2 q3 -4 6 0 t6 0" stroke="#e8a05a" stroke-width="2" fill="none"/><path d="M-6 4 q3 -4 6 0 t6 0" stroke="#e8a05a" stroke-width="2" fill="none"/>',
    split:  '<rect x="-10" y="-12" width="20" height="24" rx="4" fill="rgba(169,216,228,0.35)" stroke="#a9d8e4"/><circle cx="-4" cy="4" r="2.2" fill="#e9f3f6"/><circle cx="3" cy="-2" r="2.8" fill="#e9f3f6"/><circle cx="-2" cy="-6" r="1.8" fill="#e9f3f6"/>',
    tank:   '<rect x="-8" y="-13" width="16" height="26" rx="7" fill="#8a7a68" stroke="#c9b8a4"/><rect x="-3" y="-17" width="6" height="5" fill="#6b5442"/><text x="0" y="4" style="font-size:8px;stroke:none;fill:#1a0f0a">O2</text>',
    hab:    '<path d="M-17 9 A17 17 0 0 1 17 9Z" fill="rgba(169,216,228,0.25)" stroke="#d8c4a8" stroke-width="1.5"/><rect x="-19" y="8" width="38" height="4" rx="1" fill="#6b5442"/>',
    panel:  '<path d="M-14 9 L-8 -9 L14 -9 L8 9Z" fill="#2a3a52" stroke="#8aa0b8"/><path d="M-11 0 L11 0 M0 -9 L-3 9" stroke="#8aa0b8" stroke-width=".7"/>',
    vent:   '<path d="M-4 10 L-4 -6 L4 -6 L4 10" fill="#6b5442"/><circle cx="-2" cy="-11" r="3" fill="none" stroke="#c9b8a4"/><circle cx="4" cy="-15" r="2" fill="none" stroke="#c9b8a4"/>',
    dust:   '<ellipse cx="0" cy="4" rx="14" ry="6" fill="#a0603a"/><ellipse cx="-3" cy="0" rx="8" ry="5" fill="#b8704a"/>',
    snack:  '<rect x="-11" y="-9" width="22" height="18" rx="2" fill="#7a4a2a" stroke="#c9783a"/><path d="M-11 -2h22" stroke="#c9783a"/><circle cx="6" cy="3" r="1.5" fill="#e8a05a"/>',
    fan:    '<circle r="11" fill="none" stroke="#c9a88a" stroke-width="1.5"/><path d="M0 0 C-3 -8 0 -10 2 -10 C3 -6 2 -3 0 0Z M0 0 C8 -2 10 1 9 3 C6 3 3 2 0 0Z M0 0 C-5 6 -8 6 -9 4 C-7 1 -4 0 0 0Z" fill="#b9a48a"/>'
  };
  var N = {
    dust:  { x: 58,  y: 66,  label: 'Dust pile' },
    panel: { x: 180, y: 62,  label: 'Solar panel' },
    vent:  { x: 304, y: 66,  label: 'H₂ vent' },
    melt:  { x: 64,  y: 198, label: 'Melter' },
    split: { x: 180, y: 198, label: 'Splitter' },
    tank:  { x: 298, y: 198, label: 'O₂ tank' },
    ice:   { x: 64,  y: 340, label: 'Ice deposit' },
    snack: { x: 168, y: 300, label: 'Snack locker' },
    hab:   { x: 282, y: 348, label: 'Habitat', r: 40 },
    fan:   { x: 150, y: 386, label: 'The fan', hidden: true }
  };
  var nodesG = document.getElementById('nodes'), linksG = document.getElementById('links'), board = document.getElementById('board');
  var preview = document.getElementById('preview');
  Object.keys(N).forEach(function (id) {
    var n = N[id], r = n.r || 28;
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'node' + (n.hidden ? ' hidden' : '')); g.setAttribute('data-id', id);
    g.setAttribute('transform', 'translate(' + n.x + ' ' + n.y + ')');
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', n.label);
    g.innerHTML = (id === 'hab' ? '<circle class="hab-glow" r="' + (r + 14) + '" fill="rgba(169,216,228,0.18)"/>' : '') +
      '<circle class="ring" r="' + r + '"/><g class="ico"' + (id === 'hab' ? ' transform="scale(1.35)"' : '') + '>' + ICONS[id] + '</g>' +
      '<text y="' + (r + 15) + '">' + n.label + '</text>';
    nodesG.appendChild(g); n.el = g;
  });

  var round = 0, sel = null, links = {}, chainIdx = 0;
  var CHAIN = ['ice', 'melt', 'split', 'tank', 'hab'];
  var R2 = { 'melt|panel': 'wire', 'panel|split': 'wire', 'split|vent': 'h2' };
  var WRONG = {
    'ice|split': 'The splitter jams on a lump of ice. Electrolysis needs liquid water. Melt it first.',
    'ice|hab': 'A block of ice in the living room. Cold, decorative, not air.',
    'ice|tank': 'Ice does not fit through a gas valve. Kepler checked.',
    'melt|tank': 'A tank full of water. Hydrating, not breathable. It needs splitting first.',
    'melt|hab': 'Water in the habitat. Comet is delighted. Nobody can breathe it.',
    'split|hab': 'Straight from the splitter means no reserve. At night the panel stops and so would the air. Fill a tank first.',
    'split|vent': 'That is where the hydrogen goes, later. Right now, follow the oxygen.',
    'tank|vent': 'Venting the oxygen. Bold. Mars already has plenty of nothing.',
    'hab|split': 'Hydrogen in the habitat: flammable, and no use to lungs. Only oxygen goes in.',
    'split|melt': 'That is backwards. Water goes from the melter into the splitter.',
    any_dust: 'Dust. Mars has an unlimited supply and none of it helps. It mostly gets into the valves.',
    any_snack: 'Comet supports this route. It is not a life-support route.',
    any_panel: 'The panel is power, not plumbing. Its cables come in round two.',
    r2_bad: 'Not on this circuit. The panel feeds the machines that need electricity, and the hydrogen needs its own way out.',
    r2_hab_h2: 'Hydrogen in the habitat: flammable, and no use to lungs. Vent it, or store it for fuel later.'
  };
  function key(a, b) { return a + '|' + b; }
  function ukey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  function drawLink(a, b, cls) {
    var A = N[a], B = N[b];
    var p = document.createElementNS(NS, 'path');
    var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - 12;
    p.setAttribute('d', 'M' + A.x + ' ' + A.y + ' Q' + mx + ' ' + my + ' ' + B.x + ' ' + B.y);
    p.setAttribute('class', 'link ' + cls);
    linksG.appendChild(p);
    var len = p.getTotalLength ? p.getTotalLength() : 200;
    if (cls.indexOf('wire') === -1 && cls.indexOf('h2') === -1) {
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset .5s ease'; p.style.strokeDashoffset = '0';
      setTimeout(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; }, 600);
    }
  }
  function setSel(id) {
    if (sel) N[sel].el.classList.remove('sel');
    sel = id; if (sel) N[sel].el.classList.add('sel');
  }
  function bad(id, msg) {
    var el = N[id].el; el.classList.remove('bad'); void el.getBBox; el.classList.add('bad');
    setTimeout(function () { el.classList.remove('bad'); }, 500);
    Solve.feedback('<span class="tag">No</span>' + msg, 'warn');
  }

  function attempt(a, b) {
    if (a === b) return false;
    if (round === 0) {
      var want = CHAIN[chainIdx + 1];
      if (a !== CHAIN[chainIdx]) return false;
      if (b === want) {
        drawLink(a, b, 'pipe o2'); N[b].el.classList.add('done'); N[a].el.classList.remove('start');
        chainIdx++;
        var ok = { melt: 'Ice into the melter. Mars ice is mostly water, with some dust for texture.',
          split: 'Water into the splitter. Electricity breaks it into hydrogen and oxygen.',
          tank: 'Oxygen into the tank. A reserve for the hours without sun.',
          hab: 'Tank to habitat. The life-support chain is complete, on paper.' };
        Solve.feedback('<span class="tag">Connected</span>' + ok[b], 'good');
        if (chainIdx === CHAIN.length - 1) { setSel(null); setTimeout(startR2, 1400); }
        return true;
      }
      var msg = WRONG[key(a, b)] || WRONG['any_' + b] || ('That skips a step. From the ' + N[a].label.toLowerCase() + ', think about what the next thing actually needs.');
      bad(b, msg); return false;
    }
    if (round === 1) {
      var k = ukey(a, b);
      if (R2[k] && !links[k]) {
        links[k] = 1;
        var src = (a === 'panel' || b === 'panel') ? 'panel' : 'split';
        var dst = src === 'panel' ? (a === 'panel' ? b : a) : 'vent';
        drawLink(src, dst, R2[k]);
        var ok2 = { 'melt|panel': 'Panel to melter. Heat makes liquid water out of ice.', 'panel|split': 'Panel to splitter. The current that splits the water.', 'split|vent': 'Hydrogen out the vent, for now. Later colonies might keep it for fuel.' };
        Solve.feedback('<span class="tag">Connected</span>' + ok2[k], 'good');
        var n = Object.keys(links).length;
        document.getElementById('links-tag').innerHTML = 'Connections: <strong>' + n + '</strong> of 3';
        if (n === 3) { setSel(null); setTimeout(startR3, 1400); }
        return true;
      }
      if (links[k]) { Solve.feedback('<span class="tag">Already done</span>That one is connected.', ''); return false; }
      if (k === 'hab|split') { bad(b, WRONG.r2_hab_h2); return false; }
      if (a === 'snack' || b === 'snack') { bad(b, 'Comet: “Technically, that is power routing.” Kepler: “No.”'); return false; }
      bad(b, WRONG.r2_bad); return false;
    }
    if (round === 2) {
      if (ukey(a, b) === 'fan|hab') {
        drawLink('fan', 'hab', 'fan'); N.fan.el.classList.add('done'); setSel(null);
        Solve.feedback('<span class="tag">Fan inside</span>Now the oxygen mixes instead of sitting in one corner. The fan finally has a job.', 'good');
        round = 3; document.getElementById('r3-row').hidden = false;
        return true;
      }
      bad(b, b === 'tank' || a === 'tank' ? 'The fan does not make oxygen. It belongs where the air is: inside the habitat.' : 'The fan belongs inside the habitat, where it can stir the air.');
      return false;
    }
    return false;
  }

  // pointer handling: tap-tap or drag-through
  var down = false;
  function nodeAt(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== board) { if (el.classList && el.classList.contains('node')) return el.getAttribute('data-id'); el = el.parentNode; }
    return null;
  }
  function toSvg(e) {
    var pt = board.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(board.getScreenCTM().inverse());
  }
  board.addEventListener('pointerdown', function (e) {
    var id = nodeAt(e.clientX, e.clientY);
    if (!id || N[id].el.classList.contains('hidden')) return;
    e.preventDefault();
    down = true;
    try { board.setPointerCapture(e.pointerId); } catch (x) {}
    if (round === 0) {
      if (id === CHAIN[chainIdx]) { setSel(id); return; }
      if (sel && attempt(sel, id)) { setSel(CHAIN[chainIdx] === id && chainIdx < CHAIN.length - 1 ? id : null); return; }
      if (!sel) Solve.feedback('<span class="tag">Start at the water</span>Begin from the glowing station and work forward.', '');
      return;
    }
    if (round >= 3) return;
    if (!sel) { setSel(id); return; }
    if (sel === id) { setSel(null); down = false; return; }
    if (attempt(sel, id)) setSel(round === 0 ? id : null); else setSel(id);
  });
  board.addEventListener('pointermove', function (e) {
    if (!down || !sel) { preview.setAttribute('d', ''); return; }
    var p = toSvg(e), A = N[sel];
    preview.setAttribute('d', 'M' + A.x + ' ' + A.y + ' L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1));
    var id = nodeAt(e.clientX, e.clientY);
    if (id && id !== sel && !N[id].el.classList.contains('hidden')) {
      var from = sel;
      if (attempt(from, id)) setSel(round === 0 && chainIdx < CHAIN.length - 1 ? id : null);
      else { down = false; preview.setAttribute('d', ''); }
    }
  });
  function up() { down = false; preview.setAttribute('d', ''); }
  board.addEventListener('pointerup', up); board.addEventListener('pointercancel', up);
  nodesG.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var id = e.target.getAttribute && e.target.getAttribute('data-id'); if (!id) return;
    e.preventDefault();
    if (round === 0) { if (id === CHAIN[chainIdx]) setSel(id); else if (sel) { if (attempt(sel, id)) setSel(id); } return; }
    if (!sel) setSel(id); else if (attempt(sel, id)) setSel(null); else setSel(id);
  });

  function label(i, name, goal) {
    document.getElementById('round-label').innerHTML = '<strong>Round ' + i + ' of 3</strong> · ' + name;
    document.getElementById('goal').textContent = goal;
  }
  function startR1() {
    label(1, 'The air', 'Lay pipe from the ice to the habitat, one station at a time.');
    N.ice.el.classList.add('start', 'done'); setSel('ice');
    document.getElementById('links-tag').textContent = '';
  }
  function startR2() {
    round = 1;
    label(2, 'The power', 'The melter and splitter need electricity, and the splitter’s hydrogen needs a way out. Three connections.');
    document.getElementById('links-tag').innerHTML = 'Connections: <strong>0</strong> of 3';
    Solve.feedback('<span class="tag">Round two</span>Tap a station, then the station it should connect to. Or drag between them.', '');
  }
  function startR3() {
    round = 2;
    label(3, 'The seal', 'Put the fan where it does some good, then ring-test the habitat.');
    N.fan.el.classList.remove('hidden');
    document.getElementById('links-tag').textContent = '';
    Solve.feedback('<span class="tag">Round three</span>The fan has turned up. It would like a job.', '');
  }

  // simple clear ring for the finale (WebAudio)
  function ring() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      var ac = window.__ac || (window.__ac = new AC()); if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime + 0.02;
      [1, 2, 2.76, 5.4].forEach(function (r, i) {
        var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 392 * r;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 / (i + 1), t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / (1 + i * 0.6));
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 2.6);
      });
    } catch (e) {}
  }
  document.getElementById('ring-btn').addEventListener('click', function () {
    ring();
    this.disabled = true;
    board.classList.add('flowing');
    Solve.feedback('<span class="tag">Clear</span>Long, clear ring. Kepler: “Seal holds.” Oxygen flows, the fan stirs it, and the panel pays for all of it.', 'good');
    setTimeout(function () {
      document.getElementById('r3-row').hidden = true;
      var rv = document.getElementById('reveal');
      document.getElementById('done').after(rv);
      rv.hidden = false;
      Solve.finish({ who: 'Comet', line: 'Wrong planet?', fact: 'Kepler: “Right start.” Ice, power, oxygen, circulation and a checked shell: the same pieces every serious Mars habitat plan has to solve.' });
    }, 1800);
  });

  startR1();
  window.__route = { attempt: attempt, setSel: setSel, round: function () { return round; } };
})();
