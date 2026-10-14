/* SmartMatch CE-märkning TEST 6: local-only document forms and PDF attachments. */
(function(){"use strict";
const cats=["Riskanalys","Beskrivning av maskin","Loggbok","Tillverkarens försäkran","Produktlista","Egenkontroll","CE-skylt"];
// Only these five folders may be reviewed in one deliberate action. Product list and CE plate stay independent.
const bulkReviewCats=["Riskanalys","Beskrivning av maskin","Loggbok","Tillverkarens försäkran","Egenkontroll"];
const labelFor=cat=>cat==="Tillverkarens försäkran"?"EG-försäkran – tillverkare av maskin":cat;
const $=s=>document.getElementById(s);
const elm=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
let projectSignature='',completedDoors={},doorPhotos={},doorSignatures={},reviewedFolders={},choiceGroups={},openedFolders=new Set(),slrExportReady=null,slrExportBusy=false,slrEditScope="door",slrPreviewSerial=0;
// TEST 10: only checkbox/radio choices from the two supplied door examples. No signatures, dates, texts or approval.
const slrFactoryProfiles={"glass":{"Riskanalys":{"Antal dörrblad":"1","Antal maskindrivna":"1","4.4 Risknivå":"Hög risk","4.6.1":"Hög Val 1","4.6.2":"Hög Val 1","4.6.3":"Val 3","4.6.5":true,"4.6.5 underval 1":true,"4.6.7":true,"4.6.8":true,"4.6.8 underval 1":true,"4.6.9":"Val 2","4.6.10":true,"4.6.11":"Val 1","4.6.12":"Val 1","4.6.13":"Val 1","4.6.4":"Val 1","4.6.4 underval 1":true,"4.6.4 underval 2":true,"4.6.4 underval 3":false,"4.6.6":"Val 1","4.6.6 underval 1":true},"Egenkontroll":{"Antal dörrblad":"1","Antal maskindrivna":"1","Drivsystem typ 2":true,"10.5.1":"Val 1","10.5.2":"Val 1","10.5.3":"Val 2","10.5.3 Val 2 underliggande val":"Val 2.1","10.5.4":true,"10.5.5":"Val 2","10.5.5 Val 2 underliggande val":"Val 2.1","10.5.6":"Val 2","10.5.7":"Val 1","10.5.8":"Val 1","10.5.9":true,"10.5.10":true,"10.5.12":true,"10.5.14":true,"10.5.15":true,"10.5.16":true,"10.5.17":"Val 1","10.5.18":true,"10.5.19":"Val 1","10.5.20":"Val 1","10.5.21":true,"10.5.22":true,"10.5.23":"Val 1","10.5.24":true,"10.5.25":true,"10.5.26":"Val 1","10.5.11":"Val 1","10.5.13":"Val7"}},"noGlass":{"Riskanalys":{"Antal dörrblad":"1","Antal maskindrivna":"1","4.4 Risknivå":"Hög risk","4.6.1":"Hög Val 1","4.6.2":"Hög Val 1","4.6.3":"Val 3","4.6.5":true,"4.6.5 underval 1":true,"4.6.7":true,"4.6.8":true,"4.6.8 underval 1":true,"4.6.9":"Val 2","4.6.10":true,"4.6.11":"Val 1","4.6.12":"Val 1","4.6.13":"Val 1","4.6.4":"Val 2","4.6.6":"Val 2"},"Egenkontroll":{"Antal dörrblad":"1","Antal maskindrivna":"1","Drivsystem typ 2":true,"10.5.1":"Val 1","10.5.2":"Val 1","10.5.3":"Val 2","10.5.3 Val 2 underliggande val":"Val 2.1","10.5.4":true,"10.5.5":"Val 2","10.5.5 Val 2 underliggande val":"Val 2.1","10.5.6":"Val 2","10.5.7":"Val 1","10.5.8":"Val 1","10.5.9":true,"10.5.10":true,"10.5.12":true,"10.5.14":true,"10.5.15":true,"10.5.16":true,"10.5.17":"Val 1","10.5.18":true,"10.5.19":"Val 1","10.5.20":"Val 1","10.5.21":true,"10.5.22":true,"10.5.23":"Val 1","10.5.24":true,"10.5.25":true,"10.5.26":"Val 1","10.5.11":"Val 2","10.5.13":"Val8"}}};
function slrInitialProfiles(existing){
 const output={glass:{},noGlass:{}};
 for(const type of ['glass','noGlass'])for(const cat of ['Riskanalys','Egenkontroll']){
  const saved=existing?.[type]?.[cat];
  output[type][cat]={...slrFactoryProfiles[type][cat],...(saved||{})};
 }
 for(const type of ['glass','noGlass'])for(const [cat,fields]of Object.entries(existing?.[type]||{}))if(!(cat in output[type]))output[type][cat]=fields;
 return output;
}
let signatureDate='',signatureDateStyle='italic',signatureDateFormat='day';
let templates={},names={},stored={},answers={},profiles={glass:{},noGlass:{}},doorProfiles={},signatureLibrary={},checkKeyCache={},originalBytes=null,bridge=null,item=null,picked="",loading=null,slrEditingCategory="",productFiles={},verificationByDoor={},templatesLoaded=false,templateLoadWarning="";
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

function reset(){projectSignature='';signatureDate='';signatureDateStyle='italic';signatureDateFormat='day';choiceGroups={};completedDoors={};doorPhotos={};doorSignatures={};reviewedFolders={};slrEditScope="door";slrPreviewSerial++;openedFolders.clear();slrExportReady=null;templates={};names={};stored={};answers={};profiles=slrInitialProfiles();doorProfiles={};signatureLibrary={};checkKeyCache={};originalBytes=null;item=null;loading=null;slrEditingCategory="";productFiles={};verificationByDoor={};templatesLoaded=false;templateLoadWarning="";slrClearEditor();}
function slrMigrateGlassFilmDefault(data){
 // One-time upgrade for projects saved before TEST 29; existing user edits
 // after this version remain editable and persist across reopens.
 if(Number(data?.schema)>=5)return;
 const field='4.6.4 underval 3';
 if(profiles.glass?.Riskanalys)profiles.glass.Riskanalys[field]=false;
 for(const [doorId,type] of Object.entries(doorProfiles)){
  if(type!=='glass')continue;
  const own=answers[doorId]?.Riskanalys?.fields;
  if(own?.[field]===true)own[field]=false;
 }
}
function slrLegacyHasChoiceValue(cat,key){
 if(Object.hasOwn(slrFactoryProfiles.glass?.[cat]||{},key)||Object.hasOwn(slrFactoryProfiles.noGlass?.[cat]||{},key))return true;
 return /^(?:4\.3 Objektsorientering \d+|4\.4 Risknivå|4\.6\.\d+(?: underval \d+)?|10\.5\.\d+(?: Val \d+ underliggande val)?|Drivsystem typ \d+)$/.test(key);
}
function slrMigrateSharedDoorDefaults(data){
 // Before TEST 32, every new door copied the factory's full tick template
 // into its private answers. Drop only those mechanical copies so later edits
 // to the glass/no-glass shared standard reach every untouched door.
 if(Number(data?.schema)>=6)return;
 for(const [doorId,type] of Object.entries(doorProfiles)){
  if(type!=='glass'&&type!=='noGlass')continue;
  for(const cat of ['Riskanalys','Egenkontroll']){
   const fields=answers[doorId]?.[cat]?.fields;if(!fields)continue;
   const factory=slrFactoryProfiles[type][cat]||{};
   for(const [key,value] of Object.entries(fields)){
    if(!slrLegacyHasChoiceValue(cat,key)||key==='Antal dörrblad'||key==='Antal maskindrivna')continue;
    if(Object.hasOwn(factory,key)&&slrSameChoiceValue(factory[key],value)){
     delete fields[key];continue;
    }
    // Legacy "fill every possible field" also wrote false/empty values for
    // alternatives not chosen by this profile.
    if(!Object.hasOwn(factory,key)&&(value===false||value===''))delete fields[key];
   }
  }
 }
}
function slrSameChoiceValue(a,b){
 if(a===b)return true;
 if(a===null||a===undefined||b===null||b===undefined)return String(a??'')===String(b??'');
 return String(a)===String(b);
}
function initProject(pdf,saved,data){reset();projectSignature=saved?.slrTestData?.projectSignature||'';signatureDate=saved?.slrTestData?.signatureDate||'';signatureDateStyle=saved?.slrTestData?.signatureDateStyle||'italic';signatureDateFormat=saved?.slrTestData?.signatureDateFormat||'day';originalBytes=data?.slice?.()||null;try{const manifest=pdf.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest"));stored=manifest?window.TillsynoCEStorage.read(pdf,"TillsynoSLRTestManifest"):{};}catch(err){console.warn("SLR-manifest kunde inte läsas",err)}answers=saved?.slrTestData?.answers||{};names=saved?.slrTestData?.names||stored.names||{};profiles=slrInitialProfiles(saved?.slrTestData?.profiles);doorProfiles=saved?.slrTestData?.doorProfiles||{};signatureLibrary=saved?.slrTestData?.signatureLibrary||{};completedDoors=saved?.slrTestData?.completedDoors||{};doorPhotos=saved?.slrTestData?.doorPhotos||{};doorSignatures=saved?.slrTestData?.doorSignatures||{};reviewedFolders=saved?.slrTestData?.reviewedFolders||{};slrMigrateInlineSignatures();slrMigrateGlassFilmDefault(saved?.slrTestData);slrMigrateSharedDoorDefaults(saved?.slrTestData);}
function restore(saved){const data=saved?.slrTestData;if(!data)return;projectSignature=data.projectSignature||'';signatureDate=data.signatureDate||'';signatureDateStyle=data.signatureDateStyle||'italic';signatureDateFormat=data.signatureDateFormat||'day';if(data.answers)answers=data.answers;if(data.profiles)profiles=slrInitialProfiles(data.profiles);if(data.doorProfiles)doorProfiles=data.doorProfiles;if(data.signatureLibrary)signatureLibrary=data.signatureLibrary;completedDoors=data.completedDoors||{};doorPhotos=data.doorPhotos||{};doorSignatures=data.doorSignatures||{};reviewedFolders=data.reviewedFolders||{};slrMigrateInlineSignatures();slrMigrateGlassFilmDefault(data);slrMigrateSharedDoorDefaults(data);}
function payload(){return {schema:6,projectSignature,signatureDate,signatureDateStyle,signatureDateFormat,answers,names,profiles,doorProfiles,signatureLibrary,completedDoors,doorPhotos,doorSignatures,reviewedFolders}}
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
function slrEgenPointSelected(obj,key){
 const v=slrEffectiveFields(obj,'Egenkontroll')[key];
 return v!==undefined&&v!==null&&v!==false&&v!==''&&v!=='Off';
}
function slrSignatureFor(obj,cat,key){
 if(cat==='Loggbok')return ''; // Keep future service entries unsigned.
 const match=cat==='Egenkontroll'?String(key||'').match(/^(10\.5\.\d+) Signatur$/):null;
 if(match&&!slrEgenPointSelected(obj,match[1]))return '';
 if(slrSignatureImage(projectSignature))return projectSignature;
 const entry=answers[obj?.id]?.[cat],own=key?entry?.signatures?.[key]?.image:entry?.signature;
 if(own&&slrSignatureImage(own))return own;
 if(cat==='Egenkontroll')return '';
 const shared=doorSignatures[obj?.id];return shared&&slrSignatureImage(shared)?shared:own;
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
const slrProjectBindings={
 'Beställare företagsnamn':'customer','Beställare adress':'address','Beställarepostnummer/ort':'customerPostalPlace',
 'Beställare kontaktperson':'contact','Beställare telefonnummer':'phone',
 'Tillverkare företagsnamn':'company','Tillverkare adress':'companyAddress','Tillverkare postnummer/ort':'companyPostalPlace',
 'Tillverkare org. nr':'companyOrgNo','Tillverkare kontaktperson':'companyContact','Tillverkare telefonnummer':'companyPhone',
 'Auktorisationsnummer SLR':'slrAuthorisation','Offertnummer/Ordernummer':'order','Objekt':'objectNo',
 'Adress rad 1':'siteAddress','Adress rad 2':'sitePostalPlace',
 '4.7 Företag':'technicianCompany','4.7 Namn':'technician','4.7 Telefonnummer':'technicianPhone','4.7 Datum':'date',
 'Riskanalys utförd av':'technician','Riskanalys utförd datum':'date','Installationsdatum':'installationDate',

 'Dokumentation Namn':'documentationName','Dokumentation Adress':'documentationAddress','Dokumentation Postnummer, Ort':'documentationPostalPlace',
 'Namnförtydligande':'egSignerName','Titel':'egSignerTitle','Ort':'egPlace','Datum':'egDate'
};
function slrProjectValues(obj){
 const m=bridge?.getProjectMeta?.()||{},defaults=auto(obj),result={};
 for(const [field,key]of Object.entries(slrProjectBindings))
  if(m._edited?.[key]===true||['Adress rad 1','Adress rad 2'].includes(field))result[field]=defaults[field];
 return result;
}
function slrEffectiveFields(obj,cat){
 const defaults=profiles[slrDoorProfile(obj)]?.[cat]||{},own=answers[obj.id]?.[cat]?.fields||{},project=slrProjectValues(obj);
 if(cat!=='Egenkontroll')return {...defaults,...project,...own};
 const risk=slrEffectiveFields(obj,'Riskanalys'),linked={};
 for(const key of slrSharedRiskFields)if(Object.prototype.hasOwnProperty.call(risk,key))linked[key]=risk[key];
 return {...defaults,...project,...linked,...own};
}
function slrBaselineForDoor(obj,cat){
 const standard=profiles[slrDoorProfile(obj)]||{};
 const baseline={...(standard[cat]||{})};
 if(cat==='Egenkontroll')for(const key of slrSharedRiskFields)
  if(Object.hasOwn(standard.Riskanalys||{},key))baseline[key]=standard.Riskanalys[key];
 return {...baseline,...slrProjectValues(obj)};
}
function slrDoorFolderCustomized(obj,cat){
 if(!obj)return false;
 if(cat==='CE-skylt')return !!doorPhotos[obj.id];
 if(cat==='Produktlista'){
  const entry=answers[obj.id]?.Produktlista;
  return !!productFiles[obj.id]||!!entry?.productRows?.some(row=>String(row.name||row.brand||row.notes||'').trim());
 }
 const fields=answers[obj.id]?.[cat]?.fields||{},base=slrBaselineForDoor(obj,cat),defaults=auto(obj);
 return Object.entries(fields).some(([key,value])=>{
  if(slrIdentityFields.has(key)||['Antal dörrblad','Antal maskindrivna'].includes(key))return false;
  const standard=Object.hasOwn(base,key)?base[key]:(Object.hasOwn(defaults,key)?defaults[key]:'');
  return !slrSameChoiceValue(value,standard);
 });
}
function slrDoorCustomizedCategories(obj){return cats.filter(cat=>slrDoorFolderCustomized(obj,cat));}
function slrRawFields(obj,cat){
 const standard=profiles[slrDoorProfile(obj)]||{},own=answers[obj.id]?.[cat]?.fields||{},result={...standard[cat]};
 if(cat==='Egenkontroll'){
  const risk={...standard.Riskanalys,...answers[obj.id]?.Riskanalys?.fields};
  for(const key of slrSharedRiskFields)if(Object.prototype.hasOwnProperty.call(risk,key))result[key]=risk[key];
 }
 return {...result,...own};
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
 if(caption)caption.textContent=type?('Standard: '+(type==='glass'?'Med glas':'Utan glas')+'. Gemensamma svar följer glasvalet. Egna undantag behålls.'):'Ingen profil vald. Välj dörrtyp, eller fyll i kryss manuellt.';
}
async function slrRepaintEditor(){
 draw();
 if(slrEditingCategory&&templates[slrEditingCategory]&&!$('slrEditor')?.hidden)await editDoc(slrEditingCategory);
}
const slrIdentityFields=new Set(['Dörrnummer, beteckning','Maskin ID','Drivsystem serienummer','Objekt','Objektnummer','GS','GS-nummer','Plats i byggnaden']);
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
 for(const [id,profile] of Object.entries(doorProfiles))if(profile===type){delete completedDoors[id];for(const [cat,fields] of Object.entries(collected)){if(reviewedFolders[id])delete reviewedFolders[id][cat];const own=answers[id]?.[cat]?.fields;if(own)for(const [key,value] of Object.entries(own))if(Object.hasOwn(fields,key)&&slrSameChoiceValue(value,fields[key]))delete own[key];}}
 slrExportReady=null;bridge?.save?.();bridge?.redraw?.();await slrRepaintEditor();slrRefreshProfilePanel();
 announce('Hela ifyllnaden sparad för '+(type==='glass'?'Med glas':'Utan glas')+'. Dörrarnas egna ändringar behålls. Kontrollera dokumenten och tryck Klart på varje dörr.');
}
async function slrResetCurrentDoor(){
 const current=item;if(!current||!slrDoorProfile(current))return;
 for(const [cat,entry]of Object.entries(answers[current.id]||{}))if(cats.includes(cat)&&entry?.fields)entry.fields={};delete reviewedFolders[current.id];
 slrInvalidate(current);bridge?.save?.();bridge?.redraw?.();await slrRepaintEditor();announce('Denna dörr använder standardens ifyllnad igen. Signaturer och CE-foto behålls.');
}
function slrClearDoorProfileChoices(obj){
 for(const cat of ['Riskanalys','Egenkontroll']){
  const fields=answers[obj.id]?.[cat]?.fields;if(!fields)continue;
  for(const key of Object.keys(fields))if(key!=='Antal dörrblad'&&key!=='Antal maskindrivna'&&slrLegacyHasChoiceValue(cat,key))delete fields[key];
 }
}
function slrSetDoorProfile(type){
 const current=item;if(!current)return;
 const chosen=type==='glass'||type==='noGlass'?type:'';
 // Re-selecting a door type restores that shared standard, not a new
 // private snapshot of the factory. Ordinary per-door text is retained.
 slrClearDoorProfileChoices(current);
 if(chosen)doorProfiles[current.id]=chosen;else delete doorProfiles[current.id];
 slrEditScope='door';
 delete reviewedFolders[current.id];slrInvalidate(current);
 bridge?.save?.();bridge?.redraw?.();void slrRepaintEditor();slrRefreshProfilePanel();
 announce(chosen?'Gemensam standard återställd för '+(chosen==='glass'?'Med glas':'Utan glas')+'.':'Ingen profil vald. Kryssen är tomma.');
}
function slrFolderPercent(obj,cat){
 if(!obj)return 0;
 if(completedDoors[obj.id]||reviewedFolders[obj.id]?.[cat])return 100;
 const fields=slrRawFields(obj,cat),entry=answers[obj.id]?.[cat],status=obj.slrDocuments?.[cat]?.status;
 const entered=Object.entries(answers[obj.id]?.[cat]?.fields||{}).some(([key,value])=>!slrIdentityFields.has(key)&&!Object.prototype.hasOwnProperty.call(slrFactoryProfiles[slrDoorProfile(obj)]?.[cat]||{},key)&&(typeof value==='boolean'||String(value??'').trim()!==''));
 if(entered||status==='doing'||entry?.signature||Object.keys(entry?.signatures||{}).length
   ||(cat==='Produktlista'&&productFiles[obj.id])||(cat==='CE-skylt'&&doorPhotos[obj.id]))return 50;
 return 0;
}
function slrProgress(obj){
 if(completedDoors[obj?.id])return 100;
 return Math.min(99,Math.round(cats.reduce((total,cat)=>total+slrFolderPercent(obj,cat),0)/cats.length));
}
function slrSetInProgress(obj,cat){
 if(!obj)return;
 const started=slrFolderPercent(obj,cat)===50;
 if(!obj.slrDocuments)obj.slrDocuments={};
 obj.slrDocuments[cat]={...(obj.slrDocuments[cat]||{}),status:'doing'};
 if(reviewedFolders[obj.id])delete reviewedFolders[obj.id][cat];
 slrInvalidate(obj);bridge?.save?.();bridge?.redraw?.();draw();
 announce((started?'Arbetet fortsätter i ':'Påbörjad: ')+labelFor(cat)+'. Dokumentet är inte markerat som klart.');
}
async function slrToggleReviewed(obj,cat){
 if(!obj)return;
 const current=reviewedFolders[obj.id]?.[cat]===true||!!completedDoors[obj.id];
 if(!current){
  if(cat==='Egenkontroll'&&slrMissingPointSignatures(obj).length)return announce('Signatur saknas vid '+slrMissingPointSignatures(obj).join(', ')+'. Signera innan kontrollmarkeringen.',true);
  if(!slrDocumentAvailable(obj,cat))return announce('Lägg till dokumentet innan det kan markeras kontrollerat.',true);
  if(cat==='Produktlista')try{await compose(cat,obj)}catch(err){return announce(err.message,true)}
 }
 if(!reviewedFolders[obj.id])reviewedFolders[obj.id]={};
 reviewedFolders[obj.id][cat]=!current;
 if(!current){if(obj.slrDocuments?.[cat])obj.slrDocuments[cat].status='done';}
 else{
  if(!obj.slrDocuments)obj.slrDocuments={};
  obj.slrDocuments[cat]={...(obj.slrDocuments[cat]||{}),status:'doing'};
 }
 slrInvalidate(obj);
 bridge?.save?.();bridge?.redraw?.();draw();
 const count=cats.filter(name=>reviewedFolders[obj.id]?.[name]).length;
 announce((current?'Status ändrad till Pågår. ':'Klar: '+labelFor(cat)+'. ')+count+' av 7 dokument klara. '+(count===7?'Slutför dörren när hela underlaget är kontrollerat.':''));
}
async function slrMarkFiveReviewed(){
 const current=item;if(!current)return;
 await loadTemplates();if(item!==current)return;
 const missing=bulkReviewCats.filter(cat=>!slrDocumentAvailable(current,cat));
 if(missing.length)return announce('Lägg till dokumenten först: '+missing.map(labelFor).join(', ')+'.',true);
 slrRequirePointSignatures(current);
 const unchecked=bulkReviewCats.filter(cat=>reviewedFolders[current.id]?.[cat]!==true);
 if(!unchecked.length)return announce('Alla fem dokument är redan granskade för denna dörr.');
 // No second confirmation: the deliberate click marks this door's five folders immediately.
 // Missing templates were already checked above; all other folders remain unchanged.
 const label=slrDoorDesignation(current);
 if(item!==current)return;
 if(!reviewedFolders[current.id])reviewedFolders[current.id]={};
 for(const cat of bulkReviewCats)reviewedFolders[current.id][cat]=true;
 slrInvalidate(current);
 bridge?.save?.();bridge?.redraw?.();draw();
 announce('Fem dokument markerade som granskade för '+label+'. Produktlista och CE-skylt har inte ändrats.');
}
function slrStartEditing(cat,scope){
 if(scope==='profile'&&!slrDoorProfile(item))return announce('Välj Med glas eller Utan glas innan du ändrar standarden.',true);
 if(slrEditingCategory===cat&&slrEditScope===scope&&!$('slrEditor')?.hidden)return slrCloseEditor();
 slrEditScope=scope;void editDoc(cat);
}
function slrWriteField(obj,cat,name,value){
 // Identity and placement are always supplied by the selected manual door.
 if(slrIdentityFields.has(name))return;
 if(['Drivsystem fabrikat','Drivsystem modell'].includes(name)&&bridge?.setDoorMachineField){bridge.setDoorMachineField(obj,name==='Drivsystem fabrikat'?'manufacturer':'model',value);const machine=slrMachine(obj),other=name==='Drivsystem modell'?'Drivsystem fabrikat':'Drivsystem modell';for(const input of document.querySelectorAll('[data-ce-machine-field]'))if(input.dataset.ceMachineField===other)input.value=other==='Drivsystem fabrikat'?machine.brand:machine.model;return;}
 const targets=['Riskanalys','Egenkontroll'].includes(cat)&&slrSharedRiskFields.has(name)?['Riskanalys','Egenkontroll']:[cat];
 const profile=slrEditScope==='profile'?slrDoorProfile(obj):'';
 if(profile&&slrProjectBindings[name]&&bridge?.setProjectField){bridge.setProjectField(slrProjectBindings[name],value);slrRefreshFolderStatuses();return;}
 if(profile){
  profiles[profile]=profiles[profile]||{};
  const doors=bridge?.getItems?.()||[obj];
  const before=doors.filter(door=>slrDoorProfile(door)===profile).map(door=>({door,values:targets.map(target=>slrEffectiveFields(door,target)[name])}));
  for(const target of targets){profiles[profile][target]=profiles[profile][target]||{};profiles[profile][target][name]=value;}
  for(const entry of before)for(const [index,target] of targets.entries()){
   if(entry.values[index]===slrEffectiveFields(entry.door,target)[name])continue;
   if(target==='Egenkontroll')slrClearPointSignature(entry.door,name);
   if(reviewedFolders[entry.door.id])delete reviewedFolders[entry.door.id][target];
   delete completedDoors[entry.door.id];
  }
  slrExportReady=null;bridge?.save?.();bridge?.redraw?.();
 }else{
  for(const target of targets){if(target==='Egenkontroll'&&slrEffectiveFields(obj,target)[name]!==value)slrClearPointSignature(obj,name);const fields=saved(obj,target).fields;const base=slrBaselineForDoor(obj,target);const standard=Object.hasOwn(base,name)?base[name]:auto(obj)[name]??'';if(slrSameChoiceValue(value,standard))delete fields[name];else fields[name]=value;slrDirty(obj,target);}
 }
 slrRefreshFolderStatuses();
}

function slrEditingFields(obj,cat){
 if(slrEditScope!=='profile')return slrEffectiveFields(obj,cat);
 const standard=profiles[slrDoorProfile(obj)]||{},fields={...standard[cat]};
 if(cat==='Egenkontroll')for(const key of slrSharedRiskFields)if(Object.prototype.hasOwnProperty.call(standard.Riskanalys||{},key))fields[key]=standard.Riskanalys[key];
 return {...fields,...slrProjectValues(obj)};
}
function slrPhotoBytes(photo){return Uint8Array.from(atob(photo.dataUrl.split(',')[1]),c=>c.charCodeAt(0));}
function slrDocumentAvailable(obj,cat){return cat==='Produktlista'?!!productFiles[obj.id]&&!answers[obj.id]?.Produktlista?.productDirty&&(!productFiles[obj.id].generated||productFiles[obj.id].designation===slrDoorDesignation(obj)):cat==='CE-skylt'?!!doorPhotos[obj.id]||!!templates[cat]:!!templates[cat];}
async function slrComplete(){
 const current=item;if(!current)return;
 if(completedDoors[current.id]){slrInvalidate(current);bridge?.save?.();bridge?.redraw?.();draw();return;}
 await loadTemplates();if(item!==current)return;
 const missing=cats.filter(cat=>!slrDocumentAvailable(current,cat));if(missing.length)return announce('Lägg till dokument före slutförande: '+missing.map(labelFor).join(', ')+'.',true);
 // Validate this door's product source; a stale GS must not become an approved package.
 await compose('Produktlista',current);if(item!==current)return;
 slrRequirePointSignatures(current);
 const unchecked=cats.filter(cat=>!reviewedFolders[current.id]?.[cat]);if(unchecked.length)return announce('Kontrollera mapparna först: '+unchecked.map(labelFor).join(', ')+'.',true);
 completedDoors[current.id]={at:new Date().toISOString()};slrExportReady=null;bridge?.save?.();bridge?.redraw?.();draw();announce('CE-underlaget är slutfört för denna dörr. Klart för export.');
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
function slrFieldValue(i,name,values,defaults,cat){
 if(cat==='Loggbok'&&/^6\.5\./.test(name))return '';
 if(cat==='Egenkontroll'&&/^(10\.5\.\d+) Datum$/i.test(name)&&!values[name]){
  const point=name.match(/^(10\.5\.\d+)/)?.[1];
  return point&&slrEgenPointSelected(i,point)&&slrSignatureImage(slrSignatureFor(i,cat,point+' Signatur'))?(slrSignatureDateInfo().iso||bridge?.getProjectMeta?.()?.date||''):'';
 }
 if(name==='Drivsystem fabrikat')return slrMachine(i).brand;
 if(name==='Drivsystem modell')return slrMachine(i).model;
 if(name==='Dörrnummer, beteckning')return slrDoorNumber(i);
 if(name==='Plats i byggnaden')return String(i.location||'');
 if(name==='Objekt')return String(bridge?.getProjectMeta?.()?.objectNo||bridge?.getProjectMeta?.()?.facilityNo||'');
 return ["Dörrnummer, beteckning","Maskin ID","Drivsystem serienummer"].includes(name)?slrDoorDesignation(i):(values[name]??defaults[name]??"");
}
function slrDoorNumber(i){return String(i.serialNumber||slrDoorDesignation(i).split('-').at(-1)||'');}
function slrMachine(i){return window.TillsynoCEModels.resolve(i.modelCode,i.model,i.manufacturer||i.brand);}
function slrClearEditor(){
 slrSensorMenuCleanup?.();
 slrEditorRevision++;
 if($("slrPinnedClose"))$("slrPinnedClose").hidden=true;
 const fields=$("slrFields");if(fields){fields.replaceChildren();fields.className="";}
 const heading=$("slrEditHeading");if(heading)heading.textContent="";
 for(const dialog of document.querySelectorAll?.(".slrSignatureDlg")||[])dialog.close();
}
function slrMountEditor(cat){
 const editor=$("slrEditor");if(!editor)return;
 slrEditingCategory=cat;editor.hidden=false;if($("slrPinnedClose"))$("slrPinnedClose").hidden=false;
 // A full multi-page PDF must be OUTSIDE the collapsible <details> folder.
 // Otherwise iOS Safari can clip everything below page one.
 const folders=$("slrTestDocRows");
 if(folders)folders.after(editor);
 for(const button of document.querySelectorAll("[data-slr-edit]"))slrSetActionLabel(button,button.dataset.slrEdit===cat&&button.dataset.slrScope===slrEditScope?"Stäng":button.dataset.slrEdit==="Produktlista"?"Fyll i":button.dataset.slrScope==="profile"?"Gemensamt":"Endast denna");
}
function slrCloseEditor(){
 const cat=slrEditingCategory;slrEditingCategory="";slrEditScope="door";slrClearEditor();
 const editor=$("slrEditor");if(editor)editor.hidden=true;
 draw();
 const section=Array.from($("slrTestDocRows")?.children||[]).find(e=>e.dataset.slrCategory===cat);
 section?.scrollIntoView?.({block:"start"});
}
function auto(i){
 const m=bridge?.getProjectMeta?.()||{},id=slrDoorDesignation(i);
 const place=(value,postcode,city)=>value!==undefined?String(value):[postcode,city].filter(Boolean).join(' ');
 return {
  'Beställare företagsnamn':m.customer||'', 'Beställare adress':m.address||'',
  'Beställarepostnummer/ort':place(m.customerPostalPlace,m.postalCode,m.postalCity),
  'Beställare kontaktperson':m.contact||'', 'Beställare telefonnummer':m.phone||'',
  'Tillverkare företagsnamn':m.company||'', 'Tillverkare adress':m.companyAddress||'',
  'Tillverkare postnummer/ort':place(m.companyPostalPlace,m.companyPostalCode,m.companyPostalCity),
  'Tillverkare org. nr':m.companyOrgNo||'', 'Tillverkare kontaktperson':m.companyContact||'',
  'Tillverkare telefonnummer':m.companyPhone||'', 'Auktorisationsnummer SLR':m.slrAuthorisation||'',
  'Offertnummer/Ordernummer':m.order||'', 'Objekt':m.projectName||m.facilityNo||'',
  'Plats i byggnaden':i.location||'', 'Dörrnummer, beteckning':slrDoorNumber(i), 'Maskin ID':id,
  'Drivsystem fabrikat':slrMachine(i).brand, 'Drivsystem modell':slrMachine(i).model, 'Drivsystem serienummer':id,
  'Adress rad 1':m.siteAddress!==undefined?m.siteAddress:(m.address||''),
  'Adress rad 2':place(m.sitePostalPlace,m.postalCode,m.postalCity),
  '4.7 Företag':m.technicianCompany!==undefined?m.technicianCompany:(m.company||''),
  '4.7 Namn':m.technician||'', '4.7 Telefonnummer':m.technicianPhone!==undefined?m.technicianPhone:(m.companyPhone||''),
  '4.7 Datum':m.date||'', 'Riskanalys utförd av':m.technician||'', 'Riskanalys utförd datum':m.date||'',
  'Installationsdatum':m.installationDate||'',
  'Dokumentation Namn':m.documentationName||'', 'Dokumentation Adress':m.documentationAddress||'',
  'Dokumentation Postnummer, Ort':m.documentationPostalPlace||'',
  'Namnförtydligande':m.egSignerName||'', 'Titel':m.egSignerTitle||'', 'Ort':m.egPlace||'', 'Datum':m.egDate||m.date||''
 };
}
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
    for(const [id,meta]of Object.entries(stored.products||{})){if(productFiles[id])continue;if(meta.generated)productFiles[id]={...meta};else if(attachments[meta.file]?.content)productFiles[id]={...meta,bytes:new Uint8Array(attachments[meta.file].content)};}
   }finally{try{await p?.destroy()}catch(_){}}
  }
  for(const [cat,bytes]of Object.entries(templates))if(!choiceGroups[cat]&&/\.pdf$/i.test(names[cat]||'template.pdf'))await slrInspectChoices(cat,bytes);
  templatesLoaded=true;
  templateLoadWarning="";
 })();
 try{await loading}finally{loading=null}
}
function slrSignatureDateInfo(){
 const iso=slrDateValue(signatureDate)||slrDateValue(bridge?.getProjectMeta?.()?.date)||'';
 const parts=iso.split('-');
 if(parts.length!==3)return {iso:'',display:'',style:signatureDateStyle,format:signatureDateFormat};
 const months=['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
 const month=months[Number(parts[1])-1]||parts[1],year=parts[0],day=Number(parts[2]);
 const display=signatureDateFormat==='month'?month+' '+year:day+' '+month+' '+year;
 return {iso,display,style:signatureDateStyle,format:signatureDateFormat};
}
function slrIsDateField(name){return /datum/i.test(String(name||''));}
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
 if(!slrIsDateField(name)){input.type="text";input.value=String(value??"");return;}
 input.type="date";input.value=slrDateValue(value);input.classList.add("slrOverlayDate");input.style.textAlign='left';input.style.direction='ltr';
 input.addEventListener("click",()=>{try{input.showPicker?.()}catch(_){}});
}
function kind(f){if(f instanceof PDFLib.PDFTextField)return "text";if(f instanceof PDFLib.PDFCheckBox)return "check";if(f instanceof PDFLib.PDFRadioGroup)return "radio";if(f instanceof PDFLib.PDFDropdown||f instanceof PDFLib.PDFOptionList)return "choice";return ""}
function clearRisk(pdf){const form=pdf.getForm();for(const f of form.getFields())try{const k=kind(f);if(k==="text")f.setText("");else if(k==="check")f.uncheck();else if(k==="radio"||k==="choice")f.clear();else if(f instanceof PDFLib.PDFSignature){f.acroField.dict.delete(PDFLib.PDFName.of("V"));f.acroField.dict.delete(PDFLib.PDFName.of("AP"));for(const widget of f.acroField.getWidgets())widget.dict.delete(PDFLib.PDFName.of("AP"));}if(k==="check"||k==="radio"){f.acroField?.dict?.delete?.(PDFLib.PDFName.of("DV"));for(const widget of f.acroField.getWidgets())widget.dict.set(PDFLib.PDFName.of("AS"),PDFLib.PDFName.of("Off"));}}catch(_){}
for(const p of pdf.getPages()){const arr=p.node.Annots?.();if(!arr)continue;const keep=[];for(let n=0;n<arr.size();n++){const ref=arr.get(n),node=pdf.context.lookup(ref);if(node instanceof PDFLib.PDFDict&&node.get(PDFLib.PDFName.of("Subtype"))?.toString()==="/Widget")keep.push(ref)}p.node.set(PDFLib.PDFName.of("Annots"),pdf.context.obj(keep));}}
function slrProductSuggestions(obj){
 const machine=slrMachine(obj),result=[];
 if(machine.model)result.push({kind:'Dörrautomatik',brand:machine.brand||'',name:machine.model,quantity:'1',notes:''});
 const types=new Set();
 for(const key of ['4.6.1','4.6.2','10.5.3','10.5.5']){
  const cat=slrSensorCategory(key),values=slrEffectiveFields(obj,cat),selected=slrDecode(values[key]);
  const field=key.startsWith('4.')?key+' text 1':slrSensorField(obj,key);
  if((key.startsWith('4.')&&/^H.*Val\s*1$/i.test(selected)||key.startsWith('10.')&&selected==='Val 2')&&values[field])types.add(String(values[field]));
 }
 for(const name of types)result.push({kind:'Sensor',brand:'',name,quantity:'1',notes:''});return result;
}
function slrSetProductRows(obj,rows){
 if(!obj||!Array.isArray(rows)||rows.length>200)throw Error('Högst 200 produktrader per dörr.');
 const entry=saved(obj,'Produktlista');entry.productRows=rows.map(row=>Object.fromEntries(['kind','brand','name','quantity','notes'].map(key=>[key,String(row[key]??'')])));entry.productDirty=true;slrDirty(obj,'Produktlista');
}
async function slrBuildManualProductPdf(obj,store=true){
 const entry=saved(obj,'Produktlista'),rows=(entry.productRows||[]).filter(row=>String(row.name||'').trim()||String(row.brand||'').trim()||String(row.notes||'').trim());if(!rows.length)throw Error('Skriv minst en produkt.');
 const revision=JSON.stringify(rows),designation=slrDoorDesignation(obj),meta=bridge?.getProjectMeta?.()||{};
 const pdf=await PDFLib.PDFDocument.create(),font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold),black=PDFLib.rgb(.08,.15,.18),grey=PDFLib.rgb(.68,.76,.8);
 const clean=value=>String(value??'').replace(/[–—]/g,'-').replace(/[^\u0020-\u00ff]/g,' ');
 const wrap=(value,width)=>{const words=clean(value).split(/\s+/).filter(Boolean),lines=[];let line='';for(let word of words){while(font.widthOfTextAtSize(word,9)>width){let cut=word.length;while(cut>1&&font.widthOfTextAtSize(word.slice(0,cut),9)>width)cut--;if(line){lines.push(line);line='';}lines.push(word.slice(0,cut));word=word.slice(cut);}const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,9)>width){if(line)lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.length?lines:[''];};
 let page,y;
 const xs=[40,158,280,518],widths=[108,112,226,32];
 const next=()=>{
  page=pdf.addPage([595.28,841.89]);y=790;
  page.drawText('Produktlista - dörrautomatik',{x:40,y,size:17,font:bold,color:black});y-=25;
  for(const text of [meta.projectName||'',designation,obj.location||'',[meta.customer,meta.address,meta.customerPostalPlace].filter(Boolean).join(' · ')])
   for(const line of wrap(text,510)){page.drawText(line,{x:40,y,size:9,font,color:black});y-=14;}
  y-=10;
  for(const [i,label]of ['Typ','Fabrikat','Produkt / modell','Antal'].entries())
   page.drawText(label,{x:xs[i],y,size:9,font:bold,color:black});
  y-=11;page.drawLine({start:{x:40,y},end:{x:555,y},thickness:.75,color:grey});y-=16;
 };next();
 for(const row of rows){
  const model=[row.name,row.notes?('Notering: '+row.notes):''].filter(Boolean).join(' - ');
  const cols=[wrap(row.kind,widths[0]),wrap(row.brand||'',widths[1]),wrap(model,widths[2]),wrap(row.quantity||'1',widths[3])];
  const lineCount=Math.max(...cols.map(col=>col.length));
  if(y<85+lineCount*13)next();
  for(let line=0;line<lineCount;line++){
   if(y<70)next();
   for(const [i,col]of cols.entries())if(col[line])page.drawText(col[line],{x:xs[i],y,size:9,font,color:black});
   y-=13;
  }
  page.drawLine({start:{x:40,y:y+5},end:{x:555,y:y+5},thickness:.35,color:grey});y-=9;
 }
 const bytes=new Uint8Array(await pdf.save({useObjectStreams:true}));
 if(designation!==slrDoorDesignation(obj)||JSON.stringify((entry.productRows||[]).filter(row=>String(row.name||'').trim()||String(row.brand||'').trim()||String(row.notes||'').trim()))!==revision)throw Error('Produktlistan ändrades under sparningen. Spara igen.');
 if(!store)return bytes;
 productFiles[obj.id]={bytes,name:'Produktlista.pdf',designation,format:'manual-ce-v7',generated:true,rowCount:rows.length,gsCode:'',cardPage:0};entry.productDirty=false;slrDirty(obj,'Produktlista');if(item===obj)draw();return bytes;
}
function slrDownloadFile(bytes,name,type='application/pdf'){
 const url=URL.createObjectURL(new Blob([bytes],{type})),link=elm('a');link.href=url;link.download=name;(Array.from(document.querySelectorAll('dialog[open]')).at(-1)||document.body).append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);
}
async function slrSaveFilledDoc(cat,obj=item){
 if(!obj)return;try{const bytes=await compose(cat,obj),photo=cat==='CE-skylt'?doorPhotos[obj.id]:null,ext=photo?(photo.type==='image/png'?'png':'jpg'):cat==='CE-skylt'?(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||'pdf'):'pdf';slrDownloadFile(bytes,slrFolderName(labelFor(cat))+'-'+slrFolderName(slrDoorDesignation(obj))+'.'+ext,ext==='pdf'?'application/pdf':ext==='png'?'image/png':'image/jpeg');announce('Ifylld '+labelFor(cat)+' sparas för denna dörr.');}catch(error){announce(error.message,true);}
}
async function slrShareFilledDoc(cat,obj=item){
 if(!obj)return;
 try{
  const bytes=await compose(cat,obj),photo=cat==='CE-skylt'?doorPhotos[obj.id]:null;
  const ext=photo?(photo.type==='image/png'?'png':'jpg'):cat==='CE-skylt'?(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||'pdf'):'pdf';
  const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':'image/jpeg';
  const filename=slrFolderName(labelFor(cat))+'-'+slrFolderName(slrDoorDesignation(obj))+'.'+ext;
  const file=new File([bytes],filename,{type:mime});
  if(navigator.canShare?.({files:[file]})&&navigator.share){
   try{await navigator.share({files:[file],title:labelFor(cat)+' – '+slrDoorDesignation(obj)});}
   catch(error){if(error.name!=='AbortError')throw error;}
  }else{
   slrDownloadFile(bytes,filename,mime);
   announce('PDF sparad. Bifoga den i ditt mejl. Delning av filer stöds inte i den här webbläsaren.');
  }
 }catch(error){announce('Kunde inte dela dokumentet: '+error.message,true);}
}
function slrEditProducts(){
 const current=item;if(!current)return;slrMountEditor('Produktlista');slrEditScope='door';
 const host=$('slrFields');host.replaceChildren();host.className='ceProductEditor';
 $('slrEditHeading').textContent='Produktlista · '+slrDoorDesignation(current);
 const entry=saved(current,'Produktlista');
 const normalize=row=>({kind:row.kind==='Säkerhetssensor'?'Sensor':row.kind||'Övrigt',brand:row.brand||'',name:row.name||'',quantity:row.quantity||'1',notes:row.notes||''});
 let rows=structuredClone(entry.productRows||[]).map(normalize);
 if(!rows.length)rows=[normalize({kind:'Övrigt'})];
 const hint=elm('p','Fyll i produkter som ingår i den här dörren. Tabellen sparas till PDF.');hint.className='ceMuted';host.append(hint);
 const tools=elm('div');tools.className='ceProductTools';
 const list=elm('div');list.className='ceProductRows';
 const heading=elm('div');heading.className='ceProductHead';
 for(const label of ['Typ','Fabrikat','Produkt / modell','Antal',''])heading.append(elm('strong',label));
 const persist=()=>{if(item!==current)return;slrSetProductRows(current,rows);};
 const render=()=>{
  list.replaceChildren(heading);
  for(const [index,row]of rows.entries()){
   const tr=elm('div');tr.className='ceProductRow ceProductTableRow';
   const kind=elm('select');kind.setAttribute('aria-label','Produkttyp '+(index+1));
   for(const value of ['Dörrautomatik','Lås','Handtag','Sensor','Impulsgivare','Beslag','Övrigt']){
    const option=elm('option',value);option.value=value;kind.append(option);
   }
   if(!Array.from(kind.options).some(o=>o.value===row.kind)){const option=elm('option',row.kind);option.value=row.kind;kind.append(option);}
   kind.value=row.kind;
   const brand=elm('input');brand.value=row.brand;brand.placeholder='Fabrikat';brand.setAttribute('aria-label','Fabrikat '+(index+1));
   const name=elm('input');name.value=row.name;name.placeholder='Produkt eller modell';name.setAttribute('aria-label','Produkt eller modell '+(index+1));name.setAttribute('list','ceProductSuggestions');
   const number=elm('input');number.value=row.quantity;number.inputMode='numeric';number.placeholder='1';number.setAttribute('aria-label','Antal '+(index+1));
   for(const [input,key]of [[kind,'kind'],[brand,'brand'],[name,'name'],[number,'quantity']])
    input.addEventListener(key==='kind'?'change':'input',()=>{row[key]=input.value;persist();});
   const remove=elm('button','×');remove.type='button';remove.setAttribute('aria-label','Ta bort produktrad '+(index+1));
   remove.onclick=()=>{rows.splice(index,1);persist();render();};
   tr.append(kind,brand,name,number,remove);
   if(row.notes){
    const note=elm('input');note.value=row.notes;note.placeholder='Extra information från tidigare produktlista';note.className='ceProductExtra';
    note.setAttribute('aria-label','Extra information '+(index+1));note.oninput=()=>{row.notes=note.value;persist();};tr.append(note);
   }
   list.append(tr);
  }
 };
 const add=elm('button','＋ Ny produkt');add.type='button';add.className='ceProductAdd';add.onclick=()=>{if(rows.length>=200)return;rows.push(normalize({kind:'Övrigt'}));persist();render();};
 const save=elm('button','Spara PDF');save.type='button';save.className='ceProductSave';save.title='Spara produktlista som PDF';
 save.onclick=async()=>{save.disabled=true;try{persist();await slrBuildManualProductPdf(current);await slrSaveFilledDoc('Produktlista',current);}catch(error){announce(error.message,true);}finally{save.disabled=false;}};
 tools.append(add,save);host.append(tools,list);
 const options=elm('datalist');options.id='ceProductSuggestions';
 for(const value of [...slrSensorPresets,...window.TillsynoCEModels.list.map(row=>row[1])]){
  const option=elm('option');option.value=value;options.append(option);
 }
 host.append(options);render();$('slrEditHeading').scrollIntoView({block:'start'});
}
function slrCleanOnePdfCheck(page,rect,on){
 if(!page||!rect)return;const size=Math.min(rect.width,rect.height);if(!Number.isFinite(size)||size<=1)return;
 const x=rect.x+(rect.width-size)/2,y=rect.y+(rect.height-size)/2;
 page.drawRectangle({x:x-.6,y:y-.6,width:size+1.2,height:size+1.2,color:PDFLib.rgb(1,1,1)});
 const stroke=Math.max(.65,Math.min(1.15,size*.09));
 page.drawRectangle({x:x+stroke/2,y:y+stroke/2,width:size-stroke,height:size-stroke,borderColor:PDFLib.rgb(.15,.2,.24),borderWidth:stroke});
 if(!on)return;
 const d=Math.min(2,Math.max(.75,size*.18)),opts={thickness:Math.max(1.25,Math.min(1.7,size*.18)),color:PDFLib.rgb(.08,.08,.08)};
 page.drawLine({start:{x:x+d,y:y+d},end:{x:x+size-d,y:y+size-d},...opts});
 page.drawLine({start:{x:x+size-d,y:y+d},end:{x:x+d,y:y+size-d},...opts});
}
function slrCollectPdfMarks(pdf,cat,values){
 const pages=pdf.getPages(),marks=[];
 for(const [pageIndex,widgets]of slrWidgetsByPage(pdf).entries())for(const widget of widgets){
  const v=cat==='Riskanalys'&&pages.length===5&&pageIndex===2&&widget.name==='4.6.1'?values['4.6.2']:values[widget.name];
  marks.push({...widget,pageIndex,checked:widget.type==='check'?(v===true||v==='Yes'||!!widget.value&&slrChoiceId(v)===slrChoiceId(widget.value)):!!v&&!!widget.value&&slrChoiceId(v)===slrChoiceId(widget.value)});
 }
 if(cat==='Riskanalys'&&pages.length===5){
  const groups=[
   [1,'4.6.1',[[231,325.8,'Hög Val 1'],[231,344.2,'Hög Val 2'],[231,374.9,'Låg Val 1'],[231,571.3,'Låg Val 2'],[231,638.4,'Låg Val 3']]],
   [2,'4.6.2',[[230.9,101.2,'Hög Val 1'],[230.9,119.9,'Hög Val 2'],[230.9,238.8,'Låg Val 2'],[230.9,305.4,'Låg Val 3']]]
  ];
  for(const [pageIndex,key,positions]of groups){
   const page=pages[pageIndex],picked=slrChoiceId(values[key]||'');
   for(const [x,top,option]of positions){
    const nearest=marks.filter(m=>m.pageIndex===pageIndex&&m.name==='4.6.1')
     .map(m=>({m,dist:Math.hypot(m.rect.x+m.rect.width/2-(x+5.5),page.getHeight()-(m.rect.y+m.rect.height/2)-(top+5.5))}))
     .sort((a,b)=>a.dist-b.dist)[0];
    const checked=!!picked&&picked===slrChoiceId(option);
    if(nearest&&nearest.dist<13)nearest.m.checked=checked;
    else marks.push({pageIndex,rect:{x,y:page.getHeight()-top-11,width:11,height:11},checked});
   }
  }
 }
 return marks;
}
async function slrBluePenPng(signature){
 if(!/^data:image\/png;base64,/.test(signature))return signature;
 try{
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);img.onerror=reject;img.src=signature;
  });
  const c=document.createElement('canvas');
  c.width=image.naturalWidth||image.width;c.height=image.naturalHeight||image.height;
  const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
  ctx.globalCompositeOperation='source-in';
  ctx.fillStyle='#529ac6';ctx.fillRect(0,0,c.width,c.height);
  return c.toDataURL('image/png');
 }catch(_){return signature}
}
function slrStripSignatureFields(pdf){
 // SLR forms contain many unsigned AcroForm /Sig fields, often without
 // an appearance stream. PDF-lib cannot flatten OR removeField() these
 // fields normally ("Unexpected N type: undefined").
 const N=PDFLib.PDFName, C=pdf.context;
 const signatureRefs=new Set(pdf.getForm().getFields()
  .filter(field=>field instanceof PDFLib.PDFSignature)
  .map(field=>String(field.ref)));
 if(!signatureRefs.size)return 0;
 const acro=pdf.catalog.lookup(N.of('AcroForm'),PDFLib.PDFDict);
 const roots=acro.lookup(N.of('Fields'),PDFLib.PDFArray);
 const prune=array=>{
  const keep=[];
  for(let i=0;i<array.size();i++){
   const ref=array.get(i),node=C.lookup(ref);
   if(signatureRefs.has(String(ref)))continue;
   if(node instanceof PDFLib.PDFDict){
    const childRef=node.get(N.of('Kids')),children=childRef?C.lookup(childRef):null;
    if(children instanceof PDFLib.PDFArray)prune(children);
   }
   keep.push(ref);
  }
  for(let i=array.size()-1;i>=0;i--)array.remove(i);
  for(const ref of keep)array.push(ref);
 };
 prune(roots);
 for(const page of pdf.getPages()){
  const annotations=page.node.Annots?.();
  if(!annotations)continue;
  const keep=[];
  for(let i=0;i<annotations.size();i++){
   const ref=annotations.get(i),node=C.lookup(ref);
   const parent=node instanceof PDFLib.PDFDict?node.get(N.of('Parent')):null;
   if(!signatureRefs.has(String(ref))&&!signatureRefs.has(String(parent)))keep.push(ref);
  }
  for(let i=annotations.size()-1;i>=0;i--)annotations.remove(i);
  for(const ref of keep)annotations.push(ref);
 }
 return signatureRefs.size;
}
async function flattenDocument(source){
 const form=source.getForm();if(!form.getFields().length)return source;
 // Isolate the flatten attempt. A malformed original widget must never
 // corrupt the working PDF or stop preview/ZIP export.
 let bytes;
 try{bytes=new Uint8Array(await source.save({useObjectStreams:false}));}
 catch(error){console.warn('CE: PDF preflight',error);return source;}
 try{
  const working=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
  slrStripSignatureFields(working);
  const remaining=working.getForm().getFields();
  if(remaining.length)working.getForm().flatten({updateFieldAppearances:true});
  return working;
 }catch(error){
  // Preview still opens with a normal fillable PDF if a damaged non-signature
  // widget cannot be flattened. Data, images and all pages are preserved.
  console.warn('CE: using fillable PDF fallback',error);
  const fallback=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
  try{slrStripSignatureFields(fallback);}catch(warning){console.warn('CE: signature fallback',warning);}
  return fallback;
 }
}
async function compose(cat,i){if(cat==="Produktlista"){const product=productFiles[i.id];if(!product)throw Error("Lägg till produktlistans PDF för denna dörr.");if(answers[i.id]?.Produktlista?.productDirty||product.generated&&product.designation!==slrDoorDesignation(i))throw Error("Produktlistan har ändrats. Öppna Fyll i och tryck Spara PDF.");if(product.generated&&!product.bytes)return slrBuildManualProductPdf(i,false);if(/^manual-ce-v[234567]$/.test(product.format))return product.bytes.slice();if(product.format!=="two-columns-v1")throw Error("Tryck Uppdatera PDF för den nya produktlistan.");const source=window.SmartMatchDALink?.getSLRSource?.(i)||verificationByDoor[i.id];if(source&&(!source.gs||source.gs.code!==product.gsCode||source.cardPage!==product.cardPage))throw Error("GS-kopplingen har ändrats. Uppdatera produktlistan från rätt dörrkort.");return product.bytes.slice();}if(cat==="CE-skylt"&&doorPhotos[i.id])return slrPhotoBytes(doorPhotos[i.id]);const bytes=templates[cat];if(!bytes)throw Error("Ingen mall");
if(cat==="CE-skylt"&&/\.(png|jpe?g)$/i.test(names[cat]||""))return bytes.slice();
let pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
clearRisk(pdf);
const values=slrEffectiveFields(i,cat),defaults=auto(i);
const cleanMarks=(cat==='Riskanalys'||cat==='Egenkontroll')?slrCollectPdfMarks(pdf,cat,values):[];
for(const f of pdf.getForm().getFields()){const name=f.getName(),k=kind(f),v=slrFieldValue(i,name,values,defaults,cat);if(v===undefined)continue;
try{if(cat==="Riskanalys"&&name==="4.6.1")continue;if(k==="text"){f.setText(String(v??""));f.setAlignment(PDFLib.TextAlignment.Left);} else if(k==="check"){if(v===true||v==='Yes')f.check();else f.uncheck()}else if((k==="radio"||k==="choice")&&v){const option=f.getOptions().find(o=>slrDecode(o)===slrDecode(v));if(option)f.select(option);else f.clear()}else if(k==="radio"||k==="choice")f.clear()}catch(_){}}
const stamps=[],record=saved(i,cat),shared=doorSignatures[i.id],currentImage=slrSignatureFor(i,cat);
 for(const [key,sign] of Object.entries(cat==='Loggbok'?{}:record.signatures||{})){
  if(!sign?.rect||!Number.isInteger(Number(sign.page)))continue;
  const imageRef=slrSignatureFor(i,cat,key);
  if(slrSignatureImage(imageRef))stamps.push({page:Number(sign.page),rect:sign.rect,imageRef,key});
 }
 if(cat!=='Loggbok'){
  for(const position of slrSignatureWidgets(pdf)){
   if(stamps.some(stamp=>stamp.key===position.key&&stamp.page===position.page))continue;
   const imageRef=slrSignatureFor(i,cat,position.key);
   if(slrSignatureImage(imageRef))stamps.push({...position,imageRef});
  }
 }
 if(cat==='Riskanalys'&&slrSignatureImage(currentImage)&&pdf.getPages()[4]&&!stamps.some(stamp=>stamp.page===4)){
  // Five-page SLR risk originals may not contain an AcroForm signature
  // widget in section 4.7. Use the printed signature area as fallback.
  const pg=pdf.getPages()[4];
  stamps.push({page:4,rect:[140.5,pg.getHeight()-619.8,339,pg.getHeight()-619.8+35.8],imageRef:currentImage,fixed:true});
 }
 pdf=await flattenDocument(pdf);
 for(const mark of cleanMarks)slrCleanOnePdfCheck(pdf.getPages()[mark.pageIndex],mark.rect,mark.checked);
 const dateInfo=slrSignatureDateInfo(),bluePenCache=new Map();
 const signatureFont=dateInfo.style==='typewriter'?PDFLib.StandardFonts.CourierOblique:
  dateInfo.style==='regular'?PDFLib.StandardFonts.Helvetica:PDFLib.StandardFonts.TimesRomanItalic;
 let dateFont=null,dateImage=null;
 if(dateInfo.display&&slrSignatureImage(projectSignature)){
  if(dateInfo.style==='handwriting'){
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   const font='italic 64px "Apple Chancery","Segoe Script","Brush Script MT",cursive';
   ctx.font=font;
   canvas.width=Math.min(1000,Math.ceil(ctx.measureText(dateInfo.display).width+25));canvas.height=102;
   const pen=canvas.getContext('2d');pen.font=font;pen.fillStyle='#529ac6';pen.textBaseline='alphabetic';pen.fillText(dateInfo.display,8,78);
   dateImage=await pdf.embedPng(canvas.toDataURL('image/png'));
  }else dateFont=await pdf.embedFont(signatureFont);
 }
 for(const stamp of stamps){
  const page=pdf.getPages()[stamp.page],rect=stamp.rect,ref=slrSignatureImage(stamp.imageRef);
  if(!page||!ref||!Array.isArray(rect)||rect.length!==4)continue;
  try{
   if(!bluePenCache.has(ref))bluePenCache.set(ref,await slrBluePenPng(ref));
   const img=await pdf.embedPng(bluePenCache.get(ref)),left=Math.min(rect[0],rect[2]),bottom=Math.min(rect[1],rect[3]);
   const width=Math.abs(rect[2]-rect[0]),height=Math.abs(rect[3]-rect[1]),dated=!!(dateFont||dateImage)&&height>=18;
   const labelHeight=dated?Math.min(11,Math.max(8,height*.30)):0;
   const signatureHeight=height-labelHeight-(dated?1.5:0);
   const ratio=Math.min(width/img.width,signatureHeight/img.height),w=img.width*ratio,h=img.height*ratio;
   // Light-blue pen signature centered above the centered, light-blue date.
   page.drawImage(img,{x:left+(width-w)/2,y:bottom+labelHeight+(signatureHeight-h)/2,width:w,height:h});
   if(dated&&dateImage){
    const ratio=Math.min((width-1)/dateImage.width,labelHeight/dateImage.height);
    const w=dateImage.width*ratio,h=dateImage.height*ratio;
    page.drawImage(dateImage,{x:left+(width-w)/2,y:bottom+(labelHeight-h)/2,width:w,height:h});
   }else if(dated){
    let size=Math.min(9,Math.max(6,labelHeight*.77));
    while(size>5&&dateFont.widthOfTextAtSize(dateInfo.display,size)>width)size-=.5;
    if(dateFont.widthOfTextAtSize(dateInfo.display,size)<=width)
     page.drawText(dateInfo.display,{x:left+(width-dateFont.widthOfTextAtSize(dateInfo.display,size))/2,y:bottom+Math.max(1,(labelHeight-size)/2+1),size,font:dateFont,color:PDFLib.rgb(.32,.60,.78)});
   }
  }catch(err){throw Error('Kunde inte lägga in underskriften i '+labelFor(cat)+': '+err.message)}
 }
 return new Uint8Array(await pdf.save({useObjectStreams:true}));
}
function setup(){if($("slrFlowTestDialog"))return;
const style=elm("style");style.textContent='#slrFlowTestDialog{width:min(850px,96vw);max-height:95dvh;background:#f4f8fa;color:#122f42;border:1px solid #7399b0;border-radius:14px;padding:0}#slrFlowTestDialog::backdrop{background:#061c32b3}#slrFlowTestDialog header{background:#12334e;color:white;padding:16px;display:flex;align-items:center;justify-content:space-between}#slrFlowTestDialog main{padding:16px;max-height:calc(95dvh - 74px);overflow:auto}#slrFlowTestDialog button{padding:9px 12px;border-radius:8px;border:1px solid #90adc0;background:#e5f2f9;color:#103b54;font-size:13px;font-weight:700;margin:3px}#slrFlowTestDialog .slrDocRow{padding:12px 0;border-bottom:1px solid #ccdae2;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}#slrFlowTestDialog #slrEditor[hidden]{display:none!important}#slrFlowTestDialog #slrEditor{padding:8px 0 14px;width:100%;min-width:0}#slrFlowTestDialog .slrEditToolbar{display:flex;align-items:center;justify-content:space-between;gap:10px}#slrFlowTestDialog .slrDocSection{border-bottom:1px solid #ccdae2}#slrFlowTestDialog .slrDocRow small{display:block;color:#426476;margin-top:4px}#slrFlowTestDialog #slrFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;margin:15px 0}#slrFlowTestDialog label{color:#244c66;font-size:13px;display:block}#slrFlowTestDialog select,#slrFlowTestDialog input[type=text],#slrFlowTestDialog input[type=date]{width:100%;min-height:38px;padding:7px;margin-top:4px;background:white;color:#142e3e;border-radius:8px;border:1px solid #a8bfca}#slrFlowTestDialog input[type=checkbox]{width:20px;height:20px}#slrStatusText{font-size:13px;line-height:1.5}@media(max-width:650px){#slrFlowTestDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrFlowTestDialog main{max-height:calc(100dvh - 74px)}}';document.head.append(style);
const folderStatusCss=elm("style");folderStatusCss.id="slrFolderStatusCss";folderStatusCss.textContent="#slrFlowTestDialog .slrFolderProgress{margin-left:auto;white-space:nowrap;padding:5px 9px;font-size:12px;font-weight:800;border-radius:18px;background:#e3e9ed;color:#5f7180}#slrFlowTestDialog .slrFolderProgress.is-partial{background:#d3ecd9;color:#19653c}#slrFlowTestDialog .slrFolderProgress.is-done{background:#b8e7c8;color:#126138}#slrFlowTestDialog .slrFolderActions button:disabled{opacity:.45;cursor:not-allowed}#slrFlowTestDialog .slrFolderActions button{font-size:12px}";document.head.append(folderStatusCss);
const d=elm("dialog");d.id="slrFlowTestDialog";d.innerHTML='<header><div><strong id="slrTestHeading">CE-märkning TEST 6</strong><div style="font-size:12px;opacity:.8">Öppna en mapp för att visa verktygen</div></div><button id="slrTestExit" type="button">Stäng ×</button></header><main><div id="slrTestSource" style="font-size:13px;margin:9px 0"></div><div id="slrProfilesPanel" style="padding:10px;margin:8px 0;border:1px solid #b8d1dd;border-radius:10px;background:#eff7fc"><label style="font-weight:500" for="slrDoorProfile">Gemensam standard för dörrtyp</label><select id="slrDoorProfile" style="margin:7px 0;width:100%;min-height:42px"><option value="">Ingen profil (manuell)</option><option value="glass">Med glas</option><option value="noGlass">Utan glas</option></select><div id="slrDoorProfileCaption" style="font-size:12px;line-height:1.5;color:#315568"></div><details class="slrProfileSettings"><summary>Inställningar för standard</summary><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px"><button id="slrSaveProfileChecks" type="button" style="padding:8px;border:1px solid #8aa9ba;border-radius:7px">Spara som standard</button><button id="slrResetDoorChecks" type="button" style="padding:8px;border:1px solid #8aa9ba;border-radius:7px">Återställ denna dörr</button></div><div style="margin-top:7px;font-size:12px;color:#315568">Öppna en dokumentmapp för att visa eller ändra denna dörr.</div></details></div><div id="slrTestDocRows"></div><div class="slrCompleteBar"><button id="slrMarkFiveReviewed" type="button" title="Markera Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran och Egenkontroll på denna dörrautomatik">Markera 5 som granskade</button><button id="slrDoneDoor" type="button">Slutför dörr</button><button id="slrCustomerExport" type="button" style="padding:10px 13px;border:1px solid #8aa9ba;border-radius:8px;background:#fff">Exportera CE-underlag</button></div><section id="slrEditor" hidden><div class="slrEditToolbar"><h3 id="slrEditHeading" style="font-size:16px"></h3><button id="slrCloseEditor" type="button">Stäng redigering</button></div><div id="slrFields"></div></section><p id="slrStatusText"></p></main><input id="slrFileSelect" type="file" style="display:none" accept=".pdf,application/pdf"><input id="slrCameraSelect" type="file" hidden accept="image/*" capture="environment"><input id="slrPhotoSelect" type="file" hidden accept="image/*">';
document.body.append(d);const pinned=elm('button','Stäng redigering');pinned.id='slrPinnedClose';pinned.type='button';pinned.hidden=true;pinned.onclick=slrCloseEditor;d.querySelector('header').insertBefore(pinned,$('slrTestExit'));$("slrDoorProfile").onchange=e=>slrSetDoorProfile(e.target.value);$("slrSaveProfileChecks").onclick=()=>void slrCaptureProfile().catch(err=>announce(err.message,true));$("slrResetDoorChecks").onclick=()=>void slrResetCurrentDoor().catch(err=>announce(err.message,true));$("slrCustomerExport").onclick=()=>void openExport(bridge).catch(err=>announce(err.message,true));$("slrDoneDoor").onclick=()=>void slrComplete().catch(err=>announce(err.message,true));$("slrMarkFiveReviewed").onclick=()=>void slrMarkFiveReviewed().catch(err=>announce(err.message,true));for(const id of ["slrCameraSelect","slrPhotoSelect"])$(id).onchange=e=>{const input=e.target,file=input.files?.[0],current=input._door;input.value="";void slrSavePhoto(file,current).catch(err=>announce(err.message,true));};$("slrTestExit").onclick=()=>d.close();$("slrCloseEditor").onclick=slrCloseEditor;d.addEventListener("close",slrCloseEditor);
$("slrFileSelect").onchange=async e=>{const f=e.target.files?.[0],cat=e.target._category||picked;e.target.value="";e.target._category=null;if(!f||!cat)return;
try{if(f.size>20*1024*1024)throw Error("Max 20 MB per fil");
if(cat!=='Produktlista'&&cat!=='CE-skylt'&&!cats.includes(cat))throw Error('Ogiltig dokumentmapp.');
if(cat==='Produktlista'){
 const current=$('slrFileSelect')._door;if(!current)throw Error('Välj en dörr först.');
 const bytes=new Uint8Array(await f.arrayBuffer());await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 productFiles[current.id]={bytes,name:f.name,designation:slrDoorDesignation(current),format:'manual-ce-v6',gsCode:'',cardPage:0};
 saved(current,cat).productDirty=false;slrDirty(current,cat);if(item===current)draw();announce('Produktlista sparad endast för '+slrDoorDesignation(current)+'.');return;
}if(cat!=="CE-skylt"&&!/\.pdf$/i.test(f.name))throw Error("Välj en PDF-fil");
let bytes=new Uint8Array(await f.arrayBuffer());if(/\.pdf$/i.test(f.name)){bytes=await prepareTemplate(bytes,cat);}
// Keep each category's uploaded PDF independent. Never replace a different folder.
templates[cat]=bytes.slice();names[cat]=f.name;delete checkKeyCache[cat];delete choiceGroups[cat];if(/\.pdf$/i.test(f.name))await slrInspectChoices(cat,bytes);reviewedFolders={};slrInvalidate();bridge?.save?.();bridge?.redraw?.();draw();announce('PDF för '+cat+' har sparats separat. Övriga dokumentmallar är oförändrade.')}
catch(err){announce(err.message,true)}};
}
async function open(o,b,verification){
 if(!o)return;
 const category=slrEditingCategory;if(item?.id!==o.id){slrEditingCategory="";slrEditScope="door";openedFolders.clear();}item=o;bridge=b;verificationByDoor[o.id]=verification||{};setup();slrClearEditor();bridge?.onOpen?.(o);
 const d=$("slrFlowTestDialog");if(!d.open)d.showModal();
 $("slrTestHeading").textContent="CE · "+slrDoorDesignation(o);
 $("slrTestSource").textContent=String(o.location||"");
 announce("Öppnar CE-mallar från projekt-PDF…");
 try{
  await loadTemplates();if(item!==o)return;
  draw();slrRefreshProfilePanel();
  if(category&&templates[category])await editDoc(category);else{slrEditingCategory="";$("slrEditor").hidden=true;}
  if(item===o)announce(templateLoadWarning||"CE-dokument för "+slrDoorDesignation(o)+".",!!templateLoadWarning);
 }catch(err){if(item===o){draw();announce("Bilagor kunde inte läsas: "+err.message,true)}}
}
function slrFolderCaption(obj,cat){
 const pct=slrFolderPercent(obj,cat);
 if(pct===100)return 'Färdigkontrollerat dokument';
 if(pct===50)return 'Arbete pågår – fortsätt vid behov';
 return slrDocumentAvailable(obj,cat)?'Inte påbörjad – dokument finns':'PDF-mall saknas';
}
function slrFolderStatusText(percent){
 return percent===100?'✓ Klar':percent===50?'◷ Pågår':'Ej påbörjad';
}
function slrRefreshFolderStatuses(){
 if(!item)return;
 for(const section of $('slrTestDocRows')?.children||[]){
  const cat=section.dataset.slrCategory,pct=slrFolderPercent(item,cat),badge=section.querySelector?.('.slrFolderProgress'),caption=section.querySelector?.('summary small');
  if(badge){badge.textContent=slrFolderStatusText(pct);badge.className='slrFolderProgress '+(pct===100?'is-done':pct===50?'is-partial':'is-empty');}
  if(caption)caption.textContent=slrFolderCaption(item,cat);
  const started=section.querySelector('.ceStatusDoing'),finished=section.querySelector('.ceStatusDone');
  if(started){started.setAttribute('aria-pressed',String(pct===50));started.classList.toggle('is-active',pct===50);}
  if(finished){finished.setAttribute('aria-pressed',String(pct===100));finished.classList.toggle('is-active',pct===100);}
  const scope=section.querySelector('.ceDoorFolderScope');if(scope)scope.hidden=!slrDoorFolderCustomized(item,cat);
 }
}
function slrActionIcon(name){
 const paths={
  file:'M8 2H3v12h10V7M8 2v5h5M8 2l5 5',
  view:'M1 8s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  edit:'M3 11l-1 3 3-1 8-8-2-2-8 8M9 5l2 2',
  users:'M5.2 8a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4M1.3 13v-1.1a3.9 3.9 0 0 1 7.8 0V13M11 7.7a1.9 1.9 0 1 0 0-3.8M10.5 9.3a3.4 3.4 0 0 1 4 3.7',
  review:'M5 2h6v2H5zM5 3H3v11h10V3h-2M5 9l2 2 4-4',
  progress:'M8 2a6 6 0 1 0 0 12a6 6 0 0 0 0-12M8 5v3l2 2',
  camera:'M2 5h3l1-2h4l1 2h3v9H2V5M8 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  image:'M2 2h12v12H2V2M2 12l4-4 3 3 2-2 3 3M5 5h.01',
  download:'M8 2v8M5 7l3 3 3-3M3 11v3h10v-3',
  share:'M7 3l3-2 3 2-3 2-3-2M10 5v6M4 7h6M3 6v8h10V8',
  reset:'M3 6V2M3 6h4M3.5 6a5 5 0 1 1-.6 4',
  more:'M3 8h.1M8 8h.1M13 8h.1'
 };
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[name]||paths.file);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.45');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
function slrSetActionLabel(button,label){
 if(button.dataset.ceIcon){button.replaceChildren(slrActionIcon(button.dataset.ceIcon),elm('span',label));button.setAttribute('aria-label',label==='Stäng'?'Stäng redigering':button.dataset.ceLabel||label);}
 else button.textContent=label;
}
function draw(){
 if(!item||!$('slrTestDocRows'))return;
 const root=$('slrTestDocRows'),editor=$('slrEditor');if(editor)root.after(editor);root.replaceChildren();
 for(const [index,cat]of cats.entries()){
  const section=elm('details');section.className='slrDocSection slrFolder';section.dataset.slrCategory=cat;section.open=openedFolders.has(cat)||slrEditingCategory===cat;
  const summary=elm('summary'),icon=elm('span','▱'),label=elm('span');icon.className='slrFolderIcon';label.append(elm('strong',(index+1)+'. '+labelFor(cat)));
  label.append(elm('small',slrFolderCaption(item,cat)));const custom=elm('span','Anpassad');custom.className='ceDoorFolderScope';custom.hidden=!slrDoorFolderCustomized(item,cat);summary.append(icon,label,custom);
  const pct=slrFolderPercent(item,cat),state=elm('span',slrFolderStatusText(pct));state.className='slrFolderProgress '+(pct===100?'is-done':pct===50?'is-partial':'is-empty');summary.append(state);section.append(summary);
  section.addEventListener('toggle',()=>{if(section.open)openedFolders.add(cat);else{openedFolders.delete(cat);if(slrEditingCategory===cat)slrCloseEditor();}});
  const buttons=elm('div');buttons.className='slrFolderActions ceDocActions ceDocActionsCompact'+(['Produktlista','CE-skylt'].includes(cat)?' ceDocActionsShort':'');
  const action=(icon,label,full,fn,host=buttons)=>{const b=elm('button');b.type='button';b.dataset.ceIcon=icon;b.dataset.ceLabel=full;b.title=full;slrSetActionLabel(b,label);b.onclick=fn;host.append(b);return b;};
  if(cat==='Produktlista'){
   action('file','Mall',productFiles[item.id]?'Ersätt produktlistans PDF för denna dörr':'Lägg till produktlistans PDF för denna dörr',()=>{picked=cat;$('slrFileSelect').accept='.pdf,application/pdf';$('slrFileSelect')._door=item;$('slrFileSelect').click();});
   action('view','Visa PDF','Förhandsgranska produktlistans PDF',()=>void previewDoc(cat)).disabled=!productFiles[item.id];
   const edit=action('edit',slrEditingCategory===cat&&!editor?.hidden?'Stäng':'Fyll i','Skriv produktlista för denna dörr',()=>slrStartEditing(cat,'door'));edit.dataset.slrEdit=cat;edit.dataset.slrScope='door';
  }else if(cat==='CE-skylt'){
   const choose=camera=>{const input=$(camera?'slrCameraSelect':'slrPhotoSelect');input._door=item;input.click();};
   action('camera','Kamera','Ta bild av denna dörrs CE-skylt',()=>choose(true));action('image','Bild','Välj bild för denna dörr',()=>choose(false));
   action('view','Visa PDF','Förhandsgranska denna dörrs CE-skylt',()=>void previewDoc(cat)).disabled=!slrDocumentAvailable(item,cat);
  }else{
   action('file','Mall',templates[cat]?'Byt PDF-mall för '+labelFor(cat):'Lägg till PDF-mall för '+labelFor(cat),()=>{picked=cat;const input=$('slrFileSelect');input._category=cat;input.accept='.pdf,application/pdf';input.click();});
   action('view','Visa PDF','Förhandsgranska ifylld PDF för denna dörr',()=>void previewDoc(cat)).disabled=!templates[cat];
   const shared=action('users',slrEditingCategory===cat&&slrEditScope==='profile'&&!editor?.hidden?'Stäng':'Gemensamt','Ändra gemensam standard för alla dörrar med samma glasval',()=>slrStartEditing(cat,'profile'));shared.dataset.slrEdit=cat;shared.dataset.slrScope='profile';shared.disabled=!templates[cat]||!slrDoorProfile(item);
   const own=action('edit',slrEditingCategory===cat&&slrEditScope==='door'&&!editor?.hidden?'Stäng':'Endast denna','Anpassa dokumentet enbart för denna dörr',()=>slrStartEditing(cat,'door'));own.dataset.slrEdit=cat;own.dataset.slrScope='door';own.disabled=!templates[cat];
  }
  const checked=slrFolderPercent(item,cat)===100;
  const started=slrFolderPercent(item,cat)===50;
  const statusBar=elm('div');statusBar.className='ceFolderStatusControls';
  const doing=elm('button');doing.type='button';doing.className='ceStatusDoing';
  doing.append(slrActionIcon('progress'),elm('span','Pågår'));doing.title='Markera dokumentet som pågående';
  doing.setAttribute('aria-pressed',String(started));doing.classList.toggle('is-active',started);
  doing.onclick=()=>slrSetInProgress(item,cat);
  const finish=elm('button');finish.type='button';finish.className='ceStatusDone';
  finish.append(slrActionIcon('review'),elm('span','✓ Klar'));finish.title='Markera dokumentet som färdigkontrollerat';
  finish.setAttribute('aria-pressed',String(checked));finish.classList.toggle('is-active',checked);
  finish.disabled=!slrDocumentAvailable(item,cat);
  finish.onclick=()=>void slrToggleReviewed(item,cat);
  statusBar.append(elm('small','Status'),doing,finish);
  {
   const more=elm('details');more.className='ceDocMore';const toggle=elm('summary');toggle.append(slrActionIcon('more'));toggle.setAttribute('aria-label','Fler alternativ för '+labelFor(cat));toggle.title='Fler alternativ';more.append(toggle);
   const menu=elm('div');menu.className='ceDocMenu';
   const available=slrDocumentAvailable(item,cat);
   action('download','Spara PDF','Spara endast '+labelFor(cat)+' för denna dörr',()=>{more.open=false;void slrSaveFilledDoc(cat);},menu).disabled=!available;
   action('share','Dela dokument','Dela endast '+labelFor(cat)+' för denna dörr via mejl eller delningsmeny',()=>{more.open=false;void slrShareFilledDoc(cat);},menu).disabled=!available;
   if(cat!=='Produktlista'&&cat!=='CE-skylt'){
    action('reset','Återställ dörrens ifyllnad','Återställ denna dörrs ifyllnad i alla dokument till standarden; signatur och foto behålls',()=>{more.open=false;void slrResetCurrentDoor().catch(error=>announce(error.message,true));},menu);
   }
   more.append(menu);buttons.append(more);
  }
  section.append(buttons,statusBar);
  if(cat!=='Produktlista'&&cat!=='CE-skylt'){const note=elm('small',templates[cat]?names[cat]:'PDF saknas · välj Mall');note.className='slrFolderFile';note.title=names[cat]||'';section.append(note);}
  root.append(section);if(editor&&slrEditingCategory===cat&&!editor.hidden)section.append(editor);
 }
 const done=$('slrDoneDoor');if(done){done.textContent=completedDoors[item.id]?'✓ Klar · Återöppna':'Slutför dörr';done.classList.toggle('is-done',!!completedDoors[item.id]);}
 const bulk=$('slrMarkFiveReviewed');if(bulk){const allDone=bulkReviewCats.every(cat=>reviewedFolders[item.id]?.[cat]||completedDoors[item.id]);bulk.disabled=allDone;bulk.textContent=allDone?'✓ 5 granskade':'Markera 5 som granskade';}
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
function slrBindPreviewZoom(view){
 view.dataset.ceZoom='1';
 const old=view.parentElement.querySelector('.cePreviewZoom');old?.remove();
 const controls=elm('div');controls.className='cePreviewZoom';
 const minus=elm('button','−'),amount=elm('span','100%'),plus=elm('button','+');
 for(const [button,title] of [[minus,'Zooma ut PDF'],[plus,'Zooma in PDF']]){button.type='button';button.title=title;button.setAttribute('aria-label',title);}
 controls.append(minus,amount,plus);view.parentElement.querySelector('header').insertBefore(controls,$('slrPreviewClose'));
 let zoom=1,start=null;
 const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 const apply=(next,x,y,sheet)=>{
  next=Math.max(1,Math.min(3.5,next));
  const bounds=view.getBoundingClientRect();x??=bounds.left+view.clientWidth/2;y??=bounds.top+view.clientHeight/2;
  sheet??=Array.from(view.querySelectorAll('.slrPreviewPage')).find(p=>p.getBoundingClientRect().bottom>=y);
  const before=sheet?.getBoundingClientRect();
  const rx=before?(x-before.left)/before.width:0,ry=before?(y-before.top)/before.height:0;
  for(const node of view.querySelectorAll('.slrPreviewPage')){
   const media=node.querySelector('canvas,img');if(!media)continue;
   const w=Number(node.dataset.ceWidth),h=Number(node.dataset.ceHeight);if(!w||!h)continue;
   node.style.width=w*next+'px';node.style.height=h*next+'px';media.style.width=w*next+'px';media.style.height=h*next+'px';media.style.maxWidth='none';
  }
  zoom=next;view.dataset.ceZoom=String(zoom);amount.textContent=Math.round(zoom*100)+'%';
  minus.disabled=zoom<=1;plus.disabled=zoom>=3.5;
  if(before&&sheet){const after=sheet.getBoundingClientRect();view.scrollLeft+=after.left+after.width*rx-x;view.scrollTop+=after.top+after.height*ry-y;}
 };
 minus.onclick=()=>apply(zoom/1.25);plus.onclick=()=>apply(zoom*1.25);minus.disabled=true;
 view.ontouchstart=event=>{
  if(event.touches.length!==2)return;if(event.cancelable)event.preventDefault();
  start={distance:Math.max(20,distance(event.touches)),zoom,sheet:event.target.closest?.('.slrPreviewPage')};
 };
 view.ontouchmove=event=>{
  if(!start||event.touches.length!==2)return;if(event.cancelable)event.preventDefault();
  apply(start.zoom*distance(event.touches)/start.distance,(event.touches[0].clientX+event.touches[1].clientX)/2,(event.touches[0].clientY+event.touches[1].clientY)/2,start.sheet);
 };
 const finish=event=>{if(event.touches.length<2)start=null;};
 view.ontouchend=finish;view.ontouchcancel=finish;
 view.ceApplyZoom=apply;
}
async function previewDoc(cat){
 const current=item;if(!current)return;
 const serial=++slrPreviewSerial;
 try{
  let dialog=$('slrPdfPreviewDialog');
  if(!dialog){
   const css=elm('style');css.id='slrPreviewStyle';
   css.textContent='#slrPdfPreviewDialog{width:min(940px,97vw);height:min(94dvh,1100px);max-height:95dvh;padding:0;border:1px solid #789fb4;border-radius:12px;background:#e8f0f5;color:#16384d}#slrPdfPreviewDialog::backdrop{background:#07192bc9}#slrPdfPreviewDialog header{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#12334e;color:white;padding:12px 15px;position:sticky;top:0;z-index:2}#slrPdfPreviewDialog header button{border:1px solid #bcd0d9;border-radius:7px;padding:8px 12px;background:white;color:#12334e;font-weight:700}#slrPreviewContent{overflow:auto;max-height:calc(94dvh - 63px);height:calc(94dvh - 63px);padding:14px;box-sizing:border-box;overscroll-behavior:contain}#slrPreviewContent .slrPreviewPage{margin:0 auto 16px;width:max-content;max-width:100%;background:white;box-shadow:0 2px 10px #102b3e36}#slrPreviewContent canvas{display:block;max-width:100%;height:auto}#slrPreviewContent img{display:block;margin:auto;max-width:100%;height:auto}@media(max-width:650px){#slrPdfPreviewDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrPreviewContent{height:calc(100dvh - 64px);max-height:calc(100dvh - 64px);padding:7px}}';
   document.head.append(css);
   dialog=elm('dialog');dialog.id='slrPdfPreviewDialog';
   dialog.innerHTML='<header><strong id="slrPreviewTitle">Visa PDF</strong><button id="slrPreviewClose" type="button">Stäng ×</button></header><main id="slrPreviewContent"></main>';
   document.body.append(dialog);
   $('slrPreviewClose').onclick=()=>dialog.close();const save=elm('button','Spara fil');save.type='button';save.id='cePreviewSave';save.onclick=()=>void slrSaveFilledDoc(dialog._ceSaveSource.cat,dialog._ceSaveSource.current);dialog.querySelector('header').insertBefore(save,$('slrPreviewClose'));
   dialog.addEventListener('close',()=>{slrPreviewSerial++;const oldUrl=dialog.dataset.previewUrl;if(oldUrl){URL.revokeObjectURL(oldUrl);delete dialog.dataset.previewUrl}});
  }
  if(dialog.dataset.previewUrl){URL.revokeObjectURL(dialog.dataset.previewUrl);delete dialog.dataset.previewUrl}
  dialog._ceSaveSource={cat,current};const title=$('slrPreviewTitle'),body=$('slrPreviewContent');
  title.textContent=labelFor(cat)+' · '+slrDoorDesignation(current);
  body.replaceChildren();body.scrollTop=0;body.scrollLeft=0;
  if(!dialog.open)dialog.showModal();
  const loading=elm('p','Förbereder PDF…');loading.className='cePreviewStatus';loading.setAttribute('role','status');body.append(loading);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(serial!==slrPreviewSerial||item!==current||!dialog.open)return;
  const bytes=await compose(cat,current);
  if(serial!==slrPreviewSerial||item!==current||!dialog.open)return;
  const photo=cat==='CE-skylt'?doorPhotos[current.id]:null;
  const img=!!photo||cat==='CE-skylt'&&/\.(png|jpe?g)$/i.test(names[cat]||'');
  if(img){
   const mime=photo?.type||(/\.png$/i.test(names[cat]||'')?'image/png':'image/jpeg');
   const url=URL.createObjectURL(new Blob([bytes],{type:mime}));dialog.dataset.previewUrl=url;
   loading.remove();const picture=elm('img');picture.src=url;picture.alt='CE-skylt · '+slrDoorDesignation(current);const sheet=elm('div');sheet.className='slrPreviewPage';sheet.append(picture);body.append(sheet);picture.onload=()=>{if(serial!==slrPreviewSerial)return;const w=Math.min(picture.naturalWidth,Math.max(240,body.clientWidth-30));sheet.dataset.ceWidth=String(w);sheet.dataset.ceHeight=String(w*picture.naturalHeight/picture.naturalWidth);body.ceApplyZoom(1);};slrBindPreviewZoom(body);return;
  }
  if(!window.pdfjsLib?.getDocument)throw Error('PDF-visaren kunde inte laddas.');
  const task=window.pdfjsLib.getDocument({data:bytes.slice(),disableAutoFetch:true}),documentPdf=await task.promise;
  loading.textContent='Visar 0 av '+documentPdf.numPages+' sidor…';
  try{
   for(let n=1;n<=documentPdf.numPages;n++){
    if(serial!==slrPreviewSerial||!dialog.open)return;
    const page=await documentPdf.getPage(n),initial=page.getViewport({scale:1});
    const available=Math.min(780,Math.max(240,body.clientWidth-30));
    const view=page.getViewport({scale:Math.min(2,available/initial.width)}),dpr=Math.min(window.devicePixelRatio||1,1.5);
    const sheet=elm('div');sheet.className='slrPreviewPage';
    const canvas=elm('canvas');canvas.width=Math.ceil(view.width*dpr);canvas.height=Math.ceil(view.height*dpr);
    canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';sheet.dataset.ceWidth=String(view.width);sheet.dataset.ceHeight=String(view.height);sheet.append(canvas);body.append(sheet);
    await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:view,transform:[dpr,0,0,dpr,0,0],annotationMode:window.pdfjsLib.AnnotationMode?.DISABLE??0}).promise;
    loading.textContent='Visar '+n+' av '+documentPdf.numPages+' sidor…';
   }
  loading.remove();slrBindPreviewZoom(body);
  }finally{await documentPdf.destroy()}
 }catch(err){const body=$('slrPreviewContent');if(body&&serial===slrPreviewSerial){const message=body.querySelector('.cePreviewStatus');if(message){message.textContent='Kunde inte visa dokumentet: '+err.message;message.classList.add('is-error');}else body.append(elm('p','Kunde inte visa dokumentet: '+err.message));}announce('Kunde inte visa dokumentet: '+err.message,true)}
}
async function editDocBasic(cat){
const current=item;if(!current)return;slrMountEditor(cat);const revision=++slrEditorRevision;
$("slrFields").className="";$("slrFields").replaceChildren();$("slrEditHeading").textContent=cat+" · "+(slrEditScope==="profile"?"Ändra standard":"Endast "+slrDoorDesignation(current));
const p=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
if(item!==current||slrEditorRevision!==revision)return;
const fields=p.getForm().getFields(),values=slrEditingFields(current,cat),defaults=auto(current),id=current.id;
for(const f of fields){const name=f.getName(),k=kind(f);if(!k)continue;const l=elm("label",name);let input;
if(k==="text"){input=elm("input");slrConfigureTextInput(input,name,slrFieldValue(current,name,values,defaults,cat));if(slrIdentityFields.has(name))input.readOnly=true;}
else if(k==="check"){input=elm("input");input.type="checkbox";input.checked=values[name]===true;}
else{input=elm("select");const empty=elm("option","Ej valt");empty.value="";input.append(empty);for(const opt of f.getOptions()){const option=elm("option",opt);option.value=opt;input.append(option)}input.value=values[name]||"";}
input.addEventListener("change",()=>{if(item!==current)return;const v=k==="check"?input.checked:input.value;
slrWriteField(current,cat,name,v);announce((slrEditScope==="profile"?"Standarden":"Dörrautomatiken")+" har ändrats. Spara projekt-PDF för att flytta arbetet.")});
l.append(input);$("slrFields").append(l)}
$("slrEditHeading").scrollIntoView({block:"start",behavior:"smooth"});
}

