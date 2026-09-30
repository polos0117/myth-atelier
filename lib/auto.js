/* 오토 배틀러 엔진 — 놀이 규칙은 여기에만 있다. 화면(auto.html)은 굴리고 보여 주기만 한다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierAuto 하나만 붙이고, node 에서는 module.exports.

   상태(state)는 통째로 JSON 이다. 난수도 state.rngState 한 정수라서 같은 seed 로 같은 손을
   두면 같은 판이 난다 — 검사(tests/auto-sim.cjs)가 그걸 믿고 수백 판을 굴린다.

   여섯이 한 판을 한다 — 나와 맞수 다섯(전설의 대장장이들). 상태의 맨 위가 곧 나(state 가 플레이어 하나)이고,
   맞수는 state.bots 에 같은 모양으로 있다: {hp, gold, level, xp, streak, board, bench, shop, alive, place}.
   라운드마다 모두 금·경험치를 받고, 맞수는 먼저 사고 놓는다. 짝을 지어 싸우고(홀수면 하나가 유령과),
   지면 체력이 깎인다. 체력 100 이 다하면 탈락, 마지막 하나가 남으면 끝 — 순위는 1~6등.
   상점은 한 판에 함께 쓰는 무기 더미(state.pool)에서 뽑는다. 누가 사 가면 남에게 덜 나온다.

   판: 앞줄·가운데·뒷줄 세 줄 × 네 칸. 올릴 수 있는 수는 레벨(1~9). 근접은 상대의 가장 앞줄만 친다.
   중거리는 앞줄을 찌르되 같은 칸 바로 뒤까지 일부 닿는다. 원거리는 아무나, 체력이 가장 낮은 쪽을 노린다.

   세 상태: 기본 → 각성(3성) → 저주. 저주는 카드의 curse 대로, 체력이 문턱 아래로 떨어지면 한 판에 한 번 발현되어
   공격·기술이 세지는 대신 박자마다 피를 잃고 치유·보호막을 못 받는다. 되살아나도(발할라) 풀리지 않는다 — 대가다.

   자료는 부르는 쪽이 넘긴다: data = {cards:[…], skills:{…}, synergy:{myth:{…}, kind:{…}}}. */
