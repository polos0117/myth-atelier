/* 신기 결투 규칙이 코드에 옮겨졌나. 화면 없이 lib/duel.js 만 돌린다.
   --quick 은 규칙만 본다. 빼고 돌리면 AI 끼리 300판을 굴려 선공 승률·권별 승률을 찍는다 — 문턱 밖이면 실패(과제 6).
   Run: node tests/duel-sim.cjs --quick */
const fs = require('node:fs'), assert = require('node:assert/strict');
const A = require('../lib/duel.js');
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, img: d('img').img, duel: d('duel') };
const quick = process.argv.includes('--quick');
let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; };
const D = A.derive(data);

/* 손으로 짠 판 — 멀리건을 건너뛰고 phase 'play', 내 차례. 손패와 덱을 바꿔 끼운다 */
function fixture(meHand, foeHand, opt) {
  opt = opt || {};
  const p = A.newProfile(data, opt.main || 'norse', 1);
  const st = A.newMatch(data, p, opt.boss || 'greek', opt.level || 'veteran', opt.seed || 11);
  A.confirm(data, st);
  st.me.hand = meHand.slice(); st.foe.hand = foeHand.slice(); st.turn = st.first = opt.turn || 'me';
  st.me.deck = opt.meDeck || []; st.foe.deck = opt.foeDeck || [];
  st.coin = null;   /* 손으로 짠 판에는 선공 보너스를 두지 않는다 — 합을 그대로 센다 */
  return st;
}
const byAb = (ab, f) => D.list.find(id => { const c = D.cards[id]; return c.variant === 'base' && c.ability === ab && !c.hero && (!f || f(c)); });
const unitsOf = s => A.ROWS.flatMap(r => s.rows[r]);
const put = (st, who, id) => { const u = A.makeUnit(data, st, id); st[who].rows[D.cards[id].row].push(u); return u; };
const heroIn = row => D.list.find(id => D.cards[id].hero && D.cards[id].variant === 'base' && D.cards[id].row === row);
const heroSafe = D.list.find(id => D.cards[id].hero && D.cards[id].variant === 'base' && ['mend', 'rally', 'shield'].includes(D.cards[id].ability)); /* 상대에게 아무것도 안 하는 영웅 */

/* 파생 — 모든 카드에 줄·힘·능력, 변형판은 그림이 있는 것만, 영웅 33 */
{
  const all = D.list.map(id => D.cards[id]);
  const hasCut = (name, k) => {
    const e = data.img[name]; if (!e || !e.byStyle) return false;
    return Object.values(e.byStyle).some(b => k === 'weather'
      ? !!(b.casual && (Array.isArray(b.casual) ? b.casual.length : b.casual.f && b.casual.f.length))
      : !!(b[k] && b[k].f));
  };
  ok(all.filter(c => c.variant === 'base').length === data.cards.length, '기본판은 카드 수와 같다');
  for (const v of ['awaken', 'cursed', 'weather'])
    ok(all.filter(c => c.variant === v).length === data.cards.filter(c => hasCut(c.name, v)).length, v + ' 판은 그림이 있는 카드 수와 같다');
  for (const c of all) {
    ok(A.ROWS.includes(c.row) && (typeof c.file === 'string' || c.file === null), c.id + ' 줄·그림');
    if (c.variant === 'base') ok(c.power >= 4 && c.power <= 13, c.id + ' 기본판 힘 4~13');
    if (c.variant === 'weather') ok(c.power === 0 && c.ability === null && !c.hero, c.id + ' 날씨판은 힘 0 · 능력 없음 · 영웅 아님');
    else ok(c.power >= 4 && c.power <= 18 && A.ABILITIES.includes(c.ability) && c.n >= 1 && c.n <= 3, c.id + ' 힘 4~18 · 능력 · 수치 1~3');
  }
  ok(all.filter(c => c.hero && c.variant === 'base').length === 33, '영웅 33장');
  const m = D.cards['묠니르'];
  ok(m.power === 12 && m.row === 'melee' && m.hero && m.ability === 'sweep', '묠니르 — 힘 12 · 근접 · 영웅 · 휩쓸기');
  ok(D.cards['묠니르@awaken'].power === 15 && D.cards['묠니르@cursed'].power === 17 && D.cards['묠니르@weather'].power === 0, '각성 +3 · 저주 +5 · 날씨 0');
  for (const e of new Set(Object.values(data.skills).map(s => s.effect))) ok(A.ABILITY[e], 'effect ' + e + ' 가 능력에 대응된다');
  ok(data.duel.bosses.length === 11 && data.duel.bosses.every(b => D.cards[b.portrait] && data.duel.factions[b.myth]
    && data.cards.some(c => c.wielder === b.wielder && c.myth === b.myth)), '주인 열하나 — 초상·진영 능력·주인 이름');
}

