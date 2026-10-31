/* Load after the production app scripts in an isolated preview, never in production. */
(()=>{
 const out=document.createElement('pre');out.id='qaProtocolNameResults';out.style='position:fixed;right:6px;top:80px;max-width:420px;max-height:70vh;overflow:auto;z-index:10000;background:white;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(value,label)=>{if(!value)throw Error(label);out.textContent+='PASS '+label+'\n';};
 const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const select=uid=>{selected=uid;showSelected();go('protocol');};
 const rename=value=>{const input=$('secType');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
 const identity=o=>JSON.stringify([o.uid,o.type,o.id,o.number,o.page,o.x,o.y,o.labelX,o.labelY,o.detectorBox,o.checks,o.status]);
 async function reportTexts(){const doc=reportDoc(),pdf=await pdfjsLib.getDocument({data:new Uint8Array(doc.output('arraybuffer'))}).promise;const texts={};for(const [uid,page]of Object.entries(doc.__protocolPages)){const content=await(await pdf.getPage(page)).getTextContent();texts[uid]=content.items.map(item=>item.str).join(' ');}await pdf.destroy();return texts;}
 (async()=>{
  await tick(150);$('allProtocolDialog').close();AllInOneProtocols.set(['detector','lock','fire_detector']);
  const drawing=await PDFLib.PDFDocument.create();drawing.addPage([600,400]);
  await $('securityFile').onchange({target:{files:[new File([await drawing.save()],'protocol-names.pdf',{type:'application/pdf'})],value:''}});await renderQueue;
  for(const [i,label]of ['52','57'].entries()){
   SecurityDetectorScan.open();$('detectorManual').click();$('detectorManualCode').value=label;$('detectorManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));createItem('detector',.25+i*.5,.4);$('detectorSizeDone').click();
  }
  const first=items[0].uid,second=items[1].uid;items[0].checks['1.1'].result='ok';syncStatus(items[0]);save();
  createItem('lock',.3,.7);const lock=cur().uid;createItem('fire_detector',.7,.7);const fire=cur().uid;
  select(first);const original=identity(cur());
  ok($('secType').value==='Detektorer'&&!$('secType').readOnly,'Befintligt detektornamn är redigerbart');
  rename('Siren');ok(cur().protocolLabel==='Siren'&&identity(cur())===original,'Siren sparas utan att ändra identitet, position eller kontroller');
  securitySessionHistory.undo();ok(!cur().protocolLabel&&$('secType').value==='Detektorer','Namnändringen kan ångras separat');
  securitySessionHistory.redo();ok(cur().protocolLabel==='Siren'&&$('secType').value==='Siren','Namnändringen kan göras om');
  select(second);ok($('secType').value==='Detektorer'&&!cur().protocolLabel,'Ett annat objekt behåller sitt eget protokollnamn');
  for(const uid of [lock,fire]){select(uid);const before=JSON.stringify(cur());ok($('secType').readOnly,'Andra protokolltyper behåller sina fasta namn');rename('Siren');ok(JSON.stringify(cur())===before,'Inmatning kan inte ändra andra protokolltyper');}
  select(first);rename('   ');ok(!cur().protocolLabel&&$('secType').value==='Detektorer','Tomt namn återgår till Detektorer');
  rename('detektorer');ok(!cur().protocolLabel,'Standardnamnet fungerar oavsett versaler');
  rename('Sirenprotokoll');let texts=await reportTexts();ok(texts[first].includes('SIRENPROTOKOLL')&&!texts[first].includes('SIRENPROTOKOLLPROTOKOLL'),'Ett färdigt protokollnamn dubblerar inte ordet protokoll');
  rename('Sire\u0301n');ok(cur().protocolLabel==='Sirén','Svenska tecken normaliseras utan att ändra namnet');texts=await reportTexts();ok(texts[first].includes('SIRÉNPROTOKOLL'),'Svenska tecken följer med till PDF-rubriken');
  rename('Siren');texts=await reportTexts();
  ok(texts[first].includes('SIRENPROTOKOLL')&&texts[second].includes('DETEKTORPROTOKOLL'),'Varje objekt får rätt rubrik i samma kund-PDF');
  ok(texts[lock].includes('LÅS & DÖRRMILJÖ')&&texts[fire].includes('BRANDDETEKTORER'),'Övriga kundprotokoll behåller sina rubriker');
  $('secOverviewSearch').value='Siren';showOverview();const cards=$('secOverviewList').querySelectorAll('article');ok(cards.length===1&&cards[0].dataset.uid===first&&cards[0].querySelector('h3').textContent.includes('Siren'),'Översikten visar och söker på det egna namnet');$('secOverviewSearch').value='';
  await openCustomerPreview();ok($('secPreviewDialog').open&&$('secPreviewTitle').textContent==='Siren · 52'&&previewMode==='report','Kundförhandsvisningen öppnar rätt objekt med eget namn');const previewText=(await(await previewPdf.getPage(previewPage)).getTextContent()).items.map(item=>item.str).join(' ');ok(previewText.includes('SIRENPROTOKOLL'),'Förhandsvisad PDF innehåller Sirenprotokoll');$('secPreviewClose').click();
  let blob;const createUrl=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=value=>{blob=value;return createUrl(value)};HTMLAnchorElement.prototype.click=function(){};
  try{await exportPdf();}finally{URL.createObjectURL=createUrl;HTMLAnchorElement.prototype.click=click;}
  ok(!!blob,'Arbets-PDF exporteras');const bytes=await blob.arrayBuffer(),saved=await inspectSecurityWorkPdf(new Uint8Array(bytes));
  ok(saved.work.items.find(o=>o.uid===first).protocolLabel==='Siren'&&!saved.work.items.find(o=>o.uid===second).protocolLabel,'Arbets-PDF sparar namnen per objekt');
  await $('securityFile').onchange({target:{files:[new File([bytes],'protocol-names-saved.pdf',{type:'application/pdf'})],value:''}});await renderQueue;if($('secOpenWorkDialog').open)$('secOpenContinue').click();select(first);
  ok($('secType').value==='Siren'&&identity(cur())===original,'Återöppnad ritning behåller namn, placering och kontroll');texts=await reportTexts();ok(texts[first].includes('SIRENPROTOKOLL')&&texts[second].includes('DETEKTORPROTOKOLL'),'Kund-PDF behåller rätt rubriker efter återöppning');
  out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj test';hide.onclick=()=>out.hidden=true;out.append(hide);
 })().catch(error=>{out.textContent+='FAIL '+error.message;console.error(error);});
})();
