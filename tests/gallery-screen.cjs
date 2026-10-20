/* Gallery regression: deterministic delayed art; visual review uses real registered images. */
const assert=require('node:assert/strict'),path=require('node:path');
const {start}=require('./browser-harness.cjs');
const gundam=path.basename(path.resolve(__dirname,'..'))==='atelier';
(async()=>{const h=await start();try{for(const width of [344,390,690,1440]){
 const a=await h.open('dex.html',{viewport:{width,height:width===1440?1000:844},mobile:width<720}),p=a.page;
 try{
 let release;const pending=new Promise(r=>release=r);
 await a.ctx.route(/\.(webp|png)(\?.*)?$/,async r=>{await pending;return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="100%" height="100%" fill="#67766a"/></svg>'});});
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.grid>.cell').first().waitFor();
 assert.equal(await p.locator('.gallery-intro').count(),1,'editorial list introduction');
 const cell=p.locator('.grid>.cell').first(),before=await cell.boundingBox();release();
 await p.waitForFunction(()=>{const i=document.querySelector('.grid img');return i?.complete&&i.naturalWidth>0;});
 assert.deepEqual(await cell.boundingBox(),before,'loading must reserve card geometry');
 assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'no horizontal overflow');
 if(!gundam){assert.equal(await p.locator('.dex-filters').evaluate(e=>e.open),false);await p.locator('.genre-strip button').nth(1).click();assert.equal(await p.locator('.genre-strip button').nth(1).getAttribute('aria-pressed'),'true');await p.locator('#dex-reset').click();}
 await cell.focus();await p.keyboard.press('Enter');
 const trigger=p.locator(gundam?'.sheet .art':'.big .zoom'),hero=p.locator(gundam?'.sheet .art img':'.big img');
 await hero.evaluate(i=>i.decode());const box=await hero.boundingBox();assert(box.height<=844&&box.width<=width,'hero remains a bounded image');assert.equal(await hero.evaluate(i=>getComputedStyle(i).objectFit),'contain');
 if(!gundam)assert.equal(await p.evaluate(()=>document.activeElement.id),'detail-title');
 await trigger.click();assert.equal(await p.evaluate(()=>document.activeElement.className),'zoom-close');
 for(let i=0;i<9;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('.zoom-layer')),'viewer focus trap');}
 const old=await p.locator('.zoom-layer img').getAttribute('src');await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('.zoom-layer img').getAttribute('src'),old,'next image works');
 const image=await p.locator('.zoom-layer img').boundingBox(),body=await p.locator('.zoom-body').boundingBox();assert(image.width<=body.width&&image.height<=body.height,'viewer fits image');
 const pages=p.context().pages().length;await p.locator('.zoom-open').click();assert.equal(await p.locator('.zoom-body.actual').count(),1,'원본 크기로 펼친다');assert.equal(p.context().pages().length,pages,'원본 크기는 새 창을 열지 않는다(홈 화면 앱에서 돌아올 길이 없었다)');assert.equal(await p.locator('.zoom-body.actual img').evaluate(i=>Math.round(i.getBoundingClientRect().width)===i.naturalWidth),true,'제 픽셀 크기');assert.equal(await p.locator('.zoom-open').getAttribute('aria-pressed'),'true');await p.locator('.zoom-open').click();assert.equal(await p.locator('.zoom-body.actual').count(),0,'다시 누르면 화면에 맞춘다');
 await p.keyboard.press('Escape');assert.equal(await p.locator('.zoom-layer').count(),0);assert.equal(await p.evaluate(()=>document.activeElement.className),gundam?'art':'zoom');
 await p.locator(gundam?'.sheet [data-dialog-close]':'.back').click();await p.locator('.grid>.cell').first().waitFor();assert(await p.evaluate(()=>!!document.activeElement.closest('.grid>.cell')),'return focus to selected card');
 assert.deepEqual(a.errors,[]);console.log('PASS gallery '+width);
 }finally{await a.close();}
 }}finally{await h.stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
