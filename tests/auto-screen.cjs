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
    assert.equal(await p.locator('.at-board[data-side="me"] .at-cell').count(), A.CELLS, '내 판 열두 칸');
    assert.equal(await p.locator('.at-board[data-side="them"] .at-cell:not(.empty)').count(), 1, '1라운드 상대는 수호자 하나');
    assert.equal(await p.locator('.at-lobby .at-who').count(), A.PLAYERS, '로비에 여섯');
    assert.equal(await p.locator('.at-bench .at-cell').count(), A.BENCH, '벤치 아홉');
    assert.equal(await gold(), 8, '시작 8금');

    /* 이번 판의 신화권 — MYTHS_PER_GAME 권이 켜져 있고, 빈손이면 바꿀 수 있다 */
    const fs = require('node:fs'), cards = JSON.parse(fs.readFileSync('data/card.json', 'utf8')).cards, mythOf = n => cards.find(c => c.name === n).myth;
    assert.equal(await p.locator('.at-myth').count(), Object.keys(JSON.parse(fs.readFileSync('data/group.json', 'utf8')).myth.name).length, '신화권 전부');
    const onMyths = async () => p.locator('.at-myth.on').evaluateAll(els => els.map(e => e.dataset.myth));
    const before = await onMyths();
    assert.equal(before.length, A.MYTHS_PER_GAME, A.MYTHS_PER_GAME + '권이 켜져 있다');
    for (const n of await p.locator('.at-shop .at-card').evaluateAll(els => els.map(e => e.dataset.name))) assert(before.includes(mythOf(n)), '상점은 켜진 권만: ' + n);
    const offs = await p.locator('.at-myth:not(.on)').evaluateAll(els => els.slice(0, 2).map(e => e.dataset.myth)), off = offs[0];
    await p.locator('.at-myth.on').first().click();
    await p.locator('.at-myth.on').first().click();
    assert(await p.locator('#at-myths-apply').isDisabled(), '하나로는 못 정한다(둘부터)');
    await p.locator('.at-myth[data-myth="' + offs[0] + '"]').click();
    assert(!(await p.locator('#at-myths-apply').isDisabled()), '둘이면 정할 수 있다');
    await p.locator('.at-myth[data-myth="' + offs[1] + '"]').click();
    await p.locator('#at-myths-apply').click();
    await p.waitForFunction(o => { const on = [...document.querySelectorAll('.at-myth.on')].map(e => e.dataset.myth); return on.includes(o); }, off);
    const after = await onMyths();
    assert(offs.every(o => after.includes(o)) && after.length === 3, '바꾼 권: ' + after.join(','));
    for (const n of await p.locator('.at-shop .at-card').evaluateAll(els => els.map(e => e.dataset.name))) assert(after.includes(mythOf(n)), '바꾸면 상점도 새 권: ' + n);
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
    assert((await p.locator('.sec', { hasText: '1 / 1' }).count()) >= 1, '판 위 1 / 1 — 레벨 1');
    assert.equal(await p.locator('.at-syn').count(), 2, '한 자루면 신화권·종류 줄이 하나씩, 아직 꺼진 채');
    assert.equal(await p.locator('.at-syn.on').count(), 0);

    /* 정보 — 고르면 세기·기술·시너지가 뜬다. 상대 판·상점 그림도 누르면 뜬다 */
    await p.locator('.at-board[data-side="me"] .at-cell[data-index="1"]').click();
    await p.waitForSelector('.at-info[data-info]');
    assert((await p.locator('.at-info').innerText()).includes(require('node:fs') && JSON.parse(require('node:fs').readFileSync('data/skill.json', 'utf8')).skills[cards.find(c => c.name === first).skill].name), '기술 이름이 보인다');
    await p.locator('.at-board[data-side="me"] .at-cell[data-index="1"]').click();
    await p.locator('.at-board[data-side="them"] .at-cell:not(.empty)').first().click();
    await p.waitForSelector('.at-info #at-info-close');
    await p.locator('#at-info-close').click();
    await p.locator('.at-shop .at-card .face').first().click();
    await p.waitForSelector('.at-info[data-info]');
    await p.locator('#at-info-close').click();
    await p.waitForFunction(() => !document.querySelector('.at-info'));

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

    /* 레벨 업 — 4금에 경험치 4, 1레벨에서 3레벨로 */
    await p.locator('#at-xp').click();
    await p.waitForFunction(() => document.querySelector('.at-level b') && document.querySelector('.at-level b').innerText === '3');
    assert.equal(await gold(), 2, '4금이 줄었다');
    /* 로비 — 누르면 그 판을 본다 */
    await p.locator('.at-who[data-player="1"]').click();
    await p.waitForSelector('.at-scout[data-scout="1"]');
    await p.locator('#at-scout-close').click();
    await p.waitForFunction(() => !document.querySelector('.at-scout'));

    /* 대신 두기 → 판이 찬다 */
    await p.locator('#at-auto').click();
    await p.waitForSelector('.at-board[data-side="me"] .at-cell[data-name]');
    const onBoard = await p.locator('.at-board[data-side="me"] .at-cell[data-name]').count();
    assert(onBoard >= 1 && onBoard <= 3, '판 위 수는 레벨 안');

    /* 싸운다 → 결과 → 다음 라운드 */
    await p.locator('#at-fight').click();
    /* 다시 보기 — 판 위에서 싸움이 돈다. 체력이 줄고, 2배속은 남고, 건너뛰면 결과 */
    await p.waitForSelector('#at-skip');
    assert.equal(await p.locator('.at-result').count(), 0, '도는 동안은 결과를 숨긴다');
    await p.waitForFunction(() => [...document.querySelectorAll('.at-board .at-cell[data-hp]')].some(e => e.querySelector('.hpbar u') && parseFloat(e.querySelector('.hpbar u').style.width) < 100), null, { timeout: 15000 });
    await p.locator('#at-speed').click();
    assert.equal(await p.evaluate(() => localStorage.getItem('myth_auto_speed')), '2', '2배속이 남는다');
    await p.locator('#at-skip').click();
    await p.waitForSelector('.at-result');
    await p.locator('#at-replay').click();
    await p.waitForSelector('#at-skip');
    await p.locator('#at-skip').click();
    await p.waitForSelector('.at-result');
    const winner = await p.locator('.at-result').getAttribute('data-winner');
    assert(['me', 'them', 'draw'].includes(winner));
    assert((await p.locator('.at-log li').count()) > 2, '싸움 기록');
    assert.equal(await p.locator('.at-board[data-side="them"] .hpbar').count(), 1, '상대의 남은 체력 막대');
    await p.locator('#at-next').click();
    await p.waitForSelector('.at-shop .at-card');
    assert((await p.locator('.at-round').innerText()).startsWith('2라운드'), '2라운드');

    /* 새로고침해도 이어진다 */
    await p.reload(); await p.waitForSelector('.at-shop .at-card');
    assert((await p.locator('.at-round').innerText()).startsWith('2라운드'), '판이 남는다');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('myth_auto_v2')));
    assert.equal(saved.round, 2);

    /* 새 판 */
    await p.locator('#at-new').click();
    await p.waitForFunction(() => document.querySelector('.at-round') && document.querySelector('.at-round').innerText.startsWith('1라운드'));

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
