#!/usr/bin/env node
/* 일상컷 묶음 계획 — 한 무기의 일상컷 여러 장을 서로 겹치지 않게 한 번에 짠다(2026-11-01, book-atelier 계획기의 버전2 를 신화 꼴로).

   생성기 화면은 한 장씩 고르는 곳이고, 여러 장을 나눠 갖게 짜는 일은 그림을 그리는 쪽(claude · gpt 세션)이 한다.
   생성기와 같은 lib/casual-tree-v2.js · lib/prompt-myth.js 로 칸마다 장면을 고르고, 생성기 「기록 내보내기」 와 같은 꼴의
   기록(casualN-ui.json)과 지시문(casualN-prompt.txt)을 쓴다. 지키는 규칙(IMAGE_RULES 「일상컷 묶음」):
     - 필수 갈래 한 장 이상 — 란제리풍 · 수영복 · 역할극 의상, 또는 신화 세계 안 방 · 샘 · 지붕 · 연회장의 홈웨어 · 란제리 · 목욕 차림 · 수영복.
       이미 있는 컷(기록)에 없으면 카드 차례대로 돌려 고른다(--required 로 바꾼다)
     - 프레이밍 · 자세 추천은 서로 다르게, 세 장 이상이면 먼 컷(전신 · 환경)과 가까운 컷(가슴 위 · 클로즈업) 하나씩
     - 장소는 서로 다르고 장소 묶음은 두 번까지, 의상 계열은 겹치지 않게(평상복만 두 번까지), 시대는 한 가지가 두 번까지(네 장 이상이면 네 시대 다)
     - 몸 방향은 두 번까지, 어깨 너머 돌아보기 · 소품 · 마실 것 · 어색한 조합(⚠)은 한 장까지
     - 무기는 들지 않는다 — 알아볼 거리 소품은 없다(카드엔 signature_hold 가 없다)
   이미 그림이 있는 칸은 짜지 않고, 그 기록(--records)은 겹침 검사에만 쓴다. 옛 일상컷(2026-11-01 전)은 기록이 없어 겹침 검사에 안 들어간다.

     node tools/casual-plan.cjs <카드 이름> [--slots 2,3,4 | --count 3] [--style game_keyart] [--records <그림 저장소>/records/<카드>]
                                         [--required lingerie|swimwear|roleplay|in_myth] [--usage <그림 저장소>/records | none] [--seed N] [--out <폴더>]
   카드 이름은 data/card.json 의 name(공백은 그대로 또는 밑줄). --slots 를 안 주면 등록부(data/img.json)에 없는 번호에서 --count 칸(기본 3).
   --style 을 안 주면 그 카드의 기본 그림 화풍(없으면 생성기 기본 화풍). --out 을 주면 칸마다 기록 · 지시문과 plan.json 을 쓴다.
   --usage(기본 옆의 myth-atelier-img/records)에서 다른 카드 기록의 장소 · 옷 · 표정 · 자세 추천 · 자세 · 소품 쓴 횟수를 세어
   안 쓴 값은 무게 4, 쓴 값은 1/(1+횟수)² 로 고른다(game · book · element 와 같다).
     node tools/casual-plan.cjs <카드 이름> --check <기록 폴더> [--free 6]   # 올리기 전 — 그 묶음이 위 규칙을 다 지키나. --free 는 사용자가 직접 고른 칸 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/casual-tree-v2.js', 'lib/prompt-myth.js']) vm.runInContext(read(f), ctx);
const S = ctx.window.AtelierSpec, CT = ctx.window.AtelierCasualTree, C2 = ctx.window.AtelierCasualTreeV2, P = ctx.window.AtelierPrompt;
const J = f => JSON.parse(read(f));
const tree = J('data/casual-tree.json'), tree2 = J('data/casual-tree-v2.json'), CARDS = J('data/card.json').cards;
const DATA = { cards: CARDS, group: J('data/group.json'), skills: J('data/skill.json').skills, tree, tree2 };
const T2 = C2.make(tree2, tree);

const WORLD = CT.worldRule(tree).era;
const REQUIRED_TYPES = ['lingerie', 'swimwear', 'roleplay', WORLD];
const FAR = ['full_body', 'environmental'], NEAR = ['chest_up', 'face_close'];
const FRAMES = S.CASUAL_FRAMES.map(r => r[0]).filter(k => k && k !== 'detail');
const EXPRS = S.CASUAL_EXPRESSIONS.map(r => r[0]).filter(Boolean);
const ERA_WEIGHT = { now: 5, heritage: 2, in_myth: 2, fantasy: 1 };
/* 일상컷 고정값(game · book 과 같다) — 전체 강도 strong · 피부 노출 bold. 필터에 막히면 노출만 한 단계씩 낮춘다(IMAGE_RULES) */
const FIXED_AXES = { overall_intensity: 'strong', skin_exposure: 'bold' };
const DRINKS = ['cup', 'drink_glass', 'water_bottle', 'teapot'];
const by = (list, k) => list.find(r => r.key === k);
const fileKey = card => card.name.replace(/ /g, '_');
const cardOf = name => CARDS.find(c => c.name === name || fileKey(c) === name);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, list) => list[Math.floor(r() * list.length)];
function weighted(r, weights) { const keys = Object.keys(weights), sum = keys.reduce((s, k) => s + weights[k], 0); let x = r() * sum; for (const k of keys) { x -= weights[k]; if (x < 0) return k; } return keys[0]; }

