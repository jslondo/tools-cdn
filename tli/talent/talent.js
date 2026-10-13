// 생성물 — 고칠 땐 update/src/js/00_talent.js · update/src/page_common.js · update/src/talent_glue.js · update/src/talent_page.js (build_html2.build_tool_pages)
// ── 재능 보드 시뮬레이터 공용 조각 (2026-10-08) ──
// 빌더(묶음 맨 앞)와 따로 떨어진 재능 화면(/tli/talent, tli/talent/talent.js)이 함께 쓴다.
// 기대하는 바깥 것: BOARDS · BOARD_IDS · boardTier · boardNodeText · preset · persistPreset · renderPreset ·
//   guardShareView · escapeHtml (빌더는 01_core·03_editor 에 있고, 재능 화면은 talent_page.js 가 데이터에서 채운다)
// 재능 줄 분류 — 0 = 핵심 재능, 1 = 신격의 석판, 2 = 운명
function talGroup(type) {
  if ((type || '').startsWith('운명')) return 2;
  if ((type || '').includes('신격의 석판')) return 1;
  return 0;
}
let gbOpen = localStorage.getItem('tlidb_gb_open') !== '0'; // 재능 보드 접기 상태 (기본 펼침)
function toggleBoardPanel() {
  gbOpen = !gbOpen;
  localStorage.setItem('tlidb_gb_open', gbOpen ? '1' : '0');
  renderTalentBoard();
}
// 재능 노드·프리즘 수치는 찍은 포인트에 비례한다 (게임 툴팁 기준: 크리 +15% 노드에 3포인트 = +45%,
// 프리즘 "MP 봉인 보상 +2%"도 그 노드 3포인트면 +6%) → 문구의 모든 수치를 포인트만큼 곱해 보여준다.
// "(신격 유효 한도: 1)" 같은 괄호 문구는 배수 대상이 아니라 따로 떼어 둔다.
function scaleEffect(text, n) {
  if (!(n > 0) || n === 1) return text;
  const holds = [];
  const body = String(text).replace(/\((?:신격 유효 한도|유효 한도|최대치)[^)]*\)/g, m => { holds.push(m); return '\u0000' + (holds.length - 1) + '\u0000'; });
  const out = body.replace(/([+-]?)(\d+(?:\.\d+)?)/g, (mm, sign, num) => {
    // 게임은 반올림 적용 (예: 냉기 대미지 +14% → 전염 -50% → 7%, 스킬 레벨 +1 → 0.5 → 1)
    const raw = parseFloat(num) * n;
    const v = num.indexOf('.') < 0 ? Math.round(raw) : Math.round(raw * 100) / 100;
    return (sign || '') + v;
  });
  return out.replace(/\u0000(\d+)\u0000/g, (mm, i) => holds[+i]);
}
// 프리즘 옵션: 범위 내 해당 등급 노드에 찍은 포인트 합만큼 곱한다
function prismMul(effect, n) {
  const nums = effect.match(/[+-]?\d+(?:\.\d+)?%?/g) || [];
  if (!nums.length) return '×' + n;
  return '×' + n + ' = ' + scaleEffect(effect, n);
}
// ── 재능 보드 직접 찍기 (시뮬레이터) ──
// 규칙(tlidb 판 숫자, 2026-10-08 수집): 노드 최대 포인트 = b.m (하위·중위 3, 레전드 중위 1)
//  · 열 해금: N번째 열은 그보다 왼쪽 열들에 쓴 포인트가 b.r[열 x] (= 0,3,6…18) 이상이어야 찍힌다
//  · 연결선: 왼쪽(앞) 노드에 3포인트(최대 1이면 1)를 넣어야 오른쪽(뒤) 노드를 찍는다
//  · 빼기: 오른쪽 열이나 이어진 뒤 노드가 기대고 있으면 못 뺀다
// 찍은 결과는 로그 가져오기와 같은 gboard 형식 [노드ID, 포인트, 행, 열, 플래그] 로 둔다 — 프리즘·역상 범위
// 계산(행·열 기준)이 손으로 찍은 노드에도 그대로 먹게 하려는 것(다음 단계에서 프리즘·역상 배치를 붙인다).
const GB_BUDGET = 115;   // 총 재능 포인트(레벨업 + 핵심 퀘스트) — 커뮤니티 값, 넘어도 막지 않고 경고만
let gbModalOpen = false; // 찍기 팝업 (세션 한정)
let gbSlot = 0;           // 팝업에서 보고 있는 보드 칸(0~3)
function gbRefresh() { renderTalentBoard(); if (gbModalOpen) gbRenderModal(); }
const gbExtra = new Set(); // 포인트 없이 펼쳐 둔 계열 (세션 한정)
let gbMsg = '';
const GB_RULES = {};
function gbRules(pre) {
  if (GB_RULES[pre]) return GB_RULES[pre];
  const b = BOARDS[pre];
  const xs = [...new Set(b.p.map(q => q[0]))].sort((a, c) => a - c);
  const ys = [...new Set(b.p.map(q => q[1]))].sort((a, c) => a - c);
  const near = (ex, ey) => b.p.findIndex(([x, y]) => Math.abs(x - ex) + Math.abs(y - ey) <= 1);
  const conns = [];
  (b.l || []).forEach(([ax, ay, bx, by]) => {
    const i1 = near(ax, ay), i2 = near(bx, by);
    if (i1 < 0 || i2 < 0 || i1 === i2) return;
    conns.push(b.p[i1][0] < b.p[i2][0] ? [i1, i2] : [i2, i1]); // [앞, 뒤]
  });
  const col = b.p.map(q => xs.indexOf(q[0]));
  const max = b.p.map((q, i) => (b.m && b.m[i]) || ((b.t && b.t[i]) === 4 ? 1 : 3));
  const req = xs.map((x, c) => (b.r && b.r[x] != null) ? +b.r[x] : c * 3);
  return (GB_RULES[pre] = {xs, ys, conns, col, max, req, need: i => Math.min(3, max[i])});
}
// 이 계열에서 손으로 찍을 수 있는 노드(원래 자리)의 포인트 — 역상 반사본(플래그 1)은 제외
function gbPoints(pre) {
  const ids = BOARD_IDS[pre] || [], pts = ids.map(() => 0);
  (preset.gboard || []).forEach(e => {
    if (String(e[0]).slice(0, 2) !== pre || ((e[4] || 0) & 1)) return;
    const i = ids.indexOf(String(e[0]));
    if (i >= 0) pts[i] = Math.max(pts[i], e[1] || 0);
  });
  return pts;
}
// 프리즘·역상이 이 보드에 주는 영향 (TLIBuilder passive_tree.py 규칙 참고 — MIT, 실로그 08·09 로 좌표 확인)
//  · 장착 노드(앵커)는 효과가 없고 포인트를 못 넣는다 — 대신 그 노드에서 나가는 연결 조건은 채운 것으로 본다
//  · 역상: 앵커 둘레 3×3(보드 밖은 잘림)을 보드 가운데 기준 180° 반대편에 복사 — 복사 칸은 선행 조건 없이 찍고,
//    그 포인트도 열 해금·총 포인트에 들어간다. 원래 그 자리 노드는 가려져 못 찍는다 (그 노드의 연결 조건도 채운 것으로)
const gbRC = nid => [+String(nid).slice(4, 6), +String(nid).slice(2, 4)]; // 노드 ID → [행, 열] (1부터 — ID 3~6자리 = 열·행)
function gbCtx(pre) {
  const ids = BOARD_IDS[pre] || [], R = gbRules(pre), RM = R.ys.length + 1, CM = R.xs.length + 1;
  const at = {}; ids.forEach((nid, i) => { const [r, c] = gbRC(nid); at[r + ',' + c] = i; });
  const ctx = {at, broken: new Set(), off: new Set(), mirror: {}, extra: R.xs.map(() => 0), mpts: {}, RM, CM};
  [preset.gbPrism, preset.gbPrism2].forEach(g => {
    if (!g || g.b !== pre) return;
    const ai = ids.indexOf(String(g.nd));
    if (ai >= 0) { ctx.broken.add(ai); ctx.off.add(ai); }
    if (g.k !== 'i') return;
    (g.c || []).forEach(([r, c]) => {
      const si = at[r + ',' + c]; if (si === undefined) return;
      const mk = (RM - r) + ',' + (CM - c);
      ctx.mirror[mk] = si; // 이 칸에는 si 노드의 복사본
      const hid = at[mk]; if (hid !== undefined) { ctx.off.add(hid); ctx.broken.add(hid); }
    });
  });
  (preset.gboard || []).forEach(e => {
    if (String(e[0]).slice(0, 2) !== pre || !((e[4] || 0) & 1)) return;
    const k = e[2] + ',' + e[3];
    if (ctx.mirror[k] === undefined) return;
    ctx.mpts[k] = e[1] || 0; ctx.extra[e[3] - 1] += e[1] || 0;
  });
  return ctx;
}
// 찍기·빼기가 되는지 — 안 되면 이유 문자열, 되면 ''
function gbWhyNot(pre, i, d, pts, ctx) {
  const R = gbRules(pre); ctx = ctx || gbCtx(pre);
  const before = c => pts.reduce((s, v, k) => s + (R.col[k] < c ? v : 0), 0) + ctx.extra.reduce((s, v, k) => s + (k < c ? v : 0), 0);
  if (d > 0) {
    if (ctx.off.has(i)) return ctx.broken.has(i) && [preset.gbPrism, preset.gbPrism2].some(g => g && g.b === pre && (BOARD_IDS[pre] || [])[i] === String(g.nd))
      ? '프리즘·역상을 놓은 칸에는 포인트를 넣을 수 없습니다' : '역상 복사본에 가려진 칸입니다';
    if (pts[i] >= R.max[i]) return '이미 최대(' + R.max[i] + '포인트)입니다';
    const c = R.col[i];
    if (before(c) < R.req[c]) return '「' + R.req[c] + '」 열 잠김 — 왼쪽 열에 ' + R.req[c] + '포인트가 필요합니다(지금 ' + before(c) + ')';
    for (const [a, z] of R.conns) {
      if (z === i && !ctx.broken.has(a) && pts[a] < R.need(a)) return '이어진 앞 노드에 ' + R.need(a) + '포인트를 먼저 넣어야 합니다(지금 ' + pts[a] + ')';
    }
    return '';
  }
  if (!(pts[i] > 0)) return '';
  return gbWhyNotOut(pre, R.col[i], pts, ctx) || (pts[i] - 1 < R.need(i) && !ctx.broken.has(i) && R.conns.some(([a, z]) => a === i && pts[z] > 0 && !ctx.off.has(z))
    ? '이어진 뒤 노드가 이 노드에 기대고 있어 뺄 수 없습니다' : '');
}
function gbWhyNotOut(pre, col, pts, ctx) { // col 열에서 1포인트 빼면 오른쪽 열이 잠기나
  const R = gbRules(pre);
  const before = c => pts.reduce((s, v, k) => s + (R.col[k] < c ? v : 0), 0) + ctx.extra.reduce((s, v, k) => s + (k < c ? v : 0), 0);
  for (let c = col + 1; c < R.xs.length; c++) {
    const used = pts.some((v, k) => v > 0 && R.col[k] === c) || ctx.extra[c] > 0;
    if (used && before(c) - 1 < R.req[c]) return '「' + R.req[c] + '」 열에 찍은 노드가 있어 뺄 수 없습니다(왼쪽에 ' + R.req[c] + '포인트 필요)';
  }
  return '';
}
function gbWhyNotM(pre, k, d, pts, ctx) { // 역상 복사 칸(k = "행,열")
  const R = gbRules(pre), si = ctx.mirror[k], cur = ctx.mpts[k] || 0, col = +k.split(',')[1] - 1;
  if (si === undefined) return '복사 칸이 아닙니다';
  const before = c => pts.reduce((s, v, kk) => s + (R.col[kk] < c ? v : 0), 0) + ctx.extra.reduce((s, v, kk) => s + (kk < c ? v : 0), 0);
  if (d > 0) {
    if (cur >= R.max[si]) return '이미 최대(' + R.max[si] + '포인트)입니다';
    if (before(col) < R.req[col]) return '「' + R.req[col] + '」 열 잠김 — 왼쪽 열에 ' + R.req[col] + '포인트가 필요합니다(지금 ' + before(col) + ')';
    return '';
  }
  return cur > 0 ? gbWhyNotOut(pre, col, pts, ctx) : '';
}
function gbBump(pre, i, d) {
  if (guardShareView()) return;
  const ids = BOARD_IDS[pre] || [], nid = ids[i], R = gbRules(pre);
  if (!nid) return;
  const why = gbWhyNot(pre, i, d, gbPoints(pre));
  if (why) { gbMsg = '⚠ ' + why; gbRefresh(); return; }
  if (d < 0 && !(gbPoints(pre)[i] > 0)) return;
  preset.gboard = preset.gboard || [];
  const k = preset.gboard.findIndex(e => String(e[0]) === nid && !((e[4] || 0) & 1));
  const row = R.ys.indexOf(BOARDS[pre].p[i][1]) + 1, col = R.col[i] + 1;
  if (k < 0) preset.gboard.push([nid, 1, row, col, 0]);
  else {
    const e = preset.gboard[k];
    e[1] = (e[1] || 0) + d;
    if (e[1] <= 0) preset.gboard.splice(k, 1);
  }
  gbSaved();
}
function gbBumpM(pre, row, col, d) { // 역상 복사 칸 찍기 — 로그와 같은 [원본 노드ID, 포인트, 행, 열, 1(반사)|4(선행 없음)]
  if (guardShareView()) return;
  const ctx = gbCtx(pre), k = row + ',' + col, si = ctx.mirror[k];
  if (si === undefined) return;
  const why = gbWhyNotM(pre, k, d, gbPoints(pre), ctx);
  if (why) { gbMsg = '⚠ ' + why; gbRefresh(); return; }
  preset.gboard = preset.gboard || [];
  const x = preset.gboard.findIndex(e => String(e[0]).slice(0, 2) === pre && ((e[4] || 0) & 1) && e[2] === row && e[3] === col);
  if (x < 0) { if (d > 0) preset.gboard.push([BOARD_IDS[pre][si], 1, row, col, 5]); }
  else { const e = preset.gboard[x]; e[1] = (e[1] || 0) + d; if (e[1] <= 0) preset.gboard.splice(x, 1); }
  gbSaved();
}
function gbSaved() {
  if (preset.gboard && !preset.gboard.length) delete preset.gboard;
  gbMsg = '';
  persistPreset();
  renderPreset(); // 옵션 모아보기·계산이 보드 노드를 합산하므로 전체를 다시 그린다
  if (gbModalOpen) gbRenderModal();
}
// "…기존 재능으로 교체되지 않고 … 핵심 재능 추가: [X]" 옵션의 X 추출 (추가형이 아니면 null)
// 일부 옵션(전술의 대가)은 대괄호 없이 "추가: 전술의 대가 …" 형태라 재능명 접두 매칭으로 보완
function prismAddName(effect) {
  const m = (effect || '').match(/교체되지 않고[\s\S]*핵심 재능 추가:\s*/);
  if (!m) return null;
  const rest = effect.slice(m.index + m[0].length);
  const bm = rest.match(/^\[([^\]]+)\]/);
  if (bm) return bm[1];
  for (const it of PRISM.items) {
    if (it.talent && rest.startsWith(it.talent)) return it.talent;
  }
  return rest.split(' ')[0] || null; // 알 수 없는 형태 폴백: 첫 단어
}
// ── 핵심 재능 (2026-10-08) — 보드마다 BOARDS[pre].k = [[필요 포인트, [tid…]]…] (tlidb 판 'Npts 0/1', 시즌 수집기가 모음)
// 신 보드 12pt·24pt 묶음에서 하나씩, 하위 보드 24pt 묶음에서 하나 → 핵심 재능 1~5번 칸. 저장은 빌더와 같은 재능 목록 줄
// {k: "효과␟재능␟계열", effect, type: 계열} — 그래서 옵션 모아보기·계산·공유 코드·로그 가져오기가 그대로 먹는다
function gbCoreRow(tid) { // 빌더는 전체 행(ALL_DATA), 단독 화면은 생성기가 뽑아 둔 TALENT_CORE
  if (typeof TALENT_CORE !== 'undefined') { const r = TALENT_CORE[tid]; return r ? {category: '재능', effect: r[0], source: '재능', type: r[1], tid, tips: r[2]} : null; }
  const i = typeof TALIDX !== 'undefined' ? TALIDX.idx[tid] : undefined;
  return i === undefined ? null : ALL_DATA[i];
}
const gbCoreKey = r => r.effect + '\u001f' + r.source + '\u001f' + r.type;
const gbCoreName = r => ((/^\[([^\]]+)\]/.exec(r.effect) || [])[1]) || r.effect;
function gbBoardPts(pre) { return (preset.gboard || []).reduce((t, x) => t + (String(x[0]).slice(0, 2) === pre ? x[1] || 0 : 0), 0); }
function gbCorePicked(pre, gi) { // 이 묶음에서 고른 tid (없으면 null)
  const g = (BOARDS[pre].k || [])[gi]; if (!g) return null;
  const keys = new Set((preset.talents || []).filter(t => talGroup(t.type) === 0).map(t => t.k));
  return g[1].find(tid => { const r = gbCoreRow(tid); return r && keys.has(gbCoreKey(r)); }) || null;
}
function gbCoreSet(pre, gi, tid) {
  if (guardShareView()) return;
  const g = (BOARDS[pre].k || [])[gi]; if (!g) return;
  const r = gbCoreRow(tid); if (!r) return;
  const cur = gbCorePicked(pre, gi);
  if (cur !== tid && gbBoardPts(pre) < g[0]) { gbMsg = '⚠ ' + BOARDS[pre].n + ' 보드에 ' + g[0] + '포인트를 넣어야 고를 수 있습니다 (지금 ' + gbBoardPts(pre) + ')'; gbRenderModal(); return; }
  const drop = new Set(g[1].map(x => { const rr = gbCoreRow(x); return rr ? gbCoreKey(rr) : ''; }));
  preset.talents = (preset.talents || []).filter(t => !(talGroup(t.type) === 0 && drop.has(t.k)));
  if (cur !== tid) preset.talents.push({k: gbCoreKey(r), effect: r.effect, type: r.type}); // 다시 누르면 빼기
  gbCoreSort();
  gbSaved();
}
function gbCoreSort() { // 핵심 재능 줄 순서 = 보드 칸 순서 · 묶음 순서 (= 게임의 핵심 재능 1~5번 칸, 프리즘 pos 와 같은 기준)
  const s4 = gbSlots4(), name2slot = {}, rank = {};
  s4.forEach((p, i) => { if (p) { name2slot[BOARDS[p].n] = i; (BOARDS[p].k || []).forEach((g, gi) => g[1].forEach(tid => { const r = gbCoreRow(tid); if (r) rank[gbCoreKey(r)] = i * 10 + gi; })); } });
  const cores = preset.talents.filter(t => talGroup(t.type) === 0), rest = preset.talents.filter(t => talGroup(t.type) !== 0);
  cores.sort((a, b) => (rank[a.k] ?? 99) - (rank[b.k] ?? 99));
  preset.talents = cores.concat(rest);
}
const GB_CORE_ICON = 'https://cdn.tlidb.com/UI/Textures/Common/Icon/Skill/CoreTalentIcon/128/';
const gbCoreIcon = (pre, tid) => ((BOARDS[pre] || {}).ki || {})[tid] ? GB_CORE_ICON + BOARDS[pre].ki[tid] : '';
const gbCoreBody = r => r.effect.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\(신격 유효 한도: \d+\)\s*$/, '');
let gbCorePop = null; // 고르기 팝업 {pre, gi}
// 프리즘의 핵심 재능 (2026-10-09) — 교체형 프리즘(it.talent)은 놓인 보드의 핵심 재능을 그 재능으로 바꾼다.
// 3번 옵션이 "교체되지 않고 … 핵심 재능 추가" 면 원래 재능은 그대로 두고 하나를 더한다 (빌더 05_ui 의 → 표기와 같은 규칙)
function gbCorePrism(pre) {
  const g = gbpOf('p'), pr = preset.prism;
  if (!g || g.b !== pre || !pr) return null;
  const it = PRISM.items.find(x => x.name === pr.name);
  if (!it || !it.talent) return null;
  const add = (pr.opts || []).some(o => o && prismAddName(o.effect));
  const desc = ((it.tips || []).find(x => x[0] === it.talent) || [])[1] || '';
  return {it, add, desc};
}
function gbCorePzHtml(pz, need, open, orig, add) { // 프리즘 재능 동그라미 안쪽 + 툴팁
  const tip = '<div class="ft-title">핵심 재능 · ' + need + 'pt · ' + (add ? '프리즘이 더함' : '프리즘으로 교체') + '</div><div class="ft-body">' +
    '<div class="gb-tmain">' + escapeHtml(pz.it.talent) + '</div>' + (pz.desc ? '<div class="gb-tsub">' + escapeHtml(pz.desc).replace(/\n/g, '<br>') + '</div>' : '') +
    '<div class="gb-tsub">' + escapeHtml(pz.it.name) + (add ? ' — 3번 옵션으로 원래 핵심 재능은 그대로 두고 하나 더' : '') + '</div>' +
    (!add && orig ? '<div class="gb-tno">고른 재능 [' + escapeHtml(gbCoreName(orig)) + ']은 프리즘에 바뀌어 게임에서는 꺼짐</div>' : '') +
    (open ? '' : '<div class="gb-tno">포인트 부족 — 게임에서는 꺼짐</div>') + '</div>';
  return {tip, inner: pz.it.icon ? `<img src="${pz.it.icon}" alt="" onerror="this.outerHTML='<span>◆</span>'">` : '<span>◆</span>'};
}
function gbCoreSlots(pre) { // 보드 이름 옆 동그라미 — 묶음마다 하나 (신 보드 12·24pt, 하위 24pt). 누르면 팝업
  const pts = gbBoardPts(pre), groups = BOARDS[pre].k || [], pz = gbCorePrism(pre);
  return groups.map(([need], gi) => {
    const tid = gbCorePicked(pre, gi), r = tid && gbCoreRow(tid), open = pts >= need, ic = tid ? gbCoreIcon(pre, tid) : '';
    if (pz && gi === groups.length - 1) { // 프리즘이 놓인 보드의 핵심 재능 칸 (하위 보드는 묶음 하나)
      const p = gbCorePzHtml(pz, need, open, r, pz.add), h = s => escapeHtml(s).replace(/"/g, '&quot;');
      if (!pz.add) return `<button type="button" class="gbm-cslot pz tip2${open ? '' : ' lock'}" onclick="gbCoreOpen('${pre}', ${gi})" data-h="${h(p.tip)}">${p.inner}</button>`;
      const own = gbCoreSlotBtn(pre, gi, need, tid, r, open, ic);
      return own + `<span class="gbm-cslot pz add tip2${open ? '' : ' lock'}" data-h="${h(p.tip)}">${p.inner}</span>`;
    }
    return gbCoreSlotBtn(pre, gi, need, tid, r, open, ic);
  }).join('');
}
function gbCoreSlotBtn(pre, gi, need, tid, r, open, ic) {
  const pts = gbBoardPts(pre);
  const tip = '<div class="ft-title">핵심 재능 · ' + need + 'pt</div><div class="ft-body">' + (r
    ? '<div class="gb-tmain">' + escapeHtml(gbCoreName(r)) + '</div><div class="gb-tsub">' + escapeHtml(gbCoreBody(r)) + '</div>' + (open ? '' : '<div class="gb-tno">포인트 부족 — 게임에서는 꺼짐</div>')
    : open ? '<div class="gb-tsub">눌러서 고르기</div>' : '<div class="gb-tno">이 보드에 ' + need + '포인트를 넣으면 열립니다 (지금 ' + pts + ') · 눌러서 미리 보기</div>') + '</div>';
  return `<button type="button" class="gbm-cslot tip2${r ? ' have' : ''}${open ? '' : ' lock'}" onclick="gbCoreOpen('${pre}', ${gi})" data-h="${escapeHtml(tip).replace(/"/g, '&quot;')}">` +
    (r ? (ic ? `<img src="${ic}" alt="" onerror="this.outerHTML='<span>${escapeHtml(gbCoreName(r).slice(0, 2)).replace(/'/g, '')}</span>'">` : `<span>${escapeHtml(gbCoreName(r).slice(0, 2))}</span>`) : `<span>${need}</span>`) + '</button>';
}
// 포인트가 모자란 묶음도 열어서 선택지를 미리 보여 준다 — 고르기만 막는다 (사용자 2026-10-09)
const gbCoreLocked = (pre, gi) => !gbCorePicked(pre, gi) && gbBoardPts(pre) < ((BOARDS[pre].k || [])[gi] || [])[0];
function gbCoreOpen(pre, gi) { gbCorePop = {pre, gi}; gbRenderModal(); }
function gbCorePick(tid) {
  const p = gbCorePop; if (!p) return;
  if (gbCoreLocked(p.pre, p.gi)) return; // 미리 보기 — 포인트를 채우면 고를 수 있다
  gbCorePop = null;
  gbCoreSet(p.pre, p.gi, tid); // 고른 걸 다시 누르면 빼기
}
function gbCorePopup() {
  const {pre, gi} = gbCorePop, [need, tids] = BOARDS[pre].k[gi], cur = gbCorePicked(pre, gi), lock = gbCoreLocked(pre, gi);
  return `<div class="gbz-h"><b>핵심 재능</b><small>${escapeHtml(BOARDS[pre].n)} · ${need}pt 묶음에서 하나 — ${lock ? '' : '고른 걸 다시 누르면 뺍니다'}</small><button class="gbz-x" onclick="gbCorePop=null;gbRenderModal()">✕</button></div>` +
    (lock ? `<div class="gbz-lock">🔒 미리 보기 — 이 보드에 <b>${need}포인트</b>를 넣으면 고를 수 있습니다 (지금 ${gbBoardPts(pre)})</div>` : '') +
    '<div class="gbz-list">' + tids.map(tid => {
      const r = gbCoreRow(tid); if (!r) return '';
      const ic = gbCoreIcon(pre, tid);
      return `<div class="gbz-row gbz-core${cur === tid ? ' on' : ''}${lock ? ' lock' : ''}" onclick="gbCorePick('${tid}')">${ic ? `<img src="${ic}" alt="" loading="lazy">` : ''}<div><b>${escapeHtml(gbCoreName(r))}</b><small>${r.tips && Array.isArray(r.tips[0]) && typeof r.tips[0][1] === 'string' ? tipWrapEffect(gbCoreBody(r), r.tips) : escapeHtml(gbCoreBody(r))}</small></div></div>`;
    }).join('') + '</div>';
}
// ── 프리즘·역상 배치 (빌더 2 재능 단계 · /tli/talent — 2026-10-08) ──
// 저장은 로그 가져오기와 같은 모양: preset.prism(종류·옵션 3칸·pos) + preset.gbPrism/gbPrism2 {b 보드, c 범위 칸 [행,열], nd 장착 노드, k 'p'|'i', iv 역상 비율}
// 규칙: 신 보드(1번 칸)에는 못 놓는다 · 프리즘·역상 각각 빌드에 하나 · 둘은 다른 보드 · 역상은 가운데 3×3 에 못 놓는다
// pos(핵심 재능 몇 번째 칸) = 보드 칸 + 2 (신 보드가 핵심 재능 1·2번 — 로그 08 실측: 2번 칸 보드 = 3)
const GB_INV = [['low', '하위', -100, 200], ['mid', '중위', -100, 100], ['leg', '레전드 중위', -100, 50]]; // 반사 후 재능 효과 % 범위
let gbPlace = null;   // 놓기 모드 'p' | 'i'
let gbPzEd = null;    // 편집 팝업 {k, stage, item, opts, iv, q}
let gbInvPending = null; // 아직 안 놓은 역상의 비율 (놓을 때 쓴다)
function gbpOf(k) { return [preset.gbPrism, preset.gbPrism2].find(g => g && (g.k === 'i') === (k === 'i')) || null; }
function gbpSet(k, v) {
  const keep = [preset.gbPrism, preset.gbPrism2].filter(g => g && (g.k === 'i') !== (k === 'i'));
  if (v) keep.push(v);
  delete preset.gbPrism; delete preset.gbPrism2;
  if (keep[0]) preset.gbPrism = keep[0];
  if (keep[1]) preset.gbPrism2 = keep[1];
}
const GB_ORD = {'첫': 1, '두': 2, '세': 3, '네': 4, '다섯': 5, '여섯': 6, '일곱': 7};
function gbAreaShape(opts) { // 1번 옵션 "영향 범위가 W × H 직사각형까지 증가" + 툴팁의 "N 번째 행, M 번째 열"(장착 노드 자리)
  const o = (opts || []).find(x => x && /영향 범위가\s*(\d+)\s*×\s*(\d+)/.test(x.effect));
  if (!o) return null;
  const m = /영향 범위가\s*(\d+)\s*×\s*(\d+)/.exec(o.effect), w = +m[1], h = +m[2];
  const src = (typeof PRISM !== 'undefined' ? PRISM.opts : []).find(x => x.effect === o.effect) || o;
  const tip = ((src.tips || [])[0] || [])[1] || '';
  const t = /(첫|두|세|네|다섯|여섯|일곱)\s*번째\s*행,\s*(첫|두|세|네|다섯|여섯|일곱)\s*번째\s*열/.exec(tip);
  return {w, h, ar: t ? GB_ORD[t[1]] : Math.floor((h - 1) / 2) + 1, ac: t ? GB_ORD[t[2]] : Math.floor((w - 1) / 2) + 1};
}
function gbAreaCells(pre, r, c, k, opts) { // 범위 칸 [행, 열] — 보드 밖은 잘림
  const R = gbRules(pre), RM = R.ys.length, CM = R.xs.length, out = [];
  const sh = k === 'i' ? {w: 3, h: 3, ar: 2, ac: 2} : gbAreaShape(opts) || {w: 1, h: 1, ar: 1, ac: 1};
  for (let rr = r - sh.ar + 1; rr < r - sh.ar + 1 + sh.h; rr++)
    for (let cc = c - sh.ac + 1; cc < c - sh.ac + 1 + sh.w; cc++)
      if (rr >= 1 && rr <= RM && cc >= 1 && cc <= CM) out.push([rr, cc]);
  return out;
}
function gbWhyNotPlace(pre, i, k) {
  const s4 = gbSlots4(), si = s4.indexOf(pre);
  if (si < 0) return '보드를 먼저 고르세요';
  if (si === 0) return '신 보드(1번)에는 놓을 수 없습니다';
  const other = gbpOf(k === 'i' ? 'p' : 'i');
  if (other && other.b === pre) return (k === 'i' ? '프리즘' : '역상') + '이 있는 보드에는 같이 놓을 수 없습니다';
  if (k === 'i') { const [r, c] = gbRC((BOARD_IDS[pre] || [])[i]); if (r >= 2 && r <= 4 && c >= 3 && c <= 5) return '역상은 보드 가운데 3×3 에는 놓을 수 없습니다'; }
  return '';
}
function gbPlaceAt(pre, i) {
  if (guardShareView() || !gbPlace) return;
  const k = gbPlace, why = gbWhyNotPlace(pre, i, k);
  if (why) { gbMsg = '⚠ ' + why; gbRefresh(); return; }
  const nid = BOARD_IDS[pre][i], [r, c] = gbRC(nid), pos = gbSlots4().indexOf(pre) + 2, old = gbpOf(k);
  if (k === 'i') {
    const has = (preset.gboard || []).some(e => String(e[0]).slice(0, 2) === pre) || (old && old.b !== pre && (preset.gboard || []).some(e => String(e[0]).slice(0, 2) === old.b && ((e[4] || 0) & 1)));
    if (has && !confirm('역상을 놓으면 ' + BOARDS[pre].n + ' 보드에 찍은 포인트가 초기화됩니다 (반사로 열 계산이 바뀜). 계속할까요?')) return;
    gbDropMirror(old);
    if (preset.gboard) preset.gboard = preset.gboard.filter(e => String(e[0]).slice(0, 2) !== pre);
    const iv = (old && old.iv) || gbInvPending || {low: 0, mid: 0, leg: 0}; gbInvPending = null;
    gbpSet('i', {b: pre, c: gbAreaCells(pre, r, c, 'i'), nd: nid, k: 'i', iv});
    preset.inverse = {pos, opts: {low: iv.low > -100, mid: iv.mid > -100, abs: iv.leg > -100}};
  } else {
    if (!preset.prism) return;
    gbpSet('p', {b: pre, c: gbAreaCells(pre, r, c, 'p', preset.prism.opts), nd: nid, k: 'p'});
    preset.prism.pos = pos;
  }
  // 장착 노드는 효과가 없다 — 그 자리에 찍은 포인트는 뺀다
  if (preset.gboard) preset.gboard = preset.gboard.filter(e => !(String(e[0]) === nid && !((e[4] || 0) & 1)));
  gbPlace = null;
  gbSaved();
}
function gbDropMirror(g) { // 역상을 빼거나 옮기면 복사 칸 포인트도 뺀다
  if (!g || !preset.gboard) return;
  preset.gboard = preset.gboard.filter(e => !(String(e[0]).slice(0, 2) === g.b && ((e[4] || 0) & 1)));
}
function gbPzRemove(k) {
  if (guardShareView()) return;
  if (k === 'i') { gbDropMirror(gbpOf('i')); gbpSet('i', null); delete preset.inverse; }
  else { gbpSet('p', null); delete preset.prism; }
  gbPlace = null; gbPzEd = null;
  gbSaved();
}
function gbPzSync() { // 보드를 빼거나 3·4번 순서를 바꾸면 놓은 자리(pos)도 따라간다
  const s4 = gbSlots4();
  let ch = false;
  ['p', 'i'].forEach(k => {
    const g = gbpOf(k); if (!g) return;
    const si = s4.indexOf(g.b);
    if (si < 1) { if (k === 'i') gbDropMirror(g); gbpSet(k, null); if (k === 'i') delete preset.inverse; ch = true; return; }
    const it = k === 'i' ? preset.inverse : preset.prism;
    if (it && it.pos !== si + 2) { it.pos = si + 2; ch = true; }
  });
  if (ch) persistPreset();
}
// 편집 팝업 — 프리즘: 종류 → 1번(영향 범위) → 2번 → 3번, 역상: 반사 비율 3개
function gbPzOpen(k) {
  if (guardShareView()) return;
  if (k === 'p' && (typeof PRISM === 'undefined' || !PRISM.items.length)) { gbMsg = '⚠ 프리즘 데이터가 없습니다'; gbRefresh(); return; }
  const pr = preset.prism, g = gbpOf('i');
  gbPzEd = k === 'p' ? {k, stage: pr ? 1 : 0, item: pr ? pr.name : null, opts: pr ? [0, 1, 2].map(i => pr.opts[i] ? {effect: pr.opts[i].effect, type: pr.opts[i].type} : null) : [null, null, null], q: ''}
    : {k, iv: Object.assign({low: 0, mid: 0, leg: 0}, g && g.iv)};
  gbPlace = null; gbRenderModal();
}
function gbPzClose() { gbPzEd = null; gbRenderModal(); }
function gbPzStage(i) { if (!gbPzEd) return; if (i > 0 && !gbPzEd.item) { gbMsg = '⚠ 프리즘 종류를 먼저 고르세요'; gbRenderModal(); return; } gbPzEd.stage = i; gbPzEd.q = ''; gbRenderModal(); }
function gbPzItem(i) {
  const it = PRISM.items[i]; if (!it || !gbPzEd) return;
  gbPzEd.item = it.name;
  const an = gbPzEd.opts[2] && prismAddName(gbPzEd.opts[2].effect);
  if (an && an !== it.talent) gbPzEd.opts[2] = null; // 짝이 안 맞는 추가형 3번 옵션은 해제
  gbPzEd.stage = 1; gbPzEd.q = ''; gbRenderModal();
}
function gbPzOpt(i) {
  const o = PRISM.opts[i]; if (!o || !gbPzEd) return;
  const sl = o.slot - 1, cur = gbPzEd.opts[sl];
  gbPzEd.opts[sl] = cur && cur.effect === o.effect && cur.type === o.type ? null : {effect: o.effect, type: o.type};
  if (gbPzEd.opts[sl] && gbPzEd.stage < 3) { gbPzEd.stage++; gbPzEd.q = ''; }
  gbRenderModal();
}
function gbPzSearch(v) { if (!gbPzEd) return; gbPzEd.q = v; const b = document.getElementById('gbPzList'); if (b) b.innerHTML = gbPzRows(); }
function gbPzRows() {
  const e = gbPzEd, q = (e.q || '').trim().toLowerCase(), hit = t => !q || String(t || '').toLowerCase().includes(q);
  if (e.stage === 0) return PRISM.items.map((it, i) => hit(it.name + ' ' + (it.effect || '')) ?
    `<div class="gbz-row${e.item === it.name ? ' on' : ''}" onclick="gbPzItem(${i})">${it.icon ? `<img src="${it.icon}" alt="" loading="lazy">` : ''}<div><b>${escapeHtml(it.name)}</b>${it.effect ? `<small>${escapeHtml(it.effect)}</small>` : ''}</div></div>` : '').join('');
  const curIt = PRISM.items.find(x => x.name === e.item) || {}, seen = new Set(), rows = [];
  PRISM.opts.forEach((o, i) => {
    if (o.slot !== e.stage || !hit(o.effect + ' ' + o.type)) return;
    const an = e.stage === 3 ? prismAddName(o.effect) : null;
    if (an && an !== curIt.talent) return; // 다른 프리즘용 추가형은 숨김
    const key = o.effect + '|' + o.type; if (seen.has(key)) return; seen.add(key); // 1번 옵션은 같은 문구가 여러 ID
    rows.push({i, o, top: !!an});
  });
  rows.sort((a, b) => b.top - a.top);
  return rows.map(({i, o}) => { const sel = e.opts[e.stage - 1], on = sel && sel.effect === o.effect && sel.type === o.type;
    return `<div class="gbz-row opt${on ? ' on' : ''}" onclick="gbPzOpt(${i})"><div><span>${escapeHtml(o.effect)}</span>${o.type ? `<small>${escapeHtml(o.type)}</small>` : ''}</div></div>`; }).join('')
    || '<div class="gbz-empty">조건에 맞는 옵션이 없습니다</div>';
}
function gbPzIv(t, v) { if (!gbPzEd) return; const d = GB_INV.find(x => x[0] === t); gbPzEd.iv[t] = Math.max(d[2], Math.min(d[3], Math.round(+v || 0))); }
function gbPzSave() {
  if (guardShareView() || !gbPzEd) return;
  const e = gbPzEd;
  if (e.k === 'p') {
    if (!e.item) { gbMsg = '⚠ 프리즘 종류를 고르세요'; gbRenderModal(); return; }
    const it = PRISM.items.find(x => x.name === e.item);
    preset.prism = {pos: (preset.prism && preset.prism.pos) || 3, name: e.item, opts: e.opts, snap: it ? JSON.parse(JSON.stringify(it)) : undefined};
    const g = gbpOf('p');
    if (g) { const [r, c] = gbRC(g.nd); g.c = gbAreaCells(g.b, r, c, 'p', e.opts); } // 범위 옵션이 바뀌면 칸도 다시
    gbPlace = g ? null : 'p'; // 아직 안 놓았으면 바로 놓기
  } else {
    const g = gbpOf('i');
    if (g) { g.iv = Object.assign({}, e.iv); if (preset.inverse) preset.inverse.opts = {low: e.iv.low > -100, mid: e.iv.mid > -100, abs: e.iv.leg > -100}; }
    else gbInvPending = Object.assign({}, e.iv);
    gbPlace = g ? null : 'i';
  }
  gbPzEd = null;
  gbSaved();
}
function gbPzPopup() { // 편집 팝업 HTML
  const e = gbPzEd;
  if (e.k === 'i') {
    return `<div class="gbz-h"><b>◆ 역상</b><small>범위(장착 노드 둘레 3×3)를 보드 반대편으로 복사 — 복사된 노드 효과에 아래 비율이 붙습니다</small><button class="gbz-x" onclick="gbPzClose()">✕</button></div>` +
      GB_INV.map(([t, lb, lo, hi]) => `<label class="gbz-iv"><span>반사 후 ${lb} 재능 효과</span><input type="number" min="${lo}" max="${hi}" step="1" value="${e.iv[t]}" onchange="gbPzIv('${t}', this.value)"><em>% (${lo} ~ +${hi})</em></label>`).join('') +
      '<div class="gbz-note">−100% = 그 등급은 반사 효과 없음. 게임에서 역상에 붙은 수치를 그대로 넣으세요.</div>' +
      `<div class="gbz-acts"><button class="gbz-btn pri" onclick="gbPzSave()">${gbpOf('i') ? '저장' : '저장하고 보드에 놓기'}</button><button class="gbz-btn" onclick="gbPzClose()">취소</button></div>`;
  }
  const tabs = ['종류', '1번 · 영향 범위', '2번 · 범위 효과', '3번 · 특수'].map((lb, i) => {
    const done = i === 0 ? e.item : e.opts[i - 1];
    return `<span class="gbz-tab${e.stage === i ? ' on' : ''}${done ? ' done' : ''}" onclick="gbPzStage(${i})">${lb}${done ? ' ✓' : ''}</span>`;
  }).join('');
  const picked = e.item ? `<div class="gbz-picked"><b>${escapeHtml(e.item)}</b>` + e.opts.map((o, i) => o ? `<div>${i + 1}. ${escapeHtml(o.effect)}</div>` : '').join('') + '</div>' : '';
  return `<div class="gbz-h"><b>◆ 제노 프리즘</b><small>종류와 옵션 3칸을 고른 뒤 보드에 놓습니다 (안 고른 칸은 비워 둬도 됨)</small><button class="gbz-x" onclick="gbPzClose()">✕</button></div>` +
    `<div class="gbz-tabs">${tabs}</div>${picked}` +
    `<input class="gbz-q" type="search" placeholder="${e.stage ? '옵션' : '프리즘'} 검색" value="${escapeHtml(e.q || '')}" oninput="gbPzSearch(this.value)">` +
    `<div class="gbz-list" id="gbPzList">${gbPzRows()}</div>` +
    `<div class="gbz-acts"><button class="gbz-btn pri" onclick="gbPzSave()">${gbpOf('p') ? '저장' : '저장하고 보드에 놓기'}</button><button class="gbz-btn" onclick="gbPzClose()">취소</button></div>`;
}
function gbPzSide() { // 왼쪽 칸 아래 — 어느 보드에 어떤 프리즘·역상을 썼는지 **보기만** (추가·고치기는 보드 머리 버튼)
  const s4 = gbSlots4(), pr = preset.prism, gp = gbpOf('p'), gi = gbpOf('i');
  const sh = pr ? gbAreaShape(pr.opts) : null;
  const card = (k, g, title, sub) => {
    const si = g ? s4.indexOf(g.b) : -1;
    return `<div class="gbm-pz${title ? ' have' : ''}${gbPlace === k ? ' placing' : ''}"${si > 0 ? ` onclick="gbPickSlot(${si})" title="그 보드로 가기"` : ''}>` +
      `<div class="gbm-pzt"><i class="gbm-pzi ${k}">◆</i><b>${title || (k === 'i' ? '역상' : '프리즘')}</b></div><small>${sub}</small></div>`;
  };
  const ivTxt = gi ? GB_INV.map(([t, lb]) => lb.replace('레전드 중위', '레전드') + ' ' + ((gi.iv || {})[t] >= 0 ? '+' : '') + ((gi.iv || {})[t] ?? '?') + '%').join(' ') : '';
  return '<div class="gbm-cap gbm-pzcap">프리즘 · 역상</div>' +
    card('p', gp, pr ? escapeHtml(pr.name.replace(/^제노 프리즘:\s*/, '')) : '', pr ? (gp ? escapeHtml(BOARDS[gp.b].n) + ' 보드' + (sh ? ' · ' + sh.w + '×' + sh.h : '') : '아직 보드에 안 놓음') : '없음 · 보드 위 버튼으로 추가') +
    card('i', gi, gi ? '역상' : '', gi ? escapeHtml(BOARDS[gi.b].n) + ' 보드 · ' + ivTxt : '없음 · 보드 위 버튼으로 추가');
}
function gbPzHead(pre, slot) { // 보드 머리 — 이 보드에 놓기·이 보드에 놓인 것 고치기. 다른 보드에서 쓰는 중이면 안 보인다
  if (slot < 1 || guardShareViewQuiet()) return '';
  const pr = preset.prism, gp = gbpOf('p'), gi = gbpOf('i');
  const chip = (k, lb) => `<span class="gbm-pzchip ${k}"><button onclick="gbPzOpen('${k}')" title="고치기">◆ ${lb}</button><button class="x" onclick="gbPzRemove('${k}')" title="빼기">✕</button></span>`;
  let h = '';
  if (gp && gp.b === pre) h += chip('p', escapeHtml(pr ? pr.name.replace(/^제노 프리즘:\s*/, '') : '프리즘'));
  else if (!gp && !(gi && gi.b === pre)) h += `<button class="gbm-pzadd p" onclick="gbPzAdd('p')">◆ ${pr ? '프리즘 놓기' : '프리즘 추가'}</button>`;
  if (gi && gi.b === pre) h += chip('i', '역상');
  else if (!gi && !(gp && gp.b === pre)) h += `<button class="gbm-pzadd i" onclick="gbPzAdd('i')">◆ 역상 추가</button>`;
  return h;
}
const guardShareViewQuiet = () => typeof shareView !== 'undefined' && shareView && !(typeof shareEdit !== 'undefined' && shareEdit);
function gbPzAdd(k) { // 프리즘: 만들어 둔 게 있으면 바로 놓기, 없으면 만들기 → 저장하면 놓기 / 역상: 비율 → 놓기
  if (guardShareView()) return;
  if (k === 'p' && preset.prism) { gbPlace = 'p'; gbMsg = ''; gbRenderModal(); return; }
  gbPzOpen(k);
}
function gbPlaceMode(k) {
  if (guardShareView()) return;
  gbPlace = gbPlace === k ? null : k; gbMsg = '';
  if (gbPlace) { const s4 = gbSlots4(); if (gbSlot === 0 || !s4[gbSlot]) { const j = s4.findIndex((p, x) => x > 0 && p); if (j > 0) gbSlot = j; } }
  gbRenderModal();
}
// 보드 칸 규칙 (게임 = TLIBuilder treeGroups 와 같음): 보드 번호 앞자리 = 신, 뒷자리 0 = 신 보드, 1~4 = 그 신의 하위.
//  1번 칸 = 신 보드 하나(전체에서 신은 하나뿐) → 2번 칸 = 그 신의 하위 보드 → 3·4번 칸 = 아무 하위 보드(신 불가)
const gbIsGod = pre => String(pre)[1] === '0';
function gbSlotsOf(present) { // 지금 펼친 보드를 칸 순서로 [신, 그 신의 하위, 나머지…]
  // 3·4번 순서는 preset.gbOrder(사용자가 바꾼 순서)를 따르고, 거기 없는 보드는 고른 순서대로 뒤에 붙는다
  // 사용자가 바꾼 순서가 없으면 핵심 재능 줄 순서(로그는 게임 칸 순서대로 준다)를 따른다
  const ord = (typeof preset !== 'undefined' && preset && preset.gbOrder) || gbCoreOrder();
  const rank = p => { const k = ord.indexOf(p); return k < 0 ? 99 : k; };
  const ps = [...present].map((p, k) => [p, k]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
  const god = ps.find(gbIsGod) || null;
  const own = god ? ps.find(p => !gbIsGod(p) && p[0] === god[0]) || null : null;
  return [god, own, ...ps.filter(p => p !== god && p !== own)];
}
// 이 보드를 더 펼칠 수 있나 — 안 되면 이유, 되면 ''
function gbWhyNotAdd(pre, present) {
  if (present.has(pre)) return '이미 고른 보드입니다';
  const [god, own] = gbSlotsOf(present);
  if (!god) return gbIsGod(pre) ? '' : '1번 보드는 신(힘의 신·기계의 신 등) 중에서 골라야 합니다';
  if (gbIsGod(pre)) return '신 보드는 1번 칸에 하나만 고를 수 있습니다';
  if (!own) return pre[0] === god[0] ? '' : '2번 보드는 ' + BOARDS[god].n + '의 하위 보드여야 합니다';
  if (present.size >= 4) return '보드는 4개까지입니다';
  return '';
}

function gbCoreOrder() { // 핵심 재능 줄에 나온 보드 순서 (preset.talents 의 계열 이름 → 보드 번호)
  const name2pre = {}, out = [];
  Object.keys(BOARDS).forEach(p => { name2pre[BOARDS[p].n] = p; });
  ((typeof preset !== 'undefined' && preset && preset.talents) || []).forEach(t => {
    if (talGroup(t.type) !== 0) return;
    const p = name2pre[t.type];
    if (p && !out.includes(p)) out.push(p);
  });
  return out;
}
function gbPresent() { // 포인트가 있거나 펼쳐 둔 보드
  const s = new Set(gbExtra);
  (preset.gboard || []).forEach(e => s.add(String(e[0]).slice(0, 2)));
  [preset.gbPrism, preset.gbPrism2].forEach(g => { if (g && BOARDS[g.b]) s.add(g.b); }); // 역상을 놓아 포인트가 비어도 보드는 남는다
  // 신 보드에 포인트를 안 넣은 캐릭터는 로그에 신 보드가 없다(실로그 15) — 2번 칸 보드의 신을 0pt 로 채워
  // 하위 보드가 3·4번 칸으로 밀려 잘리지 않게 한다. 2번 칸 = 핵심 재능 순서상 첫 하위 보드
  if (s.size && ![...s].some(gbIsGod)) {
    const first = gbCoreOrder().find(p => s.has(p)) || [...s][0];
    if (BOARDS[first[0] + '0']) s.add(first[0] + '0');
  }
  return s;
}
function gbAddBoard(sel) {
  const pre = sel.value;
  if (pre) { const why = gbWhyNotAdd(pre, gbPresent()); gbMsg = why ? '⚠ ' + why : ''; if (!why) gbExtra.add(pre); }
  gbRefresh();
}
function gbClearBoard(pre) {
  if (guardShareView()) return;
  const present = gbPresent();
  const [god, own] = gbSlotsOf(present);
  if (present.size > 1 && pre === god) { gbMsg = '⚠ 신 보드(1번)는 하위 보드를 모두 비운 뒤에 뺄 수 있습니다'; gbRefresh(); return; }
  if (pre === own && present.size > 2) { gbMsg = '⚠ 2번 보드(' + BOARDS[god].n + '의 하위)는 3·4번 보드를 먼저 비워야 뺄 수 있습니다'; gbRefresh(); return; }
  const has = (preset.gboard || []).some(e => String(e[0]).slice(0, 2) === pre);
  if (has && !confirm(BOARDS[pre].n + ' 보드에 찍은 포인트를 모두 지울까요?')) return;
  if (preset.gboard) { preset.gboard = preset.gboard.filter(e => String(e[0]).slice(0, 2) !== pre); if (!preset.gboard.length) delete preset.gboard; }
  ['p', 'i'].forEach(k => { const g = gbpOf(k); if (g && g.b === pre) { gbpSet(k, null); if (k === 'i') delete preset.inverse; } }); // 이 보드에 놓은 프리즘·역상도 내린다 (프리즘 자체는 남김)
  const coreKs = new Set((BOARDS[pre].k || []).flatMap(g => g[1]).map(gbCoreRow).filter(Boolean).map(gbCoreKey));
  if (coreKs.size) preset.talents = (preset.talents || []).filter(t => !coreKs.has(t.k)); // 이 보드의 핵심 재능도
  gbExtra.delete(pre);
  if (preset.gbOrder) { preset.gbOrder = preset.gbOrder.filter(x => x !== pre); if (!preset.gbOrder.length) delete preset.gbOrder; }
  gbMsg = '';
  persistPreset();
  renderPreset();
  if (gbModalOpen) gbRenderModal();
}
const GB_GODS = [['1', '#c9a227'], ['2', '#4caf50'], ['3', '#3b82f6'], ['4', '#e5484d'], ['5', '#a855f7'], ['6', '#14b8a6']]; // 신마다 색 (게임 배너 색)
// 티아 「계시의 예언」(SS14) — 4번째 재능 보드의 주신이 힘(1)·사냥(2)·지식(3)이면 일부 재능이 축복 변형으로 바뀐다.
// 변형 = 같은 칸 ID 의 끝 두 자리 '01' (…00 → …01). 단독 화면·빌더 2 는 생성기가 뽑은 TALENT_VAR, 빌더는 장비·옵션 행(SLATEIDX)에서 (2026-10-10)
function gbRevelation(pre) {
  const h = preset.hero; // 빌드엔 특성 약칭('티아1')이 저장된다 — 정식 이름으로 바꿔 비교
  const full = h && (typeof traitInfo === 'function' && traitInfo(h.trait) ? traitInfo(h.trait).full : h && h.trait);
  if (!h || h.hero !== '티아' || (full !== '신들의 위대한 지혜' && h.trait !== '티아1')) return false; // 재능 단독 화면엔 traitInfo 가 없어 약칭으로도
  if (!Object.values(preset.heroNodes || {}).includes('계시의 예언')) return false;
  return gbSlots4()[3] === pre && '123'.includes(String(pre)[0]);
}
function gbVarText(nid) {
  if (!nid || String(nid).length !== 8) return '';
  const v = String(nid).slice(0, 6) + '01';
  if (typeof TALENT_VAR !== 'undefined') return TALENT_VAR[nid] || '';
  if (typeof SLATEIDX !== 'undefined' && SLATEIDX.idx[v] !== undefined) return ALL_DATA[SLATEIDX.idx[v]].effect || '';
  return '';
}
function gbSlots4() { const sl = gbSlotsOf(gbPresent()); return [sl[0] || null, sl[1] || null, sl[2] || null, sl[3] || null]; }
function gbOpenModal(ev) {
  if (ev) ev.stopPropagation();
  if (guardShareView()) return;
  gbModalOpen = true; gbMsg = '';
  const s4 = gbSlots4();
  gbSlot = s4[0] ? 0 : 0;
  gbRenderModal();
}
const gbTalentPage = () => !!document.getElementById('talentApp'); // /tli/talent 단독 화면 — 팝업이 아니라 페이지에 그린다
function gbCloseModal() {
  if (gbTalentPage()) { location.href = '/tli/builder/'; return; } // 찍은 것은 같은 빌드(브라우저 저장)라 빌더에서 그대로 보인다
  gbModalOpen = false;
  const el = document.getElementById('gbModal'); if (el) el.style.display = 'none';
  // 고르기만 하고 포인트를 안 넣은 보드는 정리하지 않는다(빌더 화면에서도 빈 판으로 보인다 — 다시 열어 이어서 찍도록)
  renderTalentBoard();
}
function gbPickSlot(i) {
  const s4 = gbSlots4();
  if (i > 0 && !s4[i - 1]) { gbMsg = '⚠ ' + i + '번 보드부터 골라 주세요'; gbRenderModal(); return; }
  gbSlot = i; gbMsg = ''; gbRenderModal();
}
// 3·4번 칸 순서 맞바꾸기 (1·2번은 규칙상 고정)
function gbSwap34() {
  if (guardShareView()) return;
  const s4 = gbSlots4();
  if (!s4[2] || !s4[3]) return;
  preset.gbOrder = [s4[0], s4[1], s4[3], s4[2]].filter(Boolean);
  gbCoreSort();
  if (gbSlot === 2 || gbSlot === 3) gbSlot = 5 - gbSlot; // 보고 있던 보드를 계속 본다
  persistPreset();
  renderPreset();
  if (gbModalOpen) gbRenderModal();
}
function gbPickBoard(pre) {
  const why = gbWhyNotAdd(pre, gbPresent());
  if (why) { gbMsg = '⚠ ' + why; gbRenderModal(); return; }
  gbExtra.add(pre); gbMsg = '';
  gbSlot = Math.max(0, gbSlots4().indexOf(pre));
  gbRefresh();
}
const gbColor = pre => (GB_GODS.find(g => g[0] === String(pre)[0]) || ['', '#8b949e'])[1];
const gbEmb = (pre, cls) => BOARDS[pre] && BOARDS[pre].e
  ? `<i class="gb-emb ${cls || ''}" style="--gc:${gbColor(pre)};--em:url('${location.origin}/tli/builder/emblem/${BOARDS[pre].e}')"></i>` : '';
// 보드 태그·소개 (tlidb 목록 카드 — 수집기 board_info: d=첫 줄, g=태그, s=한 줄 소개). 고르기 칸엔 태그만, 나머지는 툴팁
const gbTags = (pre, cls) => (BOARDS[pre].g || []).length ? `<small class="${cls}">${escapeHtml(BOARDS[pre].g.join(' · '))}</small>` : '';
const gbInfo = pre => { const b = BOARDS[pre]; return [b.n, b.d, (b.g || []).length ? '태그: ' + b.g.join(', ') : '', b.s].filter(Boolean).join('\n') + '\n\n'; };
const gbMaxPts = pre => (BOARDS[pre].m || []).reduce((t, v) => t + v, 0) || 1;
function gbRenderModal() {
  const page = document.getElementById('talentApp');
  let el = page || document.getElementById('gbModal');
  if (!el || !el.dataset.gbInit) {
    if (!el) { el = document.createElement('div'); el.id = 'gbModal'; el.className = 'gbm-dim'; document.body.appendChild(el); }
    el.dataset.gbInit = '1';
    el.addEventListener('click', e => { if (e.target === el && !page) gbCloseModal(); });
    el.addEventListener('contextmenu', e => e.preventDefault()); // 우클릭 = 포인트 빼기 — 브라우저 메뉴가 끼어들지 않게
    // 3·4번 칸 끌어서 순서 바꾸기 (HTML5 끌기 — 칸 카드에 data-slot)
    el.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.gbm-slot[data-slot]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.slot); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); });
    el.addEventListener('dragend', () => el.querySelectorAll('.gbm-slot.drag, .gbm-slot.drop').forEach(c => c.classList.remove('drag', 'drop')));
    el.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('.gbm-slot[data-slot]'); if (!c) return; e.preventDefault(); c.classList.add('drop'); });
    el.addEventListener('dragleave', e => { const c = e.target.closest && e.target.closest('.gbm-slot[data-slot]'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('drop'); });
    el.addEventListener('drop', e => { const c = e.target.closest && e.target.closest('.gbm-slot[data-slot]'); if (!c) return; e.preventDefault();
      if (e.dataTransfer.getData('text/plain') !== c.dataset.slot) gbSwap34(); });
  }
  gbPzSync();
  const present = gbPresent(), s4 = gbSlots4();
  const total = (preset.gboard || []).reduce((t, x) => t + (x[1] || 0), 0);
  const ptsOf = pre => (preset.gboard || []).reduce((t, x) => t + (String(x[0]).slice(0, 2) === pre ? (x[1] || 0) : 0), 0);
  const god = s4[0];
  const label = i => ['신 보드', god ? BOARDS[god].n + '의 하위' : '신의 하위 보드', '자유 보드', '자유 보드'][i];
  // ── 왼쪽: 보드 칸 1~4
  let side = '<div class="gbm-cap">보드</div>';
  s4.forEach((pre, i) => {
    if (i === 3 && s4[2] && s4[3]) side += '<button class="gbm-swap" onclick="gbSwap34()" title="3번과 4번 보드 순서 맞바꾸기">⇅ 순서 바꾸기</button>'; // 끌기가 안 되는 터치 화면용
    const open = i === 0 || s4[i - 1];
    if (pre) {
      const pt = ptsOf(pre), pct = Math.min(100, Math.round(pt / gbMaxPts(pre) * 100));
      const dnd = i >= 2 && s4[2] && s4[3] ? ` draggable="true" data-slot="${i}" title="끌어서 3·4번 순서 바꾸기"` : '';
      side += `<div class="gbm-slot filled${i === gbSlot ? ' on' : ''}${dnd ? ' dnd' : ''}" style="--gc:${gbColor(pre)}" onclick="gbPickSlot(${i})"${dnd}>` + (dnd ? '<span class="gbm-grip">⠿</span>' : '') +
        `<span class="gbm-no">${i + 1}</span>${gbEmb(pre, 'gbm-semb')}<div class="gbm-st"><small>${escapeHtml(label(i))}</small>` +
        `<b>${escapeHtml(BOARDS[pre].n)}</b><span class="gbm-bar"><i style="width:${pct}%"></i></span><em>${pt}pt${(BOARDS[pre].k || []).map((g, gi) => { const t = gbCorePicked(pre, gi), r = t && gbCoreRow(t); return r ? ' · ' + escapeHtml(gbCoreName(r)) : ''; }).join('')}</em></div>` +
        `<button class="gbm-del" onclick="event.stopPropagation();gbClearBoard('${pre}')" title="이 보드의 포인트를 모두 지우고 빼기">✕</button></div>`;
    } else {
      side += `<div class="gbm-slot empty${i === gbSlot ? ' on' : ''}${open ? '' : ' off'}" onclick="gbPickSlot(${i})">` +
        `<span class="gbm-plus">${open ? '+' : i + 1}</span><div class="gbm-st"><small>${i + 1}번 · ${escapeHtml(label(i))}</small>` +
        `<b class="gbm-empty">${open ? '눌러서 고르기' : '앞 칸 먼저'}</b></div></div>`;
    }
  });
  const over = total > GB_BUDGET, tp = Math.min(100, Math.round(total / GB_BUDGET * 100));
  side += gbPzSide() + `<div class="gbm-total${over ? ' over' : ''}"><small>총합 포인트</small><b>${total}<span> / ${GB_BUDGET}</span></b>` +
    `<span class="gbm-bar big"><i style="width:${tp}%"></i></span>${over ? '<em>총 포인트를 넘었습니다</em>' : ''}</div>`;
  // ── 가운데: 보드 고르기 또는 그 보드
  const cur = s4[gbSlot];
  let main;
  if (cur) {
    const pt = ptsOf(cur);
    main = `<div class="gbm-head" style="--gc:${gbColor(cur)}">${gbEmb(cur, 'gbm-hemb')}<div><small>${gbSlot + 1}번 · ${escapeHtml(label(gbSlot))}</small>` +
      `<b>${escapeHtml(BOARDS[cur].n)}</b>${gbTags(cur, 'gbm-htag')}</div><div class="gbm-cslots">${gbCoreSlots(cur)}</div>` +
      `<div class="gbm-hright">` + (gbSlot < 3 && !s4[gbSlot + 1] ? `<button class="gbm-next" onclick="gbPickSlot(${gbSlot + 1})">다음 보드 고르기 →</button>` : '') +
      gbPzHead(cur, gbSlot) + `<span class="gbm-pt">${pt}<small>pt</small></span></div></div>` +
      (gbPlace ? `<div class="gbm-placing"><i class="gbm-pzi ${gbPlace}">◆</i> ${gbPlace === 'i' ? '역상' : '프리즘'}을 놓을 노드를 누르세요 — 신 보드 제외${gbPlace === 'i' ? ' · 가운데 3×3 제외' : ''} · 왼쪽에서 다른 보드로 바꿀 수 있습니다 <button onclick="gbPlaceMode('${gbPlace}')">취소</button></div>` : '') +
      `<div class="gbm-stage" style="--gc:${gbColor(cur)};--em:url('${location.origin}/tli/builder/emblem/${BOARDS[cur].e || ''}')"><div id="gbmBoard"></div></div>`;
  } else {
    const can = p => !gbWhyNotAdd(p, present);
    const slotOf = p => s4.indexOf(p) + 1;
    main = `<div class="gbm-head plain"><div><small>${gbSlot + 1}번 칸</small><b>${escapeHtml(
      !god ? '신을 고르세요' : !s4[1] ? BOARDS[god].n + '의 하위 보드를 고르세요' : '하위 보드를 하나 더 고르세요')}</b></div>` +
      `<span class="gbm-hint">${escapeHtml(!god ? '신 보드는 1번 칸에만, 하나만 고를 수 있습니다' : !s4[1] ? '2번 칸은 고른 신의 하위 보드만 들어갑니다' : '3·4번 칸은 아무 하위 보드나(신 제외)')}</span></div>` +
      '<div class="gbm-pick">' + GB_GODS.map(([g, col]) => {
        const gp = g + '0';
        const st = p => present.has(p) ? ' have' : can(p) ? ' can' : ' off';
        const badge = p => present.has(p) ? `<span class="gbm-badge">${slotOf(p)}</span>` : '';
        const tip = p => escapeHtml(gbInfo(p) + (present.has(p) ? slotOf(p) + '번 칸에 고른 보드' : gbWhyNotAdd(p, present) || '눌러서 고르기'));
        const click = p => can(p) ? ` onclick="gbPickBoard('${p}')"` : '';
        return `<div class="gbm-col" style="--gc:${col}">` +
          `<div class="gbm-banner${st(gp)}"${click(gp)} title="${tip(gp)}">${badge(gp)}${gbEmb(gp, 'gbm-bemb')}<b>${escapeHtml(BOARDS[gp].n)}</b>${gbTags(gp, 'gbm-btag')}</div>` +
          [1, 2, 3, 4].map(k => { const p = g + k; return BOARDS[p] ? `<div class="gbm-sub${st(p)}"${click(p)} title="${tip(p)}">${gbEmb(p, 'gbm-subemb')}<div class="gbm-sn"><span>${escapeHtml(BOARDS[p].n)}</span>${gbTags(p, 'gbm-stag')}</div>${badge(p)}</div>` : ''; }).join('') +
          '</div>';
      }).join('') + '</div>';
  }
  el.innerHTML = '<div class="gbm"><div class="gbm-top"><b class="gbm-title">재능 보드</b>' + (typeof gbmHelp === 'function' ? gbmHelp('talent') : '') + (page && typeof hpBuildPicker === 'function' ? hpBuildPicker() : '') +
    '<span class="gbm-keys"><kbd>클릭</kbd> +1 <kbd>우클릭</kbd> −1 <span class="gbm-sep">·</span> 열 위 숫자 = 그 열을 여는 데 필요한 왼쪽 포인트</span>' +
    (gbMsg ? '<span class="gbm-msg">' + escapeHtml(gbMsg.replace(/^⚠\s*/, '')) + '</span>' : '') +
    '<button class="gbm-x" onclick="gbCloseModal()">' + (gbTalentPage() ? '빌더에서 이어서 짜기 →' : '닫기 ✕') + '</button></div>' +
    `<div class="gbm-body"><div class="gbm-side">${side}</div><div class="gbm-main">${main}</div></div>` +
    (gbPzEd ? `<div class="gbz-dim" onclick="if (event.target === this) gbPzClose()"><div class="gbz">${gbPzPopup()}</div></div>` : '') +
    (gbCorePop ? `<div class="gbz-dim" onclick="if (event.target === this) { gbCorePop = null; gbRenderModal(); }"><div class="gbz gbz-narrow">${gbCorePopup()}</div></div>` : '') + '</div>';
  if (!page) el.style.display = 'flex';
  if (cur) renderTalentBoard({into: document.getElementById('gbmBoard'), only: [cur], edit: true});
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (gbCorePop) { gbCorePop = null; gbRenderModal(); return; }
  if (gbPzEd) { gbPzClose(); return; }
  if (gbPlace) { gbPlace = null; gbRenderModal(); return; }
  if (gbModalOpen && !gbTalentPage()) gbCloseModal();
});
function renderTalentBoard(opt) {
  opt = opt || {};
  const ED = !!opt.edit; // 찍기는 팝업(gbModal) 안에서만 — 빌더 화면의 작은 판은 보기 전용
  const wrap = opt.into || document.getElementById('boardWrap');
  if (!wrap) return; // 단독 재능 화면에는 빌더의 작은 판(#boardWrap)이 없다
  if (!opt.into) wrap.classList.toggle('gb-closed', !gbOpen);
  const gb = preset.gboard || [];
  const viewing = typeof shareView !== 'undefined' && shareView && !shareEdit;
  if (!opt.into && !gb.length && (viewing || !gbExtra.size)) {
    if (viewing) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.classList.remove('gb-closed');
    wrap.innerHTML = '<div class="sb-title">🌳 재능 보드 <span class="psum">로그 가져오기로 채우거나 직접 찍어 보세요</span> ' +
      '<button class="btn-sel" onclick="gbOpenModal(event)">✏ 직접 찍기</button></div>';
    wrap.style.display = '';
    return;
  }
  // pt: 노드ID→포인트 / atCell: "계열|행,열"→ 그 칸에 실제로 놓인 노드 (역상 반사 반영)
  const pt = {}, byBoard = {}, atCell = {};
  gb.forEach(e => {
    const nid = e[0], n = e[1] || 0, pre = nid.slice(0, 2);
    if (!((e[4] || 0) & 1) && (n > pt[nid] || pt[nid] === undefined)) pt[nid] = n; // 역상 복사본 포인트는 원래 자리 노드 것이 아니다
    if (n > 0) (byBoard[pre] = byBoard[pre] || []).push(nid);
    if (e.length > 2 && e[2] && e[3]) atCell[pre + '|' + e[2] + ',' + e[3]] = {nid, n, m: (e[4] || 0) & 1, a: ((e[4] || 0) & 2) >> 1, f: ((e[4] || 0) & 4) >> 2};
  });
  Object.keys(atCell).forEach(k => { const pre = k.slice(0, 2); if (!byBoard[pre]) byBoard[pre] = []; }); // 0포인트 역상만 있는 계열도 표시
  gbExtra.forEach(pre => { if (BOARDS[pre] && !byBoard[pre]) byBoard[pre] = []; }); // 직접 찍으려고 펼친 계열
  [preset.gbPrism, preset.gbPrism2].forEach(g => { if (g && BOARDS[g.b] && !byBoard[g.b]) byBoard[g.b] = []; }); // 프리즘·역상만 놓은 계열
  // 위 핵심 재능 목록과 같은 계열 순서로 (목록에 없는 계열은 뒤에, 포인트 많은 순)
  const name2pre = {};
  Object.keys(BOARDS).forEach(p => { name2pre[BOARDS[p].n] = p; });
  const order = [];
  preset.talents.forEach(t => {
    if (talGroup(t.type) !== 0) return;
    const p = name2pre[t.type];
    if (p && byBoard[p] && order.indexOf(p) < 0) order.push(p);
  });
  Object.keys(byBoard)
    .filter(p => order.indexOf(p) < 0)
    .sort((a, b) => byBoard[b].reduce((s, x) => s + (pt[x] || 0), 0) - byBoard[a].reduce((s, x) => s + (pt[x] || 0), 0))
    .forEach(p => order.push(p));
  if (opt.only) { const keep = order.filter(p => opt.only.includes(p)); order.length = 0; keep.forEach(p => order.push(p)); }
  if (ED) { // 칸 순서로 다시 줄 세운다 (1번 신 → 2번 그 신의 하위 → 3·4번)
    const slotted = gbSlotsOf(new Set(order)).filter(Boolean);
    order.length = 0; slotted.forEach(p => order.push(p));
  }
  const total = gb.reduce((s, x) => s + x[1], 0);
  const over = total > GB_BUDGET;
  let h = opt.into ? '' : '<div class="sb-title gb-tg" onclick="toggleBoardPanel()">' + (gbOpen ? '▾' : '▸') + ' 🌳 재능 보드 <span class="psum">' +
    order.length + '계열 · ' + gb.length + '노드 · ' + '<b class="' + (over ? 'gb-over' : '') + '">' + total + ' / ' + GB_BUDGET + '포인트</b>' +
    (gbOpen ? ' · 노드에 마우스를 올리면 효과 표시' : '') + '</span>' +
    (viewing ? '' : ' <button class="btn-sel" onclick="gbOpenModal(event)">✏ 직접 찍기</button>') + '</div>';
  h += '<div class="gb-boards">';
  // 프리즘: 영향 범위(로그 prismEffectPositions)와 옵션이 강화하는 재능 등급
  const gps = [preset.gbPrism, preset.gbPrism2].filter(Boolean); // 프리즘·역상이 각각 다른 보드에 있을 수 있다
  const prismTiers = new Set(); // 1=하위 3=중위 4=레전드 중위 (노드 t값과 같은 체계)
  ((preset.prism || {}).opts || []).forEach(o => {
    const e = (o && o.effect) || '';
    if (/레전드 중위 재능/.test(e)) prismTiers.add(4);
    else if (/중위 재능/.test(e)) prismTiers.add(3);
    if (/하위 재능/.test(e)) prismTiers.add(1);
  });
  order.forEach(pre => {
    const b = BOARDS[pre], ids = BOARD_IDS[pre] || [];
    const bpt = gb.reduce((s, x) => s + (String(x[0]).slice(0, 2) === pre ? x[1] || 0 : 0), 0); // 역상 복사 칸 포함
    const xs = b.p.map(p => p[0]), ys = b.p.map(p => p[1]);
    const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1;
    const w = Math.max(...xs) - x0 + 2, hh = Math.max(...ys) - y0 + 2;
    // 로그 좌표(행·열 인덱스) → 우리 셀 좌표: 각 축의 고유값 오름차순 위치가 곧 인덱스
    const colVals = [...new Set(xs)].sort((a, c) => a - c);
    const rowVals = [...new Set(ys)].sort((a, c) => a - c);
    const rc2cell = (row, col) => { // 로그 좌표(행·열) → 렌더 셀 좌표
      const cx = colVals[col - 1], cy = rowVals[row - 1];
      return cx === undefined || cy === undefined ? null : cx + ',' + cy;
    };
    const inArea = new Set();   // 프리즘·역상 영향 범위 셀
    const mirrorArea = new Set(); // 역상: 보드 중심 기준 180° 반사된 범위
    const gpHere = gps.filter(g => g.b === pre);
    const gpInv = gpHere.find(g => g.k === 'i') || null;   // 이 보드의 역상
    const gpPri = gpHere.find(g => g.k !== 'i') || null;   // 이 보드의 프리즘
    let isInv = false;
    gpHere.forEach(g => {
      const inv = g.k === 'i';
      if (inv) isInv = true;
      const RMAX = rowVals.length + 1, CMAX = colVals.length + 1; // 반사 중심 = 보드 중앙 (행·열 합이 일정)
      g.c.forEach(([row, col]) => {
        const k = rc2cell(row, col);
        if (k) inArea.add(k);
        if (inv) { const k2 = rc2cell(RMAX - row, CMAX - col); if (k2) mirrorArea.add(k2); }
      });
    });
    // 직접 찍기 — 역상 복사 칸은 gbBumpM, 놓기 모드(gbPlace)면 노드를 눌러 프리즘·역상을 놓는다
    const edHere = ED && !viewing;
    const R = gbRules(pre), ptsEd = edHere ? gbPoints(pre) : null, ctx = gbCtx(pre);
    let svg = `<svg class="gb-svg${edHere ? ' gb-ed' : ''}" viewBox="0 ${edHere ? -6 : 0} ${w * 10} ${hh * 10 + (edHere ? 6 : 0)}" preserveAspectRatio="xMidYMid meet">`;
    if (edHere) R.xs.forEach((x, c) => { svg += `<text x="${(x - x0) * 10 + 5}" y="-1" class="gb-colreq">${R.req[c]}</text>`; });
    const areaBox = (cells, cls) => { // 영향 범위 = 게임처럼 통짜 네모 (직사각형이 아니면 칸 단위 폴백)
      if (!cells.size) return '';
      const ax = [...cells].map(k => +k.split(',')[0]), ay = [...cells].map(k => +k.split(',')[1]);
      const ax0 = Math.min(...ax), ax1 = Math.max(...ax), ay0 = Math.min(...ay), ay1 = Math.max(...ay);
      const cols = new Set(ax).size, rows = new Set(ay).size;
      const PAD = 2.8; // 노드 원과 테두리 사이 여유 (viewBox 여백이 한 칸=10이라 이 범위까진 안 잘림)
      if (cols * rows === cells.size) {
        return `<rect x="${(ax0 - x0) * 10 - PAD}" y="${(ay0 - y0) * 10 - PAD}" width="${(ax1 - ax0 + 1) * 10 + PAD * 2}" height="${(ay1 - ay0 + 1) * 10 + PAD * 2}" rx="2.5" class="${cls}"/>`;
      }
      return [...cells].map(k => {
        const [cx, cy] = k.split(',').map(Number);
        return `<rect x="${(cx - x0) * 10 - PAD}" y="${(cy - y0) * 10 - PAD}" width="${10 + PAD * 2}" height="${10 + PAD * 2}" rx="2" class="${cls}"/>`;
      }).join('');
    };
    svg += areaBox(inArea, isInv ? 'gb-area gb-inv' : 'gb-area') + areaBox(mirrorArea, 'gb-area gb-inv gb-mirror');
    (b.l || []).forEach(([ax, ay, bx, by]) => {
      svg += `<line x1="${(ax - x0) * 10 + 5}" y1="${(ay - y0) * 10 + 5}" x2="${(bx - x0) * 10 + 5}" y2="${(by - y0) * 10 + 5}" class="gb-line"/>`;
    });
    // 그릴 칸 목록 = 계열 기본 배치 + (역상이면) 반사로 새로 생기는 칸
    // 역상은 범위를 통째로 반대편에 복제하므로 원래 노드가 없던 칸에도 노드가 생긴다.
    // (로그 덤프는 배열을 30개에서 자르므로 반사 노드 일부가 빠질 수 있어 직접 계산한다)
    const cells = b.p.map((p, i) => ({x: p[0], y: p[1], i, row: rowVals.indexOf(p[1]) + 1, col: colVals.indexOf(p[0]) + 1,
                                      tier: (b.t && b.t[i]) || 1}));
    if (isInv) {
      const have = new Set(cells.map(c => c.x + ',' + c.y));
      const byRC = {};
      cells.forEach(c => { byRC[c.row + ',' + c.col] = c; });
      const RMAX2 = rowVals.length + 1, CMAX2 = colVals.length + 1;
      (gpInv ? gpInv.c : []).forEach(([row, col]) => {
        const src = byRC[row + ',' + col];
        if (!src) return;
        const k = rc2cell(RMAX2 - row, CMAX2 - col);
        if (!k || have.has(k)) return;
        const [x, y] = k.split(',').map(Number);
        const srcAt = atCell[pre + '|' + row + ',' + col];
        cells.push({x, y, i: -1, row: RMAX2 - row, col: CMAX2 - col,
                    tier: src.tier, // 복사본은 원본과 같은 등급 (레전드 중위도 그대로)
                    mirrorOf: srcAt ? srcAt.nid : ids[src.i]});
        have.add(k);
      });
    }
    const cellNode = c => { // 이 칸에 실제로 놓인 노드 (로그 위치 우선 → 반사 유래 → 기본 배치)
      const cd = atCell[pre + '|' + c.row + ',' + c.col];
      if (cd) return {nid: cd.nid, n: cd.n, mapped: !!cd.m, free: !!cd.f};
      const mk = c.row + ',' + c.col;
      if (ctx.mirror[mk] !== undefined) return {nid: ids[ctx.mirror[mk]], n: 0, mapped: true, free: true, unknown: !ED && c.i < 0}; // 역상 복사 칸 — 로그는 30개에서 잘려 포인트를 모를 수 있다
      if (c.i < 0) return {nid: c.mirrorOf, n: 0, mapped: true, free: true, unknown: !ED};
      return {nid: ids[c.i], n: ids[c.i] ? pt[ids[c.i]] || 0 : 0, mapped: false, free: false};
    };
    // 범위 안에서 실제로 찍은 노드 수·포인트 합 (등급별) — 프리즘 옵션 적용량 계산용.
    // 노드 툴팁에서도 쓰므로 렌더 루프보다 먼저 채운다
    const tierOn = {};
    cells.forEach(c => {
      const cn = cellNode(c);
      if (!cn.n || !inArea.has(c.x + ',' + c.y)) return;
      const tr = boardTier(cn.nid) || c.tier;
      const ta = tierOn[tr] || (tierOn[tr] = {n: 0, p: 0});
      ta.n++; ta.p += cn.n;
    });
    cells.forEach(c => {
      const p = [c.x, c.y], i = c.i;
      const cn = cellNode(c);
      const nid = cn.nid, n = cn.n, mapped = cn.mapped, freeNode = cn.free, unknownPt = !!cn.unknown;
      const tier = boardTier(nid) || c.tier; // 칸 위치가 아니라 실제로 놓인 노드 기준
      const varTxt = nid && gbRevelation(pre) ? gbVarText(nid) : ''; // 티아 「계시의 예언」으로 바뀐 칸
      const area = inArea.has(p[0] + ',' + p[1]);
      const boost = area && !!gpPri && gpPri.c.some(([r2, c2]) => r2 === c.row && c2 === c.col) && prismTiers.has(tier); // 프리즘 옵션이 이 등급을 강화 → 강조 (역상 범위는 아님)
      const gpNode = gpHere.find(g => g.nd && nid === g.nd);
      const isPrismNode = !!gpNode && !mapped; // 반사본이 아니라 원래 자리
      const cls = 'gb-node' + (n ? ' gb-on' : '') + (tier === 3 ? ' gb-mid' : tier === 4 ? ' gb-leg' : '') + (varTxt ? ' gb-var' : '') +
        (boost ? ' gb-boost' : '') + (isPrismNode ? ' gb-prism' : '') + (mapped ? ' gb-mapped' : '');
      // 툴팁은 게임처럼 포인트를 곱한 실제 수치로 (1포인트당 원문은 아래에 함께 표기)
      const base = varTxt || (nid ? boardNodeText(nid) : '');
      // 프리즘 장착 노드: 옵션 전문을 여기서 보여준다 (보드 아래 박스는 계산 결과만 남김)
      const prHead = isPrismNode
        ? (gpNode.k === 'i' ? '◆ 역상 장착 위치\n\n'
                 : '◆ ' + ((preset.prism || {}).name || '프리즘') + ' 장착 위치\n' +
                   ((preset.prism || {}).opts || []).filter(Boolean).map(o => '· ' + o.effect).join('\n') + '\n\n')
        : '';
      const tip = prHead + (n > 1 ? scaleEffect(base, n) : base) +
        (n ? '\n찍은 포인트: ' + n + (n > 1 ? ' (1포인트당 ' + base.replace(/^\[[^\]]*\]\s*/, '') + ')' : '') : '\n(미투자)') +
        (mapped ? '\n역상으로 반사된 노드' : '') + (isPrismNode ? '\n포인트 투자 불가' : freeNode ? '\n선행 조건 없이 투자 가능' : '') + (area ? '\n' + (isInv ? '역상 원본 범위' : '프리즘 영향 범위' + (boost ? ' · 프리즘 옵션 적용 대상' : '')) : '');
      // 스타일 툴팁(석판 보드와 같은 data-h 방식): 등급 제목 + 실수치 + 회색 보조줄 + 프리즘 안내
      const tierNm = {1: '하위 재능', 3: '중위 재능', 4: '레전드 중위 재능'}[tier] || '재능';
      const effTxt = (n > 1 ? scaleEffect(base, n) : base).replace(/^\[[^\]]*\]\s*/, '');
      const baseTxt = base.replace(/^\[[^\]]*\]\s*/, '');
      let tipH = '<div class="ft-title">' + escapeHtml(tierNm) + (n ? ' <span class="gb-tpt">' + n + '포인트</span>' : '') + '</div><div class="ft-body">';
      if (varTxt) tipH += '<div class="gb-tsub" style="color:#ffd98a">◆ 티아 「계시의 예언」으로 바뀐 재능 (4번째 보드)</div>';
      tipH += '<div class="gb-tmain">' + escapeHtml(effTxt || '(효과 정보 없음)') + '</div>';
      if (n > 1) tipH += '<div class="gb-tsub">1포인트당 ' + escapeHtml(baseTxt) + '</div>';
      if (!n) tipH += '<div class="gb-tsub">' + (unknownPt ? '투자 포인트 정보 없음 (게임 로그가 30칸까지만 기록)' : '아직 포인트를 넣지 않은 노드') + '</div>';
      if (mapped) {
        tipH += '<div class="gb-tmap">역상으로 반사된 노드 (반대편 범위에서 복사)</div>';
        // 반사 비율(로그 실측)을 적용한 실효 수치 — 합산 계산과 같은 값
        const gpi = gpHere.find(g => g.k === 'i' && g.iv);
        const pct = gpi ? ({1: gpi.iv.low, 3: gpi.iv.mid, 4: gpi.iv.leg})[tier] : undefined;
        if (pct !== undefined) {
          tipH += pct <= -100
            ? '<div class="gb-tno">반사 후 ' + escapeHtml(tierNm) + ' 효과 ' + pct + '% — 이 노드는 효과가 없습니다</div>'
            : '<div class="gb-tgain">→ 역상 ' + (pct >= 0 ? '+' : '') + pct + '% 적용: ' +
              escapeHtml(scaleEffect(baseTxt, Math.max(0, n || 0) * (1 + pct / 100)) || baseTxt) + '</div>';
        }
      }
      if (isPrismNode) tipH += '<div class="gb-tno">이 칸에는 포인트를 투자할 수 없습니다</div>';
      else if (freeNode) tipH += '<div class="gb-tfree">선행 조건 없이 바로 투자 가능</div>';
      if (area) tipH += '<div class="gb-tarea">' + (isInv ? '역상 원본 범위' : '프리즘 영향 범위' + (boost ? ' · 프리즘 옵션 적용 대상' : '')) + '</div>';
      if (isPrismNode && gpNode.k === 'i') { // 역상 장착 노드 — 반사 비율(로그 실측)을 보여준다
        tipH += '<div class="ft-sep"></div><div class="gb-tpname">◆ 역상</div>' +
          '<div class="gb-tsub">범위 안 노드를 보드 반대편(청록 점선)으로 반사합니다</div>' +
          (gpNode.iv ? [['하위', gpNode.iv.low], ['중위', gpNode.iv.mid], ['레전드 중위', gpNode.iv.leg]]
            .filter(([, v2]) => v2 !== undefined)
            .map(([t, v2]) => '<div class="gb-tsub">· 반사 후 ' + t + ' 재능 효과 ' + (v2 >= 0 ? '+' : '') + v2 + '%' +
              (v2 <= -100 ? ' (반사 효과 없음)' : '') + '</div>').join('')
          : '<div class="gb-tsub">반사 비율은 로그 가져오기로 채워집니다</div>');
      } else if (isPrismNode) { // 프리즘 옵션 전문 + 범위 안 실제 적용 합계 (보드 아래 상자와 같은 계산)
        const isPhantom = ((preset.prism || {}).name === '제노 프리즘: 환영'); // 랜덤 옵션 효과 +75%
        tipH += '<div class="ft-sep"></div><div class="gb-tpname">◆ ' + escapeHtml((preset.prism || {}).name || '프리즘') + '</div>' +
          (isPhantom ? '<div class="gb-tsub">고유: 랜덤 옵션의 효과 +75% (수치 옵션에 ×1.75 적용)</div>' : '') +
          ((preset.prism || {}).opts || []).filter(Boolean).map(o => {
            const e = o.effect || '';
            const mm = /범위 내의 모든 (레전드 중위|중위|하위) 재능 추가 획득:\s*(.+)$/.exec(e);
            if (!mm) return '<div class="gb-tsub">· ' + escapeHtml(e) + '</div>';
            const tt = mm[1] === '하위' ? 1 : mm[1] === '중위' ? 3 : 4, hh = tierOn[tt] || {n: 0, p: 0};
            const per = isPhantom ? scaleEffect(mm[2].trim(), 1.75) : mm[2].trim();
            return '<div class="gb-tsub">· ' + escapeHtml(isPhantom ? e.replace(mm[2].trim(), per) : e) + '</div>' +
              '<div class="gb-tgain">→ 범위 내 ' + escapeHtml(mm[1]) + ' 재능 ' + hh.n + '개 · ' + hh.p + '포인트 = ' +
              escapeHtml(hh.p ? scaleEffect(per, hh.p) : '(찍은 노드 없음)') + '</div>';
          }).join('');
      }
      let act = '', edCls = '';
      if (edHere && gbPlace) { // 놓기 모드 — 원래 자리 노드만
        const whyP = mapped || i < 0 ? '복사 칸에는 놓을 수 없습니다' : gbWhyNotPlace(pre, i, gbPlace);
        edCls = whyP ? ' gb-lock' : ' gb-can gb-placeable';
        tipH += '<div class="ft-sep"></div>' + (whyP ? '<div class="gb-tno">' + escapeHtml(whyP) + '</div>' : '<div class="gb-tfree">눌러서 ' + (gbPlace === 'i' ? '역상' : '프리즘') + '을 여기에 놓기</div>');
        if (!whyP) act = ` onclick="gbPlaceAt('${pre}',${i})"`;
      } else if (edHere && mapped) { // 역상 복사 칸
        const mk = c.row + ',' + c.col, si = ctx.mirror[mk], cur = ctx.mpts[mk] || 0;
        if (si !== undefined) {
          const whyAdd = gbWhyNotM(pre, mk, 1, ptsEd, ctx);
          if (whyAdd && !cur) edCls = ' gb-lock'; else if (!whyAdd) edCls = ' gb-can';
          tipH += '<div class="ft-sep"></div><div class="gb-tsub">' + cur + ' / ' + R.max[si] + '포인트 · 클릭 +1 · 우클릭 −1 (선행 조건 없음)</div>' +
            (whyAdd && cur < R.max[si] ? '<div class="gb-tno">' + escapeHtml(whyAdd) + '</div>' : '');
          act = ` onclick="gbBumpM('${pre}',${c.row},${c.col},event.shiftKey?-1:1)" oncontextmenu="gbBumpM('${pre}',${c.row},${c.col},-1);return false"`;
        }
      } else if (edHere && i >= 0 && !isPrismNode) {
        const whyAdd = gbWhyNot(pre, i, 1, ptsEd, ctx);
        if (whyAdd && !(ptsEd[i] > 0)) edCls = ' gb-lock';
        else if (!whyAdd) edCls = ' gb-can';
        tipH += '<div class="ft-sep"></div><div class="gb-tsub">' + ptsEd[i] + ' / ' + R.max[i] + '포인트 · 클릭 +1 · 우클릭 −1</div>' +
          (whyAdd && ptsEd[i] < R.max[i] ? '<div class="gb-tno">' + escapeHtml(whyAdd) + '</div>' : '');
        act = ` onclick="gbBump('${pre}',${i},event.shiftKey?-1:1)" oncontextmenu="gbBump('${pre}',${i},-1);return false"`;
      }
      tipH += '</div>';
      const cxp = (p[0] - x0) * 10 + 5, cyp = (p[1] - y0) * 10 + 5;
      svg += `<circle cx="${cxp}" cy="${cyp}" r="4.2" class="${cls}${edCls} tip2" title="${escapeHtml(tip)}" data-h="${escapeHtml(tipH).replace(/"/g, '&quot;')}"${act}/>` +
        (n ? `<text x="${cxp}" y="${cyp + 0.2}" class="gb-pt">${n}</text>` : '') +
        // 프리즘 장착 표시: 노드를 감싸는 다이아몬드(◆) 링 — 원형 노드들과 확실히 구분
        (isPrismNode ? `<rect x="${cxp - 4.6}" y="${cyp - 4.6}" width="9.2" height="9.2" rx="0.8" transform="rotate(45 ${cxp} ${cyp})" class="gb-pmark"/>` : '');
    });
    svg += '</svg>';
    const pnote = gpHere.map(g => {
      const inv = g.k === 'i';
      return ' <span class="gb-ptag' + (inv ? ' gb-itag' : '') + '">◆ ' + (inv ? '역상 ' : '프리즘 ') + g.c.length + '칸' +
        (inv ? ' · 반대편 복사' : prismTiers.size ? ' · ' +
          [...prismTiers].sort().map(t => ({1: '하위', 3: '중위', 4: '레전드 중위'})[t]).join('·') + ' 강화' : '') + '</span>';
    }).join('');
    // 노드 수 대신 이 계열에서 고른 핵심 재능 이름 ([등대] 같은 대괄호 명칭)
    const cores = preset.talents.filter(t => talGroup(t.type) === 0 && name2pre[t.type] === pre)
      .map(t => (/\[([^\]]+)\]/.exec(t.effect) || [0, ''])[1]).filter(Boolean);
    h += `<div class="gb-card"><div class="gb-name">${gbEmb(pre, 'gb-nemb')}${escapeHtml(b.n)} <span class="psum">${bpt}pt</span> ` +
      (cores.length ? `<span class="gb-core">✨ ${escapeHtml(cores.join(' · '))}</span>` : '') +
      `${pnote}` +
      `</div>${svg}</div>`;
  });
  wrap.innerHTML = h + '</div>';
  wrap.style.display = '';
}

