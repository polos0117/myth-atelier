/* 오토 배틀러 규칙이 코드에 옮겨졌나. 화면 없이 lib/auto.js 만 돌린다.
   --quick 은 규칙만 본다. 빼고 돌리면 맡긴 손으로 수백 판을 굴려 라운드별 승률과 시너지 표를 찍는다 —
   그건 실패가 아니라 보고다. 결과는 docs/GAME_CONCEPT.md 의 "굴려 본 것" 에 적는다.
   Run: node tests/auto-sim.cjs --quick */
const fs = require('node:fs'), assert = require('node:assert/strict');
const A = require('../lib/auto.js');
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, synergy: d('synergy') };
const quick = process.argv.includes('--quick');
const by = name => data.cards.find(c => c.name === name);
const U = (name, star, row, col) => ({ name, star, row, col });
let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; };

/* 같은 seed 는 같은 판 */
{
  const a = A.newGame(data, 42), b = A.newGame(data, 42);
  ok(JSON.stringify(a) === JSON.stringify(b), '같은 seed 는 같은 상점·상대');
  ok(JSON.stringify(A.newGame(data, 43).shop) !== JSON.stringify(a.shop), '다른 seed 는 다른 상점');
  ok(a.shop.length === A.SHOP && a.shop.every(name => by(name).cost === 1), '1라운드 상점은 1금뿐');
  ok(a.gold === 3 + 5 && a.hp === A.MAX_HP && a.round === 1 && a.phase === 'plan', '시작 금·체력·라운드');
  ok(A.cap(1) === 3 && A.cap(3) === 4 && A.cap(7) === 6 && A.cap(10) === 6, '판 위 수는 3에서 6까지');
  ok(A.income(0) === 5 && A.income(10) === 6 && A.income(30) === 8 && A.income(50) === 8, '수입 5 + 이자 최대 3');
}

/* 판의 신화권 — MYTHS_PER_GAME 권만 상점과 상대에, 첫 라운드 빈손일 때만 바꾼다 */
{
  const all = Object.keys(data.synergy.myth), a = A.newGame(data, 42);
  ok(a.myths.length === A.MYTHS_PER_GAME && a.myths.every(k => all.includes(k)) && new Set(a.myths).size === a.myths.length, '권을 뽑는다: ' + a.myths.join(','));
  const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(A.newGame(data, s).myths.join());
  ok(seen.size >= 5, '판마다 권이 달라진다 (' + seen.size + '가지)');
  const inPlay = st => new Set(A.inPlay(st, data).map(c => c.myth));
  ok([...inPlay(a)].every(k => a.myths.includes(k)) && A.inPlay(a, data).length < data.cards.length, '판의 카드는 그 셋뿐');
  const g = A.newGame(data, 7);
  for (let r = 0; r < 30; r++) { g.gold = 99; A.reroll(g, data); ok(g.shop.every(n => !n || g.myths.includes(by(n).myth)), '상점은 판의 신화권만'); }
  let e = A.newGame(data, 9); for (let r = 0; r < 10 && e.phase === 'plan'; r++) { ok(e.enemy.units.every(u => e.myths.includes(by(u.name).myth)), '상대도 판의 신화권만'); A.autoPlan(e, data); A.fight(e, data); if (e.phase === 'result') A.next(e, data); }
  const pick = all.filter(k => !a.myths.includes(k)).concat(a.myths).slice(0, A.MYTHS_PER_GAME);
  const f = A.newGame(data, 42, { myths: pick });
  ok(f.myths.slice().sort().join() === pick.slice().sort().join(), '고른 권으로 시작한다');
  ok(A.newGame(data, 42, { myths: ['norse'] }).myths.length === A.MYTHS_PER_GAME, '틀린 고르기는 무시하고 뽑는다');
  /* 동아시아가 나뉘기 전 판 — east 는 한국·중국·일본 셋으로 */
  const pre = A.newGame(data, 5); pre.myths = ['norse', 'east'];
  ok(A.liveMyths(pre, data).slice().sort().join() === 'china,japan,korea,norse' && A.inPlay(pre, data).length === 60, '옛 판의 동아시아는 셋으로 받는다');
  A.reroll(Object.assign(pre, { gold: 99 }), data);
  ok(pre.shop.every(n => !n || ['norse', 'korea', 'china', 'japan'].includes(by(n).myth)), '옛 판 상점도 그 넷에서');
  const ch = A.newGame(data, 5), gold = ch.gold, other = all.filter(k => !ch.myths.includes(k)).concat(ch.myths).slice(0, A.MYTHS_PER_GAME);
  ok(A.setMyths(ch, data, other).ok && ch.myths.slice().sort().join() === other.slice().sort().join() && ch.gold === gold, '빈손 첫 라운드엔 바꾼다(금은 그대로)');
  ok(ch.shop.every(n => other.includes(by(n).myth)), '바꾸면 상점도 새로');
  ok(A.setMyths(ch, data, Array(A.MYTHS_PER_GAME).fill('norse')).why === 'myths', '같은 권을 겹칠 수 없다');
  A.buy(ch, data, 0);
  ok(A.setMyths(ch, data, a.myths).why === 'late', '하나라도 사면 못 바꾼다');
  const old = A.newGame(data, 3); old.myths = null;
  ok(A.inPlay(old, data).length === data.cards.length, '신화권이 없는 옛 판은 전부를 쓴다');
}