/* 필수 갈래 종류 — 옷 계열이 곧 필수면 그 계열, 신화 세계 안 섹시 일상이면 in_myth */
function requiredType(sc) {
  if ((tree.required.outfits || []).includes(sc.ofam)) return sc.ofam;
  return CT.isRequired(tree, sc) ? WORLD : '';
}
/* 필수 갈래로 가는 길 — 시대 · 장소 · 의상 계열(카드마다 같다: 장소는 무기를 가리지 않는다) */
const PATH2 = new Map();
function requiredPaths(type, card) {
  if (PATH2.has(type)) return PATH2.get(type);
  const out = [];
  for (const e of tree.eras) for (const place of C2.choices(T2, { era: e.key }, 'place', card))
    for (const ofam of C2.choices(T2, { era: e.key, place }, 'ofam', card)) {
      const sc = { era: e.key, place, ofam };
      if (requiredType(sc) === type) out.push(sc);
    }
  PATH2.set(type, out);
  return out;
}
/* 쓸 수 있는 자세 추천은 시대 · 장소 · 의상 계열로만 갈린다 — 칸마다 다시 검사하면 느려서 기억한다 */
const PRESET_MEMO = new Map();
function presetsAt(sc, card) {
  const k = [sc.era, sc.place, sc.ofam].join('|');
  if (!PRESET_MEMO.has(k)) PRESET_MEMO.set(k, C2.presets(T2, sc, card));
  return PRESET_MEMO.get(k);
}
/* 쓴 횟수의 무게 — 한 번도 안 쓴 값이 먼저(4), 쓴 값은 1/(1+횟수)² */
const WEIGHT_UNUSED = 4;
const wOf = n => n ? 1 / Math.pow(1 + n, 2) : WEIGHT_UNUSED;
function lean(r, list, count, key = x => x) {
  if (!list.length) return undefined;
  const w = list.map(x => wOf((count || {})[key(x)] || 0)), sum = w.reduce((a, b) => a + b, 0);
  let x = r() * sum; for (let i = 0; i < list.length; i++) { x -= w[i]; if (x < 0) return list[i]; }
  return list[list.length - 1];
}
const usageOf = u => ({ prop: {}, place: {}, item: {}, preset: {}, posture: {}, expr: {}, ...(u || {}) });

