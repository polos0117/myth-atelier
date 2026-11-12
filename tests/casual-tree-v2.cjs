/* 일상컷 트리 버전2 모듈(lib/casual-tree-v2.js). node tests/casual-tree-v2.cjs
   - 검사기(tools/casual-tree-v2.py)와 같은 길: 자세 추천마다 쓸 수 있는 장소가 같다
   - 다시 검사 뒤엔 어느 칸도 걸리지 않는다(랜덤 300 · 바꾸기 200 — 모듈 원본은 game-atelier) — 두 손 칸 · 보이는 부위 · 다리 칸 · 받침 · 옷 특징 · 시선
   - 프레이밍을 넓혀 맞추지 않는다, 두 손 자세는 다른 손을 잠근다, 버전1 기록은 표로 옮긴다 */
const assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
global.window = global; require('../lib/casual-tree.js'); require('../lib/casual-tree-v2.js');
const C = window.AtelierCasualTreeV2, R = path.join(__dirname, '..');
const t = C.make(JSON.parse(fs.readFileSync(path.join(R, 'data/casual-tree-v2.json'), 'utf8')), JSON.parse(fs.readFileSync(path.join(R, 'data/casual-tree.json'), 'utf8')));
const py = JSON.parse(require('node:child_process').execFileSync('python3', [path.join(R, 'tools/casual-tree-v2.py'), 'places-all'], { encoding: 'utf8' }));
const seeded = s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

/* 1. 검사기와 같은 길 — 추천 × 장소(그 장소의 시대 · 손 자세가 바라는 특징이 있는 옷 계열) */
const feat = pr => [pr.right, pr.left].map(k => C.hand(t, k)).filter(h => h && h.outfit).map(h => h.outfit);
let pairs = 0;
for (const pr of t.v2.presets) {
  for (const pl of C.allPlaces(t)) {
    const era = pl.eras.includes('now') ? 'now' : pl.eras[0], e = C.era(t, era);
    const fam = t.v1.outfits.find(o => e.outfits.includes(o.key) && feat(pr).every(x => C.features(t, o.key, '').includes(x)));
    if (!fam) continue;
    pairs++;
    assert.equal(C.presetOk(t, { era, place: pl.key, ofam: fam.key }, pr.key), py[pr.key].includes(pl.key), pr.key + ' @ ' + pl.key);
  }
  assert(py[pr.key].length, pr.key + ' 쓸 장소');
}
assert(pairs > 3000, pairs);

/* 2. 다시 검사 뒤엔 걸리는 칸이 없다 */
function valid(sc, where) {
  for (const k of C.ORDER) if (sc[k]) assert.equal(C.why(t, sc, k, sc[k]), null, where + ' ' + k + '=' + sc[k] + ' ' + JSON.stringify(C.why(t, sc, k, sc[k])));
  for (const k of C.REQUIRED) assert(sc[k], where + ' 빈 칸 ' + k);
  if (C.propSides(sc)) assert(sc.use, where + ' 소품 동작');
  else assert(!sc.use, where + ' 손 없는 소품 동작');
  const r = C.hand(t, sc.right), l = C.hand(t, sc.left);
  if ((r && r.both) || (l && l.both)) assert.equal(sc.right, sc.left, where + ' 두 손 자세');
  const u = C.use(t, sc.use);
  if (u) assert.equal(u.hands === 'both', C.propSides(sc) === 2, where + ' 소품 손 수');
  const f = C.frame(t, sc.frame);
  if (!f.legs) assert(!sc.legs, where + ' 안 보이는 다리');
  assert.equal(sc.treeV, 2);
}
const rnd = seeded(7);
for (let i = 0; i < 300; i++) {
  const sc = C.random(t, {}, null, rnd, [], { preset: i % 2 === 0 });
  valid(sc, '랜덤 ' + i);
  if (i % 2 === 0 && sc.preset) assert(C.presetOk(t, sc, sc.preset), '랜덤 추천 ' + sc.preset);
}
/* 칸을 아무 값으로 바꿔도(트리 밖 값 포함) 다시 검사 뒤엔 맞다 */
const r2 = seeded(11);
for (let i = 0; i < 200; i++) {
  let sc = C.random(t, {}, null, r2);
  const k = C.ORDER[Math.floor(r2() * C.ORDER.length)], pool = k === 'place' ? t.v1.places.map(p => p.key) : [].concat(...['hands', 'legs', 'postures', 'supports', 'gaze', 'body', 'prop_uses'].map(n => t.v2[n].map(x => x.key)), Object.keys(t.v2.frames), ['prop', 'nope']);
  sc = C.set(t, sc, k, pool[Math.floor(r2() * pool.length)]);
  valid(sc, '바꾸기 ' + i + ' ' + k);
}