/* 사고 팔고 옮기고 합치기 */
{
  const st = A.newGame(data, 1);
  const name = st.shop[0], cost = by(name).cost;
  const r = A.buy(st, data, 0);
  ok(r.ok && st.gold === 8 - cost && st.shop[0] === null && st.bench[0] && st.bench[0].name === name, '사면 금이 줄고 벤치에 온다');
  ok(!A.buy(st, data, 0).ok, '빈 칸은 못 산다');
  st.gold = 0;
  ok(A.buy(st, data, 1).why === 'gold', '금이 모자라면 못 산다');
  st.gold = 50;
  const id = st.bench[0].id;
  ok(A.move(st, id, 'board', 1).ok && st.board[1].id === id && !st.bench[0], '판으로 옮긴다');
  ok(A.move(st, id, 'board', 4).ok && st.board[4].id === id && !st.board[1], '판 안에서 옮긴다');
  /* 상한 — 1라운드는 셋 */
  for (let i = 1; i < 5; i++) A.buy(st, data, i);
  const ids = st.bench.filter(Boolean).map(u => u.id);
  ok(A.move(st, ids[0], 'board', 0).ok && A.move(st, ids[1], 'board', 2).ok, '셋까지 올린다');
  ok(A.move(st, ids[2], 'board', 3).why === 'cap', '넷째는 상한에 걸린다');
  ok(A.move(st, ids[2], 'board', 0).ok && st.board[0].id === ids[2] && st.bench.some(u => u && u.id === ids[0]), '찬 자리로 옮기면 맞바꾼다 — 수는 안 는다');
  /* 팔기 */
  const sold = st.board[0], g = st.gold;
  ok(A.sell(st, data, sold.id).ok && st.gold === g + by(sold.name).cost && !st.board[0], '팔면 값만큼 돌아온다');
  ok(A.value(by('묠니르'), 1) === 5 && A.value(by('묠니르'), 2) === 15 && A.value(by('묠니르'), 3) === 45, '별 값은 1·3·9배');
  /* 다시 돌리기 */
  const before = st.shop.slice(); st.gold = 2;
  ok(A.reroll(st, data).ok && st.gold === 0 && JSON.stringify(st.shop) !== JSON.stringify(before), '2금으로 다시 돌린다');
  ok(A.reroll(st, data).why === 'gold', '금이 없으면 못 돌린다');
}
{
  /* 합치기 — 같은 이름 셋이면 하나, 판 위 것이 남는다. 3성까지 */
  const st = A.newGame(data, 3);
  st.gold = 999;
  const put = (zone, i, name, star) => { const u = { id: st.nextId++, name, star }; (zone === 'board' ? st.board : st.bench)[i] = u; return u; };
  put('bench', 0, '칸다', 1); const keep = put('board', 1, '칸다', 1);
  st.shop[0] = '칸다';
  const r = A.buy(st, data, 0);
  ok(r.merged.length === 1 && r.merged[0].star === 2 && st.board[1].id === keep.id && st.board[1].star === 2 && !st.bench[0] && !st.bench.some(Boolean), '셋이 판 위 하나로 합쳐 2성');
  put('bench', 0, '칸다', 2); put('bench', 1, '칸다', 2);
  st.shop[0] = '칸다'; st.bench[2] = put('bench', 2, '칸다', 1); st.bench[3] = put('bench', 3, '칸다', 1);
  const r2 = A.buy(st, data, 0);
  ok(r2.merged.length === 2 && st.board[1].star === 3 && A.units(st).length === 2 && st.bench.filter(Boolean)[0].star === 2, '2성 셋 → 3성, 1성 셋 → 2성이 한 번에 이어진다');
  st.shop[0] = '칸다'; st.bench[0] = put('bench', 0, '칸다', 3); st.bench[1] = put('bench', 1, '칸다', 3);
  ok(A.buy(st, data, 0).merged.length === 0 && A.units(st).length === 5, '3성은 더 안 합친다');
}

