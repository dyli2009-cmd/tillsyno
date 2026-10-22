'use strict';
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-4-data.js');

const page=(width=1200,height=800)=>({width,height,rotation:0,view:[0,0,width,height],transform:[1,0,0,-1,0,height]});
function project(){const state=D.createEmpty('Storlek och verktyg');state.drawing={name:'två-sidor.pdf',pages:[page(),page(800,1200)]};return D.validate(state);}
function place(state,id,stencilId,pageNumber=1,patch={}){D.addPlacement(state,{id,stencilId,page:pageNumber,x:.5,y:.5,...patch});return state.placements.find(p=>p.id===id);}
function unchanged(state,action,pattern){const before=D.clone(state);assert.throws(action,pattern);assert.deepEqual(state,before,'En avvisad ändring får inte delvis sparas.');}
function approximate(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}
function bounds(state,id){const p=state.placements.find(p=>p.id===id),page=state.drawing.pages[p.page-1],r=p.rotation*Math.PI/180,w=Math.abs(Math.cos(r))*p.width+Math.abs(Math.sin(r))*p.height,h=Math.abs(Math.sin(r))*p.width+Math.abs(Math.cos(r))*p.height;return {left:p.x*page.width-w/2,right:p.x*page.width+w/2,top:p.y*page.height-h/2,bottom:p.y*page.height+h/2,cx:p.x*page.width,cy:p.y*page.height};}

// Schema 2 imports gain independent defaults, and validated preferences survive a portable round trip.
{
  const old=D.clone(project());delete old.preferences;
  const state=D.validate(old);assert.equal(state.schema,2);assert.deepEqual(state.preferences,D.defaultPreferences());
  const other=D.defaultPreferences();other.toolbarTools.length=0;assert.notEqual(state.preferences.toolbarTools.length,0);
  const revision=state.project.revision;
  D.setPreferences(state,{sizeScope:'code',toolbarTools:['toolPan','rotateLeft'],autoOpenCard:false,doorSize:{width:70,height:30}});
  assert.equal(state.project.revision,revision+1);assert.deepEqual(D.validate(JSON.parse(JSON.stringify(state))).preferences,state.preferences);
  for(const patch of [{sizeScope:'all'},{toolbarTools:['toolSelect']},{toolbarTools:['undo','undo']},{toolbarTools:['fullscreen']},{autoOpenCard:'yes'},{doorSize:{width:0,height:20}}])unchanged(state,()=>D.setPreferences(state,patch),/Välj|Verktyg|Inställning|Stämpel/);
  assert.throws(()=>D.validate({...state,preferences:null}),/inställningar/);
}