/* 3. 프레이밍을 넓히지 않는다 — 전신 추천에서 클로즈업으로 바꾸면 손 · 다리 칸이 고쳐지고 프레이밍은 그대로 */
const base = { era: 'now', place: 'home_living', ofam: 'everyday' };
let s = C.repair(t, C.applyPreset(t, base, 'side_chair_cross'));
assert(C.presetOk(t, base, 'side_chair_cross'));
s = C.set(t, s, 'frame', 'face_close');
assert.equal(s.frame, 'face_close'); assert.equal(s.legs, ''); assert.notEqual(s.left, 'lap'); assert.equal(s.preset, '');
valid(s, '클로즈업으로');
/* 「화면 밖」 은 가까운 컷만, 가까운 컷엔 뒤쪽 몸 방향 없음 */
assert.equal(C.why(t, s, 'right', 'out'), null);
assert.equal(C.why(t, Object.assign({}, s, { frame: 'full_body' }), 'right', 'out').code, 'close');
assert.equal(C.why(t, s, 'body', 'back').code, 'far');
assert.equal(C.why(t, Object.assign({}, s, { frame: 'full_body' }), 'body', 'back'), null);
assert.equal(C.why(t, s, 'right', 'hip').code, 'zone');

/* 4. 두 손 — 두 손 자세는 다른 손도, 풀면 다른 손을 다시 고른다, 같은 데를 두 손이 쓰지 않는다 */
s = C.repair(t, Object.assign({}, base, { posture: 'stand', support: 'none', frame: 'waist_up' }));
s = C.set(t, s, 'left', 'arms_crossed');
assert.equal(s.right, 'arms_crossed'); assert.equal(s.left, 'arms_crossed');
s = C.set(t, s, 'right', 'hip');
assert.equal(s.right, 'hip'); assert.notEqual(s.left, 'arms_crossed'); valid(s, '두 손 풀기');
assert.equal(C.why(t, s, 'left', 'hip').code, 'same');
assert.equal(C.why(t, Object.assign({}, s, { right: 'shush' }), 'left', 'shush').code, 'same');
assert.equal(C.why(t, Object.assign({}, s, { right: 'out' }), 'left', 'out'), null);
/* 두 손 소품 동작 — 오른손 · 왼손이 다 소품이면 두 손 동작만, 하나면 한 손 동작만 */
s = C.set(t, C.set(t, Object.assign({}, s, { frame: 'waist_up' }), 'right', 'prop'), 'left', 'prop');
assert.equal(C.use(t, s.use).hands, 'both'); valid(s, '두 손 소품');
s = C.set(t, s, 'left', 'hip');
assert.equal(s.right, 'prop'); assert.equal(s.left, 'hip'); assert.equal(C.use(t, s.use).hands, 'one'); valid(s, '한 손 소품');

/* 5. 장소 받침 · 옷 특징 · 시대 소품 */
assert.equal(C.why(t, { era: 'now', place: 'home_living', posture: 'stand' }, 'posture', 'soak').code, 'place');
const wall = t.v1.places.find(p => C.placeHas(t, p.key).includes('wall')).key, nowall = t.v1.places.find(p => !C.placeHas(t, p.key).includes('wall')).key;
assert.equal(C.why(t, { place: wall }, 'posture', 'lean_wall'), null);
assert.equal(C.why(t, { place: nowall }, 'posture', 'lean_wall').code, 'place');
const pk = { era: 'now', place: 'home_living', ofam: 'everyday', item: 'jeans_tee', posture: 'stand', frame: 'waist_up' };
assert.equal(C.why(t, pk, 'right', 'pocket'), null);
assert.equal(C.why(t, Object.assign({}, pk, { ofam: 'bath', item: '' }), 'right', 'pocket').code, 'outfit');
assert(C.features(t, 'everyday', 'linen_dress').indexOf('pocket') < 0, '빼기');
const phone = C.prop(t, 'phone'), at = C.expand(t, phone.places)[0];
assert(C.propAt(t, phone, at, 'now')); assert(!C.propAt(t, phone, at, 'fantasy'));
/* 시선 — 소품이 없으면 「소품」 시선이 없고, 시선을 정하는 소품 동작은 그 시선만 */
assert.equal(C.why(t, pk, 'gaze', 'at_prop').code, 'noprop');
const fix = t.v2.prop_uses.find(u => u.gaze);
assert.equal(C.why(t, Object.assign({}, pk, { use: fix.key }), 'gaze', fix.gaze), null);
assert.equal(C.why(t, Object.assign({}, pk, { use: fix.key }), 'gaze', fix.gaze === 'camera' ? 'down' : 'camera').code, 'use');
/* 어색한 조합은 거르지 않고 표시만 */
const aw = t.v2.awkward[0], awPlace = C.expand(t, aw.places)[0];
assert(C.awkward(t, aw.outfits[0], awPlace).length);
assert.equal(C.why(t, { era: 'now', place: awPlace }, 'ofam', aw.outfits[0]), null);
/* 렌즈는 프레이밍에 따라 */
assert.equal(C.lens(t, 'face_close'), 'portrait85'); assert.equal(C.lens(t, 'full_body'), 'documentary35');

