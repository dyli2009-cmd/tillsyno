/* Isolated browser fixture: moving stamps while manual numbering remains active. */
(()=>{
 const out=document.createElement('pre');out.id='qaSequenceDrag';out.style='position:fixed;right:8px;top:75px;max-width:450px;max-height:65vh;overflow:auto;z-index:10000;background:white;color:#123;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(v,label)=>{if(!v)throw Error(label);out.textContent+='PASS '+label+'\n'},tick=ms=>new Promise(r=>setTimeout(r,ms)),item=uid=>items.find(o=>o.uid===uid),marker=uid=>markers.querySelector('[data-detector-uid="'+uid+'"]');
 const point=node=>{const r=node.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}},next=()=>$('detectorSequenceCode').value;
 function pointer(node,type,x,y,id=71,kind='mouse'){node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:kind,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}))}
 function drag(uid,dx,dy,kind='mouse',end='pointerup'){const b=marker(uid),p=point(b);pointer(b,'pointerdown',p.x,p.y,71,kind);pointer(b,'pointermove',p.x+dx,p.y+dy,71,kind);pointer(b,end,p.x+dx,p.y+dy,71,kind);b.click()}
 async function load(bytes,name){await $('securityFile').onchange({target:{files:[new File([bytes],name,{type:'application/pdf'})],value:''}});await renderQueue;if($('secOpenWorkDialog').open)$('secOpenContinue').click();await tick(120);await renderQueue}
 function start(code){SecurityDetectorScan.open();$('detectorManual').click();$('detectorManualCode').value=code;$('detectorManualStep').value='1';$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
 function size(axis,value){const el=$('detector'+axis);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
 async function exported(){let blob;const url=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return url(b)};HTMLAnchorElement.prototype.click=function(){};try{await exportPdf()}finally{URL.createObjectURL=url;HTMLAnchorElement.prototype.click=click}return blob.arrayBuffer()}
 (async()=>{
  await tick(180);$('allProtocolDialog').close();AllInOneProtocols.set(['detector']);AppTextScale.set(0);
  const doc=await PDFLib.PDFDocument.create(),p=doc.addPage([600,400]),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);p.drawText('EXEMPEL – PLACERA OCH FLYTTA',{x:40,y:350,size:16,font});p.drawRectangle({x:30,y:50,width:540,height:250,borderWidth:1,borderColor:PDFLib.rgb(.3,.4,.45)});const raw=await doc.save();await load(raw,'flytta-serie.pdf');
  const old=SecurityDetectorScan.newDetector({page:1,x:.12,y:.2,width:.04,height:.03,textHeight:.02,angle:0,code:'BEF1'});save();
  start('U1033');createItem('detector',.4,.4);const first=cur().uid;size('Width',200);size('Height',150);drag(first,8,6);ok(!$('detectorSizePanel').hidden&&item(first).x!==.4,'Första rutan kan fortfarande flyttas medan storleken ställs in');$('detectorSizeDone').click();
  createItem('detector',.65,.4);const uid=cur().uid;item(uid).checks['1.1'].result='ok';syncStatus(item(uid));save();drawMarkers();
  ok(marker(first).classList.contains('isPositioning')&&marker(uid).classList.contains('isPositioning')&&getComputedStyle(marker(uid)).touchAction==='none','Rutorna i den pågående serien är flyttbara efter Klar');
  const box=JSON.stringify(item(uid).detectorBox),checks=JSON.stringify(item(uid).checks),count=items.length;
  $('detectorSequenceCode').value='U2000';$('detectorSequenceCode').dispatchEvent(new Event('input',{bubbles:true}));
  for(const [angle,kind]of [[0,'mouse'],[90,'touch'],[180,'mouse'],[270,'touch']]){
   drawingRotations[1]=angle;await render(true);await setZoom(2);const before=point(marker(uid)),x=item(uid).x,y=item(uid).y;drag(uid,31,17,kind);const after=point(marker(uid));
   ok(Math.abs(after.x-before.x-31)<1&&Math.abs(after.y-before.y-17)<1,'Rutan följer '+kind+' efter zoom och rotation '+angle+'°');
   ok(next()==='U2000'&&addType==='detector'&&items.length===count&&document.body.dataset.view==='drawing'&&$('detectorSizePanel').hidden,'Flytt varken skapar objekt, ändrar nästa nummer eller lämnar serien');
   ok(JSON.stringify(item(uid).detectorBox)===box&&JSON.stringify(item(uid).checks)===checks&&item(uid).id==='U1034'&&item(uid).x===item(uid).labelX&&item(uid).y===item(uid).labelY,'Flytt behåller storlek, märkning och kontroll');
   const moved={x:item(uid).x,y:item(uid).y};securitySessionHistory.undo();ok(item(uid).x===x&&item(uid).y===y&&next()==='U2000','Ångra flytt behåller eget nästa nummer');securitySessionHistory.redo();ok(item(uid).x===moved.x&&item(uid).y===moved.y&&next()==='U2000','Gör om flytt behåller nästa nummer');
  }
  const firstBefore=item(first).x;drag(first,12,7);ok(item(first).x!==firstBefore&&next()==='U2000','Även en tidigare ruta i samma serie kan justeras');
  const oldBefore=JSON.stringify(old);drag(old.uid,20,14);ok(JSON.stringify(old)===oldBefore,'Äldre objekt utanför serien blir inte flyttbara');
  const beforeCancel=JSON.stringify(item(uid));drag(uid,-19,-9,'touch','pointercancel');ok(JSON.stringify(item(uid))===beforeCancel&&!drawingGestureLocked&&next()==='U2000','Avbruten beröring återställer position utan att förbruka nummer');drag(uid,12,9,'mouse','lostpointercapture');ok(JSON.stringify(item(uid))===beforeCancel&&!drawingGestureLocked,'Förlorat pekargrepp återställer positionen');
  const b=marker(uid),at=point(b);pointer(b,'pointerdown',at.x,at.y,81,'touch');pointer(b,'pointermove',at.x+20,at.y+10,81,'touch');pointer(b,'pointerdown',at.x+21,at.y+10,82,'touch');
  const touch=(type,points)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))});viewer.dispatchEvent(e)};
  touch('touchstart',[[at.x,at.y],[at.x+60,at.y]]);touch('touchmove',[[at.x-10,at.y],[at.x+70,at.y]]);touch('touchend',[]);await renderQueue;ok(JSON.stringify(item(uid))===beforeCancel&&!drawingGestureLocked&&next()==='U2000','Tvåfingerszoom avbryter flytten utan ändrat nummer eller position');
  drawingRotations[1]=0;zoom=1;await render(true);createItem('detector',.75,.75);ok(cur().id==='U2000'&&next()==='U2001','Efter flytt och zoom går det att placera nästa valda nummer');
  const savedItems=JSON.stringify(items),bytes=await exported(),work=await inspectSecurityWorkPdf(new Uint8Array(bytes));ok(JSON.stringify(work.work.items)===savedItems,'Arbets-PDF sparar flyttade positioner och oförändrade protokoll');
  $('detectorSequenceDone').click();ok(!markers.querySelector('.isPositioning')&&addType===null,'Avsluta stänger dragläget för serien');await tick(450);marker(uid).click();ok(document.body.dataset.view==='protocol','Efter Avsluta öppnar vanligt tryck protokollet');
  await load(bytes,'flyttad-serie-sparad.pdf');ok(JSON.stringify(items)===savedItems&&addType===null,'Återöppning behåller alla flyttade positioner utan aktiv serie');
  await load(raw,'flytta-exempel.pdf');start('U1033');createItem('detector',.3,.45);size('Width',220);size('Height',160);$('detectorSizeDone').click();createItem('detector',.6,.45);
  out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj QA';hide.onclick=()=>out.hidden=true;out.append(hide);
 })().catch(error=>{out.textContent+='FAIL '+error.message;console.error(error)});
})();
