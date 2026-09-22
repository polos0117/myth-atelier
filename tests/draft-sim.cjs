/* 드래프트 규칙 — 같은 seed 재현, 팩·지명·버림패·보급, 짝 배정, 결속·인연, 세 편 판정. 화면은 안 본다. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('../lib/draft.js');
const d = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { cards: d('card').cards, wielders: d('wielder').wielders, draft: d('draft') };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* 자료 */
const names = new Set(data.cards.map(c => c.name).concat(data.wielders.map(o => o.name)));
data.draft.combo.forEach(cb => cb.m.forEach(m => ok(names.has(m) || m === '발드르의 죽음', '인연 ' + cb.n + ' 의 ' + m + ' 은 카드가 아니다')));
data.cards.forEach(c => ok(data.wielders.some(o => o.name === c.wielder), c.name + ' 의 주인 ' + c.wielder + ' 이 wielder.json 에 없다'));
const sched = D.schedule(data), cnt = {}; sched.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
ok(cnt.weapon * 3 <= data.cards.length && cnt.wielder * 3 <= data.wielders.length, '세 편이 나눠 집을 만큼 카드가 있다');

/* 힘·궁합 */
const g = D.weapon(data, '궁니르'), odin = D.wielder(data, '오딘'), thor = D.wielder(data, '토르');
ok(D.sync(g, odin) > D.sync(g, thor), '원래 주인이면 궁합이 높다');
ok(D.pairScore(g, odin) > D.pairScore(g, D.wielder(data, '관우')), '다른 신화권이면 낮다');

/* 판 */
const a = D.newGame(data, 42), b = D.newGame(data, 42);
ok(JSON.stringify(a) === JSON.stringify(b), '같은 seed 는 같은 판');
ok(JSON.stringify(D.newGame(data, 43).pack) !== JSON.stringify(a.pack), '다른 seed 는 다른 팩');
ok(a.phase === 'running' && D.isMine(a) && a.pack.length === data.draft.pack, '내 차례에 팩 아홉');
ok(a.pack.every(x => D.weapon(data, x)), '첫 라운드는 무기');
const before = a.teams[1].weapon.length + a.teams[2].weapon.length;
ok(before === D.turnSeq(a).indexOf(0), '내 앞 순서만큼 적이 먼저 집었다');
ok(D.pick(a, data, '없는카드').why === 'turn', '팩에 없는 카드는 못 집는다');
const first = a.pack[0], pv = D.preview(a, data, first);
ok(typeof pv.delta === 'number', '미리보기');
const r1 = D.pick(a, data, first);
ok(r1.ok && a.teams[0].weapon[0] === first, '집으면 내 편성에');
const held = a.teams.reduce((k, t) => k + t.weapon.length, 0);
ok(a.pools.weapon.indexOf(first) < 0 && a.discard.weapon.indexOf(first) < 0 && a.pools.weapon.length + a.discard.weapon.length + held === data.cards.length, '집은 것은 풀·버림패 어디에도 없고, 카드 수는 보존된다');
ok(D.isMine(a) || a.phase === 'done', '적이 두고 다시 내 차례');
const seen = new Set(); a.teams.forEach(t => t.weapon.concat(t.wielder).forEach(x => { ok(!seen.has(x), x + ' 이 두 편에'); seen.add(x); }));

/* 보급 */
const c = D.newGame(data, 7, { rr: 1 });
const packBefore = c.pack.slice();
ok(D.resupply(c, data).ok && c.rerolls[0] === 0 && JSON.stringify(c.pack) !== JSON.stringify(packBefore), '보급하면 팩이 바뀌고 한 번 준다');
ok(D.resupply(c, data).why === 'rr', '보급은 다 쓰면 못 한다');
const c0 = D.newGame(data, 7, { rr: 0 });
ok(D.resupply(c0, data).why === 'rr', '보급 0이면 못 한다');

/* 끝까지 — 열두 라운드, 무기 여섯·주인 여섯 */
function playOut(st, how) { let guard = 0; while (st.phase === 'running' && guard++ < 60) { let pick = st.pack[0]; if (how === 'best') { let bd = -1e9; st.pack.forEach(x => { const p = D.preview(st, data, x); if (p.delta > bd) { bd = p.delta; pick = x; } }); } D.pick(st, data, pick); } return st; }
const e = playOut(D.newGame(data, 5), 'best');
ok(e.phase === 'done' && e.round === sched.length && e.teams.every(t => t.weapon.length === cnt.weapon && t.wielder.length === cnt.wielder), '열두 라운드 뒤 세 편이 여섯·여섯');
ok(!D.pick(e, data, '궁니르').ok, '끝난 판엔 못 집는다');
const ev = D.evaluate(data, e.teams[0]);
ok(ev.units.filter(u => u.w && u.o).length === 6 && ev.rows[0].k === 'pairs', '짝 여섯');
ok(ev.total === ev.rows.reduce((s, r) => s + r.v, 0) || Math.abs(ev.total - ev.rows.reduce((s, r) => s + r.v, 0)) <= 2, '내역 합이 총점');
const res = D.result(e, data);
ok(res.sorted.length === 3 && res.sorted[0].ev.total >= res.sorted[2].ev.total && res.rank >= 0 && res.rank <= 2, '세 편 순위');

/* 결속·인연 */
const t = { weapon: ['궁니르', '묠니르', '드라우프니르'], wielder: ['오딘', '토르'] };
const sy = D.synergy(data, t);
ok(sy.rows.some(r => r.axis === 'myth' && r.key === 'norse' && r.n === 5), '북유럽 다섯이면 결속');
const pg = D.pledges(data, t);
ok(pg.some(p => p.n === '아스가르드의 무구' && p.v === data.draft.combo[0].t['3']), '아스가르드의 무구 셋');
ok(pg.some(p => p.n === '전용 — 궁니르') && pg.some(p => p.n === '전용 — 묠니르'), '전용 인연 둘');
const feud = D.pledges(data, { weapon: [], wielder: ['수르트', '오딘'] });
ok(feud.some(p => p.feud && p.v < 0), '수르트와 오딘은 악연');
ok(D.evaluate(data, { weapon: [], wielder: ['수르트', '오딘'] }, 0).rows.every(r => r.k !== 'feud'), '신참은 인연을 못 본다');

console.log('PASS 드래프트 규칙 ' + n + '가지');
if (process.argv.includes('--quick')) process.exit(0);
/* ── 균형 표 — 실패가 아니라 보고. 미리보기 최고만 집는 손 대 적장 세 단계 ── */
for (const lv of [0, 1, 2]) {
  const r = [0, 0, 0]; let tot = 0; const N = 200;
  for (let s = 1; s <= N; s++) { const st = playOut(D.newGame(data, s, { lv, rr: 1 }), 'best'); const rs = D.result(st, data); r[rs.rank]++; tot += rs.evs[0].ev.total; }
  console.log('적장 ' + ['신참', '숙련', '에이스'][lv] + ' — 1등 ' + (r[0] / N * 100).toFixed(0) + '% · 2등 ' + (r[1] / N * 100).toFixed(0) + '% · 3등 ' + (r[2] / N * 100).toFixed(0) + '% · 평균 ' + Math.round(tot / N));
}