// Categories are explicit display labels; DFS remains an unspecified product,
// not a guessed fire/closer type. Existing custom DFS cards retain their work.
{
  const state=project();
  assert.equal(state.stencils.DFS.kind,'symbol');assert.equal(state.stencils.DFS.productType,'other');
  assert.equal(D.stencilCategory(state.stencils.DFS),'DFS');assert.equal(D.stencilLabel(state.stencils.DFS),'DFS');
  assert(D.CATEGORY_DEFAULTS.includes('Armbågskontakter'));
  assert.equal(D.stencilCategory(state.stencils.GS1),'Dörrkort');
  assert.equal(D.stencilCategory(state.stencils.DA),'Dörrautomatik');assert.equal(D.stencilCategory(state.stencils.DS),'Dörrstängare');
  D.addStencil(state,{...D.defaultStencil('P1'),kind:'symbol',productType:'other',category:'Egna   produkter',name:'Egen komponent'});
  assert.equal(D.stencilCategory(state.stencils.P1),'Egna produkter');
  D.addStencil(state,{...D.defaultStencil('E1'),kind:'symbol',productType:'elbowContact',category:'Armbågskontakter'});
  assert.equal(D.stencilLabel(state.stencils.E1),'Armbågskontakt');assert.equal(D.productMultiplier(state.stencils.E1),2);
  assert.equal(D.productMultiplier(state.stencils.DA),1);
  place(state,'dfs','DFS',1,{equipment:{quantity:3}});place(state,'elbow','E1',2,{equipment:{quantity:2}});
  assert.equal(D.placementCounts(state).otherProducts,7,'DFS quantity3 plus two pairs of armbågskontakter.');
  const number=state.placements.find(p=>p.id==='dfs').equipment.objectNumber;
  D.updateStencil(state,'DFS',{category:'Specialprodukter'});assert.equal(D.placementCounts(state).otherProducts,7);
  assert.equal(state.placements.find(p=>p.id==='dfs').equipment.objectNumber,number,'Reclassification preserves the physical object identity.');
  unchanged(state,()=>D.updateStencil(state,'DFS',{category:''}),/Stencilkategori/);
  unchanged(state,()=>D.updateStencil(state,'DFS',{category:'x'.repeat(61)}),/Stencilkategori/);
  D.removePlacements(state,['dfs']);D.removeStencil(state,'DFS');
  assert.equal(state.stencils.DFS,undefined,'A default deliberately removed from a 2.4 project is not re-seeded.');
  const Old=require('../smartmatch-projektering-v2-3-data.js'),old=Old.createEmpty('Äldre kategorier');
  const upgraded=D.validate(old);assert.equal(upgraded.stencils.DFS.productType,'other');
  Old.addStencil(old,{...Old.defaultStencil('DFS'),name:'Befintligt kundkort'});Old.ensureCard(old,'DFS');old.cards.DFS.note='Behåll';
  const existing=D.validate(old);assert.equal(existing.stencils.DFS.kind,'card');assert.equal(existing.cards.DFS.note,'Behåll');
  assert.equal(existing.stencils.DFS.name,'Befintligt kundkort');
}

// Object numbers span all product categories/pages. Reserve every explicit
// number before assigning missing legacy numbers, and reject duplicates atomically.
{
  const state=project();place(state,'da','DA');place(state,'ds','DS',2);place(state,'dfs','DFS');
  assert.deepEqual(state.placements.map(p=>p.equipment.objectNumber),['1','2','3']);
  const raw=D.clone(state);raw.placements[0].equipment.objectNumber='';raw.placements[1].equipment.objectNumber='1';delete raw.placements[2].equipment;
  const migrated=D.validate(raw);
  assert.deepEqual(migrated.placements.map(p=>p.equipment.objectNumber),['2','1','3']);
  D.updateEquipment(state,'da',{objectNumber:'A-01',model:'SW300',quantity:3,note:'Teknikern fyller vidare'});
  const changed=state.placements.find(p=>p.id==='da').equipment;
  assert.deepEqual(changed,{objectNumber:'A-01',model:'SW300',quantity:3,note:'Teknikern fyller vidare'});
  D.updateEquipment(state,'ds',{objectNumber:'1'});assert.equal(D.placementCounts(state).doorAutomation,3);
  unchanged(state,()=>D.updateEquipment(state,'ds',{objectNumber:'a-01'}),/Objektnumret.*används redan/);
  unchanged(state,()=>D.updateEquipment(state,'ds',{objectNumber:'Ａ-01'}),/Objektnumret.*används redan/);
  for(const quantity of [0,1.5,1000,'2'])unchanged(state,()=>D.updateEquipment(state,'da',{quantity}),/Produktantal/);
  unchanged(state,()=>D.updateEquipment(state,'da',{model:'x'.repeat(161)}),/Produkttyp/);
  unchanged(state,()=>D.updateEquipment(state,'da',{objectNumber:'x'.repeat(41)}),/Objektnummer/);
  unchanged(state,()=>D.updateEquipment(state,'da',{note:'x'.repeat(1001)}),/Produktanteckning/);
  const read=D.equipmentFor(state.placements[0]);read.quantity=999;assert.equal(state.placements[0].equipment.quantity,3,'Equipment helper does not expose a mutable reference.');
  assert.deepEqual(D.equipmentFor({}),{objectNumber:'',model:'',quantity:1,note:''});
  assert.deepEqual(D.validate(JSON.parse(JSON.stringify(state))),state,'Categories and object details survive portable serialization.');
}

