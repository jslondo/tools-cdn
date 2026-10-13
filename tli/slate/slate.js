// 생성물 — 고칠 땐 update/src/js/00_gear.js · update/src/js/00_slate.js · update/src/page_common.js · update/src/wz_slate.js · update/src/slate_page.js (build_html2.build_tool_pages)
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

// ── 단독 화면(/tli/hero · /tli/talent) 공용 연결부 (2026-10-08) ──
// 빌더를 통째로 띄우지 않고 기능 조각(00_*.js)과 그 데이터만 싣는다.
// 빌더2·보기 화면은 빌더와 같은 브라우저 저장소(tlidb_presets_v1)의 활성 빌드를 쓴다.
// 메뉴로 들어가는 단독 화면(히어로·재능·석판)은 내 빌드와 완전 별개 연습판 — 화면마다 따로 저장(tli_solo_*), 빌드 목록·빌더와 오가지 않는다 (2026-10-13 사용자 요청)
// 각 화면은 pageRender(다시 그리기)·pageOnSwitch(빌드 바꿀 때 정리, 선택)를 정의한다.
const PRESETS_KEY = 'tlidb_presets_v1';
const PAGE_SOLO = (['heroApp', 'talentApp', 'slateApp'].find(id => document.getElementById(id)) || '').replace('App', '');
const HP_KEY = PAGE_SOLO ? 'tli_solo_' + PAGE_SOLO + '_v1' : PRESETS_KEY;
const KEY_MAP = new Map(); // 옵션 문구는 저장된 effect 로 읽는다 ((KEY_MAP.get(k) || o).effect 폴백)
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
}
const _stripDiv = document.createElement('div');
function stripHtml(s) { _stripDiv.innerHTML = String(s).replace(/<br\s*\/?>/gi, ' '); return _stripDiv.textContent.replace(/\s+/g, ' ').trim(); } // 빌더 05_ui 와 같음
function hpLoad() {
  try { const p = JSON.parse(localStorage.getItem(HP_KEY)); if (p && Array.isArray(p.list) && p.list.length) return p; } catch (e) {}
  return {list: [{id: 1, name: PAGE_SOLO ? '연습판' : '빌드 1', slots: {}, talents: [], skills: {}}], activeId: 1};
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
  try { localStorage.setItem(HP_KEY, cur); } catch (e) {}
}
function undoPreset(redo) {
  const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
  if (!from.length) return false;
  to.push(undoLast);
  presets = JSON.parse(from.pop());
  undoLast = JSON.stringify(presets);
  try { localStorage.setItem(HP_KEY, undoLast); } catch (e) {}
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
  if (PAGE_SOLO) return '<span class="hp-solo-acts"><button type="button" class="hp-bp hp-solo-over" onclick="hpBpToggle(this)" title="이 화면의 ' + HP_SOLO_WHAT[PAGE_SOLO] + '을(를) 내 빌드 하나에 옮깁니다">📥 내 빌드에 덮어쓰기</button>' +
    '<button type="button" class="hp-solo-reset" onclick="hpSoloReset()" title="이 화면에서 찍은 것을 모두 지웁니다 (Ctrl+Z 로 되돌리기)">↺ 처음부터</button></span>'; // 단독 화면 = 빌드 고르기 없음
  return `<button type="button" class="hp-build hp-bp" onclick="hpBpToggle(this)" title="빌드 바꾸기">` +
    `<span class="hp-bp-face">${hpBpFace(preset)}</span><span class="hp-bp-nm">${escapeHtml(hpBpName(preset))}</span><svg class="hp-bp-car" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
// ── 단독 화면 → 내 빌드 덮어쓰기 (2026-10-13 사용자 요청) — 이 화면이 다루는 필드만 바꾸고 나머지(장비·스킬 등)는 그대로
const HP_SOLO_WHAT = {talent: '재능 보드', slate: '석판', hero: '히어로·특성'};
const HP_SOLO_FIELDS = {talent: ['gboard', 'gbOrder', 'gbPrism', 'prism', 'inverse'], slate: ['slateBd'], hero: ['hero', 'heroNodes', 'heroHerbs']};
function hpBuilds() { try { const p = JSON.parse(localStorage.getItem(PRESETS_KEY)); if (p && Array.isArray(p.list)) return p; } catch (e) {} return {list: [], activeId: 0}; }
function hpSoloApply(dst, src) { // src(연습판)의 이 화면 몫을 dst(내 빌드)에 — 재능 줄은 핵심 재능(보드)·석판 파생(src 표시) 몫만 갈아 끼운다
  const cp = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  HP_SOLO_FIELDS[PAGE_SOLO].forEach(f => { if (src[f] === undefined) delete dst[f]; else dst[f] = cp(src[f]); });
  const mine = PAGE_SOLO === 'talent' ? (t => !t.src && talGroup(t.type) === 0) : PAGE_SOLO === 'slate' ? (t => !!t.src) : null;
  if (mine) dst.talents = (dst.talents || []).filter(t => !mine(t)).concat(cp((src.talents || []).filter(mine)));
}
function hpSoloOver(id) {
  hpBpClose();
  const bs = hpBuilds(), isNew = id === 0;
  let dst = bs.list.find(p => p.id === id);
  if (!isNew && !dst) return;
  if (PAGE_SOLO === 'hero' && dst && preset.hero && preset.hero.hero !== '아이리스' &&
      Object.values(dst.skills || {}).some(s => s && s.main && s.main.name === '마령')) {
    alert('그 빌드의 액티브 칸에 마령 스킬이 있어 아이리스가 아닌 히어로로 바꿀 수 없습니다.\n빌더에서 먼저 해당 스킬을 비워주세요.'); return;
  }
  if (!isNew && !confirm(`「${hpBpName(dst)}」의 ${HP_SOLO_WHAT[PAGE_SOLO]}을(를) 이 화면 것으로 바꿀까요?\n장비·스킬 등 나머지는 그대로 둡니다.`)) return;
  if (isNew) {
    dst = {id: bs.list.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1, name: HP_SOLO_WHAT[PAGE_SOLO] + ' 연습', slots: {}, talents: [], skills: {}};
    bs.list.push(dst);
  }
  hpSoloApply(dst, preset);
  bs.activeId = dst.id; // 빌더를 열면 바로 그 빌드
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(bs)); } catch (e) { alert('저장하지 못했습니다 (브라우저 저장 공간)'); return; }
  hpToast(`「${escapeHtml(hpBpName(dst))}」에 ${isNew ? '새 빌드로 저장' : '덮어썼습니다'} <a href="/tli/builder/">빌더에서 보기 →</a>`);
}
function hpToast(html) {
  let el = document.getElementById('hpToast');
  if (!el) { el = document.createElement('div'); el.id = 'hpToast'; document.body.appendChild(el); }
  el.innerHTML = html; el.classList.add('on');
  clearTimeout(hpToast.t); hpToast.t = setTimeout(() => el.classList.remove('on'), 6000);
}
function hpSoloReset() {
  if (!confirm('이 화면에서 찍은 것을 모두 지울까요?')) return;
  presets = {list: [{id: 1, name: '연습판', slots: {}, talents: [], skills: {}}], activeId: 1};
  hpUse(presets.list[0]);
  persistPreset();
  pageRender();
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
  if (PAGE_SOLO) { // 덮어쓸 내 빌드 고르기 (공유 글 수정 중인 사본은 뺀다)
    const rows = hpBuilds().list.filter(p => !p.shareEdit).sort((a, b) => b.id - a.id).filter(p => !q || (hpBpName(p) + ' ' + hpBpSub(p)).toLowerCase().includes(q)).map(p =>
      `<button type="button" class="hp-bpr" onclick="hpSoloOver(${p.id})"><span class="hp-bp-face">${hpBpFace(p)}</span>` +
      `<span class="hp-bpr-t"><b>${escapeHtml(hpBpName(p))}</b><small>${escapeHtml(hpBpSub(p))}</small></span></button>`).join('');
    return `<div class="hp-bp-list">${rows || (q ? '<div class="hp-bp-none">맞는 빌드가 없습니다</div>' : '')}</div>`;
  }
  // 시즌 칩 (2026-10-13 사용자 요청) — 기본은 지금 시즌만, 지금 빌드는 시즌이 달라도 늘 보인다
  const ses = [...new Set(presets.list.map(hpSeOf))].sort((a, b) => hpSeNum(b) - hpSeNum(a));
  if (!hpBpSe || ![...hpBpSe].some(l => ses.includes(l))) hpBpSe = new Set([ses.includes(cur) ? cur : hpSeOf(preset)]);
  const chips = ses.length > 1 ? '<div class="hp-bp-ses">' + ses.map(l => `<button type="button" class="share-se-chip${hpBpSe.has(l) ? ' on' : ''}" onclick="hpBpSeToggle('${l}')">${l} <small>${presets.list.filter(p => hpSeOf(p) === l && !p.shareEdit).length}</small></button>`).join('') + '</div>' : '';
  const rows = presets.list.slice().sort((a, b) => b.id - a.id).filter(p => !p.shareEdit || p.id === preset.id)
    .filter(p => p.id === preset.id || ses.length < 2 || hpBpSe.has(hpSeOf(p)))
    .filter(p => !q || (hpBpName(p) + ' ' + hpBpSub(p)).toLowerCase().includes(q)).map(p => {
      const on = p.id === preset.id;
      const title = hpBpRenId === p.id
        ? `<input class="hp-bpr-in" maxlength="30" value="${escapeHtml(p.name || '')}" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key==='Enter')this.blur();else if(event.key==='Escape'){hpBpRenId=0;hpBpDraw();}" onblur="hpBpRenSave(${p.id},this.value)">`
        : `<b>${escapeHtml(hpBpName(p))}</b>`;
      return `<div class="hp-bpr${on ? ' on' : ''}" role="button" onclick="hpBpPick(${p.id})">` +
        `<span class="hp-bp-face">${hpBpFace(p)}</span><span class="hp-bpr-t">${title}<small>${escapeHtml(hpBpSub(p))}</small></span>` +
        (p.season && cur && p.season !== cur ? `<span class="hp-bpr-se">${escapeHtml(p.season)}</span>` : '') +
        `<span class="hp-bpr-acts"><button type="button" title="이름 바꾸기" onclick="event.stopPropagation();hpBpRen(${p.id})">✎</button>` +
        `<button type="button" class="del" title="삭제" onclick="event.stopPropagation();hpBpDel(${p.id})">✕</button></span>` +
        (on ? '<span class="hp-bpr-ck">✓</span>' : '') + '</div>';
    }).join('');
  return `<div class="hp-bp-body">${chips}<div class="hp-bp-list">${rows || '<div class="hp-bp-none">맞는 빌드가 없습니다</div>'}</div></div>`;
}
function hpBpDraw() {
  const m = document.getElementById('hpBp'); if (!m) return;
  if (m.dataset.init) { const lst = m.querySelector('.hp-bp-list'), st = lst ? lst.scrollTop : 0; m.querySelector('.hp-bp-body').outerHTML = hpBpRows(); const l2 = m.querySelector('.hp-bp-list'); if (l2) l2.scrollTop = st; return; }
  m.dataset.init = '1';
  const n = PAGE_SOLO ? hpBuilds().list.filter(p => !p.shareEdit).length : presets.list.length;
  m.innerHTML = (PAGE_SOLO ? `<div class="hp-bp-cap">${HP_SOLO_WHAT[PAGE_SOLO]}만 바뀝니다 — 덮어쓸 빌드 고르기</div>` : '') + (n > 6 ? '<input class="hp-bp-q" type="search" placeholder="빌드 이름·히어로·스킬 검색" oninput="hpBpQ=this.value;hpBpDraw()"' +
    ' onkeydown="if(event.key===\'Enter\'){const b=document.querySelector(\'#hpBp .hp-bpr\');if(b)b.click();}">' : '') +
    hpBpRows() + (PAGE_SOLO ? '<div class="hp-bp-acts"><button type="button" class="hp-bp-new" onclick="hpSoloOver(0)">＋ 새 빌드로 저장</button></div>' : '') + (typeof hpBuildActs === 'function' ? '<div class="hp-bp-acts">' + hpBuildActs() + '</div>' : '');
}
let hpBpSe = null, hpBpRenId = 0;
const hpSeOf = p => p.season || 'SS13', hpSeNum = l => +String(l).replace(/\D/g, '') || 0;
function hpBpSeToggle(l) { if (hpBpSe.has(l)) { if (hpBpSe.size > 1) hpBpSe.delete(l); } else hpBpSe.add(l); hpBpDraw(); }
function hpBpRen(id) {
  hpBpRenId = id; hpBpDraw();
  const el = document.querySelector('#hpBp .hp-bpr-in'); if (el) { el.focus(); el.select(); }
}
function hpBpRenSave(id, v) {
  if (hpBpRenId !== id) return;
  hpBpRenId = 0;
  const p = presets.list.find(x => x.id === id), nm = String(v || '').trim().slice(0, 30);
  if (p && nm && nm !== p.name) { p.name = nm; persistPreset(); pageRender(); }
  hpBpDraw();
}
function hpBpDel(id) {
  const p = presets.list.find(x => x.id === id); if (!p) return;
  const go = () => {
    presets.list = presets.list.filter(x => x.id !== id);
    if (!presets.list.length) presets.list.push({id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}});
    if (presets.activeId === id || preset.id === id) { // 지금 빌드를 지우면 가장 최근 빌드로
      const nx = presets.list.filter(x => !x.shareEdit).sort((a, b) => b.id - a.id)[0] || presets.list[0];
      presets.activeId = nx.id; hpUse(nx);
    }
    persistPreset(); pageRender(); hpBpDraw();
  };
  const msg = `[${hpBpName(p)}] 빌드를 삭제할까요?`;
  if (typeof uiConfirm === 'function') uiConfirm(msg, go, {title: '빌드 삭제', ok: '삭제'}); else if (confirm(msg)) go();
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
  if (e.key !== HP_KEY) return;
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
    '아래 \'적용되는 효과\' = 지금 배치에서 실제로 걸리는 재능 옵션 합계 · 내 빌드와 별개로 이 화면에만 저장']],
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

