/* 오토 배틀러 엔진 — 놀이 규칙은 여기에만 있다. 화면(auto.html)은 굴리고 보여 주기만 한다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierAuto 하나만 붙이고, node 에서는 module.exports.

   상태(state)는 통째로 JSON 이다. 난수도 state.rngState 한 정수라서 같은 seed 로 같은 손을
   두면 같은 판이 난다 — 검사(tests/auto-sim.cjs)가 그걸 믿고 수천 판을 굴린다.

   판: 앞줄·뒷줄 두 줄 × 세 칸. 근접은 상대 앞줄(비었으면 뒷줄)만 친다. 중거리는 앞줄을 찌르되
   같은 칸 뒤까지 일부 닿는다. 원거리는 아무나, 체력이 가장 낮은 쪽을 노린다.
   그래서 앞줄에 단단한 것을, 뒷줄에 무른 것을 두게 된다.

   세 상태: 기본 → 각성(3성) → 저주. 저주는 카드의 curse 대로, 체력이 문턱 아래로 떨어지면 한 판에 한 번 발현되어
   공격·기술이 세지는 대신 박자마다 피를 잃고 치유·보호막을 못 받는다. 되살아나도(발할라) 풀리지 않는다 — 대가다.

   자료는 부르는 쪽이 넘긴다: data = {cards:[…], skills:{…}, synergy:{myth:{…}, kind:{…}}}. */
