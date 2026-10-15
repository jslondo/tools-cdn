// 인카네이션·에테르 트리 플래너 공용 스크립트.
// 페이지는 자기 트리의 data.js(window.TREE, kind='inc'|'eth')를 먼저 읽고 이 파일을 부른다.
// 찍기 규칙은 HSPlanner와 같다: 클릭하면 시작점/이미 찍은 노드에서 최단 경로를 함께 배분,
// 해제하면 시작점과 끊긴 가지도 함께 정리.
(() => {
const D = window.TREE, INC = D.kind === 'inc';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const T = {
  ko: {
    title: INC ? "히어로시즈 인카네이션 트리 플래너 · 미니히시즈DB" : "히어로시즈 에테르 트리 플래너 · 미니히시즈DB",
    h1: INC ? '인카네이션 트리' : '에테르 트리',
    sub: '노드를 누르면 <b>시작점에서 가장 짧은 길</b>이 함께 찍힙니다 · 찍힌 노드를 다시 누르면 그 뒤로 끊긴 가지도 같이 풀립니다',
    other: INC ? '에테르 트리' : '인카네이션 트리',
    pts: '찍은 노드', ptsSub: (r) => `시작점 ${r}개 포함`, sum: '합계', sumNone: '노드를 찍으면 합계가 쌓입니다',
    share: '링크 복사', shared: '복사됨', undo: '되돌리기', clear: '전체 해제', focus: '찍은 것만 밝게',
    times: (n) => `×${n}`, q: '노드 검색 (한/영)', reset: '보기 초기화',
    hint: '드래그 이동 · 휠 확대 · 노드 클릭으로 찍기',
    kind: { 0: '일반', 1: '큰 노드', 2: '시작점', 3: '장신구 슬롯', 4: '블랙홀' },
    node: '노드', of: (a, b) => `${a}/${b}`, none: '검색 결과 없음',
    foot: 'Hero Siege (Panic Art Studios) 기반 · 노드 배치·수치는 <a href="https://github.com/HeroSiegePlanner/HSPlanner" target="_blank" rel="noopener">HSPlanner</a>(MIT), 이름·설명은 게임 내 번역 파일 · 패치에 따라 달라질 수 있습니다 · 비공식 팬 프로젝트 · 문의 디스코드 <b>win.terer</b>',
  },
  en: {
    title: INC ? "Hero Siege Incarnation Tree Planner · Mini HS DB" : "Hero Siege Ether Tree Planner · Mini HS DB",
    h1: INC ? 'Incarnation Tree' : 'Ether Tree',
    sub: 'Clicking a node also allocates the <b>shortest path</b> from a start node · clicking an allocated node also frees whatever it orphans',
    other: INC ? 'Ether tree' : 'Incarnation tree',
    pts: 'Allocated', ptsSub: (r) => `including ${r} start node${r === 1 ? '' : 's'}`, sum: 'Totals',
    sumNone: 'Allocate nodes to build totals',
    share: 'Copy link', shared: 'Copied', undo: 'Undo', clear: 'Clear', focus: 'Dim the rest',
    times: (n) => `×${n}`, q: 'Search nodes', reset: 'Reset view',
    hint: 'drag to pan · scroll to zoom · click to allocate',
    kind: { 0: 'Normal', 1: 'Notable', 2: 'Start', 3: 'Jewelry slot', 4: 'Black hole' },
    node: 'Node', of: (a, b) => `${a}/${b}`, none: 'No matches',
    foot: 'Based on Hero Siege (Panic Art Studios) · Node layout and values from <a href="https://github.com/HeroSiegePlanner/HSPlanner" target="_blank" rel="noopener">HSPlanner</a> (MIT); names and descriptions from the game’s translation files · May change between patches · Unofficial fan project · Contact: Discord <b>win.terer</b>',
  },
};
let LANG = 'ko';
try { if ((localStorage.getItem('wt-lang') || localStorage.getItem('hsdb-lang')) === 'en') LANG = 'en'; } catch (e) {}
const t = () => T[LANG];
const L = (pair) => (LANG === 'en' ? pair[1] : pair[0]) || pair[0];
const OTHER = INC ? '/hs/ether/' : '/hs/tree/';
const SKEY = 'hs-plan-' + D.kind;

// 계열 색 — 인카네이션은 능력치 축, 에테르는 지역
const COLOR = {
  Strength:'#d06a5a', Dexterity:'#8fbf6a', Intelligence:'#7aa6e0', Armor:'#d6b06a',
  All:'#c9a3d6', Jewel:'#e8c860', Whirl:'#9aa0b0', Skill:'#68c2b0',
  Ether_Universal:'#c9b08a', Ether_Overworld:'#7fbf7a', Ether_Eternal_Battlefield:'#d07a6a',
  Ether_Unholy_Siege:'#b06ad0', Ether_Unstable_Rift:'#6ac2d0', Ether_Mining:'#d0a25a',
  Ether_Dungeon:'#9a8ad0', Ether_Chaos_Tower:'#d06a9a', Ether_Chaos_Pillar:'#d0c05a',
  Ether_Cursed_Spirit:'#6ad0a2', Ether_Shadow_Realm:'#8a8aa8', Ether_Prime_Evil:'#d05a5a',
  Ether_Ruby_Gardens:'#e0607a',
};
const colorOf = (gi) => COLOR[D.g[gi][2]] || COLOR[D.g[gi][1]] || '#9a8b8b';

// 노드 자리: 인카 [x,y,r,계열,종류,아이콘,제목,줄들,덤] · 에테르 [x,y,r,계열,아이콘,효과,종류]
const ICON_AT = INC ? 5 : 4, KIND_AT = INC ? 4 : 6;
const isRoot = (n) => n[KIND_AT] === 2;

// ── 검색 텍스트 · 좌표 격자 ────────────────────────────────────────────
const CELLS = 48, grid = new Map(), text = [];
D.nodes.forEach((n, i) => {
  const key = ((n[0] / CELLS) | 0) + ',' + ((n[1] / CELLS) | 0);
  (grid.get(key) || grid.set(key, []).get(key)).push(i);
  let parts;
  if (INC) {
    parts = [...D.t[n[6]], ...n[7].flatMap((li) => D.l[li].slice(0, 2)), ...D.g[n[3]]];
    if (n[8] && n[8].note) parts.push(...n[8].note);
    if (n[8] && n[8].g) parts.push(...n[8].g);
  } else {
    const s = D.s[n[5]];
    parts = [s[0], s[1], s[2], s[3], s[4], ...D.g[n[3]]];
  }
  text.push(parts.join(' ').toLowerCase());
});
// 이웃 목록 · 시작점
const adj = D.nodes.map(() => []);
for (const [a, b] of D.edges) { adj[a].push(b); adj[b].push(a); }
const roots = []; D.nodes.forEach((n, i) => { if (isRoot(n)) roots.push(i); });

// ── 상태 ──────────────────────────────────────────────────────────────
let view = null, hover = -1, pinned = -1, matches = [], mset = new Set(), mi = 0;
let groupFilter = null, dimOthers = false;
let sel = new Set();
const undoStack = [];

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const stage = document.getElementById('stage'), infoEl = document.getElementById('info');
const atlas = new Image(); let atlasOK = false;
atlas.onload = () => { atlasOK = true; draw(); };
atlas.src = 'nodes.png';

function fit() {
  const [vx, vy, vw, vh] = D.vb, m = 1.02;
  const k = Math.min(cv.clientWidth / (vw * m), cv.clientHeight / (vh * m));
  return { k, ox: (cv.clientWidth - vw * k) / 2 - vx * k, oy: (cv.clientHeight - vh * k) / 2 - vy * k };
}
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(stage.clientWidth * dpr); cv.height = Math.round(stage.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!view) view = fit();
  draw();
}

// ── 찍기 ──────────────────────────────────────────────────────────────
function pathTo(target) {            // 시작점·이미 찍은 노드에서 목표까지 가장 짧은 길
  const parent = new Array(D.nodes.length).fill(-2), q = [];
  for (const s of [...sel, ...roots]) if (parent[s] === -2) { parent[s] = s; q.push(s); }
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    if (cur === target) {
      const path = [cur]; let st = cur;
      while (parent[st] !== st) { st = parent[st]; path.push(st); }
      return path;
    }
    for (const nx of adj[cur]) if (parent[nx] === -2) { parent[nx] = cur; q.push(nx); }
  }
  return [];
}
function toggleNode(i) {
  undoStack.push([...sel]); if (undoStack.length > 60) undoStack.shift();
  if (sel.has(i)) {
    sel.delete(i);
    const keep = new Set(), q = roots.filter((r) => sel.has(r));
    for (let h = 0; h < q.length; h++) {
      const cur = q[h]; if (keep.has(cur)) continue; keep.add(cur);
      for (const nx of adj[cur]) if (sel.has(nx) && !keep.has(nx)) q.push(nx);
    }
    sel = keep;
  } else {
    for (const x of pathTo(i)) sel.add(x);
  }
  saveState(); renderSide();
}

