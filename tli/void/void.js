// 생성물 — 고칠 땐 update/src/void_page.js (build_html2.build_tool_pages)
// 허공의 성도 시뮬레이터 (/tli/void, 2026-10-16) — 재능 별무리 노드 찍기 · 포인트 · 효과 합계 · 링크 공유
// 데이터 VOID = {star, main, list:[{page, name, icon, unlock, n, main?, vb, start, nodes:[{id,x,y,r,icon,kind,map?,fn?,extra?}], links:[[자식,부모]]}]}
// 규칙(사용자 확인 2026-10-16): 노드 = 1포인트(시작 노드는 공짜) · 그윽한(메인) 별무리는 '메인 스타 재능' 전용 포인트 ·
//   '스타 재능 N개를 추가 소모' 노드는 +N 스타 재능 · 찍으려면 부모(이전 노드) 하나가 찍혀 있어야 함 ·
//   '이전 노드를 우선 활성화하지 않음' 노드는 효과 미적용(경고만)
(function () {
  'use strict';
  const ICON = 'https://cdn.tlidb.com/UI/Textures/Common/Icon/TalentPoint/128/';
  const KEY = 'tli_solo_void_v1';
  const NOPRE = /이전 노드를 우선 활성화하지 않음/;
  const app = document.getElementById('voidApp');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hl = s => esc(s).replace(/([+\-]?\d+(?:\.\d+)?%?)/g, '<b class="vc-num">$1</b>');

  // ── 별무리 준비: 부모·자식 표, 노드 찾기 ──
  const CS = VOID.list.map((c, ci) => {
    const by = new Map(c.nodes.map(n => [n.id, n]));
    const par = new Map(), kids = new Map();
    c.links.forEach(([a, b]) => {
      if (!par.has(a)) par.set(a, []); par.get(a).push(b);
      if (!kids.has(b)) kids.set(b, []); kids.get(b).push(a);
    });
    const xs = c.nodes.map(n => n.x), ys = c.nodes.map(n => n.y), pad = 70;
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
    return Object.assign({}, c, { ci, by, par, kids, key: Math.floor(+c.start / 100), box: [x0, y0, w, h] });
  });
  const BYKEY = new Map(CS.map(c => [c.key, c]));

  // ── 상태: 별무리별 찍은 노드 id 집합 (시작 노드는 넣지 않는다 — 늘 켜진 것으로 본다) ──
  let S = CS.map(() => new Set());
  let view = -1;            // -1 = 목록, 아니면 별무리 번호
  let undo = [];
  const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.s) S = CS.map(c => new Set((o.s[c.key] || []).filter(id => c.by.has(id) && id !== c.start))); } catch (e) {} };
  const save = () => { try { const s = {}; CS.forEach(c => { if (S[c.ci].size) s[c.key] = [...S[c.ci]]; }); localStorage.setItem(KEY, JSON.stringify({ v: 1, s })); } catch (e) {} };
  const snap = () => { undo.push(S.map(x => new Set(x))); if (undo.length > 50) undo.shift(); };

  // ── 포인트 ──
  const nodeCost = (c, n) => c.main ? { m: 1, s: n.extra || 0 } : { m: 0, s: 1 + (n.extra || 0) };
  function used() {
    let m = 0, s = 0;
    CS.forEach(c => S[c.ci].forEach(id => { const k = nodeCost(c, c.by.get(id)); m += k.m; s += k.s; }));
    return { m, s };
  }
  const on = (c, id) => id === c.start || S[c.ci].has(id);

  // 아직 안 찍힌 노드까지 가는 가장 짧은 길(부모 쪽으로 거슬러 찍힌 노드를 만날 때까지) — 찍을 노드 목록
  function pathTo(c, id) {
    const prev = new Map([[id, null]]), q = [id];
    while (q.length) {
      const v = q.shift();
      if (on(c, v)) { const out = []; let u = prev.get(v); while (u) { out.push(u); u = prev.get(u); } return v === id ? [] : out; }
      for (const p of c.par.get(v) || []) if (!prev.has(p)) { prev.set(p, v); q.push(p); }
    }
    return null;
  }
  // 끊긴 가지 정리 — 찍힌 부모가 하나도 없는 노드를 시작 노드에서 닿을 때까지 거듭 뺀다
  function prune(c) {
    const set = S[c.ci], ok = new Set([c.start]), q = [c.start];
    while (q.length) { const v = q.shift(); for (const k of c.kids.get(v) || []) if (set.has(k) && !ok.has(k)) { ok.add(k); q.push(k); } }
    [...set].forEach(id => { if (!ok.has(id)) set.delete(id); });
  }
  function toggle(c, id) {
    if (id === c.start) return;
    const set = S[c.ci];
    if (set.has(id)) { snap(); set.delete(id); prune(c); }
    else {
      const p = pathTo(c, id);
      if (!p) return;
      const add = [...new Set([id, ...p])].filter(x => x !== c.start);   // p 는 목표 노드까지 포함
      const u = used(); let m = 0, s = 0;
      add.forEach(x => { const k = nodeCost(c, c.by.get(x)); m += k.m; s += k.s; });
      if (u.m + m > VOID.main) return toast(`메인 스타 재능이 부족합니다 (필요 ${m} · 남음 ${VOID.main - u.m})`);
      if (u.s + s > VOID.star) return toast(`스타 재능이 부족합니다 (필요 ${s} · 남음 ${VOID.star - u.s})`);
      snap(); add.forEach(x => set.add(x));
      if (add.some(x => NOPRE.test(nodeText(c.by.get(x))))) toast('⚠ 「이전 노드를 우선 활성화하지 않음」 효과는 시뮬레이터에 적용하지 않습니다');
    }
    save(); render();
  }
  const nodeText = n => (n.map || []).concat(n.fn || []).join('\n');

  // ── 효과 합계 — 같은 문구는 숫자를 더하고(숫자 1개·'추가/별도' 아닐 때), 아니면 같은 줄끼리 ×n ──
  function summary(only) {
    const g = new Map();
    CS.forEach(c => {
      if (only != null && c.ci !== only) return;
      S[c.ci].forEach(id => {
        const n = c.by.get(id);
        (n.map || []).concat(n.fn || []).forEach(line => {
          const nums = line.match(/[+\-]?\d+(?:\.\d+)?/g) || [];
          // '추가'·'별도' 수치는 곱연산이라 더하지 않고 같은 줄끼리 ×n 으로만 묶는다
          const add = nums.length === 1 && !/추가|별도/.test(line);
          const tpl = add ? line.replace(/[+\-]?\d+(?:\.\d+)?/, '\u0000') : line;
          const e = g.get(tpl) || { tpl, v: 0, k: 0, sign: /^[+\-]/.test(nums[0] || '') };
          if (add) e.v += parseFloat(nums[0]);
          e.k++; e.nopre = NOPRE.test(line); g.set(tpl, e);
        });
      });
    });
    return [...g.values()].map(e => {
      if (!e.tpl.includes('\u0000')) return { t: e.tpl, k: e.k, nopre: e.nopre, x: e.k > 1 };
      const v = Math.round(e.v * 100) / 100;
      return { t: e.tpl.replace('\u0000', (e.sign && v >= 0 ? '+' : '') + v), k: e.k, nopre: e.nopre };
    });
  }

  // ── 공유 코드: [판 1] + 별무리마다 (key, 개수, id 끝자리 차이…) varint → base64url ──
  function encode() {
    const b = [1], vi = n => { while (n > 127) { b.push((n & 127) | 128); n >>>= 7; } b.push(n); };
    CS.forEach(c => {
      const ids = [...S[c.ci]].map(id => +id - +c.start).sort((a, z) => a - z);
      if (!ids.length) return;
      vi(c.key); vi(ids.length); let p = 0; ids.forEach(x => { vi(x - p); p = x; });
    });
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    const s = atob(code.replace(/-/g, '+').replace(/_/g, '/')), b = [...s].map(ch => ch.charCodeAt(0));
    let i = 0; const vi = () => { let n = 0, sh = 0, x; do { x = b[i++]; if (x == null) throw 0; n |= (x & 127) << sh; sh += 7; } while (x & 128); return n; };
    if (vi() !== 1) throw 0;
    const out = CS.map(() => new Set());
    while (i < b.length) {
      const c = BYKEY.get(vi()), k = vi(); let p = 0;
      for (let j = 0; j < k; j++) { p += vi(); if (c) { const id = String(+c.start + p); if (c.by.has(id) && id !== c.start) out[c.ci].add(id); } }
    }
    out.forEach((set, ci) => { const keep = S[ci]; S[ci] = set; prune(CS[ci]); S[ci] = keep; });
    return out;
  }

  // ── 그리기 ──
  let msgT;
  function toast(t) {
    let el = document.getElementById('vcToast');
    if (!el) { el = document.createElement('div'); el.id = 'vcToast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), 2600);
  }
  function pointsBar() {
    const u = used();
    const chip = (lb, a, b, cls) => `<span class="vc-pt ${cls}${a > b ? ' over' : ''}"><small>${lb}</small><b>${a}</b><i>/ ${b}</i></span>`;
    return chip('스타 재능', u.s, VOID.star, 's') + chip('메인 스타 재능', u.m, VOID.main, 'm');
  }
  function top() {
    return `<div class="vc-top">
      <div class="vc-ttl"><b>허공의 성도</b><small>재능 별무리 시뮬레이터</small></div>
      <div class="vc-pts">${pointsBar()}</div>
      <div class="vc-acts">
        <button class="vc-btn" data-act="undo"${undo.length ? '' : ' disabled'}>↶ 되돌리기</button>
        <button class="vc-btn" data-act="reset">↺ 처음부터</button>
        <button class="vc-btn vc-share" data-act="share">🔗 링크 복사</button>
      </div></div>`;
  }
  function sumBox(only) {
    const rows = summary(only);
    const body = rows.length ? rows.map(r => `<li${r.nopre ? ' class="nopre"' : ''}>${hl(r.t).replace(/\n/g, '<br>')}${r.x ? ` <span class="vc-x">×${r.k}</span>` : ''}${r.nopre ? '<em>⚠ 시뮬레이터 미적용</em>' : ''}</li>`).join('')
      : '<li class="vc-empty">찍은 노드가 없습니다</li>';
    return `<div class="vc-sum"><div class="vc-cap">${only != null ? '이 별무리 효과' : '전체 효과 합계'}</div><ul>${body}</ul></div>`;
  }
  function listView() {
    const cards = CS.map(c => {
      const k = S[c.ci].size;
      return `<button class="vc-card${k ? ' used' : ''}${c.main ? ' main' : ''}" data-open="${c.ci}">
        <img src="${ICON + c.icon}" alt="" loading="lazy">
        <span class="vc-cn"><b>${esc(c.name)}</b>${c.unlock ? `<small>${esc(c.unlock)}</small>` : ''}</span>
        <span class="vc-cu"><b>${k}</b>/${c.n}${c.main ? '<em>메인</em>' : ''}<i style="--p:${Math.round(100 * k / Math.max(1, c.n))}%"></i></span>
      </button>`;
    }).join('');
    return top() + `<div class="vc-wrap"><div class="vc-grid">${cards}</div>${sumBox(null)}</div>
      <p class="vc-note">노드 1개 = 스타 재능 1 (시작 노드는 무료) · 그윽한 재능 별무리는 메인 스타 재능 ${VOID.main}포인트로만 찍습니다 · 최대 포인트는 tlidb 기준(스타 재능 ${VOID.star})이며 바뀔 수 있습니다.</p>`;
  }
  function nodeView(c) {
    const set = S[c.ci], [x0, y0, w, h] = c.box;
    const lines = c.links.map(([a, b]) => {
      const A = c.by.get(a), B = c.by.get(b), lit = on(c, a) && on(c, b);
      return `<line class="${lit ? 'on' : ''}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }).join('');
    const nodes = c.nodes.map(n => {
      const st = n.id === c.start ? 'start' : set.has(n.id) ? 'on' : (c.par.get(n.id) || []).some(p => on(c, p)) ? 'next' : 'off';
      const r = n.r;
      return `<g class="vc-n ${st}${n.extra ? ' extra' : ''}${NOPRE.test(nodeText(n)) ? ' nopre' : ''}" data-id="${n.id}" transform="translate(${n.x} ${n.y})">
        <circle class="ring" r="${r + 7}"/><image href="${ICON + n.icon}" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}"/></g>`;
    }).join('');
    const k = set.size;
    return top() + `<div class="vc-head">
        <button class="vc-btn" data-act="back">← 목록</button>
        <img src="${ICON + c.icon}" alt=""><b>${esc(c.name)}</b>
        <span class="vc-cnt">${k} / ${c.n}${c.main ? ' · 메인 스타 재능' : ''}</span>
        <button class="vc-btn" data-act="clear"${k ? '' : ' disabled'}>이 별무리 비우기</button>
        <span class="vc-hint">노드를 누르면 시작 노드까지 길이 함께 찍히고, 찍힌 노드를 누르거나 우클릭하면 그 아래 가지까지 빠집니다</span>
      </div>
      <div class="vc-wrap vc-tree-wrap">
        <div class="vc-tree"><svg viewBox="${x0} ${y0} ${w} ${h}" preserveAspectRatio="xMidYMid meet"><g class="vc-l">${lines}</g>${nodes}</svg><div class="vc-tip" id="vcTip"></div></div>
        <div class="vc-side"><div class="vc-info" id="vcInfo"><div class="vc-empty">노드에 마우스를 올리거나 누르면 효과가 보입니다</div></div>${sumBox(c.ci)}</div>
      </div>`;
  }
  function info(c, n) {
    const k = nodeCost(c, n);
    const cost = n.id === c.start ? '시작 노드 · 무료' : (c.main ? `메인 스타 재능 ${k.m}` + (k.s ? ` + 스타 재능 ${k.s}` : '') : `스타 재능 ${k.s}`);
    const L = a => (a || []).map(l => `<div${NOPRE.test(l) ? ' class="nopre"' : ''}>${hl(l).replace(/\n/g, '<br>')}</div>`).join('');
    return `<div class="vc-ik"><b>${esc(n.kind)}</b><small>${cost}</small></div>${L(n.map)}${n.fn ? `<div class="vc-fn">${L(n.fn)}</div>` : ''}` +
      (NOPRE.test(nodeText(n)) ? '<div class="vc-warn">⚠ 이 노드의 「이전 노드를 우선 활성화하지 않음」 효과는 시뮬레이터에 적용하지 않습니다 (찍기 규칙은 그대로)</div>' : '');
  }
  function render() {
    app.innerHTML = view < 0 ? listView() : nodeView(CS[view]);
  }

  // ── 이벤트 ──
  app.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-act],.vc-n');
    if (!t) return;
    if (t.dataset.open != null) { view = +t.dataset.open; history.replaceState(null, '', '#' + CS[view].page); render(); window.scrollTo(0, 0); return; }
    if (t.classList.contains('vc-n')) { const c = CS[view]; toggle(c, t.dataset.id); showInfo(c, c.by.get(t.dataset.id)); return; }
    const a = t.dataset.act;
    if (a === 'back') { view = -1; history.replaceState(null, '', location.pathname + location.search); render(); }
    else if (a === 'undo' && undo.length) { S = undo.pop(); save(); render(); }
    else if (a === 'reset') { if (!S.some(x => x.size) || confirm('찍은 노드를 모두 지울까요?')) { snap(); S = CS.map(() => new Set()); save(); render(); } }
    else if (a === 'clear') { snap(); S[view] = new Set(); save(); render(); }
    else if (a === 'share') {
      if (!S.some(x => x.size)) return toast('찍은 노드가 없습니다');
      const u = location.origin + location.pathname + '?c=' + encode();
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('공유 링크를 복사했습니다'), () => prompt('공유 링크', u));
      if (window.wtEv) window.wtEv('void_share');
    }
  });
  // 우클릭 = 포인트 빼기(찍힌 노드와 그 아래 가지) — 노드 화면에선 브라우저 메뉴를 막는다 (2026-10-16)
  app.addEventListener('contextmenu', e => {
    if (view < 0 || !e.target.closest('.vc-tree')) return;
    e.preventDefault();
    const g = e.target.closest('.vc-n'); if (!g) return;
    const c = CS[view], id = g.dataset.id;
    if (S[c.ci].has(id)) { toggle(c, id); showInfo(c, c.by.get(id)); }
  });
  // 빠르게 여러 번 누를 때 글자·그림이 선택(드래그)되지 않게
  app.addEventListener('mousedown', e => { if (e.detail > 1 && e.target.closest('.vc-tree, .vc-card')) e.preventDefault(); });
  app.addEventListener('dragstart', e => { if (e.target.closest('.vc-tree')) e.preventDefault(); });
  function showInfo(c, n) { const el = document.getElementById('vcInfo'); if (el && n) el.innerHTML = info(c, n); }
  app.addEventListener('mouseover', e => {
    const g = e.target.closest('.vc-n'); if (!g || view < 0) return;
    const c = CS[view]; showInfo(c, c.by.get(g.dataset.id));
    const tip = document.getElementById('vcTip'), box = tip && tip.parentElement.getBoundingClientRect(), r = g.getBoundingClientRect();
    if (!tip) return;
    tip.innerHTML = info(c, c.by.get(g.dataset.id)); tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.right - box.left + 8, y = r.top - box.top - 4;
    if (x + tw > box.width) x = r.left - box.left - tw - 8;
    if (y + th > box.height) y = Math.max(0, box.height - th);
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = y + 'px';
  });
  app.addEventListener('mouseout', e => { if (e.target.closest('.vc-n')) { const tip = document.getElementById('vcTip'); if (tip) tip.classList.remove('on'); } });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undo.length) { e.preventDefault(); S = undo.pop(); save(); render(); }
    else if (e.key === 'Escape' && view >= 0) { view = -1; history.replaceState(null, '', location.pathname); render(); }
  });

  // ── 시작: 저장본 → 공유 링크(?c=) → 주소의 #별무리 ──
  load();
  const q = new URLSearchParams(location.search).get('c');
  if (q) {
    try {
      const got = decode(q);
      const same = got.every((s, i) => s.size === S[i].size && [...s].every(x => S[i].has(x)));
      if (same || !S.some(x => x.size) || confirm('공유받은 허공의 성도 배치를 불러올까요?\n지금 찍어 둔 배치는 덮어씁니다.')) { S = got; save(); }
    } catch (e) { toast('공유 링크를 읽지 못했습니다'); }
    history.replaceState(null, '', location.pathname + location.hash);
  }
  const hp = decodeURIComponent(location.hash.slice(1));
  if (hp) { const c = CS.find(x => x.page === hp); if (c) view = c.ci; }
  render();
})();
