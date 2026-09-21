/* Shared themes across the armory home, codex, auto battler and prompt studio. */
const assert=require('node:assert/strict'),{start,FOLD}=require('./browser-harness.cjs');
const luminance=hex=>{
 const c=hex.trim().slice(1).match(/../g).map(x=>parseInt(x,16)/255)
  .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
 const harness=await start();
 try{
  const a=await harness.open('index.html',{viewport:{width:1280,height:900}});
  const p=a.page;
  await p.waitForSelector('.theme-card');
  assert.equal(await p.locator('.theme-card').count(),8);
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'daylight');
  const keys=await p.evaluate(()=>window.AtelierAppearance.themes);
  const marks=new Set(),backgrounds=new Set();
  for(const key of keys){
   await p.locator('[data-theme-preview="'+key+'"]').click();
   await p.waitForFunction(k=>document.documentElement.dataset.theme===k,key);
   assert.equal(await p.locator('.theme-card[aria-pressed="true"]').getAttribute('data-theme-preview'),key);
   const colors=await p.evaluate(()=>{
    const s=getComputedStyle(document.documentElement),out={};
    for(const k of ['bg','card','card2','text','muted','accent','accent-soft','on-accent','deck'])out[k]=s.getPropertyValue('--'+k).trim();
    return out;
   });
   for(const [fg,bg] of [['text','bg'],['text','card'],['muted','bg'],['muted','card2'],['accent','accent-soft'],['on-accent','accent']])
    assert(contrast(colors[fg],colors[bg])>=4.5,key+' '+fg+'/'+bg+': '+contrast(colors[fg],colors[bg]));
   assert.equal(await p.locator('meta[name="theme-color"]').getAttribute('content'),colors.deck);
   assert.equal(await p.locator('.crest-name').innerText(),await p.evaluate(k=>window.W('theme.'+k),key));
   backgrounds.add(colors.bg);
   marks.add(await p.locator('.workspace-title svg').innerHTML());
  }
  assert.equal(backgrounds.size,8);assert.equal(marks.size,8);
  /* 화면이 늘면 여기 더한다 */
  for(const [page,selector] of [['dex.html','.grid .cell'],['auto.html','.at-shop'],['prompt.html','#prompt-output'],['index.html','.theme-card']]){
   await p.goto(harness.base+'/'+page);await p.waitForSelector(selector);
   const nav=await p.locator('.workspace-nav a').evaluateAll(es=>es.map(e=>({
    href:e.getAttribute('href'),current:e.getAttribute('aria-current'),decoration:getComputedStyle(e).textDecorationLine
   })));
   assert.deepEqual(nav.map(x=>x.href),['index.html','dex.html','auto.html','prompt.html'],page+' common navigation');
   assert.deepEqual(nav.filter(x=>x.current==='page').map(x=>x.href),[page],page+' selected tab');
   assert(nav.every(x=>x.decoration==='none'),page+' navigation underlines');
   assert(await p.evaluate(()=>{
    const heading=document.querySelector('.workspace-heading'),nav=document.querySelector('.workspace-nav'),
     controls=document.querySelector('.appearance-controls');
    return !!(heading.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_FOLLOWING)&&
     !!(nav.compareDocumentPosition(controls)&Node.DOCUMENT_POSITION_FOLLOWING);
   }),page+' heading, navigation, appearance order');
   assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'ember','theme follows navigation');
   const before=page==='prompt.html'?await p.locator('#prompt-output').inputValue():null;
   for(const key of keys){
    await p.getByLabel('테마',{exact:true}).selectOption(key);
    assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),key);
    if(before)assert.equal(await p.locator('#prompt-output').inputValue(),before,'appearance never changes the prompt');
   }
   for(const viewport of [FOLD.cover,FOLD.inner,{width:1280,height:900}]){
    await p.setViewportSize(viewport);
    const size=await p.evaluate(()=>({
     body:document.body.scrollWidth,width:innerWidth,
     scroll:(document.querySelector('.collection-scroll')||document.querySelector('.wrap')).clientHeight
    }));
    assert(size.body<=size.width+1,page+' horizontal overflow: '+JSON.stringify(size));
    assert(size.scroll>100,page+' scroll area collapsed');
    const theme=await p.getByLabel('테마',{exact:true}).boundingBox();
    assert(theme.x>=0&&theme.x+theme.width<=viewport.width+1,page+' theme selector clipped');
   }
  }
  assert.deepEqual(a.errors,[]);
  assert.deepEqual(await p.evaluate(()=>window.AtelierWords.missing()),[]);
  await a.close();
  console.log('PASS theme screens: 8 palettes and motifs, AA text contrast, persisted navigation, unchanged prompts, 3 viewports');
 }finally{await harness.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
