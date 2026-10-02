/* 신기 결투 화면 — 덮개(344×882)에서 고르고, 덱을 짜고, 도전하고, 끝까지. 규칙은 안 본다(그건 duel-sim). */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { start, FOLD } = require('./browser-harness.cjs');
const A = require('../lib/duel.js');
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, img: d('img').img, duel: d('duel') }, D = A.derive(data);
const STORE = 'myth_duel_v1';
const tap = async (p, sel) => { for (const b of await p.locator(sel).evaluateAll(es => es.map(e => e.getBoundingClientRect()).map(r => [r.width, r.height]))) assert(b[0] >= 44 && b[1] >= 44, sel + ' 누르는 자리 44px: ' + b); };
const noOverflow = async p => assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '가로 넘침');
const store = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('duel.html', { viewport: FOLD.cover, mobile: true }), p = a.page;
    await p.emulateMedia({ reducedMotion: 'reduce' });
    /* 첫 고르기 */
    await p.waitForSelector('.du-pick .du-myth');
    assert.equal(await p.locator('.du-myth').count(), 11, '열한 권');
    assert(await p.locator('#du-pick-go').isDisabled(), '고르기 전엔 못 간다');
    await tap(p, '.du-myth'); await noOverflow(p);
    await p.locator('.du-myth[data-myth="norse"]').click();
    await p.locator('#du-pick-go').click();
    /* 로비 */
    await p.waitForSelector('.du-lobby');
    const max = A.collectionMax(data);
    assert.equal(await p.locator('.du-deck').getAttribute('data-ok'), 'true', '시작 덱은 규칙에 맞다');
    assert((await p.locator('.du-deck').innerText()).includes('25/25'), '덱 25/25');
    assert((await p.locator('.du-coll').innerText()).includes('25/' + max), '컬렉션 25/' + max);
    assert.equal(await p.locator('.du-boss').count(), 11, '주인 열하나');
    assert.equal(await p.locator('.du-boss:disabled').count(), 0, '다 도전할 수 있다');
    assert.equal(await p.locator('.du-lv .on').getAttribute('data-lv'), 'rookie', '처음은 신참');
    await p.locator('.du-lv [data-lv="veteran"]').click();
    assert.equal((await store(p)).profile.level, 'veteran', '난이도는 저장된다');
    await tap(p, '.du-boss'); await tap(p, '.du-lv button'); await noOverflow(p);
    /* 덱 짜기 — 빼면 규칙 줄이 빨개지고 출전이 막힌다 */
    await p.locator('#du-build').click(); await p.waitForSelector('.du-build .cell');
    assert.equal(await p.locator('.du-build .cell').count(), 25, '가진 카드만 보인다');
    assert.equal(await p.locator('.du-build .cell.in').count(), 25, '전부 덱에');
    const first = await p.locator('.du-build .cell.in').first().getAttribute('data-id');
    await p.locator('.du-build .cell[data-id="' + first + '"]').click();
    await p.waitForSelector('.du-rule[data-ok="false"]');
    assert.equal(await p.locator('.du-build .cell.in').count(), 24, '빼면 24');
    assert(await p.locator('[data-rule="count"].bad').count() === 1 && (await p.locator('.du-why').innerText()).length > 3, '장 수 규칙이 빨갛고 이유가 보인다');
    await p.locator('.du-build .du-main-pick [data-myth="greek"]').click();
    assert.equal(await p.locator('[data-rule="main"].bad').count(), 1, '주 권을 바꾸면 15장 규칙이 빨갛다');
    await p.locator('.du-build .du-main-pick [data-myth="norse"]').click();
    await tap(p, '.du-build .cell'); await noOverflow(p);
    await p.locator('#du-build-done').click(); await p.waitForSelector('.du-lobby');
    assert.equal(await p.locator('.du-deck').getAttribute('data-ok'), 'false', '로비도 안다');
    assert.equal(await p.locator('.du-boss:disabled').count(), 11, '출전이 막힌다');
    await p.reload(); await p.waitForSelector('.du-lobby');
    assert.equal(await p.locator('.du-boss:disabled').count(), 11, '새로고침해도 그대로(저장)');
    await p.locator('#du-build').click(); await p.waitForSelector('.du-build .cell');
    await p.locator('.du-build .cell[data-id="' + first + '"]').click(); await p.waitForSelector('.du-rule[data-ok="true"]');
    await p.locator('#du-build-done').click(); await p.waitForSelector('.du-boss:not(:disabled)');
    /* ── 대결 (과제 9) ── */
    /* ── 결과·전적 (과제 10) ── */
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    await a.close();
    console.log('PASS 결투 화면: 첫 고르기 · 로비 · 덱 짜기');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
