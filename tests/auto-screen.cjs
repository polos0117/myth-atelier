/* 오토 배틀 화면 — 사고, 놓고, 싸우고, 다음 라운드로. 판이 브라우저에 남는지. 규칙은 안 본다(그건 auto-sim). */
const assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const A = require('../lib/auto.js');
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('auto.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForSelector('.at-shop .at-card');
    const gold = async () => +(await p.locator('.at-gold b').innerText());
    assert.equal(await p.locator('.at-shop .at-card').count(), A.SHOP, '상점 다섯');
    assert.equal(await p.locator('.at-board[data-side="me"] .at-cell').count(), A.CELLS, '내 판 여섯 칸');
    assert.equal(await p.locator('.at-board[data-side="them"] .at-cell:not(.empty)').count(), 2, '1라운드 상대 둘');
    assert.equal(await p.locator('.at-bench .at-cell').count(), A.BENCH, '벤치 여섯');
    assert.equal(await gold(), 8, '시작 8금');

    /* 이번 판의 신화권 — 다섯 중 셋이 켜져 있고, 빈손이면 바꿀 수 있다 */
    const fs = require('node:fs'), cards = JSON.parse(fs.readFileSync('data/card.json', 'utf8')).cards, mythOf = n => cards.find(c => c.name === n).myth;
    assert.equal(await p.locator('.at-myth').count(), 5, '신화권 다섯');
    const onMyths = async () => p.locator('.at-myth.on').evaluateAll(els => els.map(e => e.dataset.myth));
    const before = await onMyths();
    assert.equal(before.length, A.MYTHS_PER_GAME, '셋이 켜져 있다');
    for (const n of await p.locator('.at-shop .at-card').evaluateAll(els => els.map(e => e.dataset.name))) assert(before.includes(mythOf(n)), '상점은 켜진 셋만: ' + n);
    const off = await p.locator('.at-myth:not(.on)').first().getAttribute('data-myth');
    await p.locator('.at-myth.on').first().click();
    assert(await p.locator('#at-myths-apply').isDisabled(), '둘이면 못 정한다');
    await p.locator('.at-myth[data-myth="' + off + '"]').click();
    await p.locator('#at-myths-apply').click();
    await p.waitForFunction(o => { const on = [...document.querySelectorAll('.at-myth.on')].map(e => e.dataset.myth); return on.includes(o); }, off);
    const after = await onMyths();
    assert(after.includes(off) && after.length === A.MYTHS_PER_GAME, '바꾼 셋: ' + after.join(','));
    for (const n of await p.locator('.at-shop .at-card').evaluateAll(els => els.map(e => e.dataset.name))) assert(after.includes(mythOf(n)), '바꾸면 상점도 새 셋: ' + n);
    assert.equal(await gold(), 8, '바꿔도 금은 그대로');

    /* 사기 → 벤치 */
    const first = await p.locator('.at-shop .at-card').first().getAttribute('data-name');
    await p.locator('.at-shop .at-card .buy').first().click();
    await p.waitForSelector('.at-bench .at-cell[data-name]');
    assert.equal(await p.locator('.at-bench .at-cell[data-name]').first().getAttribute('data-name'), first, '산 것이 벤치에');
    assert.equal(await gold(), 7, '1금이 줄었다');
    assert.equal(await p.locator('.at-myth:not(:disabled)').count(), 0, '사고 나면 신화권은 잠긴다');
    assert.equal(await p.locator('.at-shop .at-card.gone').count(), 1, '상점 칸이 비었다');

    /* 벤치 → 판 */
    await p.locator('.at-bench .at-cell[data-name]').first().click();
    await p.waitForSelector('.at-pick');
    await p.locator('.at-board[data-side="me"] .at-cell[data-index="1"]').click();
    await p.waitForSelector('.at-board[data-side="me"] .at-cell[data-index="1"][data-name]');
    assert.equal(await p.locator('.at-bench .at-cell[data-name]').count(), 0, '벤치가 비었다');
    assert((await p.locator('.sec', { hasText: '1 / 3' }).count()) >= 1, '판 위 1 / 3');
    assert.equal(await p.locator('.at-syn').count(), 2, '한 자루면 신화권·종류 줄이 하나씩, 아직 꺼진 채');
    assert.equal(await p.locator('.at-syn.on').count(), 0);

    /* 팔기 */
    await p.locator('.at-board[data-side="me"] .at-cell[data-index="1"]').click();
    await p.waitForSelector('#at-sell');
    await p.locator('#at-sell').click();
    await p.waitForFunction(() => !document.querySelector('.at-board[data-side="me"] .at-cell[data-name]'));
    assert.equal(await gold(), 8, '팔면 돌아온다');

    /* 다시 돌리기 */
    const names = await p.locator('.at-shop .at-card').evaluateAll(es => es.map(e => e.dataset.name || ''));
    await p.locator('#at-reroll').click();
    await p.waitForFunction(n => JSON.stringify([...document.querySelectorAll('.at-shop .at-card')].map(e => e.dataset.name || '')) !== n, JSON.stringify(names));
    assert.equal(await gold(), 6, '2금');
    assert.equal(await p.locator('.at-shop .at-card.gone').count(), 0, '다시 돌리면 다섯 칸이 찬다');

    /* 대신 두기 → 판이 찬다 */
    await p.locator('#at-auto').click();
    await p.waitForSelector('.at-board[data-side="me"] .at-cell[data-name]');
    const onBoard = await p.locator('.at-board[data-side="me"] .at-cell[data-name]').count();
    assert(onBoard >= 1 && onBoard <= A.cap(1), '판 위 수는 상한 안');

    /* 싸운다 → 결과 → 다음 라운드 */
    await p.locator('#at-fight').click();
    await p.waitForSelector('.at-result');
    const winner = await p.locator('.at-result').getAttribute('data-winner');
    assert(['me', 'them', 'draw'].includes(winner));
    assert((await p.locator('.at-log li').count()) > 2, '싸움 기록');
    assert.equal(await p.locator('.at-board[data-side="them"] .hpbar').count(), 2, '상대의 남은 체력 막대');
    await p.locator('#at-next').click();
    await p.waitForSelector('.at-shop .at-card');
    assert((await p.locator('.at-round b').innerText()).startsWith('2 /'), '2라운드');

    /* 새로고침해도 이어진다 */
    await p.reload(); await p.waitForSelector('.at-shop .at-card');
    assert((await p.locator('.at-round b').innerText()).startsWith('2 /'), '판이 남는다');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('myth_auto_v1')));
    assert.equal(saved.round, 2);

    /* 새 판 */
    await p.locator('#at-new').click();
    await p.waitForFunction(() => document.querySelector('.at-round b') && document.querySelector('.at-round b').innerText.startsWith('1 /'));

    /* 휴대폰 — 가로로 안 넘친다 */
    await p.setViewportSize(FOLD.cover);
    await p.waitForSelector('.at-shop .at-card');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), '가로로 넘친다');
    assert((await p.locator('.collection-scroll').boundingBox()).height > 100);

    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();
    console.log('PASS 오토 배틀 화면: 상점·사기·놓기·팔기·다시 돌리기·대신 두기·싸움·다음·저장·새 판·휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
