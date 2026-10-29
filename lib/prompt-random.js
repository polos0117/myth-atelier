/* 일상컷 장면 축의 랜덤 — 앞 생성기(pkm-atelier)의 prompt-random.js 를 옮겼다.
   장면은 트리 차례로 내려간다(lib/casual-tree.js, 2026-10-29 game-atelier 에서 옮김): 시대 → 장소 → 하는 일 → 의상 계열 → 옷 → 프레이밍·렌즈 → 자세·방향 → 표정·세부 축.
   앞 칸은 그대로 두고 뒤 칸만 그 안에서 뽑는다 — 한 칸을 뽑으면 그 뒤에서 맞지 않게 된 칸을 남은 것 중에서 다시 뽑는다. 잠근 칸은 안 바꾼다.
   난수는 밖에서 받는다(검사가 고정값을 준다). ctx = {tree, card} */
(function (root) {
  'use strict';
  function spec() { return root.AtelierSpec; }
  function tree() { return root.AtelierCasualTree; }
  var concrete = function (values) { return values.filter(function (v) { return v && v !== 'AUTO' && v !== '__custom__' && v.indexOf('auto_') !== 0; }); };
  var keys = function (rows) { return concrete(rows.map(function (r) { return r[0]; })); };
  var CASUAL = ['era', 'place', 'act', 'ofam', 'item', 'frame', 'lens', 'pose', 'orient', 'expr'];

  function value(scene, key) {
    var p = key.split('.');
    return p[1] ? (scene[p[0]] || {})[p[1]] : scene[key];
  }
  /* 돌릴 수 있는 칸과 그 후보 — 트리 차례대로 */
  function fields(scene, ctx) {
    var S = spec(), CT = tree(), out = {};
    ctx = ctx || {};
    if (!ctx.tree) return out;
    CASUAL.forEach(function (k) {
      if (k === 'frame') out.frame = keys(S.CASUAL_FRAMES).filter(function (f) { return CT.frameOk(ctx.tree, scene.act, f); });
      else if (k === 'lens') out.lens = keys(S.CASUAL_LENSES).filter(function (l) { return CT.lensOk(ctx.tree, scene.frame, l); });
      else if (k === 'expr') out.expr = CT.exprOk(ctx.tree, scene) ? keys(S.CASUAL_EXPRESSIONS) : [];
      else out[k] = CT.choices(ctx.tree, scene, k, ctx.card, S.CLOSE_FRAMES);
    });
    S.CASUAL_AXES.forEach(function (k) { out['axes.' + k] = concrete(S.CASUAL_AXIS_OPTIONS[k]); });
    return out;
  }
  function canRandomize(scene, key, ctx) {
    var locks = scene.locks || {};
    if (locks[key]) return false;
    var cur = value(scene, key);
    return (fields(scene, ctx)[key] || []).some(function (v) { return v !== cur; });
  }
  function randomize(scene, key, rng, ctx) {
    rng = rng || Math.random;
    var CT = tree(), S = spec(), next = JSON.parse(JSON.stringify(scene));
    next.axes = next.axes || {}; next.locks = next.locks || {};
    var pickOf = function (list) { return list[Math.min(list.length - 1, Math.max(0, Math.floor(rng() * list.length)))]; };
    var list = key ? [key] : Object.keys(fields(next, ctx));
    list.forEach(function (k) {
      if (!canRandomize(next, k, ctx)) return;
      var cur = value(next, k), options = fields(next, ctx)[k].filter(function (v) { return v !== cur; });
      var p = k.split('.');
      if (p[1]) next[p[0]][p[1]] = pickOf(options); else next[k] = pickOf(options);
      if (CASUAL.indexOf(k) >= 0 && CASUAL.indexOf(k) < CASUAL.indexOf('frame')) next.preset = '';
      if (ctx && ctx.tree) next = CT.repair(ctx.tree, next, ctx.card, S.CLOSE_FRAMES, pickOf);
    });
    return next;
  }
  var api = { fields: fields, value: value, canRandomize: canRandomize, randomize: randomize, CASUAL: CASUAL };
  root.AtelierSceneRandom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
