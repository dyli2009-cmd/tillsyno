/* Position-local revisions. The shared source card and its responsibility
 * columns stay untouched; the existing position payload owns these records. */
(function(root){
 'use strict';
 const COLORS={amber:'#a65b00',red:'#b42336',blue:'#2368b2'};
 const copy=value=>JSON.parse(JSON.stringify(value));
 function holder(o,item,create=false){
  if(!o||!item?.key)return null;
  if(item.source==='custom')return (o.customItems||[]).find(row=>row.id===item.key)||null;
  if(create)o.overrides=o.overrides||{};
  if(create)o.overrides[item.key]=o.overrides[item.key]||{};
  return o.overrides?.[item.key]||null;
 }
 function changeFor(o,item){return holder(o,item)?.positionChange||null;}
 function isExcluded(o,item){const change=changeFor(o,item);return !!(change?.excluded&&!change.restoredAt);}
 function entries(o){
  const base=Object.entries(o?.overrides||{}).filter(([,row])=>row?.positionChange).map(([key,row])=>({key,source:'base',...row.positionChange}));
  const custom=(o?.customItems||[]).filter(row=>row.positionChange).map(row=>({key:row.id,source:'custom',...row.positionChange}));
  return [...base,...custom];
 }
 function active(o){return entries(o).filter(change=>!change.restoredAt);}
 function set(o,item,values,now=new Date().toISOString()){
  const note=String(values.note||'').trim();
  if(!note)throw Error('Skriv vad som har ändrats för den här positionen.');
  if(note.length>2000)throw Error('Noteringen får innehålla högst 2 000 tecken.');
  const target=holder(o,item,true);if(!target)throw Error('Produktraden finns inte kvar.');
  const previous=target.positionChange;
  target.positionChange={label:String(item.label||previous?.label||''),value:String(item.value||previous?.value||''),
   sourceIdentity:String(item.sourceIdentity||previous?.sourceIdentity||''),section:String(item.section||previous?.section||''),
   responsibility:String(item.responsibility||previous?.responsibility||''),excluded:!!values.excluded,
   color:Object.hasOwn(COLORS,values.color)?values.color:'amber',note,
   createdAt:previous?.createdAt||now,updatedAt:now,restoredAt:null};
  // An excluded task must not keep a completion or installation stage that
  // could silently return as completed when the product is restored.
  if(values.excluded){if(o.checks)delete o.checks[item.key];if(o.rowStages)delete o.rowStages[item.key];}
  return copy(target.positionChange);
 }
 function restore(o,item,now=new Date().toISOString()){
  const target=holder(o,item);if(!target?.positionChange)return false;
  target.positionChange={...target.positionChange,restoredAt:now,updatedAt:now};
  return true;
 }
 function inventoryChange(o,product,products=[]){
  const changes=active(o),identity=String(product?.sourceIdentity||'');
  if(identity)return changes.find(change=>change.sourceIdentity===identity)||null;
  // Do not guess between two identical products on different physical rows.
  const same=other=>other.label===product?.label&&other.value===product?.value&&(other.section||'')===(product?.section||'');
  if(products.filter(same).length>1)return null;
  const matches=changes.filter(same);
  return matches.length===1?matches[0]:null;
 }
 function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function button(text,handler){const node=element('button','',text);node.type='button';node.onclick=handler;return node;}
 function itemTitle(item){return [item.label,item.value].filter(Boolean).join(' · ')||'Produkt';}
 function showEditor(o,item,host,exclude=true){
  if(host.querySelector('.pwPositionChangeEditor'))return;
  const current=changeFor(o,item),form=element('form','pwPositionChangeEditor');
  form.setAttribute('aria-label','Ändring för denna position');
  form.append(element('strong','',itemTitle(item)),element('small','','Gäller bara '+(o.drawingLabel||o.code)+' · position '+o.position+'.'));
  const excludedLabel=element('label','pwPositionChangeToggle'),excluded=element('input');excluded.type='checkbox';excluded.checked=current&&!current.restoredAt?!!current.excluded:exclude;
  excludedLabel.append(excluded,document.createTextNode('Utgår – ingen kontrollpunkt, mängd eller tid'));
  const noteLabel=element('label','','Ändring / beställarens besked'),note=element('textarea');note.rows=3;note.maxLength=2000;note.required=true;note.value=current?.note||'';note.placeholder='Exempel: Dörrautomatik utgår enligt beställaren.';noteLabel.append(note);
  const colorLabel=element('label','','Flaggans färg'),color=element('select');
  for(const [key,label] of [['amber','Orange'],['red','Röd'],['blue','Blå']]){const option=element('option','',label);option.value=key;color.append(option);}
  color.value=current?.color||'amber';colorLabel.append(color);
  const error=element('p','pwPositionChangeError');error.setAttribute('role','alert');
  const actions=element('div','pwPositionChangeActions'),cancel=button('Avbryt',()=>form.remove()),save=element('button','','Spara ändring');save.type='submit';actions.append(cancel,save);
  form.append(excludedLabel,noteLabel,colorLabel,error,actions);
  form.addEventListener('click',event=>event.stopPropagation());
  form.onsubmit=async event=>{event.preventDefault();event.stopPropagation();save.disabled=true;cancel.disabled=true;
   try{await root.SmartMatchAppBridge.setPositionChange(o,item,{excluded:excluded.checked,note:note.value,color:color.value});form.remove();}
   catch(err){error.textContent=err.message||String(err);save.disabled=false;cancel.disabled=false;}
  };
  host.append(form);note.focus();
 }
 function appendAction(o,item,actions,host){
  if(item.kind==='extra-time')return;
  const action=button('× / ⚑',()=>showEditor(o,item,host));action.className='pwPositionChangeButton';action.title='Markera produkten som utgående eller flagga en ändring för bara denna position';action.setAttribute('aria-label','Ändring: '+itemTitle(item));actions.append(action);
 }
 function render(o){
  const rootNode=document.getElementById('pwPositionChanges');if(!rootNode)return;
  rootNode.replaceChildren();const changes=entries(o);rootNode.hidden=!changes.length;if(!changes.length)return;
  rootNode.append(element('strong','','Ändringar · bara denna position'));
  for(const change of changes){
   const row=element('article','pwPositionChange'+(change.restoredAt?' restored':change.excluded?' excluded':''));
   row.dataset.changeKey=change.key;row.style.setProperty('--change-color',COLORS[change.color]||COLORS.amber);
   row.append(element('strong','pwPositionChangeTitle',(change.restoredAt?'Återställd: ':change.excluded?'× Utgår: ':'⚑ Ändring: ')+itemTitle(change)),element('p','',change.note));
   row.append(element('small','',change.restoredAt?'Ändringen har återställts.':change.excluded?'Räknas inte i kontrollpunkter, materialmängd eller tid.':'Produkten är kvar i kontrollpunkter, materialmängd och tid.'));
   const actions=element('div','pwPositionChangeActions');actions.append(button('Ändra',()=>showEditor(o,change,row,change.excluded)));
   if(!change.restoredAt)actions.append(button(change.excluded?'Återställ produkt':'Avsluta flagga',async()=>{
    try{await root.SmartMatchAppBridge.restorePositionChange(o,change);}catch(err){root.SmartMatchAppBridge.setStatus(err.message||String(err));}
   }));
   row.append(actions);rootNode.append(row);
  }
 }
 function decorateMarker(marker,o){
  const changes=active(o);if(!changes.length)return;
  const badge=element('span','pwPositionChangeBadge','⚑');badge.style.setProperty('--change-color',COLORS[changes[0].color]||COLORS.amber);badge.setAttribute('aria-hidden','true');marker.append(badge);
  marker.title+=' · '+changes.map(change=>(change.excluded?'Utgår: ':'Ändring: ')+itemTitle(change)+' – '+change.note).join(' · ');marker.setAttribute('aria-label',marker.title);
 }
 const api=Object.freeze({COLORS,changeFor,isExcluded,entries,active,set,restore,inventoryChange,showEditor,appendAction,render,decorateMarker});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.SmartMatchPositionChanges=api;
})(typeof window!=='undefined'?window:globalThis);
