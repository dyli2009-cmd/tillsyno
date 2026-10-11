'use strict';
/* Real Snidaren 3.pdf page 3 geometry regression.
   Source PDF remains private, only measured ID/DA/GS rectangles are fixtures.
   Run: node tests/smartmatch-snidaren-gs2-v36-100.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'..','smartmatch-da-v36-100-module.js'),'utf8');
const hook=' init(null);\n return {init,';
assert.ok(source.includes(hook),'SmartMatch DA injection point');
source=source.replace(hook,' window.__test={readDASymbols,automationAnchor,proposeGS,linkCardCache,daTextSymbolCache,refreshExistingAutomaticGs,setGsLink,drawArrows};\n return {init,');
const rect=(x,y,w,h)=>[x,y,x+w,y+h];
const gs4={id:'GS4-top',code:'GS4',page:3,rect:rect(2226,3105,27,40)};
const gs2={id:'GS2-lower',code:'GS2',page:3,rect:rect(2374,3113,28,41)};
const gs2other={id:'GS2-another',code:'GS2',page:3,rect:rect(2549,3105,28,41)};
const positions=[gs4,gs2,gs2other];
const models=[['24','Dorma ED 100'],['37','Dorma ED 250'],['17','Dorma ED 200']];
const makeItem=(number,r)=>({id:'200154-28-24-'+number,page:3,rect:r,objectNo:'200154-28',modelCode:'24',model:'Dorma ED 100',serialNumber:String(number),sourceText:'200154-28-24-'+number,checks:{'1.1':{result:'remark'}},slrDocuments:{note:'preserve'}});
const upper=makeItem(1,rect(2164,3079,15,101));
const lower=makeItem(2,rect(2305,3115,15,101));
let items=[upper,lower],saves=0;
const bridge={
 getPdf:()=>({numPages:25}),getPage:()=>3,getPositions:()=>positions,getItems:()=>items,
 getModels:()=>models,getDoorCardIndex:()=>({GS2:[12],GS4:[14]}),
 getDoorCardMapping:()=>({}),getDrawingLimit:()=>25,
 readPageText:async p=>p===3?{items:[
  {text:'DA',x:2236,y:3126,w:4,transform:[1,0,0,1,0,0]},
  {text:'DA',x:2369,y:3120,w:4,transform:[1,0,0,1,0,0]}
 ]}:[12,14].includes(p)?{items:[{text:'Dörrautomatik'},{text:'ED100'}]}:{items:[]},
 groupRows:items=>items,
 save:()=>{saves++},redraw(){},setStatus(){},
 viewportRect:(_,r)=>({left:r[0],top:r[1],width:r[2]-r[0],height:r[3]-r[1]})
};
const node=tag=>({tag,children:[],attributes:{},style:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(){}});
const svg=node('svg'),document={getElementById:id=>id==='pwDAArrows'?svg:node('div'),createElementNS:(_ns,t)=>node(t)};
const window={SmartMatchAppBridge:bridge};
vm.runInNewContext(source,{window,document,console,Map,Set,Math});
const api=window.__test;
(async()=>{
 let assertions=0;
 const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);assertions++};
 let result=await api.proposeGS(upper,api.linkCardCache);
 eq(result.g?.code,'GS4','200154-28-24-1 belongs to the upper door GS4');
 result=await api.proposeGS(lower,api.linkCardCache);
 eq(result.g?.code,'GS2','200154-28-24-2 belongs to the lower door GS2');
 eq(api.automationAnchor(lower).source,'da-symbol','physical DA sign is source of distance');
 eq(Math.abs(api.automationAnchor(lower).p[0]-2371)<5,true,'physical DA sign at lower GS2');
 api.setGsLink(lower,gs4,false);
 const savedChecks=JSON.stringify(lower.checks),savedSLR=JSON.stringify(lower.slrDocuments);
 api.refreshExistingAutomaticGs();
 eq(lower.linkedGsCode,'GS2','stale unconfirmed GS4 arrow corrected on project reopen');
 eq(JSON.stringify(lower.checks),savedChecks,'inspection results preserved');
 eq(JSON.stringify(lower.slrDocuments),savedSLR,'SLR preserved');
 api.setGsLink(upper,gs4,false);
 api.drawArrows({width:3000,height:3400},[upper,lower],3);
 eq(svg.children.filter(x=>x.tag==='path').length,2,'one arrow for each distinct physical automation');
 const shifted=makeItem(2,rect(2295,3115,15,101));items=[upper,shifted];
 result=await api.proposeGS(shifted,api.linkCardCache);
 eq(result.g?.code,'GS2','assign distinct DA signs when marker text shifted toward GS4');
 api.daTextSymbolCache.set(3,[]);
 eq(api.automationAnchor(shifted).source,'text','fallback if DA signs unreadable');
 api.daTextSymbolCache.set(3,[{p:[2238,3126]},{p:[2371,3120]}]);
 const manual={...lower,id:'manual-link',linkedGsId:gs4.id,linkedGsCode:'GS4',gsLinkConfirmed:true};
 items=[manual];api.refreshExistingAutomaticGs();
 eq(manual.linkedGsCode,'GS4','confirmed operator choice must not change');
 console.log('PASS Snidaren page 3: '+assertions+' checks; -1→GS4, -2→GS2');
})().catch(err=>{console.error(err);process.exitCode=1});
