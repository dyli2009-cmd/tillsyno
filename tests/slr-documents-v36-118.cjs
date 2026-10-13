const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert");
const PDFLib=require(path.resolve(process.env.SLR_PDF_LIB||path.join(__dirname,"../vendor/pdf-lib.min.js")));
const modulePath=process.argv[2]||path.join(__dirname,"../smartmatch-slr-test-module-v36-118.js");
const templatesPath=process.argv[3]||path.join(__dirname,"../templates/slr-test-v36-118");
const source=fs.readFileSync(modulePath,"utf8"),output=process.env.SLR_TEST_OUTPUT;
const status={style:{},textContent:""};
const context={PDFLib,Uint8Array,Date,console,pdfjsLib:require(path.resolve(process.env.SLR_PDF_JS||path.join(__dirname,"../vendor/pdf.min.js"))),fetch:async()=>{throw Error("Unexpected network request")},document:{getElementById:id=>id==="slrStatusText"?status:null,querySelectorAll:()=>[]},window:{}};
const instrumented=source.replace("await flattenDocument(pdf);","if(!window.__keepEditable)await flattenDocument(pdf);").replace("window.SmartMatchSLRTest=","window.__probe={compose,prepareTemplate,slrMachine,slrProductRows,slrOwnProducts,saved,createProductList,loadTemplates,setTemplates:v=>{templates=v;templatesLoaded=true;},setActive:(o,b,v)=>{item=o;bridge=b;verificationByDoor[o.id]=v;},product:id=>productFiles[id]};window.SmartMatchSLRTest=");
new Function("PDFLib","window","document","Uint8Array","fetch","pdfjsLib",instrumented)(PDFLib,context.window,context.document,Uint8Array,context.fetch,context.pdfjsLib);
context.pdfjsLib.GlobalWorkerOptions.workerSrc=path.resolve(process.env.SLR_PDF_WORKER||path.join(__dirname,"../vendor/pdf.worker.min.js"));
const probe=context.window.__probe,api=context.window.SmartMatchSLRTest;
const files={"Beskrivning av maskin":"description","Loggbok":"logbook","Tillverkarens försäkran":"declaration","Egenkontroll":"selfcheck"};
const blank={};for(const [category,name]of Object.entries(files))blank[category]=new Uint8Array(fs.readFileSync(path.join(templatesPath,name+".pdf")));
const a={id:"physical-a",objectNo:"200154-28",modelCode:"24",serialNumber:"1",model:"ED100"},b={id:"physical-b",objectNo:"200154-28",modelCode:"24",serialNumber:"11",model:"ED100"};
const bridge={getProjectMeta:()=>({customer:"Testkund",company:"Testbolag",contact:"Kontakt",order:"AO-123"}),save(){},redraw(){}};
const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
function attachments(pdf){const result={},names=pdf.catalog.lookup(PDFLib.PDFName.of("Names"),PDFLib.PDFDict).lookup(PDFLib.PDFName.of("EmbeddedFiles"),PDFLib.PDFDict).lookup(PDFLib.PDFName.of("Names"),PDFLib.PDFArray);for(let i=0;i<names.size();i+=2){const name=names.get(i).decodeText(),spec=pdf.context.lookup(names.get(i+1)),stream=spec.lookup(PDFLib.PDFName.of("EF"),PDFLib.PDFDict).lookup(PDFLib.PDFName.of("F"));result[name]={content:PDFLib.decodePDFRawStream(stream).decode()};}return result;}
(async()=>{
 context.window.__keepEditable=true;assert.deepEqual(probe.slrMachine({model:"Dorma ED 100"}),{brand:"Dorma",model:"ED100"});
 await probe.loadTemplates();assert.equal(Object.keys(api.payload().names).length,0);
 blank.Egenkontroll=await probe.prepareTemplate(blank.Egenkontroll,"Egenkontroll");
 probe.setTemplates(blank);probe.setActive(a,bridge,{});
 for(const [category,bytes]of Object.entries(blank)){
  const original=await PDFLib.PDFDocument.load(bytes),form=original.getForm(),dateField=form.getFields().find(f=>/datum$/i.test(f.getName())&&f instanceof PDFLib.PDFTextField),check=form.getFields().find(f=>f instanceof PDFLib.PDFCheckBox),sig=form.getFields().find(f=>f instanceof PDFLib.PDFSignature),entry=probe.saved(a,category);
  let first=await PDFLib.PDFDocument.load(await probe.compose(category,a));
  assert.equal(first.getForm().getTextField("Maskin ID").getText(),"200154-28-24-1");
  for(const f of first.getForm().getFields()){if(f instanceof PDFLib.PDFCheckBox)assert.equal(f.isChecked(),false);if(f instanceof PDFLib.PDFRadioGroup)assert.equal(f.getSelected(),undefined);if(f instanceof PDFLib.PDFDropdown)assert.equal(f.getSelected().length,0);}
  if(dateField)entry.fields[dateField.getName()]="2026-10-13";
  if(check)entry.fields[check.getName()]=true;
  if(sig){const widget=sig.acroField.getWidgets()[0],r=widget.getRectangle();const pageRef=widget.dict.get(PDFLib.PDFName.of("P"));const pageIndex=original.getPages().findIndex(p=>p.ref.toString()===pageRef.toString());assert(pageIndex>=0);entry.signatures={[sig.getName()]:{image:signature,page:pageIndex,rect:[r.x,r.y,r.x+r.width,r.y+r.height]}};}
  first=await PDFLib.PDFDocument.load(await probe.compose(category,a));
  if(dateField)assert.equal(first.getForm().getTextField(dateField.getName()).getText(),"2026-10-13");
  if(check)assert.equal(first.getForm().getCheckBox(check.getName()).isChecked(),true);
  const second=await PDFLib.PDFDocument.load(await probe.compose(category,b));
  assert.equal(second.getForm().getTextField("Maskin ID").getText(),"200154-28-24-11");
  if(dateField)assert.equal(second.getForm().getTextField(dateField.getName()).getText(),undefined);
  if(check)assert.equal(second.getForm().getCheckBox(check.getName()).isChecked(),false);
  context.window.__keepEditable=false;
  const final=await probe.compose(category,a),flat=await PDFLib.PDFDocument.load(final);
  assert(!flat.catalog.get(PDFLib.PDFName.of("AcroForm")));
  for(const page of flat.getPages())assert(!page.node.Annots());
  if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,files[category]+"-a.pdf"),final);}
  context.window.__keepEditable=true;
 }
 const original=await PDFLib.PDFDocument.create();for(const text of ["GS1 STEP92","GS2 ED100 FLATSCAN"]){const p=original.addPage([595,842]);p.drawText(text,{x:45,y:750});}
 const originalBytes=new Uint8Array(await original.save()),sourceB={gs:{code:"GS2"},cardPage:2,cardPages:[2]};
 bridge.getOriginalPdfBytes=()=>originalBytes;bridge.readPageText=async page=>({items:[{text:"Daglåsning",x:40,y:700,h:8,w:60},{text:"Låshus",x:40,y:680,h:8,w:30},{text:page===2?"M32":"ASSA 2002",x:140,y:680,h:8,w:60},{text:"DT",x:250,y:680,h:8,w:12},{text:"Sensor",x:40,y:660,h:8,w:30},{text:"Flatscan",x:140,y:660,h:8,w:50},{text:"GS",x:250,y:660,h:8,w:12}]});
 probe.setActive(b,bridge,sourceB);await probe.createProductList(b);const product=probe.product(b.id);assert(product,status.textContent);assert.equal(product.gsCode,"GS2");assert.equal(product.designation,"200154-28-24-11");assert.equal(probe.product(a.id),undefined);const pdf=await PDFLib.PDFDocument.load(product.bytes);assert.equal(pdf.getPageCount(),1);assert.equal(product.rowCount,2);assert.equal(product.format,"two-columns-v1");
 if(output)fs.writeFileSync(path.join(output,"product-b.pdf"),product.bytes);
 const parsed=await context.pdfjsLib.getDocument({data:product.bytes.slice()}).promise;
 const text=(await (await parsed.getPage(1)).getTextContent()).items.map(x=>x.str).join(" ");await parsed.destroy();
 assert(text.includes("Låshus"));assert(text.includes("M32"));assert(!text.includes("Beställare"));assert(!text.includes("dörrkort"));
 probe.setActive(a,bridge,{gs:null,reason:"No verified GS"});await probe.createProductList(a);assert.equal(probe.product(a.id),undefined);
 context.window.__keepEditable=false;const saved=api.payload(),project=await PDFLib.PDFDocument.load(originalBytes);await api.saveTo(project,{automationItems:[a,b]});const data=new Uint8Array(await project.save());await api.verify(data,{automationItems:[a,b]});
 const archived=await PDFLib.PDFDocument.load(data),manifest=JSON.parse(archived.catalog.get(PDFLib.PDFName.of("TillsynoSLRTestManifest")).decodeText());assert.equal(Object.keys(manifest.templates).length,4);assert.equal(Object.keys(manifest.products).length,1);assert(!manifest.each[a.id].Produktlista);assert(manifest.each[b.id].Produktlista);
 const embedded=attachments(archived);assert.equal(Object.keys(embedded).length,13);assert.equal(archived.getPageCount(),original.getPageCount());
 for(const door of [a,b])for(const category of Object.keys(blank)){
  const file=manifest.each[door.id][category];assert.notEqual(file,manifest.templates[category]);
  const doc=await PDFLib.PDFDocument.load(embedded[file].content);assert(!doc.catalog.get(PDFLib.PDFName.of("AcroForm")));
 }
 api.initProject(archived,{slrTestData:saved},data);await probe.loadTemplates();assert(probe.product(b.id));assert.equal(probe.product(a.id),undefined);assert.equal(probe.saved(a,"Loggbok").fields["Installationsdatum"],"2026-10-13");
 console.log("PASS: manual-only template loading; four real templates; black flattened exports without widgets; identity A/B; independent dates/checks/signatures; verified GS2 product PDF; refused unverified GS; shared templates and compact per-door product survive save/reopen.");
})().catch(err=>{console.error(err);process.exitCode=1});