/* TEST: SLR form follows the original PDF across five scrollable pages. */
let slrEditorRevision=0;
function slrDirty(obj,cat){if(reviewedFolders[obj?.id])delete reviewedFolders[obj.id][cat];slrInvalidate(obj);if(item?.id===obj?.id&&$("slrDoneDoor")){$("slrDoneDoor").textContent="Slutför dörr";$("slrDoneDoor").classList.remove("is-done");}if(!obj.slrDocuments)obj.slrDocuments={};obj.slrDocuments[cat]={...(obj.slrDocuments[cat]||{}),status:"doing"};bridge?.save?.();bridge?.redraw?.();slrRefreshFolderStatuses();}

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

function slrChoiceId(v){return slrDecode(v).normalize('NFC').toLowerCase().replace(/[\s_\-\u00a0]+/g,'');}
function slrWidgetsByPage(pdf){
 const pages=pdf.getPages(),groups=pages.map(()=>[]);
 for(const field of pdf.getForm().getFields()){
  const type=kind(field);if(type!=='radio'&&type!=='check')continue;
  for(const widget of field.acroField.getWidgets()){
   const index=pages.findIndex(page=>(page.node.Annots?.()?.asArray?.()||[]).some(ref=>pdf.context.lookup(ref)===widget.dict));
   if(index<0)continue;
   const value=widget.getOnValue?.(),rect=widget.getRectangle();
   groups[index].push({name:field.getName(),type,rect,value:value?slrDecode(value.decodeText?.()||value.asString?.()||String(value).replace(/^\//,'')):''});
  }
 }
 return groups;
}
function slrFindWidget(widgets,name,rect){
 const x=Math.min(rect[0],rect[2]),y=Math.min(rect[1],rect[3]);let found=null,distance=Infinity;
 for(const w of widgets){
  if(w.name!==name)continue;
  const r=w.rect,d=Math.abs(r.x-x)+Math.abs(r.y-y)+Math.abs(r.width-Math.abs(rect[2]-rect[0]))+Math.abs(r.height-Math.abs(rect[3]-rect[1]));
  if(d<distance){distance=d;found=w;}
 }
 return distance<12?found:null;
}
function slrPaintPageMarks(page){
 // The visible squares are DOM elements; no canvas redraw is needed.
}
function slrDrawChoice(button,checked){
 button.classList.toggle('is-chosen',!!checked);
 button.setAttribute('aria-pressed',String(!!checked));
 const box=button._slrMark,size=box?Math.max(4,Math.min(box.width,box.height)):12;
 const square=elm('span');square.className='slrMarkVisible';
 square.style.width=size+'px';square.style.height=size+'px';
 square.setAttribute('aria-hidden','true');button.replaceChildren(square);
}
function slrShowChoice(text,selected,pageNumber){
 const n=$("slrChoiceFeedback");if(n)n.textContent=(selected?"Markerat: ":"Avmarkerat: ")+text+" · sida "+pageNumber;
}
function slrStyles(){if($("slrOriginalStyle"))return;const elStyle=elm("style");elStyle.id="slrOriginalStyle";
elStyle.textContent="#slrFlowTestDialog #slrFields.slrOriginalPages{display:flex;flex-direction:column;gap:14px;align-items:center;margin:10px 0 24px}.slrOriginalPage{position:relative;flex-shrink:0;background:#fff;border:1px solid #b7cbd5;box-shadow:0 3px 9px #153b5233;overflow:hidden}.slrOriginalPage canvas{display:block}.slrOverlayText{position:absolute;z-index:3;box-sizing:border-box;display:block;min-width:0!important;min-height:0!important;margin:0!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#000!important;font-family:Arial,Helvetica,sans-serif!important;font-weight:400!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;resize:none}.slrOverlayChoice{appearance:auto!important;-webkit-appearance:auto!important;cursor:pointer}.slrOverlayDate{cursor:pointer!important;color-scheme:light}.slrOverlayDate::-webkit-calendar-picker-indicator{margin:0;padding:0;width:1em;height:1em;cursor:pointer}.slrOverlayText:focus{outline:1px solid #0b87c0!important;outline-offset:0!important;background:#ffffffef!important;z-index:6}.slrOverlayTick{position:absolute;z-index:4;box-sizing:border-box;min-width:0!important;min-height:0!important;display:grid;place-items:center;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#000!important;font-family:Arial,sans-serif;font-weight:700;cursor:pointer;line-height:1!important;touch-action:manipulation;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important}.slrOverlayTick.is-chosen{border:0!important;background:transparent!important;color:#000!important;box-shadow:none!important;font-weight:900!important}.slrOverlayTick:focus-visible{outline:2px solid #0277aa!important;outline-offset:2px}.slrChoiceInfo{position:sticky;top:0;z-index:12;box-sizing:border-box;width:100%;padding:9px;color:#174867;background:#e4f5ff;border:1px solid #69b2d4;border-radius:7px;font-size:12px;font-weight:750;line-height:1.4}.slrZoomOptions{width:100%;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.slrZoomOptions button{margin:0!important;min-height:32px!important;padding:6px 11px!important}.slrZoomOptions button[aria-pressed=true]{border:2px solid #0075aa!important;background:#def3ff!important}.slrOriginalPages.slrZoomWide{align-items:flex-start!important}.slrSignatureOnPdf{min-height:0!important;min-width:0!important;position:absolute;z-index:5;margin:0!important;padding:1px!important;border:1px dashed #83a9bf!important;border-radius:2px!important;background:#eaf5f9aa!important;font-size:10px!important;overflow:hidden;color:#163e55!important}.slrSignatureDlg{width:min(760px,95vw);border:1px solid #88a8ba;border-radius:10px;background:#f8fbff;padding:14px}.slrSignatureDlg::backdrop{background:#06192dbb}.slrSignatureDlg canvas{width:100%;height:175px;touch-action:none;background:white;border:1px solid #92afc0;display:block;margin:12px 0}.slrSignatureDlg button{padding:8px;margin:4px;border:1px solid #8badbe;border-radius:6px}.slrPdfTip{font-size:12px;line-height:1.5;width:100%;border:1px solid #b7d2df;border-radius:7px;padding:9px;background:#e7f2f8;box-sizing:border-box}@media(max-width:650px){#slrFlowTestDialog main{padding:8px}#slrFlowTestDialog #slrFields.slrOriginalPages{gap:9px}.slrSignatureDlg canvas{height:150px}}";
elStyle.textContent+="#slrFlowTestDialog .slrOverlayTick{background:transparent!important;border:0!important;overflow:visible!important}#slrFlowTestDialog .slrMarkVisible{display:block;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);box-sizing:border-box;border:1px solid #273744;background:#fff;pointer-events:none;border-radius:0;box-shadow:none}#slrFlowTestDialog .slrMarkVisible::before,#slrFlowTestDialog .slrMarkVisible::after{content:'';position:absolute;display:none;left:13%;top:47%;width:74%;height:1.8px;background:#111;transform-origin:center;pointer-events:none}#slrFlowTestDialog .slrOverlayTick.is-chosen .slrMarkVisible::before{display:block;transform:rotate(45deg)}#slrFlowTestDialog .slrOverlayTick.is-chosen .slrMarkVisible::after{display:block;transform:rotate(-45deg)}";
elStyle.textContent+="#slrFlowTestDialog .slrOriginalPage{cursor:grab}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage{cursor:grabbing}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage canvas{cursor:grabbing}#slrFlowTestDialog .slrOverlayText{cursor:text}#slrFlowTestDialog .slrOverlayTick{cursor:pointer}#slrFlowTestDialog .slrZoomAmount{font-size:12px;font-weight:800;min-width:40px;text-align:center}#slrFlowTestDialog .slrZoomOptions small{font-size:11px;color:#4b6878;line-height:1.4}";document.head.append(elStyle);}
function slrRenderSignPreview(button,signature){
 const imageRef=slrSignatureImage(signature),date=imageRef&&slrSignatureImage(projectSignature)?slrSignatureDateInfo():null;
 button.replaceChildren();button.classList.toggle('ceMissingSignature',!imageRef);
 if(!imageRef){button.textContent='✍ Signera';return;}
 button.style.display='flex';button.style.flexDirection='column';button.style.alignItems='center';button.style.justifyContent='center';button.style.textAlign='center';button.style.fontWeight='400';
 const image=elm('img');image.src=imageRef;image.style.cssText='width:100%;height:'+(date?.display?'72%':'100%')+';object-fit:contain;object-position:center center;min-height:0;filter:brightness(0) saturate(100%) invert(58%) sepia(36%) saturate(805%) hue-rotate(158deg) brightness(95%) contrast(88%)';button.append(image);
 if(date?.display){
  const label=elm('span',date.display);
  const family=date.style==='typewriter'?'monospace':date.style==='regular'?'Arial,Helvetica,sans-serif':date.style==='handwriting'?'"Apple Chancery","Segoe Script","Brush Script MT",cursive':'Georgia,serif';
  label.style.cssText='font-family:'+family+';font-style:'+(['italic','handwriting'].includes(date.style)?'italic':'normal')+';font-size:clamp(7px,1.45vw,11px);font-weight:400;white-space:nowrap;color:#529ac6;margin:0 auto;max-width:100%;overflow:hidden;text-overflow:clip;flex:none;text-align:center';
  button.append(label);
 }
}
 
// All form pages still use this callback name. The presentation helper was
// renamed in TEST 30; restore its public bridge for every signature widget.
function slrRefreshSignatureButton(button,signature){
 slrRenderSignPreview(button,signature);
}

function slrApplySignature(obj,cat,button,imageRef,key,placement){
 if(cat!=='Egenkontroll'&&cat!=='Loggbok')doorSignatures[obj.id]=imageRef;delete reviewedFolders[obj.id];
 if(key){const entry=saved(obj,cat);if(!entry.signatures)entry.signatures={};entry.signatures[key]={image:imageRef,page:placement.page,rect:placement.rect.slice()};}else saved(obj,cat).signature=imageRef;
 slrDirty(obj,cat);slrRenderSignPreview(button,imageRef);
 announce("Projektets signatur används på detta dokument för "+slrDoorDesignation(obj)+".");
}
function slrOpenSign(obj,cat,button,key=null,placement=null,forcePicker=false){
 if(slrSignatureImage(projectSignature)){announce('Underskriften hämtas från Projektuppgifter → Projektunderskrift. Ändra den där.');return;}
 const existing=slrSignatureFor(obj,cat,key),last=Object.keys(signatureLibrary).at(-1);
 if(!forcePicker&&cat!=='Egenkontroll'&&!existing&&last){slrApplySignature(obj,cat,button,'@sig:'+last,key,placement);return;}
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

const slrSensorKeys=new Set(['4.6.1','4.6.2','10.5.3','10.5.5']);
const slrSensorPresets=['FlatScan','FlatScan 3D','4SAFE'];
let slrSensorMenuCleanup=null;
const slrSensorCategory=key=>key.startsWith('10.')?'Egenkontroll':'Riskanalys';
function slrSensorField(obj,key,coverage){
 if(key.startsWith('4.'))return key+' text 1';
 const chosen=coverage||slrDecode(slrEditingFields(obj,'Egenkontroll')[key+' Val 2 underliggande val']);
 return key+' text '+(chosen==='Val 2.2'?'4':'3');
}
function slrRefreshSensorShortcuts(obj){
 if(item!==obj)return;
 for(const button of document.querySelectorAll('[data-ce-sensor-key]')){const key=button.dataset.ceSensorKey,values=slrEditingFields(obj,slrSensorCategory(key));button.textContent=key+' · '+(values[slrSensorField(obj,key)]||'Välj sensor');}
}
function slrApplySensor(obj,key,value,scope=slrEditScope,coverage){
 if(item!==obj||scope!==slrEditScope||!slrSensorKeys.has(key))return false;
 const cat=slrSensorCategory(key);
 if(cat==='Egenkontroll'){
  coverage=coverage||slrDecode(slrEditingFields(obj,cat)[key+' Val 2 underliggande val']);
  if(!['Val 2.1','Val 2.2'].includes(coverage))return false;
  const field=key+' Val 2 underliggande val';slrWriteField(obj,cat,field,coverage);
  for(const tick of document.querySelectorAll('.slrOverlayTick'))if(tick.dataset.field===field)slrDrawChoice(tick,slrDecode(tick.dataset.value)===coverage);
 }
 const field=slrSensorField(obj,key,coverage);slrWriteField(obj,cat,field,String(value));
 for(const input of document.querySelectorAll('[data-ce-sensor-field]'))if(input.dataset.ceSensorField===field)input.value=String(value);
 slrRefreshSensorShortcuts(obj);return true;
}
function slrSensorMenuPlacement(rect,viewport,width,contentHeight){
 const margin=8,menuWidth=Math.max(180,Math.min(width,viewport.right-viewport.left-margin*2));
 const x=Math.max(viewport.left+margin,Math.min(rect.left,viewport.right-menuWidth-margin));
 const below=Math.max(0,viewport.bottom-rect.bottom-5),above=Math.max(0,rect.top-viewport.top-5);
 const up=below<145&&above>below;
 const space=Math.max(80,up?above:below),height=Math.min(285,space);
 const top=up?Math.max(viewport.top+margin,rect.top-4-Math.min(contentHeight,height)):rect.bottom+4;
 return {left:x,top,width:menuWidth,maxHeight:height,up};
}
function slrInlineSensorPanel(anchor,title,description,currentValue,apply,coverageNeeded=false,coverageValue=''){
 const prior=document.querySelector('.ceSensorInlinePanel');
 if(prior&&prior._ceAnchor===anchor){slrSensorMenuCleanup?.();return;}
 slrSensorMenuCleanup?.();
 if(!anchor?.isConnected)return;
 // For an embedded PDF arrow, align the dropdown to the input itself, NOT
 // to the arrow on the right. This also works after zoom or horizontal pan.
 const inputAnchor=anchor.classList?.contains('slrSensorAtField')&&anchor.previousElementSibling?.classList?.contains('slrOverlayText')?anchor.previousElementSibling:anchor;
 const panel=elm('section');panel.className='ceSensorInlinePanel';panel._ceAnchor=anchor;
 panel.setAttribute('aria-label',title);panel.setAttribute('role','group');
 panel.style.cssText='position:fixed;z-index:99999;width:248px;max-width:calc(100vw - 16px);box-sizing:border-box;background:#fff;color:#172c3a;border:1px solid #8fa5b4;border-radius:8px;padding:5px;box-shadow:0 5px 18px #122d4240;display:flex;flex-direction:column;gap:3px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;';
 const heading=elm('strong','Typ av sensor');heading.style.cssText='display:block;padding:5px 9px;color:#344d5d;font-size:12px';panel.append(heading);
 let coverage=null;
 if(coverageNeeded){
  const label=elm('label','Täckning');label.style.cssText='display:grid;gap:3px;font-size:12px;padding:2px 8px';
  coverage=elm('select');coverage.style.cssText='width:100%;min-height:38px;border:1px solid #a2b2bc;border-radius:5px;background:white;color:#172c3a;font-size:16px';
  for(const [value,caption] of [['','Välj täckning'],['Val 2.1','Heltäckande'],['Val 2.2','Deltäckande']]){
   const option=elm('option',caption);option.value=value;coverage.append(option);
  }
  coverage.value=coverageValue;label.append(coverage);panel.append(label);
 }
 const hint=elm('small','Välj täckning först');hint.style.cssText='display:none;color:#a32827;padding:3px 9px';panel.append(hint);
 let close=()=>{};
 const choose=value=>{if(coverage&&!coverage.value){hint.style.display='block';coverage.focus();return;}if(apply(value,coverage?.value)!==false)close();};
 const optionStyle='display:block;width:100%;min-height:44px!important;text-align:left!important;border:0!important;background:#fff;color:#172c3a!important;border-radius:5px!important;margin:0!important;padding:9px 12px!important;font:500 14px Arial,Helvetica,sans-serif!important;cursor:pointer;flex:none';
 for(const value of slrSensorPresets){
  const choice=elm('button',value);choice.type='button';choice.className='ceSensorDropOption';
  choice.style.cssText=optionStyle;
  if(value===currentValue){choice.style.background='#e7f3fa';choice.setAttribute('aria-current','true');}
  choice.onclick=()=>choose(value);panel.append(choice);
 }
 const custom=elm('button','Egen text');custom.type='button';custom.className='ceSensorDropOption';
 custom.style.cssText=optionStyle+';border-top:1px solid #d7e1e7!important';panel.append(custom);
 const form=elm('form');form.hidden=true;form.style.cssText='display:none;flex-direction:column;gap:6px;padding:5px 6px;flex:none';
 const input=elm('input');input.type='text';input.maxLength=130;input.autocomplete='off';input.placeholder='Skriv sensortyp';input.setAttribute('aria-label','Egen sensortext');
 input.value=slrSensorPresets.includes(currentValue)?'':currentValue||'';
 input.style.cssText='width:100%!important;min-width:0;min-height:40px;box-sizing:border-box;margin:0!important;padding:8px!important;border:1px solid #9eb1bc;border-radius:5px;background:white;color:#172c3a;font-size:16px!important';
 const save=elm('button','Använd');save.type='submit';
 save.style.cssText='min-height:40px!important;margin:0!important;border:0!important;border-radius:5px!important;background:#175c82!important;color:#fff!important;font-size:14px!important;font-weight:700;cursor:pointer';
 form.append(input,save);panel.append(form);
 // A parent dialog is in the browser top-layer: attaching to body would hide the menu.
 const dialog=$('slrFlowTestDialog');(dialog?.open?dialog:document.body).append(panel);
 const place=()=>{
  if(!anchor.isConnected||!inputAnchor.isConnected){close();return;}
  const anchorRect=anchor.getBoundingClientRect(),fieldRect=inputAnchor.getBoundingClientRect();
  const vp=window.visualViewport;
  const left=vp?.offsetLeft||0,top=vp?.offsetTop||0,w=vp?.width||window.innerWidth,h=vp?.height||window.innerHeight;
  const ref={left:Math.min(fieldRect.left,anchorRect.left),top:anchorRect.top,bottom:anchorRect.bottom};
  const layout=slrSensorMenuPlacement(ref,{left,top,right:left+w,bottom:top+h},248,panel.scrollHeight||270);
  panel.style.left=layout.left+'px';panel.style.top=layout.top+'px';panel.style.width=layout.width+'px';
  panel.style.maxHeight=layout.maxHeight+'px';panel.style.transformOrigin=layout.up?'bottom left':'top left';
 };
 const outside=event=>{if(!panel.contains(event.target)&&!anchor.contains(event.target)&&!inputAnchor.contains(event.target))close();};
 const escape=event=>{if(event.key==='Escape'){event.stopPropagation();close();anchor.focus?.();}};
 const scroll=event=>{if(!panel.contains(event.target))close();};
 close=()=>{
  document.removeEventListener('pointerdown',outside,true);
  document.removeEventListener('keydown',escape,true);
  document.removeEventListener('scroll',scroll,true);
  window.removeEventListener('resize',place);
  window.visualViewport?.removeEventListener('resize',place);
  window.visualViewport?.removeEventListener('scroll',place);
  panel.remove();if(slrSensorMenuCleanup===close)slrSensorMenuCleanup=null;
 };
 slrSensorMenuCleanup=close;
 custom.onclick=()=>{form.hidden=false;form.style.display='flex';place();input.focus();};
 form.onsubmit=event=>{event.preventDefault();const value=input.value.trim();if(value)choose(value);else input.focus();};
 document.addEventListener('pointerdown',outside,true);
 document.addEventListener('keydown',escape,true);
 document.addEventListener('scroll',scroll,true);
 window.addEventListener('resize',place);
 window.visualViewport?.addEventListener('resize',place);
 window.visualViewport?.addEventListener('scroll',place);
 place();
}
function slrPickSensor(obj,key,after,anchor){
 if(item!==obj||!slrSensorKeys.has(key))return;
 const cat=slrSensorCategory(key),scope=slrEditScope;
 const values=slrEditingFields(obj,cat),coverageValue=slrDecode(values[key+' Val 2 underliggande val'])||'';
 slrInlineSensorPanel(anchor,key+' · Sensortyp',scope==='profile'?'Gemensam standard för dörrtypen':'Gäller bara denna dörr',String(values[slrSensorField(obj,key)]||''),(value,coverage)=>{
  if(slrEditingCategory!==cat||item!==obj||slrEditScope!==scope)return false;
  const ok=slrApplySensor(obj,key,value,scope,coverage);if(ok&&after)Promise.resolve().then(after);return ok;
 },cat==='Egenkontroll',coverageValue);
}
function slrAddSensorShortcut(host,workspace,obj,field){
 const key=field.replace(/ text [134]$/,'');if(!slrSensorKeys.has(key))return;
 let row=host.querySelector('.ceSensorShortcuts');if(!row){row=elm('div');row.className='ceSensorShortcuts';host.insertBefore(row,workspace);}
 if(Array.from(row.children).some(button=>button.dataset.ceSensorKey===key))return;
 const button=elm('button');button.type='button';button.dataset.ceSensorKey=key;button.title=key+' · Välj eller skriv sensortyp';button.onclick=()=>slrPickSensor(obj,key,null,button);row.append(button);slrRefreshSensorShortcuts(obj);
}
function slrClearPointSignature(obj,name){
 const point=String(name).match(/^(10\.5\.\d+)$/)?.[1];if(!point)return;
 const key=point+' Signatur',entry=answers[obj.id]?.Egenkontroll;if(entry?.signatures)delete entry.signatures[key];
 if(item===obj)for(const button of document.querySelectorAll('.slrSignatureOnPdf'))if(button.dataset.slrSignatureKey===key){button.textContent='✍ Signatur saknas';button.classList.add('ceMissingSignature');}
}
function slrMissingPointSignatures(obj){
 return Object.entries(slrEffectiveFields(obj,'Egenkontroll')).filter(([key,value])=>/^10\.5\.\d+$/.test(key)&&value!==false&&value!==''&&value!==null&&value!==undefined&&!slrSignatureImage(slrSignatureFor(obj,'Egenkontroll',key+' Signatur'))).map(([key])=>key);
}
function slrRequirePointSignatures(obj){const missing=slrMissingPointSignatures(obj);if(missing.length)throw Error('Signatur saknas vid '+missing.join(', ')+'. Öppna Egenkontroll och signera punkterna.');}
function slrPromptPointSignature(obj,point,page){
 if(item!==obj||slrEditingCategory!=='Egenkontroll'||slrSignatureImage(slrSignatureFor(obj,'Egenkontroll',point+' Signatur')))return;
 const button=Array.from(page.querySelectorAll('.slrSignatureOnPdf')).find(b=>b.dataset.slrSignatureKey===point+' Signatur');
 if(button)slrOpenSign(obj,'Egenkontroll',button,point+' Signatur',button._slrSignPlacement,true);
}
function slrHandleEgenChoice(obj,key,index,page){
 if(!/^10\.5\.\d+$/.test(key))return;
 if(slrSignatureImage(projectSignature)){
  const button=Array.from(page.querySelectorAll('.slrSignatureOnPdf')).find(b=>b.dataset.slrSignatureKey===key+' Signatur');
  if(button)slrRefreshSignatureButton(button,slrSignatureFor(obj,'Egenkontroll',key+' Signatur'));
  return;
 }
 slrPromptPointSignature(obj,key,page);
}
function slrPickSensorField(obj,cat,field,anchor){
 if(item!==obj)return;
 const scope=slrEditScope,point=field.split(' ')[0];
 slrInlineSensorPanel(anchor,point+' · Sensortyp',scope==='profile'?'Gemensam standard':'Endast denna dörr',String(slrEditingFields(obj,cat)[field]||''),value=>{
  if(item!==obj||scope!==slrEditScope||cat!==slrEditingCategory)return false;
  slrWriteField(obj,cat,field,value);
  for(const control of document.querySelectorAll('[data-ce-sensor-field]'))if(control.dataset.ceSensorField===field)control.value=value;
  return true;
 });
}
function slrSensorTypeField(cat,name){return cat==='Riskanalys'&&(/^4\.6\.[12] text [123]$/.test(name)||name==='4.6.3 text 1')||cat==='Egenkontroll'&&/^10\.5\.[35] text [34]$/.test(name);}
function slrPlacePdfInput(ctrl,left,top,width,height,fontSize,multiline=false,padding=0){
 const scale=Math.min(1,fontSize/16);
 ctrl.style.cssText="left:"+left+"px;top:"+top+"px;width:"+(width/scale)+"px;height:"+(height/scale)+"px;font-size:"+(fontSize/scale)+"px;line-height:"+(multiline?"1.2":(height/scale)+"px")+";padding:0 "+(padding/scale)+"px!important;transform:scale("+scale+");transform-origin:0 0";
}
function slrZoomTo(cat,newZoom,sourcePage,focusY,focusX){
 const main=$("slrPdfWorkspace");
 if(!main)return;
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
  if(event.cancelable)event.preventDefault();
  start={distance:Math.max(20,distance(event.touches)),zoom:slrPageZoom};
  focus=(event.touches[0].clientY+event.touches[1].clientY)/2;
  focusX=(event.touches[0].clientX+event.touches[1].clientX)/2;
  const rect=page.getBoundingClientRect();
  page.style.transformOrigin=(Math.max(0,Math.min(100,100*(focusX-rect.left)/rect.width)))+"% "+(Math.max(0,Math.min(100,100*(focus-rect.top)/rect.height)))+"%";
  scale=1;
 },{passive:false});
 page.addEventListener("touchmove",event=>{
  if(!start||event.touches.length!==2)return;
  if(event.cancelable)event.preventDefault();
  focus=(event.touches[0].clientY+event.touches[1].clientY)/2;
  focusX=(event.touches[0].clientX+event.touches[1].clientX)/2;
  const requestedZoom=Math.max(1,Math.min(3.5,start.zoom*distance(event.touches)/start.distance));
  scale=requestedZoom/start.zoom;
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
 const main=host;
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
 if(cat==="Produktlista")return slrEditProducts();
 const current=item;if(!current||!templates[cat])return;slrMountEditor(cat);
 const revision=++slrEditorRevision;slrStyles();const host=$("slrFields");host.replaceChildren();host.className="slrOriginalPages";
 $("slrEditHeading").textContent=labelFor(cat)+" · "+(slrEditScope==="profile"?"Ändra standard":"Endast "+slrDoorDesignation(current));
 const controls=elm("div");controls.className="slrZoomOptions";controls.append(elm("strong","Zooma PDF:"));
 const minus=elm("button","−");minus.type="button";minus.title="Zooma ut";minus.onclick=()=>slrZoomTo(cat,slrPageZoom/1.25);controls.append(minus);
 const amount=elm("span",Math.round(slrPageZoom*100)+"%");amount.className="slrZoomAmount";controls.append(amount);
 const plus=elm("button","+");plus.type="button";plus.title="Zooma in";plus.onclick=()=>slrZoomTo(cat,slrPageZoom*1.25);controls.append(plus);
 const guide=elm("small","Två fingrar för zoom på mobilen · + och − på datorn");controls.append(guide);host.append(controls);
 const workspace=elm("div");workspace.id="slrPdfWorkspace";workspace.className="slrPdfWorkspace";workspace.classList.toggle("slrZoomWide",slrPageZoom>1);workspace.setAttribute("aria-label","PDF-arbetsyta");host.append(workspace);slrEnableNavigation(workspace,cat);
 const storedValues=slrEditingFields(current,cat),defaultValues=auto(current);
 let document=null;
 try{
  const formPdf=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
  const widgetPages=slrWidgetsByPage(formPdf);
  document=await pdfjsLib.getDocument({data:templates[cat].slice(),enableXfa:false}).promise;
  // Cross-check PDF.js page count against PDF-lib to catch incomplete
  // cross-reference rendering in some imports.
  const formPageCount=formPdf.getPageCount();
  if(document.numPages<formPageCount){
   await document.destroy();
   const normalized=new Uint8Array(await formPdf.save({useObjectStreams:false}));
   document=await pdfjsLib.getDocument({data:normalized,enableXfa:false}).promise;
  }
  const pageCount=document.numPages;
  const sourceName=names[cat]||labelFor(cat)+'.pdf';
  const source=elm('p','PDF: '+sourceName+' · '+pageCount+' '+(pageCount===1?'sida':'sidor'));
  source.className='slrPageSource';
  host.insertBefore(source,workspace);
  const nav=elm('div');nav.className='slrPageNav';
  const previous=elm('button','‹ Föregående');previous.type='button';
  const next=elm('button','Nästa ›');next.type='button';
  const indicator=elm('strong','Sida 1 av '+pageCount);
  let selectedPage=0;
  const update=()=>{previous.disabled=selectedPage===0;next.disabled=selectedPage===pageCount-1;indicator.textContent='Sida '+(selectedPage+1)+' av '+pageCount;};
  const jump=delta=>{
   selectedPage=Math.max(0,Math.min(pageCount-1,selectedPage+delta));update();
   const target=workspace.querySelector('.slrOriginalPage[data-slr-page-index="'+selectedPage+'"]');
   if(target)workspace.scrollTo({top:Math.max(0,target.offsetTop-4),behavior:'smooth'});
  };
  previous.onclick=()=>jump(-1);next.onclick=()=>jump(1);nav.append(previous,indicator,next);host.insertBefore(nav,workspace);update();
  if(cat==='Egenkontroll'&&pageCount===1){
   const note=elm('div');note.className='slrPageWarning';
   note.append(elm('p','Den valda PDF-mallen "'+sourceName+'" innehåller bara 1 sida. Appen kan inte visa sidor som inte finns i filen. Välj den fullständiga Egenkontroll Svängdörr-mallen (5 sidor) om det är den du vill använda.'));
   const replace=elm('button','Välj fullständig PDF');replace.type='button';
   replace.onclick=()=>{
    const input=$('slrFileSelect');input._category=cat;input.accept='.pdf,application/pdf';input.click();
   };
   note.append(replace);host.insertBefore(note,workspace);
  }
  for(let pi=0;pi<pageCount;pi++){
   if(item!==current||slrEditorRevision!==revision)return;
   try{
   const p=await document.getPage(pi+1),v0=p.getViewport({scale:1});
   const width=Math.min(685,Math.max(245,window.innerWidth-44),Math.max(245,workspace.clientWidth-8));
   const factor=width/v0.width*slrPageZoom,vp=p.getViewport({scale:factor});
   const page=elm("div");page.className="slrOriginalPage";page.dataset.slrPageIndex=String(pi);page.style.cssText="width:"+vp.width+"px;height:"+vp.height+"px";
   const canvas=elm("canvas");const dpr=Math.min(window.devicePixelRatio||1,1.5);
   canvas.width=Math.round(vp.width*dpr);canvas.height=Math.round(vp.height*dpr);
   canvas.style.cssText="width:"+vp.width+"px;height:"+vp.height+"px";page.append(canvas);workspace.append(page);slrEnablePinch(page,cat);
   await p.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport:vp,transform:[dpr,0,0,dpr,0,0],annotationMode:window.pdfjsLib.AnnotationMode?.DISABLE??0}).promise;
   // Visible checkbox outlines attach directly to click targets.
   const annotations=await p.getAnnotations({intent:"display"}),radioCounters={};
   for(const an of annotations){
    if(an.subtype!=="Widget"||!an.rect||!an.fieldName)continue;
    if(cat==='Loggbok'&&/^6\.5\./.test(an.fieldName))continue;
    const name=an.fieldName,r=vp.convertToViewportRectangle(an.rect);
    const left=Math.min(r[0],r[2]),top=Math.min(r[1],r[3]),w=Math.abs(r[2]-r[0]),h=Math.abs(r[3]-r[1]);
    if(w<2||h<2)continue;
    if(an.fieldType==="Tx"&&cat!=='Loggbok'&&/underskrift|signatur|signature|namnteckning/i.test(name)){
     const signature=elm('button');signature.type='button';signature.className='slrSignatureOnPdf';
     signature.style.cssText='left:'+left+'px;top:'+top+'px;width:'+w+'px;height:'+h+'px;min-height:0!important';
     signature.title=name;signature.setAttribute('aria-label',name);
     signature.dataset.slrSignatureKey=name;signature._slrSignPlacement={page:pi,rect:an.rect.slice()};
     slrRefreshSignatureButton(signature,slrSignatureFor(current,cat,name));
     signature.onclick=()=>slrOpenSign(current,cat,signature,name,signature._slrSignPlacement);
     page.append(signature);
    }else if(an.fieldType==="Tx"){
     const ctrl=elm(an.multiLine?"textarea":"input");ctrl.className="slrOverlayText";
     const textValue=slrFieldValue(current,name,storedValues,defaultValues,cat);
     if(['Drivsystem fabrikat','Drivsystem modell'].includes(name))ctrl.dataset.ceMachineField=name;
     if(an.multiLine)ctrl.value=textValue;else slrConfigureTextInput(ctrl,name,textValue);
     if(slrSensorTypeField(cat,name))ctrl.dataset.ceSensorField=name;
     if(slrIdentityFields.has(name))ctrl.readOnly=true;
     const fieldFont=Math.max(4.5,Math.min(h*.84,Math.max(7,Number(an.defaultAppearanceData?.fontSize)||10)*factor));
     slrPlacePdfInput(ctrl,left,top,w,h,fieldFont,an.multiLine,Math.max(.75,1.6*factor));
     if(slrIsDateField(name))ctrl.style.cssText+=';text-align:left!important;text-indent:0!important;direction:ltr!important';
      ctrl.title=name==="Drivsystem serienummer"?"Maskin-ID":name;ctrl.setAttribute("aria-label",ctrl.title);
     ctrl.addEventListener("input",()=>{if(item!==current)return;slrWriteField(current,cat,name,ctrl.value);if(ctrl.dataset.ceSensorField)slrRefreshSensorShortcuts(current)});
     page.append(ctrl);
     if(ctrl.dataset.ceSensorField){const width=Math.min(w*.28,Math.max(10,14*factor));slrPlacePdfInput(ctrl,left,top,w-width,h,fieldFont,an.multiLine,Math.max(.75,1.6*factor));const choose=elm('button','▾');choose.type='button';choose.className='slrSensorAtField';choose.style.cssText='left:'+(left+w-width)+'px;top:'+top+'px;width:'+width+'px;height:'+h+'px;font-size:'+Math.max(6,10*factor)+'px!important';choose.title='Välj sensortyp eller skriv själv';choose.setAttribute('aria-label',name+' · Välj sensortyp');choose.onclick=()=>slrPickSensorField(current,cat,name,choose);page.append(choose);}
    }else if(an.fieldType==="Sig"){
     const signature=elm("button","✍ Signera");signature.type="button";signature.className="slrSignatureOnPdf";
     signature.style.cssText="left:"+left+"px;top:"+top+"px;width:"+w+"px;height:"+h+"px;min-height:0!important";
     const prior=slrSignatureImage(slrSignatureFor(current,cat,name));
     slrRefreshSignatureButton(signature,prior);
     signature.setAttribute("aria-label",name);signature.title=name;signature.dataset.slrSignatureKey=name;signature._slrSignPlacement={page:pi,rect:an.rect.slice()};if(cat==='Egenkontroll'&&!prior&&slrEgenPointSelected(current,name.replace(/ Signatur$/,''))){signature.textContent='✍ Signatur saknas';}
     signature.onclick=()=>slrOpenSign(current,cat,signature,name,{page:pi,rect:an.rect.slice()});page.append(signature);
    }else if(an.fieldType==="Ch"){
     const choice=elm("select");choice.className="slrOverlayText slrOverlayChoice";slrPlacePdfInput(choice,left,top,w,h,Math.max(5,10*factor));
     const empty=elm("option","Välj…");empty.value="";choice.append(empty);
     for(const option of an.options||[]){const node=elm("option",option.displayValue||option.exportValue||String(option));node.value=option.exportValue||option.displayValue||String(option);choice.append(node);}
     choice.value=storedValues[name]||"";choice.title=name;choice.setAttribute("aria-label",name);
     choice.addEventListener("change",()=>{if(item!==current)return;slrWriteField(current,cat,name,choice.value)});page.append(choice);
    }else if(an.fieldType==="Btn"){
     const widget=slrFindWidget(widgetPages[pi]||[],name,an.rect);
     const radio=widget?.type==='radio'||!!an.radioButton,key=cat==="Riskanalys"&&pi===2&&name==="4.6.1"?"4.6.2":name;
     const index=radioCounters[key]||0;radioCounters[key]=index+1;
     const opt=widget?.value||String(an.buttonValue||an.exportValue||"");
     const val=radio?slrDecode(opt):"";
     const checked=radio?!!val&&slrChoiceId(storedValues[key])===slrChoiceId(val):storedValues[key]===true||storedValues[key]==='Yes';
     const btn=elm("button");btn.type="button";btn.className="slrOverlayTick";btn._slrMark={left,top,width:w,height:h,scale:factor};
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
      if(radio){chosen=slrChoiceId(slrEditingFields(current,cat)[key])!==slrChoiceId(val);slrWriteField(current,cat,key,chosen?val:"");
       for(const other of page.querySelectorAll(".slrOverlayTick"))if(other.dataset.field===key)slrDrawChoice(other,chosen&&other.dataset.value===val)}
      else{chosen=slrEditingFields(current,cat)[name]!==true;slrWriteField(current,cat,name,chosen);slrDrawChoice(btn,chosen)}
      
      
      if(cat==='Egenkontroll'&&/^10\.5\.\d+$/.test(key)){
        if(chosen)slrHandleEgenChoice(current,key,index,page);
        const sign=Array.from(page.querySelectorAll('.slrSignatureOnPdf')).find(b=>b.dataset.slrSignatureKey===key+' Signatur');
        if(sign)slrRefreshSignatureButton(sign,slrSignatureFor(current,'Egenkontroll',key+' Signatur'));
       }
     };page.append(btn);
    }
   }
   // PDF.js may suppress some checkbox annotations until they are focused.
   // PDF-lib's widget map supplies any squares not exposed by PDF.js, including
   // risk questions 4.6.12 / 4.6.13, SLR membership and Egenkontroll.
   for(const widget of widgetPages[pi]||[]){
    const rect=widget.rect;
    if(!rect||rect.width<2||rect.height<2)continue;
    const coords=vp.convertToViewportRectangle([rect.x,rect.y,rect.x+rect.width,rect.y+rect.height]);
    const left=Math.min(coords[0],coords[2]),top=Math.min(coords[1],coords[3]);
    const w=Math.abs(coords[2]-coords[0]),h=Math.abs(coords[3]-coords[1]);
    const existing=Array.from(page.querySelectorAll('.slrOverlayTick'))
     .some(button=>Math.abs(button._slrMark?.left-left)<3&&Math.abs(button._slrMark?.top-top)<3);
    if(existing)continue;
    const key=cat==='Riskanalys'&&pi===2&&widget.name==='4.6.1'?'4.6.2':widget.name;
    const radio=widget.type==='radio',value=radio?slrDecode(widget.value):'';
    const on=radio?!!value&&slrChoiceId(storedValues[key])===slrChoiceId(value):storedValues[key]===true||storedValues[key]==='Yes';
    const btn=elm('button');btn.type='button';btn.className='slrOverlayTick';
    btn._slrMark={left,top,width:w,height:h,scale:factor};
    const hitW=Math.max(w,Math.min(28,Math.max(18,w+12)));
    const hitH=Math.max(h,Math.min(19,Math.max(15,h+5)));
    btn.style.cssText='left:'+(left-(hitW-w)/2)+'px;top:'+(top-(hitH-h)/2)+'px;width:'+hitW+'px;height:'+hitH+'px';
    btn.dataset.field=key;btn.dataset.value=value;btn.title=slrChoiceText(key,value);
    btn.setAttribute('aria-label',btn.title);
    slrDrawChoice(btn,on);
    btn.onclick=()=>{
     if(item!==current)return;
     if(radio){
      const chosen=slrChoiceId(slrEditingFields(current,cat)[key])!==slrChoiceId(value);
      slrWriteField(current,cat,key,chosen?value:'');
      for(const other of page.querySelectorAll('.slrOverlayTick'))if(other.dataset.field===key)
       slrDrawChoice(other,chosen&&other.dataset.value===value);
      if(cat==='Egenkontroll'&&chosen&&/^10\.5\.\d+$/.test(key))slrHandleEgenChoice(current,key,0,page);
     }else{
      const chosen=slrEditingFields(current,cat)[key]!==true;
      slrWriteField(current,cat,key,chosen);slrDrawChoice(btn,chosen);
      if(cat==='Egenkontroll'&&chosen&&/^10\.5\.\d+$/.test(key))slrHandleEgenChoice(current,key,0,page);
     }
    };
    page.append(btn);
   }
   // All squares are visible on the first frame.
   if(cat==="Riskanalys"&&pi===4){const b=elm("button","✍ Signera här");b.className="slrSignatureOnPdf";b.type="button";
    const sl=140.5,st=584,sw=198.5,sh=35.8;b.style.cssText="left:"+sl*factor+"px;top:"+st*factor+"px;width:"+sw*factor+"px;height:"+sh*factor+"px";
    slrRefreshSignatureButton(b,slrSignatureFor(current,cat));
    b.onclick=()=>slrOpenSign(current,cat,b);page.append(b)}
   }catch(error){
    const notice=elm('p','Sida '+(pi+1)+' kunde inte visas fullständigt: '+error.message);
    notice.className='slrPageWarning';workspace.append(notice);
   }
  }
  if(zoomAnchor){
   const target=host.querySelector('.slrOriginalPage[data-slr-page-index="'+zoomAnchor.index+'"]');
   const scrollMain=workspace;
   if(target&&scrollMain){
    const r=target.getBoundingClientRect();
    scrollMain.scrollTop+=r.top+r.height*zoomAnchor.ratio-zoomAnchor.y;
    if(Number.isFinite(zoomAnchor.ratioX)&&Number.isFinite(zoomAnchor.x))
      scrollMain.scrollLeft+=r.left+r.width*zoomAnchor.ratioX-zoomAnchor.x;
   }
  }else $("slrEditor").scrollIntoView({block:"start",behavior:"auto"});
  announce("Gemensam ifyllnad följer glasvalet. Anpassningar gäller endast den enskilda dörren.");
 }catch(err){announce("Kunde inte visa CE-sidorna: "+err.message,true)}
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
  if(!count)return announce('Inga ifyllda CE-dokument finns att exportera för denna dörr.',true);
  const result=new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'}),url=URL.createObjectURL(result);
  const a=elm('a');a.href=url;a.download='CE-'+safe(slrDoorDesignation(current))+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);
  announce('Kund-PDF skapad för denna dörr: '+count+' sidor. Projekt-PDF:en påverkas inte.');
 }catch(err){announce('Kunde inte skapa kund-PDF: '+err.message,true)}
}

