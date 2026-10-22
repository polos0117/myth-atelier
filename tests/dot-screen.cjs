/* 도트 무기 — 대장간 무대 바닥 · 도감 상세의 도트 줄 · 목록의 「도트」 표 (data/sprites.json · lib/sprite-actor.js).
   도트 자료는 시험 자료(묠니르·간디바)를 opt.files 로 주고, 그림은 tests/fixtures/make-sprites.py 가 임시 자리에 그린다.
   - 대장간: 도트가 있으면 무대 아래쪽 띠에 서서 거닌다(좁으면 둘), 띠는 누름을 지나 보낸다, 누르면 그 무기의 도감(?card=)
   - 도트 자료가 비면 띠째 없다(무대는 그대로)
   - 도감: 도트 있는 무기의 상세에 작은 무대(누르면 반응), 없는 무기는 없다 · 목록 칸에 「도트」 표
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dot-screen.cjs */
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const actor = (card, id) => ({ card, id, form: 'base', cell: [96, 128], foot: [48, 126], scale: 1, flip: true, facing: 'right', states: {
  still: { file: id + '/' + id + '_base_still.png', frames: 1 },
  idle: { file: id + '/' + id + '_base_idle.png', frames: 4, order: [0, 1, 2, 3], ms: [300, 200, 140, 200] },
  walk: { file: id + '/' + id + '_base_walk.png', frames: 6, order: [0, 1, 2, 3, 4, 5], ms: [120, 120, 120, 120, 120, 120], speed: 60, dy: [0, 1, -1, 0, 1, -1] },
  react: { file: id + '/' + id + '_base_react.png', frames: 4, order: [0, 1, 2, 3], ms: [100, 120, 160, 120] } } });
const SPRITES = { base: 'https://polos0117.github.io/myth-atelier-img/sprites/', actors: { mjolnir: actor('묠니르', 'mjolnir'), gandiva: actor('간디바', 'gandiva') } };
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'myth-dot-'));
fs.writeFileSync(path.join(art, 'sprites.json'), JSON.stringify(SPRITES));
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-sprites.py'), path.join(art, 'sprites.json'), art]);
const opt = (extra = {}) => ({ viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, files: { 'data/sprites.json': SPRITES }, ...extra });
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const other = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'card.json'), 'utf8')).cards.map(c => c.name).find(n => !SPRITES.actors[n] && n !== '묠니르' && n !== '간디바');

