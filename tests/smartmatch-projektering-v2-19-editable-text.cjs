'use strict';
// Generated fixtures only. No customer drawings are stored in the repository.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const L=require('../vendor/pdf-lib.min.js'),J=require('../vendor/pdf.min.js'),D=require('../smartmatch-projektering-v2-19-data.js'),P=require('../smartmatch-projektering-v2-19-pdf.js');
J.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const name=L.PDFName.of,field=(doc,a,k)=>doc.context.lookup(a.get(name(k)));
const annots=(doc,n=0)=>field(doc,doc.getPage(n).node,'Annots')?.asArray().map(r=>doc.context.lookup(r))||[];
const value=(doc,a,k)=>field(doc,a,k)?.decodeText?.();
const appearance=(doc,a)=>Buffer.from(L.decodePDFRawStream(field(doc,field(doc,a,'AP'),'N')).decode()).toString();
async function fixture(){
 const doc=await L.PDFDocument.create();for(const rotation of [0,90,180,270]){const page=doc.addPage([600,800]);page.setCropBox(10,20,580,760);page.setRotation(L.degrees(rotation));}
 const state=D.createEmpty('Editable text');state.schema=6;state.drawing={name:'Generated.pdf',pages:P.metadata(doc)};
 D.addStencil(state,D.defaultStencil('GS4'));D.addStencil(state,{...D.defaultStencil('200154-28-24-1'),kind:'symbol',productType:'none',category:'Beteckningar',shape:'rectangle',width:110,height:20,fill:'#ffb680'});
 for(let page=1;page<=4;page++)for(const [i,code]of ['GS4','DA','200154-28-24-1'].entries())D.addPlacement(state,{id:'mark-'+page+'-'+i,stencilId:code,page,x:.2+i*.3,y:.3,rotation:(page-1)*90});
 state.cards.GS4.rows[0].product='SM36';state.cards.GS4.rows[0].installer='DT';state.cards.GS4.rows[0].delivery='GS';
 state.cards.GS4.functions={door:'Door function',alarm:'Alarm function',fire:'Fire function'};
 return {state:D.validate(state),original:new Uint8Array(await doc.save())};
}
(async()=>{
 const {state,original}=await fixture(),before=D.clone(state),bytes=await P.build(state,original,{editableText:true});assert.deepEqual(state,before,'export is non-mutating');
 assert.deepEqual((await P.inspect(bytes)).state,state,'all page rotations and crop boxes roundtrip');
 const pdf=await L.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),5,'one drawing per original page and one GS4 card');
 for(let n=0;n<4;n++){
  const list=annots(pdf,n);assert.equal(list.length,6);assert(!list.some(a=>String(field(pdf,a,'Subtype'))==='/Stamp'));
  for(const a of list.filter(a=>String(field(pdf,a,'Subtype'))==='/FreeText')){
   assert.equal(value(pdf,a,'Subj'),'Beteckning','subject cannot retain a stale code');assert(appearance(pdf,a).includes('BT'),'visible text has its own appearance');
   const id=value(pdf,a,'NM'),frame=list.find(f=>value(pdf,f,'NM')===id.replace('projection-v2-','projection-v2-frame-'));
   assert(frame);assert.equal(String(field(pdf,frame,'RT')),'/Group');assert.equal(field(pdf,frame,'IRT'),a);assert(!appearance(pdf,frame).includes('BT'),'frame appearance contains no baked-in label');
  }
 }
 const labels=annots(pdf).filter(a=>String(field(pdf,a,'Subtype'))==='/FreeText');
 for(const [a,code]of labels.map((a,i)=>[a,['GS44','DA2','200154-28-24-2'][i]]))a.set(name('Contents'),L.PDFHexString.fromText(code));
 labels[0].set(name('Subj'),L.PDFHexString.fromText('GS999'));
 const moved=annots(pdf).filter(a=>value(pdf,a,'NM').endsWith('mark-1-0'));
 for(const a of moved){const r=field(pdf,a,'Rect').asArray().map(v=>v.asNumber());a.set(name('Rect'),pdf.context.obj(r.map((v,i)=>v+(i%2===0?12:6))));}
 // A real editor may replace Rect with the centered inner RD rectangle.
 const textRect=field(pdf,labels[0],'Rect').asArray().map(v=>v.asNumber());labels[0].set(name('Rect'),pdf.context.obj(textRect.map((v,i)=>v+(i<2?2:-2))));
 const edited=await P.inspect(await pdf.save());
 for(const [id,code]of [['mark-1-0','GS44'],['mark-1-1','DA2'],['mark-1-2','200154-28-24-2']])assert.equal(edited.state.placements.find(p=>p.id===id).code,code);
 assert.deepEqual(edited.state.cards.GS44.rows,state.cards.GS4.rows,'new card retains all products and owners');assert.deepEqual(edited.state.cards.GS44.functions,state.cards.GS4.functions);assert.equal(edited.state.cards.GS44.meta.littera,'GS44');
 assert.equal(D.placementCounts(edited.state).doorAutomation,4);assert.equal(D.placementCounts(edited.state).otherProducts,0);assert(!edited.state.cards.DA2);assert(!edited.state.cards['200154-28-24-2']);
 assert.notEqual(edited.state.placements[0].x,state.placements[0].x);assert.equal(edited.state.placements.find(p=>p.id==='mark-2-0').code,'GS4','other occurrences retain their card');
 const rebuilt=await P.build(edited.state,edited.original,{editableText:true}),rebuiltDoc=await L.PDFDocument.load(rebuilt);assert.equal(rebuiltDoc.getPageCount(),6,'GS4 and GS44 each get one card');assert(annots(rebuiltDoc).some(a=>value(rebuiltDoc,a,'Contents')==='GS44'));
 const bad=await L.PDFDocument.load(bytes),badList=annots(bad),badLabel=badList.find(a=>value(bad,a,'Contents')==='GS4');badLabel.set(name('Contents'),L.PDFHexString.fromText(''));
 await assert.rejects(()=>bad.save().then(P.inspect),/beteckning/i,'empty labels are not silently restored');
 badLabel.set(name('Contents'),L.PDFHexString.fromText('DA'));await assert.rejects(()=>bad.save().then(P.inspect),/annan typ/);
 badLabel.set(name('Contents'),L.PDFHexString.fromText('GS4'));const r=field(bad,badLabel,'Rect').asArray().map(v=>v.asNumber());badLabel.set(name('Rect'),bad.context.obj(r.map(v=>v+5)));await assert.rejects(()=>bad.save().then(P.inspect),/skilts åt/,'partial group moves cannot silently corrupt geometry');
 const oblique=D.clone(state);oblique.placements[0].rotation=33;await assert.rejects(()=>P.build(oblique,original,{editableText:true}),/rotation/);assert.deepEqual((await P.inspect(await P.build(oblique,original))).state,oblique,'ordinary stamps retain arbitrary rotations');
 const deleted=await L.PDFDocument.load(bytes),first=deleted.getPage(0).node,remaining=field(deleted,first,'Annots').asArray().filter(ref=>!value(deleted,deleted.context.lookup(ref),'NM').endsWith('mark-1-0'));first.set(name('Annots'),deleted.context.obj(remaining));assert.equal((await P.inspect(await deleted.save())).state.placements.length,11,'deleting the entire group removes one placement');
 const js=await J.getDocument({data:bytes.slice(),verbosity:0}).promise;try{
  const a=await(await js.getPage(1)).getAnnotations();assert.equal(a.filter(a=>a.subtype==='FreeText').length,3);assert(a.some(a=>a.subtype==='FreeText'&&a.contentsObj.str==='GS4'));
  const reader=require('../smartmatch-read-stamps-v9-93.js'),context=vm.createContext({window:{SmartMatchReadStep:{wait:p=>p}},setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../smartmatch-read-match-v9-93.js'),'utf8'),context);
  const scanned=await context.window.SmartMatchReadMatcher.scan({pdf:js,cardPages:new Set([5]),codes:['GS4','DA','200154-28-24-1'],annotationIndex:reader.readDocument(await L.PDFDocument.load(bytes),L),imageMode:'text',codeOnly:true});
  assert.equal(scanned.hits.length,12,'Avläsning counts one occurrence per label, never a second for its grouped frame');
 }finally{await js.destroy();}
 if(process.env.EDITABLE_TEXT_PREVIEW_DIR){fs.mkdirSync(process.env.EDITABLE_TEXT_PREVIEW_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.EDITABLE_TEXT_PREVIEW_DIR,'editable.pdf'),bytes);fs.writeFileSync(path.join(process.env.EDITABLE_TEXT_PREVIEW_DIR,'rebuilt.pdf'),rebuilt);fs.writeFileSync(path.join(process.env.EDITABLE_TEXT_PREVIEW_DIR,'stamps.pdf'),await P.build(state,original));}
 if(process.argv[2]){
  const imported=await require('../smartmatch-projektering-v2-19-import.js').scan(fs.readFileSync(process.argv[2]),'Acceptance.pdf'),native=await P.build(imported.state,imported.original,{editableText:true}),doc=await L.PDFDocument.load(native);
  assert.equal(doc.getPageCount(),25);assert.equal(Array.from({length:10},(_,i)=>annots(doc,i).filter(a=>String(field(doc,a,'Subtype'))==='/FreeText').length).reduce((a,b)=>a+b,0),588);
  assert.deepEqual((await P.inspect(native)).state,imported.state,'all real imported materials, responsibilities and geometries roundtrip');
  if(process.env.EDITABLE_TEXT_PREVIEW_DIR)fs.writeFileSync(path.join(process.env.EDITABLE_TEXT_PREVIEW_DIR,'acceptance-editable.pdf'),native);
  console.log('PASS acceptance: 588 editable labels, 10 drawing pages and 15 unique one-page door cards');
 }
 console.log('PASS editable GS/DA/reference labels, separate grouped frames, cropped/rotated pages, rename/move/delete roundtrip, product/owner preservation, unique cards and explicit unsupported-edit guards');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
