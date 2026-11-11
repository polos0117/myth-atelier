#!/usr/bin/env node
/* 지시문 묶음 — 브라우저 없이 생성기와 같은 지시문 · 기록을 파일로(2026-11-01, book-atelier 의 tools/prompt-pack.cjs 를 신화 꼴로).
   GPT 세션은 브라우저를 못 띄운다 — 생성기 화면(prompt.html)이 부르는 조립부(lib/prompt-myth.js 의 build · record)를
   같은 저장 상태로 불러, 한 무기의 자리(액션 · 각성 · 저주 · 일상 N · 스킨)마다 지시문과 기록을 쓴다.
   기록(<자리>-ui.json)은 생성기 「기록 내보내기」 와 같은 꼴이고, 그 storage 를 생성기에 넣으면 같은 지시문이 나온다(tests/prompt-pack-screen.cjs 가 견준다).

   node tools/prompt-pack.cjs init <카드 이름> --dir <작업 폴더> [--plan <계획기 --out 폴더>/plan.json] [--style <화풍>] [--with base,awaken,cursed] [--skins <열쇠>,…]
     작업 폴더에 settings.json(고칠 수 있는 칸만)을 만든다 — 이미 있으면 덮지 않고 멈춘다.
     자리는 등록부(data/img.json)에 그 화풍 그림이 없는 액션 · 각성 · 저주(--with 는 있어도 넣는다 — 다시 그리라는 요청이 있을 때만) +
     --plan 의 일상 칸(일상컷 계획기 tools/casual-plan.cjs --out 의 plan.json — 일상 칸의 선택값은 계획에서만 온다) + --skins 의 스킨 기본 · 각성 · 저주.
     화풍은 계획의 화풍, 없으면 카드의 기본 그림 화풍(없으면 생성기 기본).
   node tools/prompt-pack.cjs build --dir <작업 폴더>
     settings.json 을 읽어 자리마다 <자리>-prompt.txt · <자리>-ui.json 과 차례표 INDEX.md 를 쓴다.
     틀린 칸(없는 열쇠 · 표에 없는 값 · 사유 없는 직접 입력 · 계획에 없는 컷)이 하나라도 있으면 아무것도 쓰지 않고 1 로 끝난다.

   자리마다 고정인 것(출력 · 첨부)은 도구가 정한다 — 액션은 새 인물(첨부 없음), 각성 · 저주 · 일상 · 스킨 기본은 액션 그림, 스킨 각성 · 저주는 그 스킨 기본.
   고칠 수 있는 칸:
     look                design(mecha · cloth) · extras(embodiment · silhouette · myth — true · false) · params(외형 — 표의 값, 색은 #rrggbb 도, 아니면 직접 입력이라 why)
     base                action(그 무기 종류의 자세 열쇠 — 표의 값) · scene(직접 입력 — why)
     awaken · cursed · skin_*   scene(직접 입력 — why)
     casualN             custom(추가 연출 — why) · exposure(moderate · low — 그 컷만 피부 노출 축을 낮춘다, why 필요) · 나머지는 계획 그대로
     exposure 는 필터 거절 뒤 노출 낮추기(IMAGE_RULES 「필터에 막히면」)에만 쓴다 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/casual-tree-v2.js', 'lib/prompt-myth.js']) vm.runInContext(read(f), ctx);
const S = ctx.window.AtelierSpec, C2 = ctx.window.AtelierCasualTreeV2, P = ctx.window.AtelierPrompt;
const J = f => JSON.parse(read(f));
const tree = J('data/casual-tree.json'), tree2 = J('data/casual-tree-v2.json'), CARDS = J('data/card.json').cards;
const DATA = { cards: CARDS, group: J('data/group.json'), skills: J('data/skill.json').skills, tree, tree2 };
const PLAN = require('./casual-plan.cjs');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const CASUAL_LOCKS = { 'axes.overall_intensity': true, 'axes.skin_exposure': true };
/* 새 그림의 화풍은 살아 있는 것만 — 내린 화풍(S.RETIRED_STYLES, 2026-11-11)은 옛 그림 · 기록에만 남는다 */
const STYLES = S.LIVE_STYLES.map(r => r[0]), DESIGNS = S.DESIGNS.map(r => r[0]), EXTRAS = S.EXTRAS.map(r => r[0]);
const optionKeys = d => (d.options || []).map(r => r[0]).filter(v => v && v !== '__custom__');

