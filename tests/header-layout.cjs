/* Tab changes must preserve the shared header's geometry, including native scrollbars. */
const assert=require('node:assert/strict'),{start,FOLD}=require('./browser-harness.cjs');
/* 화면이 늘면 여기 더한다. (파일, 다 그려졌다는 표시) */
const PAGES=[['dex.html','.grid .cell'],['auto.html','.at-shop'],['prompt.html','#prompt-output'],['index.html','.theme-card']];
const selectors=['.workspace-heading','.workspace-heading h1','.workspace-nav',
 '.workspace-nav a:nth-child(1)','.workspace-nav a:nth-child(2)','.workspace-nav a:nth-child(3)',
 '.workspace-nav a:nth-child(4)',
 '.appearance-controls','.appearance-controls label:first-child select','.appearance-controls label:last-child select'];
async function geometry(p){
 return p.evaluate(ss=>Object.fromEntries(ss.map(s=>{
  const e=document.querySelector(s),r=e.getBoundingClientRect();
  return [s,{x:r.x,y:r.y,width:r.width,height:r.height,visible:getComputedStyle(e).display!=='none'}];
 })),selectors);
}
function same(actual,expected,label){
 for(const s of selectors){
  assert.equal(actual[s].visible,expected[s].visible,label+' '+s+' visibility');
  if(!expected[s].visible)continue;
  // Titles have different text lengths; their starting point and line height still agree.
  for(const k of s.endsWith('h1')?['x','y','height']:['x','y','width','height'])
   assert(Math.abs(actual[s][k]-expected[s][k])<=1,`${label} ${s} ${k}: ${actual[s][k]} vs ${expected[s][k]}`);
 }
}
(async()=>{
 const h=await start();
 try{
  for(const [viewport,mobile] of [[FOLD.cover,true],[FOLD.inner,true],
   [{width:1280,height:900},false],[{width:1920,height:1080},false],[{width:882,height:344},true]]){
   const a=await h.open('index.html',{viewport,mobile}),p=a.page;
   try{
    for(const density of ['compact','relaxed']){
     await p.goto(h.base+'/index.html');await p.waitForSelector('.workspace-nav');
     await p.evaluate(d=>window.AtelierAppearance.set('density',d),density);
     const reference=await geometry(p);
     for(const [file,ready] of PAGES){
      await p.locator(`.workspace-nav a[href="${file}"]`).click();
      await p.waitForSelector(ready);
      same(await geometry(p),reference,`${viewport.width} ${density} ${file}`);
      assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'horizontal overflow');
      const scroll=p.locator(file==='dex.html'||file==='auto.html'?'.collection-scroll':'.wrap');
      assert((await scroll.boundingBox()).height>100,file+' usable scroll viewport');
      if(file==='dex.html'){
       await scroll.evaluate(e=>{e.scrollTop=300});
       await p.waitForSelector('main.dex-scrolled');
       same(await geometry(p),reference,'dex scroll keeps navigation in place');
      }
     }
    }
    /* 접기 — 제목과 테마가 숨고 항해만 남는다. 다음 화면에서도 접힌 채다. 펼치면 돌아온다 */
    await p.goto(h.base+'/index.html');await p.waitForSelector('.workspace-nav');
    const open=await geometry(p);
    await p.locator('.header-fold').click();
    await p.waitForSelector('.workspace-header.folded');
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display),'none','접으면 제목이 숨는다');
    assert.equal(await p.locator('.appearance-controls').evaluate(e=>getComputedStyle(e).display),'none','접으면 테마도 숨는다');
    assert((await p.locator('.workspace-nav').boundingBox()).y<=open['.workspace-nav'].y,'접으면 항해가 위로 온다 (낮은 화면에서는 이미 제목이 숨어 같다)');
    /* 도감은 자료를 읽은 뒤 다시 그린다 — 다 그려진 다음에 본다. 안 그러면 떨어져 나간 옛 머리를 잡는다 */
    await p.locator('.workspace-nav a[href="dex.html"]').click();await p.waitForSelector('.grid .cell');await p.waitForSelector('.workspace-header.folded');
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display),'none','다음 화면에서도 접힌 채');
    await p.locator('.header-fold').click();await p.waitForFunction(()=>!document.querySelector('.workspace-header.folded'));
    /* 낮은 화면(max-height:550)에서는 제목이 원래 숨어 있다 — 접기 전 상태로 돌아오면 된다 */
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display!=='none'),open['.workspace-heading'].visible,'펼치면 접기 전으로 돌아온다');
    assert.deepEqual(a.errors,[]);
   }finally{await a.close()}
  }
  console.log('PASS header layout: '+PAGES.length+' pages, 5 viewport sizes, both densities, stable navigation while scrolling');
 }finally{await h.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
