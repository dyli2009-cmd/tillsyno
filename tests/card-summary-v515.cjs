const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v514-data.js'),L=require('../smartmatch-projektering-v514-library.js'),T=require('../smartmatch-product-times-v513.js'),C=require('../smartmatch-projektering-v2-19-catalog.js');
const state=D.createEmpty(),card=D.createCard('GS4');
Object.assign(card.rows.find(r=>r.id==='day-lock'),{product:'212-50',delivery:'DT',installer:'DT'});
card.rows.push({id:'import-extra',section:'Övrigt',label:'Specialbeslag',category:'other',product:'Eget beslag',quantity:1,delivery:'GS',installer:'GS'});
D.updateCard(state,'GS4',card);
const fields={},ctx={D,L,Proj2ProductTimes:T,Proj2Catalog:C,state,draft:state.cards.GS4,activeCode:'GS4',dirty:false,library:L.createDefault(),$:id=>fields[id]??=( {}),esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),workTime:n=>n+' min'};
function functionSource(file,name,next){const s=fs.readFileSync(file,'utf8');return s.slice(s.indexOf('  function '+name+'('),s.indexOf('  function '+next+'('));}
assert.throws(()=>vm.runInNewContext(functionSource('smartmatch-projektering-v514.js','renderCardSummary','updateCardOverview')+'renderCardSummary()',ctx),/känd produktkategori/);
vm.runInNewContext(functionSource('smartmatch-projektering-v515.js','renderCardSummary','updateCardOverview')+'renderCardSummary()',ctx);
const html=fields.cardSummary.innerHTML;assert(html.includes('212-50'));assert(html.includes('Eget beslag'));assert(html.includes('6 min</small>'));assert(html.includes('summary-product-name'));assert(!html.includes('/st</small>'));assert(!html.includes('≈ '));assert(html.includes('DT</span>'));
const source=fs.readFileSync('smartmatch-projektering-v515.js','utf8');assert(source.includes('touchTapOpens:false,mouseClickOpens:false'));
(async()=>{let opened=0,rendered=0;const selectionCtx={state:{placements:[{id:'p4',code:'GS4',stencilId:'GS4'}],stencils:{GS4:{kind:'card'}}},activeCode:null,selected:[],selectedAnnotation:null,viewer:{setSelection(){},setAnnotationSelection(){}},renderAnnotationPanel(){},leaveDraft:async()=>true,setActive(code){selectionCtx.activeCode=code;},revealStencil(){},renderAll(){rendered++},openCardView(){opened++}};
const start=source.indexOf('  async function selectIds('),end=source.indexOf('  let pendingObjectPlacement',start);vm.createContext(selectionCtx);vm.runInContext(source.slice(start,end),selectionCtx);await vm.runInContext("selectIds(['p4'])",selectionCtx);assert.equal(opened,0);assert.equal(rendered,1);assert.equal(selectionCtx.activeCode,'GS4');
const a=source.indexOf('  async function activate('),b=source.indexOf('  async function removePositions(',a);selectionCtx.D={isReferenceStencil:()=>false};vm.runInContext(source.slice(a,b),selectionCtx);await vm.runInContext("activate({id:'p4'})",selectionCtx);assert.equal(opened,1);
console.log('PASS reproduces previous category error; all imported and standard products render, aligned cells, compact times, single selection and double activation');
})().catch(e=>{console.error(e);process.exitCode=1});