function cardOf(name) {
  const c = PLAN.cardOf(name);
  if (!c) throw new Error('카드가 없다: ' + name + ' (data/card.json 의 name — 공백은 그대로 또는 밑줄)');
  return c;
}
/* 등록부의 그 카드 · 화풍 그림 */
function imgOf(card, style) { return ((J('data/img.json').img[card.name] || { byStyle: {} }).byStyle[style]) || {}; }
/* 자리 — 액션 · 각성 · 저주 · 일상 N · 스킨. 첨부는 앞 자리의 그림 */
function slots(card, set, plan) {
  const out = [], base = { slot: 'base', output: 'portrait', attach: [] };
  for (const k of set.base) {
    if (k === 'base') out.push(base);
    else out.push({ slot: k, output: k, attach: ['base'] });
  }
  for (const c of (plan ? plan.cuts : [])) out.push({ slot: 'casual' + c.n, output: 'casual', attach: ['base'], cut: c });
  for (const key of set.skins || []) {
    out.push({ slot: 'skin_' + key, output: 'skin', skin: key, skinState: 'base', attach: ['base'] });
    for (const x of ['awaken', 'cursed']) out.push({ slot: 'skin_' + key + '_' + x, output: 'skin', skin: key, skinState: x, attach: ['skin_' + key] });
  }
  return out;
}
const fileOf = (card, slot, style) => {
  const k = card.name.replace(/ /g, '_');
  return slot === 'base' ? `${k}_${style}_f.webp` : `${k}_${style}_f_${slot}.webp`;
};

function initSettings(card, { plan: planPath = '', style = '', with: withList = '', skins = '' } = {}) {
  const plan = planPath ? JSON.parse(fs.readFileSync(planPath, 'utf8')) : null;
  if (plan && plan.card !== card.name) throw new Error('계획이 다른 카드 것이다: ' + plan.card);
  const st = style || (plan && plan.style) || PLAN.styleOf(card), img = imgOf(card, st);
  if (!STYLES.includes(st)) throw new Error((S.RETIRED_STYLES.includes(st) ? '내린 화풍이다(2026-11-11 — 새 그림엔 안 쓴다): ' : '화풍이 없다: ') + st + ' — 쓸 수 있는 것: ' + STYLES.join(' · '));
  const forced = String(withList || '').split(',').filter(Boolean);
  const base = ['base', 'awaken', 'cursed'].filter(k => forced.includes(k) || !(k === 'base' ? img.f : (img[k] || {}).f));
  const sk = String(skins || '').split(',').filter(Boolean);
  const set = { _: 'tools/prompt-pack.cjs 의 설정 — 고칠 수 있는 칸만 있다. 직접 입력(글 칸 · 표에 없는 값)엔 why 에 까닭을 적는다. 고친 뒤 build',
    card: card.name, style: st, plan: planPath ? path.resolve(planPath) : '', base, skins: sk,
    look: { design: 'mecha', extras: Object.fromEntries(EXTRAS.map(k => [k, false])), params: {}, why: '' }, slots: {} };
  for (const s of slots(card, set, plan)) set.slots[s.slot] = s.output === 'casual' ? { custom: '', exposure: '', why: '' } : s.slot === 'base' ? { action: '', scene: '', why: '' } : { scene: '', why: '' };
  return set;
}

