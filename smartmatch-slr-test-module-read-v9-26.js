/* SmartMatch SLR TEST: local-only document forms and PDF attachments. */
(function(){"use strict";
const cats=["Riskanalys","Beskrivning av maskin","Loggbok","Tillverkarens försäkran","Produktlista","Egenkontroll","CE-skylt"];
// Only these five folders may be reviewed in one deliberate action. Product list and CE plate stay independent.
const bulkReviewCats=["Riskanalys","Beskrivning av maskin","Loggbok","Tillverkarens försäkran","Egenkontroll"];
const labelFor=cat=>cat==="Tillverkarens försäkran"?"EG-försäkran – tillverkare av maskin":cat;
const $=s=>document.getElementById(s);
const elm=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
let completedDoors={},doorPhotos={},doorSignatures={},reviewedFolders={},choiceGroups={},openedFolders=new Set(),slrExportReady=null,slrExportBusy=false,slrEditScope="door",slrPreviewSerial=0;
let templates={},names={},stored={},answers={},profiles={glass:{},noGlass:{}},doorProfiles={},signatureLibrary={},checkKeyCache={},originalBytes=null,bridge=null,item=null,picked="",loading=null,slrEditingCategory="",productFiles={},verificationByDoor={},templatesLoaded=false,templateLoadWarning="";
function slrSharesAppSourceBytes(){
 const profile=window.SmartMatchAppBridge?.getDrawingPerformanceProfile?.();
 if(profile&&typeof profile.mobile==='boolean')return profile.mobile;
 const nav=globalThis.navigator||{},ua=String(nav.userAgent||''),platform=String(nav.platform||''),touch=Number(nav.maxTouchPoints)||0;
 const ipad=/iPad/i.test(ua+' '+platform)||(/Macintosh|MacIntel/i.test(ua+' '+platform)&&touch>0);
 return ipad||/iPhone|iPod|Android/i.test(ua+' '+platform);
}
function slrKeepSourceBytes(data){
 if(!data)return null;
 // TEST 9.26 owns the source Uint8Array for the whole open project and never
 // mutates it. On memory-limited devices SLR therefore retains the same
 // read-only view instead of another 100–250 MB slice. Any parser which can
 // transfer, detach or retain its input still receives a private slice below.
 if(slrSharesAppSourceBytes()&&data instanceof Uint8Array)return data;
 return data?.slice?.()||null;
}
function safe(s){return String(s).replace(/[^a-z0-9]+/gi,"-").slice(0,60)}
function decode(d){try{return d?.decodeText?.()||d?.asString?.()||""}catch(_){return ""}}
function parsePdfEmbeddedJson(obj,label){
 if(!obj)throw new Error(label+' saknas i PDF-filen.');
 const candidates=[];
 try{if(typeof obj.decodeText==='function')candidates.push(obj.decodeText())}catch(_){}
 try{if(typeof obj.asString==='function')candidates.push(obj.asString())}catch(_){}
 if(!candidates.length)candidates.push(String(obj));
 for(const value of candidates){
  const text=String(value??'').trim();
  if(!text)continue;
  try{return JSON.parse(text)}catch(_){}
  const hex=text.replace(/^</,'').replace(/>$/,'');
  if(!/^(?:FEFF|FFFE)(?:[0-9A-F]{4})+$/i.test(hex))continue;
  const littleEndian=hex.slice(0,4).toUpperCase()==='FFFE',chars=[];
  for(let i=4;i<hex.length;i+=4){
   const word=littleEndian?hex.slice(i+2,i+4)+hex.slice(i,i+2):hex.slice(i,i+4);
   chars.push(String.fromCharCode(parseInt(word,16)));
  }
  try{return JSON.parse(chars.join(''))}catch(_){}
 }
 throw new Error(label+' kunde inte läsas tillbaka från PDF-filen. Behåll originalet.');
}

function reset(){choiceGroups={};completedDoors={};doorPhotos={};doorSignatures={};reviewedFolders={};slrEditScope="door";slrPreviewSerial++;openedFolders.clear();slrExportReady=null;templates={};names={};stored={};answers={};profiles={glass:{},noGlass:{}};doorProfiles={};signatureLibrary={};checkKeyCache={};originalBytes=null;item=null;loading=null;slrEditingCategory="";productFiles={};verificationByDoor={};templatesLoaded=false;templateLoadWarning="";slrClearEditor();}
function initProject(pdf,saved,data){reset();originalBytes=slrKeepSourceBytes(data);try{const manifest=pdf.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest"));stored=manifest?parsePdfEmbeddedJson(manifest,"SLR-manifest"):{};}catch(err){console.warn("SLR-manifest kunde inte läsas",err)}answers=saved?.slrTestData?.answers||{};names=saved?.slrTestData?.names||stored.names||{};profiles={glass:saved?.slrTestData?.profiles?.glass||{},noGlass:saved?.slrTestData?.profiles?.noGlass||{}};doorProfiles=saved?.slrTestData?.doorProfiles||{};signatureLibrary=saved?.slrTestData?.signatureLibrary||{};completedDoors=saved?.slrTestData?.completedDoors||{};doorPhotos=saved?.slrTestData?.doorPhotos||{};doorSignatures=saved?.slrTestData?.doorSignatures||{};reviewedFolders=saved?.slrTestData?.reviewedFolders||{};slrMigrateInlineSignatures();}
function restore(saved){const data=saved?.slrTestData;if(!data)return;if(data.answers)answers=data.answers;if(data.profiles)profiles={glass:data.profiles.glass||{},noGlass:data.profiles.noGlass||{}};if(data.doorProfiles)doorProfiles=data.doorProfiles;if(data.signatureLibrary)signatureLibrary=data.signatureLibrary;completedDoors=data.completedDoors||{};doorPhotos=data.doorPhotos||{};doorSignatures=data.doorSignatures||{};reviewedFolders=data.reviewedFolders||{};slrMigrateInlineSignatures();}
function payload(){return {schema:4,answers,names,profiles,doorProfiles,signatureLibrary,completedDoors,doorPhotos,doorSignatures,reviewedFolders}}
function saved(i,cat){if(!answers[i.id])answers[i.id]={};if(!answers[i.id][cat])answers[i.id][cat]={fields:{}};return answers[i.id][cat]}

function slrStoreSignatureImage(data){
 if(!/^data:image\/png;base64,/.test(String(data||'')))return String(data||'');
 for(const [key,existing] of Object.entries(signatureLibrary))if(existing===data)return '@sig:'+key;
 let id=1;while(signatureLibrary['s'+id])id++;
 signatureLibrary['s'+id]=data;return '@sig:s'+id;
}
function slrSignatureImage(value){
 const text=String(value||'');
 return text.startsWith('@sig:')?signatureLibrary[text.slice(5)]||'':text;
}
function slrSignatureFor(obj,cat,key){
 const shared=doorSignatures[obj?.id];
 if(shared&&slrSignatureImage(shared))return shared;
 const entry=answers[obj?.id]?.[cat];
 return key?entry?.signatures?.[key]?.image:entry?.signature;
}
function slrSignatureWidgets(pdf){
 const result=[],pages=pdf.getPages();
 for(const field of pdf.getForm().getFields()){
  const name=field.getName();
  if(!(field instanceof PDFLib.PDFSignature)&&!(field instanceof PDFLib.PDFTextField&&/underskrift|signatur|signature|namnteckning/i.test(name)))continue;
  for(const widget of field.acroField.getWidgets()){
   const rect=widget.getRectangle();
   if(!rect||rect.width<=0||rect.height<=0)continue;
   const pageIndex=pages.findIndex(page=>{
    const refs=page.node.Annots?.()?.asArray?.()||[];
    return refs.some(ref=>pdf.context.lookup(ref)===widget.dict);
   });
   if(pageIndex>=0)result.push({key:name,page:pageIndex,rect:[rect.x,rect.y,rect.x+rect.width,rect.y+rect.height]});
  }
 }
 return result;
}
function slrMigrateInlineSignatures(){
 for(const categories of Object.values(answers))for(const savedData of Object.values(categories||{})){
  if(!savedData||typeof savedData!=='object')continue;
  if(typeof savedData.signature==='string'&&savedData.signature.startsWith('data:image/png;base64,'))
   savedData.signature=slrStoreSignatureImage(savedData.signature);
  for(const info of Object.values(savedData.signatures||{}))
   if(info&&typeof info.image==='string'&&info.image.startsWith('data:image/png;base64,'))
    info.image=slrStoreSignatureImage(info.image);
 }
}
function slrDoorProfile(obj){return doorProfiles[obj?.id]==='glass'||doorProfiles[obj?.id]==='noGlass'?doorProfiles[obj.id]:''}
function slrEffectiveFields(obj,cat){
 const defaults=profiles[slrDoorProfile(obj)]?.[cat]||{},own=answers[obj.id]?.[cat]?.fields||{};
 if(cat!=='Egenkontroll')return {...defaults,...own};
 const risk=slrEffectiveFields(obj,'Riskanalys'),linked={};
 for(const key of slrSharedRiskFields)if(Object.prototype.hasOwnProperty.call(risk,key))linked[key]=risk[key];
 return {...defaults,...linked,...own};
}
async function slrCheckKeys(cat){
 if(checkKeyCache[cat])return checkKeyCache[cat];
 const source=templates[cat];if(!source||!/\.pdf$/i.test(names[cat]||'x.pdf'))return new Set();
 const pdf=await PDFLib.PDFDocument.load(source.slice(),{ignoreEncryption:true,updateMetadata:false});
 const keys=new Set();
 for(const field of pdf.getForm().getFields())
  if(field instanceof PDFLib.PDFCheckBox||field instanceof PDFLib.PDFRadioGroup)keys.add(field.getName());
 if(cat==='Riskanalys'&&keys.has('4.6.1'))keys.add('4.6.2');
 checkKeyCache[cat]=keys;
 return keys;
}
function slrRefreshProfilePanel(){
 const selector=$('slrDoorProfile'),caption=$('slrDoorProfileCaption'),save=$('slrSaveProfileChecks'),reset=$('slrResetDoorChecks');
 if(!selector||!item)return;
 const type=slrDoorProfile(item);selector.value=type;
 if(save)save.disabled=!type;
 if(reset)reset.disabled=!type;
 if(caption)caption.textContent=type?('Profil: '+(type==='glass'?'Med glas':'Utan glas')+'. Standardens kryss, text och datum används. Egna ändringar gäller bara denna dörr.'):'Ingen profil vald. Välj dörrtyp, eller fyll i kryss manuellt.';
}
async function slrRepaintEditor(){
 draw();
 if(slrEditingCategory&&templates[slrEditingCategory]&&!$('slrEditor')?.hidden)await editDoc(slrEditingCategory);
}
const slrIdentityFields=new Set(['Dörrnummer, beteckning','Maskin ID','Drivsystem serienummer','Objekt','Objektnummer','GS','GS-nummer']);
// Only corresponding door/header data is shared. Review answers, signer and
// inspection dates belong to each document and are never copied as approval.
const slrSharedRiskFields=new Set(['Tillverkare företagsnamn','Tillverkare adress','Tillverkare postnummer/ort','Tillverkare org. nr','Tillverkare kontaktperson','Tillverkare telefonnummer','Beställare företagsnamn','Beställare adress','Beställarepostnummer/ort','Beställare kontaktperson','Beställare telefonnummer','Offertnummer/Ordernummer','Adress rad 1','Adress rad 2','Plats i byggnaden','Fri passagehöjd','Dörrbladsbredd aktivt','Dörrbladsbredd passivt','Dörrbladsvikt aktivt','Dörrbladsvikt passivt','Öppningsvinkel','Antal dörrblad','Antal maskindrivna']);
async function slrInspectChoices(cat,bytes){
 const pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false}),groups=[];
 const fields=pdf.getForm().getFields(),orientation=[];
 for(const field of fields){
  const name=field.getName(),type=kind(field);
  if(cat==='Riskanalys'&&/^4\.3 Objektsorientering \d+$/.test(name)){orientation.push(name);continue;}
  if(cat==='Riskanalys'&&(/^(?:4\.4 Risknivå|4\.6\.\d+|Antal dörrblad|Antal maskindrivna)$/.test(name)))groups.push({name,type,keys:[name]});
  else if(cat==='Egenkontroll'&&/^10\.5\.\d+$/.test(name))groups.push({name,type,keys:[name]});
  else if(cat==='Loggbok'&&['Installationsdatum','Drivsystem modell'].includes(name))groups.push({name,type,keys:[name]});
  else if(!['Riskanalys','Egenkontroll','Loggbok'].includes(cat)&&(type==='radio'||type==='choice'))groups.push({name,type,keys:[name]});
 }
 if(orientation.length)groups.unshift({name:'4.3 Objektsorientering',type:'any',keys:orientation});
 // The five-page source stores the closing-side widgets under 4.6.1 too.
 if(cat==='Riskanalys'&&pdf.getPageCount()===5&&groups.some(g=>g.name==='4.6.1')&&!groups.some(g=>g.name==='4.6.2'))groups.push({name:'4.6.2',type:'radio',keys:['4.6.2']});
 choiceGroups[cat]=groups;
}
function slrChoiceProgress(obj,cat){
 const groups=choiceGroups[cat]||[],values={...auto(obj),...slrEffectiveFields(obj,cat)};
 const answered=group=>group.type==='any'?group.keys.some(key=>values[key]===true):group.type==='check'?group.keys.some(key=>typeof values[key]==='boolean'):group.keys.some(key=>String(values[key]??'').trim()!=='');
 return {total:groups.length,done:groups.filter(answered).length};
}
function slrInvalidate(obj){if(obj)delete completedDoors[obj.id];else completedDoors={};slrExportReady=null;if($('slrExportDownload'))$('slrExportDownload').disabled=true;}
async function slrCaptureProfile(){
 const current=item,type=slrDoorProfile(current);if(!current||!type)return announce('Välj Med glas eller Utan glas först.',true);
 await loadTemplates();if(item!==current)return;
 const collected={};let count=0;
 for(const cat of cats){
  if(cat==='CE-skylt'||cat==='Produktlista'||!templates[cat])continue;
  const pdf=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
  if(item!==current)return;
  const values=slrEffectiveFields(current,cat),defaults=auto(current),selected={};
  for(const f of pdf.getForm().getFields()){
   const key=f.getName(),k=kind(f);if(!k||slrIdentityFields.has(key))continue;
   // Explicit values take precedence, including an empty field or false tick.
   const value=values[key]??(k==='text'?defaults[key]??'':k==='check'?false:'');
   selected[key]=value;if(value===true||typeof value==='string'&&value.trim())count++;
  }
  if(cat==='Riskanalys'&&'4.6.2' in values)selected['4.6.2']=values['4.6.2'];
  collected[cat]=selected;
 }
 if(!count)return announce('Fyll i dokumenten först och spara sedan standarden.',true);
 profiles[type]=collected;
 for(const [cat,fields] of Object.entries(collected)){
  const entry=answers[current.id]?.[cat];if(entry?.fields)for(const key of Object.keys(fields))delete entry.fields[key];
 }
 for(const [id,profile] of Object.entries(doorProfiles))if(profile===type){delete completedDoors[id];for(const cat of Object.keys(collected))if(reviewedFolders[id])delete reviewedFolders[id][cat];}
 slrExportReady=null;bridge?.save?.();bridge?.redraw?.();await slrRepaintEditor();slrRefreshProfilePanel();
 announce('Hela ifyllnaden sparad för '+(type==='glass'?'Med glas':'Utan glas')+'. Dörrarnas egna ändringar behålls. Kontrollera dokumenten och tryck Klart på varje dörr.');
}
async function slrResetCurrentDoor(){
 const current=item;if(!current||!slrDoorProfile(current))return;
 for(const [cat,entry]of Object.entries(answers[current.id]||{}))if(cats.includes(cat)&&entry?.fields)entry.fields={};delete reviewedFolders[current.id];
 slrInvalidate(current);bridge?.save?.();bridge?.redraw?.();await slrRepaintEditor();announce('Denna dörr använder standardens ifyllnad igen. Signaturer och CE-foto behålls.');
}
function slrSetDoorProfile(type){
 const current=item;if(!current)return;
 if(type==='glass'||type==='noGlass')doorProfiles[current.id]=type;else delete doorProfiles[current.id];
 delete reviewedFolders[current.id];slrInvalidate(current);bridge?.save?.();bridge?.redraw?.();void slrRepaintEditor();slrRefreshProfilePanel();
 announce('Dörrtypen sparad. Egna ändringar gäller bara denna dörr.');
}
function slrFolderPercent(obj,cat){
 if(!obj)return 0;
 if(completedDoors[obj.id]||reviewedFolders[obj.id]?.[cat])return 100;
 const choices=slrChoiceProgress(obj,cat);
 if(choices.total)return choices.done===choices.total?50:0;
 const status=obj.slrDocuments?.[cat]?.status,entry=answers[obj.id]?.[cat];
 if(status==='doing'||status==='done'||status==='completed'||Object.keys(entry?.fields||{}).length
    ||entry?.signature||Object.keys(entry?.signatures||{}).length
    ||(cat==='Produktlista'&&productFiles[obj.id])||(cat==='CE-skylt'&&doorPhotos[obj.id]))return 50;
 return 0;
}
function slrProgress(obj){
 if(completedDoors[obj?.id])return 100;
 return Math.round(cats.reduce((total,cat)=>total+slrFolderPercent(obj,cat),0)/cats.length);
}
async function slrToggleReviewed(obj,cat){
 if(!obj)return;
 const current=reviewedFolders[obj.id]?.[cat]===true;
 if(!current){
  if(!slrDocumentAvailable(obj,cat))return announce('Lägg till dokumentet innan det kan markeras kontrollerat.',true);
  if(cat==='Produktlista')try{await compose(cat,obj)}catch(err){return announce(err.message,true)}
 }
 if(!reviewedFolders[obj.id])reviewedFolders[obj.id]={};
 reviewedFolders[obj.id][cat]=!current;slrInvalidate(obj);
 bridge?.save?.();bridge?.redraw?.();draw();
 const count=cats.filter(name=>reviewedFolders[obj.id]?.[name]).length;
 announce((current?'Kontrollen öppnad igen. ':'Kontrollerad: '+labelFor(cat)+'. ')+count+' av 7 mappar genomgångna. '+(count===7?'Tryck Klart för att avsluta SLR.':''));
}
async function slrMarkFiveReviewed(){
 const current=item;if(!current)return;
 await loadTemplates();if(item!==current)return;
 const missing=bulkReviewCats.filter(cat=>!slrDocumentAvailable(current,cat));
 if(missing.length)return announce('Lägg till dokumenten först: '+missing.map(labelFor).join(', ')+'.',true);
 const unchecked=bulkReviewCats.filter(cat=>reviewedFolders[current.id]?.[cat]!==true);
 if(!unchecked.length)return announce('Alla fem dokument är redan markerade som kontrollerade på denna dörrautomatik.');
 // No second confirmation: the deliberate click marks this door's five folders immediately.
 // Missing templates were already checked above; all other folders remain unchanged.
 const label=slrDoorDesignation(current);
 if(item!==current)return;
 if(!reviewedFolders[current.id])reviewedFolders[current.id]={};
 for(const cat of bulkReviewCats)reviewedFolders[current.id][cat]=true;
 slrInvalidate(current);
 bridge?.save?.();bridge?.redraw?.();draw();
 announce('Fem dokument markerade som kontrollerade för '+label+'. Produktlista och CE-skylt har inte ändrats. SLR '+slrProgress(current)+' %.');
}
function slrStartEditing(cat,scope){
 if(scope==='profile'&&!slrDoorProfile(item))return announce('Välj Med glas eller Utan glas innan du ändrar standarden.',true);
 if(slrEditingCategory===cat&&slrEditScope===scope&&!$('slrEditor')?.hidden)return slrCloseEditor();
 slrEditScope=scope;void editDoc(cat);
}
function slrWriteField(obj,cat,name,value){
 const targets=['Riskanalys','Egenkontroll'].includes(cat)&&slrSharedRiskFields.has(name)?['Riskanalys','Egenkontroll']:[cat];
 const profile=slrEditScope==='profile'?slrDoorProfile(obj):'';
 if(profile&&!slrIdentityFields.has(name)){
  if(!profiles[profile])profiles[profile]={};
  for(const target of targets){
   if(!profiles[profile][target])profiles[profile][target]={};
   profiles[profile][target][name]=value;
   if(answers[obj.id]?.[target]?.fields)delete answers[obj.id][target].fields[name];
  }
  for(const [id,type] of Object.entries(doorProfiles))if(type===profile){
   delete completedDoors[id];
   for(const target of targets)if(reviewedFolders[id])delete reviewedFolders[id][target];
  }
  slrExportReady=null;
  if(!obj.slrDocuments)obj.slrDocuments={};
  for(const target of targets)obj.slrDocuments[target]={...(obj.slrDocuments[target]||{}),status:'doing'};
  bridge?.save?.();bridge?.redraw?.();
 }else{
  for(const target of targets){saved(obj,target).fields[name]=value;slrDirty(obj,target);}
 }
 slrRefreshFolderStatuses();
}

function slrPhotoBytes(photo){return Uint8Array.from(atob(photo.dataUrl.split(',')[1]),c=>c.charCodeAt(0));}
function slrDocumentAvailable(obj,cat){return cat==='Produktlista'?!!productFiles[obj.id]:cat==='CE-skylt'?!!doorPhotos[obj.id]||!!templates[cat]:!!templates[cat];}
async function slrComplete(){
 const current=item;if(!current)return;
 if(completedDoors[current.id]){slrInvalidate(current);bridge?.save?.();bridge?.redraw?.();draw();return;}
 await loadTemplates();if(item!==current)return;
 const missing=cats.filter(cat=>!slrDocumentAvailable(current,cat));if(missing.length)return announce('Lägg till dokument före Klart: '+missing.map(labelFor).join(', ')+'.',true);
 // Validate this door's product source; a stale GS must not become an approved package.
 await compose('Produktlista',current);if(item!==current)return;
 const unchecked=cats.filter(cat=>!reviewedFolders[current.id]?.[cat]);if(unchecked.length)return announce('Kontrollera mapparna först: '+unchecked.map(labelFor).join(', ')+'.',true);
 completedDoors[current.id]={at:new Date().toISOString()};slrExportReady=null;bridge?.save?.();bridge?.redraw?.();draw();announce('SLR för denna dörr är klart · 100 %.');
}
async function slrSavePhoto(file,current){
 if(!current||!file)return;if(file.size>20*1024*1024)throw Error('Bilden är för stor. Välj en bild under 20 MB.');if(!/^image\//.test(file.type))throw Error('Välj en bild av CE-skylten.');
 const url=URL.createObjectURL(file);let image;
 try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Bilden kunde inte öppnas. Välj JPEG eller PNG.'));img.src=url;});}finally{URL.revokeObjectURL(url);}
 const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=elm('canvas');
 canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 doorPhotos[current.id]={name:'CE-skylt.jpg',type:'image/jpeg',dataUrl:canvas.toDataURL('image/jpeg',.85)};
 slrDirty(current,'CE-skylt');if(item===current){draw();announce('CE-fotot sparat enbart för denna dörr.');}
}

function announce(t,error){const e=$("slrStatusText");if(e){e.textContent=t;e.style.color=error?"#a52229":"#1b536e";}}
function slrDoorDesignation(i){
 const parts=[i?.objectNo,i?.modelCode,i?.serialNumber];
 return parts.every(v=>v!==undefined&&v!==null&&String(v).trim()!=="")?parts.map(v=>String(v).trim()).join("-"):String(i?.sourceText||i?.objectNo||i?.id||"");
}
function slrFieldValue(i,name,values,defaults){
 if(name==='Dörrnummer, beteckning')return slrDoorNumber(i);
 return ["Dörrnummer, beteckning","Maskin ID","Drivsystem serienummer"].includes(name)?slrDoorDesignation(i):(values[name]??defaults[name]??"");
}
function slrDoorNumber(i){return String(i?.serialNumber??slrDoorDesignation(i).split('-').at(-1)??'').trim();}
function slrMachine(i){
 const raw=String(i.model||"").trim(),match=raw.match(/^(Dorma|Dormakaba|Geze|Faac|Besam|Tormax|Record|Gilgen|Ditec|Entramatic|Entrematic|Cibes)\s+(.+)$/i);
 return {brand:i.manufacturer||i.brand||match?.[1]||(/^ED\s*(100|200|250|180)\b/i.test(raw)?"Dorma":""),model:(match?.[2]||raw).replace(/\b(ED|SW)\s+(\d+)/gi,"$1$2")};
}
function slrClearEditor(){
 slrEditorRevision++;
 const fields=$("slrFields");if(fields){fields.replaceChildren();fields.className="";}
 const heading=$("slrEditHeading");if(heading)heading.textContent="";
 for(const dialog of document.querySelectorAll?.(".slrSignatureDlg")||[])dialog.close();
}
function slrMountEditor(cat){
 const editor=$("slrEditor");if(!editor)return;
 slrEditingCategory=cat;editor.hidden=false;
 const section=Array.from($("slrTestDocRows")?.children||[]).find(e=>e.dataset.slrCategory===cat);
 if(section)section.append(editor);
 for(const button of document.querySelectorAll("[data-slr-edit]"))button.textContent=button.dataset.slrEdit===cat&&button.dataset.slrScope===slrEditScope?"Stäng redigering":button.dataset.slrScope==="profile"?"Ändra standard":"Endast denna dörr";
}
function slrCloseEditor(){
 const cat=slrEditingCategory;slrEditingCategory="";slrEditScope="door";slrClearEditor();
 const editor=$("slrEditor");if(editor)editor.hidden=true;
 draw();
 const section=Array.from($("slrTestDocRows")?.children||[]).find(e=>e.dataset.slrCategory===cat);
 section?.scrollIntoView?.({block:"nearest"});
}
function auto(i){const m=bridge?.getProjectMeta?.()||{},id=slrDoorDesignation(i);
return {"Beställare företagsnamn":m.customer||"","Beställare adress":m.address||"","Beställarepostnummer/ort":[m.postalCode,m.postalCity].filter(Boolean).join(" "),"Beställare kontaktperson":m.contact||"","Beställare telefonnummer":m.phone||"","Tillverkare företagsnamn":m.company||"","Tillverkare adress":m.companyAddress||"","Tillverkare postnummer/ort":[m.companyPostalCode,m.companyPostalCity].filter(Boolean).join(" "),"Tillverkare kontaktperson":m.companyContact||"","Tillverkare telefonnummer":m.companyPhone||"","Offertnummer/Ordernummer":m.order||"","Objekt":i.objectNo||m.facilityNo||"","Plats i byggnaden":saved(i,"Riskanalys").place||i.location||"","Dörrnummer, beteckning":slrDoorNumber(i),"Maskin ID":id,"Drivsystem fabrikat":slrMachine(i).brand,"Drivsystem modell":slrMachine(i).model,"Drivsystem serienummer":id,"Adress rad 1":m.address||"","Adress rad 2":[m.postalCode,m.postalCity].filter(Boolean).join(" "),"4.7 Företag":m.company||"","4.7 Namn":m.technician||"","4.7 Telefonnummer":m.companyPhone||""};}
async function loadTemplates(){
 if(loading)return loading;
 loading=(async()=>{
  if(!templatesLoaded&&originalBytes&&(Object.keys(stored.templates||{}).length||Object.keys(stored.products||{}).length)){
   let p=null;
   try{
    p=await pdfjsLib.getDocument({data:originalBytes.slice()}).promise;
    const attachments=await p.getAttachments()||{};
    for(const [cat,name]of Object.entries(stored.templates||{})){
     if(attachments[name]?.content&&!templates[cat]){
      let data=new Uint8Array(attachments[name].content);
      if(/\.pdf$/i.test(names[cat]||name)){data=await prepareTemplate(data,cat);}
      templates[cat]=data;
     }
    }
    for(const [id,meta]of Object.entries(stored.products||{}))if(attachments[meta.file]?.content&&!productFiles[id])productFiles[id]={...meta,bytes:new Uint8Array(attachments[meta.file].content)};
   }finally{try{await p?.destroy()}catch(_){}}
  }
  for(const [cat,bytes]of Object.entries(templates))if(!choiceGroups[cat]&&/\.pdf$/i.test(names[cat]||'template.pdf'))await slrInspectChoices(cat,bytes);
  templatesLoaded=true;
  templateLoadWarning="";
 })();
 try{await loading}finally{loading=null}
}
function slrDateValue(value){
 const text=String(value??"").trim();
 let parts=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!parts){const local=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(local)parts=[text,local[3],local[2].padStart(2,"0"),local[1].padStart(2,"0")];}
 if(!parts)return "";
 const year=Number(parts[1]),month=Number(parts[2]),day=Number(parts[3]);
 const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(year,month-1,day);
 return year>0&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?parts[1]+"-"+parts[2]+"-"+parts[3]:"";
}
function slrConfigureTextInput(input,name,value){
 if(!/datum\s*$/i.test(name)){input.type="text";input.value=String(value??"");return;}
 input.type="date";input.value=slrDateValue(value);input.classList.add("slrOverlayDate");
 input.addEventListener("click",()=>{try{input.showPicker?.()}catch(_){}});
}
function kind(f){if(f instanceof PDFLib.PDFTextField)return "text";if(f instanceof PDFLib.PDFCheckBox)return "check";if(f instanceof PDFLib.PDFRadioGroup)return "radio";if(f instanceof PDFLib.PDFDropdown||f instanceof PDFLib.PDFOptionList)return "choice";return ""}
function clearRisk(pdf){const form=pdf.getForm();for(const f of form.getFields())try{const k=kind(f);if(k==="text")f.setText("");else if(k==="check")f.uncheck();else if(k==="radio"||k==="choice")f.clear();else if(f instanceof PDFLib.PDFSignature){f.acroField.dict.delete(PDFLib.PDFName.of("V"));f.acroField.dict.delete(PDFLib.PDFName.of("AP"));for(const widget of f.acroField.getWidgets())widget.dict.delete(PDFLib.PDFName.of("AP"));}if(k==="check"||k==="radio")f.acroField?.dict?.delete?.(PDFLib.PDFName.of("DV"))}catch(_){}
for(const p of pdf.getPages()){const arr=p.node.Annots?.();if(!arr)continue;const keep=[];for(let n=0;n<arr.size();n++){const ref=arr.get(n),node=pdf.context.lookup(ref);if(node instanceof PDFLib.PDFDict&&node.get(PDFLib.PDFName.of("Subtype"))?.toString()==="/Widget")keep.push(ref)}p.node.set(PDFLib.PDFName.of("Annots"),pdf.context.obj(keep));}}
async function compose(cat,i){if(cat==="Produktlista"){const product=productFiles[i.id];if(!product)throw Error("Skapa produktlistan från dörrkortet först.");if(product.format!=="two-columns-v1")throw Error("Tryck Uppdatera PDF för den nya produktlistan.");const source=window.SmartMatchDALink?.getSLRSource?.(i)||verificationByDoor[i.id];if(source&&(!source.gs||source.gs.code!==product.gsCode||source.cardPage!==product.cardPage))throw Error("GS-kopplingen har ändrats. Uppdatera produktlistan från rätt dörrkort.");return product.bytes.slice();}if(cat==="CE-skylt"&&doorPhotos[i.id])return slrPhotoBytes(doorPhotos[i.id]);const bytes=templates[cat];if(!bytes)throw Error("Ingen mall");
if(cat==="CE-skylt"&&/\.(png|jpe?g)$/i.test(names[cat]||""))return bytes.slice();
const pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
clearRisk(pdf);
const values=slrEffectiveFields(i,cat),defaults=auto(i);
for(const f of pdf.getForm().getFields()){const name=f.getName(),k=kind(f),v=slrFieldValue(i,name,values,defaults);if(v===undefined)continue;
try{if(cat==="Riskanalys"&&name==="4.6.1")continue;if(k==="text")f.setText(String(v??""));else if(k==="check"){if(v===true)f.check();else f.uncheck()}else if((k==="radio"||k==="choice")&&v){const option=f.getOptions().find(o=>slrDecode(o)===slrDecode(v));if(option)f.select(option);else f.clear()}else if(k==="radio"||k==="choice")f.clear()}catch(_){}}
if(cat==="Riskanalys"&&pdf.getPageCount()===5){
 const rfields=slrEffectiveFields(i,cat),opts=[
 [1,"4.6.1",[[231,325.8,"Hög Val 1"],[231,344.2,"Hög Val 2"],[231,374.9,"Låg Val 1"],[231,571.3,"Låg Val 2"],[231,638.4,"Låg Val 3"]]],
 [2,"4.6.2",[[230.9,101.2,"Hög Val 1"],[230.9,119.9,"Hög Val 2"],[230.9,238.8,"Låg Val 2"],[230.9,305.4,"Låg Val 3"]]]
 ];
 try{const radio=pdf.getForm().getRadioGroup("4.6.1");radio.clear();}catch(_){}
 for(const [pageIndex,key,positions] of opts){
 const chosen=String(rfields[key]||"").replace(/[#]20/g," ").replace(/[#]F6/gi,"ö").replace(/[#]E5/gi,"å");
 if(!chosen)continue;
 const found=positions.find(pos=>pos[2]===chosen||pos[2].toLowerCase()===chosen.toLowerCase());
 if(found){const pg=pdf.getPages()[pageIndex];
 pg.drawText("X",{x:found[0]+2,y:pg.getHeight()-found[1]-9.5,size:9.5,color:PDFLib.rgb(0,0,0)});
 }
 }
}
const stamps=[],record=saved(i,cat),shared=doorSignatures[i.id],currentImage=slrSignatureFor(i,cat);
 for(const [key,sign] of Object.entries(record.signatures||{})){
  if(!sign?.rect||!Number.isInteger(Number(sign.page)))continue;
  const imageRef=shared||sign.image;
  if(slrSignatureImage(imageRef))stamps.push({page:Number(sign.page),rect:sign.rect,imageRef,key});
 }
 if(cat!=='Riskanalys'){
  for(const position of slrSignatureWidgets(pdf)){
   if(stamps.some(stamp=>stamp.key===position.key&&stamp.page===position.page))continue;
   const imageRef=slrSignatureFor(i,cat,position.key)||shared;
   if(slrSignatureImage(imageRef))stamps.push({...position,imageRef});
  }
 }
 if(cat==='Riskanalys'&&slrSignatureImage(currentImage)&&pdf.getPages()[4]){
  const pg=pdf.getPages()[4];
  stamps.push({page:4,rect:[140.5,pg.getHeight()-619.8,339,pg.getHeight()-619.8+35.8],imageRef:currentImage,fixed:true});
 }
 await flattenDocument(pdf);
 for(const stamp of stamps){
  const page=pdf.getPages()[stamp.page],rect=stamp.rect,ref=slrSignatureImage(stamp.imageRef);
  if(!page||!ref||!Array.isArray(rect)||rect.length!==4)continue;
  try{
   const image=await pdf.embedPng(ref),width=Math.abs(rect[2]-rect[0]),height=Math.abs(rect[3]-rect[1]);
   const ratio=Math.min(width/image.width,height/image.height),w=image.width*ratio,h=image.height*ratio;
   page.drawImage(image,{x:Math.min(rect[0],rect[2])+(width-w)/2,y:Math.min(rect[1],rect[3])+(height-h)/2,width:w,height:h});
  }catch(err){throw Error('Kunde inte lägga in underskriften i '+labelFor(cat)+': '+err.message)}
 }
return new Uint8Array(await pdf.save({useObjectStreams:true}));}
async function flattenDocument(pdf){
 const form=pdf.getForm(),font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),N=PDFLib.PDFName;
 for(const f of form.getFields()){
  if(f instanceof PDFLib.PDFSignature){
   for(const widget of f.acroField.getWidgets()){const r=widget.getRectangle();widget.setNormalAppearance(pdf.context.register(pdf.context.formXObject([],{BBox:[0,0,r.width,r.height],Resources:{}})));}
   form.removeField(f);continue;
  }
  const da=decode(f.acroField.dict.get(N.of("DA"))),size=Number(da.match(/([0-9.]+)\s+Tf/)?.[1])||10;
  const appearance=PDFLib.PDFString.of("/Helvetica "+size+" Tf 0 g");
  f.acroField.dict.set(N.of("DA"),appearance);
  for(const widget of f.acroField.getWidgets())widget.dict.set(N.of("DA"),appearance);
 }
 form.updateFieldAppearances(font);form.flatten({updateFieldAppearances:false});
 pdf.catalog.delete(N.of("AcroForm"));
 for(const page of pdf.getPages())page.node.delete(N.of("Annots"));
}
async function prepareTemplate(bytes,cat){
 const pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});clearRisk(pdf);
 // The existing editable field key stays compatible with saved projects.
 if(cat==="Egenkontroll"&&pdf.getForm().getFields().some(f=>f.getName()==="Drivsystem serienummer")){
  const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);let parsed;
  try{
   parsed=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
   for(let n=0;n<parsed.numPages;n++){
    const text=await (await parsed.getPage(n+1)).getTextContent();
    for(const run of text.items)if(String(run.str).trim().toLowerCase()==="serienummer"){
     const page=pdf.getPages()[n],x=run.transform[4],y=run.transform[5],h=Math.abs(run.transform[3])||10;
     page.drawRectangle({x:x-.5,y:y-2,width:run.width+1,height:h+3,color:PDFLib.rgb(1,1,1)});
     page.drawText("Maskin-ID",{x,y,size:h,font,color:PDFLib.rgb(0,0,0)});
    }
   }
  }finally{try{await parsed?.destroy()}catch(_){}}
 }
 return new Uint8Array(await pdf.save({useObjectStreams:true}));
}
function setup(){if($("slrFlowTestDialog"))return;
const style=elm("style");style.textContent='#slrFlowTestDialog{width:min(850px,96vw);max-height:95dvh;background:#f4f8fa;color:#122f42;border:1px solid #7399b0;border-radius:14px;padding:0}#slrFlowTestDialog::backdrop{background:#061c32b3}#slrFlowTestDialog header{background:#12334e;color:white;padding:16px;display:flex;align-items:center;justify-content:space-between}#slrFlowTestDialog main{padding:16px;max-height:calc(95dvh - 74px);overflow:auto}#slrFlowTestDialog button{padding:9px 12px;border-radius:8px;border:1px solid #90adc0;background:#e5f2f9;color:#103b54;font-size:13px;font-weight:700;margin:3px}#slrFlowTestDialog .slrDocRow{padding:12px 0;border-bottom:1px solid #ccdae2;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}#slrFlowTestDialog #slrEditor[hidden]{display:none!important}#slrFlowTestDialog #slrEditor{padding:8px 0 14px;width:100%;min-width:0}#slrFlowTestDialog .slrEditToolbar{display:flex;align-items:center;justify-content:space-between;gap:10px}#slrFlowTestDialog .slrDocSection{border-bottom:1px solid #ccdae2}#slrFlowTestDialog .slrDocRow small{display:block;color:#426476;margin-top:4px}#slrFlowTestDialog #slrFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;margin:15px 0}#slrFlowTestDialog label{color:#244c66;font-size:13px;display:block}#slrFlowTestDialog select,#slrFlowTestDialog input[type=text],#slrFlowTestDialog input[type=date]{width:100%;min-height:38px;padding:7px;margin-top:4px;background:white;color:#142e3e;border-radius:8px;border:1px solid #a8bfca}#slrFlowTestDialog input[type=checkbox]{width:20px;height:20px}#slrStatusText{font-size:13px;line-height:1.5}@media(max-width:650px){#slrFlowTestDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrFlowTestDialog main{max-height:calc(100dvh - 74px)}}';document.head.append(style);
const folderStatusCss=elm("style");folderStatusCss.id="slrFolderStatusCss";folderStatusCss.textContent="#slrFlowTestDialog .slrFolderProgress{margin-left:auto;white-space:nowrap;padding:5px 9px;font-size:12px;font-weight:800;border-radius:18px;background:#e3e9ed;color:#5f7180}#slrFlowTestDialog .slrFolderProgress.is-partial{background:#d3ecd9;color:#19653c}#slrFlowTestDialog .slrFolderProgress.is-done{background:#b8e7c8;color:#126138}#slrFlowTestDialog .slrFolderActions button:disabled{opacity:.45;cursor:not-allowed}#slrFlowTestDialog .slrFolderActions button{font-size:12px}";document.head.append(folderStatusCss);
const d=elm("dialog");d.id="slrFlowTestDialog";d.innerHTML='<header><div><strong id="slrTestHeading">SLR TEST</strong><div style="font-size:12px;opacity:.8">Öppna en mapp för att visa verktygen</div></div><button id="slrTestExit" type="button">Stäng ×</button></header><main><div id="slrTestSource" style="font-size:13px;margin:9px 0"></div><div id="slrProfilesPanel" style="padding:10px;margin:8px 0;border:1px solid #b8d1dd;border-radius:10px;background:#eff7fc"><label style="font-weight:700" for="slrDoorProfile">Standard för dörrtyp</label><select id="slrDoorProfile" style="margin:7px 0;width:100%;min-height:42px"><option value="">Ingen profil (manuell)</option><option value="glass">Med glas</option><option value="noGlass">Utan glas</option></select><div id="slrDoorProfileCaption" style="font-size:12px;line-height:1.5;color:#315568"></div><details class="slrProfileSettings"><summary>Standardinställningar</summary><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px"><button id="slrSaveProfileChecks" type="button" style="padding:8px;border:1px solid #8aa9ba;border-radius:7px">Spara som standard</button><button id="slrResetDoorChecks" type="button" style="padding:8px;border:1px solid #8aa9ba;border-radius:7px">Återställ denna dörr</button></div><div style="margin-top:7px;font-size:12px;color:#315568">Öppna en dokumentmapp för att visa eller ändra denna dörr.</div></details></div><div id="slrTestDocRows"></div><div class="slrCompleteBar"><button id="slrMarkFiveReviewed" type="button" title="Markera Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran och Egenkontroll på denna dörrautomatik">☑ Markera fem dokument kontrollerade</button><button id="slrDoneDoor" type="button">Klart</button><button id="slrCustomerExport" type="button" style="padding:10px 13px;border:1px solid #8aa9ba;border-radius:8px;background:#fff">Exportera dörrmappar</button></div><section id="slrEditor" hidden><div class="slrEditToolbar"><h3 id="slrEditHeading" style="font-size:16px"></h3><button id="slrCloseEditor" type="button">Stäng redigering</button></div><div id="slrFields"></div></section><p id="slrStatusText"></p></main><input id="slrFileSelect" type="file" style="display:none" accept=".pdf,application/pdf"><input id="slrCameraSelect" type="file" hidden accept="image/*" capture="environment"><input id="slrPhotoSelect" type="file" hidden accept="image/*">';
document.body.append(d);$("slrDoorProfile").onchange=e=>slrSetDoorProfile(e.target.value);$("slrSaveProfileChecks").onclick=()=>void slrCaptureProfile().catch(err=>announce(err.message,true));$("slrResetDoorChecks").onclick=()=>void slrResetCurrentDoor().catch(err=>announce(err.message,true));$("slrCustomerExport").onclick=()=>void openExport(bridge).catch(err=>announce(err.message,true));$("slrDoneDoor").onclick=()=>void slrComplete().catch(err=>announce(err.message,true));$("slrMarkFiveReviewed").onclick=()=>void slrMarkFiveReviewed().catch(err=>announce(err.message,true));for(const id of ["slrCameraSelect","slrPhotoSelect"])$(id).onchange=e=>{const input=e.target,file=input.files?.[0],current=input._door;input.value="";void slrSavePhoto(file,current).catch(err=>announce(err.message,true));};$("slrTestExit").onclick=()=>d.close();$("slrCloseEditor").onclick=slrCloseEditor;d.addEventListener("close",slrCloseEditor);
$("slrFileSelect").onchange=async e=>{const f=e.target.files?.[0],cat=picked;e.target.value="";if(!f||!cat)return;
try{if(f.size>20*1024*1024)throw Error("Max 20 MB per mall i första testet");if(cat!=="CE-skylt"&&!/\.pdf$/i.test(f.name))throw Error("Välj en PDF-fil");
let bytes=new Uint8Array(await f.arrayBuffer());if(/\.pdf$/i.test(f.name)){bytes=await prepareTemplate(bytes,cat);}
templates[cat]=bytes;names[cat]=f.name;delete checkKeyCache[cat];delete choiceGroups[cat];if(/\.pdf$/i.test(f.name))await slrInspectChoices(cat,bytes);reviewedFolders={};slrInvalidate();bridge?.save?.();bridge?.redraw?.();draw();announce(cat+" har lagts in som projektmall för samtliga dörrautomatiker.")}
catch(err){announce(err.message,true)}};
}
async function open(o,b,verification){
 if(!o)return;
 const category=item?.id===o.id?slrEditingCategory:"";if(item?.id!==o.id){slrEditingCategory="";slrEditScope="door";openedFolders.clear();}item=o;bridge=b;verificationByDoor[o.id]=verification||{};setup();slrClearEditor();
 const d=$("slrFlowTestDialog");if(!d.open)d.showModal();
 $("slrTestHeading").textContent="SLR · "+slrDoorDesignation(o);
 $("slrTestSource").textContent=verification?.gs?"GS "+verification.gs.code+" verifierad":"Kontrollera GS-kopplingen innan uppgifter hämtas från dörrkort";
 announce("Öppnar SLR-mallar från projekt-PDF…");
 try{
  await loadTemplates();if(item!==o)return;
  draw();slrRefreshProfilePanel();
  if(category&&templates[category])await editDoc(category);else{slrEditingCategory="";$("slrEditor").hidden=true;}
  if(item===o)announce(templateLoadWarning||"SLR-dokument för "+slrDoorDesignation(o)+".",!!templateLoadWarning);
 }catch(err){if(item===o){draw();announce("Bilagor kunde inte läsas: "+err.message,true)}}
}
function slrFolderCaption(obj,cat){
 const pct=slrFolderPercent(obj,cat),choices=slrChoiceProgress(obj,cat);
 if(pct===100)return 'Kontrollerat · 100 %';
 if(pct===50)return choices.total?'Alla klickpunkter besvarade · 50 %':'Förberett · 50 %';
 if(choices.total)return choices.done+' av '+choices.total+' klickpunkter besvarade';
 return slrDocumentAvailable(obj,cat)?'Dokument finns · ej kontrollerat':'Lägg till dokument';
}
function slrRefreshFolderStatuses(){
 if(!item)return;
 for(const section of $('slrTestDocRows')?.children||[]){
  const cat=section.dataset.slrCategory,pct=slrFolderPercent(item,cat),badge=section.querySelector?.('.slrFolderProgress'),caption=section.querySelector?.('summary small');
  if(badge){badge.textContent=pct===100?'✓ 100 %':pct===50?'◐ 50 %':'○ 0 %';badge.className='slrFolderProgress '+(pct===100?'is-done':pct===50?'is-partial':'is-empty');}
  if(caption)caption.textContent=slrFolderCaption(item,cat);
 }
}
function draw(){
 if(!item||!$('slrTestDocRows'))return;
 const root=$('slrTestDocRows'),editor=$('slrEditor');if(editor)root.after(editor);root.replaceChildren();
 for(const [index,cat]of cats.entries()){
  const section=elm('details');section.className='slrDocSection slrFolder';section.dataset.slrCategory=cat;section.open=openedFolders.has(cat)||slrEditingCategory===cat;
  const summary=elm('summary'),icon=elm('span','📁'),label=elm('span');icon.className='slrFolderIcon';label.append(elm('strong',(index+1)+'. '+labelFor(cat)));
  label.append(elm('small',slrFolderCaption(item,cat)));summary.append(icon,label);const pct=slrFolderPercent(item,cat),state=elm('span',pct===100?'✓ 100 %':pct===50?'◐ 50 %':'○ 0 %');state.className='slrFolderProgress '+(pct===100?'is-done':pct===50?'is-partial':'is-empty');summary.append(state);section.append(summary);
  section.addEventListener('toggle',()=>{if(section.open)openedFolders.add(cat);else{openedFolders.delete(cat);if(slrEditingCategory===cat)slrCloseEditor();}});
  const buttons=elm('div');buttons.className='slrFolderActions';
  const action=(text,fn)=>{const b=elm('button',text);b.type='button';b.onclick=fn;buttons.append(b);return b;};
  if(cat==='Produktlista'){
   action(productFiles[item.id]?'Uppdatera PDF':'Skapa PDF',()=>void createProductList(item));
   if(productFiles[item.id])action('Visa PDF',()=>void previewDoc(cat));
  }else if(cat==='CE-skylt'){
   const choose=camera=>{const input=$(camera?'slrCameraSelect':'slrPhotoSelect');input._door=item;input.click();};
   action('Ta bild',()=>choose(true));action(doorPhotos[item.id]?'Ersätt bild':'Välj bild',()=>choose(false));
   if(slrDocumentAvailable(item,cat))action(doorPhotos[item.id]||/\.(png|jpe?g)$/i.test(names[cat]||'')?'Visa bild':'Visa PDF',()=>void previewDoc(cat));
  }else{
   const replace=action(templates[cat]?'Ersätt fil':'Lägg till fil',()=>{picked=cat;$('slrFileSelect').accept='.pdf,application/pdf';$('slrFileSelect').click();});replace.title='Byter projektets gemensamma mall. Dörrens egna svar behålls.';
   if(templates[cat]){
    action('Visa PDF',()=>void previewDoc(cat));
    const shared=action(slrEditingCategory===cat&&slrEditScope==='profile'&&!editor?.hidden?'Stäng redigering':'Ändra standard',()=>slrStartEditing(cat,'profile'));shared.dataset.slrEdit=cat;shared.dataset.slrScope='profile';shared.title='Ändrar för alla med samma Med glas/Utan glas-standard';shared.disabled=!slrDoorProfile(item);
    const own=action(slrEditingCategory===cat&&slrEditScope==='door'&&!editor?.hidden?'Stäng redigering':'Endast denna dörr',()=>slrStartEditing(cat,'door'));own.dataset.slrEdit=cat;own.dataset.slrScope='door';own.title='Ändra endast denna dörrautomatik';
   }
   const note=elm('small',templates[cat]?'Gemensam mall: '+names[cat]:'Ladda upp projektets gemensamma PDF-mall.');note.className='slrFolderFile';buttons.append(note);
  }
  action(reviewedFolders[item.id]?.[cat]||completedDoors[item.id]?'✓ Kontrollerat':'☐ Markera kontrollerat',()=>void slrToggleReviewed(item,cat));section.append(buttons);root.append(section);if(editor&&slrEditingCategory===cat&&!editor.hidden)section.append(editor);
 }
 const done=$('slrDoneDoor');if(done){done.textContent=completedDoors[item.id]?'Klart · 100 % · öppna igen':'Klart · '+slrProgress(item)+' %';done.classList.toggle('is-done',!!completedDoors[item.id]);}
 const bulk=$('slrMarkFiveReviewed');if(bulk){const allDone=bulkReviewCats.every(cat=>reviewedFolders[item.id]?.[cat]||completedDoors[item.id]);bulk.disabled=allDone;bulk.textContent=allDone?'✓ Fem dokument kontrollerade':'☑ Markera fem dokument kontrollerade';}
}

