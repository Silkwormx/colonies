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
  var SPEAKER_SVG = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 9v6h4l5 4V5L8 9H4z\" fill=\"currentColor\"/><path d=\"M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>";

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
        '<div class="done-actions">' +
          (next ? '<a class="btn primary" href="' + next.file + '">Next: ' + esc(next.title) + '</a>'
                : '<a class="btn primary" href="index.html">All five solved</a>') +
          '<button class="btn ghost" type="button" id="again">Play again</button>' +
        '</div>' +
      '</div>';
    panel.hidden = false;
    panel.setAttribute('data-result-clip', resultClip || '');
    document.getElementById('again').addEventListener('click', function () { location.reload(); });
    if (resultClip) attachBoxAudio(panel.querySelector('.done-card') || panel, function () { return [resultClip]; });
    setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    var st = document.getElementById('solved-flag');
    if (st) { st.innerHTML = CHECK + '<span>Solved</span>'; st.hidden = false; }
  }

  function initHeader() {
    // Remove any leftover global audio toggle from older cached pages
    var old = document.getElementById('read-instr');
    if (old) old.remove();
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
    playGen: 0
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
      if (gen === help.playGen) stopAll();
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
      else stopAll();
    });
    a.addEventListener('error', function () {
      var gen = help.playGen;
      if (!help.playing) return;
      // Ignore teardown blanks (src cleared on stop). Only advance on a real clip error.
      var src = a.getAttribute('src') || a.src || '';
      if (!src || src === location.href || /\/$/.test(src)) return;
      if (help.queue.length) playNext(gen);
      else stopAll();
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
      if (help.playing && help.activeBtn === btn) { stopAll(); return; }
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

    // Strip any old global toggle
    var old = document.getElementById('read-instr');
    if (old) old.remove();

    fetch('audio/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (man) {
      (man.clips || []).forEach(function (c) { help.byId[c.id] = c; });
      help.ready = true;
      installHowAudio();
    }).catch(function () {});

    var hintBtn = document.getElementById('hint-btn');
    if (hintBtn && !hintBtn._bound) {
      hintBtn._bound = true;
      hintBtn.addEventListener('click', function () { showHint(); });
    }
    if (opts.goal) setGoal(opts.goal, { auto: false });
    if (opts.happeningStep) setHappening(opts.happeningStep);
    // No auto-play. Audio only when a box speaker is tapped.
  }

  window.Solve = {
    GAMES: GAMES, read: read, isSolved: isSolved, markSolved: markSolved,
    shuffle: shuffle, esc: esc, feedback: feedback, clearFeedback: clearFeedback,
    finish: finish, CHECK: CHECK,
    installHelp: installHelp, setHintStep: setHintStep, stopInstr: stopAll,
    setGoal: setGoal, setHappening: setHappening, setResultLine: setResultLine,
    speakClip: speakClip, makeSpeakBtn: makeSpeakBtn, bindSpeakButtons: bindSpeakButtons,
    attachBoxAudio: attachBoxAudio,
    tryAutoPlay: function () { /* no auto-play */ },
    isMuted: function () { return false; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();
})();