/* 프로필 — 시작 덱 25(주 권 17 + 다른 권 8), 같은 시드 같은 덱, 옛 저장 올리기 */
{
  const p = A.newProfile(data, 'norse', 7), q = A.newProfile(data, 'norse', 7);
  ok(p.owned.length === 25 && p.deck.length === 25 && JSON.stringify(p.deck) === JSON.stringify(q.deck), '시작 덱 25 · 같은 시드 같은 덱');
  ok(p.owned.filter(id => D.cards[id].myth === 'norse' && D.cards[id].variant === 'base').length === 17, '주 권 기본판 17');
  ok(p.owned.filter(id => D.cards[id].variant === 'weather').length === 1 && D.cards[p.owned.find(id => D.cards[id].variant === 'weather')].myth === 'norse', '주 권 날씨판 1장 — 첫 판부터 날씨를 써 본다');
  ok(p.owned.filter(id => D.cards[id].myth !== 'norse').length === 7 && p.owned.filter(id => D.cards[id].myth !== 'norse').every(id => D.cards[id].variant === 'base' && !D.cards[id].hero), '다른 권 비영웅 기본판 7');
  ok(p.stats.games === 0 && p.level === 'rookie' && p.v === A.VERSION, '빈 통계 · 신참 · 판');
  const old = A.upgradeProfile({ main: 'greek', owned: p.owned.slice(), deck: p.deck.slice() });
  ok(old.stats && old.stats.cards && old.beaten && old.level === 'rookie', '옛 저장(stats 없음)도 올린다');
  ok(A.collectionMax(data) === D.list.length, '컬렉션 상한은 파생 카드 수');
}
/* 덱 규칙 다섯 — 25장 · 주 권 15 · 영웅 4 · 날씨 3 · 같은 id 1 — 과 안 가진 카드 */
{
  const p = A.newProfile(data, 'norse', 7);
  ok(A.validateDeck(data, p).ok, '시작 덱은 규칙에 맞다');
  const by = (f) => D.list.filter(id => f(D.cards[id]));
  p.owned = D.list.slice(); /* 전부 가진 셈 */
  p.deck = by(c => c.myth === 'norse' && c.variant === 'base').slice(0, 14).concat(by(c => c.myth === 'greek' && c.variant === 'base').slice(0, 11));
  let v = A.validateDeck(data, p);
  ok(!v.ok && v.problems.includes('main') && v.n === 25 && v.main === 14, '주 권 14 는 모자라다');
  p.deck = p.deck.slice(0, 24); v = A.validateDeck(data, p);
  ok(v.problems.includes('count') && v.problems.includes('main'), '24장 — 문제를 전부 모은다');
  const heroes = by(c => c.hero && c.myth === 'norse'), weathers = by(c => c.variant === 'weather' && c.myth === 'norse');
  p.deck = heroes.slice(0, 5).concat(by(c => c.myth === 'norse' && !c.hero && c.variant === 'base').slice(0, 20));
  ok(A.validateDeck(data, p).problems.includes('hero') && A.validateDeck(data, p).hero === 5, '영웅 5 는 많다(변형판도 영웅)');
  p.deck = weathers.slice(0, 4).concat(by(c => c.myth === 'norse' && c.variant === 'base'), by(c => c.myth === 'greek' && c.variant === 'base' && !c.hero).slice(0, 4)); /* 4 + 17 + 4 */
  v = A.validateDeck(data, p); ok(v.problems.includes('weather') && v.weather === 4 && v.main === 21 && v.n === 25, '날씨판 4 는 많다 · 날씨판도 주 권으로 센다');
  p.deck = by(c => c.myth === 'norse' && c.variant === 'base').slice(0, 24).concat(['묠니르']);
  ok(A.validateDeck(data, p).problems.includes('dup'), '같은 id 둘');
  p.owned = p.owned.filter(id => id !== '묠니르');
  ok(A.validateDeck(data, p).problems.includes('owned'), '안 가진 카드');
  ok(!A.toggleDeck(data, { main: 'norse', owned: [], deck: [] }, '묠니르').ok, '안 가진 카드는 못 넣는다');
  const q = A.newProfile(data, 'norse', 7), first = q.deck[0];
  ok(A.toggleDeck(data, q, first).ok && q.deck.length === 24 && A.toggleDeck(data, q, first).ok && q.deck.length === 25, '누르면 빼고 다시 누르면 넣는다');
  ok(A.setMain(q, 'greek').main === 'greek' && A.validateDeck(data, q).problems.includes('main'), '주 권을 바꾸면 15장 규칙을 다시 본다');
}
/* 주인 덱 — 난이도별 구성 */
{
  const rng = { rngState: 3 }, vOf = ids => ids.reduce((m, id) => (m[D.cards[id].variant] = (m[D.cards[id].variant] || 0) + 1, m), {});
  for (const b of data.duel.bosses) {
    const r = A.bossDeck(data, rng, b.myth, 'rookie'), v = A.bossDeck(data, rng, b.myth, 'veteran'), a = A.bossDeck(data, rng, b.myth, 'ace');
    ok(r.length === 25 && new Set(r).size === 25 && r.filter(id => D.cards[id].myth === b.myth).length === 17 && r.filter(id => D.cards[id].myth === b.ally).length === 8, b.wielder + ' 신참 — 자기 권 17 · 이웃 8');
    ok(vOf(r).base === 25, b.wielder + ' 신참은 기본판만');
    const ally = v.filter(id => D.cards[id].myth === b.ally).map(id => D.cards[id].power), top = D.list.filter(id => D.cards[id].myth === b.ally && D.cards[id].variant === 'base').map(id => D.cards[id].power).sort((x, y) => y - x).slice(0, 8);
    ok(JSON.stringify(ally.sort((x, y) => y - x)) === JSON.stringify(top) && vOf(v).awaken === 3 && v.length === 25, b.wielder + ' 숙련 — 이웃은 힘 순 8 · 각성판 3');
    const pics = D.list.filter(id => D.cards[id].myth === b.myth && D.cards[id].variant === 'weather').length; /* 그림 있는 카드 수 — 아메리카는 여섯뿐이라 날씨판은 있는 만큼 */
    ok(vOf(a).awaken === 3 && vOf(a).cursed === 2 && vOf(a).weather === Math.min(2, pics - 5) && a.length === 25 && new Set(a).size === 25, b.wielder + ' 에이스 — 각성 3 · 저주 2 · 날씨 2(모자라면 있는 만큼)');
    ok(a.every(id => D.cards[id].variant === 'base' || D.cards[id].myth === b.myth), b.wielder + ' 변형판은 자기 권만');
  }
  ok(A.bossOf(data, 'norse').wielder === '토르', 'bossOf');
}

