/* Isolated browser QA only. Load after production scripts, never in the shipped app. */
(()=>{
 const params=new URLSearchParams(location.search),out=document.createElement('pre');out.id='qaResults';out.style='position:fixed;right:8px;top:75px;max-width:440px;max-height:65vh;overflow:auto;z-index:10000;background:white;color:#123;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(x,label)=>{if(!x)throw Error(label);out.textContent+='PASS '+label+'\n'},tick=ms=>new Promise(r=>setTimeout(r,ms));
 async function load(bytes,name){await $('securityFile').onchange({target:{files:[new File([bytes],name,{type:'application/pdf'})],value:''}});await renderQueue;if($('secOpenWorkDialog').open)$('secOpenContinue').click();await tick(120);await renderQueue}
 async function exported(){let blob;const url=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return url(b)};HTMLAnchorElement.prototype.click=function(){};try{await exportPdf()}finally{URL.createObjectURL=url;HTMLAnchorElement.prototype.click=click}return blob.arrayBuffer()}
 (async()=>{
  await tick(150);$('allProtocolDialog').close();AllInOneProtocols.set(['detector','lock']);AppTextScale.set(params.has('large')?6:0);
  document.documentElement.dataset.tillsynoTheme=params.get('theme')||'mist';document.documentElement.dataset.tillsynoDevice=params.get('device')||'auto';
  AllInOneProtocols.set(['automation']);await tick(100);ok(getComputedStyle($('secRotateLeft')).display==='none'&&!$('secRotate').querySelector('.securityToolGlyph'),'Andra områden behåller tidigare verktygsutseende');AllInOneProtocols.set(['detector','lock']);await tick(100);
  const doc=await PDFLib.PDFDocument.create(),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for(let n=0;n<2;n++){const p=doc.addPage([600,400]);p.drawText('EXEMPELRITNING – VERKTYG',{x:40,y:350,size:18,font});for(const [x,id]of [[80,'52'],[280,'56'],[480,'57']]){p.drawRectangle({x,y:180,width:34,height:24,borderWidth:1,borderColor:PDFLib.rgb(.1,.15,.2)});p.drawText(id,{x:x+6,y:186,size:14,font});}p.drawRectangle({x:40,y:60,width:520,height:250,borderWidth:1,borderColor:PDFLib.rgb(.25,.3,.35)});if(n)p.setRotation(PDFLib.degrees(90))}
  await load(await doc.save(),'verktyg-exempel.pdf');
  const detector=SecurityDetectorScan.newDetector({page:1,x:97/600,y:208/400,width:34/600,height:24/400,textHeight:14/400,angle:0,code:'52'});detector.checks['1.1'].result='ok';syncStatus(detector);save();drawMarkers();
  const before=JSON.stringify(items),left=$('secRotateLeft'),right=$('secRotate');
  ok(left&&!left.disabled&&left.getAttribute('aria-label').includes('vänster'),'Två aktiva rotationsknappar med namn');
  if(!params.has('layout')){
   await left.onclick();ok(drawingRotation()===270&&$('secRotationValue').textContent==='270°','Vänster från 0° till 270°');
   await right.onclick();ok(drawingRotation()===0,'Höger återställer 0°');
   for(let i=0;i<4;i++)await left.onclick();ok(drawingRotation()===0,'Fyra vänstervridningar ger ett helt varv');
   const pending=left.onclick();ok(left.disabled&&right.disabled,'Båda knappar låses under omritning');const rejected=await right.onclick();await pending;ok(rejected===false&&drawingRotation()===270&&!left.disabled&&!right.disabled,'Snabba dubbla tryck överlappar inte');
   const originalRender=render;let first=true;render=(...args)=>{if(first){first=false;return Promise.resolve(false)}return originalRender(...args)};try{await right.onclick()}finally{render=originalRender}ok(drawingRotation()===270&&!left.disabled,'Avbruten rendering återställer vinkel och knappar');
   page=2;zoom=1;await render(true);await left.onclick();ok(drawingRotation()===270&&pageWidth>pageHeight,'Vänstervridning fungerar med PDF:ens inbyggda 90°');
   page=1;zoom=1;await render(true);ok(drawingRotation()===270&&JSON.stringify(items)===before,'Sidor behåller egen rotation och objekten samma data');
   const bytes=await exported(),work=await inspectSecurityWorkPdf(new Uint8Array(bytes)),saved=await PDFLib.PDFDocument.load(bytes);ok(work.work.drawingRotations[1]===270&&work.work.drawingRotations[2]===270,'Arbets-PDF sparar båda sidornas vridning');ok(saved.getPage(0).getRotation().angle===270&&saved.getPage(1).getRotation().angle===0,'PDF-exportens synliga rotation följer vänstervridningen');
   await load(bytes,'verktyg-sparat.pdf');ok(drawingRotation()===270&&statusOf(items[0])==='ok'&&JSON.stringify(items)===before,'Återöppning behåller vridning, positioner och kontroller');
   await right.onclick();
   document.querySelector('.serviceToolLauncher').click();await tick(80);$('securityDetectorScan').click();ok(!$('securityDetectorScanPanel').hidden,'Skanna detektorer öppnar rätt panel');$('detectorClose').click();
  }
  const launch=document.querySelector('.serviceToolLauncher'),menu=document.querySelector('.serviceToolsMenu');if(menu.hidden)launch.click();await tick(100);
  for(const label of ['Enkeldörr','Linje / vägg','Text']){menu.querySelector('button[aria-label="'+label+'"]').click();ok(launch.classList.contains('serviceToolActive')&&menu.hidden,label+' aktiveras med befintlig funktion');launch.click();launch.click();await tick(30)}
  const r=menu.getBoundingClientRect(),buttons=[...menu.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height);
  ok(r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,'Verktygsmenyn ryms i vyn');ok(buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44}),'Menyknappar har minst 44 px tryckyta');ok([left,right].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1}),'Båda rotationsknapparna ryms med 44 px tryckyta');
  ok(menu.querySelector('#securityDetectorScan span').textContent.includes('Skanna')&&menu.querySelectorAll('.securityToolGlyph').length>=7,'Sammanhängande vektorikoner och läsbara verktygsnamn');
  msg('');out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj QA';hide.onclick=()=>out.style.display='none';out.append(hide);
  if(params.has('layout'))parent.postMessage({qaToolbar:true,result:out.textContent,width:innerWidth},location.origin);
 })().catch(e=>{out.textContent+='FAIL '+e.message;console.error(e);if(params.has('layout'))parent.postMessage({qaToolbar:true,result:out.textContent,width:innerWidth},location.origin)});
})();