// ── 그리기 ────────────────────────────────────────────────────────────
function draw() {
  if (!view) return;
  const v = view;
  document.getElementById('zoom').textContent = Math.round(v.k * 100) + '%';
  ctx.save();
  ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
  ctx.fillStyle = '#0d0709'; ctx.fillRect(0, 0, cv.clientWidth, cv.clientHeight);
  ctx.imageSmoothingEnabled = false;
  const dim = matches.length > 0 || groupFilter !== null;
  const on = (i) => !((matches.length && !mset.has(i)) || (groupFilter !== null && D.nodes[i][3] !== groupFilter));
  ctx.lineWidth = Math.max(0.6, 1.1 * v.k);
  ctx.strokeStyle = '#5c3b46'; ctx.globalAlpha = dim ? .3 : .85;
  ctx.beginPath();
  for (const [a, b] of D.edges) {
    const A = D.nodes[a], B = D.nodes[b];
    ctx.moveTo(A[0] * v.k + v.ox, A[1] * v.k + v.oy); ctx.lineTo(B[0] * v.k + v.ox, B[1] * v.k + v.oy);
  }
  ctx.stroke();
  if (sel.size) {                                    // 찍은 노드끼리 이은 길은 금색
    ctx.strokeStyle = '#e8c860'; ctx.globalAlpha = .75; ctx.lineWidth = Math.max(1, 1.6 * v.k);
    ctx.beginPath();
    for (const [a, b] of D.edges) {
      if (!sel.has(a) || !sel.has(b)) continue;
      const A = D.nodes[a], B = D.nodes[b];
      ctx.moveTo(A[0] * v.k + v.ox, A[1] * v.k + v.oy); ctx.lineTo(B[0] * v.k + v.ox, B[1] * v.k + v.oy);
    }
    ctx.stroke();
  }
  const cell = D.atlas.cell, cols = D.atlas.cols;
  D.nodes.forEach((n, i) => {
    const x = n[0] * v.k + v.ox, y = n[1] * v.k + v.oy, r = Math.max(1.5, n[2] * v.k * 1.35);
    if (x < -r * 3 || y < -r * 3 || x > cv.clientWidth + r * 3 || y > cv.clientHeight + r * 3) return;
    const mine = sel.has(i);
    const live = (!dim || on(i)) && (!dimOthers || mine);
    const col = colorOf(n[3]);
    ctx.globalAlpha = mine || live ? 1 : .16;
    if (atlasOK && r > 3) {
      const ic = n[ICON_AT];
      ctx.drawImage(atlas, (ic % cols) * cell, ((ic / cols) | 0) * cell, cell, cell, x - r, y - r, r * 2, r * 2);
      if (r > 5) {                                   // 계열 색 테두리 — 인게임 트리처럼 노드 경계를 살린다
        ctx.globalAlpha = (mine || live ? 1 : .16) * (n[2] > 7 ? .85 : .45);
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(.7, r * .11);
        ctx.beginPath(); ctx.arc(x, y, r * .92, 0, 7); ctx.stroke();
        ctx.globalAlpha = mine || live ? 1 : .16;
      }
    } else {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, r * .7), 0, 7); ctx.fill();
    }
    if (mine) {                                      // 찍은 노드 — 금색 링
      ctx.globalAlpha = 1; ctx.strokeStyle = '#e8c860'; ctx.lineWidth = Math.max(1.2, r * .2);
      ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.stroke();
    } else if (live && dim) {                        // 검색·계열 강조 링
      ctx.globalAlpha = .9; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.stroke();
    }
  });
  for (const [i, c, w] of [[pinned, '#fff6d8', 2], [hover, '#e8dcc8', 1.5]]) {
    if (i < 0) continue;
    const n = D.nodes[i], x = n[0] * v.k + v.ox, y = n[1] * v.k + v.oy, r = Math.max(4, n[2] * v.k * 1.35);
    ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// ── 이동·확대 ─────────────────────────────────────────────────────────
let drag = null, pinch = null;
const pts = new Map();
const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
const mid = () => { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { drag = null; pinch = { d: dist(), k: view.k, m: mid() }; return; }
  drag = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: 0 };
  cv.classList.add('drag');
});
cv.addEventListener('pointermove', (e) => {
  const rect = cv.getBoundingClientRect();
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size === 2) {
    const k2 = Math.min(6, Math.max(0.12, pinch.k * dist() / pinch.d));
    const mx = pinch.m.x - rect.left, my = pinch.m.y - rect.top;
    view.ox = mx - (mx - view.ox) * (k2 / view.k); view.oy = my - (my - view.oy) * (k2 / view.k); view.k = k2;
    draw(); return;
  }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    view.ox = drag.ox + dx; view.oy = drag.oy + dy; draw();
    return;
  }
  const h = pick(e.clientX - rect.left, e.clientY - rect.top);
  if (h !== hover) { hover = h; draw(); if (pinned < 0) showInfo(h); }
});
cv.addEventListener('pointerup', (e) => {
  const rect = cv.getBoundingClientRect(), moved = drag ? drag.moved : 99;
  pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
  drag = null; cv.classList.remove('drag');
  if (moved < 4) {
    const h = pick(e.clientX - rect.left, e.clientY - rect.top);
    if (h >= 0) toggleNode(h);
    pinned = h; showInfo(h); draw();
  }
});
cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; drag = null; cv.classList.remove('drag'); });
cv.addEventListener('pointerleave', () => { if (hover >= 0) { hover = -1; draw(); if (pinned < 0) showInfo(-1); } });
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = cv.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const k2 = Math.min(6, Math.max(0.12, view.k * Math.exp(-e.deltaY * 0.0016)));
  view.ox = mx - (mx - view.ox) * (k2 / view.k); view.oy = my - (my - view.oy) * (k2 / view.k); view.k = k2;
  draw();
}, { passive: false });

