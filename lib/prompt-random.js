/* 일상컷 장면 축의 랜덤 — 앞 생성기(pkm-atelier)의 prompt-random.js 를 옮겼다.
   갈래(cat)를 바꾸면 예시(ex)는 비운다: 잠긴 예시가 갈래에 안 맞게 되지 않게 갈래는 예시가 잠겨 있으면 못 돌린다.
   난수는 밖에서 받는다(검사가 고정값을 준다). */
(function (root) {
  'use strict';
  function spec() { return root.AtelierSpec; }
  var concrete = function (values) { return values.filter(function (v) { return v && v !== 'AUTO' && v !== '__custom__' && v.indexOf('auto_') !== 0; }); };
  var keys = function (rows) { return concrete(rows.map(function (r) { return r[0]; })); };

  function value(scene, key) {
    var p = key.split('.');
    return p[1] ? (scene[p[0]] || {})[p[1]] : scene[key];
  }
  /* 돌릴 수 있는 칸과 그 후보. 갈래 → 예시 차례가 뜻이 있다: 갈래를 먼저 고르고 예시를 그 안에서 */
  function fields(scene) {
    var S = spec(), out = {};
    out.cat = keys(S.CASUAL_CATS.filter(function (r) { return r[3] !== 'm'; }));
    out.ex = keys(S.CASUAL_EXAMPLES[scene.cat] || []);
    S.CASUAL_AXES.forEach(function (k) { out['axes.' + k] = concrete(S.CASUAL_AXIS_OPTIONS[k]); });
    out.pose = keys(S.CASUAL_POSES);
    out.orient = keys(S.CASUAL_ORIENTS);
    out.expr = keys(S.CASUAL_EXPRESSIONS);
    return out;
  }
  function canRandomize(scene, key) {
    var locks = scene.locks || {};
    if (locks[key]) return false;
    if (key === 'cat' && locks.ex) return false;
    var cur = value(scene, key);
    return (fields(scene)[key] || []).some(function (v) { return v !== cur; });
  }
  function randomize(scene, key, rng) {
    rng = rng || Math.random;
    var next = JSON.parse(JSON.stringify(scene));
    next.axes = next.axes || {}; next.locks = next.locks || {};
    var list = key ? [key] : Object.keys(fields(next));
    list.forEach(function (k) {
      if (!canRandomize(next, k)) return;
      var cur = value(next, k), options = fields(next)[k].filter(function (v) { return v !== cur; });
      var pick = options[Math.min(options.length - 1, Math.max(0, Math.floor(rng() * options.length)))];
      var p = k.split('.');
      if (p[1]) next[p[0]][p[1]] = pick; else next[k] = pick;
      if (k === 'cat') next.ex = '';
    });
    return next;
  }
  var api = { fields: fields, value: value, canRandomize: canRandomize, randomize: randomize };
  root.AtelierSceneRandom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
