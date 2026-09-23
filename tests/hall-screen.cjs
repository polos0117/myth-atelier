/* 신전 — 도감에서 모신 무기가 메인 신전에 돌고, 비우면 그림 있는 무기 중에서 무작위로. 스킨을 입었으면 스킨 그림. */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { start } = require('./browser-harness.cjs');
const img = JSON.parse(fs.readFileSync('data/img.json', 'utf8')).img;
const drawn = new Set(Object.keys(img).filter(n => Object.values(img[n].byStyle || {}).some(b => b.f)));
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('index.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    const names = async () => { await p.waitForSelector('.hall-card'); return p.locator('.hall-card').evaluateAll(els => els.map(e => e.dataset.name)); };
    /* 비어 있으면 — 그림 있는 무기 중 열둘, 열 때마다 차례가 바뀐다 */
    const first = await names();
    assert.equal(first.length, 12, '열둘');
    assert(first.every(n => drawn.has(n)), '그림 있는 무기만');
    const orders = new Set([first.join()]);
    for (let i = 0; i < 3; i++) { await p.reload(); orders.add((await names()).join()); }
    assert(orders.size > 1, '열 때마다 무작위');
    assert((await p.locator('.hall-pick').innerText()).includes('도감'), '도감으로 가는 길');

    /* 도감에서 모신다 */
    await p.goto(harness.base + '/dex.html'); await p.waitForSelector('.grid .cell');
    const pick = ['묠니르', '티르핑', '천부인'];   /* 천부인은 아직 그림이 없다 — 이름표로 선다 */
    for (const n of pick) {
      await p.click('.grid .cell[data-card="' + n + '"]'); await p.waitForSelector('[data-hall]');
      assert.equal(await p.locator('[data-hall]').getAttribute('data-hall'), 'off');
      await p.click('[data-hall]');
      await p.waitForFunction(() => document.querySelector('[data-hall]').dataset.hall === 'on');
      await p.click('.back'); await p.waitForSelector('.grid .cell');
    }
    assert.equal(await p.locator('.grid .cell.hall-on').count(), 3, '목록에 표시');
    assert((await p.locator('.dex-hall').innerText()).includes('3 / 12'), '신전 3 / 12');

    /* 메인 — 모신 차례대로 셋 */
    await p.goto(harness.base + '/index.html');
    assert.deepEqual(await names(), pick, '모신 무기가 돈다');
    assert.equal(await p.locator('.hall-card[data-name="천부인"]').getAttribute('data-file'), null, '그림 없는 무기는 이름표');
    /* 스킨을 입으면 신전도 스킨 그림 */
    await p.evaluate(() => localStorage.setItem('myth_skin_v1', JSON.stringify({ '티르핑': 'frost' })));
    await p.reload(); await names();
    const file = await p.locator('.hall-card[data-name="티르핑"]').getAttribute('data-file');
    assert(file && file.includes('_skin_frost'), '입은 스킨으로: ' + file);

    /* 찼으면 더 못 모신다 */
    await p.goto(harness.base + '/dex.html'); await p.waitForSelector('.grid .cell');
    await p.evaluate(() => localStorage.setItem('myth_hall_v1', JSON.stringify(Array.from({ length: 12 }, (_, i) => 'x' + i))));
    await p.reload(); await p.waitForSelector('.grid .cell');
    await p.click('.grid .cell[data-card="그람"]'); await p.waitForSelector('[data-hall]');
    assert(await p.locator('[data-hall]').isDisabled(), '열둘이 차면 못 모신다');
    await p.click('.back'); await p.waitForSelector('.grid .cell');
    /* 비우기 */
    await p.click('#dex-hall-clear');
    assert.equal(await p.evaluate(() => localStorage.getItem('myth_hall_v1')), '[]', '비웠다');
    assert(await p.locator('#dex-hall-clear').isDisabled());
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    await a.close();
    console.log('PASS 신전: 무작위 열둘·도감에서 모시기·목록 표시·메인 차례·이름표·스킨·열둘 상한·비우기');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
