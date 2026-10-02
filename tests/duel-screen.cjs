/* 신기 결투 화면 — 덮개(344×882)에서 고르고, 덱을 짜고, 도전하고, 끝까지. 규칙은 안 본다(그건 duel-sim). */
const assert = require('node:assert/strict'), fs = require('node:fs');
const { start, FOLD } = require('./browser-harness.cjs');
const A = require('../lib/duel.js');
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, img: d('img').img, duel: d('duel') }, D = A.derive(data);
const STORE = 'myth_duel_v1';
const tap = async (p, sel) => { for (const b of await p.locator(sel).evaluateAll(es => es.map(e => e.getBoundingClientRect()).map(r => [r.width, r.height]))) assert(b[0] >= 44 && b[1] >= 44, sel + ' 누르는 자리 44px: ' + b); };
/* 가로 넘침 — .collection-scroll 이 overflow-x:hidden 이라 body 폭만 봐서는 모른다. 구르개 자체와 모든 요소의 오른쪽 끝을 본다(옆으로 미는 손패·줄 안은 뺀다) */
const noOverflow = async p => { const bad = await p.evaluate(() => { const sc = document.querySelector('.collection-scroll'), out = [];
  if (sc && sc.scrollWidth > sc.clientWidth + 1) out.push('scroller ' + sc.scrollWidth + '>' + sc.clientWidth);
  for (const e of document.querySelectorAll('.du-screen *')) { if (e.closest('.du-units, .du-hand')) continue; const r = e.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1) out.push((e.className || e.tagName) + ' ' + Math.round(r.right)); }
  return out.slice(0, 5); }); assert.deepEqual(bad, [], '가로 넘침'); };
