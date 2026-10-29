'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../smartmatch-projektering-v2-19-data.js'),P=require('../smartmatch-projektering-v2-19-pdf.js'),S=require('../smartmatch-projektering-v2-19-store.js'),L=require('../smartmatch-projektering-v2-19-library.js');
const clone=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const {state,original}=await P.blank('Reader counting');
 assert.equal(D.defaultStencil('KL').kind,'symbol');assert.equal(D.defaultStencil('KL').productType,'cardReader');
 assert.equal(D.stencilLabel(D.defaultStencil('KL')),'Kortläsare');assert.equal(D.stencilCategory(D.defaultStencil('KL')),'Kortläsare');
 D.addPlacement(state,{stencilId:'KL',page:1,x:.2,y:.2});D.addPlacement(state,{stencilId:'DA',page:1,x:.4,y:.2});D.addPlacement(state,{stencilId:'DS',page:1,x:.6,y:.2});D.addPlacement(state,{stencilId:'DFS',page:1,x:.8,y:.2});
 assert.deepEqual(D.placementCounts(state),{markings:4,cards:0,doorAutomation:1,doorCloser:1,cardReader:1,otherProducts:1});
 assert(!state.cards.KL,'KL does not create a door card');
 const saved=clone(state);saved.schema=5;saved.stencils.KL={...saved.stencils.KL,name:'KL',productType:'none',category:'Dörrkort',shape:'oval',width:77,height:19};
 const oldReader=saved.placements.find(p=>p.code==='KL');delete oldReader.equipment;oldReader.width=77;oldReader.height=19;
 const before=clone(saved),migrated=D.validate(saved),reader=migrated.placements.find(p=>p.code==='KL');
 assert.deepEqual(saved,before,'loading is non-mutating');assert.equal(migrated.stencils.KL.productType,'cardReader');assert.equal(migrated.stencils.KL.category,'Kortläsare');assert.equal(migrated.stencils.KL.name,'Kortläsare');
 assert.equal(migrated.stencils.KL.shape,'oval');for(const key of ['id','x','y','width','height','rotation'])assert.equal(reader[key],oldReader[key],'existing placement retains '+key);
 for(const p of before.placements.filter(p=>p.code!=='KL'))assert.deepEqual(migrated.placements.find(q=>q.id===p.id),p,'other equipment retains IDs and numbers');
 assert.equal(D.placementCounts(migrated).cardReader,1);assert.equal(D.placementCounts(migrated).otherProducts,1);assert.deepEqual(D.validate(migrated),migrated,'migration is idempotent');
 for(const wrongType of ['other','doorAutomation','doorCloser']){const wrong=clone(saved);wrong.stencils.KL.productType=wrongType;const counts=D.placementCounts(D.validate(wrong));assert.equal(counts.cardReader,1);assert.equal(counts.doorAutomation,1);assert.equal(counts.doorCloser,1);assert.equal(counts.otherProducts,1);}
 const invalid=clone(saved);invalid.stencils.KL.productType='invalid';assert.throws(()=>D.validate(invalid),/Välj/);
 const envelope=JSON.parse(new TextDecoder().decode(await S.pack(migrated,original)));envelope.state=saved;assert.deepEqual((await S.unpack(JSON.stringify(envelope))).state,migrated,'old saved project migrates on open');
 assert.deepEqual((await P.inspect(await P.build(migrated,original))).state,migrated,'reader category survives PDF save/open');
 D.updateEquipment(migrated,reader.id,{quantity:3});assert.equal(D.placementCounts(migrated).cardReader,3);D.removePlacements(migrated,[reader.id]);assert.equal(D.placementCounts(migrated).cardReader,0);
 const custom=D.createEmpty(),card=D.createCard('KL');custom.cards.KL=card;custom.stencils.KL={...D.defaultStencil('KL'),kind:'card',productType:'none',category:'Dörrkort'};assert.equal(D.validate(custom).stencils.KL.kind,'card','an explicit existing card identity is preserved');
 assert.equal(L.validate({...L.createDefault(),stencils:[before.stencils.KL]}).stencils[0].productType,'cardReader','saved personal symbol also upgrades');
 if(process.argv[2]){
  const J=require('../vendor/pdf.min.js');J.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
  const imported=await require('../smartmatch-projektering-v2-19-import.js').scan(fs.readFileSync(process.argv[2]),'Acceptance.pdf');
  assert.deepEqual(D.placementCounts(imported.state),{markings:588,cards:15,doorAutomation:17,doorCloser:13,cardReader:16,otherProducts:0});
  assert.equal(Object.values(imported.state.stencils).filter(s=>s.code==='KL'&&s.productType==='cardReader').length,1);
  console.log('PASS acceptance: 588 markings, 15 cards, 17 operators, 13 closers, 16 readers, zero other products');
 }
 console.log('PASS separate reader counting, old-project/library migration without geometry changes, quantity/deletion and PDF/JSON persistence');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
