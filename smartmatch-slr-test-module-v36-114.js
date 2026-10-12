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
loading=(async()=>{let p=null;try{p=await pdfjsLib.getDocument({data:originalBytes.slice()}).promise;const a=await p.getAttachments()||{};for(const [cat,name]of Object.entries(stored.templates)){if(a[name]?.content){let data=new Uint8Array(a[name].content);if(cat==="Riskanalys"){const clean=await PDFLib.PDFDocument.load(data.slice(),{ignoreEncryption:true,updateMetadata:false});clearRisk(clean);data=new Uint8Array(await clean.save({useObjectStreams:true}));}templates[cat]=data;}}}finally{try{await p?.destroy()}catch(_){}}})();
try{await loading}finally{loading=null}}
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
 if(!/(?:^|\s)datum\s*$/i.test(name)){input.type="text";input.value=String(value??"");return;}
 input.type="date";input.value=slrDateValue(value);input.classList.add("slrOverlayDate");
 input.addEventListener("click",()=>{try{input.showPicker?.()}catch(_){}});
}
function kind(f){if(f instanceof PDFLib.PDFTextField)return "text";if(f instanceof PDFLib.PDFCheckBox)return "check";if(f instanceof PDFLib.PDFRadioGroup)return "radio";if(f instanceof PDFLib.PDFDropdown)return "choice";return ""}
function clearRisk(pdf){const form=pdf.getForm();for(const f of form.getFields())try{const k=kind(f);if(k==="text")f.setText("");else if(k==="check")f.uncheck();else if(k==="radio"||k==="choice")f.clear();if(k==="check"||k==="radio")f.acroField?.dict?.delete?.(PDFLib.PDFName.of("DV"))}catch(_){}
for(const p of pdf.getPages()){const arr=p.node.Annots?.();if(!arr)continue;const keep=[];for(let n=0;n<arr.size();n++){const ref=arr.get(n),node=pdf.context.lookup(ref);if(node instanceof PDFLib.PDFDict&&node.get(PDFLib.PDFName.of("Subtype"))?.toString()==="/Widget")keep.push(ref)}p.node.set(PDFLib.PDFName.of("Annots"),pdf.context.obj(keep));}}
async function compose(cat,i){const bytes=templates[cat];if(!bytes)throw Error("Ingen mall");
if(cat==="CE-skylt"&&/\.(png|jpe?g)$/i.test(names[cat]||""))return bytes.slice();
const pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
if(cat==="Riskanalys")clearRisk(pdf);
const values=saved(i,cat).fields||{},defaults=auto(i);
for(const f of pdf.getForm().getFields()){const name=f.getName(),k=kind(f),v=values[name]??defaults[name];if(v===undefined)continue;
try{if(cat==="Riskanalys"&&name==="4.6.1")continue;if(k==="text")f.setText(String(v??""));else if(k==="check"){if(v===true)f.check();else f.uncheck()}else if((k==="radio"||k==="choice")&&v){const option=f.getOptions().find(o=>slrDecode(o)===slrDecode(v));if(option)f.select(option);else f.clear()}else if(k==="radio"||k==="choice")f.clear()}catch(_){}}
if(cat==="Riskanalys"&&pdf.getPageCount()===5){
 const rfields=saved(i,cat).fields||{},opts=[
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
if(cat==="Riskanalys"&&saved(i,cat).signature){const pg=pdf.getPages()[4];if(pg){try{const im=await pdf.embedPng(saved(i,cat).signature);pg.drawImage(im,{x:140.5,y:pg.getHeight()-619.8,width:198.5,height:35.8})}catch(err){throw Error("Kunde inte lägga in signaturen: "+err.message)}}}
return new Uint8Array(await pdf.save({useObjectStreams:true}));}
function setup(){if($("slrFlowTestDialog"))return;
const style=elm("style");style.textContent='#slrFlowTestDialog{width:min(850px,96vw);max-height:95dvh;background:#f4f8fa;color:#122f42;border:1px solid #7399b0;border-radius:14px;padding:0}#slrFlowTestDialog::backdrop{background:#061c32b3}#slrFlowTestDialog header{background:#12334e;color:white;padding:16px;display:flex;align-items:center;justify-content:space-between}#slrFlowTestDialog main{padding:16px;max-height:calc(95dvh - 74px);overflow:auto}#slrFlowTestDialog button{padding:9px 12px;border-radius:8px;border:1px solid #90adc0;background:#e5f2f9;color:#103b54;font-size:13px;font-weight:700;margin:3px}#slrFlowTestDialog .slrDocRow{padding:12px 0;border-bottom:1px solid #ccdae2;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}#slrFlowTestDialog .slrDocRow small{display:block;color:#426476;margin-top:4px}#slrFlowTestDialog #slrFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;margin:15px 0}#slrFlowTestDialog label{color:#244c66;font-size:13px;display:block}#slrFlowTestDialog select,#slrFlowTestDialog input[type=text],#slrFlowTestDialog input[type=date]{width:100%;min-height:38px;padding:7px;margin-top:4px;background:white;color:#142e3e;border-radius:8px;border:1px solid #a8bfca}#slrFlowTestDialog input[type=checkbox]{width:20px;height:20px}#slrStatusText{font-size:13px;line-height:1.5}@media(max-width:650px){#slrFlowTestDialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#slrFlowTestDialog main{max-height:calc(100dvh - 74px)}}';document.head.append(style);
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
async function editDocBasic(cat){
$("slrFields").className="";$("slrFields").replaceChildren();$("slrEditHeading").textContent=cat+" · "+(item.sourceText||item.objectNo||item.id);
const p=await PDFLib.PDFDocument.load(templates[cat].slice(),{ignoreEncryption:true,updateMetadata:false});
const fields=p.getForm().getFields(),values=saved(item,cat).fields||{},defaults=auto(item),id=item.id;
for(const f of fields){const name=f.getName(),k=kind(f);if(!k)continue;const l=elm("label",name);let input;
if(k==="text"){input=elm("input");slrConfigureTextInput(input,name,values[name]??defaults[name]??"");}
else if(k==="check"){input=elm("input");input.type="checkbox";input.checked=values[name]===true;}
else{input=elm("select");const empty=elm("option","Ej valt");empty.value="";input.append(empty);for(const opt of f.getOptions()){const option=elm("option",opt);option.value=opt;input.append(option)}input.value=values[name]||"";}
input.addEventListener("change",()=>{if(item?.id!==id)return;const v=k==="check"?input.checked:input.value;
saved(item,cat).fields[name]=v;if(!item.slrDocuments)item.slrDocuments={};item.slrDocuments[cat]={...(item.slrDocuments[cat]||{}),status:"doing"};bridge?.save?.();bridge?.redraw?.();announce("Ändrat bara för automatik "+id+". Spara projekt-PDF för att flytta arbetet.")});
l.append(input);$("slrFields").append(l)}
$("slrEditHeading").scrollIntoView({block:"start",behavior:"smooth"});
}

/* TEST: SLR form follows the original PDF across five scrollable pages. */
let slrEditorRevision=0;
function slrDirty(obj,cat){if(!obj.slrDocuments)obj.slrDocuments={};obj.slrDocuments[cat]={...(obj.slrDocuments[cat]||{}),status:"doing"};bridge?.save?.();bridge?.redraw?.();}

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
elStyle.textContent="#slrFlowTestDialog #slrFields.slrOriginalPages{display:flex;flex-direction:column;gap:14px;align-items:center;margin:10px 0 24px}.slrOriginalPage{position:relative;flex-shrink:0;background:#fff;border:1px solid #b7cbd5;box-shadow:0 3px 9px #153b5233;overflow:hidden}.slrOriginalPage canvas{display:block}.slrOverlayText{position:absolute;z-index:3;box-sizing:border-box;display:block;min-width:0!important;min-height:0!important;margin:0!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#152733!important;font-family:Arial,Helvetica,sans-serif!important;font-weight:400!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;resize:none}.slrOverlayDate{cursor:pointer!important;color-scheme:light}.slrOverlayDate::-webkit-calendar-picker-indicator{margin:0;padding:0;width:1em;height:1em;cursor:pointer}.slrOverlayText:focus{outline:1px solid #0b87c0!important;outline-offset:0!important;background:#ffffffef!important;z-index:6}.slrOverlayTick{position:absolute;z-index:4;box-sizing:border-box;min-width:0!important;min-height:0!important;display:grid;place-items:center;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#17242d!important;font-family:Arial,sans-serif;font-weight:700;cursor:pointer;line-height:1!important;touch-action:manipulation;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important}.slrOverlayTick.is-chosen{border:0!important;background:transparent!important;color:#0c1820!important;box-shadow:none!important;font-weight:900!important}.slrOverlayTick:focus-visible{outline:2px solid #0277aa!important;outline-offset:2px}.slrChoiceInfo{position:sticky;top:0;z-index:12;box-sizing:border-box;width:100%;padding:9px;color:#174867;background:#e4f5ff;border:1px solid #69b2d4;border-radius:7px;font-size:12px;font-weight:750;line-height:1.4}.slrZoomOptions{width:100%;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.slrZoomOptions button{margin:0!important;min-height:32px!important;padding:6px 11px!important}.slrZoomOptions button[aria-pressed=true]{border:2px solid #0075aa!important;background:#def3ff!important}.slrOriginalPages.slrZoomWide{align-items:flex-start!important}.slrSignatureOnPdf{position:absolute;z-index:5;margin:0!important;padding:1px!important;border:1px dashed #83a9bf!important;border-radius:2px!important;background:#eaf5f9aa!important;font-size:10px!important;overflow:hidden;color:#163e55!important}.slrSignatureDlg{width:min(760px,95vw);border:1px solid #88a8ba;border-radius:10px;background:#f8fbff;padding:14px}.slrSignatureDlg::backdrop{background:#06192dbb}.slrSignatureDlg canvas{width:100%;height:175px;touch-action:none;background:white;border:1px solid #92afc0;display:block;margin:12px 0}.slrSignatureDlg button{padding:8px;margin:4px;border:1px solid #8badbe;border-radius:6px}.slrPdfTip{font-size:12px;line-height:1.5;width:100%;border:1px solid #b7d2df;border-radius:7px;padding:9px;background:#e7f2f8;box-sizing:border-box}@media(max-width:650px){#slrFlowTestDialog main{padding:8px}#slrFlowTestDialog #slrFields.slrOriginalPages{gap:9px}.slrSignatureDlg canvas{height:150px}}";
elStyle.textContent+="#slrFlowTestDialog .slrOriginalPage{cursor:grab}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage{cursor:grabbing}#slrFlowTestDialog .slrOriginalPages.slrMouseDragging .slrOriginalPage canvas{cursor:grabbing}#slrFlowTestDialog .slrOverlayText{cursor:text}#slrFlowTestDialog .slrOverlayTick{cursor:pointer}#slrFlowTestDialog .slrZoomAmount{font-size:12px;font-weight:800;min-width:40px;text-align:center}#slrFlowTestDialog .slrZoomOptions small{font-size:11px;color:#4b6878;line-height:1.4}";document.head.append(elStyle);}
function slrOpenSign(obj,cat,button){
 const d=elm("dialog");d.className="slrSignatureDlg";d.append(elm("strong","Signera riskanalys · "+(obj.sourceText||obj.objectNo||obj.id)));
 const c=elm("canvas");c.width=700;c.height=210;const x=c.getContext("2d");x.strokeStyle="#1c4463";x.lineWidth=3.5;x.lineJoin="round";x.lineCap="round";
 const old=saved(obj,cat).signature;if(old){const img=new Image();img.onload=()=>x.drawImage(img,0,0,c.width,c.height);img.src=old}
 let down=false,prev=null;const at=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.addEventListener("pointerdown",e=>{down=true;prev=at(e);c.setPointerCapture(e.pointerId);e.preventDefault()});
 c.addEventListener("pointermove",e=>{if(!down)return;let p=at(e);x.beginPath();x.moveTo(...prev);x.lineTo(...p);x.stroke();prev=p;e.preventDefault()});
 c.addEventListener("pointerup",()=>down=false);c.addEventListener("pointercancel",()=>down=false);d.append(c);
 const actions=elm("div");
 for(const [label,fn] of [["Rensa",()=>x.clearRect(0,0,c.width,c.height)],["Avbryt",()=>d.close()],["Spara signatur",()=>{const img=c.toDataURL("image/png");saved(obj,cat).signature=img;slrDirty(obj,cat);button.replaceChildren();const picture=elm("img");picture.src=img;picture.style.cssText="width:100%;height:100%;object-fit:contain";button.append(picture);d.close();announce("Signatur sparad för denna dörr. Spara projekt-PDF när du är klar.");}]]){const btn=elm("button",label);btn.type="button";btn.onclick=fn;actions.append(btn)}d.append(actions);document.body.append(d);d.addEventListener("close",()=>d.remove(),{once:true});d.showModal();
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
 if(cat!=="Riskanalys")return editDocBasic(cat);
 const current=item;if(!current||!templates[cat])return;
 const revision=++slrEditorRevision;slrStyles();const host=$("slrFields");slrEnableNavigation(host,cat);host.replaceChildren();host.className="slrOriginalPages";host.classList.toggle("slrZoomWide",slrPageZoom>1);
 $("slrEditHeading").textContent="4. Riskanalys Svängdörr · "+(current.sourceText||current.objectNo||current.id);
 const info=elm("div","Fyll i direkt på SLR:s originalsidor. Scrolla ned för nästa avsnitt. Kund- och dörruppgifter hämtas från projektet; varje automatik får egna riskval.");info.className="slrPdfTip";host.append(info);const controls=elm("div");controls.className="slrZoomOptions";controls.append(elm("strong","Zooma PDF:"));
 const minus=elm("button","−");minus.type="button";minus.title="Zooma ut";minus.onclick=()=>slrZoomTo(cat,slrPageZoom/1.25);controls.append(minus);
 const amount=elm("span",Math.round(slrPageZoom*100)+"%");amount.className="slrZoomAmount";controls.append(amount);
 const plus=elm("button","+");plus.type="button";plus.title="Zooma in";plus.onclick=()=>slrZoomTo(cat,slrPageZoom*1.25);controls.append(plus);
 const guide=elm("small","Två fingrar för zoom på mobilen · + och − på datorn");controls.append(guide);host.append(controls);const status=elm("div","Tryck på en kryssruta. Här visas vilket alternativ du har markerat.");status.id="slrChoiceFeedback";status.className="slrChoiceInfo";host.append(status);
 const storedValues=saved(current,cat).fields||{},defaultValues=auto(current);
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
    if(an.subtype!=="Widget"||!an.rect||!an.fieldName||an.fieldType==="Sig")continue;
    const name=an.fieldName,r=vp.convertToViewportRectangle(an.rect);
    const left=Math.min(r[0],r[2]),top=Math.min(r[1],r[3]),w=Math.abs(r[2]-r[0]),h=Math.abs(r[3]-r[1]);
    if(w<2||h<2)continue;
    if(an.fieldType==="Tx"){
     const ctrl=elm(an.multiLine?"textarea":"input");ctrl.className="slrOverlayText";
     const textValue=storedValues[name]??defaultValues[name]??"";
     if(an.multiLine)ctrl.value=textValue;else slrConfigureTextInput(ctrl,name,textValue);
     const fieldFont=Math.max(4.5,Math.min(h*.84,Math.max(7,Number(an.defaultAppearanceData?.fontSize)||10)*factor));
     ctrl.style.cssText="left:"+left+"px;top:"+top+"px;width:"+w+"px;height:"+h+"px;font-size:"+fieldFont+"px;line-height:"+(an.multiLine?"1.2":h+"px")+";padding:0 "+Math.max(.75,1.6*factor)+"px!important";
     ctrl.title=name;ctrl.setAttribute("aria-label",name);
     ctrl.addEventListener("input",()=>{if(item!==current)return;saved(current,cat).fields[name]=ctrl.value;slrDirty(current,cat)});
     page.append(ctrl);
    }else if(an.fieldType==="Btn"){
     const radio=!!an.radioButton,key=pi===2&&name==="4.6.1"?"4.6.2":name;
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
     btn.onclick=()=>{if(item!==current)return;const values=saved(current,cat).fields;let chosen;
      if(radio){chosen=slrDecode(values[key])!==val;values[key]=chosen?val:"";
       for(const other of page.querySelectorAll(".slrOverlayTick"))if(other.dataset.field===key)slrDrawChoice(other,chosen&&other.dataset.value===val)}
      else{values[name]=!(values[name]===true);chosen=values[name];slrDrawChoice(btn,chosen)}
      slrShowChoice(desc,chosen,pi+1);
      slrDirty(current,cat);
     };page.append(btn);
    }
   }
   if(pi===4){const b=elm("button","✍ Signera här");b.className="slrSignatureOnPdf";b.type="button";
    const sl=140.5,st=584,sw=198.5,sh=35.8;b.style.cssText="left:"+sl*factor+"px;top:"+st*factor+"px;width:"+sw*factor+"px;height:"+sh*factor+"px";
    const img=saved(current,cat).signature;if(img){b.replaceChildren();const picture=elm("img");picture.src=img;picture.style.cssText="width:100%;height:100%;object-fit:contain";b.append(picture)}
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
async function saveTo(doc,payload){
 await loadTemplates();
 const enabled=Object.keys(templates);if(!enabled.length)return;
 const prefix="slrtest-"+Date.now().toString(36),refs={},each={};
 for(const cat of enabled){
  const ext=(names[cat]?.match(/\.(png|jpe?g)$/i)?.[1]||"pdf").toLowerCase();
  const fn=prefix+"-mall-"+safe(cat)+"."+ext;
  refs[cat]=fn;
  await doc.attach(templates[cat],fn,{mimeType:ext==="pdf"?"application/pdf":ext==="png"?"image/png":"image/jpeg",description:"SLR-projektmall. Individuella uppgifter sparas per automatik i projektet."});
 }
 for(const o of Array.isArray(payload?.automationItems)?payload.automationItems:[]){
  each[o.id]={};
  for(const cat of enabled)each[o.id][cat]=refs[cat];
 }
 doc.catalog.set(PDFLib.PDFName.of("TillsynoSLRTestManifest"),
  PDFLib.PDFHexString.fromText(JSON.stringify({schema:2,templates:refs,each,names,storage:"shared-templates-and-per-door-fields"})));
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