/* 판 진행 — 같은 시드 같은 판, 멀리건 2장, 선공, 패스 뒤엔 못 낸다, 둘 다 패스면 라운드 끝, 동점은 둘 다 잃는다 */
{
  const p = A.newProfile(data, 'norse', 1);
  const a = A.newMatch(data, p, 'greek', 'veteran', 5), b = A.newMatch(data, p, 'greek', 'veteran', 5);
  ok(JSON.stringify(a) === JSON.stringify(b) && a.phase === 'mulligan' && a.me.hand.length === 10 && a.me.deck.length === 15 && a.foe.hand.length === 10, '같은 시드 같은 판 · 손 10 덱 15');
  ok(a.foe.faction.myth === 'greek' && a.me.faction.myth === 'norse' && a.lives.me === 2 && a.lives.foe === 2, '진영 · 목숨 둘');
  const top = a.me.deck[0], old = a.me.hand[0];
  ok(A.mulligan(a, 0).ok && a.me.hand[0] === top && a.me.deck[a.me.deck.length - 1] === old, '멀리건은 덱 맨 위와 바꾸고 옛 카드는 맨 아래로');
  ok(A.mulligan(a, 1).ok && A.mulligan(a, 2).why === 'mulligan' && a.mulligans === 2, '2장까지');
  ok(!A.play(data, a, a.me.hand[0]).ok, '멀리건 중에는 못 낸다');
  A.confirm(data, a);
  ok(a.phase === 'play' && ['me', 'foe'].includes(a.first) && a.turn === a.first && !A.mulligan(a, 0).ok, '선공은 동전 · 시작하면 멀리건 끝');
  const firsts = new Set(); for (let s = 1; s <= 30; s++) { const m = A.newMatch(data, p, 'greek', 'veteran', s); A.confirm(data, m); firsts.add(m.first); }
  ok(firsts.size === 2, '선공은 양쪽 다 나온다');

  /* 손으로: 내가 내면 상대 차례, 패스하면 못 내고, 둘 다 패스하면 라운드가 끝난다 */
  const s1 = byAb('strike'), s2 = byAb('strike', c => c.name !== D.cards[s1].name);
  const st = fixture([s1, s2], [s1, s2]);
  ok(A.play(data, st, s1).ok && st.turn === 'foe' && st.me.hand.length === 1 && st.me.rows[D.cards[s1].row].length === 1, '내면 자기 줄에 서고 상대 차례');
  ok(A.play(data, st, '없는카드').why === 'hand', '손에 없는 카드');
  ok(A.pass(data, st).ok && st.passed.foe && st.turn === 'me', '상대가 패스하면 내 차례');
  ok(A.play(data, st, s2).ok && st.phase === 'play' && st.round === 2 && st.roundLog.length === 1, '상대가 패스한 뒤 내 마지막 카드를 내면 손이 비어 자동 패스 — 라운드 끝');
  ok(st.roundLog[0].winner === 'me' && st.lives.foe === 1 && st.lives.me === 2, '합이 큰 쪽이 따고 진 쪽이 목숨을 잃는다');
  ok(st.first === 'foe' && st.turn === 'foe' && unitsOf(st.me).length === 0 && st.me.grave.length === 2, '진 쪽이 선공 · 판은 묘지로');
  /* 손이 빈 쪽은 바로 패스 — 나는 손이 비었고 상대만 남았다 */
  ok(st.passed.me && !st.passed.foe, '손이 빈 쪽은 라운드 시작에 패스 상태');
  ok(A.play(data, st, s1).ok && A.play(data, st, s2).ok && st.roundLog.length === 3 && st.roundLog[1].winner === 'foe', '상대가 둘을 내고 손이 비면 라운드 2 끝 — 내가 잃는다. 셋째는 둘 다 빈손이라 바로 0:0');
  ok(st.phase === 'done' && st.winner === 'draw' && st.lives.me === 0 && st.lives.foe === 0 && st.roundLog[2].winner === 'draw', '동점은 둘 다 목숨을 잃는다 · 무승부');
  ok(!A.play(data, st, s1).ok && !A.pass(data, st).ok, '끝난 판에는 못 둔다');
  /* 패스 뒤에는 못 낸다 */
  const t = fixture([s1, s2], [s1, s2]);
  ok(A.pass(data, t).ok && t.turn === 'foe' && A.play(data, t, s1).ok && t.turn === 'foe', '내가 패스하면 상대는 계속 낸다');
  ok(A.legal(data, t, 'me').cards.length === 0 && !A.legal(data, t, 'me').pass, '패스한 쪽은 낼 수 없다');
}
/* 선공 보너스 — 1라운드에만 동전 쪽 합 +FIRST_BONUS */
{
  const st = fixture([], []); st.coin = 'me';
  ok(A.scores(data, st).me.total === A.FIRST_BONUS && A.scores(data, st).foe.total === 0, '1라운드 선공 +' + A.FIRST_BONUS);
  st.round = 2; ok(A.scores(data, st).me.total === 0, '2라운드부터는 없다');
}
/* 합산 — 날씨 줄은 양쪽 비영웅 1, 영웅 그대로, 또 내면 걷히고 힘이 돌아온다, 라운드 끝에 걷힌다 · 결속 */
{
  const hero = D.list.find(id => D.cards[id].hero && D.cards[id].row === 'melee' && D.cards[id].variant === 'base');
  const mel = byAb('mend', c => c.row === 'melee'), w = D.list.find(id => D.cards[id].variant === 'weather' && D.cards[id].row === 'melee');
  const st = fixture([w, w, byAb('strike')], [mel, hero, byAb('strike')]); /* 셋째 장은 손이 비어 자동 패스되지 않게 */
  st.passed.me = true; st.turn = 'foe'; A.play(data, st, mel); A.play(data, st, hero); /* 상대 근접 줄에 비영웅 하나 · 영웅 하나 */
  st.passed.me = false; st.turn = 'me';
  const before = A.scores(data, st).foe.rows.melee;
  ok(before > 1 + D.cards[hero].power, '날씨 전 합');
  ok(A.play(data, st, w).ok && st.weather.melee && st.me.grave.includes(w) && A.scores(data, st).foe.rows.melee === 1 + D.cards[hero].power, '서리 — 비영웅은 1, 영웅은 그대로, 날씨판은 묘지로');
  ok(st.foe.rows.melee[0].cur >= D.cards[mel].power, '카드의 힘 자체는 안 건드린다');
  st.turn = 'me';
  ok(A.play(data, st, w).ok && !st.weather.melee && A.scores(data, st).foe.rows.melee === before, '같은 줄 날씨판을 또 내면 걷히고 돌아온다');
  st.weather.melee = true; st.turn = 'me'; A.pass(data, st); A.pass(data, st); /* 둘 다 패스 — 상대 손에 한 장 남아 2라운드가 선다 */
  ok(!st.weather.melee && st.round === 2 && st.phase === 'play', '라운드가 끝나면 걷힌다');
  /* 결속 — 같은 주인 둘이 같은 줄이면 각각 기본 힘만큼 더 */
  const pair = (() => { const by = {}; for (const id of D.list) { const c = D.cards[id]; if (c.variant !== 'base' || c.hero) continue; (by[c.wielder + '/' + c.row] = by[c.wielder + '/' + c.row] || []).push(id); } return Object.values(by).find(l => l.length >= 2); })();
  ok(pair, '같은 주인·같은 줄 비영웅 둘이 있는 자료');
  const b = fixture(pair.slice(0, 2).concat([byAb('strike')]), []); b.passed.foe = true; /* 셋째 장은 손이 비어 라운드가 끝나지 않게 */
  A.play(data, b, pair[0]); ok(A.scores(data, b).me.total === unitsOf(b.me)[0].cur, '하나일 때는 결속 없음');
  A.play(data, b, pair[1]);
  const u = unitsOf(b.me);
  ok(A.scores(data, b).me.total === u[0].cur + u[0].base + u[1].cur + u[1].base, '결속 — 각각 기본 힘만큼 더한다');
  b.weather[D.cards[pair[0]].row] = true;
  ok(A.scores(data, b).me.total === 2, '날씨 줄에서는 결속도 무시 — 1 + 1');
}

