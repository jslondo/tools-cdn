// 생성물 — 고칠 땐 update/src/js/00_hero.js · update/src/page_common.js · update/src/hero_glue.js · update/src/hero_page.js (build_html2.build_tool_pages)
// ── 히어로·히어로 특성 공용 조각 (2026-10-08) ──
// 빌더(이 묶음의 맨 앞)와 따로 떨어진 히어로 화면(/tli/hero, tli/hero/hero.js)이 함께 쓴다.
// 기대하는 바깥 것: HERO(특성 데이터) · preset(활성 빌드) · persistPreset · renderPreset · guardShareView · escapeHtml · KEY_MAP
// (빌더는 01_core 등에 있고, 히어로 화면은 hero_page.js 가 가볍게 채운다)
// 히어로 특성 태그 — worker.js의 HERO_TAGS 화이트리스트와 반드시 일치해야 함
// 각 특성 = [축약, 정식, 초상화(cdn.tlidb.com Portrait 경로), 별명들(검색 전용 — 태그로는 미사용, 워커 무관)]
// 숫자 축약(젬마1 등)은 인게임 특성 번호 = 초상화 파일 번호 기준
const HERO_IMG_BASE = 'https://cdn.tlidb.com/UI/Textures/Common/Icon/Portrait/';
const SHARE_HEROES = [
  ['리한', [['리한1', '분노의 불꽃', 'Rehan/UI_Portrait_Rehan_01_128.webp', ['분노리한']], ['리한2', '성난 그림자', 'Rehan/UI_Portrait_Rehan_02_128.webp', ['선조리한']]]],
  ['카리노', [['카리노1', '영광의 레인저', 'Carino/UI_Portrait_Carino_01_128.webp', ['구리노']], ['카리노2', '치명적 찰나', 'Carino/UI_Portrait_Carino_02_128.webp'], ['카리노3', '전쟁 광인', 'Carino/UI_Portrait_Carino_03_128.webp', ['전쟁광인']]]],
  ['에리카', [['에리카1', '질풍 추격', 'Erika/UI_Portrait_Erika_01_128.webp', ['구리카']], ['에리카2', '라이트닝 쉐도우', 'Erika/UI_Portrait_Erika_02_128.webp', ['번냥이']], ['에리카3', '리벤지 스파이크', 'Erika/UI_Portrait_Erika_03_128.webp', ['플냥이']]]],
  ['빈', [['빈1', '블래스트 노바', 'Bing/UI_Portrait_Bing_01_128.webp'], ['빈2', '크리에이티브 지니어스', 'Bing/UI_Portrait_Bing_02_128.webp']]],
  ['젬마', [['젬마1', '빙화 융합', 'Gemma/UI_Portrait_Gemma_01_128.webp', ['빙화젬마']], ['젬마2', '프로즌 하트', 'Gemma/UI_Portrait_Gemma_02_128.webp', ['프하']], ['젬마3', '향락의 불꽃', 'Gemma/UI_Portrait_Gemma_03_128.webp', ['불젬마']]]],
  ['티아', [['티아1', '신들의 위대한 지혜', 'Thea/UI_Portrait_Thea_01_128.webp', ['구티아']], ['티아2', '신들의 화신', 'Thea/UI_Portrait_Thea_02_128.webp', ['뉴티아']], ['티아3', '모독된 신성', 'Thea/UI_Portrait_Thea_03_128.webp', ['흑티아']]]],
  ['유가', [['유가1', '시공간의 환상', 'Youga/UI_Portrait_Youga_01_128.webp', ['환상유가']], ['유가2', '시공 유실', 'Youga/UI_Portrait_Youga_02_128.webp', ['유실유가']], ['유가3', '최후의 존재', 'Youga/UI_Portrait_Youga_03_128.webp', ['최후유가']]]], // 유가3 = SS14
  ['모토', [['모토1', '소집 명령', 'Moto/UI_Portrait_Moto_01_128.webp', ['소환모토', '소집모토']], ['모토2', '돌격 소집', 'Moto/UI_Portrait_Moto_02_128.webp', ['자폭모토']]]],
  ['로사', [['로사1', '홀리 채리엇', 'Rosa/UI_Portrait_Rosa_01_128.webp'], ['로사2', '언설리드 블레이드', 'Rosa/UI_Portrait_Rosa_02_128.webp']]],
  ['아이리스', [['아이리스1', '성장의 미풍', 'Iris/UI_Portrait_Iris_01_128.webp'], ['아이리스2', '수호의 온풍', 'Iris/UI_Portrait_Iris_02_128.webp']]],
  ['셀레나', [['셀레나1', '파도와 함께하는 노래', 'Selena/UI_Portrait_Selena_01_128.webp'], ['셀레나2', '바다와 함께하는 춤', 'Selena/UI_Portrait_Selena_02_128.webp']]],
  ['세이지', [['세이지', '리코리스 노트', 'Sage/UI_Portrait_Sage_01_128.webp']]],
];
// 태그 → 특성 정보 (히어로 배타 선택·초상화·별명 검색용): 같은 특성의 두 표기는 같은 trait 키를 가짐
const SHARE_TAG_TRAIT = new Map();
SHARE_HEROES.forEach(([hero, traits]) => traits.forEach((tr, i) =>
  [tr[0], tr[1]].forEach(t => SHARE_TAG_TRAIT.set(t, {hero, key: hero + '#' + i, img: HERO_IMG_BASE + tr[2],
    full: tr[1], al: tr[3] || []}))));
