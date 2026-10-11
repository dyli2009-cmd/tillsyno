/* SmartMatch TEST v36.96 – self-contained revisions-PDF workflow.
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
// Protocol export deliberately contains only the selected protocol pages.
async function combinedFile(){
 const all=selectedItems();
 if(!all.length)throw Error('Välj minst ett protokoll.');
 if(all.length===1)return oneFile(all[0]);
 const merged=await PDFLib.PDFDocument.create();
 for(const o of all){
  const source=await PDFLib.PDFDocument.load(new Uint8Array(pdfFor(o).output('arraybuffer')));
  const pages=await merged.copyPages(source,source.getPageIndices());
  pages.forEach(p=>merged.addPage(p));
 }
 const bytes=await merged.save({useObjectStreams:true});
 return new File([bytes],'Revisionsprotokoll-'+safeName(projectMeta().projectName||'Projekt')+'-'+all.length+'st.pdf',{type:'application/pdf'});
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
 return JSON.stringify(selectedItems().map(x=>String(x.id)));
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
  try{await openPreview(file,'Revisionsprotokoll',r.email,r.kind)}
  catch(err){console.error(err);writeStatus('pwSelfcheckExportStatus','Kunde inte visa PDF: '+(err?.message||err))}
  return;
 }
 if(kind==='save')await saveFile(file,'pwSelfcheckExportStatus');
 else await shareMail(file,r.email,'pwSelfcheckExportStatus',r.kind);
}
function updateBatchButtons(){
 const chosen=selectedItems(),enabled=chosen.length>0;
 const summary=$('pwProtocolLinkSummary');
 if(summary)summary.textContent=enabled?'Endast valda protokoll.':'Välj protokoll ovan.';
 if(protocolDialog().open)prepareProtocols();
 else if(!enabled)protocolButtons().forEach(b=>b.disabled=true);
}

function replaceExistingButton(id,callback){
 $(id).addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();void callback()},true);
}
$('pwSendProtocols').onclick=()=>{
 if(!bridge()?.getPdf?.()){void window.SmartMatchAppBridge?.requestAction?.({title:'Information',confirm:true,action:'OK',message:'Öppna projekt-PDF först.'});return}
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

