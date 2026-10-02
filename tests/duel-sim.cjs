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

/* ── 끝 ── */
console.log('PASS 결투 규칙: ' + n + ' 가지' + (quick ? ' (--quick)' : ''));
