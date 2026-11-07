const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const changes=require('../smartmatch-position-changes-v9-100.js');
const src=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
function extract(start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert(a>=0&&b>a);return src.slice(a,b)}
const line={key:'lock',label:'Låshus',value:'TEST-350',source:'base',quantity:1},def={checks:[line]};
const door={id:'one',code:'G8',overrides:{},customItems:[],checks:{lock:true},attentionItems:[]};
const c=vm.createContext({window:{SmartMatchPositionChanges:changes,SmartMatchReadTest:{protocolDef:()=>def}},protocolMap:{G8:2},protocolDefs:{},resolveProjectProduct:x=>x});
vm.runInContext(extract('function effectiveChecks(','function buildInstances(')+extract('function attentionItemsFor(','async function addDoorAttention('),c);
assert.equal(c.drawingAttentionItems(door).length,0,'a normal completion is not a remark');
door.overrides.lock={note:'Kontrollera insidan'};
assert.equal(c.drawingAttentionItems(door)[0].source,'work-comment');assert.match(c.drawingAttentionItems(door)[0].text,/Låshus – TEST-350: Kontrollera insidan/);
assert.equal(c.drawingAttentionItems({id:'two',code:'G8',overrides:{},customItems:[]}).length,0,'same GS code must not share comments');
door.customItems.push({id:'custom',label:'Sensor',value:'TEST',note:'Justera sensorn'});assert.equal(c.drawingAttentionItems(door).length,2);
const saved=JSON.parse(JSON.stringify(door));assert.equal(c.drawingAttentionItems(saved).length,2);assert.equal(saved.attentionItems.length,0,'derived reminders must not be stored as duplicate door remarks');
door.overrides.lock.hidden=true;assert.equal(c.drawingAttentionItems(door).length,1);
door.customItems=[];assert.equal(c.drawingAttentionItems(door).length,0);
door.overrides={missing:{note:'Raden togs bort från kortet'}};assert.equal(c.drawingAttentionItems(door).length,0,'removed source row must not leave a ghost question mark');
door.overrides={};changes.set(door,line,{excluded:true,note:'Utgår enligt beställaren',color:'red'});assert.equal(c.drawingAttentionItems(door)[0].source,'work-flag');changes.restore(door,line);assert.equal(c.drawingAttentionItems(door).length,0);
door.attentionItems=[{kind:'order',text:'Beställ material'},{kind:'remark',text:'Tidigare anmärkning',resolvedAt:'2026-01-01'}];assert.deepEqual(Array.from(c.drawingAttentionItems(door),x=>x.kind),['order']);
// Actual comment form handler: saving and clearing update the marker layer.
class E{constructor(tag){this.tag=tag;this.children=[];this.value='';this.className=''}append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parent=this}setAttribute(){}addEventListener(){}focus(){}querySelector(sel){return this.children.find(n=>sel==='.'+n.className)||null}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}}
const pdf={},row=new E('div');let saves=0,markers=0;c.document={createElement:tag=>new E(tag)};c.pdf=pdf;c.instances=[door];c.protocolDef=async()=>def;c.timeProductLabel=i=>i.label;c.save=()=>saves++;c.renderMarkers=()=>markers++;c.selectedId='other';c.el={protocol:{open:false}};
vm.runInContext(extract('function editWorkComment(','function appendEditableCheck('),c);
(async()=>{
 for(const note of ['Provkommentar','']){
  c.editWorkComment(door,c.effectiveChecks(door,def)[0],row,new E('button'));
  const form=row.children[0],input=form.children[0].children[0];input.value=note;
  await form.onsubmit({preventDefault(){}});
  assert.equal(door.overrides.lock.note,note);assert.equal(c.drawingAttentionItems(door).filter(i=>i.kind==='remark').length,note?1:0);
 }
 assert.equal(saves,2);assert.equal(markers,2);
 console.log('PASS: row comments and flags produce position-local remarks; clearing/restoring/deleting removes them; completion stays separate; save/reopen and immediate redraw verified');
})().catch(e=>{console.error(e);process.exitCode=1});
