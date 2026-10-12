// 서브탤런트 펜타그램 모달 — 스킬 아이콘 클릭 시 그 스킬의 서브트리를 펜타그램으로.
// 위치 템플릿은 시체벌레(프로펫)에서 잡은 것으로, 게임이 전 스킬에 같은 레이아웃을 쓴다.
// 노드 순서: CSV NN 01~10 = 작은 노드(small_0~9), 11~14 = 큰 노드(big_0~3). SLOT[i] = NN(i+1).
// 페이지의 전역(en/tip 등)에 의존하지 않고 자체적으로 동작한다.
(function () {
  const SLOT = [
    [43, 73, 's', 0], [57, 73, 's', 1],                 // NN1,2  하단 쌍
    [28, 57, 's', 2], [39, 57, 's', 3], [50, 57, 's', 4], [61, 57, 's', 5], [72, 57, 's', 6], // NN3~7 가로줄
    [37, 42, 's', 7], [63, 42, 's', 8],                 // NN8,9  좌중·우중
    [50, 29, 's', 9],                                   // NN10  중앙
    [13, 57, 'b', 0], [32, 13, 'b', 1], [68, 13, 'b', 2], [87, 57, 'b', 3], // NN11~14 큰 노드
  ];
  const BASE = [50, 90];
  const KIND = { s: 'small', b: 'big' };
  const modal = document.getElementById('stmodal');
  if (!modal) return;
  const wrap = document.getElementById('pentwrap');
  const ttl = document.getElementById('sttitle');
  const tip = document.getElementById('tip');
  const EN = () => document.documentElement.lang === 'en';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let cur = null;

  // 태그가 바뀌는 강화는 마우스를 올리기 전에도 알아볼 수 있게 — 초록(추가)·붉은(제거) 테두리와
  // 오른쪽 위 점. 게임 트리에는 없는 표시라 색과 점 두 가지로 겹쳐 둔다.
  function nodeXml(x, y, icon, r, big, chg) {
    const img = icon ? `<image href="${icon}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" style="image-rendering:pixelated"/>` : '';
    const col = chg === 'add' ? '#8fd85f' : chg === 'rem' ? '#e08a8a' : null;
    const ring = `<circle cx="${x}" cy="${y}" r="${r + 0.9}" fill="#140a0a" stroke="${col || (big ? '#e8c860' : '#4a3a2a')}" stroke-width="${col ? 1.1 : 0.7}"/>`;
    const dot = col ? `<circle cx="${x + r * 0.78}" cy="${y - r * 0.78}" r="${Math.max(1.1, r * 0.42)}" fill="${col}" stroke="#140a0a" stroke-width="0.5"/>` : '';
    return ring + img + dot;
  }
  const chgOf = (nd) => (nd && nd.ta && nd.ta.length) ? 'add' : (nd && nd.tr && nd.tr.length) ? 'rem' : null;

  function open(s) {
    cur = s;
    ttl.textContent = EN() ? s.en : (s.ko || s.en);
    const tl = SLOT[11], tr = SLOT[12], rt = SLOT[13], lf = SLOT[10], bs = BASE;
    const edges = [[tl, rt], [rt, lf], [lf, tr], [tr, bs], [bs, tl]];   // 역펜타그램 별
    let g = '<svg viewBox="0 0 100 100" style="width:100%;height:auto;display:block">';
    edges.forEach((e) => { g += `<line x1="${e[0][0]}" y1="${e[0][1]}" x2="${e[1][0]}" y2="${e[1][1]}" stroke="#5a7d3a" stroke-width="0.6" opacity="0.5"/>`; });
    g += `<g class="nd" data-i="-1">${nodeXml(bs[0], bs[1], s.ic ? `icons/main/${s.ic}.png` : '', 8, true)}</g>`;
    (s.nodes || []).forEach((nd, i) => {
      if (i >= 14) return;
      const sl = SLOT[i], r = sl[2] === 'b' ? 7 : 4.3;
      g += `<g class="nd" data-i="${i}" style="cursor:pointer">${nodeXml(sl[0], sl[1], `icons/sub/${s.sub}/${KIND[sl[2]]}_${sl[3]}.png`, r, sl[2] === 'b', chgOf(nd))}</g>`;
    });
    g += '</svg>';
    wrap.innerHTML = g;
    // 초록/붉은 테두리가 무슨 뜻인지 — 그런 노드가 있는 스킬에서만 덧붙인다
    const cap = document.getElementById('stcap');
    if (cap) {
      const base = cap.dataset.base || (cap.dataset.base = cap.textContent);
      const kinds = (s.nodes || []).slice(0, 14).map(chgOf).filter(Boolean);
      cap.innerHTML = esc(base) + (kinds.length
        ? (EN() ? ` · <span class="legend"><i class="dot add"></i>gains / <i class="dot rem"></i>loses a tag</span>`
                : ` · <span class="legend"><i class="dot add"></i>태그가 붙는 / <i class="dot rem"></i>빠지는 강화</span>`)
        : '');
    }
    modal.classList.add('on');
  }

  function tipFor(i) {
    if (i === -1) {
      // 가운데(스킬 자신) 노드 — 카드와 같은 상세(태그·설명·업그레이드 목록)를 그대로 쓴다
      if (window.__skillTipHtml) return window.__skillTipHtml(cur);
      const d = EN() ? (cur.dEn || cur.dKo) : (cur.dKo || cur.dEn);
      return `<b>${esc(EN() ? cur.en : (cur.ko || cur.en))}</b>${d ? `<br>${esc(d)}` : ''}`;
    }
    const nd = cur.nodes[i], nm = EN() ? nd.en : (nd.ko || nd.en), d = EN() ? (nd.dEn || nd.dKo) : (nd.dKo || nd.dEn);
    let chg = '';
    if ((nd.ta || []).length || (nd.tr || []).length) {
      const add = (nd.ta || []).map((t) => `<span class="chg add">+${esc(t)}</span>`).join('');
      const rem = (nd.tr || []).map((t) => `<span class="chg rem">−${esc(t)}</span>`).join('');
      const say = EN()
        ? `${(nd.ta || []).length ? 'gains' : ''}${(nd.ta || []).length && (nd.tr || []).length ? ' / ' : ''}${(nd.tr || []).length ? 'loses' : ''} these tags`
        : `${(nd.ta || []).length ? '태그가 붙습니다' : ''}${(nd.ta || []).length && (nd.tr || []).length ? ' · ' : ''}${(nd.tr || []).length ? '태그가 빠집니다' : ''}`;
      chg = `<div class="chgline">⚡ ${add}${rem} <i>${say}</i></div>`;
    }
    return `<b>${esc(nm)}</b>${d ? `<br>${esc(d)}` : ''}${chg}`;
  }
  function showTip(e, i) {
    if (!tip) return;
    tip.innerHTML = tipFor(i); tip.style.display = 'block';
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + 312 > innerWidth) x = e.clientX - 312; if (x < 4) x = 4;
    tip.style.left = x + 'px'; tip.style.top = Math.min(y, innerHeight - 120) + 'px';
  }
  wrap.addEventListener('mousemove', (e) => { const nd = e.target.closest && e.target.closest('.nd'); if (nd) showTip(e, +nd.dataset.i); else if (tip) tip.style.display = 'none'; });
  wrap.addEventListener('mouseleave', () => { if (tip) tip.style.display = 'none'; });
  wrap.addEventListener('click', (e) => { const nd = e.target.closest && e.target.closest('.nd'); if (nd) showTip(e, +nd.dataset.i); });
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.classList.contains('x')) { modal.classList.remove('on'); if (tip) tip.style.display = 'none'; } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('on')) { modal.classList.remove('on'); if (tip) tip.style.display = 'none'; } });

  window.__openSubtree = open;
})();