function pick(px, py) {
  const wx = (px - view.ox) / view.k, wy = (py - view.oy) / view.k, tol = Math.max(6, 10 / view.k);
  let best = -1, bd = Infinity;
  const cx = (wx / CELLS) | 0, cy = (wy / CELLS) | 0;
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
    for (const idx of grid.get(i + ',' + j) || []) {
      const n = D.nodes[idx], d = Math.hypot(n[0] - wx, n[1] - wy);
      if (d < Math.max(n[2], tol) && d < bd) { bd = d; best = idx; }
    }
  }
  return best;
}

// ── 노드 상세 ─────────────────────────────────────────────────────────
function showInfo(i) {
  if (i < 0) { infoEl.hidden = true; return; }
  const n = D.nodes[i], K = t();
  let html = `<button class="x" id="infox" aria-label="close">×</button>`;
  if (INC) {
    const ti = D.t[n[6]];
    html += `<div class="nm">${esc(L(ti))}</div><div class="nm2">${esc(ti[1])}</div>`
      + `<div><span class="tag" style="color:${colorOf(n[3])}">${esc(L(D.g[n[3]]))}</span>`
      + `<span class="tag">${esc(K.kind[n[4]] || '')}</span>`
      + ((n[8] && n[8].g) || []).map((x) => `<span class="tag">${esc(x)}</span>`).join('') + `</div>`;
    if (n[7].length) html += '<ul>' + n[7].map((li) => {
      const l = D.l[li];
      return `<li>${esc(L(l))}${LANG === 'en' ? '' : `<span class="en">${esc(l[1])}</span>`}</li>`;
    }).join('') + '</ul>';
    if (n[8] && n[8].note) html += `<div class="desc">${esc(L(n[8].note))}</div>`;
  } else {
    const s = D.s[n[5]];
    html += `<div class="nm">${esc(LANG === 'en' ? s[1] : s[0])}</div><div class="nm2">${esc(s[1])}</div>`
      + `<div><span class="tag" style="color:${colorOf(n[3])}">${esc(L(D.g[n[3]]))}</span>`
      + `<span class="tag">${esc(K.kind[n[6]] || '')}</span></div>`
      + (s[2] ? `<div class="val">${esc(s[2])}</div>` : '')
      + `<div class="desc">${esc(LANG === 'en' ? s[4] : s[3])}`
      + (LANG === 'en' ? '' : `<span class="en">${esc(s[4])}</span>`) + '</div>';
  }
  html += `<div class="id">${esc(K.node)} #${i}</div>`;
  infoEl.innerHTML = html; infoEl.hidden = false;
  document.getElementById('infox').onclick = () => { pinned = -1; infoEl.hidden = true; draw(); };
}

