/* 신기 드래프트 — 우리 근본. 세 편(나·적 둘)이 열두 라운드에 걸쳐 무기 여섯과 주인 여섯을 팩에서 집어
   짝을 짓는다. 짝은 무기 힘 × 주인 힘 × 궁합. 같은 신화권·같은 종류가 모이면 결속, 이름으로 맺힌 것은
   인연(전용·연대·악연). 팩은 아홉 장, 안 집은 것은 버림패로 돌아가 다시 섞인다. 보급은 팩을 물리는 것.

   건담 드래프트(atelier/gundam/draft-engine.js)의 규칙을 옮겼다 — 함·지휘관은 없고 정원도 없다.
   엔진은 화면을 모른다. 상태는 통째로 JSON. 난수는 mulberry32, state.rngState 하나.
   AI 세 단계: 신참(가끔 헛발질, 인연을 못 본다)·숙련(전용 인연은 본다)·에이스(다 보고, 한 장이면 터질 인연을 내다보며 팩을 물린다). */
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

  function index(data) {
    if (!data._draft) {
      var w = {}, o = {}, i;
      for (i = 0; i < data.cards.length; i++) w[data.cards[i].name] = data.cards[i];
      for (i = 0; i < data.wielders.length; i++) o[data.wielders[i].name] = data.wielders[i];
      data._draft = { weapon: w, wielder: o };
    }
    return data._draft;
  }
  function weapon(data, n) { return index(data).weapon[n]; }
  function wielder(data, n) { return index(data).wielder[n]; }

  /* ── 힘 — 무기는 카드 수치에서, 주인은 세 능력에서. 둘 다 40~100 언저리 ── */
  function wp(c) { return Math.round(c.hp / 9 * 0.35 + c.atk * 0.45 + (2 - c.spd) * 20 * 0.2 + c.cost * 3); }
  function pw(o) { return Math.round(o.might * 0.4 + o.art * 0.35 + o.divine * 0.25); }
  /* 궁합 — 같은 신화권 1.0, 아니면 0.8. 손에 익은 종류면 +0.1. 원래 주인이면 ×1.35 */
  function sync(c, o) {
    var s = c.myth === o.myth ? 1.0 : 0.8;
    if (o.favor === c.kind) s += 0.1;
    if (c.wielder === o.name) s *= 1.35;
    return +s.toFixed(3);
  }
  function pairScore(c, o) { return (wp(c) / 100) * (pw(o) / 100) * sync(c, o) * 100; }

  /* ── 짝 배정 — 여섯 × 여섯이면 720 가지뿐이라 다 세어 본다. 그보다 크면 탐욕 ── */
  function assign(data, team) {
    var W = team.weapon.map(function (n) { return weapon(data, n); }), O = team.wielder.map(function (n) { return wielder(data, n); });
    var nw = W.length, no = O.length, i, j, S = [], out = [];
    for (i = 0; i < nw; i++) { S[i] = []; for (j = 0; j < no; j++) S[i][j] = pairScore(W[i], O[j]); }
    var pick = [], best = -1, small = Math.min(nw, no), ways = 1;
    for (i = 0; i < small; i++) ways *= (Math.max(nw, no) - i);
    if (nw && no && ways <= 5040) {
      var cur = [], used = {};
      (function go(i2, sum) {
        if (i2 === nw) { if (sum > best) { best = sum; pick = cur.slice(); } return; }
        var any = false;
        for (var j2 = 0; j2 < no; j2++) if (!used[j2]) { any = true; used[j2] = 1; cur[i2] = j2; go(i2 + 1, sum + S[i2][j2]); used[j2] = 0; }
        if (!any) { cur[i2] = -1; go(i2 + 1, sum); }
      })(0, 0);
    } else {
      var takenJ = {}; pick = [];
      for (i = 0; i < nw; i++) pick[i] = -1;
      var pairs = [];
      for (i = 0; i < nw; i++) for (j = 0; j < no; j++) pairs.push([S[i][j], i, j]);
      pairs.sort(function (a, b) { return b[0] - a[0]; });
      for (i = 0; i < pairs.length; i++) if (pick[pairs[i][1]] < 0 && !takenJ[pairs[i][2]]) { pick[pairs[i][1]] = pairs[i][2]; takenJ[pairs[i][2]] = 1; }
    }
    var taken = {};
    for (i = 0; i < nw; i++) if (pick[i] >= 0) { out.push({ s: S[i][pick[i]], w: W[i].name, o: O[pick[i]].name, sync: sync(W[i], O[pick[i]]) }); taken[pick[i]] = 1; }
    out.sort(function (a, b) { return b.s - a.s; });
    for (i = 0; i < nw; i++) if (pick[i] < 0) out.push({ s: wp(W[i]) * 0.35, w: W[i].name, o: null });
    for (j = 0; j < no; j++) if (!taken[j]) out.push({ s: pw(O[j]) * 0.35, w: null, o: O[j].name });
    return out;
  }

  /* ── 결속 — 신화권은 무기·주인 모두, 종류는 무기만 ── */
  function synergy(data, team) {
    var myth = {}, kind = {}, i, k, rows = [], tot = 0;
    team.weapon.forEach(function (n) { var c = weapon(data, n); myth[c.myth] = (myth[c.myth] || 0) + 1; kind[c.kind] = (kind[c.kind] || 0) + 1; });
    team.wielder.forEach(function (n) { var o = wielder(data, n); myth[o.myth] = (myth[o.myth] || 0) + 1; });
    for (k in myth) if (myth[k] >= 2) { var v = data.draft.syn[Math.min(myth[k], 8)] || 154; rows.push({ axis: 'myth', key: k, n: myth[k], v: v }); tot += v; }
    for (k in kind) if (kind[k] >= 2) { var v2 = data.draft.kindSyn[Math.min(kind[k], 6)] || 80; rows.push({ axis: 'kind', key: k, n: kind[k], v: v2 }); tot += v2; }
    rows.sort(function (a, b) { return b.v - a.v; });
    return { rows: rows, total: tot };
  }
  /* ── 인연 — 이름으로 맺힌 것. 무기든 주인이든 ── */
  function pledges(data, team) {
    var names = {}, out = [], i, j, k;
    team.weapon.concat(team.wielder).forEach(function (n) { names[n] = 1; });
    for (i = 0; i < data.draft.combo.length; i++) {
      var cb = data.draft.combo[i], hit = 0, got = [];
      for (j = 0; j < cb.m.length; j++) if (names[cb.m[j]]) { hit++; got.push(cb.m[j]); }
      var best = 0, bk = 0;
      for (k in cb.t) if (hit >= +k && +k >= bk) { bk = +k; best = cb.t[k]; }
      if (best) out.push({ n: cb.n, v: best, got: got, need: cb.m, feud: best < 0, own: !!cb.own });
    }
    return out;
  }
  /* 한 장만 더 오면 맺어지는 인연 — 에이스가 내다본다 */
  function nearBonus(data, team, name) {
    var names = {}, b = 0, i, j, k;
    team.weapon.concat(team.wielder).forEach(function (n) { names[n] = 1; });
    for (i = 0; i < data.draft.combo.length; i++) {
      var cb = data.draft.combo[i]; if (cb.m.indexOf(name) < 0) continue;
      var hit = 0; for (j = 0; j < cb.m.length; j++) if (names[cb.m[j]]) hit++;
      if (!hit) continue;   /* 아무도 없는 인연은 내다보지 않는다 */
      for (k in cb.t) if (+k === hit + 2 && cb.t[k] > 0) b += cb.t[k] * 0.06;
    }
    return b;
  }

  /* ── 편성 값. see: 0 인연 안 봄 · 1 전용만 · 2 다 봄. 판정과 화면은 늘 2 ── */
  function evaluate(data, team, see) {
    if (see === undefined) see = 2;
    var rows = [], total = 0, i, units = assign(data, team);
    var paired = units.filter(function (u) { return u.w && u.o; }), ps = 0;
    for (i = 0; i < paired.length; i++) ps += paired[i].s;
    rows.push({ k: 'pairs', n: paired.length, v: Math.round(ps) }); total += ps;
    var solo = units.filter(function (u) { return !(u.w && u.o); });
    if (solo.length) { var sv = 0; for (i = 0; i < solo.length; i++) sv += solo[i].s; rows.push({ k: 'solo', n: solo.length, v: Math.round(sv) }); total += sv; }
    var sy = synergy(data, team);
    for (i = 0; i < sy.rows.length; i++) rows.push({ k: 'syn', axis: sy.rows[i].axis, key: sy.rows[i].key, n: sy.rows[i].n, v: Math.round(sy.rows[i].v * 0.6) });
    total += sy.total * 0.6;
    if (see > 0) {
      var pg = pledges(data, team);
      if (see < 2) pg = pg.filter(function (g) { return g.own; });
      for (i = 0; i < pg.length; i++) { var pv = Math.round(pg[i].v * data.draft.pledgeMul); rows.push({ k: pg[i].feud ? 'feud' : 'pledge', name: pg[i].n, v: pv }); total += pv; }
    }
    return { rows: rows, total: Math.round(total), units: units };
  }

  /* ── 판 ── */
  var SEE = [0, 1, 2], RR_K = [0, 0.6, 1.0], RR_BAR = { weapon: 30, wielder: 30 };
  function newTeam() { return { weapon: [], wielder: [] }; }
  function drawPack(st, data, type) {
    var pool = st.pools[type], n = data.draft.pack, out = [], i, j, t;
    if (pool.length < n + 2) { pool = st.pools[type] = pool.concat(st.discard[type]); st.discard[type] = []; }
    for (i = pool.length - 1; i > 0; i--) { j = randInt(st, i + 1); t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (i = 0; i < Math.min(n, pool.length); i++) out.push(pool[i]);
    return out;
  }
  function toDiscard(st, type, name) { var k = st.pools[type].indexOf(name); if (k >= 0) st.pools[type].splice(k, 1); st.discard[type].push(name); }
  function take(st, data, type, name, ti) {
    st.teams[ti][type].push(name);
    var k = st.pools[type].indexOf(name); if (k >= 0) st.pools[type].splice(k, 1);
    st.log.push({ r: st.round + 1, ti: ti, type: type, c: name });
  }
  function tossPack(st, type, pack, keep) { for (var i = 0; i < pack.length; i++) if (pack[i] !== keep) toDiscard(st, type, pack[i]); }

  function newGame(data, seed, opt) {
    opt = opt || {};
    var st = { seed: seed | 0, rngState: seed | 0, lv: opt.lv === undefined ? 1 : opt.lv, rrMax: opt.rr === undefined ? 1 : opt.rr,
      round: 0, si: 0, seq: [0, 1, 2], teams: [newTeam(), newTeam(), newTeam()], phase: 'running', log: [], pack: null, feedback: null,
      pools: { weapon: data.cards.map(function (c) { return c.name; }), wielder: data.wielders.map(function (o) { return o.name; }) },
      discard: { weapon: [], wielder: [] }, rerolls: [0, 0, 0] };
    st.rerolls = [st.rrMax, st.rrMax, st.rrMax];
    var o = st.seq, i, j, t;
    for (i = o.length - 1; i > 0; i--) { j = randInt(st, i + 1); t = o[i]; o[i] = o[j]; o[j] = t; }
    settle(st, data);
    return st;
  }
  function schedule(data) { return data.draft.schedule; }
  function typeNow(st, data) { return schedule(data)[st.round]; }
  function turnSeq(st) { return st.round % 2 === 0 ? st.seq : st.seq.slice().reverse(); }
  function whose(st) { return turnSeq(st)[st.si]; }
  function isMine(st) { return st.phase === 'running' && whose(st) === 0; }

  function aiPick(st, data, type, pack, ti) {
    var see = SEE[st.lv], base = evaluate(data, st.teams[ti], see).total, i, best = null, bs = -1e9;
    if (st.lv === 0 && rand(st) < 0.35) return { c: pack[randInt(st, pack.length)], gain: 0 };
    for (i = 0; i < pack.length; i++) {
      st.teams[ti][type].push(pack[i]);
      var s = evaluate(data, st.teams[ti], see).total;
      if (st.lv === 2) s += nearBonus(data, st.teams[ti], pack[i]);
      st.teams[ti][type].pop();
      if (s > bs) { bs = s; best = pack[i]; }
    }
    return { c: best, gain: bs - base };
  }
  function aiTurn(st, data, ti) {
    var type = typeNow(st, data), pack = drawPack(st, data, type), r = aiPick(st, data, type, pack, ti), k = RR_K[st.lv], guard = 0;
    while (k > 0 && st.rerolls[ti] > 0 && st.round < schedule(data).length - 1 && r.gain < RR_BAR[type] * k && guard++ < 3) {
      st.rerolls[ti]--; st.log.push({ r: st.round + 1, ti: ti, type: type, rr: true });
      tossPack(st, type, pack, null); pack = drawPack(st, data, type); r = aiPick(st, data, type, pack, ti);
    }
    tossPack(st, type, pack, r.c);
    take(st, data, type, r.c, ti);
  }
  function advance(st, data) {
    st.si++;
    if (st.si >= 3) { st.si = 0; st.round++; }
    if (st.round >= schedule(data).length) { st.phase = 'done'; st.pack = null; }
  }
  /* 내 차례가 올 때까지 적들이 둔다. 내 차례면 팩을 깐다 */
  function settle(st, data) {
    var guard = 0;
    while (st.phase === 'running' && guard++ < 40) {
      var who = whose(st);
      if (who === 0) { if (!st.pack) st.pack = drawPack(st, data, typeNow(st, data)); return; }
      aiTurn(st, data, who); advance(st, data);
    }
  }
  function pick(st, data, name) {
    if (!isMine(st) || !st.pack || st.pack.indexOf(name) < 0) return { ok: false, why: 'turn' };
    var type = typeNow(st, data), before = pledges(data, st.teams[0]).map(function (g) { return g.n + ':' + g.v; });
    tossPack(st, type, st.pack, name); st.pack = null;
    take(st, data, type, name, 0);
    var after = pledges(data, st.teams[0]).filter(function (g) { return before.indexOf(g.n + ':' + g.v) < 0; });
    st.feedback = { c: name, fired: after.map(function (g) { return g.n; }) };
    advance(st, data); settle(st, data);
    return { ok: true, fired: st.feedback.fired, done: st.phase === 'done' };
  }
  function resupply(st, data) {
    if (!isMine(st) || st.rerolls[0] < 1 || st.round >= schedule(data).length - 1) return { ok: false, why: 'rr' };
    var type = typeNow(st, data);
    st.rerolls[0]--; st.log.push({ r: st.round + 1, ti: 0, type: type, rr: true });
    tossPack(st, type, st.pack, null); st.pack = drawPack(st, data, type);
    return { ok: true };
  }
  /* 한 장을 집으면 내 편성 값이 얼마나 변하나 — 화면의 미리보기 */
  function preview(st, data, name) {
    var type = typeNow(st, data), t = st.teams[0], base = evaluate(data, t).total;
    t[type].push(name); var ev = evaluate(data, t); t[type].pop();
    var near = pledges(data, t).length;
    return { total: ev.total, delta: ev.total - base, rows: ev.rows };
  }
  function result(st, data) {
    var evs = [0, 1, 2].map(function (i) { return { ti: i, ev: evaluate(data, st.teams[i]) }; });
    var sorted = evs.slice().sort(function (a, b) { return b.ev.total - a.ev.total; });
    var rank = 0; for (var i = 0; i < sorted.length; i++) if (sorted[i].ti === 0) rank = i;
    return { evs: evs, sorted: sorted, rank: rank, gap: sorted[0].ev.total - sorted[2].ev.total };
  }

  var api = { newGame: newGame, pick: pick, resupply: resupply, preview: preview, evaluate: evaluate, result: result, assign: assign,
    synergy: synergy, pledges: pledges, isMine: isMine, whose: whose, typeNow: typeNow, schedule: schedule, turnSeq: turnSeq,
    wp: wp, pw: pw, sync: sync, pairScore: pairScore, weapon: weapon, wielder: wielder, rand: rand, LEVELS: 3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AtelierDraft = api;
})(typeof window !== 'undefined' ? window : globalThis);
