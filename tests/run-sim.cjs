/* 던전 규칙 — 덱·마나·게이지·각성·저주·제단·문·휴식·길의 끝. 화면은 안 본다(그건 run-screen). */
const fs = require('node:fs'), assert = require('node:assert/strict');
const R = require('../lib/run.js');
const d = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, run: d('run'), wielders: d('wielder').wielders, draft: d('draft') };
const T = R.tune(data);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const party = ['궁니르', '묠니르', '아이기스'];
const st = R.newRun(data, 7, party);
ok(st.party.length === 3 && st.party.every(m => m.alive && m.hp === m.maxHp && !m.awakened && !m.cursed), '동료 셋, 온전');
ok(JSON.stringify(R.newRun(data, 7, party)) === JSON.stringify(st), '같은 seed 는 같은 길');
ok(st.phase === 'map' && st.node === -1, '길에서 시작');
assert.throws(() => R.newRun(data, 1, ['궁니르']), '둘이면 못 나선다');

/* 첫 칸 — 싸움 */
ok(R.proceed(st, data).kind === 'fight' && st.phase === 'battle', '첫 칸은 싸움');
const b = st.battle;
ok(b.deck.length + b.hand.length === 12 && b.hand.length === T.hand && b.mana === T.mana, '덱 열둘(무기당 넷), 손패 다섯, 마나 셋');
ok(b.enemies.length === 1 && b.enemies[0].alive && b.enemies[0].hp > 0, '첫 상대는 하나');
ok(b.enemies.every(e => !party.includes(e.name)), '상대는 내 동료가 아니다');
for (const c of b.hand) { const s = R.spec(data, c); ok(s && s.name && s.cost >= 1 && s.cost <= 3, '카드 뜻: ' + c.key); }
ok(b.hand.some(c => c.key.startsWith('skill:')) || b.deck.some(c => c.key.startsWith('skill:')), '고유 기술 카드가 있다');

/* 카드 내기 */
const cheap = b.hand.findIndex(c => R.spec(data, c).cost === 1);
ok(cheap >= 0, '1마나 카드가 손에 있다');
const owner = b.hand[cheap].owner, hp0 = b.enemies[0].hp;
ok(R.play(st, data, cheap, 0).ok && b.mana === T.mana - 1 && b.hand.length === T.hand - 1 && b.discard.length === 1, '내면 마나가 줄고 버림으로');
ok(b.enemies[0].hp < hp0 || !b.enemies[0].alive, '상대가 맞았다');
ok(b.gauge[owner] === 1, '게이지 하나');
ok(R.play(st, data, 99, 0).why === 'card', '없는 카드');
b.mana = 0;
ok(R.play(st, data, 0, 0).why === 'mana', '마나가 없으면 못 낸다');

/* 각성 — 한 무기 카드 넉 장 */
const st2 = R.newRun(data, 11, party); R.proceed(st2, data);
const b2 = st2.battle; b2.enemies[0].hp = b2.enemies[0].maxHp = 100000;
let played = 0, guard = 0, who = null;
while (played < T.gauge && guard++ < 30) {
  b2.mana = 9;
  const i = b2.hand.findIndex(c => who ? c.owner === who : true);
  if (i < 0) { b2.discard = b2.discard.concat(b2.hand); b2.hand = []; R.endTurn(st2, data); b2.mana = 9; continue; }
  who = b2.hand[i].owner; R.play(st2, data, i, 0); played++;
}
ok(b2.awake[who] === true && st2.log.some(l => l.k === 'awaken' && l.a === who), '넉 장이면 각성');
ok(R.stateOf(st2, st2.party.find(m => m.name === who)) === 'awaken', '그림 상태가 각성');
const m2 = st2.party.find(m => m.name === who), c2 = R.cardOf(data, who);
b2.mana = 9; const i2 = b2.hand.findIndex(c => c.owner === who && R.spec(data, c).mult && !R.spec(data, c).all);
if (i2 >= 0) { const before = b2.enemies[0].hp; R.play(st2, data, i2, 0); const dmg = before - b2.enemies[0].hp, s = R.spec(data, b2.discard[b2.discard.length - 1]);
  ok(Math.abs(dmg - Math.round(c2.atk * T.awakenMult * s.mult) * (s.hits || 1)) <= (s.hits || 1), '각성이면 ×' + T.awakenMult); }

/* 턴 끝 — 상대가 친다, 손패가 새로 */
const st3 = R.newRun(data, 3, party); R.proceed(st3, data);
const b3 = st3.battle, hpSum = () => st3.party.reduce((a, m) => a + m.hp, 0), before3 = hpSum();
ok(R.endTurn(st3, data).ok && b3.turn === 2 && b3.mana === T.mana && b3.hand.length === T.hand, '턴이 넘어가고 손패·마나가 새로');
ok(hpSum() < before3, '상대가 쳤다');

