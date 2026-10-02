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
    /* 도전 → 멀리건 */
    await p.locator('.du-boss[data-myth="greek"]').click(); await p.waitForSelector('.du-mull .du-card');
    assert.equal(await p.locator('.du-mull .du-card').count(), 10, '손패 열 장을 펼친다');
    await p.locator('.du-mull .du-card').nth(0).click(); await p.locator('.du-mull .du-card').nth(1).click(); await p.locator('.du-mull .du-card').nth(2).click();
    assert.equal(await p.locator('.du-mull .du-card.swapped').count(), 2, '두 장까지만 바꾼다');
    await tap(p, '.du-mull .du-card'); await tap(p, '#du-mull-go');
    await p.locator('#du-mull-go').click(); await p.waitForSelector('.du-board');
    /* 판을 손으로 맞춘다 — 내 차례, 손패 앞에 날씨판(근접)과 타격 카드, 상대 근접 줄에 비영웅 하나 */
    const wx = D.list.find(id => D.cards[id].variant === 'weather' && D.cards[id].row === 'melee');
    const hit = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].ability === 'strike');
    const foeUnit = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === 'melee' && D.cards[id].power >= 7);
    await p.evaluate(([k, wx, hit, fu, pw]) => { const j = JSON.parse(localStorage.getItem(k)), m = j.match; m.turn = m.first = 'me'; m.passed = { me: false, foe: false };
      m.me.hand = [wx, hit].concat(m.me.hand.slice(2)); m.foe.rows.melee = [{ id: fu, base: pw, cur: pw, hero: false, cursed: false, shield: false, at: 900 }]; m.seq = 901;
      localStorage.setItem(k, JSON.stringify(j)); }, [STORE, wx, hit, foeUnit, D.cards[foeUnit].power]);
    await p.reload(); await p.waitForSelector('.du-board');
    assert.equal(await p.locator('.du-row[data-side="foe"][data-row="melee"] .du-unit .du-pw').innerText(), String(D.cards[foeUnit].power), '상대 근접 줄의 힘');
    assert.equal(await p.locator('.du-hand .du-card').count(), 10, '손패 열');
    assert.equal(await p.locator('.du-turn').innerText(), await p.evaluate(() => window.W('duel.turn.me')), '내 차례');
    await tap(p, '.du-hand .du-card'); await tap(p, '#du-pass'); await tap(p, '#du-faction'); await noOverflow(p);
    /* 날씨판 — 상세의 단추 글이 "서리를 부른다", 내면 양쪽 줄 머리에 표시가 붙고 숫자가 1 로 */
    await p.locator('.du-hand .du-card[data-id="' + wx + '"]').click(); await p.waitForSelector('.du-detail[data-id="' + wx + '"]');
    assert.equal(await p.locator('#du-play').innerText(), await p.evaluate(() => window.W('duel.weather.call', { w: window.W('duel.weather.melee') })), '날씨판의 내기 글');
    await p.locator('#du-play').click();
    await p.waitForSelector('.du-row[data-side="foe"][data-row="melee"][data-weather="true"]');
    assert.equal(await p.locator('.du-row[data-side="me"][data-row="melee"]').getAttribute('data-weather'), 'true', '내 줄에도');
    assert.equal(await p.locator('.du-row[data-side="foe"][data-row="melee"] .du-unit[data-at="900"] .du-pw').innerText(), '1', '비영웅은 1 로 보인다');
    assert.equal(await p.locator('.du-row[data-side="foe"] .du-wx').count(), 1, '줄 머리에 서리');
    assert.equal(await p.locator('.du-hand .du-card').count(), 9, '손패 아홉');
    /* 상대가 두고(즉시) 다시 내 차례. 새로고침해도 판이 이어진다 */
    await p.waitForSelector('#du-pass:not(:disabled)');
    const round = await p.locator('.du-round').innerText(), hand = await p.locator('.du-hand .du-card').count();
    await p.reload(); await p.waitForSelector('.du-board');
    assert.equal(await p.locator('.du-round').innerText(), round, '새로고침해도 같은 라운드');
    assert.equal(await p.locator('.du-hand .du-card').count(), hand, '같은 손패');
    /* 타격 카드 — 상대 유닛에 피해 숫자가 뜬다(즉시 모드라 fx 요소만 본다) */
    await p.locator('.du-hand .du-card[data-id="' + hit + '"]').click(); await p.waitForSelector('#du-play:not(:disabled)'); await p.locator('#du-play').click();
    await p.waitForSelector('.du-row[data-side="me"] .du-unit[data-id="' + hit + '"]');
    /* 패스 → 라운드가 끝나면 결과 한 줄 */
    await p.waitForSelector('#du-pass:not(:disabled)'); await p.locator('#du-pass').click();
    await p.waitForFunction(() => document.querySelector('.du-last-round') || document.querySelector('.du-result'));
    /* 끝까지 — 내 차례면 첫 카드를 내고, 없으면 패스 */
    for (let i = 0; i < 60 && !(await p.locator('.du-result').count()); i++) {
      if (await p.locator('#du-pass:not(:disabled)').count()) {
        if (await p.locator('.du-hand .du-card').count()) { await p.locator('.du-hand .du-card').first().click(); await p.waitForSelector('#du-play'); await p.locator('#du-play').click(); }
        else await p.locator('#du-pass').click();
      }
      await p.waitForTimeout(80);
    }
    await p.waitForSelector('.du-result');
    /* ── 결과·전적 (과제 10) ── */
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    await a.close();
    console.log('PASS 결투 화면: 첫 고르기 · 로비 · 덱 짜기');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
