/* 그림 자료 공통 계층 — 도감·오토 배틀·생성기가 같이 쓴다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierImg 하나만 붙인다.

   왜 모아 두는가: URL 규칙(원본/썸네일)과 img.json 읽기를 페이지마다 따로
   두면 같은 버그를 여러 번 고친다(앞선 저장소에서 실제로 그랬다).

   img.json 구조:
     {"img": {"<카드>": {"byStyle": {"<화풍>": <몫>}}}}
     <몫> = {"f": "파일",                      액션 한 장(카드 그림)
             "awaken": {"f": "파일"},           각성 한 장(3성일 때) — 선택
             "cursed": {"f": "파일"},           저주 한 장(저주 발현 때) — 선택
             "casual": {"f": ["파일", …]},      일상컷 — 선택
             "skin": {"f": {"<열쇠>": {"base": 파일, "awaken": 파일, "cursed": 파일}}}}
                                               스킨 — 선택. 열쇠는 카드 자료의 skins. 각성·저주는 또 선택
   성별 칸(f/m)은 파일 이름의 _f 와 같다. 지금은 여성만 만들지만 남성을 더해도
   옛 파일의 뜻이 안 바뀌게 처음부터 나눠 둔다.

   폼은 없다. 무기당 액션 한 장이 곧 그 캐릭터다 — 포켓몬 판에서 세 벌 장갑과
   등 장비 때문에 그림이 며칠 막힌 것을 여기서는 처음부터 피한다. */