/* 능력 아홉 — 하나씩 손으로 짠 판. 상대는 패스해 두어 내 차례가 이어진다 */
{
  /* 상대는 패스해 두어 내 차례가 이어진다. 손 끝에 안 내는 카드 한 장을 더 둬 손이 비어 라운드가 끝나지 않게 한다 */
  const solo = (meHand, main) => { const st = fixture(meHand.concat([byAb('strike')]), [byAb('strike'), byAb('strike')], { main }); st.passed.foe = true; return st; };
  const mend = byAb('mend', c => c.power >= 7), weak = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].power <= 5), strong = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].power >= 9);
  const cursedHero = D.list.find(id => D.cards[id].variant === 'cursed' && D.cards[id].hero);
  ok(weak && strong && mend && heroSafe && cursedHero && A.ABILITIES.every(ab => byAb(ab)), '능력마다 비영웅 기본판이 있고, 힘 5 이하·9 이상·강화 7 이상·무해한 영웅·영웅 저주판이 있다');
  /* 타격 — 가장 센 비영웅, 영웅은 면역, 바닥 1, fx */
  { const s = byAb('strike'), st = solo([s, s]); const a = put(st, 'foe', weak), b = put(st, 'foe', strong), h = put(st, 'foe', heroIn('melee'));
    h.cur = 99; A.play(data, st, s);
    ok(b.cur === D.cards[strong].power - D.cards[s].n && a.cur === D.cards[weak].power && h.cur === 99, '타격 n — 가장 센 비영웅만, 영웅은 그대로');
    ok(st.last.fx.some(f => f.kind === 'dmg' && f.side === 'foe' && f.at === b.at && f.n === D.cards[s].n) && st.foe.hurt === D.cards[s].n, 'fx 와 받은 피해 합');
    a.cur = 1; b.cur = 1; st.me.hand = [s, s]; A.play(data, st, s); ok(a.cur === 1 && b.cur === 1 && unitsOf(st.foe).length === 3, '바닥 1 — 파괴는 안 된다'); }
  /* 휩쓸기 — 같은 줄만 */
  { const s = byAb('sweep'), row = D.cards[s].row, other = A.ROWS.find(r => r !== row), st = solo([s]);
    const inRow = D.list.filter(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === row).slice(0, 2).map(id => put(st, 'foe', id));
    const out = put(st, 'foe', D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === other));
    A.play(data, st, s); ok(inRow.every(u => u.cur === u.base - 1) && out.cur === out.base, '휩쓸기 — 상대 같은 줄 전부 −1'); }
  /* 난사 — 무작위 n장 */
  { const s = byAb('volley'), st = solo([s]); const us = [weak, strong, mend, byAb('rally')].map(id => put(st, 'foe', id)); us.forEach(u => { u.cur = 9; });
    A.play(data, st, s); ok(us.filter(u => u.cur === 8).length === D.cards[s].n && us.every(u => u.cur >= 8), '난사 n — n장이 −1'); }
  /* 처형 — 5 이하면 파괴, 아니면 −2 */
  { const s = byAb('execute'), st = solo([s, s]); const a = put(st, 'foe', weak), b = put(st, 'foe', strong);
    A.play(data, st, s); ok(!unitsOf(st.foe).includes(a) && st.foe.grave.includes(weak) && st.last.fx.some(f => f.kind === 'dead'), '가장 약한 비영웅이 5 이하 — 파괴, 묘지로');
    A.play(data, st, s); ok(b.cur === b.base - 2, '5 넘으면 −2'); }
  /* 봉인 — 상대 다음 비영웅 한 장, 영웅은 소모 안 함, 진영 능력은 안 걸린다(과제 5) */
  { const s = byAb('seal'), k = byAb('strike'), st = fixture([s, s, k, k], [heroSafe, k, k]); const mine = put(st, 'me', strong); mine.cur = 50;
    A.play(data, st, s); ok(st.foe.sealed && st.turn === 'foe', '봉인이 걸렸다');
    A.play(data, st, heroSafe); ok(st.foe.sealed, '영웅을 내면 봉인은 남는다');
    A.play(data, st, s); A.play(data, st, k); ok(!st.foe.sealed && mine.cur === 50, '다음 비영웅의 능력이 안 터지고 봉인은 풀린다');
    A.play(data, st, k); A.play(data, st, k); ok(mine.cur === 50 - D.cards[k].n, '봉인이 없으면 터진다'); }
  /* 강화 — 내 같은 줄 가장 약한 비영웅(자신 포함), 저주판·영웅은 못 받는다 */
  { const row = D.cards[mend].row, st = solo([mend]); const w = put(st, 'me', D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === row && D.cards[id].power < D.cards[mend].power));
    const c = put(st, 'me', D.list.find(id => D.cards[id].variant === 'cursed' && D.cards[id].row === row)); c.cur = 1; const h = put(st, 'me', heroIn(row)); h.cur = 1;
    A.play(data, st, mend); ok(w.cur === w.base + D.cards[mend].n && c.cur === 1 && h.cur === 1, '강화 n — 저주판(1)·영웅(1)을 건너뛰고 가장 약한 비영웅에'); }
  /* 결집 — 같은 줄 나머지 전부 +1 */
  { const s = byAb('rally'), row = D.cards[s].row, st = solo([s]); const a = put(st, 'me', D.list.find(id => id !== s && D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === row)), o = put(st, 'me', D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row !== row));
    A.play(data, st, s); const self = st.me.rows[row].find(u => u.id === s); ok(a.cur === a.base + 1 && o.cur === o.base && self.cur === self.base, '결집 — 같은 줄 나머지만 +1, 자신은 아니다'); }
  /* 보호막 — 자신과 양옆, 피해 한 번을 통째로 막고 사라진다, 파괴도 막는다 */
  { const s = byAb('shield'), row = D.cards[s].row, k = byAb('strike'), st = fixture([s], [k, k, byAb('execute')]); const l = put(st, 'me', D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === row));
    A.play(data, st, s); const self = st.me.rows[row].find(u => u.id === s); ok(l.shield && self.shield, '자신과 옆 카드에 보호막');
    const big = Math.max(l.cur, self.cur), tgt = l.cur >= self.cur ? l : self; A.play(data, st, k);
    ok(tgt.cur === big && !tgt.shield && st.me.hurt === 0, '피해 한 번을 막고 사라진다 — 받은 피해 합에도 안 든다');
    tgt.cur = 3; tgt.shield = true; A.play(data, st, byAb('execute')); ok(unitsOf(st.me).includes(tgt) && !tgt.shield, '파괴도 막는다'); }
  /* 흡혈 — 상대 −n, 자신 +n */
  { const s = byAb('drain'), st = solo([s]); const b = put(st, 'foe', strong); A.play(data, st, s); const self = unitsOf(st.me)[0];
    ok(b.cur === b.base - D.cards[s].n && self.cur === self.base + D.cards[s].n, '흡혈 n'); }
  /* 저주 출혈 — 상대가 낼 때마다 −1, 바닥 1, 영웅 저주판도 */
  { const k = byAb('strike'), st = fixture([k], [mend, mend, mend]); const c = put(st, 'me', D.list.find(id => D.cards[id].variant === 'cursed' && !D.cards[id].hero)), hc = put(st, 'me', cursedHero);
    st.passed.me = true; st.turn = 'foe'; A.play(data, st, mend); ok(c.cur === c.base - 1 && hc.cur === hc.base - 1, '상대가 내면 저주판 −1, 영웅 저주판도');
    c.cur = 1; A.play(data, st, mend); ok(c.cur === 1, '바닥 1');
    c.cur = 5; st.foe.hand.push(D.list.find(id => D.cards[id].variant === 'weather')); A.play(data, st, st.foe.hand[st.foe.hand.length - 1]); ok(c.cur === 4, '날씨판을 내도 카드를 낸 것 — 출혈');
    ok(unitsOf(st.me).every(u => u.cur >= 1) && c.base === D.cards[c.id].power, '저주판 힘 = 기본 +5 그대로(base)'); }
  /* 아스트라 배율 · 호국 — 깃발만 세워 본다(진영 능력 자체는 과제 5) */
  { const s = byAb('strike'), st = solo([s]); const b = put(st, 'foe', strong); b.cur = 12; st.me.astra = true; A.play(data, st, s);
    ok(b.cur === 12 - 2 * D.cards[s].n && !st.me.astra, '아스트라 — n×2, 한 번 쓰면 꺼진다'); }
  { const k = byAb('strike'), st = fixture([], [k]); const m = put(st, 'me', strong); st.me.guard = true; st.passed.me = true; st.turn = 'foe'; A.play(data, st, k);
    ok(m.cur === m.base && st.me.hurt === 0, '호국 — 피해를 안 받는다'); }
}

