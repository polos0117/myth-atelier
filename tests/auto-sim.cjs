/* 오토 배틀러 규칙이 코드에 옮겨졌나. 화면 없이 lib/auto.js 만 돌린다.
   --quick 은 규칙만 본다. 빼고 돌리면 맡긴 손(나)과 맞수 다섯으로 수백 판을 굴려 순위·판 길이·시너지 표를 찍는다 —
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
/* 한 판의 무기 장수는 늘 같다 — 더미 + 모두의 상점 + 모두의 판·벤치(별만큼) */
const total = st => Object.values(st.pool).reduce((a, b) => a + b, 0)
  + A.players(st).reduce((a, p) => a + p.shop.filter(Boolean).length + A.units(p).reduce((s, u) => s + [0, 1, 3, 9][u.unit.star], 0), 0);
const fresh = st => A.inPlay(st, data).reduce((a, c) => a + A.POOL_SIZE[c.cost], 0);
/* PvP 라운드까지 맡긴 손으로 민다 */
const toRound = (st, r) => { while (st.round < r && st.phase === 'plan') { A.autoPlan(st, data); A.fight(st, data); if (st.phase === 'result') A.next(st, data); } return st; };

/* 같은 seed 는 같은 판. 시작 */
{
  const a = A.newGame(data, 42), b = A.newGame(data, 42);
  ok(JSON.stringify(a) === JSON.stringify(b), '같은 seed 는 같은 판(맞수·더미까지)');
  ok(JSON.stringify(A.newGame(data, 43).shop) !== JSON.stringify(a.shop), '다른 seed 는 다른 상점');
  ok(a.shop.length === A.SHOP && a.shop.every(name => by(name).cost === 1), '1라운드 상점은 1금뿐');
  ok(a.gold === 3 + 5 && a.hp === A.MAX_HP && A.MAX_HP === 100 && a.round === 1 && a.level === 1 && a.phase === 'plan', '시작 금 8·체력 100·레벨 1');
  ok(a.bots.length === A.PLAYERS - 1 && A.PLAYERS === 6 && a.bots.every(p => p.hp === 100 && p.alive && p.name && p.bot), '맞수 다섯');
  ok(A.CELLS === 12 && A.ROWS === 3 && A.COLS === 4 && A.BENCH === 9, '판 세 줄 × 네 칸, 벤치 아홉');
  ok(A.isPve(1) && A.isPve(3) && !A.isPve(4) && A.isPve(9) && A.isPve(15) && !A.isPve(10), '수호자 라운드: 1~3, 9, 15 …');
  ok(a.pve && a.enemy.pve && a.enemy.units.length === 1 && a.enemy.units.every(u => u.mult < 1), '1라운드 상대는 약한 수호자 하나');
  ok(A.income(0, 0) === 5 && A.income(10, 0) === 6 && A.income(50, 0) === 10 && A.income(90, 0) === 10, '수입 5 + 이자 최대 5');
  ok(A.streakGold(1) === 0 && A.streakGold(-2) === 1 && A.streakGold(4) === 2 && A.streakGold(-7) === 3, '연승·연패 금');
  ok(total(a) === fresh(a), '처음 더미는 값마다 정한 장수');
  ok([1, 2, 3, 4, 5, 6, 7, 8, 9].every(l => A.odds(l).reduce((x, y) => x + y, 0) === 100) && A.odds(1)[0] === 100 && A.odds(9)[4] > A.odds(6)[4], '레벨별 상점 확률');
  for (let r = 5; r < 30; r++) ok(A.stageDamage(r) >= A.stageDamage(r - 1), '라운드 피해는 줄지 않는다 ' + r);
}

