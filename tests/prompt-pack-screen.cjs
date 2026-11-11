/* 지시문 묶음 = 생성기 화면 — tools/prompt-pack.cjs 가 쓴 기록의 저장 상태를 화면에 넣으면 화면이 같은 지시문 · 같은 파일 이름을 만든다.
   두 카드: 액션 · 각성 · 저주 · 일상 세 칸(계획기 계획) · 스킨 셋, 외형 · 장면 · 노출을 고친 설정 하나. 「기록 내보내기」 도 같은 기록.
   틀린 설정은 아무것도 안 쓴다. node tests/prompt-pack-screen.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { start } = require('./browser-harness.cjs');
const C = require('../tools/casual-plan.cjs'), K = require('../tools/prompt-pack.cjs');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-pack-'));
  const h = await start();
  const quiet = fn => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
  try {
    let n = 0;
    for (const [name, skins, edit] of [['묠니르', '', null], ['티르핑', 'frost', set => {
      set.look.params = { hairColor: 'silver', eyeColor: '#3a7bd5', ethnicity: 'Sami' }; set.look.extras.myth = true; set.look.design = 'cloth'; set.look.why = '검사 — 직접 입력';
      set.slots.base.scene = 'stormy cliff at dusk'; set.slots.base.why = '검사';
      set.slots.casual2.custom = 'Her right hand holds one letter.'; set.slots.casual2.why = '검사'; set.slots.casual3.exposure = 'moderate'; set.slots.casual3.why = '필터 거절 뒤 노출 낮추기 검사';
    }]]) {
      const card = K.cardOf(name), dir = path.join(tmp, 'pack-' + n), planDir = path.join(tmp, 'plan-' + n);
      const res = C.plan(card, [2, 3, 4], [], { seed: 21 });
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'plan.json'), JSON.stringify({ card: card.name, style: 'game_keyart', seed: 21, tree: 2, required: res.required, slots: [2, 3, 4], cuts: res.cuts }));
      const set = K.initSettings(card, { plan: path.join(planDir, 'plan.json'), with: 'base,awaken,cursed', skins });
      assert.deepEqual(set.base, ['base', 'awaken', 'cursed'], '--with 면 있어도 넣는다');
      if (edit) edit(set);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(set));
      assert.equal(quiet(() => K.build(dir)), 0, name + ' build');
      const list = K.slots(card, set, res);
      assert.equal(list.length, 6 + (skins ? 3 : 0), name + ' 자리 수');
      assert(fs.readFileSync(path.join(dir, 'INDEX.md'), 'utf8').includes('| 1 | base | portrait | 없음(새 인물) |'), 'INDEX — 액션은 새 인물');
      for (const s of list) {
        const rec = JSON.parse(fs.readFileSync(path.join(dir, s.slot + '-ui.json'), 'utf8'));
        assert.equal(fs.readFileSync(path.join(dir, s.slot + '-prompt.txt'), 'utf8'), rec.prompt);
        assert.equal(rec.record, 'records/' + name + '/' + s.slot + '-ui.json');
        if (edit && s.slot === 'casual3') assert(/skin exposure: moderate/.test(rec.prompt) && !/skin exposure: bold/.test(rec.prompt), '일상 노출 낮추기가 지시문에');
        /* 액션 · 각성 · 저주 · 스킨 자리는 칸 꼴(2026-11-11 3단계), 일상 자리는 그대로 — 묶음과 화면이 같은 조립부라 아래에서 글자까지 같다 */
        assert.equal(/\n\n1\. STYLE\n[^]*\n\n5\. CONSTRAINTS\n/.test(rec.prompt), !/^casual/.test(s.slot), name + ' ' + s.slot + ' 지시문 꼴(칸 꼴은 일상컷이 아닌 자리만)');
        if (edit && s.slot === 'base') assert(rec.prompt.includes('Facial ethnicity: Sami.') && rec.prompt.includes('Scene note: stormy cliff at dusk'), '외형 직접 입력 · 장면');
        const a = await h.open('index.html'), p = a.page;
        await p.evaluate(st => localStorage.setItem('myth_prompt_v1', JSON.stringify(st)), rec.storage);
        await p.goto(p.url().replace(/index\.html.*$/, 'prompt.html'));
        await p.waitForFunction(() => document.querySelector('#prompt-output') && document.querySelector('#prompt-output').value.length > 0);
        assert.equal(await p.$eval('#prompt-output', e => e.value), rec.prompt, name + ' ' + s.slot + ' 화면과 묶음 지시문이 다르다');
        assert.equal(await p.$eval('#pm-file', e => e.innerText.trim()), rec.file, name + ' ' + s.slot + ' 파일 이름');
        /* 기록 내보내기 — 같은 자리 · 같은 지시문 · 같은 저장 상태 */
        if (s.slot === 'base' || s.slot === 'casual2') {
          await p.locator('#pm-record').click();
          const mine = JSON.parse(await p.$eval('#pm-record-text', e => e.value));
          assert.equal(mine.prompt, rec.prompt); assert.equal(mine.record, rec.record); assert.equal(mine.file, rec.file);
          assert.equal(mine.storage[name].output, rec.storage[name].output);
        }
        assert.deepEqual(a.errors, []);
        await a.close(); n++;
      }
    }
    /* 틀린 칸은 아무것도 안 쓴다 */
    const card = K.cardOf('묠니르'), bad = path.join(tmp, 'bad');
    fs.mkdirSync(bad);
    const set = K.initSettings(card, { with: 'base,awaken,cursed' });
    set.look.params = { hairColor: 'not-a-value' }; set.slots.base.action = 'nope'; set.slots.awaken.scene = 'x'; set.slots.cursed.extra = 1; set.look.design = 'plush'; set.skins = ['ghost'];
    fs.writeFileSync(path.join(bad, 'settings.json'), JSON.stringify(set));
    const err = console.error; const said = []; console.error = m => said.push(m);
    try { assert.equal(K.build(bad), 1); } finally { console.error = err; }
    assert(!fs.existsSync(path.join(bad, 'base-prompt.txt')), '틀리면 쓰지 않는다');
    for (const re of [/look 에 직접 입력/, /action 의 값 nope/, /slots\.awaken 에 직접 입력/, /slots\.cursed 에 없는 칸 extra/, /look\.design/, /스킨 열쇠 ghost/]) assert(said.some(m => re.test(m)), re + ' 를 알린다');
    /* 그릴 자리가 없으면 멈춘다 — 액션 · 각성 · 저주가 다 있는 카드에 계획 · 스킨이 없을 때 */
    const none = path.join(tmp, 'none'); fs.mkdirSync(none);
    fs.writeFileSync(path.join(none, 'settings.json'), JSON.stringify(K.initSettings(card, {})));
    console.error = () => {};
    try { assert.equal(K.build(none), 1, '빈 묶음'); } finally { console.error = err; }
    console.log(`PASS 지시문 묶음 ↔ 생성기 화면: ${n} 자리(두 카드 · 액션 · 각성 · 저주 · 일상 · 스킨 · 고친 설정)를 화면에 넣으면 같은 지시문 · 같은 파일 이름 · 기록 내보내기도 같다 · 틀린 설정은 안 쓴다`);
  } finally { await h.stop(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
