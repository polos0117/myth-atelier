/* 프롬프트가 화면 없이 끝까지 나오나 — 마흔 자루 × 출력 셋 × 화풍 열넷.
   Run: node tests/prompt-engine.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lib/prompt-spec.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('lib/prompt-myth.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('lib/prompt-random.js', 'utf8'), ctx);
const R = ctx.window.AtelierSceneRandom;
const S = ctx.window.AtelierSpec, P = ctx.window.AtelierPrompt;
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, group: d('group'), skills: d('skill').skills };
const styleJson = d('style');

/* 화풍 표와 data/style.json 은 같은 열쇠·이름 — 파일 이름에 들어간다 */
assert.equal(JSON.stringify(S.STYLES.map(s => [s[0], s[1]])), JSON.stringify(styleJson.styles.map(s => [s.key, s.name])), 'lib/prompt-spec.js 의 STYLES 와 data/style.json 이 다르다');
assert(S.STYLES.every(s => s[2].length > 80), '화풍마다 core 문장');
assert(S.STYLES.some(s => s[0] === S.DEFAULT_STYLE), '기본 화풍이 표에 있다');
for (const k of data.group.myth.order) assert(S.MYTH_FLAVOR[k], k + ' 의 옷·재질 언어');
for (const k of data.group.kind.order) assert(S.ACTIONS[k] && S.ACTIONS[k].length >= 3 && S.KIND_SILHOUETTE[k], k + ' 의 자세와 실루엣');
assert.equal(S.PARAMS[0].key, 'ethnicity', '첫 칸은 얼굴 계통 — 자동 규칙이 본다');
assert(S.PARAMS.length >= 35, '세부 선택이 서른다섯은 넘어야 앞 생성기만큼이다');
for (const p of S.PARAMS) {
  assert(S.PARAM_GROUPS.some(g => g[0] === p.group), p.key + ' 의 묶음 ' + p.group);
  assert(p.options[0][0] === '' && p.options.length >= 2, p.key + ' 의 첫 선택은 자동');
  assert(/^[a-zA-Z0-9]+$/.test(p.key), p.key + ' — 열쇠는 영문 한 낱말(화면 id 가 된다)');
}
assert.equal(new Set(S.PARAMS.map(p => p.key)).size, S.PARAMS.length, '열쇠가 겹친다');

