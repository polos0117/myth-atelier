/* Scope keyboard focus and inert siblings to the active dialog, including nested viewers. */
export function modalFocus(layer, close, fallback) {
 const previous=document.activeElement, hidden=[];
 let branch=layer;
 while(branch&&branch!==document.body){for(const sibling of branch.parentElement.children){if(sibling!==branch&&!['SCRIPT','STYLE'].includes(sibling.tagName)){hidden.push([sibling,sibling.inert]);sibling.inert=true;}}branch=branch.parentElement;}
 const items=()=>[...layer.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter(e=>!e.closest('[inert]')&&e.getClientRects().length);
 (layer.querySelector('[data-dialog-close]')||items()[0]||layer).focus({preventScroll:true});
 const key=e=>{if(layer.inert||layer.closest('[inert]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'){const list=items();e.preventDefault();const i=list.indexOf(document.activeElement);list[(i+(e.shiftKey?-1:1)+list.length)%list.length]?.focus();}};
 addEventListener('keydown',key,true);
 return()=>{removeEventListener('keydown',key,true);hidden.forEach(([el,inert])=>{el.inert=inert;});queueMicrotask(()=>{if(document.querySelector('.zoom-layer')&&!layer.classList.contains('zoom-layer'))return;const target=previous?.isConnected&&!previous.closest('[inert]')&&previous!==document.body?previous:document.querySelector(fallback);target?.focus({preventScroll:true});});};
}
