/* 던전 규칙 — 덱·마나·게이지·각성·저주·제단·문·전리품·상점·휴식·길의 끝. 화면은 안 본다(그건 run-screen). */
const fs = require('node:fs'), assert = require('node:assert/strict');
const R = require('../lib/run.js');
const d = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, run: d('run'), wielders: d('wielder').wielders, draft: d('draft') };
const T = R.tune(data);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
/* 상대가 여럿이라 — 하나만 피 1로 남기고 나머지는 이미 쓰러진 것으로 */
const oneLeft = s => s.battle.enemies.forEach((e, i) => { if (i) { e.alive = false; e.hp = 0; } else e.hp = 1; });

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
ok(b.enemies.length === R.foeCount(data, 0, false) && b.enemies.length === 2 && b.enemies.every(e => e.alive && e.hp > 0), '첫 상대는 둘');
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
st4.party[0].hp = 1; st4.party[0].maxHp = 100; st4.battle.enemies.forEach(e => { e.atk = 0; });
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
oneLeft(st5);
const first = st5.battle.hand.findIndex(c => R.spec(data, c).mult);
R.play(st5, data, first, 0);
ok(st5.battle.over === 'win' && st5.phase === 'result', '상대가 쓰러지면 이김');
/* 전리품 — 금화와 카드 셋 중 한 장 */
const L = data.run.loot, rw = st5.reward;
ok(rw && rw.gold >= L.fight && rw.gold <= L.fight + L.spread && st5.gold === rw.gold, '첫 싸움 금화 ' + rw.gold);
ok(rw.cards.length === L.choices && new Set(rw.cards.map(c => c.key + c.owner)).size === L.choices, '전리품 셋, 겹치지 않는다');
ok(rw.cards.every(c => party.includes(c.owner) && data.run.cards[R.cardOf(data, c.owner).kind].some(k => k.key === c.key && !(k.basic && k.cost === 1))), '전리품은 동료 종류의 카드, 1마나 기본기는 없다');
const deck0 = st5.deck.length;
ok(R.takeReward(st5, data, 1).ok && st5.deck.length === deck0 + 1 && st5.deck[deck0].key === rw.cards[1].key, '한 장이 덱에 들어간다');
ok(R.takeReward(st5, data, 0).why === 'once', '전리품은 한 장');
ok(R.proceed(st5, data).kind === 'fight' && st5.node === 1, '둘째 칸도 싸움');
ok(st5.battle.deck.length + st5.battle.hand.length === 13 && !st5.reward, '덱이 이어진다 — 열셋');
oneLeft(st5); R.play(st5, data, st5.battle.hand.findIndex(c => R.spec(data, c).mult), 0); R.proceed(st5, data);
ok(st5.phase === 'shrine', '셋째 칸은 제단');
ok(R.chooseShrine(st5, data, '묠니르').ok && st5.party[1].awakened && st5.phase === 'map', '제단에서 영구 각성');
ok(R.chooseShrine(st5, data, '궁니르').why === 'phase', '제단은 한 번');
R.proceed(st5, data);
ok(st5.phase === 'battle' && st5.battle.awake['묠니르'] === true && st5.battle.enemies.length === 3, '영구 각성은 각성으로 시작. 넷째 칸 상대는 셋');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
R.proceed(st5, data);
ok(st5.phase === 'gate', '다섯째 칸은 저주의 문');
ok(R.chooseGate(st5, data, null).ok && st5.phase === 'map' && !st5.party.some(m => m.cursed), '문은 지나칠 수 있다');
/* 상점 — 사기·빼기·치유·정화, 셋 다 한 번씩 */
const S = data.run.shop;
st5.party[2].cursed = true; st5.party[0].hp = 5;
ok(R.proceed(st5, data).kind === 'shop' && st5.phase === 'shop' && st5.shop.cards.length === S.cards, '여섯째 칸은 상점 — 카드 셋');
ok(st5.shop.cards.every(c => c.price === (c.rare ? S.rare : S.common)), '값은 희귀 ' + S.rare + ' · 보통 ' + S.common);
st5.gold = 0;
ok(R.buy(st5, data, 0).why === 'gold' && R.shopHeal(st5, data).why === 'gold', '금화가 없으면 못 산다');
st5.gold = 500; const dk = st5.deck.length;
ok(R.buy(st5, data, 0).ok && st5.shop.cards[0].sold && st5.deck.length === dk + 1 && st5.gold === 500 - st5.shop.cards[0].price, '산다');
ok(R.buy(st5, data, 0).why === 'card', '판 것은 다시 못 산다');
const g1 = st5.gold, gone = st5.deck[0];
ok(R.removeCard(st5, data, 0).ok && st5.deck.length === dk && st5.gold === g1 - S.remove, '한 장 뺀다: ' + gone.key);
ok(R.removeCard(st5, data, 0).why === 'once', '빼기는 한 번');
const hp0s = st5.party[0].hp, hpC = st5.party[2].hp;
ok(R.shopHeal(st5, data).ok && st5.party[0].hp === Math.min(st5.party[0].maxHp, hp0s + Math.round(st5.party[0].maxHp * S.healRatio)) && st5.party[2].hp === hpC, '치유 — 저주받은 동료는 못 받는다');
ok(R.shopHeal(st5, data).why === 'once', '치유는 한 번');
ok(R.purify(st5, data, st5.party[0].name).why === 'who', '저주 없는 동료는 정화할 것이 없다');
ok(R.purify(st5, data, st5.party[2].name).ok && !st5.party[2].cursed && R.stateOf(st5, st5.party[2]) === 'base', '정화 — 저주가 풀리고 그림도 기본으로');
ok(R.leaveShop(st5).ok && st5.phase === 'map', '상점을 떠난다');
/* 빼기는 무기마다 한 장을 남긴다 */
const sh = R.newRun(data, 31, party); sh.node = 4; sh.phase = 'map'; R.proceed(sh, data); sh.gold = 999;
sh.deck = sh.deck.filter((c, i) => c.owner !== party[0] || i === sh.deck.findIndex(x => x.owner === party[0]));
ok(R.removeCard(sh, data, sh.deck.findIndex(c => c.owner === party[0])).why === 'last', '마지막 한 장은 못 뺀다');
R.proceed(st5, data); ok(st5.phase === 'battle', '일곱째 칸 싸움');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
ok(st5.reward.gold >= L.fight + L.perNode * 6, '뒤 칸일수록 금화가 많다');
R.proceed(st5, data);
ok(st5.phase === 'rest', '여덟째 칸은 휴식');
st5.party[0].hp = 10; const mh = st5.party[0].maxHp;
ok(R.rest(st5, data).ok && st5.party[0].hp === 10 + Math.round(mh * T.restHeal) && st5.phase === 'map', '휴식은 30%');
R.proceed(st5, data);
ok(st5.phase === 'battle' && st5.battle.boss && st5.battle.enemies[0].boss && st5.battle.enemies.every(e => R.cardOf(data, e.name).cost === 5), '아홉째 칸은 보스 — 5금');
st5.battle.enemies.forEach(e => { e.hp = 1; }); st5.battle.mana = 9;
while (st5.battle.over !== 'win') { const i = st5.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(st5, data); st5.battle.mana = 9; continue; } R.play(st5, data, i, 0); }
ok(st5.phase === 'won' && !st5.reward, '보스를 이기면 길의 끝 — 전리품은 없다');

