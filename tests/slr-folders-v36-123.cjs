const fs=require('fs'),path=require('path'),assert=require('assert');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
const PDFLib=require(path.join(runtime,'pdf-lib')),JSZip=require(path.join(runtime,'jszip'));
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.hidden=false;this.events={};this.textContent='';this.attributes={};this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);this.children.push(n);n.parentElement=this;}}
 after(node){const p=this.parentElement;if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);p.children.splice(p.children.indexOf(this)+1,0,node);node.parentElement=p;}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(n,fn){this.events[n]=fn;}setAttribute(n,v){this.attributes[n]=v;}scrollIntoView(){}close(){this.open=false;}
}
const body=new Element('body'),head=new Element('head'),walk=e=>[e,...e.children.flatMap(walk)];
const document={body,head,createElement:tag=>new Element(tag),querySelectorAll:s=>s==='[data-slr-edit]'?walk(body).filter(e=>e.dataset.slrEdit):[],getElementById:id=>walk(body).find(e=>e.id===id)||null};
const node=(tag,id,parent=body)=>{const e=new Element(tag);e.id=id;parent.append(e);return e;};
const dialog=node('dialog','slrFlowTestDialog'),main=node('main','main',dialog),root=node('div','slrTestDocRows',main),editor=node('section','slrEditor',main);editor.hidden=true;
node('h3','slrEditHeading',editor);node('div','slrFields',editor);node('p','slrStatusText',main);node('button','slrDoneDoor',main);
node('select','slrDoorProfile',main);node('small','slrDoorProfileCaption',main);node('button','slrSaveProfileChecks',main);node('button','slrResetDoorChecks',main);
const window={JSZip},png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function attachments(pdf){const result={},N=PDFLib.PDFName.of,names=pdf.catalog.lookupMaybe(N('Names'),PDFLib.PDFDict)?.lookupMaybe(N('EmbeddedFiles'),PDFLib.PDFDict)?.lookupMaybe(N('Names'),PDFLib.PDFArray);if(!names)return result;for(let i=0;i<names.size();i+=2){const name=names.get(i).decodeText(),spec=pdf.context.lookup(names.get(i+1)),stream=spec.lookup(N('EF'),PDFLib.PDFDict).lookup(N('F'));result[name]={content:PDFLib.decodePDFRawStream(stream).decode()};}return result;}
const pdfjsLib={getDocument:({data})=>({promise:PDFLib.PDFDocument.load(data).then(pdf=>({getAttachments:async()=>attachments(pdf),destroy:async()=>{}}))})};
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-slr-test-module-v36-123.js'),'utf8').replace('await flattenDocument(pdf);','if(!window.keepEditable)await flattenDocument(pdf);').replace('window.SmartMatchSLRTest=',`window.probe={cats,saved,compose,slrEffectiveFields,slrCaptureProfile,slrDirty,slrComplete,slrStoreSignatureImage,slrOpenSign,slrApplySignature,draw,slrMountEditor,slrCloseEditor,slrSetDoorProfile,slrResetCurrentDoor,set:(obj,b)=>{item=obj;bridge=b;},templates:v=>{templates=v;templatesLoaded=true;for(const c of Object.keys(v))names[c]='template.pdf';},products:v=>productFiles=v,photo:(id,v)=>doorPhotos[id]=v,completed:()=>completedDoors,loadTemplates};window.SmartMatchSLRTest=`);
new Function('window','document','PDFLib','pdfjsLib',source)(window,document,PDFLib,pdfjsLib);
const api=window.SmartMatchSLRTest,p=window.probe;
const a={id:'door-a',objectNo:'20-01-54-7-8',modelCode:'24',serialNumber:'1',slrDocuments:{}},b={id:'door-b',objectNo:'20-01-54-7-8',modelCode:'24',serialNumber:'11',slrDocuments:{}},c={id:'door-c',objectNo:'20-01-54-7-8',modelCode:'24',serialNumber:'12',slrDocuments:{}};
const bridge={getItems:()=>[a,b,c],getProjectMeta:()=>({projectName:'Testprojekt',company:'Testbolag'}),save(){},redraw(){}};
window.SmartMatchDALink={getSLRSource:()=>({gs:{code:'GS1'},cardPage:1})};
async function formTemplate(){const doc=await PDFLib.PDFDocument.create(),page=doc.addPage([595,842]),f=doc.getForm();for(const [i,name]of ['Maskin ID','Installationsdatum','Sensor','Kommentar'].entries())f.createTextField(name).addToPage(page,{x:40,y:730-i*45,width:200,height:20});f.createCheckBox('Kryss').addToPage(page,{x:300,y:700,width:12,height:12});return new Uint8Array(await doc.save());}
(async()=>{
 const template=await formTemplate(),blank={};for(const cat of p.cats)if(!['Produktlista','CE-skylt'].includes(cat))blank[cat]=template;p.templates(blank);p.set(a,bridge);
 assert.equal(p.cats.length,7);assert(!p.cats.includes('Godkännande'));assert.equal(p.cats[6],'CE-skylt');
 const entry=p.saved(a,'Riskanalys');entry.fields={Sensor:'Flatscan',Installationsdatum:'2026-10-13',Kryss:true,Kommentar:'Standardtext','Maskin ID':'SHOULD NOT COPY'};
 p.slrSetDoorProfile('glass');await p.slrCaptureProfile();assert.equal(api.payload().profiles.glass.Riskanalys.Sensor,'Flatscan');assert.equal(api.payload().profiles.glass.Riskanalys.Installationsdatum,'2026-10-13');assert(!('Maskin ID' in api.payload().profiles.glass.Riskanalys));
 p.set(b,bridge);p.slrSetDoorProfile('glass');assert.equal(p.slrEffectiveFields(b,'Riskanalys').Sensor,'Flatscan');assert.equal(p.slrEffectiveFields(b,'Riskanalys').Installationsdatum,'2026-10-13');
 p.saved(b,'Riskanalys').fields.Installationsdatum='2026-10-16';p.slrDirty(b,'Riskanalys');assert.equal(p.slrEffectiveFields(b,'Riskanalys').Installationsdatum,'2026-10-16');assert.equal(p.slrEffectiveFields(a,'Riskanalys').Installationsdatum,'2026-10-13');assert.equal(p.slrEffectiveFields(b,'Riskanalys').Sensor,'Flatscan');
 p.saved(b,'Riskanalys').fields.Kryss=false;p.saved(b,'Riskanalys').fields.Kommentar='';assert.equal(p.slrEffectiveFields(b,'Riskanalys').Kryss,false);assert.equal(p.slrEffectiveFields(b,'Riskanalys').Kommentar,'');
 p.set(c,bridge);p.slrSetDoorProfile('noGlass');p.saved(c,'Riskanalys').fields.Sensor='Utan glas sensor';await p.slrCaptureProfile();assert.equal(p.slrEffectiveFields(a,'Riskanalys').Sensor,'Flatscan');assert.equal(p.slrEffectiveFields(c,'Riskanalys').Sensor,'Utan glas sensor');
 window.keepEditable=true;p.set(b,bridge);let out=await PDFLib.PDFDocument.load(await p.compose('Riskanalys',b));assert.equal(out.getForm().getTextField('Maskin ID').getText(),'20-01-54-7-8-24-11');assert.equal(out.getForm().getTextField('Sensor').getText(),'Flatscan');assert.equal(out.getForm().getTextField('Installationsdatum').getText(),'2026-10-16');assert(!out.getForm().getCheckBox('Kryss').isChecked());
 const ref=p.slrStoreSignatureImage(png),button=new Element('button');p.slrOpenSign(b,'Loggbok',button);assert.equal(p.saved(b,'Loggbok').signature,ref);assert(!p.saved(a,'Loggbok').signature);assert.equal(Object.keys(api.payload().signatureLibrary).length,1);
 p.draw();assert.equal(root.children.length,7);assert(root.children.every(e=>e.tagName==='details'));assert(root.children.every(e=>e.children[0].tagName==='summary'));
 p.slrMountEditor('Riskanalys');assert.equal(editor.parentElement.dataset.slrCategory,'Riskanalys');p.slrCloseEditor();assert(editor.hidden);
 assert.equal(api.getProgress(a),0);assert.notEqual(api.getProgress(b),100);p.set(a,bridge);await p.slrComplete();assert.equal(api.getProgress(a),0);assert(document.getElementById('slrStatusText').textContent.includes('Produktlista'));
 const doc=await PDFLib.PDFDocument.create();doc.addPage([595,842]).drawText('Produktlista fixture');const product=new Uint8Array(await doc.save());p.products(Object.fromEntries([a,b].map(o=>[o.id,{bytes:product,format:'two-columns-v1',gsCode:'GS1',cardPage:1,designation:o.id,rowCount:1}])));
 p.photo(a.id,{name:'CE-skylt.png',type:'image/png',dataUrl:png});p.photo(b.id,{name:'CE-skylt.png',type:'image/png',dataUrl:png});
 await p.slrComplete();assert.equal(api.getProgress(a),100);assert.notEqual(api.getProgress(b),100);p.set(b,bridge);await p.slrComplete();assert.equal(api.getProgress(b),100);assert.equal(api.getProgress(c),0);
 window.keepEditable=false;const archive=await api.buildFolderArchive([a,b],bridge),zip=await JSZip.loadAsync(archive.bytes,{checkCRC32:true}),files=Object.values(zip.files).filter(f=>!f.dir);assert.equal(files.length,14);assert(files.every(f=>f.name.startsWith('Testprojekt/')));assert(files.some(f=>f.name.includes('/20-01-54-7-8-24-11/7. CE-skylt/')));assert(!files.some(f=>/Godkännande|Försäkringscertifikat|brukaransvarig/.test(f.name)));
 for(const f of files.filter(f=>f.name.endsWith('.pdf'))){const doc=await PDFLib.PDFDocument.load(await f.async('uint8array'));assert(doc.getPageCount()>0);if(!f.name.includes('Produktlista'))assert(!doc.catalog.get(PDFLib.PDFName.of('AcroForm')));}
 await assert.rejects(()=>api.buildFolderArchive([c],bridge),/inte klarmarkerad/);
 fs.mkdirSync(path.join(__dirname,'../test-output'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../test-output/slr-folders.zip'),archive.bytes);
 const project=await PDFLib.PDFDocument.create();project.addPage();await project.attach(new Uint8Array([65,66]),'customer.txt');let bytes=new Uint8Array(await project.save());
 const mainSource=fs.readFileSync(path.join(__dirname,'../smartmatch-slr-test-main-v36-123.js'),'utf8');
 const prune=mainSource.slice(mainSource.indexOf('function smartCompactPruneUnreachablePdfObjects('),mainSource.indexOf('/* v35: PDF outline/'));
 const exportCode=mainSource.slice(mainSource.indexOf('async function buildPortableProjectPdf('),mainSource.indexOf('function downloadProjectFile('));
 const buildAndVerify=(data)=>new Function('PDFLib','window','bytes','appendCompactProjectPdf','smartFlattenDrawingNotes','parsePdfEmbeddedJson',prune+exportCode+';return {buildPortableProjectPdf,verifyPortableProjectPdf}')(PDFLib,window,data,async doc=>doc.catalog.set(PDFLib.PDFName.of('SmartMatch36ProgressStreams'),doc.context.obj([])),async doc=>doc.catalog.set(PDFLib.PDFName.of('SmartMatch106NoteStreams'),doc.context.obj([])),obj=>JSON.parse(obj.decodeText()));
 const sizes=[];
 for(let i=0;i<3;i++){
  const payload={automationItems:[a,b,c],slrTestData:JSON.parse(JSON.stringify(api.payload())),drawingNotes:[],instances:{}};
  const functions=buildAndVerify(bytes);bytes=await functions.buildPortableProjectPdf(payload);await functions.verifyPortableProjectPdf(bytes,payload);sizes.push(bytes.length);
 }
 const archived=await PDFLib.PDFDocument.load(bytes),embedded=attachments(archived);assert.equal(Object.keys(embedded).length,8);assert(embedded['customer.txt']);assert.equal(archived.getPageCount(),1);assert(sizes[2]-sizes[0]<300,'Unexpected project growth: '+sizes);
 const stateFromPdf=JSON.parse(archived.catalog.get(PDFLib.PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
 api.initProject(archived,stateFromPdf,bytes);await p.loadTemplates();p.set(b,bridge);assert.equal(api.getProgress(a),100);assert.equal(api.getProgress(b),100);assert.equal(p.slrEffectiveFields(b,'Riskanalys').Installationsdatum,'2026-10-16');assert(api.payload().doorPhotos[a.id]);assert.equal(Object.keys(api.payload().signatureLibrary).length,1);
 fs.writeFileSync(path.join(__dirname,'../test-output/slr-project.pdf'),bytes);console.log('Production project save/verify x3, sizes: '+sizes.join(', '));
 const reopened=await api.buildFolderArchive([a,b],bridge);assert(reopened.bytes.length>0);
 p.saved(b,'Riskanalys').fields.Sensor='Ny sensor';p.slrDirty(b,'Riskanalys');assert.notEqual(api.getProgress(b),100);assert.equal(api.getProgress(a),100);assert(!api.payload().completedDoors[b.id]);
 p.set(a,bridge);await p.slrCaptureProfile();assert.notEqual(api.getProgress(a),100);assert.equal(p.slrEffectiveFields(b,'Riskanalys').Sensor,'Ny sensor');
 // Old v36.122 checkbox profiles and signatures remain readable; approval is not inferred.
 api.restore({slrTestData:{schema:2,answers:{},profiles:{glass:{Riskanalys:{Kryss:true}}},doorProfiles:{[c.id]:'glass'},signatureLibrary:{}}});assert.equal(p.slrEffectiveFields(c,'Riskanalys').Kryss,true);
 console.log('PASS v36.123: 7 folders; glass/no-glass full text/date/check profiles; individual false/empty/date overrides; automatic project-signature reuse on click; door identity; explicit completion; edited doors reopen; 14-file ZIP; flattened customer PDFs; photo and signature save/reopen; 7 shared SLR attachments + preserved customer attachment; production project exporter x3; legacy profiles.');
})().catch(err=>{console.error(err);process.exitCode=1});
