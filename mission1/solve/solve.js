/* Colonies · Mission 1 · Solve it — shared helpers + full read-aloud help */
(function () {
  var KEY = 'colonies_solved_m1';
  var GAMES = [
    { id: 'oxygen', file: 'oxygen.html', title: 'Make Enough Oxygen', art: '../scene06.jpg', blurb: 'Split water. Keep the half you can breathe.' },
    { id: 'fan',    file: 'fan.html',    title: 'Build the Fan',      art: '../scene05.jpg', blurb: 'Assemble it from scrap, then find it a real job.' },
    { id: 'power',  file: 'power.html',  title: 'Power Budget',       art: '../scene03.jpg', blurb: 'Choose what matters most when the panel runs short.' },
    { id: 'ring',   file: 'ring.html',   title: 'Ring Test',          art: '../scene07.jpg', blurb: 'Listen to the habitat. Decide whether to trust it.' },
    { id: 'route',  file: 'route.html',  title: 'Route the Habitat',  art: '../scene08.jpg', blurb: 'Ice to breath, end to end. The finale.' }
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function isSolved(id) { return read().indexOf(id) !== -1; }
  function markSolved(id) {
    var l = read();
    if (l.indexOf(id) === -1) { l.push(id); write(l); }
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

  var fbTimer = null;
  function feedback(html, kind) {
    var el = document.getElementById('feedback');
    if (!el) return;
    el.className = 'feedback show ' + (kind || '');
    el.innerHTML = html;
    clearTimeout(fbTimer);
  }
  function clearFeedback() {
    var el = document.getElementById('feedback');
    if (el) { el.className = 'feedback'; el.innerHTML = ''; }
  }

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f4a3a" stroke="#8fc0a0" stroke-width="1.2"/><path d="M7 12.5l3.2 3.2L17.2 8.6" fill="none" stroke="#e9f3ea" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  var STOP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>';

  function finish(opts) {
    var id = document.body.getAttribute('data-game');
    markSolved(id);
    var idx = -1;
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) idx = i;
    var next = null;
    var solved = read();
    for (var k = 1; k <= GAMES.length; k++) {
      var g = GAMES[(idx + k) % GAMES.length];
      if (solved.indexOf(g.id) === -1) { next = g; break; }
    }
    var who = opts.who === 'Comet' ? 'Comet' : 'Kepler';
    var portrait = who === 'Comet' ? '../../art/comet_portrait.jpg' : '../../art/kepler_portrait.jpg';
    var resultClip = opts.resultClip || null;
    var panel = document.getElementById('done');
    panel.innerHTML =
      '<div class="done-card">' +
        '<div class="solved-badge">' + CHECK + '<span>Solved</span></div>' +
        '<div class="reaction"><img src="' + portrait + '" alt="' + who + '" width="72" height="72" />' +
          '<p><span class="who">' + who + '</span> ' + esc(opts.line) + '</p></div>' +
        (opts.fact ? '<p class="done-fact" id="done-fact">' + opts.fact + '</p>' : '') +
        (resultClip ? '<button type="button" class="btn-speak done-speak" data-clip="' + resultClip + '" aria-label="Read the result">' + PLAY_SVG + '<span>Read the result</span></button>' : '') +
        '<div class="done-actions">' +
          (next ? '<a class="btn primary" href="' + next.file + '">Next: ' + esc(next.title) + '</a>'
                : '<a class="btn primary" href="index.html">All five solved</a>') +
          '<button class="btn ghost" type="button" id="again">Play again</button>' +
        '</div>' +
      '</div>';
    panel.hidden = false;
    document.getElementById('again').addEventListener('click', function () { location.reload(); });
    bindSpeakButtons(panel);
    setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    if (resultClip && !help.muted && !help.autoSpoken[resultClip]) {
      help.autoSpoken[resultClip] = true;
      setTimeout(function () { tryAutoPlay([resultClip], 'result'); }, 200);
    }
    var st = document.getElementById('solved-flag');
    if (st) { st.innerHTML = CHECK + '<span>Solved</span>'; st.hidden = false; }
  }

  function initHeader() {
    var id = document.body.getAttribute('data-game');
    if (!id) return;
    var st = document.getElementById('solved-flag');
    if (st) { st.innerHTML = CHECK + '<span>Solved before</span>'; st.hidden = !isSolved(id); }
    var n = document.getElementById('game-num');
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id && n) n.textContent = (i + 1) + ' of ' + GAMES.length;
  }

  /* ---------- Single shared audio element, play/stop, sentence highlight ---------- */
  var help = {
    byId: {},
    queue: [],
    playing: false,
    activeBtn: null,
    hintStep: 'default',
    hintTier: 0,
    hintsMap: {},
    goals: {},
    happening: {},
    audio: null,
    ready: false,
    autoSpoken: {},
    muted: false,
    pendingAuto: null,
    openBooted: false
  };

  function audioEl() {
    if (!help.audio) {
      help.audio = document.getElementById('help-audio');
      if (!help.audio) {
        help.audio = document.createElement('audio');
        help.audio.id = 'help-audio';
        help.audio.setAttribute('playsinline', '');
        help.audio.setAttribute('webkit-playsinline', '');
        help.audio.preload = 'auto';
        document.body.appendChild(help.audio);
      }
    }
    return help.audio;
  }

  function clearHighlight() {
    document.querySelectorAll('.is-reading').forEach(function (el) { el.classList.remove('is-reading'); });
  }

  function setBtnPlaying(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-playing', !!on);
    var lab = btn.querySelector('span');
    if (lab && btn.classList.contains('btn-read')) lab.textContent = on ? 'Stop' : 'Read the instructions';
    if (lab && btn.classList.contains('btn-speak') && btn.dataset.label) {
      lab.textContent = on ? 'Stop' : btn.dataset.label;
    }
  }

  function stopAll() {
    var a = audioEl();
    try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {}
    help.playing = false;
    help.queue = [];
    clearHighlight();
    if (help.activeBtn) setBtnPlaying(help.activeBtn, false);
    help.activeBtn = null;
    var ri = document.getElementById('read-instr');
    if (ri) setBtnPlaying(ri, false);
  }

  function playQueue(ids, btn) {
    stopAll();
    var clips = [];
    ids.forEach(function (id) { if (help.byId[id]) clips.push(help.byId[id]); });
    if (!clips.length) return;
    help.queue = clips;
    help.playing = true;
    help.activeBtn = btn || null;
    setBtnPlaying(btn, true);
    playNext();
  }

  function playNext() {
    if (!help.playing || !help.queue.length) { stopAll(); return; }
    var clip = help.queue.shift();
    clearHighlight();
    var targets = document.querySelectorAll('[data-clip="' + clip.id + '"]');
    targets.forEach(function (el) {
      if (el.classList.contains('btn-speak') || el.classList.contains('btn-read')) return;
      el.classList.add('is-reading');
    });
    // Also highlight instruction lines
    var line = document.querySelector('.instr-line[data-clip="' + clip.id + '"]');
    if (line) line.classList.add('is-reading');
    var a = audioEl();
    a.setAttribute('playsinline', '');
    a.src = 'audio/' + clip.file;
    var p = a.play();
    if (p && p.catch) p.catch(function () { stopAll(); });
  }

  function bindAudioEvents() {
    var a = audioEl();
    if (a._helpBound) return;
    a._helpBound = true;
    a.addEventListener('ended', function () {
      if (!help.playing) return;
      if (help.queue.length) playNext();
      else stopAll();
    });
    a.addEventListener('error', function () {
      if (help.playing) {
        if (help.queue.length) playNext();
        else stopAll();
      }
    });
  }

  function speakClip(id, btn) {
    if (help.playing && help.activeBtn === btn) { stopAll(); return; }
    playQueue([id], btn);
  }

  function speakMany(ids, btn) {
    if (help.playing && help.activeBtn === btn) { stopAll(); return; }
    playQueue(ids, btn);
  }

  function makeSpeakBtn(clipId, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-speak';
    b.dataset.clip = clipId;
    b.dataset.label = label || 'Listen';
    b.setAttribute('aria-label', label || 'Listen');
    b.innerHTML = PLAY_SVG + '<span>' + (label || 'Listen') + '</span>';
    b.addEventListener('click', function () { speakClip(clipId, b); });
    return b;
  }

  function bindSpeakButtons(root) {
    (root || document).querySelectorAll('.btn-speak[data-clip]').forEach(function (b) {
      if (b._bound) return;
      b._bound = true;
      if (!b.dataset.label) {
        var sp = b.querySelector('span');
        b.dataset.label = sp ? sp.textContent : 'Listen';
      }
      b.addEventListener('click', function () { speakClip(b.dataset.clip, b); });
    });
  }

  /* ---------- Hints (required, tiered, each readable) ---------- */
  function setHintStep(step) {
    help.hintStep = step || 'default';
    help.hintTier = 0;
    var panel = document.getElementById('hint-panel');
    if (panel) { panel.hidden = true; panel.innerHTML = ''; }
  }

  function currentHints() {
    return help.hintsMap[help.hintStep] || help.hintsMap.default || [];
  }

  function showHint() {
    var tiers = currentHints();
    if (!tiers.length) return;
    if (help.hintTier < tiers.length) help.hintTier++;
    var tier = help.hintTier;
    var item = tiers[tier - 1];
    var text = typeof item === 'string' ? item : item.text;
    var clipId = typeof item === 'string' ? null : item.id;
    var panel = document.getElementById('hint-panel');
    if (!panel) return;
    var label = tier === 1 ? 'Hint' : (tier === 2 ? 'Clearer hint' : 'Strong hint');
    var more = tier < tiers.length;
    panel.innerHTML =
      '<div class="hint-head"><span class="htag">' + label + ' · ' + tier + ' of ' + tiers.length + '</span>' +
        (clipId ? '<button type="button" class="btn-speak" data-clip="' + clipId + '" data-label="Read hint" aria-label="Read hint">' + PLAY_SVG + '<span>Read hint</span></button>' : '') +
      '</div>' +
      '<p class="hint-text" ' + (clipId ? 'data-clip="' + clipId + '"' : '') + '>' + text + '</p>' +
      (more ? '<div class="hint-actions"><button type="button" class="btn-mini" id="hint-more">Another hint</button></div>' : '');
    panel.hidden = false;
    bindSpeakButtons(panel);
    var moreBtn = document.getElementById('hint-more');
    if (moreBtn) moreBtn.addEventListener('click', showHint);
    // Auto-read each new clue once (replay buttons still work)
    if (clipId) {
      var sb = panel.querySelector('.btn-speak');
      if (!help.autoSpoken[clipId]) {
        help.autoSpoken[clipId] = true;
        speakClip(clipId, sb);
      }
    }
  }

  /* ---------- Goal + what's-happening panels ---------- */
  function setGoal(stepKey, opts) {
    opts = opts || {};
    var g = help.goals[stepKey];
    var el = document.getElementById('goal-panel');
    if (!el || !g) return;
    el.innerHTML =
      '<div class="gp-top"><span class="htag">Goal</span>' +
        '<button type="button" class="btn-speak" data-clip="' + g.id + '" data-label="Read goal" aria-label="Read goal">' + PLAY_SVG + '<span>Read goal</span></button></div>' +
      '<p class="gp-text" data-clip="' + g.id + '">' + g.text + '</p>';
    el.hidden = false;
    bindSpeakButtons(el);
    if (opts.auto !== false && help.ready && !help.muted && !help.autoSpoken[g.id]) {
      help.autoSpoken[g.id] = true;
      tryAutoPlay([g.id], 'goal');
    }
  }

  function setHappening(stepKey, extraHtml) {
    var h = help.happening[stepKey];
    var el = document.getElementById('happening-panel');
    if (!el) return;
    if (!h && !extraHtml) { el.hidden = true; el.innerHTML = ''; return; }
    var clip = h ? h.id : '';
    el.innerHTML =
      '<div class="gp-top"><span class="htag">What\'s happening</span>' +
        (clip ? '<button type="button" class="btn-speak" data-clip="' + clip + '" data-label="Listen" aria-label="Listen">' + PLAY_SVG + '<span>Listen</span></button>' : '') +
      '</div>' +
      (h ? '<p class="gp-text" data-clip="' + clip + '">' + h.text + '</p>' : '') +
      (extraHtml || '');
    el.hidden = false;
    bindSpeakButtons(el);
  }

  function setResultLine(host, clipId, html) {
    if (!host) return;
    host.innerHTML =
      '<div class="ox-result">' +
        '<div class="gp-top"><span class="htag">Result</span>' +
          (clipId ? '<button type="button" class="btn-speak" data-clip="' + clipId + '" data-label="Read result" aria-label="Read result">' + PLAY_SVG + '<span>Read result</span></button>' : '') +
        '</div>' + html + '</div>';
    bindSpeakButtons(host);
    if (clipId) {
      var sb = host.querySelector('.btn-speak');
      if (!help.autoSpoken[clipId]) help.autoSpoken[clipId] = true;
      speakClip(clipId, sb);
    }
  }


  function ensureAudioChrome() {
    var how = document.getElementById('how-box');
    if (!how) return;
    var top = how.querySelector('.how-top');
    if (!top) return;
    if (!document.getElementById('mute-audio')) {
      var mute = document.createElement('button');
      mute.type = 'button';
      mute.className = 'btn-mute';
      mute.id = 'mute-audio';
      mute.setAttribute('aria-pressed', 'false');
      mute.innerHTML = '<span>Stop / mute</span>';
      mute.addEventListener('click', function () {
        help.muted = !help.muted;
        mute.setAttribute('aria-pressed', help.muted ? 'true' : 'false');
        mute.querySelector('span').textContent = help.muted ? 'Unmute' : 'Stop / mute';
        stopAll();
        hideTapPrompt();
      });
      top.appendChild(mute);
    }
    if (!document.getElementById('tap-to-hear')) {
      var tap = document.createElement('button');
      tap.type = 'button';
      tap.id = 'tap-to-hear';
      tap.className = 'tap-to-hear';
      tap.hidden = true;
      tap.textContent = 'Tap to hear';
      tap.addEventListener('click', function () {
        hideTapPrompt();
        if (help.pendingAuto && help.pendingAuto.length) {
          var ids = help.pendingAuto.slice();
          help.pendingAuto = null;
          playQueue(ids, document.getElementById('read-instr'));
        }
      });
      how.appendChild(tap);
    }
  }

  function hideTapPrompt() {
    var t = document.getElementById('tap-to-hear');
    if (t) t.hidden = true;
  }

  function showTapPrompt(ids) {
    ensureAudioChrome();
    help.pendingAuto = ids.slice();
    var t = document.getElementById('tap-to-hear');
    if (t) t.hidden = false;
  }

  function tryAutoPlay(ids, reason) {
    if (help.muted) return;
    ids = (ids || []).filter(function (id) { return id && help.byId[id]; });
    if (!ids.length) return;
    ensureAudioChrome();
    stopAll();
    help.queue = ids.map(function (id) { return help.byId[id]; });
    help.playing = true;
    help.activeBtn = document.getElementById('read-instr');
    if (help.activeBtn) setBtnPlaying(help.activeBtn, true);
    // play first clip; catch autoplay block
    var clip = help.queue.shift();
    if (!clip) { stopAll(); return; }
    clearHighlight();
    var targets = document.querySelectorAll('[data-clip="' + clip.id + '"]');
    targets.forEach(function (el) {
      if (el.classList.contains('btn-speak') || el.classList.contains('btn-read')) return;
      el.classList.add('is-reading');
    });
    var line = document.querySelector('.instr-line[data-clip="' + clip.id + '"]');
    if (line) line.classList.add('is-reading');
    var a = audioEl();
    a.setAttribute('playsinline', '');
    a.src = 'audio/' + clip.file;
    var p = a.play();
    if (p && p.catch) {
      p.catch(function () {
        // restore queue including current clip for gesture replay
        help.queue = [clip].concat(help.queue);
        help.playing = false;
        if (help.activeBtn) setBtnPlaying(help.activeBtn, false);
        showTapPrompt([clip.id].concat(help.queue.map(function (c) { return c.id; })));
        help.queue = [];
      });
    }
  }

  function bootAutoRead(opts) {
    if (help.openBooted || help.muted) return;
    help.openBooted = true;
    var ids = [];
    var gKey = opts.goal;
    if (gKey && help.goals[gKey] && !help.autoSpoken[help.goals[gKey].id]) {
      help.autoSpoken[help.goals[gKey].id] = true;
      ids.push(help.goals[gKey].id);
    }
    document.querySelectorAll('.instr-line[data-clip]').forEach(function (el) {
      var id = el.getAttribute('data-clip');
      if (id && !help.autoSpoken[id]) {
        help.autoSpoken[id] = true;
        ids.push(id);
      }
    });
    if (ids.length) tryAutoPlay(ids, 'open');
  }

  function installHelp(opts) {

    opts = opts || {};
    help.hintsMap = opts.hints || {};
    help.goals = opts.goals || {};
    help.happening = opts.happening || {};
    setHintStep(opts.step || Object.keys(help.hintsMap)[0] || 'default');
    bindAudioEvents();

    var game = document.body.getAttribute('data-game');
    var btn = document.getElementById('read-instr');
    var hintBtn = document.getElementById('hint-btn');

    ensureAudioChrome();
    fetch('audio/manifest.json').then(function (r) { return r.json(); }).then(function (man) {
      (man.clips || []).forEach(function (c) { help.byId[c.id] = c; });
      help.ready = true;
      if (btn) {
        var ids = [];
        document.querySelectorAll('.instr-line[data-clip]').forEach(function (el) { ids.push(el.getAttribute('data-clip')); });
        btn.disabled = !ids.some(function (id) { return !!help.byId[id]; });
        btn._instrIds = ids;
      }
      bootAutoRead(opts);
    }).catch(function () { if (btn) btn.disabled = true; });

    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', function () {
        if (help.playing && help.activeBtn === btn) { stopAll(); return; }
        speakMany(btn._instrIds || [], btn);
      });
    }
    if (hintBtn && !hintBtn._bound) {
      hintBtn._bound = true;
      hintBtn.addEventListener('click', function () { showHint(); });
    }
    if (opts.goal) setGoal(opts.goal, { auto: false }); // bootAutoRead speaks opening goal once
    if (opts.happeningStep) setHappening(opts.happeningStep);
  }

  window.Solve = {
    GAMES: GAMES, read: read, isSolved: isSolved, markSolved: markSolved,
    shuffle: shuffle, esc: esc, feedback: feedback, clearFeedback: clearFeedback,
    finish: finish, CHECK: CHECK,
    installHelp: installHelp, setHintStep: setHintStep, stopInstr: stopAll,
    setGoal: setGoal, setHappening: setHappening, setResultLine: setResultLine,
    speakClip: speakClip, makeSpeakBtn: makeSpeakBtn, bindSpeakButtons: bindSpeakButtons,
    tryAutoPlay: tryAutoPlay, isMuted: function () { return !!help.muted; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();
})();
