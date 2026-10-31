/* Isolated browser regression fixture. Load after application scripts, never in production. */
(()=>{
 const out=document.createElement('pre');out.id='qaDragResults';out.style='position:fixed;right:6px;top:80px;max-width:420px;max-height:70vh;overflow:auto;z-index:10000;background:white;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(value,text)=>{if(!value)throw Error(text);out.textContent+='PASS '+text+'\n';},tick=ms=>new Promise(r=>setTimeout(r,ms));
 function pointer(node,type,x,y,id=71,kind='mouse'){node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:kind,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}));}
 const point=node=>{const r=node.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
 const marker=uid=>markers.querySelector('[data-detector-uid="'+uid+'"]');
 function drag(uid,dx,dy,kind='mouse',end='pointerup'){const b=marker(uid),p=point(b);pointer(b,'pointerdown',p.x,p.y,71,kind);pointer(b,'pointermove',p.x+dx,p.y+dy,71,kind);pointer(b,end,p.x+dx,p.y+dy,71,kind);b.click();}
 (async()=>{
  await tick(150);$('allProtocolDialog').close();AllInOneProtocols.set(['detector']);const doc=await PDFLib.PDFDocument.create();doc.addPage([600,400]);const source=await doc.save();
  await $('securityFile').onchange({target:{files:[new File([source],'drag-fixture.pdf',{type:'application/pdf'})],value:''}});await renderQueue;await tick(180);await renderQueue;
  SecurityDetectorScan.open();$('detectorManual').click();$('detectorManualCode').value='42';$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));createItem('detector',.5,.5);await tick(120);await renderQueue;
  const uid=items[0].uid,curItem=()=>items.find(o=>o.uid===uid);curItem().checks['1.1'].result='ok';syncStatus(curItem());save();drawMarkers();
  ok(!$('detectorSizePanel').hidden&&marker(uid).classList.contains('isSizing'),'Manuell placering öppnar storleksläget med flyttbar ruta');
  const size=(axis,value)=>{const n=$('detector'+axis);n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));};
  size('Width',200);size('Height',150);const box=JSON.stringify(curItem().detectorBox),checks=JSON.stringify(curItem().checks);await setZoom(2);
  for(const [angle,kind]of [[0,'mouse'],[90,'touch'],[180,'mouse'],[270,'touch']]){
   drawingRotations[1]=angle;await render(true);await setZoom(2);const before=point(marker(uid)),x=curItem().x,y=curItem().y;drag(uid,31,17,kind);const after=point(marker(uid));
   ok(Math.abs(after.x-before.x-31)<1&&Math.abs(after.y-before.y-17)<1,'Rutan följer '+kind+' i rotering '+angle+'°');ok(!$('detectorSizePanel').hidden&&document.body.dataset.view==='drawing','Storleksläget ligger kvar efter flytt');
   ok(JSON.stringify(curItem().detectorBox)===box&&JSON.stringify(curItem().checks)===checks&&curItem().x===curItem().labelX&&curItem().y===curItem().labelY,'Flytt behåller storlek, identitet och kontroll');
   const moved={x:curItem().x,y:curItem().y};securitySessionHistory.undo();ok(curItem().x===x&&curItem().y===y&&JSON.stringify(curItem().detectorBox)===box,'En flytt kan ångras separat från storlek');securitySessionHistory.redo();ok(curItem().x===moved.x&&curItem().y===moved.y,'Flytten kan göras om');
  }
  const beforeCancel=JSON.stringify(curItem());drag(uid,-19,-9,'touch','pointercancel');ok(JSON.stringify(curItem())===beforeCancel&&!drawingGestureLocked,'Avbruten beröring återställer placeringen');
  drag(uid,12,9,'mouse','lostpointercapture');ok(JSON.stringify(curItem())===beforeCancel&&!drawingGestureLocked,'Förlorat pekargrepp lämnar ingen osparad flytt');
  const b=marker(uid),p=point(b);pointer(b,'pointerdown',p.x,p.y,81,'touch');pointer(b,'pointermove',p.x+20,p.y+10,81,'touch');pointer(b,'pointerdown',p.x+21,p.y+10,82,'touch');
  const touch=(type,points)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))});viewer.dispatchEvent(e);};
  touch('touchstart',[[p.x,p.y],[p.x+60,p.y]]);touch('touchmove',[[p.x-10,p.y],[p.x+70,p.y]]);touch('touchend',[]);await renderQueue;ok(JSON.stringify(curItem())===beforeCancel&&!drawingGestureLocked,'Tvåfingerszoom avbryter flytten utan att flytta objektet');
  size('Height',200);drag(uid,9,7);ok(coreValue(curItem())===200&&!$('detectorSizePanel').hidden,'Höjden kan justeras och rutan flyttas igen i samma läge');
  drawingRotations[1]=0;zoom=1;await render(true);const labels=['DET2','D1','AK','Entré 2 / ÅÄÖ','Zon A - 52','Lång egen märkning '.repeat(12).trim()];
  for(const [i,label]of labels.entries()){SecurityDetectorScan.open();$('detectorManual').click();const input=$('detectorManualCode');input.value=label;ok(input.checkValidity()&&!input.hasAttribute('pattern')&&input.inputMode!=='numeric','Textfältet tillåter egen märkning '+label.slice(0,20));$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));createItem('detector',.1+i*.15,.2);ok(items.at(-1).id===label&&marker(items.at(-1).uid).textContent===label,'Texten behålls exakt i stämpeln');}
  ok(items.at(-1).detectorBox.width<=.85,'Lång text behålls och ryms i en begränsad ruta');
  SecurityDetectorScan.open();$('detectorManual').click();$('detectorManualCode').value='   ';const count=items.length;$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));ok(!addType&&items.length===count,'Tom märkning skapar inget objekt');await SecurityDetectorScan.openSize(curItem());
  let blob;const url=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return url(b)};HTMLAnchorElement.prototype.click=function(){};try{await exportPdf();}finally{URL.createObjectURL=url;HTMLAnchorElement.prototype.click=click;}
  const bytes=await blob.arrayBuffer(),work=await inspectSecurityWorkPdf(new Uint8Array(bytes));ok(work.work.items[0].x===curItem().x&&JSON.stringify(work.work.items[0].detectorBox)===JSON.stringify(curItem().detectorBox),'Arbets-PDF sparar både position och storlek');
  $('detectorSizeDone').click();marker(uid).click();ok(document.body.dataset.view==='protocol','Klar återställer vanlig öppning av protokollet');
  await $('securityFile').onchange({target:{files:[new File([bytes],'drag-saved.pdf',{type:'application/pdf'})],value:''}});await renderQueue;if($('secOpenWorkDialog').open)$('secOpenContinue').click();await SecurityDetectorScan.openSize(curItem());ok(curItem().x===work.work.items[0].x&&statusOf(curItem())==='ok','Återöppning behåller flytt och kontroll');
  ok(labels.every(label=>items.some(o=>o.id===label)),'Arbets-PDF återöppnar alla egna texter, även DET2');out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj test';hide.onclick=()=>out.hidden=true;out.append(hide);
 })().catch(e=>{out.textContent+='FAIL '+e.message;console.error(e);});
 function coreValue(o){return DetectorScanCore.boxScale(o.detectorBox,'height',drawingRotation());}
})();
