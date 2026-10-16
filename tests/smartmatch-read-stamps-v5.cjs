'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const PDFLib=require('pdf-lib');
const {PDFDocument,PDFName,PDFString,PDFHexString,PDFRef,PDFNumber}=PDFLib;
const {readDocument}=require('../smartmatch-read-stamps-v5.js');

(async()=>{
 const doc=await PDFDocument.create(),drawing=doc.addPage([9000,4500]),second=doc.addPage([700,900]);
 const annotation=(page,values,{direct=false,reference=null}={})=>{
  const dict=doc.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[20,30,80,50],...values});
  const ref=direct?dict:reference||doc.context.register(dict);
  if(reference)doc.context.assign(reference,dict);
  page.node.addAnnot(ref);return {dict,ref};
 };
 const subject=PDFHexString.fromText('Beslagskod: AB 140 C'),contents=PDFString.of('Door 21'),nm=PDFHexString.fromText('Dörr östra entrén');
 const stamp=annotation(drawing,{Subj:subject,Contents:contents,NM:nm});
 annotation(drawing,{Subj:PDFString.of('WC-A'),Contents:PDFHexString.fromText('Toalett – entré'),Rect:[80,90,-20,-30],F:34},{reference:PDFRef.of(120,2)});
 annotation(second,{Subtype:'FreeText',Subj:PDFHexString.fromText('RUM 91B'),Contents:PDFHexString.fromText('ÅÄÖ 中文'),NM:PDFString.of('direct-ID')},{direct:true});
 annotation(second,{Subj:PDFString.of('No annotation name')},{direct:true});
 annotation(second,{Subj:PDFNumber.of(73),Contents:doc.context.obj(['invalid']),NM:PDFString.of('invalid-fields')},{direct:true});
 annotation(second,{Subj:PDFString.of('Different physical position'),NM:PDFString.of('direct-ID'),Rect:[90,100,150,120]},{direct:true});
 annotation(second,{Rect:[0,0,30]});
 annotation(second,{Rect:[0,0,0,30]});
 annotation(second,{Rect:[0,0,PDFString.of('30'),30]});
 annotation(second,{Rect:[0,0,NaN,30]});
 annotation(second,{Subtype:PDFString.of('Not a name')});
 drawing.node.addAnnot(stamp.ref); // A repeated reference is still one stamp.
 drawing.node.addAnnot(PDFRef.of(9999,0)); // Dangling references cannot stop the index.
 drawing.node.addAnnot(PDFNumber.of(7));
 const before=doc.context.enumerateIndirectObjects().length;
 const records=readDocument(doc);
 assert.equal(doc.context.enumerateIndirectObjects().length,before,'metadata indexing does not add PDF objects');
 assert.equal(records.length,6,'only structurally valid annotation records survive');
 assert.deepEqual(records[0],{page:1,id:stamp.ref.objectNumber+'R',name:'Dörr östra entrén',subtype:'Stamp',subject:'Beslagskod: AB 140 C',contents:'Door 21',rect:[20,30,80,50],flags:0});
 assert.deepEqual(records[1],{page:1,id:'120R2',name:'',subtype:'Stamp',subject:'WC-A',contents:'Toalett – entré',rect:[80,90,-20,-30],flags:34});
 assert.equal(records[2].id,'direct-ID');assert.equal(records[2].contents,'ÅÄÖ 中文');
 assert.equal(records[3].id,'p2-annotation-1','unnamed direct records have stable positional IDs');
 assert.equal(records[4].subject,'');assert.equal(records[4].contents,'','malformed strings do not become fabricated codes');
 assert.equal(records[5].id,'p2-annotation-3');assert.deepEqual(records[5].rect,[90,100,150,120],'duplicate names retain their separate physical positions');
 assert.deepEqual(readDocument(doc),records,'repeated reads have stable IDs and positions');
 assert.deepEqual(readDocument(null),[]);
 assert.deepEqual(readDocument({context:doc.context,getPages(){throw Error('Broken page tree');}}),[]);

 // Round-trip a separate valid PDF to exercise real serialized string encodings
 // and indirect /Annots, /Rect, /Subj and /Contents values.
 const portable=await PDFDocument.create(),page=portable.addPage([1200,600]);
 const put=value=>portable.context.register(value);
 const dict=portable.context.obj({Type:'Annot',Subtype:'Stamp',Rect:put(portable.context.obj([200,100,250,130])),Subj:put(PDFHexString.fromText('Stämpel 63 Å')),Contents:put(PDFString.of('Code 63')),NM:PDFString.of('portable')});
 const ref=put(dict);page.node.set(PDFName.of('Annots'),put(portable.context.obj([ref])));
 const bytes=await portable.save(),reloaded=await PDFDocument.load(bytes,{updateMetadata:false});
 assert.deepEqual(readDocument(reloaded),[{page:1,id:ref.objectNumber+'R',name:'portable',subtype:'Stamp',subject:'Stämpel 63 Å',contents:'Code 63',rect:[200,100,250,130],flags:0}]);
 const browser={PDFLib};vm.runInNewContext(fs.readFileSync(require.resolve('../smartmatch-read-stamps-v5.js'),'utf8'),{window:browser});
 assert.equal(JSON.stringify(browser.SmartMatchReadStamps.readDocument(reloaded)),JSON.stringify(readDocument(reloaded)),'browser global and CommonJS produce the same metadata');
 console.log('PASS TEST 5 annotation subjects, contents, Unicode, refs, flags, exact PDF coordinates, malformed records and serialized PDF round-trip');
})().catch(error=>{console.error(error);process.exitCode=1;});
