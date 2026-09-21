/* 브라우저 검사 공용 껍데기.
   화면 셋은 Preact 를 esm.sh 에서 받는다. CDN 이 막힌 곳에서는 ESM_DIR 에
   node_modules 경로를 주면 그 사본으로 갈아 끼운다 (npm i preact@10.24.3 htm@3.1.1).
   ESM_DIR 이 없으면 그대로 CDN 으로 나간다 — 열린 곳에서는 아무것도 안 해도 된다.

   BASE_URL 을 주면 이미 도는 서버를 쓰고, 없으면 제 서버를 띄운다.
   CHROMIUM_PATH 로 이미 있는 브라우저를 고를 수 있다. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const ESM = {
  'https://esm.sh/preact@10.24.3': 'preact/dist/preact.mjs',
  'https://esm.sh/preact@10.24.3/hooks': 'preact/hooks/dist/hooks.mjs',
  'https://esm.sh/htm@3.1.1': 'htm/dist/htm.mjs',
};
/* 폴드5 — 덮개 화면과 펼친 화면. 이 저장소 화면이 맞춰 온 두 크기다 */
const FOLD = { cover: { width: 344, height: 882 }, inner: { width: 690, height: 829 } };

function serve(base) {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, base).pathname));
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        res.end(data);
      });
    });
    s.listen(new URL(base).port, '127.0.0.1', () => ok(s));
  });
}

async function start() {
  const { chromium } = require('playwright');
  const base = process.env.BASE_URL || process.env.MOBILE_BASE_URL || 'http://127.0.0.1:8765';
  const server = (process.env.BASE_URL || process.env.MOBILE_BASE_URL) ? null : await serve(base);
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] }
      : {}) });

  /* 화면 하나를 새 살림(빈 localStorage)으로 연다. 검사끼리 저장값이 섞이면
     "혼자 돌리면 되는데 같이 돌리면 깨진다" 가 된다 */
  async function open(page, opt) {
    opt = opt || {};
    const ctx = await browser.newContext({ viewport: opt.viewport || FOLD.cover,
      isMobile: !!opt.mobile, hasTouch: !!opt.mobile });
    await ctx.route('**/*', async route => {
      const url = route.request().url(), origin = new URL(url).origin;
      if (origin === new URL(base).origin) return route.continue();
      const bare = url.split('?')[0];
      if (ESM[bare]) {
        const dir = process.env.ESM_DIR;
        if (!dir) return route.continue();
        const file = path.join(dir, ESM[bare]);
        if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'no ' + bare });
        /* 사본은 서로를 "preact" 로 부르므로 CDN 주소로 되돌려 준다 */
        const src = fs.readFileSync(file, 'utf8').replace(/from"preact"/g, 'from"https://esm.sh/preact@10.24.3"');
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: src });
      }
      /* 배포된 그림 주소는 체크아웃의 같은 파일로 돌린다.
         주소를 다시 요청하면 한글 파일 이름의 %xx 가 두 번 인코딩돼 404 가 된다 —
         디스크에서 바로 읽는다 */
      const figure = origin === 'https://polos0117.github.io' &&
        new URL(url).pathname.match(/^\/atelier\/assets\/figures\/([^/]+\.png)$/);
      const local = figure ? [null, 'img/figure-previews/' + figure[1]] :
        origin === 'https://polos0117.github.io' && new URL(url).pathname.match(/\/(img\/.+)$/);
      if (local) {
        const rel = decodeURIComponent(local[1]);
        const file = path.resolve(ROOT, rel);
        if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) {
          return route.fulfill({ status: 404, body: 'no ' + rel });
        }
        return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream',
                               body: fs.readFileSync(file) });
      }
      return route.abort();
    });
    if (opt.store) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, opt.store);
    /* init 은 함수 하나, 또는 [함수, 넘길 값] 이다. 넘길 값은 브라우저 쪽으로
       직렬화돼 건너가므로 바깥 변수를 붙잡지 않는다 */
    if (opt.init) await ctx.addInitScript(...(Array.isArray(opt.init) ? opt.init : [opt.init]));
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
    await p.goto(base + '/' + page, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.readyState === 'complete');
    return { ctx, page: p, errors, close: () => ctx.close() };
  }

  return { base, browser, open, FOLD,
    stop: async () => { await browser.close(); if (server) server.close(); } };
}

/* 통과·실패를 한 줄씩 찍고 하나라도 실패하면 1 로 끝낸다 */
function report(rows, title) {
  let bad = 0;
  rows.forEach(([name, ok, got]) => {
    if (!ok) bad++;
    console.log((ok ? '  OK   ' : '  FAIL ') + name + (ok ? '' : '  ← ' + got));
  });
  if (bad) { console.error(`${title}: ${rows.length} 가운데 ${bad} 실패`); process.exitCode = 1; }
  else console.log(`PASS ${title} — ${rows.length}가지`);
  return bad;
}

module.exports = { start, report, FOLD };
