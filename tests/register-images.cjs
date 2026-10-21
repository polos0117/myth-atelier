/* 그림 등록기의 들어온 날(added) — data/img.json 의 {파일 이름: "YYYY-MM-DD"}.
   임시 자리에 등록기·자료를 옮겨 두고 가짜 img/ 와 가짜 그림 저장소(git)로 돌린다. 진짜 data/ 는 안 건드린다.
   - 이번에 새로 등록한 파일만 오늘 날짜, 이미 적힌 날짜는 그대로, 날짜 없는 옛 파일은 지어내지 않는다
   - --backfill 은 git 기록의 추가 날짜로 빈 칸만 채운다. 얕은 저장소의 경계 커밋 날짜는 버린다
   - --prune 으로 지운 파일은 날짜도 지운다. 이름이 틀린 파일이 있으면 아무것도 안 쓴다(예전 그대로)
   Run: node tests/register-images.cjs */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'register-added-'));
const T = p => path.join(tmp, p);
fs.mkdirSync(T('tools')); fs.mkdirSync(T('data')); fs.mkdirSync(T('img'));
for (const f of ['register-images.py', 'roster.py']) fs.copyFileSync(path.join(ROOT, 'tools', f), T('tools/' + f));
for (const f of ['card.json', 'style.json']) fs.copyFileSync(path.join(ROOT, 'data', f), T('data/' + f));
const OLD = '묠니르_game_keyart_f.webp', A = '묠니르_game_keyart_f_awaken.webp', B = '묠니르_game_keyart_f_casual1.webp';
fs.writeFileSync(T('data/img.json'), JSON.stringify({ version: 1, note: 'test', count: 1,
  img: { '묠니르': { byStyle: { game_keyart: { f: OLD } } } } }));
const touch = f => fs.writeFileSync(T('img/' + f), '');
const run = (...args) => execFileSync('python3', ['tools/register-images.py', ...args], { cwd: tmp, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '' } });
const doc = () => JSON.parse(fs.readFileSync(T('data/img.json'), 'utf8'));
const git = (cwd, args, date) => execFileSync('git', args, { cwd, encoding: 'utf8',
  env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; };

try {
  /* 1. 새 파일은 오늘, 원래 있던 파일은 날짜 없이 */
  touch(OLD); touch(A);
  run('--check', '--today', '2026-10-21');
  ok(doc().added === undefined, '--check 는 쓰지 않는다');
  run('--today', '2026-10-21');
  ok(doc().img['묠니르'].byStyle.game_keyart.awaken.f === A, '등록은 예전 그대로');
  assert.deepEqual(doc().added, { [A]: '2026-10-21' }); n++;
  ok(!(OLD in doc().added), '옛 파일 날짜를 지어내지 않는다');
  ok(Object.keys(doc()).join() === 'version,note,count,img,added', 'added 는 img 뒤 — ' + Object.keys(doc()));

  /* 2. 다음 날 — 적힌 날짜는 그대로, 새것만 그날 */
  touch(B);
  run('--today', '2026-10-22');
  assert.deepEqual(doc().added, { [A]: '2026-10-21', [B]: '2026-10-22' }); n++;
  run('--today', '2026-10-30');
  assert.deepEqual(doc().added, { [A]: '2026-10-21', [B]: '2026-10-22' }, '새것이 없으면 그대로'); n++;

  /* 3. 그림 저장소의 git 기록 — 빈 칸(OLD)만 채운다. A 는 기록이 더 이르지만 적힌 날짜가 이긴다 */
  const repo = T('imgrepo');
  fs.mkdirSync(path.join(repo, 'img'), { recursive: true });
  git(repo, ['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(repo, 'img', OLD), 'x'); fs.writeFileSync(path.join(repo, 'img', A), 'x');
  fs.mkdirSync(path.join(repo, 'img', 'thumb')); fs.writeFileSync(path.join(repo, 'img', 'thumb', OLD), 'x');
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'one'], '2026-09-01T12:00:00+09:00');
  fs.writeFileSync(path.join(repo, 'img', B), 'x');
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'two'], '2026-09-05T12:00:00+09:00');
  /* 얕은 사본 — 경계 커밋(two)이 OLD·A·B 를 다 "추가"한 것처럼 보인다. 그 날짜는 버려야 한다 */
  const shallow = T('shallow');
  execFileSync('git', ['clone', '-q', '--depth', '1', 'file://' + repo, shallow]);
  ok(execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: shallow, encoding: 'utf8' }).trim() === 'true', '얕은 사본');
  run('--backfill', shallow, '--today', '2026-10-30');
  ok(!(OLD in doc().added), '얕은 저장소 경계 커밋의 날짜를 쓰지 않는다 — ' + JSON.stringify(doc().added));
  const out = run('--backfill', repo, '--today', '2026-10-30');
  assert.deepEqual(doc().added, { [OLD]: '2026-09-01', [A]: '2026-10-21', [B]: '2026-10-22' }); n++;
  ok(/git 기록에서 1/.test(out), '채운 수를 찍는다 — ' + out);

  /* 4. 이름이 틀린 파일이 끼면 아무것도 안 쓴다(날짜도) */
  const before = fs.readFileSync(T('data/img.json'), 'utf8');
  touch('없는무기_game_keyart_f.webp'); touch('묠니르_game_keyart_f_cursed.webp');
  assert.throws(() => run('--today', '2026-11-01'), '이름이 틀리면 실패'); n++;
  ok(fs.readFileSync(T('data/img.json'), 'utf8') === before, '실패하면 그대로');
  fs.unlinkSync(T('img/없는무기_game_keyart_f.webp')); fs.unlinkSync(T('img/묠니르_game_keyart_f_cursed.webp'));

  /* 5. --prune — 파일이 사라지면 그 날짜도. --prune 없이는 둘 다 남는다 */
  fs.unlinkSync(T('img/' + B));
  run('--today', '2026-11-01');
  ok(B in doc().added, '--prune 없이는 남는다');
  run('--prune', '--today', '2026-11-01');
  assert.deepEqual(doc().added, { [OLD]: '2026-09-01', [A]: '2026-10-21' }); n++;
  /* 다시 들어오면 그날 날짜 */
  touch(B);
  run('--today', '2026-11-02');
  ok(doc().added[B] === '2026-11-02', '다시 들어온 파일은 그날');

  /* 6. 날짜 꼴이 아닌 값은 버린다 */
  const d = doc(); d.added[OLD] = 'yesterday'; fs.writeFileSync(T('data/img.json'), JSON.stringify(d));
  run('--today', '2026-11-03');
  ok(!(OLD in doc().added), '날짜 꼴이 아닌 값은 버린다');
  console.log('PASS 그림 등록 들어온 날 — ' + n + '가지');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
