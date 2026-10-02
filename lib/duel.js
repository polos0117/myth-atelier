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
  /* 선공 보너스 — 1라운드에 선공 쪽 합에 카드 한 장 값을 더한다. 후공은 늘 교환의 마지막에 답하므로 AI 끼리 297판에서
     선공 승률이 36% 였다(0) → 41%(5) → 48%(8) → 56%(12). 궨트 본편의 '전술 우위' 와 같은 장치 */
  var FIRST_BONUS = 8;
  /* 보상 뒤집기 — 이기면 뒷장 REWARD_POOL 장이 깔리고 첫 승 3장·재대결 1장을 골라 뒤집는다. 5장의 종류 비율과 값 가중치(값^지수)는 난이도가 정한다 */
  var REWARD_POOL = 5, REWARD_PICKS = { first: 3, again: 1 };
  var REWARD_MIX = { rookie: { base: 0.65, awaken: 0.2, cursed: 0.1, weather: 0.05 }, veteran: { base: 0.35, awaken: 0.3, cursed: 0.2, weather: 0.15 }, ace: { base: 0.15, awaken: 0.25, cursed: 0.25, weather: 0.35 } };
  var REWARD_COST_EXP = { rookie: 0, veteran: 1, ace: 2 };
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
  /* 주 권 기본판 17 + 주 권 날씨판 1(첫 판부터 날씨를 써 본다) + 다른 권 기본판 7(시드 무작위) 이 컬렉션이자 시작 덱.
     다른 권은 비영웅에서 뽑는다 — 주 권에 영웅이 셋넷이라, 영웅이 더 섞이면 시작 덱이 영웅 4장 규칙을 어긴다 */
  function newProfile(data, mainMyth, seed) {
    var D = cardsOf(data), rng = { rngState: seed | 0 };
    var mine = idsWhere(D, function (c) { return c.variant === 'base' && c.myth === mainMyth; });
    var wx = shuffle(rng, idsWhere(D, function (c) { return c.variant === 'weather' && c.myth === mainMyth; })).slice(0, 1);
    var rest = shuffle(rng, idsWhere(D, function (c) { return c.variant === 'base' && c.myth !== mainMyth && !c.hero; })).slice(0, DECK - mine.length - wx.length);
    var owned = mine.concat(wx, rest);
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
      played: [], mulligans: 0, rewarded: false, last: null, coin: null };
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
    st.coin = st.first;   /* 처음 동전 — first 는 라운드마다 바뀐다(진 쪽이 선공) */
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
    }
    /* 상대 저주판의 출혈 — 카드를 낼 때마다(날씨판도) −1, 바닥 1. damage() 를 안 거치므로 호국·받은 피해 합과 무관 */
    foeUnits = units(st[other(who)]);
    for (j = 0; j < foeUnits.length; j++) if (foeUnits[j].cursed && foeUnits[j].cur > 1) {
      foeUnits[j].cur--; st.last.fx.push({ side: other(who), row: rowOf(st[other(who)], foeUnits[j]), at: foeUnits[j].at, kind: 'dmg', n: 1 });
    }
    if (u) fire(data, st, who, u);
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
      if (st.round === 1 && st.coin === who) out[who].total += FIRST_BONUS;
    }
    return out;
  }

  /* ── 진영 능력 열하나 — 한 판에 한 번, 턴을 쓴다. 대상은 늘 규칙으로 정해진다 ── */
  /* 묘지에서 힘이 가장 큰 카드의 자리. 날씨판(힘 0)은 안 고른다. 같으면 먼저 묻힌 것 */
  function graveBest(D, side) {
    var best = -1, i, c;
    for (i = 0; i < side.grave.length; i++) {
      c = D.cards[side.grave[i]];
      if (c.variant === 'weather') continue;
      if (best < 0 || c.power > D.cards[side.grave[best]].power) best = i;
    }
    return best;
  }
  var FACTION = {
    norse: function (data, st, who) {       /* 발할라 — 묘지의 가장 센 카드를 손으로 */
      var me = st[who], i = graveBest(cardsOf(data), me);
      if (i >= 0) me.hand.push(me.grave.splice(i, 1)[0]);
    },
    greek: function (data, st, who) {       /* 신의 가호 — 가장 센 비영웅에 기본 힘만큼 */
      var t = pick(st[who], { most: true, canBuff: true });
      if (t) buff(st, who, t, t.base);
    },
    korea: function (data, st, who) { st[who].guard = true; },   /* 호국 — 이 라운드 동안 피해·파괴 없음 */
    china: function (data, st, who) {       /* 기 — 덱에서 2장 */
      var me = st[who], k; for (k = 0; k < 2 && me.deck.length; k++) me.hand.push(me.deck.shift());
    },
    japan: function (data, st, who) {       /* 일섬 — 상대 가장 센 비영웅 파괴 */
      var t = pick(st[other(who)], { most: true });
      if (t) destroy(st, other(who), t);
    },
    india: function (data, st, who) { st[who].astra = true; },   /* 아스트라 — 다음 카드 수치 두 배 */
    egypt: function (data, st, who) {       /* 영생 — 묘지의 가장 센 카드를 바로 자기 줄에, 능력은 안 터진다 */
      var D = cardsOf(data), me = st[who], i = graveBest(D, me), id, u;
      if (i < 0) return;
      id = me.grave.splice(i, 1)[0]; u = makeUnit(data, st, id); me.rows[D.cards[id].row].push(u);
      fx(st, who, me, u, 'rise', 0);
    },
    westasia: function (data, st, who) {    /* 눈에는 눈 — 이 라운드에 받은 피해 합만큼 */
      var t = pick(st[other(who)], { most: true });
      if (t && st[who].hurt > 0) damage(st, other(who), t, st[who].hurt);
    },
    celtic: function (data, st, who) {      /* 투혼 — 뒤지면 내 비영웅 전부 +2 */
      var sc = scores(data, st), list = units(st[who]), i;
      if (sc[who].total >= sc[other(who)].total) return;
      for (i = 0; i < list.length; i++) buff(st, who, list[i], 2);
    },
    america: function (data, st, who) {     /* 비취의 숨 — 상대 가장 센 −3, 내 가장 약한 +3 */
      var t = pick(st[other(who)], { most: true }), m = pick(st[who], { most: false, canBuff: true });
      if (t) damage(st, other(who), t, 3);
      if (m) buff(st, who, m, 3);
    },
    knight: function (data, st, who) {      /* 롱스보의 맹세 — 묘지 수만큼(최대 5) 가장 센 비영웅에 */
      var t = pick(st[who], { most: true, canBuff: true }), n = Math.min(5, st[who].grave.length);
      if (t) buff(st, who, t, n);
    }
  };
  function useFaction(data, st) {
    var who = st.turn, side = st[who], f;
    if (st.phase !== 'play') return { ok: false, why: 'phase' };
    if (st.passed[who]) return { ok: false, why: 'passed' };
    if (side.faction.used) return { ok: false, why: 'used' };
    begin(st, who, 'faction');
    side.faction.used = true;
    f = FACTION[side.faction.myth];
    if (f) f(data, st, who);
    st.log.push({ t: 'faction', who: who, myth: side.faction.myth });
    endTurn(data, st);
    return { ok: true };
  }

  /* ── AI — 시드 난수로 결정적. 수마다 "(내 합 − 상대 합) 의 변화" 를 센다 ── */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function lead(data, st, who) { var sc = scores(data, st); return sc[who].total - sc[other(who)].total; }
  function evaluate(data, st, move) {
    var who = st.turn, before = lead(data, st, who), c = clone(st);
    if (move.kind === 'card') play(data, c, move.id); else useFaction(data, c);
    /* 라운드가 끝나 판이 비면 변화를 셀 수 없다 — 끝나기 직전 상태로 센다 */
    if (c.roundLog.length > st.roundLog.length) {
      var r = c.roundLog[c.roundLog.length - 1];
      return (who === 'me' ? r.me - r.foe : r.foe - r.me) - before;
    }
    return lead(data, c, who) - before;
  }
  function handPower(D, side) { var n = 0, i; for (i = 0; i < side.hand.length; i++) n += D.cards[side.hand[i]].power; return n; }
  function aiMove(data, st, level) {
    var D = cardsOf(data), who = st.turn, me = st[who], you = other(who), L = legal(data, st, who), cands = [], i, c, g, m, keep;
    var ld = lead(data, st, who), foePassed = st.passed[you], needy = foePassed && ld <= 0;
    level = level || st.level;
    if (!L.pass) return { kind: 'pass' };
    for (i = 0; i < L.cards.length; i++) {
      c = D.cards[L.cards[i]]; m = { kind: 'card', id: L.cards[i] };
      if (level === 'ace' && !needy) {
        if (st.round === 1 && (c.hero || c.variant === 'cursed')) continue;
        if (c.variant === 'cursed' && me.hand.length > 3) continue;
      }
      g = evaluate(data, st, m);
      if (level === 'ace' && c.variant === 'weather' && g < 4) continue;
      cands.push({ m: m, g: g });
    }
    if (L.faction && !(level === 'ace' && st.round === 1 && !needy)) cands.push({ m: { kind: 'faction' }, g: evaluate(data, st, { kind: 'faction' }) });
    if (ld > 0 && foePassed) return { kind: 'pass' };
    if (level !== 'rookie' && ld < 0 && ld + handPower(D, me) <= 0 && st.lives[who] > 1) return { kind: 'pass' };
    if (!cands.length) return { kind: 'pass' };
    cands.sort(function (a, b) { return b.g - a.g; });   /* 안정 정렬 — 같으면 먼저 것 */
    keep = level === 'rookie' ? Math.min(3, cands.length) : 1;
    return cands[keep === 1 ? 0 : randInt(st, keep)].m;
  }
  function aiTurn(data, st, level) {
    var m = aiMove(data, st, level), r;
    if (m.kind === 'pass') r = pass(data, st); else if (m.kind === 'faction') r = useFaction(data, st); else r = play(data, st, m.id);
    return { ok: r.ok, move: m, why: r.why };
  }

  /* ── 보상·통계 — 판이 끝날 때 한 번 ── */
  function bump(table, key, win) {
    if (!table[key]) table[key] = { games: 0, win: 0 };
    table[key].games++; if (win) table[key].win++;
  }
  function winsOf(profile, myth) { var b = (profile.beaten || {})[myth] || {}, n = 0, k; for (k in b) n += b[k]; return n; }
  function conquered(data, profile) {
    var i; for (i = 0; i < data.duel.bosses.length; i++) if (winsOf(profile, data.duel.bosses[i].myth) < 1) return false;
    return true;
  }
  /* 아직 없는 카드 가운데 한 종류의 후보 — myth 가 있으면 그 권만. taken 은 이미 판에 깔린 id */
  function candidates(D, profile, taken, variant, myth) {
    var out = [], i, c;
    for (i = 0; i < D.list.length; i++) {
      c = D.cards[D.list[i]];
      if (c.variant !== variant || (myth && c.myth !== myth) || profile.owned.indexOf(c.id) >= 0 || taken.indexOf(c.id) >= 0) continue;
      out.push(c.id);
    }
    return out;
  }
  /* 값 가중치로 하나 — 지수 0 이면 고르게, 1 이면 값만큼, 2 면 값의 제곱만큼 */
  function weightedPick(D, st, list, exp) {
    var w = [], sum = 0, i, r;
    for (i = 0; i < list.length; i++) { w[i] = Math.pow(D.cards[list[i]].cost || 1, exp); sum += w[i]; }
    r = rand(st) * sum;
    for (i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  /* 뒷장 다섯 — 종류는 난이도의 비율로 뽑고, 그 종류의 카드를 그 주인의 권에서 먼저, 없으면 다른 권에서, 그래도 없으면 다른 종류(보통 차례)로 */
  function buildRewardPool(data, st, profile) {
    var D = cardsOf(data), mix = REWARD_MIX[st.level] || REWARD_MIX.rookie, exp = REWARD_COST_EXP[st.level] || 0, pool = [], k, r, v, i, list, order;
    for (k = 0; k < REWARD_POOL; k++) {
      r = rand(st); v = null;
      for (i = 0; i < VARIANTS.length; i++) { r -= mix[VARIANTS[i]] || 0; if (r <= 0) { v = VARIANTS[i]; break; } }
      if (!v) v = VARIANTS[VARIANTS.length - 1];
      order = [v].concat(VARIANTS.filter(function (x) { return x !== v; }));
      list = null;
      for (i = 0; i < order.length && !list; i++) {
        list = candidates(D, profile, pool, order[i], st.boss);
        if (!list.length) list = candidates(D, profile, pool, order[i], null);
        if (!list.length) list = null;
      }
      if (!list) break;
      pool.push(weightedPick(D, st, list, exp));
    }
    return pool;
  }
  function settle(data, profile, st) {
    var s, win = st.winner === 'me', result, i, id, first = false, best = 0, pool = [], picks = 0;
    if (st.phase !== 'done' || st.rewarded) return null;
    upgradeProfile(profile); s = profile.stats;
    result = win ? 'win' : st.winner === 'foe' ? 'lose' : 'draw';
    s.games++; s[result]++;
    s.streak = win ? s.streak + 1 : 0; if (s.streak > s.bestStreak) s.bestStreak = s.streak;
    /* 한 라운드 내 합의 최고 — 1라운드의 선공 보너스는 카드가 아니라 뺀다 */
    for (i = 0; i < st.roundLog.length; i++) { id = st.roundLog[i].me - (i === 0 && st.coin === 'me' ? FIRST_BONUS : 0); if (id > best) best = id; }
    if (best > s.bestRound) s.bestRound = best;
    s.rounds += st.roundLog.length;
    bump(s.byBoss, st.boss, win); bump(s.byLevel, st.level, win); bump(s.byMain, profile.main, win);
    for (i = 0; i < st.played.length; i++) {
      id = st.played[i];
      if (!s.cards[id]) s.cards[id] = { played: 0, won: 0 };
      s.cards[id].played++; if (win) s.cards[id].won++;
    }
    if (st.me.faction.used) s.factions[profile.main] = (s.factions[profile.main] || 0) + 1;
    if (win) {
      if (!profile.beaten[st.boss]) profile.beaten[st.boss] = {};
      profile.beaten[st.boss][st.level] = (profile.beaten[st.boss][st.level] || 0) + 1;
      first = profile.beaten[st.boss][st.level] === 1;
      pool = buildRewardPool(data, st, profile);
      picks = Math.min(pool.length, first ? REWARD_PICKS.first : REWARD_PICKS.again);
    }
    st.rewarded = true;
    /* 뒷장은 깔렸고 아직 한 장도 안 뒤집었다 — pickReward 가 taken 에 자리를 적고 컬렉션에 넣는다 */
    st.outcome = { result: result, first: first, pool: pool, picks: picks, taken: [] };
    return st.outcome;
  }
  /* 뒷장 한 장을 뒤집는다 — 그 자리의 카드가 내 것. 고를 수 있는 수를 다 썼으면 'done' */
  function pickReward(data, profile, st, index) {
    var o = st.outcome;
    if (!o) return { ok: false, why: 'phase' };
    if (o.taken.length >= o.picks) return { ok: false, why: 'done' };
    if (index < 0 || index >= o.pool.length || index !== Math.floor(index)) return { ok: false, why: 'index' };
    if (o.taken.indexOf(index) >= 0) return { ok: false, why: 'taken' };
    o.taken.push(index);
    if (profile.owned.indexOf(o.pool[index]) < 0) profile.owned.push(o.pool[index]);
    return { ok: true, id: o.pool[index] };
  }
  /* 안 뒤집은 몫을 자동으로 — 로비로 갈 때. 뒤집은 카드 id 를 돌려준다 */
  function finishRewards(data, profile, st) {
    var o = st.outcome, got = [], left, r;
    if (!o) return got;
    while (o.taken.length < o.picks) {
      left = []; for (r = 0; r < o.pool.length; r++) if (o.taken.indexOf(r) < 0) left.push(r);
      if (!left.length) break;
      r = pickReward(data, profile, st, left[randInt(st, left.length)]);
      if (!r.ok) break;
      got.push(r.id);
    }
    return got;
  }
  /* 화면용 전적 보기 */
  function statsView(data, profile) {
    var s = (upgradeProfile(profile)).stats, out, i, m, k, list = [];
    function row(table, key) { var e = table[key] || { games: 0, win: 0 }; return { games: e.games, win: e.win }; }
    out = { line: { games: s.games, win: s.win, lose: s.lose, draw: s.draw, streak: s.streak, best: s.bestStreak },
      byBoss: [], byLevel: [], byMain: [], bestRound: s.bestRound, avgRounds: s.games ? Math.round(s.rounds / s.games * 10) / 10 : null,
      cards: [], factions: [] };
    for (i = 0; i < data.duel.bosses.length; i++) {
      m = data.duel.bosses[i].myth; k = row(s.byBoss, m); k.myth = m; out.byBoss.push(k);
      k = row(s.byMain, m); k.myth = m; out.byMain.push(k);
      if (s.factions[m]) out.factions.push({ myth: m, n: s.factions[m] });
    }
    for (i = 0; i < LEVELS.length; i++) { k = row(s.byLevel, LEVELS[i]); k.level = LEVELS[i]; out.byLevel.push(k); }
    for (k in s.cards) list.push({ id: k, played: s.cards[k].played, won: s.cards[k].won, rate: s.cards[k].played >= 5 ? s.cards[k].won / s.cards[k].played : null });
    list.sort(function (a, b) { return b.played - a.played || (a.id < b.id ? -1 : 1); });
    out.cards = list;
    return out;
  }

  /* ── 자동 채우기 — 규칙을 지키며 센 카드부터. 넘치면 약한 것(주 권 아닌 것)부터 뺀다 ── */
  function autoFill(data, profile) {
    var D = cardsOf(data), out = { ok: false, added: [], removed: [] }, seen = {}, keep = [], i, id, c, cnt, cands, k, s;
    function counts(deck) {
      var n = { main: 0, hero: 0, weather: 0 }, j, x;
      for (j = 0; j < deck.length; j++) { x = D.cards[deck[j]]; if (x.myth === profile.main) n.main++; if (x.hero) n.hero++; if (x.variant === 'weather') n.weather++; }
      return n;
    }
    /* 모르는 카드·안 가진 카드·겹친 카드는 먼저 뺀다 */
    for (i = 0; i < profile.deck.length; i++) {
      id = profile.deck[i];
      if (!D.cards[id] || profile.owned.indexOf(id) < 0 || seen[id]) { out.removed.push(id); continue; }
      seen[id] = 1; keep.push(id);
    }
    profile.deck = keep;
    /* 넘침·상한 — 약한 것부터, 주 권 아닌 것부터 */
    function weakestFirst(a, b) {
      var x = D.cards[a], y = D.cards[b], mx = x.myth === profile.main ? 1 : 0, my = y.myth === profile.main ? 1 : 0;
      return (mx - my) || (x.power - y.power) || a.localeCompare(b);
    }
    function drop(filter) {
      var list = profile.deck.filter(filter).sort(weakestFirst);
      if (!list.length) return false;
      profile.deck.splice(profile.deck.indexOf(list[0]), 1); out.removed.push(list[0]);
      return true;
    }
    cnt = counts(profile.deck);
    while (cnt.hero > HERO_MAX && drop(function (x) { return D.cards[x].hero; })) cnt = counts(profile.deck);
    while (cnt.weather > WEATHER_MAX && drop(function (x) { return D.cards[x].variant === 'weather'; })) cnt = counts(profile.deck);
    while (profile.deck.length > DECK && drop(function () { return true; })) { /* 약한 것부터 */ }
    /* 모자람 — 주 권 15 를 먼저, 그 다음 아무거나. 센 카드부터, 상한은 지킨다 */
    cands = profile.owned.filter(function (x) { return D.cards[x] && profile.deck.indexOf(x) < 0; });
    cands.sort(function (a, b) { return (D.cards[b].power - D.cards[a].power) || a.localeCompare(b); });
    function fits(x) {
      c = D.cards[x]; cnt = counts(profile.deck);
      return !(c.hero && cnt.hero >= HERO_MAX) && !(c.variant === 'weather' && cnt.weather >= WEATHER_MAX);
    }
    for (k = 0; k < 2 && profile.deck.length < DECK; k++) {
      for (i = 0; i < cands.length && profile.deck.length < DECK; i++) {
        s = cands[i];
        if (profile.deck.indexOf(s) >= 0 || !fits(s)) continue;
        if (k === 0 && (D.cards[s].myth !== profile.main || counts(profile.deck).main >= MAIN_MIN)) continue;
        profile.deck.push(s); out.added.push(s);
      }
    }
    out.ok = validateDeck(data, profile).ok;
    return out;
  }

  var api = {
    VERSION: VERSION, DECK: DECK, HAND: HAND, MULLIGAN: MULLIGAN, LIVES: LIVES, MAX_ROUNDS: MAX_ROUNDS,
    MAIN_MIN: MAIN_MIN, HERO_MAX: HERO_MAX, WEATHER_MAX: WEATHER_MAX, FIRST_BONUS: FIRST_BONUS, REWARD_POOL: REWARD_POOL, REWARD_PICKS: REWARD_PICKS, REWARD_MIX: REWARD_MIX, ROWS: ROWS, LEVELS: LEVELS, VARIANTS: VARIANTS,
    ABILITY: ABILITY, ABILITIES: ABILITIES, rand: rand, randInt: randInt, shuffle: shuffle, derive: derive,
    cardsOf: cardsOf, emptyStats: emptyStats, newProfile: newProfile, upgradeProfile: upgradeProfile, collectionMax: collectionMax,
    validateDeck: validateDeck, toggleDeck: toggleDeck, setMain: setMain, autoFill: autoFill, bossOf: bossOf, bossDeck: bossDeck,
    newMatch: newMatch, mulligan: mulligan, confirm: confirm, other: other, legal: legal, play: play, pass: pass, scores: scores, makeUnit: makeUnit,
    FACTION: FACTION, useFaction: useFaction,
    evaluate: evaluate, aiMove: aiMove, aiTurn: aiTurn, settle: settle, pickReward: pickReward, finishRewards: finishRewards, winsOf: winsOf, conquered: conquered, statsView: statsView
  };
  root.AtelierDuel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