(function (root) {
  'use strict';

  var VERSION = 2;
  var ROWS = 3, COLS = 4, CELLS = ROWS * COLS;
  var BENCH = 9, SHOP = 5, REROLL = 2, XP_COST = 4, XP_GAIN = 4, XP_ROUND = 2;
  var MAX_HP = 100, START_GOLD = 3, PLAYERS = 6, MAX_LEVEL = 9, MAX_ROUNDS = 50;
  var STAR_MULT = [0, 1, 1.8, 3.24];
  var MANA_MAX = 100, MANA_ATTACK = 14, MANA_HIT = 7;
  var TICK = 0.1, MAX_BEATS = 45, REACH_SPLASH = 0.4, CRIT = 1.5, BLUNT_STUN = 0.6, ALL_TARGETS = 6;
  /* 레벨별 상점 확률(값 1~5). 레벨을 올려야 비싼 것이 나온다 — 돈을 모을지 레벨을 올릴지가 갈림길 */
  var LEVEL_ODDS = [null,
    [100, 0, 0, 0, 0], [100, 0, 0, 0, 0], [75, 25, 0, 0, 0], [55, 30, 15, 0, 0], [45, 33, 20, 2, 0],
    [30, 40, 25, 5, 0], [19, 30, 40, 10, 1], [16, 22, 35, 22, 5], [10, 18, 27, 33, 12]];
  /* 다음 레벨까지 경험치. 라운드마다 2, 4금에 4 */
  var XP_NEED = [0, 2, 2, 6, 10, 20, 36, 48, 72];
  /* 무기 더미 — 값마다 한 자루가 몇 장인가. 3성에 아홉 장이 드니, 둘이 같은 것을 쫓으면 한쪽은 못 닿는다 */
  var POOL_SIZE = [0, 22, 17, 13, 10, 8];
  /* 맞수 다섯 — 신화 속 대장장이(헤파이스토스·에이트리·구야자·비슈바카르마·고브니우). 이름은 낱말 표 auto.bot.<name>. style 은 두는 버릇 */
  var BOTS = [
    { name: 'hephaestus', style: 'fast' }, { name: 'eitri', style: 'reroll' }, { name: 'ouyezi', style: 'econ' },
    { name: 'vishvakarma', style: 'fast' }, { name: 'goibniu', style: 'reroll' }];

  /* ── 난수 (mulberry32) — 상태는 state.rngState 정수 하나 ── */
  function rand(st) {
    st.rngState = (st.rngState + 0x6D2B79F5) | 0;
    var t = st.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(st, n) { return Math.floor(rand(st) * n); }
  function shuffle(st, list) {
    for (var i = list.length - 1; i > 0; i--) { var j = randInt(st, i + 1), x = list[i]; list[i] = list[j]; list[j] = x; }
    return list;
  }

  function cardOf(data, name) {
    if (!data._byName) {
      data._byName = {};
      for (var i = 0; i < data.cards.length; i++) data._byName[data.cards[i].name] = data.cards[i];
    }
    return data._byName[name];
  }

  /* ── 플레이어 ── */
  function players(st) { return [st].concat(st.bots || []); }
  function playerOf(st, id) { return id === 0 ? st : (st.bots || [])[id - 1] || null; }
  function alivePlayers(st) { return players(st).filter(function (p) { return p.alive; }); }
  function cap(p) { return typeof p === 'number' ? p : p.level; }
  /* 연승·연패 금: 2~3연속 +1, 4연속 +2, 5연속부터 +3 */
  function streakGold(streak) { var s = Math.abs(streak || 0); return s >= 5 ? 3 : s >= 4 ? 2 : s >= 2 ? 1 : 0; }
  function income(gold, streak) { return 5 + Math.min(5, Math.floor(gold / 10)) + streakGold(streak); }
  function value(card, star) { return card.cost * (star === 1 ? 1 : star === 2 ? 3 : 9); }
  function copies(star) { return star === 1 ? 1 : star === 2 ? 3 : 9; }
  function odds(level) { return LEVEL_ODDS[Math.max(1, Math.min(MAX_LEVEL, level))]; }
  function xpNeed(level) { return level >= MAX_LEVEL ? 0 : XP_NEED[level]; }
  function addXp(p, n) {
    if (p.level >= MAX_LEVEL) return;
    p.xp += n;
    while (p.level < MAX_LEVEL && p.xp >= XP_NEED[p.level]) { p.xp -= XP_NEED[p.level]; p.level += 1; }
    if (p.level >= MAX_LEVEL) p.xp = 0;
  }
  /* 수호자 라운드 — 처음 셋과 그 뒤 여섯 라운드마다 하나. 같은 수호자 판과 모두가 싸우고, 이기면 금 */
  function isPve(round) { return round <= 3 || (round >= 9 && (round - 9) % 6 === 0); }
  /* 지면 깎이는 체력 = 라운드 기본 + 살아남은 상대 수. 뒤로 갈수록 한 판이 무겁다 */
  function stageDamage(round) {
    if (round <= 3) return 0;
    if (round <= 6) return 2;
    if (round <= 9) return 4;
    if (round <= 12) return 6;
    if (round <= 15) return 9;
    if (round <= 18) return 12;
    return 15 + (round - 19) * 3;
  }
  function pveReward(round) { return 1 + Math.floor(round / 6); }

  /* ── 판의 신화권 — 열한 권 중 셋만 그 판의 상점과 상대에 나온다(마흔다섯 자루). 여섯이 한 더미를
     나눠 쓰니 둘로는 좁다. 판마다 구성이 달라진다 ── */
  var MYTHS_PER_GAME = 3;
  function mythKeys(data) { return Object.keys(data.synergy.myth); }
  var SPLIT = { east: ['korea', 'china', 'japan'] };
  function liveMyths(st, data) {
    if (!st.myths) return null;
    var all = mythKeys(data), out = [];
    st.myths.forEach(function (k) {
      (SPLIT[k] && all.indexOf(k) < 0 ? SPLIT[k] : [k]).forEach(function (x) { if (all.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x); });
    });
    return out.length ? out : null;
  }
  function inPlay(st, data) {
    var myths = liveMyths(st, data);
    if (!myths) return data.cards;
    return data.cards.filter(function (c) { return myths.indexOf(c.myth) >= 0; });
  }
  function pickMyths(st, data) {
    var all = mythKeys(data), left = all.slice(), got = [];
    while (got.length < Math.min(MYTHS_PER_GAME, all.length)) got.push(left.splice(randInt(st, left.length), 1)[0]);
    return all.filter(function (k) { return got.indexOf(k) >= 0; });
  }
  function validMyths(data, myths) {
    var all = mythKeys(data);
    if (!myths || myths.length !== Math.min(MYTHS_PER_GAME, all.length)) return null;
    for (var i = 0; i < myths.length; i++) if (all.indexOf(myths[i]) < 0 || myths.indexOf(myths[i]) !== i) return null;
    return all.filter(function (k) { return myths.indexOf(k) >= 0; });
  }
  /* 첫 라운드, 아무것도 안 샀을 때만 바꾼다 — 같은 seed 로 판을 새로 짠다(맞수·더미·상점까지) */
  function setMyths(st, data, myths) {
    var ok = validMyths(data, myths);
    if (!ok) return { ok: false, why: 'myths' };
    if (st.phase !== 'plan' || st.round !== 1 || st.board.some(Boolean) || st.bench.some(Boolean) || st.xpBought) return { ok: false, why: 'late' };
    var fresh = newGame(data, st.seed, { myths: ok }), k;
    for (k in st) if (Object.prototype.hasOwnProperty.call(st, k)) delete st[k];
    for (k in fresh) st[k] = fresh[k];
    return { ok: true };
  }

  /* ── 무기 더미 ── */
  function give(st, name, n) { if (name && st.pool[name] != null) st.pool[name] += n; }
  function take(st, name, n) { if (st.pool[name] >= n) { st.pool[name] -= n; return true; } return false; }
  /* 상점을 새로. 남아 있던 칸은 더미로 돌려놓고, 레벨 확률로 값을 뽑고, 그 값에서 남은 장수만큼 무겁게 뽑는다 */
  function roll(st, data, p) {
    p = p || st;
    for (var s = 0; s < p.shop.length; s++) give(st, p.shop[s], 1);
    var out = [], w = odds(p.level), i, r, cost, j, cards = inPlay(st, data);
    for (i = 0; i < SHOP; i++) {
      r = rand(st) * 100; cost = 1;
      for (j = 0; j < 5; j++) { r -= w[j]; if (r < 0) { cost = j + 1; break; } }
      var pick = null;
      for (var c = cost; c >= 1 && !pick; c--) pick = drawCost(st, cards, c);
      for (c = cost + 1; c <= 5 && !pick; c++) pick = drawCost(st, cards, c);
      if (pick) take(st, pick, 1);
      out.push(pick);
    }
    p.shop = out;
    return out;
  }
  function drawCost(st, cards, cost) {
    var total = 0, i, list = [];
    for (i = 0; i < cards.length; i++) if (cards[i].cost === cost && st.pool[cards[i].name] > 0) { list.push(cards[i]); total += st.pool[cards[i].name]; }
    if (!total) return null;
    var r = randInt(st, total);
    for (i = 0; i < list.length; i++) { r -= st.pool[list[i].name]; if (r < 0) return list[i].name; }
    return list[list.length - 1].name;
  }

  function blankPlayer(id, name, bot) {
    var p = { id: id, name: name, bot: bot, hp: MAX_HP, gold: START_GOLD, level: 1, xp: 0, streak: 0,
              shop: [], bench: [], board: [], alive: true, place: 0, lastOpp: null }, i;
    for (i = 0; i < BENCH; i++) p.bench.push(null);
    for (i = 0; i < CELLS; i++) p.board.push(null);
    return p;
  }
  /* opt.myths: 판의 신화권 셋. 없으면 seed 로 뽑는다 */
  function newGame(data, seed, opt) {
    var st = blankPlayer(0, null, null);
    st.v = VERSION; st.seed = seed | 0; st.rngState = seed | 0; st.round = 1; st.nextId = 1;
    st.phase = 'plan'; st.result = null; st.history = []; st.enemy = null; st.matches = []; st.pve = null; st.xpBought = false;
    st.myths = validMyths(data, opt && opt.myths) || pickMyths(st, data);
    st.pool = {};
    inPlay(st, data).forEach(function (c) { st.pool[c.name] = POOL_SIZE[c.cost]; });
    st.bots = BOTS.slice(0, PLAYERS - 1).map(function (b, i) {
      var p = blankPlayer(i + 1, b.name, b.style), myths = st.myths;
      p.fav = myths[randInt(st, myths.length)];
      return p;
    });
    startRound(st, data);
    return st;
  }
  function startRound(st, data) {
    var list = alivePlayers(st), i;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      p.gold += income(p.gold, p.streak);
      if (st.round > 1) addXp(p, XP_ROUND);
      roll(st, data, p);
    }
    st.pve = isPve(st.round) ? makePve(st, data) : null;
    st.phase = 'plan';
    for (i = 0; i < list.length; i++) if (list[i].bot) autoPlan(st, data, list[i]);
    st.matches = st.pve ? [] : pair(st);
    st.enemy = enemyOf(st, 0);
    st.phase = 'plan';
    st.result = null;
    st.xpBought = false;
  }
  /* 짝 짓기 — 산 사람을 섞어 둘씩. 지난 라운드 상대와 또 붙는 짝이 적은 섞음을 고른다. 홀수면 마지막은 유령(다른 이의 판 복사본)과 */
  function pair(st) {
    var alive = alivePlayers(st).map(function (p) { return p.id; }), best = null, bestBad = 1e9, t;
    for (t = 0; t < 8; t++) {
      var order = shuffle(st, alive.slice()), bad = 0, k;
      for (k = 0; k + 1 < order.length; k += 2) if (playerOf(st, order[k]).lastOpp === order[k + 1]) bad++;
      if (bad < bestBad) { bestBad = bad; best = order; }
      if (!bad) break;
    }
    var out = [], i;
    for (i = 0; i + 1 < best.length; i += 2) {
      var a = best[i], b = best[i + 1];
      if (b === 0) { b = a; a = 0; }
      out.push({ a: a, b: b, ghost: false });
    }
    if (best.length % 2) {
      var solo = best[best.length - 1], others = best.filter(function (x) { return x !== solo; });
      var pickOne = others.filter(function (x) { return x !== playerOf(st, solo).lastOpp; });
      var from = pickOne.length ? pickOne : others;
      out.push({ a: solo, b: from[randInt(st, from.length)], ghost: true });
    }
    return out;
  }
  /* 내 이번 상대. 맞수는 이미 두었으니 판이 정해져 있다 */
  function enemyOf(st, id) {
    if (st.pve) return { who: null, pve: true, ghost: false, units: st.pve.units };
    for (var i = 0; i < st.matches.length; i++) {
      var m = st.matches[i];
      if (m.a === id) return { who: m.b, pve: false, ghost: m.ghost, units: boardUnits(playerOf(st, m.b)) };
      if (m.b === id && !m.ghost) return { who: m.a, pve: false, ghost: false, units: boardUnits(playerOf(st, m.a)) };
    }
    return null;
  }

  function units(p) {
    var out = [], i;
    for (i = 0; i < CELLS; i++) if (p.board[i]) out.push({ unit: p.board[i], zone: 'board', index: i });
    for (i = 0; i < BENCH; i++) if (p.bench[i]) out.push({ unit: p.bench[i], zone: 'bench', index: i });
    return out;
  }
  function find(p, id) {
    var all = units(p), i;
    for (i = 0; i < all.length; i++) if (all[i].unit.id === id) return all[i];
    return null;
  }
  function onBoard(p) { return p.board.filter(Boolean).length; }

  /* 같은 이름·같은 별 셋이면 하나로 합친다. 판 위에 있는 것이 남고, 3성까지 이어진다 */
  function merge(p) {
    var again = true, merged = [];
    while (again) {
      again = false;
      var all = units(p), groups = {}, k, i, key;
      for (i = 0; i < all.length; i++) {
        key = all[i].unit.name + '#' + all[i].unit.star;
        (groups[key] = groups[key] || []).push(all[i]);
      }
      for (k in groups) {
        if (groups[k].length < 3 || groups[k][0].unit.star >= 3) continue;
        var keep = groups[k][0], j;
        for (j = 1; j < 3; j++) {
          var g = groups[k][j];
          (g.zone === 'board' ? p.board : p.bench)[g.index] = null;
        }
        keep.unit.star += 1;
        merged.push({ name: keep.unit.name, star: keep.unit.star });
        again = true;
        break;
      }
    }
    return merged;
  }

  /* p 를 안 주면 나(state) */
  function buy(st, data, slot, p) {
    p = p || st;
    var name = p.shop[slot], card = name && cardOf(data, name), i;
    if (!card || st.phase !== 'plan' || !p.alive) return { ok: false, why: 'slot' };
    if (p.gold < card.cost) return { ok: false, why: 'gold' };
    for (i = 0; i < BENCH && p.bench[i]; i++);
    if (i === BENCH) {
      /* 벤치가 찼어도 같은 이름 1성이 둘 있으면 산 것이 바로 합쳐진다 — 자리가 필요 없다 */
      var same = units(p).filter(function (u) { return u.unit.name === name && u.unit.star === 1; });
      if (same.length < 2) return { ok: false, why: 'bench' };
      var gone = same[same.length - 1];
      (gone.zone === 'board' ? p.board : p.bench)[gone.index] = null;
      same[0].unit.star = 2;
      p.gold -= card.cost;
      p.shop[slot] = null;
      return { ok: true, merged: [{ name: name, star: 2 }].concat(merge(p)) };
    }
    p.gold -= card.cost;
    p.bench[i] = { id: st.nextId++, name: name, star: 1 };
    p.shop[slot] = null;
    return { ok: true, merged: merge(p) };
  }
  function sell(st, data, id, p) {
    p = p || st;
    var at = find(p, id);
    if (!at || st.phase !== 'plan') return { ok: false, why: 'unit' };
    p.gold += value(cardOf(data, at.unit.name), at.unit.star);
    give(st, at.unit.name, copies(at.unit.star));
    (at.zone === 'board' ? p.board : p.bench)[at.index] = null;
    return { ok: true };
  }
  function reroll(st, data, p) {
    p = p || st;
    if (st.phase !== 'plan') return { ok: false, why: 'phase' };
    if (p.gold < REROLL) return { ok: false, why: 'gold' };
    p.gold -= REROLL;
    roll(st, data, p);
    return { ok: true };
  }
  /* 경험치 사기 — 4금에 4 */
  function buyXp(st, data, p) {
    p = p || st;
    if (st.phase !== 'plan') return { ok: false, why: 'phase' };
    if (p.level >= MAX_LEVEL) return { ok: false, why: 'maxlevel' };
    if (p.gold < XP_COST) return { ok: false, why: 'gold' };
    p.gold -= XP_COST;
    addXp(p, XP_GAIN);
    if (p === st) st.xpBought = true;
    return { ok: true };
  }
  /* 자리 옮기기. 찬 자리면 맞바꾼다. 판 위 수는 레벨까지 */
  function move(st, id, zone, index, p) {
    p = p || st;
    var at = find(p, id);
    if (!at || st.phase !== 'plan') return { ok: false, why: 'unit' };
    var to = zone === 'board' ? p.board : p.bench, from = at.zone === 'board' ? p.board : p.bench;
    if (index < 0 || index >= to.length) return { ok: false, why: 'index' };
    var other = to[index];
    if (zone === 'board' && at.zone !== 'board' && !other && onBoard(p) >= cap(p)) return { ok: false, why: 'cap' };
    to[index] = at.unit;
    from[at.index] = other || null;
    if (to === from && index === at.index) from[at.index] = at.unit;
    return { ok: true };
  }

  /* ── 수호자 판 — 수호자 라운드에 모두가 상대하는 판. 예산으로 짜고 한 신화권으로 쏠린다.
     처음 셋은 약하게(체력·공격 ×0.6) — 첫 무기를 시험하는 자리다 ── */
  function budget(round) { return Math.round(2 + Math.min(round, 8) * 3.2 + Math.max(0, round - 8) * 2.0); }
  var MELEE_CELLS = [1, 2, 0, 3, 5, 6, 4, 7, 9, 10, 8, 11];
  var REACH_CELLS = [5, 6, 4, 7, 1, 2, 0, 3, 9, 10, 8, 11];
  var RANGED_CELLS = [9, 10, 8, 11, 5, 6, 4, 7, 1, 2, 0, 3];
  function cellsFor(range) { return range === 'ranged' ? RANGED_CELLS : range === 'reach' ? REACH_CELLS : MELEE_CELLS; }
  function makePve(st, data) {
    var round = st.round, early = round <= 3;
    var n = early ? Math.min(3, round) : Math.min(MAX_LEVEL, 3 + Math.floor(round / 4));
    var maxCost = early ? 1 : Math.min(5, 1 + Math.floor(round / 4));
    var minCost = Math.max(1, maxCost - 1);
    var myths = liveMyths(st, data) || mythKeys(data), myth = myths[randInt(st, myths.length)];
    var pool = inPlay(st, data).filter(function (c) { return c.cost >= minCost && c.cost <= maxCost; });
    var mine = pool.filter(function (c) { return c.myth === myth; });
    var picked = [], c, tries = 0, left = budget(round), i;
    while (picked.length < n && tries++ < 200) {
      var from = rand(st) < 0.7 && mine.length ? mine : pool;
      c = from[randInt(st, from.length)];
      if (picked.some(function (p) { return p.name === c.name; })) continue;
      if (c.cost > left && picked.length >= 2) continue;
      picked.push({ name: c.name, star: 1, range: c.range, cost: c.cost });
      left -= c.cost;
    }
    var byCost = picked.slice().sort(function (a, b) { return a.cost - b.cost; });
    for (tries = 0; tries < 3 && !early; tries++) {
      for (i = 0; i < byCost.length; i++) {
        var up = byCost[i], price = up.star === 1 ? up.cost * 3 : up.cost * 6;
        if (up.star < 3 && price <= left && rand(st) < 0.7) { up.star += 1; left -= price; }
      }
    }
    var out = [], used = {};
    picked.forEach(function (p) {
      var list = cellsFor(p.range);
      for (var k = 0; k < list.length; k++) {
        if (used[list[k]]) continue;
        used[list[k]] = 1;
        var u = { name: p.name, star: p.star, row: Math.floor(list[k] / COLS), col: list[k] % COLS };
        if (early) u.mult = 0.6;
        out.push(u);
        return;
      }
    });
    return { myth: myth, units: out, budget: budget(round) };
  }

  /* ── 시너지 — 같은 축의 카드를 이름으로 센다. 별은 안 본다 ── */
  function synergies(data, list) {
    var out = { myth: {}, kind: {} }, axis, key, names, i, card;
    for (axis in out) {
      names = {};
      for (i = 0; i < list.length; i++) {
        card = cardOf(data, list[i].name);
        if (!card) continue;
        names[card[axis]] = names[card[axis]] || {};
        names[card[axis]][card.name] = 1;
      }
      for (key in data.synergy[axis]) {
        var def = data.synergy[axis][key], count = Object.keys(names[key] || {}).length;
        var tier = count >= def.at[1] ? 2 : count >= def.at[0] ? 1 : 0;
        out[axis][key] = { count: count, tier: tier, value: tier ? def.value[tier - 1] : 0,
                           effect: def.effect, scope: def.scope, next: tier < 2 ? def.at[tier] : null };
      }
    }
    return out;
  }

  /* ── 싸움 ── */
  function fighter(data, u, side, row, col, id) {
    var c = cardOf(data, u.name), m = (STAR_MULT[u.star] || 1) * (u.mult || 1);
    return { id: id, name: u.name, side: side, star: u.star, row: row, col: col,
             hp: Math.round(c.hp * m), maxHp: Math.round(c.hp * m), atk: Math.round(c.atk * m), spd: c.spd,
             range: c.range, skill: c.skill, myth: c.myth, kind: c.kind,
             mana: 0, shield: 0, next: 0, stunUntil: 0, hasteUntil: 0, buff: [], dot: null, firstHit: true,
             curse: c.curse || { at: 0, atk: 0, skill: 0, bleed: 0 }, cursed: false,
             bonus: { atk: 0, spd: 0, manaRate: 0, skillPower: 0, splash: 0, stunChance: 0, firstcrit: 0, revive: 0, frenzy: 0, guard: 0, critChance: 0, regen: 0, thorns: 0, leech: 0, avenge: 0, cover: 0 },
             alive: true, dealt: 0 };
  }
  function bless(ents, syn) {
    var axis, key, s, i, e;
    for (axis in syn) for (key in syn[axis]) {
      s = syn[axis][key];
      if (!s.tier) continue;
      for (i = 0; i < ents.length; i++) {
        e = ents[i];
        if (s.scope === 'self' && e[axis] !== key) continue;
        if (s.effect === 'shield') e.shield += Math.round(e.maxHp * s.value);
        else e.bonus[s.effect] = Math.max(e.bonus[s.effect], s.value);
      }
    }
  }
  function alive(ents, side) { return ents.filter(function (e) { return e.alive && e.side === side; }); }
  /* 가장 앞줄 — 앞줄이 다 쓰러지면 가운데, 그다음 뒷줄 */
  function frontLine(foes) {
    var top = Infinity, i;
    for (i = 0; i < foes.length; i++) if (foes[i].row < top) top = foes[i].row;
    return foes.filter(function (e) { return e.row === top; });
  }
  function nearest(ent, list) {
    return list.slice().sort(function (a, b) {
      return Math.abs(a.col - ent.col) - Math.abs(b.col - ent.col) || a.hp - b.hp || a.id - b.id;
    })[0] || null;
  }
  function weakest(list) {
    return list.slice().sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp || a.hp - b.hp || a.id - b.id; })[0] || null;
  }
  /* 같은 칸 바로 뒤 — 뒤로 가장 가까운 산 것 */
  function behind(ents, target) {
    var best = null;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.alive && e.side === target.side && e.col === target.col && e.row > target.row && (!best || e.row < best.row)) best = e;
    }
    return best;
  }
  function pickTarget(ent, foes) {
    if (ent.range === 'ranged') return weakest(foes);
    return nearest(ent, frontLine(foes));
  }
  function atkOf(e, t) {
    var b = e.cursed ? e.curse.atk : 0;
    for (var i = 0; i < e.buff.length; i++) if (e.buff[i].until > t) b += e.buff[i].pct;
    /* 투혼(켈트) — 잃은 체력만큼 공격이 오른다. 피가 0 에 가까우면 +frenzy 를 다 받는다 */
    if (e.bonus.frenzy) b += e.bonus.frenzy * (1 - e.hp / e.maxHp);
    return e.atk * (1 + e.bonus.atk + b);
  }
  function skillPower(e) { return 1 + e.bonus.skillPower + (e.cursed ? e.curse.skill : 0); }
  /* 저주 발현 — 체력이 문턱 아래로 떨어지면 한 판에 한 번. 되살아나도 풀리지 않는다 */
  function checkCurse(sim, e, t) {
    if (e.cursed || !e.alive || !e.curse.at || e.hp / e.maxHp >= e.curse.at) return;
    e.cursed = true;
    sim.log.push({ t: +t.toFixed(1), k: 'curse', b: e.id });
  }
  function interval(e, t) {
    return e.spd * (1 - e.bonus.spd) * (e.hasteUntil > t ? 0.7 : 1);
  }
  function gainMana(e, n) { e.mana = Math.min(MANA_MAX, e.mana + n * (1 + e.bonus.manaRate)); }

  var LEECH_FROM = { hit: 1, crit: 1, splash: 1, skillhit: 1 };
  /* 방진의 벽(방어구) — 옆·앞뒤 한 칸 안의 방어구가 적에게 받은 피해의 일부를 대신 맞는다.
     방어구끼리는 나누지 않고, 가장 피가 많은 방어구 하나가 맡는다 */
  function coverer(sim, tgt) {
    var best = null, i, e;
    if (tgt.bonus.cover) return null;
    for (i = 0; i < sim.ents.length; i++) {
      e = sim.ents[i];
      if (!e.alive || e === tgt || e.side !== tgt.side || !e.bonus.cover) continue;
      if (Math.abs(e.row - tgt.row) > 1 || Math.abs(e.col - tgt.col) > 1) continue;
      if (!best || e.hp > best.hp || (e.hp === best.hp && e.id < best.id)) best = e;
    }
    return best;
  }
  function hurt(sim, src, tgt, amount, t, why) {
    if (!tgt.alive) return 0;
    if (src && src.side !== tgt.side && LEECH_FROM[why || 'hit']) {
      var cv = coverer(sim, tgt);
      if (cv) { var share = amount * cv.bonus.cover; amount -= share; hurt(sim, src, cv, share, t, 'cover'); }
    }
    /* 호국(한국) — 받는 피해가 준다. 자해·도트도 같이 */
    if (tgt.bonus.guard) amount *= 1 - tgt.bonus.guard;
    amount = Math.round(amount);
    var absorbed = Math.min(tgt.shield, amount);
    tgt.shield -= absorbed;
    var real = amount - absorbed;
    tgt.hp -= real;
    if (src) src.dealt += real;
    gainMana(tgt, MANA_HIT);
    sim.log.push({ t: +t.toFixed(1), k: why || 'hit', a: src ? src.id : null, b: tgt.id, d: amount, s: absorbed });
    if (tgt.hp <= 0) {
      if (tgt.bonus.revive) {
        tgt.hp = Math.round(tgt.maxHp * tgt.bonus.revive);
        tgt.bonus.revive = 0; tgt.stunUntil = 0; tgt.dot = null;
        sim.log.push({ t: +t.toFixed(1), k: 'revive', b: tgt.id, hp: tgt.hp });
      } else {
        tgt.hp = 0; tgt.alive = false;
        sim.log.push({ t: +t.toFixed(1), k: 'die', b: tgt.id });
        /* 롱스보의 맹세(기사 전설) — 아군이 쓰러질 때마다 남은 기사의 공격이 오른다. 판 끝까지, 겹친다 */
        for (var ai = 0; ai < sim.ents.length; ai++) {
          var av = sim.ents[ai];
          if (av.alive && av.side === tgt.side && av.bonus.avenge) { av.buff.push({ pct: av.bonus.avenge, until: Infinity }); sim.log.push({ t: +t.toFixed(1), k: 'avenge', b: av.id }); }
        }
      }
    }
    checkCurse(sim, tgt, t);
    /* 비취의 숨(아메리카) — 준 피해의 일부만큼 되찾는다. 평타·기술만, 저주 중엔 없다 */
    if (src && src.alive && src.bonus.leech && real > 0 && !src.cursed && LEECH_FROM[why || 'hit'] && src.hp < src.maxHp) {
      var lh = Math.min(src.maxHp - src.hp, Math.round(real * src.bonus.leech));
      if (lh > 0) { src.hp += lh; sim.log.push({ t: +t.toFixed(1), k: 'leech', b: src.id, d: lh }); }
    }
    /* 눈에는 눈(서아시아) — 맞은 피해의 일부를 때린 쪽에 되돌린다. 되돌린 피해는 다시 되돌아가지 않는다 */
    if (src && src.alive && tgt.bonus.thorns && real > 0 && why !== 'thorns') hurt(sim, tgt, src, real * tgt.bonus.thorns, t, 'thorns');
    return real;
  }
  function stun(sim, tgt, until, t) {
    if (!tgt.alive) return;
    if (until > tgt.stunUntil) { tgt.stunUntil = until; sim.log.push({ t: +t.toFixed(1), k: 'stun', b: tgt.id, u: +until.toFixed(1) }); }
  }

  function attack(sim, e, t) {
    var foes = alive(sim.ents, e.side === 'me' ? 'them' : 'me'), tgt = pickTarget(e, foes);
    if (!tgt) return;
    var dmg = atkOf(e, t), crit = false;
    if (e.firstHit && e.bonus.firstcrit) { dmg *= e.bonus.firstcrit; crit = true; }
    /* 일섬(일본) — 평타가 가끔 두 배로 */
    else if (e.bonus.critChance && rand(sim.st) < e.bonus.critChance) { dmg *= 2; crit = true; }
    e.firstHit = false;
    hurt(sim, e, tgt, dmg, t, crit ? 'crit' : 'hit');
    if (e.range === 'reach') {
      var b = behind(sim.ents, tgt);
      if (b) hurt(sim, e, b, dmg * Math.max(REACH_SPLASH, e.bonus.splash), t, 'splash');
    }
    if (e.bonus.stunChance && rand(sim.st) < e.bonus.stunChance) stun(sim, tgt, t + BLUNT_STUN, t);
    gainMana(e, MANA_ATTACK);
  }

  function cast(sim, e, t) {
    var sk = sim.data.skills[e.skill], foes = alive(sim.ents, e.side === 'me' ? 'them' : 'me');
    var mates = alive(sim.ents, e.side), power = skillPower(e), base = atkOf(e, t);
    var mult = (sk.mult || 0) * power, i, tgt, list;
    sim.log.push({ t: +t.toFixed(1), k: 'skill', a: e.id, skill: e.skill });
    e.mana = 0;
    if (sk.cleanse) { e.stunUntil = 0; e.dot = null; }
    switch (sk.effect) {
      case 'strike':
      case 'execute':
      case 'drain':
        tgt = pickTarget(e, foes);
        if (!tgt) return;
        for (i = 0; i < (sk.hits || 1); i++) {
          var d = base * mult;
          if (sk.crit) d *= CRIT;
          if (sk.effect === 'execute' && tgt.hp / tgt.maxHp < sk.threshold) d *= 2;
          var real = hurt(sim, e, tgt, d, t, 'skillhit');
          if (sk.effect === 'drain' && !e.cursed) { e.hp = Math.min(e.maxHp, e.hp + Math.round(real * sk.ratio)); sim.log.push({ t: +t.toFixed(1), k: 'heal', b: e.id, d: Math.round(real * sk.ratio) }); }
          if (!tgt.alive) break;
        }
        if (sk.dot && tgt.alive) tgt.dot = { per: Math.round(base * sk.dot * power), until: t + sk.dur, from: e.id };
        if (sk.selfHurt) hurt(sim, null, e, e.maxHp * sk.selfHurt, t, 'selfhurt');
        return;
      case 'sweep':
      case 'stun':
        list = (sk.targets || 1) > 1 ? ((sk.targets >= ALL_TARGETS) ? foes : frontLine(foes)) : [pickTarget(e, foes)].filter(Boolean);
        list = list.slice().sort(function (a, b) { return Math.abs(a.col - e.col) - Math.abs(b.col - e.col) || a.id - b.id; }).slice(0, sk.targets || 1);
        for (i = 0; i < list.length; i++) {
          hurt(sim, e, list[i], base * mult, t, 'skillhit');
          if (sk.effect === 'stun') stun(sim, list[i], t + sk.dur, t);
        }
        return;
      case 'volley':
        list = foes.slice();
        for (i = 0; i < (sk.targets || 1) && list.length; i++) {
          tgt = list.splice(randInt(sim.st, list.length), 1)[0];
          hurt(sim, e, tgt, base * mult, t, 'skillhit');
        }
        return;
      case 'pierce':
        tgt = nearest(e, frontLine(foes));
        if (!tgt) return;
        hurt(sim, e, tgt, base * mult, t, 'skillhit');
        var bk = behind(sim.ents, tgt);
        if (bk) hurt(sim, e, bk, base * mult, t, 'skillhit');
        return;
      case 'heal':
        tgt = weakest(mates.filter(function (m) { return !m.cursed; }));
        if (!tgt) return;
        var h = Math.min(tgt.maxHp - tgt.hp, Math.round(base * mult));
        tgt.hp += h;
        sim.log.push({ t: +t.toFixed(1), k: 'heal', a: e.id, b: tgt.id, d: h });
        return;
      case 'shield':
        tgt = sk.self ? (e.cursed ? null : e) : weakest(mates.filter(function (m) { return !m.cursed; }));
        if (!tgt) return;
        tgt.shield += Math.round(base * mult);
        sim.log.push({ t: +t.toFixed(1), k: 'shield', a: e.id, b: tgt.id, d: Math.round(base * mult) });
        return;
      /* 둘레 방패 — 자신과 옆·앞뒤 한 칸 안의 동료 모두. 저주받은 동료는 못 받는다 */
      case 'bulwark':
        for (i = 0; i < mates.length; i++) {
          tgt = mates[i];
          if (tgt.cursed || Math.abs(tgt.row - e.row) > 1 || Math.abs(tgt.col - e.col) > 1) continue;
          tgt.shield += Math.round(base * mult);
          sim.log.push({ t: +t.toFixed(1), k: 'shield', a: e.id, b: tgt.id, d: Math.round(base * mult) });
        }
        return;
      case 'buff':
        e.buff.push({ pct: sk.pct * power, until: t + sk.dur });
        return;
      case 'rally':
        for (i = 0; i < mates.length; i++) mates[i].buff.push({ pct: sk.pct * power, until: t + sk.dur });
        return;
      case 'haste':
        e.hasteUntil = t + sk.dur * power;
        return;
    }
  }

  /* 한 판. mine·theirs 는 [{name, star, row, col}]. 판을 돌린 뒤 이긴 쪽과 기록을 준다 */
  function simulate(data, st, mine, theirs) {
    var ents = [], i, id = 1;
    for (i = 0; i < mine.length; i++) ents.push(fighter(data, mine[i], 'me', mine[i].row, mine[i].col, id++));
    for (i = 0; i < theirs.length; i++) ents.push(fighter(data, theirs[i], 'them', theirs[i].row, theirs[i].col, id++));
    bless(ents.filter(function (e) { return e.side === 'me'; }), synergies(data, mine));
    bless(ents.filter(function (e) { return e.side === 'them'; }), synergies(data, theirs));
    for (i = 0; i < ents.length; i++) ents[i].sh0 = ents[i].shield;
    /* 첫 공격은 간격의 절반 뒤. 같은 박자면 빠른 쪽이 먼저 */
    for (i = 0; i < ents.length; i++) ents[i].next = interval(ents[i], 0) * 0.5;
    var sim = { data: data, st: st, ents: ents, log: [] }, t = 0, beat = 0, winner = null;
    sim.log.push({ t: 0, k: 'start', me: mine.length, them: theirs.length });
    while (t < MAX_BEATS) {
      t = +(t + TICK).toFixed(1);
      if (Math.floor(t) > beat) {
        beat = Math.floor(t);
        for (i = 0; i < ents.length; i++) {
          var e = ents[i];
          if (e.alive && e.dot && e.dot.until >= t) hurt(sim, null, e, e.dot.per, t, 'dot');
          if (e.alive && e.cursed && e.curse.bleed) hurt(sim, null, e, e.maxHp * e.curse.bleed, t, 'bleed');
          /* 영생(이집트) — 박자마다 최대 체력의 일부를 되찾는다. 저주 중엔 치유를 못 받으니 없다 */
          if (e.alive && e.bonus.regen && !e.cursed && e.hp < e.maxHp) { var rg = Math.min(e.maxHp - e.hp, Math.round(e.maxHp * e.bonus.regen)); e.hp += rg; sim.log.push({ t: +t.toFixed(1), k: 'regen', b: e.id, d: rg }); }
        }
      }
      var order = ents.filter(function (e) { return e.alive && e.next <= t; })
        .sort(function (a, b) { return a.next - b.next || a.id - b.id; });
      for (i = 0; i < order.length; i++) {
        var u = order[i];
        if (!u.alive) continue;
        if (u.stunUntil > t) { u.next = u.stunUntil; continue; }
        if (u.mana >= MANA_MAX) cast(sim, u, t); else attack(sim, u, t);
        u.next = +(t + interval(u, t)).toFixed(1);
      }
      if (!alive(ents, 'them').length) { winner = 'me'; break; }
      if (!alive(ents, 'me').length) { winner = 'them'; break; }
    }
    if (!winner) winner = 'draw';
    sim.log.push({ t: t, k: 'end', winner: winner });
    return { winner: winner, beats: t, log: sim.log,
             left: { me: alive(ents, 'me').length, them: alive(ents, 'them').length },
             ents: ents.map(function (e) { return { id: e.id, name: e.name, side: e.side, star: e.star, row: e.row, col: e.col,
               hp: e.hp, maxHp: e.maxHp, sh0: e.sh0 || 0, alive: e.alive, dealt: e.dealt, cursed: e.cursed }; }) };
  }

  /* ── 다시 보기 — 싸움 기록을 t 까지 접어 그 순간의 판을 만든다. 화면의 재생과 검사가 같이 쓴다.
     체력은 기록의 피해(d − 막은 s)·회복으로 따라가고, 쓰러짐·되살아남·저주·멈춤은 그 줄에서 바뀐다.
     fx 는 방금(win 안) 일어난 일 — 맞음·침·기술·저주·되살아남, 떠오를 숫자 ── */
  var HURT_KINDS = { hit: 1, crit: 1, splash: 1, skillhit: 1, dot: 1, bleed: 1, selfhurt: 1, thorns: 1, cover: 1 };
  function replayAt(result, t, win) {
    var out = {}, i, e, x, k;
    win = win == null ? 0.45 : win;
    for (i = 0; i < result.ents.length; i++) {
      e = result.ents[i];
      out[e.id] = { id: e.id, side: e.side, row: e.row, col: e.col, name: e.name, star: e.star, maxHp: e.maxHp,
        hp: e.maxHp, shield: e.sh0 || 0, alive: true, cursed: false, stunUntil: 0, fx: [] };
    }
    for (i = 0; i < result.log.length; i++) {
      x = result.log[i];
      if (x.t > t) break;
      var tgt = out[x.b], src = out[x.a], age = +(t - x.t).toFixed(2), fresh = age <= win;
      k = x.k;
      if (HURT_KINDS[k] && tgt) {
        var s = x.s || 0;
        tgt.shield = Math.max(0, tgt.shield - s);
        tgt.hp = Math.max(0, tgt.hp - (x.d - s));
        if (fresh) { tgt.fx.push({ i: i, age: age, k: k === 'crit' ? 'crit' : k === 'bleed' || k === 'dot' ? 'tick' : 'hurt', n: -(x.d - s), s: s });
          if (src && k !== 'thorns') src.fx.push({ i: i, age: age, k: 'act' }); }
      } else if ((k === 'heal' || k === 'regen' || k === 'leech') && tgt) {
        tgt.hp = Math.min(tgt.maxHp, tgt.hp + x.d);
        if (fresh && x.d) tgt.fx.push({ i: i, age: age, k: 'heal', n: x.d });
      } else if (k === 'shield' && tgt) {
        tgt.shield += x.d;
        if (fresh) tgt.fx.push({ i: i, age: age, k: 'shield', n: x.d });
      } else if (k === 'revive' && tgt) {
        tgt.hp = x.hp; tgt.alive = true; tgt.stunUntil = 0;
        if (fresh) tgt.fx.push({ i: i, age: age, k: 'revive' });
      } else if (k === 'die' && tgt) {
        tgt.hp = 0; tgt.alive = false;
      } else if (k === 'curse' && tgt) {
        tgt.cursed = true;
        if (fresh) tgt.fx.push({ i: i, age: age, k: 'curse' });
      } else if (k === 'stun' && tgt) {
        tgt.stunUntil = x.u;
      } else if (k === 'skill' && src) {
        if (t - x.t <= win * 1.5) src.fx.push({ i: i, age: +(t - x.t).toFixed(2), k: 'cast', skill: x.skill });
      }
    }
    for (k in out) out[k].stunned = out[k].alive && out[k].stunUntil > t;
    return out;
  }

  function boardUnits(p) {
    var out = [], i;
    for (i = 0; i < CELLS; i++) if (p.board[i]) out.push({ name: p.board[i].name, star: p.board[i].star, row: Math.floor(i / COLS), col: i % COLS, id: p.board[i].id });
    return out;
  }
  function streakAfter(streak, winner) {
    if (winner === 'me') return streak > 0 ? streak + 1 : 1;
    if (winner === 'them') return streak < 0 ? streak - 1 : -1;
    return 0;
  }
  function flip(w) { return w === 'me' ? 'them' : w === 'them' ? 'me' : w; }
  /* 떨어진 이의 무기는 더미로 돌아간다 */
  function retire(st, p) {
    /* 나는 판을 남겨 둔다 — 마지막 싸움을 다시 보려고. 판이 끝났으니 더미는 더 안 쓴다 */
    if (p === st) { p.alive = false; return; }
    units(p).forEach(function (u) { give(st, u.unit.name, copies(u.unit.star)); });
    p.shop.forEach(function (n) { give(st, n, 1); });
    p.board = p.board.map(function () { return null; }); p.bench = p.bench.map(function () { return null; }); p.shop = [];
    p.alive = false;
  }
  /* 라운드를 싸운다. 모든 짝이 한꺼번에 싸우고, 진 쪽은 라운드 기본 + 살아남은 상대 수만큼 깎인다.
     수호자 라운드는 모두가 같은 수호자 판과 — 지면 1 + 남은 수, 이기면 금. 유령과 싸운 판은 한쪽만 깎인다 */
  function fight(st, data) {
    if (st.phase !== 'plan') return { ok: false, why: 'phase' };
    var round = st.round, others = [], mine = null, base = stageDamage(round), before = alivePlayers(st).length;
    if (st.pve) {
      alivePlayers(st).forEach(function (p) {
        var res = simulate(data, st, boardUnits(p), st.pve.units);
        var lost = res.winner === 'them' ? 1 + res.left.them : 0, gain = res.winner === 'me' ? pveReward(round) : 0;
        p.hp -= lost; p.gold += gain;
        if (p === st) mine = { res: res, lost: lost, gain: gain };
        else others.push({ a: p.id, b: null, pve: true, winner: res.winner, lostA: lost, lostB: 0, gain: gain });
      });
    } else {
      st.matches.forEach(function (m) {
        var A = playerOf(st, m.a), B = playerOf(st, m.b);
        var res = simulate(data, st, boardUnits(A), boardUnits(B));
        var lostA = res.winner === 'them' ? base + res.left.them : res.winner === 'draw' ? base : 0;
        var lostB = m.ghost ? 0 : res.winner === 'me' ? base + res.left.me : res.winner === 'draw' ? base : 0;
        A.hp -= lostA; A.streak = streakAfter(A.streak, res.winner); A.lastOpp = m.b;
        if (!m.ghost) { B.hp -= lostB; B.streak = streakAfter(B.streak, flip(res.winner)); B.lastOpp = m.a; }
        if (m.a === 0) mine = { res: res, lost: lostA, gain: 0 };
        else others.push({ a: m.a, b: m.b, ghost: m.ghost, winner: res.winner, lostA: lostA, lostB: lostB });
      });
    }
    /* 탈락 — 이번에 떨어진 이들끼리는 체력이 덜 모자란 쪽이 윗 순위 */
    var all = players(st), dying = all.filter(function (p) { return p.alive && p.hp <= 0; });
    var left = all.filter(function (p) { return p.alive && p.hp > 0; }).length;
    dying.sort(function (a, b) { return b.hp - a.hp || a.id - b.id; });
    dying.forEach(function (p, i) { p.place = left + 1 + i; p.hp = 0; retire(st, p); });
    var ended = left <= 1 || round >= MAX_ROUNDS;
    if (ended && left >= 1) {
      all.filter(function (p) { return p.alive; }).sort(function (a, b) { return b.hp - a.hp || a.id - b.id; })
        .forEach(function (p, i) { p.place = i + 1; });
    }
    var res = mine.res;
    st.result = { round: round, winner: res.winner, lost: mine.lost, gain: mine.gain, beats: res.beats, left: res.left, log: res.log, ents: res.ents,
                  pve: !!st.pve, opp: st.enemy ? st.enemy.who : null, ghost: !!(st.enemy && st.enemy.ghost), others: others,
                  before: before, alive: all.filter(function (p) { return p.alive; }).length, place: st.place || 0 };
    st.history.push({ round: round, winner: res.winner, lost: mine.lost, hp: st.hp, opp: st.result.opp, pve: st.result.pve });
    st.phase = !st.alive ? 'lost' : ended ? (st.place === 1 ? 'won' : 'lost') : 'result';
    return { ok: true, result: st.result };
  }
  function next(st, data) {
    if (st.phase !== 'result') return { ok: false, why: 'phase' };
    st.round += 1;
    startRound(st, data);
    return { ok: true };
  }

  /* ── 맡긴 손 — 맞수와 "대신 두기" 가 쓴다. 규칙이 아니라 버릇이다. 버릇(style)마다 레벨과 모을 금이 다르다:
     fast 는 레벨을 빨리, econ 은 이자를 모으다 늦게 한꺼번에, reroll 은 레벨 6 언저리에서 다시 돌려 3성을 쫓는다.
     사는 순서는 이미 가진 이름(합치려고) → 같은 축이 많은 것 → 즐겨 모으는 신화권 → 비싼 것 ── */
  var STYLE = {
    balanced: { lv: function (r) { return 2 + Math.floor(r / 3); }, keep: function (r) { return r < 6 ? 10 : r < 12 ? 30 : 20; }, rolls: 6 },
    fast:     { lv: function (r) { return r <= 4 ? 3 : 2 + Math.floor(r / 2.5); }, keep: function (r) { return r < 8 ? 10 : 20; }, rolls: 5 },
    econ:     { lv: function (r) { return 1 + Math.floor(r / 3); }, keep: function (r) { return r < 5 ? 10 : 50; }, rolls: 4 },
    reroll:   { lv: function (r) { return Math.min(r >= 20 ? 8 : 6, 2 + Math.floor(r / 3)); }, keep: function (r) { return r < 7 ? 20 : 10; }, rolls: 14 }
  };
  function autoPlan(st, data, p) {
    p = p || st;
    if (!p.alive || st.phase !== 'plan') return;
    var sty = STYLE[p.bot] || STYLE.balanced, round = st.round, desperate = p.hp <= 30;
    var keep = desperate ? 0 : sty.keep(round), target = Math.min(MAX_LEVEL, sty.lv(round) + (desperate ? 1 : 0));
    var guard;
    /* 레벨 — 목표까지, 모을 금은 남기고 */
    for (guard = 0; guard < 20 && p.level < target && p.gold - XP_COST >= Math.min(keep, 10); guard++) buyXp(st, data, p);
    var rerolls = 0;
    for (guard = 0; guard < 60; guard++) {
      var all = units(p), have = {}, same = {}, axisCount = { myth: {}, kind: {} }, i, c;
      for (i = 0; i < all.length; i++) {
        have[all[i].unit.name] = (have[all[i].unit.name] || 0) + 1;
        same[all[i].unit.name + '#' + all[i].unit.star] = (same[all[i].unit.name + '#' + all[i].unit.star] || 0) + 1;
        c = cardOf(data, all[i].unit.name);
        axisCount.myth[c.myth] = (axisCount.myth[c.myth] || 0) + 1;
        axisCount.kind[c.kind] = (axisCount.kind[c.kind] || 0) + 1;
      }
      /* 레벨이 오르면 싼 것은 3성이 못 될 바에야 판다 — 그 금으로 비싼 것을 산다 */
      if (p.level >= 6 && p.bot !== 'reroll') {
        var junk = null, jj;
        for (jj = 0; jj < BENCH; jj++) {
          var bj = p.bench[jj];
          if (bj && bj.star === 1 && cardOf(data, bj.name).cost <= 2 && same[bj.name + '#1'] < 2) { junk = bj; break; }
        }
        if (junk) { sell(st, data, junk.id, p); continue; }
      }
      var free = p.bench.filter(function (x) { return !x; }).length;
      if (!free) {
        var cheap = null, cv = 1e9, j;
        for (j = 0; j < BENCH; j++) {
          var b = p.bench[j], bv = value(cardOf(data, b.name), b.star) + (same[b.name + '#' + b.star] >= 2 ? 100 : 0);
          if (bv < cv) { cv = bv; cheap = b; }
        }
        if (cheap && cv < 100) { sell(st, data, cheap.id, p); continue; }
        break;
      }
      var best = -1, score = -1, late = p.level >= 6;
      for (i = 0; i < SHOP; i++) {
        c = p.shop[i] && cardOf(data, p.shop[i]);
        if (!c || c.cost > p.gold) continue;
        var s = (have[c.name] ? 10 * have[c.name] : 0) + (axisCount.myth[c.myth] || 0) + (axisCount.kind[c.kind] || 0)
          + (c.myth === p.fav ? 3 : 0) + c.cost * (late ? 2 : 0.8);
        if (p.bot === 'reroll' && have[c.name] && c.cost <= 2) s += 10;
        if (p.level >= 5 && c.cost === 1 && !have[c.name]) s -= 5;
        if (late && c.cost <= 2 && !have[c.name]) s -= 5;
        /* 금이 모을 선 아래로 가면 합칠 것만 산다 */
        if (all.length >= p.level + 2 && p.gold - c.cost < keep && !have[c.name]) s -= 30;
        if (s > score) { score = s; best = i; }
      }
      if (best >= 0 && score >= 0) { buy(st, data, best, p); continue; }
      if (p.gold - REROLL >= keep && rerolls < sty.rolls + (desperate ? 6 : 0)) { reroll(st, data, p); rerolls++; continue; }
      break;
    }
    /* 판 채우기: 레벨보다 적으면 벤치에서 센 것부터 — 근접 앞줄, 중거리 가운데, 원거리 뒷줄 */
    for (guard = 0; guard < BENCH && onBoard(p) < cap(p); guard++) {
      var pick = null, pv = -1, k;
      for (k = 0; k < BENCH; k++) {
        var u = p.bench[k];
        if (!u) continue;
        var v = value(cardOf(data, u.name), u.star);
        if (v > pv) { pv = v; pick = u; }
      }
      if (!pick) break;
      var cell = -1, order = cellsFor(cardOf(data, pick.name).range);
      for (k = 0; k < order.length; k++) if (!p.board[order[k]]) { cell = order[k]; break; }
      if (cell < 0) break;
      move(st, pick.id, 'board', cell, p);
    }
    /* 판이 찼는데 벤치에 더 센 것이 있으면 바꾼다 */
    for (guard = 0; guard < 9; guard++) {
      var weak = null, wv = 1e9, strong = null, sv = -1, m;
      for (m = 0; m < CELLS; m++) if (p.board[m]) { var w1 = value(cardOf(data, p.board[m].name), p.board[m].star); if (w1 < wv) { wv = w1; weak = p.board[m]; } }
      for (m = 0; m < BENCH; m++) if (p.bench[m]) { var s1 = value(cardOf(data, p.bench[m].name), p.bench[m].star); if (s1 > sv) { sv = s1; strong = p.bench[m]; } }
      if (!weak || !strong || sv <= wv) break;
      move(st, strong.id, 'board', find(p, weak.id).index, p);
    }
  }

  var api = {
    VERSION: VERSION, ROWS: ROWS, COLS: COLS, CELLS: CELLS, BENCH: BENCH, SHOP: SHOP, REROLL: REROLL, XP_COST: XP_COST, XP_GAIN: XP_GAIN,
    MAX_HP: MAX_HP, PLAYERS: PLAYERS, MAX_LEVEL: MAX_LEVEL, MAX_ROUNDS: MAX_ROUNDS, POOL_SIZE: POOL_SIZE, BOTS: BOTS,
    STAR_MULT: STAR_MULT, MANA_MAX: MANA_MAX, MAX_BEATS: MAX_BEATS,
    MYTHS_PER_GAME: MYTHS_PER_GAME, inPlay: inPlay, liveMyths: liveMyths, setMyths: setMyths,
    newGame: newGame, buy: buy, sell: sell, reroll: reroll, buyXp: buyXp, move: move, fight: fight, next: next,
    replayAt: replayAt, players: players, playerOf: playerOf, alivePlayers: alivePlayers,
    cap: cap, income: income, streakGold: streakGold, stageDamage: stageDamage, isPve: isPve, pveReward: pveReward, xpNeed: xpNeed,
    value: value, odds: odds, units: units, find: find, onBoard: onBoard, boardUnits: boardUnits, cellsFor: cellsFor,
    synergies: synergies, simulate: simulate, makePve: makePve, budget: budget, autoPlan: autoPlan, cardOf: cardOf, rand: rand
  };
  root.AtelierAuto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
