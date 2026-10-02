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

  var api = {
    VERSION: VERSION, DECK: DECK, HAND: HAND, MULLIGAN: MULLIGAN, LIVES: LIVES, MAX_ROUNDS: MAX_ROUNDS,
    MAIN_MIN: MAIN_MIN, HERO_MAX: HERO_MAX, WEATHER_MAX: WEATHER_MAX, ROWS: ROWS, LEVELS: LEVELS, VARIANTS: VARIANTS,
    ABILITY: ABILITY, ABILITIES: ABILITIES, rand: rand, randInt: randInt, shuffle: shuffle, derive: derive,
    cardsOf: cardsOf, emptyStats: emptyStats, newProfile: newProfile, upgradeProfile: upgradeProfile, collectionMax: collectionMax,
    validateDeck: validateDeck, toggleDeck: toggleDeck, setMain: setMain, bossOf: bossOf, bossDeck: bossDeck
  };
  root.AtelierDuel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