(function (root) {
  'use strict';

  /* 그림은 이 저장소에 없다. <이름>-img 저장소에 올리고 Pages 를 켜면 그쪽이
     1 GB 를 따로 받는다. 옮길 일이 생기면 이 한 줄만 고친다. */
  var BASE = 'https://polos0117.github.io/myth-atelier-img/img/';
  var DATA = 'data/img.json';

  /* encodeURIComponent 는 작은따옴표를 그대로 둔다.
     onerror="...src='<여기>'" 처럼 속성 안에 넣을 때 깨지므로 같이 막는다 */
  function enc(f) { return encodeURIComponent(f).replace(/'/g, '%27'); }
  function imgURL(f) { return BASE + enc(f); }
  function thumbURL(f) { return BASE + 'thumb/' + enc(f); }

  /* 목록·갤러리에 쓰는 <img>. 썸네일을 먼저 걸고, 아직 없으면 원본으로 되돌아간다 */
  function thumbTag(f, attr) {
    return '<img loading="lazy" src="' + thumbURL(f) + '" alt=""' +
      (attr ? ' ' + attr : '') +
      ' onerror="this.onerror=null;this.src=\'' + imgURL(f) + '\'">';
  }

  function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }

  /* 한 몫에서 일상컷 목록 */
  function cuts(bucket, slot, v) {
    var box = bucket && bucket[slot];
    if (!box) return [];
    if (isArr(box)) return v === 'f' ? box : [];
    return box[v] || [];
  }
  function cutCount(bucket, slot) {
    var box = bucket && bucket[slot], n = 0, g;
    if (!box) return 0;
    if (isArr(box)) return box.length;
    for (g in box) n += box[g].length;
    return n;
  }

  function hasPic(b) { return !!(b && (b.m || b.f)); }
  /* 각성 그림. {"f": …} 꼴이라 성별을 같이 본다 */
  function awakenOf(bucket, v) {
    var a = bucket && bucket.awaken;
    return (a && a[v || 'f']) || null;
  }
  function cursedOf(bucket, v) {
    var a = bucket && bucket.cursed;
    return (a && a[v || 'f']) || null;
  }

  function styleMap(entry) { return (entry && entry.byStyle) || {}; }
  function styleKeys(entry) {
    var bs = styleMap(entry), out = [], k;
    for (k in bs) out.push(k);
    return out;
  }

  /* 한 몫이 내놓는 그림 전부 — 액션 → 각성 → 일상 차례 */
  function shotsOf(bucket, v) {
    if (!bucket) return [];
    var a = awakenOf(bucket, v), c = cursedOf(bucket, v);
    var sk = skinsOf(bucket, v), skins = [], key, st;
    for (key in sk) for (st in sk[key]) skins.push(sk[key][st]);
    return (bucket[v] ? [bucket[v]] : []).concat(a ? [a] : [], c ? [c] : [], cuts(bucket, 'casual', v), cuts(bucket, 'extra', v), skins);
  }

  /* 한 카드가 가진 그림 전부 (모든 화풍 · 남녀) */
  function allShotsOf(entry) {
    if (!entry) return [];
    var bs = styleMap(entry), out = [], k, i;
    function add(list) {
      for (i = 0; i < list.length; i++) if (out.indexOf(list[i]) < 0) out.push(list[i]);
    }
    for (k in bs) { add(shotsOf(bs[k], 'f')); add(shotsOf(bs[k], 'm')); }
    return out;
  }

  /* 카드 그림 한 장. 원하는 화풍이 있으면 그쪽을 먼저, 없으면 아무 화풍이나 */
  function portraitOf(entry, v, preferStyle) {
    if (!entry) return null;
    var bs = styleMap(entry), k;
    v = v || 'f';
    if (preferStyle && bs[preferStyle] && bs[preferStyle][v]) return bs[preferStyle][v];
    for (k in bs) if (bs[k][v]) return bs[k][v];
    return null;
  }
  /* 상태에 맞는 그림. 저주가 각성보다 앞선다(대가는 권능을 덮는다). 없으면 한 단계 아래로 —
     각성·저주는 선택이라 없는 것이 정상이다 */
  function coverOf(entry, v, preferStyle, star, cursed) {
    if (!entry) return null;
    var bs = styleMap(entry), k, a;
    v = v || 'f';
    if (cursed) {
      if (preferStyle && bs[preferStyle] && (a = cursedOf(bs[preferStyle], v))) return a;
      for (k in bs) if ((a = cursedOf(bs[k], v))) return a;
    }
    if (star >= 3) {
      if (preferStyle && bs[preferStyle] && (a = awakenOf(bs[preferStyle], v))) return a;
      for (k in bs) if ((a = awakenOf(bs[k], v))) return a;
    }
    return portraitOf(entry, v, preferStyle);
  }

  /* ── 스킨 — 정식 모습 위에 입히는 치장. 기본 한 장이 있어야 스킨이고, 각성·저주 그림이 없으면 화면이 효과로 덮는다 ── */
  function skinsOf(bucket, v) { var b = bucket && bucket.skin; return (b && b[v || 'f']) || {}; }
  /* 카드가 가진 스킨 {열쇠: {base, awaken, cursed}}. 화풍을 가리지 않는다 — 기본이 있는 첫 화풍의 것 */
  function skinSets(entry, v) {
    var bs = styleMap(entry), out = {}, k, key, box;
    for (k in bs) { box = skinsOf(bs[k], v); for (key in box) if (!out[key] && box[key].base) out[key] = box[key]; }
    return out;
  }
  function skinFiles(entry, v) {
    var sets = skinSets(entry, v), out = {}, key;
    for (key in sets) out[key] = sets[key].base;
    return out;
  }
  /* 고른 스킨 — 카드 이름 → 열쇠. 도감에서 고르고 오토 배틀·던전이 읽는다. 이 브라우저에만 남는다 */
  var SKIN_STORE = 'myth_skin_v1';
  function skinPicks() { try { return JSON.parse(localStorage.getItem(SKIN_STORE)) || {}; } catch (e) { return {}; } }
  function skinPick(name) { return skinPicks()[name] || null; }
  function setSkinPick(name, key) {
    var p = skinPicks();
    if (key) p[name] = key; else delete p[name];
    try { localStorage.setItem(SKIN_STORE, JSON.stringify(p)); } catch (e) {}
  }
  /* 판에 올릴 그림 — 고른 스킨이 있으면 {file, skin: 열쇠, fx}, 없으면 상태 그림 {file, skin: null}.
     fx 는 상태 그림이 없어 기본 스킨 위에 효과를 덮어야 할 때 참이다. 저주가 각성보다 앞선다 */
  function dressOf(entry, name, v, star, cursed) {
    var key = skinPick(name), set = key && skinSets(entry, v)[key], want;
    if (set) {
      want = cursed ? 'cursed' : star >= 3 ? 'awaken' : null;
      if (want && set[want]) return { file: set[want], skin: key, fx: false };
      return { file: set.base, skin: key, fx: !!want };
    }
    return { file: coverOf(entry, v, undefined, star, cursed), skin: null, fx: false };
  }

  /* ── 신전 — 메인 화면의 신전에 도는 무기. 도감에서 모시고 내린다. 비어 있으면 메인이 무작위로 고른다 ── */
  var HALL_STORE = 'myth_hall_v1', HALL_MAX = 12;
  function hallPicks() {
    try { var j = JSON.parse(localStorage.getItem(HALL_STORE)); return Array.isArray(j) ? j.slice(0, HALL_MAX) : []; } catch (e) { return []; }
  }
  function setHallPicks(list) { try { localStorage.setItem(HALL_STORE, JSON.stringify((list || []).slice(0, HALL_MAX))); } catch (e) {} }
  /* 모시기·내리기. 찼으면 {ok:false, why:'full'} */
  function toggleHall(name) {
    var p = hallPicks(), i = p.indexOf(name);
    if (i >= 0) { p.splice(i, 1); setHallPicks(p); return { ok: true, on: false }; }
    if (p.length >= HALL_MAX) return { ok: false, why: 'full' };
    p.push(name); setHallPicks(p); return { ok: true, on: true };
  }
  /* 신전에 걸 세 장 — 입은 스킨이 있으면 스킨의 것. 각성·저주가 없으면 null(기본과 같은 그림을 두 번 걸지 않는다) */
  function hallShotsOf(entry, name) {
    var b = dressOf(entry, name, 'f', 1, false), a = dressOf(entry, name, 'f', 3, false), c = dressOf(entry, name, 'f', 1, true);
    return { file: b.file, skin: b.skin, awaken: a.file && a.file !== b.file && !a.fx ? a.file : null, cursed: c.file && c.file !== b.file && !c.fx ? c.file : null };
  }

  /* img.json 을 읽는다. GitHub API 는 쓰지 않는다 — contents API 는 1,000개
     상한과 비로그인 시간당 60회 제한이 있다. 이 파일은 등록 자동화가 갱신한다 */
  function load(url) {
    return fetch(url || DATA, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('img.json — ' + r.status);
      return r.json();
    }).then(function (j) { return (j && j.img) || {}; });
  }

  root.AtelierImg = {
    BASE: BASE, DATA: DATA,
    imgURL: imgURL, thumbURL: thumbURL, thumbTag: thumbTag,
    cuts: cuts, cutCount: cutCount, hasPic: hasPic, awakenOf: awakenOf, cursedOf: cursedOf,
    styleMap: styleMap, styleKeys: styleKeys,
    shotsOf: shotsOf, allShotsOf: allShotsOf, portraitOf: portraitOf, coverOf: coverOf,
    HALL_MAX: HALL_MAX, hallPicks: hallPicks, setHallPicks: setHallPicks, toggleHall: toggleHall, hallShotsOf: hallShotsOf,
    skinsOf: skinsOf, skinSets: skinSets, skinFiles: skinFiles, skinPick: skinPick, setSkinPick: setSkinPick, dressOf: dressOf,
    load: load
  };
})(window);
