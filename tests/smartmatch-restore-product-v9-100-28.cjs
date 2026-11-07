const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const changes=require('../smartmatch-position-changes-v9-100.js');
const source=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b)}
class Element{
 constructor(){this.children=[];this.style={setProperty(){}};this.dataset={};this.hidden=false;this.textContent=''}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(){this.children=[]}
 setAttribute(){}
}
const root=new Element();global.document={getElementById:()=>root,createElement:()=>new Element()};
const item={key:'lock',label:'Låshus',value:'TEST-350',responsibility:'GS',source:'base',quantity:1};
const makeDoor=id=>({id,code:'G8',position:1,checks:{lock:true},rowStages:{lock:{outside:true,inside:true}},overrides:{lock:{minutes:20,note:'Behåll produktkommentaren'}},customItems:[]});
const doors=[makeDoor('one'),makeDoor('two')];
const c=vm.createContext({window:{SmartMatchPositionChanges:changes},instances:doors,resolveProjectProduct:x=>x,
 protocolDef:async()=>({readTestSelected:true,checks:[item]}),workCompletion:{fraction:(o,i)=>o.checks[i.key]?1:0},
 projectProductName:i=>i.value,projectProductKey:n=>n,resolveItemMinutes:i=>({minutes:i.minutes}),workQuantity:i=>i.quantity||1,projectExtraMaterials:()=>[]});
vm.runInContext(extract('function effectiveChecks(','function buildInstances(')+extract('function isProjectMaterialItem(','function materialCategoryColor('),c);
(async()=>{
 let rows=await c.projectMaterialRows();assert.equal(rows[0].quantity,2);assert.equal(rows[0].totalMinutes,40);
 changes.set(doors[0],item,{excluded:true,note:'Prov: produkten utgår',color:'red'});
 rows=await c.projectMaterialRows();assert.equal(rows[0].quantity,1);assert.equal(rows[0].totalMinutes,20);
 changes.render(doors[0]);assert.equal(root.hidden,false);assert.equal(root.children.length,2);
 changes.restore(doors[0],item);changes.render(doors[0]);assert.equal(root.hidden,true);assert.equal(root.children.length,0,'restored record must leave the menu');
 rows=await c.projectMaterialRows();assert.equal(rows[0].quantity,2);assert.equal(rows[0].totalMinutes,40);assert.equal(rows[0].doneQuantity,1,'restored product must not silently return as installed');
 assert.equal(doors[0].overrides.lock.note,'Behåll produktkommentaren');assert.equal(changes.active(doors[1]).length,0);
 changes.render(JSON.parse(JSON.stringify(doors[0])));assert.equal(root.hidden,true,'saved restored records must stay out of the menu after reopening');
 const custom={id:'custom',label:'Sensor',value:'TEST',minutes:30,quantity:2};doors[0].customItems.push(custom);
 const customItem={...custom,key:custom.id,source:'custom'};
 changes.set(doors[0],customItem,{excluded:true,note:'Prov: egen produkt utgår'});assert(!c.effectiveChecks(doors[0],null).some(i=>i.key==='custom'));
 changes.restore(doors[0],customItem);changes.render(doors[0]);assert.equal(root.hidden,true);assert.equal(c.effectiveChecks(doors[0],null)[0].quantity,2);
 // A different active flag is retained while an excluded product is restored.
 changes.set(doors[0],customItem,{excluded:false,note:'Separat ändring'});changes.render(doors[0]);assert.equal(root.children.length,2);assert.equal(root.children[1].dataset.changeKey,'custom');
 changes.restore(doors[0],customItem);changes.render(doors[0]);assert.equal(root.hidden,true,'ending the last flag also clears its menu');
 let materialRefreshes=0,timeRefreshes=0;const materialRoot={},materials={open:true,querySelector:()=>materialRoot};
 const refresh=vm.createContext({document:{getElementById:()=>materials},syncReadWorkChecks(){},recalc:async()=>{},save(){},updateStats(){},renderGroups(){},renderMarkers(){},selectedId:'other',el:{protocol:{open:false},timeDialog:{open:true}},renderProjectMaterials:async root=>{assert.equal(root,materialRoot);materialRefreshes++},renderTimeReport:async()=>timeRefreshes++});
 vm.runInContext(extract('async function refreshPositionChange(','async function setPositionChange('),refresh);
 await refresh.refreshPositionChange(doors[0]);assert.equal(materialRefreshes,1);assert.equal(timeRefreshes,1);
 materials.open=false;await refresh.refreshPositionChange(doors[0]);assert.equal(materialRefreshes,1);
 console.log('PASS: restore clears menu immediately and after save/reopen; base/custom materials and time return; other flags and product edits survive; open material view refreshes');
})().catch(e=>{console.error(e);process.exitCode=1});
