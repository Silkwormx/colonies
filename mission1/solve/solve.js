/* Colonies · Mission 1 · Solve it — shared helpers + per-box read-aloud */
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
    // Feedback lines are short status text with no clip — no speaker
  }
  function clearFeedback() {
    var el = document.getElementById('feedback');
    if (el) { el.className = 'feedback'; el.innerHTML = ''; }
  }

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f4a3a" stroke="#8fc0a0" stroke-width="1.2"/><path d="M7 12.5l3.2 3.2L17.2 8.6" fill="none" stroke="#e9f3ea" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SPEAKER_SVG = "<svg class=\"ico-spk\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 9v6h4l5 4V5L8 9H4z\" fill=\"currentColor\"/><path d=\"M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>";
  var SPEAKER_TOGGLE_SVG = SPEAKER_SVG + '<svg class="ico-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* Auto-advance after a solved game: next in order, or the Solve it index after the finale. */
  var advance = { timer: null, cancelled: false, onPlayEnd: null, safety: null };

  function cancelAdvance() {
    advance.cancelled = true;
    if (advance.timer) { clearTimeout(advance.timer); advance.timer = null; }
    if (advance.safety) { clearTimeout(advance.safety); advance.safety = null; }
    advance.onPlayEnd = null;
    var countEl = document.getElementById('done-count');
    var stayBtn = document.getElementById('stay-here');
    if (countEl) { countEl.hidden = true; countEl.textContent = ''; }
    if (stayBtn) stayBtn.hidden = true;
    var panel = document.getElementById('done');
    if (panel) panel.setAttribute('data-advance', 'cancelled');
  }

  function nextAfter(id) {
    var idx = -1;
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) idx = i;
    if (idx >= 0 && idx < GAMES.length - 1) return GAMES[idx + 1];
    return null;
  }

  function revealDone(panel) {
    function go() {
      try { panel.scrollIntoView({ behavior: 'auto', block: 'start' }); }
      catch (e) { try { panel.scrollIntoView(true); } catch (e2) {} }
    }
    go();
    setTimeout(go, 80);
    setTimeout(go, 400);
    var btn = document.getElementById('next-puzzle');
    if (btn && btn.focus) {
      try { btn.focus({ preventScroll: true }); } catch (e) { try { btn.focus(); } catch (e2) {} }
    }
  }

  function countdownLabel(next, n) {
    if (next) return 'Next puzzle in ' + n + '…';
    return 'Finishing mission in ' + n + '…';
  }

  function beginCountdown(seconds, href, next) {
    if (advance.cancelled) return;
    if (advance.timer) { clearTimeout(advance.timer); advance.timer = null; }
    var countEl = document.getElementById('done-count');
    var stayBtn = document.getElementById('stay-here');
    if (countEl) countEl.hidden = false;
    if (stayBtn) stayBtn.hidden = false;
    var left = seconds;
    function tick() {
      if (advance.cancelled) return;
      if (countEl) countEl.textContent = countdownLabel(next, left);
      if (left <= 0) {
        var panel = document.getElementById('done');
        if (panel) panel.setAttribute('data-advance', 'go');
        location.href = href;
        return;
      }
      left--;
      advance.timer = setTimeout(tick, 1000);
    }
    tick();
  }

  function firePlayEnd() {
    var cb = advance.onPlayEnd;
    advance.onPlayEnd = null;
    if (advance.safety) { clearTimeout(advance.safety); advance.safety = null; }
    if (cb) cb();
  }

  function startAdvance(href, next, resultClip) {
    advance.cancelled = false;
    advance.onPlayEnd = null;
    if (advance.timer) { clearTimeout(advance.timer); advance.timer = null; }
    if (advance.safety) { clearTimeout(advance.safety); advance.safety = null; }
    var panel = document.getElementById('done');
    if (panel) panel.setAttribute('data-advance', 'pending');
    var stayBtn = document.getElementById('stay-here');
    if (stayBtn && !stayBtn._bound) {
      stayBtn._bound = true;
      stayBtn.addEventListener('click', function () {
        cancelAdvance();
        stopAll();
      });
    }
    if (help.muted) {
      beginCountdown(6, href, next);
      return;
    }
    if (resultClip && help.byId[resultClip]) {
      var btn = panel ? panel.querySelector('.done-card .box-audio, .box-audio') : null;
      advance.onPlayEnd = function () {
        if (advance.cancelled) return;
        beginCountdown(3, href, next);
      };
      playQueue([resultClip], btn);
      advance.safety = setTimeout(function () {
        if (advance.cancelled || !advance.onPlayEnd) return;
        firePlayEnd();
      }, 20000);
      return;
    }
    beginCountdown(3, href, next);
  }

  function finish(opts) {
    var id = document.body.getAttribute('data-game');
    markSolved(id);
    var next = nextAfter(id);
    var href = next ? next.file : 'index.html';
    var who = opts.who === 'Comet' ? 'Comet' : 'Kepler';
    var portrait = who === 'Comet' ? '../../art/comet_portrait.jpg' : '../../art/kepler_portrait.jpg';
    var resultClip = opts.resultClip || null;
    var panel = document.getElementById('done');
    var primary = next
      ? ('Next puzzle<span class="next-sub">' + esc(next.title) + '</span>')
      : 'Finish mission';
    panel.innerHTML =
      '<div class="done-card">' +
        '<div class="solved-badge">' + CHECK + '<span>Solved</span></div>' +
        '<div class="reaction"><img src="' + portrait + '" alt="' + who + '" width="72" height="72" />' +
          '<p><span class="who">' + who + '</span> ' + esc(opts.line) + '</p></div>' +
        (opts.fact ? '<p class="done-fact" id="done-fact">' + opts.fact + '</p>' : '') +
        '<div class="done-actions">' +
          '<a class="btn primary btn-next-puzzle" id="next-puzzle" href="' + href + '">' + primary + '</a>' +
          '<button class="btn ghost" type="button" id="again">Play again</button>' +
        '</div>' +
        '<p class="done-count" id="done-count" hidden></p>' +
        '<button class="btn ghost" type="button" id="stay-here">Stay here</button>' +
      '</div>';
    panel.hidden = false;
    panel.setAttribute('data-result-clip', resultClip || '');
    document.body.classList.add('game-finished');
    document.getElementById('again').addEventListener('click', function () {
      cancelAdvance();
      location.reload();
    });
    var nextBtn = document.getElementById('next-puzzle');
    if (nextBtn) nextBtn.addEventListener('click', function () { cancelAdvance(); });
    if (resultClip) attachBoxAudio(panel.querySelector('.done-card') || panel, function () { return [resultClip]; });
    revealDone(panel);
    var st = document.getElementById('solved-flag');
    if (st) { st.innerHTML = CHECK + '<span>Solved</span>'; st.hidden = false; }
    startAdvance(href, next, resultClip);
  }

  function initHeader() {
    var id = document.body.getAttribute('data-game');
    if (!id) return;
    var st = document.getElementById('solved-flag');
    if (st) { st.innerHTML = CHECK + '<span>Solved before</span>'; st.hidden = !isSolved(id); }
    var n = document.getElementById('game-num');
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id && n) n.textContent = (i + 1) + ' of ' + GAMES.length;
  }

  /* ---------- Single shared audio element; per-box speaker; play-once ---------- */
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
    playGen: 0,
    muted: (function () { try { return localStorage.getItem('colonies_audio_off') === '1'; } catch (e) { return false; } })(),
    autoSpoken: {},
    openBooted: false,
    pendingAuto: null,
    currentBox: null
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
    btn.setAttribute('aria-label', on ? 'Stop audio' : 'Play audio');
    btn.title = on ? 'Stop' : 'Play';
    if (btn.id === 'read-instr') syncAudioBtn(btn);
  }

  function stopAll() {
    help.playGen++;
    var a = audioEl();
    try { a.pause(); } catch (e) {}
    try { a.removeAttribute('src'); a.src = ''; } catch (e) {}
    help.playing = false;
    help.queue = [];
    clearHighlight();
    if (help.activeBtn) setBtnPlaying(help.activeBtn, false);
    help.activeBtn = null;
    document.querySelectorAll('.box-audio.is-playing').forEach(function (b) { setBtnPlaying(b, false); });
  }

  function playQueue(ids, btn) {
    // Always cancel first so a stale ended/error from the previous src cannot chain into this run
    stopAll();
    var gen = help.playGen;
    var clips = [];
    ids.forEach(function (id) { if (help.byId[id]) clips.push(help.byId[id]); });
    if (!clips.length) return;
    help.queue = clips;
    help.playing = true;
    help.activeBtn = btn || null;
    if (help.activeBtn) setBtnPlaying(help.activeBtn, true);
    playNext(gen);
  }

  function playNext(gen) {
    if (gen !== help.playGen) return;
    if (!help.playing || !help.queue.length) {
      if (gen === help.playGen) {
        stopAll();
        firePlayEnd();
      }
      return;
    }
    var clip = help.queue.shift();
    clearHighlight();
    var targets = document.querySelectorAll('[data-clip="' + clip.id + '"]');
    targets.forEach(function (el) {
      if (el.classList.contains('box-audio') || el.classList.contains('btn-speak') || el.classList.contains('btn-read')) return;
      el.classList.add('is-reading');
    });
    var line = document.querySelector('.instr-line[data-clip="' + clip.id + '"]');
    if (line) line.classList.add('is-reading');
    var a = audioEl();
    a.setAttribute('playsinline', '');
    var file = clip.file;
    a.src = 'audio/' + file;
    var p = a.play();
    if (p && p.catch) p.catch(function (err) {
      if (gen !== help.playGen) return;
      if (err && err.name === 'AbortError') return;
      // skip broken clip, continue once
      playNext(gen);
    });
  }

  function bindAudioEvents() {
    var a = audioEl();
    if (a._helpBound) return;
    a._helpBound = true;
    a.addEventListener('ended', function () {
      var gen = help.playGen;
      if (!help.playing) return;
      if (help.queue.length) playNext(gen);
      else { stopAll(); firePlayEnd(); }
    });
    a.addEventListener('error', function () {
      var gen = help.playGen;
      if (!help.playing) return;
      // Ignore teardown blanks (src cleared on stop). Only advance on a real clip error.
      var src = a.getAttribute('src') || a.src || '';
      if (!src || src === location.href || /\/$/.test(src)) return;
      if (help.queue.length) playNext(gen);
      else { stopAll(); firePlayEnd(); }
    });
  }

  function speakClip(id, btn) {
    if (btn && help.playing && help.activeBtn === btn) { stopAll(); return; }
    playQueue([id], btn);
  }

  function speakMany(ids, btn) {
    if (btn && help.playing && help.activeBtn === btn) { stopAll(); return; }
    playQueue(ids, btn);
  }

  function attachBoxAudio(host, idsFn) {
    if (!host) return null;
    host.classList.add('has-box-audio');
    var existing = host.querySelector(':scope > .box-audio');
    if (existing) existing.remove();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'box-audio';
    btn.setAttribute('aria-label', 'Play audio');
    btn.title = 'Play';
    btn.innerHTML = SPEAKER_SVG;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (help.playing && help.activeBtn === btn) { stopAll(); firePlayEnd(); return; }
      var ids = typeof idsFn === 'function' ? idsFn() : (idsFn || []);
      ids = (ids || []).filter(function (id) { return id && help.byId[id]; });
      if (!ids.length) return;
      playQueue(ids, btn);
    });
    host.appendChild(btn);
    return btn;
  }

  function makeSpeakBtn(clipId, label) {
    // Legacy helper: return a box-audio-styled icon button for a single clip
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'box-audio box-audio-inline';
    b.dataset.clip = clipId;
    b.setAttribute('aria-label', label || 'Play audio');
    b.title = 'Play';
    b.innerHTML = SPEAKER_SVG;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      speakClip(clipId, b);
    });
    return b;
  }

  function bindSpeakButtons(root) {
    // No-op for legacy .btn-speak markup; per-box attachBoxAudio is the path now
    (root || document).querySelectorAll('.btn-speak[data-clip]').forEach(function (b) {
      if (b._bound) return;
      b._bound = true;
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        speakClip(b.dataset.clip, b);
      });
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
      '</div>' +
      '<p class="hint-text" ' + (clipId ? 'data-clip="' + clipId + '"' : '') + '>' + text + '</p>' +
      (more ? '<div class="hint-actions"><button type="button" class="btn-mini" id="hint-more">Another hint</button></div>' : '');
    panel.hidden = false;
    if (clipId) attachBoxAudio(panel, function () { return [clipId]; });
    var moreBtn = document.getElementById('hint-more');
    if (moreBtn) moreBtn.addEventListener('click', showHint);
  }

  /* ---------- Goal + what's-happening panels ---------- */
  function setGoal(stepKey, opts) {
    opts = opts || {};
    var g = help.goals[stepKey];
    var el = document.getElementById('goal-panel');
    if (!el || !g) return;
    el.innerHTML =
      '<div class="gp-top"><span class="htag">Goal</span>' +
        '</div>' +
      '<p class="gp-text" data-clip="' + g.id + '">' + g.text + '</p>';
    el.hidden = false;
    attachBoxAudio(el, function () { return [g.id]; });
  }

  function setHappening(stepKey, extraHtml) {
    var h = help.happening[stepKey];
    var el = document.getElementById('happening-panel');
    if (!el) return;
    if (!h && !extraHtml) { el.hidden = true; el.innerHTML = ''; return; }
    var clip = h ? h.id : '';
    el.innerHTML =
      '<div class="gp-top"><span class="htag">What\'s happening</span>' +
      '</div>' +
      (h ? '<p class="gp-text" data-clip="' + clip + '">' + h.text + '</p>' : '') +
      (extraHtml || '');
    el.hidden = false;
    if (clip) attachBoxAudio(el, function () { return [clip]; });
  }

  function setResultLine(host, clipId, html) {
    if (!host) return;
    host.innerHTML =
      '<div class="ox-result">' +
        '<div class="gp-top"><span class="htag">Result</span>' +
        '</div><div class="ox-result-body" data-clip="' + (clipId || '') + '">' + html + '</div></div>';
    var box = host.querySelector('.ox-result') || host;
    if (clipId) attachBoxAudio(box, function () { return [clipId]; });
  }

  function howBoxIds() {
    var ids = [];
    document.querySelectorAll('#how-text .instr-line[data-clip], .how-text .instr-line[data-clip]').forEach(function (el) {
      var id = el.getAttribute('data-clip');
      if (id) ids.push(id);
    });
    return ids.filter(function (id, k) { return id && help.byId[id] && ids.indexOf(id) === k; });
  }

  function installHowAudio() {
    var how = document.getElementById('how-box') || document.querySelector('.how');
    if (!how) return;
    attachBoxAudio(how, howBoxIds);
  }

  function installHelp(opts) {
    opts = opts || {};
    help.hintsMap = opts.hints || {};
    help.goals = opts.goals || {};
    help.happening = opts.happening || {};
    setHintStep(opts.step || Object.keys(help.hintsMap)[0] || 'default');
    bindAudioEvents();

    ensureAudioChrome();
    fetch('audio/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (man) {
      (man.clips || []).forEach(function (c) { help.byId[c.id] = c; });
      help.ready = true;
      installHowAudio();
      bootAutoRead(opts);
    }).catch(function () {});

    var hintBtn = document.getElementById('hint-btn');
    if (hintBtn && !hintBtn._bound) {
      hintBtn._bound = true;
      hintBtn.addEventListener('click', function () { showHint(); });
    }
    if (opts.goal) setGoal(opts.goal, { auto: false });
    if (opts.happeningStep) setHappening(opts.happeningStep);
  }

  function setAudioOff(off) {
    help.muted = !!off;
    try { localStorage.setItem('colonies_audio_off', off ? '1' : '0'); } catch (e) {}
    syncAudioBtn(document.getElementById('read-instr'));
    if (off) {
      stopAll();
      if (advance.onPlayEnd) firePlayEnd();
    }
  }

  function syncAudioBtn(btn) {
    if (!btn) return;
    btn.classList.toggle('is-off', !!help.muted);
    btn.setAttribute('aria-pressed', help.playing && !help.muted ? 'true' : 'false');
    btn.setAttribute('aria-label', help.muted ? 'Audio off. Tap to turn on' : (help.playing ? 'Audio on, reading. Tap to stop' : 'Audio on. Read aloud'));
    btn.title = help.muted ? 'Audio off' : 'Read aloud';
  }

  function ensureAudioChrome() {
    var btn = document.getElementById('read-instr');
    if (btn && btn._coloniesBound) { syncAudioBtn(btn); return btn; }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'read-instr';
      var nav = document.querySelector('.topbar .topnav') || document.querySelector('.topbar');
      (nav || document.body).appendChild(btn);
    }
    btn.className = 'btn-audio';
    btn.innerHTML = (typeof SPEAKER_TOGGLE_SVG !== 'undefined' ? SPEAKER_TOGGLE_SVG : SPEAKER_SVG);
    if (!btn._coloniesBound) {
      btn._coloniesBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        hideTapPrompt();
        if (help.muted) {
          setAudioOff(false);
          var ids = (help.pendingAuto && help.pendingAuto.length) ? help.pendingAuto.slice() : howBoxIds();
          help.pendingAuto = null;
          if (ids.length && help.ready) playQueue(ids, btn);
          return;
        }
        if (help.playing) { stopAll(); setAudioOff(true); return; }
        setAudioOff(true);
      });
    }
    syncAudioBtn(btn);
    return btn;
  }

  function hideTapPrompt() {
    var b = document.getElementById('read-instr');
    if (b) b.classList.remove('needs-tap');
  }

  function showTapPrompt(ids) {
    var b = ensureAudioChrome();
    help.pendingAuto = (ids || []).slice();
    b.classList.add('needs-tap');
    var kick = function (e) {
      if (e.target && e.target.closest && e.target.closest('#read-instr')) return;
      document.removeEventListener('pointerdown', kick, true);
      document.removeEventListener('keydown', kick, true);
      if (help.muted) return;
      hideTapPrompt();
      var ids3 = (help.pendingAuto && help.pendingAuto.length) ? help.pendingAuto.slice() : howBoxIds();
      help.pendingAuto = null;
      if (ids3.length) playQueue(ids3, b);
    };
    document.addEventListener('pointerdown', kick, true);
    document.addEventListener('keydown', kick, true);
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
    syncAudioBtn(help.activeBtn);
    var clip = help.queue.shift();
    if (!clip) { stopAll(); return; }
    clearHighlight();
    document.querySelectorAll('[data-clip="' + clip.id + '"]').forEach(function (el) {
      if (el.classList.contains('box-audio') || el.classList.contains('btn-speak')) return;
      el.classList.add('is-reading');
    });
    var a = audioEl();
    a.src = 'audio/' + clip.file;
    var p = a.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err && err.name === 'AbortError') return;
        help.queue = [clip].concat(help.queue);
        help.playing = false;
        if (help.activeBtn) setBtnPlaying(help.activeBtn, false);
        showTapPrompt(help.queue.map(function (c) { return c.id; }));
        help.queue = [];
      });
    }
  }

  function bootAutoRead(opts) {
    if (help.openBooted || help.muted) return;
    help.openBooted = true;
    var ids = [];
    document.querySelectorAll('.instr-line[data-clip]').forEach(function (el) {
      var id = el.getAttribute('data-clip');
      if (id && !help.autoSpoken[id]) { help.autoSpoken[id] = true; ids.push(id); }
    });
    if (ids.length) tryAutoPlay(ids, 'open');
  }

  window.Solve = {
    GAMES: GAMES, read: read, isSolved: isSolved, markSolved: markSolved,
    shuffle: shuffle, esc: esc, feedback: feedback, clearFeedback: clearFeedback,
    finish: finish, cancelAdvance: cancelAdvance, CHECK: CHECK,
    installHelp: installHelp, setHintStep: setHintStep, stopInstr: stopAll,
    setGoal: setGoal, setHappening: setHappening, setResultLine: setResultLine,
    speakClip: speakClip, makeSpeakBtn: makeSpeakBtn, bindSpeakButtons: bindSpeakButtons,
    attachBoxAudio: attachBoxAudio,
    tryAutoPlay: tryAutoPlay, isMuted: function () { return !!help.muted; },
    setAudioOff: setAudioOff
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();
})();