/* 6. 해방(🔓) 칸은 고치지 않는다 */
s = C.repair(t, Object.assign({}, pk, { right: 'hip', left: 'down', frame: 'face_close', unlocked: ['right'] }));
assert.equal(s.right, 'hip'); valid(Object.assign({}, s, { right: 'out' }), '해방 뒤');

/* 7. 랜덤 — 잠근 칸은 둔다, 씨앗이 같으면 같은 장면 */
const lk = C.random(t, { era: 'now', place: 'home_bedroom', frame: 'chest_up' }, null, seeded(3), ['era', 'place', 'frame']);
assert.equal(lk.place, 'home_bedroom'); assert.equal(lk.frame, 'chest_up'); valid(lk, '잠금');
assert.deepEqual(C.random(t, {}, null, seeded(5)), C.random(t, {}, null, seeded(5)));

/* 8. 버전1 기록 — 표시하고, 다시 고르면 옮긴다 */
const old = { era: 'now', place: 'water_pool', act: 'swim', ofam: 'swimwear', frame: 'chest_up', pose: '', orient: 'front', lens: 'portrait85' };
assert(C.isV1(old)); assert(!C.isV1({ treeV: 2, act: 'x' }));
let n = C.fromV1(t, old);
assert.equal(n.posture, 'swim'); assert.equal(n.treeV, 2); assert.equal(n.frame, 'chest_up'); assert.equal(n.body, 'front'); assert(!('act' in n) && !('lens' in n));
valid(n, '버전1 헤엄');
n = C.fromV1(t, { era: 'now', place: wall, act: (t.v1.activities.find(a => a.family === 'stand') || {}).key, ofam: 'everyday', frame: 'full_body', pose: 'leaning_wall', orient: 'over_shoulder' });
assert.equal(n.posture, 'lean_wall'); assert.equal(n.head, 'over_shoulder'); assert.equal(n.body, 'rear_3q'); valid(n, '버전1 벽');
n = C.fromV1(t, { era: 'now', place: 'home_living', act: 'read_book', ofam: 'everyday', frame: 'waist_up', pose: 'arms_crossed' });
assert.equal(n.right, 'arms_crossed'); assert.equal(n.left, 'arms_crossed'); valid(n, '버전1 팔짱');
n = C.fromV1(t, { cat: 'everyday', ex: '' });
assert(n.place && n.treeV === 2 && !('cat' in n)); valid(n, '아주 예전 갈래');
for (const row of Object.values(t.v2.legacy.orients)) for (const [k, v] of Object.entries(row)) assert.equal(C.why(t, { frame: 'full_body' }, k, v), null, k + ' ' + v);

