/* 집 화면의 패치 기록 단추 — 열고, 파일 그대로 읽고, 닫는다.
   화면이 읽는 것은 docs/PATCH.md 하나뿐이라 모양이 틀어지면 여기서 걸린다. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {start,FOLD}=require('./browser-harness.cjs');
const P=require('../lib/patch.js');
const log=P.parse(fs.readFileSync('docs/PATCH.md','utf8'));
(async()=>{
 const harness=await start();
 try{
  const a=await harness.open('index.html',{viewport:{width:1280,height:900}}),p=a.page;
  await p.waitForSelector('.patch-open');
  assert.equal(await p.locator('.patch-panel').count(),0,'닫혀 있으면 칸이 없다');

  await p.locator('.patch-open').click();
  await p.waitForSelector('.patch-entry');
  assert.equal(await p.locator('.patch-open').count(),0,'열면 단추가 칸으로 바뀐다');
  assert.equal(await p.locator('.patch-entry').count(),log.length,'파일의 칸 수와 같다');

  /* 맨 위가 가장 새 것 — 날짜·누가·제목·줄이 그대로 보인다 */
  const first=p.locator('.patch-entry').first();
  assert.equal((await first.locator('.patch-when span').first().innerText()).trim(),log[0].date);
  assert.equal((await first.locator('.patch-who').innerText()).trim(),log[0].who);
  assert.equal((await first.locator('strong').innerText()).trim(),log[0].title);
  assert.equal(await first.locator('ul li').count(),log[0].items.length);
  assert.equal((await first.locator('ul li').first().innerText()).trim(),log[0].items[0]);

  await p.locator('.patch-close').click();
  await p.waitForSelector('.patch-open');
  assert.equal(await p.locator('.patch-panel').count(),0,'닫으면 사라진다');

  /* 휴대폰에서도 열리고 가로로 넘치지 않는다 */
  await p.setViewportSize(FOLD.inner);
  await p.locator('.patch-open').click();
  await p.waitForSelector('.patch-entry');
  assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'가로로 넘친다');
  assert((await p.locator('.patch-panel').boundingBox()).height>60,'칸이 너무 낮다');

  assert.deepEqual(a.errors,[]);
  assert.deepEqual(await p.evaluate(()=>window.AtelierWords.missing()),[],'낱말 표에 없는 열쇠');
  await a.close();
  console.log('PASS 패치 화면: 열기·칸 '+log.length+'·맨 위 내용·닫기·휴대폰');
 } finally { await harness.stop(); }
})().catch(e=>{console.error(e);process.exit(1)});
