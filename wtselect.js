/* wtselect — 시스템 <select> 를 커스텀 드롭다운으로 교체하는 경량 컴포넌트.
 *
 * 설계 원칙
 *  - 네이티브 <select> 를 없애지 않는다. 값의 원천은 그대로 select 이고, 화면만 가린다.
 *    그래서 기존 코드의 select.value 읽기·쓰기, addEventListener('change') 가 그대로 산다.
 *  - 색·폰트·테두리는 select 의 computed style 을 미러링한다 → 페이지 테마(HS 적/금,
 *    TLI 청색)에 별도 설정 없이 맞는다.
 *  - 옵션을 나중에 JS 로 채우는 select(예: 도감 희귀도·종류)도 MutationObserver 로 따라간다.
 *
 * 사용: <script src="/wtselect.js" defer></script>  (data-no-wtsel 붙은 select 는 제외)
 */
(function () {
  'use strict';
  if (window.__wtselLoaded) return;
  window.__wtselLoaded = true;

  var CSS =
    // 버튼은 내용 크기(inline-flex)로 둔다. flex 컨테이너(.tools 등) 안에서 width:100% +
    // flex:1 라벨 조합은 폭이 0으로 붕괴해 버튼이 선처럼 보인다 — 그래서 내용 기준.
    '.wtsel{position:relative;display:inline-flex;vertical-align:middle;box-sizing:border-box;max-width:100%}' +
    '.wtsel-btn{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;max-width:100%;' +
      'cursor:pointer;text-align:left;font:inherit;white-space:nowrap}' +
    '.wtsel-btn .wtsel-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.wtsel-btn .wtsel-arw{flex:none;width:.6em;height:.6em;margin-left:2px;border-right:2px solid currentColor;' +
      'border-bottom:2px solid currentColor;transform:rotate(45deg);opacity:.6;transition:transform .12s}' +
    '.wtsel.open .wtsel-btn .wtsel-arw{transform:rotate(-135deg)}' +
    '.wtsel-btn:focus-visible{outline:2px solid currentColor;outline-offset:1px}' +
    '.wtsel-menu{position:absolute;left:0;top:100%;margin-top:3px;z-index:9999;min-width:100%;' +
      'border-radius:6px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.5);display:none}' +
    '.wtsel.open .wtsel-menu{display:block}' +
    '.wtsel.up .wtsel-menu{top:auto;bottom:100%;margin-top:0;margin-bottom:3px}' +
    '.wtsel-search{display:block;box-sizing:border-box;width:100%;margin:0 0 4px;padding:5px 8px;' +
      'font:inherit;font-size:13px;border-radius:4px;border:1px solid rgba(255,255,255,.22);' +
      'background:rgba(0,0,0,.3);color:inherit;outline:none}' +
    '.wtsel-search:focus{border-color:currentColor}' +
    '.wtsel-list{max-height:min(56vh,340px);overflow-y:auto}' +
    '.wtsel-opt{padding:6px 10px;border-radius:4px;cursor:pointer;white-space:nowrap;font:inherit;line-height:1.3}' +
    '.wtsel-opt:hover,.wtsel-opt.active{background:rgba(255,255,255,.09)}' +
    '.wtsel-opt.sel{background:rgba(255,255,255,.14);font-weight:600}' +
    '.wtsel-opt[aria-disabled="true"]{opacity:.4;cursor:default;background:none}' +
    '.wtsel-native{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;' +
      'clip:rect(0 0 0 0);white-space:nowrap;border:0}';

  var style = document.createElement('style');
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  var openWidget = null;

  function px(v) { return v && v !== '0px' ? v : ''; }

  // select 가 **보이는 동안** 겉모양을 원시값 스냅샷으로 뜬다. 숨긴 뒤(getComputedStyle)
  // 읽으면 .wtsel-native 의 1px·0패딩을 복사해 버튼이 선처럼 찌부러진다 — 그래서 스냅샷.
  function snapshot(sel) {
    var cs = getComputedStyle(sel);
    var bg = cs.backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = '#1b1013';
    var bcol = cs.borderTopColor && cs.borderTopColor !== 'rgba(0, 0, 0, 0)' ? cs.borderTopColor : 'rgba(255,255,255,.2)';
    return {
      bg: bg, color: cs.color, font: cs.font,
      pad: cs.paddingTop + ' ' + (parseFloat(cs.paddingRight || 0) + 2) + 'px ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      radius: px(cs.borderTopLeftRadius) || '4px',
      border: (px(cs.borderTopWidth) || '1px') + ' solid ' + bcol,
      bcol: bcol, height: px(cs.height)
    };
  }

  // 스냅샷을 버튼·메뉴에 입힌다.
  function mirror(snap, btn, menu) {
    btn.style.background = snap.bg;
    btn.style.color = snap.color;
    btn.style.font = snap.font;
    btn.style.padding = snap.pad;
    btn.style.borderRadius = snap.radius;
    btn.style.border = snap.border;
    if (snap.height) btn.style.height = snap.height;
    menu.style.background = snap.bg;
    menu.style.border = '1px solid ' + snap.bcol;
    menu.style.color = snap.color;
  }

  function build(sel) {
    if (sel.__wtsel || sel.multiple || sel.dataset.noWtsel !== undefined || sel.hasAttribute('data-no-wtsel')) return;
    sel.__wtsel = true;

    var wrap = document.createElement('div');
    wrap.className = 'wtsel';
    // 인라인 폭 지정(예: pageSize 의 margin-left)이나 클래스 폭을 최대한 잇는다
    var scs = getComputedStyle(sel);
    if (px(scs.width) && sel.style.width) wrap.style.width = sel.style.width;
    if (sel.style.marginLeft) wrap.style.marginLeft = sel.style.marginLeft;
    if (sel.style.marginRight) wrap.style.marginRight = sel.style.marginRight;
    var snap = snapshot(sel);   // 숨기기 전에 겉모양을 떠 둔다

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wtsel-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    if (sel.disabled) btn.disabled = true;
    var lbl = document.createElement('span'); lbl.className = 'wtsel-lbl';
    var arw = document.createElement('span'); arw.className = 'wtsel-arw';
    btn.appendChild(lbl); btn.appendChild(arw);

    var menu = document.createElement('div');
    menu.className = 'wtsel-menu';
    menu.setAttribute('role', 'listbox');
    // 검색창 + 옵션 목록. 검색창은 옵션이 많을 때만 보인다(SEARCH_MIN).
    var search = document.createElement('input');
    search.type = 'text';
    search.className = 'wtsel-search';
    search.setAttribute('placeholder', '검색…');
    search.setAttribute('aria-label', '옵션 검색');
    var list = document.createElement('div');
    list.className = 'wtsel-list';
    menu.appendChild(search);
    menu.appendChild(list);

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    wrap.appendChild(sel);
    sel.classList.add('wtsel-native');
    sel.setAttribute('tabindex', '-1');
    sel.setAttribute('aria-hidden', 'true');

    var SEARCH_MIN = 8;         // 이보다 옵션이 많으면 검색창 노출
    var activeEl = null;        // 현재 하이라이트된 옵션 div

    function labelFor() {
      var o = sel.options[sel.selectedIndex];
      lbl.textContent = o ? o.textContent : '';
    }

    function rebuild() {
      mirror(snap, btn, menu);
      list.innerHTML = '';
      Array.prototype.forEach.call(sel.options, function (o, i) {
        var it = document.createElement('div');
        it.className = 'wtsel-opt';
        it.setAttribute('role', 'option');
        it.textContent = o.textContent;
        it._idx = i;
        if (o.disabled) it.setAttribute('aria-disabled', 'true');
        if (i === sel.selectedIndex) { it.classList.add('sel'); it.setAttribute('aria-selected', 'true'); }
        it.addEventListener('mousedown', function (e) { e.preventDefault(); });
        it.addEventListener('click', function () { if (!o.disabled) pick(i); });
        list.appendChild(it);
      });
      // 검색창은 옵션이 많을 때만
      search.style.display = sel.options.length > SEARCH_MIN ? '' : 'none';
      labelFor();
    }

    function pick(i) {
      if (i < 0 || i >= sel.options.length) return;
      var changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      labelFor();
      markSel();
      close();
      btn.focus();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function markSel() {
      Array.prototype.forEach.call(list.children, function (el) {
        el.classList.toggle('sel', el._idx === sel.selectedIndex);
        el.classList.toggle('active', el === activeEl);
      });
    }

    // 보이는(검색 필터 통과 + 비활성 아님) 옵션 div 목록
    function visible() {
      return Array.prototype.filter.call(list.children, function (el) {
        return el.style.display !== 'none' && el.getAttribute('aria-disabled') !== 'true';
      });
    }

    function setActive(el) {
      activeEl = el || null;
      markSel();
      if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: 'nearest' });
    }

    // 방향키 이동 — 보이는 옵션들 사이에서만
    function move(delta) {
      var vis = visible();
      if (!vis.length) return;
      var cur = vis.indexOf(activeEl);
      var next = cur < 0 ? (delta > 0 ? 0 : vis.length - 1) : cur + delta;
      if (next < 0) next = 0; if (next >= vis.length) next = vis.length - 1;
      setActive(vis[next]);
    }

    function filter(q) {
      q = q.trim().toLowerCase();
      Array.prototype.forEach.call(list.children, function (el) {
        el.style.display = (!q || el.textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
      });
      var vis = visible();
      setActive(vis.indexOf(activeEl) >= 0 ? activeEl : (vis[0] || null));
    }

    function open() {
      if (openWidget && openWidget !== api) openWidget.close();
      openWidget = api;
      rebuild();
      search.value = '';
      filter('');
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      var r = wrap.getBoundingClientRect();
      wrap.classList.toggle('up', window.innerHeight - r.bottom < 240 && r.top > window.innerHeight - r.bottom);
      // 가로 스크롤 탭 줄처럼 overflow 로 잘리는 상자 안이면 목록을 화면 기준(fixed)으로 띄운다 (2026-10-10, TLI DB 시즌 고르기)
      menu.style.position = menu.style.left = menu.style.top = menu.style.bottom = menu.style.minWidth = menu.style.margin = '';
      for (var el = wrap.parentElement; el && el !== document.body; el = el.parentElement) {
        var cs = getComputedStyle(el);
        if (/(auto|hidden|scroll|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
          var up = wrap.classList.contains('up');
          // 조상에 transform·backdrop-filter 가 있으면 fixed 도 그 상자 기준이라 또 잘린다 → 목록을 body 로 옮겨 띄운다(닫으면 되돌림)
          document.body.appendChild(menu); menu.style.display = 'block'; menu.style.zIndex = '10000';
          menu.style.position = 'fixed'; menu.style.minWidth = r.width + 'px'; menu.style.margin = '0';
          menu.style.left = Math.max(4, Math.min(r.left, window.innerWidth - Math.max(r.width, 160) - 4)) + 'px';
          if (up) menu.style.bottom = (window.innerHeight - r.top + 3) + 'px'; else menu.style.top = (r.bottom + 3) + 'px';
          break;
        }
      }
      // 선택된 옵션을 활성 시작점으로
      var selEl = Array.prototype.filter.call(list.children, function (el) { return el._idx === sel.selectedIndex; })[0];
      setActive(selEl || visible()[0] || null);
      // 검색창 보이면 바로 타이핑 가능하게 포커스
      if (search.style.display !== 'none') setTimeout(function () { search.focus({ preventScroll: true }); }, 0);
      openedAt = Date.now();
    }

    function close() {
      if (menu.parentNode !== wrap) { wrap.insertBefore(menu, sel); menu.style.display = menu.style.zIndex = ''; } // body 로 띄웠던 목록 되돌림
      wrap.classList.remove('open');
      wrap.classList.remove('up');
      btn.setAttribute('aria-expanded', 'false');
      if (openWidget === api) openWidget = null;
    }

    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      wrap.classList.contains('open') ? close() : open();
    });

    // 키보드 — 버튼(닫힘)과 검색창(열림) 양쪽에서 처리
    function onKey(e) {
      var isOpen = wrap.classList.contains('open');
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); isOpen ? move(1) : open(); break;
        case 'ArrowUp': e.preventDefault(); isOpen ? move(-1) : open(); break;
        case 'Home': if (isOpen) { e.preventDefault(); var v = visible(); setActive(v[0]); } break;
        case 'End': if (isOpen) { e.preventDefault(); var w = visible(); setActive(w[w.length - 1]); } break;
        case 'Enter': e.preventDefault(); if (isOpen) { if (activeEl) pick(activeEl._idx); } else open(); break;
        case 'Escape': if (isOpen) { e.preventDefault(); close(); btn.focus(); } break;
        case 'Tab': if (isOpen) close(); break;
        case ' ':
          // 버튼 포커스에서 스페이스는 열기 (검색창에선 공백 입력 허용)
          if (!isOpen) { e.preventDefault(); open(); }
          break;
      }
    }
    btn.addEventListener('keydown', onKey);
    search.addEventListener('keydown', onKey);
    search.addEventListener('input', function () { filter(search.value); });
    search.addEventListener('click', function (e) { e.stopPropagation(); });

    // 바깥 클릭·값 외부 변경 동기화
    var api = { close: close, wrap: wrap, menu: menu, fixed: function () { return menu.style.position === 'fixed'; } };
    sel.addEventListener('change', function () { labelFor(); markSel(); });

    // 옵션이 나중에 채워지거나 바뀌면 메뉴도 갱신(도감 희귀도·종류)
    new MutationObserver(function () { if (wrap.classList.contains('open')) rebuild(); else labelFor(); })
      .observe(sel, { childList: true, subtree: true });

    rebuild();
  }

  document.addEventListener('click', function (e) {
    if (openWidget && !openWidget.wrap.contains(e.target) && !openWidget.menu.contains(e.target)) openWidget.close();
  });
  window.addEventListener('resize', function () { if (openWidget) openWidget.close(); });
  // 화면 기준으로 띄운 목록은 페이지가 스크롤되면 자리가 어긋나니 닫는다 (열 때 생기는 스크롤은 무시)
  var openedAt = 0;
  window.addEventListener('scroll', function () { if (openWidget && openWidget.fixed && openWidget.fixed() && Date.now() - openedAt > 400) openWidget.close(); }, { passive: true });

  function enhanceAll(root) {
    (root || document).querySelectorAll('select').forEach(build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { enhanceAll(); });
  } else {
    enhanceAll();
  }
  // 페이지가 select 를 통째로 새로 그릴 때 대비해 전역으로 노출
  window.wtSelectEnhance = enhanceAll;
})();