function slrProductRows(items){
 const rows=[];
 for(const token of [...(items||[])].filter(t=>t.text&&Number.isFinite(t.x)&&Number.isFinite(t.y)).sort((a,b)=>b.y-a.y||a.x-b.x)){
  let row=rows.find(r=>Math.abs(r.y-token.y)<=Math.max(1,Math.min(3,Number(token.h||6)*.35)));
  if(!row){row={y:token.y,items:[]};rows.push(row);}row.items.push(token);
 }
 const tag=t=>/^(?:G\s*S|D\s*T|E\s*L)$/i.test(String(t.text).trim());
 const candidates=rows.map(row=>{
  const tokens=row.items.sort((a,b)=>a.x-b.x),owner=tokens.find(tag);
  return {...row,tokens,owner,left:owner?tokens.filter(t=>t.x<owner.x-2):[]};
 }).filter(r=>r.owner&&r.left.length>=2);
 // Repeated x positions identify the product-value column without using a fixed page size.
 const clusters=[];
 for(const row of candidates)for(const token of row.left.slice(1)){
  let cluster=clusters.find(c=>Math.abs(c.x-token.x)<2);
  if(!cluster){cluster={x:token.x,count:0};clusters.push(cluster);}cluster.count++;
 }
 const valueX=clusters.sort((a,b)=>b.count-a.count||a.x-b.x)[0]?.x;
 if(valueX===undefined)return [];
 const present=value=>!!value&&!/^(?:[-–—.]+|nej|n\/a|ej aktuellt|ingår ej)$/i.test(value.trim());
 let group="Produkter";const result=[];
 for(const row of rows){
  const tokens=row.items.sort((a,b)=>a.x-b.x),heading=tokens.map(t=>t.text).join(" ").trim();
  if(/^(Daglåsning|Nattlåsning|Dörrstängning|Larm\s*\/\s*Passer|Dörrbeslag|Övriga beslag|Övrigt)$/i.test(heading)){group=heading;continue;}
  const candidate=candidates.find(c=>c.y===row.y);if(!candidate)continue;
  const labels=candidate.left.filter(t=>t.x<valueX-2),values=candidate.left.filter(t=>t.x>=valueX-2);
  if(!labels.length||!values.length||Math.abs(values[0].x-valueX)>3)continue;
  const product=[values[0]];
  for(const token of values.slice(1)){
   const last=product[product.length-1],gap=token.x-last.x-Number(last.w||0);
   if(gap>Math.max(4,Number(token.h||6)*1.2))break;
   product.push(token);
  }
  const name=labels.map(t=>t.text).join(" ").trim(),value=product.map(t=>t.text).join(" ").trim();
  if(!present(value)||/^(?:Littera|Antal|Hängning|Brandkrav|Skyddsklass|Utrymningskrav|Återinrymning)$/i.test(name))continue;
  result.push({group,name,value});
 }
 return result;
}
function slrOwnProducts(current,source){
 const positions=bridge?.getPositions?.()||[],direct=positions.find(p=>p.id===source.gs.id);
 // A GS may occur on several floors. Never copy custom items from a different physical position.
 const same=positions.filter(p=>String(p.code||"").replace(/\s/g,"").toUpperCase()===String(source.gs.code||"").replace(/\s/g,"").toUpperCase()&&p.page===source.gs.page);
 const position=direct||(same.length===1?same[0]:null),seen=new Set(),result=[];
 for(const point of [...(current.customItems||[]),...(position?.customItems||[])]){
  const name=String(point.label||"").trim(),value=String(point.value||"").trim();
  if(!name||/^(?:[-–—.]+|nej|ej aktuellt|ingår ej)$/i.test(value))continue;
  const key=(name+"|"+value).toLocaleLowerCase("sv-SE");if(seen.has(key))continue;seen.add(key);
  result.push({group:"Egna produkter",name,value});
 }
 return result;
}
async function createProductList(current){
 if(!current)return;
 const source=window.SmartMatchDALink?.getSLRSource?.(current)||verificationByDoor[current.id];
 if(!source?.gs||!source.cardPage){announce(source?.reason||"Verifiera GS-kopplingen innan produktlistan skapas.",true);return;}
 const cards=source.cardPages||[source.cardPage];
 if(cards.length!==1){announce("Flera dörrkort har samma GS. Välj rätt dörrkort i projektet innan produktlistan skapas.",true);return;}
 try{
  announce("Hämtar produkter från "+source.gs.code+"…");
  const data=await bridge.readPageText(source.cardPage);
  const cardRows=slrProductRows(data.items),rows=[...cardRows,...slrOwnProducts(current,source)];
  if(!cardRows.length)throw Error("Dörrkortets två produktkolumner kunde inte läsas säkert. Ingen produktlista har skapats.");
  const result=await PDFLib.PDFDocument.create(),font=await result.embedFont(PDFLib.StandardFonts.Helvetica),bold=await result.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const designation=slrDoorDesignation(current);
  let page,y,activeGroup="";const left=40,width=515.28,split=300,lineColor=PDFLib.rgb(.35,.35,.35),black=PDFLib.rgb(0,0,0);
  const clean=value=>Array.from(String(value??"")).map(char=>{try{font.encodeText(char);return char}catch(_){return "?"}}).join("");
  const box=(height,shade=false,divider=true)=>{
   page.drawRectangle({x:left,y:y-height,width,height,borderColor:lineColor,borderWidth:.5,...(shade?{color:PDFLib.rgb(.94,.94,.94)}:{})});
   if(divider)page.drawLine({start:{x:split,y},end:{x:split,y:y-height},thickness:.5,color:lineColor});
  };
  const next=()=>{
   page=result.addPage([595.28,841.89]);y=790;page.drawText("Produktlista",{x:left,y,size:18,font:bold,color:black});y-=24;
   page.drawText(clean(designation+" · "+source.gs.code),{x:left,y,size:10,font,color:black});y-=22;
   box(24,true);page.drawText("Produkt",{x:left+8,y:y-16,size:10,font:bold,color:black});page.drawText("Typ / modell",{x:split+8,y:y-16,size:10,font:bold,color:black});y-=24;
  };
  const wrap=(value,max)=>{
   const lines=[];let part="";
   for(const word of clean(value).split(/\s+/)){
    if(!word)continue;
    for(const char of (part?" ":"")+word){if(part&&font.widthOfTextAtSize(part+char,9.5)>max){lines.push(part.trim());part="";}part+=char;}
   }
   if(part.trim())lines.push(part.trim());return lines;
  };
  next();
  for(const row of rows){
   const a=wrap(row.name,split-left-16),b=wrap(row.value,left+width-split-16),height=Math.max(24,Math.max(a.length,b.length)*13+9);
   if(y-height-(activeGroup!==row.group?24:0)<45){next();activeGroup="";}
   if(activeGroup!==row.group){box(23,true,false);page.drawText(clean(row.group),{x:left+8,y:y-16,size:10,font:bold,color:black});y-=23;activeGroup=row.group;}
   box(height);for(const [lines,x] of [[a,left+8],[b,split+8]])lines.forEach((text,index)=>page.drawText(text,{x,y:y-16-index*13,size:9.5,font,color:black}));y-=height;
  }
  const output=new Uint8Array(await result.save({useObjectStreams:true}));
  if(item!==current)return;
  const live=window.SmartMatchDALink?.getSLRSource?.(current)||source;
  if(!live.gs||live.gs.code!==source.gs.code||live.cardPage!==source.cardPage)throw Error("GS-kopplingen ändrades. Skapa produktlistan igen.");
  productFiles[current.id]={bytes:output,designation,gsCode:source.gs.code,cardPage:source.cardPage,format:"two-columns-v1",rowCount:rows.length};
  slrDirty(current,"Produktlista");draw();announce("Produktlistan är skapad för "+designation+". Spara projekt-PDF för att ta med den.");
 }catch(err){announce("Kunde inte skapa produktlistan: "+err.message,true);}
}
async function previewDoc(cat){
 const current=item;if(!current)return;
 const serial=++slrPreviewSerial;
 try{
  const bytes=await compose(cat,current);if(serial!==slrPreviewSerial||item!==current)return;
  let dialog=$('slrPdfPreviewDialog');
  if(!dialog){
   const css=elm('style');css.id='slrPreviewStyle';
   css.textContent='#slrPdfPreviewDialog{width:min(940px,97vw);height:min(94dvh,1100px);max-height:95dvh;padding:0;border:1px solid #789fb4;border-radius:12px;background:#e8f0f5;color:#16384d}#slrPdfPreviewDialog::backdrop{background:#07192bc9}#slrPdfPreviewDialog header{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#12334e;color:white;padding:12px 15px;position:sticky;top:0;z-index:2}#slrPdfPreviewDialog header button{border:1px solid #bcd0d9;border-radius:7px;padding:8px 12px;background:white;color:#12334e;font-weight:700}#slrPreviewContent{overflow:auto;max-height:calc(94dvh - 63px);height:calc(94dvh - 63px);padding:14px;box-sizing:border-box;overscroll-behavior:contain}#slrPreviewContent .slrPreviewPage{margin:0 auto 16px;width:max-content;max-width:100%;background:white;box-shadow:0 2px 10px #102b3e36}#slrPreviewContent canvas{display:block;max-width:100%;height:auto}#slrPreviewContent img{display:block;margin:auto;max-width:100%;height:auto}@media(max-width:650px){#slrPdfPreviewDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrPreviewContent{height:calc(100dvh - 64px);max-height:calc(100dvh - 64px);padding:7px}}';
   document.head.append(css);
   dialog=elm('dialog');dialog.id='slrPdfPreviewDialog';
   dialog.innerHTML='<header><strong id="slrPreviewTitle">Visa PDF</strong><button id="slrPreviewClose" type="button">Stäng ×</button></header><main id="slrPreviewContent"></main>';
   document.body.append(dialog);
   $('slrPreviewClose').onclick=()=>dialog.close();
   dialog.addEventListener('close',()=>{slrPreviewSerial++;const oldUrl=dialog.dataset.previewUrl;if(oldUrl){URL.revokeObjectURL(oldUrl);delete dialog.dataset.previewUrl}});
  }
  if(dialog.dataset.previewUrl){URL.revokeObjectURL(dialog.dataset.previewUrl);delete dialog.dataset.previewUrl}
  const title=$('slrPreviewTitle'),body=$('slrPreviewContent');
  title.textContent=labelFor(cat)+' · '+slrDoorDesignation(current);
  body.replaceChildren();body.scrollTop=0;
  if(!dialog.open)dialog.showModal();
  const photo=cat==='CE-skylt'?doorPhotos[current.id]:null;
  const img=!!photo||cat==='CE-skylt'&&/\.(png|jpe?g)$/i.test(names[cat]||'');
  if(img){
   const mime=photo?.type||(/\.png$/i.test(names[cat]||'')?'image/png':'image/jpeg');
   const url=URL.createObjectURL(new Blob([bytes],{type:mime}));dialog.dataset.previewUrl=url;
   const picture=elm('img');picture.src=url;picture.alt='CE-skylt · '+slrDoorDesignation(current);body.append(picture);return;
  }
  if(!window.pdfjsLib?.getDocument)throw Error('PDF-visaren kunde inte laddas.');
  const task=window.pdfjsLib.getDocument({data:bytes.slice()}),documentPdf=await task.promise;
  try{
   for(let n=1;n<=documentPdf.numPages;n++){
    if(serial!==slrPreviewSerial||!dialog.open)return;
    const page=await documentPdf.getPage(n),initial=page.getViewport({scale:1});
    const available=Math.min(780,Math.max(240,body.clientWidth-30));
    const view=page.getViewport({scale:Math.min(2,available/initial.width)}),dpr=Math.min(window.devicePixelRatio||1,1.5);
    const sheet=elm('div');sheet.className='slrPreviewPage';
    const canvas=elm('canvas');canvas.width=Math.ceil(view.width*dpr);canvas.height=Math.ceil(view.height*dpr);
    canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';sheet.append(canvas);body.append(sheet);
    await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:view,transform:[dpr,0,0,dpr,0,0]}).promise;
   }
  }finally{await documentPdf.destroy()}
 }catch(err){const body=$('slrPreviewContent');if(body&&serial===slrPreviewSerial)body.append(elm('p','Kunde inte visa dokumentet: '+err.message));announce('Kunde inte visa dokumentet: '+err.message,true)}
}
async function editDocBasic(cat){
const current=item;if(!current)return;slrMountEditor(cat);const revision=++slrEditorRevision;
$("slrFields").className="";$("slrFields").replaceChildren();$("slrEditHeading").textContent=cat+" · "+(slrEditScope==="profile"?"Ändra standard":"Endast "+slrDoorDesignation(current));
const p=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
if(item!==current||slrEditorRevision!==revision)return;
const fields=p.getForm().getFields(),values=slrEffectiveFields(current,cat),defaults=auto(current),id=current.id;
for(const f of fields){const name=f.getName(),k=kind(f);if(!k)continue;const l=elm("label",name);let input;
if(k==="text"){input=elm("input");slrConfigureTextInput(input,name,slrFieldValue(current,name,values,defaults));if(name==="Dörrnummer, beteckning")input.readOnly=true;}
else if(k==="check"){input=elm("input");input.type="checkbox";input.checked=values[name]===true;}
else{input=elm("select");const empty=elm("option","Ej valt");empty.value="";input.append(empty);for(const opt of f.getOptions()){const option=elm("option",opt);option.value=opt;input.append(option)}input.value=values[name]||"";}
input.addEventListener("change",()=>{if(item!==current)return;const v=k==="check"?input.checked:input.value;
slrWriteField(current,cat,name,v);announce((slrEditScope==="profile"?"Standarden":"Dörrautomatiken")+" har ändrats. Spara projekt-PDF för att flytta arbetet.")});
l.append(input);$("slrFields").append(l)}
$("slrEditHeading").scrollIntoView({block:"start",behavior:"smooth"});
}

