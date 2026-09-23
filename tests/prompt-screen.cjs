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
    const N = JSON.parse(require('node:fs').readFileSync('data/card.json', 'utf8')).cards.length;
    /* 지역과 이름 — 지역마다 그 권의 무기만, 지역을 바꾸면 무기 칸이 빈다 */
    const all = JSON.parse(require('node:fs').readFileSync('data/card.json', 'utf8')).cards;
    const myths = await p.locator('#pm-myth option').evaluateAll(os => os.map(o => o.value));
    assert.equal(myths.length, new Set(all.map(c => c.myth)).size, '지역 전부');
    let seen = 0;
    for (const m of myths) {
      await p.selectOption('#pm-myth', m);
      const opts = await p.locator('#pm-card option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
      assert.deepEqual(opts.slice().sort(), all.filter(c => c.myth === m).map(c => c.name).sort(), m + ' 의 무기만');
      seen += opts.length;
    }
    assert.equal(seen, N, '지역을 다 돌면 카드 전부');
    assert((await p.locator('#pm-myth option[value="celtic"]').innerText()).includes('그림'), '지역에 그림 수');
    await p.selectOption('#pm-myth', 'norse');

    await p.selectOption('#pm-card', '묠니르');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.startsWith('WEAPON: Mjolnir'));
    let t = await p.locator('#prompt-output').inputValue();
    assert(t.includes(S.STYLES.find(s => s[0] === S.DEFAULT_STYLE)[2]), '기본 화풍');
    assert(!t.includes('POSTURE:') && t.includes('WEAPON LOOK') && t.includes('mecha personification'), '기본은 자세 없이 메카 의인화');
    assert.equal(await p.locator('#pm-file').innerText(), '묠니르_' + S.DEFAULT_STYLE + '_f.webp');
    assert.equal(await p.locator('#pm-action option').count(), S.ACTIONS.blunt.length + 1, '자동 + 둔기 자세 넷');
    /* 설계 — 천으로, 선택 문단 켜기 */
    await p.selectOption('#pm-design', 'cloth');
    await p.waitForFunction(() => !document.querySelector('#prompt-output').value.includes('mecha personification'));
    await p.selectOption('#pm-design', 'mecha');
    await p.locator('#pm-extra-silhouette').check();
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('SILHOUETTE: blunt'));
    await p.locator('#pm-extra-silhouette').uncheck();
    await p.waitForFunction(() => !document.querySelector('#prompt-output').value.includes('SILHOUETTE:'));

    await p.selectOption('#pm-style', 'ink_wash');
    await p.selectOption('#pm-action', 'shoulder');
    assert.equal(await p.locator('.pm-group').count(), S.PARAM_GROUPS.length, '외형 묶음 다섯');
    assert.equal(await p.locator('#pm-hairColor').isVisible(), false, '머리 묶음은 접혀 있다');
    await p.locator('.pm-group[data-group="hair"] summary').click();
    /* 팔레트 — 동그라미를 누르면 select 도 따라온다 */
    assert.equal(await p.locator('[data-color-picker="hairColor"] .pm-color').count(), S.PARAMS.find(x => x.key === 'hairColor').options.length, '머리색 팔레트');
    await p.locator('[data-color-picker="hairColor"] .pm-color[data-value="crimson"]').click();
    await p.waitForFunction(() => document.querySelector('#pm-hairColor').value === 'crimson');
    assert.equal(await p.locator('[data-color-picker="hairColor"] .pm-color[aria-pressed="true"]').getAttribute('data-value'), 'crimson');
    /* 견본 그림 — 헤어스타일 */
    assert.equal(await p.locator('[data-figure-picker="hairStyle"] .pm-figure').count(), S.FIGURE_VALUES.hairStyle.length, '헤어 견본');
    /* 줄은 옆으로 구르고, 화면을 넓히지 않는다 */
    const row = await p.locator('[data-figure-picker="hairStyle"] .pm-figure-row').evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, ov: getComputedStyle(e).overflowX }));
    assert(row.sw > row.cw * 2 && row.ov === 'auto', '견본 줄이 옆으로 굴러야 한다: ' + JSON.stringify(row));
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), '견본 줄이 화면을 넓혔다');
    await p.locator('[data-figure-picker="hairStyle"] .pm-figure-row').evaluate(e => { e.scrollLeft = 400; });
    assert((await p.locator('[data-figure-picker="hairStyle"] .pm-figure-row').evaluate(e => e.scrollLeft)) > 300, '실제로 구른다');
    const loaded = await p.locator('[data-figure-picker="hairStyle"] .pm-figure img').first().evaluate(i => new Promise(r => { if (i.complete) r(i.naturalWidth > 0); else { i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); } }));
    assert(loaded, '견본 png 가 뜬다 (img/figure-previews 가 있어야 한다)');
    await p.locator('[data-figure-picker="hairStyle"] .pm-figure[data-value="high ponytail"]').click();
    await p.waitForFunction(() => document.querySelector('#pm-hairStyle').value === 'high ponytail');
    await p.locator('[data-figure-picker="hairStyle"] .pm-figures-head button[data-value=""]').click();
    await p.waitForFunction(() => document.querySelector('#pm-hairStyle').value === '');
    await p.locator('.pm-group[data-group="build"] summary').click();
    assert.equal(await p.locator('[data-figure-picker="body"] .pm-figure').count(), S.FIGURE_VALUES.body.length, '체형 견본');
    await p.locator('[data-figure-picker="body"] .pm-figure[data-value="athletic"]').click();
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('Body type: athletic.'));
    await p.selectOption('#pm-ethnicity', '__custom__');
    await p.waitForSelector('#pm-ethnicity-custom');
    await p.fill('#pm-ethnicity-custom', 'Sami');
    await p.fill('#pm-scene', 'stormy cliff at dusk');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('SCENE NOTE: stormy cliff at dusk'));
    t = await p.locator('#prompt-output').inputValue();
    assert(t.includes('POSTURE: ' + S.ACTIONS.blunt[1][2]) && t.includes('Hair color: crimson.') && t.includes('Facial ethnicity: Sami.'), t.slice(0, 200));
    assert((await p.locator('.pm-group[data-group="hair"] summary i').innerText()).includes('1'), '고른 수가 묶음 머리에');
    assert.equal(await p.locator('#pm-file').innerText(), '묠니르_ink_wash_f.webp');

    /* 출력을 바꾸면 파일 이름과 문장이 따라온다 */
    await p.selectOption('#pm-output', 'awaken');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText.endsWith('_awaken.webp'));
    t = await p.locator('#prompt-output').inputValue();
    assert(t.includes('attached') && !t.includes('POSTURE:'), '각성');
    await p.selectOption('#pm-output', 'cursed');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText.endsWith('_cursed.webp'));
    assert((await p.locator('#prompt-output').inputValue()).includes('CURSED state'), '저주');
    await p.selectOption('#pm-output', 'casual');
    await p.selectOption('#pm-casual', '3');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText.endsWith('_casual3.webp'));
    /* 일상컷 장면 — 외형 묶음은 사라지고 장면 칸이 온다 */
    await p.waitForSelector('#pm-casual-cat');
    assert.equal(await p.locator('.pm-group[data-group="hair"]').count(), 0, '일상컷에는 외형 묶음이 없다');
    assert.equal(await p.locator('#pm-casual-cat option').count(), S.CASUAL_CATS.filter(r => r[3] !== 'm').length, '갈래 전부');
    await p.selectOption('#pm-casual-cat', 'heritage_visit');
    await p.waitForFunction(() => document.querySelector('#pm-casual-ex') && document.querySelector('#pm-casual-ex').options.length > 3);
    assert.equal(await p.locator('#pm-casual-ex option').count(), S.CASUAL_EXAMPLES.heritage_visit.length, '유적 나들이 예시');
    await p.selectOption('#pm-casual-ex', 'museum_glass');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('EXAMPLE SCENE:'));
    t = await p.locator('#prompt-output').inputValue();
    assert(t.includes('CATEGORY:') && t.includes('museum vitrine') && !t.includes('SUBJECT:'), '갈래·예시가 문장에, 뼈대는 없다');
    /* 랜덤과 잠금 — 예시를 잠그면 갈래 랜덤이 꺼진다 */
    await p.locator('button[data-lock="ex"]').click();
    await p.waitForFunction(() => document.querySelector('button[data-random="cat"]').disabled);
    await p.locator('button[data-random="pose"]').click();
    await p.waitForFunction(() => document.querySelector('#pm-casual-pose').value !== '');
    await p.locator('#pm-casual-random-all').click();
    await p.waitForFunction(() => document.querySelector('#pm-casual-orient').value !== '');
    assert.equal(await p.locator('#pm-casual-cat').inputValue(), 'heritage_visit', '잠긴 예시의 갈래는 그대로');
    assert.equal(await p.locator('#pm-casual-ex').inputValue(), 'museum_glass');
    await p.locator('.pm-group[data-group="axes"] summary').click();
    await p.selectOption('#pm-casual-axes-skin_exposure', 'low');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('skin exposure: low'));
    await p.fill('#pm-casual-outfit', 'grey wool coat');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.includes('outfit and props: grey wool coat'));

    /* 다른 무기는 제 설정, 돌아오면 아까 것 */
    await p.selectOption('#pm-myth', 'india'); await p.selectOption('#pm-card', '간디바');
    await p.waitForFunction(() => document.querySelector('#prompt-output').value.startsWith('WEAPON: Gandiva'));
    assert.equal(await p.locator('#pm-file').innerText(), '간디바_' + S.DEFAULT_STYLE + '_f.webp', '새 무기는 기본 설정');
    assert((await p.locator('#prompt-output').inputValue()).includes('Facial ethnicity: South Asian.'), '인도면 남아시아가 자동');
    await p.reload(); await p.waitForSelector('#pm-card');
    assert.equal(await p.locator('#pm-card').inputValue(), '간디바', '고른 무기가 남는다');
    assert.equal(await p.locator('#pm-myth').inputValue(), 'india', '지역도 따라온다');
    await p.selectOption('#pm-myth', 'norse');
    assert.equal(await p.locator('#pm-card').inputValue(), '', '지역을 바꾸면 무기 칸이 빈다');
    await p.selectOption('#pm-card', '묠니르');
    await p.waitForFunction(() => document.querySelector('#pm-file').innerText === '묠니르_ink_wash_f_casual3.webp');
    assert.equal(await p.locator('#pm-casual-cat').inputValue(), 'heritage_visit', '일상컷 장면도 무기마다 남는다');
    await p.selectOption('#pm-output', 'portrait');
    await p.waitForSelector('.pm-group[data-group="hair"] summary');
    await p.locator('.pm-group[data-group="hair"] summary').click();
    assert.equal(await p.locator('#pm-hairColor').inputValue(), 'crimson', '무기마다 설정이 남는다');
    await p.locator('#pm-reset').click();
    await p.waitForFunction(d => document.querySelector('#pm-file').innerText === '묠니르_' + d + '_f.webp', S.DEFAULT_STYLE);

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