/* 예전 저장 — 덱·금화가 없는 길도 이어진다 */
const old = R.newRun(data, 41, party); delete old.deck; delete old.gold; R.proceed(old, data);
ok(old.deck.length === 12 && old.gold === L.start && old.battle.deck.length + old.battle.hand.length === 12, '덱 없던 저장은 동료로 덱을 만든다');

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
ok(h.battle.enemies.length === 2 && h.battle.enemies[0].name === '아이기스' && h.battle.enemies[0].wielder === '아테나' && h.battle.enemies[1].name === '여의봉', '첫 상대는 드래프트 적 편의 짝 둘');
ok(h.battle.enemies[0].maxHp > R.newRun(data, 21, ['그람', '묠니르', '아이기스']).party[0].maxHp, '3등이면 상대 체력이 ×1.2');
/* 악연은 거절이 안 된다 */
h.party[0].hp = 1; h.party[0].maxHp = 100; h.battle.enemies.forEach(e => { e.atk = 0; }); R.endTurn(h, data);
ok(h.battle.ask === '궁니르' && R.answerCurse(h, data, false).why === 'feud', '악연은 저주를 거절할 수 없다');
ok(R.answerCurse(h, data, true).ok && h.party[0].cursed, '받는다');
/* 예비 — 쓰러진 자리에 다음 칸부터 */
h.party[1].alive = false; h.party[1].hp = 0;
h.battle.enemies.forEach(e => { e.hp = 1; }); h.battle.mana = 9;
while (h.battle.over !== 'win') { const i = h.battle.hand.findIndex(c => R.spec(data, c).mult && h.party.find(p => p.name === c.owner).alive); if (i < 0) { R.endTurn(h, data); h.battle.mana = 9; continue; } R.play(h, data, i, 0); }
R.proceed(h, data);
ok(h.party[1].name === '그람' && h.party[1].wielder === '시구르드' && h.party[1].alive && h.reserve.length === 1 && h.log.some(l => l.k === 'reserve' && l.a === '그람' && l.b === '묠니르'), '예비가 올라온다');
ok(h.battle.enemies.map(e => e.name).join(',') === '트리슐라', '둘째 싸움은 남은 짝');
ok(!h.deck.some(c => c.owner === '묠니르') && h.deck.filter(c => c.owner === '그람').length === 4, '쓰러진 무기의 카드는 빠지고 예비의 넉 장이 들어온다');
/* 보스 — 1등의 최고의 짝 */
const hb = R.newRun(data, 22, null, H); hb.node = 7; hb.phase = 'map'; R.proceed(hb, data);
ok(hb.battle.boss && hb.battle.enemies[0].name === '케라우노스' && hb.battle.enemies[0].wielder === '제우스' && hb.battle.enemies[0].boss, '보스는 넘겨받은 짝');
/* 드래프트 없이도 그대로 */
const plain = R.newRun(data, 3, ['궁니르', '묠니르', '아이기스']);
ok(!plain.fromDraft && plain.party.every(m => !m.wielder && m.mult === 1 && m.gaugeMax === T.gauge), '드래프트 없이 오면 옛 규칙 그대로');