/* 벤치가 찼어도 같은 1성이 둘이면 산 것이 바로 합쳐진다 */
{
  const st = A.newGame(data, 4);
  st.gold = 99;
  const put = (zone, i, name, star) => { const u = { id: st.nextId++, name, star }; (zone === 'board' ? st.board : st.bench)[i] = u; return u; };
  for (let i = 0; i < A.BENCH; i++) put('bench', i, ['칸다', '가다', '탈라리아', '환두대도', '야른그레이프', '드라우프니르'][i], 1);
  const keep = put('board', 1, '칸다', 1);
  st.shop[0] = '칸다';
  const r = A.buy(st, data, 0);
  ok(r.ok && r.merged[0].star === 2 && st.board[1].id === keep.id && st.board[1].star === 2 && !st.bench[0] && st.shop[0] === null && st.gold === 98, '벤치가 차 있어도 셋째를 사면 판 위 것이 2성이 되고 벤치 것이 사라진다');
  put('bench', 0, '미스틸테인', 1);
  st.shop[0] = '가다';
  ok(A.buy(st, data, 0).why === 'bench', '합쳐질 것이 없으면 여전히 벤치가 찼다');
}

/* 시너지 — 이름으로 센다 */
{
  const s = A.synergies(data, [U('묠니르', 1), U('묠니르', 2), U('궁니르', 1), U('그람', 1)]);
  ok(s.myth.norse.count === 3 && s.myth.norse.tier === 1 && s.myth.norse.value === 0.3 && s.myth.norse.next === 4, '북유럽 셋 — 같은 이름은 하나로 센다, 2단계까지 하나');
  ok(s.kind.sword.count === 1 && s.kind.sword.tier === 0, '검 하나는 안 켜진다');
  ok(s.myth.greek.count === 0 && s.myth.greek.next === 2, '없는 축은 0');
  const s4 = A.synergies(data, [U('묠니르', 1), U('궁니르', 1), U('그람', 1), U('레바테인', 1)]);
  ok(s4.myth.norse.tier === 2 && s4.myth.norse.value === 0.5 && s4.myth.norse.next === null, '넷이면 2단계');
}