/* 한 칸 — 시대 · 장소 · 의상 · 옷, 그 장소에서 쓸 수 있는 자세 추천 하나(frame 을 주면 그 프레이밍의 추천만), 소품 동작은 덜 쓴 소품 쪽으로. 표정은 얼굴이 보일 때만 */
function randomSlot(r, card, reqType, { frame = '', era: wantEra = '', usage = {}, rUse = r } = {}) {
  const U = usageOf(usage);
  let sc;
  if (reqType) { const paths = requiredPaths(reqType, card).filter(x => !wantEra || x.era === wantEra); if (!paths.length) return null; sc = { ...lean(r, paths, U.place, x => x.place) }; }
  else {
    const era = wantEra || weighted(r, ERA_WEIGHT), place = lean(r, C2.choices(T2, { era }, 'place', card), U.place);
    if (!place) return null;
    sc = { era, place, ofam: pick(r, C2.choices(T2, { era, place }, 'ofam', card)) };
  }
  sc.treeV = 2;
  const presets = presetsAt(sc, card).filter(p => !frame || p.frame === frame);
  if (!presets.length) return null;
  const rp = list => pick(r, list);
  const pw = presets.map(p => wOf(U.preset[p.key] || 0) * Math.sqrt(wOf(U.posture[p.posture] || 0)));
  let px = r() * pw.reduce((a, b) => a + b, 0), chosen = presets[presets.length - 1];
  for (let i = 0; i < presets.length; i++) { px -= pw[i]; if (px < 0) { chosen = presets[i]; break; } }
  sc = C2.repair(T2, C2.applyPreset(T2, sc, chosen.key), card, rp);
  const items = C2.choices(T2, sc, 'item', card);
  sc.item = items.length ? lean(r, items, U.item) : '';
  sc = C2.repair(T2, sc, card, rp);
  if (sc.use) {
    const alt = C2.choices(T2, sc, 'use', card).filter(k => C2.use(T2, k).prop !== 'signature');
    if (alt.length > 1) {
      /* 마실 것 넷은 한 무리로 센다. 따로 된 난수 흐름(rUse) — 같은 흐름이면 앞의 자세 추천 뽑기와 이어져 첫 후보로 쏠렸다(book) */
      const n = p => DRINKS.includes(p) ? DRINKS.reduce((a, d) => a + (U.prop[d] || 0), 0) : (U.prop[p] || 0);
      const u = weighted(rUse, Object.fromEntries(alt.map(k => [k, 1 / Math.pow(1 + n(C2.use(T2, k).prop), 2)])));
      const next = C2.set(T2, sc, 'use', u, card, rp);
      if (next.use === u) sc = next;
    }
  }
  if (sc.use && C2.use(T2, sc.use).prop === 'signature') return null;
  const body = by(tree2.body, sc.body), head = by(tree2.head, sc.head);
  sc.expr = body.face_hidden && !head.look_back ? '' : lean(r, EXPRS, U.expr);
  sc.axes = { ...FIXED_AXES };
  for (const k of S.CASUAL_AXES_V2) if (!sc.axes[k]) sc.axes[k] = pick(r, S.CASUAL_AXIS_OPTIONS[k].filter(v => v && v !== 'AUTO'));
  return sc;
}