/* 방어구 — 도발하면 다음 상대 차례의 한 대 공격이 모두 그 동료에게, 방진은 동료 전부에게 보호막 */
{
  const tr = R.newRun(data, 31, party); R.proceed(tr, data);
  const tb = tr.battle; tb.hand.unshift({ key: 'armor.taunt', owner: '아이기스', id: 900 }, { key: 'armor.wall', owner: '아이기스', id: 901 }); tb.mana = 9;
  const sh0 = tr.party.map(p => p.shield);
  ok(R.play(tr, data, 1, 0).ok && tr.party.every((p, i) => p.shield > sh0[i]), '방진 — 동료 전부에게 보호막');
  ok(R.play(tr, data, 0, 0).ok && tb.taunt === '아이기스', '도발 — 아이기스가 맡는다');
  const from = tr.log.length; R.endTurn(tr, data);
  const hits = tr.log.slice(from).filter(l => l.k === 'ehit');
  ok(hits.length > 0 && hits.every(l => l.b === '아이기스') && !tr.battle.taunt, '한 대 공격은 모두 아이기스에게, 차례가 끝나면 풀린다');
}

/* 상대의 다음 행동 — 턴이 시작될 때 보이고, 턴 끝에 그대로 한다 */
{
  const it = R.newRun(data, 41, party); R.proceed(it, data);
  const ib = it.battle;
  ok(ib.enemies.every(e => e.intent && (e.intent.k === 'hit' ? it.party.some(p => p.name === e.intent.b) && e.intent.d === e.atk : e.intent.k === 'all')), '상대마다 다음 행동이 정해져 있다');
  const want = ib.enemies.filter(e => e.intent.k === 'hit').map(e => [e.name, e.intent.b, e.intent.d]);
  const from = it.log.length; R.endTurn(it, data);
  const hits = it.log.slice(from).filter(l => l.k === 'ehit');
  ok(want.every(([a, b2, d]) => hits.some(l => l.a === a && l.b === b2 && l.d <= d)), '예고한 동료를 예고한 만큼(보호막만큼 덜) 친다');
  ok(it.battle.over || it.battle.enemies.filter(e => e.alive).every(e => e.intent), '다음 턴의 행동이 다시 정해진다');
  /* 셋째 행동은 기술 — 예고가 '전부'로 바뀐다 */
  const sk = R.newRun(data, 42, party); R.proceed(sk, data); sk.party.forEach(p => { p.hp = p.maxHp = 99999; });
  for (let k = 0; k < 2; k++) R.endTurn(sk, data);
  ok(sk.battle.enemies.filter(e => e.alive && !e.stunned).every(e => e.intent.k === 'all' && e.intent.d > e.atk), '셋째 행동은 동료 전부를 치는 기술로 예고된다');
  /* 겨눈 동료가 그새 쓰러지면 다른 동료를 친다 */
  const rt = R.newRun(data, 43, party); R.proceed(rt, data);
  const e0 = rt.battle.enemies.find(e => e.intent.k === 'hit');
  if (e0) { const tg = rt.party.find(p => p.name === e0.intent.b); tg.alive = false; tg.hp = 0; const f2 = rt.log.length; R.endTurn(rt, data);
    ok(rt.log.slice(f2).some(l => l.k === 'ehit' && l.a === e0.name && l.b !== tg.name), '겨눈 동료가 쓰러졌으면 다른 동료를'); }
}