function traitInfo(tag) { return SHARE_TAG_TRAIT.get(tag) || null; }
// 공유 올리기 태그 (06_share 에서 옮김 2026-10-09 — 빌더 2 공유 올리기도 쓴다)
const SHARE_SKILL_TAGS = ['보조', '범위', '물리', '주술', '지속', '화염', '공격', '번개', '부식', '냉기', '투사체', '근접전', '오라', '수평 사격', '자극', '소환', '원거리', '촉발체', '영약', '위치 이동', '채널링', '실드', '마령', '주입', '지면', '보초병', '광선', '회복', '기본 스킬', '강화 스킬', '궁극 스킬', '함성', '저주', '베기', '체인', '파괴', '스마트 웨폰', '포물선', '수직', '폭격', '그림자', '콤보'];
const SHARE_EXTRA_TAGS = ['스태킹', '전의', '힘', '민첩', '지혜'];
const SHARE_CONTENT_TAGS = ['엑트', '7만계', '8만계', '8T', '엔드', '아득', '딥스', '20층', '21층'];
function heroLabel(h) {
  if (!h || !h.trait) return '';
  const tr = traitInfo(h.trait);
  return h.hero + ' · ' + (tr ? tr.full : h.trait);
}

// ── 히어로 특성 ──
// 노드는 레벨 조건 1/45/60/75의 네 단계로 나뉘고, 단계마다 하나만 고른다(1단계는 특성 기본이라 늘 보유).
// 단계 레벨 = 그 단계가 따라가는 추억의 레벨이다 (사용자 확인):
//   0단계 = 부활 옵션으로 더 낀 추억(없으면 1레벨 고정) · 1 = 근원 · 2 = 자기 수호 · 3 = 진격
// 추억 등급이 곧 기본 레벨이고(절대자 3 · 엘리트/레어 2 · 그 이하 1), 그 추억의
// "히어로 특성 레벨 +2" 고유 옵션이 여기에 더해진다. 상한 5.
const HERO_STEP_MEM = [null, '근원의 추억', '자기 수호의 추억', '진격의 추억'];
const HERO_GRADES = [ // [키, 이름, 히어로 특성 레벨, 티어 표기]
  ['abs', '절대', 3, 0],
  ['elite', '엘리트', 2, 1],
  ['rare', '레어', 2, 2],
  ['magic', '매직', 1, 3],
  ['normal', '일반', 1, 4],
];
const HERO_LV_MAX = 5;
function heroTraitData() { // 빌드에 고른 히어로 특성의 노드 데이터 (태그는 축약형, 데이터는 정식명)
  const h = preset.hero;
  if (!h || !h.trait) return null;
  const tr = traitInfo(h.trait);
  return HERO.find(x => x.trait === (tr ? tr.full : h.trait)) || null;
}
function memGrade(part) { return (preset.memGrade || {})[part] || 'normal'; }
function memGradeLv(part, mem) { // 추억 등급 + "히어로 특성 레벨 +N" 옵션
  if (!mem) return 1;
  const g = HERO_GRADES.find(x => x[0] === memGrade(part)) || HERO_GRADES[HERO_GRADES.length - 1];
  let lv = g[2];
  ['basic', 'unique', 'random'].forEach(k => (mem[k] || []).forEach(o => {
    const m = ((KEY_MAP.get(o.k) || o).effect || '').match(/히어로 특성 레벨 \+(\d+)/);
    if (m) lv += +m[1];
  }));
  return Math.min(HERO_LV_MAX, lv);
}
function heroStepLevel(step) {
  if (step === 0) { // 부활 옵션으로 추가한 추억을 따라간다 — 그 추억이 없으면 1레벨
    const rv = preset.revival, xp = rv && revivalExtraPart(rv.effect);
    return xp && rv.mem ? memGradeLv(xp + '#x', rv.mem) : 1;
  }
  const part = HERO_STEP_MEM[step];
  return part ? memGradeLv(part, (preset.mems || {})[part]) : 1;
}
// 효과 문구의 (20/25/30/40/50) 다섯 값이 레벨 1~5 — 그 레벨 값만 남긴다
function heroText(line, lv) {
  return (line || '').replace(/\(([+-]?[\d.]+(?:\/[+-]?[\d.]+){2,})\)/g, (m, body) => {
    const vs = body.split('/');
    const v = vs[Math.min(lv, vs.length) - 1];
    if (/^[+-]/.test(v)) return v;
    // 부호를 생략한 값은 같은 묶음의 부호를 잇는다 ("+1/1.5/+2" → 1.5는 +1.5)
    const sgn = (vs.find(x => /^[+-]/.test(x)) || '')[0] || '';
    return sgn + v;
  });
}
// 레벨 표기가 두 형식이라 여기서 하나로 푼다:
// 인라인 (100/120/…)은 heroText로, tierLevel 블록(lv_lines·lv_herbs)은 그 레벨 것을 그대로
// 노드 문구 속 용어(공식 패치노트의 '시공간의 독재자' 등)에 설명 툴팁 — 긴 용어부터, 한 번씩
function heroTipWrap(line, tips) {
  if (!tips) return escapeHtml(line);
  // 원문에서 겹치지 않는 자리를 먼저 정한 뒤 한 번에 감싼다 (감싼 span 의 title 안 글자를 또 감싸면 HTML 이 깨진다)
  const marks = [];
  Object.keys(tips).sort((a, b) => b.length - a.length).forEach(t => {
    let p = line.indexOf(t);
    while (p >= 0 && marks.some(m => p < m.e && p + t.length > m.s)) p = line.indexOf(t, p + 1);
    if (p >= 0) marks.push({s: p, e: p + t.length, t});
  });
  marks.sort((x, y) => x.s - y.s);
  let h = '', i = 0;
  marks.forEach(m => { h += escapeHtml(line.slice(i, m.s)) + `<span class="tip2" title="${escapeHtml(m.t + '\n' + tips[m.t])}">${escapeHtml(m.t)}</span>`; i = m.e; });
  return h + escapeHtml(line.slice(i));
}
function heroNodeLines(n, lv) {
  if (n.lv_lines) return n.lv_lines[Math.min(lv, n.lv_lines.length) - 1] || [];
  return (n.lines || []).map(l => heroText(l, lv));
}
function heroNodeHerbs(n, lv) { // [{cat, items:[{name,text}]}] — 분류마다 3종 중 1개
  const hs = n.lv_herbs ? n.lv_herbs[Math.min(lv, n.lv_herbs.length) - 1] : n.herbs;
  if (!hs) return [];
  return n.lv_herbs ? hs : hs.map(h => ({cat: h.cat, items: h.items.map(i => ({name: i.name, text: heroText(i.text, lv)}))}));
}
function heroHerbKey(n, cat) { return n.name + '|' + cat; }
function pickHeroHerb(nodeName, cat, itemName) {
  if (guardShareView()) return;
  if (!preset.heroHerbs) preset.heroHerbs = {};
  const key = nodeName + '|' + cat;
  if (preset.heroHerbs[key] === itemName) delete preset.heroHerbs[key]; // 다시 누르면 해제
  else preset.heroHerbs[key] = itemName;
  persistPreset();
  renderPreset();
  if (hrModalOpen) hrRenderModal();
}
// 찍는 수는 기본 노드 빼고 3개 (사용자 확인 2026-10-08)
//  · 보통 특성 — 단계(45/60/75)마다 하나. heroNodes = {단계: 노드 이름}
//  · 갈래 특성(t.tree, 셀레나 「바다와 함께하는 춤」·S14 유가) — 기본에서 뻗은 갈래를 따라 이어진 노드만,
//    합쳐 3개. heroNodes = {노드 code(게임 ID 끝 두 자리, 십의 자리 = 갈래): 노드 이름}
const HERO_PICKS = 3;
// SS14 유가 「최후의 존재」: 추억 부활 옵션 '전 우주에 존재하는 유가 최대치 +1'(패치노트 '전 우주의 유가 존재 상한 +1') —
// 앞의 세 특성을 활성화하면 네 번째 히어로 특성을 하나 더 (그 특성은 바로 최고 레벨). 빌더는 찍을 수를 4로 늘리고 레벨은 안내만 (2026-10-10)
const heroExtraPick = t => !!(t && t.trait === '최후의 존재' && /유가.*(최대치|상한)\s*\+1/.test(((preset.revival || {}).effect) || ''));
const heroPickMax = t => HERO_PICKS + (heroExtraPick(t) ? 1 : 0);
const heroIsTree = t => !!(t && t.tree);
function heroPicked(t) { // 기본 노드를 뺀, 지금 찍힌 노드들
  const pick = preset.heroNodes || {};
  if (!t) return [];
  if (heroIsTree(t)) return (t.nodes || []).filter(n => n.step && pick[n.code] === n.name);
  return (t.nodes || []).filter(n => n.step && pick[n.step] === n.name);
}
function heroNodesOn() { // 이 빌드가 실제로 보유한 노드 [{node, lv}]
  const t = heroTraitData();
  if (!t) return [];
  const got = new Set(heroPicked(t));
  return (t.nodes || []).filter(n => n.step === 0 || got.has(n))
    .map(n => ({n, lv: heroStepLevel(n.step)}));
}
// 갈래 특성에서 이 노드를 찍을 수 없는 이유 — 되면 '' (빼기는 늘 된다)
function heroWhyNot(t, n, add) {
  if (!heroIsTree(t) || !n.step) return '';
  const got = heroPicked(t);
  if (add) {
    if (got.length >= heroPickMax(t)) return '히어로 특성은 기본 외 ' + heroPickMax(t) + '개까지입니다' + (t.trait === '최후의 존재' && !heroExtraPick(t) ? ' (추억 부활 옵션 「전 우주에 존재하는 유가 최대치 +1」이면 4개)' : '');
    const par = (t.nodes || []).find(x => x.name === n.par);
    if (par && par.step && !got.includes(par)) return '앞 노드 「' + par.name + '」를 먼저 찍어야 합니다';
    return '';
  }
  return ''; // 빼기는 막지 않는다 — 이어진 뒤 노드가 함께 빠진다 (pickHeroNode)
}
let heroMsg = '';
function pickHeroNode(step, name) {
  if (guardShareView()) return;
  if (!preset.heroNodes) preset.heroNodes = {};
  const t = heroTraitData(), n = t && (t.nodes || []).find(x => x.name === name);
  heroMsg = '';
  if (heroIsTree(t)) {
    if (!n || !n.step) return;
    const on = preset.heroNodes[n.code] === name;
    if (on) { // 빼기 — 이 노드에 이어진 뒤 노드도 함께 뺀다 (사용자 요청: 막지 말고 같이 빠지게)
      const drop = [n];
      for (let i = 0; i < drop.length; i++)
        heroPicked(t).filter(x => x.par === drop[i].name && !drop.includes(x)).forEach(x => drop.push(x));
      drop.forEach(x => delete preset.heroNodes[x.code]);
    } else {
      const why = heroWhyNot(t, n, true);
      if (why) heroMsg = '⚠ ' + why;
      else preset.heroNodes[n.code] = name;
    }
  } else if (preset.heroNodes[step] === name) delete preset.heroNodes[step]; // 다시 누르면 해제
  else preset.heroNodes[step] = name;
  persistPreset();
  renderPreset();
  if (hrModalOpen) hrRenderModal();
}
// ── 히어로 화면 — 히어로 → 특성 → 노드. 빌더에서는 팝업(#hrModal), 따로 떨어진 /tli/hero 에서는 페이지(#heroApp)에 그린다 ──
let hrModalOpen = false, hrView = null; // hrView = 왼쪽에서 보고 있는 히어로
const hrHeroPage = () => !!document.getElementById('heroApp'); // /tli/hero 단독 화면
const HR_STEP = [['기본', 1, '이미테이션 추억'], ['근원', 45, '근원의 추억'], ['자기 수호', 60, '자기 수호의 추억'], ['진격', 75, '진격의 추억']];
function hrIconUrl(tag, n) { // 노드 아이콘 — 폴더 이름이 초상화 폴더와 같다 (Selena/UI_Selena221)
  if (n.img) return n.img; // 공식 패치노트에서 받은 아이콘 (새 특성 — tlidb 그림이 아직 없을 때)
  const tr = traitInfo(tag), f = tr && ((tr.img.split('/Portrait/')[1] || '').split('/')[0]);
  return f && n.icon ? 'https://cdn.tlidb.com/UI/Textures/Common/Icon/Skill/HeroTraits/' + f + '/' + n.icon + '.webp' : '';
}
function hrOpenModal() {
  if (guardShareView()) return;
  hrModalOpen = true; heroMsg = '';
  hrView = (preset.hero && preset.hero.hero) || hrView || SHARE_HEROES[0][0];
  hrRenderModal();
}
function hrCloseModal() {
  if (hrHeroPage()) { location.href = '/tli/builder/'; return; } // 고른 것은 같은 빌드(브라우저 저장)라 빌더에 그대로 보인다
  hrModalOpen = false; heroMsg = '';
  const el = document.getElementById('hrModal'); if (el) el.style.display = 'none';
  renderPreset();
}
function hrPickHero(h) { hrView = h; heroMsg = ''; hrRenderModal(); }
function hrRenderModal() {
  const page = document.getElementById('heroApp');
  let el = page || document.getElementById('hrModal');
  if (!el) {
    el = document.createElement('div'); el.id = 'hrModal'; el.className = 'gbm-dim hrm-dim';
    el.addEventListener('click', e => { if (e.target === el && !hrHeroPage()) hrCloseModal(); });
    document.body.appendChild(el);
  }
  const cur = preset.hero || null;
  const entry = SHARE_HEROES.find(x => x[0] === hrView) || SHARE_HEROES[0];
  // ── 왼쪽: 히어로 12명
  let side = '<div class="gbm-cap">히어로</div><div class="hrm-heroes">' + SHARE_HEROES.map(([h, trs]) =>
    `<div class="hrm-hero${h === entry[0] ? ' on' : ''}${cur && cur.hero === h ? ' have' : ''}" onclick="hrPickHero(${JSON.stringify(h).replace(/"/g, '&quot;')})">` +
    `<img src="${HERO_IMG_BASE + trs[0][2]}" loading="lazy" onerror="this.style.visibility='hidden'">` +
    `<b>${escapeHtml(h)}</b><small>${cur && cur.hero === h ? '선택됨' : '특성 ' + trs.filter(([, full]) => HERO.some(x => x.trait === full)).length}</small></div>`).join('') + '</div>';
  // ── 가운데 위: 이 히어로의 특성 카드
  const jh = JSON.stringify(entry[0]).replace(/"/g, '&quot;');
  let main = `<div class="gbm-head plain"><div><small>히어로</small><b>${escapeHtml(entry[0])}</b></div>` +
    `<span class="gbm-hint">특성을 고르면 아래에서 노드를 찍습니다 — 기본 노드 외 3개</span></div>` +
    '<div class="hrm-traits">' + entry[1].filter(([, full]) => HERO.some(x => x.trait === full)).map(([short, full, img]) => { // 데이터에 아직 없는 특성(새 시즌 전)은 숨김
      const t = HERO.find(x => x.trait === full), on = cur && cur.trait === short;
      return `<div class="hrm-trait${on ? ' on' : ''}" onclick="pickHero(${jh}, ${JSON.stringify(short).replace(/"/g, '&quot;')})">` +
        `<img src="${(t && t.portrait) || HERO_IMG_BASE + img}" loading="lazy" onerror="this.style.visibility='hidden'">` +
        `<div><b>${escapeHtml(full)}</b><small>${escapeHtml(short)}${heroIsTree(t) ? ' · 갈래형' : ''}</small></div>` +
        (on ? '<span class="hrm-tick">✓</span>' : '') + '</div>';
    }).join('') + '</div>';
  // ── 가운데 아래: 고른 특성의 노드판 (열 = 기본·근원·자기 수호·진격, 갈래형은 행 = 갈래)
  const t = cur && cur.hero === entry[0] ? heroTraitData() : null;
  if (t) {
    const tree = heroIsTree(t), got = new Set(heroPicked(t));
    // 갈래형 줄 배치 — 노드 번호 규칙이 히어로마다 달라(셀레나·티아는 십의 자리=갈래, S14 유가 「최후의 존재」는 십의 자리=깊이)
    // 번호 대신 실제 연결(par)을 따라 잎 노드마다 한 줄씩, 갈래 앞 노드는 첫 잎의 줄에 둔다 (2026-10-10)
    const treeRow = new Map();
    if (tree) {
      const base = (t.nodes || []).find(x => !x.step);
      let r = 0;
      const walk = nm => {
        const kids = (t.nodes || []).filter(x => x.step && x.par === nm);
        if (!kids.length) return ++r;
        const rows = kids.map(k => { const rr = walk(k.name); treeRow.set(k.name, rr); return rr; });
        return rows[0];
      };
      if (base) walk(base.name);
      (t.nodes || []).forEach(x => { if (x.step && !treeRow.has(x.name)) treeRow.set(x.name, ++r); }); // 이어지지 않은 노드는 맨 아래
    }
    const rowOf = n => tree ? (treeRow.get(n.name) || 1) : (n.ord || 1);
    const depthOf = n => { let d = 0, x = n; const seen = new Set(); while (x && x.par && !seen.has(x.name)) { seen.add(x.name); d++; x = (t.nodes || []).find(y => y.name === x.par); } return d; };
    const colOf = n => tree ? Math.min(3, depthOf(n)) : n.step;
    const rows = Math.max(1, ...(t.nodes || []).filter(n => n.step).map(rowOf));
    let grid = tree ? ['기본 특성', '1번째 노드', '2번째 노드', '3번째 노드'].map((nm, st) => // 갈래형 열 머리 — 해금 레벨·특성 레벨은 노드마다
      `<div class="hrm-colh" style="grid-column:${st + 1}"><b>${nm}</b><small>${st ? '갈래를 따라 이어서' : '늘 보유'}</small></div>`).join('') : HR_STEP.map(([nm, req, part], st) => {
      const lv = heroStepLevel(st);
      return `<div class="hrm-colh" style="grid-column:${st + 1}"><b>${escapeHtml(nm)}</b><small>Lv ${req} 해금</small>` +
        `<span class="hrm-lv" title="${escapeHtml(part)}의 레벨을 따릅니다 (기본 1, 장착한 추억에 따라 오름)">특성 Lv ${lv}</span></div>`;
    }).join('');
    const herbs = preset.heroHerbs || {};
    grid += (t.nodes || []).map(n => {
      const lv = heroStepLevel(n.step), on = n.step === 0 || got.has(n);
      const why = n.step && !on ? heroWhyNot(t, n, true) : '';
      const free = !tree && n.step && !on && (t.nodes || []).some(x => x.step === n.step && got.has(x)); // 같은 단계에서 다른 걸 골라 둠
      const cls = n.step === 0 ? ' base on' : on ? ' on' : why ? ' lock' : free ? ' alt' : ' can';
      const pos = n.step === 0 ? `grid-column:1;grid-row:2 / span ${rows}` : `grid-column:${colOf(n) + 1};grid-row:${rowOf(n) + 1}`;
      const jn = JSON.stringify(n.name).replace(/"/g, '&quot;');
      const tip = n.step === 0 ? '기본 노드 — 늘 보유' : why || (on ? (tree ? '다시 누르면 빼기 (이어진 뒤 노드도 함께)' : '다시 누르면 빼기') : free ? '누르면 이 노드로 바꿉니다 (단계마다 하나)' : '눌러서 찍기');
      const ic = hrIconUrl(cur.trait, n);
      let herbHtml = '';
      if (on) herbHtml = heroNodeHerbs(n, lv).map(h => `<div class="hn-herb"><span class="hn-hcat">${escapeHtml(h.cat)} · 택1</span><div class="hn-hrow">` +
        h.items.map(it => `<span class="hn-hitem${herbs[heroHerbKey(n, h.cat)] === it.name ? ' on' : ''}" title="${escapeHtml(it.name + '\n' + it.text)}" onclick="event.stopPropagation();` +
          `pickHeroHerb(${jn}, ${JSON.stringify(h.cat).replace(/"/g, '&quot;')}, ${JSON.stringify(it.name).replace(/"/g, '&quot;')})">${escapeHtml(it.name)}</span>`).join('') + '</div></div>').join('');
      return `<div class="hrm-node${cls}${tree && n.step ? ' lnk' : ''}" style="${pos}" title="${escapeHtml(tip)}"` +
        (n.step ? ` onclick="pickHeroNode(${n.step}, ${jn})"` : '') + '>' +
        `<div class="hrm-nh">${ic ? `<img src="${ic}" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}<b>${escapeHtml(n.name)}</b>` +
        `<span class="hrm-nlv"><span class="hrm-nst">${escapeHtml(HR_STEP[n.step][0])} · </span>Lv ${lv}</span></div>` +
        // 갈래형: 앞 노드가 다른 줄이면 어디서 이어지는지 (같은 줄이면 ▸ 화살표로 충분)
        (tree && n.step && n.par && treeRow.has(n.par) && treeRow.get(n.par) !== rowOf(n) ? `<div class="hrm-par">← ${escapeHtml(n.par)}</div>` : '') +
        `<ul>${heroNodeLines(n, lv).map(l => `<li>${heroTipWrap(l, n.tips)}</li>`).join('')}</ul>${herbHtml}</div>`;
    }).join('');
    main += `<div class="hrm-boardh"><b>${escapeHtml(t.trait)}</b><span class="hrm-cnt">${got.size} / ${heroPickMax(t)}</span>` + (heroExtraPick(t) ? '<span class="gbm-hint">부활 옵션으로 네 번째 특성 (게임에서는 그 특성이 바로 최고 레벨)</span>' : '') +
      `<span class="gbm-hint">${tree ? '갈래형 — 기본에서 이어진 노드만 찍을 수 있고, 여러 갈래에 나눠 찍어도 됩니다' : '단계마다 하나씩 고릅니다'}</span></div>` +
      (tree ? heroTreeHtml(t, got, cur, herbs) : `<div class="hrm-board" style="grid-template-rows:auto repeat(${rows}, auto)">${grid}</div>`);
  } else if (cur && cur.hero !== entry[0]) {
    main += `<div class="hrm-empty">지금 빌드의 히어로는 <b>${escapeHtml(heroLabel(cur))}</b>입니다. 위에서 특성을 누르면 이 히어로로 바뀝니다.</div>`;
  } else if (cur) {
    main += '<div class="hrm-empty">이 특성의 노드 데이터가 없습니다 (데이터 업데이트 후 이용해주세요)</div>';
  } else {
    main += '<div class="hrm-empty">위에서 특성을 고르세요.</div>';
  }
  el.innerHTML = '<div class="gbm hrm"><div class="gbm-top"><b class="gbm-title">히어로 · 특성</b>' + (typeof gbmHelp === 'function' ? gbmHelp('hero') : '') + (page && typeof hpBuildPicker === 'function' ? hpBuildPicker() : '') +
    '<span class="gbm-keys"><kbd>클릭</kbd> 찍기 / 빼기 <span class="gbm-sep">·</span> 특성 레벨은 장착한 추억(근원·자기 수호·진격)을 따릅니다</span>' +
    (heroMsg ? '<span class="gbm-msg">' + escapeHtml(heroMsg.replace(/^⚠\s*/, '')) + '</span>' : '') +
    '<button class="gbm-x" onclick="hrCloseModal()">' + (page ? '빌더에서 이어서 짜기 →' : '닫기 ✕') + '</button></div>' +
    `<div class="gbm-body"><div class="gbm-side">${side}</div><div class="gbm-main">${main}</div></div></div>`;
  if (!page) el.style.display = 'flex';
  heroClampMark(el);
}
// ── 갈래형 특성 = 인게임식 아이콘 트리 (2026-10-10, 사용자 결정 — 카드로 펼치면 유가3처럼 과하게 길어진다)
// 열 = 깊이(기본 → 1·2·3번째), 잎 노드마다 한 줄, 앞 노드는 이어지는 노드들의 가운데. 연결선은 SVG 곡선(찍은 경로는 금색).
// 설명은 마우스를 올리면(.hrm-pop), 터치 기기는 한 번 누르면 아래 칸에 설명 + [찍기] 버튼. 찍은 노드 효과는 트리 아래에 요약.
let hrtFocus = '';
const hrtTouch = () => !!(window.matchMedia && matchMedia('(hover: none)').matches);
function hrtRedraw() { renderPreset(); if (hrModalOpen) hrRenderModal(); } // pickHeroNode 와 같은 순서로 다시 그림
function hrtTap(step, name) {
  if (hrtTouch() && hrtFocus !== name) { hrtFocus = name; hrtRedraw(); return; }
  pickHeroNode(step, name);
}
function heroTreeHtml(t, got, cur, herbs) {
  const nodes = t.nodes || [], base = nodes.find(x => !x.step);
  const kids = nm => nodes.filter(x => x.step && x.par === nm);
  const pos = new Map(); let leaf = 0;
  const depthOf = n => { let d = 0, x = n; const seen = new Set(); while (x && x.par && !seen.has(x.name)) { seen.add(x.name); d++; x = nodes.find(y => y.name === x.par); } return d; };
  const place = n => { // 잎은 차례로 한 줄씩, 앞 노드는 자식들 가운데
    const ks = kids(n.name);
    const row = ks.length ? ks.map(place).reduce((a, b) => a + b, 0) / ks.length : leaf++;
    pos.set(n.name, {col: Math.min(3, depthOf(n)), row}); return row;
  };
  if (base) place(base);
  nodes.forEach(n => { if (!pos.has(n.name)) pos.set(n.name, {col: Math.min(3, depthOf(n)), row: leaf++}); }); // 이어지지 않은 노드
  const ROWH = 118, H = Math.max(1, leaf) * ROWH, X = c => 7 + c * 28.6; // 가로는 % (넓이에 맞춰 늘고 줄어듦), 세로는 px
  const Y = r => r * ROWH + 30; // 아이콘 가운데
  const onOf = n => !n.step || got.has(n);
  let svg = '';
  nodes.forEach(n => {
    const p = n.par && pos.get(n.par), q = pos.get(n.name); if (!p || !q || !n.step) return;
    const x1 = X(p.col) * 10, y1 = Y(p.row), x2 = X(q.col) * 10, y2 = Y(q.row), mx = (x1 + x2) / 2; // 아이콘 가운데끼리 — 끝은 아이콘이 덮는다
    svg += `<path class="${onOf(n) ? 'on' : ''}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
  });
  const lvOf = n => heroStepLevel(n.step);
  const descHtml = n => `<ul>${heroNodeLines(n, lvOf(n)).map(l => `<li>${heroTipWrap(l, n.tips)}</li>`).join('')}</ul>`;
  const nodeHtml = n => {
    const q = pos.get(n.name), on = onOf(n), why = n.step && !on ? heroWhyNot(t, n, true) : '';
    const cls = !n.step ? ' base on' : on ? ' on' : why ? ' lock' : ' can';
    const jn = JSON.stringify(n.name).replace(/"/g, '&quot;'), ic = hrIconUrl(cur.trait, n);
    const hint = !n.step ? '기본 노드 — 늘 보유' : why || (on ? '다시 누르면 빼기 (이어진 뒤 노드도 함께)' : '눌러서 찍기');
    return `<div class="hrt-n${cls}${hrtFocus === n.name ? ' focus' : ''}" style="left:${X(q.col)}%;top:${Y(q.row) - 30}px"` + (n.step ? ` onclick="hrtTap(${n.step}, ${jn})"` : ` onclick="if(hrtTouch()){hrtFocus=${jn};hrtRedraw()}"`) + '>' +
      `<div class="hrt-ic">${ic ? `<img src="${ic}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}</div>` +
      `<div class="hrt-nm">${escapeHtml(n.name)}</div><div class="hrt-st">${escapeHtml(HR_STEP[n.step][0])} · Lv ${lvOf(n)}</div>` +
      `<div class="hrt-desc" hidden><b>${escapeHtml(n.name)}</b><small>${escapeHtml(HR_STEP[n.step][0])} · Lv ${lvOf(n)}${n.par ? ' · ← ' + escapeHtml(n.par) : ''}</small>${descHtml(n)}<em class="${why ? 'why' : ''}">${escapeHtml(hint)}</em></div></div>`;
  };
  const herbHtml = n => { const jn = JSON.stringify(n.name).replace(/"/g, '&quot;');
    return heroNodeHerbs(n, lvOf(n)).map(h => `<div class="hn-herb"><span class="hn-hcat">${escapeHtml(h.cat)} · 택1</span><div class="hn-hrow">` +
      h.items.map(it => `<span class="hn-hitem${herbs[heroHerbKey(n, h.cat)] === it.name ? ' on' : ''}" title="${escapeHtml(it.name + '\n' + it.text)}" onclick="event.stopPropagation();` +
        `pickHeroHerb(${jn}, ${JSON.stringify(h.cat).replace(/"/g, '&quot;')}, ${JSON.stringify(it.name).replace(/"/g, '&quot;')})">${escapeHtml(it.name)}</span>`).join('') + '</div></div>').join(''); };
  // 아래 칸: 터치로 고른 노드(설명 + 찍기 버튼) → 찍은 노드 효과 요약(기본 포함)
  const fn = hrtTouch() && nodes.find(x => x.name === hrtFocus && x.step);
  const focusHtml = fn ? (() => { const on = got.has(fn), why = !on ? heroWhyNot(t, fn, true) : '', jn = JSON.stringify(fn.name).replace(/"/g, '&quot;');
    return `<div class="hrt-focus"><div class="hrt-fh"><b>${escapeHtml(fn.name)}</b><small>${escapeHtml(HR_STEP[fn.step][0])} · Lv ${lvOf(fn)}</small>` +
      `<button class="hrt-btn" ${why ? 'disabled title="' + escapeHtml(why) + '"' : ''} onclick="pickHeroNode(${fn.step}, ${jn})">${on ? '빼기' : '찍기'}</button></div>${descHtml(fn)}${why ? `<div class="hrt-why">${escapeHtml(why)}</div>` : ''}</div>`; })() : '';
  const picked = nodes.filter(n => !n.step || got.has(n)).sort((a, b) => depthOf(a) - depthOf(b));
  // 찍은 노드 효과 — 기본은 접힘, 펼친 상태는 브라우저에 기억 (사용자 2026-10-10: 꼭 필요하진 않으니 접었다 펼치게)
  let sumOpen = false; try { sumOpen = localStorage.getItem('tli_hrt_sum') === '1'; } catch (e) {}
  const sum = `<details class="hrt-sum"${sumOpen ? ' open' : ''} ontoggle="try{localStorage.setItem('tli_hrt_sum',this.open?'1':'0')}catch(e){}">` +
    `<summary>찍은 노드 효과 <span>${picked.length}개</span></summary><div class="hrt-sumg">` + picked.map(n => `<div class="hrt-si${n.step ? '' : ' base'}"><div class="hrt-sih">` +
    `<b>${escapeHtml(n.name)}</b><small>${escapeHtml(HR_STEP[n.step][0])} · Lv ${lvOf(n)}</small></div>${descHtml(n)}${n.step ? herbHtml(n) : ''}</div>`).join('') + '</div></details>';
  return `<div class="hrt-wrap"><div class="hrt-in"><div class="hrt-cols">${['기본 특성', '1번째 노드', '2번째 노드', '3번째 노드'].map((c, i) => `<span style="left:${X(i)}%">${c}</span>`).join('')}</div>` +
    `<div class="hrt" style="height:${H}px"><svg class="hrt-lines" viewBox="0 0 1000 ${H}" preserveAspectRatio="none">${svg}</svg>${nodes.map(nodeHtml).join('')}</div></div></div>` + focusHtml + sum;
}

// 노드 설명이 길면 5줄까지만 (CSS) — 실제로 잘린 노드에만 .clip, 마우스를 올리면 전체를 띄운다 (사용자 2026-10-10: 유가3 트리가 과하게 길다)
function heroClampMark(el) {
  (window.requestAnimationFrame || setTimeout)(() => el.querySelectorAll('.hrm-node > ul').forEach(ul => ul.parentNode.classList.toggle('clip', ul.scrollHeight > ul.clientHeight + 2)));
}
let hrPopEl = null, hrPopTimer = null;
function hrPopHide() { clearTimeout(hrPopTimer); hrPopTimer = null; if (hrPopEl) hrPopEl.style.display = 'none'; }
document.addEventListener('mouseover', e => {
  // 전체 보기 창(과 그 안 용어 툴팁) 위에서는 유지 — 마우스를 창 안으로 옮겨 밑줄 용어를 볼 수 있게 (사용자 2026-10-12)
  if (e.target.closest && e.target.closest('.hrm-pop, #floatTip2')) { clearTimeout(hrPopTimer); hrPopTimer = null; return; }
  const n = e.target.closest && e.target.closest('.hrm-node.clip, .hrt-n');
  // 노드에서 창으로 넘어가는 틈을 지날 시간만큼 기다렸다 닫는다
  if (!n) { if (hrPopEl && hrPopEl.style.display !== 'none' && !hrPopTimer) hrPopTimer = setTimeout(hrPopHide, 250); return; }
  clearTimeout(hrPopTimer); hrPopTimer = null;
  // 노드 안의 밑줄 용어에 올리면 용어 툴팁만 — 전체 보기 창과 겹치지 않게 닫는다 (2026-10-12)
  if (e.target.closest('.tip2')) { hrPopHide(); return; }
  if (!hrPopEl) { hrPopEl = document.createElement('div'); hrPopEl.className = 'hrm-pop'; document.body.appendChild(hrPopEl); }
  if (hrPopEl._for !== n || hrPopEl.style.display === 'none') {
    hrPopEl._for = n;
    const dsc = n.querySelector('.hrt-desc');
    if (dsc && hrtTouch()) return; // 터치 기기는 아래 칸으로 본다
    hrPopEl.innerHTML = dsc ? dsc.innerHTML : `<b>${escapeHtml((n.querySelector('.hrm-nh b') || {}).textContent || '')}</b><ul>${n.querySelector(':scope > ul').innerHTML}</ul>`;
    hrPopEl.style.display = 'block'; hrPopEl.scrollTop = 0;
    const r = n.getBoundingClientRect(), w = hrPopEl.offsetWidth, h = hrPopEl.offsetHeight;
    const left = r.right + 8 + w <= innerWidth ? r.right + 8 : Math.max(8, r.left - 8 - w);
    hrPopEl.style.left = left + 'px';
    hrPopEl.style.top = Math.max(8, Math.min(r.top, innerHeight - h - 8)) + 'px';
  }
});
document.addEventListener('scroll', e => { if (hrPopEl && !(e.target.closest && e.target.closest('.hrm-pop, #floatTip2'))) hrPopHide(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && hrModalOpen && !hrHeroPage()) hrCloseModal(); });

// 부활 옵션 "기본 특성 슬롯 추가" 가 더 끼우는 추억 부위 (0단계 레벨)
function revivalExtraPart(effect) {
  const m = (effect || '').match(/기본 특성 슬롯이 추가되며[\s\S]*?(근원|진격|자기 수호)[\s\S]*?추억을 장착/) ||
    (effect || '').match(/^이미테이션 루나:\s*(근원|진격|자기 수호)/); // 루나 페이즈 이미테이션도 그 추억을 하나 더 낀다 (사용자 확인 2026-10-08)
  return m ? m[1] + '의 추억' : null;
}
// 추가 추억 칸의 등급 상한 — "엘리트 등급 이하" / "레어 등급 이하" (없으면 제한 없음). HERO_GRADES 키로 돌려준다
function revivalExtraCap(effect) {
  const m = (effect || '').match(/(엘리트|레어|매직) 등급 이하/);
  return m ? ({'엘리트': 'elite', '레어': 'rare', '매직': 'magic'})[m[1]] : null;
}

const MEM_PARTS = ['근원의 추억', '자기 수호의 추억', '진격의 추억'];
// ── 추억 (근원·자기 수호·진격, 각 1개 제작) ──
// 단계식 선택: 기본 속성(1) → 고유 옵션(최대 2) → 랜덤 옵션(최대 2), [다음]으로 건너뛰기 가능
const MEM_STAGES = [
  {cat: 'basic', type: '기본 속성', max: 1},
  {cat: 'unique', type: '고유 옵션', max: 2},
  {cat: 'random', type: '랜덤 옵션', max: 2},
];

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

// ── 단독 화면에서 히어로 고르기 (빌더의 pickHero 대신) — /tli/hero · /tli/builder2 공용 ──
function pickHero(hero, trait) {
  // 빌더와 같은 규칙: 아이리스에서 벗어날 때 액티브 칸에 마령(패시브) 스킬이 있으면 막는다
  if (preset.hero && preset.hero.hero === '아이리스' && hero !== '아이리스' &&
      ['a1', 'a2', 'a3', 'a4', 'a5'].some(id => { const m = preset.skills && preset.skills[id] && preset.skills[id].main; return m && m.kind === '패시브'; })) {
    alert('액티브 슬롯에 마령 스킬이 있어 히어로를 바꿀 수 없습니다.\n빌더에서 먼저 해당 스킬을 비워주세요.');
    return;
  }
  if (!preset.hero || preset.hero.trait !== trait) { preset.heroNodes = {}; preset.heroHerbs = {}; }
  preset.hero = {hero, trait};
  hrView = hero;
  persistPreset();
  renderPreset(); // = 화면의 pageRender (마법사는 단계 막대 요약까지 다시 그린다)
}

// ── /tli/hero 단독 화면 (page_common.js · hero_glue.js 다음에 붙는다) ──
function pageRender() { hrRenderModal(); }
function pageOnSwitch() { heroMsg = ''; hrView = (preset.hero && preset.hero.hero) || hrView; }
hrOpenModal();
