/* 도감 — 최근 추가 줄과 "새" 표시. img.json 의 added(들어온 날)를 시험용으로 바꿔 넣는다.
   - 줄: 오늘까지 7일 안에 든 그림만, 새것부터. 누르면 그 무기 상세가 그 그림에서 열린다. 든 것이 없으면 줄이 없다
   - 새: 처음 오면 없다. 떠났다 오면 그 뒤에 든 그림의 칸·컷에만. 같은 날짜라도 지난번에 이미 있던 것은 아니다
   - 새 그림만: 새 표시가 있을 때만 뜨고, 누르면 그 무기만, 조건 초기화로 풀린다
   - 다섯 크기에서 페이지가 가로로 안 넘치고 줄만 제 안에서 구른다. 칸은 44px 이상, 키보드 포커스 테
   Run: ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-recent.cjs */
const assert = require('node:assert/strict');
const { start, report } = require('./browser-harness.cjs');

const day = n => { const t = new Date(); t.setDate(t.getDate() - n); const p = x => String(x).padStart(2, '0'); return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); };
const M = '묠니르_glossy_promo_f', A = '아이기스_ink_wash_f', T = '티르핑_ink_wash_f_skin_frost.webp';
const img1 = {
  '묠니르': { byStyle: { glossy_promo: { f: M + '.webp', awaken: { f: M + '_awaken.webp' }, casual: { f: [M + '_casual1.webp'] } } } },
  '아이기스': { byStyle: { ink_wash: { f: A + '.webp' } } },
  '티르핑': { byStyle: { ink_wash: { skin: { f: { frost: { base: T } } } } } },
};
const V1 = { img: img1, added: { [M + '.webp']: day(1), [M + '_awaken.webp']: day(0), [A + '.webp']: day(20), [T]: day(3) } };
/* 다음 방문 — 묠니르 저주(오늘, 지난번 가장 늦은 날과 같은 날이지만 그때 없던 것)와 아이기스 일상컷 1(오늘)이 든다.
   아이기스 셀화는 날짜가 없다 — 줄에도 새 표시에도 안 든다 */
const img2 = JSON.parse(JSON.stringify(img1));
img2['묠니르'].byStyle.glossy_promo.cursed = { f: M + '_cursed.webp' };
img2['아이기스'].byStyle.ink_wash.casual = { f: [A + '_casual1.webp'] };
img2['아이기스'].byStyle.cel_anime = { f: '아이기스_cel_anime_f.webp' };
const V2 = { img: img2, added: { ...V1.added, [M + '_cursed.webp']: day(0), [A + '_casual1.webp']: day(0) } };
const V3 = { img: img1, added: Object.fromEntries(Object.keys(V1.added).map(f => [f, day(30)])) };

