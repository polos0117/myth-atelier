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

/* Native interface vectors: a capture ball and seven field/type motifs.
   Paths stay data; fresh VNodes prevent stale graphics after theme changes. */
const CREST_MARK = {
  midnight: [
    ['M30 6a18 18 0 1 0 12 25A17 17 0 0 1 30 6Z','line'],
    ['m35 9 1.5 4.5L41 15l-4.5 1.5L35 21l-1.5-4.5L29 15l4.5-1.5Z','paint'],
    ['M11 30h11m-7 6h10','signal']
  ],
  daylight: [
    ['M6 24a18 18 0 0 1 36 0Z','primary'],
    ['M42 24a18 18 0 1 1-36 0 18 18 0 1 1 36 0Z','line'],
    ['M6 24h12m12 0h12','line'],
    ['M30 24a6 6 0 1 1-12 0 6 6 0 1 1 12 0Z','surface']
  ],
  blossom: [
    ['m24 5 5 13 13 6-13 5-5 14-5-14L6 24l13-6Z','line'],
    ['m36 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z','paint'],
    ['M11 37h4m-2-2v4','signal']
  ],
  moss: [
    ['M9 37C3 18 17 6 40 8c1 22-11 35-31 29Z','line'],
    ['M8 41 32 17m-16 16V22m6 5h11','signal'],
    ['M17 13c5-3 11-4 17-3','line']
  ],
  plum: [
    ['M9 39V23a15 15 0 0 1 30 0v16l-8-4-7 5-7-5Z','line'],
    ['M18 21v6m12-6v6','signal'],
    ['M21 31q3 3 6 0','line'],
    ['m40 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z','paint']
  ],
  sand: [
    ['M27 4 10 27h12l-2 17 18-25H26Z','primary'],
    ['M27 4 10 27h12l-2 17 18-25H26Z','line'],
    ['M7 10 4 6m35 32 5 4','signal']
  ],
  deep: [
    ['M24 5C18 14 9 22 9 30a15 15 0 0 0 30 0c0-8-9-16-15-25Z','line'],
    ['M10 30q7-6 14 0t14 0','signal'],
    ['M16 34q2 4 6 4','line']
  ],
  ember: [
    ['M27 4c2 12-9 12-7 23 5-2 8-5 9-9 9 9 13 19 3 25-5 3-16 2-20-3C3 28 15 21 15 15c1 7 5 6 7 1Z','line'],
    ['M25 28c-1 6-8 8-5 13 2 3 7 2 9 0 4-5-1-9-4-13Z','paint'],
    ['M38 9v5m-2-3h4','signal']
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
const FOLD_KEY='pkm_header_fold';
function readFold(){ try { return localStorage.getItem(FOLD_KEY)==='1'; } catch(e){ return false; } }
function writeFold(v){ try { if(v) localStorage.setItem(FOLD_KEY,'1'); else localStorage.removeItem(FOLD_KEY); } catch(e){} }
/* Every page uses the same header markup and navigation order. */
export function WorkspaceHeader({page}) {
  const W=window.W;
  const [folded,setFolded]=useState(readFold);
  const toggle=()=>setFolded(v=>{ writeFold(!v); return !v; });
  const title={index:'app.title',dex:'dex.title',prompt:'prompt.title',battle:'battle.title',run:'run.title',survey:'survey.title'}[page];
  return h('div',{class:'workspace-header'+(folded?' folded':'')},
    h(WorkspaceHeading,{title:W(title),code:W('app.code'),
      subtitle:W(page==='prompt'?'prompt.subtitle':'app.subtitle')}),
    h('div',{class:'workspace-nav-row'},
      h('nav',{class:'workspace-nav'},['index','dex','prompt','battle','run','survey'].map(key=>
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
