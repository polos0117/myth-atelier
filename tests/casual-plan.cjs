/* 일상컷 묶음 계획기(tools/casual-plan.cjs) — 카드 여럿 × 씨앗: 묶음 규칙 · 트리 위 · 기록 · 지시문, 있는 컷 위에 더 짜기, 규칙 검사, 안 쓴 값 먼저.
   Run: node tests/casual-plan.cjs */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const P = require('../tools/casual-plan.cjs');
const R0 = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(R0, f), 'utf8');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/casual-tree-v2.js', 'lib/prompt-myth.js']) vm.runInContext(read(f), ctx);
const S = ctx.window.AtelierSpec, C2 = ctx.window.AtelierCasualTreeV2, PM = ctx.window.AtelierPrompt;
const tree = JSON.parse(read('data/casual-tree.json')), tree2 = JSON.parse(read('data/casual-tree-v2.json')), T2 = C2.make(tree2, tree);
const cards = JSON.parse(read('data/card.json')).cards;
const data = { cards, group: JSON.parse(read('data/group.json')), skills: JSON.parse(read('data/skill.json')).skills, tree, tree2 };
const plain = x => JSON.parse(JSON.stringify(x));

/* 1. 카드 열한 장 × 씨앗 둘 × 세 장 · 다섯 장 */
let n = 0;
const some = cards.filter((_, i) => i % 17 === 0);
for (const card of some) for (const seed of [1, 2]) for (const count of [3, 5]) {
  const slots = [...Array(count).keys()].map(i => i + 2);
  const res = P.plan(card, slots, [], { seed });
  const w = card.name + ' ' + seed + ' ' + count;
  assert.deepEqual(P.check(res.cuts, card), [], w);
  assert.deepEqual(res.cuts.map(c => c.n), slots, w + ' 칸 번호');
  assert(res.cuts.every(c => c.treeV === 2 && c.preset && !c.act && !c.pose && !c.orient && !c.lens), w + ' 버전2 칸만');
  assert(res.cuts.some(c => P.requiredType(c) === res.required), w + ' 필수 갈래');
  assert.equal(new Set(res.cuts.map(c => c.preset)).size, count, w + ' 자세 추천은 서로 다르게');
  assert.equal(new Set(res.cuts.map(c => c.frame)).size, count, w + ' 프레이밍은 서로 다르게');
  assert.equal(new Set(res.cuts.map(c => c.place)).size, count, w + ' 장소는 서로 다르게');
  if (count >= 4) assert.equal(new Set(res.cuts.map(c => c.era)).size, 4, w + ' 시대 넷이 다');
  assert(res.cuts.some(c => ['full_body', 'environmental'].includes(c.frame)) && res.cuts.some(c => ['chest_up', 'face_close'].includes(c.frame)), w + ' 먼 컷 · 가까운 컷');
  assert(!res.cuts.some(c => (C2.use(T2, c.use) || {}).prop === 'signature'), w + ' 무기를 소품으로 들지 않는다');
  assert(res.cuts.filter(c => C2.awkward(T2, c.ofam, c.place).length).length <= 1, w + ' ⚠ 한 장까지');
  assert(res.cuts.filter(c => P.DRINKS.includes((C2.use(T2, c.use) || {}).prop)).length <= 1, w + ' 마실 것 한 장까지');
  for (const c of res.cuts) {
    const { n: _n, ...sc } = c;
    assert.deepEqual(plain(C2.repair(T2, sc, card)), plain({ ...sc, treeV: 2 }), w + ' 칸 ' + c.n + ' 다시 검사가 고칠 것이 없다');
    assert(c.axes.overall_intensity === 'strong' && c.axes.skin_exposure === 'bold' && !('action_level' in c.axes), w + ' 고정값 · 버전2 축');
    /* 기록 — 생성기 저장 상태(localStorage myth_prompt_v1) 꼴. 그 storage 로 지은 지시문이 기록의 지시문과 같다 */
    const rec = P.record(card, c, 'game_keyart'), st = rec.storage[card.name];
    assert(rec.storage.__card === card.name && st.output === 'casual' && st.casualIndex === c.n && st.casual.treeV === 2 && st.casual.locks['axes.skin_exposure'], w + ' 기록 꼴');
    assert.equal(rec.file, card.name.replace(/ /g, '_') + '_game_keyart_f_casual' + c.n + '.webp', w + ' 파일 이름');
    assert.equal(rec.record, 'records/' + card.name.replace(/ /g, '_') + '/casual' + c.n + '-ui.json');
    assert.equal(PM.build({ ...st, card: card.name }, data), rec.prompt, w + ' 기록 storage → 같은 지시문');
    assert(rec.prompt.includes('POSTURE: ') && rec.prompt.includes('COMPOSITION: ') && !rec.prompt.includes('Activity:'), w + ' 버전2 지시문');
  }
  n++;
}
/* 2. 필수 갈래 돌리기 — 카드 차례대로 넷, --required 로 바꾼다 */
const types = new Set(cards.slice(0, 8).map(c => P.plan(c, [2, 3, 4], [], { seed: 5 }).required));
assert.equal(types.size, 4, '필수 갈래 넷을 돌린다: ' + [...types]);
assert.equal(P.plan(cards[0], [2, 3, 4], [], { seed: 5, required: 'in_myth' }).required, 'in_myth');

