/* 일상컷 트리 표 ↔ 생성기 표 — 자세 계열의 자세·방향 열쇠가 생성기에 있다. node tests/casual-tree.cjs */
const assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
global.window = global; require('../lib/prompt-spec.js'); require('../lib/casual-tree.js');
const S = window.AtelierSpec, tree = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/casual-tree.json'), 'utf8'));
const poses = new Set(S.CASUAL_POSES.map(r => r[0]).filter(Boolean)), orients = new Set(S.CASUAL_ORIENTS.map(r => r[0]).filter(Boolean));
for (const [k, f] of Object.entries(tree.families)) {
  for (const p of f.poses) assert(poses.has(p), k + ' 자세 ' + p);
  for (const o of f.orients) assert(orients.has(o), k + ' 방향 ' + o);
}
/* 눕기 계열엔 등 쪽·뒤돌아보기 방향이 없다 — 해먹에 누워 등을 돌리고 다리를 늘어뜨리라 해서 몸이 반 바퀴 비틀렸다(조조전 일상4, 2026-10-29) */
for (const o of [...S.LOOK_BACK.orient, 'back_to_camera', 'walking_away']) assert(!tree.families.lie.orients.includes(o), '눕기 계열에 ' + o);
/* 서기·움직임 계열엔 「뒤로 젖혀 기대기(받침 필요)」 가 없다 — 「인사하며 숙이기」 에 붙어 부딪혔다(조조전 일상2) */
for (const f of ['stand', 'move']) assert(!tree.families[f].orients.includes('leaning_back'), f + ' 계열에 뒤로 젖히기');
/* 어느 자세도 한 계열에는 든다 — 고를 수 없는 자세가 없게 */
const used = new Set(Object.values(tree.families).flatMap(f => f.poses));
for (const p of poses) assert(used.has(p), '어느 자세 계열에도 없는 자세 ' + p);
/* 화면·조립이 쓰는 lib/casual-tree.js 와 검사기 tools/casual-tree.py 가 같은 길을 센다 */
const CT = window.AtelierCasualTree;
let paths = 0;
for (const e of tree.eras) for (const p of CT.places(tree, e.key, null)) for (const a of CT.acts(tree, e.key, p.key)) {
  paths++;
  assert(CT.outfitFamilies(tree, e.key, p.key, a.key).length, e.key + ' ' + p.key + ' ' + a.key + ' 옷 계열');
}
const py = require('node:child_process').execFileSync('python3', [path.join(__dirname, '../tools/casual-tree.py'), 'check'], { encoding: 'utf8' });
assert.equal(paths, Number(/길 (\d+)/.exec(py)[1]), '검사기와 길 수가 같다');
/* 추천 조합을 채우면 고칠 것이 없다 — 다 트리 위의 길 */
for (const pr of tree.presets) {
  const sc = CT.applyPreset(tree, {}, pr.key), r = CT.repair(tree, sc, null, S.CLOSE_FRAMES);
  for (const k of ['era', 'place', 'act', 'ofam', 'item']) assert.equal(r[k], sc[k], pr.key + ' ' + k);
}
/* 칸끼리 규칙(GTA V 계획에서 걸린 것들) — 화면·랜덤·계획기가 다 이 함수를 쓴다 */
for (const k of used) assert(tree.pose_meta[k], '자세 표에 없는 자세 ' + k);
const gp = f => CT.poses(tree, 'gala_dinner', f);
assert(gp('full_body').includes('sitting') && !gp('full_body').includes('cross_legged') && !gp('full_body').includes('perched_seat'), '식탁 만찬 — 의자 자세만');
assert(!gp('full_body').includes('hands_in_hair') && !gp('full_body').includes('holding_cup'), '잔 드는 하는 일 — 손 쓰는 자세 없음');
assert(CT.poses(tree, 'car_lean', 'full_body').includes('hand_on_hip') && !CT.poses(tree, 'take_photo', 'full_body').includes('hand_on_hip'), '빈 손 하는 일에만 허리에 손');
assert(!CT.poses(tree, 'stroll', 'face_close').includes('walking') && !CT.poses(tree, 'car_lean', 'face_close').includes('standing_relaxed') && CT.poses(tree, 'car_lean', 'face_close').includes('hands_in_hair'), '클로즈업 — 얼굴 쪽 자세만');
assert(!CT.poses(tree, 'car_lean', 'chest_up').includes('hand_on_hip') && CT.poses(tree, 'car_lean', 'waist_up').includes('hand_on_hip'), '허리에 손은 허리 위부터');
assert.deepEqual(CT.poses(tree, 'sunbed', 'full_body'), [], '눕기 — 하는 일이 자세');
assert(CT.items(tree, 'swimwear', 'full_body').some(i => i.key === 'cutout_onepiece') && !CT.items(tree, 'swimwear', 'face_close').some(i => i.key === 'cutout_onepiece'), '클로즈업엔 허리 컷아웃 수영복 없음');
for (const o of tree.outfits) for (const f of ['face_close', 'chest_up']) assert(CT.items(tree, o.key, f).length, o.key + ' ' + f + ' 에 고를 옷');
assert(!CT.lensOk(tree, 'three_quarter', 'documentary35') && !CT.lensOk(tree, 'face_close', 'wide24') && CT.lensOk(tree, 'full_body', 'wide24') && CT.lensOk(tree, 'face_close', ''), '광각 규칙');
assert(!CT.exprOk(tree, { act: 'stargaze', orient: 'back_to_camera' }) && !CT.exprOk(tree, { act: 'karaoke_sing', orient: 'front' }) && CT.exprOk(tree, { act: 'stargaze', orient: 'front' }), '표정 규칙');
assert(!CT.frameOk(tree, 'swim', 'full_body') && !CT.frameOk(tree, 'soak', 'environmental') && CT.frameOk(tree, 'swim', 'waist_up') && CT.frameOk(tree, 'stroll', 'full_body'), '수영·탕 — 전신·환경 컷 없음');
assert.equal(CT.repair(tree, { era: 'now', place: 'water_pool', act: 'swim', ofam: 'swimwear', frame: 'full_body' }, null, S.CLOSE_FRAMES).frame, '', '수영으로 바꾸면 전신은 비운다');
for (const it of ['hollywood_bias', 'low_back_evening', 'column_gown']) assert(!CT.items(tree, it === 'hollywood_bias' ? 'retro' : 'evening', 'chest_up').some(i => i.key === it), '등이 알아볼 데인 옷은 가슴 위에 없다 ' + it);
assert(!CT.orients(tree, 'cooking', 'chest_up', S.CLOSE_FRAMES).includes('rear_3q') && CT.orients(tree, 'cooking', 'waist_up', S.CLOSE_FRAMES).includes('rear_3q') && CT.orients(tree, 'cooking', 'chest_up', S.CLOSE_FRAMES).includes('over_shoulder'), '가슴 위엔 등 쪽 방향 없음, 어깨 너머는 된다');
assert(CT.poses(tree, 'stroll', 'chest_up').includes('finger_to_lips') && !CT.poses(tree, 'gala_dinner', 'full_body').includes('finger_to_lips') && !CT.poses(tree, 'stair_pause', 'full_body').includes('finger_to_lips'), '쉿 — 얼굴 쪽·손 쓰는 자세(난간 잡은 하는 일엔 없다 — 팔이 셋 나왔다)');
assert(!CT.orients(tree, 'stroll', 'full_body', S.CLOSE_FRAMES, 'finger_to_lips').includes('back_to_camera') && CT.orients(tree, 'stroll', 'full_body', S.CLOSE_FRAMES, 'finger_to_lips').includes('over_shoulder'), '쉿엔 등 쪽 방향 없음, 어깨 너머는 된다');
assert.equal(CT.repair(tree, { era: 'now', place: 'street_shop', act: 'stroll', ofam: 'everyday', frame: 'full_body', orient: 'back_to_camera', pose: 'finger_to_lips' }, null, S.CLOSE_FRAMES).orient, '', '쉿을 고르면 등 돌림은 비운다');
assert(CT.poses(tree, 'interview', 'chest_up').includes('thumbs_up') && !CT.poses(tree, 'interview', 'face_close').includes('thumbs_up') && !CT.orients(tree, 'interview', 'full_body', S.CLOSE_FRAMES, 'thumbs_up').includes('back'), '엄지 척 — 가슴 앞 손, 얼굴이 보이게');
const fixed = CT.repair(tree, { era: 'now', place: 'evening_gala', act: 'gala_dinner', ofam: 'evening', frame: 'face_close', pose: 'cross_legged', lens: 'wide24', expr: 'calm', orient: 'front' }, null, S.CLOSE_FRAMES);
assert(!fixed.pose && !fixed.lens && fixed.expr === 'calm', '고치기 — 맞지 않는 자세·광각은 비우고 표정은 둔다');
assert.equal(CT.repair(tree, { ...fixed, orient: 'back_to_camera', frame: 'full_body' }, null, S.CLOSE_FRAMES).expr || '', '', '등을 보이면 표정을 비운다');
/* 왜 못 고르나(why) · 해방(unlocked) — 허브 통합 생성기(2026-10-29, game 과 같은 모듈). 트리 안 값은 null, 밖 값은 까닭 코드. 해방한 칸은 고치지 않는다 */
{
  const close = S.CLOSE_FRAMES || [], sc = { era: tree.eras[0].key };
  for (const k of ['place', 'act', 'ofam', 'frame']) sc[k] = CT.choices(tree, sc, k, null, close)[0];
  for (const k of ['place', 'act', 'ofam', 'frame', 'pose', 'orient']) for (const v of CT.choices(tree, sc, k, null, close))
    assert.equal(CT.why(tree, sc, k, v, null, close), null, k + ' ' + v + ' 는 고를 수 있다');
  const farPlace = tree.places.find(p => !CT.places(tree, sc.era).some(q => q.key === p.key));
  if (farPlace) assert(CT.why(tree, sc, 'place', farPlace.key), farPlace.key + ' 는 까닭이 붙는다');
  assert.equal(CT.why(tree, sc, 'place', 'nope').code, 'unknown');
  const outPose = [...poses].find(p => !CT.poses(tree, sc.act, sc.frame).includes(p));
  assert(CT.why(tree, sc, 'pose', outPose), outPose + ' 는 트리 밖');
  assert.equal(CT.repair(tree, { ...sc, pose: outPose, unlocked: ['pose'] }, null, close).pose, outPose, '해방한 자세는 그대로');
  assert.equal(CT.repair(tree, { ...sc, pose: outPose }, null, close).pose || '', '', '해방 안 했으면 비운다');
  assert(CT.unlocked({ pose: outPose, unlocked: ['pose'] }, 'pose') && !CT.unlocked({ pose: '', unlocked: ['pose'] }, 'pose'), '빈 칸은 해방이 아니다');
}
console.log(`PASS 일상컷 트리 ↔ 생성기: 자세 계열 ${Object.keys(tree.families).length} · 자세 ${used.size} · 방향 열쇠 · 길 ${paths}(검사기와 같다) · 추천 조합 ${tree.presets.length} · 칸끼리 규칙(앉는 자리·손·보이는 부위·허리 아래 옷·광각·표정)`);
