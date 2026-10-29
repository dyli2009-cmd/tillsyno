'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../vendor/pdf-lib.min.js'),D=require('../smartmatch-projektering-v510-data.js'),P=require('../smartmatch-projektering-v510-pdf.js'),S=require('../smartmatch-projektering-v510-store.js'),I=require('../tillsyno-project-info-v509.js');
(async()=>{
 const doc=await L.PDFDocument.create();doc.addPage([595,842]);doc.addPage([595,842]);const original=new Uint8Array(await doc.save());
 const state=D.createEmpty('Objektprov');state.drawing={name:'ritning.pdf',pages:P.metadata(doc)};state.project.details=D.projectDetails({company:'Utförare',customer:'Beställare',facilityNo:'A-123',order:'AO-45'});
 const stencil=D.addObjectStencil(state,'123-4','SW300');
 assert.equal(D.objectRows(state)[0].quantity,0);
 const a=D.addPlacement(state,{stencilId:stencil.id,page:1,x:.2,y:.2});
 D.addPlacement(state,{stencilId:stencil.id,page:1,x:.6,y:.2});
 D.addPlacement(state,{stencilId:stencil.id,page:2,x:.2,y:.2});
 assert.equal(D.objectRows(state)[0].quantity,3);assert.equal(D.placementCounts(state).doorAutomation,3);
 for(const p of state.placements)assert.deepEqual(p.equipment,{objectNumber:'123-4',model:'SW300',quantity:1,note:''});
 assert.throws(()=>D.addObjectStencil(state,'123-4','ED100'),/redan/);assert.throws(()=>D.addObjectStencil(state,'456',''),/ogiltigt/);
 D.removePlacements(state,[a.id]);assert.equal(D.objectRows(state)[0].quantity,2);
 D.duplicatePlacements(state,[state.placements[0].id],{dx:0,dy:.2});assert.equal(D.objectRows(state)[0].quantity,3);
 let data=await S.unpack(await S.pack(state,original));assert.deepEqual(D.objectRows(data.state),D.objectRows(state));
 for(const editableText of [false,true]){
 const bytes=await P.build(state,original,{editableText}),reopened=await P.inspect(bytes);
 assert.deepEqual(D.objectRows(reopened.state),D.objectRows(state));assert.deepEqual(reopened.state.project.details,state.project.details);
 assert.equal((await L.PDFDocument.load(bytes)).getPageCount(),3,'drawing plus object list');
 assert.equal(I.read(await L.PDFDocument.load(bytes),L).projectMeta.order,'AO-45');
 D.addPlacement(reopened.state,{stencilId:stencil.id,page:2,x:.7,y:.6});assert.equal(D.objectRows(reopened.state)[0].quantity,4);
 }
 const before=D.clone(state);const els=new Map();const el=id=>{if(!els.has(id))els.set(id,{value:'',textContent:'',showModal(){this.open=true},close(){this.open=false}});return els.get(id)};
 const source=fs.readFileSync('smartmatch-projektering-v510.js','utf8');
 let fail=false;const ctx=vm.createContext({D,state:D.clone(state),$:el,snap:p=>p,selected:[],currentStencil:null,renderAll(){},revealStencil(){},setTool(){},async commit(fn){const next=D.clone(ctx.state);fn(next);if(fail)throw Error('disk failure');ctx.state=D.validate(next);}});
 vm.runInContext(source.slice(source.indexOf('  let pendingObjectPlacement='),source.indexOf('  async function chooseStencil(')),ctx);
 vm.runInContext('openObjectTemplate({page:1,x:.3,y:.7})',ctx);el('objectNumber510').value='555';el('objectModel510').value='ED100';fail=true;
 await assert.rejects(()=>vm.runInContext('saveObjectTemplate()',ctx),/disk failure/);assert.deepEqual(ctx.state,before);assert.equal(el('objectDialog510').open,true);
 fail=false;await vm.runInContext('saveObjectTemplate()',ctx);assert.equal(el('objectDialog510').open,false);assert.equal(D.objectRows(ctx.state).find(r=>r.objectNumber==='555').quantity,1);
 console.log('PASS first placement, atomic failure, repeat/copy/delete counts, metadata, project file and both PDF modes');
})().catch(e=>{console.error(e);process.exitCode=1});
