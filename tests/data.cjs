/* 자료가 서로 맞는지 — card.json · group.json · skill.json · style.json · img.json.
   그림 등록 워크플로가 되커밋하기 전에 이것을 돌린다. 자료가 갈리면 화면이 조용히 빈칸이 된다.
   Run: node tests/data.cjs */
const fs = require('node:fs'), assert = require('node:assert/strict');
const read = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const card = read('card'), group = read('group'), skill = read('skill'), style = read('style'), img = read('img');

const cards = card.cards;
assert(Array.isArray(cards) && cards.length >= 40, '카드가 마흔 자루는 되어야 한다');
const names = new Set(), ens = new Set();
const FIELDS = ['name', 'en', 'myth', 'kind', 'cost', 'hp', 'atk', 'spd', 'range', 'skill', 'wielder', 'text', 'look', 'curse'];
for (const c of cards) {
  for (const k of FIELDS) assert(c[k] !== undefined && c[k] !== '', c.name + ' 에 ' + k + ' 가 없다');
  assert(!names.has(c.name), '이름이 겹친다: ' + c.name); names.add(c.name);
  assert(!ens.has(c.en), '영어 이름이 겹친다: ' + c.en); ens.add(c.en);
  assert(group.myth.order.includes(c.myth), c.name + ' 의 신화권 ' + c.myth + ' 이 group.json 에 없다');
  assert(group.kind.order.includes(c.kind), c.name + ' 의 종류 ' + c.kind + ' 이 group.json 에 없다');
  assert(Number.isInteger(c.cost) && c.cost >= 1 && c.cost <= 5, c.name + ' 값은 1~5');
  assert(c.hp > 0 && c.atk > 0 && c.spd >= 0.5 && c.spd <= 1.5, c.name + ' 의 hp·atk·spd');
  assert(['melee', 'reach', 'ranged'].includes(c.range), c.name + ' 의 range');
  assert(skill.skills[c.skill], c.name + ' 의 기술 ' + c.skill + ' 이 skill.json 에 없다');
  /* 이름은 파일 이름이 된다 — 밑줄이 들어가면 공백과 헷갈린다 */
  assert(!/[_/\\]/.test(c.name), c.name + ' 에 밑줄이나 빗금이 있다');
  const cu = c.curse;
  assert(cu && cu.at >= 0.2 && cu.at <= 0.6 && cu.atk >= 0 && cu.atk <= 0.8 && cu.skill >= 0 && cu.skill <= 0.8 && cu.bleed >= 0.01 && cu.bleed <= 0.08 && cu.text, c.name + ' 의 curse 는 {at, atk, skill, bleed, text}');
  assert(/^[ -~\u2019]+$/.test(c.look) && c.look.split(';').length === 3, c.name + ' 의 look 은 영어이고 "재질과 색; 형태; 문양" 세 토막');
}
/* 신화권마다 열 자루, 값은 1~5 골고루 — 상점이 어느 값에서든 카드를 내놓아야 한다 */
for (const m of group.myth.order) {
  const mine = cards.filter(c => c.myth === m);
  assert(mine.length >= 10, m + ' 은 열 자루 이상');
  for (const cost of [1, 2, 3, 4, 5]) assert(mine.some(c => c.cost === cost), m + ' 에 ' + cost + '금 카드가 없다');
}
/* 무기 종류마다 두 자루는 있어야 시너지(2)가 켜질 수 있다 */
for (const k of group.kind.order) assert(cards.filter(c => c.kind === k).length >= 2, k + ' 는 두 자루 이상');

/* 이름표는 축의 모든 열쇠를 안다 */
for (const axis of ['myth', 'kind'])
  for (const k of group[axis].order) {
    assert(group[axis].name[k], axis + '.' + k + ' 의 이름');
    assert(/^#[0-9a-f]{6}$/i.test(group[axis].color[k] || ''), axis + '.' + k + ' 의 색');
  }

/* 기술 — 엔진이 아는 효과만, 쓰이지 않는 기술은 없다 */
const EFFECTS = ['strike', 'sweep', 'volley', 'pierce', 'execute', 'stun', 'heal', 'shield', 'buff', 'rally', 'haste', 'drain'];
const used = new Set(cards.map(c => c.skill));
for (const [k, s] of Object.entries(skill.skills)) {
  assert(s.name && s.text, k + ' 의 이름·설명');
  assert(EFFECTS.includes(s.effect), k + ' 의 효과 ' + s.effect + ' 는 엔진이 모른다');
  if (['buff', 'rally', 'haste'].includes(s.effect)) assert(s.pct > 0 && s.dur > 0, k + ' 의 pct·dur');
  else assert(s.mult > 0, k + ' 의 mult');
  if (['sweep', 'volley'].includes(s.effect)) assert(s.targets >= 1, k + ' 의 targets');
  if (s.effect === 'stun') assert(s.dur >= 1, k + ' 의 dur');
  assert(used.has(k), k + ' 는 어느 카드도 안 쓴다');
}

/* 화풍 열쇠는 파일 이름에 들어가므로 소문자·밑줄만 */
for (const s of style.styles) assert(/^[a-z0-9_]+$/.test(s.key) && s.name, '화풍 ' + s.key);

/* img.json 은 카드와 화풍만 가리킨다. 폼은 없다 */
const styleKeys = new Set(style.styles.map(s => s.key));
for (const [name, e] of Object.entries(img.img || {})) {
  assert(names.has(name), 'img.json 의 ' + name + ' 은 카드가 아니다');
  assert(!e.byForm, name + ' 에 폼이 있다 — 이 놀이에 폼은 없다');
  for (const [k, b] of Object.entries(e.byStyle || {})) {
    assert(styleKeys.has(k), name + ' 의 화풍 ' + k + ' 는 style.json 에 없다');
    for (const slot of Object.keys(b)) assert(['m', 'f', 'awaken', 'cursed', 'casual', 'extra', 'skin'].includes(slot), name + '/' + k + ' 의 칸 ' + slot);
  }
}
/* 스킨 — 열쇠는 영문 소문자·숫자, 카드 안에서 겹치지 않고, 이름·묘사가 있다. img.json 의 스킨은 적힌 열쇠만 */
let skinN = 0;
for (const c of cards) {
  const keys = (c.skins || []).map(k => k.key);
  assert.equal(new Set(keys).size, keys.length, c.name + ' 스킨 열쇠가 겹친다');
  for (const k of c.skins || []) {
    assert(/^[a-z0-9]+$/.test(k.key), c.name + ' 스킨 열쇠 ' + k.key + ' — 영문 소문자·숫자만(파일 이름이 된다)');
    assert(k.name && k.look && k.look.length > 40, c.name + ' 스킨 ' + k.key + ' 에 이름·묘사가 있어야 한다');
    skinN++;
  }
  for (const b of Object.values((img.img[c.name] || {}).byStyle || {}))
    for (const box of Object.values(b.skin || {})) for (const [key, one] of Object.entries(box)) {
      assert(keys.includes(key), c.name + ' 의 그림 스킨 ' + key + ' 이 card.json 에 없다');
      assert(Object.keys(one).every(x => ['base', 'awaken', 'cursed'].includes(x)), c.name + ' 스킨 ' + key + ' 의 칸은 base·awaken·cursed');
    }
}
console.log('PASS 자료: 카드 ' + cards.length + ' · 기술 ' + Object.keys(skill.skills).length + ' · 화풍 ' + style.styles.length + ' · 그림 ' + Object.keys(img.img || {}).length + ' · 스킨 ' + skinN);