/* TEST: SLR form follows the original PDF across five scrollable pages. */
let slrEditorRevision=0;
function slrDirty(obj,cat){if(reviewedFolders[obj?.id])delete reviewedFolders[obj.id][cat];slrInvalidate(obj);if(item?.id===obj?.id&&$("slrDoneDoor")){$("slrDoneDoor").textContent="Klart";$("slrDoneDoor").classList.remove("is-done");}if(!obj.slrDocuments)obj.slrDocuments={};obj.slrDocuments[cat]={...(obj.slrDocuments[cat]||{}),status:"doing"};bridge?.save?.();bridge?.redraw?.();}

let slrPageZoom=1;
function slrDecode(v){return String(v??"").replace(/#([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))}
function slrChoiceText(name,val){
 const lookup={
  "4.6.1":["Hög risk: heltäckande säkerhetssensor","Hög risk: säkerhetsmatta","Låg risk: säkerhetssensor","Låg risk: begränsad rörelseenergi","Låg risk: säkerhetsmatta"],
  "4.6.2":["Hög risk: heltäckande säkerhetssensor","Hög risk: säkerhetsmatta","Låg risk: begränsad rörelseenergi","Låg risk: säkerhetsmatta"],
  "4.6.3":["Integrerat mekaniskt klämskydd","Eftermonterat mekaniskt klämskydd","Elektrisk skyddsanordning övervakar klämrisk","Separat elektrisk skyddsanordning"],
  "4.6.4":["Glas uppfyller personsäkerhet","Dörren ej glasad"],
  "4.6.6":["Kontrastmarkering av glasdörr","Dörren ej glasad"],
  "4.6.9":["Stickproppsanslutning","Tvåpolig arbetsbrytare","Tvåpolig säkerhetsbrytare"],
  "4.6.11":["Godkänd för brandskyddande dörr","Ej tillämpligt: ej brandcellsgräns"],
  "4.6.12":["Plats för impulsgivare finns","Stolpe eller annan lösning behövs"],
  "4.6.13":["Inga övriga risker identifierade","Kvarstående risker identifierade"]
 };
 const v=slrDecode(val);
 if(name==="4.4 Risknivå")return v||"Risknivå";
 if(name==="Antal dörrblad"||name==="Antal maskindrivna")return name+" – "+v;
 if(name.startsWith("4.3 Objektsorientering")){
  const names=["Offentlig lokal","Kommersiell lokal","Privat bostad","Övrigt","Förskola/skola","Övrig skolverksamhet","Vårdinrättning","Äldreboende","Kontor","Butik","Restaurang","Annan miljö"];
  const n=parseInt(name.match(/\d+$/)?.[0],10);return names[n-1]||name;
 }
 const values=lookup[name],m=v.match(/Val\s*(\d+)/i);
 if(values&&m){let idx=Number(m[1])-1;if(/Låg/i.test(v))idx+=name==="4.6.2"?1:2;return values[idx]||name+" – "+v}
 return [name,v].filter(Boolean).join(" – ");
}
function slrDrawChoice(b,chosen){
 b.classList.toggle("is-chosen",!!chosen);b.replaceChildren();
 if(chosen){
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 12 12");svg.setAttribute("aria-hidden","true");
  svg.style.cssText="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:var(--slr-mark-width,10px);height:var(--slr-mark-height,10px);pointer-events:none";
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d","M2 2 L10 10 M10 2 L2 10");
  path.setAttribute("fill","none");path.setAttribute("stroke","#17232a");
  path.setAttribute("stroke-width","1.65");path.setAttribute("stroke-linecap","square");
  svg.append(path);b.append(svg);
 }
 b.setAttribute("aria-pressed",String(!!chosen));
}
function slrShowChoice(text,selected,pageNumber){
 const n=$("slrChoiceFeedback");if(n)n.textContent=(selected?"Markerat: ":"Avmarkerat: ")+text+" · sida "+pageNumber;
}
function slrStyles(){if($("slrOriginalStyle"))return;const elStyle=elm("style");elStyle.id="slrOriginalStyle";
elStyle.textContent="#slrFlowTestDialog #slrFields.slrOriginalPages{display:flex;flex-direction:column;gap:14px;align-items:center;margin:10px 0 24px}.slrOriginalPage{position:relative;flex-shrink:0;background:#fff;border:1px solid #b7cbd5;box-shadow:0 3px 9px #153b5233;overflow:hidden}.slrOriginalPage canvas{display:block}.slrOverlayText{position:absolute;z-index:3;box-sizing:border-box;display:block;min-width:0!important;min-height:0!important;margin:0!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#000!important;font-family:Arial,Helvetica,sans-serif!important;font-weight:400!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;resize:none}.slrOverlayChoice{appearance:auto!important;-webkit-appearance:auto!important;cursor:pointer}.slrOverlayDate{cursor:pointer!important;color-scheme:light}.slrOverlayDate::-webkit-calendar-picker-indicator{margin:0;padding:0;width:1em;height:1em;cursor:pointer}.slrOverlayText:focus{outline:1px solid #0b87c0!important;outline-offset:0!important;background:#ffffffef!important;z-index:6}.slrOverlayTick{position:absolute;z-index:4;box-sizing:border-box;min-width:0!important;min-height:0!important;display:grid;place-items:center;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#000!important;font-family:Arial,sans-serif;font-weight:700;cursor:pointer;line-height:1!important;touch-action:manipulation;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important}.slrOverlayTick.is-chosen{border:0!important;background:transparent!important;color:#000!important;box-shadow:none!important;font-weight:900!important}.slrOverlayTick:focus-visible{outline:2px solid #0277aa!important;outline-offset:2px}.slrChoiceInfo{position:sticky;top:0;z-index:12;box-sizing:border-box;width:100%;padding:9px;color:#174867;background:#e4f5ff;border:1px solid #69b2d4;border-radius:7px;font-size:12px;font-weight:750;line-height:1.4}.slrZoomOptions{width:100%;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.slrZoomOptions button{margin:0!important;min-height:32px!important;padding:6px 11px!important}.slrZoomOptions button[aria-pressed=true]{border:2px solid #0075aa!important;background:#def3ff!important}.slrOriginalPages.slrZoomWide{align-items:flex-start!important}.slrSignatureOnPdf{min-height:0!important;min-width:0!important;position:absolute;z-index:5;margin:0!important;padding:1px!important;border:1px dashed #83a9bf!important;border-radius:2px!important;background:#eaf5f9aa!important;font-size:10px!important;overflow:hidden;color:#163e55!important}.slrSignatureDlg{width:min(760px,95vw);border:1px solid #88a8ba;border-radius:10px;background:#f8fbff;padding:14px}.slrSignatureDlg::backdrop{background:#06192dbb}.slrSignatureDlg canvas{width:100%;height:175px;touch-action:none;background:white;border:1px solid #92afc0;display:block;margin:12px 0}.slrSignatureDlg button{padding:8px;margin:4px;border:1px solid #8badbe;border-radius:6px}.slrPdfTip{font-size:12px;line-height:1.5;width:100%;border:1px solid #b7d2df;border-radius:7px;padding:9px;background:#e7f2f8;box-sizing:border-box}@media(max-width:650px){#slrFlowTestDialog main{padding:8px}#slrFlowTestDialog #slrFields.slrOriginalPages{gap:9px}.slrSignatureDlg canvas{height:150px}}";
elStyle.textContent+="#slrFlowTestDialog .slrOriginalPage{cursor:grab}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage{cursor:grabbing}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage canvas{cursor:grabbing}#slrFlowTestDialog .slrOverlayText{cursor:text}#slrFlowTestDialog .slrOverlayTick{cursor:pointer}#slrFlowTestDialog .slrZoomAmount{font-size:12px;font-weight:800;min-width:40px;text-align:center}#slrFlowTestDialog .slrZoomOptions small{font-size:11px;color:#4b6878;line-height:1.4}";document.head.append(elStyle);}
function slrApplySignature(obj,cat,button,imageRef,key,placement){
 doorSignatures[obj.id]=imageRef;delete reviewedFolders[obj.id];
 if(key){const entry=saved(obj,cat);if(!entry.signatures)entry.signatures={};entry.signatures[key]={image:imageRef,page:placement.page,rect:placement.rect.slice()};}else saved(obj,cat).signature=imageRef;
 slrDirty(obj,cat);button.replaceChildren();const picture=elm("img");picture.src=slrSignatureImage(imageRef);picture.style.cssText="width:100%;height:100%;object-fit:contain";button.append(picture);
 announce("Projektets signatur används på detta dokument för "+slrDoorDesignation(obj)+".");
}
function slrOpenSign(obj,cat,button,key=null,placement=null){
 const existing=slrSignatureFor(obj,cat,key),last=Object.keys(signatureLibrary).at(-1);
 if(!existing&&last){slrApplySignature(obj,cat,button,'@sig:'+last,key,placement);return;}
 const d=elm("dialog");d.className="slrSignatureDlg";d.append(elm("strong","Signera "+labelFor(cat)+" · "+slrDoorDesignation(obj)));
 const c=elm("canvas");c.width=700;c.height=210;const x=c.getContext("2d");x.strokeStyle="#1c4463";x.lineWidth=3.5;x.lineJoin="round";x.lineCap="round";
 const old=slrSignatureImage(slrSignatureFor(obj,cat,key));if(old){const img=new Image();img.onload=()=>x.drawImage(img,0,0,c.width,c.height);img.src=old}
 let hasInk=!!old,down=false,prev=null;const at=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.addEventListener("pointerdown",e=>{down=true;prev=at(e);c.setPointerCapture(e.pointerId);e.preventDefault()});
 c.addEventListener("pointermove",e=>{if(!down)return;let p=at(e);x.beginPath();x.moveTo(...prev);x.lineTo(...p);x.stroke();hasInk=true;prev=p;e.preventDefault()});
 c.addEventListener("pointerup",()=>down=false);c.addEventListener("pointercancel",()=>down=false);d.append(c);
 const actions=elm("div");
 const persist=(imageRef)=>{slrApplySignature(obj,cat,button,imageRef,key,placement);d.close();};
 const actionsList=[["Rensa",()=>{x.clearRect(0,0,c.width,c.height);hasInk=false;}],["Avbryt",()=>d.close()]];
 const lastSignature=Object.keys(signatureLibrary).at(-1);
 if(lastSignature)actionsList.push(["Använd sparad signatur",()=>persist('@sig:'+lastSignature)]);
 actionsList.push(["Signera och spara",()=>{if(!hasInk)return;persist(slrStoreSignatureImage(c.toDataURL("image/png")));}]);
 for(const [label,fn] of actionsList){const btn=elm("button",label);btn.type="button";btn.onclick=fn;actions.append(btn)}
 d.append(actions);document.body.append(d);d.addEventListener("close",()=>d.remove(),{once:true});d.showModal();
}

function slrZoomTo(cat,newZoom,sourcePage,focusY,focusX){
 const main=$("slrFlowTestDialog")?.querySelector("main");
 const pages=Array.from($("slrFields")?.querySelectorAll(".slrOriginalPage")||[]);
 if(!sourcePage&&pages.length){
  const mid=main.getBoundingClientRect().top+main.clientHeight/2;
  sourcePage=pages.find(pg=>pg.getBoundingClientRect().bottom>=mid)||pages[0];
 }
 const rect=sourcePage?.getBoundingClientRect();
 const y=Number.isFinite(focusY)?focusY:(main?.getBoundingClientRect().top||0)+(main?.clientHeight||0)/2;
 const x=Number.isFinite(focusX)?focusX:(main?.getBoundingClientRect().left||0)+(main?.clientWidth||0)/2;
 const anchor=rect?{index:Number(sourcePage.dataset.slrPageIndex),ratio:Math.max(0,Math.min(1,(y-rect.top)/Math.max(1,rect.height))),ratioX:Math.max(0,Math.min(1,(x-rect.left)/Math.max(1,rect.width))),x,y}:null;
 const next=Math.max(1,Math.min(3.5,Math.round(newZoom*100)/100));
 if(Math.abs(slrPageZoom-next)<0.02)return;
 slrPageZoom=next;
 void editDoc(cat,anchor);
}
function slrEnablePinch(page,cat){
 let start=null,scale=1,focus=0,focusX=0;
 const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
 page.addEventListener("touchstart",event=>{
  if(event.touches.length!==2)return;
  start={distance:Math.max(20,distance(event.touches)),zoom:slrPageZoom};
  focus=(event.touches[0].clientY+event.touches[1].clientY)/2;
  focusX=(event.touches[0].clientX+event.touches[1].clientX)/2;
  const rect=page.getBoundingClientRect();
  page.style.transformOrigin=(Math.max(0,Math.min(100,100*(focusX-rect.left)/rect.width)))+"% "+(Math.max(0,Math.min(100,100*(focus-rect.top)/rect.height)))+"%";
  scale=1;
 },{passive:true});
 page.addEventListener("touchmove",event=>{
  if(!start||event.touches.length!==2)return;
  if(event.cancelable)event.preventDefault();
  focus=(event.touches[0].clientY+event.touches[1].clientY)/2;
  focusX=(event.touches[0].clientX+event.touches[1].clientX)/2;
  const requestedZoom=Math.max(1,Math.min(3.5,start.zoom*distance(event.touches)/start.distance));
  scale=requestedZoom/start.zoom;
  page.style.transformOrigin="50% 50%";
  page.style.transform="scale("+scale+")";
  page.style.zIndex="10";
 },{passive:false});
 const finish=event=>{
  if(!start||event.touches.length>=2)return;
  const next=Math.max(1,Math.min(3.5,start.zoom*scale));
  start=null;page.style.transform="";page.style.zIndex="";
  slrZoomTo(cat,next,page,focus,focusX);
 };
 page.addEventListener("touchend",finish,{passive:true});
 page.addEventListener("touchcancel",()=>{start=null;page.style.transform="";page.style.zIndex=""},{passive:true});
}
/* Desktop: drag blank PDF space to pan; zoom only with + and − controls.
   The actual PDF widget elements retain normal click and text editing. */
function slrEnableNavigation(host,cat){
 if(host.dataset.slrNavigationBound)return;
 host.dataset.slrNavigationBound="1";
 const main=$("slrFlowTestDialog")?.querySelector("main");
 let pan=null;
 host.addEventListener("pointerdown",event=>{
  if(event.pointerType!=="mouse"||event.button!==0||!main)return;
  if(!event.target.closest?.(".slrOriginalPage")||event.target.closest?.("button,input,textarea,select,label"))return;
  pan={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:main.scrollLeft,top:main.scrollTop};
  host.classList.add("slrMouseDragging");
  try{host.setPointerCapture(event.pointerId)}catch(_){}
  event.preventDefault();
 });
 host.addEventListener("pointermove",event=>{
  if(!pan||event.pointerId!==pan.pointerId||!main)return;
  main.scrollLeft=pan.left-(event.clientX-pan.x);
  main.scrollTop=pan.top-(event.clientY-pan.y);
  event.preventDefault();
 });
 const finish=event=>{
  if(!pan||event.pointerId!==pan.pointerId)return;
  try{host.releasePointerCapture(event.pointerId)}catch(_){}
  pan=null;host.classList.remove("slrMouseDragging");
 };
 host.addEventListener("pointerup",finish);host.addEventListener("pointercancel",finish);

}
async function editDoc(cat,zoomAnchor=null){
 if(cat==="Produktlista")return previewDoc(cat);
 const current=item;if(!current||!templates[cat])return;slrMountEditor(cat);
 const revision=++slrEditorRevision;slrStyles();const host=$("slrFields");slrEnableNavigation(host,cat);host.replaceChildren();host.className="slrOriginalPages";host.classList.toggle("slrZoomWide",slrPageZoom>1);
 $("slrEditHeading").textContent=labelFor(cat)+" · "+(slrEditScope==="profile"?"Ändra standard":"Endast "+slrDoorDesignation(current));
 const info=elm("div",slrEditScope==="profile"?"Du ändrar standarden "+(slrDoorProfile(current)==="glass"?"Med glas":"Utan glas")+" för alla dörrautomatiker med samma typ. Individuella undantag behålls.":"Ändringar sparas bara för denna dörrautomatik.");info.className="slrPdfTip";host.append(info);const controls=elm("div");controls.className="slrZoomOptions";controls.append(elm("strong","Zooma PDF:"));
 const minus=elm("button","−");minus.type="button";minus.title="Zooma ut";minus.onclick=()=>slrZoomTo(cat,slrPageZoom/1.25);controls.append(minus);
 const amount=elm("span",Math.round(slrPageZoom*100)+"%");amount.className="slrZoomAmount";controls.append(amount);
 const plus=elm("button","+");plus.type="button";plus.title="Zooma in";plus.onclick=()=>slrZoomTo(cat,slrPageZoom*1.25);controls.append(plus);
 const guide=elm("small","Två fingrar för zoom på mobilen · + och − på datorn");controls.append(guide);host.append(controls);const status=elm("div","Tryck på en kryssruta. Här visas vilket alternativ du har markerat.");status.id="slrChoiceFeedback";status.className="slrChoiceInfo";host.append(status);
 const storedValues=slrEffectiveFields(current,cat),defaultValues=auto(current);
 let document=null;
 try{
  document=await pdfjsLib.getDocument({data:templates[cat].slice(),enableXfa:false}).promise;
  for(let pi=0;pi<document.numPages;pi++){
   if(item!==current||slrEditorRevision!==revision)return;
   const p=await document.getPage(pi+1),v0=p.getViewport({scale:1});
   const width=Math.min(685,Math.max(245,window.innerWidth-44),Math.max(245,host.clientWidth-8));
   const factor=width/v0.width*slrPageZoom,vp=p.getViewport({scale:factor});
   const page=elm("div");page.className="slrOriginalPage";page.dataset.slrPageIndex=String(pi);page.style.cssText="width:"+vp.width+"px;height:"+vp.height+"px";
   const canvas=elm("canvas");const dpr=Math.min(window.devicePixelRatio||1,1.5);
   canvas.width=Math.round(vp.width*dpr);canvas.height=Math.round(vp.height*dpr);
   canvas.style.cssText="width:"+vp.width+"px;height:"+vp.height+"px";page.append(canvas);host.append(page);slrEnablePinch(page,cat);
   await p.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport:vp,transform:[dpr,0,0,dpr,0,0]}).promise;
   const annotations=await p.getAnnotations({intent:"display"}),radioCounters={};
   for(const an of annotations){
    if(an.subtype!=="Widget"||!an.rect||!an.fieldName)continue;
    const name=an.fieldName,r=vp.convertToViewportRectangle(an.rect);
    const left=Math.min(r[0],r[2]),top=Math.min(r[1],r[3]),w=Math.abs(r[2]-r[0]),h=Math.abs(r[3]-r[1]);
    if(w<2||h<2)continue;
    if(an.fieldType==="Tx"){
     const ctrl=elm(an.multiLine?"textarea":"input");ctrl.className="slrOverlayText";
     const textValue=slrFieldValue(current,name,storedValues,defaultValues);
     if(an.multiLine)ctrl.value=textValue;else slrConfigureTextInput(ctrl,name,textValue);
     if(["Dörrnummer, beteckning","Maskin ID","Drivsystem serienummer"].includes(name))ctrl.readOnly=true;
     const fieldFont=Math.max(4.5,Math.min(h*.84,Math.max(7,Number(an.defaultAppearanceData?.fontSize)||10)*factor));
     ctrl.style.cssText="left:"+left+"px;top:"+top+"px;width:"+w+"px;height:"+h+"px;font-size:"+fieldFont+"px;line-height:"+(an.multiLine?"1.2":h+"px")+";padding:0 "+Math.max(.75,1.6*factor)+"px!important";
     ctrl.title=name==="Drivsystem serienummer"?"Maskin-ID":name;ctrl.setAttribute("aria-label",ctrl.title);
     ctrl.addEventListener("input",()=>{if(item!==current)return;slrWriteField(current,cat,name,ctrl.value)});
     page.append(ctrl);
    }else if(an.fieldType==="Sig"){
     const signature=elm("button","✍ Signera");signature.type="button";signature.className="slrSignatureOnPdf";
     signature.style.cssText="left:"+left+"px;top:"+top+"px;width:"+w+"px;height:"+h+"px;min-height:0!important";
     const prior=slrSignatureImage(slrSignatureFor(current,cat,name));
     if(prior){signature.replaceChildren();const image=elm("img");image.src=prior;image.style.cssText="width:100%;height:100%;object-fit:contain";signature.append(image);}
     signature.setAttribute("aria-label",name);signature.title=name;
     signature.onclick=()=>slrOpenSign(current,cat,signature,name,{page:pi,rect:an.rect.slice()});page.append(signature);
    }else if(an.fieldType==="Ch"){
     const choice=elm("select");choice.className="slrOverlayText slrOverlayChoice";choice.style.cssText="left:"+left+"px;top:"+top+"px;width:"+w+"px;height:"+h+"px;font-size:"+Math.max(5,10*factor)+"px";
     const empty=elm("option","Välj…");empty.value="";choice.append(empty);
     for(const option of an.options||[]){const node=elm("option",option.displayValue||option.exportValue||String(option));node.value=option.exportValue||option.displayValue||String(option);choice.append(node);}
     choice.value=storedValues[name]||"";choice.title=name;choice.setAttribute("aria-label",name);
     choice.addEventListener("change",()=>{if(item!==current)return;slrWriteField(current,cat,name,choice.value)});page.append(choice);
    }else if(an.fieldType==="Btn"){
     const radio=!!an.radioButton,key=cat==="Riskanalys"&&pi===2&&name==="4.6.1"?"4.6.2":name;
     const index=radioCounters[key]||0;radioCounters[key]=index+1;
     const opt=String(an.buttonValue||an.exportValue||"");
     const val=radio?slrDecode(opt||String(index+1)):"";
     const checked=radio?slrDecode(storedValues[key])===val:storedValues[key]===true;
     const btn=elm("button");btn.type="button";btn.className="slrOverlayTick";
     // Close rows are only about 13 PDF points apart. Cap hit area to avoid hitting the next choice.
     const sameColumn=annotations.filter(q=>q!==an&&q.subtype==="Widget"&&q.fieldType==="Btn"&&q.rect)
       .map(q=>vp.convertToViewportRectangle(q.rect))
       .filter(r=>Math.abs((r[0]+r[2])/2-(left+w/2))<Math.max(10,18*factor));
     const nearest=sameColumn.reduce((d,r)=>Math.min(d,Math.abs((r[1]+r[3])/2-(top+h/2))),Infinity);
     const ww=Math.max(w,Math.min(28,Math.max(18,w+12)));
     const hh=Math.max(h,Math.min(19,Number.isFinite(nearest)?nearest-1.5:19));
     btn.style.cssText="left:"+(left-(ww-w)/2)+"px;top:"+(top-(hh-h)/2)+"px;width:"+ww+"px;height:"+hh+"px;--slr-mark-width:"+w+"px;--slr-mark-height:"+h+"px";
     const desc=slrChoiceText(key,radio?val:"");
     btn.dataset.field=key;btn.dataset.value=val;btn.setAttribute("aria-label",desc);btn.title=desc;
     slrDrawChoice(btn,checked);
     btn.onclick=()=>{if(item!==current)return;let chosen;
      if(radio){chosen=slrDecode(slrEffectiveFields(current,cat)[key])!==val;slrWriteField(current,cat,key,chosen?val:"");
       for(const other of page.querySelectorAll(".slrOverlayTick"))if(other.dataset.field===key)slrDrawChoice(other,chosen&&other.dataset.value===val)}
      else{chosen=slrEffectiveFields(current,cat)[name]!==true;slrWriteField(current,cat,name,chosen);slrDrawChoice(btn,chosen)}
      slrShowChoice(desc,chosen,pi+1);
     };page.append(btn);
    }
   }
   if(cat==="Riskanalys"&&pi===4){const b=elm("button","✍ Signera här");b.className="slrSignatureOnPdf";b.type="button";
    const sl=140.5,st=584,sw=198.5,sh=35.8;b.style.cssText="left:"+sl*factor+"px;top:"+st*factor+"px;width:"+sw*factor+"px;height:"+sh*factor+"px";
    const img=slrSignatureImage(slrSignatureFor(current,cat));if(img){b.replaceChildren();const picture=elm("img");picture.src=img;picture.style.cssText="width:100%;height:100%;object-fit:contain";b.append(picture)}
    b.onclick=()=>slrOpenSign(current,cat,b);page.append(b)}
  }
  if(zoomAnchor){
   const target=host.querySelector('.slrOriginalPage[data-slr-page-index="'+zoomAnchor.index+'"]');
   const scrollMain=$("slrFlowTestDialog").querySelector("main");
   if(target&&scrollMain){
    const r=target.getBoundingClientRect();
    scrollMain.scrollTop+=r.top+r.height*zoomAnchor.ratio-zoomAnchor.y;
    if(Number.isFinite(zoomAnchor.ratioX)&&Number.isFinite(zoomAnchor.x))
      scrollMain.scrollLeft+=r.left+r.width*zoomAnchor.ratioX-zoomAnchor.x;
   }
  }else $("slrEditHeading").scrollIntoView({block:"start",behavior:"smooth"});
  announce("SLR visas sida för sida i originalordning. Dina val sparas separat för varje dörrautomatik.");
 }catch(err){announce("Kunde inte visa SLR-sidorna: "+err.message,true)}
 finally{try{await document?.destroy()}catch(_){}}
}
async function slrExportCustomerPdf(){
 const current=item;if(!current)return;
 try{
  await loadTemplates();
  const out=await PDFLib.PDFDocument.create();
  let count=0;
  for(const cat of cats){
   if(cat==='CE-skylt'&&(doorPhotos[current.id]||/\.(png|jpe?g)$/i.test(names[cat]||'')))continue;
   if(cat!=='Produktlista'&&!templates[cat])continue;
   if(cat!=='Produktlista'&&!slrHasSavedWork(current,cat)&&!Object.keys(profiles[slrDoorProfile(current)]?.[cat]||{}).length)continue;
   if(cat==='Produktlista'&&!productFiles[current.id])continue;
   const pdf=await PDFLib.PDFDocument.load(await compose(cat,current),{ignoreEncryption:true,updateMetadata:false});
   const pages=await out.copyPages(pdf,pdf.getPageIndices());for(const p of pages)out.addPage(p);count+=pages.length;
  }
  if(!count)return announce('Inga ifyllda SLR-dokument finns att exportera för denna dörr.',true);
  const result=new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'}),url=URL.createObjectURL(result);
  const a=elm('a');a.href=url;a.download='SLR-'+safe(slrDoorDesignation(current))+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);
  announce('Kund-PDF skapad för denna dörr: '+count+' sidor. Projekt-PDF:en påverkas inte.');
 }catch(err){announce('Kunde inte skapa kund-PDF: '+err.message,true)}
}