// Duplicating and pasting retain the specification/quantity but create a distinct
// object number. History snapshots restore material-relevant quantities exactly.
{
  const state=project();place(state,'source','DA',1,{equipment:{objectNumber:'AUTO-42',model:'SW300',quantity:2,note:'Öppnas senare'}});
  const before=D.clone(state),copies=D.duplicatePlacements(state,['source']);
  assert.equal(copies.length,1);assert.notEqual(copies[0].equipment.objectNumber,'AUTO-42');
  assert.deepEqual({...copies[0].equipment,objectNumber:'AUTO-42'},state.placements.find(p=>p.id==='source').equipment);
  assert.equal(D.placementCounts(state).doorAutomation,4);
  const clipboard=D.clone(state.placements[0]);clipboard.equipment.objectNumber='';
  const pasted=D.addPlacement(state,{...clipboard,id:'pasted',page:2});
  assert.equal(new Set(state.placements.map(p=>p.equipment.objectNumber)).size,3);
  assert.equal(pasted.equipment.model,'SW300');assert.equal(D.placementCounts(state).doorAutomation,6);
  D.removePlacements(state,['source']);assert.equal(D.placementCounts(state).doorAutomation,4);
  assert.equal(D.placementCounts(D.validate(before)).doorAutomation,2);
  D.resizeShared(state,pasted.id,32,32,{scope:'code'});
  assert.equal(state.placements.find(p=>p.id===pasted.id).equipment.quantity,2);
}

// Locking protects geometry while allowing the technician to fill equipment
// information. Blank legacy equipment defaults safely; ordinary doorcards do not
// acquire product-object records or material quantities from these helpers.
{
  const state=project();place(state,'locked','DS',1,{locked:true});place(state,'door','GS1');
  D.updateEquipment(state,'locked',{model:'TS83',quantity:3,note:'Monteras enligt projekt'});
  D.updateEquipment(state,'locked',{note:'Kompletterad av tekniker'});
  assert.equal(state.placements[0].equipment.model,'TS83');assert.equal(state.placements[0].equipment.quantity,3);
  assert.equal(D.placementCounts(state).doorCloser,3);assert.equal(state.placements[0].locked,true);
  unchanged(state,()=>D.updatePlacement(state,'locked',{x:.6}),/låst/);
  unchanged(state,()=>D.removePlacements(state,['locked']),/Lås upp/);
  unchanged(state,()=>D.updateEquipment(state,'door',{quantity:2}),/produktstämpel/);
  assert.equal(Object.hasOwn(state.placements[1],'equipment'),false);
  const malformed=D.clone(state);malformed.placements[0].equipment=null;assert.throws(()=>D.validate(malformed),/Produktens uppgifter/);
}


// All door codes share absolute dimensions across pages; small equipment symbols remain independent.
{
  const state=project();place(state,'a','GS1');place(state,'b','GS65',2);place(state,'c','VC');place(state,'symbol','DA');
  const cardBefore=D.clone(state.cards),symbolBefore=D.clone(state.placements.find(p=>p.id==='symbol'));
  assert.deepEqual(D.resizeTargets(state,'a').map(p=>p.id),['a','b','c']);
  D.resizeShared(state,'a',80,32);
  for(const p of state.placements.filter(p=>p.id!=='symbol'))assert.deepEqual([p.width,p.height],[80,32]);
  for(const stencil of Object.values(state.stencils).filter(s=>s.kind==='card'))assert.deepEqual([stencil.width,stencil.height],[80,32]);
  assert.deepEqual(state.placements.find(p=>p.id==='symbol'),symbolBefore);assert.deepEqual(state.cards,cardBefore);
  assert.deepEqual(state.preferences.doorSize,{width:80,height:32});
  assert.deepEqual([D.defaultStencilFor(state,'NEW1').width,D.defaultStencilFor(state,'NEW1').height],[80,32]);
  assert.equal(D.defaultStencilFor(state,'DS').width,28);
  assert.deepEqual([place(state,'future','GS99').width,state.placements.find(p=>p.id==='future').height],[80,32]);
  D.addStencil(state,D.defaultStencilFor(state,'NEW1'));assert.deepEqual([place(state,'custom','NEW1').width,state.stencils.NEW1.height],[80,32]);
}

