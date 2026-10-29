const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v516-data.js'),P=require('../smartmatch-projektering-v516-pdf.js'),L=require('../vendor/pdf-lib.min.js'),models=require('../smartmatch-automation-models-v512.js');
(async()=>{
 const doc=await L.PDFDocument.create();doc.addPage([595,842]);const original=new Uint8Array(await doc.save());
 const state=D.createEmpty('Automatikprov');state.drawing={name:'prov.pdf',pages:P.metadata(doc)};state.project.details=D.projectDetails({facilityNo:'200154',company:'Utförare'});
 const stencil=D.addObjectStencil(state,state.project.details.facilityNo,'45');assert.equal(stencil.shape,'oval');assert(stencil.width>stencil.height);assert.equal(stencil.fill,'#f3b65d');assert.equal(stencil.textColor,'#000000');assert.equal(stencil.objectModel,'Entramatic SW 300');
 const first=D.addPlacement(state,{stencilId:stencil.id,page:1,x:.2,y:.2}),second=D.addPlacement(state,{stencilId:stencil.id,page:1,x:.6,y:.2});
 assert.equal(first.code,'200154-45-1');assert.equal(second.code,'200154-45-2');
 D.updatePlacement(state,first.id,{x:.3});assert.equal(state.placements[0].code,first.code);
 D.removePlacements(state,[second.id]);assert.equal(D.duplicatePlacements(state,[first.id],{dx:0,dy:.3})[0].code,'200154-45-3');
 for(const editableText of [false,true]){
 const saved=await P.build(state,original,{editableText}),opened=await P.inspect(saved);assert.equal(opened.state.project.details.facilityNo,'200154');
 const next=D.addPlacement(opened.state,{stencilId:stencil.id,page:1,x:.7,y:.7});assert.equal(next.code,'200154-45-4');assert.equal(D.objectRows(opened.state)[0].quantity,3);
 }
 const main=fs.readFileSync('smartmatch-main-v509.js','utf8'),control=fs.readFileSync('security.js','utf8');
 for(const [source,name] of [[main,'PROJECT_AUTOMATION_MODELS'],[control,'DOOR_AUTOMATION_MODELS']]){const array=source.match(new RegExp('const '+name+'=(\\[.*?\\n\\]);','s'))[1];assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(array))),models);}
 const source=fs.readFileSync('smartmatch-da-v36-104-module.js','utf8'),start=source.indexOf(' function parseCandidateId('),end=source.indexOf(' function nearPhysicalRect(',start);
 const ctx=vm.createContext({normalize:v=>String(v).trim(),models});vm.runInContext(source.slice(start,end),ctx);const item=vm.runInContext("parseCandidateId('200154-45-3','200154',models)",ctx);assert.equal(item.model,'Entramatic SW 300');assert.equal(item.serialNumber,'3');assert.equal(item.objectNo,'200154');
 console.log('PASS orange oval with black text, 38 shared model codes, numbering, deletion/copy/move, PDF modes, project identity and actual SmartMatch parser');
})().catch(e=>{console.error(e);process.exitCode=1});
