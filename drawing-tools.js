(()=>{
'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=id=>document.getElementById(id);
let pdf=null,sourceBytes=null,fileName='ritning.pdf',page=1,keep=[],undo=[],redo=[],historyState=null,renderTask=null,lastOutput=null,uploadedSize=0,drawingSourceSize=0;
let manualMasks={},cropRects={},editMode='',dragStart=null,estimateVersion=0;
let selectPagesMode=false,selectedPages=new Set(),workSourceKind='';
let previewZoom=1,previewPage=0,previewWidth=0,previewHeight=0,panDrag=null,zoomTimer=null,previewVersion=0;
let busy=false,splitUrls=[];
const previewWrap=$('previewWrap');
async function withBusy(task){
 if(busy)return;busy=true;
 const controls=Array.from(document.querySelectorAll('button,input,select'),el=>[el,el.disabled]);
 controls.forEach(([el])=>el.disabled=true);$('workspace').setAttribute('aria-busy','true');
 $('workspace').inert=true;document.querySelector('.headerActions').inert=true;
 try{return await task();}
 finally{
  busy=false;controls.forEach(([el,disabled])=>el.disabled=disabled);$('workspace').removeAttribute('aria-busy');
  $('workspace').inert=false;document.querySelector('.headerActions').inert=false;
  $('savePdf').disabled=$('toolsToggle').disabled=!pdf;
  if(pdf){updateHistoryButtons();updateEditButtons();renderPageList();}
 }
}
function clearParts(){
 splitUrls.forEach(url=>URL.revokeObjectURL(url));splitUrls=[];
 $('splitResults').replaceChildren();$('splitResults').hidden=true;
}
function showTools(open){
 $('toolPanel').hidden=!open;$('toolsToggle').setAttribute('aria-expanded',String(open));
 if(!open&&$('toolPanel').contains(document.activeElement))$('toolsToggle').focus();
}
$('openPdf').onclick=()=>$('toolFile').click();
$('toolsToggle').onclick=()=>showTools($('toolPanel').hidden);
$('closeTools').onclick=()=>showTools(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('toolPanel').hidden){e.preventDefault();showTools(false)}});
// Keep file information and optimization results with the tools, away from the drawing.
$('optimizeTools').append($('sizeCompare'),$('resultCard'),$('deepCleanInfo'));
function layoutPreview(){
 const w=previewWidth*previewZoom,h=previewHeight*previewZoom;
 for(const node of [$('previewCanvas'),$('canvasStage')]){node.style.width=w+'px';node.style.height=h+'px'}
 $('previewSurface').style.width=(w+24)+'px';$('previewSurface').style.height=(h+24)+'px';
 $('previewZoomLevel').textContent=Math.round(previewZoom*100)+'%';
 $('previewZoomOut').disabled=previewZoom<=.5;$('previewZoomIn').disabled=previewZoom>=8;
}
function setPreviewZoom(value,clientX,clientY){
 if(!pdf||!previewWidth||dragStart||panDrag)return;
 const next=Math.max(.5,Math.min(8,value));if(next===previewZoom)return;
 const wrapRect=previewWrap.getBoundingClientRect(),old=$('previewCanvas').getBoundingClientRect();
 const x=clientX??(wrapRect.left+previewWrap.clientWidth/2),y=clientY??(wrapRect.top+previewWrap.clientHeight/2);
 const u=(x-old.left)/old.width,v=(y-old.top)/old.height;
 previewZoom=next;layoutPreview();
 const rect=$('previewCanvas').getBoundingClientRect();
 previewWrap.scrollLeft+=rect.left+u*rect.width-x;previewWrap.scrollTop+=rect.top+v*rect.height-y;
 clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>renderPreview(),180);
}
function fitPreview(){
 if(!pdf)return;clearTimeout(zoomTimer);previewZoom=1;layoutPreview();
 previewWrap.scrollLeft=0;previewWrap.scrollTop=0;renderPreview();
}
const QUALITY={
 lossless:{maxPixels:7000000,maxSide:4200,jpeg:1,label:'Förlustfri',estimateBpp:.145},
 light:{maxPixels:3500000,maxSide:3200,jpeg:.76,label:'Mindre fil',estimateBpp:.095},
 balanced:{maxPixels:7000000,maxSide:4200,jpeg:.85,label:'Balans',estimateBpp:.145},
 clear:{maxPixels:12000000,maxSide:5200,jpeg:.91,label:'Högre kvalitet',estimateBpp:.21}
};
function message(text,error=false){$('toolMessage').textContent=text;$('toolMessage').classList.toggle('error',!!error);$('toolMessage').classList.toggle('busy',/^(Läser|Optimerar|Packar|Förbereder|Delar|Skapar)/.test(text))}
function formatBytes(n){if(!Number.isFinite(n))return'';if(n<1024)return Math.max(1,Math.round(n))+' B';if(n<1024*1024)return Math.max(1,Math.round(n/1024))+' KB';return(n/1024/1024).toFixed(2)+' MB'}
function sizeVerdict(reduction){
 if(reduction>=.5)return'Stor förbättring';
 if(reduction>=.2)return'Bra minskning';
 if(reduction>=.05)return'Liten minskning';
 if(reduction>-.05)return'Nästan oförändrad';
 return'Filen blev större';
}
function updateSizeComparison(outputSize=null,q=null){
 if(!uploadedSize)return;
 $('sizeCompare').hidden=false;
 $('sizeOriginal').textContent=formatBytes(uploadedSize);
 $('sizePages').textContent=keptPages().length+' / '+keep.length;
 if(!Number.isFinite(outputSize)){
  $('sizeNew').textContent='–';$('sizePercent').textContent='–';$('sizeVerdict').textContent='Inte mätt';
  $('sizeCompare').dataset.state='dirty';
  $('sizeDetail').textContent=(workSourceKind?('Originalritningen i '+workSourceKind+'-filen är '+formatBytes(drawingSourceSize)+'. '):'')+($('quality').value==='lossless'?'Förlustfri storlek mäts från den färdiga PDF-filen. Ingen sänkning av bildkvaliteten görs.':'Beräknad storlek är en uppskattning. Tryck “Mät exakt” för verklig filstorlek.');
  return;
 }
 const diff=uploadedSize-outputSize,reduction=diff/uploadedSize,percent=Math.round(reduction*100),verdict=sizeVerdict(reduction);
 $('sizeNew').textContent=formatBytes(outputSize);$('sizePercent').textContent=(percent>0?'−':percent<0?'+':'')+Math.abs(percent)+' %';$('sizeVerdict').textContent=verdict;$('sizeCompare').dataset.state=reduction<0?'worse':reduction>=.2?'good':'neutral';
 $('sizeDetail').textContent='Exakt mätt på '+keptPages().length+' sidor · kvalitet '+(q?.label||'–')+'.'+(workSourceKind?' Jämförelsen är mot hela den uppladdade arbets-PDF-filen.':'');
}
async function updateEstimatedSize(){
 if(!pdf||!uploadedSize)return;
 const version=++estimateVersion,q=QUALITY[$('quality').value]||QUALITY.balanced,pages=keptPages();
 if(q===QUALITY.lossless){$('sizeEstimate').textContent='Mät exakt';$('sizePages').textContent=pages.length+' / '+keep.length;return;}
 $('sizeEstimate').textContent='Beräknar…';$('sizePages').textContent=pages.length+' / '+keep.length;
 let total=0;
 for(const pageNo of pages){
  const p=await pdf.getPage(pageNo),base=p.getViewport({scale:1}),scale=rasterScale(base,q),crop=cropRects[pageNo],factor=crop?Math.max(.02,crop.w*crop.h):1;
  total+=Math.ceil(base.width*scale)*Math.ceil(base.height*scale)*factor*q.estimateBpp+5500;
 }
 if(version!==estimateVersion)return;
 $('sizeEstimate').textContent=formatBytes(Math.max(12000,total));
}
function cleanName(name){return String(name||'ritning.pdf').replace(/\.(pdf|jpe?g|png|webp)$/i,'').replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'ritning'}
function keptPages(){return keep.map((v,i)=>v?i+1:null).filter(Boolean)}
function drawingState(){
 return JSON.parse(JSON.stringify({keep,manualMasks,cropRects,removeText:$('removeText').checked,removeAnnotations:$('removeAnnotations').checked,removeColors:$('removeColors').checked,quality:$('quality').value}));
}
function updateHistoryButtons(){
 $('undoDrawing').disabled=$('undoPage').disabled=!undo.length;
 $('redoDrawing').disabled=!redo.length;
}
function recordChange(){
 if(!pdf)return;
 const next=drawingState();
 if(historyState&&JSON.stringify(next)!==JSON.stringify(historyState)){
  undo.push({state:historyState,page});if(undo.length>50)undo.shift();redo=[];
 }
 historyState=next;updateHistoryButtons();
}
function updateQualityHint(){
 const q=QUALITY[$('quality').value]||QUALITY.balanced;
 $('qualityHint').textContent=q===QUALITY.lossless?($('removeText').checked||$('removeColors').checked?'Text- och färgrensning kräver ett bildbaserat kvalitetsläge. Välj Balans, Mindre fil eller Högre kvalitet för den rensningen.':'Text, bilder och ritningslinjer behåller sin kvalitet. Sidval, beskärning och dolda områden stöds. Storleksminskning kan inte garanteras.'):q===QUALITY.light?'Mindre fil gör sidorna till bilder och kan sänka kvaliteten.':q===QUALITY.clear?'Högre kvalitet gör sidorna till skarpa bilder. Texten blir inte längre sökbar.':'Balans gör sidorna till bilder. Det kan minska storleken men påverka små texter och tunna linjer.';
}
function restoreHistory(from,to,label){
 if(!from.length)return;
 const entry=from.pop();to.push({state:drawingState(),page:entry.page});
 const state=entry.state;keep=state.keep.slice();manualMasks=JSON.parse(JSON.stringify(state.manualMasks));cropRects=JSON.parse(JSON.stringify(state.cropRects));
 for(const id of ['removeText','removeAnnotations','removeColors'])$(id).checked=state[id];
 $('quality').value=state.quality;page=entry.page;editMode='';dragStart=null;panDrag=null;$('eraseBox').hidden=true;selectedPages.clear();
 historyState=drawingState();updateHistoryButtons();updateQualityHint();invalidate(false);renderPageList();updateEditButtons();renderPreview();message(label);
}
async function inspectKnownWorkPdf(bytes){
 if(!window.PDFLib)return null;
 const {PDFDocument,PDFName,PDFDict,PDFRawStream,decodePDFRawStream}=PDFLib;
 try{
  const doc=await PDFDocument.load(bytes,{updateMetadata:false,ignoreEncryption:true});
  for(const spec of [
   {name:'DorrserviceWork',kind:'Dörrautomatik'},
   {name:'SecurityServiceWork',kind:'Säkerhetsservice'}
  ]){
   const ref=doc.catalog.get(PDFName.of(spec.name));if(!ref)continue;
   const metadata=doc.context.lookup(ref);if(!(metadata instanceof PDFDict))continue;
   const drawing=metadata.lookup(PDFName.of('Drawing'),PDFRawStream);if(!drawing)continue;
   const drawingBytes=decodePDFRawStream(drawing).decode().slice();
   const original=await PDFDocument.load(drawingBytes,{updateMetadata:false,ignoreEncryption:true});
   if(!original.getPageCount())continue;
   return {drawingBytes,kind:spec.kind,pageCount:original.getPageCount()};
  }
 }catch(error){console.warn('Djup PDF-kontroll kunde inte läsa arbetsdata',error)}
 return null;
}
function masksFor(pageNo){return manualMasks[pageNo]||(manualMasks[pageNo]=[])}
function updateEditButtons(){
 const count=(manualMasks[page]||[]).length,crop=!!cropRects[page];
 $('undoErase').disabled=!count;$('clearErases').disabled=!count;$('resetCrop').disabled=!crop;
 $('eraseMode').classList.toggle('active',editMode==='erase');
 $('cropMode').classList.toggle('active',editMode==='crop');
 $('eraseMode').setAttribute('aria-pressed',String(editMode==='erase'));
 $('cropMode').setAttribute('aria-pressed',String(editMode==='crop'));
 $('eraseMode').textContent=editMode==='erase'?'Dölj område: PÅ':'Dölj område';
 $('cropMode').textContent=editMode==='crop'?'Beskär sida: PÅ':'Beskär sida';
 $('previewWrap').classList.toggle('eraseMode',editMode==='erase');
 $('previewWrap').classList.toggle('cropMode',editMode==='crop');
 $('previewWrap').classList.toggle('cardHeaderMode',editMode==='card-header');
 $('previewEditMode').hidden=!editMode;
 $('previewEditMode').textContent=(editMode==='card-header'?'Markera rubrik':editMode==='crop'?'Beskär':'Dölj område')+' · Avsluta';
 window.DrawingCardTool?.refresh();
}
function updateBulkControls(){
 $('selectPages').classList.toggle('active',selectPagesMode);
 $('selectPages').setAttribute('aria-pressed',String(selectPagesMode));
 $('selectPages').textContent=selectPagesMode?'Välj flera sidor: PÅ':'Välj flera sidor';
 $('bulkPageActions').hidden=!selectPagesMode;
}
function renderPageList(){
 const box=$('pageList');box.replaceChildren();
 keep.forEach((yes,i)=>{
  const no=i+1,b=document.createElement('button');b.type='button';b.textContent=no;
  b.className=(no===page?'active ':'')+(yes?'':'removed')+(selectedPages.has(no)?' selected':'');
  b.onclick=()=>{
   if(selectPagesMode){
    selectedPages.has(no)?selectedPages.delete(no):selectedPages.add(no);
    renderPageList();return;
   }
   page=no;renderPageList();updateEditButtons();renderPreview()
  };
  box.appendChild(b)
 });
 $('removePage').textContent=keep[page-1]?'Ta bort aktuell sida':'Återställ aktuell sida';
 $('pageInfo').textContent='Sida '+page+' / '+keep.length;
 const mc=(manualMasks[page]||[]).length,crop=!!cropRects[page];$('pageState').textContent=(keep[page-1]?'Tas med':'Tas bort')+(mc?' · '+mc+' dolda områden':'')+(crop?' · beskuren':'')+(selectPagesMode&&selectedPages.size?' · '+selectedPages.size+' valda':'');
 $('prevPage').disabled=page<=1;$('nextPage').disabled=page>=keep.length;
 updateBulkControls();
 window.DrawingCardTool?.refresh();
}
function previewScale(vp){const wrap=$('previewWrap'),maxW=Math.max(260,wrap.clientWidth-20),maxH=Math.max(330,Math.min(900,wrap.clientHeight||700)-20);return Math.max(.2,Math.min(1.6,maxW/vp.width,maxH/vp.height))}
function stripColoredMarks(ctx,w,h){
 if(!$('removeColors').checked)return;
 const img=ctx.getImageData(0,0,w,h),d=img.data;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],g=d[i+1],b=d[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min;
  if(chroma>24&&min<238){d[i]=255;d[i+1]=255;d[i+2]=255}
 }
 ctx.putImageData(img,0,0);
}
async function whiteOutText(ctx,p,viewport){
 if(!$('removeText').checked)return;
 const text=await p.getTextContent();
 ctx.save();ctx.fillStyle='#fff';
 for(const item of text.items||[]){
  if(!item?.str?.trim())continue;
  const tx=pdfjsLib.Util.transform(viewport.transform,item.transform),baseX=tx[4],baseY=tx[5];
  let ux=tx[0],uy=tx[1],uLen=Math.hypot(ux,uy);if(uLen<.001){ux=1;uy=0;uLen=1}else{ux/=uLen;uy/=uLen}
  const nx=-uy,ny=ux,w=Math.max(3,(Number(item.width)||0)*viewport.scale),h=Math.max(3,Math.hypot(tx[2],tx[3]),uLen*.8),pad=Math.max(2,h*.2),halfH=h*.72+pad;
  const ax=baseX-ux*pad-nx*halfH,ay=baseY-uy*pad-ny*halfH,bx=baseX+ux*(w+pad)-nx*halfH,by=baseY+uy*(w+pad)-ny*halfH,cx=baseX+ux*(w+pad)+nx*halfH,cy=baseY+uy*(w+pad)+ny*halfH,dx=baseX-ux*pad+nx*halfH,dy=baseY-uy*pad+ny*halfH;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.lineTo(dx,dy);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function applyManualMasks(ctx,pageNo){
 const masks=manualMasks[pageNo]||[];if(!masks.length)return;
 ctx.save();ctx.fillStyle='#fff';
 for(const m of masks)ctx.fillRect(m.x*ctx.canvas.width,m.y*ctx.canvas.height,m.w*ctx.canvas.width,m.h*ctx.canvas.height);
 ctx.restore();
}
async function cleanCanvas(ctx,p,viewport,pageNo){
 stripColoredMarks(ctx,ctx.canvas.width,ctx.canvas.height);
 await whiteOutText(ctx,p,viewport);
 applyManualMasks(ctx,pageNo);
}
async function renderPreview(){
 if(!pdf)return;
 const version=++previewVersion,pageNo=page;
 if(renderTask)try{renderTask.cancel()}catch(_){}
 try{
  const p=await pdf.getPage(pageNo);if(version!==previewVersion)return;
  if(previewPage!==pageNo){clearTimeout(zoomTimer);previewPage=pageNo;previewZoom=1;previewWrap.scrollLeft=0;previewWrap.scrollTop=0}
  const base=p.getViewport({scale:1}),scale=previewScale(base),css=p.getViewport({scale}),dpr=Math.min(window.devicePixelRatio||1,2);
  const raster=Math.min(scale*previewZoom*dpr,Math.sqrt(12000000/(base.width*base.height)),5200/Math.max(base.width,base.height));
  const vp=p.getViewport({scale:raster}),cv=$('previewCanvas'),buffer=document.createElement('canvas');
  previewWidth=css.width;previewHeight=css.height;layoutPreview();
  buffer.width=Math.ceil(vp.width);buffer.height=Math.ceil(vp.height);
  const ctx=buffer.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,buffer.width,buffer.height);
  renderTask=p.render({canvasContext:ctx,viewport:vp,annotationMode:$('removeAnnotations').checked?(pdfjsLib.AnnotationMode?.DISABLE??0):(pdfjsLib.AnnotationMode?.ENABLE??1)});
  await renderTask.promise;await cleanCanvas(ctx,p,vp,pageNo);if(version!==previewVersion)return;
  const crop=cropRects[pageNo],cropBox=$('cropBox');
  if(crop){
   cropBox.hidden=false;cropBox.style.left=(crop.x*100)+'%';cropBox.style.top=(crop.y*100)+'%';cropBox.style.width=(crop.w*100)+'%';cropBox.style.height=(crop.h*100)+'%';
  }else cropBox.hidden=true;
  if(!keep[pageNo-1]){ctx.save();ctx.fillStyle='#ffffffcc';ctx.fillRect(0,0,buffer.width,buffer.height);ctx.fillStyle='#8c3035';ctx.font=Math.max(22,buffer.width*.035)+'px sans-serif';ctx.textAlign='center';ctx.fillText('SIDAN TAS BORT',buffer.width/2,buffer.height/2);ctx.restore()}
  cv.width=buffer.width;cv.height=buffer.height;cv.getContext('2d').drawImage(buffer,0,0);
  renderPageList();updateEditButtons();
 }catch(e){if(e?.name!=='RenderingCancelledException'){console.error(e);message('Kunde inte visa sidan.',true)}}
}
function jpegOrientation(bytes){
 try{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint16(0)!==0xffd8)return 1;
  for(let offset=2;offset+4<bytes.length;){
   const marker=view.getUint16(offset),length=view.getUint16(offset+2);
   if(marker===0xffe1&&length>=10&&view.getUint32(offset+4)===0x45786966&&view.getUint16(offset+8)===0){
    const start=offset+10,little=view.getUint16(start)===0x4949,ifd=start+view.getUint32(start+4,little),count=view.getUint16(ifd,little);
    for(let n=0;n<count;n++){const entry=ifd+2+n*12;if(view.getUint16(entry,little)===0x0112)return view.getUint16(entry+8,little);}
    return 1;
   }
   if(marker===0xffda||marker===0xffd9||length<2)break;offset+=length+2;
  }
 }catch(_){}
 return 1;
}
async function imagePixelsAsPng(file){
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  if(!canvas.width||!canvas.height)throw Error('Bilden saknar giltiga mått.');
  try{
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bilden är för stor för den här enheten.');
   ctx.drawImage(image,0,0);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Bilden kunde inte läsas i full upplösning.')),'image/png'));
   return new Uint8Array(await blob.arrayBuffer());
  }finally{canvas.width=canvas.height=1;}
 }catch(error){throw Error('Kunde inte läsa bilden '+file.name+'. Prova JPG eller PNG. '+(error.message||''));}
 finally{URL.revokeObjectURL(url);image.src='';}
}
async function imagesToPdf(files){
 const doc=await PDFLib.PDFDocument.create();
 for(let i=0;i<files.length;i++){
  const file=files[i],bytes=new Uint8Array(await file.arrayBuffer());let image;
  message('Läser bild '+(i+1)+' / '+files.length+' i originalupplösning…');
  const jpeg=bytes[0]===0xff&&bytes[1]===0xd8,png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  if(jpeg&&jpegOrientation(bytes)===1)image=await doc.embedJpg(bytes);
  else if(png){try{image=await doc.embedPng(bytes);}catch(_){image=await doc.embedPng(await imagePixelsAsPng(file));}}
  else image=await doc.embedPng(await imagePixelsAsPng(file));
  const scale=Math.min(1,842/Math.max(image.width,image.height)),width=image.width*scale,height=image.height*scale;
  const page=doc.addPage([width,height]);page.drawImage(image,{x:0,y:0,width,height});
 }
 return doc.save({useObjectStreams:true,objectsPerTick:50});
}
async function loadFiles(list){
 const files=Array.from(list||[]);if(!files.length)return;
 return withBusy(async()=>{
  try{
   const pdfFiles=files.filter(file=>file.type==='application/pdf'||/\.pdf$/i.test(file.name));
   if(pdfFiles.length){
    if(files.length!==1)throw Error('Öppna en PDF i taget, eller välj flera bilder tillsammans.');
    await loadFile(files[0]);return;
   }
   if(files.some(file=>!/^image\//.test(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name)))throw Error('Välj en PDF eller bilder i JPG-, PNG- eller WebP-format.');
   const bytes=await imagesToPdf(files),name=cleanName(files[0].name)+(files.length>1?'-bilder':'')+'.pdf';
   await loadFile(new File([bytes],name,{type:'application/pdf'}),{images:files.length,originalSize:files.reduce((size,file)=>size+file.size,0)});
  }catch(error){console.error(error);message(error.message||'Kunde inte öppna filen.',true);}
 });
}
async function loadFile(file,imageSource=null){
 if(!file)return;
 try{
  message('Läser PDF-strukturen…');
  const uploadedBytes=new Uint8Array(await file.arrayBuffer()),embedded=await inspectKnownWorkPdf(uploadedBytes),drawingBytes=embedded?.drawingBytes||uploadedBytes,candidate=await pdfjsLib.getDocument({data:drawingBytes.slice()}).promise;await candidate.getPage(1);
  if(pdf)try{await pdf.destroy()}catch(_){}
  pdf=candidate;sourceBytes=drawingBytes;uploadedSize=imageSource?.originalSize||uploadedBytes.byteLength;drawingSourceSize=drawingBytes.byteLength;fileName=file.name||'ritning.pdf';workSourceKind=embedded?.kind||'';page=1;keep=Array(pdf.numPages).fill(true);undo=[];redo=[];manualMasks={};cropRects={};editMode='';dragStart=null;selectPagesMode=false;selectedPages=new Set();lastOutput=null;previewPage=0;previewZoom=1;clearParts();
  window.DrawingCardTool?.reset();
  for(const id of ['removeText','removeAnnotations','removeColors'])$(id).checked=false;
  $('quality').value='lossless';
  historyState=drawingState();updateHistoryButtons();$('undoPage').disabled=true;$('workspace').hidden=false;$('savePdf').disabled=false;$('toolsToggle').disabled=false;$('resultCard').hidden=true;$('sizeCompare').hidden=false;
  document.body.classList.add('hasDrawing');$('openPdf').textContent='Byt fil';showTools(false);
  if(embedded){
   $('deepCleanInfo').hidden=false;$('deepCleanTitle').textContent=embedded.kind+' arbets-PDF upptäckt';
   $('deepCleanText').textContent='Originalritningen har plockats ut direkt ur filen. Gamla servicepilar, etiketter, protokollsidor och inbäddad arbetsdata används inte i den nya ritningen.';
  }else if(imageSource){
   $('deepCleanInfo').hidden=false;$('deepCleanTitle').textContent=imageSource.images+' bilder öppnade';
   $('deepCleanText').textContent='Varje bild har blivit en egen PDF-sida i full upplösning. Originalbilderna ändras inte.';
  }else{
   $('deepCleanInfo').hidden=false;$('deepCleanTitle').textContent='Vanlig PDF';
   $('deepCleanText').textContent='Förlustfri export behåller PDF-innehåll och originalkvalitet. Lägena Mindre fil, Balans och Högre kvalitet gör sidorna till bilder och tar bort interaktiva funktioner.';
  }
  renderPageList();updateEditButtons();updateQualityHint();updateSizeComparison();await updateEstimatedSize();await renderPreview();
  message((embedded?'Originalritningen hittades och återställdes. ':'Ritningen är klar. ')+pdf.numPages+' sidor · '+formatBytes(uploadedBytes.byteLength)+'. Originalfilen ändras inte.');
 }catch(e){console.error(e);message('Kunde inte öppna PDF-filen.',true)}
}
async function pdfRectangle(pageNo,rect){
 const p=await pdf.getPage(pageNo),viewport=p.getViewport({scale:1});
 const a=viewport.convertToPdfPoint(rect.x*viewport.width,rect.y*viewport.height),b=viewport.convertToPdfPoint((rect.x+rect.w)*viewport.width,(rect.y+rect.h)*viewport.height);
 return {x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),width:Math.abs(b[0]-a[0]),height:Math.abs(b[1]-a[1])};
}
function rasterScale(base,q){
 const byPixels=Math.sqrt(q.maxPixels/Math.max(1,base.width*base.height)),bySide=q.maxSide/Math.max(base.width,base.height);
 return Math.max(.65,Math.min(3,byPixels,bySide));
}
async function buildOutput(){
 if(!pdf)return null;const pages=keptPages();if(!pages.length){message('Minst en sida måste vara kvar.',true);return null}
 if($('quality').value==='lossless'){
  if($('removeText').checked||$('removeColors').checked)throw Error('Förlustfri kvalitet kan inte kombineras med text- eller färgrensning. Avmarkera rensningen eller välj ett bildbaserat kvalitetsläge.');
  message('Packar om PDF med originalkvalitet…');
  const crops={},masks={};
  for(const no of pages){
   if(cropRects[no])crops[no-1]=await pdfRectangle(no,cropRects[no]);
   if(manualMasks[no]?.length)masks[no-1]=await Promise.all(manualMasks[no].map(rect=>pdfRectangle(no,rect)));
  }
  const result=await DrawingPdf.optimize(sourceBytes,{pages:pages.map(no=>no-1),crops,masks,removeAnnotations:$('removeAnnotations').checked});
  const bytes=result.bytes,check=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{
   if(check.numPages!==pages.length)throw Error('PDF-kontrollen hittade fel sidantal. Originalfilen finns kvar.');
   for(let i=1;i<=check.numPages;i++)await check.getPage(i);
  }finally{await check.destroy();}
  const changed=pages.length!==keep.length||Object.keys(crops).length||Object.keys(masks).length||$('removeAnnotations').checked;
  const verdict=result.original?'Originalfilen behölls':changed?'Arbetskopia med originalkvalitet':'Förlustfritt ompackad PDF';
  const name=cleanName(fileName)+'-forlustfri.pdf',blob=new Blob([bytes],{type:'application/pdf'});
  lastOutput={blob,name,bytes};
  $('resultCard').hidden=false;
  $('resultInfo').textContent=pages.length+' sidor · '+formatBytes(bytes.length)+' · '+verdict;
  updateSizeComparison(bytes.length,{label:'Förlustfri'});
  message(changed?'Arbetskopian är klar med originalkvalitet.':bytes.length<sourceBytes.length?'Förlustfri optimering klar. Originalet är oförändrat.':'Ingen säker storleksminskning hittades. Originalkvaliteten är bevarad.');
  return lastOutput;
 }
 const q=QUALITY[$('quality').value]||QUALITY.balanced,{PDFDocument}=PDFLib,out=await PDFDocument.create();
 message('Optimerar 0 / '+pages.length+' sidor…');
 for(let n=0;n<pages.length;n++){
  const pageNo=pages[n],p=await pdf.getPage(pageNo),base=p.getViewport({scale:1}),scale=rasterScale(base,q),vp=p.getViewport({scale}),cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  const ctx=cv.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  const task=p.render({canvasContext:ctx,viewport:vp,annotationMode:$('removeAnnotations').checked?(pdfjsLib.AnnotationMode?.DISABLE??0):(pdfjsLib.AnnotationMode?.ENABLE??1)});await task.promise;await cleanCanvas(ctx,p,vp,pageNo);
  const crop=cropRects[pageNo];let finalCanvas=cv,pageW=base.width,pageH=base.height;
  if(crop){
   const sx=Math.max(0,Math.round(crop.x*cv.width)),sy=Math.max(0,Math.round(crop.y*cv.height)),sw=Math.max(1,Math.min(cv.width-sx,Math.round(crop.w*cv.width))),sh=Math.max(1,Math.min(cv.height-sy,Math.round(crop.h*cv.height))),cc=document.createElement('canvas');
   cc.width=sw;cc.height=sh;const cctx=cc.getContext('2d',{alpha:false});cctx.fillStyle='#fff';cctx.fillRect(0,0,sw,sh);cctx.drawImage(cv,sx,sy,sw,sh,0,0,sw,sh);finalCanvas=cc;pageW=base.width*crop.w;pageH=base.height*crop.h;
  }
  const blob=await new Promise((resolve,reject)=>finalCanvas.toBlob(b=>b?resolve(b):reject(new Error('Kunde inte skapa bild')),'image/jpeg',q.jpeg)),jpg=await out.embedJpg(await blob.arrayBuffer()),op=out.addPage([pageW,pageH]);op.drawImage(jpg,{x:0,y:0,width:pageW,height:pageH});if(finalCanvas!==cv)finalCanvas.width=finalCanvas.height=1;cv.width=cv.height=1;
  message('Optimerar '+(n+1)+' / '+pages.length+' sidor…');
 }
 out.setTitle('Rensad arbetsritning');out.setCreator('Dörrservice Ritningsverktyg');out.setSubject('Optimerad arbetskopia. Originalfilen är oförändrad.');
 const bytes=await out.save(),name=cleanName(fileName)+'-rensad.pdf',blob=new Blob([bytes],{type:'application/pdf'});
 lastOutput={blob,name,bytes};$('resultCard').hidden=false;$('resultInfo').textContent=pages.length+' sidor · '+formatBytes(bytes.length)+' · '+q.label;updateSizeComparison(bytes.length,q);
 message('Arbetskopian är klar.');return lastOutput;
}
async function output(){return lastOutput||await buildOutput()}
function invalidate(record=true){if(record)recordChange();lastOutput=null;clearParts();$('resultCard').hidden=true;updateSizeComparison();updateEstimatedSize()}
function pointerPos(e){
 const cv=$('previewCanvas'),r=cv.getBoundingClientRect();return{x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top)),w:r.width,h:r.height}
}
function showDragBox(a,b){
 const box=$('eraseBox'),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
 box.classList.toggle('cropSelection',editMode==='crop');box.hidden=false;box.style.left=x+'px';box.style.top=y+'px';box.style.width=w+'px';box.style.height=h+'px';
 box.classList.toggle('cardHeaderSelection',editMode==='card-header');
}
function finishDrag(e){
 if(!dragStart)return;const end=pointerPos(e),start=dragStart;dragStart=null;$('eraseBox').hidden=true;
 const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(start.x-end.x),h=Math.abs(start.y-end.y);
 if(w<8||h<8)return;
 const rect={x:x/end.w,y:y/end.h,w:w/end.w,h:h/end.h};
 if(editMode==='card-header'){
  editMode='';window.DrawingCardTool?.setRegion(rect,page);updateEditButtons();return;
 }
 if(editMode==='crop'){
  if(rect.w<.05||rect.h<.05)return message('Beskärningsområdet är för litet.',true);
  cropRects[page]=rect;editMode='';invalidate();renderPreview();message('Sida '+page+' beskärs till det markerade området.');return;
 }
 if(editMode==='erase'){
  masksFor(page).push(rect);invalidate();renderPreview();message('Området döljs på sida '+page+'.');
 }
}
$('toolFile').onchange=e=>{const files=Array.from(e.target.files||[]);loadFiles(files);e.target.value=''};
$('prevPage').onclick=()=>{if(page>1){page--;renderPageList();updateEditButtons();renderPreview()}};
$('nextPage').onclick=()=>{if(page<keep.length){page++;renderPageList();updateEditButtons();renderPreview()}};
$('removePage').onclick=()=>{if(!pdf)return;if(keep[page-1]&&keptPages().length===1)return message('Du kan inte ta bort den sista sidan.',true);keep[page-1]=!keep[page-1];invalidate();renderPageList();renderPreview();message(keep[page-1]?'Sidan återställd.':'Sidan tas inte med i arbetskopian.')};
$('selectPages').onclick=()=>{selectPagesMode=!selectPagesMode;if(!selectPagesMode)selectedPages.clear();renderPageList();message(selectPagesMode?'Klicka på alla sidor du vill välja. Tryck sedan “Ta bort valda”.':'Flervalsläget är avstängt.')};
$('selectAllPages').onclick=()=>{selectedPages=new Set(keep.map((_,i)=>i+1));renderPageList()};
$('clearPageSelection').onclick=()=>{selectedPages.clear();renderPageList()};
$('removeSelectedPages').onclick=()=>{
 if(!selectedPages.size)return message('Välj först vilka sidor som ska tas bort.',true);
 const currentlyKept=keptPages(),toRemove=currentlyKept.filter(n=>selectedPages.has(n));
 if(currentlyKept.length-toRemove.length<1)return message('Du måste lämna minst en sida kvar.',true);
 toRemove.forEach(n=>keep[n-1]=false);selectedPages.clear();selectPagesMode=false;invalidate();renderPageList();renderPreview();message(toRemove.length+' sidor tas bort från arbetskopian.');
};
$('undoDrawing').onclick=$('undoPage').onclick=()=>restoreHistory(undo,redo,'Senaste ändringen ångrades.');
$('redoDrawing').onclick=()=>restoreHistory(redo,undo,'Ändringen återställdes.');
$('removeText').onchange=()=>{invalidate();updateQualityHint();renderPreview()};
$('removeAnnotations').onchange=()=>{invalidate();renderPreview()};
$('removeColors').onchange=()=>{invalidate();updateQualityHint();renderPreview()};
$('quality').onchange=()=>{if($('quality').value==='lossless')$('removeAnnotations').checked=false;invalidate();updateQualityHint();renderPreview()};
$('aggressiveClean').onclick=()=>{$('removeText').checked=true;$('removeAnnotations').checked=true;$('removeColors').checked=true;invalidate();renderPreview();message('Text, kommentarer och färgmarkeringar rensas. Kontrollera förhandsvisningen innan du sparar.')};
$('eraseMode').onclick=()=>{editMode=editMode==='erase'?'':'erase';dragStart=null;$('eraseBox').hidden=true;updateEditButtons();showTools(false);message(editMode==='erase'?'Dra en ruta över det du vill dölja.':'Dölj område är avstängt.')};
$('cropMode').onclick=()=>{editMode=editMode==='crop'?'':'crop';dragStart=null;$('eraseBox').hidden=true;updateEditButtons();showTools(false);message(editMode==='crop'?'Dra en ruta runt den del av sidan du vill behålla.':'Beskärning är avstängd.')};
$('resetCrop').onclick=()=>{if(!cropRects[page])return;delete cropRects[page];invalidate();updateEditButtons();renderPreview();message('Beskärningen på sida '+page+' är återställd.')};
$('undoErase').onclick=()=>{const masks=masksFor(page);if(!masks.length)return;masks.pop();invalidate();updateEditButtons();renderPreview();message('Senaste dolda området ångrades.')};
$('clearErases').onclick=()=>{if(!masksFor(page).length)return;manualMasks[page]=[];invalidate();updateEditButtons();renderPreview();message('Alla dolda områden på sida '+page+' visas igen.')};
const cv=$('previewCanvas');
$('previewEditMode').onclick=()=>{editMode='';dragStart=null;$('eraseBox').hidden=true;updateEditButtons()};
cv.addEventListener('pointerdown',e=>{if(busy||!editMode||!pdf||e.button!==0)return;e.preventDefault();cv.setPointerCapture?.(e.pointerId);dragStart=pointerPos(e);showDragBox(dragStart,dragStart)});
cv.addEventListener('pointermove',e=>{if(!editMode||!dragStart)return;e.preventDefault();showDragBox(dragStart,pointerPos(e))});
cv.addEventListener('pointerup',e=>{if(!editMode||!dragStart)return;e.preventDefault();finishDrag(e)});
cv.addEventListener('pointercancel',()=>{dragStart=null;$('eraseBox').hidden=true});
$('previewZoomIn').onclick=()=>setPreviewZoom(previewZoom*1.25);
$('previewZoomOut').onclick=()=>setPreviewZoom(previewZoom/1.25);
$('previewFit').onclick=fitPreview;
previewWrap.addEventListener('wheel',e=>{
 if(!pdf||!previewWidth)return;e.preventDefault();
 const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?previewWrap.clientHeight:1);
 setPreviewZoom(previewZoom*Math.exp(-Math.max(-240,Math.min(240,delta))*.0025),e.clientX,e.clientY);
},{passive:false});
previewWrap.addEventListener('pointerdown',e=>{
 if(!pdf||e.pointerType!=='mouse'||(e.button!==1&&(e.button!==0||editMode)))return;
 e.preventDefault();e.stopPropagation();panDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:previewWrap.scrollLeft,top:previewWrap.scrollTop};
 previewWrap.setPointerCapture(e.pointerId);previewWrap.classList.add('panning');
},true);
previewWrap.addEventListener('pointermove',e=>{
 if(!panDrag||e.pointerId!==panDrag.id)return;e.preventDefault();
 previewWrap.scrollLeft=panDrag.left+panDrag.x-e.clientX;previewWrap.scrollTop=panDrag.top+panDrag.y-e.clientY;
});
function stopPan(e){
 if(!panDrag||e.pointerId!==panDrag.id)return;panDrag=null;previewWrap.classList.remove('panning');
 if(previewWrap.hasPointerCapture(e.pointerId))previewWrap.releasePointerCapture(e.pointerId);
}
previewWrap.addEventListener('pointerup',stopPan);
previewWrap.addEventListener('pointercancel',stopPan);
previewWrap.addEventListener('lostpointercapture',stopPan);
function downloadPdf(result){
 if(window.DorrNative?.isNative?.())return window.DorrNative.saveAndSharePdf(result.bytes,result.name,'Ritningsverktyg – PDF');
 const url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download=result.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$('analyzeSize').onclick=()=>withBusy(async()=>{try{await buildOutput()}catch(e){console.error(e);message(e.message||'Kunde inte mäta filstorleken.',true)}});
$('savePdf').onclick=()=>withBusy(async()=>{try{const r=await output();if(!r)return;await downloadPdf(r);message('PDF klar. Välj Spara till Filer eller öppna den hämtade filen.')}catch(e){console.error(e);message(e.message||'Kunde inte skapa PDF.',true)}});
$('splitSize').onchange=clearParts;
$('splitPdf').onclick=()=>withBusy(async()=>{
 try{
  const mb=Number($('splitSize').value);if(!Number.isFinite(mb)||mb<1||mb>500)throw Error('Ange en målstorlek mellan 1 och 500 MB.');
  clearParts();const result=await output();if(!result)return;
  message('Delar PDF vid hela sidgränser…');
  const parts=await DrawingPdf.split(result.bytes,mb*1024*1024,(current,total)=>message('Delar PDF · sida '+current+' / '+total+'…'));
  const box=$('splitResults'),heading=document.createElement('strong');heading.textContent=parts.length===1?'Filen ryms i en del':parts.length+' PDF-delar klara';box.append(heading);
  parts.forEach((part,index)=>{
   const name=cleanName(fileName)+'-del-'+String(index+1).padStart(2,'0')+'-sidor-'+part.startPage+'-'+part.endPage+'.pdf';
   const blob=new Blob([part.bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob);splitUrls.push(url);
   const row=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small'),link=document.createElement('a');
   row.className='splitPart';title.textContent='Del '+(index+1)+' · sida '+part.startPage+(part.endPage===part.startPage?'':'–'+part.endPage);detail.textContent=formatBytes(part.bytes.length)+' · Samma kvalitet som arbetskopian';
   link.href=url;link.download=name;link.textContent='Spara PDF-del '+(index+1);
   if(window.DorrNative?.isNative?.())link.onclick=async event=>{event.preventDefault();try{await downloadPdf({bytes:part.bytes,blob,name});}catch(error){message(error.message||'Kunde inte spara PDF-delen.',true);}};
   row.append(title,detail);
   if(part.oversize){const note=document.createElement('small');note.className='splitOversize';note.textContent='Den här PDF-delen överskrider målstorleken. Hela sidan och kvaliteten har behållits.';row.append(note);}
   row.append(link);box.append(row);
  });
  box.hidden=false;message('PDF-delarna är klara. Spara varje del med dess egen knapp.');
 }catch(error){console.error(error);clearParts();message(error.message||'Kunde inte dela PDF-filen.',true);}
});
window.addEventListener('resize',()=>{if(pdf)renderPreview()});
window.DrawingToolsBridge=Object.freeze({
 getPdf:()=>pdf,getPage:()=>page,getKeptPages:keptPages,getEditMode:()=>editMode,
 withBusy,message,showTools,
 markCardHeader(){if(!pdf||busy)return;editMode=editMode==='card-header'?'':'card-header';dragStart=null;$('eraseBox').hidden=true;updateEditButtons();showTools(false);message(editMode?'Dra en ruta runt rubriken eller beslagskoden högst upp på ett dörrkort.':'Rubrikmarkering är avstängd.');},
 async showPage(no){if(!pdf||busy||!Number.isInteger(no)||no<1||no>keep.length)return;page=no;renderPageList();updateEditButtons();showTools(false);await renderPreview();},
 async removePages(numbers){
  if(!pdf||busy)return 0;
  const wanted=new Set(numbers),current=keptPages(),remove=current.filter(no=>wanted.has(no));
  if(!remove.length)return 0;if(current.length-remove.length<1)throw Error('Minst en sida måste vara kvar.');
  return withBusy(async()=>{remove.forEach(no=>keep[no-1]=false);selectedPages.clear();selectPagesMode=false;invalidate();renderPageList();await renderPreview();message(remove.length+' extrasidor tas bort från arbetskopian. Du kan ångra ändringen eller välja Spara PDF.');return remove.length;});
 }
});
})();