/* 3. 있는 컷 위에 더 짠다 — 기록 폴더 읽기, 이미 있는 장소 · 프레이밍은 피한다, 필수 갈래가 있으면 다시 강요하지 않는다 */
const card = cards.find(c => c.name === '묠니르');
const first = P.plan(card, [4, 5, 6], [], { seed: 9 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
for (const c of first.cuts) fs.writeFileSync(path.join(dir, `casual${c.n}-ui.json`), JSON.stringify(P.record(card, c, 'game_keyart')));
fs.writeFileSync(path.join(dir, 'casual9-ui.json'), JSON.stringify({ card: card.name, storage: { [card.name]: { casual: { era: 'now', place: 'street_alley', act: 'stroll' } } } }));
const old = P.oldCuts(dir, card);
assert.equal(old.length, 3, '버전2 기록만 읽는다(버전1 기록은 뺀다)');
assert(old.every(o => o.old && first.cuts.some(c => c.n === o.n && c.place === o.place)), '기록 → 장면');
const more = P.plan(card, [7, 8], old, { seed: 9 });
assert.deepEqual(P.check(more.cuts, card, old), [], '있는 세 장 위에 두 장');
assert(!more.cuts.some(c => old.some(o => o.place === c.place)), '이미 있는 장소는 피한다');
/* 4. 규칙 검사 — 틀린 묶음은 걸린다 */
const errs = f => P.check(f(plain(first.cuts)), card).join(' / ');
assert.match(errs(cs => { cs[1].place = cs[0].place; return cs; }), /장소 .* 2 번|트리에서 못 고른다/);
assert.match(errs(cs => { cs.forEach(c => { c.ofam = 'everyday'; c.item = ''; c.era = 'now'; }); return cs; }), /필수 갈래가 없다|트리에서 못 고른다/);
assert.match(errs(cs => { cs[1].frame = cs[0].frame; return cs; }), /프레이밍|트리에서 못 고른다/);
assert.match(errs(cs => { cs[0].treeV = 1; return cs; }), /버전2 장면이 아니다/);
assert.deepEqual(P.check(first.cuts.map(c => ({ ...c, place: first.cuts[0].place })), card, [], [5, 6]).filter(e => /^장소 /.test(e)), [], '사용자가 고른 칸은 겹침에서 뺀다');
/* 5. 카드 사이 안 쓴 값 먼저 — 장소 · 자세 추천 · 표정을 많이 쓴 것으로 채운 횟수를 주면 안 쓴 값이 훨씬 자주 */
{
  const places = C2.allPlaces(T2).map(p => p.key), presets = tree2.presets.map(x => x.key), exprs = S.CASUAL_EXPRESSIONS.map(r => r[0]).filter(Boolean);
  const third = list => new Set(list.filter((k, i) => i % 3 === 0)), fP = third(places), fR = third(presets), fE = third(exprs);
  const heavy = (all, keep) => Object.fromEntries(all.filter(k => !keep.has(k)).map(k => [k, 12]));
  const usage = { prop: {}, place: heavy(places, fP), item: {}, preset: heavy(presets, fR), posture: {}, expr: heavy(exprs, fE) };
  const share = (u, f, set) => { let hit = 0, all = 0; for (const c0 of cards.slice(0, 10)) for (const seed of [3, 11]) for (const c of P.plan(c0, [2, 3, 4, 5], [], { seed, usage: u }).cuts) { if (!c[f]) continue; all++; if (set.has(c[f])) hit++; } return hit / all; };
  for (const [f, set, name] of [['place', fP, '장소'], ['preset', fR, '자세 추천'], ['expr', fE, '표정']]) {
    const base = share({}, f, set), lean = share(usage, f, set);
    // 자세 추천은 프레이밍 · 장소가 먼저 거른다(네 칸에 프레이밍 넷) — 0.5 를 넘고 횟수 없을 때의 1.5 배
    assert(lean > 0.5 && lean > base * 1.5, name + ' — 안 쓴 값 비율 ' + lean.toFixed(2) + ' (횟수 없이 ' + base.toFixed(2) + ')');
  }
  assert.deepEqual(P.plan(card, [2, 3, 4], [], { seed: 7, usage }).cuts, P.plan(card, [2, 3, 4], [], { seed: 7, usage }).cuts, '같은 입력 · 씨앗이면 같은 답');
  /* 기록 폴더의 횟수 — 버전2 기록만, 제 카드 · sprites 는 뺀다 */
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-'));
  fs.mkdirSync(path.join(top, '묠니르')); fs.mkdirSync(path.join(top, '궁니르')); fs.mkdirSync(path.join(top, 'sprites'));
  for (const c of first.cuts) { fs.writeFileSync(path.join(top, '묠니르', `casual${c.n}-ui.json`), JSON.stringify(P.record(card, c, 'game_keyart'))); fs.writeFileSync(path.join(top, '궁니르', `casual${c.n}-ui.json`), JSON.stringify(P.record(card, c, 'game_keyart'))); }
  const u = P.sceneUsage(top, '묠니르');
  assert.equal(Object.values(u.place).reduce((a, b) => a + b, 0), 3, '다른 카드 기록만 센다');
}
/* 6. 등록부 · 화풍 — 기본 칸은 등록되지 않은 번호, 화풍은 카드의 기본 그림 화풍 */
assert.equal(P.styleOf(card), 'game_keyart');
assert(P.registered(card, 'game_keyart').length >= 1, '묠니르 일상컷이 등록부에 있다');
assert.equal(P.cardOf('아킬레우스의_창').name, '아킬레우스의 창', '밑줄 이름도 받는다');

console.log(`PASS 일상컷 묶음 계획: 카드 ${some.length} × 씨앗 둘 × 세 장 · 다섯 장 ${n}묶음 규칙 · 트리 위 · 기록 → 같은 지시문 · 필수 갈래 돌리기 · 있는 컷 위에 더 짜기 · 규칙 검사 · 안 쓴 값 먼저`);
