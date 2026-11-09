/* Colonies · Mission 1 · Solve it — shared helpers */
(function () {
  var KEY = 'colonies_solved_m1';
  var GAMES = [
    { id: 'oxygen', file: 'oxygen.html', title: 'Make Enough Oxygen', art: '../scene06.jpg', blurb: 'Split water. Keep the half you can breathe.' },
    { id: 'fan',    file: 'fan.html',    title: 'Build the Fan',      art: '../scene05.jpg', blurb: 'Assemble it from scrap, then find it a real job.' },
    { id: 'power',  file: 'power.html',  title: 'Power Budget',       art: '../scene03.jpg', blurb: 'One small solar panel. Many opinions about what it runs.' },
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
    var panel = document.getElementById('done');
    panel.innerHTML =
      '<div class="done-card">' +
        '<div class="solved-badge">' + CHECK + '<span>Solved</span></div>' +
        '<div class="reaction"><img src="' + portrait + '" alt="' + who + '" width="72" height="72" />' +
          '<p><span class="who">' + who + '</span> ' + esc(opts.line) + '</p></div>' +
        (opts.fact ? '<p class="done-fact">' + opts.fact + '</p>' : '') +
        '<div class="done-actions">' +
          (next ? '<a class="btn primary" href="' + next.file + '">Next: ' + esc(next.title) + '</a>'
                : '<a class="btn primary" href="index.html">All five solved</a>') +
          '<button class="btn ghost" type="button" id="again">Play again</button>' +
        '</div>' +
      '</div>';
    panel.hidden = false;
    document.getElementById('again').addEventListener('click', function () { location.reload(); });
    setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
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

  window.Solve = {
    GAMES: GAMES, read: read, isSolved: isSolved, markSolved: markSolved,
    shuffle: shuffle, esc: esc, feedback: feedback, clearFeedback: clearFeedback,
    finish: finish, CHECK: CHECK
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();
})();
