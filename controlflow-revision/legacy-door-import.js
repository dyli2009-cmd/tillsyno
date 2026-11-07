/* DÖRRAUTOMATIK ONLY — PERMANENT REGRESSION LOCK.
   This legacy Bluebeam import behavior belongs ONLY to Door Automation (Dörrautomatik).
   Do not reuse it for Security Service, Project Flow, or other protocol types.
   Confirmed working behavior in v2.4.193:
   P/GoTo = exact Door Automation protocol; matching blue Bluebeam callout/object text = same automation;
   the callout ARROW TIP is the authoritative new marker position even when far from P;
   after import the old Bluebeam annotation disappears and the new app marker/protocol link remains.
   DO NOT REMOVE, GENERALIZE, OR CHANGE THIS CONTRACT unless the user explicitly requests a Door Automation change.

/* LOCKED CORE BEHAVIOR — DO NOT REMOVE OR CHANGE WITHOUT EXPLICIT USER REQUEST.
   Door Automation legacy Service DA import contract:
   1) Bluebeam P/GoTo link selects the correct inspection protocol/checklist.
   2) The associated FreeTextCallout arrow TIP supplies the new automation marker x/y position.
   3) The callout text box supplies label position/text when available.
   4) Never fall back to the P-button center when a valid associated callout arrow exists.
   This behavior must remain intact through UI/refactors/version changes. */
/* Core legacy Door Automation PDF importer.
   REGRESSION CONTRACT: Service DA P/GoTo link chooses the inspection protocol.
   A nearby FreeTextCallout arrow tip chooses the exact drawing position; its text keeps the label position.
   Keep this behavior available in Kontrollflöde for 1–100+ automatics. */
const MODELS=[['11','Geze EMD standardarm'],['12','Geze EMD glidarm'],['13','Faac standard'],['14','Faac glidarm'],['15','Besam Powerswing'],['16','Besam SW100'],['17','Dorma ED 200'],['18','Tormax'],['19','Record standardarm'],['20','Powerswing pardörr'],['21','Geze TSA 160'],['22','Record glidarm'],['23','Gilgen FDC'],['24','Dorma ED 100'],['25','Besam SDE'],['26','Ditec hissmonterad'],['27','SR 2000'],['28','OVE'],['29','Dorma CD 80'],['30','Cibes hissöppnare'],['31','Geze TSA 160 dubbeldörr'],['32','Dorma ED 180'],['33','Geze EC Turn'],['34','Besam DHE'],['35','Entramatic PLS 100'],['36','Entramatic PLS 150'],['37','Dorma ED 250'],['38','Geze Powerdrive skjutdörr'],['39','Geze EC Drive skjutdörr'],['40','Geze SL skjutdörr'],['41','Faac 930 skjutdörr'],['42','Faac A140 skjutdörr'],['43','Dorma TS 93 + brandstängning'],['44','Dorma TS 93'],['45','Entramatic SW 300'],['46','Unislide dubbel flyglig'],['47','Unislide enkel flyglig'],['48','Entramatic SL500']];

const CHECKS=[['1.1','Samtal med nyttjaren.'],['1.2','Okulärbesiktning av dörrautomatik/dörrmiljö.'],['1.3','Kontroll av eventuella ombyggnader.'],['1.4','Kontroll fastsättning, infästning och eventuella efterdragningar av skruvar.'],['1.5','Funktionskontroll manuell och automatisk öppning (kraft, dämpning & hastighet).'],['1.6','Funktionskontroll manuell och automatisk stängning (kraft, dämpning & hastighet).'],['1.7','Funktionskontroll öppnings- & stängningstider.'],['1.8','Funktionskontroll av nödöppning & utrymning.'],['1.9','Funktionskontroll/justering koordinator och armsystem.'],['1.10','Funktionskontroll impulsgivare (radar, armbågskontakter etc).'],['1.11','Sensorlister och säkerhetsanordningar.'],['1.12','Funktionskontroll låsfunktioner (dörrblad, elslutbleck, motorlås, ellås, låshus).'],['1.13','Kontroll/justering uppställningsmagnet & dörrstopp.'],['1.14','Kontroll gummiupphängningar, fjädrar, tryckslangar & tätning.'],['1.15','Kontroll motor, pump, hydraulik och drivaxel.'],['1.16','Kontroll säkringar / programväljare / styrmodul.'],['1.17','Behovsrengöring dörrautomatik och sensorlister.'],['1.18','Mindre justering.']];