// ── 단독 화면(/tli/hero · /tli/talent) 공용 연결부 (2026-10-08) ──
// 빌더를 통째로 띄우지 않고 기능 조각(00_*.js)과 그 데이터만 싣는다.
// 빌드는 빌더와 같은 브라우저 저장소(tlidb_presets_v1)의 활성 빌드 — 여기서 바꾼 것이 빌더에 그대로 보인다.
// 각 화면은 pageRender(다시 그리기)·pageOnSwitch(빌드 바꿀 때 정리, 선택)를 정의한다.
const PRESETS_KEY = 'tlidb_presets_v1';
const KEY_MAP = new Map(); // 옵션 문구는 저장된 effect 로 읽는다 ((KEY_MAP.get(k) || o).effect 폴백)
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
}
const _stripDiv = document.createElement('div');
function stripHtml(s) { _stripDiv.innerHTML = String(s).replace(/<br\s*\/?>/gi, ' '); return _stripDiv.textContent.replace(/\s+/g, ' ').trim(); } // 빌더 05_ui 와 같음
function hpLoad() {
  try { const p = JSON.parse(localStorage.getItem(PRESETS_KEY)); if (p && Array.isArray(p.list) && p.list.length) return p; } catch (e) {}
  return {list: [{id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}}], activeId: 1};
}
let presets = hpLoad();
let preset = presets.list.find(p => p.id === presets.activeId) || presets.list[0];
if (!Array.isArray(preset.talents)) preset.talents = [];
// 되돌리기 — 빌더 01_core 의 undoPreset 과 같은 방식: 저장할 때마다 직전 상태를 쌓는다 (Ctrl+Z · Ctrl+Y)
const UNDO_MAX = 20;
const undoStack = [], redoStack = [];
let undoLast = JSON.stringify(presets), undoQuiet = false, undoTick = false; // undoQuiet: 되돌린 뒤 다시 그리는 중의 저장(정규화 등)은 이력에 안 쌓는다 · undoTick: 한 번 누름에 저장이 여러 번이어도 한 단계
function persistPreset() {
  const cur = JSON.stringify(presets);
  if (cur !== undoLast) {
    if (!undoQuiet && !undoTick) {
      undoStack.push(undoLast); if (undoStack.length > UNDO_MAX) undoStack.shift(); redoStack.length = 0;
      undoTick = true; setTimeout(() => { undoTick = false; }, 0);
    }
    undoLast = cur;
  }
  try { localStorage.setItem(PRESETS_KEY, cur); } catch (e) {}
}
function undoPreset(redo) {
  const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
  if (!from.length) return false;
  to.push(undoLast);
  presets = JSON.parse(from.pop());
  undoLast = JSON.stringify(presets);
  try { localStorage.setItem(PRESETS_KEY, undoLast); } catch (e) {}
  undoQuiet = true;
  try { hpUse(presets.list.find(p => p.id === presets.activeId) || presets.list[0]); pageRender(); } finally { undoQuiet = false; }
  return true;
}
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = (e.key || '').toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // 글자 입력은 브라우저 기본 되돌리기
  e.preventDefault();
  undoPreset(k === 'y' || e.shiftKey);
});
function renderPreset() { pageRender(); }
function guardShareView() { return false; }
// 위쪽 줄의 빌드 고르기 — 단추(히어로 얼굴 + 이름 ▾) → 빌드 목록 (2026-10-13, 기본 select 대체)
// 목록: 얼굴 · 이름 · 특성·메인 스킬 · 지난 시즌 표시, 빌드가 7개 이상이면 검색칸. 화면이 hpBuildActs() 를 두면 아래에 동작 단추(빌더2)
let hpBpQ = '';
const hpBpName = p => p.name || '빌드 ' + p.id;
function hpBpFace(p) {
  const tr = p.hero && typeof traitInfo === 'function' && traitInfo(p.hero.trait);
  return tr && tr.img ? `<img src="${tr.img}" alt="" loading="lazy">` : '<i>?</i>';
}
function hpBpSub(p) {
  const main = ['a1', 'a2', 'a3', 'a4', 'a5'].map(k => p.skills && p.skills[k] && p.skills[k].main).find(Boolean);
  return (p.shareEdit ? '✏ 공유 글 수정 중 · ' : '') + ([p.hero && p.hero.trait, main && main.name].filter(Boolean).join(' · ') || '비어 있음');
}
function hpBuildPicker() {
  return `<button type="button" class="hp-build hp-bp" onclick="hpBpToggle(this)" title="빌드 바꾸기">` +
    `<span class="hp-bp-face">${hpBpFace(preset)}</span><span class="hp-bp-nm">${escapeHtml(hpBpName(preset))}</span><svg class="hp-bp-car" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
function hpBpClose() { const m = document.getElementById('hpBp'); if (m) m.remove(); document.querySelectorAll('.hp-bp.open').forEach(b => b.classList.remove('open')); }
function hpBpToggle(btn) {
  if (document.getElementById('hpBp')) { hpBpClose(); return; }
  hpBpQ = '';
  const m = document.createElement('div');
  m.id = 'hpBp'; m.className = 'hp-bpm';
  document.body.appendChild(m);
  btn.classList.add('open');
  hpBpDraw();
  hpBpPlace();
  const q = m.querySelector('.hp-bp-q'); if (q) q.focus();
}
function hpBpPlace() { // 단추 바로 아래 — 스크롤·창 크기가 바뀌면 따라간다(단추가 다시 그려졌으면 새 단추 기준)
  const m = document.getElementById('hpBp'), btn = document.querySelector('.hp-bp.open') || document.querySelector('.hp-bp');
  if (!m || !btn) return;
  btn.classList.add('open');
  const r = btn.getBoundingClientRect();
  m.style.top = (r.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
}
function hpBpRows() {
  const q = hpBpQ.trim().toLowerCase(), cur = typeof wbSeason === 'function' ? wbSeason() : '';
  const rows = presets.list.slice().sort((a, b) => b.id - a.id).filter(p => !q || (hpBpName(p) + ' ' + hpBpSub(p)).toLowerCase().includes(q)).map(p =>
    `<button type="button" class="hp-bpr${p.id === preset.id ? ' on' : ''}" onclick="hpBpPick(${p.id})">` +
    `<span class="hp-bp-face">${hpBpFace(p)}</span><span class="hp-bpr-t"><b>${escapeHtml(hpBpName(p))}</b><small>${escapeHtml(hpBpSub(p))}</small></span>` +
    (p.season && cur && p.season !== cur ? `<span class="hp-bpr-se">${escapeHtml(p.season)}</span>` : '') +
    (p.id === preset.id ? '<span class="hp-bpr-ck">✓</span>' : '') + '</button>').join('');
  return `<div class="hp-bp-list">${rows || '<div class="hp-bp-none">맞는 빌드가 없습니다</div>'}</div>`;
}
function hpBpDraw() {
  const m = document.getElementById('hpBp'); if (!m) return;
  if (m.dataset.init) { m.querySelector('.hp-bp-list').outerHTML = hpBpRows(); return; }
  m.dataset.init = '1';
  m.innerHTML = (presets.list.length > 6 ? '<input class="hp-bp-q" type="search" placeholder="빌드 이름·히어로·스킬 검색" oninput="hpBpQ=this.value;hpBpDraw()"' +
    ' onkeydown="if(event.key===\'Enter\'){const b=document.querySelector(\'#hpBp .hp-bpr\');if(b)b.click();}">' : '') +
    hpBpRows() + (typeof hpBuildActs === 'function' ? '<div class="hp-bp-acts">' + hpBuildActs() + '</div>' : '');
}
function hpBpPick(id) { hpBpClose(); if (id !== preset.id) hpSwitch(id); }
document.addEventListener('mousedown', e => {
  const m = document.getElementById('hpBp');
  if (m && !m.contains(e.target) && !(e.target.closest && e.target.closest('.hp-bp'))) hpBpClose();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('hpBp')) hpBpClose(); });
window.addEventListener('resize', hpBpPlace);
window.addEventListener('scroll', hpBpPlace, true);
function hpUse(p) {
  preset = p;
  if (!Array.isArray(preset.talents)) preset.talents = [];
  if (typeof pageOnSwitch === 'function') pageOnSwitch();
}
function hpSwitch(id) {
  const p = presets.list.find(x => x.id === id);
  if (!p) return;
  presets.activeId = id;
  hpUse(p);
  persistPreset();
  pageRender();
}
// 다른 탭(빌더)에서 바꾸면 따라간다
window.addEventListener('storage', e => {
  if (e.key !== PRESETS_KEY) return;
  presets = hpLoad(); undoLast = JSON.stringify(presets);
  hpUse(presets.list.find(p => p.id === presets.activeId) || presets.list[0]);
  pageRender();
});
// 툴팁 — 빌더의 .tip2 툴팁을 가볍게: data-h(미리 만든 HTML) 또는 title(첫 줄 제목 + 나머지 본문). 마우스를 올리면 표시
const floatTip2 = document.createElement('div');
floatTip2.id = 'floatTip2';
document.body.appendChild(floatTip2);
let tip2Pin = null; // 눌러서 띄운 툴팁 (터치 화면·밑줄 용어) — 다른 데를 누르면 닫는다
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('.tip2');
  const term = el && el.tagName === 'SPAN' && !el.hasAttribute('onclick'); // 문구 속 밑줄 용어
  if (el && (term || matchMedia('(hover: none)').matches)) { tip2Pin = el; tip2Show(el); return; }
  if (tip2Pin) { tip2Pin = null; floatTip2.style.display = 'none'; }
});
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('.tip2');
  if (!el) { if (!tip2Pin) floatTip2.style.display = 'none'; return; }
  tip2Pin = null; tip2Show(el);
});
function tip2Show(el) {
  if (el.getAttribute('title')) { el.dataset.t = el.getAttribute('title'); el.removeAttribute('title'); } // 브라우저 기본 툴팁과 겹치지 않게
  if (el.dataset.h) floatTip2.innerHTML = el.dataset.h;
  else if (el.dataset.t) {
    const ls = el.dataset.t.split('\n');
    floatTip2.innerHTML = `<div class="ft-title">${escapeHtml(ls[0])}</div>` + (ls.length > 1 ? `<div class="ft-body">${ls.slice(1).map(escapeHtml).join('\n')}</div>` : '');
  } else { floatTip2.style.display = 'none'; return; }
  floatTip2.style.display = 'block';
  const r = el.getBoundingClientRect(), w = floatTip2.offsetWidth, h = floatTip2.offsetHeight;
  const x = Math.min(Math.max(8, r.left), innerWidth - w - 8);
  let y = r.bottom + 8;
  if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
  floatTip2.style.left = x + 'px'; floatTip2.style.top = y + 'px';
}
// 단계 제목 옆 ⓘ — 게임 규칙 설명 (빌더 1 패널 ⓘ 의 규칙 부분을 옮김, 2026-10-09). 화면 조작법은 각 머리줄에
const GBM_HELP = {
  hero: ['히어로 특성', ['1~4번 노드가 왼쪽부터 이어지고, 단계마다 하나만 고릅니다 (1번은 기본이라 늘 보유)',
    '단계 레벨은 따라가는 추억의 레벨입니다 — 이미테이션 추억 · 근원 · 자기 수호 · 진격 순',
    '추억 등급이 기본 레벨(절대 3 · 엘리트/레어 2 · 매직/일반 1)이고, 추억의 \'히어로 특성 레벨 +2\' 옵션이 더해집니다',
    '약재가 있는 노드는 분류마다 3종 중 1개를 고릅니다']],
  talent: ['재능 보드', ['1번 칸 = 신 보드, 2번 = 그 신의 하위 보드, 3·4번 = 자유 (3·4번은 끌어서 순서 바꾸기)',
    '열 위 숫자 = 그 열을 여는 데 필요한 왼쪽 포인트 · 노드마다 최대 포인트가 있습니다',
    '핵심 재능: 보드 이름 옆 동그라미 — 신 보드 12·24pt, 하위 보드 24pt에서 하나씩 (모자라도 눌러서 미리 보기)',
    '프리즘·역상: 보드 머리 버튼으로 빌드당 하나씩 — 신 보드엔 못 놓고, 둘은 서로 다른 보드에']],
  skill: ['스킬', ['액티브 5칸 + 패시브 4칸, 칸마다 보조 5칸',
    '액티브 칸에는 모듈화 스킬(모듈: OO)도 넣을 수 있습니다',
    '보조칸: 1번 = 촉발체 + 일반, 3번 = 부귀 + 일반, 5번 = 숭고 + 일반, 2·4번 = 일반']],
  gear: ['장비', ['레전드: 칸을 누르고 목록에서 고르기 (양손 무기는 무기 두 칸)',
    '제작: 부위(베이스) → 기본 2 · 메인 3 · 서브 3 옵션, 절대자·진급 옵션은 각 2개까지',
    '블러드: 빌드당 1개, 무기 칸 제외 — 부위마다 베이스가 정해져 있습니다',
    '조향 = 벨트 전용 1줄 · 시퀀스 = 무기 칸마다 1줄',
    '침식: 옵션 줄을 눌러 강화 (레전드·제작 2개, 블러드 3개)',
    'T0/T1/T2: 제작 옵션 수치를 그 티어 기준으로 표시 (그 티어가 없는 옵션은 T1)']],
  slate: ['석판 시뮬레이터', ['위에서 석판을 고르고 판의 빈 칸을 누르면 놓입니다 (들어가는 방향으로 자동 회전)',
    '놓인 석판을 누르면 회전 · 신격 모양 · 삭제 · 옵션 소켓 — 끌어서 옮기기도 됩니다',
    '레전드 석판은 종류마다 1개, 명왕 석판은 하나만 — 겹치거나 판 밖이면 ⚠',
    '칸에 마우스를 올리면 그 칸의 옵션·복제·전염 같은 파생 효과, 이어진 석판이 함께 강조됩니다',
    '아래 \'적용되는 효과\' = 지금 배치에서 실제로 걸리는 재능 옵션 합계 · 빌더의 같은 빌드에 저장']],
  mem: ['추억 · 석판 · 정령', ['추억: 기본 속성 1 · 고유 옵션 2 · 랜덤 옵션 2 — 추억 등급이 히어로 특성 레벨의 기준',
    '부활 옵션: 추억 하나에만 — \'추가 슬롯\' 옵션이면 추가 추억을 하나 더 만듭니다',
    '신격 석판: 판에 놓고 소켓마다 옵션을 고릅니다 (석판 종류별 개수 제한)',
    '전투 정령: 최대 3개, 정령마다 노드 10개 + 미정 숙명 칸 1개',
    '노드 자리에 운명(숙명)을 끼우면 그 노드 대신 운명 효과가 걸리고, 미정 숙명을 끼우면 운명 칸이 최대 5개까지 늘어납니다']],
};
function gbmHelp(key) {
  const h = GBM_HELP[key]; if (!h) return '';
  const html = '<div class="ft-title">' + escapeHtml(h[0]) + '</div><div class="ft-body">' + h[1].map(l => '· ' + escapeHtml(l)).join('<br>') + '</div>';
  return `<span class="gbm-help tip2" data-h="${escapeHtml(html).replace(/"/g, '&quot;')}">ⓘ</span>`;
}
// 연타(더블클릭) 때 글자가 드래그 선택되지 않게 — 재능 노드처럼 여러 번 눌러야 하는 버튼 (2026-10-12)
// 입력칸·본문 글은 그대로 두고, 누르는 요소(버튼·onclick·노드 등)에서만 두 번째 누름부터 선택을 막는다
if (!window._noDblSel) {
  window._noDblSel = true;
  document.addEventListener('mousedown', e => {
    if (e.detail < 2 || !(e.target instanceof Element)) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.target.closest('button, a, [onclick], [role="button"], svg, .gb-node, .tn-node, label')) e.preventDefault();
  });
}