function slrHasSavedWork(current,cat){
 // A blank PDF is rebuilt from the one shared template + this door's JSON.
 // Never omit a document containing an answer, even an explicit false tick,
 // a signature or a marked-in-progress/completed document.
 const v=answers[current.id]?.[cat],fields=v?.fields||{};
 const entered=Object.values(fields).some(x=>x!==undefined&&x!==null&&(typeof x==='boolean'||String(x).trim()!==''));
 const signs=(cat!=='Loggbok'&&!!slrSignatureImage(projectSignature))||!!doorSignatures[current.id]||!!v?.signature||Object.values(v?.signatures||{}).some(x=>!!x?.image);
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
  const product=productFiles[current.id];if(!product)continue;if(product.generated){products[current.id]={designation:product.designation,format:product.format,rowCount:product.rowCount,generated:true};continue;}
  const file=prefix+"-produktlista-"+(idx+1)+"-"+safe(current.id)+".pdf";
  await doc.attach(product.bytes,file,{mimeType:"application/pdf",description:"Produktlista för "+product.designation+" från "+product.gsCode+"."});
  each[current.id].Produktlista=file;products[current.id]={file,designation:product.designation,gsCode:product.gsCode,cardPage:product.cardPage,format:product.format,rowCount:product.rowCount,generated:!!product.generated};
 }
 window.TillsynoCEStorage.write(doc,"TillsynoSLRTestManifest",{schema:8,templates:refs,each,names,products,storage:"shared-template-and-fields-generated-products-on-demand"});
}
async function verify(data,expected){
 if(!Object.keys(templates).length&&!Object.keys(productFiles).length)return;
 const pdf=await PDFLib.PDFDocument.load(data.slice(),{ignoreEncryption:true,updateMetadata:false});
 const m=window.TillsynoCEStorage.read(pdf,"TillsynoSLRTestManifest");
 if(!m?.templates||!m?.each)throw Error("SLR-bilagor saknas i sparad PDF");
 for(const cat of Object.keys(templates))if(!m.templates[cat])throw Error("Projektets gemensamma SLR-mall saknas: "+cat);
for(const current of expected.automationItems||[])if(productFiles[current.id]&&!productFiles[current.id].generated&&!m.each[current.id]?.Produktlista)throw Error("Produktlistan saknas för "+current.id);
}
function slrFolderName(value){return String(value||'SLR').normalize('NFC').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/g,'').slice(0,100)||'SLR';}
async function buildFolderArchive(selected,context=bridge,onProgress=null){
 if(!window.JSZip)throw Error('Mappexporten kunde inte laddas. Öppna sidan med internet först.');
 await loadTemplates();
 const zip=new window.JSZip(),meta=context?.getProjectMeta?.()||{},root=slrFolderName(meta.projectName||meta.facilityNo||'SLR'),used=new Set();
 if(!selected?.length)throw Error('Välj minst en färdig dörr.');
 for(const obj of selected)for(const cat of cats)saved(obj,cat);
 const revision=JSON.stringify(payload());
 for(const [doorIndex,obj] of selected.entries()){
  onProgress?.(doorIndex+1,selected.length,slrDoorDesignation(obj));
  slrRequirePointSignatures(obj);
  if(!completedDoors[obj.id])throw Error('Dörr '+slrDoorDesignation(obj)+' är inte klar. Granska alla dokument och välj Slutför dörr först.');
  let name=slrFolderName(slrDoorDesignation(obj)),unique=name,n=2;while(used.has(unique))unique=name+' ('+(n++)+')';used.add(unique);
  const folder=zip.folder(root).folder(unique);
  for(const [index,cat]of cats.entries()){
   if(!slrDocumentAvailable(obj,cat))throw Error(labelFor(cat)+' saknas för '+slrDoorDesignation(obj)+'.');
   const bytes=await compose(cat,obj),photo=cat==='CE-skylt'?doorPhotos[obj.id]:null;
   const ext=photo?(photo.type==='image/png'?'png':'jpg'):cat==='CE-skylt'?(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||'pdf').toLowerCase():'pdf';
   const label=slrFolderName(labelFor(cat));folder.folder((index+1)+'. '+label).file(label+'.'+ext,bytes,{binary:true});
   // Give mobile Safari a rendering opportunity between documents.
   onProgress?.(doorIndex+1,selected.length,slrDoorDesignation(obj)+' · '+labelFor(cat));
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 onProgress?.(selected.length,selected.length,'Paketerar ZIP…');
 const bytes=await zip.generateAsync({type:'uint8array',compression:'STORE',streamFiles:true});
 if(JSON.stringify(payload())!==revision)throw Error('SLR ändrades under exporten. Skapa paketet igen.');
 return {bytes,name:root+'-CE.zip',doors:selected.length};
}
function slrExportMessage(message,error=false){
 const status=$('slrExportStatus');
 if(status){status.textContent=message;status.style.color=error?'#a52229':'#1b536e';}
}
function slrExportInvalidate(){
 slrExportReady=null;
 for(const id of ['slrExportDownload','slrExportShare'])if($(id))$(id).disabled=true;
 const chosen=$('slrExportDoors')?.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)').length||0;
 if($('slrExportBuild'))$('slrExportBuild').disabled=slrExportBusy||chosen===0;
 const count=$('slrExportChosen');
 if(count)count.textContent=chosen+' '+(chosen===1?'dörr vald':'dörrar valda');
}
function slrDownloadZip(file){
 const url=URL.createObjectURL(file),link=elm('a');
 link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function openExport(context){
 bridge=context||bridge;setup();await loadTemplates();
 if($('slrFlowTestDialog')?.open)$('slrFlowTestDialog').close();
 let dialog=$('slrExportDialog');
 if(!dialog){
  dialog=elm('dialog');dialog.id='slrExportDialog';dialog.className='slrExportDialog';
  dialog.innerHTML='<header><strong>Exportera CE-underlag</strong><button id="slrExportClose" type="button">Stäng ×</button></header><main><p>Välj färdiga dörrar. Varje dörr får en egen mapp med sju dokumentmappar i en ZIP-fil.</p><div class="ceExportSelectActions"><button id="slrExportAll" type="button">Välj alla färdiga</button><button id="slrExportNone" type="button">Avmarkera alla</button><strong id="slrExportChosen" aria-live="polite"></strong></div><div id="slrExportDoors" class="ceExportDoorChoices"></div><p id="slrExportStatus" role="status" aria-live="polite"></p><footer><button id="slrExportBuild" type="button">Skapa ZIP</button><button id="slrExportDownload" type="button" disabled>Spara ZIP</button><button id="slrExportShare" type="button" disabled>Skicka / dela ZIP</button></footer><p class="ceExportHint">Skicka / dela öppnar enhetens delningsmeny. Välj Mail om det finns. Om datorn inte stöder fildelning sparas ZIP-filen så att du kan bifoga den själv.</p></main>';
  document.body.append(dialog);
  $('slrExportClose').onclick=()=>dialog.close();
  $('slrExportAll').onclick=()=>{
   for(const input of $('slrExportDoors').querySelectorAll('input[type="checkbox"]:not(:disabled)'))input.checked=true;
   slrExportInvalidate();
  };
  $('slrExportNone').onclick=()=>{
   for(const input of $('slrExportDoors').querySelectorAll('input[type="checkbox"]'))input.checked=false;
   slrExportInvalidate();
  };
  $('slrExportBuild').onclick=async()=>{
   if(slrExportBusy)return;
   const ids=new Set([...$('slrExportDoors').querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map(input=>input.value));
   const selected=(bridge?.getItems?.()||[]).filter(obj=>ids.has(obj.id));
   if(!selected.length)return slrExportMessage('Välj minst en färdig dörr.',true);
   slrExportBusy=true;slrExportInvalidate();$('slrExportAll').disabled=true;$('slrExportNone').disabled=true;
   try{
    slrExportMessage('Förbereder '+selected.length+' dörrmappar…');
    const result=await buildFolderArchive(selected,bridge,(index,total,door)=>slrExportMessage('Skapar '+index+' av '+total+': '+door));
    slrExportReady=new File([result.bytes],result.name,{type:'application/zip'});
    $('slrExportDownload').disabled=false;$('slrExportShare').disabled=false;
    slrExportMessage('ZIP klar · '+result.doors+' dörrmappar. Välj Spara ZIP eller Skicka / dela ZIP.');
   }catch(err){slrExportReady=null;slrExportMessage('Kunde inte skapa ZIP: '+err.message,true);}
   finally{slrExportBusy=false;$('slrExportAll').disabled=false;$('slrExportNone').disabled=false;$('slrExportBuild').disabled=selected.length===0;}
  };
  $('slrExportDownload').onclick=()=>{
   const file=slrExportReady;if(!file)return;
   slrDownloadZip(file);slrExportMessage('ZIP-filen hämtas: '+file.name+'. Den kan öppnas på datorn.');
  };
  $('slrExportShare').onclick=async()=>{
   const file=slrExportReady;if(!file)return;
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:'CE-dokument · '+file.name});slrExportMessage('ZIP-filen lämnad till delningsmenyn.');}
    catch(err){if(err.name==='AbortError')slrExportMessage('Delningen avbröts. ZIP-filen finns kvar här.');else slrExportMessage('Kunde inte dela: '+err.message,true);}
   }else{
    slrDownloadZip(file);slrExportMessage('Webbläsaren kan inte dela direkt. ZIP-filen hämtas så att du kan bifoga den i mejl.');
   }
  };
 }
 const all=bridge?.getItems?.()||[],done=all.filter(obj=>!!completedDoors[obj.id]);
 const list=$('slrExportDoors');list.replaceChildren();slrExportBusy=false;slrExportReady=null;
 for(const obj of all){
  const ready=!!completedDoors[obj.id],row=elm('label');row.className='ceExportDoor'+(ready?'':' ceExportPending');
  const input=elm('input');input.type='checkbox';input.value=obj.id;input.checked=ready;input.disabled=!ready;input.onchange=()=>slrExportInvalidate();
  const name=elm('span',slrDoorDesignation(obj)),place=elm('small',(obj.location?obj.location+' · ':'')+(ready?'Klar':'Ej klar'));
  row.append(input,name,place);list.append(row);
 }
 if(!all.length)list.append(elm('p','Det finns inga dörrar i projektet ännu.'));
 else if(!done.length)list.append(elm('p','Inga dörrar är klarmarkerade. När en dörr är färdig kan du välja den här.'));
 slrExportInvalidate();
 slrExportMessage(done.length+' färdiga av '+all.length+' dörrar. Välj de du vill exportera.');
 if(!dialog.open)dialog.showModal();
}
window.TillsynoCETest={reset,initProject,restore,payload,open,saveTo,verify,getProgress:slrProgress,openExport,buildFolderArchive,
 getProjectSignature:()=>slrSignatureImage(projectSignature),
 getSignatureDisplay:()=>slrSignatureDateInfo(),
 getDoorCustomizations:obj=>slrDoorCustomizedCategories(obj),
 setSignatureDisplay(options){
  if(options&&Object.hasOwn(options,'date'))signatureDate=slrDateValue(options.date)||'';
  if(['handwriting','italic','regular','typewriter'].includes(options?.style))signatureDateStyle=options.style;
  if(['day','month'].includes(options?.format))signatureDateFormat=options.format;
  bridge?.save?.();bridge?.redraw?.();return slrSignatureDateInfo();
 },
 setProjectSignature(data){projectSignature=data?slrStoreSignatureImage(data):'';slrExportReady=null;if($('slrExportDownload'))$('slrExportDownload').disabled=true;bridge?.save?.();bridge?.redraw?.();return !!projectSignature;},
 assets:()=>({templates,names,productFiles}),
 restoreAssets(data){templates=data?.templates||{};names=data?.names||{};productFiles=data?.productFiles||{};choiceGroups={};checkKeyCache={};templatesLoaded=false;},
 async copyDoor(source,target){
  if(!source?.id||!target?.id||source.id===target.id)throw Error('Välj en annan dörr att kopiera till.');
  if(answers[target.id]||doorProfiles[target.id])throw Error('Den nya dörren har redan egna CE-uppgifter.');
  const type=slrDoorProfile(source)||((source.type==='glass'||source.type==='noGlass')?source.type:'');
  if(type)doorProfiles[target.id]=type;
  // Copy ALL work from the source: ticks, free text, measurements, signatures,
  // photos, document approval and product records. Only the unique machine
  // identity comes from the new door form.
  answers[target.id]=structuredClone(answers[source.id]||{});
  if(source.slrDocuments)target.slrDocuments=structuredClone(source.slrDocuments);
  if(reviewedFolders[source.id])reviewedFolders[target.id]=structuredClone(reviewedFolders[source.id]);
  if(completedDoors[source.id])completedDoors[target.id]=structuredClone(completedDoors[source.id]);
  if(doorSignatures[source.id])doorSignatures[target.id]=structuredClone(doorSignatures[source.id]);
  if(doorPhotos[source.id])doorPhotos[target.id]=structuredClone(doorPhotos[source.id]);
  if(productFiles[source.id])productFiles[target.id]=structuredClone(productFiles[source.id]);
  if(verificationByDoor[source.id])verificationByDoor[target.id]=structuredClone(verificationByDoor[source.id]);
  const fieldsToRetain=new Set(['Antal dörrblad','Antal maskindrivna']);
  for(const [cat,data] of Object.entries(answers[target.id])){
   for(const key of Object.keys(data?.fields||{})){
    if(slrIdentityFields.has(key)||['Drivsystem fabrikat','Drivsystem modell'].includes(key)){
     // New sourceText, machine/model and position are resolved from the
     // newly entered door, not copied verbatim from the old identifier.
     if(!fieldsToRetain.has(key))delete data.fields[key];
    }
   }
  }
  // If the source has an app-generated product PDF, regenerate it for the
  // new automatiknummer and placement rather than copying a wrong heading.
  const generated=productFiles[target.id];
  if(generated?.generated&&answers[target.id]?.Produktlista?.productRows?.length){
   await slrBuildManualProductPdf(target,true);
   if(reviewedFolders[source.id])reviewedFolders[target.id]=structuredClone(reviewedFolders[source.id]);
   if(completedDoors[source.id])completedDoors[target.id]=structuredClone(completedDoors[source.id]);
   if(source.slrDocuments)target.slrDocuments=structuredClone(source.slrDocuments);
  }
  target.copiedFrom=source.sourceText||slrDoorDesignation(source);
  slrExportReady=null;bridge?.save?.();bridge?.redraw?.();
  return {type,categories:Object.keys(answers[target.id]).length,signatureCopied:!!doorSignatures[target.id]||Object.values(answers[target.id]).some(data=>!!data?.signature||!!Object.keys(data?.signatures||{}).length)};
 },
 assignProfile(obj,type){
  const chosen=type==='glass'||type==='noGlass'?type:'';
  const was=slrDoorProfile(obj);
  // Saving an unchanged door must NOT erase its local overrides.
  if(was!==chosen){
   slrClearDoorProfileChoices(obj);
   if(chosen)doorProfiles[obj.id]=chosen;else delete doorProfiles[obj.id];
  }
 },
 removeDoor(obj){
  const id=obj?.id;if(!id)return false;
  slrInvalidate(obj);
  for(const bag of [answers,doorProfiles,doorSignatures,doorPhotos,reviewedFolders,completedDoors,productFiles,verificationByDoor])delete bag[id];
  if(item?.id===id){slrSensorMenuCleanup?.();slrClearEditor();item=null;openedFolders.clear();$('slrFlowTestDialog')?.close?.();}
  return true;
 },
 invalidateDoor(obj){delete reviewedFolders[obj.id];slrInvalidate(obj);},
 loadTemplates,compose
};
})();