// ── 합계 ──────────────────────────────────────────────────────────────
function totals() {
  const rows = new Map(), extra = new Map();
  for (const i of sel) {
    const n = D.nodes[i];
    if (INC) {
      for (const li of n[7]) {
        const l = D.l[li];
        if (l.length > 2) {
          const key = l[4] + '|' + l[3], r = rows.get(key) || { p: D.p[l[4]], unit: l[3], v: 0, c: 0 };
          r.v += l[2]; r.c++; rows.set(key, r);
        } else {
          const r = extra.get(l[0]) || { p: [l[0], l[1]], c: 0 }; r.c++; extra.set(l[0], r);
        }
      }
    } else {
      const st = D.s[n[5]], m = /^(-?[\d.]+)\s*(%?)$/.exec((st[2] || '').trim());
      if (m) {
        const r = rows.get(n[5]) || { p: [st[0], st[1]], unit: m[2], v: 0, c: 0 };
        r.v += parseFloat(m[1]); r.c++; rows.set(n[5], r);
      } else {
        const r = extra.get(n[5]) || { p: [st[0], st[1]], c: 0 }; r.c++; extra.set(n[5], r);
      }
    }
  }
  const fix = (v) => (Math.round(v * 100) / 100).toLocaleString();
  const out = [...rows.values()].map((r) => ({ ...r, txt: fix(r.v) + r.unit }));
  out.sort((a, b) => b.c - a.c || Math.abs(b.v) - Math.abs(a.v));
  return { out, extra: [...extra.values()] };
}
const enP = (p) => (p[1] || '').replace(/^to /, '');
function renderSide() {
  const K = t(), n = sel.size, rootN = [...sel].filter((i) => isRoot(D.nodes[i])).length;
  document.getElementById('ptsLab').textContent = K.pts;
  document.getElementById('ptsN').textContent = n.toLocaleString();
  document.getElementById('ptsSub').textContent = n ? K.ptsSub(rootN) : '';
  document.getElementById('sumLab').textContent = K.sum;
  const { out, extra } = totals(), body = document.getElementById('sumBody');
  if (!out.length && !extra.length) { body.innerHTML = `<div class="none">${esc(K.sumNone)}</div>`; return; }
  body.innerHTML = '<ul>' + out.map((r) =>
      `<li><span>${esc(LANG === 'en' ? enP(r.p) : r.p[0])} <i class="c">${esc(K.times(r.c))}</i></span><span class="v">${esc(r.txt)}</span></li>`).join('')
    + extra.map((r) =>
      `<li><span>${esc(LANG === 'en' ? r.p[1] : r.p[0])}</span><span class="c">${esc(K.times(r.c))}</span></li>`).join('') + '</ul>';
}

