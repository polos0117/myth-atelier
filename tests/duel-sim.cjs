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
  return st;
}
const byAb = (ab, f) => D.list.find(id => { const c = D.cards[id]; return c.variant === 'base' && c.ability === ab && !c.hero && (!f || f(c)); });
const unitsOf = s => A.ROWS.flatMap(r => s.rows[r]);

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
    ok(A.ROWS.includes(c.row) && typeof c.file === 'string' || c.file === null, c.id + ' 줄·그림');
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
  ok(p.owned.filter(id => D.cards[id].myth === 'norse').length === 17 && p.owned.every(id => D.cards[id].variant === 'base'), '주 권 17 + 기본판만');
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

/* ── 끝 ── */
console.log('PASS 결투 규칙: ' + n + ' 가지' + (quick ? ' (--quick)' : ''));
