const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const PDFLib=require(path.join(ROOT,'vendor/pdf-lib.min.js'));
const pdfjsLib=require(path.join(ROOT,'vendor/pdf.min.js'));pdfjsLib.GlobalWorkerOptions.workerSrc=path.join(ROOT,'vendor/pdf.worker.min.js');
const JSZip=require(path.join(ROOT,'vendor/jszip-3.10.1.min.js'));
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const elements={},metaInputs=[];
class Element{constructor(){this.style={};this.dataset={};this.children=[];this.value='';this.disabled=false;this.hidden=false;this.classList={add(){},remove(){},toggle(){}};}after(){}addEventListener(){}replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}setAttribute(){}focus(){}scrollIntoView(){}querySelectorAll(){return [];}querySelector(){return null;}}
const html=fs.readFileSync(path.join(ROOT,'project-ce-markning-test-v3.html'),'utf8');
for(const match of html.matchAll(/\bid="([^"]+)"/g))elements[match[1]]=new Element();
for(const match of html.matchAll(/\bdata-meta="([^"]+)"/g)){const input=new Element();input.dataset.meta=match[1];metaInputs.push(input);}
const document={getElementById:id=>elements[id]||null,querySelectorAll:selector=>selector==='[data-meta]'?metaInputs:[],querySelector:()=>null,addEventListener(){},createElement:()=>new Element(),createElementNS:()=>new Element(),body:new Element(),head:new Element(),hidden:false};
const context={window:{JSZip,addEventListener(){}},document,PDFLib,pdfjsLib,console,Set,Map,Date,JSON,Math,Uint8Array,Blob,URL,structuredClone,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,atob, btoa};
context.window.window=context.window;Object.assign(globalThis,{window:context.window,document,PDFLib,pdfjsLib});
let moduleSource=fs.readFileSync(path.join(ROOT,'project-ce-markning-test-v3-module.js'),'utf8');
moduleSource=moduleSource.replace('window.TillsynoCETest={', `const originalDraw=draw;draw=()=>{};announce=()=>{};slrRefreshProfilePanel=()=>{};slrRefreshFolderStatuses=()=>{};
window.CEVerify={context(obj,b,scope){item=obj;bridge=b;slrEditScope=scope;},draw:originalDraw,write:slrWriteField,effective:slrEffectiveFields,editing:slrEditingFields,folder:slrFolderPercent,prepare:prepareTemplate,complete:slrComplete};
window.TillsynoCETest={`);
vm.runInThisContext(moduleSource);
const api=context.window.TillsynoCETest,check=context.window.CEVerify;
const cats=['Riskanalys','Beskrivning av maskin','Loggbok','Tillverkarens försäkran','Produktlista','Egenkontroll','CE-skylt'];
const doors=[{id:'a',sourceText:'TEST-28-24-2',objectNo:'TEST-28',modelCode:'24',serialNumber:'2',location:'Entré A',type:'glass'},{id:'b',sourceText:'TEST-29-24-1',objectNo:'TEST-29',modelCode:'24',serialNumber:'1',location:'Korridor B',type:'glass'},{id:'c',sourceText:'TEST-30-37-1',objectNo:'TEST-30',modelCode:'37',serialNumber:'1',location:'Entré C',type:'noGlass'}];
let saves=0;const bridge={save(){saves++;},redraw(){},getItems:()=>doors,getProjectMeta:()=>({projectName:'Synthetic test',customer:'Testkund',address:'Testgata'})};
async function template(){
 const pdf=await PDFLib.PDFDocument.create(),form=pdf.getForm();
 const fields={};for(const key of ['Maskin ID','Dörrnummer, beteckning','Plats i byggnaden','Kommentar','Datum','Tillverkare företagsnamn'])fields[key]=form.createTextField(key);
 const box=form.createCheckBox('Check A');
 for(let n=0;n<3;n++){const p=pdf.addPage([595,842]);let y=780;for(const field of Object.values(fields)){field.addToPage(p,{x:40,y,width:400,height:20});y-=35;}box.addToPage(p,{x:40,y:400,width:18,height:18});}
 return new Uint8Array(await pdf.save());
}
async function textPages(bytes){const doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;try{const result=[];for(let n=1;n<=doc.numPages;n++)result.push((await (await doc.getPage(n)).getTextContent()).items.map(x=>x.str).join(' '));return result;}finally{await doc.destroy();}}
async function metadata(bytes){const pdf=await PDFLib.PDFDocument.load(bytes.slice());return {pdf,data:JSON.parse(pdf.catalog.get(PDFLib.PDFName.of('TillsynoCETestData')).decodeText()),manifest:JSON.parse(pdf.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest')).decodeText())};}
(async()=>{
 const raw=await template(),prepared=await check.prepare(raw,'Riskanalys');
 assert.deepEqual(Buffer.from(await check.prepare(prepared,'Riskanalys')),Buffer.from(prepared),'template preparation must be idempotent');
 const templates={},names={};for(const cat of cats.filter(c=>c!=='CE-skylt'&&c!=='Produktlista')){templates[cat]=prepared.slice();names[cat]=cat+'.pdf';}
 api.restoreAssets({templates,names,productFiles:{}});for(const door of doors)api.assignProfile(door,door.type);await api.loadTemplates();
 check.context(doors[0],bridge,'profile');check.write(doors[0],'Riskanalys','Kommentar','Gemensamt glas');check.write(doors[0],'Riskanalys','Check A',true);check.write(doors[0],'Riskanalys','Datum','2026-10-14');check.write(doors[0],'Riskanalys','Tillverkare företagsnamn','Företag A');
 assert.equal(check.effective(doors[1],'Riskanalys').Kommentar,'Gemensamt glas');assert.equal(check.folder(doors[1],'Riskanalys'),50);
 assert.equal(check.effective(doors[1],'Riskanalys')['Check A'],true);assert.equal(check.effective(doors[1],'Egenkontroll')['Tillverkare företagsnamn'],'Företag A');
 assert.equal(check.effective(doors[2],'Riskanalys').Kommentar,undefined);assert.equal(check.folder(doors[2],'Riskanalys'),0);
 check.context(doors[1],bridge,'door');check.write(doors[1],'Riskanalys','Kommentar','Eget undantag');check.write(doors[1],'Riskanalys','Check A',false);check.write(doors[1],'Riskanalys','Datum','');
 check.context(doors[0],bridge,'profile');check.write(doors[0],'Riskanalys','Kommentar','Ny standard');check.write(doors[0],'Riskanalys','Check A',true);
 assert.equal(check.effective(doors[1],'Riskanalys').Kommentar,'Eget undantag');assert.equal(check.effective(doors[1],'Riskanalys')['Check A'],false);assert.equal(check.effective(doors[1],'Riskanalys').Datum,'');
 check.context(doors[1],bridge,'profile');assert.equal(check.editing(doors[1],'Riskanalys').Kommentar,'Ny standard');check.write(doors[1],'Riskanalys','Kommentar','Nästa standard');assert.equal(check.effective(doors[1],'Riskanalys').Kommentar,'Eget undantag');
 check.write(doors[1],'Riskanalys','Maskin ID','WRONG');check.write(doors[1],'Riskanalys','Plats i byggnaden','WRONG');assert.equal(check.effective(doors[1],'Riskanalys')['Maskin ID'],undefined);
 const composed=await api.compose('Riskanalys',doors[1]),pages=await textPages(composed);assert.equal(pages.length,3);for(const page of pages){assert(page.includes(doors[1].sourceText),page);assert(page.includes(doors[1].location),page);assert(page.includes('Eget undantag'),page);assert(!page.includes('WRONG'));}
 const flattened=await PDFLib.PDFDocument.load(composed);assert.equal(flattened.getForm().getFields().length,0);
 const productPdf=await PDFLib.PDFDocument.create();productPdf.addPage();const productBytes=new Uint8Array(await productPdf.save());
 const saved=api.payload();saved.signatureLibrary={s1:png};saved.doorSignatures={a:'@sig:s1'};saved.doorPhotos={a:{name:'CE.png',type:'image/png',dataUrl:png}};
 saved.reviewedFolders={a:Object.fromEntries(cats.map(cat=>[cat,true]))};api.restore({slrTestData:saved});
 const assets=api.assets();assets.productFiles.a={bytes:productBytes,name:'test-product.pdf',designation:doors[0].sourceText,format:'manual-ce-v3',gsCode:'',cardPage:0};
 assert.equal(api.getProgress(doors[0]),99,'all reviewed folders still require Klart');check.context(doors[0],bridge,'profile');await check.complete();assert.equal(api.getProgress(doors[0]),100);assert.notEqual(api.getProgress(doors[1]),100);
 check.write(doors[0],'Riskanalys','Tillverkare företagsnamn','Företag B');assert.notEqual(api.getProgress(doors[0]),100,'shared changes reopen affected completion');
 assert.equal(Object.keys(api.payload().signatureLibrary).length,1);
 const hostState={format:'Tillsyno CE-märkning TEST 3',schema:3,meta:bridge.getProjectMeta(),doors,selected:'a',slrTestData:api.payload()};
 let hostSource=fs.readFileSync(path.join(ROOT,'project-ce-markning-test-v3.js'),'utf8');
 const boot=hostSource.lastIndexOf('(async()=>{try{');assert(boot>=0);
 hostSource=hostSource.slice(0,boot)+`window.CEHostVerify={setState(value){state=value;},bind(){window.CEVerify.context(state.doors[0],bridge,'profile');},setMeta:setProjectField,meta:()=>state.meta,build:buildProjectPdf,validate:validateState};\n})();`;
 vm.runInThisContext(hostSource);context.window.CEHostVerify.setState(hostState);
 const sizes=[];
 for(let pass=0;pass<3;pass++){
  const result=await context.window.CEHostVerify.build();sizes.push(result.bytes.length);
  const {pdf,data,manifest}=await metadata(result.bytes);assert.equal(data.doors.length,3);assert.equal(Object.keys(manifest.templates).length,5);assert.equal(Object.keys(manifest.products).length,1);assert.equal(Object.keys(data.slrTestData.signatureLibrary).length,1);
  assert.equal(Object.keys(manifest.each.a).length,1,'only individualized product PDF is embedded per door');
  api.initProject(pdf,data,result.bytes);await api.loadTemplates();
  assert.equal(check.effective(data.doors[1],'Riskanalys').Kommentar,'Eget undantag');assert.equal(check.effective(data.doors[1],'Riskanalys')['Check A'],false);assert.equal(check.effective(data.doors[1],'Riskanalys').Datum,'');
  context.window.CEHostVerify.setState(data);
 }
 assert(Math.max(...sizes)-Math.min(...sizes)<300,'repeated save/restore should not accumulate documents: '+sizes.join(','));
 const host=context.window.CEHostVerify;
 const previous={format:'Tillsyno CE-märkning TEST 2',schema:2,meta:{projectName:'Gammalt objekt',address:'Gammal adress',company:'Gammalt företag',companyPhone:'0100000000',technician:'Tekniker'},doors:structuredClone(doors),selected:'a',slrTestData:api.payload()};
 const upgraded=host.validate(structuredClone(previous));assert.equal(upgraded.schema,3);assert.equal(upgraded.format,'Tillsyno CE-märkning TEST 3');assert.equal(upgraded.meta.siteAddress,'Gammal adress');assert.equal(upgraded.meta.technicianCompany,'Gammalt företag');assert.equal(previous.schema,2);
 host.setState(upgraded);host.bind();
 host.setMeta('company','Ny maskintillverkare');host.setMeta('companyOrgNo','556000-0000');host.setMeta('siteAddress','Arbetsplats 1');host.setMeta('sitePostalPlace','432 00 Ort');host.setMeta('address','Beställaradress 2');host.setMeta('technician','Testtekniker');host.setMeta('technicianCompany','Utförande firma');host.setMeta('technicianPhone','0101234567');host.setMeta('date','2026-10-14');
 assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['Tillverkare företagsnamn'],'Ny maskintillverkare');assert.equal(check.effective(upgraded.doors[0],'Loggbok')['Tillverkare org. nr'],'556000-0000');
 assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['Adress rad 1'],'Arbetsplats 1');assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['Beställare adress'],'Beställaradress 2');
 assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['4.7 Namn'],'Testtekniker');assert.equal(check.effective(upgraded.doors[0],'Egenkontroll')['Riskanalys utförd av'],'Testtekniker');assert.equal(check.effective(upgraded.doors[0],'Loggbok')['6.5.1 Tekniker'],'Testtekniker');assert.equal(check.effective(upgraded.doors[0],'Loggbok')['6.5.2 Tekniker'],undefined);
 check.context(upgraded.doors[1],{getProjectMeta:host.meta,getItems:()=>upgraded.doors,save(){},redraw(){}},'door');check.write(upgraded.doors[1],'Riskanalys','Tillverkare företagsnamn','Endast dörr B');host.setMeta('company','Ytterligare företag');assert.equal(check.effective(upgraded.doors[1],'Riskanalys')['Tillverkare företagsnamn'],'Endast dörr B');
 host.bind();host.setMeta('company','');assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['Tillverkare företagsnamn'],'','explicit blank project value must clear old common fields');
 host.setMeta('egSignerName','EG-undertecknare');host.setMeta('documentationName','Dokumentationsansvarig');assert.equal(check.effective(upgraded.doors[0],'Tillverkarens försäkran').Namnförtydligande,'EG-undertecknare');assert.equal(check.effective(upgraded.doors[0],'Tillverkarens försäkran')['Dokumentation Namn'],'Dokumentationsansvarig');assert.equal(check.effective(upgraded.doors[0],'Riskanalys')['4.7 Namn'],'Testtekniker');
 console.log(JSON.stringify({checks:'shared glass profile; no-glass isolation; per-door text/false/blank overrides; identity and placement on all three pages; shared risk headers; flattened real PDFs; manual product list; explicit Klart; deduplicated signature; shared templates; verified save/restore',pdfSizes:sizes,browser:'No local Chromium available; physical phone layout remains to test.'},null,2));
 console.log('PASS: real pdf-lib and PDF.js composition/save/restore, TEST 2 migration, project-to-document bindings, separate addresses, performer fields, existing overrides and explicit blank edits. PDF sizes: '+sizes.join(', ')+' bytes. State saves invoked: '+saves+'.');
 elements.slrTestDocRows=new Element();elements.slrEditor=new Element();elements.slrEditor.hidden=true;host.bind();check.draw();
 const riskRow=elements.slrTestDocRows.children.find(row=>row.dataset.slrCategory==='Riskanalys');assert(riskRow);const actionRow=riskRow.children.find(row=>row.className==='slrFolderActions ceDocActions');assert(actionRow);assert.equal(actionRow.children.length,5);assert.deepEqual(actionRow.children.slice(0,4).map(button=>button.children[1].textContent),['Fil','Visa','Fyll i','Kontroll']);
 console.log('PASS: actual document renderer produces one four-action toolbar plus the door-specific menu.');process.exit(0);
})().catch(error=>{console.error(error);process.exitCode=1;});
