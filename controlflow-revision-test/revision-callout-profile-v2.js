/* Independent profile: revision forms filled with FreeText, callouts without P links.
   The locked legacy importer is never edited or used as a source of guessed IDs. */
(() => {
 'use strict';
 const PROFILE='revision-freetext-callouts-v2';
 const clean=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const text=s=>String(s||'').replace(/\s+/g,' ').trim();
 function idFromText(value){
  const normalized=String(value||'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\s*-\s*/g,'-');
  const ids=[...new Set((normalized.match(/\b\d{4,}(?:-\d+){2,4}\b/g)||[]).filter(id=>!/^\d{4}-\d{1,2}-\d{1,2}$/.test(id)))];
  return ids.length===1?ids[0]:'';
 }
 const stripNumber=value=>text(value).replace(/,00$/,'');
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value))?text(value):'';
 const clamp=value=>Math.max(0,Math.min(1,value));
 const makeChecks=()=>Object.fromEntries(SYSTEMS.automation.checks.map(([id])=>[id,{result:'',note:''}]));
 function identity(id){const parts=id.split('-'),code=parts.at(-2);return {id,machineId:id,serialNumber:String(Number(parts.at(-1))),modelCode:code,model:MODELS.find(([c])=>c===code)?.[1]||'',idMode:'manual'};}
 function previousInfo(annotations,project){
  const notes=annotations.filter(a=>clean(a.subject)==='allmaninfo').map(a=>text(a.contents)).filter(Boolean);
  const previousIssues=notes.flatMap(note=>{
   const match=note.match(/^(\d+\.\d+)\s+(.+)$/);
   return match?[{n:match[1],title:SYSTEMS.automation.checks.find(([id])=>id===match[1])?.[1]||match[1],note:match[2]}]:[];
  });
  return {previousNotes:[...new Set(notes)].join('\n'),previousIssues,previousServiceDate:project.date||'',previousNextDate:project.nextDate||'',previousOrder:project.order||'',previousStatus:notes.length?'Åtgärd krävs':''};
 }
 function commonValue(records,key,conflicts){
  const values=[...new Set(records.map(r=>text(r[key])).filter(Boolean))];
  if(values.length>1){conflicts.push(key);return '';}
  return values[0]||'';
 }
 function readProject(info){
  const {labels,annotations:values,viewport}=info;
  const find=name=>labels.find(l=>clean(l.value)===name);
  const boundary=find('bestallare')?.x;
  if(!Number.isFinite(boundary)||!find('anlaggning'))return null;
  const left={min:0,max:boundary},right={min:boundary,max:viewport.width};
  function read(name,scope,filter=()=>true){
   const label=labels.find(l=>clean(l.value)===name&&l.x>=scope.min&&l.x<scope.max);
   if(!label)return '';
   const h=Math.max(8,label.height),candidates=values.filter(a=>a.kind==='FreeText'&&a.intent!=='FreeTextCallout'&&text(a.contents)&&filter(text(a.contents))&&a.cx>=scope.min&&a.cx<scope.max&&a.cy-label.y>=-h&&a.cy-label.y<=3.4*h);
   candidates.sort((a,b)=>(Math.abs(a.cy-label.y)*4+Math.abs(a.cx-label.x)*.06)-(Math.abs(b.cy-label.y)*4+Math.abs(b.cx-label.x)*.06));
   return text(candidates[0]?.contents);
  }
  function postal(name,scope){
   const number=labels.find(l=>clean(l.value)==='postnummer'&&l.x>=scope.min&&l.x<scope.max);
   const city=labels.find(l=>clean(l.value)==='postadress'&&l.x>=scope.min&&l.x<scope.max);
   if(!number||!city)return '';
   return read(name,name==='postnummer'?{min:scope.min,max:city.x}:{min:city.x,max:scope.max},v=>name!=='postnummer'||/^\d{3}\s?\d{2}$/.test(v));
  }
  const bySubject=(name,filter)=>{
   const candidates=[...new Set(values.filter(a=>clean(a.subject)===name&&filter(text(a.contents))).map(a=>text(a.contents)))];
   return candidates.length===1?candidates[0]:'';
  };
  const order=read('aonummer',{min:boundary,max:viewport.width});
  return {
   company:read('foretag',left),customer:read('foretag',right),
   companyContact:read('kontaktmanpaobjektet',left),contact:read('kontaktperson',right),
   companyPhone:read('telefonnummer',left),phone:read('telefonnummer',right),
   companyAddress:read('adress',left),address:read('adress',right),
   companyPostalCode:postal('postnummer',left),postalCode:postal('postnummer',right),
   companyPostalCity:postal('postadress',left),postalCity:postal('postadress',right),
   facilityNo:stripNumber(read('anlaggningsnummer',left,v=>/^\d+(?:,00)?$/.test(v))),
   agreement:stripNumber(read('avtalsnummer',right,v=>/^\d+(?:,00)?$/.test(v))),
   order:order==='-'?'':stripNumber(order),
   date:bySubject('besokdatum',v=>!!date(v))||read('datum',left,v=>!!date(v)),
   nextDate:bySubject('nastaprovningdatum',v=>!!date(v))||read('nastaprovningdatum',right,v=>!!date(v)),
   technician:'',signature:''
  };
 }
 async function inspect(bytes,fileName,onProgress=()=>{}){
  const {PDFDocument,PDFName,PDFArray,PDFDict,PDFNumber}=PDFLib;
  const source=await PDFDocument.load(bytes,{updateMetadata:false}),pages=source.getPages();
  const lookup=o=>{try{return o?source.context.lookup(o):null;}catch(_){return null;}};
  const string=o=>{const value=lookup(o);try{return value?.decodeText?.()??String(value||'').replace(/^\//,'');}catch(_){return '';}};
  const numbers=o=>{const a=lookup(o);if(!(a instanceof PDFArray))return [];return a.asArray().map(x=>{const n=lookup(x);return n instanceof PDFNumber?n.asNumber():NaN;});};
  function internalAction(o,depth=0){
   const value=lookup(o);if(depth>4)return false;
   if(value instanceof PDFArray)return value.asArray().some(x=>internalAction(x,depth+1));
   if(!(value instanceof PDFDict))return false;
   if(string(value.get(PDFName.of('S')))==='GoTo'||value.has(PDFName.of('Dest')))return true;
   return value.entries().some(([key,v])=>!['Parent','P','AP'].includes(String(key).slice(1))&&internalAction(v,depth+1));
  }
  const raw=pages.map((page,index)=>{
   const list=lookup(page.node.get(PDFName.of('Annots'))),annotations=[];
   if(list instanceof PDFArray)for(const ref of list.asArray()){
    const a=lookup(ref);if(!(a instanceof PDFDict))continue;
    // Defer every P/GoTo document to the unmodified, locked importer.
    if(a.has(PDFName.of('Dest'))||internalAction(a.get(PDFName.of('A')))||internalAction(a.get(PDFName.of('AA'))))return {page:index+1,hasInternalLink:true,annotations:[]};
    const rect=numbers(a.get(PDFName.of('Rect')));if(rect.length<4||!rect.every(Number.isFinite))continue;
    annotations.push({kind:string(a.get(PDFName.of('Subtype'))),intent:string(a.get(PDFName.of('IT'))),subject:string(a.get(PDFName.of('Subj'))),contents:string(a.get(PDFName.of('Contents'))),rect,callout:numbers(a.get(PDFName.of('CL')))});
   }
   return {page:index+1,annotations};
  });
  if(raw.some(p=>p.hasInternalLink))return null;
  const hasCallout=raw.some(p=>p.annotations.some(a=>a.intent==='FreeTextCallout'&&a.callout.length>=4&&idFromText(a.contents)));
  const hasIdText=raw.some(p=>p.annotations.some(a=>['idnummer','idnummermaskin'].includes(clean(a.subject))&&idFromText(a.contents)));
  if(!hasCallout||!hasIdText)return null;
  let scan;
  try{
   scan=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
   const info=[];
   for(const record of raw){
    onProgress('Läser ritningspilar och textrutor… '+record.page+' / '+pages.length);
    const page=await scan.getPage(record.page),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
    const labels=content.items.filter(t=>typeof t.str==='string').map(t=>{const [x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {value:t.str,x,y,height:t.height||10};});
    const annotations=record.annotations.map(a=>{const r=viewport.convertToViewportRectangle(a.rect);return {...a,cx:(r[0]+r[2])/2,cy:(r[1]+r[3])/2};});
    const header=clean(labels.map(t=>t.value).join(' '));
    const ids=[...new Set(annotations.filter(a=>a.kind==='FreeText'&&['idnummer','idnummermaskin'].includes(clean(a.subject))).map(a=>idFromText(a.contents)).filter(Boolean))];
    const protocol=header.includes('checklistarevisionavdorrautomatik');
    if(protocol&&ids.length!==1)throw Error('Protokoll på sida '+record.page+' saknar ett entydigt maskin-ID i ID-rutan.');
    const isOverview=!protocol&&(annotations.some(a=>clean(a.contents).includes('egenkontroll'))||header.includes('egenkontroll'));
    info.push({...record,annotations,viewport,labels,kind:protocol?'protocol':isOverview?'overview':'drawing',id:ids[0]||''});
   }
   const protocols=info.filter(p=>p.kind==='protocol'),drawings=info.filter(p=>p.kind==='drawing');
   if(!protocols.length||!drawings.length)return null;
   const projects=protocols.map(readProject);
   if(projects.some(p=>!p))throw Error('Protokollets företags- och beställarkolumner kunde inte identifieras.');
   const conflicts=[],project={...emptyProject(),projectName:String(fileName||'').replace(/\.pdf$/i,'').replace(/^service\s+da\s+/i,'').trim()};
   for(const key of Object.keys(projects[0]))project[key]=commonValue(projects,key,conflicts);
   // An overview's explicitly labelled order is separate from the protocol's facility/agreement numbers.
   const overviewOrders=[];
   for(const page of info.filter(p=>p.kind==='overview')){
    for(const label of page.labels.filter(l=>clean(l.value)==='ordernr')){
     const candidates=page.annotations.filter(a=>a.kind==='FreeText'&&a.cx>=label.x-10&&Math.abs(a.cx-label.x)<page.viewport.width*.2&&a.cy>=label.y&&a.cy-label.y<50&&/^\d+(?:,00)?$/.test(text(a.contents)));
     candidates.sort((a,b)=>Math.abs(a.cy-label.y)-Math.abs(b.cy-label.y));
     if(candidates[0])overviewOrders.push({order:stripNumber(candidates[0].contents)});
    }
   }
   if(!project.order&&overviewOrders.length)project.order=commonValue(overviewOrders,'order',conflicts);
   const protocolRecords=protocols.map((p,index)=>({key:'protocol-page-'+p.page,...identity(p.id),location:text(p.annotations.find(a=>clean(a.subject)==='placeringdorrlittra')?.contents),legacyProtocolPage:p.page,...previousInfo(p.annotations,{...project,...projects[index],order:project.order})}));
   const byId=new Map();protocolRecords.forEach(p=>{if(!byId.has(p.id))byId.set(p.id,[]);byId.get(p.id).push(p);});
   const markers=[];
   for(const [index,page] of drawings.entries())for(const [aIndex,a] of page.annotations.entries()){
    if(a.intent!=='FreeTextCallout'||a.callout.length<4||!a.callout.every(Number.isFinite))continue;
    const id=idFromText(a.contents);if(!id)continue;
    const [x,y]=page.viewport.convertToViewportPoint(a.callout[0],a.callout[1]);
    markers.push({uid:'callout-v2:'+page.page+':'+aIndex,type:'automation',...identity(id),number:markers.length+1,page:index+1,x:clamp(x/page.viewport.width),y:clamp(y/page.viewport.height),labelX:clamp(a.cx/page.viewport.width),labelY:clamp(a.cy/page.viewport.height),checks:makeChecks(),customChecks:[],status:'untested',notes:'',location:'',manualFail:false,remediationDate:'',remediationSignature:'',importReview:{profile:PROFILE,status:'unmatched',drawingId:id,sourceDrawingPage:page.page}});
   }
   if(!markers.length)return null;
   const markerCounts=new Map();markers.forEach(m=>markerCounts.set(m.id,(markerCounts.get(m.id)||0)+1));
   const used=new Set();
   for(const marker of markers){
    const candidates=byId.get(marker.id)||[];
    if(candidates.length===1&&markerCounts.get(marker.id)===1){
     const candidate=candidates[0];Object.assign(marker,candidate);delete marker.key;
     marker.importReview={...marker.importReview,status:'matched',protocolId:candidate.id,sourceProtocolPage:candidate.legacyProtocolPage};used.add(candidate.key);
    }
   }
   project.revisionImport={profile:PROFILE,sourceFile:String(fileName||''),unlinkedProtocols:protocolRecords.filter(p=>!used.has(p.key)),fieldConflicts:conflicts,sourceDrawingPages:drawings.map(p=>p.page)};
   const output=await PDFDocument.create(),copied=await output.copyPages(source,drawings.map(p=>p.page-1));
   copied.forEach(page=>{page.node.delete(PDFName.of('Annots'));output.addPage(page);});
   output.catalog.delete(PDFName.of('AcroForm'));
   const drawingBytes=new Uint8Array(await output.save());
   return {profile:PROFILE,drawingBytes,work:{version:2,doors:markers,importQueue:[],project,logoData:''},summaryText:markers.filter(m=>m.importReview.status==='matched').length+' exakta kopplingar. '+markers.filter(m=>m.importReview.status!=='matched').length+' behöver kontrolleras.'};
  }finally{if(scan)await scan.destroy();}
 }
 window.RevisionCalloutProfile={idFromText,inspect,profile:PROFILE};
 window.RevisionImportProfiles={inspect:async(bytes,name,progress)=>await inspect(bytes,name,progress)||await window.inspectLegacyLinkedPdf(bytes,name,progress)};

 // Review state lives inside item/project data, so work-PDF, local save and undo keep it.
 let notice,dialog;
 const active=()=>typeof project!=='undefined'&&project.revisionImport?.profile===PROFILE;
 const pending=()=>active()?items.filter(o=>o.importReview?.profile===PROFILE&&o.importReview.status==='unmatched'):[];
 function available(){
  const used=new Set(items.filter(o=>['matched','manual'].includes(o.importReview?.status)).map(o=>o.importReview.sourceProtocolPage));
  return (project.revisionImport?.unlinkedProtocols||[]).filter(p=>!used.has(p.legacyProtocolPage));
 }
 function element(tag,value){const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;}
 function refresh(){
  if(!notice){
   notice=element('section');notice.id='revisionImportNotice';notice.setAttribute('role','status');
   document.getElementById('securityMessage').after(notice);
  }
  notice.hidden=!active();if(!active())return;
  const count=pending().length,orphans=available().length,conflicts=project.revisionImport.fieldConflicts||[];
  notice.dataset.pending=String(!!(count||orphans||conflicts.length));notice.replaceChildren();
  notice.append(element('span',count?`${items.filter(o=>o.importReview?.profile===PROFILE).length-count} kopplade · ${count} behöver kopplas`:orphans?`${orphans} protokoll saknar ritningskoppling`:'Alla ritningspilar är kopplade.'));
  if(conflicts.length)notice.append(element('span','Projektuppgifter skiljer sig mellan gamla protokoll. Kontrollera uppgifterna under Projekt.'));
  if(count||orphans){const button=element('button','Kontrollera kopplingar');button.type='button';button.onclick=show;notice.append(button);}
 }
 function show(){
  if(!active())return;
  if(!dialog){dialog=element('dialog');dialog.id='revisionImportDialog';document.body.append(dialog);}
  dialog.replaceChildren(element('h2','Kontrollera dörrkopplingar'));
  const list=pending(),candidates=available();
  for(const item of list){
   const article=element('article');article.append(element('strong','På ritningen: '+item.importReview.drawingId));
   article.append(element('p','Ingen entydig koppling med samma fullständiga ID hittades. Pilspets och etikett ligger kvar.'));
   const label=element('label','Välj rätt gammalt protokoll'),select=element('select');select.setAttribute('aria-label','Välj protokoll för '+item.importReview.drawingId);
   select.append(new Option('Välj protokoll…',''));
   candidates.forEach(p=>select.append(new Option(p.id+' · sida '+p.legacyProtocolPage+(p.location?' · '+p.location:''),p.key)));
   const help=element('p','Vid koppling används protokollets ID. Ritningens ursprungliga ID sparas som referens.');help.className='revisionReviewHelp';
   const apply=element('button','Koppla valt protokoll');apply.type='button';apply.disabled=true;
   select.onchange=()=>{apply.disabled=!select.value;};
   apply.onclick=()=>{
    const candidate=available().find(p=>p.key===select.value);if(!candidate||!items.includes(item))return;
    for(const key of ['id','machineId','serialNumber','modelCode','model','idMode','location','legacyProtocolPage','previousNotes','previousIssues','previousServiceDate','previousNextDate','previousOrder','previousStatus'])item[key]=structuredClone(candidate[key]);
    item.importReview={...item.importReview,status:'manual',protocolId:candidate.id,sourceProtocolPage:candidate.legacyProtocolPage,confirmedAt:new Date().toISOString()};
    project.revisionImport.unlinkedProtocols=project.revisionImport.unlinkedProtocols.filter(p=>p.key!==candidate.key);
    normalize(item);save();drawMarkers();showSelected();refresh();dialog.close();if(pending().length)show();
    msg('Pilen är kopplad till '+candidate.id+'. Positionen är oförändrad.');
   };
   label.append(select);article.append(label,help,apply);dialog.append(article);
  }
  if(!list.length)dialog.append(element('p','Det finns protokoll utan en ritningspil. De kopplas inte automatiskt.'));
  if(candidates.length){const details=element('details'),summary=element('summary','Protokoll utan koppling ('+candidates.length+')');details.append(summary);candidates.forEach(p=>details.append(element('p',p.id+' · ursprunglig sida '+p.legacyProtocolPage)));dialog.append(details);}
  const close=element('button','Stäng');close.type='button';close.onclick=()=>dialog.close();dialog.append(close);
  if(!dialog.open)dialog.showModal();
 }
 window.RevisionImportReview={refresh,show};
 window.addEventListener('revision-work-loaded',refresh);
 // Keep the review banner accurate after undo/redo or an ordinary object deletion.
 const start=()=>{refresh();new MutationObserver(refresh).observe(document.getElementById('securityCount'),{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
