/* 낱말이 코드에 박히지 않았는지 본다.
   앞선 저장소는 화면 190 자리에 주제 낱말이 박혀 있어서, 주제를 바꾸니
   "모함 건업" 같은 것이 떴다. 그 일이 다시 나지 않게 처음부터 막는다.
   Run: node tests/words.cjs */
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const assert = require('node:assert/strict');

const ctx = { window: {}, console: { warn() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lib/words.js', 'utf8'), ctx);
const AW = ctx.window.AtelierWords, W = AW.W;

/* 표가 제 일을 하나 */
assert.equal(typeof W, 'function');
assert.equal(W('art.count', { n: 3 }), '3장', '자리표시자를 안 채운다');
assert.equal(W('없는열쇠'), '없는열쇠', '없는 열쇠는 열쇠를 돌려줘야 한다');
assert(AW.missing().includes('없는열쇠'), '없는 열쇠를 안 적어 둔다');
AW.load({ 'kind.unit': '병종' });
assert.equal(W('kind.unit'), '병종', '표를 갈아 끼울 수 없다');

/* 화면 코드가 말을 직접 적고 있지 않나 — 한글이 보이면 낱말 표로 빼야 한다.
   lib/words.js 와 주석은 뺀다 */
/* <title> 만은 예외다 — HTML 이 읽히는 순간 필요해서 자바스크립트로 넣을 수 없다.
   대신 낱말 표의 app.title 과 같은지 따로 본다(아래). 나머지는 전부 표에서 온다 */
const strip = s => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<title>[^<]*<\/title>/g, '');
/* 말을 담는 것이 일인 파일은 이 검사에서 뺀다. 대신 아래에서 "표 말고
   아무것도 없나" 를 따로 본다 — 빼 준 자리에 화면 코드가 숨지 못하게 */
const TABLES = ['lib/words.js', 'lib/prompt-spec.js'];

/* 아직 안 고친 화면. atelier 에서 그대로 옮겨 왔고 말을 아직 안 뺐다.
   빼 주되 조용히 잊히지는 않게 — 남은 자리 수를 늘 찍고, 늘어나면 실패한다.
   다 빼고 나면 이 줄을 지운다. */
const PENDING = {};
const targets = [];
for (const dir of ['.', 'lib']) {
  for (const f of fs.readdirSync(dir)) {
    const p = dir === '.' ? f : dir + '/' + f;
    if (!/\.(html|js)$/.test(f)) continue;
    if (TABLES.includes(p) || PENDING[p] || !fs.statSync(p).isFile()) continue;
    targets.push(p);
  }
}
assert(targets.length >= 2, '볼 파일이 없다 — ' + targets.join(', '));
const found = [];
for (const p of targets) {
  const body = strip(fs.readFileSync(p, 'utf8'));
  const hits = body.match(/[가-힣][가-힣 ]{1,}/g) || [];
  if (hits.length) found.push(p + ': ' + [...new Set(hits)].slice(0, 5).join(' · '));
}
assert.equal(found.length, 0,
  '화면 코드에 한글이 박혀 있다. lib/words.js 로 뺄 것\n  ' + found.join('\n  '));

/* 한글이 아니어도 말은 말이다 — 앞선 저장소에서 옮겨 온 상표가 남아 있으면 잡는다.
   window.AtelierWords 처럼 이름으로 쓰는 것은 뺀다. 그것은 화면에 안 뜬다 */
for (const p of targets) {
  const body = strip(fs.readFileSync(p, 'utf8')).replace(/Atelier[A-Z]\w*/g, '');
  for (const w of ['ATELIER', 'Atelier', 'MOBILE SUIT', 'GUNDAM', '건담'])
    assert(!body.includes(w), p + ' 에 ' + w + ' 가 박혀 있다 — lib/words.js 로 뺄 것');
}

/* 아직 안 고친 화면은 "얼마나 남았나" 로 지켜본다. 줄어드는 것은 괜찮고
   늘어나는 것은 막는다 — 안 그러면 여기가 한글을 새로 붓는 구멍이 된다 */
const left = {};
for (const p of Object.keys(PENDING)) {
  assert(fs.existsSync(p), p + ' 이 없다 — 다 고쳤으면 PENDING 에서 지울 것');
  const n = (strip(fs.readFileSync(p, 'utf8')).match(/[가-힣][가-힣 ]{1,}/g) || []).length;
  left[p] = n;
  assert(n <= PENDING[p],
    p + ' 의 한글이 ' + PENDING[p] + ' → ' + n + ' 으로 늘었다 — 낱말 표로 뺄 것');
  assert(n > 0, p + ' 은 이미 깨끗하다 — PENDING 에서 지울 것');
}

/* 빼 준 파일은 정말 표뿐인가. 한글 검사를 면제받는 대가다 —
   여기 화면 코드를 숨기면 주제를 갈아 끼울 때 또 190 자리가 된다 */
for (const p of TABLES) {
  if (!fs.existsSync(p)) continue;
  const body = strip(fs.readFileSync(p, 'utf8'));
  for (const bad of ['document.', 'addEventListener', 'localStorage', 'fetch(', 'innerHTML'])
    assert(!body.includes(bad), p + ' 에 ' + bad + ' 가 있다 — 표만 두는 파일이다');
  /* 내보내는 것이 전부 자료인가. 함수가 하나라도 있으면 표가 아니다 */
  const box = { window: {}, console: { warn() {} } };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(p, 'utf8'), box);
  for (const name of Object.keys(box.window)) {
    const mod = box.window[name];
    if (typeof mod !== 'object' || mod === null) continue;
    const fns = Object.keys(mod).filter(k => typeof mod[k] === 'function');
    /* lib/words.js 는 W·load·missing 을 내보낸다 — 표를 쓰는 손잡이라 봐준다 */
    const allowed = p === 'lib/words.js' ? ['W', 'load', 'missing'] : [];
    const odd = fns.filter(k => !allowed.includes(k));
    assert.equal(odd.length, 0,
      p + ' 의 ' + name + ' 이 함수를 내보낸다: ' + odd.join(', ') + ' — 표만 두는 파일이다');
  }
}

/* 정적 <title> 은 낱말 표와 갈리면 안 된다 */
for (const p of targets.filter(x => x.endsWith('.html'))) {
  const m = fs.readFileSync(p, 'utf8').match(/<title>([^<]*)<\/title>/);
  if (!m) continue;
  assert.equal(m[1], AW.table['app.title'],
    p + ' 의 <title> 이 낱말 표의 app.title 과 다르다');
}

console.log(`PASS: 낱말 표 동작, 갈아 끼우기, 없는 열쇠 보고, 화면 ${targets.length}개에 박힌 말 없음, `
  + `표 파일 ${TABLES.length}개는 표뿐, <title> 은 표와 일치`
  + (Object.keys(left).length
      ? `\n      아직 안 뺀 화면: ` + Object.keys(left).map(k => k + ' ' + left[k] + '자리').join(', ')
      : ''));