// Code and single-instance scopes do not overwrite unrelated defaults or the remembered door size.
{
  const state=project();place(state,'a','GS1');place(state,'b','GS1',2);place(state,'other','GS65');
  D.resizeShared(state,'a',70,30,{scope:'code'});
  assert.deepEqual(D.resizeTargets(state,'a',{scope:'code'}).map(p=>p.id),['a','b']);
  assert.deepEqual([state.stencils.GS1.width,state.stencils.GS1.height],[70,30]);assert.equal(state.stencils.GS65.width,48);assert.equal(state.preferences.doorSize,null);
  D.setPreferences(state,{sizeScope:'single'});D.resizeShared(state,'a',90,36);
  assert.equal(state.placements.find(p=>p.id==='a').width,90);assert.equal(state.placements.find(p=>p.id==='b').width,70);assert.equal(state.stencils.GS1.width,70);
  place(state,'da1','DA');place(state,'da2','DA',2);place(state,'ds','DS');
  assert.deepEqual(D.resizeTargets(state,'da1',{scope:'doors'}).map(p=>p.id),['da1','da2']);
  D.resizeShared(state,'da1',34,34,{scope:'doors'});assert.equal(state.stencils.DA.width,34);assert.equal(state.stencils.DS.width,28);assert.equal(state.placements.find(p=>p.id==='other').width,48);
}

// Locked shared targets and rotated page-edge collisions reject the entire update, including defaults.
{
  const state=project();place(state,'a','GS1');place(state,'locked','GS65',2,{locked:true});
  unchanged(state,()=>D.resizeShared(state,'a',80,32),/låst.*Lås upp/);
  D.resizeShared(state,'a',48,28);assert.equal(state.placements.find(p=>p.id==='locked').locked,true,'Oförändrat mått får behålla låsta mål.');
  D.updatePlacement(state,'locked',{locked:false});
  place(state,'edge','GS2',2,{x:.025,rotation:90,width:48,height:28});
  unchanged(state,()=>D.resizeShared(state,'a',80,50),/utanför ritningssidan/);
  unchanged(state,()=>D.resizeStencilShared(state,'GS1',80,50),/utanför ritningssidan/);
  unchanged(state,()=>D.resizeShared(state,'a',501,20),/Stämpelbredd/);
  unchanged(state,()=>D.resizeShared(state,'missing',80,20),/finns inte/);
  unchanged(state,()=>D.resizeShared(state,'a',80,20,{scope:'all'}),/Välj storlek/);
}

// The stencil dialog can save a shared size before the first placement, or change only its own defaults.
{
  const state=project();D.resizeStencilShared(state,'GS65',76,30);assert.equal(state.preferences.doorSize.width,76);assert.equal(state.stencils.GS1.width,76);
  place(state,'a','GS65');D.resizeStencilShared(state,'GS65',90,40,{scope:'single'});assert.equal(state.stencils.GS65.width,90);assert.equal(state.placements[0].width,76);assert.equal(state.stencils.GS1.width,76);
  D.resizeStencilShared(state,'GS65',84,32,{scope:'code'});assert.equal(state.placements[0].width,84);assert.equal(state.stencils.GS1.width,76);
  D.updatePlacement(state,'a',{locked:true});unchanged(state,()=>D.resizeStencilShared(state,'GS65',88,34,{scope:'code'}),/Lås upp/);
}