(async () => {
  const h = await start();
  let n = 0;
  try {
    /* ── 대장간 ── */
    let s = await h.open('index.html', opt()), p = s.page;
    await p.waitForSelector('.hall-dots:not([hidden]) .sprite-actor:not([hidden])', { timeout: 10000 });
    assert.equal(await p.locator('.hall-dots .sprite-actor').count(), 2, '좁으면 둘');
    const g = await p.evaluate(() => { const st = document.querySelector('.hall-stage').getBoundingClientRect(), a = [...document.querySelectorAll('.hall-dots .sprite-actor')].map(e => e.getBoundingClientRect()); return { ok: a.every(r => r.bottom <= st.bottom + 1 && r.left >= st.left - 1 && r.right <= st.right + 1), pe: getComputedStyle(document.querySelector('.hall-dots')).pointerEvents }; });
    assert(g.ok, '인물은 무대 안'); assert.equal(g.pe, 'none', '띠는 누름을 지나 보낸다');
    assert.match(await p.locator('.hall-dots .sprite-actor').first().getAttribute('aria-label'), /도트 — 눌러서 도감 보기/);
    await p.waitForFunction(() => [...document.querySelectorAll('.hall-dots .sprite-actor')].some(a => a.sprite.debug().state === 'walk'), null, { timeout: 10000 });
    const who = await p.locator('.hall-dots .sprite-actor').first().getAttribute('data-who');
    await Promise.all([p.waitForURL(/dex\.html\?card=/), p.locator('.hall-dots .sprite-actor').first().click({ force: true })]);
    assert.equal(new URL(p.url()).searchParams.get('card'), who, '누르면 그 무기의 도감');
    assert.deepEqual(s.errors, []);
    await s.close();
    n += 3;
    s = await h.open('index.html', opt({ files: { 'data/sprites.json': { base: SPRITES.base, actors: {} } } })); p = s.page;
    await p.waitForSelector('.hall-card'); await wait(800);
    assert.equal(await p.locator('.hall-dots').isHidden(), true, '도트 자료가 비면 띠째 없다');
    await s.close();
    n++;

    /* ── 도감 ── */
    s = await h.open('dex.html?card=' + encodeURIComponent('묠니르'), opt()); p = s.page;
    await p.waitForSelector('.dex-dot:not([hidden]) .sprite-actor:not([hidden])', { timeout: 10000 });
    assert.match(await p.locator('.dex-dot .sprite-actor').getAttribute('aria-label'), /묠니르 도트/);
    await p.locator('.dex-dot-stage').scrollIntoViewIfNeeded(); await wait(200);
    await p.locator('.dex-dot .sprite-actor').click();
    await p.waitForFunction(() => document.querySelector('.dex-dot .sprite-actor').dataset.state === 'react', null, { timeout: 3000 });
    await s.close();
    s = await h.open('dex.html?card=' + encodeURIComponent(other), opt()); p = s.page;
    await p.waitForSelector('.story-panel'); await wait(1200);
    assert.equal(await p.locator('.dex-dot').isHidden(), true, '도트 없는 무기는 줄이 없다');
    await s.close();
    s = await h.open('dex.html', opt()); p = s.page;
    await p.waitForSelector('.cell[data-card="묠니르"] .dot-badge', { timeout: 10000 });
    assert.equal(await p.locator('.cell[data-card="' + other + '"] .dot-badge').count(), 0);
    assert.deepEqual(s.errors, []);
    await s.close();
    n += 3;
    /* ── 화소 배율이 정수가 아닌 화면 — 폴드(2.625: 도트 한 칸 3화소 = 1.14배) · 노트북 150%(1.5: 2화소 = 1.33배). 공간이 도트만큼 늘어 머리가 안 잘린다(재생기 grow) ── */
    const headIn = (host, sel) => p.evaluate(([host, sel]) => { const f = document.querySelector(host).getBoundingClientRect(), as = [...document.querySelectorAll(sel)];
      return as.length > 0 && as.every(a => { const u = a.sprite.debug().unit, b = a.getBoundingClientRect(); return b.top - 2 * u >= f.top - 0.5 && b.bottom <= f.bottom + 0.5; }); }, [host, sel]);
    for (const [dpr, vp, mobile] of [[2.625, { width: 344, height: 882 }, true], [2.625, { width: 690, height: 829 }, true], [1.5, { width: 1280, height: 800 }, false]]) {
      s = await h.open('index.html', opt({ viewport: vp, mobile, dpr })); p = s.page;
      await p.waitForSelector('.hall-dots .sprite-actor:not([hidden])', { timeout: 10000 });
      assert(await headIn('.hall-dots', '.hall-dots .sprite-actor'), '머리가 잘린다 — index.html · 배율 ' + dpr + ' · 폭 ' + vp.width);
      await s.close();
      s = await h.open('dex.html?card=' + encodeURIComponent('묠니르'), opt({ viewport: vp, mobile, dpr })); p = s.page;
      await p.waitForSelector('.dex-dot .sprite-actor:not([hidden])', { timeout: 10000 });
      assert(await headIn('.dex-dot-stage', '.dex-dot .sprite-actor'), '머리가 잘린다 — dex.html?card= · 배율 ' + dpr + ' · 폭 ' + vp.width);
      await s.close();
    }
    n++;
    console.log('PASS 도트 무기: ' + n + '가지 · 대장간 무대 바닥(좁으면 둘·무대 안·띠는 누름을 지나 보낸다·누르면 도감) · 자료 없음 · 도감 상세 무대(누르면 반응) · 없는 무기는 없다 · 목록 「도트」 표 · 폴드·150% 화면에서 머리가 안 잘린다');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