/* 묶음 규칙 — 틀린 것 목록(빈 목록이면 통과). base 는 이미 있는 컷: 그것들이 벌써 넘긴 한도는 그만큼 올려 준다. free 는 사용자가 직접 고른 칸 */
function check(cuts, card, base = [], free = []) {
  const every = [...base, ...cuts], all = every.filter(c => !free.includes(c.n)), errs = [];
  const count = (f, xs) => xs.reduce((m, c) => { const k = f(c); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
  const over = (name, f, most, xs = all) => {
    const m = count(f, xs), b = count(f, base);
    Object.entries(m).forEach(([k, n]) => { if (n > Math.max(most, b[k] || 0)) errs.push(`${name} ${k} 가 ${n} 번(${most} 번까지)`); });
  };
  if (!every.some(c => requiredType(c))) errs.push('필수 갈래가 없다');
  over('장소', c => c.place, 1);
  over('장소 묶음', c => (C2.place(T2, c.place) || {}).group, 2);
  over('의상 계열', c => c.ofam !== 'everyday' && c.ofam, 1);
  over('평상복', c => c.ofam === 'everyday' && c.ofam, 2);
  over('시대', c => c.era, 2);
  if (cuts.length >= 4) { const eras = new Set(every.map(c => c.era)), want = Math.min(tree.eras.length, every.length); if (eras.size < want) errs.push(`시대가 ${eras.size} 가지뿐이다(${want} 가지 다)`); }
  over('프레이밍', c => c.frame, Math.max(1, Math.ceil(all.length / FRAMES.length)));
  over('자세 추천', c => c.preset, 1);
  over('몸 방향', c => c.body, 2);
  over('머리 어깨 너머', c => by(tree2.head, c.head)?.look_back && 'over_shoulder', 1);
  over('소품', c => { const u = C2.use(T2, c.use); return u && u.prop; }, 1);
  over('마실 것', c => { const u = C2.use(T2, c.use); return u && DRINKS.includes(u.prop) && 'drink'; }, 1);
  over('어색한 조합', c => C2.awkward(T2, c.ofam, c.place).length && 'awkward', 1);
  if (every.some(c => { const u = C2.use(T2, c.use); return u && u.prop === 'signature'; })) errs.push('무기를 소품으로 들었다');
  if (every.length >= 3) {
    if (!every.some(c => FAR.includes(c.frame))) errs.push('먼 컷(전신·환경)이 없다');
    if (!every.some(c => NEAR.includes(c.frame))) errs.push('가까운 컷(가슴 위·클로즈업)이 없다');
  }
  for (const c of cuts) {
    if (c.treeV !== 2) { errs.push(`칸 ${c.n || '?'}: 버전2 장면이 아니다`); continue; }
    const fixed = C2.repair(T2, c, card);
    for (const k of C2.ORDER) if (!C2.unlocked(c, k) && (fixed[k] || '') !== (c[k] || '')) errs.push(`칸 ${c.n || '?'}: ${k}=${c[k]} 는 트리에서 못 고른다`);
  }
  return errs;
}
/* 묶음 — 통째로 뽑아 거르면 규칙이 많아 거의 안 맞는다. 한 장씩 쌓는다: 프레이밍 · 시대를 먼저 나눠 주고, 칸마다 앞 칸들과 겹치지 않는 것을 고른다 */
const MUST = /^(필수 갈래가 없다|먼 컷|가까운 컷|시대가 )/;
function plan(card, slots, old, { seed = Date.now(), required = '', usage = {} } = {}) {
  const rUse = rng((seed ^ 0x5bd1e995) >>> 0), r = rng(seed), oldReq = old.some(c => requiredType(c));
  const ci = CARDS.findIndex(c => c.name === card.name);
  const want = oldReq ? '' : (required || REQUIRED_TYPES[ci % REQUIRED_TYPES.length]);
  const oldFrames = new Set(old.map(c => c.frame));
  for (let attempt = 1; attempt <= 400; attempt++) {
    let frames = FRAMES.filter(f => !oldFrames.has(f)).sort(() => r() - 0.5);
    if (frames.length < slots.length) frames = frames.concat(FRAMES.slice().sort(() => r() - 0.5)).slice(0, slots.length);
    frames = frames.slice(0, slots.length);
    const fx = [...old, ...frames.map(frame => ({ frame }))];
    if (slots.length + old.length >= 3 && (!fx.some(c => FAR.includes(c.frame)) || !fx.some(c => NEAR.includes(c.frame)))) continue;
    /* 시대 — 이미 있는 컷까지 세어 가장 덜 쓴 시대부터(같으면 무게대로) */
    const ERAS = tree.eras.map(e => e.key), cnt = Object.fromEntries(ERAS.map(e => [e, 0]));
    old.forEach(c => { if (c.era in cnt) cnt[c.era]++; });
    let eras = [];
    for (let i = 0; i < slots.length; i++) {
      const lo = Math.min(...ERAS.map(e => cnt[e])), e = weighted(r, Object.fromEntries(ERAS.filter(x => cnt[x] === lo).map(x => [x, ERA_WEIGHT[x] || 1])));
      eras.push(e); cnt[e]++;
    }
    eras = eras.sort(() => r() - 0.5);
    const cuts = [];
    for (let i = 0; i < slots.length; i++) {
      let got = null;
      for (let k = 0; k < 60 && !got; k++) {
        /* 이 묶음에서 이미 쓴 소품은 묶음 규칙이 다시 막으니 처음부터 크게 센다 */
        const U0 = usageOf(usage), here = { ...U0, prop: { ...U0.prop } }; cuts.forEach(c => { const u = C2.use(T2, c.use); if (u) here.prop[u.prop] = (here.prop[u.prop] || 0) + 10; });
        const sc = randomSlot(r, card, i === 0 ? want : '', { frame: frames[i], era: eras[i], usage: here, rUse });
        if (!sc) continue;
        const cand = { n: slots[i], ...sc };
        if (!check([...cuts, cand], card, old).filter(e => !MUST.test(e)).length) got = cand;
      }
      if (!got) break;
      cuts.push(got);
    }
    if (cuts.length === slots.length && !check(cuts, card, old).length) return { cuts, attempt, required: want || requiredType(old.find(c => requiredType(c))) };
  }
  throw new Error('규칙을 다 지키는 묶음을 못 찾았다 — 이미 있는 컷이 칸을 너무 많이 차지했는지 본다');
}

/* 생성기 화면의 저장 상태(prompt.html 의 localStorage myth_prompt_v1 — {__card, __myth, [카드]: 설정}). 기록 storage 를 생성기에 넣으면 같은 지시문이 나온다 */
function cardState(card, cut, style) {
  const { n, old, ...scene } = cut;
  const locks = { 'axes.overall_intensity': true, 'axes.skin_exposure': true };
  return { style, output: 'casual', action: '', casualIndex: n, scene: '', params: {},
    casual: { treeV: 2, era: 'now', place: '', ofam: '', item: '', expr: '', outfit: '', scene: '', custom: '', preset: '', axes: {}, ...scene, locks } };
}
function record(card, cut, style) { return P.record(cardState(card, cut, style), card, DATA); }
/* 기록 한 장의 장면 — storage[카드].casual */
const sceneOf = rec => ((rec.storage || {})[rec.card] || {}).casual;
/* 이미 있는 컷 — 기록 폴더의 casualN-ui.json(버전2 장면만) */
function oldCuts(dir, card) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^casual\d+-ui\.json$/.test(f)).map(f => {
    const rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), sc = sceneOf(rec);
    const n = Number(/\d+/.exec(f)[0]);
    if (!sc || sc.treeV !== 2) return null;
    const { locks, ...rest } = C2.repair(T2, sc, card);
    return { n, ...rest, old: true };
  }).filter(Boolean);
}
/* 쓴 횟수 — 다른 카드 기록의 소품 · 장소 · 옷 · 표정 · 자세 추천 · 자세 */
function sceneUsage(dir, skip) {
  const out = usageOf();
  if (!dir || !fs.existsSync(dir)) return out;
  const add = (m, k) => { if (k) m[k] = (m[k] || 0) + 1; };
  for (const g of fs.readdirSync(dir)) {
    if (g === skip || g === 'sprites' || !fs.statSync(path.join(dir, g)).isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(dir, g)).filter(x => /^casual\d+-ui\.json$/.test(x))) {
      let sc; try { sc = sceneOf(JSON.parse(fs.readFileSync(path.join(dir, g, f), 'utf8'))); } catch (e) { continue; }
      if (!sc || sc.treeV !== 2) continue;
      add(out.place, sc.place); add(out.item, sc.item); add(out.expr, sc.expr); add(out.preset, sc.preset); add(out.posture, sc.posture);
      const u = C2.use(T2, sc.use);
      if (u) add(out.prop, u.prop);
    }
  }
  return out;
}
/* 등록부(data/img.json)의 그 카드 · 화풍 일상컷 번호 */
function registered(card, style) {
  const img = (J('data/img.json').img[card.name] || { byStyle: {} }).byStyle[style] || {};
  return ((img.casual || {}).f || []).map(f => Number(/_casual(\d+)\.webp$/.exec(f)[1]));
}
/* 카드의 기본 화풍 — 기본 그림이 있는 첫 화풍, 없으면 생성기 기본 */
function styleOf(card) {
  const by = (J('data/img.json').img[card.name] || { byStyle: {} }).byStyle;
  return by[S.DEFAULT_STYLE] ? S.DEFAULT_STYLE : Object.keys(by).find(k => by[k].f) || S.DEFAULT_STYLE;
}
function line(c) {
  const p = C2.place(T2, c.place), f = CT.family(tree, c.ofam), it = CT.item(tree, c.ofam, c.item), u = C2.use(T2, c.use), pr = by(tree2.presets, c.preset);
  const ko = (list, k) => (by(list, k) || {}).ko || k || '—', hand = k => k === 'prop' ? '소품' : ko(tree2.hands, k);
  return `${c.old ? '  (있음)' : '  '} ${c.n} ${requiredType(c) ? '★' : ' '}${C2.awkward(T2, c.ofam, c.place).length ? '⚠' : ' '} ${CT.era(tree, c.era).ko} · ${p.ko} · ${f.ko}${it ? '(' + it.ko + ')' : ''} │ ${pr ? pr.ko : '—'} │ ` +
    `${ko(tree2.postures, c.posture)} · ${c.frame} · ${ko(tree2.body, c.body)} · ${ko(tree2.head, c.head)} · 오른손 ${hand(c.right)} · 왼손 ${hand(c.left)}${u ? ' · ' + ko(tree2.props, u.prop) + ' ' + u.ko : ''}${c.legs ? ' · ' + ko(tree2.legs, c.legs) : ''}${c.gaze ? ' · 시선 ' + ko(tree2.gaze, c.gaze) : ''}${c.expr ? ' · 표정 ' + c.expr : ''}`;
}

