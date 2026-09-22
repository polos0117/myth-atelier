/* 던전 화면 — 고르고, 길에 서고, 싸우고, 저장되는지. 규칙은 안 본다(그건 run-sim). */
const assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('run.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForSelector('.rn-pick .cell');
    assert.equal(await p.locator('.rn-pick .cell').count(), 40, '마흔 자루');
    assert(await p.locator('.rn-btn.primary').isDisabled(), '셋을 고르기 전엔 못 나선다');
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    assert.equal(await p.locator('.rn-pick .cell.on').count(), 3, '셋 골랐다');
    await p.locator('.rn-pick .cell[data-name="그람"]').click();
    assert.equal(await p.locator('.rn-pick .cell.on').count(), 3, '넷째는 안 들어간다');
    await p.locator('.rn-btn.primary').click();
    await p.waitForSelector('.rn-map');
    assert.equal(await p.locator('.rn-node').count(), 8, '길 여덟 칸');
    assert.equal(await p.locator('.rn-node.here').count(), 0, '아직 첫 칸 앞');
    await p.locator('.rn-btn.primary').click();
    await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-party .rn-fig').count(), 3, '동료 셋이 선다');
    assert.equal(await p.locator('.rn-enemy .rn-fig').count(), 1, '첫 상대 하나');
    assert.equal(await p.locator('.rn-hand .rn-card').count(), 5, '손패 다섯');
    assert.equal(await p.locator('.rn-mana i.on').count(), 3, '마나 셋');
    assert((await p.locator('.rn-party .rn-fig img').count()) >= 1, '전신 그림이 걸린다');
    /* 상대를 두껍게 — 첫 카드에 쓰러지면 턴 끝을 못 본다 */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.battle.enemies.forEach(e => { e.hp = e.maxHp = 9999; }); localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    /* 카드를 낸다 → 마나가 줄고 기록이 남는다 */
    await p.locator('.rn-hand .rn-card:not(:disabled)').first().click();
    await p.waitForFunction(() => document.querySelectorAll('.rn-mana i.on').length < 3);
    assert((await p.locator('.rn-log div').count()) >= 2, '기록이 남는다');
    /* 턴 끝 → 2턴, 손패 새로 */
    await p.locator('.rn-deck .rn-btn').click();
    await p.waitForFunction(() => /2/.test(document.querySelector('.rn-head h2 small').textContent));
    assert.equal(await p.locator('.rn-hand .rn-card').count(), 5, '손패가 새로');
    /* 저장 — 다시 열어도 싸움 중 */
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-party .rn-fig').count(), 3, '길이 남는다');
    /* 버리기 → 다시 고르기 */
    await p.locator('[data-abandon]').click();
    await p.waitForSelector('.rn-pick .cell');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    /* 휴대폰 — 가로 넘침 없음 */
    await p.setViewportSize(FOLD.cover);
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.rn-map'); await p.locator('.rn-btn.primary').click();
    await p.waitForSelector('.rn-hand .rn-card');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '휴대폰 가로 넘침');
    await a.close();
    console.log('PASS 던전 화면: 고르기·길·싸움·카드·턴·저장·버리기·휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
