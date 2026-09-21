const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('lib/workspace-theme.js','utf8');
const css=fs.readFileSync('lib/workspace.css','utf8'),ui=fs.readFileSync('lib/workspace-ui.js','utf8');
const stored=new Map(),events=new Map(),viewportEvents=new Map(),properties=new Map(),frames=[];
const meta={content:''},root={dataset:{},style:{setProperty:(k,v)=>properties.set(k,v)}};
const window={innerHeight:800,visualViewport:{height:704,addEventListener:(k,v)=>viewportEvents.set(k,v)},
 addEventListener:(k,v)=>events.set(k,v),dispatchEvent(){}};
vm.runInNewContext(source,{window,document:{documentElement:root,querySelector:()=>meta},
 localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
 requestAnimationFrame:fn=>{frames.push(fn);return frames.length},cancelAnimationFrame(){},Event:function(){}});
while(frames.length)frames.shift()();
assert.equal(root.dataset.theme,'daylight','new visitors start in the Pokemon laboratory');
assert.equal(properties.get('--atelier-vh'),'704px');
const themes=['midnight','daylight','blossom','moss','plum','sand','deep','ember'];
assert.deepEqual(Array.from(window.AtelierAppearance.themes),themes,'saved theme keys stay stable');
for(const key of themes){
 window.AtelierAppearance.set('theme',key);
 assert.equal(root.dataset.theme,key);
 assert.equal(stored.get('atelier_theme_v1'),key);
 const block=css.match(new RegExp(':root\\[data-theme="'+key+'"\\][^{]*\\{([^}]+)\\}'));
 assert(block,key+' palette');
 assert.equal(meta.content,block[1].match(/--deck:(#[0-9a-f]{6})/)[1],key+' browser chrome');
 assert(ui.includes("W('theme.' +"),'theme names must come from words');
 assert(css.includes('[data-theme-preview="'+key+'"]'),key+' palette preview');
}
window.AtelierAppearance.set('theme','unknown');
assert.equal(root.dataset.theme,'daylight');
window.AtelierAppearance.set('density','relaxed');
assert.equal(root.dataset.density,'relaxed');
window.AtelierAppearance.set('density','unknown');
assert.equal(root.dataset.density,'compact');
stored.set('atelier_theme_v1','plum');events.get('storage')({key:'atelier_theme_v1'});
assert.equal(root.dataset.theme,'plum','cross-tab preference survives');
const marks=ui.slice(ui.indexOf('const CREST_MARK'),ui.indexOf('const MARK_STYLE'));
const shapes=[...marks.matchAll(/  (\w+): \[([\s\S]*?)\n  \]/g)].map(m=>m[2]);
assert.equal(shapes.length,8);
assert.equal(new Set(shapes).size,8,'eight distinct motifs');
assert(!/#[0-9a-f]{3,6}/i.test(marks),'motifs inherit palette colors');
assert(!/지구연방|네오지온|소레스탈|철화단|모노아이|CREATIVE DECK/.test(ui));
assert(!css.includes("content:'DAYLIGHT"),'theme labels are not CSS content');
assert(ui.includes("W('workspace.signature')"));
assert(viewportEvents.has('resize'));assert(events.has('storage'));
console.log('PASS: 8 Pokemon themes, persistent keys, palette previews, browser chrome and viewport sizing');
