'use strict';
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-2-data.js');

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
  D.setPreferences(state,{sizeScope:'code',toolbarTools:['toolPan','alignTools'],autoOpenCard:false,doorSize:{width:70,height:30}});
  assert.equal(state.project.revision,revision+1);assert.deepEqual(D.validate(JSON.parse(JSON.stringify(state))).preferences,state.preferences);
  for(const patch of [{sizeScope:'all'},{toolbarTools:['toolSelect']},{toolbarTools:['undo','undo']},{toolbarTools:['fullscreen']},{autoOpenCard:'yes'},{doorSize:{width:0,height:20}}])unchanged(state,()=>D.setPreferences(state,patch),/Välj|Verktyg|Inställning|Stämpel/);
  assert.throws(()=>D.validate({...state,preferences:null}),/inställningar/);
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

console.log('Projektering 2.2 data: preferences, shared sizes, atomic bounds/locks and rotated alignment passed.');
