/* 도감 — 목록·거르기·상세·각성 단추. 그림 자료를 시험용 img.json 으로 바꿔 넣는다.
   화면이 읽는 것이 data/img.json 뿐인지도 여기서 걸린다. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const card = JSON.parse(fs.readFileSync('data/card.json', 'utf8')), N = card.cards.length;
const skill = JSON.parse(fs.readFileSync('data/skill.json', 'utf8')).skills;
const IMG = { img: {
  '묠니르': { byStyle: { ink_wash: { f: '묠니르_ink_wash_f.webp' }, glossy_promo: { f: '묠니르_glossy_promo_f.webp', awaken: { f: '묠니르_glossy_promo_f_awaken.webp' }, cursed: { f: '묠니르_glossy_promo_f_cursed.webp' },
    casual: { f: ['묠니르_glossy_promo_f_casual1.webp'] }, extra: { f: ['묠니르_glossy_promo_f_extra1.webp'] } } } },
  '아이기스': { byStyle: { cel_anime: { f: '아이기스_cel_anime_f.webp' }, ink_wash: { f: '아이기스_ink_wash_f.webp' }, photoreal: { f: '아이기스_photoreal_f.webp' } } },
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
    /* 저장은 그린 뒤(useEffect)에 되므로 다시 그려진 것을 보고 나서 새로고침한다 */
    await p.waitForFunction(n => document.querySelectorAll('.grid .cell').length === n, card.cards.filter(c => c.cost === 5).length);
    await p.reload(); await p.waitForSelector('.grid .cell');
    assert.equal(await p.locator('.grid .cell').count(), card.cards.filter(c => c.cost === 5).length, '조건이 남는다');
    await p.click('#dex-reset');

    /* 상세 — 값·기술·각성 */
    await p.click('.grid .cell[data-card="묠니르"]');
    await p.waitForSelector('.facts');
    assert((await p.locator('.bar h2').innerText()).includes('묠니르'));
    const facts = await p.locator('.facts').innerText();
    assert(facts.includes(skill.thunder_smash.name) && facts.includes('토르') && facts.includes('북유럽') && facts.includes('둔기'), facts);
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f.webp'), '처음엔 상태 그림이 많은 화풍(글로시 프로모)');
    assert.equal(await p.locator('#dex-style-pick').inputValue(), 'glossy_promo');
    await p.click('button[data-cut="awaken"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_awaken.webp'), '각성으로 바뀐다');
    await p.click('button[data-cut="cursed"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_cursed.webp'), '저주로 바뀐다');
    assert(facts.includes(skill.thunder_smash.name) && facts.includes('저주') && facts.includes(card.cards.find(c => c.name === '묠니르').curse.text), '저주 줄');
    await p.click('button[data-cut="portrait"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f.webp'));
    assert.equal(await p.locator('.gal .cell[data-cut="casual"]').count(), 1, '일상컷 하나');
    assert.equal(await p.locator('.gal .cell[data-cut="extra"]').count(), 1, '특별컷 하나');
    await p.click('.gal .cell[data-cut="casual"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_casual1.webp'));
    await p.click('.gal .cell[data-cut="extra"]');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_extra1.webp'));
    assert((await p.locator('.sec').filter({ hasText: '특별컷 1' }).count()) >= 1, '특별컷 이름표');
    await p.click('.back'); await p.waitForSelector('.grid .cell');

    /* 화풍이 여럿이면 셀렉트와 썸네일 줄로 고른다 */
    await p.click('.grid .cell[data-card="아이기스"]');
    await p.waitForSelector('.style-strip');
    assert.equal(await p.locator('#dex-style-pick option').count(), 3, '화풍 셀렉트');
    assert.equal(await p.locator('.style-strip .style-cell').count(), 3, '화풍 썸네일 셋');
    assert.equal(await p.locator('.sw button, .style-strip button').evaluateAll(es => es.filter(e => e.closest('header')).length), 0, '머리에 단추 벽이 없다');
    await p.locator('.style-strip .style-cell[data-style="photoreal"]').click();
    await p.waitForFunction(() => document.querySelector('#dex-style-pick').value === 'photoreal');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('아이기스_photoreal_f.webp'), '썸네일을 누르면 그 화풍');
    await p.selectOption('#dex-style-pick', 'ink_wash');
    await p.waitForFunction(() => document.querySelector('.style-strip .style-cell.on').dataset.style === 'ink_wash');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('아이기스_ink_wash_f.webp'), '셀렉트로 골라도 같다');
    const strip = await p.locator('.style-strip').evaluate(e => ({ ov: getComputedStyle(e).overflowX, w: e.clientWidth }));
    assert(strip.ov === 'auto', '줄은 옆으로 구른다');
    await p.click('.back'); await p.waitForSelector('.grid .cell');

    /* 그림 없는 카드도 열린다 */
    await p.click('.grid .cell[data-card="칸다"]');
    await p.waitForSelector('.facts');
    assert.equal(await p.locator('.big img').count(), 0);
    assert.equal(await p.locator('button[data-cut="awaken"]').isDisabled(), true);
    assert.equal(await p.locator('button[data-cut="cursed"]').isDisabled(), true);
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
