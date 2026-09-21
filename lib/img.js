/* 그림 자료 공통 계층 — 도감·오토 배틀·생성기가 같이 쓴다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierImg 하나만 붙인다.

   왜 모아 두는가: URL 규칙(원본/썸네일)과 img.json 읽기를 페이지마다 따로
   두면 같은 버그를 여러 번 고친다(앞선 저장소에서 실제로 그랬다).

   img.json 구조:
     {"img": {"<카드>": {"byStyle": {"<화풍>": <몫>}}}}
     <몫> = {"f": "파일",                      액션 한 장(카드 그림)
             "awaken": {"f": "파일"},           각성 한 장(3성일 때) — 선택
             "casual": {"f": ["파일", …]}}      일상컷 — 선택
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

  function styleMap(entry) { return (entry && entry.byStyle) || {}; }
  function styleKeys(entry) {
    var bs = styleMap(entry), out = [], k;
    for (k in bs) out.push(k);
    return out;
  }

  /* 한 몫이 내놓는 그림 전부 — 액션 → 각성 → 일상 차례 */
  function shotsOf(bucket, v) {
    if (!bucket) return [];
    var a = awakenOf(bucket, v);
    return (bucket[v] ? [bucket[v]] : []).concat(a ? [a] : [], cuts(bucket, 'casual', v));
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
  /* 성이 오르면 각성 그림이 있을 때만 그것으로 바꾼다. 없으면 액션 그대로 —
     각성은 선택이라 없는 것이 정상이다 */
  function coverOf(entry, v, preferStyle, star) {
    if (!entry) return null;
    var bs = styleMap(entry), k, a;
    v = v || 'f';
    if (star >= 3) {
      if (preferStyle && bs[preferStyle] && (a = awakenOf(bs[preferStyle], v))) return a;
      for (k in bs) if ((a = awakenOf(bs[k], v))) return a;
    }
    return portraitOf(entry, v, preferStyle);
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
    cuts: cuts, cutCount: cutCount, hasPic: hasPic, awakenOf: awakenOf,
    styleMap: styleMap, styleKeys: styleKeys,
    shotsOf: shotsOf, allShotsOf: allShotsOf, portraitOf: portraitOf, coverOf: coverOf,
    load: load
  };
})(window);