const store = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('duel.html', { viewport: FOLD.cover, mobile: true }), p = a.page;
    /* 움직임은 켠 채로 시작한다 — 첫 내기의 연출을 본 뒤 끈다(상대 턴 0.6초를 기다리지 않으려고) */
    /* 첫 고르기 */
    await p.waitForSelector('.du-pick .du-myth');
    assert.equal(await p.locator('.du-myth').count(), 11, '열한 권');
    assert(await p.locator('#du-pick-go').isDisabled(), '고르기 전엔 못 간다');
    await tap(p, '.du-myth'); await noOverflow(p);
    await p.locator('.du-myth[data-myth="norse"]').click();
    await p.locator('#du-pick-go').click();
    /* 로비 */
    await p.waitForSelector('.du-lobby');
    const max = A.collectionMax(data);
    assert.equal(await p.locator('.du-deck').getAttribute('data-ok'), 'true', '시작 덱은 규칙에 맞다');
    assert((await p.locator('.du-deck').innerText()).includes('25/25'), '덱 25/25');
    assert((await p.locator('.du-coll').innerText()).includes('25/' + max), '컬렉션 25/' + max);
    assert.equal(await p.locator('.du-boss').count(), 11, '주인 열하나');
    assert.equal(await p.locator('.du-boss:disabled').count(), 0, '다 도전할 수 있다');
    assert.equal(await p.locator('.du-lv .on').getAttribute('data-lv'), 'rookie', '처음은 신참');
    await p.locator('.du-lv [data-lv="veteran"]').click();
    assert.equal((await store(p)).profile.level, 'veteran', '난이도는 저장된다');
    await tap(p, '.du-boss'); await tap(p, '.du-lv button'); await noOverflow(p);
    /* 배우기 — 규칙 한눈에 네 장 */
    await p.locator('#du-learn').click(); await p.waitForSelector('.du-rules');
    assert.equal(await p.locator('.du-rules .du-rule-card').count(), 4, '규칙 카드 넷');
    await tap(p, '#du-rules-close'); await noOverflow(p);
    await p.locator('#du-rules-close').click(); await p.waitForSelector('.du-lobby:not(:has(.du-rules))');
    /* 덱 짜기 — 빼면 규칙 줄이 빨개지고 출전이 막힌다 */
    await p.locator('#du-build').click(); await p.waitForSelector('.du-build .cell');
    assert.equal(await p.locator('.du-build .cell').count(), 25, '가진 카드만 보인다');
    assert.equal(await p.locator('.du-build .cell.in').count(), 25, '전부 덱에');
    assert.equal(await p.locator('.du-build .cell .du-row-tag').count(), 25, '카드마다 줄 표시');
    for (const r of await p.locator('.du-build .cell .du-row-tag').evaluateAll(es => es.map(e => e.dataset.row))) assert(A.ROWS.includes(r), '줄 표시의 값: ' + r);
    const first = await p.locator('.du-build .cell.in').first().getAttribute('data-id');
    await p.locator('.du-build .cell[data-id="' + first + '"]').click();
    await p.waitForSelector('.du-rule[data-ok="false"]');
    assert.equal(await p.locator('.du-build .cell.in').count(), 24, '빼면 24');
    assert(await p.locator('[data-rule="count"].bad').count() === 1 && (await p.locator('.du-why').innerText()).length > 3, '장 수 규칙이 빨갛고 이유가 보인다');
    await p.locator('.du-build .du-main-pick [data-myth="greek"]').click();
    assert.equal(await p.locator('[data-rule="main"].bad').count(), 1, '주 권을 바꾸면 15장 규칙이 빨갛다');
    await p.locator('.du-build .du-main-pick [data-myth="norse"]').click();
    await tap(p, '.du-build .cell'); await noOverflow(p);
    await p.locator('#du-build-done').click(); await p.waitForSelector('.du-lobby');
    assert.equal(await p.locator('.du-deck').getAttribute('data-ok'), 'false', '로비도 안다');
    assert.equal(await p.locator('.du-boss:disabled').count(), 11, '출전이 막힌다');
    await p.reload(); await p.waitForSelector('.du-lobby');
    assert.equal(await p.locator('.du-boss:disabled').count(), 11, '새로고침해도 그대로(저장)');
    await p.locator('#du-build').click(); await p.waitForSelector('.du-build .cell');
    await p.locator('.du-build .cell[data-id="' + first + '"]').click(); await p.waitForSelector('.du-rule[data-ok="true"]');
    await p.locator('#du-build-done').click(); await p.waitForSelector('.du-boss:not(:disabled)');
    /* ── 대결 (과제 9) ── */
    /* 도전 → 멀리건 */
    await p.locator('.du-boss[data-myth="greek"]').click(); await p.waitForSelector('.du-mull .du-card');
    assert.equal(await p.locator('.du-mull .du-card').count(), 10, '손패 열 장을 펼친다');
    await p.locator('.du-mull .du-card').nth(0).click(); await p.locator('.du-mull .du-card').nth(1).click(); await p.locator('.du-mull .du-card').nth(2).click();
    assert.equal(await p.locator('.du-mull .du-card.swapped').count(), 2, '두 장까지만 바꾼다');
    await tap(p, '.du-mull .du-card'); await tap(p, '#du-mull-go');
    await p.locator('#du-mull-go').click(); await p.waitForSelector('.du-board');
    /* 판을 손으로 맞춘다 — 내 차례, 손패 앞에 날씨판(근접)과 타격 카드, 상대 근접 줄에 비영웅 하나 */
    const wx = D.list.find(id => D.cards[id].variant === 'weather' && D.cards[id].row === 'melee');
    const hit = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].ability === 'strike');
    const foeUnit = D.list.find(id => D.cards[id].variant === 'base' && !D.cards[id].hero && D.cards[id].row === 'melee' && D.cards[id].power >= 7);
    await p.evaluate(([k, wx, hit, fu, pw]) => { const j = JSON.parse(localStorage.getItem(k)), m = j.match; m.turn = m.first = 'me'; m.passed = { me: false, foe: false };
      m.me.hand = [wx, hit].concat(m.me.hand.slice(2)); m.foe.rows.melee = [{ id: fu, base: pw, cur: pw, hero: false, cursed: false, shield: false, at: 900 }]; m.seq = 901;
      localStorage.setItem(k, JSON.stringify(j)); }, [STORE, wx, hit, foeUnit, D.cards[foeUnit].power]);
    await p.reload(); await p.waitForSelector('.du-board');
    assert.equal(await p.locator('.du-row[data-side="foe"][data-row="melee"] .du-unit .du-pw').innerText(), String(D.cards[foeUnit].power), '상대 근접 줄의 힘');
    assert.equal(await p.locator('.du-hand .du-card').count(), 10, '손패 열');
    assert.equal(await p.locator('.du-turn').innerText(), await p.evaluate(() => window.W('duel.turn.me')), '내 차례');
    /* 첫 판 길잡이 — 1단계부터, 손패 카드마다 줄 표시, ? 로 규칙 패널 */
    assert.equal(await p.locator('.du-guide').getAttribute('data-step'), '1', '첫 판엔 길잡이 1단계');
    assert.equal(await p.locator('.du-hand .du-card .du-row-tag, .du-hand .du-card .du-pw.wx').count(), 10, '손패 카드마다 줄(또는 날씨) 표시');
    await p.locator('#du-help').click(); await p.waitForSelector('.du-rules'); await p.locator('#du-rules-close').click(); await p.waitForFunction(() => !document.querySelector('.du-rules'));
    await tap(p, '.du-hand .du-card'); await tap(p, '#du-pass'); await tap(p, '#du-faction'); await noOverflow(p);
    /* 날씨판 — 상세의 단추 글이 "서리를 부른다", 내면 양쪽 줄 머리에 표시가 붙고 숫자가 1 로 */
    await p.locator('.du-hand .du-card[data-id="' + wx + '"]').first().click(); /* 손패에 같은 카드가 또 있을 수 있다 */ await p.waitForSelector('.du-detail[data-id="' + wx + '"]');
    assert.equal(await p.locator('#du-play').innerText(), await p.evaluate(() => window.W('duel.weather.call', { w: window.W('duel.weather.melee') })), '날씨판의 내기 글');
    await p.locator('#du-play').click();
    await p.waitForSelector('.du-ghost', { timeout: 2000 });   /* 손패에서 줄 머리로 날아가는 유령 카드 */
    await p.waitForSelector('.du-row[data-side="foe"][data-row="melee"][data-weather="true"]');
    assert((await p.locator('.du-rowflash').count()) >= 1, '날씨가 깔리는 줄이 번쩍인다');
    await p.waitForFunction(() => !document.querySelector('.du-ghost'), null, { timeout: 3000 });
    assert.equal(await p.locator('.du-row[data-side="me"][data-row="melee"]').getAttribute('data-weather'), 'true', '내 줄에도');
    assert.equal(await p.locator('.du-row[data-side="foe"][data-row="melee"] .du-unit[data-at="900"] .du-pw').innerText(), '1', '비영웅은 1 로 보인다');
    assert.equal(await p.locator('.du-row[data-side="foe"] .du-wx').count(), 1, '줄 머리에 서리');
    assert.equal(await p.locator('.du-hand .du-card').count(), 9, '손패 아홉');
    /* 상대가 두고(즉시) 다시 내 차례. 새로고침해도 판이 이어진다 */
    await p.waitForSelector('#du-pass:not(:disabled)');
    assert(+(await p.locator('.du-guide').getAttribute('data-step')) >= 2, '내가 내고 상대가 두면 길잡이가 넘어간다');
    const round = await p.locator('.du-round').innerText(), hand = await p.locator('.du-hand .du-card').count();
    await p.reload(); await p.waitForSelector('.du-board');
    assert.equal(await p.locator('.du-round').innerText(), round, '새로고침해도 같은 라운드');
    assert.equal(await p.locator('.du-hand .du-card').count(), hand, '같은 손패');
    /* 타격 카드 — 날아가 선 뒤 상대 가장 센 비영웅에 베는 선이 그어진다. 그 다음부터는 움직임을 끈다 */
    await p.locator('.du-hand .du-card[data-id="' + hit + '"]').first().click(); await p.waitForSelector('#du-play:not(:disabled)'); await p.locator('#du-play').click();
    await p.waitForSelector('.du-row[data-side="me"] .du-unit[data-id="' + hit + '"]');
    await p.waitForSelector('.du-slash', { timeout: 2500 });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    /* 패스 → 라운드가 끝나면 결과 한 줄 */
    await p.waitForSelector('#du-pass:not(:disabled)'); await p.locator('#du-pass').click();
    await p.waitForFunction(() => document.querySelector('.du-last-round') || document.querySelector('.du-result'));
    if (await p.locator('.du-guide').count()) {
      assert(+(await p.locator('.du-guide').getAttribute('data-step')) >= 4, '라운드가 끝나면 결과·목숨 단계');
      await tap(p, '#du-guide-skip'); await p.locator('#du-guide-skip').click(); await p.waitForFunction(() => !document.querySelector('.du-guide'));
      assert.equal((await store(p)).profile.tutorial, true, '그만 보기는 저장된다');
      await p.reload(); await p.waitForSelector('.du-board, .du-result');
      assert.equal(await p.locator('.du-guide').count(), 0, '새로고침해도 안 뜬다');
    }
    /* 끝까지 — 내 차례면 첫 카드를 내고, 없으면 패스 */
    for (let i = 0; i < 60 && !(await p.locator('.du-result').count()); i++) {
      if (await p.locator('#du-pass:not(:disabled)').count()) {
        if (await p.locator('.du-hand .du-card').count()) { await p.locator('.du-hand .du-card').first().click(); await p.waitForSelector('#du-play'); await p.locator('#du-play').click(); }
        else await p.locator('#du-pass').click();
      }
      await p.waitForTimeout(80);
    }
    await p.waitForSelector('.du-result');
    /* ── 결과·전적 (과제 10) ── */
    /* 아무 결과든 결과 화면이고, 로비로 돌아간다 */
    assert(['win', 'lose', 'draw'].includes(await p.locator('.du-result').getAttribute('data-result')), '결과');
    assert((await p.locator('.du-rounds li').count()) >= 2, '라운드 합');
    const ownedAfterFirst = (await store(p)).profile.owned.length;
    while (await p.locator('#du-reveal-next').count()) await p.locator('#du-reveal-next').click();
    await p.locator('#du-result-lobby').click(); await p.waitForSelector('.du-lobby');
    /* 이기는 판 — 3라운드, 상대 목숨 하나·빈손·패스, 내 손에 센 카드 하나 */
    await p.locator('.du-boss[data-myth="greek"]').click(); await p.waitForSelector('.du-mull'); await p.locator('#du-mull-go').click(); await p.waitForSelector('.du-board');
    const big = D.list.find(id => D.cards[id].variant === 'base' && D.cards[id].power >= 12);
    await p.evaluate(([k, big]) => { const j = JSON.parse(localStorage.getItem(k)), m = j.match; m.round = 3; m.lives = { me: 2, foe: 1 }; m.turn = m.first = 'me'; m.passed = { me: false, foe: true };
      m.me.hand = [big]; m.foe.hand = []; m.foe.rows = { melee: [], reach: [], ranged: [] }; m.me.rows = { melee: [], reach: [], ranged: [] }; m.weather = { melee: false, reach: false, ranged: false }; m.played = [];
      m.roundLog = [{ me: 10, foe: 20, winner: 'foe', units: { me: 1, foe: 2 } }, { me: 30, foe: 20, winner: 'me', units: { me: 3, foe: 2 } }];
      localStorage.setItem(k, JSON.stringify(j)); }, [STORE, big]);
    await p.reload(); await p.waitForSelector('.du-board');
    await p.locator('.du-hand .du-card').first().click(); await p.waitForSelector('#du-play:not(:disabled)'); await p.locator('#du-play').click();
    await p.waitForSelector('.du-result[data-result="win"]');
    const won = await store(p);
    const gained = won.profile.owned.length - ownedAfterFirst;
    assert(gained === (won.profile.beaten.greek.veteran === 1 ? 3 : 1), '첫 승 3장 · 재대결 1장 — 받은 ' + gained);
    assert.equal(await p.locator('.du-reveal .du-card').count(), 1, '한 장씩 공개');
    assert.equal(await p.locator('.du-reveal .du-card').getAttribute('data-id'), won.match.outcome.cards[0], '첫 장이 먼저');
    /* 새로고침 — 결과가 그대로이고 두 번 더하지 않는다 */
    await p.reload(); await p.waitForSelector('.du-result[data-result="win"]');
    assert.equal((await store(p)).profile.owned.length, won.profile.owned.length, '보상을 두 번 주지 않는다');
    assert.equal((await store(p)).profile.stats.games, won.profile.stats.games, '통계도 한 번');
    while (await p.locator('#du-reveal-next').count()) await p.locator('#du-reveal-next').click();
    assert.equal(await p.locator('.du-reveal .du-card').count(), 0, '다 보면 공개가 끝난다');
    await tap(p, '#du-result-lobby'); await tap(p, '#du-result-again');
    await p.locator('#du-result-lobby').click(); await p.waitForSelector('.du-lobby');
    assert((await p.locator('.du-coll').innerText()).includes(won.profile.owned.length + '/'), '컬렉션이 늘었다');
    /* 전적 */
    await p.locator('#du-stats').click(); await p.waitForSelector('.du-stats');
    const s = won.profile.stats;
    assert((await p.locator('.du-stats-line').innerText()).includes(s.games + '판') && (await p.locator('.du-stats-line').innerText()).includes(s.win + '승'), '전적 줄');
    assert.equal(await p.locator('.du-stats-boss tr[data-myth="greek"] td.win').innerText(), s.byBoss.greek.win + '/' + s.byBoss.greek.games, '주인별');
    assert.equal(await p.locator('.du-stats-main tr[data-myth="norse"] td.win').innerText(), s.byMain.norse.win + '/' + s.byMain.norse.games, '주 권별');
    assert.equal(await p.locator('.du-stats-cards .cell[data-id="' + big + '"]').count(), 1, '낸 카드가 그리드에');
    assert((await p.locator('.du-stats-cards .cell[data-id="' + big + '"]').innerText()).includes('—'), '5판 미만은 —');
    assert((await p.locator('.du-stats-best').innerText()).includes(String(s.bestRound)), '최고 합');
    assert.equal(await p.locator('.du-stats-boss tr[data-myth="norse"] td.win').innerText(), '—', '안 싸운 주인은 —');
    await noOverflow(p); await p.locator('#du-stats-close').click(); await p.waitForFunction(() => !document.querySelector('.du-stats'));
    /* 다시 — 같은 주인으로 새 판 */
    await p.locator('.du-boss[data-myth="greek"]').click(); await p.waitForSelector('.du-mull'); await p.locator('#du-mull-go').click(); await p.waitForSelector('.du-board');
    await p.evaluate(k => { const j = JSON.parse(localStorage.getItem(k)); j.match.phase = 'done'; j.match.winner = 'foe'; j.match.roundLog = [{ me: 1, foe: 9, winner: 'foe', units: { me: 1, foe: 1 } }, { me: 1, foe: 9, winner: 'foe', units: { me: 1, foe: 1 } }]; localStorage.setItem(k, JSON.stringify(j)); }, STORE);
    await p.reload(); await p.waitForSelector('.du-result[data-result="lose"] .du-reward-none');
    await p.locator('#du-result-again').click(); await p.waitForSelector('.du-mull');
    assert.deepEqual(a.errors, []); assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    await a.close();
    /* 옛 저장 — stats 없음, v 다름: 프로필은 살고 판은 버린다, 전적은 비어 있다 */
    const old = A.newProfile(data, 'korea', 4);
    const b = await harness.open('duel.html', { viewport: FOLD.cover, mobile: true, store: [STORE, JSON.stringify({ v: 0, profile: { main: 'korea', owned: old.owned, deck: old.deck }, match: { phase: 'play' } })] }), q = b.page;
    await q.waitForSelector('.du-lobby');
    assert((await q.locator('.du-main').innerText()).length > 0 && await q.locator('.du-deck').getAttribute('data-ok') === 'true', '옛 프로필로 로비');
    await q.locator('#du-stats').click(); await q.waitForSelector('.du-stats .du-stats-empty');
    assert.deepEqual(b.errors, []); assert.deepEqual(await q.evaluate(() => window.AtelierWords.missing()), []);
    await b.close();
    /* 이름이 바뀌었거나 그림이 내려간 카드 — 컬렉션·덱·판·전적에 모르는 id 가 있어도 화면이 죽지 않는다. 모르는 id 는 걸러 내고 그런 판은 버린다.
       (하네스의 store 는 새로고침마다 되돌아가므로 새 페이지로 연다) */
    const stale = { v: A.VERSION, profile: { ...old, owned: old.owned.concat(['없는무기', '없는무기@awaken']), stats: { ...A.emptyStats(), games: 1, win: 1, cards: { '없는무기': { played: 1, won: 1 } } } },
      match: { v: A.VERSION, phase: 'play', turn: 'me', round: 1, me: { hand: ['없는무기'], deck: [], rows: { melee: [], reach: [], ranged: [] }, grave: [] }, foe: { hand: [], deck: [], rows: { melee: [], reach: [], ranged: [] }, grave: [] } } };
    const c = await harness.open('duel.html', { viewport: FOLD.cover, mobile: true, store: [STORE, JSON.stringify(stale)] }), r = c.page;
    await r.waitForSelector('.du-lobby');
    assert((await r.locator('.du-coll').innerText()).includes('25/'), '모르는 id 는 컬렉션에서 걸러 낸다');
    assert.equal((await r.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE)).match, null, '모르는 id 가 든 판은 버린다');
    await r.locator('#du-stats').click(); await r.waitForSelector('.du-stats .du-stats-line');
    assert.equal(await r.locator('.du-stats-cards .cell').count(), 0, '모르는 카드는 전적 그리드에서 건너뛴다');
    assert.deepEqual(c.errors, []); assert.deepEqual(await r.evaluate(() => window.AtelierWords.missing()), []);
    await c.close();
    console.log('PASS 결투 화면: 첫 고르기 · 로비 · 덱 짜기 · 멀리건 · 대결 · 날씨 · 결과·보상 · 전적 · 새로고침 · 옛 저장');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