function main(argv) {
  const name = argv[0], opt = {};
  for (let i = 1; i < argv.length; i++) opt[argv[i].replace(/^--/, '')] = argv[++i];
  const card = name && cardOf(name);
  if (!card) { console.error('카드가 없다: ' + name + '\n' + fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 25).join('\n')); return 2; }
  if (opt.check) {
    const cuts = oldCuts(opt.check, card);
    for (const c of cuts.sort((a, b) => a.n - b.n)) console.log(line(c));
    const free = opt.free ? String(opt.free).split(',').map(Number) : [];
    const errs = check(cuts.map(c => ({ ...c, old: false })), card, [], free);
    if (free.length) console.log('  (사용자가 고른 칸 ' + free.join(',') + ' — 겹침 검사에서 뺐다)');
    for (const e of errs) console.log('  X ' + e);
    console.log(errs.length ? `일상컷 묶음 ${errs.length} 가지 걸림` : `일상컷 묶음 통과 — ${cuts.length} 장`);
    return errs.length ? 1 : 0;
  }
  const style = opt.style || styleOf(card);
  if (!S.STYLES.some(s => s[0] === style)) { console.error('화풍이 없다: ' + style); return 2; }
  const taken = registered(card, style);
  const slots = opt.slots ? opt.slots.split(',').map(Number) : [...Array(30).keys()].map(i => i + 1).filter(n => !taken.includes(n)).slice(0, Number(opt.count || 3));
  const old = oldCuts(opt.records, card).filter(c => !slots.includes(c.n));
  const seed = Number(opt.seed || Date.now() % 1e9);
  const usageDir = opt.usage === 'none' ? '' : (opt.usage || path.join(ROOT, '..', 'myth-atelier-img', 'records'));
  const res = plan(card, slots, old, { seed, required: opt.required || '', usage: sceneUsage(usageDir, fileKey(card)) });
  console.log(`${card.name} 일상컷 묶음 — 화풍 ${style} · 칸 ${slots.join(',')} · 필수 갈래 ${res.required} · 시도 ${res.attempt} · seed ${seed}`);
  if (taken.length) console.log(`  등록된 일상컷 ${taken.join(',')} — 기록이 없는 옛 컷은 겹침 검사에 안 들어간다`);
  for (const c of [...old, ...res.cuts].sort((a, b) => a.n - b.n)) console.log(line(c));
  if (opt.out) {
    fs.mkdirSync(opt.out, { recursive: true });
    for (const c of res.cuts) {
      const rec = record(card, c, style);
      fs.writeFileSync(path.join(opt.out, `casual${c.n}-ui.json`), JSON.stringify(rec, null, 1) + '\n');
      fs.writeFileSync(path.join(opt.out, `casual${c.n}-prompt.txt`), rec.prompt);
    }
    fs.writeFileSync(path.join(opt.out, 'plan.json'), JSON.stringify({ card: card.name, style, seed, tree: 2, required: res.required, slots, cuts: res.cuts }, null, 1) + '\n');
    console.log('→ ' + opt.out);
  }
  return 0;
}

module.exports = { plan, check, randomSlot, record, cardState, requiredType, oldCuts, sceneUsage, registered, styleOf, fileKey, cardOf, DRINKS, REQUIRED_TYPES, WEIGHT_UNUSED, FIXED_AXES };
if (require.main === module) process.exit(main(process.argv.slice(2)));
