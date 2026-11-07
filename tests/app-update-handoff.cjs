/* Exercise the actual app update notice with synthetic workers and unsaved work.
 * No real account, network, service-worker registration or project data is used.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
const source=app.match(/<script\b[^>]*id=["']tillsyno-update-checker["'][^>]*>([\s\S]*?)<\/script>/)?.[1];
assert(source,'The current app must expose its real update checker');

function events(value={}){
 const listeners=new Map();
 value.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);};
 value.removeEventListener=(type,fn)=>listeners.get(type)?.delete(fn);
 value.emit=(type)=>{for(const fn of [...(listeners.get(type)||[])])fn.call(value,{type,target:value});if(typeof value['on'+type]==='function')value['on'+type]({type,target:value});};
 return value;
}
function worker(state='installing'){
 const value=events({state});
 value.transition=state=>{value.state=state;value.emit('statechange');};
 return value;
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}

function fixture({registration,supported=true,controlled=true}={}){
 let clock=0,nextTimer=0;
 const timers=new Map(),navigation=[],fetches=[];
 const node=tag=>({tagName:tag.toUpperCase(),children:[],style:{},textContent:'',disabled:false,setAttribute(name,value){this[name]=value;},append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);return item;}});
 const work=node('main');work.textContent='Synthetic unsaved work';
 const body=node('body');body.children.push(work);
 const document=events({body,visibilityState:'visible',createElement:node,querySelector:selector=>selector==='meta[name="tillsyno-build"]'?{content:'synthetic-current-release'}:null});
 const window=events({});
 const navigator={onLine:true};
 let updates=0;
 const container=events({controller:controlled?worker('activated'):null,getRegistration:async()=>registration});
 if(supported)navigator.serviceWorker=container;
 if(registration){
  const update=registration.update;
  registration.update=async()=>{updates++;return update?await update.call(registration):registration;};
 }
 const context={window,document,navigator,URL,console,Promise,Error,Date:class extends Date{static now(){return 1700000000000+clock;}},location:{href:'https://example.invalid/tillsyno/app.html?view=home#synthetic-position',replace:url=>navigation.push(String(url))},fetch:async(url,options)=>{fetches.push({url:String(url),options});return{ok:true,text:async()=>'<meta name="tillsyno-build" content="synthetic-next-release">'};},setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:clock+Number(ms||0)});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++nextTimer,clearInterval(){}};
 vm.runInNewContext(source,context,{filename:'app.html#tillsyno-update-checker'});
 async function offer(){window.emit('pageshow');await settle();assert.equal(body.children.length,2,'An update creates one notice beside existing work');return body.children[1];}
 function noticeParts(){const notice=body.children[1];return{notice,msg:notice.children.find(n=>n.tagName==='SPAN'),button:notice.children.find(n=>n.tagName==='BUTTON')};}
 async function click(){const {button}=noticeParts();assert(button,'The real notice has its manual update button');const task=button.onclick();await settle();return{task};}
 async function tick(ms){const until=clock+ms;for(;;){const due=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;clock=due[1].at;timers.delete(due[0]);due[1].fn();await settle();}clock=until;await settle();}
 function assertWork(){assert.equal(body.children[0],work,'The existing work node is retained');assert.equal(work.textContent,'Synthetic unsaved work','Pending and failed updates preserve work');}
 function assertNavigated(){assert.equal(navigation.length,1,'Only the explicit successful update navigates');const target=new URL(navigation[0]);assert.equal(target.origin,'https://example.invalid');assert.equal(target.pathname,'/tillsyno/app.html');assert.equal(target.searchParams.get('view'),'home');assert.match(target.searchParams.get('tillsyno_update'),/^\d+$/);assert.equal(target.hash,'#synthetic-position');}
 function assertFailed(){const{button,msg}=noticeParts();assert.equal(navigation.length,0,'A failed update must not reload the old page');assert.equal(button.disabled,false,'The button is available for retry');assert.match(button.textContent,/Uppdatera|Försök igen/i,'A failed update offers a clear retry action');assert(msg.textContent.trim(),'A failure has a readable status');assert.match(msg.textContent,/kunde|försök|misslyck|uppdater|failed|error/i);assertWork();}
 return{offer,click,tick,noticeParts,assertWork,assertNavigated,assertFailed,navigation,fetches,get updates(){return updates;},container};
}

(async()=>{
 {
  const f=fixture({supported:false});await f.offer();
  assert.match(f.noticeParts().msg.textContent,/Spara ditt arbete/i,'The save-work warning remains visible');
  assert.equal(f.navigation.length,0,'Discovering a release never reloads automatically');
  assert.equal(f.fetches[0].options.cache,'no-store','Version probes must bypass the current release cache');
  await f.click();await settle();f.assertNavigated();f.assertWork();
  console.log('PASS update handoff: explicit update without service-worker support');
 }
 {
  const f=fixture();await f.offer();await f.click();await settle();f.assertNavigated();
  console.log('PASS update handoff: no registration uses direct manual navigation');
 }
 {
  const active=worker('activated'),registration=events({active,installing:null,waiting:null});
  const f=fixture({registration});await f.offer();await f.click();await settle();
  assert.equal(f.updates,1,'The registration is checked before navigating');f.assertNavigated();
  console.log('PASS update handoff: no pending release after update check');
 }
 {
  const next=worker(),registration=events({active:worker('activated'),installing:next,waiting:null});
  const f=fixture({registration});await f.offer();await f.click();
  assert.equal(f.updates,1);assert.equal(f.noticeParts().button.disabled,true);assert.match(f.noticeParts().button.textContent,/Uppdaterar/);
  assert.equal(f.navigation.length,0,'New scripts must not be opened while their release is still installing');f.assertWork();
  registration.installing=null;registration.waiting=next;next.transition('installed');await settle();
  assert.equal(f.navigation.length,0,'A waiting release has not yet taken over');
  next.transition('activating');await settle();assert.equal(f.navigation.length,0,'Activation must complete before reload');
  registration.waiting=null;registration.active=next;next.transition('activated');await settle();f.assertNavigated();f.assertWork();
  console.log('PASS update handoff: same-release page retained until installation and activation complete');
 }
 {
  const next=worker('installed'),registration=events({active:worker('activated'),waiting:next,installing:null});
  const f=fixture({registration});await f.offer();await f.click();assert.equal(f.navigation.length,0);
  registration.waiting=null;registration.active=next;next.transition('activated');await settle();f.assertNavigated();
  console.log('PASS update handoff: an already waiting worker must activate first');
 }
 {
  const update=deferred(),next=worker(),registration=events({active:worker('activated'),installing:null,waiting:null,update:()=>update.promise});
  const f=fixture({registration});await f.offer();await f.click();assert.equal(f.navigation.length,0);
  registration.installing=next;registration.emit('updatefound');update.resolve(registration);await settle();assert.equal(f.navigation.length,0);
  registration.installing=null;registration.active=next;next.transition('activated');await settle();f.assertNavigated();
  console.log('PASS update handoff: worker discovered during the requested update');
 }
 {
  let reject=true;const registration=events({active:worker('activated'),installing:null,waiting:null,update:async()=>{if(reject)throw Error('Synthetic update fetch failed');return registration;}});
  const f=fixture({registration});await f.offer();await f.click();await settle();f.assertFailed();
  reject=false;await f.click();await settle();f.assertNavigated();assert.equal(f.updates,2,'A failed update can be retried');
  console.log('PASS update handoff: update rejection preserves work and permits retry');
 }
 for(const failure of ['redundant','error']){
  const next=worker(),registration=events({active:worker('activated'),installing:next,waiting:null});
  const f=fixture({registration});await f.offer();await f.click();
  if(failure==='redundant')next.transition('redundant');else next.emit('error');
  await settle();f.assertFailed();
  console.log('PASS update handoff:',failure,'does not navigate');
 }
 {
  const next=worker(),registration=events({active:worker('activated'),installing:next,waiting:null});
  const f=fixture({registration});await f.offer();await f.click();
  await f.tick(89999);assert.equal(f.navigation.length,0);assert.equal(f.noticeParts().button.disabled,true,'A slow install is not reloaded or failed before the deadline');
  await f.tick(1);f.assertFailed();
  next.transition('activated');await settle();assert.equal(f.navigation.length,0,'Late activation after a failed manual attempt must not reload unsaved work');
  console.log('PASS update handoff: bounded 90-second timeout and no late automatic reload');
 }
 console.log('PASS actual app update checker: manual handoff, activation, recoverable failures and existing work preservation');
})().catch(error=>{console.error(error);process.exitCode=1;});