// Aligning uses the visible rotated edges in page points; distribution makes equal free gaps.
{
  const state=project();place(state,'a','GS1',1,{x:.2,y:.2,width:100,height:20});place(state,'b','GS2',1,{x:.5,y:.4,width:80,height:30,rotation:90});place(state,'c','GS3',1,{x:.8,y:.7,width:60,height:40,rotation:45});
  for(const [mode,property] of [['left','left'],['centerX','cx'],['right','right'],['top','top'],['centerY','cy'],['bottom','bottom']]){
    const trial=D.clone(state),cards=D.clone(trial.cards);D.alignPlacements(trial,['a','b','c'],mode);
    approximate(bounds(trial,'a')[property],bounds(trial,'b')[property]);approximate(bounds(trial,'b')[property],bounds(trial,'c')[property]);assert.deepEqual(trial.cards,cards);
  }
  for(const axis of ['X','Y']){
    const trial=D.clone(state);D.alignPlacements(trial,['c','a','b'],'distribute'+axis);const bs=['a','b','c'].map(id=>bounds(trial,id));
    approximate(axis==='X'?bs[1].left-bs[0].right:bs[1].top-bs[0].bottom,axis==='X'?bs[2].left-bs[1].right:bs[2].top-bs[1].bottom);
  }
  place(state,'other-page','GS4',2);
  unchanged(state,()=>D.alignPlacements(state,['a','other-page'],'left'),/samma ritningssida/);
  unchanged(state,()=>D.alignPlacements(state,['a','b'],'distributeX'),/minst tre/);
  unchanged(state,()=>D.alignPlacements(state,['a','missing'],'left'),/finns inte/);
  D.updatePlacement(state,'b',{locked:true});unchanged(state,()=>D.alignPlacements(state,['a','b'],'left'),/Lås upp/);
}

// Each placed product counts once, including copies, locked positions and other pages.
// Counts are derived from current project state, so history snapshots restore them exactly.
{
  const state=project();assert.deepEqual(D.placementCounts(state),{markings:0,cards:0,doorAutomation:0,doorCloser:0,otherProducts:0});
  assert.equal(state.stencils.DA.kind,'symbol');assert.equal(state.stencils.DA.productType,'doorAutomation');assert.equal(state.stencils.DA.name,'Dörrautomatik');
  assert.equal(state.stencils.DS.kind,'symbol');assert.equal(state.stencils.DS.productType,'doorCloser');assert.equal(state.stencils.DS.name,'Dörrstängare');
  assert.equal(state.stencils.DADS,undefined);assert.equal(D.SPECIAL_CODES.includes('DADS'),false);
  place(state,'da1','DA');place(state,'da2','DA',2,{locked:true});place(state,'ds1','DS');
  assert.deepEqual(D.placementCounts(state),{markings:3,cards:0,doorAutomation:2,doorCloser:1,otherProducts:0});
  assert.deepEqual(Object.keys(state.cards),[],'Product symbols never create doorcards.');
  place(state,'gs1','GS1');place(state,'gs2','GS1',2);place(state,'gs3','GS65');
  D.ensureCard(state,'UNPLACED1');
  assert.deepEqual(D.placementCounts(state),{markings:6,cards:3,doorAutomation:2,doorCloser:1,otherProducts:0});
  const beforeCopy=D.clone(state);D.duplicatePlacements(state,['da1','ds1']);
  assert.deepEqual(D.placementCounts(state),{markings:8,cards:3,doorAutomation:3,doorCloser:2,otherProducts:0});
  const afterCopy=D.clone(state);D.removePlacements(state,['da1','ds1']);
  assert.deepEqual(D.placementCounts(state),{markings:6,cards:3,doorAutomation:2,doorCloser:1,otherProducts:0});
  assert.deepEqual(D.placementCounts(D.validate(beforeCopy)),{markings:6,cards:3,doorAutomation:2,doorCloser:1,otherProducts:0},'Undo snapshot restores original product counts.');
  assert.deepEqual(D.placementCounts(D.validate(afterCopy)),{markings:8,cards:3,doorAutomation:3,doorCloser:2,otherProducts:0},'Redo snapshot restores copied products.');
  unchanged(state,()=>D.removePlacements(state,['da2']),/Lås upp/);
  place(state,'again','DA');assert.equal(D.placementCounts(state).doorAutomation,3);
  assert.deepEqual(D.validate(JSON.parse(JSON.stringify(state))),state,'Product classification survives portable JSON round trips.');
}