/* 싸움 — 사거리와 줄 */
{
  const st = A.newGame(data, 5);
  /* 근접 둘이 앞줄 하나와 뒷줄 하나를 상대한다: 앞줄이 살아 있는 동안 뒷줄은 안 맞는다 */
  const r = A.simulate(data, st, [U('그람', 1, 0, 1), U('티르핑', 1, 0, 0)], [U('아이기스', 2, 0, 1), U('아르테미스의 활', 1, 1, 1)]);
  const firstBackHit = r.log.find(e => e.k === 'hit' && e.b === 4), frontDeath = r.log.find(e => e.k === 'die' && e.b === 3);
  ok(!firstBackHit || (frontDeath && firstBackHit.t >= frontDeath.t), '근접은 앞줄이 죽기 전에는 뒷줄을 못 친다');
  /* 원거리는 체력이 가장 낮은 쪽을 노린다 */
  const r2 = A.simulate(data, st, [U('간디바', 1, 1, 1)], [U('아이기스', 1, 0, 1), U('탈라리아', 1, 1, 0)]);
  ok(r2.log.find(e => e.k === 'hit' && e.a === 1).b === 3, '원거리는 판 어디든 약한 쪽(탈라리아)을 먼저');
  /* 중거리는 뒤 칸에도 일부 닿는다 */
  const r3 = A.simulate(data, st, [U('궁니르', 1, 0, 1)], [U('아이기스', 1, 0, 1), U('아르테미스의 활', 1, 1, 1)]);
  const sp = r3.log.find(e => e.k === 'splash');
  ok(sp && sp.b === 3 && sp.d === Math.round(r3.log.find(e => e.k === 'hit' && e.a === 1).d * 0.4), '창은 같은 칸 뒤에 40%');
  /* 결과는 누가 남았나 */
  ok(['me', 'them', 'draw'].includes(r.winner) && r.beats <= A.MAX_BEATS && r.log[r.log.length - 1].k === 'end', '끝 기록');
  const big = A.simulate(data, st, [U('묠니르', 3, 0, 1)], [U('칸다', 1, 0, 1)]);
  ok(big.winner === 'me' && big.left.them === 0 && big.ents[0].maxHp === Math.round(1100 * 3.24), '3성은 3.24배 체력, 1성 하나를 이긴다');
}
/* 싸움 — 기술과 시너지 효과 */
{
  const st = A.newGame(data, 9);
  /* 마나가 차면 기술: 천총운검(sweep 3) 앞줄 셋을 한꺼번에 */
  const r = A.simulate(data, st, [U('천총운검', 3, 0, 1)], [U('아이기스', 2, 0, 0), U('아이기스', 2, 0, 1), U('아이기스', 2, 0, 2)].map((u, i) => ({ ...u, name: ['아이기스', '케라우노스', '트리아이나'][i] })));
  const skill = r.log.find(e => e.k === 'skill');
  ok(skill && skill.skill === 'grass_cutter', '마나가 차면 기술을 쓴다');
  const hits = r.log.filter(e => e.k === 'skillhit' && e.t === skill.t);
  ok(hits.length === 3 && new Set(hits.map(h => h.b)).size === 3, '앞줄 셋을 한 번에 벤다');
  /* 그리스 둘 — 첫 공격이 치명타 */
  const g = A.simulate(data, st, [U('하르페', 1, 0, 1), U('아킬레우스의 창', 1, 0, 0)], [U('아이기스', 2, 0, 1)]);
  const crit = g.log.filter(e => e.k === 'crit');
  ok(crit.length === 2 && crit.every(c => c.d === Math.round(by(['하르페', '아킬레우스의 창'][c.a - 1]).atk * 1.6)), '그리스 둘: 첫 공격 ×1.6');
  ok(g.log.filter(e => e.k === 'hit' && e.a === 1).length > 0, '둘째 공격부터는 보통');
  /* 북유럽 둘 — 죽을 때 한 번 되살아난다 */
  const nv = A.simulate(data, st, [U('칸다', 1, 0, 1)].concat([]), [U('묠니르', 3, 0, 1)]);
  ok(!nv.log.some(e => e.k === 'revive'), '북유럽 아닌 것은 안 살아난다');
  const n2 = A.simulate(data, st, [U('다인슬레이프', 1, 0, 1), U('야른그레이프', 1, 0, 0)], [U('묠니르', 3, 0, 1)]);
  const rev = n2.log.filter(e => e.k === 'revive');
  ok(rev.length === 2 && rev.every(e => e.hp === Math.round(by(n2.ents[e.b - 1].name).hp * 0.3)), '북유럽 둘: 각자 한 번, 최대 체력의 30%');
  /* 켈트 둘 — 투혼: 잃은 체력만큼 평타가 세진다(저주 발현 전까지만 본다 — 저주도 공격을 올린다) */
  const preCurse = (r, id) => { const c = r.log.find(e => e.k === 'curse' && e.b === id); return r.log.filter(e => e.k === 'hit' && e.a === id && (!c || e.t < c.t)).map(e => e.d); };
  const ce = A.simulate(data, st, [U('칼라드볼그', 1, 0, 1), U('페일노트', 1, 1, 1)], [U('묠니르', 3, 0, 1)]);
  const cd = preCurse(ce, 1);
  ok(cd.length >= 2 && cd[0] === by('칼라드볼그').atk && Math.max(...cd) > cd[0], '켈트 둘: 다치면 평타가 오른다 ' + cd.join(','));
  const nc = A.simulate(data, st, [U('칼라드볼그', 1, 0, 1), U('가다', 1, 1, 1)], [U('묠니르', 3, 0, 1)]);
  ok(preCurse(nc, 1).length >= 2 && preCurse(nc, 1).every(d => d === by('칼라드볼그').atk), '켈트 하나면 투혼이 없다 ' + preCurse(nc, 1).join(','));
  /* 한국 둘 — 호국: 받는 피해가 15% 준다 */
  const taken = r => r.log.find(e => e.k === 'hit' && e.b === 1).d;
  const kg = taken(A.simulate(data, st, [U('칠지도', 1, 0, 1), U('김유신의 보검', 1, 1, 1)], [U('묠니르', 3, 0, 1)]));
  const kn = taken(A.simulate(data, st, [U('칠지도', 1, 0, 1), U('가다', 1, 1, 1)], [U('묠니르', 3, 0, 1)]));
  ok(kg === Math.round(kn * 0.85), '한국 둘: 받는 평타 ×0.85 ' + kg + ' / ' + kn);
  /* 일본 둘 — 일섬: 평타가 가끔 두 배. 하나면 안 난다 */
  const crits = pair => { let n = 0; for (let s = 1; s < 8; s++) n += A.simulate(data, A.newGame(data, s), pair, [U('묠니르', 3, 0, 1)]).log.filter(e => e.k === 'crit' && e.a === 1).length; return n; };
  ok(crits([U('무라마사', 1, 0, 1), U('동자절 야스츠나', 1, 1, 1)]) > 0, '일본 둘: 평타 두 배가 난다');
  ok(crits([U('무라마사', 1, 0, 1), U('가다', 1, 1, 1)]) === 0, '일본 하나면 일섬이 없다');
  /* 이형 둘 — 아군 전체 보호막으로 시작 */
  const sh = A.simulate(data, st, [U('아이기스', 1, 0, 0), U('탈라리아', 1, 1, 0), U('칸다', 1, 0, 1)], [U('묠니르', 1, 0, 1)]);
  const firstOnKanda = sh.log.find(e => e.k === 'hit' && e.b === 3);
  ok(firstOnKanda && firstOnKanda.s > 0 && firstOnKanda.s <= Math.round(by('칸다').hp * 0.12), '이형 둘: 칸다도 12% 보호막을 받는다');
  /* 둔기 — 평타 멈춤이 난다 (여러 판 중 한 번은) */
  let stunned = false;
  for (let s = 1; s < 6 && !stunned; s++) stunned = A.simulate(data, A.newGame(data, s), [U('묠니르', 1, 0, 1), U('바즈라', 1, 0, 0)], [U('아이기스', 3, 0, 1)]).log.some(e => e.k === 'stun');
  ok(stunned, '둔기 둘: 평타에 멈춤');
  /* 치유·보호막 기술은 아군에게 */
  const heal = A.simulate(data, st, [U('카두케우스', 3, 1, 1), U('아이기스', 2, 0, 1)], [U('아이기스', 3, 0, 1)]);
  const h = heal.log.find(e => e.k === 'heal');
  ok(h && h.b === 2 && h.a === 1, '카두케우스의 치유는 가장 다친 아군(앞줄 아이기스)에게');
  /* 무승부 — 서로 못 죽이면 45박에 끝난다. 검사용 허수아비 카드로 본다 */
  const dummy = { name: '허수아비', en: 'Dummy', myth: 'norse', kind: 'relic', cost: 1, hp: 9000, atk: 1, spd: 1, range: 'melee', skill: 'iron_grip', wielder: '', text: '' };
  const data2 = { cards: data.cards.concat([dummy]), skills: data.skills, synergy: data.synergy };
  const draw = A.simulate(data2, st, [U('허수아비', 1, 0, 1)], [U('허수아비', 1, 0, 1)]);
  ok(draw.winner === 'draw' && draw.beats === A.MAX_BEATS, '못 죽이면 무승부');
}

