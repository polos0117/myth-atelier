/* 일상컷 트리 — data/casual-tree.json 을 읽어 단계마다 고를 수 있는 것을 거른다(2026-10-29).
   시대 → 장소 → 하는 일 → 의상 계열 → 옷 → 자세·방향 → 프레이밍·렌즈 → 표정·소품.
   프레이밍은 옷·자세·렌즈를, 하는 일은 프레이밍·자세·표정을, 방향은 표정을 거른다(묶음 계획기에만 있던 규칙을 옮겼다 — 화면에서도 같게).
   갈래·예시·자세가 서로 상관없이 뽑혀 부딪혔다(사용자 「중구난방」). 앞에서 고른 것이 뒤 선택지를 거르고,
   앞을 바꾸면 맞지 않게 된 뒤 칸은 고친다(repair). 화면(prompt-ui)·조립(prompt-game · book 은 prompt-book)·랜덤(prompt-random)이 같이 쓴다.
   game-atelier 가 원본, book·myth·pkm-atelier 는 같은 파일을 복사해 쓴다(트리 표 data/casual-tree.json 만 공방마다).
   검사기 tools/casual-tree.py 와 같은 규칙이다 — 하나를 고치면 다른 쪽도. 브라우저와 node 둘 다에서 돈다. */
(function (root) {
  'use strict';
  var REQUIRED_FIELDS = ['era', 'place', 'act', 'ofam'];
  /* 장면 칸 차례 — 랜덤도 이 차례로 내려간다 */
  var ORDER = ['era', 'place', 'act', 'ofam', 'item', 'pose', 'orient'];

  function by(list, key) { for (var i = 0; i < (list || []).length; i++) if (list[i].key === key) return list[i]; return null; }
  function era(tree, k) { return by(tree.eras, k); }
  function place(tree, k) { return by(tree.places, k); }
  function act(tree, k) { return by(tree.activities, k); }
  function family(tree, k) { return by(tree.outfits, k); }
  function group(tree, k) { return by(tree.groups, k); }
  function item(tree, fam, k) { var f = family(tree, fam); return f ? by(f.items, k) : null; }

  /* 같은 표로 같은 것을 여러 번 묻는다(화면은 그릴 때마다, 묶음 계획기는 수천 번) — 표마다 한 번 센 것을 기억한다 */
  var MEMO = typeof WeakMap === 'function' ? new WeakMap() : null;
  function memo(tree, kind, key, make) {
    if (!MEMO) return make();
    var m = MEMO.get(tree); if (!m) { m = {}; MEMO.set(tree, m); }
    var box = m[kind] || (m[kind] = {});
    return Object.prototype.hasOwnProperty.call(box, key) ? box[key] : (box[key] = make());
  }
  /* 하는 일의 places — @묶음 은 그 묶음의 모든 장소, !장소 는 거기서 뺀다(묶음 안에서 맞지 않는 곳 — 사진 부스에서 거닐기) */
  function actPlaces(tree, a) { return memo(tree, 'actPlaces', a.key, function () { return actPlacesRaw(tree, a); }); }
  function actPlacesRaw(tree, a) {
    var out = [], drop = [];
    (a.places || []).forEach(function (k) {
      if (k.charAt(0) === '@') tree.places.forEach(function (p) { if (p.group === k.slice(1)) out.push(p.key); });
      else if (k.charAt(0) === '!') drop.push(k.slice(1));
      else out.push(k);
    });
    return out.filter(function (k) { return drop.indexOf(k) < 0; });
  }
  /* 출시 연도 — 받은 연도가 없으면 시대(era)의 대략(prompt-spec ERA_PERIOD 와 같은 해). 없으면 「그 해부터 있는 곳」 을 못 걸렀다(심시티 1989 에 방송 책상 2005) */
  var ERA_YEAR = { arcade: 1981, '8bit': 1985, '16bit': 1991, early_3d: 1998, hd: 2008, modern: 2012 };
  /* pkm 은 카드의 세대(gen) → 트리 표 gen_years 의 첫 등장 해 */
  function year(tree, game) {
    var y = game && game.facts && game.facts.year;
    if (typeof y === 'number') return y;
    var g = game && game.gen != null && (tree.gen_years || {})[String(game.gen)];
    return g || (game && ERA_YEAR[game.era]) || null;
  }

  /* 단계마다 고를 수 있는 것 */
  function eras(tree) { return tree.eras.slice(); }
  function places(tree, eraKey, game) {
    var y = eraKey === 'release' ? year(tree, game) : null;
    return memo(tree, 'places', eraKey + '|' + y, function () {
      return tree.places.filter(function (p) { return p.eras.indexOf(eraKey) >= 0 && !(y && p.since && p.since > y) && acts(tree, eraKey, p.key).length; });
    });
  }
  function outfitFamilies(tree, eraKey, placeKey, actKey) {
    return memo(tree, 'fams', eraKey + '|' + placeKey + '|' + actKey, function () { return familiesRaw(tree, eraKey, placeKey, actKey); });
  }
  function familiesRaw(tree, eraKey, placeKey, actKey) {
    var e = era(tree, eraKey), p = place(tree, placeKey), a = act(tree, actKey);
    if (!e || !p || !a) return [];
    return tree.outfits.filter(function (o) {
      return e.outfits.indexOf(o.key) >= 0 && p.outfits.indexOf(o.key) >= 0 && (!a.outfits || a.outfits.indexOf(o.key) >= 0);
    });
  }
  function acts(tree, eraKey, placeKey) {
    return memo(tree, 'acts', eraKey + '|' + placeKey, function () { return actsRaw(tree, eraKey, placeKey); });
  }
  function actsRaw(tree, eraKey, placeKey) {
    return tree.activities.filter(function (a) {
      if (actPlaces(tree, a).indexOf(placeKey) < 0) return false;
      var e = era(tree, eraKey), p = place(tree, placeKey);
      return e && p && tree.outfits.some(function (o) {
        return e.outfits.indexOf(o.key) >= 0 && p.outfits.indexOf(o.key) >= 0 && (!a.outfits || a.outfits.indexOf(o.key) >= 0);
      });
    });
  }
  /* 프레이밍 규칙(frame_rules) — 그 컷에서 보이는 몸 부위, 광각, 허리 아래로 알아보는 옷. 표에 없는 프레이밍은 다 된다 */
  function frameRule(tree, frame) { return (tree.frame_rules || {})[frame] || {}; }
  /* 옷 — 가슴 위·클로즈업엔 알아볼 데가 허리 아래인 옷(low)을 뺀다. 크롭 안에서 못 알아봐 컷을 넓혔다(GTA V 일상1 허리 컷아웃 수영복) */
  function items(tree, famKey, frame) {
    var f = family(tree, famKey); if (!f) return [];
    return frameRule(tree, frame).low === false ? f.items.filter(function (i) { return !i.low; }) : f.items.slice();
  }
  function poseFamily(tree, actKey) { var a = act(tree, actKey); return a ? tree.families[a.family] : null; }
  /* 자세 — 하는 일의 자세 계열 안에서, 다시 셋으로 거른다(자세 표 pose_meta):
     앉는 자리가 하는 일과 맞고(식탁 만찬에 방석 책상다리 X), 손을 쓰는 자세는 하는 일이 손을 비워 둘 때만(샴페인 잔 들기에 두 손을 머리에 X),
     그 프레이밍에서 보이는 부위의 자세만(클로즈업에 성큼 걷기 X) */
  function poses(tree, actKey, frame) {
    var f = poseFamily(tree, actKey), a = act(tree, actKey);
    if (!f) return [];
    var meta = tree.pose_meta || {}, zones = frameRule(tree, frame).zones;
    return f.poses.filter(function (k) {
      var m = meta[k] || {};
      if (m.companion && !a.companion) return false;   /* 동료를 전제한 자세(쓰다듬기·간식 내밀기)는 동료가 있는 하는 일에서만(pkm) */
      if (m.seat && a.seat && a.seat.indexOf(m.seat) < 0) return false;
      if (m.hands && a.hands !== 'free') return false;
      return !zones || zones.indexOf(m.zone || 'legs') >= 0;
    });
  }
  /* 프레이밍 — 하는 일이 안 되는 프레이밍(not_frames)을 뺀다. 수영·탕에 몸 담그기는 몸이 물에 잠겨 전신·환경 컷의 「머리·손·발이 다 안에」 와
     부딪혔다 — 헤엄 대신 물속을 걸었다(리그 오브 레전드 일상4) */
  /* 안 쓰는 값(banned — pkm: 손·소품 디테일, 등 돌린 방향)은 트리 표마다. 없으면 다 된다.
     프레이밍 규칙의 not_required 는 필수 갈래 컷에 안 쓴다(pkm 얼굴 클로즈업 — 옷이 안 남는다). scene 을 주면 그것까지 본다 */
  function banned(tree, kind) { return ((tree.banned || {})[kind]) || []; }
  function frameOk(tree, actKey, frame, scene) {
    var a = act(tree, actKey);
    if (!frame) return true;
    if (banned(tree, 'frames').indexOf(frame) >= 0) return false;
    if (scene && frameRule(tree, frame).not_required && isRequired(tree, scene)) return false;
    return !a || (a.not_frames || []).indexOf(frame) < 0;
  }
  /* 렌즈 — 가까운 컷·3/4 컷엔 광각을 안 붙인다(24·35mm 풀이의 「넉넉한 거리·배경과 균형」 이 컷을 넓혔다) */
  function lensOk(tree, frame, lens) { return !lens || frameRule(tree, frame).wide !== false || (tree.wide_lenses || []).indexOf(lens) < 0; }
  /* 표정 — 하는 일이 표정을 정하거나(웃기·노래·미소 …) 등을 보이면 고르지 않는다(등 돌린 컷에 표정이 붙으면 얼굴을 보이려 고개를 비튼다) */
  function exprOk(tree, scene) {
    var a = act(tree, scene.act);
    return !(a && a.mood) && (tree.back_orients || []).indexOf(scene.orient) < 0;
  }
  /* 가까운 옆얼굴(profile_close)은 가까운 프레이밍에서만. 가슴 위·클로즈업엔 등 쪽 방향이 없다 — 「등과 옆구리 한쪽」 을 보이려 컷을 넓혔다(리그 오브 레전드 일상3 두 번) */
  /* 얼굴이 보여야 하는 자세(faces — 손가락으로 쉿)엔 등 쪽 방향이 없다 */
  var BACK_SIDE = ['back', 'back_to_camera', 'walking_away', 'rear_3q', 'three_quarter_back'];
  function orients(tree, actKey, frame, closeFrames, pose) {
    var f = poseFamily(tree, actKey);
    if (!f) return [];
    var close = (closeFrames || []).indexOf(frame) >= 0, no = (frameRule(tree, frame).no_orients || []).concat(banned(tree, 'orients'));
    var faces = pose && ((tree.pose_meta || {})[pose] || {}).faces;
    return f.orients.filter(function (o) { return (o !== 'profile_close' || close) && no.indexOf(o) < 0 && !(faces && BACK_SIDE.indexOf(o) >= 0); });
  }

  /* 칸 하나의 고를 거리(열쇠 목록) — 랜덤과 화면이 같이 쓴다 */
  function choices(tree, scene, key, game, closeFrames) {
    switch (key) {
      case 'era': return eras(tree).map(function (x) { return x.key; });
      case 'place': return places(tree, scene.era, game).map(function (x) { return x.key; });
      case 'act': return acts(tree, scene.era, scene.place).map(function (x) { return x.key; });
      case 'ofam': return outfitFamilies(tree, scene.era, scene.place, scene.act).map(function (x) { return x.key; });
      case 'item': return items(tree, scene.ofam, scene.frame).map(function (x) { return x.key; });
      case 'pose': return poses(tree, scene.act, scene.frame);
      case 'orient': return orients(tree, scene.act, scene.frame, closeFrames, scene.pose);
    }
    return [];
  }

  /* 앞 칸을 바꿨거나 저장값이 오래돼 맞지 않는 칸을 고친다. 꼭 있어야 하는 칸(시대·장소·하는 일·의상 계열)은
     남은 것 중 하나(pick — 기본은 첫째, 랜덤이면 무작위)로, 골라도 되는 칸(옷·자세·방향·렌즈·표정)은 비운다(자동) */
  /* 해방(허브 통합 생성기, 2026-10-29) — scene.unlocked 에 든 칸은 트리 밖 값이라도 고치지 않는다(🔓 로 고른 값, 기록에도 남는다).
     그 뒤 칸은 그 값을 기준으로 거른다. 칸 이름은 ORDER 와 frame·lens·expr */
  function unlocked(scene, k) { return !!(scene && scene[k] && (scene.unlocked || []).indexOf(k) >= 0); }
  function repair(tree, scene, game, closeFrames, pick) {
    var next = Object.assign({}, scene);
    pick = pick || function (list) { return list[0]; };
    if (!era(tree, next.era) && !unlocked(next, 'era')) next.era = 'now';
    ORDER.forEach(function (k) {
      if (unlocked(next, k)) return;
      var list = choices(tree, next, k, game, closeFrames);
      if (REQUIRED_FIELDS.indexOf(k) >= 0) { if (list.indexOf(next[k]) < 0) next[k] = list.length ? pick(list) : ''; }
      else if (next[k] && list.indexOf(next[k]) < 0) next[k] = '';
    });
    if (!unlocked(next, 'frame') && !frameOk(tree, next.act, next.frame, next)) { next.frame = ''; return repair(tree, next, game, closeFrames, pick); }
    if (!unlocked(next, 'lens') && !lensOk(tree, next.frame, next.lens)) next.lens = '';
    if (next.expr && !unlocked(next, 'expr') && !exprOk(tree, next)) next.expr = '';
    return next;
  }

  /* 왜 못 고르나 — 트리 밖 값의 까닭(허브의 해방 단추가 흐린 선택지 옆에 붙인다). 고를 수 있으면 null.
     { code, ... } — 말은 부르는 쪽 낱말 표가 쥔다(이 모듈엔 말이 없다).
     code: unknown(없는 열쇠) · era(그 시대에 없다) · year(그 해엔 없던 곳 — since·year) · noact(할 일이 없다) · place(그 장소에선 안 한다) ·
           outfit(입을 옷 계열이 없다) · act(그 하는 일엔 안 맞다) · close(가까운 컷에선 안 보인다) · banned(이 공방은 안 쓴다) ·
           required(필수 갈래 컷엔 안 쓴다) · wide(가까운 컷에 광각) · family(그 자세 계열에 없다) · companion(동료가 있어야) ·
           seat(앉는 자리가 다르다) · hands(손이 바쁘다) · zone(그 프레이밍에선 안 보인다) · profile(가까운 컷에서만) · frame(그 프레이밍엔 안 맞는 방향) ·
           faces(얼굴을 보여야 하는 자세) · mood(하는 일이 표정을 정한다) · back(등을 보인다) */
  function why(tree, scene, key, value, game, closeFrames) {
    var e = era(tree, scene.era), p = place(tree, scene.place), a = act(tree, scene.act), r;
    switch (key) {
      case 'era': return era(tree, value) ? null : { code: 'unknown' };
      case 'place': {
        var q = place(tree, value), y = scene.era === 'release' ? year(tree, game) : null;
        if (!q) return { code: 'unknown' };
        if (q.eras.indexOf(scene.era) < 0) return { code: 'era', eras: q.eras.slice() };
        if (y && q.since && q.since > y) return { code: 'year', since: q.since, year: y };
        return acts(tree, scene.era, value).length ? null : { code: 'noact' };
      }
      case 'act': {
        var b = act(tree, value);
        if (!b) return { code: 'unknown' };
        if (actPlaces(tree, b).indexOf(scene.place) < 0) return { code: 'place' };
        return acts(tree, scene.era, scene.place).indexOf(b) >= 0 ? null : { code: 'outfit' };
      }
      case 'ofam': {
        if (!family(tree, value)) return { code: 'unknown' };
        if (e && e.outfits.indexOf(value) < 0) return { code: 'era' };
        if (p && p.outfits.indexOf(value) < 0) return { code: 'place' };
        return a && a.outfits && a.outfits.indexOf(value) < 0 ? { code: 'act' } : null;
      }
      case 'item': {
        var it = item(tree, scene.ofam, value);
        if (!it) return { code: 'unknown' };
        return it.low && frameRule(tree, scene.frame).low === false ? { code: 'close' } : null;
      }
      case 'frame': {
        if (banned(tree, 'frames').indexOf(value) >= 0) return { code: 'banned' };
        if (a && (a.not_frames || []).indexOf(value) >= 0) return { code: 'act' };
        return frameRule(tree, value).not_required && isRequired(tree, scene) ? { code: 'required' } : null;
      }
      case 'lens': return lensOk(tree, scene.frame, value) ? null : { code: 'wide' };
      case 'pose': {
        var f = poseFamily(tree, scene.act), m = (tree.pose_meta || {})[value] || {}, zones = frameRule(tree, scene.frame).zones;
        if (!f || f.poses.indexOf(value) < 0) return { code: 'family' };
        if (m.companion && !(a && a.companion)) return { code: 'companion' };
        if (m.seat && a && a.seat && a.seat.indexOf(m.seat) < 0) return { code: 'seat' };
        if (m.hands && !(a && a.hands === 'free')) return { code: 'hands' };
        return zones && zones.indexOf(m.zone || 'legs') < 0 ? { code: 'zone' } : null;
      }
      case 'orient': {
        var g = poseFamily(tree, scene.act), close = (closeFrames || []).indexOf(scene.frame) >= 0;
        if (banned(tree, 'orients').indexOf(value) >= 0) return { code: 'banned' };
        if (!g || g.orients.indexOf(value) < 0) return { code: 'family' };
        if (value === 'profile_close' && !close) return { code: 'profile' };
        if ((frameRule(tree, scene.frame).no_orients || []).indexOf(value) >= 0) return { code: 'frame' };
        r = scene.pose && ((tree.pose_meta || {})[scene.pose] || {}).faces;
        return r && BACK_SIDE.indexOf(value) >= 0 ? { code: 'faces' } : null;
      }
      case 'expr': {
        if (a && a.mood) return { code: 'mood' };
        return (tree.back_orients || []).indexOf(scene.orient) >= 0 ? { code: 'back' } : null;
      }
    }
    return null;
  }

  function applyPath(scene, p) {
    var next = Object.assign({}, scene, { era: p.era, place: p.place, act: p.act, ofam: p.outfit, item: p.item || '' });
    return next;
  }
  function preset(tree, k) { return by(tree.presets, k); }
  function applyPreset(tree, scene, k) {
    var p = preset(tree, k);
    return p ? Object.assign(applyPath(scene, p), { preset: k }) : scene;
  }
  /* 예전 기록(갈래 cat · 예시 ex · 시대 '' | 'release'(게임) | 'book'(책)) → 새 길. 옛 칸은 지운다. 장소도 갈래도 없으면 기본 길(일상 갈래의 기본).
     예전 시대가 트리에도 있고 옮긴 장소가 그 시대를 받으면 그 시대로 */
  function fromLegacy(tree, scene) {
    if (!scene || scene.place) return scene;
    var L = tree.legacy || {}, v = L[scene.cat + '/' + (scene.ex || '')] || L[scene.cat + '/'] || L['everyday/'];
    var next = Object.assign({}, scene);
    if (v && v.preset) next = applyPreset(tree, next, v.preset);
    else if (v) next = applyPath(next, v);
    var was = scene.era, p = place(tree, next.place);
    if (was && was !== 'now' && era(tree, was) && p && p.eras.indexOf(was) >= 0) next.era = was;
    ['cat', 'ex', 'catCustom', 'exCustom'].forEach(function (k) { delete next[k]; });
    return next;
  }

  /* 필수 갈래 — 옷 계열이 란제리풍·수영복·역할극이거나, 그 세계 안(게임 in_game · 책 world)의 방·목욕·지붕·여관에서 홈웨어·란제리·목욕 차림·수영복 */
  function worldRule(tree) { var R = tree.required || {}; return R.world || R.in_game || {}; }
  function isRequired(tree, scene) {
    var R = tree.required || {};
    if ((R.outfits || []).indexOf(scene.ofam) >= 0) return true;
    var g = worldRule(tree);
    return scene.era === g.era && (g.places || []).indexOf(scene.place) >= 0 && (g.outfits || []).indexOf(scene.ofam) >= 0;
  }
  /* 동료 포켓몬이 같이 나오는 장소 묶음(pkm 파트너 돌봄) — 「한 명만」 줄 대신 동료 줄 */
  function companion(tree, placeKey) {
    var p = place(tree, placeKey), g = p && group(tree, p.group);
    return !!(g && g.companion);
  }
  function screens(tree, placeKey) {
    var p = place(tree, placeKey), g = p && group(tree, p.group);
    return !!(p && (p.screens || (g && g.screens)));
  }

  root.AtelierCasualTree = { ORDER: ORDER, era: era, place: place, act: act, family: family, group: group, item: item, preset: preset,
    actPlaces: actPlaces, eras: eras, places: places, acts: acts, outfitFamilies: outfitFamilies, items: items, poses: poses, orients: orients,
    poseFamily: poseFamily, frameRule: frameRule, frameOk: frameOk, lensOk: lensOk, exprOk: exprOk, choices: choices, repair: repair, applyPreset: applyPreset, fromLegacy: fromLegacy, isRequired: isRequired, worldRule: worldRule, screens: screens, companion: companion, banned: banned, year: year, why: why, unlocked: unlocked };
})(typeof window !== 'undefined' ? window : globalThis);