/* 저주 — 피가 낮으면 묻고, 받으면 영구 */
const st4 = R.newRun(data, 5, party); R.proceed(st4, data);
st4.party[0].hp = 1; st4.party[0].maxHp = 100; st4.battle.enemies[0].atk = 0;
R.endTurn(st4, data);
ok(st4.battle.ask === st4.party[0].name && st4.party[0].offered, '피가 낮으면 저주를 묻는다');
ok(R.play(st4, data, 0, 0).why === 'ask' && R.endTurn(st4, data).why === 'ask', '답하기 전엔 못 움직인다');
ok(R.answerCurse(st4, data, true).cursed && st4.party[0].cursed && !st4.battle.ask, '받으면 저주');
ok(R.stateOf(st4, st4.party[0]) === 'cursed', '그림 상태가 저주');
const cursedName = st4.party[0].name;
st4.battle.mana = 9; const ci = st4.battle.hand.findIndex(c => c.owner === cursedName);
if (ci >= 0) { const h = st4.party[0].hp; R.play(st4, data, ci, 0); ok(st4.party[0].hp === h - 1 || !st4.party[0].alive, '저주받은 무기는 낼 때마다 피 1'); }
R.endTurn(st4, data);
ok(!st4.battle.ask, '한 번 물었으면 다시 안 묻는다');

/* 이김 → 결과 → 다음 칸. 길의 차례 */
const st5 = R.newRun(data, 9, party); R.proceed(st5, data);
st5.battle.enemies.forEach(e => { e.hp = 1; });
const first = st5.battle.hand.findIndex(c => R.spec(data, c).mult);
R.play(st5, data, first, 0);
ok(st5.battle.over === 'win' && st5.phase === 'result', '상대가 쓰러지면 이김');
ok(R.proceed(st5, data).kind === 'fight' && st5.node === 1, '둘째 칸도 싸움');
st5.battle.enemies.forEach(e => { e.hp = 1; }); R.play(st5, data, st5.battle.hand.findIndex(c => R.spec(data, c).mult), 0); R.proceed(st5, data);
ok(st5.phase === 'shrine', '셋째 칸은 제단');
ok(R.chooseShrine(st5, data, '묠니르').ok && st5.party[1].awakened && st5.phase === 'map', '제단에서 영구 각성');
ok(R.chooseShrine(st5, data, '궁니르').why === 'phase', '제단은 한 번');
R.proceed(st5, data);
ok(st5.phase === 'battle' && st5.battle.awake['묠니르'] === true && st5.battle.enemies.length === 2, '영구 각성은 각성으로 시작. 넷째 칸 상대는 둘');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
R.proceed(st5, data);
ok(st5.phase === 'gate', '다섯째 칸은 저주의 문');
ok(R.chooseGate(st5, data, null).ok && st5.phase === 'map' && !st5.party.some(m => m.cursed), '문은 지나칠 수 있다');
R.proceed(st5, data);
ok(st5.phase === 'rest', '여섯째 칸은 휴식');
st5.party[0].hp = 10; const mh = st5.party[0].maxHp;
ok(R.rest(st5, data).ok && st5.party[0].hp === 10 + Math.round(mh * T.restHeal) && st5.phase === 'map', '휴식은 30%');
R.proceed(st5, data); ok(st5.phase === 'battle', '일곱째 칸 싸움');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
R.proceed(st5, data);
ok(st5.phase === 'battle' && st5.battle.boss && st5.battle.enemies[0].boss && st5.battle.enemies.every(e => R.cardOf(data, e.name).cost === 5), '여덟째 칸은 보스 — 5금');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
ok(st5.phase === 'won', '보스를 이기면 길의 끝');

/* 짐 */
const st6 = R.newRun(data, 13, party); R.proceed(st6, data);
st6.party.forEach(m => { m.hp = 1; }); st6.battle.enemies[0].atk = 999;
for (let i = 0; i < 6 && st6.phase === 'battle'; i++) { if (st6.battle.ask) R.answerCurse(st6, data, false); else R.endTurn(st6, data); }
ok(st6.phase === 'lost' && st6.party.every(m => !m.alive), '동료가 다 쓰러지면 진다');

/* ── 드래프트에서 온 판 — 주인 보정·전용 게이지·악연·상대 차례·보스·예비 ── */
const H = { pairs: [{ w: '궁니르', o: '오딘' }, { w: '묠니르', o: '토르' }, { w: '레바테인', o: '수르트' }], reserve: [{ w: '그람', o: '시구르드' }, { w: '흐룬팅', o: '베오울프' }],
  foes: [{ w: '아이기스', o: '아테나' }, { w: '여의봉', o: '손오공' }, { w: '트리슐라', o: '시바' }], boss: { w: '케라우노스', o: '제우스' }, rank: 2 };
