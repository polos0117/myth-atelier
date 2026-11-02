/* 이미지 작업 잠금(tools/image-claim.cjs) — 실제 bare 저장소 둘로: 잡기 · 겹쳐 잡기 거절 · 실행마다 하나 · 멈춤 · 끝은 빈 자리가 없어야 ·
   다른 세션이 먼저 밀면 push 거절 뒤 제 커밋을 되돌린다 · 하루 몫. node tests/image-claim.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const TOOL = path.join(__dirname, '..', 'tools', 'image-claim.cjs'), K = require(TOOL);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'image-claim-'));
const git = (d, ...a) => cp.execFileSync('git', ['-C', d, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (img, ...a) => { const r = cp.spawnSync('node', [TOOL, ...a, '--img', img], { encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };
try {
  const bare = path.join(tmp, 'img.git');
  cp.execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  const clone = name => { const d = path.join(tmp, name); cp.execFileSync('git', ['clone', '-q', bare, d], { stdio: 'ignore' });
    git(d, 'config', 'user.name', 'T'); git(d, 'config', 'user.email', 't@example.invalid'); git(d, 'checkout', '-q', '-B', 'main'); return d; };
  const a = clone('a');
  fs.writeFileSync(path.join(a, 'README.md'), 'x\n'); git(a, 'add', '.'); git(a, 'commit', '-q', '-m', 'init'); git(a, 'push', '-q', 'origin', 'main');
  const b = clone('b');
  const todo = K.order().filter(x => K.missing(x.key).length).map(x => x.key);
  assert(todo.length >= 3, '빈 자리가 있는 캐릭터가 셋은 있어야 시험이 된다');
  const [x, y, z] = todo;
  assert.equal(JSON.parse(run(a, 'next').out).next, x, 'next — 차례대로 첫 빈 캐릭터');

  let r = run(a, 'claim', x, '--execution', 'e1');
  assert.equal(r.code, 0, r.out);
  assert.equal(git(a, 'rev-parse', 'HEAD'), git(a, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0], '일반 push 됐다');
  assert.match(run(a, 'claim', y, '--execution', 'e1').out, /실행마다 1개/);
  git(b, 'pull', '-q', 'origin', 'main');
  assert.match(run(b, 'claim', x, '--execution', 'e2').out, /이미 잡혀 있다/);
  assert.equal(JSON.parse(run(b, 'next').out).next, y, '잡힌 것은 건너뛴다');

  /* 경합 — b 가 먼저 밀었는데 a 는 옛 받기로 잡으려 한다: 받기가 다르면 멈추고, 받은 뒤 push 가 밀리면 되돌린다 */
  r = run(b, 'claim', y, '--execution', 'e2'); assert.equal(r.code, 0, r.out);
  assert.match(run(a, 'claim', z, '--execution', 'e3').out, /origin\/main 과 다르다/);
  git(a, 'pull', '-q', 'origin', 'main');
  const head = git(a, 'rev-parse', 'HEAD');
  git(b, 'commit', '-q', '--allow-empty', '-m', 'other'); git(b, 'push', '-q', 'origin', 'main');
  /* a 의 받기를 b 의 push 바로 앞으로 맞춘 채 push 만 밀리게 — fetch 를 막으려 origin 을 b 의 push 전 사본으로 돌렸다가 되돌린다 */
  const stale = path.join(tmp, 'stale.git'); cp.execFileSync('git', ['clone', '-q', '--bare', bare, stale]); git(stale, 'update-ref', 'refs/heads/main', head);
  git(a, 'remote', 'set-url', 'origin', stale); git(a, 'fetch', '-q', 'origin');
  git(a, 'remote', 'set-url', '--push', 'origin', bare);
  r = run(a, 'claim', z, '--execution', 'e3');
  assert.equal(r.code, 1); assert.match(r.out, /push 가 거절됐다/);
  assert.equal(git(a, 'rev-parse', 'HEAD'), head, '제 커밋을 되돌렸다');
  assert(!fs.existsSync(path.join(a, 'records/automation/claims', z + '.json')), '잠금 파일도 지웠다');
  assert.equal(git(a, 'status', '--porcelain'), '', '작업 트리가 깨끗하다');
  git(a, 'remote', 'set-url', 'origin', bare); git(a, 'remote', 'set-url', '--push', 'origin', bare); git(a, 'pull', '-q', 'origin', 'main');

  /* 멈춤 · 끝 */
  assert.match(run(a, 'block', x, '--execution', 'e9', '--reason', 'r').out, /이 실행이 잡고 있지 않다/);
  r = run(a, 'block', x, '--execution', 'e1', '--reason', '안전 거절 두 번 — 같은 지시문'); assert.equal(r.code, 0, r.out);
  assert.match(run(a, 'claim', x, '--execution', 'e4').out, /이미 잡혀 있다\(blocked/);
  assert.match(run(a, 'done', y, '--execution', 'e2').out, /아직 빈 자리/);
  assert.match(run(a, 'done', x, '--execution', 'e1').out, /아직 빈 자리|멈춰 있다/);
  assert.match(run(a, 'release', x, '--execution', 'e6').out, /--approval/);
  r = run(a, 'release', x, '--execution', 'e6', '--approval', '사용자 「다시 해」'); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(run(a, 'next').out).next, x, '푼 것은 다시 차례에 든다');

  /* 하루 몫 — 오늘 잡은 것이 열둘이면 더 못 잡는다 */
  const now = new Date(), kst = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10), utc = now.toISOString().slice(0, 10);
  const dir = path.join(a, 'records/automation/claims');
  for (let i = 0; i < K.DAILY_MAX; i++) fs.writeFileSync(path.join(dir, 'old' + i + '.json'), JSON.stringify({ key: 'old' + i, runs: [{ key: 'old' + i, execution: 'o' + i, status: 'complete', date_kst: kst, date_utc: utc }] }));
  git(a, 'add', '.'); git(a, 'commit', '-q', '-m', 'full day'); git(a, 'push', '-q', 'origin', 'main');
  assert.match(run(a, 'claim', z, '--execution', 'e5').out, /오늘 몫\(12\)을 다 썼다/);
  console.log(`PASS 이미지 작업 잠금: 잡기 · 겹침 · 실행마다 하나 · push 경합 되돌림 · 멈춤 · 끝 검사 · 하루 몫 (${x} · ${y} · ${z})`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
