/* 생성기 화면 — 고르면 문장이 바뀌고, 파일 이름이 맞고, 설정이 무기마다 남는다. 문장 자체는 prompt-engine 이 본다. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lib/prompt-spec.js', 'utf8'), ctx);
const S = ctx.window.AtelierSpec;
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('prompt.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForSelector('#pm-card');
    assert.equal(await p.locator('#prompt-output').inputValue(), '', '고르기 전엔 빈칸');
    assert.equal(await p.locator('#pm-card option').count(), 41, '마흔 자루 + 빈 칸');

    await p.selectOption('#pm-card', '묠니르');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.startsWith('WEAPON: Mjolnir'));
    let t = await p.locator('#prompt-output').inputValue();
    assert(t.includes(S.STYLES.find(s => s[0] === S.DEFAULT_STYLE)[2]), '기본 화풍');
    assert(t.includes('ACTION: ' + S.ACTIONS.blunt[0][2]), '둔기의 첫 동작');
    assert.equal(await p.locator('#pm-file').innerText(), '묠니르_glossy_promo_f.webp');
    assert.equal(await p.locator('#pm-action option').count(), S.ACTIONS.blunt.length, '둔기 동작 넷');

    await p.selectOption('#pm-style', 'ink_wash');
    await p.selectOption('#pm-action', 'shoulder');
    await p.selectOption('#pm-hairColor', 'crimson');
    await p.selectOption('#pm-ethnicity', '__custom__');
    await p.waitForSelector('#pm-ethnicity-custom');
    await p.fill('#pm-ethnicity-custom', 'Sami');
    await p.fill('#pm-scene', 'stormy cliff at dusk');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('SCENE NOTE: stormy cliff at dusk'));
    t = await p.locator('#prompt-output').inputValue();
    assert(t.includes('ACTION: ' + S.ACTIONS.blunt[1][2]) && t.includes('Hair color: crimson.') && t.includes('Facial ethnicity: Sami.'), t.slice(0, 200));
    assert.equal(await p.locator('#pm-file').innerText(), '묠니르_ink_wash_f.webp');

    /* 출력을 바꾸면 파일 이름과 문장이 따라온다 */
    await p.selectOption('#pm-output', 'awaken');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText.endsWith('_awaken.webp'));
    t = await p.locator('#prompt-output').inputValue();
    assert(t.includes('attached') && !t.includes('ACTION:'), '각성');
    await p.selectOption('#pm-output', 'casual');
    await p.fill('#pm-casual', '3');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText.endsWith('_casual3.webp'));

    /* 다른 무기는 제 설정, 돌아오면 아까 것 */
    await p.selectOption('#pm-card', '간디바');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.startsWith('WEAPON: Gandiva'));
    assert.equal(await p.locator('#pm-file').innerText(), '간디바_glossy_promo_f.webp', '새 무기는 기본 설정');
    assert((await p.locator('#prompt-output').inputValue()).includes('Facial ethnicity: South Asian.'), '인도면 남아시아가 자동');
    await p.reload(); await p.waitForSelector('#pm-card');
    assert.equal(await p.locator('#pm-card').inputValue(), '간디바', '고른 무기가 남는다');
    await p.selectOption('#pm-card', '묠니르');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText === '묠니르_ink_wash_f_casual3.webp');
    assert.equal(await p.locator('#pm-hairColor').inputValue(), 'crimson', '무기마다 설정이 남는다');
    await p.locator('#pm-reset').click();
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText === '묠니르_glossy_promo_f.webp');

    /* 복사 단추가 있고, 휴대폰에서 안 넘친다 */
    assert.equal(await p.locator('#pm-copy').isDisabled(), false);
    await p.setViewportSize(FOLD.cover);
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), '가로로 넘친다');

    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();
    console.log('PASS 생성기 화면: 고르기·화풍·동작·외형·직접 입력·장면·출력 셋·파일 이름·무기별 저장·초기화·휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