/* 9. 고정 사례 — 규칙에 없던 충돌을 「이 조합은 빠져야 한다」 로 못 박는다(검토 2026-10-30). 랜덤 시험은 why() 가 맞다고 보는 것만 보므로 따로 */
const games = JSON.parse(fs.readFileSync(path.join(R, 'data/card.json'), 'utf8')).cards, game = k => games.find(g => g.name === k);   // 신화 — 무기를 들지 않는다(signature_hold 없음)
const fx = (x) => Object.assign({ era: 'now', place: 'home_living', ofam: 'everyday', posture: 'stand', support: 'none', frame: 'full_body', body: 'front', head: 'with_body', camera: 'eye', right: 'down', left: 'down' }, x);
// 무릎 꿇기 + 책상다리 — 다리 세부는 그 자세에서만
assert.equal(C.why(t, fx({ place: 'home_bedroom', posture: 'kneel', support: 'none' }), 'legs', 'cross_legged').code, 'posture');
assert.equal(C.why(t, fx({ place: 'home_bedroom', posture: 'sit_floor', support: 'none' }), 'legs', 'cross_legged'), null);
// 족욕탕 + 평영 · 몸 담그기 — 물의 쓰임(발만 · 담그기 · 헤엄)
assert.equal(C.why(t, fx({ place: 'spa_footbath' }), 'posture', 'swim').code, 'place');
assert.equal(C.why(t, fx({ place: 'spa_footbath' }), 'posture', 'soak').code, 'place');
assert.equal(C.why(t, fx({ place: 'spa_onsen' }), 'posture', 'swim').code, 'place', '온천에서 헤엄 X');
assert.equal(C.why(t, fx({ place: 'water_pool' }), 'posture', 'swim'), null);
assert.equal(C.why(t, fx({ place: 'spa_footbath', posture: 'sit_edge', support: 'hip_edge' }), 'legs', 'feet_in_water'), null, '족욕은 발을 물에');
// 두 팔뚝으로 받치기 + 머리 뒤 · 손 흔들기 — 받침이 팔을 쓴다
const prone = fx({ place: 'home_bedroom', posture: 'lie_front', support: 'front_floor' });
for (const k of ['behind_head', 'wave', 'thumbs_up']) assert(C.why(t, prone, 'right', k), '엎드려 두 팔뚝으로 받치면 ' + k + ' 없음');
assert.equal(C.why(t, prone, 'right', 'behind_head').code, 'support');
assert.equal(C.why(t, prone, 'right', 'chin_both'), null);
// 입술에 검지 + 잔을 입에 — 입 주변 공간
const sip = fx({ frame: 'chest_up', posture: 'sit_chair', support: 'none', right: 'prop', left: 'shush' });
assert(!C.uses(t, sip, 1).some(u => u.space === 'mouth'), '입술에 검지면 입에 대는 동작이 없다');
assert(C.uses(t, Object.assign({}, sip, { left: 'cheek' }), 1).some(u => u.key === 'cup_sip'), '볼에 손이면 잔을 입에');
// 등 돌림 + 머리는 몸과 같이 + 카메라 응시 — 얼굴이 안 보인다
assert.equal(C.why(t, fx({ body: 'back' }), 'gaze', 'camera').code, 'back');
assert.equal(C.why(t, fx({ body: 'rear_3q' }), 'gaze', 'camera').code, 'back');
assert.equal(C.why(t, fx({ body: 'rear_3q', head: 'over_shoulder' }), 'gaze', 'camera'), null, '어깨 너머로 돌리면 카메라를 본다');
assert.equal(C.why(t, fx({ body: 'back' }), 'gaze', 'horizon'), null);
// 옷 직접 쓰기 — 고른 옷(청바지 + 티)의 주머니로 검사하지 않는다
const dress = fx({ item: 'jeans_tee', outfit: 'a strapless satin dress with no pockets' });
assert.equal(C.why(t, dress, 'right', 'pocket').code, 'outfit');
assert.equal(C.why(t, Object.assign({}, dress, { ofeat: ['pocket'] }), 'right', 'pocket'), null, '특징을 표시하면');
assert.equal(C.why(t, fx({ item: 'jeans_tee' }), 'right', 'pocket'), null);
assert.notEqual(C.repair(t, Object.assign({}, dress, { right: 'pocket' })).right, 'pocket', '다시 검사가 주머니 손을 고친다');
// 알아볼 거리 소품 — 무기 의인화는 무기를 들지 않는다(IMAGE_RULES 조건) — 들 것(signature_hold)이 없어 그 소품 동작이 나오지 않는다(신화 공방, 2026-11-01)
const sigUses = (g, x) => C.uses(t, fx(Object.assign({ frame: 'waist_up', right: 'prop', left: 'down' }, x)), 1, g).filter(u => u.prop === 'signature');
for (const g of games) assert.equal(sigUses(g, { prop: '' }).length, 0, g.name + ' 무기를 들지 않는다');
for (const g of games.filter((_, i) => i % 20 === 0)) for (let i = 0; i < 20; i++) {
  const sc = C.random(t, {}, g, seeded(i + 1));
  const u = C.use(t, sc.use);
  assert(!(u && u.prop === 'signature'), g.name + ' 알아볼 거리 동작');
  if (u && u.space) assert(![sc.right, sc.left].some(k => (C.hand(t, k) || {}).space === u.space), g.name + ' 입 공간 겹침');
}