const BUDGET = { portrait: 320, awaken: 260, cursed: 290, casual: 560, skin: 300 };
let n = 0, longest = { w: 0 };
for (const card of data.cards) for (const output of Object.keys(S.OUTPUTS)) for (const style of S.STYLES) {
  const st = { card: card.name, style: style[0], output, params: {} };
  const text = P.build(st, data), w = P.words(text);
  if (output === 'skin' && !(card.skins || []).length) { assert.equal(text, '', card.name + ' — 스킨이 없으면 스킨 문장도 없다'); continue; }
  n++;
  assert(text.startsWith((output === 'casual' ? 'CHARACTER: ' : 'WEAPON: ') + card.en + ' (' + card.name + ')'), card.name + ' 이름이 앞에');
  assert(text.includes(style[2]), card.name + ' ' + style[0] + ' 화풍 문장');
  assert(text.includes(S.OUTPUTS[output].text), '출력 문장');
  assert(w <= BUDGET[output], card.name + ' ' + output + ' ' + style[0] + ' 낱말 ' + w + ' > ' + BUDGET[output]);
  if (w > longest.w) longest = { w, card: card.name, output, style: style[0] };
  assert(!/포켓몬|armor form|pokemon|overdrive/i.test(text), '앞 저장소의 말이 남았다');
  if (output === 'skin') {
    const sk = card.skins[0];
    assert(/attached/.test(text) && !text.includes('SUBJECT:') && !text.includes('IDENTITY'), '스킨은 첨부 그림을 따르고 뼈대·외형을 다시 말하지 않는다');
    assert(text.includes('SKIN LOOK') && text.includes(sk.look) && text.indexOf('WEAPON LOOK') < text.indexOf('SKIN LOOK'), '스킨 묘사가 무기 묘사 뒤에');
    assert.equal(P.fileName(st, card), card.name.replace(/ /g, '_') + '_' + style[0] + '_f_skin_' + sk.key + '.webp', '스킨 파일 이름');
  }
  if (output === 'awaken' || output === 'cursed') {
    assert(/attached/.test(text) && !text.includes('SUBJECT:') && !text.includes('IDENTITY'), '각성·저주는 첨부 그림을 따르고 뼈대·외형을 다시 말하지 않는다');
    if (output === 'cursed') assert(text.includes('red-violet') && text.includes('silver plates stay silver'), '저주는 룬이 오염되고 장갑은 그대로');
  } else if (output === 'portrait') {
    assert(text.includes('Facial ethnicity: ' + S.PARAMS[0].auto[card.myth]), '자동이면 신화권이 얼굴 계통을 정한다');
  }
  assert(!text.includes('POSTURE:'), '자세는 고를 때만 붙는다');
  assert(!text.includes('fused to a limb'), '팔이 창이 되게 한 문장은 지웠다');
  if (output === 'casual') {
    assert(text.includes(S.CASUAL_RULES.input) && text.includes(S.CASUAL_RULES.project) && text.includes(S.CASUAL_RULES.material) && text.includes(S.CASUAL_RULES.final), '일상컷 규칙 넷');
    assert(!text.includes('SUBJECT:') && !text.includes('IDENTITY') && !text.includes('plates, joints'), '일상컷에는 뼈대·외형·메카 문장이 없다');
    assert(!text.includes('CATEGORY:') && !text.includes('SCENE DETAILS'), '갈래를 안 고르면 갈래 줄이 없다');
  } else if (output === 'portrait') {
    assert(text.includes('WEAPON LOOK') && text.includes(card.look), '무기의 시각 언어가 실린다');
    assert(text.includes('SUBJECT: ' + S.CORE.mecha.replace('{weapon}', card.en)), '뼈대는 메카 의인화 한 문단');
    assert(text.includes('does NOT hold') && text.includes('Both hands are ordinary human hands'), '무기를 들지 않고 손은 손이다');
    assert(!text.includes('EMBODIMENT') && !text.includes('SILHOUETTE:') && !text.includes(S.MYTH_FLAVOR[card.myth]), '선택 문단은 기본에서 꺼져 있다');
    assert(text.indexOf('WEAPON LOOK') < text.indexOf('STYLE:') && text.indexOf('STYLE:') < text.indexOf('SUBJECT:') && text.indexOf('SUBJECT:') < text.indexOf('OUTPUT:'), '차례: 무기 → 시각 언어 → 화풍 → 뼈대 → 규격');
  }
}

