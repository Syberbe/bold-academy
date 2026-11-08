/* BOLD Academy: app-logica (schema, logboek, weekplanning, training, geschiedenis, editor, back-up) */
(function () {
  'use strict';
  const { LIBRARY: LIB, LABELS, DEFAULT_PROGRAM } = window.BoldData;
  const APP_VERSION = '0.2.2';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const rid = () => Math.random().toString(36).slice(2, 7);

  /* ---------------- dates ---------------- */
  const pad2 = n => String(n).padStart(2, '0');
  const dstr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const todayStr = () => dstr(new Date());
  const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
  const wdOf = s => parseD(s).getDay();
  const WD_S = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const WD_L = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const fmtD = s => WD_S[wdOf(s)] + ' ' + parseD(s).getDate() + ' ' + MON[parseD(s).getMonth()];
  const fmtShort = s => parseD(s).getDate() + ' ' + MON[parseD(s).getMonth()];
  const weekStartOf = s => addDays(s, -((wdOf(s) + 6) % 7));
  const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);

  /* ---------------- storage ---------------- */
  const KEY = 'bold.v1';
  function defaultState() { return { version: 1, program: clone(DEFAULT_PROGRAM), sessions: {}, settings: { wake: true, sound: true }, active: null }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.program && s.sessions) { const d = defaultState(); return Object.assign(d, s, { settings: Object.assign(d.settings, s.settings || {}) }); } }
    } catch (e) { /* storage not available */ }
    return defaultState();
  }
  let S = load();
  let saveT = null, storageWarned = false;
  function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 120); }
  function saveNow() {
    clearTimeout(saveT); saveT = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { if (!storageWarned) { storageWarned = true; toast('Opslaan lukt niet in deze weergave. In de geïnstalleerde app wordt alles bewaard.'); } }
  }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}

  /* ---------------- program helpers ---------------- */
  const days = () => S.program.days;
  const dayById = id => days().find(d => d.id === id);
  function groupName(b) { return (b.items.length > 1 ? 'Superset ' : 'Blok ') + b.label; }
  function flatItems(day) {
    const out = [];
    day.warmup.forEach((it, i) => out.push({ it, kind: 'warmup', code: 'W' + (i + 1), block: null, group: 'Warm-up' }));
    day.blocks.forEach(b => b.items.forEach((it, i) => out.push({ it, kind: 'main', code: (i + 1) + b.label, block: b, group: groupName(b) })));
    return out;
  }
  function findItem(day, id) { return flatItems(day).find(f => f.it.id === id); }
  const repsText = it => it.repsMin === it.repsMax ? String(it.repsMin) : it.repsMin + '–' + it.repsMax;
  const restText = s => s % 60 === 0 ? (s / 60) + ' min' : Math.floor(s / 60) + ':' + pad2(s % 60) + ' min';
  function weekNo(date) { return Math.floor(diffDays(S.program.startDate, date) / 7) + 1; }

  /* ---------------- sessions ---------------- */
  const skey = (date, day) => date + '|' + day;
  const getSess = (date, day) => S.sessions[skey(date, day)];
  function ensureSess(date, day) { const k = skey(date, day); if (!S.sessions[k]) S.sessions[k] = { date, day, items: {} }; return S.sessions[k]; }
  const entryHasDone = e => !!(e && e.done && e.done.some(Boolean));
  const sessHasDone = s => !!(s && Object.values(s.items).some(entryHasDone));

  /* Elke gelogde oefening onthoudt welke oefening (ex) en rep range (rng) het was,
     zodat de geschiedenis per oefening over alle trainingsdagen heen loopt. */
  function itemMeta(s, id, e) {
    if (e && e.ex) return { ex: e.ex, rng: e.rng || null };
    const d = dayById(s.day), f = d && findItem(d, id);
    if (f) return { ex: f.it.ex, rng: f.it.repsMin != null ? [f.it.repsMin, f.it.repsMax] : null };
    const guess = String(id).split('.')[1];
    return { ex: LIB[guess] ? guess : null, rng: null };
  }
  function tagEntries(sessions) {
    let n = 0;
    for (const s of Object.values(sessions || {})) for (const [id, e] of Object.entries(s.items || {})) {
      if (!e || e.ex) continue;
      const m = itemMeta(s, id, null);
      if (m.ex) { e.ex = m.ex; if (m.rng) e.rng = m.rng; n++; }
    }
    return n;
  }
  function exHistory(ex) {
    const out = [];
    for (const s of Object.values(S.sessions)) for (const [id, e] of Object.entries(s.items)) {
      if (!entryHasDone(e)) continue;
      const m = itemMeta(s, id, e);
      if (m.ex === ex) out.push({ date: s.date, day: s.day, id, e, rng: m.rng });
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const sameRange = (rng, it) => !rng || (rng[0] === it.repsMin && rng[1] === it.repsMax);
  function lastEntry(it, beforeDate, anyRange) {
    const h = exHistory(it.ex).filter(x => x.date < beforeDate && (anyRange || sameRange(x.rng, it)));
    return h.length ? h[h.length - 1] : null;
  }
  function progression(it, date) {
    if (it.repsMin == null) return null;
    const last = lastEntry(it, date);
    if (!last) { const other = lastEntry(it, date, true); return other ? { kind: 'other', last: other } : { kind: 'first' }; }
    const vals = []; let allDone = true, allTop = true;
    for (let i = 0; i < it.sets; i++) {
      const d = last.e.done[i], v = last.e.sets[i];
      if (!d || v == null) { allDone = false; allTop = false; vals.push(null); continue; }
      vals.push(v); if (v < it.repsMax) allTop = false;
    }
    if (allDone && allTop) return { kind: 'harder', last, vals };
    return { kind: 'plus', last, vals, target: vals.map(v => v == null ? it.repsMin : Math.min(v + 1, it.repsMax)) };
  }
  function entryFor(date, dayId, it) {
    const s = getSess(date, dayId), e = s && s.items[it.id];
    if (e) {
      while (e.sets.length < it.sets) { e.sets.push(e.sets[e.sets.length - 1] ?? it.repsMin ?? null); e.done.push(false); }
      return e;
    }
    const sets = [], done = [];
    const last = it.repsMin != null ? (lastEntry(it, date) || lastEntry(it, date, true)) : null;
    const fit = v => (last && !sameRange(last.rng, it) ? clamp(v, it.repsMin, it.repsMax) : v);
    for (let i = 0; i < it.sets; i++) {
      let v = null;
      if (it.repsMin != null) {
        if (last && last.e.done[i] && last.e.sets[i] != null) v = fit(last.e.sets[i]);
        else if (i > 0 && sets[i - 1] != null) v = sets[i - 1];
        else v = it.repsMin;
      }
      sets.push(v); done.push(false);
    }
    return { sets, done, draft: true };
  }
  function commitEntry(date, dayId, it, e) {
    const s = ensureSess(date, dayId);
    s.items[it.id] = { sets: e.sets.slice(), done: e.done.slice(), ex: it.ex };
    if (it.repsMin != null) s.items[it.id].rng = [it.repsMin, it.repsMax];
    if (!sessHasDone(s) && !Object.values(s.items).some(x => x.done.some(Boolean))) { /* keep */ }
    save();
    return s.items[it.id];
  }
  const doneCount = e => e.done.filter(Boolean).length;

  /* eenmalig: bestaande logs krijgen hun oefening erbij (er wordt niets verwijderd, en er blijft een kopie van daarvoor) */
  (function upgradeLogs() {
    const todo = Object.values(S.sessions).some(s => Object.values(s.items || {}).some(e => e && !e.ex));
    if (!todo) return;
    try { const raw = localStorage.getItem(KEY); if (raw && !localStorage.getItem(KEY + '.voor-0.2.1')) localStorage.setItem(KEY + '.voor-0.2.1', raw); } catch (e) {}
    if (tagEntries(S.sessions)) saveNow();
  })();

  /* ---------------- adaptive week planning ---------------- */
  function plan(today) {
    const P = S.program, start = P.startDate, end = addDays(start, P.weeks * 7 - 1);
    const ws = weekStartOf(today);
    let from = addDays(ws, -7), to = addDays(ws, 13);
    if (from < start) from = start;
    if (to > end) to = end;
    const occ = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days().forEach(day => { if (day.weekday === wdOf(d)) occ.push({ day: day.id, planned: d }); });
    occ.sort((a, b) => a.planned < b.planned ? -1 : a.planned > b.planned ? 1 : 0);
    const plannedDates = new Set(occ.map(o => o.planned));
    const sess = Object.values(S.sessions).filter(s => sessHasDone(s) && s.date <= today && s.date >= addDays(from, -6)).sort((a, b) => a.date < b.date ? -1 : 1);
    const used = new Set(), movedTo = new Set();
    for (const o of occ) {
      const lo = weekStartOf(o.planned), hi = addDays(o.planned, 7);
      const m = sess.find(s => !used.has(s) && s.day === o.day && s.date >= lo && s.date < hi && s.date <= today);
      if (m) { used.add(m); o.status = 'done'; o.eff = m.date; continue; }
      if (o.planned > today) { o.status = 'upcoming'; o.eff = o.planned; continue; }
      if (o.planned === today) { o.status = 'todo'; o.eff = today; continue; }
      if (hi <= today) { o.status = 'missed'; o.eff = o.planned; continue; }
      let target = null;
      for (let d = today; d < hi; d = addDays(d, 1)) { if (!plannedDates.has(d) && !movedTo.has(d)) { target = d; break; } }
      if (target) { movedTo.add(target); o.status = 'moved'; o.eff = target; }
      else { o.status = 'missed'; o.eff = o.planned; }
    }
    const extra = sess.filter(s => !used.has(s) && s.date >= from).map(s => ({ day: s.day, planned: s.date, eff: s.date, status: 'done', extra: true }));
    return { occ: occ.concat(extra), from, to, start, end };
  }

  /* ---------------- UI shell ---------------- */
  const ICON = {
    today: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9 14.5l2 2 4-4"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 16l4-5 3 3 5-7"/></svg>',
    plan: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="18" r="1.2"/></svg>',
    tick: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M9.5 2.5h5"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1" width="3" height="10" rx="1"/><rect x="7.5" y="1" width="3" height="10" rx="1"/></svg>',
    play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.2v9.6c0 .5.5.8.9.5l7.4-4.8c.4-.3.4-.8 0-1L3.4.7c-.4-.3-.9 0-.9.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>'
  };
  const TABS = [['today', 'Vandaag', ICON.today], ['train', 'Training', ICON.train], ['hist', 'Geschiedenis', ICON.hist], ['plan', 'Schema', ICON.plan]];
  let route = S.active ? 'train' : 'today';
  const main = $('#main'), nav = $('#nav');
  nav.innerHTML = '<div class="nav-in">' + TABS.map(([k, l, ic]) => '<button type="button" data-tab="' + k + '">' + ic + '<span>' + l + '</span></button>').join('') + '</div>';
  nav.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
  function go(r) {
    if (route === 'plan' && r !== 'plan') saveNow();
    route = r; render(); window.scrollTo(0, 0);
  }
  function render() {
    $$('[data-tab]', nav).forEach(b => {
      if (b.dataset.tab === route) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      const live = b.querySelector('.dotlive'); if (live) live.remove();
      if (b.dataset.tab === 'train' && S.active && route !== 'train') b.insertAdjacentHTML('beforeend', '<i class="dotlive" aria-hidden="true"></i>');
    });
    $('#weekpill').textContent = weekPillText();
    viewer.detach();
    if (route === 'today') renderToday();
    else if (route === 'train') renderTrain();
    else if (route === 'hist') renderHist();
    else renderPlan();
    syncWake();
  }
  function weekPillText() {
    const t = todayStr(), P = S.program;
    if (t < P.startDate) return 'Start ' + fmtShort(P.startDate);
    const w = weekNo(t);
    return w > P.weeks ? 'Programma klaar' : 'Week ' + w + '/' + P.weeks;
  }

  let toastT = null;
  function toast(msg, action) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
    t.hidden = false;
    if (action) t.querySelector('button').onclick = () => { t.hidden = true; action.fn(); };
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, action ? 9000 : 3800);
  }

  /* ---------------- VANDAAG ---------------- */
  function renderToday() {
    const t = todayStr(), P = S.program, pl = plan(t), ws = weekStartOf(t);
    const todays = pl.occ.filter(o => o.eff === t && (o.status === 'todo' || o.status === 'moved'));
    const doneToday = pl.occ.filter(o => o.eff === t && o.status === 'done');
    const upcoming = pl.occ.filter(o => o.eff > t && (o.status === 'upcoming' || o.status === 'moved')).sort((a, b) => a.eff < b.eff ? -1 : 1);
    let hero = '';
    if (t < P.startDate) {
      hero = heroHtml('Nog niet gestart', 'Je programma begint op ' + fmtD(P.startDate) + '.', '', '');
    } else if (t > pl.end) {
      hero = heroHtml('Programma klaar', 'Je ' + P.weeks + ' weken zitten erop. Bekijk je vooruitgang bij Geschiedenis.', '', '<button type="button" class="btn primary" data-go="hist">Bekijk je vooruitgang</button>');
    } else if (S.active) {
      const d = dayById(S.active.day);
      hero = heroHtml(d ? d.name : 'Training', 'Je training van ' + fmtD(S.active.date) + ' staat nog open.', 'Bezig', '<button type="button" class="btn primary" data-go="train">Verder trainen</button>');
    } else if (todays.length) {
      const o = todays[0], d = dayById(o.day);
      const sub = o.status === 'moved' ? 'Verschoven van ' + fmtD(o.planned) : 'Dag ' + o.day;
      hero = heroHtml(d.name, flatItems(d).filter(f => f.kind === 'main').length + ' oefeningen · warm-up ' + d.warmup.length + ' oefeningen', sub,
        '<button type="button" class="btn primary" data-start="' + o.day + '">Start training</button>');
    } else if (doneToday.length) {
      const d = dayById(doneToday[0].day);
      const nx = upcoming[0];
      hero = heroHtml('Goed gedaan', (d ? d.name : 'Training') + ' staat in je logboek.' + (nx ? ' Volgende: ' + dayById(nx.day).name + ' op ' + fmtD(nx.eff) + '.' : ''), 'Klaar ✓', '');
    } else {
      const nx = upcoming[0];
      hero = heroHtml('Rustdag', nx ? 'Volgende training: ' + dayById(nx.day).name + ', ' + WD_L[wdOf(nx.eff)] + ' ' + fmtShort(nx.eff) + '.' : 'Geen training gepland deze week.', fmtD(t), '');
    }
    const acts = S.program.activities || [];
    const strip = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const chips = [];
      pl.occ.forEach(o => {
        if (o.eff === d) {
          const cls = o.status === 'done' ? 'done' : (o.status === 'moved' ? 'moved-in' : (o.status === 'missed' ? 'missed' : (d === t ? 'todo' : 'upcoming')));
          const lab = o.status === 'done' ? 'Gedaan' : o.status === 'moved' ? 'Verschoven van ' + fmtD(o.planned) : o.status === 'missed' ? 'Gemist' : 'Gepland';
          chips.push('<span class="chip ' + cls + '" title="' + esc(lab) + '">' + (o.status === 'moved' ? '↻' : '') + esc(o.day) + '</span>');
        } else if (o.planned === d && o.status === 'moved') {
          chips.push('<span class="chip missed" title="Verschoven naar ' + esc(fmtD(o.eff)) + '">' + esc(o.day) + '</span>');
        }
      });
      const act = acts.filter(a => a.weekday === wdOf(d) && a.name.trim()).map(a => esc(a.name.trim())).join(', ');
      strip.push('<div class="wd' + (d === t ? ' today' : '') + '"><span class="dn">' + WD_S[wdOf(d)] + '</span><span class="dd">' + parseD(d).getDate() + '</span>' + chips.join('') + (act ? '<span class="act">' + act + '</span>' : '') + '</div>');
    }
    const movedNotes = pl.occ.filter(o => o.status === 'moved' && o.eff >= t).map(o => '<b>' + esc(dayById(o.day).name) + '</b> van ' + fmtD(o.planned) + ' → ' + fmtD(o.eff));

    /* progression overview */
    const sugg = [], seen = {};
    days().forEach(d => d.blocks.forEach(b => b.items.forEach(it => {
      const k = it.ex + '|' + it.repsMin + '-' + it.repsMax;
      if (seen[k]) { seen[k].days.push(d.id); return; }
      const pr = progression(it, addDays(t, 1));
      if (pr && pr.kind === 'harder') { seen[k] = { d, it, pr, days: [d.id] }; sugg.push(seen[k]); }
    })));
    main.innerHTML = '<section class="screen">' + hero +
      '<div><p class="h-eyebrow">Week ' + clamp(weekNo(t), 1, S.program.weeks) + ' · ' + fmtShort(ws) + ' – ' + fmtShort(addDays(ws, 6)) + '</p><h2 class="sec-title">Deze week</h2></div>' +
      '<div class="week" role="list">' + strip.join('') + '</div>' +
      '<div class="legend"><span><i class="d"></i>Gedaan</span><span><i class="t"></i>Vandaag of verschoven</span><span><i></i>Gepland</span><span><i class="m"></i>Gemist</span></div>' +
      (movedNotes.length ? '<p class="note-line">Verschoven: ' + movedNotes.join(' · ') + '</p>' : '') +
      '<div><h2 class="sec-title">Klaar om zwaarder te maken</h2></div>' +
      (sugg.length ? '<div class="card"><p class="note-line">Je haalde overal het maximum. Kies een zwaardere variant: trager tempo, ringen verder uit elkaar of lager, of gewicht erbij.</p><ul class="sugg">' + sugg.map(s => '<li><span class="tagx">Dag ' + s.days.map(esc).join(' · ') + '</span><div><b>' + esc(LIB[s.it.ex].name) + '</b></div><small>Vorige keer ' + s.pr.vals.join(' · ') + ' · doel ' + repsText(s.it) + ' reps</small></li>').join('') + '</ul></div>'
        : '<p class="empty">Nog niets. Haal je bij een oefening in alle sets het hoogste aantal reps, dan verschijnt ze hier.</p>') +
      '<div class="btn-row"><button type="button" class="btn" data-go="train">Andere training starten</button></div>' +
      '</section>';
  }
  function heroHtml(title, text, eyebrow, actions) {
    return '<div class="hero"><p class="h-eyebrow">' + esc(eyebrow || fmtD(todayStr())) + '</p><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p>' + (actions ? '<div class="btn-row">' + actions + '</div>' : '') + '</div>';
  }
  main.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { if (g.dataset.go === 'train' && !S.active) { route = 'train'; render(); return; } go(g.dataset.go); return; }
    const st = e.target.closest('[data-start]'); if (st) { startSession(st.dataset.start, st.dataset.date || todayStr()); }
  });

  /* ---------------- TRAINING ---------------- */
  function startSession(dayId, date) {
    const d = dayById(dayId); if (!d) return;
    const flat = flatItems(d);
    const first = flat.find(f => { const e = entryFor(date, dayId, f.it); return doneCount(e) < f.it.sets; }) || flat[0];
    S.active = { day: dayId, date, focus: first ? first.it.id : null };
    save(); route = 'train'; render(); window.scrollTo(0, 0);
  }
  function renderTrain() {
    if (!S.active || !dayById(S.active.day)) { S.active = null; renderPicker(); return; }
    const A = S.active, d = dayById(A.day), flat = flatItems(d), past = A.date < todayStr();
    if (A.focus && !flat.some(f => f.it.id === A.focus)) A.focus = null;
    let totalSets = 0, doneSets = 0;
    flat.forEach(f => { const e = entryFor(A.date, A.day, f.it); totalSets += f.it.sets; doneSets += Math.min(doneCount(e), f.it.sets); });
    const groups = [];
    flat.forEach(f => { let g = groups.find(x => x.name === f.group); if (!g) groups.push(g = { name: f.group, sub: f.kind === 'warmup' ? 'geen rust' : restText(f.it.rest) + ' rust', items: [] }); g.items.push(f); });
    main.innerHTML = '<section class="screen">' +
      '<div class="sess-head"><div style="flex:1;min-width:0"><p class="h-eyebrow">Dag ' + esc(d.id) + ' · week ' + clamp(weekNo(A.date), 1, S.program.weeks) + '</p><h1 class="h-title">' + esc(d.name) + '</h1></div></div>' +
      '<div class="sess-meta"><input type="date" id="sess-date" max="' + todayStr() + '" value="' + A.date + '" aria-label="Datum van de training"><span id="setcount">' + doneSets + ' van ' + totalSets + ' sets</span>' + (past ? '' : '<span class="wake" id="wake-ind">Scherm blijft aan</span>') + '</div>' +
      (past ? '<p class="pastnote">Je vult een training van <b>' + esc(fmtD(A.date)) + '</b> in. De rusttimer start hier niet vanzelf.</p>' : '') +
      '<div class="progress"><i style="width:' + (totalSets ? Math.round(doneSets / totalSets * 100) : 0) + '%"></i></div>' +
      '<div class="queue">' + groups.map(g => {
        const allDone = g.items.every(f => doneCount(entryFor(A.date, A.day, f.it)) >= f.it.sets);
        return '<div class="qgroup' + (allDone ? ' gdone' : '') + '"><h4>' + esc(g.name) + '<span>' + (allDone ? 'Gedaan' : esc(g.sub)) + '</span></h4>' + g.items.map(f => {
          if (f.it.id === A.focus) return '<article class="card xopen" id="focus" data-x="' + esc(f.it.id) + '"></article>';
          const e = entryFor(A.date, A.day, f.it), fin = doneCount(e) >= f.it.sets;
          return '<button type="button" class="qitem' + (fin ? ' done' : '') + '" data-focus="' + esc(f.it.id) + '" data-x="' + esc(f.it.id) + '" aria-expanded="false"><span class="code' + (f.kind === 'warmup' ? ' wu' : '') + '">' + esc(f.code) + '</span><span class="nm">' + esc(LIB[f.it.ex].name) + '</span>' +
            (fin ? '<span class="qok" aria-label="Gedaan">' + ICON.tick + '</span>' : '<span class="dots">' + e.done.slice(0, f.it.sets).map(x => '<i' + (x ? ' class="f"' : '') + '></i>').join('') + '</span>') + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="btn-row"><button type="button" class="btn dark block" id="finish">' + (past ? 'Opslaan en sluiten' : 'Training afronden') + '</button></div>' +
      (getSess(A.date, A.day) ? (delSess ? '<div class="confirm"><p>Deze training van ' + esc(fmtD(A.date)) + ' en alle gelogde sets verwijderen?</p><div class="btn-row"><button type="button" class="btn danger" id="del-yes">Ja, verwijderen</button><button type="button" class="btn" id="del-no">Annuleren</button></div></div>'
        : '<div class="btn-row"><button type="button" class="btn small danger" id="del-sess">Training verwijderen</button></div>') : '') +
      '</section>';
    if (A.focus) renderFocus(); else viewer.detach();
    $('#sess-date').addEventListener('change', ev => {
      const nv = ev.target.value;
      if (!nv || nv > todayStr()) { ev.target.value = A.date; return; }
      if (nv === A.date) return;
      const old = getSess(A.date, A.day), tgt = getSess(nv, A.day);
      if (old && !tgt) { delete S.sessions[skey(A.date, A.day)]; old.date = nv; S.sessions[skey(nv, A.day)] = old; toast('Training verplaatst naar ' + fmtD(nv) + '.'); }
      else if (tgt) toast('Op ' + fmtD(nv) + ' staat al een ' + d.name + '. Die zie je nu.');
      A.date = nv; delSess = false; stopRest(); save(); renderTrain(); syncWake();
    });
    const finish = () => {
      const s = getSess(A.date, A.day), back = A.from === 'hist' ? 'hist' : 'today';
      S.active = null; pickDate = null; delSess = false; saveNow(); stopRest();
      return { s, back };
    };
    $('#finish').addEventListener('click', () => {
      const r = finish();
      toast(sessHasDone(r.s) ? 'Training opgeslagen in je logboek.' : 'Training gesloten. Er was nog niets gelogd.');
      go(r.back);
    });
    const ds = $('#del-sess'); if (ds) ds.addEventListener('click', () => { delSess = true; renderTrain(); $('#del-yes').scrollIntoView({ block: 'center' }); });
    const dn = $('#del-no'); if (dn) dn.addEventListener('click', () => { delSess = false; renderTrain(); });
    const dy = $('#del-yes'); if (dy) dy.addEventListener('click', () => {
      delete S.sessions[skey(A.date, A.day)];
      const r = finish(); toast('Training verwijderd.'); go(r.back);
    });
    main.querySelector('.queue').addEventListener('click', ev => {
      const b = ev.target.closest('[data-focus]'); if (b) { setOpen(b.dataset.focus, b.dataset.focus); return; }
      const h = ev.target.closest('[data-close]'); if (h) setOpen(null, A.focus);
    });
  }
  let pickDate = null, delSess = false;
  function renderPicker() {
    const t = todayStr(), pl = plan(t);
    if (!pickDate || pickDate > t) pickDate = t;
    const past = pickDate < t;
    const sug = past ? [] : pl.occ.filter(o => o.eff === t && (o.status === 'todo' || o.status === 'moved')).map(o => o.day);
    main.innerHTML = '<section class="screen"><div><p class="h-eyebrow">' + esc(fmtD(pickDate)) + '</p><h1 class="h-title">Kies je <em>training</em></h1></div>' +
      '<div class="pickdate"><label for="pick-date">Datum</label><input type="date" id="pick-date" max="' + t + '" value="' + pickDate + '">' +
      (past ? '<button type="button" class="btn small" id="pick-today">Vandaag</button>' : '') + '</div>' +
      '<p class="note-line">' + (past ? 'Je vult een training van ' + esc(fmtD(pickDate)) + ' in. Kies welke.' : 'Een training van een vorige dag invullen? Kies eerst de datum.') + '</p>' +
      '<div class="picker">' + days().map(d => {
        const n = flatItems(d).filter(f => f.kind === 'main').length, has = sessHasDone(getSess(pickDate, d.id));
        return '<button type="button" class="pick" data-start="' + esc(d.id) + '" data-date="' + pickDate + '"><span class="big">' + esc(d.id) + '</span><span><b>' + esc(d.name) + '</b><small>' + n + ' oefeningen · normaal op ' + WD_L[d.weekday] + '</small></span>' + (has ? '<span class="pill done">Ingevuld</span>' : sug.includes(d.id) ? '<span class="pill done">Vandaag</span>' : '') + '</button>';
      }).join('') + '</div></section>';
    $('#pick-date').addEventListener('change', ev => { const v = ev.target.value; pickDate = v && v <= t ? v : t; renderPicker(); });
    const pt = $('#pick-today'); if (pt) pt.addEventListener('click', () => { pickDate = t; renderPicker(); });
  }

  /* --- one exercise open at a time; the tapped row keeps its place on screen --- */
  let collapseT = null;
  function setOpen(id, anchorId, toNext) {
    const A = S.active; if (!A) return;
    clearTimeout(collapseT);
    const sel = '[data-x="' + anchorId + '"]';
    const before = anchorId ? main.querySelector(sel) : null, top0 = before ? before.getBoundingClientRect().top : null;
    A.focus = id; save(); renderTrain();
    const after = anchorId ? main.querySelector(sel) : null;
    if (after && top0 != null) {
      const delta = after.getBoundingClientRect().top - top0;
      roomFor(delta); window.scrollBy(0, delta);
    }
    const tb0 = document.querySelector('.topbar'), minTop0 = (tb0 ? tb0.getBoundingClientRect().bottom : 0) + 10;
    if (!id && toNext) {
      // after finishing an exercise: glide to the first exercise that is not done yet (or to the top)
      const nx = main.querySelector('.qitem:not(.done)');
      if (nx) {
        const g = nx.closest('.qgroup'), ref = g && g.querySelector('.qitem, .card') === nx ? g : nx;
        const dy = ref.getBoundingClientRect().top - minTop0;
        roomFor(dy); window.scrollBy({ top: dy, behavior: REDUCE ? 'auto' : 'smooth' });
      } else window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
    }
    if (id) {
      const card = $('#focus'), tb = document.querySelector('.topbar');
      if (card) {
        const top = card.getBoundingClientRect().top, minTop = (tb ? tb.getBoundingClientRect().bottom : 0) + 10;
        if (Math.abs(top - minTop) > 24) window.scrollBy({ top: top - minTop, behavior: REDUCE ? 'auto' : 'smooth' });
      }
    }
  }
  // make sure the page is long enough to scroll by dy (adds empty space at the bottom if needed)
  function roomFor(dy) {
    const de = document.documentElement, short = window.scrollY + dy - (de.scrollHeight - window.innerHeight);
    if (short <= 0) return;
    let sp = main.querySelector('.spacer');
    if (!sp) { sp = document.createElement('div'); sp.className = 'spacer'; sp.setAttribute('aria-hidden', 'true'); main.querySelector('.screen').appendChild(sp); }
    sp.style.height = (parseFloat(sp.style.height) || 0) + Math.ceil(short) + 'px';
  }
  const REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function refreshInPlace(f) {
    const A = S.active, it = f.it, e = entryFor(A.date, A.day, it);
    const now = e.done.slice(0, it.sets).indexOf(false);
    $$('#sets .srow').forEach((row, i) => {
      row.classList.toggle('done', !!e.done[i]); row.classList.toggle('now', i === now);
      const t = row.querySelector('.tick'); if (t) t.setAttribute('aria-pressed', String(!!e.done[i]));
      const o = row.querySelector('output'); if (o) o.textContent = e.sets[i] ?? 0;
    });
    const pill = $('#focus .xhead .pill');
    if (pill) { pill.className = 'pill' + (now === -1 ? ' done' : ''); pill.textContent = now === -1 ? 'Klaar' : 'Set ' + (now + 1) + ' / ' + it.sets; }
    let tot = 0, dn = 0;
    flatItems(dayById(A.day)).forEach(x => { tot += x.it.sets; dn += Math.min(doneCount(entryFor(A.date, A.day, x.it)), x.it.sets); });
    const sc = $('#setcount'); if (sc) sc.textContent = dn + ' van ' + tot + ' sets';
    const pb = $('.progress i'); if (pb) pb.style.width = (tot ? Math.round(dn / tot * 100) : 0) + '%';
    return now === -1;
  }

  /* --- focus card --- */
  function tempoPhases(tempo, labels) {
    const v = tempo.split('-').map(Number), Lb = LABELS[labels] || LABELS.push;
    const ph = [{ label: Lb.long[0], d: v[0] || 0.6, a: 0, b: 1, cell: 0, sec: v[0] }];
    if (v[1] > 0) ph.push({ label: Lb.long[1], d: v[1], a: 1, b: 1, cell: 1, sec: v[1] });
    ph.push({ label: Lb.long[2], d: v[2] || 0.7, a: 1, b: 0, cell: 2, sec: v[2], fast: !v[2] });
    if (v[3] > 0) ph.push({ label: Lb.long[3], d: v[3], a: 0, b: 0, cell: 3, sec: v[3] });
    else ph.push({ label: Lb.long[2], d: 0.2, a: 0, b: 0, cell: 2, sec: v[2], fast: !v[2], quiet: true });
    return ph;
  }
  function renderFocus() {
    const A = S.active, d = dayById(A.day), f = findItem(d, A.focus), card = $('#focus');
    if (!f) { card.hidden = true; return; }
    const it = f.it, ex = LIB[it.ex], isWU = f.kind === 'warmup';
    const e = entryFor(A.date, A.day, it);
    const pr = isWU ? null : progression(it, A.date);
    let target = '';
    if (pr) {
      const when = l => fmtShort(l.date) + (l.day !== A.day ? ', dag ' + esc(l.day) : '');
      if (pr.kind === 'harder') target = '<div class="target up"><span class="ic">↑</span><div><b>Klaar om zwaarder te maken.</b> Vorige keer (' + when(pr.last) + ') ' + pr.vals.join(' · ') + ': overal het maximum van ' + repsText(it) + '. Kies een zwaardere variant: trager tempo, ringen verder uit elkaar of lager, of gewicht erbij.</div></div>';
      else if (pr.kind === 'plus') target = '<div class="target"><span class="ic">+1</span><div><b>Doel vandaag: ' + pr.target.join(' · ') + '.</b> Vorige keer (' + when(pr.last) + '): ' + pr.vals.map(v => v == null ? '–' : v).join(' · ') + '.</div></div>';
      else if (pr.kind === 'other') target = '<div class="target"><span class="ic">1e</span><div><b>Eerste keer met ' + repsText(it) + ' reps.</b> Vorige keer (' + when(pr.last) + (pr.last.rng ? ', ' + pr.last.rng[0] + '–' + pr.last.rng[1] + ' reps' : '') + '): ' + pr.last.e.sets.map((v, i) => pr.last.e.done[i] && v != null ? v : '–').join(' · ') + '.</div></div>';
      else target = '<div class="target"><span class="ic">1e</span><div><b>Eerste keer.</b> Zoek een variant waarmee je binnen ' + repsText(it) + ' reps blijft.</div></div>';
    }
    const tv = isWU ? null : it.tempo.split('-');
    const Lb = isWU ? null : (LABELS[ex.labels] || LABELS.push);
    const now = e.done.slice(0, it.sets).indexOf(false);
    const stats = isWU ? [['Sets', it.sets], ['Doel', it.target]] : [['Sets', it.sets], ['Reps', repsText(it)], ['Rust', restText(it.rest)], ['RIR', it.rir]];
    card.innerHTML =
      '<button type="button" class="focus-head xhead" data-close aria-expanded="true" aria-label="' + esc(ex.name) + ' dichtvouwen"><span class="code' + (isWU ? ' wu' : '') + '">' + esc(f.code) + '</span><span class="grow"><b class="xname">' + esc(ex.name) + '</b><span class="mus">' + esc(ex.muscles || '') + '</span></span><span class="pill' + (now === -1 ? ' done' : '') + '">' + (now === -1 ? 'Klaar' : 'Set ' + (now + 1) + ' / ' + it.sets) + '</span><span class="chev up" aria-hidden="true"></span></button>' +
      '<div class="stage" id="stage"></div>' +
      (ex.bad ? '<p class="badline" id="badline" hidden>Fout: ' + esc(ex.bad) + '</p>' : '') +
      (tv ? '<div class="tempo" aria-label="Tempo ' + esc(it.tempo) + '">' + tv.map((n, i) => '<div class="cell" data-cell="' + i + '"><b>' + esc(n) + '</b><span>' + esc(Lb.cells[i]) + '</span></div>').join('') + '</div>' : '') +
      '<dl class="stats">' + stats.map(s => '<div><dt>' + s[0] + '</dt><dd>' + esc(s[1]) + '</dd></div>').join('') + '</dl>' +
      target +
      '<div class="sets" id="sets">' + Array.from({ length: it.sets }, (_, i) =>
        '<div class="srow' + (isWU ? ' wu' : '') + (e.done[i] ? ' done' : '') + (i === now ? ' now' : '') + '" data-i="' + i + '"><span class="sn">Set ' + (i + 1) + '</span>' +
        (isWU ? '<span class="tgt">' + esc(it.target) + '</span>' :
          '<span class="step"><button type="button" data-act="dec" aria-label="Set ' + (i + 1) + ': één rep minder">−</button><output>' + (e.sets[i] ?? 0) + '</output><button type="button" data-act="inc" aria-label="Set ' + (i + 1) + ': één rep meer">+</button></span><span class="unit">reps</span>') +
        '<button type="button" class="tick" data-act="tick" aria-pressed="' + (e.done[i] ? 'true' : 'false') + '" aria-label="Set ' + (i + 1) + ' klaar">' + ICON.tick + '</button></div>').join('') + '</div>' +
      (isWU ? '' : '<div class="btn-row"><button type="button" class="btn small" id="rest-btn">' + ICON.clock + '<span>Rust ' + restText(it.rest) + '</span></button></div>') +
      '<details class="cues"><summary>Uitvoering</summary><ul>' + ex.cues.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' + (ex.note ? '<p>' + ex.note + '</p>' : '') + '</details>';
    card.hidden = false;
    viewer.attach($('#stage'), it, ex, isWU);
    $('#sets').addEventListener('click', ev => {
      const b = ev.target.closest('[data-act]'); if (!b) return;
      onSetAction(f, +b.closest('.srow').dataset.i, b.dataset.act);
    });
    const rb = $('#rest-btn'); if (rb) rb.addEventListener('click', () => { if (rest && rest.id === it.id) stopRest(); else startRest(it); });
    updateRestBtn();
  }
  function onSetAction(f, i, act) {
    const A = S.active, it = f.it;
    let e = entryFor(A.date, A.day, it);
    e = { sets: e.sets.slice(), done: e.done.slice() };
    if (act === 'tick') {
      e.done[i] = !e.done[i];
      if (e.done[i] && !(e.sets[i] >= 0) && it.repsMin != null) e.sets[i] = it.repsMin;
      commitEntry(A.date, A.day, it, e);
      const complete = refreshInPlace(f);
      clearTimeout(collapseT);
      if (e.done[i]) {
        if (f.kind === 'main' && A.date >= todayStr()) startRest(it);
        if (complete) collapseT = setTimeout(() => {
          if (S.active === A && A.focus === it.id && route === 'train' && doneCount(entryFor(A.date, A.day, it)) >= it.sets) setOpen(null, it.id, true);
        }, 700);
      }
    } else {
      e.sets[i] = clamp((e.sets[i] ?? 0) + (act === 'inc' ? 1 : -1), 0, 99);
      const s = getSess(A.date, A.day);
      if (s && s.items[it.id]) commitEntry(A.date, A.day, it, e);
      else drafts[A.date + '|' + it.id] = e;
      const out = $('#sets').querySelector('.srow[data-i="' + i + '"] output'); if (out) out.textContent = e.sets[i];
      if (!(s && s.items[it.id])) { /* keep draft in memory until the set is ticked */ }
    }
  }
  const drafts = {};
  const _entryFor = entryFor;
  // drafts override the computed prefill until the first tick commits them
  entryFor = function (date, dayId, it) {
    const s = getSess(date, dayId);
    if (!(s && s.items[it.id]) && drafts[date + '|' + it.id]) return drafts[date + '|' + it.id];
    return _entryFor(date, dayId, it);
  };

  /* --- viewer (3D or 2D fallback), one instance --- */
  const viewer = (function () {
    let host = null, canvas = null, v3 = null, v3failed = false, svg = null, draw2d = null, cur = null, phases = null, t = 0, playing = true, bad = false, lastPh = -1, lastNow = performance.now();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) playing = false;
    function attach(stage, it, ex, isWU) {
      host = stage; cur = { it, ex, isWU }; t = reduce ? 0.6 : 0; lastPh = -1; bad = false;
      phases = isWU ? ex.phases.map(q => ({ label: q[0], d: q[1], a: q[2], b: q[3], cell: -1 })) : tempoPhases(it.tempo, ex.labels);
      const use3d = window.Pose3D && Pose3D.has(ex.id) && !v3failed;
      stage.innerHTML = '';
      if (use3d) {
        if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', ex.name + ' in 3D, sleep om te draaien'); }
        stage.appendChild(canvas);
        if (!v3) { v3 = window.View3D ? View3D.createViewer(canvas, stage) : null; if (!v3) v3failed = true; }
      }
      if (use3d && v3) {
        v3.setExercise(ex.id); v3.resize(); draw2d = null;
        stage.insertAdjacentHTML('beforeend',
          '<div class="ov tl"><div class="phase"><span class="lab" id="ph-lab"></span><span class="bar"><i id="ph-bar"></i></span></div></div>' +
          '<div class="ov tr"><button type="button" class="ovbtn round" id="pp" aria-label="Pauzeer animatie"></button></div>' +
          '<div class="ov bl" role="group" aria-label="Kijkhoek">' + [['side', 'Zij'], ['front', 'Voor'], ['angle', 'Schuin']].map(([k, l]) => '<button type="button" class="ovbtn" data-view="' + k + '" aria-pressed="' + (k === 'angle') + '">' + l + '</button>').join('') + '</div>' +
          (ex.bad ? '<div class="ov br"><button type="button" class="ovbtn bad" id="badbtn" aria-pressed="false">Fout</button></div>' : ''));
        v3.onView(name => $$('[data-view]', stage).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name))));
        $$('[data-view]', stage).forEach(b => b.addEventListener('click', () => v3.setView(b.dataset.view)));
        const bb = $('#badbtn', stage);
        if (bb) bb.addEventListener('click', () => { bad = !bad; bb.setAttribute('aria-pressed', String(bad)); const bl = $('#badline'); if (bl) bl.hidden = !bad; });
      } else {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Animatie van ' + ex.name);
        stage.appendChild(svg);
        draw2d = window.Eng2D ? Eng2D.createFigure(svg, ex.id, ex.hl || []) : null;
        stage.insertAdjacentHTML('beforeend',
          '<div class="ov tl"><div class="phase"><span class="lab" id="ph-lab"></span><span class="bar"><i id="ph-bar"></i></span></div><span class="badge-2d">3D volgt in een update</span></div>' +
          '<div class="ov tr"><button type="button" class="ovbtn round" id="pp" aria-label="Pauzeer animatie"></button></div>');
      }
      const pp = $('#pp', stage);
      const syncPP = () => { pp.innerHTML = playing ? ICON.pause : ICON.play; pp.setAttribute('aria-label', playing ? 'Pauzeer animatie' : 'Speel animatie'); };
      pp.addEventListener('click', () => { playing = !playing; lastNow = performance.now(); syncPP(); });
      syncPP();
      frame(true);
    }
    function detach() { host = null; cur = null; }
    function frame(force) {
      if (!host || !cur || !document.body.contains(host)) return;
      const total = phases.reduce((s, q) => s + q.d, 0), tc = t % total, cyc = Math.floor(t / total);
      let acc = 0, i = 0;
      while (i < phases.length - 1 && tc >= acc + phases[i].d) { acc += phases[i].d; i++; }
      const ph = phases[i], k = clamp((tc - acc) / ph.d, 0, 1);
      const p = lerp(ph.a, ph.b, ph.fast ? easeOut(k) : ease(k));
      if (draw2d) draw2d(p, { cycle: cyc });
      else if (v3) v3.draw(Pose3D.get(cur.ex.id).fn(p, bad, { cycle: cyc }));
      if (i !== lastPh || force) {
        lastPh = i;
        if (!ph.quiet) {
          const lab = $('#ph-lab', host);
          if (lab) lab.textContent = ph.label + (cur.isWU ? '' : (ph.fast ? ' · explosief' : ' · ' + ph.sec + ' sec'));
          $$('.cell', $('#focus')).forEach(c => c.classList.toggle('on', +c.dataset.cell === ph.cell));
        }
      }
      const bar = $('#ph-bar', host); if (bar && !ph.quiet) bar.style.width = (k * 100).toFixed(1) + '%';
    }
    function loop(now) {
      const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
      if (host && cur) {
        if (playing) t += dt;
        if (v3 && !draw2d) v3.tick(dt);
        if (playing || (v3 && !draw2d)) frame();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const retheme = () => { if (v3) { v3.applyTheme(); frame(true); } };
    if (mq.addEventListener) mq.addEventListener('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return { attach, detach };
  })();

  /* --- rest timer --- */
  const restBar = $('#restbar');
  let rest = null, actx = null;
  function ensureAudio() {
    if (!S.settings.sound) return;
    try { if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  }
  function beep(t0, fq) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = fq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.3);
  }
  function alarm() {
    try { if (S.settings.sound && actx) { const t0 = actx.currentTime + 0.02; beep(t0, 880); beep(t0 + 0.35, 880); beep(t0 + 0.7, 1175); } } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]); } catch (e) {}
  }
  const fmtT = s => Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
  function startRest(it) {
    if (!it.rest) return;
    rest = { id: it.id, name: LIB[it.ex].name, end: Date.now() + it.rest * 1000, total: it.rest, over: false };
    ensureAudio(); tickRest(); updateRestBtn();
  }
  function stopRest() { rest = null; restBar.hidden = true; document.body.classList.remove('timing'); updateRestBtn(); }
  function tickRest() {
    if (!rest) return;
    const left = Math.max(0, (rest.end - Date.now()) / 1000);
    if (left <= 0 && !rest.over) { rest.over = true; alarm(); }
    restBar.hidden = false; document.body.classList.add('timing');
    restBar.classList.toggle('over', rest.over);
    $('#rb-time').textContent = rest.over ? '0:00' : fmtT(Math.ceil(left));
    $('#rb-label').textContent = rest.over ? 'Rust voorbij · tijd voor je volgende set' : 'Rust · ' + rest.name;
    $('#rb-fill').style.width = (rest.over ? 100 : (1 - left / rest.total) * 100).toFixed(1) + '%';
    $('#rb-add').hidden = rest.over;
    $('#rb-stop').textContent = rest.over ? 'Sluiten' : 'Stop';
  }
  function updateRestBtn() {
    const b = $('#rest-btn'); if (!b || !S.active) return;
    const f = findItem(dayById(S.active.day), S.active.focus); if (!f || f.kind !== 'main') return;
    const on = !!(rest && rest.id === f.it.id && !rest.over);
    b.classList.toggle('dark', on);
    b.querySelector('span').textContent = on ? fmtT(Math.ceil(Math.max(0, (rest.end - Date.now()) / 1000))) + ' · stop' : 'Rust ' + restText(f.it.rest);
  }
  $('#rb-add').addEventListener('click', () => { if (rest && !rest.over) { rest.end += 30000; rest.total += 30; tickRest(); } });
  $('#rb-stop').addEventListener('click', stopRest);
  setInterval(() => { if (rest) { tickRest(); updateRestBtn(); } }, 250);

  /* --- screen wake lock --- */
  let wake = null;
  async function syncWake() {
    const want = route === 'train' && !!S.active && S.active.date >= todayStr() && S.settings.wake && document.visibilityState === 'visible';
    const ind = $('#wake-ind');
    if (want && !wake && 'wakeLock' in navigator) {
      try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; const i2 = $('#wake-ind'); if (i2) i2.classList.remove('on'); }); }
      catch (e) { wake = null; }
    } else if (!want && wake) { try { await wake.release(); } catch (e) {} wake = null; }
    const i3 = $('#wake-ind');
    if (i3) {
      i3.classList.toggle('on', !!wake);
      i3.textContent = wake ? 'Scherm blijft aan' : (S.settings.wake ? ('wakeLock' in navigator ? 'Scherm aanhouden niet gelukt' : 'Scherm aanhouden niet ondersteund') : 'Scherm aanhouden staat uit');
    }
  }
  document.addEventListener('visibilitychange', () => { syncWake(); if (document.visibilityState === 'visible' && rest) tickRest(); });

  /* ---------------- GESCHIEDENIS ---------------- */
  let histDay = null;
  function renderHist() {
    const sessions = Object.values(S.sessions).filter(sessHasDone).sort((a, b) => a.date < b.date ? -1 : 1);
    const lastS = sessions[sessions.length - 1];
    if (!histDay || !dayById(histDay)) histDay = days()[0] && days()[0].id;
    const d = dayById(histDay);
    const items = d ? d.blocks.flatMap(b => b.items) : [];
    const cards = items.map(it => {
      const rows = exHistory(it.ex).filter(x => S.sessions[skey(x.date, x.day)] && sessHasDone(S.sessions[skey(x.date, x.day)])).map(x => {
        const n = Math.max(x.e.done.length, 1);
        return { date: x.date, day: x.day, other: !sameRange(x.rng, it), sets: x.e.sets.slice(0, n), done: x.e.done.slice(0, n), total: x.e.sets.reduce((a, v, i) => a + (x.e.done[i] && v ? v : 0), 0) };
      });
      const own = rows.filter(r => !r.other), manyDays = new Set(rows.map(r => r.day)).size > 1 || rows.some(r => r.day !== d.id);
      const head = '<div class="focus-head"><span class="code">' + esc(codeOf(d, it)) + '</span><h3 class="grow">' + esc(LIB[it.ex].name) + '</h3>' + (own.length ? '<span class="pill">Beste ' + Math.max(...own.map(r => r.total)) + '</span>' : '') + '</div>';
      if (!rows.length) return '<article class="card">' + head + '<p class="empty">Nog niets gelogd.</p></article>';
      const others = [...new Set(rows.filter(r => r.other).map(r => r.day))];
      return '<article class="card">' + head + chartSVG(it, rows) +
        '<p class="note-line">Geel vlak: je doelzone (' + repsText(it) + ' reps × ' + it.sets + ' sets).' + (others.length ? ' Open bolletje: dag ' + others.map(esc).join(', ') + ', met een andere rep range.' : '') + '</p>' +
        '<div class="tbl"><table class="htab"><thead><tr><th>Datum</th>' + (manyDays ? '<th>Dag</th>' : '') + '<th>Week</th><th>Reps per set</th><th>Totaal</th></tr></thead><tbody>' +
        rows.slice().reverse().map(r => '<tr data-open="' + esc(r.date) + '" data-day="' + esc(r.day) + '" tabindex="0"' + (r.other ? ' class="other"' : '') + '><td>' + esc(fmtD(r.date)) + '</td>' + (manyDays ? '<td><span class="dtag' + (r.day === d.id ? ' cur' : '') + '">' + esc(r.day) + '</span></td>' : '') + '<td>' + weekNo(r.date) + '</td><td>' + r.sets.map((v, i) => r.done[i] ? v : '–').join(' · ') + '</td><td>' + r.total + '</td></tr>').join('') +
        '</tbody></table></div><p class="note-line">Tik op een datum om die training aan te passen.</p></article>';
    });
    main.innerHTML = '<section class="screen"><div><p class="h-eyebrow">' + esc(S.program.name) + '</p><h1 class="h-title">Geschiedenis</h1></div>' +
      '<div class="tiles"><div class="tile"><b>' + sessions.length + '</b><span>trainingen</span></div><div class="tile"><b>' + clamp(weekNo(todayStr()), 0, S.program.weeks) + '/' + S.program.weeks + '</b><span>week</span></div><div class="tile"><b>' + (lastS ? esc(fmtShort(lastS.date)) : '–') + '</b><span>laatste training</span></div></div>' +
      '<div class="seg" role="group" aria-label="Dag">' + days().map(x => '<button type="button" data-hday="' + esc(x.id) + '" aria-pressed="' + (x.id === histDay) + '">Dag ' + esc(x.id) + '</button>').join('') + '</div>' +
      cards.join('') + '</section>';
    $$('[data-hday]', main).forEach(b => b.addEventListener('click', () => { histDay = b.dataset.hday; renderHist(); }));
    const openRow = tr => { const dt = tr.dataset.open, dd = dayById(tr.dataset.day || histDay); if (!dd) return; stopRest(); S.active = { day: dd.id, date: dt, focus: flatItems(dd)[0] && flatItems(dd)[0].it.id, from: 'hist' }; delSess = false; save(); go('train'); };
    $$('tr[data-open]', main).forEach(tr => { tr.addEventListener('click', () => openRow(tr)); tr.addEventListener('keydown', ev => { if (ev.key === 'Enter') openRow(tr); }); });
  }
  function codeOf(d, it) { const f = flatItems(d).find(x => x.it.id === it.id); return f ? f.code : ''; }
  function chartSVG(it, rows) {
    const W = 320, H = 150, Lp = 30, R = 18, T = 16, B = 26, n = it.sets;
    const lo = it.repsMin * n, hi = it.repsMax * n;
    const ymax = Math.max(10, Math.ceil(Math.max(hi, ...rows.map(r => r.total)) * 1.12 / 5) * 5);
    const start = S.program.startDate, span = Math.max(1, S.program.weeks * 7 - 1);
    const X = dt => Lp + clamp(diffDays(start, dt) / span, 0, 1) * (W - Lp - R);
    const Y = v => T + (1 - v / ymax) * (H - T - B);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Totaal aantal reps per training voor ' + esc(LIB[it.ex].name) + '">';
    s += '<rect class="zone" x="' + Lp + '" y="' + Y(hi).toFixed(1) + '" width="' + (W - Lp - R) + '" height="' + (Y(lo) - Y(hi)).toFixed(1) + '"/>';
    [0, ymax / 2, ymax].forEach(v => { s += '<line class="grid" x1="' + Lp + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text x="' + (Lp - 6) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + Math.round(v) + '</text>'; });
    const wk = S.program.weeks;
    [1, Math.round(wk / 3), Math.round(2 * wk / 3), wk].forEach((w, i) => { s += '<text x="' + X(addDays(start, (w - 1) * 7)).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (i === 0 ? 'start' : 'middle') + '">W' + w + '</text>'; });
    if (rows.length > 1) s += '<polyline class="ln" points="' + rows.map(r => X(r.date).toFixed(1) + ',' + Y(r.total).toFixed(1)).join(' ') + '"/>';
    rows.forEach(r => { s += '<circle class="pt' + (r.other ? ' other' : '') + '" cx="' + X(r.date).toFixed(1) + '" cy="' + Y(r.total).toFixed(1) + '" r="4"/>'; });
    const lr = rows[rows.length - 1], lx = X(lr.date);
    s += '<text class="val" x="' + lx.toFixed(1) + '" y="' + (Y(lr.total) - 9).toFixed(1) + '" text-anchor="' + (lx > W - 40 ? 'end' : lx < Lp + 20 ? 'start' : 'middle') + '">' + lr.total + '</text>';
    return s + '</svg>';
  }

  /* ---------------- SCHEMA (editor + app) ---------------- */
  let confirmBox = null; // {kind, day}
  const REST_OPTS = [30, 45, 60, 90, 120, 150, 180, 240];
  const mainLib = Object.values(LIB).filter(x => x.kind === 'main');
  const wuLib = Object.values(LIB).filter(x => x.kind === 'warmup');
  function exOptions(list, sel) { return list.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>').join(''); }
  function wdOptions(sel) { return [1, 2, 3, 4, 5, 6, 0].map(w => '<option value="' + w + '"' + (w === sel ? ' selected' : '') + '>' + WD_L[w] + '</option>').join(''); }
  function renderPlan() {
    const P = S.program;
    const conf = (kind, text, yes) => confirmBox && confirmBox.kind === kind ? '<div class="confirm"><p>' + text + '</p><div class="btn-row"><button type="button" class="btn danger" data-act="' + yes + '">Ja, doe maar</button><button type="button" class="btn" data-act="cancel">Annuleren</button></div></div>' : '';
    main.innerHTML = '<section class="screen" id="plan">' +
      '<div><p class="h-eyebrow">Jouw schema</p><h1 class="h-title">Schema</h1></div>' +
      '<div class="card"><div class="field"><label for="p-name">Naam</label><input id="p-name" data-f="p.name" value="' + esc(P.name) + '"></div>' +
      '<div class="frow"><div class="field"><label for="p-start">Startdatum</label><input type="date" id="p-start" data-f="p.startDate" value="' + esc(P.startDate) + '"></div>' +
      '<div class="field"><label for="p-weeks">Aantal weken</label><input type="number" inputmode="numeric" min="1" max="52" id="p-weeks" data-f="p.weeks" value="' + P.weeks + '"></div></div>' +
      (P.notes && P.notes.length ? '<ul class="notes">' + P.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>' : '') + '</div>' +
      P.days.map(d => dayEditor(d, conf)).join('') +
      '<div class="btn-row"><button type="button" class="btn" data-act="add-day">' + ICON.plus + 'Dag toevoegen</button></div>' +
      '<h2 class="sec-title">Vaste activiteiten</h2>' +
      '<div class="card"><p class="note-line">' + ((P.activities || []).length ? 'Ze staan in je weekoverzicht, maar een gemiste training schuift er gewoon naartoe.' : 'Sport je ook buiten dit schema, zoals boulderen of een sessie met je PT? Zet het hier, dan zie je het in je weekoverzicht.') + '</p>' +
      (P.activities || []).map((a, i) => '<div class="actrow' + (i ? ' nolab' : '') + '"><div class="field"><label for="a-wd-' + i + '">Dag</label><select id="a-wd-' + i + '" data-f="a.weekday" data-i="' + i + '">' + wdOptions(a.weekday) + '</select></div><div class="field"><label for="a-nm-' + i + '">Activiteit</label><input id="a-nm-' + i + '" data-f="a.name" data-i="' + i + '" value="' + esc(a.name) + '" placeholder="bv. Boulderen"></div><button type="button" class="iconbtn del" data-act="del-act" data-i="' + i + '" aria-label="Activiteit verwijderen">' + ICON.del + '</button></div>').join('') +
      '<div class="btn-row"><button type="button" class="btn small" data-act="add-act">' + ICON.plus + 'Activiteit toevoegen</button></div></div>' +
      '<h2 class="sec-title">App</h2>' +
      '<div class="card">' +
      '<label class="switch"><span><b>Scherm aanhouden tijdens training</b><small>Je gsm vergrendelt niet tussen je sets.</small></span><input type="checkbox" id="s-wake" data-f="s.wake"' + (S.settings.wake ? ' checked' : '') + '></label>' +
      '<label class="switch"><span><b>Geluid bij einde rust</b><small>Drie piepjes en een trilling.</small></span><input type="checkbox" id="s-sound" data-f="s.sound"' + (S.settings.sound ? ' checked' : '') + '></label>' +
      '</div>' +
      '<div class="card"><div><b>Back-up</b><p class="note-line">Je schema en logboek staan alleen op deze gsm. Maak af en toe een back-up, zeker voor je van gsm wisselt.</p></div>' +
      '<div class="btn-row"><button type="button" class="btn" data-act="export">' + ICON.share + 'Back-up maken</button><button type="button" class="btn" data-act="import">' + ICON.file + 'Back-up of logboek inladen</button></div>' +
      '<input type="file" id="imp" accept="application/json,.json" hidden>' +
      (importBox ? importBox : '') +
      '</div>' +
      '<div class="card"><div><b>Schema van de coach</b><p class="note-line">Zet het schema terug zoals je het van je coach kreeg. Je logboek en vaste activiteiten blijven bewaard.</p></div>' +
      conf('reset', 'Je huidige schema wordt vervangen door het originele schema van de coach. Je vaste activiteiten blijven staan.', 'reset-yes') +
      (confirmBox && confirmBox.kind === 'reset' ? '' : '<div class="btn-row"><button type="button" class="btn danger" data-act="reset">Schema terugzetten</button></div>') + '</div>' +
      '<p class="note-line">BOLD Academy ' + APP_VERSION + '</p>' +
      '</section>';
  }
  let importBox = '';
  const openDays = new Set();
  main.addEventListener('toggle', e => {
    const dd = e.target.closest && e.target.closest('[data-dayd]');
    if (dd && e.target === dd) { if (dd.open) openDays.add(dd.dataset.dayd); else openDays.delete(dd.dataset.dayd); }
  }, true);
  function dayEditor(d, conf) {
    const di = esc(d.id);
    const cnt = d.blocks.reduce((a, b) => a + b.items.length, 0);
    return '<details class="card day-card" data-dayd="' + di + '"' + (openDays.has(d.id) ? ' open' : '') + '><summary class="day-sum"><span class="day-letter">' + di + '</span><span class="ds-txt"><b>' + esc(d.name) + '</b><small>' + WD_L[d.weekday] + ' · ' + cnt + ' oefeningen · ' + d.warmup.length + ' warm-up</small></span><span class="chev" aria-hidden="true"></span></summary>' +
      '<div class="frow"><div class="field"><label for="d-nm-' + di + '">Naam</label><input id="d-nm-' + di + '" data-f="d.name" data-day="' + di + '" value="' + esc(d.name) + '"></div>' +
      '<div class="field"><label for="d-wd-' + di + '">Dag</label><select id="d-wd-' + di + '" data-f="d.weekday" data-day="' + di + '">' + wdOptions(d.weekday) + '</select></div></div>' +
      '<div class="blk"><div class="blk-head"><b>Warm-up</b></div>' + d.warmup.map((it, i) => wuEditor(d, it, i)).join('') +
      '<div class="btn-row"><button type="button" class="btn small" data-act="add-wu" data-day="' + di + '">' + ICON.plus + 'Warm-up toevoegen</button></div></div>' +
      d.blocks.map((b, bi) => '<div class="blk"><div class="blk-head"><b>' + esc(groupName(b)) + '</b>' + (b.items.length ? '' : '<button type="button" class="iconbtn del" data-act="del-block" data-day="' + di + '" data-b="' + bi + '" aria-label="Blok verwijderen">' + ICON.del + '</button>') + '</div>' +
        b.items.map((it, i) => itemEditor(d, b, bi, it, i)).join('') +
        '<div class="btn-row"><button type="button" class="btn small" data-act="add-item" data-day="' + di + '" data-b="' + bi + '">' + ICON.plus + 'Oefening toevoegen</button></div></div>').join('') +
      '<div class="btn-row"><button type="button" class="btn small" data-act="add-block" data-day="' + di + '">' + ICON.plus + 'Blok toevoegen</button>' +
      (confirmBox && confirmBox.kind === 'del-day' && confirmBox.day === d.id ? '' : '<button type="button" class="btn small danger" data-act="del-day" data-day="' + di + '">Dag verwijderen</button>') + '</div>' +
      (confirmBox && confirmBox.kind === 'del-day' && confirmBox.day === d.id ? '<div class="confirm"><p>Dag ' + di + ' verwijderen? Je gelogde trainingen blijven bewaard, maar staan dan niet meer in de geschiedenis.</p><div class="btn-row"><button type="button" class="btn danger" data-act="del-day-yes" data-day="' + di + '">Ja, verwijder</button><button type="button" class="btn" data-act="cancel">Annuleren</button></div></div>' : '') +
      '</details>';
  }
  function moveBtns(attrs, first, last) {
    return '<div class="iconbtns"><button type="button" class="iconbtn" data-act="up" ' + attrs + (first ? ' disabled' : '') + ' aria-label="Omhoog">' + ICON.up + '</button><button type="button" class="iconbtn" data-act="down" ' + attrs + (last ? ' disabled' : '') + ' aria-label="Omlaag">' + ICON.down + '</button><button type="button" class="iconbtn del" data-act="del" ' + attrs + ' aria-label="Verwijderen">' + ICON.del + '</button></div>';
  }
  function wuEditor(d, it, i) {
    const a = 'data-day="' + esc(d.id) + '" data-scope="w" data-i="' + i + '"', id = esc(it.id);
    return '<div class="eitem"><div class="eitem-top"><span class="code wu">W' + (i + 1) + '</span><span class="grow"></span>' + moveBtns(a, i === 0, i === d.warmup.length - 1) + '</div>' +
      '<div class="field"><label for="w-ex-' + id + '">Oefening</label><select id="w-ex-' + id + '" data-f="w.ex" ' + a + '>' + exOptions(wuLib, it.ex) + '</select></div>' +
      '<div class="eitem-grid"><div class="field"><label for="w-sets-' + id + '">Sets</label><input type="number" inputmode="numeric" min="1" max="10" id="w-sets-' + id + '" data-f="w.sets" ' + a + ' value="' + it.sets + '"></div><div class="field" style="grid-column: span 2"><label for="w-tg-' + id + '">Doel</label><input id="w-tg-' + id + '" data-f="w.target" ' + a + ' value="' + esc(it.target) + '"></div></div></div>';
  }
  function itemEditor(d, b, bi, it, i) {
    const a = 'data-day="' + esc(d.id) + '" data-scope="b" data-b="' + bi + '" data-i="' + i + '"', id = esc(it.id);
    return '<div class="eitem"><div class="eitem-top"><span class="code">' + (i + 1) + esc(b.label) + '</span><span class="grow"></span>' + moveBtns(a, i === 0, i === b.items.length - 1) + '</div>' +
      '<div class="field"><label for="i-ex-' + id + '">Oefening</label><select id="i-ex-' + id + '" data-f="i.ex" ' + a + '>' + exOptions(mainLib, it.ex) + '</select></div>' +
      '<div class="eitem-grid">' +
      '<div class="field"><label for="i-sets-' + id + '">Sets</label><input type="number" inputmode="numeric" min="1" max="10" id="i-sets-' + id + '" data-f="i.sets" ' + a + ' value="' + it.sets + '"></div>' +
      '<div class="field"><label for="i-min-' + id + '">Reps min</label><input type="number" inputmode="numeric" min="1" max="100" id="i-min-' + id + '" data-f="i.repsMin" ' + a + ' value="' + it.repsMin + '"></div>' +
      '<div class="field"><label for="i-max-' + id + '">Reps max</label><input type="number" inputmode="numeric" min="1" max="100" id="i-max-' + id + '" data-f="i.repsMax" ' + a + ' value="' + it.repsMax + '"></div>' +
      '<div class="field"><label for="i-tp-' + id + '">Tempo</label><input class="mono" id="i-tp-' + id + '" data-f="i.tempo" ' + a + ' value="' + esc(it.tempo) + '" inputmode="numeric" placeholder="2-1-0-1"></div>' +
      '<div class="field"><label for="i-rest-' + id + '">Rust</label><select id="i-rest-' + id + '" data-f="i.rest" ' + a + '>' + REST_OPTS.map(s => '<option value="' + s + '"' + (s === it.rest ? ' selected' : '') + '>' + restText(s) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="i-rir-' + id + '">RIR</label><input id="i-rir-' + id + '" data-f="i.rir" ' + a + ' value="' + esc(it.rir) + '"></div>' +
      '</div></div>';
  }
  function targetOf(el) {
    const d = dayById(el.dataset.day), i = +el.dataset.i;
    if (!d) return null;
    if (el.dataset.scope === 'w') return { list: d.warmup, i, d };
    return { list: d.blocks[+el.dataset.b].items, i, d, block: d.blocks[+el.dataset.b] };
  }
  main.addEventListener('input', e => { if (route === 'plan') onPlanField(e.target, false); });
  main.addEventListener('change', e => {
    if (route === 'plan') {
      if (e.target.id === 'imp') { onImportFile(e.target.files && e.target.files[0]); e.target.value = ''; return; }
      onPlanField(e.target, true);
    }
  });
  function onPlanField(el, committed) {
    const f = el.dataset.f; if (!f) return;
    const P = S.program, v = el.value;
    if (f === 'p.name') P.name = v;
    else if (f === 'p.startDate') { if (v) P.startDate = v; }
    else if (f === 'p.weeks') { const n = parseInt(v, 10); if (n >= 1 && n <= 52) P.weeks = n; }
    else if (f === 'd.name') dayById(el.dataset.day).name = v;
    else if (f === 'd.weekday') dayById(el.dataset.day).weekday = +v;
    else if (f === 'a.weekday') P.activities[+el.dataset.i].weekday = +v;
    else if (f === 'a.name') P.activities[+el.dataset.i].name = v;
    else if (f === 's.wake') { S.settings.wake = el.checked; }
    else if (f === 's.sound') { S.settings.sound = el.checked; }
    else {
      const t = targetOf(el); if (!t) return; const it = t.list[t.i];
      const [scope, key] = f.split('.');
      if (key === 'ex') { if (it.ex !== v) { it.ex = v; it.id = t.d.id + '.' + v + '.' + rid(); } if (committed) renderPlan(); }
      else if (key === 'sets') { const n = parseInt(v, 10); if (n >= 1 && n <= 10) it.sets = n; }
      else if (key === 'repsMin' || key === 'repsMax') {
        const n = parseInt(v, 10);
        if (n >= 1 && n <= 100) { it[key] = n; if (it.repsMin > it.repsMax) { if (key === 'repsMin') it.repsMax = n; else it.repsMin = n; } }
      }
      else if (key === 'tempo') { const ok = /^\d-\d-\d-\d$/.test(v.trim()); el.style.borderColor = ok ? '' : 'var(--bad)'; if (ok) it.tempo = v.trim(); }
      else if (key === 'rest') it.rest = +v;
      else if (key === 'rir') it.rir = v;
      else if (key === 'target') it.target = v;
      void scope;
    }
    save();
    if (committed && (f === 'p.weeks' || f === 'p.startDate')) $('#weekpill').textContent = weekPillText();
  }
  main.addEventListener('click', e => {
    if (route !== 'plan') return;
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, P = S.program, d = b.dataset.day ? dayById(b.dataset.day) : null;
    if (d) openDays.add(d.id);
    if (act === 'up' || act === 'down' || act === 'del') {
      const t = targetOf(b); const j = t.i + (act === 'up' ? -1 : 1);
      if (act === 'del') t.list.splice(t.i, 1);
      else if (j >= 0 && j < t.list.length) { const x = t.list[t.i]; t.list[t.i] = t.list[j]; t.list[j] = x; }
    } else if (act === 'add-wu') { d.warmup.push({ id: d.id + '.' + wuLib[0].id + '.' + rid(), ex: wuLib[0].id, sets: 2, target: '10' }); }
    else if (act === 'add-item') { const blk = d.blocks[+b.dataset.b]; blk.items.push({ id: d.id + '.' + mainLib[0].id + '.' + rid(), ex: mainLib[0].id, sets: 2, repsMin: 8, repsMax: 12, tempo: '2-1-0-1', rest: 120, rir: '0–1' }); }
    else if (act === 'add-block') { const used = d.blocks.map(x => x.label); const lab = 'ABCDEFGHIJ'.split('').find(c => !used.includes(c)) || 'X'; d.blocks.push({ label: lab, items: [] }); }
    else if (act === 'del-block') { d.blocks.splice(+b.dataset.b, 1); }
    else if (act === 'add-day') { const used = P.days.map(x => x.id); const id = 'ABCDEFGHIJ'.split('').find(c => !used.includes(c)) || ('D' + rid()); openDays.add(id); P.days.push({ id, name: 'Full Body ' + id, weekday: 3, warmup: [], blocks: [{ label: 'A', items: [] }] }); }
    else if (act === 'del-day') { confirmBox = { kind: 'del-day', day: d.id }; }
    else if (act === 'del-day-yes') { P.days = P.days.filter(x => x.id !== b.dataset.day); if (S.active && S.active.day === b.dataset.day) S.active = null; confirmBox = null; }
    else if (act === 'add-act') { (P.activities = P.activities || []).push({ weekday: 1, name: '' }); }
    else if (act === 'del-act') { P.activities.splice(+b.dataset.i, 1); }
    else if (act === 'reset') { confirmBox = { kind: 'reset' }; }
    else if (act === 'reset-yes') { const acts = S.program.activities || []; S.program = clone(DEFAULT_PROGRAM); S.program.activities = acts; S.active = null; confirmBox = null; toast('Schema van de coach teruggezet.'); }
    else if (act === 'cancel') { confirmBox = null; importBox = ''; pendingImport = null; }
    else if (act === 'export') { exportBackup(); return; }
    else if (act === 'import') { $('#imp').click(); return; }
    else if (act === 'imp-replace' || act === 'imp-merge') { applyImport(act === 'imp-replace'); }
    else return;
    save(); renderPlan();
  });

  /* --- backup --- */
  let pendingImport = null;
  async function exportBackup() {
    saveNow();
    const data = { app: 'bold-academy', kind: 'backup', version: 1, appVersion: APP_VERSION, exported: new Date().toISOString(), program: S.program, sessions: S.sessions, settings: S.settings };
    const name = 'bold-academy-backup-' + todayStr() + '.json';
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'BOLD Academy back-up' }); toast('Back-up gedeeld.'); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Back-up gedownload: ' + name);
    } catch (e) { toast('Een back-up opslaan lukt niet in deze weergave. In de geïnstalleerde app wel.'); }
  }
  function onImportFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      let data = null;
      try { data = JSON.parse(r.result); } catch (e) { toast('Dit bestand kan ik niet lezen. Kies een back-up van BOLD Academy.'); return; }
      if (!data || data.app !== 'bold-academy' || !data.sessions) { toast('Dit is geen back-up van BOLD Academy.'); return; }
      pendingImport = data;
      const n = Object.keys(data.sessions).length;
      importBox = '<div class="confirm" style="border-color:var(--accent)"><p><b>' + n + ' trainingen gevonden' + (data.program ? ', plus een schema' : '') + '.</b> ' +
        (data.program ? 'Wil je alles vervangen, of alleen het logboek toevoegen aan wat je al hebt?' : 'Ze worden toegevoegd aan je logboek. Trainingen die je al hebt, blijven staan.') + '</p><div class="btn-row">' +
        (data.program ? '<button type="button" class="btn danger" data-act="imp-replace">Alles vervangen</button>' : '') +
        '<button type="button" class="btn primary" data-act="imp-merge">Logboek toevoegen</button><button type="button" class="btn" data-act="cancel">Annuleren</button></div></div>';
      renderPlan();
    };
    r.readAsText(file);
  }
  function applyImport(replace) {
    const data = pendingImport; if (!data) return;
    let added = 0;
    if (replace) {
      S.program = data.program; S.sessions = data.sessions; if (data.settings) S.settings = Object.assign(S.settings, data.settings); S.active = null;
      added = Object.keys(data.sessions).length;
    } else {
      for (const [k, s] of Object.entries(data.sessions)) {
        if (!S.sessions[k]) { S.sessions[k] = s; added++; continue; }
        for (const [iid, e] of Object.entries(s.items)) if (!S.sessions[k].items[iid]) { S.sessions[k].items[iid] = e; }
      }
    }
    pendingImport = null; importBox = '';
    tagEntries(S.sessions);
    saveNow();
    toast(replace ? 'Back-up ingeladen.' : added + ' trainingen toegevoegd aan je logboek.');
  }

  /* ---------------- service worker ---------------- */
  const framed = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  if ('serviceWorker' in navigator && !framed && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      const ask = w => toast('Er is een nieuwe versie van BOLD Academy.', { label: 'Vernieuwen', fn: () => w.postMessage('skipWaiting') });
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
      });
      // een geïnstalleerde app wordt vaak alleen hervat, niet opnieuw geopend: kijk dan ook of er een update is (hooguit om de 30 min)
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - lastCheck > 30 * 60 * 1000) { lastCheck = Date.now(); reg.update().catch(() => {}); }
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }

  render();
  window.__bold = { get state() { return S; }, plan, render, go };
})();