/* 레벨·경험치 — 라운드마다 2, 4금에 4. 판 위 수는 레벨까지 */
{
  const st = A.newGame(data, 5);
  st.gold = 40;
  ok(A.buyXp(st, data).ok && st.level === 3 && st.xp === 0 && st.gold === 36, '4금에 경험치 4 — 1레벨(2)·2레벨(2)을 넘어 3레벨');
  ok(A.buyXp(st, data).ok && st.level === 3 && st.xp === 4 && A.xpNeed(3) === 6, '3레벨은 6이 든다 — 4 모았다');
  st.gold = 3; ok(A.buyXp(st, data).why === 'gold', '금이 모자라면 못 산다');
  st.level = 9; st.gold = 40; ok(A.buyXp(st, data).why === 'maxlevel', '9레벨이 끝');
  const g = A.newGame(data, 6);
  A.fight(g, data); A.next(g, data);
  ok(g.level === 2 && g.xp === 0, '다음 라운드에 경험치 2 — 2레벨');
}

/* 판의 신화권 — MYTHS_PER_GAME 권만 상점과 상대에, 첫 라운드 빈손일 때만 바꾼다 */
{
  const all = Object.keys(data.synergy.myth), a = A.newGame(data, 42);
  ok(A.MYTHS_PER_GAME === 3 && a.myths.length === 3 && a.myths.every(k => all.includes(k)) && new Set(a.myths).size === 3, '셋을 뽑는다: ' + a.myths.join(','));
  const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(A.newGame(data, s).myths.join());
  ok(seen.size >= 10, '판마다 권이 달라진다 (' + seen.size + '가지)');
  ok(Object.keys(a.pool).every(k => a.myths.includes(by(k).myth)) && Object.keys(a.pool).length === 45, '더미는 그 셋의 마흔다섯 자루');
  ok(a.bots.every(b => a.myths.includes(b.fav)), '맞수가 즐겨 모으는 권도 그 셋 중');
  const g = A.newGame(data, 7);
  for (let r = 0; r < 30; r++) { g.gold = 99; A.reroll(g, data); ok(g.shop.every(n => !n || g.myths.includes(by(n).myth)), '상점은 판의 신화권만'); }
  const e = toRound(A.newGame(data, 9), 12);
  ok(A.players(e).every(p => A.units(p).every(u => e.myths.includes(by(u.unit.name).myth))), '맞수의 무기도 판의 신화권만');
  const pick = all.filter(k => !a.myths.includes(k)).slice(0, 3);
  const f = A.newGame(data, 42, { myths: pick });
  ok(f.myths.slice().sort().join() === pick.slice().sort().join(), '고른 권으로 시작한다');
  ok(A.newGame(data, 42, { myths: ['norse'] }).myths.length === 3, '틀린 고르기는 무시하고 뽑는다');
  const pre = A.newGame(data, 5); pre.myths = ['norse', 'east'];
  ok(A.liveMyths(pre, data).slice().sort().join() === 'china,japan,korea,norse' && A.inPlay(pre, data).length === 60, '옛 판의 동아시아는 셋으로 받는다');
  const ch = A.newGame(data, 5), gold = ch.gold, other = all.filter(k => !ch.myths.includes(k)).slice(0, 3);
  ok(A.setMyths(ch, data, other).ok && ch.myths.slice().sort().join() === other.slice().sort().join() && ch.gold === gold, '빈손 첫 라운드엔 바꾼다(금은 그대로)');
  ok(ch.shop.every(n => other.includes(by(n).myth)) && Object.keys(ch.pool).every(k => other.includes(by(k).myth)) && total(ch) === fresh(ch), '바꾸면 상점·더미도 새로');
  ok(A.setMyths(ch, data, ['norse', 'norse', 'norse']).why === 'myths', '같은 권을 겹칠 수 없다');
  A.buy(ch, data, 0);
  ok(A.setMyths(ch, data, a.myths).why === 'late', '하나라도 사면 못 바꾼다');
}