/* ── 평면도 — lib/shelf-gen.wasm 이 run.json 의 map 표로 짠 두 층. 갈림길·계단·보스. 길 규칙만 다르고 싸움은 위와 같다 ── */
const SH = require('../lib/shelf-gen.js');
const planOf = s => { const k = SH.seedOf('myth:' + s); return SH.planSpec(k[0], k[1], data.run.map); };
/* 맡긴 손 한 판 — pick(next, floor) 이 갈 방을 고른다. 끝나면 상태 */
function autoRun(r, pick) {
  let g = 0;
  while (!['won', 'lost'].includes(r.phase) && g++ < 900) {
    if (r.phase === 'result') { R.takeReward(r, data, 0); R.proceed(r, data); }
    else if (r.phase === 'map') { const nx = R.nextRooms(r); R.proceed(r, data, r.plan ? pick(nx, R.floorOf(r)) : undefined); }
    else if (r.phase === 'shop') { R.shopHeal(r, data); r.shop.cards.forEach((c, i) => R.buy(r, data, i)); R.leaveShop(r); }
    else if (r.phase === 'shrine') R.chooseShrine(r, data, R.living(r)[0].name);
    else if (r.phase === 'gate') R.chooseGate(r, data, null);
    else if (r.phase === 'rest') R.rest(r, data);
    else { const bb = r.battle; if (bb.ask) { R.answerCurse(r, data, true); continue; }
      const i = bb.hand.findIndex(c => R.spec(data, c).cost <= bb.mana && r.party.find(p => p.name === c.owner).alive);
      if (i >= 0) R.play(r, data, i, 0); else R.endTurn(r, data); }
  }
  return r;
}
SH.load(fs.readFileSync('lib/shelf-gen.wasm')).then(() => {
  const M = data.run.map;
  ok(M && M.floors === 2 && M.guard === 'fight' && M.last_exit === 'boss', 'map 표 — 두 층, 계단 앞은 싸움, 끝에 보스');
  const plan = planOf(7);
  ok(plan && plan.floors.length === 2 && plan.floors.every(f => f.cols === M.cols), '평면도 두 층, 층마다 ' + M.cols + '열');
  ok(JSON.stringify(planOf(7)) === JSON.stringify(plan) && JSON.stringify(planOf(8)) !== JSON.stringify(plan), '같은 씨앗 같은 평면도');
  for (const f of plan.floors) {
    const col = c => f.rooms.filter(r => r.col === c);
    ok(col(0).length === 1 && col(0)[0].kind === 'entry' && col(0)[0].id === 0, f.n + '층 첫 열은 들어온 자리 하나(0번 방)');
    ok(col(f.cols - 1).length === 1 && col(f.cols - 1)[0].kind === (f.n === 2 ? 'boss' : 'stairs'), f.n + '층 마지막 열은 ' + (f.n === 2 ? '보스' : '계단'));
    ok(col(f.cols - 2).every(r => r.kind === 'fight'), f.n + '층 계단 앞 열은 모두 싸움');
    for (let c = 1; c < f.cols - 1; c++) ok(col(c).length >= M.middle[0] && col(c).length <= M.middle[1], f.n + '층 ' + c + '열 방 ' + col(c).length);
    ok(f.edges.every(([a, b]) => f.rooms[b].col === f.rooms[a].col + 1), f.n + '층 길은 이웃 열로만');
    ok(f.rooms.every(r => r.col === f.cols - 1 || f.edges.some(e => e[0] === r.id)) && f.rooms.every(r => r.col === 0 || f.edges.some(e => e[1] === r.id)), f.n + '층 모든 방이 길에 닿는다');
    const kinds = new Set(f.rooms.map(r => r.kind));
    ok(f.n === 1 ? kinds.has('shrine') && !kinds.has('shop') && !kinds.has('gate') : kinds.has('shop') && kinds.has('gate') && !kinds.has('shrine'), f.n + '층의 방 종류: ' + [...kinds].join(','));
  }
  const p1 = R.newRun(data, 7, party, { plan });
  ok(p1.plan === plan && p1.floor === 0 && p1.room === 0 && p1.visited.length === 1 && p1.phase === 'map' && p1.node === -1, '평면도 길은 1층 들어온 자리에서');
  ok(R.floorOf(p1).n === 1 && R.roomOf(p1).kind === 'entry', 'floorOf·roomOf');
  const nx = R.nextRooms(p1);
  ok(nx.length >= 1 && nx.length <= 3 && nx.every(id => R.roomOf(p1, id).col === 1), '첫 갈림길 — 1열의 방 ' + nx.length);
  ok(R.proceed(p1, data).why === 'room' && R.proceed(p1, data, 99).why === 'room' && R.proceed(p1, data, 0).why === 'room', '길이 닿지 않는 방은 못 간다');
  const k1 = R.roomOf(p1, nx[0]).kind, r1 = R.proceed(p1, data, nx[0]);
  ok(r1.ok && r1.kind === k1 && p1.room === nx[0] && p1.visited.length === 2 && p1.node === 0, '방에 들어가면 그 종류, 첫째 칸');
  ok(R.nextRooms(p1).length === 0, '길 화면이 아니면 갈 방이 없다');
  /* 한 층을 끝까지 — 계단 앞은 싸움, 계단은 다음 층 */
  const walk = r => { while (r.phase === 'map' && R.roomOf(r).col < R.floorOf(r).cols - 2) { const nn = R.nextRooms(r); R.proceed(r, data, nn[0]); if (r.phase !== 'map') return; } };
  const p2 = R.newRun(data, 9, party, { plan: planOf(9) });
  let guardNode = -1;
  for (let g = 0; g < 20 && !(p2.phase === 'battle' && R.roomOf(p2).col === R.floorOf(p2).cols - 2); g++) {
    if (p2.phase === 'map') walk(p2);
    if (p2.phase === 'map') { const nn = R.nextRooms(p2); R.proceed(p2, data, nn[0]); }
    if (p2.phase === 'battle') { if (R.roomOf(p2).col === R.floorOf(p2).cols - 2) break; p2.battle.enemies.forEach(e => { e.hp = 1; }); p2.battle.mana = 9;
      while (p2.battle.over !== 'win') { const i = p2.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(p2, data); p2.battle.mana = 9; continue; } R.play(p2, data, i, 0); }
      ok(p2.phase === 'result' && R.proceed(p2, data).kind === 'map' && p2.phase === 'map' && !p2.reward, '이긴 뒤엔 길 화면으로 돌아간다'); }
    else if (p2.phase === 'shrine') R.chooseShrine(p2, data, R.living(p2)[0].name);
    else if (p2.phase === 'rest') R.rest(p2, data);
    else if (p2.phase === 'gate') R.chooseGate(p2, data, null);
    else if (p2.phase === 'shop') R.leaveShop(p2);
  }
  ok(p2.phase === 'battle' && !p2.battle.boss && R.roomOf(p2).kind === 'fight', '계단 앞 싸움');
  guardNode = p2.node;
  ok(p2.node === M.cols - 3, '1층을 다 가면 ' + (M.cols - 3) + '째 칸(0부터) — 칸 수는 옛 길과 같은 걸음');
  p2.battle.enemies.forEach(e => { e.hp = 1; }); p2.battle.mana = 9;
  while (p2.battle.over !== 'win') { const i = p2.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(p2, data); p2.battle.mana = 9; continue; } R.play(p2, data, i, 0); }
  ok(p2.phase === 'result' && p2.reward, '1층 마지막 싸움도 전리품 — 보스가 아니다');
  R.proceed(p2, data);
  const st2 = R.nextRooms(p2);
  ok(st2.length === 1 && R.roomOf(p2, st2[0]).kind === 'stairs', '그 뒤엔 계단 하나');
  const rs = R.proceed(p2, data, st2[0]);
  ok(rs.ok && rs.kind === 'stairs' && rs.floor === 1 && p2.floor === 1 && p2.room === 0 && p2.visited.length === 1 && p2.phase === 'map' && p2.node === guardNode, '계단 — 2층 들어온 자리, 칸은 그대로');
  ok(R.floorOf(p2).n === 2 && R.nextRooms(p2).every(id => R.roomOf(p2, id).col === 1), '2층 첫 갈림길');
  /* 2층 끝 — 보스, 이기면 길의 끝 */
  const p3 = R.newRun(data, 11, party, { plan: planOf(11) });
  p3.floor = 1; const g3 = R.floorOf(p3).rooms.find(r => r.col === R.floorOf(p3).cols - 2); p3.room = g3.id; p3.visited = [0, g3.id]; p3.node = 7;
  const bn = R.nextRooms(p3);
  ok(bn.length === 1 && R.roomOf(p3, bn[0]).kind === 'boss', '2층 계단 자리는 보스');
  ok(R.proceed(p3, data, bn[0]).kind === 'boss' && p3.phase === 'battle' && p3.battle.boss && p3.battle.enemies[0].boss && p3.node === 8, '보스 싸움 — 아홉째 칸');
  p3.battle.enemies.forEach(e => { e.hp = 1; }); p3.battle.mana = 9;
  while (p3.battle.over !== 'win') { const i = p3.battle.hand.findIndex(c => R.spec(data, c).mult); if (i < 0) { R.endTurn(p3, data); p3.battle.mana = 9; continue; } R.play(p3, data, i, 0); }
  ok(p3.phase === 'won' && !p3.reward, '보스를 이기면 길의 끝');
  /* 맡긴 손이 평면도 길을 끝까지 간다(첫 방만 고른다) */
  const a1 = autoRun(R.newRun(data, 5, party, { plan: planOf(5) }), nx => nx[0]);
  ok(['won', 'lost'].includes(a1.phase) && (a1.phase === 'lost' || a1.floor === 1), '맡긴 손이 끝까지 간다: ' + a1.phase + ' ' + (a1.floor + 1) + '층 ' + (a1.node + 1) + '칸');
  assert.throws(() => R.newRun(data, 1, party, { plan: { floors: [] } }), '층 없는 평면도는 못 받는다');
  /* 평면도 없는 옛 저장은 nodes 차례 그대로 */
  const lin = R.newRun(data, 7, party);
  ok(!lin.plan && R.nextRooms(lin).length === 0 && R.proceed(lin, data).kind === 'fight', '평면도가 없으면 nodes 차례');
  console.log('PASS 던전 규칙 ' + n + '가지(평면도 포함)');
  balance();
}).catch(e => { console.error(e); process.exit(1); });

