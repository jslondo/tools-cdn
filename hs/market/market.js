// 교환 장터 공용 스크립트 — 도감 데이터(/hs/db/data.js, window.CODEX) 조회·자동완성·툴팁·API 래퍼·내 정보 보관
// 페이지: index.html(목록) · post.html(등록/수정/내 글) · admin.html(관리자)
(() => {
  const RCOLOR = { Satanic: '#ff6a6a', Set: '#40d040', Heroic: '#00ffae', Angelic: '#f6f794', Unholy: '#e04a7a', Runeword: '#b98cff' };
  // uid·아이콘 파일명 규칙은 도감/가이드 뷰어와 같아야 한다
  const uidOf = (it) => (it.rw ? 'rw:' : '') + (it.icf || it.name);
  const iconName = (n) => n.replace(/[^0-9A-Za-z \-_']/g, '_');
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 언어 — 허브 공용(nav.js 가 <html lang> 에 반영, 토글 시 'wt-langchange'). 영문이면 아이템 영문명·data_en.js 옵션을 쓴다
  let lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  let enLoading = null;
  function loadEn() { // /hs/db/data_en.js — 영문 옵션·분류명 오버레이(window.CODEX_EN), 영문일 때만 한 번
    if (window.CODEX_EN) return Promise.resolve();
    if (enLoading) return enLoading;
    enLoading = new Promise((res) => { const sc = document.createElement('script'); sc.src = '/hs/db/data_en.js'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
    return enLoading;
  }
  if (lang === 'en') loadEn();
  const EN = () => (lang === 'en' ? window.CODEX_EN : null);

  // UI 문구 사전 — 정적 요소는 data-t(텍스트)·data-tp(placeholder)·data-tt(title), 동적 문구는 MK.T(key)
  const DICT = {
    ko: {
      title: '🛒 교환 장터', pv: 'BETA',
      foot: '운영·문의 — 디스코드 <b>win.terer</b> · 규칙 위반 글 신고도 이쪽으로',
      beta: '<b>베타 운영 중</b> — 막 열어서 화면과 기능이 계속 바뀔 수 있고, 예상 못 한 오류가 있을 수 있습니다.',
      sub: (d = 3) => `아이템 <b>물물교환</b> 게시판 — 서버를 고르고, 아이템을 검색해서 <b>가진 사람</b>·<b>찾는 사람</b>을 찾아 디스코드로 연락하세요. <b>Hero Siege에는 귓말 기능이 없어서</b>, 디스코드가 없는 글은 인게임에서 그 닉네임이 열어 둔 방에 직접 접속해야 합니다. 글은 등록·끌올 후 <b>${d}일</b> 뒤 자동으로 내려갑니다. 현금 거래 글은 삭제됩니다.`,
      search_ph: '아이템 검색 (한글·영문)', tab_all: '전체', tab_have: '가진 사람', tab_want: '찾는 사람', tab_have_tt: '이 아이템을 가진 사람', tab_want_tt: '이 아이템을 찾는 사람',
      write: '＋ 글 쓰기', mine: '내 글', loading: '불러오는 중…', no_servers: '서버 목록을 불러올 수 없습니다.',
      // 저장소 하루 한도를 다 썼을 때 — 고장이 아니라 '오늘 치를 다 썼다'는 상태다
      rest_ttl: '🔧 장터가 잠시 쉬고 있습니다', rest_why: '오늘 쓸 수 있는 양을 다 써서 잠시 닫았습니다.',
      rest_when: '내일 오전 9시에 저절로 다시 열립니다.',
      rest_else: '그동안 이런 건 그대로 보실 수 있어요', rest_db: '아이템 도감', rest_guide: '빌드 가이드', rest_tree: '인카네이션',
      // 블팩 서버 추가 요청 (팝업)
      req_btn: '🏰 블팩 추가 요청', req_btn_tt: '내 블러드팩 서버를 목록에 추가해 달라고 요청', gate_req: '내 블팩이 목록에 없나요? <a id="req-open2">서버 추가 요청하기</a>',
      req_ttl: '🏰 블팩 서버 추가 요청', req_sub: '블러드팩 이름을 알려주시면 확인 후 서버 목록에 추가합니다. 보통 하루 안에 처리되고, 추가되면 서버 목록에 바로 나타납니다.',
      req_name: '블팩 이름 (인게임 표기) *', req_name_ph: '예: Fubgun', req_name_ko: '한글 표기 <small>(선택)</small>', req_name_ko_ph: '예: 펍건 블팩 — 비우면 원문 그대로',
      req_dc: '디스코드 ID *', req_dc_ph: '확인이 필요할 때 연락드립니다', req_dc_hint: '공개되지 않고 관리자만 봅니다.',
      req_members: '대략 인원 <small>(선택)</small>', req_members_ph: '예: 30', req_memo: '한마디 <small>(선택, 150자)</small>', req_memo_ph: '예: 저는 ○○ 블팩 주최자 △△입니다. 한국인 위주로 30명쯤 활동하고 있어요',
      req_private: '<b>비공개 서버</b>로 운영 — 서버 목록에 뜨지 않고, 초대 링크를 아는 사람만 들어올 수 있습니다. 추가되면 초대 링크를 이 화면에서 받아 블팩 사람들에게 공유하세요.',
      req_send: '요청 보내기', req_sending: '보내는 중…', req_cancel: '취소', req_close: '닫기',
      req_e_name: '블팩 이름을 입력해주세요.', req_e_dc: '디스코드 ID를 입력해주세요.',
      req_done_h: '요청을 보냈습니다', req_done_sub: (n) => `<b>${n}</b> 서버 추가 요청이 접수됐습니다. 관리자가 확인한 뒤 추가되며, 결과는 다음에 이 브라우저로 방문하실 때 위쪽에 표시해 드립니다.`,
      req_exists: '이미 있는 서버예요 — 목록에서 골라 바로 쓰시면 됩니다.', req_pending_dup: '같은 이름의 요청이 이미 접수되어 처리를 기다리고 있어요.',
      req_st_pending: (n) => `🏰 <b>${n}</b> 서버 추가 요청 — 관리자 확인을 기다리고 있습니다.`,
      req_st_ok: (n) => `✅ 요청하신 <b>${n}</b> 서버가 추가됐습니다!`, req_st_pick: '그 서버로 보기',
      req_st_ok_priv: (n) => `✅ 요청하신 <b>${n}</b> 서버가 <b>비공개</b>로 추가됐습니다. 아래 초대 링크를 블팩 사람들에게 공유하세요 — 링크로 들어온 브라우저에만 보입니다.`,
      req_st_no: (n, r) => `❌ <b>${n}</b> 서버 추가 요청이 반영되지 않았습니다.${r ? ' 사유: ' + r : ''}`,
      priv_on: (n) => `🔒 <b>${n}</b> — 비공개 서버입니다. 초대 링크로 들어온 브라우저에만 보이고, 글도 이 안에서만 보입니다.`, priv_link: '🔗 초대 링크 복사', priv_link_tt: '이 서버에 들어올 수 있는 링크 — 블팩 사람들에게만 공유하세요',
      priv_forget: '이 브라우저에서 빼기', priv_forget_tt: '이 비공개 서버를 목록에서 지웁니다 (초대 링크로 다시 들어올 수 있음)', priv_forget_confirm: '이 비공개 서버를 이 브라우저의 목록에서 뺄까요? 초대 링크로 다시 들어올 수 있습니다.',
      priv_bad: '초대 링크가 맞지 않거나 만료됐습니다. 블팩 관리자에게 새 링크를 받아주세요.', priv_joined: (n) => `🔒 ${n} 비공개 서버에 들어왔습니다.`,
      more_items: (n) => `+${n}개 더`, less_items: '접기', more_posts: (n) => `글 ${n}건 더 보기`, older_posts: '이전 글 더 불러오기',
      cpw: '📋 트래커용 복사', cpw_tt: '필요한 것 목록을 영문 이름으로 복사 — 트래커 관심 목록 탭의 [붙여넣기로 추가]에 붙이면 한번에 등록됩니다', cpw_done: (n) => `${n}개 이름 복사됨 — 트래커 관심 목록에 붙여넣기`,
      gate_ttl: '어느 서버에서 플레이하세요?', gate_sub: '선택한 서버의 글만 보여드립니다. 이 브라우저에 기억해 두니, 바꾸려면 위쪽 서버 목록에서 고르세요.',
      who_on: (n) => `🎮 <b>${n}</b> 닉네임으로 활동 중 — 이 닉네임의 글에 끌올·수정·삭제 버튼이 보입니다.`, who_switch: '다른 닉네임으로', who_switch_tt: '이 브라우저에 저장된 닉네임·수정 번호 지우기',
      who_off: '저장된 닉네임 없음 — 글을 올리거나 <a href="/hs/market/post#mine">내 글</a>에서 닉네임·수정 번호를 입력하면 내 글이 표시됩니다.',
      who_confirm: '저장된 닉네임·수정 번호를 지울까요? (글은 남고, 다시 입력하면 복구됩니다)',
      stat_pick: (name, what, n) => `"${name}" — ${what} ${n}건`, what_have: '가진 사람', what_want: '찾는 사람', what_all: '관련 글',
      stat_all: (o, d) => `진행 중 ${o}건 · 완료 ${d}건`, empty_filter: '조건에 맞는 글이 없습니다.', empty_all: '아직 글이 없습니다. 첫 글을 올려보세요!',
      tag_me: '내 글', tag_done: '교환 완료', done_at: (t) => `${t} 완료`, tm_tt: (b, e) => `끌올 ${b} · 만료 ${e}`,
      have: '가진 것', want: '필요한 것', nick_copy_tt: '인게임 닉네임 복사',
      dc_copy: '💬 디스코드 ID 복사', dc_copy_tt: '디스코드 ID를 클립보드에 복사 (화면에는 표시하지 않음)', dc_none: '디스코드 미기재 — 인게임에서 이 닉네임의 방으로 접속',
      bump: '⬆ 끌올', bump_tt: (d = 3) => `${d}일 연장 · 맨 위로 (하루 1회)`, done: '✓ 완료', undone: '↩ 다시 진행', edit: '✎ 수정', del: '삭제',
      need_me: '내 정보가 없습니다. "내 글"에서 닉네임·수정 번호를 입력해주세요.', del_confirm: '이 글을 삭제할까요? 되돌릴 수 없습니다.',
      did_del: '삭제했습니다.', did_bump: (d = 3) => `끌올했습니다 (${d}일 연장).`, did_done: '교환 완료로 표시했습니다.', did_undone: '다시 진행 중으로 바꿨습니다.',
      copied: (t) => `복사했습니다: ${t}`, copy_prompt: '복사해서 쓰세요', expired: '만료', d_left: (d) => `${d}일 남음`, h_left: (h) => `${h}시간 남음`,
      // post
      p_title: '🛒 교환 글 쓰기', p_edit_title: (id) => `✎ 교환 글 수정 #${id}`, p_mine_title: '📋 내 글 관리', back: '← 목록', manage: '내 글 관리',
      f_server: '서버 *', f_nick: '인게임 닉네임 *', f_nick_ph: '캐릭터 이름', f_nick_hint: '교환 상대가 인게임에서 내 방을 찾을 때 쓰는 이름입니다. 수정·삭제할 때도 이 닉네임을 씁니다.',
      f_dc: '디스코드 ID <small>(선택)</small>', f_dc_hint: '공개되지 않고 "복사" 버튼으로만 전달됩니다. <b style="color:var(--danger)">⚠ Hero Siege에는 귓말이 없어</b> 비워두면 상대가 인게임에서 내 닉네임의 방을 찾아 들어오는 것 외엔 연락 방법이 없습니다 — 거래 중엔 방을 열어 두세요.',
      f_pin: '수정 번호 * <small>(숫자 6~10자리)</small>', f_pin_hint: '⚠ 잊으면 글을 수정·삭제할 수 없습니다. 같은 숫자 반복·연속 숫자는 쓸 수 없어요.', f_pin_edit_hint: '이 글을 등록할 때 정한 수정 번호를 입력하세요.',
      f_memo: '메모 <small>(선택, 300자)</small>', f_memo_ph: '예: 저녁 9시 이후 접속 · 비율 협의 가능',
      h_have: '가진 것', h_have_s: '남에게 줄 수 있는 아이템', h_want: '필요한 것', h_want_s: '받고 싶은 아이템', item_ph: '아이템 검색 후 Enter', qty_tt: '수량',
      chips_empty: '아직 없음 — 위에서 아이템을 검색해 추가하세요', max20: '한 쪽에 최대 25개까지 넣을 수 있습니다.',
      pics_tt: (n) => `사진 ${n}장 크게 보기`, pics_load: (n) => `📷 사진 ${n}장 보기`, pics_gone: '사진을 불러오지 못했습니다.', pics_off: '지금은 사진 보기를 잠시 멈춰 두었습니다. 조금 뒤에 다시 시도해주세요.',
      lb_prev: '이전 사진', lb_next: '다음 사진', lb_close: '닫기',
      cached_note: '새 글은 다른 사람 목록에 최대 5분 뒤 나타납니다', refresh: '↻ 새로 고침', refresh_tt: '지금 올라온 글까지 바로 받아옵니다 (내가 쓰거나 고친 글은 언제나 바로 보입니다)',
      h_img: '사진', h_img_s: '아이템 화면 등 · 최대 5장', img_add: '＋ 사진 추가', img_empty: '아직 없음 — 사진은 선택입니다',
      img_hint: '사진은 <b>등록·수정 저장을 누를 때</b> 올라갑니다(그 전엔 이 브라우저 안에만 있어요). 올릴 땐 자동으로 크기를 줄입니다. 글이 내려가면 사진도 함께 사라지고, 교환과 상관없는 사진은 관리자가 지웁니다.',
      img_up: '올리는 중…', img_del: '이 사진 빼기', img_max: (n) => `사진은 ${n}장까지입니다.`,
      img_bad: '이미지 파일(JPG·PNG·WebP)만 올릴 수 있습니다.', img_fail: '사진을 올리지 못했습니다.', img_big: '사진이 너무 큽니다.',
      submit: '등록', submit_edit: '수정 저장', cancel: '취소',
      e_nick: '닉네임을 입력해주세요.', e_pin: '수정 번호는 숫자 6~10자리로, 같은 숫자 반복·연속 숫자는 쓸 수 없습니다.', e_items: '가진 아이템 또는 필요한 아이템을 하나 이상 넣어주세요.',
      did_edit: '수정했습니다.',
      done_h: '등록됐습니다', done_sub: '아래 <b style="color:var(--text)">닉네임 + 수정 번호</b>로만 이 글을 수정·끌올·삭제할 수 있습니다.',
      done_warn: '<b>지금 적어두세요.</b> 수정 번호는 서버에 암호화되어 저장돼 <b>관리자도 알려드릴 수 없습니다.</b> 이 브라우저에는 자동 저장되지만, 다른 기기나 브라우저 초기화 뒤에는 직접 입력해야 합니다.',
      to_list: '목록 보기', again: '아이템 더 추가',
      done_delay: '내 목록에는 바로 보이지만, <b>다른 사람 화면에는 최대 5분 뒤</b>에 나타납니다.',
      merge_hint: '한 서버에 글은 닉네임당 하나예요. 같은 닉네임으로 이미 올린 글이 있으면 그 글에 아이템이 합쳐지고 끌올됩니다(수정 번호가 같아야 함).',
      exist_loaded: (id) => `이 서버에 올려둔 글 <b>#${id}</b>을 불러왔어요. 고쳐서 <b>수정 저장</b>하면 그 글이 바뀝니다. 처음부터 다시 쓰려면 비우고 채우세요.`, exist_clear: '내용 비우기', exist_cleared: '아이템·메모를 비웠습니다. 채운 뒤 수정 저장하세요.',
      merged_h: '기존 글에 합쳐졌습니다', merged_sub: '같은 닉네임으로 올려둔 글에 아이템을 추가하고 최신화했습니다. 겹치는 아이템은 새 수량으로 바뀌었습니다.',
      merged_nobump: '끌올은 하루에 한 번이라 이번엔 순서가 그대로입니다.', merged_trim: '한 쪽 최대 25개라 넘치는 아이템은 빠졌습니다 — 내 글에서 정리해주세요.',
      m_nick: '닉네임', m_pin: '수정 번호', m_go: '내 글 불러오기', m_forget: '기억 지우기', m_forget_tt: '이 브라우저에 저장된 닉네임·번호 지우기',
      m_err: '닉네임과 수정 번호(숫자 6~10자리)를 입력해주세요.', m_none: '이 닉네임·수정 번호로 등록된 글이 없습니다. (번호가 다르면 보이지 않습니다)',
      m_expired: '만료됨 — 끌올하면 다시 올라갑니다', srv_unknown: (id) => `서버 #${id}`, did_forget: '이 브라우저의 저장 정보를 지웠습니다.',
    },
    en: {
      foot: 'Run by winterer — contact on Discord <b>win.terer</b> (also for reporting posts)',
      title: '🛒 Trade Market', pv: 'BETA',
      beta: '<b>Beta</b> — just opened, so screens and features may still change and you may hit the odd bug.',
      sub: (d = 3) => `Item <b>bartering</b> board — pick a server, search an item to find who <b>has</b> it or <b>wants</b> it, then reach out on Discord. <b>Hero Siege has no whisper</b>, so for posts without Discord you must join that player's game room in-game. Posts drop off <b>${d} day${d > 1 ? 's' : ''}</b> after posting/bumping. Real-money trade posts are removed.`,
      search_ph: 'Search item (KR/EN)', tab_all: 'All', tab_have: 'Has it', tab_want: 'Wants it', tab_have_tt: 'People who have this item', tab_want_tt: 'People who want this item',
      write: '＋ New post', mine: 'My posts', loading: 'Loading…', no_servers: 'Could not load server list.',
      rest_ttl: '🔧 The market is resting', rest_why: "Today's allowance is used up, so it is closed for now.",
      rest_when: 'It reopens on its own at 9 AM (KST) tomorrow.',
      rest_else: 'These still work in the meantime', rest_db: 'Item codex', rest_guide: 'Build guides', rest_tree: 'Incarnation',
      // Bloodpack server request (popup)
      req_btn: '🏰 Request a Bloodpack', req_btn_tt: 'Ask to add your Bloodpack server to the list', gate_req: 'Bloodpack not listed? <a id="req-open2">Request a server</a>',
      req_ttl: '🏰 Request a Bloodpack server', req_sub: 'Tell us your Bloodpack name and we will add it after a quick check — usually within a day. Once added it shows up in the server list right away.',
      req_name: 'Bloodpack name (as in game) *', req_name_ph: 'e.g. Fubgun', req_name_ko: 'Korean name <small>(optional)</small>', req_name_ko_ph: 'Shown to Korean users; leave blank to reuse the name',
      req_dc: 'Discord ID *', req_dc_ph: 'So we can reach you if needed', req_dc_hint: 'Not shown publicly — admin only.',
      req_members: 'Approx. members <small>(optional)</small>', req_members_ph: 'e.g. 30', req_memo: 'Note <small>(optional, 150 chars)</small>', req_memo_ph: 'e.g. I am △△, leader of the ○○ pack — about 30 active players, mostly EU',
      req_private: 'Make it a <b>private server</b> — not shown in the server list; only people with the invite link can enter. Once added, you get the invite link here to share with your pack.',
      req_send: 'Send request', req_sending: 'Sending…', req_cancel: 'Cancel', req_close: 'Close',
      req_e_name: 'Enter the Bloodpack name.', req_e_dc: 'Enter your Discord ID.',
      req_done_h: 'Request sent', req_done_sub: (n) => `Your request to add <b>${n}</b> is in. The admin will review it, and the result will show at the top next time you visit from this browser.`,
      req_exists: 'That server already exists — just pick it from the list.', req_pending_dup: 'A request for that name is already waiting for review.',
      req_st_pending: (n) => `🏰 Request to add <b>${n}</b> — waiting for admin review.`,
      req_st_ok: (n) => `✅ <b>${n}</b> has been added!`, req_st_pick: 'Switch to it',
      req_st_ok_priv: (n) => `✅ <b>${n}</b> has been added as a <b>private</b> server. Share the invite link below with your pack — it only shows up in browsers that came in through the link.`,
      req_st_no: (n, r) => `❌ The request to add <b>${n}</b> was not accepted.${r ? ' Reason: ' + r : ''}`,
      priv_on: (n) => `🔒 <b>${n}</b> — private server. Visible only in browsers that came in through the invite link; posts stay inside it.`, priv_link: '🔗 Copy invite link', priv_link_tt: 'Link that lets people into this server — share with your pack only',
      priv_forget: 'Remove from this browser', priv_forget_tt: 'Drop this private server from your list (you can re-enter via the invite link)', priv_forget_confirm: 'Remove this private server from this browser\'s list? You can come back via the invite link.',
      priv_bad: 'That invite link is not valid or has expired. Ask your pack admin for a new one.', priv_joined: (n) => `🔒 Joined private server ${n}.`,
      more_items: (n) => `+${n} more`, less_items: 'Less', more_posts: (n) => `Show ${n} more posts`, older_posts: 'Load older posts',
      cpw: '📋 Copy for tracker', cpw_tt: 'Copy the wanted list as English names — paste into the tracker Watchlist tab with [Add from paste]', cpw_done: (n) => `${n} names copied — paste into the tracker watchlist`,
      gate_ttl: 'Which server do you play on?', gate_sub: 'You will only see posts for the server you pick. It is remembered in this browser; switch any time from the server list at the top.',
      who_on: (n) => `🎮 Acting as <b>${n}</b> — bump/edit/delete buttons appear on this nickname's posts.`, who_switch: 'Switch nickname', who_switch_tt: 'Forget the nickname & edit code saved in this browser',
      who_off: 'No saved nickname — post something or enter your nickname & edit code under <a href="/hs/market/post#mine">My posts</a> to see your posts marked.',
      who_confirm: 'Forget the saved nickname & edit code? (Posts stay; re-enter them to recover.)',
      stat_pick: (name, what, n) => `"${name}" — ${what}: ${n}`, what_have: 'has it', what_want: 'wants it', what_all: 'related posts',
      stat_all: (o, d) => `${o} open · ${d} done`, empty_filter: 'No posts match.', empty_all: 'No posts yet. Be the first!',
      tag_me: 'Mine', tag_done: 'Traded', done_at: (t) => `done ${t}`, tm_tt: (b, e) => `bumped ${b} · expires ${e}`,
      have: 'Has', want: 'Wants', nick_copy_tt: 'Copy in-game nickname',
      dc_copy: '💬 Copy Discord', dc_copy_tt: 'Copy Discord ID to clipboard (not shown on screen)', dc_none: 'No Discord — join this player\'s room in game',
      bump: '⬆ Bump', bump_tt: (d = 3) => `Extend ${d} day${d > 1 ? 's' : ''} · move to top (once a day)`, done: '✓ Done', undone: '↩ Reopen', edit: '✎ Edit', del: 'Delete',
      need_me: 'No saved identity. Enter your nickname & edit code under "My posts".', del_confirm: 'Delete this post? This cannot be undone.',
      did_del: 'Deleted.', did_bump: (d = 3) => `Bumped (extended ${d} day${d > 1 ? 's' : ''}).`, did_done: 'Marked as traded.', did_undone: 'Reopened.',
      copied: (t) => `Copied: ${t}`, copy_prompt: 'Copy this', expired: 'expired', d_left: (d) => `${d}d left`, h_left: (h) => `${h}h left`,
      p_title: '🛒 New trade post', p_edit_title: (id) => `✎ Edit post #${id}`, p_mine_title: '📋 My posts', back: '← List', manage: 'My posts',
      f_server: 'Server *', f_nick: 'In-game nickname *', f_nick_ph: 'Character name', f_nick_hint: 'The name others look for to join your room in game. Also used with your edit code to edit/delete.',
      f_dc: 'Discord ID <small>(optional)</small>', f_dc_hint: 'Not displayed — shared only via a "Copy" button. <b style="color:var(--danger)">⚠ Hero Siege has no whisper</b>: if you leave this blank, the only way to reach you is joining your room in game — keep a room open while trading.',
      f_pin: 'Edit code * <small>(6–10 digits)</small>', f_pin_hint: '⚠ If you forget it you cannot edit or delete the post. Repeated or sequential digits are not allowed.', f_pin_edit_hint: 'Enter the edit code you set when posting.',
      f_memo: 'Note <small>(optional, 300 chars)</small>', f_memo_ph: 'e.g. online after 9pm KST · ratio negotiable',
      h_have: 'Has', h_have_s: 'items you can give', h_want: 'Wants', h_want_s: 'items you are looking for', item_ph: 'Search item, then Enter', qty_tt: 'Quantity',
      chips_empty: 'Nothing yet — search above to add items', max20: 'Up to 25 items per side.',
      pics_tt: (n) => `View ${n} photo${n > 1 ? 's' : ''}`, pics_load: (n) => `📷 View ${n} photo${n > 1 ? 's' : ''}`, pics_gone: "Couldn't load the photos.", pics_off: 'Photo viewing is paused right now. Please try again later.',
      lb_prev: 'Previous photo', lb_next: 'Next photo', lb_close: 'Close',
      cached_note: 'New posts can take up to 5 minutes to appear for others', refresh: '↻ Refresh', refresh_tt: 'Fetch the newest posts now (your own posts and edits always show immediately)',
      h_img: 'Photos', h_img_s: 'item screenshots · up to 5', img_add: '＋ Add photo', img_empty: 'None yet — photos are optional',
      img_hint: 'Photos are uploaded when you <b>submit or save</b> (until then they stay in your browser). They are resized automatically, disappear together with the post, and anything unrelated to trading is removed by the admin.',
      img_up: 'Uploading…', img_del: 'Remove this photo', img_max: (n) => `Up to ${n} photos.`,
      img_bad: 'Image files only (JPG, PNG, WebP).', img_fail: "Couldn't upload the photo.", img_big: 'That photo is too large.',
      submit: 'Post', submit_edit: 'Save changes', cancel: 'Cancel',
      e_nick: 'Enter a nickname.', e_pin: 'Edit code must be 6–10 digits; repeated or sequential digits are not allowed.', e_items: 'Add at least one item you have or want.',
      did_edit: 'Saved.',
      done_h: 'Posted!', done_sub: 'Only this <b style="color:var(--text)">nickname + edit code</b> can edit, bump or delete the post.',
      done_warn: '<b>Write it down now.</b> The edit code is stored hashed — <b>even the admin cannot recover it.</b> It is remembered in this browser, but you must type it on another device or after clearing browser data.',
      to_list: 'Go to list', again: 'Add more items',
      done_delay: 'You can see it right away, but it may take <b>up to 5 minutes</b> to appear for other people.',
      merge_hint: 'One post per nickname per server. If you already have a post under this nickname, the items are merged into it and it gets bumped (same edit code required).',
      exist_loaded: (id) => `Loaded your post <b>#${id}</b> on this server. Edit and <b>Save changes</b> to update it; to start over, clear it and fill it in again.`, exist_clear: 'Clear items', exist_cleared: 'Items and memo cleared. Fill in and save.',
      merged_h: 'Merged into your post', merged_sub: 'Items were added to your existing post under this nickname and it was refreshed. Duplicate items took the new quantity.',
      merged_nobump: 'Bumps are once a day, so its position is unchanged this time.', merged_trim: 'Max 25 items per side — the extra items were dropped; tidy up in My posts.',
      m_nick: 'Nickname', m_pin: 'Edit code', m_go: 'Load my posts', m_forget: 'Forget', m_forget_tt: 'Forget the nickname & code saved in this browser',
      m_err: 'Enter your nickname and edit code (6–10 digits).', m_none: 'No posts for this nickname & edit code. (A different code shows nothing.)',
      m_expired: 'Expired — bump to relist', srv_unknown: (id) => `Server #${id}`, did_forget: 'Saved identity cleared.',
    },
  };
  const T = (k, ...a) => { const v = (DICT[lang] && DICT[lang][k]) ?? DICT.ko[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
  // data-t / data-tp / data-tt 붙은 정적 요소에 사전 적용
  function applyI18n(root = document) {
    root.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = T(el.dataset.t); });
    root.querySelectorAll('[data-tp]').forEach((el) => { el.placeholder = T(el.dataset.tp); });
    root.querySelectorAll('[data-tt]').forEach((el) => { el.title = T(el.dataset.tt); });
    document.documentElement.lang = lang;
  }
  // 언어 토글(허브 헤더 🌐) → 영문 데이터 준비 후 페이지에 알림(각 페이지가 다시 그린다)
  window.addEventListener('wt-langchange', async (e) => {
    lang = e.detail === 'en' ? 'en' : 'ko';
    if (lang === 'en') await loadEn();
    applyI18n();
    window.dispatchEvent(new CustomEvent('mk-lang', { detail: lang }));
  });

  // 아이템 자료 — 장터는 경량본(/hs/market/items.js, window.MKITEMS)으로 먼저 뜬다.
  // 옵션 문구(affixes)는 빠져 있어서, 화면이 뜬 뒤 도감 전체를 뒤늦게 받아 같은 객체에 채워 넣는다.
  // (도감 파일을 먼저 읽은 페이지면 그걸 그대로 쓴다 — 경량본이 없어도 동작)
  const CX = window.CODEX || window.MKITEMS || { items: [], tiers: [] };
  const items = CX.items || [];
  const byUid = new Map(items.map((it) => [uidOf(it), it]));
  let fullLoading = null;
  function loadFull() {          // 옵션 문구까지 필요한 순간(툴팁)에 부른다. 이미 있으면 그대로
    if (window.CODEX) return Promise.resolve();
    if (fullLoading) return fullLoading;
    fullLoading = new Promise((res) => {
      const sc = document.createElement('script'); sc.src = '/hs/db/data.js';
      sc.onload = () => {
        for (const it of (window.CODEX && CODEX.items) || []) {
          const cur = byUid.get(uidOf(it));
          if (cur) { cur.affixes = it.affixes; cur.rw = it.rw || cur.rw; cur.places = it.places || cur.places; }
        }
        res();
      };
      sc.onerror = res; document.head.appendChild(sc);
    });
    return fullLoading;
  }
  // 첫 화면이 다 뜬 뒤 한가할 때 미리 받아 둔다 — 툴팁을 띄울 때쯤이면 이미 준비돼 있다
  if (!window.CODEX) {
    const warm = () => (window.requestIdleCallback || setTimeout)(() => loadFull(), 1200);
    if (document.readyState === 'complete') warm(); else addEventListener('load', warm);
  }
  // 장터에서 의미 없는 분류는 자동완성에서 뺀다(열쇠·수집품·에센스 금고는 교환 대상이 아니거나 거래 불가)
  const SKIP_GROUP = new Set(['에센스 금고']);
  const searchable = items.filter((it) => !SKIP_GROUP.has(it.group));

  const iconUrl = (it) => it.ic ? `/hs/db/icons/${encodeURIComponent(iconName(it.icf || it.name))}.png` : '';
  const nameOf = (uid) => { const it = byUid.get(uid); return it ? (lang === 'en' ? it.name : (it.kko || it.name)) : uid.replace(/^rw:/, ''); };
  const kindOf = (it) => { const E = EN(); const k = it.kind || it.group || ''; return E ? (E.k[it.kind] || E.g[it.group] || k) : k; };
  const affixesOf = (it) => { const E = EN(); const o = E && E.items[(it.rw ? 'rw:' : '') + it.name]; return (o && o.af) || it.affixes || []; };
  const srvName = (s) => (lang === 'en' && s.name_en) ? s.name_en : s.name;
  const colorOf = (it) => (it && RCOLOR[it.rarity]) || 'var(--text)';

  // 검색: 한글명·영문명 부분일치. 앞부분 일치 → 포함 순, 12개
  function search(q) {
    q = String(q || '').trim().toLowerCase(); if (q.length < 1) return [];
    const pre = [], inc = [];
    for (const it of searchable) {
      const k = (it.kko || '').toLowerCase(), e = it.name.toLowerCase();
      if (k.startsWith(q) || e.startsWith(q)) pre.push(it);
      else if (k.includes(q) || e.includes(q)) inc.push(it);
      if (pre.length >= 12) break;
    }
    return pre.concat(inc).slice(0, 12);
  }

  // 자동완성 부착 — input 아래 목록, 선택 시 onPick(item). 부모 요소에 .ac 필요
  function attachAC(input, onPick) {
    const wrap = input.closest('.ac') || input.parentElement;
    const list = document.createElement('div'); list.className = 'list'; wrap.appendChild(list);
    let cur = [], sel = -1;
    const render = () => {
      list.innerHTML = cur.map((it, i) =>
        `<div class="it${i === sel ? ' sel' : ''}" data-i="${i}">` +
        (it.ic ? `<img src="${iconUrl(it)}" alt="" loading="lazy" onerror="this.remove()">` : '<span style="width:26px"></span>') +
        `<span style="color:${colorOf(it)}">${esc(lang === 'en' ? it.name : (it.kko || it.name))}</span>` +
        (it.kko ? `<span class="e">${esc(lang === 'en' ? it.kko : it.name)}</span>` : '') +
        `<span class="k">${esc(kindOf(it))}</span></div>`).join('');
      list.classList.toggle('on', cur.length > 0);
    };
    const pick = (i) => { const it = cur[i]; if (!it) return; cur = []; sel = -1; render(); onPick(it); };
    input.addEventListener('input', () => { cur = search(input.value); sel = -1; render(); });
    input.addEventListener('focus', () => { if (input.value) { cur = search(input.value); render(); } });
    input.addEventListener('keydown', (e) => {
      if (!cur.length) return;
      if (e.key === 'ArrowDown') { sel = (sel + 1) % cur.length; render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = (sel - 1 + cur.length) % cur.length; render(); e.preventDefault(); }
      else if (e.key === 'Enter') { pick(sel < 0 ? 0 : sel); e.preventDefault(); }
      else if (e.key === 'Escape') { cur = []; render(); }
    });
    list.addEventListener('mousedown', (e) => { const t = e.target.closest('.it'); if (t) { e.preventDefault(); pick(+t.dataset.i); } });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) { cur = []; render(); } });
  }

  // 아이템 칩 HTML — uid 기준. removable 이면 ✕ 포함
  function chip(uid, qty, opt = {}) {
    const it = byUid.get(uid);
    const ico = it && it.ic ? `<img src="${iconUrl(it)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    return `<span class="chip${opt.hit ? ' hit' : ''}" data-item="${esc(uid)}">${ico}` +
      `<span style="color:${colorOf(it)}">${esc(nameOf(uid))}</span>` +
      (qty > 1 ? `<span class="q">×${qty}</span>` : '') +
      (opt.removable ? '<span class="x" title="빼기">✕</span>' : '') + '</span>';
  }

  // 툴팁 — .chip[data-item] 위에 도감 정보(가이드 뷰어 renderTip 축약판)
  let tip, tipUid = null;     // tipUid: 지금 툴팁을 띄운 아이템(터치 기기에서 같은 칩을 다시 누르면 닫기)
  function ensureTip() { if (!tip) { tip = document.createElement('div'); tip.id = 'hstip'; document.body.appendChild(tip); } return tip; }
  function showTip(uid, x, y) {
    const it = byUid.get(uid); if (!it) return;
    tipUid = uid;
    // 옵션 문구가 아직 안 와 있으면 받아 온 뒤 같은 자리에 다시 그린다(그 사이엔 이름·분류만 보인다)
    if (!it.affixes && !window.CODEX) loadFull().then(() => { if (tipUid === uid) showTip(uid, x, y); });
    const t = ensureTip();
    const tier = (CX.tiers && CX.tiers[it.tier - 1]) || '';
    const en = lang === 'en';
    t.innerHTML = `<div class="top">${it.ic ? `<img class="ic" src="${iconUrl(it)}" alt="">` : ''}<div class="n" style="color:${colorOf(it)}">${esc(en ? it.name : (it.kko || it.name))}</div></div>` +
      (it.kko ? `<div class="e">${esc(en ? it.kko : it.name)}</div>` : '') +
      `<div class="m">${[kindOf(it), it.rarity, tier && (en ? 'Tier ' + tier : tier + '티어'), it.level && 'Lv.' + it.level].filter(Boolean).join(' · ')}</div>` +
      affixesOf(it).map((a) => `<div class="a">${esc(a)}</div>`).join('') +
      (it.rw ? `<div class="p">⚒ ${it.rw.runes.map((r) => esc(r.n) + (r.q > 1 ? '×' + r.q : '')).join(' → ')} · ${it.rw.sockets}${en ? ' sockets ' + esc((EN() && EN().items['rw:' + it.name] || {}).slot || it.rw.slot) : '소켓 ' + esc(it.rw.slot)}</div>`
        : it.places && it.places.length ? `<div class="p">${en ? 'Drops: ' : '드롭: '}${esc(it.places.join(', '))}</div>` : '');
    t.style.display = 'block';
    const r = t.getBoundingClientRect();
    t.style.left = Math.min(x + 14, innerWidth - r.width - 8) + 'px';
    t.style.top = (y + 18 + r.height > innerHeight ? Math.max(4, y - r.height - 10) : y + 18) + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; tipUid = null; }
  // 마우스가 있는 기기에서만 hover 로 띄운다. 터치 기기에서도 이걸 걸어 두면 탭 한 번에
  // mouseover(켬) → click(토글로 끔) 이 잇따라 들어와 툴팁이 깜빡이고 만다.
  const hoverable = () => matchMedia('(hover: hover)').matches;
  document.addEventListener('mouseover', (e) => { if (!hoverable()) return; const c = e.target.closest('.chip[data-item]'); if (c) showTip(c.dataset.item, e.clientX, e.clientY); });
  document.addEventListener('mouseout', (e) => { if (hoverable() && e.target.closest('.chip[data-item]')) hideTip(); });
  // 터치 기기: 칩을 누르면 툴팁 토글. 다른 칩을 누르면 그 칩 것으로 바뀌고, 바깥을 누르면 닫힌다
  document.addEventListener('click', (e) => {
    if (hoverable()) return;
    const c = e.target.closest('.chip[data-item]');
    if (!c) { if (tipUid) hideTip(); return; }
    if (e.target.classList.contains('x')) return;
    if (tipUid === c.dataset.item) hideTip(); else showTip(c.dataset.item, e.clientX, e.clientY);
  });
  addEventListener('scroll', () => { if (tipUid) hideTip(); }, { passive: true });   // 화면이 움직이면 제자리에 떠 있지 않게

  // API 래퍼 — 실패는 {ok:false,error} 로 통일
  async function api(path, body, headers) {
    try {
      const r = await fetch('/api/market/' + path, body === undefined
        ? { headers }
        : { method: 'POST', headers: { 'content-type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ ok: false, error: '서버 응답을 읽을 수 없습니다.' }));
      if (!j.ok && !j.error) j.error = '요청에 실패했습니다. (' + r.status + ')';
      return j;
    } catch (e) { return { ok: false, error: '네트워크 오류 — 잠시 후 다시 시도해주세요.' }; }
  }

  // 내 정보(닉네임·수정 번호) — 이 브라우저에만 저장. 다른 기기에선 직접 입력
  const ME_KEY = 'hsmk-me';
  const me = {
    get() { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) { return null; } },
    set(nick, pin) { try { localStorage.setItem(ME_KEY, JSON.stringify({ nick, pin })); } catch (e) {} },
    clear() { try { localStorage.removeItem(ME_KEY); } catch (e) {} },
    isMine(post) { const m = me.get(); return !!m && m.nick.trim().toLowerCase() === String(post.nick || '').trim().toLowerCase(); },
  };
  const lastServer = {
    get() { try { return parseInt(localStorage.getItem('hsmk-server'), 10) || 0; } catch (e) { return 0; } },
    set(id) { try { localStorage.setItem('hsmk-server', String(id)); } catch (e) {} },
  };
  // 방금 글을 쓰거나 고친 사람 표시 — 다음 목록 조회는 캐시를 건너뛰고 받아 온다(남이 쓴 글은 최대 1분 늦게 보일 수 있다)
  const fresh = {
    mark() { try { sessionStorage.setItem('hsmk-fresh', '1'); } catch (e) {} },
    take() { try { const v = sessionStorage.getItem('hsmk-fresh'); if (v) sessionStorage.removeItem('hsmk-fresh'); return !!v; } catch (e) { return false; } },
    q() { return this.take() ? '&fresh=1' : ''; },
  };
  // 비공개 서버 접속 키 — 초대 링크(/hs/market/?key=…)로 들어오면 이 브라우저에 쌓아 두고, 모든 조회·등록에 함께 보낸다(최대 5개)
  const KEYS = 'hsmk-keys';
  const keys = {
    get() { try { const a = JSON.parse(localStorage.getItem(KEYS) || '[]'); return Array.isArray(a) ? a.filter((k) => typeof k === 'string') : []; } catch (e) { return []; } },
    set(a) { try { a.length ? localStorage.setItem(KEYS, JSON.stringify(a.slice(-5))) : localStorage.removeItem(KEYS); } catch (e) {} },
    add(k) { k = String(k || '').trim(); if (!k) return; const a = keys.get().filter((x) => x !== k); a.push(k); keys.set(a); },
    remove(k) { keys.set(keys.get().filter((x) => x !== k)); },
    // 서버 목록 응답과 대조 — 응답에 안 나온 키는 무효(키 재발급·공개 전환·삭제)라 지운다. 지운 키 배열을 돌려준다
    prune(servers) { const ok = new Set((servers || []).map((s) => s.key).filter(Boolean)); const bad = keys.get().filter((k) => !ok.has(k)); if (bad.length) keys.set(keys.get().filter((k) => ok.has(k))); return bad; },
    q() { const a = keys.get(); return a.length ? '&key=' + encodeURIComponent(a.join(',')) : ''; }, // GET 쿼리 조각
  };
  try { localStorage.removeItem('hsmk-key'); } catch (e) {} // 옛 그룹 필터 키(2026-09-18 기능 제거)

  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(T('copied', text)); }
    catch (e) { prompt(T('copy_prompt'), text); }
  }

  // 남은 기간 표기
  function remain(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return T('expired');
    const d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3);
    return d > 0 ? T('d_left', d) : T('h_left', Math.max(1, h));
  }
  const fmtDate = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  // 수정 번호 정리 — 전각 숫자(０-９)는 반각으로, 숫자 아닌 글자(공백·하이픈 등)는 제거
  const normPin = (p) => String(p || '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\D/g, '');
  const validPin = (p) => /^[0-9]{6,10}$/.test(p) && !/^(\d)\1+$/.test(p) && !/^(0123456789|1234567890|123456|1234567|12345678|123456789)/.test(p);

  window.MK = { fresh, uidOf, byUid, nameOf, srvName, iconUrl, colorOf, search, attachAC, chip, api, me, lastServer, keys, toast, copy, remain, fmtDate, esc, validPin, normPin, hideTip, T, applyI18n, get lang() { return lang; } };
})();