/* 저주 — 체력이 문턱 아래로 떨어지면 한 번 발현, 공격이 오르고 피를 잃고 치유를 못 받는다 */
{
  const st = A.newGame(data, 13);
  const r = A.simulate(data, st, [U('칸다', 1, 0, 1)], [U('아이기스', 3, 0, 1)]);
  const curse = r.log.find(e => e.k === 'curse');
  ok(curse && curse.b === 1, '칸다가 저주 발현');
  const before = r.log.find(e => e.k === 'hit' && e.a === 1 && e.t < curse.t), after = r.log.find(e => e.k === 'hit' && e.a === 1 && e.t > curse.t);
  ok(before && after && after.d === Math.round(before.d * (1 + by('칸다').curse.atk)), '발현 뒤 공격이 curse.atk 만큼 오른다: ' + (before && before.d) + ' → ' + (after && after.d));
  ok(r.log.some(e => e.k === 'bleed' && e.b === 1 && e.d === Math.round(by('칸다').hp * by('칸다').curse.bleed)), '박자마다 최대 체력의 bleed 만큼');
  ok(r.log.filter(e => e.k === 'curse' && e.b === 1).length === 1, '한 판에 한 번');
  ok(r.ents[0].cursed === true && r.ents[1].cursed === false, '결과에 상태가 남는다');
  /* 치유는 저주받은 아군을 건너뛴다 */
  const h = A.simulate(data, st, [U('카두케우스', 3, 1, 1), U('칸다', 1, 0, 1)], [U('아이기스', 3, 0, 1)]);
  const c2 = h.log.find(e => e.k === 'curse' && e.b === 2);
  ok(c2 && !h.log.some(e => e.k === 'heal' && e.b === 2 && e.t > c2.t), '저주받은 칸다는 치유를 못 받는다');
  /* 되살아나도 저주는 그대로 — 북유럽 둘 */
  const n = A.simulate(data, st, [U('다인슬레이프', 1, 0, 1), U('야른그레이프', 1, 0, 0)], [U('묠니르', 3, 0, 1)]);
  const rev = n.log.find(e => e.k === 'revive' && e.b === 1), cur = n.log.find(e => e.k === 'curse' && e.b === 1);
  ok(rev && cur && n.log.filter(e => e.k === 'curse' && e.b === 1).length === 1 && n.log.some(e => e.k === 'bleed' && e.b === 1 && e.t > rev.t), '되살아난 뒤에도 저주가 이어진다');
  /* 전승 자체가 저주인 무기는 문턱이 높고 세다 */
  ok(by('티르핑').curse.at > by('칸다').curse.at && by('티르핑').curse.atk > by('칸다').curse.atk, '티르핑의 저주가 칸다보다 세다');
}