(async () => {
  const harness = await start(), rows = [];
  const ok = (name, cond, got) => rows.push([name, !!cond, got]);
  try {
    const a = await harness.open('dex.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    let doc = V1;
    await p.route('**/data/img.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doc) }));
    const visit = async () => { await p.goto(harness.base + '/dex.html'); await p.waitForSelector('.grid .cell'); };
    const leave = () => p.goto('about:blank');
    await visit();

    /* 처음 — 줄은 있고 새 표시는 없다 */
    const strip = () => p.locator('.recent-strip .recent-cell').evaluateAll(es => es.map(e => e.dataset.file));
    assert.deepEqual(await strip(), [M + '_awaken.webp', M + '.webp', T], '7일 안의 것만 새것부터');
    ok('줄 머리에 날수와 장수', /7일 · 3장/.test(await p.locator('.dex-recent .sec').innerText()), await p.locator('.dex-recent .sec').innerText());
    ok('줄이 목록 맨 위(거르기 앞)', await p.evaluate(() => !!(document.querySelector('.dex-recent').compareDocumentPosition(document.querySelector('.genre-strip')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    ok('처음엔 새 표시가 없다', await p.locator('.new-mark').count() === 0, await p.locator('.new-mark').count());
    ok('처음엔 새 그림만이 없다', await p.locator('#dex-new-only').count() === 0);

    /* 크기 — 페이지는 안 넘치고 줄만 제 안에서 구른다 */
    for (const [w, h] of [[344, 882], [390, 844], [844, 390], [690, 829], [1280, 900]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.waitForTimeout(80);
      const m = await p.evaluate(() => {
        const s = document.querySelector('.recent-strip'), sc = document.querySelector('.collection-scroll'), r = s.getBoundingClientRect();
        const cells = [...s.querySelectorAll('.recent-cell')].map(e => e.getBoundingClientRect());
        return { page: document.documentElement.scrollWidth - innerWidth, scroll: sc.scrollWidth - sc.clientWidth, left: r.left, right: r.right - innerWidth,
          ov: getComputedStyle(s).overflowX, small: cells.filter(c => c.width < 44 || c.height < 44).length };
      });
      ok(`${w}×${h} 페이지·목록 가로 넘침 없음`, m.page <= 0 && m.scroll <= 0, JSON.stringify(m));
      ok(`${w}×${h} 줄이 화면 안, 제 안에서 구른다`, m.left >= 0 && m.right <= 0 && m.ov === 'auto', JSON.stringify(m));
      ok(`${w}×${h} 칸 44px 이상`, m.small === 0, JSON.stringify(m));
    }
    await p.setViewportSize({ width: 390, height: 844 });
    /* 키보드 포커스 — Tab 으로 줄 칸에 오면 테가 보인다 */
    await p.locator('input[type=search]').focus();
    let onCell = false;
    for (let i = 0; i < 40 && !onCell; i++) { await p.keyboard.press('Tab'); onCell = await p.evaluate(() => !!document.activeElement.closest('.recent-cell')); }
    const ring = onCell && await p.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return e.matches(':focus-visible') && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
    ok('줄 칸에 키보드 포커스 테', ring, onCell);

    /* 누르면 그 무기 상세가 그 그림에서 */
    await p.locator(`.recent-cell[data-file="${M}_awaken.webp"]`).click();
    await p.waitForSelector('.facts');
    ok('줄에서 연 상세 — 무기', (await p.locator('.bar h2').innerText()).includes('묠니르'));
    ok('줄에서 연 상세 — 그 그림', decodeURIComponent(await p.locator('.big img').getAttribute('src')).endsWith(M + '_awaken.webp'), await p.locator('.big img').getAttribute('src'));
    ok('각성 단추가 켜져 있다', await p.locator('button[data-cut="awaken"].on').count() === 1);
    await p.click('.back'); await p.waitForSelector('.recent-strip');
    await p.locator(`.recent-cell[data-file="${T}"]`).click();
    await p.waitForSelector('.facts');
    ok('스킨 그림에서도 그 스킨으로', decodeURIComponent(await p.locator('.big img').getAttribute('src')).endsWith(T) && await p.locator('[data-skin-state="base"].on').count() === 1);
    await p.click('.back'); await p.waitForSelector('.grid .cell');

    /* 떠났다 오면 — 그 뒤에 든 것만 새 */
    await leave();
    doc = V2;
    await visit();
    ok('다녀간 때를 적어 둔다', await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('myth_dex_seen_v1')).seen.length > 0; } catch { return false; } }));
    const fresh = await p.locator('.grid .cell[data-new]').evaluateAll(es => es.map(e => e.dataset.card).sort());
    assert.deepEqual(fresh, ['묠니르', '아이기스'], '새 그림이 든 무기만');
    ok('목록 칸에 새 표시 둘', await p.locator('.grid .cell .new-mark').count() === 2, await p.locator('.grid .cell .new-mark').count());
    const newInStrip = await p.locator('.recent-cell').evaluateAll(es => es.filter(e => e.querySelector('.new-mark')).map(e => e.dataset.file).sort());
    assert.deepEqual(newInStrip, [A + '_casual1.webp', M + '_cursed.webp'].sort(), '같은 날이라도 지난번에 있던 각성은 새것이 아니다');
    ok('날짜 없는 그림은 줄에 없다', !(await strip()).includes('아이기스_cel_anime_f.webp'));
    ok('줄은 5장', (await strip()).length === 5, (await strip()).length);

    /* 새 그림만 */
    const only = p.locator('#dex-new-only');
    ok('새 그림만 단추 — 무기 수', /2/.test(await only.innerText()) && await only.getAttribute('aria-pressed') === 'false', await only.innerText());
    const box = await only.boundingBox();
    ok('새 그림만 단추 44px', box.height >= 44, JSON.stringify(box));
    await only.click();
    ok('새 그림만 — 그 무기만', (await p.locator('.grid .cell').evaluateAll(es => es.map(e => e.dataset.card).sort())).join() === '묠니르,아이기스');
    ok('새 그림만 — 눌림', await only.getAttribute('aria-pressed') === 'true');
    await p.click('#dex-reset');
    ok('조건 초기화가 새 그림만도 푼다', await p.locator('.grid .cell').count() > 2 && await p.locator('#dex-new-only').getAttribute('aria-pressed') === 'false');

    /* 상세의 컷 — 새로 든 컷에만 */
    await p.click('.grid .cell[data-card="묠니르"]'); await p.waitForSelector('.facts');
    ok('저주 단추에 새', await p.locator('button[data-cut="cursed"] .new-mark').count() === 1);
    ok('각성·액션 단추엔 없다', await p.locator('button[data-cut="awaken"] .new-mark, button[data-cut="portrait"] .new-mark').count() === 0);
    await p.click('.back'); await p.waitForSelector('.grid .cell');
    await p.click('.grid .cell[data-card="아이기스"]'); await p.waitForSelector('.facts');
    if (await p.locator('#dex-style-pick').count()) await p.selectOption('#dex-style-pick', 'ink_wash');
    ok('일상컷 칸에 새', await p.locator('.gal .cell[data-cut="casual"] .new-mark').count() === 1);
    await p.click('.back'); await p.waitForSelector('.grid .cell');
    ok('머무는 동안 표시가 그대로', await p.locator('.grid .cell[data-new]').count() === 2);

    /* 또 떠났다 오면 다 본 것 */
    await leave();
    await visit();
    ok('다시 오면 새 표시가 없다', await p.locator('.new-mark').count() === 0 && await p.locator('#dex-new-only').count() === 0);

    /* 7일 안에 든 것이 없으면 줄이 없다 */
    doc = V3;
    await visit();
    ok('든 것이 없으면 줄이 없다', await p.locator('.dex-recent').count() === 0);
    ok('화면 오류 없음', a.errors.length === 0, a.errors.join(' | '));
    await a.close();
  } catch (e) {
    rows.push([String(e.message || e).split('\n')[0], false, '']);
  } finally {
    report(rows, '도감 최근 추가·새 표시');
    await harness.stop();
  }
})();