// ── 저장·공유: 노드 번호를 정렬해 차이값만 7비트씩 쌓고(varint) base64url ─────
function encode() {
  const ids = [...sel].sort((a, b) => a - b), bytes = [];
  let prev = 0;
  for (const id of ids) {
    let d = id - prev; prev = id;
    while (d > 127) { bytes.push((d & 127) | 128); d >>= 7; }
    bytes.push(d);
  }
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(str) {
  try {
    const raw = atob(str.replace(/-/g, '+').replace(/_/g, '/')), out = new Set();
    let cur = 0, shift = 0, acc = 0;
    for (let i = 0; i < raw.length; i++) {
      const b = raw.charCodeAt(i);
      acc |= (b & 127) << shift; shift += 7;
      if (!(b & 128)) { cur += acc; if (cur < D.nodes.length) out.add(cur); acc = 0; shift = 0; }
    }
    sel = out;
  } catch (e) {}
}
function loadState() {
  const q = new URLSearchParams(location.search).get('p');
  if (q) return decode(q);
  try { const v = localStorage.getItem(SKEY); if (v) decode(v); } catch (e) {}
}
function saveState() { try { localStorage.setItem(SKEY, encode()); } catch (e) {} }

// ── 검색 ──────────────────────────────────────────────────────────────
const qEl = document.getElementById('q'), hitsEl = document.getElementById('hits');
function runSearch() {
  const q = qEl.value.trim().toLowerCase();
  matches = [];
  if (q) {
    const terms = q.split(/\s+/);
    text.forEach((s, i) => { if (terms.every((w) => s.includes(w))) matches.push(i); });
  }
  mset = new Set(matches); mi = 0; updateHits();
  if (matches.length) center(matches[0]);
  draw();
}
function updateHits() {
  const K = t();
  hitsEl.textContent = !qEl.value.trim() ? '' : matches.length ? K.of(mi + 1, matches.length) : K.none;
  document.getElementById('prev').disabled = matches.length < 2;
  document.getElementById('next').disabled = matches.length < 2;
}
function center(i) {
  const n = D.nodes[i];
  if (view.k < 1) view.k = 1;
  view.ox = cv.clientWidth / 2 - n[0] * view.k; view.oy = cv.clientHeight / 2 - n[1] * view.k;
  pinned = i; showInfo(i);
}
const step = (d) => { if (!matches.length) return; mi = (mi + d + matches.length) % matches.length; center(matches[mi]); updateHits(); draw(); };
qEl.addEventListener('input', runSearch);
qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } });
document.getElementById('prev').onclick = () => step(-1);
document.getElementById('next').onclick = () => step(1);
function zoomBy(f) {
  const mx = cv.clientWidth / 2, my = cv.clientHeight / 2;
  const k2 = Math.min(6, Math.max(0.12, view.k * f));
  view.ox = mx - (mx - view.ox) * (k2 / view.k); view.oy = my - (my - view.oy) * (k2 / view.k); view.k = k2; draw();
}
document.getElementById('zin').onclick = () => zoomBy(1.4);
document.getElementById('zout').onclick = () => zoomBy(1 / 1.4);
document.getElementById('reset').onclick = () => {
  qEl.value = ''; matches = []; mset = new Set(); groupFilter = null; pinned = -1; infoEl.hidden = true;
  view = fit(); updateHits(); renderLegend(); draw();
};
document.getElementById('share').onclick = async (e) => {
  const code = encode();
  const url = location.origin + location.pathname + (code ? '?p=' + code : '');
  try { await navigator.clipboard.writeText(url); } catch (err) { prompt('URL', url); }
  const b = e.target, old = b.textContent;
  b.textContent = t().shared; setTimeout(() => { b.textContent = old; }, 1200);
};
document.getElementById('undo').onclick = () => {
  if (!undoStack.length) return;
  sel = new Set(undoStack.pop()); saveState(); renderSide(); draw();
};
document.getElementById('clear').onclick = () => {
  undoStack.push([...sel]); sel = new Set(); saveState(); renderSide(); draw();
};
document.getElementById('focus').onclick = (e) => {
  dimOthers = !dimOthers; e.target.setAttribute('aria-pressed', dimOthers); draw();
};
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { pinned = -1; infoEl.hidden = true; draw(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); document.getElementById('undo').click(); }
});