/* 라운드 흐름 — 지면 체력이 깎이고, 0이면 끝. 열 라운드 이기면 이긴다 */
{
  const st = A.newGame(data, 11);
  ok(A.fight(st, data).ok && ['result', 'lost'].includes(st.phase) && st.result.round === 1, '빈 판으로도 싸움은 돈다');
  ok(st.result.winner === 'them' && st.result.lost === 2 + st.result.left.them && st.hp === A.MAX_HP - st.result.lost, '지면 2 + 남은 상대 수');
  ok(!A.buy(st, data, 0).ok && !A.fight(st, data).ok, '결과 화면에서는 사거나 싸울 수 없다');
  ok(A.next(st, data).ok && st.round === 2 && st.phase === 'plan' && st.shop.every(Boolean), '다음 라운드 — 상점이 새로');
  st.hp = 1; A.fight(st, data);
  ok(st.phase === 'lost' && st.hp === 0 && !A.next(st, data).ok, '체력이 0이면 끝');
  const w = A.newGame(data, 12); w.round = A.ROUNDS; w.board[1] = { id: 99, name: '묠니르', star: 3 }; w.enemy = { myth: 'norse', units: [U('칸다', 1, 0, 1)] };
  A.fight(w, data);
  ok(w.phase === 'won', '마지막 라운드를 이기면 이긴다');
  /* 상대는 라운드가 갈수록 값이 오른다 */
  const v = r => { const s = A.newGame(data, 20); s.round = r; return A.makeEnemy(s, data).units.reduce((a, u) => a + A.value(by(u.name), u.star), 0); };
  ok(v(1) < v(5) && v(5) < v(10) && A.budget(10) > A.budget(1), '상대 값은 오른다');
  const e1 = A.makeEnemy(A.newGame(data, 21), data);
  ok(e1.units.length === 2 && e1.units.every(u => u.star === 1 && by(u.name).cost === 1), '1라운드 상대는 1금 둘, 1성');
  const e10 = (() => { const s = A.newGame(data, 22); s.round = 10; return A.makeEnemy(s, data); })();
  ok(e10.units.length === A.CELLS && e10.units.every(u => u.row < A.ROWS && u.col < A.COLS), '10라운드 상대는 여섯, 판 안에');
  ok(e10.units.filter(u => by(u.name).range !== 'ranged').every(u => u.row === 0 || e10.units.filter(x => x.row === 0).length === 3), '근접은 앞줄부터');
}

