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

  var api = {
    VERSION: VERSION, DECK: DECK, HAND: HAND, MULLIGAN: MULLIGAN, LIVES: LIVES, MAX_ROUNDS: MAX_ROUNDS,
    MAIN_MIN: MAIN_MIN, HERO_MAX: HERO_MAX, WEATHER_MAX: WEATHER_MAX, ROWS: ROWS, LEVELS: LEVELS, VARIANTS: VARIANTS,
    ABILITY: ABILITY, ABILITIES: ABILITIES, rand: rand, randInt: randInt, shuffle: shuffle, derive: derive
  };
  root.AtelierDuel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