// ── 단독 화면의 재능 보드 데이터·툴팁 — /tli/talent · /tli/builder2 공용 ──
// 노드 ID·효과 문구는 생성기가 미리 뽑아 둔 TALENT_NODES(계열 → [[노드ID, 효과]…], 노드 ID 오름차순)에서 읽는다.
// 빌더는 같은 값을 장비·옵션 데이터(SLATEIDX)에서 바로 구한다 — 둘이 같아야 한다(test_talent_page.js 가 대조).
const BOARD_IDS = {}, NODE_FX = {};
Object.keys(TALENT_NODES).forEach(pre => {
  BOARD_IDS[pre] = TALENT_NODES[pre].map(x => x[0]);
  TALENT_NODES[pre].forEach(([nid, fx]) => { NODE_FX[nid] = fx; });
});
function boardNodeText(nid) { return NODE_FX[nid] !== undefined ? NODE_FX[nid] : '노드 ' + nid; }
function boardTier(nid) {
  const e = NODE_FX[nid] || '';
  return /^\[레전드 중위/.test(e) ? 4 : /^\[중위/.test(e) ? 3 : /^\[하위/.test(e) ? 1 : 0;
}
// 노드 툴팁은 page_common.js 공용 (.tip2 — data-h 또는 title)

// ── /tli/talent 단독 화면 (page_common.js · talent_glue.js 다음에 붙는다) ──
function pageRender() { gbRenderModal(); }
function pageOnSwitch() { gbExtra.clear(); gbMsg = ''; gbSlot = 0; }
gbOpenModal();