/* 10. 시범(MGS 일상컷, 2026-10-30) 고정 사례 — 옆모습 몸 + 머리 옆으로 돌림, 들여다보는 동작의 시선 */
assert.equal(C.why(t, fx({ body: 'side' }), 'head', 'turn_side').code, 'body', '옆모습 몸에 머리 옆으로 돌림 X');
assert.equal(C.why(t, fx({ body: 'front' }), 'head', 'turn_side'), null);
const scope = fx({ era: 'now', place: 'night_rooftop', frame: 'waist_up', right: 'prop', left: 'prop', use: 'scope_look' });
assert.equal(C.why(t, scope, 'gaze', 'into_prop'), null, '망원경은 들여다본다');
assert.equal(C.why(t, scope, 'gaze', 'at_prop').code, 'use', '망원경에 「든 것을 바라본다」 X');
assert.equal(C.why(t, fx({ right: 'prop', left: 'down', frame: 'waist_up', use: 'cup_hold' }), 'gaze', 'into_prop').code, 'noprop', '잔은 들여다보지 않는다');
assert(!C.uses(t, Object.assign({}, scope, { gaze: 'into_prop', left: 'down' }), 1).length, '들여다보기 시선이면 한 손 동작은 없다');

/* 11. 손 칸 AUTO · 자연스럽게, 해방 칸(사용자 2026-10-30) */
let au = C.repair(t, fx({ frame: 'waist_up', right: 'hip', left: '' }));
assert.equal(au.left, '', 'AUTO 손은 다시 검사가 채우지 않는다');
assert.equal(C.why(t, fx({ frame: 'face_close' }), 'right', 'natural'), null, '자연스럽게는 어느 컷이든');
assert.equal(C.why(t, fx({ right: 'natural' }), 'left', 'natural'), null, '두 손 다 자연스럽게');
au = C.repair(t, fx({ frame: 'waist_up', right: '', left: 'arms_crossed' }));
assert.equal(au.right, 'arms_crossed', '왼손만 두 손 자세를 고르면 오른손도');
au = C.repair(t, fx({ place: 'home_living', posture: 'swim', support: 'none', frame: 'chest_up', unlocked: ['posture'] }));
assert.equal(au.posture, 'swim', '해방한 칸은 고치지 않는다');
assert.equal(au.support, 'water', '뒤 칸은 해방한 값을 기준으로 — 장소에 물이 없어도 헤엄의 받침');
assert(au.unlocked.includes('support'), '그 칸도 해방으로 단다');
const back2 = C.repair(t, Object.assign({}, au, { posture: 'stand', unlocked: au.unlocked.filter(k => k !== 'posture') }));
assert(!(back2.unlocked || []).includes('support') && back2.support === 'none', '앞 칸을 되돌리면 따라 해방된 칸도 풀린다');
assert.equal(C.repair(t, fx({ place: 'home_living', posture: 'swim', support: 'none', frame: 'chest_up' })).posture !== 'swim', true, '해방하지 않으면 고친다');

