/* SmartMatch TEST v36.56 – self-contained revisions-PDF workflow.
   Uses the live app bridge; does not modify PDF scanning, GS logic, or customer project export. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const bridge=()=>window.SmartMatchAppBridge;
let pdfPreview=null,previewFile=null,previewPage=1,previewTask=null,previewRecipient='',previewKind='customer',previewZoom=1,previewRenderToken=0;
const writeStatus=(id,msg)=>{const el=$(id);if(el){el.hidden=!msg;el.textContent=msg||'';}};
const projectMeta=()=>bridge()?.getProjectMeta?.()||{};
const safeName=s=>String(s||'Revisionsprotokoll').replace(/[^A-Za-z0-9ÅÄÖåäö_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'Revisionsprotokoll';
const identity=o=>[o?.objectNo,o?.modelCode,o?.serialNumber].filter(Boolean).join('-')||(o?.objectNo||o?.id||'automatik');
const pdfFor=o=>{const d=bridge()?.getRevisionPdf?.(o);if(!d)throw Error('Kan inte skapa revisionsprotokoll.');return d};
const oneFile=o=>new File([pdfFor(o).output('blob')],'Checklista-revision-'+safeName(identity(o))+'.pdf',{type:'application/pdf'});
const selectedItems=()=>{
 const items=bridge()?.getItems?.()||[];
 return [...$('pwSelfcheckExportList').querySelectorAll('input[type="checkbox"]:checked')]
 .map(c=>items.find(x=>x.id===c.value)).filter(Boolean);
};
// Group only existing, exact GS IDs on the same drawing page as the automation.
// Do not invent links by finding a nearby label or by matching only the GS code.
function linkedSelections(items){
 const gsById=new Map((bridge()?.getPositions?.()||[]).filter(p=>/^GS\d+/i.test(String(p.code||''))&&Array.isArray(p.rect)&&p.rect.length===4)
  .map(p=>[String(p.id),p]));
 const groups=new Map(),withoutGS=[];
 for(const o of items){
  const gs=gsById.get(String(o.linkedGsId||''));
  if(!gs||Number(gs.page)!==Number(o.page)||!Number.isInteger(Number(gs.page))||Number(gs.page)<1){
   withoutGS.push(o);continue;
  }
  if(!groups.has(gs.id))groups.set(gs.id,{gs,items:[]});
  groups.get(gs.id).items.push(o);
 }
 return {groups:[...groups.values()].sort((a,b)=>a.gs.page-b.gs.page||a.gs.code.localeCompare(b.gs.code,'sv',{numeric:true})),withoutGS};
}
function ascii(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim()}
function fitText(value,font,size,maxWidth){
 let v=ascii(value);
 while(v.length>4&&font.widthOfTextAtSize(v,size)>maxWidth)v=v.slice(0,-2)+'...';
 return v;
}
function annotateLink(doc,from,rect,target,xy=null,label=''){
 if(!from||!target||!rect.every(Number.isFinite))return;
 const {PDFName,PDFString}=PDFLib;
 const w=from.getWidth(),h=from.getHeight();
 const bounds=[Math.max(0,Math.min(rect[0],w)),Math.max(0,Math.min(rect[1],h)),
  Math.max(0,Math.min(rect[2],w)),Math.max(0,Math.min(rect[3],h))];
 if(bounds[2]-bounds[0]<2||bounds[3]-bounds[1]<2)return;
 const dest=xy?[target.ref,PDFName.of('XYZ'),Math.max(0,Math.min(xy[0],target.getWidth())),
  Math.max(0,Math.min(xy[1],target.getHeight())),null]:[target.ref,PDFName.of('Fit')];
 const item=doc.context.obj({Type:'Annot',Subtype:'Link',NM:PDFString.of('SMREV36.17:'+ascii(label).slice(0,75)),
  Rect:bounds,Border:[0,0,0],A:{S:'GoTo',D:dest}});
 let annotations=from.node.Annots?.();
 if(!annotations){annotations=doc.context.obj([]);from.node.set(PDFName.of('Annots'),annotations)}
 annotations.push(doc.context.register(item));
}
function addMenuBack(doc,from,drawing,gs,font){
 const {rgb}=PDFLib,x=35,y=757,w=155,h=31;
 from.drawRectangle({x,y,width:w,height:h,color:rgb(.89,.96,.99),borderColor:rgb(.21,.53,.69),borderWidth:.9});
 from.drawText('TILL RITNING  <',{x:x+12,y:y+10,font,size:11,color:rgb(.08,.33,.47)});
 annotateLink(doc,from,[x,y,x+w,y+h],drawing,
  [Math.max(0,gs.rect[0]-55),Math.min(drawing.getHeight(),gs.rect[3]+85)],'menu-back');
}
async function combinedFile(){
 const all=selectedItems();
 if(!all.length)throw Error('Välj minst ett protokoll.');
 const includeDrawings=!!$('pwIncludeLinkedDrawings')?.checked;
 if(!includeDrawings&&all.length===1)return oneFile(all[0]);
 const links=linkedSelections(all);
 if(!includeDrawings||!links.groups.length){
  // Do not pretend there is a GS drawing link for unlinked selections.
  const merged=await PDFLib.PDFDocument.create();
  for(const o of all){
   const source=await PDFLib.PDFDocument.load(new Uint8Array(pdfFor(o).output('arraybuffer')));
   const pages=await merged.copyPages(source,source.getPageIndices());
   pages.forEach(p=>merged.addPage(p));
  }
  const bytes=await merged.save({useObjectStreams:true});
  return new File([bytes],'Revisionsprotokoll-'+safeName(projectMeta().projectName||'Projekt')+'-'+all.length+'st.pdf',{type:'application/pdf'});
 }
 const originalBytes=bridge()?.getOriginalPdfBytes?.();
 if(!originalBytes?.length)throw Error('Originalritningen saknas. Öppna projekt-PDF igen.');
 const original=await PDFLib.PDFDocument.load(originalBytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 const output=await PDFLib.PDFDocument.create();
 const {rgb,StandardFonts,PDFName}=PDFLib;
 const regular=await output.embedFont(StandardFonts.Helvetica),bold=await output.embedFont(StandardFonts.HelveticaBold);
 const drawings=new Map();
 const pages=[...new Set(links.groups.map(x=>Number(x.gs.page)))].sort((a,b)=>a-b);
 for(const pageNo of pages){
  if(pageNo<1||pageNo>original.getPageCount())throw Error('Fel ritningssida '+pageNo);
  const [copy]=await output.copyPages(original,[pageNo-1]);
  output.addPage(copy);drawings.set(pageNo,copy);
 }
 const menus=new Map(),menuForId=new Map();
 const maxRows=18;
 // All menu pages are allocated before protocol pages so PDF page numbers stay stable.
 for(const group of links.groups){
  const sections=[];
  for(let start=0;start<group.items.length;start+=maxRows){
   const chunk=group.items.slice(start,start+maxRows),p=output.addPage([595.28,841.89]);
   sections.push({page:p,items:chunk});for(const o of chunk)menuForId.set(o.id,p);
  }
  menus.set(group.gs.id,sections);
 }
 let unlinkedMenu=null;
 if(links.withoutGS.length){
  const sections=[];
  for(let start=0;start<links.withoutGS.length;start+=maxRows)sections.push({
   page:output.addPage([595.28,841.89]),items:links.withoutGS.slice(start,start+maxRows)});
  unlinkedMenu=sections;
  for(const chunk of sections)for(const o of chunk.items)menuForId.set(o.id,chunk.page);
 }
 const protocolFirstPages=new Map();
 for(const o of all){
  const source=await PDFLib.PDFDocument.load(new Uint8Array(pdfFor(o).output('arraybuffer')));
  const copies=await output.copyPages(source,source.getPageIndices());
  if(!copies.length)throw Error('Tomt revisionsprotokoll: '+identity(o));
  protocolFirstPages.set(o.id,copies[0]);
  const gs=links.groups.find(g=>g.items.some(a=>a.id===o.id))?.gs;
  const back=gs?drawings.get(Number(gs.page)):menuForId.get(o.id);
  for(const p of copies){
   output.addPage(p);
   if(back){
    // Footer area stays clear of the existing protocol heading/checklist.
    const x=Math.max(10,p.getWidth()-185),y=7,w=116,h=20;
    p.drawRectangle({x,y,width:w,height:h,color:rgb(.9,.96,.99),borderColor:rgb(.13,.46,.65),borderWidth:.8});
    p.drawText(gs?'TILL RITNING  <':'TILL LISTA  <',{x:x+6,y:y+6,font:bold,size:9,color:rgb(.06,.32,.48)});
    annotateLink(output,p,[x,y,x+w,y+h],back,gs?[
     Math.max(0,gs.rect[0]-55),Math.min(back.getHeight(),gs.rect[3]+85)]:null,'protocol-back');
   }
  }
 }
 function menuPage(page,entries,heading,subtitle,linkTarget,gs,prev,next){
  page.drawText(fitText(heading,bold,20,520),{x:35,y:805,size:20,font:bold,color:rgb(.07,.3,.43)});
  page.drawText(fitText(subtitle,regular,10,520),{x:35,y:788,size:10,font:regular,color:rgb(.3,.42,.49)});
  if(linkTarget&&gs)addMenuBack(output,page,linkTarget,gs,bold);
  else page.drawText('Automatiker utan GS-position - kontrollera kopplingen',{x:35,y:767,font:regular,size:10,color:rgb(.62,.35,.14)});
  let y=725;
  for(const o of entries){
   const status=Number(o.progress)===100?'100% klar':(Number(o.progress)||0)+'% klar';
   page.drawRectangle({x:35,y:y-10,width:525,height:34,color:rgb(.95,.98,.99),borderColor:rgb(.75,.84,.89),borderWidth:.7});
   page.drawText(fitText(identity(o),bold,12,260),{x:47,y:y+8,size:12,font:bold,color:rgb(.07,.29,.44)});
   page.drawText(fitText((o.model||'Dorrautomatik')+' | '+status,regular,9,460),{x:47,y:y-5,size:9,font:regular,color:rgb(.27,.42,.52)});
   page.drawText('OPPNA  >',{x:490,y:y+3,size:9,font:bold,color:rgb(.07,.41,.58)});
   annotateLink(output,page,[35,y-10,560,y+24],protocolFirstPages.get(o.id),null,'menu:'+identity(o));
   y-=40;
  }
  if(prev){
   page.drawText('FOREGAENDE LISTA  <',{x:35,y:37,size:10,font:bold,color:rgb(.1,.4,.59)});
   annotateLink(output,page,[30,24,230,55],prev,null,'menu-prev');
  }
  if(next){
   page.drawText('NASTA LISTA  >',{x:365,y:37,size:10,font:bold,color:rgb(.1,.4,.59)});
   annotateLink(output,page,[355,24,560,55],next,null,'menu-next');
  }
  page.drawText('Valda revisionsprotokoll - PDF lankar fungerar offline i kompatibel lasare.',{x:35,y:12,font:regular,size:8,color:rgb(.43,.52,.58)});
 }
 for(const group of links.groups){
  const groupMenus=menus.get(group.gs.id),drawing=drawings.get(Number(group.gs.page));
  for(let i=0;i<groupMenus.length;i++){
   menuPage(groupMenus[i].page,groupMenus[i].items,
    group.gs.code+' - '+group.items.length+' revisionsprotokoll',
    'Ritningssida '+group.gs.page+' | fysisk position '+(group.gs.position||'?')+' | klicka pa ett dorr-ID',
    drawing,group.gs,groupMenus[i-1]?.page,groupMenus[i+1]?.page);
  }
  // Original GS text is preserved; add a subtle highlight and one large clickable area.
  const r=group.gs.rect,w=drawing.getWidth(),h=drawing.getHeight();
  const left=Math.max(0,Math.min(r[0],r[2])-3),bottom=Math.max(0,Math.min(r[1],r[3])-3);
  const right=Math.min(w,Math.max(r[0],r[2],left+26)+4),top=Math.min(h,Math.max(r[1],r[3],bottom+22)+4);
  if(right>left&&top>bottom){
   drawing.drawRectangle({x:left,y:bottom,width:right-left,height:top-bottom,
    color:rgb(.73,.91,.98),opacity:.13,borderColor:rgb(.1,.44,.68),borderWidth:1.2});
   annotateLink(output,drawing,[left,bottom,right,top],groupMenus[0].page,null,'drawing:'+group.gs.code+':'+group.gs.id);
  }
 }
 if(unlinkedMenu){
  for(let i=0;i<unlinkedMenu.length;i++)menuPage(unlinkedMenu[i].page,unlinkedMenu[i].items,
   'Utan GS-koppling','Valda protokoll utan giltig fysisk GS-position',null,null,
   unlinkedMenu[i-1]?.page,unlinkedMenu[i+1]?.page);
 }
 const bytes=await output.save({useObjectStreams:true});
 const name='Revisionsprotokoll-'+safeName(projectMeta().projectName||'Projekt')+'-'+all.length+'st-med-ritning.pdf';
 return new File([bytes],name,{type:'application/pdf'});
}
function download(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function saveFile(file,statusId){
 try{
  if(typeof window.showSaveFilePicker==='function'){
   try{
    const handle=await window.showSaveFilePicker({suggestedName:file.name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]});
    const writable=await handle.createWritable();try{await writable.write(await file.arrayBuffer())}finally{await writable.close()}
    writeStatus(statusId,'PDF sparad lokalt som '+(handle.name||file.name)+'.');return;
   }catch(err){
    if(err?.name==='AbortError'){writeStatus(statusId,'Sparandet avbröts.');return}
   }
  }
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   try{
    await navigator.share({files:[file]});
    writeStatus(statusId,'Fildelningen är klar. Kontrollera att PDF sparades på den plats du valde.');return;
   }catch(err){if(err?.name==='AbortError'){writeStatus(statusId,'Sparandet avbröts.');return}}
  }
  download(file);writeStatus(statusId,'PDF nedladdad: '+file.name+'. Kontrollera Hämtade filer.');
 }catch(err){console.error(err);writeStatus(statusId,'Kunde inte spara PDF: '+(err?.message||err))}
}
async function shareMail(file,recipient,statusId,kind='customer'){
 const address=String(recipient||'').trim();
 const subject='Revisionsprotokoll – '+(projectMeta().projectName||'Dörrautomatik');
 const body=kind==='own'?'Kopia av revisionsprotokoll.':'Revisionsprotokoll till kund.';
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{
   await navigator.share({files:[file]});
   writeStatus(statusId,'Enbart PDF-filen har delats. Om du valde Mail: ange mottagare'+(address?' ('+address+')':'')+' och ämne i mejlappen, och kontrollera bilagan innan du skickar.');return;
  }catch(err){if(err?.name==='AbortError'){writeStatus(statusId,'Delningen avbröts. Inget mejl har skickats automatiskt.');return}}
 }
 download(file);
 const message=body+'\n\nBifoga filen som just laddades ner: '+file.name+'\nKontrollera bilaga och mottagare innan du skickar.';
 window.location.href='mailto:'+address+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
 writeStatus(statusId,'PDF nedladdad och mejlutkast öppnat om din mejlapp stödjer det. Du måste bifoga '+file.name+' manuellt innan du skickar.');
}
async function clearPreview(){
 if(previewTask)try{previewTask.cancel()}catch(_){}
 previewTask=null;
 const old=pdfPreview;pdfPreview=null;previewFile=null;previewPage=1;previewRecipient='';previewKind='customer';previewZoom=1;previewRenderToken++;
 $('pwProtocolPreviewLinks').replaceChildren();
 if($('pwAutomationPreviewDialog').open)$('pwAutomationPreviewDialog').close();
 if(old)try{await old.destroy()}catch(_){}
}
async function previewDestination(dest){
 if(typeof dest==='string')dest=await pdfPreview.getDestination(dest);
 if(!Array.isArray(dest)||!dest.length)throw Error('PDF-lanken saknar giltig intern destination.');
 const ref=dest[0],pageIndex=typeof ref==='number'?ref:await pdfPreview.getPageIndex(ref);
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=pdfPreview.numPages)throw Error('Destinationen finns inte i filen.');
 previewPage=pageIndex+1;
 // Zoom in when returning to large drawing so the chosen position is visible.
 if(dest[1]?.name==='XYZ')previewZoom=Math.max(previewZoom,1.5);
 await renderPreview(dest);
}
async function renderPreview(destination=null){
 if(!pdfPreview||!$('pwAutomationPreviewDialog').open)return;
 const token=++previewRenderToken;
 if(previewTask)try{previewTask.cancel()}catch(_){}
 const pdf=pdfPreview,pg=await pdf.getPage(previewPage);
 if(token!==previewRenderToken||pdf!==pdfPreview)return;
 const natural=pg.getViewport({scale:1}),wrap=$('pwAutomationPreviewWrap'),canvas=$('pwAutomationPreviewCanvas');
 const fitScale=Math.max(.23,Math.min(2,(wrap.clientWidth-24)/natural.width));
 const scale=fitScale*previewZoom,vp=pg.getViewport({scale}),ratio=Math.min(2,window.devicePixelRatio||1);
 const holder=$('pwProtocolPreviewPage'),links=$('pwProtocolPreviewLinks');
 holder.style.width=vp.width+'px';holder.style.height=vp.height+'px';
 canvas.width=Math.ceil(vp.width*ratio);canvas.height=Math.ceil(vp.height*ratio);
 canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 const task=pg.render({canvasContext:ctx,viewport:vp});previewTask=task;
 try{await task.promise}catch(err){if(err?.name==='RenderingCancelledException')return;throw err}
 if(token!==previewRenderToken||pdf!==pdfPreview)return;
 links.replaceChildren();
 // PDF.js displays pages on canvas, so build the internal-link hit layer explicitly.
 const annotations=await pg.getAnnotations({intent:'display'});
 if(token!==previewRenderToken||pdf!==pdfPreview)return;
 for(const annotation of annotations){
  if(!annotation?.dest||!Array.isArray(annotation.rect))continue;
  const v=vp.convertToViewportRectangle(annotation.rect);
  const x=Math.min(v[0],v[2]),y=Math.min(v[1],v[3]);
  const w=Math.abs(v[2]-v[0]),h=Math.abs(v[3]-v[1]);
  if(!Number.isFinite(x+y+w+h)||w<2||h<2)continue;
  const button=document.createElement('button');button.type='button';
  button.style.left=x+'px';button.style.top=y+'px';button.style.width=w+'px';button.style.height=h+'px';
  button.setAttribute('aria-label','Oppna lank till annan sida i revisions-PDF');
  button.title='Klicka for att folja PDF-lanken';
  button.onclick=()=>{void previewDestination(annotation.dest).catch(err=>writeStatus('pwProtocolPreviewStatus','Kunde inte folja PDF-lanken: '+(err?.message||err)))};
  links.appendChild(button);
 }
 $('pwProtocolPreviewPages').textContent='Sida '+previewPage+' av '+pdf.numPages;
 $('pwProtocolPreviewZoomLabel').textContent=Math.round(previewZoom*100)+'%';
 $('pwProtocolPreviewPrev').disabled=previewPage<=1;$('pwProtocolPreviewNext').disabled=previewPage>=pdf.numPages;
 if(destination?.[1]?.name==='XYZ'){
  const x=Number(destination[2]),y=Number(destination[3]);
  if(Number.isFinite(x)&&Number.isFinite(y)){
   const pt=vp.convertToViewportPoint(x,y);
   wrap.scrollLeft=Math.max(0,pt[0]-wrap.clientWidth*.5);
   wrap.scrollTop=Math.max(0,pt[1]-wrap.clientHeight*.4);
  }
 }else{wrap.scrollLeft=0;wrap.scrollTop=0}
}

async function openPreview(file,label='',recipient='',kind='customer'){
 await clearPreview();
 previewFile=file;previewRecipient=recipient;previewKind=kind;previewPage=1;previewZoom=1;
 pdfPreview=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 $('pwProtocolPreviewHeading').textContent=label;
 $('pwAutomationPreviewTitle').textContent=file.name;
 writeStatus('pwProtocolPreviewStatus','');
 $('pwAutomationPreviewDialog').showModal();
 await renderPreview();
}
async function previewFromSingle(){
 const o=bridge()?.selectedRevision?.();if(!o)return;
 try{await openPreview(oneFile(o),'Checklista revision dörrautomatik')}
 catch(err){console.error(err);writeStatus('pwDAExportStatus','Förhandsgranskningen misslyckades: '+(err?.message||err))}
}
async function singleAction(kind){
 const o=bridge()?.selectedRevision?.();if(!o)return;
 try{
  const file=oneFile(o);
  if(kind==='save')await saveFile(file,'pwDAExportStatus');
  else await shareMail(file,'','pwDAExportStatus');
 }catch(err){console.error(err);writeStatus('pwDAExportStatus','Protokollet kunde inte skapas: '+(err?.message||err))}
}
function recipient(){
 const field=$('pwProtocolRecipientEmail');
 if(field.value&&!field.checkValidity()){field.reportValidity();return null}
 return {email:field.value.trim(),kind:$('pwProtocolRecipientMode').value};
}
let preparedProtocolsFile=null,preparedProtocolsKey='',protocolBuildSeq=0,protocolBuildTimer=null,protocolNameInitialized=false;
$('pwProtocolExportFileName').addEventListener('input',()=>{protocolNameInitialized=true});
const protocolDialog=()=>$('pwSelfcheckExportDialog');
const protocolButtons=()=>[$('pwSelfcheckPreview'),$('pwSelfcheckSaveLocal'),$('pwSelfcheckExportCreate')];
function currentProtocolKey(){
 return JSON.stringify([selectedItems().map(x=>String(x.id)),$('pwIncludeLinkedDrawings')?.checked===true]);
}
function resetPreparedProtocols(){
 protocolBuildSeq++;if(protocolBuildTimer){clearTimeout(protocolBuildTimer);protocolBuildTimer=null}
 preparedProtocolsFile=null;preparedProtocolsKey='';
}
function prepareProtocols(immediately=false){
 resetPreparedProtocols();
 const chosen=selectedItems(),key=currentProtocolKey(),seq=protocolBuildSeq;
 if(!chosen.length){protocolButtons().forEach(b=>b.disabled=true);writeStatus('pwSelfcheckExportStatus','Välj minst ett protokoll.');return}
 protocolButtons().forEach(b=>b.disabled=true);
 writeStatus('pwSelfcheckExportStatus','Förbereder valda protokoll…');
 const generate=async()=>{
  try{
   const file=await combinedFile();
   if(seq!==protocolBuildSeq||!protocolDialog().open)return;
   preparedProtocolsFile=file;preparedProtocolsKey=key;
   if(!protocolNameInitialized){$('pwProtocolExportFileName').value=file.name;protocolNameInitialized=true}
   protocolButtons().forEach(b=>b.disabled=false);
   writeStatus('pwSelfcheckExportStatus','✓ PDF klar. Spara fil eller skicka mejl.');
  }catch(err){
   if(seq!==protocolBuildSeq||!protocolDialog().open)return;
   console.error('[SmartMatch protokoll PDF]',err);
   protocolButtons().forEach(b=>b.disabled=true);
   writeStatus('pwSelfcheckExportStatus','Kunde inte skapa protokoll: '+(err?.message||err));
  }
 };
 if(immediately)void generate();
 else protocolBuildTimer=setTimeout(()=>{protocolBuildTimer=null;void generate()},200);
}
async function batchAction(kind){
 const r=recipient();if(!r)return;
 if(!selectedItems().length){writeStatus('pwSelfcheckExportStatus','Välj minst ett protokoll.');return}
 // A ready file is essential on iOS: navigator.share must be called from the tap,
 // not after asynchronous PDF assembly, or the share sheet may be blocked.
 const key=currentProtocolKey();
 if(!preparedProtocolsFile||preparedProtocolsKey!==key){
  prepareProtocols(true);return;
 }
 const original=preparedProtocolsFile;
 const name=bridge().normalizeExportPdfName($('pwProtocolExportFileName').value,original.name);
 const file=new File([original],name,{type:'application/pdf'});
 if(kind==='preview'){
  try{await openPreview(file,'Ritning och revisionsprotokoll',r.email,r.kind)}
  catch(err){console.error(err);writeStatus('pwSelfcheckExportStatus','Kunde inte visa PDF: '+(err?.message||err))}
  return;
 }
 if(kind==='save')await saveFile(file,'pwSelfcheckExportStatus');
 else await shareMail(file,r.email,'pwSelfcheckExportStatus',r.kind);
}
function updateBatchButtons(){
 const chosen=selectedItems(),enabled=chosen.length>0;
 const summary=$('pwProtocolLinkSummary');
 if(summary){
  if(!enabled)summary.textContent='Välj protokoll ovan.';
  else{
   const info=linkedSelections(chosen);
   const linked=chosen.length-info.withoutGS.length;
   summary.textContent=$('pwIncludeLinkedDrawings')?.checked
    ?linked+' av '+chosen.length+' har GS-koppling'+(info.withoutGS.length?' · '+info.withoutGS.length+' utan koppling':'')+'.'
    :'Endast valda protokoll, utan ritning.';
  }
 }
 if(protocolDialog().open)prepareProtocols();
 else if(!enabled)protocolButtons().forEach(b=>b.disabled=true);
}

function replaceExistingButton(id,callback){
 $(id).addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();void callback()},true);
}
$('pwSendProtocols').onclick=()=>{
 if(!bridge()?.getPdf?.()){window.alert('Öppna projekt-PDF först.');return}
 $('pwSaveSelfchecks').click();
 updateBatchButtons();
 writeStatus('pwSelfcheckExportStatus','');
};
window.SmartMatchProtocolSave={onDialogOpened:()=>{protocolNameInitialized=false;$('pwProtocolExportFileName').value='';updateBatchButtons();prepareProtocols(true)}};
protocolDialog().addEventListener('close',resetPreparedProtocols);
$('pwProtocolStatusFilter').addEventListener('change',()=>{if(protocolDialog().open)prepareProtocols()});
replaceExistingButton('pwAutomationPreview',previewFromSingle);
replaceExistingButton('pwDAExportRevision',()=>singleAction('save'));
$('pwDAEmailRevision').onclick=()=>singleAction('email');
replaceExistingButton('pwSelfcheckExportCreate',()=>batchAction('email'));
$('pwSelfcheckPreview').onclick=()=>batchAction('preview');
$('pwSelfcheckSaveLocal').onclick=()=>batchAction('save');
$('pwSelfcheckExportList').addEventListener('change',updateBatchButtons);
 $('pwIncludeLinkedDrawings').addEventListener('change',updateBatchButtons);
$('pwSelfcheckSelectAll').addEventListener('click',updateBatchButtons);
$('pwSelfcheckSelectDone').addEventListener('click',updateBatchButtons);
$('pwProtocolPreviewPrev').onclick=()=>{if(pdfPreview&&previewPage>1){previewPage--;void renderPreview()}};
$('pwProtocolPreviewNext').onclick=()=>{if(pdfPreview&&previewPage<pdfPreview.numPages){previewPage++;void renderPreview()}};
$('pwProtocolPreviewZoomOut').onclick=()=>{if(pdfPreview){previewZoom=Math.max(.7,previewZoom/1.4);void renderPreview()}};
$('pwProtocolPreviewZoomIn').onclick=()=>{if(pdfPreview){previewZoom=Math.min(5,previewZoom*1.4);void renderPreview()}};
$('pwProtocolPreviewSave').onclick=()=>{if(previewFile)void saveFile(previewFile,'pwProtocolPreviewStatus')};
$('pwProtocolPreviewEmail').onclick=()=>{if(previewFile)void shareMail(previewFile,previewRecipient,'pwProtocolPreviewStatus',previewKind)};
replaceExistingButton('pwAutomationPreviewClose',clearPreview);
$('pwAutomationPreviewDialog').addEventListener('cancel',e=>{e.preventDefault();e.stopImmediatePropagation();void clearPreview()},true);
window.addEventListener('resize',()=>{if(pdfPreview&&$('pwAutomationPreviewDialog').open)void renderPreview()}, {passive:true});
})();
