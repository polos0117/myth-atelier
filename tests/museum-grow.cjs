/* 박물관이 자라도 되는지 — 신화권이 열다섯, 한 권에 무기가 마흔이어도 방이 겹치지 않고 걸어 들어가진다.
   그리고 group.json 의 museum 에 적은 그림(바닥·벽·깃발)은 받아서 바꿔 끼우고, 못 받으면 코드가 그린 그대로 둔다.
   자료는 페이지 안에서 fetch 를 가로채 부풀린다 — 진짜 파일은 안 건드린다 */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { start } = require('./browser-harness.cjs');
const cards = JSON.parse(fs.readFileSync('data/card.json', 'utf8')).cards;
const group = JSON.parse(fs.readFileSync('data/group.json', 'utf8'));
const EXTRA = 6, BIG = 40;
/* 1×1 흰 PNG — 벽·깃발·바닥 그림 대신 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

function grow([extra, big]) {
  const real = window.fetch;
  window.fetch = async (url, o) => {
    const r = await real(url, o), f = String(url);
    if (!/data\/(group|card)\.json/.test(f)) return r;
    const j = await r.clone().json();
    if (f.includes('group.json')) {
      for (let i = 0; i < extra; i++) {
        const k = 'grow' + i; j.myth.order.push(k); j.myth.name[k] = '새 권 ' + i; j.myth.en[k] = 'New ' + i; j.myth.color[k] = '#8a7a6a';
      }
      /* 있는 권 하나는 없는 그림(404), 하나는 받는 그림 */
      j.museum = { floor: true, rooms: { westasia: ['wall', 'banner', 'mural'], norse: ['wall'] } };
    } else {
      const base = j.cards.slice(0, 5), out = [];
      for (let i = 0; i < extra; i++) base.forEach((c, n) => out.push({ ...c, name: c.name + ' ' + i, myth: 'grow' + i, cost: n + 1 }));
      const west = j.cards.find(c => c.myth === 'westasia');
      for (let i = 0; i < big; i++) out.push({ ...west, name: west.name + ' #' + i });
      j.cards = j.cards.concat(out);
    }
    return new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

(async () => {
  const harness = await start();
  try {
    const a = await harness.open('museum.html', { viewport: { width: 1100, height: 800 }, init: [grow, [EXTRA, BIG]] }), p = a.page;
    /* 서아시아 그림은 받고, 북유럽 벽은 없다(404). 진짜 서아시아 그림 대신 흰 점 하나 */
    await a.ctx.route(/\/img\/ui\/museum_(westasia_(wall|banner|mural)|floor)\.webp/, r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await a.ctx.route(/\/img\/ui\/museum_norse_wall\.webp/, r => r.fulfill({ status: 404, body: 'no' }));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__museum, null, { timeout: 20000 });
    const n = group.myth.order.length + EXTRA;
    assert.equal(await p.evaluate(() => window.__museum.halls), n, '전시실은 늘어난 권 수만큼');
    assert.equal(await p.evaluate(() => window.__museum.frames), cards.length + EXTRA * 5 + BIG, '액자는 늘어난 무기 수만큼');
    assert.equal(await p.locator('.mu-rooms .mu-btn').count(), n + 1, '바로 가기도 늘어난다');

    const plan = await p.evaluate(() => window.__museum.plan());
    assert(plan.R > 14, '권이 많으면 홀이 커진다: ' + plan.R.toFixed(1));
    /* 이웃한 방 — 문턱(R_IN)에서 두 방 가운데 사이가 방 폭 + 기둥 자리보다 넓다. 밖으로 갈수록 더 벌어진다 */
    const step = Math.PI * 2 / n, gap = 2 * plan.R_IN * Math.sin(step / 2);
    assert(gap >= plan.roomW + 2, '방이 겹친다: ' + gap.toFixed(2));
    const west = plan.rooms[group.myth.order.indexOf('westasia')];
    assert(west.n > BIG && west.L > BIG / 2 * 3.7, '무기가 많은 방은 길어진다: ' + west.L.toFixed(1));

    /* 마지막 새 권으로 가서 걸어 들어간다 */
    await p.locator('.mu-stage canvas').click({ position: { x: 20, y: 20 } });
    await p.locator('.mu-rooms .mu-btn[data-room="' + (n - 1) + '"]').click();
    await p.waitForFunction(i => window.__museum.state().room === i, n - 1);
    assert.equal(await p.locator('.mu-detail').count(), 0);
    const s0 = await p.evaluate(() => window.__museum.state());
    await p.keyboard.down('w'); await p.waitForFunction(s0 => Math.hypot(window.__museum.state().x - s0.x, window.__museum.state().z - s0.z) > 0.8, s0, { timeout: 8000 }); await p.keyboard.up('w');
    assert.equal((await p.evaluate(() => window.__museum.state())).room, n - 1, '새 방 안을 걷는다');

    /* 그림 바꿔 끼우기 — 서아시아 벽 둘(옆·끝)·깃발 하나·바닥 전부. 북유럽 벽은 못 받아 그대로 */
    await p.waitForFunction(n => { const s = window.__museum.plan().swapped; return s.wall >= 2 && s.banner >= 1 && s.mural >= 1 && s.floor >= n + 1; }, n, { timeout: 15000 });
    const sw = (await p.evaluate(() => window.__museum.plan())).swapped;
    assert.equal(sw.wall, 2, '받은 벽은 서아시아 방의 둘뿐');
    assert.equal(sw.banner, 1, '받은 깃발은 서아시아 방 하나');
    assert.equal(sw.mural, 1, '받은 끝 벽 벽화는 서아시아 방 하나');
    assert.deepEqual(a.errors, []);
    await a.close();
    console.log('PASS 박물관 늘리기: 권 ' + n + ' · 홀 반지름 ' + plan.R.toFixed(1) + 'm · 서아시아 방 ' + west.n + '점 ' + west.L.toFixed(0) + 'm · 그림 바꿔 끼우기(벽 ' + sw.wall + ' · 깃발 ' + sw.banner + ' · 벽화 ' + sw.mural + ' · 바닥 ' + sw.floor + ')');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