/* 진영 능력 열하나 — 한 판에 한 번, 턴을 쓴다, 봉인에 안 걸린다, 묘지에 날씨판만 있으면 빈손 */
{
  const k = byAb('strike'), mend = byAb('mend'), strong = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].power >= 9);
  const weather = D.list.find(id => D.cards[id].variant === 'weather');
  const mk = (main, meHand) => { const st = fixture(meHand || [k, k], [k, k, k], { main }); st.passed.foe = true; return st; };
  /* 공통 */
  { const st = mk('norse'); st.me.grave = [strong, weather]; st.foe.sealed = false; st.me.sealed = true;
    ok(A.useFaction(data, st).ok && st.me.faction.used && st.me.hand.includes(strong) && st.me.grave.length === 1 && st.me.sealed, '발할라 — 묘지의 가장 센 카드를 손으로. 봉인은 안 걸리고 남는다');
    ok(st.turn === 'me' && st.log.some(e => e.t === 'faction' && e.who === 'me'), '상대가 패스했으니 턴을 쓰고도 내 차례 · 기록');
    ok(A.useFaction(data, st).why === 'used', '한 판에 한 번');
    const t = mk('norse'); t.passed.me = true; ok(A.useFaction(data, t).why === 'passed', '패스한 쪽은 못 쓴다');
    const u = mk('norse'); u.me.grave = [weather, weather]; ok(A.useFaction(data, u).ok && u.me.faction.used && u.me.hand.length === 2 && u.me.grave.length === 2, '묘지에 날씨판뿐이면 아무것도 안 고르지만 쓴 것으로 센다'); }
  { const st = mk('norse', [k]); st.passed.foe = false; A.play(data, st, k); ok(st.passed.me && st.turn === 'foe' && !A.legal(data, st, 'me').faction && !st.me.faction.used, '마지막 카드를 내면 자동 패스 — 이 라운드엔 진영 능력을 쓸 차례가 안 온다'); }
  { const st = mk('greek'); const a = put(st, 'me', strong), c = put(st, 'me', D.list.find(id => D.cards[id].variant === 'cursed')); c.cur = 99;
    A.useFaction(data, st); ok(a.cur === a.base * 2 && c.cur === 99, '신의 가호 — 가장 센 비영웅·비저주에 기본 힘만큼(두 배)'); }
  { const st = mk('korea', [k]); const a = put(st, 'me', strong); A.useFaction(data, st); ok(st.me.guard, '호국 켜짐');
    st.passed.foe = false; st.turn = 'foe'; A.play(data, st, k); ok(a.cur === a.base, '이 라운드엔 피해 없음');
    st.turn = 'me'; A.pass(data, st); A.pass(data, st); ok(!st.me.guard, '라운드가 끝나면 풀린다'); }
  { const st = mk('china'); st.me.deck = [strong, mend, k]; A.useFaction(data, st); ok(st.me.hand.length === 4 && st.me.hand.includes(strong) && st.me.hand.includes(mend) && st.me.deck.length === 1, '기 — 덱 위 2장');
    const t = mk('china'); t.me.deck = [strong]; A.useFaction(data, t); ok(t.me.hand.length === 3, '덱이 모자라면 있는 만큼'); }
  { const st = mk('japan'); const b = put(st, 'foe', strong), h = put(st, 'foe', heroIn('reach')); h.cur = 50; A.useFaction(data, st);
    ok(!unitsOf(st.foe).includes(b) && st.foe.grave.includes(strong) && unitsOf(st.foe).includes(h), '일섬 — 가장 센 비영웅 파괴, 영웅은 못 고른다');
    const t = mk('japan'); const s = put(t, 'foe', strong); s.shield = true; A.useFaction(data, t); ok(unitsOf(t.foe).includes(s) && !s.shield, '보호막은 파괴도 막는다'); }
  { const st = mk('india'); const b = put(st, 'foe', strong); b.cur = 12; A.useFaction(data, st); ok(st.me.astra, '아스트라 켜짐');
    A.play(data, st, k); ok(b.cur === 12 - 2 * D.cards[k].n && !st.me.astra, '다음 카드의 수치가 두 배'); }
  { const st = mk('egypt'); st.me.grave = [weather, strong]; const b = put(st, 'foe', strong); A.useFaction(data, st);
    const u = st.me.rows[D.cards[strong].row].find(x => x.id === strong); ok(u && u.cur === u.base && st.me.grave.length === 1 && b.cur === b.base, '영생 — 묘지의 가장 센 카드를 자기 줄에, 능력은 안 터진다');
    ok(st.last.fx.some(f => f.kind === 'rise' && f.at === u.at) && !st.last.fx.some(f => f.kind === 'buff'), '영생의 연출은 rise — +0 이 뜨지 않는다'); }
  { const st = mk('westasia'); const b = put(st, 'foe', strong); b.cur = 12; st.me.hurt = 5; A.useFaction(data, st); ok(b.cur === 7, '눈에는 눈 — 받은 피해 합만큼');
    const t = mk('westasia'); const c = put(t, 'foe', strong); A.useFaction(data, t); ok(c.cur === c.base && t.me.faction.used, '0 이면 아무것도 안 하고 쓴 것으로'); }
  { const st = mk('celtic'); const a = put(st, 'me', strong), b = put(st, 'foe', strong); b.cur = 99; A.useFaction(data, st); ok(a.cur === a.base + 2, '투혼 — 뒤지면 전부 +2');
    const t = mk('celtic'); const c = put(t, 'me', strong); A.useFaction(data, t); ok(c.cur === c.base, '앞서면 아무것도'); }
  { const st = mk('america'); const b = put(st, 'foe', strong), a = put(st, 'me', strong), w = put(st, 'me', byAb('mend')); w.cur = 2; A.useFaction(data, st);
    ok(b.cur === b.base - 3 && w.cur === 5 && a.cur === a.base, '비취의 숨 — 상대 가장 센 −3, 내 가장 약한 +3'); }
  { const st = mk('knight'); st.me.grave = [k, k, k, k, k, k, k]; const a = put(st, 'me', strong); A.useFaction(data, st); ok(a.cur === a.base + 5, '롱스보 — 묘지 수만큼, 최대 5');
    const t = mk('knight'); t.me.grave = [k, weather]; const c = put(t, 'me', strong); A.useFaction(data, t); ok(c.cur === c.base + 2, '날씨판도 묘지 수에 든다'); }
  for (const m of Object.keys(data.duel.factions)) ok(typeof A.FACTION[m] === 'function', '진영 능력 함수 ' + m);
}

