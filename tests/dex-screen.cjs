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
  '티르핑': { byStyle: { ink_wash: { skin: { f: { frost: { base: '티르핑_ink_wash_f_skin_frost.webp' } } } } } },
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
    assert.deepEqual((await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card))).sort(), ['메긴교르드', '묠니르', '야른그레이프'], '주인 이름으로 찾는다');
    /* 스킨 — 자료에 스킨이 있는 것, 그중 스킨 그림까지 있는 것. 스킨 이름으로도 찾는다 */
    await p.click('#dex-reset');
    const skinned = card.cards.filter(c => (c.skins || []).length).map(c => c.name).sort();
    await p.selectOption('#dex-skin', 'yes');
    assert.deepEqual((await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card))).sort(), skinned, '스킨 있는 것');
    await p.selectOption('#dex-skin', 'art');
    assert.deepEqual(await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card)), ['티르핑'], '스킨 그림까지 있는 것');
    await p.click('#dex-reset');
    await p.fill('input[type=search]', '서리 룬');
    assert.deepEqual(await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card)), ['티르핑'], '스킨 이름으로 찾는다');
    await p.fill('input[type=search]', 'khanda');
    assert.deepEqual(await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card)), ['칸다'], '영어 이름으로 찾는다');
    await p.click('#dex-reset');

    /* 거른 조건은 브라우저에 남는다 */
    await p.selectOption('#dex-cost', '5');
    /* 저장은 그린 뒤(useEffect)에 되므로 다시 그려진 것을 보고 나서 새로고침한다 */
    await p.waitForFunction(n => document.querySelectorAll('.grid .cell').length === n, card.cards.filter(c => c.cost === 5).length);
    /* Preact 의 useEffect 는 그린 다음 프레임에 돈다 — 저장이 실제로 됐는지 보고 새로고침한다 */
    await p.waitForFunction(() => (localStorage.getItem('myth_dex_filters_v1') || '').includes('"cost":"5"'));
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
    /* 크게 보기 — 큰 그림을 누르면 덮개, 화살표로 컷 이동, Esc 로 닫기 */
    await p.click('button[data-cut="portrait"]');
    await p.waitForFunction(s => document.querySelector('.big img').getAttribute('src') === s, window_src('묠니르_glossy_promo_f.webp'));
    await p.click('.big .zoom');
    await p.waitForSelector('.zoom-layer');
    assert.equal(await p.locator('.zoom-layer img').getAttribute('src'), window_src('묠니르_glossy_promo_f.webp'), '원본 주소로 크게');
    assert((await p.locator('.zoom-bar span').innerText()).startsWith('1 / '), '몇 번째인지');
    await p.locator('.zoom-next').click();
    await p.waitForFunction(s => document.querySelector('.zoom-layer img').getAttribute('src') === s, window_src('묠니르_glossy_promo_f_awaken.webp'));
    await p.keyboard.press('ArrowRight');
    await p.waitForFunction(s => document.querySelector('.zoom-layer img').getAttribute('src') === s, window_src('묠니르_glossy_promo_f_cursed.webp'));
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.zoom-layer'));
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_cursed.webp'), '덮개에서 옮긴 컷이 남는다');
    /* 큰 그림 넘기기 — 덮개를 안 열어도 화살표·방향키·밀기로 같은 줄(액션 → 각성 → 저주 → 특별 → 일상)을 넘긴다.
       끝에선 화살표가 잠기고, 민 손가락은 크게 보기를 열지 않는다 */
    const bigIs = f => p.waitForFunction(s => document.querySelector('.big img').getAttribute('src') === s, window_src(f));
    const swipe = async (sel, dx) => { await p.locator(sel).scrollIntoViewIfNeeded(); const b = await p.locator(sel).boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      await p.mouse.move(x - dx / 2, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y + 6, { steps: 6 }); await p.mouse.up(); };
    assert.equal(await p.locator('.big-count').innerText(), '3 / 5', '큰 그림에도 몇 번째인지');
    await p.locator('.big-next').click(); await bigIs('묠니르_glossy_promo_f_extra1.webp');
    await p.keyboard.press('ArrowRight'); await bigIs('묠니르_glossy_promo_f_casual1.webp');
    assert.equal(await p.locator('.big-next.to-card').count(), 1, '마지막 컷에선 다음 화살표가 다음 무기로 넘는다고 표시');
    await swipe('.big', 160); await bigIs('묠니르_glossy_promo_f_extra1.webp');
    assert.equal(await p.locator('.zoom-layer').count(), 0, '밀기는 크게 보기를 열지 않는다');
    await swipe('.big', -160); await bigIs('묠니르_glossy_promo_f_casual1.webp');
    await p.locator('.big-prev').click(); await bigIs('묠니르_glossy_promo_f_extra1.webp');
    await p.keyboard.press('ArrowLeft'); await bigIs('묠니르_glossy_promo_f_cursed.webp');
    await swipe('.big', 12); await p.waitForTimeout(150);
    assert.equal(await p.locator('.zoom-layer').count(), 0, '살짝 끈 것은 넘기기도 열기도 아니다');
    assert.equal(await p.locator('.big img').getAttribute('src'), window_src('묠니르_glossy_promo_f_cursed.webp'), '살짝 끌면 그대로');
    /* 크게 보기 안에서도 밀어 넘긴다 */
    await p.click('.big .zoom'); await p.waitForSelector('.zoom-layer');
    await swipe('.zoom-body', -160);
    await p.waitForFunction(s => document.querySelector('.zoom-layer img')?.getAttribute('src') === s, window_src('묠니르_glossy_promo_f_extra1.webp'));
    assert.equal(await p.locator('.zoom-layer').count(), 1, '밀기는 덮개를 닫지 않는다');
    await swipe('.zoom-body', 160);
    await p.waitForFunction(s => document.querySelector('.zoom-layer img')?.getAttribute('src') === s, window_src('묠니르_glossy_promo_f_cursed.webp'));
    await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.zoom-layer'));
    await p.click('button[data-cut="portrait"]');
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
    /* 다른 무기로 — 목록 차례(신화권 → 값 높은 것 → 이름)에서 그림 있는 무기만 잇는다. 시험 그림으로는 묠니르(북유럽 5) → 티르핑(북유럽 3, 스킨만) → 아이기스(그리스 5).
       마지막 컷에서 다음은 다음 무기의 첫 컷, 첫 컷에서 앞은 앞 무기의 마지막 컷. 크게 보기는 열린 채 넘어간다 */
    const titleIs = n => p.waitForFunction(n => document.querySelector('.bar h2')?.textContent.startsWith(n), n);
    assert.equal(await p.locator('.card-nav .card-count').innerText(), '무기 1 / 3', '무기 몇 번째인지');
    assert(await p.locator('#dex-card-prev').isDisabled(), '첫 무기라 앞 무기는 잠긴다');
    assert((await p.locator('#dex-card-next').getAttribute('aria-label')).includes('티르핑') && (await p.locator('#dex-card-next').getAttribute('title')) === '티르핑', '다음 무기 이름을 알려 준다');
    await p.keyboard.press('ArrowRight'); await bigIs('묠니르_glossy_promo_f_casual1.webp');
    assert(!(await p.locator('.big-next').isDisabled()) && (await p.locator('.big-next.to-card').count()) === 1, '마지막 컷이어도 다음 무기가 있으면 열리고, 무기를 넘는다고 표시');
    await p.keyboard.press('ArrowRight'); await titleIs('티르핑');
    await p.waitForFunction(s => document.querySelector('.big img')?.getAttribute('src') === s, window_src('티르핑_ink_wash_f_skin_frost.webp'));
    assert.equal(await p.locator('.big-count').count(), 0, '컷이 하나면 몇 번째 표시는 없다');
    assert.equal(await p.locator('.card-nav .card-count').innerText(), '무기 2 / 3');
    assert(!(await p.locator('.big-prev').isDisabled()), '첫 컷이어도 앞 무기가 있으면 열린다');
    await swipe('.big', 160); await titleIs('묠니르'); await bigIs('묠니르_glossy_promo_f_casual1.webp');
    assert.equal(await p.locator('.big-count').innerText(), '5 / 5', '앞 무기는 마지막 컷으로');
    await p.locator('#dex-card-next').click(); await titleIs('티르핑');
    await p.locator('#dex-card-next').click(); await titleIs('아이기스');
    assert(await p.locator('#dex-card-next').isDisabled() && await p.locator('.big-next').isDisabled(), '마지막 무기의 마지막 컷에선 다음이 잠긴다');
    await p.locator('#dex-card-prev').click(); await titleIs('티르핑');
    await p.locator('#dex-card-prev').click(); await titleIs('묠니르'); await bigIs('묠니르_glossy_promo_f.webp');
    assert.equal(await p.locator('.big-count').innerText(), '1 / 5', '무기 단추는 첫 컷으로');
    /* 크게 보기 안에서 무기를 넘어도 덮개는 열린 채 */
    await p.locator('.big-next').click(); await p.locator('.big-next').click(); await p.locator('.big-next').click(); await p.locator('.big-next').click();
    await bigIs('묠니르_glossy_promo_f_casual1.webp');
    await p.click('.big .zoom'); await p.waitForSelector('.zoom-layer');
    await p.locator('.zoom-next').click(); await titleIs('티르핑');
    await p.waitForFunction(() => document.querySelector('.zoom-bar b')?.textContent.startsWith('티르핑'));
    await swipe('.zoom-body', -160);
    await p.waitForFunction(() => document.querySelector('.zoom-bar b')?.textContent.startsWith('아이기스'));
    assert(await p.locator('.zoom-next').isDisabled(), '덮개에서도 마지막 무기 끝에선 잠긴다');
    await p.keyboard.press('ArrowLeft'); await p.waitForFunction(() => document.querySelector('.zoom-bar b')?.textContent.startsWith('티르핑'));
    await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.zoom-layer'));
    await titleIs('티르핑');
    /* 거르기를 따른다 — 그리스만 보이면 아이기스 하나뿐이라 넘길 무기가 없다 */
    await p.click('.back'); await p.waitForSelector('.grid .cell');
    await p.selectOption('#dex-myth', 'greek'); await p.click('.grid .cell[data-card="아이기스"]'); await titleIs('아이기스');
    assert.equal(await p.locator('.card-nav .card-count').innerText(), '무기 1 / 1', '거른 목록 안에서만');
    assert(await p.locator('#dex-card-prev').isDisabled() && await p.locator('#dex-card-next').isDisabled());
    await p.click('.back'); await p.waitForSelector('.grid .cell'); await p.click('#dex-reset');
    await p.click('.grid .cell[data-card="묠니르"]'); await titleIs('묠니르');
    await p.click('.gal .cell[data-cut="extra"]'); await bigIs('묠니르_glossy_promo_f_extra1.webp');
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
    /* 휴대폰 큰 그림 — 화살표는 손가락 자리 44px, 세로 굴림은 막지 않는다(pan-y) */
    await p.click('.grid .cell[data-card="묠니르"]'); await p.waitForSelector('.big-next');
    for (const sel of ['.big-prev', '.big-next']) { const b = await p.locator(sel).boundingBox(); assert(b.width >= 44 && b.height >= 44, sel + ' 44px'); }
    assert.equal(await p.locator('.big').evaluate(e => getComputedStyle(e).touchAction), 'pan-y', '세로 굴림은 그대로');
    for (const sel of ['#dex-card-prev', '#dex-card-next']) { const b = await p.locator(sel).boundingBox(); assert(b.width >= 44 && b.height >= 44, sel + ' 44px'); }
    const barH = await p.locator('.bar').evaluate(e => e.getBoundingClientRect().height);
    assert(barH <= 64, '무기 넘기기는 굴러가지 않는 머리를 늘리지 않는다: ' + barH);
    /* 진짜 손가락으로 밀기 — 터치 화면(hasTouch)을 따로 연다. 터치로 민 뒤엔 click 이 오지 않으므로, 그 직후의 탭을 삼키지 않고 크게 보기를 연다 */
    { const t = await harness.open('dex.html?card=' + encodeURIComponent('묠니르'), { viewport: FOLD.cover, mobile: true }), q = t.page;
      await q.route('**/data/img.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(IMG) }));
      await q.reload(); await q.waitForSelector('.big-count'); await q.locator('.big').scrollIntoViewIfNeeded();
      const cdp = await q.context().newCDPSession(q), bb = await q.locator('.big').boundingBox(), ty = bb.y + bb.height / 2;
      const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: ty }] });
      await touch('touchStart', bb.x + bb.width * .8); for (let i = 1; i <= 8; i++) await touch('touchMove', bb.x + bb.width * (.8 - i * .07)); await touch('touchEnd');
      await q.waitForFunction(() => document.querySelector('.big-count').textContent.startsWith('2 /'));
      assert.equal(await q.locator('.zoom-layer').count(), 0, '손가락 밀기는 크게 보기를 열지 않는다');
      /* 사람 손의 간격(0.3초) 뒤에 탭한다 — 민 직후 몇 ms 안의 탭은 크롬이 click 을 만들지 않는다. 삼키기 창(0.5초)보다는 짧다 */
      await q.waitForTimeout(300); await q.tap('.big .zoom'); await q.waitForSelector('.zoom-layer', { timeout: 3000 });
      /* 무기를 넘겨도 굴린 자리가 남는다 — 맨 위로 튀면 휴대폰에서 무기 줄이 화면 밖으로 밀려난다 */
      await q.tap('.zoom-close'); await q.waitForFunction(() => !document.querySelector('.zoom-layer'));
      await q.locator('.card-nav').scrollIntoViewIfNeeded();
      const navY = () => q.evaluate(() => Math.round(document.querySelector('.card-nav').getBoundingClientRect().top));
      const before = await navY();
      assert(await q.evaluate(() => document.querySelector('.collection-scroll').scrollTop) > 0, '무기 줄까지 굴렸다');
      await q.locator('#dex-card-next').click(); await q.waitForFunction(() => !document.querySelector('.bar h2').textContent.startsWith('묠니르'));
      await q.waitForTimeout(100);
      const after = await navY();
      assert(Math.abs(after - before) <= 2, '무기 줄이 화면의 같은 높이에 남는다: ' + before + ' → ' + after);
      assert.deepEqual(t.errors, []); await t.close(); }
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), '상세도 가로로 넘치지 않는다');
    await p.click('.back'); await p.waitForSelector('.grid .cell');
    await p.click('#dex-size');
    await p.waitForFunction(() => document.body.classList.contains('dex-compact'));
    await p.reload(); await p.waitForSelector('.grid .cell');
    assert(await p.evaluate(() => document.body.classList.contains('dex-compact')), '촘촘히가 남는다');

    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();
    console.log('PASS 도감: 카드 ' + N + ' · 거르기 여섯 · 상세 · 각성 · 일상컷 · 넘기기 · 무기 넘기기 · 휴대폰');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
function window_src(f) { return 'https://polos0117.github.io/myth-atelier-img/img/' + encodeURIComponent(f); }
