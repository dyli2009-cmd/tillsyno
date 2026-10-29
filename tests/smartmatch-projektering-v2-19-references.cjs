'use strict';
// Synthetic annotations only; customer drawings remain outside the repository.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../vendor/pdf-lib.min.js'),J=require('../vendor/pdf.min.js'),D=require('../smartmatch-projektering-v2-19-data.js'),I=require('../smartmatch-projektering-v2-19-import.js'),P=require('../smartmatch-projektering-v2-19-pdf.js'),S=require('../smartmatch-projektering-v2-19-store.js');
J.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const clone=D.clone,name=L.PDFName.of,orange=[1,.7137255,.5019608];
const field=(doc,a,key)=>doc.context.lookup(a.get(name(key)));
const annots=(doc,page=0)=>field(doc,doc.getPage(page).node,'Annots')?.asArray().map(r=>doc.context.lookup(r))||[];
async function fixture(){
 const pdf=await L.PDFDocument.create(),font=await pdf.embedFont(L.StandardFonts.Helvetica);
 for(const rotation of [90,0,180,270]){
  const page=pdf.addPage([500,700]);page.setRotation(L.degrees(rotation));page.setCropBox(10,20,480,660);
  page.drawText('Drawing text 900001-20-30-4 stays in the background',{x:40,y:610,font,size:10});
  const ap=pdf.context.register(pdf.context.flateStream('1 .71 .5 rg 0 0 110 20 re f',{Type:'XObject',Subtype:'Form',BBox:[0,0,110,20],Resources:{}}));
  const add=(contents,extra={})=>{page.node.addAnnot(pdf.context.register(pdf.context.obj({Type:'Annot',Subtype:'FreeText',Contents:L.PDFHexString.fromText(contents),C:orange,Rect:[70,130,180,150],Rotate:rotation,F:4,AP:{N:ap},...extra})));};
  add('900001-20-30-4');
  if(rotation===90){
   add('900001-20-30-4',{Rect:[100,220,120,330]});
   add('900001-20-30-5',{C:[1,1,1]});add('2026-10-29');add('Ordinary orange comment');
   add('900001-20-30-6',{F:2});add('900001-20-30-7',{CL:[20,20,70,130]});
   add('900001-20-30-8',{Rect:[-30,130,20,150]});
  }
 }
 const state=D.createEmpty('Existing project');state.schema=5;state.drawing={name:'Fixture.pdf',pages:P.metadata(pdf)};state.conversion={version:1,sourceName:'Fixture.pdf',issues:[]};
 D.addStencil(state,D.defaultStencil('GS1'));D.addPlacement(state,{id:'existing-door',stencilId:'GS1',page:1,x:.8,y:.8});state.cards.GS1.rows[0].product='Edited hardware';state.cards.GS1.rows[0].installer='DT';
 return {state:D.validate(state),original:new Uint8Array(await pdf.save())};
}
(async()=>{
 const input=await fixture(),before=clone(input.state),bytes=Buffer.from(input.original),result=await I.upgradeReferences(input.state,input.original);
 assert.deepEqual(input.state,before);assert.deepEqual(Buffer.from(input.original),bytes,'upgrade never mutates the source');
 assert.equal(result.count,5);assert.equal(result.state.placements.length,6);assert.deepEqual(result.state.cards,before.cards);assert.deepEqual(result.state.placements[0],before.placements[0]);
 assert.equal(D.placementCounts(result.state).cards,1);assert.equal(D.placementCounts(result.state).otherProducts,0);
 const refs=result.state.placements.filter(p=>D.isReferenceStencil(result.state.stencils[p.stencilId]));assert.equal(refs.length,5);
 assert.equal(refs[0].rotation,0);assert.equal(refs[0].width,20);assert.equal(refs[0].height,110);
 assert.equal(refs[0].x,(130-20+10)/660);assert.equal(refs[0].y,(70-10+55)/480,'cropped/rotated center is preserved');
 assert.equal(refs[1].width,110);assert.equal(refs[1].height,20);for(const ref of refs)assert.equal(ref.rotation,0);
 assert.equal(result.state.stencils[refs[0].stencilId].fill,'#ffb680');assert.equal(D.stencilLabel(result.state.stencils[refs[0].stencilId]),'Beteckning');
 const bg=await L.PDFDocument.load(result.original);assert.equal(annots(bg).length,6,'unrelated, hidden, callout and out-of-bounds annotations survive');
 const reader=await J.getDocument({data:result.original.slice(),verbosity:0}).promise;assert((await(await reader.getPage(1)).getTextContent()).items.some(t=>t.str.includes('stays in the background')));await reader.destroy();
 const repeated=await I.upgradeReferences(result.state,result.original);assert.equal(repeated.count,0);assert.deepEqual(repeated.state,result.state);assert.deepEqual(repeated.original,result.original,'reopening does not rewrite the PDF or duplicate labels');
 const untouched=clone(input.state);delete untouched.conversion;assert.equal((await I.upgradeReferences(untouched,input.original)).count,0,'manual projects are not migrated');
 const conflicting=clone(input.state);D.addStencil(conflicting,{...D.defaultStencil('900001-20-30-4'),kind:'symbol',productType:'other'});assert.equal((await I.upgradeReferences(conflicting,input.original)).count,0,'a product identity is never reused as a reference');
 const state=result.state,target=refs[1],other=refs[0];D.renameReferencePlacement(state,target.id,'900001-20-30-99');
 assert.equal(state.placements.find(p=>p.id===other.id).code,'900001-20-30-4','renaming only affects the selected occurrence');
 assert.equal(Object.keys(state.cards).length,1);D.updatePlacement(state,target.id,{x:.65,y:.45});
 for(const code of ['GS1','KL','DA','']){const snapshot=clone(state);assert.throws(()=>D.renameReferencePlacement(state,target.id,code));assert.deepEqual(state,snapshot);}
 D.updatePlacement(state,target.id,{locked:true});assert.throws(()=>D.renameReferencePlacement(state,target.id,'900001-20-30-98'),/låst/);D.updatePlacement(state,target.id,{locked:false});
 const packed=await S.pack(state,result.original);assert.deepEqual((await S.unpack(packed)).state,state);
 const exported=await P.build(state,result.original),opened=await P.inspect(exported);assert.deepEqual(opened.state,state);assert.equal((await I.upgradeReferences(opened.state,opened.original)).count,0);
 const pdf=await L.PDFDocument.load(exported),stamps=annots(pdf).filter(a=>String(field(pdf,a,'Subtype'))==='/Stamp'),stamp=stamps.find(a=>field(pdf,a,'NM').decodeText()==='projection-v2-'+target.id);
 assert(stamp);assert(L.decodePDFRawStream(field(pdf,field(pdf,stamp,'AP'),'N')).decode().length>100,'editable reference has a visible PDF appearance');
 const rect=field(pdf,stamp,'Rect').asArray().map(n=>n.asNumber());stamp.set(name('Rect'),pdf.context.obj([rect[0]+5,rect[1],rect[2]+5,rect[3]]));stamp.set(name('Subj'),L.PDFHexString.fromText('900001-20-30-98'));
 const external=await P.inspect(await pdf.save()),externalTarget=external.state.placements.find(p=>p.id===target.id);assert.equal(externalTarget.code,'900001-20-30-98');assert.notEqual(externalTarget.x,state.placements.find(p=>p.id===target.id).x);assert(D.isReferenceStencil(external.state.stencils[externalTarget.stencilId]));
 stamp.set(name('Subj'),L.PDFHexString.fromText('KL'));await assert.rejects(()=>pdf.save().then(bytes=>P.inspect(bytes)),/annan typ/,'external renaming cannot turn a reference into a card reader');
 D.removePlacements(state,[target.id]);const deleted=await P.inspect(await P.build(state,result.original));assert(!deleted.state.placements.some(p=>p.id===target.id));assert.equal((await I.upgradeReferences(deleted.state,deleted.original)).count,0,'deleted labels cannot reappear from the background');
 if(process.argv[2]){
  const real=await I.scan(fs.readFileSync(process.argv[2]),'Acceptance.pdf');assert.equal(real.stats.references,17);assert.deepEqual(D.placementCounts(real.state),{markings:588,cards:15,doorAutomation:17,doorCloser:13,cardReader:16,otherProducts:0});assert.equal((await I.upgradeReferences(real.state,real.original)).count,0);
  const references=real.state.placements.filter(p=>D.isReferenceStencil(real.state.stencils[p.stencilId]));assert.equal(references.length,17);assert(references.every(p=>p.rotation===0&&p.height===20));
  if(process.env.REFERENCE_PREVIEW_DIR){const dir=process.env.REFERENCE_PREVIEW_DIR;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'converted-references.pdf'),await P.build(real.state,real.original));fs.writeFileSync(path.join(dir,'references.json'),JSON.stringify(references));}
  console.log('PASS acceptance: 17 separate references, 588 total markings; door cards, DA, DS and KL counts unchanged');
 }
 console.log('PASS reference recognition, selective background cleanup, cropped/rotated geometry, non-mutating/idempotent migration, independent rename, locking, PDF/JSON save, external edits and deletion');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
