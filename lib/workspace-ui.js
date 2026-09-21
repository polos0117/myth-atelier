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

/* Interface vectors: eight weapon motifs, one per palette.
   Paths stay data; fresh VNodes prevent stale graphics after theme changes. */
const CREST_MARK = {
  midnight: [
    ['M13 10h22v11H13Z','line'],
    ['M24 21v22','line'],
    ['m36 4-3 6h4l-3 6','signal'],
    ['M8 30h3m-5 6h3','paint']
  ],
  daylight: [
    ['M24 4v29','line'],
    ['M14 30h20','line'],
    ['M24 33v10','line'],
    ['M24 4 20 10h8Z','primary'],
    ['M9 12a15 15 0 0 1 30 0','signal']
  ],
  blossom: [
    ['M13 6q22 18 0 36','line'],
    ['M13 6v36','signal'],
    ['M8 24h34','line'],
    ['m42 24-6-4v8Z','primary'],
    ['m28 8 1.5 3 3 1.5-3 1.5L28 17l-1.5-3-3-1.5 3-1.5Z','paint']
  ],
  moss: [
    ['M24 44V14','line'],
    ['M13 6v10q11 8 22 0V6','line'],
    ['M24 5v11','line'],
    ['M13 6 11 2m26 4 2-4','signal'],
    ['M18 30h12','paint']
  ],
  plum: [
    ['M24 9a15 15 0 1 0 .1 0Z','line'],
    ['M24 17a7 7 0 1 0 .1 0Z','signal'],
    ['M24 3v6m0 30v6M3 24h6m30 0h6','line'],
    ['m9 9 4 4m22 22 4 4M9 39l4-4m22-22 4-4','paint']
  ],
  sand: [
    ['M18 44 30 8','line'],
    ['M30 8c12 4 12 16 4 22-2-8-6-14-10-16Z','primary'],
    ['M30 8c12 4 12 16 4 22-2-8-6-14-10-16Z','line'],
    ['M8 12h5m-7 6h4','signal']
  ],
  deep: [
    ['M24 4 40 10v12c0 10-7 17-16 21C15 39 8 32 8 22V10Z','line'],
    ['M15 23q9-8 18 0','signal'],
    ['M24 21a3 3 0 1 0 .1 0Z','paint'],
    ['M24 4v39','line']
  ],
  ember: [
    ['M26 4c1 9-8 11-6 20 4-2 6-5 7-8 6 7 9 15 2 20-4 3-13 2-16-2-6-8 3-13 4-18 1 5 4 5 6 1Z','line'],
    ['M9 41h30','signal'],
    ['M11 36h10l3 5H11Z','primary'],
    ['M38 8v6m-3-3h6','paint']
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
  const title={index:'app.title',dex:'dex.title',auto:'auto.title',prompt:'prompt.title'}[page];
  return h('div',{class:'workspace-header'+(folded?' folded':'')},
    h(WorkspaceHeading,{title:W(title),code:W('app.code'),
      subtitle:W(page==='prompt'?'prompt.subtitle':'app.subtitle')}),
    h('div',{class:'workspace-nav-row'},
      h('nav',{class:'workspace-nav'},['index','dex','auto','prompt'].map(key=>
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
        h('strong',null,W('theme.' + key)),h('small',null,W('theme.note.'+key)),
        theme===key&&h('span',{class:'theme-selected','aria-hidden':'true'},'✓')))));
}
