#!/usr/bin/env node
/* 이미지 작업 잠금 — GPT 세션이 같은 무기를 둘이 그리지 않게, 하루 · 실행마다 몇 장까지 그리는지(docs/IMAGE_AUTOMATION.md).
   book-atelier · game-atelier 와 같은 도구(맨 위 몇 줄만 신화 몫, 2026-11-01).
   pkm-atelier 의 image-runner 가 하는 일 가운데 「누가 무엇을 그리나」 만 — 지시문은 tools/prompt-pack.cjs, 검수 · 올리기는 문서대로 한다.

   잠금은 그림 저장소(옆의 myth-atelier-img)의 records/automation/claims/<카드>.json 하나다(카드 이름의 공백은 밑줄). 바꿀 때마다 그 파일만 커밋해 일반 push 한다 —
   그 사이 다른 세션이 밀었으면 push 가 거절되고 이 도구는 제 커밋을 되돌린 뒤 멈춘다(다시 받고 처음부터).

     node tools/image-claim.cjs status                                   # 잠금 · 오늘 쓴 몫 · 다음 차례
     node tools/image-claim.cjs next                                     # 다음에 그릴 카드와 빈 자리(읽기만)
     node tools/image-claim.cjs claim <카드> --execution <실행 ID>      # 잡는다 — 실행마다 1개, 하루(Asia/Seoul · UTC 따로) 12개
     node tools/image-claim.cjs block <카드> --execution <실행 ID> --reason <까닭>   # 멈춘다(안전 거절 · 도구 오류 …). 잠금은 그대로 남는다
     node tools/image-claim.cjs done <카드> --execution <실행 ID>       # 끝 — data/img.json 에 빈 자리가 없어야 한다(코드 저장소를 pull 한 뒤).
                                                                         등록은 늦게 될 수 있어 다음 실행이 끝내도 된다(누가 끝냈는지 남는다)
     node tools/image-claim.cjs release <카드> --execution <실행 ID> --approval <사용자 말>   # 멈춘 잠금을 푼다 — 사용자가 정한 뒤에만
   <카드> 는 data/card.json 의 name 에서 공백을 밑줄로(아킬레우스의_창). --img <그림 저장소 경로>(기본 ../myth-atelier-img) · --no-push(시험용 — 커밋만) */
'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
/* 일상컷은 무기마다 다섯 장(사용자 2026-11-02 「다섯장으로 바꿔줘」 — 다른 공방과 같다). 스킨은 빈 자리에 안 든다(선택) */
const DAILY_MAX = 12, EXECUTION_MAX = 1, CASUAL_N = 5;

/* ── 공방마다 다른 것: 그림 저장소 이름 · 차례 · 한 캐릭터의 빈 자리 ── */
const IMG_REPO = 'myth-atelier-img', WHAT = '무기';
const keyOf = name => name.replace(/ /g, '_');
const cardOf = key => read('data/card.json').cards.find(c => keyOf(c.name) === key || c.name === key);
/* 차례 — 카드 표 차례 */
function order() { return read('data/card.json').cards.map(c => ({ key: keyOf(c.name), title: c.name })); }
/* 빈 자리 — 그 카드의 기본 그림 화풍(없으면 생성기 기본)으로 액션 · 각성 · 저주 · 일상 다섯 장 */
function missing(key) {
  const card = cardOf(key);
  if (!card) return [];
  const by = ((read('data/img.json').img || {})[card.name] || {}).byStyle || {};
  const st = by.game_keyart ? 'game_keyart' : Object.keys(by).find(k => by[k].f) || 'game_keyart', v = by[st] || {};
  const k = keyOf(card.name), out = [];
  if (!v.f) out.push(`${k}_${st}_f.webp`);
  for (const s of ['awaken', 'cursed']) if (!(v[s] || {}).f) out.push(`${k}_${st}_f_${s}.webp`);
  return out.concat(casualGap(key, st, (v.casual || {}).f || [], CASUAL_N).map(n => `${k}_${st}_f_casual${n}.webp`));
}
/* 일상컷 — 모자란 장수만큼 비어 있는 가장 작은 번호(1·2 가 있으면 3) */
function casualGap(key, st, files, want) {
  const taken = new Set(files.map(f => Number((/_casual(\d+)\.webp$/.exec(f) || [])[1])).filter(Boolean)), out = [];
  for (let n = 1; taken.size + out.length < want; n++) if (!taken.has(n)) out.push(n);
  return out;
}
/* ── 여기부터 네 공방(game · book · element · myth)이 같다 ── */

