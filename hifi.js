// Kronos hi-fi — Registro (B) + Historial (C) + Stats (A)
(function () {
  const CATEGORIES = JSON.parse(document.getElementById('categories').textContent);
  const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  // ── sample data ──
  function genRecords() {
    const records = [];
    const now = new Date();
    let seed = 11;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const templates = [
      ['dormir', 23.5, 420, ['noche tranquila', null, 'cansado']],
      ['dormir', 14, 35, ['siesta', null]],
      ['comida', 8, 25, ['avena', 'café', null]],
      ['comida', 13.5, 40, ['pasta con pesto', 'ensalada', 'sobras']],
      ['comida', 20.5, 35, ['pizza', 'sopa', null]],
      ['estudio', 9, 90, ['cap. 4', 'repaso', 'ejercicios tema 3']],
      ['estudio', 16, 75, ['notas', null, 'lectura']],
      ['trabajo', 10, 150, ['reunión', 'code review', 'sprint planning', null]],
      ['trabajo', 15, 130, ['deep work', null, 'diseño']],
      ['deporte', 7.5, 45, ['correr 5k', 'fuerza', 'yoga']],
      ['deporte', 18, 60, ['gimnasio', null]],
      ['silencio', 7, 15, ['meditación matinal', null]],
      ['silencio', 22, 12, ['respiración', null, 'journaling']],
      ['ocio', 21, 80, ['serie', 'película', 'videojuego']],
      ['ia', 17, 55, ['prompt engineering', 'probando Claude', 'script raro']],
      ['ia', 11, 40, ['experimento', null]],
    ];

    for (let d = 0; d < 14; d++) {
      const day = new Date(now); day.setDate(day.getDate() - d);
      day.setHours(0, 0, 0, 0);
      const count = 2 + Math.floor(rand() * 3);
      const used = new Set();
      for (let i = 0; i < count; i++) {
        let idx = Math.floor(rand() * templates.length);
        let g = 0;
        while (used.has(idx) && g < 10) { idx = (idx + 1) % templates.length; g++; }
        used.add(idx);
        const [catId, h, mins, comments] = templates[idx];
        const startH = h + (rand() - 0.5) * 0.6;
        const dur = (mins + (rand() - 0.5) * 20) * 60 * 1000;
        const start = new Date(day);
        start.setMinutes(Math.round(startH * 60));
        const end = new Date(start.getTime() + dur);
        const comment = comments[Math.floor(rand() * comments.length)];
        records.push({ id: `r${d}_${i}`, category: catId, start: start.toISOString(), end: end.toISOString(), duration: Math.round(dur), comment });
      }
    }
    records.sort((a, b) => new Date(b.start) - new Date(a.start));
    return records;
  }

  const RECORDS = genRecords();

  // ── state ──
  const state = {
    tracker: 'idle',     // idle | active
    modal: null,         // null | finish | edit | cancel
    selectedCat: 'estudio',
    activeCat: 'estudio',
    statsRange: 7,
    selectedDay: new Date().toDateString(),
  };

  // ── helpers ──
  const pad = n => String(n).padStart(2, '0');
  const fmtClock = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDur = ms => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };
  const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();

  // ── render ──
  const row = document.getElementById('row');
  function render() {
    row.innerHTML = '';
    row.appendChild(phoneUnit('registro', 'Registro', 'toca una categoría · desliza para empezar', buildTracker));
    row.appendChild(phoneUnit('historial', 'Historial', 'calendario de 28 días · detalle del día seleccionado', buildHistory));
    row.appendChild(phoneUnit('stats', 'Stats', 'total · donut por categoría · barras 14 días', buildStats));

    // sync button states
    document.querySelectorAll('.cs-btn').forEach(b => {
      b.classList.toggle('active',
        (b.dataset.state === 'idle' && state.tracker === 'idle' && !state.modal) ||
        (b.dataset.state === 'active' && state.tracker === 'active' && !state.modal) ||
        (b.dataset.state === 'finish' && state.modal === 'finish') ||
        (b.dataset.state === 'edit' && state.modal === 'edit'));
    });
  }

  function phoneUnit(id, title, sub, builder) {
    const unit = document.createElement('div');
    unit.className = 'phone-unit';
    unit.innerHTML = `
      <div class="caption">
        <div class="tag">${id.toUpperCase()}</div>
        <h3><em>${title}</em></h3>
        <p>${sub}</p>
      </div>
    `;
    const phone = document.createElement('div');
    phone.className = 'phone';
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.appendChild(statusBar());

    const frame = document.createElement('div');
    frame.className = 'frame';
    builder(frame, id);
    screen.appendChild(frame);

    screen.appendChild(nav(id));

    // modal overlay on relevant phone
    if (state.modal === 'finish' && id === 'registro') screen.appendChild(buildFinishModal());
    else if (state.modal === 'edit' && id === 'historial') screen.appendChild(buildEditModal());
    else if (state.modal === 'cancel' && id === 'registro') screen.appendChild(buildCancelModal());

    phone.appendChild(screen);
    unit.appendChild(phone);
    return unit;
  }

  function statusBar() {
    const sb = document.createElement('div');
    sb.className = 'sb';
    sb.innerHTML = `
      <span>9:41</span>
      <span class="icons">
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="0.5" fill="currentColor"/><rect x="5" y="5" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="10" y="3" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="15" y="0" width="3" height="11" rx="0.5" fill="currentColor"/></svg>
        <svg width="25" height="11" viewBox="0 0 25 11"><rect x="1" y="1" width="20" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-opacity="0.4"/><rect x="2.5" y="2.5" width="17" height="6" rx="1" fill="currentColor"/><rect x="22" y="4" width="1.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.4"/></svg>
      </span>
    `;
    return sb;
  }

  function nav(current) {
    const n = document.createElement('div');
    n.className = 'nav';
    const tabs = [
      { id: 'registro',  icon: iconTimer,  label: 'Registro' },
      { id: 'historial', icon: iconList,   label: 'Historial' },
      { id: 'stats',     icon: iconChart,  label: 'Stats' },
    ];
    tabs.forEach(t => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (t.id === current ? ' active' : '');
      tab.innerHTML = `${t.icon()}<span>${t.label}</span>`;
      n.appendChild(tab);
    });
    return n;
  }

  function iconTimer() { return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2"/><path d="M9 2h6"/><path d="M12 2v3"/></svg>`; }
  function iconList()  { return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>`; }
  function iconChart() { return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>`; }

  // ═══ TRACKER ═══
  function buildTracker(frame) {
    const head = document.createElement('div');
    head.className = 'head';
    if (state.tracker === 'idle') {
      head.innerHTML = `
        <div class="eyebrow">Martes · 17 abril</div>
        <h1>¿Qué vas a <em>hacer</em>?</h1>
      `;
    } else {
      head.innerHTML = `
        <div class="eyebrow">En curso</div>
        <h1><em>Enfocado.</em></h1>
      `;
    }
    frame.appendChild(head);

    const body = document.createElement('div');
    body.className = 'body';

    if (state.tracker === 'idle') {
      // ribbon
      body.appendChild(buildRibbon());

      // quickpick label
      const ql = document.createElement('div');
      ql.className = 'qp-label';
      ql.innerHTML = `<h2>elegí una</h2><span class="hint">8 categorías</span>`;
      body.appendChild(ql);

      // grid
      const qp = document.createElement('div');
      qp.className = 'quickpick';
      CATEGORIES.forEach(c => {
        const el = document.createElement('div');
        el.className = 'qp' + (c.id === state.selectedCat ? ' selected' : '');
        el.style.setProperty('--cc', c.color);
        el.innerHTML = `
          <div class="chip"></div>
          <div class="ic">${c.icon}</div>
          <div class="lbl">${c.label}</div>
        `;
        el.addEventListener('click', () => { state.selectedCat = c.id; render(); });
        qp.appendChild(el);
      });
      body.appendChild(qp);

      // comment
      const cf = document.createElement('div');
      cf.className = 'comment-field';
      cf.textContent = 'añadir comentario (opcional)';
      body.appendChild(cf);

      // swipe
      const c = CAT[state.selectedCat];
      const sw = document.createElement('div');
      sw.className = 'swipe';
      sw.style.setProperty('--cc', c.color);
      sw.style.background = c.color;
      sw.style.boxShadow = `0 12px 28px -8px ${c.color}`;
      sw.innerHTML = `
        <div class="thumb">${c.icon}</div>
        <div class="label">empezar ${c.label.toLowerCase()}</div>
        <div class="arrows">→→</div>
      `;
      sw.addEventListener('click', () => {
        state.tracker = 'active';
        state.activeCat = state.selectedCat;
        render();
      });
      body.appendChild(sw);

      // recent
      const rh = document.createElement('div');
      rh.className = 'recent-header';
      rh.textContent = 'Últimos registros';
      body.appendChild(rh);
      RECORDS.slice(0, 3).forEach(r => {
        const cat = CAT[r.category];
        const rr = document.createElement('div');
        rr.className = 'recent-row';
        rr.style.setProperty('--cc', cat.color);
        rr.innerHTML = `
          <div class="dot"></div>
          <div class="n">${cat.label}${r.comment ? ` <em>· ${r.comment}</em>` : ''}</div>
          <div class="d">${fmtDur(r.duration)}</div>
        `;
        body.appendChild(rr);
      });
    } else {
      // active
      const c = CAT[state.activeCat];
      const card = document.createElement('div');
      card.className = 'active';
      card.style.setProperty('--cc', c.color);
      card.style.background = c.color;
      card.style.boxShadow = `0 20px 40px -12px ${c.color}`;
      card.innerHTML = `
        <div class="blob"></div>
        <button class="cancel" title="cancelar">✕</button>
        <div class="topline">
          <div class="glyph">${c.icon}</div>
          <div>
            <div class="cat-name">${c.label}</div>
            <div class="since">desde 09:04</div>
          </div>
        </div>
        <div class="timer">00:37:12<span class="ms">.04</span></div>
        <div class="note">"cap. 4 de Deep Work"</div>
        <button class="finish">Terminar sesión</button>
      `;
      card.querySelector('.finish').addEventListener('click', () => { state.modal = 'finish'; render(); });
      card.querySelector('.cancel').addEventListener('click', () => { state.modal = 'cancel'; render(); });
      body.appendChild(card);

      const rh = document.createElement('div');
      rh.className = 'recent-header';
      rh.textContent = 'Últimos registros';
      body.appendChild(rh);
      RECORDS.slice(0, 4).forEach(r => {
        const cat = CAT[r.category];
        const rr = document.createElement('div');
        rr.className = 'recent-row';
        rr.style.setProperty('--cc', cat.color);
        rr.innerHTML = `
          <div class="dot"></div>
          <div class="n">${cat.label}${r.comment ? ` <em>· ${r.comment}</em>` : ''}</div>
          <div class="d">${fmtDur(r.duration)}</div>
        `;
        body.appendChild(rr);
      });
    }

    frame.appendChild(body);
  }

  function buildRibbon() {
    const today = RECORDS.filter(r => isToday(r.start));
    const totalMs = today.reduce((a, r) => a + r.duration, 0);
    const wrap = document.createElement('div');
    wrap.className = 'ribbon';
    wrap.innerHTML = `
      <div class="ribbon-head">
        <span class="day">Hoy</span>
        <span class="total">${fmtDur(totalMs)} · ${today.length} sesiones</span>
      </div>
      <div class="ribbon-bar" id="rbar"></div>
      <div class="ribbon-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    `;
    const bar = wrap.querySelector('#rbar');
    // one segment per hour, colored if record that hour
    const minutesInDay = 24 * 60;
    // sort today records by start
    const sorted = [...today].sort((a,b) => new Date(a.start) - new Date(b.start));
    // render each record as a segment positioned absolutely
    bar.style.position = 'relative';
    sorted.forEach(r => {
      const s = new Date(r.start);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const durMin = Math.min(minutesInDay - startMin, r.duration / 60000);
      const seg = document.createElement('div');
      seg.className = 'ribbon-seg';
      seg.style.position = 'absolute';
      seg.style.top = '0'; seg.style.bottom = '0';
      seg.style.left = (startMin / minutesInDay * 100) + '%';
      seg.style.width = (durMin / minutesInDay * 100) + '%';
      seg.style.background = CAT[r.category].color;
      seg.title = `${CAT[r.category].label} · ${fmtDur(r.duration)}`;
      bar.appendChild(seg);
    });
    // now indicator
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const n = document.createElement('div');
    n.className = 'now';
    n.style.left = (nowMin / minutesInDay * 100) + '%';
    bar.appendChild(n);
    return wrap;
  }

  // ═══ HISTORIAL ═══
  function buildHistory(frame) {
    const head = document.createElement('div');
    head.className = 'head';
    head.innerHTML = `
      <div class="eyebrow">${RECORDS.length} registros</div>
      <div class="hist-header" style="margin-top: 6px">
        <h1 style="margin:0">Historial</h1>
        <button class="export">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          JSON
        </button>
      </div>
    `;
    frame.appendChild(head);

    const body = document.createElement('div');
    body.className = 'body';

    // month label
    const ml = document.createElement('div');
    ml.className = 'month-label';
    ml.textContent = 'abril 2026';
    body.appendChild(ml);

    // weekday row
    const wk = document.createElement('div');
    wk.className = 'weekdays';
    ['L','M','X','J','V','S','D'].forEach(d => {
      const e = document.createElement('div'); e.textContent = d; wk.appendChild(e);
    });
    body.appendChild(wk);

    // calendar: 4 weeks ending today, aligned to Monday start
    const cal = document.createElement('div');
    cal.className = 'calendar';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
    const end = new Date(today);
    // start 3 weeks back, on a Monday
    const daysBack = 3 * 7 + dayOfWeek;
    const start = new Date(today); start.setDate(start.getDate() - daysBack);

    for (let i = 0; i <= daysBack; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      const cell = document.createElement('div');
      cell.className = 'cell';
      const key = day.toDateString();
      if (key === today.toDateString()) cell.classList.add('today');
      if (key === state.selectedDay) cell.classList.add('selected');
      cell.innerHTML = `<span>${day.getDate()}</span>`;

      const recs = RECORDS.filter(r => new Date(r.start).toDateString() === key).slice(0, 5);
      const stack = document.createElement('div');
      stack.className = 'stack';
      recs.forEach(r => {
        const bar = document.createElement('i');
        bar.style.background = CAT[r.category].color;
        stack.appendChild(bar);
      });
      cell.appendChild(stack);
      cell.addEventListener('click', () => {
        state.selectedDay = key;
        render();
      });
      cal.appendChild(cell);
    }
    body.appendChild(cal);

    // day detail
    const selDate = new Date(state.selectedDay);
    const dayRecs = RECORDS.filter(r => new Date(r.start).toDateString() === state.selectedDay)
      .sort((a,b) => new Date(a.start) - new Date(b.start));
    const dayTotal = dayRecs.reduce((a,r) => a + r.duration, 0);
    const dayName = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][selDate.getDay()];

    const dh = document.createElement('div');
    dh.className = 'day-detail-header';
    dh.innerHTML = `
      <div class="date"><em>${dayName}</em> <strong>${selDate.getDate()}</strong></div>
      <div class="tot">${fmtDur(dayTotal)} · ${dayRecs.length} registros</div>
    `;
    body.appendChild(dh);

    const list = document.createElement('div');
    list.className = 'rec-list';
    if (dayRecs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:24px;font-family:"Instrument Serif",serif;font-style:italic;color:var(--ink-3)';
      empty.textContent = 'sin registros este día';
      list.appendChild(empty);
    }
    dayRecs.forEach(r => {
      const cat = CAT[r.category];
      const el = document.createElement('div');
      el.className = 'rec';
      el.style.setProperty('--cc', cat.color);
      el.innerHTML = `
        <div class="time">
          <strong>${fmtClock(r.start)}</strong>
          ${fmtClock(r.end)}
        </div>
        <div class="mid">
          <div class="top">
            <span class="glyph">${cat.icon}</span>
            <span class="name">${cat.label}</span>
          </div>
          ${r.comment ? `<div class="note">"${r.comment}"</div>` : ''}
        </div>
        <div class="right">
          <div class="dur">${fmtDur(r.duration)}</div>
          <div class="acts">
            <button title="edit">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button title="delete">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      `;
      el.querySelector('[title="edit"]').addEventListener('click', () => { state.modal = 'edit'; state.selectedCat = r.category; render(); });
      list.appendChild(el);
    });
    body.appendChild(list);

    frame.appendChild(body);
  }

  // ═══ STATS ═══
  function buildStats(frame) {
    const head = document.createElement('div');
    head.className = 'head';
    head.innerHTML = `
      <div class="eyebrow">Resumen</div>
      <h1>Stats</h1>
    `;
    frame.appendChild(head);

    const body = document.createElement('div');
    body.className = 'body';

    // chips
    const chips = document.createElement('div');
    chips.className = 'chips';
    [7, 30, 'all'].forEach(r => {
      const c = document.createElement('div');
      c.className = 'chip' + (state.statsRange === r ? ' active' : '');
      c.textContent = r === 'all' ? 'Todo' : `${r} días`;
      c.addEventListener('click', () => { state.statsRange = r; render(); });
      chips.appendChild(c);
    });
    body.appendChild(chips);

    // filter
    const recs = state.statsRange === 'all' ? RECORDS :
      RECORDS.filter(r => Date.now() - new Date(r.start).getTime() < state.statsRange * 86400000);

    // total
    const totalMs = recs.reduce((a, r) => a + r.duration, 0);
    const hrs = totalMs / 3600000;
    const total = document.createElement('div');
    total.className = 'total-card';
    const prev = state.statsRange === 'all' ? null : (() => {
      const s = state.statsRange * 86400000;
      const nowT = Date.now();
      const prevRecs = RECORDS.filter(r => {
        const t = new Date(r.start).getTime();
        return (nowT - t) >= s && (nowT - t) < 2 * s;
      });
      return prevRecs.reduce((a,r)=>a+r.duration, 0) / 3600000;
    })();
    const deltaHtml = prev !== null && prev > 0
      ? `<div class="delta">vs período anterior: <span class="up">+${((hrs - prev) / prev * 100).toFixed(0)}%</span> · ${prev.toFixed(1)}h</div>`
      : '';
    total.innerHTML = `
      <div class="eyebrow">Total ${state.statsRange === 'all' ? 'siempre' : `· últimos ${state.statsRange} días`}</div>
      <div class="big">${Math.floor(hrs)}<em>.${Math.round((hrs - Math.floor(hrs)) * 10)}</em><span class="unit">horas</span></div>
      ${deltaHtml}
    `;
    body.appendChild(total);

    // donut
    const donutSec = document.createElement('div');
    donutSec.className = 'donut-section';
    donutSec.innerHTML = `<h3>Por categoría</h3>`;
    const dw = document.createElement('div');
    dw.className = 'donut-wrap';
    dw.appendChild(buildDonut(recs));
    donutSec.appendChild(dw);

    const legend = document.createElement('div');
    legend.className = 'legend';
    const totalsByCat = {};
    recs.forEach(r => { totalsByCat[r.category] = (totalsByCat[r.category] || 0) + r.duration; });
    const sorted = Object.keys(totalsByCat).sort((a,b) => totalsByCat[b] - totalsByCat[a]);
    sorted.forEach(cid => {
      const c = CAT[cid];
      const lr = document.createElement('div');
      lr.className = 'leg-row';
      lr.style.setProperty('--cc', c.color);
      lr.innerHTML = `<div class="sw"></div><span class="name">${c.label}</span><span class="val">${fmtDur(totalsByCat[cid])}</span>`;
      legend.appendChild(lr);
    });
    donutSec.appendChild(legend);
    body.appendChild(donutSec);

    // bars
    const bc = document.createElement('div');
    bc.className = 'bars-card';
    bc.innerHTML = `<h3>Últimos 14 días</h3><div class="sub">horas por día · stacked por categoría</div>`;
    const bars = document.createElement('div');
    bars.className = 'bars';
    const today = new Date(); today.setHours(0,0,0,0);
    // compute each day's records
    const dayData = [];
    for (let d = 13; d >= 0; d--) {
      const day = new Date(today); day.setDate(day.getDate() - d);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const dayRecs = RECORDS.filter(r => {
        const t = new Date(r.start).getTime();
        return t >= day.getTime() && t < next.getTime();
      });
      dayData.push({ day, recs: dayRecs, total: dayRecs.reduce((a,r)=>a+r.duration, 0) });
    }
    const maxDay = Math.max(...dayData.map(d => d.total), 1);
    dayData.forEach(({ day, recs, total }, i) => {
      const col = document.createElement('div');
      col.className = 'bar-col';
      if (i === dayData.length - 1) col.classList.add('today');
      const totalsByCatDay = {};
      recs.forEach(r => { totalsByCatDay[r.category] = (totalsByCatDay[r.category] || 0) + r.duration; });
      // stack biggest at bottom
      const sortedCats = Object.keys(totalsByCatDay).sort((a,b) => totalsByCatDay[b] - totalsByCatDay[a]);
      const heightPx = (total / maxDay) * 88;
      sortedCats.reverse().forEach(cid => {
        const seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.background = CAT[cid].color;
        seg.style.height = (totalsByCatDay[cid] / total * heightPx) + 'px';
        col.appendChild(seg);
      });
      col.title = `${day.toLocaleDateString('es-ES',{weekday:'short', day:'numeric'})} · ${fmtDur(total)}`;
      bars.appendChild(col);
    });
    bc.appendChild(bars);
    const bx = document.createElement('div');
    bx.className = 'bars-x';
    bx.innerHTML = `<span>hace 14d</span><span>hoy</span>`;
    bc.appendChild(bx);
    body.appendChild(bc);

    frame.appendChild(body);
  }

  function buildDonut(recs) {
    const size = 210;
    const r = 80;
    const cx = size/2, cy = size/2;
    const totals = {};
    recs.forEach(x => { totals[x.category] = (totals[x.category] || 0) + x.duration; });
    const total = Object.values(totals).reduce((a,b)=>a+b,0) || 1;
    let angle = -Math.PI/2;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    // order by size
    const ordered = CATEGORIES.filter(c => totals[c.id] > 0).sort((a,b) => totals[b.id] - totals[a.id]);
    ordered.forEach(c => {
      const v = totals[c.id];
      const a = (v / total) * 2 * Math.PI;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const x2 = cx + Math.cos(angle + a) * r;
      const y2 = cy + Math.sin(angle + a) * r;
      const large = a > Math.PI ? 1 : 0;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`);
      path.setAttribute('fill', c.color);
      path.setAttribute('stroke', '#f4efe4');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);
      angle += a;
    });
    const hole = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hole.setAttribute('cx', cx); hole.setAttribute('cy', cy);
    hole.setAttribute('r', 44);
    hole.setAttribute('fill', '#fbf8f1');
    svg.appendChild(hole);

    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 2);
    t1.setAttribute('text-anchor','middle');
    t1.setAttribute('font-family','Instrument Serif, serif');
    t1.setAttribute('font-size','30');
    t1.setAttribute('font-style','italic');
    t1.setAttribute('fill','#1f1b15');
    t1.textContent = `${(total/3600000).toFixed(1)}h`;
    svg.appendChild(t1);
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy + 14);
    t2.setAttribute('text-anchor','middle');
    t2.setAttribute('font-family','JetBrains Mono, monospace');
    t2.setAttribute('font-size','8');
    t2.setAttribute('fill','#8a8273');
    t2.setAttribute('letter-spacing','1.5');
    t2.textContent = 'TOTAL';
    svg.appendChild(t2);
    return svg;
  }

  // ═══ MODALS ═══
  function buildFinishModal() {
    const c = CAT[state.activeCat];
    const bg = document.createElement('div');
    bg.className = 'modal open';
    bg.addEventListener('click', e => { if (e.target === bg) { state.modal = null; render(); } });
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `
      <div class="grabber"></div>
      <h2>Terminar <em>${c.label.toLowerCase()}</em></h2>
      <div class="finish-summary" style="--cc:${c.color}">
        <div class="ic" style="background:${c.color}">${c.icon}</div>
        <div class="meta">
          <div class="t">00:37:12</div>
          <div class="r">desde 09:04 · hasta ahora</div>
        </div>
      </div>
      <label>Comentario</label>
      <textarea rows="2" placeholder="qué hiciste…">cap. 4 de Deep Work</textarea>
      <div class="sheet-actions">
        <button class="sheet-btn">Cancelar</button>
        <button class="sheet-btn primary">Guardar</button>
      </div>
    `;
    sheet.querySelectorAll('.sheet-btn').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('primary')) {
        state.tracker = 'idle';
      }
      state.modal = null; render();
    }));
    bg.appendChild(sheet);
    return bg;
  }

  function buildCancelModal() {
    const c = CAT[state.activeCat];
    const bg = document.createElement('div');
    bg.className = 'modal open';
    bg.addEventListener('click', e => { if (e.target === bg) { state.modal = null; render(); } });
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `
      <div class="grabber"></div>
      <h2>¿Descartar sesión?</h2>
      <p style="font-family:'Instrument Serif',serif;font-style:italic;color:var(--ink-2);font-size:15px;line-height:1.5;margin:0 0 18px">
        Llevas <strong style="font-style:normal;color:var(--ink)">37 minutos</strong> en
        <strong style="font-style:normal;color:${c.color}">${c.label.toLowerCase()}</strong>. No se guardará ningún registro.
      </p>
      <div class="sheet-actions">
        <button class="sheet-btn">Seguir</button>
        <button class="sheet-btn danger">Descartar</button>
      </div>
    `;
    sheet.querySelectorAll('.sheet-btn').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('danger')) { state.tracker = 'idle'; }
      state.modal = null; render();
    }));
    bg.appendChild(sheet);
    return bg;
  }

  function buildEditModal() {
    const c = CAT[state.selectedCat];
    const bg = document.createElement('div');
    bg.className = 'modal open';
    bg.addEventListener('click', e => { if (e.target === bg) { state.modal = null; render(); } });
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `
      <div class="grabber"></div>
      <h2>Editar <em>registro</em></h2>
      <label>Categoría</label>
      <div class="cat-picker">
        ${CATEGORIES.map(cat => `
          <div class="cp ${cat.id===state.selectedCat?'selected':''}" data-id="${cat.id}" style="--cc:${cat.color}">
            <span style="font-size:16px">${cat.icon}</span>
            <span>${cat.label}</span>
          </div>
        `).join('')}
      </div>
      <label>Inicio</label>
      <input type="datetime-local" value="2026-04-17T09:04" />
      <label>Fin</label>
      <input type="datetime-local" value="2026-04-17T10:34" />
      <label>Comentario</label>
      <textarea rows="2">cap. 4 de Deep Work</textarea>
      <div class="sheet-actions">
        <button class="sheet-btn">Cancelar</button>
        <button class="sheet-btn primary">Guardar</button>
      </div>
    `;
    sheet.querySelectorAll('.cp').forEach(el => el.addEventListener('click', () => {
      state.selectedCat = el.dataset.id;
      render();
    }));
    sheet.querySelectorAll('.sheet-btn').forEach(b => b.addEventListener('click', () => {
      state.modal = null; render();
    }));
    bg.appendChild(sheet);
    return bg;
  }

  // ── controls ──
  document.querySelectorAll('.cs-btn').forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.state;
    if (s === 'idle') { state.tracker = 'idle'; state.modal = null; }
    else if (s === 'active') { state.tracker = 'active'; state.modal = null; }
    else if (s === 'finish') { state.tracker = 'active'; state.modal = 'finish'; }
    else if (s === 'edit') { state.modal = 'edit'; }
    render();
  }));

  render();
})();