(function (root) {
  'use strict';

  var ROWS = 2, COLS = 3, CELLS = ROWS * COLS;
  var BENCH = 6, SHOP = 5, REROLL = 2, MAX_HP = 20, ROUNDS = 14, START_GOLD = 3;
  var STAR_MULT = [0, 1, 1.8, 3.24];
  var MANA_MAX = 100, MANA_ATTACK = 14, MANA_HIT = 7;
  var TICK = 0.1, MAX_BEATS = 45, REACH_SPLASH = 0.4, CRIT = 1.5, BLUNT_STUN = 0.6;
  /* 라운드별 상점 확률(값 1~5). 뒤로 갈수록 비싼 것이 나온다.
     열네 라운드 — 열 라운드로는 2금 위로는 3성이 안 났다(자동 플레이 500판에 0). 뒤 넉 라운드를
     붙이고 5금을 30%까지 올려 3·4금 3성이 가끔 나오고 5금은 2성이 정점이 되게 한다 */
  var ODDS = [
    [100, 0, 0, 0, 0], [100, 0, 0, 0, 0], [65, 30, 5, 0, 0], [55, 35, 10, 0, 0], [40, 35, 20, 5, 0],
    [30, 35, 25, 10, 0], [25, 30, 30, 12, 3], [20, 28, 30, 16, 6], [15, 25, 30, 20, 10], [12, 22, 30, 22, 14],
    [10, 18, 30, 24, 18], [8, 15, 28, 27, 22], [6, 12, 26, 30, 26], [5, 10, 24, 31, 30]
  ];

  /* ── 난수 (mulberry32) — 상태는 state.rngState 정수 하나 ── */
  function rand(st) {
    st.rngState = (st.rngState + 0x6D2B79F5) | 0;
    var t = st.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(st, n) { return Math.floor(rand(st) * n); }

  function cardOf(data, name) {
    if (!data._byName) {
      data._byName = {};
      for (var i = 0; i < data.cards.length; i++) data._byName[data.cards[i].name] = data.cards[i];
    }
    return data._byName[name];
  }

  /* ── 놀이 흐름 ── */
  function cap(round) { return Math.min(CELLS, 3 + Math.floor((round - 1) / 2)); }
  function income(gold) { return 5 + Math.min(3, Math.floor(gold / 10)); }
  function value(card, star) { return card.cost * (star === 1 ? 1 : star === 2 ? 3 : 9); }
  function odds(round) { return ODDS[Math.min(ODDS.length - 1, round - 1)]; }

  /* ── 판의 신화권 — 몇 권 중 둘만 그 판의 상점과 상대에 나온다. 권마다 열다섯이면 한 판에 서른 장 —
     카탈로그가 커져도 한 카드가 나오는 몫이 줄지 않고(3성이 닿는 거리로), 판마다 구성이 달라진다.
     75장에서 셋이면 마흔다섯 장이라 완주 53%, 둘이면 65%. 저장된 옛 판(myths 없음)은 전부를 쓴다 ── */
  var MYTHS_PER_GAME = 2;
  function mythKeys(data) { return Object.keys(data.synergy.myth); }
  /* 판의 신화권을 지금 자료의 열쇠로. 동아시아(east)는 2026-09-24 에 한국·중국·일본으로 나뉘었다 —
     그 전에 저장된 판은 셋을 다 받는다. 모르는 열쇠만 남으면 전부를 쓴다 */
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
  /* 첫 라운드, 아무것도 안 샀을 때만 바꾼다 — 상점과 상대를 다시 짠다(금은 그대로) */
  function setMyths(st, data, myths) {
    var ok = validMyths(data, myths);
    if (!ok) return { ok: false, why: 'myths' };
    if (st.phase !== 'plan' || st.round !== 1 || st.board.some(Boolean) || st.bench.some(Boolean)) return { ok: false, why: 'late' };
    st.myths = ok; st.shop = roll(st, data); st.enemy = makeEnemy(st, data);
    return { ok: true };
  }

  function roll(st, data) {
    var out = [], w = odds(st.round), i, r, cost, pool, j, cards = inPlay(st, data);
    for (i = 0; i < SHOP; i++) {
      r = rand(st) * 100; cost = 1;
      for (j = 0; j < 5; j++) { r -= w[j]; if (r < 0) { cost = j + 1; break; } }
      pool = cards.filter(function (c) { return c.cost === cost; });
      out.push(pool[randInt(st, pool.length)].name);
    }
    return out;
  }

  /* opt.myths: 판의 신화권 셋. 없으면 seed 로 뽑는다 */
  function newGame(data, seed, opt) {
    var st = { seed: seed | 0, rngState: seed | 0, round: 1, gold: START_GOLD, hp: MAX_HP,
               shop: [], bench: [], board: [], nextId: 1, phase: 'plan', result: null, history: [], enemy: null, myths: null };
    for (var i = 0; i < BENCH; i++) st.bench.push(null);
    for (i = 0; i < CELLS; i++) st.board.push(null);
    st.myths = validMyths(data, opt && opt.myths) || pickMyths(st, data);
    startRound(st, data);
    return st;
  }
  function startRound(st, data) {
    st.gold += income(st.gold);
    st.shop = roll(st, data);
    st.enemy = makeEnemy(st, data);
    st.phase = 'plan';
    st.result = null;
  }

  function units(st) {
    var out = [], i;
    for (i = 0; i < CELLS; i++) if (st.board[i]) out.push({ unit: st.board[i], zone: 'board', index: i });
    for (i = 0; i < BENCH; i++) if (st.bench[i]) out.push({ unit: st.bench[i], zone: 'bench', index: i });
    return out;
  }
  function find(st, id) {
    var all = units(st), i;
    for (i = 0; i < all.length; i++) if (all[i].unit.id === id) return all[i];
    return null;
  }
  function onBoard(st) { return st.board.filter(Boolean).length; }

  /* 같은 이름·같은 별 셋이면 하나로 합친다. 판 위에 있는 것이 남고, 3성까지 이어진다 */
  function merge(st) {
    var again = true, merged = [];
    while (again) {
      again = false;
      var all = units(st), groups = {}, k, i, key;
      for (i = 0; i < all.length; i++) {
        key = all[i].unit.name + '#' + all[i].unit.star;
        (groups[key] = groups[key] || []).push(all[i]);
      }
      for (k in groups) {
        if (groups[k].length < 3 || groups[k][0].unit.star >= 3) continue;
        var keep = groups[k][0], j;
        for (j = 1; j < 3; j++) {
          var g = groups[k][j];
          (g.zone === 'board' ? st.board : st.bench)[g.index] = null;
        }
        keep.unit.star += 1;
        merged.push({ name: keep.unit.name, star: keep.unit.star });
        again = true;
        break;
      }
    }
    return merged;
  }

  function buy(st, data, slot) {
    var name = st.shop[slot], card = name && cardOf(data, name), i;
    if (!card || st.phase !== 'plan') return { ok: false, why: 'slot' };
    if (st.gold < card.cost) return { ok: false, why: 'gold' };
    for (i = 0; i < BENCH && st.bench[i]; i++);
    if (i === BENCH) {
      /* 벤치가 찼어도 같은 이름 1성이 둘 있으면 산 것이 바로 합쳐진다 — 자리가 필요 없다.
         판 위 것이 남고, 벤치 것이 사라진다(벤치에 둘이면 뒤의 것) */
      var same = units(st).filter(function (u) { return u.unit.name === name && u.unit.star === 1; });
      if (same.length < 2) return { ok: false, why: 'bench' };
      var gone = same[same.length - 1];
      (gone.zone === 'board' ? st.board : st.bench)[gone.index] = null;
      same[0].unit.star = 2;
      st.gold -= card.cost;
      st.shop[slot] = null;
      return { ok: true, merged: [{ name: name, star: 2 }].concat(merge(st)) };
    }
    st.gold -= card.cost;
    st.bench[i] = { id: st.nextId++, name: name, star: 1 };
    st.shop[slot] = null;
    return { ok: true, merged: merge(st) };
  }
  function sell(st, data, id) {
    var at = find(st, id);
    if (!at || st.phase !== 'plan') return { ok: false, why: 'unit' };
    st.gold += value(cardOf(data, at.unit.name), at.unit.star);
    (at.zone === 'board' ? st.board : st.bench)[at.index] = null;
    return { ok: true };
  }
  function reroll(st, data) {
    if (st.phase !== 'plan') return { ok: false, why: 'phase' };
    if (st.gold < REROLL) return { ok: false, why: 'gold' };
    st.gold -= REROLL;
    st.shop = roll(st, data);
    return { ok: true };
  }
  /* 자리 옮기기. 찬 자리면 맞바꾼다. 판 위 수는 cap(round) 까지 */
  function move(st, id, zone, index) {
    var at = find(st, id);
    if (!at || st.phase !== 'plan') return { ok: false, why: 'unit' };
    var to = zone === 'board' ? st.board : st.bench, from = at.zone === 'board' ? st.board : st.bench;
    if (index < 0 || index >= to.length) return { ok: false, why: 'index' };
    var other = to[index];
    if (zone === 'board' && at.zone !== 'board' && !other && onBoard(st) >= cap(st.round)) return { ok: false, why: 'cap' };
    to[index] = at.unit;
    from[at.index] = other || null;
    if (to === from && index === at.index) from[at.index] = at.unit;
    return { ok: true };
  }

  /* ── 상대 만들기 — 예산으로 짠다. 예산은 사람이 그 라운드까지 받았을 금의 얼마쯤이라,
     사람이 금을 잘 쓰면 이기고 못 쓰면 진다. 한 신화권으로 쏠려 시너지가 켜진다 ── */
  /* 8라운드까지는 가파르게, 그 뒤는 완만하게 — 열네 라운드로 늘리며 뒤쪽을 눌렀다(완주 58%) */
  function budget(round) { return Math.round(2 + Math.min(round, 8) * 3.2 + Math.max(0, round - 8) * 2.0); }
  function makeEnemy(st, data) {
    var round = st.round, n = Math.min(CELLS, 2 + Math.floor(round / 2));
    var maxCost = Math.min(5, 1 + Math.floor(round / 3));
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
    /* 남은 예산으로 별을 올린다. 싼 것부터 — 사람도 싼 것이 먼저 3성이 된다 */
    var byCost = picked.slice().sort(function (a, b) { return a.cost - b.cost; });
    for (tries = 0; tries < 3; tries++) {
      for (i = 0; i < byCost.length; i++) {
        var up = byCost[i], price = up.star === 1 ? up.cost * 3 : up.cost * 6;
        if (round >= 4 && up.star < 3 && price <= left && rand(st) < 0.7) { up.star += 1; left -= price; }
      }
    }
    /* 근접은 앞줄부터, 원거리는 뒷줄부터 */
    var front = [], back = [];
    picked.forEach(function (p) { (p.range === 'ranged' ? back : front).push(p); });
    var cells = [], order = [1, 0, 2];
    order.forEach(function (col) { cells.push([0, col]); });
    order.forEach(function (col) { cells.push([1, col]); });
    var backCells = cells.slice(3).concat(cells.slice(0, 3)), out = [], used = {};
    function place(p, list) {
      for (var k = 0; k < list.length; k++) {
        var key = list[k][0] * COLS + list[k][1];
        if (used[key]) continue;
        used[key] = 1;
        out.push({ name: p.name, star: p.star, row: list[k][0], col: list[k][1] });
        return;
      }
    }
    front.forEach(function (p) { place(p, cells); });
    back.forEach(function (p) { place(p, backCells); });
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
    var c = cardOf(data, u.name), m = STAR_MULT[u.star] || 1;
    return { id: id, name: u.name, side: side, star: u.star, row: row, col: col,
             hp: Math.round(c.hp * m), maxHp: Math.round(c.hp * m), atk: Math.round(c.atk * m), spd: c.spd,
             range: c.range, skill: c.skill, myth: c.myth, kind: c.kind,
             mana: 0, shield: 0, next: 0, stunUntil: 0, hasteUntil: 0, buff: [], dot: null, firstHit: true,
             curse: c.curse || { at: 0, atk: 0, skill: 0, bleed: 0 }, cursed: false,
             bonus: { atk: 0, spd: 0, manaRate: 0, skillPower: 0, splash: 0, stunChance: 0, firstcrit: 0, revive: 0, frenzy: 0, guard: 0, critChance: 0 },
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
  function frontLine(foes) {
    var f = foes.filter(function (e) { return e.row === 0; });
    return f.length ? f : foes;
  }
  function nearest(ent, list) {
    return list.slice().sort(function (a, b) {
      return Math.abs(a.col - ent.col) - Math.abs(b.col - ent.col) || a.hp - b.hp || a.id - b.id;
    })[0] || null;
  }
  function weakest(list) {
    return list.slice().sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp || a.hp - b.hp || a.id - b.id; })[0] || null;
  }
  function behind(ents, target) {
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.alive && e.side === target.side && e.col === target.col && e.row !== target.row) return e;
    }
    return null;
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

  function hurt(sim, src, tgt, amount, t, why) {
    if (!tgt.alive) return 0;
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
      }
    }
    checkCurse(sim, tgt, t);
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
        list = (sk.targets || 1) > 1 ? ((sk.targets >= CELLS) ? foes : frontLine(foes)) : [pickTarget(e, foes)].filter(Boolean);
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
        tgt = weakest(mates.filter(function (m) { return !m.cursed; }));
        if (!tgt) return;
        tgt.shield += Math.round(base * mult);
        sim.log.push({ t: +t.toFixed(1), k: 'shield', a: e.id, b: tgt.id, d: Math.round(base * mult) });
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
               hp: e.hp, maxHp: e.maxHp, alive: e.alive, dealt: e.dealt, cursed: e.cursed }; }) };
  }

  function boardUnits(st) {
    var out = [], i;
    for (i = 0; i < CELLS; i++) if (st.board[i]) out.push({ name: st.board[i].name, star: st.board[i].star, row: Math.floor(i / COLS), col: i % COLS, id: st.board[i].id });
    return out;
  }
  /* 라운드를 싸운다. 지면 체력이 깎인다: 2 + 남은 상대 수. 무승부는 1 */
  function fight(st, data) {
    if (st.phase !== 'plan') return { ok: false, why: 'phase' };
    var res = simulate(data, st, boardUnits(st), st.enemy.units), lost = 0;
    if (res.winner === 'them') lost = 2 + res.left.them;
    if (res.winner === 'draw') lost = 1;
    st.hp = Math.max(0, st.hp - lost);
    st.result = { round: st.round, winner: res.winner, lost: lost, beats: res.beats, left: res.left, log: res.log, ents: res.ents };
    st.history.push({ round: st.round, winner: res.winner, lost: lost, hp: st.hp });
    st.phase = st.hp <= 0 ? 'lost' : (st.round >= ROUNDS && res.winner === 'me') ? 'won' : 'result';
    return { ok: true, result: st.result };
  }
  function next(st, data) {
    if (st.phase !== 'result') return { ok: false, why: 'phase' };
    st.round += 1;
    startRound(st, data);
    return { ok: true };
  }

  /* ── 맡긴 손 — 검사와 "대신 두기" 가 쓴다. 규칙이 아니라 한 가지 버릇이다:
     이미 가진 이름을 먼저 사고(합치려고), 그다음 같은 축이 많은 것, 그다음 비싼 것.
     판은 근접 앞줄·원거리 뒷줄로 채운다 ── */
  function autoPlan(st, data) {
    var rerolls = 0, guard;
    for (guard = 0; guard < 40; guard++) {
      var all = units(st), have = {}, same = {}, axisCount = { myth: {}, kind: {} }, i, c;
      for (i = 0; i < all.length; i++) {
        have[all[i].unit.name] = (have[all[i].unit.name] || 0) + 1;
        same[all[i].unit.name + '#' + all[i].unit.star] = (same[all[i].unit.name + '#' + all[i].unit.star] || 0) + 1;
        c = cardOf(data, all[i].unit.name);
        axisCount.myth[c.myth] = (axisCount.myth[c.myth] || 0) + 1;
        axisCount.kind[c.kind] = (axisCount.kind[c.kind] || 0) + 1;
      }
      /* 뒤로 가면 싼 것은 3성이 못 될 바에야 판다 — 그 금으로 비싼 것을 산다 */
      if (st.round >= 7) {
        var junk = null, jj;
        for (jj = 0; jj < BENCH; jj++) {
          var bj = st.bench[jj];
          if (bj && bj.star === 1 && cardOf(data, bj.name).cost <= 2 && same[bj.name + '#1'] < 2) { junk = bj; break; }
        }
        if (junk) { sell(st, data, junk.id); continue; }
      }
      var free = st.bench.filter(function (x) { return !x; }).length;
      /* 벤치가 찼으면 판에 못 올릴 가장 싼 것을 판다 */
      if (!free) {
        var cheap = null, cv = 1e9, j;
        for (j = 0; j < BENCH; j++) {
          var b = st.bench[j], bv = value(cardOf(data, b.name), b.star) + (same[b.name + '#' + b.star] >= 2 ? 100 : 0);
          if (bv < cv) { cv = bv; cheap = b; }
        }
        if (cheap && cv < 100) { sell(st, data, cheap.id); continue; }
        break;
      }
      var best = -1, score = -1;
      for (i = 0; i < SHOP; i++) {
        c = st.shop[i] && cardOf(data, st.shop[i]);
        if (!c || c.cost > st.gold) continue;
        var s = (have[c.name] ? 10 * have[c.name] : 0) + (axisCount.myth[c.myth] || 0) + (axisCount.kind[c.kind] || 0) + c.cost * (st.round >= 6 ? 2 : 0.8);
        if (st.round >= 5 && c.cost === 1 && !have[c.name]) s -= 5;
        if (st.round >= 8 && c.cost <= 2 && !have[c.name]) s -= 5;
        if (s > score) { score = s; best = i; }
      }
      if (best >= 0 && score >= 0) { buy(st, data, best); continue; }
      /* 살 것이 없고 금이 남으면 다시 돌린다. 이자를 받을 10금은 남긴다 — 마지막 두 라운드는 다 쓴다 */
      var keep = st.round >= ROUNDS - 1 ? 0 : 10;
      if (st.gold - REROLL >= keep && rerolls < (st.round >= 8 ? 12 : 6)) { reroll(st, data); rerolls++; continue; }
      break;
    }
    /* 판 채우기: 판 위 수가 상한보다 적으면 벤치에서 센 것부터 올린다 */
    var limit = cap(st.round);
    for (guard = 0; guard < BENCH && onBoard(st) < limit; guard++) {
      var pick = null, pv = -1, k;
      for (k = 0; k < BENCH; k++) {
        var u = st.bench[k];
        if (!u) continue;
        var v = value(cardOf(data, u.name), u.star);
        if (v > pv) { pv = v; pick = u; }
      }
      if (!pick) break;
      var cell = -1, card = cardOf(data, pick.name), order = card.range === 'ranged' ? [4, 3, 5, 1, 0, 2] : [1, 0, 2, 4, 3, 5];
      for (k = 0; k < order.length; k++) if (!st.board[order[k]]) { cell = order[k]; break; }
      if (cell < 0) break;
      move(st, pick.id, 'board', cell);
    }
    /* 판이 찼는데 벤치에 더 센 것이 있으면 바꾼다 */
    for (guard = 0; guard < 6; guard++) {
      var weak = null, wv = 1e9, strong = null, sv = -1, m;
      for (m = 0; m < CELLS; m++) if (st.board[m]) { var w1 = value(cardOf(data, st.board[m].name), st.board[m].star); if (w1 < wv) { wv = w1; weak = st.board[m]; } }
      for (m = 0; m < BENCH; m++) if (st.bench[m]) { var s1 = value(cardOf(data, st.bench[m].name), st.bench[m].star); if (s1 > sv) { sv = s1; strong = st.bench[m]; } }
      if (!weak || !strong || sv <= wv) break;
      move(st, strong.id, 'board', find(st, weak.id).index);
    }
  }

  var api = {
    ROWS: ROWS, COLS: COLS, CELLS: CELLS, BENCH: BENCH, SHOP: SHOP, REROLL: REROLL, MAX_HP: MAX_HP, ROUNDS: ROUNDS,
    STAR_MULT: STAR_MULT, MANA_MAX: MANA_MAX, MAX_BEATS: MAX_BEATS,
    MYTHS_PER_GAME: MYTHS_PER_GAME, inPlay: inPlay, liveMyths: liveMyths, setMyths: setMyths,
    newGame: newGame, buy: buy, sell: sell, reroll: reroll, move: move, fight: fight, next: next,
    cap: cap, income: income, value: value, odds: odds, units: units, find: find, onBoard: onBoard, boardUnits: boardUnits,
    synergies: synergies, simulate: simulate, makeEnemy: makeEnemy, budget: budget, autoPlan: autoPlan, cardOf: cardOf, rand: rand
  };
  root.AtelierAuto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
