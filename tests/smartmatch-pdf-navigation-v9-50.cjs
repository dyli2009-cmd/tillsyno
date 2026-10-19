'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PDFLib=require('../vendor/pdf-lib.min.js');
const {PDFDocument,PDFName,StandardFonts}=PDFLib;
const source=fs.readFileSync(require.resolve('../smartmatch-read-test-main-v9-50.js'),'utf8');
const fn=source.slice(source.indexOf('async function appendCompactProjectPdf('),source.indexOf('// Only our indexed streams'));
const instances=[{page:1,code:'GS10',position:1,rect:[65,675,125,702]},{page:1,code:'GS10',position:2,rect:[255,405,350,432]}];
const context=vm.createContext({PDFLib,instances,protocolMap:{GS10:2},smartFlattenProgressBadges:async()=>({}),smartUpdatePositionBookmarks:()=>({})});
vm.runInContext(fn,context);
function destinations(doc,page){return (page.node.Annots()?.asArray()||[]).map(r=>doc.context.lookup(r)).filter(a=>a.get(PDFName.of('Subtype'))?.toString()==='/Link').map(a=>doc.context.lookup(doc.context.lookup(a.get(PDFName.of('A'))).get(PDFName.of('D'))));}
function check(doc){
 assert.equal(doc.getPageCount(),4);
 const links=destinations(doc,doc.getPage(0));assert.equal(links.length,2);
 for(let i=0;i<2;i++){
  assert.equal(String(links[i].get(0)),String(doc.getPage(i+2).ref));
  const back=destinations(doc,doc.getPage(i+2));assert.equal(back.length,1);
  assert.equal(String(back[0].get(0)),String(doc.getPage(0).ref));
  assert.equal(back[0].get(2).asNumber(),instances[i].rect[0]-35);
  assert.equal(back[0].get(3).asNumber(),instances[i].rect[3]+90);
 }
 assert.notEqual(doc.getPage(2).node.Contents(),doc.getPage(3).node.Contents());
 assert.equal(doc.getPage(2).getRotation().angle,90);
}
(async()=>{
 let doc=await PDFDocument.create();doc.addPage();let card=doc.addPage();card.setRotation(PDFLib.degrees(90));
 const font=await doc.embedFont(StandardFonts.Helvetica);card.drawText('Door card',{x:50,y:100,font});
 await context.appendCompactProjectPdf(doc,async()=>{},true);check(doc);
 doc=await PDFDocument.load(await doc.save());check(doc);
 await context.appendCompactProjectPdf(doc,async()=>{},true);check(doc);
 doc=await PDFDocument.load(await doc.save());check(doc);
 await context.appendCompactProjectPdf(doc,async()=>{},false);assert.equal(doc.getPageCount(),2);
 for(const d of destinations(doc,doc.getPage(0)))assert.equal(String(d.get(0)),String(doc.getPage(1).ref));
 console.log('PASS: distinct forward/back destinations, rotation, reload, repeated export and compact fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
