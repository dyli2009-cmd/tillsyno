const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('smartmatch-slr-test-da-v36-132.js','utf8');
function extract(a,b){const start=src.indexOf(a),end=src.indexOf(b,start);assert(start>=0&&end>start);return src.slice(start,end);}
class Element{
 constructor(){this.children=[];this.attributes={};this.style={};this.classList={toggle(){}};this.value='';}
 appendChild(e){this.children.push(e);return e;} replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attributes[k]=String(v);} remove(){} addEventListener(){}
}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const positions=[{id:'45-left',code:'GS45',position:1,page:1,rect:[100,100,140,120]},{id:'45-right',code:'GS45',position:2,page:1,rect:[600,100,640,120]},{id:'46',code:'GS46',position:1,page:1,rect:[100,350,140,370]}];
const item={id:'da',page:1,sourceText:'151551-1-15-1',rect:[300,250,440,270],linkedGsId:'46',checks:{one:true},slrDocuments:{saved:true},arrowTip:{u:0,v:0}};
let located,prepared=0,saved=0,validate=async()=>true;
const api={getItems:()=>[item],getPositions:()=>positions,getPage:()=>1,prepareStampSelection:()=>prepared++,locate:g=>{located=g;},setStatus(){},redraw(){},save:()=>saved++,viewportRect:(v,r)=>({left:r[0]*v.scale,top:r[1]*v.scale,width:(r[2]-r[0])*v.scale,height:(r[3]-r[1])*v.scale})};
const c=vm.createContext({ctx:()=>api,$:el,loaded:()=>true,getSelected:()=>item,gsOnPage:p=>positions.filter(g=>g.page===p),closeDoor(){},stopManual(){},stopMove(){},confirmValidLink:(...args)=>validate(...args),itemFullId:o=>o.sourceText,formatGSPosition:g=>g.code+' · position '+g.position+' · sida '+g.page,samePhysicalAutomation:()=>false,resolveGs:o=>positions.find(g=>g.id===o.linkedGsId),conflictingPhysicalGS:()=>false,document:{body:new Element(),createElement:()=>new Element(),createElementNS:()=>new Element()}});
vm.runInContext("let pendingGSItemId='',gsPickTarget=null,gsPickGuide=null,gsPickEpoch=0,gsPickBusy=false,editingArrowId='';"+extract(' function setGsLink(',' function resolveGsRaw(')+extract(' function stopGsPick(',' async function saveLink(')+extract(' function drawArrows(',' // Always wire the entry button')+extract(' function onGSClick(','\n function init('),c);
c.item=item;c.target=positions[0];c.wrongPage={...positions[0],page:2};c.viewport={scale:2,width:1600,height:1000};
const run=s=>vm.runInContext(s,c),arrow=()=>el('pwDAArrows').children.find(e=>e.attributes['data-da-id']==='da');
(async()=>{
 el('pwDAGsSelect').value='45-right';run('chooseOnDrawing()');assert.equal(located.id,'45-right');assert.equal(prepared,1);assert.equal(item.linkedGsId,'46');
 run('drawArrows(viewport,[item],1)');assert.equal(arrow().attributes['data-gs-id'],'45-right');assert.equal(arrow().attributes['data-gs-preview'],'true');const tip=arrow().attributes.d.split('L')[1].split(',').map(Number);assert(tip[0]>=1200&&tip[0]<=1280);assert.equal(tip[1],240); // scaled lower edge of the chosen physical GS45
 run('onGSClick(wrongPage)');assert.equal(run('pendingGSItemId'),'da');assert.equal(run('gsPickTarget.id'),'45-right');
 run('onGSClick(target)');assert.equal(item.linkedGsId,'46');run('drawArrows(viewport,[item],1)');assert.equal(arrow().attributes['data-gs-id'],'45-left');
 run('stopGsPick();drawArrows(viewport,[item],1)');assert.equal(arrow().attributes['data-gs-id'],'46');assert.equal(saved,0);
 run('chooseOnDrawing()');validate=async()=>false;await run('commitPickedGS(gsPickTarget)');assert.equal(item.linkedGsId,'46');assert.equal(saved,0);
 validate=async()=>true;await run('commitPickedGS(gsPickTarget)');assert.equal(item.linkedGsId,'45-right');assert.equal(item.gsLinkConfirmed,true);assert.equal(item.arrowTip,null);assert.equal(saved,1);assert.deepEqual(item.checks,{one:true});assert.deepEqual(item.slrDocuments,{saved:true});
 run('drawArrows(viewport,[item],1)');assert.equal(arrow().attributes['stroke-dasharray'],undefined);assert.equal(arrow().attributes['data-gs-id'],'45-right');
 el('pwDAGsSelect').value='45-left';run('chooseOnDrawing()');let finish;validate=()=>new Promise(r=>finish=r);const pending=run('commitPickedGS(gsPickTarget)');run('stopGsPick()');finish(true);await pending;assert.equal(item.linkedGsId,'45-right');assert.equal(saved,1);
 console.log('PASS: selected physical GS45, zoomed arrow endpoint, manual retarget, same-page guard, cancel/decline/stale async, confirmed save and retained checks/SLR.');
})().catch(e=>{console.error(e);process.exitCode=1;});
