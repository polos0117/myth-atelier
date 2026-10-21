/* 움직임 — lib/scene-motion.js(공방 넷이 그대로 나눠 쓰는 파일)와 도감 상세·신전 홀에 붙인 자리.
   그림은 이 검사가 만드는 단색 PNG(그림 주소마다 색이 다르다) — 체크아웃에 그림이 없어도 돈다.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/scene-motion.cjs */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), zlib = require('node:zlib');
const { start, FOLD } = require('./browser-harness.cjs');
const cards = JSON.parse(fs.readFileSync('data/card.json', 'utf8')).cards, group = JSON.parse(fs.readFileSync('data/group.json', 'utf8'));
const table = JSON.parse(fs.readFileSync('data/motion.json', 'utf8'));
const VIEWPORTS = [FOLD.cover, { width: 390, height: 844 }, { width: 844, height: 390 }, FOLD.inner, { width: 1280, height: 900 }];
/* 묠니르 — 액션·각성·저주·특별·일상 다섯 장(도감 상세가 고르는 화풍) */
const IMG = { img: { '묠니르': { byStyle: { glossy_promo: { f: '묠니르_glossy_promo_f.webp', awaken: { f: '묠니르_glossy_promo_f_awaken.webp' }, cursed: { f: '묠니르_glossy_promo_f_cursed.webp' },
  casual: { f: ['묠니르_glossy_promo_f_casual1.webp'] }, extra: { f: ['묠니르_glossy_promo_f_extra1.webp'] } } } } } };
