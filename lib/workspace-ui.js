import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';

/* Appearance is shared between pages; generation settings are independent. */
function useAppearance() {
  const [appearance, setAppearance] = useState(() => window.AtelierAppearance.get());
  useEffect(() => {
    const sync = () => setAppearance(window.AtelierAppearance.get());
    addEventListener('atelier-appearance', sync);
    sync();
    return () => removeEventListener('atelier-appearance', sync);
  }, []);
  return appearance;
}
export function AppearanceControls() {
  const appearance = useAppearance(), W = window.W;
  return h('div', {class:'appearance-controls'},
    h('label', null, h('span', {class:'theme-dot','aria-hidden':'true'}), W('ui.theme'),
      h('select', {'aria-label':W('ui.theme'),value:appearance.theme,
        onChange:e=>window.AtelierAppearance.set('theme',e.target.value)},
        window.AtelierAppearance.themes.map(key=>h('option',{key,value:key},W('theme.' + key))))),
    h('label', null, W('ui.density'),
      h('select', {'aria-label':W('ui.density'),value:appearance.density,
        onChange:e=>window.AtelierAppearance.set('density',e.target.value)},
        ['compact','relaxed'].map(key=>h('option',{key,value:key},W('ui.density.'+key))))));
}

/* Interface vectors: eight temples, one per palette — two for each mythology.
   Paths stay data; fresh VNodes prevent stale graphics after theme changes. */
