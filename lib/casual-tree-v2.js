/* 일상컷 트리 버전2 — data/casual-tree-v2.json 을 읽어 칸마다 고를 수 있는 것을 거른다(2026-10-30, docs/CASUAL_TREE_V2.md).
   시대 → 장소 → 의상 계열 → 옷 → 몸 자세 → 받침 → 프레이밍 → 몸 방향 · 머리 방향 · 카메라 높이 → 오른손 → 왼손 → 소품 동작 → 다리 → 시선.
   시대 · 장소 · 의상 · 옷은 버전1 표(data/casual-tree.json)를 그대로 읽는다 — 하는 일과 장소의 받는 의상은 쓰지 않는다(의상은 시대만 거르고, 어색한 조합은 ⚠ 표시).
   몸 쪽은 장소의 받침(has) · 프레이밍이 보여 주는 부위 · 자세 계열 · 옷의 특징(주머니 · 끈 · 옷깃)이 거른다. 손 칸 둘은 늘 같이 본다 —
   두 손 자세 · 두 손 소품 동작은 다른 손 칸을 잠그고, 같은 데를 두 손이 쓰지 않는다. 오른손 · 왼손은 인물 본인 기준.
   앞 칸을 바꾸면 맞지 않게 된 뒤 칸은 고친다(repair) — 꼭 있어야 하는 칸은 남은 것 중 하나로, 골라도 되는 칸(옷 · 다리 · 시선)은 비운다.
   프레이밍을 넓혀 맞추지 않는다(문서 2절 약속 1): 손 · 다리가 안 보이는 컷이면 손 · 다리 칸을 고치지 프레이밍을 고치지 않는다.
   자세 추천은 칸만 채운다(지시문 문장 없음). 검사기 tools/casual-tree-v2.py 와 같은 규칙이다 — 하나를 고치면 다른 쪽도.
   lib/casual-tree.js(버전1) 뒤에 읽는다(출시 연도 · 아주 예전 기록 변환을 빌린다). 브라우저와 node 둘 다에서 돈다. */