// A custom name is never interpreted by substring. Explicit classification gives it a product count.
{
  const state=project();
  D.addStencil(state,{...D.defaultStencil('DBL-DS'),kind:'symbol'});
  place(state,'custom','DBL-DS');assert.equal(D.placementCounts(state).doorCloser,0);
  assert.equal(D.stencilLabel(state.stencils['DBL-DS']),'Dörrstämpel utan dörrkort');
  D.updateStencil(state,'DBL-DS',{productType:'doorCloser'});
  assert.equal(D.placementCounts(state).doorCloser,1);assert.equal(D.stencilLabel(state.stencils['DBL-DS']),'Dörrstängare');
  assert.equal(D.stencilLabel(state.stencils.DA),'Dörrautomatik');assert.equal(D.stencilLabel(state.stencils.GS1),'Dörrstämpel med dörrkort');
  unchanged(state,()=>D.updateStencil(state,'DBL-DS',{productType:'invented'}),/Välj dörrautomatik/);
  unchanged(state,()=>D.updateStencil(state,'GS1',{productType:'doorAutomation'}),/utan dörrkort/);
  D.updateStencil(state,'DBL-DS',{productType:'none'});assert.equal(D.placementCounts(state).doorCloser,0);
}

// Existing 2.2 projects retain their work. Retired tools disappear, while DA/DS gain exact metadata.
{
  const Old=require('../smartmatch-projektering-v2-2-data.js');
  const legacy=Old.createEmpty('Äldre projekt');legacy.drawing={name:'legacy.pdf',pages:[page()]};
  Old.addPlacement(legacy,{id:'old-da',stencilId:'DA',page:1,x:.3,y:.5});
  Old.addPlacement(legacy,{id:'old-ds',stencilId:'DS',page:1,x:.5,y:.5});
  Old.addPlacement(legacy,{id:'old-combined',stencilId:'DADS',page:1,x:.7,y:.5});
  assert(legacy.preferences.toolbarTools.includes('alignTools'));
  const upgraded=D.validate(legacy);
  assert.deepEqual(upgraded.placements.map(({equipment,...p})=>p),legacy.placements);assert.deepEqual(upgraded.cards,legacy.cards);
  assert.equal(upgraded.stencils.DADS.kind,'symbol');assert.equal(upgraded.stencils.DADS.productType,'none','Legacy combined symbols stay editable without double counting.');
  assert.deepEqual(D.placementCounts(upgraded),{markings:3,cards:0,doorAutomation:1,doorCloser:1,otherProducts:0});
  assert.equal(upgraded.preferences.toolbarTools.includes('alignTools'),false);assert.equal(D.TOOLBAR_TOOLS.includes('alignTools'),false);
  const bad=D.clone(legacy);bad.preferences.toolbarTools.push('unknown-tool');assert.throws(()=>D.validate(bad),/okänt/);
  // Even an older user-created DA card must not be discarded or converted into a product.
  const oldCard=Old.createEmpty();oldCard.drawing={name:'legacy-card.pdf',pages:[page()]};
  Old.updateStencil(oldCard,'DA',{kind:'card'});Old.addPlacement(oldCard,{id:'saved-da-card',stencilId:'DA',page:1,x:.5,y:.5});
  oldCard.cards.DA.note='Sparat kundinnehåll';
  const preserved=D.validate(oldCard);assert.equal(preserved.stencils.DA.kind,'card');assert.equal(preserved.stencils.DA.productType,'none');
  assert.equal(preserved.cards.DA.note,'Sparat kundinnehåll');assert.equal(D.placementCounts(preserved).doorAutomation,0);
}

console.log('Projektering 2.4 data: categories, DFS, product object identities/details/quantities, copies, metadata on locked geometry, legacy preservation and prior model regression passed.');