/* 틀린 칸 — 하나라도 있으면 build 가 아무것도 안 쓴다 */
function validate(set, card, plan) {
  const errs = [], list = slots(card, set, plan), names = list.map(s => s.slot);
  const unknown = (obj, allowed, where) => Object.keys(obj || {}).forEach(k => { if (!allowed.includes(k)) errs.push(where + ' 에 없는 칸 ' + k); });
  const lower = (x, where) => { if (x.exposure == null || x.exposure === '') return; if (!['moderate', 'low'].includes(x.exposure)) errs.push(where + '.exposure 는 moderate · low(낮추기만)'); else if (!(x.why || '').trim()) errs.push(where + '.exposure 를 낮췄는데 why(막힌 까닭)가 비었다'); };
  if (set.card !== card.name) errs.push('settings.card 가 ' + card.name + ' 가 아니다');
  if (!STYLES.includes(set.style)) errs.push((S.RETIRED_STYLES.includes(set.style) ? '내린 화풍이다(2026-11-11 — 새 그림엔 안 쓴다): ' : '화풍이 없다: ') + set.style + ' — 쓸 수 있는 것: ' + STYLES.join(' · '));
  if (plan && plan.card !== card.name) errs.push('계획이 다른 카드 것이다: ' + plan.card);
  if (plan && plan.style && plan.style !== set.style) errs.push('계획의 화풍(' + plan.style + ')과 settings.style 이 다르다');
  if (!Array.isArray(set.base) || set.base.some(k => !['base', 'awaken', 'cursed'].includes(k))) errs.push('settings.base 는 base · awaken · cursed 의 목록');
  for (const k of set.skins || []) if (!(card.skins || []).some(x => x.key === k)) errs.push('스킨 열쇠 ' + k + ' 가 카드에 없다(data/card.json 의 skins 에 먼저)');
  const L = set.look || {};
  unknown(L, ['design', 'extras', 'params', 'why'], 'look');
  if (!DESIGNS.includes(L.design)) errs.push('look.design 은 ' + DESIGNS.join(' · '));
  unknown(L.extras, EXTRAS, 'look.extras');
  for (const [k, v] of Object.entries(L.extras || {})) if (typeof v !== 'boolean') errs.push('look.extras.' + k + ' 는 true · false');
  let manual = false;
  for (const [k, v] of Object.entries(L.params || {})) {
    const d = S.PARAMS.find(x => x.key === k);
    if (!d) { errs.push('look.params 에 없는 외형 ' + k); continue; }
    if (typeof v !== 'string' || !v) errs.push('look.params.' + k + ' 는 글(비우려면 칸을 지운다)');
    else if (!optionKeys(d).includes(v) && !(S.COLOR_KEYS[k] && /^#[0-9a-f]{6}$/i.test(v))) manual = true;
  }
  if (manual && !(L.why || '').trim()) errs.push('look 에 직접 입력(표에 없는 외형)이 있는데 why 가 비었다');
  unknown(set.slots, names, 'slots');
  for (const s of list) {
    const x = (set.slots || {})[s.slot], w = 'slots.' + s.slot;
    if (!x) { errs.push(w + ' 가 없다'); continue; }
    if (s.output === 'casual') {
      unknown(x, ['custom', 'exposure', 'why'], w); lower(x, w);
      if ((x.custom || '').trim() && !(x.why || '').trim()) errs.push(w + '.custom 의 why 가 비었다');
      continue;
    }
    unknown(x, s.slot === 'base' ? ['action', 'scene', 'why'] : ['scene', 'why'], w);
    if (s.slot === 'base' && x.action && !(S.ACTIONS[card.kind] || []).some(a => a[0] === x.action)) errs.push(w + '.action 의 값 ' + x.action + ' 가 ' + card.kind + ' 자세 표에 없다');
    if ((x.scene || '').trim() && !(x.why || '').trim()) errs.push(w + ' 에 직접 입력(scene)이 있는데 why 가 비었다');
  }
  if (plan) {
    const t = C2.make(tree2, tree);
    for (const cut of plan.cuts) {
      const { n, ...sc } = cut;
      if (sc.treeV !== 2) { errs.push('계획 컷 ' + n + ' 이 버전2 장면이 아니다'); continue; }
      const fixed = C2.repair(t, { ...sc }, card);
      for (const k of C2.ORDER) if (sc[k] && !C2.unlocked(sc, k) && fixed[k] !== sc[k]) errs.push('계획 컷 ' + n + ' 의 ' + k + ' 가 트리에 안 맞는다(' + sc[k] + ')');
    }
  }
  return errs;
}

/* 한 자리의 저장 상태 — 생성기(prompt.html)의 store[카드] 꼴 */
function stateOf(card, set, s) {
  const L = set.look, params = {};
  for (const [k, v] of Object.entries(L.params || {})) {
    const d = S.PARAMS.find(x => x.key === k);
    if (optionKeys(d).includes(v) || (S.COLOR_KEYS[k] && /^#[0-9a-f]{6}$/i.test(v))) params[k] = v;
    else { params[k] = '__custom__'; params[k + '_custom'] = v; }
  }
  const x = set.slots[s.slot] || {};
  const st = { style: set.style, output: s.output, action: s.slot === 'base' ? x.action || '' : '', casualIndex: s.cut ? s.cut.n : 1, scene: s.output === 'casual' ? '' : (x.scene || '').trim(),
    params, design: L.design, extras: { ...L.extras }, skin: s.skin || '', skinState: s.skinState || 'base',
    casual: { treeV: 2, era: 'now', place: '', ofam: '', item: '', expr: '', outfit: '', scene: '', custom: '', preset: '', axes: {}, locks: {} } };
  if (s.output === 'casual') {
    const { n, old, ...cut } = s.cut;
    st.casual = { treeV: 2, era: 'now', place: '', ofam: '', item: '', expr: '', outfit: '', scene: '', custom: '', preset: '', ...cut, custom: (x.custom || '').trim(), axes: { ...(cut.axes || {}) }, locks: { ...CASUAL_LOCKS } };
    if (x.exposure) st.casual.axes.skin_exposure = x.exposure;
  }
  return st;
}

function build(dir) {
  const set = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  const card = cardOf(set.card), plan = set.plan ? JSON.parse(fs.readFileSync(set.plan, 'utf8')) : null;
  const errs = validate(set, card, plan);
  if (errs.length) { for (const e of errs) console.error('  X ' + e); console.error('settings.json 에 ' + errs.length + ' 가지 — 아무것도 안 썼다'); return 1; }
  const list = slots(card, set, plan), out = [], at = new Date().toISOString();
  for (const s of list) {
    const rec = P.record(stateOf(card, set, s), card, DATA, at);
    if (!rec.prompt) { console.error('  X ' + s.slot + ' 지시문이 비었다'); return 1; }
    if (rec.file !== fileOf(card, s.slot, set.style) || rec.slot !== s.slot) { console.error('  X ' + s.slot + ' 파일 이름이 어긋난다: ' + rec.file); return 1; }
    out.push({ s, rec });
  }
  if (!out.length) { console.error('그릴 자리가 없다 — 액션 · 각성 · 저주가 다 있고 계획 · 스킨도 없다'); return 1; }
  for (const { s, rec } of out) {
    fs.writeFileSync(path.join(dir, s.slot + '-prompt.txt'), rec.prompt);
    fs.writeFileSync(path.join(dir, s.slot + '-ui.json'), JSON.stringify(rec, null, 1) + '\n');
  }
  const has = slot => fileOf(card, slot, set.style);
  const rows = out.map(({ s, rec }, i) => `| ${i + 1} | ${s.slot} | ${s.output} | ${s.attach.map(has).join(' + ') || '없음(새 인물)'} | ${rec.file} | ${rec.record} | ${sha(rec.prompt).slice(0, 12)} |`);
  fs.writeFileSync(path.join(dir, 'INDEX.md'), `# ${card.name} — 지시문 묶음\n\n만든 때 ${at} · 화풍 ${set.style} · 계획 ${set.plan || '없음(일상 자리 없음)'}\n\n` +
    '차례대로 그린다. 첨부는 앞에서 받아 정한 그림(또는 등록된 그림)을 붙인다. `<자리>-prompt.txt` 를 고치지 않고 그대로 낸다.\n\n' +
    '| 차례 | 자리 | 출력 | 첨부 | 올릴 파일 | 기록 자리 | 지시문 sha256 |\n|---|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
  console.log(`${card.name} — ${out.length} 자리 → ${dir}`);
  return 0;
}

function main(argv) {
  const cmd = argv[0], o = {};
  for (let i = 1; i < argv.length; i++) { if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else o.key = argv[i]; }
  if (!o.dir || !['init', 'build'].includes(cmd)) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 24).join('\n')); return 2; }
  if (cmd === 'build') return build(o.dir);
  const card = cardOf(o.key), f = path.join(o.dir, 'settings.json');
  if (fs.existsSync(f)) { console.error(f + ' 가 이미 있다 — 덮지 않는다'); return 1; }
  fs.mkdirSync(o.dir, { recursive: true });
  fs.writeFileSync(f, JSON.stringify(initSettings(card, { plan: o.plan, style: o.style, with: o.with, skins: o.skins }), null, 1) + '\n');
  console.log('→ ' + f);
  return 0;
}
module.exports = { slots, initSettings, validate, stateOf, build, fileOf, cardOf };
if (require.main === module) process.exit(main(process.argv.slice(2)));
