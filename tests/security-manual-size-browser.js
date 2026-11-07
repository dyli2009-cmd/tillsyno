/* Isolated browser integration fixture; load after the production application scripts. */
(()=>{
 const out=document.createElement('pre');out.id='qaManualSizeResults';out.style='position:fixed;right:6px;top:80px;max-width:420px;max-height:70vh;overflow:auto;z-index:10000;background:white;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(value,label)=>{if(!value)throw Error(label);out.textContent+='PASS '+label+'\n';},tick=ms=>new Promise(r=>setTimeout(r,ms));
 const same=(a,b)=>['width','height','textHeight'].every(key=>Math.abs(a[key]-b[key])<.001);
 async function physical(o){const vp=(await pdf.getPage(o.page)).getViewport({scale:1}),b=o.detectorBox,vertical=Math.abs(Math.sin(b.angle*Math.PI/180))>.707;return{width:vertical?b.height*vp.height:b.width*vp.width,height:vertical?b.width*vp.width:b.height*vp.height,textHeight:b.textHeight*vp.height};}
 function add(label,x=.2,y=.4){SecurityDetectorScan.open();$('detectorManual').click();$('detectorManualCode').value=label;$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));createItem('detector',x,y);return cur().uid;}
 function size(axis,value){const node=$('detector'+axis);node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}
 async function load(bytes,name){await $('securityFile').onchange({target:{files:[new File([bytes],name,{type:'application/pdf'})],value:''}});await renderQueue;if($('secOpenWorkDialog').open)$('secOpenContinue').click();await tick(100);await renderQueue;}
 const item=uid=>items.find(o=>o.uid===uid);
 (async()=>{
  await tick(150);$('allProtocolDialog').close();AllInOneProtocols.set(['detector']);
  const drawing=await PDFLib.PDFDocument.create();drawing.addPage([600,400]);drawing.addPage([1200,800]);const raw=await drawing.save();await load(raw,'manual-size.pdf');
  ok(!project.detectorManualSize,'Ny ritning har ingen kopierad storleksinställning');
  const first=add('52');size('Width',200);size('Height',150);const chosen=await physical(item(first));
  ok(same(project.detectorManualSize,chosen),'Ny manuell storlek sparas med ritningen i PDF-mått');$('detectorSizeDone').click();
  item(first).checks['1.1'].result='ok';syncStatus(item(first));save();const original=JSON.stringify(item(first));
  await setZoom(3);const second=add('57',.5,.4);ok(same(await physical(item(second)),chosen),'Nästa stämpel har samma storlek även efter zoom');$('detectorSizeDone').click();
  const long=add('Entré 2 / en längre märkning',.8,.4);ok(same(await physical(item(long)),chosen)&&item(long).id==='Entré 2 / en längre märkning','Längre text behålls i en ruta med samma storlek');$('detectorSizeDone').click();
  for(const angle of [90,180,270]){drawingRotations[1]=angle;await render(true);const uid=add(String(angle),.2+angle/450,.75);ok(same(await physical(item(uid)),chosen),'Storleken är densamma i rotering '+angle+'°');$('detectorSizeDone').click();}
  page=2;zoom=1;await render(true);const larger=add('2',.5,.4);ok(same(await physical(item(larger)),chosen),'Annan sidstorlek behåller samma fysiska rutstorlek');$('detectorSizeDone').click();
  await SecurityDetectorScan.openSize(item(second));size('Width',300);size('Height',200);const individual=await physical(item(second));ok(!same(individual,chosen)&&same(project.detectorManualSize,chosen),'Ändra storlek på befintlig stämpel ändrar bara den');$('detectorSizeDone').click();
  const next=add('58',.45,.15);ok(same(await physical(item(next)),chosen),'Nästa nya stämpel behåller standardstorleken efter en individuell ändring');
  size('Width',150);const updated=await physical(item(next));ok(same(project.detectorManualSize,updated),'Justering under ny placering blir nästa standardstorlek');securitySessionHistory.undo();ok(same(await physical(item(next)),chosen)&&same(project.detectorManualSize,chosen),'Ångra återställer både stämpel och standardstorlek');securitySessionHistory.redo();ok(same(await physical(item(next)),updated)&&same(project.detectorManualSize,updated),'Gör om återställer den valda storleken');$('detectorSizeDone').click();
  const final=add('59',.7,.15);ok(same(await physical(item(final)),updated),'Efterföljande stämpel återanvänder den nya storleken');$('detectorSizeDone').click();
  ok(JSON.stringify(item(first))===original,'Tidigare stämpels storlek, position och kontroll är oförändrade');
  let blob;const url=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return url(b)};HTMLAnchorElement.prototype.click=function(){};try{await exportPdf();}finally{URL.createObjectURL=url;HTMLAnchorElement.prototype.click=click;}
  const bytes=await blob.arrayBuffer(),saved=await inspectSecurityWorkPdf(new Uint8Array(bytes));ok(same(saved.work.project.detectorManualSize,updated),'Arbets-PDF innehåller den valda standardstorleken');
  await load(bytes,'manual-size-saved.pdf');const reopened=add('60',.1,.15);ok(same(await physical(item(reopened)),updated),'Återöppnad arbets-PDF använder samma storlek för nästa stämpel');$('detectorSizeDone').click();ok(same(await physical(item(second)),individual),'Enskilt ändrad storlek överlever sparning och återöppning');
  await load(raw,'manual-size-new.pdf');ok(!project.detectorManualSize&&items.length===0,'En ny originalritning är tom och ärver inga färdiga kopplingar eller storlekar');
  await load(bytes,'manual-size-result.pdf');await SecurityDetectorScan.openSize(item(final));out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj test';hide.onclick=()=>out.hidden=true;out.append(hide);
 })().catch(error=>{out.textContent+='FAIL '+error.message;console.error(error);});
})();