window.inspectLegacyLinkedPdf=async function(bytes,fileName,onProgress=()=>{}){
 let scan=null;
 const cleanName=name=>String(name||'').split('#')[0].replace(/\(\d+\)$/,'').trim().toLocaleLowerCase('sv');
 const cleanValue=value=>{
  if(value===undefined||value===null)return '';
  const text=(Array.isArray(value)?value.join(' '):String(value)).trim();
  return /^(?:off|\.)$/i.test(text)?'':text
 };
 const getField=(fields,...names)=>{
  for(const name of names){const value=fields.get(cleanName(name));if(value)return value}
  return ''
 };
 const collectFields=annotations=>{
  const fields=new Map();
  for(const a of annotations||[]){
   if(!a?.fieldName)continue;
   const key=cleanName(a.fieldName),value=cleanValue(a.fieldValue);
   if(key&&value&&!fields.has(key))fields.set(key,value)
  }
  return fields
 };
 const resolveDest=async dest=>{
  try{
   let explicit=dest;
   if(typeof explicit==='string')explicit=await scan.getDestination(explicit);
   if(!Array.isArray(explicit)||!explicit[0])return null;
   const ref=explicit[0];
   if(Number.isInteger(ref))return ref+1;
   if(ref&&typeof ref==='object'&&Number.isInteger(ref.num))return (await scan.getPageIndex(ref))+1;
  }catch(e){}
  return null
 };
 const targetFromActionText=async value=>{
  const text=String(value||'');
  let m=text.match(/#page=(\d+)/i);if(m)return Number(m[1]);
  m=text.match(/(?:this\s*\.\s*)?pageNum\s*=\s*(\d+)/i);if(m)return Number(m[1])+1;
  m=text.match(/gotoNamedDest\s*\(\s*["']([^"']+)["']/i);if(m)return await resolveDest(m[1]);
  return null
 };
 const targetFromPdfJsAnnotation=async a=>{
  if(a?.dest){const page=await resolveDest(a.dest);if(page)return page}
  for(const value of [a?.url,a?.unsafeUrl,a?.action]){
   const page=await targetFromActionText(value);if(page)return page
  }
  try{
   if(a?.actions){const page=await targetFromActionText(JSON.stringify(a.actions));if(page)return page}
  }catch(e){}
  return null
 };
 const annotationText=a=>{
  const values=[a?.contentsObj?.str,a?.contents,a?.titleObj?.str,a?.title,a?.fieldName,a?.fieldValue,a?.alternativeText,a?.buttonValue,a?.url,a?.unsafeUrl,a?.action];
  try{if(a?.actions)values.push(JSON.stringify(a.actions))}catch(e){}
  return values.filter(v=>v!==undefined&&v!==null).map(v=>Array.isArray(v)?v.join(' '):String(v)).join(' ')
 };
 const idPattern=/\b\d{4,}(?:-\d+){2,4}\b/g;
 const idsInText=text=>[...new Set((String(text||'').match(idPattern)||[]).map(x=>x.trim()))];
 const parseId=id=>{
  const parts=String(id||'').trim().split('-').map(x=>x.trim()).filter(Boolean);
  if(parts.length<3)return {prefix:'',modelCode:'',serial:''};
  const modelCode=parts.at(-2),rawSerial=parts.at(-1),serialMatch=String(rawSerial).match(/\d+/);
  return {prefix:parts.slice(0,-2).join('-'),modelCode,serial:serialMatch?serialMatch[0]:rawSerial}
 };
 const majority=values=>{
  const counts=new Map();for(const value of values.filter(Boolean))counts.set(value,(counts.get(value)||0)+1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||''
 };
 const allProtocolFields=protocolMap=>[...protocolMap.values()].map(p=>p?.fields).filter(Boolean);
 const projectField=(fieldMaps,...names)=>{
  const values=[];
  for(const fields of fieldMaps){const value=getField(fields,...names);if(value)values.push(value)}
  return majority(values)||values[0]||''
 };

 // Proven importer used when the first linked legacy PDFs (including large school files)
 // were successfully brought into Door Automation. Keep this as the first path.
 const tryClassicLinkedImport=async()=>{
  let classicScan=null;
  try{
   if(!window.PDFLib)return null;
   classicScan=await pdfjsLib.getDocument({data:bytes.slice()}).promise;scan=classicScan;
   const {PDFDocument,PDFName,PDFDict,PDFArray,PDFNumber}=PDFLib,classicSource=await PDFDocument.load(bytes,{updateMetadata:false}),classicPages=classicSource.getPages();
   const classicRefMap=new Map(classicPages.map((p,i)=>[String(p.ref),i+1]));
   const classicLookup=obj=>{try{return obj?classicSource.context.lookup(obj):null}catch(e){return obj||null}};
   const classicNumber=obj=>{const value=classicLookup(obj);try{if(value instanceof PDFNumber)return value.asNumber();if(typeof value?.asNumber==='function')return value.asNumber()}catch(e){}const n=Number(String(value||''));return Number.isFinite(n)?n:null};
   const classicText=obj=>{const value=classicLookup(obj);if(!value)return '';try{if(typeof value.decodeText==='function')return value.decodeText()}catch(e){}try{if(typeof value.asString==='function')return value.asString().replace(/^\//,'')}catch(e){}return String(value).replace(/^\//,'')};
   const classicRect=dict=>{const arr=classicLookup(dict?.get?.(PDFName.of('Rect')));if(!(arr instanceof PDFArray)||arr.size()<4)return null;const out=[0,1,2,3].map(i=>classicNumber(arr.get(i)));return out.every(Number.isFinite)?out:null};
   const classicDestPage=dest=>{
    const value=classicLookup(dest);if(!(value instanceof PDFArray)||!value.size())return null;
    const first=value.get(0),direct=classicRefMap.get(String(first))||classicRefMap.get(String(classicLookup(first)));if(direct)return direct;
    const n=classicNumber(first);return Number.isInteger(n)&&n>=0&&n<classicScan.numPages?n+1:null
   };
   const classicPageData=pageNo=>{
    const page=classicPages[pageNo-1],links=[],callouts=[];if(!page)return {links,callouts};
    let annots=null;try{annots=page.node.lookup(PDFName.of('Annots'),PDFArray)}catch(e){}
    if(!(annots instanceof PDFArray))return {links,callouts};
    for(let i=0;i<annots.size();i++){
     const dict=classicLookup(annots.get(i));if(!(dict instanceof PDFDict))continue;
     const rect=classicRect(dict);if(!rect)continue;
     const subtype=classicText(dict.get(PDFName.of('Subtype'))),intent=classicText(dict.get(PDFName.of('IT')));
     if(subtype==='FreeText'&&intent==='FreeTextCallout'){
      const cl=classicLookup(dict.get(PDFName.of('CL'))),points=[];
      if(cl instanceof PDFArray)for(let j=0;j<cl.size();j++){const n=classicNumber(cl.get(j));if(Number.isFinite(n))points.push(n)}
      const text=classicText(dict.get(PDFName.of('Contents')))||classicText(dict.get(PDFName.of('RC')));
      if(points.length>=2)callouts.push({drawingPage:pageNo,rect,points,text})
     }
     const action=classicLookup(dict.get(PDFName.of('A')));
     if(action instanceof PDFDict){
      const targetPage=classicDestPage(action.get(PDFName.of('D')));
      if(targetPage&&targetPage!==pageNo)links.push({drawingPage:pageNo,targetPage,rect,source:'bluebeam-action'})
     }
     const directTarget=classicDestPage(dict.get(PDFName.of('Dest')));
     if(directTarget&&directTarget!==pageNo)links.push({drawingPage:pageNo,targetPage:directTarget,rect,source:'bluebeam-dest'})
    }
    return {links,callouts}
   };
   const rectDistance=(a,b)=>{
    const ax=(a[0]+a[2])/2,ay=(a[1]+a[3])/2,bx=Math.max(b[0],Math.min(ax,b[2])),by=Math.max(b[1],Math.min(ay,b[3]));
    return Math.hypot(ax-bx,ay-by)
   };
   const linkedPages=[],rawLinks=[],classicCallouts=[];let seen=false,gap=0;
   const scanLimit=Math.min(classicScan.numPages,30);
   for(let pageNo=1;pageNo<=scanLimit;pageNo++){
    onProgress('Läser gamla dörrkopplingar… sida '+pageNo+' / '+scanLimit);
    const pg=await classicScan.getPage(pageNo),annotations=await pg.getAnnotations({intent:'any'}),viewport=pg.getViewport({scale:1});
    const candidates=annotations.filter(a=>a?.fieldType==='Btn'&&!a.checkBox&&!a.radioButton&&Array.isArray(a.rect));
    const resolved=[];
    for(const a of candidates){
     const targetPage=await targetFromPdfJsAnnotation(a);
     if(targetPage&&targetPage!==pageNo)resolved.push({targetPage,rect:a.rect,source:'pdfjs-button'})
    }
    const direct=classicPageData(pageNo);classicCallouts.push(...direct.callouts);direct.links.forEach(item=>resolved.push(item));
    const seenKeys=new Set(),uniqueResolved=resolved.filter(item=>{const key=[item.targetPage,...item.rect.map(n=>Math.round(n*10)/10)].join(':');if(seenKeys.has(key))return false;seenKeys.add(key);return true});
    if(uniqueResolved.length){
     seen=true;gap=0;linkedPages.push({originalPage:pageNo,viewport});
     uniqueResolved.forEach(item=>rawLinks.push({drawingPage:pageNo,...item}))
    }else if(seen&&++gap>=5)break
   }
   if(rawLinks.length<1)return null;

   const targets=[...new Set(rawLinks.map(x=>x.targetPage))].sort((a,b)=>a-b),protocols=new Map();
   for(let start=0;start<targets.length;start+=8){
    const batch=targets.slice(start,start+8);
    onProgress('Läser länkade gamla protokoll… '+Math.min(start+batch.length,targets.length)+' / '+targets.length);
    await Promise.all(batch.map(async targetPage=>{
     const pg=await classicScan.getPage(targetPage),annotations=await pg.getAnnotations({intent:'any'}),fields=collectFields(annotations);
     const id=getField(fields,'Id nummermaskin');
     if(id)protocols.set(targetPage,{id,fields})
    }))
   }

   const validLinks=rawLinks.filter(link=>protocols.has(link.targetPage));
   if(validLinks.length<1)return null;
   const drawingNumbers=[...new Set(validLinks.map(x=>x.drawingPage))].sort((a,b)=>a-b),
         pageMap=new Map(drawingNumbers.map((n,i)=>[n,i+1])),
         viewportMap=new Map(linkedPages.map(x=>[x.originalPage,x.viewport])),
         used=new Set(),doors=[];

   for(const link of validLinks){
    const protocol=protocols.get(link.targetPage),id=protocol?.id;
    if(!id||used.has(id))continue;used.add(id);
    const viewport=viewportMap.get(link.drawingPage);if(!viewport)continue;
    const pageCallouts=classicCallouts.filter(item=>item.drawingPage===link.drawingPage&&idsInText(item.text).length);
    // LOCKED MATCHING: prefer the Bluebeam callout whose printed object/ID equals
    // the Id nummermaskin on the protocol reached by this P/GoTo link.
    // Only older drawings without that ID may use nearest-callout fallback.
    const exactCallouts=pageCallouts.filter(item=>idsInText(item.text).some(value=>cleanValue(value)===cleanValue(id)));
    const nearby=(exactCallouts.length?exactCallouts:pageCallouts).sort((a,b)=>rectDistance(link.rect,a.rect)-rectDistance(link.rect,b.rect))[0]||null;
    const exactCalloutMatch=!!(nearby&&exactCallouts.includes(nearby));
    const vr=viewport.convertToViewportRectangle(link.rect);let x=Math.max(0,Math.min(1,((vr[0]+vr[2])/2)/viewport.width)),y=Math.max(0,Math.min(1,((vr[1]+vr[3])/2)/viewport.height)),labelX,labelY,legacyLabelText='';
    // Exact object-ID match is authoritative even when the Bluebeam text box is far from P.
    // Distance is only a safety limit for the old nearest-callout fallback.
    const useCallout=nearby&&(exactCalloutMatch||rectDistance(link.rect,nearby.rect)<=Math.max(90,Math.min(viewport.width,viewport.height)*.12));
    if(useCallout){
     const tip=viewport.convertToViewportPoint(nearby.points[0],nearby.points[1]),lr=viewport.convertToViewportRectangle(nearby.rect);
     x=Math.max(0,Math.min(1,tip[0]/viewport.width));y=Math.max(0,Math.min(1,tip[1]/viewport.height));
     labelX=Math.max(0,Math.min(1,((lr[0]+lr[2])/2)/viewport.width));labelY=Math.max(0,Math.min(1,((lr[1]+lr[3])/2)/viewport.height));legacyLabelText=nearby.text||''
    }
    const parsed=parseId(id),modelEntry=MODELS.find(([code])=>String(code)===String(parsed.modelCode)),checks={};
    CHECKS.forEach(([n])=>checks[n]={result:'',note:''});
    doors.push(normalize({
     uid:'legacy:'+link.targetPage+':'+id,id,machineId:id,page:pageMap.get(link.drawingPage),x,y,labelX,labelY,
     serialNumber:String(Number(parsed.serial||doors.length+1)),modelCode:parsed.modelCode||'',model:modelEntry?.[1]||'',idMode:'manual',legacyLabelText,legacyPlacementSource:useCallout?(exactCalloutMatch?'bluebeam-callout-id':'bluebeam-callout-nearest'):'bluebeam-button',legacyCalloutMatchedById:exactCalloutMatch,
     location:getField(protocol.fields,'Placering/Dörrlittra'),ao:'',nextDate:'',signature:'',status:'untested',notes:'',checks,remediationDate:'',remediationSignature:'',
     previousServiceDate:getField(protocol.fields,'Datum'),previousNextDate:getField(protocol.fields,'näst datum','Nästa provning datum'),previousOrder:getField(protocol.fields,'Order').replace(/,00$/,''),legacyProtocolPage:link.targetPage
    }))
   }
   if(doors.length<1)return null;
   doors.sort((a,b)=>a.page-b.page||a.id.localeCompare(b.id,'sv',{numeric:true}));

   const fieldMaps=allProtocolFields(protocols),prefixes=doors.map(d=>parseId(d.id).prefix),facilityNo=majority(prefixes),serials=doors.map(d=>Number(d.serialNumber)||0),
         oldOrder=projectField(fieldMaps,'Order','AO nummer','Ao nummer','Ordernummer').replace(/,00$/,''),
         oldServiceDate=projectField(fieldMaps,'Datum','Bokat besök datum','Servicedatum'),
         oldNextDate=projectField(fieldMaps,'näst datum','Nästa provning datum','Nästa datum'),
         projectName=String(fileName||'').replace(/\.pdf$/i,'').replace(/^service\s+da\s+/i,'').replace(/^service\s+/i,'').trim();

   const project={
    projectName,
    facilityNo:projectField(fieldMaps,'Anläggningsnummer','Objektnummer','Objekt nr','Text26')||facilityNo,
    customer:projectField(fieldMaps,'beställare kund','företag kund','Beställare','Kund','Företag'),
    agreementNo:projectField(fieldMaps,'Avtalsnummer','Avtal','Avtals nr'),
    contact:projectField(fieldMaps,'kontakt kund','Kontaktperson','Beställarkontakt'),
    projectOrder:oldOrder,
    inspectionDate:oldServiceDate||doorLocalToday(),projectNextDate:oldNextDate,previousServiceDate:oldServiceDate,previousOrder:oldOrder,
    company:projectField(fieldMaps,'företag heras','företag service','serviceföretag','Utförande företag'),
    companyContact:projectField(fieldMaps,'kontakt heras','kontakt service','kontaktman på objektet','kontakt f','kontakt g'),
    companyPhone:projectField(fieldMaps,'telefon heras','telefon service','tel g','Företag telefon'),
    companyAddress:projectField(fieldMaps,'adress heras','adress service','adress g','Företag adress'),
    companyPostalCode:projectField(fieldMaps,'postnr heras','postnr service','postnr g','Företag postnummer'),
    companyPostalCity:projectField(fieldMaps,'post adress heras','postadress heras','postadress service','post g','Företag postadress'),
    phone:projectField(fieldMaps,'telefon kund','tel','Kund telefon'),
    address:projectField(fieldMaps,'adress kund','adress','Kund adress'),
    postalCode:projectField(fieldMaps,'postnr kund','postnr','Kund postnummer'),
    postalCity:projectField(fieldMaps,'postadress kund','postadress','Kund postadress'),
    technician:projectField(fieldMaps,'Servicetekniker','Tekniker'),serviceSignature:'',
    nextDoorNumber:Math.max(0,...serials)+1
   };

   onProgress('Gamla kopplingar hittade – bygger '+doors.length+' automatiker…');
   const source=classicSource,output=await PDFDocument.create(),copied=await output.copyPages(source,drawingNumbers.map(n=>n-1));
   copied.forEach(pg=>{pg.node.delete(PDFName.of('Annots'));output.addPage(pg)});
   try{output.catalog.delete(PDFName.of('AcroForm'))}catch(e){}
   const drawingBytes=new Uint8Array(await output.save());

   const perDrawing=drawingNumbers.map((originalPage,index)=>{
    const count=validLinks.filter(link=>link.drawingPage===originalPage).length;
    return 'Ritning '+(index+1)+': '+count+' automatik'+(count===1?'':'er')
   }).join(' · ');
   const projectKeys=['facilityNo','customer','agreementNo','contact','projectOrder','inspectionDate','projectNextDate','company','companyContact','companyPhone','companyAddress','companyPostalCode','companyPostalCity','phone','address','postalCode','postalCity'],
         projectFieldCount=projectKeys.filter(k=>String(project[k]||'').trim()).length;
   return {
    drawingBytes,
    work:{version:2,doors,importQueue:[],project,logoData:''},
    classicImport:true,
    summaryText:'Klassisk Bluebeam-koppling använd. '+doors.length+' automatiker hittades och placerades. '+doors.filter(d=>String(d.legacyPlacementSource||'').startsWith('bluebeam-callout')).length+' fick position från gammal text/pil, varav '+doors.filter(d=>d.legacyPlacementSource==='bluebeam-callout-id').length+' matchades direkt på samma objekt-ID som P-protokollet. '+perDrawing+'. Projektfält ifyllda: '+projectFieldCount+'.'
   }
  }catch(error){
   console.warn('Klassisk äldre PDF-import misslyckades',error);
   return null
  }finally{
   if(classicScan){try{await classicScan.destroy()}catch(e){}}
   if(scan===classicScan)scan=null
  }
 };

 try{
  const classic=await tryClassicLinkedImport();
  if(classic)return classic;
  if(!window.PDFLib)throw new Error('PDF-biblioteket saknas.');
  scan=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  const {PDFDocument,PDFName,PDFDict,PDFArray,PDFNumber,PDFRawStream,decodePDFRawStream}=PDFLib,source=await PDFDocument.load(bytes,{updateMetadata:false}),lowPages=source.getPages();
  const pageRefMap=new Map(lowPages.map((p,i)=>[String(p.ref),i+1]));
  const lookup=obj=>{try{return obj?source.context.lookup(obj):null}catch(e){return obj||null}};
  const objectText=obj=>{
   const value=lookup(obj);if(!value)return '';
   try{if(value instanceof PDFRawStream)return new TextDecoder().decode(decodePDFRawStream(value).decode())}catch(e){}
   try{if(typeof value.decodeText==='function')return value.decodeText()}catch(e){}
   try{if(typeof value.asString==='function')return value.asString().replace(/^\//,'')}catch(e){}
   return String(value).replace(/^\//,'')
  };
  const objectNumber=obj=>{
   const value=lookup(obj);try{if(value instanceof PDFNumber)return value.asNumber();if(typeof value?.asNumber==='function')return value.asNumber()}catch(e){}
   const n=Number(String(value||''));return Number.isFinite(n)?n:null
  };
  const lowDestTarget=async dest=>{
   if(!dest)return null;
   const direct=pageRefMap.get(String(dest));if(direct)return direct;
   const value=lookup(dest);
   if(value instanceof PDFArray){
    if(!value.size())return null;
    const first=value.get(0),directFirst=pageRefMap.get(String(first));if(directFirst)return directFirst;
    const firstValue=lookup(first),directLookup=pageRefMap.get(String(firstValue));if(directLookup)return directLookup;
    const n=objectNumber(first);if(Number.isInteger(n)&&n>=0&&n<scan.numPages)return n+1;
    const name=objectText(first);if(name){const resolved=await resolveDest(name);if(resolved)return resolved}
    return null
   }
   const name=objectText(value);if(name){const resolved=await resolveDest(name);if(resolved)return resolved}
   return null
  };
  const lowActionTarget=async(action,depth=0)=>{
   if(!action||depth>5)return null;
   const value=lookup(action);
   if(value instanceof PDFArray){
    for(let i=0;i<value.size();i++){const target=await lowActionTarget(value.get(i),depth+1);if(target)return target}
    return null
   }
   if(!(value instanceof PDFDict))return await targetFromActionText(objectText(value));
   const direct=await lowDestTarget(value.get(PDFName.of('D')));if(direct)return direct;
   const js=objectText(value.get(PDFName.of('JS')));if(js){const target=await targetFromActionText(js);if(target)return target}
   const next=value.get(PDFName.of('Next'));if(next){const target=await lowActionTarget(next,depth+1);if(target)return target}
   return null
  };
  const lowAnnotationTarget=async dict=>{
   let current=dict;
   for(let depth=0;current instanceof PDFDict&&depth<5;depth++){
    const direct=await lowDestTarget(current.get(PDFName.of('Dest')));if(direct)return direct;
    const action=await lowActionTarget(current.get(PDFName.of('A')));if(action)return action;
    const aa=lookup(current.get(PDFName.of('AA')));
    if(aa instanceof PDFDict){
     for(const key of ['U','D','E','X','Fo','Bl','PO','PC','PV','PI','K','F','V','C']){
      const target=await lowActionTarget(aa.get(PDFName.of(key)));if(target)return target
     }
    }
    current=lookup(current.get(PDFName.of('Parent')))
   }
   return null
  };
  const lowRect=dict=>{
   const rect=lookup(dict?.get?.(PDFName.of('Rect')));if(!(rect instanceof PDFArray)||rect.size()<4)return null;
   const values=[0,1,2,3].map(i=>objectNumber(rect.get(i)));return values.every(Number.isFinite)?values:null
  };
  const lowFieldPair=dict=>{
   let current=dict,name='',value='';
   for(let depth=0;current instanceof PDFDict&&depth<8;depth++){
    if(!name){const raw=current.get(PDFName.of('T'));if(raw)name=objectText(raw)}
    if(!value){const raw=current.get(PDFName.of('V'))||current.get(PDFName.of('DV'));if(raw)value=objectText(raw)}
    current=lookup(current.get(PDFName.of('Parent')))
   }
   return {name,value:cleanValue(value)}
  };
  const lowFieldsForPage=pageNo=>{
   const fields=new Map(),page=lowPages[pageNo-1];if(!page)return fields;
   let annots=null;try{annots=page.node.lookup(PDFName.of('Annots'),PDFArray)}catch(e){}
   if(!(annots instanceof PDFArray))return fields;
   for(let i=0;i<annots.size();i++){
    const dict=lookup(annots.get(i));if(!(dict instanceof PDFDict))continue;
    const pair=lowFieldPair(dict),key=cleanName(pair.name);
    if(key&&pair.value&&!fields.has(key))fields.set(key,pair.value)
   }
   return fields
  };
  const mergeFields=(primary,secondary)=>{for(const [key,value] of secondary||[]){if(value&&!primary.has(key))primary.set(key,value)}return primary};
  const fieldsFromPageText=async pg=>{
   const fields=new Map();
   try{
    const tc=await pg.getTextContent(),txt=tc.items.map(x=>String(x.str||'')).join(' ').replace(/\s+/g,' ');
    const id=(txt.match(/\b\d{4,}(?:-\d+){2,4}\b/)||[])[0]||'';
    if(id)fields.set(cleanName('Id nummermaskin'),id);
    const date=(txt.match(/\b20\d{2}-\d{2}-\d{2}\b/)||[])[0]||'';if(date)fields.set(cleanName('Datum'),date)
   }catch(e){}
   return fields
  };
  const lowAnnotationText=dict=>{
   const values=[];let current=dict;
   for(let depth=0;current instanceof PDFDict&&depth<6;depth++){
    for(const key of ['Contents','T','TU','TM','V','DV']){
     const raw=current.get(PDFName.of(key));if(raw)values.push(objectText(raw))
    }
    current=lookup(current.get(PDFName.of('Parent')))
   }
   return values.filter(Boolean).join(' ')
  };
  const lowLinksForPage=async pageNo=>{
   const page=lowPages[pageNo-1];if(!page)return {links:[],markers:[]};
   let annots=null;try{annots=page.node.lookup(PDFName.of('Annots'),PDFArray)}catch(e){}
   if(!(annots instanceof PDFArray))return {links:[],markers:[]};
   const links=[],markers=[];
   for(let i=0;i<annots.size();i++){
    const dict=lookup(annots.get(i));if(!(dict instanceof PDFDict))continue;
    const rect=lowRect(dict);if(!rect)continue;
    const text=lowAnnotationText(dict),ids=idsInText(text);
    if(ids.length)markers.push({drawingPage:pageNo,rect,text,ids,source:'pdf-structure-label'});
    const targetPage=await lowAnnotationTarget(dict);
    if(targetPage&&targetPage!==pageNo)links.push({drawingPage:pageNo,targetPage,rect,source:'pdf-structure'})
   }
   return {links,markers}
  };

  const protocols=new Map(),rawLinks=[],rawMarkers=[],viewportMap=new Map(),pageKinds=new Map(),total=Math.min(scan.numPages,lowPages.length||scan.numPages);
  for(let pageNo=1;pageNo<=total;pageNo++){
   onProgress('Analyserar äldre PDF… sida '+pageNo+' / '+total);
   const pg=await scan.getPage(pageNo),annotations=await pg.getAnnotations({intent:'any'}),viewport=pg.getViewport({scale:1}),fields=collectFields(annotations);
   mergeFields(fields,lowFieldsForPage(pageNo));
   let pageText='';try{const tc=await pg.getTextContent();pageText=tc.items.map(x=>String(x.str||'')).join(' ').replace(/\s+/g,' ')}catch(e){}
   let id=getField(fields,'Id nummermaskin');
   if(!id){mergeFields(fields,await fieldsFromPageText(pg));id=getField(fields,'Id nummermaskin')}
   const upper=pageText.toUpperCase(),isProtocol=!!id||upper.includes('CHECKLISTA REVISION AV DÖRRAUTOMATIK'),isOverview=!isProtocol&&(upper.includes('EGENKONTROLL DÖRRAUTOMATIK')||upper.includes('DÖRR NR: ANMÄRKNING')||upper.includes('DÖRR NR ANMÄRKNING'));
   pageKinds.set(pageNo,isProtocol?'protocol':isOverview?'overview':'drawing');
   viewportMap.set(pageNo,viewport);
   if(id)protocols.set(pageNo,{id,fields});
   for(const a of annotations||[]){
    if(!Array.isArray(a?.rect))continue;
    const text=annotationText(a),ids=idsInText(text);
    if(ids.length)rawMarkers.push({drawingPage:pageNo,rect:a.rect,text,ids,source:'pdfjs-label'});
    const targetPage=await targetFromPdfJsAnnotation(a);
    if(targetPage&&targetPage!==pageNo)rawLinks.push({drawingPage:pageNo,targetPage,rect:a.rect,source:'pdfjs'})
   }
   const low=await lowLinksForPage(pageNo);rawLinks.push(...low.links);rawMarkers.push(...low.markers)
  }
  if(protocols.size<1)return null;

  // Old Acrobat drawings often keep the machine ID in the callout itself even when the button action is unreadable.
  const protocolById=new Map([...protocols.entries()].map(([pageNo,p])=>[String(p.id).trim(),pageNo]));
  for(const marker of rawMarkers){
   if(pageKinds.get(marker.drawingPage)!=='drawing')continue;
   for(const markerId of marker.ids||[]){
    const targetPage=protocolById.get(String(markerId).trim());
    if(targetPage)rawLinks.push({drawingPage:marker.drawingPage,targetPage,rect:marker.rect,source:marker.source+'-id-match'})
   }
  }

  const deduped=[],linkKeys=new Set();
  for(const link of rawLinks){
   if(!Number.isInteger(link.targetPage)||!Array.isArray(link.rect)||link.rect.length<4)continue;
   const key=[link.drawingPage,link.targetPage,...link.rect.slice(0,4).map(n=>Math.round(Number(n)*10)/10)].join(':');
   if(linkKeys.has(key))continue;linkKeys.add(key);deduped.push(link)
  }
  const protocolPages=[...protocols.keys()].sort((a,b)=>a-b),validLinks=deduped.filter(link=>protocols.has(link.targetPage)&&pageKinds.get(link.drawingPage)==='drawing');
  let drawingNumbers=[...pageKinds.entries()].filter(([,kind])=>kind==='drawing').map(([n])=>n).sort((a,b)=>a-b);
  if(!drawingNumbers.length){
   const firstProtocolPage=protocolPages[0];
   drawingNumbers=firstProtocolPage>1?Array.from({length:firstProtocolPage-1},(_,i)=>i+1).filter(n=>!protocols.has(n)):[];
  }
  if(!drawingNumbers.length)return null;
  const pageMap=new Map(drawingNumbers.map((n,i)=>[n,i+1]));

  const makeDoorTemplate=(targetPage,protocol)=>{
   const id=protocol.id,parsed=parseId(id),modelEntry=MODELS.find(([code])=>String(code)===String(parsed.modelCode)),checks={};CHECKS.forEach(([n])=>checks[n]={result:'',note:''});
   return {
    uid:'legacy:'+targetPage+':'+id,id,machineId:id,
    serialNumber:String(Number(parsed.serial||targetPage)),modelCode:parsed.modelCode||'',model:modelEntry?.[1]||'',idMode:'manual',
    location:getField(protocol.fields,'Placering/Dörrlittra'),ao:'',nextDate:'',signature:'',status:'untested',notes:'',checks,remediationDate:'',remediationSignature:'',
    previousServiceDate:getField(protocol.fields,'Datum'),previousNextDate:getField(protocol.fields,'näst datum','Nästa provning datum'),previousOrder:getField(protocol.fields,'Order').replace(/,00$/,''),legacyProtocolPage:targetPage
   }
  };

  const usedPages=new Set(),usedIds=new Set(),doors=[];
  for(const link of validLinks){
   const protocol=protocols.get(link.targetPage),id=protocol?.id;if(!protocol||!id||usedIds.has(id)||!pageMap.has(link.drawingPage))continue;
   const viewport=viewportMap.get(link.drawingPage);if(!viewport)continue;
   const vr=viewport.convertToViewportRectangle(link.rect),x=Math.max(0,Math.min(1,((vr[0]+vr[2])/2)/viewport.width)),y=Math.max(0,Math.min(1,((vr[1]+vr[3])/2)/viewport.height));
   const template=makeDoorTemplate(link.targetPage,protocol);
   doors.push(normalize({...template,page:pageMap.get(link.drawingPage),x,y}));usedPages.add(link.targetPage);usedIds.add(id)
  }
  const importQueue=[];
  for(const targetPage of protocolPages){
   if(usedPages.has(targetPage))continue;
   const protocol=protocols.get(targetPage);if(!protocol?.id||usedIds.has(protocol.id))continue;
   importQueue.push(makeDoorTemplate(targetPage,protocol));usedIds.add(protocol.id)
  }

  doors.sort((a,b)=>a.page-b.page||a.id.localeCompare(b.id,'sv',{numeric:true}));
  importQueue.sort((a,b)=>(a.legacyProtocolPage||0)-(b.legacyProtocolPage||0)||a.id.localeCompare(b.id,'sv',{numeric:true}));
  const allImported=[...doors,...importQueue],fieldMaps=allProtocolFields(protocols),prefixes=allImported.map(d=>parseId(d.id).prefix),facilityNo=majority(prefixes);
  const serials=allImported.map(d=>Number(d.serialNumber)||0);
  const oldOrder=projectField(fieldMaps,'Order','AO nummer','Ao nummer','Ordernummer').replace(/,00$/,'');
  const oldServiceDate=projectField(fieldMaps,'Datum','Bokat besök datum','Servicedatum');
  const oldNextDate=projectField(fieldMaps,'näst datum','Nästa provning datum','Nästa datum');
  const projectName=String(fileName||'').replace(/\.pdf$/i,'').replace(/^service\s+da\s+/i,'').replace(/^service\s+/i,'').trim();
  const project={
   projectName,
   facilityNo:projectField(fieldMaps,'Anläggningsnummer','Objektnummer','Objekt nr','Text26')||facilityNo,
   customer:projectField(fieldMaps,'beställare kund','företag kund','Beställare','Kund','Företag'),
   agreementNo:projectField(fieldMaps,'Avtalsnummer','Avtal','Avtals nr'),
   contact:projectField(fieldMaps,'kontakt kund','Kontaktperson','Beställarkontakt'),
   projectOrder:oldOrder,
   inspectionDate:oldServiceDate||doorLocalToday(),
   projectNextDate:oldNextDate,
   previousServiceDate:oldServiceDate,
   previousOrder:oldOrder,
   company:projectField(fieldMaps,'företag heras','företag service','serviceföretag','Utförande företag'),
   companyContact:projectField(fieldMaps,'kontakt heras','kontakt service','kontaktman på objektet','kontakt f','kontakt g'),
   companyPhone:projectField(fieldMaps,'telefon heras','telefon service','tel g','Företag telefon'),
   companyAddress:projectField(fieldMaps,'adress heras','adress service','adress g','Företag adress'),
   companyPostalCode:projectField(fieldMaps,'postnr heras','postnr service','postnr g','Företag postnummer'),
   companyPostalCity:projectField(fieldMaps,'post adress heras','postadress heras','postadress service','post g','Företag postadress'),
   phone:projectField(fieldMaps,'telefon kund','tel','Kund telefon'),
   address:projectField(fieldMaps,'adress kund','adress','Kund adress'),
   postalCode:projectField(fieldMaps,'postnr kund','postnr','Kund postnummer'),
   postalCity:projectField(fieldMaps,'postadress kund','postadress','Kund postadress'),
   technician:projectField(fieldMaps,'Servicetekniker','Tekniker'),
   serviceSignature:'',
   nextDoorNumber:Math.max(0,...serials)+1
  };

  onProgress('Bygger ren ritning och importerar '+allImported.length+' automatiker…');
  const output=await PDFDocument.create(),copied=await output.copyPages(source,drawingNumbers.map(n=>n-1));
  copied.forEach(pg=>{pg.node.delete(PDFName.of('Annots'));output.addPage(pg)});
  try{output.catalog.delete(PDFName.of('AcroForm'))}catch(e){}
  const drawingBytes=new Uint8Array(await output.save());

  const modelCounts=new Map(),prefixCounts=new Map();
  allImported.forEach(d=>{const model=d.model||('Kod '+(d.modelCode||'?'));modelCounts.set(model,(modelCounts.get(model)||0)+1);const prefix=parseId(d.id).prefix;if(prefix)prefixCounts.set(prefix,(prefixCounts.get(prefix)||0)+1)});
  const modelText=[...modelCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>count+' '+name).join(', ');
  const prefixText=prefixCounts.size>1?' '+prefixCounts.size+' objektnummer hittades - kontrollera objektnummer under Projekt.':'';
  const placementText=importQueue.length?' '+doors.length+' placerades från gamla kopplingar/märkningar och '+importQueue.length+' ligger redo att placeras med ＋ Placera.':' Alla '+doors.length+' kunde placeras från den gamla PDF:en.';
  const perDrawing=drawingNumbers.map((originalPage,index)=>{const count=validLinks.filter(link=>link.drawingPage===originalPage).length;return 'Ritning '+(index+1)+': '+count+' automatik'+(count===1?'':'er')}).join(' · ');
  const projectKeys=['facilityNo','customer','agreementNo','contact','projectOrder','inspectionDate','projectNextDate','company','companyContact','companyPhone','companyAddress','companyPostalCode','companyPostalCity','phone','address','postalCode','postalCity'],projectFieldCount=projectKeys.filter(k=>String(project[k]||'').trim()).length;
  const importStats=' Gamla ritningar: '+drawingNumbers.length+' sidor · protokoll: '+protocols.size+' · matchade placeringar: '+doors.length+' · projektfält ifyllda: '+projectFieldCount+'. '+perDrawing+'.';
  return {drawingBytes,work:{version:2,doors,importQueue,project,logoData:''},summaryText:(modelText?'Typer: '+modelText+'.':'')+prefixText+placementText+importStats+' Gamla projektuppgifter är förifyllda och kan ändras inför dagens service.'}
 }catch(error){
  console.warn('Äldre PDF kunde inte autoimporteras',error);return null
 }finally{
  if(scan){try{await scan.destroy()}catch(e){}}
 }
};