/* 12. 확장(사용자 2026-10-30) — 새 장소 · 작업대 · 새 동작의 받침 · 소품 연도 · 안경 · 계절 날씨 */
assert(C.place(t, 'bakery_kitchen') && C.expand(t, ['@travel']).includes('train_sleeper'), '새 장소는 버전2 표에서');
assert(!t.v1.places.some(p => p.key === 'bakery_kitchen'), '버전1 표는 그대로');
const lib = fx({ era: 'now', place: 'work_library', posture: 'sit_chair', support: 'none', frame: 'waist_up', right: 'prop', left: 'prop' });
assert(C.uses(t, lib, 2).some(u => u.key === 'book_turn'), '열람실 탁자 위 책장 넘기기');
assert(!C.uses(t, Object.assign({}, lib, { place: 'street_park', posture: 'stand' }), 2).some(u => u.key === 'book_turn'), '탁자 없는 공원엔 없다');
assert.equal(C.why(t, fx({ place: 'bakery_kitchen' }), 'posture', 'lean_counter'), null, '작업대에 몸 숙이기');
assert.equal(C.why(t, fx({ place: 'street_park' }), 'posture', 'lean_counter').code, 'place', '받칠 데가 없으면 없다');
const bake = fx({ era: 'now', place: 'bakery_kitchen', posture: 'lean_counter', support: 'none', frame: 'waist_up', right: 'prop', left: 'prop' });
assert(C.uses(t, bake, 2).some(u => u.key === 'bowl_mix'), '반죽 섞기');
assert(!t.v2.props.some(p => ['handheld', 'gamepad', 'arcade_panel'].includes(p.key)) && !t.v2.props.some(p => p.since), '휴대용 게임기 · 오락실 소품 없음 · 연도 소품 없음(신화엔 출시 연도가 없다)');
assert.equal(C.why(t, fx({ frame: 'chest_up' }), 'right', 'glasses_adjust').code, 'outfit', '안경을 안 쓰면 안경 고쳐 쓰기 없음');
assert.equal(C.why(t, fx({ frame: 'chest_up', ofeat: ['glasses'] }), 'right', 'glasses_adjust'), null, '안경 표시');
assert(C.weatherAwkward(t, 'snow', 'swimwear', '').length && !C.weatherAwkward(t, 'rain', 'swimwear', '').length && C.weatherAwkward(t, 'summer', 'everyday', 'wool_coat').length, '날씨 ⚠');
assert.equal(C.why(t, fx({}), 'weather', 'snow'), null); assert.equal(C.why(t, fx({}), 'weather', 'hail').code, 'unknown');
assert.equal(C.why(t, fx({ posture: 'kneel', place: 'home_bedroom' }), 'legs', 'ankles_crossed').code, 'family', '무릎 꿇기엔 발목 교차 없음');
const brush = fx({ frame: 'chest_up', right: 'prop', left: 'hair_tuck', place: 'backstage_dressing' });
assert(!C.uses(t, brush, 1).some(u => u.key === 'brush_hair'), '머리 넘기는 손이 있으면 빗질 X(머리 주변 공간)');

/* 13. 신화 몫(2026-11-01) — 신화 세계 장소 · 일터 · 공방 · 도장 · 제례 · 전설의 자리의 받침과 소품, 시대 heritage */
assert(C.place(t, 'myth_inn') && !C.place(t, 'game_inn'), '게임 장소 → 신화 세계 장소');
assert(!C.place(t, 'library_reading') && !C.place(t, 'tailor_room'), '신화 표의 도서관 서가 · 재단 공방과 겹치는 새 장소는 뺀다');
for (const k of ['work_library', 'forge_smithy', 'dojo_hall', 'rite_shrine', 'heritage_ruin', 'heritage_spring', 'myth_bath']) assert(t.v2.places[k] && t.v2.places[k].length, k + ' 받침');
const read2 = fx({ era: 'heritage', place: 'work_library', posture: 'sit_chair', support: 'none', frame: 'waist_up', right: 'prop', left: 'prop' });
assert(C.uses(t, read2, 2).some(u => C.use(t, u.key).prop === 'book'), '옛 땅의 도서관 서가에서 책');
assert(C.uses(t, fx({ era: 'now', place: 'rite_doorstep', frame: 'waist_up', right: 'prop', left: 'down' }), 1).some(u => C.use(t, u.key).prop === 'lantern'), '등불 켠 문간의 등불');
assert(C.uses(t, fx({ era: 'now', place: 'heritage_ruin', frame: 'waist_up', right: 'prop', left: 'prop' }), 2).some(u => C.use(t, u.key).prop === 'camera'), '유적에서 사진기');
assert(!C.uses(t, fx({ era: 'heritage', place: 'work_library', frame: 'waist_up', right: 'prop', left: 'down' }), 1).some(u => C.use(t, u.key).prop === 'phone'), '휴대폰은 지금 현실만');
assert(C.awkward(t, 'swimwear', 'forge_smithy').length && C.awkward(t, 'bath', 'heritage_museum').length && !C.awkward(t, 'bath', 'heritage_spring').length, '대장간 · 전시관에 수영복 · 목욕 차림 ⚠, 옛 샘터는 괜찮다');
assert(C.features(t, 'work', 'mechanic_overalls').includes('strap') && C.features(t, 'work', 'office_blouse_skirt').includes('collar'), '일터 옷의 손 자세 특징');
assert(!C.allPlaces(t).find(p => p.key === 'train_sleeper').eras.includes('heritage'), '기차 침대칸은 지금만');

console.log('casual-tree-v2 모듈 ok — 추천×장소', pairs, '· 랜덤 300 · 바꾸기 200');
