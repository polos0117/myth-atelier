/* 일상컷 버전2 지시문 줄(lib/prompt-myth.js casualLinesV2)과 랜덤(lib/prompt-random.js 버전2 길). node tests/prompt-casual-v2.cjs
   - 장면 treeV 2 + 버전2 표면 버전2 줄, 버전1 기록은 버전1 줄 그대로
   - 손 · 소품은 PROP 한 줄, 하는 일 줄 없음, 무기는 들지 않는다(알아볼 거리 소품 없음)
   - 도장 · 제례 장소면 수련 도구 · 세시 줄, 뒷모습 돌아보기 줄, 얼굴이 안 보이면 표정 없음
   - 추천 마흔일곱 × 카드 여럿 · 랜덤 수백 장면이 다 조립되고 낱말 한도 안 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
global.window = global;
const R0 = path.join(__dirname, '..');
for (const f of ['prompt-spec', 'casual-tree', 'casual-tree-v2', 'prompt-myth', 'prompt-random']) require(path.join(R0, 'lib', f + '.js'));
const S = window.AtelierSpec, P = window.AtelierPrompt, C = window.AtelierCasualTreeV2, R = window.AtelierSceneRandom;
const j = f => JSON.parse(fs.readFileSync(path.join(R0, 'data', f + '.json'), 'utf8'));
const data = { cards: j('card').cards, group: j('group'), skills: j('skill').skills, tree: j('casual-tree'), tree2: j('casual-tree-v2') };
const t = C.make(data.tree2, data.tree);
const seeded = s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const build = (card, casual, style = 'game_keyart') => P.build({ card: card.name, style, output: 'casual', params: {}, casual }, data);
const fx = x => Object.assign({ treeV: 2, era: 'now', place: 'home_living', ofam: 'everyday', posture: 'stand', support: 'none', frame: 'full_body', body: 'front', head: 'with_body', camera: 'eye', right: 'down', left: 'down' }, x);
const card = n => data.cards.find(c => c.name === n);
const mjol = card('묠니르');

/* 1. 버전2 줄 — 출력 · FRAME · 몸 · 손 줄, 하는 일 줄 없음 */
const a = build(mjol, fx({}));
for (const line of [S.CASUAL_RULES.outputV2, S.CASUAL_RULES.frameV2, S.CASUAL_RULES.bodyV2, S.CASUAL_RULES.handsV2, S.CASUAL_RULES.project, S.CASUAL_RULES.wardrobe, 'SCENE (chosen):', 'POSTURE: ', 'COMPOSITION: '])
  assert(a.includes(line), '버전2 줄 ' + line.slice(0, 40));
assert(!a.includes('Activity: ') && !a.includes(S.CASUAL_RULES.priority) && !a.includes(S.OUTPUTS.casual.text), '하는 일 · 버전1 출력 · 우선 줄 없음');
assert(a.startsWith('CHARACTER: Mjolnir (묠니르)'), '첫 줄은 버전1 과 같다');

/* 2. 버전1 기록은 버전1 줄 — 버전2 표가 와도 */
const v1 = build(mjol, { era: 'now', place: 'street_alley', act: 'stroll', ofam: 'everyday' });
assert(v1.includes('Activity: ') && v1.includes(S.OUTPUTS.casual.text) && !v1.includes('POSTURE: '), '버전1 기록은 버전1');
const noTree2 = P.build({ card: mjol.name, style: 'game_keyart', output: 'casual', params: {}, casual: fx({}) }, { ...data, tree2: null });
assert(!noTree2.includes('POSTURE: '), '버전2 표가 없으면 버전1 길');

/* 3. 손 · 소품 — PROP 한 줄, 손 칸은 「PROP 에」 */
const cup = build(mjol, fx({ place: 'street_cafe', posture: 'sit_chair', frame: 'waist_up', right: 'prop', left: 'down', use: 'cup_hold' }));
assert(/PROP: with her own right hand she .*cup/.test(cup) && cup.includes('RIGHT HAND: her own right hand is in PROP'), '소품 한 줄: ' + cup.split('\n').filter(l => /HAND|PROP/.test(l)).join(' | '));

/* 4. 도장 · 제례 — 수련 도구(무기 종류) · 세시(신화 지역) */
const dojo = build(mjol, fx({ place: 'dojo_hall', ofam: 'active' }));
assert(dojo.includes(S.CASUAL_RULES.practiceV2.replace('{tool}', S.CASUAL_PRACTICE.blunt)), '도장의 수련 도구');
const rite = build(mjol, fx({ place: 'rite_hill', ofam: 'traditional' }));
assert(rite.includes(S.CASUAL_RULES.ritesV2.replace('{rites}', S.CASUAL_RITES.norse)), '제례 언덕의 세시');
assert(!a.includes('PRACTICE TOOL') && !a.includes('RITES OF HER REGION'), '거실엔 없다');

/* 5. 시대 — 옛 땅 · 신화 세계 안 · 무대 */
assert(build(mjol, fx({ era: 'heritage', place: 'forge_smithy', ofam: 'work' })).includes(S.CASUAL_RULES.era.replace('{myth}', 'Norse')), '옛 땅 ERA');
const world = build(mjol, fx({ era: 'in_myth', place: 'myth_place', ofam: 'everyday' }));
assert(world.includes(S.CASUAL_RULES.world.replace('{myth}', 'Norse')) && world.includes('Place: the place named in WORLD'), '신화 세계 안 WORLD');