function slrHasSavedWork(current,cat){
 // A blank PDF is rebuilt from the one shared template + this door's JSON.
 // Never omit a document containing an answer, even an explicit false tick,
 // a signature or a marked-in-progress/completed document.
 const v=answers[current.id]?.[cat],fields=v?.fields||{};
 const entered=Object.values(fields).some(x=>x!==undefined&&x!==null&&(typeof x==='boolean'||String(x).trim()!==''));
 const signs=!!doorSignatures[current.id]||!!v?.signature||Object.values(v?.signatures||{}).some(x=>!!x?.image);
 const status=current.slrDocuments?.[cat]?.status;
 return entered||signs||status==='doing'||status==='done'||status==='completed';
}
function slrRemovePriorFiles(doc){
 // doc.attach() stores file specs in BOTH /Names/EmbeddedFiles and /AF.
 // Remove our own outdated files from both; never touch customer attachments.
 // The project's existing unreachable-object pruner then drops old byte streams.
 const {PDFName,PDFDict,PDFArray}=PDFLib,N=PDFName.of;
 const dict=doc.catalog.lookupMaybe(N('Names'),PDFDict),files=dict?.lookupMaybe(N('EmbeddedFiles'),PDFDict);
 if(!files||files.get(N('Kids')))return 0;
 const arr=files.lookupMaybe(N('Names'),PDFArray);if(!arr)return 0;
 const kept=[],removed=new Set();
 for(let i=0;i+1<arr.size();i+=2){
  const name=arr.get(i).decodeText?.()||'',ref=arr.get(i+1);
  if(/^slrtest-[a-z0-9]+-(mall|dokument|produktlista)-/i.test(name)){removed.add(String(ref));continue}
  kept.push(arr.get(i),ref);
 }
 if(!removed.size)return 0;
 files.set(N('Names'),doc.context.obj(kept));
 const af=doc.catalog.lookupMaybe(N('AF'),PDFArray);
 if(af)doc.catalog.set(N('AF'),doc.context.obj(af.asArray().filter(ref=>!removed.has(String(ref)))));
 return removed.size;
}