/* AI — 늘 합법, 세 난이도의 버릇 */
{
  const k = byAb('strike'), hero = heroIn('melee'), cursed = D.list.find(id => D.cards[id].variant === 'cursed' && !D.cards[id].hero), w = D.list.find(id => D.cards[id].variant === 'weather' && D.cards[id].row === 'melee');
  const mel = D.list.filter(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === 'melee');
  /* 합법 — 세 난이도로 한 판씩 끝까지, 수마다 ok */
  for (const level of A.LEVELS) {
    const p = A.newProfile(data, 'china', 2), st = A.newMatch(data, p, 'japan', level, 21); A.confirm(data, st);
    let guard = 0; while (st.phase === 'play' && guard++ < 80) { const r = A.aiTurn(data, st, st.turn === 'me' ? 'veteran' : level); ok(r.ok, level + ' AI 는 합법인 수만: ' + JSON.stringify(r.move)); }
    ok(st.phase === 'done' && ['me', 'foe', 'draw'].includes(st.winner) && guard < 80, level + ' 끝까지 간다');
  }
  /* evaluate 는 원본을 안 건드린다 */
  { const st = fixture([k], [k]); const before = JSON.stringify(st); const g = A.evaluate(data, st, { kind: 'card', id: k }); ok(g === D.cards[k].power && JSON.stringify(st) === before, '변화 = 낸 카드의 힘 · 원본 그대로'); }
  /* 패스 — 앞서는데 상대가 패스했으면 셋 다 패스 */
  { const st = fixture([k, k], [k]); put(st, 'me', k); st.passed.foe = true; for (const l of A.LEVELS) ok(A.aiMove(data, st, l).kind === 'pass', l + ' — 앞서는데 상대 패스면 패스'); }
  /* 패스 — 뒤지는데 못 뒤집으면 숙련·에이스는 패스, 신참은 낸다, 목숨 하나면 낸다 */
  { const st = fixture([mel[0]], [k]); const b = put(st, 'foe', k); b.cur = 60;
    ok(A.aiMove(data, st, 'veteran').kind === 'pass' && A.aiMove(data, st, 'ace').kind === 'pass' && A.aiMove(data, st, 'rookie').kind !== 'pass', '못 뒤집으면 숙련·에이스만 패스(신참은 상위 셋 중 하나 — 진영 능력일 수도)');
    st.lives.me = 1; ok(A.aiMove(data, st, 'veteran').kind === 'card', '목숨 하나면 끝까지 낸다'); }
  /* 에이스 — 1라운드엔 영웅·저주판·진영 능력을 아낀다, 저주판은 손 셋 이하, 날씨판은 이득 4 이상 */
  { const st = fixture([hero, mel[0]], [k], { main: 'japan' }); const b = put(st, 'foe', k); b.cur = 1;
    ok(A.aiMove(data, st, 'ace').id === mel[0] && A.aiMove(data, st, 'ace').kind !== 'faction', '에이스 1라운드 — 영웅·진영 능력 대신 비영웅');
    st.me.hand = [hero]; ok(A.aiMove(data, st, 'ace').kind === 'pass', '영웅뿐이면 1라운드엔 패스');
    st.round = 2; ok(A.aiMove(data, st, 'ace').id === hero, '2라운드엔 영웅도 낸다');
    st.round = 1; st.passed.foe = true; b.cur = 5; ok(A.aiMove(data, st, 'ace').id === hero, '상대가 패스했고 뒤지면 1라운드에도 영웅을 낸다'); }
  { const st = fixture([cursed, mel[0], mel[1], mel[2]], [k]); st.round = 2; put(st, 'foe', k).cur = 1;
    ok(A.aiMove(data, st, 'ace').id !== cursed, '손 넷이면 저주판을 안 낸다');
    st.me.hand = [cursed]; ok(A.aiMove(data, st, 'ace').id === cursed, '손 하나면 낸다'); }
  { const st = fixture([w, mel[0]], [k]); st.round = 2; st.lives.me = 1; /* 목숨 하나 — 못 뒤집어도 패스하지 않는다 */
    ok(A.aiMove(data, st, 'ace').id === mel[0], '상대 줄이 비면 날씨판은 이득이 없다 — 안 낸다');
    mel.slice(0, 3).forEach(id => { put(st, 'foe', id).cur = 10; });
    ok(A.aiMove(data, st, 'ace').id === w, '상대가 세 장 깔면 서리(이득 27)'); }
}
/* 보상 · 통계 — 이기면 뒷장 5장이 깔리고 첫 승 3장·재대결 1장을 골라 뒤집는다. 5장의 구성은 난이도가 정한다 */
{
  const done = (p, winner, played, level) => { const st = A.newMatch(data, p, 'greek', level || 'rookie', 3); A.confirm(data, st); st.phase = 'done'; st.winner = winner;
    st.roundLog = [{ me: 30, foe: 20, winner: 'me', units: { me: 3, foe: 2 } }, { me: 12, foe: 25, winner: 'foe', units: { me: 1, foe: 3 } }, { me: 41, foe: 19, winner: 'me', units: { me: 4, foe: 2 } }];
    st.played = played; st.me.faction.used = true; return st; };
  const p = A.newProfile(data, 'norse', 9), k = byAb('strike'), owned0 = p.owned.length;
  const st1 = done(p, 'me', [k, '묠니르']), r = A.settle(data, p, st1);
  ok(r.result === 'win' && r.first && r.picks === 3 && r.pool.length === A.REWARD_POOL && r.taken.length === 0 && st1.outcome === r, '첫 승 — 뒷장 5장, 3장 고르기, 아직 하나도 안 뒤집었다');
  ok(new Set(r.pool).size === 5 && r.pool.every(id => D.cards[id] && !p.owned.includes(id)) && p.owned.length === owned0, '5장은 서로 다르고 아직 없는 카드, 컬렉션은 아직 그대로');
  ok(r.pool.every(id => D.cards[id].myth === 'greek'), '그 주인의 권에서 먼저');
  ok(p.beaten.greek.rookie === 1 && A.winsOf(p, 'greek') === 1 && !A.conquered(data, p), '이긴 수');
  const s = p.stats;
  ok(s.games === 1 && s.win === 1 && s.streak === 1 && s.bestStreak === 1 && s.bestRound === 41 && s.rounds === 3, '전적 줄');
  ok(s.byBoss.greek.win === 1 && s.byLevel.rookie.games === 1 && s.byMain.norse.win === 1 && s.cards[k].played === 1 && s.cards[k].won === 1 && s.cards['묠니르'].played === 1 && s.factions.norse === 1, '주인·난이도·주 권·카드·진영 능력');
  /* 뒤집기 — 고른 자리의 카드가 컬렉션에, 같은 자리 두 번은 안 되고, 셋을 다 고르면 더는 못 고른다 */
  ok(A.pickReward(data, p, st1, 1).ok && p.owned.includes(r.pool[1]) && r.taken.includes(1) && p.owned.length === owned0 + 1, '한 장 뒤집으면 그 카드가 내 것');
  ok(A.pickReward(data, p, st1, 1).why === 'taken' && A.pickReward(data, p, st1, 9).why === 'index', '같은 자리 두 번·없는 자리는 안 된다');
  ok(A.pickReward(data, p, st1, 0).ok && A.pickReward(data, p, st1, 4).ok && A.pickReward(data, p, st1, 2).why === 'done' && p.owned.length === owned0 + 3, '셋을 고르면 끝');
  ok(!A.settle(data, p, st1) && s.games === 1, '두 번 더하지 않는다(st.rewarded)');
  /* 남은 몫은 자동으로 — 로비로 갈 때 */
  const st2 = done(p, 'me', [k]), r2 = A.settle(data, p, st2);
  ok(r2.picks === 1 && !r2.first && r2.pool.length === 5, '재대결 — 5장 중 1장');
  const got = A.finishRewards(data, p, st2); ok(got.length === 1 && r2.taken.length === 1 && p.owned.includes(got[0]) && A.finishRewards(data, p, st2).length === 0, '안 뒤집은 몫은 자동으로 뒤집히고, 두 번은 없다');
  ok(A.settle(data, p, done(p, 'foe', [k])).pool.length === 0 && s.lose === 1 && s.streak === 0 && s.cards[k].won === 2, '패배 — 보상 없음, 연승 끊김');
  ok(A.settle(data, p, done(p, 'draw', [])).picks === 0 && s.draw === 1 && s.games === 4, '무승부도 없음');
  /* 난이도별 구성 — 수백 판 굴려 비율을 본다 */
  const share = level => { const n = { base: 0, awaken: 0, cursed: 0, weather: 0, hero: 0, total: 0 };
    for (let seed = 1; seed <= 120; seed++) { const q = A.newProfile(data, 'norse', seed); const st = A.newMatch(data, q, data.duel.bosses[seed % 11].myth, level, seed); A.confirm(data, st); st.phase = 'done'; st.winner = 'me'; st.roundLog = []; st.played = [];
      const o = A.settle(data, q, st); for (const id of o.pool) { n[D.cards[id].variant]++; if (D.cards[id].hero) n.hero++; n.total++; } }
    for (const key of Object.keys(n)) if (key !== 'total') n[key] = n[key] / n.total; return n; };
  const R = share('rookie'), V = share('veteran'), E = share('ace');
  ok(R.base > 0.5 && R.weather < 0.15, '신참 — 기본판이 반 넘고 날씨판은 드물다: ' + JSON.stringify(R));
  ok(E.weather > 0.25 && E.base < 0.3, '에이스 — 날씨판이 넷에 하나 넘고 기본판은 적다: ' + JSON.stringify(E));
  ok(V.base < R.base && V.base > E.base && V.weather > R.weather && V.weather < E.weather, '숙련은 그 사이');
  ok(E.hero > R.hero, '에이스일수록 영웅(5금)이 자주 깔린다: ' + R.hero.toFixed(2) + ' → ' + E.hero.toFixed(2));
  /* 가진 게 많으면 — 그 권이 다 차면 다른 권, 전부면 빈 판 */
  const q = A.newProfile(data, 'norse', 9); q.owned = q.owned.concat(D.list.filter(id => D.cards[id].myth === 'greek' && !q.owned.includes(id)));
  ok(A.settle(data, q, done(q, 'me', [])).pool.every(id => D.cards[id].myth !== 'greek'), '그 권이 다 차면 다른 권');
  q.owned = D.list.slice(); ok(A.settle(data, q, done(q, 'me', [])).pool.length === 0, '전부 가졌으면 빈 판 — 멈추지 않는다');
  /* 옛 저장 — stats 없이도 settle 된다 · 화면용 보기 */
  const old = { v: A.VERSION, main: 'norse', owned: p.owned.slice(), deck: p.deck.slice(), beaten: {} };
  ok(A.settle(data, old, done(p, 'me', [k])).result === 'win' && old.stats.games === 1, 'stats 가 없던 프로필도');
  const v = A.statsView(data, p);
  ok(v.line.games === 4 && v.byBoss.length === 11 && v.byBoss[1].myth === 'greek' && v.byBoss[1].games === 4 && v.cards[0].id === k && v.cards[0].rate === null && v.avgRounds === 3 && v.factions[0].myth === 'norse', '보기 — 5판 미만은 승률 없음');
  p.stats.cards[k] = { played: 10, won: 7 }; ok(A.statsView(data, p).cards[0].rate === 0.7, '5판부터 승률');
  ok(A.statsView(data, A.newProfile(data, 'norse', 1)).avgRounds === null, '판이 없으면 평균 없음');
  { const q2 = A.newProfile(data, 'norse', 2), st = done(q2, 'lose', []); st.coin = 'me'; st.roundLog = [{ me: 20, foe: 30, winner: 'foe', units: { me: 1, foe: 1 } }, { me: 9, foe: 30, winner: 'foe', units: { me: 1, foe: 1 } }];
    A.settle(data, q2, st); ok(q2.stats.bestRound === 20 - A.FIRST_BONUS, '최고 합에 선공 보너스는 안 센다'); }
}
/* 자동 채우기 — 규칙(25·주 권 15·영웅 4·날씨 3·같은 id 1)을 지키며 센 카드부터 채우고, 넘치면 약한 것부터 뺀다 */
{
  const p = A.newProfile(data, 'norse', 5);
  p.deck = []; let r = A.autoFill(data, p);
  ok(r.ok && p.deck.length === 25 && A.validateDeck(data, p).ok && r.added.length === 25, '빈 덱을 25장으로 — 규칙에 맞게');
  const q = A.newProfile(data, 'norse', 5); q.owned = D.list.slice(); q.deck = [];
  r = A.autoFill(data, q); const v = A.validateDeck(data, q);
  ok(r.ok && v.ok && v.hero === 4 && v.weather <= 3 && v.main >= 15, '전부 가졌을 때 — 영웅 4·날씨 3 이하·주 권 15 이상');
  ok(q.deck.every((id, i) => i === 0 || D.cards[q.deck[i - 1]].myth !== 'norse' || D.cards[id].myth !== 'norse' || D.cards[q.deck[i - 1]].power >= D.cards[id].power || D.cards[q.deck[i - 1]].hero || D.cards[id].hero || D.cards[id].variant === 'weather'), '주 권은 센 카드부터');
  q.deck = q.deck.concat(D.list.filter(id => !q.deck.includes(id)).slice(0, 10)); r = A.autoFill(data, q);
  ok(q.deck.length === 25 && r.removed.length === 10 && A.validateDeck(data, q).ok, '35장이면 10장을 빼 25장');
  const w = A.newProfile(data, 'norse', 5); w.deck = w.deck.slice(0, 20); w.deck.push(w.deck[0]);
  r = A.autoFill(data, w); ok(A.validateDeck(data, w).ok && new Set(w.deck).size === 25, '겹친 카드는 빼고 채운다');
  const few = A.newProfile(data, 'norse', 5); A.setMain(few, 'greek'); few.deck = [];
  r = A.autoFill(data, few); ok(!r.ok && few.deck.length === 25 && A.validateDeck(data, few).problems.includes('main'), '주 권 카드가 모자라면 채우되 ok 는 아니다');
}

