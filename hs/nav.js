// /hs/ 아래 페이지들의 공통 헤더 — DB·증강·스킬·가이드·트래커·장터·가이드상세에 붙는다.
//
// 페이지마다 <script src="/hs/nav.js"></script> 한 줄이면 문서 맨 위에 붙는다.
// 레이아웃을 여기서 통일한다:
//  - body 여백을 0 으로 강제하고, 콘텐츠 폭/여백은 각 페이지 컨테이너가 var(--page-w) 로 맞춘다.
//  - 헤더는 순수 sticky(top:0) — 음수 마진 안 쓴다(스크롤 시 상단에서 떨어지던 버그 원인).
//  - 헤더 우측에 '와이드/표준' 폭 토글(선택값 localStorage 기억, 모든 페이지 공통 적용).
// 나중에 붙이는 큰 데이터 스크립트 — jsDelivr(이 nav.js 를 받아 온 같은 커밋) 먼저, 실패하면 우리 서버. 성공 여부를 돌려준다 (2026-10-14)
// 우리 워커는 한국 접속이 미국 거점이라 느리다(_dev/cdn_sync.py 참고). 올려 둘 파일 목록은 cdn_sync.py 의 LAZY
(() => {
  const me = document.currentScript && document.currentScript.src || '';
  const m = /^(https:\/\/cdn\.jsdelivr\.net\/gh\/(?:jslondo|win-terer)\/tools-cdn@[0-9a-f]+\/)/.exec(me);
  if (m) window.WT_CDN = m[1];
  window.wtScript = (path) => new Promise((res) => {
    const urls = window.WT_CDN ? [window.WT_CDN + path.replace(/^\//, '').split('?')[0], path] : [path];
    const go = (i) => {
      const s = document.createElement('script'); s.src = urls[i];
      s.onload = () => res(true);
      s.onerror = () => { s.remove(); if (i + 1 < urls.length) go(i + 1); else res(false); };
      document.head.appendChild(s);
    };
    go(0);
  });
})();
(() => {
  const path = location.pathname;
  const isTli = path.indexOf('/tli') === 0;
  // 토치 영어판 (2026-10-16) — 패치노트(한국어 정리본)·지난 시즌 보관본 빼고 토치 화면 전부. 영어 모드면 번역기(/tli/i18n/i18n.js)가
  // 그려진 글자를 사전으로 바꾼다. 번역이 끝날 때까지 본문을 감춰 한국어가 번쩍이지 않게(최대 4초).
  const tliI18n = isTli && !/^\/tli\/(preview|ss\d+)\b/.test(path);
  let tliEn = false;
  try { // ?lang=en|ko 로 들어오면 그 언어를 기억(영어 링크 공유용)
    const ql = new URLSearchParams(location.search).get('lang');
    if (tliI18n && (ql === 'en' || ql === 'ko')) localStorage.setItem('wt-lang', ql);
    tliEn = tliI18n && localStorage.getItem('wt-lang') === 'en';
  } catch (e) {}
  if (tliI18n) document.documentElement.setAttribute('data-i18n', '');
  if (tliEn) {
    const EN_I18N_V = 'bdaf614e18';
    document.documentElement.classList.add('wt-i18n-wait');
    const st = document.createElement('style'); st.textContent = 'html.wt-i18n-wait body{visibility:hidden!important}'; document.head.appendChild(st);
    setTimeout(() => document.documentElement.classList.remove('wt-i18n-wait'), 4000);
    const sc = document.createElement('script'); sc.src = '/tli/i18n/i18n.js?v=' + EN_I18N_V; document.head.appendChild(sc);
  }
  // 게임별 섹션 — 경로로 판별. 배지·탭이 바뀐다(브랜드/토글은 공통).
  // 배지 = 시리즈 이름 '미니토치DB'·'미니히시즈DB' (사용자들이 부르던 이름, 2026-10-15) — 마우스를 올리면 게임 이름
  const GAME = isTli ? (tliEn ? 'Mini Torch DB' : '미니토치DB') : '미니히시즈DB', GAME_FULL = isTli ? 'Torchlight: Infinite · 토치라이트 인피니트' : 'Hero Siege · 히어로시즈';
  const LINKS = isTli ? [
    // DB — 누르면 통합 검색, 하위 메뉴로 각 탭에 바로 (2026-10-10 사용자 요청). tab = DB 화면 ?tab= 값 (DB 화면 안에서는 새로 불러오지 않고 탭만 바꾼다)
    { label: 'DB', match: /^\/tli\/db/, kids: [
      { href: '/tli/db/?tab=total',    label: '통합 검색',   match: /^\/tli\/db/, tab: 'total' },
      { href: '/tli/db/?tab=all',      label: '장비 옵션',   match: /^\/tli\/db/, tab: 'all' },
      { href: '/tli/db/?tab=legend',   label: '레전드 장비', match: /^\/tli\/db/, tab: 'legend' },
      { href: '/tli/db/?tab=talent',   label: '재능·석판',   match: /^\/tli\/db/, tab: 'talent' },
      { href: '/tli/db/?tab=destiny',  label: '운명',        match: /^\/tli\/db/, tab: 'destiny' },
      { href: '/tli/db/?tab=pact',     label: '정령',        match: /^\/tli\/db/, tab: 'pact' },
      { href: '/tli/db/?tab=skill',    label: '스킬',        match: /^\/tli\/db/, tab: 'skill' },
      { href: '/tli/db/?tab=tartarus', label: '타르타로스 스킬', match: /^\/tli\/db/, tab: 'tartarus' },
    ] },
    { label: '빌더', match: /^\/tli\/(builder|talent|hero|slate|void)/, kids: [
      { href: '/tli/builder/', label: '빌더',      match: /^\/tli\/builder/ },
      { href: '/tli/hero/',    label: '히어로',    match: /^\/tli\/hero/ },
      { href: '/tli/talent/',  label: '재능 보드', match: /^\/tli\/talent/ },
      { href: '/tli/slate/',   label: '석판',      match: /^\/tli\/slate/ },
      { href: '/tli/void/',    label: '허공의 성도', match: /^\/tli\/void/ },   // 재능 별무리 시뮬레이터 (2026-10-16, 사용자: 빌더 아래로)
    ] },
    // 빌드 공유 — 히어로 빌드(/tli/share) · 파밍 빌드(허공의 성도 배치, /tli/farm) (2026-10-16 사용자)
    { label: '빌드 공유', match: /^\/tli\/(share|farm)/, kids: [
      { href: '/tli/share/', label: '히어로 빌드 공유', match: /^\/tli\/share/ },
      { href: '/tli/farm/',  label: '파밍 빌드 공유',   match: /^\/tli\/farm/ },
    ] },
    // 트래커 — 누르면 PC(TITrack-KR, 지인 Hoza), 하위로 모바일(mTTD, listil) (2026-10-14)
    { label: '트래커', match: /^\/tli\/tracker/, kids: [
      { href: '/tli/tracker/',        label: 'PC (TITrack-KR)', match: /^\/tli\/tracker\/(index\.html)?$/ },
      { href: '/tli/tracker/ttd/',    label: 'PC (TTD)',        match: /^\/tli\/tracker\/ttd/ },
      { href: '/tli/tracker/mobile/', label: '모바일 (mTTD)',   match: /^\/tli\/tracker\/mobile/ },
    ] },
    // 'SS14 관련' 묶음(패치노트·없는 변경)은 시즌 시작(2026-10-16)으로 메뉴에서 뺐다 — 페이지는 남김
  ] : [
    // 페이지가 늘어 탭이 9개가 되자 헤더가 빡빡해져, 성격이 같은 것끼리 묶었다(2026-09-19).
    // kids 가 있으면 눌러서 펼치는 묶음 탭이 된다.
    { label: '도감', match: /^\/hs\/(db|augments|skills|crystals)\//, kids: [
      { href: '/hs/db/',       label: '아이템',  match: /^\/hs\/db\// },
      { href: '/hs/augments/', label: '증강',    match: /^\/hs\/augments\// },
      { href: '/hs/crystals/', label: '사탄 수정', match: /^\/hs\/crystals\// },
      { href: '/hs/skills/',   label: '스킬',    match: /^\/hs\/skills\// },
    ] },
    { label: '트리', match: /^\/hs\/(tree|ether)\//, kids: [
      { href: '/hs/tree/',  label: '인카네이션', match: /^\/hs\/tree\// },
      { href: '/hs/ether/', label: '에테르',    match: /^\/hs\/ether\// },
    ] },
    { label: '가이드', match: /^\/hs\/(journal|guides)\//, kids: [
      { href: '/hs/guides/',  label: '빌드', match: /^\/hs\/guides\// },
      { href: '/hs/journal/', label: '저널', match: /^\/hs\/journal\// },
    ] },
    { label: '트래커', match: /^\/hs\/tracker/, kids: [
      { href: '/hs/tracker/',     label: '받기',      match: /^\/hs\/tracker\/(index\.html)?$/ },
      { href: '/hs/tracker/zone', label: '사탄존 로그', match: /^\/hs\/tracker\/zone/ },
    ] },
    // 장터(/hs/market/)는 쓰는 사람이 없어 메뉴에서 뺐다 (사용자 2026-10-14) — 페이지·주소는 그대로
  ];

  // 폭 선택값을 그리기 전에 <html> 에 먼저 반영(깜빡임 방지).
  let wide = true;
  try { wide = localStorage.getItem('wt-width') !== 'normal'; } catch (e) {}
  document.documentElement.classList.toggle('pw-normal', !wide);

  // 언어 — 공용 키(wt-lang). 각 페이지는 'wt-langchange' 이벤트에 반응해 전환한다(DB는 실시간).
  let lang = 'ko';
  try { lang = ((localStorage.getItem('wt-lang') || localStorage.getItem('hsdb-lang')) === 'en') ? 'en' : 'ko'; } catch (e) {}
  document.documentElement.lang = lang;

  // 이미지 숨김('눈치 모드') — 공용 키(wt-noimg). 기본=표시. 켜면 이미지 블러+클릭시 개별 표시.
  let noimg = false;
  try { noimg = localStorage.getItem('wt-noimg') === '1'; } catch (e) {}
  document.documentElement.classList.toggle('wt-noimg', noimg);

  // 서리 검 로고 — 집계 페이지(worker.js SWORD)와 동일. 룬의 아이들 '윈터러'(얼음 검)에서.
  const SWORD = `<svg class="mk" viewBox="13 2 22 44" width="11" height="22" aria-hidden="true"><defs><linearGradient id="wice-nav" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef6ff"/><stop offset=".45" stop-color="#bfe6ff"/><stop offset="1" stop-color="#6fa8bc"/></linearGradient></defs><circle cx="24" cy="6" r="2.5" fill="#6db7e0"/><rect x="22.3" y="8" width="3.4" height="6.6" rx="1" fill="#3f7fb0"/><rect x="15" y="14.8" width="18" height="3.2" rx="1.6" fill="#6db7e0"/><path d="M21.6 18 L26.4 18 L26 35 L24 44 L22 35 Z" fill="url(#wice-nav)" stroke="#e6f4ff" stroke-width=".5"/><line x1="24" y1="20" x2="24" y2="40" stroke="#88b9c9" stroke-width=".8"/><g stroke="#cfeeff" stroke-width="1" stroke-linecap="round" opacity=".9"><path d="M30 25 v3.4M28.3 26.7 h3.4"/><path d="M17.5 33 v2.6M16.2 34.3 h2.6"/></g></svg>`;

  const css = `
  :root { --page-w:1100px; --hubnav-h:44px; }
  /* ── 헤더는 페이지 CSS 에 휘둘리지 않는다 ──────────────────────────────
     페이지마다 :root 팔레트를 따로 두고( 전역 스타일시트가 없다 ), a/button/.tabs 같은
     전역 선택자도 제각각이라 헤더 색·글꼴·테두리가 페이지마다 달라졌다(2026-09-23).
     그래서 헤더는 자기 색을 직접 들고, 안쪽 요소는 전부 상속으로 되돌려 페이지 규칙이 새지 않게 한다. */
  .hubnav, .hubnav-menu, .hubnav-tip {
    --wtn-panel:#1b1013; --wtn-edge:#3a2226; --wtn-text:#e8dcc8; --wtn-dim:#9a8b8b; --wtn-gold:#e8c860;
    color:var(--wtn-text); letter-spacing:normal; text-transform:none; }
  .hubnav *, .hubnav-menu *, .hubnav-tip * {
    font:inherit; color:inherit; letter-spacing:inherit; text-transform:none; box-sizing:border-box; }
  html.pw-normal { --page-w:820px; }
  /* 이미지 숨김 모드: 콘텐츠 이미지를 블러 처리(레이아웃 유지), 클릭하면 그 이미지만 표시 */
  /* 이미지 숨김 모드: JS가 덮기 전엔 감춰 깜빡임 방지, 덮은 뒤엔 대체 박스(.wt-ph) 표시 */
  html.wt-noimg img:not(.wt-ph):not(.wt-revealed) { visibility: hidden !important; }
  html.wt-noimg #lb img, html.wt-noimg .imgpv img { visibility: visible !important; }
  html.wt-noimg img.wt-ph { visibility: visible !important; cursor: pointer !important; filter: none !important; }
  html, body { margin:0 !important; }
  /* body 에 height:100% 가 있으면 sticky 헤더가 화면 한 칸 높이만 붙고 사라진다 — 콘텐츠 높이로 강제 */
  html, body { height:auto !important; }
  body { padding:0 !important; min-height:100vh; }
  .hubnav { position:sticky; top:0; z-index:50; display:flex; align-items:center; gap:2px;
    height:var(--hubnav-h); padding:0 16px; box-sizing:border-box;
    background:var(--wtn-panel); border-bottom:1px solid var(--wtn-edge);
    font-size:13px;
    /* 글꼴은 페이지에 안 따라가고 고정 — 스킬(Pretendard)·가이드(-apple-system) 에서 헤더가 작게 보이던 것 통일(DB·트래커 기준) */
    font-family:system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; line-height:1.6; letter-spacing:normal; }
  .hubnav .home { display:inline-flex; align-items:center; gap:5px; margin-right:12px;
    text-decoration:none; font-weight:700; letter-spacing:-.2px; white-space:nowrap; font-size:14px; }
  .hubnav .home .mk { flex:none; }
  .hubnav .home .brandwm { background:linear-gradient(100deg,#eef6ff,#bfe6ff 45%,#7fb8c8);
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  .hubnav .game { display:inline-flex; align-items:center; margin-right:12px; padding:2px 9px;
    font-size:12px; font-weight:600; white-space:nowrap;
    color:var(--wtn-gold); background:color-mix(in srgb, var(--wtn-gold) 12%, transparent);
    border:1px solid color-mix(in srgb, var(--wtn-gold) 30%, transparent); border-radius:20px; }
  /* 탭 묶음 — 좁은 화면에선 줄바꿈·글자 세로 깨짐 대신 가로 스크롤(스크롤바 숨김) */
  .hubnav .tabs { display:flex; align-items:center; gap:2px; position:relative; min-width:0; flex:0 1 auto;
    overflow-x:auto; overflow-y:hidden; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
  .hubnav .tabs::-webkit-scrollbar { display:none; }
  .hubnav a.tab { flex:none; white-space:nowrap; padding:0 12px; line-height:var(--hubnav-h);
    color:var(--wtn-dim); text-decoration:none; border-bottom:2px solid transparent; }
  .hubnav a.tab:hover { color:var(--wtn-text); }
  .hubnav a.tab[aria-current] { color:var(--wtn-gold); border-bottom-color:var(--wtn-gold); }
  /* 묶음 탭: 이름(링크) + ▼(펼침) 을 한 칸처럼 보이게 */
  .hubnav .tabwrap { flex:none; display:inline-flex; align-items:center; border-bottom:2px solid transparent; }
  .hubnav .tabwrap > a.tab { padding-right:3px; border-bottom:0; }
  .hubnav .tabwrap[aria-current] { border-bottom-color:var(--wtn-gold); }
  .hubnav .tabwrap[aria-current] > a.tab { color:var(--wtn-gold); }
  .hubnav .caret { background:none; border:0; padding:0 9px 0 2px; font-size:9px; line-height:var(--hubnav-h);
    color:var(--wtn-dim); cursor:pointer; opacity:.75; }
  .hubnav .tabwrap:hover .caret, .hubnav .caret:hover { color:var(--wtn-text); opacity:1; }
  /* 펼침 메뉴는 탭 줄(overflow-x:auto)에 잘리지 않도록 화면 기준으로 띄운다 */
  .hubnav-menu { position:fixed; z-index:101; display:none; min-width:132px; padding:4px;
    background:var(--wtn-panel); border:1px solid var(--wtn-edge); border-radius:8px;
    box-shadow:0 8px 24px rgba(0,0,0,.5); }
  .hubnav-menu.open { display:block; }
  .hubnav-menu a { display:block; padding:6px 12px; border-radius:6px; font-size:13px; text-decoration:none;
    color:var(--wtn-dim); white-space:nowrap; }
  .hubnav-menu a:hover { color:var(--wtn-text); background:color-mix(in srgb, currentColor 10%, transparent); }
  .hubnav-menu a[aria-current] { color:var(--wtn-gold); }
  @media (hover: none), (max-width: 760px) { .hubnav-menu { min-width:170px; padding:6px; } .hubnav-menu a { padding:11px 14px; font-size:14.5px; } }
  .hubnav .spacer { flex:1; }
  .hubnav .wtoggle, .hubnav .langtoggle { display:inline-flex; align-items:center; gap:5px; cursor:pointer;
    background:transparent; color:var(--wtn-dim);
    border:1px solid var(--wtn-edge); border-radius:7px;
    padding:5px 10px; font-size:12px; font-weight:600; white-space:nowrap; }
  .hubnav .wtoggle:hover, .hubnav .langtoggle:hover { color:var(--wtn-gold); border-color:var(--wtn-gold); }
  .hubnav .wtoggle .ic, .hubnav .langtoggle .ic { font-size:13px; line-height:1; }
  .hubnav .langtoggle { margin-right:6px; }
  .hubnav .wtoggle { padding:5px 8px; }
  .hubnav .wtoggle svg { display:block; }
  .hubnav .imgtoggle { display:inline-flex; align-items:center; cursor:pointer; background:transparent;
    color:var(--wtn-dim); border:1px solid var(--wtn-edge); border-radius:7px; padding:5px 8px; margin-right:6px; }
  .hubnav .imgtoggle:hover { color:var(--wtn-gold); border-color:var(--wtn-gold); }
  .hubnav .imgtoggle svg { display:block; }
  .hubnav .imgtoggle.on { color:var(--wtn-gold); border-color:var(--wtn-gold); }
  .hubnav-tip { position:fixed; z-index:100; display:none; background:var(--wtn-panel); color:var(--wtn-text);
    border:1px solid var(--wtn-edge); border-radius:6px; padding:6px 10px; font-size:12px; line-height:1.5;
    max-width:min(260px, calc(100vw - 16px)); box-shadow:0 6px 20px rgba(0,0,0,.5); pointer-events:none; }
  @media(max-width:560px){
    .hubnav { padding:0 8px; gap:0; }
    .hubnav .home { margin-right:6px; }
    .hubnav .home .brandwm { display:none; }   /* 좁으면 검 아이콘만 (허브 링크 유지) */
    .hubnav .tabs { gap:0; }
    .hubnav a.tab { padding:0 7px; } .hubnav .caret { padding:0 6px 0 1px; }
    .hubnav .spacer { flex:0 0 6px; }   /* 탭이 폭을 다 쓰도록 여백 최소화 */
    .hubnav .game { display:none; }
    .hubnav .langtoggle { margin-right:4px; padding:5px 7px; }
    .hubnav .wtoggle { padding:5px 7px; }
    .hubnav .langtoggle .tx, .hubnav .wtoggle .tx { display:none; }   /* 토글은 아이콘만 */
  }
  @media(max-width:420px){   /* 아주 좁은 폰 — 마지막 탭이 끝에 붙어 잘리던 것 (2026-10-15) */
    .hubnav a.tab { padding:0 5px; font-size:12.5px; } .hubnav .caret { padding:0 4px 0 0; }
    .hubnav .home { margin-right:3px; } .hubnav .spacer { flex:0 0 2px; }
  }`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.className = 'hubnav';
  nav.innerHTML =
    `<a class="home" href="/" title="Winterer's Tools 허브">${SWORD}<span class="brandwm">Winterer's Tools</span></a>` +
    `<span class="game" title="${GAME_FULL}">${GAME}</span>` +
    `<div class="tabs">` + LINKS.map((l, i) => l.kids
      // 묶음 탭도 누르면 첫 항목으로 간다(하위를 고르지 않아도 되게). 펼침은 마우스를 올리거나 ▼ 를 누를 때.
      ? `<span class="tabwrap"${l.match.test(path) ? ' aria-current="page"' : ''} data-menu="${i}">` +
        `<a class="tab" href="${l.kids[0].href}">${l.label}</a>` +
        `<button class="caret" type="button" data-menu="${i}" aria-expanded="false" aria-label="${l.label} 하위 메뉴">▼</button></span>`
      : `<a class="tab" href="${l.href}"${l.match.test(path) ? ' aria-current="page"' : ''}>${l.label}</a>`
    ).join('') + `</div>` +
    `<span class="spacer"></span>` +
    // 언어 토글은 그 페이지가 한영을 지원할 때만(html[data-i18n]) 헤더에 넣는다 — 현재 DB.
    (document.documentElement.hasAttribute('data-i18n')
      ? `<button class="langtoggle" type="button" aria-label="언어 전환"></button>` : '') +
    `<button class="imgtoggle" type="button" aria-label="이미지 표시/숨김"></button>` +
    `<button class="wtoggle" type="button" aria-label="콘텐츠 폭 전환"></button>`;

  const touchMode = () => matchMedia('(hover: none)').matches || innerWidth <= 760;
  // 묶음 탭의 펼침 메뉴 — 누르면 열리고, 바깥을 누르거나 Esc·스크롤이면 닫힌다. (휴대폰은 최상위 탭 = 열기, 스크롤에도 유지)
  const wireMenus = () => {
    const menus = LINKS.map((l, i) => {
      if (!l.kids) return null;
      const m = document.createElement('div');
      m.className = 'hubnav-menu';
      const curTab = new URLSearchParams(location.search).get('tab');
      m.innerHTML = l.kids.map((k, j) =>
        `<a href="${k.href}" data-k="${j}"${k.match && k.match.test(path) && (!k.tab || k.tab === curTab) ? ' aria-current="page"' : ''}>${k.label}</a>`).join('');
      // 같은 화면 안의 탭(DB)이면 새로 불러오지 않고 탭만 바꾼다
      m.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-k]'), k = a && l.kids[+a.dataset.k];
        if (k && k.tab && k.match.test(path) && typeof window.switchTab === 'function') {
          e.preventDefault(); m.classList.remove('open');
          window.switchTab(k.tab);
          m.querySelectorAll('a').forEach((x) => x.toggleAttribute('aria-current', x === a));
        }
      });
      document.body.appendChild(m);
      return { el: m, btn: nav.querySelector(`button.caret[data-menu="${i}"]`), wrap: nav.querySelector(`span.tabwrap[data-menu="${i}"]`) };
    }).filter(Boolean);
    const closeAll = () => menus.forEach((x) => {
      x.el.classList.remove('open'); x.btn.setAttribute('aria-expanded', 'false');
    });
    menus.forEach((x) => {
      const open = () => {
        closeAll();
        const r = (x.wrap || x.btn).getBoundingClientRect();
        x.el.style.left = Math.min(r.left, innerWidth - 150) + 'px';
        x.el.style.top = r.bottom + 2 + 'px';
        x.el.classList.add('open'); x.btn.setAttribute('aria-expanded', 'true'); x.at = Date.now();
      };
      // 막 열린 메뉴(마우스를 올려 열린 직후 누른 경우)는 그 클릭으로 닫지 않는다
      const toggle = (e) => { e.preventDefault(); e.stopPropagation(); if (!x.el.classList.contains('open')) open(); else if (Date.now() - (x.at || 0) > 400) closeAll(); };
      x.btn.addEventListener('click', toggle);
      // 휴대폰(터치·좁은 화면): 최상위 탭을 누르면 이동하지 않고 하위 메뉴를 연다 — ▼ 가 작아 하위 메뉴를 못 보던 문제 (2026-10-10)
      const tabA = x.wrap && x.wrap.querySelector('a.tab');
      if (tabA) tabA.addEventListener('click', (e) => { if (touchMode()) toggle(e); });
      // 마우스가 있는 환경에서는 탭에 올려놓기만 해도 열린다(터치는 ▼ 를 눌러서)
      if (matchMedia('(hover:hover)').matches) {
        const host = x.wrap || x.btn;
        host.addEventListener('mouseenter', open);
        const leave = () => { if (!x.el.matches(':hover') && !host.matches(':hover')) closeAll(); };
        host.addEventListener('mouseleave', () => setTimeout(leave, 160));
        x.el.addEventListener('mouseleave', () => setTimeout(leave, 160));
      }
    });
    addEventListener('click', closeAll);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
    // 휴대폰에선 스크롤·주소창 접힘(resize)에도 닫지 않는다 — 헤더가 위에 붙어 있어 메뉴 자리도 그대로 (바깥 누르기·Esc 로 닫음)
    addEventListener('scroll', () => { if (!touchMode()) closeAll(); }, { passive: true });
    addEventListener('resize', () => { if (!touchMode()) closeAll(); });
    const tabsEl = nav.querySelector('.tabs'); if (tabsEl) tabsEl.addEventListener('scroll', closeAll, { passive: true }); // 탭 줄을 옆으로 밀면 자리가 어긋나니 닫음
  };

  const put = () => {
    document.body.insertBefore(nav, document.body.firstChild);
    wireMenus();
    // 탭이 넘칠 때 현재 탭이 가운데 오도록(모바일). 페이지 세로 스크롤은 건드리지 않게 scrollLeft 만 조정.
    const tabs = nav.querySelector('.tabs'), cur = tabs && tabs.querySelector('[aria-current]');
    if (cur && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = cur.offsetLeft - (tabs.clientWidth - cur.offsetWidth) / 2;
    // 폭 토글 — 텍스트 대신 아이콘(언어 무관). 화면 프레임 안 콘텐츠 폭을 그대로 그려 현재 상태를 보여준다.
    const btn = nav.querySelector('.wtoggle');
    const widthIcon = (wideNow) => {
      const inner = wideNow
        ? '<rect x="2.5" y="5" width="15" height="6" rx="1" fill="currentColor"/>'
        : '<rect x="6" y="5" width="8" height="6" rx="1" fill="currentColor"/>';
      return `<svg width="17" height="14" viewBox="0 0 20 16" aria-hidden="true">` +
        `<rect x="1" y="2" width="18" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".55"/>${inner}</svg>`;
    };
    const paint = () => {
      const isWide = !document.documentElement.classList.contains('pw-normal');
      btn.innerHTML = widthIcon(isWide);
      btn.setAttribute('data-tip', isWide ? '콘텐츠 폭: 와이드 — 클릭하면 표준(좁게)' : '콘텐츠 폭: 표준 — 클릭하면 와이드(넓게)');
    };
    btn.addEventListener('click', () => {
      const toNormal = !document.documentElement.classList.contains('pw-normal');
      document.documentElement.classList.toggle('pw-normal', toNormal);
      try { localStorage.setItem('wt-width', toNormal ? 'normal' : 'wide'); } catch (e) {}
      paint();
    });
    paint();
    // ── 이미지 숨김: 대체 박스로 덮기(원본 src 보관) / 클릭 시 복원 ──
    const H = document.documentElement;
    const phSVG = (w, h) => {
      w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
      const fs = Math.max(9, Math.min(13, Math.round(Math.min(w, h) / 7)));
      const two = h >= 40 && w >= 70;
      const txt = two
        ? `<text x='50%' y='${h/2 - 2}' fill='#8b93a6' font-size='${fs}' font-family='sans-serif' text-anchor='middle'>이미지</text><text x='50%' y='${h/2 + fs + 1}' fill='#6b7386' font-size='${Math.max(8,fs-1)}' font-family='sans-serif' text-anchor='middle'>눌러서 보기</text>`
        : `<text x='50%' y='54%' dy='.35em' fill='#8b93a6' font-size='${Math.min(fs,11)}' font-family='sans-serif' text-anchor='middle'>이미지</text>`;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='#20242f' rx='4'/><rect x='1.5' y='1.5' width='${w-3}' height='${h-3}' rx='3' fill='none' stroke='#3a4256' stroke-dasharray='4 3'/>${txt}</svg>`;
      return 'data:image/svg+xml,' + encodeURIComponent(svg);
    };
    const isContentImg = (img) => img && img.tagName === 'IMG' && !(img.closest && img.closest('#lb, .imgpv'));
    const coverImg = (img) => {
      if (!isContentImg(img) || img.dataset.osrc !== undefined || img.classList.contains('wt-revealed')) return;
      const apply = () => {
        if (img.dataset.osrc !== undefined || !H.classList.contains('wt-noimg') || img.classList.contains('wt-revealed')) return;
        const r = img.getBoundingClientRect();
        let w = r.width, h = r.height;
        if (w < 4 || h < 4) { w = img.naturalWidth || 80; h = img.naturalHeight || 60; }
        img.dataset.osrc = img.getAttribute('src') || '';
        if (r.width > 4) img.style.width = r.width + 'px';
        if (r.height > 4) img.style.height = r.height + 'px';
        img.setAttribute('src', phSVG(w, h));
        img.classList.add('wt-ph');
      };
      if (img.complete) apply();
      else img.addEventListener('load', apply, { once: true });
    };
    const uncoverImg = (img) => {
      if (img.dataset.osrc === undefined) return;
      img.setAttribute('src', img.dataset.osrc);
      delete img.dataset.osrc;
      img.style.width = ''; img.style.height = '';
      img.classList.remove('wt-ph');
    };
    const applyNoimg = (on) => {
      if (on) { document.querySelectorAll('img.wt-revealed').forEach(i => i.classList.remove('wt-revealed')); document.querySelectorAll('img').forEach(coverImg); }
      else document.querySelectorAll('img[data-osrc], img.wt-ph').forEach(uncoverImg);
    };
    // 재렌더로 새로 생기는 이미지도 덮기(숨김 모드일 때만)
    new MutationObserver((muts) => {
      if (!H.classList.contains('wt-noimg')) return;
      muts.forEach(m => m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') coverImg(n);
        else if (n.querySelectorAll) n.querySelectorAll('img').forEach(coverImg);
      }));
    }).observe(document.body, { childList: true, subtree: true });

    // 이미지 숨김 토글 — 눈 아이콘(현재 상태 표시). 클릭 시 저장 + 클래스 토글.
    const ib = nav.querySelector('.imgtoggle');
    const eyeOn = '<svg width="17" height="14" viewBox="0 0 20 16" aria-hidden="true"><path d="M10 3.2C5.3 3.2 2 7.2 1.2 8c.8.8 4.1 4.8 8.8 4.8S18 8.8 18.8 8C18 7.2 14.7 3.2 10 3.2z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="10" cy="8" r="2.2" fill="currentColor"/></svg>';
    const eyeOff = '<svg width="17" height="14" viewBox="0 0 20 16" aria-hidden="true"><path d="M10 3.2C5.3 3.2 2 7.2 1.2 8c.8.8 4.1 4.8 8.8 4.8S18 8.8 18.8 8C18 7.2 14.7 3.2 10 3.2z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/><circle cx="10" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1" opacity=".45"/><line x1="3" y1="2.5" x2="17" y2="13.5" stroke="currentColor" stroke-width="1.6"/></svg>';
    const paintImg = () => {
      const off = document.documentElement.classList.contains('wt-noimg');
      ib.innerHTML = off ? eyeOff : eyeOn;
      ib.classList.toggle('on', off);
      ib.setAttribute('data-tip', off ? '이미지 숨김 켜짐 — 클릭하면 다시 표시 (숨겨진 이미지를 누르면 그것만 표시)' : '이미지 표시 중 — 클릭하면 숨김(눈치 모드)');
    };
    ib.addEventListener('click', () => {
      const now = !document.documentElement.classList.contains('wt-noimg');
      document.documentElement.classList.toggle('wt-noimg', now);
      try { localStorage.setItem('wt-noimg', now ? '1' : '0'); } catch (e) {}
      applyNoimg(now);
      paintImg();
    });
    paintImg();
    if (H.classList.contains('wt-noimg')) applyNoimg(true);   // 로드 시 이미 켜져 있으면 덮기
    // 숨김 모드에서 대체박스 클릭 → 그 이미지만 복원(캡처 단계로 페이지 핸들러보다 먼저 가로챔)
    document.addEventListener('click', (e) => {
      if (!document.documentElement.classList.contains('wt-noimg')) return;
      const t = e.target;
      if (t && t.tagName === 'IMG' && t.classList.contains('wt-ph')) {
        t.classList.add('wt-revealed'); uncoverImg(t); e.stopPropagation(); e.preventDefault();
      }
    }, true);
    // 언어 토글 — 지원 페이지에서만 존재. 클릭 시 저장 + <html lang> 갱신 + 이벤트 발행.
    const lbtn = nav.querySelector('.langtoggle');
    if (lbtn) {
      const paintLang = () => {
        const cur = document.documentElement.lang === 'en' ? 'en' : 'ko';
        lbtn.innerHTML = `<span class="ic">🌐</span><span class="tx">${cur === 'en' ? 'English' : '한국어'}</span>`;
        lbtn.setAttribute('data-tip', cur === 'en' ? '언어: English — 클릭하면 한국어' : '언어: 한국어 — 클릭하면 English');
      };
      lbtn.addEventListener('click', () => {
        const next = document.documentElement.lang === 'en' ? 'ko' : 'en';
        document.documentElement.lang = next;
        try { localStorage.setItem('wt-lang', next); } catch (e) {}
        paintLang();
        window.dispatchEvent(new CustomEvent('wt-langchange', { detail: next }));
        if (tliI18n) { const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString()); } // 토치 화면은 다시 불러와 번역기를 켜고 끈다
      });
      paintLang();
    }
    // 헤더 아이콘 커스텀 툴팁 — 시스템 title 대신, 뷰포트 안으로 클램프(모바일 오른쪽 잘림 방지)
    const navTip = document.createElement('div'); navTip.className = 'hubnav-tip'; document.body.appendChild(navTip);
    const showNavTip = (el) => {
      const txt = el.getAttribute('data-tip'); if (!txt) { navTip.style.display = 'none'; return; }
      navTip.textContent = txt; navTip.style.display = 'block';
      const r = el.getBoundingClientRect();
      navTip.style.top = Math.min(r.bottom + 6, innerHeight - navTip.offsetHeight - 6) + 'px';
      let left = r.left + r.width / 2 - navTip.offsetWidth / 2;
      left = Math.max(8, Math.min(left, innerWidth - navTip.offsetWidth - 8));  // 좌우 뷰포트 클램프
      navTip.style.left = left + 'px';
    };
    const hideNavTip = () => { navTip.style.display = 'none'; };
    nav.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-tip]'); if (b) showNavTip(b); });
    nav.addEventListener('mouseout', (e) => { const b = e.target.closest('[data-tip]'); if (b && !b.contains(e.relatedTarget)) hideNavTip(); });
    nav.addEventListener('click', hideNavTip);   // 클릭(토글)하면 툴팁 닫기
  };
  // <body> 첫 줄에 놓이면 body 가 이미 있으니 바로 붙인다 — 헤더가 본문(무거운 data.js 포함)보다 먼저 그려지고
  // 폭/언어/이미지 설정도 첫 페인트 전에 반영된다. 이후 파서가 넣는 이미지는 위 MutationObserver 가 받는다.
  document.body ? put() : addEventListener('DOMContentLoaded', put);

  // ── 이용 기록 (2026-10-10, 미니토치DB → HS 도 같이) — 우리 D1 에 쌓고 /admin/dash(tools 대시보드)에서 본다. 운영 주소에서만(미리보기·로컬 제외), 관리 화면 제외
  //  · 페이지 방문: 열 때 1회 /api/pg (서버가 조회·하루 순방문을 센다, IP 는 해시만)
  //  · 기능 사용: window.wtEv(이름, {q, tab}) → /api/ev — 같은 화면에서 같은 이벤트는 1번(검색 실패어는 검색어마다, 최대 8개)
  //  · 화면 오류: 스크립트 오류를 /api/err 로 (화면당 최대 3건, 확장 프로그램·다른 도메인 스크립트의 'Script error.' 는 뺀다)
  const LIVE = location.hostname === 'tools.winterer.workers.dev';
  if (!path.startsWith('/admin')) {  // 두 게임 모두 (tools 전체 대시보드 /admin/dash)
    const post = (u, o) => { if (!LIVE) return; try { fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o), keepalive: true }).catch(() => {}); } catch (e) {} };
    const mode = () => document.documentElement.dataset.tliMode;
    const hsm = /^\/hs\/(db|augments|skills|crystals|tree|ether|journal|guides|tracker|market)(\/|$)/.exec(path);
    const pg = hsm ? 'hs_' + hsm[1] : path.startsWith('/tli/slate') ? 'slate' : path.startsWith('/tli/void') ? 'void' : path.startsWith('/tli/farm') ? 'farm' : !isTli ? '' : /^\/tli\/ss\d+\/db/.test(path) ? 'ss_db' : /^\/tli\/ss\d+\/view/.test(path) ? 'ss_view'
      : path.startsWith('/tli/db') ? 'db' : path.startsWith('/tli/share') ? 'share' : path.startsWith('/tli/view') ? 'view'
      : path.startsWith('/tli/hero') ? 'hero' : path.startsWith('/tli/tracker/mobile') ? 'tracker_m' : path.startsWith('/tli/tracker/ttd') ? 'tracker_t' : path.startsWith('/tli/tracker') ? 'tracker' : path.startsWith('/tli/talent') ? 'talent'
      : path.startsWith('/tli/preview/changes') ? 'changes' : path.startsWith('/tli/preview') ? 'notes'
      // /tli/builder/ = 새 빌더, 같은 주소의 옛 빌더(쿼리·craft_search)는 hub_head 가 data-tli-mode='builder' 를 단다
      : path.startsWith('/tli/builder') ? (mode() === 'builder' ? 'oldbuilder' : 'builder') : '';
    if (pg) post('/api/pg', { pg });
    const sent = new Set(); let misses = 0;
    window.wtEv = (ev, o) => {
      o = o || {};
      const k = ev === 'search_miss' ? ev + '|' + (o.tab || '') + '|' + (o.q || '') : ev;
      if (sent.has(k) || (ev === 'search_miss' && ++misses > 8)) return;
      sent.add(k); post('/api/ev', Object.assign({ ev }, o));
    };
    let errs = 0;
    const report = (msg, src, line) => {
      if (!msg || errs >= 3 || /^Script error\.?$/.test(msg) || /extension:\/\//.test(src || '')) return;
      errs++; post('/api/err', { pg: path + (mode() && mode() !== 'builder' ? '#' + mode() : ''), msg: String(msg).slice(0, 220) + (src ? ' @' + String(src).split('/').pop().split('?')[0] + ':' + (line || '') : '') });
    };
    addEventListener('error', (e) => { if (e && e.message) report(e.message, e.filename, e.lineno); });
    addEventListener('unhandledrejection', (e) => { const r = e && e.reason; report('(promise) ' + (r && r.message || String(r)), r && r.stack && (r.stack.match(/https?:\/\/[^\s)]+/) || [])[0]); });
  }

  // Cloudflare Web Analytics — 유입 경로·국가·기기 통계(무료·쿠키 없음·개인 식별 없음).
  // 우리 D1 집계는 '얼마나 쓰는지', 이쪽은 '어디서 오는지' 를 본다. 토큰은 공개 값이라 그대로 둬도 된다.
  // 관리자 화면(/admin)과 로컬 개발은 제외. 값이 비어 있으면 아예 안 붙는다.
  const CF_BEACON = '10a8aee2bcfd4de9abdc2d3f6a3d51ad';
  if (CF_BEACON && !location.pathname.startsWith('/admin') && location.hostname.endsWith('workers.dev')) {
    addEventListener('load', () => {
      const sc = document.createElement('script');
      sc.type = 'module';   // Cloudflare 가 주는 스니펫 그대로 — 모듈 스크립트라 알아서 지연 실행된다
      sc.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      sc.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON }));
      document.head.appendChild(sc);
    });
  }
})();
