(function(){
'use strict';
const labels=['Riskanalys','Beskrivning av maskin','Loggbok','Tillverkarens försäkran','Egenkontroll'];
const prior=new Map(),candidate=new Map(),$=x=>document.getElementById(x);
const mb=x=>(x/1048576).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})+' MB';
const name=x=>x==='Tillverkarens försäkran'?'EG-försäkran':x;
const source=x=>window.TillsynoCETest.assets().templates[x];
function fields(doc){
 if(!doc.catalog.get(PDFLib.PDFName.of('AcroForm')))return [];
 return doc.getForm().getFields().map(f=>{
  let val='';try{
   if(f instanceof PDFLib.PDFTextField)val=f.getText();
   else if(f instanceof PDFLib.PDFCheckBox)val=String(f.isChecked());
   else if(f instanceof PDFLib.PDFRadioGroup)val=f.getSelected();
   else if(f instanceof PDFLib.PDFDropdown)val=String(f.getSelected());
  }catch(_){}
  return [f.getName(),f.constructor.name,val];
 });
}
function signed(doc){
 if(!doc.catalog.get(PDFLib.PDFName.of('AcroForm')))return false;
 return doc.getForm().getFields().some(f=>f instanceof PDFLib.PDFSignature&&!!f.acroField.dict.get(PDFLib.PDFName.of('V')));
}
function identical(a,b){
 if(!a||!b||a.length!==b.length)return false;
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
 return true;
}
function usesRef(obj,ids,seen=new Set()){
 if(!obj||typeof obj!=='object')return false;
 if(obj instanceof PDFLib.PDFRef)return ids.has(obj.toString());
 if(seen.has(obj))return false;
 seen.add(obj);
 if(obj instanceof PDFLib.PDFDict)return obj.keys().some(k=>usesRef(obj.get(k),ids,seen));
 if(obj instanceof PDFLib.PDFArray){
  for(let i=0;i<obj.size();i++)if(usesRef(obj.get(i),ids,seen))return true;
 }
 if(obj instanceof PDFLib.PDFRawStream)return usesRef(obj.dict,ids,seen);
 return false;
}
async function optimize(bytes){
 const doc=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 if(signed(doc))throw Error('Digitalt signerade mallar optimeras inte.');
 const n=doc.getPageCount(),before=JSON.stringify(fields(doc)),ctx=doc.context;
 const banks=new Map(),updates=[],unused=new Set();
 for(const [_,dict]of ctx.enumerateIndirectObjects()){
  if(!(dict instanceof PDFLib.PDFDict))continue;
  for(const tag of ['FontFile','FontFile2','FontFile3']){
   const key=PDFLib.PDFName.of(tag),ref=dict.get(key);
   if(!(ref instanceof PDFLib.PDFRef))continue;
   const stream=ctx.lookup(ref);
   if(!(stream instanceof PDFLib.PDFRawStream)||!stream.contents?.length)continue;
   const signature=tag+'|'+stream.contents.length+'|'+JSON.stringify(
     stream.dict.keys().map(k=>[k.toString(),stream.dict.get(k)?.toString()||''])
       .filter(x=>x[0]!=='/Length').sort((a,b)=>a[0].localeCompare(b[0])));
   if(!banks.has(signature))banks.set(signature,[]);
   const group=banks.get(signature);
   const prev=group.find(x=>identical(x.data,stream.contents));
   if(prev&&prev.ref.toString()!==ref.toString()){
    updates.push({dict,key,ref:prev.ref});unused.add(ref.toString());
   }else if(!prev)group.push({ref,data:stream.contents});
  }
 }
 if(!unused.size)return {reason:'Inga dubbla typsnitt att ta bort.'};
 updates.forEach(x=>x.dict.set(x.key,x.ref));
 for(const [ref,obj]of ctx.enumerateIndirectObjects())
  if(!unused.has(ref.toString())&&usesRef(obj,unused))throw Error('Mallen har ytterligare referenser; originalet behålls.');
 for(const [ref]of ctx.enumerateIndirectObjects())if(unused.has(ref.toString()))ctx.delete(ref);
 const out=new Uint8Array(await doc.save({useObjectStreams:true,updateFieldAppearances:false}));
 const checked=await PDFLib.PDFDocument.load(out.slice(),{ignoreEncryption:true,updateMetadata:false});
 if(checked.getPageCount()!==n||JSON.stringify(fields(checked))!==before)
  throw Error('Formulärkontrollen misslyckades. Originalet behålls.');
 if(out.length>=bytes.length-1024)return {reason:'Ingen märkbar filminskning.'};
 return {bytes:out,removed:unused.size};
}
function preview(bytes,filename){
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const tab=window.open(url,'_blank');
 if(!tab){const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();}
 setTimeout(()=>URL.revokeObjectURL(url),90000);
}
function setup(){
 let dialog=$('ceOptimizer');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='ceOptimizer';
 dialog.innerHTML='<header><strong>Optimera PDF-mallar</strong><button id="ceOptimizerClose" type="button">Stäng ×</button></header><main><p>En gemensam PDF-mall används av alla dörrar. Du väljer själv om någon mall ska bytas. Egna produktlistor och CE-foton förändras inte.</p><div class="ceOptBulk"><button id="ceOptTestAll" type="button">Testa alla 5 mallar</button><button id="ceOptApplyAll" type="button" disabled>Använd optimerade mallar</button><button id="ceOptCheckEmail" type="button">Beräkna projekt-PDF för mejl</button></div><p id="ceOptBulkStatus" role="status" aria-live="polite">Inget ändras förrän du godkänner.</p><div id="ceOptimizerRows"></div><p>Du kan förhandsgranska varje testfil. Därefter sparar eller skickar du projekt-PDF som vanligt. ZIP har en separat slutlig storlek efter komprimering.</p></main>';
 document.body.append(dialog);$('ceOptimizerClose').onclick=()=>dialog.close();
 $('ceOptTestAll').onclick=()=>void testAll();
 $('ceOptApplyAll').onclick=()=>void applyAll();
 $('ceOptCheckEmail').onclick=()=>void checkEmailSize();
 const st=document.createElement('style');st.textContent='#ceOptimizer{width:min(600px,96vw);max-height:92dvh;padding:0;border:1px solid #a3bbcb;border-radius:12px;background:#f7fbfe;color:#163a51}#ceOptimizer::backdrop{background:#0d2a409c}#ceOptimizer header{background:#173b54;color:white;padding:14px;display:flex;align-items:center;justify-content:space-between}#ceOptimizer header button{background:#e9f4fa;border:0;border-radius:7px;padding:8px;min-height:40px}#ceOptimizer main{padding:14px;max-height:calc(92dvh - 64px);overflow:auto}#ceOptimizer p{font-size:12px;line-height:1.5;margin:0 0 12px}#ceOptimizer section{background:white;border:1px solid #c2d7e3;border-radius:9px;padding:10px;margin:0 0 9px}#ceOptimizer section strong{font-size:13px}#ceOptimizer section small{display:block;color:#456577;font-size:12px;margin:6px 0}#ceOptimizer section div{display:flex;flex-wrap:wrap;gap:5px}#ceOptimizer section button{font-size:12px;min-height:39px;border:1px solid #a2bfce;border-radius:7px;background:#e8f2f9;color:#123e57;padding:6px 10px;font-weight:600}#ceOptimizer section button:disabled{opacity:.45}#ceOptimizer section button.ceOptAccept{background:#ddf0e2;color:#215d3b;border-color:#9dc9ad}#ceOptimizer section button.ceOptUndo{background:#fff2e6;color:#87501f}';
 st.textContent+='#ceOptimizer .ceOptBulk{display:flex;flex-wrap:wrap;gap:7px;margin:5px 0 10px}#ceOptimizer .ceOptBulk button{min-height:42px;background:#e7f2fa;border:1px solid #91b7c9;border-radius:8px;color:#173e54;font-weight:700;font-size:12px;padding:8px 10px}#ceOptimizer .ceOptBulk button:disabled{opacity:.43}#ceOptimizer #ceOptBulkStatus{color:#275770;font-size:12px;background:#eaf4f9;border-radius:8px;padding:9px 10px;margin-bottom:12px}';
 document.head.append(st);return dialog;
}
function makeRow(cat){
 const section=document.createElement('section'),heading=document.createElement('strong');
 heading.textContent=name(cat);section.append(heading);
 const size=document.createElement('small'),status=document.createElement('small');
 status.setAttribute('role','status');section.append(size,status);
 const buttons=document.createElement('div');section.append(buttons);
 const button=(label,handler,css)=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(css)b.className=css;b.onclick=handler;buttons.append(b);return b;};
 const orig=button('Visa original',()=>preview(prior.get(cat)||source(cat),'Original-'+name(cat)+'.pdf'));
 const test=button('Testa optimering',async()=>{
  const original=source(cat);if(!original)return;
  [...buttons.children].forEach(b=>b.disabled=true);candidate.delete(cat);
  status.textContent='Kontrollerar dubbla typsnitt…';
  try{
   const result=await optimize(original);
   if(source(cat)!==original)throw Error('Mallen ändrades. Starta om testet.');
   if(!result.bytes){status.textContent=result.reason;return;}
   candidate.set(cat,{original,optimized:result.bytes});
   status.textContent=mb(original.length)+' → '+mb(result.bytes.length)+' (sparar '+mb(original.length-result.bytes.length)+'). '+result.removed+' dubbla typsnitt borttagna. Visa testfilen innan godkännande.';
   show.disabled=false;apply.disabled=false;
  }catch(err){status.textContent='Test avbrutet: '+err.message;}
  finally{orig.disabled=false;test.disabled=false;undo.disabled=!prior.has(cat);}
 });
 const show=button('Visa testfil',()=>preview(candidate.get(cat).optimized,'Optimerad-'+name(cat)+'.pdf'));
 const apply=button('Använd optimerad',async()=>{
  const data=candidate.get(cat);if(!data||source(cat)!==data.original)return;
  apply.disabled=true;
  try{
   const firstAccept=!prior.has(cat);
   if(firstAccept)prior.set(cat,data.original.slice());
   try{await window.TillsynoCETest.replaceOptimizedTemplate(cat,data.optimized);}
   catch(error){if(firstAccept)prior.delete(cat);throw error;}
   candidate.delete(cat);redraw();
  }catch(err){status.textContent='Ändring misslyckades: '+err.message;apply.disabled=false;}
 },'ceOptAccept');
 const undo=button('Återställ original',async()=>{
  const original=prior.get(cat);if(!original)return;
  undo.disabled=true;
  try{await window.TillsynoCETest.replaceOptimizedTemplate(cat,original);prior.delete(cat);candidate.delete(cat);redraw();}
  catch(err){status.textContent='Återställning misslyckades: '+err.message;undo.disabled=false;}
 },'ceOptUndo');
 const bytes=source(cat),pending=candidate.get(cat),isPending=pending?.original===bytes;
 size.textContent=bytes?'Aktuell mall: '+mb(bytes.length)+(prior.has(cat)?' (optimerad)':''):'PDF-mall saknas';
 if(isPending)status.textContent='Förslag: '+mb(bytes.length)+' → '+mb(pending.optimized.length)+' (sparar '+mb(bytes.length-pending.optimized.length)+').';
 orig.disabled=!bytes;test.disabled=!bytes;show.disabled=!isPending;apply.disabled=!isPending;undo.disabled=!prior.has(cat);
 return section;
}
function redraw(){
 const host=$('ceOptimizerRows');if(!host)return;
 host.replaceChildren(...labels.map(makeRow));
 const button=$('ceOptApplyAll');if(button)button.disabled=!labels.some(cat=>candidate.get(cat)?.original===source(cat));
}
let busy=false;
function status(message){const node=$('ceOptBulkStatus');if(node)node.textContent=message;}
function lockBulk(locked){
 busy=locked;
 for(const id of ['ceOptTestAll','ceOptApplyAll','ceOptCheckEmail']){const el=$(id);if(el)el.disabled=locked;}
 if(!locked)redraw();
}
async function testAll(){
 if(busy)return;
 lockBulk(true);let checked=0,found=0,savedBytes=0,failed=0;
 try{
  for(const cat of labels){
   candidate.delete(cat);
   const current=source(cat);if(!current)continue;
   checked++;status('Undersöker '+checked+' av '+labels.length+': '+name(cat)+'…');
   try{
    const result=await optimize(current);
    if(source(cat)!==current)throw Error('Mallen ändrades under testet.');
    if(result.bytes){
     found++;savedBytes+=current.length-result.bytes.length;
     candidate.set(cat,{original:current,optimized:result.bytes});
    }
   }catch(error){failed++;console.warn('CE-optimering misslyckades för '+cat,error);}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  status('Test klart: '+found+' av '+checked+' mallar kan minskas. Besparing i gemensamma mallar: '+mb(savedBytes)+'. '+(failed?failed+' mallar kunde inte analyseras. ':'')+'Granska varje testfil före godkännande. Detta är inte ZIP-storleken.');
 }finally{lockBulk(false);}
}
async function applyAll(){
 if(busy)return;
 const pending=labels.filter(cat=>candidate.get(cat)?.original===source(cat));
 if(!pending.length)return;
 lockBulk(true);let applied=0,failed=0;
 try{
  for(const cat of pending){
   const result=candidate.get(cat),original=result.original;
   status('Tillämpar optimerad mall '+(applied+failed+1)+' av '+pending.length+': '+name(cat)+'…');
   const isFirst=!prior.has(cat);
   try{
    if(isFirst)prior.set(cat,original.slice());
    await window.TillsynoCETest.replaceOptimizedTemplate(cat,result.optimized);
    candidate.delete(cat);applied++;
   }catch(error){
    if(isFirst)prior.delete(cat);
    failed++;console.warn('Kunde inte uppdatera '+cat,error);
   }
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  status(applied+' mallar används nu i hela projektet (alla dörrar). '+(failed?failed+' kunde inte bytas. ':'')+'Tryck Beräkna projekt-PDF för mejl för verklig filstorlek, och spara sedan projektet.');
 }finally{lockBulk(false);}
}
async function checkEmailSize(){
 if(busy)return;
 lockBulk(true);
 try{
  status('Beräknar storleken på den färdiga projekt-PDF:en…');
  const bytes=await window.TillsynoCECalculateProjectSize();
  const safe=bytes<=15*1048576;
  status('Projekt-PDF att skicka: '+mb(bytes)+'. '+(safe?'Bra marginal för många mejltjänster.':'Stor fil för mejl – gränserna varierar mellan tjänster. Dela via Dropbox/OneDrive vid behov.')+' Den faktiska ZIP-storleken mäts separat vid export.');
 }catch(error){status('Kunde inte mäta projekt-PDF: '+error.message);}
 finally{lockBulk(false);}
}
function reset(){prior.clear();candidate.clear();if($('ceOptimizerRows'))redraw();}
function open(){const dialog=setup();redraw();if(!dialog.open)dialog.showModal();}
window.TillsynoCEOptimize={open,reset};
})();
