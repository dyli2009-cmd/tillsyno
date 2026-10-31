/* Isolated integration fixture; load after the production application scripts. */
(()=>{
 const out=document.createElement('pre');out.id='qaSummaryIdentityResults';out.style='position:fixed;right:6px;top:80px;max-width:420px;max-height:70vh;overflow:auto;z-index:10000;background:white;padding:8px;font:11px monospace;white-space:pre-wrap';document.body.append(out);
 const ok=(value,label)=>{if(!value)throw Error(label);out.textContent+='PASS '+label+'\n';},compact=text=>text.replace(/\s+/g,'');
 async function texts(){const doc=reportDoc(),pdf=await pdfjsLib.getDocument({data:new Uint8Array(doc.output('arraybuffer'))}).promise,pages=[];for(let n=1;n<=pdf.numPages;n++)pages.push((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '));await pdf.destroy();return{pages,map:doc.__protocolPages};}
 (async()=>{
  await new Promise(resolve=>setTimeout(resolve,150));$('allProtocolDialog').close();AllInOneProtocols.set(['detector','lock']);const drawing=await PDFLib.PDFDocument.create();drawing.addPage([600,400]);
  await $('securityFile').onchange({target:{files:[new File([await drawing.save()],'summary-identities.pdf',{type:'application/pdf'})],value:''}});await renderQueue;
  const definitions=[['detector','1044','Siren','Entré','Inget ljud vid provning'],['detector','1057','Magnetkontakt','Bakdörr','Kabelanslutning justerad'],['lock','D-12','','Lager','Låset kärvar']];
  for(const[type,id,protocolLabel,location,note]of definitions){createItem(type,.2+items.length*.25,.5);Object.assign(cur(),{id,protocolLabel,location});cur().checks['1.1']={result:'remark',note};syncStatus(cur());}
  const [first,second,lock]=items;Object.assign(second,{remediationDescription:'Anslutning åtgärdad och funktion provad',remediationDate:'2026-10-31',remediationSignature:'TEST'});save();const original=JSON.stringify(items);showOverview();
  ok(document.querySelector('[data-uid="'+first.uid+'"] h3').textContent==='1044 – Siren','Appens översikt visar märkning och vald typ tillsammans');
  ok(document.querySelector('[data-uid="'+second.uid+'"] h3').textContent==='1057 – Magnetkontakt','Varje objekt får sin egen typ');
  ok(document.querySelector('[data-uid="'+lock.uid+'"] h3').textContent==='D-12 – '+SYSTEMS.lock.label,'Även övriga protokoll visar verkligt ID och rätt typ');
  let report=await texts(),summary=compact(report.pages.slice(0,Math.min(...Object.values(report.map))-1).join(' '));
  for(const o of items)ok(summary.includes(compact(o.id+' – '+(o.protocolLabel||SYSTEMS[o.type].label))),'Anmärkningsöversikten visar ID och typ för '+o.id);
  ok(summary.includes(compact('Entré'))&&summary.includes(compact('Inget ljud vid provning'))&&summary.includes(compact('Anslutning åtgärdad och funktion provad')),'Placering, anmärkning och utförd åtgärd finns kvar');
  ok(summary.includes('ÅTGÄRDAT')&&summary.includes('TEST'),'Åtgärdsstatus och signatur finns kvar');
  ok(report.pages[report.map[first.uid]-1].includes('1044 – Siren'),'Objektets kundprotokoll använder samma identitet');
  ok(JSON.stringify(items)===original,'Visning och PDF ändrar inga ID, kontroller eller positioner');
  selected=first.uid;showSelected();$('secType').value='Larmdon';$('secType').dispatchEvent(new Event('input',{bubbles:true}));report=await texts();ok(compact(report.pages[0]).includes(compact('1044 – Larmdon'))&&!compact(report.pages[0]).includes(compact('1044 – Siren')),'Namnbyte uppdaterar anmärkningsöversikten direkt');
  const longId='1044 / Entré till lager och verkstad, passage vid trapphus B',longType='Ljud- och ljussignal med separat indikering';first.id=longId;first.protocolLabel=longType;report=await texts();ok(compact(report.pages[0]).includes(compact(longId+' – '+longType)),'Långa märkningar och typer radbryts utan att kapas efter två rader');
  first.id='1044';first.protocolLabel='Siren';showSelected();save();showOverview();
  await openCustomerPreview(true);ok($('secPreviewDialog').open&&previewPage===1,'Kundförhandsvisningen öppnar anmärkningsöversikten');$('secPreviewClose').click();
  out.textContent+='ALL PASS';const hide=document.createElement('button');hide.textContent='Dölj test';hide.onclick=()=>out.hidden=true;out.append(hide);
 })().catch(error=>{out.textContent+='FAIL '+error.message;console.error(error);});
})();
