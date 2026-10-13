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
// 빈 「크리에이티브 지니어스」: 단계마다 위·아래 두 묶음에서 하나씩 (45 대폭발 | 소닉·실드, 60 마인드·트러블 | 독창성·엔트로피·지능형, 75 …) —
// 게임 ID 끝 두 자리의 십의 자리(1~6)가 묶음이다. heroNodes = {묶음: 노드 이름} (사용자 인게임 확인 2026-10-13)
const heroSlotOf = n => Math.floor((Number(n && n.nid) || 0) % 100 / 10);
const heroIsDual = t => !!(t && !t.tree && (t.nodes || []).some(n => n.step && heroSlotOf(n) > 3));
const heroKeyOf = (t, n) => heroIsTree(t) ? n.code : heroIsDual(t) ? heroSlotOf(n) : n.step;
const heroPickMax = t => heroIsDual(t) ? 6 : HERO_PICKS + (heroExtraPick(t) ? 1 : 0);
const heroIsTree = t => !!(t && t.tree);
function heroPicked(t) { // 기본 노드를 뺀, 지금 찍힌 노드들
  const pick = preset.heroNodes || {};
  if (!t) return [];
  if (heroIsTree(t)) return (t.nodes || []).filter(n => n.step && pick[n.code] === n.name);
  if (heroIsDual(t)) return (t.nodes || []).filter(n => n.step && (pick[heroSlotOf(n)] === n.name || pick[n.step] === n.name)); // 단계 키(묶음 규칙 전 저장분)도 받는다
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
  } else if (heroIsDual(t)) {
    if (!n || !n.step) return;
    const k = heroSlotOf(n), on = heroPicked(t).includes(n);
    Object.keys(preset.heroNodes).forEach(x => { // 같은 묶음 노드가 다른 키(옛 단계 키)에 있으면 정리
      const o = (t.nodes || []).find(y => y.name === preset.heroNodes[x]);
      if (o && heroSlotOf(o) === k) delete preset.heroNodes[x];
    });
    if (!on) preset.heroNodes[k] = name;
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
    `<span class="gbm-hint">특성을 고르면 아래에서 노드를 찍습니다 — 기본 노드 외 3개 (빈 「크리에이티브 지니어스」는 단계마다 둘씩 6개)</span></div>` +
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
    const dual = heroIsDual(t);
    // 빈: 위 묶음(1~3) 줄 아래에 아래 묶음(4~6) 줄 — 위 묶음 최대 줄 수만큼 내린다
    const dualTop = dual ? Math.max(1, ...(t.nodes || []).filter(n => n.step && heroSlotOf(n) <= 3).map(n => Number(n.nid) % 10)) : 0;
    const rowOf = n => tree ? (treeRow.get(n.name) || 1) : dual ? (heroSlotOf(n) > 3 ? dualTop : 0) + (Number(n.nid) % 10 || 1) : (n.ord || 1);
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
    const nodeHtml = n => {
      const lv = heroStepLevel(n.step), on = n.step === 0 || got.has(n);
      const why = n.step && !on ? heroWhyNot(t, n, true) : '';
      const free = !tree && n.step && !on && (t.nodes || []).some(x => (dual ? heroSlotOf(x) === heroSlotOf(n) : x.step === n.step) && got.has(x)); // 같은 단계(빈은 같은 묶음)에서 다른 걸 골라 둠
      const cls = n.step === 0 ? ' base on' : on ? ' on' : why ? ' lock' : free ? ' alt' : ' can';
      const pos = n.step === 0 ? `grid-column:1;grid-row:2 / span ${rows}` : dual ? '' : `grid-column:${colOf(n) + 1};grid-row:${rowOf(n) + 1}`; // 빈은 묶음 상자가 자리를 잡는다
      const jn = JSON.stringify(n.name).replace(/"/g, '&quot;');
      const tip = n.step === 0 ? '기본 노드 — 늘 보유' : why || (on ? (tree ? '다시 누르면 빼기 (이어진 뒤 노드도 함께)' : '다시 누르면 빼기') : free ? '누르면 이 노드로 바꿉니다 (' + (dual ? '묶음마다 하나' : '단계마다 하나') + ')' : '눌러서 찍기');
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
    };
    if (dual) { // 빈: 묶음(위 1~3 · 아래 4~6)마다 테두리 상자 — 상자 안에서 하나 고른다 (사용자 요청 2026-10-13)
      grid += (t.nodes || []).filter(n => !n.step).map(nodeHtml).join('');
      for (const k of [1, 4, 2, 5, 3, 6]) { // 좁은 화면(자리 지정 해제)에서도 단계 순서로 위·아래가 붙어 나오게
        const ns = (t.nodes || []).filter(n => n.step && heroSlotOf(n) === k).sort((a, b) => Number(a.nid) - Number(b.nid));
        if (!ns.length) continue;
        const st = ns[0].step, done = ns.some(n => got.has(n));
        grid += `<div class="hrm-grp${done ? ' done' : ''}" style="grid-column:${st + 1};grid-row:${(k > 3 ? dualTop : 0) + 2} / span ${k > 3 ? rows - dualTop : dualTop}">` +
          `<span class="hrm-grp-h">${k > 3 ? '아래' : '위'} 묶음 · ${ns.length > 1 ? '택 1' : '1개'}</span>${ns.map(nodeHtml).join('')}</div>`;
      }
    } else grid += (t.nodes || []).map(nodeHtml).join('');
    main += `<div class="hrm-boardh"><b>${escapeHtml(t.trait)}</b><span class="hrm-cnt">${got.size} / ${heroPickMax(t)}</span>` + (heroExtraPick(t) ? '<span class="gbm-hint">부활 옵션으로 네 번째 특성 (게임에서는 그 특성이 바로 최고 레벨)</span>' : '') +
      `<span class="gbm-hint">${tree ? '갈래형 — 기본에서 이어진 노드만 찍을 수 있고, 여러 갈래에 나눠 찍어도 됩니다' : dual ? '단계마다 위 묶음에서 하나, 아래 묶음에서 하나씩 고릅니다' : '단계마다 하나씩 고릅니다'}</span></div>` +
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
    (typeof PAGE_SOLO !== 'undefined' && PAGE_SOLO ? '' : '<button class="gbm-x" onclick="hrCloseModal()">' + (page ? '빌더에서 이어서 짜기 →' : '닫기 ✕') + '</button>') + '</div>' +
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
// 좌우 반전 (2026-10-14 문의 — L(S자) 모양을 거꾸로 놓고 싶다): 신격 모양의 거울상 = 열 부호 반전.
// 거울상이 기존 변형과 (회전·평행이동까지) 같으면 그 변형으로(Z↔T), 없으면 반전 전용 변형(변형 번호 +10, 예: L 반전)을 만든다.
// 반전 전용 변형은 빌더 안에서만 쓰는 번호 — 로그 ShapeId 로는 오지 않는다
const slateShapeKey = c => { // 회전 4가지 중 가장 작은 정규화 문자열
  let cs = c.map(p => p.slice()), best = null;
  for (let k = 0; k < 4; k++) {
    const r0 = Math.min(...cs.map(p => p[0])), c0 = Math.min(...cs.map(p => p[1]));
    const s = cs.map(p => (p[0] - r0) + ',' + (p[1] - c0)).sort().join(';');
    if (best == null || s < best) best = s;
    cs = cs.map(p => [p[1], -p[0]]);
  }
  return best;
};
const GOD_MIRROR = {}; // 신격 u → 좌우 반전한 u (자기 자신이면 대칭 모양)
Object.keys(GOD_BASES).forEach(b => GOD_SHAPES.forEach((g, vi) => {
  const u = +b + vi + 1, mc = g[1].map(p => [p[0], -p[1]]), mk = slateShapeKey(mc);
  if (slateShapeKey(g[1]) === mk) { GOD_MIRROR[u] = u; return; }
  const hit = GOD_SHAPES.findIndex(h => slateShapeKey(h[1]) === mk);
  const m = hit >= 0 ? +b + hit + 1 : +b + vi + 11;
  if (hit < 0) SLATES[m] = Object.assign({}, SLATES[u], {c: mc, shp: g[0].replace(/\d$/, '') + ' 반전'});
  GOD_MIRROR[u] = m; if (!(m in GOD_MIRROR)) GOD_MIRROR[m] = u;
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
      return `<div class="gbz-row gbz-core${cur === tid ? ' on' : ''}${lock ? ' lock' : ''}" onclick="gbCorePick('${tid}')">${ic ? `<img src="${ic}" alt="" loading="lazy">` : ''}<div><b>${escapeHtml(gbCoreName(r))}</b><small>${typeof tipWrapEffect === 'function' && r.tips && Array.isArray(r.tips[0]) && typeof r.tips[0][1] === 'string' ? tipWrapEffect(gbCoreBody(r), r.tips) : escapeHtml(gbCoreBody(r))}</small></div></div>`;
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
    (gbTalentPage() ? '' : '<button class="gbm-x" onclick="gbCloseModal()">닫기 ✕</button>') + '</div>' + // 단독 화면은 빌드와 별개라 빌더로 잇지 않는다
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
const DB = JSON.parse(PD.raw);
const PARTS = PD.parts_js;
const SKILLS = JSON.parse(PD.skills_raw);
const BLENDS = JSON.parse(PD.blends_raw); // 조향 (벨트 전용 옵션, 1줄만 장착)
const TOWERS = JSON.parse(PD.towers_raw); // 타워 시퀀스 (무기·방패 전용 옵션, 1줄만 장착)
const TIERS = JSON.parse(PD.tiers_raw);   // 제작 옵션 티어 변형 (T1 기준, t0/t2 없으면 T1 폴백)
const BLOODP = JSON.parse(PD.bloods_raw); // 블러드 러스트 부위별 기본옵·제작옵 풀 (일반/이상)
const PRISM = JSON.parse(PD.prism_raw);   // 제노 프리즘 (종류 24 + 랜덤 옵션 3칸, 핵심 재능 3~5번째 칸에 1개)
const REVIVALS = JSON.parse(PD.revival_raw); // 추억 부활 옵션 (부활 옵션/루나 페이즈, 하나의 추억에만 1개 적용)
// 로그 가져오기: 부활 옵션 어픽스 ID(AwakenAffix, 5xxx 대역) → REVIVALS 항목
const RVMID = new Map();
REVIVALS.forEach(o => { if (o.mid) RVMID.set(String(o.mid), o); });
// 스킬 이름 → 레벨별 수치({cols,rows}: 액티브·모듈화 1·20렙 / 보조 1·20·30·40렙) 또는
// 티어별 효과({tiers}: 부귀·숭고 보조·촉발체). 원본에 표가 없는 스킬은 아예 키가 없다.
const SKILL_LV = JSON.parse(PD.levels_raw);
// 로그 가져오기: 게임 내부 ID → 한글명 (sk: 스킬 ConfigBaseId, eq: 레전드 UniqueItmId)
const LOGMAP = JSON.parse(PD.logmap_raw);
// 로그 가져오기용 어픽스 ID 색인 — 데이터로 싣지 않고 아래에서 파생한다.
// (예전엔 빌드가 만든 파일을 주입했는데, 값이 "배열 순서"라 데이터가 바뀌면 엉뚱한 행을
//  가리켰다. 어차피 같은 규칙으로 여기서 다시 만들고 있었으므로 파생만 남겼다)
const CRAFTIDX = {idx: {}};  // 제작 옵션 어픽스 ID → DB.rows 인덱스
const BLOODIDX = {idx: {}};  // 블러드 옵션 어픽스 ID → BLOODP [파트, 'o'(제작옵)/'b'(기본옵), 인덱스]
const SLATEIDX = {idx: {}};  // 신격 석판 재능 노드 ID → DB.rows 인덱스 (category='석판')
// 재능 보드 레이아웃: 계열 id 앞2자리 → {n: 계열명, p: [[셀x, 셀y]…], t: [1=하위·3=중위…], l: 연결선}
// 노드 ID는 저장하지 않는다 — p가 열 우선 정렬이라 그 계열의 노드 ID 오름차순과 1:1 (수집 시 전수 검증)
const BOARDS = JSON.parse(PD.board_raw);
// 전투 정령 — 정령 하나당 노드 10개 + 미정 숙명 슬롯 1개, 최대 3개 장착.
// 노드 자리에 운명을 끼우면 그 노드 효과 대신 운명 효과가 걸린다.
const PACT = JSON.parse(PD.pact_raw || '[]');
const HERO = JSON.parse(PD.hero_raw || '[]');
const SERVANT_KO = JSON.parse(PD.servant_raw || '{}'); // servantId → 정령 한글명
const TARTARUS = JSON.parse(PD.tartarus_raw || '[]'); // 타르타로스 스킬 (SS14, DB 탭 전용)
const PACT_TIPS = JSON.parse(PD.pacttips_raw || '{}'); // 정령 용어 툴팁 {용어: 설명}
const PROTOCOL_KO = JSON.parse(PD.protocol_raw || '{}'); // 모듈 프로토콜: 772 대역 어픽스 → {name, effect}
// 베이스(기본) 아이템 — 로그 장비 BaseId와 같은 id (build_bases.py, tlidb 상세 페이지의 id).
// 제작 장비의 베이스 수치(아머·회피·보호막, 무기 크리·공속)와 고정 옵션을 여기서 얻는다.
const BASEIDX = {};
JSON.parse(PD.bases_raw || '[]').forEach(b => { BASEIDX[b.gid] = b; });
// 석판 모양·신격 변형(SLATES·GOD_*)은 00_slate.js (빌더 2 와 공용)

// 로그 가져오기: 재능 트리 노드 geniusId / 운명 게임 id → DB.rows 인덱스 (행의 tid/did에서 파생)
const TALIDX = {idx: {}}, DSTIDX = {idx: {}};
// 로그 가져오기: 프리즘 — 옵션 어픽스 ID(mid) → PRISM.opts 인덱스 / 게임 id(gid) → PRISM.items 인덱스
const PRISMIDX = {idx: {}, item: {}};
PRISM.opts.forEach((o, i) => { if (o.mid) PRISMIDX.idx[o.mid] = i; });
PRISM.items.forEach((x, i) => { if (x.gid) PRISMIDX.item[x.gid] = i; });
// 시즌 정보 — 새 빌드에 시즌 태그로 저장 (시즌 스냅샷 페이지에서 과거 빌드 확인용)
const SEASON = JSON.parse(PD.season_raw);
const TIER_MAP = tierMapGet(); // 티어 표 — 함수는 00_gear.js 공용 (이 이름은 테스트·옛 코드 호환용)
BLOODP.forEach(b => b.opts.sort((a, c) => gradeOrder(a.type) - gradeOrder(c.type))); // 블러드 풀도 같은 순서로
// 제작 옵션의 티어 — 로그의 어픽스 ID 마지막 자리가 곧 티어다 (…0=T0 · …1=T1 · …2=T2).
// 수치로 역산하면 티어끼리 구간이 겹칠 때 틀린다 (예: T0 121~156과 T1 87~120 사이 값).
// T3 이하(낮은 등급)도 같은 자리에 그대로 들어온다 — 우리 데이터는 T0~T2 문구만 갖고 있지만
// 티어 표기 자체는 ID에서 나오므로 있는 그대로 보여준다.
// 그룹 문구의 값 자리([[V]])를 합산된 실제 수치로 되살린다 — 근거 목록(rows) 표기용
function stemLine(g) {
  let i = 0;
  return g.stem.replace(/\[\[V\]\]/g, () => fmtRange((g.vals || [])[i++] || {lo: 0, hi: 0, pc: ''})).replace(/\s+/g, ' ').trim();
}
const ALL_DATA = DB.rows;
// 로그 가져오기 매핑을 데이터에서 직접 파생 (재수집만 하면 최신 유지) —
// 데이터에 ID가 없는 항목은 위의 임베드 매핑(구세대 시드)이 폴백으로 남는다
ALL_DATA.forEach((r, i) => {
  if (r.mid) CRAFTIDX.idx[r.mid] = i;                          // 제작·추억·블러드 세트 옵션 어픽스 ID
  if (r.nids) r.nids.forEach(n => { SLATEIDX.idx[n] = i; }); // 신격 석판 재능 노드 ID (변형 전부)
  if (r.tid) TALIDX.idx[r.tid] = i;                            // 재능 트리 노드 geniusId (로그 가져오기)
  if (r.did) DSTIDX.idx[r.did] = i;                            // 운명 게임 id (로그 tattoInfo.BaseId)
});
SKILLS.forEach(s => { if (s.gid) LOGMAP.sk[s.gid] = s.name; (s.gids || []).forEach(g => { LOGMAP.sk[g] = s.name; }); }); // gids=모듈 별칭 id (로그는 소스 코드 id로 장착 이벤트를 남김)
DB.items.forEach(it => { if (it.gid) LOGMAP.eq[it.gid] = it.name; }); // 레전드 UniqueItmId
BLOODP.forEach((p, pi) => {
  (p.opts || []).forEach((o, oi) => (o.mids || []).forEach(m => { BLOODIDX.idx[m] = [pi, 'o', oi]; }));
  (p.bids || []).forEach((m, bi) => { if (m) BLOODIDX.idx[m] = [pi, 'b', bi]; });
});
// 데이터의 툴팁은 [용어, 설명] 자체 완결형이다(파일 하나로 해석되게). 표시·검색 코드는
// 전역 사전 + 첨자를 쓰므로 로드할 때 여기서 되돌린다 — 같은 설명은 하나로 모은다.
const TIPS = [];
{
  const seen = new Map();
  (DB.rows || []).forEach(r => {
    if (!r.tips) return;
    r.tips = r.tips.map(([term, desc]) => {
      let i = seen.get(desc);
      if (i === undefined) { i = TIPS.push(desc) - 1; seen.set(desc, i); }
      return [term, i];
    });
  });
}
const ITEMS = DB.items;
// 블러드 기본 옵션도 장비 옵션 목록·통합 검색에서 찾을 수 있게 행으로 파생 (마법사 풀은 BLOODP를 그대로 사용)
const BLOOD_SOURCES = [];
BLOODP.forEach(b => {
  const src = '블러드 ' + b.part + (b.aberrant ? '(이상)' : '');
  BLOOD_SOURCES.push(src);
  b.basic.forEach(eff => ALL_DATA.push({category: '장비', effect: eff, source: src, type: '블러드 기본 옵션'}));
});
// 상세 검색 장비 섹션에 블러드 부위 체크박스 줄 추가 (데이터 기준 동적 생성 — 시즌 변경 자동 대응)
document.querySelector('#adv-sec-장비 .adv-rows-grid').insertAdjacentHTML('beforeend',
  `<div class="adv-row adv-row-wide"><span class="adv-row-label">블러드</span><div class="adv-row-items">` +
  BLOOD_SOURCES.map(s => `<label class="cb-label"><input type="checkbox" class="sub-cb cat-장비" value="${s}" checked onchange="subCbChanged('장비')"> ${s}</label>`).join('') +
  `</div></div>`);
let filtered = [...ALL_DATA];
let currentPage = 0;
let pageSize = 100;
let totalPages = 1;
let currentTab = 'all';
let currentSlice = [];

// ── 디자인 팝업 (시스템 alert/confirm 대체) ──
// 선택지 모달: 버튼 여러 개 중 하나 선택
function uiChoice(msg, choices) {
  document.getElementById('uiModalTitle').textContent = '선택';
  document.getElementById('uiModalBody').textContent = String(msg);
  const btns = document.querySelector('#uiModal .modal-btns');
  const orig = btns.innerHTML;
  // 선택 버튼은 좌측 정렬 (확인·취소 다이얼로그의 우측 정렬과 분리)
  btns.innerHTML = `<div class="uic-row-btns" style="width:100%">` +
    choices.map((c, i) => `<button class="bb-btn" data-uic="${i}">${escapeHtml(c.label)}</button>`).join('') +
    `<button class="bb-btn danger" data-uic="-1" style="margin-left:auto">취소</button></div>`;
  btns.querySelectorAll('[data-uic]').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.uic);
    btns.innerHTML = orig;
    document.getElementById('uiModal').style.display = 'none';
    if (i >= 0) choices[i].fn();
  }));
  document.getElementById('uiModal').style.display = 'flex'; modalHistPush();
}
// 줄 라벨이 있는 선택 모달 — rows: [{label, choices: [{label, fn}]}] (무기 부위 선택 등)
function uiChoiceRows(msg, rows) {
  document.getElementById('uiModalTitle').textContent = '선택';
  document.getElementById('uiModalBody').textContent = String(msg);
  const btns = document.querySelector('#uiModal .modal-btns');
  const orig = btns.innerHTML;
  const flat = [];
  btns.innerHTML = rows.map(row =>
    `<div class="uic-row"><span class="uic-row-label">${escapeHtml(row.label)}</span><div class="uic-row-btns">` +
    row.choices.map(c => { const i = flat.push(c) - 1; return `<button class="bb-btn" data-uic="${i}">${escapeHtml(c.label)}</button>`; }).join('') +
    `</div></div>`).join('') +
    `<div class="uic-row"><div class="uic-row-btns" style="justify-content:flex-end"><button class="bb-btn danger" data-uic="-1">취소</button></div></div>`;
  btns.querySelectorAll('[data-uic]').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.uic);
    btns.innerHTML = orig;
    document.getElementById('uiModal').style.display = 'none';
    if (i >= 0) flat[i].fn();
  }));
  document.getElementById('uiModal').style.display = 'flex'; modalHistPush();
}

let uiModalOk = null, uiModalCancelCb = null;
function uiModalCancelClick() {
  const f = uiModalCancelCb;
  closeUiModal();
  if (f) f();
}
function uiAlert(msg) {
  document.getElementById('uiModalTitle').textContent = '알림';
  document.getElementById('uiModalBody').textContent = String(msg);
  document.getElementById('uiModalCancel').style.display = 'none';
  uiModalOk = null;
  document.getElementById('uiModal').style.display = 'flex'; modalHistPush();
}
function uiConfirm(msg, onOk, opts) { // opts: {title, ok, cancel, onCancel} — 취소 버튼에 별도 동작을 줄 때 (배경 클릭·ESC는 콜백 없이 닫힘)
  opts = opts || {};
  document.getElementById('uiModalTitle').textContent = opts.title || '확인';
  document.getElementById('uiModalBody').textContent = String(msg);
  document.getElementById('uiModalOkBtn').textContent = opts.ok || '확인';
  const c = document.getElementById('uiModalCancel');
  c.style.display = '';
  c.textContent = opts.cancel || '취소';
  uiModalCancelCb = opts.onCancel || null;
  uiModalOk = onOk || null;
  document.getElementById('uiModal').style.display = 'flex'; modalHistPush();
}
function uiPrompt(msg, def, onOk, opts) { // 입력 팝업 (시스템 prompt 대체) — opts: {title, type}
  document.getElementById('uiModalTitle').textContent = (opts && opts.title) || '입력';
  document.getElementById('uiModalBody').textContent = String(msg);
  const inp = document.getElementById('uiModalInput');
  // 비밀번호도 type=text + 글자 가림 — type=password 면 크롬이 검색칸 등을 아이디로 묶어 '비밀번호 저장' 창을 띄운다
  inp.type = 'text'; inp.autocomplete = 'off';
  inp.classList.toggle('pw-mask', (opts && opts.type) === 'password');
  inp.value = def || '';
  inp.style.display = '';
  document.getElementById('uiModalCancel').style.display = '';
  uiModalOk = () => onOk(inp.value);
  document.getElementById('uiModal').style.display = 'flex'; modalHistPush();
  setTimeout(() => { inp.focus(); inp.select(); }, 0);
}
document.getElementById('uiModalInput').addEventListener('keydown', e => { if (e.key === 'Enter') uiModalOkClick(); });
function uiModalOkClick() {
  const f = uiModalOk;
  closeUiModal();
  if (f) f();
}
function closeUiModal() {
  document.getElementById('uiModal').style.display = 'none';
  document.getElementById('uiModalInput').style.display = 'none';
  document.getElementById('uiModalOkBtn').textContent = '확인';
  document.getElementById('uiModalCancel').textContent = '취소';
  uiModalOk = null; uiModalCancelCb = null;
}
function alert(msg) { uiAlert(msg); } // 기존 alert 호출부는 그대로 디자인 팝업으로
// 가벼운 알림 토스트 (복사 완료 등 — 팝업 대신 잠깐 표시 후 사라짐)
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── 저장 목록 (localStorage 보관) ──
const SAVE_KEY = 'tlidb_saved_v1';
let saved = [];
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch (e) { saved = []; }
const savedSet = new Set(saved.map(s => s.k));
const KEY_MAP = new Map(ALL_DATA.map(r => [rowKey(r), r]));
// 공백만 달라진 참조 자동 복구: 데이터 재수집으로 효과 텍스트의 공백이 바뀌면 rowKey가 어긋나
// 저장 항목이 "현재 데이터에 없음"이 된다 — 공백 무시 키로 다시 이어준다 (모호하면 복구 안 함)
const NOSPACE_MAP = new Map();
{
  const dup = new Set();
  ALL_DATA.forEach(r => {
    const nk = rowKey(r).replace(/\s+/g, '');
    if (NOSPACE_MAP.has(nk)) dup.add(nk); else NOSPACE_MAP.set(nk, r);
  });
  dup.forEach(nk => NOSPACE_MAP.delete(nk));
}
function healRef(o) { // {k: rowKey} 참조가 현재 데이터에 없으면 공백 무시 키로 재결합
  if (!o || typeof o.k !== 'string' || !o.k.includes('\u001f') || KEY_MAP.has(o.k)) return 0;
  const r = NOSPACE_MAP.get(o.k.replace(/\s+/g, ''));
  if (!r) return 0;
  o.k = rowKey(r);
  if (typeof o.effect === 'string') o.effect = r.effect;
  return 1;
}
function healDeep(x) { // 저장 구조 전체 순회하며 끊긴 참조 복구, 복구 건수 반환
  let n = 0;
  if (Array.isArray(x)) { x.forEach(v => { n += healDeep(v); }); return n; }
  if (x && typeof x === 'object') {
    n += healRef(x);
    Object.values(x).forEach(v => { if (v && typeof v === 'object') n += healDeep(v); });
  }
  return n;
}
// 즐겨찾기도 같은 방식으로 복구 (빌드는 normalizePresetsData에서)
if (healDeep(saved)) {
  savedSet.clear();
  saved.forEach(s => savedSet.add(s.k));
  persistSaved();
}

function updateFavCount() {
  document.getElementById('favCount').textContent = saved.length + savedItems.length;
}

function persistSaved() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {}
  updateFavCount();
}

function toggleSave(r) {
  const k = rowKey(r);
  if (savedSet.has(k)) {
    savedSet.delete(k);
    saved = saved.filter(s => s.k !== k);
  } else {
    savedSet.add(k);
    saved.push({ k, category: r.category, effect: r.effect, source: r.source, type: r.type });
  }
  persistSaved();
  if (currentTab === 'fav') renderFav(); else render();
}

// 이용 기록 (2026-10-10, 헤더 hs/nav.js 의 wtEv — 운영 주소에서만 보낸다)
// 결과 0건 검색어: 입력을 멈추고 1.5초 뒤에도 0건이면 1번 보낸다 (치는 도중의 글자는 안 보냄). DB 화면에서만
let wtMissT = 0;
function wtMiss(tab, q, n) {
  clearTimeout(wtMissT);
  if (n || !q || q.length < 2 || !window.wtEv || document.documentElement.dataset.tliMode !== 'db') return;
  wtMissT = setTimeout(() => window.wtEv('search_miss', {tab, q}), 1500);
}
// 데이터 탭별 표시 카테고리 (장비/재능·석판/운명으로 분리 — ver 7.3)
const TAB_CATS = {all: ['장비'], talent: ['재능', '석판'], destiny: ['운명']};
function switchTab(tab) {
  if (typeof shareView !== 'undefined' && shareView && tab !== 'preset') exitShareView(true); // 보기 중 다른 탭 → 종료
  currentTab = tab;
  ['total', 'all', 'legend', 'talent', 'destiny', 'pact', 'skill', 'tartarus', 'share', 'fav', 'preset'].forEach(t => document.getElementById('tab-' + t).classList.toggle('active', t === tab));
  const dataTab = !!TAB_CATS[tab]; // 장비/재능·석판/운명 — 공용 표를 사용
  document.getElementById('totalWrap').style.display = tab === 'total' ? '' : 'none';
  document.querySelector('.table-wrap').style.display = dataTab ? '' : 'none';
  document.querySelector('.page-controls').style.display = (dataTab || tab === 'skill') ? '' : 'none';
  document.getElementById('skillWrap').style.display = tab === 'skill' ? '' : 'none';
  document.getElementById('favWrap').style.display = tab === 'fav' ? '' : 'none';
  document.getElementById('presetWrap').style.display = tab === 'preset' ? '' : 'none';
  document.getElementById('shareWrap').style.display = tab === 'share' ? '' : 'none';
  document.getElementById('legendWrap').style.display = tab === 'legend' ? '' : 'none';
  document.getElementById('pactWrap').style.display = tab === 'pact' ? '' : 'none';
  document.getElementById('ttWrap').style.display = tab === 'tartarus' ? '' : 'none';
  // 상단 체크박스: 탭에 해당하는 것만 표시
  document.querySelector('.checkboxes').style.display = dataTab ? '' : 'none';
  document.getElementById('lb-기본').style.display = tab === 'all' ? '' : 'none';
  document.getElementById('lb-레전드').style.display = tab === 'all' ? '' : 'none';
  document.getElementById('lb-석판').style.display = tab === 'talent' ? '' : 'none';
  document.getElementById('lb-재능').style.display = tab === 'talent' ? '' : 'none';
  document.getElementById('top-운명-subs').style.display = tab === 'destiny' ? '' : 'none';
  // 효과만 검색 토글은 출처·유형 열이 있는 데이터 탭(+즐겨찾기)에서만 의미 있음 — 스킬 탭에서는 숨김
  document.getElementById('lb-effonly').style.display = (tab === 'skill' || tab === 'talent') ? 'none' : '';
  document.getElementById('lb-coreonly').style.display = tab === 'talent' ? '' : 'none'; // 재능·석판 탭은 '핵심 재능만'
  const advBtn = document.getElementById('btnAdvanced');
  // 운명 탭은 하위/중위가 상단에 있어 상세 검색이 필요 없음
  advBtn.style.display = (tab === 'all' || tab === 'talent' || tab === 'skill') ? '' : 'none';
  const open = advBtn.classList.contains('open');
  document.getElementById('advancedPanel').style.display = (dataTab && open) ? 'flex' : 'none';
  document.getElementById('skillAdvPanel').style.display = (tab === 'skill' && open) ? 'flex' : 'none';
  // 상세검색 섹션도 탭에 맞는 것만 (반대쪽 빈 컬럼은 통째로 숨겨 전폭 사용)
  document.getElementById('adv-sec-장비').style.display = tab === 'all' ? '' : 'none';
  document.getElementById('adv-sec-석판').style.display = tab === 'talent' ? '' : 'none';
  document.getElementById('adv-sec-재능').style.display = tab === 'talent' ? '' : 'none';
  // 검색 줄은 빌드·통합 검색 탭에서는 통째로 숨김 (빌드=검색 대상 없음, 통합=자체 입력창)
  document.getElementById('searchBar').style.display = (tab === 'preset' || tab === 'total' || tab === 'share' || tab === 'legend' || tab === 'pact' || tab === 'tartarus') ? 'none' : '';
  if (tab === 'total') { const el = document.getElementById('totalSearch'); renderTotal(); setTimeout(() => el.focus(), 0); }
  if (tab === 'share') renderShare();
  if (tab === 'pact') { renderPactDb(); setTimeout(() => { const el = document.getElementById('pactSearch'); if (el) el.focus(); }, 0); }
  if (tab === 'tartarus') { renderTartarus(); setTimeout(() => { const el = document.getElementById('ttSearch'); if (el) el.focus(); }, 0); }
  if (tab === 'legend') { renderLegend(); setTimeout(() => { const el = document.getElementById('legendSearch'); if (el) el.focus(); }, 0); }
  doFilter();
  if (window.wtEv && document.documentElement.dataset.tliMode === 'db' && ['total', 'all', 'legend', 'talent', 'destiny', 'pact', 'skill', 'tartarus'].includes(tab)) window.wtEv('dbtab_' + tab);
  syncHashTab(tab); // 뒤로가기 지원: 탭 전환을 브라우저 히스토리에 기록
}

// 즐겨찾기 패널 접기/펼치기 (모바일에서 목록이 길어질 때 유용)
function toggleFavPanel(which) {
  const body = document.getElementById(which === 'opt' ? 'favOptBody' : 'favItemBody');
  const arrow = document.getElementById('favToggle-' + which);
  const open = body.style.display === 'none';
  body.style.display = open ? '' : 'none';
  arrow.textContent = open ? '▲' : '▼';
}

// ── 아이템 저장 (localStorage 보관) ──
const ITEM_KEY = 'tlidb_saved_items_v1';
let savedItems = [];
try { savedItems = JSON.parse(localStorage.getItem(ITEM_KEY)) || []; } catch (e) { savedItems = []; }
const savedItemNames = new Set(savedItems.map(i => i.name));

function persistItems() {
  try { localStorage.setItem(ITEM_KEY, JSON.stringify(savedItems)); } catch (e) {}
  updateFavCount();
}

function toggleSaveItem(it) {
  if (!it) return;
  if (savedItemNames.has(it.name)) {
    savedItemNames.delete(it.name);
    savedItems = savedItems.filter(s => s.name !== it.name);
  } else {
    savedItemNames.add(it.name);
    savedItems.push(it);
  }
  persistItems();
  if (currentTab === 'fav') renderFav();
}

// ── 빌드 (장비 세팅 + 재능, localStorage 보관) ──
const PRESET_SLOTS = presetSlotsOf(PARTS); // 칸 목록은 00_gear.js (빌더 2 와 공용)
const SLOT_BY_ID = new Map(PRESET_SLOTS.map(s => [s.id, s]));
// 다중 빌드: {list: [{id, name, slots, talents}], activeId} — preset 변수는 항상 활성 빌드를 가리킴
const PRESETS_KEY = 'tlidb_presets_v1';
const PRESET_KEY = 'tlidb_preset_v1'; // 구버전(단일 빌드) 키 — 마이그레이션용
let presets = null;
try { const p = JSON.parse(localStorage.getItem(PRESETS_KEY)); if (p && Array.isArray(p.list) && p.list.length) presets = p; } catch (e) {}
if (!presets) {
  // 구버전 단일 빌드 데이터가 있으면 첫 빌드로 이전
  let old = null;
  try { const p = JSON.parse(localStorage.getItem(PRESET_KEY)); if (p && p.slots && p.talents) old = p; } catch (e) {}
  presets = {list: [{id: 1, name: '빌드 1', slots: (old && old.slots) || {}, talents: (old && old.talents) || []}], activeId: 1};
}
// 추억 부위 목록 — 아래 정규화에서 즉시 사용하므로 이 위치에 선언 (추억 제작 로직은 뒤쪽 참고)
// 추억 부위 목록(MEM_PARTS)·제작 단계(MEM_STAGES)는 00_hero.js (빌더 2 와 공용)
// 빌드 데이터 정규화 (필드 보정 + 구버전 마이그레이션) — 로드/백업 복원 공용
function sanTxt(x) { // 외부 유입 문자열 무해화 (태그 시작만 전각 치환 — "A<B" 같은 일반 표기는 유지)
  return typeof x === 'string' ? x.replace(/<(?=[a-zA-Z/!?])/g, '＜') : x;
}
function sanDeep(v) { // 객체·배열을 재귀로 훑으며 모든 문자열 무해화 (백업·코드 등 외부 데이터용)
  if (typeof v === 'string') return sanTxt(v);
  if (Array.isArray(v)) return v.map(sanDeep);
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = sanDeep(v[k]); return v; }
  return v;
}
function normalizePresetsData(ps) {
  sanDeep(ps);
  healDeep(ps); // 데이터 갱신으로 공백만 달라진 참조 복구
  if (!Array.isArray(ps.list) || !ps.list.length) ps.list = [{id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}}];
  if (!ps.list.some(p => p.id === ps.activeId)) ps.activeId = ps.list[0].id;
  ps.list.forEach(p => {
    if (!p.slots) p.slots = {};
    if (!p.mems) p.mems = {}; // 추억 (근원·자기 수호·진격)
    if (!p.memGrade || typeof p.memGrade !== 'object') p.memGrade = {}; // 추억 등급 (히어로 특성 레벨 기준)
    Object.keys(p.memGrade).forEach(k => { if (p.memGrade[k] === 'low') p.memGrade[k] = 'normal'; }); // 구 3단계 → 5단계
    (p.pacts || []).forEach(pc => { if (pc && pc.star != null) { pc.adv = pc.star + 1; delete pc.star; } }); // 정령 승급 표기 통일 (0~5 → 1~6)
    if (!p.heroNodes || typeof p.heroNodes !== 'object') p.heroNodes = {}; // 히어로 특성에서 고른 노드
    if (!p.heroHerbs || typeof p.heroHerbs !== 'object') p.heroHerbs = {}; // 히어로 특성 약재 (분류마다 택1)
    if (!['0', '1', '2'].includes(p.tier)) p.tier = '1'; // 제작 옵션 표시 티어 (기본 T1)
    // 석판 보드 배치(로그 가져오기) 정리 — 정수 필드·개수 상한 (백업 등 외부 유입 대비)
    if (p.slateBd) {
      p.slateBd = (Array.isArray(p.slateBd) ? p.slateBd : []).slice(0, 12)
        .filter(s => s && Number.isFinite(+s.u) && Number.isFinite(+s.i))
        .map(s => {
          const o = {u: +s.u, i: +s.i, d: Math.min(3, Math.max(0, parseInt(s.d, 10) || 0)), f: parseInt(s.f, 10) || 0,
                     t: (Array.isArray(s.t) ? s.t : []).slice(0, 8).map(x => x ? String(x) : '')};
          if (s.o1) o.o1 = 1; // 모양 미확정 → 원점 칸만 표시
          return o;
        });
      if (!p.slateBd.length) delete p.slateBd;
    }
    // 재능 보드(찍은 노드) 정리 — [노드ID(8자리), 포인트] 쌍만 남긴다
    if (p.gboard) {
      p.gboard = (Array.isArray(p.gboard) ? p.gboard : []).slice(0, 200)
        .filter(x => Array.isArray(x) && /^\d{8}$/.test(String(x[0])) && BOARDS[String(x[0]).slice(0, 2)] &&
          String(x[0]).slice(2, 4) !== '00' && SLATEIDX.idx[String(x[0])] !== undefined) // 실재하는 보드 노드만 (BOARD_IDS와 같은 조건 — 초기화 순서 때문에 직접 검사)
        .map(x => x.length > 2 // 위치·플래그가 있는 형식 (역상 반사 노드 포함)
          ? [String(x[0]), Math.max(0, Math.min(9, parseInt(x[1], 10) || 0)),
             Math.max(0, Math.min(9, parseInt(x[2], 10) || 0)), Math.max(0, Math.min(9, parseInt(x[3], 10) || 0)),
             Math.max(0, Math.min(7, parseInt(x[4], 10) || 0))]
          : [String(x[0]), Math.max(1, Math.min(9, parseInt(x[1], 10) || 1))]);
      if (!p.gboard.length) delete p.gboard;
    }
    // 재능 보드 칸 순서 — 3·4번은 규칙이 없어 사용자가 바꿀 수 있다(1·2번은 신·그 하위로 정해짐). 계열 번호 목록
    if (p.gbOrder) { p.gbOrder = (Array.isArray(p.gbOrder) ? p.gbOrder : []).map(String).filter(x => BOARDS[x]).slice(0, 4); if (!p.gbOrder.length) delete p.gbOrder; }
    ['gbPrism', 'gbPrism2'].forEach(key => { // 프리즘·역상 영향 범위 (계열 + 칸 목록)
      if (!p[key]) return;
      const g = p[key];
      const cells = (Array.isArray(g.c) ? g.c : []).slice(0, 30)
        .filter(c => Array.isArray(c) && +c[0] > 0 && +c[1] > 0).map(c => [+c[0], +c[1]]);
      if (BOARDS[g.b] && cells.length) {
        p[key] = {b: String(g.b), c: cells, nd: g.nd ? String(g.nd) : '', k: g.k === 'i' ? 'i' : 'p'};
        if (g.iv && typeof g.iv === 'object') { // 역상의 반사 효과 % (로그 실측값)
          const iv = {};
          ['low', 'mid', 'leg'].forEach(t => { if (isFinite(+g.iv[t])) iv[t] = +g.iv[t]; });
          if (Object.keys(iv).length) p[key].iv = iv;
        }
      }
      else delete p[key];
    });
    // 구버전 블러드 슬롯에 추가 옵션 필드 보정 + 추가 옵션 상한(레전드 1개=5, 2개=4) — 백업 등 외부 유입 대비
    Object.values(p.slots).forEach(v => {
      if (!v || v.kind !== 'blood' || !v.opts) return;
      if (!v.opts.extra) v.opts.extra = [];
      if (!v.opts.base) v.opts.base = [];
      const cap = bloodExtraCap((v.opts.blood || []).length);
      if (v.opts.extra.length > cap) v.opts.extra = v.opts.extra.slice(0, cap);
      // 16.1 이전에 만든 슬롯은 tiers에 침식(t0p)이 없음 → 현재 블러드 풀에서 같은 옵션을 찾아 보충
      // (BLOODP는 이 함수 최초 호출보다 앞서 선언됨 — TDZ 아님)
      v.opts.extra.forEach(o => {
        if (o.tiers && o.tiers.t0p) return;
        const pool = bloodPool(v.part, v.aberrant);
        const src = pool && pool.opts.find(x => x.effect === o.effect);
        if (!src) return;
        o.tiers = o.tiers || {};
        if (src.t0 && !o.tiers.t0) o.tiers.t0 = src.t0;
        if (src.t0p) o.tiers.t0p = src.t0p;
        if (src.t2 && !o.tiers.t2) o.tiers.t2 = src.t2;
      });
    });
    // 침식 강화 인덱스 정리 — 정수·중복 제거·상한 (백업 등 외부 유입 대비)
    Object.values(p.slots).forEach(v => {
      if (!v || v.ero === undefined) return;
      const ero = Array.isArray(v.ero) ? [...new Set(v.ero.map(n => parseInt(n, 10)).filter(n => n >= 0 && n < 20))].sort((a, b) => a - b).slice(0, v.kind === 'blood' ? 3 : 2) : [];
      if (ero.length) v.ero = ero; else delete v.ero;
    });
    if (!p.talents) p.talents = [];
    // 시즌 태그: 없으면 현재 데이터의 시즌을 부여 (이미 있으면 유지 — 다음 시즌에 소급되지 않음)
    if (!p.season && SEASON.label) p.season = SEASON.label;
    // 운명 개수(같은 숙명 ×N): 1~99 정수만 허용, 1이면 필드 제거
    p.talents.forEach(t => {
      if (t && t.cnt != null) {
        t.cnt = Math.max(1, Math.min(99, parseInt(t.cnt, 10) || 1));
        if (t.cnt === 1) delete t.cnt;
      }
    });
    // 히어로 특성: {hero, trait} 모양만 확인 (유효 태그인지는 표시할 때 조회)
    if (p.hero && !(typeof p.hero.hero === 'string' && typeof p.hero.trait === 'string'
      && p.hero.hero.length <= 12 && p.hero.trait.length <= 20)) delete p.hero;
    // 제노 프리즘 필드 보정 (pos 3~5, 옵션 3칸 고정)
    if (p.prism) {
      if (!p.prism.name || ![3, 4, 5].includes(p.prism.pos)) delete p.prism;
      else if (!Array.isArray(p.prism.opts) || p.prism.opts.length !== 3) p.prism.opts = [null, null, null];
    }
    // 역상 필드 보정 (pos 3~5, 중요도 불리언 3종, 프리즘과 같은 칸 불가)
    if (p.inverse) {
      if (![3, 4, 5].includes(p.inverse.pos) || !p.inverse.opts || (p.prism && p.prism.pos === p.inverse.pos)) delete p.inverse;
      else p.inverse.opts = {low: !!p.inverse.opts.low, mid: !!p.inverse.opts.mid, abs: !!p.inverse.opts.abs};
    }
    // 추억 부활 옵션 필드 보정 (부위·효과 필수, 추가 추억은 배열 3종 필수)
    if (p.revival) {
      if (!p.revival.effect || !MEM_PARTS.includes(p.revival.part)) delete p.revival;
      else if (p.revival.mem && !(Array.isArray(p.revival.mem.basic) && Array.isArray(p.revival.mem.unique) && Array.isArray(p.revival.mem.random))) delete p.revival.mem;
    }
    if (!p.skills) p.skills = {}; // 스킬 빌드 필드 마이그레이션
    Object.values(p.skills).forEach(sk => { // 구버전 분류명 '발동 매개' → '촉발체'
      if (!sk) return;
      [sk.main, ...(sk.sup || [])].forEach(ref => { if (ref && ref.kind === '발동 매개') ref.kind = '촉발체'; });
    });
  });
}
normalizePresetsData(presets);
let preset = presets.list.find(p => p.id === presets.activeId);
// 아이템명 → 부위(source) 매핑 (장착 슬롯 판정용)
const ITEM_PART = new Map();
ALL_DATA.forEach(r => { if (r.item !== undefined && r.source) ITEM_PART.set(ITEMS[r.item].name, r.source); });
// 예외: 출처가 빈 특수 장비는 논리 부위를 직접 지정 (올마이티 오리진 = 특수 갑옷)
const PART_OVERRIDE = new Map([['올마이티 오리진', '특수 갑옷']]);
PART_OVERRIDE.forEach((p, name) => ITEM_PART.set(name, p));

// ── Ctrl+Z 되돌리기: persistPreset 스냅샷 스택 (세션 한정, 최대 50단계) ──
const UNDO_MAX = 50;
const undoStack = [], redoStack = [];
let undoLast = JSON.stringify(presets); // 마지막 저장 상태 (다음 변경 시 undo 스택으로)
// ── 계산 캐시 ──
// optSummary·computePresetResists는 프리셋이 안 바뀌면 결과가 같은데, 대미지 계산 화면이
// 클릭마다 이들을 수 번씩 다시 돌려 칩 토글 1번에 7초가 걸렸다. 캐시 키는 프리셋 내용 자체
// (stringify ≈ 0.05ms) — 코드가 preset을 직접 바꿔도 키가 달라져 저절로 무효화된다.
// calcVer는 프리셋 밖 입력이 바뀔 때(데이터 교체 등)의 강제 무효화 훅.
let calcVer = 0;
function bustCalcCache() { calcVer++; }
function calcCacheKey() {
  // optSkill: 대상 스킬을 고르면 그 스킬의 보조 옵션 줄이 수집에 합류한다 — 키에 포함해야 한다
  try { return calcVer + ':' + (typeof optSkill === 'string' ? optSkill : '') + ':' + JSON.stringify(preset); } catch (e) { return null; }
}
// 켜짐/꺼짐까지 반영한 키 — liveOptionLines를 쓰는 계산(저항·오라·스킬 레벨…)은 이 키로 캐시해야 한다.
// optSummary 자체는 끈 줄도 목록에 보여야 하므로 위의 기본 키를 쓴다 (토글마다 다시 모으지 않게)
function calcCacheKeyLive() {
  const base = calcCacheKey();
  if (base == null) return null;
  try { return base + '|off:' + [...optOff].join('\u0001') + '|on:' + [...optOn].join('\u0001'); } catch (e) { return base; }
}
function persistPreset() {
  const cur = JSON.stringify(presets);
  if (cur !== undoLast) {
    undoStack.push(undoLast);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0; // 새 변경이 생기면 다시 실행 이력은 무효
    undoLast = cur;
  }
  try { localStorage.setItem(PRESETS_KEY, cur); } catch (e) {}
  updatePresetCount();
}
function undoPreset(redo) {
  if (build) return; // 제작·추가 모드 중에는 미적용 (완료/취소 후 사용)
  const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
  if (!from.length) return;
  to.push(undoLast);
  presets = JSON.parse(from.pop());
  normalizePresetsData(presets);
  undoLast = JSON.stringify(presets); // 정규화 반영본을 기준점으로
  preset = presets.list.find(p => p.id === presets.activeId) || presets.list[0];
  try { localStorage.setItem(PRESETS_KEY, undoLast); } catch (e) {}
  updatePresetCount();
  renderPreset();
}
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = (e.key || '').toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // 텍스트 입력은 브라우저 기본 undo
  e.preventDefault();
  undoPreset(k === 'y' || e.shiftKey); // Ctrl+Z=되돌리기, Ctrl+Y·Ctrl+Shift+Z=다시 실행
});
function updatePresetCount() {
  // 탭 라벨에는 빌드 개수를 표시 (개별 항목 수는 빌드 탭 안에서 확인)
  document.getElementById('presetCount').textContent = presets.list.length;
}
function isTwoHandEquipped() { const w = preset.slots['weapon1']; return !!(w && PARTS.TWO_HAND.includes(w.part)); }

// ── 다중 빌드 관리 (초반/중반/엔드 등 단계별 빌드) ──
function guardBuildMode() {
  if (build) { alert('제작·추가 모드 중에는 빌드를 관리할 수 없습니다. 상단 바에서 완료 또는 취소 후 진행해주세요.'); return true; }
  return false;
}
function switchPreset(id) {
  if (guardBuildMode()) return;
  const target = presets.list.find(p => p.id === id);
  if (!target) return;
  if (typeof shareView !== 'undefined' && shareView) exitShareView(true); // 공유 보기 중 빌드를 바꾸면 보기부터 끝낸다 (띠가 남던 문제)
  presets.activeId = id;
  preset = target;
  persistPreset();
  renderPreset();
}
function addPreset() {
  if (guardBuildMode()) return;
  const nm = prompt('새 빌드 이름 (예: 초반, 중반, 엔드)', `빌드 ${presets.list.length + 1}`);
  if (nm === null) return;
  const id = Math.max(...presets.list.map(p => p.id)) + 1;
  presets.list.push({id, name: nm.trim() || `빌드 ${presets.list.length + 1}`, slots: {}, talents: [], skills: {}});
  presets.activeId = id;
  preset = presets.list[presets.list.length - 1];
  persistPreset();
  renderPreset();
}
function duplicatePreset() { // 확인 모달을 거쳐 복제 (활성 버튼의 📋)
  if (guardBuildMode()) return;
  uiConfirm(`[${preset.name}] 빌드를 복제할까요?`, doDuplicatePreset);
}
function doDuplicatePreset() {
  const id = Math.max(...presets.list.map(p => p.id)) + 1;
  const copy = JSON.parse(JSON.stringify(preset));
  copy.id = id;
  delete copy.sid; // 통계용 식별자는 복사하지 않음 (복제본은 다른 빌드)
  copy.name = preset.name + ' 복사';
  presets.list.push(copy);
  presets.activeId = id;
  preset = presets.list[presets.list.length - 1];
  persistPreset();
  renderPreset();
}
function renamePreset() { // 활성 버튼 안에서 바로 수정 (✏ 또는 [+] 직후)
  const btn = document.querySelector('.pset-btn.active');
  if (!btn) return;
  const nameEl = btn.querySelector('.pset-name');
  if (!nameEl || btn.querySelector('input')) return;
  const inp = document.createElement('input');
  inp.className = 'pset-rename';
  inp.value = preset.name;
  inp.maxLength = 30;
  nameEl.replaceWith(inp);
  inp.focus();
  inp.select();
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const nm = inp.value.trim();
    if (save && nm) { preset.name = nm; persistPreset(); }
    renderPreset();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  inp.addEventListener('blur', () => finish(true));
  inp.addEventListener('click', e => e.stopPropagation());
}
function addPresetInline() { // 목록 끝 [+] — 기본 이름으로 만들고 곧바로 이름 수정 모드
  if (guardBuildMode()) return;
  const id = Math.max(...presets.list.map(p => p.id)) + 1;
  presets.list.push({id, name: `빌드 ${presets.list.length + 1}`, slots: {}, talents: [], skills: {}});
  presets.activeId = id;
  preset = presets.list[presets.list.length - 1];
  persistPreset();
  renderPreset();
  renamePreset();
}
function deletePreset() {
  if (guardBuildMode()) return;
  uiConfirm(`[${preset.name}] 빌드를 삭제할까요? 되돌릴 수 없습니다.`, () => {
    presets.list = presets.list.filter(p => p.id !== presets.activeId);
    if (!presets.list.length) presets.list.push({id: 1, name: '빌드 1', slots: {}, talents: [], skills: {}});
    presets.activeId = presets.list[0].id;
    preset = presets.list[0];
    persistPreset();
    renderPreset();
  });
}
// ── 빌드 패널 접기/펼치기 (제목 클릭, 상태는 화면 상태와 함께 저장) ──
let presetPanelOpen = {}; // 키별 false=접힘, 그 외=펼침
const PRESET_PANEL_KEYS = ['eq', 'tal', 'mem', 'hero', 'dst', 'slab', 'sk', 'memo'];
// ── 히어로 특성: 빌드에 저장하고 공유 태그로 자동 사용 ──
// SHARE_TAG_TRAIT은 파일 뒤쪽(공유 섹션)에서 정의되므로 부팅 중 호출에 대비해 안전하게 접근
function renderPresetHero() {
  const box = document.getElementById('presetHeroBox');
  if (!box) return;
  const h = preset.hero;
  const tr = h ? traitInfo(h.trait) : null;
  box.innerHTML = h
    ? (tr ? `<img class="phero-ico" src="${tr.img}" loading="lazy" onerror="this.style.display='none'">` : '') +
      `<span class="phero-name">${escapeHtml(heroLabel(h))}</span>` +
      `<button class="btn-sel" onclick="openHeroPick()" title="큰 화면에서 히어로·특성을 바꾸고 노드를 찍습니다">변경 · 찍기</button>`
    : `<button class="btn-sel" onclick="openHeroPick()" title="이 빌드의 히어로 특성을 고릅니다 (공유 태그로 자동 사용)">🦸 히어로 선택</button>`;
  // 히어로 줄 우측 끝 시즌 표기 — 현재 시즌과 다르면 강조 (이전 시즌 빌드)
  const sb = document.getElementById('presetSeasonBox');
  if (sb) {
    const ps = preset.season || SEASON.label || ''; // 태그 없는 빌드 = 현재 시즌 (정규화가 같은 값을 부여)
    const old = ps && SEASON.label && ps !== SEASON.label;
    sb.innerHTML = ps
      ? `<span class="cnt" style="${old ? '' : 'color:#8b949e;background:#161b22;border-color:#21262d;'}" title="${old
          ? '이전 시즌에 만든 빌드입니다 (현재 ' + escapeHtml(SEASON.label || '') + ')'
          : escapeHtml((SEASON.name || '') + ' 시즌에 만든 빌드')}">${escapeHtml(ps)}${old ? ' · 이전 시즌' : ''}</span>`
      : '';
  }
}
function openHeroPick() {
  if (guardShareView()) return;
  if (typeof hrOpenModal === 'function') { hrOpenModal(); return; } // 큰 팝업(히어로 → 특성 → 노드) — 아래 작은 목록은 예비
  const cur = preset.hero;
  document.getElementById('heroList').innerHTML = '<div class="hero-grid" style="padding:10px">' + SHARE_HEROES.map(([hero, traits]) =>
    `<div class="hero-row"><span class="hero-label">${escapeHtml(hero)}</span><div class="hero-traits">` +
    traits.map(([short, full, img]) => {
      const on = cur && cur.trait === short ? ' on' : '';
      return `<button class="hero-btn${on}" data-hero="${escapeHtml(hero)}" data-htrait="${escapeHtml(short)}">` +
        `<img src="${HERO_IMG_BASE + img}" loading="lazy" onerror="this.style.visibility='hidden'">` +
        `<span>${escapeHtml(full)}</span><em>${escapeHtml(short)}</em></button>`;
    }).join('') + '</div></div>').join('') + '</div>';
  document.getElementById('heroModal').style.display = 'flex'; modalHistPush();
}
function closeHeroPick() { document.getElementById('heroModal').style.display = 'none'; }
function guardIrisSpirit(nextHero) { // 아이리스에서 벗어날 때 마령 스킬이 액티브에 남아 있으면 차단
  if (!isIrisPreset() || nextHero === '아이리스') return false;
  const used = activeMainNames(isSpiritPassive);
  if (!used.length) return false;
  alert('액티브 슬롯에 마령 스킬(' + used.join(', ') + ')이 있어 히어로를 바꿀 수 없습니다.\n먼저 해당 스킬을 비워주세요.');
  return true;
}
function pickHero(hero, trait) {
  if (guardIrisSpirit(hero)) return;
  // 다른 특성으로 바꾸면 찍은 노드·약재는 비운다 (갈래 특성은 3개 제한을 세므로 남은 값이 섞이면 안 된다)
  if (!preset.hero || preset.hero.trait !== trait) { preset.heroNodes = {}; preset.heroHerbs = {}; }
  preset.hero = {hero, trait};
  persistPreset();
  // 제목 줄만 다시 그리면 아래 히어로 특성 칸·옵션 합산이 옛 특성으로 남는다 → 빌드 화면 전체를 다시 그린다
  renderPreset();
  closeHeroPick();
  if (typeof hrModalOpen !== 'undefined' && hrModalOpen) hrRenderModal();
}
function clearHero() {
  if (guardIrisSpirit(null)) return;
  delete preset.hero;
  persistPreset();
  renderPreset();
  closeHeroPick();
}
function togglePresetPanel(e, key) {
  if (e && e.target.closest('button, .pinfo, .tier-toggle, .phero')) return; // 버튼·ⓘ·티어·히어로 클릭은 토글 제외
  presetPanelOpen[key] = presetPanelOpen[key] === false; // 접힘 ↔ 펼침
  applyPresetPanels();
  // 메모는 접힌(display:none) 동안 높이 측정이 0이라 — 펼칠 때 자동 높이 재계산
  if (key === 'memo' && presetPanelOpen.memo !== false) autoGrowMemo();
  saveUiState();
}
function applyPresetPanels() {
  PRESET_PANEL_KEYS.forEach(k => {
    const open = presetPanelOpen[k] !== false;
    const b = document.getElementById('pbody-' + k);
    if (b) b.style.display = open ? '' : 'none';
    const a = document.getElementById('ptg-' + k);
    if (a) a.textContent = open ? '▾' : '▸';
  });
}

function renderPresetBar() {
  document.getElementById('presetBar').innerHTML =
    `<div class="pset-list">` +
    presets.list.map(p => {
      const cnt = PRESET_SLOTS.filter(s => p.slots[s.id]).length + p.talents.length + skillFilledCount(p) + (p.prism ? 1 : 0) + (p.inverse ? 1 : 0) + (p.revival ? 1 : 0);
      const act = p.id === presets.activeId;
      const tools = act
        ? `<span class="pset-tool" onclick="event.stopPropagation();duplicatePreset()" title="이 빌드 복제">📋</span><span class="pset-tool" onclick="event.stopPropagation();renamePreset()" title="이름 바로 수정">✏️</span>`
        : '';
      const del = act ? `<span class="pset-tool pset-del" onclick="event.stopPropagation();deletePreset()" title="이 빌드 삭제">×</span>` : '';
      return `<span class="pset-btn${act ? ' active' : ''}" role="button" draggable="true" data-pid="${p.id}" onclick="switchPreset(${p.id})" title="드래그로 순서 변경">${tools}<span class="pset-name">${escapeHtml(p.name)}</span> <span class="pset-cnt">${cnt}</span>${del}</span>`;
    }).join('') + `<button class="pset-btn pset-add" onclick="addPresetInline()" title="새 빌드 추가">＋</button><span class="pinfo tip2" title="여러 빌드 관리&#10;목록 끝 [＋]=새 빌드 · 활성 버튼의 📋=복제, ✏️=이름 수정, ×=삭제&#10;드래그 또는 ◀▶로 순서 변경&#10;[🔗 링크 복사]: 빌드 1개를 링크로 공유 (열면 가져오기 창)&#10;[이전과 비교]: 목록에서 바로 앞 빌드와 차이 표시 · [이미지 미리보기]: 빌드를 PNG로">i</span></div>` +
    `<span class="pset-actions">` +
    `<span class="pset-act-row pset-act-split">` +
    `<span class="pset-act-group"><button class="btn-sel mv-btn" onclick="movePresetBy(-1)" title="선택된 빌드를 앞으로">◀</button><button class="btn-sel mv-btn" onclick="movePresetBy(1)" title="선택된 빌드를 뒤로">▶</button></span>` +
    `<span class="pset-act-group">${SHARE_ONLINE ? '<button class="btn-sel" onclick="openShareUp()" title="현재 빌드를 공유 게시판에 올립니다">🌐 공유 올리기</button>' : ''}<button class="btn-sel" onclick="exportPresetLink()" title="현재 빌드를 링크(URL)로 복사 — 받는 사람은 링크만 열면 가져오기 창이 뜹니다">🔗 링크 복사</button><button class="btn-sel" onclick="document.getElementById('logFile').click()" title="게임 로그 파일에서 착용 중인 스킬·장비를 새 빌드로 가져옵니다">🎮 로그 가져오기</button><button class="btn-sel" onclick="exportPresetImage()">📷 이미지 미리보기</button><span class="pinfo tip2" title="게임 로그로 빌드 만들기&#10;① 게임 설정에서 [로그 오픈]을 켭니다&#10;② 캐릭터 선택 화면으로 나갔다 다시 로그인합니다 — 핵심 재능·운명·프리즘 등은 로그인 시점에만 기록되기 때문에, 재접속하지 않으면 일부 데이터를 못 가져올 수 있어요&#10;③ [🎮 로그 가져오기]를 눌러 아래 파일을 선택하면 착용 중인 스킬(보조 포함)·장비·추억·석판·핵심 재능·운명·프리즘·히어로가 새 빌드로 만들어집니다&#10;&#10;로그 폴더 (Steam 기본 설치 기준) — 이 폴더의 UE_game.log:&#10;C:\\Program Files (x86)\\Steam\\steamapps\\common\\Torchlight Infinite\\UE_game\\TorchLight\\Saved\\Logs&#10;&#10;파일은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다">i</span></span>` +
    `</span>` +
    `</span>`;
  // 활성 빌드가 목록 스크롤 밖에 있으면 보이는 위치로 (모바일 한 줄 스크롤)
  const _pl = document.querySelector('.pset-list'), _ab = _pl && _pl.querySelector('.pset-btn.active');
  if (_ab && _pl.scrollWidth > _pl.clientWidth) _pl.scrollLeft = Math.max(0, _ab.offsetLeft - _pl.offsetLeft - 12);
  // 비교 버튼: 첫 순번 빌드면 숨김
  const cmpBtn = document.getElementById('cmpBtn');
  const hasPrev = !!prevPreset();
  cmpBtn.style.display = hasPrev ? '' : 'none';
  cmpBtn.textContent = compareOn ? '비교 끔' : '이전과 비교';
  cmpBtn.classList.toggle('cmp-on', compareOn);
}

// ── 빌드 메모 (클릭하면 수정 시작, 포커스가 빠지면 자동 저장) ──
let memoPid = null;
function startMemoEdit() {
  if (guardShareView()) return;
  const ta = document.getElementById('presetMemoTa');
  if (!ta.readOnly) return;
  ta.readOnly = false;
  ta.classList.add('editing');
  ta.focus();
}
function saveMemo() {
  const ta = document.getElementById('presetMemoTa');
  if (ta.readOnly) return;
  preset.memo = ta.value.trim().slice(0, 1500);
  ta.value = preset.memo; // 트림된 저장본으로 표시 갱신
  autoGrowMemo();
  persistPreset();
  ta.readOnly = true;
  ta.classList.remove('editing');
}
function autoGrowMemo() { // 내용에 맞춰 세로 길이 자동 확장 + 글자 수 표시
  const ta = document.getElementById('presetMemoTa');
  ta.style.height = 'auto';
  ta.style.height = Math.max(72, ta.scrollHeight + 2) + 'px';
  document.getElementById('memoCount').textContent = ta.value.length + '/1500';
}
function renderPresetMemo() {
  const ta = document.getElementById('presetMemoTa');
  if (memoPid !== preset.id) { // 빌드가 바뀌면 편집 상태 초기화
    memoPid = preset.id;
    ta.readOnly = true;
    ta.classList.remove('editing');
  }
  if (ta.readOnly) ta.value = preset.memo || '';
  autoGrowMemo();
}

// ── 이전 빌드와 비교 ──
let compareOn = false;
function prevPreset() {
  const i = presets.list.findIndex(p => p.id === presets.activeId);
  return i > 0 ? presets.list[i - 1] : null;
}
function toggleCompare() {
  if (!compareOn && !prevPreset()) { alert('비교할 이전 빌드가 없습니다. (목록에서 바로 앞 순번 빌드와 비교합니다)'); return; }
  compareOn = !compareOn;
  renderPreset();
}
// 슬롯 내용 서명 (다르면 변경으로 판정)
function slotSig(v) {
  if (!v) return '';
  const bl = (v.blend ? '|bl:' + v.blend.effect : '') + (v.tower ? '|tw:' + v.tower.effect : '') +
    (v.ero && v.ero.length ? '|er:' + v.ero.join(',') : '');
  if (v.kind === 'item') return 'i:' + v.name + bl;
  if (v.kind === 'blood') return 'b:' + v.opts.blood.map(o => o.k).join(',') + ';' + (v.opts.extra || []).map(o => o.k).join(',') + bl;
  return 'c:' + ['basic', 'main', 'sub'].map(c => v.opts[c].map(o => o.k).join(',')).join(';') + bl;
}
function skillSig(sk) {
  if (!sk || !sk.main) return '';
  return sk.main.name + '|' + sk.sup.map(sp => sp ? sp.name : '').join(',');
}
function diffMark(cls, label, prevDesc) {
  const tip = ('이전 빌드\n' + (prevDesc || '비어 있음')).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return ` <span class="diff-badge ${cls} tip2" title="${tip}">${label}</span>`;
}
function diffBadge(curSig, prevSig, prevDesc) {
  if (curSig === prevSig) return '';
  if (!prevSig) return diffMark('new', '신규', '');
  if (!curSig) return diffMark('del', '제거', prevDesc);
  return diffMark('chg', '변경', prevDesc);
}
// 이전 빌드 내용 요약 (배지 툴팁용)
function slotDesc(v) {
  if (!v) return '';
  const bl = (v.blend ? '\n조향: ' + v.blend.effect : '') + (v.tower ? '\n시퀀스: ' + v.tower.effect : '') +
    (v.ero && v.ero.length ? '\n침식 강화 ' + v.ero.length + '개' : '');
  if (v.kind === 'item') return v.name + bl;
  const opts = v.kind === 'blood' ? [...v.opts.blood, ...(v.opts.extra || [])] : ['basic', 'main', 'sub'].flatMap(c => v.opts[c]);
  const name = v.kind === 'blood' ? (v.name || `블러드 제작 ${v.part}`) : customName(v);
  return name + '\n- ' + opts.map(o => o.effect).join('\n- ') + bl;
}
function skillDesc(sk) {
  if (!sk || !sk.main) return '';
  const sups = sk.sup.map((sp, i) => sp ? `${i + 1}. ${sp.name}` : null).filter(Boolean).join('\n');
  return sk.main.name + (sups ? '\n' + sups : '');
}

// ── 전체 백업/복원 (모든 빌드 + 즐겨찾기) ──
function exportBackup() {
  const data = {v: 1, type: 'tlidb_backup', date: reportDateStr(), presets, saved, savedItems};
  const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `미니토치DB_백업_${reportDateStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function validateBackup(data) {
  if (!data || data.type !== 'tlidb_backup' || !data.presets || !Array.isArray(data.presets.list)) throw new Error('백업 파일 형식이 아닙니다');
}
function applyBackup(data, mode) {
  validateBackup(data);
  if (mode === 'merge') {
    // 빌드 추가: 백업 빌드를 현재 목록 뒤에 붙이고, 즐겨찾기는 중복 없이 합침
    let nextId = Math.max(...presets.list.map(p => p.id)) + 1;
    const incoming = JSON.parse(JSON.stringify(data.presets.list));
    incoming.forEach(p => { p.id = nextId++; presets.list.push(p); });
    normalizePresetsData(presets);
    (Array.isArray(data.saved) ? data.saved : []).forEach(s => {
      if (s && s.k && !savedSet.has(s.k)) { savedSet.add(s.k); saved.push(s); }
    });
    (Array.isArray(data.savedItems) ? data.savedItems : []).forEach(it => {
      if (it && it.name && !savedItemNames.has(it.name)) { savedItemNames.add(it.name); savedItems.push(it); }
    });
    alert(`백업의 빌드 ${incoming.length}개를 추가했습니다. (현재 빌드 ${presets.list.length}개)`);
  } else {
    presets = data.presets;
    normalizePresetsData(presets);
    preset = presets.list.find(p => p.id === presets.activeId);
    saved = Array.isArray(data.saved) ? data.saved : [];
    savedSet.clear();
    saved.forEach(s => savedSet.add(s.k));
    savedItems = Array.isArray(data.savedItems) ? data.savedItems : [];
    savedItemNames.clear();
    savedItems.forEach(i => savedItemNames.add(i.name));
    alert(`백업(${data.date || '날짜 미상'})으로 교체했습니다. 빌드 ${presets.list.length}개, 즐겨찾기 ${saved.length + savedItems.length}개.`);
  }
  persistSaved();
  persistItems();
  persistPreset();
  doFilter();
  return true;
}

// 백업 불러오기 선택 모달 (전부 교체 / 빌드 추가 / 취소)
let pendingBackup = null;
function showBackupModal(data) {
  validateBackup(data);
  pendingBackup = data;
  const pn = data.presets.list.length;
  const fn = (Array.isArray(data.saved) ? data.saved.length : 0) + (Array.isArray(data.savedItems) ? data.savedItems.length : 0);
  document.getElementById('backupModalInfo').innerHTML =
    `백업 날짜: <b class="m">${escapeHtml(String(data.date || '미상'))}</b> · 빌드 <b class="m">${pn}</b>개 · 즐겨찾기 <b class="m">${fn}</b>개<br><br>` +
    `<b style="color:#ff6e5e">전부 교체</b> — 현재 빌드·즐겨찾기를 백업 내용으로 대체합니다 (되돌릴 수 없음)<br>` +
    `<b style="color:#c9a6ff">빌드 추가</b> — 백업의 빌드를 현재 목록 뒤에 추가하고, 즐겨찾기는 합칩니다`;
  document.getElementById('backupModal').style.display = 'flex'; modalHistPush();
}
function closeBackupModal() {
  document.getElementById('backupModal').style.display = 'none';
  pendingBackup = null;
}
function applyBackupChoice(mode) {
  const data = pendingBackup;
  closeBackupModal();
  if (!data) return;
  try { applyBackup(data, mode); } catch (e) { alert('백업 불러오기 실패: ' + e.message); }
}

// 내보낼 페이로드(v2): 데이터에 있는 항목은 해시, 없는 항목만 텍스트로

// 코드의 정령 항목 → 빌드의 pacts. 이름은 데이터에 있는 것만, 자리 번호는 1~45로 자른다
async function exportPresetCode() {
  if (sbConflicts(preset.slateBd).length) { alert('보드에 겹치거나 밖으로 나간 석판이 있습니다.\n재배치를 마친 뒤 코드를 만들 수 있어요.'); return; }
  const filled = PRESET_SLOTS.filter(s => preset.slots[s.id]).length + preset.talents.length + skillFilledCount(preset) + (preset.prism ? 1 : 0) + (preset.inverse ? 1 : 0) + (preset.revival ? 1 : 0) + ((preset.slateBd || []).length ? 1 : 0);
  if (!filled) { alert('저장된 빌드 내용이 없습니다.'); return; }
  const code = await presetToCode(preset);
  try {
    await navigator.clipboard.writeText(code);
    alert(`[${preset.name}] 빌드 코드가 클립보드에 복사되었습니다. (${code.length.toLocaleString()}자)\n다른 사람에게 붙여넣어 전달하세요.`);
  } catch (e) {
    prompt('아래 빌드 코드를 직접 복사하세요 (Ctrl+C)', code); // 클립보드 권한이 없을 때 폴백
  }
}

async function exportPresetLink() { // 빌드를 URL로 공유·보관 (?pcode=) — 열면 가져오기 확인 창
  if (guardBuildMode()) return;
  if (sbConflicts(preset.slateBd).length) { alert('보드에 겹치거나 밖으로 나간 석판이 있습니다.\n재배치를 마친 뒤 공유할 수 있어요.'); return; }
  const filled = PRESET_SLOTS.filter(s => preset.slots[s.id]).length + preset.talents.length + skillFilledCount(preset) + (preset.prism ? 1 : 0) + (preset.inverse ? 1 : 0) + (preset.revival ? 1 : 0) + ((preset.slateBd || []).length ? 1 : 0);
  if (!filled) { alert('저장된 빌드 내용이 없습니다.'); return; }
  const code = await presetToCode(preset);
  let link = null, expire = '';
  if (typeof SHARE_ONLINE !== 'undefined' && SHARE_ONLINE) { // 짧은 링크 (서버 보관 7일·다회 조회)
    try {
      const res = await fetch('/api/plink', {method: 'POST', headers: {'content-type': 'text/plain'}, body: code});
      if (res.ok) {
        const j = await res.json();
        // 서버가 주는 url은 경로가 /craft_search로 고정이라, 지금 열려 있는 페이지 경로로 만든다
        link = j.id ? location.origin + location.pathname + '?plink=' + j.id : j.url;
        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        expire = (d.getMonth() + 1) + '월 ' + d.getDate() + '일까지 유효';
      }
    } catch (e) {}
  }
  if (!link) { // 서버를 못 쓰면 코드 임베드 긴 링크로 폴백 (만료 없음)
    link = location.origin + location.pathname + '?pcode=' + code;
    if (link.length > 7500) { alert('빌드가 너무 커서 링크로 만들 수 없습니다.'); return; }
    expire = '만료 없음';
  }
  // 복사 형식: 빌드명·유효기간 줄 + URL 줄 — 붙여넣기만 해도 뭔지 보이게
  const shareText = `mToB 빌드 [${preset.name}] (${expire})\n${link}`;
  try {
    await navigator.clipboard.writeText(shareText);
    alert(`[${preset.name}] 빌드 링크가 클립보드에 복사되었습니다.\n받는 사람은 링크를 열면 빌드 보기 화면에서 [내 빌드로 가져오기]로 가져갈 수 있습니다. (${expire})`);
  } catch (e) {
    prompt('아래 내용을 직접 복사하세요 (Ctrl+C)', shareText); // 클립보드 권한 없을 때 폴백
  }
}

async function addPresetFromCode(code, nameHint) { // 코드 → 새 빌드로 추가 (링크·온라인 공유 공용)
  const {preset: p, missing} = await codeToPreset(code);
  if (nameHint) p.name = String(nameHint).slice(0, 30);
  presets.list.push(p);
  presets.activeId = p.id;
  preset = p;
  persistPreset();
  renderPreset();
  return {p, missing};
}
async function importPresetCode() {
  if (guardBuildMode()) return;
  const code = prompt('빌드 코드를 붙여넣으세요 (TLP로 시작)');
  if (code === null || !code.trim()) return;
  try {
    const {p, missing} = await addPresetFromCode(code);
    alert(`[${p.name}] 빌드를 새 빌드로 가져왔습니다.` + (missing ? `\n(현재 데이터에 없는 항목 ${missing}개는 이름만 표시됩니다)` : ''));
  } catch (e) {
    alert('가져오기 실패: ' + e.message);
  }
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
        // 빈 「크리에이티브 지니어스」는 끝 두 자리가 (묶음·순번) — 노드 게임 ID 끝 두 자리와 그대로 맞춘다
        const dual = heroIsDual(td);
        const n = (td.nodes || []).find(x => td.tree ? x.code === two : dual ? Number(x.nid) % 100 === two : x.step === st && x.ord === ord);
        if (n && td.tree) { if (n.step) heroNodesOut[n.code] = n.name; }
        else if (n && dual) { if (n.step) heroNodesOut[heroSlotOf(n)] = n.name; }
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

// 외부 앱 원시 로그 릴레이(?logdump=토큰): 서버에서 받아 브라우저 안에서만 파싱
// (5회 수령·30분 만료 후 삭제 — 내용 열람·집계 없음. 앱은 GetPlayerData 세그먼트를 deflate로 POST만 하면 끝)
async function extLogDump(tok) { // 빌더·빌더 2 공용 (2026-10-13 06_share 에서 옮김)
  try {
    if (!tok || !/^\w{8,40}$/.test(tok)) return;
    const res = await fetch('/api/logrelay?tok=' + tok);
    if (!res.ok) { alert('외부 앱이 보낸 로그를 찾지 못했습니다.\n(링크는 5회까지 열 수 있고 30분 뒤 만료됩니다 — 앱에서 다시 보내주세요)'); return; }
    const src = (res.headers.get('x-relay-src') || '').slice(0, 16);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let text = null;
    if (typeof DecompressionStream === 'function') {
      try {
        const rd = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const parts = [];
        let total = 0;
        for (;;) {
          const c = await rd.read();
          if (c.done) break;
          total += c.value.length;
          if (total > 64 * 1024 * 1024) throw new Error('too big'); // 압축 폭탄 방어
          parts.push(c.value);
        }
        const buf = new Uint8Array(total);
        let off = 0;
        parts.forEach(x => { buf.set(x, off); off += x.length; });
        text = new TextDecoder().decode(buf);
      } catch (e) { text = null; }
    }
    if (text === null) text = new TextDecoder().decode(bytes); // 무압축 폴백
    const lp = createLogParser();
    lp.feed(text);
    const r = lp.finish();
    if (!(r.chars || []).length) { alert('외부 앱이 보낸 로그에서 착용 정보를 찾지 못했습니다.'); return; }
    r.chars.forEach(c => { c.extSrc = src || 'relay'; });
    r.extSrc = src || 'relay';
    uiConfirm('외부 앱에서 보낸 게임 로그가 있습니다.\n새 빌드로 가져올까요?', () => {
      if (typeof switchTab === 'function') switchTab('preset');
      pendingLogSrc = 'ext';
      if (r.chars.length > 1) showLogCharModal(r.chars);
      else buildPresetFromLog(r, 'ext');
    });
  } catch (e) {}
}
// 외부 앱 로그 연동(?logimport=MLI1.xxx): 추출된 게임 ID 페이로드 → 새 빌드
// 스펙: 미니토치DB_로그연동_스펙_v1.md — 로그 파일이 아니라 ID 요약만 받는다
async function extLogImport(code) { // 빌더·빌더 2 공용 (2026-10-13 06_share 에서 옮김)
  try {
    if (!code) return;
    if (!code.startsWith('MLI1.') || code.length > 12000) { alert('지원하지 않는 연동 코드 형식입니다.'); return; }
    let pl;
    try {
      let b64 = code.slice(5).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      // 압축 폭탄 방어: 해제 결과가 64KB를 넘으면 즉시 중단 (정상 빌드는 3KB 미만)
      const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const parts = [];
      let total = 0;
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 65536) { reader.cancel(); throw new Error('too large'); }
        parts.push(value);
      }
      const buf = new Uint8Array(total);
      let off = 0;
      parts.forEach(p => { buf.set(p, off); off += p.length; });
      pl = JSON.parse(new TextDecoder().decode(buf));
    } catch (e) { sendLiStat({lf: 1}); alert('연동 코드를 해석하지 못했습니다.'); return; }
    if (!pl || pl.v !== 1) { alert('지원하지 않는 연동 코드 버전입니다.'); return; }
    // 페이로드 → 로그 파서 스냅샷과 같은 형태로 정규화 (buildPresetFromLog 재사용)
    // 빌드에 들어가는 외부 텍스트는 캐릭터명뿐 — 태그·제어문자 제거로 무해화
    const safeName = typeof pl.char === 'string'
      ? pl.char.replace(/[<>&"'\u0000-\u001f]/g, '').slice(0, 40).trim() : null;
    const numKey = k => { const n = parseInt(k, 10); return Number.isFinite(n) && n >= 0 && n < 100000 ? n : null; };
    const r = {
      charName: safeName || null,
      heroId: pl.hero != null ? String(pl.hero).slice(0, 10) : null,
      heroPur: pl.heroPur != null ? String(pl.heroPur).slice(0, 10) : null,
      skills: {}, gear: {}, mems: {},
      slateTal: Array.isArray(pl.slate) ? pl.slate.slice(0, 300).map(x => String(x).slice(0, 12)) : [],
      // v1 확장 필드(선택): sb = 석판 인스턴스별 [uniq(또는 base), Index, Direction, [노드ID...]]
      slates: Array.isArray(pl.sb) ? pl.sb.slice(0, 12).filter(e => Array.isArray(e) && e[0]).map(e => ({
        uniq: parseInt(e[0], 10) || 0, base: parseInt(e[0], 10) || 0, idx: parseInt(e[1], 10) || 0,
        dir: parseInt(e[2], 10) || 0, inf: parseInt(e[4], 10) || 0,
        nodes: (Array.isArray(e[3]) ? e[3] : []).slice(0, 8).map(x => String(x).slice(0, 12))
      })) : null,
      // v1 확장 필드(선택): genius.core = 배치한 핵심 재능 geniusId, dst = 소켓한 천명·숙명 게임 id,
      // prism = {gid: 꽂힌 노드 geniusId, base: 프리즘 게임 id, slots: 옵션 어픽스 ID [1칸,2칸,3칸]}
      genius: {core: Array.isArray(pl.genius && pl.genius.core) ? pl.genius.core.slice(0, 10).map(x => String(x).slice(0, 12)) : [], picked: []},
      dst: Array.isArray(pl.dst) ? pl.dst.slice(0, 60).map(x => String(x).slice(0, 12)) : [],
      prism: pl.prism && pl.prism.base ? {
        board: String(pl.prism.gid || '').slice(0, 2),
        base: String(pl.prism.base).slice(0, 12),
        slots: (Array.isArray(pl.prism.slots) ? pl.prism.slots : []).slice(0, 3).map(x => x ? String(x).slice(0, 12) : null),
      } : null,
    };
    if (pl.skills && typeof pl.skills === 'object') {
      Object.keys(pl.skills).slice(0, 100).forEach(k => {
        const slot = numKey(k), v = parseInt(pl.skills[k], 10);
        if (slot !== null && Number.isFinite(v) && v > 0) r.skills[slot] = v;
      });
    }
    (Array.isArray(pl.gear) ? pl.gear.slice(0, 12) : []).forEach(g => {
      if (!g) return;
      const slot = numKey(g.slot);
      if (slot === null || slot < 1 || slot > 10) return;
      const has = a => Array.isArray(a) && a.length;
      const ids = a => (a || []).slice(0, 8).map(x => String(x).slice(0, 12));
      const aff = (has(g.baseAffix) || has(g.prefix) || has(g.suffix) || has(g.chip) || has(g.enchant))
        ? {basic: ids(g.baseAffix), main: ids(g.prefix), sub: ids(g.suffix), chip: ids(g.chip), ench: ids(g.enchant)} : null;
      r.gear[slot] = {baseId: parseInt(g.base, 10) || 0, uniqId: parseInt(g.uniq, 10) || 0, affix: aff};
    });
    (Array.isArray(pl.mems) ? pl.mems.slice(0, 8) : []).forEach(m => { // 상한 여유 — 게임이 추억 칸을 늘려도 수신은 무수정
      if (!m || !m.base) return;
      r.mems[parseInt(m.base, 10)] = {basic: (m.baseAffix || []).slice(0, 4).map(String), main: [],
                                       sub: (m.suffix || []).slice(0, 4).map(String),
                                       awk: (m.awaken || []).slice(0, 2).map(String)}; // 부활 옵션 (선택)
    });
    uiConfirm('외부 앱에서 보낸 빌드 정보가 있습니다.\n새 빌드로 가져올까요?', () => {
      if (typeof switchTab === 'function') switchTab('preset');
      buildPresetFromLog(r, 'ext');
    });
  } catch (e) {}
}
// ── 드래그로 순서 변경 (빌드 버튼 / 재능·석판 목록) ──
let dragPid = null, dragTal = null;
function clearDropMarks() {
  document.querySelectorAll('.drop-before, .drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
}
// 드롭 시 들어갈 위치를 표시: 드래그 방향에 따라 대상의 앞/뒤에 강조선
function markDrop(el, after) {
  clearDropMarks();
  el.classList.add(after ? 'drop-after' : 'drop-before');
}
const presetBarEl = document.getElementById('presetBar');
presetBarEl.addEventListener('dragstart', e => {
  if (shareView) return; // 공유 빌드 보기 중에는 순서 변경 불가
  const b = e.target.closest('.pset-btn');
  if (!b) return;
  dragPid = parseInt(b.dataset.pid);
  b.classList.add('dragging');
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
});
presetBarEl.addEventListener('dragover', e => {
  const b = e.target.closest('.pset-btn');
  if (dragPid === null || !b) return;
  e.preventDefault();
  const toId = parseInt(b.dataset.pid);
  if (toId === dragPid) { clearDropMarks(); return; }
  const fromIdx = presets.list.findIndex(p => p.id === dragPid);
  const toIdx = presets.list.findIndex(p => p.id === toId);
  markDrop(b, fromIdx <= toIdx);
});
presetBarEl.addEventListener('drop', e => {
  const b = e.target.closest('.pset-btn');
  if (dragPid === null || !b) return;
  e.preventDefault();
  const toId = parseInt(b.dataset.pid);
  if (toId !== dragPid) {
    const fromIdx = presets.list.findIndex(p => p.id === dragPid);
    const [moved] = presets.list.splice(fromIdx, 1);
    const toIdx = presets.list.findIndex(p => p.id === toId);
    presets.list.splice(toIdx + (fromIdx <= toIdx ? 1 : 0), 0, moved); // 대상 위치로 이동
    persistPreset();
    renderPreset();
  }
  dragPid = null;
  clearDropMarks();
});
presetBarEl.addEventListener('dragend', () => { dragPid = null; clearDropMarks(); renderPresetBar(); });

// 재능·석판·운명 3패널 공용 DnD (인덱스는 preset.talents 원본 배열 기준)
document.querySelectorAll('.tal-tbody').forEach(talTbodyEl => {
  talTbodyEl.addEventListener('dragstart', e => {
    if (shareView && !shareEdit) return; // 공유 빌드 보기 중에는 순서 변경 불가 (본인 글 수정 모드는 허용)
    const tr = e.target.closest('tr[data-tal]');
    if (!tr) return;
    dragTal = parseInt(tr.dataset.tal);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  talTbodyEl.addEventListener('dragover', e => {
    const tr = e.target.closest('tr[data-tal]');
    if (dragTal === null || !tr) return;
    e.preventDefault();
    const to = parseInt(tr.dataset.tal);
    if (to === dragTal) { clearDropMarks(); return; }
    markDrop(tr, dragTal < to);
  });
  talTbodyEl.addEventListener('drop', e => {
    const tr = e.target.closest('tr[data-tal]');
    if (dragTal === null || !tr) return;
    e.preventDefault();
    const to = parseInt(tr.dataset.tal);
    if (to !== dragTal) {
      const [t] = preset.talents.splice(dragTal, 1);
      preset.talents.splice(to, 0, t);
      persistPreset();
      renderPreset();
    }
    dragTal = null;
    clearDropMarks();
  });
  talTbodyEl.addEventListener('dragend', () => { dragTal = null; clearDropMarks(); });
});

let dragSk = null;
const skTbodyEl = document.getElementById('presetSkTbody');
skTbodyEl.addEventListener('dragstart', e => {
  if (shareView && !shareEdit) return; // 공유 빌드 보기 중에는 순서 변경 불가 (본인 글 수정 모드는 허용)
  const tr = e.target.closest('tr[data-skslot]');
  if (!tr) return;
  dragSk = tr.dataset.skslot;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
});
skTbodyEl.addEventListener('dragover', e => {
  const tr = e.target.closest('tr[data-skslot]');
  if (!dragSk || !tr) return;
  const to = tr.dataset.skslot;
  if (to === dragSk) { clearDropMarks(); return; }
  const gFrom = SKILL_SLOTS.find(s => s.id === dragSk).group;
  const gTo = SKILL_SLOTS.find(s => s.id === to).group;
  if (gFrom !== gTo) { clearDropMarks(); return; } // 액티브↔패시브 간 이동 불가
  e.preventDefault();
  const ids = skillGroupIds(gFrom);
  markDrop(tr, ids.indexOf(dragSk) < ids.indexOf(to));
});
skTbodyEl.addEventListener('drop', e => {
  const tr = e.target.closest('tr[data-skslot]');
  if (!dragSk || !tr) return;
  e.preventDefault();
  const to = tr.dataset.skslot;
  if (to !== dragSk) moveSkillContent(dragSk, to);
  dragSk = null;
  clearDropMarks();
});
skTbodyEl.addEventListener('dragend', () => { dragSk = null; clearDropMarks(); });

// 모바일(터치)용 순서 이동 버튼
function movePresetBy(delta) {
  const i = presets.list.findIndex(p => p.id === presets.activeId);
  const j = i + delta;
  if (j < 0 || j >= presets.list.length) return;
  const [moved] = presets.list.splice(i, 1);
  presets.list.splice(j, 0, moved);
  persistPreset();
  renderPreset();
}
function moveTalent(i, delta) {
  if (guardShareView()) return;
  // 화면이 3묶음으로 구분 표시되므로, 같은 묶음 안의 이웃과 자리를 바꾼다
  const g = talGroup(preset.talents[i].type);
  const idxs = preset.talents.map((t, x) => ({t, x})).filter(o => talGroup(o.t.type) === g).map(o => o.x);
  const p = idxs.indexOf(i);
  const j = idxs[p + delta];
  if (j === undefined) return;
  const [t] = preset.talents.splice(i, 1);
  preset.talents.splice(j, 0, t);
  persistPreset();
  renderPreset();
}

// ── 빌드 편집 모드 (직접 제작 / 재능 추가) ──
let build = null;         // {slot, name, opts:{basic,main,sub}} 또는 {talent:true}
let cbBackup = null;      // 편집 시작 전 필터 상태 백업
let pendingAddRow = null; // 기본/메인/서브 선택 팝업 대기 중인 행
function gradeCount(g) {
  return ['basic', 'main', 'sub'].reduce((n, c) => n + build.opts[c].filter(o => optGrade(o.type) === g).length, 0);
}
const TOP_CB_IDS = ['cb-grade-기본', 'cb-grade-레전드', 'cb-석판', 'cb-운명', 'cb-재능'];

function snapshotFilters() {
  return {
    subs: [...document.querySelectorAll('.sub-cb')].map(el => el.checked),
    tops: TOP_CB_IDS.map(id => document.getElementById(id).checked),
    skills: [...document.querySelectorAll('.skill-cb')].map(el => el.checked),
    search: document.getElementById('search').value,
  };
}
function restoreFilters(s) {
  [...document.querySelectorAll('.sub-cb')].forEach((el, i) => { el.checked = s.subs[i]; });
  TOP_CB_IDS.forEach((id, i) => { const el = document.getElementById(id); el.checked = s.tops[i]; el.indeterminate = false; });
  [...document.querySelectorAll('.skill-cb')].forEach((el, i) => { el.checked = s.skills[i]; });
  document.getElementById('search').value = s.search;
  subCbChanged('석판'); subCbChanged('운명'); subCbChanged('재능');
}


// ── 블러드 장비: 세트 부위 레전더리의 옵션 2개를 추출해 제작 ──
// 세트·단계·추가 옵션 상한은 00_gear.js (빌더 2 와 공용)
const BLOOD_SET_PARTS = bloodSetPartsOf(PARTS);
// 블러드 세트 부위 판정 (출처 빈 특수 장비=갑옷 취급 → 갑옷·장갑 세트에 포함)
function bloodSetAllows(slotId, r) {
  const parts = BLOOD_SET_PARTS[slotId];
  if (!parts) return false;
  return r.source ? parts.includes(r.source) : PARTS.CHESTS.some(p => parts.includes(p));
}

// 블러드 장비는 빌드당 하나만 사용 가능
function bloodSlotId() {
  const s = PRESET_SLOTS.find(s => preset.slots[s.id] && preset.slots[s.id].kind === 'blood');
  return s ? s.id : null;
}

// 블러드 부위명 (슬롯 → BLOODP slot 명칭)
function bloodPartName(slotId) {
  return SLOT_BY_ID.get(slotId).label.replace(/ \d$/, ''); // '반지 1' → '반지'
}
// 해당 부위의 블러드 풀 (일반/이상)
function bloodPool(part, aberrant) {
  return BLOODP.find(b => b.part === part && !!b.aberrant === !!aberrant) || null;
}

function startBlood(slotId) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  if (!BLOOD_SET_PARTS[slotId]) return;
  const existing = bloodSlotId();
  if (existing && existing !== slotId) { alert('블러드 제작 장비는 하나만 사용할 수 있습니다. 기존 블러드 장비를 먼저 비워주세요.'); return; }
  const cur = preset.slots[slotId];
  const part = bloodPartName(slotId);
  // 이상 부위가 존재하는 부위(신발·반지·벨트)는 베이스 선택부터 — 옵션 풀 자체가 다름
  if (bloodPool(part, true) && !(cur && cur.kind === 'blood')) {
    uiChoice(`${part} 블러드 제작 — 베이스를 선택하세요`, [
      {label: '일반 부위', fn: () => beginBlood(slotId, false)},
      {label: '이상 부위 (소환 옵션 풀)', fn: () => beginBlood(slotId, true)},
    ]);
    return;
  }
  beginBlood(slotId, cur && cur.kind === 'blood' ? !!cur.aberrant : false);
}

function beginBlood(slotId, aberrant) {
  const cur = preset.slots[slotId];
  build = {
    slot: slotId,
    blood: true,
    aberrant: aberrant,
    stage: 0, // 0=기본옵 → 1=레전드 추출 → 2=추가 옵션
    name: (cur && cur.kind === 'blood' && cur.name) || '',
    picks: cur && cur.kind === 'blood' ? JSON.parse(JSON.stringify(cur.opts.blood)) : [],
    bases: cur && cur.kind === 'blood' ? JSON.parse(JSON.stringify(cur.opts.base || [])) : [],
    extras: cur && cur.kind === 'blood' ? JSON.parse(JSON.stringify(cur.opts.extra || [])) : [],
  };
  document.getElementById('bloodPoolFilter').value = '';
  renderBloodWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}

function bloodLegendPool() {
  return ALL_DATA.filter(r => r.category === '장비' && !isBasicType(r.type) && bloodSetAllows(build.slot, r));
}
function wizCancel() { // 배경(딤드) 클릭·ESC: 폐기가 아니라 저장하고 닫기 — 실수 클릭으로 작업이 날아가지 않게 (버리려면 [취소] 버튼)
  if (build && build.blood) closeBloodWiz(build.picks.length + build.bases.length + build.extras.length > 0);
  else if (build && build.wiz) closeCraftWiz(build.opts.basic.length + build.opts.main.length + build.opts.sub.length > 0);
  else if (build && build.prism) closePrismWiz(!!build.item);
  else if (build && build.mem) endBuild(build.opts.basic.length + build.opts.unique.length + build.opts.random.length > 0);
  // 레전드·재능·스킬 선택은 즉시 저장 방식이라 닫기만 하면 됨
  else if (build && (build.itemPick || build.talent || build.skillPick)) endBuild(false);
  else document.getElementById('bloodPoolModal').style.display = 'none';
}
function wizRender() { // 마법사 공용 렌더 (검색 입력 라우팅 — 모달을 공유하므로 모드별 분기)
  if (build && build.blood) renderBloodWiz();
  else if (build && build.wiz) renderCraftWiz();
  else if (build && build.prism) renderPrismWiz();
  else if (build && build.itemPick) renderItemPickWiz();
  else if (build && build.talent) renderTalentWiz();
  else if (build && build.skillPick) renderSkillWiz();
  else if (build && build.mem) renderMemWiz();
}
function closeBloodWiz(save) {
  document.getElementById('bloodPoolModal').style.display = 'none';
  hideTip2();
  endBuild(save); // 저장/취소 공통 처리 (빌드 복귀 포함)
}
function bloodWizMove(delta) {
  const next = build.stage + delta;
  if (next < 0) return;
  if (next >= BLOOD_STAGES.length) { closeBloodWiz(true); return; } // 마지막 단계에서 [완료]
  build.stage = next;
  document.getElementById('bloodPoolFilter').value = '';
  renderBloodWiz();
}
function renderBloodWiz() {
  if (!build || !build.blood) return;
  document.getElementById('bloodPoolFilter').placeholder = '옵션 검색... (행 클릭=선택, 재클릭=해제, 안 골라도 [다음]으로 진행)';
  const part = bloodPartName(build.slot);
  const pool = bloodPool(part, build.aberrant);
  const st = BLOOD_STAGES[build.stage];
  const title = document.getElementById('bloodPoolTitle');
  const box = document.getElementById('bloodPoolList');
  const gCnt = g => build.extras.filter(o => optGrade(o.type) === g).length;
  const nav = BLOOD_STAGES.map((x, i) => {
    const cnt = build[x.key].length;
    const mx = x.key === 'extras' ? bloodExtraCap(build.picks.length) : x.max;
    return i === build.stage ? `<b style="color:#ffd166">${x.label} ${cnt}/${mx}</b>` : `${x.label} ${cnt}/${mx}`;
  }).join(' → ');
  title.innerHTML = `🩸 ${part} 블러드 제작${build.aberrant ? ' <span style="color:#c9a6ff">(이상 부위)</span>' : ''} — ${nav}` +
    (build.stage === 2 ? `<div class="wiz-sub"><span class="g-abs">절대 ${gCnt('절대')}/2</span> · <span class="g-adv">진급 ${gCnt('진급')}/2</span></div>` : '');
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  let h = '';
  if (build.stage === 0) {
    if (!pool) h = '<div class="no-result">블러드 풀 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.</div>';
    else pool.basic.forEach((eff, i) => {
      if (!match([eff])) return;
      const on = build.bases.some(o => o.effect === eff);
      h += `<div class="blend-row${on ? ' on' : ''}" data-bpb="${i}">${highlight(eff, kws)}</div>`;
    });
  } else if (build.stage === 1) {
    const lp = bloodLegendPool();
    // 아이템별로 묶어서 표시: 아이템명 헤더 + 개별 옵션 한 줄씩
    // 첫 옵션을 고르면 같은 레전드 장비의 옵션만 선택 가능 — 다른 장비는 비활성(흐림) 표시
    const lockItem = build.picks.length ? build.picks[0].type : null;
    if (lockItem) h += `<div class="total-hint" style="margin:0 0 6px">선택한 레전드: <b style="color:#ffd700">${escapeHtml(lockItem)}</b> — 같은 장비의 옵션만 선택할 수 있습니다 (해제하려면 선택한 옵션 재클릭)</div>`;
    const groups = new Map(); // 아이템명 → {src, rows:[{r, i}]}
    lp.forEach((r, i) => {
      if (!groups.has(r.type)) groups.set(r.type, {src: r.source, rows: []});
      groups.get(r.type).rows.push({r, i});
    });
    groups.forEach((g, item) => {
      const vis = g.rows.filter(x => match([x.r.effect, x.r.source, item]));
      if (!vis.length) return;
      const disG = lockItem && item !== lockItem;
      const opts = vis.map(x => {
        const on = build.picks.some(o => o.k === rowKey(x.r));
        const dis = !on && disG;
        return `<div class="blend-row bl-opt${on ? ' on' : ''}${dis ? ' dis' : ''}"${dis ? '' : ` data-bpl="${x.i}"`}>${highlight(x.r.effect, kws)}</div>`;
      }).join('');
      h += `<div class="blend-grp"><div class="blend-gname${disG ? ' dis' : ''}"><span class="gname-t">${highlight(item, kws)}</span><span class="b-sub">${escapeHtml(g.src)}</span></div><div class="blend-gopts">${opts}</div></div>`;
    });
  } else {
    if (!pool) h = '<div class="no-result">블러드 풀 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.</div>';
    else {
      const GR_ROW = {'절대': 'gr-abs', '진급': 'gr-adv', '초급': 'gr-beg'};
      pool.opts.forEach((o, i) => {
        if (!match([o.effect, o.type])) return;
        const on = build.extras.some(x => x.effect === o.effect);
        const g = optGrade(o.type);
        const dis = !on && GRADE_LIMITS[g] && gCnt(g) >= GRADE_LIMITS[g];
        h += `<div class="blend-row ${GR_ROW[g] || ''}${on ? ' on' : ''}${dis ? ' dis' : ''}"${dis ? '' : ` data-bpx="${i}"`}>${highlight(o.effect, kws)}<span class="b-sub ${GRADE_CLASS[g] || ''}">${escapeHtml(o.type)}</span></div>`;
      });
    }
  }
  box.innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  // 하단 버튼
  document.getElementById('bloodWizBtns').innerHTML =
    (build.stage > 0 ? `<button class="bb-btn ghost" onclick="bloodWizMove(-1)">← 이전</button>` : '') +
    `<button class="bb-btn" onclick="bloodWizMove(1)">${build.stage < BLOOD_STAGES.length - 1 ? '다음 →' : '완료'}</button>` +
    `<button class="bb-btn danger" onclick="closeBloodWiz(false)">취소</button>`;
}
function toggleBloodBase(i) {
  const pool = bloodPool(bloodPartName(build.slot), build.aberrant);
  const eff = pool.basic[i];
  const x = build.bases.findIndex(o => o.effect === eff);
  if (x >= 0) build.bases.splice(x, 1);
  else {
    if (build.bases.length >= 2) { alert('기본 옵션은 최대 2개까지 담을 수 있습니다.'); return; }
    build.bases.push({effect: eff, source: bloodPartName(build.slot), type: '기본 옵션'});
    if (build.bases.length >= 2) { bloodWizMove(1); return; } // 가득 차면 자동 다음 단계
  }
  renderBloodWiz();
}
function toggleBloodLegend(i) {
  const r = bloodLegendPool()[i];
  const k = rowKey(r);
  const x = build.picks.findIndex(o => o.k === k);
  if (x >= 0) build.picks.splice(x, 1);
  else {
    if (build.picks.length >= 2) { alert('블러드 장비는 레전드 옵션을 2개까지만 담을 수 있습니다.'); return; }
    if (build.picks.length && build.picks[0].type !== r.type) { alert('레전드 추출은 한 장비에서만 가능합니다.'); return; }
    // 추가 옵션을 5개 담은 상태(레전드 1개 특례)에서 2번째 레전드를 담으면 상한 4를 넘게 됨
    if (build.picks.length === 1 && build.extras.length > bloodExtraCap(2)) {
      alert('추가 옵션이 5개인 상태에서는 레전드 옵션을 2개로 늘릴 수 없습니다.\n(레전드 2개면 추가 옵션은 4개까지 — 추가 옵션을 먼저 빼주세요)'); return;
    }
    build.picks.push({k, effect: r.effect, source: r.source, type: r.type});
    if (build.picks.length >= 2) { bloodWizMove(1); return; }
  }
  renderBloodWiz();
}
function toggleBloodExtra(i) {
  const pool = bloodPool(bloodPartName(build.slot), build.aberrant);
  const o = pool.opts[i];
  const x = build.extras.findIndex(e => e.effect === o.effect);
  if (x >= 0) build.extras.splice(x, 1);
  else {
    const cap = bloodExtraCap(build.picks.length);
    if (build.extras.length >= cap) { alert(`추가 옵션은 ${cap}개까지만 담을 수 있습니다.${cap === 4 ? '\n(레전드 옵션을 1개만 담으면 5개까지 가능)' : ''}`); return; }
    const g = optGrade(o.type);
    if (GRADE_LIMITS[g] && build.extras.filter(e => optGrade(e.type) === g).length >= GRADE_LIMITS[g]) {
      alert(`${g} 옵션은 최대 ${GRADE_LIMITS[g]}개까지만 넣을 수 있습니다.`); return;
    }
    const tiers = {};
    if (o.t0) tiers.t0 = o.t0;
    if (o.t0p) tiers.t0p = o.t0p; // 침식(T0+) 수치
    if (o.t2) tiers.t2 = o.t2;
    build.extras.push({effect: o.effect, source: bloodPartName(build.slot), type: o.type, tiers});
  }
  renderBloodWiz();
}


// ── 빈 슬롯 클릭 → 레전드 장비 선택 팝업 (해당 부위의 레전드 아이템을 그룹으로 표시) ──
function startItemPick(slotId) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  if (slotId === 'weapon2' && isTwoHandEquipped()) { alert('양손 무기가 장착되어 있어 무기(방패) 슬롯을 쓸 수 없습니다.'); return; }
  build = {itemPick: {slot: slotId}};
  document.getElementById('bloodPoolFilter').value = '';
  renderItemPickWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function itemPickPool() {
  const pk = build.itemPick, slot = SLOT_BY_ID.get(pk.slot);
  // 출처(부위)가 비어 있는 특수 장비(올마이티 오리진)는 갑옷 슬롯에서만 표시
  return ALL_DATA.filter(r => r.category === '장비' && !isBasicType(r.type) && r.item !== undefined &&
    (r.source ? slot.parts.includes(r.source) : pk.slot === 'chest'));
}
function renderItemPickWiz() {
  if (!build || !build.itemPick) return;
  document.getElementById('bloodPoolFilter').placeholder = '아이템명·옵션 검색... (옵션 행 클릭=장착)';
  const slot = SLOT_BY_ID.get(build.itemPick.slot);
  document.getElementById('bloodPoolTitle').innerHTML =
    `🔶 ${slot.label} — 레전드 장비 선택<div class="wiz-sub">아이템명·옵션 행을 클릭하면 장착됩니다 · 아이템명에 호버하면 카드가 표시됩니다</div>`;
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  const cur = preset.slots[build.itemPick.slot];
  const curName = cur && cur.kind === 'item' ? cur.name : null;
  const groups = new Map(); // 아이템명 → {src, item, rows}
  itemPickPool().forEach((r, i) => {
    if (!groups.has(r.type)) groups.set(r.type, {src: r.source || '특수 갑옷', item: r.item, rows: []});
    groups.get(r.type).rows.push({r, i});
  });
  let h = '';
  groups.forEach((g, item) => {
    const vis = g.rows.filter(x => match([x.r.effect, x.r.source, item]));
    if (!vis.length) return;
    const on = curName === item;
    const opts = vis.map(x =>
      `<div class="blend-row bl-opt${on ? ' on' : ''}" data-ipk="${x.i}">${renderEffect(x.r, kws)}</div>`).join('');
    h += `<div class="blend-grp"><div class="blend-gname" data-ipkg="${g.rows[0].i}" title="클릭하면 이 레전드를 장착합니다"><span class="gname-t"><span class="ilink" data-item="${g.item}">${highlight(item, kws)}</span>${on ? '<span class="b-cur">장착 중</span>' : ''}</span><span class="b-sub">${escapeHtml(g.src)}</span></div><div class="blend-gopts">${opts}</div></div>`;
  });
  document.getElementById('bloodPoolList').innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML = `<button class="bb-btn danger" onclick="endBuild(false)">취소</button>`;
}

function pickItemRow(r) {
  const pk = build && build.itemPick;
  if (!pk || r.item === undefined) return;
  const it = ITEMS[r.item];
  const part = r.source || '특수 갑옷';
  const doEquip = () => {
    preset.slots[pk.slot] = carryAddons(preset.slots[pk.slot], {kind: 'item', name: it.name, part, snap: it});
    persistPreset();
    endBuild(false); // 필터 복원 + 빌드 탭 복귀
  };
  if (pk.slot === 'weapon1' && PARTS.TWO_HAND.includes(part)) {
    if (preset.slots['weapon2']) {
      uiConfirm('양손 무기를 장착하면 무기(방패) 슬롯이 비워집니다. 진행할까요?', () => { preset.slots['weapon2'] = null; doEquip(); });
      return;
    }
    preset.slots['weapon2'] = null;
  }
  doEquip();
}

// 프로그래밍 방식 레전드 옵션 추가 (마법사 토글과 동일 검증 — 테스트·재사용용)
function addToBlood(r) {
  const k = rowKey(r);
  if (build.picks.some(o => o.k === k)) { alert('이미 추가된 옵션입니다.'); return; }
  if (build.picks.length >= 2) { alert('블러드 장비는 레전드 옵션을 2개까지만 담을 수 있습니다. 상단 바에서 기존 옵션을 ×로 제거한 뒤 추가하세요.'); return; }
  if (build.picks.length && build.picks[0].type !== r.type) { alert('레전드 추출은 한 장비에서만 가능합니다. 같은 장비의 옵션을 선택해주세요.'); return; }
  build.picks.push({k, effect: r.effect, source: r.source, type: r.type});
  if (document.getElementById('bloodPoolModal').style.display !== 'none') renderBloodWiz();
}

function startBuild(slotId) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  if (slotId === 'weapon2' && isTwoHandEquipped()) { alert('양손 무기가 장착되어 있어 무기(방패) 슬롯을 쓸 수 없습니다. 무기 슬롯을 먼저 비워주세요.'); return; }
  const slot = SLOT_BY_ID.get(slotId);
  const cur = preset.slots[slotId];
  // 재편집은 기존 부위 유지, 부위가 하나뿐이면 바로 시작 — 그 외엔 블러드처럼 버튼으로 베이스 선택
  if (cur && cur.kind === 'custom') { beginCraft(slotId, cur.part); return; }
  if (slot.parts.length === 1) { beginCraft(slotId, slot.parts[0]); return; }
  if (slotId === 'weapon1' || slotId === 'weapon2') {
    const used = new Set();
    const rows = [];
    weaponRowsOf(PARTS).forEach(g => {
      const items = g.parts.filter(pt => slot.parts.includes(pt));
      items.forEach(pt => used.add(pt));
      if (items.length) rows.push({label: g.label, choices: items.map(pt => ({label: pt, fn: () => beginCraft(slotId, pt)}))});
    });
    const rest = slot.parts.filter(pt => !used.has(pt));
    if (rest.length) rows.push({label: '기타', choices: rest.map(pt => ({label: pt, fn: () => beginCraft(slotId, pt)}))});
    uiChoiceRows(`${slot.label} 직접 제작 — 부위(베이스)를 선택하세요`, rows);
    return;
  }
  uiChoice(`${slot.label} 직접 제작 — 부위(베이스)를 선택하세요`,
    slot.parts.map(pt => ({label: pt, fn: () => beginCraft(slotId, pt)})));
}

function beginCraft(slotId, part) {
  const cur = preset.slots[slotId];
  build = {
    slot: slotId,
    wiz: true, // 제작 마법사 모드 (목록·제작 바 상호작용 없음)
    name: (cur && cur.kind === 'custom' && cur.name) || '',
    opts: cur && cur.kind === 'custom' ? JSON.parse(JSON.stringify(cur.opts)) : {basic: [], main: [], sub: []},
    wizPart: part,
    stage: 1, // 1=기본, 2=메인, 3=서브
  };
  document.getElementById('bloodPoolFilter').value = '';
  renderCraftWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function craftPool(stageKey) {
  // 해당 부위의 옵션 풀 — 시퀀스·고유·랜덤 등 분류 불가 유형은 메인/서브 양쪽에 표시
  // 정렬: 절대 > 진급 > 초급 > 기타 (같은 등급끼리는 원본 순서 유지)
  return ALL_DATA.filter(r => r.category === '장비' && r.source === build.wizPart && isBasicType(r.type) &&
    !r.type.includes('시퀀스') && // 시퀀스 옵션은 무기 슬롯의 [시퀀스] 버튼(타워)으로 별도 장착 — 제작 풀에서 제외
    (classifyOptType(r.type) === stageKey || (stageKey !== 'basic' && classifyOptType(r.type) === null)))
    .sort((a, b) => gradeOrder(a.type) - gradeOrder(b.type));
}
function closeCraftWiz(save) {
  document.getElementById('bloodPoolModal').style.display = 'none';
  hideTip2();
  endBuild(save);
}
function craftWizMove(delta) {
  const next = build.stage + delta;
  if (next < 1) return;
  if (next > 3) { closeCraftWiz(true); return; }
  build.stage = next;
  document.getElementById('bloodPoolFilter').value = '';
  renderCraftWiz();
}
function renderCraftWiz() {
  if (!build || !build.wiz) return;
  document.getElementById('bloodPoolFilter').placeholder = '옵션 검색... (행 클릭=선택, 재클릭=해제, 안 골라도 [다음]으로 진행)';
  const slot = SLOT_BY_ID.get(build.slot);
  const title = document.getElementById('bloodPoolTitle');
  const box = document.getElementById('bloodPoolList');
  const gCnt = g => gradeCount(g);
  const nav = CRAFT_STAGES.map((x, i) => {
    const txt = `${x.label} ${build.opts[x.key].length}/${x.max}`;
    return i + 1 === build.stage ? `<b style="color:#ffd166">${txt}</b>` : txt;
  }).join(' → ');
  title.innerHTML = `🔧 ${slot.label} 직접 제작 <span style="color:#7db4ff">(${build.wizPart})</span> — ${nav}` +
    (build.stage >= 2 ? `<div class="wiz-sub"><span class="g-abs">절대 ${gCnt('절대')}/2</span> · <span class="g-adv">진급 ${gCnt('진급')}/2</span></div>` : '');
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  let h = '';
  {
    const st = CRAFT_STAGES[build.stage - 1];
    const GR_ROW = {'절대': 'gr-abs', '진급': 'gr-adv', '초급': 'gr-beg'};
    craftPool(st.key).forEach((r, i) => {
      if (!match([r.effect, r.type])) return;
      const on = ['basic', 'main', 'sub'].some(c => build.opts[c].some(o => o.k === rowKey(r)));
      const g = optGrade(r.type);
      // 절대·진급 한도(각 2) 도달 시 미선택 행은 비활성
      const dis = !on && GRADE_LIMITS[g] && gradeCount(g) >= GRADE_LIMITS[g];
      h += `<div class="blend-row ${GR_ROW[g] || ''}${on ? ' on' : ''}${dis ? ' dis' : ''}"${dis ? '' : ` data-cwo="${i}"`}>${highlight(r.effect, kws)}<span class="b-sub ${GRADE_CLASS[g] || ''}">${escapeHtml(r.type)}</span></div>`;
    });
  }
  box.innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML =
    (build.stage > 1 ? `<button class="bb-btn ghost" onclick="craftWizMove(-1)">← 이전</button>` : '') +
    `<button class="bb-btn" onclick="craftWizMove(1)">${build.stage < 3 ? '다음 →' : '완료'}</button>` +
    `<button class="bb-btn danger" onclick="closeCraftWiz(false)">취소</button>`;
}
function craftWizToggle(i) {
  const st = CRAFT_STAGES[build.stage - 1];
  const r = craftPool(st.key)[i];
  const k = rowKey(r);
  for (const c of ['basic', 'main', 'sub']) {
    const x = build.opts[c].findIndex(o => o.k === k);
    if (x >= 0) { build.opts[c].splice(x, 1); renderCraftWiz(); return; }
  }
  const before = build.opts[st.key].length;
  addToBuild(r, st.key); // 개수·등급(절대/진급 각 2)·중복 검증 재사용
  // 자동 다음 단계: 기본 옵션은 1개만 골라도 바로 메인으로 (2개 쓰는 장비는 드물어 [← 이전]으로 추가), 메인·서브는 가득 차면
  const goNext = st.key === 'basic' ? build.opts.basic.length >= 1 : build.opts[st.key].length >= st.max;
  if (build.opts[st.key].length > before && goNext && build.stage < 3) {
    build.stage++;
    document.getElementById('bloodPoolFilter').value = '';
  }
  renderCraftWiz();
}

// 추억 등급 — 히어로 특성 레벨의 기준이다 (절대자 3 · 엘리트/레어 2 · 그 이하 1)
// 부활 옵션으로 추가한 추억은 같은 부위와 구분해야 해서 "부위#x"로 저장한다
function memGradeChip(key) {
  const g = HERO_GRADES.find(x => x[0] === memGrade(key)) || HERO_GRADES[HERO_GRADES.length - 1];
  return `<span class="tier-chip tier-${g[3]} mem-grade" onclick="cycleMemGrade(event, ${JSON.stringify(key).replace(/"/g, '&quot;')})"` +
    ` title="추억 등급: ${escapeHtml(g[1])} — 히어로 특성 레벨의 기준입니다 (클릭해서 변경)">${g[3]}T</span>`;
}
function cycleMemGrade(ev, key) {
  ev.stopPropagation();
  if (guardShareView()) return;
  if (!preset.memGrade) preset.memGrade = {};
  const i = HERO_GRADES.findIndex(x => x[0] === memGrade(key));
  preset.memGrade[key] = HERO_GRADES[(i + 1) % HERO_GRADES.length][0];
  persistPreset();
  renderPreset();
}


// ── 추억 제작 팝업 마법사: 기본 속성(1) → 고유(2) → 랜덤(2), 블러드와 동일한 단계 진행 ──
function startMemBuild(part, memx) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  // memx=부활 옵션의 추가 슬롯 — 저장 위치만 preset.revival.mem, 제작 과정은 동일
  const cur = memx ? (preset.revival && preset.revival.mem) : (preset.mems && preset.mems[part]);
  build = {
    mem: part, memx: !!memx, stage: 0,
    opts: cur ? JSON.parse(JSON.stringify(cur)) : {basic: [], unique: [], random: []},
  };
  document.getElementById('bloodPoolFilter').value = '';
  renderMemWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function memPool() { // 해당 추억 부위의 현재 단계 유형만 (근원은 근원만, 수호는 수호만)
  const st = MEM_STAGES[build.stage];
  return ALL_DATA.filter(r => r.category === '장비' && r.source === build.mem && r.type === st.type);
}
function memStageMove(delta) {
  const next = build.stage + delta;
  if (next < 0) return;
  if (next >= MEM_STAGES.length) { endBuild(true); return; } // 마지막 단계에서 [완료]
  build.stage = next;
  document.getElementById('bloodPoolFilter').value = '';
  renderMemWiz();
}
function renderMemWiz() {
  if (!build || !build.mem) return;
  document.getElementById('bloodPoolFilter').placeholder = '옵션 검색... (행 클릭=선택, 재클릭=해제, 안 골라도 [다음]으로 진행)';
  const st = MEM_STAGES[build.stage];
  const nav = MEM_STAGES.map((x, i) => {
    const txt = `${x.type} ${build.opts[x.cat].length}/${x.max}`;
    return i === build.stage ? `<b style="color:#ffd166">${txt}</b>` : txt;
  }).join(' → ');
  const chips = ['basic', 'unique', 'random'].flatMap(c => build.opts[c].map((o, i) =>
    `<span class="bb-chip"><span class="cat">${escapeHtml(o.type)}</span><span class="txt" title="${escapeHtml(o.effect)}">${escapeHtml(o.effect)}</span><span class="x" data-bmm="${c}:${i}" title="제거">×</span></span>`)).join('');
  document.getElementById('bloodPoolTitle').innerHTML =
    `🕯 ${build.mem} 제작${build.memx ? ' <span style="color:#fcd34d">(부활 추가 슬롯)</span>' : ''} — ${nav}` +
    `<div class="wiz-sub">행 클릭으로 추가, 안 골라도 [다음]으로 진행</div>` +
    (chips ? `<div class="bb-chips" style="margin-top:6px">${chips}</div>` : '');
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  let h = '';
  memPool().forEach((r, i) => {
    if (!match([r.effect, r.type])) return;
    const on = ['basic', 'unique', 'random'].some(c => build.opts[c].some(o => o.k === rowKey(r)));
    h += `<div class="blend-row${on ? ' on' : ''}" data-mpk="${i}">${renderEffect(r, kws)}</div>`;
  });
  document.getElementById('bloodPoolList').innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML =
    (build.stage > 0 ? `<button class="bb-btn ghost" onclick="memStageMove(-1)">← 이전</button>` : '') +
    `<button class="bb-btn" onclick="memStageMove(1)">${build.stage < MEM_STAGES.length - 1 ? '다음 →' : '완료'}</button>` +
    `<button class="bb-btn danger" onclick="endBuild(false)">취소</button>`;
}
function addToMem(r) {
  const st = MEM_STAGES[build.stage];
  const k = rowKey(r);
  for (const c of ['basic', 'unique', 'random']) {
    const i = build.opts[c].findIndex(o => o.k === k);
    if (i >= 0) { build.opts[c].splice(i, 1); wizRender(); return; } // 재클릭 해제
  }
  if (r.type !== st.type) return; // 현재 단계 유형만
  if (build.opts[st.cat].length >= st.max) { alert(`${st.type}은 최대 ${st.max}개까지 담을 수 있습니다. 기존 것을 ×로 제거한 뒤 추가하세요.`); return; }
  build.opts[st.cat].push({k, effect: r.effect, source: r.source, type: r.type});
  // 단계가 가득 차면 자동으로 다음 단계로
  if (build.opts[st.cat].length >= st.max && build.stage < MEM_STAGES.length - 1) {
    build.stage++;
    document.getElementById('bloodPoolFilter').value = '';
  }
  wizRender();
}
function clearMem(part) {
  if (guardShareView()) return;
  delete preset.mems[part];
  // 부활 옵션은 해당 추억에 적용된 것이므로 추억을 비우면 함께 제거
  if (preset.revival && preset.revival.part === part) delete preset.revival;
  persistPreset();
  renderPreset();
}

// 편집 모드용 숨은 검색 조건 (팝업 전환 후에는 사용하지 않지만 buildFilterCtx 호환을 위해 유지)
let hiddenSearch = '';

// ── 재능·석판·운명 추가 팝업: 행 클릭=추가, 초록 행 재클릭=해제, [완료]로 닫기 ──
function startTalentAdd(mode) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  build = {talent: true, talMode: mode || 'talent', godSeries: false};
  document.getElementById('bloodPoolFilter').value = '';
  renderTalentWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function talentPool() {
  const m = build.talMode;
  if (m === 'slab') return ALL_DATA.filter(r => r.category === '석판');
  if (m === 'destiny') return ALL_DATA.filter(r => r.category === '운명');
  // 핵심 재능: 계열 재능만 — 등급형 명칭(하위/중위) 제외, 신 계열(새로운 신·명왕)은 토글로 포함
  return ALL_DATA.filter(r => r.source === '재능' &&
    (build.godSeries || (r.type !== '새로운 신' && r.type !== '명왕')) &&
    !/하위|중위/.test(r.effect));
}
function renderTalentWiz() {
  if (!build || !build.talent) return;
  document.getElementById('bloodPoolFilter').placeholder = '검색... (행 클릭=추가, 초록 행 재클릭=해제 · 스페이스=AND, |=OR, !=제외)';
  const m = build.talMode;
  const label = m === 'destiny' ? '운명' : m === 'slab' ? '석판' : '핵심 재능';
  const icon = m === 'destiny' ? '🌠' : m === 'slab' ? '🪨' : '✨';
  const gi = m === 'destiny' ? 2 : m === 'slab' ? 1 : 0;
  const cnt = preset.talents.filter(t => talGroup(t.type) === gi).length;
  const god = m === 'talent'
    ? ` <label style="font-weight:normal;font-size:12px;color:#8b949e;cursor:pointer;margin-left:10px"><input type="checkbox"${build.godSeries ? ' checked' : ''} onchange="build.godSeries=this.checked;wizRender()"> 신 계열(새로운 신·명왕) 포함</label>` : '';
  document.getElementById('bloodPoolTitle').innerHTML =
    `${icon} ${label} 추가 — 현재 <b style="color:#ffd166">${cnt}${m === 'talent' ? '/5' : ''}</b>개${god}` +
    `<div class="wiz-sub">행을 클릭하면 저장, 초록 행을 재클릭하면 해제됩니다</div>`;
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  let h = '';
  talentPool().forEach((r, i) => {
    const lb = talentLabel(r);
    if (!match([r.effect, r.source, r.type, lb])) return;
    const on = preset.talents.some(t => t.k === rowKey(r));
    h += `<div class="blend-row${on ? ' on' : ''}" data-tpk="${i}">${renderEffect(r, kws)}<span class="b-sub">${escapeHtml(lb)}</span></div>`;
  });
  document.getElementById('bloodPoolList').innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML = `<button class="bb-btn" onclick="endBuild(false)">완료</button>`;
}
function toggleTalentPick(i) {
  const r = talentPool()[i];
  if (!r) return;
  const k = rowKey(r);
  const x = preset.talents.findIndex(t => t.k === k);
  if (x >= 0) { preset.talents.splice(x, 1); persistPreset(); }
  else addTalent(r);
  renderTalentWiz();
}

function endBuild(save) {
  if (save && build && build.blood) {
    if (!build.picks.length && !build.bases.length && !build.extras.length) {
      alert('추가된 옵션이 없어 저장하지 않았습니다.');
    } else {
      preset.slots[build.slot] = carryAddons(preset.slots[build.slot],
        {kind: 'blood', part: bloodPartName(build.slot), aberrant: build.aberrant || false, name: build.name || '',
         opts: {blood: build.picks, base: build.bases, extra: build.extras}});
      persistPreset();
    }
  } else if (save && build && build.prism) {
    if (!build.item) {
      alert('프리즘 종류를 선택하지 않아 저장하지 않았습니다.');
    } else {
      const it = PRISM.items.find(x => x.name === build.item);
      preset.prism = {pos: build.pos, name: build.item, opts: build.popts,
        snap: it ? JSON.parse(JSON.stringify(it)) : (preset.prism && preset.prism.name === build.item ? preset.prism.snap : undefined)};
      persistPreset();
    }
  } else if (save && build && build.mem) {
    const o = build.opts;
    if (o.basic.length + o.unique.length + o.random.length === 0) {
      alert('추가된 옵션이 없어 저장하지 않았습니다.');
    } else if (build.memx) {
      if (preset.revival) preset.revival.mem = o; // 부활 옵션의 추가 슬롯
      persistPreset();
    } else {
      preset.mems[build.mem] = o;
      persistPreset();
    }
  } else if (save && build && build.opts) {
    const o = build.opts;
    if (o.basic.length + o.main.length + o.sub.length === 0) {
      alert('추가된 옵션이 없어 저장하지 않았습니다.');
    } else {
      const part = (o.basic[0] || o.main[0] || o.sub[0]).source;
      preset.slots[build.slot] = carryAddons(preset.slots[build.slot], {kind: 'custom', part, name: build.name || '', opts: o});
      if (build.slot === 'weapon1' && PARTS.TWO_HAND.includes(part)) preset.slots['weapon2'] = null;
      persistPreset();
    }
  }
  build = null;
  pendingAddRow = null;
  hiddenSearch = ''; // 편집 모드의 숨은 검색 조건 해제
  document.getElementById('buildBar').style.display = 'none';
  document.getElementById('bloodPoolModal').style.display = 'none'; // 마법사 모달 닫기 (열려 있던 경우)
  if (cbBackup) { restoreFilters(cbBackup); cbBackup = null; }
  switchTab('preset');
}

// ver 7.9: 모든 편집 흐름이 팝업(마법사)으로 전환되어 상단 빌드 바는 사용하지 않음
// (호출부 호환을 위해 함수는 유지 — 항상 숨김)
function renderBuildBar() {
  document.getElementById('buildBar').style.display = 'none';
}
// 현재 탭의 목록만 다시 그림 (페이지 위치 유지)
function refreshList() { if (currentTab === 'fav') renderFav(); else if (TAB_CATS[currentTab]) render(); }

function addToBuild(r, cat) {
  if (!build || build.talent) return;
  const k = rowKey(r);
  if (['basic', 'main', 'sub'].some(c => build.opts[c].some(o => o.k === k))) { alert('이미 추가된 옵션입니다.'); return; }
  const list = build.opts[cat];
  if (list.length >= OPT_LIMITS[cat]) { alert(`${CAT_LABEL[cat]} 칸이 가득 찼습니다 (${OPT_LIMITS[cat]}개). 상단 바에서 기존 옵션을 ×로 제거한 뒤 추가하세요.`); return; }
  const g = optGrade(r.type);
  if (GRADE_LIMITS[g] && gradeCount(g) >= GRADE_LIMITS[g]) { alert(`${g} 옵션은 최대 ${GRADE_LIMITS[g]}개까지만 넣을 수 있습니다.`); return; }
  list.push({k, effect: r.effect, source: r.source, type: r.type});
  if (!build.wiz) { renderBuildBar(); refreshList(); }
}
function chooseAddCat(cat) {
  if (pendingAddRow) addToBuild(pendingAddRow, cat);
  pendingAddRow = null;
  hideTip();
}

function addTalent(r) {
  const k = rowKey(r);
  if (preset.talents.some(t => t.k === k)) return;
  // 핵심 재능(계열 재능)은 게임상 최대 5개
  if (talGroup(talentLabel(r)) === 0 && preset.talents.filter(t => talGroup(t.type) === 0).length >= 5) {
    alert('핵심 재능은 최대 5개까지 저장할 수 있습니다.');
    return;
  }
  if (isUndecidedDst({type: talentLabel(r), effect: r.effect}) && undecidedDstCnt() >= 3) {
    alert('미정 숙명은 최대 3개까지 장착할 수 있습니다.');
    return;
  }
  preset.talents.push({k, effect: r.effect, type: talentLabel(r)});
  persistPreset();
  renderBuildBar();
  refreshList();
}
let sbPieceKeys = []; // 피스 순번 → 꽂힌 옵션 rowKey 집합 (옵션 행 호버 ↔ 보드 강조 연동)
// ── 석판 보드 편집 (클릭-클릭: 팔레트에서 석판 선택→칸 클릭 배치, PC·모바일 공용) ──
let sbEdit = null; // null=보기 모드, {pal: 팔레트 선택 uid|null, sel: 선택 피스 인덱스|null}
function sbEditStart() {
  if (!preset.slateBd) preset.slateBd = [];
  sbEdit = {pal: null, sel: null, god: null};
  renderSlateBoard();
}
function sbEditEnd() {
  sbEdit = null;
  if (preset.slateBd && !preset.slateBd.length) delete preset.slateBd;
  persistPreset();
  renderPreset();
}
function sbPalPick(u) { sbEdit.pal = sbEdit.pal === u ? null : u; sbEdit.sel = null; renderSlateBoard(); }
function sbSelect(pi) { if (!sbEdit) return; sbEdit.sel = sbEdit.sel === pi ? null : pi; renderSlateBoard(); }
function sbGodPick(b) { sbEdit.god = sbEdit.god === b ? null : b; sbEdit.pal = null; sbEdit.sel = null; renderSlateBoard(); }
function sbApply() { rebuildSlateTalents(); persistPreset(); renderPreset(); }
function sbCellClick(id) {
  if (!sbEdit) return;
  if (sbSuppressClick) { sbSuppressClick = false; return; } // 드래그 이동 직후의 click
  const bd = preset.slateBd;
  const hit = bd.findIndex(s => (slateCells(s.u, s.i, s.d) || [s.i]).indexOf(id) >= 0);
  if (sbEdit.pal != null && hit < 0) { // 배치 — 들어가는 회전 자동 탐색, 안 맞으면 겹친 채 배치(⚠ 표시 후 옮기면 됨)
    const err = sbLimitErr(sbEdit.pal);
    if (err) { alert(err); return; }
    const d = sbFitDir(bd, sbEdit.pal, id, 0, -1);
    bd.push({u: sbEdit.pal, i: id, d: d < 0 ? 0 : d, t: []});
    sbEdit.sel = bd.length - 1;
    sbEdit.pal = null;
    sbApply();
    return;
  }
  if (hit >= 0) { sbEdit.sel = hit === sbEdit.sel ? null : hit; sbEdit.pal = null; renderSlateBoard(); return; }
  if (sbEdit.sel != null) { // 선택 피스를 빈 칸으로 이동 — 맞는 회전 우선, 없으면 겹친 채로 이동(⚠ 표시)
    const sl = bd[sbEdit.sel];
    const d = sbFitDir(bd, sl.u, id, sl.d, sbEdit.sel);
    sl.i = id;
    if (d >= 0) sl.d = d;
    sbApply();
  }
}
function sbRotate() { // 겹치더라도 회전 허용 — 꽉 찬 보드에서 재배치할 수 있게 (겹침은 ⚠ 표시)
  const sl = sbEdit && sbEdit.sel != null ? preset.slateBd[sbEdit.sel] : null;
  if (!sl) return;
  sl.d = (sl.d + 1) % 4;
  sbApply();
}
function sbShape() { // 신격의 석판 모양 변형 순환 (소켓·위치·회전 유지)
  const sl = sbEdit && sbEdit.sel != null ? preset.slateBd[sbEdit.sel] : null;
  if (!sl) return;
  const base = Math.floor((sl.u - 1) / 100) * 100;
  if (!(base in GOD_BASES)) return;
  const order = GOD_PAL.map(gp => gp[0]);
  sl.u = base + order[(order.indexOf(sl.u - base) + 1) % order.length]; // 미노출 변형(Z2·L2)이면 Z부터
  sbApply();
}
function sbDelete() {
  if (!sbEdit || sbEdit.sel == null || !preset.slateBd[sbEdit.sel]) return;
  preset.slateBd.splice(sbEdit.sel, 1);
  sbEdit.sel = null;
  sbApply();
}
// ── 피스 드래그 이동 (pointer 이벤트 — PC·터치 공용, 클릭-클릭 이동도 그대로 동작) ──
let sbDrag = null, sbSuppressClick = false; // 드래그 직후 click 무시용
function sbClearDropMarks() {
  document.querySelectorAll('#slateBoardWrap .sb-drop-ok, #slateBoardWrap .sb-drop-bad')
    .forEach(x => x.classList.remove('sb-drop-ok', 'sb-drop-bad'));
}
document.addEventListener('click', e => { // 보드 바깥 클릭 = 선택 해제 — 단 겹친 석판이 있으면 그 피스로 포커스 유지
  if (!sbEdit || sbEdit.sel == null || !e.target.closest) return;
  if (sbSuppressClick) { sbSuppressClick = false; return; } // 보드 밖에서 끝난 드래그의 click
  if (e.target.closest('.sb-cell[data-cid], .sb-pal, .sb-actions, .sb-editbtn, .sb-key, #sbSockModal, .imgpv, .modal-card')) return;
  const cf = sbConflicts(preset.slateBd);
  if (cf.length) { sbEdit.sel = cf[0]; renderSlateBoard(); return; }
  sbEdit.sel = null;
  renderSlateBoard();
});
document.addEventListener('pointerdown', e => {
  if (!sbEdit) return;
  const cell = e.target.closest && e.target.closest('#slateBoardWrap .sb-cell.sb-on');
  if (!cell || cell.dataset.cid === undefined || cell.dataset.pi === undefined) return;
  sbDrag = {pi: +cell.dataset.pi, grab: +cell.dataset.cid, moved: false};
});
document.addEventListener('pointermove', e => {
  if (!sbDrag || !sbEdit) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el && el.closest && el.closest('#slateBoardWrap .sb-cell');
  sbClearDropMarks();
  if (!cell || cell.dataset.cid === undefined) return;
  const target = +cell.dataset.cid;
  if (target !== sbDrag.grab) sbDrag.moved = true;
  if (!sbDrag.moved) return;
  const mv = sbMoveDelta(sbDrag.pi, sbDrag.grab, target, true);
  const cls = mv && mv.ok ? 'sb-drop-ok' : 'sb-drop-bad'; // 빨강 = 겹침(드롭은 되지만 ⚠)·보드 밖(드롭 불가)
  (mv ? mv.cells : [target]).forEach(c => {
    const el2 = document.querySelector('#slateBoardWrap .sb-cell[data-cid="' + c + '"]');
    if (el2) el2.classList.add(cls);
  });
});
document.addEventListener('pointerup', e => {
  if (!sbDrag) return;
  const drag = sbDrag;
  sbDrag = null;
  if (!sbEdit || !drag.moved) return; // 제자리 = 클릭 (onclick이 처리)
  sbSuppressClick = true;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el && el.closest && el.closest('#slateBoardWrap .sb-cell');
  if (cell && cell.dataset.cid !== undefined) {
    const mv = sbMoveDelta(drag.pi, drag.grab, +cell.dataset.cid, true); // 겹침 허용 드롭 (⚠ 표시)
    if (mv) { preset.slateBd[drag.pi].i = mv.i; sbEdit.sel = drag.pi; sbApply(); return; }
  }
  renderSlateBoard(); // 보드 밖 드롭 — 프리뷰 표시만 정리 (원위치 유지)
});
// ── 옵션 소켓 모달: 슬롯(등급 템플릿) 클릭 → 등급 필터된 석판 옵션 목록에서 행 클릭 = 장착 ──
let sbSockSlot = null;
const SLATE_ROWS = []; // 석판 옵션 행 인덱스 (nids 보유 행)
ALL_DATA.forEach((r, i) => { if (r.nids && r.nids.length) SLATE_ROWS.push(i); });
function openSbSock() {
  if (!sbEdit || sbEdit.sel == null || !preset.slateBd[sbEdit.sel]) return;
  sbSockSlot = null;
  renderSbSock();
  document.getElementById('sbSockModal').style.display = 'flex';
  modalHistPush();
}
function closeSbSock() { document.getElementById('sbSockModal').style.display = 'none'; }
function renderSbSock() {
  const sl = preset.slateBd[sbEdit.sel], info = SLATES[sl.u];
  document.getElementById('sbSockTitle').textContent = info.n + ' — 옵션 소켓';
  document.getElementById('sbSockSlots').innerHTML = info.sl.map((ranks, si) => {
    const nid = (sl.t || [])[si];
    const ri = nid ? SLATEIDX.idx[nid] : undefined;
    const cur = ri !== undefined ? ALL_DATA[ri].effect : '';
    return `<div class="sb-slot${sbSockSlot === si ? ' on' : ''}" onclick="sbSockPick(${si})">` +
      `<span class="sb-slot-g">${si + 1}. ${slateSockLabel(info, ranks).replace(/ · /g, ' 또는 ')}</span>` +
      `<span class="sb-slot-v">${cur ? escapeHtml(cur) : '<i style="color:#556a8f">비어 있음 — 클릭해서 선택</i>'}</span>` +
      (cur ? `<button class="btn-sel" onclick="event.stopPropagation();sbSockClear(${si})">비우기</button>` : '') + '</div>';
  }).join('');
  document.getElementById('sbSockSearch').style.display = sbSockSlot != null ? '' : 'none';
  renderSbSockList();
}
function sbSockPick(si) { sbSockSlot = sbSockSlot === si ? null : si; renderSbSock(); }
function renderSbSockList() {
  const box = document.getElementById('sbSockList');
  if (sbSockSlot == null) { box.innerHTML = ''; return; }
  const sl = preset.slateBd[sbEdit.sel], info = SLATES[sl.u];
  const ranks = info.sl[sbSockSlot];
  const q = (document.getElementById('sbSockSearch').value || '').trim().toLowerCase();
  const rows = SLATE_ROWS.filter(ri => {
    const r = ALL_DATA[ri];
    if (!slateSockOk(info, r, ranks)) return false; // 절대자는 명왕 석판에만
    return !q || (r.effect + ' ' + (r.type || '')).toLowerCase().indexOf(q) >= 0;
  }).slice(0, 250);
  box.innerHTML = rows.map(ri =>
    `<div class="sb-optrow" onclick="sbSockAssign(${ri})"><span class="sb-optg">${SB_RANK_LABEL[slateRank(ALL_DATA[ri])]}</span>${escapeHtml(ALL_DATA[ri].effect)}</div>`).join('') ||
    '<div class="no-result">해당 등급의 옵션이 없습니다.</div>';
}
function sbSockAssign(ri) {
  const sl = preset.slateBd[sbEdit.sel];
  sl.t = sl.t || [];
  while (sl.t.length <= sbSockSlot) sl.t.push('');
  sl.t[sbSockSlot] = String(ALL_DATA[ri].nids[0]);
  sbSockSlot = null;
  sbApply();
  renderSbSock();
}
function sbSockClear(si) {
  const sl = preset.slateBd[sbEdit.sel];
  if (sl.t && sl.t.length > si) sl.t[si] = '';
  sbApply();
  renderSbSock();
}
function renderSlateBoard() {
  const wrap = document.getElementById('slateBoardWrap');
  if (!wrap) return;
  const bd = preset.slateBd || [];
  if (sbEdit && sbEdit.sel != null && !bd[sbEdit.sel]) sbEdit.sel = null; // 빌드 전환·undo 후 stale 인덱스 방지
  if (!bd.length && !sbEdit) { // 보드 없음 — 로그로 가져온 배치가 있을 때만 표시 (ver 24.1: 직접 배치 기능 제거)
    sbPieceKeys = [];
    wrap.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }
  const cellOf = new Map(); // 'x,y' → {pi, org, conflict, out}
  let bx0 = 1, bx1 = 6, by0 = 1, by1 = 6; // 그리드 범위 — 보드 밖으로 나간 칸이 있을 때만 그 방향으로 확장
  // 피스 색: 신격 = 신별 고정색(게임 색감), 레전드 = 팔레트 순번 — 같은 색이 여러 장이면 명도 단계로 구분
  const GOD_COLORS = {260000: '#2dd4bf', 260100: '#d46ad4', 260200: '#5588ff', 260300: '#e5534b', 260400: '#38bdf8', 260500: '#f0883e'};
  const colOf = [], colCnt = new Map();
  bd.forEach((s, pi) => {
    const info = SLATES[s.u] || {};
    const base = info.god ? (GOD_COLORS[Math.floor((s.u - 1) / 100) * 100] || '#c9a6ff') : SLATE_COLORS[pi % SLATE_COLORS.length];
    const n = colCnt.get(base) || 0;
    colCnt.set(base, n + 1);
    colOf[pi] = n === 0 ? base : `color-mix(in srgb, ${base} ${Math.max(35, 100 - n * 28)}%, #f0f6fc)`;
  });
  const pAll = slatePieceInfo(bd); // 피스 정보(옵션 줄·파생·연결)는 00_slate.js 공용 — 빌더 2 와 같은 툴팁
  const pieces = bd.map((s, pi) => {
    let cells = s.o1 ? null : slateCellsXY(s.u, s.i, s.d); // o1 = 모양 미확정 → 원점 칸만
    let warn = false;
    if (!cells) cells = [[s.i % 10, (s.i / 10) | 0]]; // 미지 모양 — 원점만
    // 겹침은 칸 단위 처리(먼저 놓인 피스가 소유), 보드 밖 칸은 빨간 점선 고스트로 모양 유지
    cells.forEach((xy, ci) => {
      const out = xy[0] < 1 || xy[0] > 6 || xy[1] < 1 || xy[1] > 6 || !SLATE_ACT.has(xy[1] * 10 + xy[0]);
      if (out) {
        warn = true;
        bx0 = Math.min(bx0, Math.max(-2, xy[0])); bx1 = Math.max(bx1, Math.min(9, xy[0]));
        by0 = Math.min(by0, Math.max(-2, xy[1])); by1 = Math.max(by1, Math.min(9, xy[1]));
      }
      const key = xy[0] + ',' + xy[1];
      const prev = cellOf.get(key);
      if (prev) { prev.conflict = true; warn = true; return; }
      cellOf.set(key, {pi, ci, org: xy[0] === ((s.i / 10) | 0) && xy[1] === s.i % 10, out});
    });
    return Object.assign(pAll.pieces[pi], {warn: warn || pAll.pieces[pi].warn});
  });
  sbPieceKeys = pieces.map(p => p.keys);
  sbLinks = pAll.links;
  // 헤더 + (편집 모드) 팔레트
  let h = '<div class="sb-title">🧩 보드 배치 ' + (sbEdit
    ? '<span class="psum">팔레트에서 석판을 고른 뒤 칸 클릭 = 배치 · 피스 클릭 = 선택</span><button class="btn-sel sb-editbtn" onclick="sbEditEnd()">✓ 완료</button>'
    : '<span class="psum">칸에 마우스를 올리면 옵션 표시</span>') + '</div>';
  if (sbEdit) {
    const palBtn = u => {
      const nm = SLATES[u].n.replace('명왕의 불완전한 신격: ', '불완전 ').replace('명왕의 신격: ', '명왕 ').replace('의 신격', '');
      return `<button class="sb-pal${sbEdit.pal === u ? ' on' : ''}" onclick="sbPalPick(${u})" title="${escapeHtml(SLATES[u].n)} (${SLATES[u].c.length}칸)">${escapeHtml(nm)}</button>`;
    };
    h += '<div class="sb-palette">' + [1003, 1005, 1010, 1001, 1012, 1009, 1011].map(palBtn).join('') + '</div>' +
         '<div class="sb-palette">' + [394004, 394005, 394006, 394001, 394002].map(palBtn).join('') +
         Object.keys(GOD_BASES).map(b => `<button class="sb-pal${sbEdit.god === +b ? ' on' : ''}" onclick="sbGodPick(${b})">${escapeHtml(GOD_BASES[b])}</button>`).join('') + '</div>';
    if (sbEdit.god != null) { // 신 선택 → 모양 (Z·L·O·T — Z2·L2 변형은 회전으로 커버)
      h += '<div class="sb-palette"><span class="psum" style="align-self:center">' + escapeHtml(GOD_BASES[sbEdit.god]) + ' 모양:</span>' +
        GOD_PAL.map(gp => {
          const u = sbEdit.god + gp[0];
          return `<button class="sb-pal${sbEdit.pal === u ? ' on' : ''}" onclick="sbPalPick(${u})">${gp[1]}</button>`;
        }).join('') + '</div>';
    }
  }
  h += `<div class="slate-grid" style="grid-template-columns:repeat(${bx1 - bx0 + 1}, 32px)">`;
  const selP = sbEdit && sbEdit.sel != null ? bd[sbEdit.sel] : null;
  const selCells = new Set((selP ? slateCellsXY(selP.u, selP.i, selP.d) || [[selP.i % 10, (selP.i / 10) | 0]] : []).map(xy => xy[0] + ',' + xy[1]));
  for (let r = by0; r <= by1; r++) for (let c = bx0; c <= bx1; c++) {
    const key = c + ',' + r;
    const cd = cellOf.get(key);
    const id = c * 10 + r; // 열×10+행 — slateCells와 같은 공간 (행×10+열로 쓰면 클릭·드래그가 전치 이동)
    const act = r >= 1 && r <= 6 && c >= 1 && c <= 6 && SLATE_ACT.has(id);
    if (cd === undefined) {
      if (!act) { h += r >= 1 && r <= 6 && c >= 1 && c <= 6 ? '<span></span>' : '<span class="sb-void"></span>'; continue; }
      h += `<span class="sb-cell${sbEdit ? ' sb-edit' : ''}" data-cid="${id}"${sbEdit ? ` onclick="sbCellClick(${id})"` : ''}></span>`;
      continue;
    }
    const p = pieces[cd.pi];
    const col = colOf[cd.pi];
    // 같은 피스끼리 맞닿은 변은 경계선을 죽여 한 덩어리로 보이게 (같은 색 두 장 구분용)
    const same = (dx, dy) => (cellOf.get((c + dx) + ',' + (r + dy)) || {}).pi === cd.pi;
    const join = (same(0, -1) ? ' sb-jt' : '') + (same(1, 0) ? ' sb-jr' : '') + (same(0, 1) ? ' sb-jb' : '') + (same(-1, 0) ? ' sb-jl' : '');
    const {tip, tipH} = slateCellTip(bd, p, cd.pi, cd.ci, cd.out); // 툴팁 줄 구성은 00_slate.js 공용
    const cidAttr = act ? ` data-cid="${id}"` : '';
    const click = sbEdit ? (act ? ` onclick="sbCellClick(${id})"` : ` onclick="sbSelect(${cd.pi})"`) : '';
    h += `<span class="sb-cell sb-on${cd.out ? ' sb-ghost' : ''}${p.fx ? ' sb-fx' : ''}${p.unsure ? ' sb-unsure' : ''}${cd.conflict ? ' sb-conflict' : ''}${selCells.has(key) ? ' sb-selp' : ''}${sbEdit ? ' sb-edit' : ''}${join} tip2" data-pi="${cd.pi}"${cidAttr} style="--sc:${col}" title="${escapeHtml(tip)}" data-h="${escapeHtml(tipH).replace(/"/g, '&quot;')}"${click}>${cd.org ? '<i class="sb-org"></i>' : ''}</span>`;
  }
  h += '</div>';
  if (sbEdit && sbEdit.sel != null) { // 선택 피스 조작 바
    const sl = bd[sbEdit.sel], info = SLATES[sl.u] || {};
    const sockBtn = info.sl ? `<button class="btn-sel" onclick="openSbSock()">옵션 ${(sl.t || []).filter(Boolean).length}/${info.sl.length}</button>` : '';
    const shpBtn = (Math.floor((sl.u - 1) / 100) * 100) in GOD_BASES ? `<button class="btn-sel" onclick="sbShape()" title="모양 변형 순환 (소켓 유지)">모양: ${(info.shp || '?').replace(/1$/, '')}</button>` : '';
    h += `<div class="sb-actions"><b>${escapeHtml(info.n || '#' + sl.u)}</b><button class="btn-sel" onclick="sbRotate()">↻ 회전</button>${shpBtn}${sockBtn}<button class="btn-sel" onclick="sbDelete()">삭제</button><span class="psum">빈 칸 클릭 = 이동</span></div>`;
  }
  h += '<div class="sb-legend">' + pieces.map(p =>
    `<span class="sb-key" data-pi="${p.pi}"><i style="background:${colOf[p.pi]}"></i>${escapeHtml(p.name)}${p.warn ? ' <span class="sb-warntag">⚠ 겹침·재배치</span>' : p.unsure ? ' <span class="psum">위치만</span>' : ''}</span>`).join('') + '</div>';
  wrap.innerHTML = h;
  wrap.style.display = '';
}
// ── 재능 보드 (로그에서 가져온 찍은 노드를 계열별 SVG로 재현, 읽기 전용) ──
// BOARDS[prefix].p는 열 우선 정렬 = 그 계열 노드 ID 오름차순과 1:1 → 위치별 ID를 규칙으로 도출
const BOARD_IDS = (() => { // prefix → 노드 ID 오름차순 (핵심 재능 id는 3~4자리가 '00'이라 제외)
  const o = {};
  Object.keys(SLATEIDX.idx).forEach(k => {
    // 끝 두 자리 ≠ '00' 은 같은 칸의 변형(SS14 티아 「계시의 예언」 축복 변형 …01) — 칸 순서에 넣으면 뒤 칸이 한 칸씩 밀린다 (2026-10-10)
    if (k.length !== 8 || k.slice(2, 4) === '00' || k.slice(6) !== '00' || !BOARDS[k.slice(0, 2)]) return;
    (o[k.slice(0, 2)] = o[k.slice(0, 2)] || []).push(k);
  });
  Object.values(o).forEach(a => a.sort());
  return o;
})();
// 노드의 등급: 효과 문구 기준 (1=하위 3=중위 4=레전드 중위) — 역상 복사본은 원본 노드의 등급을 따라간다
function boardTier(nid) {
  const i = nid ? SLATEIDX.idx[nid] : undefined;
  const e = i === undefined ? '' : ALL_DATA[i].effect;
  return /^\[레전드 중위/.test(e) ? 4 : /^\[중위/.test(e) ? 3 : /^\[하위/.test(e) ? 1 : 0;
}
function boardNodeText(nid) {
  const i = SLATEIDX.idx[nid];
  return i === undefined ? '노드 ' + nid : ALL_DATA[i].effect;
}
// 보드 강조 연동: 칸·범례 호버 = 같은 석판 전체 강조, 석판 옵션 행 호버 = 그 옵션을 가진 석판 강조
let sbLinks = []; // 피스 → 파생 효과로 연결된 피스들 (renderSlateBoard가 채움)
function sbHighlight(pis, sec) {
  sec = sec || new Set();
  const on = pis.size > 0;
  document.querySelectorAll('#slateBoardWrap .sb-cell.sb-on').forEach(el => {
    const p = +el.dataset.pi;
    const hit = pis.has(p);
    el.classList.toggle('sb-hl', hit);
    el.classList.toggle('sb-hl2', !hit && sec.has(p)); // 복제 원본·전염/강화 대상
    el.classList.toggle('sb-dim', on && !hit && !sec.has(p));
  });
}
document.addEventListener('mouseover', e => {
  if (!e.target.closest) return;
  const cell = e.target.closest('#slateBoardWrap .sb-cell.sb-on, #slateBoardWrap .sb-key');
  if (cell) { const pi = +cell.dataset.pi; sbHighlight(new Set([pi]), sbLinks[pi] || new Set()); return; }
  const tr = e.target.closest('#presetSlabTbody tr[data-tal]');
  if (tr && preset && preset.slateBd) {
    const t = preset.talents[+tr.dataset.tal];
    const pis = new Set();
    if (t) sbPieceKeys.forEach((ks, pi) => { if (ks.has(t.k)) pis.add(pi); });
    sbHighlight(pis);
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest && e.target.closest('#slateBoardWrap .sb-cell.sb-on, #slateBoardWrap .sb-key, #presetSlabTbody tr[data-tal]'))
    sbHighlight(new Set());
});
let slabLowOpen = false; // 중위·하위 재능 접힘 상태 (세션 한정)
function toggleSlabLow() { slabLowOpen = !slabLowOpen; renderPreset(); }
function bumpTalentCnt(i, d) { // 운명 개수(같은 숙명 ×N) 조절
  if (guardShareView()) return;
  const t = preset.talents[i];
  if (!t) return;
  if (d > 0 && isUndecidedDst(t) && undecidedDstCnt() >= 3) { alert('미정 숙명은 최대 3개까지 장착할 수 있습니다.'); return; }
  t.cnt = Math.max(1, Math.min(99, (t.cnt || 1) + d));
  if (t.cnt === 1) delete t.cnt;
  persistPreset();
  renderPreset();
}
function removeTalent(i) {
  if (guardShareView()) return;
  // 액티브 칸의 주입 스킬은 박학다식 덕분에 들어간 것 — 먼저 스킬을 비우게 한다
  const t = preset.talents[i];
  if (t && isPolymathSlotOpt(t) && preset.talents.filter(isPolymathSlotOpt).length === 1) {
    const used = activeMainNames(isInjectPassive);
    if (used.length) { alert('액티브 슬롯에 주입 스킬(' + used.join(', ') + ')이 있어 박학다식을 뺄 수 없습니다.\n먼저 해당 스킬을 비워주세요.'); return; }
  }
  preset.talents.splice(i, 1);
  persistPreset();
  renderPreset();
}

// ── 레전드 아이템 장착 (부위 자동 판정) ──
function equipItem(it) {
  if (!it) return;
  const part = ITEM_PART.get(it.name);
  if (!part) { alert('부위 정보를 알 수 없는 아이템이라 장착할 수 없습니다.'); return; }
  let slotId = null;
  if (PARTS.HELMETS.includes(part)) slotId = 'helmet';
  else if (PARTS.CHESTS.includes(part) || part === '특수 갑옷') slotId = 'chest';
  else if (part === '목걸이') slotId = 'neck';
  else if (PARTS.GLOVES.includes(part)) slotId = 'glove';
  else if (part === '벨트') slotId = 'belt';
  else if (PARTS.BOOTS.includes(part)) slotId = 'boots';
  else if (RING_PARTS.includes(part)) slotId = !preset.slots['ring1'] ? 'ring1' : (!preset.slots['ring2'] ? 'ring2' : 'ring1');
  else if (PARTS.SHIELDS.includes(part)) {
    if (isTwoHandEquipped()) {
      uiConfirm('양손 무기를 해제하고 방패를 장착할까요?', () => { preset.slots['weapon1'] = null; finishEquipItem(it, part, 'weapon2'); });
      return;
    }
    slotId = 'weapon2';
  } else if (PARTS.TWO_HAND.includes(part)) {
    if (preset.slots['weapon2']) {
      uiConfirm('양손 무기를 장착하면 무기(방패) 슬롯이 비워집니다. 진행할까요?', () => { preset.slots['weapon2'] = null; finishEquipItem(it, part, 'weapon1'); });
      return;
    }
    preset.slots['weapon2'] = null;
    slotId = 'weapon1';
  } else if (PARTS.ONE_HAND.includes(part)) {
    if (isTwoHandEquipped()) slotId = 'weapon1';
    else slotId = !preset.slots['weapon1'] ? 'weapon1' : (!preset.slots['weapon2'] ? 'weapon2' : 'weapon1');
  } else { alert(`빌드 장착 대상 부위가 아닙니다: ${part}`); return; }
  finishEquipItem(it, part, slotId);
}
function finishEquipItem(it, part, slotId) {
  preset.slots[slotId] = carryAddons(preset.slots[slotId], {kind: 'item', name: it.name, part, snap: it});
  persistPreset();
  alert(`[${it.name}] → ${SLOT_BY_ID.get(slotId).label} 슬롯에 장착했습니다.`);
  if (currentTab === 'preset') renderPreset();
}

function clearSlot(id) { preset.slots[id] = null; persistPreset(); renderPreset(); }

// 블러드 제작 장비의 호버 카드 (레전드 옵션 2개 + 출처 아이템명)
function bloodCardHtml(v) { // 호버 카드 렌더러 — 읽기 전용이므로 수정 가드를 두면 안 됨 (공유 보기에서 카드가 안 뜸)
  const name = v.name || `블러드 제작 ${v.part}`;
  const ero = v.ero || []; // 침식 강화 인덱스 — 기본→레전드→추가 통합 순번 (블러드는 최대 3개)
  const mark = fi => ero.includes(fi) ? '<span class="corr-chip">침식</span>' : '';
  let h = `<div class="icard"><div class="icard-name" style="color:#ff6e5e">${escapeHtml(name)}</div>`;
  h += `<div class="icard-tags"><span>${escapeHtml(v.part)}</span><span style="color:#ff6e5e;border-color:#ff6e5e66">블러드 제작 장비</span>${v.aberrant ? '<span style="color:#c9a6ff;border-color:#c9a6ff66">이상 부위</span>' : ''}</div>`;
  const setName = {'투구': '투구·목걸이', '목걸이': '투구·목걸이', '갑옷': '갑옷·장갑', '장갑': '갑옷·장갑', '신발': '신발·반지·벨트', '반지': '신발·반지·벨트', '벨트': '신발·반지·벨트'}[v.part] || '';
  const bi = v.base && BASEIDX[v.base]; // 베이스(기본) 아이템 수치 — 로그 BaseId로 확정된 것만
  if (bi) {
    h += `<div class="ccard-sec">베이스 · ${escapeHtml(bi.name)}${bi.lv ? ' (Lv' + bi.lv + ')' : ''}</div>` +
      [...(bi.stats || []), ...(bi.imps || [])].filter(e => !/\s0$/.test(e)).map(e => `<div class="icard-opt">${escapeHtml(e)}</div>`).join('');
  }
  const base = v.opts.base || [];
  if (base.length) {
    h += `<div class="ccard-sec">기본 옵션 ${base.length}/2</div>`;
    h += base.map((o, i) => `<div class="icard-opt${ero.includes(i) ? ' opt-ero' : ''}">${escapeHtml(o.effect)}${mark(i)}</div>`).join('');
  }
  h += `<div class="ccard-sec">레전드 추출 옵션 ${v.opts.blood.length}/2${setName ? ' · ' + setName + ' 세트' : ''}</div>`;
  h += v.opts.blood.map((o, i) => {
    const live = KEY_MAP.get(o.k), fi = base.length + i;
    const on = ero.includes(fi);
    const corr = on ? bloodLegendCorr(o) : null; // 침식 시 출처 레전드의 corr 수치 (우리 데이터라 raw HTML)
    const body = corr || escapeHtml((live || o).effect);
    return `<div class="icard-opt${on ? ' opt-ero' : ''}">${body}${mark(fi)} <span style="color:#8b949e;font-size:11px">— ${escapeHtml(o.type)}</span>${live ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</div>`;
  }).join('');
  const extra = v.opts.extra || [];
  if (extra.length) {
    h += `<div class="ccard-sec">추가 옵션 ${extra.length}/${bloodExtraCap(v.opts.blood.length)}</div>`;
    h += extra.map((o, i) => {
      const live = KEY_MAP.get(o.k), fi = base.length + v.opts.blood.length + i;
      const on = ero.includes(fi); // 침식 = T0+ 수치로 표시
      return `<div class="icard-opt${on ? ' opt-ero' : ''}">${escapeHtml(on ? eroEffect(o) : tierEffect(o))}${mark(fi)} <span style="color:#8b949e;font-size:11px">— ${escapeHtml(o.type)}</span>${live || o.tiers ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</div>`;
    }).join('');
  }
  return h + '</div>';
}

// ── 부귀·숭고 보조 ──
// 일반 스킬 레벨(20)과 다른 0~5 육성 레벨을 갖는다 (로그 아이템 Level). 레벨 효과는
// 레벨당 1/5씩 올라 5레벨에서 카드 표기값이 된다 (0레벨 = 0%). tlidb 카드는 5레벨 기준.
// 티어 옵션은 이와 별개로 붙는 굴림 옵션이며, 로그 771 대역 어픽스에 실측값이 있다.
const SUP_LV_MAX = 5;
function supRichLines(sp, sk) {
  const lines = [];
  // 육성 레벨 = 로그 Level - 1 (로그는 1부터 센다 — 사용자 확인).
  // 실측: 14번 결빙·고리 Level 1 = 미육성 0 (효과 0%) · 06번 천둥 Level 2 = 1 · 10번 문링 Level 5 = 4.
  // 카드 표기는 5레벨 만렙 기준이라 레벨 비율로 줄인다 (레벨당 1/5)
  // 레벨을 모르면(로그에 없음) 0으로 본다 — 만렙으로 가정해 없는 효과를 만들어내지 않는다
  const known = +sp.lv >= 1;
  const lv = known ? Math.max(0, Math.min(SUP_LV_MAX, +sp.lv - 1)) : 0;
  // 레벨 효과 — 카드 첫 줄의 "보조 대상 스킬 대미지 추가 +N%"만 줄인다
  // (조건부 문구의 수치는 레벨과 무관하다: "최대 빙결 +1 당 … 0.8%")
  const desc = plainText(String((sk.desc || [])[0] || ''));
  const m = /(보조 대상 스킬 대미지 추가 )([+-]?\d+(?:\.\d+)?)%/.exec(desc);
  if (m && lv > 0) {
    const v = Math.round(parseFloat(m[2]) * lv / SUP_LV_MAX * 10) / 10;
    lines.push(m[1] + (v >= 0 ? '+' : '') + v + '%');
  }
  // 티어 옵션 — 티어표 문구의 굴림 범위 자리에 로그 실측값을 순서대로 끼운다.
  // 어느 티어인지는 굴림값이 들어가는 범위로 판정한다 (14번 결빙 +16 = T0[14-17] · 06번 천둥 +47 = T1[45-48])
  const RANGE = /\(\s*([+-]?\d+(?:\.\d+)?)\s*[–—−-]\s*([+-]?\d+(?:\.\d+)?)\s*\)/g;
  const tiers = (SKILL_LV[sk.name] || {}).tiers || [];
  const vals = (sp.sopt || []).filter(v => isFinite(v));
  let tier = null;
  if (vals.length && tiers.length) {
    const inRange = t => {
      RANGE.lastIndex = 0;
      const m2 = RANGE.exec(String(t[1]));
      if (!m2) return false;
      const a = parseFloat(m2[1]), b = parseFloat(m2[2]);
      return vals[0] >= Math.min(a, b) - 0.05 && vals[0] <= Math.max(a, b) + 0.05;
    };
    tier = tiers.find(inRange) || tiers[0];
    let i = 0;
    const txt = String(tier[1]).replace(RANGE, (mm) => {
      const v = vals[i++];
      if (v === undefined) return mm;
      const r = Math.round(v * 10) / 10;
      return (r >= 0 ? '+' : '') + r;
    }).replace(/\+\+/g, '+'); // 원문이 "+(50-54)" 꼴이면 부호가 겹친다
    lines.push(txt);
  }
  return {name: sk.name, lv, lvTxt: (known ? lv : '?') + '/' + SUP_LV_MAX, lines, rich: true, tier: tier ? tier[0] : null};
}

// 보조 스킬이 실제 레벨에서 주는 수치 줄 — 옵션 모아보기 주입과 스킬 카드 툴팁이 같이 쓴다.
// 수치는 카드 문구가 아니라 레벨표에 있다 (표의 문구는 기준 수치를 달고 있어 실제 레벨 값으로 바꿔 끼운다)
function supGrantLines(sp) {
  const si = findSkill(sp);
  if (si < 0) return null;
  const nm = SKILLS[si].name;
  // 부귀·숭고는 일반 레벨표가 없고 0~5 육성 레벨을 따로 갖는다 (사용자 확인).
  // 카드 문구의 "보조 대상 스킬 대미지 추가 +20%"는 5레벨 만렙 기준이라 레벨 비율로 줄인다.
  // 티어 옵션(로그 771 어픽스 실측값)은 레벨과 별개로 그대로 더한다
  if (SUP_LV_KINDS.indexOf(SKILLS[si].kind) >= 0) return supRichLines(sp, SKILLS[si]);
  const lv = skillLevelOf(sp, false, skillLvBonuses());
  const vLo = skillLvValues(nm, lv.base + lv.lo), vHi = skillLvValues(nm, lv.base + lv.hi);
  if (!vHi) return null;
  const lvTxt = lv.base + lv.lo === lv.base + lv.hi ? String(lv.base + lv.hi)
    : (lv.base + lv.lo) + '~' + (lv.base + lv.hi);
  // 컬럼 라벨에는 최저 레벨(보통 Lv1) 기준 수치가 박혀 있다 — 그 자리를 실제 레벨 값으로 바꿔 끼운다.
  // 수치가 문구 끝이 아니라 가운데 있는 컬럼이 많다
  // ("…대미지 별도 3.05% , 최대 8 회 중첩" · "…크리티컬 발동 시, 대미지 +26% 추가")
  const d = SKILL_LV[nm] || {};
  const rows0 = (d.rows || []).map(r => [parseFloat(r[0]), r.slice(1)])
    .filter(r => isFinite(r[0])).sort((a, b) => a[0] - b[0]);
  const baseRow = rows0.length ? rows0[0][1] : null;
  const numOf = x => parseFloat(String(x).replace(/[^\d.\-]/g, ''));
  const lines = [];
  vHi.forEach(([col, valHi], ci) => {
    const a = numOf(valHi), b = vLo ? numOf(vLo[ci][1]) : a;
    if (!isFinite(a)) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    // 부호를 반드시 붙인다 — 옵션 집계 파서가 부호 없는 수치를 값으로 읽지 못한다
    const fmt = pc => (lo === hi ? (lo < 0 ? '' : '+') + lo
      : (lo < 0 ? '(' + lo + '-' + hi + ')' : '+(' + lo + '-' + hi + ')')) + pc;
    const base = baseRow ? numOf(baseRow[ci]) : NaN;
    let out = null;
    if (isFinite(base)) {
      const re = new RegExp('([+-]?)' + String(base).replace(/\./g, '\\.') + '(%?)');
      const mm = re.exec(col);
      if (mm) out = col.slice(0, mm.index) + fmt(mm[2]) + col.slice(mm.index + mm[0].length);
    }
    if (out === null) { // 기준 수치를 못 찾으면 예전처럼 끝의 수치를 갈아 끼운다
      const m = /([+-]?[\d.]+)\s*(%?)\s*$/.exec(col);
      out = (m ? col.slice(0, m.index) : col + ' ').replace(/\s+$/, '') + ' ' + fmt(m ? m[2] : '');
    }
    lines.push(out);
  });
  return {name: nm, lvTxt, lines};
}

// ── 대미지 계산: 모은 옵션으로 기대 대미지를 조립 (DPS 요소 제외) ──
// v1 변형 빌드는 build_html2._to_v1이 아래를 false로 바꾼다 — 계산은 아직 v2(테스트판) 전용,
// 창은 옵션 모아보기로만 동작한다 (대미지판 없음)
const CALC_ON = true;
// ((스킬 기본 + 플랫) × 증가 합 × 별도 곱 × 속성 별도 × 스킬 레벨) × 크리 기대 × 디버프(빙결·적 저항) = 결과.
// 기본 대미지 그룹을 먼저 곱해 소계를 보여주고, 크리·디버프를 그 뒤에 곱한다 (사용자 제안 구조).
// 각 칸에 마우스를 올리면 그 수치가 어떻게 나왔는지 전부 보인다 (옵션 모아보기와 같은 근거)
// 대미지 계산은 옵션 모아보기와 한 창이다 — 줄을 눌러 옵션을 빼면 대미지가 바로 다시 계산돼
// 어떤 옵션이 얼마나 기여하는지(또는 적용되지 않고 있는지) 눈으로 확인할 수 있다 (사용자 요청)
function openDmgCalc() {
  // 스킬을 안 골랐으면 액티브 1번(메인 스킬)으로 시작한다 — 목록 필터와 계산 대상이 같아진다
  if (!optSkill && (preset.skills || {}).a1 && preset.skills.a1.main) optSkill = 'a1';
  openOptSum();
}
function closeDmgCalc() { closeOptSum(); }
// 큰 수를 조·억·만 단위로 (소수점 둘째 자리까지) — 대미지 계산 표시용
function koNum(x) {
  const n = Math.abs(x), sg = x < 0 ? '-' : '';
  const f = v => (Math.round(v * 100) / 100).toLocaleString();
  if (n >= 1e12) return sg + f(n / 1e12) + '조';
  if (n >= 1e8) return sg + f(n / 1e8) + '억';
  if (n >= 1e4) return sg + f(n / 1e4) + '만';
  return Math.round(x).toLocaleString();
}
// 단위 표기 숫자 — 누르면 전체 자릿수와 오간다
function koNumHtml(x) {
  const full = Math.round(x).toLocaleString();
  const shrt = koNum(x);
  if (shrt === full) return escapeHtml(full);
  return `<span class="konum" data-f="${full}" data-s="${shrt}" title="눌러서 전체 자릿수 보기"` +
    ` onclick="event.stopPropagation();this.textContent=this.textContent===this.dataset.f?this.dataset.s:this.dataset.f"` +
    ` style="cursor:pointer;border-bottom:1px dotted currentColor">${shrt}</span>`;
}
function dmgPickSkill(id) { optSkill = id; renderDmgCalc(); }
let dmgOff = new Set(); // 대미지 계산에서 클릭으로 끈 버프·디버프 (칩 토글 — 저장하지 않는 화면 상태)
function dmgToggle(k) { if (dmgOff.has(k)) dmgOff.delete(k); else dmgOff.add(k); renderDmgCalc(); }
function renderDmgCalc() {
  const box = document.getElementById('dmgBody');
  if (!box) return; // 모아보기 창이 아직 없으면 (구버전 페이지) 조용히 넘어간다
  if (!CALC_ON) { box.innerHTML = ''; return; } // v1 변형: 대미지판 없이 모아보기만
  const sv = (preset.skills || {})[optSkill];
  // 대상 스킬은 위 칩(optSkills)과 같은 선택을 쓴다 — 목록에 보이는 옵션이 곧 계산에 들어간 옵션이다
  if (!sv || !sv.main) {
    box.innerHTML = '<div class="psum">위에서 <b>대상 스킬</b>을 고르면 그 스킬의 대미지를 계산합니다</div>';
    return;
  }
  // 버프·오라·소환 스킬은 때리는 스킬이 아니라 대미지 조립이 의미가 없다 — 판을 아예 내지 않는다
  // (영약·자극은 영약 tag, 오라는 패시브, 소환은 모듈화 kind). 아래 옵션 목록은 그대로 이 스킬 기준으로 걸러진다
  {
    const iChk = findSkill(sv.main);
    const skc = iChk >= 0 ? SKILLS[iChk] : null;
    const tg = skc ? (skc.tags || []) : [];
    const hits = skc && skc.kind === '액티브' && tg.some(t => t === '공격' || t === '주술') && tg.indexOf('영약') < 0;
    if (!hits) {
      box.innerHTML = `<div class="psum">${escapeHtml(sv.main.name)} — 때리는 스킬이 아니라 대미지 계산은 내지 않습니다` +
        ` (아래 목록은 이 스킬 기준으로 걸러집니다)</div>`;
      return;
    }
  }
  // 버프기(영약·자극·저주)도 전부 포함한다 — 실전에서 상시 유지하는 기준 (사용자 확인).
  // 상단 칩으로 하나씩 끌 수 있다 (버프·발동 저주·키워드·빙결)
  const srcOff = g => [...g.srcs.keys()].some(k => {
    if (k.startsWith('버프 · ')) return dmgOff.has('buff:' + k.slice(5).split(' (')[0].trim());
    if (k.startsWith('저주 발동 · ')) return dmgOff.has('curse:' + k.slice(8).split(' Lv')[0].trim());
    if (k.startsWith('키워드 · ')) return dmgOff.has('kw:' + k.slice(6).split(' (')[0].trim());
    return false;
  });
  const live = optSummary().filter(g => !optIsOff(g) && !srcOff(g));
  // 적용 중인 버프·디버프 칩 — 클릭으로 계산에서 넣고 뺀다
  const chips = [];
  try { buffSkillList().forEach(b => { if (b.lines.length) chips.push(['buff:' + b.name, b.name]); }); } catch (e) {}
  try { grantedCurses().forEach(cu => chips.push(['curse:' + cu.name, cu.name + ' (저주)'])); } catch (e) {}
  try { [...new Set(keywordBuffLines().map(([sr]) => sr.replace(/^키워드 · /, '').split(' (')[0].trim()))].forEach(k => chips.push(['kw:' + k, k])); } catch (e) {}
  if (freezeSummary(live).any) chips.push(['freeze', '빙결 (풀스택)']);
  chips.push(['cond', '조건부 옵션']);   // 빌드에 넣은 조건부는 실전에서 걸리는 것들 (사용자 확인) — 기본 포함
  chips.push(['res', '적 저항 30 (허수아비)']);
  const fm = x => Math.round(x * 1000) / 1000;
  const pc = x => Math.round(x * 10) / 10;
  const rg = (a, b) => pc(a) === pc(b) ? String(pc(b)) : pc(a) + '~' + pc(b);
  const cell = (label, val, tipLines, sub) =>
    `<span class="crit-cell tip2" title="${escapeHtml(tipLines.join('\n'))}">${escapeHtml(label)} ` +
    `<b class="opt-v">${escapeHtml(val)}</b>${sub ? ` <span class="psum">${escapeHtml(sub)}</span>` : ''}</span>`;
  const factors = []; // [배율lo, 배율hi, 셀 html, 그룹('base'|'crit'|'debuff')]
  // ⓪ 스킬 자체 대미지 — 카드의 기본 수치 (Lv20 기준, "612-918의 주술 냉기 대미지").
  // 20레벨 초과 성장은 아래 '스킬 레벨' 배율이 맡는다
  const i0pre = findSkill(sv.main);
  let skb = null;
  if (i0pre >= 0) {
    const dtxt = plainText(String((SKILLS[i0pre].desc || [])[0] || '') + ' ' + String((SKILLS[i0pre].details || [])[0] || ''));
    const mb2 = /(\d+(?:\.\d+)?)\s*[-–—−]\s*(\d+(?:\.\d+)?)\s*의?\s*(?:주술|공격)?\s*[가-힣 ]{0,6}대미지/.exec(dtxt);
    if (mb2) skb = {lo: +mb2[1], hi: +mb2[2], txt: mb2[0].trim()};
  }
  // 카드에 기본 대미지가 없는 공격 스킬 — 무기 공격 대미지 × 대미지 배율이 기본이 된다
  let wpn = null;
  if (!skb) {
    const wd = weaponDamage(), wm = skillDmgMult(sv.main);
    if (wd && wm) {
      wpn = {wd, wm};
      skb = {lo: wd.lo * wm / 100, hi: wd.hi * wm / 100,
             txt: `무기 ${pc(wd.lo)}~${pc(wd.hi)} × 대미지 배율 ${wm}%`};
    }
  }
  // ① 플랫 (평균) — 스킬 기본 대미지에 더해지는 값. 결과의 출발점
  const fd = flatDmgSum(live);
  const flats = Object.entries(fd.el).filter(([, t]) => t.lo || t.hi);
  const flatLo = flats.reduce((n, [, t]) => n + t.lo, 0), flatHi = flats.reduce((n, [, t]) => n + t.hi, 0);
  const flatAvg = (flatLo + flatHi) / 2;
  const flatTip = ['플랫(기본) 대미지 — 스킬 기본 대미지에 더해진 뒤 아래 배율이 전부 곱해집니다', ''];
  flats.forEach(([nm, t]) => { flatTip.push(`[${nm}] ${pc(t.lo)} ~ ${pc(t.hi)} (평균 ${pc((t.lo + t.hi) / 2)})`); flatTip.push(...t.rows.map(r => '   · ' + r)); });
  if (!flats.length) flatTip.push('플랫 대미지 옵션이 없습니다 — 스킬 자체 대미지만으로 계산합니다');
  // ② 증가 (합연산) — 조건부도 기본 포함 (빌드에 넣은 조건부는 실전에서 걸리는 것들, 칩으로 끌 수 있다)
  const r = dmgSum(live);
  const useCond = !dmgOff.has('cond');
  const sumLo = r.sum.lo + (useCond ? r.sumCond.lo : 0), sumHi = r.sum.hi + (useCond ? r.sumCond.hi : 0);
  const incLo = 1 + sumLo / 100, incHi = 1 + sumHi / 100;
  factors.push([incLo, incHi, cell('증가', '×' + mulRange(incLo, incHi),
    ['대미지 증가 (합연산) — 전부 더한 뒤 한 번에 곱합니다', `합 +${rg(sumLo, sumHi)}% → ×${fm(incLo)}${incHi !== incLo ? '~' + fm(incHi) : ''}`,
     '', ...r.sum.rows, ...(useCond && r.sumCond.rows.length ? ['', '[조건부 — 포함됨]', ...r.sumCond.rows] : [])],
    '+' + rg(sumLo, sumHi) + '%'), 'base']);
  // ③ 별도 (곱연산 — 옵션, 조건부 포함)
  const mulLo = r.mul.lo * (useCond ? r.mulCond.lo : 1), mulHi = r.mul.hi * (useCond ? r.mulCond.hi : 1);
  factors.push([mulLo, mulHi, cell('별도', '×' + mulRange(mulLo, mulHi),
    ['대미지 별도·추가 (곱연산) — 각각 따로 곱합니다',
     useCond && r.mulCond.rows.length
       ? `무조건 ×${mulTxt(r.mul.hi)} × 조건부 ×${mulTxt(r.mulCond.hi)} = ×${mulTxt(mulHi)}`
       : '조건부는 빠져 있습니다 ("조건부 옵션" 칩으로 넣을 수 있습니다)',
     '', ...r.mul.rows,
     ...(useCond && r.mulCond.rows.length ? ['', '[조건부 — 포함됨]', ...r.mulCond.rows] : [])],
    useCond && r.mulCond.rows.length ? `무조건 ×${mulTxt(r.mul.hi)} × 조건부 ×${mulTxt(r.mulCond.hi)}` : ''), 'base']);
  // ④ 기본 속성 별도 (메인 속성 1포인트당 0.5%)
  const mains = skillMainStats(sv.main);
  const sd = statDmgSummary(live, mains);
  if (sd) {
    const m1 = 1 + sd.dmgLo / 100, m2 = 1 + sd.dmgHi / 100;
    factors.push([m1, m2, cell(sd.mains.join('+'), '×' + mulRange(m1, m2),
      [`메인 속성(${sd.mains.join('+')}) 1포인트당 대미지 ${STAT_DMG_PER}% 별도 추가`, ...sd.rows,
       `합 ${Math.round(sd.stat.lo)} × ${STAT_DMG_PER}% = +${rg(sd.dmgLo, sd.dmgHi)}%`]), 'base']);
  }
  // ⑤ 빙결 (냉기 스킬일 때만 — 적이 받는 냉기 별도)
  const i0 = findSkill(sv.main);
  const tags = i0 >= 0 ? (SKILLS[i0].tags || []) : [];
  const fz = freezeSummary(live);
  if (fz.any && tags.indexOf('냉기') >= 0 && !dmgOff.has('freeze')) {
    const f1 = 1 + fz.dmgLo / 100, f2 = 1 + fz.dmgHi / 100;
    factors.push([f1, f2, cell('빙결', '×' + mulRange(f1, f2),
      ['빙결 풀스택 기준 — 적이 받는 냉기 대미지 별도 (냉기 대미지에만 적용)',
       `최대 빙결 ${rg(fz.max.lo, fz.max.hi)} × 1% × (1 + 빙결 효과 ${rg(fz.eff.lo, fz.eff.hi)}%) = +${rg(fz.dmgLo, fz.dmgHi)}%`]), 'debuff']);
  }
  // ⑥ 스킬 레벨 배율 (레벨표가 20까지인 액티브)
  const dL = i0 >= 0 ? SKILL_LV[SKILLS[i0].name] : null;
  const maxLv = dL && dL.rows ? Math.max(...dL.rows.map(x => parseFloat(x[0])).filter(isFinite)) : 20;
  const lvv = skillLevelOf(sv.main, optSkill === 'a1', skillLvBonuses());
  if (i0 >= 0 && SKILLS[i0].kind === '액티브' && maxLv <= 20) {
    const oLo = skillOverLv20(lvv.base + lvv.lo), oHi = skillOverLv20(lvv.base + lvv.hi);
    if (oHi) factors.push([(oLo || oHi).mul, oHi.mul, cell('스킬 레벨', '×' + mulRange((oLo || oHi).mul, oHi.mul),
      [`${SKILLS[i0].name} Lv${lvv.base + lvv.lo === lvv.base + lvv.hi ? lvv.base + lvv.hi : (lvv.base + lvv.lo) + '~' + (lvv.base + lvv.hi)} — 20레벨 초과 성장 (곱연산)`,
       '21~30레벨 레벨당 +10% · 31레벨부터 +8%',
       `${oHi.a}렙분 ×1.1 · ${oHi.b}렙분 ×1.08 = ×${fm(oHi.mul)}`],
      'Lv' + (lvv.base + lvv.hi)), 'base']);
  }
  // ⑦ 크리티컬 기대값
  const kind = tags.indexOf('주술') >= 0 ? '주술' : '공격';
  let critCell = null;
  try {
    const will = willPower(live);
    const cc = critChance(live, kind, will), cdm = critDamage(live, kind);
    if (cc && isFinite(cc.hi)) {
      // 이 스킬의 속성 전용 크리 대미지(냉기 크대 등)도 합류한다 — 이 스킬은 그 속성으로 때리므로
      const cdB = {lo: cdm.base.lo, hi: cdm.base.hi, rows: [...cdm.base.rows]};
      Object.entries(cdm.byEl).forEach(([el2, v2]) => {
        if (tags.indexOf(el2) < 0) return;
        cdB.lo += v2.lo; cdB.hi += v2.hi;
        cdB.rows.push(...v2.rows.map(r2 => r2 + ' (' + el2 + ' — 이 스킬의 속성)'));
      });
      // 크리가 터졌을 때만 붙는 대미지(크리 시 별도·추가)도 크리 친 타격에 곱해진다
      const co = critOnDamage(live);
      const coLo = (1 + co.sum.lo / 100) * (1 + co.mul.lo / 100), coHi = (1 + co.sum.hi / 100) * (1 + co.mul.hi / 100);
      const p1 = Math.min(100, cc.lo) / 100, p2 = Math.min(100, cc.hi) / 100;
      const e1 = 1 + p1 * (cdB.lo / 100 * coLo - 1), e2 = 1 + p2 * (cdB.hi / 100 * coHi - 1);
      factors.push([e1, e2, cell('크리 기대', '×' + mulRange(e1, e2),
        [`크리 확률 ${rg(cc.lo, cc.hi)}% · 크리 대미지 ${rg(cdB.lo, cdB.hi)}%` +
           (co.any ? ` · 크리 시 대미지 ×${rg(fm(coLo), fm(coHi))}` : ''),
         '기대값 = 1 + 확률 × (크리 대미지 × 크리 시 대미지 − 100%)', '', ...cdB.rows,
         ...(co.any ? ['', '[크리가 터졌을 때만 붙는 대미지 — 크리 친 타격에 곱해집니다]', ...co.rows] : [])]), 'crit']);
    }
  } catch (e) {}
  // ⑧ 적 저항 (허수아비 30) − 관통 = 실효 저항. 관통이 넘치면 저항이 음수가 돼 더 아프다
  if (!dmgOff.has('res')) {
    const el = ELEMENTS.find(e2 => e2 !== '원소' && tags.indexOf(e2) >= 0) || '물리';
    const pen = penetrationSum(live, el);
    const effLo = DUMMY_RES - pen.hi, effHi = DUMMY_RES - pen.lo;
    const m1 = 1 - effHi / 100, m2 = 1 - effLo / 100;
    factors.push([m1, m2, cell('적 저항', '×' + mulRange(m1, m2),
      [`허수아비 저항 ${DUMMY_RES}% − ${el} 관통 ${rg(pen.lo, pen.hi)}% = 실효 ${rg(effLo, effHi)}%`,
       '관통이 저항을 넘으면 음수가 돼 대미지가 오히려 커집니다', '', ...pen.rows],
      `저항 ${DUMMY_RES} − 관통 ${rg(pen.lo, pen.hi)}`), 'debuff']);
  }
  // 결과 — 출발점 = 스킬 자체 대미지 + 옵션 플랫. 둘 다 없으면 배율만
  const hasBase = !!skb || flats.length > 0;
  const baseLo = (skb ? skb.lo : 0) + flatLo, baseHi = (skb ? skb.hi : 0) + flatHi;
  const baseAvg = (baseLo + baseHi) / 2;
  let lo = hasBase ? baseLo : 1, hi = hasBase ? baseHi : 1, av = hasBase ? baseAvg : 1;
  factors.forEach(([a, b]) => { lo *= a; hi *= b; av *= (a + b) / 2; });
  const rows = [];
  if (chips.length) rows.push(`<div class="opt-skills" style="margin:0 0 8px"><span class="osk-lb">적용 중</span>` +
    chips.map(([k, nm]) => `<button class="${dmgOff.has(k) ? '' : 'on'}" onclick="dmgToggle('${k}')"` +
      ` title="${escapeHtml(dmgOff.has(k) ? '계산에서 빠져 있습니다 — 눌러서 다시 넣기' : '계산에 들어 있습니다 — 눌러서 빼기')}">${escapeHtml(nm)}${dmgOff.has(k) ? ' ✕' : ''}</button>`).join('') + `</div>`);
  // ((스킬 기본 + 플랫) × 증가 × 별도 × 속성 × 스킬 레벨) = 기본 소계 → × 크리 기대 × 디버프(빙결·저항) = 최종
  const baseFs = factors.filter(f => f[3] === 'base');
  const tailFs = [...factors.filter(f => f[3] === 'crit'), ...factors.filter(f => f[3] === 'debuff')];
  const avBase = (hasBase ? baseAvg : 1) * baseFs.reduce((n, f) => n * (f[0] + f[1]) / 2, 1);
  const numTxt = x => hasBase ? koNumHtml(x) : '×' + mulHtml(x);
  rows.push(`<div class="opt-row crit-sum" style="flex-wrap:wrap">` +
    `<span class="dmg-step" title="스킬 자체 대미지와 플랫에, 언제나 걸리는 배율(증가·별도·속성·스킬 레벨)을 곱합니다">① 기본 대미지</span>` +
    (skb ? cell(wpn ? '무기 기본' : '스킬 기본', String(pc((skb.lo + skb.hi) / 2)),
      wpn
        ? [`${sv.main.name}은 공격 스킬이라 기본 대미지가 무기에서 나옵니다`,
           `무기: ${wpn.wd.name || '(이름 없음)'}`, '',
           '무기 공격 대미지 — 그 무기에만 걸리는 국소 옵션("해당 장비 …")만 얹습니다',
           ...wpn.wd.rows.map(t => '   · ' + t),
           ...Object.entries(wpn.wd.byEl).map(([el, t]) =>
             `   = ${el} ${pc(t.lo)}~${pc(t.hi)}` + (t.pct ? ` (국소 증가 +${pc(t.pct)}% 반영)` : '')),
           `   합 ${pc(wpn.wd.lo)}~${pc(wpn.wd.hi)}`, '',
           `× 대미지 배율 ${wpn.wm}% = ${pc(skb.lo)}~${pc(skb.hi)}`,
           '전역 대미지 증가·별도는 아래 칸들이 곱합니다']
        : [`${sv.main.name} 카드의 기본 대미지 (Lv20 기준): ${skb.txt}`, '20레벨 초과 성장은 [스킬 레벨] 칸이 곱합니다'],
      rg(skb.lo, skb.hi)) : '') +
    (skb && flats.length ? '<span class="psum">+</span>' : '') +
    (flats.length ? cell('플랫 평균', String(pc(flatAvg)), flatTip, rg(flatLo, flatHi)) : (skb ? '' : cell('플랫 평균', '—', flatTip, ''))) +
    baseFs.map(f => f[2]).join('') +
    `<span class="crit-cell tip2" title="${escapeHtml('기본 대미지 소계 = (스킬 기본 + 플랫) × 증가 × 별도 × 속성 × 스킬 레벨\n크리·디버프를 곱하기 전 수치입니다')}">` +
    `<b class="opt-v" style="font-size:15px">= 기본 ${numTxt(avBase)}</b></span></div>`);
  if (tailFs.length) rows.push(`<div class="opt-row crit-sum" style="flex-wrap:wrap;margin-top:8px">` +
    `<span class="dmg-step" title="크리티컬 기대값과 적에게 거는 디버프(빙결·저항)를 곱해 한 방 대미지를 냅니다">② 한 방</span>` +
    `<span class="psum">기본 ${numTxt(avBase)} ×</span>` + tailFs.map(f => f[2]).join('') +
    `<span class="crit-cell"><b class="opt-v" style="font-size:15px">= ${numTxt(av)}</b>` +
    `${hasBase ? ` <span class="psum">(${koNumHtml(lo)} ~ ${koNumHtml(hi)})</span>` : ' <span class="psum">총 배율</span>'}</span></div>`);
  else rows[rows.length - 1] = rows[rows.length - 1].replace('</div>',
    `<span class="crit-cell"><b class="opt-v" style="font-size:15px">= ${numTxt(av)}</b></span></div>`);

  // ── 초당(DPS) 확장: 위 한 방 × (초당 시전 + 매버 초당 시전) ──
  try {
    const cps = castsPerSec(live, sv.main);
    if (cps) {
      // 충전에 관한 계산은 "충전을 돌리는 스킬" 기준으로 태그를 판정한다 —
      // 대상 스킬이 채널링이 아니어도 충전을 돌리는 스킬이 채널링이면 그 옵션이 충전에는 걸린다
      const bSlot = burstCastSlot();
      const bLive = (bSlot ? entriesForSlot(bSlot) : null) || live;
      const mbSp = speedSum(bLive, '매직 버스트 충전');
      const c2b = castToBurst(bLive);
      const castSp = speedSum(bLive, '시전');
      // 조건부 속도도 대미지와 같은 규칙으로 센다 — 빌드에 넣은 조건은 실전에서 걸린다 (칩으로 끌 수 있다).
      // 인게임 스탯 패널은 조건이 안 걸린 상태를 보여주므로 그쪽(옵션 모아보기)과는 값이 다르다
      const mbCond = useCond ? mbSp.cond.hi : 0, castCond = useCond ? castSp.cond.hi : 0;
      const spd = mbSp.sum.hi + mbCond + (c2b.pct ? (castSp.sum.hi + castSp.extra.hi + castCond) * c2b.pct / 100 : 0);
      const chargeSec = BURST_BASE_SEC / Math.max(0.01, (1 + spd / 100) * (1 + mbSp.extra.hi / 100));
      const cap = burstCap(live);
      const nat = cap.v / Math.max(0.001, chargeSec);
      const bfCps = castsPerSec(bLive, (bSlot && bSlot.main) || sv.main);
      const bf = burstForce(live, bfCps && useCond ? Object.assign({}, bfCps, {hi: bfCps.condHi}) : bfCps);
      const burstPerSec = nat + bf.rate; // 초당 충전 스택 = 초당 매버 시전 수 (스택 1 = 시전 1회)
      // 적중마다 하나 더 생기는 빌드(아이스링 숭고)는 발동 횟수가 그만큼 늘어난다
      const dup = dupProcSummary(live, sv);
      // 실전 기준 = 매버 시전만 (메인 스킬을 직접 누르지 않고, 채널링으로 충전만 돌린다 — 사용자 확인)
      const dps = av * burstPerSec * dup.mul;
      const cpsHi = useCond ? cps.condHi : cps.hi;
      const dpsBoth = av * (cpsHi + burstPerSec) * dup.mul;
      // 매직 버스트는 상한이 1 이상이어야 활성화된다 (게임 내 설명). 상한이 0인 빌드는
      // 매버를 아예 못 쓰므로 대상 스킬을 직접 시전하는 공/시속이 곧 DPS 기준이다 (사용자 확인)
      if (cap.v < 1) {
        const dpsD = av * cpsHi * dup.mul;
        const kd = cps.kind; // '시전' 또는 '공격'
        rows.push(`<div class="opt-row crit-sum" style="flex-wrap:wrap;margin-top:8px">` +
          `<span class="dmg-step" title="한 방 대미지에 초당 시전 횟수를 곱해 초당 대미지를 냅니다">③ 초당(DPS)</span>` +
          cell(`초당 ${kd}`, String(pc(cpsHi)),
            ['매직 버스트 상한이 0이라 매버를 쓸 수 없습니다 — 대상 스킬을 직접 시전하는 것이 전부입니다',
             `${sv.main.name} 기본 ${cps.base}초 × (1 + ${kd} 합 ${pc(castSp.sum.hi)}%)` +
               ` × (1 + 추가 ${pc(castSp.extra.hi)}%)` + (useCond && cps.cond ? ` (조건부 +${pc(cps.cond)}% 포함)` : ''),
             '', '매버 상한을 1 이상으로 올리면 매버 시전 기준으로 바뀝니다']) +
          (dup.mul > 1 ? cell('중복 발동', '×' + (Math.round(dup.mul * 1000) / 1000),
            ['적중할 때마다 같은 스킬이 하나 더 생깁니다', '', ...dup.rows]) : '') +
          `<span class="crit-cell"><b class="opt-v" style="font-size:15px">DPS ≈ ${hasBase ? koNumHtml(dpsD) : '×' + mulHtml(dpsD)}</b>` +
          ` <span class="psum">한 방 ${hasBase ? koNumHtml(av) : '×' + mulHtml(av)} × 초당 ${pc(cpsHi)}` +
          `${dup.mul > 1 ? ' × 중복 ' + (Math.round(dup.mul * 1000) / 1000) : ''}</span></span></div>`);
      } else rows.push(`<div class="opt-row crit-sum" style="flex-wrap:wrap;margin-top:8px">` +
        `<span class="dmg-step" title="한 방 대미지에 초당 시전 횟수를 곱해 초당 대미지를 냅니다">③ 초당(DPS)</span>` +
        cell('매버 초당', String(pc(burstPerSec)), ['매직 버스트는 충전 스택만큼 자동 시전됩니다 — 초당 스택 회복 = 초당 시전',
          `충전 기준 스킬: ${(bSlot && bSlot.main && bSlot.main.name) || '(없음)'}` +
            ' — 충전 속도와 강제 충전을 이 스킬 기준으로 셉니다 (채널링을 우선하고, 그다음 시전이 빠른 순)',
          '그 스킬의 태그·보조·카드 옵션이 여기 반영됩니다 (대상 스킬과 다를 수 있습니다)',
          '',
          `[자연 충전] 초당 ${pc(nat)}회`,
          `   ① 완충 시간 = 기본 ${BURST_BASE_SEC}초 ÷ ((1 + 충전 속도 ${pc(spd)}%) × (1 + 추가 ${pc(mbSp.extra.hi)}%)) = ${Math.round(chargeSec * 1000) / 1000}초`,
          `   ② 상한 ${cap.v}스택 ÷ ${Math.round(chargeSec * 1000) / 1000}초 = 초당 ${pc(nat)}회`,
          ...(c2b.pct ? [`   ※ 충전 속도 ${pc(spd)}% = 매버 자체 ${pc(mbSp.sum.hi + mbCond)}% + 시전 속도 ${pc(castSp.sum.hi + castSp.extra.hi + castCond)}%의 ${c2b.pct}% 이월(착실한 접근)`] : []),
          ...(mbCond || castCond ? [`   ※ 조건부 속도 포함 (매버 +${pc(mbCond)}% · 시전 +${pc(castCond)}%) — "조건부 옵션" 칩으로 끌 수 있습니다`] : []),
          '',
          `[강제 충전] 초당 ${pc(bf.rate)}회 — 확률이라 평균치로 셉니다`,
          ...bf.rows,
          '',
          `합계 ${pc(nat)} + ${pc(bf.rate)} = 초당 ${pc(burstPerSec)}회`],
          bSlot && bSlot.main && bSlot.main.name ? '기준 ' + bSlot.main.name : '') +
        (dup.mul > 1 ? cell('중복 발동', '×' + (Math.round(dup.mul * 1000) / 1000),
          ['적중할 때마다 같은 스킬이 하나 더 생깁니다 (아이스링 숭고 보조)',
           '보조가 "적 처치 시" 발동을 "적 적중 시"로 옮겨줍니다 — 허수아비처럼 죽지 않는 대상에도 걸립니다',
           '', ...dup.rows]) : '') +
        `<span class="crit-cell"><b class="opt-v" style="font-size:15px">DPS ≈ ${hasBase ? koNumHtml(dps) : '×' + mulHtml(dps)}</b>` +
        ` <span class="psum">한 방 ${hasBase ? koNumHtml(av) : '×' + mulHtml(av)} × 매버 ${pc(burstPerSec)}` +
        `${dup.mul > 1 ? ' × 중복 ' + (Math.round(dup.mul * 1000) / 1000) : ''} (직접 시전 없이)</span></span>` +
        cell('직접 시전까지', hasBase ? '≈ ' + koNum(dpsBoth) : '×' + mulTxt(dpsBoth),
          [`메인 스킬을 직접 눌러가며 쓰면 초당 ${pc(cpsHi)}회가 더해집니다`,
           `${sv.main.name} 기본 ${cps.base}초 × (1 + 시전 합 ${pc(castSp.sum.hi)}%) × (1 + 추가 ${pc(castSp.extra.hi)}%)`,
           ...(hasBase ? [`정확히: ${Math.round(dpsBoth).toLocaleString()}`] : [])]) + `</div>`);
    }
  } catch (e) {}
  // 계산 기준은 접어 둔다 — 늘 보일 필요는 없고, 자리를 많이 먹어 정작 옵션 목록이 밀린다
  rows.push(`<details class="dmg-note"><summary class="psum">계산 기준 · 주의</summary>` +
    `<div class="psum" style="margin-top:4px">· 영약·자극·저주 버프기와 발동형 저주(위축)까지 전부 포함 — 실전에서 상시 유지하는 기준입니다<br>` +
    `· 출발점 = 스킬 카드의 기본 대미지(Lv20 기준) + 옵션 플랫 합<br>` +
    `· 적 저항은 허수아비 30% 기준, 관통을 뺀 실효 저항으로 계산합니다 (칩으로 끌 수 있음)<br>` +
    `· 매버 시전분에만 붙는 별도(매버 적중 대미지)는 아직 직접 시전과 구분하지 않습니다<br>` +
    `· 매직 버스트 상한이 0인 빌드는 대상 스킬을 직접 시전하는 공·시전 속도로 DPS를 냅니다<br>` +
    `· 아래 목록에서 줄을 눌러 빼면 여기서도 빠집니다</div></details>`);
  box.innerHTML = rows.join('');
}
// ── 옵션 모아보기: 빌드의 모든 옵션을 문구별로 묶어 수치를 단순 합산 (계산 아님) ──
// +숫자(부호 있는 값)만 값으로 보고, 값을 지운 문구(stem)가 같으면 같은 옵션으로 합친다.
// 부호 없는 숫자(예: "전의 7 포인트 당")는 문구의 일부로 남겨 다른 옵션과 잘못 합쳐지지 않게 한다.
// 부호·범위를 실제 lo~hi로. 뒤 값이 이미 음수면("(-24--18)") 앞 부호를 다시 곱하지 않는다.
function numRange(sign, a, b) {
  const s = sign === '-' ? -1 : 1;
  const v1 = s * parseFloat(a);
  const v2 = (b === undefined || b === null) ? v1 : (String(b).charAt(0) === '-' ? parseFloat(b) : s * parseFloat(b));
  return {lo: Math.min(v1, v2), hi: Math.max(v1, v2)};
}
const OPT_PH = '[[V]]', OPT_SEP = '|::|'; // 값 자리 표시·출처 구분자 (옵션 문구에 안 나오는 문자열)
// 부호 있는 수치에 lo~hi 배율을 적용해 "(a-b)" 범위 표기로 — 옵션 모아보기가 그대로 합산할 수 있는 형태
function scaleSignedRange(text, nLo, nHi) {
  return String(text).replace(/([+-])(\d+(?:\.\d+)?)/g, (mm, sg, num) => {
    const f = v => num.indexOf('.') < 0 ? Math.round(parseFloat(num) * v) : Math.round(parseFloat(num) * v * 100) / 100;
    const lo = f(nLo), hi = f(nHi);
    return sg + (lo === hi ? hi : '(' + lo + '-' + hi + ')');
  });
}
let _osKey = null, _osOut = null;
// 캐시는 복사본을 내준다 — 소비자가 그룹을 변형해도 캐시 원본이 오염되지 않게 (호출마다 새 객체라는 기존 의미론 유지)
function cloneOptGroups(list) {
  return list.map(g => {
    const c = Object.assign({}, g);
    c.vals = (g.vals || []).map(v => Object.assign({}, v, {list: (v.list || []).map(x => Object.assign({}, x))}));
    c.srcs = new Map(g.srcs);
    return c;
  });
}
// 옵션 줄 하나를 그룹 맵에 넣는다 — optSummary와 슬롯 전용 계산이 같은 규칙을 쓰도록 뺐다
function optAddLine(gs, src, e) {
  const {stem, vals, note} = optStemOf(e);   // 문구·값 분해는 optStemOf 하나가 소유한다
  // 단위가 다르면 다른 옵션 — "크리티컬 수치 +126"(고정)과 "+45%"(비율)는 합치면 안 된다
  const key = stem + OPT_SEP + vals.map(v => v.pc || '#').join('');
  let g = gs.get(key);
  if (!g) { g = {stem, note, vals: vals.map(v => ({lo: 0, hi: 0, pc: v.pc, mul: v.mul, par: v.par, list: []})), n: 0, srcs: new Map()}; gs.set(key, g); }
  if (note && !g.note) g.note = note;
  if (vals.length === g.vals.length) vals.forEach((v, i) => { g.vals[i].lo += v.lo; g.vals[i].hi += v.hi; g.vals[i].list.push({lo: v.lo, hi: v.hi}); });
  g.n++;
  const sk = src + OPT_SEP + e;
  g.srcs.set(sk, (g.srcs.get(sk) || 0) + 1);
}
// 줄 목록 → 옵션 그룹 (optSummary가 만드는 것과 같은 모양)
function optGroupsFrom(lines) {
  const gs = new Map();
  lines.forEach(([src, e]) => optAddLine(gs, src, plainText(e).replace(/[–—−~]/g, '-')));
  return [...gs.values()];
}
// 스킬 슬롯 하나에 딸린 옵션 줄 — 그 스킬 자신의 카드 옵션 + 연결된 보조의 수치.
// 둘 다 그 슬롯에만 걸리므로, 고른 스킬이 아닌 슬롯을 계산할 때도 따로 얹어야 한다
// (매버 충전 기준 스킬의 보조 "속결"이 충전 속도에 빠지던 문제)
function slotSkillLines(v) {
  const out = [];
  if (!v || !v.main) return out;
  // 오라에 꽂힌 보조는 오라 효과 계산이 이미 반영한다 (증폭·봉인 제어 등)
  const mi = findSkill(v.main);
  const isAura = mi >= 0 && (SKILLS[mi].tags || []).indexOf('오라') >= 0;
  if (!isAura) (v.sup || []).filter(Boolean).forEach(sp => {
    const g2 = supGrantLines(sp);
    if (!g2) return;
    g2.lines.forEach(t => out.push(['보조 · ' + g2.name + ' Lv' + g2.lvTxt, t]));
  });
  skillOwnLines(v.main).forEach(l => out.push(l));
  return out;
}
// ── 스킬 카드에 적힌 그 스킬 전용 옵션 ──
// 카드 details의 마지막 묶음에 "해당 스킬 공격 속도 추가 +100%"처럼 그 스킬만의 옵션이 있다.
// <br>로 나뉘어 있고, 지금까지 계산이 이걸 아예 안 봐서 휠윈드의 공속 +100%가 빠졌다.
// 그 스킬에만 걸리므로 다른 스킬 계산에 섞이면 안 된다 (슬롯별로 따로 얹는다)
function skillOwnLines(ref) {
  const i = ref ? findSkill(ref) : -1;
  if (i < 0) return [];
  const sk = SKILLS[i];
  const out = [];
  (sk.details || []).forEach(d => {
    String(d).split(/<br\s*\/?>/i).forEach(part => {
      const t = plainText(part).replace(/[–—−~]/g, '-').trim();
      if (!t || !/해당 스킬/.test(t)) return;       // 그 스킬 전용 문구만
      if (!/[+-]\s*[\d(]/.test(t)) return;          // 수치가 없는 설명문은 계산에 쓸 게 없다
      out.push(['스킬 · ' + sk.name, t]);
    });
  });
  return out;
}
let optSumBuilding = false; // 이 안에서 불린 계산 함수는 원본 줄을 본다 (자기 자신을 다시 부르면 순환)
// 옵션 문구 → 값을 뺀 문구(stem)와 값 목록. 같은 옵션을 묶는 열쇠이자 온오프의 키다.
// optSummary 밖에서도 필요하다 — 용어 툴팁에서 파생되는 줄(키워드 버프·발동 저주)은
// 목록을 만드는 중에 만들어지므로, 그때 "원본 줄이 직접 빠졌나"를 optSummary 없이 알아야 한다
function optStemOf(e) {
  const NUM = new RegExp(NUM_PCT, 'g');
  const vals = [];
  let note = ''; // "(신격 유효 한도: 1)" 같은 꼬리표 — 이것만 다른 같은 옵션이 갈리지 않게 떼어 둔다
  const stem = String(e).replace(NUM, (mm, sg, a, b, pc, off) => {
      // 별도·추가 수치는 곱연산 스택 (1.1^n). 보통 값 앞에 오지만 뒤에 오는 문구도 있다
      // ("크리티컬 발동 시, 대미지 +44% 추가" — 이것도 곱연산이다, 사용자 확인)
      const mul = /(별도|추가) ?$/.test(e.slice(0, off).trim()) ||
        /^\s*(별도|추가)/.test(e.slice(off + mm.length));
      const r = numRange(sg, a, b);
      vals.push({lo: r.lo, hi: r.hi, pc, mul, par: !sg}); // 부호 없이 괄호로 온 범위는 표시도 괄호 유지
      return OPT_PH; // 표시할 때 합산값으로 되살린다
    }).replace(/\s*\((?:신격 )?유효 한도[^)]*\)/g, m => { note = m.trim(); return ''; })
      .replace(/\s+/g, ' ').trim()
      // 등급·명칭 라벨([하위 재능]·[레전드 중위 재능] 등)만 다른 같은 옵션은 하나로 합친다 — 출처는 툴팁에서 구분
      // 안쪽에 '['가 없는 것만 라벨로 본다 — 값 자리표시자([[V]])가 맨 앞에 오는 옵션
      // ("(4-5) 개 이상의 오라 효과를 받고 있을 경우 …")에서 자리표시자를 라벨로 삼키던 문제
      .replace(/^(\[[^\][]{1,30}\] ?)+/, '').trim();
  return {stem, vals, note};
}
// 이 원본 줄을 사용자가 직접 뺐나 — 자동 제외(태그 불일치)는 부여 자체를 없애지 않으므로 보지 않는다
function optLineOff(e) {
  if (!optOff.size) return false;
  try { return optOff.has(optStemOf(e).stem); } catch (x) { return false; }
}
function optSummary() {
  const ck = calcCacheKeyLive();   // 직접 뺀 줄이 파생 줄(키워드 버프 등)에 영향을 주므로 온오프까지 키에 넣는다
  if (ck && _osKey === ck && _osOut) return cloneOptGroups(_osOut);
  optSumBuilding = true;
  const gs = new Map();
  const addLine = ([src, e]) => optAddLine(gs, src, e);
  presetOptionLines().forEach(addLine);
  // 고른 스킬에 연결된 보조 스킬의 수치 — "보조 대상 스킬 …"은 그 보조가 꽂힌 스킬에만 걸린다.
  // 수치는 문구가 아니라 레벨표에 있으므로(레벨이 오르면 값이 바뀐다) 실제 레벨의 값을 뽑아 옵션처럼 넣는다.
  // 오라 보조(오라 증폭·봉인 제어)는 이미 오라 효과 계산에 반영돼 있어 여기서 빼야 이중 계산이 안 된다.
  try {
    const sv = optSkill ? (preset.skills || {})[optSkill] : null;
    slotSkillLines(sv).forEach(l => addLine(l));
  } catch (e) {}
  // 키워드 버프(주술 과격 등) — 용어 툴팁의 효과를 "효과 +N%"만큼 키워 넣는다
  try { keywordBuffLines().forEach(addLine); } catch (e) {}
  // 장비가 발동하는 저주(위축 등) — 적이 받는 효과 = 내 대미지 배율
  try {
    grantedCurses().forEach(cu => {
      const src = '저주 발동 · ' + cu.name + ' Lv' + (cu.lvLo === cu.lvHi ? cu.lvHi : cu.lvLo + '~' + cu.lvHi);
      cu.lines.forEach(l => addLine([src, l.replace(/[–—−~]/g, '-')]));
    });
  } catch (e) {}
  // 장착 오라의 최종 적용 수치(오라 효과 배율 반영) — 대부분 대미지 별도·추가 분류로 들어간다
  try {
    auraSummary().auras.forEach(a => {
      const t = scaleSignedRange(auraBuffAtLevel(a.sk, a.lv ? a.lv.hi : 20), a.multLo, a.multHi);
      if (t) addLine(['오라 적용 · ' + a.sk.name, t.replace(/[–—−~]/g, '-')]);
    });
  } catch (e) {}
  // 장착한 버프·디버프 스킬(자극·저주·영약·실드·함성)의 효과 — 영약 스킬은 총 영약 효과 배율 적용.
  // 배율은 지금까지 모인 옵션으로 계산한다 (버프 줄 자체엔 "영약 스킬 효과" 옵션이 없어 순환하지 않는다)
  try {
    const buffs = buffSkillList();
    if (buffs.length) {
      const amp = potionEffect([...gs.values()]);
      buffs.forEach(b => {
        const src = '버프 · ' + b.name + (b.potion && amp.any ? ' (영약 효과 적용)' : '');
        b.lines.forEach(l => {
          const eff = b.potion && amp.any ? ampPotionText(l, amp.lo) : l;
          addLine([src, eff.replace(/[–—−~]/g, '-')]);
        });
      });
    }
  } catch (e) {}
  optSumBuilding = false;
  _osOut = [...gs.values()]; _osKey = ck;
  return cloneOptGroups(_osOut);
}
const OPT_SECS =['스킬 레벨', '대미지 증가', '대미지 별도·추가', '빙결', '오라', '버프·디버프 스킬', '크리티컬', '영약 효과', '공격·시전 속도', '매직 버스트', '이동 속도', '저항', 'HP·MP·방어', '축복', '기타 수치', '기타 옵션'];
function optSection(g) {
  const t = g.stem;
  if (CRIT_LUCKY_RE.test(t)) return '크리티컬'; // 행운은 수치가 없지만 크리 계산에 쓰인다
  if (/받[은는] [가-힣 ]*대미지의 .*대미지로 전환/.test(t)) return '저항'; // 수치가 부호 없이 와도(45%) 저항 판정에 쓰인다
  // 빙결 판(최대 빙결·빙결 효과)은 따로 모아 냉기 별도 대미지로 환산한다. 판정을 이 두 문구로만
  // 좁혀서 "빙결된 적에게 대미지 +N%" 같은 조건부 대미지 옵션은 대미지 분류에 그대로 남긴다
  if (/빙결 효과|최대 빙결/.test(t)) return '빙결';
  // 매직 버스트는 따로 모은다 — 단 다른 스탯(대미지·이동 속도 등)을 같이 담은 줄은
  // 원래 분류를 지켜야 그쪽 합산에서 빠지지 않는다 (그런 줄은 optSections가 매버에도 함께 넣는다)
  if (/매직 버스트/.test(t) && !/대미지|이동 속도|HP|MP|저항|아머|회피|보호막|크리티컬/.test(t)) return '매직 버스트';
  // ── 값이 부호 없이 와서 자리표시자가 안 잡히는 줄들 ──
  // 여기 오면 합산에는 못 들어가지만, 최소한 제 분류에 놓아 '기타'에 쌓이지 않게 한다.
  // 값이 있는 줄까지 가져가면 안 되므로 반드시 이 분기 안에서만 판정한다
  if (!g.vals.length) {
    // 플랫(기본) 대미지 추가 ("지혜가 600 포인트 이상이면 냉기 대미지가 467 - 728 포인트 추가된다")
    if (/(물리|화염|냉기|번개|부식|원소)\s*대미지(?:가)?\s*\d+(?:\.\d+)?\s*[-~–—−]\s*\d+(?:\.\d+)?\s*포인트\s*추가/.test(t)) return '대미지 증가';
    if (/(최대 )?(보호막|HP|MP|아머|회피)/.test(t) && /\d/.test(t)) return 'HP·MP·방어'; // 오라 적용 줄
    if (/^\d+(\.\d+)?\s*크리티컬$/.test(t)) return '크리티컬';                        // 무기 베이스 크리 수치
    if (/^\d+(\.\d+)?\s*(공격|시전) 속도$/.test(t)) return '공격·시전 속도';           // 무기 베이스 공속
    if (/레벨(?:의)? [가-힣: ]+[을를]? ?보유한다/.test(t)) return '오라';                   // 장비가 부여하는 오라
    if (/레벨 [가-힣 ]*저주를 발동한다|[가-힣]+[을를] 부여한다/.test(t)) return '버프·디버프 스킬';
    if (/영약 스킬|약병/.test(t)) return '영약 효과';
    return '기타 옵션';
  }
  if (/스킬 레벨/.test(t)) return '스킬 레벨';
  if (/(?<![가-힣])(?<!적이 )(?<!적들이 )(?<!타깃이 )(?<!대상이 )받는 [가-힣 ]*대미지/.test(t)) return 'HP·MP·방어'; // "받는 원소대미지 추가 -25%" 등은 생존 옵션 ("적이 받는"은 내 딜이라 제외)
  // 축복 지속 시간만 있는 줄은 축복으로. 다른 스탯을 같이 담은 줄은 그쪽 분류를 지킨다
  // ("집요한 축복 지속 시간 +30% 집요한 축복 보유 시, 시전 속도 +12%" → 공격·시전 속도)
  if (/축복 (최대 )?중첩|축복 (중첩 )?1회당/.test(t)) return '축복'; // "집요한 축복 1회당"(중첩 생략형)도 포함
  if (/축복 지속 시간/.test(t) && !/속도|대미지|저항|HP|MP|보호막|크리티컬/.test(t)) return '축복';
  if (/^(힘|민첩|지혜)( |$)|[ ](힘|민첩|지혜)( |$)|모든 속성/.test(t)) return 'HP·MP·방어'; // 기본 속성 — 기본 정보와 같은 묶음
  if (/오라|MP 봉인 보상/.test(t)) return '오라';
  if (CRIT_LUCKY_RE.test(t)) return '크리티컬'; // 수치가 없어도 크리 계산에 쓰이는 옵션
  if (/크리티컬/.test(t)) return '크리티컬';
  if (/영약 스킬 효과/.test(t)) return '영약 효과'; // 지속 시간·아마란스(스탯 참조)도 함께 모은다
  if (/대미지 (별도|추가)|대미지가 .{0,8}(별도|추가)|대미지 \[\[V\]\] ?(별도|추가)/.test(t)) return '대미지 별도·추가';
  if (/대미지/.test(t)) return '대미지 증가';
  if (/이동 속도/.test(t)) return '이동 속도';
  if (/속도/.test(t)) return '공격·시전 속도';
  if (/저항/.test(t)) return '저항';
  // "방어 수치"는 아머·회피·보호막의 총합을 가리키는 용어다 (게임 내 설명)
  if (/HP|MP|생명|마나|보호막|실드|아머|회피|방어 수치/.test(t)) return 'HP·MP·방어';
  return '기타 수치';
}
// ── 대상 스킬 선택: 고른 액티브 스킬의 태그에 맞는 옵션만 계산에 넣는다 ──
// 옵션 문구는 태그 이름을 그대로 쓰지만("주술 대미지 +30%") 다의적인 말이 많아서
// ('공격 속도'·'지속 시간'·'영향 범위') "태그 + 대미지/스킬" 형태일 때만 그 태그 전용으로 본다.
// 태그 목록은 스킬 데이터에서 뽑으므로 게임이 바뀌어도 따라간다.
let SKILL_TAG_RE = null;
function skillTagRe() {
  if (SKILL_TAG_RE) return SKILL_TAG_RE;
  const tags = [...new Set(SKILLS.filter(s => s.kind === '액티브').flatMap(s => s.tags || []))]
    .sort((a, b) => b.length - a.length); // 긴 것 먼저 ('위치 이동'이 '이동'에 먹히지 않게)
  SKILL_TAG_RE = new RegExp('(' + tags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ') ?(?:대미지|스킬)');
  return SKILL_TAG_RE;
}
// 태그로 가를 수 없는 문구 — 대미지 타입을 바꾸거나(전환) 피격·면역을 말하는 옵션은
// 스킬 태그가 달라도 그 빌드의 핵심일 수 있다 ("물리 대미지 100%를 냉기 대미지로 전환").
// 플랫(기본) 대미지 추가는 그 속성 스킬 전용이 아니다 — "주술에 화염 대미지 11-19 포인트 추가"는
// 냉기 주술로 때려도 화염분이 함께 들어간다 (14번 인게임 "주술에 화염 기본 대미지 추가 15" 실측).
// 여기서 속성을 요구 태그로 읽으면 다른 속성 스킬에서 통째로 빠진다
const TAG_SKIP = /전환|면역|(?<![가-힣])(?<!적이 )(?<!적들이 )(?<!타깃이 )(?<!대상이 )받[는은](?! ?(?:적|타깃|대상))|저항|대미지 [\d(].*포인트 추가/;
// 이 옵션이 요구하는 스킬 태그 (없으면 모든 스킬에 공통으로 적용되는 옵션)
function optTagReq(stem) {
  if (TAG_SKIP.test(stem)) return [];
  const re = new RegExp(skillTagRe().source, 'g');
  const out = new Set();
  let m;
  while ((m = re.exec(stem))) out.add(m[1]);
  return [...out];
}
// 옵션 줄을 눌러 계산에 넣고 뺀다 — 자동 태그 판정이 애매한 옵션을 직접 바로잡는 장치.
// 문구를 키로 쓰므로 빌드가 달라도 같은 판단이 이어진다. 이 브라우저에만 저장한다.
const OPTPICK_KEY = 'mtob_optpick';
let optOff = new Set(), optOn = new Set(); // 직접 뺀 것 / 자동 제외를 직접 되살린 것
try {
  const j = JSON.parse(localStorage.getItem(OPTPICK_KEY) || '{}');
  optOff = new Set(j.off || []);
  optOn = new Set(j.on || []);
} catch (e) {}
function optPickSave() {
  try { localStorage.setItem(OPTPICK_KEY, JSON.stringify({off: [...optOff], on: [...optOn]})); } catch (e) {}
}
function optToggleRow(key, autoOff) {
  const on = !(optOff.has(key) || (autoOff && !optOn.has(key))); // 지금 계산에 들어가 있나
  optOff.delete(key); optOn.delete(key);
  if (on) { if (!autoOff) optOff.add(key); }      // 넣고 있었으면 뺀다 (자동 제외였다면 원래대로)
  else if (autoOff) optOn.add(key);               // 자동으로 빠진 걸 되살린다
  optPickSave();
  renderOptSum();
}
function optPickReset() { optOff.clear(); optOn.clear(); optPickSave(); renderOptSum(); }
// 스킬을 들고 있으면 그 효과가 빌드 전체에 걸리는 버프기 태그 (대상 스킬 태그와 별개로 계산에 넣는다)
const BUFF_TAGS = ['영약', '자극', '위치 이동'];
let optSkill = ''; // 선택한 액티브 슬롯 id ('' = 전체, 태그 필터 없음)
let optShowOff = false; // 태그가 안 맞아 빠진 옵션도 보여줄지 (판정을 눈으로 확인할 수 있게)
function optSkillPick(id) { optSkill = optSkill === id ? '' : id; optShowOff = false; renderOptSum(); }
function optToggleOff() { optShowOff = !optShowOff; renderOptSum(); }
// 선택한 스킬의 태그 집합 (보조 스킬 태그도 함께 — 보조가 스킬에 태그를 더한다)
// 대상 스킬의 유효 태그 — 스킬 검색(findSkill)이 여러 번 들어가 비싸다.
// 옵션 줄마다 부르면(130줄 × 여러 함수) 급격히 느려져 캐시한다 (실측: 이것 때문에 테스트가 2분→20분)
let _stKey = null, _stOut = null;
function optSkillTags() {
  // 키는 optSummary가 이미 만들어 둔 것(_osKey)을 쓴다 — 여기서 calcCacheKey를 부르면
  // 호출마다 preset을 stringify하게 되고, 그 비용이 이 캐시가 아끼는 것보다 크다.
  // optIsOff는 항상 optSummary()가 돌려준 그룹에 대해 불리므로 _osKey는 그 시점 기준으로 맞다.
  // 아직 한 번도 안 만들어졌을 때만 직접 계산한다
  const _ck = _osKey != null ? _osKey : calcCacheKey();
  if (_ck && _stKey === _ck) return _stOut;
  const _r = optSkillTagsRaw();
  _stOut = _r; _stKey = _ck;
  return _r;
}
function optSkillTagsRaw() {
  if (!optSkill) return null;
  return skillTagSetOf((preset.skills || {})[optSkill]);
}
// 이 스킬 슬롯의 유효 태그 집합 (본체 + 보조 + 버프기 태그 + 전환된 속성).
// 대상 스킬뿐 아니라 매버 충전을 돌리는 스킬에도 써야 한다 — 충전율은 그 스킬의 시전 속도로 정해지므로
// 태그 판정도 그 스킬 기준이어야 맞다 (채널링 전용 옵션이 대상 스킬 기준으로는 빠진다)
function skillTagSetOf(v) {
  if (!v || !v.main) return null;
  const out = new Set();
  [v.main, ...(v.sup || []).filter(Boolean)].forEach(ref => {
    const i = findSkill(ref);
    if (i >= 0) (SKILLS[i].tags || []).forEach(t => out.add(t));
  });
  // 버프기 성격의 태그는 그 스킬을 들고만 있으면 빌드 전체에 걸린다 (사용자 규칙) —
  // 대상 스킬에 그 태그가 없어도 슬롯 어딘가에 있으면 계산에 넣는다.
  BUFF_TAGS.forEach(bt => {
    const has = SKILL_SLOTS.some(sl => {
      const sv = (preset.skills || {})[sl.id];
      if (!sv || !sv.main) return false;
      const i = findSkill(sv.main);
      return i >= 0 && (SKILLS[i].tags || []).indexOf(bt) >= 0;
    });
    if (has) out.add(bt);
  });
  // 대미지 전환 옵션이 있으면 전환된 속성도 유효 태그에 더한다. 게임 규칙(실측):
  // 전환되면 원본 속성의 증가 수치를 받고 전환된 속성의 증가 수치도 받는다 —
  // "물리 대미지 100%를 냉기 대미지로 전환"이면 물리 증가·냉기 증가가 모두 적용되므로 둘 다 남긴다.
  // '받은/받는 …'은 피격 쪽 전환이라 제외한다.
  try {
    presetOptionLines().forEach(([, e]) => {
      const re = /([가-힣]+) 대미지[^.]{0,16}?([가-힣]+) 대미지로 전환/g;
      let m;
      while ((m = re.exec(e))) {
        if (/받[은는] *$/.test(e.slice(0, m.index + m[0].indexOf(m[1])))) continue;
        if (out.has(m[1]) && !out.has(m[2])) out.add(m[2]);
      }
    });
  } catch (err) {}
  return out;
}
// 요약이 있는 분류는 근거 옵션 줄을 접어 둔다 — 결과만 보이는 편이 읽기 쉽다
const OPT_FOLD = ['크리티컬', '영약 효과', '공격·시전 속도', '매직 버스트', '이동 속도', '저항', '축복', '대미지 증가', '대미지 별도·추가', '빙결', 'HP·MP·방어'];
let optDetail = {};
function optToggleDetail(c) { optDetail[c] = !optDetail[c]; renderOptSum(); }
let optTab = '전체';
function optTabPick(c) { optTab = c; renderOptSum(); }
// 대분류 탭: 세부 분류(OPT_SECS)를 공격/생존/기타로 묶는다
const OPT_TABS = {
  '대미지': ['스킬 레벨', '대미지 증가', '대미지 별도·추가', '빙결', '크리티컬', '매직 버스트'],
  '생존': ['저항', 'HP·MP·방어'],
  '기타': ['오라', '버프·디버프 스킬', '영약 효과', '공격·시전 속도', '이동 속도', '축복', '기타 수치', '기타 옵션'],
};
function optTabOf(sec) { return Object.keys(OPT_TABS).find(t => OPT_TABS[t].indexOf(sec) >= 0) || '기타'; }
// 딜 스킬(공격·주술)인가 — 자극·영약·저주 같은 유틸 스킬에는 대미지 옵션이 의미가 없어 아예 뺀다
const DMG_SECS = ['대미지 증가', '대미지 별도·추가', '빙결', '크리티컬', '매직 버스트'];
// ── 빙결 (게임 내 설명 기준) ──
// 기본 빙결 10 포인트 · 빙결 1 포인트마다 적이 받는 냉기 대미지 별도 +1% · 100 포인트 초과 시 동결.
// "빙결 효과 +N%"는 포인트당 효과를 키운다 → 냉기 별도 = 최대 빙결 × 1% × (1 + 빙결 효과).
// 14번 실측 대조: 최대 빙결 10+96=106 · 빙결 효과 56+40=96% (인게임 106 / 96% 일치)
// ── 기본 속성(힘·민첩·지혜) → 별도 대미지 ──
// 게임 내 설명: "지혜 1포인트 당, 메인 속성에 지혜가 포함된 스킬의 대미지가 0.5% 별도 추가"
// 메인 속성이 둘이면 두 스탯을 합쳐서 계산한다 (힘 100 + 민첩 100 = 200 → 별도 +100%).
// 이 게임은 레벨업으로 기본 속성을 주지 않으므로(재능 포인트·HP/MP만) 옵션 합산분이 곧 총 스탯이다
const STAT_DMG_PER = 0.5; // STAT_KEY(힘·민첩·지혜 → 내부 키)는 아래 스탯 참조형 계산과 공용
function skillMainStats(sk) { // 스킬 카드의 "메인 속성:" 줄 → ['지혜'] 같은 목록
  const i = sk ? findSkill(sk) : -1;
  if (i < 0) return null;
  const row = (SKILLS[i].stats || []).find(p => /메인 속성/.test(p[0]));
  if (!row) return null;
  const out = String(row[1]).split(/[,·\/\s]+/).map(x => x.trim()).filter(x => STAT_KEY[x]);
  return out.length ? out : null;
}
function statDmgSummary(entries, mains) {
  if (!mains || !mains.length) return null;
  const rs = resistSummaryOf(entries);
  const rows = [];
  let lo = 0, hi = 0;
  mains.forEach(nm => {
    const st = rs[STAT_KEY[nm]];
    if (!st) return;
    const a = st.flat.min * (1 + st.pct.min / 100), b = st.flat.max * (1 + st.pct.max / 100);
    lo += a; hi += b;
    rows.push(`${nm} ${Math.round(a)}${Math.round(a) !== Math.round(b) ? '~' + Math.round(b) : ''}` +
      ` (${Math.round(st.flat.min)} · +${Math.round(st.pct.min)}%)`);
  });
  if (!lo && !hi) return null;
  return {stat: {lo, hi}, dmgLo: lo * STAT_DMG_PER, dmgHi: hi * STAT_DMG_PER, rows, mains};
}
const FREEZE_BASE = 10, FREEZE_FROZEN = 100;
// ── 중복 발동 (아이스링 계열) ──
// 숭고 보조가 "적 적중 시 … 확률은 적 처치 후 발동 확률의 N% 이다"로 처치 조건을 적중 조건으로
// 옮겨준다. 허수아비는 죽지 않아 처치 발동은 원래 무의미한데, 이 보조가 있으면 때릴 때마다
// 걸린다. 확률은 스킬 자체의 처치 발동 확률 + 부귀의 "최대 빙결 +1 당 N%"로 계산한다.
// 연쇄는 게임이 막는다 ("얼음 고리 하나당 1번만", "발동한 아이스링은 다시 발동하지 않는다") → 최대 ×2.
function dupProcSummary(entries, sv) {
  const out = {mul: 1, pct: 0, rows: []};
  if (!sv || !sv.main) return out;
  const textOf = ref => {
    const i = ref ? findSkill(ref) : -1;
    if (i < 0) return '';
    const sk = SKILLS[i];
    return [...(sk.desc || []), ...(sk.details || [])].map(t => plainText(String(t))).join(' ');
  };
  const supText = (sv.sup || []).filter(Boolean).map(textOf).join(' ');
  // 이 장치를 켜 주는 보조가 없으면 처치 발동은 허수아비에 걸리지 않는다 — 배율 없음
  const gate = /적 적중 시[^.]*발동 확률의\s*(\d+(?:\.\d+)?)\s*%/.exec(supText);
  if (!gate) return out;
  const mainText = textOf(sv.main);
  const base = /적(?:을)? ?처치[^.]*?(\d+(?:\.\d+)?)\s*%\s*(?:의)?\s*확률/.exec(mainText)
            || /적(?:을)? ?처치[^.]*?\+(\d+(?:\.\d+)?)\s*%\s*확률/.exec(mainText);
  const perFz = /최대 빙결 \+1 당[^.]*?발동 확률\s*(\d+(?:\.\d+)?)\s*%/.exec(supText);
  const fz = freezeSummary(entries);
  const basePct = base ? parseFloat(base[1]) : 0;
  const fzPct = perFz ? parseFloat(perFz[1]) * fz.max.hi : 0;
  const raw = basePct + fzPct;
  const eff = Math.min(100, raw) * (parseFloat(gate[1]) / 100); // 보조가 옮겨주는 비율(보통 100%)
  if (eff <= 0) return out;
  out.pct = eff;
  out.mul = 1 + eff / 100;
  out.rows.push(`스킬 자체 처치 발동 ${basePct}%` + (perFz ? ` + 최대 빙결 ${fz.max.hi} × ${perFz[1]}% = ${Math.round(fzPct * 10) / 10}%` : ''));
  out.rows.push(`합계 ${Math.round(raw * 10) / 10}%` + (raw > 100 ? ' → 100%로 자름 (확률 상한)' : '') +
    (parseFloat(gate[1]) !== 100 ? ` × 보조 전환 ${gate[1]}%` : ''));
  out.rows.push(`적중 1회당 ${Math.round(eff * 10) / 10}% 확률로 1개 더 생성 → 발동 횟수 ×${Math.round(out.mul * 1000) / 1000}`);
  out.rows.push('연쇄는 없다 — 이 효과로 생긴 것은 다시 발동하지 않는다 (게임 설명)');
  return out;
}
function freezeSummary(entries) {
  const out = {max: {lo: FREEZE_BASE, hi: FREEZE_BASE, rows: []}, eff: {lo: 0, hi: 0, rows: []}, any: false};
  entries.forEach(g => {
    const isMax = /최대 빙결/.test(g.stem), isEff = /빙결 효과/.test(g.stem);
    if (!isMax && !isEff) return;
    out.any = true;
    const tgt = isMax ? out.max : out.eff;
    g.vals.forEach(v => {
      if (isMax === !!v.pc) return; // 최대 빙결은 플랫 수치, 빙결 효과는 % — 서로의 값을 삼키지 않게
      tgt.lo += v.lo; tgt.hi += v.hi;
    });
    [...g.srcs.keys()].forEach(sk => {
      const i = sk.indexOf(OPT_SEP);
      tgt.rows.push('[' + sk.slice(0, i) + '] ' + sk.slice(i + OPT_SEP.length));
    });
  });
  // 풀스택(최대 빙결) 기준 냉기 별도 대미지 — 적에게 걸리는 효과라 냉기 대미지에만 붙는다
  out.dmgLo = Math.round(out.max.lo * (1 + out.eff.lo / 100) * 10) / 10;
  out.dmgHi = Math.round(out.max.hi * (1 + out.eff.hi / 100) * 10) / 10;
  out.frozen = out.max.lo > FREEZE_FROZEN;
  return out;
}
function optIsDealer(tags) { return !tags || tags.has('공격') || tags.has('주술'); }
// 공·시속과 이속이 한 옵션에 같이 있으면 두 섹션에 모두 보여준다 (각 섹션에서 무관한 부분은 음영)
function optSections(g) {
  const c = optSection(g);
  let cs = [c];
  if ((c === '이동 속도' || c === '공격·시전 속도') &&
      /이동 속도/.test(g.stem) && /속도/.test(g.stem.replace(/이동 속도/g, ''))) cs = ['공격·시전 속도', '이동 속도'];
  // 매직 버스트를 함께 말하는 줄은 매버 섹션에도 보여준다 (본 분류의 합산은 그대로 유지)
  if (cs.indexOf('매직 버스트') < 0 && /매직 버스트/.test(g.stem)) cs = [...cs, '매직 버스트'];
  // 버프기에서 온 줄은 전용 섹션에도 함께 — 같은 그룹(같은 끄기 키)이라 여기서 끄면 본 분류에서도 꺼진다
  if ([...g.srcs.keys()].some(k => k.startsWith('버프 · ') || k.startsWith('저주 발동 · '))) cs = ['버프·디버프 스킬', ...cs];
  return cs;
}
// ── 크리티컬 확률 ──
// 게임 규칙(사용자 확인): 기본 수치 500에서 시작한다(공격·주술 공통).
//   "해당 장비 … 크리티컬 수치 ±N%"는 그 무기의 기본 수치 자체를 보정한다 (500 → 750)
//   고정 "+N"은 기본 수치에 더하고, 비율 "+N%"는 전부 합한 뒤 (1 + 합)으로 곱한다
//   확률(%) = 보정된 기본 × (1 + 비율 합) ÷ 100
// 소환체·보초병처럼 내 크리가 아닌 것은 세지 않는다.
const CRIT_BASE = 500;
// 전의 — 게임 기본 규칙(사용자 제공):
//   전의 1포인트당 공격·주술 크리티컬 수치 +2%, 기본 상한 100포인트.
//   이 효과는 "전의 효과 +N%" 옵션의 영향을 받는다(추가 기본 효과도 마찬가지).
//   "전의를 N 포인트 고정 보유한다"는 상한을 넘겨 확정 보유하게 하는 옵션이다.
// 계산은 전의를 가득 채운 상태(상한) 기준이다 — 실제 전투에서는 쌓는 중일 수 있다.
const WILL_MAX = 100, WILL_CRIT_PER = 2;
function willPower(entries) {
  let fixLo = 0, fixHi = 0, effLo = 0, effHi = 0, has = false;
  const rows = [];
  entries.forEach(g => {
    // 전의는 "전의 보유" 옵션을 챙겨야 돌아간다 (사용자 규칙).
    // "전의 보유 시 …"는 전의를 켜는 게 아니라 조건문이라 세지 않는다.
    if (/전의 보유(?! ?시)/.test(g.stem)) has = true;
    const m = /전의를 \(?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\)? ?포인트 고정 보유/.exec(g.stem);
    if (m) { // 부호가 없는 수치라 옵션 파서가 값으로 잡지 않는다 — 여기서 직접 읽는다
      const lo = parseFloat(m[1]), hi = parseFloat(m[2] || m[1]);
      if (lo > fixLo || hi > fixHi) rows.push('고정 보유 ' + (lo === hi ? lo : lo + '~' + hi) + '포인트');
      fixLo = Math.max(fixLo, lo); fixHi = Math.max(fixHi, hi); // 여러 개면 가장 큰 것
      return;
    }
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      if (!/전의 효과 $/.test(parts[i] || '') || v.pc !== '%') return;
      effLo += v.lo; effHi += v.hi;
      rows.push('전의 효과 ' + fmtRange(v));
    });
  });
  if (!has) return {has: false, pLo: 0, pHi: 0, effLo: 0, effHi: 0, rows: [], critLo: 0, critHi: 0};
  const pLo = Math.max(WILL_MAX, fixLo), pHi = Math.max(WILL_MAX, fixHi);
  return {has: true, pLo, pHi, effLo, effHi, rows,
          critLo: pLo * WILL_CRIT_PER * (1 + effLo / 100),
          critHi: pHi * WILL_CRIT_PER * (1 + effHi / 100)};
}
// "자신과 소환체가 …"는 자신에게도 적용되므로 빼지 않는다 (샤프 리프 그래스 등)
const CRIT_SKIP = /(?<!자신과 )(?:소환체|보초병|마령)|(?<![가-힣])(?<!적이 )(?<!적들이 )(?<!타깃이 )(?<!대상이 )받는(?! ?(?:적|타깃|대상))|적의/;
// 행운(주사위를 두 번 굴려 더 좋은 쪽을 택한다) → 성공 확률이 1-(1-p)^2 로 오른다.
// 12번 로그 실측으로 확인: 기본 32.74% → 행운 54.76% (인게임 표기와 소수점까지 일치).
// 반대로 불행은 두 번 굴려 나쁜 쪽이라 p^2 이지만, 크리티컬 불행 옵션은 아직 확인된 게 없어 다루지 않는다.
function luckyChance(p) { return (1 - Math.pow(1 - p / 100, 2)) * 100; }
// 크리티컬 행운이 걸려 있나 (석판 [요행], 레전드 [폭군의 기세] 등).
// 계산에 들어간 옵션 목록을 받아 판정한다 — 줄을 눌러 빼면 확률에서도 빠져야 한다.
const CRIT_LUCKY_RE = /행운\s*크리티컬|크리티컬\s*행운/;
function hasCritLucky(entries) {
  const list = entries || [];
  return list.some(g => CRIT_LUCKY_RE.test(g.stem) && !CRIT_SKIP.test(g.stem));
}
// 크리티컬 수치 판정 — 무기 보정 / 고정 / 비율 중 어디로 갈 값인지, 어느 종류(공격·주술)에 붙는지.
// kind와 무관하게 판정하고 걸러내는 건 critChance가 한다 (감사에서 "이 줄이 어디에 붙는지" 보이게)
function critRatingClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  const m = /([가-힣 ]*?)크리티컬 수치 $/.exec(pre);
  if (!m) return {ok: false, why: '크리티컬 수치 옵션이 아님'};
  const who = m[1]; // "해당 장비 공격 " · "주술 " · "공격 및 주술 " · "" (공통)
  if (CRIT_SKIP.test(who)) return {ok: false, why: '소환체·피격·적의 크리'};
  // 종류 수식어가 붙었으면 그 종류에만 (수식어가 없으면 공격·주술 공통)
  const kinds = /공격|주술/.test(who) ? ['공격', '주술'].filter(k => who.indexOf(k) >= 0) : ['공격', '주술'];
  const weapon = who.indexOf('해당 장비') >= 0;
  return {ok: true, kinds, label: (who.trim() || '공통') + ' 크리티컬 수치',
          // 무기 보정은 기본 수치 자체를 키우고(500 → 750), 나머지는 %면 비율·아니면 고정
          bucket: weapon ? '무기' : (v.pc === '%' ? '비율' : '고정')};
}
function critChance(entries, kind, will) {
  const acc = {wLo: 0, wHi: 0, fLo: 0, fHi: 0, pLo: 0, pHi: 0, rows: []};
  if (will && will.has) { // 전의는 공격·주술 양쪽 크리티컬 수치를 올린다 (비율 합에 더한다)
    acc.pLo += will.critLo; acc.pHi += will.critHi;
    acc.rows.push('비율 전의 ' + (will.pLo === will.pHi ? will.pLo : will.pLo + '~' + will.pHi) + '포인트 × ' +
      WILL_CRIT_PER + '%' + (will.effLo || will.effHi ? ' × 전의 효과 ' + fmtRange({lo: will.effLo, hi: will.effHi, pc: '%'}) : '') +
      ' = ' + fmtRange({lo: Math.round(will.critLo * 10) / 10, hi: Math.round(will.critHi * 10) / 10, pc: '%'}));
  }
  const BUCKET = {'무기': ['wLo', 'wHi', '무기 보정 '], '비율': ['pLo', 'pHi', '비율 '], '고정': ['fLo', 'fHi', '고정 ']};
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = critRatingClassify(g, i, v, parts);
      if (!r.ok || r.kinds.indexOf(kind) < 0) return;
      const [kLo, kHi, pfx] = BUCKET[r.bucket];
      acc[kLo] += v.lo; acc[kHi] += v.hi;
      acc.rows.push(pfx + r.label + ' ' + fmtRange(v));
    });
  });
  const baseLo = CRIT_BASE * (1 + acc.wLo / 100) + acc.fLo;
  const baseHi = CRIT_BASE * (1 + acc.wHi / 100) + acc.fHi;
  const rawLo = Math.min(100, baseLo * (1 + acc.pLo / 100) / 100);
  const rawHi = Math.min(100, baseHi * (1 + acc.pHi / 100) / 100);
  const lucky = hasCritLucky(entries);
  return {lo: lucky ? luckyChance(rawLo) : rawLo, hi: lucky ? luckyChance(rawHi) : rawHi,
          rawLo, rawHi, lucky, baseLo, baseHi, acc};
}
// ── 영약 스킬 효과 합산 ──
// "영약 스킬 효과 +N%"는 합연산, "영약 스킬 효과 추가 +N%"는 별도(곱연산).
// 아마란스 감로("최대 HP 또는 최대 MP 보너스의 P%가 영약 스킬 효과에도 적용, 최대치 +C%")는
// 최대 HP·MP의 % 보너스 중 큰 쪽 × P%를 상한 C로 잘라 합연산에 더한다 (다른 스탯 참조형).
// 영약 효과 판정 — 한 값이 셋 중 무엇인지: 최대 HP·MP 보너스(아마란스 입력) / 영약 효과 합연산 /
// 영약 효과 별도(곱연산). 중첩형("시전마다 +1.5%, 최대 12회 중첩")의 스택 수도 여기서 센다
function potionClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  // 최대 HP·MP % 보너스 수집 — "+330" 같은 고정치는 보너스가 아니다.
  // "최대 HP와 최대 MP +26%"처럼 한 값이 둘 다 올리는 문구도 있다
  if (v.pc === '%' && v.lo >= 0) {
    const hm = /최대 HP(와 최대 MP)? $|최대 MP $/.exec(pre);
    if (hm) {
      const both = !!hm[1];
      const onlyMp = /최대 MP $/.test(pre) && !both;
      return {ok: true, kind: 'stat', hp: !onlyMp, mp: onlyMp || both};
    }
  }
  const m = /영약 스킬 효과( 추가)? $/.exec(pre);
  if (!m || v.pc !== '%') return {ok: false, why: '영약 효과 옵션이 아님'};
  // 중첩형은 풀중첩으로 계산 — 줄을 눌러 뺄 수 있다
  const nx = g.vals[i + 1];
  const stack = /^[ ,]*최대 $/.test(parts[i + 1] || '') && /^ ?회 중첩/.test(parts[i + 2] || '') && nx ? nx.lo : 1;
  return {ok: true, kind: 'eff', op: m[1] ? 'mul' : 'add', stack,
          label: (pre.length > 34 ? '…' : '') + pre.slice(-34).trim(),
          list: (v.list && v.list.length) ? v.list : [{lo: v.lo, hi: v.hi}]};
}
function potionEffect(entries) {
  const acc = {sLo: 0, sHi: 0, rows: [], mul: []};
  let ama = null; // {p(적용 비율 — 부호가 없어 수치 자리로 안 뽑히니 문구에서 직접 읽는다), cap}
  const hp = {lo: 0, hi: 0}, mp = {lo: 0, hi: 0}; // 최대 HP·MP의 % 보너스 (아마란스 입력)
  entries.forEach(g => {
    // 아마란스 감로 — 스탯 참조형이라 통째로 따로 처리 (vals[0] = 최대치 C%)
    const am = /최대 HP 또는 최대 MP 보너스의 ([\d.]+)% 가 영약 스킬 효과에도/.exec(g.stem);
    if (am) { ama = {p: +am[1], cap: (g.vals || [])[0] || null}; return; }
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = potionClassify(g, i, v, parts);
      if (!r.ok) return;
      if (r.kind === 'stat') {
        if (r.hp) { hp.lo += v.lo; hp.hi += v.hi; }
        if (r.mp) { mp.lo += v.lo; mp.hi += v.hi; }
        return;
      }
      const eff = r.stack > 1 ? {lo: v.lo * r.stack, hi: v.hi * r.stack, pc: '%'} : v;
      if (r.op === 'mul') { // 추가 = 별도 곱연산 — 같은 옵션이 여러 장이면 장마다 따로 곱한다
        r.list.forEach(x => acc.mul.push(r.stack > 1 ? {lo: x.lo * r.stack, hi: x.hi * r.stack} : x));
        acc.rows.push('별도(곱연산) ' + r.label + ' ' + fmtRange(v) + (r.stack > 1 ? ' × ' + r.stack + '중첩' : '') +
          (r.list.length > 1 ? ' (장별 곱 ×' + r.list.length + ')' : ''));
      } else {
        acc.sLo += eff.lo; acc.sHi += eff.hi;
        acc.rows.push('합연산 ' + r.label + ' ' + fmtRange(v) + (r.stack > 1 ? ' × ' + r.stack + '중첩 = ' + fmtRange(eff) : ''));
      }
    });
  });
  if (ama) {
    const capLo = ama.cap ? ama.cap.lo : Infinity, capHi = ama.cap ? ama.cap.hi : Infinity;
    // 문구는 "HP 또는 MP"지만 실제로는 둘 다 적용된다(합산) — 인게임 실측으로 확정:
    // HP 41% + MP 26% = 67% × 120% = 80.4% → 상한 70%로 잘려 총 +511.8% = 인게임 512
    // (큰 쪽만 취하면 49.2%가 되어 총 471.5%로 어긋난다)
    const srcLo = hp.lo + mp.lo, srcHi = hp.hi + mp.hi;
    const addLo = Math.min(capLo, srcLo * ama.p / 100);
    const addHi = Math.min(capHi, srcHi * ama.p / 100);
    acc.sLo += addLo; acc.sHi += addHi;
    acc.rows.push('합연산 아마란스 감로: 최대 HP·MP 보너스 ' + fmtRange({lo: srcLo, hi: srcHi, pc: '%'}) +
      ' × ' + ama.p + '%' + (ama.cap ? ' (상한 ' + fmtRange(ama.cap) + ')' : '') +
      ' = ' + fmtRange({lo: Math.round(addLo * 10) / 10, hi: Math.round(addHi * 10) / 10, pc: '%'}));
    acc.ama = {addLo, addHi, srcLo, srcHi};
  }
  // 총 효과 = (1 + 합연산) × Π(1 + 별도) − 1
  const mulLo = acc.mul.reduce((x, v) => x * (1 + v.lo / 100), 1);
  const mulHi = acc.mul.reduce((x, v) => x * (1 + v.hi / 100), 1);
  return {acc,
    sumLo: acc.sLo, sumHi: acc.sHi, mulLo, mulHi,
    lo: ((1 + acc.sLo / 100) * mulLo - 1) * 100,
    hi: ((1 + acc.sHi / 100) * mulHi - 1) * 100,
    any: acc.rows.length > 0};
}
// ── 버프·디버프 스킬 (자극·저주·영약·실드·함성) ──
// 액티브 슬롯에 장착한 버프기가 주는 효과를 옵션처럼 계산에 넣는다 (사용자 요청).
// 효과는 줄 단위로 갈라 넣어 분류(공격·시전 속도 등)가 제대로 잡히게 한다.
// 수치는 세부(20레벨) 기준. 충전 진행도 문구(details[1])는 효과가 아니라 뺀다.
const BUFF_SKILL_TAGS = ['자극', '저주', '영약', '실드', '함성'];
// "이동 속도 +15%, 최대치 +150%" — 앞 효과로 얻을 수 있는 상한이라 고정이다
// (사용자 확인: 전갈 독침 에센스·질주 이슬). 영약 증폭·레벨 역산 어느 쪽도 이 수치는 건드리지 않는다.
// 콤마 뒤에 홀로 오는 "최대치"만 상한으로 본다 — "원소 저항 최대치 +4%"는 그 자체가 효과다
const FIXED_CAP_RE = /(?:^|[,，])\s*최대치\s*$/;
// 효과 수치 목록 — 부호나 %가 붙은 것만 (시간·횟수·"1/3/6/100" 나열 수치는 skip 표시).
// NUM_PCT는 부호 필수라 "받은 물리 대미지의 15%" 같은 무부호 퍼센트를 놓친다 (ampPotionText와 같은 규칙)
function effStatList(text) {
  const out = [];
  const re = /([+-]?)(\d+(?:\.\d+)?)(%?)/g;
  let m, last = 0;
  while ((m = re.exec(text || ''))) {
    const tail = text.slice(re.lastIndex), head = text.slice(0, m.index);
    const skip = (!m[3] && !m[1]) || /^\s*(초|회|개|미터|포인트|레벨|중첩|\/)/.test(tail) || /\/\s*$/.test(head)
      || FIXED_CAP_RE.test(head); // "최대치 +150%" — 그 스킬로 얻을 수 있는 상한이라 레벨·증폭과 무관
    out.push({label: auraStatKey(text.slice(last, m.index)), v: Math.abs(parseFloat(m[2])), skip});
    last = re.lastIndex;
  }
  return out;
}
// 1레벨·20레벨 두 문구의 수치 짝으로 실제 레벨 수치를 역산한 문구 (버프류 — 오라는 auraBuffAtLevel).
// factor = 20레벨 초과 구간의 성장 배속. 오라는 실측 0.53이지만 영약·자극류는 실측 전 —
// 1↔20레벨 기울기 그대로(1) 쓴다 (사용자 지시: 1/20렙 수치로 역산). 실측이 생기면 조정
function statTextAtLevel(oneText, twentyText, level, factor) {
  if (!level || level === 20 || !oneText || !twentyText) return twentyText;
  const one = effStatList(oneText).filter(x => !x.skip);
  const twenty = effStatList(twentyText);
  if (!one.length || !twenty.length) return twentyText;
  const pair = t => one.find(o => o.label && t.label &&
    (o.label === t.label || o.label.indexOf(t.label) >= 0 || t.label.indexOf(o.label) >= 0));
  let i = 0;
  return twentyText.replace(/([+-]?)(\d+(?:\.\d+)?)(%?)/g, (mm, sg, num, pc) => {
    const t = twenty[i++];
    if (!t || t.skip) return mm;
    const o = pair(t);
    if (!o || o.v === t.v) return mm; // 짝을 못 찾거나 성장하지 않는 항목(저항 최대치 +4%)은 그대로
    const step = (t.v - o.v) / 19;
    const r = Math.round(Math.abs(t.v + step * factor * (level - 20)) * 10) / 10;
    return sg + r + pc;
  });
}
// 버프류 스킬의 20레벨 기준 문구(details)를 실제 레벨 수치로
function buffTextAtLevel(s, level) {
  const twenty = plainText(String((s.details || s.desc || [])[0] || ''));
  const one = plainText(String((s.desc || [])[0] || ''));
  return statTextAtLevel(one, twenty, level, 1);
}
function buffSkillList() {
  const out = [];
  const bonuses = skillLvBonuses();
  SKILL_SLOTS.filter(sl => sl.group === 'a').forEach(sl => {
    const v = (preset.skills || {})[sl.id];
    if (!v || !v.main) return;
    const i = findSkill(v.main);
    if (i < 0) return;
    const sk = SKILLS[i];
    const tags = sk.tags || [];
    if (!BUFF_SKILL_TAGS.some(t => tags.includes(t))) return;
    // 실제 레벨 수치로 역산 — 영약·자극류는 40레벨까지 계속 성장한다 (기준 문구는 20레벨)
    const lv = skillLevelOf(v.main, sl.id === 'a1', bonuses);
    const lvHi = lv.base + lv.hi;
    const seg = raw => String(raw || '').split(/<br\/?>/i).map(x => plainText(x));
    const at = statTextAtLevel(seg((sk.desc || [])[0]).join('\n'),
                               seg((sk.details || sk.desc || [])[0]).join('\n'), lvHi, 1);
    // 효과 수치가 있는 줄만 — 머리말·지속 시간 문구는 소음. 부호 없는 퍼센트("최대 HP의 15%")도 효과 수치다
    const lines = at.split('\n')
      .filter(l => l && effStatList(l).some(x => !x.skip));
    out.push({name: sk.name, potion: tags.includes('영약'), lines, lv: lvHi});
  });
  return out;
}
// ── 키워드 버프 ("주술 과격을 획득한다. 주술 과격 효과 +26%") ──
// 용어 자체의 효과는 옵션 문구에 안 적혀 있고 용어 툴팁에만 있다
// (주술 과격 = "시전 속도와 주술 대미지가 별도로 7% 증가…"). 획득 옵션에 붙은
// "효과 +N%"만큼 키워 실제 수치를 낸다 — 14번 목걸이: 7% × 1.26 = 8.8%
// (인게임 "시전 속도 추가 보너스 9%"와 일치).
let TERM_DESC = null;
function termDescMap() {
  if (TERM_DESC) return TERM_DESC;
  TERM_DESC = {};
  (DB.rows || []).forEach(r => (r.tips || []).forEach(([term, i]) => {
    const d = TIPS[i];
    if (d && !TERM_DESC[term]) TERM_DESC[term] = plainText(String(d));
  }));
  // 정령 페이지의 용어 툴팁 — 승급 보상은 "스퀴드 익스플로젼을 획득한다"까지만 적고
  // 실제 수치(매버 적중 대미지 별도 +16%)는 이 툴팁에만 있다
  Object.entries(PACT_TIPS || {}).forEach(([term, d]) => {
    if (d && !TERM_DESC[term]) TERM_DESC[term] = plainText(String(d));
  });
  return TERM_DESC;
}
// 용어 설명 → 우리 파서가 읽는 문구로. 속도의 "별도"는 게임 표기상 "추가"다
function termEffectLines(desc, mul, term) {
  const out = [];
  // 설명 앞머리에 용어 이름이 한 번 더 붙는다 — 떼지 않으면 "주술 과격"의 '과'가 접속사로 잡힌다
  let txt = String(desc).trim();
  if (term && txt.indexOf(term) === 0) txt = txt.slice(term.length).trim();
  const push = (what, v) => {
    const n = Math.round(v * mul * 10) / 10;
    if (!isFinite(n) || !n) return;
    if (/쿨타임/.test(what)) return;                      // 쿨타임 회복은 우리가 세는 수치가 아니다
    if (/속도$/.test(what)) out.push(what + ' 추가 +' + n + '%');   // 속도의 "별도"는 게임 표기상 "추가"
    else if (/대미지$/.test(what)) out.push(what + ' 별도 +' + n + '%');
  };
  txt.split(/하고,|\.|,/).forEach(seg => {
    // "A와 B가 별도로 7% 증가" — 접속사 뒤에 한글이 이어질 때만 나눈다
    const m = /(.+?)(?:이|가)\s*별도로\s*(\d+(?:\.\d+)?)\s*%/.exec(seg);
    if (m) {
      const v = +m[2];
      m[1].split(/(?:와|과)(?=\s*[가-힣])/).forEach(part => {
        const w = part.trim();
        if (/(속도|대미지)$/.test(w)) push(w, v);
      });
      return;
    }
    const m2 = /([가-힣 ]+?)(?:이|가)\s*(?:별도로?\s*|추가\s*)?(\d+(?:\.\d+)?)\s*%\s*증가/.exec(seg);
    if (m2 && /(속도|대미지)$/.test(m2[1].trim())) { push(m2[1].trim(), +m2[2]); return; }
    // 이미 옵션 문구 형태로 적힌 설명 — 정령 용어가 이쪽이다
    // ("스퀴드 익스플로젼: 매직 버스트로 시전하는 스킬의 적중 대미지 별도 +16%, 10 초간 지속한다")
    const m3 = /^(.*?(?:대미지|속도))\s*(?:별도|추가|증가)?\s*\+(\d+(?:\.\d+)?)\s*%/.exec(seg.trim());
    if (m3) push(m3[1].trim(), +m3[2]);
  });
  return out;
}
function keywordBuffLines() {
  const out = [];
  const map = termDescMap();
  // 직접 뺀 줄은 부여도 증폭도 하지 않는다 — 줄을 눌러 빼면 이 버프도 같이 빠져야 한다.
  // optSummary를 만드는 중에 불리므로 liveOptionLines(optSummary 의존)는 쓸 수 없다
  const lines = presetOptionLines().filter(([, e]) => !optLineOff(e));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // "X 효과 +N%"는 X를 부여하는 줄과 다른 줄에 있을 수 있다 (정령 승급 보상은 줄이 나뉘어 있다).
  // 여러 곳에서 올려 주면 더해진다
  const ampOf = {};
  Object.keys(map).forEach(term => {
    const re = new RegExp(esc(term) + ' 효과 ([+-]?\\d+(?:\\.\\d+)?)\\s*%', 'g');
    lines.forEach(([, e]) => { let m; while ((m = re.exec(e))) ampOf[term] = (ampOf[term] || 0) + parseFloat(m[1]); });
  });
  Object.keys(map).forEach(term => {
    if (/[\u4e00-\u9fff]/.test(term)) return; // 미번역 중국어 용어는 한글명과 중복이다
    // 조사가 띄어져 있거나("스퀴드 익스플로젼 을 1회 획득한다") 횟수가 끼기도 한다
    const gr = new RegExp(esc(term) + '\\s*[을를]\\s*(?:\\d+\\s*회\\s*)?획득');
    // 부여 문구가 미번역 중국어로 남은 줄도 있다 ("你和召唤物拥有攻击激进 맹공 효과 +30%")
    const grCn = new RegExp('拥有[^.]{0,24}' + esc(term));
    const amp = ampOf[term] || 0;
    if (lines.some(([, e]) => gr.test(e) || grCn.test(e))) {
      // 같은 용어를 여러 출처가 부여해도 버프는 하나다 — 용어당 한 번만 낸다
      termEffectLines(map[term], 1 + amp / 100, term).forEach(l =>
        out.push(['키워드 · ' + term + (amp ? ' (효과 ' + (amp > 0 ? '+' : '') + amp + '%)' : ''), l]));
      return;
    }
    // 적에게 걸리는 디버프 — "연약을 부여한다" · "냉기 침투를 시전한다" · "적이 연약 보유".
    // 설명이 "받는 X 대미지 별도 +N%"라 그 접두를 떼면 곧 내 대미지 배율이다 (발동 저주와 같은 규칙).
    // 첫 타격 이후 계속 걸려 있으므로 상시로 본다
    const grDeb = new RegExp(esc(term) + '\\s*[을를]?\\s*(?:부여|시전)|적(?:이|들이|에게)[^.]{0,20}' + esc(term) + '\\s*[을를]?\\s*(?:보유|받는다)');
    if (!lines.some(([, e]) => grDeb.test(e))) return;
    termEffectLines(map[term], 1 + amp / 100, term).forEach(l => {
      if (!/^받는 /.test(l)) return;   // 내가 받는 쪽이 아니라 적이 받는 쪽만 (수치 없는 용어는 여기서 걸러진다)
      out.push(['적 디버프 · ' + term + (amp ? ' (효과 ' + (amp > 0 ? '+' : '') + amp + '%)' : ''), l.replace(/^받는 /, '')]);
    });
  });
  return out;
}
// 영약 충전 회복 — "영약 스킬이 N초마다 충전 진행도를 M 획득한다" 를 초당으로 환산해 합산
function potionChargeRate(entries) {
  let rate = 0;
  const rows = [];
  entries.forEach(g => {
    const re = /영약 스킬이 (\d+(?:\.\d+)?)초마다 충전 진행도를 (\d+(?:\.\d+)?) 획득/g;
    let m;
    while ((m = re.exec(g.stem))) {
      const per = (+m[2]) / Math.max(0.001, +m[1]) * Math.max(1, g.n || 1);
      rate += per;
      rows.push(stemLine(g) + (g.n > 1 ? ' ×' + g.n : '') + '  → 초당 ' + (Math.round(per * 100) / 100));
    }
  });
  return {rate: Math.round(rate * 100) / 100, rows};
}
// ── 장비가 발동하는 저주 ("적에게 대미지를 입히면 20 레벨 위축 저주를 발동한다") ──
// 저주는 적에게 걸리는 디버프지만 "적이 받는 대미지 별도"는 곧 내 대미지 배율이다.
// 발동 레벨(20)에도 스킬 레벨 옵션이 더해진다 (사용자 확인) — 값은 1↔20레벨 기울기로 역산
function grantedCurses() {
  const seen = new Map();
  presetOptionLines().filter(([, e]) => !optLineOff(e)).forEach(([src, e]) => {
    // "20 레벨 위축 저주를 발동한다" 외에 "적이 20 레벨의 불길 저주를 받는다" 형태도 있다
    const re = /(\d+) ?레벨의? ([가-힣 ]+?) 저주를 (?:발동한다|받는다)/g;
    let m;
    while ((m = re.exec(e))) {
      const nm = m[2].trim();
      if (seen.has(nm)) continue;
      const i = findSkill({name: nm, kind: '액티브'});
      if (i < 0) continue;
      const lv = grantedSkillLevel(nm, '액티브', +m[1], +m[1]);
      const at = buffTextAtLevel(SKILLS[i], lv.hi);
      // 수치 있는 효과 문장만. "저주 받은 적이 받는" 접두는 떼야 집계 파서가 내 배율로 읽는다
      const lines = at.split(/(?<=[.。])\s*/)
        .map(t => t.replace(/^(저주를? ?받은 )?적이 받는 /, '').trim())
        // "해당 스킬의 …"는 저주가 적에게 주는 효과가 아니라 저주 스킬 자신의 스탯이다
        .filter(t => t && !/^해당 스킬/.test(t) && effStatList(t).some(x => !x.skip));
      seen.set(nm, {name: nm, si: i, baseLv: +m[1], lvLo: lv.lo, lvHi: lv.hi, lines, item: src});
    }
  });
  return [...seen.values()];
}
// 이 빌드의 총 영약 효과(%) — 직접 뺀 옵션(optOff) 반영. 영약 스킬 표시용
function potionAmpPct() {
  try {
    const live = optSummary().filter(x => !optIsOff(x));
    const r = potionEffect(live);
    return {lo: r.lo, hi: r.hi, any: r.any};
  } catch (e) { return {lo: 0, hi: 0, any: false}; }
}
// 영약 스킬 효과 배율을 문구의 수치에 적용한 표시용 텍스트.
// "(영약 스킬 효과의 영향을 받지 않음)"이 붙은 문장과 시간·횟수(N 초·N 회)는 그대로 둔다.
function ampPotionText(text, ampPct) {
  const amp = 1 + ampPct / 100;
  return (text || '').split(/(?<=[.。])(?!\d)\s*/).map(sent => { // (?!\d) — 0.5 같은 소수점에서 쪼개지 않게
    if (/영향을 받지 않음/.test(sent)) return sent;
    return sent.replace(/([+-]?)(\d+(?:\.\d+)?)(%?)(\s*(?:초|회|개|미터|포인트|레벨|중첩)?)/g, (m, sg, num, pc, unit, off) => {
      if (/초|회|개|미터|레벨|중첩/.test(unit)) return m;   // 시간·횟수·거리는 효과량이 아니다
      if (!pc && !sg) return m;                              // 부호도 %도 없는 맨 숫자는 문맥 수치
      if (FIXED_CAP_RE.test(sent.slice(0, off))) return m;   // "최대치 +150%"는 그 스킬로 얻을 수 있는 상한 — 고정값
      const v = Math.round(parseFloat(num) * amp * 10) / 10;
      return (sg || '') + v + pc + unit;
    });
  }).join(' ');
}
const CRITDMG_BASE = 150;
const ELEMENTS = ['물리', '화염', '냉기', '번개', '부식', '원소'];
// 이 빌드가 한 속성으로만 때리는가 (극한의 프리징 등) — 그러면 그 속성 크리 대미지를 기본에 합친다
function lockedElement() {
  try {
    const line = liveOptionLines().find(([, e]) => /([가-힣]+) ?대미지만 입힐 수 있다/.test(e));
    if (!line) return null;
    const m = /([가-힣]+) ?대미지만 입힐 수 있다/.exec(line[1]);
    return m && ELEMENTS.indexOf(m[1]) >= 0 ? m[1] : null;
  } catch (e) { return null; }
}
// 크리티컬 대미지: 공통(수식어 없음) + 속성별. kind는 '공격'|'주술'.
// 크리티컬 대미지 판정 — 어느 종류(공격·주술)·어느 속성에 붙는지, 축복 중첩 배수는 몇인지
function critDamageClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  if (v.pc !== '%') return {ok: false, why: '%가 아닌 수치'};
  const m = /([가-힣 ,]*?)크리티컬 대미지 $/.exec(pre); // 쉼표 포함 — "…1회당, 크리티컬 대미지"
  if (!m) return {ok: false, why: '크리티컬 대미지 옵션이 아님'};
  const who = m[1];
  if (CRIT_SKIP.test(who)) return {ok: false, why: '소환체·피격·적의 크리'};
  const kinds = /공격|주술/.test(who) ? ['공격', '주술'].filter(k => who.indexOf(k) >= 0) : ['공격', '주술'];
  // 축복 중첩당 붙는 옵션은 최대 중첩만큼 곱한다 — 판정은 앞 문구 전체(pre)로 한다.
  // who는 한글만 캡처해서 "1회당"의 숫자에 잘려 "회당,"만 남는다 (그래서 배수가 안 걸렸다)
  const bm = /(강건한|집요한|황홀한) 축복 (?:중첩 )?1회당/.exec(pre);
  return {ok: true, kinds,
          stack: bm ? Math.max(0, (blessingMax()[bm[1] + ' 축복'] || {v: 0}).v) : 1,
          el: ELEMENTS.find(e => who.indexOf(e) >= 0) || null,
          label: (pre.replace(/\s*크리티컬 대미지\s*$/, '').replace(/[,·]\s*$/, '').trim() || '공통') + ' 크리티컬 대미지'};
}
// 크리티컬 대미지: 공통(수식어 없음) + 속성별. kind는 '공격'|'주술'.
function critDamage(entries, kind) {
  const base = {lo: CRITDMG_BASE, hi: CRITDMG_BASE, rows: []};
  const byEl = {};
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = critDamageClassify(g, i, v, parts);
      if (!r.ok || r.kinds.indexOf(kind) < 0) return;
      const tgt = r.el ? (byEl[r.el] || (byEl[r.el] = {lo: 0, hi: 0, rows: []})) : base;
      tgt.lo += v.lo * r.stack; tgt.hi += v.hi * r.stack;
      tgt.rows.push(r.label + ' ' + fmtRange(v) +
        (r.stack !== 1 ? ' × ' + r.stack + '중첩 = ' + fmtRange({lo: v.lo * r.stack, hi: v.hi * r.stack, pc: '%'}) : ''));
    });
  });
  const lock = lockedElement();
  if (lock && byEl[lock]) { // 그 속성으로만 때리므로 기본에 합친다
    base.lo += byEl[lock].lo; base.hi += byEl[lock].hi;
    base.rows = base.rows.concat(byEl[lock].rows.map(r => r + ' (' + lock + ' 고정)'));
    delete byEl[lock];
  }
  return {base, byEl, lock};
}
// 크리가 터졌을 때만 붙는 대미지의 표지 — critOnDamage가 소유하고, dmgSum은 이걸 보고 비켜난다
// (한 옵션이 양쪽에서 곱해지면 크리가 안 터진 타격에까지 붙는 이중 계산이 된다)
const CRIT_ON_RE = /크리티컬 (시|발동 시)/;
// 크리 발동 시 대미지 판정 — 합연산인지 곱연산인지
function critOnClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  if (!CRIT_ON_RE.test(g.stem)) return {ok: false, why: '크리 발동 조건이 없음'};
  // "… 대미지 별도 " 처럼 뒤에 공백이 붙는다 — 대미지 뒤에 별도/추가/증가만 오는 형태를 본다
  if (v.pc !== '%' || !/대미지\s*(별도|추가|증가)?\s*$/.test(pre)) return {ok: false, why: '대미지 옵션이 아님'};
  if (CRIT_SKIP.test(pre)) return {ok: false, why: '소환체·피격·적의 크리'};
  return {ok: true, op: v.mul ? 'mul' : 'add',
          list: (v.list && v.list.length) ? v.list : [{lo: v.lo, hi: v.hi}]};
}
function critOnDamage(entries) {
  const sum = {lo: 0, hi: 0}, prod = {lo: 1, hi: 1};
  const rows = [];
  let any = false;
  entries.forEach(g => {
    if (!CRIT_ON_RE.test(g.stem)) return;
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = critOnClassify(g, i, v, parts);
      if (!r.ok) return;
      any = true;
      const label = stemLine(g);
      if (r.op === 'mul') { // 별도·추가는 곱해진다 — 각 장을 따로 곱한다
        r.list.forEach(x => { prod.lo *= 1 + x.lo / 100; prod.hi *= 1 + x.hi / 100; });
        rows.push(label + ' ' + fmtRange(v) + (r.list.length > 1 ? ' ×' + r.list.length : '') + ' (곱연산)');
      } else {
        sum.lo += v.lo; sum.hi += v.hi;
        rows.push(label + ' ' + fmtRange(v));
      }
    });
  });
  return {any, sum, mul: {lo: (prod.lo - 1) * 100, hi: (prod.hi - 1) * 100}, rows};
}
// 빌드의 모든 옵션 값에 대한 크리 판정 기록 — 감사·디버깅용
function critVerdicts(entries) {
  const out = [];
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      out.push({stem: g.stem, i, v, srcs: [...g.srcs.keys()],
                rating: critRatingClassify(g, i, v, parts),
                dmg: critDamageClassify(g, i, v, parts),
                onCrit: critOnClassify(g, i, v, parts)});
    });
  });
  return out;
}
// 속도 계열 합산. kind: '공격' | '시전' | '매직 버스트 충전'
// "공격 및 시전 속도"는 양쪽에 다 들어가고, "해당 장비"·소환체·조건부 확률은 뺀다.
const SPEED_SKIP = /소환체|보초병|마령|해당 장비|메인 무기|확률로/;
// 속도 옵션 판정 — 어느 속도(공격·시전·매버 충전)에 붙는지, 합/곱 어느 쪽인지 한 곳에서 정한다.
// kind와 무관하게 판정하고 걸러내는 건 speedSum이 한다 (감사에서 "이 줄이 어디에 붙는지" 보이게)
function speedClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  const next = parts[i + 1] || '';
  if (v.pc !== '%') return {ok: false, why: '%가 아닌 수치'};
  const m = /(공격 및 시전 속도|공격 속도|시전 속도|매직 버스트 충전 속도)\s*(추가)?\s*$/.exec(pre);
  if (!m) return {ok: false, why: '속도 옵션이 아님'};
  const what = m[1], isExtra = !!m[2];
  // 최소 매칭이면 "소환체"가 빠지므로 이 값 앞 조각 전체를 본다.
  // 한 줄에 내 옵션과 소환체 옵션이 같이 오기도 한다("공격 및 시전 속도 +9% 소환체 공격 및 시전 속도 +9%")
  // → 줄 전체가 아니라 이 값 바로 앞 조각만 보고 가른다.
  // 단 "소환체는 자신과 아군의 …"(프로토콜) 같은 아군 부여분은 나도 받는다
  const who = pre.slice(0, pre.lastIndexOf(what));
  if (SPEED_SKIP.test(who) && !/(자신과 아군|아군)(의|에게) $/.test(who)) return {ok: false, why: '소환체·장비 국소·확률형'};
  // "충전 속도 +40% 당 …"은 조건문이지 내 속도가 아니다 (값 뒤를 본다)
  if (/^\s*당/.test(next)) return {ok: false, why: '"속도 +N% 당 …" 조건문'};
  const sent = pre.slice(pre.search(/[^.。]*$/));
  return {ok: true, what,
          kinds: what === '공격 및 시전 속도' ? ['공격', '시전'] : [what.replace(' 속도', '')],
          op: isExtra ? 'mul' : 'add',
          // 추가(곱연산)는 조건 여부를 가리지 않는다 — 기존 규칙 유지
          isCond: !isExtra && COND_RE.test(sent),
          list: (v.list && v.list.length) ? v.list : [{lo: v.lo, hi: v.hi}]};
}
// 빌드의 모든 옵션 값에 대한 속도 판정 기록 — 감사·디버깅용
function speedVerdicts(entries) {
  const out = [];
  const stats = typeof computePresetResists === 'function' ? computePresetResists() : null;
  entries.forEach(g => {
    const statOk = statCondOk(g.stem, stats);
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = statOk ? speedClassify(g, i, v, parts)
                       : {ok: false, why: '스탯 조건 불충족 (statCondOk)'};
      out.push({stem: g.stem, i, v, srcs: [...g.srcs.keys()], r});
    });
  });
  return out;
}
function speedSum(entries, kind) {
  const sum = {lo: 0, hi: 0, rows: []}, extra = {lo: 0, hi: 0, rows: []};
  let exLo = 1, exHi = 1; // 추가(별도)는 곱연산 — 장마다 따로 곱한 뒤 %로 되돌린다
  // 조건이 붙은 줄("집요한 축복 보유 시, 시전 속도 +12%")은 따로 모은다 — 대미지·이동 속도와 같은 규칙.
  // 인게임 스탯 패널은 그 조건이 걸린 상태가 아니면 안 세므로, 섞으면 실측과 어긋난다
  const cond = {lo: 0, hi: 0, rows: []};
  const stats = typeof computePresetResists === 'function' ? computePresetResists() : null;
  entries.forEach(g => {
    // 스탯을 견주는 조건이 거짓이면 이 줄은 지금 빌드에 안 걸린다 (저울의 무게 등)
    if (!statCondOk(g.stem, stats)) return;
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = speedClassify(g, i, v, parts);
      if (!r.ok || r.kinds.indexOf(kind) < 0) return;
      const tail = (g.vals.length > 1 ? '  ← 이 줄의 ' + fmtRange(v) : '');
      if (r.op === 'mul') {
        r.list.forEach(x => { exLo *= 1 + x.lo / 100; exHi *= 1 + x.hi / 100; });
        extra.rows.push(stemLine(g) + tail + (r.list.length > 1 ? ' (장별 곱 ×' + r.list.length + ')' : ''));
        extra.lo = Math.round((exLo - 1) * 100 * 1000) / 1000; extra.hi = Math.round((exHi - 1) * 100 * 1000) / 1000;
        return;
      }
      const tgt = r.isCond ? cond : sum;
      tgt.lo += v.lo; tgt.hi += v.hi;
      tgt.rows.push(stemLine(g) + tail);
    });
  });
  return {sum, extra, cond};
}
// ── 대미지 합산 ──
// 증가("대미지 +N%")는 합연산, 별도·추가는 곱연산(1+v를 전부 곱한다).
// 조건이 붙은 문장("…경우/동안/시")은 따로 모아 병기한다. 소환체·받는 대미지는 세지 않는다.
// "자신과 소환체 대미지"는 자신에게도 적용되므로 빼지 않는다 (만병통치약 벨트 등)
const DMG_SKIP = /(?<!자신과 )(?:소환체|보초병|마령|스마트 웨폰)|(?<![가-힣])(?<!적이 )(?<!적들이 )(?<!타깃이 )(?<!대상이 )받[는은](?! ?(?:적|타깃|대상))|적이 주는/;
const COND_RE = /경우|동안| 시[, ]| 시$|하면|때마다|때 |마다 |도달 시|중이 아닐|보유|초과|미만|이상|이하|후,|배치된|비교하여|에게 주는|보스|주변|근처/;
// 대미지 옵션 판정 — 한 값(v)이 대미지 배율인지, 합/곱 어느 쪽인지, 스택은 몇인지 한 곳에서 결정한다.
// 계산은 이 기록만 보고 더하거나 곱한다. 제외할 때도 이유(why)를 남겨 "왜 안 세는지" 볼 수 있게 한다.
// (2026-08-21: 이 판정이 dmgSum 안에 정규식 사슬로 흩어져 있어, 문구가 조금 달라지면 조용히 빠졌다)
function dmgClassify(g, i, v, parts, ctx) {
  const pre = parts[i] || '';
  const next = parts[i + 1] || '';
  if (v.pc !== '%') return {ok: false, why: '%가 아닌 수치'};
  const m = /대미지(?:가)? ?(별도|추가)? ?(?:증가|체증)? ?$/.exec(pre);
  if (!m) return {ok: false, why: '대미지 옵션이 아님'};
  // 값 뒤에 오는 "추가"도 곱연산이다 ("대미지 +44% 추가")
  const tailMul = /^\s*(별도|추가)/.test(next);
  const sent = pre.slice(pre.search(/[^.。]*$/));
  if (DMG_SKIP.test(sent)) return {ok: false, why: '소환체 전용이거나 내가 받는 대미지'};
  // 크리가 터졌을 때만 붙는 대미지는 critOnDamage가 크리 기대값 안에서 곱한다.
  // 여기서도 세면 크리가 안 터진 타격에까지 곱해지는 이중 계산이 된다
  if (CRIT_ON_RE.test(sent)) return {ok: false, why: '크리 전용 — 크리 기대값에서 곱한다'};
  if (/^\s*당/.test(next)) return {ok: false, why: '"대미지 +N% 당 …" 조건문'};
  const isCond = COND_RE.test(sent);
  const op = (m[1] || tailMul) ? 'mul' : 'add';
  // 축복 1회당 옵션 — 한 줄 안에서 쌓이는 스택은 합연산이다 (사용자 확인:
  // "집요한 축복 1회당 냉기 대미지 별도 +18%" ×11중첩 = +198%를 한 번에 곱한다).
  // 옵션 자체 상한("최대 8회")이 더 낮으면 그 값으로 자른다
  let stack = 1, stackWhy = null;
  const bm2 = /(강건한|집요한|황홀한) 축복 (?:중첩 )?1회당/.exec(pre);
  if (bm2) {
    stack = Math.max(0, (blessingMax()[bm2[1] + ' 축복'] || {v: 0}).v);
    const selfCap = /최대 (\d+) ?회 (?:중첩|증가)/.exec(g.stem);
    if (selfCap) stack = Math.min(stack, +selfCap[1]);
    stackWhy = bm2[1] + ' 축복 풀스택';
  } else if (/때마다|1회당/.test(pre)) {
    // 자가 스택("…할 때마다 … 최대 N회 중첩")도 풀스택 기준 — 축복과 같은 규칙 (만병통치약 벨트 등)
    const sc = /최대 (\d+) ?회 (?:중첩|증가)/.exec(g.stem);
    if (sc) { stack = +sc[1]; stackWhy = '자가 스택 풀스택'; }
  }
  // ── 참조 스택형 — "기준 N 당 … +M%" 꼴. 지금 빌드의 그 수치로 스택 수를 세고 상한으로 자른다 ──
  // 상한은 값 뒤에 ", 최대 +C%"로 붙는다 (없으면 무제한)
  const capOf = () => (/^ ?, ?최대 ?$/.test(next.replace(/\s+/g, ' ')) && g.vals[i + 1]) ? g.vals[i + 1].hi : Infinity;
  const scaled = (per, totLo, totHi, ref) => {
    const cap = capOf();
    const sLo = per > 0 ? Math.floor(totLo / per) : 0, sHi = per > 0 ? Math.floor(totHi / per) : 0;
    // 별도(곱연산)가 여러 장이면 장마다 따로 곱해야 한다 — 합쳐진 값 하나로 곱하면 과소 계산이 된다
    const src = (v.list && v.list.length) ? v.list : [{lo: v.lo, hi: v.hi}];
    return {ok: true, op, isCond, stack: 1,
            scale: {ref, per, total: totHi, totalLo: totLo, stk: sHi, stkLo: sLo, cap,
                    lo: Math.min(v.lo * sLo, cap), hi: Math.min(v.hi * sHi, cap),
                    list: src.map(x => ({lo: Math.min(x.lo * sLo, cap), hi: Math.min(x.hi * sHi, cap)}))}};
  };
  // (1) 매직 버스트 충전 속도 참조 — "충전 속도 +N% 당 … 별도 +M% , 최대 +C%" (제작 목걸이).
  // 기준 수치가 값 자리(+N%)로 뽑히므로 앞 값을 본다
  if (op === 'mul' && i >= 1 && /^ ?당 /.test(pre) && /매직 버스트 충전 속도 ?$/.test(parts[i - 1] || '')) {
    const per = (g.vals[i - 1] || {}).hi || 0;
    const total = ctx && ctx.mbChargeTotal ? ctx.mbChargeTotal() : 0;
    return scaled(per, total, total, '충전 속도');
  }
  // (2) 스탯 참조 — "힘 10 포인트 당, 화염 대미지 별도 +8%" · "전의 4포인트당 대미지 추가 +3%".
  // 기준 수치는 부호가 없어 값 자리로 안 뽑히고 문구에 그대로 남는다.
  // 띄어쓰기가 "포인트 당"·"포인트당" 둘 다 나온다
  const sm = /(전의|힘|민첩|지혜|가장 높은 속성)의?[가은]? ?([\d.]+) ?포인트 ?당/.exec(pre);
  if (sm && ctx && ctx.statTotal) {
    const t = ctx.statTotal(sm[1]);
    if (t) return scaled(parseFloat(sm[2]) || 0, t.lo, t.hi, sm[1]);
  }
  return {ok: true, op, isCond, stack, stackWhy,
          list: (v.list && v.list.length) ? v.list : [{lo: v.lo, hi: v.hi}]};
}
// 빌드의 모든 옵션 값에 대한 판정 기록 — 감사·디버깅용 (계산은 dmgSum이 같은 판정을 쓴다)
function dmgVerdicts(entries) {
  const out = [];
  const ctx = dmgCtx(entries);
  entries.forEach(g => {
    const statOk = statCondOk(g.stem, ctx.stats);
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = statOk ? dmgClassify(g, i, v, parts, ctx)
                       : {ok: false, why: '스탯 조건 불충족 (statCondOk)'};
      out.push({stem: g.stem, i, v, srcs: [...g.srcs.keys()], r});
    });
  });
  return out;
}
// dmgClassify가 쓰는 문맥 — 매버 충전 속도는 필요할 때 한 번만 계산한다
function dmgCtx(entries) {
  let mbChg = null;
  const stats = typeof computePresetResists === 'function' ? computePresetResists() : null;
  // 증가율까지 곱한 총 스탯 — "힘 10 포인트 당" 스택 수를 세는 기준 (statCondOk와 같은 규칙)
  let will = null;
  const statTotal = nm => {
    // 전의는 우리가 정확히 안다 (기본 상한 100 + 고정 보유 옵션). 전의 옵션이 없는 빌드면 스택도 없다
    if (nm === '전의') {
      if (will == null) { try { will = willPower(entries); } catch (e) { will = {has: false}; } }
      return will && will.has ? {lo: will.pLo, hi: will.pHi} : null;
    }
    const one = k => {
      const st = stats && stats[k];
      if (!st) return {lo: 0, hi: 0};
      return {lo: st.flat.min * (1 + st.pct.min / 100), hi: st.flat.max * (1 + st.pct.max / 100)};
    };
    if (nm === '가장 높은 속성') {
      const all = ['str', 'dex', 'int'].map(one);
      return {lo: Math.max(...all.map(x => x.lo)), hi: Math.max(...all.map(x => x.hi))};
    }
    return one(STAT_KEY[nm]);
  };
  return {
    stats, statTotal,
    mbChargeTotal: () => {
      if (mbChg == null) {
        try {
          const sp = speedSum(entries, '매직 버스트 충전');
          const c2b = castToBurst(entries);
          const ca = speedSum(entries, '시전');
          mbChg = sp.sum.hi + (c2b.pct ? (ca.sum.hi + ca.extra.hi) * c2b.pct / 100 : 0);
        } catch (e) { mbChg = 0; }
      }
      return mbChg;
    },
  };
}
function dmgSum(entries) {
  const mk = () => ({lo: 0, hi: 0, rows: []});
  const sum = mk(), sumCond = mk();      // 합연산 (무조건 / 조건부)
  const mul = {lo: 1, hi: 1, rows: []}, mulCond = {lo: 1, hi: 1, rows: []}; // 곱연산
  const ctx = dmgCtx(entries);
  entries.forEach(g => {
    if (!statCondOk(g.stem, ctx.stats)) return;
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = dmgClassify(g, i, v, parts, ctx);
      if (!r.ok) return;
      // 참조 스택형은 이미 스택·상한까지 계산돼 온다 (합·곱 양쪽에 온다)
      if (r.scale) {
        const sc = r.scale;
        const row = stemLine(g) +
          ` → ${sc.ref} ${Math.round(sc.total * 10) / 10} ÷ ${sc.per} = ${sc.stk}스택 × ${fmtRange(v)} = +${Math.round(v.hi * sc.stk)}%` +
          (isFinite(sc.cap) && v.hi * sc.stk > sc.cap ? ` → 상한 +${sc.cap}%` : '');
        if (r.op === 'mul') {
          const t2 = r.isCond ? mulCond : mul;
          sc.list.forEach(x => { t2.lo *= 1 + x.lo / 100; t2.hi *= 1 + x.hi / 100; });
          t2.rows.push(row + (sc.list.length > 1 ? '  (장별 곱 ×' + sc.list.length + ')' : ''));
        } else {
          const t2 = r.isCond ? sumCond : sum;
          t2.lo += sc.lo; t2.hi += sc.hi;
          t2.rows.push(row);
        }
        return;
      }
      const row = stemLine(g) + (g.vals.length > 1 ? '  ← 이 줄의 ' + fmtRange(v) : '') + (r.stack > 1 ? ' × ' + r.stack + '중첩' : '');
      if (r.op === 'mul') { // 별도·추가 = 곱연산 — 같은 옵션이 여러 장(줄)이면 장마다 따로 곱한다 (1.1³, 1.3 아님)
        const t = r.isCond ? mulCond : mul;
        r.list.forEach(x => { t.lo *= 1 + x.lo * r.stack / 100; t.hi *= 1 + x.hi * r.stack / 100; });
        t.rows.push(row + (r.list.length > 1 ? '  (장별 곱 ×' + r.list.length + ')' : ''));
      } else {
        const t = r.isCond ? sumCond : sum;
        t.lo += v.lo * r.stack; t.hi += v.hi * r.stack;
        t.rows.push(row);
      }
    });
  });
  return {sum, sumCond, mul, mulCond};
}
// ── 이동 속도 합산 ──
// 기본(무조건 걸리는 것)과 조건부("…경우/동안/시" 문장)를 나누고, '추가'(별도 곱연산)는 또 따로.
// 이동 속도는 조건 표지가 속도·대미지와 조금 다르다 (COND_RE보다 좁다 — 여기서만 쓰는 목록)
const MOVE_COND_RE = /경우|동안| 시[, ]| 시$|하면|때마다|때 |마다 |도달 시|중이 아닐|보유/;
// 이동 속도 판정 — 기본 / 조건부 / 추가(곱연산) 중 어디로 갈 값인지
function moveSpeedClassify(g, i, v, parts) {
  const pre = parts[i] || '';
  if (v.pc !== '%') return {ok: false, why: '%가 아닌 수치'};
  const m = /이동 속도\s*(추가)?\s*$/.exec(pre);
  if (!m) return {ok: false, why: '이동 속도 옵션이 아님'};
  const who = pre.slice(0, pre.lastIndexOf('이동 속도'));
  // "소환체는 자신과 아군의 이동 속도 +20%"(프로토콜)처럼 아군 부여분은 나도 받는다
  if (SPEED_SKIP.test(who) && !/(자신과 아군|아군)(의|에게) $/.test(who)) return {ok: false, why: '소환체·장비 국소·확률형'};
  if (/^\s*당/.test(parts[i + 1] || '')) return {ok: false, why: '"이동 속도 +N% 당 …" 조건문'};
  // 이 값이 속한 문장에 조건 표지가 있으면 조건부로 가른다
  const sent = pre.slice(pre.search(/[^.。]*$/));
  return {ok: true, bucket: m[1] ? 'extra' : (MOVE_COND_RE.test(sent) ? 'cond' : 'base')};
}
function moveSpeedSum(entries) {
  const base = {lo: 0, hi: 0, rows: []}, cond = {lo: 0, hi: 0, rows: []}, extra = {lo: 0, hi: 0, rows: []};
  const buckets = {base, cond, extra};
  const stats = typeof computePresetResists === 'function' ? computePresetResists() : null;
  entries.forEach(g => {
    if (!statCondOk(g.stem, stats)) return;
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = moveSpeedClassify(g, i, v, parts);
      if (!r.ok) return;
      const tgt = buckets[r.bucket];
      tgt.lo += v.lo; tgt.hi += v.hi;
      tgt.rows.push(stemLine(g) + (g.vals.length > 1 ? '  ← 이 줄의 ' + fmtRange(v) : ''));
    });
  });
  return {base, cond, extra};
}
// "시전 속도 보너스와 추가 보너스의 N%가 매직 버스트 충전 속도에도 동일하게 적용된다" (착실한 접근)
// 매직 버스트 — 충전은 기본 2초에 완료되고, 상한이 1 이상이어야 활성화된다 (게임 내 설명).
// 충전 시간 = 2 / ((100+충전 속도)% × (100+추가 충전 속도1)% × …) — 추가만 곱연산이다
// 상한은 기본 0 — 옵션으로 올려야 쓸 수 있고, 2부터 실전에서 의미가 생긴다 (사용자 확인).
// 14번 인게임 최대치 5 = 반지 +2 · 등대 +2 · 컬러 송이 6돌 +1 (기본 0)
const BURST_BASE_SEC = 2, BURST_BASE_CAP = 0;
const DUMMY_RES = 30; // 허수아비(딜 측정기)의 저항 — 실측 약 30 (사용자 확인)
function burstCap(entries) {
  let v = BURST_BASE_CAP, any = false;
  const rows = [];
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((x, i) => {
      if (x.pc) return; // 상한은 플랫 수치
      // 게임 문구가 두 가지다 — 장비·재능은 "매직 버스트 상한 +N", 정령 승급은 "최대 매직 버스트 +N"
      if (!/(?:매직 버스트 상한|최대 매직 버스트) $/.test(parts[i] || '')) return;
      v += x.hi; any = true;
      rows.push(stemLine(g));
    });
  });
  return {v: Math.round(v * 10) / 10, any, rows};
}
// 매직 버스트로 시전하는 스킬에만 붙는 별도 — 인게임 "매직 버스트 대미지 증가" 패널과 대조용.
// dmgSum이 이미 전체 별도 곱에 넣어 세고 있으므로 여기서 낸 값은 표시 전용이다 (다시 곱하면 이중계산).
const BURST_DMG_RE = /매직 버스트(?:로|가)? ?시전하는 스킬의? ?적중 대미지 (?:별도|추가) $|매직 버스트가 시전하는 스킬 적중 대미지 (?:별도|추가) $/;
function burstDmgSummary(entries) {
  let mul = 1;
  const rows = [];
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      if (v.pc !== '%' || !BURST_DMG_RE.test(parts[i] || '')) return;
      // "충전 속도 +N% 당 … 별도 +M%, 최대 +C%" 스택형은 dmgSum과 같은 규칙으로 상한까지만
      const capNext = /^ ?, ?최대 ?$/.test((parts[i + 1] || '').replace(/\s+/g, ' ')) && g.vals[i + 1] ? g.vals[i + 1].hi : null;
      const list = capNext != null ? [{hi: capNext}] : ((v.list && v.list.length) ? v.list : [{hi: v.hi}]);
      list.forEach(x => { mul *= 1 + x.hi / 100; });
      rows.push(stemLine(g) + '  → ' + list.map(x => '+' + x.hi + '%').join(' × ') +
        (capNext != null ? ' (상한 적용)' : list.length > 1 ? ' (장별 곱 ×' + list.length + ')' : ''));
    });
  });
  // 키워드 버프(스퀴드 익스플로젼 등)는 keywordBuffLines가 옵션 줄로 넣어 주므로
  // 위 entries 순회에 이미 들어 있다 — 여기서 또 더하면 이중계산이 된다
  return {mul, rows, any: rows.length > 0};
}
// 초당 시전(공격) 횟수 — 스킬 카드의 기본 시전 속도에 합연산·추가(곱연산)를 적용한다
// (14번 실측: 아이스링 0.8초 기본, 시전 311% + 추가 9% → 5.59회/초)
function castsPerSec(entries, ref) {
  const i = ref ? findSkill(ref) : -1;
  if (i < 0) return null;
  const st = (SKILLS[i].stats || []).find(p => /시전 속도|공격 속도/.test(p[0]));
  const base = st ? parseFloat(String(st[1]).replace(/[^\d.]/g, '')) : NaN;
  if (!isFinite(base) || base <= 0) return null;
  const kind = /시전/.test(st[0]) ? '시전' : '공격';
  const sp = speedSum(entries, kind);
  const mk = (a, e) => (1 / base) * (1 + a / 100) * (1 + e / 100);
  return {base, kind, lo: mk(sp.sum.lo, sp.extra.lo), hi: mk(sp.sum.hi, sp.extra.hi),
          condHi: mk(sp.sum.hi + sp.cond.hi, sp.extra.hi), cond: sp.cond.hi};
}
// 강제 충전을 돌릴 스킬 — "스킬 사용 시" 조건이라 가장 빨리 시전되는 스킬이 기준이다.
// 용솟 투구를 쓰는 빌드는 이걸 노리고 시전이 빠른 채널링 스킬을 따로 끼운다 (사용자 확인:
// 플레임 패스 0.333초 = 보통 스킬 1초의 3배). 그래서 채널링을 우선하고, 그 다음 빠른 순으로 고른다
function burstCastSlot() {
  let best = null, bestScore = Infinity;
  SKILL_SLOTS.filter(sl => sl.group === 'a').forEach(sl => {
    const v = (preset.skills || {})[sl.id];
    if (!v || !v.main) return;
    const i = findSkill(v.main);
    if (i < 0) return;
    // 모듈(모듈화)은 쿨타임 있는 소환 스킬이라 연타로 충전을 돌리는 종류가 아니다 (사용자 확인)
    if (SKILLS[i].kind === '모듈화') return;
    const st = (SKILLS[i].stats || []).find(p => /시전 속도|공격 속도/.test(p[0]));
    const t = st ? parseFloat(String(st[1]).replace(/[^\d.]/g, '')) : NaN;
    if (!isFinite(t) || t <= 0) return;
    const score = ((SKILLS[i].tags || []).indexOf('채널링') >= 0 ? t / 100 : t);
    if (score < bestScore) { bestScore = score; best = v; }
  });
  return best;
}
function burstCastRef() { const v = burstCastSlot(); return v ? v.main : null; }
// 충전을 돌리는 스킬 기준으로 태그를 다시 판정한 옵션 목록.
// 대상 스킬(아이스링)이 채널링이 아니어도, 충전을 돌리는 플레임 패스는 채널링이므로
// "채널링 스킬 공격 및 시전 속도"가 충전 계산에는 들어가야 한다
function entriesForSlot(v) {
  const tags = skillTagSetOf(v);
  if (!tags) return null;
  try {
    const base = optSummary().filter(g => !optOffState(g, tags).off);
    // 스킬 자신의 옵션과 보조 수치는 optSummary에 "고른 스킬" 것만 들어 있다 —
    // 다른 스킬이면 여기서 얹는다 (충전 기준 스킬의 보조 속결 등)
    const sv = optSkill ? (preset.skills || {})[optSkill] : null;
    const same = sv && sv.main && v.main && sv.main.name === v.main.name;
    return same ? base : base.concat(optGroupsFrom(slotSkillLines(v)));
  } catch (e) { return null; }
}
// 강제 충전 — "스킬 사용 시, N% 의 확률로 매직 버스트 충전 에너지를 M 회 즉시 획득한다. 간격 K초"
// 확률이라 평균치로 센다: 초당 시전 횟수(간격 상한 이내) × 확률 × 획득량
function burstForce(entries, cps) {
  let rate = 0;
  const rows = [];
  if (!cps) return {rate: 0, rows};
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      // 확률 수치 뒤에 문구가 온다: "[[V]] 의 확률로 매직 버스트 충전 에너지를 1 회 … 간격 0.03초"
      const after = parts[i + 1] || '';
      const gm = /^\s*의?\s*확률로 매직 버스트 충전 에너지를\s*(\d+(?:\.\d+)?)\s*회/.exec(after);
      if (!gm || !v.pc) return;
      const gain = parseFloat(gm[1]) || 1;
      const gap = parseFloat((/간격\s*(\d+(?:\.\d+)?)\s*초/.exec(after) || [])[1]) || 0;
      const cap = gap > 0 ? 1 / gap : Infinity;
      const n = Math.max(1, g.n || 1);
      const used = Math.min(cps.hi, cap); // 간격이 있으면 그보다 자주는 못 얻는다
      const per = used * (v.hi / 100) * gain * n;
      rate += per;
      const r2 = x => Math.round(x * 100) / 100;
      // 계산 과정을 그대로 보여준다 (결과만 있으면 왜 그 값인지 알 수 없다 — 사용자 요청)
      rows.push(stemLine(g));
      rows.push('   ① 기준 스킬 초당 시전 ' + r2(cps.hi) + '회' +
        (isFinite(cap) ? ' · 간격 ' + gap + '초 → 초당 상한 ' + r2(cap) + '회 (낮은 쪽 ' + r2(used) + '회 적용)' : ' (간격 제한 없음)'));
      rows.push('   ② ' + r2(used) + '회 × 확률 ' + r2(v.hi) + '% × ' + gain + '회 획득' +
        (n > 1 ? ' × ' + n + '장' : '') + ' = 초당 ' + r2(per) + '회');
    });
  });
  return {rate, rows};
}
// 저항 관통 합산 — 스킬 속성에 맞는 것만 ("원소와 부식 저항 관통 +34%" · "냉기 관통 +N%")
// 관통 판정 — 문구의 범위(원소와 부식 / 원소 / 개별 속성)가 어느 속성에 닿는지
function penetrationClassify(g, i, v, parts) {
  if (v.pc !== '%') return {ok: false, why: '%가 아닌 수치'};
  const m = /(원소와 부식|원소|화염|냉기|번개|부식)\s*(?:저항)?\s*관통\s*$/.exec(parts[i] || '');
  if (!m) return {ok: false, why: '관통 옵션이 아님'};
  const sc = m[1];
  // "원소"는 화염·냉기·번개만 (부식·물리 제외), "원소와 부식"은 물리만 제외
  const els = sc === '원소와 부식' ? ['화염', '냉기', '번개', '부식']
            : sc === '원소' ? ['화염', '냉기', '번개'] : [sc];
  return {ok: true, scope: sc, els};
}
function penetrationSum(entries, el) {
  let lo = 0, hi = 0;
  const rows = [];
  entries.forEach(g => {
    const parts = g.stem.split(OPT_PH);
    (g.vals || []).forEach((v, i) => {
      const r = penetrationClassify(g, i, v, parts);
      if (!r.ok || r.els.indexOf(el) < 0) return;
      lo += v.lo; hi += v.hi;
      rows.push(stemLine(g));
    });
  });
  return {lo, hi, rows};
}
function castToBurst(entries) {
  let pct = 0;
  const rows = [];
  entries.forEach(g => {
    const m = /시전 속도 보너스와 추가 보너스의 (?:\[\[V\]\]|(\d+))\s*%?\s*가 매직 버스트 충전 속도/.exec(g.stem);
    if (!m) return;
    const v = m[1] ? +m[1] : ((g.vals || [])[0] || {}).hi;
    if (!isFinite(v)) return;
    pct = Math.max(pct, v);
    // 문구는 실제 수치로 되살린다 — 예전엔 모든 자리를 이 비율(100%)로 덮어써서
    // "충전 속도 추가 -33%"까지 100%로 보였다
    rows.push(stemLine(g).replace(/\s+/g, ' ').trim());
  });
  return {pct, rows};
}
const STAT_KEY = {'힘': 'str', '민첩': 'dex', '지혜': 'int'};
// "A가 B보다 낮지 않을 경우" 같은 조건이 지금 빌드에서 참인지. 조건이 없으면 true.
function statCondOk(text, stats) {
  const t = text || '';
  const st = stats || (typeof computePresetResists === 'function' ? computePresetResists() : null);
  // "지혜가 600 포인트 이상이면 …" — 증가율까지 곱한 총 스탯으로 견준다
  // (레벨업으로 기본 속성이 오르지 않으므로 옵션 합산분이 곧 총 스탯이다)
  const th = /(힘|민첩|지혜)이?가?\s*(\d+(?:\.\d+)?)\s*포인트?\s*(이상|이하)/.exec(t);
  if (th) {
    if (!st) return true;
    const o = st[STAT_KEY[th[1]]];
    const tot = o ? o.flat.max * (1 + o.pct.max / 100) : 0;
    return th[3] === '이상' ? tot >= +th[2] : tot <= +th[2];
  }
  const m = /(힘|민첩|지혜)이?가?\s*(힘|민첩|지혜)보다\s*(낮지 않을|높지 않을|높을|낮을)\s*경우/.exec(t);
  if (!m) return true;
  if (!st) return true;
  const val = k => { const o = st[STAT_KEY[k]]; return o ? o.flat.max : 0; }; // 표시와 같은 기준(최대 롤)
  const a = val(m[1]), b = val(m[2]);
  return m[3] === '낮지 않을' ? a >= b : m[3] === '높지 않을' ? a <= b : m[3] === '높을' ? a > b : a < b;
}
// ── 플랫(기본) 대미지 추가 ──
// "주술에 화염 대미지 11 - 19 포인트 추가" · "지혜가 600 포인트 이상이면 냉기 대미지가 467 - 728 포인트 추가된다"
// 스킬 기본 대미지에 더해지는 값이라 증가·별도와 달리 합산 후 곱해진다.
// 14번 실측 대조: 냉기 (467+728)/2 = 597.5 → 인게임 598 · 화염 (11+19)/2 = 15 → 인게임 15
const FLAT_DMG_RE = /(물리|화염|냉기|번개|부식|원소)\s*대미지(?:가)?\s*(\d+(?:\.\d+)?)\s*[-~–—−]\s*(\d+(?:\.\d+)?)\s*포인트\s*추가/g;
// 플랫(기본) 대미지 판정 — 한 줄에 여러 개 나올 수 있어 목록으로 돌려준다.
// 조건이 지금 빌드에서 참인지(statCondOk)까지 담는다
function flatDmgClassify(g, stats) {
  const out = [];
  FLAT_DMG_RE.lastIndex = 0;
  let m;
  while ((m = FLAT_DMG_RE.exec(g.stem))) {
    const a = parseFloat(m[2]), b = parseFloat(m[3]);
    if (!isFinite(a) || !isFinite(b)) continue;
    out.push({el: m[1], lo: Math.min(a, b), hi: Math.max(a, b),
              n: Math.max(1, g.n || 1), met: statCondOk(g.stem, stats)});
  }
  return out;
}
function flatDmgSum(entries) {
  const el = {};
  let any = false;
  const stats = typeof computePresetResists === 'function' ? computePresetResists() : null;
  entries.forEach(g => {
    flatDmgClassify(g, stats).forEach(r => {
      const t = el[r.el] || (el[r.el] = {lo: 0, hi: 0, cond: {lo: 0, hi: 0}, rows: []});
      const tgt = r.met ? t : t.cond; // 조건이 지금 빌드에서 참이면 본 합계에, 아니면 조건부로
      tgt.lo += r.lo * r.n; tgt.hi += r.hi * r.n;
      t.rows.push(stemLine(g) + (r.n > 1 ? ' ×' + r.n : '') + (r.met ? '' : ' (조건 미충족)'));
      any = true;
    });
  });
  return {el, any};
}
// ── 무기 공격 대미지 ──
// 공격 스킬의 기본 대미지는 스킬 카드에 없고 무기에서 나온다 ("185%의 무기 공격 대미지").
// 무기 자신에게만 걸리는 국소 옵션("해당 장비 …")만 여기서 얹는다 — 전역 증가·별도는 위 배율들이 맡는다.
// 순서: (베이스 + 국소 플랫 추가) × (1 + 국소 증가%), 속성별로 따로 모은다
function weaponDamage() {
  const isWeapon = v => {
    const bi = v && v.base && BASEIDX[v.base];
    // 방패도 무기 칸에 들어간다 — 베이스 수치에 공격 속도가 있는 것만 공격 무기로 본다
    return !!(bi && (bi.stats || []).some(t => /공격 속도/.test(t)));
  };
  const sid = ['weapon1', 'weapon2'].find(k => isWeapon((preset.slots || {})[k]));
  if (!sid) return null;
  const v = preset.slots[sid];
  const pools = {}, inc = {}, rows = [];
  const bump = (el, lo, hi) => { const t = pools[el] || (pools[el] = {lo: 0, hi: 0}); t.lo += lo; t.hi += hi; };
  slotOptionLines(sid, v).forEach(([, e]) => {
    let m;
    // 베이스 수치 — "물리 대미지 178 - 178" (부호가 없어 옵션 수치와 구별된다)
    if ((m = /^(물리|화염|냉기|번개|부식) 대미지 ([\d.]+) - ([\d.]+)$/.exec(e))) {
      bump(m[1], +m[2], +m[3]); rows.push('베이스 ' + e); return;
    }
    // 국소 플랫 추가 — "해당 장비 물리 대미지 49 - 59 추가"
    if ((m = /해당 장비의? (물리|화염|냉기|번개|부식|원소) 대미지 \(?(-?[\d.]+)\)? ?- ?\(?(-?[\d.]+)\)?(?: 포인트)? 추가/.exec(e))) {
      bump(m[1], +m[2], +m[3]); rows.push(e); return;
    }
    // 국소 증가 — "해당 장비 물리 대미지 +124%"
    if ((m = /해당 장비의? (물리|화염|냉기|번개|부식|원소) 대미지 ([+-][\d.]+)%/.exec(e))) {
      inc[m[1]] = (inc[m[1]] || 0) + parseFloat(m[2]); rows.push(e); return;
    }
  });
  if (!Object.keys(pools).length) return null;
  const ELM = ['화염', '냉기', '번개'];
  let lo = 0, hi = 0;
  const byEl = {};
  Object.entries(pools).forEach(([el, t]) => {
    // "원소 대미지 +N%"는 화염·냉기·번개에 걸린다 (부식·물리는 각자 문구가 따로 있다)
    const pct = (inc[el] || 0) + (ELM.indexOf(el) >= 0 ? (inc['원소'] || 0) : 0);
    const f = 1 + pct / 100;
    byEl[el] = {lo: t.lo * f, hi: t.hi * f, pct};
    lo += byEl[el].lo; hi += byEl[el].hi;
  });
  return {sid, name: v.name || (BASEIDX[v.base] || {}).name || '', lo, hi, byEl, rows, inc};
}
// 스킬 카드의 "대미지 배율" — 공격 스킬은 이 비율로 무기 대미지를 낸다 (문 스트라이크 185%).
// 주술 스킬도 대미지 배율은 갖고 있으므로, 카드가 "무기 대미지"를 쓴다고 말할 때만 돌려준다
function skillDmgMult(ref) {
  const i = findSkill(ref);
  if (i < 0) return null;
  const sk = SKILLS[i];
  const txt = plainText(String((sk.desc || []).join(' ')) + ' ' + String((sk.details || []).join(' ')));
  if (!/무기 ?(?:공격 )?대미지/.test(txt)) return null;
  const st = (sk.stats || []).find(p => /대미지 배율/.test(p[0]));
  const m = st && /([\d.]+)/.exec(String(st[1]));
  return m ? +m[1] : null;
}
// 배율 표기 — 자리수에 맞춰 유효숫자를 맞춘다.
// 칸마다 ×4567.8·×897.251·×2461657.112처럼 제각각이면 서로 견줄 수가 없다.
// 만 이상은 절대값 표기(koNum)와 같은 규칙으로 단위를 붙인다 — 스킬 기본 대미지를 모르는 빌드는
// 모든 칸이 배율로만 나오므로, 거기서도 만·억·조가 보여야 읽힌다
function mulTxt(x) {
  const n = Number(x);
  if (!isFinite(n)) return '?';
  const a = Math.abs(n);
  if (a >= 1e4) return koNum(n);                          // ×246.17만 · ×1.2억
  if (a >= 1000) return Math.round(n).toLocaleString();   // ×4,568
  if (a >= 100) return String(Math.round(n));             // ×897
  if (a >= 10) return String(Math.round(n * 10) / 10);     // ×11.9
  return String(Math.round(n * 100) / 100);                // ×3.74
}
function mulRange(lo, hi) { const a = mulTxt(lo), b = mulTxt(hi); return a === b ? b : a + '~' + b; }
// 눌러서 전체 자릿수를 볼 수 있는 배율 (단위가 붙는 큰 값만)
function mulHtml(x) {
  const a = Math.abs(Number(x));
  return (isFinite(a) && a >= 1e4) ? koNumHtml(x) : escapeHtml(mulTxt(x));
}
function fmtRange(v) {
  const r1 = x => Math.round(x * 10) / 10;
  return (v.lo >= 0 ? '+' : '') + (v.lo === v.hi ? r1(v.hi) : r1(v.lo) + '~' + r1(v.hi)) + (v.pc || '');
}
// 고른 스킬 요약 — 적용 레벨, 오라면 최종 오라 효과, 보조 스킬의 대미지 옵션
function optSkillInfoHtml() {
  if (!optSkill) return '';
  const v = (preset.skills || {})[optSkill];
  if (!v || !v.main) return '';
  const i = findSkill(v.main);
  const sk = i >= 0 ? SKILLS[i] : null;
  const rows = [];
  // 이 스킬에 적용되는 스킬 레벨 (모든/속성/종류/메인 범위를 가려서 합산)
  try {
    const lv = skillLevelOf(v.main, optSkill === 'a1', skillLvBonuses());
    if (lv.lo || lv.hi) {
      const tip = ['이 스킬에 적용되는 레벨', '기본 ' + lv.base, ...lv.hit.map(b => '[' + b.src + '] ' + b.e)].join('\n');
      rows.push(`<span class="tip2" title="${escapeHtml(tip)}">스킬 레벨 <b class="opt-v">${lv.base + lv.lo}` +
        `${lv.hi !== lv.lo ? '~' + (lv.base + lv.hi) : ''}</b> <span class="psum">(기본 ${lv.base} +${lv.lo === lv.hi ? lv.hi : lv.lo + '~' + lv.hi})</span></span>`);
    }
  } catch (e) {}
  // 오라면 계산된 최종 효과 (오라 효과 창과 같은 값)
  if (sk && (sk.tags || []).indexOf('오라') >= 0) {
    try {
      const a = auraSummary().auras.find(x => x.sk && x.sk.name === sk.name);
      if (a) {
        const fm = x => Math.round(x * 100) / 100;
        const buff = scaleSignedRange(auraBuffAtLevel(a.sk, a.lv ? a.lv.hi : 20), a.multLo, a.multHi);
        rows.push(`<span class="tip2" title="${escapeHtml('오라 효과 적용 결과\n' + buff)}">오라 효과 배율 ` +
          `<b class="opt-v">×${fm(a.multLo)}${a.multHi !== a.multLo ? '~' + fm(a.multHi) : ''}</b> ` +
          `<span class="psum">(마우스: 적용 수치)</span></span>`);
      }
    } catch (e) {}
  }
  // 연결된 보조 스킬 — 실제 레벨의 레벨표 수치를 보여준다 (표가 없는 보조만 카드 문구에서 긁는 폴백)
  const sups = (v.sup || []).filter(Boolean);
  if (sups.length) {
    const names = sups.map(sp => {
      const g2 = supGrantLines(sp);
      let lines = (g2 && g2.lines) || [];
      if (!lines.length) {
        const si = findSkill(sp);
        const txt = si >= 0 ? plainText(SKILLS[si].details || SKILLS[si].desc || '') : '';
        lines = txt.split(/(?<=[.。])\s+/).filter(t => /대미지|크리티컬/.test(t) && /[+-]\d/.test(t));
      }
      const tip = sp.name + (g2 ? ' Lv' + g2.lvTxt : '') + (lines.length ? '\n' + lines.join('\n') : '\n(적용 수치 없음)');
      return `<span class="tip2" title="${escapeHtml(tip)}">` +
        `${escapeHtml(sp.name)}${lines.length ? ' <b class="opt-v">' + lines.length + '</b>' : ''}</span>`;
    }).join(' · ');
    rows.push(`<span>보조 ${names} <span class="psum opt-help">(마우스: 적용 수치)</span></span>`);
  }
  // 이 스킬의 대미지 조립 — 아래 분류별 요약을 한 줄로 모은 것 (자세한 근거는 각 분류에서)
  let dmgRow = '';
  try {
    const live = optSummary().filter(g => !optIsOff(g));
    const r = dmgSum(live);
    const pc = x => Math.round(x * 10) / 10, fm = x => Math.round(x * 1000) / 1000;
    const rg = (a, b) => pc(a) === pc(b) ? pc(b) : pc(a) + '~' + pc(b);
    const seg = [];
    const fd = flatDmgSum(live);
    const flats = Object.entries(fd.el).filter(([, t]) => t.lo || t.hi);
    if (flats.length) seg.push(`<span class="tip2" title="${escapeHtml('플랫(기본) 대미지 — 스킬 기본 대미지에 더해진 뒤 증가·별도가 곱해집니다')}">기본 ` +
      flats.map(([nm, t]) => `${escapeHtml(nm)} <b class="opt-v">${pc((t.lo + t.hi) / 2)}</b>`).join(' · ') + '</span>');
    if (r.sum.rows.length) seg.push(`<span class="tip2" title="${escapeHtml('합연산 — 전부 더한 뒤 한 번에 곱합니다')}">증가 <b class="opt-v">+${rg(r.sum.lo, r.sum.hi)}%</b></span>`);
    if (r.mul.rows.length) {
      // 위 대미지 계산의 "별도" 칸과 같은 기준으로 낸다 — 이름이 같은데 값이 다르면 읽는 사람이 헷갈린다
      const useC = !dmgOff.has('cond');
      const mLo = r.mul.lo * (useC ? r.mulCond.lo : 1), mHi = r.mul.hi * (useC ? r.mulCond.hi : 1);
      seg.push(`<span class="tip2" title="${escapeHtml('곱연산 — 각각 따로 곱합니다' +
        (useC && r.mulCond.rows.length ? '\n무조건 ×' + mulTxt(r.mul.hi) + ' × 조건부 ×' + mulTxt(r.mulCond.hi) : ''))}">` +
        `별도 <b class="opt-v">×${mulRange(mLo, mHi)}</b></span>`);
    }
    // 액티브 20레벨 초과 배율
    const si2 = findSkill(v.main);
    const dL = si2 >= 0 ? SKILL_LV[SKILLS[si2].name] : null;
    const maxLv = dL && dL.rows ? Math.max(...dL.rows.map(x => parseFloat(x[0])).filter(isFinite)) : 20;
    if (si2 >= 0 && SKILLS[si2].kind === '액티브' && maxLv <= 20) {
      const lvv = skillLevelOf(v.main, optSkill === 'a1', skillLvBonuses());
      const ov = skillOverLv20(lvv.base + lvv.hi);
      if (ov) seg.push(`<span class="tip2" title="${escapeHtml('20레벨 초과 성장 (21~30 +10%/렙 · 31~ +8%/렙, 곱연산)')}">레벨 <b class="opt-v">×${mulTxt(ov.mul)}</b></span>`);
    }
    // 크리티컬 기대값 — 확률 × (크리 대미지 - 100%)만큼 평균 대미지가 오른다
    try {
      const will = willPower(live);
      const kind = (SKILLS[si2] && (SKILLS[si2].tags || []).indexOf('주술') >= 0) ? '주술' : '공격';
      const cc = critChance(live, kind, will), cdm = critDamage(live, kind);
      if (cc && isFinite(cc.hi)) {
        const p2 = Math.min(100, cc.hi) / 100, mult = 1 + p2 * (cdm.base.hi / 100 - 1);
        seg.push(`<span class="tip2" title="${escapeHtml(`크리 확률 ${pc(cc.hi)}% · 크리 대미지 ${pc(cdm.base.hi)}%\n기대값 = 1 + 확률 × (크리 대미지 − 100%)`)}">크리 기대 <b class="opt-v">×${mulTxt(mult)}</b></span>`);
      }
    } catch (e) {}
    if (seg.length) dmgRow = `<span>대미지 ${seg.join('<span class="psum"> × </span>')}</span>`;
  } catch (e) {}
  if (dmgRow) rows.push(dmgRow);
  if (!rows.length) return '';
  return `<div class="opt-skhead"><b>${escapeHtml(v.main.name)}</b>` +
    `<span class="psum">고른 스킬</span>${rows.join('<span class="psum">·</span>')}</div>`;
}
// 축복 최대 중첩: 강건·집요·황홀 3종, 기본 4 + "X한 축복 최대 중첩 수 ±N" 옵션 합
function blessingMax() {
  const out = {'강건한 축복': {v: 4, rows: []}, '집요한 축복': {v: 4, rows: []}, '황홀한 축복': {v: 4, rows: []}};
  liveOptionLines().forEach(([src, e]) => {
    const re = new RegExp('(강건한|집요한|황홀한) 축복 최대 중첩 수 ' + NUM_SIGN + NUM_BODY, 'g');
    let m;
    while ((m = re.exec(e))) {
      const k = m[1] + ' 축복';
      const r = numRange(m[2], m[3], m[4]); // 롤 범위로 나오면 낮은 쪽 기준 (과대평가 방지)
      out[k].v += r.lo;
      out[k].rows.push('[' + src + '] ' + m[1] + ' 축복 최대 중첩 수 ' + (r.lo === r.hi ? (r.hi > 0 ? '+' : '') + r.hi : '(' + r.lo + '-' + r.hi + ')'));
    }
  });
  return out;
}
// 이 옵션 줄이 계산에 들어가는가 — 직접 뺀 것(optOff)과 대상 스킬 태그가 안 맞아 자동으로 빠진 것.
// 목록 표시와 대미지 계산이 같은 판정을 써야 "줄을 빼면 대미지가 내려간다"가 성립한다
function optOffState(g, skTags) {
  const key = g.stem;
  let req = [];
  if (skTags) { // 다른 스킬 태그 전용 옵션은 이 스킬 계산에서 뺀다
    const r = optTagReq(g.stem);
    if (r.length && !r.every(t => skTags.has(t))) req = r;
  }
  const autoOff = req.length > 0, manOff = optOff.has(key), revived = autoOff && optOn.has(key);
  return {req, autoOff, manOff, revived, off: manOff || (autoOff && !revived)};
}
function optIsOff(g) { return optOffState(g, optSkillTags()).off; }
function openOptSum() {
  if (guardBuildMode && guardBuildMode()) return;
  document.getElementById('optSearch').value = '';
  optTab = '전체';
  // 기본은 메인 스킬(액티브 1번) 기준 — 고른 슬롯이 비었으면 채워진 첫 액티브로
  const filled = SKILL_SLOTS.filter(sl => sl.group === 'a')
    .filter(sl => { const v = (preset.skills || {})[sl.id]; return v && v.main && v.main.name; });
  if (!optSkill || !filled.some(sl => sl.id === optSkill)) optSkill = filled.length ? filled[0].id : '';
  renderOptSum();
  document.getElementById('optModal').style.display = 'flex';
  modalHistPush();
}
function renderOptSum() {
  const rows = optSummary();
  const fv = v => {
    const r1 = x => Math.round(x * 10) / 10;
    const f1 = (lo, hi) => v.par
      ? '(' + (lo === hi ? r1(hi) : r1(lo) + '~' + r1(hi)) + ')' + v.pc // 원문이 괄호 범위면 괄호 유지
      : (lo === hi ? (hi >= 0 ? '+' : '') + r1(hi) : (lo >= 0 ? '+' : '') + r1(lo) + '~' + r1(hi)) + v.pc;
    if (v.mul && v.list && v.list.length > 1) { // 별도·추가는 곱연산: 1.1^n
      const cLo = (v.list.reduce((m, x) => m * (1 + x.lo / 100), 1) - 1) * 100;
      const cHi = (v.list.reduce((m, x) => m * (1 + x.hi / 100), 1) - 1) * 100;
      const same = v.list.every(x => x.lo === v.list[0].lo && x.hi === v.list[0].hi);
      return same ? f1(v.list[0].lo, v.list[0].hi) + ' ×' + v.list.length + ' (' + f1(cLo, cHi) + ')' : f1(cLo, cHi);
    }
    return f1(v.lo, v.hi);
  };
  // 본 목록과 같은 검색 문법 (스페이스=AND, |=OR, !=제외, .=붙은 문구) — 문구·합산값·출처 전부 검색
  const tokens = parseTokens((document.getElementById('optSearch').value || '').trim());
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  const plainOf = g => { let i = 0; return g.stem.split(OPT_PH).map((part, pi) => pi ? fv(g.vals[pi - 1] || {lo: 0, hi: 0, pc: ''}) + part : part).join(''); };
  const secs = new Map();
  const skTags = optSkillTags();
  let offN = 0, manN = 0; // 태그가 안 맞아 빠진 수 / 직접 뺀 수
  rows.forEach(g => {
    if (!match([plainOf(g), ...[...g.srcs.keys()].map(sk => sk.replace(OPT_SEP, ' '))])) return;
    const key = g.stem;
    const {req, autoOff, manOff, revived, off} = optOffState(g, skTags);
    if (off) {
      if (manOff) manN++; else offN++;
      if (!manOff && !optShowOff) return; // 자동으로 빠진 건 접어둘 수 있다 (직접 뺀 건 항상 보인다)
    } else if (autoOff) { offN++; } // 되살린 것도 안내에는 센다
    const cs = optSections(g);
    cs.forEach(c => {
      if (!secs.has(c)) secs.set(c, []);
      secs.get(c).push({g, both: cs.length > 1, off, key, autoOff, req, manOff, revived});
    });
  });
  // 대상 스킬 칩 — 스킬 빌드의 액티브·패시브 슬롯에서 가져온다 (패시브는 오라 확인용)
  const skBtns = SKILL_SLOTS
    .map(sl => [sl, (preset.skills || {})[sl.id]])
    .filter(([sl, v]) => v && v.main && v.main.name);
  // 한 줄에 성격이 다른 버튼을 섞으면 줄이 넘쳐 읽기 어렵다 (액티브 스킬·패시브 오라·보기 조절).
  // 갈래마다 이름표를 달아 줄을 나눈다
  const skBtn = ([sl, v]) => {
    const i = findSkill(v.main);
    const tags = i >= 0 ? (SKILLS[i].tags || []).join(' · ') : '';
    return `<button class="${optSkill === sl.id ? 'on' : ''}${sl.group === 'p' ? ' osk-pv' : ''}" onclick="optSkillPick('${sl.id}')"` +
      ` title="${escapeHtml(sl.label + (tags ? '\n태그: ' + tags : '') + '\n이 스킬의 태그에 맞는 옵션만 계산합니다 (보조 스킬 태그 포함)')}">${escapeHtml(v.main.name)}</button>`;
  };
  const act = skBtns.filter(([sl]) => sl.group === 'a'), pas = skBtns.filter(([sl]) => sl.group === 'p');
  const pickN = optOff.size + optOn.size;
  const lines = [];
  if (skBtns.length) lines.push('<span class="osk-lb">대상 스킬</span>' +
    `<button class="${optSkill ? '' : 'on'}" onclick="optSkillPick('')" title="태그를 가리지 않고 모든 옵션을 봅니다">전체</button>` +
    act.map(skBtn).join(''));
  if (pas.length) lines.push('<span class="osk-lb">오라·패시브</span>' + pas.map(skBtn).join(''));
  // 보기 조절 — 계산 대상을 고르는 게 아니라 목록에 무엇을 보일지 정하는 버튼들
  const view = (skTags && offN ? `<button class="osk-off${optShowOff ? ' on' : ''}" onclick="optToggleOff()"` +
      ` title="이 스킬의 태그와 안 맞아 계산에서 뺀 옵션입니다. 눌러서 확인해 보세요">태그가 다른 옵션 ${offN}종 ${optShowOff ? '숨기기' : '보기'}</button>` : '') +
    (pickN ? `<button class="osk-off on" onclick="optPickReset()" title="줄을 눌러 직접 넣고 뺀 것을 모두 자동 판정으로 되돌립니다">직접 조정 ${pickN}종 ↺</button>` : '');
  if (view) lines.push('<span class="osk-lb">보기</span>' + view);
  // 줄마다 따로 감싸 넘침 없이 정렬한다
  document.getElementById('optSkills').innerHTML =
    lines.map(h => `<div class="osk-line">${h}</div>`).join('');
  // 대분류 탭 (전체 / 공격 / 생존 / 기타) — 세부 분류는 탭 안의 섹션 제목으로
  const liveN = l => l.reduce((n, e) => n + (e.off ? 0 : 1), 0); // 계산에 실제로 들어간 것만 센다
  const shown = c => optIsDealer(skTags) || DMG_SECS.indexOf(c) < 0;
  const tabN = t => OPT_TABS[t].reduce((n, c) => n + (secs.has(c) && shown(c) ? liveN(secs.get(c)) : 0), 0);
  document.getElementById('optTabs').innerHTML = [['전체', [...secs.keys()].reduce((n, c) => n + (shown(c) ? liveN(secs.get(c)) : 0), 0)]]
    .concat(Object.keys(OPT_TABS).map(t => [t, tabN(t)]).filter(([t, n]) => n > 0))
    .map(([c, n]) => `<button class="btn-sel${optTab === c ? ' cmp-on' : ''}" onclick="optTabPick('${c}')">${escapeHtml(c)} ${n}</button>`).join('');
  if (optTab !== '전체' && !tabN(optTab)) optTab = '전체';
  let h = '';
  const dealer = optIsDealer(skTags);
  OPT_SECS.forEach(c => {
    const list = secs.get(c);
    if (!list || (optTab !== '전체' && optTabOf(c) !== optTab)) return;
    if (!dealer && DMG_SECS.indexOf(c) >= 0) return; // 유틸 스킬: 대미지 분류는 숨긴다
    list.sort((x, y) => Math.abs((y.g.vals[0] || {}).hi || 0) - Math.abs((x.g.vals[0] || {}).hi || 0) || y.g.n - x.g.n);
    h += `<div class="opt-sec">${escapeHtml(c)} <span class="psum">${liveN(list)}종</span></div>`;
    if (c === '크리티컬') { // 요약: 확률 + 대미지 (근거 옵션은 접어 둔다)
      const live = list.filter(e => !e.off).map(e => e.g);
      // 전의 옵션은 다른 분류에 흩어져 있어 계산에 들어간 전체 목록에서 찾는다
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const will = willPower(allLive);
      const kinds = (skTags ? ['공격', '주술'].filter(k => skTags.has(k)) : ['공격', '주술']);
      const use = kinds.length ? kinds : ['공격', '주술'];
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      const cells = [];
      use.forEach(k => {
        const r = critChance(live, k, will);
        const tip = [k + ' 크리티컬 확률', '기본 수치 ' + CRIT_BASE +
          (r.acc.wLo || r.acc.wHi ? ' × 무기 보정 ' + fmtRange({lo: r.acc.wLo, hi: r.acc.wHi, pc: '%'}) : '') +
          (r.acc.fLo || r.acc.fHi ? ' + 고정 ' + fmtRange({lo: r.acc.fLo, hi: r.acc.fHi, pc: ''}) : '') +
          ' = ' + rg(r.baseLo, r.baseHi),
          '× (1 + 비율 합 ' + fmtRange({lo: r.acc.pLo, hi: r.acc.pHi, pc: '%'}) + ') ÷ 100' +
            (r.lucky ? ' = ' + rg(r.rawLo, r.rawHi) + '%' : ''),
          ...(r.lucky ? ['🎲 행운 — 두 번 굴려 좋은 쪽: 1-(1-p)² 적용'] : []),
          '', ...r.acc.rows].join('\n');
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(tip)}">${escapeHtml(k)} 확률 ` +
          `<b class="opt-v">${rg(r.lo, r.hi)}%</b>${r.lucky ? ' <span class="psum">🎲</span>' : ''}</span>`);
        // 크리티컬 대미지 — 기본 150%에 옵션을 더한다. 속성 전용은 따로.
        const cd = critDamage(live, k);
        const dTip = [k + ' 크리티컬 대미지', '기본 ' + CRITDMG_BASE + '%' +
          (cd.lock ? ' · ' + cd.lock + ' 대미지만 입히는 빌드라 ' + cd.lock + ' 전용 수치를 합산' : ''),
          '', ...cd.base.rows].join('\n');
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(dTip)}">${escapeHtml(k)} 크리 대미지 ` +
          `<b class="opt-v">${rg(cd.base.lo, cd.base.hi)}%</b></span>`);
        Object.entries(cd.byEl).forEach(([el, v]) => { // 속성 전용은 그 속성으로 때릴 때만
          cells.push(`<span class="crit-cell tip2" title="${escapeHtml(el + ' 크리티컬 대미지 (그 속성으로 때릴 때)\n\n' + v.rows.join('\n'))}">` +
            `${escapeHtml(el)} 크리 대미지 <b class="opt-v">${rg(CRITDMG_BASE + v.lo, CRITDMG_BASE + v.hi)}%</b></span>`);
        });
      });
      // 크리티컬이 터졌을 때만 붙는 대미지 (배율과는 별개라 따로)
      const co = critOnDamage(live);
      if (co.any) {
        const parts2 = [];
        if (co.sum.lo || co.sum.hi) parts2.push('합연산 ' + fmtRange({lo: co.sum.lo, hi: co.sum.hi, pc: '%'}));
        // 별도·추가는 이미 각 줄을 곱한 결과 — ×배율로 보여줘 합연산으로 오해하지 않게 한다
        if (co.mul.lo || co.mul.hi) parts2.push('별도·추가 ×' + (Math.round((1 + co.mul.lo / 100) * 1000) / 1000) +
          (Math.round(co.mul.hi * 10) !== Math.round(co.mul.lo * 10) ? '~' + Math.round((1 + co.mul.hi / 100) * 1000) / 1000 : '') +
          ' (' + fmtRange({lo: Math.round(co.mul.lo * 10) / 10, hi: Math.round(co.mul.hi * 10) / 10, pc: '%'}) + ')');
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml('크리티컬이 터졌을 때만 붙는 대미지\n별도·추가는 각 줄을 따로 곱한 결과입니다 (곱연산)\n\n' + co.rows.join('\n'))}">` +
          `크리 시 대미지 <b class="opt-v">${escapeHtml(parts2.join(' · '))}</b></span>`);
      }
      h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('크리티컬')">${optDetail['크리티컬'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    if (c === '영약 효과') { // 요약: 합연산 + 별도(곱연산) + 총 효과 (아마란스 감로 = 스탯 참조형)
      const live = list.filter(e => !e.off).map(e => e.g);
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const r = potionEffect(allLive.filter(g => live.includes(g) || /최대 (HP|MP)/.test(g.stem)));
      if (r.any) {
        const pc = x => Math.round(x * 10) / 10;
        const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
        const cells = [];
        const tip = ['영약 스킬 효과', '합연산끼리 더하고 별도(추가)는 곱연산으로 겹칩니다', '', ...r.acc.rows].join('\n');
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(tip)}">영약 효과 합연산 <b class="opt-v">+${rg(r.sumLo, r.sumHi)}%</b></span>`);
        if (r.acc.mul.length) cells.push(`<span class="crit-cell tip2" title="${escapeHtml('별도(곱연산) — 조건이 붙은 것은 유지된다고 보고 계산합니다\n줄을 눌러 빼면 여기서도 빠집니다')}">별도 ×${r.acc.mul.map(v => fmtRange(v)).join(' ×')}</span>`);
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml('총 영약 효과 = (1 + 합연산) × 별도 곱 − 1')}">총 영약 효과 <b class="opt-v">+${rg(r.lo, r.hi)}%</b></span>`);
        // 충전 회복 — "N초마다 진행도 M 획득"을 초당으로 환산해 합산
        const pcr = potionChargeRate(allLive);
        if (pcr.rate > 0) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['영약 충전 회복 (초당)', '', ...pcr.rows].join('\n'))}">충전 회복 <b class="opt-v">초당 ${pcr.rate}</b></span>`);
        h += `<div class="opt-row crit-sum">${cells.join('')}` +
          `<button class="crit-more" onclick="optToggleDetail('영약 효과')">${optDetail['영약 효과'] ? '상세 접기' : '상세 보기'}</button></div>`;
      }
    }
    if (c === '공격·시전 속도') { // 요약: 공격/시전 속도 + 매직 버스트 충전
      const live = list.filter(e => !e.off).map(e => e.g);
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      const cells = [];
      const kinds = skTags ? ['공격', '시전'].filter(k => skTags.has(k === '시전' ? '주술' : '공격')) : ['공격', '시전'];
      (kinds.length ? kinds : ['공격', '시전']).forEach(k => {
        const r = speedSum(live, k);
        if (!r.sum.rows.length && !r.extra.rows.length && !r.cond.rows.length) return;
        const tip = [k + ' 속도', '', ...r.sum.rows,
          ...(r.cond.rows.length ? ['', '[조건부 — 조건이 걸릴 때만]', ...r.cond.rows] : []),
          ...(r.extra.rows.length ? ['', '[추가 보너스]', ...r.extra.rows] : [])].join('\n');
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(tip)}">${escapeHtml(k)} 속도 ` +
          `<b class="opt-v">${rg(r.sum.lo, r.sum.hi)}%</b>` +
          (r.cond.lo || r.cond.hi ? ` <span class="psum">조건부 +${rg(r.cond.lo, r.cond.hi)} → ${rg(r.sum.lo + r.cond.lo, r.sum.hi + r.cond.hi)}%</span>` : '') +
          (r.extra.lo || r.extra.hi ? ` <span class="psum">추가 ${rg(r.extra.lo, r.extra.hi)}%</span>` : '') + `</span>`);
      });
      if (cells.length) h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('공격·시전 속도')">${optDetail['공격·시전 속도'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    if (c === '매직 버스트') { // 요약: 충전 속도·완충 시간·상한·강제 충전 (공시속과 섞이면 복잡해 따로 뺀다)
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      const cells = [];
      // 매직 버스트 충전 속도 — 착실한 접근이 있으면 시전 속도가 그대로 얹힌다
      const mb = speedSum(allLive, '매직 버스트 충전');
      const c2b = castToBurst(allLive);
      if (mb.sum.rows.length || mb.extra.rows.length || c2b.pct) {
        const cast = speedSum(allLive, '시전');
        const addLo = c2b.pct ? (cast.sum.lo + cast.extra.lo) * c2b.pct / 100 : 0;
        const addHi = c2b.pct ? (cast.sum.hi + cast.extra.hi) * c2b.pct / 100 : 0;
        const tip = ['매직 버스트 충전 속도', '', ...mb.sum.rows,
          ...(mb.extra.rows.length ? ['', '[추가 보너스]', ...mb.extra.rows] : []),
          ...(c2b.pct ? ['', ...c2b.rows,
            '→ 시전 속도 ' + rg(cast.sum.lo + cast.extra.lo, cast.sum.hi + cast.extra.hi) + '% 의 ' + c2b.pct + '% = ' + rg(addLo, addHi) + '%'] : [])].join('\n');
        // 충전 시간 = 2초 / ((100+충전 속도)% × (100+추가 충전 속도)% …) — 추가는 곱연산 (게임 내 설명)
        const spd = mb.sum.lo + addLo, spdHi = mb.sum.hi + addHi;
        const mulOf = v => (1 + v / 100) * (1 + mb.extra.lo / 100);
        const t1 = BURST_BASE_SEC / Math.max(0.01, mulOf(spdHi)), t2 = BURST_BASE_SEC / Math.max(0.01, mulOf(spd));
        const sec = x => Math.round(x * 1000) / 1000;
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(tip)}">매직 버스트 충전 ` +
          `<b class="opt-v">${rg(spd, spdHi)}%</b>` +
          (mb.extra.lo || mb.extra.hi ? ` <span class="psum">추가 ${rg(mb.extra.lo, mb.extra.hi)}%</span>` : '') + `</span>`);
        const cap = burstCap(allLive);
        // 완충 시간 — 상한과 무관하게 기본 2초에서 시작한다 ("매직 버스트 충전은 2초 안에 완료됩니다")
        const tTxt = sec(t1) === sec(t2) ? String(sec(t2)) : sec(t1) + '~' + sec(t2);
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml([
          '매직 버스트 완충 시간', `${BURST_BASE_SEC}초 / ((100+${rg(spd, spdHi)})% × (100+${rg(mb.extra.lo, mb.extra.hi)})%)`,
          '추가 충전 속도는 곱연산입니다 (게임 내 설명)',
          '상한이 몇이든 완충까지의 기본 시간은 2초입니다'].join('\n'))}">완충 시간 <b class="opt-v">${tTxt}초</b></span>`);
        if (cap.any) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['매직 버스트 상한 (기본 ' + BURST_BASE_CAP + ' + 옵션 합)',
          '상한이 1 이상이어야 매직 버스트를 활성화할 수 있습니다', '', ...cap.rows].join('\n'))}">매버 상한 <b class="opt-v">${cap.v}</b></span>`);
        // 매버 시전분에만 붙는 별도 — 인게임 "매직 버스트 대미지 증가" 패널과 줄 단위로 대조하는 칸
        const bd = burstDmgSummary(allLive);
        if (bd.any) cells.push(`<span class="crit-cell tip2" title="${escapeHtml([
          '매직 버스트로 시전하는 스킬에만 붙는 별도 (곱연산)',
          '이 값은 표시 전용입니다 — 위 대미지 계산의 "별도" 칸에 이미 포함돼 있습니다',
          '인게임 스탯 패널의 "매직 버스트 대미지 증가"와 대조해 보세요', '',
          ...bd.rows, '',
          '= ×' + (Math.round(bd.mul * 1000) / 1000) + ' (+' + Math.round((bd.mul - 1) * 100) + '%)'].join('\n'))}">매버 별도 <b class="opt-v">+${Math.round((bd.mul - 1) * 100)}%</b></span>`);
        // 강제 충전(확률형) — 확률이라 평균치로 센다. 자연 충전과 합쳐 완충까지 걸리는 시간을 병기
        const cRef = burstCastRef() || (preset.skills[optSkill] || {}).main;
        const cpsB = castsPerSec(allLive, cRef);
        const bf = burstForce(allLive, cpsB);
        if (bf.rate > 0) {
          // 자연 충전은 완충 시간에 상한만큼을 채운다 → 초당 스택 = 상한 / 완충 시간
          const nat = cap.v / Math.max(0.001, t2);
          const fullBoth = cap.v / (nat + bf.rate);
          cells.push(`<span class="crit-cell tip2" title="${escapeHtml([
            '강제 충전 (확률형 — 평균치)',
            `기준 스킬: ${cRef ? cRef.name : '-'} (기본 ${cpsB.base}초)` +
              (cRef && findSkill(cRef) >= 0 && (SKILLS[findSkill(cRef)].tags || []).indexOf('채널링') >= 0 ? ' · 채널링' : ''),
            `초당 시전 ${Math.round(cpsB.hi * 100) / 100}회 × 확률 = 초당 ${Math.round(bf.rate * 100) / 100}회`,
            '', ...bf.rows, '',
            `자연 충전 초당 ${Math.round(nat * 100) / 100}회(상한 ${cap.v} / 완충 ${sec(t2)}초) + 강제 ${Math.round(bf.rate * 100) / 100}회`,
            `→ 완충 ${Math.round(fullBoth * 1000) / 1000}초`,
            '간격 제한이 있으면 초당 상한을 넘지 않게 잘랐습니다'].join('\n'))}">강제 충전 <b class="opt-v">초당 ${Math.round(bf.rate * 100) / 100}회</b> <span class="psum">합쳐 완충 ${Math.round(fullBoth * 1000) / 1000}초</span></span>`);
        }
      }
      if (cells.length) h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('매직 버스트')">${optDetail['매직 버스트'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    if (c === '대미지 증가' || c === '대미지 별도·추가') { // 요약: 합연산 합 / 곱연산 총배율 (+조건부)
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const r = dmgSum(allLive);
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      const cells = [];
      if (c === '대미지 증가' && (r.sum.rows.length || r.sumCond.rows.length)) {
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['대미지 증가 (합연산 — 전부 더한 뒤 한 번에 곱합니다)', '', ...r.sum.rows].join('\n'))}">대미지 증가 <b class="opt-v">+${rg(r.sum.lo, r.sum.hi)}%</b></span>`);
        if (r.sumCond.rows.length) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['조건부 대미지 증가 — 조건이 걸릴 때 합연산에 더해집니다', '', ...r.sumCond.rows].join('\n'))}">조건부 <b class="opt-v">+${rg(r.sumCond.lo, r.sumCond.hi)}%</b> <span class="psum">(충족 시 +${rg(r.sum.lo + r.sumCond.lo, r.sum.hi + r.sumCond.hi)}%)</span></span>`);
        // 플랫(기본) 대미지 추가 — 스킬 기본 대미지에 더해지는 값이라 %와 따로 센다
        const fd = flatDmgSum(allLive);
        if (fd.any) Object.entries(fd.el).forEach(([nm, t]) => {
          const avg = x => Math.round((t.lo + t.hi) / 2 * 10) / 10;
          const on = t.lo || t.hi;
          const tip = [`${nm} 기본 대미지 추가 — 스킬 기본 대미지에 더해진 뒤 증가·별도가 곱해집니다`,
            on ? `${pc(t.lo)} ~ ${pc(t.hi)} (평균 ${avg()})` : '조건을 만족하는 것이 없습니다',
            ...(t.cond.lo || t.cond.hi ? [`조건 미충족: ${pc(t.cond.lo)} ~ ${pc(t.cond.hi)}`] : []), '', ...t.rows].join('\n');
          cells.push(`<span class="crit-cell tip2" title="${escapeHtml(tip)}">${escapeHtml(nm)} 플랫 <b class="opt-v">${pc(t.lo)}~${pc(t.hi)}</b> <span class="psum">평균 ${avg()}</span></span>`);
        });
      }
      if (c === '대미지 별도·추가' && (r.mul.rows.length || r.mulCond.rows.length)) {
        const fm = x => Math.round(x * 1000) / 1000;
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['대미지 별도·추가 (곱연산 — 각각 따로 곱합니다)', '', ...r.mul.rows].join('\n'))}">별도·추가 <b class="opt-v">×${fm(r.mul.lo)}${r.mul.hi !== r.mul.lo ? '~' + fm(r.mul.hi) : ''}</b> <span class="psum">(+${rg((r.mul.lo - 1) * 100, (r.mul.hi - 1) * 100)}%)</span></span>`);
        if (r.mulCond.rows.length) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['조건부 별도·추가 — 조건이 걸릴 때 곱연산에 겹칩니다', '', ...r.mulCond.rows].join('\n'))}">조건부 <b class="opt-v">×${fm(r.mulCond.lo)}${r.mulCond.hi !== r.mulCond.lo ? '~' + fm(r.mulCond.hi) : ''}</b> <span class="psum">(충족 시 ×${fm(r.mul.lo * r.mulCond.lo)}${r.mul.hi * r.mulCond.hi !== r.mul.lo * r.mulCond.lo ? '~' + fm(r.mul.hi * r.mulCond.hi) : ''})</span></span>`);
        // 액티브 스킬의 20레벨 초과 성장 — 레벨당 곱연산(21~30 +10% · 31~ +8%).
        // 레벨표가 20까지만 있는 스킬에만 붙인다 (표가 그 위까지 주면 이미 반영된 값이다)
        const svL = optSkill ? (preset.skills || {})[optSkill] : null;
        if (svL && svL.main) {
          const si2 = findSkill(svL.main);
          const dL = si2 >= 0 ? SKILL_LV[SKILLS[si2].name] : null;
          const maxLv = dL && dL.rows ? Math.max(...dL.rows.map(x => parseFloat(x[0])).filter(isFinite)) : 20;
          if (si2 >= 0 && SKILLS[si2].kind === '액티브' && maxLv <= 20) {
            const lvv = skillLevelOf(svL.main, optSkill === 'a1', skillLvBonuses());
            const oLo = skillOverLv20(lvv.base + lvv.lo), oHi = skillOverLv20(lvv.base + lvv.hi);
            if (oHi) {
              const lvTxt = lvv.lo === lvv.hi ? String(lvv.base + lvv.hi) : (lvv.base + lvv.lo) + '~' + (lvv.base + lvv.hi);
              cells.push(`<span class="crit-cell tip2" title="${escapeHtml([
                `${SKILLS[si2].name} Lv${lvTxt} — 20레벨을 넘는 만큼 대미지가 곱연산으로 커집니다`,
                '21~30레벨 레벨당 +10% · 31레벨부터 +8%',
                `${oHi.a}렙분 ×1.1 · ${oHi.b}렙분 ×1.08 = ×${fm(oHi.mul)}`,
                '', '레벨표가 20까지만 있는 스킬에만 적용합니다'].join('\n'))}">스킬 레벨 <b class="opt-v">×${fm((oLo || oHi).mul)}${oHi.mul !== (oLo || oHi).mul ? '~' + fm(oHi.mul) : ''}</b> <span class="psum">Lv${escapeHtml(lvTxt)}</span></span>`);
            }
          }
        }
        // 기본 속성(메인 속성) → 별도 대미지 — 고른 스킬의 메인 속성 스탯만 합산한다
        const sv0 = optSkill ? (preset.skills || {})[optSkill] : null;
        const mains = skillMainStats(sv0 && sv0.main);
        const sd = statDmgSummary(allLive, mains);
        if (sd) cells.push(`<span class="crit-cell tip2" title="${escapeHtml([`메인 속성(${sd.mains.join('+')}) 1포인트당 대미지 ${STAT_DMG_PER}% 별도 추가`,
          ...sd.rows, `합 ${Math.round(sd.stat.lo)}${Math.round(sd.stat.lo) !== Math.round(sd.stat.hi) ? '~' + Math.round(sd.stat.hi) : ''} × ${STAT_DMG_PER}% = +${rg(sd.dmgLo, sd.dmgHi)}%`,
          '', '레벨업으로는 기본 속성이 오르지 않으므로 이 합이 곧 총 스탯입니다'].join('\n'))}">${escapeHtml(sd.mains.join('+'))} <b class="opt-v">+${rg(sd.dmgLo, sd.dmgHi)}%</b> <span class="psum">별도</span></span>`);
        // 빙결로 얻는 냉기 별도 대미지 — 적에게 걸리는 효과라 위 곱연산에 섞지 않고 따로 병기한다
        const fz = freezeSummary(allLive);
        if (fz.any) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['빙결로 얻는 냉기 별도 대미지 (냉기 대미지에만 적용)',
          `최대 빙결 ${rg(fz.max.lo, fz.max.hi)} × 1% × (1 + 빙결 효과 ${rg(fz.eff.lo, fz.eff.hi)}%)`, '', '· 빙결 판은 [빙결] 분류에서 자세히 볼 수 있습니다'].join('\n'))}">빙결(냉기) <b class="opt-v">+${rg(fz.dmgLo, fz.dmgHi)}%</b> <span class="psum">별도</span></span>`);
      }
      if (cells.length) h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('${c}')">${optDetail[c] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    if (c === '빙결') { // 요약: 최대 빙결(기본 10) · 빙결 효과 · 냉기 별도 환산 · 동결 도달 여부
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const fz = freezeSummary(allLive);
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      if (fz.any) {
        const cells = [];
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['최대 빙결 (기본 ' + FREEZE_BASE + ' + 옵션 합)', '', ...fz.max.rows].join('\n'))}">최대 빙결 <b class="opt-v">${rg(fz.max.lo, fz.max.hi)}</b> <span class="psum">(기본 ${FREEZE_BASE} +${rg(fz.max.lo - FREEZE_BASE, fz.max.hi - FREEZE_BASE)})</span></span>`);
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['빙결 효과 — 빙결 1포인트당 효과를 키웁니다', '', ...fz.eff.rows].join('\n'))}">빙결 효과 <b class="opt-v">+${rg(fz.eff.lo, fz.eff.hi)}%</b></span>`);
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['빙결 1포인트마다 적이 받는 냉기 대미지 별도 +1%', `${rg(fz.max.lo, fz.max.hi)} × 1% × (1 + ${rg(fz.eff.lo, fz.eff.hi)}%) = +${rg(fz.dmgLo, fz.dmgHi)}%`, '', '풀스택(최대 빙결) 기준 · 냉기 대미지에만 적용'].join('\n'))}">냉기 별도 <b class="opt-v">+${rg(fz.dmgLo, fz.dmgHi)}%</b></span>`);
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml('빙결이 ' + FREEZE_FROZEN + ' 포인트를 초과하면 적이 동결됩니다 — "동결된 적" 조건부 옵션이 걸립니다')}">동결 <b class="opt-v">${fz.frozen ? '충족' : '미충족'}</b> <span class="psum">(${FREEZE_FROZEN} 초과)</span></span>`);
        h += `<div class="opt-row crit-sum">${cells.join('')}` +
          `<button class="crit-more" onclick="optToggleDetail('빙결')">${optDetail['빙결'] ? '상세 접기' : '상세 보기'}</button></div>`;
      }
    }
    if (c === 'HP·MP·방어') { // 요약: 최대 HP·보호막·아머·회피 (플랫 + %)
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const rs = resistSummaryOf(allLive);
      const cells = [['최대 HP', rs.hp], ['최대 MP', rs.mp], ['최대 보호막', rs.sh], ['아머', rs.armor], ['회피', rs.eva]]
        .filter(([, st2]) => st2.flat.min || st2.flat.max || st2.pct.min || st2.pct.max)
        .map(([lb, st2]) => `<span class="crit-cell tip2" title="${escapeHtml(lb + ' — 플랫 합 · 증가율(%) 합 (캐릭터 기본 수치와 별도)')}">${escapeHtml(lb)} <b class="opt-v">${escapeHtml(fmtStat(st2))}</b></span>`);
      if (cells.length) h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('HP·MP·방어')">${optDetail['HP·MP·방어'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    if (c === '이동 속도') { // 요약: 기본 + 조건부 + 추가(곱연산) — 게임 기본치 100%에서 시작
      const live = list.filter(e => !e.off).map(e => e.g);
      const r = moveSpeedSum(live);
      if (r.base.rows.length + r.cond.rows.length + r.extra.rows.length) {
        const pc = x => Math.round(x * 10) / 10;
        const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
        const cells = [];
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['이동 속도 (기본 100%)', '무조건 걸리는 옵션 합', '', ...r.base.rows].join('\n'))}">이동 속도 <b class="opt-v">${rg(100 + r.base.lo, 100 + r.base.hi)}%</b> <span class="psum">(기본 100 ${r.base.lo >= 0 ? '+' : ''}${rg(r.base.lo, r.base.hi)})</span></span>`);
        if (r.cond.rows.length) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['조건부 이동 속도 — 조건이 걸릴 때 더해집니다', '', ...r.cond.rows].join('\n'))}">조건부 <b class="opt-v">+${rg(r.cond.lo, r.cond.hi)}%</b> <span class="psum">(충족 시 ${rg(100 + r.base.lo + r.cond.lo, 100 + r.base.hi + r.cond.hi)}%)</span></span>`);
        if (r.extra.lo || r.extra.hi) cells.push(`<span class="crit-cell tip2" title="${escapeHtml(['이동 속도 추가 (별도 곱연산)', '', ...r.extra.rows].join('\n'))}">추가 <b class="opt-v">${rg(r.extra.lo, r.extra.hi)}%</b></span>`);
        h += `<div class="opt-row crit-sum">${cells.join('')}` +
          `<button class="crit-more" onclick="optToggleDetail('이동 속도')">${optDetail['이동 속도'] ? '상세 접기' : '상세 보기'}</button></div>`;
      }
    }
    if (c === '저항') { // 요약: 화·냉·번·부 순서, 상한에 걸리면 90(110)/90 표기
      const live = list.filter(e => !e.off).map(e => e.g);
      const allLive = [...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))];
      const rs = resistSummaryOf(allLive.filter(g => live.includes(g) || /최대 저항|저항|대미지로 전환/.test(g.stem)));
      const cells = RES_KEYS.map(k => {
        const capTxt = '상한 60' + (rs.cap[k].max ? ' + 최대 저항 ' + (rs.cap[k].min === rs.cap[k].max ? rs.cap[k].max : rs.cap[k].min + '~' + rs.cap[k].max) + '%' : '');
        const name = `<span style="color:${RES_COLOR[k]}">${escapeHtml(RES_LABEL[k].replace(' 저항', ''))}</span>`;
        const cv = rs.conv[k];
        // 받은 대미지 전환 합계 100% 이상 → 이 원소 대미지는 전부 다른 원소로 도착: 저항 값 대신 전환 표기
        if (cv && cv.min >= 100) {
          const tgt = Object.keys(cv.to).join('·');
          const tip = [RES_LABEL[k] + ' — 적용될 일이 없습니다', `받은 ${RES_LABEL[k].replace(' 저항', '')} 대미지 전부(합 ${cv.min}%)가 ${tgt}(으)로 전환되어 도착합니다 — ${tgt} 저항이 적용됩니다`, '모은 저항 원값: ' + fmtResist(rs.res[k], rs.cap[k]), '', ...cv.rows];
          return `<span class="crit-cell tip2" title="${escapeHtml(tip.join('\n'))}">${name} <span class="psum">→ ${escapeHtml(tgt)} 전환</span></span>`;
        }
        let tip = RES_LABEL[k] + '\n' + capTxt + '\n괄호 = 상한을 빼고 모은 원값';
        let extra = '';
        if (cv && cv.max > 0) { // 일부만 전환 — 이 저항은 남은 비율에만 적용된다
          const cvTxt = cv.min === cv.max ? cv.max : cv.min + '~' + cv.max;
          tip += `\n\n받은 대미지의 ${cvTxt}%가 ${Object.keys(cv.to).join('·')}(으)로 전환 — 이 저항은 남은 ${cv.min === cv.max ? 100 - cv.max : (100 - cv.max) + '~' + (100 - cv.min)}%에만 적용됩니다\n` + cv.rows.join('\n');
          extra = ` <span class="psum">·전환 ${escapeHtml(String(cvTxt))}%</span>`;
        }
        return `<span class="crit-cell tip2" title="${escapeHtml(tip)}">` +
          `${name} <b class="opt-v">${escapeHtml(fmtResist(rs.res[k], rs.cap[k]))}</b>${extra}</span>`;
      });
      // 물리는 저항 칸이 없다 (아머로 막는다) — 전환이 있으면 따로 칩으로 보여준다
      const ph = rs.conv.phys;
      if (ph && ph.max > 0) {
        const tgt = Object.keys(ph.to).join('·');
        const full = ph.min >= 100;
        const pcv = ph.min === ph.max ? ph.min : ph.min + '~' + ph.max;
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml([
          full ? `받은 물리 대미지 전부(합 ${pcv}%)가 ${tgt}(으)로 전환되어 도착합니다`
               : `받은 물리 대미지의 ${pcv}%가 ${tgt}(으)로 전환됩니다 — 나머지는 물리 그대로 들어옵니다`,
          '물리는 저항이 없고 아머로 막습니다', '', ...ph.rows].join('\n'))}">` +
          `<span style="color:#d7b98c">물리</span> <span class="psum">→ ${full ? '' : escapeHtml(String(pcv)) + '% '}${escapeHtml(tgt)} 전환</span></span>`);
      }
      h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('저항')">${optDetail['저항'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    let bm = null;
    if (c === '축복') { // 요약: 최대 중첩 + 1회당 효과의 최대 중첩 환산 합산 (다른 요약과 같은 디자인)
      bm = blessingMax();
      const live = list.filter(e => !e.off).map(e => e.g);
      const pc = x => Math.round(x * 10) / 10;
      const rg = (lo, hi) => pc(lo) === pc(hi) ? pc(hi) : pc(lo) + '~' + pc(hi);
      const cells = [];
      cells.push(`<span class="crit-cell tip2" title="${escapeHtml('축복 최대 중첩 구성 (기본 4중첩)\n' + (Object.values(bm).flatMap(x => x.rows).join('\n') || '조정 옵션 없음'))}">` +
        Object.entries(bm).map(([k, x]) => `${escapeHtml(k.replace('한 축복', ''))} <b class="opt-v">${x.v}</b>`).join(' · ') + ` <span class="psum">최대 중첩</span></span>`);
      // "축복 1회당 X" 옵션 → 효과별로 묶어 최대 중첩(옵션 자체 상한이 더 낮으면 그 값) 환산 합
      const eff = new Map();
      live.forEach(g => {
        const parts = g.stem.split(OPT_PH);
        // "…, 최대 8 회 중첩/증가"처럼 옵션이 제 상한을 갖는 경우 — 상한 숫자는 부호가 없어
        // 값 자리로 안 뽑히고 문구에 남기도 한다 → 값 자리와 문구 양쪽에서 찾는다
        let selfCap = Infinity;
        const tc = /최대 (\d+) ?회 (중첩|증가)/.exec(g.stem);
        if (tc) selfCap = +tc[1];
        for (let i = 0; i < g.vals.length; i++) {
          if (/최대 $/.test(parts[i] || '') && /^ ?회 (중첩|증가)/.test(parts[i + 1] || '')) selfCap = g.vals[i].lo;
        }
        for (let i = 0; i < g.vals.length; i++) {
          const pre = parts[i] || '';
          const v = g.vals[i];
          if (!v || v.pc !== '%') continue;
          const m = /(강건한|집요한|황홀한) 축복 (?:중첩 )?1회당,? ([^.。]*)$/.exec(pre);
          if (!m) continue;
          const M = Math.min(Math.max(0, (bm[m[1] + ' 축복'] || {v: 0}).v), selfCap);
          if (!M) continue;
          const label = m[2].replace(/\s+/g, ' ').trim() || '효과';
          const key = m[1].slice(0, 2) + '\u001f' + label;
          const e2 = eff.get(key) || {who: m[1].slice(0, 2), label, lo: 0, hi: 0, rows: []};
          e2.lo += v.lo * M; e2.hi += v.hi * M;
          e2.rows.push(stemLine(g) + ' × ' + M + '중첩' + (g.vals.length > 1 ? '  ← 이 줄의 ' + fmtRange(v) : ''));
          eff.set(key, e2);
        }
      });
      eff.forEach(e2 => {
        cells.push(`<span class="crit-cell tip2" title="${escapeHtml([e2.who + ' 축복 최대 중첩 환산', '', ...e2.rows].join('\n'))}">` +
          `${escapeHtml(e2.who + ' ' + e2.label)} <b class="opt-v">${e2.lo >= 0 ? '+' : ''}${rg(e2.lo, e2.hi)}%</b></span>`);
      });
      h += `<div class="opt-row crit-sum">${cells.join('')}` +
        `<button class="crit-more" onclick="optToggleDetail('축복')">${optDetail['축복'] ? '상세 접기' : '상세 보기'}</button></div>`;
    }
    // 요약만 보여주고 근거 줄은 접는다 — 단 검색 중에는 편다 (찾은 줄이 접힘에 가려지면 "빠졌다"로 보인다)
    if (!optDetail[c] && !tokens.length && OPT_FOLD.indexOf(c) >= 0) return;
    let pe = null; // 영약 효과 섹션: 아마란스(참조형) 줄에 실 적용값을 병기한다
    if (c === '영약 효과') {
      try { pe = potionEffect([...new Set([...secs.values()].flat().filter(e => !e.off).map(e => e.g))]); } catch (e) {}
    }
    list.forEach(en => {
      const g = en.g;
      const tip = [...g.srcs].map(([sk, n]) => { const j = sk.indexOf(OPT_SEP); return '[' + sk.slice(0, j) + '] ' + sk.slice(j + OPT_SEP.length) + (n > 1 ? ' ×' + n : ''); }).join('\n');
      // 조각 단위 렌더: [설명 텍스트 + 값] 쌍 — 혼합 속도 줄은 섹션과 무관한 조각을 음영 처리
      const parts = g.stem.split(OPT_PH);
      let body = '';
      const dimmed = t => t ? '<span class="opt-dim">' + highlight(t, kws) + '</span>' : '';
      // 음영은 "이동 속도와 다른 속도가 한 줄에 섞인" 경우에만 쓴다.
      // 여러 섹션에 함께 뜨는 줄(버프·매버 등)까지 이 로직을 태우면 통째로 회색이 됐다
      const mixedSpeed = en.both && (c === '이동 속도' || c === '공격·시전 속도') &&
        /이동 속도/.test(g.stem) && /속도/.test(g.stem.replace(/이동 속도/g, ''));
      for (let i = 0; i < g.vals.length; i++) {
        const txt = parts[i], valHtml = '<b class="opt-v">' + escapeHtml(fv(g.vals[i] || {lo: 0, hi: 0, pc: ''})) + '</b>';
        if (!mixedSpeed) { body += highlight(txt, kws) + valHtml; continue; }
        // 혼합 속도 줄: 이 섹션의 수치만 밝게 둔다. 값 앞에 조건 문구가 길게 붙는 경우가 있어
        // ("… 최대 충전 상태가 되면 …를 시도한다. 이동 속도 -30%") 마지막 마침표·쉼표 뒤를 라벨로 본다.
        const m = /^(.*[.,]\s*)([^.,]*)$/.exec(txt);
        const head = m ? m[1] : '', label = m ? m[2] : txt;
        const rel = c === '이동 속도' ? label.indexOf('이동 속도') >= 0
                                      : label.indexOf('이동 속도') < 0 && label.indexOf('속도') >= 0;
        body += rel ? dimmed(head) + highlight(label, kws) + valHtml
                    : '<span class="opt-dim">' + highlight(txt, kws) + valHtml + '</span>';
      }
      body += highlight(parts[g.vals.length] || '', kws);
      if (g.note) body += ' <span class="psum">' + escapeHtml(g.note) + '</span>'; // 유효 한도 표기는 합친 뒤에도 남긴다
      // 아마란스 감로 — 다른 스탯을 참조하는 옵션이라 문구만으론 값을 알 수 없다 → 실 적용값 병기
      if (pe && pe.acc.ama && /보너스의 [\d.]+% 가 영약 스킬 효과에도/.test(g.stem)) {
        const a = pe.acc.ama;
        const rm = x => Math.round(x * 10) / 10;
        body += ` <span class="psum tip2" title="${escapeHtml('최대 HP·MP 보너스 합 ' + rm(a.srcLo) + (a.srcHi !== a.srcLo ? '~' + rm(a.srcHi) : '') + '% 기준 (상한 적용)')}">→ 실 적용 +${rm(a.addLo)}${a.addHi !== a.addLo ? '~' + rm(a.addHi) : ''}%</span>`;
      }
      // "X한 축복 중첩 1회당 …" 옵션은 최대 중첩 기준 환산값을 함께
      if (bm) {
        const bmm = /(강건한|집요한|황홀한) 축복 (?:중첩 )?1회당/.exec(g.stem);
        const parts2 = g.stem.split(OPT_PH);
        let selfCap = Infinity;
        const tc2 = /최대 (\d+) ?회 (중첩|증가)/.exec(g.stem);
        if (tc2) selfCap = +tc2[1];
        for (let i = 0; i < g.vals.length; i++) {
          if (/최대 $/.test(parts2[i] || '') && /^ ?회 (중첩|증가)/.test(parts2[i + 1] || '')) selfCap = g.vals[i].lo;
        }
        const v = g.vals.find((x, i) => x.pc === '%' && /1회당,? [^.。]*$/.test(parts2[i] || ''));
        if (bmm && v && bm[bmm[1] + ' 축복']) {
          const M = Math.min(Math.max(0, bm[bmm[1] + ' 축복'].v), selfCap); // 옵션 자체 상한(최대 8회)이 더 낮으면 그 값
          const rm = x => Math.round(x * M * 10) / 10;
          body += ` <span class="psum">→ 최대 ${M}중첩 ${v.lo >= 0 ? '+' : ''}${v.lo === v.hi ? rm(v.hi) : rm(v.lo) + '~' + rm(v.hi)}${v.pc}</span>`;
        }
      }
      const mark = en.manOff ? ' <span class="psum">[직접 뺌]</span>'
        : en.off ? ` <span class="psum">[${escapeHtml(en.req.join(' · '))} 전용 — 계산 제외]</span>`
        : en.revived ? ` <span class="psum">[${escapeHtml(en.req.join(' · '))} 전용 — 직접 넣음]</span>` : '';
      const hint = en.off ? '눌러서 계산에 넣기' : '눌러서 계산에서 빼기';
      h += `<div class="opt-row opt-pick tip2${en.off ? ' opt-off' : ''}${en.revived ? ' opt-rev' : ''}"` +
        ` data-okey="${escapeHtml(en.key)}" data-auto="${en.autoOff ? 1 : 0}"` +
        ` title="${escapeHtml('출처 ' + g.n + '건\n' + tip + '\n\n' + hint)}">` +
        `<span class="opt-t">${body}${mark}</span>${g.n > 1 ? `<span class="opt-n">×${g.n}</span>` : ''}</div>`;
    });
  });
  // 고른 스킬 자체의 정보 — 적용되는 스킬 레벨, 오라면 최종 효과, 연결된 보조 스킬
  if (h) h = optSkillInfoHtml() + h;
  const bodyEl = document.getElementById('optSumBody');
  bodyEl.onclick = ev => { // 줄을 눌러 계산에 넣고 뺀다
    const row = ev.target.closest ? ev.target.closest('.opt-pick') : null;
    if (row) { optToggleRow(row.getAttribute('data-okey'), row.getAttribute('data-auto') === '1'); return; }
    // 요약 줄은 아무 데나 눌러도 상세가 펼쳐지고 접힌다 (작은 [상세 보기] 버튼을 정확히 겨눌 필요 없이)
    if (!ev.target.closest) return;
    if (ev.target.closest('.crit-more')) return; // 버튼은 자기 onclick이 처리한다
    const sum = ev.target.closest('.crit-sum');
    const btn = sum && sum.querySelector('.crit-more');
    if (btn) btn.click();
  };
  bodyEl.innerHTML = h ||
    `<div class="psum">${tokens.length ? '검색 결과가 없습니다' : '모을 옵션이 없습니다'}</div>`;
  // 같은 창의 대미지 계산도 함께 갱신 — 줄을 빼면 그 자리에서 대미지가 내려간다 (사용자 요청)
  try { renderDmgCalc(); } catch (e) {}
}
function closeOptSum() { document.getElementById('optModal').style.display = 'none'; }

// ── 오라 효과 계산: 장착 오라(패시브)별 실효 수치 ──
// 전역 오라 효과(장비·재능·석판 옵션) + 오라별 전용 옵션 + 링크된 보조 스킬의 오라 효과를 합산해
// 오라 버프 수치에 배율로 적용한다. lo~hi는 옵션 범위 수치(제작 (a-b)%) 때문.
function auraSummary() {
  const bonuses = skillLvBonuses();
  // 장착 오라: 패시브 슬롯의 오라 태그 스킬
  const auras = [];
  SKILL_SLOTS.forEach(sl => {
    const v = (preset.skills || {})[sl.id];
    if (!v || !v.main) return;
    const i = findSkill(v.main);
    const sk = i >= 0 ? SKILLS[i] : null;
    if (sk && sk.kind === '패시브' && (sk.tags || []).includes('오라'))
      auras.push({slot: sl.id, sk, ref: v.main, sups: (v.sup || []).filter(Boolean), eff: {lo: 0, hi: 0}, mul: {lo: 1, hi: 1}, rows: [], mp: {lo: 0, hi: 0}});
  });
  // 장비가 부여하는 오라 — 보조 불가, 오라 개수 조건에도 포함
  let pendingAuras = 0; // 종류를 아직 고르지 않은 부여 오라 — 효과는 못 세지만 개수에는 든다
  grantedAuras().forEach(g => {
    const nm = g.rand ? g.pick : g.name;
    if (!nm) { if (g.rand) pendingAuras++; return; } // 랜덤 아우라는 무엇이든 오라 하나를 부여한다
    const i = findSkill({name: nm, kind: '패시브'});
    if (i < 0 || !(SKILLS[i].tags || []).includes('오라')) return;
    auras.push({slot: '장비 · ' + (g.item || ''), sk: SKILLS[i], ref: {name: nm, kind: '패시브'}, sups: [],
                eff: {lo: 0, hi: 0}, mul: {lo: 1, hi: 1}, rows: [], mp: {lo: 0, hi: 0}, cond: g.cond || null});
  });
  const nAuras = auras.length + pendingAuras;
  const out = {auras, nAuras, pendingAuras, g: {lo: 0, hi: 0}, gRows: [], mp: {lo: 0, hi: 0}, mpRows: [], skipped: [], conv: null};
  const baseOf = a => a.sk.name.replace(/^정밀 /, '');
  // 옵션 줄 훑기 — 전역/오라 전용/조건부/변환/MP 봉인 보상
  const lines = liveOptionLines();
  const range = m => ({lo: +m[1], hi: +(m[2] || m[1])});
  lines.forEach(([src, e]) => {
    // MP 봉인 보상 +N% (전역 스탯) — "당, 오라 효과"의 기준값(+3% 당)은 제외
    const mpRe = /MP 봉인 보상 \+\(?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\)?%(?! 당)/g;
    let m;
    while ((m = mpRe.exec(e))) {
      if (/의 MP 봉인 보상/.test(e.slice(0, m.index))) continue; // 스킬 전용은 아래 오라별에서
      const r = range(m);
      out.mp.lo += r.lo; out.mp.hi += r.hi;
      out.mpRows.push([src, e, r]);
    }
    // 오라 효과 줄
    const auraRe = /오라 효과 \+\(?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\)?%/g;
    while ((m = auraRe.exec(e))) {
      const pre = e.slice(0, m.index);
      const r = range(m);
      if (/당,? *$/.test(pre)) { // "MP 봉인 보상 +A% 당, 오라 효과 +B%" — 변환은 마지막에
        const a = /MP 봉인 보상 \+(\d+(?:\.\d+)?)% 당/.exec(e);
        if (a) out.conv = {src, e, per: +a[1], gain: r};
        continue;
      }
      const c = /\(?(\d+)(?:-\d+)?\)? ?개 혹은 그 이상의 오라 효과를 받고 있을 경우/.exec(pre);
      if (c) { // 오라 개수 조건 — 장착 수로 자동 판정 ((4-5)개 범위 표기는 낮은 값 기준)
        if (nAuras >= +c[1]) { out.g.lo += r.lo; out.g.hi += r.hi; out.gRows.push([src, e + ' (오라 ' + nAuras + '개 — 충족)', r]); }
        else out.skipped.push([src, e + ' (오라 ' + nAuras + '개 — 미충족)']);
        continue;
      }
      if (/주변에 최소|적이 있을 경우/.test(pre)) { out.skipped.push([src, e]); continue; } // 전장 상황 조건 — 판정 불가
      const named = auras.find(a => pre.includes(baseOf(a)));
      if (named) { named.eff.lo += r.lo; named.eff.hi += r.hi; named.rows.push(['전용 · ' + src, e, r]); continue; }
      if (/[가-힣]$/.test(pre.trim()) && !/경우|때|시$/.test(pre.trim())) { out.skipped.push([src, e + ' (미장착 오라 전용)']); continue; }
      out.g.lo += r.lo; out.g.hi += r.hi;
      out.gRows.push([src, e, r]);
    }
    // 오라별 "X의 MP 봉인 보상 추가 +N%"
    const mpaRe = /([가-힣 ]+?)의 MP 봉인 보상 추가 \+\(?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\)?%/g;
    while ((m = mpaRe.exec(e))) {
      const a = auras.find(x => m[1].trim().includes(baseOf(x)));
      if (a) a.mpx = (a.mpx || {lo: 0, hi: 0}), a.mpx.lo += +m[2], a.mpx.hi += +(m[3] || m[2]);
    }
  });
  // 링크된 보조 스킬: 오라 효과(합연산)·오라 효과 추가(곱연산)·MP 봉인 보상
  auras.forEach(a => {
    a.sups.forEach(sup => {
      const si = findSkill(sup);
      const sk2 = si >= 0 ? SKILLS[si] : null;
      if (!sk2) return;
      const txt = plainText(sk2.desc || '');
      if (!/오라 효과|MP 봉인 보상/.test(txt)) return;
      const r = skillLevelOf(sup, false, bonuses);
      const lvLo = r.base + r.lo, lvHi = r.base + r.hi;
      const val = (lv, key) => {
        const t = skillLvValues(sup.name, lv);
        const hit = t && t.find(([col]) => col.includes(key));
        return hit ? parseFloat(hit[1]) : null;
      };
      if (/오라 영향을 1개 받을 때마다.{0,20}오라 효과/.test(txt)) {
        // 정밀 일치단결: 자신이 받는 오라 1개당 중첩 (최대 N회) — 활성 오라 수만큼 곱한다
        const cap = +((/최대 (\d+) ?회 중첩/.exec(txt) || [])[1] || 5);
        const n = Math.min(nAuras, cap);
        const lo = val(lvLo, '오라 효과'), hi = val(lvHi, '오라 효과');
        if (lo != null && n > 0) {
          const h2 = hi != null ? hi : lo;
          a.eff.lo += lo * n; a.eff.hi += h2 * n;
          a.rows.push(['보조 Lv.' + (lvLo === lvHi ? lvLo : lvLo + '~' + lvHi), sup.name + ' 오라 효과 ×' + n + ' (받는 오라 ' + nAuras + '개, 최대 ' + cap + '회)', {lo: lo * n, hi: h2 * n}]);
        }
      } else if (/보조 대상 스킬의 오라 효과 [\d.]/.test(txt)) {
        const lo = val(lvLo, '오라 효과'), hi = val(lvHi, '오라 효과');
        if (lo != null) { a.eff.lo += lo; a.eff.hi += hi != null ? hi : lo; a.rows.push(['보조 Lv.' + (lvLo === lvHi ? lvLo : lvLo + '~' + lvHi), sup.name + ' 오라 효과', {lo, hi: hi != null ? hi : lo}]); }
      }
      const mu = /받는 보조 대상 스킬의 오라 효과 추가 ([+-]?[\d.]+)%/.exec(txt);
      if (mu) { const f = 1 + parseFloat(mu[1]) / 100; a.mul.lo *= f; a.mul.hi *= f; a.rows.push(['보조', sup.name + ' 오라 효과 추가 ' + mu[1] + '%', null]); }
      if (/보조 대상 스킬의 MP 봉인 보상 [\d.]/.test(txt)) {
        const lo = val(lvLo, 'MP 봉인 보상'), hi = val(lvHi, 'MP 봉인 보상');
        if (lo != null) { a.mp.lo += lo; a.mp.hi += hi != null ? hi : lo; }
      }
    });
    // 스킬 전용 봉인 보상 추가(옵션) 반영 — 보조의 봉인 보상은 연결된 오라에만 적용 (전역 합계에 안 섞음)
    if (a.mpx) { a.mp.lo *= 1 + a.mpx.lo / 100; a.mp.hi *= 1 + a.mpx.hi / 100; }
  });
  // 취합 줄에서 변환을 못 찾았으면 장비 스냅을 직접 스캔 (스냅 이상·문구 변형 대비 폴백)
  if (!out.conv) Object.values(preset.slots || {}).forEach(v => {
    if (!v || v.kind !== 'item') return;
    const opts = (v.snap && v.snap.opts && v.snap.opts.length ? v.snap.opts : (ITEMS.find(x => x.name === v.name) || {}).opts) || [];
    opts.forEach(o => {
      const t = plainText(String(typeof o === 'string' ? o : (o && o.effect) || '').replace(/&lt;|&gt;/g, '')).replace(/[–—−~]/g, '-');
      const m = /봉인 보상 ?\+?\(?(\d+(?:\.\d+)?)\)?%? ?당,? ?오라 효과 ?\+?\(?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\)?%/.exec(t);
      if (m) out.conv = {src: '레전드 ' + (v.part || v.name || ''), e: t, per: +m[1], gain: {lo: +m[2], hi: +(m[3] || m[2])}};
      else if (/오라 효과/.test(t) && /당/.test(t)) out.convMiss = (v.name || '') + ' | ' + t; // 변환처럼 보이는데 인식 실패 — 원문 진단용
    });
  });
  if (!out.conv && !out.convMiss) { // 변환 후보 자체가 없으면 장비 슬롯 현황을 진단에 남긴다
    out.slotInfo = Object.entries(preset.slots || {}).filter(([k, v]) => v && v.kind === 'item')
      .map(([k, v]) => k + ':' + (v.name || '?') + '(옵션 ' + ((v.snap && v.snap.opts && v.snap.opts.length) || 0) + '개)').join(' · ');
  }
  // 오라별 최종 배율 — 변환(봉인 보상 A% 당 오라 효과 B%)은 오라마다
  // 그 오라의 봉인 보상(전역 옵션 + 자기 봉인 제어) 기준으로 각각 적용한다 (실측)
  auras.forEach(a => {
    a.mpAll = {lo: out.mp.lo + a.mp.lo, hi: out.mp.hi + a.mp.hi}; // 이 오라의 봉인 보상
    a.tot = {lo: out.g.lo + a.eff.lo, hi: out.g.hi + a.eff.hi};
    if (out.conv) {
      const cl = Math.floor(a.mpAll.lo / out.conv.per) * out.conv.gain.lo;
      const ch = Math.floor(a.mpAll.hi / out.conv.per) * out.conv.gain.hi;
      a.tot.lo += cl; a.tot.hi += ch;
      a.conv = {lo: cl, hi: ch};
      a.rows.push(['변환 · ' + out.conv.src, out.conv.e + ' — 이 오라의 봉인 보상 ' + Math.round(a.mpAll.lo) + (Math.round(a.mpAll.hi) !== Math.round(a.mpAll.lo) ? '~' + Math.round(a.mpAll.hi) : '') + '% 기준', {lo: cl, hi: ch}]);
    }
    a.lv = auraLevelOf(a.ref || {name: a.sk.name, kind: '패시브'}); // 기본 20 + 스킬 레벨 옵션
    a.multLo = (1 + a.tot.lo / 100) * a.mul.lo;
    a.multHi = (1 + a.tot.hi / 100) * a.mul.hi;
  });
  return out;
}
// 오라 버프 배율: 부호(+/-) 있는 수치만 곱한다 — "10미터 내 최소 5명" 같은 조건 숫자는 보존
function scaleSigned(text, n) {
  if (!(n > 0) || n === 1) return text;
  return String(text).replace(/([+-])(\d+(?:\.\d+)?)/g, (mm, sg, num) => {
    const raw = parseFloat(num) * n;
    return sg + (num.indexOf('.') < 0 ? Math.round(raw) : Math.round(raw * 100) / 100);
  });
}
// 오라 버프 기본 문구 — '세부 수치'(details, 20레벨 기준) 우선. desc는 1레벨 수치라 낮게 잡힌다 (실측)
function auraBuffText(sk) {
  return plainText(sk.details || sk.desc || '').replace(/^오라를 활성화하여[^:.]*(획득한다\.|획득: ?|획득:?)/, '').trim();
}
// 1레벨(desc)과 20레벨(details) 두 점으로 레벨당 성장률을 구한다. 데이터에 그 이상은 없다.
// 두 점이 같거나 못 읽으면 1(성장 없음)을 돌려준다.
// 라벨에서 조사·수식어를 걷어내 핵심어만 남긴다 ("주술 스킬의 대미지 추가" → "주술대미지")
function auraStatKey(t) {
  return String(t).replace(/[\s,.:]/g, '').replace(/[를을]/g, '')
    .replace(/스킬로입히는|스킬의|스킬/g, '')
    .replace(/받는|자신과|일정범위내의모든아군이|버프획득|버프를획득한다/g, '')
    .replace(/(별도|추가|증가|적용|된다|한다)+$/g, '')
    .replace(/(이|가|을|를|와|과|의|은|는)$/g, '');
}
function auraStatList(text) {
  const out = [];
  const re = new RegExp(NUM_PCT, 'g');
  let m, last = 0;
  while ((m = re.exec(text || ''))) {
    const label = auraStatKey(text.slice(last, m.index));
    last = re.lastIndex;
    out.push({label, v: Math.abs(numRange(m[1], m[2], m[3]).hi)}); // 크기만 견준다 (부호는 원문 유지)
  }
  return out;
}
function auraGrowth(sk) {
  const one = auraStatList(plainText(sk.desc || '').replace(/^오라를 활성화하여[^:.]*(획득한다\.|획득: ?|획득:?)/, ''));
  const twenty = auraStatList(auraBuffText(sk));
  if (!one.length || !twenty.length) return 1;
  const rate = (a, b) => (a && b && a !== b) ? Math.pow(b / a, 1 / 19) : null; // 1 → 20레벨은 19단계
  // 값이 양쪽 다 하나뿐이면 그것끼리 (표현이 달라도 같은 효과다)
  if (one.length === 1 && twenty.length === 1) return rate(one[0].v, twenty[0].v) || 1;
  const rates = [];
  twenty.forEach(t => {
    // 핵심어가 같거나 한쪽이 다른 쪽을 품고 있으면 같은 항목으로 본다
    const hit = one.find(o => o.label && t.label &&
      (o.label === t.label || o.label.indexOf(t.label) >= 0 || t.label.indexOf(o.label) >= 0));
    const r = hit ? rate(hit.v, t.v) : null;
    if (r) rates.push(r);
  });
  if (!rates.length) return 1;
  rates.sort((x, y) => x - y);
  return rates[Math.floor(rates.length / 2)]; // 항목마다 조금씩 달라 가운데 값을 쓴다
}
// 20레벨 이후 성장 계수 — 1~20레벨 레벨당 증가폭의 이 비율만큼 계속 오른다 (인게임 실측 0.529·0.531)
const AURA_OVER20 = 0.53;
// 오라 버프 문구를 실제 레벨 기준으로. 항목마다 성장 폭이 달라 각각 계산한다
// (같은 오라 안에서도 원소 저항은 오르고 받는 대미지·회피 확률은 그대로다).
function auraBuffAtLevel(sk, level) {
  const base = auraBuffText(sk);
  if (!level || level === 20) return base;
  const one = auraStatList(plainText(sk.desc || '').replace(/^오라를 활성화하여[^:.]*(획득한다\.|획득: ?|획득:?)/, ''));
  const twenty = auraStatList(base);
  if (!one.length || !twenty.length) return base;
  const pair = t => one.find(o => o.label && t.label &&
    (o.label === t.label || o.label.indexOf(t.label) >= 0 || t.label.indexOf(o.label) >= 0));
  let i = 0;
  return base.replace(new RegExp(NUM_PCT, 'g'), (mm, sg, a, b, pc) => {
    const t = twenty[i++];
    const o = t ? pair(t) : null;
    if (!o || o.v === t.v) return mm; // 짝을 못 찾거나 성장하지 않는 항목은 그대로
    const step = (t.v - o.v) / 19;    // 1 → 20레벨 레벨당 증가폭
    const v = t.v + step * AURA_OVER20 * (level - 20);
    const r = Math.round(v * 10) / 10;
    return (sg === '-' ? '-' : sg ? '+' : '') + r + pc; // 원문 부호를 유지한다
  });
}
// 이 오라에 적용되는 최종 레벨 (기본 20 + 스킬 레벨 옵션)
function auraLevelOf(ref) {
  try {
    const lv = skillLevelOf(ref, false, skillLvBonuses());
    return {lo: lv.base + lv.lo, hi: lv.base + lv.hi};
  } catch (e) { return {lo: 20, hi: 20}; }
}
function openAura() {
  if (guardBuildMode && guardBuildMode()) return;
  const A = auraSummary();
  const fr = r => '+' + (r.lo === r.hi ? r1f(r.hi) : r1f(r.lo) + '~' + r1f(r.hi)) + '%';
  const box = document.getElementById('auraBody');
  if (!A.nAuras) { box.innerHTML = '<div class="psum">장착한 오라 스킬(패시브)이 없습니다</div>'; }
  else {
    const rowTip = rows => rows.map(([src, e, r]) => '[' + src + '] ' + e + (r ? ' → ' + fr(r) : '')).join('\n');
    let h = `<div class="aura-glob tip2" title="${escapeHtml('전역 오라 효과 내역' + (A.gRows.length ? '\n' + rowTip(A.gRows) : '\n해당 옵션 없음'))}">전역 오라 효과 <b class="opt-v">${fr(A.g)}</b> <span class="psum">· ${A.gRows.length}건 (마우스: 내역)</span></div>`;
    h += `<div class="aura-glob tip2" title="${escapeHtml('전역 MP 봉인 보상 내역' + (A.mpRows.length ? '\n' + rowTip(A.mpRows) : '\n해당 옵션 없음'))}">전역 MP 봉인 보상 <b class="opt-v">${fr(A.mp)}</b> <span class="psum">· 변환 옵션의 기준값 — 보조(봉인 제어)의 봉인 보상은 연결된 오라에만 (마우스: 내역)</span></div>`;
    if (A.skipped.length) h += `<div class="aura-glob tip2" title="${escapeHtml(A.skipped.map(([s, e]) => '[' + s + '] ' + e).join('\n'))}"><span class="psum">⚠ 조건 미충족·판정 불가로 제외된 옵션 ${A.skipped.length}건 (마우스: 내역)</span></div>`;
    if (A.convMiss) h += `<div class="aura-glob"><span class="psum" style="color:#f0883e">⚠ 변환 옵션으로 보이는 문구를 인식하지 못했습니다 — 원문: ${escapeHtml(A.convMiss.slice(0, 120))}</span></div>`;
    else if (!A.conv && A.slotInfo) h += `<div class="aura-glob"><span class="psum">변환 옵션(봉인 보상 → 오라 효과) 미감지 · 장비: ${escapeHtml(A.slotInfo)}</span></div>`;
    A.auras.forEach(a => {
      const fm = v => Math.round(v * 100) / 100;
      const buff = auraBuffText(a.sk);
      const scaledHi = scaleSigned(buff, a.multHi);
      h += `<div class="aura-card">` +
        `<div class="aura-head"><b>${escapeHtml(a.sk.name)}</b> <span class="psum">${escapeHtml(a.slot)} · 보조: ${escapeHtml(a.sups.map(x => x.name).join(', ') || '없음')}${a.cond ? ' · ⚠ ' + escapeHtml(a.cond) : ''}</span></div>` +
        (a.mpAll.hi ? `<div class="aura-sub tip2" title="${escapeHtml('MP 봉인 보상 구성\n전역 옵션 → ' + fr(A.mp) + (a.mp.hi ? '\n이 오라의 봉인 제어 → ' + fr(a.mp) : '') + '\n(보조의 봉인 보상은 이 오라에만 적용)')}">이 오라의 MP 봉인 보상 <b class="opt-v">${fr(a.mpAll)}</b></div>` : '') +
        (a.conv ? `<div class="aura-sub tip2" title="${escapeHtml('변환 내역\n[' + (A.conv ? A.conv.src : '') + '] ' + (A.conv ? A.conv.e : '') + '\n이 오라의 봉인 보상 ' + fr(a.mpAll) + ' 기준')}">ㄴ 변환으로 얻은 오라 효과 <b class="opt-v">${fr(a.conv)}</b> <span class="psum">(봉인 보상 → 오라 효과)</span></div>` : '') +
        `<div class="aura-sub tip2" title="${escapeHtml('오라 효과 구성' + '\n전역 옵션 → ' + fr(A.g) + (a.rows.length ? '\n' + rowTip(a.rows) : ''))}">오라 효과 합 <b class="opt-v">${fr(a.tot)}</b> → 배율 <b class="opt-v">×${fm(a.multLo)}${a.multHi !== a.multLo ? '~' + fm(a.multHi) : ''}</b> <span class="psum">(마우스: 구성)</span></div>` +
        `<div class="aura-eff">${escapeHtml(scaledHi)}</div>` +
        `<div class="aura-base psum">기본: ${escapeHtml(buff)}</div>` +
        `</div>`;
    });
    box.innerHTML = h;
  }
  document.getElementById('auraModal').style.display = 'flex';
  modalHistPush();
}
function r1f(v) { return Math.round(v * 10) / 10; }
function closeAura() { document.getElementById('auraModal').style.display = 'none'; }

// 옵션 문구에서 마크업·엔티티를 걷어내고 순수 텍스트만 남긴다
// (데이터에 <span class="tip2" …> 툴팁 마크업이 섞여 있고, 닫히지 않은 조각도 있어 DOM 파싱이 가장 확실)
// 빌드의 모든 옵션 문구를 [출처, 텍스트]로 모은다 (대미지 합산·스킬 레벨 계산 공용)
// ── 계산이 보는 옵션 줄 ──
// 규칙: 계산에 쓰이는 함수는 전부 이걸 쓴다 — 모아보기에서 뺀 줄은 어떤 계산에도 들어가지 않는다.
// (원본을 직접 읽던 함수들이 제각각이라 "줄을 빼도 스킬 레벨·오라·저항은 그대로"인 불일치가 있었다)
// optSummary를 만드는 도중에 불리면 원본을 그대로 준다 — 켜짐/꺼짐은 그 결과로 정해지기 때문이다
// 이 함수는 계산 전반에서 되풀이해 불린다 (한 번 렌더에 70번 넘게). 그때마다 옵션 150개에
// optIsOff를 돌리면 그 안에서 캐시 키를 만드느라 preset을 통째로 stringify한다 —
// 메모이제이션 키를 만드는 값이 메모이제이션하는 계산보다 비싼 상태였다 (실측 렌더 928ms 중 736ms).
// optSummary가 이미 계산해 둔 키(_osKey)를 재삼 쓰고, 결과 자체를 캐시한다.
// 소비자는 읽기만 하므로(forEach·find·filter) 같은 배열을 내줘도 안전하다
let _llKey = null, _llOut = null;
function liveOptionLines() {
  if (optSumBuilding) return presetOptionLines();
  try {
    const gs = optSummary();   // 캐시 적중 시 사실상 0ms — _osKey가 지금 프리셋 기준으로 채워진다
    const key = _osKey;   // optSummary의 키에 이미 프리셋·대상 스킬·온오프가 다 들어 있다
    if (key != null && _llKey === key && _llOut) return _llOut;
    const raw = presetOptionLines();
    const off = new Set();
    gs.forEach(g => { if (optIsOff(g)) [...g.srcs.keys()].forEach(k => off.add(k)); });
    const out = off.size ? raw.filter(([src, e]) => !off.has(src + OPT_SEP + e)) : raw;
    if (key != null) { _llKey = key; _llOut = out; }
    return out;
  } catch (e) { return presetOptionLines(); }
}
// 조향(벨트) 효과 문구 — 데이터가 두 형태로 섞여 있다.
// "[동상] 냉기 적중 대미지를 입힐 시 …"처럼 효과가 직접 든 것과 "부패의 과실"처럼 이름만 든 것.
// 이름만이면 용어 툴팁의 본문을 쓴다 (부패의 과실 = "… 모든 스킬 레벨 +3")
function blendEffectText(blend) {
  const e = blend && blend.effect ? String(blend.effect).trim() : '';
  if (!e) return e;
  try {
    // 프리셋에 저장된 조향은 {effect, req}뿐이라 목록에서 원본을 찾는다
    const src = (typeof BLENDS !== 'undefined' ? BLENDS : []).find(x => String(x.effect).trim() === e);
    const tip = src && src.tips && src.tips[0];
    // effect가 툴팁 제목과 똑같을 때만 = 이름만 적힌 경우다. 효과 문장이 들어 있는 조향
    // ("주술 대미지를 입힐 시, 연약을 부여한다")은 툴팁이 그 안에 나온 용어의 설명이라 덮어쓰면 안 된다
    if (!tip || String(tip[0]).trim() !== e) return e;
    // 툴팁 첫 줄은 이름이 한 번 더 반복된다 — 떼고 본문만.
    // 줄바꿈은 마침표로 바꿔 이어 붙인다 (공백으로 붙이면 앞 줄 끝말이 다음 줄 앞머리로
    // 읽혀 범위 판정이 깨진다 — "간격 0.1초 모든 스킬 레벨 +3" → 범위가 "초 모든")
    const body = String(tip[1]).split(/\r?\n/).map(t => t.trim()).filter(t => t && t !== e)
      .map(t => /[.。]$/.test(t) ? t : t + '.').join(' ').trim();
    return body || e;
  } catch (x) { return e; }
}
// 슬롯 하나의 옵션 줄 — presetOptionLines가 슬롯마다 부르고, 무기 대미지 조립도 이걸 쓴다
// (무기 한 자리만 따로 봐야 해서 뺐다)
function slotOptionLines(sid, v) {
  const out = [];
  if (!v) return out;
  const optEff = o => { if (!o) return null; const e = (o.rolled && o.effect) || o.effect || (KEY_MAP.get(o.k) || {}).effect; return o.v ? applyRollText(e, o.v) : e; };
  const add = (src, e) => { if (e) out.push([src, plainText(e).replace(/[–—−~]/g, '-')]); };
  {
    const part = v.part || (PRESET_SLOTS.find(x => x.id === sid) || {}).part || sid; // 어느 부위에서 온 옵션인지
    if (v.kind === 'item') { // 스냅이 없거나 비어 있는 옛 빌드는 현재 데이터의 같은 이름 아이템으로 폴백
      const base = (v.snap && v.snap.opts && v.snap.opts.length) ? v.snap : (ITEMS.find(x => x.name === v.name) || {});
      const ro = rolledItem(v, base) || {};
      // 침식 강화된 옵션은 침식 문구로 계산한다 (corr는 opts와 1:1 — 저항 합산과 같은 규칙).
      // 로그가 복원해 준 실제 문구(rand)가 있으면 그게 이미 침식을 반영하므로 건드리지 않는다
      const ero = v.ero || [], rd = v.rand || {}, corr = ro.corr || base.corr;
      const opts = (ro.opts || []).map((o, i) =>
        (ero.includes(i) && rd[i] == null && corr && corr[i]) ? corr[i][1] : o);
      opts.forEach(o => String(typeof o === 'string' ? o : optEff(o)).split(/<br\s*\/?>|\n/).forEach(x => add('레전드 ' + part, x))); // 한 자리에 두 줄(랜덤 옵션 침식화)
    }
    // 제작 옵션은 화면과 같은 티어(T0/T1/T2) 기준 수치로, 침식된 옵션은 침식(T0+) 수치로
    if (v.opts) {
      let ci = 0;
      const ero = v.ero || [];
      ['basic', 'main', 'sub'].forEach(k => (v.opts[k] || []).forEach(o => add('제작 ' + part, ero.includes(ci++) ? eroEffect(o) : tierEffect(o))));
      ['chip', 'ench', 'blood', 'base', 'extra'].forEach(k => (v.opts[k] || []).forEach(o => add('제작 ' + part, k === 'extra' ? tierEffect(o) : optEff(o))));
    }
    if (v.blend) add('조향 ' + part, blendEffectText(v.blend));
    if (v.tower) add('시퀀스 ' + part, v.tower.effect);
    // 베이스(기본) 아이템의 수치·고정 옵션 — 아머·회피·보호막은 여기서만 나온다 (로그 BaseId로 확정)
    const bi = v.base && BASEIDX[v.base];
    if (bi) [...(bi.stats || []), ...(bi.imps || [])].forEach(e => add('베이스 ' + part, e));
  }
  return out;
}
function presetOptionLines() {
  const out = [];
  const optEff = o => { if (!o) return null; const e = (o.rolled && o.effect) || o.effect || (KEY_MAP.get(o.k) || {}).effect; return o.v ? applyRollText(e, o.v) : e; };
  const add = (src, e) => { if (e) out.push([src, plainText(e).replace(/[–—−~]/g, '-')]); };
  Object.entries(preset.slots || {}).forEach(([sid, v]) => { if (v) slotOptionLines(sid, v).forEach(x => out.push(x)); });
  pactOptionLines().forEach(([src, e]) => add(src, e)); // 정령 노드 (활성인 것만)
  heroOptionLines().forEach(([src, e]) => add(src, e)); // 히어로 특성 (고른 노드만, 레벨 반영)
  Object.values(preset.skills || {}).forEach(v => { // 모듈 프로토콜 — "자신과 아군" 부여분이 내 옵션이다
    if (!v) return;
    [v.main, ...(v.sup || [])].forEach(ref => {
      if (ref && ref.proto) ref.proto.forEach(pr => add('프로토콜 · ' + ref.name, pr.effect));
    });
  });
  (preset.talents || []).forEach(t => { // 같은 옵션을 여러 장 보유하면(×N) 그 수만큼 적용된다
    const src = talGroup(t.type) === 1 ? '석판' : talGroup(t.type) === 2 ? '운명' : '재능';
    const n = Math.max(1, Math.min(99, t.cnt || 1));
    const eff = t.mul ? scaleEffect(t.effect, t.mul) : t.effect; // 전염 옵션은 줄어든 수치로
    for (let i = 0; i < n; i++) add(src + (t.mul ? ' 전염' : ''), eff);
  });
  Object.values(preset.mems || {}).forEach(m => ['basic', 'unique', 'random'].forEach(k => (m[k] || []).forEach(o => add('추억', optEff(o)))));
  if (preset.prism) {
    // 제노 프리즘: 환영 — 고유 옵션이 "해당 프리즘의 랜덤 옵션의 효과 +75%" (사용자 확인).
    // 효과 수치형 옵션에만 ×1.75 — 범위 확장(3×4 직사각형)·횟수(2회 포인트) 문구는 곱하면 안 된다
    const amp = preset.prism.name === '제노 프리즘: 환영' ? 1.75 : 1;
    const ampable = e => !/직사각형|포인트 추가 가능|영향 범위/.test(e || '');
    // "범위 내의 모든 X 재능 추가 획득: …"은 범위 안에서 실제로 찍은 그 등급 포인트만큼 곱한다
    const gain = prismGainOn();
    (preset.prism.opts || []).forEach(o => {
      if (!o) return;
      let e = amp !== 1 && ampable(o.effect) ? scaleEffect(o.effect, amp) : o.effect;
      const mm = /범위 내의 모든 (레전드 중위|중위|하위) 재능 추가 획득:\s*(.+)$/.exec(e || '');
      if (mm && gain) {
        const t = mm[1] === '하위' ? 1 : mm[1] === '중위' ? 3 : 4;
        const pts = (gain[t] || {p: 0}).p;
        if (!pts) return; // 범위 안에 찍은 노드가 없으면 효과도 없다
        // 스탯 집계 파서는 부호 있는 수치만 읽는다 — 환산 결과의 첫 수치에 부호를 붙인다 ("힘 918.9" → "힘 +918.9")
        e = scaleEffect(mm[2].trim(), pts).replace(/(^|\s)(\d)/, '$1+$2');
      }
      add('프리즘', e);
    });
  }
  if (preset.revival) add('부활', preset.revival.effect);
  const invIv = [preset.gbPrism, preset.gbPrism2].filter(Boolean).find(g => g.k === 'i' && g.iv);
  (preset.gboard || []).forEach(x => { // 재능 보드는 찍은 포인트만큼 곱해서
    const i = SLATEIDX.idx[x[0]];
    if (i === undefined || !(x[1] > 0)) return;
    let mul2 = x[1];
    if ((x[4] || 0) & 1) { // 역상으로 반사돼 온 노드 — "반사 후 재능 효과 %"를 곱한다 (수치는 로그 실측)
      const t = boardTier(String(x[0]));
      const pct = invIv ? ({1: invIv.iv.low, 3: invIv.iv.mid, 4: invIv.iv.leg})[t] : undefined;
      if (pct !== undefined) {
        const eff = 1 + pct / 100;
        if (eff <= 0) return; // -100% = 반사 효과 없음
        mul2 = x[1] * eff;
      }
    }
    add('보드', scaleEffect(ALL_DATA[i].effect, mul2));
  });
  return out;
}

// 프리즘(역상 아닌 쪽) 범위 안에서 실제로 찍은 등급별 노드·포인트 — 부여 옵션 환산용.
// gbPrism.c와 gboard의 r·c는 둘 다 로그 좌표(행·열)라 그대로 비교한다
function prismGainOn() {
  const g = [preset.gbPrism, preset.gbPrism2].filter(Boolean).find(x => x.k !== 'i');
  if (!g || !(preset.gboard || []).length) return null;
  const cells = new Set(g.c.map(([r, c]) => r + ',' + c));
  const out = {1: {n: 0, p: 0}, 3: {n: 0, p: 0}, 4: {n: 0, p: 0}};
  preset.gboard.forEach(x => {
    if (String(x[0]).slice(0, 2) !== String(g.b) || !(x[1] > 0)) return;
    if (!cells.has((x[2] || 0) + ',' + (x[3] || 0))) return;
    const t = boardTier(String(x[0]));
    if (out[t]) { out[t].n++; out[t].p += x[1]; }
  });
  return out;
}

// ── 옵션이 부여하는 보조 스킬 ("25 레벨 압살이 메인 스킬을 보조한다") ──
// 실제로 보조칸을 차지하지 않고 붙는 보조라 빌드 행에 별도 색 칩으로 표시한다
function grantedSupports() {
  const out = [];
  presetOptionLines().forEach(([src, e]) => {
    const re = /\(?(\d+)(?:[-~](\d+))?\)?\s*레벨(?:의)?\s*([^,.]{1,20}?)(?:이|가)\s*(메인|해당|모든|[가-힣]+)\s*스킬을\s*보조한다/g;
    let m;
    while ((m = re.exec(e))) {
      out.push({src, e, lo: +m[1], hi: +(m[2] || m[1]), name: m[3].trim(), target: m[4],
                 cond: /경우|때마다|간격으로|확률로/.test(e)});
    }
  });
  return out;
}
// 이 슬롯의 메인 스킬이 받는 부여형 보조 (메인=액티브 1번 / 태그 대상은 태그가 맞는 슬롯)
function grantedFor(sl, sk, gs) {
  if (!sk || !sk.main) return [];
  const info = SKILLS[findSkill(sk.main)] || {};
  const tags = info.tags || [];
  return gs.filter(g => g.target === '메인' ? sl.id === 'a1'
    : g.target === '모든' ? true
    : g.target === '해당' ? false // "해당 스킬" = 그 장비에 붙은 스킬 지정 — 대상을 특정할 수 없어 제외
    : tags.indexOf(g.target) >= 0 || tags.indexOf(g.target.replace('근접', '근접전')) >= 0);
}
// ── 스킬 레벨 계산: 모든 스킬 기본 20레벨 + 빌드 옵션의 레벨 보너스 ──
// (촉발체·부귀 보조·숭고 보조는 레벨 개념이 없어 제외 — 사용자 확인)
const SKLV_NOBASE = ['촉발체', '부귀 보조', '숭고 보조'];
const SKLV_TAG = { // 옵션 문구의 범위 → 스킬 태그
  '공격': '공격', '주술': '주술', '화염': '화염', '냉기': '냉기', '번개': '번개', '부식': '부식',
  '물리': '물리', '투사체': '투사체', '근접': '근접전', '지속': '지속', '소환체 소환': '소환',
  '실드': '실드', '자극': '자극', '주입': '주입', '마령': '마령', '영약': '영약', '오라': '오라',
  '수평 투사체': '수평 사격', '공격 투사체': '투사체', '채널링': '채널링', '저주': '저주', '함성': '함성',
};
const SKLV_KIND = {'액티브': '액티브', '패시브': '패시브', '보조': '보조'};
// 빌드 옵션에서 "OO 스킬 레벨 +N" 줄만 모은다 (조건부·국소 문구는 제외)
// 뺀 줄은 스킬 레벨에도 반영된다 ("모든 스킬 레벨 +10"을 빼면 Lv가 내려간다) — liveOptionLines 규칙
function skillLvBonuses() {
  const out = [];
  liveOptionLines().forEach(([src, e]) => {
    if (!/스킬 레벨 \+/.test(e) || /해당 장비|당,| 당 |때마다|확률로|레벨당/.test(e)) return;
    const m = /([가-힣 ]*?)스킬 레벨 \+\(?(\d+)(?:-(\d+))?\)?/.exec(e);
    if (!m) return;
    const scope = (m[1] || '').trim().replace(/^모든$/, '');
    if (scope && !SKLV_TAG[scope] && !SKLV_KIND[scope] && scope !== '메인') return; // 해석 못 하는 범위는 제외
    out.push({src, e, scope: scope || '모든', lo: +m[2], hi: +(m[3] || m[2])});
  });
  return out;
}
// 스킬 하나에 적용되는 보너스만 골라 최종 레벨 계산 (isMain = 메인 스킬 = 액티브 1번 칸)
function skillLevelOf(sk, isMain, bonuses) {
  const info = SKILLS[findSkill(sk)] || {};
  const tags = info.tags || [];
  const hit = bonuses.filter(b => b.scope === '모든' ||
    (SKLV_KIND[b.scope] && SKLV_KIND[b.scope] === sk.kind) ||
    (SKLV_TAG[b.scope] && tags.indexOf(SKLV_TAG[b.scope]) >= 0) ||
    (b.scope === '메인' && isMain));
  // 기본 레벨: 로그가 준 아이템 자체 레벨(17·21 등)이 있으면 그것, 없으면 20.
  // 부귀·숭고·촉발체는 일반 스킬 레벨이 없다 — 그 lv는 0~5짜리 육성 레벨이라 여기 쓰면 안 된다
  const own = sk && SKLV_NOBASE.indexOf(sk.kind) < 0 && +sk.lv > 0 ? +sk.lv : 20;
  return {base: own, hit, lo: hit.reduce((s, b) => s + b.lo, 0), hi: hit.reduce((s, b) => s + b.hi, 0), tags};
}
// 스킬 호버 카드용: 이 스킬이 현재 빌드에 장착돼 있으면 최종 레벨을 돌려준다
function presetSkillLevel(s) {
  if (!s || !s.name || SKLV_NOBASE.indexOf(s.kind) >= 0) return null;
  let found = null, isMain = false;
  SKILL_SLOTS.forEach(sl => {
    const v = (preset.skills || {})[sl.id];
    if (!v || found) return;
    if (v.main && v.main.name === s.name) { found = v.main; isMain = sl.id === 'a1'; } // 메인 스킬 = 액티브 1번 칸
    else { const sup = (v.sup || []).find(x => x && x.name === s.name); if (sup) found = sup; }
  });
  if (!found) return null;
  const r = skillLevelOf(found, isMain, skillLvBonuses());
  if (!r.hit.length && r.base === 20) return null; // 기본 20에 보너스도 없으면 표기 생략 (종전과 동일)
  const text = r.lo === r.hi ? String(r.base + r.lo) : (r.base + r.lo) + '~' + (r.base + r.hi);
  const g = {};
  r.hit.forEach(b => { const key = b.src + '|' + b.e; g[key] = (g[key] || 0) + 1; });
  return {text, tip: '기본 ' + r.base + ' + ' + (r.lo === r.hi ? r.lo : r.lo + '~' + r.hi) + '\n' +
    Object.entries(g).map(([key, n]) => '· [' + key.split('|')[0] + '] ' + key.split('|')[1] + (n > 1 ? ' ×' + n : '')).join('\n')};
}
function openSkillLv() {
  if (guardBuildMode && guardBuildMode()) return;
  const bonuses = skillLvBonuses();
  const rowsHtml = [];
  SKILL_SLOTS.forEach(sl => {
    const v = (preset.skills || {})[sl.id];
    if (!v) return;
    const list = [[v.main, true]].concat((v.sup || []).map(x => [x, false]));
    list.forEach(([sk, isMain]) => {
      if (!sk) return;
      if (SKLV_NOBASE.indexOf(sk.kind) >= 0) {
        rowsHtml.push(`<tr class="sklv-off"><td>${escapeHtml(isMain ? (sl.label || sl.id) : '└ 보조')}</td><td>${escapeHtml(sk.name)}</td>` +
          `<td class="psum">${escapeHtml(sk.kind)}</td><td colspan="2" class="psum">레벨 없음</td></tr>`);
        return;
      }
      const r = skillLevelOf(sk, isMain && sl.id === 'a1', bonuses); // 메인 스킬 = 액티브 1번 칸
      const plus = r.lo === r.hi ? '+' + r.lo : '+' + r.lo + '~' + r.hi;
      const fin = r.lo === r.hi ? r.base + r.lo : (r.base + r.lo) + '~' + (r.base + r.hi);
      const grp = {};
      r.hit.forEach(b => { const key = b.src + '|' + b.e; grp[key] = (grp[key] || 0) + 1; });
      const tip = r.hit.length
        ? Object.entries(grp).map(([key, n]) => '· [' + key.split('|')[0] + '] ' + key.split('|')[1] + (n > 1 ? ' ×' + n : '')).join('\n')
        : '적용되는 레벨 옵션 없음';
      rowsHtml.push(`<tr class="tip2" title="${escapeHtml(sk.name + (r.tags.length ? ' (' + r.tags.join(', ') + ')' : '') + '\n\n' + tip)}">` +
        `<td>${escapeHtml(isMain ? (sl.label || sl.id) : '└ 보조')}</td><td>${escapeHtml(sk.name)}</td>` +
        `<td class="psum">${escapeHtml(sk.kind)}</td><td class="sklv-plus">${r.base} ${r.lo || r.hi ? plus : ''}</td>` +
        `<td class="sklv-fin">${fin}</td></tr>`);
    });
  });
  document.getElementById('skillLvBody').innerHTML = rowsHtml.join('') || '<tr><td colspan="5" class="psum">장착한 스킬이 없습니다</td></tr>';
  const byScope = {};
  bonuses.forEach(b => { const o = byScope[b.scope] || (byScope[b.scope] = {lo: 0, hi: 0, n: 0}); o.lo += b.lo; o.hi += b.hi; o.n++; });
  document.getElementById('skillLvSum').innerHTML = bonuses.length
    ? '적용 중인 레벨 옵션: ' + Object.entries(byScope).map(([k, v]) =>
        escapeHtml(k + ' 스킬 +' + (v.lo === v.hi ? v.lo : v.lo + '~' + v.hi) + (v.n > 1 ? ' (' + v.n + '개)' : ''))).join(' · ')
    : '<span class="psum">빌드에 스킬 레벨 옵션이 없습니다</span>';
  document.getElementById('skillLvModal').style.display = 'flex';
  modalHistPush();
}
function closeSkillLv() { document.getElementById('skillLvModal').style.display = 'none'; }

// ── 기본 정보: 장착 장비의 총 저항 계산 ──
// 저항 4종(화염·냉기·번개·부식), 원소 저항은 부식 제외 3종에 합산, 기본 상한 60(+최대 저항 보너스)
const RES_KEYS = ['fire', 'cold', 'light', 'corr'];
const RES_LABEL = {fire: '화염 저항', cold: '냉기 저항', light: '번개 저항', corr: '부식 저항'};
const RES_COLOR = {fire: '#ff6e5e', cold: '#7db4ff', light: '#ffd166', corr: '#7ee787'};
const RES_MAP = {'화염': 'fire', '냉기': 'cold', '번개': 'light', '부식': 'corr'};

function parseResistLine(text, out, trace) {
  let t = text.replace(/[–—−~]/g, '-');
  // 부호(또는 괄호)까지 포함한 공용 수치 — "(-24--18)%"처럼 부호 없이 괄호로 오는 음수 범위도 잡는다
  const NUM = NUM_SIGN_NEG + NUM_BODY + '\\s*%';
  const VAL = NUM_SIGN_NEG + NUM_BODY + '\\s*(%)?'; // %가 없으면 플랫 수치
  // 오라 적용 문구는 수치에 부호가 없다("최대 보호막 319.7 · 아머 수치 638.6") — 스탯 이름 바로 뒤의
  // 맨 수치에만 부호를 붙여 아래 앵커에 태운다. 조건 문구("최대 HP 10% 이하"·"힘 10 포인트 당")와
  // 괄호 범위는 손대지 않는다. 꼬리 [\d.%] 금지는 백트래킹 차단("힘 10 당"의 10을 1로 잘라 잡는 것 방지)
  t = t.replace(/((?:최대 (?:HP|MP|보호막)(?:와 최대 (?:HP|MP|보호막))?|(?:아머|회피) 수치|(?:힘|민첩|지혜)(?:(?:와|과| 및) (?:힘|민첩|지혜))?|모든 속성)(?: 추가)? )(\d+(?:\.\d+)?%?)(?![\d.%]|\s*(?:이하|이상|미만|초과|당|마다|포인트|초|회))/g, '$1+$2');
  const add = (keys, sign, a, b, isCap) => {
    const r = numRange(sign, a, b);
    keys.forEach(k => {
      const o = isCap ? out.cap[k] : out.res[k];
      o.min += r.lo;
      o.max += r.hi;
    });
  };
  // 우선순위 순서로 매칭하고, 매칭된 구간은 제거해 중복 집계 방지
  const take = (pattern, handler) => {
    t = t.replace(new RegExp(pattern, 'g'), (...args) => {
      handler(args);
      if (trace) trace.hits.push(pattern);   // 어떤 앵커가 걸렸는지 (감사용)
      return ' ';
    });
  };
  // HP·보호막 (플랫/% 분리 집계) — 반환·회복·초당·적 대상 문구는 앵커('최대 … +')에 안 걸림
  const addStat = (o, sign, a, b) => {
    const r = numRange(sign, a, b);
    o.min += r.lo;
    o.max += r.hi;
  };
  take('최대 HP와 최대 보호막 ' + VAL, m => {
    const sign = m[1], tgt = m[4] ? 'pct' : 'flat';
    addStat(out.hp[tgt], sign, m[2], m[3]);
    addStat(out.sh[tgt], sign, m[2], m[3]);
  });
  take('최대 HP와 최대 MP ' + VAL, m => { // 한 값이 둘 다 올리는 문구 (아마란스 계산과 같은 규칙)
    const sign = m[1], tgt = m[4] ? 'pct' : 'flat';
    addStat(out.hp[tgt], sign, m[2], m[3]);
    addStat(out.mp[tgt], sign, m[2], m[3]);
  });
  take('최대 MP 추가 ' + VAL, m => addStat(out.mp[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  take('최대 MP ' + VAL, m => addStat(out.mp[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  take('최대 HP 추가 ' + VAL, m => addStat(out.hp[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  take('최대 HP ' + VAL, m => addStat(out.hp[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  take('해당 장비 보호막 ' + VAL, m => { if (!m[4]) addStat(out.sh.flat, m[1], m[2], m[3]); }); // 해당 장비 % 증가는 국소 수치라 제외
  take('최대 보호막 추가 ' + VAL, m => addStat(out.sh[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  take('최대 보호막 ' + VAL, m => addStat(out.sh[m[4] ? 'pct' : 'flat'], m[1], m[2], m[3]));
  const AV = {'아머': 'armor', '방어': 'armor', '회피': 'eva'}; // 번역이 아머/방어로 갈려 있다 (같은 스탯)
  take('해당 장비 (아머|방어|회피) 수치 ' + VAL, m => { if (!m[5]) addStat(out[AV[m[1]]].flat, m[2], m[3], m[4]); }); // 국소 % 증가는 제외
  take('(아머|방어|회피) 수치 추가 ' + VAL, m => addStat(out[AV[m[1]]][m[5] ? 'pct' : 'flat'], m[2], m[3], m[4]));
  take('(아머|방어|회피) 수치 ' + VAL, m => addStat(out[AV[m[1]]][m[5] ? 'pct' : 'flat'], m[2], m[3], m[4]));
  // 힘·민첩·지혜 ("N 포인트 당" 조건부 옵션은 앵커에 안 걸림)
  const AT = {'힘': 'str', '민첩': 'dex', '지혜': 'int'};
  take('모든 속성 ' + VAL, m => ['str', 'dex', 'int'].forEach(k => addStat(out[k][m[4] ? 'pct' : 'flat'], m[1], m[2], m[3])));
  take('(힘|민첩|지혜)(?:와|과| 및) (힘|민첩|지혜) (?:추가 )?' + VAL, m => {
    addStat(out[AT[m[1]]][m[6] ? 'pct' : 'flat'], m[3], m[4], m[5]);
    addStat(out[AT[m[2]]][m[6] ? 'pct' : 'flat'], m[3], m[4], m[5]);
  });
  take('(힘|민첩|지혜) (?:추가 )?' + VAL, m => addStat(out[AT[m[1]]][m[5] ? 'pct' : 'flat'], m[2], m[3], m[4]));
  // 받은 원소 대미지 전환 ("받은 부식 대미지의 45% 가 냉기 대미지로 전환") — 출처 원소별로 합산.
  // 대상 원소가 여럿으로 쪼개져도 합이 100% 이상이면 그 원소 저항은 적용될 일이 없다 (사용자 확인)
  if (out.conv) take('받은 (물리|화염|냉기|번개|부식) 대미지의 \\(?(\\d+(?:\\.\\d+)?)(?:-(\\d+(?:\\.\\d+)?))?\\)?\\s*%? ?[가를] (?:랜덤 )?(원소|화염|냉기|번개|부식) ?대미지로 전환', m => {
    const c = out.conv[m[1] === '물리' ? 'phys' : RES_MAP[m[1]]];
    if (!c) return;
    const lo = parseFloat(m[2]), hi = parseFloat(m[3] || m[2]);
    c.min += lo; c.max += hi;
    c.to[m[4]] = (c.to[m[4]] || 0) + hi;
    c.rows.push(m[0]);
  });
  take('원소와 부식 최대 저항 ' + NUM, m => add(RES_KEYS, m[1], m[2], m[3], true));
  take('(화염|냉기|번개|부식) 최대 저항 ' + NUM, m => add([RES_MAP[m[1]]], m[2], m[3], m[4], true));
  take('원소 저항 최대치 ' + NUM, m => add(['fire', 'cold', 'light'], m[1], m[2], m[3], true));
  take('원소 저항과 부식 저항 ' + NUM, m => add(RES_KEYS, m[1], m[2], m[3], false));
  take('화염 및 냉기 저항 ' + NUM, m => add(['fire', 'cold'], m[1], m[2], m[3], false));
  take('원소\\s?저항 ' + NUM, m => add(['fire', 'cold', 'light'], m[1], m[2], m[3], false));
  take('(화염|냉기|번개|부식) 저항 ' + NUM, m => add([RES_MAP[m[1]]], m[2], m[3], m[4], false));
  // 앵커를 다 거친 뒤 남은 글자 = 이 파서가 못 읽은 부분. 여기 부호 붙은 수치가 남아 있으면
  // 저항·스탯 옵션인데 앵커가 없다는 뜻이다 (audit_resist.js가 이걸 본다)
  if (trace) trace.left = t.replace(/\s+/g, ' ').trim();
}

function slotResistLines(v) {
  if (!v) return [];
  let lines;
  if (v.kind === 'item') {
    const idx = ITEMS.findIndex(x => x.name === v.name);
    const it = idx >= 0 ? ITEMS[idx] : v.snap;
    // 침식 강화된 옵션은 침식 수치로 합산 (corr는 opts와 1:1 순서 대응)
    const opts = (it.opts || []).map((o, i) => v.ero && v.ero.includes(i) && it.corr && it.corr[i] ? it.corr[i][1] : o);
    lines = [...(it.attrs || []), ...opts].map(stripHtml);
  } else if (v.kind === 'blood') {
    // 침식 통합 순번은 기본→레전드→추가 (합산 라인 순서와 별개), 침식된 옵션은 침식 수치로
    const nb = (v.opts.base || []).length, nl = v.opts.blood.length, ero = v.ero || [];
    // corr는 아이템 카드 유래라 마크업 포함 → 합산 라인은 평문으로
    lines = [...v.opts.blood.map((o, i) => {
               const corr = ero.includes(nb + i) ? bloodLegendCorr(o) : null;
               return corr ? stripHtml(corr) : (KEY_MAP.get(o.k) || o).effect;
             }),
             ...(v.opts.base || []).map(o => o.effect),
             ...(v.opts.extra || []).map((o, i) => ero.includes(nb + nl + i) ? eroEffect(o) : tierEffect(o))];
  } else {
    let ci = 0;
    const ero = v.ero || []; // 침식된 제작 옵션은 T0+ 수치로 합산
    lines = ['basic', 'main', 'sub'].flatMap(c => v.opts[c].map(o => ero.includes(ci++) ? eroEffect(o) : tierEffect(o)));
  }
  if (v.blend) lines.push(blendEffectText(v.blend)); // 조향(벨트 전용)도 기본 정보 합산에 포함
  if (v.tower) lines.push(v.tower.effect); // 타워 시퀀스(무기 전용)도 포함
  return lines;
}

let _prKey = null, _prOut = null;
function computePresetResists() {
  const ck = calcCacheKeyLive();
  if (ck && _prKey === ck && _prOut) return JSON.parse(JSON.stringify(_prOut)); // 복사본 — 캐시 오염 방지
  const st = () => ({flat: {min: 0, max: 0}, pct: {min: 0, max: 0}});
  const out = {res: {}, cap: {}, conv: {}, hp: st(), mp: st(), sh: st(), armor: st(), eva: st(), str: st(), dex: st(), int: st()};
  RES_KEYS.forEach(k => { out.res[k] = {min: 0, max: 0}; out.cap[k] = {min: 0, max: 0}; out.conv[k] = {min: 0, max: 0, to: {}, rows: []}; });
  out.conv.phys = {min: 0, max: 0, to: {}, rows: []}; // 물리는 저항 칸이 없어 따로 (아머로 막는다)
  // 빌드의 모든 출처(장비·제작·조향·시퀀스·재능·석판·운명·프리즘·보드·추억·부활)를 한 번에 훑는다.
  // 같은 옵션이 여러 장이면 그 수만큼 줄이 나오므로 개수도 자연히 반영된다.
  liveOptionLines().forEach(([, e]) => parseResistLine(e, out));
  // 장착 오라의 최종 적용 수치(저항·아머·회피·보호막 등) — 오라 효과 배율 반영
  try {
    auraSummary().auras.forEach(a => {
      // 문장 구분으로 자르되 소수점은 건드리지 않는다 ("+20.12%"가 20과 12로 쪼개지면 값이 사라진다)
      scaleSignedRange(auraBuffAtLevel(a.sk, a.lv ? a.lv.hi : 20), a.multLo, a.multHi)
        .split(/(?<!\d)\.(?!\d)|。/).forEach(seg => parseResistLine(seg, out));
    });
  } catch (e) {}
  _prOut = out; _prKey = ck;
  return out;
}

// HP·보호막 표기: 플랫 합 + 증가율(%) 합 + 곱한 결과 (예: +520 · +25% → 650)
function fmtStat(st) {
  const s = v => (v >= 0 ? '+' : '') + v;
  const rd = v => Math.round(v * 100) / 100;
  const rng = (o, suf) => (rd(o.min) === rd(o.max) ? s(rd(o.max)) : `${s(rd(o.min))}~${s(rd(o.max))}`) + suf;
  const seg = [];
  if (st.flat.min || st.flat.max) seg.push(rng(st.flat, ''));
  if (st.pct.min || st.pct.max) seg.push(rng(st.pct, '%'));
  let out = seg.length ? seg.join(' · ') : '0';
  // 플랫과 %가 둘 다 있으면 곱한 결과까지 (옵션 합산분 기준 — 캐릭터 기본 수치는 로그에 없다)
  if ((st.flat.min || st.flat.max) && (st.pct.min || st.pct.max)) {
    const lo = Math.round(st.flat.min * (1 + st.pct.min / 100));
    const hi = Math.round(st.flat.max * (1 + st.pct.max / 100));
    out += ' → ' + (lo === hi ? hi : lo + '~' + hi);
  }
  return out;
}

// 표기 규칙: 상한 이내 "3~6/60", 초과 시 "60(78)/60", 최대 저항 보너스 반영 시 "66(78)/66"
function fmtResist(r0, capBonus) {
  const rd = x => Math.round(x); // 저항은 정수로 반올림해 표기 (소수점은 읽기만 어렵다 — 사용자 요청)
  const r = {min: rd(r0.min), max: rd(r0.max)};
  const cap = rd(60 + capBonus.max);
  const actual = r.min === r.max ? String(r.max) : `${r.min}~${r.max}`;
  if (r.max <= cap) return `${actual}/${cap}`;
  const cMin = Math.min(r.min, cap);
  const capped = cMin === cap ? String(cap) : `${cMin}~${cap}`;
  return `${capped}(${actual})/${cap}`;
}

// 옵션 모아보기용 저항 합산 — 그룹의 원문(srcs)으로 같은 파서를 태워 끈 줄(off)이 반영되게 한다
function resistSummaryOf(entries) {
  const st = () => ({flat: {min: 0, max: 0}, pct: {min: 0, max: 0}});
  const out = {res: {}, cap: {}, conv: {}, hp: st(), mp: st(), sh: st(), armor: st(), eva: st(), str: st(), dex: st(), int: st()};
  RES_KEYS.forEach(k => { out.res[k] = {min: 0, max: 0}; out.cap[k] = {min: 0, max: 0}; out.conv[k] = {min: 0, max: 0, to: {}, rows: []}; });
  out.conv.phys = {min: 0, max: 0, to: {}, rows: []}; // 물리는 저항 칸이 없어 따로 (아머로 막는다)
  entries.forEach(g => [...g.srcs].forEach(([sk, n]) => {
    const e = sk.slice(sk.indexOf(OPT_SEP) + OPT_SEP.length);
    for (let i = 0; i < n; i++) parseResistLine(e.replace(/[–—−~]/g, '-'), out);
  }));
  return out;
}
function resistTipHtml() {
  const {res, cap, conv, hp, mp, sh, armor, eva, str, dex, int: wis} = computePresetResists();
  // 받은 대미지 전환 반영 — 합 100% 이상이면 값 대신 전환 표기, 일부면 전환율 꼬리표
  const resVal = k => {
    const cv = conv[k];
    if (cv && cv.min >= 100) return `<span style="color:#8b949e">→ ${Object.keys(cv.to).join('·')} 전환</span>`;
    const cvMin = Math.round(cv ? cv.min : 0), cvMax = Math.round(cv ? cv.max : 0); // 전환율도 정수로
    return fmtResist(res[k], cap[k]) + (cv && cv.max > 0 ? ` <span style="color:#8b949e">·전환 ${cvMin === cvMax ? cvMax : cvMin + '~' + cvMax}%</span>` : '');
  };
  const line = (label, color, val) =>
    `<div style="display:flex;justify-content:space-between;gap:18px;padding:2px 0"><span style="color:${color}">${label}</span><b class="m">${val}</b></div>`;
  const stats =
    line('최대 HP', '#ff9e9e', fmtStat(hp)) +
    line('최대 MP', '#9ea8ff', fmtStat(mp)) +
    line('최대 보호막', '#9ecbff', fmtStat(sh)) +
    line('아머', '#d7b98c', fmtStat(armor)) +
    line('회피', '#a5e6c3', fmtStat(eva)) +
    `<div style="margin-top:5px;padding-top:5px;border-top:1px solid #2a3550">` +
    line('힘', '#ffb066', fmtStat(str)) +
    line('민첩', '#8fdc8f', fmtStat(dex)) +
    line('지혜', '#8fb8ff', fmtStat(wis)) + `</div>`;
  const rows = `<div style="margin-top:5px;padding-top:5px;border-top:1px solid #2a3550">` +
    RES_KEYS.map(k => line(RES_LABEL[k], RES_COLOR[k], resVal(k))).join('') + `</div>`;
  return `<div class="ft-title">기본 정보 (장착 장비 합산)</div>` + stats + rows +
    `<div style="margin-top:6px;padding-top:5px;border-top:1px solid #2a3550;color:#8b949e;font-size:11px">원소 저항 → 화염·냉기·번개 합산 · 관통/적 대상 옵션 제외 · 저항 상한 60 + 최대 저항 보너스<br>수치의 %는 증가율 합계 (캐릭터 기본 수치와 별도) · 장착 오라의 적용 수치(배율 반영) 포함</div>`;
}

// 진품 판정: 절대자 옵션 또는 진품 전용 기본옵(고유/랜덤 옵션)이 하나라도 있으면
function isFlawless(v) {
  return v.kind === 'custom' && ['basic', 'main', 'sub'].some(c =>
    v.opts[c].some(o => o.type && (o.type.includes('절대자') || o.type === '고유 옵션' || o.type === '랜덤 옵션')));
}
// 제작 장비 표시명 (사용자 지정 이름이 없으면 "진품 힘 투구 (제작)" 식)
function customName(v) {
  return v.name || `${isFlawless(v) ? '진품 ' : ''}${v.part} (제작)`;
}

// 직접 제작한 장비의 호버 카드
function customCardHtml(v) {
  const name = customName(v);
  const ero = v.ero || []; // 침식 강화 인덱스 — 기본→메인→서브 통합 순번 (수치 데이터가 없어 표시만)
  let h = `<div class="icard"><div class="icard-name" style="color:#7db4ff">${escapeHtml(name)}</div>`;
  h += `<div class="icard-tags"><span>${escapeHtml(v.part)}</span><span>직접 제작</span></div>`;
  let off = 0;
  const sec = (label, arr) => {
    const base = off;
    off += arr.length;
    return !arr.length ? '' : `<div class="ccard-sec">${label}</div>` +
      arr.map((o, i) => {
        const live = KEY_MAP.get(o.k);
        const on = ero.includes(base + i); // 침식 = 티어 T0+로 상승 → T0+ 수치로 표시
        const tr = affixTier(o); // 로그에서 온 옵션이면 어픽스 ID로 티어를 안다
        const badge = tr ? `<span class="tier-chip tier-${tr}" title="이 옵션이 붙은 티어">${tierLabel(tr)}</span>` : '';
        return `<div class="icard-opt${on ? ' opt-ero' : ''}">${badge}${escapeHtml(on ? eroEffect(o) : tierEffect(o))}${on ? '<span class="corr-chip">침식</span>' : ''}${live ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</div>`;
      }).join('');
  };
  // 베이스(기본) 아이템 수치 — 로그 BaseId로 확정된 것만 (아머·회피·보호막, 무기 크리·공속, 고정 옵션)
  const bi = v.base && BASEIDX[v.base];
  if (bi) {
    h += `<div class="ccard-sec">베이스 · ${escapeHtml(bi.name)} (Lv${bi.lv})</div>` +
      [...(bi.stats || []), ...(bi.imps || [])].map(e => `<div class="icard-opt">${escapeHtml(e)}</div>`).join('');
  }
  h += sec('기본 옵션', v.opts.basic) + sec('메인 옵션', v.opts.main) + sec('서브 옵션', v.opts.sub);
  return h + '</div>';
}


// 저장한 재능·석판·운명의 3묶음 구분 (빌드 화면·이미지 내보내기 공용)
// 0=재능 계열(사냥의 여신 등, 레전드 신격의 석판 포함) / 1=비레전드 신격의 석판 / 2=운명(숙명)
const TAL_GROUPS = ['✨ 핵심 재능', '🪨 석판', '🌠 운명'];
let heroAmpBusy = false; // potionAmpPct → optSummary → heroOptionLines 순환 방지
function heroOptionLines() {
  const herbs = preset.heroHerbs || {};
  // 약병(영약 스킬) 계열 특성의 약재는 총 영약 효과 배율을 적용한 수치로 합류 (화면 툴팁과 동일 규칙)
  let amp = null;
  if (!heroAmpBusy) {
    heroAmpBusy = true;
    try {
      const t = heroTraitData();
      if (t && (t.nodes || []).some(n => (n.lines || []).join('').indexOf('약병') >= 0)) {
        const a = potionAmpPct();
        if (a.any) amp = a.lo;
      }
    } catch (e) {} finally { heroAmpBusy = false; }
  }
  return heroNodesOn().flatMap(({n, lv}) => {
    const src = '히어로 · ' + n.name + ' Lv' + lv;
    const out = heroNodeLines(n, lv).map(l => [src, l]);
    heroNodeHerbs(n, lv).forEach(h => { // 고른 약재의 효과도 합류
      const it = h.items.find(x => x.name === herbs[heroHerbKey(n, h.cat)]);
      if (it) out.push([src + ' · ' + it.name + (amp != null ? ' (영약 효과 적용)' : ''),
                        amp != null ? ampPotionText(it.text, amp) : it.text]);
    });
    return out;
  });
}
function renderPresetHeroTraits() {
  const box = document.getElementById('presetHeroTraitBox');
  if (!box) return;
  const t = heroTraitData();
  const cnt = document.getElementById('presetHeroCount');
  if (!t) {
    if (cnt) cnt.textContent = '0/4';
    box.innerHTML = '<div class="pempty">' + (preset.hero && preset.hero.trait
      ? '이 특성의 노드 데이터가 없습니다 (데이터 업데이트 후 이용해주세요)'
      : '위에서 히어로를 먼저 골라주세요') + '</div>';
    return;
  }
  const herbs = preset.heroHerbs || {};
  // 약병(영약 스킬) 계열 특성의 약재는 총 영약 효과를 적용한 수치를 함께 보여준다 (사용자 요청)
  const potAmp = potionAmpPct();
  const potionTrait = (t.nodes || []).some(n => (n.lines || []).join('').indexOf('약병') >= 0);
  const ampLine = l => potAmp.any && potionTrait ? ampPotionText(l, potAmp.lo) : l;
  // 1~4번이 왼쪽부터 이어지는 가로 배치 — 같은 단계의 선택지는 위아래로 쌓는다
  const cols = [];
  const picked = new Set(heroPicked(t));
  for (let step = 0; step < 4; step++) {
    const nodes = (t.nodes || []).filter(n => n.step === step);
    if (!nodes.length) continue;
    const lv = heroStepLevel(step);
    const part = step === 0 ? '이미테이션 추억' : HERO_STEP_MEM[step];
    let col = `<div class="hn-step"><span class="hn-no">${cols.length + 1}번</span>` +
      `<span class="hn-lv" title="${escapeHtml(part)}의 레벨을 따릅니다">Lv ${lv}</span>` +
      `<span class="hn-part">${escapeHtml(part.replace('의 추억', ''))}</span></div>`;
    col += nodes.map(n => {
      const on = step === 0 || picked.has(n);
      const jn = JSON.stringify(n.name).replace(/"/g, '&quot;');
      // 이름만 보여주고 효과 전문은 툴팁으로 (사용자 요청 — 길게 펼치면 보기만 안 좋다)
      const tip = escapeHtml(n.name + ' (Lv ' + lv + ')\n' + heroNodeLines(n, lv).join('\n'));
      let herbHtml = '';
      // 약재 — 분류마다 3종 중 1개, 켜진 노드에서만 고를 수 있다
      if (on) herbHtml = heroNodeHerbs(n, lv).map(h =>
        `<div class="hn-herb"><span class="hn-hcat">${escapeHtml(h.cat)} · 택1</span><div class="hn-hrow">` +
        h.items.map(it => {
          const hon = herbs[heroHerbKey(n, h.cat)] === it.name;
          // data-h는 HTML을 담는다 — escapeHtml이 따옴표를 안 바꾸므로 속성은 따옴표를 &quot;로 직접 치환
          const hHtml = `<div class="ft-title">${escapeHtml(it.name)}</div><div class="ft-body">${escapeHtml(it.text)}</div>` +
            `<div class="ccard-sec sk-potv-t" style="margin-top:6px">영약 효과 적용 <span class="psum">배율 ×${Math.round((1 + potAmp.lo / 100) * 100) / 100}</span></div>` +
            `<div class="ft-body sk-pot-v">${escapeHtml(ampLine(it.text))}</div>`;
          const hTip = potAmp.any && potionTrait
            ? ` data-h="${hHtml.replace(/"/g, '&quot;')}"`
            : ` title="${escapeHtml(it.name + '\n' + it.text)}"`;
          return `<span class="hn-hitem tip2${hon ? ' on' : ''}"${hTip} onclick="event.stopPropagation();` +
            `pickHeroHerb(${jn}, ${JSON.stringify(h.cat).replace(/"/g, '&quot;')}, ${JSON.stringify(it.name).replace(/"/g, '&quot;')})">` +
            `${escapeHtml(it.name)}</span>`;
        }).join('') + `</div></div>`).join('');
      return `<div class="hn-node${on ? ' on' : ''}"${step === 0 ? '' : ` onclick="pickHeroNode(${step}, ${jn})"`}>` +
        `<b class="tip2" title="${tip}">${escapeHtml(n.name)}</b>${step === 0 ? ' <span class="psum">기본</span>' : ''}` +
        herbHtml + `</div>`;
    }).join('');
    cols.push(`<div class="hn-col">${col}</div>`);
  }
  if (cnt) cnt.textContent = (1 + picked.size) + '/' + (1 + heroPickMax(t));
  box.innerHTML = (heroMsg ? `<div class="hn-msg">${escapeHtml(heroMsg.replace(/^⚠\s*/, ''))}</div>` : '') +
    `<div class="hn-grid">${cols.join('')}</div>`;
}

function cyclePactStar(ev, i) {
  ev.stopPropagation();
  if (guardShareView()) return;
  const pc = (preset.pacts || [])[i];
  if (!pc) return;
  pc.adv = (pc.adv || 1) % 6 + 1; // 1~6 순환 (미상 '?'도 클릭하면 2부터)
  persistPreset();
  renderPreset();
}
// 이 빌드의 정령이 실제로 주는 효과 줄 (승급 보상 + 활성 노드)
function pactOptionLines() {
  const out = [];
  pactList().forEach(pc => {
    if (!pc || !pc.name) return;
    const sp = pactByName(pc.name);
    if (!sp) return;
    const advEff = pactAdvEffects(sp, pc.adv);
    advEff.forEach(e => out.push(['정령 · ' + sp.name + ' 승급' + (pc.adv || 1), e]));
    const on = pc.nodes || {}; // {노드자리: 1} — 로그에서 채워지거나 직접 고른다
    (sp.nodes || []).forEach(n => {
      if (n.ring === '미정' || n.ring === '운명') return; // 운명 슬롯은 숙명이 채운다
      // 외환(고리 없음) 노드는 그 정령의 고유 효과이고, 승급 보상 표가 같은 효과의 현재 수치를 담는다
      // (이터널: 노드 이동 속도 +30%/+6% ↔ 승급6 +40%/+8%). 둘 다 세면 이중 계산이다
      if (!n.ring && advEff.length) return;
      if (!on[n.pos]) return;
      out.push(['정령 · ' + sp.name, n.effect]);
    });
  });
  return out;
}
function renderPresetPact() {
  const box = document.getElementById('presetPactBox');
  if (!box) return;
  const list = pactList();
  const cnt = document.getElementById('presetPactCount');
  if (cnt) cnt.textContent = list.filter(x => x && x.name).length + '/' + PACT_MAX;
  let h = '';
  for (let i = 0; i < PACT_MAX; i++) {
    const pc = list[i], sp = pc && pc.name ? pactByName(pc.name) : null;
    const nOn = pc && pc.nodes ? Object.keys(pc.nodes).length : 0;
    // 핵심(승급) 효과와 활성 노드 효과 전문은 마우스 오버 툴팁으로 (사용자 요청)
    const advEff = sp ? pactAdvEffects(sp, pc.adv) : [];
    const nameTip = sp ? escapeHtml(sp.name + (sp.summary ? '\n' + sp.summary : '') +
      (advEff.length ? '\n\n[핵심 옵션 · 승급 ' + (pc.adv || 1) + ']\n' + advEff.join('\n') : '') +
      '\n\n클릭해서 교체') : '';
    const nodeEffs = sp ? (sp.nodes || []).filter(n => (pc.nodes || {})[n.pos] && n.ring !== '미정' && n.ring !== '운명')
      .map(n => n.effect) : [];
    const nodeTip = escapeHtml(nodeEffs.length ? '[활성 노드 효과]\n' + nodeEffs.join('\n') : '켜진 노드가 없습니다');
    h += `<div class="pact-row">` +
      (sp
        ? `<span class="pact-name tip2" onclick="openPactPick(${i})" title="${nameTip}">${escapeHtml(sp.name)}</span>` +
          `<span class="pbadge">${escapeHtml(sp.kind)}</span>` +
          ((sp.advance || []).length ? `<span class="pact-star tip2" onclick="cyclePactStar(event, ${i})" title="승급 (클릭해서 변경${pc.adv ? '' : ' — 이 정령은 로그에 승급 정보가 없어 직접 골라주세요'})&#10;&#10;${escapeHtml(advEff.join('\n'))}">승급 ${pc.adv || '?'}</span>` : '') +
          `<span class="psum">${escapeHtml(sp.summary || '')}</span>` +
          `<span class="psum tip2 pact-nodes" onclick="openPactNodes(${i})" title="${nodeTip}&#10;&#10;클릭해서 노드를 켜고 끕니다">${nOn ? '노드 ' + nOn + '개' : '노드 미설정'} ✎</span>` +
          `<button class="btn-sel" onclick="clearPact(${i})">비우기</button>`
        : `<span class="pempty pempty-pick" onclick="openPactPick(${i})">정령 ${i + 1} — 클릭해서 선택</span>`) +
      `</div>`;
  }
  box.innerHTML = h;
}
// 정령 노드를 직접 켜고 끈다 — 로그의 노드판(pointDatas)이 덤프당 30개만 실려 실제로 켠 노드가
// 다 안 들어온다 (14번 이터널의 원소 저항 자리가 로그에 없다). 승급처럼 손으로 맞출 수 있게 한다.
// 운명·미정 슬롯은 여기서 다루지 않는다 — 운명은 로그에서 목록으로 따로 들어오고(preset.talents)
// 어느 자리에 꽂혔는지는 계산에 필요 없다
function openPactNodes(i) {
  if (guardShareView && guardShareView()) return;
  const pc = pactList()[i];
  const sp = pc && pc.name ? pactByName(pc.name) : null;
  if (!sp) return openPactPick(i);
  renderPactNodes(i);
  document.getElementById('pactModal').style.display = 'flex';
  modalHistPush();
}
function renderPactNodes(i) {
  const pc = pactList()[i] || {}, sp = pactByName(pc.name);
  const on = pc.nodes || {}, dsts = pc.dsts || {};
  const advOn = pactAdvEffects(sp, pc.adv).length > 0;
  const RING_LB = {'내환': '내환', '중환': '중환', '': '외환(고유)'};
  const rows = (sp.nodes || [])
    .filter(n => n.ring !== '미정' && n.ring !== '운명')
    .sort((a, b) => a.pos - b.pos)
    .map(n => {
      // 외환은 정령 고유 효과라 승급 보상 표가 현재 수치를 담는다 — 따로 켜면 이중 계산이 된다
      const covered = !n.ring && advOn;
      const st = dsts[n.pos] ? 'dst' : (on[n.pos] ? 'on' : 'off');
      const mark = st === 'dst' ? '<b class="pn-dst">🔶 운명</b> ' : '';
      return `<div class="sb-optrow${st === 'on' && !covered ? ' on' : ''}${covered ? ' pn-off' : ''}${st === 'dst' ? ' pn-dst-row' : ''}"` +
        (covered ? '' : ` onclick="cyclePactNode(${i}, ${n.pos})"`) + `>` +
        mark + `<b>${escapeHtml(RING_LB[n.ring] || n.ring)}</b> ` +
        `<span class="psum">${escapeHtml(n.effect)}</span>` +
        (covered ? `<span class="psum"> — 승급 보상으로 계산됩니다</span>`
                 : st === 'dst' ? `<span class="psum"> — 이 자리는 운명이 대신합니다 (노드 효과 없음)</span>` : '') + `</div>`;
    }).join('');
  const nDst = Object.keys(dsts).length;
  document.getElementById('pactModalTitle').textContent = '🔮 ' + sp.name + ' — 노드';
  document.getElementById('pactModalHelp').innerHTML =
    '줄을 누를 때마다 <b>꺼짐 → 정령 노드 → 🔶 운명</b> 순으로 바뀝니다 · 로그가 노드판을 일부만 실어 실제와 다를 수 있으니 게임 화면과 맞춰주세요' +
    '<br>🔶 운명은 그 자리의 정령 노드를 대체합니다 — 노드 효과는 빠지고, 꽂은 운명의 효과는 재능·운명 목록에서 따로 합산됩니다' +
    `<br>${pactDstTally()}`;
  document.getElementById('pactList').innerHTML = rows ||
    '<div class="pempty">이 정령은 노드 데이터가 없습니다</div>';
}
function cyclePactNode(i, pos) {
  if (guardShareView && guardShareView()) return;
  const pc = pactList()[i];
  if (!pc) return;
  if (!pc.nodes) pc.nodes = {};
  if (!pc.dsts) pc.dsts = {};
  if (pc.dsts[pos]) { delete pc.dsts[pos]; delete pc.nodes[pos]; }      // 운명 → 꺼짐
  else if (pc.nodes[pos]) { delete pc.nodes[pos]; pc.dsts[pos] = 1; }   // 노드 → 운명
  else pc.nodes[pos] = 1;                                              // 꺼짐 → 노드
  if (!Object.keys(pc.dsts).length) delete pc.dsts;
  preset.pacts[i] = pc;
  persistPreset();
  renderPactNodes(i);
  renderPreset();
}
function clearPact(i) {
  if (!preset.pacts) return;
  preset.pacts[i] = null;
  persistPreset();
  renderPreset();
}
function openPactPick(i) {
  if (guardShareView && guardShareView()) return;
  const box = document.getElementById('pactList');
  const cur = (pactList()[i] || {}).name;
  box.innerHTML = PACT.filter(x => x.grade === '레전드' && x.kind !== '드롭').map(sp => // 드롭 정령은 DB 에만
    `<div class="sb-optrow${cur === sp.name ? ' on' : ''}" onclick="pickPact(${i}, ${JSON.stringify(sp.name).replace(/"/g, '&quot;')})">` +
    `<b>${escapeHtml(sp.name)}</b> <span class="psum">${escapeHtml(sp.kind)} · ${escapeHtml(sp.summary || '')}</span></div>`).join('');
  document.getElementById('pactModal').style.display = 'flex';
  modalHistPush();
}
function pickPact(i, name) {
  if (!preset.pacts) preset.pacts = [];
  const prev = preset.pacts[i] || {};
  preset.pacts[i] = {name, nodes: prev.nodes || {}}; // 노드 설정은 유지 (같은 자리에 다른 정령을 끼우는 경우)
  persistPreset();
  closePactPick();
  renderPreset();
}
function closePactPick() { document.getElementById('pactModal').style.display = 'none'; }

// 빌드 슬롯의 조향·시퀀스 줄 툴팁 텍스트 — 데이터에서 용어 설명(tips)을 찾아 본문에 덧붙임
function lineTipText(label, sub, effect, dataList) {
  let t = label + (sub ? ' · ' + sub : '') + '\n' + effect;
  const src = (dataList || []).find(x => x.effect === effect);
  if (src && src.tips) src.tips.forEach(tip => { t += '\n\n' + tip[1]; });
  return t;
}

// ── 제노 프리즘 (핵심 재능 3~5번째 칸에 장착, 빌드당 1개) ──
// preset.prism = {pos: 3|4|5, name, opts: [1칸, 2칸, 3칸], snap} — 옵션은 {effect, type} 또는 null
const PRISM_STAGES = ['종류', '1번 옵션', '2번 옵션', '3번 옵션'];
const PRISM_SLOT_LABELS = ['1번 옵션 (영향 범위)', '2번 옵션 (범위 효과)', '3번 옵션 (특수)'];
function prismItemOf(v) { return PRISM.items.find(x => x.name === v.name) || v.snap || {name: v.name}; }
// 3번 옵션에 추가형이 있으면 기존 핵심 재능 유지 + [X] 추가
function prismAddedTalent(v) {
  for (const o of (v.opts || [])) {
    const n = o && prismAddName(o.effect);
    if (n) return n;
  }
  return null;
}
function prismTalentDesc(it) { // 교체형 프리즘이 부여하는 재능의 설명 (아이템 tips에서 조회)
  const t = (it.tips || []).find(x => x[0] === it.talent);
  return t ? t[1] : '';
}
// ── 역상: 핵심 재능 3~5번째 칸, 빌드당 1개, 프리즘과 같은 칸 불가 — 중요도(하위/중위/절대) 체크만 저장 ──
let inversePos = null;
function startInverse(pos) {
  if (guardShareView()) return;
  if (preset.inverse && preset.inverse.pos !== pos) { alert('역상은 하나만 장착할 수 있습니다. 기존 역상을 먼저 삭제해주세요.'); return; }
  if (preset.prism && preset.prism.pos === pos) { alert('프리즘이 장착된 칸에는 역상을 넣을 수 없습니다.'); return; }
  inversePos = pos;
  const cur = (preset.inverse && preset.inverse.opts) || {};
  document.getElementById('inv-low').checked = !!cur.low;
  document.getElementById('inv-mid').checked = !!cur.mid;
  document.getElementById('inv-abs').checked = !!cur.abs;
  document.getElementById('inverseTitle').textContent = '🔄 역상 — ' + pos + '번째 핵심 재능';
  document.getElementById('invClearBtn').style.display = preset.inverse ? '' : 'none';
  document.getElementById('inverseModal').style.display = 'flex'; modalHistPush();
}
function closeInverse() { document.getElementById('inverseModal').style.display = 'none'; }
function saveInverse() {
  const o = {low: document.getElementById('inv-low').checked, mid: document.getElementById('inv-mid').checked, abs: document.getElementById('inv-abs').checked};
  if (!o.low && !o.mid && !o.abs) { alert('중요도를 하나 이상 체크해주세요. (지우려면 [비우기])'); return; }
  preset.inverse = {pos: inversePos, opts: o};
  persistPreset();
  renderPreset();
  closeInverse();
}
function clearInverse() {
  if (guardShareView()) return;
  delete preset.inverse;
  persistPreset();
  renderPreset();
}

function startPrism(pos) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  if (!PRISM.items.length) { alert('프리즘 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.'); return; }
  if (preset.prism && preset.prism.pos !== pos) { alert('프리즘은 하나만 장착할 수 있습니다. 기존 프리즘을 먼저 삭제해주세요.'); return; }
  const cur = preset.prism;
  build = {prism: true, pos, stage: 0, item: cur ? cur.name : null,
           popts: cur ? [0, 1, 2].map(i => cur.opts[i] ? {effect: cur.opts[i].effect, type: cur.opts[i].type} : null) : [null, null, null]};
  document.getElementById('bloodPoolFilter').value = '';
  renderPrismWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function closePrismWiz(save) {
  document.getElementById('bloodPoolModal').style.display = 'none';
  hideTip2();
  endBuild(save);
}
function prismWizMove(delta) {
  const next = build.stage + delta;
  if (next < 0) return;
  if (next >= PRISM_STAGES.length) { closePrismWiz(true); return; }
  if (next > 0 && !build.item) { alert('프리즘 종류를 먼저 선택해주세요.'); return; }
  build.stage = next;
  document.getElementById('bloodPoolFilter').value = '';
  renderPrismWiz();
}
function renderPrismWiz() {
  document.getElementById('bloodPoolFilter').placeholder = '옵션 검색... (행 클릭=선택, 재클릭=해제, 안 골라도 [다음]으로 진행)';
  if (!build || !build.prism) return;
  const title = document.getElementById('bloodPoolTitle');
  const box = document.getElementById('bloodPoolList');
  const nav = PRISM_STAGES.map((x, i) => {
    const done = (i === 0 ? build.item : build.popts[i - 1]) ? ' ✓' : '';
    return i === build.stage ? `<b style="color:#f0abfc">${x}${done}</b>` : `${x}${done}`;
  }).join(' → ');
  title.innerHTML = `💠 프리즘 장착 <span style="color:#8b949e;font-weight:normal;font-size:12px">(핵심 재능 ${build.pos}번째 칸)</span> — ${nav}`;
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const match = txts => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => txts.some(t => t && t.includes(kw)));
    return g.neg ? !hit : hit;
  });
  let h = '';
  if (build.stage === 0) {
    PRISM.items.forEach((it, i) => {
      if (!match([it.name, it.effect || ''])) return;
      const on = build.item === it.name;
      h += `<div class="blend-row${on ? ' on' : ''}" data-ppi="${i}"><span class="gname-t">${highlight(it.name, kws)}</span>${it.effect ? `<span class="b-sub">${tipWrapEffect(it.effect, it.tips)}</span>` : ''}</div>`;
    });
  } else {
    const slot = build.stage;
    h += `<div class="blend-row clear" data-ppo="-1">— ${slot}번 옵션 비우기 —</div>`;
    // 3번 단계의 추가형("교체되지 않고 …추가: [X]") 옵션은 고른 프리즘과 짝이 맞는 것만 표시 + 최상단 정렬
    const curIt = build.item ? (PRISM.items.find(x => x.name === build.item) || {}) : {};
    const entries = [];
    PRISM.opts.forEach((o, i) => {
      if (o.slot !== slot || !match([o.effect, o.type])) return;
      const an = slot === 3 ? prismAddName(o.effect) : null;
      if (an && an !== curIt.talent) return; // 다른 프리즘용(또는 교체형이 아닌 프리즘)의 추가형 숨김
      entries.push({i, o, top: !!an});
    });
    entries.sort((a, b) => b.top - a.top); // 안정 정렬 — 짝 맞는 추가형만 위로, 나머지는 원래 순서
    entries.forEach(({i, o}) => {
      const sel = build.popts[slot - 1];
      const on = !!(sel && sel.effect === o.effect && sel.type === o.type);
      h += `<div class="blend-row${on ? ' on' : ''}" data-ppo="${i}">${tipWrapEffect(o.effect, o.tips)}${o.type ? `<span class="b-sub">${escapeHtml(o.type)}</span>` : ''}</div>`;
    });
  }
  box.innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML =
    (build.stage > 0 ? `<button class="bb-btn ghost" onclick="prismWizMove(-1)">← 이전</button>` : '') +
    `<button class="bb-btn" onclick="prismWizMove(1)">${build.stage < PRISM_STAGES.length - 1 ? '다음 →' : '완료'}</button>` +
    `<button class="bb-btn danger" onclick="closePrismWiz(false)">취소</button>`;
}
function togglePrismItem(i) {
  const it = PRISM.items[i];
  if (build.item === it.name) { build.item = null; renderPrismWiz(); return; }
  build.item = it.name;
  // 프리즘 종류가 바뀌어 짝이 안 맞아진 추가형 3번 옵션은 자동 해제
  const an = build.popts[2] && prismAddName(build.popts[2].effect);
  if (an && an !== it.talent) build.popts[2] = null;
  prismWizMove(1); // 종류를 고르면 자동으로 1번 옵션 단계로
}
function togglePrismOpt(i) {
  const slot = build.stage;
  if (i < 0) { build.popts[slot - 1] = null; renderPrismWiz(); return; }
  const o = PRISM.opts[i];
  const cur = build.popts[slot - 1];
  if (cur && cur.effect === o.effect && cur.type === o.type) { build.popts[slot - 1] = null; renderPrismWiz(); return; }
  build.popts[slot - 1] = {effect: o.effect, type: o.type};
  if (build.stage < PRISM_STAGES.length - 1) prismWizMove(1);
  else renderPrismWiz();
}
function clearPrism() {
  if (guardShareView()) return;
  delete preset.prism;
  persistPreset();
  renderPreset();
}
function prismCardHtml(pr) {
  const it = prismItemOf(pr);
  const added = prismAddedTalent(pr);
  let h = `<div class="icard"><div class="icard-name" style="color:#f0abfc">${escapeHtml(it.name || pr.name)}</div>`;
  h += `<div class="icard-tags"><span>제노 프리즘</span><span>핵심 재능 ${pr.pos}번째 칸</span></div>`;
  if (it.effect) h += `<div class="icard-opt">${tipWrapEffect(it.effect, it.tips)}</div>`;
  if (it.talent) {
    h += `<div class="ccard-sec">핵심 재능</div><div class="icard-opt">${added
      ? `기존 재능 유지 + <b class="tal-swap">[${escapeHtml(added)}]</b> 추가 (3번 옵션 효과)`
      : `기존 재능을 <b class="tal-swap">[${escapeHtml(it.talent)}]</b>(으)로 교체`}` +
      (prismTalentDesc(it) ? `<div style="color:#8b949e">${escapeHtml(prismTalentDesc(it))}</div>` : '') + `</div>`;
  }
  pr.opts.forEach((o, i) => {
    h += `<div class="ccard-sec">${PRISM_SLOT_LABELS[i]}</div>`;
    if (!o) { h += `<div class="icard-opt" style="color:#556a8f">— 비어 있음 —</div>`; return; }
    const live = PRISM.opts.find(x => x.effect === o.effect && x.type === o.type);
    h += `<div class="icard-opt">${tipWrapEffect(o.effect, live && live.tips)}${o.type ? ` <span style="color:#8b949e;font-size:11px">· ${escapeHtml(o.type)}</span>` : ''}${live ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</div>`;
  });
  return h + '</div>';
}

// ── 추억 부활 옵션 (하나의 추억에만 1개 적용) ──
// preset.revival = {part: 추억 부위, effect, group, mem?} — mem은 "기본 특성 슬롯 추가" 옵션의 추가 추억
function revivalData(v) { return REVIVALS.find(o => o.effect === v.effect && o.group === v.group); }
let revivalPart = null;
function openRevivalPicker(part) {
  if (guardShareView()) return;
  if (!preset.mems[part]) { alert('추억을 먼저 제작해주세요.'); return; }
  if (!REVIVALS.length) { alert('부활 옵션 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.'); return; }
  if (preset.revival && preset.revival.part !== part) { alert('부활 옵션은 하나의 추억에만 적용할 수 있습니다. 기존 부활 옵션을 먼저 삭제해주세요.'); return; }
  revivalPart = part;
  document.getElementById('revivalModalSub').textContent = `— ${part} · 두 목록 중 1개만 적용`;
  document.getElementById('revivalFilter').value = '';
  renderRevivalList();
  document.getElementById('revivalModal').style.display = 'flex'; modalHistPush();
}
function closeRevivalPicker() { document.getElementById('revivalModal').style.display = 'none'; revivalPart = null; hideTip2(); }
function renderRevivalList() {
  const cur = preset.revival && preset.revival.part === revivalPart ? preset.revival : null;
  const q = document.getElementById('revivalFilter').value.trim();
  const tokens = parseTokens(q);
  const match = o => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => o.effect.includes(kw) || (o.group || '').includes(kw));
    return g.neg ? !hit : hit;
  });
  let h = `<div class="blend-row clear" onclick="pickRevival(-1)">— 부활 옵션 비우기 —</div>`;
  REVIVALS.forEach((o, i) => {
    if (!match(o)) return;
    const sub = [o.group, o.tier ? 'T' + o.tier : ''].filter(Boolean).join(' · ');
    const on = !!(cur && cur.effect === o.effect && cur.group === o.group);
    h += `<div class="blend-row${on ? ' on' : ''}" onclick="pickRevival(${i})">${tipWrapEffect(o.effect, o.tips)}${sub ? `<span class="b-sub">${escapeHtml(sub)}</span>` : ''}</div>`;
  });
  document.getElementById('revivalList').innerHTML = h;
}
function pickRevival(i) {
  if (!revivalPart) { closeRevivalPicker(); return; }
  if (i < 0) {
    delete preset.revival;
  } else {
    const o = REVIVALS[i];
    const prev = preset.revival;
    const prevExtra = prev ? revivalExtraPart(prev.effect) : null;
    const newExtra = revivalExtraPart(o.effect);
    preset.revival = {part: revivalPart, effect: o.effect, group: o.group};
    // 추가 슬롯 부위가 같으면 제작해둔 추가 추억 유지, 다르면 초기화
    if (newExtra && prevExtra === newExtra && prev && prev.mem) preset.revival.mem = prev.mem;
  }
  persistPreset();
  closeRevivalPicker();
  renderPreset();
}
function clearRevival() {
  if (guardShareView()) return;
  delete preset.revival;
  persistPreset();
  renderPreset();
}
function clearRevivalMem() {
  if (preset.revival) delete preset.revival.mem;
  persistPreset();
  renderPreset();
}

// ── 조향 (벨트 전용 옵션, 1줄) ──
function openBlendPicker() {
  if (guardShareView()) return;
  const v = preset.slots.belt;
  if (!v) { alert('벨트를 먼저 장착해주세요.'); return; }
  if (!BLENDS.length) { alert('조향 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.'); return; }
  document.getElementById('blendFilter').value = '';
  renderBlendList();
  document.getElementById('blendModal').style.display = 'flex'; modalHistPush();
}
function closeBlendPicker() { document.getElementById('blendModal').style.display = 'none'; hideTip2(); }
function renderBlendList() {
  const v = preset.slots.belt;
  const cur = v && v.blend ? v.blend.effect : null;
  const q = document.getElementById('blendFilter').value.trim();
  const tokens = parseTokens(q);
  const match = b => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => b.effect.includes(kw) || (b.req || '').includes(kw));
    return g.neg ? !hit : hit;
  });
  let h = `<div class="blend-row clear" onclick="pickBlend(-1)">— 조향 비우기 —</div>`;
  BLENDS.forEach((b, i) => {
    if (!match(b)) return;
    const sub = [b.req, b.mats].filter(Boolean).join(' · ');
    h += `<div class="blend-row${cur === b.effect ? ' on' : ''}" onclick="pickBlend(${i})">${tipWrapEffect(b.effect, b.tips)}${sub ? `<span class="b-sub">${escapeHtml(sub)}</span>` : ''}</div>`;
  });
  document.getElementById('blendList').innerHTML = h;
}
function pickBlend(i) {
  const v = preset.slots.belt;
  if (!v) { closeBlendPicker(); return; }
  if (i < 0) delete v.blend;
  else v.blend = {effect: BLENDS[i].effect, req: BLENDS[i].req || ''};
  persistPreset();
  closeBlendPicker();
  renderPreset();
}

// ── 침식 강화 마킹 (옵션 단위 — 레전드·제작 최대 2개, 블러드 최대 3개) ──
// 뷰(아이템 카드)의 침식화 수치는 참고용 전체 표시지만, 빌드는 실제 강화 가능한 개수만 마킹한다
// 슬롯의 옵션 목록을 통합 순번으로 (피커·카드·합산·내보내기가 같은 순번을 씀)
// item=opts 순번(침식 수치 corr와 1:1) / custom=기본→메인→서브 / blood=기본→레전드→추가
function slotOptList(v) {
  if (v.kind === 'item') {
    const idx = ITEMS.findIndex(x => x.name === v.name);
    const it = idx >= 0 ? ITEMS[idx] : v.snap;
    return (it.opts || []).map((o, i) => ({html: o, corrHtml: it.corr && it.corr[i] ? it.corr[i][1] : null}));
  }
  // 제작·블러드 추가 옵션은 침식 시 티어가 T0+로 올라 수치가 바뀜 → 미리보기 제공 (T0+ 데이터 없으면 마킹만)
  const prev = o => {
    const cur = tierEffect(o), up = eroEffect(o);
    return up !== cur ? escapeHtml(up) : null;
  };
  if (v.kind === 'blood') return [
    ...(v.opts.base || []).map(o => ({html: escapeHtml(o.effect)})),
    ...v.opts.blood.map(o => ({html: escapeHtml((KEY_MAP.get(o.k) || o).effect), corrHtml: bloodLegendCorr(o)})),
    ...(v.opts.extra || []).map(o => ({html: escapeHtml(tierEffect(o)), corrHtml: prev(o)}))];
  return ['basic', 'main', 'sub'].flatMap(c => v.opts[c].map(o => ({html: escapeHtml(tierEffect(o)), corrHtml: prev(o)})));
}
let corrSlotId = null;
function openCorrPicker(slotId) {
  if (guardShareView()) return;
  const v = preset.slots[slotId];
  if (!v) return;
  corrSlotId = slotId;
  renderCorrList();
  document.getElementById('corrModal').style.display = 'flex'; modalHistPush();
}
function closeCorrPicker() { document.getElementById('corrModal').style.display = 'none'; corrSlotId = null; hideTip2(); }
function renderCorrList() {
  const v = preset.slots[corrSlotId];
  if (!v) return;
  const lim = corrLimit(v), ero = v.ero || [];
  document.getElementById('corrModalSub').textContent = `— 옵션 최대 ${lim}개 강화 · 현재 ${ero.length}/${lim}`;
  const list = slotOptList(v);
  document.getElementById('corrList').innerHTML = list.length ? list.map((o, i) => {
    const on = ero.includes(i);
    // 레전드는 침식 수치를 미리보기로, 제작·블러드는 수치 데이터가 없어 마킹만
    const prev = o.corrHtml ? `<span class="corr-prev">침식 시: ${o.corrHtml}</span>` : '';
    return `<div class="blend-row${on ? ' on' : ''}" onclick="toggleCorr(${i})">${o.html}${on ? '<span class="corr-chip">침식</span>' : ''}${prev}</div>`;
  }).join('') : '<div style="color:#8b949e;padding:8px">옵션이 없습니다.</div>';
}
function toggleCorr(i) {
  const v = preset.slots[corrSlotId];
  if (!v) return;
  const ero = v.ero || [];
  const at = ero.indexOf(i);
  if (at >= 0) ero.splice(at, 1);
  else {
    if (ero.length >= corrLimit(v)) { alert(`침식 강화는 옵션 최대 ${corrLimit(v)}개까지입니다.`); return; }
    ero.push(i);
    ero.sort((a, b) => a - b);
  }
  if (ero.length) v.ero = ero; else delete v.ero;
  persistPreset();
  renderCorrList();
  renderPreset();
}
function clearCorr() {
  const v = preset.slots[corrSlotId];
  if (v) { delete v.ero; persistPreset(); renderCorrList(); renderPreset(); }
}

// ── 타워 시퀀스 (무기·방패 전용 옵션, 1줄) — 장착 무기 부위에 맞는 것만 표시 ──
let towerSlotId = null;
function openTowerPicker(slotId) {
  if (guardShareView()) return;
  const v = preset.slots[slotId];
  if (!v) { alert('무기를 먼저 장착해주세요.'); return; }
  if (!TOWERS.length) { alert('타워 시퀀스 데이터가 없습니다. 데이터 업데이트 후 이용해주세요.'); return; }
  towerSlotId = slotId;
  document.getElementById('towerModalSub').textContent = `— ${v.part} 전용 · 1줄만 장착`;
  document.getElementById('towerFilter').value = '';
  renderTowerList();
  document.getElementById('towerModal').style.display = 'flex'; modalHistPush();
}
function closeTowerPicker() { document.getElementById('towerModal').style.display = 'none'; towerSlotId = null; hideTip2(); }
function renderTowerList() {
  const v = towerSlotId && preset.slots[towerSlotId];
  if (!v) return;
  const cur = v.tower ? v.tower.effect : null;
  const q = document.getElementById('towerFilter').value.trim();
  const tokens = parseTokens(q);
  const match = t => !tokens.length || tokens.every(g => {
    const hit = g.kws.some(kw => t.effect.includes(kw) || (t.seq || '').includes(kw));
    return g.neg ? !hit : hit;
  });
  let h = `<div class="blend-row clear" onclick="pickTower(-1)">— 시퀀스 비우기 —</div>`;
  let shown = 0;
  TOWERS.forEach((t, i) => {
    if (t.source !== v.part || !match(t)) return; // 장착 무기 부위에 맞는 것만
    shown++;
    h += `<div class="blend-row${cur === t.effect ? ' on' : ''}" onclick="pickTower(${i})">${tipWrapEffect(t.effect, t.tips)}${t.seq ? `<span class="b-sub">${escapeHtml(t.seq)}</span>` : ''}</div>`;
  });
  if (!shown) h += `<div class="blend-row" style="cursor:default;color:#8b949e">${q ? '검색 결과가 없습니다' : `${escapeHtml(v.part)} 부위의 시퀀스가 없습니다`}</div>`;
  document.getElementById('towerList').innerHTML = h;
}
function pickTower(i) {
  const v = towerSlotId && preset.slots[towerSlotId];
  if (!v) { closeTowerPicker(); return; }
  if (i < 0) delete v.tower;
  else v.tower = {effect: TOWERS[i].effect, seq: TOWERS[i].seq || ''};
  persistPreset();
  closeTowerPicker();
  renderPreset();
}

// 제작 옵션 표시 티어 변경 (0/1/2) — 표시·기본 정보·이미지에 일괄 적용
// 로그에서 받은 실제 굴림값(rolled)이 하나라도 있으면 티어 조절이 의미가 없다 —
// 옵션마다 T0/T1/T2가 섞여 있고 수치는 이미 확정이라, 티어를 바꾸면 오히려 틀린 값이 된다.
function presetHasRolled() {
  return Object.values(preset.slots || {}).some(v => v && v.opts &&
    ['basic', 'main', 'sub'].some(k => (v.opts[k] || []).some(o => o && o.rolled)));
}
function setTier(t) {
  if (guardShareView()) return;
  if (presetHasRolled()) return; // 실제 수치가 있는 빌드는 티어를 바꾸지 않는다
  preset.tier = t;
  persistPreset();
  renderPreset();
}

// 빌드 탭 렌더링: 장비 슬롯 표 + 저장한 재능 표
function renderPreset() {
  renderPresetHero();
  const rolled = presetHasRolled();
  const tt = document.querySelector('.tier-toggle');
  if (tt) { // 로그에서 가져온 빌드는 수치가 이미 확정이라 티어 조절을 감춘다
    tt.style.display = rolled ? 'none' : '';
    tt.title = rolled ? '' : '제작 옵션 수치를 선택한 티어 기준으로 표시합니다 (해당 티어가 없는 옵션은 T1 유지)';
  }
  ['0', '1', '2'].forEach(t => {
    const b = document.getElementById('tierBtn' + t);
    if (b) b.classList.toggle('tier-on', (preset.tier || '1') === t);
  });
  renderPresetMemo();
  const prev = compareOn ? prevPreset() : null;
  if (compareOn && !prev) compareOn = false; // 첫 순번으로 이동한 경우 비교 해제
  renderPresetBar();
  const twoHand = isTwoHandEquipped();
  document.getElementById('presetTbody').innerHTML = PRESET_SLOTS.map(s => {
    const v = preset.slots[s.id];
    const diff = prev ? diffBadge(slotSig(v), slotSig(prev.slots[s.id]), slotDesc(prev.slots[s.id])) : '';
    let content, btns = '';
    if (s.id === 'weapon2' && twoHand) {
      content = '<span class="pempty">— 양손 무기 사용 중 —</span>';
    } else if (!v) {
      content = `<span class="pempty pempty-pick" onclick="startItemPick('${s.id}')" title="클릭하면 이 부위의 레전드 장비 선택 팝업이 열립니다">비어 있음 · 레전드 선택</span>`;
      btns = (BLOOD_SET_PARTS[s.id] && !bloodSlotId() ? `<button class="btn-sel btn-blood" onclick="startBlood('${s.id}')" title="${BLOOD_SET_NAME[s.id]} 세트 레전드 옵션 2개로 제작 (빌드당 1개)">블러드</button>` : '') +
        `<button class="btn-sel" onclick="startBuild('${s.id}')">직접 제작</button>`;
    } else if (v.kind === 'item') {
      const ga = grantedAuras().find(g => g.sid === s.id && g.rand); // 랜덤 부여 오라 장비 (고독한 자의 부츠)
      content = `<span class="plink legend" data-pslot="${s.id}">${escapeHtml(v.name)}</span><span class="pbadge leg">레전드</span>` +
        (v.ero && v.ero.length ? `<span class="psum corr-cnt">🔥 침식 ${v.ero.length}/2</span>` : '') +
        (ga ? `<div class="blend-line gaura-line" onclick="openGauraPick('${s.id}')" title="장비가 부여하는 오라 — 클릭해서 ${ga.pick ? '교체' : '선택'}">🌟 ${ga.pick ? escapeHtml(ga.pick) + ' Lv.' + ga.lvLo : '부여 오라 미선택 — 클릭해서 선택'}</div>` : '');
      btns = `<button class="btn-sel btn-corr" onclick="openCorrPicker('${s.id}')" title="침식 강화 옵션 마킹 (최대 2개)">침식</button>` +
        (ga ? `<button class="btn-sel btn-gaura" onclick="openGauraPick('${s.id}')" title="장비가 부여하는 오라 선택">오라</button>` : '') +
        `<button class="btn-sel" onclick="clearSlot('${s.id}')">비우기</button>`;
    } else if (v.kind === 'blood') {
      content = `<span class="plink blood" data-pslot="${s.id}">${escapeHtml(v.name || `블러드 제작 ${v.part}`)}</span><span class="pbadge bld">블러드 제작</span>` +
        `<span class="psum">기본 ${(v.opts.base || []).length}/2 · 레전드 ${v.opts.blood.length}/2 · 추가 ${(v.opts.extra || []).length}/${bloodExtraCap(v.opts.blood.length)}${v.aberrant ? ' · 이상' : ''}</span>` +
        (v.ero && v.ero.length ? `<span class="psum corr-cnt">🔥 침식 ${v.ero.length}/3</span>` : '');
      btns = `<button class="btn-sel btn-corr" onclick="openCorrPicker('${s.id}')" title="침식 강화 옵션 마킹 (블러드는 최대 3개)">침식</button><button class="btn-sel" onclick="clearSlot('${s.id}')">비우기</button>`;
    } else {
      const o = v.opts;
      content = `<span class="plink custom" data-pslot="${s.id}">${escapeHtml(customName(v))}</span><span class="pbadge cus">제작</span>` +
        `<span class="psum">기본 ${o.basic.length} · 메인 ${o.main.length} · 서브 ${o.sub.length}</span>` +
        (v.ero && v.ero.length ? `<span class="psum corr-cnt">🔥 침식 ${v.ero.length}/2</span>` : '');
      btns = `<button class="btn-sel btn-corr" onclick="openCorrPicker('${s.id}')" title="침식 강화 옵션 마킹 (최대 2개)">침식</button><button class="btn-sel" onclick="clearSlot('${s.id}')">비우기</button>`;
    }
    // 조향: 벨트 슬롯 전용 — 장착된 벨트에 1줄, [비우기] 왼쪽에 버튼
    if (s.id === 'belt' && v) {
      if (v.blend) content += `<div class="blend-line tip2" title="${escapeHtml(lineTipText('조향', v.blend.req, v.blend.effect, BLENDS))}">🧪 ${escapeHtml(v.blend.effect)}</div>`;
      btns = btns.replace(`<button class="btn-sel" onclick="clearSlot('belt')">비우기</button>`,
        `<button class="btn-sel btn-blend" onclick="openBlendPicker()">조향</button><button class="btn-sel" onclick="clearSlot('belt')">비우기</button>`);
    }
    // 타워 시퀀스: 무기·무기(방패) 슬롯 전용 — 장착 무기 부위에 맞는 1줄, [비우기] 왼쪽에 버튼
    if ((s.id === 'weapon1' || s.id === 'weapon2') && v) {
      if (v.tower) content += `<div class="blend-line tower-line tip2" title="${escapeHtml(lineTipText('타워 시퀀스', v.tower.seq, v.tower.effect, TOWERS))}">🗼 ${escapeHtml(v.tower.effect)}</div>`;
      btns = btns.replace(`<button class="btn-sel" onclick="clearSlot('${s.id}')">비우기</button>`,
        `<button class="btn-sel btn-tower" onclick="openTowerPicker('${s.id}')">시퀀스</button><button class="btn-sel" onclick="clearSlot('${s.id}')">비우기</button>`);
    }
    // 장착된 행은 행 자체 클릭으로 편집/교체 (이름 클릭=툴팁, 버튼·조향 줄은 제외)
    // 제작·블러드=편집 모드, 레전드=해당 부위 목록으로 이동해 다른 레전드로 교체
    const editable = v && !(s.id === 'weapon2' && twoHand);
    const trAttr = editable ? ` class="pedit" data-pedit="${s.id}" data-pkind="${v.kind}"` : '';
    return `<tr${trAttr}><td class="pslot-label">${s.label}</td><td>${content}${diff}</td><td class="pbtns">${btns}</td></tr>`;
  }).join('');

  const prevTal = prev ? prev.talents : null;
  const talRowHtml = (t, i, gi, ord) => {
    const m = t.effect.match(/^\[([^\]]+)\]/);
    // "레전드 중위 재능" 같은 등급형 명칭은 정보가 없으므로 옵션 효과를 직접 표시 (호버 툴팁은 동일)
    const generic = m && /^(레전드 )?(하위|중위|절대자)( 명왕)? 재능( 포인트)?$/.test(m[1]);
    const nm = m ? (generic ? t.effect.replace(/^\[[^\]]+\]\s*/, '') : m[1]) : t.effect.slice(0, 24);
    const missing = KEY_MAP.has(t.k) ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>';
    let diff = '';
    if (prevTal) { // 같은 줄(순번) 기준: 줄이 없었으면 신규, 내용이 바뀌었으면 변경
      const pt = prevTal[i];
      if (!pt) diff = diffMark('new', '신규', '');
      else if (pt.k === t.k && (pt.cnt || 1) !== (t.cnt || 1)) diff = diffMark('chg', '변경', `개수 ×${pt.cnt || 1}`);
      else if (pt.k !== t.k) {
        const pm = pt.effect.match(/^\[([^\]]+)\]/);
        diff = diffMark('chg', '변경', `${pm ? pm[1] : pt.effect.slice(0, 24)} (${pt.type})`);
      }
    }
    // 제노 프리즘·역상: 핵심 재능 3~5번째 칸에만 장착 버튼 — 같은 칸에 둘이 공존 불가 (각각 빌드당 1개)
    let nameHtml = `<span class="tlink tname" data-tidx="${i}">${escapeHtml(nm)}</span>`;
    let prismBtn = '', invBtn = '';
    if (gi === 0) {
      const pos = ord + 1;
      const pr = preset.prism;
      const inv = preset.inverse;
      if (pr && pr.pos === pos) {
        const it = prismItemOf(pr);
        if (it.talent && !prismAddedTalent(pr)) {
          const tipTxt = '프리즘으로 교체: ' + it.talent + (prismTalentDesc(it) ? '\n' + prismTalentDesc(it) : '');
          nameHtml = `<span class="tlink tname tal-replaced" data-tidx="${i}">${escapeHtml(nm)}</span> <span class="tal-swap tip2" title="${escapeHtml(tipTxt)}">→ ${escapeHtml(it.talent)}</span>`;
        }
      } else if (!pr && pos >= 3 && pos <= 5 && PRISM.items.length && !(inv && inv.pos === pos)) {
        prismBtn = `<button class="btn-sel btn-prism" onclick="startPrism(${pos})" title="이 칸에 제노 프리즘 장착 (3~5번째 칸, 빌드당 1개)">프리즘</button>`;
      }
      if (pos >= 3 && pos <= 5 && !inv && !(pr && pr.pos === pos)) {
        invBtn = `<button class="btn-sel btn-inverse" onclick="startInverse(${pos})" title="이 칸에 역상 장착 (3~5번째 칸, 빌드당 1개)">역상</button>`;
      }
    }
    // 석판·운명은 같은 것을 여러 장 쓸 수 있어 개수(×N) 조절 버튼 제공
    const cnt = t.cnt || 1;
    const cntHtml = gi >= 1 && cnt > 1 ? ` <span class="psum">×${cnt}</span>` : '';
    // 출처 석판 표기 (로그 가져오기 시 어느 석판 아이템에서 온 옵션인지)
    const srcHtml = gi === 1 && t.src && t.src.length
      ? ` <span class="tal-src tip2" title="${escapeHtml('출처 석판: ' + t.src.join(', '))}">◈ ${escapeHtml(t.src[0] + (t.src.length > 1 ? ' 외 ' + (t.src.length - 1) : ''))}</span>`
      : '';
    const cntBtns = gi >= 1
      ? `<button class="btn-sel" onclick="bumpTalentCnt(${i}, -1)" title="개수 줄이기"${cnt <= 1 ? ' disabled' : ''}>−</button><button class="btn-sel" onclick="bumpTalentCnt(${i}, 1)" title="같은 ${gi === 1 ? '석판 옵션' : '운명'}을 여러 장 쓸 때 개수 늘리기">＋</button>`
      : '';
    return `<tr draggable="true" data-tal="${i}"><td class="pslot-label tal-cut tip2 cut-tip" title="${escapeHtml(t.type)}"><span class="drag-handle" title="드래그로 순서 변경">⠿</span>${escapeHtml(t.type)}</td><td class="tal-cut"><div class="tal-flex"><span class="tal-name">${nameHtml}</span>${cntHtml}${srcHtml}${missing}${diff}</div></td><td class="pbtns"><div class="pbtns-wrap">${prismBtn}${invBtn}${cntBtns}<button class="btn-sel mv-btn" onclick="moveTalent(${i}, -1)" title="위로">▲</button><button class="btn-sel mv-btn" onclick="moveTalent(${i}, 1)" title="아래로">▼</button><button class="btn-sel" onclick="removeTalent(${i})">삭제</button></div></td></tr>`;
  };
  renderSlateBoard();
  renderTalentBoard();
  // 프리즘 하위 줄: 장착 칸(pos번째 핵심 재능) 바로 아래에 한 단 들여쓴 줄로 표시
  const prismRowHtml = () => {
    const pr = preset.prism;
    const it = prismItemOf(pr);
    const optCnt = pr.opts.filter(Boolean).length;
    const added = prismAddedTalent(pr);
    const live = PRISM.items.some(x => x.name === pr.name);
    return `<tr class="prism-row" data-prismedit><td class="pslot-label tal-cut tip2 cut-tip" title="제노 프리즘"><span class="prism-ind">ㄴ</span>💠 프리즘</td><td class="tal-cut"><span class="tlink prname" data-prism>${escapeHtml(pr.name.replace('제노 프리즘: ', ''))}</span><span class="psum">옵션 ${optCnt}/3</span>${added ? ` <span class="tal-swap">+ [${escapeHtml(added)}] 추가</span>` : ''}${live ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</td><td class="pbtns"><button class="btn-sel" onclick="clearPrism()">삭제</button></td></tr>`;
  };
  // 역상 하위 줄: 장착 칸 아래에 중요도(하위/중위/절대) O·X 표기
  const inverseRowHtml = () => {
    const inv = preset.inverse;
    const chip = (label, on) => `<span class="inv-flag${on ? ' on' : ''}">${label} ${on ? 'O' : 'X'}</span>`;
    return `<tr class="prism-row" data-invedit><td class="pslot-label tal-cut"><span class="prism-ind">ㄴ</span>🔄 역상</td><td class="tal-cut">${chip('하위', inv.opts.low)}${chip('중위', inv.opts.mid)}${chip('절대', inv.opts.abs)}</td><td class="pbtns"><button class="btn-sel" onclick="clearInverse()">삭제</button></td></tr>`;
  };
  renderPresetPact(); // 정령 3칸 — 운명은 이 아래에 이어서 나온다
  renderPresetHeroTraits();
  // 3패널(핵심 재능/석판/운명)로 나눠 표시 — 배열 순서는 유지, 인덱스는 원본 배열 기준
  const TAL_TBODY = ['presetTalTbody', 'presetSlabTbody', 'presetDstTbody'];
  const TAL_CNT = ['presetTalCount', 'presetSlabCount', 'presetDstCount'];
  const TAL_EMPTY = ['noPresetTal', 'noPresetSlab', 'noPresetDst'];
  TAL_TBODY.forEach((id, gi) => {
    let rows = preset.talents.map((t, i) => ({t, i})).filter(x => talGroup(x.t.type) === gi);
    let lowToggle = '';
    if (gi === 1 && rows.length) {
      // 석판: 핵심(명칭) > 레전드 중위·절대자 > 중위 > 하위 순 표시, 같은 등급끼리는 개수(×N) 많은 것 먼저, 중위·하위는 접힘 (저장 순서는 유지 — 표시만)
      rows = rows.map((x, k) => ({...x, rk: slateRank(x.t), k})).sort((a, b) => a.rk - b.rk || (b.t.cnt || 1) - (a.t.cnt || 1) || a.k - b.k);
      const low = rows.filter(x => x.rk >= 2);
      if (low.length) {
        const main = rows.filter(x => x.rk < 2);
        rows = slabLowOpen ? [...main, ...low] : main;
        lowToggle = `<tr class="prism-row" onclick="toggleSlabLow()" style="cursor:pointer"><td class="pslot-label"><span class="prism-ind">ㄴ</span></td>` +
          `<td colspan="2" style="color:#8b949e;font-size:12px">${slabLowOpen ? '▾' : '▸'} 중위·하위 재능 ${low.length}개 ${slabLowOpen ? '접기' : '펼치기'}</td></tr>`;
      }
    }
    const rowHtml = rows.map((x, ord) => talRowHtml(x.t, x.i, gi, ord));
    // 토글 줄은 핵심 구간 바로 아래 — 접힘이면 목록 끝, 펼침이면 중위·하위 구간 시작 앞
    if (gi === 1 && lowToggle) rowHtml.splice(rows.filter(x => x.rk < 2).length, 0, lowToggle);
    // 프리즘·역상은 핵심 재능 패널에서 장착 칸 다음 줄에 삽입 (칸이 모자라면 맨 아래, 높은 pos부터 삽입해 인덱스 유지)
    if (gi === 0) {
      const subs = [];
      if (preset.prism) subs.push({pos: preset.prism.pos, html: prismRowHtml()});
      if (preset.inverse) subs.push({pos: preset.inverse.pos, html: inverseRowHtml()});
      subs.sort((a, b) => b.pos - a.pos).forEach(s => rowHtml.splice(Math.min(s.pos, rows.length), 0, s.html));
    }
    document.getElementById(id).innerHTML = rowHtml.join('');
    let cntTxt = gi === 0 ? rows.length + '/5' : rows.length; // 핵심 재능만 상한 표기
    if (gi === 2) { // 운명: 미정/중위(천명 포함)/하위 착용 수 — 기본 슬롯 3·4·9, 미정 확정으로 늘 수 있어 초과 허용
      let mj = 0, mid = 0, low = 0;
      rows.forEach(x => { const c = x.t.cnt || 1; if (isUndecidedDst(x.t)) mj += c; else if ((x.t.type || '').includes('하위')) low += c; else mid += c; });
      cntTxt = `미정 ${mj}/3 · 중위 ${mid}/4 · 하위 ${low}/9`;
    }
    document.getElementById(TAL_CNT[gi]).textContent = cntTxt;
    document.getElementById(TAL_EMPTY[gi]).style.display = rows.length || (gi === 0 && (preset.prism || preset.inverse)) ? 'none' : 'block';
  });

  // 추억: 행=근원/자기 수호/진격, 칩=기본·고유2·랜덤2 (행 클릭=편집, 칩 호버=효과 전문)
  // 등급 칩은 클릭하면 그 이하 → 엘리트·레어 → 절대자로 돈다 (편집 팝업이 열리지 않도록 이벤트를 멈춘다)
  if (!preset.mems) preset.mems = {};
  const memChip = (part, o, cls, ph) => {
    if (!o) return `<span class="mem-chip empty">${ph}</span>`;
    // 로그 실측값(o.v)이 있으면 문구 수치에 끼운다 — 기본 속성은 성장형이라 만렙 문구와 다를 수 있다
    const eff = applyRollText((KEY_MAP.get(o.k) || o).effect, o.v);
    return `<span class="mem-chip ${cls} tip2" title="${escapeHtml(part + ' · ' + o.type + '\n' + eff)}">${escapeHtml(eff)}</span>`;
  };
  const memChips = (part, m) => m
    ? memChip(part, m.basic[0], 'mc-b', '기본') + memChip(part, m.unique[0], 'mc-u', '고유') + memChip(part, m.unique[1], 'mc-u', '고유') + memChip(part, m.random[0], 'mc-r', '랜덤') + memChip(part, m.random[1], 'mc-r', '랜덤')
    : `<span class="pempty">비어 있음 · 클릭해서 제작</span>`;
  document.getElementById('presetMemTbody').innerHTML = MEM_PARTS.map(part => {
    const m = preset.mems[part];
    const rv = preset.revival && preset.revival.part === part ? preset.revival : null;
    // 부활 버튼: 제작된 추억 + 아직 부활 옵션이 없을 때만 (하나의 추억에만 적용 가능)
    const btns = m
      ? (!preset.revival && REVIVALS.length ? `<button class="btn-sel btn-revival" onclick="openRevivalPicker('${part}')" title="이 추억에 부활 옵션 적용 (하나의 추억에만 1개)">부활</button>` : '') +
        `<button class="btn-sel" onclick="clearMem('${part}')">비우기</button>`
      : '';
    // 등급 칩 — 히어로 특성 레벨이 이 등급을 따라가므로 추억 줄에 함께 보여준다
    const gradeChip = m ? memGradeChip(part) : '';
    let h = `<tr class="pedit" data-pmemedit="${part}"><td class="pslot-label tal-cut">${gradeChip}${part.replace('의 추억', '')}</td><td><div class="mem-chips">${memChips(part, m)}</div></td><td class="pbtns">${btns}</td></tr>`;
    if (rv) {
      // 부활 옵션 하위 줄 (ㄴ 들여쓰기) — 행 클릭=다시 선택, 효과 호버=전문 툴팁
      const live = revivalData(rv);
      const tip = lineTipText('부활 옵션', rv.group + (live && live.tier ? ' · T' + live.tier : ''), rv.effect, REVIVALS);
      h += `<tr class="pedit revival-row" data-rvedit="${part}"><td class="pslot-label tal-cut"><span class="prism-ind">ㄴ</span>🌙 부활</td><td class="tal-cut"><span class="mem-chip mc-rv tip2" title="${escapeHtml(tip)}">부활 옵션: ${escapeHtml(rv.effect)}</span>${live ? '' : ' <span class="missing-tag">현재 데이터에 없음</span>'}</td><td class="pbtns"><button class="btn-sel" onclick="clearRevival()">삭제</button></td></tr>`;
      // "기본 특성 슬롯 추가" 옵션이면 추가 추억 칸 한 줄 더 (등급 제한은 표시만, 제작은 동일 마법사)
      const xp = revivalExtraPart(rv.effect);
      if (xp) {
        const xbtn = rv.mem ? `<button class="btn-sel" onclick="clearRevivalMem()">비우기</button>` : '';
        h += `<tr class="pedit revival-row" data-pmemedit="${xp}" data-memx="1"><td class="pslot-label tal-cut tip2 cut-tip" title="부활 옵션으로 추가된 ${xp} 슬롯"><span class="prism-ind">ㄴ</span>➕ ${rv.mem ? memGradeChip(xp + '#x') : ''}${xp.replace('의 추억', '')}</td><td><div class="mem-chips">${memChips(xp, rv.mem)}</div></td><td class="pbtns">${xbtn}</td></tr>`;
      }
    }
    return h;
  }).join('');
  document.getElementById('presetMemCount').textContent = `${MEM_PARTS.filter(pt => preset.mems[pt]).length}/3`;
  // 비교 모드: 이전 빌드에는 있었지만 지금은 없는 재능 수 안내
  const talDiffEl = document.getElementById('presetTalDiff');
  if (prevTal) {
    const removed = Math.max(0, prevTal.length - preset.talents.length);
    talDiffEl.textContent = removed ? `(이전 대비 줄 -${removed})` : '';
  } else {
    talDiffEl.textContent = '';
  }
  const skFilled = renderPresetSkills();
  const filled = PRESET_SLOTS.filter(s => preset.slots[s.id]).length;
  const memFilled = MEM_PARTS.filter(pt => preset.mems[pt]).length;
  document.getElementById('presetEqCount').textContent = `${filled}/10`;
  document.getElementById('resultCount').innerHTML = `<span>${filled + memFilled + preset.talents.length + skFilled + (preset.prism ? 1 : 0) + (preset.inverse ? 1 : 0) + (preset.revival ? 1 : 0) + (preset.revival && preset.revival.mem ? 1 : 0)}</span>개 저장`;
}

// ── 빌드 내보내기 (이미지 / PDF) ──
const _stripDiv = document.createElement('div');
// <br>은 textContent에서 사라져 앞뒤 단어가 붙으므로 공백으로 치환 (침식 corr·일부 opts에 <br> 존재)
function stripHtml(s) { _stripDiv.innerHTML = String(s).replace(/<br\s*\/?>/gi, ' '); return _stripDiv.textContent.replace(/\s+/g, ' ').trim(); }
function reportDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 빌드 전체를 내보내기용 순수 데이터(HTML 제거)로 수집
function collectReport() {
  const slots = [];
  PRESET_SLOTS.forEach(s => {
    const v = preset.slots[s.id];
    if (!v) return;
    const label = s.id === 'weapon1' && PARTS.TWO_HAND.includes(v.part) ? '무기 (양손)' : s.label;
    const ero = v.ero || []; // 침식 강화 마킹 — 통합 순번(slotOptList와 동일), 텍스트에 [침식] 표기
    if (v.kind === 'item') {
      const idx = ITEMS.findIndex(x => x.name === v.name);
      const it = idx >= 0 ? ITEMS[idx] : v.snap;
      slots.push({label, kind: 'item', name: it.name, img: it.img, tags: it.tags || [],
        attrs: (it.attrs || []).map(stripHtml),
        opts: (it.opts || []).map((o, i) => ero.includes(i) && it.corr && it.corr[i] ? stripHtml(it.corr[i][1]) + ' [침식]' : stripHtml(o)),
        flavor: it.flavor ? stripHtml(it.flavor) : '', blend: v.blend ? v.blend.effect : '', tower: v.tower ? v.tower.effect : ''});
    } else if (v.kind === 'blood') {
      const nb = (v.opts.base || []).length, nl = v.opts.blood.length;
      slots.push({label, kind: 'blood', name: v.name || `블러드 제작 ${v.part}`, part: v.part,
        blood: v.opts.blood.map((o, i) => {
          const corr = ero.includes(nb + i) ? bloodLegendCorr(o) : null;
          return `${corr ? stripHtml(corr) : (KEY_MAP.get(o.k) || o).effect} (${o.type})${ero.includes(nb + i) ? ' [침식]' : ''}`;
        }),
        base: (v.opts.base || []).map((o, i) => o.effect + (ero.includes(i) ? ' [침식]' : '')),
        extra: (v.opts.extra || []).map((o, i) => ero.includes(nb + nl + i) ? `${eroEffect(o)} (${o.type}) [침식]` : `${tierEffect(o)} (${o.type})`),
        blend: v.blend ? v.blend.effect : '', tower: v.tower ? v.tower.effect : ''});
    } else {
      let off = 0;
      const sec = arr => {
        const base = off;
        off += arr.length;
        // 내보내기 본문은 티어 토글과 무관하게 T1 고정이므로, 침식도 그 한 단계 위인 T0 고정
        return arr.map((o, i) => ero.includes(base + i) ? tierEffectAt(o, '0') + ' [침식]' : (KEY_MAP.get(o.k) || o).effect);
      };
      slots.push({label, kind: 'custom', name: customName(v), part: v.part,
        basic: sec(v.opts.basic), main: sec(v.opts.main), sub: sec(v.opts.sub),
        blend: v.blend ? v.blend.effect : '', tower: v.tower ? v.tower.effect : ''});
    }
  });
  const talents = preset.talents.map(t => {
    const eff = (KEY_MAP.get(t.k) || t).effect;
    const m = eff.match(/^\[([^\]]+)\]\s*(.*)$/);
    const cnt = (t.cnt || 1) > 1 ? ` ×${t.cnt}` : '';
    return {name: (m ? m[1] : '재능') + cnt, type: t.type, desc: m ? m[2] : eff};
  });
  // 제노 프리즘: 장착 칸(pos번째 핵심 재능) 바로 뒤에 끼워 넣음 (type이 핵심 재능 그룹으로 분류됨)
  if (preset.prism) {
    const pr = preset.prism, it = prismItemOf(pr);
    const added = prismAddedTalent(pr);
    const lines = [];
    if (it.effect) lines.push(it.effect);
    if (it.talent) lines.push(added ? `기존 재능 유지 + [${added}] 추가` : `기존 핵심 재능을 [${it.talent}](으)로 교체`);
    pr.opts.forEach((o, i) => { if (o) lines.push(`${i + 1}번: ${o.effect}`); });
    let seen = 0, at = talents.length;
    for (let j = 0; j < preset.talents.length; j++) {
      if (talGroup(preset.talents[j].type) === 0 && ++seen === pr.pos) { at = j + 1; break; }
    }
    talents.splice(at, 0, {name: '💠 ' + pr.name.replace('제노 프리즘: ', ''), type: '제노 프리즘', desc: lines.join(' / ')});
  }
  // 역상: 장착 칸 뒤에 중요도 요약 줄로 (프리즘이 앞 칸에 끼어 있으면 한 칸 밀림 보정)
  if (preset.inverse) {
    const iv = preset.inverse;
    const s = `하위 ${iv.opts.low ? 'O' : 'X'} · 중위 ${iv.opts.mid ? 'O' : 'X'} · 절대 ${iv.opts.abs ? 'O' : 'X'}`;
    let seen = 0, at = talents.length;
    for (let j = 0; j < preset.talents.length; j++) {
      if (talGroup(preset.talents[j].type) === 0 && ++seen === iv.pos) { at = j + 1; break; }
    }
    if (preset.prism && preset.prism.pos < iv.pos) at++;
    talents.splice(Math.min(at, talents.length), 0, {name: '🔄 역상', type: '역상', desc: s});
  }
  const skills = SKILL_SLOTS.filter(sl => preset.skills[sl.id] && preset.skills[sl.id].main).map(sl => {
    const sk = preset.skills[sl.id];
    // 스킬 빌드 표기와 동일하게 칸 번호 + 이름만 (부귀/숭고는 스킬명에 이미 포함됨)
    const sups = sk.sup.map((sp, i) => sp ? `${i + 1}. ${sp.name}` : null).filter(Boolean);
    return {label: sl.label, name: sk.main.name, kind: sk.main.kind, sups};
  });
  MEM_PARTS.forEach(pt => {
    const m = preset.mems && preset.mems[pt];
    if (!m) return;
    const sec = arr => arr.map(o => (KEY_MAP.get(o.k) || o).effect);
    const rv = preset.revival && preset.revival.part === pt ? preset.revival : null;
    slots.push({label: '추억', kind: 'mem', name: pt, basic: sec(m.basic), unique: sec(m.unique), random: sec(m.random),
      revival: rv ? rv.effect : ''});
    if (rv && rv.mem && revivalExtraPart(rv.effect)) { // 부활 옵션의 추가 추억도 별도 카드
      const x = rv.mem;
      slots.push({label: '추억', kind: 'mem', name: revivalExtraPart(rv.effect) + ' (부활 추가)', basic: sec(x.basic), unique: sec(x.unique), random: sec(x.random)});
    }
  });
  return {slots, talents, skills};
}

// CORS 허용 시에만 이미지 로드 (실패/차단이어도 캔버스는 오염되지 않음)
function loadImageSafe(url, ms) {
  return new Promise(res => {
    if (!url) return res(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const to = setTimeout(() => res(null), ms || 4000);
    img.onload = () => { clearTimeout(to); res(img); };
    img.onerror = () => { clearTimeout(to); res(null); };
    img.src = url;
  });
}

// 캔버스 텍스트 줄바꿈 (공백 기준, 긴 단어는 글자 단위 분할)
function wrapLines(ctx, text, maxW) {
  const lines = [];
  let line = '';
  text.split(' ').forEach(wd => {
    const t = line ? line + ' ' + wd : wd;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = wd; }
    else line = t;
    while (ctx.measureText(line).width > maxW && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  });
  if (line) lines.push(line);
  return lines;
}

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const RP_FONT = '"Malgun Gothic","Apple SD Gothic Neo",sans-serif';
// 슬롯 카드 하나를 측정(draw=false) 또는 그리기(draw=true). 높이 반환
function drawSlotCard(ctx, c, x, y, w, draw, imgMap) {
  const pad = 14, inner = w - pad * 2, lh = 18;
  let cy = y + pad;
  const wrap = (t, font, color, maxW) => {
    ctx.font = font;
    wrapLines(ctx, t, maxW || inner).forEach(l => {
      if (draw) { ctx.fillStyle = color; ctx.fillText(l, x + pad, cy + 12); }
      cy += lh;
    });
  };
  const divider = () => {
    cy += 5;
    if (draw) { ctx.strokeStyle = '#2a3550'; ctx.beginPath(); ctx.moveTo(x + pad, cy); ctx.lineTo(x + w - pad, cy); ctx.stroke(); }
    cy += 7;
  };
  wrap(c.label + '  ·  ' + (c.kind === 'item' ? '레전드' : c.kind === 'blood' ? '블러드 제작' : '직접 제작'), '11px ' + RP_FONT, '#8b949e');
  cy += 3;
  // 조향·타워 시퀀스는 옵션 목록보다 위(이름 바로 아래)에 표시
  const addons = () => {
    if (c.blend) {
      divider();
      wrap('조향', '11px ' + RP_FONT, '#8b949e');
      wrap('· ' + c.blend, '12px ' + RP_FONT, '#b5e48c');
    }
    if (c.tower) {
      divider();
      wrap('타워 시퀀스', '11px ' + RP_FONT, '#8b949e');
      wrap('· ' + c.tower, '12px ' + RP_FONT, '#7dd3fc');
    }
  };
  if (c.kind === 'item') {
    const im = imgMap && imgMap.get(c.name);
    const tw = inner - (im ? 54 : 0); // 이미지가 있으면 우상단 공간 확보
    if (im && draw) {
      const iw = 44, ih = iw * (im.height / im.width);
      ctx.drawImage(im, x + w - pad - iw, y + pad + 4, iw, ih);
    }
    wrap(c.name, 'bold 16px ' + RP_FONT, '#ffd700', tw);
    if (c.tags.length) wrap(c.tags.join(' · '), '11px ' + RP_FONT, '#8b949e', tw);
    addons();
    if (c.attrs.length) { divider(); c.attrs.forEach(a => wrap(a, '12px ' + RP_FONT, '#dddddd')); }
    if (c.opts.length) { divider(); c.opts.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0')); }
    if (c.flavor) { cy += 4; wrap(c.flavor, 'italic 11px ' + RP_FONT, '#dbb97c'); }
  } else if (c.kind === 'blood') {
    wrap(c.name, 'bold 16px ' + RP_FONT, '#ff6e5e');
    wrap(c.part + ' · 블러드 제작 장비', '11px ' + RP_FONT, '#8b949e');
    addons();
    if (c.base && c.base.length) {
      divider();
      wrap('기본 옵션', '11px ' + RP_FONT, '#8b949e');
      c.base.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0'));
    }
    divider();
    wrap('레전드 추출 옵션', '11px ' + RP_FONT, '#8b949e');
    c.blood.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0'));
    if (c.extra && c.extra.length) {
      divider();
      wrap('추가 옵션', '11px ' + RP_FONT, '#8b949e');
      c.extra.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0'));
    }
  } else if (c.kind === 'mem') {
    wrap(c.name, 'bold 16px ' + RP_FONT, '#c9a86a');
    const sec = (label, arr) => {
      if (!arr.length) return;
      divider();
      wrap(label, '11px ' + RP_FONT, '#8b949e');
      arr.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0'));
    };
    if (c.revival) { // 부활 옵션은 이름 바로 아래
      divider();
      wrap('부활 옵션', '11px ' + RP_FONT, '#8b949e');
      wrap('· ' + c.revival, '12px ' + RP_FONT, '#fcd34d');
    }
    sec('기본 속성', c.basic);
    sec('고유 옵션', c.unique);
    sec('랜덤 옵션', c.random);
  } else {
    wrap(c.name, 'bold 16px ' + RP_FONT, '#7db4ff');
    if (c.name !== `${c.part} (제작)`) wrap(c.part, '11px ' + RP_FONT, '#8b949e'); // 사용자 지정 이름일 때만 부위 표기
    addons();
    const sec = (label, arr) => {
      if (!arr.length) return;
      divider();
      wrap(label, '11px ' + RP_FONT, '#8b949e');
      arr.forEach(a => wrap('· ' + a, '12px ' + RP_FONT, '#c8d2e0'));
    };
    sec('기본 옵션', c.basic);
    sec('메인 옵션', c.main);
    sec('서브 옵션', c.sub);
  }
  return cy + pad - y;
}

// 재능 한 줄을 측정/그리기. 높이 반환
function drawTalentRow(ctx, t, x, y, w, draw) {
  const pad = 9, inner = w - pad * 2, lh = 16;
  let cy = y + pad;
  ctx.font = 'bold 13px ' + RP_FONT;
  if (draw) {
    ctx.fillStyle = '#ffd700';
    ctx.fillText(t.name, x + pad, cy + 10);
    const nw = ctx.measureText(t.name).width;
    ctx.font = '11px ' + RP_FONT;
    ctx.fillStyle = '#8b949e';
    ctx.fillText('· ' + t.type, x + pad + nw + 8, cy + 10);
  }
  cy += lh + 2;
  ctx.font = '12px ' + RP_FONT;
  wrapLines(ctx, t.desc, inner).forEach(l => {
    if (draw) { ctx.fillStyle = '#c8d2e0'; ctx.fillText(l, x + pad, cy + 10); }
    cy += lh - 1;
  });
  return cy + pad - 2 - y;
}

// ── 이미지 미리보기 오버레이 ──
let previewCanvas = null;
function showImagePreview(cv) {
  previewCanvas = cv;
  document.getElementById('imgPreviewImg').src = cv.toDataURL('image/png');
  document.getElementById('imgPreview').style.display = 'flex'; modalHistPush();
}
function closeImagePreview() {
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('imgPreviewImg').src = '';
  previewCanvas = null;
}
function downloadPreviewImage() {
  if (!previewCanvas) return;
  previewCanvas.toBlob(b => {
    if (!b) { alert('이미지 생성에 실패했습니다.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    const safeName = preset.name.replace(/[\\/:*?"<>|]/g, '').trim();
    a.download = `토치라이트_빌드_${safeName ? safeName + '_' : ''}${reportDateStr()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
// Ctrl+S(⌘+S) 브라우저 저장 대화상자 차단 — 메모 등 입력 후 습관적 저장 방지
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) e.preventDefault();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  let handled = false;
  if (previewCanvas) { closeImagePreview(); handled = true; }
  if (pendingBackup) { closeBackupModal(); handled = true; }
  if (document.getElementById('blendModal').style.display !== 'none') { closeBlendPicker(); handled = true; }
  if (document.getElementById('corrModal').style.display !== 'none') { closeCorrPicker(); handled = true; }
  if (document.getElementById('towerModal').style.display !== 'none') { closeTowerPicker(); handled = true; }
  if (document.getElementById('revivalModal').style.display !== 'none') { closeRevivalPicker(); handled = true; }
  if (document.getElementById('inverseModal').style.display !== 'none') { closeInverse(); handled = true; }
  if (!handled && typeof shareView !== 'undefined' && shareView) { exitShareView(); handled = true; }
  if (document.getElementById('shareUpModal').style.display !== 'none') { closeShareUp(); handled = true; }
  if (document.getElementById('bloodPoolModal').style.display !== 'none') { wizCancel(); handled = true; }
  if (document.getElementById('uiModal').style.display !== 'none') { closeUiModal(); handled = true; }
  if (document.getElementById('patchModal').style.display !== 'none') { closePatch(); handled = true; }
  // 모달이 없을 때 편집 모드(레전드 선택·직접 제작·블러드·재능·스킬 선택) 중이면 취소하고 빌드 탭 복귀
  if (!handled && build) endBuild(false);
});

let exportingPng = false;
async function exportPresetImage(dataOverride) {
  if (exportingPng) return;
  const data = dataOverride || collectReport();
  if (!data.slots.length && !data.talents.length && !data.skills.length) { alert('저장된 빌드가 없습니다.'); return; }
  exportingPng = true;
  try {
    // 아이템 이미지 미리 로드 (CDN이 CORS를 막으면 이미지 없이 저장됨)
    const imgMap = new Map();
    await Promise.all(data.slots.filter(c => c.kind === 'item' && c.img)
      .map(c => loadImageSafe(c.img).then(im => { if (im) imgMap.set(c.name, im); })));

    const W = 1000, M = 16, colW = (W - M * 3) / 2;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');

    // 메모: 줄바꿈 유지 + 폭 초과 시 자동 줄바꿈 (헤더 높이도 줄 수만큼 확장)
    const memoLines = [];
    if (preset.memo) {
      ctx.font = '12px ' + RP_FONT;
      const maxW = W - M * 2 - 24;
      preset.memo.split('\n').forEach(par => {
        let line = '';
        for (const ch of par) {
          if (line && ctx.measureText(line + ch).width > maxW) { memoLines.push(line); line = ch; }
          else line += ch;
        }
        memoLines.push(line);
      });
    }
    // 제목: 길면 잘리는 대신 줄바꿈 (첫 줄은 우측 날짜·크레딧 영역을 피해서 폭 제한)
    const titleLines = [];
    {
      ctx.font = 'bold 20px ' + RP_FONT;
      const heroTxt = preset.hero ? ` [${heroLabel(preset.hero)}]` : '';
      const titleFull = `토치라이트 인피니트 장비 빌드 — ${preset.name.slice(0, 60)}${heroTxt}`;
      const titleMaxW = W - M * 2 - 270;
      let line = '';
      for (const ch of titleFull) {
        if (line && ctx.measureText(line + ch).width > titleMaxW) { titleLines.push(line); line = ch; }
        else line += ch;
      }
      titleLines.push(line);
    }
    const titleExtra = (titleLines.length - 1) * 26;
    const headH = (memoLines.length ? 56 + memoLines.length * 17 + 5 : 56) + titleExtra;

    // 1차: 카드 높이 측정 — 게임 장비창 배치(투구·갑옷 / 목걸이·장갑 / 벨트·신발 / 반지·반지 / 무기·무기) 짝 단위로 행 정렬
    const bySlot = new Map(data.slots.map(c => [c.label, c]));
    let rowY = headH;
    const pos = [];
    for (let i = 0; i < PRESET_SLOTS.length; i += 2) {
      const L = bySlot.get(PRESET_SLOTS[i].label), R = bySlot.get(PRESET_SLOTS[i + 1].label);
      if (!L && !R) continue;
      const hL = L ? drawSlotCard(ctx, L, 0, 0, colW, false, imgMap) : 0;
      const hR = R ? drawSlotCard(ctx, R, 0, 0, colW, false, imgMap) : 0;
      if (L) pos.push({c: L, col: 0, y: rowY, h: hL});
      if (R) pos.push({c: R, col: 1, y: rowY, h: hR});
      rowY += Math.max(hL, hR) + M;
    }
    // 추억 카드는 장비 짝 아래 한 줄 3분할 (부활 추가 추억으로 4개 이상이면 다음 줄로)
    const memCards = data.slots.filter(c => c.kind === 'mem');
    for (let mi = 0; mi < memCards.length; mi += 3) {
      const memW = (W - M * 4) / 3;
      let maxH = 0;
      memCards.slice(mi, mi + 3).forEach((c, i) => {
        const h = drawSlotCard(ctx, c, 0, 0, memW, false, imgMap);
        pos.push({c, x: M + i * (memW + M), w: memW, y: rowY, h});
        maxH = Math.max(maxH, h);
      });
      rowY += maxH + M;
    }
    const heights = [rowY, rowY];
    // 스킬·재능 섹션 (같은 행 레이아웃 재사용)
    const skillRows = data.skills.map(s => ({name: s.name, type: `${s.label} · ${s.kind}`, desc: '보조: ' + (s.sups.length ? s.sups.join(' · ') : '-')}));
    const sections = [];
    // 재능 3묶음 구분: 재능 계열(레전드 석판 포함) / 비레전드 신격의 석판 / 운명(숙명)
    TAL_GROUPS.forEach((g, gi) => {
      const rows = data.talents.filter(t => talGroup(t.type) === gi);
      if (rows.length) sections.push({title: `${g} (${rows.length})`, rows});
    });
    if (skillRows.length) sections.push({title: `🔮 스킬 (${skillRows.length})`, rows: skillRows});
    let ty = Math.max(heights[0], heights[1]);
    sections.forEach(sec => {
      sec.titleY = ty + 18;
      ty += 30;
      // 재능·스킬 행도 2컬럼으로 짧은 쪽부터 채움 (세로 길이 절반 + 여백 축소)
      const colH = [ty, ty];
      sec.pos = sec.rows.map(t => {
        const h = drawTalentRow(ctx, t, 0, 0, colW, false);
        const col = colH[0] <= colH[1] ? 0 : 1;
        const p = {t, col, y: colH[col], h};
        colH[col] += h + 6;
        return p;
      });
      ty = Math.max(colH[0], colH[1]) + 4;
    });
    const H = ty + 34;

    // 2차: 실제 그리기 (2배 해상도)
    const SCALE = 2;
    cv.width = W * SCALE;
    cv.height = H * SCALE;
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 20px ' + RP_FONT;
    titleLines.forEach((ln, i) => ctx.fillText(ln, M, 32 + i * 26));
    ctx.textAlign = 'right';
    ctx.font = '12px ' + RP_FONT;
    ctx.fillStyle = '#8b949e';
    ctx.fillText(reportDateStr() + ((preset.tier || '1') !== '1' ? ` · 제작 옵션 T${preset.tier} 기준` : '') + ' · Made by mToB', W - M, 32);
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(M, 42 + titleExtra); ctx.lineTo(W - M, 42 + titleExtra); ctx.stroke();
    ctx.lineWidth = 1;
    if (memoLines.length) {
      ctx.font = '12px ' + RP_FONT;
      ctx.fillStyle = '#b9c4d8';
      memoLines.forEach((ln, i) => ctx.fillText((i === 0 ? '📝 ' : '') + ln, M + (i === 0 ? 0 : 20), 60 + titleExtra + i * 17));
    }

    pos.forEach(p => {
      const cw = p.w || colW;
      const cx = p.x !== undefined ? p.x : M + p.col * (colW + M);
      rrPath(ctx, cx, p.y, cw, p.h, 10);
      ctx.fillStyle = '#1c2333'; ctx.fill();
      ctx.strokeStyle = '#30363d'; ctx.stroke();
      drawSlotCard(ctx, p.c, cx, p.y, cw, true, imgMap);
    });
    sections.forEach(sec => {
      ctx.font = 'bold 15px ' + RP_FONT;
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(sec.title, M, sec.titleY);
      sec.pos.forEach(p => {
        const cx = M + p.col * (colW + M);
        rrPath(ctx, cx, p.y, colW, p.h, 8);
        ctx.fillStyle = '#1c2333'; ctx.fill();
        ctx.strokeStyle = '#30363d'; ctx.stroke();
        drawTalentRow(ctx, p.t, cx, p.y, colW, true);
      });
    });
    ctx.font = '11px ' + RP_FONT;
    ctx.fillStyle = '#556a8f';
    ctx.fillText('출처: tlidb.com', M, H - 12);

    showImagePreview(cv); // 바로 저장하지 않고 미리보기 → 원하면 다운로드
  } catch (e) {
    alert('이미지 저장 중 오류가 발생했습니다: ' + e.message);
  } finally {
    exportingPng = false;
  }
}

const SKILL_IDX = new Map(SKILLS.map((s, i) => [s.name + '\u001f' + s.kind, i]));
// 아이콘이 없거나 CDN에서 깨진 경우(tlidb 원본도 일부 유실)를 위한 기본 아이콘
const SK_FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='#1c2333' stroke='#3a4a6b'/><text x='16' y='22' font-size='15' text-anchor='middle' fill='#566a8f'>✦</text></svg>");
function findSkill(ref) { const i = SKILL_IDX.get(ref.name + '\u001f' + ref.kind); return i === undefined ? -1 : i; }
// 액티브 메인에 특정 성격의 스킬이 장착돼 있는지 (제거 차단용)
function activeMainNames(pred) {
  return SKILL_SLOTS.filter(sl => sl.group === 'a').map(sl => {
    const sk = preset.skills[sl.id];
    const m = sk && sk.main;
    if (!m) return null;
    const i = findSkill(m);
    return i >= 0 && pred(SKILLS[i]) ? m.name : null;
  }).filter(Boolean);
}
function skillFilledCount(p) { return SKILL_SLOTS.filter(sl => p.skills && p.skills[sl.id] && p.skills[sl.id].main).length; }


// 스킬 검색용 텍스트 사전 계산 (이름+태그+분류+무기+메인 속성+설명)
let skillsPrepared = false;
function prepSkills() {
  if (skillsPrepared) return;
  SKILLS.forEach(s => {
    const at = skillAttrs(s);
    s._txt = [s.name, s.kind, (s.tags || []).join(' '), s.weapon || '',
      at.length ? '메인 속성 ' + at.join(' ') : '',
      stripHtml((s.desc || []).join(' ')), stripHtml((s.details || []).join(' '))].join(' ');
  });
  skillsPrepared = true;
}

// 스킬 탭 헤더 클릭 정렬 (장비 목록과 동일한 순환: 정순 → 역순 → 해제)
let skillSortKey = null, skillSortDir = 1;
function sortSkillBy(key) {
  if (skillSortKey === key) {
    if (skillSortDir === 1) skillSortDir = -1;
    else { skillSortKey = null; skillSortDir = 1; }
  } else {
    skillSortKey = key;
    skillSortDir = 1;
  }
  ['name', 'tags', 'kind'].forEach(k => {
    const el = document.getElementById('sort-sk-' + k);
    if (el) el.textContent = skillSortKey === k ? (skillSortDir === 1 ? '▲' : '▼') : '';
  });
  currentPage = 0;
  renderSkills();
}
function skillSortVal(s, key) { return key === 'tags' ? (s.tags || []).join(' ') : String(s[key] || ''); }

// 태그 필터 바: 중요도에 따라 3줄로 정리 (1줄=스킬 성격, 2줄=공격 방식·속성, 3줄=나머지 빈도순)
const TAG_ROW1 = ['공격', '주술', '소환', '오라', '자극', '영약', '실드', '저주'];
const TAG_ROW2 = ['원거리', '근접전', '지속', '채널링', '콤보', '투사체', '위치 이동', '물리', '화염', '냉기', '번개', '부식'];
function initSkillTagBar() {
  const cnt = new Map();
  SKILLS.forEach(s => (s.tags || []).forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
  const cb = t => `<label class="cb-label"><input type="checkbox" class="skill-tag-cb" value="${escapeHtml(t)}" onchange="doFilter()"> ${escapeHtml(t)}</label>`;
  const row1 = TAG_ROW1.filter(t => cnt.has(t));
  const row2 = TAG_ROW2.filter(t => cnt.has(t));
  const used = new Set([...row1, ...row2]);
  const rest = [...cnt.entries()].filter(([t]) => !used.has(t)).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const row = (label, arr) => `<div class="adv-row"><span class="adv-row-label">${label}</span><div class="adv-row-items">${arr.map(cb).join('')}</div></div>`;
  document.getElementById('skillTagBar').innerHTML =
    row('성격', row1) + row('방식 · 속성', row2) + row('기타', rest);
}
function toggleSkillTags(on) {
  document.querySelectorAll('.skill-tag-cb').forEach(cb => { cb.checked = on; });
  doFilter();
}
function toggleSkillAttrs(on) {
  document.querySelectorAll('.skill-attr-cb').forEach(cb => { cb.checked = on; });
  doFilter();
}
function toggleSkillKinds(on) {
  document.querySelectorAll('.skill-cb').forEach(cb => { cb.checked = on; });
  doFilter();
}

function renderSkills() {
  prepSkills();
  const tokens = parseTokens(document.getElementById('search').value.trim());
  const kinds = new Set([...document.querySelectorAll('.skill-cb:checked')].map(el => el.value));
  const tagCbs = document.querySelectorAll('.skill-tag-cb');
  const tagSet = new Set([...document.querySelectorAll('.skill-tag-cb:checked')].map(el => el.value));
  // 태그는 AND — 체크한 걸 **전부** 가진 스킬만 남는다(사용자 확정 2026-09-30).
  // 그래서 기본값이 '전부 해제' 다. 하나도 안 켜면 필터가 없는 것으로 본다.
  // (OR 이던 시절엔 기본이 전부 체크였고 '전부 체크면 필터 없음' 으로 껐다. 그 반대가 됐다.)
  const tagFilterOn = tagSet.size > 0;
  const tagArr = [...tagSet];
  const attrCbs = document.querySelectorAll('.skill-attr-cb');
  const attrSet = new Set([...document.querySelectorAll('.skill-attr-cb:checked')].map(el => el.value));
  const attrFilterOn = attrSet.size < attrCbs.length; // 전부 체크면 메인 속성 필터 없음
  const keywords = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const pk = build && build.skillPick ? build.skillPick : null;
  const pickGroup = pk ? SKILL_SLOTS.find(s => s.id === pk.slot).group : null;
  const pickable = pk
    ? (pk.socket === null ? (s => mainAllows(s, pickGroup)) : (s => socketKinds(pk.socket).includes(s.kind)))
    : null;
  // 3번(부귀)/5번(숭고) 칸: 메인 스킬과 짝이 맞는 것만 표시 ("메인명: 옵션(부귀)" 접두어 매칭)
  let specialKind = null, mainName = null;
  if (pk && (pk.socket === 2 || pk.socket === 4)) {
    specialKind = pk.socket === 2 ? '부귀 보조' : '숭고 보조';
    const skSlot = preset.skills[pk.slot];
    mainName = skSlot && skSlot.main ? skSlot.main.name : null;
  }
  // 선택 모드일 때 이미 장착된 스킬 집합 (배경 표시 + 재클릭 해제용)
  let onSet = null;
  if (pk) {
    onSet = new Set();
    const sk = preset.skills[pk.slot];
    if (sk) {
      if (pk.socket === null) { if (sk.main) onSet.add(sk.main.name + '\u001f' + sk.main.kind); }
      else sk.sup.forEach(sp => { if (sp) onSet.add(sp.name + '\u001f' + sp.kind); });
    }
  }
  let list = [];
  SKILLS.forEach((s, i) => {
    if (!kinds.has(s.kind)) return;
    // 메인과 짝이 안 맞는 부귀/숭고는 숨김
    if (specialKind && s.kind === specialKind && (!mainName || s.name.split(':')[0].trim() !== mainName)) return;
    // 태그 필터: 체크된 태그를 하나라도 가지면 표시 (태그 없는 스킬은 항상 표시)
    if (tagFilterOn && !tagArr.every(t => (s.tags || []).includes(t))) return;
    // 메인 속성 필터: 체크된 속성을 하나라도 가지면 표시 (메인 속성 없는 스킬은 항상 표시)
    if (attrFilterOn && skillAttrs(s).length && !skillAttrs(s).some(a => attrSet.has(a))) return;
    if (tokens.length && !tokens.every(g => {
      const hit = g.kws.some(kw => s._txt.includes(kw));
      return g.neg ? !hit : hit;
    })) return;
    list.push(i);
  });
  if (skillSortKey) list.sort((a, b) => skillSortVal(SKILLS[a], skillSortKey).localeCompare(skillSortVal(SKILLS[b], skillSortKey), 'ko') * skillSortDir);
  if (specialKind) { // 짝 맞는 부귀/숭고를 최상단으로
    const sp = list.filter(i => SKILLS[i].kind === specialKind);
    list = sp.concat(list.filter(i => SKILLS[i].kind !== specialKind));
  }
  // 장비 목록과 동일한 페이징 (하단 페이지 바 공유)
  pageSize = parseInt(document.getElementById('pageSize').value);
  totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  const pageSlice = list.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  document.getElementById('skillTbody').innerHTML = pageSlice.map(i => {
    const s = SKILLS[i];
    const isOn = onSet && onSet.has(s.name + '\u001f' + s.kind);
    const canPick = pickable && (pickable(s) || isOn);
    const cls = (canPick ? ' class="sk-pick' + (isOn ? ' sk-on' : '') + '"' : '');
    return `<tr${cls}${canPick ? ` data-pick="${i}"` : ''}><td class="sk-ico"><img src="${s.icon || SK_FALLBACK}" loading="lazy" onerror="this.onerror=null;this.src=SK_FALLBACK"></td>` +
      `<td><span class="slink" data-sidx="${i}">${highlight(s.name, keywords)}</span></td>` +
      `<td class="sk-tags">${(s.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</td>` +
      `<td class="sk-kind">${escapeHtml(s.kind)}</td><td class="star-td">${isOn ? '<span class="sk-added">✓</span>' : ''}</td></tr>`;
  }).join('');
  document.getElementById('noSkill').style.display = list.length ? 'none' : 'block';
  wtMiss('skill', (document.getElementById('search').value || '').trim(), list.length);
  document.getElementById('resultCount').innerHTML = `<span>${list.length.toLocaleString()}</span>개 결과`;
  updatePager();
}

// 스킬 상세 호버 카드
function skillCardHtml(s) {
  let h = '<div class="icard">';
  h += `<div class="icard-img"><img src="${s.icon || SK_FALLBACK}" loading="lazy" onerror="this.onerror=null;this.src=SK_FALLBACK" style="width:64px"></div>`;
  // 빌드에 장착된 스킬이면 옵션 보너스를 더한 최종 레벨까지 (Lv.20 → 27)
  const lvUp = presetSkillLevel(s);
  h += `<div class="icard-name">${escapeHtml(s.name)}${s.level ? ` <span class="sk-lv">Lv.${escapeHtml(s.level)}${lvUp ? '' : ''}</span>` : ''}` +
    (lvUp ? ` <span class="sk-lv sk-lvup" title="${escapeHtml(lvUp.tip)}">→ Lv.${lvUp.text}</span>` : '') + '</div>';
  h += `<div class="icard-tags"><span>${escapeHtml(s.kind)}</span>${(s.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;
  if (s.weapon) h += `<div class="sk-weapon">${escapeHtml(s.weapon)}</div>`;
  if (s.stats && s.stats.length) h += `<div class="icard-attrs">${s.stats.map(p => `<div>${escapeHtml(p[0])} <b class="m">${escapeHtml(p[1])}</b></div>`).join('')}</div>`;
  // 레벨 섹션이 정확한 값을 주므로 본문의 원본 표기 (Lv1:37/5) 같은 분수 나열은 지운다
  // (표가 없는 스킬에는 그 표기가 유일한 레벨 정보라 그대로 남긴다)
  const lvd = SKILL_LV[s.name];
  const clean = l => (lvd && lvd.rows) ? l.replace(/\s*\(Lv\d+:[^)]*\)/g, '') : l;
  // 원본은 첫 줄에 전체 요약을 담고 같은 내용을 줄 단위로 한 번 더 나열한다 → 포함되는 줄은 뺀다
  const dedup = ls => ls.filter((l, i) => !ls.some((o, j) => j !== i && o.length > l.length && o.includes(l)));
  const dsc = dedup((s.desc || []).map(clean));
  let det = dedup((s.details || []).map(clean));
  if (det.join('\n') === dsc.join('\n')) det = []; // 요약과 세부가 똑같으면 두 번 보여주지 않음
  if (dsc.length) h += `<div class="icard-opts">${dsc.map(l => `<div class="icard-opt">${l}</div>`).join('')}</div>`;
  if (det.length) h += `<div class="ccard-sec">세부 수치</div>` + det.map(l => `<div class="icard-opt">${l}</div>`).join('');
  // 영약 스킬이면 총 영약 효과를 적용한 최종 수치를 보여준다 (오라와 같은 포맷, 색만 다르게).
  // 기준 수치는 실제 레벨로 역산한 값 — 영약 효과 수치는 20레벨 이후로도 계속 성장한다
  if ((s.tags || []).includes('영약')) {
    try {
      const amp = potionAmpPct();
      if (amp.any) {
        const fm = v => Math.round(v * 100) / 100;
        const atLv = lvUp ? parseInt(String(lvUp.text).split('~').pop(), 10) : 20;
        const eff = buffTextAtLevel(s, atLv);
        h += `<div class="ccard-sec sk-potv-t">영약 효과 적용 <span class="psum">${atLv !== 20 ? 'Lv' + atLv + ' 기준 · ' : ''}배율 ×${fm(1 + amp.lo / 100)}${amp.hi !== amp.lo ? '~' + fm(1 + amp.hi / 100) : ''}</span></div>` +
          `<div class="icard-opt sk-pot-v">${escapeHtml(ampPotionText(eff, amp.lo))}</div>`;
      }
    } catch (e) {}
  }
  // 빌드에 장착된 오라면 오라 효과를 적용한 최종 수치를 보여준다 (계산 내역은 🌟 오라 효과 팝업에서)
  if (s.kind === '패시브' && (s.tags || []).includes('오라')) {
    try {
      const a = auraSummary().auras.find(x => x.sk.name === s.name);
      if (a) {
        const fm = v => Math.round(v * 100) / 100;
        h += `<div class="ccard-sec sk-atlv">오라 효과 적용 <span class="psum">배율 ×${fm(a.multLo)}${a.multHi !== a.multLo ? '~' + fm(a.multHi) : ''}</span></div>` +
          `<div class="icard-opt sk-aura-v">${escapeHtml(scaleSigned(auraBuffText(s), a.multHi))}</div>`;
      }
    } catch (e) {}
  }
  // 부귀·숭고: 0~5 육성 레벨 기준 효과 + 로그가 준 티어 옵션 굴림값 (카드 표기는 5레벨 기준)
  if (SUP_LV_KINDS.indexOf(s.kind) >= 0) {
    try {
      let ref = null;
      SKILL_SLOTS.forEach(sl => {
        const v = (preset.skills || {})[sl.id];
        if (!v || ref) return;
        const hit = (v.sup || []).find(x => x && x.name === s.name);
        if (hit) ref = hit;
      });
      if (ref) {
        const g2 = supRichLines(ref, s);
        if (g2 && g2.lines.length) h += `<div class="ccard-sec sk-atlv">Lv.${escapeHtml(g2.lvTxt)} 기준 (레벨 효과 + 티어 옵션 실측)</div>` +
          g2.lines.map(l => `<div class="icard-opt">${escapeHtml(l)}</div>`).join('');
      }
    } catch (e) {}
  }
  // 빌드 장착 레벨이 있으면 그 레벨 기준 수치를 먼저 보여준다 (아래 레벨별 표는 그대로 유지)
  const isBuffSk = (s.tags || []).some(t => BUFF_SKILL_TAGS.includes(t));
  if (lvUp) {
    const lvs = String(lvUp.text).split('~').map(x => parseInt(x, 10));
    // 버프류(영약·자극·저주 등)는 "초과 대미지" 배율이 아니라 효과 자체가 계속 성장 — 역산한 효과 문구로
    if (isBuffSk) {
      const at = buffTextAtLevel(s, lvs[1] || lvs[0]);
      if (at && at !== plainText(String((s.details || s.desc || [])[0] || '')))
        h += `<div class="ccard-sec sk-atlv">Lv.${escapeHtml(lvUp.text)} 기준 효과</div><div class="icard-opt">${escapeHtml(at)}</div>`;
    }
    const over = isBuffSk ? '' : overLv20Html(s, lvs); // 20레벨 초과 성장이 있는 스킬은 그 배율만 보여준다
    const vLo = (over || isBuffSk) ? null : skillLvValues(s.name, lvs[0]), vHi = (!over && !isBuffSk && lvs[1]) ? skillLvValues(s.name, lvs[1]) : null;
    if (over) h += `<div class="ccard-sec sk-atlv">Lv.${escapeHtml(lvUp.text)} 기준</div>` + over;
    if (vLo) {
      h += `<div class="ccard-sec sk-atlv">Lv.${escapeHtml(lvUp.text)} 기준 수치</div>` + vLo.map((c, i) => {
        const v = vHi && String(vHi[i][1]) !== String(c[1]) ? c[1] + '~' + vHi[i][1] : c[1];
        const label = String(c[0]).replace(/\s*[+-]?[\d.]+%?\s*$/, '').trim() || c[0]; // 헤더 끝의 기준 수치(+21%)는 뗀다
        const unit = /%\s*$/.test(String(c[0])) && !/%$/.test(String(v)) ? '%' : '';
        return `<div class="icard-opt">${escapeHtml(label)} <b class="sk-atlv-v">${escapeHtml(String(v) + unit)}</b></div>`;
      }).join('');
    }
  }
  if (lvUp && !isBuffSk && !skillLvValues(s.name, 20)) { // 레벨표가 아예 없는 스킬도 성장분은 보여준다 (버프류는 위에서 역산 문구로)
    const lvs2 = String(lvUp.text).split('~').map(x => parseInt(x, 10));
    const extra = overLv20Html(s, lvs2);
    if (extra) h += `<div class="ccard-sec sk-atlv">Lv.${escapeHtml(lvUp.text)} 기준</div>` + extra;
  }
  h += skillLvHtml(s.name);
  return h + '</div>';
}

// 액티브 스킬의 20레벨 초과 성장 — 21~30레벨은 레벨당 +10%, 31레벨부터는 +8% (모두 곱연산)
function skillOverLv20(level) {
  const n = Math.max(0, level - 20);
  if (!n) return null;
  const a = Math.min(n, 10), b = Math.max(0, n - 10);
  const mul = Math.pow(1.10, a) * Math.pow(1.08, b);
  return {mul, pct: (mul - 1) * 100, a, b};
}
// 레벨별 표에서 특정 레벨의 수치를 계산 (표에 없는 레벨은 앞뒤 값으로 선형 보간, 표 범위 밖은 끝값)
function skillLvValues(name, level) {
  const d = SKILL_LV[name];
  if (!d || !d.rows || !d.cols || !d.rows.length) return null;
  const rows = d.rows.map(r => [parseFloat(r[0]), r.slice(1)]).filter(r => isFinite(r[0])).sort((a, b) => a[0] - b[0]);
  if (!rows.length) return null;
  const pick = ci => {
    if (level <= rows[0][0]) return rows[0][1][ci];
    if (level >= rows[rows.length - 1][0]) return rows[rows.length - 1][1][ci];
    let i = 0;
    while (i < rows.length - 1 && rows[i + 1][0] < level) i++;
    const [l0, v0] = rows[i], [l1, v1] = rows[i + 1];
    const n0 = parseFloat(String(v0[ci])), n1 = parseFloat(String(v1[ci]));
    if (!isFinite(n0) || !isFinite(n1) || l1 === l0) return v0[ci];
    const v = n0 + (n1 - n0) * (level - l0) / (l1 - l0);
    const suffix = String(v0[ci]).replace(/^[-\d.]+/, ''); // % 같은 꼬리표 유지
    return (Math.round(v * 10) / 10) + suffix;
  };
  return d.cols.map((c, ci) => [c, pick(ci)]);
}
// 레벨표가 20까지만 있는 액티브 스킬은 그 이후 성장분을 별도로 안내한다
function overLv20Html(s, lvs) {
  if (s.kind !== '액티브') return '';
  const d = SKILL_LV[s.name];
  const maxLv = d && d.rows ? Math.max(...d.rows.map(r => parseFloat(r[0])).filter(isFinite)) : 20;
  if (maxLv > 20) return ''; // 표가 그 레벨까지 실제 수치를 주면 그걸 쓰면 된다
  const lo = skillOverLv20(lvs[0]), hi = lvs[1] ? skillOverLv20(lvs[1]) : null;
  if (!lo) return '';
  const f = o => '×' + (Math.round(o.mul * 100) / 100);
  const val = hi && hi.mul !== lo.mul ? f(lo) + '~' + f(hi) : f(lo);
  return `<div class="icard-opt">20레벨 초과 대미지 <b class="sk-atlv-v">${escapeHtml(val)}</b>` +
    `<span class="psum" title="21~30레벨은 레벨당 +10%, 31레벨부터 +8% (곱연산)"> · 21~30렙 +10%/렙, 31렙~ +8%/렙</span></div>`;
}

// ── 스킬 선택 팝업: 메인 선택 → (빈 슬롯이면) 곧바로 보조 채우기 연계, 모두 팝업 안에서 진행 ──
function startSkillPick(slotId, socket) {
  if (guardShareView()) return;
  if (build) { alert('다른 편집이 진행 중입니다. 완료 또는 취소 후 진행해주세요.'); return; }
  const sk = preset.skills[slotId];
  if (socket !== null && (!sk || !sk.main)) { alert('먼저 메인 스킬을 선택해주세요.'); return; }
  // 빈 슬롯에서 시작하면 메인 선택 후 곧바로 보조 채우기로 연계
  build = {skillPick: {slot: slotId, socket, chain: socket === null && !(sk && sk.main)}};
  document.getElementById('bloodPoolFilter').value = '';
  renderSkillWiz();
  document.getElementById('bloodPoolModal').style.display = 'flex'; modalHistPush();
}
function skillPickPool() { // 현재 칸에 맞는 스킬 목록 — 부귀/숭고는 메인과 짝 맞는 것만 + 최상단 정렬
  prepSkills();
  const pk = build.skillPick;
  const grp0 = SKILL_SLOTS.find(s => s.id === pk.slot).group;
  const allows = pk.socket === null ? (s => mainAllows(s, grp0)) : (s => socketKinds(pk.socket).includes(s.kind));
  const sk = preset.skills[pk.slot];
  let specialKind = null, mainName = null;
  if (pk.socket === 2 || pk.socket === 4) {
    specialKind = pk.socket === 2 ? '부귀 보조' : '숭고 보조';
    mainName = sk && sk.main ? sk.main.name : null;
  }
  const onSet = new Set(); // 이미 장착된 스킬 (초록 표시 + 재클릭 해제)
  if (sk) {
    if (pk.socket === null) { if (sk.main) onSet.add(sk.main.name + '\u001f' + sk.main.kind); }
    else sk.sup.forEach(sp => { if (sp) onSet.add(sp.name + '\u001f' + sp.kind); });
  }
  // 보조칸: 같은 그룹의 다른 슬롯에 장착된 보조를 상단에 — 단, 메인 성격이 같은 슬롯만
  // (자극·영약 메인끼리는 보조 구성을 공유하고, 일반 딜링 메인과는 쓰는 보조가 달라서 분리)
  const used = new Set();
  if (pk.socket !== null) {
    const grp = SKILL_SLOTS.find(s => s.id === pk.slot).group;
    const isBuff = ref => { // 자극·영약 태그 메인 여부 (패시브는 태그가 없어 항상 false → 패시브끼리는 전부 공유)
      if (!ref) return false;
      const si = findSkill(ref);
      return si >= 0 && (SKILLS[si].tags || []).some(t => t === '자극' || t === '영약');
    };
    const myBuff = isBuff(sk && sk.main);
    SKILL_SLOTS.filter(s2 => s2.group === grp && s2.id !== pk.slot).forEach(s2 => {
      const o = preset.skills[s2.id];
      if (!o || !o.main || isBuff(o.main) !== myBuff) return;
      o.sup.forEach(sp => { if (sp) used.add(sp.name + '\u001f' + sp.kind); });
    });
  }
  let list = [];
  SKILLS.forEach((s, i) => {
    if (!allows(s)) return;
    if (specialKind && s.kind === specialKind && (!mainName || s.name.split(':')[0].trim() !== mainName)) return;
    // 보조 대상 제한 (supFits) — 이미 끼운 건 뺄 수 있게 남긴다
    if (pk.socket !== null && !onSet.has(s.name + '\u001f' + s.kind) && !supFits(s, sk && sk.main)) return;
    list.push(i);
  });
  // 정렬 우선순위: 짝 맞는 부귀/숭고 > 다른 칸 사용 중 > 나머지 (안정 정렬이라 원래 순서 유지)
  const rank = i => {
    const s = SKILLS[i];
    if (specialKind && s.kind === specialKind) return 0;
    if (used.has(s.name + '\u001f' + s.kind)) return 1;
    return 2;
  };
  list.sort((a, b) => rank(a) - rank(b));
  return {list, onSet, used};
}
function renderSkillWiz() {
  if (!build || !build.skillPick) return;
  document.getElementById('bloodPoolFilter').placeholder = '스킬 검색... (행 클릭=장착, 초록 행 재클릭=해제)';
  const pk = build.skillPick;
  const slot = SKILL_SLOTS.find(s => s.id === pk.slot);
  const sk = preset.skills[pk.slot];
  let title;
  if (pk.socket === null) {
    title = `🔮 ${slot.label} — 메인 스킬 선택 <span style="color:#8b949e;font-weight:normal;font-size:12px">(${slot.group === 'a' ? '액티브' + (isIrisPreset() ? ' · 마령 패시브 포함' : '') + (hasPolymathSlot() ? ' · 주입 패시브 포함' : '') : '패시브'})</span>` +
      `<div class="wiz-sub">행을 클릭하면 장착됩니다 · 스킬명에 호버하면 카드가 표시됩니다</div>`;
  } else {
    const filled = sk.sup.filter(Boolean).length;
    const cur = `${pk.socket + 1}번${pk.socket === 0 ? ' (촉발체·일반)' : pk.socket === 2 ? ' (부귀·일반)' : pk.socket === 4 ? ' (숭고·일반)' : ''}`;
    const chips = sk.sup.map((sp, i) => sp
      ? `<span class="bb-chip"><span class="cat">${i + 1}번</span><span class="txt" title="${escapeHtml(sp.name)}">${escapeHtml(sp.name)}</span><span class="x" data-bsup="${i}" title="제거">×</span></span>`
      : '').join('');
    title = `🔮 ${slot.label} <span style="color:#9ecbff">${sk.main ? escapeHtml(sk.main.name) : ''}</span> — 보조 채우기` +
      `<div class="wiz-sub">현재 칸: <b style="color:#c9a6ff">${cur}</b> · 채움 ${filled}/5 — 행 클릭으로 추가, 초록 행 재클릭 시 해제·재선택</div>` +
      (chips ? `<div class="bb-chips" style="margin-top:6px">${chips}</div>` : '');
  }
  document.getElementById('bloodPoolTitle').innerHTML = title;
  const q = document.getElementById('bloodPoolFilter').value.trim();
  const tokens = parseTokens(q);
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const {list, onSet, used} = skillPickPool();
  let h = '';
  list.forEach(i => {
    const s = SKILLS[i];
    if (tokens.length && !tokens.every(g => {
      const hit = g.kws.some(kw => s._txt.includes(kw));
      return g.neg ? !hit : hit;
    })) return;
    const on = onSet.has(s.name + '\u001f' + s.kind);
    h += `<div class="blend-row wiz-sk${on ? ' on' : ''}" data-skw="${i}">` +
      `<img class="wiz-sk-ico" src="${s.icon || SK_FALLBACK}" loading="lazy" onerror="this.onerror=null;this.src=SK_FALLBACK">` +
      `<span class="slink" data-sidx="${i}">${highlight(s.name, kws)}</span>` +
      (!on && used.has(s.name + '\u001f' + s.kind) ? '<span class="wiz-used">다른 칸 사용 중</span>' : '') +
      `<span class="wiz-sk-tags">${(s.tags || []).map(escapeHtml).join(' · ')}</span>` +
      `<span class="b-sub">${escapeHtml(s.kind)}</span>${on ? '<span class="sk-added">✓</span>' : ''}</div>`;
  });
  document.getElementById('bloodPoolList').innerHTML = h || '<div class="no-result">검색 결과가 없습니다.</div>';
  document.getElementById('bloodWizBtns').innerHTML = pk.socket === null
    ? `<button class="bb-btn danger" onclick="endBuild(false)">취소</button>`
    : `<button class="bb-btn" onclick="endBuild(false)">완료</button>`;
}

function pickSkill(idx) {
  const s = SKILLS[idx];
  const pk = build && build.skillPick;
  if (!pk || !s) return;
  const sk = preset.skills[pk.slot] || (preset.skills[pk.slot] = {main: null, sup: [null, null, null, null, null]});
  const retarget = (i, clear) => {
    pk.socket = i;
    // 보조칸 사이 이동은 검색어 유지 (여러 개 연속으로 고를 때 재입력 불편) — 메인→보조 전환만 초기화
    if (clear) document.getElementById('bloodPoolFilter').value = '';
    renderSkillWiz();
  };
  if (pk.socket === null) {
    // 이미 이 슬롯의 메인이면 재클릭 = 해제 (보조 구성은 유지)
    if (sk.main && sk.main.name === s.name && sk.main.kind === s.kind) {
      sk.main = null;
      persistPreset();
      renderSkillWiz();
      return;
    }
    sk.main = {name: s.name, kind: s.kind}; // 같은 스킬을 여러 슬롯에 장착하는 것은 게임상 제한 없음
    persistPreset();
    if (pk.chain) {
      // 빈칸에서 시작한 경우: 이어서 보조 채우기로 전환 (팝업 안에서 계속)
      const next = sk.sup.findIndex(x => !x);
      if (next !== -1) { retarget(next, true); return; }
    }
    endBuild(false); // 교체 등은 선택 즉시 빌드 탭 복귀
    return;
  }
  // 보조칸: 이미 장착된 스킬 재클릭 = 해제 후 그 칸을 다시 타겟
  const at = sk.sup.findIndex(x => x && x.name === s.name && x.kind === s.kind);
  if (at >= 0) {
    sk.sup[at] = null;
    persistPreset();
    retarget(at);
    return;
  }
  if (!socketKinds(pk.socket).includes(s.kind)) return; // 현재 칸에 못 들어가는 분류 (해제 표시용 행)
  sk.sup[pk.socket] = {name: s.name, kind: s.kind};
  persistPreset();
  // 연속 채우기: 다음 빈 보조칸으로 이동, 전부 차면 종료
  const next = sk.sup.findIndex(x => !x);
  if (next === -1) { endBuild(false); return; }
  retarget(next);
}

function clearSkillSlot(slotId) {
  if (guardShareView()) return;
  preset.skills[slotId] = null;
  persistPreset();
  renderPreset();
}


// 스킬 슬롯 내용 이동 (같은 그룹끼리만: 액티브↔액티브, 패시브↔패시브)
function skillGroupIds(group) { return SKILL_SLOTS.filter(s => s.group === group).map(s => s.id); }
function moveSkillContent(fromId, toId) {
  if (guardShareView()) return;
  const g = SKILL_SLOTS.find(s => s.id === fromId).group;
  if (SKILL_SLOTS.find(s => s.id === toId).group !== g) return;
  const ids = skillGroupIds(g);
  const contents = ids.map(id => preset.skills[id] || null);
  const fi = ids.indexOf(fromId), ti = ids.indexOf(toId);
  const [m] = contents.splice(fi, 1);
  contents.splice(ti, 0, m);
  ids.forEach((id, i) => { preset.skills[id] = contents[i]; });
  persistPreset();
  renderPreset();
}
function moveSkillSlot(slotId, delta) {
  const ids = skillGroupIds(SKILL_SLOTS.find(s => s.id === slotId).group);
  const j = ids.indexOf(slotId) + delta;
  if (j < 0 || j >= ids.length) return;
  moveSkillContent(slotId, ids[j]);
}

// ── 장비가 부여하는 오라 스킬 ──
// 부여 스킬의 최종 레벨 — 장비에 적힌 기본 레벨 + 그 스킬에 적용되는 레벨 보너스
function grantedSkillLevel(name, kind, baseLo, baseHi) {
  try {
    const lv = skillLevelOf({name, kind}, false, skillLvBonuses());
    return {lo: baseLo + lv.lo, hi: baseHi + lv.hi, add: {lo: lv.lo, hi: lv.hi}, hit: lv.hit};
  } catch (e) { return {lo: baseLo, hi: baseHi, add: {lo: 0, hi: 0}, hit: []}; }
}
function grantedAuras() {
  const out = [];
  Object.entries(preset.slots || {}).forEach(([sid, v]) => {
    if (!v || v.kind !== 'item' || !v.snap) return;
    (v.snap.opts || []).forEach((o, oi) => {
      // "<랜덤 …>" 게임 문구의 홑화살괄호는 태그가 아니다 — plainText가 지우기 전에 벗겨낸다
      const raw = String(typeof o === 'string' ? o : (o && o.effect) || '')
        .replace(/&lt;|&gt;/g, '').replace(/<(랜덤[^>]*)>/g, '$1');
      const t = plainText(raw).replace(/[–—−~]/g, '-');
      let m = /랜덤 ?\(?(\d+)(?:-(\d+))?\)? ?레벨의? ([가-힣 ]+?) 아우라 보유/.exec(t);
      if (m && RAND_AURA_POOLS[m[3].trim()]) {
        let baseLo = +m[1], baseHi = +(m[2] || m[1]);
        let pick = v.gaura || null;
        // 로그가 이 자리를 복원한 문구("20 레벨 정밀 주술 증폭을 보유한다")가 있으면 실제 오라·레벨을 안다
        // (gaura 없이 저장된 옛 빌드·공유 코드도 여기서 자동 선택된다)
        const rd = v.rand && v.rand[oi] &&
          /\(?(\d+)(?:-(\d+))?\)? ?레벨의? ([가-힣 ]+?)[을를]? 보유/.exec(plainText(String(v.rand[oi])));
        if (rd) {
          baseLo = +rd[1]; baseHi = +(rd[2] || rd[1]);
          if (!pick && RAND_AURA_POOLS[m[3].trim()].includes(rd[3].trim())) pick = rd[3].trim();
        }
        // 고른 오라가 있으면 그 스킬에 적용되는 레벨 보너스를 더한다 (태그·종류가 맞는 것만)
        const lv = pick ? grantedSkillLevel(pick, '패시브', baseLo, baseHi) : null;
        out.push({sid, item: v.name, lvLo: lv ? lv.lo : baseLo, lvHi: lv ? lv.hi : baseHi,
                  baseLo, baseHi, lvAdd: lv ? lv.add : null, lvHit: lv ? lv.hit : [],
                  pool: RAND_AURA_POOLS[m[3].trim()], pick, rand: 1});
        return;
      }
      fixedGrant(t, v.name, sid);
    });
  });
  // 운명·재능·석판 행의 "20레벨 정밀 재생 버프 획득" / "…을 보유한다"류 — 행을 지우면 함께 사라진다
  (preset.talents || []).forEach((t, ti) => {
    const e = plainText(t.effect || '').replace(/[–—−~]/g, '-');
    // 이중 천명(같은 천명 2개 조건)은 보유 수(cnt)로 자동 판정
    if (/2개 있/.test(e) && (t.cnt || 1) < 2) return;
    const label = (/^\[([^\]]+)\]/.exec(e) || [])[1] || t.type;
    fixedGrant(e, label, 'tal' + ti);
  });
  function fixedGrant(t, item, sid) {
    t = t.replace(/^\[[^\]]*\] ?/, ''); // 앞의 [천명: …] 라벨은 조건이 아니다
    const m = /\(?(\d+)(?:-(\d+))?\)? ?레벨의? ([가-힣 ]+?)(?:[을를]? 보유한다| 버프를? 획득)/.exec(t);
    if (!m) return;
    const name = m[3].trim();
    const i = findSkill({name, kind: '패시브'});
    if (i < 0) return; // 부여형은 패시브 스킬(오라·주입 등)만
    const cond = t.slice(0, m.index).replace(/.*[:.]/, '').replace(/[,.]$/, '').trim();
    // 부여된 스킬도 스킬 레벨 옵션의 영향을 받는다 (범위가 맞는 것만)
    const baseLo = +m[1], baseHi = +(m[2] || m[1]);
    const lv = grantedSkillLevel(name, '패시브', baseLo, baseHi);
    out.push({sid, item, lvLo: lv.lo, lvHi: lv.hi, baseLo, baseHi, lvAdd: lv.add, lvHit: lv.hit,
              name, cond: cond || null});
  }
  return out;
}
function openGauraPick(sid) {
  const g = grantedAuras().find(x => x.sid === sid && x.rand);
  if (!g) return;
  document.getElementById('gauraTitle').textContent = (g.item || '장비') + ' — 부여 오라 선택 (Lv.' + (g.lvLo === g.lvHi ? g.lvLo : g.lvLo + '~' + g.lvHi) + ')';
  document.getElementById('gauraList').innerHTML = g.pool.map(nm => {
    const i = findSkill({name: nm, kind: '패시브'});
    return `<div class="sb-optrow${g.pick === nm ? ' on' : ''}" onclick="pickGaura('${sid}', '${nm}')">` +
      (i >= 0 ? `<span class="slink" data-sidx="${i}">${escapeHtml(nm)}</span>` : escapeHtml(nm)) +
      `${g.pick === nm ? ' <span class="psum">← 현재 선택</span>' : ''}</div>`;
  }).join('');
  document.getElementById('gauraModal').style.display = 'flex';
  modalHistPush();
}
function pickGaura(sid, name) {
  if (preset.slots[sid]) { preset.slots[sid].gaura = name; persistPreset(); }
  closeGauraPick();
  renderPreset(); // 스킬 표만 그리면 장비 행의 "부여 오라 미선택" 문구가 그대로 남는다
}
function closeGauraPick() { document.getElementById('gauraModal').style.display = 'none'; }
// 스킬 빌드 표에 붙는 부여 오라 고정 행 — 보조·이동·삭제 불가 (장비 해제 시 함께 제거)
function gauraRowsHtml() {
  return grantedAuras().map(g => {
    const nm = g.rand ? g.pick : g.name;
    const lv = g.lvLo === g.lvHi ? g.lvLo : g.lvLo + '~' + g.lvHi;
    const i = nm ? findSkill({name: nm, kind: '패시브'}) : -1;
    const mainHtml = nm
      ? `<span class="slink"${i >= 0 ? ` data-sidx="${i}"` : ''}>${escapeHtml(nm)}</span> <span class="sg-lv">Lv.${lv}</span>${g.cond ? ` <span class="psum" title="조건부 — 게임 내 상황에 따라 적용">⚠ ${escapeHtml(g.cond)}</span>` : ''}`
      : `<span class="pempty pempty-pick" onclick="openGauraPick('${g.sid}')" title="어느 오라인지는 로그에 없어 직접 선택해야 합니다 — 장비 빌드의 [오라] 버튼으로도 열 수 있어요">부여 오라 선택</span>`;
    const btns = g.rand ? `<button class="btn-sel" onclick="openGauraPick('${g.sid}')">${nm ? '교체' : '선택'}</button>` : '';
    return `<tr class="gaura-row"><td class="pslot-label" title="장비 옵션이 부여하는 오라 — 장비를 빼면 함께 사라집니다">🌟 장비</td>` +
      `<td>${mainHtml}</td><td><span class="sup-empty">보조 불가 · ${escapeHtml(g.item || '장비')} 해제 시 제거</span></td><td class="pbtns">${btns}</td></tr>`;
  }).join('') + grantedCurses().map(cu => {
    // 장비가 발동하는 저주 — 스킬 레벨 옵션까지 더한 실제 레벨로 표시
    const lv = cu.lvLo === cu.lvHi ? cu.lvHi : cu.lvLo + '~' + cu.lvHi;
    return `<tr class="gaura-row"><td class="pslot-label" title="장비 옵션이 발동하는 저주 — 장비를 빼면 함께 사라집니다">🌙 장비</td>` +
      `<td><span class="slink" data-sidx="${cu.si}">${escapeHtml(cu.name)}</span> <span class="sg-lv">Lv.${lv}</span> <span class="psum">(부여 ${cu.baseLv} + 스킬 레벨 옵션)</span></td>` +
      `<td><span class="sup-empty">발동형 저주 · ${escapeHtml(cu.lines.join(' · '))}</span></td><td class="pbtns"></td></tr>`;
  }).join('');
}

function renderPresetSkills() {
  const prevSk = compareOn ? prevPreset() : null;
  const gsAll = grantedSupports();
  document.getElementById('presetSkTbody').innerHTML = SKILL_SLOTS.map(sl => {
    const sk = preset.skills[sl.id];
    const diff = prevSk ? diffBadge(skillSig(sk), skillSig(prevSk.skills[sl.id]), skillDesc(prevSk.skills[sl.id])) : '';
    let mainHtml, supHtml, btns = '';
    if (sk && (sk.main || sk.sup.some(Boolean))) {
      // 메인 없이 보조만 있는 슬롯(로그 가져오기에서 메인이 미지원 스킬인 경우)도 보조 구성은 보여준다
      const missing = sk.main && findSkill(sk.main) < 0;
      mainHtml = sk.main
        ? `<span class="slink" data-pskill="${sl.id}">${escapeHtml(sk.main.name)}</span>${missing ? ' <span class="missing-tag">현재 데이터에 없음</span>' : ''}`
        : `<span class="pempty pempty-pick" onclick="startSkillPick('${sl.id}', null)" title="메인 스킬이 데이터에 없어 비워졌습니다 — 클릭해서 직접 선택">비어 있음 · 스킬 선택</span>`;
      supHtml = sk.sup.map((sp, i) => {
        const extra = i === 0 ? ' (촉발체·일반)' : i === 2 ? ' (부귀·일반)' : i === 4 ? ' (숭고·일반)' : '';
        if (sp) {
          const pchips = (sp.proto || []).map(pr =>
            ` <span class="sup-chip sup-proto tip2" title="${escapeHtml(pr.name + '\n' + pr.effect)}"><span class="sn">🧩</span>${escapeHtml(pr.name)}</span>`).join('');
          return `<span class="sup-chip"><span class="sn">${i + 1}</span><span class="slink" data-psup="${sl.id}:${i}">${escapeHtml(sp.name)}</span><span class="x" data-supx="${sl.id}:${i}" title="제거">×</span></span>` + pchips;
        }
        return `<button class="btn-sel" onclick="startSkillPick('${sl.id}', ${i})" title="${i + 1}번 보조칸에 추가${extra}">+${i + 1}</button>`;
      }).join(' ');
      // 모듈 프로토콜 — 이름 칩, 효과는 툴팁
      ((sk.main && sk.main.proto) || []).forEach(pr => {
        supHtml += ` <span class="sup-chip sup-proto tip2" title="${escapeHtml(pr.name + '\n' + pr.effect)}"><span class="sn">🧩</span>${escapeHtml(pr.name)}</span>`;
      });
      // 옵션이 부여하는 보조 스킬 (보조칸을 쓰지 않음 — 다른 색 칩으로 구분)
      grantedFor(sl, sk, gsAll).forEach(g => {
        const lv = g.lo === g.hi ? g.lo : g.lo + '~' + g.hi;
        supHtml += ` <span class="sup-chip sup-grant tip2" title="${escapeHtml('[' + g.src + '] ' + g.e)}">` +
          `<span class="sn">◈</span>${escapeHtml(g.name)} <span class="sg-lv">Lv.${lv}</span>` +
          `<span class="sg-src">${escapeHtml(g.src)}</span></span>`;
      });
      const en = slotEnergy(sl);
      supHtml += ` <span class="sk-energy" title="보조칸 확장 에너지 (1번부터 ${sl.group === 'a' ? '액티브' : '패시브'} 비용 누적)">⚡${en}</span>`;
      btns = sk.main
        ? `<button class="btn-sel" onclick="startSkillPick('${sl.id}', null)">교체</button><button class="btn-sel" onclick="clearSkillSlot('${sl.id}')">비우기</button>`
        : `<button class="btn-sel" onclick="clearSkillSlot('${sl.id}')">비우기</button>`;
    } else {
      mainHtml = `<span class="pempty pempty-pick" onclick="startSkillPick('${sl.id}', null)" title="클릭하면 ${sl.group === 'a' ? '액티브' : '패시브'} 스킬 선택 팝업이 열립니다">비어 있음 · 스킬 선택</span>`;
      supHtml = '<span class="sup-empty">메인 스킬을 먼저 선택하세요</span>';
    }
    const moveBtns = `<button class="btn-sel mv-btn" onclick="moveSkillSlot('${sl.id}', -1)" title="위로 (같은 그룹 내)">▲</button><button class="btn-sel mv-btn" onclick="moveSkillSlot('${sl.id}', 1)" title="아래로 (같은 그룹 내)">▼</button>`;
    return `<tr draggable="true" data-skslot="${sl.id}"><td class="pslot-label"><span class="drag-handle" title="드래그로 순서 변경 (액티브↔액티브, 패시브↔패시브)">⠿</span>${sl.label}</td><td>${mainHtml}${diff}</td><td>${supHtml}</td><td class="pbtns">${moveBtns}${btns}</td></tr>`;
  }).join('') + gauraRowsHtml();
  const filled = skillFilledCount(preset);
  document.getElementById('presetSkCount').textContent = `${filled}/9`;
  const totalEnergy = SKILL_SLOTS.reduce((sum, sl) => sum + slotEnergy(sl), 0);
  // 보조칸 확장 에너지: 최대치(SK_ENERGY_MAX)를 넘으면 빨간 경고
  const el = document.getElementById('presetSkEnergy');
  el.textContent = `⚡ 에너지 ${totalEnergy} / ${SK_ENERGY_MAX}`;
  el.classList.toggle('over', totalEnergy > SK_ENERGY_MAX);
  el.title = totalEnergy > SK_ENERGY_MAX
    ? `보유 에너지 최대치(${SK_ENERGY_MAX})를 ${totalEnergy - SK_ENERGY_MAX} 초과했습니다`
    : `보조칸 확장에 쓰는 에너지 (최대 ${SK_ENERGY_MAX})`;
  return filled;
}

// 즐겨찾기 탭: 좌측 = 저장한 옵션 표, 우측 = 저장한 아이템 카드 그리드
let favSlice = [];
function renderFav() {
  const ctx = buildFilterCtx();
  const keywords = ctx.tokens.filter(g => !g.neg).flatMap(g => g.kws);

  // 저장한 옵션 (카테고리·등급·검색어 필터 모두 적용)
  favSlice = saved.map(s => KEY_MAP.get(s.k) || { ...s, missing: true }).filter(r => rowMatches(r, ctx));
  document.getElementById('favTbody').innerHTML = favSlice.map((r, i) => rowHtml(r, keywords, `data-fidx="${i}"`)).join('');
  const noOpt = document.getElementById('noFavOpt');
  noOpt.textContent = saved.length ? '조건에 맞는 저장 옵션이 없습니다.' : '저장된 옵션이 없습니다. 목록에서 ☆를 누르면 저장됩니다.';
  noOpt.style.display = favSlice.length ? 'none' : 'block';
  document.getElementById('favOptCount').textContent = favSlice.length;

  // 저장한 아이템 (검색어 필터 적용)
  const list = savedItems.filter(it => {
    if (!ctx.tokens.length) return true;
    const txt = (it.name + ' ' + (it.tags || []).join(' ') + ' ' + (it.attrs || []).join(' ') + ' ' + (it.opts || []).join(' ') + ' ' + (it.flavor || '')).replace(/<[^>]+>/g, '');
    return ctx.tokens.every(g => {
      const hit = g.kws.some(kw => txt.includes(kw));
      return g.neg ? !hit : hit;
    });
  });
  document.getElementById('itemGrid').innerHTML = list.map(it => `<div class="icard-box">${itemCardHtml(it)}<button class="star icard-star on" data-gidx="${savedItems.indexOf(it)}" title="저장 해제">★</button><button class="pequip" data-gequip="${savedItems.indexOf(it)}" title="빌드 슬롯에 장착">빌드 장착</button></div>`).join('');
  const noItem = document.getElementById('noItemResult');
  noItem.textContent = savedItems.length ? '조건에 맞는 아이템이 없습니다.' : '저장된 아이템이 없습니다. 아이템 카드의 ☆를 누르면 저장됩니다.';
  noItem.style.display = list.length ? 'none' : 'block';
  document.getElementById('favItemCount').textContent = list.length;

  document.getElementById("resultCount").innerHTML = `<span>${(favSlice.length + list.length).toLocaleString()}</span>개 결과`;

  // 검색·필터 조건 때문에 저장 항목이 숨겨져 있으면 안내 배너 표시
  const hidden = (saved.length - favSlice.length) + (savedItems.length - list.length);
  const notice = document.getElementById('favNotice');
  if (hidden > 0) {
    notice.style.display = 'flex';
    notice.innerHTML = `현재 검색·필터 조건 때문에 저장 항목 <b>${hidden}개</b>가 숨겨져 있습니다. <button class="btn-sel" onclick="clearSearch()">검색어 지우기</button>`;
  } else {
    notice.style.display = 'none';
  }
}

function clearSearch() {
  document.getElementById('search').value = '';
  doFilter();
}

function toggleAdvanced() {
  // 장비 탭은 장비 상세검색, 스킬 탭은 스킬 분류·태그 패널을 토글
  const panel = currentTab === 'skill' ? document.getElementById('skillAdvPanel') : document.getElementById('advancedPanel');
  const btn = document.getElementById('btnAdvanced');
  const opening = panel.style.display === 'none';
  panel.style.display = opening ? 'flex' : 'none';
  btn.textContent = opening ? '상세 검색 ▲' : '상세 검색 ▼';
  btn.classList.toggle('open', opening);
}

function toggleCategory(cat, checked) {
  document.querySelectorAll(`.sub-cb.cat-${cat}`).forEach(cb => { cb.checked = checked; });
  subCbChanged(cat);
}

function subCbChanged(cat) {
  const top = document.getElementById(`cb-${cat}`);
  if (top) { // 장비는 상단에 마스터 체크박스가 없음 (기본/레전드 등급 체크박스로 대체)
    const all = document.querySelectorAll(`.sub-cb.cat-${cat}`);
    const cnt = document.querySelectorAll(`.sub-cb.cat-${cat}:checked`).length;
    top.indeterminate = cnt > 0 && cnt < all.length;
    top.checked = cnt === all.length;
  }
  doFilter();
}

function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function highlight(text, keywords) {
  if (!keywords.length) return escapeHtml(text);
  let out = escapeHtml(text);
  keywords.forEach(kw => {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "gi"), m => `<mark>${m}</mark>`);
  });
  return out;
}

// 옵션 효과 텍스트: 툴팁 용어 구간을 span.tip으로 감싸면서 검색어 하이라이트 적용
function renderEffect(r, keywords) {
  const tips = r.tips || [];
  if (!tips.length) return highlight(r.effect, keywords);
  const marks = [];
  tips.forEach(([term, idx]) => {
    let p = 0;
    while ((p = r.effect.indexOf(term, p)) !== -1) {
      marks.push({ s: p, e: p + term.length, idx });
      p += term.length;
    }
  });
  marks.sort((a, b) => a.s - b.s);
  let html = "", pos = 0;
  marks.forEach(m => {
    if (m.s < pos) return; // 겹치는 구간은 무시
    html += highlight(r.effect.slice(pos, m.s), keywords);
    html += `<span class="tip" data-tip="${m.idx}">${highlight(r.effect.slice(m.s, m.e), keywords)}</span>`;
    pos = m.e;
  });
  html += highlight(r.effect.slice(pos), keywords);
  return html;
}

// renderEffect의 자체 완결형 tips([용어, 설명]) 버전: tip2 툴팁 + 검색 하이라이트 (통합 검색의 조향·프리즘·부활 등)
function renderEffect2(effect, tips, keywords) {
  if (!tips || !tips.length) return highlight(effect, keywords);
  const marks = [];
  tips.forEach(([term, desc]) => {
    let p = 0;
    while ((p = effect.indexOf(term, p)) !== -1) {
      marks.push({ s: p, e: p + term.length, desc });
      p += term.length;
    }
  });
  marks.sort((a, b) => a.s - b.s);
  let html = "", pos = 0;
  marks.forEach(m => {
    if (m.s < pos) return;
    html += highlight(effect.slice(pos, m.s), keywords);
    html += `<span class="tip2" title="${escapeHtml(m.desc)}">${highlight(effect.slice(m.s, m.e), keywords)}</span>`;
    pos = m.e;
  });
  html += highlight(effect.slice(pos), keywords);
  return html;
}

// 결과 행 하나의 HTML (전체 목록·즐겨찾기 목록 공용, starAttr로 별 버튼의 참조 위치 구분)
function rowHtml(r, keywords, starAttr) {
  const typeHtml = r.item !== undefined
    ? `<span class="ilink" data-item="${r.item}">${highlight(r.type, keywords)}</span>`
    : highlight(r.type, keywords);
  const starOn = savedSet.has(rowKey(r));
  const missing = r.missing ? ' <span class="missing-tag">현재 데이터에 없음</span>' : '';
  // 빌드 편집 모드: 행 클릭으로 추가, 추가된 행(초록)은 재클릭으로 해제
  let mark = '', rowAttr = '';
  if (build && !build.skillPick) {
    let eligible = false, added = false;
    const k = rowKey(r);
    if (build.talent) {
      // 재능 + [명칭]이 있는 석판(신격의 석판)·운명(숙명) 모두 저장 대상
      eligible = r.category === '재능' || ((r.category === '석판' || r.category === '운명') && r.effect.startsWith('['));
      added = eligible && preset.talents.some(t => t.k === k);
    } else if (build.mem) {
      // 추억: 해당 추억 부위 옵션 (아이템 카드가 연결된 행도 포함 — item 여부 무관)
      eligible = r.category === '장비' && r.source === build.mem;
      added = ['basic', 'unique', 'random'].some(c => build.opts[c].some(o => o.k === k));
      if (added) eligible = true;
    } else if (build.blood) {
      // 블러드 제작은 마법사 모달에서 진행 — 목록 상호작용 없음
    } else if (build.itemPick) {
      // 레전드 장비 선택: 아이템 카드가 연결된 옵션 행 클릭 = 해당 아이템 장착
      const slot = SLOT_BY_ID.get(build.itemPick.slot);
      eligible = r.category === '장비' && r.item !== undefined &&
        (r.source ? slot.parts.includes(r.source) : build.itemPick.slot === 'chest');
    } else if (build.opts) {
      eligible = r.category === '장비' && r.item === undefined && isBasicType(r.type) && SLOT_BY_ID.get(build.slot).parts.includes(r.source);
      added = eligible && ['basic', 'main', 'sub'].some(c => build.opts[c].some(o => o.k === k));
    }
    if (eligible || added) {
      rowAttr = ` class="sk-pick${added ? ' sk-on' : ''}" data-rpick ${starAttr}`;
      if (added) mark = '<span class="sk-added" title="행 클릭으로 해제">✓</span>';
    }
  }
  return `<tr${rowAttr}><td>${renderEffect(r, keywords)}${missing}</td><td>${escapeHtml(r.source || '특수 갑옷')}</td><td>${typeHtml}</td><td class="star-td">${mark}<button class="star${starOn ? ' on' : ''}" ${starAttr} title="${starOn ? '저장 해제' : '저장'}">${starOn ? '★' : '☆'}</button></td></tr>`;
}

function parseTokens(raw) {
  if (!raw) return [];
  // 점(.)은 연속 문구 연결자: "공격.속도" → "공격 속도" 라는 붙은 문구로 검색
  return raw.split(/\s+/).filter(Boolean).map(t => {
    // 괄호는 유지한다 — "압살(부귀)" 같은 부귀·숭고 스킬명이나 "(51–72)" 수치 구간도 그대로 검색되게
    const neg = t.startsWith('!');
    if (neg) t = t.slice(1);
    const kws = t.split('|').filter(Boolean)
      .map(k => k.replace(/\./g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return kws.length ? { neg, kws } : null;
  }).filter(Boolean);
}
// 효과만 검색: 체크 시 출처(부위)·유형 이름은 검색 대상에서 제외 (두 검색줄의 체크박스를 동기화)
function effOnlyOn() { return document.getElementById('effOnly').checked; }
function effOnlyChanged(v) {
  document.getElementById('effOnly').checked = v;
  document.getElementById('effOnly2').checked = v;
  saveUiState();
  if (currentTab === 'total') renderTotal(); else doFilter();
}
// 핵심 재능만 (재능·석판 탭, 2026-10-10 사용자) — 검색어 '!하위 !중위 !석판 !명왕' 과 같은 결과를 입력칸을 건드리지 않고 건다
const CORE_ONLY_EXCL = ['하위', '중위', '석판', '명왕'];
function coreOnlyOn() { const el = document.getElementById('coreOnly'); return !!(el && el.checked); }
function coreOnlyChanged(v) { document.getElementById('coreOnly').checked = v; doFilter(); }
// 현재 검색어·체크박스 상태를 하나의 필터 컨텍스트로 수집
function buildFilterCtx() {
  // 일반 검색창 값을 통합 검색창에도 반영 (양방향 동기화)
  const _ts = document.getElementById('totalSearch');
  if (_ts && currentTab !== 'total') _ts.value = document.getElementById('search').value;
  return {
    // 데이터 탭(장비/재능·석판/운명)은 해당 카테고리만 표시, 그 외 탭(즐겨찾기 등)은 전체
    allowed: TAB_CATS[currentTab] || null,
    // hiddenSearch: 편집 모드가 거는 숨은 검색 조건 (입력창에는 안 보임, 사용자 입력과 AND 결합)
    tokens: parseTokens(((typeof hiddenSearch !== 'undefined' && hiddenSearch) ? hiddenSearch + ' ' : '') + document.getElementById("search").value.trim()),
    activeSources: new Set([...document.querySelectorAll('.sub-cb.cat-장비:checked, .sub-cb.cat-석판:checked')].map(el => el.value)),
    activeTalents: new Set([...document.querySelectorAll('.sub-cb.cat-재능:checked')].map(el => el.value)),
    activeDestiny: new Set([...document.querySelectorAll('.sub-cb.cat-운명:checked')].map(el => el.value)),
    gradeBasic: document.getElementById('cb-grade-기본')?.checked ?? true,
    gradeLegend: document.getElementById('cb-grade-레전드')?.checked ?? true,
    effOnly: effOnlyOn() && currentTab !== 'talent', // 재능·석판 탭엔 '옵션 효과만' 대신 '핵심 재능만'
    coreOnly: currentTab === 'talent' && coreOnlyOn(),
  };
}

function rowMatches(r, ctx) {
  if (r.type === '랜덤 풀') return false; // 계산 전용 행 (레전드 "<랜덤 …>" 자리의 풀) — 목록에는 안 보인다
  if (ctx.allowed && !ctx.allowed.includes(r.category)) return false; // 탭별 카테고리 제한
  if (r.source === '재능') {
    if (!ctx.activeTalents.has(r.type)) return false;
  } else if (r.category === '운명') {
    if (!ctx.activeDestiny.has(r.type)) return false;
  } else if (r.category === '장비') {
    // 출처(부위)가 비어 있는 특수 장비(올마이티 오리진)는 갑옷(흉갑)으로 취급
    if (!r.source) {
      if (!PARTS.CHESTS.some(p => ctx.activeSources.has(p))) return false;
    } else if (!ctx.activeSources.has(r.source)) return false;
    const basic = isBasicType(r.type);
    if (!(ctx.gradeBasic && basic) && !(ctx.gradeLegend && !basic)) return false;
  } else {
    if (!ctx.activeSources.has(r.source)) return false;
  }
  if (ctx.coreOnly && CORE_ONLY_EXCL.some(kw => r.effect.includes(kw) || r.source.includes(kw) || r.type.includes(kw))) return false;
  if (ctx.tokens.length && !ctx.tokens.every(group => {
    const hit = group.kws.some(kw => r.effect.includes(kw) || (!ctx.effOnly && (r.source.includes(kw) || r.type.includes(kw))));
    return group.neg ? !hit : hit;
  })) return false;
  return true;
}

// 헤더 클릭 정렬: 정순(▲) → 역순(▼) → 해제(원본 순서) 순환
let sortKey = null, sortDir = 1;
function sortBy(key) {
  if (sortKey === key) {
    if (sortDir === 1) sortDir = -1;
    else { sortKey = null; sortDir = 1; }
  } else {
    sortKey = key;
    sortDir = 1;
  }
  ['effect', 'source', 'type'].forEach(k => {
    const el = document.getElementById('sort-' + k);
    if (el) el.textContent = sortKey === k ? (sortDir === 1 ? '▲' : '▼') : '';
  });
  doFilter();
}

function doFilter() {
  saveUiState();
  syncHashQ(); // 검색어를 주소 해시에 반영 (replaceState — 히스토리 오염 없음)
  if (currentTab === 'fav') { renderFav(); return; }
  if (currentTab === 'preset') { renderPreset(); return; }
  if (currentTab === 'share') return; // 공유 탭은 renderShare가 별도 관리
  if (currentTab === 'skill') { currentPage = 0; renderSkills(); return; }
  const ctx = buildFilterCtx();
  filtered = ALL_DATA.filter(r => rowMatches(r, ctx));
  if (sortKey) filtered.sort((a, b) => String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), 'ko') * sortDir);
  currentPage = 0;
  render();
  if (TAB_CATS[currentTab]) wtMiss(currentTab, (document.getElementById('search').value || '').trim(), filtered.length);
}

// ── 통합 검색: 모든 데이터에서 한 번에 찾고, 클릭하면 해당 탭의 검색으로 이동 ──
const TOTAL_LIMIT = 10; // 그룹당 표시 상한 (더보기 클릭 시 해당 탭으로 이동)
const totalExpanded = new Set(); // 전용 탭 없는 그룹(조향·타워·프리즘·부활)의 펼침 상태
let totalPrevQ = '';             // 검색어가 바뀌면 펼침 초기화
function totalLimit() { return (window.innerWidth || 1024) <= 768 ? 3 : TOTAL_LIMIT; } // 모바일은 3개씩
function totalMatch(tokens, fields) {
  return tokens.every(g => {
    const hit = g.kws.some(kw => fields.some(f => f && f.includes(kw)));
    return g.neg ? !hit : hit;
  });
}
// 용어 툴팁 설명 텍스트도 검색 대상에 포함 — 행별 1회만 계산해 캐시(참조 배열이라 메모리 부담 없음)
// '툴팁 제외'(통합 검색줄, 2026-10-13 제보 — 콤보 검색에 툴팁에 콤보가 든 매직 버스트 옵션이 섞임) 체크 시 빈 배열
function tipOffOn() { const el = document.getElementById('tipOff'); return !!(el && el.checked); }
function tipOffChanged() { saveUiState(); renderTotal(); }
function rowTipTexts(r) { // craft_data 계열: tips = [용어, 전역 인덱스]
  if (tipOffOn()) return [];
  return r._tt || (r._tt = (r.tips || []).map(t => TIPS[t[1]] || ''));
}
function selfTipTexts(o) { // 조향·타워·프리즘·부활: tips = [용어, 설명] 자체 완결형
  if (tipOffOn()) return [];
  return o._tt || (o._tt = (o.tips || []).map(t => t[1]));
}
function syncFromTotal() {
  syncHashQ();
  // 통합 검색 입력을 일반 검색창에도 반영 — 탭을 넘겨도 같은 검색어로 이어짐
  document.getElementById('search').value = document.getElementById('totalSearch').value;
  renderTotal();
}
function resetSearch() {
  document.getElementById('search').value = '';
  document.getElementById('totalSearch').value = '';
  document.getElementById('effOnly').checked = false;
  document.getElementById('effOnly2').checked = false;
  document.getElementById('coreOnly').checked = false;
  if (document.getElementById('tipOff')) document.getElementById('tipOff').checked = false;
  // 카테고리·상세 검색 체크박스도 전부 선택 상태로 복원
  document.getElementById('cb-grade-기본').checked = true;
  document.getElementById('cb-grade-레전드').checked = true;
  ['장비', '석판', '운명', '재능'].forEach(cat => toggleCategory(cat, true));
  document.querySelectorAll('.skill-cb, .skill-attr-cb').forEach(cb => { cb.checked = true; });
  document.querySelectorAll('.skill-tag-cb').forEach(cb => { cb.checked = false; });   // 태그는 AND 라 '아무것도 안 켬' 이 필터 없음
  if (currentTab === 'total') renderTotal();
  doFilter();
}
// 레전드 장비 브라우징 — 아이템→부위(장비 옵션 데이터의 출처) 매핑 후 부위별로 나열, 클릭 시 기존 카드(ilink)
let LEGEND_BASE = null;
function legendBase() {
  if (LEGEND_BASE) return LEGEND_BASE;
  LEGEND_BASE = {};
  ALL_DATA.forEach(r => { if (r.category === '장비' && r.type && r.source && !(r.type in LEGEND_BASE)) LEGEND_BASE[r.type] = r.source; });
  return LEGEND_BASE;
}
function renderLegend() {
  const box = document.getElementById('legendResults');
  if (!box) return;
  const norm = v => String(v || '').toLowerCase();
  const q = norm((document.getElementById('legendSearch').value || '').trim());
  const base = legendBase();
  const list = ITEMS.map((it, i) => ({ it, i })).filter(x =>
    !q || norm(x.it.name).includes(q)
       || (x.it.tags || []).some(t => norm(t).includes(q))
       || norm(base[x.it.name] || '').includes(q));
  const cnt = document.getElementById('legendCount'); if (cnt) cnt.textContent = list.length + '개';
  wtMiss('legend', (document.getElementById('legendSearch').value || '').trim(), list.length);
  box.innerHTML = list.length
    ? `<div class="item-grid">${list.map(x => `<div class="icard-box">${itemCardHtml(x.it, x.i)}</div>`).join('')}</div>`
    : '<div class="lg-empty">검색 결과가 없습니다.</div>';
}

// ── DB 정령 탭 (2026-10-10) — 전투 정령 카드: 외환(고유)·승급 보상 1~6·내환·중환 노드·운명 슬롯 ──
// 상세(노드)가 있는 정령만 — 지금은 레전드, 수집기가 매직·레어까지 받으면(시즌 갱신) 전부 보인다
let pactKind = '', pactGroup = 'battle'; // 대분류: battle=전투 정령 · drop=드롭 정령 (사용자 2026-10-10)
const pactIsDrop = sp => sp.kind === '드롭';
// 등급 거르기 — 여러 개 켤 수 있고 기본은 레전드만 (사용자 2026-10-10). 이름도 등급색
const PACT_GRADES = ['레전드', '레어', '매직'];
const pactGradeOn = new Set(['레전드']);
const pactGradeCls = g => ({'레전드': 'pg-leg', '레어': 'pg-rare', '매직': 'pg-mag'}[g] || '');
function pactGradeToggle(g) { if (pactGradeOn.has(g)) { if (pactGradeOn.size > 1) pactGradeOn.delete(g); } else pactGradeOn.add(g); renderPactDb(); }
const pactTag = sp => sp.kind;
const pactDbList = () => PACT.filter(sp => (sp.nodes || []).length);
function pactTipsOf(text) { // 정령 용어 툴팁 [[용어, 설명]] — 문구에 나오는 것만, 긴 용어부터
  return Object.keys(PACT_TIPS || {}).filter(t => t && text.indexOf(t) >= 0).sort((a, b) => b.length - a.length).map(t => [t, PACT_TIPS[t]]);
}
const pactEff = (t, kws) => renderEffect2(t, pactTipsOf(t), kws);
function pactSearchText(sp) {
  return [sp.name, sp.kind, sp.grade, sp.summary || '', ...(sp.nodes || []).map(n => n.effect || ''), ...(sp.advance || []).flatMap(a => a.effects || [])].join(' ');
}
function pactCardHtml(sp, kws) {
  const nodes = (sp.nodes || []).slice().sort((a, b) => a.pos - b.pos);
  const ring = r => { // 같은 효과는 ×개수로 묶는다
    // 효과가 빈 노드(드롭 정령의 '공백 재능 포인트(중위)' 등)는 노드 이름을 흐리게
    const m = new Map(); nodes.filter(n => n.ring === r).forEach(n => { const k = n.effect || ('\u0000' + (n.name || '빈 노드')); m.set(k, (m.get(k) || 0) + 1); });
    return [...m].map(([e, c]) => `<div class="icard-opt">${e[0] === '\u0000' ? `<span class="pc-empty">${escapeHtml(e.slice(1))}</span>` : pactEff(e, kws)}${c > 1 ? ` <b class="pc-x">×${c}</b>` : ''}</div>`).join('');
  };
  const outer = nodes.find(n => !n.ring);
  const adv = sp.advance || [];
  // 외환(고유) 이름·효과 — SS14 형식 수집은 name(짧은 이름)·effect 가 나뉘어 온다. 옛 형식(SS13)은 문구가 깨져 있어
  // 승급 보상 1단계(= 외환 기본 효과)로 효과를 쓰고, 이름은 깨진 문구에서 그 효과 앞부분을 떼어 낸다
  let oName = '', oEff = outer ? outer.effect : '';
  if (outer) {
    const a1 = ((adv[0] || {}).effects || [])[0] || '';
    if (outer.name && outer.name.length <= 14 && !/\d/.test(outer.name)) { oName = outer.name; if (a1 && (/[\u4e00-\u9fff#]/.test(oEff) || !oEff)) oEff = a1; } // 단죄의 쌍둥이: tlidb 외환 문구가 '#！S16…' 자리표시
    else if (a1) { const k = outer.effect.indexOf(a1.slice(0, 6)); const nm = k > 0 && k <= 14 ? outer.effect.slice(0, k).trim() : ''; oName = /^[^\d,.%+·]+$/.test(nm) ? nm : ''; oEff = a1; }
  }
  const nDst = nodes.filter(n => n.ring === '운명').length, nUnd = nodes.filter(n => n.ring === '미정').length;
  return `<div class="icard pcard"><div class="pc-top"><img src="${escapeHtml(sp.img || '')}" loading="lazy" onerror="this.style.visibility='hidden'"><div>` +
    `<div class="icard-name ${pactGradeCls(sp.grade)}">${highlight(sp.name, kws)}</div><div class="icard-tags"><span>${escapeHtml(sp.kind)}</span><span>${escapeHtml(sp.grade)}</span>${sp.cost ? `<span>비용 ${sp.cost}</span>` : ''}</div>` +
    (sp.summary ? `<div class="pc-sum">${highlight(sp.summary, kws)}</div>` : '') + `</div></div>` +
    (outer ? `<div class="pc-h">외환 (고유)${oName ? ` · <span class="pc-on">${highlight(oName, kws)}</span>` : ''}</div><div class="icard-opt">${pactEff(oEff, kws)}</div>` : '') +
    (adv.length ? `<details class="pc-adv"><summary>승급 보상 1~${adv[adv.length - 1].lv}단계</summary>` +
      adv.map(a => `<div class="pc-lv"><b>${a.lv}</b><div>${(a.effects || []).map(e => `<div>${pactEff(e, kws)}</div>`).join('')}</div></div>`).join('') + '</details>' : '') +
    `<div class="pc-h">내환 노드</div>${ring('내환')}<div class="pc-h">중환 노드</div>${ring('중환')}` +
    (nDst || nUnd ? `<div class="pc-dst">운명 슬롯 ${nDst}${nUnd ? ` · 미정 숙명 슬롯 ${nUnd}` : ''}</div>` : '') + '</div>';
}
function renderPactDb() {
  const box = document.getElementById('pactResults');
  if (!box) return;
  const every = pactDbList();
  const cnt = g => every.filter(sp => pactIsDrop(sp) === (g === 'drop')).length;
  document.getElementById('pactGroups').innerHTML = [['battle', '전투 정령'], ['drop', '드롭 정령']].map(([g, nm]) =>
    `<button type="button" class="pk-grp${g === pactGroup ? ' on' : ''}" onclick="pactGroup='${g}';pactKind='';renderPactDb()">${nm} <i>${cnt(g)}</i></button>`).join('');
  const inGroup = every.filter(sp => pactIsDrop(sp) === (pactGroup === 'drop'));
  const gcnt = g => inGroup.filter(sp => sp.grade === g).length;
  document.getElementById('pactGrades').innerHTML = PACT_GRADES.map(g =>
    `<button type="button" class="pk-grade ${pactGradeCls(g)}${pactGradeOn.has(g) ? ' on' : ''}" onclick="pactGradeToggle('${g}')">${g} <i>${gcnt(g)}</i></button>`).join('');
  const all = inGroup.filter(sp => pactGradeOn.has(sp.grade));
  // 아랫줄 분류 칩 — 드롭 정령은 분류가 모두 '드롭'이라 줄을 숨긴다
  const kinds = pactGroup === 'drop' ? [] : [...new Set(all.map(pactTag))];
  if (pactKind && !kinds.includes(pactKind)) pactKind = '';
  document.getElementById('pactKinds').innerHTML = kinds.length ? ['', ...kinds].map(k =>
    `<button type="button" class="pk-chip${k === pactKind ? ' on' : ''}" onclick="pactKind='${k}';renderPactDb()">${k || '전체'}</button>`).join('') : '';
  document.getElementById('pactKinds').style.display = kinds.length ? '' : 'none';
  const tokens = parseTokens((document.getElementById('pactSearch').value || '').trim());
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const list = all.filter(sp => (!pactKind || pactTag(sp) === pactKind) && (!tokens.length || totalMatch(tokens, [pactSearchText(sp)])));
  document.getElementById('pactCount').textContent = list.length + '종';
  wtMiss('pact', (document.getElementById('pactSearch').value || '').trim(), list.length);
  box.innerHTML = list.length ? `<div class="item-grid">${list.map(sp => `<div class="icard-box">${pactCardHtml(sp, kws)}</div>`).join('')}</div>`
    : '<div class="lg-empty">검색 결과가 없습니다.</div>';
}

// ── DB 타르타로스 탭 (2026-10-10, SS14 시즌 기능) — tlidb Tartarus_Skill·Origin_Tartarus_Skill (build_tartarus.py)
// 스킬마다 1·2·3단계 → 카드 하나로 묶고, 1단계와 설명이 다른 단계만 접어서 보여 준다
let ttGroup = '타르타로스', ttTag = '';
const TT_SPIRIT_TAGS = ['고독한 늑대', '사자왕후', '주술 쥐', '매머드']; // 정령 종류 태그 — 칩으로 거른다
let TT_CARDS = null;
function ttCards() {
  if (TT_CARDS) return TT_CARDS;
  const m = new Map();
  TARTARUS.forEach(x => { const k = x.kind + '\u001f' + x.base; if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  TT_CARDS = [...m.values()].map(v => v.sort((a, b) => a.tier - b.tier));
  return TT_CARDS;
}
const ttName = x => String(x.name || '').replace(/\s*\(AI 번역\)$/, '');
const ttTitle = v => ttName(v[0]).replace(/\s*\d$/, '');
function ttSearchText(v) {
  return [ttTitle(v), v[0].kind, ...(v[0].tags || []), ...v.flatMap(x => [stripHtml(x.simple || ''), stripHtml(x.detail || '')])].join(' ');
}
function ttCardHtml(v, kws) {
  const a = v[0];
  const attrs = (a.attrs || []).map(([k, val]) => `${escapeHtml(k.replace(/:$/, ''))} <b>${escapeHtml(val)}</b>`).join(' · ');
  const tiers = v.length > 1 ? `${v[0].tier}~${v[v.length - 1].tier}단계` : '';
  const same = x => x.simple === a.simple && x.detail === a.detail && JSON.stringify(x.attrs) === JSON.stringify(a.attrs);
  const diff = v.slice(1).filter(x => !same(x));
  return `<div class="icard pcard ttcard"><div class="pc-top"><img src="${escapeHtml(a.icon || '')}" loading="lazy" onerror="this.style.visibility='hidden'"><div>` +
    `<div class="icard-name">${highlight(ttTitle(v), kws)}</div><div class="icard-tags"><span>${a.kind === '오리진' ? '오리진 타르타로스' : '타르타로스'}</span>${tiers ? `<span>${tiers}</span>` : ''}${a.level ? `<span>Lv.${a.level}</span>` : ''}</div>` +
    `<div class="tt-tags">${(a.tags || []).map(t => `<span class="${TT_SPIRIT_TAGS.includes(t) ? 'tt-sp' : ''}">${escapeHtml(t)}</span>`).join('')}</div></div></div>` +
    (attrs ? `<div class="tt-attrs">${attrs}</div>` : '') +
    `<div class="icard-opt tt-desc">${a.simple || ''}</div>` +
    (a.detail && a.detail !== a.simple ? `<details class="pc-adv"><summary>상세 설명</summary><div class="tt-desc">${a.detail}</div></details>` : '') +
    diff.map(x => `<details class="pc-adv"><summary>${x.tier}단계 — 1단계와 다른 설명</summary><div class="tt-desc">${x.simple || ''}</div></details>`).join('') +
    '</div>';
}
function renderTartarus() {
  const box = document.getElementById('ttResults');
  if (!box) return;
  const every = ttCards();
  const cnt = g => every.filter(v => v[0].kind === g).length;
  document.getElementById('ttGroups').innerHTML = [['타르타로스', '타르타로스 스킬'], ['오리진', '오리진 타르타로스']].map(([g, nm]) =>
    `<button type="button" class="pk-grp${g === ttGroup ? ' on' : ''}" onclick="ttGroup='${g}';renderTartarus()">${nm} <i>${cnt(g)}</i></button>`).join('');
  const inGroup = every.filter(v => v[0].kind === ttGroup);
  const tags = TT_SPIRIT_TAGS.filter(t => inGroup.some(v => (v[0].tags || []).includes(t)));
  if (ttTag && !tags.includes(ttTag)) ttTag = '';
  document.getElementById('ttTags').innerHTML = ['', ...tags].map(t =>
    `<button type="button" class="pk-chip${t === ttTag ? ' on' : ''}" onclick="ttTag='${t}';renderTartarus()">${t || '전체'}</button>`).join('');
  const tokens = parseTokens((document.getElementById('ttSearch').value || '').trim());
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  const list = inGroup.filter(v => (!ttTag || (v[0].tags || []).includes(ttTag)) && (!tokens.length || totalMatch(tokens, [ttSearchText(v)])));
  document.getElementById('ttCount').textContent = list.length + '종';
  wtMiss('tartarus', (document.getElementById('ttSearch').value || '').trim(), list.length);
  box.innerHTML = list.length ? `<div class="item-grid">${list.map(v => `<div class="icard-box">${ttCardHtml(v, kws)}</div>`).join('')}</div>`
    : (TARTARUS.length ? '<div class="lg-empty">검색 결과가 없습니다.</div>' : '<div class="lg-empty">이 시즌 데이터에는 타르타로스 스킬이 없습니다.</div>');
}

function renderTotal() {
  const box = document.getElementById('totalResults');
  const q = document.getElementById('totalSearch').value.trim();
  if (q !== totalPrevQ) { totalPrevQ = q; totalExpanded.clear(); }
  const tokens = parseTokens(q);
  document.getElementById('totalHint').style.display = tokens.length ? 'none' : 'block';
  if (!tokens.length) { box.innerHTML = ''; return; }
  const kws = tokens.filter(g => !g.neg).flatMap(g => g.kws);
  // 효과만 검색: 장비·재능·석판·운명 그룹에서 출처·유형 필드를 검색 대상에서 제외
  const st = (...f) => effOnlyOn() ? [] : f;
  // html: 행 본문 커스텀 렌더 — 용어 툴팁(tip/tip2)·아이템/스킬 호버 카드(ilink/slink)를 본 목록과 동일하게 제공
  // label: 그룹명도 검색 대상 — "투사체 부활"처럼 그룹명+내용 조합으로 그룹 내 검색 가능 (제외 !부활도 그룹 단위 동작)
  const groups = [
    {title: '⚔ 장비 옵션', go: 'equip', rows: ALL_DATA.filter(r => r.category === '장비' && totalMatch(tokens, ['장비 옵션', r.effect, ...st(r.source, r.type), ...rowTipTexts(r)])),
      line: r => [r.effect, (r.source || '특수 갑옷') + ' · ' + r.type], html: r => renderEffect(r, kws)},
    {title: '🏆 레전드 아이템', go: 'item', rows: ITEMS.map((it, i) => ({it, i})).filter(x => totalMatch(tokens, ['레전드 아이템', x.it.name, (x.it.tags || []).join(' '), ...(x.it.attrs || []).map(stripHtml), ...(x.it.opts || []).map(stripHtml)])),
      line: x => [x.it.name, (x.it.tags || []).join(' · ')], idx: x => x.i,
      html: x => `<span class="ilink" data-item="${x.i}">${highlight(x.it.name, kws)}</span>`},
    {title: '✨ 재능', go: 'talent', rows: ALL_DATA.filter(r => r.category === '재능' && totalMatch(tokens, ['재능', r.effect, ...st(r.type), ...rowTipTexts(r)])),
      line: r => [r.effect, r.type], html: r => renderEffect(r, kws)},
    {title: '🪨 석판', go: 'slab', rows: ALL_DATA.filter(r => r.category === '석판' && totalMatch(tokens, ['석판', r.effect, ...st(r.source, r.type), ...rowTipTexts(r)])),
      line: r => [r.effect, r.source + (r.type ? ' · ' + r.type : '')], html: r => renderEffect(r, kws)},
    {title: '🌠 운명', go: 'destiny', rows: ALL_DATA.filter(r => r.category === '운명' && totalMatch(tokens, ['운명', r.effect, ...st(r.type), ...rowTipTexts(r)])),
      line: r => [r.effect, r.type], html: r => renderEffect(r, kws)},
    {title: '🐾 전투 정령', go: 'pact', rows: pactDbList().filter(sp => totalMatch(tokens, ['전투 정령', pactSearchText(sp)])),
      line: sp => [sp.name, sp.kind + ' · ' + sp.grade + (sp.summary ? ' · ' + sp.summary : '')], pname: sp => sp.name},
    {title: '🔮 스킬', go: 'skill', rows: SKILLS.map((s, i) => ({s, i})).filter(x => totalMatch(tokens, ['스킬', x.s.name, x.s.kind, (x.s.tags || []).join(' '), skillAttrs(x.s).length ? '메인 속성 ' + skillAttrs(x.s).join(' ') : '', stripHtml([].concat(x.s.desc || []).join(' '))])),
      line: x => [x.s.name, x.s.kind + ((x.s.tags || []).length ? ' · ' + x.s.tags.join(' · ') : '')],
      html: x => `<span class="slink" data-sidx="${x.i}">${highlight(x.s.name, kws)}</span>`},
    {title: '🧪 조향 (벨트 전용)', go: null, rows: BLENDS.filter(b => totalMatch(tokens, ['조향 벨트', b.effect, b.req, b.mats, ...selfTipTexts(b)])),
      line: b => [b.effect, [b.req, b.mats].filter(Boolean).join(' · ')], html: b => renderEffect2(b.effect, b.tips, kws)},
    {title: '🗼 타워 시퀀스 (무기 전용)', go: null, rows: TOWERS.filter(t => totalMatch(tokens, ['타워 시퀀스 무기', t.effect, t.seq, t.source, ...selfTipTexts(t)])),
      line: t => [t.effect, t.source + ' · ' + t.seq], html: t => renderEffect2(t.effect, t.tips, kws)},
    {title: '💠 프리즘 종류', go: null, rows: PRISM.items.filter(it => totalMatch(tokens, ['프리즘 종류 제노', it.name, it.effect || '', it.talent || '', ...selfTipTexts(it)])),
      line: it => [it.name, it.talent ? '핵심 재능 교체: ' + it.talent : '제노 프리즘'],
      html: it => highlight(it.name, kws) + (it.effect ? ` <span class="t-inline">— ${renderEffect2(it.effect, it.tips, kws)}</span>` : '')},
    {title: '💠 프리즘 옵션', go: null, rows: PRISM.opts.filter(o => totalMatch(tokens, ['프리즘 옵션 제노', o.effect, o.type, ...selfTipTexts(o)])),
      line: o => [o.effect, [o.slot + '번 칸', o.type].filter(Boolean).join(' · ')], html: o => renderEffect2(o.effect, o.tips, kws)},
    {title: '🌙 부활 옵션 (추억 전용)', go: null, rows: REVIVALS.filter(o => totalMatch(tokens, ['부활 옵션 추억', o.effect, o.group, ...selfTipTexts(o)])),
      line: o => [o.effect, o.group + (o.tier ? ' · T' + o.tier : '')], html: o => renderEffect2(o.effect, o.tips, kws)},
  ];
  let h = '';
  groups.forEach(g => {
    if (!g.rows.length) return;
    h += `<div class="total-group"><div class="total-group-title">${g.title} <span class="tg-cnt">${g.rows.length}</span></div>`;
    const lim = (!g.go && totalExpanded.has(g.title)) ? g.rows.length : totalLimit();
    g.rows.slice(0, lim).forEach(x => {
      const [main, sub] = g.line(x);
      const attr = g.go ? ` data-tgo="${g.go}"${g.idx ? ` data-tidx="${g.idx(x)}"` : ''}${g.pname ? ` data-tpn="${escapeHtml(g.pname(x))}"` : ''}` : '';
      h += `<div class="total-row${g.go ? ' t-click' : ''}"${attr}>${g.html ? g.html(x) : highlight(main, kws)}${sub ? `<span class="t-sub">${escapeHtml(sub)}</span>` : ''}</div>`;
    });
    if (g.rows.length > lim) {
      h += g.go
        ? `<div class="total-more t-click" data-tgo="${g.go}">더보기 — 외 ${g.rows.length - totalLimit()}개 →</div>`
        : `<div class="total-more t-click" data-texp="${escapeHtml(g.title)}">더보기 — 외 ${g.rows.length - totalLimit()}개 ▼</div>`;
    } else if (!g.go && totalExpanded.has(g.title) && g.rows.length > totalLimit()) {
      h += `<div class="total-more t-click" data-tfold="${escapeHtml(g.title)}">접기 ▲</div>`;
    }
    h += `</div>`;
  });
  box.innerHTML = h ? `<div class="total-groups">${h}</div>` : '<div class="no-result">검색 결과가 없습니다.</div>';
  wtMiss('total', q, h ? 1 : 0);
}
// 결과 클릭 → 해당 탭으로 이동 + 같은 검색어 적용 (용어·아이템명·스킬명 클릭은 툴팁 고정이 우선)
document.addEventListener('click', e => {
  if (e.target.closest('.tip, .tip2, .ilink, .slink')) return;
  const texp = e.target.closest('[data-texp]');
  if (texp) { totalExpanded.add(texp.dataset.texp); renderTotal(); return; }
  const tfold = e.target.closest('[data-tfold]');
  if (tfold) { totalExpanded.delete(tfold.dataset.tfold); renderTotal(); return; }
  const row = e.target.closest('.total-row[data-tgo], .total-more[data-tgo]');
  if (!row) return;
  const kind = row.dataset.tgo;
  if (kind === 'pact') { // 정령 → 정령 탭 (줄이면 그 정령 이름, 더보기면 같은 검색어)
    document.getElementById('pactSearch').value = row.dataset.tpn || document.getElementById('totalSearch').value.trim();
    const sp0 = row.dataset.tpn && PACT.find(x => x.name === row.dataset.tpn);
    pactKind = ''; if (sp0) { pactGroup = pactIsDrop(sp0) ? 'drop' : 'battle'; pactGradeOn.add(sp0.grade); }
    switchTab('pact'); window.scrollTo(0, 0); return;
  }
  const q = row.dataset.tidx !== undefined ? ITEMS[parseInt(row.dataset.tidx)].name : document.getElementById('totalSearch').value.trim();
  document.getElementById('search').value = q;
  if (kind === 'skill') {
    document.querySelectorAll('.skill-cb').forEach(cb => { cb.checked = true; });
    switchTab('skill');
  } else if (kind === 'equip' || kind === 'item') {
    document.getElementById('cb-grade-기본').checked = kind === 'equip';
    document.getElementById('cb-grade-레전드').checked = true;
    document.querySelectorAll('.sub-cb.cat-장비').forEach(cb => { cb.checked = true; });
    switchTab('all');
  } else if (kind === 'destiny') {
    toggleCategory('운명', true);
    switchTab('destiny');
  } else { // talent | slab → 재능·석판 탭
    toggleCategory('석판', kind === 'slab');
    toggleCategory('재능', kind === 'talent');
    switchTab('talent');
  }
  window.scrollTo(0, 0);
});

function render() {
  pageSize = parseInt(document.getElementById("pageSize").value);
  totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage >= totalPages) currentPage = totalPages - 1;

  const rawKw = document.getElementById("search").value.trim();
  const keywords = parseTokens(rawKw).filter(g => !g.neg).flatMap(g => g.kws);
  const start = currentPage * pageSize;
  const slice = filtered.slice(start, start + pageSize);

  const tbody = document.getElementById("tbody");
  currentSlice = slice;
  if (slice.length === 0) {
    tbody.innerHTML = "";
    document.getElementById("noResult").style.display = "block";
  } else {
    document.getElementById("noResult").style.display = "none";
    tbody.innerHTML = slice.map((r, i) => rowHtml(r, keywords, `data-ridx="${i}"`)).join("");
  }

  document.getElementById("resultCount").innerHTML = `<span>${filtered.length.toLocaleString()}</span>개 결과`;
  updatePager();
}

function updatePager() {
  document.getElementById("pageInfo").textContent = `${currentPage + 1} / ${totalPages} 페이지`;
  document.getElementById("btnFirst").disabled = currentPage === 0;
  document.getElementById("btnPrev").disabled = currentPage === 0;
  document.getElementById("btnNext").disabled = currentPage >= totalPages - 1;
  document.getElementById("btnLast").disabled = currentPage >= totalPages - 1;
}

// 현재 탭의 목록 다시 그리기 (장비/스킬 탭이 페이지 바를 공유)
function refreshPage() {
  if (currentTab === 'skill') renderSkills();
  else render();
}

function goPage(p) {
  if (p < 0 || p >= totalPages) return;
  currentPage = p;
  refreshPage();
  window.scrollTo(0, 0);
}

function changePageSize() {
  currentPage = 0;
  saveUiState();
  refreshPage();
}

// ── 플로팅 툴팁 (용어 설명 + 아이템 카드) ──
const floatTip = document.createElement('div');
floatTip.id = 'floatTip';
floatTip.style.display = 'none';
document.body.appendChild(floatTip);
// 카드 안 밑줄 용어(.tip2)용 2차 툴팁 — 카드 툴팁 위에 겹쳐 표시
const floatTip2 = document.createElement('div');
floatTip2.id = 'floatTip2';
floatTip2.style.display = 'none';
document.body.appendChild(floatTip2);

function tipHtml(idx) {
  const lines = TIPS[idx].split('\n');
  return `<div class="ft-title">${escapeHtml(lines[0])}</div><div class="ft-body">${lines.slice(1).map(escapeHtml).join('\n')}</div>`;
}

function itemCardHtml(it, idx, ero) {
  let h = '<div class="icard">';
  if (idx !== undefined) {
    const on = savedItemNames.has(it.name);
    h += `<button class="star icard-star${on ? ' on' : ''}" data-iidx="${idx}" title="${on ? '저장 해제' : '아이템 저장'}">${on ? '★' : '☆'}</button>`;
    h += `<button class="pequip" data-eidx="${idx}" title="빌드 슬롯에 장착">빌드 장착</button>`;
  }
  // 이미지가 없거나 로드 실패해도 카드 정렬이 유지되도록 자리를 항상 확보
  h += `<div class="icard-img${it.img ? '' : ' noimg'}">${it.img ? `<img src="${it.img}" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}</div>`;
  h += `<div class="icard-name">${escapeHtml(it.name)}</div>`;
  if (it.tags && it.tags.length) h += `<div class="icard-tags">${it.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;
  if (it.attrs && it.attrs.length) h += `<div class="icard-attrs">${it.attrs.map(l => `<div>${l}</div>`).join('')}</div>`;
  // ero = 침식 강화된 옵션 인덱스 (빌드 슬롯 카드 전용) — 해당 줄을 침식 수치로 교체해 표시
  if (it.opts && it.opts.length) h += `<div class="icard-opts">${it.opts.map((l, i) => {
    if (ero && ero.includes(i) && it.corr && it.corr[i]) return `<div class="icard-opt opt-ero">${it.corr[i][1]}<span class="corr-chip">침식</span></div>`;
    return `<div class="icard-opt">${l}</div>`;
  }).join('')}</div>`;
  // 침식화 옵션 (tlidb 상세 페이지의 Corroded 카드 — 옵션 순서는 위 opts와 1:1 대응)
  if (it.corr && it.corr.length && !ero) h += `<div class="icard-corr"><div class="icard-corr-head">침식화 시 (최대 2개 강화 가능)</div>${it.corr.map(c => `<div class="icard-opt">${c[1]}</div>`).join('')}</div>`;
  if (!ero) h += itemPoolsHtml(it);
  if (it.flavor) h += `<div class="icard-flavor">${it.flavor}</div>`;
  return h + '</div>';
}

function placeTip(tipEl, el) {
  const M = 12, GAP = 6, MIN_H = 200; // 화면 여백 / 대상과의 간격 / 최소 표시 높이
  // 석판 보드 칸 툴팁은 위치는 그대로 두고 반투명 처리만 (보드 가림 완화)
  tipEl.classList.toggle('tip-side', !!(el.closest && el.closest('.slate-grid')));
  const r = el.getBoundingClientRect();
  tipEl.style.maxHeight = 'none'; // 원래 높이부터 측정
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  const below = innerHeight - r.bottom - GAP - M, above = r.top - GAP - M;
  let space, y;
  if (th <= below) { space = below; y = r.bottom + GAP; }              // 아래에 그대로 들어감
  else if (th <= above) { space = above; y = r.top - th - GAP; }       // 위에 그대로 들어감
  else if (below >= above) { space = Math.max(MIN_H, below); y = r.bottom + GAP; }  // 아래에 두고 스크롤
  else { space = Math.max(MIN_H, above); y = r.top - space - GAP; }    // 위에 두고 스크롤
  tipEl.style.maxHeight = space + 'px';
  y = Math.min(Math.max(M, y), Math.max(M, innerHeight - M - tipEl.offsetHeight)); // 잘린 높이 기준 재클램프
  let x = r.left;
  if (x + tw > innerWidth - M) x = Math.max(8, innerWidth - tw - M);
  tipEl.style.left = x + 'px';
  tipEl.style.top = y + 'px';
}

function showTip(el, html) {
  if (!html) { hideTip(); return; } // 내용 없는 링크(카드 없는 버튼 등)에 빈 툴팁 방지
  hideTip2(); // 카드 내용이 바뀌면 용어 툴팁도 닫음
  floatTip.innerHTML = html;
  floatTip.style.display = 'block';
  placeTip(floatTip, el);
}

function hideTip() {
  floatTip.style.display = 'none';
  hideTip2();
}

// ── 카드 안 용어(.tip2) 툴팁: title 속성을 스타일된 툴팁으로 변환 ──
let tip2El = null;
let tip2Pin = false; // 클릭으로 고정된 상태 — 카드 툴팁(.tip)의 고정과 같은 사이트 공통 동작
function showTip2(el) {
  // 브라우저 기본 title 툴팁과 겹치지 않도록 data 속성으로 옮김
  if (el.getAttribute('title')) { el.dataset.t = el.getAttribute('title'); el.removeAttribute('title'); }
  if (el.dataset.h) { // 미리 조립한 HTML 툴팁 (석판 칸 — 전염 섹션·명왕 칸 강조)
    floatTip2.innerHTML = el.dataset.h;
  } else {
  const raw = el.dataset.t || '';
  if (!raw) return;
  const lines = raw.split('\n');
  floatTip2.innerHTML = `<div class="ft-title">${escapeHtml(lines[0])}</div>` +
    (lines.length > 1 ? `<div class="ft-body">${lines.slice(1).map(escapeHtml).join('\n')}</div>` : '');
  }
  cancelHide2();
  floatTip2.style.display = 'block';
  placeTip(floatTip2, el);
  tip2El = el;
}
function hideTip2() {
  tip2Pin = false;
  cancelHide2();
  floatTip2.style.display = 'none';
  tip2El = null;
}
// 스크롤이 생긴 긴 용어 툴팁은 마우스를 안으로 옮길 수 있게 잠깐 살려둔다 (짧은 툴팁은 지금처럼 바로 닫힘)
let hide2Timer = null;
function tip2Scrollable() { return floatTip2.scrollHeight > floatTip2.clientHeight + 1; }
function cancelHide2() { if (hide2Timer) { clearTimeout(hide2Timer); hide2Timer = null; } }
function scheduleHide2() { if (tip2Pin) return; cancelHide2(); hide2Timer = setTimeout(hideTip2, 150); }
// 말줄임 셀(.cut-tip): 텍스트가 실제로 잘렸을 때만 툴팁 표시 (기본 title 툴팁은 항상 억제)
function cutTipSkip(el, target) {
  if (!el.classList.contains('cut-tip')) return false;
  if (el.getAttribute('title')) { el.dataset.t = el.getAttribute('title'); el.removeAttribute('title'); }
  if (target && target.closest('.drag-handle')) return true; // 핸들 위에서는 핸들 안내 title 유지
  return el.scrollWidth <= el.clientWidth;
}

let pinnedEl = null; // 클릭으로 고정된 툴팁 요소

function contentOf(el) {
  if (el.classList.contains('tip')) return tipHtml(parseInt(el.dataset.tip));
  if (el.dataset.binfo !== undefined) return resistTipHtml();
  if (el.dataset.prism !== undefined) return preset.prism ? prismCardHtml(preset.prism) : '';
  if (el.dataset.pslot !== undefined) {
    const v = preset.slots[el.dataset.pslot];
    if (!v) return '';
    if (v.kind === 'item') {
      const idx = ITEMS.findIndex(x => x.name === v.name);
      const base = idx >= 0 ? ITEMS[idx] : v.snap; // 현재 데이터 우선, 없으면 저장 시점 스냅샷
      if (!base) return '';
      return itemCardHtml(rolledItem(v, base), idx >= 0 ? idx : undefined, v.ero);
    }
    if (v.kind === 'blood') return bloodCardHtml(v);
    return customCardHtml(v);
  }
  if (el.dataset.tidx !== undefined) {
    const t = preset.talents[parseInt(el.dataset.tidx)];
    const eff = (t.rolled && t.effect) || (KEY_MAP.get(t.k) || t).effect; // 로그가 준 실제 굴림값 우선
    const m = eff.match(/^\[([^\]]+)\]\s*(.*)$/);
    return `<div class="ft-title">${escapeHtml(m ? m[1] : '재능')} <span style="color:#8b949e;font-weight:normal">· ${escapeHtml(t.type)}</span></div><div class="ft-body">${escapeHtml(m ? m[2] : eff)}</div>`;
  }
  if (el.dataset.sidx !== undefined) return skillCardHtml(SKILLS[parseInt(el.dataset.sidx)]);
  if (el.dataset.pskill !== undefined || el.dataset.psup !== undefined) {
    let ref;
    if (el.dataset.pskill !== undefined) ref = preset.skills[el.dataset.pskill].main;
    else { const [sl, si] = el.dataset.psup.split(':'); ref = preset.skills[sl].sup[parseInt(si)]; }
    if (!ref) return '';
    const i = findSkill(ref);
    return i >= 0 ? skillCardHtml(SKILLS[i]) : `<div class="ft-title">${escapeHtml(ref.name)}</div><div class="ft-body">현재 데이터에 없는 스킬입니다.</div>`;
  }
  const idx = parseInt(el.dataset.item);
  return ITEMS[idx] ? itemCardHtml(ITEMS[idx], idx) : ''; // 데이터 갱신 후 낡은 인덱스 방어
}

// 호버 종료 시 바로 닫지 않고 잠깐 대기 → 마우스를 툴팁(카드) 안으로 옮기면 유지됨
let hideTimer = null;
function cancelHide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => { if (!pinnedEl) hideTip(); }, 150);
}

document.addEventListener('mouseover', e => {
  if (tip2El && !tip2El.isConnected) hideTip2(); // 재렌더로 사라진 요소에 고정돼 있으면 정리
  const t2 = e.target.closest('.tip2');
  if (t2) { if (!cutTipSkip(t2, e.target) && !tip2Pin) showTip2(t2); return; } // 카드가 고정된 상태에서도 용어 툴팁은 동작
  if (pinnedEl) return; // 고정 중에는 호버로 교체되지 않음
  const el = e.target.closest('.tip, .ilink, .plink, .tlink, .slink');
  if (el) { cancelHide(); showTip(el, contentOf(el)); }
});
document.addEventListener('mouseout', e => {
  const t2 = e.target.closest('.tip2');
  if (t2 && !t2.contains(e.relatedTarget) && !tip2Pin) { if (tip2Scrollable()) scheduleHide2(); else hideTip2(); }
  if (pinnedEl) return;
  const el = e.target.closest('.tip, .ilink, .plink, .tlink, .slink');
  if (el && !el.contains(e.relatedTarget)) scheduleHide();
});
floatTip.addEventListener('mouseenter', cancelHide);
floatTip.addEventListener('mouseleave', () => { if (!pinnedEl) scheduleHide(); });
floatTip2.addEventListener('mouseenter', cancelHide2);
floatTip2.addEventListener('mouseleave', scheduleHide2);
// 클릭 통합 처리: 빌드 장착/추가 → 별(저장/해제) → 툴팁 내부 → 툴팁 고정/해제 순으로 판정
document.addEventListener('click', e => {
  const pe = e.target.closest('.pequip');
  if (pe) {
    if (pe.dataset.eidx !== undefined) equipItem(ITEMS[parseInt(pe.dataset.eidx)]);
    else if (pe.dataset.gequip !== undefined) equipItem(savedItems[parseInt(pe.dataset.gequip)]);
    return;
  }
  const pickRow = e.target.closest('tr[data-pick]');
  if (pickRow && build && build.skillPick) { pickSkill(parseInt(pickRow.dataset.pick)); return; }
  const sx = e.target.closest('[data-supx]');
  if (sx) {
    const [sl, i] = sx.dataset.supx.split(':');
    preset.skills[sl].sup[parseInt(i)] = null;
    persistPreset();
    renderPreset();
    return;
  }
  const bs = e.target.closest('[data-bsup]');
  if (bs && build && build.skillPick) {
    // 보조 채우기 팝업의 칩 제거 → 그 칸을 다시 타겟으로
    const i = parseInt(bs.dataset.bsup);
    preset.skills[build.skillPick.slot].sup[i] = null;
    persistPreset();
    build.skillPick.socket = i;
    renderSkillWiz();
    return;
  }
  const blx = e.target.closest('[data-blx]');
  if (blx && build && build.blood) {
    build.picks.splice(parseInt(blx.dataset.blx), 1);
    renderBuildBar();
    refreshList();
    return;
  }
  const bmm = e.target.closest('[data-bmm]');
  if (bmm && build && build.mem) {
    const [c, i] = bmm.dataset.bmm.split(':');
    build.opts[c].splice(parseInt(i), 1);
    wizRender();
    return;
  }
  const bbx = e.target.closest('[data-bbx]');
  if (bbx && build && build.blood) {
    build.bases.splice(parseInt(bbx.dataset.bbx), 1);
    renderBuildBar();
    refreshList();
    return;
  }
  const bex = e.target.closest('[data-bex]');
  if (bex && build && build.blood) {
    build.extras.splice(parseInt(bex.dataset.bex), 1);
    renderBuildBar();
    refreshList();
    return;
  }
  // 블러드 풀 모달 행 토글
  const bpb = e.target.closest('[data-bpb]');
  if (bpb && build && build.blood) { toggleBloodBase(parseInt(bpb.dataset.bpb)); return; }
  const cwo = e.target.closest('[data-cwo]');
  if (cwo && build && build.wiz) { craftWizToggle(parseInt(cwo.dataset.cwo)); return; }
  const bpl = e.target.closest('[data-bpl]');
  if (bpl && build && build.blood) { toggleBloodLegend(parseInt(bpl.dataset.bpl)); return; }
  const bpx = e.target.closest('[data-bpx]');
  if (bpx && build && build.blood) { toggleBloodExtra(parseInt(bpx.dataset.bpx)); return; }
  // 프리즘 마법사 행 토글 (종류 / 1~3번 옵션)
  const ppi = e.target.closest('[data-ppi]');
  if (ppi && build && build.prism) { togglePrismItem(parseInt(ppi.dataset.ppi)); return; }
  const ppo = e.target.closest('[data-ppo]');
  if (ppo && build && build.prism) { togglePrismOpt(parseInt(ppo.dataset.ppo)); return; }
  // 팝업 선택 행: 레전드 장비 / 재능·석판·운명 / 추억 / 스킬
  const hb = e.target.closest('.hero-btn[data-htrait]');
  if (hb) { pickHero(hb.dataset.hero, hb.dataset.htrait); return; }
  const sft = e.target.closest('[data-sftag]');
  if (sft) { toggleShareFilterTag(sft.dataset.sftag); return; }
  const shr = e.target.closest('.share-row[data-shid]');
  if (shr) { location.href = '/tli/view/?preset=' + encodeURIComponent(shr.dataset.shid); return; } // 공유 글은 보기 화면으로 (2026-10-09 빌더 전환)
  const stag = e.target.closest('.share-tag-btn[data-stag]');
  if (stag) {
    const t = stag.dataset.stag;
    if (t === shareLockedTag) { alert('히어로 특성은 빌드에서 고른 값으로 고정됩니다.\n바꾸려면 장비 빌드 제목 줄의 히어로를 변경해주세요.'); return; }
    const i = shareUpSel.indexOf(t);
    if (i >= 0) { shareUpSel.splice(i, 1); stag.classList.remove('on'); }
    else if (shareUpSel.length >= 10) alert('태그는 최대 10개까지 선택할 수 있습니다.');
    else {
      // 히어로 특성은 1개만 (같은 특성의 축약·정식 두 표기는 함께 허용)
      const tr = SHARE_TAG_TRAIT.get(t);
      const cur = shareUpSel.map(x => SHARE_TAG_TRAIT.get(x)).find(Boolean);
      if (tr && cur && cur.key !== tr.key) { alert('히어로 특성은 하나만 선택할 수 있습니다.\n(같은 특성의 축약·정식 표기는 함께 선택 가능)'); return; }
      shareUpSel.push(t); stag.classList.add('on');
    }
    updateShareTitle();  // 고른 순서대로 제목 미리보기 갱신
    filterShareTags();   // 배타 규칙에 따라 다른 히어로 숨김/복원
    return;
  }
  const ipk = e.target.closest('[data-ipk]');
  if (ipk && build && build.itemPick) { pickItemRow(itemPickPool()[parseInt(ipk.dataset.ipk)]); return; }
  const ipkg = e.target.closest('[data-ipkg]'); // 아이템 이름칸 클릭도 장착
  if (ipkg && build && build.itemPick) { pickItemRow(itemPickPool()[parseInt(ipkg.dataset.ipkg)]); return; }
  const tpk = e.target.closest('[data-tpk]');
  if (tpk && build && build.talent) { toggleTalentPick(parseInt(tpk.dataset.tpk)); return; }
  const mpk = e.target.closest('[data-mpk]');
  if (mpk && build && build.mem) { addToMem(memPool()[parseInt(mpk.dataset.mpk)]); return; }
  const skw = e.target.closest('[data-skw]');
  if (skw && build && build.skillPick) { pickSkill(parseInt(skw.dataset.skw)); return; }
  const bx = e.target.closest('.bb-chip .x');
  if (bx && build && build.opts && bx.dataset.bx) {
    const [c, i] = bx.dataset.bx.split(':');
    build.opts[c].splice(parseInt(i), 1);
    renderBuildBar();
    refreshList();
    return;
  }
  const star = e.target.closest('.star');
  if (star) {
    if (star.dataset.iidx !== undefined) {
      // 툴팁 카드 안의 별: 아이템 저장/해제 후 별 표시만 갱신 (툴팁은 유지)
      toggleSaveItem(ITEMS[parseInt(star.dataset.iidx)]);
      const on = star.classList.toggle('on');
      star.textContent = on ? '★' : '☆';
      star.title = on ? '저장 해제' : '아이템 저장';
    } else if (star.dataset.gidx !== undefined) {
      toggleSaveItem(savedItems[parseInt(star.dataset.gidx)]); // 즐겨찾기 그리드의 별
    } else if (star.dataset.ridx !== undefined) {
      toggleSave(currentSlice[parseInt(star.dataset.ridx)]);   // 전체 목록의 별
    } else if (star.dataset.fidx !== undefined) {
      toggleSave(favSlice[parseInt(star.dataset.fidx)]);       // 즐겨찾기 옵션 표의 별
    }
    return;
  }
  // 편집 모드: 행 클릭으로 추가, 추가된 행 재클릭으로 해제 (스킬 탭과 동일한 UX)
  const rowEl = e.target.closest('tr[data-rpick]');
  if (rowEl && build) {
    const r = rowEl.dataset.ridx !== undefined ? currentSlice[parseInt(rowEl.dataset.ridx)] : favSlice[parseInt(rowEl.dataset.fidx)];
    if (!r) return;
    const k = rowKey(r);
    if (build.talent) {
      const i = preset.talents.findIndex(t => t.k === k);
      if (i >= 0) { preset.talents.splice(i, 1); persistPreset(); renderBuildBar(); refreshList(); }
      else addTalent(r);
      return;
    }
    if (build.mem) { addToMem(r); return; }
    if (build.itemPick) { pickItemRow(r); return; }

    if (build.opts) {
      for (const c of ['basic', 'main', 'sub']) {
        const i = build.opts[c].findIndex(o => o.k === k);
        if (i >= 0) { build.opts[c].splice(i, 1); renderBuildBar(); refreshList(); return; }
      }
      const cat = classifyOptType(r.type);
      if (cat) { addToBuild(r, cat); return; }
      // 시퀀스·고유·랜덤 옵션 등 자동 분류가 안 되는 유형 → 칸 선택 팝업
      pendingAddRow = r;
      pinnedEl = null;
      showTip(rowEl, `<div class="ft-title">어느 칸에 넣을까요?</div><div style="display:flex;gap:6px;margin-top:6px">` +
        ['basic', 'main', 'sub'].map(c => `<button class="bb-btn" onclick="chooseAddCat('${c}')">${CAT_LABEL[c]}</button>`).join('') + `</div>`);
      return;
    }
    return;
  }
  const t2c = e.target.closest('.tip2');
  if (t2c && !cutTipSkip(t2c, e.target)) { // 클릭 = 고정, 같은 것 다시 클릭 = 해제 (카드 툴팁과 같은 공통 동작 · 모바일 탭 겸용)
    // 클릭이 동작인 요소(옵션 넣기/빼기 행, 모아보기의 요약 접기 행)는 고정하지 않는다 —
    // 동작 후 재렌더로 요소가 사라지면 고정 툴팁이 고아가 돼 화면에 박힌다.
    // 판별은 "눌러서 실제로 동작하는가" — 접기 버튼(.crit-more)을 품은 요약 행만 동작이다.
    // 그게 없는 .crit-sum(대미지 계산 창의 행)은 눌러서 고정할 수 있다 (근거 목록이 길어
    // 스크롤해 읽어야 한다 — 사용자 요청). 재렌더로 노드가 떨어져 나가도 판정이 유지되도록
    // 조상(#optSumBody)이 아니라 자기 안의 버튼으로 본다
    const sumRow = e.target.closest('.crit-sum');
    const act = e.target.closest('.opt-pick') || (sumRow && sumRow.querySelector('.crit-more'));
    if (act) { hideTip2(); }
    else if (tip2El === t2c && tip2Pin) { hideTip2(); }
    else { showTip2(t2c); tip2Pin = true; }
    return;
  }
  if (e.target.closest('#floatTip2')) return; // 고정된 용어 툴팁 내부 클릭은 닫지 않음
  if (tip2Pin) hideTip2(); // 고정 상태에서 바깥 클릭 = 해제
  if (e.target.closest('#floatTip')) return; // 툴팁 내부 클릭은 닫지 않음
  // 공유 빌드 보기: 편집 진입을 아예 타지 않는다 (알림 없이 무시 — 호버·클릭으로 카드만 확인)
  // 단, 본인 글 수정 모드(shareEdit)에서는 행 클릭 재편집을 그대로 연다
  if (!shareView || shareEdit) {
  // 빌드 제작·블러드 행: 행 클릭으로 편집 (이름=툴팁, 버튼·배지·조향 줄은 제외)
  const pmRow = e.target.closest('tr[data-pmemedit]');
  if (pmRow && !e.target.closest('.btn-sel, .tip2')) { startMemBuild(pmRow.dataset.pmemedit, pmRow.dataset.memx === '1'); return; }
  // 부활 옵션 하위 줄: 행 클릭으로 다시 선택 (효과 칩=툴팁, 버튼 제외)
  const rvRow = e.target.closest('tr[data-rvedit]');
  if (rvRow && !e.target.closest('.btn-sel, .tip2')) { openRevivalPicker(rvRow.dataset.rvedit); return; }
  // 프리즘 하위 줄: 행 클릭으로 재편집 (이름=카드 툴팁, 버튼 제외)
  const prRow = e.target.closest('tr[data-prismedit]');
  if (prRow && preset.prism && !e.target.closest('.btn-sel, .prname, .tip2')) { startPrism(preset.prism.pos); return; }
  const ivRow = e.target.closest('tr[data-invedit]');
  if (ivRow && preset.inverse && !e.target.closest('.btn-sel')) { startInverse(preset.inverse.pos); return; }
  const peRow = e.target.closest('tr[data-pedit]');
  if (peRow && !e.target.closest('.plink, .btn-sel, .blend-line, .diff-badge')) {
    if (peRow.dataset.pkind === 'blood') startBlood(peRow.dataset.pedit);
    else if (peRow.dataset.pkind === 'item') startItemPick(peRow.dataset.pedit); // 레전드: 목록에서 고르면 교체
    else startBuild(peRow.dataset.pedit);
    return;
  }
  } else {
    // 공유 빌드 보기: 줄 아무 데나 눌러도 그 줄의 카드가 열린다 (작은 글자를 정확히 누를 필요 없음)
    const row = e.target.closest('#presetWrap tbody tr');
    const link = row && row.querySelector('.plink, .tlink, .slink, .ilink');
    if (link && !e.target.closest('.tip, .ilink, .plink, .tlink, .slink, .btn-sel, button')) {
      if (pinnedEl === link) { pinnedEl = null; hideTip(); }
      else { pinnedEl = link; showTip(link, contentOf(link)); }
      return;
    }
  }
  const el = e.target.closest('.tip, .ilink, .plink, .tlink, .slink');
  if (!el) { pinnedEl = null; hideTip(); return; }
  if (pinnedEl === el) { pinnedEl = null; hideTip(); return; }
  pinnedEl = el;
  showTip(el, contentOf(el));
});

// ── 화면 상태 기억 (탭·필터·정렬·페이지 크기, 검색어는 제외) ──
const UI_KEY = 'tlidb_ui_v1';
function saveUiState() {
  if (build) return; // 편집 모드의 임시 필터는 저장하지 않음
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({
      tab: currentTab,
      tops: TOP_CB_IDS.map(id => document.getElementById(id).checked),
      subs: [...document.querySelectorAll('.sub-cb')].map(el => el.checked),
      kinds: [...document.querySelectorAll('.skill-cb')].map(el => el.checked),
      tags: [...document.querySelectorAll('.skill-tag-cb')].map(el => el.checked),
      attrs: [...document.querySelectorAll('.skill-attr-cb')].map(el => el.checked),
      sortKey, sortDir, skillSortKey, skillSortDir,
      effOnly: effOnlyOn(),
      coreOnly: coreOnlyOn(),
      tipOff: tipOffOn(),
      pageSize: document.getElementById('pageSize').value,
      ppanels: presetPanelOpen,
    }));
  } catch (e) {}
}
function restoreUiState() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(UI_KEY)); } catch (e) {}
  if (!s) { switchTab('total'); return; } // 첫 진입은 통합 검색, 이후엔 마지막 탭 유지
  const applyChecks = (sel, arr) => {
    const els = [...document.querySelectorAll(sel)];
    if (Array.isArray(arr) && arr.length === els.length) els.forEach((el, i) => { el.checked = arr[i]; });
  };
  if (Array.isArray(s.tops) && s.tops.length === TOP_CB_IDS.length) TOP_CB_IDS.forEach((id, i) => { document.getElementById(id).checked = s.tops[i]; });
  applyChecks('.sub-cb', s.subs);
  applyChecks('.skill-cb', s.kinds);
  // 태그가 OR 이던 시절 저장된 상태는 '전부 체크' 다. 그대로 되살리면 AND 에서 0건이 되므로
  // 그때는 필터 없음(전부 해제)으로 읽는다.
  applyChecks('.skill-tag-cb', Array.isArray(s.tags) && s.tags.every(Boolean) ? s.tags.map(() => false) : s.tags);
  applyChecks('.skill-attr-cb', s.attrs);
  ['석판', '운명', '재능'].forEach(cat => { // 상단 체크박스 부분선택(indeterminate) 상태 재계산
    const top = document.getElementById('cb-' + cat);
    const all = document.querySelectorAll('.sub-cb.cat-' + cat);
    const cnt = document.querySelectorAll('.sub-cb.cat-' + cat + ':checked').length;
    if (top) { top.indeterminate = cnt > 0 && cnt < all.length; top.checked = cnt === all.length; }
  });
  if (['effect', 'source', 'type'].includes(s.sortKey)) { sortKey = s.sortKey; sortDir = s.sortDir === -1 ? -1 : 1; }
  if (['name', 'tags', 'kind'].includes(s.skillSortKey)) { skillSortKey = s.skillSortKey; skillSortDir = s.skillSortDir === -1 ? -1 : 1; }
  ['effect', 'source', 'type'].forEach(k => { const el = document.getElementById('sort-' + k); if (el) el.textContent = sortKey === k ? (sortDir === 1 ? '▲' : '▼') : ''; });
  ['name', 'tags', 'kind'].forEach(k => { const el = document.getElementById('sort-sk-' + k); if (el) el.textContent = skillSortKey === k ? (skillSortDir === 1 ? '▲' : '▼') : ''; });
  if (typeof s.effOnly === 'boolean') { document.getElementById('effOnly').checked = s.effOnly; document.getElementById('effOnly2').checked = s.effOnly; }
  if (typeof s.coreOnly === 'boolean') document.getElementById('coreOnly').checked = s.coreOnly;
  if (typeof s.tipOff === 'boolean' && document.getElementById('tipOff')) document.getElementById('tipOff').checked = s.tipOff;
  if (['50', '100', '200', '500'].includes(String(s.pageSize))) document.getElementById('pageSize').value = String(s.pageSize);
  if (s.ppanels && typeof s.ppanels === 'object') presetPanelOpen = s.ppanels;
  applyPresetPanels();
  // 어떤 탭이든 switchTab을 거쳐 탭별 표시 규칙(체크박스·상세검색 섹션)을 적용
  switchTab(['total', 'all', 'talent', 'destiny', 'skill', 'share', 'fav', 'preset'].includes(s.tab) ? s.tab : 'all');
}

document.getElementById('backupFile').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { showBackupModal(JSON.parse(rd.result)); } catch (err) { alert('백업 불러오기 실패: ' + err.message); }
  };
  rd.readAsText(f);
});
// ── 로그 보내기 (개발자 전달용) ──
// 외부 앱 연동에 쓰는 릴레이(/api/logrelay)를 그대로 쓴다 — 5회 수령 또는 30분이면 서버에서 사라진다.
// 로그 원본은 수 MB라 gzip으로 줄여 올린다 (텍스트라 보통 1/15 이하로 준다).
function openRelay() {
  document.getElementById('relayBody').innerHTML =
    '<button class="bb-btn" onclick="document.getElementById(\'relayFile\').click()">로그 파일 고르기</button>' +
    '<div class="psum" style="margin-top:8px">UE_game.log — 게임 폴더의 Saved\\Logs 안에 있습니다</div>';
  document.getElementById('relayModal').style.display = 'flex';
  modalHistPush();
}
function closeRelay() { document.getElementById('relayModal').style.display = 'none'; }
async function relayCopy(btn) {
  const code = btn.parentNode.querySelector('code');
  try { await navigator.clipboard.writeText(code.textContent); showToast('번호를 복사했습니다.'); }
  catch (e) { // 클립보드를 못 쓰는 환경(비 HTTPS 등)에서는 직접 고를 수 있게 선택해 준다
    const r = document.createRange();
    r.selectNodeContents(code);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
}
// 로그에서 가져오기가 실제로 읽는 줄만 남긴다 — 원문 수십 MB의 대부분은 렌더·SDK 잡음이다.
// 파서(createLogParser)의 입력 계약과 같은 기준: 덤프 시작·ItemChange·스킬 캐시·트리 줄('+').
function relaySlim(text) {
  const out = [];
  let start = 0, nl;
  const keep = l =>
    l.indexOf('RecvMessage STT----GetPlayerData') >= 0 ||
    l.indexOf('ItemChange@') >= 0 ||
    l.indexOf('SkillCacheList') >= 0 ||
    l.indexOf('+') >= 0; // 덤프 트리 줄 — 파서도 이 기준으로 거른다
  while ((nl = text.indexOf('\n', start)) >= 0) {
    const l = text.slice(start, nl);
    if (keep(l)) out.push(l);
    start = nl + 1;
  }
  const last = text.slice(start);
  if (last && keep(last)) out.push(last);
  return out.join('\n') + '\n';
}
async function relayGzip(buf) {
  if (typeof CompressionStream !== 'function') return {body: buf, gz: false};
  try {
    const cs = new CompressionStream('gzip');
    const stream = new Blob([buf]).stream().pipeThrough(cs);
    return {body: await new Response(stream).arrayBuffer(), gz: true};
  } catch (e) { return {body: buf, gz: false}; }
}
document.getElementById('relayFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const box = document.getElementById('relayBody');
  const kb = n => n < 1024 * 1024 ? Math.round(n / 1024) + 'KB' : (Math.round(n / 1024 / 102.4) / 10) + 'MB';
  box.innerHTML = '<div class="psum">필요한 줄만 추리는 중… (' + escapeHtml(f.name) + ' · ' + kb(f.size) + ')</div>';
  try {
    // 전문 대신 가져오기가 읽는 줄만 보낸다 — 훨씬 가볍고, 파서 입력 기준과 같아 재현이 그대로 된다
    const slim = relaySlim(await f.text());
    const slimBuf = new TextEncoder().encode(slim);
    box.innerHTML = '<div class="psum">압축하는 중… (' + kb(f.size) + ' → 추림 ' + kb(slimBuf.byteLength) + ')</div>';
    const {body, gz} = await relayGzip(slimBuf.buffer);
    if (body.byteLength > 1900 * 1024) {
      box.innerHTML = '<div class="psum">파일이 너무 큽니다 — 압축해도 ' + kb(body.byteLength) +
        '라 올릴 수 있는 한도(1.9MB)를 넘습니다.<br>게임을 다시 켜서 새로 쌓인 로그로 시도해 보세요.</div>';
      return;
    }
    box.innerHTML = '<div class="psum">올리는 중… (' + kb(body.byteLength) + ')</div>';
    const r = await fetch('/api/logrelay?src=' + (gz ? 'devgz' : 'devraw'), {method: 'POST', body});
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.tok) {
      box.innerHTML = '<div class="psum">보내지 못했습니다' + (j && j.error ? ' (' + escapeHtml(j.error) + ')' : '') + ' — 잠시 후 다시 시도해 주세요.</div>';
      return;
    }
    box.innerHTML =
      '<div class="psum" style="margin-bottom:6px">보냈습니다. 아래 번호를 알려주세요 —</div>' +
      // 번호가 32자라 버튼과 한 줄에 두면 좁은 화면에서 카드 밖으로 밀린다 → 위아래로 쌓는다
      '<code style="display:block;width:100%;box-sizing:border-box;overflow-wrap:anywhere;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px 9px">' + escapeHtml(j.tok) + '</code>' +
      '<button class="bb-btn" style="margin-top:6px" onclick="relayCopy(this)">복사</button>' +
      '<div class="psum" style="margin-top:8px">' + kb(f.size) + ' → 필요한 줄만 ' + kb(slimBuf.byteLength) + ' → ' + kb(body.byteLength) + (gz ? ' (압축됨)' : '') +
      ' · 30분 뒤 또는 5번 받아가면 사라집니다</div>';
  } catch (err) {
    box.innerHTML = '<div class="psum">보내지 못했습니다 — ' + escapeHtml(String(err && err.message || err)) + '</div>';
  }
});
document.getElementById('logFile').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (guardBuildMode()) return;
  handleLogFile(f);
});

updateFavCount();
updatePresetCount();
initSkillTagBar();
// ── 빌드 온라인 공유 (Cloudflare Workers + D1) ──
// 로컬 파일(file://)로 열면 API를 쓸 수 없어 공유 탭·버튼을 숨긴다
const SHARE_ONLINE = location.protocol === 'http:' || location.protocol === 'https:';
// 정식 명칭(성난 그림자)으로 저장된 특성 → 축약형(리한2) 통일 — 구버전 로그 가져오기 산출물 마이그레이션
// (빌드 로드·정규화는 스크립트 초반이라 SHARE_HEROES 선언 전 — 여기서 뒤늦게 한 번 수행)
(() => {
  let dirty = false;
  presets.list.forEach(p => {
    if (!p.hero) return;
    SHARE_HEROES.forEach(([h, traits]) => traits.forEach(tr => {
      if (p.hero.trait === tr[1]) { p.hero.trait = tr[0]; dirty = true; }
    }));
  });
  if (dirty) persistPreset();
})();
function heroImgOf(tags) { // 태그 목록에서 첫 히어로 특성의 초상화
  for (const t of tags) { const tr = SHARE_TAG_TRAIT.get(t); if (tr) return tr.img; }
  return null;
}
function skillIconOf(name) { // 메인 스킬명 → 아이콘
  const s = SKILLS.find(x => x.name === name);
  return (s && s.icon) || SK_FALLBACK;
}
// 추가 태그: 스킬 태그(데이터 기준 42종) + 성향·능력치 — worker.js 화이트리스트와 일치 필수
// 목록 캐시 (2026-10-10) — 서버가 같은 목록을 60초 엣지 캐시로 준다. 이 브라우저에서 올리기·고치기·지우기·추천을 하면
// 표시(tli_share_dirty)를 남겨 다음 목록 요청은 캐시를 건너뛴다(fresh). 빌더 2·보기 화면도 같은 표시를 남긴다.
function shareMarkDirty() { try { localStorage.setItem('tli_share_dirty', String(Date.now())); } catch (e) {} }
function shareDirty() { try { return Date.now() - (+localStorage.getItem('tli_share_dirty') || 0) < 5 * 60e3; } catch (e) { return false; } }
async function shareApi(path, opts) {
  if (opts && opts.method === 'POST') shareMarkDirty();
  const res = await fetch('/api' + path, Object.assign({headers: {'content-type': 'application/json'}}, opts || {}));
  const data = await res.json().catch(() => ({ok: false, error: '서버 응답을 해석할 수 없습니다.'}));
  if (!data.ok) { const err = new Error(data.error || '요청에 실패했습니다.'); err.code = data.code; throw err; }
  return data;
}
let shareList = [], shareMore = false, shareLoading = false, shareFilterTags = [];
// 시즌 칩 (2026-10-10) — 처음엔 최신 시즌만 켬, 눌러서 여러 개 (하나는 남김). 시즌 목록은 /tli/seasons.json (지금 + 보관된 지난 시즌)
let shareSeasons = null, shareSeOn = new Set();
async function shareSeasonInit() {
  if (shareSeasons) return;
  try { const s = await (await fetch('/tli/seasons.json')).json(); shareSeasons = [s.current, ...(s.past || [])].filter(Boolean); }
  catch (e) { shareSeasons = []; }
  if (!shareSeasons.length && typeof SEASON !== 'undefined' && SEASON.label) shareSeasons = [SEASON.label];
  shareSeOn = new Set(shareSeasons.slice(0, 1));
  renderShareSeasons();
}
function renderShareSeasons() {
  const el = document.getElementById('shareSeasons'); if (!el) return;
  el.innerHTML = shareSeasons.length > 1 ? shareSeasons.map((l, i) => `<button type="button" class="share-se-chip${shareSeOn.has(l) ? ' on' : ''}" onclick="shareSeToggle('${l}')">${l}${i ? '' : ' <small>지금</small>'}</button>`).join('') : '';
}
function shareSeToggle(l) {
  if (shareSeOn.has(l)) { if (shareSeOn.size > 1) shareSeOn.delete(l); } else shareSeOn.add(l);
  renderShareSeasons(); renderShare(true);
}
// 목록 질의 문자열 (정렬 + 시즌 + 고른 태그 + 검색어) — 필터는 서버에서 처리
function shareQueryStr(offset, fresh) {
  const q = document.getElementById('shareSearch').value.trim();
  return '/shares?sort=' + document.getElementById('shareSort').value + '&offset=' + offset +
    (shareSeOn.size && shareSeasons.length > 1 ? '&se=' + [...shareSeOn].join(',') : '') +
    (shareFilterTags.length ? '&tags=' + encodeURIComponent(shareFilterTags.join(',')) : '') +
    (q ? '&q=' + encodeURIComponent(q) : '') + (fresh ? '&fresh=' + Date.now() : '');
}
function toggleShareFilter() {
  const panel = document.getElementById('shareFilterPanel');
  const open = panel.style.display === 'none';
  if (open && !panel.innerHTML) renderShareFilter();
  panel.style.display = open ? '' : 'none';
  document.getElementById('shareFilterBtn').classList.toggle('cmp-on', open);
}
// 필터 목록: 히어로 특성(축약) · 성향·능력치 · 콘텐츠 · 스킬 태그 (장비 이름은 제외)
function renderShareFilter() {
  const btn = t => `<button class="share-tag-btn${shareFilterTags.includes(t) ? ' on' : ''}" data-sftag="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
  document.getElementById('shareFilterPanel').innerHTML =
    SHARE_HEROES.map(([hero, traits]) =>
      `<div class="uic-row hero-row"><span class="uic-row-label">${escapeHtml(hero)}</span><div class="uic-row-btns">` +
      traits.map(([a]) => btn(a)).join('') + `</div></div>`).join('') +
    `<div class="uic-row grp-row"><span class="uic-row-label">성향·능력치</span><div class="uic-row-btns">${SHARE_EXTRA_TAGS.map(btn).join('')}</div></div>` +
    `<div class="uic-row grp-row"><span class="uic-row-label">콘텐츠</span><div class="uic-row-btns">${SHARE_CONTENT_TAGS.map(btn).join('')}</div></div>` +
    `<div class="uic-row grp-row"><span class="uic-row-label">스킬 태그</span><div class="uic-row-btns">${SHARE_SKILL_TAGS.map(btn).join('')}</div></div>`;
}
function syncSharePicked() { // 고른 태그를 목록 위에 표시 (클릭하면 해제)
  document.getElementById('sharePicked').innerHTML = shareFilterTags
    .map(t => `<button class="share-tag-btn on" data-sftag="${escapeHtml(t)}">${escapeHtml(t)} ✕</button>`).join('');
  const on = shareFilterTags.length || document.getElementById('shareSearch').value.trim();
  document.getElementById('shareResetBtn').style.display = on ? '' : 'none';
}
function toggleShareFilterTag(t) {
  const i = shareFilterTags.indexOf(t);
  if (i >= 0) shareFilterTags.splice(i, 1);
  else if (shareFilterTags.length >= 10) { alert('태그 필터는 10개까지 고를 수 있습니다.'); return; }
  else shareFilterTags.push(t);
  if (document.getElementById('shareFilterPanel').innerHTML) renderShareFilter();
  syncSharePicked();
  renderShare(true);
}
function resetShareFilter() {
  shareFilterTags = [];
  document.getElementById('shareSearch').value = '';
  if (document.getElementById('shareFilterPanel').innerHTML) renderShareFilter();
  syncSharePicked();
  renderShare(true);
}
function shareIconsHtml(main, tags) { // 히어로 초상화 + 메인 스킬 아이콘
  const h = heroImgOf(tags);
  // 폭 고정 칸에 담는다 — 초상화가 없는 글도 제목 시작 위치가 다른 줄과 같게 (2026-10-10)
  return `<span class="share-icos">${h ? `<img class="share-ico" src="${h}" loading="lazy" onerror="this.style.display='none'">` : ''}` +
    `<img class="share-ico" src="${skillIconOf(main)}" loading="lazy" onerror="this.onerror=null;this.src=SK_FALLBACK"></span>`;
}
function shareTitleText(it) { // 자유 입력 제목 우선, 없으면(예전 글) 메인 스킬+태그로 조합
  let tags = [];
  try { tags = JSON.parse(it.tags || '[]'); } catch (e) {}
  return (it.title && String(it.title).trim()) || shareTitleOf(it.main, tags, parseShareItems(it));
}
// 저장은 UTC(toISOString)지만 표시는 한국시간 기준 — 안 맞추면 KST 00~09시에 올린 글이 하루 전으로 보인다
// (통계의 하루 경계도 worker의 statDay가 같은 +9 기준을 쓴다)
function kstDate(iso) {
  const t = Date.parse(iso);
  return isNaN(t) ? String(iso || '').slice(0, 10) : new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
}
function shareDateText(it) { // 작성일 + 고친 적 있으면 수정일(MM-DD)
  const c = it.created_at ? kstDate(it.created_at) : '', u = it.updated_at ? kstDate(it.updated_at) : '';
  return c + (u ? ' (수정 ' + u.slice(5) + ')' : '');
}
function shareRowHtml(it) {
  let tags = [];
  try { tags = JSON.parse(it.tags || '[]'); } catch (e) {}
  const chips = tags.map(t => `<span class="share-tag">${escapeHtml(t)}</span>`).join('') + shareItemsHtml(parseShareItems(it));
  return `<div class="share-row" data-shid="${escapeHtml(it.id)}">` +
    `<div class="share-left">${shareIconsHtml(it.main, tags)}<div class="share-textcol">` +
    // 시즌 배지 (2026-10-10) — 서버가 코드의 se 로 기록, 이전 글은 SS13. 이번 시즌은 금색, 지난 시즌은 회색
    `<div class="share-title">${it.season ? `<span class="share-se${it.season === ((typeof SEASON !== 'undefined' && SEASON.label) || '') ? ' cur' : ''}" title="${escapeHtml(it.season)} 시즌에 만든 빌드">${escapeHtml(it.season)}</span>` : ''}${escapeHtml(shareTitleText(it))}</div>` +
    (chips ? `<div class="share-tags">${chips}</div>` : '') + `</div></div>` +
    `<div class="share-meta"><span class="share-like">👍 ${it.likes}</span><span class="share-views">👁 ${it.views || 0}</span><span>${escapeHtml(it.author)}</span><span>${escapeHtml(shareDateText(it))}</span></div></div>`;
}
async function renderShare(refresh) {
  const box = document.getElementById('shareList');
  const st = document.getElementById('shareStatus');
  if (!SHARE_ONLINE) { box.innerHTML = '<div class="no-result">온라인 배포판(https)에서만 사용할 수 있는 기능입니다.</div>'; return; }
  if (shareLoading) return;
  if (!refresh && shareList.length) { box.innerHTML = shareList.map(shareRowHtml).join(''); return; } // 캐시 표시
  shareLoading = true;
  st.textContent = '';
  await shareSeasonInit();
  // 마지막으로 받은 같은 목록이 있으면 먼저 바로 보여 주고(새로고침해도 즉시), 받아 온 게 다를 때만 다시 그린다
  const qk = shareQueryStr(0), fresh = shareDirty();
  let cached = null; try { const c = JSON.parse(localStorage.getItem('tli_share_list_v1') || 'null'); if (c && c.k === qk) cached = c; } catch (e) {}
  if (cached) { shareList = cached.list; shareMore = cached.more; box.innerHTML = shareList.length ? shareList.map(shareRowHtml).join('') : box.innerHTML; }
  else box.innerHTML = '<div class="loading"><span class="spin"></span> 공유 목록을 불러오는 중...</div>';
  try {
    const d = await shareApi(shareQueryStr(0, fresh));
    if (fresh) try { localStorage.removeItem('tli_share_dirty'); } catch (e) {}
    try { localStorage.setItem('tli_share_list_v1', JSON.stringify({k: qk, list: d.list, more: d.more})); } catch (e) {}
    if (cached && JSON.stringify(cached.list) === JSON.stringify(d.list) && cached.more === d.more) { syncSharePicked(); document.getElementById('shareMoreBtn').style.display = shareMore ? '' : 'none'; shareLoading = false; return; }
    shareList = d.list; shareMore = d.more;
    const filtering = shareFilterTags.length || document.getElementById('shareSearch').value.trim();
    box.innerHTML = shareList.length ? shareList.map(shareRowHtml).join('')
      : (filtering ? '<div class="no-result">조건에 맞는 빌드가 없습니다. 태그나 검색어를 줄여보세요.</div>'
        : '<div class="no-result">아직 공유된 빌드가 없습니다. 빌더의 [빌드 관리 → 공유 올리기]로 첫 번째 주인공이 되어보세요!</div>');
    syncSharePicked();
    document.getElementById('shareMoreBtn').style.display = shareMore ? '' : 'none';
    st.textContent = '';
  } catch (e) {
    st.textContent = '';
    // 저장소 하루 한도를 다 쓴 것은 고장이 아니라 '오늘 치를 다 썼다'는 상태다. 그때는
    // '불러오지 못했다'로 겁주지 말고, 언제 돌아오는지를 안내로 세운다(자정 UTC에 저절로 풀린다).
    box.innerHTML = e.code === 'quota'
      ? `<div class="no-result"><b>🔧 빌드 공유가 잠시 쉬고 있습니다</b><br>${escapeHtml(e.message)}</div>`
      : `<div class="no-result">목록을 불러오지 못했습니다: ${escapeHtml(e.message)}</div>`;
  }
  shareLoading = false;
}
async function loadMoreShares() {
  const more = document.getElementById('shareMoreBtn');
  const label = more.textContent;
  more.disabled = true; more.innerHTML = '<span class="spin"></span> 불러오는 중';
  try {
    const d = await shareApi(shareQueryStr(shareList.length));
    shareList = shareList.concat(d.list); shareMore = d.more;
    document.getElementById('shareList').innerHTML = shareList.map(shareRowHtml).join('');
    document.getElementById('shareMoreBtn').style.display = shareMore ? '' : 'none';
  } catch (e) { alert('더 불러오기 실패: ' + e.message); }
  more.disabled = false; more.textContent = label;
}
// ── 공유 글 열기: 목록 클릭·링크 진입 → 바로 읽기 전용 빌드 뷰 (상세 모달 없음) ──
let shareDetail = null;
function showVeil(msg) {
  let el = document.getElementById('loadVeil');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadVeil'; el.className = 'load-veil';
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="spin"></span> ${escapeHtml(msg)}`;
  el.style.display = 'flex';
}
function hideVeil() { const el = document.getElementById('loadVeil'); if (el) el.style.display = 'none'; }
async function openShareDetail(id) {
  showVeil('공유 빌드를 불러오는 중...');
  try {
    const d = await shareApi('/share?id=' + encodeURIComponent(id));
    shareDetail = d.item;
    shareDetail.liked = !!d.liked;
    await viewShareDetail();
  } catch (e) { alert('불러오기 실패: ' + e.message); }
  hideVeil();
}
// 본인 글 수정: 비밀번호를 먼저 서버에 확인시키고(다 고친 뒤 틀렸다고 하면 곤란) 편집 모드로 전환.
// 편집 대상은 화면에 떠 있는 공유 빌드 사본이라 내 빌드 목록·localStorage는 건드리지 않는다.
// 관리 키는 keeper 페이지가 같은 출처의 localStorage에 넣어둔다 — 있으면 비밀번호 없이 수정
// 기본은 비밀번호 확인. 관리 키는 keeper의 [수정] 링크(?preset=ID&edit=1)로 들어왔을 때만 쓴다
// — 관리자가 평소에 게시판을 볼 때 [✏ 수정]을 누르면 남의 글도 소리 없이 열려버리므로
async function editMyShare(useAdmin) {
  if (!shareDetail || shareEdit) return;
  if (useAdmin) { // 관리자가 아니면(로그인 만료 등) 조용히 비밀번호 흐름으로 내려간다
    showVeil('관리 권한을 확인하는 중...');
    try {
      // 인증은 관리 로그인 쿠키(wtadmin)가 한다 — 같은 출처라 자동으로 실린다
      await shareApi('/share/edit', {method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify({id: shareDetail.id, check: 1})});
      hideVeil();
      enterShareEdit({admin: true}, '🔑 관리자 권한으로 수정 모드에 들어왔습니다.');
      return;
    } catch (e) {}
    hideVeil();
  }
  let savedPwd = ''; try { savedPwd = localStorage.getItem('tlidb_share_pwd_v1') || ''; } catch (e) {}
  uiPrompt('이 공유 글을 수정하려면 올릴 때 등록한 비밀번호를 입력하세요.', savedPwd, async pwd => {
    if (!/^\S{4,20}$/.test(pwd)) { alert('비밀번호는 공백 없는 4~20자입니다.'); return; }
    showVeil('비밀번호를 확인하는 중...');
    try {
      await shareApi('/share/edit', {method: 'POST', body: JSON.stringify({id: shareDetail.id, pwd, check: 1})});
      try { localStorage.setItem('tlidb_share_pwd_v1', pwd); } catch (e) {}
      enterShareEdit({pwd}, '✏ 수정 모드입니다. 빌드를 고친 뒤 [💾 수정 저장]을 누르세요.');
    } catch (e) { alert('수정할 수 없습니다: ' + e.message); }
    hideVeil();
  }, {title: '✏ 공유 글 수정', type: 'password'});
}
function enterShareEdit(mode, msg) {
  shareEdit = mode;
  syncShareEditBar();
  showToast(msg);
}
function syncShareEditBar() { // 편집 모드 = view-mode 해제(수정 UI 노출) + 상단 바 버튼 교체
  const on = !!shareEdit;
  document.getElementById('presetWrap').classList.toggle('view-mode', !on);
  document.getElementById('presetWrap').classList.toggle('share-edit', on);
  document.getElementById('shareViewBtns').style.display = on ? 'none' : '';
  document.getElementById('shareEditBtns').style.display = on ? '' : 'none';
  document.getElementById('shareViewLabel').textContent = on ? '✏ 공유 글 수정 중 — ' : '👁 공유 빌드 보기 — ';
  renderPreset();
  syncShareBarOffset();
}
function saveShareEdit() { // 제목·태그·작성자 확인 팝업을 거쳐 저장 (업로드 모달 재사용)
  if (shareEdit) openShareUp(true);
}
function cancelShareEdit() {
  if (!shareEdit) return;
  uiConfirm('수정을 취소하면 지금까지 고친 내용이 사라집니다. 취소할까요?', () => {
    shareEdit = null;
    exitShareView(); // 고친 사본은 버리고 공유 탭으로 (원본은 서버 그대로)
  });
}
// 본인 글 삭제: 올릴 때 등록한 비밀번호 확인 (기억해둔 값을 기본으로 제시) — 성공 시 뷰 종료 후 목록 갱신
function deleteMyShare() {
  if (!shareDetail) return;
  let savedPwd = ''; try { savedPwd = localStorage.getItem('tlidb_share_pwd_v1') || ''; } catch (e) {}
  uiPrompt('이 공유 글을 삭제하려면 올릴 때 등록한 비밀번호를 입력하세요.', savedPwd, async pwd => {
    if (!/^\S{4,20}$/.test(pwd)) { alert('비밀번호는 공백 없는 4~20자입니다.'); return; }
    try {
      await shareApi('/share/delete', {method: 'POST', body: JSON.stringify({id: shareDetail.id, pwd})});
      shareList = []; // 목록 캐시 무효화
      exitShareView(); // 뷰 종료 → 공유 탭 (renderShare가 새 목록 로드)
      showToast('🗑 공유 글이 삭제되었습니다.');
    } catch (e) { alert('삭제 실패: ' + e.message); }
  }, {title: '🗑 공유 글 삭제', type: 'password'});
}
async function copyShareLink() {
  if (!shareDetail) return;
  const link = location.origin + '/tli/view/?preset=' + encodeURIComponent(shareDetail.id);
  try { await navigator.clipboard.writeText(link); showToast('🔗 공유 링크가 복사되었습니다.'); }
  catch (e) { uiPrompt('자동 복사가 지원되지 않는 환경입니다. 아래 링크를 직접 복사하세요.', link, () => {}, {title: '🔗 링크 복사'}); }
}
// ── 공유 빌드 읽기 전용 보기: 빌드 탭 화면 그대로, 수정 기능만 전부 차단 ──
let shareView = null; // {bak: 내 빌드, item: 공유 글} — 활성 시 preset이 공유 빌드를 가리킴
let shareEdit = null;  // {pwd} — 본인 글 수정 중 (공유 뷰의 편집 잠금을 풀어둔 상태)
function guardShareView() { // 수정 진입점 공용 가드
  if (!shareView || shareEdit) return false;
  alert('공유 빌드 보기 중에는 수정할 수 없습니다. [내 빌드로 가져오기] 후 수정해주세요.');
  return true;
}
async function viewShareDetail() { // 공유 글 → 읽기 전용 빌드 화면
  if (!shareDetail || shareView) return;
  try {
    const {preset: pv} = await codeToPreset(shareDetail.code);
    let tags = [];
    try { tags = JSON.parse(shareDetail.tags || '[]'); } catch (e) {}
    pv.name = shareTitleText(shareDetail).slice(0, 60);
    shareView = {bak: preset, item: shareDetail};
    preset = pv;
    document.getElementById('presetWrap').classList.add('view-mode');
    document.getElementById('shareViewBar').style.display = 'flex';
    document.getElementById('shareViewTitle').textContent = pv.name + ' (by ' + shareDetail.author + ')';
    try { document.title = pv.name + " · 토치라이트 인피니트 빌드 공유 · Winterer's Tools"; } catch (e) {}
    document.getElementById('shareViewMeta').textContent = shareDateText(shareDetail) + ' · 👁 ' + (shareDetail.views || 0);
    document.getElementById('shareViewItems').innerHTML = shareItemsHtml(parseShareItems(shareDetail));
    const likeBtn = document.getElementById('shareViewLike');
    likeBtn.textContent = '👍 추천 ' + (shareDetail.likes || 0) + (shareDetail.liked ? ' (완료)' : '');
    likeBtn.disabled = !!shareDetail.liked;
    // 주소를 ?preset=ID로 — 주소창 복사 = 공유 링크, 뒤로가기 = 보기 종료
    if (!modalEntry) { try { history.pushState({m: 1}, '', '?preset=' + encodeURIComponent(shareDetail.id)); modalEntry = true; } catch (e) {} }
    switchTab('preset');
    syncShareBarOffset();
  } catch (e) { alert('구성 보기 실패: ' + e.message); }
}
function syncShareBarOffset() { // 상단 바 높이 → --svb-h (표 헤더가 바 아래에 붙도록)
  const bar = document.getElementById('shareViewBar');
  const h = shareView && bar.style.display !== 'none' ? Math.round(bar.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--svb-h', h + 'px');
}
window.addEventListener('resize', () => { if (shareView) syncShareBarOffset(); });
function exitShareView(noTab) {
  if (!shareView) return;
  preset = shareView.bak;
  shareView = null;
  try { if (window.__tliSetTitle) window.__tliSetTitle(); } catch (e) {}
  shareDetail = null;
  shareEdit = null;
  modalEntry = false; // 이후 syncHashTab의 replaceState가 ?preset=ID 엔트리를 탭 주소로 정리
  document.getElementById('presetWrap').classList.remove('view-mode', 'share-edit');
  document.getElementById('shareViewBtns').style.display = '';
  document.getElementById('shareEditBtns').style.display = 'none';
  document.getElementById('shareViewLabel').textContent = '👁 공유 빌드 보기 — ';
  document.getElementById('shareViewBar').style.display = 'none';
  syncShareBarOffset(); // 표 헤더 오프셋 원복
  renderPreset();
  if (!noTab) switchTab('share');
}
async function importFromShareView() {
  if (!shareView) return;
  const it = shareView.item;
  let tags = [];
  try { tags = JSON.parse(it.tags || '[]'); } catch (e) {}
  exitShareView(true);
  try {
    const {p, missing} = await addPresetFromCode(it.code, it.main + (tags[0] ? ' ' + tags[0] : ''));
    switchTab('preset');
    // 담아간 기록 (관리자 통계용, 같은 사람이 여러 번 담아도 1명) — 실패해도 가져오기에는 영향 없음
    if (SHARE_ONLINE) fetch('/api/take', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: it.id})}).catch(() => {});
    alert(`[${p.name}] 빌드를 가져왔습니다.` + (missing ? ' (현재 데이터에 없는 항목 ' + missing + '개는 이름만 표시됩니다)' : ''));
  } catch (e) { alert('가져오기 실패: ' + e.message); }
}
async function likeShare() {
  if (!shareDetail) return;
  try {
    const d = await shareApi('/like', {method: 'POST', body: JSON.stringify({id: shareDetail.id})});
    const btn = document.getElementById('shareViewLike');
    btn.textContent = `👍 추천 ${d.likes}` + (d.already ? ' (이미 추천함)' : ' (완료)');
    btn.disabled = true;
    const row = shareList.find(x => x.id === shareDetail.id);
    if (row) { row.likes = d.likes; document.getElementById('shareList').innerHTML = shareList.map(shareRowHtml).join(''); }
  } catch (e) { alert('추천 실패: ' + e.message); }
}
// ── 공유 올리기 ──
let shareUpSel = [], shareUpMainName = '', shareTitleEdited = false, shareLockedTag = null, shareUpEditing = false;
function shareItemsHtml(items) { // 예전 글에 저장된 레전드 칩 (지금은 새로 만들지 않음)
  return (items || []).map(n => `<span class="share-tag item">${escapeHtml(n)}</span>`).join('');
}
function parseShareItems(it) {
  try { const v = JSON.parse(it.items || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function openShareUp(editing) { // editing = 기존 공유 글 수정 (제목·태그·작성자를 지금 값으로 채워서 연다)
  if (sbConflicts(preset.slateBd).length) { alert('보드에 겹치거나 밖으로 나간 석판이 있습니다.\n재배치를 마친 뒤 공유할 수 있어요.'); return; }
  if (!SHARE_ONLINE) { alert('온라인 배포판(https)에서만 공유할 수 있습니다.'); return; }
  if (guardBuildMode()) return;
  shareUpEditing = !!editing;
  // 메인 스킬: 채워진 첫 슬롯의 메인 (액티브 우선)
  const mainSk = ['a1', 'a2', 'a3', 'a4', 'a5', 'p1', 'p2', 'p3', 'p4'].map(id => preset.skills[id] && preset.skills[id].main).find(Boolean);
  if (!mainSk) { alert('공유하려면 스킬 빌드에 메인 스킬이 하나 이상 있어야 합니다.'); return; }
  if (!(preset.hero && traitInfo(preset.hero.trait))) { alert('공유하려면 먼저 히어로를 선택해주세요.\n빌드 상단 [🦸 히어로] 줄에서 고를 수 있습니다.'); return; }
  shareUpMainName = mainSk.name;
  shareUpSel = [];
  document.getElementById('shareTagFilter').value = '';
  shareTitleEdited = false;
  // 빌드에 히어로가 있으면 그 특성 태그를 자동으로 넣고 잠근다 (여기서는 못 바꿈)
  shareLockedTag = preset.hero && traitInfo(preset.hero.trait) ? preset.hero.trait : null;
  if (shareLockedTag) shareUpSel = [shareLockedTag];
  // 수정 모드: 올릴 때 고른 태그를 되살린다 — 편집 중 히어로를 바꿨다면 옛 특성 태그는 버린다(특성은 1개만)
  if (shareUpEditing && shareDetail) {
    let old = [];
    try { old = JSON.parse(shareDetail.tags || '[]'); } catch (e) {}
    const lockKey = shareLockedTag ? (traitInfo(shareLockedTag) || {}).key : null;
    old.forEach(t => {
      const tr = traitInfo(t);
      if (tr && tr.key !== lockKey) return;
      if (!shareUpSel.includes(t) && shareUpSel.length < 10) shareUpSel.push(t);
    });
  }
  updateShareTitle(); // 잠긴 히어로 태그까지 반영한 제목 (태그를 더 고르면 뒤에 붙는다)
  if (shareUpEditing && shareDetail && shareDetail.title) { // 올릴 때 쓴 제목 그대로 (자동 조합으로 덮지 않음)
    shareTitleEdited = true;
    document.getElementById('shareUpTitle').value = shareDetail.title;
  }
  const tagBtn = t => t === shareLockedTag
    ? `<button class="share-tag-btn on lock" data-stag="${escapeHtml(t)}" title="빌드에서 고른 히어로라 여기서는 바꿀 수 없습니다">🔒 ${escapeHtml(t)}</button>`
    : `<button class="share-tag-btn${shareUpSel.includes(t) ? ' on' : ''}" data-stag="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
  document.getElementById('shareUpTags').innerHTML = SHARE_HEROES.map(([hero, traits]) =>
    `<div class="uic-row hero-row"><span class="uic-row-label">${escapeHtml(hero)}</span><div class="uic-row-btns">` +
    traits.map(([a]) => tagBtn(a)).join('') + `</div></div>`).join('') +
    `<div class="uic-row" style="margin-top:10px"><span class="uic-row-label">성향·능력치</span><div class="uic-row-btns">${SHARE_EXTRA_TAGS.map(tagBtn).join('')}</div></div>` +
    `<div class="uic-row grp-row"><span class="uic-row-label">콘텐츠</span><div class="uic-row-btns">${SHARE_CONTENT_TAGS.map(tagBtn).join('')}</div></div>` +
    `<div class="uic-row grp-row"><span class="uic-row-label">스킬 태그</span><div class="uic-row-btns">${SHARE_SKILL_TAGS.map(tagBtn).join('')}</div></div>`;
  filterShareTags(); // 잠긴 히어로 기준으로 다른 히어로 줄 숨김·같은 히어로 타 특성 비활성
  try {
    document.getElementById('shareAuthor').value = (shareUpEditing && shareDetail && shareDetail.author)
      || localStorage.getItem('tlidb_author_v1') || '';
    document.getElementById('sharePwd').value = localStorage.getItem('tlidb_share_pwd_v1') || '';
  } catch (e) {}
  // 수정은 이미 비밀번호를 확인하고 들어왔으므로 입력 줄을 숨긴다
  document.getElementById('sharePwdRow').style.display = shareUpEditing ? 'none' : '';
  document.getElementById('shareUpHead').textContent = shareUpEditing ? '✏ 공유 글 수정' : '🌐 빌드 공유 올리기';
  document.getElementById('shareUpSubmit').textContent = shareUpEditing ? '수정 저장' : '올리기';
  document.getElementById('shareUpModal').style.display = 'flex'; modalHistPush();
}
function closeShareUp() {
  document.getElementById('shareUpModal').style.display = 'none';
  shareLockedTag = null; shareUpEditing = false;
}
function shareTitleOf(main, tags, items) { // 제목이 없는 예전 글의 표시용 조합
  return [main, ...(tags || []), ...(items || [])].join(' ').trim();
}
function updateShareTitle() { // 직접 고치기 전까지는 메인 스킬 + 고른 태그로 자동 채움
  if (shareTitleEdited) return;
  document.getElementById('shareUpTitle').value = shareTitleOf(shareUpMainName, shareUpSel, []).slice(0, 40); // 제목 상한
}
function filterShareTags() { // 태그 검색 + 히어로 배타 규칙 — 특성을 고르면 다른 히어로는 숨기고, 같은 히어로의 다른 특성은 비활성
  const q = document.getElementById('shareTagFilter').value.trim();
  const selTrait = shareUpSel.map(x => SHARE_TAG_TRAIT.get(x)).find(Boolean) || null;
  document.querySelectorAll('#shareUpTags .uic-row').forEach(row => {
    let vis = 0;
    row.querySelectorAll('.share-tag-btn').forEach(b => {
      const tr = SHARE_TAG_TRAIT.get(b.dataset.stag);
      // 별명(분노리한·번냥이·프하 등)도 검색 매칭 — 별명은 검색 전용, 실제 태그로는 축약·정식만 사용
      // 버튼은 축약형(빈1)만 있지만 정식 명칭·별명으로도 찾을 수 있게
      let show = !q || b.dataset.stag.includes(q) || (row.querySelector('.uic-row-label').textContent || '').includes(q) ||
        (tr && (tr.full.includes(q) || tr.al.some(a => a.includes(q))));
      let dim = false;
      if (selTrait && tr) {
        if (tr.hero !== selTrait.hero) show = false;   // 다른 히어로는 통째로 숨김
        else if (tr.key !== selTrait.key) dim = true;  // 같은 히어로의 다른 특성은 비활성
      }
      b.style.display = show ? '' : 'none';
      b.classList.toggle('dis', dim);
      if (show) vis++;
    });
    row.style.display = vis ? '' : 'none';
  });
}
async function submitShare() {
  // 잠금 태그가 아니라 빌드 상태를 직접 확인 (팝업을 연 뒤 히어로를 비운 경우까지)
  if (!(preset.hero && traitInfo(preset.hero.trait))) { alert('히어로가 지정되지 않았습니다. 팝업을 닫고 [🦸 히어로]에서 먼저 선택해주세요.'); return; }
  const title = document.getElementById('shareUpTitle').value.trim();
  if (title && (title.length < 2 || title.length > 40)) { alert('제목은 2~40자로 입력해주세요.'); return; }
  const author = document.getElementById('shareAuthor').value.trim();
  if (!/^[가-힣A-Za-z0-9#]{2,10}$/.test(author)) { alert('작성자명은 한글·영문·숫자·# 2~10자로 입력해주세요.'); return; }
  const pwd = document.getElementById('sharePwd').value;
  if (!shareUpEditing && !/^\S{4,20}$/.test(pwd)) { alert('삭제용 비밀번호는 공백 없는 4~20자로 입력해주세요.'); return; }
  if (shareUpSel.length < 1) { alert('태그를 1개 이상 선택해주세요.'); return; }
  const editing = shareUpEditing && shareEdit && shareDetail;
  showVeil(editing ? '공유 글을 수정하는 중...' : '공유 빌드를 올리는 중...');
  try {
    const code = await presetToCode(preset);
    const payload = {code, main: shareUpMainName, title, tags: shareUpSel, author};
    if (editing) {
      const headers = {'content-type': 'application/json'};
      // 관리 수정은 비밀번호를 보내지 않는다 — 권한은 관리 로그인 쿠키로 확인된다
      await shareApi('/share/edit', {method: 'POST', headers, body: JSON.stringify(
        Object.assign({id: shareDetail.id, pwd: shareEdit.pwd}, payload))});
      try { localStorage.setItem('tlidb_author_v1', author); } catch (e) {}
      closeShareUp();
      shareList = []; // 목록 캐시 무효화 (다음 진입 시 새로 로드)
      shareEdit = null;
      exitShareView();
      showToast('✏ 공유 글이 수정되었습니다.');
    } else {
      const d = await shareApi('/share', {method: 'POST', body: JSON.stringify(Object.assign({pwd}, payload))});
      try { localStorage.setItem('tlidb_author_v1', author); localStorage.setItem('tlidb_share_pwd_v1', pwd); } catch (e) {}
      closeShareUp();
      shareList = [];
      const link = location.origin + '/tli/view/?preset=' + d.id; // 공유 링크는 보기 화면 (2026-10-09)
      try { await navigator.clipboard.writeText(link); alert('공유 완료! 링크가 클립보드에 복사되었습니다.\n' + link); }
      catch (e) { prompt('공유 완료! 아래 링크를 복사해서 나눠주세요.', link); }
    }
  } catch (e) { alert((editing ? '수정 실패: ' : '공유 실패: ') + e.message); }
  hideVeil();
}
// 공유 링크(?preset=ID)로 접속 → 읽기 전용 빌드 뷰로 바로 진입
// 2026-10-10: 옛 화면 안의 '공유 빌드 보기 모드' 대신 보기 화면으로 넘긴다 — 그 모드에서 빌드를 바꾸면 내용은 내 빌드인데
// 위 띠(공유 글 제목·작성자)가 남는 문제가 있었다(제보). 관리 [수정](?edit=1)도 보기 화면이 처리한다.
async function importSharedFromLink(id, edit) {
  location.replace('/tli/view/?preset=' + encodeURIComponent(id) + (edit ? '&edit=1' : ''));
}

// ── 패치노트 (사용자에게 보이는 변화만 · 새 버전을 올릴 때 맨 위에 한 줄 추가) ──
const PATCH_NOTES = [
  {v: '1.0', d: '2026-08-18', li: [
    'mToB(mini Touch of Builder)로 새로 시작합니다 — 페이지를 처음부터 다시 만들었습니다',
    '\'프리셋\'이라는 말을 \'빌드\'로 바꿨습니다',
    '기본 정보 수정: 부호 없이 괄호로 적힌 음수 옵션(예: 냉기 저항 (-24–-18)%)이 저항·최대 HP·아머·회피·속성 합계에서 통째로 빠져 있었습니다. 레전드의 페널티 옵션이 여기 해당합니다',
    '옵션 수치를 읽는 규칙을 화면마다 따로 두지 않고 하나로 맞췄습니다 — 옵션 모아보기와 기본 정보가 같은 옵션을 다르게 계산하던 문제가 없어집니다',
    '"힘 (10-12) 포인트 당"처럼 조건을 말하는 숫자는 내 수치로 더하지 않습니다',
    '수집한 데이터를 정리했습니다 — 다른 도구에서 가져다 쓰기 좋은 형태가 되고, 용어 설명이 데이터 안에 함께 들어갑니다',
    '이전 기록(미니 토치 DB ver 1.0~25.0)은 기존 페이지에 그대로 있습니다']},
];
function openPatch() {
  document.getElementById('patchBody').innerHTML = PATCH_NOTES.map(p =>
    `<div class="pn-ver"><b>ver ${escapeHtml(p.v)}</b><span>${escapeHtml(p.d)}</span></div>` +
    `<ul>${p.li.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`).join('');
  document.getElementById('patchModal').style.display = 'flex';
  document.getElementById('patchBody').scrollTop = 0;
  modalHistPush();
}
function closePatch() { document.getElementById('patchModal').style.display = 'none'; }

// ── 브라우저 히스토리 연동 (ver 8.0): 뒤로가기 = 팝업 닫기 → 이전 탭, 주소(?tab=..&q=..)로 링크 공유 ──
// ver 13.8: 해시(#) → 쿼리(?) — 디시 등 일부 게시판이 링크에서 # 뒤를 잘라버려 공유 링크가 끊겼다.
//           읽기는 쿼리 우선 + 해시 폴백이라 이미 퍼진 #링크도 그대로 열린다.
var hashApplying = false; // popstate 반영 중 pushState 방지
var modalEntry = false;   // 히스토리 최상단이 모달용 엔트리인지
const TAB_IDS_H = ['total', 'all', 'legend', 'talent', 'destiny', 'pact', 'skill', 'tartarus', 'share', 'fav', 'preset'];
const TAB_Q_INPUT = {total: 'totalSearch', legend: 'legendSearch', pact: 'pactSearch', tartarus: 'ttSearch'}; // 탭마다 자기 검색칸 (그 외는 공용 #search)
function urlParams() { return location.search.slice(1) || location.hash.slice(1); } // 쿼리 우선, 옛 해시 링크 폴백
function parseHash() {
  try { const p = new URLSearchParams(urlParams()); return {tab: p.get('tab'), q: p.get('q') || ''}; }
  catch (e) { return {tab: null, q: ''}; }
}
function buildHash() {
  const q = (currentTab === 'preset' || currentTab === 'share') ? '' :
    document.getElementById(TAB_Q_INPUT[currentTab] || 'search').value.trim();
  return '?tab=' + currentTab + (q ? '&q=' + encodeURIComponent(q) : '');
}
function syncHashTab(tab) {
  if (hashApplying) return;
  if (typeof shareView !== 'undefined' && shareView) return; // 공유 뷰 중에는 주소가 ?preset=ID — 탭 주소로 덮지 않음
  const h = buildHash();
  if (location.search === h && !location.hash) return;
  const prev = parseHash().tab;
  try { // 일부 환경(file:// 등)은 히스토리 갱신을 막을 수 있음 — 실패해도 앱 동작엔 지장 없음
    if (prev && prev !== tab) { history.pushState(null, '', h); modalEntry = false; }
    else history.replaceState(null, '', h); // 첫 진입·같은 탭은 교체만 (상대 URL이라 남은 해시도 정리됨)
  } catch (e) {}
}
function syncHashQ() {
  if (hashApplying || parseHash().tab !== currentTab) return;
  const h = buildHash();
  if (location.search !== h) try { history.replaceState(null, '', h); } catch (e) {}
}
function applyHash() { // 주소 → 화면 상태 (탭 + 검색어)
  const s = parseHash();
  if (!s.tab || !TAB_IDS_H.includes(s.tab)) return;
  hashApplying = true;
  if (s.tab !== 'preset') {
    document.getElementById('search').value = TAB_Q_INPUT[s.tab] ? '' : s.q;
    if (TAB_Q_INPUT[s.tab]) document.getElementById(TAB_Q_INPUT[s.tab]).value = s.q;
  }
  switchTab(s.tab);
  hashApplying = false;
}
function anyModalOpen() {
  const vis = id => document.getElementById(id).style.display !== 'none';
  return !!(vis('uiModal') || previewCanvas || pendingBackup || pendingLogChars || vis('blendModal') || vis('corrModal') || vis('towerModal') || vis('revivalModal') || vis('bloodPoolModal') || vis('shareUpModal') || vis('inverseModal') || vis('patchModal') || vis('sbSockModal') || shareView);
}
function closeTopModal() { // 뒤로가기용: 가장 위 팝업 하나만 닫음 (z-index 우선순위)
  const vis = id => document.getElementById(id).style.display !== 'none';
  if (vis('uiModal')) { closeUiModal(); return; }
  if (vis('sbSockModal')) { closeSbSock(); return; }
  if (vis('patchModal')) { closePatch(); return; }
  if (previewCanvas) { closeImagePreview(); return; }
  if (pendingBackup) { closeBackupModal(); return; }
  if (pendingLogChars) { closeLogCharModal(); return; }
  if (vis('blendModal')) { closeBlendPicker(); return; }
  if (vis('corrModal')) { closeCorrPicker(); return; }
  if (vis('towerModal')) { closeTowerPicker(); return; }
  if (vis('revivalModal')) { closeRevivalPicker(); return; }
  if (vis('bloodPoolModal')) { wizCancel(); return; }
  if (vis('shareUpModal')) { closeShareUp(); return; }
  if (vis('inverseModal')) { closeInverse(); return; }
  if (shareView) { exitShareView(); return; }
}
function modalHistPush() { // 모달 열림 → 히스토리 엔트리 1개 (뒤로가기로 닫기 위함, 중첩 모달은 공유)
  if (!modalEntry) { try { history.pushState({m: 1}, '', location.search + location.hash || buildHash()); modalEntry = true; } catch (e) {} }
}
window.addEventListener('popstate', () => {
  modalEntry = false;
  if (anyModalOpen()) {
    closeTopModal();
    if (anyModalOpen()) modalHistPush(); // 중첩 모달이 남아 있으면 엔트리 재확보
    return;
  }
  applyHash();
});

// 로컬 파일에선 공유 탭 숨김 + 헤더 우측 도움말 전환(온라인=데이터 안내 / 로컬=데이터 업데이트 방법)은
// 첫 페인트 전에 <head>의 is-online/is-local 클래스 + CSS로 처리한다 (여기서 하면 깜빡임)
// ── 이용 통계(관리 페이지 전용) — 익명 집계 ──
// 개인 식별 정보 없음 · 순방문은 서버에서 IP 해시로만 판정 · 로컬 파일에서는 아예 보내지 않음
// 시점: ① 페이지 열 때(방문 수 + 그 시점 구성) ② 페이지를 떠날 때 최종 구성만 한 번 더
//   (열 때만 보내면 첫 방문자는 빈 빌드라 아무것도 안 잡히고, 그날 만든 빌드가 다음 방문에야 반영됨)
// 서버는 사람(IP 해시) × 빌드(sid) 한 줄만 두고 지금 상태로 덮어쓰므로 여러 번 보내도 수치가 부풀지 않는다
// 통계용 빌드 식별자(sid) — 이 브라우저에만 저장되는 임의 문자열 10자.
// 빌드 순번(id)은 가장 큰 걸 지우면 재사용돼서(1,2,3에서 3 삭제 후 추가 → 다시 3)
// 서버의 옛 줄을 엉뚱하게 덮어쓴다. 통계 키는 재사용되지 않는 값이어야 하므로 따로 둔다.
const SID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randSid() {
  const buf = new Uint8Array(10);
  try { crypto.getRandomValues(buf); } catch (e) { for (let i = 0; i < 10; i++) buf[i] = Math.floor(Math.random() * 256); }
  return [...buf].map(b => SID_CHARS[b % SID_CHARS.length]).join('');
}
function ensureStatIds() { // 없으면 부여, 복제로 겹쳤으면 새로 부여
  const seen = new Set();
  let dirty = false;
  presets.list.forEach(p => {
    if (typeof p.sid !== 'string' || p.sid.length !== 10 || seen.has(p.sid)) { p.sid = randSid(); dirty = true; }
    seen.add(p.sid);
  });
  if (dirty) try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch (e) {}
}
const USAGE_MAX = 12; // 이 개수를 넘으면 목록이 잘리므로 서버에서 "삭제 판정"을 하지 않는다
function usageBuilds() { // [히어로 태그, 첫 액티브 메인 스킬, 빌드 이름, sid]
  ensureStatIds();
  const out = [];
  presets.list.forEach(p => {
    const sk = p.skills || {};
    const first = ['a1', 'a2', 'a3', 'a4', 'a5'].map(id => sk[id] && sk[id].main).find(Boolean);
    if (!first || !first.name) return;
    out.push([(p.hero && p.hero.trait) || '', String(first.name).slice(0, 40),
      String(p.name || '').trim().slice(0, 40), p.sid]);
  });
  return out.slice(0, USAGE_MAX);
}
let usageSent = '', usageCalls = 0;
function sendUsage(withVisit) {
  if (!SHARE_ONLINE) return;
  try {
    const builds = usageBuilds();
    const sig = JSON.stringify(builds);
    if (!withVisit && (sig === usageSent || usageCalls >= 3)) return; // 같은 구성 반복·과다 전송 방지
    usageSent = sig; usageCalls++;
    // 사용 정도 두 단계: 맛보기(뭐라도 1개) / 실사용(메인 스킬이 있거나 장비 3개 이상)
    const used = presets.list.some(p => Object.keys(p.slots || {}).length || (p.talents || []).length ||
      Object.keys(p.skills || {}).length || Object.keys(p.mems || {}).length);
    const real = presets.list.some(p => {
      const sk = p.skills || {};
      const hasMain = SKILL_SLOTS.some(sl => sk[sl.id] && sk[sl.id].main);
      return hasMain || Object.keys(p.slots || {}).length >= 3;
    });
    // f=1: 빌드 목록이 잘리지 않았다는 표시 — 서버가 목록에 없는 빌드를 삭제된 것으로 처리해도 안전
    const full = builds.length < USAGE_MAX ? 1 : 0;
    const body = JSON.stringify(withVisit ? {p: used ? 1 : 0, r: real ? 1 : 0, b: builds, f: full} : {v: 0, b: builds, f: full});
    // 떠나는 중에는 fetch가 취소될 수 있어 sendBeacon 우선
    if (!withVisit && navigator.sendBeacon) navigator.sendBeacon('/api/hit', new Blob([body], {type: 'application/json'}));
    else fetch('/api/hit', {method: 'POST', headers: {'content-type': 'application/json'}, body, keepalive: true}).catch(() => {});
  } catch (e) {}
}
sendUsage(true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendUsage(false); });
window.addEventListener('pagehide', () => sendUsage(false));
const bootHash = urlParams(); // restoreUiState의 switchTab이 주소를 덮기 전에 보존 (쿼리 우선, 옛 #링크 폴백)
restoreUiState();
if (bootHash.includes('tab=')) { try { history.replaceState(null, '', '?' + bootHash); } catch (e) {} applyHash(); } // 공유 링크 우선
// 공유 빌드 링크(?preset=ID · 옛 #preset=ID): 확인 후 새 빌드로 가져오기
(() => {
  try {
    const hq = new URLSearchParams(bootHash);
    const sid = hq.get('preset');
    if (SHARE_ONLINE && sid && /^[a-z0-9]{4,16}$/.test(sid)) {
      try { history.replaceState(null, '', '?tab=share'); } catch (e) {} // 뷰에서 뒤로가면 공유 목록으로
      importSharedFromLink(sid, hq.get('edit') === '1');
    }
  } catch (e) {}
})();
// 외부 앱 원시 로그 릴레이(?logdump=) · 로그 연동(?logimport=) — 처리는 02_logimport 의 extLogDump · extLogImport (빌더 2 와 공용)
{ const q = new URLSearchParams(bootHash), tok = q.get('logdump'), lc = q.get('logimport');
  if (tok || lc) { try { history.replaceState(null, '', location.pathname) } catch (e) {} if (tok) extLogDump(tok); else extLogImport(lc); } }
// 빌드 단축 링크(?plink=id): 서버에서 코드를 받아 확인 후 새 빌드로 (7일 유지·다회 조회)
(async () => {
  try {
    const id = new URLSearchParams(bootHash).get('plink');
    if (!id || !/^\w{6,16}$/.test(id)) return;
    try { history.replaceState(null, '', location.pathname) } catch (e) {}
    const res = await fetch('/api/plink?id=' + id);
    if (!res.ok) { alert('공유된 빌드 링크를 찾지 못했습니다.\n(링크는 7일간 유지됩니다 — 보낸 사람에게 새 링크를 요청해주세요)'); return; }
    const code = (await res.json()).code;
    uiConfirm('링크로 공유된 빌드가 있습니다.\n새 빌드로 가져올까요?', async () => {
      try {
        switchTab('preset');
        const {p, missing} = await addPresetFromCode(code);
        alert(`[${p.name}] 빌드를 가져왔습니다.` + (missing ? `\n(현재 데이터에 없는 항목 ${missing}개는 이름만 표시됩니다)` : ''));
      } catch (e) { alert('가져오기 실패: ' + e.message); }
    });
  } catch (e) {}
})();
// 빌드 링크 공유(?pcode=TLP코드): 확인 후 새 빌드로 가져오기
(async () => {
  try {
    const code = new URLSearchParams(bootHash).get('pcode');
    if (!code) return;
    try { history.replaceState(null, '', location.pathname) } catch (e) {} // 새로고침 중복 방지
    if (!/^TLP[01]\./.test(code) || code.length > 8000) { alert('지원하지 않는 빌드 링크 형식입니다.'); return; }
    uiConfirm('링크로 공유된 빌드가 있습니다.\n새 빌드로 가져올까요?', async () => {
      try {
        switchTab('preset');
        const {p, missing} = await addPresetFromCode(code);
        alert(`[${p.name}] 빌드를 가져왔습니다.` + (missing ? `\n(현재 데이터에 없는 항목 ${missing}개는 이름만 표시됩니다)` : ''));
      } catch (e) { alert('가져오기 실패: ' + e.message); }
    });
  } catch (e) {}
})();

