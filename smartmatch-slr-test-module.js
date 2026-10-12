/* SmartMatch SLR TEST: local-only document forms and PDF attachments. */
(function(){"use strict";
const cats=["Riskanalys","Beskrivning av maskin","Loggbok","Tillverkarens försäkran","Försäkringscertifikat","Godkännande","Produktlista","Egenkontroll","Egenkontroll – brukaransvarig","CE-skylt"];
const $=s=>document.getElementById(s);
const elm=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
let templates={},names={},stored={},answers={},originalBytes=null,bridge=null,item=null,picked="",loading=null;
function safe(s){return String(s).replace(/[^a-z0-9]+/gi,"-").slice(0,60)}
function decode(d){try{return d?.decodeText?.()||d?.asString?.()||""}catch(_){return ""}}
function reset(){templates={};names={};stored={};answers={};originalBytes=null;item=null;loading=null}
function initProject(pdf,saved,data){reset();originalBytes=data?.slice?.()||null;try{stored=JSON.parse(decode(pdf.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest"))))||{}}catch(_){}answers=saved?.slrTestData?.answers||{};names=saved?.slrTestData?.names||stored.names||{};}
function restore(saved){if(saved?.slrTestData?.answers)answers=saved.slrTestData.answers;}
function payload(){return {schema:1,answers,names}}
function saved(i,cat){if(!answers[i.id])answers[i.id]={};if(!answers[i.id][cat])answers[i.id][cat]={fields:{}};return answers[i.id][cat]}
function announce(t,error){const e=$("slrStatusText");if(e){e.textContent=t;e.style.color=error?"#a52229":"#1b536e";}}
function auto(i){const m=bridge?.getProjectMeta?.()||{},id=i.sourceText||[i.objectNo,i.modelCode,i.serialNumber].filter(Boolean).join("-");
return {"Beställare företagsnamn":m.customer||"","Beställare adress":m.address||"","Beställarepostnummer/ort":[m.postalCode,m.postalCity].filter(Boolean).join(" "),"Beställare kontaktperson":m.contact||"","Beställare telefonnummer":m.phone||"","Tillverkare företagsnamn":m.company||"","Tillverkare adress":m.companyAddress||"","Tillverkare postnummer/ort":[m.companyPostalCode,m.companyPostalCity].filter(Boolean).join(" "),"Tillverkare kontaktperson":m.companyContact||"","Tillverkare telefonnummer":m.companyPhone||"","Offertnummer/Ordernummer":m.order||"","Objekt":i.objectNo||m.facilityNo||"","Plats i byggnaden":saved(i,"Riskanalys").place||i.location||"","Dörrnummer, beteckning":id,"4.7 Företag":m.company||"","4.7 Namn":m.technician||"","4.7 Telefonnummer":m.companyPhone||""};}
async function loadTemplates(){if(!originalBytes||!Object.keys(stored.templates||{}).length)return;if(loading)return loading;
loading=(async()=>{let p=null;try{p=await pdfjsLib.getDocument({data:originalBytes.slice()}).promise;const a=await p.getAttachments()||{};for(const [cat,name]of Object.entries(stored.templates)){if(a[name]?.content)templates[cat]=new Uint8Array(a[name].content)}}finally{try{await p?.destroy()}catch(_){}}})();
try{await loading}finally{loading=null}}
function kind(f){if(f instanceof PDFLib.PDFTextField)return "text";if(f instanceof PDFLib.PDFCheckBox)return "check";if(f instanceof PDFLib.PDFRadioGroup)return "radio";if(f instanceof PDFLib.PDFDropdown)return "choice";return ""}
function clearRisk(pdf){const form=pdf.getForm();for(const f of form.getFields())try{const k=kind(f);if(k==="text")f.setText("");else if(k==="check")f.uncheck();else if(k==="radio"||k==="choice")f.clear()}catch(_){}
for(const p of pdf.getPages()){const arr=p.node.Annots?.();if(!arr)continue;const keep=[];for(let n=0;n<arr.size();n++){const ref=arr.get(n),node=pdf.context.lookup(ref);if(node instanceof PDFLib.PDFDict&&node.get(PDFLib.PDFName.of("Subtype"))?.toString()==="/Widget")keep.push(ref)}p.node.set(PDFLib.PDFName.of("Annots"),pdf.context.obj(keep));}}
async function compose(cat,i){const bytes=templates[cat];if(!bytes)throw Error("Ingen mall");
if(cat==="CE-skylt"&&/\.(png|jpe?g)$/i.test(names[cat]||""))return bytes.slice();
const pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
const values=saved(i,cat).fields||{},defaults=auto(i);
for(const f of pdf.getForm().getFields()){const name=f.getName(),k=kind(f),v=values[name]??defaults[name];if(v===undefined)continue;
try{if(k==="text")f.setText(String(v??""));else if(k==="check"){if(v===true)f.check();else f.uncheck()}else if((k==="radio"||k==="choice")&&v&&f.getOptions().includes(v))f.select(v);else if(k==="radio"||k==="choice")f.clear()}catch(_){}}
return new Uint8Array(await pdf.save({useObjectStreams:true}));}
function setup(){if($("slrFlowTestDialog"))return;
const style=elm("style");style.textContent='#slrFlowTestDialog{width:min(850px,96vw);max-height:95dvh;background:#f4f8fa;color:#122f42;border:1px solid #7399b0;border-radius:14px;padding:0}#slrFlowTestDialog::backdrop{background:#061c32b3}#slrFlowTestDialog header{background:#12334e;color:white;padding:16px;display:flex;align-items:center;justify-content:space-between}#slrFlowTestDialog main{padding:16px;max-height:calc(95dvh - 74px);overflow:auto}#slrFlowTestDialog button{padding:9px 12px;border-radius:8px;border:1px solid #90adc0;background:#e5f2f9;color:#103b54;font-size:13px;font-weight:700;margin:3px}#slrFlowTestDialog .slrDocRow{padding:12px 0;border-bottom:1px solid #ccdae2;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}#slrFlowTestDialog .slrDocRow small{display:block;color:#426476;margin-top:4px}#slrFlowTestDialog #slrFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;margin:15px 0}#slrFlowTestDialog label{color:#244c66;font-size:13px;display:block}#slrFlowTestDialog select,#slrFlowTestDialog input[type=text]{width:100%;min-height:38px;padding:7px;margin-top:4px;background:white;color:#142e3e;border-radius:8px;border:1px solid #a8bfca}#slrFlowTestDialog input[type=checkbox]{width:20px;height:20px}#slrStatusText{font-size:13px;line-height:1.5}@media(max-width:650px){#slrFlowTestDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrFlowTestDialog main{max-height:calc(100dvh - 74px)}}';document.head.append(style);
const d=elm("dialog");d.id="slrFlowTestDialog";d.innerHTML='<header><div><strong id="slrTestHeading">SLR TEST</strong><div style="font-size:12px;opacity:.8">Varje automatik har egna dokument och riskval</div></div><button id="slrTestExit" type="button">Stäng ×</button></header><main><div id="slrTestSource" style="font-size:13px;margin:9px 0"></div><div id="slrTestDocRows"></div><h3 id="slrEditHeading" style="font-size:16px"></h3><div id="slrFields"></div><p id="slrStatusText"></p></main><input id="slrFileSelect" type="file" style="display:none" accept=".pdf,application/pdf">';
document.body.append(d);$("slrTestExit").onclick=()=>d.close();
$("slrFileSelect").onchange=async e=>{const f=e.target.files?.[0],cat=picked;e.target.value="";if(!f||!cat)return;
try{if(f.size>20*1024*1024)throw Error("Max 20 MB per mall i första testet");if(cat!=="CE-skylt"&&!/\.pdf$/i.test(f.name))throw Error("Välj en PDF-fil");
let bytes=new Uint8Array(await f.arrayBuffer());if(/\.pdf$/i.test(f.name)){const p=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});if(cat==="Riskanalys"){clearRisk(p);bytes=new Uint8Array(await p.save({useObjectStreams:true}))}}
templates[cat]=bytes;names[cat]=f.name;bridge?.save?.();bridge?.redraw?.();draw();announce(cat+" har lagts in som projektmall för samtliga dörrautomatiker.")}
catch(err){announce(err.message,true)}};
}
async function open(o,b,verification){if(!o)return;item=o;bridge=b;setup();const d=$("slrFlowTestDialog");if(!d.open)d.showModal();$("slrTestHeading").textContent="SLR · "+(o.sourceText||o.objectNo||o.id);
$("slrTestSource").textContent=verification?.gs?"GS "+verification.gs.code+" verifierad":"Kontrollera GS-kopplingen innan uppgifter hämtas från dörrkort";
announce("Öppnar SLR-mallar från projekt-PDF…");try{await loadTemplates();draw();announce("SLR mallar lagras bara inuti den PDF-fil du sparar.")}catch(err){draw();announce("Bilagor kunde inte läsas: "+err.message,true)}}
function draw(){if(!item||!$("slrTestDocRows"))return;const root=$("slrTestDocRows");root.replaceChildren();
for(const cat of cats){const row=elm("div");row.className="slrDocRow";const txt=elm("div");txt.append(elm("strong",cat),elm("small",templates[cat]?names[cat]:"Ingen fil vald"));const buttons=elm("div"),pick=elm("button",templates[cat]?"Byt fil":"Öppna fil");pick.onclick=()=>{picked=cat;$("slrFileSelect").accept=cat==="CE-skylt"?".pdf,.png,.jpg,.jpeg,application/pdf,image/*":".pdf,application/pdf";$("slrFileSelect").click()};buttons.append(pick);
if(templates[cat]){const preview=elm("button","Visa PDF");preview.onclick=()=>void previewDoc(cat);buttons.append(preview);
if(/\.pdf$/i.test(names[cat]||"")){const edit=elm("button","Redigera fält");edit.onclick=()=>void editDoc(cat);buttons.append(edit)}}
row.append(txt,buttons);root.append(row)}}
async function previewDoc(cat){try{const b=await compose(cat,item),img=/\.(png|jpe?g)$/i.test(names[cat]||"");
const mime=img?(/\.png$/i.test(names[cat])?"image/png":"image/jpeg"):"application/pdf";
const url=URL.createObjectURL(new Blob([b],{type:mime})),w=window.open(url,"_blank");
if(!w){const a=elm("a");a.href=url;a.download=safe(cat)+"-"+safe(item.id)+(img?".png":".pdf");a.click()}setTimeout(()=>URL.revokeObjectURL(url),120000);}
catch(err){announce("Kunde inte visa dokumentet: "+err.message,true)}}
async function editDoc(cat){
$("slrFields").replaceChildren();$("slrEditHeading").textContent=cat+" · "+(item.sourceText||item.objectNo||item.id);
const p=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
const fields=p.getForm().getFields(),values=saved(item,cat).fields||{},defaults=auto(item),id=item.id;
for(const f of fields){const name=f.getName(),k=kind(f);if(!k)continue;const l=elm("label",name);let input;
if(k==="text"){input=elm("input");input.type="text";input.value=values[name]??defaults[name]??"";}
else if(k==="check"){input=elm("input");input.type="checkbox";input.checked=values[name]===true;}
else{input=elm("select");const empty=elm("option","Ej valt");empty.value="";input.append(empty);for(const opt of f.getOptions()){const option=elm("option",opt);option.value=opt;input.append(option)}input.value=values[name]||"";}
input.addEventListener("change",()=>{if(item?.id!==id)return;const v=k==="check"?input.checked:input.value;
saved(item,cat).fields[name]=v;if(!item.slrDocuments)item.slrDocuments={};item.slrDocuments[cat]={...(item.slrDocuments[cat]||{}),status:"doing"};bridge?.save?.();bridge?.redraw?.();announce("Ändrat bara för automatik "+id+". Spara projekt-PDF för att flytta arbetet.")});
l.append(input);$("slrFields").append(l)}
$("slrEditHeading").scrollIntoView({block:"start",behavior:"smooth"});
}
async function saveTo(doc,payload){await loadTemplates();const enabled=Object.keys(templates);if(!enabled.length)return;
const items=Array.isArray(payload?.automationItems)?payload.automationItems:[],count=items.length*enabled.length;
if(count>180)throw Error("SLR-testet begränsar PDF-export till 180 dokumentkopior; välj färre mallar.");
const prefix="slrtest-"+Date.now().toString(36),refs={},each={};
for(const cat of enabled){const ext=(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||"pdf").toLowerCase(),fn=prefix+"-mall-"+safe(cat)+"."+ext;
refs[cat]=fn;await doc.attach(templates[cat],fn,{mimeType:ext==="pdf"?"application/pdf":ext==="png"?"image/png":"image/jpeg",description:"SLR gemensam projektmall"});}
for(const o of items){each[o.id]={};for(const cat of enabled){const ext=(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||"pdf").toLowerCase(),fn=prefix+"-"+safe(o.id)+"-"+safe(cat)+"."+ext;
await doc.attach(await compose(cat,o),fn,{mimeType:ext==="pdf"?"application/pdf":ext==="png"?"image/png":"image/jpeg",description:"SLR "+cat+" för "+(o.sourceText||o.id)});each[o.id][cat]=fn;}}
doc.catalog.set(PDFLib.PDFName.of("TillsynoSLRTestManifest"),PDFLib.PDFHexString.fromText(JSON.stringify({schema:1,templates:refs,each,names})));
}
async function verify(data,expected){
 if(!Object.keys(templates).length)return;
 const pdf=await PDFLib.PDFDocument.load(data.slice(),{ignoreEncryption:true,updateMetadata:false});
 const m=JSON.parse(decode(pdf.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest")))||"null");
 if(!m?.templates||!m?.each)throw Error("SLR-bilagor saknas i sparad PDF");
 for(const o of expected.automationItems||[])for(const cat of Object.keys(templates))if(!m.each[o.id]?.[cat])throw Error("SLR saknas för "+o.id);
}
window.SmartMatchSLRTest={reset,initProject,restore,payload,open,saveTo,verify};
})();