/* 사고 팔고 옮기고 합치기 — 더미가 따라간다 */
{
  const st = A.newGame(data, 1);
  const name = st.shop[0], cost = by(name).cost, left = st.pool[name];
  const r = A.buy(st, data, 0);
  ok(r.ok && st.gold === 8 - cost && st.shop[0] === null && st.bench[0] && st.bench[0].name === name && st.pool[name] === left, '사면 금이 줄고 벤치에 온다(상점에 뜰 때 이미 더미에서 빠졌다)');
  ok(!A.buy(st, data, 0).ok, '빈 칸은 못 산다');
  st.gold = 0;
  ok(A.buy(st, data, 1).why === 'gold', '금이 모자라면 못 산다');
  st.gold = 50; st.level = 3;
  const id = st.bench[0].id;
  ok(A.move(st, id, 'board', 1).ok && st.board[1].id === id && !st.bench[0], '판으로 옮긴다');
  ok(A.move(st, id, 'board', 9).ok && st.board[9].id === id && !st.board[1], '판 안에서 옮긴다(뒷줄)');
  for (let i = 1; i < 5; i++) A.buy(st, data, i);
  const ids = st.bench.filter(Boolean).map(u => u.id);
  ok(A.move(st, ids[0], 'board', 0).ok && A.move(st, ids[1], 'board', 2).ok, '레벨 3 — 셋까지 올린다');
  ok(A.move(st, ids[2], 'board', 3).why === 'cap', '넷째는 레벨에 걸린다');
  ok(A.move(st, ids[2], 'board', 0).ok && st.board[0].id === ids[2] && st.bench.some(u => u && u.id === ids[0]), '찬 자리로 옮기면 맞바꾼다 — 수는 안 는다');
  const sold = st.board[0], g = st.gold, back = st.pool[sold.name];
  ok(A.sell(st, data, sold.id).ok && st.gold === g + by(sold.name).cost && !st.board[0] && st.pool[sold.name] === back + 1, '팔면 값만큼 돌아오고 더미에 한 장');
  ok(A.value(by('묠니르'), 1) === 5 && A.value(by('묠니르'), 2) === 15 && A.value(by('묠니르'), 3) === 45, '별 값은 1·3·9배');
  const before = st.shop.slice(); st.gold = 2;
  ok(A.reroll(st, data).ok && st.gold === 0 && JSON.stringify(st.shop) !== JSON.stringify(before), '2금으로 다시 돌린다');
  ok(A.reroll(st, data).why === 'gold', '금이 없으면 못 돌린다');
  ok(total(st) === fresh(st), '사고 팔고 돌려도 무기 장수는 그대로');
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
  st.shop[0] = '칸다'; put('bench', 2, '칸다', 1); put('bench', 3, '칸다', 1);
  const r2 = A.buy(st, data, 0);
  ok(r2.merged.length === 2 && st.board[1].star === 3 && A.units(st).length === 2 && st.bench.filter(Boolean)[0].star === 2, '2성 셋 → 3성, 1성 셋 → 2성이 한 번에 이어진다');
  st.shop[0] = '칸다'; put('bench', 0, '칸다', 3); put('bench', 1, '칸다', 3);
  ok(A.buy(st, data, 0).merged.length === 0 && A.units(st).length === 5, '3성은 더 안 합친다');
}
/* 벤치가 찼어도 같은 1성이 둘이면 산 것이 바로 합쳐진다 */
{
  const st = A.newGame(data, 4);
  st.gold = 99;
  const put = (zone, i, name, star) => { const u = { id: st.nextId++, name, star }; (zone === 'board' ? st.board : st.bench)[i] = u; return u; };
  const nine = data.cards.map(c => c.name).filter(x => x !== '칸다').slice(0, A.BENCH);
  for (let i = 0; i < A.BENCH; i++) put('bench', i, nine[i], 1);
  const keep = put('board', 1, '칸다', 1);
  put('bench', 0, '칸다', 1);
  st.shop[0] = '칸다';
  const r = A.buy(st, data, 0);
  ok(r.ok && r.merged[0].star === 2 && st.board[1].id === keep.id && st.board[1].star === 2 && !st.bench[0] && st.shop[0] === null && st.gold === 98, '벤치가 차 있어도 셋째를 사면 판 위 것이 2성이 되고 벤치 것이 사라진다');
  put('bench', 0, nine[0], 1);
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
  /* 이집트 둘 — 영생: 박자마다 최대 체력의 일부를 되찾는다. 저주 중엔 없다 */
  const regen1 = data.synergy.myth.egypt.value[0];
  const eg = A.simulate(data, st, [U('갈고리와 도리깨', 1, 0, 1), U('앙크', 1, 1, 1)], [U('묠니르', 3, 0, 1)]);
  const rg = eg.log.filter(e => e.k === 'regen' && e.b === 1);
  ok(rg.length > 0 && rg.every(e => e.d <= Math.round(by('갈고리와 도리깨').hp * regen1)), '이집트 둘: 박자마다 ' + regen1 * 100 + '% 회복');
  const egc = eg.log.find(e => e.k === 'curse' && e.b === 1);
  ok(!egc || !eg.log.some(e => e.k === 'regen' && e.b === 1 && e.t > egc.t), '저주 중엔 영생이 없다');
  ok(!A.simulate(data, st, [U('갈고리와 도리깨', 1, 0, 1), U('가다', 1, 1, 1)], [U('묠니르', 3, 0, 1)]).log.some(e => e.k === 'regen'), '이집트 하나면 영생이 없다');
  /* 서아시아 둘 — 눈에는 눈: 맞은 피해의 일부를 때린 쪽에 되돌린다 */
  const th = data.synergy.myth.westasia.value[0];
  const wa = A.simulate(data, st, [U('바알의 쌍곤봉', 1, 0, 1), U('로스탐의 활', 1, 1, 1)], [U('묠니르', 3, 0, 1)]);
  const hit1 = wa.log.find(e => e.k === 'hit' && e.b === 1), back = wa.log.find(e => e.k === 'thorns' && e.t === hit1.t && e.a === 1);
  ok(back && back.d === Math.round((hit1.d - hit1.s) * th) && !wa.log.some(e => e.k === 'thorns' && e.b === 1), '서아시아 둘: 맞은 평타의 ' + th * 100 + '% 를 되돌리고, 되돌림은 다시 안 돌아온다');
  ok(!A.simulate(data, st, [U('바알의 쌍곤봉', 1, 0, 1), U('가다', 1, 1, 1)], [U('묠니르', 3, 0, 1)]).log.some(e => e.k === 'thorns'), '서아시아 하나면 눈에는 눈이 없다');
  /* 아메리카 둘 — 비취의 숨: 평타·기술로 준 피해의 일부만큼 되찾는다. 저주 중엔 없다 */
  const lf = data.synergy.myth.america.value[0];
  const am = A.simulate(data, st, [U('차크의 번개 도끼', 1, 0, 1), U('일라파의 투석구', 1, 1, 1)], [U('아이기스', 3, 0, 1)]);
  const lk = am.log.filter(e => e.k === 'leech' && e.b === 1);
  ok(lk.length > 0 && lk.every(e => { const h = am.log.filter(x => x.a === 1 && x.t === e.t && ['hit', 'crit', 'splash', 'skillhit'].includes(x.k)).reduce((n, x) => n + x.d - x.s, 0); return e.d <= Math.round(h * lf); }), '아메리카 둘: 준 피해의 ' + lf * 100 + '% 까지 되찾는다');
  const amc = am.log.find(e => e.k === 'curse' && e.b === 1);
  ok(!amc || !am.log.some(e => e.k === 'leech' && e.b === 1 && e.t > amc.t), '저주 중엔 비취의 숨이 없다');
  ok(!A.simulate(data, st, [U('차크의 번개 도끼', 1, 0, 1), U('가다', 1, 1, 1)], [U('아이기스', 3, 0, 1)]).log.some(e => e.k === 'leech'), '아메리카 하나면 비취의 숨이 없다');
  /* 기사 전설 둘 — 롱스보의 맹세: 아군이 쓰러질 때마다 남은 기사가 공격을 얻는다 */
  const knt = A.simulate(data, st, [U('마탄', 1, 0, 0), U('뒤랑달', 3, 1, 1), U('가다', 1, 0, 2)], [U('묠니르', 3, 0, 1), U('바즈라', 3, 0, 2)]);
  const deaths = knt.log.filter(e => e.k === 'die' && [1, 3].includes(e.b));
  ok(deaths.length > 0 && deaths.every(d => knt.log.some(e => e.k === 'avenge' && e.b === 2 && e.t === d.t)) && !knt.log.some(e => e.k === 'avenge' && e.b === 3), '기사 둘: 아군이 쓰러지면 남은 기사만 맹세를 얻는다');
  ok(!A.simulate(data, st, [U('뒤랑달', 3, 1, 1), U('가다', 1, 0, 1)], [U('묠니르', 3, 0, 1)]).log.some(e => e.k === 'avenge'), '기사 하나면 맹세가 없다');
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

/* 판 — 세 줄. 근접은 가장 앞줄만, 중거리는 바로 뒤까지 */
{
  const st = A.newGame(data, 5);
  const r = A.simulate(data, st, [U('그람', 2, 0, 1)], [U('아이기스', 1, 1, 1), U('탈라리아', 1, 2, 1)]);
  const firstBack = r.log.find(e => e.k === 'hit' && e.b === 3), midDeath = r.log.find(e => e.k === 'die' && e.b === 2);
  ok(r.log.find(e => e.k === 'hit' && e.a === 1).b === 2 && (!firstBack || (midDeath && firstBack.t >= midDeath.t)), '앞줄이 비면 가운데가 가장 앞줄 — 뒷줄은 그다음');
  const r2 = A.simulate(data, st, [U('궁니르', 1, 0, 1)], [U('아이기스', 1, 0, 1), U('탈라리아', 1, 2, 1)]);
  const sp = r2.log.find(e => e.k === 'splash');
  ok(sp && sp.b === 3, '창은 같은 칸 뒤로 가장 가까운 것(가운데가 비면 뒷줄)에 닿는다');
  const pve = A.makePve(Object.assign(A.newGame(data, 8), { round: 15 }), data);
  ok(pve.units.length >= 5 && pve.units.every(u => u.row < A.ROWS && u.col < A.COLS) && new Set(pve.units.map(u => u.row * A.COLS + u.col)).size === pve.units.length, '15라운드 수호자 판은 판 안에 겹치지 않게');
}

/* 짝 짓기와 라운드 — 모두가 한 번씩, 홀수면 유령. 진 쪽은 라운드 기본 + 남은 상대 수 */
{
  const st = toRound(A.newGame(data, 11), 4);
  ok(!st.pve && st.matches.length === 3 && new Set(st.matches.flatMap(m => [m.a, m.b])).size === 6 && st.matches.every(m => !m.ghost), '여섯이면 세 짝');
  ok(st.matches.some(m => m.a === 0) && st.enemy && st.enemy.who > 0 && !st.enemy.pve, '나는 늘 짝의 앞쪽, 상대 판이 보인다');
  const opp = A.playerOf(st, st.enemy.who), hp0 = A.players(st).map(p => p.hp);
  st.board = st.board.map(() => null);   /* 빈 판으로 싸우면 진다 */
  A.fight(st, data);
  ok(st.result.winner === 'them' && st.result.lost === A.stageDamage(4) + st.result.left.them && st.hp === hp0[0] - st.result.lost, '지면 라운드 기본 + 남은 상대 수');
  ok(st.streak === -1 && opp.streak >= 1 && st.result.others.length === 2, '연패·연승이 붙고, 다른 두 짝의 결과도 남는다');
  ok(!A.buy(st, data, 0).ok && !A.fight(st, data).ok, '결과 화면에서는 사거나 싸울 수 없다');
  ok(A.next(st, data).ok && st.round === 5 && st.phase === 'plan' && st.shop.every(Boolean), '다음 라운드 — 상점이 새로');
  /* 다섯이면 하나는 유령과 — 유령 주인은 안 깎인다 */
  const g = toRound(A.newGame(data, 12), 4);
  const out = g.bots[4]; out.hp = 0; out.alive = false; out.place = 6;
  g.matches = []; A.next(Object.assign(g, { phase: 'result' }), data);
  ok(g.matches.length === 3 && g.matches.filter(m => m.ghost).length === 1 && !g.matches.some(m => m.a === 5 || m.b === 5), '다섯이면 두 짝 + 유령 하나');
  const gh = g.matches.find(m => m.ghost), owner = A.playerOf(g, gh.b), ohp = owner.hp;
  const ownerOther = g.matches.some(m => !m.ghost && (m.a === gh.b || m.b === gh.b));
  A.fight(g, data);
  ok(ownerOther || owner.hp === ohp, '유령 주인은 유령 싸움으로 안 깎인다');
}

/* 수호자 라운드 — 이기면 금, 지면 조금 */
{
  const st = A.newGame(data, 21);
  st.board[1] = { id: 99, name: '묠니르', star: 3 };
  const g = st.gold;
  A.fight(st, data);
  ok(st.result.pve && st.result.winner === 'me' && st.gold === g + A.pveReward(1) && st.streak === 0, '수호자를 이기면 금, 연승은 안 센다');
  const lose = A.newGame(data, 22); A.fight(lose, data);
  ok(lose.result.winner === 'them' && lose.result.lost === 1 + lose.result.left.them, '수호자에게 지면 1 + 남은 수');
}

/* 탈락과 순위 — 체력이 다하면 떨어지고 무기는 더미로. 마지막 하나가 1등 */
{
  const st = toRound(A.newGame(data, 31), 4);
  const m = st.matches.find(x => x.a !== 0), loser = A.playerOf(st, m.a), rival = A.playerOf(st, m.b);
  loser.hp = 1; loser.board = loser.board.map(() => null); loser.bench = loser.bench.map(() => null);
  rival.board[1] = rival.board[1] || { id: 999, name: rival.shop.find(Boolean) || '칸다', star: 1 };
  loser.bench[0] = { id: 997, name: Object.keys(st.pool)[0], star: 2 };
  const before = total(st);
  A.fight(st, data);
  ok(!loser.alive && loser.place === 6 && loser.hp === 0 && A.units(loser).length === 0, '먼저 떨어지면 6등, 판이 빈다');
  ok(total(st) === before, '떨어진 이의 무기(2성이면 셋)는 더미로 돌아간다');
  const alive = A.alivePlayers(st).length;
  ok(st.result.alive === alive && alive === 5, '살아남은 수');
  /* 1등 — 나와 하나만 남기고 이긴다 */
  const w = toRound(A.newGame(data, 32), 4);
  w.bots.slice(1).forEach((b, i) => { b.alive = false; b.hp = 0; b.place = 3 + i; });
  const last = w.bots[0]; last.hp = 1; last.board = last.board.map(() => null);
  w.matches = [{ a: 0, b: 1, ghost: false }]; w.enemy = { who: 1, units: [] };
  w.board = w.board.map(() => null); w.board[1] = { id: 998, name: '묠니르', star: 3 };
  A.fight(w, data);
  ok(w.phase === 'won' && w.place === 1 && last.place === 2, '마지막까지 남으면 1등');
  /* 내가 떨어지면 끝 — 순위는 남은 수 + 1 */
  const l = toRound(A.newGame(data, 33), 4);
  l.hp = 1; l.board = l.board.map(() => null);
  A.fight(l, data);
  ok(l.phase === 'lost' && l.place === A.alivePlayers(l).length + 1 && !A.next(l, data).ok, '내가 떨어지면 끝, 순위는 남은 수 + 1');
}

/* 맡긴 손 — 여섯이 끝까지 두고, 상태가 늘 JSON 으로 남는다 */
{
  const st = A.newGame(data, 77);
  let rounds = 0;
  while (st.phase === 'plan' && rounds++ < A.MAX_ROUNDS + 2) {
    A.autoPlan(st, data);
    ok(A.players(st).every(p => !p.alive || (A.onBoard(p) <= p.level && p.gold >= 0 && p.level <= A.MAX_LEVEL)), '모두 규칙 안에서(판 위 수 ≤ 레벨, 금 ≥ 0)');
    const copy = JSON.parse(JSON.stringify(st));
    A.fight(st, data); A.fight(copy, data);
    ok(JSON.stringify(st.result.log) === JSON.stringify(copy.result.log) && JSON.stringify(st.bots) === JSON.stringify(copy.bots), '같은 상태는 같은 라운드 (저장했다 이어도 같다)');
    ok(total(st) === fresh(st), '무기 장수가 늘 같다');
    /* 다시 보기 — 기록을 끝까지 접으면 싸움이 끝난 판과 같다 */
    const res = st.result, fin = A.replayAt(res, Infinity);
    ok(res.ents.every(e => fin[e.id].hp === Math.max(0, e.hp) && fin[e.id].alive === e.alive && fin[e.id].cursed === e.cursed), '다시 보기를 끝까지 접으면 결과와 같다');
    ok(Object.values(A.replayAt(res, 0)).every(e => e.hp === e.maxHp && e.alive), '다시 보기 처음엔 모두 온전하다');
    if (st.phase === 'result') A.next(st, data);
  }
  ok(['won', 'lost'].includes(st.phase) && st.place >= 1 && st.place <= 6 && st.history.length === st.round, '끝까지 간다 — ' + st.round + '라운드 ' + st.place + '등');
  const places = A.players(st).filter(p => p.place).map(p => p.place);
  ok(new Set(places).size === places.length, '순위가 겹치지 않는다');
}

console.log('PASS 오토 배틀 규칙 ' + n + '가지');
if (quick) process.exit(0);

/* ── 보고: 맡긴 손(나) 한 명과 맞수 다섯 ── */
const N = 300;
const place = Array(7).fill(0), endR = [], lvAt = { 10: [], 20: [] }, syn = {}, synWin = {}, style = {};
for (let s = 1; s <= N; s++) {
  const st = A.newGame(data, s);
  while (st.phase === 'plan') {
    A.autoPlan(st, data);
    if (lvAt[st.round]) lvAt[st.round].push(st.level);
    const on = A.synergies(data, A.boardUnits(st));
    A.fight(st, data);
    const win = st.result.winner === 'me';
    for (const axis of ['myth', 'kind']) for (const k in on[axis]) if (on[axis][k].tier) {
      const key = axis + '.' + k + '×' + on[axis][k].tier;
      syn[key] = (syn[key] || 0) + 1; synWin[key] = (synWin[key] || 0) + (win ? 1 : 0);
    }
    if (st.phase === 'result') A.next(st, data);
  }
  place[st.place]++; endR.push(st.round);
  for (const b of st.bots) if (b.place) (style[b.bot] = style[b.bot] || []).push(b.place);
}
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
console.log('\n맡긴 손 ' + N + '판 (여섯 중 하나) — 평균 ' + (place.reduce((a, c, i) => a + c * i, 0) / N).toFixed(2) + '등');
console.log('순위  ' + place.slice(1).map((c, i) => (i + 1) + '등 ' + (c / N * 100).toFixed(0) + '%').join(' · '));
console.log('끝난 라운드 가운데 ' + med(endR) + ' (' + Math.min(...endR) + '~' + Math.max(...endR) + ')');
console.log('레벨 가운데 — 10라운드 ' + med(lvAt[10]) + ' · 20라운드 ' + med(lvAt[20]));
console.log('나보다 먼저 떨어진 맞수의 평균 순위 — ' + Object.entries(style).map(([k, v]) => k + ' ' + (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)).join(' · '));
console.log('\n시너지가 켜진 라운드의 승률 (켜진 라운드 수)');
for (const k of Object.keys(syn).sort()) console.log('  ' + k.padEnd(16) + (synWin[k] / syn[k] * 100).toFixed(0).padStart(4) + '%  (' + syn[k] + ')');
