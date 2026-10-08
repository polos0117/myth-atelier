/* 도감 돌아가기 — 목록 자리 되돌리기("목록으로"·휴대폰 뒤로 가기), 무기를 넘겨도 기록은 한 칸, 박물관에서 바로 연 상세의 뒤로 가기.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-nav.cjs
   그림 파일은 체크아웃에 없어 404 여도 된다 — 칸 높이는 aspect-ratio 로 서므로 굴린 자리는 그대로 잰다 */
const assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const top = p => p.evaluate(() => document.querySelector('.collection-scroll').scrollTop);
const name = p => p.$eval('.bar h2', e => e.firstChild.textContent.trim());
/* 지금 화면 가운데쯤에 보이는 목록 칸 하나 */
const visibleCell = p => p.evaluate(() => {
  const sc = document.querySelector('.collection-scroll').getBoundingClientRect();
  const c = [...document.querySelectorAll('.grid > .cell')].find(x => { const r = x.getBoundingClientRect(), m = (r.top + r.bottom) / 2; return m > sc.top && m < sc.bottom; });
  return c && c.dataset.card;
});
/* 손가락처럼 그 자리에서 누른다 — locator.click() 은 누르기 전에 칸을 화면 안으로 굴려서 "굴린 자리" 를 바꿔 버린다 */
const tap = (p, card) => p.evaluate(n => [...document.querySelectorAll('.grid > .cell')].find(x => x.dataset.card === n).click(), card);
(async () => {
  const h = await start();
  try {
    const a = await h.open('dex.html', { viewport: FOLD.cover, mobile: true }), p = a.page;
    await p.waitForSelector('.grid > .cell');
    const len0 = await p.evaluate(() => history.length);

    /* 1. 목록으로 — 열기 전에 굴려 둔 자리로 */
    await p.evaluate(() => { document.querySelector('.collection-scroll').scrollTop = 1500; });
    await p.waitForTimeout(150);
    const was = await top(p);
    assert(was > 600, '목록이 굴러갔다: ' + was);
    const first = await visibleCell(p);
    await tap(p, first);
    await p.waitForSelector('.bar h2');
    assert.equal(await name(p), first, '누른 무기가 열린다');
    assert.equal(await p.evaluate(() => history.length), len0 + 1, '상세를 열면 기록이 한 칸 쌓인다');
    await p.click('.back');
    await p.waitForSelector('.grid > .cell');
    assert(Math.abs(await top(p) - was) <= 2, '목록으로 단추 — 굴린 자리로 돌아온다: ' + await top(p) + ' / ' + was);

    /* 2. 휴대폰 뒤로 가기 — 앞 화면이 아니라 목록으로, 자리도 그대로 */
    await tap(p, first);
    await p.waitForSelector('.bar h2');
    await p.goBack();
    await p.waitForSelector('.grid > .cell');
    assert(/dex\.html/.test(p.url()), '뒤로 가기는 도감 목록에 머문다: ' + p.url());
    assert.equal(await p.$('.bar h2'), null, '상세가 닫힌다');
    assert(Math.abs(await top(p) - was) <= 2, '뒤로 가기 — 굴린 자리로 돌아온다');

    /* 3. 무기 줄로 넘겨도 기록은 한 칸 — 뒤로 한 번이면 목록, 마지막에 본 무기 칸이 보인다 */
    await tap(p, first);
    await p.waitForSelector('#dex-card-next');
    for (let i = 0; i < 4; i++) { const n = await name(p); await p.click('#dex-card-next'); await p.waitForFunction(o => document.querySelector('.bar h2').firstChild.textContent.trim() !== o, n); }
    const last = await name(p);
    assert.notEqual(last, first, '무기를 넘겼다');
    assert.equal(await p.evaluate(() => history.length), len0 + 1, '무기를 넘겨도 기록은 한 칸');
    await p.goBack();
    await p.waitForSelector('.grid > .cell');
    const shown = await p.evaluate(n => {
      const sc = document.querySelector('.collection-scroll').getBoundingClientRect();
      const c = [...document.querySelectorAll('.grid > .cell')].find(x => x.dataset.card === n), r = c && c.getBoundingClientRect();
      return !!r && r.bottom > sc.top && r.top < sc.bottom;
    }, last);
    assert(shown, '돌아오면 마지막에 본 무기 칸이 화면에 있다: ' + last);
    assert.deepEqual(a.errors, [], '화면 오류 없음');
    await a.close();

    /* 4. 박물관에서 ?card= 로 바로 연 상세 — 뒤로 가기는 도감 목록, 한 번 더면 그 앞으로 */
    const b = await h.open('dex.html?card=' + encodeURIComponent('묠니르'), { viewport: FOLD.cover, mobile: true }), q = b.page;
    await q.waitForSelector('.bar h2');
    assert.equal(await name(q), '묠니르', '바로 연다');
    await q.goBack();
    await q.waitForSelector('.grid > .cell');
    assert.equal(await q.$('.bar h2'), null, '바로 연 상세도 뒤로 가기면 목록');
    assert.deepEqual(b.errors, [], '바로 열기 오류 없음');
    await b.close();
    console.log('PASS 도감 돌아가기: 목록 자리 되돌리기 · 휴대폰 뒤로 가기 · 넘겨도 기록 한 칸 · 바로 연 상세');
  } finally { await h.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