/* ── 균형 표 — 실패가 아니라 보고. 맡긴 손: 마나 되는 카드 아무거나, 저주는 받는다, 제단은 첫 동료, 문은 지나친다 ── */
function balance() {
if (process.argv.includes('--quick')) return;
const N = 300;
for (const TAKE of [false, true]) {
let won = 0, awk = 0, cur = 0, reach = 0, gold = 0, deck = 0;
for (let s = 1; s <= N; s++) {
  const r = R.newRun(data, s, party); let g = 0;
  while (!['won', 'lost'].includes(r.phase) && g++ < 600) {
    if (r.phase === 'result') { if (TAKE) R.takeReward(r, data, 0); R.proceed(r, data); }
    else if (r.phase === 'map') R.proceed(r, data);
    else if (r.phase === 'shop') { if (TAKE) { R.shopHeal(r, data); r.shop.cards.forEach((c, i) => R.buy(r, data, i)); } R.leaveShop(r); }
    else if (r.phase === 'shrine') R.chooseShrine(r, data, R.living(r)[0].name);
    else if (r.phase === 'gate') R.chooseGate(r, data, null);
    else if (r.phase === 'rest') R.rest(r, data);
    else { const bb = r.battle; if (bb.ask) { R.answerCurse(r, data, true); continue; }
      const i = bb.hand.findIndex(c => R.spec(data, c).cost <= bb.mana && r.party.find(p => p.name === c.owner).alive);
      if (i >= 0) R.play(r, data, i, 0); else R.endTurn(r, data); }
  }
  if (r.phase === 'won') won++; reach += r.node + 1;
  if (r.log.some(l => l.k === 'awaken') || r.party.some(m => m.awakened)) awk++; if (r.party.some(m => m.cursed)) cur++;
  gold += r.gold; deck += r.deck.length;
}
console.log((TAKE ? '' : '\n') + '맡긴 손(옛 길) ' + N + '판 · ' + (TAKE ? '전리품 첫 장·상점 치유와 살 수 있는 것' : '전리품·상점 안 씀') + ' — 완주 ' + (won / N * 100).toFixed(0) + '% · 평균 ' + (reach / N).toFixed(1) + '칸 · 각성 본 판 ' + awk + ' · 저주 받은 판 ' + cur + ' · 남은 금화 ' + (gold / N).toFixed(0) + ' · 덱 ' + (deck / N).toFixed(1));
}
/* 평면도 길 — 방 고르기 셋: 첫 방 · 싸움 피하기(제단·상점·휴식 먼저) · 싸움 찾기 */
const PICKS = { '첫 방': nx => nx[0],
  '싸움 피함': (nx, f) => nx.slice().sort((a, b) => ['shrine', 'shop', 'rest', 'gate', 'fight'].indexOf(f.rooms[a].kind) - ['shrine', 'shop', 'rest', 'gate', 'fight'].indexOf(f.rooms[b].kind))[0],
  '싸움 찾음': (nx, f) => nx.slice().sort((a, b) => ['fight', 'shrine', 'shop', 'rest', 'gate'].indexOf(f.rooms[a].kind) - ['fight', 'shrine', 'shop', 'rest', 'gate'].indexOf(f.rooms[b].kind))[0] };
for (const name in PICKS) {
  let won = 0, floor2 = 0, gold = 0, deck = 0;
  for (let s = 1; s <= N; s++) {
    const r = autoRun(R.newRun(data, s, party, { plan: planOf(s) }), PICKS[name]);
    if (r.phase === 'won') won++; if (r.floor === 1) floor2++; gold += r.gold; deck += r.deck.length;
  }
  console.log('맡긴 손(평면도 · ' + name + ') ' + N + '판 — 완주 ' + (won / N * 100).toFixed(0) + '% · 2층 닿은 판 ' + floor2 + ' · 남은 금화 ' + (gold / N).toFixed(0) + ' · 덱 ' + (deck / N).toFixed(1));
}
}
