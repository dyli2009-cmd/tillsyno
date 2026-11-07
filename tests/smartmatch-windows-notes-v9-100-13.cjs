const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync('smartmatch-read-main-v524.js','utf8'),da=fs.readFileSync('smartmatch-slr-test-da-v36-132.js','utf8');
function extract(src,start,end){const a=src.indexOf(start);assert(a>=0,start);const b=src.indexOf(end,a);assert(b>a,end);return src.slice(a,b);}
const a={id:'a',page:1,sourceText:'151551-1-15-1',rect:[0,0,100,20],checks:{ok:true}},b={...a,id:'b',page:2};
let opened=0,edited=0,timer=null;
const c=vm.createContext({automationItems:[a,b],drawingNoteRect:n=>n.rect,clearTimeout:()=>timer=null,setTimeout:f=>{timer=f;return 1;},setFocusedAutomation:()=>{},window:{SmartMatchDALink:{openDoor:()=>opened++}},smartOpenInlineNoteEditor:()=>edited++,Date});
vm.runInContext('let lastDrawingNoteTap=null,drawingNoteActionTimer=null;'+extract(main,'function drawingNoteIdentity(','function drawingNoteRect(')+extract(main,'function drawingNoteAutomation(','async function linkInlineDrawingAutomation('),c);
const n={id:'n',type:'text',page:1,text:'DA 151551–1–15–1',rect:[0,0,100,20]};c.n=n;
assert.equal(vm.runInContext('drawingNoteIdentity(n)',c),'151551-1-15-1');
assert.equal(vm.runInContext('drawingNoteAutomation(n).id',c),'a');
vm.runInContext('syncDrawingNoteAutomation(n)',c);assert.equal(n.automationId,'a');assert.equal(a.drawingNoteId,'n');
n.rect=[50,50,150,70];vm.runInContext('syncDrawingNoteAutomation(n)',c);assert.deepEqual(a.rect,n.rect);assert.deepEqual(a.checks,{ok:true});
vm.runInContext('activateDrawingNote(n,1000)',c);assert.equal(opened,0);assert.equal(timer,null);assert.equal(opened,0);
vm.runInContext('activateDrawingNote(n,2000);activateDrawingNote(n,2200)',c);assert.equal(timer,null);assert.equal(edited,0);assert.equal(opened,1);
c.unlinked={id:'plain',type:'text',page:1,text:'Vanlig text'};vm.runInContext('activateDrawingNote(unlinked,3000);activateDrawingNote(unlinked,3200)',c);assert.equal(edited,1);assert.equal(opened,1);
const overlap={id:'new',page:1,text:'151551-1-15-1',rect:n.rect};c.n2=overlap;c.automationItems.push({...a,id:'ambiguous',drawingNoteId:null});assert.equal(vm.runInContext('drawingNoteAutomation(n2)',c),null);
const items=[];let attached=0;
const api={getModels:()=>[['15','Test model']],getItems:()=>items,addItem:o=>items.push(o),attachDrawingTextAutomation:(id,o)=>{o.drawingNoteId=id;attached++;},save:()=>{},redraw:()=>{}};
const d=vm.createContext({loaded:()=>true,ctx:()=>api,normalize:s=>String(s).replace(/[–—−]/g,'-').replace(/\s/g,'').toUpperCase(),matchingExisting:()=>null,openDoor:()=>{},note:{id:'n',page:1,rect:[1,2,3,4],text:'151551-1-15-1'}});
vm.runInContext(extract(da,' function parseCandidateId(',' function nearPhysicalRect(')+extract(da,' async function linkDrawingNote(','\n function canonicalMachineCode('),d);
(async()=>{
 await vm.runInContext('linkDrawingNote(note)',d);assert.equal(items.length,1);assert.equal(items[0].objectNo,'151551-1');assert.equal(items[0].modelCode,'15');assert.equal(items[0].serialNumber,'1');
 items[0].checks.saved=true;await vm.runInContext('linkDrawingNote(note)',d);assert.equal(items.length,1);assert.equal(items[0].checks.saved,true);assert.equal(attached,2);
 d.note.text='inte en märkning';await assert.rejects(vm.runInContext('linkDrawingNote(note)',d));assert.equal(items.length,1);
 console.log('PASS: explicit/legacy links, ambiguity, page isolation, geometry, single/double click, retained checks, repeated linking and invalid input');
})().catch(e=>{console.error(e);process.exitCode=1});
