'use strict';
/* node tests/smartmatch-ed100-ed250-v36-98.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'..','smartmatch-da-v36-98-module.js'),'utf8');
const hook=' init(null);\n return {init,';
assert.ok(source.includes(hook),'module test hook must exist');
source=source.replace(hook,' window.__test={cardModelCode,compatibleGsMachineTypes,proposeGS,linkCardCache,drawArrows,setGsLink};\n return {init,');
const mk=(code,x)=>({code,id:code,page:1,rect:[x,0,x+8,10],position:1});
const positions=[mk('GS1',0),mk('GS2',50)];
const cards={GS1:['Dörrautomatik SW300'],GS2:['Dörrautomatik ID 100']};
const indexes={GS1:[2],GS2:[3]};
const models=[['24','Dorma ED 100'],['37','Dorma ED 250'],['45','Entramatic SW 300']];
const makeItem=(type,serial='10')=>({id:'DA',page:1,rect:[0,0,8,10],objectNo:'20-83-92-3',modelCode:type,model:models.find(m=>m[0]===type)?.[1],serialNumber:serial,sourceText:'20-83-92-3-'+type+'-'+serial});
let item=makeItem('37'),items=[item];
const bridge={
 getPdf:()=>({numPages:3}),getPage:()=>1,getPositions:()=>positions,getItems:()=>items,getModels:()=>models,
 getDoorCardIndex:()=>indexes,getDoorCardMapping:()=>({}),
 readPageText:async n=>({items:(Object.keys(indexes).find(k=>indexes[k].includes(n))?cards[Object.keys(indexes).find(k=>indexes[k].includes(n))]:[]).map(text=>({text}))}),
 groupRows:items=>items,getDrawingLimit:()=>3,
 viewportRect:(_vp,r)=>({left:r[0],top:r[1],width:r[2]-r[0],height:r[3]-r[1]})
};
function node(tag){return {tag,children:[],attributes:{},style:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]}}}
const svg=node('svg'),document={getElementById:id=>id==='pwDAArrows'?svg:null,createElementNS:(_ns,name)=>node(name)};
const window={SmartMatchAppBridge:bridge};
vm.runInNewContext(source,{window,document,console,Math,Map,Set});
const api=window.__test;
(async()=>{
 for(const [raw,code] of [['ID250','37'],['ID 250','37'],['Dorma ID 250','37'],['ED250','37'],['ED 250','37'],['ID100','24'],['ID 100','24'],['Dorma ED 100','24'],['SW300','45']])
  assert.equal(api.cardModelCode(raw,models),code,raw);
 assert.equal(api.compatibleGsMachineTypes('24','37'),true);
 assert.equal(api.compatibleGsMachineTypes('37','24'),true);
 assert.equal(api.compatibleGsMachineTypes('45','37'),false);
 const tests=[
  ['37','Dörrautomatik ID 100','GS2'],
  ['24','Dörrautomatik ID250','GS2'],
  ['24','Dörrautomatik ED 250','GS2'],
  ['37','Dörrautomatik ID 100 | ID-märkning 20-83-92-3-24-10','GS2'],
  ['24','Dörrautomatik ID250 | ID-märkning 20-83-92-3-37-10','GS2'],
  ['37','Dörrautomatik ID100 | ID-märkning 20-83-92-3-24-11',null],
  ['37','Dörrautomatik SW300',null]
 ];
 for(const [type,card,target] of tests){
  item=makeItem(type);items=[item];cards.GS2=[card];api.linkCardCache.clear();
  const choice=await api.proposeGS(item,api.linkCardCache);
  assert.equal(choice.g?.code||null,target,type+' / '+card);
 }
 item=makeItem('37');items=[item];cards.GS2=['Dörrautomatik ID 100'];api.linkCardCache.clear();
 const chosen=await api.proposeGS(item,api.linkCardCache);
 assert.equal(chosen.g?.code,'GS2');
 api.setGsLink(item,chosen.g,false);
 const duplicate={...item,id:'DA-historic',rect:[1,0,9,10],checks:{'1.2':{result:'ok'}}};
 api.drawArrows({width:150,height:100},[item,duplicate],1);
 assert.equal(svg.children.filter(x=>x.tag==='path').length,1,'duplicate historic DA must not draw two arrows');
 console.log('PASS 20 SmartMatch GS/ED100/ED250 assertions and one-arrow regression');
})().catch(err=>{console.error(err);process.exitCode=1});