(function (root) {
  'use strict';
  /* weather — 계절 · 날씨(고르지 않으면 AUTO, 사용자 2026-10-30) */
  var ORDER = ['era', 'place', 'weather', 'ofam', 'item', 'posture', 'support', 'frame', 'body', 'head', 'camera', 'right', 'left', 'use', 'legs', 'gaze'];
  /* 손 칸은 비워도 된다(AUTO — 그 손 줄을 싣지 않는다, 사용자 2026-10-30). 「자연스럽게」 는 손 표의 natural */
  var REQUIRED = ['era', 'place', 'ofam', 'posture', 'support', 'frame', 'body', 'head', 'camera'];
  var BODY = ['posture', 'support', 'frame', 'body', 'head', 'camera', 'right', 'left', 'legs', 'gaze'];
  var HANDS_OF = { hold: 'one', raise: 'one', both: 'both' };
  var V1_ONLY = ['act', 'pose', 'orient', 'lens', 'camera', 'preset', 'cat', 'ex', 'catCustom', 'exCustom'];

  function by(list, key) { for (var i = 0; i < (list || []).length; i++) if (list[i].key === key) return list[i]; return null; }
  function has(arr, x) { return (arr || []).indexOf(x) >= 0; }
  /* 두 표를 한 번에 — t = make(버전2 표, 버전1 표) */
  function make(v2, v1) { return { v2: v2, v1: v1 }; }

  var MEMO = typeof WeakMap === 'function' ? new WeakMap() : null;
  function memo(t, kind, key, fn) {
    if (!MEMO) return fn();
    var m = MEMO.get(t.v2); if (!m) { m = {}; MEMO.set(t.v2, m); }
    var box = m[kind] || (m[kind] = {});
    return Object.prototype.hasOwnProperty.call(box, key) ? box[key] : (box[key] = fn());
  }

  function era(t, k) { return by(t.v1.eras, k); }
  /* 장소 — 버전1 표의 장소 + 버전2 표의 새 장소(extra_places — 버전1 은 그대로 둔다) */
  function allPlaces(t) { return memo(t, 'allPlaces', '', function () { return t.v1.places.concat(t.v2.extra_places || []); }); }
  function place(t, k) { return by(allPlaces(t), k); }
  function family(t, k) { return by(t.v1.outfits, k); }
  function item(t, fam, k) { var f = family(t, fam); return f ? by(f.items, k) : null; }
  function posture(t, k) { return by(t.v2.postures, k); }
  function support(t, k) { return by(t.v2.supports, k); }
  function hand(t, k) { return by(t.v2.hands, k); }
  function leg(t, k) { return by(t.v2.legs, k); }
  function prop(t, k) { return by(t.v2.props, k); }
  function use(t, k) { return by(t.v2.prop_uses, k); }
  function preset(t, k) { return by(t.v2.presets, k); }
  function frame(t, k) { return k && k !== 'note' ? t.v2.frames[k] || null : null; }
  function lens(t, k) { return (t.v2.lens || {})[k] || ''; }
  function frameRule(t, k) { return (t.v1.frame_rules || {})[k] || {}; }
  function placeHas(t, k) { return t.v2.places[k] || []; }
  /* 공방마다 다른 규칙은 표의 칸으로(pkm 2026-10-30) — 표에 칸이 없으면 아무것도 안 거른다.
     banned: 안 쓰는 몸 방향 · 프레이밍(버전1 banned.frames 도) · companion: 동료 묶음(버전1 묶음의 companion)에서만 쓰는 손 · 소품 동작, 동료 묶음에서 안 쓰는 프레이밍(not_frames) */
  function bannedV2(t, kind) { return ((t.v2.banned || {})[kind] || []).concat(kind === 'frames' ? (t.v1.banned || {}).frames || [] : []); }
  function companionAt(t, placeKey) { var C = root.AtelierCasualTree; return !!(C && C.companion && C.companion(t.v1, placeKey)); }
  function isRequired(t, scene) { var C = root.AtelierCasualTree; return !!(C && C.isRequired && C.isRequired(t.v1, scene)); }
  /* 코스튬 필수 컷에 안 쓰는 프레이밍 — 버전1 표의 costume_required.not_frames(버전1 모듈 costumeNo) */
  function costumeNo(t, scene, frame) { var C = root.AtelierCasualTree; return !!(C && C.costumeNo && C.costumeNo(t.v1, scene, frame)); }

  /* needs 는 다, needs_any 는 하나 이상 — 장소의 받침으로 */
  function placeOk(row, hs) {
    var n = row.needs || [], a = row.needs_any || [];
    for (var i = 0; i < n.length; i++) if (!has(hs, n[i])) return false;
    return !a.length || a.some(function (x) { return has(hs, x); });
  }
  /* 장소 목록 — * 는 모든 장소, @묶음 은 그 묶음의 모든 장소, !장소 는 뺀다 */
  function expand(t, refs) {
    var out = [], drop = [];
    (refs || []).forEach(function (k) {
      if (k === '*') allPlaces(t).forEach(function (p) { out.push(p.key); });
      else if (k.charAt(0) === '@') allPlaces(t).forEach(function (p) { if (p.group === k.slice(1)) out.push(p.key); });
      else if (k.charAt(0) === '!') drop.push(k.slice(1));
      else out.push(k);
    });
    return out.filter(function (k, i) { return out.indexOf(k) === i && drop.indexOf(k) < 0; });
  }
  /* 그 장소 · 시대에 나오는 소품인가(휴대폰은 지금 현실만) */
  /* since — 출시 당시 시대면 그 해부터 있는 소품만(휴대용 게임기 1989) */
  function propAt(t, p, placeKey, eraKey, game) {
    if (!p || (p.eras && eraKey && !has(p.eras, eraKey))) return false;
    var y = eraKey === 'release' && p.since ? year(t, game) : null;
    if (y && p.since > y) return false;
    return has(memo(t, 'propPlaces', p.key, function () { return expand(t, p.places); }), placeKey);
  }
  /* 가까운 컷(버전1 frame_rules.no_orients 에 등 쪽) — 뒤쪽 몸 방향(far)을 받지 않는다 */
  function farBanned(t, f) { return has(frameRule(t, f).no_orients, 'back'); }
  /* 옷의 특징 — 계열 기본값 + 옷마다 더하기 · 빼기. 옷을 안 골랐으면 계열 기본값 */
  function features(t, ofam, itemKey) {
    var F = t.v2.outfit_features || {}, out = ((F.defaults || {})[ofam] || []).slice();
    if (itemKey) {
      ((F.add || {})[itemKey] || []).forEach(function (x) { if (!has(out, x)) out.push(x); });
      out = out.filter(function (x) { return !has((F.remove || {})[itemKey], x); });
    }
    return out;
  }
  /* 장면의 옷 특징 — 「옷 직접 쓰기」 글이 있으면 고른 옷의 특징은 쓰지 않는다(글이 옷을 바꾼다, 검토 2026-10-30:
     청바지 + 「주머니 없는 드레스」 글 + 주머니에 손). 그때는 사람이 표시한 특징(ofeat)만 */
  /* glasses — 옷이 아니라 장면의 「안경」 표시(ofeat). 안경을 쓴 장면에서만 「안경 고쳐 쓰기」 */
  var FEATURES = ['pocket', 'strap', 'collar', 'glasses'];
  function sceneFeatures(t, scene) {
    if (String(scene.outfit || '').trim()) return (scene.ofeat || []).filter(function (x) { return has(FEATURES, x); });
    return features(t, scene.ofam, scene.item).concat(has(scene.ofeat, 'glasses') ? ['glasses'] : []);
  }
  /* 알아볼 거리를 손에 들 수 있나 — 설계표 signature_hold(들 수 있는 것의 번호). 장소 · 풍경은 배경에 남는다(검토 2026-10-30:
     데이브 더 다이브 「블루 홀의 깊고 푸른 바다」 를 가슴 높이에 들었다). 고른 알아볼 거리가 장소면 소품으로 쓰지 않는다. 게임 없이(검사기 견주기) 부르면 된다고 본다 */
  function signatureHold(game, scene) {
    if (!game) return true;
    var hold = game.signature_hold || [], pr = String(scene.prop || '');
    if (!hold.length || pr === 'none') return false;
    return !/^\d+$/.test(pr) || has(hold, Number(pr));
  }
  /* 계절 · 날씨와 옷의 어색한 조합(⚠) — 거르지 않고 표시만 */
  function weatherAwkward(t, weather, ofam, itemKey) {
    if (!weather) return [];
    return (t.v2.weather_awkward || []).filter(function (r) { return has(r.weather, weather) && (has(r.outfits, ofam) || (itemKey && has(r.items, itemKey))); });
  }
  /* 어색한 조합(⚠) — 거르지 않고 표시만. 맞는 줄들 */
  function awkward(t, ofam, placeKey) {
    return (t.v2.awkward || []).filter(function (r) { return has(r.outfits, ofam) && has(expand(t, r.places), placeKey); });
  }
  function year(t, game) { var C = root.AtelierCasualTree; return C && C.year ? C.year(t.v1, game) : null; }
  function propSides(scene) { return (scene.right === 'prop' ? 1 : 0) + (scene.left === 'prop' ? 1 : 0); }
  function other(side) { return side === 'right' ? 'left' : 'right'; }

  /* 소품 동작이 지금 장면에 맞나 — n 은 소품을 쓰는 손 수(없으면 장면에서 센다) */
  function useFits(t, scene, u, n, game) {
    var f = frame(t, scene.frame), p = prop(t, u && u.prop);
    n = n == null ? propSides(scene) : n;
    if (!u || !f || !p || !n) return false;
    if (HANDS_OF[u.kind] !== u.hands || u.hands !== (n === 2 ? 'both' : 'one')) return false;
    if (scene.kind && u.kind !== scene.kind) return false;
    if (!has(u.frames, scene.frame) || !has(u.postures, scene.posture) || !has(f.zones, u.zone)) return false;
    if (scene.gaze && u.gaze && u.gaze !== scene.gaze) return false;
    if (scene.gaze === 'into_prop' && u.gaze !== 'into_prop') return false;
    /* 입 주변처럼 같은 공간을 손 자세와 같이 쓰지 않는다(입술에 검지 + 잔을 입에) */
    if (u.space && ['right', 'left'].some(function (s) { var h = scene[s] !== 'prop' && hand(t, scene[s]); return h && h.space === u.space; })) return false;
    if (p.signature && !signatureHold(game, scene)) return false;
    if (u.companion && !companionAt(t, scene.place)) return false;
    /* 동작에도 장소가 붙을 수 있다 — 역할이 있는 동작(pkm 직업 현장)은 그 현장에서만. 소품이 여러 곳에 나와도 */
    if (u.places && !has(memo(t, 'usePlaces', u.key, function () { return expand(t, u.places); }), scene.place)) return false;
    /* 동작의 받침 — 탁자 위 책장 넘기기 · 작업대에서 반죽(needs_any) */
    if (!placeOk(u, placeHas(t, scene.place))) return false;
    return propAt(t, p, scene.place, scene.era, game);
  }
  function uses(t, scene, n, game) { return t.v2.prop_uses.filter(function (u) { return useFits(t, scene, u, n, game); }); }

  /* 왜 못 고르나 — 고를 수 있으면 null. { code, ... } — 말은 부르는 쪽 낱말 표가 쥔다(이 모듈엔 말이 없다).
     code: unknown(없는 열쇠) · era(그 시대에 없다) · year(그 해엔 없던 곳) · place(장소에 받침이 없다 — needs) · posture(그 자세가 안 받는다) ·
           banned(이 공방은 안 쓴다) · close(가까운 컷에서 안 보이는 옷 · 「화면 밖」 은 가까운 컷만) · far(가까운 컷에 뒤쪽 몸 방향) ·
           zone(그 프레이밍에서 안 보이는 손 자리) · outfit(옷에 주머니 · 끈 · 옷깃이 없다) · both(다른 손과 함께 하는 자세 · 동작) ·
           same(두 손이 같은 데) · chin(두 손이 다 턱) · noprop(맞는 소품 동작이 없다) · nohand(소품을 쓰는 손이 없다) · fit(그 장면엔 안 맞는 소품 동작) ·
           legs(다리가 안 보이는 컷) · feet(발 동작은 전신 · 환경만) · family(자세 계열 밖) · use(소품 동작이 시선을 정한다) ·
           body(그 몸 방향과 같이 못 고르는 머리) · support(받침이 그 손을 막는다 — 두 팔뚝이 몸을 받친다) · back(등이 카메라 쪽인데 고개를 안 돌리고 카메라를 본다) ·
           lookback(뒷모습으로 돌아보는 컷엔 얼굴 · 머리에 대는 손을 안 쓴다) ·
           required(필수 갈래 의상엔 안 쓰는 프레이밍 — 버전1 frame_rules 의 not_required) · costume(코스튬 필수 컷엔 안 쓰는 프레이밍 — 버전1 costume_required 의 not_frames) · companion(동료 묶음에서만 · 동료 묶음에선 안 쓰는 프레이밍) */
  function why(t, scene, key, value, game) {
    var f = frame(t, scene.frame), po = posture(t, scene.posture), hs = placeHas(t, scene.place), r;
    switch (key) {
      case 'era': return era(t, value) ? null : { code: 'unknown' };
      case 'place': {
        r = place(t, value);
        if (!r || !t.v2.places[value]) return { code: 'unknown' };
        if (!has(r.eras, scene.era)) return { code: 'era', eras: r.eras.slice() };
        var y = scene.era === 'release' ? year(t, game) : null;
        return y && r.since && r.since > y ? { code: 'year', since: r.since, year: y } : null;
      }
      case 'weather': return by(t.v2.weather, value) ? null : { code: 'unknown' };
      case 'ofam': {
        var e = era(t, scene.era);
        if (!family(t, value)) return { code: 'unknown' };
        return e && !has(e.outfits, value) ? { code: 'era' } : null;
      }
      case 'item': {
        r = item(t, scene.ofam, value);
        if (!r) return { code: 'unknown' };
        return r.low && frameRule(t, scene.frame).low === false ? { code: 'close' } : null;
      }
      case 'posture': {
        r = posture(t, value);
        if (!r) return { code: 'unknown' };
        return placeOk(r, hs) ? null : { code: 'place', needs: (r.needs || []).concat(r.needs_any || []) };
      }
      case 'support': {
        r = support(t, value);
        if (!r) return { code: 'unknown' };
        if (po && !has(po.supports, value)) return { code: 'posture' };
        return placeOk(r, hs) ? null : { code: 'place', needs: (r.needs || []).concat(r.needs_any || []) };
      }
      case 'frame': {
        if (!frame(t, value)) return { code: 'unknown' };
        if (has(bannedV2(t, 'frames'), value)) return { code: 'banned' };
        if (frameRule(t, value).not_required && isRequired(t, scene)) return { code: 'required' };
        if (costumeNo(t, scene, value)) return { code: 'costume' };
        if (companionAt(t, scene.place) && has((t.v2.companion || {}).not_frames, value)) return { code: 'companion' };
        return po && !has(po.frames, value) ? { code: 'posture' } : null;
      }
      case 'body': {
        r = by(t.v2.body, value);
        if (!r) return { code: 'unknown' };
        if (has(bannedV2(t, 'body'), value)) return { code: 'banned' };
        return r.far && farBanned(t, scene.frame) ? { code: 'far' } : null;
      }
      case 'head': {
        r = by(t.v2.head, value);
        if (!r) return { code: 'unknown' };
        /* 옆모습 몸에서 고개를 옆으로 돌리면 카메라 쪽 — 몸까지 돌았다(MGS 일상4) */
        return has(r.not_bodies, scene.body) ? { code: 'body' } : null;
      }
      case 'camera': return by(t.v2.camera, value) ? null : { code: 'unknown' };
      case 'right': case 'left': return whyHand(t, scene, key, value, game);
      case 'use': {
        r = use(t, value);
        if (!r) return { code: 'unknown' };
        if (!propSides(scene)) return { code: 'nohand' };
        return useFits(t, scene, r, null, game) ? null : { code: 'fit' };
      }
      case 'legs': {
        r = leg(t, value);
        if (!r) return { code: 'unknown' };
        if (!f || !f.legs) return { code: 'legs' };
        if (r.feet && !f.feet) return { code: 'feet' };
        if (po && !has(r.families, po.family)) return { code: 'family' };
        if (r.postures && !has(r.postures, scene.posture)) return { code: 'posture' };
        return placeOk(r, hs) ? null : { code: 'place', needs: (r.needs || []).concat(r.needs_any || []) };
      }
      case 'gaze': {
        if (!by(t.v2.gaze, value)) return { code: 'unknown' };
        var u = use(t, scene.use);
        if (value === 'at_prop' && !u) return { code: 'noprop' };
        /* 들여다보기는 들여다보는 동작(망원경 · 카메라)만 */
        if (value === 'into_prop' && !(u && u.gaze === 'into_prop')) return { code: 'noprop' };
        var bd = by(t.v2.body, scene.body), hd = by(t.v2.head, scene.head);
        if (value === 'camera' && bd && bd.far && !(hd && hd.look_back)) return { code: 'back' };
        return u && u.gaze && u.gaze !== value ? { code: 'use', gaze: u.gaze } : null;
      }
    }
    return null;
  }
  /* 손 칸 — 오른손이 먼저, 왼손은 오른손을 보고 거른다(두 손 자세 · 두 손 소품 동작은 둘이 같은 값) */
  function whyHand(t, scene, side, value, game) {
    var f = frame(t, scene.frame), mate = side === 'left' ? scene.right : '', m = mate && mate !== 'prop' ? hand(t, mate) : null;
    if (value === 'prop') {
      if (mate && mate !== 'prop' && m && m.both) return { code: 'both' };
      /* 오른손은 한 손 동작이 있거나, 왼손도 소품이면 두 손 동작이 있으면 된다 — 왼손이 바뀌어도 오른손 소품 동작이 남게 */
      if (side === 'right') return uses(t, scene, 1, game).length || (scene.left === 'prop' && uses(t, scene, 2, game).length) ? null : { code: 'noprop' };
      return uses(t, scene, mate === 'prop' ? 2 : 1, game).length ? null : { code: 'noprop' };
    }
    var h = hand(t, value);
    if (!h || !f) return { code: 'unknown' };
    if (h.zone === 'out') { if (!f.close) return { code: 'close' }; }
    else if (h.zone !== 'any' && !has(f.zones, h.zone)) return { code: 'zone', zone: h.zone };
    if (h.postures && !has(h.postures, scene.posture)) return { code: 'posture' };
    /* 뒷모습으로 어깨 너머 돌아보며 얼굴 · 머리에 손 — 팔이 머리 뒤를 가로질러 늘 이상했다(「난간에서 돌아보기」, 좌우를 적어도 그대로 — 사용자 2026-11-01 「그냥 지금 구도는 갈래에서 없애줘」) */
    var bdL = by(t.v2.body, scene.body), hdL = by(t.v2.head, scene.head);
    if (h.zone === 'face' && bdL && bdL.far && hdL && hdL.look_back) return { code: 'lookback' };
    if (h.companion && !companionAt(t, scene.place)) return { code: 'companion' };
    if (!placeOk(h, placeHas(t, scene.place))) return { code: 'place', needs: (h.needs || []).concat(h.needs_any || []) };
    if (h.outfit && !has(sceneFeatures(t, scene), h.outfit)) return { code: 'outfit', feature: h.outfit };
    var su = support(t, scene.support);
    if (su && su.hands && !has(su.hands, value)) return { code: 'support' };
    if (side === 'left' && mate) {
      if (m && m.both && value !== mate) return { code: 'both' };
      if (h.both && value !== mate) return { code: 'both' };
      if (mate === 'prop' && h.both) return { code: 'both' };
      if (value === mate && !h.both && h.zone !== 'out' && h.zone !== 'any') return { code: 'same' };
      if (/^chin_/.test(value) && /^chin_/.test(mate) && value !== mate) return { code: 'chin' };
    }
    return null;
  }

  /* 칸 하나의 고를 거리(열쇠 목록) — 화면 · 랜덤 · 묶음 계획기가 같이 쓴다 */
  function candidates(t, scene, key) {
    switch (key) {
      case 'era': return t.v1.eras.map(function (x) { return x.key; });
      case 'place': return allPlaces(t).map(function (x) { return x.key; });
      case 'weather': return (t.v2.weather || []).map(function (x) { return x.key; });
      case 'ofam': return t.v1.outfits.map(function (x) { return x.key; });
      case 'item': { var f = family(t, scene.ofam); return f ? f.items.map(function (x) { return x.key; }) : []; }
      case 'posture': return t.v2.postures.map(function (x) { return x.key; });
      case 'support': return t.v2.supports.map(function (x) { return x.key; });
      case 'frame': return Object.keys(t.v2.frames).filter(function (k) { return k !== 'note'; });
      case 'body': case 'head': case 'camera': case 'gaze': return t.v2[key].map(function (x) { return x.key; });
      case 'right': case 'left': return t.v2.hands.map(function (x) { return x.key; }).concat(['prop']);
      case 'use': return t.v2.prop_uses.map(function (x) { return x.key; });
      case 'legs': return t.v2.legs.map(function (x) { return x.key; });
    }
    return [];
  }
  function choices(t, scene, key, game) {
    return candidates(t, scene, key).filter(function (v) { return !why(t, scene, key, v, game); });
  }

  /* 해방(🔓) 칸은 트리 밖 값이라도 고치지 않는다 — 버전1 과 같다 */
  function unlocked(scene, k) { return !!(scene && scene[k] && has(scene.unlocked, k)); }
  function required(scene, k) { return has(REQUIRED, k) || (k === 'use' && propSides(scene) > 0); }
  function repair(t, scene, game, pick) {
    var next = Object.assign({}, scene, { treeV: 2 });
    pick = pick || function (list) { return list[0]; };
    /* 따라 해방된 칸(unlockedAuto)은 매번 새로 정한다 — 앞 칸을 트리 안으로 되돌리면 같이 풀린다 */
    var auto = next.unlockedAuto || [];
    if (auto.length) next.unlocked = (next.unlocked || []).filter(function (k) { return auto.indexOf(k) < 0; });
    delete next.unlockedAuto;
    ORDER.forEach(function (k) {
      if (unlocked(next, k)) return;
      if (k === 'use' && !propSides(next)) { next.use = ''; return; }
      var list = choices(t, next, k, game);
      if (required(next, k)) {
        if (has(list, next[k])) return;
        if (list.length) { next[k] = pick(list, k); return; }
        /* 앞 칸을 해방해 고를 것이 하나도 안 남으면(거실에서 헤엄 → 물 받침이 없다) 장소 받침만 빼고 맞는 값을 고르고 그 칸도 해방으로 단다 —
           비워 두면 꼭 있어야 하는 칸이 비어 복사가 막혔다 */
        var fb = (next.unlocked || []).length ? candidates(t, next, k).filter(function (v) { var w = why(t, next, k, v, game); return !w || w.code === 'place'; }) : [];
        next[k] = fb.length ? fb[0] : '';
        if (fb.length) { next.unlocked = (next.unlocked || []).concat([k]); next.unlockedAuto = (next.unlockedAuto || []).concat([k]); }
      }
      else if (next[k] && !has(list, next[k])) next[k] = '';
    });
    /* 두 손 자세는 두 칸이 같은 값 — 한쪽만 골랐으면(다른 쪽 AUTO) 다른 쪽도 그 값 */
    ['right', 'left'].forEach(function (s) {
      var h = hand(t, next[s]), o = other(s);
      if (h && h.both && next[o] !== next[s] && !unlocked(next, o)) next[o] = next[s];
    });
    /* 옷은 프레이밍보다 먼저 고르지만, 가까운 컷이 허리 아래 옷을 거른다 */
    if (next.item && !unlocked(next, 'item') && why(t, next, 'item', next.item, game)) next.item = '';
    return next;
  }
  /* 칸 하나를 바꾼다 — 두 손 자세는 다른 손도 같은 값, 두 손 자세를 풀면 다른 손은 다시 고른다.
     두 손 소품 동작에서 한 손을 풀면 남은 손은 소품을 든 채 한 손 동작으로 바뀐다. 손 · 소품을 바꾸면 추천의 소품 꼴은 푼다 */
  function set(t, scene, key, value, game, pick) {
    var next = Object.assign({}, scene), h;
    next[key] = value;
    if (key === 'right' || key === 'left') {
      var o = other(key), was = hand(t, scene[key]);
      h = hand(t, value);
      if (h && h.both) next[o] = value;
      else if (was && was.both && next[o] === scene[key]) next[o] = '';
      next.use = value === 'prop' || next[o] === 'prop' ? next.use : '';
    }
    if (key === 'right' || key === 'left' || key === 'use') delete next.kind;
    /* 다시 검사가 칸을 고친 뒤에도 추천 그대로인가 — 아니면 추천 표시를 지운다(장소를 바꿔 받침이 사라진 경우까지) */
    var r = repair(t, next, game, pick), p = preset(t, r.preset);
    if (p && !presetSame(p, r)) r.preset = '';
    return r;
  }
  function presetSame(p, scene) {
    return BODY.every(function (k) { return (p[k] || '') === (scene[k] || '') || (k === 'gaze' && !p.gaze); });
  }

  /* 자세 추천 — 칸만 채운다. 소품 꼴(kind)은 남겨 다시 검사가 그 꼴의 소품 동작을 고르게 한다 */
  function applyPreset(t, scene, k) {
    var p = preset(t, k);
    if (!p) return scene;
    var next = Object.assign({}, scene, { preset: k, use: '', kind: p.prop_kind || '' });
    BODY.forEach(function (f) { next[f] = p[f] || ''; });
    if (!next.kind) delete next.kind;
    return next;
  }
  /* 지금 시대 · 장소 · 의상에서 그대로 쓸 수 있는 추천인가(다시 검사가 칸을 하나도 안 고친다) */
  function presetOk(t, scene, k, game) {
    var p = preset(t, k);
    if (!p) return false;
    var r = repair(t, applyPreset(t, scene, k), game);
    return BODY.every(function (f) { return (r[f] || '') === (p[f] || ''); }) && (!p.prop_kind || !!r.use);
  }
  function presets(t, scene, game) { return t.v2.presets.filter(function (p) { return presetOk(t, scene, p.key, game); }); }

  /* 랜덤 — 잠근 칸(locks)은 두고, 시대 · 장소 · 의상 · 옷을 차례로, 몸 쪽은 쓸 수 있는 추천 하나(opts.preset === false 면 칸마다).
     rnd 는 0 이상 1 미만(기본 Math.random) */
  function random(t, scene, game, rnd, locks, opts) {
    rnd = rnd || Math.random; locks = locks || []; opts = opts || {};
    var pickR = function (list) { return list[Math.floor(rnd() * list.length)]; };
    var next = Object.assign({}, scene);
    ['era', 'place', 'ofam', 'item', 'use', 'preset', 'kind'].concat(BODY).forEach(function (k) { if (!has(locks, k)) next[k] = ''; });
    next = repair(t, next, game, pickR);
    if (!has(locks, 'item')) { var its = choices(t, next, 'item', game); next.item = its.length ? pickR(its) : ''; }
    var free = BODY.filter(function (k) { return !has(locks, k); });
    if (opts.preset !== false && free.length === BODY.length) {
      var list = presets(t, next, game);
      if (list.length) return repair(t, applyPreset(t, next, pickR(list).key), game, pickR);
    }
    next = repair(t, next, game, pickR);
    ['legs', 'gaze'].forEach(function (k) {
      if (has(locks, k)) return;
      var c = choices(t, next, k, game);
      next[k] = c.length && rnd() < 0.8 ? pickR(c) : '';
    });
    return repair(t, next, game, pickR);
  }

  /* 버전1 기록 — 하는 일 · 자세 · 방향이 있거나 아주 예전 갈래(cat). 화면은 지시문을 그대로 보이고, 다시 고를 때만 옮긴다 */
  function isV1(scene) { return !!scene && scene.treeV !== 2 && !!(scene.act || scene.pose || scene.orient || scene.cat); }
  function fromV1(t, scene, game) {
    var C = root.AtelierCasualTree, s = scene || {};
    if (s.cat && !s.place && C && C.fromLegacy) s = C.fromLegacy(t.v1, s);
    var L = t.v2.legacy || {}, a = by(t.v1.activities, s.act);
    /* 시대 · 장소 · 의상 · 옷 · 프레이밍 · 표정 · 알아볼 거리(prop) · 추가 연출 · 축은 그대로, 버전1 칸은 지운다 —
       버전1 camera(자유 글) · preset(버전1 추천 조합)은 버전2 의 같은 이름 칸과 뜻이 달라 버린다 */
    var next = Object.assign({}, s, { treeV: 2, era: s.era || 'now' });
    V1_ONLY.forEach(function (k) { delete next[k]; });
    if (a && (L.families || {})[a.family]) next.posture = L.families[a.family];
    [(L.acts || {})[s.act], (L.poses || {})[s.pose], (L.orients || {})[s.orient]].forEach(function (row) { if (row) Object.assign(next, row); });
    if (next.right && !next.left) { var h = hand(t, next.right); if (h && h.both) next.left = next.right; }
    return repair(t, next, game);
  }

  /* 뒷모습으로 돌아보는 컷(몸 far · 머리 look_back)의 좌우 — 「어깨 너머」 만 적으면 모델이 아무 쪽으로 돌렸다. 왼쪽 어깨로 정하고,
     뒷모습이라 인물의 좌우가 화면의 좌우와 같다는 말을 손 줄에 붙인다(2026-11-01). 얼굴 · 머리에 대는 손은 이 컷에서 못 고른다(whyHand lookback) */
  function backLook(t, scene) {
    var bd = by(t.v2.body, scene.body), hd = by(t.v2.head, scene.head);
    if (!bd || !bd.far || !hd || !hd.look_back) return null;
    return { side: 'left', face: '', arm: '',
      head: "head turned back over her own left shoulder — the shoulder on the image's left side",
      where: function (s) { return "on the image's " + s + ' side, since her back is to the camera'; } };
  }

  root.AtelierCasualTreeV2 = { ORDER: ORDER, REQUIRED: REQUIRED, BODY: BODY, make: make, backLook: backLook,
    era: era, place: place, family: family, item: item, posture: posture, support: support, hand: hand, leg: leg, prop: prop, use: use, preset: preset,
    frame: frame, lens: lens, placeHas: placeHas, placeOk: placeOk, bannedV2: bannedV2, companionAt: companionAt, expand: expand, propAt: propAt, farBanned: farBanned, features: features, awkward: awkward,
    candidates: candidates, allPlaces: allPlaces, weatherAwkward: weatherAwkward, useFits: useFits, uses: uses, sceneFeatures: sceneFeatures, signatureHold: signatureHold, FEATURES: FEATURES, propSides: propSides, why: why, choices: choices, unlocked: unlocked, repair: repair, set: set,
    applyPreset: applyPreset, presetOk: presetOk, presets: presets, random: random, isV1: isV1, fromV1: fromV1 };
})(typeof window !== 'undefined' ? window : globalThis);
