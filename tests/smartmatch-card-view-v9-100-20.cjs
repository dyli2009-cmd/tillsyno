const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const main=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
const start=main.indexOf('async function editCardViewArea(){'),end=main.indexOf('async function rereadSelectedCard(){',start);
(async()=>{
 const source={getPage:async()=>({getViewport:()=>({})})},door={id:'g8:1',code:'G8'};let params,saves=0,updates=0,renders=0;
 const c=vm.createContext({pdf:source,selectedId:door.id,selectedInstance:()=>door,currentProtocolPage:()=>2,window:{SmartMatchReadTest:{cardFor:()=>true,cardDisplayRegion:()=>null,setCardDisplayRegion:()=>updates++},SmartMatchCardView:{open:async v=>{params=v}}},save:()=>saves++,protocolFitScaleFor:()=>1,protocolDisplayRegion:()=>null,renderProtocolPage:async()=>renders++,protocolScale:0});
 vm.runInContext(main.slice(start,end),c);await c.editCardViewArea();await params.save({x:0,y:0,w:.5,h:.5});assert.equal(updates,1);assert.equal(saves,1);assert.equal(renders,1);
 c.pdf={};await assert.rejects(params.save(null),/Projektet har ändrats/);assert.equal(updates,1,'stale popup must not modify another project');
 c.pdf=source;c.selectedId='g8:2';await params.save(null);assert.equal(updates,2);assert.equal(renders,1,'save the selected card setting without repainting another open door');
 console.log('PASS: card display save, stale project guard and door-switch rendering guard');
})().catch(e=>{console.error(e);process.exitCode=1});