/* 6. 뒷모습 돌아보기 · 얼굴이 안 보이면 표정 없음 */
const back = build(mjol, fx({ body: 'back', head: 'over_shoulder', gaze: 'camera', expr: 'calm' }));
assert(back.includes(S.CASUAL_RULES.lookBackV2) && back.includes("over her own left shoulder") && back.includes('EXPRESSION: '), '돌아보기 줄 · 왼쪽 어깨 · 표정');
const hidden = build(mjol, fx({ body: 'back', head: 'with_body', gaze: 'horizon', expr: 'calm' }));
assert(!hidden.includes('EXPRESSION: ') && !hidden.includes('LOOK-BACK'), '얼굴이 안 보이면 표정 · 돌아보기 없음');
assert(build(mjol, fx({ expr: 'wink' })).includes('one eye closed in a playful wink'), '윙크 표정');
assert(!build(mjol, fx({ expr: 'pensive' })).includes('gaze angled down'), '표정 문장의 시선 말은 뗀다');

/* 7. 세부 축 — 액션 비중은 버전2 에서 안 싣는다 */
const ax = build(mjol, fx({ axes: { skin_exposure: 'moderate', action_level: 'mostly active' } }));
assert(ax.includes('skin exposure: moderate') && !ax.includes('action level'), '세부 축');

/* 8. 추천 × 카드 여럿, 랜덤 수백 — 다 조립되고 무기는 들지 않으며 낱말 한도 안 */
const LIMIT = 940;   // 가장 긴 조합(긴 화풍 · 축 넷 · 크롭 · 옛 땅 · 돌아보기) 923. 버전1 일상컷 한도(760)보다 크다 — 손 · 다리 · 시선 · 받침이 한 줄씩(book 은 800, 신화는 무기 몫 · 세시 줄이 더 있다)
let longest = 0, n = 0;
const some = data.cards.filter((_, i) => i % 23 === 0);
for (const c of some) for (const pr of t.v2.presets) {
  const base = C.repair(t, { treeV: 2, era: 'now', place: 'home_living', ofam: 'everyday' }, c);
  if (!C.presetOk(t, base, pr.key, c)) continue;
  const txt = build(c, C.repair(t, C.applyPreset(t, base, pr.key), c));
  longest = Math.max(longest, P.words(txt)); n++;
}
const rnd = seeded(5);
for (let i = 0; i < 400; i++) {
  const c = data.cards[i % data.cards.length];
  const sc = Object.assign(C.random(t, { treeV: 2 }, c, rnd, [], { preset: i % 2 === 0 }), { expr: i % 3 ? 'soft_smile' : '', axes: { skin_exposure: 'bold', weapon_influence: 'strong' } });
  const txt = build(c, sc, S.STYLES[i % S.STYLES.length][0]);
  assert(txt.includes('SCENE (chosen):') && !txt.includes('Activity: ') && !/her weapon's signature object/.test(txt), c.name + ' 랜덤 ' + i);
  assert(!/PROP: [^\n]*(sword|spear|hammer|blade)\b/i.test(txt), c.name + ' 무기를 소품으로 들지 않는다');
  longest = Math.max(longest, P.words(txt)); n++;
}
assert(longest <= LIMIT, '가장 긴 버전2 일상컷 ' + longest + '낱말 — ' + LIMIT + ' 넘음');

/* 9. 랜덤(lib/prompt-random.js 버전2 길) — 잠근 칸은 그대로, 뒤 칸은 다시 검사 */
const rc = { tree: data.tree, tree2: data.tree2, card: mjol };
const s0 = Object.assign(C.repair(t, fx({ era: 'in_myth', place: 'myth_bath', ofam: 'bath' }), mjol), { locks: { era: true, place: true }, axes: {} });
assert(R.isV2(s0, rc) && !R.isV2(s0, { tree: data.tree }), '버전2 길');
const f0 = R.fields(s0, rc);
assert(f0.posture.length && f0.right.length && !('act' in f0) && !('axes.action_level' in f0) && 'axes.skin_exposure' in f0, '버전2 칸');
assert(!R.canRandomize(s0, 'era', rc) && !R.canRandomize(s0, 'place', rc) && R.canRandomize(s0, 'posture', rc), '잠근 칸은 못 돌린다');
const rr = seeded(9);
for (let i = 0; i < 60; i++) {
  const all = R.randomize(s0, null, rr, rc);
  assert(all.era === 'in_myth' && all.place === 'myth_bath' && all.treeV === 2 && all.locks.era, '다 뽑기 — 잠근 시대 · 장소 그대로');
  for (const k of C.ORDER) if (all[k]) assert.equal(C.why(t, all, k, all[k], mjol), null, '다 뽑기 뒤 ' + k + '=' + all[k]);
  const one = R.randomize(all, 'right', rr, rc);
  for (const k of C.ORDER) if (one[k]) assert.equal(C.why(t, one, k, one[k], mjol), null, '한 칸 뒤 ' + k + '=' + one[k]);
  assert(one.place === 'myth_bath', '한 칸 뽑기도 잠근 장소 그대로');
}
const hidden2 = C.repair(t, fx({ body: 'back', head: 'with_body', gaze: 'horizon' }), mjol);
assert.equal(R.fields({ ...hidden2, locks: {} }, rc).expr.length, 0, '얼굴이 안 보이면 표정은 뽑지 않는다');

console.log('PASS 일상컷 버전2 지시문 ' + n + '개 — 가장 긴 것 ' + longest + '낱말 · 랜덤 60');
