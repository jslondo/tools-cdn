// 생성물 — 고칠 땐 update/src/js/00_hero.js · update/src/js/00_talent.js · update/src/js/00_skill.js · update/src/js/00_gear.js · update/src/js/00_slate.js · update/src/js/00_pact.js · update/src/page_common.js · update/src/hero_glue.js · update/src/talent_glue.js · update/src/wz_skill.js · update/src/wz_gear.js · update/src/wz_mem.js · update/src/wz_slate.js · update/src/wz_pact.js · update/src/js/00_logbase.js · update/src/js/00_codec.js · update/src/js/02_logimport.js · update/src/wz_build.js · update/src/builder2_page.js (build_html2.build_tool_pages)
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

// ── 스킬 칸 규칙 공용 조각 (2026-10-08) ──
// 빌더와 빌더 2(마법사, /tli/builder2)의 스킬 단계가 함께 쓴다.
// 기대하는 바깥 것: SKILLS · SKILL_LV · preset · KEY_MAP · escapeHtml (빌더는 01_core, 마법사는 스킬 단계에 들어갈 때 받는 skill_data.js)
// ── 스킬 탭 + 스킬 빌드 ──
// 스킬 슬롯: 액티브 5 + 패시브 4, 각 슬롯에 보조 5칸 (3번=부귀, 5번=숭고 전용)
const SKILL_SLOTS = [
  {id: 'a1', label: '액티브 1', group: 'a'},
  {id: 'a2', label: '액티브 2', group: 'a'},
  {id: 'a3', label: '액티브 3', group: 'a'},
  {id: 'a4', label: '액티브 4', group: 'a'},
  {id: 'a5', label: '액티브 5', group: 'a'},
  {id: 'p1', label: '패시브 1', group: 'p'},
  {id: 'p2', label: '패시브 2', group: 'p'},
  {id: 'p3', label: '패시브 3', group: 'p'},
  {id: 'p4', label: '패시브 4', group: 'p'},
];
// 액티브 슬롯에는 모듈화 스킬(모듈: OO)도 장착 가능 — 분류는 따로 두되 선택 목록은 함께 표시
function mainKinds(group) { return group === 'a' ? ['액티브', '모듈화'] : ['패시브']; }
// 액티브 칸에 패시브를 넣을 수 있는 두 가지 예외 —
//  ① 아이리스: 마령 태그 패시브(영혼 소환류)
//  ② 박학다식: 재능·석판 어느 출처든 [박학다식]을 채용하면 주입 태그 패시브
//     (tlidb 데이터에는 "액티브 스킬 슬롯에…" 문구가 레전드 석판 행에만 붙어 있어 원문 대신 명칭으로 판정)
function isIrisPreset() { return !!(preset.hero && preset.hero.hero === '아이리스'); }
function isSpiritPassive(s) { return s.kind === '패시브' && (s.tags || []).includes('마령'); }
function isInjectPassive(s) { return s.kind === '패시브' && (s.tags || []).includes('주입'); }
function talentEffect(t) { return ((KEY_MAP.get(t.k) || t).effect) || ''; }
function isPolymathSlotOpt(t) { return talentEffect(t).includes('[박학다식]'); }
function hasPolymathSlot() { return (preset.talents || []).some(isPolymathSlotOpt); }
function mainAllows(s, group) {
  if (mainKinds(group).includes(s.kind)) return true;
  if (group !== 'a') return false;
  return (isIrisPreset() && isSpiritPassive(s)) || (hasPolymathSlot() && isInjectPassive(s));
}
// 1번 칸=촉발체+일반, 3번 칸=부귀+일반, 5번 칸=숭고+일반, 나머지=일반 보조만
function socketKinds(i) { return i === 0 ? ['보조', '촉발체'] : i === 2 ? ['보조', '부귀 보조'] : i === 4 ? ['보조', '숭고 보조'] : ['보조']; }
// ── 보조 대상 제한 (2026-10-13) — 보조 스킬 첫 줄 "실드 스킬을 보조한다." 를 메인 스킬 태그와 맞춰 본다.
// 확실히 읽히는 문구만 거른다: 태그 낱말(실드·주입·자극·회복·저주·함성·영약·오라·콤보…)의 조합, 'A 또는 B', 특정 스킬 이름,
// 액티브/패시브, "X 및 Y 스킬은 보조할 수 없다". 모르는 낱말이 하나라도 있으면(대미지·적을 적중하는…) 거르지 않는다.
const SUP_WORD = {'근접': ['근접전'], '포물선': ['포물선'], '수평': ['수평 사격'], '수직': ['수직'], '이동': ['위치 이동'], '소환체': ['소환'],
  '위치 이동': ['위치 이동'], '스마트 웨폰': ['스마트 웨폰'], '수평 사격': ['수평 사격']};
let SUP_RULES = null, SUP_TAGSET = null;
function supTagsOf(phrase) { // '근접 베기' → ['근접전','베기'] · 모르는 낱말이면 null
  const w = phrase.replace(/\s*스킬$/, '').trim().split(/\s+/), out = [];
  for (let i = 0; i < w.length; i++) {
    const two = w[i] + ' ' + (w[i + 1] || '');
    if (SUP_WORD[two]) { out.push(...SUP_WORD[two]); i++; continue; }
    if (SUP_WORD[w[i]]) out.push(...SUP_WORD[w[i]]);
    else if (w[i] === '액티브' || w[i] === '패시브') out.push('#' + w[i]);
    else if (SUP_TAGSET.has(w[i])) out.push(w[i]);
    else return null;
  }
  return out.length ? out : null;
}
function supRule(s) { // → null(거르지 않음) | {name} | {alts: [[태그…]…], not: [태그…]}
  if (!SUP_RULES) {
    SUP_RULES = new Map(); SUP_TAGSET = new Set();
    SKILLS.forEach(k => { if (k.kind === '액티브' || k.kind === '패시브') (k.tags || []).forEach(t => SUP_TAGSET.add(t)); });
  }
  const key = s.name + '\u001f' + s.kind;
  if (SUP_RULES.has(key)) return SUP_RULES.get(key);
  const txt = String((s.desc || [''])[0] || '').split('<br>')[0].replace(/<[^>]+>/g, '').trim();
  let r = null, m;
  const not = [];
  const deny = txt.match(/([가-힣 ]+?) 스킬은 보조할 수 없다/) || txt.match(/, ([가-힣 ]+?) 보조 불가/);
  if (deny) for (const p of deny[1].split(/\s*및\s*/)) { const t = supTagsOf(p); if (t) not.push(...t); }
  if ((m = txt.match(/^(.+?) 스킬을 보조한다/) || txt.match(/^(.+?) 스킬 보조,/))) {
    const tgt = m[1].trim();
    if (SKILLS.some(k => k.name === tgt && (k.kind === '액티브' || k.kind === '패시브'))) r = {name: tgt};
    else {
      const alts = tgt.split(/\s*또는\s*/).map(supTagsOf);
      if (alts.every(Boolean)) r = {alts, not};
    }
  }
  if (!r && not.length) r = {alts: [[]], not};
  SUP_RULES.set(key, r);
  return r;
}
// 이 보조를 이 메인에 끼울 수 있나 — 메인이 없거나 태그가 없으면 true(못 거름)
function supFits(sup, main) {
  if (!main) return true;
  const r = supRule(sup);
  if (!r) return true;
  if (r.name) return main.name === r.name;
  const mi = SKILLS.find(k => k.name === main.name && k.kind === main.kind);
  if (!mi || !(mi.tags || []).length) return true;
  const has = t => t === '#액티브' ? (mi.kind === '액티브' || mi.kind === '모듈화') : t === '#패시브' ? mi.kind === '패시브' : mi.tags.includes(t);
  if (r.not.some(has)) return false;
  return r.alts.some(a => a.every(has));
}
// 보조칸 확장 에너지: 칸별 비용 (액티브/패시브), 필요치 = 1번부터 가장 높은 사용 칸까지 누적
const SUP_ENERGY = {a: [0, 10, 15, 50, 100], p: [10, 10, 15, 50, 100]};
const SK_ENERGY_MAX = 531; // 보유 가능한 최대 에너지 (초과 시 경고)
function slotEnergy(sl) {
  const sk = preset.skills[sl.id];
  if (!sk || !sk.main) return 0;
  let last = -1;
  sk.sup.forEach((sp, i) => { if (sp) last = i; });
  let sum = 0;
  for (let i = 0; i <= last; i++) sum += SUP_ENERGY[sl.group][i];
  return sum;
}
// 스킬 카드 stats의 "메인 속성:" 값을 배열로 파싱 (예: "힘, 민첩" → ['힘','민첩'], 없으면 []) — 1회 계산 후 캐시
function skillAttrs(s) {
  if (!s._attrs) {
    s._attrs = [];
    (s.stats || []).forEach(p => {
      if (String(p[0]).includes('메인 속성')) s._attrs = String(p[1]).split(',').map(x => x.trim()).filter(Boolean);
    });
  }
  return s._attrs;
}
// 레벨별 수치 / 티어별 효과 — 원본(개별 스킬 페이지)에 표가 있는 스킬만 표시
function skillLvHtml(name) {
  const d = SKILL_LV[name];
  if (!d) return '';
  if (d.tiers) {
    return `<div class="ccard-sec">티어별 효과</div>` + d.tiers.map(t =>
      `<div class="icard-opt"><span class="sk-lvtag">T${escapeHtml(t[0])}</span> ${escapeHtml(t[1])}</div>`).join('');
  }
  if (!d.rows || !d.cols) return '';
  const lvs = d.rows.map(r => r[0]);
  return `<div class="ccard-sec">레벨별 수치 <span class="sk-lvhint">Lv ${lvs.join(' · ')}</span></div>` +
    d.cols.map((c, i) => `<div class="icard-opt">${escapeHtml(c)}<br>` +
      d.rows.map(r => `<span class="sk-lvtag">Lv${escapeHtml(r[0])}</span> <b class="m">${escapeHtml(r[i + 1] || '-')}</b>`).join('<span class="sk-lvsep">·</span>') +
      `</div>`).join('');
}

// ── 장비 규칙 공용 조각 (2026-10-08) ──
// 빌더와 빌더 2(마법사)의 장비 단계가 함께 쓴다: 칸 목록·옵션 분류·등급 한도·무기 줄 배치·옵션 키.
// 기대하는 바깥 것: 없음 (PARTS 는 함수 인자로 받는다 — 빌더는 01_core 의 PARTS, 마법사는 gear_data.js)
const OPT_LIMITS = {basic: 2, main: 3, sub: 3};

const CAT_LABEL = {basic: '기본옵', main: '메인옵', sub: '서브옵'};

// 옵션 등급(기본/절대/진급/초급) — 절대·진급은 메인+서브 합산 각 최대 2개
const GRADE_LIMITS = {'절대': 2, '진급': 2};

const GRADE_CLASS = {'기본': 'g-basic', '절대': 'g-abs', '진급': 'g-adv', '초급': 'g-beg'};

function optGrade(t) {
  if (!t) return null;
  if (t.includes('절대자')) return '절대';
  if (t.includes('진급')) return '진급';
  if (t.includes('초급')) return '초급';
  if (t === '기본 옵션' || t === '기본 속성' || t === '침식 기본') return '기본';
  return null; // 시퀀스·고유·랜덤 옵션 등
}

function classifyOptType(t) {
  if (t === '기본 옵션' || t === '기본 속성' || t === '침식 기본') return 'basic';
  if (t.includes('메인 옵션')) return 'main';
  if (t.includes('서브 옵션')) return 'sub';
  return null; // 시퀀스·고유·랜덤 옵션 등 → 사용자가 칸을 선택
}

// 슬롯 교체 시 조향·시퀀스 유지 규칙: 조향(벨트)은 그대로, 시퀀스는 무기 부위가 같을 때만 (부위가 바뀌면 목록 자체가 달라짐)
function carryAddons(prev, nv) {
  if (!prev) return nv;
  if (prev.blend) nv.blend = prev.blend;
  if (prev.tower && prev.part === nv.part) nv.tower = prev.tower;
  if (prev.base && prev.part === nv.part) nv.base = prev.base; // 베이스는 옵션 편집으로 안 바뀐다
  return nv;
}

// ── 직접 제작 마법사: 부위 선택 → 기본(≤2) → 메인(≤3) → 서브(≤3) — 모달에서 단계 진행 ──
const CRAFT_STAGES = [
  {key: 'basic', label: '기본 옵션', max: 2},
  {key: 'main', label: '메인 옵션', max: 3},
  {key: 'sub', label: '서브 옵션', max: 3},
];

// 무기 부위 선택 줄 배치: 한손/양손 × 근거리/원거리 (데이터에 있는 부위만 표시, 미분류는 기타 줄)
// (방패 줄이 데이터의 PARTS 를 쓰므로 함수 — 빌더는 01_core 보다 먼저 이 조각을 읽는다)
const weaponRowsOf = P => [
  {label: '한손 · 근거리', parts: ['클로', '단검', '한손검', '한손 도끼', '한손 해머']},
  {label: '한손 · 원거리', parts: ['한손지팡이', '마법 지팡이', '마력 지팡이', '영혼 지팡이', '권총']},
  {label: '양손 · 근거리', parts: ['양손 검', '양손 도끼', '양손 해머', '주석 지팡이', '무사의 스틱']},
  {label: '양손 · 원거리', parts: ['활', '석궁', '머스킷', '화포']},
  {label: '방패', parts: P.SHIELDS},
];

// 옵션 목록 정렬 순서: 절대 > 진급 > 초급 > 기타(시퀀스·고유·랜덤 등)
function gradeOrder(type) {
  if ((type || '').includes('절대자')) return 0;
  if ((type || '').includes('진급')) return 1;
  if ((type || '').includes('초급')) return 2;
  return 3;
}

function rowKey(r) { return r.effect + '\u001f' + r.source + '\u001f' + r.type; }

// 장비 10칸 — 칸마다 들어갈 수 있는 부위 (P = 데이터의 PARTS)
const RING_PARTS = ['반지', '영혼 반지'];
const presetSlotsOf = P => [
  {id: 'helmet',  label: '투구',       parts: P.HELMETS},
  {id: 'chest',   label: '갑옷',       parts: P.CHESTS},
  {id: 'neck',    label: '목걸이',     parts: ['목걸이']},
  {id: 'glove',   label: '장갑',       parts: P.GLOVES},
  {id: 'belt',    label: '벨트',       parts: ['벨트']},
  {id: 'boots',   label: '신발',       parts: P.BOOTS},
  {id: 'ring1',   label: '반지 1',     parts: RING_PARTS},
  {id: 'ring2',   label: '반지 2',     parts: RING_PARTS},
  {id: 'weapon1', label: '무기',       parts: [...P.ONE_HAND, ...P.TWO_HAND]},
  {id: 'weapon2', label: '무기(방패)', parts: [...P.ONE_HAND, ...P.SHIELDS]},
];

const BASIC_KEYWORDS = ['기본', '진품', '절대자', '진급', '초급', '시퀀스', '랜덤', '고유'];

function isBasicType(type) { return BASIC_KEYWORDS.some(kw => type.includes(kw)); }

// ── 블러드 장비: 세트 부위 레전드의 옵션을 추출해 제작 (빌드당 하나, 무기 없음) ──
// 세트: 투구·목걸이 / 갑옷·장갑 / 신발·반지·벨트 — 칸마다 추출할 수 있는 레전드 부위 (P = PARTS)
const bloodSetPartsOf = P => {
  const helmNeck = [...P.HELMETS, '목걸이'];
  const chestGlove = [...P.CHESTS, ...P.GLOVES];
  const bootsRingBelt = [...P.BOOTS, ...RING_PARTS, '벨트'];
  return {helmet: helmNeck, neck: helmNeck, chest: chestGlove, glove: chestGlove,
          boots: bootsRingBelt, ring1: bootsRingBelt, ring2: bootsRingBelt, belt: bootsRingBelt};
};
const BLOOD_SET_NAME = {helmet: '투구·목걸이', neck: '투구·목걸이', chest: '갑옷·장갑', glove: '갑옷·장갑',
                        boots: '신발·반지·벨트', ring1: '신발·반지·벨트', ring2: '신발·반지·벨트', belt: '신발·반지·벨트'};
// 블러드 부위명 = 칸 이름에서 번호를 뗀 것 ('반지 1' → '반지')
const bloodPartOfLabel = label => label.replace(/ \d$/, '');
// 블러드 제작 마법사: 기본옵 → 레전드 추출 → 추가 옵션 (모달 안에서 단계 진행)
const BLOOD_STAGES = [
  {key: 'bases', label: '기본 옵션', max: 2},
  {key: 'picks', label: '레전드 추출', max: 2},
  {key: 'extras', label: '추가 옵션', max: 4}, // 레전드 1개면 5 — bloodExtraCap으로 계산
];
// 레전드 추출을 1개만 담으면 추가 옵션 5개까지 (2개면 4개 — 합계 6 고정)
function bloodExtraCap(nBlood) { return nBlood <= 1 ? 5 : 4; }

// ── 제작 옵션 티어(T0/T1/T2) 표기 · 침식 — 티어 표(TIERS)는 빌더 01_core·빌더 2 gear_data.js 가 싣는다
let TIER_MAP_ = null;
function tierMapGet() { return TIER_MAP_ || (TIER_MAP_ = new Map(TIERS.map(e => [e.source + '\u001f' + e.type + '\u001f' + e.effect, e]))); }
// 현재 빌드의 티어 설정(0/1/2)에 맞는 효과 텍스트 반환 — 변형 없으면 T1 그대로
function tierEffectAt(o, tr) { // tr: '0' | '0p' | '1' | '2' — 침식 강화된 제작 옵션은 티어가 T0+('0p')로 오름
  if (o.rolled && o.effect) return o.effect; // 로그가 준 실제 굴림값 — 티어 표(범위)로 덮지 않는다
  const eff = (KEY_MAP.get(o.k) || o).effect;
  if (tr === '1') return eff; // t1 = 기본 표기
  if (o.tiers) return o.tiers['t' + tr] || eff; // 블러드 풀 옵션은 자체 티어 보유
  const e = tierMapGet().get((o.source || '') + '\u001f' + (o.type || '') + '\u001f' + eff);
  return e ? (e['t' + tr] || eff) : eff;
}
function tierEffect(o) { return tierEffectAt(o, preset && preset.tier || '1'); }
// 침식 = 보고 있는 티어의 한 단계 위 (T2 보기→T1, T1 보기→T0, T0 보기→T0+)
const TIER_UP = {'2': '1', '1': '0', '0': '0p'};
function eroEffect(o) {
  if (o.rolled && o.effect) return o.effect; // 실제 굴림값이 있으면 그대로 (침식 여부는 이미 어픽스 ID에 반영돼 있다)
  const eff = (KEY_MAP.get(o.k) || o).effect;
  const want = TIER_UP[preset && preset.tier || '1'] || '0';
  const r = tierEffectAt(o, want);
  // 원하는 티어 수치가 없어 t1로 폴백되면(구버전 블러드 슬롯엔 t0p 미저장) 한 단계 아래 티어로 —
  // 침식 표기가 기본보다 낮은 수치로 보이는 것 방지
  if (want === '0p' && r === eff) return tierEffectAt(o, '0');
  return r;
}
// 블러드의 레전드 추출 옵션 침식 수치 — 출처 레전드(o.type=아이템명)의 corr에서 같은 옵션을 찾음
function bloodLegendCorr(o) {
  const it = ITEMS.find(x => x.name === o.type);
  if (!it || !it.corr) return null;
  const norm = s => stripHtml(s).replace(/\s+/g, ' ').trim(); // stripHtml: 빌더 05_ui · 단독 화면 page_common
  const eff = norm((KEY_MAP.get(o.k) || o).effect);
  const i = (it.opts || []).findIndex(op => norm(op) === eff);
  return i >= 0 && it.corr[i] ? it.corr[i][1] : null;
}
// 침식 강화 개수 — 레전드·제작 2개, 블러드 3개
function corrLimit(v) { return v.kind === 'blood' ? 3 : 2; }

// 로그에서 온 옵션의 티어 (어픽스 ID 끝자리) — 칩 표기 T0/T1/T2
function affixTier(o) {
  if (!o || !o.aid) return null;
  const id = String(o.aid);
  if (id.length < 9) return null; // 기본 옵션(7자리)은 티어 체계가 다르다 — 표기하지 않는다
  const d = id.slice(-1);
  return /[0-9]/.test(d) ? d : null;
}
function tierLabel(t) { return 'T' + t; }
// 효과 텍스트의 용어에 밑줄+호버 툴팁(tip2) 부여 — tips는 [[용어, 설명]] 자체 완결형
function tipWrapEffect(effect, tips) {
  let html = escapeHtml(effect);
  if (!tips || !tips.length) return html;
  // 용어를 먼저 자리표시자로 치환해 두 번째 용어가 첫 툴팁의 title 속성을 건드리는 것 방지
  tips.forEach((t, i) => { html = html.replace(escapeHtml(t[0]), `\u0001${i}\u0001`); });
  tips.forEach((t, i) => {
    html = html.replace(`\u0001${i}\u0001`,
      `<span class="tip2" title="${escapeHtml(t[1])}">${escapeHtml(t[0])}</span>`);
  });
  return html;
}
// 표시용: 태그 밖의 수치만 파란 굵은 글씨로 (tlidb 카드의 b.m 과 같은 모양) — 툴팁 title 속성은 태그 안이라 건드리지 않는다
function hlNums(html) {
  return String(html).split(/(<[^>]+>)/).map(p => p[0] === '<' ? p : p.replace(/[+-]?\(?[\d.]+(?:[–~-][\d.]+)?\)?%?/g, m => /\d/.test(m) ? '<b class="m">' + m + '</b>' : m)).join('');
}
// 랜덤 옵션 후보 — "<랜덤 …>" 옵션이 있는 레전드(신들의 애도 등)의 나올 수 있는 후보·침식화 후보 (tlidb 상세 페이지, 2026-10-12)
// 접어 두고 눌러서 펼친다 (후보가 24개까지라 카드가 너무 길어짐)
function itemPoolsHtml(it) {
  if (!it || !it.pools || !it.pools.length) return '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  return '<div class="icard-pools">' + it.pools.map(p =>
    `<details class="icard-pool${p.corr ? ' corr' : ''}"><summary>${esc(p.name)}${p.corr ? ' 침식화 시' : ' 후보'} <small>${p.rows.length}</small></summary>` +
    p.rows.map(r => `<div class="icard-opt">${r[1]}</div>`).join('') + '</details>').join('') + '</div>';
}

// ── 신격 석판 공용 조각 (2026-10-08) ──
// 빌더(보드 보기·로그 재현)와 빌더 2(석판 배치 편집)가 함께 쓰는 규칙: 석판 모양(SLATES)·신격 변형·활성 칸(다이아몬드)·
// 회전·겹침/개수 한도·심판/전염/복제 파생 효과·보드 → 재능 목록 재생성.
// 기대하는 바깥 것: preset · ALL_DATA · SLATEIDX · rowKey (빌더는 01_core, 빌더 2 는 slate_data.js 연결부)
// 석판 아이템 카탈로그 — 키 = tlidb 상세 페이지 id(=로그 UniqueItmId), 신격의 석판만 BaseId.
// c = 칸 좌표(원점 셀 (0,0), Direction=0 기준), 회전 = 원점 셀 고정 반시계 90°×Direction.
// 실로그 두 보드(장비 교체 전후, 하나는 24칸 만재)를 다이아몬드(2·4·6·6·4·2)에 제약 풀이해 검증.
// v=0은 실배치 미관측이라 기본 방향 미확정 — 렌더에서 점선 표시, 충돌하면 원점 칸만 표시
const SLATES = {
  // sl = 옵션 슬롯 등급 템플릿(slateRank: 0=핵심[명칭] 1=레전드 중위·절대자 2=중위 3=하위), 없으면 소켓 불가
  // copy = 복제 규칙 {a: 'all'(인접 전부)|'dir'(Direction 방향)|'lr'(좌우), p: 'last'(마지막 줄)|'ranks', r: 허용 rank}
  //        — tlidb SS13 문구 기준, 핵심[명칭]은 항상 복제 불가
  1001: {n: '빛이 된 나방', c: [[0,0]], v: 1, copy: {a: 'dir', p: 'last'}, limit: 3},
  // 중위 칸에는 레전드 중위(rank 1)도 들어간다 — tlidb 표기는 '중위'만 적지만 게임에선 된다 (사용자 확인 2026-10-08)
  1003: {n: '추락하는 별빛', c: [[0,0],[-1,0]], v: 1, sl: [[3],[3],[1,2,3],[1,2]], limit: 3},
  1005: {n: '신성의 일각', c: [[0,0],[0,1],[-1,0]], v: 1, sl: [[1],[1]], limit: 3},
  1009: {n: '우주의 균열', c: [[0,0],[-1,0],[-2,0],[1,0],[2,0],[3,0]], v: 0, copy: {a: 'lr', p: 'ranks', r: [1,2]}, limit: 1},
  1010: {n: '신의 계보', c: [[0,0],[0,1],[0,-1],[-1,0],[-1,-1],[1,1],[1,0]], v: 1, sl: [[1,2,3],[1,2,3],[0,1,2],[0]], limit: 1},  // 핵심 재능은 계보에만, 최대 2 (슬롯 템플릿이 보장)
  1011: {n: '별들의 고향', c: [[0,0],[-1,1],[0,-1],[0,1],[1,0],[1,1],[1,2],[2,0]], v: 0, copy: {a: 'all', p: 'ranks', r: [2]}, limit: 1},
  1012: {n: '들불 번지는 순간', c: [[0,0]], v: 1, copy: {a: 'all', p: 'last'}, limit: 1},
  // 신격(제작 석판): uniq=0이라 BaseId가 키, 소켓은 자유 4칸(명칭+인챈트 3)
  260001: {n: '사냥의 여신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  260101: {n: '기만의 여신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  260201: {n: '지식의 여신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  260301: {n: '전쟁의 신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  260401: {n: '기계의 신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  260501: {n: '힘의 신의 신격', c: [[0,0]], v: 0, god: 1, sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]},
  394001: {lg: 'nether', n: '명왕의 불완전한 신격: 심판', c: [[0,0],[-3,0]], v: 0, god: 1, boost: {v: 30}, pc: 1, sl: [[1,2,3],[1,2,3]]},
  394002: {lg: 'nether', n: '명왕의 불완전한 신격: 인펙션', c: [[0,0],[1,0]], v: 1, god: 1, spread: {v: -90}, pc: 1, sl: [[1,2,3],[1,2,3]]},
  394004: {lg: 'nether', n: '명왕의 신격: 심판', c: [[0,0],[-3,0],[-3,3]], v: 1, god: 1, boost: {v: 70}, pc: 1, sl: [[1,2,3],[1,2,3],[1,2,3]]},
  394005: {lg: 'nether', n: '명왕의 신격: 인펙션', c: [[0,0],[1,0],[-1,0]], v: 1, god: 1, spread: {v: -50}, pc: 1, sl: [[1,2,3],[1,2,3],[1,2,3]]}, // 원점=가운데 칸, c 순서=게임 옵션 순(가운데→아래→위: 1번=가운데·2번=아래·3번=위 칸), 전염 -50% (세이지 실보드·아이템 카드 확정)
  394006: {lg: 'nether', n: '명왕의 신격: 추방', c: [[0,0],[1,1],[2,2]], v: 0, god: 1, pc: 1, sl: [[1,2,3],[1,2,3],[1,2,3]]},
};
// 신격의 석판 = 신 6종 × 모양 6변형 (id 26xx01~06, 모양 코드는 tlidb 아이콘 실측 순서: Z1·Z2·L1·L2·O·T)
// 색은 신마다 고정, 모양은 변형별 테트로미노. 소켓 = 5칸(하위~레전드 중위, 핵심 불가 — 핵심은 계보 전용)
const GOD_SHAPES = [
  ['Z1', [[0,0],[-1,0],[0,-1],[0,-2]]], // 변형1 실측(리스틸 기만 실보드) — 위1+왼쪽2 J형
  ['Z2', [[0,1],[1,0],[1,1],[2,0]]],
  ['L1', [[0,0],[1,0],[0,1],[-1,1]]], // 변형3 실측(세이지 전쟁의 신, ShapeId 1023·Direction 1) — S/Z형
  ['L2', [[0,2],[1,0],[1,1],[1,2]]],
  ['O', [[0,0],[0,1],[1,0],[1,1]]],
  ['T', [[0,0],[-1,0],[0,1],[0,2]]], // 변형6 실측(호자 지식 실보드) — 위1+오른쪽2, 변형1의 거울 (아이콘 코드와 불일치 — 코드명은 자리표시)
];
const GOD_BASES = {260000: '사냥의 여신', 260100: '기만의 여신', 260200: '지식의 여신', 260300: '전쟁의 신', 260400: '기계의 신', 260500: '힘의 신'};
const GOD_PAL = [[1, 'Z'], [3, 'L'], [5, 'O'], [6, 'T']]; // 팔레트·[모양] 순환에 노출하는 변형 (variant, 라벨)
// 로그 ShapeId → 신격 변형 번호 (실측 누적 — 로그의 BaseId는 기본형으로만 기록되고 실제 모양은 ShapeId에 있다)
const GOD_SHAPE_IDS = {'1011': 2, '1023': 3, '1031': 6}; // ShapeId → 신격 모양 변형 (실측: 15번 기만=Z2 · 리스틸 1023=L1 · 1031=T) // 1023=전쟁의 신 S자(세이지), 1031=기만의 여신 T형(리스틸)
Object.keys(GOD_BASES).forEach(b => GOD_SHAPES.forEach((g, vi) => {
  SLATES[+b + vi + 1] = {n: GOD_BASES[b] + '의 신격', c: g[1].map(c => c.slice()), v: 0, god: 1, shp: g[0],
    sl: [[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]};
}));

function slateRank(t) {
  const m = (t.effect || '').match(/^\[([^\]]+)\]/);
  if (!m || !/^(레전드 )?(하위|중위|절대자)( 명왕)? 재능( 포인트)?$/.test(m[1])) return 0;
  if (m[1].startsWith('레전드') || m[1].includes('절대자')) return 1;
  return m[1].startsWith('중위') ? 2 : 3;
}
// ── 석판 보드 (로그 가져오기 배치 재현, 읽기 전용) ──
// Index = 행×10+열(1-based), 활성 칸 = 다이아몬드(행 폭 2·4·6·6·4·2, 6×6)
// 회전 = 원점 셀 고정, T(x,y)=(y,-x)를 Direction번 적용 (반시계 90° 단위) — 실로그 두 보드로 검증
const SLATE_ACT = (() => {
  const s = new Set();
  [2, 4, 6, 6, 4, 2].forEach((w, r) => { const st = (6 - w) / 2 + 1; for (let c = st; c < st + w; c++) s.add((r + 1) * 10 + c); });
  return s;
})();
function slateCellsXY(u, idx, dir) { // 렌더용 (열, 행) 좌표 — 보드 밖(음수 포함)도 정확히 표현
  // Index = 열×10+행 (2026-08-14 리스틸 실보드 사진으로 확정 — 이전엔 행·열이 전치되어 그려졌음)
  // 셰이프 c = [d행, d열] 규약: id = (열0+c[1])×10 + (행0+c[0])
  const info = SLATES[u];
  if (!info) return null;
  let cells = info.c.map(pt => pt.slice());
  for (let k = 0; k < (dir % 4); k++) cells = cells.map(pt => [pt[1], -pt[0]]);
  const row0 = idx % 10, col0 = (idx / 10) | 0;
  return cells.map(pt => [col0 + pt[1], row0 + pt[0]]);
}
function slateCells(u, idx, dir) {
  const info = SLATES[u];
  if (!info) return null;
  let cells = info.c.map(p => p.slice());
  for (let k = 0; k < (dir % 4); k++) cells = cells.map(c => [c[1], -c[0]]);
  const x0 = idx % 10, y0 = (idx / 10) | 0;
  return cells.map(c => (y0 + c[1]) * 10 + (x0 + c[0]));
}
const SLATE_COLORS = ['#e5534b', '#3fb950', '#4493f8', '#d29922', '#a371f7', '#39c5cf', '#f778ba', '#ffa657', '#7ee787', '#79c0ff', '#ff7b72', '#8b949e'];
function sbCellsFree(bd, cells, skip) {
  const used = new Set();
  bd.forEach((s, i) => { if (i !== skip) (slateCells(s.u, s.i, s.d) || [s.i]).forEach(c => used.add(c)); });
  return !!cells && cells.every(c => SLATE_ACT.has(c) && !used.has(c));
}
function sbFitDir(bd, u, i, d0, skip) { // d0부터 시작해 들어가는 회전값 탐색 (없으면 -1)
  for (let k = 0; k < 4; k++) {
    const d = (d0 + k) % 4;
    if (sbCellsFree(bd, slateCells(u, i, d), skip)) return d;
  }
  return -1;
}
// 겹침·보드 밖 상태의 피스 인덱스 목록 (포커스 유지·공유 차단 판단용)
function sbConflicts(bd) {
  const out = [], used = new Map();
  (bd || []).forEach((s, pi) => {
    let bad = false;
    (slateCells(s.u, s.i, s.d) || [s.i]).forEach(c => {
      if (!SLATE_ACT.has(c)) { bad = true; return; }
      if (used.has(c)) { bad = true; if (out.indexOf(used.get(c)) < 0) out.push(used.get(c)); }
      else used.set(c, pi);
    });
    if (bad && out.indexOf(pi) < 0) out.push(pi);
  });
  return out;
}
// 개수 한도: 별빛·일각·나방 3 / 들불·균열·고향·계보 1 / 명왕 계열(lg:'nether')은 통틀어 1 (사용자 확인)
function sbLimitErr(u) {
  const info = SLATES[u] || {};
  const bd = preset.slateBd || [];
  if (info.lg && bd.some(x => (SLATES[x.u] || {}).lg === info.lg)) return '명왕의 신격은 하나만 배치할 수 있습니다.';
  if (info.limit && bd.filter(x => x.u === u).length >= info.limit) return (info.n || '이 석판') + '은(는) 최대 ' + info.limit + '개까지 배치할 수 있습니다.';
  return null;
}
// 심판 돌 사이 영역: 돌 쌍마다 그 사이 직선 칸(가로·세로 변 + 대각 빗변) — 돌 자신·삼각형 내부는 제외
// (내부 칸 미포함은 실보드 검증: 중앙에 있던 들불이 강화 안 받음 — 2026-08-14 사용자 확인)
function judgeRegion(cells) {
  const pts = cells.map(id => [id % 10, (id / 10) | 0]);
  const out = new Set();
  const seg = (a, b) => {
    const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let k = 1; k < n; k++) out.add((a[1] + dy * k) * 10 + (a[0] + dx * k));
  };
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) seg(pts[i], pts[j]);
  cells.forEach(id => out.delete(id));
  return out;
}
// 보드 파생 효과 3종 (배치에서 계산 — 게임 로그에는 결과가 안 실림):
// ① 들불 번지는 순간(1012) = 상하좌우 인접 석판의 마지막 줄 옵션 복제 (핵심[명칭]·유효 한도 1은 복제 불가)
// ② boost(심판) = 돌 사이 영역에 걸친 석판의 옵션 강화 (정식 +70%)
// ③ spread(인펙션) = 자기 옵션을 인접 석판마다 -50%로 복제해 추가 (세이지 실측 — 카드에 '증식 방향: 양쪽' 필드 존재, InfluenceId 11001로 추정되나 다른 값 미관측이라 방향 제한은 미구현)
function slateDerived(bd) {
  const cellsOf = bd.map(s => slateCells(s.u, s.i, s.d) || [s.i]);
  const adjPieces = si => { // si 피스와 변을 맞댄 피스들
    const out = new Set();
    cellsOf[si].forEach(c => [-10, 10, -1, 1].forEach(d => {
      bd.forEach((nb, ni) => { if (ni !== si && cellsOf[ni].indexOf(c + d) >= 0) out.add(ni); });
    }));
    return out;
  };
  const copies = []; // 복제는 항상 기본 수치 (심판 강화 미적용 — 사용자 확인)
  const nameOf = ni => (SLATES[bd[ni].u] || {}).n || '#' + bd[ni].u;
  const rankOfNid = nid => { // 노드의 등급 (핵심[명칭]=0) — 데이터에 없으면 -1
    const ri = SLATEIDX.idx[nid];
    return ri === undefined ? -1 : slateRank(ALL_DATA[ri]);
  };
  const MOTH_DIRS = ['위', '왼쪽', '아래', '오른쪽']; // InfluenceId-1001 순 (실보드 2개 확정: 리스틸 1001=위, 세이지 1002=왼쪽 — tlidb 카드 문구 나열 순과 일치)
  bd.forEach((f, fi) => {
    const cp = (SLATES[f.u] || {}).copy;
    if (!cp) return;
    // 이웃 피스의 '어느 칸'에 맞닿는지 수집 — 명왕은 칸↔옵션 1:1이라 맞닿은 칸이 곧 복제 대상 옵션
    const touched = new Map(); // ni → Set(칸 인덱스)
    const addTouch = cellId => {
      bd.forEach((nb, ni) => {
        if (ni === fi) return;
        const idx = cellsOf[ni].indexOf(cellId);
        if (idx >= 0) { if (!touched.has(ni)) touched.set(ni, new Set()); touched.get(ni).add(idx); }
      });
    };
    if (cp.a === 'dir') { // 나방: InfluenceId 1001~1004 = 위(-1)·왼쪽(-10)·아래(+1)·오른쪽(+10)
      const di = (f.f || 0) - 1001;
      if (di < 0 || di > 3) return; // 방향 정보 없음 (구 데이터·외부 앱 미전송) — 복제 표시 생략
      addTouch(f.i + [-1, -10, 1, 10][di]);
    }
    else if (cp.a === 'lr') cellsOf[fi].forEach(c => [-10, 10].forEach(d => addTouch(c + d))); // 좌우 = 열±1 = ±10
    else cellsOf[fi].forEach(c => [-10, 10, -1, 1].forEach(d => addTouch(c + d)));
    touched.forEach((cis, ni) => {
      const nb = bd[ni];
      if ((SLATES[nb.u] || {}).copy) return; // 복제 석판끼리는 서로 복제할 옵션이 없음
      const t = nb.t || [];
      let picked;
      if (cp.p === 'ranks') { // 균열·고향: 지정 등급 전부
        picked = t.filter(Boolean).filter(nid => cp.r.indexOf(rankOfNid(nid)) >= 0);
      } else if ((SLATES[nb.u] || {}).pc) { // 명왕: 맞닿은 칸의 옵션 (핵심 불가 규칙 동일)
        picked = [...new Set([...cis].map(ci => t[ci]).filter(Boolean).filter(nid => rankOfNid(nid) > 0))];
      } else { // 마지막 줄 하나 (핵심[명칭]이면 복제 불가)
        const filled = t.filter(Boolean);
        const last = filled[filled.length - 1];
        picked = last && rankOfNid(last) > 0 ? [last] : [];
      }
      picked.forEach(nid => copies.push({fi, ni, nid, from: nameOf(ni),
        moth: cp.a === 'dir' ? MOTH_DIRS[(f.f || 0) - 1001] || '?' : null}));
    });
  });
  const boosted = new Map(); // 피스 순번 → 배지 (+70% 등)
  const boostPairs = []; // 강화 관계쌍 (심판 → 대상, 호버 연동용)
  const spreads = [];
  bd.forEach((s, si) => {
    const info = SLATES[s.u] || {};
    if (info.boost) {
      const region = judgeRegion(cellsOf[si]);
      bd.forEach((nb, ni) => {
        if (ni !== si && cellsOf[ni].some(c => region.has(c))) {
          boosted.set(ni, info.boost.v ? '+' + info.boost.v + '%' : '강화');
          boostPairs.push({si, ni});
        }
      });
    }
    if (info.spread && (s.t || []).filter(Boolean).length) {
      // 낙인(칸 소켓)만 전염 — 칸 수 이후 항목(재능 포인트 고정, BaseTalentList)은 인펙션 본체 전용 (세이지 실측)
      const tt = info.pc ? (s.t || []).slice(0, info.c.length) : (s.t || []);
      adjPieces(si).forEach(ni => {
        tt.filter(Boolean).forEach(nid => {
          const ri = SLATEIDX.idx[nid];
          const eff = ri !== undefined ? ALL_DATA[ri].effect : '';
          if (slateRank({effect: eff}) === 0) return; // 명칭 줄은 전염 대상 아님
          spreads.push({si, ni, nid, to: (SLATES[bd[ni].u] || {}).n || '#' + bd[ni].u, pct: info.spread.v || ''});
        });
      });
    }
  });
  return {copies, boosted, spreads, boostPairs};
}
// 보드(slateBd) → 석판 재능 행 라벨 공통부 — add(nid, src) 콜백으로 밀어넣는다
// (로그 가져오기와 보드 편집 재생성이 같은 라벨 규칙을 쓰도록)
function addSlateTalentRows(bd, add) {
  const dv = slateDerived(bd);
  const AL = {1001: '나방', 1012: '들불', 1009: '균열', 1011: '고향'};
  bd.forEach((s, pi) => {
    const info = SLATES[s.u];
    const nm = info ? info.n : '#' + s.u;
    const tag = dv.boosted.has(pi) ? nm + ' (심판 ' + dv.boosted.get(pi) + ')' : nm;
    (s.t || []).filter(Boolean).forEach(nid => add(nid, tag));
  });
  dv.copies.forEach(c => add(c.nid, (AL[bd[c.fi].u] || '') + ' 복제 ← ' + c.from)); // 복제는 기본 수치
  dv.spreads.forEach(x => add(x.nid, '인펙션 전염 → ' + x.to + (x.pct ? ' (' + x.pct + '%)' : ''),
                              x.pct ? 1 + x.pct / 100 : 1)); // 전염 옵션은 그 비율만큼 줄어든 수치로 적용된다
}
// 보드 편집 후 보드 파생 행(src 있는 행)만 재생성 — 수동 추가 행은 보존
function rebuildSlateTalents(tp) {
  tp = tp || preset;
  tp.talents = (tp.talents || []).filter(t => !t.src);
  const bd = tp.slateBd || [];
  if (!bd.length) return;
  const seen = new Map();
  addSlateTalentRows(bd, (nid, src, mul) => {
    const i = SLATEIDX.idx[nid];
    if (i === undefined) return;
    const row = ALL_DATA[i];
    const k = rowKey(row);
    const sk = k + (mul && mul !== 1 ? '@' + mul : ''); // 같은 옵션이라도 배율이 다르면 따로 센다
    if (seen.has(sk)) {
      const t = tp.talents[seen.get(sk)];
      t.cnt = (t.cnt || 1) + 1;
      if (src && t.src && t.src.indexOf(src) < 0) t.src.push(src);
      return;
    }
    seen.set(sk, tp.talents.length);
    const t = {k, effect: row.effect, type: talentLabel(row)};
    if (mul && mul !== 1) t.mul = mul;
    if (src) t.src = [src];
    tp.talents.push(t);
  });
}
// 석판은 출처(레전드/비레전드), 운명은 "운명 · 하위/중위 숙명"을 계열 라벨로 사용
function talentLabel(r) {
  return r.category === '석판' ? r.source + (r.type ? ' · ' + r.type : '')
    : r.category === '운명' ? '운명 · ' + r.type
    : r.type;
}
function sbMoveDelta(pi, grab, target, force) { // 잡은 칸 기준 평행이동 — 행·열 성분 분리(십진 랩 방지). force=겹침 허용(보드 밖만 차단)
  const bd = preset.slateBd, sl = bd[pi];
  const dc = target % 10 - grab % 10, dr = ((target / 10) | 0) - ((grab / 10) | 0);
  const cells = slateCells(sl.u, sl.i, sl.d) || [sl.i];
  const moved = [];
  for (const c of cells) {
    const nc = c % 10 + dc, nr = ((c / 10) | 0) + dr;
    if (nc < 1 || nc > 6 || nr < 1 || nr > 6) return null;
    moved.push(nr * 10 + nc);
  }
  if (!force && !sbCellsFree(bd, moved, pi)) return null;
  return {i: (((sl.i / 10) | 0) + dr) * 10 + (sl.i % 10 + dc), cells: moved, ok: sbCellsFree(bd, moved, pi)};
}
const SB_RANK_LABEL = {0: '핵심', 1: '레전드 중위·절대자', 2: '중위', 3: '하위'};

// ── 보드 툴팁·강조용 피스 정보 (빌더 renderSlateBoard 에서 꺼냄 — 빌더 2 석판 배치도 같은 툴팁) ──
// 반환: {pieces: [{name, god, unsure, warn, nodes, keys, sprd, fx, pi}], links: [피스마다 파생 효과로 연결된 피스 Set]}
function slatePieceInfo(bd) {
  const pieces = bd.map((s, pi) => {
    const info = SLATES[s.u];
    const warn = false;
    const keys = new Set(); // 이 석판에 꽂힌 옵션 rowKey (옵션 행 호버 연동)
    const nodes = (s.t || []).filter(Boolean).map(nid => {
      const ri = SLATEIDX.idx[nid];
      if (ri === undefined) return '노드 ' + nid;
      keys.add(rowKey(ALL_DATA[ri]));
      return ALL_DATA[ri].effect;
    });
    return {name: info ? info.n : '석판 #' + s.u, god: !!(info && info.god), unsure: !info || info.v === 0, warn, nodes, keys, pi};
  });
  // 파생 효과를 툴팁·호버 연동에 반영 (복제 4종 / 심판 강화 / 인펙션 전염)
  const dv = slateDerived(bd);
  dv.boosted.forEach((val, pi) => pieces[pi].nodes.unshift('⚖ 심판 강화 ' + val));
  bd.forEach((s, pi) => { // 나방은 방향·로그 값을 툴팁에 표시 (방향 매핑 검증용)
    if (s.u === 1001) pieces[pi].nodes.unshift('복제 방향: ' + (['위', '왼쪽', '아래', '오른쪽'][(s.f || 0) - 1001] || '정보 없음'));
  });
  dv.copies.forEach(c => {
    const ri = SLATEIDX.idx[c.nid];
    if (ri !== undefined) pieces[c.fi].keys.add(rowKey(ALL_DATA[ri]));
    pieces[c.fi].nodes.push('복제' + (c.moth ? '(' + c.moth + ')' : '') + ' ← ' + c.from + ': ' + (ri !== undefined ? ALL_DATA[ri].effect : '노드 ' + c.nid));
  });
  dv.spreads.forEach(x => { // 전염은 nodes에 섞지 않고 별도 섹션(sprd)으로 — 툴팁 상단에 헤더+원문만 표시
    const ri = SLATEIDX.idx[x.nid];
    if (ri !== undefined) pieces[x.ni].keys.add(rowKey(ALL_DATA[ri]));
    const p2 = pieces[x.ni];
    if (!p2.sprd) { p2.sprd = []; p2.sprdSrc = null; }
    if (p2.sprdSrc !== x.si) { // 출처 석판이 바뀔 때만 헤더 (보통 인펙션 1장)
      p2.sprd.push('§전염' + (x.pct ? '(' + x.pct + '%)' : '') + ' ← ' + ((SLATES[bd[x.si].u] || {}).n || '#' + bd[x.si].u));
      p2.sprdSrc = x.si;
    }
    p2.sprd.push(slateOptPlain(ri !== undefined ? ALL_DATA[ri].effect : '노드 ' + x.nid));
  });
  // 파생 효과 관계 링크 (호버 시 상대 피스 2차 강조) + 효과 발신 피스 글로우
  const links = pieces.map(() => new Set());
  const fx = new Set();
  const link = (a, b) => { if (links[a] && links[b]) { links[a].add(b); links[b].add(a); } };
  dv.copies.forEach(c => { link(c.fi, c.ni); fx.add(c.fi); });
  dv.spreads.forEach(x => { link(x.si, x.ni); fx.add(x.si); });
  dv.boostPairs.forEach(b => { link(b.si, b.ni); fx.add(b.si); });
  pieces.forEach(p => { p.fx = fx.has(p.pi); });
  return {pieces, links};
}
// 칸 하나의 툴팁 — 명왕은 고정 옵션 → 구분선 → 1번~ 칸 옵션(마우스 올린 칸 강조), 전염은 머리글 섹션
// 반환 {tip: 글자 툴팁, tipH: HTML 툴팁(data-h)}
function slateCellTip(bd, p, pi, ci, out) {
    let tipBody = p.nodes, hlAt = -1;
    const pinfo = SLATES[bd[pi].u] || {};
    if (pinfo.pc) { // 명왕: 고정(전염 안 됨) 맨 위 → 구분선 → 전 칸 옵션(1번~), 마우스 올린 칸만 강조(hlAt)
      const pt = bd[pi].t || [];
      const fixed = pt.slice(pinfo.c.length).filter(Boolean).map(nid => { // 칸 수 이후 = 재능 포인트 고정
        const ri = SLATEIDX.idx[nid];
        return '고정: ' + (ri !== undefined ? ALL_DATA[ri].effect : '노드 ' + nid);
      });
      // 게임의 칸 번호는 석판 위 칸부터 1번 — 로그의 소켓 순서(c 배열 순)와 다르다 (세이지 인펙션 실측)
      const ord = (pinfo.c || []).map((_, i) => i).sort((a, b) =>
        pinfo.c[a][0] - pinfo.c[b][0] || pinfo.c[a][1] - pinfo.c[b][1]);
      tipBody = fixed.concat(fixed.length ? ['✂'] : [], ord.map((ci, no) => {
        const nid = pt[ci];
        const ri = nid ? SLATEIDX.idx[nid] : undefined;
        return (no + 1) + '번 칸: ' + (ri !== undefined ? ALL_DATA[ri].effect : nid ? '노드 ' + nid : '빈 칸');
      }), p.nodes.filter(n => n.startsWith('⚖') || n.startsWith('복제')));
      hlAt = Math.max(0, ord.indexOf(ci)) + (fixed.length ? fixed.length + 1 : 0);
    }
    // 줄 구성: [전염 섹션(§헤더+원문)] → 구분선(✂) → 원래 옵션 — 전염이 없으면 기존 그대로
    const sprd = p.sprd || [];
    const lines = sprd.concat(sprd.length && tipBody.length ? ['✂'] : [], tipBody);
    const tname = p.name + (out ? ' (보드 밖 — 재배치 필요)' : p.unsure ? ' (모양·방향 미확정)' : '');
    const tip = tname + (lines.length ? '\n' + lines.map(l => l === '✂' ? '─────' : l.charAt(0) === '§' ? l.slice(1) : l).join('\n') : '');
    const tipH = '<div class="ft-title">' + escapeHtml(tname) + '</div><div class="ft-body">' + lines.map((l, li) =>
      l === '✂' ? '<div class="ft-sep"></div>' :
      l.charAt(0) === '§' ? '<div class="ft-sec">' + escapeHtml(l.slice(1)) + '</div>' :
      '<div' + (hlAt >= 0 && li - (sprd.length ? sprd.length + 1 : 0) === hlAt ? ' class="ft-hl"' : '') + '>' + escapeHtml(l) + '</div>').join('') + '</div>';
  return {tip, tipH};
}

// 소켓 등급 1 = '레전드 중위·절대자' 이지만 절대자(명왕 재능)는 명왕 석판에만 — 다른 석판에서는 레전드 중위만 (사용자 확인 2026-10-08)
const slateIsNether = info => !!(info && info.lg === 'nether');
// 석판 옵션 문구의 머리말 — '[하위 재능]'·'[…명왕 재능 포인트]' 같은 등급 표시는 지우고, 핵심 재능 이름('[야심]' 등)은 남긴다 (2026-10-10 제보: 이름이 안 보였다)
function slateOptSplit(effect) {
  const m = /^\[([^\]]*)\]\s*/.exec(effect || '');
  if (!m) return {name: '', text: effect || ''};
  return {name: /재능( 포인트)?$/.test(m[1]) ? '' : m[1], text: effect.slice(m[0].length)};
}
const slateOptPlain = effect => { const o = slateOptSplit(effect); return (o.name ? o.name + ': ' : '') + o.text; };
function slateSockLabel(info, ranks) {
  return ranks.map(r => r === 1 && !slateIsNether(info) ? '레전드 중위' : SB_RANK_LABEL[r]).join(' · ');
}
function slateSockOk(info, r, ranks) { // 이 소켓에 이 옵션 행이 들어가나
  if (ranks.indexOf(slateRank(r)) < 0) return false;
  return slateIsNether(info) || !/^\[절대자/.test(r.effect || '');
}

// ── 전투 정령 · 운명 공용 조각 (2026-10-08) ──
// 빌더와 빌더 2(「추억·석판·정령」 화면)가 함께 쓴다: 정령 3칸·승급 보상·운명(숙명) 규칙.
// 정령 하나당 노드 10개(내환 6 · 중환 3 · 외환 1) + 미정 숙명 슬롯, 최대 3개. 노드 자리에 운명을 끼우면 노드 대신 운명 효과.
// 기대하는 바깥 것: PACT · preset · talGroup (빌더는 01_core, 빌더 2 는 mem_data.js)
// ── 전투 정령 ──
// 정령 하나당 노드 10개 + 미정 숙명 슬롯 1개, 최대 3개 장착 (사용자 확인).
// 노드 자리에 운명을 끼우면 그 노드 효과 대신 운명 효과가 걸린다 — 로그의 ContractInfosV2가 그 판이고,
// selectContract 1 = 정령 노드 그대로, 2 = 운명으로 교체다.
const PACT_MAX = 3;
function pactList() { return (preset.pacts || []).slice(0, PACT_MAX); }
function pactByName(nm) { return PACT.find(x => x.name === nm) || null; }
// 승급 보상 — 표의 각 행이 그 레벨의 전체 효과(누적 최종본)라 해당 행만 쓴다.
// adv = 인게임 승급 표기(1~6) = 표 레벨. 로그 starLevel + 1 (실측: 영약 요정 starLevel 0 = 인게임 승급 1)
function pactAdvEffects(sp, adv) {
  const rows = sp.advance || [];
  if (!rows.length) return [];
  const lv = Math.min(adv || 1, rows[rows.length - 1].lv);
  const row = rows.find(a => a.lv === lv) || rows[0];
  return row.effects || [];
}
// 꺼짐 → 정령 노드 → 운명 → 꺼짐. 운명 자리는 노드 효과를 쓰지 않는다(운명이 대체하므로)
// 정령 노드에 꽂은 운명 수 vs 빌드가 들고 있는 운명 수 — 어긋나면 로그가 노드판을 덜 실은 것이다
function pactDstTally() {
  const slots = (preset.pacts || []).reduce((n, p) => n + Object.keys((p && p.dsts) || {}).length, 0);
  const owned = (preset.talents || []).filter(t => talGroup(t.type) === 2)
    .reduce((n, t) => n + Math.max(1, t.cnt || 1), 0);
  if (!owned) return `정령에 꽂은 운명 ${slots}개`;
  return `정령에 꽂은 운명 <b>${slots}개</b> · 빌드가 가진 운명 <b>${owned}개</b>` +
    (slots === owned ? ' ✓ 일치' : ` — ${Math.abs(owned - slots)}개 차이 (로그가 자리를 덜 실었을 수 있습니다)`);
}
// 운명 슬롯: 기본 미정 3 · 중위(천명 포함) 4 · 하위 9 — 미정 확정으로 중위·하위가 늘 수 있어 미정만 제한, 나머지는 카운트 표기만
function isUndecidedDst(t) { return talGroup(t.type) === 2 && /^\[?미정 숙명/.test(t.effect || ''); }
function undecidedDstCnt() { return preset.talents.filter(isUndecidedDst).reduce((a, t) => a + (t.cnt || 1), 0); }
// 석판 표시 순위: 0=핵심(명칭) / 1=레전드 중위·절대자 / 2=중위 / 3=하위 (2 이상은 기본 접힘)
// 운명 정렬 순서 (사용자 요청, 게임 화면 기준): 미정 숙명 → 이중 천명 → 천명 → 중위 → 하위
function dstRank(t) {
  const e = t.effect || '';
  if (/^\[?미정 숙명/.test(e)) return 0;
  if (/^\[?이중 천명/.test(e)) return 1;
  if (/^\[?천명/.test(e)) return 2;
  if (/^\[?중위 숙명/.test(e)) return 3;
  if (/^\[?하위 숙명/.test(e)) return 4;
  return 5;
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

// ── 빌더 2 스킬 단계 — 왼쪽 9칸(액티브 5·패시브 4, 메인 + 보조 5소켓) + 오른쪽 스킬 도감 (사용자 선택 배치 A) ──
// 칸 규칙은 빌더와 같은 공용 조각(00_skill.js). 스킬 데이터(skill_data.js, 약 1MB)는 이 단계에 처음 들어올 때 받는다.
// 카드는 고르는 데 필요한 것만(설명·세부 수치·레벨별 수치) — 장비·계산과 엮인 최종 레벨·오라·영약 배율은 빌더 화면에서.
let wsTarget = {slot: 'a1', socket: null}; // 지금 채우는 자리 (socket null = 메인, 0~4 = 보조 소켓)
let wsQuery = '', wsTag = '', wsFocus = -1; // 검색어 · 태그 거르기 · 오른쪽 아래 카드로 보는 스킬
let SKILL_IDX = null;
function findSkill(ref) {
  if (!SKILL_IDX) SKILL_IDX = new Map(SKILLS.map((s, i) => [s.name + '\u001f' + s.kind, i]));
  const i = ref && SKILL_IDX.get(ref.name + '\u001f' + ref.kind);
  return i === undefined || i === null ? -1 : i;
}
const wsSlot = id => SKILL_SLOTS.find(s => s.id === id);
const wsSk = id => (preset.skills || {})[id] || null;
const wsIcon = ref => { const i = findSkill(ref); return i >= 0 && SKILLS[i].icon ? SKILLS[i].icon : ''; };
const WS_SOCK_NAME = ['촉발체·일반', '일반', '부귀·일반', '일반', '숭고·일반'];
function wsPool() { // 지금 자리에 들어갈 수 있는 스킬 (빌더 skillPickPool 과 같은 규칙)
  const {slot, socket} = wsTarget, grp = wsSlot(slot).group, sk = wsSk(slot);
  const mainName = sk && sk.main ? sk.main.name : null;
  const special = socket === 2 ? '부귀 보조' : socket === 4 ? '숭고 보조' : null;
  const out = [];
  SKILLS.forEach((s, i) => {
    if (socket === null ? !mainAllows(s, grp) : !socketKinds(socket).includes(s.kind)) return;
    if (special && s.kind === special && (!mainName || s.name.split(':')[0].trim() !== mainName)) return; // 부귀·숭고는 그 메인 전용
    // "실드 스킬을 보조한다" 같은 대상 제한 — 메인 태그에 없으면 뺀다 (이미 끼운 건 뺄 수 있게 남김)
    if (socket !== null && !(sk && sk.sup.some(sp => sp && sp.name === s.name && sp.kind === s.kind)) && !supFits(s, sk && sk.main)) return;
    out.push(i);
  });
  // 정렬: 짝 맞는 부귀·숭고 > 같은 묶음의 다른 칸에서 쓰는 보조(추천) > 나머지 — 빌더 1 skillPickPool 과 같은 규칙 (2026-10-10 이식)
  const used = wsUsed();
  const rank = i => (special && SKILLS[i].kind === special) ? 0 : used.has(SKILLS[i].name + '\u001f' + SKILLS[i].kind) ? 1 : 2;
  out.sort((a, b) => rank(a) - rank(b)); // 안정 정렬 — 같은 순위는 원래 순서
  return out;
}
// 보조 추천 — 같은 묶음(액티브/패시브)의 다른 칸에 끼운 보조. 단 메인 성격이 같은 칸만:
// 자극·영약 메인끼리는 보조 구성을 공유하고, 일반 딜링 메인과는 쓰는 보조가 달라서 나눈다 (패시브는 태그가 없어 서로 공유)
function wsUsed() {
  const {slot, socket} = wsTarget, used = new Set();
  if (socket === null) return used;
  const grp = wsSlot(slot).group;
  const isBuff = ref => { if (!ref) return false; const si = findSkill(ref); return si >= 0 && (SKILLS[si].tags || []).some(t => t === '자극' || t === '영약'); };
  const myBuff = isBuff((wsSk(slot) || {}).main);
  SKILL_SLOTS.filter(s2 => s2.group === grp && s2.id !== slot).forEach(s2 => {
    const o = wsSk(s2.id);
    if (!o || !o.main || isBuff(o.main) !== myBuff) return;
    o.sup.forEach(sp => { if (sp) used.add(sp.name + '\u001f' + sp.kind); });
  });
  return used;
}
function wsSetTarget(slot, socket) {
  const sk = wsSk(slot);
  if (socket !== null && !(sk && sk.main)) { socket = null; gbMsg = ''; } // 메인부터
  wsTarget = {slot, socket}; wsTag = ''; wsFocus = -1;
  pageRender();
  wzScrollToMain();
}
function wsPick(i) {
  if (guardShareView()) return;
  const s = SKILLS[i], {slot, socket} = wsTarget;
  if (!preset.skills) preset.skills = {};
  const sk = preset.skills[slot] || (preset.skills[slot] = {main: null, sup: [null, null, null, null, null]});
  if (socket === null) {
    if (sk.main && sk.main.name === s.name && sk.main.kind === s.kind) sk.main = null; // 다시 누르면 빼기
    else {
      const fresh = !sk.main;
      sk.main = {name: s.name, kind: s.kind};
      if (fresh) { const nx = sk.sup.findIndex(x => !x); if (nx >= 0) wsTarget = {slot, socket: nx}; } // 빈 칸이었으면 곧바로 보조 채우기로
    }
  } else {
    const at = sk.sup.findIndex(x => x && x.name === s.name && x.kind === s.kind);
    if (at >= 0) { sk.sup[at] = null; wsTarget = {slot, socket: at}; } // 이미 끼운 보조를 다시 누르면 빼고 그 소켓을 겨냥
    else {
      sk.sup[socket] = {name: s.name, kind: s.kind};
      const nx = sk.sup.findIndex(x => !x);
      if (nx >= 0) wsTarget = {slot, socket: nx};
    }
  }
  if (!sk.main && !sk.sup.some(Boolean)) preset.skills[slot] = null;
  wsFocus = i; wsTag = ''; wsQuery = ''; // 고르고 나면 검색어 비우기
  persistPreset();
  pageRender();
}
function wsClear(slot) {
  if (guardShareView()) return;
  if (preset.skills) preset.skills[slot] = null;
  wsTarget = {slot, socket: null};
  persistPreset();
  pageRender();
}
function wsCard(s) { // 오른쪽 아래 스킬 카드 — tlidb 문구(HTML)는 빌더 카드와 같은 방식으로 그대로 싣는다
  if (!s) return '<div class="ws-card empty">스킬에 마우스를 올리거나 고르면 설명이 여기에 나옵니다</div>';
  const lvd = SKILL_LV[s.name];
  const clean = l => (lvd && lvd.rows) ? l.replace(/\s*\(Lv\d+:[^)]*\)/g, '') : l;
  const dedup = ls => ls.filter((l, i) => !ls.some((o, j) => j !== i && o.length > l.length && o.includes(l)));
  const dsc = dedup((s.desc || []).map(clean));
  let det = dedup((s.details || []).map(clean));
  if (det.join('\n') === dsc.join('\n')) det = [];
  return '<div class="ws-card">' +
    `<div class="ws-ch"><img src="${s.icon || ''}" alt=""><div><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.kind)}${s.level ? ' · Lv.' + escapeHtml(s.level) : ''}</small></div></div>` +
    `<div class="icard-tags">${(s.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` +
    (s.weapon ? `<div class="sk-weapon">${escapeHtml(s.weapon)}</div>` : '') +
    (s.stats && s.stats.length ? `<div class="icard-attrs">${s.stats.map(p => `<div>${escapeHtml(p[0])} <b class="m">${escapeHtml(p[1])}</b></div>`).join('')}</div>` : '') +
    (dsc.length ? `<div class="icard-opts">${dsc.map(l => `<div class="icard-opt">${l}</div>`).join('')}</div>` : '') +
    (det.length ? '<div class="ccard-sec">세부 수치</div>' + det.map(l => `<div class="icard-opt">${l}</div>`).join('') : '') +
    skillLvHtml(s.name) + '</div>';
}
function wsFocusOn(i) { // 마우스를 올린 스킬 카드 — 격자는 다시 그리지 않고 카드만 바꾼다
  const box = document.getElementById('wsCard');
  if (box) box.innerHTML = wsCard(SKILLS[i]);
}
function wsRender() {
  // ── 왼쪽: 9칸
  const energy = g => SKILL_SLOTS.filter(s => s.group === g).reduce((t, s) => t + slotEnergy(s), 0);
  let side = '';
  ['a', 'p'].forEach(g => {
    side += `<div class="gbm-cap">${g === 'a' ? '액티브' : '패시브'} <span class="ws-en">보조 에너지 ${energy(g)}</span></div>`;
    SKILL_SLOTS.filter(s => s.group === g).forEach(sl => {
      const sk = wsSk(sl.id), on = wsTarget.slot === sl.id;
      const mi = sk && sk.main ? wsIcon(sk.main) : '';
      side += `<div class="ws-slot${on ? ' on' : ''}" onclick="wsSetTarget('${sl.id}', null)">` + // 칸 카드 어디를 눌러도 (사용자 요청)
        `<div class="ws-main${on && wsTarget.socket === null ? ' tgt' : ''}" title="${sk && sk.main ? escapeHtml(sk.main.name) : '스킬 고르기'}">` +
        (mi ? `<img src="${mi}" alt="">` : '<span class="ws-plus">+</span>') + '</div>' +
        `<div class="ws-info"><small>${sl.label}</small><b>${sk && sk.main ? escapeHtml(sk.main.name) : '<span class="ws-none">비어 있음</span>'}</b>` +
        '<div class="ws-socks">' + [0, 1, 2, 3, 4].map(k => {
          const sp = sk && sk.sup[k], ic = sp ? wsIcon(sp) : '';
          const tgt = on && wsTarget.socket === k;
          return `<span class="ws-sock${sp ? ' have' : ''}${tgt ? ' tgt' : ''}${k === 0 || k === 2 || k === 4 ? ' sp' : ''}" onclick="event.stopPropagation();wsSetTarget('${sl.id}', ${k})" ` +
            `title="보조 ${k + 1} (${WS_SOCK_NAME[k]})${sp ? ' — ' + escapeHtml(sp.name) : ''}">${ic ? `<img src="${ic}" alt="">` : k + 1}</span>`;
        }).join('') + '</div></div>' +
        (sk ? `<button class="gbm-del" onclick="event.stopPropagation();wsClear('${sl.id}')" title="이 칸 비우기">✕</button>` : '') + '</div>';
    });
  });
  // ── 오른쪽: 지금 자리에 들어갈 스킬 격자
  const sl = wsSlot(wsTarget.slot), sk = wsSk(wsTarget.slot);
  const pool = wsPool();
  const tagCount = {};
  pool.forEach(i => (SKILLS[i].tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const tags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]).slice(0, 18);
  const q = wsQuery.trim().toLowerCase();
  const shown = pool.filter(i => {
    const s = SKILLS[i];
    if (wsTag && !(s.tags || []).includes(wsTag)) return false;
    return !q || (s.name + ' ' + (s.tags || []).join(' ') + ' ' + s.kind).toLowerCase().includes(q);
  });
  const onSet = new Set();
  if (sk) (wsTarget.socket === null ? [sk.main] : sk.sup).forEach(x => { if (x) onSet.add(x.name + '\u001f' + x.kind); });
  const head = wsTarget.socket === null
    ? (sl.id === 'a1' ? `${sl.label} · <b>메인 스킬</b>` : `<b>${sl.label}</b>`) // '메인 스킬'은 액티브 1 만 (사용자 요청)
    : `${sl.label} <span class="ws-mn">${escapeHtml(sk && sk.main ? sk.main.name : '')}</span> · <b>보조 ${wsTarget.socket + 1}</b> <span class="gbm-hint">${WS_SOCK_NAME[wsTarget.socket]}</span>`;
  // 고른 칸 한눈에 — 메인 + 보조 1~5, 눌러서 그 자리로 (사용자 요청)
  const cellOf = (ref, k) => {
    const tgt = wsTarget.socket === k, ic = ref ? wsIcon(ref) : '';
    const lab = k === null ? (sl.id === 'a1' ? '메인 스킬' : sl.label) : '보조 ' + (k + 1);
    return `<div class="ws-strip-c${tgt ? ' tgt' : ''}${ref ? ' have' : ''}${k === null ? ' main' : ''}" onclick="wsSetTarget('${sl.id}', ${k})" title="${escapeHtml(ref ? ref.name : lab)}">` +
      `<span class="ws-strip-i">${ic ? `<img src="${ic}" alt="">` : (k === null ? '+' : k + 1)}</span>` +
      `<span class="ws-strip-t"><small>${escapeHtml(lab)}${k !== null && k % 2 === 0 ? ' · ' + WS_SOCK_NAME[k].split('·')[0] : ''}</small><b>${ref ? escapeHtml(ref.name) : '<i>비어 있음</i>'}</b></span></div>`;
  };
  const strip = '<div class="ws-strip">' + cellOf(sk && sk.main, null) + [0, 1, 2, 3, 4].map(k => cellOf(sk && sk.sup[k], k)).join('') + '</div>';
  const main = `<div class="gbm-head plain">${WZ_UP}<div><small>지금 채우는 자리</small><b class="ws-head">${head}</b></div>` +
    '</div>' + strip +
    `<div class="ws-filter"><input id="wsQ" type="search" placeholder="스킬 이름·태그 검색" value="${escapeHtml(wsQuery)}" oninput="wsQuery=this.value;wsRenderGrid()"><span class="ws-cnt" id="wsCnt">${shown.length}개</span></div>` +
    `<div class="ws-tags"><span class="ws-tag${!wsTag ? ' on' : ''}" onclick="wsTag='';pageRender()">전체</span>` +
    tags.map(t => `<span class="ws-tag${wsTag === t ? ' on' : ''}" onclick="wsTag=${JSON.stringify(t).replace(/"/g, '&quot;')};pageRender()">${escapeHtml(t)}</span>`).join('') + '</div>' +
    `<div class="ws-split"><div class="ws-grid" id="wsGrid">${wsGridHtml(shown, onSet)}</div>` +
    `<div class="ws-cardbox" id="wsCard">${wsCard(SKILLS[wsFocus >= 0 ? wsFocus : (sk && (wsTarget.socket === null ? sk.main : sk.sup[wsTarget.socket]) ? findSkill(wsTarget.socket === null ? sk.main : sk.sup[wsTarget.socket]) : -1)])}</div></div>`;
  return '<div class="gbm wsm"><div class="gbm-top"><b class="gbm-title">스킬</b>' + (typeof gbmHelp === 'function' ? gbmHelp('skill') : '') + 
    '<span class="gbm-keys">왼쪽에서 칸·소켓을 고르고 오른쪽 스킬을 누르면 끼웁니다 (다시 누르면 빼기) <span class="gbm-sep">·</span> 보조 1 촉발체 · 보조 3 부귀 · 보조 5 숭고</span></div>' +
    `<div class="gbm-body"><div class="gbm-side">${side}</div><div class="gbm-main">${main}</div></div></div>`;
}
function wsGridHtml(shown, onSet) {
  if (!shown.length) return '<div class="hrm-empty">조건에 맞는 스킬이 없습니다</div>';
  const used = wsUsed();
  return shown.map(i => {
    const s = SKILLS[i], on = onSet.has(s.name + '\u001f' + s.kind), rec = !on && used.has(s.name + '\u001f' + s.kind);
    return `<div class="ws-cell${on ? ' on' : ''}${rec ? ' rec' : ''}" onclick="wsPick(${i})" onmouseenter="wsFocusOn(${i})" title="${escapeHtml(s.name)}">` +
      `<img src="${s.icon || ''}" loading="lazy" alt="" onerror="this.style.visibility='hidden'"><span>${escapeHtml(s.name)}</span>` +
      (on ? '<i class="ws-tick">✓</i>' : rec ? '<i class="ws-rec" title="같은 성격(자극·영약 / 일반)의 다른 칸에서 쓰는 보조">다른 칸 사용 중</i>' : '') + '</div>';
  }).join('');
}
function wsRenderGrid() { // 검색어 입력 중에는 격자만 다시 그린다 (입력칸 포커스 유지)
  const g = document.getElementById('wsGrid');
  if (!g) return;
  const sk = wsSk(wsTarget.slot), q = wsQuery.trim().toLowerCase();
  const onSet = new Set();
  if (sk) (wsTarget.socket === null ? [sk.main] : sk.sup).forEach(x => { if (x) onSet.add(x.name + '\u001f' + x.kind); });
  const shown = wsPool().filter(i => {
    const s = SKILLS[i];
    if (wsTag && !(s.tags || []).includes(wsTag)) return false;
    return !q || (s.name + ' ' + (s.tags || []).join(' ') + ' ' + s.kind).toLowerCase().includes(q);
  });
  g.innerHTML = wsGridHtml(shown, onSet);
  const cn = document.getElementById('wsCnt'); if (cn) cn.textContent = shown.length + '개';
}

// ── 빌더 2 장비 단계 — 왼쪽 인형 배치 10칸 + 오른쪽 큰 편집 (사용자 선택 배치 A) ──
// 칸·옵션 규칙은 빌더와 같은 공용 조각(00_gear.js). 장비 데이터(gear_data.js: PARTS·GEAR_ROWS·ITEMS, 약 1.3MB)는
// 이 단계에 처음 들어올 때 받는다. 저장 형식은 빌더와 같다 — 레전드 {kind:'item', name, part, snap},
// 제작 {kind:'custom', part, name, opts:{basic, main, sub}}. 계산 연동은 넣지 않는다(사용자 2026-10-08).
// 블러드 {kind:'blood', part, aberrant, name, opts:{blood, base, extra}}. 덧붙임: 조향 v.blend(벨트) · 시퀀스 v.tower(무기) · 침식 v.ero(옵션 순번).
// 제작 옵션 표기 티어는 preset.tier (빌더와 같은 값 — 인형 아래 T2/T1/T0).
let wgBStage = 'bases', wgAberr = null;
let wgMode = 'pick', wgAddQ = ''; // 칸 화면: 'view' = 고른 장비 보기(+조향·시퀀스·침식) / 'pick' = 고르기·고치기 (사용자 제안)
let wgSlot = 'helmet', wgTab = null, wgQuery = '', wgStage = 'basic', wgFocus = -1, wgPart = null, wgMsg = '', wgCount = 0;
let WG_SLOTS = null;
const wgSlots = () => WG_SLOTS || (WG_SLOTS = presetSlotsOf(PARTS));
const wgDef = id => wgSlots().find(s => s.id === id);
const wgCur = id => ((preset.slots || {})[id]) || null;
// 인형 배치 (열, 행) — 게임 장비창처럼 머리부터 발끝까지
// 인게임 장비 슬롯과 같은 2열 배치 (사용자 2026-10-10): 투구·갑옷 / 목걸이·장갑 / 벨트·신발 / 반지·반지 / 무기·무기
const WG_POS = {helmet: [1, 1], chest: [2, 1], neck: [1, 2], glove: [2, 2], belt: [1, 3], boots: [2, 3], ring1: [1, 4], ring2: [2, 4], weapon1: [1, 5], weapon2: [2, 5]};
const WG_KIND = {item: '레전드', custom: '제작', blood: '블러드'};
const wgTwoHand = () => { const w = wgCur('weapon1'); return !!(w && PARTS.TWO_HAND.includes(w.part)); };
function wgItemIdx(name) { return ITEMS.findIndex(x => x.name === name); }
function wgReplaceOk(kind) { // 칸에 다른 종류(레전드·제작·블러드)가 있으면 바꿀지 묻는다
  const c = wgCur(wgSlot);
  return !c || c.kind === kind || confirm('이 칸의 ' + WG_KIND[c.kind] + ' 장비를 ' + WG_KIND[kind] + ' 장비로 바꿀까요?');
}
function wgSave(nv) { // 칸에 넣기 — 조향·시퀀스·베이스는 빌더와 같은 규칙으로 이어 받는다
  if (!preset.slots) preset.slots = {};
  preset.slots[wgSlot] = nv ? carryAddons(preset.slots[wgSlot], nv) : null;
  persistPreset();
}
function wgPick(id) {
  wgSlot = id; wgQuery = ''; wgFocus = -1; wgMsg = ''; wgPart = null; wgAberr = null; wgBStage = 'bases'; wgAddQ = '';
  const c = wgCur(id);
  wgMode = c ? 'view' : 'pick'; // 이미 고른 칸은 보기부터
  wgTab = c ? (c.kind === 'custom' ? 'craft' : c.kind === 'blood' ? 'blood' : 'item') : 'item';
  wgStage = 'basic';
  pageRender();
  wzScrollToMain();
}
function wgSetTab(t) { wgTab = t; wgMode = 'pick'; wgQuery = ''; wgFocus = -1; wgMsg = ''; pageRender(); }
function wgSetMode(m, tab) { wgMode = m; if (tab) wgTab = tab; wgQuery = ''; wgFocus = -1; wgMsg = ''; pageRender(); }
function wgClear(id) {
  if (guardShareView()) return;
  if (preset.slots) preset.slots[id] = null;
  if (id === wgSlot) { wgPart = null; wgTab = 'item'; }
  persistPreset();
  pageRender();
}
// ── 레전드
function wgItemPool() { // 이 칸에 들어갈 레전드 [{idx, name, part}] — 부위가 없는 특수 장비(올마이티 오리진)는 갑옷 칸에만
  const def = wgDef(wgSlot), seen = new Map();
  GEAR_ROWS.forEach(r => {
    if (isBasicType(r.type) || r.item === undefined) return;
    if (!(r.source ? def.parts.includes(r.source) : wgSlot === 'chest')) return;
    if (!seen.has(r.type)) seen.set(r.type, {idx: +r.item, name: r.type, part: r.source || '특수 갑옷', txt: r.type});
    seen.get(r.type).txt += ' ' + r.effect;
  });
  return [...seen.values()];
}
function wgEquipItem(idx) {
  if (guardShareView()) return;
  const it = ITEMS[idx], g = wgItemPool().find(x => x.idx === idx);
  if (!it || !g) return;
  if (wgSlot === 'weapon2' && wgTwoHand()) { wgMsg = '양손 무기를 끼고 있어 이 칸은 쓸 수 없습니다'; pageRender(); return; }
  const cur = wgCur(wgSlot);
  if (cur && cur.kind === 'item' && cur.name === it.name) { wgSave(null); pageRender(); return; } // 다시 누르면 빼기
  if (!wgReplaceOk('item')) return;
  if (wgSlot === 'weapon1' && PARTS.TWO_HAND.includes(g.part) && wgCur('weapon2')) {
    if (!confirm('양손 무기를 끼면 무기(방패) 칸이 비워집니다. 진행할까요?')) return;
    preset.slots.weapon2 = null;
  }
  wgSave({kind: 'item', name: it.name, part: g.part, snap: it});
  wgFocus = idx; wgMsg = ''; wgMode = 'view'; // 레전드는 고르면 끝 — 보기로
  pageRender();
}
function wgItemCard(it) {
  if (!it) return '<div class="ws-card empty">장비에 마우스를 올리거나 고르면 카드가 여기에 나옵니다</div>';
  return '<div class="ws-card wg-icard">' +
    (it.img ? `<div class="wg-iimg"><img src="${it.img}" alt="" onerror="this.remove()"></div>` : '') +
    `<div class="wg-iname">${escapeHtml(it.name)}</div>` +
    (it.tags && it.tags.length ? `<div class="icard-tags">${it.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : '') +
    (it.attrs && it.attrs.length ? `<div class="icard-attrs">${it.attrs.map(l => `<div>${l}</div>`).join('')}</div>` : '') +
    (it.opts && it.opts.length ? `<div class="icard-opts">${it.opts.map(l => `<div class="icard-opt">${l}</div>`).join('')}</div>` : '') +
    (it.corr && it.corr.length ? '<div class="ccard-sec">침식화 시 (최대 2개 강화)</div>' + it.corr.map(c => `<div class="icard-opt">${c[1]}</div>`).join('') : '') +
    itemPoolsHtml(it) +
    (it.flavor ? `<div class="wg-flavor">${it.flavor}</div>` : '') + '</div>';
}
function wgFocusOn(idx) { const b = document.getElementById('wgCard'); if (b) b.innerHTML = wgItemCard(ITEMS[idx]); }
function wgItemGridHtml() {
  const q = wgQuery.trim().toLowerCase(), cur = wgCur(wgSlot);
  const list = wgItemPool().filter(g => !q || g.txt.toLowerCase().includes(q));
  wgCount = list.length;
  if (!list.length) return '<div class="hrm-empty">조건에 맞는 레전드가 없습니다</div>';
  return list.map(g => {
    const it = ITEMS[g.idx], on = cur && cur.kind === 'item' && cur.name === g.name;
    return `<div class="wg-cell${on ? ' on' : ''}" onclick="wgEquipItem(${g.idx})" onmouseenter="wgFocusOn(${g.idx})">` +
      `<div class="wg-cimg">${it && it.img ? `<img src="${it.img}" loading="lazy" alt="" onerror="this.remove()">` : ''}</div>` +
      `<b>${escapeHtml(g.name)}</b><small>${escapeHtml(g.part)}</small>${on ? '<i class="ws-tick">✓</i>' : ''}</div>`;
  }).join('');
}
// ── 제작
function wgCraftPart() {
  const cur = wgCur(wgSlot), parts = wgDef(wgSlot).parts;
  if (cur && cur.kind === 'custom') return cur.part;
  return wgPart || (parts.length === 1 ? parts[0] : null);
}
function wgSetPart(pt) {
  if (guardShareView()) return;
  const cur = wgCur(wgSlot);
  if (cur && cur.kind === 'custom' && cur.part !== pt) {
    const n = ['basic', 'main', 'sub'].reduce((t, c) => t + cur.opts[c].length, 0);
    if (n && !confirm('부위를 바꾸면 고른 옵션 ' + n + '개가 지워집니다. 진행할까요?')) return;
    wgSave(null);
  }
  if (wgSlot === 'weapon2' && wgTwoHand()) { wgMsg = '양손 무기를 끼고 있어 이 칸은 쓸 수 없습니다'; pageRender(); return; }
  wgPart = pt; wgStage = 'basic'; wgQuery = ''; wgMsg = '';
  pageRender();
}
// 베이스(노말) 아이템 — 부위(힘 투구·한손검 …) = 베이스의 종류(cat). 레벨 높은 순. 고른 gid 는 v.base (빌더 1·공유 코드 bs 와 같은 자리)
const wgBasesOf = part => BASES.filter(b => b.cat === part).sort((a, b) => b.lv - a.lv || a.name.localeCompare(b.name));
const wgBaseRow = gid => gid ? BASES.find(b => b.gid === String(gid)) : null;
const wgCustName = v => v.name || ((wgBaseRow(v.base) || {}).name ? wgBaseRow(v.base).name : v.part + ' (제작)'); // 이름 없으면 베이스 이름
// 제작·블러드 칸 그림 = 고른 베이스 그림 (2026-10-10) — 블러드는 베이스를 안 골랐으면 부위 자동 베이스, 그림이 없으면 ⚒ / ✦
function wgSlotImg(v) {
  const b = wgBaseRow(v.base || (v.kind === 'blood' ? wgBloodBase(v.part, v.aberrant) : ''));
  return b && b.img ? `<img src="${b.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'wg-craft${v.kind === 'blood' ? ' blood' : ''}',textContent:'${v.kind === 'blood' ? '✦' : '⚒'}'}))">`
    : `<span class="wg-craft${v.kind === 'blood' ? ' blood' : ''}">${v.kind === 'blood' ? '✦' : '⚒'}</span>`;
}
const wgBaseLines = b => [...(b.stats || []), ...(b.imps || [])].filter(l => !/\s0$/.test(l)); // 블러드 베이스의 '… 0' 줄은 뺀다
function wgSetBase(gid) {
  if (guardShareView()) return;
  const part = wgCraftPart(), cur = wgCur(wgSlot);
  if (!part || !wgReplaceOk('custom')) { pageRender(); return; }
  const v = cur && cur.kind === 'custom' ? cur : {kind: 'custom', part, name: '', opts: {basic: [], main: [], sub: []}};
  if (gid) v.base = String(gid); else delete v.base;
  wgSave(v); wgMsg = ''; pageRender();
}
function wgBasePickHtml(part) {
  const list = wgBasesOf(part), cur = wgCur(wgSlot), sel = cur && cur.kind === 'custom' ? cur.base : null, b = wgBaseRow(sel);
  if (!list.length) return '';
  return `<div class="wg-parts wg-basepick"><div><small>베이스 아이템</small><select onchange="wgSetBase(this.value)">` +
    `<option value="">고르지 않음 (${escapeHtml(part)})</option>` +
    list.map(x => `<option value="${x.gid}"${x.gid === sel ? ' selected' : ''}>${escapeHtml(x.name)} · Lv ${x.lv}${(x.imps || []).length ? ' · ' + escapeHtml(x.imps[0]) : ''}</option>`).join('') +
    '</select></div>' + (b ? `<div class="wg-bline">${wgBaseLines(b).map(escapeHtml).join(' <span class="gbm-sep">·</span> ')}</div>` : '') + '</div>';
}
function wgOpts() { const c = wgCur(wgSlot); return c && c.kind === 'custom' ? c.opts : {basic: [], main: [], sub: []}; }
function wgGradeCount(opts, g) { return ['basic', 'main', 'sub'].reduce((n, c) => n + opts[c].filter(o => optGrade(o.type) === g).length, 0); }
function wgCraftPool() { // 빌더 craftPool 과 같은 규칙 — 시퀀스는 무기 칸 [시퀀스]로 따로라 제외
  const part = wgCraftPart();
  return GEAR_ROWS.filter(r => r.source === part && isBasicType(r.type) && !r.type.includes('시퀀스') &&
    (classifyOptType(r.type) === wgStage || (wgStage !== 'basic' && classifyOptType(r.type) === null)))
    .sort((a, b) => gradeOrder(a.type) - gradeOrder(b.type));
}
function wgToggleOpt(i) {
  if (guardShareView()) return;
  const r = wgCraftPool()[i], part = wgCraftPart();
  if (!r || !part) return;
  const cur = wgCur(wgSlot);
  if (!wgReplaceOk('custom')) return;
  const v = cur && cur.kind === 'custom' ? cur : {kind: 'custom', part, name: '', opts: {basic: [], main: [], sub: []}};
  const k = rowKey(r);
  for (const c of ['basic', 'main', 'sub']) {
    const x = v.opts[c].findIndex(o => o.k === k);
    if (x >= 0) { v.opts[c].splice(x, 1); wgSave(v); wgMsg = ''; pageRender(); return; } // 다시 누르면 빼기
  }
  const list = v.opts[wgStage], g = optGrade(r.type);
  if (list.length >= OPT_LIMITS[wgStage]) { wgMsg = CRAFT_STAGES.find(s => s.key === wgStage).label + '은 ' + OPT_LIMITS[wgStage] + '개까지입니다'; pageRender(); return; }
  if (GRADE_LIMITS[g] && wgGradeCount(v.opts, g) >= GRADE_LIMITS[g]) { wgMsg = g + ' 옵션은 메인·서브 합쳐 ' + GRADE_LIMITS[g] + '개까지입니다'; pageRender(); return; }
  list.push({k, effect: r.effect, source: r.source, type: r.type});
  wgSave(v);
  // 빌더와 같은 흐름: 기본은 1개 고르면 메인으로, 메인·서브는 다 차면 다음으로
  const full = wgStage === 'basic' ? list.length >= 1 : list.length >= OPT_LIMITS[wgStage];
  if (full && wgStage !== 'sub') { wgStage = wgStage === 'basic' ? 'main' : 'sub'; wgQuery = ''; }
  wgMsg = '';
  pageRender();
}
function wgDelOpt(cat, i) {
  if (guardShareView()) return;
  const v = wgCur(wgSlot);
  if (!v || v.kind !== 'custom') return;
  v.opts[cat].splice(i, 1);
  wgSave(v);
  pageRender();
}
const WG_GR_ROW = {'절대': 'gr-abs', '진급': 'gr-adv', '초급': 'gr-beg'};
function wgOptListHtml() {
  const q = wgQuery.trim().toLowerCase(), opts = wgOpts();
  const pool = wgCraftPool();
  let n = 0;
  const h = pool.map((r, i) => {
    if (q && !(r.effect + ' ' + r.type).toLowerCase().includes(q)) return '';
    n++;
    const k = rowKey(r), on = ['basic', 'main', 'sub'].some(c => opts[c].some(o => o.k === k));
    const g = optGrade(r.type), dis = !on && GRADE_LIMITS[g] && wgGradeCount(opts, g) >= GRADE_LIMITS[g];
    return `<div class="wg-opt ${WG_GR_ROW[g] || ''}${on ? ' on' : ''}${dis ? ' dis' : ''}"${dis ? '' : ` onclick="wgToggleOpt(${i})"`}>` +
      `<span>${wgOptHtml(tierEffect(r), r.tips)}</span><em class="${GRADE_CLASS[g] || ''}">${escapeHtml(r.type)}</em></div>`;
  }).join('');
  wgCount = n;
  return h || '<div class="hrm-empty">조건에 맞는 옵션이 없습니다</div>';
}
function wgSearch(v) { // 입력 중에는 목록만 다시 그린다 (입력칸 포커스 유지)
  wgQuery = v;
  const box = document.getElementById('wgList');
  if (box) box.innerHTML = wgTab === 'craft' ? wgOptListHtml() : wgTab === 'blood' ? wgBListHtml() : WG_ADD[wgTab] ? wgAddListHtml() : wgItemGridHtml();
  const cn = document.getElementById('wgCnt'); if (cn) cn.textContent = wgCount + '개';
}

// ── 블러드 (빌더 블러드 마법사와 같은 규칙: 기본 옵션 ≤2 → 레전드 추출 ≤2(한 장비) → 추가 옵션 ≤4, 레전드 1개면 5)
let WG_BSET = null;
const wgBSet = () => WG_BSET || (WG_BSET = bloodSetPartsOf(PARTS));
const wgBPart = () => bloodPartOfLabel(wgDef(wgSlot).label);
function wgBloodSlot() { const s = wgSlots().find(x => (wgCur(x.id) || {}).kind === 'blood'); return s ? s.id : null; }
function wgBPool(aberr) { return BLOODP.find(b => b.part === wgBPart() && !!b.aberrant === !!aberr) || null; }
function wgBAberr() { const c = wgCur(wgSlot); return c && c.kind === 'blood' ? !!c.aberrant : (wgAberr === null ? false : wgAberr); }
function wgBOpts() { const c = wgCur(wgSlot); return c && c.kind === 'blood' ? c.opts : {blood: [], base: [], extra: []}; }
function wgBLegendPool() { // 이 칸의 세트에서 추출할 수 있는 레전드 옵션 (빌더 bloodLegendPool 과 같음 — 부위 빈 특수 장비는 갑옷 취급)
  const parts = wgBSet()[wgSlot] || [];
  return GEAR_ROWS.filter(r => !isBasicType(r.type) && (r.source ? parts.includes(r.source) : PARTS.CHESTS.some(p => parts.includes(p))));
}
// 블러드 베이스 — 부위마다 하나로 정해져 있다 (블러드 러스트 부위: 뇌·가슴·팔·다리·목·손가락·허리, 이상 부위 따로, 수치 0)
const WG_BLOOD_LIMB = {'투구': '뇌', '갑옷': '가슴', '장갑': '팔', '신발': '다리', '목걸이': '목', '반지': '손가락', '벨트': '허리'};
function wgBloodBase(part, aberrant) {
  const nm = '블러드 러스트 ' + (aberrant ? '이상 ' : '') + '부위: ' + (WG_BLOOD_LIMB[part] || '');
  return (BASES.find(b => b.name === nm) || {}).gid || null;
}
function wgBSave(o) { // 고른 게 하나도 없으면 칸을 비운다
  const n = o.blood.length + o.base.length + o.extra.length;
  const c = wgCur(wgSlot);
  wgSave(n ? {kind: 'blood', part: wgBPart(), aberrant: wgBAberr(), name: (c && c.kind === 'blood' && c.name) || '', opts: o} : null);
  const v = wgCur(wgSlot), gid = v && wgBloodBase(v.part, v.aberrant); // 이상 부위로 바뀌면 베이스도 바뀐다 (carryAddons 가 옛 것을 이어 붙이므로 뒤에서 덮는다)
  if (v) { if (gid) v.base = gid; else delete v.base; persistPreset(); }
}
function wgBCan() { // 블러드를 만들 수 없는 이유 — 되면 ''
  if (!wgBSet()[wgSlot]) return '무기 칸에는 블러드 장비가 없습니다';
  const b = wgBloodSlot();
  if (b && b !== wgSlot) return '블러드 장비는 빌드에 하나만 쓸 수 있습니다 — 지금 ' + wgDef(b).label + ' 칸에 있습니다';
  return '';
}
function wgSetAberr(on) {
  if (guardShareView()) return;
  const c = wgCur(wgSlot);
  if (c && c.kind === 'blood' && !!c.aberrant !== on) {
    if (!confirm('베이스를 바꾸면 고른 기본·추가 옵션이 지워집니다(풀이 달라서). 진행할까요?')) return;
    const o = c.opts; o.base = []; o.extra = [];
    c.aberrant = on; wgBSave(o);
  }
  wgAberr = on; pageRender();
}
function wgBToggle(stage, i) {
  if (guardShareView()) return;
  const why = wgBCan();
  if (why) { wgMsg = why; pageRender(); return; }
  if (!wgReplaceOk('blood')) return;
  const o = JSON.parse(JSON.stringify(wgBOpts())), pool = wgBPool(wgBAberr()), part = wgBPart();
  wgMsg = '';
  if (stage === 'bases') {
    const eff = pool.basic[i], x = o.base.findIndex(e => e.effect === eff);
    if (x >= 0) o.base.splice(x, 1);
    else if (o.base.length >= 2) wgMsg = '기본 옵션은 2개까지입니다';
    else { o.base.push({effect: eff, source: part, type: '기본 옵션'}); if (o.base.length >= 2) wgBStage = 'picks'; }
  } else if (stage === 'picks') {
    const r = wgBLegendPool()[i], k = rowKey(r), x = o.blood.findIndex(e => e.k === k);
    if (x >= 0) o.blood.splice(x, 1);
    else if (o.blood.length >= 2) wgMsg = '레전드 옵션은 2개까지입니다';
    else if (o.blood.length && o.blood[0].type !== r.type) wgMsg = '레전드 추출은 한 장비에서만 됩니다 — ' + o.blood[0].type;
    else if (o.blood.length === 1 && o.extra.length > bloodExtraCap(2)) wgMsg = '추가 옵션이 5개면 레전드 옵션을 2개로 늘릴 수 없습니다 (추가 옵션을 먼저 빼 주세요)';
    else { o.blood.push({k, effect: r.effect, source: r.source, type: r.type}); if (o.blood.length >= 2) wgBStage = 'extras'; }
  } else {
    const p = pool.opts[i], x = o.extra.findIndex(e => e.effect === p.effect), g = optGrade(p.type);
    const cap = bloodExtraCap(o.blood.length);
    if (x >= 0) o.extra.splice(x, 1);
    else if (o.extra.length >= cap) wgMsg = '추가 옵션은 ' + cap + '개까지입니다' + (cap === 4 ? ' (레전드 옵션을 1개만 담으면 5개)' : '');
    else if (GRADE_LIMITS[g] && o.extra.filter(e => optGrade(e.type) === g).length >= GRADE_LIMITS[g]) wgMsg = g + ' 옵션은 ' + GRADE_LIMITS[g] + '개까지입니다';
    else {
      const tiers = {};
      if (p.t0) tiers.t0 = p.t0;
      if (p.t0p) tiers.t0p = p.t0p; // 침식(T0+) 수치
      if (p.t2) tiers.t2 = p.t2;
      o.extra.push({effect: p.effect, source: part, type: p.type, tiers});
    }
  }
  wgBSave(o);
  pageRender();
}
function wgBDel(key, i) {
  if (guardShareView()) return;
  const o = JSON.parse(JSON.stringify(wgBOpts()));
  o[key].splice(i, 1);
  wgBSave(o);
  pageRender();
}
function wgBListHtml() {
  const q = wgQuery.trim().toLowerCase(), o = wgBOpts(), pool = wgBPool(wgBAberr());
  const hit = t => !q || t.toLowerCase().includes(q);
  let n = 0, h = '';
  if (wgBStage === 'bases') {
    if (!pool) return '<div class="hrm-empty">블러드 풀 데이터가 없습니다</div>';
    pool.basic.forEach((eff, i) => {
      if (!hit(eff)) return; n++;
      h += `<div class="wg-opt${o.base.some(e => e.effect === eff) ? ' on' : ''}" onclick="wgBToggle('bases',${i})"><span>${escapeHtml(eff)}</span></div>`;
    });
  } else if (wgBStage === 'picks') {
    const lock = o.blood.length ? o.blood[0].type : null, groups = new Map();
    wgBLegendPool().forEach((r, i) => { if (!groups.has(r.type)) groups.set(r.type, {src: r.source || '특수 갑옷', rows: []}); groups.get(r.type).rows.push({r, i}); });
    const order = [...groups.keys()].sort((a, b) => (b === lock) - (a === lock)); // 추출 중인 장비를 맨 위로
    order.forEach(item => {
      const g = groups.get(item);
      const vis = g.rows.filter(x => hit(x.r.effect + ' ' + item));
      if (!vis.length) return;
      const dg = lock && item !== lock;
      n += vis.length;
      h += `<div class="wg-bgrp${dg ? ' dis' : ''}"><div class="wg-bgh"><b>${escapeHtml(item)}</b><small>${escapeHtml(g.src)}</small></div>` +
        vis.map(x => { const on = o.blood.some(e => e.k === rowKey(x.r)); return `<div class="wg-opt${on ? ' on' : ''}${dg && !on ? ' dis' : ''}"${dg && !on ? '' : ` onclick="wgBToggle('picks',${x.i})"`}><span>${wgOptHtml(x.r.effect, x.r.tips)}</span></div>`; }).join('') + '</div>';
    });
  } else {
    if (!pool) return '<div class="hrm-empty">블러드 풀 데이터가 없습니다</div>';
    const gc = gr => o.extra.filter(e => optGrade(e.type) === gr).length;
    pool.opts.forEach((p, i) => {
      if (!hit(p.effect + ' ' + p.type)) return; n++;
      const on = o.extra.some(e => e.effect === p.effect), g = optGrade(p.type), dis = !on && GRADE_LIMITS[g] && gc(g) >= GRADE_LIMITS[g];
      h += `<div class="wg-opt ${WG_GR_ROW[g] || ''}${on ? ' on' : ''}${dis ? ' dis' : ''}"${dis ? '' : ` onclick="wgBToggle('extras',${i})"`}><span>${wgOptHtml(tierEffect({effect: p.effect, tiers: {t0: p.t0, t0p: p.t0p, t2: p.t2}}), p.tips)}</span><em class="${GRADE_CLASS[g] || ''}">${escapeHtml(p.type)}</em></div>`;
    });
  }
  wgCount = n;
  return h || '<div class="hrm-empty">조건에 맞는 옵션이 없습니다</div>';
}
function wgBloodBody() {
  const why = wgBCan();
  if (why) {
    const b = wgBloodSlot();
    return `<div class="hrm-empty">${escapeHtml(why)}${b && b !== wgSlot ? `<br><span class="ws-tag" onclick="wgPick('${b}');wgSetTab('blood')">${escapeHtml(wgDef(b).label)} 칸으로 가기</span>` : ''}</div>`;
  }
  const o = wgBOpts(), ab = wgBAberr(), hasAb = !!wgBPool(true);
  const caps = {bases: 2, picks: 2, extras: bloodExtraCap(o.blood.length)}, keyOf = {bases: 'base', picks: 'blood', extras: 'extra'};
  const base = hasAb ? '<div class="wg-parts"><div><small>베이스</small>' +
    `<span class="ws-tag${!ab ? ' on' : ''}" onclick="wgSetAberr(false)">일반 부위</span><span class="ws-tag${ab ? ' on' : ''}" onclick="wgSetAberr(true)">이상 부위 (소환 옵션 풀)</span></div></div>` : '';
  const picked = BLOOD_STAGES.map(st => {
    const list = o[keyOf[st.key]];
    return `<div class="wg-pk${wgBStage === st.key ? ' on' : ''}" onclick="wgBStage='${st.key}';wgQuery='';pageRender()">` +
      `<div class="wg-pkh"><b>${st.label}</b><span>${list.length} / ${caps[st.key]}</span></div>` +
      (list.length ? list.map((e, i) => `<div class="wg-pko ${WG_GR_ROW[optGrade(e.type)] || ''}"><span class="wg-pkt">${escapeHtml(st.key === 'extras' ? tierEffect(e) : e.effect)}</span>` +
        `<button onclick="event.stopPropagation();wgBDel('${keyOf[st.key]}',${i})" title="빼기">✕</button></div>`).join('') : '<div class="wg-pke">눌러서 고르기</div>') + '</div>';
  }).join('');
  const gc = gr => o.extra.filter(e => optGrade(e.type) === gr).length;
  const lh = wgBListHtml();
  return base + `<div class="wg-picked">${picked}</div>` +
    `<div class="wg-grades">${escapeHtml(BLOOD_SET_NAME[wgSlot] || '')} 세트 · ${escapeHtml(wgBPart())}${ab ? ' (이상)' : ''} <span class="gbm-sep">·</span> ` +
    (wgBStage === 'extras' ? `<span class="g-abs">절대 ${gc('절대')}/2</span> · <span class="g-adv">진급 ${gc('진급')}/2</span>` :
     wgBStage === 'picks' ? (o.blood.length ? '추출 장비: <b>' + escapeHtml(o.blood[0].type) + '</b> (같은 장비의 옵션만)' : '한 장비에서만 추출할 수 있습니다') : '기본 옵션') + '</div>' +
    `<div class="ws-filter"><input type="search" placeholder="옵션 검색" value="${escapeHtml(wgQuery)}" oninput="wgSearch(this.value)"><span class="ws-cnt" id="wgCnt">${wgCount}개</span></div>` +
    `<div class="wg-list" id="wgList">${lh}</div>`;
}

// ── 덧붙임: 조향(벨트) · 시퀀스(무기) · 침식(옵션 강화) — 빌더 05_ui 의 조향·타워·침식 고르기와 같은 저장
const WG_ADD = {blend: '조향', tower: '시퀀스', ero: '침식'};
function wgAddTabs(id) { // 이 칸에 붙일 수 있는 덧붙임 탭
  const v = wgCur(id);
  if (!v) return [];
  return [...(id === 'belt' ? ['blend'] : []), ...(id === 'weapon1' || id === 'weapon2' ? ['tower'] : []), 'ero'];
}
function wgPickBlend(i) {
  if (guardShareView()) return;
  const v = wgCur('belt'); if (!v) return;
  const b = BLENDS[i];
  if (v.blend && v.blend.effect === b.effect) delete v.blend; else v.blend = {effect: b.effect, req: b.req || ''};
  persistPreset(); pageRender();
}
function wgPickTower(i) {
  if (guardShareView()) return;
  const v = wgCur(wgSlot); if (!v) return;
  const t = TOWERS[i];
  if (v.tower && v.tower.effect === t.effect) delete v.tower; else v.tower = {effect: t.effect, seq: t.seq || ''};
  persistPreset(); pageRender();
}
function wgEroList(v) { // 빌더 slotOptList 와 같은 순번 — 레전드 opts / 제작 기본→메인→서브 / 블러드 기본→레전드→추가
  if (v.kind === 'item') { // 로그가 준 실제 굴림값·랜덤 옵션 문구를 끼운 아이템 (빌더 rolledItem — 00_logbase)
    const it = rolledItem(v, ITEMS[wgItemIdx(v.name)] || v.snap) || {};
    return (it.opts || []).map((o, i) => ({html: o, corrHtml: it.corr && it.corr[i] ? it.corr[i][1] : null}));
  }
  const prev = o => { const cur = tierEffect(o), up = eroEffect(o); return up !== cur ? wgOptHtml(up, wgTips(o)) : null; };
  const one = (o, txt, corr) => ({html: wgOptHtml(txt, wgTips(o)), corrHtml: corr, o});
  if (v.kind === 'blood') return [
    ...(v.opts.base || []).map(o => one(o, o.effect, null)),
    ...v.opts.blood.map(o => one(o, o.effect, bloodLegendCorr(o))),
    ...(v.opts.extra || []).map(o => one(o, tierEffect(o), prev(o)))];
  return ['basic', 'main', 'sub'].flatMap(c => v.opts[c].map(o => one(o, tierEffect(o), prev(o))));
}
function wgToggleEro(i) {
  if (guardShareView()) return;
  const v = wgCur(wgSlot); if (!v) return;
  const ero = v.ero || [], at = ero.indexOf(i);
  if (at >= 0) ero.splice(at, 1);
  else if (ero.length >= corrLimit(v)) { wgMsg = '침식 강화는 옵션 ' + corrLimit(v) + '개까지입니다'; pageRender(); return; }
  else { ero.push(i); ero.sort((a, b) => a - b); }
  if (ero.length) v.ero = ero; else delete v.ero;
  wgRandSync(v, i); // 고른 랜덤 옵션은 침식화 후보 문구로 바꿔 끼운다
  wgMsg = ''; persistPreset(); pageRender();
}
function wgAddListHtml() {
  const v = wgCur(wgSlot), q = wgQuery.trim().toLowerCase(), hit = t => !q || t.toLowerCase().includes(q);
  let n = 0, h = '';
  if (wgTab === 'blend') {
    BLENDS.forEach((b, i) => {
      if (!hit(b.effect + ' ' + (b.req || ''))) return; n++;
      const on = v.blend && v.blend.effect === b.effect;
      h += `<div class="wg-opt${on ? ' on' : ''}" onclick="wgPickBlend(${i})"><span>${escapeHtml(b.effect)}</span><em>${escapeHtml([b.req, b.mats].filter(Boolean).join(' · '))}</em></div>`;
    });
  } else if (wgTab === 'tower') {
    TOWERS.forEach((t, i) => {
      if (t.source !== v.part || !hit(t.effect + ' ' + (t.seq || ''))) return; n++;
      const on = v.tower && v.tower.effect === t.effect;
      h += `<div class="wg-opt${on ? ' on' : ''}" onclick="wgPickTower(${i})"><span>${escapeHtml(t.effect)}</span><em>${escapeHtml(t.seq || '')}</em></div>`;
    });
    if (!n && !q) h = `<div class="hrm-empty">${escapeHtml(v.part)} 부위의 시퀀스가 없습니다</div>`;
  } else {
    const ero = v.ero || [];
    wgEroList(v).forEach((o, i) => {
      n++;
      const on = ero.includes(i);
      h += `<div class="wg-opt wg-ero${on ? ' on' : ''}" onclick="wgToggleEro(${i})"><span>${o.html}${o.corrHtml ? `<small class="wg-corr">침식 시: ${o.corrHtml}</small>` : ''}</span>${on ? '<em class="wg-echip">침식</em>' : ''}</div>`;
    });
  }
  wgCount = n;
  return h || '<div class="hrm-empty">조건에 맞는 항목이 없습니다</div>';
}
function wgAddBody() {
  const v = wgCur(wgSlot);
  if (!v) return '<div class="hrm-empty">먼저 장비를 끼워 주세요</div>';
  const lh = wgAddListHtml();
  const cur = wgTab === 'blend' ? (v.blend ? v.blend.effect : '') : wgTab === 'tower' ? (v.tower ? v.tower.effect : '') : '';
  const head = wgTab === 'ero'
    ? `<div class="wg-grades">옵션 최대 ${corrLimit(v)}개 강화 · 지금 ${(v.ero || []).length} / ${corrLimit(v)} <span class="gbm-sep">·</span> 레전드는 침식 수치를, 제작·블러드는 한 단계 위 티어 수치를 함께 보여 줍니다</div>`
    : `<div class="wg-grades">${WG_ADD[wgTab]}은 한 줄만 · 지금: ${cur ? '<b>' + escapeHtml(cur) + '</b>' : '없음'}${wgTab === 'tower' ? ' <span class="gbm-sep">·</span> ' + escapeHtml(v.part) + ' 전용' : ''} (다시 누르면 빼기)</div>`;
  return head + (wgTab === 'ero' ? '' : `<div class="ws-filter"><input type="search" placeholder="${WG_ADD[wgTab]} 검색" value="${escapeHtml(wgQuery)}" oninput="wgSearch(this.value)"><span class="ws-cnt" id="wgCnt">${wgCount}개</span></div>`) +
    `<div class="wg-list" id="wgList">${lh}</div>`;
}
// ── 티어 (T2/T1/T0) — 제작·블러드 추가 옵션 수치 표기. 로그로 확정된 굴림값이 있는 빌드는 바꾸지 않는다(빌더와 같음)
function wgHasRolled() {
  return Object.values(preset.slots || {}).some(v => v && v.opts && ['basic', 'main', 'sub'].some(k => (v.opts[k] || []).some(o => o && o.rolled)));
}
function wgSetTier(t) {
  if (guardShareView() || wgHasRolled()) return;
  preset.tier = t; persistPreset(); pageRender();
}

// ── 고른 칸 보기 — 왼쪽 장비 옵션(줄을 누르면 침식) · 오른쪽 조향·시퀀스·침식
function wgViewOptsHtml(v) {
  // 조향·시퀀스도 장비 옵션과 함께 보여 준다 (사용자 요청 — 오른쪽에서 고르고, 결과는 여기서도)
  const addSec = ['blend', 'tower'].filter(k => v[k]).map(k => {
    const src = (k === 'blend' ? BLENDS : TOWERS).find(x => x.effect === v[k].effect) || {};
    const sub = k === 'blend' ? v[k].req : v[k].seq;
    return `<div class="wg-vsec">${WG_ADD[k]}</div><div class="wg-vo wg-vadd"><span>${wgOptHtml(v[k].effect, src.tips)}</span>${sub ? `<em class="wg-vt">${escapeHtml(sub)}</em>` : ''}</div>`;
  }).join('');
  const it = v.kind === 'item' ? (ITEMS[wgItemIdx(v.name)] || v.snap || {}) : {};
  return wgViewOptsCore(v, addSec) + (it.flavor ? `<div class="wg-flavor">${it.flavor}</div>` : ''); // 설명 문구는 맨 끝
}
function wgViewOptsCore(v, addSec) { // addSec = 조향·시퀀스 — 기본 옵션 바로 아래(레전드는 옵션 위) (사용자 요청)
  const ero = v.ero || [], list = wgEroList(v);
  let k = 0;
  const line = (label, n) => { // n 줄을 하나의 묶음으로
    const rows = [];
    for (let j = 0; j < n; j++, k++) {
      const o = list[k], on = ero.includes(k);
      const g = o.o ? optGrade(o.o.type) : null, tr = o.o ? affixTier(o.o) : null;
      rows.push(`<div class="wg-vo ${WG_GR_ROW[g] || ''}${on ? ' on' : ''}" onclick="wgToggleEro(${k})">` +
        (tr ? `<i class="tier-chip tier-${tr}" title="이 옵션이 붙은 티어 (로그)">${tierLabel(tr)}</i>` : '') +
        `<span>${on && o.corrHtml ? o.corrHtml : o.html}</span>` +
        (o.o && o.o.type && g !== '기본' ? `<em class="wg-vt ${GRADE_CLASS[g] || ''}">${escapeHtml(o.o.type)}</em>` : '') +
        (on ? '<em class="wg-echip">침식</em>' : '') + '</div>');
    }
    return n ? `<div class="wg-vsec">${label}</div>` + rows.join('') : '';
  };
  if (v.kind === 'item') {
    const it = ITEMS[wgItemIdx(v.name)] || v.snap || {};
    return (it.img ? `<div class="wg-iimg"><img src="${it.img}" alt="" onerror="this.remove()"></div>` : '') +
      `<div class="wg-iname">${escapeHtml(v.name)}</div>` +
      (it.attrs && it.attrs.length ? `<div class="icard-attrs">${it.attrs.map(l => `<div>${l}</div>`).join('')}</div>` : '') +
      addSec + line('옵션', (it.opts || []).length) + wgGauraLine(v);
  }
  const bs = wgBaseRow(v.base), bsec = bs ? `<div class="wg-vsec">베이스 · ${escapeHtml(bs.name)}${bs.lv ? ' (Lv ' + bs.lv + ')' : ''}</div>` +
    wgBaseLines(bs).map(l => `<div class="wg-vo wg-vbase"><span>${escapeHtml(l)}</span></div>`).join('') : '';
  if (v.kind === 'blood') return `<div class="wg-iname">${escapeHtml(v.name || (bs ? bs.name : '블러드 ' + v.part))}${v.aberrant ? ' <small>(이상)</small>' : ''}</div>` + bsec +
    line('기본 옵션', (v.opts.base || []).length) + addSec + line('레전드 추출 · ' + escapeHtml((v.opts.blood[0] || {}).type || ''), v.opts.blood.length) + line('추가 옵션', (v.opts.extra || []).length);
  return `<div class="wg-iname">${escapeHtml(wgCustName(v))}</div>` + bsec +
    line('기본 옵션', v.opts.basic.length) + addSec + line('메인 옵션', v.opts.main.length) + line('서브 옵션', v.opts.sub.length);
}
function wgAddPick(kind, i) { if (kind === 'blend') wgPickBlend(i); else wgPickTower(i); }
function wgAddSearch(val) { wgAddQ = val; const b = document.getElementById('wgAddList'); if (b) b.innerHTML = wgAddRows(); }
function wgAddRows() {
  const v = wgCur(wgSlot), kind = wgSlot === 'belt' ? 'blend' : 'tower', q = wgAddQ.trim().toLowerCase();
  const src = kind === 'blend' ? BLENDS : TOWERS;
  const h = src.map((x, i) => {
    if (kind === 'tower' && x.source !== v.part) return '';
    const sub = kind === 'blend' ? [x.req, x.mats].filter(Boolean).join(' · ') : (x.seq || '');
    if (q && !(x.effect + ' ' + sub).toLowerCase().includes(q)) return '';
    const on = v[kind] && v[kind].effect === x.effect;
    return `<div class="wg-opt${on ? ' on' : ''}" onclick="wgAddPick('${kind}',${i})"><span>${wgOptHtml(x.effect, x.tips)}</span><em>${escapeHtml(sub)}</em></div>`;
  }).join('');
  return h || `<div class="hrm-empty">${kind === 'tower' && !q ? escapeHtml(v.part) + ' 부위의 시퀀스가 없습니다' : '조건에 맞는 항목이 없습니다'}</div>`;
}
// 레전드가 부여하는 '<랜덤 N 레벨 … 아우라 보유>' — 어느 오라인지 고른다 (빌더 grantedAuras 의 랜덤형과 같은 규칙).
// 로그가 그 자리를 복원한 문구(v.rand)가 있으면 실제 오라·레벨을 안다
function wgGaura(v) {
  if (!v || v.kind !== 'item') return null;
  const it = ITEMS[wgItemIdx(v.name)] || v.snap || {};
  for (const [oi, o] of (it.opts || []).entries()) {
    const raw = String(typeof o === 'string' ? o : (o && o.effect) || '').replace(/&lt;|&gt;/g, '').replace(/<(랜덤[^>]*)>/g, '$1');
    const m = /랜덤 ?\(?(\d+)(?:-(\d+))?\)? ?레벨의? ([가-힣 ]+?) 아우라 보유/.exec(plainText(raw).replace(/[–—−~]/g, '-'));
    const pool = m && RAND_AURA_POOLS[m[3].trim()];
    if (!pool) continue;
    let lo = +m[1], hi = +(m[2] || m[1]), pick = v.gaura || null;
    const rd = v.rand && v.rand[oi] && /\(?(\d+)(?:-(\d+))?\)? ?레벨의? ([가-힣 ]+?)[을를]? 보유/.exec(plainText(String(v.rand[oi])));
    if (rd) { lo = +rd[1]; hi = +(rd[2] || rd[1]); if (!pick && pool.includes(rd[3].trim())) pick = rd[3].trim(); }
    return {pool, pick, lv: lo === hi ? String(lo) : lo + '~' + hi, log: !!rd};
  }
  return null;
}
function wgGauraLine(v) {
  const g = wgGaura(v);
  if (!g) return '';
  return '<div class="wg-vsec">부여 오라</div>' + (g.pick
    ? `<div class="wg-vo wg-vbase"><span>${escapeHtml(g.pick)} <b class="m">Lv.${g.lv}</b>${g.log ? ' <small>(로그)</small>' : ''}</span></div>`
    : '<div class="wg-vo wg-vbase"><span class="ws-none">어느 오라인지 고르지 않음</span></div>');
}
function wgSetGaura(nm) {
  if (guardShareView()) return;
  const v = wgCur(wgSlot); if (!v) return;
  if (v.gaura === nm) delete v.gaura; else v.gaura = nm;
  persistPreset(); pageRender();
}
// ── 랜덤 옵션 고르기 — "<랜덤 …>" 줄에 실제로 붙은 후보를 고른다 (2026-10-12, 사용자 요청)
// 저장은 로그 복원과 같은 v.rand[줄] = 문구(계산·공유가 그대로 읽는다). 고른 후보 순번은 v.randSel[줄] —
// 침식을 켜고 끄면 같은 순번의 침식화 후보 문구로 바꿔 끼운다 (후보 목록과 침식화 목록은 순서가 같다)
function wgRandSlots(v) {
  if (!v || v.kind !== 'item') return [];
  const it = ITEMS[wgItemIdx(v.name)] || v.snap || {};
  if (!it.pools || !it.pools.length) return [];
  return (it.opts || []).map((o, oi) => {
    // plainText 는 '<랜덤 …>' 자체를 태그로 보고 지우므로 직접 푼다
    const nm = String(typeof o === 'string' ? o : (o && o.effect) || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    const pool = it.pools.find(x => !x.corr && x.name === nm);
    if (!pool || /아우라 보유/.test(nm)) return null; // 랜덤 오라 줄은 '부여 오라' 고르기가 따로 맡는다
    return {oi, name: nm, pool, corr: it.pools.find(x => x.corr && x.name === nm) || null};
  }).filter(Boolean);
}
function wgRandPlain(html) { // 줄바꿈(<br>)은 \n 으로 남기고 태그만 벗긴다
  return String(html).split(/<br\s*\/?>/i).map(x => plainText(x).trim()).filter(Boolean).join('\n');
}
function wgRandText(v, s, k) {
  const row = s.pool.rows[k]; if (!row) return '';
  const d = /<span class="pool-d">(.*?)<\/span>/.exec(row[1]);
  const base = d ? plainText(d[1]).trim() : wgRandPlain(row[1]);
  const c = s.corr && s.corr.rows[k];
  if (!(v.ero || []).includes(s.oi) || !c) return base;
  if (!d) return wgRandPlain(c[1]);
  const extra = String(c[1]).split(/<br\s*\/?>/i).slice(1).join('<br>'); // 침식화 줄 = 이름(효과는 위) + 덧붙는 효과
  return [base, wgRandPlain(extra)].filter(Boolean).join('\n');
}
function wgRandSync(v, oi) { // 침식 여부가 바뀐 줄의 고른 후보 문구를 다시 만든다
  const k = v && v.randSel && v.randSel[oi];
  if (k == null) return;
  const s = wgRandSlots(v).find(x => x.oi === oi);
  if (s) v.rand[oi] = wgRandText(v, s, k);
}
function wgPickRand(oi, k) {
  if (guardShareView()) return;
  const v = wgCur(wgSlot); if (!v) return;
  const s = wgRandSlots(v).find(x => x.oi === oi); if (!s) return;
  if (v.randSel && v.randSel[oi] === k) { delete v.randSel[oi]; if (v.rand) delete v.rand[oi]; }
  else { v.randSel = v.randSel || {}; v.rand = v.rand || {}; v.randSel[oi] = k; v.rand[oi] = wgRandText(v, s, k); }
  if (v.randSel && !Object.keys(v.randSel).length) delete v.randSel;
  if (v.rand && !Object.keys(v.rand).length) delete v.rand;
  persistPreset(); pageRender();
}
function wgRandBoxes(v) {
  return wgRandSlots(v).map(s => {
    const sel = v.randSel ? v.randSel[s.oi] : null, log = sel == null && v.rand && v.rand[s.oi] != null;
    return `<div class="wg-addbox"><div class="wg-addh"><b>랜덤 옵션</b><span>${escapeHtml(s.name)}${log ? ' · 로그' : ''}</span></div>` +
      `<div class="wg-addd">${s.oi + 1}번째 옵션 줄에 붙은 후보를 고릅니다 (다시 누르면 빼기)${s.corr ? ' · 그 줄을 침식하면 침식화 후보 수치로 바뀝니다' : ''}</div>` +
      `<div class="wg-list wg-randlist">` + s.pool.rows.map((r, k) =>
        `<div class="wg-opt${sel === k ? ' on' : ''}" onclick="wgPickRand(${s.oi},${k})"><span>${r[1]}</span></div>`).join('') + '</div></div>';
  }).join('');
}
function wgViewBody() {
  const v = wgCur(wgSlot), lim = corrLimit(v), n = (v.ero || []).length;
  const kind = wgSlot === 'belt' ? 'blend' : (wgSlot === 'weapon1' || wgSlot === 'weapon2') ? 'tower' : null;
  let right = `<div class="wg-addbox"><div class="wg-addh"><b>침식</b><span>${n} / ${lim}</span></div>` +
    `<div class="wg-addd">왼쪽 옵션 줄을 누르면 침식으로 강화합니다 (${v.kind === 'blood' ? '블러드 3개' : '최대 ' + lim + '개'}). 레전드는 침식 수치, 제작·블러드는 한 단계 위 티어 수치로 보여 줍니다.</div></div>`;
  if (kind) {
    const cur = v[kind];
    right += `<div class="wg-addbox grow"><div class="wg-addh"><b>${WG_ADD[kind]}</b><span>${kind === 'blend' ? '벨트 전용' : escapeHtml(v.part) + ' 전용'} · 한 줄</span></div>` +
      `<div class="wg-addcur">${cur ? '<span class="wg-addv">' + wgOptHtml(cur.effect, ((kind === 'blend' ? BLENDS : TOWERS).find(x => x.effect === cur.effect) || {}).tips) + '</span>' + ` <button onclick="wgAddPick('${kind}',${(kind === 'blend' ? BLENDS : TOWERS).findIndex(x => x.effect === cur.effect)})" title="빼기">✕</button>` : '<span>없음 — 아래에서 고르세요</span>'}</div>` +
      `<div class="ws-filter"><input type="search" placeholder="${WG_ADD[kind]} 검색" value="${escapeHtml(wgAddQ)}" oninput="wgAddSearch(this.value)"></div>` +
      `<div class="wg-list" id="wgAddList">${wgAddRows()}</div></div>`;
  }
  right += wgRandBoxes(v);
  const ga = wgGaura(v);
  if (ga) right += `<div class="wg-addbox"><div class="wg-addh"><b>부여 오라</b><span>Lv.${ga.lv}${ga.log ? ' · 로그' : ''}</span></div>` +
    '<div class="wg-addd">장비가 주는 오라 중 어느 것인지 고릅니다 (다시 누르면 빼기)</div>' +
    ga.pool.map(nm => `<div class="wg-opt${ga.pick === nm ? ' on' : ''}" onclick="wgSetGaura('${escapeHtml(nm)}')"><span>${escapeHtml(nm)}</span></div>`).join('') + '</div>';
  return `<div class="wg-view"><div class="wg-vleft ws-cardbox">${wgViewOptsHtml(v)}</div><div class="wg-vright">${right}</div></div>`;
}
// 저장된 옵션 → 데이터 행의 용어 툴팁(tips)
let WG_ROWTIPS = null;
function wgTips(o) {
  if (!WG_ROWTIPS) { WG_ROWTIPS = new Map(); GEAR_ROWS.forEach(r => { if (r.tips && r.tips.length) WG_ROWTIPS.set(rowKey(r), r.tips); }); }
  return (o && (o.tips || WG_ROWTIPS.get(o.k || rowKey(o)))) || null;
}
// 행 key → 용어 툴팁 — 받아 둔 모든 행(장비·석판·운명·추억·핵심 재능)에서. 데이터가 나중에 오면 다시 만든다 (빌더 renderEffect 의 밑줄 용어)
let WG_ALLTIPS = null, WG_ALLTIPS_N = -1;
function rowTips(k) {
  const arrs = [typeof GEAR_ROWS !== 'undefined' && GEAR_ROWS, typeof SLATE_DB !== 'undefined' && SLATE_DB, typeof DST_ROWS !== 'undefined' && DST_ROWS, typeof MEM_ROWS !== 'undefined' && MEM_ROWS].filter(Boolean);
  if (!WG_ALLTIPS || WG_ALLTIPS_N !== arrs.length) {
    WG_ALLTIPS = new Map(); WG_ALLTIPS_N = arrs.length;
    arrs.forEach(a => a.forEach(r => { if (r.tips && r.tips.length) WG_ALLTIPS.set(rowKey(r), r.tips); }));
    if (typeof TALENT_CORE !== 'undefined') Object.values(TALENT_CORE).forEach(c => { if (c[2]) WG_ALLTIPS.set(c[0] + '\u001f재능\u001f' + c[1], c[2]); });
  }
  return (k && WG_ALLTIPS.get(k)) || null;
}
const pactTips = () => typeof PACT_TIPS !== 'undefined' ? Object.entries(PACT_TIPS) : null; // 정령 용어 {용어: 설명} → [[용어, 설명]]
// 옵션 한 줄 HTML — 용어 툴팁 + 수치 강조 (빌더 카드처럼)
const wgOptHtml = (text, tips) => hlNums(tipWrapEffect(text, tips));
// ── 그리기
function wgSlotHtml(sl) {
  const v = wgCur(sl.id), on = sl.id === wgSlot, [cx, cy] = WG_POS[sl.id];
  const lock = sl.id === 'weapon2' && wgTwoHand();
  let ico = '<span class="ws-plus">+</span>', nm = '<span class="ws-none">' + (lock ? '양손 무기 사용 중' : '비어 있음') + '</span>', sub = '';
  if (v && v.kind === 'item') {
    const it = ITEMS[wgItemIdx(v.name)] || v.snap || {};
    ico = it.img ? `<img src="${it.img}" alt="">` : ico; nm = escapeHtml(v.name); sub = v.part;
  } else if (v && v.kind === 'custom') {
    const n = ['basic', 'main', 'sub'].reduce((t, c) => t + v.opts[c].length, 0);
    ico = wgSlotImg(v); nm = escapeHtml(wgCustName(v)); sub = '옵션 ' + n + '개';
  } else if (v && v.kind === 'blood') {
    ico = wgSlotImg(v); nm = escapeHtml(v.name || '블러드 ' + (v.part || '')); sub = v.part || '';
  }
  return `<div class="wg-slot${on ? ' on' : ''}${v ? ' have' : ''}${lock ? ' lock' : ''}" style="grid-column:${cx};grid-row:${cy}" onclick="wgPick('${sl.id}')">` +
    `<div class="wg-sico">${ico}</div><small>${escapeHtml(sl.label)}${v ? ' · <i class="wg-k ' + v.kind + '">' + WG_KIND[v.kind] + '</i>' : ''}</small><b>${nm}</b>` +
    (sub ? `<em>${escapeHtml(sub)}</em>` : '') +
    (v && (v.blend || v.tower || (v.ero || []).length) ? '<span class="wg-addb">' + [v.blend ? '조향' : '', v.tower ? '시퀀스' : '', (v.ero || []).length ? '침식 ' + v.ero.length : ''].filter(Boolean).join(' · ') + '</span>' : '') +
    (v ? `<button class="gbm-del" onclick="event.stopPropagation();wgClear('${sl.id}')" title="이 칸 비우기">✕</button>` : '') + '</div>';
}
function wgRender() {
  if (!preset.slots) preset.slots = {};
  if (!wgTab) { const c = wgCur(wgSlot); wgTab = c ? (c.kind === 'custom' ? 'craft' : c.kind === 'blood' ? 'blood' : 'item') : 'item'; }
  const filled = wgSlots().filter(s => wgCur(s.id)).length;
  const side = `<div class="gbm-cap">장비 <span class="ws-en">${filled} / 10칸</span></div>` +
    '<div class="wg-doll">' + wgSlots().map(wgSlotHtml).join('') + '</div>' +
    `<div class="wg-tier${wgHasRolled() ? ' fixed' : ''}"><small>제작 옵션 티어</small>` + ['2', '1', '0'].map(t =>
      `<span class="ws-tag${(preset.tier || '1') === t ? ' on' : ''}" onclick="wgSetTier('${t}')">T${t}</span>`).join('') +
    (wgHasRolled() ? '<em>로그 실제 수치가 있어 고정</em>' : '') + '</div>';
  const def = wgDef(wgSlot), cur = wgCur(wgSlot);
  const canBlood = !!wgBSet()[wgSlot]; // 무기 칸은 블러드가 없어 탭을 아예 숨긴다 (사용자 요청)
  if (!canBlood && wgTab === 'blood') wgTab = 'item';
  if (WG_ADD[wgTab]) wgTab = 'item';
  if (!cur) wgMode = 'pick';
  const tabs = [['item', '레전드'], ['craft', '제작']].concat(canBlood ? [['blood', '블러드']] : []).map(([k, nm]) =>
    `<span class="wg-tab${wgTab === k ? ' on' : ''}" onclick="wgSetTab('${k}')">${nm}</span>`).join('');
  let body = '';
  if (wgTab === 'item') {
    const fi = wgFocus >= 0 ? wgFocus : (cur && cur.kind === 'item' ? wgItemIdx(cur.name) : -1);
    const lh = wgItemGridHtml();
    body = `<div class="ws-filter"><input type="search" placeholder="레전드 이름·옵션 검색" value="${escapeHtml(wgQuery)}" oninput="wgSearch(this.value)"><span class="ws-cnt" id="wgCnt">${wgCount}개</span></div>` +
      `<div class="ws-split"><div class="wg-grid" id="wgList">${lh}</div><div class="ws-cardbox" id="wgCard">${wgItemCard(ITEMS[fi] || (cur && cur.kind === 'item' ? cur.snap : null))}</div></div>`;
  } else if (wgTab === 'craft') {
    const part = wgCraftPart(), opts = wgOpts();
    const rows = (wgSlot === 'weapon1' || wgSlot === 'weapon2')
      ? weaponRowsOf(PARTS).map(g => ({label: g.label, parts: g.parts.filter(p => def.parts.includes(p))})).filter(g => g.parts.length)
      : [{label: '부위', parts: def.parts}];
    const partHtml = def.parts.length > 1 ? '<div class="wg-parts">' + rows.map(g => `<div><small>${escapeHtml(g.label)}</small>` +
      g.parts.map(p => `<span class="ws-tag${p === part ? ' on' : ''}" onclick="wgSetPart(${JSON.stringify(p).replace(/"/g, '&quot;')})">${escapeHtml(p)}</span>`).join('') + '</div>').join('') + '</div>' : '';
    if (!part) body = partHtml + '<div class="hrm-empty">먼저 부위(베이스)를 고르세요</div>';
    else {
      const picked = CRAFT_STAGES.map(st => `<div class="wg-pk${wgStage === st.key ? ' on' : ''}" onclick="wgStage='${st.key}';wgQuery='';pageRender()">` +
        `<div class="wg-pkh"><b>${st.label}</b><span>${opts[st.key].length} / ${st.max}</span></div>` +
        (opts[st.key].length ? opts[st.key].map((o, i) => `<div class="wg-pko ${WG_GR_ROW[optGrade(o.type)] || ''}"><span class="wg-pkt">${wgOptHtml(tierEffect(o), wgTips(o))}</span>` +
          `<button onclick="event.stopPropagation();wgDelOpt('${st.key}',${i})" title="빼기">✕</button></div>`).join('') : '<div class="wg-pke">눌러서 고르기</div>') + '</div>').join('');
      body = partHtml + wgBasePickHtml(part) + `<div class="wg-picked">${picked}</div>` +
        `<div class="wg-grades"><span class="g-abs">절대 ${wgGradeCount(opts, '절대')}/2</span> · <span class="g-adv">진급 ${wgGradeCount(opts, '진급')}/2</span> <span class="gbm-sep">·</span> ${escapeHtml(part)} · ${CRAFT_STAGES.find(s => s.key === wgStage).label}</div>` +
        `<div class="ws-filter"><input type="search" placeholder="옵션 검색" value="${escapeHtml(wgQuery)}" oninput="wgSearch(this.value)"><span class="ws-cnt" id="wgCnt">#CNT#</span></div>` +
        `<div class="wg-list" id="wgList">${wgOptListHtml()}</div>`;
      body = body.replace('#CNT#', wgCount + '개');
    }
  } else body = wgBloodBody();
  if (wgMode === 'view') body = wgViewBody();
  const main = `<div class="gbm-head plain"><div><small>지금 고르는 칸</small><b class="ws-head"><b>${escapeHtml(def.label)}</b>` +
    (cur ? ` <span class="ws-mn">${escapeHtml(cur.kind === 'item' ? cur.name : cur.kind === 'custom' ? wgCustName(cur) : (cur.name || '블러드'))}</span>` : '') + '</b></div>' +
    `${WZ_UP}` + (cur && wgMode === 'view'
      ? `<div class="wg-acts"><button class="wz-btn pri" onclick="wgSetMode('pick','item')">장비 교체</button>` +
        (cur.kind !== 'item' ? `<button class="wz-btn" onclick="wgSetMode('pick','${cur.kind === 'custom' ? 'craft' : 'blood'}')">옵션 고치기</button>` : '') +
        `<button class="wz-btn" onclick="wgClear('${wgSlot}')">비우기</button></div>`
      : cur ? '<div class="wg-acts"><button class="wz-btn" onclick="wgSetMode(\'view\')">‹ 고른 장비 보기</button></div>' : '') +
    '</div>' + (wgMode === 'view' ? '' : `<div class="wg-tabs">${tabs}</div>`) + body; // 탭은 칸 이름 바로 아래 (사용자 요청)
  return '<div class="gbm wsm wgm"><div class="gbm-top"><b class="gbm-title">장비</b>' + (typeof gbmHelp === 'function' ? gbmHelp('gear') : '') + 
    '<span class="gbm-keys">빈 칸은 레전드·제작·블러드를 고르고, 고른 칸은 옵션을 보며 조향·시퀀스·침식을 정합니다 <span class="gbm-sep">·</span> 옵션 줄을 누르면 침식</span>' +
    (wgMsg ? '<span class="gbm-msg">' + escapeHtml(wgMsg) + '</span>' : '') + '</div>' +
    `<div class="gbm-body"><div class="gbm-side">${side}</div><div class="gbm-main">${main}</div></div></div>`;
}

// ── 빌더 2 마지막 단계 「추억·석판·정령」 한 화면 (사용자 2026-10-08) — 왼쪽에 세 묶음 칸, 오른쪽에 누른 것의 편집 ──
// 추억: 왼쪽 추억 칸(근원·자기 수호·진격 + 부활로 더 낀 추억) + 오른쪽 등급·옵션·부활 옵션. 석판·정령은 다음 차례.
// 규칙은 빌더 추억 제작과 같다: 기본 속성 1 → 고유 2 → 랜덤 2, 부활 옵션은 추억 하나에만 1개.
// 저장도 같다: preset.mems[부위] = {basic, unique, random}, 등급 preset.memGrade[부위](부활 추가 추억은 '부위#x'),
// 부활 preset.revival = {part, effect, group, mem?}. 데이터(mem_data.js: MEM_ROWS·REVIVALS)는 이 단계에 처음 들어올 때.
// 추억 등급·옵션이 히어로 특성 레벨을 정한다 (00_hero.js memGradeLv) — 고르면 히어로 단계의 Lv 도 바뀐다.
let wmPart = MEM_PARTS[0], wmStage = 0, wmQuery = '', wmRvQ = '', wmMsg = '';
const wmIsX = p => p === 'x';
const wmIsOther = p => p === 'slate' || p === 'dst'; // 추억이 아닌 칸 (석판 = wz_slate.js, 계약 보드 = wz_pact.js) // 부활 옵션 "기본 특성 슬롯 추가"로 더 낀 추억
const wmXPart = () => preset.revival ? revivalExtraPart(preset.revival.effect) : null;
const wmReal = p => wmIsX(p) ? wmXPart() : p;
const WM_NODE = {'x': '기본 노드', '근원의 추억': '45 노드', '자기 수호의 추억': '60 노드', '진격의 추억': '75 노드'}; // 어느 히어로 특성 노드의 레벨을 정하나
const wmKey = p => wmIsX(p) ? wmXPart() + '#x' : p; // 등급 저장 키 (빌더와 같음)
function wmMem(p) { return wmIsX(p) ? (preset.revival && preset.revival.mem) || null : (preset.mems || {})[p] || null; }
function wmOpts(p) { return wmMem(p) ? JSON.parse(JSON.stringify(wmMem(p))) : {basic: [], unique: [], random: []}; }
function wmSave(p, o) { // 고른 게 없으면 비운다
  const n = o.basic.length + o.unique.length + o.random.length;
  if (!preset.mems) preset.mems = {};
  if (wmIsX(p)) { if (preset.revival) { if (n) preset.revival.mem = o; else delete preset.revival.mem; } }
  else if (n) preset.mems[p] = o;
  else { delete preset.mems[p]; if (preset.revival && preset.revival.part === p) delete preset.revival; } // 빌더 clearMem 과 같음
  persistPreset();
}
function wmTips(e) { const r = MEM_ROWS.find(x => rowKey(x) === e.k); return r ? r.tips : null; } // 장비 데이터 없이 추억 행에서
function wmPick(p) { wcbSel = null; wcbPop = null; wpPick = false; wpQ = ''; wmPart = p; wmStage = 0; wmQuery = ''; wmMsg = ''; pageRender(); wzScrollToMain(); }
function wmPoolSafe() { return wmIsOther(wmPart) ? [] : wmPool(); }
function wmPool() { const st = MEM_STAGES[wmStage], part = wmReal(wmPart); return MEM_ROWS.filter(r => r.source === part && r.type === st.type); }
function wmToggle(i) {
  if (guardShareView()) return;
  const r = wmPool()[i], st = MEM_STAGES[wmStage], o = wmOpts(wmPart), k = rowKey(r);
  wmMsg = '';
  for (const c of ['basic', 'unique', 'random']) {
    const x = o[c].findIndex(e => e.k === k);
    if (x >= 0) { o[c].splice(x, 1); wmSave(wmPart, o); pageRender(); return; } // 다시 누르면 빼기
  }
  if (o[st.cat].length >= st.max) { wmMsg = st.type + '은 ' + st.max + '개까지입니다'; pageRender(); return; }
  o[st.cat].push({k, effect: r.effect, source: r.source, type: r.type});
  if (o[st.cat].length >= st.max && wmStage < MEM_STAGES.length - 1) { wmStage++; wmQuery = ''; } // 다 차면 다음 단계로
  wmSave(wmPart, o);
  pageRender();
}
function wmDel(cat, i) { if (guardShareView()) return; const o = wmOpts(wmPart); o[cat].splice(i, 1); wmSave(wmPart, o); pageRender(); }
const wmCap = () => preset.revival ? revivalExtraCap(preset.revival.effect) : null; // 추가 추억 등급 상한
const wmGradeOk = (p, g) => { // 이 칸에 고를 수 있는 등급인가 (HERO_GRADES 는 높은 등급부터)
  if (!wmIsX(p) || !wmCap()) return true;
  const i = HERO_GRADES.findIndex(x => x[0] === g), c = HERO_GRADES.findIndex(x => x[0] === wmCap());
  return i >= c;
};
function wmSetGrade(g) {
  if (guardShareView()) return;
  if (!wmGradeOk(wmPart, g)) { wmMsg = '이 부활 옵션의 추가 추억은 ' + (HERO_GRADES.find(x => x[0] === wmCap()) || [])[1] + ' 등급 이하만 됩니다'; pageRender(); return; }
  if (!preset.memGrade) preset.memGrade = {};
  preset.memGrade[wmKey(wmPart)] = g;
  persistPreset(); pageRender();
}
function wmClear(p) {
  if (guardShareView()) return;
  wmSave(p, {basic: [], unique: [], random: []});
  pageRender();
}
// 부활 옵션 — 추억 하나에만, 그 추억이 있어야 한다 (빌더 openRevivalPicker 와 같은 조건)
function wmPickRv(i) {
  if (guardShareView()) return;
  const p = wmPart;
  if (wmIsX(p)) return;
  if (!wmMem(p)) { wmMsg = '추억을 먼저 만들어 주세요 (옵션을 하나 이상)'; pageRender(); return; }
  const rv = preset.revival;
  if (rv && rv.part !== p && !confirm('부활 옵션은 추억 하나에만 적용됩니다. ' + rv.part + '에서 ' + p + '로 옮길까요?')) return;
  const o = REVIVALS[i];
  if (rv && rv.part === p && rv.effect === o.effect && rv.group === o.group) { delete preset.revival; persistPreset(); pageRender(); return; } // 다시 누르면 빼기
  const prevX = rv ? revivalExtraPart(rv.effect) : null, newX = revivalExtraPart(o.effect);
  preset.revival = {part: p, effect: o.effect, group: o.group};
  if (newX && prevX === newX && rv && rv.mem) preset.revival.mem = rv.mem; // 추가 슬롯 부위가 같으면 만들어 둔 추가 추억 유지
  if (newX && !wmGradeOk('x', memGrade(newX + '#x'))) { if (!preset.memGrade) preset.memGrade = {}; preset.memGrade[newX + '#x'] = wmCap(); } // 상한보다 높으면 상한으로
  wmMsg = ''; persistPreset(); pageRender();
}
function wmRvMove() { // 다른 추억의 부활 옵션을 이 추억으로 (같은 옵션 그대로)
  if (guardShareView()) return;
  const rv = preset.revival;
  if (!rv || wmIsX(wmPart)) return;
  if (!wmMem(wmPart)) { wmMsg = '추억을 먼저 만들어 주세요 (옵션을 하나 이상)'; pageRender(); return; }
  rv.part = wmPart; persistPreset(); pageRender();
}
function wmRvSearch(v) { wmRvQ = v; const b = document.getElementById('wmRvList'); if (b) b.innerHTML = wmRvRows(); }
function wmRvRows() {
  const rv = preset.revival, q = wmRvQ.trim().toLowerCase();
  const h = REVIVALS.map((o, i) => {
    const sub = [o.group, o.tier ? 'T' + o.tier : ''].filter(Boolean).join(' · ');
    if (q && !(o.effect + ' ' + sub).toLowerCase().includes(q)) return '';
    const on = rv && rv.part === wmPart && rv.effect === o.effect && rv.group === o.group;
    return `<div class="wg-opt${on ? ' on' : ''}" onclick="wmPickRv(${i})"><span>${wgOptHtml(o.effect, o.tips)}</span><em>${escapeHtml(sub)}</em></div>`;
  }).join('');
  return h || '<div class="hrm-empty">조건에 맞는 부활 옵션이 없습니다</div>';
}
function wmListHtml() {
  const q = wmQuery.trim().toLowerCase(), o = wmOpts(wmPart);
  const h = wmPool().map((r, i) => {
    if (q && !r.effect.toLowerCase().includes(q)) return '';
    const on = ['basic', 'unique', 'random'].some(c => o[c].some(e => e.k === rowKey(r)));
    return `<div class="wg-opt${on ? ' on' : ''}" onclick="wmToggle(${i})"><span>${wgOptHtml(r.effect, r.tips)}</span></div>`;
  }).join('');
  return h || '<div class="hrm-empty">조건에 맞는 옵션이 없습니다</div>';
}
function wmSearch(v) { wmQuery = v; const b = document.getElementById('wmList'); if (b) b.innerHTML = wmListHtml(); }
function wmCard(p) {
  const m = wmMem(p), key = wmKey(p), g = HERO_GRADES.find(x => x[0] === memGrade(key)) || HERO_GRADES[HERO_GRADES.length - 1];
  const n = m ? m.basic.length + m.unique.length + m.random.length : 0;
  const rv = preset.revival && preset.revival.part === p;
  const lv = memGradeLv(key, m);
  const label = wmIsX(p) ? '부활 추가 · ' + wmXPart() : p;
  return `<div class="wm-card${wmIsX(p) ? ' x' : ''}${wmPart === p ? ' on' : ''}${m ? ' have' : ''}" onclick="wmPick('${p}')">` +
    `<div class="wm-ch"><b>${escapeHtml(label)}</b><i class="tier-chip tier-${g[3]}" title="추억 등급: ${escapeHtml(g[1])}">${escapeHtml(g[1])}</i></div>` +
    `<div class="wm-cs">${m ? '옵션 ' + n + '개' : '<span class="ws-none">비어 있음</span>'} <span class="gbm-sep">·</span> ${WM_NODE[wmIsX(p) ? 'x' : p]} <b>Lv ${m ? lv : 1}</b>${rv ? ' <span class="wm-rv">부활</span>' : ''}</div>` +
    (m ? `<button class="gbm-del" onclick="event.stopPropagation();wmClear('${p}')" title="이 추억 비우기">✕</button>` : '') + '</div>';
}
function wmOtherHtml(p) { // 석판·정령 — 다음 차례. 이미 있는 값은 그대로 두고 요약만
  const n = p === 'slate' ? (preset.slateBd || []).length : (preset.pacts || []).filter(x => x && x.name).length;
  const what = p === 'slate' ? '신격 석판 배치' : '전투 정령·운명';
  return `<div class="hrm-empty">${what}은 곧 이 화면에 붙입니다 — 지금은 <a href="/tli/builder/">빌더</a>에서 정해 주세요.` +
    (n ? `<br>이 빌드에는 ${p === 'slate' ? '석판 ' + n + '개' : '정령 ' + n + '개'}가 있고, 그대로 유지됩니다.` : '') + '</div>';
}
function wmOtherCard(p) {
  const n = p === 'slate' ? (preset.slateBd || []).length : (preset.pacts || []).filter(x => x && x.name).length;
  const nm = p === 'slate' ? '신격 석판' : '전투 정령 · 운명';
  const sub = p === 'slate' ? (n ? '석판 ' + n + '개' : '비어 있음') : (n ? (preset.pacts || []).filter(x => x && x.name).map(x => x.name).join(' · ') : '비어 있음');
  return `<div class="wm-card${wmPart === p ? ' on' : ''}${n ? ' have' : ''}" onclick="wmPick('${p}')"><div class="wm-ch"><b>${nm}</b>${p === 'pact' ? '<i class="wm-soon">준비 중</i>' : ''}</div>` +
    `<div class="wm-cs">${n ? escapeHtml(sub) : '<span class="ws-none">' + sub + '</span>'}</div></div>`;
}
function wmDstCard() {
  const own = (preset.talents || []).filter(t => talGroup(t.type) === 2), n = own.reduce((a, t) => a + (t.cnt || 1), 0);
  const pn = (preset.pacts || []).filter(x => x && x.name).map(x => x.name);
  return `<div class="wm-card${wmPart === 'dst' ? ' on' : ''}${n ? ' have' : ''}" onclick="wmPick('dst')"><div class="wm-ch"><b>계약 보드 · 운명</b></div>` +
    `<div class="wm-cs">${pn.length || n ? escapeHtml(pn.join(' · ') || '정령 없음') + (n ? ' · 운명 ' + n + '개' : '') : '<span class="ws-none">비어 있음</span>'}</div></div>`;
}
function wmRender() {
  if (!preset.mems) preset.mems = {};
  if (wmIsX(wmPart) && !wmXPart()) wmPart = MEM_PARTS[0]; // 추가 슬롯이 사라지면 첫 추억으로
  const parts = [...(wmXPart() ? ['x'] : []), ...MEM_PARTS]; // 부활로 더 낀 추억은 맨 위 (기본 노드 레벨을 정한다 — 사용자 요청)
  const side = '<div class="gbm-cap">추억 <span class="ws-en">히어로 특성 레벨의 기준</span></div>' + parts.map(wmCard).join('') +
    '<div class="wm-note">추억 등급이 기본 레벨(절대 3 · 엘리트/레어 2 · 매직/일반 1)이고, 옵션의 "히어로 특성 레벨 +N"이 더해집니다 (최대 5). 근원 = 45 · 자기 수호 = 60 · 진격 = 75 노드.</div>' +
    '<div class="gbm-cap">석판</div>' + wmOtherCard('slate') + '<div class="gbm-cap">정령 · 운명</div>' + wmDstCard();
  if (wmPart === 'slate') return wmFrame(side, `<div class="gbm-head plain">${WZ_UP}<div><small>지금 고르는 칸</small><b class="ws-head"><b>신격 석판</b> <span class="ws-mn">${(preset.slateBd || []).length}개 · 보드 24칸</span></b></div></div>` + wsbRender());
  if (wmPart === 'dst') return wmFrame(side, `<div class="gbm-head plain">${WZ_UP}<div><small>게임 계약 화면처럼</small><b class="ws-head"><b>계약 보드</b> <span class="ws-mn">초상화 = 정령 고르기 · 노드 = 운명 자리</span></b></div></div>` + wcbBody());
  if (wmIsX(wmPart) && wmStage > 2) wmStage = 0; // 추가 추억엔 부활 옵션 칸이 없다
  const o = wmOpts(wmPart), key = wmKey(wmPart), isRv = wmStage === 3, st = MEM_STAGES[isRv ? 0 : wmStage];
  const grades = '<div class="wg-parts"><div><small>추억 등급</small>' + HERO_GRADES.map(g =>
    `<span class="ws-tag${memGrade(key) === g[0] ? ' on' : ''}${wmGradeOk(wmPart, g[0]) ? '' : ' off'}" onclick="wmSetGrade('${g[0]}')">${escapeHtml(g[1])}</span>`).join('') +
    (wmIsX(wmPart) ? `<em class="wm-xnote">${wmCap() ? (HERO_GRADES.find(x => x[0] === wmCap()) || [])[1] + ' 등급 이하 · ' : ''}기본 노드 레벨을 정합니다</em>` : '') + '</div></div>';
  const rv = preset.revival, rvHere = rv && rv.part === wmPart, rvElse = rv && !rvHere;
  const rvTips = rv ? (REVIVALS.find(x => x.effect === rv.effect) || {}).tips : null;
  // 기본·고유·랜덤 + (맨 아래 작게) 부활 옵션 — 인게임처럼 세로 (사용자 요청: 부활은 자주 안 쓰니 아래로)
  const picked = MEM_STAGES.map((s2, i) => `<div class="wg-pk${wmStage === i ? ' on' : ''}" onclick="wmStage=${i};wmQuery='';pageRender()">` +
    `<div class="wg-pkh"><b>${s2.type}</b><span>${o[s2.cat].length} / ${s2.max}</span></div>` +
    (o[s2.cat].length ? o[s2.cat].map((e, j) => `<div class="wg-pko"><span class="wg-pkt">${wgOptHtml(e.effect, wmTips(e))}</span><button onclick="event.stopPropagation();wmDel('${s2.cat}',${j})" title="빼기">✕</button></div>`).join('') : '<div class="wg-pke">눌러서 고르기</div>') + '</div>').join('') +
    (wmIsX(wmPart) ? '' : `<div class="wg-pk wm-rvk${isRv ? ' on' : ''}" onclick="wmStage=3;wmRvQ='';pageRender()"><div class="wg-pkh"><b>부활 옵션</b><span>${rvHere ? 1 : 0} / 1</span></div>` +
      (rvHere ? `<div class="wg-pko"><span class="wg-pkt">${wgOptHtml(rv.effect, rvTips)}</span><button onclick="event.stopPropagation();wmPickRv(${REVIVALS.findIndex(x => x.effect === rv.effect && x.group === rv.group)})" title="빼기">✕</button></div>`
        : rvElse ? `<div class="wg-pke">${escapeHtml(rv.part)}에 있음 — 추억 하나에만</div>` : '<div class="wg-pke">눌러서 고르기 (추억 하나에만 1개)</div>') + '</div>');
  // 오른쪽 목록: 고른 칸의 옵션, 부활 칸이면 부활 옵션 (다른 추억에 있으면 목록 대신 가기·옮기기)
  const list = !isRv
    ? `<div class="ws-filter"><input type="search" placeholder="${st.type} 검색" value="${escapeHtml(wmQuery)}" oninput="wmSearch(this.value)"></div><div class="wg-list" id="wmList">${wmListHtml()}</div>`
    : rvElse
      ? `<div class="hrm-empty"><b>${escapeHtml(rv.part)}</b>에 부활 옵션이 있습니다: ${wgOptHtml(rv.effect, rvTips)}<br>부활 옵션은 추억 하나에만 넣을 수 있습니다.` +
        `<div class="wsb-acts" style="justify-content:center;margin-top:10px"><button class="wz-btn" onclick="wmPick('${rv.part}')">그 추억으로 가기</button><button class="wz-btn" onclick="wmRvMove()">이 추억으로 옮기기</button></div></div>`
      : `<div class="ws-filter"><input type="search" placeholder="부활 옵션 검색" value="${escapeHtml(wmRvQ)}" oninput="wmRvSearch(this.value)"></div><div class="wg-list" id="wmRvList">${wmRvRows()}</div>`;
  const label = wmIsX(wmPart) ? '부활 추가 · ' + wmXPart() : wmPart;
  const main = `<div class="gbm-head plain">${WZ_UP}<div><small>지금 고르는 추억</small><b class="ws-head"><b>${escapeHtml(label)}</b> <span class="ws-mn">히어로 특성 Lv ${wmMem(wmPart) ? memGradeLv(key, wmMem(wmPart)) : 1}</span></b></div></div>` +
    `<div class="wm-left">${grades}<div class="wg-picked">${picked}</div><div class="wm-pick">${list}</div></div>`;
  return wmFrame(side, main);
}
function wmFrame(side, main) {
  return '<div class="gbm wsm wmm"><div class="gbm-top"><b class="gbm-title">추억 · 석판 · 정령</b>' + (typeof gbmHelp === 'function' ? gbmHelp('mem') : '') + 
    '<span class="gbm-keys">왼쪽에서 고를 칸을 누릅니다 <span class="gbm-sep">·</span> 추억 3 · 신격 석판 · 계약 보드</span>' +
    (wmMsg ? '<span class="gbm-msg">' + escapeHtml(wmMsg) + '</span>' : '') + '</div>' +
    `<div class="gbm-body"><div class="gbm-side">${side}</div><div class="gbm-main">${main}</div></div></div>`;
}

// ── 빌더 2 「추억·석판·정령」 화면의 석판 배치 — 기존 빌더 석판 보드 디자인을 바탕으로 크게 (사용자 2026-10-08) ──
// 규칙은 공용 조각(00_slate.js): 모양·회전·겹침/개수 한도·파생 효과·재능 목록 재생성. 저장은 빌더와 같은 preset.slateBd
// [{u: 석판 id, i: 원점 칸(열×10+행), d: 회전 0~3, t: [소켓 노드 id…]}] — 바꿀 때마다 보드 파생 재능 행을 다시 만든다.
// 위: 석판 고르기(모양 미리보기) · 가운데: 보드(칸 클릭 = 놓기·고르기, 끌어서 옮기기) · 오른쪽: 고른 석판(회전·모양·삭제·소켓)
let ALL_DATA = null, SLATEIDX = null; // 석판 옵션 행 — mem_data.js 의 SLATE_DB 로 채운다 (빌더는 장비·옵션 전체 행)
function wsbInit() {
  if (ALL_DATA) return;
  ALL_DATA = SLATE_DB; SLATEIDX = {idx: {}};
  ALL_DATA.forEach((r, i) => (r.nids || []).forEach(n => { SLATEIDX.idx[n] = i; }));
}
let wsbPal = null, wsbSel = null, wsbGod = null, wsbSock = null, wsbQ = '', wsbMsg = '', wsbDrag = null, wsbNoClick = false;
const WSB_GOD_COLORS = {260000: '#2dd4bf', 260100: '#d46ad4', 260200: '#5588ff', 260300: '#e5534b', 260400: '#38bdf8', 260500: '#f0883e'};
const WSB_LEGEND = [1003, 1005, 1010, 1001, 1012, 1009, 1011], WSB_NETHER = [394004, 394005, 394006, 394001, 394002];
const wsbBd = () => preset.slateBd || (preset.slateBd = []);
function wsbApply() { // 빌더 sbApply 와 같음 — 보드 파생 재능 행 재생성 + 저장
  if (preset.slateBd && !preset.slateBd.length) delete preset.slateBd;
  rebuildSlateTalents(preset);
  persistPreset(); pageRender();
}
// 옵션 한 줄 — 핵심 재능은 이름을 굵게 앞에 (slateOptSplit)
function wsbOptHtml(r) { const o = slateOptSplit(r.effect); return (o.name ? `<b class="wsb-onm">${escapeHtml(o.name)}</b>` : '') + wgOptHtml(o.text, r.tips); }
const wsbShort = n => n.replace('명왕의 불완전한 신격: ', '불완전 ').replace('명왕의 신격: ', '명왕 ').replace('의 신격', '');
function wsbMini(u, col) { // 모양 미리보기 (작은 격자)
  const c = (SLATES[u] || {}).c || [[0, 0]];
  const rs = c.map(p => p[0]), cs = c.map(p => p[1]), r0 = Math.min(...rs), c0 = Math.min(...cs);
  const w = Math.max(...cs) - c0 + 1, h = Math.max(...rs) - r0 + 1, on = new Set(c.map(p => (p[0] - r0) + ',' + (p[1] - c0)));
  let g = `<span class="wsb-mini" style="grid-template-columns:repeat(${w},8px)">`;
  for (let r = 0; r < h; r++) for (let x = 0; x < w; x++) g += on.has(r + ',' + x) ? `<i style="background:${col}"></i>` : '<i class="e"></i>';
  return g + '</span>';
}
function wsbColorOf(u, pi) {
  const info = SLATES[u] || {};
  return info.god ? (WSB_GOD_COLORS[Math.floor((u - 1) / 100) * 100] || '#c9a6ff') : SLATE_COLORS[pi % SLATE_COLORS.length];
}
function wsbColors(bd) { // 빌더 보드와 같은 규칙 — 같은 색이 여러 장이면 밝기 단계로 구분
  const cnt = new Map();
  return bd.map((s, pi) => {
    const base = wsbColorOf(s.u, pi), n = cnt.get(base) || 0;
    cnt.set(base, n + 1);
    return n === 0 ? base : `color-mix(in srgb, ${base} ${Math.max(35, 100 - n * 28)}%, #f0f6fc)`;
  });
}
function wsbPalPick(u) { wsbPal = wsbPal === u ? null : u; wsbSel = null; wsbSock = null; wsbMsg = ''; pageRender(); }
function wsbGodPick(b) { wsbGod = wsbGod === b ? null : b; wsbPal = null; wsbMsg = ''; pageRender(); }
function wsbCellClick(id) {
  if (guardShareView()) return;
  if (wsbNoClick) { wsbNoClick = false; return; }
  const bd = wsbBd();
  const hit = bd.findIndex(s => (slateCells(s.u, s.i, s.d) || [s.i]).indexOf(id) >= 0);
  wsbMsg = '';
  if (wsbPal != null && hit < 0) { // 놓기 — 들어가는 회전을 찾고, 안 맞으면 겹친 채로(⚠ 표시 후 옮기면 됨)
    const err = sbLimitErr(wsbPal);
    if (err) { wsbMsg = err; pageRender(); return; }
    const d = sbFitDir(bd, wsbPal, id, 0, -1);
    bd.push({u: wsbPal, i: id, d: d < 0 ? 0 : d, t: []});
    wsbSel = bd.length - 1; wsbPal = null; wsbSock = null;
    wsbApply(); return;
  }
  if (hit >= 0) { wsbSel = hit === wsbSel ? null : hit; wsbPal = null; wsbSock = null; pageRender(); return; }
  if (wsbSel != null && bd[wsbSel]) { // 고른 석판을 빈 칸으로 — 맞는 회전 우선
    const sl = bd[wsbSel], d = sbFitDir(bd, sl.u, id, sl.d, wsbSel);
    sl.i = id; if (d >= 0) sl.d = d;
    wsbApply();
  }
}
function wsbRotate() { const sl = wsbBd()[wsbSel]; if (!sl) return; sl.d = (sl.d + 1) % 4; wsbApply(); }
function wsbShape() { // 신격 모양 변형 순환 (소켓·위치·회전 유지)
  const sl = wsbBd()[wsbSel]; if (!sl) return;
  const base = Math.floor((sl.u - 1) / 100) * 100;
  if (!(base in GOD_BASES)) return;
  const order = GOD_PAL.map(gp => gp[0]);
  sl.u = base + order[(order.indexOf(sl.u - base) + 1) % order.length];
  wsbApply();
}
function wsbDelete() { const bd = wsbBd(); if (!bd[wsbSel]) return; bd.splice(wsbSel, 1); wsbSel = null; wsbSock = null; wsbApply(); }
function wsbSockPick(si) { wsbSock = wsbSock === si ? null : si; wsbQ = ''; pageRender(); }
function wsbSockRows() { // 이 소켓 등급에 맞는 석판 옵션
  const sl = wsbBd()[wsbSel], info = SLATES[sl.u], ranks = info.sl[wsbSock], q = wsbQ.trim().toLowerCase();
  const h = SLATE_DB.map((r, ri) => { // 석판 행만 (ALL_DATA 는 로그 가져오기 뒤 전체 행 — 석판 행이 앞자리라 ri 는 같다)
    if (!(r.nids && r.nids.length) || !slateSockOk(info, r, ranks)) return '';
    if (q && !(r.effect + ' ' + (r.type || '')).toLowerCase().includes(q)) return '';
    const on = String((sl.t || [])[wsbSock]) === String(r.nids[0]);
    return `<div class="wg-opt${on ? ' on' : ''}" onclick="wsbAssign(${ri})"><span>${wsbOptHtml(r)}</span><em>${slateSockLabel(info, [slateRank(r)])}</em></div>`;
  }).join('');
  return h || '<div class="hrm-empty">이 등급의 옵션이 없습니다</div>';
}
function wsbSockSearch(v) { wsbQ = v; const b = document.getElementById('wsbSockList'); if (b) b.innerHTML = wsbSockRows(); }
function wsbAssign(ri) {
  if (guardShareView()) return;
  const sl = wsbBd()[wsbSel]; sl.t = sl.t || [];
  while (sl.t.length <= wsbSock) sl.t.push('');
  const nid = String(ALL_DATA[ri].nids[0]);
  sl.t[wsbSock] = sl.t[wsbSock] === nid ? '' : nid; // 다시 누르면 빼기
  const nx = SLATES[sl.u].sl.findIndex((_, k) => !sl.t[k]);
  wsbSock = nx >= 0 ? nx : null; wsbQ = '';
  wsbApply();
}
// 끌어서 옮기기 (pointer — PC·터치 공용). 빌더의 드래그와 같은 규칙(sbMoveDelta)
document.addEventListener('pointerdown', e => {
  const cell = e.target.closest && e.target.closest('#wsbBoard .wsb-cell.on');
  if (!cell) return;
  wsbDrag = {pi: +cell.dataset.pi, grab: +cell.dataset.cid, moved: false};
});
document.addEventListener('pointermove', e => {
  if (!wsbDrag) return;
  const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest && el.closest('#wsbBoard .wsb-cell');
  document.querySelectorAll('#wsbBoard .drop-ok, #wsbBoard .drop-bad').forEach(x => x.classList.remove('drop-ok', 'drop-bad'));
  if (!cell || cell.dataset.cid === undefined) return;
  const t = +cell.dataset.cid;
  if (t !== wsbDrag.grab) wsbDrag.moved = true;
  if (!wsbDrag.moved) return;
  const prevSel = preset.slateBd; // sbMoveDelta 는 preset.slateBd 를 본다
  const mv = sbMoveDelta(wsbDrag.pi, wsbDrag.grab, t, true);
  (mv ? mv.cells : [t]).forEach(c => { const x = document.querySelector('#wsbBoard .wsb-cell[data-cid="' + c + '"]'); if (x) x.classList.add(mv && mv.ok ? 'drop-ok' : 'drop-bad'); });
});
document.addEventListener('pointerup', e => {
  if (!wsbDrag) return;
  const dr = wsbDrag; wsbDrag = null;
  if (!dr.moved) return;
  wsbNoClick = true;
  const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest && el.closest('#wsbBoard .wsb-cell');
  if (cell && cell.dataset.cid !== undefined) {
    const mv = sbMoveDelta(dr.pi, dr.grab, +cell.dataset.cid, true);
    if (mv) { preset.slateBd[dr.pi].i = mv.i; wsbSel = dr.pi; wsbApply(); return; }
  }
  pageRender();
});
let wsbLinks = []; // 피스 → 파생 효과로 연결된 피스 (마우스 올리면 함께 강조 — 빌더와 같음)
function wsbBoardHtml() {
  const bd = wsbBd(), cellOf = new Map();
  const colOf = wsbColors(bd);
  const all = slatePieceInfo(bd); // 빌더와 같은 피스 정보·툴팁 (00_slate.js)
  wsbLinks = all.links;
  bd.forEach((s, pi) => {
    (slateCellsXY(s.u, s.i, s.d) || [[(s.i / 10) | 0, s.i % 10]]).forEach((xy, ci) => {
      const key = xy[0] + ',' + xy[1], out = xy[0] < 1 || xy[0] > 6 || xy[1] < 1 || xy[1] > 6 || !SLATE_ACT.has(xy[1] * 10 + xy[0]);
      const prev = cellOf.get(key);
      if (prev) { prev.conflict = true; return; }
      cellOf.set(key, {pi, ci, out, org: xy[0] === ((s.i / 10) | 0) && xy[1] === s.i % 10});
    });
  });
  const selCells = new Set();
  if (wsbSel != null && bd[wsbSel]) (slateCellsXY(bd[wsbSel].u, bd[wsbSel].i, bd[wsbSel].d) || []).forEach(xy => selCells.add(xy[0] + ',' + xy[1]));
  let h = '<div class="wsb-board" id="wsbBoard">';
  for (let r = 1; r <= 6; r++) for (let c = 1; c <= 6; c++) {
    const id = c * 10 + r, key = c + ',' + r, act = SLATE_ACT.has(id), cd = cellOf.get(key);
    if (!act && !cd) { h += '<span class="wsb-void"></span>'; continue; }
    if (!cd) { h += `<span class="wsb-cell${wsbPal != null ? ' can' : ''}" data-cid="${id}" onclick="wsbCellClick(${id})"></span>`; continue; }
    const p = all.pieces[cd.pi];
    const same = (dx, dy) => (cellOf.get((c + dx) + ',' + (r + dy)) || {}).pi === cd.pi;
    const join = (same(0, -1) ? ' jt' : '') + (same(1, 0) ? ' jr' : '') + (same(0, 1) ? ' jb' : '') + (same(-1, 0) ? ' jl' : '');
    const {tipH} = slateCellTip(bd, p, cd.pi, cd.ci, cd.out);
    h += `<span class="wsb-cell on tip2${cd.conflict ? ' bad' : ''}${cd.out ? ' out' : ''}${p.fx ? ' fx' : ''}${selCells.has(key) ? ' sel' : ''}${join}" data-cid="${id}" data-pi="${cd.pi}" ` +
      `style="--sc:${colOf[cd.pi]}" data-h="${escapeHtml(tipH).replace(/"/g, '&quot;')}" onclick="wsbCellClick(${id})">${cd.org ? '<i class="o"></i>' : ''}</span>`;
  }
  return h + '</div>';
}
// 마우스를 올린 석판 + 파생 효과로 이어진 석판(복제 원본·전염/강화 대상)을 강조, 나머지는 흐리게 (빌더 sbHighlight 와 같음)
function wsbHighlight(pis, sec) {
  sec = sec || new Set();
  const on = pis.size > 0;
  document.querySelectorAll('#wsbBoard .wsb-cell.on').forEach(el => {
    const p = +el.dataset.pi, hit = pis.has(p);
    el.classList.toggle('hl', hit);
    el.classList.toggle('hl2', !hit && sec.has(p));
    el.classList.toggle('dim', on && !hit && !sec.has(p));
  });
}
document.addEventListener('mouseover', e => {
  const cell = e.target.closest && e.target.closest('#wsbBoard .wsb-cell.on, .wsb-li[data-pi]');
  if (cell) { const pi = +cell.dataset.pi; wsbHighlight(new Set([pi]), wsbLinks[pi] || new Set()); }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest && e.target.closest('#wsbBoard .wsb-cell.on, .wsb-li[data-pi]')) wsbHighlight(new Set());
});
function wsbRender() {
  wsbInit();
  const bd = wsbBd(), cf = new Set(sbConflicts(bd));
  if (wsbSel != null && !bd[wsbSel]) wsbSel = null;
  const tile = (u, label) => {
    const info = SLATES[u] || {}, n = bd.filter(x => x.u === u).length, err = sbLimitErr(u);
    const lim = info.lg ? (bd.some(x => (SLATES[x.u] || {}).lg === info.lg) ? '1/1' : '0/1') : info.limit ? n + '/' + info.limit : '';
    return `<div class="wsb-tile${wsbPal === u ? ' on' : ''}${err && wsbPal !== u ? ' full' : ''}" onclick="wsbPalPick(${u})" title="${escapeHtml(info.n || '')} (${(info.c || []).length}칸)${err ? ' — ' + escapeHtml(err) : ''}">` +
      wsbMini(u, wsbColorOf(u, WSB_LEGEND.indexOf(u) >= 0 ? WSB_LEGEND.indexOf(u) : 4)) + `<b>${escapeHtml(label || wsbShort(info.n || ''))}</b>${lim ? `<small>${lim}</small>` : ''}</div>`;
  };
  let pal = '<div class="wsb-palrow"><small>레전드</small>' + WSB_LEGEND.map(u => tile(u)).join('') + '</div>' +
    '<div class="wsb-palrow"><small>명왕</small>' + WSB_NETHER.map(u => tile(u)).join('') + '</div>' +
    '<div class="wsb-palrow"><small>신격</small>' + Object.keys(GOD_BASES).map(b => `<span class="ws-tag${wsbGod === +b ? ' on' : ''}" style="--gc:${WSB_GOD_COLORS[b]}" onclick="wsbGodPick(${b})"><i class="wsb-dot" style="background:${WSB_GOD_COLORS[b]}"></i>${escapeHtml(GOD_BASES[b])}</span>`).join('') + '</div>';
  if (wsbGod != null) pal += '<div class="wsb-palrow"><small>모양</small>' + GOD_PAL.map(gp => tile(wsbGod + gp[0], gp[1])).join('') + '</div>';
  // 오른쪽: 고른 석판 / 안내 + 목록
  let side;
  const sl = bd[wsbSel];
  if (sl) {
    const info = SLATES[sl.u] || {}, isGod = (Math.floor((sl.u - 1) / 100) * 100) in GOD_BASES;
    side = `<div class="wg-addbox"><div class="wg-addh"><b>${escapeHtml(info.n || '#' + sl.u)}</b><span>${(info.c || []).length}칸</span></div>` +
      '<div class="wsb-acts"><button class="wz-btn" onclick="wsbRotate()">↻ 회전</button>' + (isGod ? `<button class="wz-btn" onclick="wsbShape()">모양: ${escapeHtml((info.shp || '?').replace(/1$/, ''))}</button>` : '') +
      '<button class="wz-btn" onclick="wsbDelete()">삭제</button></div>' +
      (cf.has(wsbSel) ? '<div class="wsb-warn">⚠ 겹치거나 보드 밖입니다 — 빈 칸을 누르거나 끌어서 옮기세요</div>' : '<div class="wg-addd">빈 칸을 누르면 그 자리로 옮깁니다 (끌어도 됩니다)</div>') + '</div>';
    if (info.sl) {
      side += `<div class="wg-addbox grow"><div class="wg-addh"><b>옵션 소켓</b><span>${(sl.t || []).filter(Boolean).length} / ${info.sl.length}</span></div>` +
        info.sl.map((ranks, si) => {
          const nid = (sl.t || [])[si], ri = nid ? SLATEIDX.idx[nid] : undefined;
          return `<div class="wsb-sock${wsbSock === si ? ' on' : ''}" onclick="wsbSockPick(${si})"><small>${si + 1}. ${slateSockLabel(info, ranks)}</small>` +
            `<span>${ri !== undefined ? wsbOptHtml(ALL_DATA[ri]) : '<i>비어 있음 — 눌러서 고르기</i>'}</span></div>`;
        }).join('') +
        (wsbSock != null ? `<div class="ws-filter"><input type="search" placeholder="옵션 검색" value="${escapeHtml(wsbQ)}" oninput="wsbSockSearch(this.value)"></div><div class="wg-list" id="wsbSockList">${wsbSockRows()}</div>` : '') + '</div>';
    } else side += '<div class="wg-addbox"><div class="wg-addd">이 석판은 옵션 소켓이 없습니다 (복제·강화 같은 효과만)</div></div>';
  } else {
    side = '<div class="wg-addbox grow"><div class="wg-addh"><b>놓인 석판</b><span>' + bd.length + '개</span></div>' +
      (bd.length ? bd.map((s, pi) => `<div class="wsb-li${cf.has(pi) ? ' bad' : ''}" data-pi="${pi}" onclick="wsbSel=${pi};wsbPal=null;pageRender()"><i style="background:${wsbColors(bd)[pi]}"></i>${escapeHtml((SLATES[s.u] || {}).n || '#' + s.u)}` +
        `<small>${(s.t || []).filter(Boolean).length ? '옵션 ' + (s.t || []).filter(Boolean).length : ''}${cf.has(pi) ? ' ⚠' : ''}</small></div>`).join('')
        : '<div class="wg-addd">위에서 석판을 고르고 보드의 빈 칸을 누르면 놓입니다.<br>놓인 석판을 누르면 회전·모양·옵션 소켓을 고칩니다.</div>') + '</div>';
  }
  return `<div class="wsb-pal">${pal}</div>` + (wsbMsg ? `<div class="wsb-warn">${escapeHtml(wsbMsg)}</div>` : '') +
    `<div class="wsb-split"><div class="wsb-left">${wsbBoardHtml()}<div class="wsb-hint">${wsbPal != null ? '<b>' + escapeHtml(SLATES[wsbPal].n) + '</b> — 놓을 빈 칸을 누르세요' : '칸에 마우스를 올리면 옵션 · 피스를 끌어서 옮기기'}</div></div><div class="wg-vright">${side}</div></div>`;
}

// ── 빌더 2 「추억·석판·정령」 화면의 전투 정령 · 운명 ──
// 규칙은 공용 조각(00_pact.js)과 빌더 정령 화면과 같다: 정령 3칸, 승급 1~6(승급 보상 표의 그 행).
// 노드 옵션은 기본으로 전부 적용(사용자 지시) — 운명 자리로 바꾼 노드만 노드 대신 운명. 외환(고유)은 승급 보상과 같은 효과라 계산에서 한 번만.
// 정령 고르기는 계약 보드 가운데 초상화를 눌러서(왼쪽 정령 칸은 없앰).
// 운명은 재능 목록(preset.talents, 종류 '운명 · …')에 ×N 으로 — 미정 숙명은 3개까지. 저장 형식은 빌더와 같다.
let wpKind = '', wpQ = '', wpPick = false, wdQ = '';
const WP_RING = [['내환', '내환'], ['중환', '중환'], ['', '외환 · 고유']];
function wpCur(i) { return (preset.pacts || [])[i] || null; }
function wpSet(i, v) { if (!preset.pacts) preset.pacts = []; while (preset.pacts.length < PACT_MAX) preset.pacts.push(null); preset.pacts[i] = v; persistPreset(); }
function wpAllNodes(sp, pc) { // 꽃잎 노드 전부 켬 — 운명 자리만 빼고
  const o = {}, ds = (pc && pc.dsts) || {};
  (sp.nodes || []).forEach(n => { if (WCB_PATH.includes(n.pos) && !ds[n.pos]) o[n.pos] = 1; });
  return o;
}
function wpChoose(i, name) {
  if (guardShareView()) return;
  const prev = wpCur(i) || {};
  if ((preset.pacts || []).some((x, k) => k !== i && x && x.name === name)) { wmMsg = '이미 다른 칸에 있는 정령입니다'; pageRender(); return; }
  if (prev.name !== name) { // 정령을 바꿔도 꽂은 운명은 그 자리에 그대로 (사용자 요청) — 꽃잎 자리 번호는 정령마다 같다
    const keep = {}; ['dsts', 'dstD', 'undRoll'].forEach(k => { if (prev[k]) keep[k] = prev[k]; });
    wpSet(i, Object.assign({name, adv: 1}, keep, {nodes: wpAllNodes(pactByName(name), keep)})); // 승급은 1 — 판 초상화 배지에 보이고, 초상화를 다시 누르면 바꾼다
  }
  wcbPop = null; wcbSel = null; wpPick = false; wpQ = ''; wmMsg = ''; pageRender(); // 고르면 팝업을 닫는다 (사용자 2026-10-10 — 예전엔 열어 둔 채 승급 고르기로)
}
function wpDropDst(pc) { Object.values((pc && pc.dstD) || {}).forEach(wdTalDrop); } // 정령을 바꾸거나 비우면 꽂았던 운명도 재능 목록에서
function wpClear(i) { if (guardShareView()) return; wpDropDst(wpCur(i)); wpSet(i, null); wpPick = false; wcbSel = null; pageRender(); }
function wpAdv(i, a) { if (guardShareView()) return; const pc = wpCur(i); if (!pc) return; pc.adv = a; persistPreset(); pageRender(); }
// 검색 — 초상화로 여는 팝업(wcbPop)에서도 바로 거른다 (예전엔 wcbSel 일 때만 다시 그려 팝업 검색이 안 됐다, 2026-10-10 제보)
function wpPickSearch(v) { wpQ = v; const b = document.getElementById('wpList'), i = wcbSel ? wcbSel.i : wcbPop; if (b && i != null) b.innerHTML = wpPickRows(i); }
const wpSearchText = sp => sp._q || (sp._q = [sp.name, sp.kind, sp.summary || '', ...(sp.nodes || []).map(n => (n.name || '') + ' ' + (n.effect || '')), ...(sp.advance || []).flatMap(a => a.effects || [])].join(' ').toLowerCase()); // 이름·분류·요약·노드·승급 효과
function wpPickRows(i) {
  const cur = (wpCur(i) || {}).name, q = wpQ.trim().toLowerCase();
  const used = new Set((preset.pacts || []).filter((x, k) => x && k !== i).map(x => x.name));
  const h = PACT.filter(sp => sp.grade === '레전드' && sp.kind !== '드롭' && (!wpKind || sp.kind === wpKind) && // 드롭 정령은 DB 에만
      (!q || wpSearchText(sp).includes(q))).map(sp =>
    `<div class="wp-card${cur === sp.name ? ' on' : ''}${used.has(sp.name) ? ' dis' : ''}" onclick="wpChoose(${i}, ${JSON.stringify(sp.name).replace(/"/g, '&quot;')})">` +
    wpFace(sp, 'wp-face') + `<div class="wp-cb"><div class="wp-ch"><b>${escapeHtml(sp.name)}</b><i>${escapeHtml(sp.kind)}</i></div><small>${escapeHtml(sp.summary || '')}</small>${used.has(sp.name) ? '<em>다른 칸에 있음</em>' : ''}</div></div>`).join('');
  return h || '<div class="hrm-empty">조건에 맞는 정령이 없습니다</div>';
}
// 정령 초상화(없거나 깨지면 이름 첫 글자) — 고르기 목록·팝업 머리에 쓴다
const WCB_NOIMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1b2230" stroke="#5a6a85" stroke-width="3"/><path d="M32 14l5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z" fill="#8fa3c2"/></svg>');
const WCB_ONERR = 'onerror="this.onerror=null;this.setAttribute(\'href\',WCB_NOIMG);if(this.tagName===\'IMG\')this.src=WCB_NOIMG"'; // 엑박 대신 대체 그림 (tlidb CDN 에 없는 아이콘이 있다)
function wpFace(sp, cls) {
  return sp && sp.img ? `<span class="${cls}"><img src="${sp.img}" alt="" loading="lazy" ${WCB_ONERR}></span>` : `<span class="${cls} none">${sp ? escapeHtml(sp.name.slice(0, 1)) : '+'}</span>`;
}
let wcbPop = null; // 정령 고르기 팝업 — 정령 자리(0~2)
function wcbPopClose() { wcbPop = null; wpPick = false; wpQ = ''; pageRender(); }
function wpPopup(i) { // 초상화를 누르면 팝업: 고른 정령(승급·핵심 옵션) 또는 고르기 목록 (사용자 요청: 오른쪽 칸 대신 팝업)
  const pc = wpCur(i), sp = pc && pc.name ? pactByName(pc.name) : null;
  const head = `<div class="wcb-poph">${sp ? wpFace(sp, 'wp-face big') : ''}<div><small>정령 ${i + 1}</small><b>${sp ? escapeHtml(sp.name) : '정령 고르기'}</b>${sp ? `<span class="wp-kd">${escapeHtml(sp.kind)}</span>` : ''}</div><button class="wcb-x" onclick="wcbPopClose()" title="닫기">✕</button></div>`;
  if (!sp || wpPick) {
    const kinds = [...new Set(PACT.filter(x => x.grade === '레전드' && x.kind !== '드롭').map(x => x.kind))];
    return `${head}` +
      (sp ? '<div class="wsb-acts"><button class="wz-btn" onclick="wpPick=false;pageRender()">‹ 고른 정령 보기</button></div>' : '') +
      `<div class="ws-filter"><input type="search" placeholder="정령 이름·효과 검색" value="${escapeHtml(wpQ)}" oninput="wpPickSearch(this.value)"></div>` +
      `<div class="ws-tags"><span class="ws-tag${!wpKind ? ' on' : ''}" onclick="wpKind='';pageRender()">전체</span>` +
      kinds.map(k => `<span class="ws-tag${wpKind === k ? ' on' : ''}" onclick="wpKind=${JSON.stringify(k).replace(/"/g, '&quot;')};pageRender()">${escapeHtml(k)}</span>`).join('') + '</div>' +
      `<div class="wp-grid" id="wpList">${wpPickRows(i)}</div>`;
  }
  const adv = pactAdvEffects(sp, pc.adv);
  const advRow = (sp.advance || []).length ? '<div class="wg-parts"><div><small>승급</small>' + [1, 2, 3, 4, 5, 6].map(a =>
    `<span class="ws-tag${(pc.adv || 1) === a ? ' on' : ''}" onclick="wpAdv(${i}, ${a})">${a}</span>`).join('') + (pc.adv ? '' : '<em class="wm-xnote">로그에 승급 정보가 없으면 직접 골라 주세요</em>') + '</div></div>' : '';
  return `${head}` + (sp.summary ? `<div class="wg-addd">${escapeHtml(sp.summary)}</div>` : '') + advRow +
    (adv.length ? `<div class="wg-addd"><b>핵심 옵션 · 승급 ${pc.adv || 1}</b></div>` + adv.map(e => `<div class="wg-addd wp-eff">${wgOptHtml(e, pactTips())}</div>`).join('') : '') +
    '<div class="wg-addd">노드 옵션은 모두 적용됩니다 — 노드를 누르면 그 자리에 운명을 꽂을 수 있습니다.</div>' +
    `<div class="wsb-acts"><button class="wz-btn pri" onclick="wpPick=true;pageRender()">정령 교체</button><button class="wz-btn" onclick="wpClear(${i})">비우기</button><button class="wz-btn" onclick="wcbPopClose()">닫기</button></div>`;
}
// ── 운명 (재능 목록의 '운명 · …' 행 — 빌더 계산이 읽는 곳)
// 빌더 2 에서 직접 꽂으면 재능 목록 = 꽂은 운명 (꽂을 때 더하고 뺄 때 줄인다).
// 로그에서 가져온 빌드는 재능 목록이 '가진 운명'이라 팝업 맨 위에 보여 주고, 빼도 목록은 그대로 둔다 (preset.dstLog).
function wdIsLog() { return !!preset.dstLog; }
function wdTalAdd(did) {
  const r = wfRowOf(did); if (!r) return false;
  if (!preset.talents) preset.talents = [];
  const t = preset.talents.find(x => x.k === rowKey(r));
  if (/^\[?미정 숙명/.test(r.effect) && undecidedDstCnt() >= 3) { wmMsg = '미정 숙명은 3개까지입니다'; return false; }
  if (t) t.cnt = (t.cnt || 1) + 1; else preset.talents.push({k: rowKey(r), effect: r.effect, type: talentLabel(r)});
  return true;
}
function wdTalDrop(did) { // 직접 꽂은 빌드만 — 뺀 운명을 재능 목록에서도 하나 줄인다
  if (wdIsLog()) return;
  const r = wfRowOf(did), ti = r ? (preset.talents || []).findIndex(x => x.k === rowKey(r)) : -1; if (ti < 0) return;
  const t = preset.talents[ti];
  if ((t.cnt || 1) > 1) { t.cnt--; if (t.cnt === 1) delete t.cnt; } else preset.talents.splice(ti, 1);
}
// ── 운명판 — 정령 3개를 나란히, 운명 자리에 가진 운명을 꽂는다 (사용자 2026-10-08)
// 저장: pc.dsts[자리]=1(운명 자리 — 빌더·로그와 같음) + pc.dstD[자리]=운명 did(어느 운명인지, 빌더 2 가 더한 값 — 계산엔 안 씀)
// 자리 40 = 미정 숙명 칸(미정 숙명만), 미정을 꽂으면 41~45 운명 확장 칸이 열린다. 같은 운명은 가진 개수만큼만 꽂힌다.
const wfDidOf = t => (DST_ROWS.find(r => rowKey(r) === t.k) || {}).did || null;
const wfRowOf = did => DST_ROWS.find(r => r.did === did) || null;
const wfIsUnd = did => { const r = wfRowOf(did); return !!(r && /^\[?미정 숙명/.test(r.effect)); };
function wfPlaced(did) { return (preset.pacts || []).reduce((n, pc) => n + Object.values((pc && pc.dstD) || {}).filter(x => x === did).length, 0); }
function wfOwned(did) { const t = (preset.talents || []).find(x => talGroup(x.type) === 2 && wfDidOf(x) === did); return t ? (t.cnt || 1) : 0; }
function wfTidy(pc) {
  if (pc.dsts && !Object.keys(pc.dsts).length) delete pc.dsts;
  if (pc.dstD && !Object.keys(pc.dstD).length) delete pc.dstD;
}
// ── 계약 보드 — 게임 화면처럼 가운데 정령 3개, 정령마다 꽃잎 길 하나 (사용자 캡처 2026-10-08) ──
// 길 순서: 내환 내환 중환 · 내환 내환 중환 · 내환 내환 중환 → 외환(고유, 가장 큰 노드). 외환 옆 소용돌이 = 미정 숙명 칸,
// 미정 숙명을 꽂으면 그 칸에서 운명 칸 가지가 뻗는다(41~45). 노드 자리 번호: 내환 1~6, 중환 21~23, 외환 31.
// 운명 등급: 내환 = 하위 운명, 중환 = 중위 운명, 미정 칸 = 미정 숙명 (캡처에서 읽음).
// 미정 숙명에는 "중위 운명 슬롯 N개 증가"(0~3) 또는 "하위 운명 슬롯 N개 증가"(0~5) 옵션이 랜덤으로 붙고(최대 5),
// 그만큼 금색 운명 칸이 생긴다 — 중위 슬롯엔 중위·하위, 하위 슬롯엔 하위. 운명 칸에 꽂은 운명은 장착 자격(하위 9 · 중위 4)을
// 쓰지 않는다. 빈 미정 숙명 칸은 자체 효과(대미지 +6% · 소환체 대미지 +6%). — 사용자 확인 2026-10-08
// 저장: pc.undRoll = {t: 'mid'|'low', n} (꽂은 미정 숙명의 옵션)
const WCB_PATH = [1, 2, 21, 3, 4, 22, 5, 6, 23, 31];
// 꽃잎 하나의 모양 — 축 방향(바깥)을 기준으로 [거리, 각도°]. 회전해서 세 꽃잎을 만든다
const WCB_GEO = {start: [62, -26], 1: [108, -34], 2: [158, -40], 21: [212, -42], 3: [262, -36], 4: [300, -24], 22: [322, -6],
  5: [318, 14], 6: [296, 30], 23: [256, 40], 31: [150, 24], 40: [108, 40], ext: [[150, 56], [196, 58], [236, 56], [210, 70], [168, 76]]};
const WCB_AXIS = [-150, -30, 90]; // 정령 1 = 왼쪽 위, 2 = 오른쪽 위, 3 = 아래
const WCB_TIER = {'내환': '하위 숙명', '중환': '중위 숙명'};
const WCB_LIMIT_HELP = [ // 게임 '장착 제한' 도움말 (사용자 캡처)
  '임의 히어로로 플레이해 황폐한 심연 퀘스트 완료 — 하위 운명 장착 자격 1, 중위 운명 장착 자격 1',
  '1단계 이상의 차원 감시자 1회 처치 — 하위 운명 장착 자격 2',
  '3단계 이상의 차원 감시자 1회 처치 — 하위 운명 장착 자격 1, 중위 운명 장착 자격 1',
  '5단계 이상의 차원 감시자 1회 처치 — 하위 운명 장착 자격 2',
  '7단계 이상의 차원 감시자 1회 처치 — 하위 운명 장착 자격 1, 중위 운명 장착 자격 1',
  '7단계 시공의 여행자 1회 처치 — 미정 숙명 슬롯 1',
  '8단계 시공의 여행자 1회 처치 — 미정 숙명 슬롯 2',
];
let wcbSel = null; // {i, pos}
const WCB_C = 450, WCB_K = 1.2, WCB_R0 = 40; // 판 가운데·크기 배율·꽃잎이 가운데에서 떨어진 거리
function wcbXY(i, rd) { const a = (WCB_AXIS[i] + rd[1]) * Math.PI / 180, r = WCB_R0 + rd[0] * WCB_K; return [WCB_C + r * Math.cos(a), WCB_C + r * Math.sin(a)]; }
function wcbRingOf(pos) { return pos <= 6 ? '내환' : pos <= 23 ? '중환' : pos === 31 ? '' : pos === 40 ? '미정' : '운명'; }
function wcbRoll(pc) { return (pc && pc.undRoll) || {t: 'mid', n: 1}; }
function wcbFits(pos, did, pc) { // 이 자리에 이 운명이 들어가나
  const r = wfRowOf(did); if (!r) return false;
  const und = /^\[?미정 숙명/.test(r.effect);
  if (pos === 40) return und;
  if (und) return false;
  if (pos > 40) return r.type === (wcbRoll(pc).t === 'mid' ? '중위 숙명' : '하위 숙명'); // 중위 운명 칸 = 중환과 같이 천명류(중위)만, 하위 칸 = 하위만 (사용자 2026-10-10)
  return WCB_TIER[wcbRingOf(pos)] === r.type;
}
function wcbSetExt(pc) { // 미정 숙명 옵션 개수만큼 운명 칸(41~) — 줄어든 칸의 운명은 뺀다
  const n = pc.dstD && pc.dstD[40] ? Math.max(0, Math.min(wcbRoll(pc).t === 'mid' ? 3 : 5, wcbRoll(pc).n)) : 0;
  if (!pc.dsts) pc.dsts = {};
  [41, 42, 43, 44, 45].forEach((p, k) => {
    if (k < n) pc.dsts[p] = 1;
    else { delete pc.dsts[p]; if (pc.dstD && pc.dstD[p]) { wdTalDrop(pc.dstD[p]); delete pc.dstD[p]; } }
  });
  // 등급이 바뀌어 안 맞게 된 운명도 뺀다 (하위 슬롯에 중위)
  [41, 42, 43, 44, 45].forEach(p => { if (pc.dstD && pc.dstD[p] && !wcbFits(p, pc.dstD[p], pc)) { wdTalDrop(pc.dstD[p]); delete pc.dstD[p]; } });
  wfTidy(pc);
}
function wcbSetRoll(t, n) {
  if (guardShareView() || !wcbSel) return;
  const pc = wpCur(wcbSel.i); if (!pc) return;
  pc.undRoll = {t, n};
  wcbSetExt(pc); persistPreset(); pageRender();
}
function wcbCounts() { // 꽂은 운명 등급별 (빌드 전체)
  const c = {'하위 숙명': 0, '중위 숙명': 0, und: 0, ext: 0};
  (preset.pacts || []).forEach(pc => { if (!pc) return; Object.entries(pc.dstD || {}).forEach(([pos, did]) => {
    const r = wfRowOf(did); if (!r) return;
    if (+pos === 40) c.und++; else if (+pos > 40) c.ext++; else c[r.type]++; // 운명 칸은 장착 자격을 쓰지 않는다
  }); });
  return c;
}
function wcbPortrait(i) { wcbPop = i; wcbSel = null; wpPick = false; wpQ = ''; wmMsg = ''; pageRender(); }
function wcbClick(i, pos) { // 계약 노드를 누르면 운명 팝업 (사용자 요청: 검색해서 누르면 그 자리에 운명)
  if (!wpCur(i)) { wcbPortrait(i); return; }
  wmMsg = ''; wdQ = ''; wcbSel = {i, pos}; wcbPop = null; pageRender();
  const q = document.querySelector('.wcb-pop input[type=search]'); if (q && q.focus) q.focus();
}
function wcbSelClose() { wcbSel = null; wdQ = ''; pageRender(); }
function wcbNorm() { // 예전 빌드(노드 켜기/끄기 시절·로그)도 노드 전부 적용으로 맞춘다
  let ch = false;
  if (preset.dstLog === undefined) { // 로그 빌드 판별 — 운명은 있는데 어느 자리에 무엇인지(dstD)가 없으면 로그에서 온 것
    const has = (preset.talents || []).some(t => talGroup(t.type) === 2), anyD = (preset.pacts || []).some(pc => pc && pc.dstD && Object.keys(pc.dstD).length);
    preset.dstLog = /^로그: /.test(preset.name || '') || (has && !anyD) ? 1 : 0; ch = true;
  }
  (preset.pacts || []).forEach(pc => {
    const sp = pc && pc.name ? pactByName(pc.name) : null; if (!sp) return;
    const all = wpAllNodes(sp, pc);
    if (JSON.stringify(all) !== JSON.stringify(pc.nodes || {})) { pc.nodes = all; ch = true; }
  });
  if (ch) persistPreset();
}
function wcbUnplace(i, pos) { // 그 자리 운명 빼기 — 노드 자리면 노드 옵션으로 되돌린다
  if (guardShareView()) return;
  const pc = wpCur(i); if (!pc) return;
  const did = (pc.dstD || {})[pos];
  if (did) { wdTalDrop(did); delete pc.dstD[pos]; }
  if (!pc.dsts) pc.dsts = {};
  if (pos < 31) { delete pc.dsts[pos]; if (!pc.nodes) pc.nodes = {}; pc.nodes[pos] = 1; }
  else if (pos > 40) delete pc.dsts[pos];
  if (pos === 40) { delete pc.undRoll; wcbSetExt(pc); }
  wfTidy(pc); wmMsg = ''; persistPreset(); pageRender();
}
function wcbPut(did) { // 팝업에서 고른 운명을 그 자리에 (다시 누르면 빼기)
  if (guardShareView() || !wcbSel) return;
  const {i, pos} = wcbSel, pc = wpCur(i); if (!pc) return;
  if (!pc.dstD) pc.dstD = {};
  if (pc.dstD[pos] === did) { wcbUnplace(i, pos); return; }
  if (!wcbFits(pos, did, pc)) { wmMsg = pos === 40 ? '미정 숙명 칸에는 미정 숙명만' : pos > 40 ? (wcbRoll(pc).t === 'mid' ? '중위 운명 칸에는 중위·하위 운명' : '하위 운명 칸에는 하위 운명') : wcbRingOf(pos) + '에는 ' + WCB_TIER[wcbRingOf(pos)].replace(' 숙명', '') + ' 운명'; pageRender(); return; }
  const old = pc.dstD[pos];
  if (old) { wdTalDrop(old); delete pc.dstD[pos]; }
  // 로그에 남은 게 있으면 그걸 쓰고(남은 수 −1), 없으면 장착을 하나 더 (재능 목록 +1)
  if (wfPlaced(did) >= wfOwned(did) && !wdTalAdd(did)) { if (old) { wdTalAdd(old); pc.dstD[pos] = old; } pageRender(); return; }
  pc.dstD[pos] = did; if (!pc.dsts) pc.dsts = {}; pc.dsts[pos] = 1;
  if (pc.nodes) delete pc.nodes[pos];
  if (pos === 40) { if (!pc.undRoll) pc.undRoll = {t: 'mid', n: 1}; wcbSetExt(pc); } // 미정 숙명 → 옵션만큼 운명 칸 (팝업에서 옵션 고르기)
  else wcbSel = null; // 꽂았으면 닫는다
  wmMsg = ''; persistPreset(); pageRender();
}
function wdSearch(v) { wdQ = v; const b = document.getElementById('wdList'); if (b) b.innerHTML = wdRows(); }
function wdRows() { // 팝업 목록 — 이 자리에 맞는 운명만
  if (!wcbSel) return '';
  const {i, pos} = wcbSel, pc = wpCur(i), q = wdQ.trim().toLowerCase(), cur = (pc.dstD || {})[pos];
  const rows = DST_ROWS.filter(r => wcbFits(pos, r.did, pc) && (!q || r.effect.toLowerCase().includes(q)));
  return rows.map(r => `<div class="wg-opt${cur === r.did ? ' here' : ''}" onclick="wcbPut('${r.did}')"><span>${wgOptHtml(r.effect, r.tips)}</span><em>${cur === r.did ? '꽂힘 — 누르면 빼기' : escapeHtml(r.type)}</em></div>`).join('')
    || '<div class="hrm-empty">조건에 맞는 운명이 없습니다</div>';
}
// 미정 숙명 칸(40)·운명 칸(41~45)은 정령 노드 효과가 없다 — 수집 문구가 깨져 있어("* 1% 소환체 대미지 +6 * 1% 운명 <img …") 깨끗한 문구로
const wpNodeEff = (n, pos) => pos === 40 ? '대미지 +6% · 소환체 대미지 +6% (비어 있을 때)' : pos > 40 ? '미정 숙명 옵션으로 생긴 운명 칸' : (n ? n.effect : '');
function wcbDstPop() { // 계약 노드 팝업: 원래 노드·꽂힌 운명 / (로그 빌드면) 가진 운명 / 검색 목록
  const {i, pos} = wcbSel, pc = wpCur(i), sp = pactByName(pc.name), n = (sp.nodes || []).find(x => x.pos === pos), dd = pc.dstD || {};
  const ring = wcbRingOf(pos);
  const title = pos === 40 ? '미정 숙명 칸' : pos > 40 ? (wcbRoll(pc).t === 'mid' ? '중위' : '하위') + ' 운명 칸 ' + (pos - 40) : (ring || '외환 · 고유') + (n ? ' · ' + (n.name || '') : '');
  let h = `<div class="wcb-poph">${wpFace(sp, 'wp-face')}<div><small>${escapeHtml(sp.name)}</small><b>${escapeHtml(title)}</b></div><button class="wcb-x" onclick="wcbSelClose()" title="닫기">✕</button></div>`;
  if (wmMsg) h += `<div class="wcb-msg">${escapeHtml(wmMsg)}</div>`;
  if (pos === 31) { // 외환은 운명 자리가 아니다
    return h + `<div class="wg-addd wp-eff">${wgOptHtml(n ? n.effect : '', pactTips())}</div><div class="wg-addd">${pactAdvEffects(sp, pc.adv).length ? '승급 보상과 같은 효과라 계산은 승급 보상으로 합니다.' : '정령 고유 노드 — 항상 적용됩니다.'}</div>`;
  }
  const cur = dd[pos] ? wfRowOf(dd[pos]) : null;
  if (n && pos < 40) h += `<div class="wcb-was${cur || (pc.dsts || {})[pos] ? ' off' : ''}"><small>정령 노드</small>${wgOptHtml(n.effect, pactTips())}${cur || (pc.dsts || {})[pos] ? '<em>운명으로 대체</em>' : '<em>적용 중</em>'}</div>`;
  if (pos === 40 && !cur) h += '<div class="wg-addd">비어 있으면 이 칸 효과: 대미지 +6% · 소환체 대미지 +6% — 미정 숙명을 꽂으면 그 옵션만큼 운명 칸이 생깁니다 (운명 칸은 장착 자격을 쓰지 않음)</div>';
  if (cur) h += `<div class="wcb-cur"><small>꽂힌 운명</small>${wgOptHtml(cur.effect, cur.tips)}<button class="wz-btn" onclick="wcbUnplace(${i}, ${pos})">${pos < 31 ? '빼기 (노드 옵션으로)' : '빼기'}</button></div>`;
  else if ((pc.dsts || {})[pos] && pos < 31) h += `<div class="wcb-cur"><small>운명 자리</small><span class="ws-none">로그에 어느 운명인지 없음 — 아래에서 고르세요</span><button class="wz-btn" onclick="wcbUnplace(${i}, ${pos})">노드 옵션으로</button></div>`;
  if (pos === 40 && cur) { // 미정 숙명 옵션 — 운명 칸 수와 등급
    const rl = wcbRoll(pc);
    h += '<div class="wg-addd">미정 숙명 옵션 (랜덤 — 게임에 붙은 대로 고르세요)</div><div class="wcb-roll">' +
      [['mid', '중위 운명 슬롯', 3], ['low', '하위 운명 슬롯', 5]].map(([t, lb, mx]) => `<div><small>${lb} 증가</small>` +
        Array.from({length: mx}, (_, k) => `<span class="ws-tag${rl.t === t && rl.n === k + 1 ? ' on' : ''}" onclick="wcbSetRoll('${t}', ${k + 1})">${k + 1}</span>`).join('') + '</div>').join('') + '</div>';
  }
  if (wdIsLog()) { // 로그에서 가져온 빌드 — 가진 운명 (이 자리에 맞는 것만 누를 수 있음)
    const own = (preset.talents || []).filter(t => talGroup(t.type) === 2).map(t => { const d = wfDidOf(t); return [t, d, Math.max(0, (t.cnt || 1) - (d ? wfPlaced(d) : 0))]; })
      .filter(x => x[2] > 0 && x[1] && wcbFits(pos, x[1], pc)).sort((a, b) => dstRank(a[0]) - dstRank(b[0])); // 이 자리에 맞는 것만 (안 맞는 건 아예 안 보임 — 사용자 2026-10-10)
    if (own.length) h += '<div class="wd-cap">로그의 운명 — 이 자리에 맞고 안 꽂은 ' + own.reduce((n, x) => n + x[2], 0) + '개 (꽂으면 줄고 아래 장착한 운명에 들어갑니다)</div><div class="wg-list wcb-own">' + own.map(([t, did, left]) =>
      `<div class="wg-opt" onclick="wcbPut('${did}')"><span>${wgOptHtml(t.effect, t.tips || rowTips(t.k))}</span><em class="wf-pl">×${left}</em></div>`).join('') + '</div>';
  }
  return h + `<div class="wd-cap">${pos === 40 ? '미정 숙명' : pos > 40 ? (wcbRoll(pc).t === 'mid' ? '중위(천명류) 운명' : '하위 운명') : (ring === '중환' ? '중위(천명류)' : (WCB_TIER[ring] || '').replace(' 숙명', '')) + ' 운명'} 검색 — 누르면 이 자리에 꽂힘</div>` +
    `<div class="ws-filter"><input type="search" placeholder="운명 이름·효과 검색" value="${escapeHtml(wdQ)}" oninput="wdSearch(this.value)"></div>` +
    `<div class="wg-list" id="wdList">${wdRows()}</div>`;
}
function wcbGem(xy, rad, r) { // 운명이 꽂힌 자리 — 가운데 보석(하위 파랑·중위 금·미정 보라) + 바깥쪽에 운명 이름
  const [x, y] = xy, g = Math.max(6, rad * .62), k = /^\[?미정 숙명/.test(r.effect) ? 'und' : r.type === '중위 숙명' ? 'mid' : 'low';
  const tag = (r.effect.match(/^\[([^\]]+)\]/) || [])[1] || r.effect, nm = (tag.includes(':') ? tag.split(':').pop().trim() : tag).slice(0, 10);
  const dx = x - WCB_C, dy = y - WCB_C, L = Math.hypot(dx, dy) || 1;
  let ox = x + dx / L * (rad + 12), oy = y + dy / L * (rad + 12) + 4, anc = Math.abs(dx / L) < .35 ? 'middle' : dx > 0 ? 'start' : 'end';
  if ((anc === 'end' && x < 200) || (anc === 'start' && x > 700)) { ox = x; oy = y + rad + 18; anc = 'middle'; } // 판 가장자리면 아래에
  return `<polygon points="${x},${y - g} ${x + g * .8},${y} ${x},${y + g} ${x - g * .8},${y}" class="wcb-gem ${k}"/>` +
    `<text x="${ox}" y="${oy}" text-anchor="${anc}" class="wcb-dl ${k}">${escapeHtml(nm)}</text>`;
}
function wcbSvg() {
  const cnt = wcbCounts();
  let lines = '', nodes = '', center = '';
  [0, 1, 2].forEach(i => {
    const pc = wpCur(i), sp = pc && pc.name ? pactByName(pc.name) : null;
    const ax = WCB_AXIS[i] * Math.PI / 180, px = WCB_C + 78 * Math.cos(ax), py = WCB_C + 78 * Math.sin(ax);
    // 가운데 초상화
    center += `<g class="wcb-pt${wcbPop === i ? ' sel' : ''}" onclick="wcbPortrait(${i})"><circle cx="${px}" cy="${py}" r="40" class="wcb-ptc${sp ? '' : ' empty'}"/>` +
      (sp && sp.img ? `<clipPath id="wcbc${i}"><circle cx="${px}" cy="${py}" r="36"/></clipPath><image href="${sp.img}" x="${px - 36}" y="${py - 46}" width="72" height="118" clip-path="url(#wcbc${i})" preserveAspectRatio="xMidYMin slice" ${WCB_ONERR}/>` : `<text x="${px}" y="${py + 7}" class="wcb-plus">+</text>`) +
      (sp ? `<text x="${px}" y="${py + 60}" class="wcb-pn">${escapeHtml(sp.name)}</text><circle cx="${px - 30}" cy="${py - 30}" r="11" class="wcb-adv"/><text x="${px - 30}" y="${py - 25.5}" class="wcb-advt">${pc.adv || '?'}</text>` : `<text x="${px}" y="${py + 58}" class="wcb-pn dim">정령 ${i + 1}</text>`) + '</g>';
    if (!sp) return;
    const byPos = {}; (sp.nodes || []).forEach(n => { byPos[n.pos] = n; });
    const pts = [WCB_GEO.start, ...WCB_PATH.map(p => WCB_GEO[p])].map(rd => wcbXY(i, rd));
    lines += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="wcb-path"/>`;
    const on = pc.nodes || {}, ds = pc.dsts || {}, dd = pc.dstD || {}, advOn = pactAdvEffects(sp, pc.adv).length > 0;
    const node = (pos, xy, rad, cls, icon, tip, dr) => {
      const sel = wcbSel && wcbSel.i === i && wcbSel.pos === pos;
      return `<g class="wcb-n ${cls}${sel ? ' sel' : ''} tip2" onclick="wcbClick(${i}, ${pos})" data-h="${escapeHtml(tip).replace(/"/g, '&quot;')}">` +
        (dr ? `<circle cx="${xy[0]}" cy="${xy[1]}" r="${rad + 6}" class="wcb-glow"/>` : '') +
        `<circle cx="${xy[0]}" cy="${xy[1]}" r="${rad}" class="wcb-nc"/>` +
        (icon ? `<image href="${icon}" x="${xy[0] - rad + 3}" y="${xy[1] - rad + 3}" width="${2 * rad - 6}" height="${2 * rad - 6}" class="wcb-ic" ${WCB_ONERR}/>` : '') +
        (dr ? wcbGem(xy, rad, dr) : /\bdst\b/.test(cls) ? `<text x="${xy[0]}" y="${xy[1] + 4.5}" class="wcb-q">?</text>` : '') + '</g>';
    };
    const tipOf = (title, body, sub) => '<div class="ft-title">' + escapeHtml(title) + '</div><div class="ft-body">' + escapeHtml(body) + (sub ? '<div class="gb-tsub">' + escapeHtml(sub) + '</div>' : '') + '</div>';
    WCB_PATH.forEach(pos => {
      const n = byPos[pos]; if (!n) return;
      const xy = wcbXY(i, WCB_GEO[pos]), ring = wcbRingOf(pos), rad = pos === 31 ? 28 : pos >= 21 ? 19 : 14;
      if (ds[pos]) {
        const r = dd[pos] ? wfRowOf(dd[pos]) : null;
        nodes += node(pos, xy, rad, 'dst' + (r ? ' have' : '') + (r && r.type === '중위 숙명' ? ' mid' : ''), '',
          tipOf((ring || '외환') + ' 운명 자리', r ? r.effect : '비어 있음 — 눌러서 운명 고르기', (pos >= 40 ? '' : '원래 노드: ' + n.effect)), r);
      } else {
        const st = pos === 31 && advOn ? 'adv' : on[pos] ? 'on' : 'off';
        nodes += node(pos, xy, rad, st + (pos === 31 ? ' big' : ''), n.icon, tipOf((ring || '외환 · 고유') + ' — ' + (n.name || ''), wpNodeEff(n, pos),
          st === 'adv' ? '승급 보상으로 계산' : '적용 중 — 누르면 운명 검색'));
      }
    });
    // 미정 숙명 칸 + 운명 칸 가지
    const uxy = wcbXY(i, WCB_GEO[40]), ur = dd[40] ? wfRowOf(dd[40]) : null, exts = [41, 42, 43, 44, 45].filter(p => ds[p]);
    nodes += node(40, uxy, 12, 'und' + (ur ? ' have' : ''), '', tipOf('미정 숙명 칸', ur ? ur.effect : '대미지 +6% · 소환체 대미지 +6%',
      ur ? '운명 칸 ' + exts.length + '개 (' + (wcbRoll(pc).t === 'mid' ? '중위' : '하위') + ')' : '미정 숙명을 꽂으면 그 옵션만큼 운명 칸이 생깁니다 · 모든 운명 슬롯은 장착 자격을 소모하지 않습니다'), ur);
    exts.forEach((p, k) => {
      const xy = wcbXY(i, WCB_GEO.ext[k]), prev = k ? wcbXY(i, WCB_GEO.ext[k - 1]) : uxy, r = dd[p] ? wfRowOf(dd[p]) : null;
      lines += `<line x1="${prev[0]}" y1="${prev[1]}" x2="${xy[0]}" y2="${xy[1]}" class="wcb-path ext"/>`;
      const lowSlot = wcbRoll(pc).t === 'low';
      nodes += node(p, xy, lowSlot ? 14 : 19, 'dst ext' + (lowSlot ? ' lowslot' : '') + (r ? ' have' + (r.type === '중위 숙명' ? ' mid' : '') : ''), '',
        tipOf((lowSlot ? '하위' : '중위') + ' 운명 칸 ' + (k + 1), r ? r.effect : '비어 있음 — ' + (lowSlot ? '하위 운명' : '중위·하위 운명'), '장착 자격을 쓰지 않습니다'), r);
    });
  });
  const tri = [-90, 30, 150].map(a => (WCB_C + 132 * Math.cos(a * Math.PI / 180)) + ',' + (WCB_C + 132 * Math.sin(a * Math.PI / 180))).join(' ');
  return `<svg class="wcb" viewBox="20 72 870 840"><polygon points="${tri}" class="wcb-tri"/>${lines}${center}${nodes}</svg>`;
}
function wcbLim() { // 보드 위 장착 자격 줄
  const cnt = wcbCounts();
  const help = '<div class="ft-title">장착 제한</div><div class="ft-body">' + WCB_LIMIT_HELP.map(x => '<div>· ' + escapeHtml(x) + '</div>').join('') +
    '<div class="gb-tsub">모든 운명 슬롯(미정 숙명으로 생긴 칸)은 장착 자격을 소모하지 않습니다</div></div>';
  const lim = `<div class="wcb-lim"><span class="${cnt['하위 숙명'] > 9 ? 'over' : ''}">하위 운명 <b>${cnt['하위 숙명']}/9</b></span><span class="${cnt['중위 숙명'] > 4 ? 'over' : ''}">중위 운명 <b>${cnt['중위 숙명']}/4</b></span>` +
    `<span class="${cnt.und > 3 ? 'over' : ''}">미정 숙명 슬롯 <b>${cnt.und}/3</b></span><span>운명 슬롯 <b>${cnt.ext}</b></span>` +
    `<span class="wcb-help tip2" data-h="${escapeHtml(help).replace(/"/g, '&quot;')}">장착 제한 ⓘ</span></div>`;
  return lim;
}
function wcbEquipped() { // 보드 아래: 장착한 운명 (자리마다 한 줄 — 누르면 그 자리 팝업)
  const rows = [];
  [0, 1, 2].forEach(i => {
    const pc = wpCur(i), sp = pc && pc.name ? pactByName(pc.name) : null; if (!sp) return;
    const dd = pc.dstD || {}, ps = [...new Set([...Object.keys(pc.dsts || {}), ...Object.keys(dd)].map(Number))].sort((a, b) => a - b);
    ps.forEach(pos => {
      const r = dd[pos] ? wfRowOf(dd[pos]) : null, n = (sp.nodes || []).find(x => x.pos === pos);
      const lb = pos === 40 ? '미정 숙명 칸' : pos > 40 ? '운명 칸 ' + (pos - 40) : wcbRingOf(pos) + (n && n.name ? ' · ' + n.name : '');
      rows.push(`<div class="wg-opt" onclick="wcbClick(${i}, ${pos})"><b class="wcb-eqn">${escapeHtml(sp.name)}</b><small class="wcb-eqp">${escapeHtml(lb)}</small>` +
        `<span>${r ? wgOptHtml(r.effect, r.tips) : '<span class="ws-none">비어 있음 — 눌러서 고르기</span>'}</span>` +
        `<button class="wd-del" onclick="event.stopPropagation();wcbUnplace(${i}, ${pos})" title="${pos < 31 ? '빼고 노드 옵션으로' : '빼기'}">✕</button></div>`);
    });
  });
  const tally = wdIsLog() ? `<span class="wcb-tal">${pactDstTally()}</span>` : '';
  return `<div class="wcb-eq"><div class="wd-cap">장착한 운명 ${rows.length}칸 ${tally}</div>` +
    (rows.length ? `<div class="wg-list">${rows.join('')}</div>` : '<div class="wcb-hint">계약 노드를 누르면 운명을 검색해서 꽂을 수 있습니다 · 가운데 <b>초상화</b> = 정령 고르기 · 노드 옵션은 운명을 꽂은 자리만 빼고 모두 적용</div>') + '</div>';
}
function wcbBody() {
  wcbNorm();
  if (wcbSel && !wpCur(wcbSel.i)) wcbSel = null;
  const pop = wcbPop != null ? wpPopup(wcbPop) : wcbSel ? wcbDstPop() : '';
  return `${wcbLim()}<div class="wcb-board">${wcbSvg()}</div>${wcbEquipped()}` +
    (pop ? `<div class="wcb-pop" onclick="if (event.target === this) ${wcbPop != null ? 'wcbPopClose()' : 'wcbSelClose()'}"><div class="wcb-popin">${pop}</div></div>` : '');
}
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (wcbPop != null) wcbPopClose(); else if (wcbSel) wcbSelClose(); });

// 로그 가져오기·공유 코드가 함께 쓰는 공용 조각 — 빌더(sorted glob)와 빌더 2·보기 화면이 같이 싣는다 (2026-10-09 01_core·03·04·05 에서 옮김)

// ── 옵션 문구 수치 파서 (공용) ──
// 게임 문구의 수치는 네 형태로 섞여 나온다 (물결·엔대시는 읽어들일 때 '-'로 통일된다):
//   +45%   ·   +(18-20)%   ·   (-24--18)%   ·   -25--28%
// 부호도 괄호도 없는 맨 숫자는 조건 문구("힘 10 포인트당", "10미터")라 수치로 보지 않는다.
const NUM_SIGN = '([+-]|(?=\\())';                                       // 부호, 또는 부호 없이 괄호로 시작
// 합산용은 더 좁게 — 부호가 없으면 "(-24--18)"처럼 음수로 시작하는 괄호 범위만 수치로 본다.
// 양수 괄호 범위는 조건 문구인 경우가 많아("힘 (10-12) 포인트 당", "적의 최대 HP (80-100)%") 합산에 넣으면 안 된다.
const NUM_SIGN_NEG = '([+-]|(?=\\(-))';
const NUM_BODY = '\\(?(-?\\d+(?:\\.\\d+)?)(?:[-\u2013\u2014\u2212](-?\\d+(?:\\.\\d+)?))?\\)?';
const NUM_PCT = NUM_SIGN + NUM_BODY + '(%?)';                            // 부호·범위·퍼센트까지 (캡처 4)

// 표시용 HTML의 수치를 실제 굴림값으로 (태그는 그대로 두고 태그 밖 숫자만).
// 값 개수와 수치 자리 수가 다르면 손대지 않는다 — 조건값이 엉뚱한 자리에 박히는 것을 막는다.
function rollNumTxt(v, sg, pc) {
  const n = Math.round(v * 10) / 10;
  return (n < 0 || !sg ? '' : '+') + n + pc;
}
function numSlotCount(txt) { return (String(txt).match(new RegExp(NUM_PCT, 'g')) || []).length; }
// 느슨한 자리 세기 — "(a–b)" 범위는 한 자리, 부호도 %도 없는 맨 숫자도 한 자리로 본다.
// 조건이 붙은 옵션은 조건 수치까지 DynArgs에 실린다
// ("지혜가 600 포인트 이상이면 냉기 대미지가 (297-317) - (413-433) 포인트 추가된다" → [600, 467, 728]).
// 부호 있는 수치만 세면 개수가 안 맞아 굴림값이 통째로 버려졌다 — 엄격 매칭이 실패할 때만 이걸로 재시도한다
const NUM_LOOSE = '\\(\\s*[+-]?\\d+(?:\\.\\d+)?\\s*[–—−-]\\s*[+-]?\\d+(?:\\.\\d+)?\\s*\\)%?|[+-]?\\d+(?:\\.\\d+)?%?';
function looseSlots(txt) { return (String(txt).match(new RegExp(NUM_LOOSE, 'g')) || []).length; }
function rollNumLoose(tok, v) { // 원문 토큰의 부호·% 표기를 유지하며 값만 갈아 끼운다
  const n = Math.round(v * 10) / 10;
  const pc = /%$/.test(tok) ? '%' : '';
  const sg = /^\+/.test(tok) && n >= 0 ? '+' : '';
  return sg + n + pc;
}
function applyRollHtml(html, args) {
  if (!args || !args.length) return html;
  const vals = args.filter(v => v !== undefined && v !== null && isFinite(v));
  if (!vals.length) return html;
  const bare = String(html).replace(/<[^>]*>/g, '');
  const strict = numSlotCount(bare) === vals.length;
  if (!strict && looseSlots(bare) !== vals.length) {
    // 마지막 수단 — tlidb HTML은 값 자리를 <b class="m">로 표시한다. 태그 수가 값 수와 맞으면
    // 태그 안 숫자만 갈아 끼운다 ("1회 시전할 때마다"의 1처럼 태그 밖 문맥 숫자가 개수를 흐릴 때)
    const bTags = String(html).match(/<b class="m">[^<]*<\/b>/g) || [];
    if (bTags.length !== vals.length) return html;
    let k = 0;
    return String(html).replace(/(<b class="m">)([^<]*)(<\/b>)/g, (mm, o1, mid, c1) =>
      o1 + mid.replace(new RegExp(NUM_LOOSE), m2 => rollNumLoose(m2, vals[k++])) + c1);
  }
  let i = 0;
  const re = strict ? new RegExp(NUM_PCT, 'g') : new RegExp(NUM_LOOSE, 'g');
  return String(html).replace(/(<[^>]*>)|([^<]+)/g, (mm, tag, text) => tag ? mm
    : text.replace(re, strict ? ((m2, sg, a, b, pc) => rollNumTxt(vals[i++], sg, pc))
                              : (m2 => rollNumLoose(m2, vals[i++]))));
}
function applyRollText(effect, args) {
  if (!args || !args.length) return effect;
  const vals = args.filter(v => v !== undefined && v !== null && isFinite(v));
  if (!vals.length) return effect;
  if (numSlotCount(effect) === vals.length) {
    let i = 0;
    return effect.replace(new RegExp(NUM_PCT, 'g'), (mm, sg, a, b, pc) => rollNumTxt(vals[i++], sg, pc));
  }
  if (looseSlots(effect) !== vals.length) {
    // 값 정렬 폴백 — 범위 토큰 "(a–b)"는 반드시 값을 받고, 맨 숫자는 다음 값과 같을 때만 받는다.
    // "1회 시전할 때마다 … +(13–15)% … 최대 5 회" + [13,5] → 1은 문맥 숫자로 건너뛰고 13→범위, 5→5
    const toks = String(effect).match(new RegExp(NUM_LOOSE, 'g')) || [];
    let vi = 0;
    const takes = toks.map(tok => {
      if (vi >= vals.length) return false;
      const isRange = /[–—−-]/.test(tok.replace(/^[+-]/, ''));
      if (isRange || parseFloat(tok.replace(/[^\d.\-]/g, '')) === vals[vi]) { vi++; return true; }
      return false;
    });
    if (vi !== vals.length) return effect;
    let ti = 0, vj = 0;
    return String(effect).replace(new RegExp(NUM_LOOSE, 'g'), m2 => takes[ti++] ? rollNumLoose(m2, vals[vj++]) : m2);
  }
  let j = 0;
  return String(effect).replace(new RegExp(NUM_LOOSE, 'g'), m2 => rollNumLoose(m2, vals[j++]));
}

function plainText(raw) {
  let s = String(raw == null ? '' : raw);
  const box = document.createElement('div');
  for (let i = 0; i < 3; i++) { // 이중 이스케이프(&amp;lt; 등)도 풀릴 때까지 반복 디코드 (구버전 스냅샷 데이터)
    box.innerHTML = s;
    const t = box.textContent || '';
    if (t === s) break;
    s = t;
  }
  // 전각 태그: sanTxt가 여는 괄호만 전각화(＜b class="m">+3＜/b>)하므로 닫는 괄호는 반각·전각 모두 허용
  return s.replace(/<[^>]*>?/g, '').replace(/＜\/?[a-zA-Z][^＜＞<>]*[＞>]?/g, '').replace(/\s+/g, ' ').trim();
}

// "<랜덤 20 레벨 정밀 대미지 증가 아우라 보유>"(선택형)나 "(1-20) 레벨 화염 충전을 보유한다"(고정형)처럼
// 장비 옵션이 주는 오라. 보조칸을 쓸 수 없고, 장비를 빼면 함께 사라진다 (로그에는 어느 오라인지 없음 — 실측).
const RAND_AURA_POOLS = {'정밀 대미지 증가': ['정밀 주술 증폭', '정밀 포악', '정밀 깊은 고통', '정밀 과격한 소집']}; // tlidb 아이템 페이지 실측

const SUP_LV_KINDS = ['부귀 보조', '숭고 보조'];
// 빌드 슬롯의 레전드를 그릴 때 쓸 아이템 — 로그가 준 굴림값이 있으면 문구에 끼워 넣는다
function rolledItem(v, base) {
  const it = base || (v && v.snap);
  if (!it || !v || !(v.rolled || v.rand)) return it;
  const out = Object.assign({}, it);
  const rd = v.rand || {}; // "<랜덤 …>" 자리에 로그로 복원한 실제 옵션 문구
  const rolled = v.rolled || [];
  const rdHtml = i => escapeHtml(rd[i]).replace(/\n/g, '<br>'); // 랜덤 옵션 고르기는 침식화 시 두 줄(기본 효과 + 덧붙는 효과)
  out.opts = (it.opts || []).map((o, i) => rd[i] != null ? rdHtml(i) : applyRollHtml(o, rolled[i]));
  if (it.opts_t) out.opts_t = it.opts_t.map((o, i) => rd[i] != null ? rd[i] : applyRollText(o, rolled[i]));
  if (it.corr) out.corr = it.corr.map((c, i) => [c[0], rd[i] != null ? rdHtml(i) : applyRollHtml(c[1], rolled[i])]); // 랜덤 자리는 고른(복원한) 문구가 곧 침식 반영본
  return out;
}

// ── 빌드 코드 풀기 공용 조각 (2026-10-09) ──
// 빌더(01_core 에서 옮김)와 공유 보기 화면(/tli/view)이 함께 쓴다. 코드는 옵션 문구를 해시('#…')로 줄여 담으므로
// 풀려면 옵션 전체 행이 필요하다 — 빌더는 ALL_DATA·SKILLS·ITEMS·PRISM·REVIVALS 를 그대로, 보기 화면은
// 빌더 2 의 나눠 둔 데이터(GEAR_ROWS·SLATE_DB·DST_ROWS·TALENT_CORE…)를 모아 같은 이름으로 채운다(view_glue.js).
// 기대하는 바깥 것: ALL_DATA · SKILLS · ITEMS · PRISM · REVIVALS · PRESET_SLOTS · BLOOD_SET_PARTS · BASEIDX · SLATEIDX · BOARDS ·
//   PACT · PACT_MAX · MEM_PARTS · HERO_GRADES · SKILL_SLOTS · findSkill · rowKey · talentLabel · rebuildSlateTalents ·
//   bloodExtraCap · corrLimit · revivalExtraPart · presets
// ── 빌드 코드 내보내기/가져오기 ──
// TLP1.<deflate+base64url> (압축) / TLP0.<base64url> (무압축 폴백)
function bytesToB64(bytes) {
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64ToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function deflateBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflateBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// 코드 축약용 해시 참조: 현재 데이터에 있는 항목은 '#'+7자 해시로 대체 (FNV-1a 32비트)
function fnv36(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
let HASHES = null;
function ensureHashMaps() {
  if (HASHES) return HASHES;
  const row = new Map(), rowBad = new Set();
  ALL_DATA.forEach(r => { const h = fnv36(rowKey(r)); if (row.has(h)) rowBad.add(h); else row.set(h, r); });
  const sk = new Map(), skBad = new Set();
  SKILLS.forEach(s => { const h = fnv36(s.name + '\u001f' + s.kind); if (sk.has(h)) skBad.add(h); else sk.set(h, s); });
  const it = new Map(), itBad = new Set();
  ITEMS.forEach(x => { const h = fnv36(x.name); if (it.has(h)) itBad.add(h); else it.set(h, x); });
  const po = new Map(), poBad = new Set(); // 프리즘 랜덤 옵션 (effect+type)
  PRISM.opts.forEach(o => { const h = fnv36(o.effect + '\u001f' + o.type); if (po.has(h)) poBad.add(h); else po.set(h, o); });
  const pi = new Map(), piBad = new Set(); // 프리즘 종류 (이름)
  PRISM.items.forEach(x => { const h = fnv36(x.name); if (pi.has(h)) piBad.add(h); else pi.set(h, x); });
  const rv = new Map(), rvBad = new Set(); // 추억 부활 옵션 (effect+group)
  REVIVALS.forEach(o => { const h = fnv36(o.effect + '\u001f' + o.group); if (rv.has(h)) rvBad.add(h); else rv.set(h, o); });
  HASHES = {row, rowBad, sk, skBad, it, itBad, po, poBad, pi, piBad, rv, rvBad};
  return HASHES;
}

function decodePactPayload(pc) {
  if (!Array.isArray(pc)) return {pacts: null, missing: 0};
  let missing = 0;
  const posOf = t => {
    const o = {};
    String(t || '').split(',').forEach(k => { const n = parseInt(k, 10); if (n >= 1 && n <= 45) o[n] = 1; });
    return o;
  };
  const pacts = pc.slice(0, PACT_MAX).map(x => {
    if (!Array.isArray(x) || !x[0]) return null;
    const nm = String(x[0]).replace(/<(?=[a-zA-Z/!?])/g, '＜').slice(0, 20);
    if (!PACT.some(q => q && q.name === nm)) { missing++; return null; }
    const out = {name: nm, adv: Math.max(1, Math.min(6, parseInt(x[1], 10) || 1)), nodes: posOf(x[2]), dsts: posOf(x[3])};
    const dd = {}; // 자리:운명 did
    String(x[4] || '').split(',').forEach(t => { const m = /^(\d{1,2}):(\d{6,9})$/.exec(t); if (m && +m[1] >= 1 && +m[1] <= 45) dd[+m[1]] = m[2]; });
    if (Object.keys(dd).length) out.dstD = dd;
    return out;
  });
  return {pacts: pacts.some(Boolean) ? pacts : null, missing};
}
// 코드 → 빌드 객체 (필드 검증·정리 포함). {preset, missing} 반환
async function codeToPreset(code) {
  code = (code || '').trim();
  let jsonBytes;
  if (code.startsWith('TLP1.')) {
    if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 압축 코드를 지원하지 않습니다');
    jsonBytes = await inflateBytes(b64ToBytes(code.slice(5)));
  } else if (code.startsWith('TLP0.')) {
    jsonBytes = b64ToBytes(code.slice(5));
  } else {
    throw new Error('빌드 코드 형식이 아닙니다 (TLP로 시작해야 합니다)');
  }
  const pl = JSON.parse(new TextDecoder().decode(jsonBytes));
  if (!pl || (pl.v !== 1 && pl.v !== 2)) throw new Error('지원하지 않는 코드 버전입니다');
  const H = ensureHashMaps();
  // XSS 방어: 외부에서 온 문자열의 태그 시작 문자를 전각(＜)으로 치환 — innerHTML 어디로 가도 태그로 해석되지 않음
  const str = (x, max) => String(x == null ? '' : x).replace(/<(?=[a-zA-Z/!?])/g, '＜').slice(0, max || 500);
  const p = {id: Math.max(...presets.list.map(x => x.id)) + 1, name: str(pl.name, 30) || '가져온 빌드', memo: str(pl.m, 1500), tier: ['0', '2'].includes(pl.tr) ? pl.tr : '1', slots: {}, talents: [], skills: {}, mems: {}};
  if (Array.isArray(pl.hr) && typeof pl.hr[0] === 'string' && typeof pl.hr[1] === 'string')
    p.hero = {hero: str(pl.hr[0], 12), trait: str(pl.hr[1], 20)};
  let missing = 0, bloodUsed = false;
  // 해시 참조('#…') 또는 텍스트 객체 → 옵션 엔트리 복원
  const decEntry = x => {
    if (typeof x === 'string' && x[0] === '#') {
      const r = H.row.get(x.slice(1));
      // 장비 옵션은 원시 type 그대로, 재능·석판·운명은 계열 라벨로 (talentLabel이 두 경우 모두 처리)
      if (r) return {k: rowKey(r), effect: r.effect, source: r.source, type: talentLabel(r)};
      missing++;
      return {k: '', effect: '(받는 쪽 데이터에 없는 옵션)', source: '', type: ''};
    }
    if (x && typeof x === 'object' && typeof x.h === 'string' && x.h[0] === '#' && !x.e) {
      // 해시 + 실측값(v)만 실린 형태
      const r = H.row.get(x.h.slice(1));
      if (!r) { missing++; return {k: '', effect: '(받는 쪽 데이터에 없는 옵션)', source: '', type: ''}; }
      const o = {k: rowKey(r), effect: r.effect, source: r.source, type: talentLabel(r)};
      if (Array.isArray(x.v)) o.v = x.v.slice(0, 6).map(Number).filter(isFinite);
      return o;
    }
    if (x && typeof x === 'object') {
      const e = str(x.e != null ? x.e : x.effect, 1000), s2 = str(x.s != null ? x.s : x.source, 50), t = str(x.t != null ? x.t : x.type, 100);
      if (!e) return null;
      const o = {k: x.k ? str(x.k) : e + '\u001f' + s2 + '\u001f' + t, effect: e, source: s2, type: t};
      if (x.r) { // 로그로 고정된 문구 — 원본 행(k)은 h로 되살린다 (표시·티어 배지용)
        o.rolled = true;
        if (typeof x.h === 'string' && x.h[0] === '#') { const r2 = H.row.get(x.h.slice(1)); if (r2) o.k = rowKey(r2); }
      }
      if (Array.isArray(x.v)) o.v = x.v.slice(0, 6).map(Number).filter(isFinite);
      return o;
    }
    return null;
  };
  const decSkill = x => {
    const withLv = o => { // 스킬 자체 레벨 · 부귀 티어 옵션 굴림값
      if (o && x && typeof x === 'object') {
        if (x.l >= 0 && x.l <= 99) o.lv = +x.l;
        if (Array.isArray(x.so)) { const v = x.so.slice(0, 6).map(Number).filter(isFinite); if (v.length) o.sopt = v; }
      }
      return o;
    };
    if (typeof x === 'string' && x[0] === '#') {
      const s = H.sk.get(x.slice(1));
      if (s) return {name: s.name, kind: s.kind};
      missing++;
      return null;
    }
    if (x && typeof x === 'object') {
      if (typeof x.h === 'string' && x.h[0] === '#') { // 해시 + 레벨만 실린 형태
        const s = H.sk.get(x.h.slice(1));
        if (!s) { missing++; return null; }
        return withLv({name: s.name, kind: s.kind});
      }
      const n = str(x.n != null ? x.n : x.name, 100), k = str(x.k != null ? x.k : x.kind, 20);
      return n ? withLv({name: n, kind: k}) : null;
    }
    return null;
  };
  const decItemName = x => {
    if (typeof x === 'string' && x[0] === '#') { const it = H.it.get(x.slice(1)); return it ? it.name : null; }
    return str(x, 100) || null;
  };
  const isV2 = pl.v === 2;
  PRESET_SLOTS.forEach(s => {
    const v = pl.slots && pl.slots[s.id];
    if (!v) return;
    const kind = isV2 ? ({i: 'item', c: 'custom', b: 'blood'})[v.k] : v.kind;
    if (kind === 'item') {
      const name = decItemName(isV2 ? v.n : v.name);
      if (!name) { missing++; return; }
      const idx = ITEMS.findIndex(x => x.name === name);
      if (idx < 0) missing++;
      p.slots[s.id] = {kind: 'item', name, part: str(v.p != null ? v.p : v.part, 30), snap: idx >= 0 ? ITEMS[idx] : {name}};
      if (Array.isArray(v.ro)) p.slots[s.id].rolled = v.ro.slice(0, 12).map(a => Array.isArray(a) ? a.slice(0, 6).map(Number).filter(isFinite) : null);
      if (v.rd && typeof v.rd === 'object') {
        const rd = {};
        Object.entries(v.rd).forEach(([k2, t]) => { if (/^\d+$/.test(k2) && typeof t === 'string') rd[k2] = str(t, 300); });
        if (Object.keys(rd).length) p.slots[s.id].rand = rd;
      }
      if (typeof v.ga === 'string') p.slots[s.id].gaura = str(v.ga, 40);
    } else if (kind === 'custom') {
      const src = isV2 ? {basic: v.b, main: v.m, sub: v.s} : (v.opts || {});
      p.slots[s.id] = {kind: 'custom', part: str(v.p != null ? v.p : v.part, 30), name: str(v.n != null ? v.n : v.name, 30), opts: {
        basic: (src.basic || []).slice(0, 2).map(decEntry).filter(Boolean),
        main: (src.main || []).slice(0, 3).map(decEntry).filter(Boolean),
        sub: (src.sub || []).slice(0, 3).map(decEntry).filter(Boolean)}};
    } else if (kind === 'blood' && !bloodUsed && BLOOD_SET_PARTS[s.id]) {
      bloodUsed = true; // 블러드는 1개 제한
      const src = isV2 ? v.o : (v.opts && v.opts.blood);
      const srcX = isV2 ? v.x : (v.opts && v.opts.extra);
      const decX = x => {
        const d = decEntry(x);
        if (d && x && typeof x === 'object' && x.tr && typeof x.tr === 'object') d.tiers = {t0: str(x.tr.t0, 300) || undefined, t0p: str(x.tr.t0p, 300) || undefined, t2: str(x.tr.t2, 300) || undefined};
        return d;
      };
      const bOpts = (src || []).slice(0, 2).map(decEntry).filter(Boolean);
      p.slots[s.id] = {kind: 'blood', part: str(v.p != null ? v.p : v.part, 30), name: str(v.n != null ? v.n : v.name, 30),
        aberrant: !!v.ab,
        opts: {blood: bOpts,
               base: (Array.isArray(v.ba) ? v.ba : []).slice(0, 2).map(e => ({effect: str(e, 300), source: str(v.p, 30), type: '기본 옵션'})).filter(o => o.effect),
               extra: (srcX || []).slice(0, bloodExtraCap(bOpts.length)).map(decX).filter(Boolean)}}; // 레전드 1개면 추가 5개까지
    }
    // 베이스(기본) 아이템 id — 이쪽 데이터에 있는 것만 (제작·블러드 슬롯)
    if (p.slots[s.id] && kind !== 'item' && v.bs > 0 && BASEIDX[String(+v.bs)]) p.slots[s.id].base = String(+v.bs);
    // 조향 (벨트 전용 1줄) — 슬롯이 복원된 경우에만
    if (s.id === 'belt' && p.slots[s.id] && Array.isArray(v.bl) && str(v.bl[0], 300)) {
      p.slots[s.id].blend = {effect: str(v.bl[0], 300), req: str(v.bl[1] || '', 50)};
    }
    // 타워 시퀀스 (무기 전용 1줄)
    if ((s.id === 'weapon1' || s.id === 'weapon2') && p.slots[s.id] && Array.isArray(v.tw) && str(v.tw[0], 300)) {
      p.slots[s.id].tower = {effect: str(v.tw[0], 300), seq: str(v.tw[1] || '', 50)};
    }
    // 침식 강화 인덱스 — 정수·중복 제거·상한(레전드·제작 2, 블러드 3)
    if (p.slots[s.id] && Array.isArray(v.er)) {
      const ero = [...new Set(v.er.map(n => parseInt(n, 10)).filter(n => n >= 0 && n < 20))].sort((a, b) => a - b).slice(0, corrLimit(p.slots[s.id]));
      if (ero.length) p.slots[s.id].ero = ero;
    }
  });
  // 추억 복원
  MEM_PARTS.forEach(pt => {
    const m = pl.mem && pl.mem[pt];
    if (!m) return;
    const mm = {basic: (m.b || []).slice(0, 1).map(decEntry).filter(Boolean),
               unique: (m.u || []).slice(0, 2).map(decEntry).filter(Boolean),
               random: (m.r || []).slice(0, 2).map(decEntry).filter(Boolean)};
    if (mm.basic.length + mm.unique.length + mm.random.length) p.mems[pt] = mm;
  });
  // 제노 프리즘 복원 (v2 전용 필드)
  if (pl.pr && typeof pl.pr === 'object') {
    const pos = [3, 4, 5].includes(pl.pr.p) ? pl.pr.p : 3;
    let prName = null;
    if (typeof pl.pr.n === 'string' && pl.pr.n[0] === '#') {
      const x = H.pi.get(pl.pr.n.slice(1));
      if (x) prName = x.name; else missing++;
    } else {
      prName = str(pl.pr.n, 100) || null;
    }
    if (prName) {
      const decP = x => {
        if (typeof x === 'string' && x[0] === '#') {
          const o = H.po.get(x.slice(1));
          if (o) return {effect: o.effect, type: o.type};
          missing++;
          return null;
        }
        if (x && typeof x === 'object' && x.e) return {effect: str(x.e, 500), type: str(x.t, 50)};
        return null;
      };
      const pit = PRISM.items.find(x => x.name === prName);
      if (!pit) missing++;
      p.prism = {pos, name: prName, opts: [0, 1, 2].map(i => decP((pl.pr.o || [])[i])),
                 snap: pit ? JSON.parse(JSON.stringify(pit)) : undefined};
    }
  }
  // 추억 부활 옵션 복원 (v2 전용 필드)
  // 역상 (프리즘과 같은 칸이면 무시)
  if (Array.isArray(pl.iv) && [3, 4, 5].includes(pl.iv[0]) && !(p.prism && p.prism.pos === pl.iv[0])) {
    p.inverse = {pos: pl.iv[0], opts: {low: !!pl.iv[1], mid: !!pl.iv[2], abs: !!pl.iv[3]}};
  }
  if (pl.rv && typeof pl.rv === 'object' && MEM_PARTS.includes(pl.rv.p)) {
    let eff = null, grp = '';
    if (typeof pl.rv.e === 'string' && pl.rv.e[0] === '#') {
      const o = H.rv.get(pl.rv.e.slice(1));
      if (o) { eff = o.effect; grp = o.group; } else missing++;
    } else if (pl.rv.e && typeof pl.rv.e === 'object') {
      eff = str(pl.rv.e.e, 1000) || null;
      grp = str(pl.rv.e.g, 30);
    }
    if (eff) {
      p.revival = {part: pl.rv.p, effect: eff, group: grp};
      if (pl.rv.m && revivalExtraPart(eff)) {
        const mm = {basic: (pl.rv.m.b || []).slice(0, 1).map(decEntry).filter(Boolean),
                   unique: (pl.rv.m.u || []).slice(0, 2).map(decEntry).filter(Boolean),
                   random: (pl.rv.m.r || []).slice(0, 2).map(decEntry).filter(Boolean)};
        if (mm.basic.length + mm.unique.length + mm.random.length) p.revival.mem = mm;
      }
    }
  }
  p.talents = (Array.isArray(isV2 ? pl.tal : pl.talents) ? (isV2 ? pl.tal : pl.talents) : []).slice(0, 200).map(x => {
    let cnt = 1;
    if (x && typeof x === 'object' && x.v !== undefined) { cnt = Math.max(1, Math.min(99, parseInt(x.c, 10) || 1)); x = x.v; }
    const t = decEntry(x);
    if (t && cnt > 1) t.cnt = cnt;
    return t;
  }).filter(t => t && t.effect);
  // 석판 보드 배치 (v2 sb 필드) — 보드 파생 행(◈ 출처 포함)은 여기서 재구성 (인코딩 때 tal에서 제외됨)
  if (Array.isArray(pl.sb)) {
    p.slateBd = pl.sb.slice(0, 12).filter(e => Array.isArray(e) && +e[0] && +e[1]).map(e => ({
      u: +e[0], i: +e[1], d: Math.min(3, Math.max(0, parseInt(e[2], 10) || 0)), f: parseInt(e[4], 10) || 0,
      t: (Array.isArray(e[3]) ? e[3] : []).slice(0, 8).map(x => x ? String(x) : '')
    }));
    if (p.slateBd.length) rebuildSlateTalents(p); else delete p.slateBd;
  }
  // 정령 (v2 pc 필드)
  if (Array.isArray(pl.pc)) {
    const r = decodePactPayload(pl.pc);
    missing += r.missing;
    if (r.pacts) p.pacts = r.pacts;
  }
  // 재능 보드 (v2 gb·gp 필드) — 실재하는 노드만, 프리즘 영향 범위는 계열이 데이터에 있을 때만
  if (Array.isArray(pl.gb)) {
    const gbo = pl.gb.slice(0, 200).map(x => String(x).split(':'))
      .filter(a => /^\d{8}$/.test(a[0]) && BOARDS[a[0].slice(0, 2)] && a[0].slice(2, 4) !== '00' && SLATEIDX.idx[a[0]] !== undefined)
      .map(a => a.length > 2
        ? [a[0], Math.max(0, Math.min(9, parseInt(a[1], 10) || 0)), parseInt(a[2], 10) || 0, parseInt(a[3], 10) || 0, parseInt(a[4], 10) || 0]
        : [a[0], Math.max(1, Math.min(9, parseInt(a[1], 10) || 1))]);
    if (gbo.length) p.gboard = gbo;
  }
  // 히어로 특성 — 짧은 문자열 쌍만 받는다 (키 숫자 1~2자리 / 약재 '노드|분류' / 추억 등급은 정해진 값)
  const strMap = (o, kOk, vOk) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const out = {};
    Object.keys(o).slice(0, 12).forEach(k => { const v = o[k]; if (typeof v === 'string' && kOk(k) && vOk(v)) out[k] = v; });
    return Object.keys(out).length ? out : null;
  };
  const hnOk = strMap(pl.hn, k => /^\d{1,2}$/.test(k), v => v.length <= 30 && !/[<>]/.test(v));
  if (hnOk) p.heroNodes = hnOk;
  const hhOk = strMap(pl.hh, k => k.length <= 60 && !/[<>]/.test(k), v => v.length <= 30 && !/[<>]/.test(v));
  if (hhOk) p.heroHerbs = hhOk;
  const mgOk = strMap(pl.mg, k => k.length <= 24 && !/[<>]/.test(k), v => HERO_GRADES.some(g => g[0] === v));
  if (mgOk) p.memGrade = mgOk;
  if (typeof pl.go === 'string') { const go = pl.go.split(' ').filter(x => BOARDS[x]).slice(0, 4); if (go.length) p.gbOrder = go; }
  [['gp', 'gbPrism'], ['gp2', 'gbPrism2']].forEach(([src, dst2]) => {
    const v = pl[src];
    if (!Array.isArray(v) || !BOARDS[v[0]] || !p.gboard) return;
    const cells = String(v[1] || '').split(' ').map(s2 => s2.split(',').map(Number))
      .filter(c => c.length === 2 && c[0] > 0 && c[1] > 0).slice(0, 30);
    if (cells.length) {
      p[dst2] = {b: String(v[0]), c: cells, nd: /^\d{8}$/.test(String(v[2])) ? String(v[2]) : '', k: v[3] === 'i' ? 'i' : 'p'};
      if (Array.isArray(v[4])) {
        const iv = {};
        [['low', 0], ['mid', 1], ['leg', 2]].forEach(([t, i]) => { if (isFinite(+v[4][i])) iv[t] = +v[4][i]; });
        if (Object.keys(iv).length) p[dst2].iv = iv;
      }
    }
  });
  SKILL_SLOTS.forEach(sl => {
    const v = (isV2 ? pl.sk : pl.skills) && (isV2 ? pl.sk : pl.skills)[sl.id];
    if (!v) return;
    const arr = isV2 ? v : [v.main, ...((v.sup || []))];
    const main = decSkill(arr[0]);
    if (!main) return;
    p.skills[sl.id] = {main, sup: Array.from({length: 5}, (_, i) => decSkill(arr[i + 1]) || null)};
    if (findSkill(main) < 0) missing++;
  });
  return {preset: p, missing, season: pl.se || null}; // se = 만든 시즌 (없으면 표시 전 코드 — SS13 이하)
}

// ── 공유 코드 만들기 (01_core 에서 옮김 2026-10-09 — 빌더 2 공유 올리기도 쓴다) ──
// 더 기대하는 바깥 것: KEY_MAP · findSkill · SKILL_SLOTS · MEM_PARTS · PACT_MAX
function buildCodePayload(p) {
  const H = ensureHashMaps();
  const encEntry = o => {
    const h = fnv36(o.k);
    const ok = KEY_MAP.has(o.k) && !H.rowBad.has(h);
    // 로그로 고정한 수치(rolled 문구·v 실측값)는 해시로 줄이면 사라진다 — 함께 싣는다
    if (o.rolled) return {e: o.effect, s: o.source, t: o.type, r: 1, ...(ok ? {h: '#' + h} : {})};
    if (o.v) return ok ? {h: '#' + h, v: o.v} : {e: o.effect, s: o.source, t: o.type, v: o.v};
    return ok ? '#' + h : {e: o.effect, s: o.source, t: o.type};
  };
  const encSkill = o => {
    if (!o) return 0;
    const h = fnv36(o.name + '\u001f' + o.kind);
    const e = findSkill(o) >= 0 && !H.skBad.has(h) ? '#' + h : {n: o.name, k: o.kind};
    // 스킬 자체 레벨(로그 실측, 20이 아닌 것만)·부귀 티어 옵션 굴림값 — 해시로 줄이면 사라지므로 함께 싣는다
    const ex = {};
    if (o.lv >= 0 && o.lv !== 20) ex.l = o.lv;
    if (o.sopt && o.sopt.length) ex.so = o.sopt;
    if (Object.keys(ex).length) return typeof e === 'string' ? {h: e, ...ex} : {...e, ...ex};
    return e;
  };
  const encItem = name => {
    const h = fnv36(name);
    return H.it.has(h) && !H.itBad.has(h) && H.it.get(h).name === name ? '#' + h : name;
  };
  const slots = {};
  PRESET_SLOTS.forEach(s => {
    const v = p.slots[s.id];
    if (!v) return;
    if (v.kind === 'item') {
      slots[s.id] = {k: 'i', n: encItem(v.name), p: v.part};
      if (v.rolled) slots[s.id].ro = v.rolled;          // 로그 굴림값
      if (v.rand) slots[s.id].rd = v.rand;              // "<랜덤 …>" 자리의 복원 문구
      if (v.gaura) slots[s.id].ga = v.gaura;            // 부여 오라 선택
    }
    else if (v.kind === 'blood') slots[s.id] = {k: 'b', p: v.part, n: v.name || '', ab: v.aberrant ? 1 : 0, o: v.opts.blood.map(encEntry), ba: (v.opts.base || []).map(o => o.effect), x: (v.opts.extra || []).map(o => o.k ? encEntry(o) : {e: o.effect, s: o.source, t: o.type, tr: o.tiers})};
    else slots[s.id] = {k: 'c', p: v.part, n: v.name || '', b: v.opts.basic.map(encEntry), m: v.opts.main.map(encEntry), s: v.opts.sub.map(encEntry)};
    if (v.base) slots[s.id].bs = +v.base; // 베이스(기본) 아이템 id — 수신측이 BASEIDX로 되살린다
    if (v.blend) slots[s.id].bl = [v.blend.effect, v.blend.req || ''];
    if (v.tower) slots[s.id].tw = [v.tower.effect, v.tower.seq || ''];
    if (v.ero && v.ero.length) slots[s.id].er = v.ero; // 침식 강화 인덱스
  });
  const sk = {};
  SKILL_SLOTS.forEach(sl => {
    const v = p.skills[sl.id];
    if (!v || !v.main) return;
    sk[sl.id] = [encSkill(v.main), ...v.sup.map(encSkill)];
  });
  const mem = {};
  MEM_PARTS.forEach(pt => {
    const m = p.mems && p.mems[pt];
    if (m) mem[pt] = {b: m.basic.map(encEntry), u: m.unique.map(encEntry), r: m.random.map(encEntry)};
  });
  let pr;
  if (p.prism) { // 프리즘: 종류·옵션 모두 데이터에 있으면 해시로, 없으면 텍스트로
    const encP = o => {
      if (!o) return 0;
      const h = fnv36(o.effect + '\u001f' + o.type);
      return H.po.has(h) && !H.poBad.has(h) ? '#' + h : {e: o.effect, t: o.type};
    };
    const hn = fnv36(p.prism.name);
    pr = {p: p.prism.pos, n: H.pi.has(hn) && !H.piBad.has(hn) ? '#' + hn : p.prism.name, o: p.prism.opts.map(encP)};
  }
  let rv;
  if (p.revival) { // 부활 옵션: 데이터에 있으면 해시, 없으면 텍스트 (추가 추억은 옵션 엔트리로)
    const h = fnv36(p.revival.effect + '\u001f' + p.revival.group);
    rv = {p: p.revival.part, e: H.rv.has(h) && !H.rvBad.has(h) ? '#' + h : {e: p.revival.effect, g: p.revival.group}};
    if (p.revival.mem) rv.m = {b: p.revival.mem.basic.map(encEntry), u: p.revival.mem.unique.map(encEntry), r: p.revival.mem.random.map(encEntry)};
  }
  const iv = p.inverse ? [p.inverse.pos, p.inverse.opts.low ? 1 : 0, p.inverse.opts.mid ? 1 : 0, p.inverse.opts.abs ? 1 : 0] : undefined;
  const sb = p.slateBd && p.slateBd.length
    ? p.slateBd.map(s => [s.u, s.i, s.d, (s.t || []).map(x => x || 0), s.f || 0]) : undefined; // 석판 보드 배치 (+나방 방향)
  // 재능 보드: 찍은 노드는 "노드ID:포인트" 문자열로(짧게), 프리즘 영향 범위는 [계열, 칸들, 장착노드]
  const gb = p.gboard && p.gboard.length ? p.gboard.map(x => x.slice(0, 5).join(':')) : undefined;
  const gpOf = g => g ? [g.b, g.c.map(c => c[0] + ',' + c[1]).join(' '), g.nd || '', g.k || 'p',
    g.iv ? [g.iv.low, g.iv.mid, g.iv.leg] : undefined] : undefined;
  const gp = gpOf(p.gbPrism), gp2 = gpOf(p.gbPrism2); // 프리즘·역상이 각각 다른 보드에 있을 수 있다
  // 정령 — 이름·승급·켜 둔 노드 자리·운명 끼운 자리. 여기 빠져 있어서 공유 링크로 열면
  // 정령 승급이 사라지고(스퀴드 등) 딜이 크게 낮게 나왔다 (2026-08-21)
  const pc = (p.pacts || []).some(Boolean)
    ? (p.pacts || []).slice(0, PACT_MAX).map(x => x && x.name
        ? [x.name, x.adv || 1, Object.keys(x.nodes || {}).join(','), Object.keys(x.dsts || {}).join(','),
           // 어느 운명 자리에 어떤 운명(did)을 꽂았는지 — 빌더 2 운명판 (2026-10-08). 없으면 생략
           ...(x.dstD && Object.keys(x.dstD).length ? [Object.keys(x.dstD).map(k => k + ':' + x.dstD[k]).join(',')] : [])] : 0)
    : undefined;
  return {v: 2, se: tliSeasonLabel() || undefined, name: p.name, m: p.memo || undefined, hr: p.hero ? [p.hero.hero, p.hero.trait] : undefined,
    tr: p.tier !== '1' ? p.tier : undefined,
    slots, tal: p.talents.filter(t => !t.src).map(t => (t.cnt || 1) > 1 ? {v: encEntry(t), c: t.cnt} : encEntry(t)), sk, mem, pr, rv, iv, sb, gb, gp, gp2, go: p.gbOrder && p.gbOrder.length ? p.gbOrder.join(' ') : undefined, pc,
    // 히어로 특성에서 찍은 노드·약재·추억 등급 — 예전엔 빠져 있어 공유로 열면 히특이 비었다 (2026-10-08)
    hn: p.heroNodes && Object.keys(p.heroNodes).length ? p.heroNodes : undefined,
    hh: p.heroHerbs && Object.keys(p.heroHerbs).length ? p.heroHerbs : undefined,
    mg: p.memGrade && Object.keys(p.memGrade).length ? p.memGrade : undefined};
}

// 지금 시즌 라벨 (SS13 …) — 빌더는 data_v2 의 SEASON, 빌더 2·보기 화면은 페이지에 실린 window.TLI_SEASON
// 공유 코드에 실어 두면 시즌이 바뀐 뒤에도 그 시즌 보관본(/tli/ssNN/view/)으로 풀 수 있다 (2026-10-09)
function tliSeasonLabel() {
  if (typeof SEASON !== 'undefined' && SEASON && SEASON.label) return SEASON.label;
  return (typeof window !== 'undefined' && window.TLI_SEASON && window.TLI_SEASON.label) || '';
}
async function presetToCode(p) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(buildCodePayload(p)));
  if (typeof CompressionStream !== 'undefined') {
    try { return 'TLP1.' + bytesToB64(await deflateBytes(jsonBytes)); } catch (e) {}
  }
  return 'TLP0.' + bytesToB64(jsonBytes);
}

// ── 게임 로그(UE_game.log) 가져오기: 착용 스킬 + 레전드 장비 → 새 빌드 ──
// 로그인 시 서버 상태 덤프(트리)와 ItemChange 이벤트를 시간순 재생해 착용 상태를 복원한다.
// 착용 페이지: PageId=-1(장비 10슬롯), PageId=-6(스킬 — SlotId 1~5=액티브 메인,
// N01~N05=액티브 N의 보조 소켓, 1001+6(g-1)=패시브 g 메인·+1~+5=보조 소켓)
function createLogParser() {
  const RE_IC = /ItemChange@ (Add|Update|Delete) Id=(\d+_[0-9a-f-]{20,})(?: BagNum=\d+)? in PageId=(-\d+) SlotId=(\d+)/;
  const RE_TID = /\+Id \[(\d+_[0-9a-f-]{20,})\]/;      // 덤프 트리의 아이템 인스턴스 Id
  const RE_RARE = /\+RareValue \[(\d+)\]/;
  const RE_UNIQ = /\+UniqueItmId \[(\d+)\]/;             // 레전드 식별 (0이면 제작/일반)
  const RE_PAGE = /\+PageId \[/;                          // 덤프 트리의 아이템 블록 종료 표식
  const RE_NAME = /\+Name \[(.*?)\]/;                    // 캐릭터 이름 (로그 전체에 1회)
  // 어픽스 섹션: BaseAffix=기본옵 / Prefix=메인옵 / Suffix=서브옵 / ChipAffix=시퀀스 / EnchantAffixs=조향 (그 외는 무시)
  const RE_SECT = /\+(AwakenAffix|BaseAttrAffix|FixedBaseAffix|BaseAffix|PrefixSlots|SuffixSlots|Prefix|Suffix|ChipAffix|EnchantAffixs|EnchantSlots)\+?/;
  const SECT_CAT = {BaseAffix: 'basic', Prefix: 'main', Suffix: 'sub', ChipAffix: 'chip', EnchantAffixs: 'ench', AwakenAffix: 'awk', BaseAttrAffix: 'battr'}; // awk = 추억 부활 옵션 / battr = 추억 기본 속성 (403 대역)
  const RE_AID = /\+Id \[(\d{6,9})\]/;                // 어픽스 ID (uuid 없는 짧은 Id)
  // 어픽스가 실제로 굴린 수치 — "+DynArgs+1 [155.0]" 꼴로 +Id 바로 아래에 붙는다.
  // 데이터에는 범위(+(87-120)%)만 있어서 지금까지 계산이 lo~hi로 뭉개졌다. 이 값이 있으면 확정 수치로 쓴다.
  const RE_DYN = /\+DynArgs\+(\d+) \[(-?[\d.]+)\]/;
  const RE_DYN_CONT = /^[|\s]*\+(\d+) \[(-?\d+(?:\.\d+)?)\]\s*$/; // DynArgs의 2번째 이후 값 (키 이름 없음)
  // 석판이 부여하는 재능 노드 목록 — 첫 줄에 키, 이후 줄은 "+N [id]" 꼴로 이어짐
  const RE_TAL = /\+(BaseTalentList|EnchantTalentList)\+1 \[(\d+)\]/;
  const RE_TAL_CONT = /\+(\d+) \[(\d{6,9})\]\s*$/; // +N=칸 번호, 노드 ID는 6~9자리 (하위 재능 700xxx 포함)
  const RE_STATE = /\+state \[(\w+)\]/;                 // 추억 항목 종료 표식 (PageId 없음)
  const RE_HERO = /\+HeroId \[(\d+)\]/;
  // 히어로 특성 선택 — heroCharacterv3OverView.pointOverView.activeId 목록.
  // 마지막 두 자리가 노드 좌표다: 십의 자리 = 단계(45/60/75 = 1~3), 일의 자리 = 단계 안 순번
  const RE_HTRAIT = /\+activeId\+1 \[(\d+)\]/;
  const RE_HTRAIT_CONT = /\+(\d+) \[(\d+)\]\s*$/;
  // 정령 — ContractDatas가 착용(servantId + areaId, 1~3 전투 · 4~6 드롭),
  // ContractInfosV2.pointDatas가 노드판(contractPointId = 영역×100 + 자리,
  // selectContract 1 = 정령 노드 그대로, 2 = 운명으로 교체, isActive가 활성)
  const RE_CONTRACT = /\+ContractDatas\+1\+/;
  const RE_SERVANT = /\+servantId \[(\d+)\]/;
  const RE_AREA = /\+areaId \[(\d+)\]/;
  const RE_CPOINT = /\+contractPointId \[(\d+)\]/;
  const RE_CSEL = /\+selectContract \[(\d+)\]/;
  // 보유 정령의 승급 횟수 — ServantInfos.servantData (미승급은 starLevel 줄이 아예 없다).
  // 착용 정령이 이 목록에 없는 로그도 있다 (12번: 이터널 키퍼가 목록 밖) — 그 경우 미상
  const RE_SVDATA = /\+servantData\+1\+/;
  const RE_STARLV = /\+starLevel \[(\d+)\]/;
  const RE_HEROP = /\+HeroPurchaseId \[(\d+)\]/;
  // 재능 트리: 노드 블록(+N+ 마커) 안의 geniusId + point(찍은 포인트) 짝 — point 키는 다른 섹션에도
  // 있어서 블록 경계에서 반드시 비운다. bonusGeniusInfo = 배치된 핵심 재능 (point 없음) —
  // 한 계열에 여러 개면 "+2+value+geniusId" 연속줄, 부분 덤프는 "+value+geniusId" 꼴이라 공통부로 매칭
  const RE_GCORE = /\+value\+geniusId \[(\d+)\]/;
  const RE_GNODE = /\+geniusId \[(\d+)\]/;
  const RE_GPT = /\+point \[(\d+)\]/;
  const RE_BLK = /\+\d+\+/;                              // 덤프 트리의 배열 원소(블록) 경계
  const RE_TATTO = /\+tattoInfo\+/;                       // 운명 휠에 소켓된 천명·숙명 블록 시작
  const RE_TBASE = /\+BaseId \[(\d+)\]/;
  const RE_PAFF = /\+([1-3])\+affixId \[(\d+)\]/;      // 프리즘 옵션 3칸 (PrefixSlots+N+affixId)
  const RE_DIR = /\+Direction \[(\d+)\]/;               // 석판 회전 (키 없으면 0 — 명왕 심판은 아예 없어 수신측 자동 판별)
  const RE_INF = /\+InfluenceId \[(-?\d+)\]/;            // 나방 복제 방향 (1001위·1002왼·1003아래·1004오른 — 실보드 2개 확정)
  const RE_SHAPE = /\+ShapeId \[(\d+)\]/;                // 석판 모양 — 신격 변형(10xx)은 이걸로 확정 (리스틸 실측)
  const RE_SKCACHE = /SkillCacheList\s*=\s*(.+)/;      // 활성 스킬 인스턴스 목록 (부여 오라 판별 단서)
  // 아이템 자체 레벨 — 스킬은 이 값이 실제 스킬 레벨이다 (기본 20 가정 대신 17·21 등 실측 반영).
  // 키 순서가 덤프마다 달라 Id보다 먼저(+Item+Level, 15번) 오기도, 뒤에(14번 모듈) 오기도 한다.
  // 캐릭터 레벨(+HeroId 블록의 +Level [100])에 오귀속되지 않게 "아이템 블록 안"에서만 읽는다
  const RE_ILVL = /^[|\s]*(?:\+(?:Item|\d+))?\+Level \[(\d+)\]/;
  // 블록 시작 줄 — "+24+Item+Exp [607]"처럼 키 앞 세그먼트가 여러 개일 수 있다.
  // 체인에 Item이 있거나 마지막 키가 아이템 필드면 아이템 블록으로 본다
  // (예전엔 두 번째 조각만 봐서 '+N+Item+…' 형태를 통째로 놓쳤다 — 07번 달의 운동 레벨 오귀속)
  // 마지막 조각이 글자(키)인 줄만 경계로 본다 — "+DynArgs+1 [16.0]"처럼 숫자로 끝나는 값 줄은
  // 블록 시작이 아니라 이어지는 값이라 경계로 삼으면 그 뒤 필드를 통째로 놓친다
  const RE_IBLK = /^[|\s]*\+([A-Za-z0-9]+(?:\+[A-Za-z0-9]+)*\+[A-Za-z]+) \[/;
  const ITEM_KEYS = /^(RareValue|Level|Num|Evalued|BaseId|UniqueItmId|Lock|SkillItemLevel|DropSource|DropSourceModifierId|Id|Prefix|Suffix|Exp|Version|DynArgs)$/;
  let gear = {}, sk = {}, uniq = {}, affix = {}, slate = {}, tal = {}, mems = {}, dirs = {}, infs = {}, shps = {};
  let lvl = {}, pendLvl = null, inItemBlk = false; // 아이템 인스턴스 → 자체 레벨 (스킬 레벨용)
  let prisms = []; // prismInfo 블록들 (프리즘·역상 각각)
  let prismAreas = []; // 영향 범위 블록들 [{blk, c}] — 계열은 careerByBlk로 잇는다
  let charName = null, heroId = null, heroPur = null;
  let hTraits = [], inHTrait = false; // 선택한 히어로 특성 노드 id 목록
  let skInst = {}; // 스킬 슬롯 → 인스턴스 uuid (모듈 프로토콜 어픽스 연결용)
  let pactEq = {}, inContract = false, curSv = null, curCvArea = null; // 착용 정령 (areaId → servantId)
  let cNodes = {}, curCp = null, curCsel = null; // 노드판 (contractPointId → selectContract)
  let svStars = {}, inSvData = false, lastSv = null, pendStar = null; // 보유 정령 승급 (servantId → starLevel)
  let skCache = new Set();
  let gCore = [], gPick = [], dst = [], prism = null;
  let curInst = null, curUniq = 0, curSect = null, inTal = false, carry = '', curDir = 0, curInf = 0, curShp = 0;
  let curGen = null, curPt = null, inTatto = false, inPrism = false, tattoArgs = null;
  let curRow = null, curCol = null, curMap = false, curArea = false, curEnh = 0, curFree = false, gNodes = []; // 보드 노드(위치·역상·프리즘 영역)
  let inPPos = false, prismPos = [], curPX = null, curPY = null, prismArea = null, pposFresh = false;
  let curBlk = '0', posBlk = null, careerByBlk = {}; // 계열 블록(+N+) ↔ geniusCareerId 묶기 (프리즘 범위 소속 판정) // 프리즘 영향 범위 (x=행, y=열)
  let curAffix = {basic: [], main: [], sub: [], chip: [], ench: [], awk: [], battr: []}, curTal = [], curEnc = [];
  let curArgs = {basic: [], main: [], sub: [], chip: [], ench: [], awk: [], battr: []}; // 어픽스와 같은 순서의 실제 수치 (같은 어픽스가 반복되므로 ID가 아니라 인덱스로 짝짓는다)
  let pendArgs = null;            // 아직 Id를 만나지 못한 값 (Id가 DynArgs 뒤에 오는 덤프)
  let argSect = null, argIdx = -1; // 방금 Id를 만난 어픽스의 위치 (Id가 먼저 오는 덤프)
  let inDyn = false;               // DynArgs 값을 이어받는 중
  const chars = []; // 로그에 등장한 캐릭터별 스냅샷 (같은 캐릭터 재접속은 마지막 것으로 대체)
  function snapshot() {
    const gearOut = {};
    for (const slot in gear) gearOut[slot] = {baseId: parseInt(gear[slot], 10), uniqId: uniq[gear[slot]] || 0, affix: affix[gear[slot]] || null};
    const slateTal = Object.values(slate).flatMap(inst => tal[inst] || []).filter(Boolean); // 빈 칸(undefined) 제외
    // 석판 인스턴스별 상세: 출처 아이템(uniq/base)·보드 위치(Index=행×10+열)·회전(Direction)·꽂힌 노드
    const slates = Object.entries(slate).map(([idx, inst]) => ({
      idx: +idx, uniq: uniq[inst] || 0, base: parseInt(inst, 10), dir: dirs[inst] || 0, inf: infs[inst] || 0, shape: shps[inst] || 0, nodes: tal[inst] || []
    }));
    return {gear: gearOut, skills: sk, charName, mems, slateTal, slates, heroId, heroPur, heroTraits: hTraits.slice(), pactEq: Object.assign({}, pactEq), pactNodes: Object.assign({}, cNodes), svStars: Object.assign({}, svStars), skillAffix: Object.fromEntries(Object.entries(skInst).map(([k, v]) => [k, affix[v] || null])), skillLv: Object.fromEntries(Object.entries(skInst).map(([k, v]) => [k, lvl[v]]).filter(x => x[1] > 0)), genius: {core: gCore, picked: gPick, nodes: gNodes}, dst, prism, prisms: prisms.slice(),
            prismAreas: prismAreas.map(a => ({b: careerByBlk[a.blk] || null, c: a.c})), prismArea, skCache: [...skCache]};
  }
  function hasContent(s) {
    return Object.keys(s.gear).length + Object.keys(s.skills).length + Object.keys(s.mems).length + s.slateTal.length + s.genius.core.length + s.dst.length + (s.prism ? 1 : 0) > 0;
  }
  function pushChar() {
    const s = snapshot();
    if (!hasContent(s)) return;
    const key = s.charName || s.heroId || String(chars.length);
    const i = chars.findIndex(c => (c.charName || c.heroId) === key);
    // 보유 정령 승급 목록은 덤프마다 30개씩만 실린다 (실측: 15번 로그 3덤프 × 30, 각각 다른 정령) —
    // 같은 캐릭터의 이전 덤프에서 본 정령은 살려 둔다 (승급은 시간이 지나도 내려가지 않는다)
    if (i >= 0) s.svStars = Object.assign({}, chars[i].svStars, s.svStars);
    // 노드판(pointDatas)도 덤프당 30개씩만 실린다 — 14번 실측: 덤프1이 영역1의 자리 2·5·6·9,
    // 덤프2가 2·3·6·10을 실었다. 뒤 덤프로 덮으면 앞 덤프에만 있던 노드가 사라진다
    if (i >= 0) s.pactNodes = Object.assign({}, chars[i].pactNodes, s.pactNodes);
    if (i >= 0) chars[i] = s; else chars.push(s);
  }
  function resetChar() { // 캐릭터 전환 — 이전 캐릭터를 스냅샷으로 보관 후 전부 리셋
    flushGen();
    pushChar();
    gear = {}; sk = {}; uniq = {}; affix = {}; slate = {}; tal = {}; mems = {}; dirs = {}; infs = {}; shps = {}; skInst = {};
    lvl = {}; pendLvl = null; inItemBlk = false;
    charName = null; heroId = null; heroPur = null;
    hTraits = []; inHTrait = false;
    pactEq = {}; inContract = false; curSv = null; curCvArea = null;
    cNodes = {}; curCp = null; curCsel = null;
    svStars = {}; inSvData = false; lastSv = null; pendStar = null;
    gCore = []; gPick = []; dst = []; prism = null; prisms = []; prismAreas = []; curGen = null; curPt = null; inTatto = false; inPrism = false; tattoArgs = null;
    skCache = new Set();
    curRow = null; curCol = null; curMap = false; curArea = false; curEnh = 0; curFree = false; gNodes = [];
    inPPos = false; prismPos = []; curPX = null; curPY = null; prismArea = null; pposFresh = false;
    curBlk = '0'; posBlk = null; careerByBlk = {};
  }
  let pendMemState = null; // 직전에 본 추억 state — 어픽스보다 먼저 나와서 flush까지 들고 간다
  let doneInst = new Set(); // 이미 확정한 인스턴스 — 재등장하는 Id는 항목 끝 마커라 무시한다
  function flush(memState) {
    if (memState === undefined) memState = pendMemState;
    if (curInst) {
      doneInst.add(curInst);
      if (curUniq > 0) uniq[curInst] = curUniq;
      if (curAffix.basic.length + curAffix.main.length + curAffix.sub.length + curAffix.chip.length + curAffix.ench.length + curAffix.awk.length + curAffix.battr.length) {
        curAffix.args = curArgs; // 어픽스와 같은 순서의 실제 수치
        affix[curInst] = curAffix;
        const base = parseInt(curInst, 10);
        // 추억(71001~71003)은 착용 페이지 이벤트가 없어 덤프에서 직접 수집 (Active만)
        if (base >= 71001 && base <= 71003 && memState !== 'off') { curAffix.rare = curRare; mems[base] = curAffix; }
      }
      // 명왕 석판(394xxx)은 [1번 칸, 2번 칸, 3번 칸, 고정…] 순으로 정규화 — 소비측이 앞 칸수만큼을 칸 옵션으로 읽는다
      const nether = parseInt(curInst, 10) >= 394000 && parseInt(curInst, 10) < 395000;
      const tl = nether ? Array.from({length: 3}, (_, i) => curEnc[i]).concat(curTal) : curTal;
      if (tl.filter(Boolean).length) tal[curInst] = tl;
      if (curDir) dirs[curInst] = curDir;
      if (curInf > 0) infs[curInst] = curInf;
      if (curShp > 0) shps[curInst] = curShp;
      // Id보다 먼저 온 레벨 — 자기 레벨이 이미 직접 배정된 항목은 덮지 않는다 (오귀속 방지)
      if (pendLvl != null && lvl[curInst] === undefined) lvl[curInst] = pendLvl;
    }
    pendLvl = null;
    curInst = null; curUniq = 0; curSect = null; inTal = false; curDir = 0; curInf = 0; curShp = 0; curRare = 0; pendMemState = null;
    curAffix = {basic: [], main: [], sub: [], chip: [], ench: [], awk: [], battr: []}; curTal = []; curEnc = [];
    curArgs = {basic: [], main: [], sub: [], chip: [], ench: [], awk: [], battr: []}; argSect = null; argIdx = -1; pendArgs = null; inDyn = false;
  }
  let curRare = 0;
  function flushGen() { // 재능 노드 블록 종료 — geniusId와 point가 다 모였을 때만 찍은 노드로 확정
    if (curGen && curPt) gPick.push([curGen, curPt]);
    // 보드 노드 목록: 위치(행·열)와 상태 플래그까지 — 역상(isMapping)은 원래 자리가 아닌 칸에 노드가 놓인다
    if (curGen && curGen.length === 8 && curRow && curCol) {
      gNodes.push({g: curGen, r: curRow, c: curCol, p: curPt || 0, m: curMap ? 1 : 0, a: curArea ? 1 : 0, f: curFree ? 1 : 0, e: curEnh || 0});
    }
    curGen = null; curPt = null; curRow = null; curCol = null; curMap = false; curArea = false; curEnh = 0; curFree = false;
  }
  function line(l) {
    let m;
    if (l.indexOf('RecvMessage STT----GetPlayerData') >= 0) { resetChar(); doneInst = new Set(); return; } // 캐릭터 상태 덤프 시작 = 로그인/전환
    if (l.indexOf('ItemChange@') >= 0 && (m = RE_IC.exec(l))) {
      const act = m[1], inst = m[2], page = m[3], slot = +m[4];
      if (page === '-6') { if (act === 'Delete') { delete sk[slot]; delete skInst[slot]; } else { sk[slot] = parseInt(inst, 10); skInst[slot] = inst; } }
      else if (page === '-1') { if (act === 'Delete') delete gear[slot]; else gear[slot] = inst; }
      else if (page === '-4') { if (act === 'Delete') delete slate[slot]; else slate[slot] = inst; }
      return;
    }
    if ((m = RE_SKCACHE.exec(l))) { // "[8306_uuid] = true, …" — 지금 걸려 있는 스킬 인스턴스
      let mm;
      const re = /\[(\d+)_[0-9a-f-]+\]/g;
      while ((mm = re.exec(m[1]))) skCache.add(mm[1]);
      return;
    }
    if (l.indexOf('+') < 0) return;
    // 최상위 키(줄 첫 글자가 '+')는 덤프 섹션의 경계 — 여기서 밀린 아이템을 확정한다.
    // PageId가 블록 '앞'에 오는 덤프(로그 09)에서는 섹션 마지막 아이템이 PageId를 만나지 못해
    // 다음 섹션 아이템으로 정보가 새던 문제 방지 (석판 마지막 장의 UniqueItmId 유실)
    if (l.charAt(0) === '+') flush();
    // EnchantTalentList=칸에 소켓된 낙인(+N=칸 번호), BaseTalentList=석판 고정 옵션.
    // 두 키가 나오는 순서는 덤프마다 다르므로(10=Enchant 먼저, 08=Base 먼저) 따로 담는다
    if ((m = RE_TAL.exec(l))) { inTal = m[1] === 'EnchantTalentList' ? 'e' : 'b'; (inTal === 'e' ? curEnc : curTal)[0] = m[2]; return; }
    if ((m = RE_HTRAIT.exec(l))) { inHTrait = true; hTraits = [m[1]]; return; }
    if (inHTrait) {
      if ((m = RE_HTRAIT_CONT.exec(l))) { hTraits[+m[1] - 1] = m[2]; return; }
      inHTrait = false; // 다른 키가 나오면 목록 종료
    }
    // 보유 정령 승급(= starLevel + 1, 14번 실측: 이터널 키퍼 star5 = 인게임 승급 6).
    // 키 순서가 덤프마다 다르고(12번 servantId 먼저 · 14번 starLevel 먼저) 목록도 부분 목록이라
    // 덤프마다 다르다 — 순서 무관으로 짝짓고, 드롭 정령 스킴(dropServantContractData)의 짝도 줍는다.
    // 미승급(star 0)은 starLevel 줄이 아예 없다 (12번 영약 요정 = 인게임 승급 1 실측)
    if (RE_SVDATA.test(l) || l.indexOf('dropServantContractData') >= 0) { inSvData = true; lastSv = null; pendStar = null; }
    if (inSvData) {
      // 종료 판정이 servantId 매치보다 먼저다 — ContractDatas 첫 줄에도 servantId가 같이 실린다
      if (l.indexOf('OverView') >= 0 || l.indexOf('ContractDatas+') >= 0 || l.indexOf('schemeName') >= 0 || l.indexOf('growUpDto') >= 0) { inSvData = false; }
      else {
        // 항목 경계 — starLevel 없는 항목의 잔값이 다음 항목으로 새지 않게 비운다
        if (RE_BLK.test(l)) { lastSv = null; pendStar = null; }
        if ((m = RE_SERVANT.exec(l))) {
          if (pendStar != null) { svStars[m[1]] = pendStar; pendStar = null; }
          else { lastSv = m[1]; if (svStars[lastSv] === undefined) svStars[lastSv] = 0; }
          return;
        }
        if ((m = RE_STARLV.exec(l))) {
          if (lastSv) { svStars[lastSv] = +m[1]; lastSv = null; } else pendStar = +m[1];
          return;
        }
      }
    }
    // 착용 정령 — servantId·areaId가 블록마다 짝으로 온다 (둘 다 모이면 확정)
    if (RE_CONTRACT.test(l)) { inContract = true; curSv = curCvArea = null; }
    if (inContract) {
      if ((m = RE_SERVANT.exec(l))) { curSv = m[1]; }
      else if ((m = RE_AREA.exec(l))) { curCvArea = +m[1]; }
      else if (l.indexOf('+servantId') < 0 && l.indexOf('+areaId') < 0 && !/^[|\s]*\+\d+\+/.test(l)) inContract = false;
      if (curSv != null && curCvArea != null) { pactEq[curCvArea] = curSv; curSv = curCvArea = null; }
      if (inContract) return;
    }
    // 정령 노드판 — contractPointId·selectContract 짝 (키 순서 가변).
    // isActive는 조건에 넣지 않는다 — 운명으로 교체된 자리(select=2)는 노드 효과가 꺼져
    // isActive가 false라서, true만 담으면 교체 자리 정보가 통째로 사라진다 (12번 로그 실측)
    if (l.indexOf('ContractInfosV2') >= 0) { curCp = curCsel = null; }
    if ((m = RE_CPOINT.exec(l))) { curCp = m[1]; }
    else if ((m = RE_CSEL.exec(l))) { curCsel = +m[1]; }
    if (curCp != null && curCsel != null) { cNodes[curCp] = curCsel; curCp = curCsel = null; }
    if (inTal) {
      if ((m = RE_TAL_CONT.exec(l))) { (inTal === 'e' ? curEnc : curTal)[+m[1] - 1] = m[2]; return; }
      inTal = false; // 다른 키가 나오면 목록 종료 — 아래 일반 처리로 계속
    }
    // 프리즘: prismInfo 블록 — 꽂힌 노드(geniusId), 종류(BaseId 360xxx), 옵션 3칸(PrefixSlots+N+affixId)
    // 재능 노드 처리(RE_GNODE)보다 먼저 — prismInfo 줄도 geniusId 키라서 순서가 바뀌면 삼켜진다
    // 프리즘 영향 범위: prismEffectPositions 블록의 (x=행, y=열) 목록 — prismInfo보다 먼저 나온다
    if (l.indexOf('+prismEffectPositions+') >= 0) { inPPos = true; prismPos = []; curPX = curPY = null; pposFresh = true; }
    if (inPPos) { // 덤프마다 x·y 순서가 다르다 (07=x 먼저, 10=y 먼저) — 둘 다 모이면 한 칸 확정
      if ((m = /\+x \[(\d+)\]/.exec(l))) { curPX = +m[1]; if (curPY != null) { prismPos.push([curPX, curPY]); curPX = curPY = null; } return; }
      if ((m = /\+y \[(\d+)\]/.exec(l))) { curPY = +m[1]; if (curPX != null) { prismPos.push([curPX, curPY]); curPX = curPY = null; } return; }
      inPPos = false; // x·y 외의 키가 나오면 목록 종료
      if (prismPos.length) prismAreas.push({blk: posBlk != null ? posBlk : curBlk, c: prismPos.slice()});
    }
    // 범위가 어느 계열 보드인지 = 같은 계열 블록(+N+)의 geniusCareerId (1자리 신 계열은 뒤에 0 = 노드 ID 앞2자리)
    // 블록 안에서 careerId가 앞에 오는 덤프(08)와 뒤에 오는 덤프(07)가 둘 다 있어 블록 번호로 묶는다.
    // 프리즘 아이템(prismInfo)이 로그에 없어도 영역만은 살릴 수 있게 별도 보관
    if ((m = /\+(\d+)\+(geniusCareerId|bonusGeniusInfo|geniusList|unEffectServerAffixTypes|prismEffectPositions|prismInfo)/.exec(l))) curBlk = m[1];
    if (pposFresh && prismPos.length) { posBlk = curBlk; pposFresh = false; }
    if ((m = /\+geniusCareerId \[(\d+)\]/.exec(l))) {
      careerByBlk[curBlk] = m[1].length === 1 ? m[1] + '0' : m[1];
      if (posBlk != null && careerByBlk[posBlk]) prismArea = {b: careerByBlk[posBlk], c: prismPos.slice()};
      return;
    }
    // 프리즘 블록: 키 순서가 덤프마다 다르다 (07 로그는 geniusId 먼저, 08 로그는 item 먼저·geniusId 마지막)
    // → prismInfo가 보이면 블록을 열고, 안에서 geniusId·BaseId·affixId를 순서 무관하게 줍는다
    if (l.indexOf('+prismInfo+') >= 0) {
      prism = {board: null, base: null, slots: [null, null, null], node: null, pos: prismPos.slice()};
      prisms.push(prism); // 프리즘과 역상이 함께 있는 빌드는 prismInfo가 여러 번 온다 (15번 실측)
      inPrism = true;
    }
    if (inPrism) {
      // 블록 종료: 형제 키(bonusGeniusInfo·geniusCareerId·geniusList)나 범위 목록이 나오면 끝
      if (l.indexOf('bonusGeniusInfo') >= 0 || l.indexOf('geniusCareerId') >= 0 || l.indexOf('geniusList') >= 0 || l.indexOf('prismEffectPositions') >= 0) {
        inPrism = false;
      } else {
        if ((m = RE_PAFF.exec(l))) { const s = +m[1]; if (!prism.slots[s - 1]) prism.slots[s - 1] = m[2]; return; }
        if (!prism.base && (m = RE_TBASE.exec(l))) { prism.base = m[1]; return; }
        if (!prism.node && (m = RE_GNODE.exec(l)) && m[1].length === 8) { prism.node = m[1]; prism.board = m[1].slice(0, 2); return; }
        // 역상의 반사 효과 수치 — FixedBaseAffix의 DynArgs와 Id 짝 (값이 Id보다 먼저 온다, 15번 실측)
        if ((m = RE_DYN.exec(l))) { prism._fxv = parseFloat(m[2]); return; }
        if (prism._fxv != null && (m = /\+Id \[(\d{9,10})\]/.exec(l))) { (prism.fx || (prism.fx = {}))[m[1]] = prism._fxv; prism._fxv = null; return; }
        return; // 프리즘 아이템 내부 키(어픽스 Id 등)는 장비 파싱으로 새지 않게 여기서 소비
      }
    }
    // 재능 트리: 블록 안에서 geniusId·point가 둘 다 모이면 찍은 노드 (키 순서는 가변)
    if ((m = RE_GCORE.exec(l))) { flushGen(); if (gCore.indexOf(m[1]) < 0) gCore.push(m[1]); return; }
    if (RE_BLK.test(l)) flushGen(); // 새 블록 — 미완성 genius 짝은 버림 (point는 다른 섹션에도 있음)
    // 운명(tattoInfo)은 배열 경계로 끊지 않는다 — 블록 안 BaseAffix+1+ 같은 줄에서 조기 종료돼 누락됨(리스틸 덤프).
    // 대신 다른 섹션 진입에서만 해제 (BaseId 없는 tatto 블록이 남아도 엉뚱한 BaseId를 안 집게)
    if (l.indexOf('dressingTalentBlocks') >= 0 || l.indexOf('OverView') >= 0 || l.indexOf('prismInfo') >= 0) inTatto = false;
    if ((m = RE_GNODE.exec(l))) { curGen = m[1]; return; }
    if ((m = RE_GPT.exec(l))) { curPt = parseInt(m[1], 10); return; }
    // 보드 좌표: x=행, y=열 — 덤프마다 x·y 순서가 다르므로 각각 따로 받는다 (이어지는 줄은 키 이름 없이 +x/+y만 옴)
    if ((m = /\+position\+x \[(\d+)\]/.exec(l))) { curRow = +m[1]; return; }
    if ((m = /\+position\+y \[(\d+)\]/.exec(l))) { curCol = +m[1]; return; }
    if ((curRow || curCol) && (m = /^[^A-Za-z]*\+x \[(\d+)\]/.exec(l))) { curRow = +m[1]; return; }
    if ((curRow || curCol) && (m = /^[^A-Za-z]*\+y \[(\d+)\]/.exec(l))) { curCol = +m[1]; return; }
    if (l.indexOf('+isMapping [true]') >= 0) { curMap = true; return; }      // 역상으로 반사돼 온 노드
    if (l.indexOf('+inPrismArea [true]') >= 0) { curArea = true; return; }   // 프리즘/역상 영향 범위 안
    if (l.indexOf('+beforeGenusFree [true]') >= 0) { curFree = true; return; } // 선행 조건 없이 투자 가능
    if ((m = /\+effectEnhance \[(\d+)\]/.exec(l))) { curEnh = +m[1]; return; }
    // 운명: tattoInfo 블록의 첫 BaseId = 소켓된 천명·숙명의 게임 id
    if (RE_TATTO.test(l)) { inTatto = true; tattoArgs = null; return; }
    if (inTatto && (m = RE_DYN.exec(l))) { (tattoArgs || (tattoArgs = []))[+m[1] - 1] = parseFloat(m[2]); return; }
    if (inTatto && (m = RE_TBASE.exec(l))) { dst.push([m[1], tattoArgs]); inTatto = false; tattoArgs = null; return; }
    if ((m = RE_SECT.exec(l))) { curSect = SECT_CAT[m[1]] || null; pendArgs = null; argSect = null; argIdx = -1; }
    // 가방류 나열의 항목 경계 — 어픽스 내부 키(Version·DynArgs·Id)는 여기 안 걸린다.
    // 항목의 첫 필드는 덤프마다 다르다 (+29+BaseId · +30+Evalued · +28+RareValue …)
    if (/^[|\s]*\+\d+\+(BaseId|RareValue|UniqueItmId|DropSource|DropSourceModifierId|SkillItemLevel|Evalued|Num|Level|Lock|Exp) \[/.test(l)) flush();
    // 아이템 블록 추적 — 체인에 Item이 있거나 마지막 키가 아이템 필드면 안, 아니면(HeroId·servantId 등) 밖
    if ((m = RE_IBLK.exec(l))) {
      const segs = m[1].split('+');
      inItemBlk = segs.indexOf('Item') >= 0 || ITEM_KEYS.test(segs[segs.length - 1]);
    }
    if (inItemBlk && (m = RE_ILVL.exec(l))) { if (curInst) lvl[curInst] = +m[1]; else pendLvl = +m[1]; return; }
    // 어픽스 블록 경계(+N+) — Id를 만나기 전 대기 중이던 값은 이 블록 것이므로 유지하되,
    // 이미 Id와 짝지어진 어픽스는 여기서 끊어 다음 블록 값이 섞이지 않게 한다
    if (curSect && /^\s*[|+\s]*\+\d+\+/.test(l) && argSect === curSect) { argSect = null; argIdx = -1; }
    if ((m = RE_TID.exec(l))) {
      if (doneInst.has(m[1])) return; // 확정된 항목의 끝 마커 — 뒤에 오는 필드는 다음 항목 것이다
      if (curInst && curInst !== m[1]) flush(); // 다른 인스턴스 = 이전 항목 확정
      curInst = m[1];
      return;
    }
    if (curSect && (m = RE_AID.exec(l))) {
      argIdx = curAffix[curSect].push(m[1]) - 1; argSect = curSect;
      curArgs[curSect][argIdx] = pendArgs || []; // 값이 Id보다 먼저 온 덤프(10번 로그)면 여기서 짝지어진다
      pendArgs = null;
      return;
    }
    if (curSect && (m = RE_DYN.exec(l))) { // 어픽스가 굴린 실제 값 (+1, +2 … 순서대로)
      if (argSect === curSect && argIdx >= 0 && curArgs[curSect][argIdx]) {
        curArgs[curSect][argIdx][+m[1] - 1] = parseFloat(m[2]); // Id가 먼저 온 덤프 — 같은 어픽스에 이어 붙인다
      } else {
        (pendArgs || (pendArgs = []))[+m[1] - 1] = parseFloat(m[2]); // Id가 아직 안 왔다 — 대기시켰다가 Id에서 짝짓는다
      }
      inDyn = true; // 뒤따르는 "+2 [값]" 줄도 같은 어픽스 것
      return;
    }
    if (inDyn && curSect && (m = RE_DYN_CONT.exec(l))) { // DynArgs의 두 번째 이후 값
      const tgt = (argSect === curSect && argIdx >= 0 && curArgs[curSect][argIdx]) ? curArgs[curSect][argIdx]
                                                                                  : (pendArgs || (pendArgs = []));
      tgt[+m[1] - 1] = parseFloat(m[2]);
      return;
    }
    inDyn = false; // 값이 아닌 줄을 만나면 이어받기를 끝낸다
    if ((m = RE_UNIQ.exec(l))) { curUniq = parseInt(m[1], 10); return; }
    if ((m = RE_RARE.exec(l))) { curRare = +m[1]; return; }
    if ((m = RE_DIR.exec(l))) { curDir = +m[1]; return; } // 키 순서 가변 — Direction이 +Id보다 먼저 오는 덤프도 있음 (리스틸 로그)
    if ((m = RE_INF.exec(l))) { curInf = +m[1]; return; }
    if ((m = RE_SHAPE.exec(l))) { curShp = +m[1]; return; }
    if (RE_PAGE.test(l)) { flush(); return; }
    if ((m = RE_STATE.exec(l))) {
      const st = m[1] === 'Active' ? 'on' : 'off';
      if (curInst && curAffix.basic.length + curAffix.main.length + curAffix.sub.length + curAffix.battr.length + curAffix.awk.length) flush(st);
      else pendMemState = st;
      return;
    }
    if (!heroId && (m = RE_HERO.exec(l))) { heroId = m[1]; return; }
    if (!heroPur && (m = RE_HEROP.exec(l))) { heroPur = m[1]; return; }
    if (!charName && (m = RE_NAME.exec(l))) charName = m[1];
  }
  return {
    feed(text) {
      const s = carry + text;
      let start = 0, nl;
      while ((nl = s.indexOf('\n', start)) >= 0) { line(s.slice(start, nl)); start = nl + 1; }
      carry = s.slice(start);
    },
    finish() {
      if (carry) { line(carry); carry = ''; }
      flushGen();
      flush();
      pushChar();
      // 하위 호환: 마지막 캐릭터의 필드를 최상위에 유지 + 전체 캐릭터 목록 동봉
      const last = chars.length ? chars[chars.length - 1] : snapshot();
      return Object.assign({chars}, last);
    }
  };
}
async function handleLogFile(file) {
  showToast('로그 분석 중...');
  const p = createLogParser();
  try {
    if (file.stream && typeof TextDecoderStream === 'function') {
      const rd = file.stream().pipeThrough(new TextDecoderStream()).getReader();
      for (;;) { const r = await rd.read(); if (r.done) break; p.feed(r.value); }
    } else {
      p.feed(await file.text()); // 구형 브라우저 폴백 (로그가 크면 느릴 수 있음)
    }
  } catch (e) { alert('로그 파일을 읽지 못했습니다: ' + e.message); return; }
  const r = p.finish();
  pendingLogSrc = 'file';
  if ((r.chars || []).length > 1) showLogCharModal(r.chars);
  else buildPresetFromLog(r, 'file');
}
// 로그에 캐릭터가 2명 이상이면 어느 캐릭터를 가져올지 선택
let pendingLogChars = null;
function showLogCharModal(chars) {
  pendingLogChars = chars;
  document.getElementById('logCharModalInfo').innerHTML =
    '로그에 캐릭터가 ' + chars.length + '명 있습니다. 가져올 캐릭터를 선택하세요.<br><br>' +
    chars.map((c, i) => {
      const hn = (LOGMAP.hero || {})[c.heroId];
      const parts = ['장비 ' + Object.keys(c.gear).length + ' · 스킬 ' + Object.keys(c.skills).length + '칸'];
      return `<button class="btn-sel" style="display:block;width:100%;text-align:left;margin:4px 0;padding:9px 12px" onclick="pickLogChar(${i})">` +
        `<b>${escapeHtml(c.charName || '캐릭터 ' + (i + 1))}</b>` + (hn ? ` <span style="color:#ffd166">${escapeHtml(hn)}</span>` : '') +
        ` <span style="color:#8b949e;font-size:12px">${parts.join(' ')}</span></button>`;
    }).join('');
  document.getElementById('logCharModal').style.display = 'flex'; modalHistPush();
}
function closeLogCharModal() {
  document.getElementById('logCharModal').style.display = 'none';
  pendingLogChars = null;
}
let pendingLogSrc = 'file'; // 로그 출처 (file=파일 선택, ext=외부 앱 릴레이) — 캐릭터 선택 모달 경유 시 유지
function pickLogChar(i) {
  const c = pendingLogChars && pendingLogChars[i];
  closeLogCharModal();
  if (c) buildPresetFromLog(c, pendingLogSrc);
}
// 로그 가져오기 통계 전송 — 개수와 (성공 시) 빌드 이름·메인 스킬만, 빌드 내용·ID는 보내지 않음
function sendLiStat(payload) {
  if (typeof SHARE_ONLINE === 'undefined' || !SHARE_ONLINE) return;
  try {
    fetch('/api/hit', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify(Object.assign({v: 0}, payload)), keepalive: true}).catch(() => {});
  } catch (e) {}
}
function buildPresetFromLog(r, liSrc) {
  const nameIdx = new Map();
  SKILLS.forEach((s, i) => { if (!nameIdx.has(s.name)) nameIdx.set(s.name, i); });
  const missNames = new Set();
  const skRef = id => {
    if (!id) return null;
    const nm = LOGMAP.sk[id];
    if (!nm) { missNames.add('스킬 ID ' + id); return null; }
    const i = nameIdx.get(nm);
    if (i === undefined) { missNames.add(nm); return null; }
    return {name: SKILLS[i].name, kind: SKILLS[i].kind};
  };
  const skills = {};
  let mainCnt = 0, supCnt = 0;
  const takeSlot = (slotId, mainKey, supBase, step) => {
    const main = skRef(r.skills[mainKey]);
    const sup = [1, 2, 3, 4, 5].map(k => skRef(r.skills[supBase + k * step]));
    const supN = sup.filter(Boolean).length;
    if (!main && !supN) return;
    // 모듈 스킬의 프로토콜 — 스킬 인스턴스의 Prefix 어픽스(772 대역), 수치는 DynArgs 실측.
    // 모듈은 보조 칸(촉발체 등)에도 꽂히므로 메인·보조 모두 본다 (14번 실측: 집행자가 a1 보조 2번)
    const protoOf = key => {
      const af = (r.skillAffix || {})[key];
      const proto = [];
      ((af && af.main) || []).forEach((aid, i) => {
        const pd = PROTOCOL_KO[aid];
        if (!pd) return;
        const vals = (af.args && af.args.main || [])[i];
        proto.push({name: pd.name, effect: applyRollText(pd.effect, vals)});
      });
      return proto.length ? proto : null;
    };
    // 부귀·숭고 보조의 티어 옵션 — 771 대역 Prefix 어픽스의 DynArgs가 실제 굴림값이다
    // (14번 실측: 결빙 +16% = T0 범위 14~17 · 고리 -26.4% = T0 범위 -27~-25). 레벨 효과와는 별개
    const soptOf = key => {
      const af = (r.skillAffix || {})[key];
      const out = [];
      ((af && af.main) || []).forEach((aid, i) => {
        if (!/^771/.test(String(aid))) return;
        const vals = ((af.args && af.args.main) || [])[i] || [];
        vals.forEach(v => { if (isFinite(v)) out.push(v); });
      });
      return out.length ? out : null;
    };
    // 스킬 자체 레벨 — 로그의 아이템 Level. 일반 스킬은 기본 20이라 그 외일 때만 싣고,
    // 부귀·숭고는 별도 축(1부터 세는 육성 레벨)이라 값이 무엇이든 그대로 싣는다
    const lvOf = key => { const n = (r.skillLv || {})[key]; return n >= 0 ? n : null; };
    const put = (ref, key) => {
      const pr = protoOf(key);
      if (pr) ref.proto = pr;
      const so = soptOf(key);
      if (so) ref.sopt = so;
      const lv = lvOf(key);
      if (lv != null && (SUP_LV_KINDS.indexOf(ref.kind) >= 0 || lv !== 20)) ref.lv = lv;
    };
    if (main) put(main, mainKey);
    sup.forEach((sp, k) => { if (sp) put(sp, supBase + (k + 1) * step); });
    // 메인이 미지원 스킬(신규 등)이어도 보조 구성은 살린다 — 메인만 나중에 직접 채우면 됨
    skills[slotId] = {main: main || null, sup};
    if (main) mainCnt++;
    supCnt += supN;
  };
  for (let n = 1; n <= 5; n++) takeSlot('a' + n, n, n * 100, 1);
  for (let g = 1; g <= 4; g++) { const b = 1001 + 6 * (g - 1); takeSlot('p' + g, b, b, 1); }
  // 장비: 레전드(UniqueItmId>0)는 이름으로, 제작 장비는 어픽스 ID를 옵션 행으로 복원
  const slots = {};
  let eqCnt = 0, craftCnt = 0, baseCnt = 0;
  // 어픽스 해석: 정확 일치 → 같은 패밀리(끝 2자리 제외, 티어 변형)가 유일하면 그것
  const craftFam = {};
  Object.keys(CRAFTIDX.idx).forEach(k => { (craftFam[k.slice(0, -2)] = craftFam[k.slice(0, -2)] || []).push(k); });
  const resolveAffix = aid => {
    let i = CRAFTIDX.idx[aid];
    if (i === undefined) { const c = craftFam[aid.slice(0, -2)]; if (c && c.length === 1) i = CRAFTIDX.idx[c[0]]; }
    return i === undefined ? null : ALL_DATA[i];
  };
  // 로그에 실린 실제 롤값(DynArgs)으로 옵션 문구의 수치를 확정한다.
  // 데이터 문구는 범위(+(87-120)%)라 그대로 쓰면 모든 계산이 lo~hi로 뭉개진다.
  // 값의 순서는 문구에 나오는 수치 자리 순서와 같다 (실측: 반지 크리 155/121, 무기 147).
  // 원문이 부호로 시작하면 부호를 유지하고, 부호 없이 괄호로 온 범위는 부호 없이 쓴다
  const rollNum = (v, sg, pc) => {
    const n = Math.round(v * 10) / 10;
    return (n < 0 || !sg ? '' : '+') + n + pc;
  };
  const numSlots = txt => (String(txt).match(new RegExp(NUM_PCT, 'g')) || []).length;
  const applyArgs = (effect, args) => {
    if (!args || !args.length) return effect;
    const vals = args.filter(v => v !== undefined && v !== null && isFinite(v));
    if (!vals.length || numSlots(effect) !== vals.length) return effect; // 자리 수가 다르면 손대지 않는다
    let i = 0;
    return effect.replace(new RegExp(NUM_PCT, 'g'), (mm, sg, a, b, pc) => rollNum(vals[i++], sg, pc));
  };
  // 레전드 옵션(HTML 표기)의 수치를 실제 굴림값으로. 태그는 건드리지 않고 숫자 자리만 바꾼다.
  const applyArgsHtml = (html, args) => {
    if (!args || !args.length) return html;
    const vals = args.filter(v => v !== undefined && v !== null && isFinite(v));
    // 태그 밖 텍스트의 수치 자리만 센다 (class="m" 같은 속성의 숫자는 제외)
    const bare = String(html).replace(/<[^>]*>/g, '');
    if (!vals.length || numSlots(bare) !== vals.length) return html;
    let i = 0;
    return String(html).replace(/(<[^>]*>)|([^<]+)/g, (mm, tag, text) =>
      tag ? mm : text.replace(new RegExp(NUM_PCT, 'g'), (m2, sg, a, b, pc) => rollNum(vals[i++], sg, pc)));
  };
  // 어픽스 개수와 옵션 줄 수가 맞을 때만 값을 남긴다 — 어긋나면 엉뚱한 줄에 들어간다.
  // 문구를 미리 만들어 저장하지 않는다: 저장 문자열은 sanTxt로 무해화돼 태그가 글자로 보이고,
  // 데이터가 갱신되면 낡은 문구가 남는다. 원본 + 값만 두고 그릴 때 조합한다.
  const rolledValsOf = (it, affix) => {
    if (!affix || !affix.args) return null;
    const ids = [...(affix.basic || []), ...(affix.main || []), ...(affix.sub || [])];
    const vals = [...(affix.args.basic || []), ...(affix.args.main || []), ...(affix.args.sub || [])];
    const opts = it.opts || [];
    if (!ids.length || ids.length !== opts.length) return null;
    return vals.map(v => (v && v.length ? v : null));
  };
  const put = it => { // equipItem과 같은 부위 규칙, 알림 없이 빈 슬롯부터 채움
    const part = ITEM_PART.get(it.name);
    if (!part) return false;
    let sid = null;
    if (PARTS.HELMETS.includes(part)) sid = 'helmet';
    else if (PARTS.CHESTS.includes(part) || part === '특수 갑옷') sid = 'chest';
    else if (part === '목걸이') sid = 'neck';
    else if (PARTS.GLOVES.includes(part)) sid = 'glove';
    else if (part === '벨트') sid = 'belt';
    else if (PARTS.BOOTS.includes(part)) sid = 'boots';
    else if (RING_PARTS.includes(part)) sid = !slots['ring1'] ? 'ring1' : 'ring2';
    else if (PARTS.SHIELDS.includes(part)) sid = 'weapon2';
    else if (PARTS.TWO_HAND.includes(part)) sid = 'weapon1';
    else if (PARTS.ONE_HAND.includes(part)) sid = !slots['weapon1'] ? 'weapon1' : 'weapon2';
    if (!sid || slots[sid]) return false;
    slots[sid] = {kind: 'item', name: it.name, part, snap: it};
    return sid;
  };
  // 부여 오라(고독한 자의 부츠) 자동 선택 — 스킬 캐시에 남은 인스턴스로 판별
  const guessGaura = pool => {
    const cache = r.skCache || [];
    if (!cache.length) return null;
    const worn = new Set(); // 패시브로 직접 장착한 오라는 부여 오라가 아니다
    Object.values(r.skills || {}).forEach(id => { if (id) worn.add(String(id)); });
    const hit = pool.filter(nm => {
      const i = findSkill({name: nm, kind: '패시브'});
      if (i < 0) return false;
      const ids = [SKILLS[i].gid, ...(SKILLS[i].gids || [])].filter(Boolean).map(String);
      return ids.some(g => cache.indexOf(g) >= 0 && !worn.has(g));
    });
    return hit.length === 1 ? hit[0] : null; // 여럿이면 어느 쪽인지 알 수 없다
  };
  const gearList = Object.values(r.gear);
  gearList.forEach(g => { // 레전드 먼저 — 부위가 확실한 것이 슬롯을 선점
    if (!g.uniqId) return;
    const nm = LOGMAP.eq[g.uniqId];
    if (!nm) { missNames.add('장비 ID ' + g.uniqId); return; }
    const it = ITEMS.find(x => x.name === nm);
    if (!it) { missNames.add(nm); return; }
    const sid = put(it);
    if (sid) {
      const rv = rolledValsOf(it, g.affix); // 로그가 준 실제 굴림값 (문구는 그릴 때 조합한다)
      if (rv) slots[sid].rolled = rv;
      // 침식 강화 자동 판정 — 같은 옵션의 기본/침식은 어픽스 ID 끝자리만 다르다
      // (용솟음치는 영감 충전 옵션: 기본 52420821 · 침식 52420820). 로그 ID가 그 옵션의
      // 침식 ID와 같으면 침식된 것이다. ID로 직접 맞히므로 순서 가정이 필요 없다
      if (it.corr && g.affix) {
        const ids = new Set(['basic', 'main', 'sub', 'chip', 'ench', 'awk']
          .flatMap(k => g.affix[k] || []).map(String));
        const ero = [];
        it.corr.forEach((c, ci) => { if (c && ids.has(String(c[0]))) ero.push(ci); });
        if (ero.length) slots[sid].ero = ero;
      }
      // "<랜덤 …>" 자리는 로그 어픽스로 실제 옵션을 복원한다 (풀은 '랜덤 풀' 행으로 데이터에 있다).
      // 어픽스에는 기본 속성 등 옵션 밖의 것도 섞여 개수가 안 맞는다 — 풀 행으로 찾히는 것만
      // 골라 랜덤 자리 순서대로 배정한다 (15번 실측: 목걸이 basic에 "추가 저주" 어픽스 동반)
      if (g.affix) {
        const ids = [...(g.affix.basic || []), ...(g.affix.main || []), ...(g.affix.sub || [])];
        const vals = [...((g.affix.args || {}).basic || []), ...((g.affix.args || {}).main || []), ...((g.affix.args || {}).sub || [])];
        const optsT = it.opts_t || it.opts || [];
        const randIdx = [];
        optsT.forEach((t, i) => { if (String(t).indexOf('<랜덤') >= 0) randIdx.push(i); });
        const rand = {};
        if (randIdx.length) {
          const pool = [];
          ids.forEach((aid, i) => {
            const row = resolveAffix(aid);
            if (row && row.type === '랜덤 풀') pool.push(applyRollText(row.effect, vals[i]));
          });
          randIdx.forEach((oi, k) => { if (pool[k] != null) rand[oi] = pool[k]; });
          if (!pool.length) missNames.add(it.name + ' 랜덤 옵션');
        }
        // 랜덤이 아닌 자리도 어픽스 문구가 데이터 문구와 일치하면 실측값으로 고정한다
        // ("모든 속성 +(6–10)%" → 로그 DynArgs 7 → "+7%" — rolledValsOf가 개수 불일치로 못 쓰는 아이템용)
        const norm = t => String(t || '').replace(/[–—−~]/g, '-').replace(/\s+/g, ' ').trim();
        ids.forEach((aid, i) => {
          const row = resolveAffix(aid);
          if (!row || row.type === '랜덤 풀' || !(vals[i] || []).length) return;
          const oi = optsT.findIndex((t, j) => rand[j] == null && String(t).indexOf('<랜덤') < 0 && norm(t) === norm(row.effect));
          if (oi >= 0) rand[oi] = applyRollText(row.effect, vals[i]);
        });
        if (Object.keys(rand).length) slots[sid].rand = rand;
      }
      // 랜덤 아우라를 주는 장비면 종류를 골라 둔다 — 복원된 랜덤 문구에 오라가 명시돼 있으면
      // 그것("20 레벨 정밀 주술 증폭을 보유한다"), 없으면 스킬 캐시 추측 (확실할 때만)
      const pool = Object.entries(RAND_AURA_POOLS).find(([k]) =>
        (it.opts_t || it.opts || []).some(o => String(o).indexOf(k) >= 0));
      if (pool) {
        const fromRand = Object.values(slots[sid].rand || {})
          .map(t => /레벨의? ([가-힣 ]+?)[을를]? 보유/.exec(plainText(String(t)))).filter(Boolean)
          .map(m2 => m2[1].trim()).find(n => pool[1].includes(n));
        const pick = fromRand || guessGaura(pool[1]);
        if (pick) slots[sid].gaura = pick;
      }
      eqCnt++;
      // 침식 강화 복원: 침식된 옵션은 로그 어픽스가 침식 변형 ID(corr mid, 끝자리 0)로 실려 온다
      // (실로그 검증: 유령의 학살 = 기본 3개 + corr 변형 2개, Corrode 플래그는 아이템 단위라 판별에 안 씀)
      if (g.affix && it.corr) {
        const all = [...g.affix.basic, ...g.affix.main, ...g.affix.sub];
        const ero = [];
        it.corr.forEach((c, i) => { if (c[0] && all.includes(String(c[0]))) ero.push(i); });
        if (ero.length) slots[sid].ero = ero.slice(0, 2);
      }
    }
  });
  // 착용 페이지 슬롯 번호 → 빌드 슬롯 (실로그으로 확인한 게임 배치)
  const LOGSLOT = {1: 'helmet', 2: 'weapon1', 3: 'weapon2', 4: 'chest', 5: 'neck',
                   6: 'ring1', 7: 'ring2', 8: 'belt', 9: 'glove', 10: 'boots'};
  let bloodCnt = 0;
  Object.keys(r.gear).forEach(slotNo => { // 블러드 장비: 어픽스가 블러드 풀에 걸리는 것
    const g = r.gear[slotNo];
    if (g.uniqId || !g.affix) return;
    const all = [...g.affix.basic, ...g.affix.main, ...g.affix.sub];
    if (!all.some(aid => BLOODIDX.idx[aid])) return;
    // 어픽스와 같은 순서로 실제 굴림값을 이어 붙인다 (파서가 카테고리별로 담아 둔 것)
    const allArgs = g.affix.args
      ? [...(g.affix.args.basic || []), ...(g.affix.args.main || []), ...(g.affix.args.sub || [])] : [];
    const opts = {blood: [], base: [], extra: []};
    let aberrant = false;
    all.forEach((aid, ai) => {
      const args = allArgs[ai];
      const b = BLOODIDX.idx[aid];
      if (b) {
        const part = BLOODP[b[0]];
        if (!part) return;
        aberrant = aberrant || !!part.aberrant;
        if (b[1] === 'b' && opts.base.length < 2) {
          const eff = applyArgs(part.basic[b[2]], args);
          const o = {effect: eff, source: part.part, type: '기본 옵션', aid};
          if (eff !== part.basic[b[2]]) o.rolled = 1;
          opts.base.push(o);
        } else if (b[1] === 'o' && opts.extra.length < 5) { // 상한은 레전드 개수 확정 후 아래에서 재적용
          const o = part.opts[b[2]];
          const tiers = {};
          if (o.t0) tiers.t0 = o.t0;
          if (o.t0p) tiers.t0p = o.t0p; // 침식(T0+) 수치
          if (o.t2) tiers.t2 = o.t2;
          const eff = applyArgs(o.effect, args);
          const e = {effect: eff, source: part.part, type: o.type, tiers, aid};
          if (eff !== o.effect) e.rolled = 1;
          opts.extra.push(e);
        }
        return;
      }
      const row = resolveAffix(aid); // 블러드 풀 밖 = 레전드 추출 옵션 (세트명 type)
      if (row && opts.blood.length < 2) {
        const eff = applyArgs(row.effect, args);
        const o = {k: rowKey(row), effect: eff, source: row.source, type: row.type, aid};
        if (eff !== row.effect) o.rolled = 1;
        opts.blood.push(o);
      }
    });
    if (!opts.blood.length && !opts.extra.length) return;
    let sid = LOGSLOT[slotNo];
    // 레전드가 부위 기준으로 먼저 자리를 잡아 반지 슬롯이 밀릴 수 있다 — 반대쪽 반지로 폴백 (리스틸 실측)
    if (sid && slots[sid] && (sid === 'ring1' || sid === 'ring2')) sid = sid === 'ring1' ? 'ring2' : 'ring1';
    if (!sid || slots[sid] || bloodCnt) return; // 블러드는 빌드당 1개
    // 레전드 추출 개수 확정 후 추가 옵션 상한 재적용 (레전드 1개면 5개, 2개면 4개)
    if (opts.extra.length > bloodExtraCap(opts.blood.length)) opts.extra = opts.extra.slice(0, bloodExtraCap(opts.blood.length));
    slots[sid] = {kind: 'blood', part: bloodPartName(sid), aberrant, name: '', opts};
    if (BASEIDX[g.baseId]) slots[sid].base = String(g.baseId); // 베이스 수치 (이름은 블러드 표기 유지)
    bloodCnt++;
    g.blooded = true; // 아래 제작 장비 처리에서 제외
  });
  gearList.forEach(g => { // 제작 장비: 어픽스 → 옵션 행 (기본/메인/서브)
    if (g.uniqId || g.blooded) return;
    if (!g.affix) { baseCnt++; return; }
    const lim = {basic: 2, main: 3, sub: 3};
    const opts = {basic: [], main: [], sub: []};
    let total = 0, ok = 0;
    ['basic', 'main', 'sub'].forEach(cat => {
      g.affix[cat].forEach((aid, ai) => {
        total++;
        const row = resolveAffix(aid);
        if (!row) return;
        ok++;
        if (opts[cat].length >= lim[cat]) return;
        const args = g.affix.args && g.affix.args[cat] ? g.affix.args[cat][ai] : null;
        const eff = applyArgs(row.effect, args);
        // 실제값을 넣었으면 rowKey(원문 기준)와 문구가 갈리므로 표시용 문구를 따로 둔다
        const o = {k: rowKey(row), effect: eff, source: row.source, type: row.type, aid};
        if (eff !== row.effect) o.rolled = 1;
        opts[cat].push(o);
      });
    });
    // 절반도 해석 안 되면 우리 데이터 밖 장비(핵심 기관 등) — 부위 오판 위험이 있어 제외
    if (!ok || ok * 2 < total) { baseCnt++; return; }
    const first = opts.basic[0] || opts.main[0] || opts.sub[0];
    const part = first.source;
    let sid = null; // 제작 장비 부위 → 슬롯 (endBuild와 동일하게 source가 곧 부위)
    if (PARTS.HELMETS.includes(part)) sid = 'helmet';
    else if (PARTS.CHESTS.includes(part)) sid = 'chest';
    else if (part === '목걸이') sid = 'neck';
    else if (PARTS.GLOVES.includes(part)) sid = 'glove';
    else if (part === '벨트') sid = 'belt';
    else if (PARTS.BOOTS.includes(part)) sid = 'boots';
    else if (RING_PARTS.includes(part)) sid = !slots['ring1'] ? 'ring1' : 'ring2';
    else if (PARTS.SHIELDS.includes(part)) sid = 'weapon2';
    else if (PARTS.TWO_HAND.includes(part)) sid = 'weapon1';
    else if (PARTS.ONE_HAND.includes(part)) sid = !slots['weapon1'] ? 'weapon1' : 'weapon2';
    if (!sid || slots[sid]) { baseCnt++; return; }
    slots[sid] = {kind: 'custom', part, name: '', opts};
    // 베이스(기본) 아이템 — BaseId가 곧 tlidb 베이스 id (아머·회피·보호막 등 베이스 수치의 출처)
    const bi = BASEIDX[g.baseId];
    if (bi) { slots[sid].base = String(g.baseId); slots[sid].name = bi.name; }
    craftCnt++;
  });
  // 조향: 벨트의 EnchantAffixs → 조향 행 (벨트 슬롯이 채워진 경우에만)
  let blendCnt = 0;
  {
    const g = r.gear[8]; // 착용 슬롯 8 = 벨트
    if (g && g.affix && g.affix.ench && g.affix.ench.length && slots['belt']) {
      const bl = BLENDS.find(b => b.mid && g.affix.ench.includes(String(b.mid)));
      if (bl) { slots['belt'].blend = {effect: bl.effect, req: bl.req || ''}; blendCnt++; }
    }
  }
  // 타워 시퀀스: 무기의 ChipAffix → 시퀀스 행 (장착된 무기 슬롯에만, 장비 종류 무관)
  let seqCnt = 0;
  Object.keys(r.gear).forEach(slotNo => {
    const g = r.gear[slotNo];
    const sid = ({2: 'weapon1', 3: 'weapon2'})[slotNo];
    if (!sid || !slots[sid] || !g.affix || !g.affix.chip || !g.affix.chip.length) return;
    const row = resolveAffix(g.affix.chip[0]);
    if (!row || !row.type.includes('시퀀스')) return;
    // TOWERS에서 같은 옵션을 찾아 시퀀스 슬롯 표기(예: "중급 시퀀스 1|2|6")까지 복원, 없으면 등급만
    const tw = TOWERS.find(t => t.effect === row.effect && (!t.source || t.source === row.source));
    slots[sid].tower = {effect: row.effect, seq: (tw && tw.seq) || row.type};
    seqCnt++;
  });
  // 추억: BaseAttrAffix→기본 속성 / BaseAffix→고유(≤2) / Suffix→랜덤(≤2)
  const MEMBASE = {71001: '근원의 추억', 71002: '자기 수호의 추억', 71003: '진격의 추억'};
  // 기본 속성의 로그 ID(403 대역)는 tlidb에 없다 — 4031 + 옵션코드(2자리) + 성장단계.
  // 옵션코드는 부위별 5종씩, craft mid 순서와 정합 (12번 로그 인게임 대조로 확정: 03=지혜·06=HP·13=이속)
  const BATTR_MID = {
    '01': '402150101', '02': '402150201', '03': '402150301', '04': '402162601', '05': '402162701', // 근원
    '06': '402150401', '07': '402150501', '08': '402150601', '09': '402150701', '10': '402150801', // 자기 수호
    '11': '402150901', '12': '402151001', '13': '402151101', '14': '402162801', '15': '402162901', // 진격
  };
  const memsOut = {};
  const memGradeOut = {};
  let memCnt = 0, memOptCnt = 0, revivalOut = null;
  Object.keys(r.mems || {}).forEach(base => {
    const part = MEMBASE[base];
    if (!part) return;
    const a = r.mems[base];
    // 고유·랜덤도 로그 실측값(DynArgs)으로 — 데이터 문구는 범위(+(44-52)%)라 계산이 뭉개진다
    const sec = (ids, max, argKey) => ids.map((aid, i) => {
      const row = resolveAffix(aid);
      if (!row) return null;
      const o = {k: rowKey(row), effect: row.effect, source: row.source, type: row.type};
      const vals = (a.args && a.args[argKey] || [])[i];
      if (vals && vals.length) o.v = vals;
      return o;
    }).filter(Boolean).slice(0, max);
    // 기본 속성: 종류는 옵션코드로, 수치는 로그의 실제 값(성장 중이면 만렙 문구와 다르다)으로
    const basic = (a.battr || []).slice(0, 1).map((aid, i) => {
      const row = resolveAffix(BATTR_MID[String(aid).slice(4, 6)] || '');
      if (!row) { missNames.add('추억 기본 속성 ' + aid); return null; }
      const o = {k: rowKey(row), effect: row.effect, source: row.source, type: row.type};
      const vals = (a.args && a.args.battr || [])[i];
      if (vals && vals.length) o.v = vals; // 로그 실측값 — 표시할 때 문구 수치에 끼운다
      return o;
    }).filter(Boolean);
    const mm = {basic, unique: sec(a.basic, 2, 'basic'), random: sec(a.sub, 2, 'sub')};
    if (mm.basic.length + mm.unique.length + mm.random.length) { memsOut[part] = mm; memCnt++; memOptCnt += mm.basic.length + mm.unique.length + mm.random.length; }
    // 추억 등급 → 히어로 특성 레벨 기준. 인게임 대조 확정: RareValue 5 = 절대(11번 로그) · 4 = 엘리트(12번 로그).
    // 3=레어·2=매직·1=일반은 체계상 추정 — 실측 로그가 생기면 보정한다
    if (a.rare) memGradeOut[part] = a.rare >= 5 ? 'abs' : a.rare === 4 ? 'elite' : a.rare === 3 ? 'rare' : a.rare === 2 ? 'magic' : 'normal';
    // 부활 옵션 (AwakenAffix — 부활 완료된 추억, 빌드당 1개)
    if (!revivalOut) {
      const rv = (a.awk || []).map(x => RVMID.get(String(x))).filter(Boolean)[0];
      if (rv) revivalOut = {part, effect: rv.effect, group: rv.group};
    }
  });
  // 석판: 장착 석판이 부여하는 재능 노드 → 석판 옵션 행 (같은 노드 여러 장이면 ×N)
  // r.slates(인스턴스별 상세)가 있으면 출처 아이템명(src)과 보드 배치(slateBd)까지 복원,
  // 없으면(외부 연동 구 페이로드 등) 기존 평탄화 노드 목록(slateTal)으로 동작
  const talents = [];
  const talSeen = new Map(); // rowKey → talents 인덱스
  const addSlateNode = (nid, src, mul) => {
    const i = SLATEIDX.idx[nid];
    if (i === undefined) { missNames.add('석판 노드 ' + nid); return; }
    const row = ALL_DATA[i];
    const k = rowKey(row);
    const sk = k + (mul && mul !== 1 ? '@' + mul : ''); // 전염 등 배율이 다른 옵션은 따로 센다
    if (talSeen.has(sk)) {
      const t = talents[talSeen.get(sk)];
      t.cnt = (t.cnt || 1) + 1;
      if (src && t.src && t.src.indexOf(src) < 0) t.src.push(src);
      return;
    }
    talSeen.set(sk, talents.length);
    const t = {k, effect: row.effect, type: talentLabel(row)};
    if (mul && mul !== 1) t.mul = mul;
    if (src) t.src = [src];
    talents.push(t);
  };
  let slateBd = null;
  if ((r.slates || []).length) {
    slateBd = r.slates.slice(0, 12).map(s => ({u: s.uniq || s.base, i: s.idx, d: s.dir || 0, f: s.inf || 0, sh: s.shape || 0, t: (s.nodes || []).slice(0, 8)}));
    slateBd.forEach(s => { if (!SLATES[s.u]) missNames.add('석판 #' + s.u); }); // 미지원 석판 — keeper 크라우드소싱
    // 신격 변형은 로그의 ShapeId가 정답 — 매핑된 것은 추측 없이 바로 확정 (미매핑 ShapeId는 수집해 보정으로)
    slateBd.forEach(s => {
      const info = SLATES[s.u] || {};
      if (!info.god || !s.sh) return;
      const v = GOD_SHAPE_IDS[s.sh];
      const gBase = Math.floor((s.u - 1) / 100) * 100;
      if (v && SLATES[gBase + v]) s.u = gBase + v;
      else if (!v && s.sh >= 1000 && s.sh < 2000) missNames.add('신격 모양 ShapeId ' + s.sh); // 실측 수집용
    });
    // 방향 자동 보정: 명왕 심판 등은 로그에 Direction이 아예 없음(실측) — 현재 방향이 보드 밖·겹침이면
    // 들어가는 회전을 재탐색 (리한2·리스틸 실보드에서 유일해로 검증, 유효한 배치는 건드리지 않음)
    // 보정은 순서 의존적이라(뒤 피스가 아직 raw 상태로 자리를 차지) 여러 번 돌린다 — 리스틸 실측:
    // 일각을 검사할 때 아직 보정 전인 신격이 그 칸을 점유해 실패 처리되던 문제
    // 큰 피스부터 자리를 맞춘다 — 작은 피스가 먼저 "유효"해져 큰 피스의 자리를 막는 것 방지
    // (15번 실측: 2칸 석판이 기만 신격(4칸)의 원점 칸을 선점해 신격이 영영 못 들어가던 문제)
    const order = slateBd.map((s, pi) => pi)
      .sort((a, b) => ((SLATES[slateBd[b].u] || {}).c || []).length - ((SLATES[slateBd[a].u] || {}).c || []).length);
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      const anyFail = slateBd.some((s, pi) => s.o1 || !sbCellsFree(slateBd, slateCells(s.u, s.i, s.d), pi));
      order.forEach(pi => {
        const s = slateBd[pi];
        delete s.o1; // 이전 패스의 실패 표시는 재시도
        // 겹침이 남아 있으면 유효해 보이는 피스도 다시 맞춘다 (상호 자리 다툼 해소)
        if (!anyFail && sbCellsFree(slateBd, slateCells(s.u, s.i, s.d), pi)) return;
        if (sbCellsFree(slateBd, slateCells(s.u, s.i, s.d), pi)) return; // 이번 순회에서 이미 유효
        const d = sbFitDir(slateBd, s.u, s.i, s.d, pi);
        if (d >= 0) { s.d = d; changed = true; return; }
        // 신격의 석판은 같은 신도 모양이 6가지 — 로그에 모양·방향이 없는 경우(덤프 이후 장착)엔
        // 그 신의 다른 모양 중 보드에 들어가는 것을 찾아 쓴다 (모양 추정: 점선 표시)
        // 신격 전용 — 레전드 석판(1001~)에 적용하면 백번대가 같은 다른 석판으로 바꿔치기된다 (리스틸 실측)
        if ((SLATES[s.u] || {}).god) {
          const gBase = Math.floor((s.u - 1) / 100) * 100;
          for (let v = 1; v <= 6; v++) {
            const u2 = gBase + v;
            if (u2 === s.u || !SLATES[u2]) continue;
            const d2 = sbFitDir(slateBd, u2, s.i, 0, pi);
            if (d2 >= 0) { s.u = u2; s.d = d2; changed = true; return; }
          }
        }
        s.o1 = 1; // 어떤 모양·회전도 안 맞음 → 원점 칸만 표시 (보드가 깨지는 것보다 낫다)
      });
      if (!changed) break;
    }
    addSlateTalentRows(slateBd, addSlateNode);
  } else {
    (r.slateTal || []).forEach(nid => addSlateNode(nid, null));
  }
  // 재능 트리: 배치된 핵심 재능(bonusGeniusInfo) → 재능 행 (핵심 재능 패널, 게임상 최대 5)
  // 재능 보드: [노드ID, 포인트, 행, 열, 플래그(1=역상 반사, 2=영향 범위)]
  // 역상은 원래 자리가 아닌 칸에 노드를 반사시키므로 위치를 로그에서 그대로 받아야 한다.
  // 위치 정보가 없는 구 페이로드는 [노드ID, 포인트]만 (렌더에서 계열 기본 배치로 표시)
  const gN = ((r.genius || {}).nodes) || [];
  const boardOut = gN.length
    ? gN.filter(x => x && String(x.g).length === 8 && BOARDS[String(x.g).slice(0, 2)] && (x.p > 0 || x.m))
        .map(x => [String(x.g), Math.max(0, Math.min(9, +x.p || 0)), +x.r || 0, +x.c || 0, (x.m ? 1 : 0) | (x.a ? 2 : 0) | (x.f ? 4 : 0)])
    : (((r.genius || {}).picked) || [])
        .filter(x => Array.isArray(x) && String(x[0]).length === 8 && BOARDS[String(x[0]).slice(0, 2)])
        .map(x => [String(x[0]), Math.max(1, Math.min(9, +x[1] || 1))]);
  const boardPt = boardOut.reduce((s, x) => s + x[1], 0);
  // 프리즘·역상 영향 범위 — 재능 보드에 영역 표시용.
  // 둘이 함께 있으면 prismInfo가 여러 개다 (15번 실측: 프리즘 360503 장군 + 역상 360701 철의 개척자).
  // 보드는 장착 노드(geniusId)의 앞 2자리가 정답이고, 영역은 계열(careerId)이 일치하는 것을 잇는다 —
  // prismInfo와 영역 목록의 등장 순서는 덤프마다 달라 순서로 짝지으면 어긋난다.
  const areas = (r.prismAreas || []).filter(a => a.b && (a.c || []).length);
  const areaOf = b => { const a = areas.find(x => String(x.b) === String(b)); return a ? a.c.map(p => [+p[0], +p[1]]) : []; };
  const prList = (r.prisms && r.prisms.length ? r.prisms : (r.prism ? [r.prism] : [])).filter(x => x && (x.node || x.board));
  const seenPB = new Set();
  const gbPrisms = [];
  prList.forEach(x => {
    const b = String(x.node || '').slice(0, 2) || x.board;
    if (!BOARDS[b] || seenPB.has(b + ':' + x.base)) return; // 같은 덤프 반복 제거
    seenPB.add(b + ':' + x.base);
    const c = areaOf(b);
    const ent = {b, c: c.length ? c : (x.pos || []).map(p => [+p[0], +p[1]]), nd: x.node || '',
      k: /^3607/.test(String(x.base || '')) ? 'i' : 'p'};
    if (ent.k === 'i' && x.fx) {
      // 반사 후 재능 효과 % — 1224626031=하위 · 1224626011=중위 · 1224626051=레전드 중위 (15번 실측: -100/+82/-100)
      const IVID = {'1224626031': 'low', '1224626011': 'mid', '1224626051': 'leg'};
      const iv = {};
      Object.entries(x.fx).forEach(([aid, v]) => { if (IVID[aid]) iv[IVID[aid]] = v; });
      if (Object.keys(iv).length) ent.iv = iv;
    }
    gbPrisms.push(ent);
  });
  // 프리즘 아이템이 로그에 없어도 영역만 있으면 범위는 그린다
  if (!gbPrisms.length) {
    areas.forEach(a => { if (BOARDS[a.b]) gbPrisms.push({b: String(a.b), c: a.c.map(p => [+p[0], +p[1]]), nd: '', k: 'p'}); });
    const ar0 = r.prismArea || {};
    if (!gbPrisms.length && ar0.b && BOARDS[ar0.b] && (ar0.c || []).length) {
      gbPrisms.push({b: ar0.b, c: ar0.c.map(p => [+p[0], +p[1]]), nd: '', k: 'p'});
    }
  }
  const gbPrism = gbPrisms[0] || null; // 아래 유지·저장 로직용
  let coreCnt = 0;
  (((r.genius || {}).core) || []).forEach(gid => {
    const i = TALIDX.idx[gid];
    if (i === undefined) { missNames.add('핵심 재능 ' + gid); return; }
    const row = ALL_DATA[i];
    const k = rowKey(row);
    if (talSeen.has(k)) return;
    talSeen.set(k, talents.length);
    talents.push({k, effect: row.effect, type: talentLabel(row)});
    coreCnt++;
  });
  // 운명: 휠에 소켓된 천명·숙명 (같은 숙명 여러 개면 ×N)
  let dstCnt = 0;
  (r.dst || []).forEach(d => {
    const did = Array.isArray(d) ? d[0] : d;      // [BaseId, 실제 굴림값] — 구버전 페이로드는 BaseId만
    const args = Array.isArray(d) ? d[1] : null;
    const i = DSTIDX.idx[did];
    if (i === undefined) { missNames.add('운명 ' + did); return; }
    const row = ALL_DATA[i];
    const eff = applyArgs(row.effect, args);
    const k = rowKey(row);
    const seenKey = k + (eff !== row.effect ? OPT_SEP + eff : ''); // 값이 다르면 다른 줄
    if (talSeen.has(seenKey)) {
      const t = talents[talSeen.get(seenKey)];
      t.cnt = (t.cnt || 1) + 1;
      return;
    }
    talSeen.set(seenKey, talents.length);
    const t = {k, effect: eff, type: talentLabel(row)};
    if (eff !== row.effect) t.rolled = 1;
    talents.push(t);
    dstCnt++;
  });
  // 프리즘: 종류(BaseId)+옵션 3칸(affixId) 복원, 장착 칸 = 꽂힌 재능 보드(geniusId 앞 2자리)와
  // 같은 보드 핵심 재능의 순번 (게임 규칙상 3~5 — 벗어나면 3으로 두고 안내)
  let prismOut = null;
  // 역상과 함께 있으면 prismInfo가 여럿이다 — 프리즘(3607xx 아닌 것)을 골라 복원한다
  const prItem = prList.find(x => x.base && !/^3607/.test(String(x.base))) || (r.prism && r.prism.base && !/^3607/.test(String(r.prism.base)) ? r.prism : null);
  if (prItem) {
    const pi = PRISMIDX.item[prItem.base];
    if (pi === undefined) missNames.add('프리즘 ' + prItem.base);
    else {
      const it = PRISM.items[pi];
      const popts = (prItem.slots || []).slice(0, 3).map(aid => {
        if (!aid) return null;
        const oi = PRISMIDX.idx[aid];
        if (oi === undefined) { missNames.add('프리즘 옵션 ' + aid); return null; }
        return {effect: PRISM.opts[oi].effect, type: PRISM.opts[oi].type};
      });
      const pb = String(prItem.node || '').slice(0, 2) || prItem.board;
      let pos = (((r.genius || {}).core) || []).findIndex(g => String(g).slice(0, 2) === pb) + 1;
      if (pos < 3 || pos > 5) pos = 3;
      prismOut = {pos, name: it.name, opts: popts, snap: JSON.parse(JSON.stringify(it))};
    }
  }
  // 저장 순서도 핵심 > 레전드 중위·절대자 > 중위 > 하위로 (내보내기·공유에서도 같은 순서가 되게)
  // 운명끼리는 게임 화면과 같은 순서로 (미정 → 이중 천명 → 천명 → 중위 → 하위)
  talents.sort((a, b) => slateRank(a) - slateRank(b) ||
    (talGroup(a.type) === 2 && talGroup(b.type) === 2 ? dstRank(a) - dstRank(b) : 0));
  // 히어로: HeroId 매핑 + HeroPurchaseId 끝자리 = 특성 번호
  let hero = null, heroNote = '';
  if (r.heroId) {
    const hn = (LOGMAP.hero || {})[r.heroId];
    if (hn) {
      const entry = SHARE_HEROES.find(x => x[0] === hn);
      const ti = r.heroPur ? parseInt(String(r.heroPur).slice(-1), 10) : 0;
      const tr = entry && entry[1][ti - 1];
      if (tr) hero = {hero: hn, trait: tr[0]}; // 축약형(리한2) — 수동 선택과 표기 통일
      else heroNote = '히어로 ' + hn + '의 특성 번호를 알 수 없어 히어로는 직접 선택해주세요';
    } else {
      heroNote = '이 캐릭터의 히어로는 아직 자동 설정을 지원하지 않아요 — 빌드에서 직접 선택해주세요';
    }
  }
  // 히어로 특성 노드: activeId 마지막 두 자리(단계·순번)를 우리 노드에 잇는다
  let heroNodesOut = null;
  if (hero && (r.heroTraits || []).length) {
    const ti = traitInfo(hero.trait);
    const td = HERO.find(x => x.trait === (ti ? ti.full : hero.trait));
    if (td) {
      heroNodesOut = {};
      r.heroTraits.forEach(id => {
        const two = parseInt(id, 10) % 100, st = Math.floor(two / 10), ord = two % 10;
        // 갈래 특성은 끝 두 자리가 (갈래·깊이)라 노드 code 와 그대로 맞춘다 (셀레나 1710012 = 1갈래 2번째)
        const n = (td.nodes || []).find(x => td.tree ? x.code === two : x.step === st && x.ord === ord);
        if (n && td.tree) { if (n.step) heroNodesOut[n.code] = n.name; }
        else if (n) heroNodesOut[st] = n.name;
        else missNames.add('히어로 특성 노드 ' + id);
      });
      if (!Object.keys(heroNodesOut).length) heroNodesOut = null;
    }
  }
  // 정령: areaId 1~3(전투)의 servantId를 한글명으로 잇고, 노드판에서 활성 노드를 복원한다
  // (selectContract 2 = 운명으로 교체된 자리 — 노드 효과가 아니라 운명이 걸리므로 켜지 않는다.
  //  그 운명 자체는 tattoInfo로 이미 운명 목록에 들어온다)
  let pactsOut = null, pactMiss = [];
  if (Object.keys(r.pactEq || {}).length) {
    pactsOut = [null, null, null];
// 로그의 자리 번호(1~10)를 tlidb 데이터의 자리 번호로 옮긴다.
  // 게임은 노드를 1~10으로 세는데(정령당 10개), tlidb는 고리별로 번호를 나눈다:
  //   내환 1~6 · 중환 21~23 · 외환 31 · 미정 40 · 운명 41~45 (수집한 111종 전부 같은 체계)
  // 이 변환이 없어 중환(7~9)·외환(10) 노드가 통째로 버려지고 있었다 (14번 이터널 키퍼 자리 10)
  function pactSlotPos(n) {
    if (n >= 1 && n <= 6) return n;      // 내환
    if (n >= 7 && n <= 9) return 20 + (n - 6); // 중환 21~23
    if (n === 10) return 31;             // 외환
    return 40 + (n - 11);                // 미정·운명 (계산에서는 건너뛴다)
  }
    [1, 2, 3].forEach(a => {
      const sid = r.pactEq[a];
      if (!sid) return;
      const ko = SERVANT_KO[sid];
      if (!ko) { pactMiss.push(sid); return; }
      const nodes = {}, dsts = {};
      Object.keys(r.pactNodes || {}).forEach(cp => {
        if (Math.floor(+cp / 100) !== a) return;
        const pos = pactSlotPos(+cp % 100);
        // 1 = 정령 노드 그대로 활성, 2 = 그 자리에 운명(숙명)을 끼워 노드 효과를 대체한다.
        // 운명 자체 효과는 별도 목록(dst)으로 합산하므로, 여기서는 "그 자리 노드는 안 쓴다"만 기록한다
        if (r.pactNodes[cp] === 1) nodes[pos] = 1;
        else if (r.pactNodes[cp] === 2) dsts[pos] = 1;
      });
      // 승급 = ServantInfos.starLevel + 1 (14번 실측: 이터널 키퍼 star5 = 인게임 승급 6).
      // 예전에 "starLevel은 승급이 아니다"로 판단했던 건 파서가 키 순서(starLevel이 servantId보다
      // 먼저 오는 덤프)를 못 맞춰 0으로 읽었기 때문. 목록은 덤프당 30개씩이라 없는 정령도 많다 —
      // 그런 정령은 adv를 비워 두고 정령 줄에서 수동 선택하게 한다
      const st = (r.svStars || {})[sid];
      pactsOut[a - 1] = {name: ko, nodes};
      if (Object.keys(dsts).length) pactsOut[a - 1].dsts = dsts; // 운명이 꽂힌 자리
      if (st !== undefined) pactsOut[a - 1].adv = st + 1;
    });
    if (!pactsOut.some(Boolean)) pactsOut = null;
  }
  if (!mainCnt && !supCnt && !eqCnt && !craftCnt && !bloodCnt && !memCnt && !talents.length && !prismOut) {
    if (liSrc) sendLiStat({lf: 1});
    alert('로그에서 착용 정보를 찾지 못했습니다.\n게임 설정에서 [로그 오픈]을 켠 뒤 캐릭터를 다시 로그인하고,\n그 이후의 UE_game.log 파일을 선택해주세요.');
    return;
  }
  const nm = ('로그: ' + (r.charName || '가져오기')).slice(0, 30);
  const dstSum = a => a.reduce((s, t) => s + (t.cnt || 1), 0);
  const finish = (dst, keepOldDst) => {
    let p;
    const kept = []; // 덮어쓰기 때 이번 로그에 없어 기존 값을 유지한 섹션 (알림에 표기)
    if (dst) { // 같은 이름 빌드 덮어쓰기 — id·메모만 유지, 나머지는 최신 로그로 교체 (로그에 없는 섹션은 기존 유지)
      const old = {talents: dst.talents || [], skills: dst.skills || {}, slots: dst.slots || {}, mems: dst.mems || {},
        hero: dst.hero, prism: dst.prism, slateBd: dst.slateBd, revival: dst.revival, inverse: dst.inverse, gboard: dst.gboard,
        heroNodes: dst.heroNodes, heroHerbs: dst.heroHerbs, memGrade: dst.memGrade, pacts: dst.pacts};
      const keep = {id: dst.id, memo: dst.memo};
      Object.keys(dst).forEach(k => delete dst[k]);
      Object.assign(dst, keep, {name: nm, slots, talents, skills, mems: memsOut});
      if (!keep.memo) delete dst.memo;
      p = dst;
      // 그룹(핵심 재능/석판 재능/운명)별: 이번 로그에 하나도 없으면 기존 유지 — 재접속 전 로그엔 안 실리는 경우가 있음
      [0, 1, 2].forEach(g => {
        const oldG = old.talents.filter(t => talGroup(t.type) === g);
        if (!oldG.length) return;
        if (!talents.some(t => talGroup(t.type) === g)) {
          p.talents = p.talents.concat(oldG);
          kept.push(['핵심 재능', '석판 재능', '운명'][g]);
        } else if (g === 2 && keepOldDst) { // 운명 개수 감소 → 사용자가 기존 유지 선택
          p.talents = p.talents.filter(t => talGroup(t.type) !== 2).concat(oldG);
          kept.push('운명(감소 감지, 기존 유지)');
        }
      });
      if (!Object.keys(skills).length && Object.keys(old.skills).length) { p.skills = old.skills; kept.push('스킬'); }
      if (!Object.keys(slots).length && Object.keys(old.slots).length) { p.slots = old.slots; kept.push('장비'); }
      if (!Object.keys(memsOut).length && Object.keys(old.mems).length) { p.mems = old.mems; kept.push('추억'); }
      if (!hero && old.hero) p.hero = old.hero;
      if (!heroNodesOut && old.heroNodes && Object.keys(old.heroNodes).length) { p.heroNodes = old.heroNodes; kept.push('히어로 특성'); }
      if (!pactsOut && old.pacts && old.pacts.some(Boolean)) { p.pacts = old.pacts; kept.push('정령'); }
      if (old.heroHerbs) p.heroHerbs = old.heroHerbs;   // 약재는 로그에 없는 수동 항목 — 항상 유지
      if (old.memGrade) p.memGrade = old.memGrade;      // 로그에서 왔으면 아래에서 덮는다
      if (!prismOut && old.prism) { p.prism = old.prism; kept.push('프리즘'); }
      if (!(slateBd && slateBd.length) && old.slateBd && old.slateBd.length) { p.slateBd = old.slateBd; kept.push('석판 보드'); }
      if (!boardOut.length && old.gboard && old.gboard.length) { p.gboard = old.gboard; kept.push('재능 보드'); }
      if (!gbPrisms.length && old.gbPrism) p.gbPrism = old.gbPrism;
      if (!revivalOut && old.revival) { p.revival = old.revival; kept.push('부활 옵션'); }
      if (old.inverse) p.inverse = old.inverse; // 역상은 로그에 없는 수동 항목 — 항상 유지
    } else {
      p = {id: Math.max(...presets.list.map(x => x.id)) + 1, name: nm, slots, talents, skills, mems: memsOut};
      presets.list.push(p);
    }
    if (hero) p.hero = hero;
    if (heroNodesOut) p.heroNodes = heroNodesOut;
    if (pactsOut) p.pacts = pactsOut;
    if (Object.keys(memGradeOut).length) p.memGrade = Object.assign({}, p.memGrade, memGradeOut);
    if (prismOut) p.prism = prismOut;
    if (slateBd && slateBd.length) p.slateBd = slateBd;
    if (boardOut.length) p.gboard = boardOut;
    if (gbPrisms.length) { p.gbPrism = gbPrisms[0]; if (gbPrisms.length > 1) p.gbPrism2 = gbPrisms[1]; else delete p.gbPrism2; }
    if (revivalOut) p.revival = revivalOut;
    presets.activeId = p.id;
    preset = p;
    persistPreset();
    renderPreset();
  if (liSrc) {
    const firstMain = ['a1', 'a2', 'a3', 'a4', 'a5'].map(sid => skills[sid] && skills[sid].main).find(Boolean);
    // 히어로: 매핑되면 특성 축약형, 미지원이면 #HeroId/HeroPurchaseId — keeper에서 보고 매핑에 추가할 수 있게
    const liHero = (p.hero && p.hero.trait) ||
      (r.heroId && !(LOGMAP.hero || {})[r.heroId] ? '#' + r.heroId + (r.heroPur ? '/' + r.heroPur : '') : '');
    const liBody = {k: liSrc, n: p.name, s: (firstMain && firstMain.name) || '', h: liHero};
    if (liSrc === 'ext' && r.extSrc) liBody.src = r.extSrc; // 어느 앱에서 왔는지 (스펙 src 필드)
    sendLiStat(Object.assign({li: liBody}, missNames.size ? {lm: 1} : {}));
  }
  alert('[' + p.name + '] 빌드로 가져왔습니다.\n' +
    '· 스킬: 메인 ' + mainCnt + '개 + 보조 ' + supCnt + '개\n' +
    '· 레전드 장비: ' + eqCnt + '개 / 제작 장비: ' + craftCnt + '개 / 블러드: ' + bloodCnt + '개' +
    (seqCnt || blendCnt ? '\n· ' + [seqCnt ? '무기 시퀀스 ' + seqCnt + '개' : '', blendCnt ? '벨트 조향' : ''].filter(Boolean).join(' / ') : '') +
    (memCnt ? '\n· 추억: ' + memCnt + '칸 (옵션 ' + memOptCnt + '개)' : '') +
    (Object.keys(memGradeOut).length ? '\n· 추억 등급: ' + Object.values(memGradeOut).map(g => (HERO_GRADES.find(x => x[0] === g) || [])[1]).join(', ') : '') +
    (coreCnt ? '\n· 핵심 재능: ' + coreCnt + '개' : '') +
    (dstCnt ? '\n· 운명: ' + dstCnt + '개' : '') +
    (prismOut ? '\n· 프리즘: ' + prismOut.name + ' (옵션 ' + prismOut.opts.filter(Boolean).length + '개)' : '') +
    (slateBd && slateBd.length ? '\n· 석판: ' + slateBd.length + '장 (보드 배치 포함)' : '') +
    (boardOut.length ? '\n· 재능 보드: ' + boardOut.length + '노드 / ' + boardPt + '포인트' : '') +
    (revivalOut ? '\n· 추억 부활 옵션: ' + revivalOut.effect.slice(0, 20) : '') +
    (talents.length - coreCnt - dstCnt > 0 ? '\n· 석판 재능 노드: ' + (talents.length - coreCnt - dstCnt) + '개' : '') +
    (hero ? '\n· 히어로: ' + hero.hero + ' (' + hero.trait + ')' + (heroNodesOut ? ' — 특성 노드 ' + Object.keys(heroNodesOut).length + '개' : '') : '') +
    (pactsOut ? '\n· 정령: ' + pactsOut.filter(Boolean).map(x => x.name).join(', ') : '') +
    (pactMiss.length ? '\n· 정령 ' + pactMiss.length + '종은 이름을 몰라 건너뜀 (#' + pactMiss.join(', #') + ')' : '') +
    (heroNote ? '\n· ' + heroNote : '') +
    (baseCnt ? '\n· 장비 ' + baseCnt + '개는 옵션을 복원할 수 없어 제외' : '') +
    (missNames.size ? '\n· 데이터에 없어 건너뜀: ' + [...missNames].slice(0, 8).join(', ') : '') +
    (kept.length ? '\n· 이번 로그에 없어 기존 값 유지: ' + kept.join(', ') : '') +
    // 운명·추억은 로그에 빠지거나 다르게 실릴 때가 있다 — 가져온 뒤 사람이 게임 화면과 맞춰 보게 (사용자 2026-10-10)
    ((dstCnt || memCnt) ? '\n\n⚠ 운명·추억은 로그에 빠지거나 다르게 실릴 때가 있습니다 — 게임 화면과 한 번 맞춰 확인해 주세요.' : ''));
  };
  const startOverwrite = dup => { // 운명은 로그에 이상하게 실릴 때가 많음 — 개수가 줄어들면 덮어쓸지 한 번 더 확인
    const oldDst = (dup.talents || []).filter(t => talGroup(t.type) === 2);
    const newDst = talents.filter(t => talGroup(t.type) === 2);
    if (newDst.length && oldDst.length && dstSum(newDst) < dstSum(oldDst)) {
      uiConfirm('운명이 기존 ' + dstSum(oldDst) + '개 → 이번 로그 ' + dstSum(newDst) + '개로 줄어듭니다.\n로그 내용으로 덮어쓸까요?',
        () => finish(dup, false), {title: '운명 개수 감소', ok: '로그로 덮어쓰기', cancel: '기존 운명 유지', onCancel: () => finish(dup, true)});
    } else finish(dup, false);
  };
  const dup = presets.list.find(x => x.name === nm);
  if (dup) { // 같은 캐릭터를 다시 가져온 경우 — 덮어써서 최신화할지 확인 (배경 클릭·ESC = 가져오기 취소)
    uiConfirm('[' + nm + '] 이름의 빌드가 이미 있습니다.\n덮어쓰면 메모만 유지되고 나머지는 이번 로그 내용으로 교체됩니다.\n(이번 로그에 없는 항목은 기존 값이 유지됩니다)',
      () => startOverwrite(dup), {title: '같은 이름 빌드', ok: '덮어쓰기', cancel: '새 빌드 추가', onCancel: () => finish(null)});
  } else finish(null);
}


// ── 빌더 2 빌드 관리 · 로그 가져오기 · 공유 올리기 (2026-10-09) ──
// 로그 해석은 빌더와 같은 02_logimport.js 를 그대로 싣는다 — 여기는 그 파일이 기대하는 바깥 것(색인·데이터·창)을 빌더 2 데이터로 채운다.
// 공유 코드 만들기는 00_codec.js (빌더와 공용). 필요한 데이터(스킬·장비·추억·로그 매핑)는 처음 쓸 때만 받는다.

// 02_logimport · 00_codec 가 이름으로 찾는 색인 — wbInit() 이 채운다 (빌더는 01_core 가 부팅 때 만든다)
const CRAFTIDX = {idx: {}}, BLOODIDX = {idx: {}}, TALIDX = {idx: {}}, DSTIDX = {idx: {}}, PRISMIDX = {idx: {}, item: {}};
const RVMID = new Map(), ITEM_PART = new Map(), BASEIDX = {};
let PRESET_SLOTS = [], BLOOD_SET_PARTS = {};
const SHARE_ONLINE = location.protocol === 'http:' || location.protocol === 'https:';
let wbReady = false;
function bloodPartName(slotId) { return wgDef(slotId).label.replace(/ \d$/, ''); } // '반지 1' → '반지' (빌더 03_editor 와 같음)
function modalHistPush() {}

// 데이터 받기 + 색인 만들기 — 빌더 01_core 와 같은 규칙. 석판 행을 앞자리에 두어 석판 화면의 행 번호(SLATEIDX)가 그대로다
async function wbLoad() {
  await Promise.all(['skill', 'gear', 'mem', 'log'].map(wzLoad));
  if (wbReady) return;
  ALL_DATA = SLATE_DB.concat(GEAR_ROWS, DST_ROWS, TAL_ROWS);
  SLATEIDX = {idx: {}};
  ALL_DATA.forEach((r, i) => {
    (r.nids || []).forEach(n => { SLATEIDX.idx[n] = i; });
    if (r.mid) CRAFTIDX.idx[r.mid] = i;
    if (r.tid) TALIDX.idx[r.tid] = i;
    if (r.did) DSTIDX.idx[r.did] = i;
    KEY_MAP.set(rowKey(r), r); // 공유 코드가 옵션을 짧은 해시로 싣는다 (없으면 문구째)
  });
  SKILLS.forEach(s => { if (s.gid) LOGMAP.sk[s.gid] = s.name; (s.gids || []).forEach(g => { LOGMAP.sk[g] = s.name; }); });
  ITEMS.forEach(it => { if (it.gid) LOGMAP.eq[it.gid] = it.name; });
  BLOODP.forEach((p, pi) => {
    (p.opts || []).forEach((o, oi) => (o.mids || []).forEach(m => { BLOODIDX.idx[m] = [pi, 'o', oi]; }));
    (p.bids || []).forEach((m, bi) => { if (m) BLOODIDX.idx[m] = [pi, 'b', bi]; });
  });
  PRISM.opts.forEach((o, i) => { if (o.mid) PRISMIDX.idx[o.mid] = i; });
  PRISM.items.forEach((x, i) => { if (x.gid) PRISMIDX.item[x.gid] = i; });
  REVIVALS.forEach(o => { if (o.mid) RVMID.set(String(o.mid), o); });
  BASES.forEach(b => { BASEIDX[b.gid] = b; });
  ALL_DATA.forEach(r => { if (r.item !== undefined && r.source) ITEM_PART.set(ITEMS[r.item].name, r.source); });
  ITEM_PART.set('올마이티 오리진', '특수 갑옷'); // 출처가 빈 특수 장비 (빌더 PART_OVERRIDE)
  PRESET_SLOTS = presetSlotsOf(PARTS); BLOOD_SET_PARTS = bloodSetPartsOf(PARTS);
  wbReady = true;
}

// ── 창 (빌더의 alert·uiConfirm·showToast 를 빌더 2 모양으로) ──
function wbPop(html, cls) {
  wbClose();
  const t = document.getElementById('wbToast'); if (t) t.classList.remove('on'); // '로그 분석 중…' 같은 알림은 창이 뜨면 내린다
  const d = document.createElement('div');
  d.className = 'wb-dim';
  d.onclick = e => { if (e.target === d) wbClose(); };
  d.innerHTML = `<div class="wb-pop${cls ? ' ' + cls : ''}">${html}</div>`;
  document.body.appendChild(d);
  return d;
}
function wbClose() { if (document.getElementById('wbMemo')) wbMemoSave(); document.querySelectorAll('.wb-dim').forEach(x => x.remove()); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.wb-dim')) wbClose(); });
function alert(msg) {
  wbPop(`<div class="wb-msg">${escapeHtml(String(msg))}</div><div class="wb-btns"><button class="wz-btn pri" onclick="wbClose()">확인</button></div>`);
}
let wbConfirmCb = null;
function uiConfirm(msg, onOk, opts) {
  opts = opts || {};
  wbConfirmCb = {ok: onOk, cancel: opts.onCancel};
  wbPop((opts.title ? `<h3>${escapeHtml(opts.title)}</h3>` : '') + `<div class="wb-msg">${escapeHtml(msg)}</div>` +
    `<div class="wb-btns"><button class="wz-btn pri" onclick="wbConfirmDo('ok')">${escapeHtml(opts.ok || '확인')}</button>` +
    `<button class="wz-btn" onclick="wbConfirmDo('cancel')">${escapeHtml(opts.cancel || '취소')}</button></div>`);
}
function wbConfirmDo(k) { const c = wbConfirmCb; wbConfirmCb = null; wbClose(); if (c && c[k]) c[k](); }
let wbToastT = 0;
function showToast(msg) {
  let t = document.getElementById('wbToast');
  if (!t) { t = document.createElement('div'); t.id = 'wbToast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(wbToastT); wbToastT = setTimeout(() => t.classList.remove('on'), 2400);
}
// 로그에 캐릭터가 둘 이상 — 고르기 (02_logimport 의 pickLogChar 가 받는다)
function showLogCharModal(chars) {
  pendingLogChars = chars;
  wbPop('<h3>어느 캐릭터를 가져올까요?</h3><div class="wb-msg">로그에 캐릭터가 ' + chars.length + '명 있습니다.</div><div class="wb-list">' +
    chars.map((c, i) => {
      const hn = (LOGMAP.hero || {})[c.heroId];
      return `<button class="wb-row" onclick="pickLogChar(${i})"><b>${escapeHtml(c.charName || '캐릭터 ' + (i + 1))}</b>` +
        (hn ? ` <em>${escapeHtml(hn)}</em>` : '') + `<small>장비 ${Object.keys(c.gear).length} · 스킬 ${Object.keys(c.skills).length}칸</small></button>`;
    }).join('') + '</div>');
}
function closeLogCharModal() { wbClose(); pendingLogChars = null; }
// 로그 가져오기가 새 빌드를 활성으로 만든 뒤 부른다 — 빌드가 바뀌었으면 단계 화면 상태를 정리
// 빌드마다 만든 시즌 (빌더 normalizePresetsData 와 같은 규칙 — 표시 없는 빌드 = 지금 시즌). 시즌이 바뀌면 막대에 '지난 시즌 빌드'
const wbSeason = () => (window.TLI_SEASON || {}).label || '';
function wbTagSeason(p) { if (p && !p.season && wbSeason()) p.season = wbSeason(); }
presets.list.forEach(wbTagSeason);
let wbCur = preset;
function hpUse(p) {
  wbTagSeason(p);
  preset = p; wbCur = p;
  if (!Array.isArray(preset.talents)) preset.talents = [];
  if (typeof pageOnSwitch === 'function') pageOnSwitch();
}
function renderPreset() { if (wbCur !== preset) hpUse(preset); pageRender(); }

// ── 빌드 관리 창 ──
const wbCnt = p => Object.values(p.slots || {}).filter(Boolean).length;
const wbSkCnt = p => Object.values(p.skills || {}).filter(s => s && s.main).length;
// 빌드 관리 창 (2026-10-13 개편 — 빌더 목록 화면과 같은 카드) : 위 = 지금 빌드(이름·코멘트·동작), 아래 = 내 빌드 카드(시즌 칩·최신순, 누르면 그 빌드로)
let wbSeOn = null;
function wbOpen() {
  const prevTop = (document.querySelector('.wb-manage .wb-grid') || {}).scrollTop || 0;
  const seOf = p => p.season || 'SS13', seNum = l => +String(l).replace(/\D/g, '') || 0;
  const ses = [...new Set(presets.list.map(seOf))].sort((a, b) => seNum(b) - seNum(a));
  if (!wbSeOn || ![...wbSeOn].some(l => ses.includes(l))) wbSeOn = new Set([seOf(preset)]);
  const shown = presets.list.filter(p => ses.length < 2 || wbSeOn.has(seOf(p))).sort((a, b) => b.id - a.id);
  const chips = ses.length > 1 ? '<div class="wl-ses">' + ses.map(l => `<button type="button" class="share-se-chip${wbSeOn.has(l) ? ' on' : ''}" onclick="wbSeToggle('${l}')">${l} <small>${presets.list.filter(p => seOf(p) === l).length}</small></button>`).join('') + '</div>' : '';
  const cards = shown.map(p => `<div class="wl-card${p.id === preset.id ? ' on' : ''}" onclick="wbSwitch(${p.id})" title="${p.id === preset.id ? '지금 빌드' : '눌러서 이 빌드로 바꾸기'}">` +
    wlCardBody(p) + (p.id === preset.id ? '<span class="wb-now">지금</span>' : '') + '</div>').join('');
  const tr = preset.hero && traitInfo(preset.hero.trait);
  const se = preset.shareEdit;
  const d = wbPop('<div class="wb-head"><h3>빌드 관리</h3><span class="wb-hbtns"><button class="wz-btn" onclick="wbLogPick()">🎮 로그에서 가져오기</button>' +
    '<button class="wz-btn pri" onclick="wbNew()">＋ 새 빌드</button></span></div>' +
    (se ? `<div class="wb-se">✏ 공유 글 <b>${escapeHtml(se.title || se.id)}</b> 수정 중 — 고친 뒤 저장하면 링크·추천·조회수가 그대로입니다` +
      '<div class="wb-btns left"><button class="wz-btn pri" onclick="wbShareOpen()">💾 공유 글 저장</button><button class="wz-btn" onclick="wbShareEditStop()">수정 그만두기</button></div></div>' : '') +
    '<div class="wb-curbox">' +
    `<div class="wb-curtop"><div class="wl-face">${tr ? `<img src="${tr.img}" alt="">` : '<span>?</span>'}</div>` +
    `<div class="wb-cur"><small>지금 빌드${preset.hero ? ' · ' + escapeHtml(preset.hero.trait) : ''}</small><input id="wbName" maxlength="30" value="${escapeHtml(preset.name || '')}" onkeydown="if(event.key==='Enter')wbRename()">` +
    '<button class="wz-btn" onclick="wbRename()">이름 저장</button></div></div>' +
    `<div class="wb-memo"><small>작성자 코멘트 <span id="wbMemoN">${(preset.memo || '').length}/1500</span> · 공유하면 보기 화면에 함께 보입니다</small>` +
    `<textarea id="wbMemo" maxlength="1500" rows="3" placeholder="빌드 설명·운영법·주의할 점 등" oninput="wbMemoIn(this)" onblur="wbMemoSave()">${escapeHtml(preset.memo || '')}</textarea></div>` +
    '<div class="wb-acts">' +
    `<button class="wz-btn" onclick="wbShareOpen()">${se ? '💾 공유 글 저장' : '🌐 공유 올리기'}</button>` +
    `<a class="wz-btn" href="/tli/view/?my=${preset.id}">👁 보기 화면</a>` +
    '<button class="wz-btn" onclick="wbDup()">📄 복제</button><button class="wz-btn wb-del" onclick="wbDel()">삭제</button></div></div>' +
    `<div class="wb-lhead"><b>내 빌드</b><small>${presets.list.length}개 · 최신순 · 카드를 누르면 그 빌드로 바꿉니다</small></div>` + chips +
    `<div class="wl-grid wb-grid">${cards || '<div class="wl-note">이 시즌 빌드가 없습니다</div>'}</div>`, 'wb-manage');
  const g = d.querySelector('.wb-grid'); if (g) g.scrollTop = prevTop;
}
function wbSeToggle(l) { if (wbSeOn.has(l)) { if (wbSeOn.size > 1) wbSeOn.delete(l); } else wbSeOn.add(l); wbOpen(); }
// 메모 — 빌더 1 과 같은 preset.memo (1500자, 공유 코드 m 에 실린다). 쓰는 동안은 잠깐 모았다가 저장
let wbMemoT = 0;
function wbMemoIn(el) {
  const t = el.value.slice(0, 1500);
  if (t.trim()) preset.memo = t; else delete preset.memo;
  const n = document.getElementById('wbMemoN'); if (n) n.textContent = t.length + '/1500';
  clearTimeout(wbMemoT); wbMemoT = setTimeout(wbMemoSave, 600);
}
function wbMemoSave() { clearTimeout(wbMemoT); persistPreset(); }
function wbSwitch(id) { if (id !== preset.id) hpSwitch(id); wbOpen(); }
function wbRename() {
  const nm = (document.getElementById('wbName').value || '').trim();
  if (!nm) { showToast('이름을 입력해 주세요'); return; }
  preset.name = nm.slice(0, 30); persistPreset(); pageRender(); wbOpen(); showToast('이름을 바꿨습니다');
}
const wbNextId = () => Math.max(0, ...presets.list.map(x => x.id)) + 1;
function wbNew() {
  const p = {id: wbNextId(), name: '빌드 ' + (presets.list.length + 1), slots: {}, talents: [], skills: {}};
  presets.list.push(p); presets.activeId = p.id; hpUse(p); persistPreset(); pageRender(); wbOpen();
  const el = document.getElementById('wbName'); if (el) { el.focus(); el.select(); }
}
function wbDup() {
  const p = JSON.parse(JSON.stringify(preset));
  p.id = wbNextId(); delete p.sid; p.name = (preset.name + ' 복사').slice(0, 30);
  presets.list.push(p); presets.activeId = p.id; hpUse(p); persistPreset(); pageRender(); wbOpen(); showToast('복제했습니다');
}
function wbDel() {
  const nm = preset.name;
  uiConfirm(`[${nm}] 빌드를 삭제할까요? 되돌릴 수 없습니다.`, () => {
    presets.list = presets.list.filter(p => p.id !== preset.id);
    if (!presets.list.length) presets.list.push({id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}});
    presets.activeId = presets.list[0].id; hpUse(presets.list[0]); persistPreset(); pageRender(); wbOpen();
  }, {title: '빌드 삭제', ok: '삭제'});
}

// ── 로그에서 가져오기 — 안내 창 → [로그 파일 고르기] → 데이터 받기 → 빌더와 같은 해석(handleLogFile) ──
// 폴더 전체 경로 — 파일 고르기 창 주소줄에 그대로 붙여 넣을 수 있게 (사용자 2026-10-10)
const WB_LOG_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Torchlight Infinite\\UE_game\\TorchLight\\Saved\\Logs';
function wbLogPick() { // 처음 누르면 방법부터 (빌더 1 로그 가져오기 ⓘ 안내와 같은 내용, 사용자 2026-10-09)
  window.wtEv && wtEv('log_open'); wbPop('<h3>🎮 게임 로그에서 빌드 가져오기</h3>' +
    '<ol class="wb-steps">' +
    '<li>게임 설정에서 <b>[로그 오픈]</b>을 켭니다</li>' +
    '<li><b>캐릭터 선택 화면으로 나갔다가 다시 접속</b>합니다 — 핵심 재능·운명·프리즘 등은 접속할 때만 로그에 남아서, 다시 접속하지 않으면 일부를 못 가져올 수 있어요</li>' +
    '<li>아래 <b>[📂 로그 파일 고르기]</b>로 이 파일을 고르면, 착용 중인 히어로·스킬(보조 포함)·장비·추억·석판·핵심 재능·재능 보드·운명·프리즘·정령이 <b>새 빌드</b>로 만들어집니다</li></ol>' +
    '<div class="wb-pathh">로그 폴더 (Steam 기본 설치) — 복사해 파일 창 주소줄에 붙여 넣고 <b>UE_game.log</b> 선택</div>' +
    `<div class="wb-path"><code>${escapeHtml(WB_LOG_PATH)}</code><button class="wz-btn" onclick="wbCopy(WB_LOG_PATH)">복사</button></div>` +
    '<div class="wb-note">⚠ 운명·추억은 로그에 빠지거나 다르게 실릴 때가 있어, 가져온 뒤 게임 화면과 한 번 맞춰 확인해 주세요.<br>파일은 서버로 보내지 않고 이 브라우저 안에서만 읽습니다. 같은 이름의 빌드가 있으면 덮어쓸지 새로 만들지 물어봅니다.</div>' +
    '<div class="wb-btns"><button class="wz-btn pri" onclick="wbLogFile()">📂 로그 파일 고르기</button><button class="wz-btn" onclick="wbClose()">닫기</button></div>');
}
function wbLogFile() {
  let inp = document.getElementById('wbLogFile');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'wbLogFile'; inp.accept = '.log,text/plain'; inp.style.display = 'none';
    inp.addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      wbClose();
      showToast('데이터 받는 중…');
      try { await wbLoad(); } catch (err) { alert('데이터를 받지 못했습니다. 새로고침 뒤 다시 해 주세요.'); return; }
      handleLogFile(f);
    });
    document.body.appendChild(inp);
  }
  inp.click();
}

// ── 공유 올리기 — 빌더 06_share 의 올리기와 같은 규칙·같은 API ──
let wbShareTags = [], wbShareMain = '', wbTitleEdited = false, wbUnlisted = false;
function wbShareOpen() {
  window.wtEv && wtEv('share_open'); if (!SHARE_ONLINE) { alert('온라인 주소(https)에서만 공유할 수 있습니다.'); return; }
  const mainSk = ['a1', 'a2', 'a3', 'a4', 'a5', 'p1', 'p2', 'p3', 'p4'].map(id => preset.skills && preset.skills[id] && preset.skills[id].main).find(Boolean);
  if (!(preset.hero && traitInfo(preset.hero.trait))) { alert('공유하려면 먼저 히어로를 골라 주세요 (1단계 히어로).'); return; }
  if (!mainSk) { alert('공유하려면 스킬에 메인 스킬이 하나 이상 있어야 합니다 (3단계 스킬).'); return; }
  if (sbConflicts(preset.slateBd).length) { alert('석판 보드에 겹치거나 밖으로 나간 석판이 있습니다.\n재배치를 마친 뒤 공유할 수 있어요.'); return; }
  const se = preset.shareEdit; // 보기 화면 [수정]으로 불러온 공유 글 — 같은 글을 고쳐 저장 (/api/share/edit)
  wbShareMain = mainSk.name; wbShareTags = [preset.hero.trait]; wbTitleEdited = false;
  if (se) (se.tags || []).forEach(t => { if (!traitInfo(t) && !wbShareTags.includes(t) && wbShareTags.length < 10) wbShareTags.push(t); }); // 히어로 태그는 지금 빌드 것으로
  let au = '', pw = '';
  try { au = localStorage.getItem('tlidb_author_v1') || ''; pw = localStorage.getItem('tlidb_share_pwd_v1') || ''; } catch (e) {}
  if (se) { au = se.author || au; wbTitleEdited = !!se.title; }
  wbUnlisted = !!(se && se.unlisted);
  const grp = (nm, tags) => `<div class="wb-tgrp"><small>${nm}</small><div>${tags.map(t =>
    `<button class="wb-tag${wbShareTags.includes(t) ? ' on' : ''}" data-t="${escapeHtml(t)}" onclick="wbTag(this)">${escapeHtml(t)}</button>`).join('')}</div></div>`;
  wbPop(`<h3>${se ? '공유 글 수정 저장' : '빌드 공유 올리기'}</h3>` +
    `<div class="wb-field"><b>공개 범위</b><div class="wb-vis">` +
      `<button class="wb-tag${wbUnlisted ? '' : ' on'}" data-v="0" onclick="wbVis(false)" title="빌드 공유 목록·검색에 올라갑니다">🌐 목록에 공개</button>` +
      `<button class="wb-tag${wbUnlisted ? ' on' : ''}" data-v="1" onclick="wbVis(true)" title="목록·검색에는 나오지 않고, 링크를 받은 사람만 볼 수 있습니다">🔒 링크로만 공유</button></div></div>` +
    `<div class="wb-field"><b>제목</b><input id="wbTitle" maxlength="40" placeholder="2~40자 (비워 두면 메인 스킬 + 태그)" value="${escapeHtml(se && se.title || '')}" oninput="wbTitleEdited=true"></div>` +
    `<div class="wb-tgrp"><small>히어로</small><div><button class="wb-tag on lock" title="빌드에서 고른 히어로라 여기서는 못 바꿉니다">🔒 ${escapeHtml(preset.hero.trait)}</button></div></div>` +
    grp('성향·능력치', SHARE_EXTRA_TAGS) + grp('콘텐츠', SHARE_CONTENT_TAGS) + grp('스킬 태그', SHARE_SKILL_TAGS) +
    `<div class="wb-field"><b>작성자</b><input id="wbAuthor" maxlength="10" placeholder="2~10자 (한글·영문·숫자·#)" value="${escapeHtml(au)}"></div>` +
    (se ? '' : `<div class="wb-field"><b>비밀번호</b><input id="wbPwd" type="text" autocomplete="off" data-lpignore="true" data-1p-ignore spellcheck="false" style="-webkit-text-security:disc" maxlength="20" placeholder="4~20자 — 내 글을 고치거나 지울 때" value="${escapeHtml(pw)}"></div>`) +
    '<div class="wb-note">태그는 목록에서 찾을 때 쓰입니다 (1~10개). 작성자·비밀번호는 이 브라우저에 기억됩니다.</div>' +
    `<div class="wb-btns"><button class="wz-btn pri" id="wbShareGo" onclick="wbShareSubmit()">${se ? '수정 저장' : '올리기'}</button><button class="wz-btn" onclick="wbClose()">취소</button></div>`, 'wb-share');
  wbTitleSync();
}
function wbVis(on) { // 공개 범위 — 링크 전용은 목록·검색에서 빠진다 (2026-10-12)
  wbUnlisted = on;
  document.querySelectorAll('.wb-vis .wb-tag').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === on));
}
function wbTag(el) {
  const t = el.dataset.t, i = wbShareTags.indexOf(t);
  if (i >= 0) wbShareTags.splice(i, 1);
  else if (wbShareTags.length >= 10) { showToast('태그는 10개까지입니다'); return; }
  else wbShareTags.push(t);
  el.classList.toggle('on', i < 0);
  wbTitleSync();
}
function wbTitleSync() {
  if (wbTitleEdited) return;
  const el = document.getElementById('wbTitle');
  if (el) el.value = [wbShareMain, ...wbShareTags].join(' ').trim().slice(0, 40);
}
async function wbShareSubmit() {
  const se = preset.shareEdit, pe = document.getElementById('wbPwd');
  const title = document.getElementById('wbTitle').value.trim(), author = document.getElementById('wbAuthor').value.trim(), pwd = se ? se.pwd : pe.value;
  if (title && (title.length < 2 || title.length > 40)) { showToast('제목은 2~40자로 입력해 주세요'); return; }
  if (!/^[가-힣A-Za-z0-9#]{2,10}$/.test(author)) { showToast('작성자는 한글·영문·숫자·# 2~10자입니다'); return; }
  if (!se && !/^\S{4,20}$/.test(pwd)) { showToast('비밀번호는 공백 없는 4~20자입니다'); return; }
  const btn = document.getElementById('wbShareGo');
  btn.disabled = true; btn.textContent = '올리는 중…';
  try {
    await wbLoad();
    // 예전 수정 사본 이름의 '✏ ' 는 코드에 싣지 않는다 (2026-10-13 이전에 [수정]으로 불러둔 빌드)
    const code = await presetToCode(Object.assign({}, preset, {name: String(preset.name || '').replace(/^✏\s*/, '') || preset.name}));
    const body = {code, main: wbShareMain, title, tags: wbShareTags, author, unlisted: wbUnlisted};
    const res = await fetch(se ? '/api/share/edit' : '/api/share', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify(se ? Object.assign({id: se.id}, se.admin ? {} : {pwd}, body) : Object.assign({pwd}, body))}); // 관리 수정은 로그인 쿠키로
    const d = await res.json().catch(() => ({ok: false, error: '서버 응답을 해석할 수 없습니다'}));
    if (!d.ok) throw new Error(d.error || '요청에 실패했습니다');
    try { localStorage.setItem('tli_share_dirty', String(Date.now())); } catch (e) {} // 공유 목록 캐시 건너뛰기
    try { localStorage.setItem('tlidb_author_v1', author); if (!se) localStorage.setItem('tlidb_share_pwd_v1', pwd); } catch (e) {}
    const link = location.origin + '/tli/view/?preset=' + (se ? se.id : d.id);
    if (se) { delete preset.shareEdit; preset.name = String(preset.name || '').replace(/^✏\s*/, '') || preset.name; persistPreset(); pageRender(); }
    wbPop(`<h3>${se ? '공유 글을 고쳤습니다' : '공유했습니다'}</h3><div class="wb-msg">${wbUnlisted ? '🔒 링크로만 공유됩니다 — 공유 목록·검색에는 나오지 않고, 이 링크를 받은 사람만 볼 수 있습니다.' : '이 링크로 누구나 빌드를 볼 수 있습니다.'}${se ? ' 추천·조회수는 그대로입니다.' : ''}</div>` +
      `<input class="wb-link" readonly value="${escapeHtml(link)}" onclick="this.select()">` +
      `<div class="wb-btns"><button class="wz-btn pri" onclick="wbCopy('${escapeHtml(link)}')">링크 복사</button><a class="wz-btn" href="${escapeHtml(link)}" target="_blank">열어 보기</a>` +
      (se && se.admin ? `<button class="wz-btn" onclick="wbDropCopy(${preset.id})" title="관리 화면에서 남의 글을 고치려고 불러온 사본 — 내 빌드 목록에서 뺍니다">내 빌드에서 빼기</button>` : '') +
      '<button class="wz-btn" onclick="wbClose()">닫기</button></div>');
  } catch (e) {
    btn.disabled = false; btn.textContent = se ? '수정 저장' : '올리기';
    showToast('공유하지 못했습니다: ' + e.message);
  }
}
function wbDropCopy(id) { // 관리 수정용 사본 지우기 — 다른 빌드로 옮겨 가고, 빌드가 없으면 빈 빌드 하나
  presets.list = presets.list.filter(p => p.id !== id);
  if (!presets.list.length) presets.list.push({id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}});
  presets.activeId = presets.list[0].id; hpUse(presets.list[0]); persistPreset(); wbClose();
  if (typeof wzList === 'function' && presets.list.some(wzFilled)) wzList(); else pageRender();
  showToast('내 빌드에서 뺐습니다');
}
async function wbCopy(t) { try { await navigator.clipboard.writeText(t); showToast('복사했습니다'); } catch (e) { showToast('복사하지 못했습니다 — 칸을 눌러 직접 복사해 주세요'); } }
function wbShareEditStop() { // 고친 빌드는 내 빌드로 남기고, 공유 글과의 연결만 끊는다
  uiConfirm('공유 글 수정을 그만둘까요? 고친 빌드는 내 빌드로 그대로 남고, 공유 글은 바뀌지 않습니다.', () => {
    delete preset.shareEdit; persistPreset(); pageRender(); wbOpen();
  }, {title: '수정 그만두기', ok: '그만두기'});
}

// ── /tli/builder (2026-10-09 전환 — 서버가 /tli/builder/ 를 이 화면으로, 파일은 /tli/builder2/) — 빌더 마법사 ──
// 히어로 → 재능 → 스킬 → 장비 순서로 한 단계씩 큰 화면에서 짠다. 끝나면 보기 화면(/tli/view/?my=)으로 넘긴다.
// 히어로·재능 단계는 단독 화면과 같은 조각(00_hero.js·00_talent.js)을 그대로 끼운다.
// 빌드는 빌더와 같은 브라우저 저장소(page_common.js) — 기존 빌더는 손대지 않는다.
const WZ_STEPS = [
  {id: 'hero',   no: 1, name: '히어로',  desc: '히어로 · 특성 · 노드'},
  {id: 'talent', no: 2, name: '재능',    desc: '재능 보드 4칸 (프리즘·역상은 다음 단계)'},
  {id: 'skill',  no: 3, name: '스킬',    desc: '액티브 5 · 패시브 4'}, // 순서 히어로 → 재능 → 스킬 → 장비 → 추억·석판·정령 (사용자 2026-10-08)
  {id: 'gear',   no: 4, name: '장비',    desc: '장비 10칸'},
  {id: 'mem',    no: 5, name: '추억·석판·정령', desc: '한 화면 — 추억 3 + 부활 · 신격 석판 · 전투 정령·운명'},
];
// 단계별로 처음 들어갈 때만 받는 데이터 (큰 데이터를 히어로·재능만 쓰는 사람에게 미리 받게 하지 않는다)
const WZ_DATA = {
  skill: {src: '/tli/builder2/skill_data.js?v=' + (window.WZ_VER || {}).skill, ready: () => typeof SKILLS !== 'undefined', size: '약 1.3MB'},
  gear: {src: '/tli/builder2/gear_data.js?v=' + (window.WZ_VER || {}).gear, ready: () => typeof GEAR_ROWS !== 'undefined', size: '약 2MB'},
  mem: {src: '/tli/builder2/mem_data.js?v=' + (window.WZ_VER || {}).mem, ready: () => typeof MEM_ROWS !== 'undefined', size: '약 80KB'},
  // 로그 가져오기·공유 올리기 때만 (단계 화면은 안 씀 — wz_build.js)
  log: {src: '/tli/builder2/log_data.js?v=' + (window.WZ_VER || {}).log, ready: () => typeof TAL_ROWS !== 'undefined', size: '약 300KB'},
};
const wzLoading = {}; // id → 받는 중 Promise | 'fail' — 같은 파일을 두 번 싣지 않는다 (const 재선언 오류)
function wzLoad(id) {
  const d = WZ_DATA[id];
  if (d.ready()) return Promise.resolve();
  if (!wzLoading[id] || wzLoading[id] === 'fail') wzLoading[id] = new Promise((ok, no) => {
    // jsDelivr 먼저, 안 되면 우리 서버 — WZ_CDN 은 배포 직전 _dev/cdn_sync.py 가 넣는다 (2026-10-12 워커 응답이 너무 느려서)
    const urls = window.WZ_CDN ? [window.WZ_CDN + d.src.split('?')[0].slice(1), d.src] : [d.src];
    const tryAt = i => {
      const sc = document.createElement('script');
      sc.src = urls[i];
      sc.onload = () => { ok(); pageRender(); };
      sc.onerror = () => { sc.remove(); if (i + 1 < urls.length) return tryAt(i + 1); wzLoading[id] = 'fail'; pageRender(); no(new Error(id + ' 데이터')); };
      document.body.appendChild(sc);
    };
    tryAt(0);
  });
  return wzLoading[id];
}
function wzNeed(id) { // 데이터가 준비됐으면 true, 아니면 받기 시작하고 false (다 받으면 다시 그린다)
  const d = WZ_DATA[id];
  if (!d || d.ready()) return true;
  if (!wzLoading[id]) wzLoad(id).catch(() => {});
  return false;
}
// 주소 #단계 또는 #mem-slate · #mem-dst (보기 화면 섹션의 [수정] 이 그 칸을 바로 연다 — 2026-10-09)
const wzHash0 = (location.hash || '').slice(1).split('-');
// 내용이 든 빌드 (히어로·스킬·장비·재능 보드 중 하나라도) — 하나라도 있으면 주소에 단계가 없을 때 '내 빌드' 목록부터 (사용자 2026-10-09)
const wzFilled = p => !!(p && (p.hero || Object.values(p.skills || {}).some(x => x && x.main) || Object.values(p.slots || {}).some(Boolean) || (p.gboard || []).length));
let wzStep = WZ_STEPS.some(s => s.id === wzHash0[0]) ? wzHash0[0] : presets.list.some(wzFilled) ? 'list' : 'hero';
if (wzStep === 'mem' && (wzHash0[1] === 'slate' || wzHash0[1] === 'dst')) wmPart = wzHash0[1];
function wzSummary(id) { // 단계 카드 아래 한 줄 — 지금 빌드에 얼마나 채웠나
  if (id === 'hero') {
    if (!preset.hero) return {txt: '아직 안 고름', done: false};
    const t = heroTraitData();
    return {txt: heroLabel(preset.hero) + (t ? ' · 노드 ' + (1 + heroPicked(t).length) + '/4' : ''), done: true};
  }
  if (id === 'talent') {
    const gb = preset.gboard || [], pts = gb.reduce((s, x) => s + (x[1] || 0), 0);
    const n = new Set(gb.map(x => String(x[0]).slice(0, 2))).size;
    return pts ? {txt: '보드 ' + n + '개 · ' + pts + ' / ' + GB_BUDGET + '포인트', done: true} : {txt: '아직 안 찍음', done: false};
  }
  if (id === 'mem') {
    const ms = preset.mems || {}, n = MEM_PARTS.filter(p => ms[p]).length;
    const sl = (preset.slateBd || []).length, pc = (preset.pacts || []).filter(x => x && x.name).length;
    const t = [n ? '추억 ' + n + '/3' : '', sl ? '석판 ' + sl : '', pc ? '정령 ' + pc : ''].filter(Boolean).join(' · ');
    return t ? {txt: t, done: true} : {txt: '아직 없음', done: false};
  }
  if (id === 'gear') {
    const n = Object.keys(preset.slots || {}).filter(k => preset.slots[k]).length;
    return n ? {txt: '장비 ' + n + ' / 10칸', done: true} : {txt: '아직 없음', done: false};
  }
  const n = Object.keys(preset.skills || {}).filter(k => preset.skills[k] && preset.skills[k].main).length;
  return n ? {txt: '스킬 ' + n + ' / 9칸', done: true} : {txt: '아직 없음', done: false};
}
// ── 내 빌드 목록 (빌더 첫 화면) — 카드 = 보기 화면, [수정] = 빌더 단계, [+ 새 빌드] = 새 빌드로 1단계부터 ──
function wzList() { wzStep = 'list'; history.replaceState(null, '', location.pathname); pageRender(); window.scrollTo(0, 0); }
function wzListHtml() {
  const card = p => `<div class="wl-card${p.id === preset.id ? ' on' : ''}" onclick="wzListView(${p.id})" title="눌러서 보기">` + wlCardBody(p) +
      `<div class="wl-acts"><button class="wz-btn" onclick="event.stopPropagation();wzListEdit(${p.id})">수정</button>` +
      `<button class="wz-btn" onclick="event.stopPropagation();wzListShare(${p.id})" title="이 빌드를 빌드 공유에 올립니다">${p.shareEdit ? '공유 글 저장' : '공유'}</button>` +
      `<button class="wz-btn" onclick="event.stopPropagation();wzListDup(${p.id})" title="복제">복제</button>` +
      `<button class="wz-btn wb-del" onclick="event.stopPropagation();wzListDel(${p.id})" title="삭제">삭제</button></div></div>`;
  // 시즌 칩 + 최신순 (2026-10-10) — 시즌 표시 없는 옛 빌드는 SS13. 처음엔 빌드가 있는 가장 최신 시즌만, 눌러서 여러 개
  // 정렬은 만든 최신순 — 빌드 번호(wbNextId)가 만들 때마다 커져서 번호 역순
  const allFilled = presets.list.filter(wzFilled), empty = presets.list.length - allFilled.length;
  const seNum = l => +String(l).replace(/\D/g, '') || 0;
  const ses = [...new Set(allFilled.map(wlSeasonOf))].sort((a, b) => seNum(b) - seNum(a));
  if (!wlSeOn || ![...wlSeOn].some(l => ses.includes(l))) wlSeOn = new Set(ses.slice(0, 1));
  const filled = allFilled.filter(p => ses.length < 2 || wlSeOn.has(wlSeasonOf(p))).sort((a, b) => b.id - a.id);
  const chips = ses.length > 1 ? '<div class="wl-ses">' + ses.map(l => `<button type="button" class="share-se-chip${wlSeOn.has(l) ? ' on' : ''}" onclick="wlSeToggle('${l}')">${l} <small>${allFilled.filter(p => wlSeasonOf(p) === l).length}</small></button>`).join('') + '</div>' : '';
  return '<div class="wz-bar wl-bar"><div class="wz-title"><b>빌더</b><span class="wl-sub">내 빌드 ' + allFilled.length + '개</span></div>' +
    '<div class="wz-nav"><button class="wz-btn" onclick="wbLogPick()" title="게임 로그 파일에서 새 빌드로">🎮 로그에서 가져오기</button>' +
    '<button class="wz-btn pri" onclick="wzListNew()">＋ 새 빌드</button></div></div>' +
    '<div class="wl-wrap">' + chips + '<div class="wl-grid">' + filled.map(card).join('') + '</div>' +
    (empty ? `<div class="wl-note">아무것도 넣지 않은 빈 빌드 ${empty}개는 목록에서 뺐습니다</div>` : '') +
    '<div class="wl-note">이 브라우저에 저장된 빌드입니다. 카드를 누르면 보기 화면, [수정]을 누르면 빌더에서 고칩니다.</div></div>';
}
// 빌드 카드 몸통(얼굴·이름·특성/스킬·칩) — 목록 화면과 빌드 관리 창이 같이 쓴다 (2026-10-13)
function wlCardBody(p) {
  const tr = p.hero && traitInfo(p.hero.trait), main = ['a1', 'a2', 'a3', 'a4', 'a5'].map(k => p.skills && p.skills[k] && p.skills[k].main).find(Boolean);
  const gear = Object.values(p.slots || {}).filter(Boolean).length, sk = Object.values(p.skills || {}).filter(x => x && x.main).length;
  const pts = (p.gboard || []).reduce((t, x) => t + (x[1] || 0), 0);
  const old = p.season && wbSeason() && p.season !== wbSeason();
  return `<div class="wl-face">${tr ? `<img src="${tr.img}" alt="" loading="lazy">` : '<span>?</span>'}</div>` +
    `<div class="wl-info"><b>${escapeHtml(p.name || '빌드 ' + p.id)}</b>` +
    `<small>${p.hero ? escapeHtml(p.hero.trait) : '히어로 없음'}${main ? ' · ' + escapeHtml(main.name) : ''}</small>` +
    `<div class="wl-tags"><span>스킬 ${sk}/9</span><span>장비 ${gear}/10</span><span>재능 ${pts}pt</span>` +
    (old ? `<span class="old">${escapeHtml(p.season)}</span>` : '') + (p.shareEdit ? '<span class="se">공유 글 수정 중</span>' : '') + (p.memo ? '<span>💬 코멘트</span>' : '') + '</div></div>';
}
let wlSeOn = null; // 내 빌드 시즌 칩 — 켠 시즌들 (처음엔 빌드가 있는 가장 최신 시즌)
const wlSeasonOf = p => p.season || 'SS13';
function wlSeToggle(l) { if (wlSeOn.has(l)) { if (wlSeOn.size > 1) wlSeOn.delete(l); } else wlSeOn.add(l); pageRender(); }
function wzListView(id) { location.href = '/tli/view/?my=' + id; }
function wzListEdit(id) { if (id !== preset.id) hpSwitch(id); wzGo('hero'); }
function wzListNew() {
  window.wtEv && wtEv('build_new'); const p = {id: wbNextId(), name: '빌드 ' + (presets.list.length + 1), slots: {}, talents: [], skills: {}};
  presets.list.push(p); presets.activeId = p.id; hpUse(p); persistPreset(); wzGo('hero');
}
// 공유 올리기 — 목록 카드 [공유]·보기 화면 [🌐 공유 올리기](#share) 에서 바로 (빌드 관리 창 안에만 있어 안 보였다, 2026-10-10)
async function wzListShare(id) {
  if (id !== undefined && id !== preset.id) hpSwitch(id);
  showToast('공유 준비 중…');
  try { await wbLoad(); } catch (e) { alert('데이터를 받지 못했습니다 — 잠시 뒤 다시 해 주세요'); return; }
  wbShareOpen();
}
function wzListDup(id) { window.wtEv && wtEv('build_copy'); if (id !== preset.id) hpSwitch(id); wbDup(); wbClose(); wzList(); }
function wzListDel(id) {
  const p = presets.list.find(x => x.id === id); if (!p) return;
  uiConfirm(`[${p.name}] 빌드를 삭제할까요? 되돌릴 수 없습니다.`, () => {
    window.wtEv && wtEv('build_del');
    presets.list = presets.list.filter(x => x.id !== id);
    if (!presets.list.length) presets.list.push({id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}});
    if (presets.activeId === id || !presets.list.some(x => x.id === presets.activeId)) { presets.activeId = presets.list[0].id; hpUse(presets.list[0]); }
    persistPreset(); presets.list.some(wzFilled) ? wzList() : wzGo('hero');
  }, {title: '빌드 삭제', ok: '삭제'});
}
function wzGo(id) {
  if (!WZ_STEPS.some(s => s.id === id)) return;
  wzStep = id;
  history.replaceState(null, '', '#' + id);
  heroMsg = ''; gbMsg = '';
  pageRender();
  window.scrollTo(0, 0);
}
function wzMove(d) {
  const i = WZ_STEPS.findIndex(s => s.id === wzStep) + d;
  if (i >= WZ_STEPS.length) { location.href = '/tli/view/?my=' + preset.id; return; } // 마지막 다음 = 보기 화면 (내 빌드, 사용자 2026-10-09)
  if (i >= 0) wzGo(WZ_STEPS[i].id);
}
// 좁은 화면(왼쪽 칸 목록이 위, 편집이 아래로 쌓일 때)에서 칸을 누르면 편집 영역으로 내려 준다 (사용자 요청)
function wzScrollToMain() {
  if (!window.matchMedia || !matchMedia('(max-width: 760px)').matches) return;
  const m = document.querySelector('.wz-body .gbm-main');
  if (m) m.scrollIntoView({behavior: 'smooth', block: 'start'});
}
function wzScrollToSide() {
  const m = document.querySelector('.wz-body .gbm-side');
  if (m) m.scrollIntoView({behavior: 'smooth', block: 'start'});
}
const WZ_UP = '<button class="wz-up" onclick="wzScrollToSide()">↑ 칸 목록</button>'; // 좁은 화면 전용 (CSS)
// 빌드 고르기 목록 아래 동작 (page_common hpBuildPicker) — [빌드 관리] 단추는 여기로 합쳤다 (2026-10-13)
function hpBuildActs() {
  return '<button type="button" onclick="hpBpClose();wbNew()">＋ 새 빌드</button><button type="button" onclick="hpBpClose();wbDup()">📄 복제</button>' +
    '<button type="button" onclick="hpBpClose();wbLogPick()">🎮 로그에서</button><button type="button" onclick="hpBpClose();wbOpen()" title="이름·삭제·순서·코멘트·공유">⚙ 관리</button>';
}
function pageOnSwitch() { heroMsg = ''; gbMsg = ''; gbExtra.clear(); gbSlot = 0; hrView = (preset.hero && preset.hero.hero) || hrView; }
function pageRender() {
  const app = document.getElementById('wzApp');
  if (wzStep === 'list') { app.innerHTML = wzListHtml(); return; }
  const i = WZ_STEPS.findIndex(s => s.id === wzStep);
  const bar = '<div class="wz-bar"><div class="wz-title"><b class="wz-home" onclick="wzList()" title="내 빌드 목록">빌더</b>' + hpBuildPicker() +
    (preset.season && wbSeason() && preset.season !== wbSeason() ? `<span class="wz-oldse" title="지난 시즌에 만든 빌드입니다 — 지금 시즌(${escapeHtml(wbSeason())}) 데이터에 없는 옵션은 저장된 문구 그대로 보입니다">${escapeHtml(preset.season)} 빌드</span>` : '') +
    (preset.shareEdit ? '<button class="wz-btn pri wz-shedit" onclick="wbShareOpen()" title="보기 화면에서 [수정]으로 불러온 공유 글 — 고친 뒤 저장하면 링크·추천·조회수가 그대로 유지됩니다">💾 공유 글 저장</button>' : '') + '</div>' +
    '<ol class="wz-steps">' + WZ_STEPS.map((s, k) => {
      const sm = wzSummary(s.id);
      return `<li class="wz-step${s.id === wzStep ? ' on' : ''}${sm.done ? ' done' : ''}" onclick="wzGo('${s.id}')" title="${escapeHtml(s.no + '. ' + s.name + ' — ' + sm.txt)}">` +
        `<span class="wz-no">${sm.done && s.id !== wzStep ? '✓' : s.no}</span><div><b${s.name.length > 5 ? ' class="long"' : ''}>${s.name}</b><small>${escapeHtml(sm.txt)}</small></div></li>` +
        (k < WZ_STEPS.length - 1 ? '<li class="wz-arrow" aria-hidden="true">›</li>' : '');
    }).join('') + '</ol>' +
    '<div class="wz-nav">' +
    // 되돌리기·다시 실행은 단축키만 (Ctrl+Z · Ctrl+Shift+Z/Ctrl+Y) — 버튼·[이전]은 2026-10-13 뺌 (단계는 위 칸을 눌러 이동)
    `<button class="wz-btn pri wz-next" onclick="wzMove(1)" title="${i === WZ_STEPS.length - 1 ? '보기 화면' : '다음: ' + WZ_STEPS[i + 1].name}">${i === WZ_STEPS.length - 1 ? '보기 화면 ›' : '다음: ' + WZ_STEPS[i + 1].name + ' ›'}</button></div></div>`;
  // 단계 몸통 — 히어로·재능은 단독 화면과 같은 그리기 함수가 그 id 의 칸에 그린다
  const body = wzStep === 'hero' ? '<div id="heroApp"></div>'
    : wzStep === 'talent' ? '<div id="talentApp"></div>'
    : WZ_DATA[wzStep] && !wzNeed(wzStep)
      ? `<div class="wz-todo"><b>${WZ_STEPS[i].name} 데이터를 받는 중…</b><p>${wzLoading[wzStep] === 'fail' ? '받지 못했습니다. 새로고침해 주세요.' : '처음 한 번만 받습니다 (' + WZ_DATA[wzStep].size + ').'}</p></div>`
    : wzStep === 'skill' ? wsRender()
    : wzStep === 'gear' ? wgRender()
    : wzStep === 'mem' ? wmRender()
    : `<div class="wz-todo"><b>${WZ_STEPS[i].name} 단계</b><p>${escapeHtml(WZ_STEPS[i].desc)} — 큰 화면 구성을 정하는 중입니다.<br>` +
      '지금은 <a href="/tli/builder/">빌더</a>에서 채워 주세요. 같은 빌드라 여기서 고른 히어로·재능이 그대로 보입니다.</p></div>';
  app.innerHTML = bar + '<div class="wz-body">' + body + '</div>';
  wzFitHeight();
  if (wzStep === 'hero') { hrModalOpen = true; hrView = hrView || (preset.hero && preset.hero.hero) || SHARE_HEROES[0][0]; hrRenderModal(); }
  else if (wzStep === 'talent') { gbModalOpen = true; gbRenderModal(); }
}
// PC 에서 페이지 스크롤이 안 생기게 — 단계 막대 높이(줄바꿈되면 달라짐)를 재서 아래 화면 높이에 쓴다 (사용자 요청 2026-10-09)
function wzFitHeight() {
  const bar = document.querySelector('.wz-bar');
  if (bar) document.documentElement.style.setProperty('--wzbar-h', bar.getBoundingClientRect().height + 'px');
}
window.addEventListener('resize', wzFitHeight);
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h.includes('=')) { location.reload(); return; } // 옛 빌더 해시 링크 — 페이지 머리 스크립트가 넘긴다
  if (h !== wzStep && WZ_STEPS.some(s => s.id === h)) { wzStep = h; pageRender(); } });
pageRender();
if (wzHash0[0] === 'share') { history.replaceState(null, '', location.pathname + location.search); wzListShare(); }