/* 맡긴 손 — 한 판을 끝까지 두고, 상태가 늘 JSON 으로 남는다 */
{
  const st = A.newGame(data, 77);
  let rounds = 0;
  while (st.phase === 'plan' && rounds++ < 20) {
    A.autoPlan(st, data);
    ok(A.onBoard(st) <= A.cap(st.round) && st.gold >= 0, '맡긴 손도 규칙 안에서');
    const copy = JSON.parse(JSON.stringify(st));
    A.fight(st, data); A.fight(copy, data);
    ok(JSON.stringify(st.result.log) === JSON.stringify(copy.result.log), '같은 상태는 같은 싸움 (저장했다 이어도 같다)');
    if (st.phase === 'result') A.next(st, data);
  }
  ok(['won', 'lost'].includes(st.phase) && st.history.length === st.round, '끝까지 간다');
}

console.log('PASS 오토 배틀 규칙 ' + n + '가지');
if (quick) process.exit(0);

/* ── 균형 표 — 실패가 아니라 보고 ── */
const N = 400, w = Array(A.ROUNDS + 1).fill(0), p = Array(A.ROUNDS + 1).fill(0), ends = Array(A.ROUNDS + 1).fill(0);
const synWin = {}, synGames = {};
let won = 0;
for (let s = 1; s <= N; s++) {
  const st = A.newGame(data, s);
  while (st.phase === 'plan') {
    A.autoPlan(st, data);
    const r = st.round, syn = A.synergies(data, A.boardUnits(st));
    A.fight(st, data); p[r]++;
    const win = st.result.winner === 'me';
    if (win) w[r]++;
    for (const axis of ['myth', 'kind']) for (const k in syn[axis]) if (syn[axis][k].tier) {
      const key = axis + '.' + k + '×' + syn[axis][k].tier;
      synGames[key] = (synGames[key] || 0) + 1; synWin[key] = (synWin[key] || 0) + (win ? 1 : 0);
    }
    if (st.phase === 'result') A.next(st, data);
  }
  ends[st.round]++;
  if (st.phase === 'won') won++;
}
console.log('\n맡긴 손 ' + N + '판 — 완주(' + A.ROUNDS + '라운드 승) ' + (won / N * 100).toFixed(0) + '%');
console.log('라운드  승률   끝난 판');
for (let r = 1; r <= A.ROUNDS; r++) console.log(String(r).padStart(4) + '   ' + (w[r] / p[r] * 100).toFixed(0).padStart(3) + '%   ' + ends[r]);
console.log('\n시너지가 켜진 라운드의 승률 (켜진 판 수)');
for (const k of Object.keys(synGames).sort()) console.log('  ' + k.padEnd(16) + (synWin[k] / synGames[k] * 100).toFixed(0).padStart(3) + '%  (' + synGames[k] + ')');