/* ── 끝 ── */
console.log('PASS 결투 규칙: ' + n + ' 가지' + (quick ? ' (--quick)' : ''));
if (quick) process.exit(0);
/* ── 보고: AI 끼리 11권 × 3난이도 × 9시드 = 297판. 선공 승률 40~60% · 권별 승률 25~75% 를 벗어나면 실패 ── */
const myths = data.duel.bosses.map(b => b.myth), tally = {}, add = (m, win) => { tally[m] = tally[m] || { g: 0, w: 0 }; tally[m].g++; if (win) tally[m].w++; };
let first = 0, decided = 0, rounds = 0, units = 0, unitRounds = 0, games = 0;
myths.forEach((main, i) => A.LEVELS.forEach((level, li) => { for (let s = 1; s <= 9; s++) {
  const boss = myths[(i + s) % myths.length], p = A.newProfile(data, main, s * 100 + i), st = A.newMatch(data, p, boss, level, s * 1000 + i * 10 + li);
  A.confirm(data, st); let guard = 0;
  while (st.phase === 'play' && guard++ < 80) assert(A.aiTurn(data, st, st.turn === 'me' ? 'veteran' : level).ok, '보고 중 비합법 수');
  assert(st.phase === 'done', '80수 안에 끝나지 않는 판: ' + main + '/' + boss + '/' + level + '/' + s);
  games++; rounds += st.roundLog.length; st.roundLog.forEach(r => { units += r.units.me + r.units.foe; unitRounds += 2; });
  if (st.winner !== 'draw') { decided++; if (st.winner === st.coin) first++; }   /* coin — 처음 동전. first 는 라운드마다 바뀐다 */
  add(main, st.winner === 'me'); add(boss, st.winner === 'foe');
} }));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
console.log('\n결투 ' + games + '판 — 선공 승률 ' + pct(first, decided) + '% (무승부 ' + (games - decided) + ') · 평균 라운드 ' + (rounds / games).toFixed(2) + ' · 라운드 끝 판 위 평균 ' + (units / unitRounds).toFixed(1) + '장');
for (const m of myths) console.log('  ' + m.padEnd(9) + String(pct(tally[m].w, tally[m].g)).padStart(3) + '%  (' + tally[m].g + ')');
assert(pct(first, decided) >= 40 && pct(first, decided) <= 60, '선공 승률이 40~60% 를 벗어났다');
for (const m of myths) assert(pct(tally[m].w, tally[m].g) >= 25 && pct(tally[m].w, tally[m].g) <= 75, m + ' 승률이 25~75% 를 벗어났다');