/* 선택이 반영된다 */
{
  const st = { card: '묠니르', style: 'ink_wash', output: 'portrait', action: 'shoulder', scene: 'stormy cliff at dusk',
    design: 'cloth', extras: { embodiment: true, silhouette: true, myth: true },
    params: { ethnicity: '__custom__', ethnicity_custom: 'Sami', hairColor: 'crimson', expression: '__custom__', expression_custom: 'fierce' } };
  const t = P.build(st, data);
  assert(t.includes('POSTURE: ' + S.ACTIONS.blunt[1][2]) && t.includes('SCENE NOTE: stormy cliff at dusk'));
  assert(t.includes('SUBJECT: ' + S.CORE.cloth.replace('{weapon}', 'Mjolnir')) && !t.includes('mecha personification'), '설계 언어를 천으로');
  assert(t.includes(S.EMBODIMENT) && t.includes(S.KIND_SILHOUETTE.blunt) && t.includes(S.MYTH_FLAVOR.norse), '켠 문단 셋이 붙는다');
  assert(t.indexOf('OUTPUT:') < t.indexOf('EMBODIMENT') && t.indexOf(S.MYTH_FLAVOR.norse) < t.indexOf('POSTURE:'), '선택 문단은 규격 뒤, 자세 앞');
  assert(!S.EMBODIMENT.includes('fused') && S.EMBODIMENT.includes('never in or as a hand'), '재질 옮기기도 손은 건드리지 않는다');
  /* 견본과 팔레트는 옵션값과 맞물린다 */
  for (const k of ['body', 'hairStyle']) {
    const vals = S.PARAMS.find(p => p.key === k).options.map(o => o[0]);
    assert(S.FIGURE_VALUES[k].length >= 15 && S.FIGURE_VALUES[k].every(v => vals.includes(v)), k + ' 견본은 옵션값이어야 한다');
    assert.equal(P.figureURL(k, S.FIGURE_VALUES[k][0]), S.FIGURE_BASE + (k === 'body' ? 'body' : 'hair') + '-female-' + S.FIGURE_VALUES[k][0].replace(/ /g, '-') + '.png');
    assert.equal(P.figureURL(k, 'nope'), '');
  }
  for (const k of Object.keys(S.COLOR_KEYS)) {
    const vals = S.PARAMS.find(p => p.key === k).options.map(o => o[0]).filter(v => v && v !== '__custom__');
    assert(vals.length >= 15 && vals.every(v => /^#[0-9A-Fa-f]{6}$/.test(S.COLOR_HEX[v] || '')), k + ' 의 색마다 hex');
  }
  assert(t.includes('BASE \u2014 Facial ethnicity: Sami.') && t.includes('HAIR \u2014 Hair color: crimson.') && t.includes('FACE \u2014 Expression: fierce.'), t);
  assert(!t.includes('Apparent age:') && !t.includes('BUILD \u2014') && !t.includes('SHOT \u2014'), '비운 것은 줄도 묶음도 없다');
  /* 서른아홉 칸을 다 채워도 예산 안 */
  const all = {}; for (const p of S.PARAMS) { const o = p.options.find(x => x[0] && x[0] !== '__custom__'); if (o) all[p.key] = o[0]; }
  const full = P.build({ card: '묠니르', style: 'glossy_promo', output: 'portrait', params: all, scene: 'stormy cliff at dusk', action: 'overhead', extras: { embodiment: true, silhouette: true, myth: true } }, data);
  assert(P.words(full) <= 700, '다 켜고 다 채우면 ' + P.words(full) + '낱말 — 700 넘음');
  for (const g of S.PARAM_GROUPS) assert(full.includes(g[0].toUpperCase() + ' \u2014 '), g[0] + ' 묶음 줄');
  assert.equal(P.fileName(st, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f.webp');
  assert.equal(P.fileName({ ...st, output: 'awaken' }, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f_awaken.webp');
  assert.equal(P.fileName({ ...st, output: 'cursed' }, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f_cursed.webp');
  assert.equal(P.fileName({ ...st, output: 'casual', casualIndex: 3 }, P.cardOf(data, '아킬레우스의 창')), '아킬레우스의_창_ink_wash_f_casual3.webp');
  assert.equal(P.build({ card: '없는 무기', params: {} }, data), '', '없는 카드는 빈 문자열');
  /* 파일 이름은 등록기의 규칙과 맞물린다: <카드>_<화풍>_f[_awaken|_casualN].webp */
  assert(/^[^_]+_[a-z_]+_f(_awaken|_cursed|_casual\d+)?\.webp$/.test(P.fileName({ ...st, output: 'casual', casualIndex: 2 }, P.cardOf(data, '묠니르'))));
}
/* 일상컷 — 갈래·예시·자세·축·랜덤 */
{
  assert(S.CASUAL_CATS.length >= 15 && S.CASUAL_CATS.every(r => r[0] === 'auto_random' || r[0] === '__custom__' || r[2].length > 60), '갈래마다 영어 지시');
  for (const r of S.CASUAL_CATS) assert(S.CASUAL_EXAMPLES[r[0]], r[0] + ' 의 예시 목록');
  for (const ax of S.CASUAL_AXES) {
    assert(S.CASUAL_AXIS_OPTIONS[ax] && S.CASUAL_AXIS_LABELS[ax] && S.CASUAL_AXIS_GUIDES[ax], ax + ' 축의 선택지·이름·설명');
    for (const v of S.CASUAL_AXIS_OPTIONS[ax]) if (v !== 'AUTO') assert(S.CASUAL_AXIS_GUIDES[ax][v] && S.CASUAL_AXIS_GUIDES[ax][v][1], ax + '.' + v + ' 의 영어 문장');
  }
  for (const [cat, rows] of Object.entries(S.CASUAL_EXAMPLES)) for (const r of rows) {
    assert(r[0] === '' || r[0] === '__custom__' || (r[2] && /^[\u0020-\u007e\u00a0-\u024f\u2019\u2014]+$/.test(r[2])), cat + '/' + r[0] + ' 예시 문장은 영어');
    assert(!/포켓몬|Pok/i.test(r.join(' ')), cat + '/' + r[0] + ' 에 포켓몬이 남았다');
  }
  assert(!/포켓몬|Pokémon|Pokemon/.test(JSON.stringify([S.CASUAL_CATS, S.CASUAL_EXAMPLES, S.CASUAL_EX_NOTE, S.CASUAL_AXIS_GUIDES, S.CASUAL_RULES])), '일상컷 표에 포켓몬이 남았다');
  const st = { card: '궁니르', style: 'glossy_promo', output: 'casual', params: { frame: 'waist-up framing' },
    casual: { cat: 'heritage_visit', ex: 'museum_glass', pose: 'contrapposto', orient: 'front_3q', expr: 'soft_smile', outfit: 'grey wool coat', scene: 'rainy Oslo', axes: { skin_exposure: 'low', overall_intensity: 'AUTO' } } };
  const t = P.build(st, data), ex = S.CASUAL_EXAMPLES.heritage_visit.find(r => r[0] === 'museum_glass');
  assert(t.includes('CATEGORY: ' + S.CASUAL_CATS.find(r => r[0] === 'heritage_visit')[2]) && t.includes('EXAMPLE SCENE: ' + ex[2]), '갈래와 예시');
  assert(t.includes('pose: ' + S.CASUAL_POSE_EN.contrapposto) && t.includes('orientation: ' + S.CASUAL_ORIENT_EN.front_3q) && t.includes('expression: ' + S.CASUAL_EXPRESSION_EN.soft_smile), '자세·방향·표정은 영어 문장으로');
  assert(t.includes('framing: waist-up framing') && t.includes('outfit and props: grey wool coat') && t.includes('scene: rainy Oslo'), '프레임·의상·장소');
  assert(t.includes('skin exposure: low \u2014 ' + S.CASUAL_AXIS_GUIDES.skin_exposure.low[1]) && !t.includes('overall intensity'), '축은 AUTO 아닌 것만');
  assert(t.includes(S.CASUAL_RULES.priority), '자세를 고르면 우선 규칙');
  assert(P.words(t) <= 700, '일상컷 다 채워도 700 안: ' + P.words(t));
  const tm = P.build({ ...st, casual: { cat: 'motif_editorial', ex: 'runway' } }, data);
  assert(tm.includes('WEAPON LOOK for the fashion translation: ' + data.cards.find(c => c.name === '궁니르').look), '모티브 에디토리얼은 look 을 준다');
  const tc = P.build({ ...st, casual: { cat: '__custom__', catCustom: 'a sauna evening', ex: '__custom__', exCustom: 'towel wrapped, steam' } }, data);
  assert(tc.includes('CATEGORY: a sauna evening') && tc.includes('EXAMPLE SCENE: towel wrapped, steam'), '직접 입력');
  /* 랜덤 — 잠긴 칸은 안 바뀌고, 예시가 잠기면 갈래도 못 돌린다. 난수는 고정 */
  let i = 0; const rng = () => [0.1, 0.6, 0.3, 0.9, 0.5][i++ % 5];
  const base = { cat: 'everyday_basic', ex: 'bookstore', pose: '', orient: '', expr: '', axes: {}, locks: { pose: true } };
  const r1 = R.randomize(base, null, rng);
  assert(r1.pose === '' && r1.cat !== 'everyday_basic' && r1.ex && S.CASUAL_EXAMPLES[r1.cat].some(r => r[0] === r1.ex) && r1.orient && r1.expr && Object.keys(r1.axes).length === S.CASUAL_AXES.length, '잠긴 자세만 그대로, 갈래가 바뀌면 예시는 새 갈래 안에서: ' + JSON.stringify(r1));
  assert(!R.canRandomize({ ...base, locks: { ex: true } }, 'cat') && R.canRandomize(base, 'ex'), '예시가 잠기면 갈래도 못 돌린다');
  const r2 = R.randomize(base, 'ex', rng);
  assert(r2.cat === 'everyday_basic' && r2.ex && r2.ex !== 'bookstore' && S.CASUAL_EXAMPLES.everyday_basic.some(r => r[0] === r2.ex), '예시만 돌리면 갈래 안에서');
  assert(JSON.stringify(R.randomize(base, null, rng)) !== JSON.stringify(base) && JSON.stringify(base) === JSON.stringify({ cat: 'everyday_basic', ex: 'bookstore', pose: '', orient: '', expr: '', axes: {}, locks: { pose: true } }), '원본은 안 건드린다');
}
console.log('PASS 프롬프트 ' + n + '개 — 가장 긴 것 ' + longest.w + '낱말 (' + longest.card + ' · ' + longest.output + ' · ' + longest.style + ')');
