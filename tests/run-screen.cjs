/* 던전 화면 — 고르고, 평면도(갈림길·계단·둘째 층)에 서고, 싸우고, 전리품·상점·보스, 저장되는지. 규칙은 안 본다(그건 run-sim). */
const assert = require('node:assert/strict');
const { start, FOLD } = require('./browser-harness.cjs');
/* 평면도에서 자리를 옮긴다 — floor 층의 kind 방으로 길이 닿는 방에 서서(다녀온 것은 들어온 자리와 그 방) 길 화면으로. extra 는 그 위에 덮는다 */
const moveBefore = (p, floor, kind, extra) => p.evaluate(([floor, kind, extra]) => {
  const j = JSON.parse(localStorage.getItem('myth_run_v1')), f = j.plan.floors[floor];
  /* 같은 종류가 여럿이면(싸움) 가장 오른쪽 — 계단 앞 열 */
  const to = f.rooms.filter(r => r.kind === kind).sort((a, b) => b.col - a.col)[0], from = f.edges.find(e => e[1] === to.id)[0];
  Object.assign(j, { floor, room: from, visited: [0, from], phase: 'map', battle: null, reward: null, shop: null }, extra || {});
  localStorage.setItem('myth_run_v1', JSON.stringify(j));
}, [floor, kind, extra || null]);
(async () => {
  const harness = await start();
  try {
    const a = await harness.open('run.html', { viewport: { width: 1280, height: 900 } }), p = a.page;
    await p.waitForSelector('.rn-pick .cell');
    const N = JSON.parse(require('node:fs').readFileSync('data/card.json', 'utf8')).cards.length;
    assert.equal(await p.locator('.rn-pick .cell').count(), N, '카드 전부 — ' + N + '자루');
    assert(await p.locator('.rn-btn.primary').isDisabled(), '셋을 고르기 전엔 못 나선다');
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    assert.equal(await p.locator('.rn-pick .cell.on').count(), 3, '셋 골랐다');
    await p.locator('.rn-pick .cell[data-name="그람"]').click();
    assert.equal(await p.locator('.rn-pick .cell.on').count(), 3, '넷째는 안 들어간다');
    await p.locator('.rn-btn.primary').click();
    /* 길 — 평면도 1층. 들어온 자리에 서 있고, 길이 닿는 방만 누를 수 있다 */
    await p.waitForSelector('.rn-plan');
    assert.equal(await p.locator('.rn-map .rn-node').count(), 0, '옛 아홉 칸 줄은 없다');
    assert((await p.locator('.rn-floor').innerText()).includes('1 / 2'), '1층');
    assert.equal(await p.locator('.rn-room[data-state="here"][data-kind="entry"]').count(), 1, '들어온 자리에 서 있다');
    assert.equal(await p.locator('.rn-room[data-kind="stairs"]').count(), 1, '계단 하나');
    assert.equal(await p.locator('.rn-room[data-kind="shrine"]').count(), 1, '1층엔 제단');
    assert.equal(await p.locator('.rn-room[data-kind="shop"]').count() + await p.locator('.rn-room[data-kind="boss"]').count(), 0, '1층엔 상점·보스가 없다');
    const nextN = await p.locator('.rn-next .rn-btn').count();
    assert(nextN >= 1 && nextN <= 3 && nextN === await p.locator('.rn-room[data-state="next"]').count(), '갈 수 있는 방 — 단추와 금테가 같은 수 ' + nextN);
    assert.equal(await p.locator('.rn-plan .edge.open').count(), nextN, '열린 길도 같은 수');
    assert((await p.locator('.rn-purse').innerText()).includes('12'), '금화·덱 열둘');
    /* 계단 앞 열은 모두 싸움 — 그 앞에 서서 평면도의 방을 눌러 들어간다 */
    await moveBefore(p, 0, 'fight'); await p.reload(); await p.waitForSelector('.rn-plan');
    assert.equal(await p.locator('.rn-next .rn-btn:not([data-kind="fight"])').count(), 0, '계단 앞 열은 모두 싸움');
    assert.equal(await p.locator('.rn-room[data-state="visited"]').count(), 1, '다녀온 방은 들어온 자리');
    await p.locator('.rn-room[data-state="far"]').first().click({ force: true });
    assert.equal(await p.locator('.rn-plan').count(), 1, '길이 안 닿는 방은 눌러도 그대로');
    await p.locator('.rn-room[data-state="next"]').first().click();
    await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-battle.map-stage[data-has-map]').count(), 1, '싸움 뒤에 맵 — 첫 상대의 권');
    assert.equal(await p.locator('.rn-party .rn-fig').count(), 3, '동료 셋이 선다');
    assert.equal(await p.locator('.rn-enemy .rn-fig').count(), 2, '첫 상대 둘');
    assert.equal(await p.locator('.rn-enemy .rn-intent').count(), 2, '상대마다 예고');
    assert((await p.locator('.rn-party .rn-incoming').count()) >= 1, '노려진 동료에 받을 피해');
    const dock = await p.locator('.rn-dock').boundingBox();
    assert(dock && dock.y + dock.height <= 900 + 1, '손패가 한 화면 안에');
    assert.equal(await p.locator('.rn-hand .rn-card').count(), 5, '손패 다섯');
    assert.equal(await p.locator('.rn-mana i.on').count(), 3, '마나 셋');
    assert((await p.locator('.rn-party .rn-fig img').count()) >= 1, '전신 그림이 걸린다');
    /* 상대를 두껍게 — 첫 카드에 쓰러지면 턴 끝을 못 본다 */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.battle.enemies.forEach(e => { e.hp = e.maxHp = 9999; }); localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    /* 카드를 낸다 → 마나가 줄고 기록이 남는다 */
    await p.locator('.rn-hand .rn-card:not(:disabled)').first().click();
    /* 상대가 둘이라 한 명 치는 카드는 누굴 칠지 고른다 */
    if (await p.locator('.rn-fig.target').count()) await p.locator('.rn-fig.target').first().click();
    await p.waitForFunction(() => document.querySelectorAll('.rn-mana i.on').length < 3);
    assert((await p.locator('.rn-log div').count()) >= 2, '기록이 남는다');
    /* 턴 끝 → 2턴, 손패 새로 */
    await p.locator('.rn-deck .rn-btn').click();
    await p.waitForFunction(() => /2/.test(document.querySelector('.rn-head h2 small').textContent));
    assert.equal(await p.locator('.rn-hand .rn-card').count(), 5, '손패가 새로');
    /* 저장 — 다시 열어도 싸움 중 */
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-party .rn-fig').count(), 3, '길이 남는다');
    /* 이긴다 → 금화와 전리품 셋, 한 장 고르면 덱에 */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.battle.enemies.forEach(e => { e.hp = 1; }); j.battle.mana = 3; localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    for (let k = 0; k < 6 && !(await p.locator('.rn-loot').count()); k++) {
      const hit = p.locator('.rn-hand .rn-card:not(:disabled)').first();
      if (await hit.count()) await hit.click(); else await p.locator('.rn-deck .rn-btn').click();
      if (await p.locator('.rn-fig.target').count()) await p.locator('.rn-fig.target').first().click();
      await p.waitForTimeout(80);
    }
    await p.waitForSelector('.rn-loot');
    assert.equal(await p.locator('.rn-loot .rn-card').count(), 3, '전리품 셋');
    assert(/\+\d+/.test(await p.locator('.rn-gold').innerText()), '금화가 들어온다');
    await p.locator('.rn-loot .rn-card[data-loot="1"]').click();
    await p.waitForSelector('.rn-loot .rn-card.on');
    assert.equal(await p.locator('.rn-loot .rn-card:not(:disabled)').count(), 0, '한 장만');
    assert((await p.locator('.rn-purse').innerText()).includes('13'), '덱 열셋');
    /* 이긴 뒤엔 길 화면 — 싸운 방에 서 있고, 다음은 계단 하나 */
    await p.locator('[data-next]').click(); await p.waitForSelector('.rn-plan');
    assert.equal(await p.locator('.rn-room[data-state="here"][data-kind="fight"]').count(), 1, '싸운 방에 서 있다');
    assert.equal(await p.locator('.rn-room[data-state="visited"]').count(), 2, '다녀온 방 둘');
    assert.equal(await p.locator('.rn-plan .edge.walked').count(), 1, '걸어온 길');
    assert.equal(await p.locator('.rn-next .rn-btn').count(), 1, '계단 하나');
    await p.locator('.rn-next .rn-btn[data-kind="stairs"]').click();
    await p.waitForFunction(() => /2 \/ 2/.test((document.querySelector('.rn-floor') || {}).textContent || ''));
    assert.equal(await p.locator('.rn-room[data-state="here"][data-kind="entry"]').count(), 1, '2층 들어온 자리');
    for (const k of ['shop', 'gate', 'boss']) assert.equal(await p.locator('.rn-room[data-kind="' + k + '"]').count(), 1, '2층엔 ' + k);
    assert.equal(await p.locator('.rn-room[data-kind="stairs"]').count() + await p.locator('.rn-room[data-kind="shrine"]').count(), 0, '2층엔 계단·제단이 없다');
    /* 상점 — 2층의 상점 앞으로 옮겨서 */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.gold = 300; j.party[0].hp = 3; j.party[1].cursed = true; localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await moveBefore(p, 1, 'shop', { node: 4 });
    await p.reload(); await p.waitForSelector('.rn-plan');
    await p.locator('.rn-next .rn-btn[data-kind="shop"]').click(); await p.waitForSelector('.rn-shop');
    assert.equal(await p.locator('.rn-shop .rn-ware').count(), 3, '카드 셋을 판다');
    await p.locator('[data-buy="0"]').click();
    await p.waitForFunction(() => document.querySelector('[data-buy="0"]').disabled);
    assert((await p.locator('.rn-purse').innerText()).includes('14'), '산 카드가 덱에');
    await p.locator('[data-remove]').click(); await p.waitForSelector('.rn-remove [data-deck]');
    await p.locator('.rn-remove [data-deck]:not(:disabled)').first().click();
    await p.waitForFunction(() => !document.querySelector('.rn-remove') && document.querySelector('[data-remove]').disabled);
    assert((await p.locator('.rn-purse').innerText()).includes('13'), '한 장 뺐다');
    await p.locator('[data-heal]').click(); await p.waitForFunction(() => document.querySelector('[data-heal]').disabled);
    const purify = p.locator('[data-purify]');
    assert.equal(await purify.count(), 1, '저주받은 동료에게 정화');
    await purify.click();
    await p.waitForFunction(() => !document.querySelector('[data-purify]'));
    assert.equal(await p.locator('.rn-shop .rn-fig[data-state="cursed"]').count(), 0, '저주가 풀려 그림이 기본으로');
    assert.deepEqual(a.errors, []);
    await p.locator('[data-leave]').click(); await p.waitForSelector('.rn-plan');
    assert.equal(await p.locator('.rn-room[data-state="here"][data-kind="shop"]').count(), 1, '상점을 지나 길로 — 상점 방에 서 있다');
    /* 보스 — 2층 끝. 이기면 길의 끝(동료 피를 채워 저주 물음이 안 끼게) */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.party.forEach(m => { m.hp = m.maxHp; m.offered = true; }); localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await moveBefore(p, 1, 'boss', { node: 7 });
    await p.reload(); await p.waitForSelector('.rn-plan');
    assert.equal(await p.locator('.rn-next .rn-btn.primary[data-kind="boss"]').count(), 1, '다음은 보스 하나');
    await p.locator('.rn-next .rn-btn[data-kind="boss"]').click(); await p.waitForSelector('.rn-hand .rn-card');
    assert((await p.locator('.rn-head h2').innerText()).includes('보스'), '보스 싸움');
    assert.equal(await p.locator('.rn-enemy .rn-fig').count(), 3, '보스와 곁의 둘');
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); j.battle.enemies.forEach(e => { e.hp = 1; }); j.battle.mana = 3; localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await p.reload(); await p.waitForSelector('.rn-hand .rn-card');
    for (let k = 0; k < 12 && !(await p.locator('.rn-end').count()); k++) {
      if (await p.locator('[data-answer="yes"]').count()) { await p.locator('[data-answer="yes"]').click(); continue; }
      const hit = p.locator('.rn-hand .rn-card:not(:disabled)').first();
      if (await hit.count()) await hit.click(); else await p.locator('.rn-deck .rn-btn').click();
      if (await p.locator('.rn-fig.target').count()) await p.locator('.rn-fig.target').first().click();
      await p.waitForTimeout(80);
    }
    await p.waitForSelector('.rn-end.won');
    assert.equal(await p.locator('.rn-end h2').innerText(), await p.evaluate(() => window.W('run.won.title')), '길의 끝');
    /* 새 길 → 다시 고르기 */
    await p.locator('.rn-end .rn-btn').click();
    await p.waitForSelector('.rn-pick .cell');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), []);
    /* 휴대폰 — 평면도는 옆으로 밀고 몸은 안 넘친다 */
    await p.setViewportSize(FOLD.cover);
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.rn-plan');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '휴대폰 길 화면 가로 넘침');
    assert(await p.evaluate(() => { const e = document.querySelector('.rn-plan'); return e.scrollWidth > e.clientWidth; }), '평면도는 제 칸 안에서 옆으로 민다');
    /* 버리기 → 다시 고르기 → 싸움까지 */
    await p.locator('[data-abandon]').click(); await p.waitForSelector('.rn-pick .cell');
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-pick .cell[data-name="' + n + '"]').click();
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.rn-plan');
    await moveBefore(p, 0, 'fight'); await p.reload(); await p.waitForSelector('.rn-plan');
    await p.locator('.rn-next .rn-btn').first().click();
    await p.waitForSelector('.rn-hand .rn-card');
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '휴대폰 가로 넘침');
    assert(await p.evaluate(() => { const r = document.querySelector('.rn-hand').getBoundingClientRect(); return r.top < innerHeight && r.bottom <= innerHeight + 1; }), '휴대폰도 손패가 화면 아래에 붙는다');
    /* 드래프트에서 온 출정 — 여섯 중 셋, 나머지는 예비, 상대는 넘겨받은 짝 */
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.evaluate(() => { localStorage.removeItem('myth_run_v1'); localStorage.setItem('myth_handoff_v1', JSON.stringify({ pairs: [{ w: '궁니르', o: '오딘', s: 120 }, { w: '묠니르', o: '토르', s: 118 }, { w: '아이기스', o: '아테나', s: 110 }, { w: '그람', o: '시구르드', s: 70 }, { w: '레바테인', o: '수르트', s: 68 }, { w: '흐룬팅', o: '베오울프', s: 50 }],
      foes: [{ w: '여의봉', o: '손오공' }, { w: '트리슐라', o: '시바' }], boss: { w: '케라우노스', o: '제우스' }, rank: 1 })); });
    await p.reload(); await p.waitForSelector('.rn-sortie .cell');
    assert.equal(await p.locator('.rn-sortie .cell').count(), 6, '짝 여섯');
    for (const n of ['궁니르', '묠니르', '아이기스']) await p.locator('.rn-sortie .cell[data-name="' + n + '"]').click();
    await p.locator('[data-sortie-start]').click(); await p.waitForSelector('.rn-plan');
    await moveBefore(p, 0, 'fight'); await p.reload(); await p.waitForSelector('.rn-plan');
    await p.locator('.rn-next .rn-btn').first().click(); await p.waitForSelector('.rn-hand .rn-card');
    assert.equal(await p.locator('.rn-enemy .rn-fig[data-name="여의봉"]').count(), 1, '상대는 넘겨받은 짝');
    assert((await p.locator('.rn-party').innerText()).includes('오딘'), '동료에 주인 이름');
    assert((await p.locator('.rn-reserve').innerText()).includes('그람'), '예비가 보인다');
    assert.equal(await p.evaluate(() => localStorage.getItem('myth_handoff_v1')), null, '넘겨받은 것은 한 번 쓰고 지운다');
    /* 평면도 없는 옛 저장 — 아홉 칸 줄로 그대로 간다 */
    await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('myth_run_v1')); delete j.plan; delete j.floor; delete j.room; delete j.visited; j.phase = 'map'; j.battle = null; j.node = -1; localStorage.setItem('myth_run_v1', JSON.stringify(j)); });
    await p.reload(); await p.waitForSelector('.rn-map .rn-node');
    assert.equal(await p.locator('.rn-node').count(), 9, '옛 저장은 아홉 칸');
    assert.equal(await p.locator('.rn-plan').count(), 0, '평면도는 없다');
    await p.locator('.rn-btn.primary').click(); await p.waitForSelector('.rn-hand .rn-card');
    assert.deepEqual(a.errors, []);
    await a.close();
    console.log('PASS 던전 화면: 고르기·평면도(갈림길·계단·2층)·싸움·카드·턴·저장·전리품·상점·보스·끝·휴대폰·출정·옛 저장');
  } finally { await harness.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
