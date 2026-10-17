'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const PDFLib=require('../vendor/pdf-lib.min.js');
const {PDFDocument,PDFName,PDFNumber,PDFString}=PDFLib;
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-2.js'),'utf8');
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const clone=value=>JSON.parse(JSON.stringify(value));
function context(){
 const existing={id:'scan:GS23@1',code:'GS23',page:1,rect:[10,10,30,25],checks:{existing:true},rowStages:{existing:'done'},overrides:{existing:{label:'Keep'}},customItems:[{id:'custom',label:'Saved custom'}]};
 const c={console,PDFLib,File,crypto,Set,Array,JSON,Math,Number,Error,Uint8Array,
  pdf:{numPages:3,async getPage(){return {view:[0,0,595,842]};}},bytes:new Uint8Array([1]),smartScanActive:false,
  instances:[existing],manualPositions:[],labManualLinks:{GS23:2},protocolMap:{GS23:2},protocolDefs:{old:true},
  smartDoorCardPages:new Set([2]),smartImportedCardPages:new Set([2]),ignoredCodes:new Set(),
  currentFileName:'Project.pdf',workspaceId:'workspace',fileKey:'file',page:1,scale:1.25,
  smartBaseDrawingFile:null,smartAdditionalCardsFile:null,currentFileHandle:null,
  readerData:{schema:1,cards:[{code:'GS23',page:2}],matching:{hits:[{code:'GS23',page:1}]}},
  recalcCalls:0,analyzeCalls:0,ensureCalls:0,status:'',
  scanPageLimit:()=>2,smartNormalizeCardLabel:s=>String(s||'').toUpperCase().replace(/[\s-]/g,''),
  pmCounts(){},pmRefresh(){},setState(message){c.status=message;},save(){},updateStats(){},renderGroups(){},renderMarkers(){},
  async renderDrawing(){},originalProjectPdfName:name=>name,
  async buildProtocolMap(){c.protocolMap={...c.labManualLinks};},
  async recalcAll(){c.recalcCalls++;if(c.failRecalc)throw Error('recalc failed');},
 };
 c.makeProjectPayload=()=>clone({schema:6,projectId:'same-project',projectRevision:2,manualPositions:c.manualPositions,labManualLinks:c.labManualLinks,ignoredCodes:[...c.ignoredCodes],instances:Object.fromEntries(c.instances.map(o=>[o.id,{checks:o.checks,rowStages:o.rowStages,overrides:o.overrides,customItems:o.customItems}])),readTestData:c.readerData,projectMeta:{name:'Saved customer'}});
 c.window={SmartMatchReadTest:{payload:()=>clone(c.readerData),async ensureManualCard({code,page}){c.ensureCalls++;c.readerData.cards.push({code,page,pending:true});},async restoreReadData(data){c.readerData=clone(data);}}};
 c.pdfjsLib={getDocument({data}){return {promise:(async()=>{const d=await PDFDocument.load(data);return {numPages:d.getPageCount(),async destroy(){}};})()};}};
 c.analyze=async(file,options)=>{
  c.analyzeCalls++;assert.equal(options.readTestReady,true);assert.equal(options.workspaceId,'workspace');
  c.bytes=new Uint8Array(await file.arrayBuffer());const d=await PDFDocument.load(c.bytes);
  c.pdf={numPages:d.getPageCount()};c.importedDocument=d;c.restoredPayload=clone(options.readTestRestore);
  c.smartImportedCardPages=new Set(d.catalog.get(PDFName.of('SmartMatch24ImportedCards')).decodeText().split(',').map(Number));
 };
 vm.createContext(c);
 vm.runInContext(between('function labSamePhysicalPosition(','function labColorAtRect('),c);
 vm.runInContext(between('async function addManualReadPositions(','function pmRefresh('),c);
 return c;
}
async function appendFixture(){
 const doc=await PDFDocument.create();doc.addPage([595,842]);doc.addPage([595,842]);doc.addPage([595,842]);
 doc.catalog.set(PDFName.of('SmartMatch21OriginalPages'),PDFNumber.of(2));
 doc.catalog.set(PDFName.of('SmartMatch23ExtraPages'),PDFNumber.of(1));
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV36Data'),PDFString.of('old metadata must be replaced'));
 doc.catalog.set(PDFName.of('SmartMatch24ImportedCards'),PDFString.of('2'));
 const stamp=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',NM:PDFString.of('Customer stamp'),Rect:[50,50,70,70]}));
 const generated=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[10,10,30,25],A:{S:'GoTo',D:[doc.getPage(2).ref,'Fit']}}));
 doc.getPage(0).node.set(PDFName.of('Annots'),doc.context.obj([stamp,generated]));
 doc.getForm().createCheckBox('Saved checkbox').addToPage(doc.getPage(1),{x:40,y:40,width:15,height:15});
 doc.getForm().getCheckBox('Saved checkbox').check();
 await doc.attach(new Uint8Array([10,20,30]),'Original attachment.bin');
 return new Uint8Array(await doc.save());
}
(async()=>{
 const c=context(),old=clone(c.instances[0]);
 const result=await c.addManualReadPositions({code:'DBL',cardPage:2,hits:[{page:1,rect:[90,90,120,110]},{page:1,rect:[90,90,120,110]}]});
 assert.deepEqual(clone(result),{added:1,duplicates:1,code:'DBL',cardPage:2});assert.equal(c.instances.length,2);assert.equal(c.manualPositions.length,1);assert.equal(c.analyzeCalls,0);assert.equal(c.ensureCalls,1);assert.equal(c.protocolMap.DBL,2);assert.deepEqual(clone(c.instances[0]),old);
 const repeat=await c.addManualReadPositions({code:'DBL',cardPage:2,hits:[{page:1,rect:[90,90,120,110]}]});
 assert.equal(repeat.added,0);assert.equal(repeat.duplicates,1);assert.equal(c.instances.length,2);
 const before=c.ensureCalls;
 await assert.rejects(c.addManualReadPositions({code:'GS23',cardPage:1,hits:[{page:1,rect:[50,50,70,70]}]}),/redan kopplad/);assert.equal(c.ensureCalls,before);
 for(const hit of [{page:2,rect:[50,50,70,70]},{page:3,rect:[50,50,70,70]},{page:1,rect:[-100,50,70,70]}])await assert.rejects(c.addManualReadPositions({code:'WC77',cardPage:2,hits:[hit]}),/ritningssida|utanför/);
 const saved=clone(c.makeProjectPayload());c.failRecalc=true;
 await assert.rejects(c.addManualReadPositions({code:'WC77',cardPage:2,hits:[{page:1,rect:[190,190,220,210]}]}),/recalc failed/);
 assert.deepEqual(clone(c.makeProjectPayload()),saved,'reader data, controls and positions roll back together');
 const legacy=context();legacy.readerData=null;await assert.rejects(legacy.addManualReadPositions({code:'DBL',cardPage:2,hits:[{page:1,rect:[90,90,120,110]}]}),/Läsområden/);
 const imported=context();imported.bytes=await appendFixture();const snapshot=clone(imported.makeProjectPayload());
 const extra=await PDFDocument.create();extra.addPage([595,842]);
 const appended=await imported.appendReadCards([new File([await extra.save()],'Forgotten card.pdf',{type:'application/pdf'})]);
 assert.deepEqual(clone(appended.pages),[3]);assert.equal(appended.count,1);assert.equal(imported.pdf.numPages,3);assert.equal(imported.analyzeCalls,1);assert.equal(imported.importedDocument.catalog.get(PDFName.of('SmartMatch21OriginalPages')).asNumber(),3);assert.equal(imported.importedDocument.catalog.get(PDFName.of('SmartMatch23ExtraPages')).asNumber(),0);assert.deepEqual([...imported.smartImportedCardPages],[2,3]);
 assert.deepEqual(imported.restoredPayload,snapshot);assert.deepEqual(clone(imported.readerData),snapshot.readTestData);assert.deepEqual(clone(imported.instances[0].checks),{existing:true});
 const d=imported.importedDocument;assert.equal(d.getPage(0).node.Annots().size(),1,'only the dangling generated link is removed');assert.equal(d.context.lookup(d.getPage(0).node.Annots().get(0)).get(PDFName.of('NM')).decodeText(),'Customer stamp');assert.equal(d.getForm().getCheckBox('Saved checkbox').isChecked(),true);assert(d.catalog.get(PDFName.of('Names')),'existing attachment catalog is retained');
 assert.deepEqual(JSON.parse(d.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText()),snapshot,'current payload replaces preferred old metadata');
 const bad=context();bad.bytes=await appendFixture();const same=bad.bytes;await assert.rejects(bad.appendReadCards([new File(['not PDF'],'broken.pdf')]),/PDF|header/);assert.equal(bad.bytes,same);assert.equal(bad.analyzeCalls,0,'bad import does not replace open project');
 console.log('PASS TEST 9.2 extra-link bridge: additive deduplicated positions, mapping conflict protection, check/reader rollback, generated suffix exclusion, imported page indices, metadata/forms/annotations/attachments and failed-import preservation');
})().catch(error=>{console.error(error);process.exitCode=1;});