const h = R.newRun(data, 21, null, H);
ok(h.fromDraft && h.party[0].wielder === '오딘' && h.party[0].mult > 1 && h.party[0].maxHp > R.newRun(data, 21, ['궁니르', '묠니르', '아이기스']).party[0].maxHp, '주인이 붙으면 체력·위력이 오른다');
ok(h.party[0].gaugeMax === T.gauge - 1 && h.party[1].gaugeMax === T.gauge - 1, '원래 주인이면 게이지가 하나 적다');
ok(h.party[0].feud && h.party[2].feud && !h.party[1].feud, '수르트와 오딘은 악연');
R.proceed(h, data);
ok(h.battle.enemies.length === 1 && h.battle.enemies[0].name === '아이기스' && h.battle.enemies[0].wielder === '아테나', '첫 상대는 드래프트 적 편의 짝');
ok(h.battle.enemies[0].maxHp > R.newRun(data, 21, ['그람', '묠니르', '아이기스']).party[0].maxHp, '3등이면 상대 체력이 ×1.2');
/* 악연은 거절이 안 된다 */
h.party[0].hp = 1; h.party[0].maxHp = 100; h.battle.enemies[0].atk = 0; R.endTurn(h, data);
ok(h.battle.ask === '궁니르' && R.answerCurse(h, data, false).why === 'feud', '악연은 저주를 거절할 수 없다');
ok(R.answerCurse(h, data, true).ok && h.party[0].cursed, '받는다');
/* 예비 — 쓰러진 자리에 다음 칸부터 */
h.party[1].alive = false; h.party[1].hp = 0;
h.battle.enemies.forEach(e => { e.hp = 1; }); h.battle.mana = 9;
while (h.battle.over !== 'win') { const i = h.battle.hand.findIndex(c => R.spec(data, c).mult && h.party.find(p => p.name === c.owner).alive); if (i < 0) { R.endTurn(h, data); h.battle.mana = 9; continue; } R.play(h, data, i, 0); }
R.proceed(h, data);
ok(h.party[1].name === '그람' && h.party[1].wielder === '시구르드' && h.party[1].alive && h.reserve.length === 1 && h.log.some(l => l.k === 'reserve' && l.a === '그람' && l.b === '묠니르'), '예비가 올라온다');
ok(h.battle.enemies.map(e => e.name).join(',') === '여의봉', '둘째 싸움은 다음 짝');
/* 보스 — 1등의 최고의 짝 */
const hb = R.newRun(data, 22, null, H); hb.node = 6; hb.phase = 'map'; R.proceed(hb, data);
ok(hb.battle.boss && hb.battle.enemies[0].name === '케라우노스' && hb.battle.enemies[0].wielder === '제우스' && hb.battle.enemies[0].boss, '보스는 넘겨받은 짝');
/* 드래프트 없이도 그대로 */
const plain = R.newRun(data, 3, ['궁니르', '묠니르', '아이기스']);
ok(!plain.fromDraft && plain.party.every(m => !m.wielder && m.mult === 1 && m.gaugeMax === T.gauge), '드래프트 없이 오면 옛 규칙 그대로');

console.log('PASS 던전 규칙 ' + n + '가지');

/* ── 균형 표 — 실패가 아니라 보고. 맡긴 손: 마나 되는 카드 아무거나, 저주는 받는다, 제단은 첫 동료, 문은 지나친다 ── */
if (process.argv.includes('--quick')) process.exit(0);
const N = 300; let won = 0, awk = 0, cur = 0, reach = 0;
for (let s = 1; s <= N; s++) {
  const r = R.newRun(data, s, party); let g = 0;
  while (!['won', 'lost'].includes(r.phase) && g++ < 600) {
    if (r.phase === 'map' || r.phase === 'result') R.proceed(r, data);
    else if (r.phase === 'shrine') R.chooseShrine(r, data, R.living(r)[0].name);
    else if (r.phase === 'gate') R.chooseGate(r, data, null);
    else if (r.phase === 'rest') R.rest(r, data);
    else { const bb = r.battle; if (bb.ask) { R.answerCurse(r, data, true); continue; }
      const i = bb.hand.findIndex(c => R.spec(data, c).cost <= bb.mana && r.party.find(p => p.name === c.owner).alive);
      if (i >= 0) R.play(r, data, i, 0); else R.endTurn(r, data); }
  }
  if (r.phase === 'won') won++; reach += r.node + 1;
  if (r.log.some(l => l.k === 'awaken') || r.party.some(m => m.awakened)) awk++; if (r.party.some(m => m.cursed)) cur++;
}
console.log('\n맡긴 손 ' + N + '판 — 완주 ' + (won / N * 100).toFixed(0) + '% · 평균 ' + (reach / N).toFixed(1) + '칸 · 각성 본 판 ' + awk + ' · 저주 받은 판 ' + cur);