function git(repo, ...a) { return cp.execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
const kst = d => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const claimRel = key => path.join('records', 'automation', 'claims', key + '.json');
function claims(img) {
  const dir = path.join(img, 'records', 'automation', 'claims');
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]));
}
const last = c => c && c.runs && c.runs[c.runs.length - 1];
const open = c => { const r = last(c); return r && (r.status === 'working' || r.status === 'blocked') ? r : null; };
function used(all, now) {
  const runs = Object.values(all).flatMap(c => c.runs || []);
  return { kst: runs.filter(r => r.date_kst === kst(now)).length, utc: runs.filter(r => r.date_utc === now.toISOString().slice(0, 10)).length, runs };
}
function nextOf(all) {
  for (const x of order()) { if (open(all[x.key])) continue; const m = missing(x.key); if (m.length) return { ...x, missing: m }; }
  return null;
}
/* 그 파일만 커밋해 일반 push — 거절되면 제 커밋을 되돌리고 멈춘다 */
function publish(img, key, body, message, push) {
  git(img, 'fetch', '-q', 'origin', 'main');
  if (git(img, 'rev-parse', 'HEAD') !== git(img, 'rev-parse', 'origin/main')) throw new Error(IMG_REPO + ' 이 origin/main 과 다르다 — pull(또는 제 변경 정리) 뒤 다시');
  if (git(img, 'diff', '--cached', '--name-only')) throw new Error(IMG_REPO + ' 에 올려 둔(staged) 변경이 있다 — 정리한 뒤 다시');
  const rel = claimRel(key), file = path.join(img, rel), before = fs.existsSync(file) ? fs.readFileSync(file) : null;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 1) + '\n');
  git(img, 'add', '--', rel);
  git(img, 'commit', '-q', '-m', message, '--', rel);
  if (!push) return git(img, 'rev-parse', 'HEAD');
  try { git(img, 'push', '-q', 'origin', 'HEAD:main'); }
  catch (e) {
    git(img, 'reset', '-q', '--soft', 'HEAD~1'); git(img, 'restore', '-q', '--staged', '--', rel);
    if (before) fs.writeFileSync(file, before); else fs.rmSync(file);
    throw new Error('push 가 거절됐다(그 사이 다른 세션이 밀었다) — 제 커밋은 되돌렸다. pull 한 뒤 status 부터 다시: ' + String(e.stderr || e.message).trim());
  }
  return git(img, 'rev-parse', 'HEAD');
}

