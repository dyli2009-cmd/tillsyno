/* SmartMatch avlasning TEST 9.26 – passive DS/DA labels from the PDF stamp
   index. The module never reads a complete page text layer, starts OCR, or
   creates work positions. */
(function(){
 'use strict';

 const VERSION='9.26';
 const LAYER_ID='pwEquipmentSymbols';
 const STYLE_ID='smartmatch-equipment-symbols-v9-26-style';
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
 function equipmentKind(value){
  const values=(typeof value==='object'&&value?[value.subject,value.contents,value.name]:[value]).map(folded).filter(Boolean);
  if(values.some(text=>text==='da'||/(?:^|\s)dorr?automatik(?:\s|$)/.test(text)))return 'DA';
  if(values.some(text=>text==='ds'||/(?:^|\s)dorrstangare(?:\s|$)/.test(text)))return 'DS';
  return '';
 }
 function installStyle(){
  let style=document.getElementById(STYLE_ID);if(style)return style;
  style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
   .${LAYER_CLASS}{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none!important;user-select:none;-webkit-user-select:none}
   .${SYMBOL_CLASS}{position:absolute;box-sizing:border-box;display:block;min-width:1.45em;padding:0;border:0;background:transparent;color:#111;text-align:center;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-weight:900;line-height:1;letter-spacing:0;paint-order:stroke;stroke:#fff;stroke-width:1.4px;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;transform:translate(-50%,-50%);transform-origin:50% 50%;pointer-events:none!important;-webkit-text-size-adjust:none;text-size-adjust:none}
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
  const width=Math.abs(b[0]-a[0]),height=Math.abs(b[1]-a[1]);if(width<.25||height<.25)return null;
  return {left:(a[0]+b[0])/2,top:(a[1]+b[1])/2,fontSize:Math.max(5.5,Math.min(13,Math.min(width,height)*.68))};
 }
 function renderKey(pdf,page,scale,stage,canvas,count){
  return [page,scale,stage?.style?.width||'',stage?.style?.height||'',canvas?.style?.width||'',canvas?.style?.height||'',pdf?.numPages||'',count].join('|');
 }
 function stillCurrent(renderGeneration,bridge,pdf,page,scale){
  if(destroyed||renderGeneration!==generation)return false;
  try{return bridge===window.SmartMatchAppBridge&&bridge.getPdf?.()===pdf&&Number(bridge.getPage?.())===page&&Number(bridge.getScale?.())===scale}catch(_){return false}
 }
 async function refresh(options={}){
  const renderGeneration=++generation,layer=ensureLayer();if(!layer||destroyed)return 0;
  const bridge=window.SmartMatchAppBridge,reader=window.SmartMatchReadTest;let pdf,page,scale;
  try{pdf=bridge?.getPdf?.();page=Number(bridge?.getPage?.());scale=Number(bridge?.getScale?.())}catch(_){pdf=null}
  if(!pdf||!Number.isInteger(page)||page<1||!Number.isFinite(scale)||scale<=0){clearLayer(renderGeneration);return 0}
  try{if(reader?.isCardPage?.(page)){clearLayer(renderGeneration);return 0}}catch(_){clearLayer(renderGeneration);return 0}
  let index=[];try{index=await Promise.resolve(bridge?.getReadStampIndex?.()||[])}catch(error){console.warn('SmartMatch DS/DA-index kunde inte läsas.',error)}
  if(!stillCurrent(renderGeneration,bridge,pdf,page,scale))return 0;
  const symbols=(Array.isArray(index)?index:[])
   .filter(item=>Number(item?.page)===page&&String(item?.subtype||'').toLocaleLowerCase('sv')==='stamp')
   .map(item=>({item,kind:equipmentKind(item)})).filter(entry=>entry.kind);
  const stage=document.getElementById('pwStage'),canvas=document.getElementById('pwCanvas'),key=renderKey(pdf,page,scale,stage,canvas,symbols.length);
  if(!options.force&&pdf===lastRenderedPdf&&key===lastRenderKey)return layer.childElementCount;
  try{
   const pdfPage=await pdf.getPage(page);if(!stillCurrent(renderGeneration,bridge,pdf,page,scale))return 0;
   const viewport=pdfPage.getViewport({scale}),fragment=document.createDocumentFragment();let count=0;
   for(const {item,kind} of symbols){
    const placement=annotationPlacement(item,viewport);if(!placement)continue;
    const label=document.createElement('span');label.className=SYMBOL_CLASS;label.dataset.equipmentKind=kind;label.textContent=kind;
    label.style.left=placement.left+'px';label.style.top=placement.top+'px';label.style.fontSize=placement.fontSize+'px';fragment.appendChild(label);count++;
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
