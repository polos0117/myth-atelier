/* 도감 — 목록·거르기·상세·각성 단추. 그림 자료를 시험용 img.json 으로 바꿔 넣는다.
   화면이 읽는 것이 data/img.json 뿐인지도 여기서 걸린다. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const card = JSON.parse(fs.readFileSync('data/card.json', 'utf8')), N = card.cards.length;
const skill = JSON.parse(fs.readFileSync('data/skill.json', 'utf8')).skills;
const IMG = { img: {
  '묠니르': { byStyle: { glossy_promo: { f: '묠니르_glossy_promo_f.webp', awaken: { f: '묠니르_glossy_promo_f_awaken.webp' },
    casual: { f: ['묠니르_glossy_promo_f_casual1.webp'] } } } },
  '아이기스': { byStyle: { cel_anime: { f: '아이기스_cel_anime_f.webp' } } },
} };
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('dex.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.route('**/data/img.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(IMG) }));
    await p.reload(); await p.waitForSelector('.grid .cell');
    assert.equal(await p.locator('.grid .cell').count(), N, '카드 전부');
    assert.equal(await p.locator('.grid .cell img').count(), 2, '그림 있는 둘만 <img>');
    assert((await p.locator('.dex-view-row .sec span').innerText()).includes(N + '자루'));

    /* 거르기 — 신화권·종류·값·그림 유무·검색 */
    await p.selectOption('#dex-myth', 'norse');
    assert.equal(await p.locator('.grid .cell').count(), card.cards.filter(c => c.myth === 'norse').length);
    await p.selectOption('#dex-kind', 'sword');
    assert.equal(await p.locator('.grid .cell').count(), card.cards.filter(c => c.myth === 'norse' && c.kind === 'sword').length);
    await p.click('#dex-reset');
    assert.equal(await p.locator('.grid .cell').count(), N, '초기화');
    await p.selectOption('#dex-art', 'yes');
    assert.deepEqual((await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card))).sort(), ['묠니르', '아이기스']);
    await p.selectOption('#dex-style', 'cel_anime');
    assert.deepEqual(await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card)), ['아이기스'], '화풍으로 거르면 그 화풍 그림만');
    await p.click('#dex-reset');
    await p.fill('input[type=search]', '토르');
    /* 토르의 것은 망치와 무쇠 장갑 둘이다 */
    assert.deepEqual((await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card))).sort(), ['묠니르', '야른그레이프'], '주인 이름으로 찾는다');
    await p.fill('input[type=search]', 'khanda');
    assert.deepEqual(await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card)), ['칸다'], '영어 이름으로 찾는다');
    await p.click('#dex-reset');

    /* 거른 조건은 브라우저에 남는다 */
    await p.selectOption('#dex-cost', '5');
    await p.reload(); await p.waitForSelector('.grid .cell');
    assert.equal(await p.locator('.grid .cell').count(), card.cards.filter(c => c.cost === 5).length, '조건이 남는다');
    await p.click('#dex-reset');

    /* 상세 — 값·기술·각성 */
    await p.click('.grid .cell[data-card="묠니르"]');
    await p.waitForSelector('.facts');
    assert((await p.locator('.bar h2').innerText()).includes('묠니르'));
    const facts = await p.locator('.facts').innerText();
    assert(facts.includes(skill.thunder_smash.name) && facts.includes('토르') && facts.includes('북유럽') && facts.includes('둔기'), facts);
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f.webp'));
    await p.click('button[data-cut="awaken"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_awaken.webp'), '각성으로 바뀐다');
    await p.click('button[data-cut="portrait"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f.webp'));
    assert.equal(await p.locator('.gal .cell').count(), 1, '일상컷 하나');
    await p.click('.gal .cell');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_casual1.webp'));
    await p.click('.back'); await p.waitForSelector('.grid .cell');

    /* 그림 없는 카드도 열린다 */
    await p.click('.grid .cell[data-card="칸다"]');
    await p.waitForSelector('.facts');
    assert.equal(await p.locator('.big img').count(), 0);
    assert.equal(await p.locator('button[data-cut="awaken"]').isDisabled(), true);
    await p.click('.back');

    /* 휴대폰 — 가로로 넘치지 않고 두 줄 격자 */
    await p.setViewportSize(FOLD.cover);
    await p.waitForSelector('.grid .cell');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), '가로로 넘친다');
    await p.click('#dex-size');
    await p.waitForFunction(() => document.body.classList.contains('dex-compact'));
    await p.reload(); await p.waitForSelector('.grid .cell');
    assert(await p.evaluate(() => document.body.classList.contains('dex-compact')), '촘촘히가 남는다');

    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();
    console.log('PASS 도감: 카드 ' + N + ' · 거르기 여섯 · 상세 · 각성 · 일상컷 · 휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
function window_src(f) { return 'https://polos0117.github.io/myth-atelier-img/img/' + encodeURIComponent(f); }
