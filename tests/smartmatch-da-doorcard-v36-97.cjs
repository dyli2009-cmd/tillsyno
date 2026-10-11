'use strict';
/* Run: node tests/smartmatch-da-doorcard-v36-97.cjs
   Self-contained regression fixtures; no customer PDF is committed. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'..','smartmatch-da-v36-97-module.js'),'utf8');
const hook=" init(null);\n return {init,";
assert(source.includes(hook),'Expected non-production test injection anchor');
source=source.replace(hook," window.__daTest={proposeGS,chooseNearestGS,gsCandidates,setGsLink,drawArrows,cardIssue};\n return {init,");
const cards={
  2:['Dörrautomatik -'],
  3:['Dörrautomatik ED 100','ID-märkning 20-83-92-3-24-10'],
  4:['Dörrautomatik SW300','ID-märkning 20-83-92-3-45-10'],
  5:['Dörrautomatik ED 250','ID-märkning 20-83-92-3-37-10'],
  6:['Dörrautomatik ED 100','ID-märkning 20-83-92-3-24-10']
};
const g=(code,page,x,id=code)=>({id,code,page,rect:[x,0,x+10,10],position:1});
const gs1=g('GS1',1,0),gs2=g('GS2',1,70),gs3=g('GS3',1,12),gs4=g('GS4',1,20),gs5=g('GS5',1,70);
const positions=[gs1,gs2,gs3,gs4];
const models=[['24','Dorma ED 100'],['37','Dorma ED 250'],['45','SW300']];
const item={id:'test-1',page:1,rect:[3,0,13,10],objectNo:'20-83-92-3',modelCode:'24',serialNumber:'10',sourceText:'20-83-92-3-24-10'};
const bridge={
 getPdf:()=>({numPages:6}),getPage:()=>1,getPositions:()=>positions,getItems:()=>[item],
 getModels:()=>models,getDoorCardIndex:()=>({GS1:[2],GS2:[3],GS3:[4],GS4:[5],GS5:[6]}),
 getDoorCardMapping:()=>({}),
 readPageText:async p=>({items:cards[p].map(text=>({text}))}),
 groupRows:items=>items,
 viewportRect:(_vp,r)=>({left:r[0],top:r[1],width:r[2]-r[0],height:r[3]-r[1]})
};
function node(tag){return {tag,children:[],attributes:{},style:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]}}}
const svg=node('svg');
const document={getElementById:id=>id==='pwDAArrows'?svg:null,createElementNS:(_ns,name)=>node(name)};
const window={SmartMatchAppBridge:bridge};
vm.runInNewContext(source,{window,document,console,Math,Map,Set});
const api=window.__daTest;
(async()=>{
 const first=await api.proposeGS(item,new Map());
 assert.equal(first.g?.code,'GS2','Near GS1 without automation and GS3 with wrong type must be rejected; exact GS2 wins');
 const familyOnly=[gs1,gs3,gs4];positions.splice(0,positions.length,...familyOnly);
 const second=await api.proposeGS(item,new Map());
 assert.equal(second.g?.code,'GS4','ED100 and ED250 may match same object/serial as compatible family');
 positions.splice(0,positions.length,gs1,gs2,gs3,gs4,gs5);
 const tied=await api.proposeGS(item,new Map());
 assert.equal(tied.g,undefined,'Equally strong and equally distant GS must require manual selection');
 positions.splice(0,positions.length,gs1,gs2,gs3,gs4);
 const confirmed=await api.proposeGS(item,new Map());
 api.setGsLink(item,confirmed.g,false);
 const duplicate={...item,id:'test-old-copy',checks:{'1.2':true},rect:[4,0,14,10],linkedGsId:gs2.id,linkedGsCode:gs2.code,linkedGsRect:gs2.rect};
 api.drawArrows({width:150,height:100},[item,duplicate],1);
 assert.equal(svg.children.filter(x=>x.tag==='path').length,1,'One arrow per physical automation despite duplicate saved records');
 console.log('SmartMatch DA v36.97: door-card matching, ED compatibility, ambiguity and one-arrow regression PASS');
})().catch(err=>{console.error(err);process.exitCode=1});
