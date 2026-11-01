/* 일상컷 장면 축의 랜덤 — 앞 생성기(pkm-atelier)의 prompt-random.js 를 옮겼다.
   장면은 트리 차례로 내려간다(lib/casual-tree.js, 2026-10-29 game-atelier 에서 옮김): 시대 → 장소 → 하는 일 → 의상 계열 → 옷 → 프레이밍·렌즈 → 자세·방향 → 표정·세부 축.
   앞 칸은 그대로 두고 뒤 칸만 그 안에서 뽑는다 — 한 칸을 뽑으면 그 뒤에서 맞지 않게 된 칸을 남은 것 중에서 다시 뽑는다. 잠근 칸은 안 바꾼다.
   난수는 밖에서 받는다(검사가 고정값을 준다). ctx = {tree, tree2, card}
   버전2 장면(treeV 2, lib/casual-tree-v2.js — 2026-11-01 book 의 같은 파일에서): 칸 차례는 버전2 모듈, 한 칸을 뽑으면 set 이 뒤 칸을 고친다.
   다 뽑기는 버전2 random(몸 쪽은 쓸 수 있는 자세 추천 하나 — 잠근 칸이 있으면 칸마다) 뒤에 표정 · 세부 축 */
(function (root) {
  'use strict';
  function spec() { return root.AtelierSpec; }
  function tree() { return root.AtelierCasualTree; }
  var concrete = function (values) { return values.filter(function (v) { return v && v !== 'AUTO' && v !== '__custom__' && v.indexOf('auto_') !== 0; }); };
  var keys = function (rows) { return concrete(rows.map(function (r) { return r[0]; })); };
  var CASUAL = ['era', 'place', 'act', 'ofam', 'item', 'frame', 'lens', 'pose', 'orient', 'expr'];
  function C2() { return root.AtelierCasualTreeV2; }
  var CASUAL_V2 = ['era', 'place', 'weather', 'ofam', 'item', 'posture', 'support', 'frame', 'body', 'head', 'camera', 'right', 'left', 'use', 'legs', 'gaze', 'expr'];
  var TREE_V2 = CASUAL_V2.filter(function (k) { return k !== 'expr'; });
  function isV2(scene, ctx) { return !!(scene && scene.treeV === 2 && ctx && ctx.tree2 && C2()); }
  function t2(ctx) { return C2().make(ctx.tree2, ctx.tree); }
  /* 등이 카메라 쪽이고 고개를 안 돌리면 얼굴이 안 보여 표정을 고르지 않는다 */
  function faceHidden(t, scene) {
    var b = t.v2.body.find(function (r) { return r.key === scene.body; }) || {}, h = t.v2.head.find(function (r) { return r.key === scene.head; }) || {};
    return !!b.face_hidden && !h.look_back;
  }

  function value(scene, key) {
    var p = key.split('.');
    return p[1] ? (scene[p[0]] || {})[p[1]] : scene[key];
  }
  /* 돌릴 수 있는 칸과 그 후보 — 트리 차례대로 */
  function fields(scene, ctx) {
    var S = spec(), CT = tree(), out = {};
    ctx = ctx || {};
    if (!ctx.tree) return out;
    if (isV2(scene, ctx)) {
      var t = t2(ctx), C = C2();
      CASUAL_V2.forEach(function (k) {
        if (k === 'expr') out.expr = faceHidden(t, scene) ? [] : keys(S.CASUAL_EXPRESSIONS);
        else if (k === 'use') out.use = C.propSides(scene) ? C.choices(t, scene, 'use', ctx.card) : [];
        else if (k === 'legs') out.legs = (C.frame(t, scene.frame) || {}).legs ? C.choices(t, scene, 'legs', ctx.card) : [];
        else out[k] = C.choices(t, scene, k, ctx.card);
      });
      S.CASUAL_AXES_V2.forEach(function (k) { out['axes.' + k] = concrete(S.CASUAL_AXIS_OPTIONS[k]); });
      return out;
    }
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
    var assign = function (k, v) { var p = k.split('.'); if (p[1]) next[p[0]][p[1]] = v; else next[k] = v; };
    if (isV2(next, ctx)) {
      var t = t2(ctx), C = C2(), locked = Object.keys(next.locks).filter(function (k) { return next.locks[k]; });
      var axes = next.axes, locks = next.locks;
      if (!key) {
        next = C.random(t, next, ctx.card, rng, locked); next.axes = axes; next.locks = locks;
        Object.keys(fields(next, ctx)).forEach(function (k) {
          if (TREE_V2.indexOf(k) < 0 && canRandomize(next, k, ctx)) assign(k, pickOf(fields(next, ctx)[k].filter(function (v) { return v !== value(next, k); })));
        });
        return next;
      }
      if (!canRandomize(next, key, ctx)) return next;
      var options = fields(next, ctx)[key].filter(function (v) { return v !== value(next, key); });
      if (TREE_V2.indexOf(key) < 0) { assign(key, pickOf(options)); return next; }
      var keep = TREE_V2.filter(function (f) { return f !== key && next.locks[f] && next[f]; });
      while (options.length) {
        var v = options.splice(Math.min(options.length - 1, Math.max(0, Math.floor(rng() * options.length))), 1)[0];
        var cand = C.set(t, next, key, v, ctx.card, pickOf);
        if (keep.every(function (f) { return cand[f] === next[f]; })) { cand.axes = axes; cand.locks = locks; return cand; }
      }
      return next;
    }
    var list = key ? [key] : Object.keys(fields(next, ctx));
    list.forEach(function (k) {
      if (!canRandomize(next, k, ctx)) return;
      var cur = value(next, k), left = fields(next, ctx)[k].filter(function (v) { return v !== cur; });
      /* 잠근 칸이 살아남는 값만(시대를 뽑았는데 잠근 장소가 그 시대에 없으면 다른 시대, pkm 2026-10-29). 남는 값이 없으면 이 칸은 그대로 */
      var held = CASUAL.filter(function (f) { return f !== k && next.locks[f] && next[f]; });
      while (left.length) {
        var v = left.splice(Math.min(left.length - 1, Math.max(0, Math.floor(rng() * left.length))), 1)[0];
        var cand = JSON.parse(JSON.stringify(next)), p = k.split('.');
        if (p[1]) cand[p[0]][p[1]] = v; else cand[k] = v;
        if (CASUAL.indexOf(k) >= 0 && CASUAL.indexOf(k) < CASUAL.indexOf('frame')) cand.preset = '';
        if (ctx && ctx.tree) cand = CT.repair(ctx.tree, cand, ctx.card, S.CLOSE_FRAMES, pickOf);
        if (held.every(function (f) { return cand[f] === next[f]; })) { next = cand; break; }
      }
    });
    return next;
  }
  var api = { fields: fields, value: value, canRandomize: canRandomize, randomize: randomize, CASUAL: CASUAL, CASUAL_V2: CASUAL_V2, isV2: isV2 };
  root.AtelierSceneRandom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