// ── /tli/slate 단독 화면 — 석판 시뮬레이터 (2026-10-10, 사용자 요청: 빌더에서 석판 기능만) ──
// 화면은 빌더 2 의 석판 칸(wz_slate.js wsbRender)을 그대로 쓰고, 오른쪽 아래에 '적용되는 효과'(보드 파생 재능 행 합계)를 붙인다.
// 저장은 이 화면 전용 연습판(page_common.js PAGE_SOLO) — 내 빌드와 별개 (2026-10-13)
const wgOptHtml = (text, tips) => hlNums(tipWrapEffect(text, tips)); // wz_gear.js 와 같음 (장비 화면 전체는 안 싣는다)
function spEffects() { // rebuildSlateTalents 가 만든 석판 파생 행 (t.src 있는 것) — 같은 옵션은 ×개수, 배율은 ×배율
  const rows = (preset.talents || []).filter(t => t.src);
  if (!rows.length) return '<div class="wg-addd">석판을 놓고 소켓 옵션을 고르면 여기에 합계가 나옵니다.</div>';
  const tipsOf = t => (ALL_DATA.find(r => rowKey(r) === t.k) || {}).tips || null; // 옵션 용어 툴팁
  return rows.map(t => `<div class="sp-fx"><span>${wsbOptHtml({effect: t.effect, tips: tipsOf(t)})}</span>` +
    `<em>${t.cnt > 1 ? '×' + t.cnt + ' ' : ''}${t.mul && t.mul !== 1 ? '(효과 ×' + t.mul + ') ' : ''}<small>${escapeHtml((t.src || []).join(' · '))}</small></em></div>`).join('');
}
function pageRender() {
  wsbInit();
  rebuildSlateTalents(preset); // 저장소에서 읽은 빌드도 파생 행을 지금 데이터로 맞춘다
  const nfx = (preset.talents || []).filter(t => t.src).length;
  document.getElementById('slateApp').innerHTML = '<div class="gbm wsp"><div class="gbm-top"><b class="gbm-title">석판 시뮬레이터</b>' + gbmHelp('slate') + hpBuildPicker() +
    '<span class="gbm-keys"><kbd>클릭</kbd> 놓기 · 고르기 <span class="gbm-sep">·</span> <kbd>끌기</kbd> 옮기기 <span class="gbm-sep">·</span> 칸에 마우스를 올리면 옵션</span>' +
    '</div>' +
    `<div class="sp-main">${wsbRender()}<div class="wg-addbox sp-fxbox"><div class="wg-addh"><b>적용되는 효과</b><span>${nfx}줄</span></div>${spEffects()}</div></div></div>`;
}
function pageOnSwitch() { wsbSel = null; wsbPal = null; wsbSock = null; wsbMsg = ''; }
pageRender();
