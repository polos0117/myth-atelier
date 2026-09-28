/* 박물관 — 3D 전시실을 걷는다. 액자 수·전시실 바로 가기·걷기·가까이 선 액자의 명판·자세히·상태(기본·각성·저주)·휴대폰 손잡이.
   도감의 "박물관" 단추와 dex.html?card= 로 상세 바로 열기도 본다. 그림은 체크아웃의 img/ 에서(없으면 준비 중 액자). */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
const cards = JSON.parse(fs.readFileSync('data/card.json', 'utf8')).cards;
const group = JSON.parse(fs.readFileSync('data/group.json', 'utf8'));
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('museum.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForFunction(() => window.__museum, null, { timeout: 20000 });
    const st = () => p.evaluate(() => window.__museum.state());
    assert.equal(await p.evaluate(() => window.__museum.frames), cards.length, '액자는 무기 수만큼');
    assert.equal(await p.evaluate(() => window.__museum.halls), group.myth.order.length, '전시실은 신화권마다');
    assert.equal(await p.locator('.mu-rooms .mu-btn').count(), group.myth.order.length + 1, '중앙 홀 + 전시실 바로 가기');
    /* 걷기 — W 로 앞으로 */
    const z0 = (await st()).z;
    await p.locator('.mu-stage canvas').click({ position: { x: 20, y: 20 } });
    await p.keyboard.down('w'); await p.waitForFunction(z0 => window.__museum.state().z > z0 + 0.5, z0, { timeout: 8000 }); await p.keyboard.up('w');
    /* 전시실로 바로 가서 걸어 들어가면 그 방, 액자 앞에서 명판 */
    await p.locator('.mu-rooms .mu-btn[data-room="2"]').click();
    await p.waitForFunction(() => window.__museum.state().room === 2);
    assert.equal(await p.locator('.mu-stage').getAttribute('data-room'), '2');
    /* 걸어 들어가 왼쪽 벽으로 돈다 — 느린 기계에서도 되게 조금씩 */
    for (let i = 0; i < 12 && !(await p.locator('.mu-caption[data-focus]').count()); i++) {
      await p.keyboard.down(i < 3 ? 'w' : 'q'); await p.waitForTimeout(i < 3 ? 350 : 200); await p.keyboard.up(i < 3 ? 'w' : 'q');
      await p.waitForTimeout(120);
    }
    await p.waitForSelector('.mu-caption[data-focus]', { timeout: 5000 });
    const name = await p.locator('.mu-caption').getAttribute('data-focus');
    assert(cards.find(c => c.name === name).myth === group.myth.order[2], '그 방의 무기: ' + name);
    /* 자세히 — 도감으로 가는 길이 있고, Esc 로 닫는다. 자세히 동안은 안 걷는다 */
    await p.locator('#mu-more').click();
    await p.waitForSelector('.mu-detail[data-detail]');
    assert((await p.locator('#mu-to-dex').getAttribute('href')).startsWith('dex.html?card='), '도감으로 가는 길');
    const before = await st(); await p.keyboard.down('w'); await p.waitForTimeout(800); await p.keyboard.up('w');
    assert.equal((await st()).z, before.z, '자세히 동안은 안 걷는다');
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.mu-detail'));
    /* 상태 — 각성·저주를 고르면 무대와 공기가 바뀐다 */
    for (const m of ['awaken', 'cursed', 'base']) {
      await p.locator('.mu-btn[data-mode="' + m + '"]').click();
      await p.waitForFunction(m => window.__museum.state().mode === m && document.querySelector('.mu-stage').dataset.mode === m, m);
    }
    /* 벽에 걸린 그림을 불러온다 */
    await p.waitForFunction(() => window.__museum.state().loaded > 5, null, { timeout: 15000 });
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();

    /* 휴대폰 — 손잡이로 걷는다, 가로로 안 넘친다 */
    const m = await harness.open('museum.html', { viewport: FOLD.cover, mobile: true }), q = m.page;
    await q.waitForFunction(() => window.__museum, null, { timeout: 20000 });
    await q.waitForSelector('.mu-stick');
    const s0 = await q.evaluate(() => window.__museum.state().z);
    const box = await q.locator('.mu-stick').boundingBox();
    await q.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await q.mouse.down();
    await q.mouse.move(box.x + box.width / 2, box.y + 4, { steps: 4 });
    await q.waitForFunction(s0 => window.__museum.state().z > s0 + 0.3, s0, { timeout: 8000 }); await q.mouse.up();
    /* 두 번 누르기 — 전시실에서 보이는 액자를 두 번 누르면 그 앞으로 걸어가 그 액자를 본다. 자세히는 안 열린다 */
    await q.locator('.mu-rooms .mu-btn[data-room="3"]').click();
    await q.waitForFunction(() => window.__museum.state().room === 3);
    await q.waitForTimeout(300);
    const stage = await q.locator('.mu-stage').boundingBox();
    const names = cards.filter(c => c.myth === group.myth.order[3]).map(c => c.name);
    const target = await q.evaluate(([names, b]) => names.map(n => ({ n, p: window.__museum.screenOf(n) }))
      .filter(o => o.p && o.p.z > 0 && o.p.z < 1 && o.p.x > b.x + 50 && o.p.x < b.x + b.width - 50 && o.p.y > b.y + 90 && o.p.y < b.y + b.height - 130)
      .sort((a, c) => a.p.z - c.p.z)[0], [names, stage]);
    assert(target, '보이는 액자가 있다');
    /* 느린 헤드리스 GL 에서는 실제 두 번 탭 사이에 한 장이 300ms 를 넘겨 한 번 탭이 된다 — 두 번을 한 번에 보낸다 */
    await q.evaluate(([x, y]) => { const c = document.querySelector('.mu-stage canvas');
      for (const t of ['pointerdown', 'pointerup', 'pointerdown', 'pointerup']) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true })); }, [target.p.x, target.p.y]);
    await q.waitForFunction(n => window.__museum.walking() === n, target.n, { timeout: 3000 });
    await q.waitForFunction(() => !window.__museum.walking(), null, { timeout: 12000 });
    await q.waitForSelector('.mu-caption[data-focus]', { timeout: 5000 });
    assert.equal(await q.locator('.mu-caption').getAttribute('data-focus'), target.n, '두 번 누른 액자 앞에 선다');
    assert.equal(await q.locator('.mu-detail').count(), 0, '두 번 누르면 자세히는 안 열린다');
    /* 한 번 누르기 — 잠깐 뒤 자세히 */
    const c = await q.evaluate(n => window.__museum.screenOf(n), target.n);
    await q.touchscreen.tap(c.x, c.y);
    await q.waitForSelector('.mu-detail[data-detail]', { timeout: 3000 });
    await q.keyboard.press('Escape'); await q.waitForFunction(() => !document.querySelector('.mu-detail'));
    assert(await q.evaluate(() => document.body.scrollWidth <= innerWidth), '가로로 넘친다');
    assert((await q.locator('.mu-stage').boundingBox()).height > 300, '무대가 충분히 크다');
    assert.deepEqual(m.errors, []);
    await m.close();

    /* 도감 — 박물관 단추, ?card= 로 상세 바로 */
    const d = await harness.open('dex.html?card=' + encodeURIComponent('묠니르'), { viewport: { width: 1280, height: 900 } }), r = d.page;
    await r.waitForSelector('.facts');
    assert((await r.locator('.bar h2').innerText()).includes('묠니르'), '?card= 로 상세가 열린다');
    await r.goto(r.url().split('?')[0]); await r.waitForSelector('#dex-museum');
    assert.equal(await r.locator('#dex-museum').getAttribute('href'), 'museum.html');
    await d.close();
    console.log('PASS 박물관: 액자 ' + cards.length + ' · 전시실 ' + group.myth.order.length + ' · 걷기·바로 가기·명판·자세히·상태 셋·휴대폰 손잡이·두 번 누르기·도감 잇기');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
