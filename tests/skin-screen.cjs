/* 스킨 — 도감에서 보고 입히면 던전·오토 배틀이 그 그림에 상태를 효과로 덮는지.
   아직 스킨 그림이 없을 수 있어 img.json 에 가짜 스킨 한 칸을 끼워 넣는다(그림은 있는 일상컷을 빌린다). */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { start, FOLD } = require('./browser-harness.cjs');
const CARD = '티르핑', KEY = 'frost';
const img = JSON.parse(fs.readFileSync('data/img.json', 'utf8'));
const bucket = img.img[CARD].byStyle.game_keyart, FAKE = bucket.casual.f[0];
bucket.skin = { f: { [KEY]: FAKE } };
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('dex.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    /* 페이지에 건 길은 옮겨 가도 남는다 */
    await p.route('**/data/img.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(img) }));
    await p.reload(); await p.waitForSelector('.grid .cell');
    await p.click('.grid .cell[data-card="' + CARD + '"]'); await p.waitForSelector('.facts');
    assert.equal(await p.locator('.gal .cell.skin').count(), 1, '스킨 칸 하나');
    assert((await p.locator('.gal .cell.skin').innerText()).includes('서리 룬검'), '스킨 이름은 카드 자료에서');
    await p.click('.gal .cell.skin');
    assert((await p.locator('.big img').getAttribute('src')).endsWith(encodeURIComponent(FAKE)), '스킨 그림이 크게');
    assert((await p.locator('p.sec').first().innerText()).includes('서리 룬검') || (await p.locator('.sec', { hasText: '서리 룬검' }).count()) > 0, '스킨 이름표');
    await p.click('[data-wear="' + KEY + '"]');
    await p.waitForFunction(() => (localStorage.getItem('myth_skin_v1') || '').includes('frost'));
    assert.equal(await p.locator('.gal .cell.skin.worn').count(), 1, '입었다');

    /* 던전 — 스킨 그림에 상태를 효과로 */
    await p.goto(harness.base + '/run.html'); await p.waitForSelector('.rn-pick .cell');
    for (const n of [CARD, '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.rn-map'); await p.locator('.rn-btn.primary').click();
    await p.waitForSelector('.rn-hand .rn-card');
    const fig = p.locator('.rn-party .rn-fig[data-name="' + CARD + '"]');
    assert.equal(await fig.getAttribute('data-skin'), KEY, '던전에서 스킨을 입고 나온다');
    assert((await fig.locator('.face img').getAttribute('src')).endsWith(encodeURIComponent(FAKE)), '스킨 그림');
    assert.equal(await fig.locator('.skin-fx').count(), 1, '효과 층');
    assert.equal(await p.locator('.rn-party .rn-fig[data-name="묠니르"]').getAttribute('data-skin'), null, '안 입은 무기는 그대로');
    /* 저주 — 그림은 스킨 그대로, 효과가 붉게 */
    await p.evaluate(n => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.party.find(m => m.name === n).cursed = true; localStorage.setItem('myth_run_v1', JSON.stringify(j)); }, CARD);
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await fig.getAttribute('data-state'), 'cursed');
    assert((await fig.locator('.face img').getAttribute('src')).endsWith(encodeURIComponent(FAKE)), '저주여도 스킨 그림');
    const fx = await fig.locator('.skin-fx').evaluate(e => { const s = getComputedStyle(e); return { o: s.opacity, b: s.boxShadow }; });
    assert(+fx.o > 0.5 && /255, 77, 109/.test(fx.b), '저주 효과가 덮인다 ' + JSON.stringify(fx));
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);

    /* 도감에서 벗으면 원래대로 */
    await p.goto(harness.base + '/dex.html'); await p.waitForSelector('.grid .cell');
    await p.click('.grid .cell[data-card="' + CARD + '"]'); await p.waitForSelector('.facts');
    await p.click('.gal .cell.skin'); await p.click('[data-wear="' + KEY + '"]');
    await p.waitForFunction(() => !(localStorage.getItem('myth_skin_v1') || '').includes('frost'));
    await p.goto(harness.base + '/run.html'); await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-party .rn-fig[data-name="' + CARD + '"]').getAttribute('data-skin'), null, '벗으면 원래 그림');
    await a.close();
    console.log('PASS 스킨 화면: 도감 칸·이름·크게 보기·입기·던전 그림·효과·저주 덮기·벗기');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
