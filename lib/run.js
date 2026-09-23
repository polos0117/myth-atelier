/* 던전 — 로그라이크 덱빌딩. 무기 셋을 동료로 데려가 아홉 칸의 길을 간다.
   카드는 무기가 준다(종류 공통 셋 + 고유 기술 하나). 덱은 길 내내 이어지고, 싸움을 이기면 금화와 전리품
   카드 한 장, 상점에서는 사고·빼고·치유하고·저주를 푼다. 각성은 한 싸움에서 그 무기 카드를 넉 장 쓰면
   켜지고(제단이면 영구), 저주는 저주의 문이나 피가 낮을 때 받아들인다(영구). 셋 다 규칙이지 카드가 아니다.

   엔진은 화면을 모른다. 상태는 통째로 JSON 이라 그대로 저장한다. 난수는 mulberry32, state.rngState 하나.
   window.AtelierRun 또는 module.exports 로 나간다 — 검사는 node 에서 돈다. */
(function (root) {
  'use strict';

  function rand(st) {
    st.rngState = (st.rngState + 0x6D2B79F5) | 0;
    var t = st.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(st, n) { return Math.floor(rand(st) * n); }
  function cardOf(data, name) {
    if (!data._byName) { data._byName = {}; data.cards.forEach(function (c) { data._byName[c.name] = c; }); }
    return data._byName[name];
  }
  function tune(data) { return data.run.tune; }
  function loot(data) { return data.run.loot; }
  function shopCfg(data) { return data.run.shop; }
  function nodes(data) { return data.run.nodes; }

  /* ── 동료 — 무기 하나, 드래프트에서 왔으면 주인이 붙는다.
     주인의 힘이 체력·위력을 보정하고(×0.8~1.17), 원래 주인이면 각성 게이지가 넷 아닌 셋,
     손에 익은 종류면 위력 +10%, 파티 안에 악연이 있으면 저주를 45%부터 묻고 거절이 안 된다 ── */
  function wielderOf(data, name) {
    if (!name || !data.wielders) return null;
    for (var i = 0; i < data.wielders.length; i++) if (data.wielders[i].name === name) return data.wielders[i];
    return null;
  }
  function feudBetween(data, a, b) {
    var cs = (data.draft && data.draft.combo) || [], i, k;
    for (i = 0; i < cs.length; i++) {
      var neg = false; for (k in cs[i].t) if (cs[i].t[k] < 0) neg = true;
      if (neg && cs[i].m.indexOf(a) >= 0 && cs[i].m.indexOf(b) >= 0) return true;
    }
    return false;
  }
  function member(data, name, owner) {
    var c = cardOf(data, name), o = wielderOf(data, owner), T = tune(data);
    var k = o ? 0.8 + Math.round(o.might * 0.4 + o.art * 0.35 + o.divine * 0.25) / 250 : 1;
    var hp = Math.round(c.hp / T.partyHpDiv * k);
    return { name: name, wielder: o ? o.name : null, hp: hp, maxHp: hp, alive: true, awakened: false, cursed: false, offered: false, shield: 0, buff: 0,
      mult: +(k * (o && o.favor === c.kind ? 1.1 : 1)).toFixed(3), gaugeMax: o && c.wielder === o.name ? T.gauge - 1 : T.gauge, feud: false };
  }
  function stateOf(st, m) {
    if (m.cursed) return 'cursed';
    if (m.awakened || (st.battle && st.battle.awake[m.name])) return 'awaken';
    return 'base';
  }
  function living(st) { return st.party.filter(function (m) { return m.alive; }); }

  /* names: 무기 이름 셋. opt(드래프트에서 올 때): pairs [{w,o}] 셋, reserve [{w,o}] 예비, foes [{w,o}] 상대 차례, boss {w,o}, rank 0~2 */
  function newRun(data, seed, names, opt) {
    opt = opt || {};
    var pairs = opt.pairs || (names || []).map(function (n) { return { w: n, o: null }; });
    if (pairs.length !== 3) throw new Error('party');
    var st = { seed: seed | 0, rngState: seed | 0, node: -1, phase: 'map', battle: null, log: [], party: [],
      reserve: (opt.reserve || []).slice(), foes: (opt.foes || []).slice(), boss: opt.boss || null, rank: opt.rank === undefined ? null : opt.rank, fromDraft: !!opt.pairs };
    pairs.forEach(function (p) { st.party.push(member(data, p.w, p.o)); });
    st.gold = loot(data).start; st.deck = []; st.reward = null; st.shop = null;
    st.party.forEach(function (m) { st.deck = st.deck.concat(cardsFor(data, m)); });
    markFeud(data, st);
    return st;
  }
  function markFeud(data, st) {
    st.party.forEach(function (m) {
      m.feud = false;
      st.party.forEach(function (n) { if (n !== m && m.wielder && n.wielder && feudBetween(data, m.wielder, n.wielder)) m.feud = true; });
    });
  }
  function nodeType(data, i) { return nodes(data)[i]; }
  /* 덱·금화가 없던 때 저장된 길 — 그때의 동료로 덱을 만든다 */
  function ensure(st, data) {
    if (!st.deck) { st.deck = []; st.party.forEach(function (m) { if (m.alive) st.deck = st.deck.concat(cardsFor(data, m)); }); }
    if (typeof st.gold !== 'number') st.gold = loot(data).start;
  }

  /* 다음 칸으로 — 칸의 종류가 곧 화면이다 */
  function proceed(st, data) {
    if (st.phase !== 'map' && st.phase !== 'result') return { ok: false, why: 'phase' };
    ensure(st, data);
    st.node += 1; st.reward = null; st.shop = null;
    var kind = nodeType(data, st.node);
    if (!kind) { st.phase = 'won'; return { ok: true, kind: 'won' }; }
    st.log = [];
    /* 예비 — 쓰러진 동료 자리에 다음 칸부터 예비가 올라온다 */
    for (var i = 0; i < st.party.length; i++) if (!st.party[i].alive && st.reserve.length) {
      var nx = st.reserve.shift(), fresh = member(data, nx.w, nx.o), gone = st.party[i].name;
      st.log.push({ k: 'reserve', a: fresh.name, b: gone });
      st.party[i] = fresh;
      /* 쓰러진 무기의 카드는 빠지고 올라온 무기의 넉 장이 들어온다 */
      st.deck = st.deck.filter(function (c) { return c.owner !== gone; }).concat(cardsFor(data, fresh));
    }
    markFeud(data, st);
    if (kind === 'fight' || kind === 'boss') startBattle(st, data, kind === 'boss');
    else if (kind === 'shop') openShop(st, data);
    else st.phase = kind;
    return { ok: true, kind: kind };
  }

  /* ── 상대 ── */
  var RANK_HP = [0.9, 1.0, 1.2];
  function enemy(data, name, node, boss, owner, rank) {
    var c = cardOf(data, name), T = tune(data), o = wielderOf(data, owner);
    var k = o ? 0.8 + Math.round(o.might * 0.4 + o.art * 0.35 + o.divine * 0.25) / 250 : 1;
    var r = rank === null || rank === undefined ? 1 : RANK_HP[rank];
    var hp = Math.round(c.hp / T.enemyHpDiv * (1 + T.enemyHpPerNode * node) * (boss ? T.bossHp : 1) * k * r);
    var atk = Math.round(c.atk * T.enemyAtk * (1 + T.enemyAtkPerNode * node) * (boss ? T.bossAtk : 1) * k);
    return { name: name, wielder: o ? o.name : null, hp: hp, maxHp: hp, atk: atk, skill: c.skill, alive: true, stunned: false, acts: 0, boss: !!boss };
  }
  function pickEnemies(st, data, boss) {
    var node = st.node, n0 = boss ? 2 : (node >= 3 ? 2 : 1), i;
    if (st.fromDraft) {
      var out0 = [];
      if (boss && st.boss) { out0.push(enemy(data, st.boss.w, node, true, st.boss.o, st.rank)); n0 -= 1; }
      for (i = 0; i < n0 && st.foes.length; i++) { var f = st.foes.shift(); out0.push(enemy(data, f.w, node, false, f.o, st.rank)); }
      if (out0.length) return out0;
    }
    var maxCost = boss ? 5 : Math.min(5, 1 + Math.floor(node / 2)), minCost = boss ? 5 : Math.max(1, maxCost - 1);
    var mine = {}; st.party.forEach(function (m) { mine[m.name] = 1; });
    var pool = data.cards.filter(function (c) { return c.cost >= minCost && c.cost <= maxCost && !mine[c.name]; });
    var out = [], n = boss ? 2 : (node >= 3 ? 2 : 1), i, c;
    /* 그림 있는 무기가 먼저 — 화면이 아는 목록(data.art)이 있고 그걸로 채울 수 있으면 */
    if (data.art) { var drawn = pool.filter(function (c) { return data.art[c.name]; }); if (drawn.length >= n) pool = drawn; }
    for (i = 0; i < n && pool.length; i++) {
      c = pool.splice(randInt(st, pool.length), 1)[0];
      out.push(enemy(data, c.name, node, boss && i === 0));
    }
    return out;
  }

  /* ── 덱 ── */
  function cardsFor(data, m) {
    var c = cardOf(data, m.name), list = data.run.cards[c.kind].filter(function (k) { return k.basic; }).map(function (k) {
      return { key: k.key, owner: m.name };
    });
    list.push({ key: 'skill:' + c.skill, owner: m.name });
    return list;
  }
  /* 카드의 뜻 — 공통 카드는 run.json 에서, 고유 기술은 skill.json 을 카드 꼴로 옮겨서 */
  function spec(data, card) {
    var i, k, kinds = data.run.cards;
    if (card.key.indexOf('skill:') === 0) {
      var sk = data.skills[card.key.slice(6)], s = { key: card.key, name: sk.name, text: sk.text, cost: 2, unique: true };
      switch (sk.effect) {
        case 'strike': case 'execute': case 'drain': case 'pierce': case 'stun':
          s.mult = Math.min(2.2, sk.mult || 1) * (sk.crit ? 1.2 : 1); s.hits = Math.min(3, sk.hits || 1);
          if (sk.effect === 'pierce') s.all = true;
          if (sk.effect === 'stun') s.stun = true;
          if (sk.effect === 'execute') s.execute = sk.threshold || 0.35;
          if (sk.effect === 'drain') s.drain = sk.ratio || 0.5;
          break;
        case 'sweep': case 'volley':
          s.mult = Math.min(1.6, sk.mult || 1); s.all = true; break;
        case 'heal': s.heal = 0.25; break;
        case 'shield': s.shield = 0.4; break;
        case 'buff': s.buff = 0.3; break;
        case 'rally': s.rally = 0.2; break;
        case 'haste': s.draw = 2; break;
      }
      return s;
    }
    for (k in kinds) for (i = 0; i < kinds[k].length; i++) if (kinds[k][i].key === card.key) return kinds[k][i];
    return null;
  }
  function shuffle(st, list) {
    var i, j, t;
    for (i = list.length - 1; i > 0; i--) { j = randInt(st, i + 1); t = list[i]; list[i] = list[j]; list[j] = t; }
    return list;
  }
  function draw(st, data, n) {
    var b = st.battle, i;
    for (i = 0; i < n; i++) {
      if (!b.deck.length) { if (!b.discard.length) return; b.deck = shuffle(st, b.discard); b.discard = []; }
      if (b.hand.length >= tune(data).hand + 2) return;
      b.hand.push(b.deck.pop());
    }
  }

  function startBattle(st, data, boss) {
    var deck = [], id = 1, here = {};
    ensure(st, data);
    living(st).forEach(function (m) { m.shield = 0; m.buff = 0; here[m.name] = 1; });
    st.deck.forEach(function (c) { if (here[c.owner]) deck.push({ key: c.key, owner: c.owner, id: id++ }); });
    st.battle = { boss: !!boss, enemies: pickEnemies(st, data, boss), deck: shuffle(st, deck), hand: [], discard: [], mana: tune(data).mana,
      turn: 1, gauge: {}, awake: {}, ask: null, rally: 0, over: null };
    st.party.forEach(function (m) { st.battle.gauge[m.name] = 0; st.battle.awake[m.name] = !!m.awakened; });
    draw(st, data, tune(data).hand);
    st.phase = 'battle';
    st.log.push({ k: 'start', boss: !!boss, enemies: st.battle.enemies.map(function (e) { return e.name; }) });
  }

  /* ── 카드 내기 ── */
  function mult(st, data, m) {
    var c = cardOf(data, m.name), x = (m.mult || 1) * (1 + (m.buff || 0) + (st.battle.rally || 0));
    if (st.battle.awake[m.name]) x *= tune(data).awakenMult;
    if (m.cursed) x *= 1 + (c.curse ? c.curse.atk : 0.35);
    return x;
  }
  function hitEnemy(st, e, d, log, who) {
    d = Math.max(1, Math.round(d));
    e.hp = Math.max(0, e.hp - d);
    log.push({ k: 'hit', a: who, b: e.name, d: d });
    if (e.hp === 0 && e.alive) { e.alive = false; log.push({ k: 'down', b: e.name }); }
  }
  function foes(st) { return st.battle.enemies.filter(function (e) { return e.alive; }); }
  function play(st, data, handIndex, targetIndex) {
    var b = st.battle, T = tune(data);
    if (st.phase !== 'battle' || !b || b.over) return { ok: false, why: 'phase' };
    if (b.ask) return { ok: false, why: 'ask' };
    var card = b.hand[handIndex];
    if (!card) return { ok: false, why: 'card' };
    var m = st.party.filter(function (p) { return p.name === card.owner; })[0];
    if (!m || !m.alive) return { ok: false, why: 'dead' };
    var s = spec(data, card);
    if (s.cost > b.mana) return { ok: false, why: 'mana' };
    var alive = foes(st), tgt = alive[targetIndex || 0] || alive[0], c = cardOf(data, m.name), base = c.atk * mult(st, data, m), i, list;
    if (!tgt && (s.mult && !s.all)) return { ok: false, why: 'target' };
    b.mana -= s.cost;
    b.hand.splice(handIndex, 1); b.discard.push(card);
    st.log.push({ k: 'play', a: m.name, card: s.key, name: s.name });
    if (m.cursed) { m.hp = Math.max(0, m.hp - 1); st.log.push({ k: 'bleed', a: m.name, d: 1 }); }
    if (s.mult) {
      list = s.all ? alive.slice() : [tgt];
      for (i = 0; i < list.length; i++) {
        var hits = s.hits || 1, h, d;
        for (h = 0; h < hits && list[i].alive; h++) {
          d = base * s.mult;
          if (s.execute && list[i].hp / list[i].maxHp < s.execute) d *= 2;
          hitEnemy(st, list[i], d, st.log, m.name);
          if (s.drain && !m.cursed) { var back = Math.min(m.maxHp - m.hp, Math.round(d * s.drain)); m.hp += back; st.log.push({ k: 'heal', b: m.name, d: back }); }
        }
        if (s.stun && list[i].alive) { list[i].stunned = true; st.log.push({ k: 'stun', b: list[i].name }); }
      }
    }
    if (s.shield && !m.cursed) { m.shield += Math.round(m.maxHp * s.shield); st.log.push({ k: 'shield', b: m.name, d: Math.round(m.maxHp * s.shield) }); }
    if (s.heal) living(st).forEach(function (p) { if (p.cursed) return; var hh = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * s.heal)); p.hp += hh; st.log.push({ k: 'heal', b: p.name, d: hh }); });
    if (s.buff) m.buff = Math.max(m.buff || 0, s.buff);
    if (s.rally) b.rally = Math.max(b.rally, s.rally);
    if (s.draw) draw(st, data, s.draw);
    /* 각성 게이지 — 넉 장이면 이 싸움 동안 깨어난다 */
    if (!b.awake[m.name]) {
      b.gauge[m.name] += 1;
      if (b.gauge[m.name] >= (m.gaugeMax || T.gauge)) { b.awake[m.name] = true; st.log.push({ k: 'awaken', a: m.name }); }
    }
    if (m.hp === 0) fall(st, m);
    return settle(st, data) || { ok: true };
  }
  function fall(st, m) { if (m.alive) { m.alive = false; m.hp = 0; st.log.push({ k: 'fall', b: m.name }); } }

  /* 싸움이 끝났나 — 상대가 다 쓰러지면 이김, 동료가 다 쓰러지면 짐 */
  function settle(st, data) {
    var b = st.battle, T = tune(data);
    if (!foes(st).length) {
      b.over = 'win';
      living(st).forEach(function (p) { if (!p.cursed) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * T.winHeal)); p.shield = 0; p.buff = 0; });
      st.log.push({ k: 'win', boss: b.boss });
      st.phase = b.boss ? 'won' : 'result';
      if (!b.boss) {
        var L = loot(data), g = L.fight + L.perNode * st.node + randInt(st, L.spread + 1);
        st.gold = (st.gold || 0) + g;
        st.reward = { gold: g, cards: offers(st, data, L.choices), taken: null };
        st.log.push({ k: 'gold', d: g });
      }
      return { ok: true, over: 'win' };
    }
    if (!living(st).length) { b.over = 'lose'; st.phase = 'lost'; st.log.push({ k: 'lose' }); return { ok: true, over: 'lose' }; }
    return null;
  }

  /* ── 턴 끝 — 상대가 친다. 그 뒤 피가 낮은 동료에게 저주를 묻는다 ── */
  function endTurn(st, data) {
    var b = st.battle, T = tune(data), i, e, list, tgt, d, real;
    if (st.phase !== 'battle' || !b || b.over) return { ok: false, why: 'phase' };
    if (b.ask) return { ok: false, why: 'ask' };
    list = foes(st);
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.stunned) { e.stunned = false; st.log.push({ k: 'skip', a: e.name }); continue; }
      e.acts += 1;
      var alive = living(st);
      if (!alive.length) break;
      var skill = e.acts % T.skillEvery === 0;
      var victims = skill ? alive : [alive[randInt(st, alive.length)]];
      for (var v = 0; v < victims.length; v++) {
        tgt = victims[v];
        d = Math.round(e.atk * (skill ? T.skillMult * (victims.length > 1 ? 0.7 : 1) : 1));
        real = d;
        if (tgt.shield > 0) { var ab = Math.min(tgt.shield, d); tgt.shield -= ab; real = d - ab; }
        tgt.hp = Math.max(0, tgt.hp - real);
        st.log.push({ k: skill ? 'eskill' : 'ehit', a: e.name, b: tgt.name, d: real, skill: skill ? e.skill : undefined });
        if (tgt.hp === 0) fall(st, tgt);
      }
    }
    var over = settle(st, data);
    if (over) return over;
    b.turn += 1; b.mana = T.mana;
    b.discard = b.discard.concat(b.hand); b.hand = [];
    draw(st, data, T.hand);
    /* 저주를 묻는다 — 한 동료에게 한 번만 */
    var low = living(st).filter(function (p) { return !p.cursed && !p.offered && p.hp / p.maxHp < (p.feud ? T.curseAt + 0.1 : T.curseAt); })[0];
    if (low) { low.offered = true; b.ask = low.name; st.log.push({ k: 'ask', a: low.name, feud: !!low.feud }); }
    return { ok: true, turn: b.turn };
  }
  function answerCurse(st, data, accept) {
    var b = st.battle;
    if (!b || !b.ask) return { ok: false, why: 'ask' };
    var m = st.party.filter(function (p) { return p.name === b.ask; })[0];
    if (!accept && m.feud) return { ok: false, why: 'feud' };   /* 악연은 거절이 안 된다 */
    b.ask = null;
    if (accept) { m.cursed = true; m.shield = 0; st.log.push({ k: 'curse', a: m.name }); }
    return { ok: true, cursed: !!accept };
  }

  /* ── 제단 · 저주의 문 · 휴식 ── */
  function chooseShrine(st, data, name) {
    if (st.phase !== 'shrine') return { ok: false, why: 'phase' };
    var m = st.party.filter(function (p) { return p.name === name && p.alive && !p.awakened; })[0];
    if (!m) return { ok: false, why: 'who' };
    m.awakened = true; st.log.push({ k: 'shrine', a: name }); st.phase = 'map';
    return { ok: true };
  }
  function chooseGate(st, data, name) {
    if (st.phase !== 'gate') return { ok: false, why: 'phase' };
    if (name) {
      var m = st.party.filter(function (p) { return p.name === name && p.alive && !p.cursed; })[0];
      if (!m) return { ok: false, why: 'who' };
      m.cursed = true; st.log.push({ k: 'gate', a: name });
    } else st.log.push({ k: 'gate' });
    st.phase = 'map';
    return { ok: true };
  }
  function rest(st, data) {
    if (st.phase !== 'rest') return { ok: false, why: 'phase' };
    var T = tune(data);
    living(st).forEach(function (p) { if (!p.cursed) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * T.restHeal)); });
    st.log.push({ k: 'rest' }); st.phase = 'map';
    return { ok: true };
  }

  /* ── 전리품 · 상점 ──
     나오는 카드는 산 동료의 종류 카드 중 basic 이 아닌 것 — 들고 온 기본기보다 마나당 세야 덱이 좋아진다.
     희귀는 무게가 작다(rareWeight). 한 번에 같은 카드·같은 주인은 두 번 안 나온다. */
  function offers(st, data, n) {
    var L = loot(data), pool = [], out = [], tot, r, j;
    living(st).forEach(function (m) {
      data.run.cards[cardOf(data, m.name).kind].forEach(function (k) {
        if (k.basic) return;
        pool.push({ key: k.key, owner: m.name, rare: !!k.rare, w: k.rare ? L.rareWeight : L.commonWeight });
      });
    });
    while (out.length < n && pool.length) {
      tot = 0; pool.forEach(function (x) { tot += x.w; });
      r = rand(st) * tot;
      for (j = 0; j < pool.length - 1; j++) { r -= pool[j].w; if (r < 0) break; }
      var x = pool.splice(j, 1)[0];
      out.push({ key: x.key, owner: x.owner, rare: x.rare });
    }
    return out;
  }
  function takeReward(st, data, i) {
    if (st.phase !== 'result' || !st.reward) return { ok: false, why: 'phase' };
    if (st.reward.taken !== null) return { ok: false, why: 'once' };
    var c = st.reward.cards[i];
    if (!c) return { ok: false, why: 'card' };
    st.deck.push({ key: c.key, owner: c.owner }); st.reward.taken = i;
    st.log.push({ k: 'take', a: c.owner, name: spec(data, c).name });
    return { ok: true };
  }
  function openShop(st, data) {
    var S = shopCfg(data);
    st.shop = { cards: offers(st, data, S.cards).map(function (c) { c.price = c.rare ? S.rare : S.common; c.sold = false; return c; }),
      removed: false, healed: false, purified: false };
    st.phase = 'shop';
  }
  function pay(st, n) { if (st.gold < n) return false; st.gold -= n; return true; }
  function buy(st, data, i) {
    if (st.phase !== 'shop') return { ok: false, why: 'phase' };
    var c = st.shop.cards[i];
    if (!c || c.sold) return { ok: false, why: 'card' };
    if (!pay(st, c.price)) return { ok: false, why: 'gold' };
    c.sold = true; st.deck.push({ key: c.key, owner: c.owner });
    st.log.push({ k: 'buy', a: c.owner, name: spec(data, c).name, d: c.price });
    return { ok: true };
  }
  /* 한 장 빼기 — 무기마다 한 장은 남는다(각성 게이지가 그 무기 카드에 걸려 있다) */
  function removeCard(st, data, deckIndex) {
    var S = shopCfg(data), c = st.deck[deckIndex];
    if (st.phase !== 'shop') return { ok: false, why: 'phase' };
    if (st.shop.removed) return { ok: false, why: 'once' };
    if (!c) return { ok: false, why: 'card' };
    if (st.deck.filter(function (x) { return x.owner === c.owner; }).length <= 1) return { ok: false, why: 'last' };
    if (!pay(st, S.remove)) return { ok: false, why: 'gold' };
    st.deck.splice(deckIndex, 1); st.shop.removed = true;
    st.log.push({ k: 'remove', a: c.owner, name: spec(data, c).name, d: S.remove });
    return { ok: true };
  }
  function shopHeal(st, data) {
    var S = shopCfg(data);
    if (st.phase !== 'shop') return { ok: false, why: 'phase' };
    if (st.shop.healed) return { ok: false, why: 'once' };
    var need = living(st).filter(function (p) { return !p.cursed && p.hp < p.maxHp; });
    if (!need.length) return { ok: false, why: 'none' };
    if (!pay(st, S.heal)) return { ok: false, why: 'gold' };
    need.forEach(function (p) { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * S.healRatio)); });
    st.shop.healed = true; st.log.push({ k: 'shopheal', d: S.heal });
    return { ok: true };
  }
  /* 정화 — 저주를 푼다. 한 번 물었던 동료는 다시 안 묻는다(offered 가 남는다). 저주의 문은 다시 받을 수 있다 */
  function purify(st, data, name) {
    var S = shopCfg(data);
    if (st.phase !== 'shop') return { ok: false, why: 'phase' };
    if (st.shop.purified) return { ok: false, why: 'once' };
    var m = st.party.filter(function (p) { return p.name === name && p.alive && p.cursed; })[0];
    if (!m) return { ok: false, why: 'who' };
    if (!pay(st, S.purify)) return { ok: false, why: 'gold' };
    m.cursed = false; st.shop.purified = true; st.log.push({ k: 'purify', a: name, d: S.purify });
    return { ok: true };
  }
  function leaveShop(st) {
    if (st.phase !== 'shop') return { ok: false, why: 'phase' };
    st.phase = 'map';
    return { ok: true };
  }

  var api = { wielderOf: wielderOf, feudBetween: feudBetween, newRun: newRun, proceed: proceed, play: play, endTurn: endTurn, answerCurse: answerCurse,
    chooseShrine: chooseShrine, chooseGate: chooseGate, rest: rest,
    takeReward: takeReward, buy: buy, removeCard: removeCard, shopHeal: shopHeal, purify: purify, leaveShop: leaveShop, ensure: ensure, spec: spec, cardsFor: cardsFor, stateOf: stateOf,
    nodeType: nodeType, nodes: nodes, tune: tune, living: living, foes: foes, cardOf: cardOf, rand: rand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AtelierRun = api;
})(typeof window !== 'undefined' ? window : globalThis);
