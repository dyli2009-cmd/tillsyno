'use strict';
// Regression for GS arrows and the ED100/ED200/ED250 family.
// Run: node tests/smartmatch-nearest-ed-family-v36-99.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'..','smartmatch-da-v36-99-module.js'),'utf8');
const hook=' init(null);\n return {init,';
assert.ok(source.includes(hook),'module testing hook');
source=source.replace(hook,' window.__test={cardModelCode,compatibleGsMachineTypes,proposeGS,linkCardCache,refreshExistingAutomaticGs,setGsLink,drawArrows};\n return {init,');
const models=[['17','Dorma ED 200'],['24','Dorma ED 100'],['37','Dorma ED 250'],['45','Entramatic SW300']];
const makeGs=(name,x)=>({id:name,code:name,rect:[x,0,x+10,12],page:1,position:1});
const g1=makeGs('GS1',20),g2=makeGs('GS2',300),g3=makeGs('GS3',570);
const positions=[g1,g2,g3],indexes={GS1:[2],GS2:[3],GS3:[4]};
const cards={GS1:['Dörrautomatik ED200'],GS2:['Dörrautomatik ED100 ID-märkning 20-83-92-3-24-10'],GS3:['Dörrautomatik ED250']};
const item=(x,id,type='24')=>({id,page:1,rect:[x,0,x+10,12],objectNo:'20-83-92-3',modelCode:type,serialNumber:'10',sourceText:'20-83-92-3-'+type+'-10',checks:{},slrDocuments:{},linkedGsId:'',linkedGsCode:''});
let entries=[item(19,'DA1')],saves=0;
const bridge={
 getPdf:()=>({numPages:4}),getPage:()=>1,getPositions:()=>positions,getItems:()=>entries,
 getModels:()=>models,getDrawingLimit:()=>4,getDoorCardIndex:()=>indexes,getDoorCardMapping:()=>({}),
 readPageText:async p=>({items:(cards[Object.keys(indexes).find(k=>indexes[k].includes(p))]||[]).map(text=>({text}))}),
 groupRows:items=>items,save:()=>{saves++},redraw(){},setStatus(){},
 viewportRect:(_,r)=>({left:r[0],top:r[1],width:r[2]-r[0],height:r[3]-r[1]})
};
const node=tag=>({tag,children:[],attributes:{},style:{},classList:{toggle(){},remove(){},add(){}},addEventListener(){},setAttribute(k,v){this.attributes[k]=v},appendChild(n){this.children.push(n)},replaceChildren(){this.children=[]}});
const svg=node('svg'),document={getElementById:id=>id==='pwDAArrows'?svg:node('div'),createElementNS:(_ns,tag)=>node(tag),body:node('body')};
const window={SmartMatchAppBridge:bridge};
vm.runInNewContext(source,{window,document,console,Math,Map,Set});
const api=window.__test;
(async()=>{
 let assertions=0;
 const eq=(a,b,label)=>{assert.equal(a,b,label);assertions++};
 for(const [name,type] of [['ED100','24'],['ID 100','24'],['ID100','24'],['ED200','17'],['ED 200','17'],['ID200','17'],['Dorma ID 200','17'],['ED250','37'],['ID250','37'],['ID 250','37']])
  eq(api.cardModelCode(name,models),type,name);
 for(const a of ['17','24','37'])for(const b of ['17','24','37'])
  if(a!==b)eq(api.compatibleGsMachineTypes(a,b),true,'ED compatibility '+a+' '+b);
 eq(api.compatibleGsMachineTypes('45','24'),false,'SW300 not in ED family');
 let choice=await api.proposeGS(entries[0],api.linkCardCache);
 eq(choice.g?.id,'GS1','near ED200 must beat far exact ID on GS2');
 const two=item(302,'DA2'),three=item(570,'DA3');entries=[entries[0],two,three];
 choice=await api.proposeGS(two,api.linkCardCache);eq(choice.g?.id,'GS2','automation #2 points to GS2');
 choice=await api.proposeGS(three,api.linkCardCache);eq(choice.g?.id,'GS3','automation #3 points to GS3');
 for(const da of entries){choice=await api.proposeGS(da,api.linkCardCache);api.setGsLink(da,choice.g,false)}
 api.drawArrows({width:850,height:100},entries,1);
 eq(svg.children.filter(n=>n.tag==='path').length,3,'three distinct automations, three arrows');
 const duplicate={...entries[0],id:'historic-duplicate',rect:[20,0,30,12],checks:{'1.2':{result:'ok'}}};
 api.drawArrows({width:850,height:100},[...entries,duplicate],1);
 eq(svg.children.filter(n=>n.tag==='path').length,3,'historic duplicate does not double arrow');
 cards.GS1=['Dörrautomatik -'];api.linkCardCache.clear();
 choice=await api.proposeGS(entries[0],api.linkCardCache);
 eq(choice.g||null,null,'do not link to distant GS2 when local door has no automation');
 cards.GS1=['Dörrautomatik ID200'];api.linkCardCache.clear();
 const old=item(19,'stale-automatic');
 old.linkedGsId='GS2';old.linkedGsCode='GS2';old.linkedGsRect=[...g2.rect];
 old.checks={'1.2':{result:'remark'}};entries=[old];
 await api.proposeGS(old,api.linkCardCache);
 api.refreshExistingAutomaticGs();
 eq(old.linkedGsId,'GS1','reassign old GS2 automatic arrow on reopen');
 eq(old.checks['1.2'].result,'remark','retain inspection results');
 eq(saves,1,'save once after repair');
 const manual=item(19,'operator-manual');
 manual.linkedGsId='GS2';manual.linkedGsCode='GS2';manual.linkedGsRect=[...g2.rect];manual.gsLinkConfirmed=true;
 entries=[manual];api.refreshExistingAutomaticGs();
 eq(manual.linkedGsId,'GS2','operator confirmed arrow not overridden');
 const dismissed=item(19,'operator-dismissed');dismissed.gsLinkDismissed=true;entries=[dismissed];
 api.refreshExistingAutomaticGs();
 eq(Boolean(dismissed.linkedGsId),false,'operator dismissal retained');
 console.log('PASS SmartMatch v36.99: '+assertions+' assertions');
})().catch(error=>{console.error(error);process.exitCode=1});