function main(argv) {
  const cmd = argv[0], o = { push: true };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--no-push') o.push = false; else if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else o.key = argv[i];
  }
  const img = path.resolve(o.img || path.join(ROOT, '..', IMG_REPO));
  if (!fs.existsSync(path.join(img, '.git'))) throw new Error(img + ' 가 없다 — ' + IMG_REPO + ' 를 코드 저장소 옆에 받는다');
  const all = claims(img), now = new Date();
  if (cmd === 'status' || cmd === 'next') {
    const nx = nextOf(all);
    if (cmd === 'next') { console.log(JSON.stringify(nx ? { next: nx.key, title: nx.title, missing: nx.missing } : { next: null, reason: '빈 자리가 있는 ' + WHAT + '이 없다(잠긴 것 빼고)' }, null, 1)); return 0; }
    const u = used(all, now);
    console.log(`오늘 잡은 ${WHAT}: Asia/Seoul ${u.kst}/${DAILY_MAX} · UTC ${u.utc}/${DAILY_MAX}`);
    for (const [k, c] of Object.entries(all)) { const r = last(c); console.log(`  ${k} — ${r.status} · ${r.execution} · ${r.claimed_at}${r.reason ? ' · ' + r.reason : ''}${r.status === 'working' && !missing(k).length ? ' · 빈 자리 없음 — done 으로 끝낸다' : ''}`); }
    console.log('다음 차례: ' + (nx ? `${nx.key}(${nx.title}) — 빈 자리 ${nx.missing.length}` : '없음'));
    return 0;
  }
  if (!['claim', 'block', 'done', 'release'].includes(cmd) || !o.key || !o.execution) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 15).join('\n')); return 2; }
  if (!order().some(x => x.key === o.key)) throw new Error('없는 ' + WHAT + ': ' + o.key);
  const c = all[o.key] || { key: o.key, runs: [] }, r = open(c);
  if (cmd === 'claim') {
    if (r) throw new Error(o.key + ' 는 이미 잡혀 있다(' + r.status + ' · ' + r.execution + ') — 시간이 지났다고 가져가지 않는다');
    const mine = Object.values(all).flatMap(x => x.runs || []).filter(x => x.execution === o.execution);
    if (mine.length >= EXECUTION_MAX) throw new Error('이 실행(' + o.execution + ')은 벌써 ' + mine.map(x => x.key).join(',') + ' 를 잡았다 — 실행마다 ' + EXECUTION_MAX + '개');
    const u = used(all, now);
    if (u.kst >= DAILY_MAX || u.utc >= DAILY_MAX) throw new Error('오늘 몫(' + DAILY_MAX + ')을 다 썼다 — Asia/Seoul ' + u.kst + ' · UTC ' + u.utc);
    const m = missing(o.key);
    if (!m.length) throw new Error(o.key + ' 는 빈 자리가 없다');
    c.runs.push({ key: o.key, execution: o.execution, status: 'working', claimed_at: now.toISOString(), date_kst: kst(now), date_utc: now.toISOString().slice(0, 10), missing: m });
  } else if (!r) throw new Error(o.key + ' 는 잡혀 있지 않다');
  else if (cmd === 'release') {
    if (!o.approval) throw new Error('--approval(사용자가 풀라고 한 말)이 있어야 한다');
    Object.assign(r, { status: 'released', approval: o.approval, released_by: o.execution, released_at: now.toISOString() });
  } else if (cmd === 'block' && r.execution !== o.execution) throw new Error(o.key + ' 를 이 실행이 잡고 있지 않다(' + r.execution + ')');
  else if (cmd === 'block') {
    if (!o.reason) throw new Error('--reason 이 있어야 한다');
    Object.assign(r, { status: 'blocked', reason: o.reason, blocked_at: now.toISOString() });
  } else {
    const m = missing(o.key);
    if (m.length) throw new Error('아직 빈 자리 ' + m.length + ' — 등록(코드 저장소 data/img.json)을 pull 한 뒤: ' + m.join(', '));
    if (r.status === 'blocked') throw new Error(o.key + ' 는 멈춰 있다(' + r.reason + ') — 사용자가 정한 뒤 release');
    Object.assign(r, { status: 'complete', done_at: now.toISOString(), done_by: o.execution });
  }
  const sha = publish(img, o.key, c, `잠금: ${o.key} ${cmd} (${o.execution}) [skip actions]`, o.push);
  console.log(JSON.stringify({ key: o.key, status: last(c).status, commit: sha, missing: last(c).missing }, null, 1));
  return 0;
}
module.exports = { missing, order, claims, nextOf, used, DAILY_MAX, CASUAL_N };
if (require.main === module) { try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(e.message); process.exit(1); } }
