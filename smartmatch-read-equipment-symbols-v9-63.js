/* SmartMatch avlasning TEST 9.63 – passive, zoom-scaled DS/DA symbols from
   the prepared PDF stamp index. The module never reads a complete page text
   layer, starts OCR, or creates work positions. */
(function(){
 'use strict';

 const VERSION='9.63';
 const agent=String(navigator.userAgent||'')+' '+String(navigator.platform||'');
 const showEquipmentSymbols=/iPad|iPhone|iPod/i.test(agent)||(/Macintosh|MacIntel/i.test(agent)&&Number(navigator.maxTouchPoints)>1);
 const LAYER_ID='pwEquipmentSymbols';
 const STYLE_ID='smartmatch-equipment-symbols-v9-63-style';
 const LAYER_CLASS='smEquipmentSymbols';
 const SYMBOL_CLASS='smEquipmentSymbol';
 let generation=0,initialized=false,destroyed=false,scheduledFrame=0;
 let pageObserver=null,geometryObserver=null,lastRenderKey='',lastRenderedPdf=null;
 const frame=window.requestAnimationFrame?callback=>window.requestAnimationFrame(callback):callback=>window.setTimeout(callback,0);
 const cancelFrame=window.cancelAnimationFrame?handle=>window.cancelAnimationFrame(handle):handle=>window.clearTimeout(handle);

 function folded(value){
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLocaleLowerCase('sv').replace(/[^a-z0-9]+/g,' ').trim();
 }
 function exactEquipmentKind(value){
  const text=folded(value);
  if(text==='da'||text==='dorrautomatik')return 'DA';
  if(text==='ds'||text==='dorrstangare')return 'DS';
  return '';
 }
 function equipmentKind(value){
  if(!value||typeof value!=='object')return exactEquipmentKind(value);
  // /Subj describes the stamp type and is authoritative when present. A
  // conflicting /Contents value must never turn VCDS, DBL-DS or a linked WC
  // stamp into a second equipment symbol.
  if(folded(value.subject))return exactEquipmentKind(value.subject);
  return exactEquipmentKind(value.contentsObj?.str??value.contents);
 }
 function installStyle(){
  let style=document.getElementById(STYLE_ID);if(style)return style;
  style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
   .${LAYER_CLASS}{position:absolute;inset:0;z-index:6;overflow:hidden;pointer-events:none!important;user-select:none;-webkit-user-select:none}
   .${SYMBOL_CLASS}{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:14px;height:14px;min-width:0;min-height:0;padding:0;border:1px solid #1f2937;border-radius:2px;background:#f59e0b;color:#111;text-align:center;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:8px;font-weight:900;line-height:1;letter-spacing:0;box-shadow:0 1px 2px rgba(0,0,0,.3);transform:translate(-50%,-50%);transform-origin:50% 50%;pointer-events:none!important;-webkit-text-size-adjust:none;text-size-adjust:none}
   .${SYMBOL_CLASS}[data-equipment-kind="DA"]{background:#dc2626;color:#fff}
  `;
  (document.head||document.documentElement).appendChild(style);return style;
 }
 function ensureLayer(){
  const stage=document.getElementById('pwStage');if(!stage)return null;
  let layer=document.getElementById(LAYER_ID);if(layer&&layer.parentNode!==stage)layer.remove();
  if(!layer){layer=document.createElement('div');layer.id=LAYER_ID;layer.className=LAYER_CLASS;layer.setAttribute('aria-hidden','true');stage.appendChild(layer)}
  return layer;
 }
 function clearLayer(renderGeneration){
  if(renderGeneration!==undefined&&renderGeneration!==generation)return;
  const layer=ensureLayer();if(layer)layer.replaceChildren();lastRenderKey='';lastRenderedPdf=null;
 }
 function finite(value){const number=Number(value);return Number.isFinite(number)?number:null}
 function annotationPlacement(item,viewport){
  const rect=Array.isArray(item?.rect)?item.rect.map(finite):[];
  if(rect.length!==4||rect.some(value=>value===null))return null;
  const a=viewport.convertToViewportPoint(rect[0],rect[1]),b=viewport.convertToViewportPoint(rect[2],rect[3]);
  if(!Array.isArray(a)||!Array.isArray(b)||![...a,...b].every(Number.isFinite))return null;
  const naturalWidth=Math.abs(b[0]-a[0]),naturalHeight=Math.abs(b[1]-a[1]);if(naturalWidth<.25||naturalHeight<.25)return null;
  // Symbols shrink with the drawing and remain capped at 42 pixels when zoomed in.
  return {left:(a[0]+b[0])/2,top:(a[1]+b[1])/2,width:Math.min(42,28*viewport.scale),height:Math.min(42,28*viewport.scale),fontSize:Math.min(24,16*viewport.scale),naturalWidth,naturalHeight};
 }
 function uniqueSymbols(index,page){
  const ids=new Set(),rects=new Set(),symbols=[];
  for(const item of Array.isArray(index)?index:[]){
   if(Number(item?.page)!==page||String(item?.subtype||'').toLocaleLowerCase('sv')!=='stamp'||((Number(item?.flags)||0)&35))continue;
   const kind=equipmentKind(item);if(!kind)continue;
   const prefix=page+'|'+kind+'|',id=String(item?.id??'').trim();
   const rect=Array.isArray(item?.rect)&&item.rect.length===4&&item.rect.every(value=>Number.isFinite(Number(value)))
    ?item.rect.map(value=>Number(value).toFixed(4)).join(','):'';
   const idKey=id?prefix+'id:'+id:'',rectKey=rect?prefix+'rect:'+rect:'';
   if((idKey&&ids.has(idKey))||(rectKey&&rects.has(rectKey)))continue;
   if(idKey)ids.add(idKey);if(rectKey)rects.add(rectKey);symbols.push({item,kind});
  }
  return symbols;
 }
 function symbolSignature(symbols){
  return symbols.map(({item,kind})=>kind+':'+String(item?.id||'')+':'+(Array.isArray(item?.rect)?item.rect.join(','):'')).join(';');
 }
 function renderKey(pdf,page,scale,stage,canvas,symbols){
  return [page,scale,stage?.style?.width||'',stage?.style?.height||'',canvas?.style?.width||'',canvas?.style?.height||'',pdf?.numPages||'',symbolSignature(symbols)].join('|');
 }
 function stillCurrent(renderGeneration,bridge,pdf,page,scale){
  if(destroyed||renderGeneration!==generation)return false;
  try{return bridge===window.SmartMatchAppBridge&&bridge.getPdf?.()===pdf&&Number(bridge.getPage?.())===page&&Number(bridge.getScale?.())===scale}catch(_){return false}
 }
 async function refresh(options={}){
  const renderGeneration=++generation,layer=ensureLayer();if(!layer||destroyed)return 0;
  if(!showEquipmentSymbols){clearLayer(renderGeneration);return 0;}
  const bridge=window.SmartMatchAppBridge,reader=window.SmartMatchReadTest;let pdf,page,scale;
  try{pdf=bridge?.getPdf?.();page=Number(bridge?.getPage?.());scale=Number(bridge?.getScale?.())}catch(_){pdf=null}
  if(!pdf||!Number.isInteger(page)||page<1||!Number.isFinite(scale)||scale<=0){clearLayer(renderGeneration);return 0}
  try{if(reader?.isCardPage?.(page)){clearLayer(renderGeneration);return 0}}catch(_){clearLayer(renderGeneration);return 0}
  let index=[];try{index=await Promise.resolve(bridge?.getReadStampIndex?.()||[])}catch(error){console.warn('SmartMatch DS/DA-index kunde inte läsas.',error)}
  if(!stillCurrent(renderGeneration,bridge,pdf,page,scale))return 0;
  const symbols=uniqueSymbols(index,page);
  const stage=document.getElementById('pwStage'),canvas=document.getElementById('pwCanvas'),key=renderKey(pdf,page,scale,stage,canvas,symbols);
  if(!options.force&&pdf===lastRenderedPdf&&key===lastRenderKey)return layer.childElementCount;
  try{
   const pdfPage=await pdf.getPage(page);if(!stillCurrent(renderGeneration,bridge,pdf,page,scale))return 0;
   const viewport=pdfPage.getViewport({scale}),fragment=document.createDocumentFragment();let count=0;
   for(const {item,kind} of symbols){
    const placement=annotationPlacement(item,viewport);if(!placement||placement.width<3)continue;
    const label=document.createElement('span');label.className=SYMBOL_CLASS;label.dataset.equipmentKind=kind;label.textContent=kind;
    label.style.left=placement.left+'px';label.style.top=placement.top+'px';
    label.style.width=placement.width+'px';label.style.height=placement.height+'px';
    label.style.fontSize=placement.fontSize+'px';
    label.dataset.naturalWidth=String(Math.round(placement.naturalWidth*100)/100);
    label.dataset.naturalHeight=String(Math.round(placement.naturalHeight*100)/100);
    fragment.appendChild(label);count++;
   }
   if(!stillCurrent(renderGeneration,bridge,pdf,page,scale))return 0;
   layer.replaceChildren(fragment);lastRenderKey=key;lastRenderedPdf=pdf;return count;
  }catch(error){if(renderGeneration===generation){clearLayer(renderGeneration);console.warn('SmartMatch DS/DA-visning kunde inte uppdateras.',error)}return 0}
 }
 function schedule(){if(destroyed||scheduledFrame)return;scheduledFrame=frame(()=>{scheduledFrame=0;void refresh()})}
 function init(){
  if(initialized||destroyed)return;
  const stage=document.getElementById('pwStage'),canvas=document.getElementById('pwCanvas'),pageInfo=document.getElementById('pwPageInfo');if(!stage||!canvas||!pageInfo)return;
  initialized=true;installStyle();ensureLayer();
  if(typeof MutationObserver==='function'){
   pageObserver=new MutationObserver(schedule);pageObserver.observe(pageInfo,{childList:true,characterData:true,subtree:true});
   geometryObserver=new MutationObserver(schedule);geometryObserver.observe(stage,{attributes:true,attributeFilter:['style']});geometryObserver.observe(canvas,{attributes:true,attributeFilter:['style']});
  }
  window.addEventListener?.('resize',schedule,{passive:true});schedule();
 }
 function destroy(){
  if(destroyed)return;destroyed=true;generation++;if(scheduledFrame){cancelFrame(scheduledFrame);scheduledFrame=0}
  pageObserver?.disconnect();geometryObserver?.disconnect();pageObserver=null;geometryObserver=null;window.removeEventListener?.('resize',schedule);
  document.getElementById(LAYER_ID)?.remove();document.getElementById(STYLE_ID)?.remove();lastRenderKey='';lastRenderedPdf=null;
 }
 window.SmartMatchEquipmentSymbols=Object.freeze({version:VERSION,refresh:()=>refresh({force:true}),classify:equipmentKind,destroy});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
