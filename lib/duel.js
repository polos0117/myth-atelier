/* 신기 결투 엔진 — 궨트식 1 대 1. 놀이 규칙은 여기에만 있다. 화면(duel.html)은 상태를 그리고 단추를 넘길 뿐이다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierDuel 하나만 붙이고, node 에서는 module.exports.

   상태(st)는 통째로 JSON 이다. 난수도 st.rngState 한 정수(mulberry32)라서 같은 seed 는 같은 판 —
   검사(tests/duel-sim.cjs)가 그걸 믿고 수백 판을 굴린다.

   카드의 결투 수치는 자료에서 파생한다 — 줄은 range, 힘은 atk/8, 능력은 기술의 effect, 영웅은 5금.
   변형판(각성 +3 · 저주 +5 출혈 · 날씨 힘 0)은 img.json 에 그 그림이 있는 카드에만 생긴다.
   data/duel.json 의 overrides 가 공식을 덮어쓴다. 설계: docs/superpowers/specs/2026-10-02-duel-game-design.md */
(function (root) {
  'use strict';

  var VERSION = 1;
  var DECK = 25, HAND = 10, MULLIGAN = 2, LIVES = 2, MAX_ROUNDS = 3;
  var MAIN_MIN = 15, HERO_MAX = 4, WEATHER_MAX = 3;
  var POWER_DIV = 8, AWAKEN_BONUS = 3, CURSED_BONUS = 5;
  var ROWS = ['melee', 'reach', 'ranged'];
  var LEVELS = ['rookie', 'veteran', 'ace'];
  var VARIANTS = ['base', 'awaken', 'cursed', 'weather'];
  /* 기술의 effect(13) → 능력 열쇠(9). 이름·설명은 낱말 표 duel.ability.<열쇠> */
  var ABILITY = { strike: 'strike', pierce: 'strike', sweep: 'sweep', volley: 'volley', execute: 'execute', stun: 'seal',
    heal: 'mend', buff: 'mend', haste: 'mend', rally: 'rally', shield: 'shield', bulwark: 'shield', drain: 'drain' };
  var ABILITIES = ['strike', 'sweep', 'volley', 'execute', 'seal', 'mend', 'rally', 'shield', 'drain'];

  /* ── 난수 (mulberry32) — 상태는 st.rngState 정수 하나 ── */
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

  /* ── 파생 ── */
  /* img.json 에서 그 카드의 그림 넷 — 기본 f · 각성 awaken.f · 저주 cursed.f · 일상컷 첫 장(casual 은 배열이거나 {f:[…]}) */
  function filesOf(img, name) {
    var e = img && img[name], bs = e && e.byStyle, out = { base: null, awaken: null, cursed: null, weather: null }, k, b, cas;
    if (!bs) return out;
    for (k in bs) {
      b = bs[k];
      if (!out.base && b.f) out.base = b.f;
      if (!out.awaken && b.awaken && b.awaken.f) out.awaken = b.awaken.f;
      if (!out.cursed && b.cursed && b.cursed.f) out.cursed = b.cursed.f;
      cas = b.casual && (Object.prototype.toString.call(b.casual) === '[object Array]' ? b.casual : b.casual.f);
      if (!out.weather && cas && cas.length) out.weather = cas[0];
    }
    return out;
  }
  function addCard(out, core, suffix, variant, power, file) {
    var card = {}, k;
    for (k in core) card[k] = core[k];
    card.id = core.name + suffix; card.variant = variant; card.power = power; card.file = file;
    if (variant === 'weather') { card.ability = null; card.n = 0; card.hero = false; }
    out.cards[card.id] = card; out.list.push(card.id);
  }
  function derive(data) {
    var out = { cards: {}, list: [] }, ov = (data.duel && data.duel.overrides) || {}, i, c, sk, ab, n, o, f, core;
    for (i = 0; i < data.cards.length; i++) {
      c = data.cards[i]; sk = data.skills[c.skill] || {}; ab = ABILITY[sk.effect] || 'strike'; o = ov[c.name] || {};
      n = ab === 'volley' ? Math.max(1, Math.min(3, sk.targets || 2)) : sk.mult ? Math.max(1, Math.min(3, Math.round(sk.mult))) : 2;
      f = filesOf(data.img, c.name);
      core = { name: c.name, myth: c.myth, kind: c.kind, cost: c.cost, hero: c.cost === 5, row: c.range, wielder: c.wielder, text: c.text,
        ability: o.ability || ab, n: o.n || n, power: o.power || Math.round(c.atk / POWER_DIV) };
      addCard(out, core, '', 'base', core.power, f.base);
      if (f.awaken) addCard(out, core, '@awaken', 'awaken', core.power + AWAKEN_BONUS, f.awaken);
      if (f.cursed) addCard(out, core, '@cursed', 'cursed', core.power + CURSED_BONUS, f.cursed);
      if (f.weather) addCard(out, core, '@weather', 'weather', 0, f.weather);
    }
    return out;
  }

  /* ── 파생 결과를 자료에 붙여 둔다 — 모든 함수가 data 를 받고 안에서 이걸 쓴다 ── */
  function cardsOf(data) { if (!data.__duel) data.__duel = derive(data); return data.__duel; }
  function myths(data) { var out = [], i; for (i = 0; i < data.duel.bosses.length; i++) out.push(data.duel.bosses[i].myth); return out; }
  function idsWhere(D, f) { var out = [], i, c; for (i = 0; i < D.list.length; i++) { c = D.cards[D.list[i]]; if (f(c)) out.push(c.id); } return out; }

  /* ── 프로필 ── */
  function emptyStats() {
    return { games: 0, win: 0, lose: 0, draw: 0, streak: 0, bestStreak: 0, bestRound: 0, rounds: 0,
      byBoss: {}, byLevel: {}, byMain: {}, cards: {}, factions: {} };
  }
  function upgradeProfile(p) {
    var e = emptyStats(), k;
    if (!p.stats) p.stats = {};
    for (k in e) if (p.stats[k] === undefined) p.stats[k] = e[k];
    if (!p.beaten) p.beaten = {};
    if (!p.level || LEVELS.indexOf(p.level) < 0) p.level = LEVELS[0];
    if (!p.owned) p.owned = []; if (!p.deck) p.deck = [];
    p.v = VERSION;
    return p;
  }
  /* 주 권 기본판 17 + 다른 권 기본판 8(시드 무작위) 이 컬렉션이자 시작 덱.
     다른 권 8장은 비영웅에서 뽑는다 — 주 권에 영웅이 셋넷이라, 영웅이 더 섞이면 시작 덱이 영웅 4장 규칙을 어긴다 */
  function newProfile(data, mainMyth, seed) {
    var D = cardsOf(data), rng = { rngState: seed | 0 };
    var mine = idsWhere(D, function (c) { return c.variant === 'base' && c.myth === mainMyth; });
    var rest = shuffle(rng, idsWhere(D, function (c) { return c.variant === 'base' && c.myth !== mainMyth && !c.hero; })).slice(0, DECK - mine.length);
    var owned = mine.concat(rest);
    return upgradeProfile({ v: VERSION, main: mainMyth, owned: owned, deck: owned.slice(), beaten: {}, level: LEVELS[0], stats: emptyStats() });
  }
  function collectionMax(data) { return cardsOf(data).list.length; }

  /* ── 덱 규칙 다섯 — 25장 · 주 권 15 · 영웅 4 · 날씨 3 · 같은 id 1 — 과 안 가진 카드 ── */
  function validateDeck(data, profile) {
    var D = cardsOf(data), out = { ok: true, problems: [], n: profile.deck.length, main: 0, hero: 0, weather: 0 };
    var seen = {}, dup = false, owned = false, i, id, c;
    for (i = 0; i < profile.deck.length; i++) {
      id = profile.deck[i]; c = D.cards[id];
      if (!c || profile.owned.indexOf(id) < 0) { owned = true; continue; }
      if (c.myth === profile.main) out.main++;
      if (c.hero) out.hero++;
      if (c.variant === 'weather') out.weather++;
      if (seen[id]) dup = true; seen[id] = 1;
    }
    if (out.n !== DECK) out.problems.push('count');
    if (out.main < MAIN_MIN) out.problems.push('main');
    if (out.hero > HERO_MAX) out.problems.push('hero');
    if (out.weather > WEATHER_MAX) out.problems.push('weather');
    if (dup) out.problems.push('dup');
    if (owned) out.problems.push('owned');
    out.ok = out.problems.length === 0;
    return out;
  }
  function toggleDeck(data, profile, id) {
    var i = profile.deck.indexOf(id);
    if (i >= 0) { profile.deck.splice(i, 1); return { ok: true }; }
    if (profile.owned.indexOf(id) < 0 || !cardsOf(data).cards[id]) return { ok: false, why: 'owned' };
    profile.deck.push(id);
    return { ok: true };
  }
  function setMain(profile, myth) { profile.main = myth; return profile; }

  /* ── 주인 — 자기 권 17 + 이웃 권 8. 숙련은 이웃을 힘 순으로, 각성판 3. 에이스는 저주판 2·날씨판 2 를 더 ── */
  function bossOf(data, myth) {
    var i; for (i = 0; i < data.duel.bosses.length; i++) if (data.duel.bosses[i].myth === myth) return data.duel.bosses[i];
    return null;
  }
  function byPowerDesc(D) { return function (a, b) { return D.cards[b].power - D.cards[a].power; }; }
  function bossDeck(data, rng, myth, level) {
    var D = cardsOf(data), boss = bossOf(data, myth), ally = boss ? boss.ally : myth;
    var own = idsWhere(D, function (c) { return c.variant === 'base' && c.myth === myth; });
    var allies = idsWhere(D, function (c) { return c.variant === 'base' && c.myth === ally; });
    var n = DECK - own.length, out, swapped = {}, i, k;
    if (level === 'rookie') allies = shuffle(rng, allies).slice(0, n);
    else allies = allies.sort(byPowerDesc(D)).slice(0, n);
    own = shuffle(rng, own);
    function swap(suffix, count) {
      var done = 0;
      for (i = 0; i < own.length && done < count; i++) {
        if (swapped[i] || !D.cards[own[i] + suffix]) continue;
        own[i] = own[i] + suffix; swapped[i] = 1; done++;
      }
    }
    if (level !== 'rookie') swap('@awaken', 3);
    if (level === 'ace') { swap('@cursed', 2); swap('@weather', 2); }
    out = own.concat(allies);
    for (k = 0; k < out.length; k++) if (!D.cards[out[k]]) throw new Error('bossDeck: ' + out[k]);
    return out;
  }

  /* ── 판 ── */
  function other(who) { return who === 'me' ? 'foe' : 'me'; }
  function blankSide(myth) {
    return { hand: [], deck: [], rows: { melee: [], reach: [], ranged: [] }, grave: [], faction: { myth: myth, used: false },
      hurt: 0, sealed: false, astra: false, guard: false };
  }
  function makeUnit(data, st, id) {
    var c = cardsOf(data).cards[id];
    return { id: id, base: c.power, cur: c.power, hero: !!c.hero, cursed: c.variant === 'cursed', shield: false, at: st.seq++ };
  }
  function units(side) { return side.rows.melee.concat(side.rows.reach, side.rows.ranged); }
  function newMatch(data, profile, bossMyth, level, seed) {
    var st = { v: VERSION, seed: seed | 0, rngState: seed | 0, boss: bossMyth, level: level, round: 1, turn: null, first: null,
      passed: { me: false, foe: false }, lives: { me: LIVES, foe: LIVES }, weather: { melee: false, reach: false, ranged: false },
      me: blankSide(profile.main), foe: blankSide(bossMyth), seq: 0, log: [], roundLog: [], phase: 'mulligan', winner: null,
      played: [], mulligans: 0, rewarded: false, last: null };
    st.me.deck = shuffle(st, profile.deck.slice());
    st.foe.deck = shuffle(st, bossDeck(data, st, bossMyth, level));
    st.me.hand = st.me.deck.splice(0, HAND);
    st.foe.hand = st.foe.deck.splice(0, HAND);
    return st;
  }
  /* 손패 한 장을 덱 맨 위와 바꾼다. 옛 카드는 맨 아래로 */
  function swapTop(side, i) {
    var old = side.hand[i];
    if (!side.deck.length) return false;
    side.hand[i] = side.deck.shift(); side.deck.push(old);
    return true;
  }
  function mulligan(st, i) {
    if (st.phase !== 'mulligan') return { ok: false, why: 'phase' };
    if (st.mulligans >= MULLIGAN) return { ok: false, why: 'mulligan' };
    if (i < 0 || i >= st.me.hand.length) return { ok: false, why: 'hand' };
    swapTop(st.me, i); st.mulligans++;
    return { ok: true };
  }
  /* 상대 멀리건 — 비영웅 가운데 힘이 가장 낮은 2장. 그 뒤 동전으로 선공 */
  function confirm(data, st) {
    var D = cardsOf(data), i, k, idx, pick, foe = st.foe;
    if (st.phase !== 'mulligan') return st;
    for (k = 0; k < MULLIGAN; k++) {
      idx = -1;
      for (i = 0; i < foe.hand.length; i++) {
        pick = D.cards[foe.hand[i]];
        if (pick.hero || pick.variant === 'weather') continue;
        if (idx < 0 || pick.power < D.cards[foe.hand[idx]].power) idx = i;
      }
      if (idx < 0 || !swapTop(foe, idx)) break;
    }
    st.first = rand(st) < 0.5 ? 'me' : 'foe';
    st.turn = st.first; st.phase = 'play';
    st.log.push({ t: 'first', who: st.first });
    startRound(data, st);
    return st;
  }
  function legal(data, st, who) {
    var out = { cards: [], faction: false, pass: false };
    if (st.phase !== 'play' || st.turn !== who || st.passed[who]) return out;
    out.cards = st[who].hand.slice(); out.faction = !st[who].faction.used; out.pass = true;
    return out;
  }
  function begin(st, who, kind, id) { st.last = { who: who, id: id || null, kind: kind, fx: [] }; }
  /* ── 능력의 받침 — 고르기·피해·파괴·강화 ── */
  /* 비영웅 가운데 하나. opt.row 로 줄을 좁히고, opt.canBuff 면 저주판도 뺀다. most 면 cur 큰 것, 아니면 작은 것. 같으면 먼저 놓인 것 */
  function pick(side, opt) {
    var list = opt.row ? side.rows[opt.row] : units(side), best = null, i, u;
    for (i = 0; i < list.length; i++) {
      u = list[i];
      if (u.hero || (opt.canBuff && u.cursed)) continue;
      if (!best || (opt.most ? u.cur > best.cur : u.cur < best.cur) || (u.cur === best.cur && u.at < best.at)) best = u;
    }
    return best;
  }
  function fx(st, who, side, unit, kind, n) { st.last.fx.push({ side: who, row: rowOf(side, unit), at: unit.at, kind: kind, n: n || 0 }); }
  /* 피해 — 영웅·호국이면 0. 보호막이면 벗기고 0. 바닥 1. 깎인 만큼 side.hurt 에 쌓인다 */
  function damage(st, who, unit, n) {
    var side = st[who], dealt;
    if (unit.hero || side.guard || n <= 0) return 0;
    if (unit.shield) { unit.shield = false; fx(st, who, side, unit, 'shield'); return 0; }
    dealt = Math.min(n, unit.cur - 1);
    if (dealt <= 0) return 0;
    unit.cur -= dealt; side.hurt += dealt;
    fx(st, who, side, unit, 'dmg', dealt);
    return dealt;
  }
  function destroy(st, who, unit) {
    var side = st[who], row, list;
    if (unit.hero || side.guard) return false;
    if (unit.shield) { unit.shield = false; fx(st, who, side, unit, 'shield'); return false; }
    row = rowOf(side, unit); list = side.rows[row];
    fx(st, who, side, unit, 'dead');
    list.splice(list.indexOf(unit), 1); side.grave.push(unit.id);
    return true;
  }
  /* 강화 — 영웅·저주판은 받지 않는다 */
  function buff(st, who, unit, n) {
    if (unit.hero || unit.cursed || n <= 0) return;
    unit.cur += n; fx(st, who, st[who], unit, 'buff', n);
  }
  /* 능력 — 카드를 낼 때 한 번. 봉인이면 비영웅 한 장이 소모한다. 아스트라면 수치 두 배 */
  function fire(data, st, who, unit) {
    var c = cardsOf(data).cards[unit.id], me = st[who], foe = st[other(who)], you = other(who);
    var mag, n, one, row, list, i, t, pool, k;
    if (me.sealed && !unit.hero) { me.sealed = false; return; }
    mag = me.astra ? 2 : 1; n = c.n * mag; one = mag; row = rowOf(me, unit);
    switch (c.ability) {
      case 'strike': if ((t = pick(foe, { most: true }))) damage(st, you, t, n); break;
      case 'sweep':
        list = foe.rows[row].slice();
        for (i = 0; i < list.length; i++) if (!list[i].hero) damage(st, you, list[i], one);
        break;
      case 'volley':
        pool = []; list = units(foe);
        for (i = 0; i < list.length; i++) if (!list[i].hero) pool.push(list[i]);
        shuffle(st, pool);
        for (i = 0; i < pool.length && i < c.n; i++) damage(st, you, pool[i], one);
        break;
      case 'execute':
        if ((t = pick(foe, { most: false }))) { if (t.cur <= 5) destroy(st, you, t); else damage(st, you, t, 2 * mag); }
        break;
      case 'seal': foe.sealed = true; break;
      case 'mend': if ((t = pick(me, { row: row, most: false, canBuff: true }))) buff(st, who, t, n); break;
      case 'rally':
        list = me.rows[row];
        for (i = 0; i < list.length; i++) if (list[i] !== unit) buff(st, who, list[i], one);
        break;
      case 'shield':
        list = me.rows[row]; k = list.indexOf(unit);
        for (i = k - 1; i <= k + 1; i++) if (list[i] && !list[i].hero && !list[i].cursed) { list[i].shield = true; fx(st, who, me, list[i], 'shield'); }
        break;
      case 'drain':
        if ((t = pick(foe, { most: true }))) damage(st, you, t, n);
        unit.cur += n; fx(st, who, me, unit, 'buff', n);   /* 자기 능력이라 영웅·저주판도 받는다 */
        break;
    }
    me.astra = false;
  }
  function play(data, st, id) {
    var who = st.turn, side = st[who], D = cardsOf(data), c = D.cards[id], i, j, u, foeUnits;
    if (st.phase !== 'play') return { ok: false, why: 'phase' };
    if (st.passed[who]) return { ok: false, why: 'passed' };
    i = side.hand.indexOf(id);
    if (i < 0 || !c) return { ok: false, why: 'hand' };
    side.hand.splice(i, 1);
    begin(st, who, 'play', id);
    if (c.variant === 'weather') {
      st.weather[c.row] = !st.weather[c.row];
      side.grave.push(id);
    } else {
      u = makeUnit(data, st, id);
      side.rows[c.row].push(u);
      /* 상대 저주판의 출혈 — 내가 낼 때마다 −1, 바닥 1 */
      foeUnits = units(st[other(who)]);
      for (j = 0; j < foeUnits.length; j++) if (foeUnits[j].cursed && foeUnits[j].cur > 1) {
        foeUnits[j].cur--; st.last.fx.push({ side: other(who), row: rowOf(st[other(who)], foeUnits[j]), at: foeUnits[j].at, kind: 'dmg', n: 1 });
      }
      fire(data, st, who, u);
    }
    if (who === 'me' && st.played.indexOf(id) < 0) st.played.push(id);
    st.log.push({ t: 'play', who: who, id: id });
    endTurn(data, st);
    return { ok: true };
  }
  function rowOf(side, unit) { var r; for (r = 0; r < ROWS.length; r++) if (side.rows[ROWS[r]].indexOf(unit) >= 0) return ROWS[r]; return null; }
  function pass(data, st) {
    var who = st.turn;
    if (st.phase !== 'play') return { ok: false, why: 'phase' };
    if (st.passed[who]) return { ok: false, why: 'passed' };
    begin(st, who, 'pass');
    st.passed[who] = true;
    st.log.push({ t: 'pass', who: who });
    endTurn(data, st);
    return { ok: true };
  }
  /* 손패가 비면 자동 패스. 둘 다 패스면 라운드 끝. 아니면 패스 안 한 쪽 차례 */
  function endTurn(data, st) {
    var who = st.turn;
    if (!st[who].hand.length) st.passed[who] = true;
    if (st.passed.me && st.passed.foe) return endRound(data, st);
    st.turn = st.passed[other(who)] ? who : other(who);
  }
  function startRound(data, st) {
    if (!st.me.hand.length) st.passed.me = true;
    if (!st.foe.hand.length) st.passed.foe = true;
    if (st.passed.me && st.passed.foe) return endRound(data, st);
    if (st.passed[st.turn]) st.turn = other(st.turn);
  }
  function clearSide(side) {
    var r, i;
    for (r = 0; r < ROWS.length; r++) {
      for (i = 0; i < side.rows[ROWS[r]].length; i++) side.grave.push(side.rows[ROWS[r]][i].id);
      side.rows[ROWS[r]] = [];
    }
    side.hurt = 0; side.sealed = false; side.astra = false; side.guard = false;
  }
  function endRound(data, st) {
    var sc = scores(data, st), winner = sc.me.total > sc.foe.total ? 'me' : sc.foe.total > sc.me.total ? 'foe' : 'draw', loser;
    st.roundLog.push({ me: sc.me.total, foe: sc.foe.total, winner: winner, units: { me: units(st.me).length, foe: units(st.foe).length } });
    if (winner !== 'me') st.lives.me--;
    if (winner !== 'foe') st.lives.foe--;
    st.log.push({ t: 'round', n: st.round, winner: winner, me: sc.me.total, foe: sc.foe.total });
    clearSide(st.me); clearSide(st.foe);
    st.weather = { melee: false, reach: false, ranged: false };
    st.passed = { me: false, foe: false };
    if (st.lives.me <= 0 || st.lives.foe <= 0 || st.round >= MAX_ROUNDS) {
      st.phase = 'done';
      st.winner = st.lives.me > st.lives.foe ? 'me' : st.lives.foe > st.lives.me ? 'foe' : 'draw';
      st.turn = null;
      return;
    }
    st.round++;
    loser = winner === 'draw' ? other(st.first) : other(winner);
    st.first = loser; st.turn = loser;
    startRound(data, st);
  }
  /* 합산 — 영웅은 cur. 날씨 줄 비영웅은 1. 그 밖은 cur + 결속(같은 줄 같은 주인 비영웅·비저주 둘 이상이면 각각 +base) */
  function scores(data, st) {
    var D = cardsOf(data), out = {}, s, who, r, row, list, i, u, c, byW, sum;
    for (s = 0; s < 2; s++) {
      who = s ? 'foe' : 'me'; out[who] = { rows: {}, total: 0 };
      for (r = 0; r < ROWS.length; r++) {
        row = ROWS[r]; list = st[who].rows[row]; byW = {}; sum = 0;
        for (i = 0; i < list.length; i++) {
          u = list[i]; c = D.cards[u.id];
          if (!u.hero && !u.cursed && c.wielder) byW[c.wielder] = (byW[c.wielder] || 0) + 1;
        }
        for (i = 0; i < list.length; i++) {
          u = list[i]; c = D.cards[u.id];
          if (u.hero) sum += u.cur;
          else if (st.weather[row]) sum += 1;
          else sum += u.cur + (!u.cursed && c.wielder && byW[c.wielder] >= 2 ? u.base : 0);
        }
        out[who].rows[row] = sum; out[who].total += sum;
      }
    }
    return out;
  }

  var api = {
    VERSION: VERSION, DECK: DECK, HAND: HAND, MULLIGAN: MULLIGAN, LIVES: LIVES, MAX_ROUNDS: MAX_ROUNDS,
    MAIN_MIN: MAIN_MIN, HERO_MAX: HERO_MAX, WEATHER_MAX: WEATHER_MAX, ROWS: ROWS, LEVELS: LEVELS, VARIANTS: VARIANTS,
    ABILITY: ABILITY, ABILITIES: ABILITIES, rand: rand, randInt: randInt, shuffle: shuffle, derive: derive,
    cardsOf: cardsOf, emptyStats: emptyStats, newProfile: newProfile, upgradeProfile: upgradeProfile, collectionMax: collectionMax,
    validateDeck: validateDeck, toggleDeck: toggleDeck, setMain: setMain, bossOf: bossOf, bossDeck: bossDeck,
    newMatch: newMatch, mulligan: mulligan, confirm: confirm, other: other, legal: legal, play: play, pass: pass, scores: scores, makeUnit: makeUnit
  };
  root.AtelierDuel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