async function saveTo(doc,payload){
 await loadTemplates();
 const enabled=Object.keys(templates),items=Array.isArray(payload?.automationItems)?payload.automationItems:[];
 if(!enabled.length&&!Object.keys(productFiles).length)return;
 slrRemovePriorFiles(doc);
 const prefix="slrtest-"+Date.now().toString(36),refs={},each={},products={};
 for(const cat of enabled){
  const ext=(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||"pdf").toLowerCase(),file=prefix+"-mall-"+safe(cat)+"."+ext;
  refs[cat]=file;
  await doc.attach(templates[cat],file,{mimeType:ext==="pdf"?"application/pdf":ext==="png"?"image/png":"image/jpeg",description:"En gemensam SLR-projektmall, används av alla dörrautomatiker."});
 }
 // Per-door SLR forms are generated on demand from shared templates + the
 // project's individual fields/profile overrides. Never embed each form.
 for(const [idx,current]of items.entries()){
  each[current.id]={};
  const product=productFiles[current.id];if(!product)continue;
  const file=prefix+"-produktlista-"+(idx+1)+"-"+safe(current.id)+".pdf";
  await doc.attach(product.bytes,file,{mimeType:"application/pdf",description:"Produktlista för "+product.designation+" från "+product.gsCode+"."});
  each[current.id].Produktlista=file;products[current.id]={file,designation:product.designation,gsCode:product.gsCode,cardPage:product.cardPage,format:product.format,rowCount:product.rowCount};
 }
 doc.catalog.set(PDFLib.PDFName.of("TillsynoSLRTestManifest"),PDFLib.PDFHexString.fromText(JSON.stringify({schema:7,templates:refs,each,names,products,storage:"shared-mall-plus-per-door-data-on-demand"})));
}
async function verify(data,expected){
 if(!Object.keys(templates).length&&!Object.keys(productFiles).length)return;
 const pdf=await PDFLib.PDFDocument.load(data.slice(),{ignoreEncryption:true,updateMetadata:false});
 const m=parsePdfEmbeddedJson(pdf.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest")),"SLR-manifest");
 if(!m?.templates||!m?.each)throw Error("SLR-bilagor saknas i sparad PDF");
 for(const cat of Object.keys(templates))if(!m.templates[cat])throw Error("Projektets gemensamma SLR-mall saknas: "+cat);
for(const current of expected.automationItems||[])if(productFiles[current.id]&&!m.each[current.id]?.Produktlista)throw Error("Produktlistan saknas för "+current.id);
}
function slrFolderName(value){return String(value||'SLR').normalize('NFC').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/g,'').slice(0,100)||'SLR';}
async function buildFolderArchive(selected,context=bridge){
 if(!window.JSZip)throw Error('Mappexporten kunde inte laddas. Öppna sidan med internet först.');
 await loadTemplates();
 const zip=new window.JSZip(),meta=context?.getProjectMeta?.()||{},root=slrFolderName(meta.projectName||meta.facilityNo||'SLR'),used=new Set();
 if(!selected?.length)throw Error('Välj minst en klar dörr.');
 for(const obj of selected)for(const cat of cats)saved(obj,cat);
 const revision=JSON.stringify(payload());
 for(const obj of selected){
  if(!completedDoors[obj.id])throw Error('Dörr '+slrDoorDesignation(obj)+' är inte klarmarkerad.');
  let name=slrFolderName(slrDoorDesignation(obj)),unique=name,n=2;while(used.has(unique))unique=name+' ('+(n++)+')';used.add(unique);
  const folder=zip.folder(root).folder(unique);
  for(const [index,cat]of cats.entries()){
   if(!slrDocumentAvailable(obj,cat))throw Error(labelFor(cat)+' saknas för '+slrDoorDesignation(obj)+'.');
   const bytes=await compose(cat,obj),photo=cat==='CE-skylt'?doorPhotos[obj.id]:null;
   const ext=photo?(photo.type==='image/png'?'png':'jpg'):cat==='CE-skylt'?(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||'pdf').toLowerCase():'pdf';
   const label=slrFolderName(labelFor(cat));folder.folder((index+1)+'. '+label).file(label+'.'+ext,bytes,{binary:true});
  }
 }
 const bytes=await zip.generateAsync({type:'uint8array',compression:'STORE'});
 if(JSON.stringify(payload())!==revision)throw Error('SLR ändrades under exporten. Skapa paketet igen.');
 return {bytes,name:root+'-SLR.zip',doors:selected.length};
}
function slrExportMessage(text,error=false){const e=$('slrExportStatus');if(e){e.textContent=text;e.style.color=error?'#a52229':'#1b536e';}}
async function openExport(context){
 bridge=context||bridge;setup();await loadTemplates();
 if($('slrFlowTestDialog')?.open)$('slrFlowTestDialog').close();
 let dialog=$('slrExportDialog');
 if(!dialog){
  dialog=elm('dialog');dialog.id='slrExportDialog';dialog.className='slrExportDialog';
  dialog.innerHTML='<header><strong>SLR · Spara dörrmappar</strong><button id="slrExportClose" type="button">Stäng ×</button></header><main><nav class="slrSaveModes"><button id="slrExportProject" type="button">Projekt</button><button id="slrExportChecks" type="button">Egenkontroll</button><strong>SLR</strong></nav><p>Välj klara dörrar. Varje dörr får en egen mapp med sju dokumentmappar.</p><div id="slrExportDoors"></div><p id="slrExportStatus" role="status" aria-live="polite"></p><footer><button id="slrExportBuild" type="button">Skapa mapppaket</button><button id="slrExportDownload" type="button" disabled>Spara filer</button></footer></main>';
  document.body.append(dialog);
  $('slrExportClose').onclick=()=>dialog.close();
  $('slrExportProject').onclick=()=>{dialog.close();document.getElementById('pwSaveLocal')?.click();};
  $('slrExportChecks').onclick=()=>{dialog.close();document.getElementById('smartExportProtocolsMode')?.click();};
  $('slrExportBuild').onclick=async()=>{
   if(slrExportBusy)return;slrExportBusy=true;slrExportReady=null;$('slrExportBuild').disabled=true;$('slrExportDownload').disabled=true;
   try{
    const ids=new Set([...$('slrExportDoors').querySelectorAll('input:checked')].map(e=>e.value));
    const selected=(bridge?.getItems?.()||[]).filter(o=>ids.has(o.id));
    slrExportMessage('Skapar dokumentmappar för '+selected.length+' dörrar…');
    const result=await buildFolderArchive(selected);slrExportReady=new File([result.bytes],result.name,{type:'application/zip'});
    $('slrExportDownload').disabled=false;slrExportMessage('Paketet är klart: '+result.doors+' dörrmappar. Tryck Spara filer.');
   }catch(err){slrExportMessage(err.message,true);}finally{slrExportBusy=false;$('slrExportBuild').disabled=false;}
  };
  $('slrExportDownload').onclick=async()=>{
   const file=slrExportReady;if(!file)return;
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file]});slrExportMessage('Mapppaketet har lämnats till delningsmenyn.');return;}
    catch(err){if(err.name==='AbortError'){slrExportMessage('Sparandet avbröts. Paketet finns kvar här.');return;}}
   }
   const url=URL.createObjectURL(file),a=elm('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);slrExportMessage('Mapppaketet hämtas. Packa upp ZIP-filen för att öppna mapparna.');
  };
 }
 const list=$('slrExportDoors');list.replaceChildren();slrExportReady=null;$('slrExportDownload').disabled=true;
 const all=bridge?.getItems?.()||[],done=all.filter(o=>!!completedDoors[o.id]);
 if(!done.length)list.append(elm('p','Inga klara dörrar ännu. Öppna en dörrs SLR-mapp, kontrollera dokumenten och tryck Klart.'));
 for(const o of done){
  const row=elm('label'),check=elm('input');check.type='checkbox';check.value=o.id;check.checked=true;
  check.onchange=()=>{slrExportReady=null;$('slrExportDownload').disabled=true;};
  row.append(check,elm('span',slrDoorDesignation(o)),elm('small','Klart · 100 %'));list.append(row);
 }
 $('slrExportBuild').disabled=!done.length;slrExportMessage(done.length+' klara av '+all.length+' dörrar.');
 if(!dialog.open)dialog.showModal();
}

window.SmartMatchSLRTest={reset,initProject,restore,payload,open,saveTo,verify,getProgress:slrProgress,openExport,buildFolderArchive};
})();
