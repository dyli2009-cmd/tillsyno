const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b)}
const context=vm.createContext({viewportRect:(vp,r)=>({height:Math.abs(r[3]-r[1])*vp.scale}),automationItems:[],page:1});
vm.runInContext(extract('function smartProgressBadgeScale(','function renderMarkers('),context);
for(const zoom of [.15,.4,.84,1,2,4]){
 context.zoom=zoom;
 for(const height of [16,20,32]){
  context.items=[{page:1,rect:[0,0,100,height]},{page:2,rect:[0,0,100,900]}];
  const factor=vm.runInContext('smartProgressBadgeScale({scale:zoom},items,1)',context);
  assert(Math.abs(14*factor-height*zoom/2)<1e-10,'progress is half DA height at every zoom');
  assert(Math.abs(14*factor*1.8-height*zoom*1.8/2)<1e-10,'temporary zoom keeps the same proportion');
 }
 assert(Math.abs(vm.runInContext('smartProgressBadgeScale({scale:zoom},[],1)',context)*14-10*zoom)<1e-10);
}
class Node{
 constructor(){this.children=[];this.parentElement=null}
 append(node){this.insertBefore(node,null)}
 insertBefore(node,reference){if(reference!==null&&!this.children.includes(reference))throw new Error('NotFoundError');if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);const i=reference===null?this.children.length:this.children.indexOf(reference);this.children.splice(i,0,node);node.parentElement=this}
 replaceChildren(){for(const n of this.children)n.parentElement=null;this.children=[]}
}
for(const wrapped of [false,true]){
 const side=new Node(),body=wrapped?new Node():side,groups=new Node(),editor=new Node(),button=new Node();
 if(wrapped)side.append(body);body.append(groups);groups.append(editor);editor.append(button);
 const c=vm.createContext({el:{side,groups},drawingManualEditor:editor});
 vm.runInContext(extract('function smartParkManualEditor(','function smartResetWorkspace('),c);
 vm.runInContext('smartParkManualEditor()',c);groups.replaceChildren();
 assert.equal(editor.parentElement,side);assert.equal(editor.children[0],button,'editor controls survive close');
 vm.runInContext('smartParkManualEditor()',c);assert.equal(side.children.filter(n=>n===editor).length,1);
}
console.log('PASS: half-DA progress ratio through zoom; closing preserves editor in both original and floating-window layouts');