const CREST_MARK = {
  midnight: [
    ['M6 22 24 8l18 14','line'],
    ['M11 22v20M37 22v20M8 42h32','line'],
    ['m27 22-4 8h5l-4 8','signal'],
    ['M9 9a1.5 1.5 0 1 0 .1 0ZM39 6a1.5 1.5 0 1 0 .1 0Z','paint']
  ],
  daylight: [
    ['M5 18 24 7l19 11','line'],
    ['M13 20v19M24 20v19M35 20v19M8 39h32','line'],
    ['M12 17 24 10l12 7Z','primary'],
    ['M8 45q8-4 16 0t16 0','signal']
  ],
  blossom: [
    ['M6 14q18-6 36 0','signal'],
    ['M8 14h32M11 21h26','line'],
    ['M14 14v28M34 14v28','line'],
    ['m38 32 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5Z','paint']
  ],
  moss: [
    ['M24 44V20','line'],
    ['M24 27q-9-3-13-11M24 27q9-3 13-11M24 20q-5-6-3-13M24 20q5-6 3-13','line'],
    ['M13 44q5-5 11-5t11 5','signal'],
    ['M11 16a2 2 0 1 0 .1 0ZM37 16a2 2 0 1 0 .1 0ZM27 7a2 2 0 1 0 .1 0Z','paint']
  ],
  plum: [
    ['M24 40c-8 0-14-6-14-14 6 0 12 4 14 10 2-6 8-10 14-10 0 8-6 14-14 14Z','line'],
    ['M24 36c-4-4-4-12 0-16 4 4 4 12 0 16Z','primary'],
    ['M36 10a7 7 0 1 1-4-6 5 5 0 0 0 4 6Z','signal'],
    ['M9 8a1.5 1.5 0 1 0 .1 0Z','paint']
  ],
  sand: [
    ['M24 14a8 8 0 1 0 .1 0Z','primary'],
    ['M24 2v5m0 34v5M6 24h5m26 0h5M9 9l3 3m22 22 3 3M9 39l3-3m22-22 3-3','signal'],
    ['M6 44h36M10 39h28M14 34h20','line'],
    ['M24 44v-4','line']
  ],
  deep: [
    ['M24 44V14M14 12v8q10 8 20 0v-8','line'],
    ['M24 14l-3-6h6Z','primary'],
    ['M6 34q6-4 12 0t12 0 12 0','signal'],
    ['M12 42a1.5 1.5 0 1 0 .1 0ZM38 40a1.5 1.5 0 1 0 .1 0Z','paint']
  ],
  ember: [
    ['M16 14h16v22H16Z','line'],
    ['M16 22h16M16 30h16','line'],
    ['M20 8h8v6h-8ZM20 36h8v6h-8Z','primary'],
    ['M24 19c3 3 3 7 0 10-3-3-3-7 0-10Z','signal'],
    ['M9 41h4m22 0h4','paint']
  ],
  pantheon: [
    ['M8 22a16 16 0 0 1 32 0','line'],
    ['M10 22v18M19 22v18M29 22v18M38 22v18M5 40h38','line'],
    ['M24 12a2.2 2.2 0 1 0 .1 0Z','paint'],
    ['M13 9q11-8 22 0','signal'],
    ['M21 40v-8h6v8Z','primary']
  ]
};
const MARK_STYLE = {
  line:{stroke:'currentColor','stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},
  paint:{fill:'var(--signal)'},
  primary:{fill:'var(--accent)'},
  signal:{stroke:'var(--signal)','stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'},
  surface:{fill:'var(--card)',stroke:'currentColor','stroke-width':2}
};
function Crest({theme}) {
  return h('svg',{class:'crest-mark',viewBox:'0 0 48 48',fill:'none','aria-hidden':'true'},
    (CREST_MARK[theme]||CREST_MARK.daylight).map(([d,kind],i)=>h('path',{key:i,d,...MARK_STYLE[kind]})));
}
export function WorkspaceHeading({title,subtitle,code}) {
  const {theme}=useAppearance(),W=window.W;
  return h('div',{class:'workspace-heading'},
    h('div',{class:'workspace-title'},h(Crest,{theme}),
      h('div',null,h('div',{class:'eyebrow'},W('app.brand'),h('span',null,' / '+code)),
        h('h1',null,title),h('p',null,subtitle))),
    h('div',{class:'crest-signature','aria-hidden':'true'},
      h('span',{class:'crest-name'},W('theme.' + theme)),h('i'),
      h('b',null,W('workspace.signature'))));
}
/* The header folds: title block and appearance controls hide, the navigation row stays.
   The choice is a per-viewer convenience kept in this browser only — it can be missing or blocked. */
const FOLD_KEY='myth_header_fold';
function readFold(){ try { return localStorage.getItem(FOLD_KEY)==='1'; } catch(e){ return false; } }
function writeFold(v){ try { if(v) localStorage.setItem(FOLD_KEY,'1'); else localStorage.removeItem(FOLD_KEY); } catch(e){} }
/* Every page uses the same header markup and navigation order. */
export function WorkspaceHeader({page}) {
  const W=window.W;
  const [folded,setFolded]=useState(readFold);
  const toggle=()=>setFolded(v=>{ writeFold(!v); return !v; });
  const title={index:'app.title',dex:'dex.title',auto:'auto.title',run:'run.title',draft:'draft.title',prompt:'prompt.title'}[page];
  return h('div',{class:'workspace-header'+(folded?' folded':'')},
    h(WorkspaceHeading,{title:W(title),code:W('app.code'),
      subtitle:W(page==='prompt'?'prompt.subtitle':page==='run'?'run.subtitle':page==='draft'?'draft.subtitle':'app.subtitle')}),
    h('div',{class:'workspace-nav-row'},
      h('nav',{class:'workspace-nav'},['index','dex','auto','run','draft','prompt'].map(key=>
        h('a',{key,href:key+'.html','aria-current':key===page?'page':undefined},
          W('nav.'+key)))),
      h('button',{type:'button',class:'header-fold','aria-expanded':!folded,
        'aria-label':W(folded?'ui.header.unfold':'ui.header.fold'),title:W(folded?'ui.header.unfold':'ui.header.fold'),onClick:toggle},
        h('span',{'aria-hidden':'true'},folded?'▾':'▴'))),
    h(AppearanceControls));
}
export function ThemeGallery() {
  const {theme}=useAppearance(),W=window.W;
  return h('section',{'aria-label':W('home.themes')},
    h('div',{class:'theme-gallery-head'},h('h2',null,W('home.themes')),h('p',null,W('home.themes.note'))),
    h('div',{class:'theme-gallery'},window.AtelierAppearance.themes.map(key=>
      h('button',{key,type:'button',class:'theme-card','data-theme-preview':key,
        'aria-pressed':theme===key,onClick:()=>window.AtelierAppearance.set('theme',key)},
        h(Crest,{theme:key}),h('span',{class:'theme-swatches','aria-hidden':'true'},h('i'),h('i'),h('i')),
        h('span',{class:'theme-myth'},W('theme.myth.'+key)),
        h('strong',null,W('theme.' + key)),h('small',null,W('theme.note.'+key)),
        theme===key&&h('span',{class:'theme-selected','aria-hidden':'true'},'✓')))));
}
