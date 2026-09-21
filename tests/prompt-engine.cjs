/* 프롬프트가 화면 없이 끝까지 나오나 — 마흔 자루 × 출력 셋 × 화풍 열넷.
   Run: node tests/prompt-engine.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lib/prompt-spec.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('lib/prompt-myth.js', 'utf8'), ctx);
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

const BUDGET = { portrait: 460, awaken: 260, casual: 420 };
let n = 0, longest = { w: 0 };
for (const card of data.cards) for (const output of Object.keys(S.OUTPUTS)) for (const style of S.STYLES) {
  const st = { card: card.name, style: style[0], output, params: {} };
  const text = P.build(st, data), w = P.words(text);
  n++;
  assert(text.startsWith('WEAPON: ' + card.en + ' (' + card.name + ')'), card.name + ' 이름이 앞에');
  assert(text.includes(style[2]), card.name + ' ' + style[0] + ' 화풍 문장');
  assert(text.includes(S.OUTPUTS[output].text), '출력 문장');
  assert(w <= BUDGET[output], card.name + ' ' + output + ' ' + style[0] + ' 낱말 ' + w + ' > ' + BUDGET[output]);
  if (w > longest.w) longest = { w, card: card.name, output, style: style[0] };
  assert(!/포켓몬|mecha|armor form|pokemon/i.test(text), '앞 저장소의 말이 남았다');
  if (output === 'awaken') {
    assert(/attached/.test(text) && !text.includes('ACTION:') && !text.includes('IDENTITY:'), '각성은 첨부 그림을 따르고 동작·외형을 다시 말하지 않는다');
  } else {
    assert(text.includes(S.MYTH_FLAVOR[card.myth]), '신화권 언어');
    assert(text.includes('Facial ethnicity: ' + S.PARAMS[0].auto[card.myth]), '자동이면 신화권이 얼굴 계통을 정한다');
  }
  if (output === 'portrait') assert(text.includes('POSTURE: ' + S.ACTIONS[card.kind][0][2]), '기본 자세는 종류의 첫 것');
  if (output === 'casual') assert(!text.includes('POSTURE:'), '일상컷에는 자세가 없다');
  if (output !== 'awaken') {
    assert(text.includes('WEAPON LOOK') && text.includes(card.look), '무기의 시각 언어가 실린다');
    assert(text.includes(S.KIND_SILHOUETTE[card.kind]) && text.includes('personified'), '무기가 곧 그녀');
    assert(text.indexOf('WEAPON LOOK') < text.indexOf('STYLE:') && text.indexOf('EMBODIMENT') < text.indexOf('POSTURE') || output === 'casual', '차례: 무기 → 화풍 → 규격 → 의인화 → 자세');
    assert(!/held prop\b.*\bin her hands\b/.test(text) && !text.includes('must be in the frame, in her hands'), '"손에 든 무기" 규칙은 지웠다');
  }
}

/* 선택이 반영된다 */
{
  const st = { card: '묠니르', style: 'ink_wash', output: 'portrait', action: 'shoulder', scene: 'stormy cliff at dusk',
    params: { ethnicity: '__custom__', ethnicity_custom: 'Sami', hairColor: 'crimson', expression: '__custom__', expression_custom: 'fierce' } };
  const t = P.build(st, data);
  assert(t.includes('POSTURE: ' + S.ACTIONS.blunt[1][2]) && t.includes('SCENE NOTE: stormy cliff at dusk'));
  assert(t.includes('BASE \u2014 Facial ethnicity: Sami.') && t.includes('HAIR \u2014 Hair color: crimson.') && t.includes('FACE \u2014 Expression: fierce.'), t);
  assert(!t.includes('Apparent age:') && !t.includes('BUILD \u2014') && !t.includes('SHOT \u2014'), '비운 것은 줄도 묶음도 없다');
  /* 서른아홉 칸을 다 채워도 예산 안 */
  const all = {}; for (const p of S.PARAMS) { const o = p.options.find(x => x[0] && x[0] !== '__custom__'); if (o) all[p.key] = o[0]; }
  const full = P.build({ card: '묠니르', style: 'glossy_promo', output: 'portrait', params: all, scene: 'stormy cliff at dusk' }, data);
  assert(P.words(full) <= 650, '다 채우면 ' + P.words(full) + '낱말 — 650 넘음');
  for (const g of S.PARAM_GROUPS) assert(full.includes(g[0].toUpperCase() + ' \u2014 '), g[0] + ' 묶음 줄');
  assert.equal(P.fileName(st, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f.webp');
  assert.equal(P.fileName({ ...st, output: 'awaken' }, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f_awaken.webp');
  assert.equal(P.fileName({ ...st, output: 'casual', casualIndex: 3 }, P.cardOf(data, '아킬레우스의 창')), '아킬레우스의_창_ink_wash_f_casual3.webp');
  assert.equal(P.build({ card: '없는 무기', params: {} }, data), '', '없는 카드는 빈 문자열');
  /* 파일 이름은 등록기의 규칙과 맞물린다: <카드>_<화풍>_f[_awaken|_casualN].webp */
  assert(/^[^_]+_[a-z_]+_f(_awaken|_casual\d+)?\.webp$/.test(P.fileName({ ...st, output: 'casual', casualIndex: 2 }, P.cardOf(data, '묠니르'))));
}
console.log('PASS 프롬프트 ' + n + '개 — 가장 긴 것 ' + longest.w + '낱말 (' + longest.card + ' · ' + longest.output + ' · ' + longest.style + ')');
