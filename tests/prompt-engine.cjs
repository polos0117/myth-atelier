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
for (const k of data.group.kind.order) assert(S.ACTIONS[k] && S.ACTIONS[k].length >= 3, k + ' 의 동작');

const BUDGET = { portrait: 330, awaken: 220, casual: 300 };
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
  if (output === 'portrait') assert(text.includes('ACTION: ' + S.ACTIONS[card.kind][0][2]), '기본 동작은 종류의 첫 것');
  if (output === 'casual') assert(!text.includes('ACTION:'), '일상컷에는 동작이 없다');
}

/* 선택이 반영된다 */
{
  const st = { card: '묠니르', style: 'ink_wash', output: 'portrait', action: 'shoulder', scene: 'stormy cliff at dusk',
    params: { ethnicity: '__custom__', ethnicity_custom: 'Sami', hairColor: 'crimson', expression: 'fierce' } };
  const t = P.build(st, data);
  assert(t.includes('ACTION: ' + S.ACTIONS.blunt[1][2]) && t.includes('SCENE NOTE: stormy cliff at dusk'));
  assert(t.includes('Facial ethnicity: Sami.') && t.includes('Hair color: crimson.') && t.includes('Expression: fierce.'));
  assert(!t.includes('Apparent age:'), '비운 것은 줄이 없다');
  assert.equal(P.fileName(st, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f.webp');
  assert.equal(P.fileName({ ...st, output: 'awaken' }, P.cardOf(data, '묠니르')), '묠니르_ink_wash_f_awaken.webp');
  assert.equal(P.fileName({ ...st, output: 'casual', casualIndex: 3 }, P.cardOf(data, '아킬레우스의 창')), '아킬레우스의_창_ink_wash_f_casual3.webp');
  assert.equal(P.build({ card: '없는 무기', params: {} }, data), '', '없는 카드는 빈 문자열');
  /* 파일 이름은 등록기의 규칙과 맞물린다: <카드>_<화풍>_f[_awaken|_casualN].webp */
  assert(/^[^_]+_[a-z_]+_f(_awaken|_casual\d+)?\.webp$/.test(P.fileName({ ...st, output: 'casual', casualIndex: 2 }, P.cardOf(data, '묠니르'))));
}
console.log('PASS 프롬프트 ' + n + '개 — 가장 긴 것 ' + longest.w + '낱말 (' + longest.card + ' · ' + longest.output + ' · ' + longest.style + ')');
