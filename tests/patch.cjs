/* 패치 기록의 모양 — 화면이 그대로 읽으므로 틀어지면 집 화면이 빈다.
   규칙은 AGENTS.md "5. 고쳤으면 적는다" 에 있다. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const P = require('../lib/patch.js');

const text = fs.readFileSync('docs/PATCH.md', 'utf8');
const log = P.parse(text);
const WHO = ['claude', 'gpt'];

assert(log.length >= 1, '적힌 칸이 하나도 없다');

let last = null;
for (const e of log) {
  const where = e.date + ' ' + e.who;
  assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, where + ': 날짜는 2026-09-21 꼴');
  assert(!Number.isNaN(Date.parse(e.date)), where + ': 없는 날짜');
  assert(WHO.includes(e.who), where + ': 누가는 ' + WHO.join(' 또는 ') + ' — 받은 것은 "' + e.who + '"');
  assert(e.title.length >= 2, where + ': 무엇을 바꿨는지 적는다');
  assert(e.items.length >= 1, where + ': 고친 파일을 한 줄씩 적는다');
  for (const item of e.items) assert(item.length >= 3, where + ': 빈 줄');
  /* 새 것이 위 — 아니면 화면에서 옛 패치가 먼저 보인다 */
  if (last) assert(e.date <= last, '차례가 뒤집혔다: ' + last + ' 다음에 ' + e.date);
  last = e.date;
}

/* 안내글은 첫 ## 앞이라 읽히지 않는다 — 규칙을 지우면 다음 사람이 모양을 모른다 */
assert(text.indexOf('## ') > 40, '맨 위 안내글이 사라졌다');
const agents = fs.readFileSync('AGENTS.md', 'utf8');
assert(agents.includes('docs/PATCH.md'), 'AGENTS.md 가 패치 기록을 가리키지 않는다');
assert(agents.includes('고쳤으면 적는다'), 'AGENTS.md 에서 규칙이 사라졌다');

/* 해석기가 실제로 나누는지 — 모양이 바뀌면 여기서 걸린다 */
const sample = P.parse('머리말\n\n## 2026-01-02 · claude · 제목 · 뒤\n- a.js — 왜\n- b.js — 왜\n');
assert.equal(sample.length, 1);
assert.deepEqual(sample[0], { date: '2026-01-02', who: 'claude', title: '제목 · 뒤', items: ['a.js — 왜', 'b.js — 왜'] });
assert.deepEqual(P.parse(''), [], '빈 파일은 빈 목록');

console.log('PASS 패치 기록: 칸 ' + log.length + ' · 날짜·차례·빈 칸·AGENTS 연결·해석기');
