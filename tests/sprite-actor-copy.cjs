/* 도트 재생기 — lib/sprite-actor.js · lib/sprite-actor.css 는 공방 모음(polos0117.github.io)의 원본과 글자 하나 다르지 않아야 한다.
   약속은 그쪽 README 「도트 재생기」절. 원본이 옆(../polos0117.github.io)에 받아져 있으면 견주고, 없으면 판 줄만 본다.
   이 검사 파일도 다섯 공방 저장소에 같은 것이 있다.   node tests/sprite-actor-copy.cjs */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..'), HUB = path.resolve(ROOT, '../polos0117.github.io');
const said = [];
for (const f of ['sprite-actor.js', 'sprite-actor.css']) {
  const mine = fs.readFileSync(path.join(ROOT, 'lib', f), 'utf8');
  assert.match(mine.split('\n')[0], /^\/\* 도트 재생기 v\d+ \(\d{4}-\d{2}-\d{2}\)/, 'lib/' + f + ' 맨 위 줄에 판');
  const hub = path.join(HUB, f);
  if (fs.existsSync(hub)) { assert.equal(mine, fs.readFileSync(hub, 'utf8'), 'lib/' + f + ' 가 공방 모음의 원본과 다르다 — 원본을 고치고 그대로 복사한다'); said.push(f + ' = 원본'); }
  else said.push(f + ' (원본이 옆에 없어 판 줄만)');
}
/* 화면 없이 실어 본다 — window.AtelierSprite 에 load · create */
const box = { window: {} }; box.window.window = box.window; vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'lib/sprite-actor.js'), 'utf8'), box);
const API = ['load', 'create', 'floor', 'popOut', 'actorFor', 'forCard', 'cardKey'];
assert.deepEqual(Object.keys(box.window.AtelierSprite).sort(), API.slice().sort());
console.log('PASS 도트 재생기 복사본: ' + said.join(' · ') + ' · 실으면 AtelierSprite(' + API.join(' · ') + ')');
