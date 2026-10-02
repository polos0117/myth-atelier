/* 드래프트 화면 — 판 짜기, 팩에서 집기, 보급, 편성·기록, 끝까지, 저장·전적. 규칙은 안 본다(그건 draft-sim). */
const assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('draft.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForSelector('.df-setup');
    await p.locator('[data-lv="2"]').click(); await p.locator('[data-rr="3"]').click();
    /* 판의 신화권 — 기본은 무작위 셋, 하나면 못 나서고, 전부도 된다 */
    const onM = () => p.locator('.df-setup .at-myth.on').evaluateAll(es => es.map(e => e.dataset.myth));
    assert.equal((await onM()).length, 3, '기본은 셋');
    const on0 = await onM(); await p.locator('.at-myth[data-myth="' + on0[0] + '"]').click(); await p.locator('.at-myth[data-myth="' + on0[1] + '"]').click();
    assert(await p.locator('.df-setup .rn-btn.primary').isDisabled(), '하나로는 못 나선다');
    await p.locator('[data-myths="all"]').click();
    assert.equal((await onM()).length, await p.locator('.df-setup .at-myth').count(), '전부');
    await p.locator('[data-myths="random"]').click();
    const picked = await onM(); assert.equal(picked.length, 3, '무작위 셋');
    await p.locator('.rn-btn.primary').click();
    await p.waitForSelector('.df-pack .df-card');
    assert.equal(await p.locator('.map-stage[data-has-map]').count(), 1, '팩 뒤에 맵 — 판의 첫 권');
    const cardMyth = JSON.parse(require('node:fs').readFileSync('data/card.json', 'utf8')).cards.reduce((m, c) => (m[c.name] = c.myth, m), {});
    for (const nm of await p.locator('.df-pack .df-card').evaluateAll(es => es.map(e => e.dataset.name))) assert(picked.includes(cardMyth[nm]), '팩은 고른 셋에서만: ' + nm);
    assert.equal(await p.locator('.df-pack .df-card').count(), 9, '팩 아홉');
    assert.equal(await p.locator('.df-pack .df-card[data-type="weapon"]').count(), 9, '첫 라운드는 무기');
    assert((await p.locator('.df-card .dl').count()) === 9, '미리보기가 붙는다');
    assert(await p.locator('[data-pick]').isDisabled(), '고르기 전엔 못 집는다');
    /* 보급 → 팩이 바뀐다 */
    const before = await p.locator('.df-pack .df-card').evaluateAll(es => es.map(e => e.dataset.name).join(','));
    await p.locator('[data-resupply]').click();
    await p.waitForFunction(b => document.querySelectorAll('.df-pack .df-card').length === 9 && [...document.querySelectorAll('.df-pack .df-card')].map(e => e.dataset.name).join(',') !== b, before);
    /* 한 장 누르면 고르고, 집는다 */
    const name = await p.locator('.df-pack .df-card').first().getAttribute('data-name');
    await p.locator('.df-pack .df-card').first().click();
    await p.waitForSelector('.df-pack .df-card.on');
    await p.locator('[data-pick]').click();
    await p.waitForFunction(n => [...document.querySelectorAll('[data-seat="0"] .df-pair')].some(e => e.textContent.includes(n)), name);
    assert((await p.locator('.df-log li').count()) >= 3, '지명 기록이 쌓인다');
    assert.equal(await p.locator('.df-pack .df-card').count(), 9, '다음 팩');
    /* 저장 */
    await p.reload(); await p.waitForSelector('.df-pack .df-card');
    assert((await p.locator('[data-seat="0"] .df-pair').count()) >= 1, '판이 남는다');
    /* 끝까지 — 첫 장씩 */
    for (let i = 0; i < 12 && await p.locator('.df-pack .df-card').count(); i++) {
      await p.locator('.df-pack .df-card').first().click(); await p.locator('.df-pack .df-card').first().click();
      await p.waitForFunction(() => !document.querySelector('.df-pack .df-card.on'));
    }
    await p.waitForSelector('.rn-end');
    assert.equal(await p.locator('.df-result .df-panel.me').count(), 1, '결과에 내 편이');
    assert((await p.locator('.df-result [data-seat="0"] .df-pair').count()) >= 6, '짝 여섯');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    assert.equal(await p.locator('[data-sortie]').count(), 1, '출정 단추');
    await p.locator('[data-sortie]').click();
    await p.waitForURL(/run\.html/); await p.waitForSelector('.rn-sortie .cell');
    assert.equal(await p.locator('.rn-sortie .cell').count(), 6, '던전이 짝 여섯을 받았다');
    await p.goto(harness.base + '/draft.html'); await p.waitForSelector('.rn-end');
    await p.locator('[data-again]').click(); await p.waitForSelector('.df-setup');
    assert(/1판/.test(await p.locator('.df-records').innerText()), '전적 한 판');
    /* 휴대폰 */
    await p.setViewportSize(FOLD.cover);
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.df-pack .df-card');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '휴대폰 가로 넘침');
    await a.close();
    console.log('PASS 드래프트 화면: 판 짜기·팩·보급·집기·기록·저장·결과·전적·휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