/* 모듈만 따로 보는 빈 화면 — 검사 때만 있는 주소다 */
const LAB = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="lib/scene-motion.css?v=1"><script src="lib/scene-motion.js?v=1"></script>
<style>body{margin:0;background:#111}#box,#stage{position:relative;width:320px;height:320px;background:#0b0d12}
#stage>div{position:absolute;inset:0}#a{background:#a04030}#b{background:#3060a0}#far{height:3000px}</style></head>
<body><div id="box"></div><div id="stage"><div id="a"></div><div id="b"></div></div><img id="pic" width="200" height="300" alt=""><div id="far"></div></body></html>`;

/* 단색 PNG — 압축 없이 만들 수 있는 가장 작은 꼴 */
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const t = Buffer.from(type), len = Buffer.alloc(4), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]); }
function png(w, h, [r, g, b]) {
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) row.set([r, g, b], 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk('IEND', Buffer.alloc(0))]);
}
const colour = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return [h & 255, (h >> 8) & 255, (h >> 16) & 255]; };
/* 그림 주소·시험 img.json·실험 화면을 이 탭에 물리고 다시 연다 */
async function wire(a, page) {
  const p = a.page;
  await p.route('https://polos0117.github.io/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: png(80, 120, colour(r.request().url())) }));
  await p.route('**/data/img.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(IMG) }));
  await p.route('**/motion-lab.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: LAB }));
  await p.goto(new URL(p.url()).origin + '/' + page);
  return p;
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const frameHash = p => p.evaluate(() => { const c = document.querySelector('#box canvas'); return c ? c.toDataURL() : null; });
const bigAnims = p => p.evaluate(() => document.querySelector('.big .zoom img').getAnimations().length);

(async () => {
  /* 0. 같은 파일을 넷이 나눠 쓴다 — 판 머리줄, 주제 말 없음, 바깥에서 받는 것 없음 */
  const src = fs.readFileSync('lib/scene-motion.js', 'utf8'), css = fs.readFileSync('lib/scene-motion.css', 'utf8');
  assert.match(src.split('\n')[0], /^\/\* scene-motion\.js — version \d+ /, 'js 첫 줄에 판');
  assert.match(css.split('\n')[0], /^\/\* scene-motion\.css — version \d+ /, 'css 첫 줄에 판');
  assert.equal(src.match(/version (\d+)/)[1], css.match(/version (\d+)/)[1], 'js·css 판이 같다');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/import |require\(|fetch\(|https?:\/\//.test(code), '바깥에서 받는 것이 없다');
  for (const w of ['book', 'pokemon', 'gundam', 'myth', 'weapon']) assert(!code.toLowerCase().includes(w), '모듈에 ' + w + ' 가 없다');
  assert(!/\bW\(|localStorage\.getItem\('(?!atelier_motion_v1)/.test(code.replace(/KEY/g, "'atelier_motion_v1'")), '모듈은 낱말 표를 안 부르고 제 열쇠만 쓴다');
  const box = { window: {} }; vm.createContext(box); vm.runInContext(src, box);
  const M0 = box.window.AtelierMotion;
  assert.equal(M0.KEY, 'atelier_motion_v1');

  /* 0-1. 입자 표(data/motion.json) — 모든 값이 모듈의 종류, 신화권마다 기본, 정규식이 선다, 모든 무기가 종류 하나를 받는다 */
  const KINDS = new Set(M0.KINDS);
  assert(table.note && Array.isArray(table.rules) && table.rules.length, '머리말과 rules');
  for (const r of table.rules) {
    assert(KINDS.has(r.kind), 'rules 의 ' + r.kind + ' 는 모듈 종류가 아니다');
    if (r.match) new RegExp(r.match, 'i');
    if (r.myth) for (const m of r.myth) assert(group.myth.order.includes(m), 'rules 의 신화권 ' + m);
  }
  for (const m of group.myth.order) assert(KINDS.has(table.myth[m]), '신화권 ' + m + ' 의 기본 입자');
  for (const [n, k] of Object.entries(table.cards || {})) { assert(cards.some(c => c.name === n), 'cards 의 ' + n + ' 는 없는 무기'); assert(KINDS.has(k), n + ' 의 ' + k); }
  for (const m of ['awaken', 'cursed']) assert(KINDS.has(table.hall[m]), '신전 ' + m + ' 입자');
  const ib = { window: {} }; vm.createContext(ib); vm.runInContext(fs.readFileSync('lib/img.js', 'utf8'), ib);
  const kindOf = c => ib.window.AtelierImg.particlesOf(c, table), byName = n => kindOf(cards.find(c => c.name === n));
  for (const c of cards) assert(KINDS.has(kindOf(c)), c.name + ' 의 입자: ' + kindOf(c));
  assert.deepEqual(['묠니르', '레바테인', '울르의 활', '트리아이나', '티르핑', '아르테미스의 활', '롱기누스의 창'].map(byName),
    ['sparks', 'embers', 'snow', 'bubbles', 'ash', 'stars', 'gold'], '번개·불·서리·바다·저주·달 그리고 표가 정한 것');
  assert.equal(byName('궁니르'), 'snow', '원소가 없는 북유럽은 눈');
  const used = new Set(cards.map(kindOf));
  assert(used.size >= 8, '입자가 고루 쓰인다: ' + [...used].join(','));

  const h = await start();
  try {
    /* 1. 입자 — 캔버스가 생기고, 프레임마다 화소가 바뀌고, 숨으면 멈추고, destroy 로 다 걷힌다 */
    const a = await h.open('index.html', { viewport: { width: 390, height: 844 } }), p = await wire(a, 'motion-lab.html');
    await p.waitForFunction(() => window.AtelierMotion);
    await p.evaluate(() => { window.pc = AtelierMotion.particles(document.getElementById('box'), 'embers', { seed: 'lab' }); });
    await p.waitForFunction(() => window.pc.frames > 5);
    assert.equal(await p.locator('#box canvas.am-particles').count(), 1, '캔버스 하나');
    const f1 = await frameHash(p); await p.waitForTimeout(250); const f2 = await frameHash(p);
    assert.notEqual(f1, f2, '프레임 사이 화소가 바뀐다');
    for (const kind of await p.evaluate(() => AtelierMotion.KINDS)) {
      const n = await p.evaluate(k => new Promise(ok => { const c = AtelierMotion.particles(document.getElementById('stage'), k, { seed: k });
        setTimeout(() => { const f = c.frames; c.destroy(); ok(f); }, 200); }), kind);
      assert(n > 3, kind + ' 이 돈다(' + n + ')');
    }
    assert.equal(await p.locator('#stage canvas').count(), 0, '종류마다 destroy 로 걷혔다');
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden0 = await p.evaluate(() => window.pc.frames); await p.waitForTimeout(250);
    assert.equal(await p.evaluate(() => window.pc.running), false, '탭이 숨으면 멈춘다');
    assert(await p.evaluate(() => window.pc.frames) - hidden0 <= 1, '숨은 동안 프레임이 안 돈다');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForFunction(f => window.pc.frames > f + 3, hidden0);
    await p.evaluate(() => { document.getElementById('box').style.marginTop = '4000px'; });
    await p.waitForFunction(() => !window.pc.running);
    await p.evaluate(() => { document.getElementById('box').style.marginTop = '0'; });
    await p.waitForFunction(() => window.pc.running);
    await p.evaluate(() => window.pc.destroy());
    assert.equal(await p.locator('#box canvas').count(), 0, 'destroy — 캔버스가 없다');

    /* 2. 켄 번스 — 한 그림에 애니메이션 하나, 같은 씨앗은 같은 움직임, 12~20초, transform 만 */
    const kb = await p.evaluate(() => { const el = document.getElementById('pic'), k = s => { const c = AtelierMotion.kenBurns(el, { seed: s }); const a = el.getAnimations(); const r = { n: a.length, frames: JSON.stringify(a[0].effect.getKeyframes().map(f => f.transform)), d: a[0].effect.getTiming().duration }; c.stop(); return r; };
      const x = k('묠니르_glossy_promo_f.webp'), y = k('묠니르_glossy_promo_f.webp'), z = k('레바테인_ink_wash_f.webp'); return { x, y, z, after: el.getAnimations().length }; });
    assert.equal(kb.x.n, 1, '켄 번스 애니메이션 하나');
    assert.equal(kb.x.frames, kb.y.frames, '같은 씨앗은 같은 움직임');
    assert.notEqual(kb.x.frames, kb.z.frames, '다른 씨앗은 다른 움직임');
    assert(kb.x.d >= 12000 && kb.x.d <= 20000, '12~20초: ' + kb.x.d);
    assert(/scale/.test(kb.x.frames) && !/rotate|left|top/.test(kb.x.frames), 'transform 만');
    assert.equal(kb.after, 0, 'stop 하면 걷힌다');

    /* 3. 열리기·끊기·넘기기 */
    const rv = await p.evaluate(async () => { const a = document.getElementById('a'), b = document.getElementById('b'), t = performance.now();
      const run = AtelierMotion.reveal(a, b, { kind: 'sparks', removeFrom: true, key: 'lab' });
      await new Promise(r => setTimeout(r, 380));
      const mid = { burst: document.querySelectorAll('#stage .am-burst').length, flash: document.querySelectorAll('#stage .am-flash').length };
      const r = await run, cs = getComputedStyle(b);
      return { r, ms: performance.now() - t, mid, opacity: cs.opacity, clip: cs.clipPath, fromGone: !a.isConnected, style: b.getAttribute('style') || '' }; });
    assert.equal(rv.r.cancelled, false);
    assert(rv.ms >= 900 && rv.ms <= 1700, '열리기 1초 남짓: ' + rv.ms);
    assert(rv.mid.burst === 1 && rv.mid.flash === 1, '도중 — 입자 터짐·빛: ' + JSON.stringify(rv.mid));
    assert(rv.opacity === '1' && rv.clip === 'none' && rv.fromGone && !/clip-path|opacity/.test(rv.style), '끝 — 새 그림이 다 보이고 남은 것 없음: ' + JSON.stringify(rv));
    const cut = await p.evaluate(async () => { const st = document.getElementById('stage'); st.innerHTML = '<div id="a"></div><div id="b"></div><div id="c"></div>';
      const [a, b, c] = ['a', 'b', 'c'].map(id => document.getElementById(id));
      const first = AtelierMotion.reveal(a, b, { kind: 'snow', key: 'lab' }); await new Promise(r => setTimeout(r, 150));
      const second = AtelierMotion.turn(b, c, { key: 'lab', direction: 'next' }); const r1 = await first, t = performance.now(), r2 = await second;
      return { r1, r2, turnMs: performance.now() - t, bClip: getComputedStyle(b).clipPath, left: st.querySelectorAll('.am-flash,.am-ghost').length }; });
    assert.equal(cut.r1.cancelled, true, '앞의 열리기는 끊긴다'); assert.equal(cut.r2.cancelled, false);
    assert.equal(cut.bClip, 'none'); assert(cut.turnMs < 700, '넘기기는 짧다: ' + cut.turnMs); assert.equal(cut.left, 0);

    /* 4. 스위치 — atelier_motion_v1, 끄면 걷히고 켜면 되살아나고, 새로고침해도 남는다 */
    const sw = await p.evaluate(() => { const box = document.getElementById('box'), el = document.getElementById('pic');
      const pc = AtelierMotion.particles(box, 'snow', {}), k = AtelierMotion.kenBurns(el, { seed: 'x' }); const seen = [];
      AtelierMotion.subscribe(v => seen.push(v));
      AtelierMotion.setEnabled(false);
      const off = { store: localStorage.getItem('atelier_motion_v1'), canvas: box.querySelectorAll('canvas').length, kb: el.getAnimations().length };
      AtelierMotion.setEnabled(true);
      const on = { store: localStorage.getItem('atelier_motion_v1'), canvas: box.querySelectorAll('canvas').length, kb: el.getAnimations().length };
      pc.destroy(); k.stop(); AtelierMotion.setEnabled(false); return { off, on, seen }; });
    assert.deepEqual(sw.off, { store: 'off', canvas: 0, kb: 0 }, '끄면 걷힌다');
    assert.deepEqual(sw.on, { store: 'on', canvas: 1, kb: 1 }, '켜면 되살아난다');
    assert.deepEqual(sw.seen, [false, true, false], '구독자에게 알린다');
    await p.reload(); await p.waitForFunction(() => window.AtelierMotion);
    assert.equal(await p.evaluate(() => AtelierMotion.enabled()), false, '새로고침해도 꺼짐');
    assert.deepEqual(a.errors, []); await a.close();

    /* 5. 동작 줄이기 — 켄 번스·떠도는 캔버스·터짐 없음, 열리기는 거의 바로 */
    const r = await h.open('index.html', { viewport: { width: 390, height: 844 } }), rp = await wire(r, 'motion-lab.html');
    await rp.emulateMedia({ reducedMotion: 'reduce' }); await rp.waitForFunction(() => window.AtelierMotion);
    const red = await rp.evaluate(async () => { const el = document.getElementById('pic'), box = document.getElementById('box');
      AtelierMotion.kenBurns(el, { seed: 'r' }); const pc = AtelierMotion.particles(box, 'embers', {});
      const t = performance.now(); await AtelierMotion.reveal(document.getElementById('a'), document.getElementById('b'), { kind: 'embers', removeFrom: true });
      return { kb: el.getAnimations().length, canvas: box.querySelectorAll('canvas').length, ms: performance.now() - t, burst: document.querySelectorAll('.am-burst').length, enabled: AtelierMotion.enabled() }; });
    assert.deepEqual({ kb: red.kb, canvas: red.canvas, burst: red.burst, enabled: red.enabled }, { kb: 0, canvas: 0, burst: 0, enabled: false }, JSON.stringify(red));
    assert(red.ms < 250, '열리기가 거의 바로: ' + red.ms);
    /* 도감 상세 — 동작 줄이기면 스위치가 잠긴다 */
    await rp.goto(h.base + '/dex.html?card=' + encodeURIComponent('묠니르')); await rp.waitForSelector('.big .zoom img');
    assert.equal(await rp.locator('#dex-motion').isDisabled(), true, '동작 줄이기 — 스위치 잠김');
    assert.equal(await bigAnims(rp), 0, '동작 줄이기 — 켄 번스 없음');
    await r.close();

    /* 6. 도감 상세 — 큰 그림에 켄 번스, 기본 ↔ 각성은 열리기(각성으로 갈 때 이 무기의 입자가 터지고 각성 위에 옅게 떠돈다), 다른 컷은 넘기기 */
    const x = await h.open('index.html', { viewport: { width: 1280, height: 900 } }), xp = await wire(x, 'dex.html?card=' + encodeURIComponent('묠니르'));
    await xp.waitForSelector('.big .zoom img');
    await xp.waitForFunction(() => document.querySelector('.big .zoom img').getAnimations().length === 1);
    assert.equal(await xp.locator('.big').getAttribute('data-particles'), 'sparks', '묠니르 — 번개라 불꽃');
    assert.equal(await xp.locator('.big .am-particles').count(), 0, '기본 그림에는 떠도는 입자 없음');
    assert.equal(await xp.locator('#dex-motion').textContent(), '움직임 끄기');
    assert.match(await xp.evaluate(() => location.search), /card=/, '주소에 card');
    await xp.click('button[data-cut="awaken"]');
    await xp.waitForSelector('.big .am-burst[data-kind="sparks"]');
    assert.equal(await xp.locator('.big .am-ghost').count(), 1, '기본 → 각성: 열리기(나가는 그림의 사본)');
    assert.match(await xp.locator('.big .zoom img').getAttribute('src'), /_awaken/);
    await xp.waitForFunction(() => !document.querySelector('.big .am-ghost, .big .am-flash'));
    await xp.waitForSelector('.big-motion .am-particles[data-kind="sparks"]');
    await xp.waitForFunction(() => !document.querySelector('.big .am-burst, .big .am-overlay'), null, { timeout: 4000 });
    assert.equal(await xp.evaluate(() => getComputedStyle(document.querySelector('.big .zoom img')).clipPath), 'none', '끝나면 각성이 다 보인다');
    assert.equal(await bigAnims(xp), 1, '열리기 뒤 켄 번스가 이어받는다');
    await xp.click('button[data-cut="portrait"]'); await xp.waitForTimeout(60);
    assert.equal(await xp.locator('.big .am-ghost').count(), 1, '각성 → 기본도 열리기');
    assert.equal(await xp.locator('.big .am-burst').count(), 0, '기본으로 돌아갈 때는 안 터진다');
    assert.equal(await xp.locator('.big-motion .am-particles').count(), 0, '기본에서는 떠도는 입자가 걷힌다');
    await xp.waitForFunction(() => !document.querySelector('.big .am-ghost'));
    await xp.click('button[data-cut="cursed"]'); await xp.waitForTimeout(60);
    assert.equal(await xp.locator('.big .am-ghost').count(), 1, '다른 컷 — 넘기기');
    assert.equal(await xp.locator('.big .am-flash, .big .am-burst').count(), 0, '넘기기에는 빛·입자 없음');
    await xp.waitForFunction(() => !document.querySelector('.big .am-ghost'));
    assert.equal(await xp.evaluate(() => getComputedStyle(document.querySelector('.big .zoom img')).opacity), '1');
    /* 크게 보기 — 켄 번스·입자 없음, 그동안 큰 그림도 쉰다. 닫으면 포커스는 큰 그림에, 움직임은 다시 */
    await xp.click('button[data-cut="awaken"]'); await xp.waitForSelector('.big-motion .am-particles');
    await xp.click('.big .zoom'); await xp.waitForSelector('.zoom-layer img'); await xp.waitForTimeout(300);
    assert.equal(await xp.evaluate(() => document.querySelector('.zoom-layer img').getAnimations().length), 0, '크게 보기 — 켄 번스 없음');
    assert.equal(await xp.locator('.zoom-layer canvas, .zoom-layer .am-ghost').count(), 0, '크게 보기 — 입자 없음');
    assert.equal(await bigAnims(xp), 0, '크게 보는 동안 큰 그림은 쉰다');
    await xp.keyboard.press('ArrowRight'); await xp.waitForTimeout(100);
    assert.equal(await xp.locator('.big .am-ghost').count(), 0, '크게 보며 넘겨도 뒤에서 전환이 안 돈다');
    await xp.keyboard.press('Escape'); await xp.waitForSelector('.zoom-layer', { state: 'detached' });
    assert.equal(await xp.evaluate(() => document.activeElement.matches('.big .zoom')), true, '닫으면 포커스는 큰 그림에');
    await xp.waitForFunction(() => document.querySelector('.big .zoom img').getAnimations().length === 1);
    /* 스위치 — 끄면 걷히고, 새로고침해도 꺼짐, 포커스는 단추에 */
    await xp.click('button[data-cut="awaken"]'); await xp.waitForSelector('.big-motion .am-particles');
    await xp.waitForFunction(() => !document.querySelector('.big .am-ghost'));
    await xp.click('#dex-motion');
    assert.equal(await xp.locator('#dex-motion').textContent(), '움직임 켜기');
    assert.equal(await xp.evaluate(() => document.activeElement.id), 'dex-motion', '포커스는 단추에');
    assert.equal(await xp.locator('.big .am-particles').count(), 0, '끄면 입자가 걷힌다');
    assert.equal(await bigAnims(xp), 0, '끄면 켄 번스가 걷힌다');
    await xp.click('button[data-cut="portrait"]'); await xp.click('button[data-cut="awaken"]'); await xp.waitForTimeout(80);
    assert.equal(await xp.locator('.big .am-burst').count(), 0, '꺼짐 — 입자 없음');
    await xp.reload(); await xp.waitForSelector('#dex-motion');
    assert.equal(await xp.locator('#dex-motion').textContent(), '움직임 켜기', '새로고침해도 꺼짐');
    assert.equal(await xp.evaluate(() => localStorage.getItem('atelier_motion_v1')), 'off');
    await xp.click('#dex-motion'); await xp.waitForFunction(() => document.querySelector('.big .zoom img').getAnimations().length === 1);
    assert.deepEqual(x.errors, []); await x.close();

    /* 7. 신전 홀 — 각성·저주 보기를 켜면 장면에 한 번 터진다(data/motion.json 의 hall), 끌 때는 안, 움직임을 껐으면 안 */
    const g = await h.open('index.html', { viewport: { width: 1280, height: 900 } }), gp = g.page;
    await gp.waitForSelector('.hall-card');
    await gp.waitForTimeout(200);
    await gp.click('.hall-mode[data-mode="awaken"]');
    await gp.waitForSelector('.hall-stage .am-burst[data-kind="' + table.hall.awaken + '"]');
    assert.equal(await gp.locator('.hall').getAttribute('data-mode'), 'awaken');
    await gp.waitForFunction(() => !document.querySelector('.hall-stage .am-burst'), null, { timeout: 4000 });
    await gp.click('.hall-mode[data-mode="cursed"]');
    await gp.waitForSelector('.hall-stage .am-burst[data-kind="' + table.hall.cursed + '"]');
    await gp.waitForFunction(() => !document.querySelector('.hall-stage .am-burst'), null, { timeout: 4000 });
    await gp.click('.hall-mode[data-mode="cursed"]'); await gp.waitForTimeout(80);
    assert.equal(await gp.locator('.hall').getAttribute('data-mode'), 'base');
    assert.equal(await gp.locator('.hall-stage .am-burst').count(), 0, '끌 때는 안 터진다');
    await gp.evaluate(() => AtelierMotion.setEnabled(false));
    await gp.click('.hall-mode[data-mode="awaken"]'); await gp.waitForTimeout(80);
    assert.equal(await gp.locator('.hall-stage .am-burst').count(), 0, '움직임을 껐으면 안 터진다');
    assert.deepEqual(g.errors, []); await g.close();

    /* 8. 다섯 크기 — 움직임을 켠 채 도감 상세(열리기·떠도는 입자)·신전 홀(터짐)에서 가로 넘침·화면 오류 없음 */
    for (const viewport of VIEWPORTS) {
      const v = await h.open('index.html', { viewport }), vp = await wire(v, 'dex.html?card=' + encodeURIComponent('묠니르'));
      await vp.waitForSelector('.big .zoom img'); await vp.click('button[data-cut="awaken"]');
      await vp.waitForSelector('.big .am-burst'); assert(await noOverflow(vp), 'dex overflow ' + JSON.stringify(viewport));
      await vp.waitForSelector('.big-motion .am-particles');
      const inside = await vp.evaluate(() => { const c = document.querySelector('.big-motion canvas').getBoundingClientRect(), b = document.querySelector('.big').getBoundingClientRect();
        return c.width > 50 && c.left >= b.left - 1 && c.right <= b.right + 1 && c.top >= b.top - 1 && c.bottom <= b.bottom + 1; });
      assert(inside, '입자는 큰 그림 칸 안 ' + JSON.stringify(viewport));
      const tap = await vp.locator('#dex-motion').boundingBox(); assert(tap && tap.height >= 40, '#dex-motion 누르는 자리');
      assert(await noOverflow(vp), 'dex overflow after ' + JSON.stringify(viewport));
      assert.deepEqual(v.errors, [], 'dex ' + JSON.stringify(viewport));
      await vp.goto(h.base + '/index.html'); await vp.waitForSelector('.hall-card');
      await vp.click('.hall-mode[data-mode="awaken"]'); await vp.waitForSelector('.hall-stage .am-burst');
      assert(await noOverflow(vp), 'hall overflow ' + JSON.stringify(viewport));
      assert.deepEqual(v.errors, [], 'index ' + JSON.stringify(viewport)); await v.close();
    }
    console.log('PASS 움직임: 같은 파일(판·바깥 없음) · 입자 표 ' + table.rules.length + '줄 → 무기 ' + cards.length + '자루 ' + used.size + '종류 · 입자·켄 번스·열리기·끊기·넘기기 · 스위치·동작 줄이기 · 도감 상세(열리기·넘기기·떠도는 입자·크게 보기·스위치) · 신전 홀 터짐 · 다섯 크기 넘침·오류 없음');
  } finally { await h.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