function renderLegend() {
  document.getElementById('legend').innerHTML = D.g.map((g, i) =>
    `<button data-g="${i}" aria-pressed="${groupFilter === i}" style="color:${colorOf(i)}"><i></i>${esc(L(g))}</button>`).join('');
  document.querySelectorAll('#legend button').forEach((b) => b.onclick = () => {
    const i = +b.dataset.g; groupFilter = groupFilter === i ? null : i; renderLegend(); draw();
  });
}
function setLang(l) {
  LANG = l; const K = t();
  document.documentElement.lang = l === 'en' ? 'en' : 'ko';
  document.title = K.title;
  document.getElementById('h1').textContent = K.h1;
  document.getElementById('sub').innerHTML = K.sub + ` · <a href="${OTHER}">${esc(K.other)}</a>`;
  document.getElementById('hint').textContent = K.hint;
  qEl.placeholder = K.q;
  for (const [id, v] of [['reset', K.reset], ['share', K.share], ['undo', K.undo], ['clear', K.clear], ['focus', K.focus]])
    document.getElementById(id).textContent = v;
  document.getElementById('foot').innerHTML = K.foot;
  renderLegend(); renderSide(); updateHits(); if (pinned >= 0) showInfo(pinned); draw();
}
window.addEventListener('wt-langchange', (e) => setLang(e.detail === 'en' ? 'en' : 'ko'));
addEventListener('resize', resize);
loadState();
setLang(LANG);
resize();
})();
