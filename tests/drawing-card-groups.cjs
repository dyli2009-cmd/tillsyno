'use strict';
const assert=require('node:assert/strict');
const api=require('../drawing-card-groups.js');

function viewport(transform=[1,0,0,-1,0,1000],width=1000,height=1000){
 return{transform,width,height,convertToViewportPoint(x,y){return[transform[0]*x+transform[2]*y+transform[4],transform[1]*x+transform[3]*y+transform[5]];}};
}
function item(str,x=100,y=800,width=Math.max(10,str.length*7),transform){return{str,width,height:10,transform:transform||[10,0,0,10,x,y]};}
const rect={x:.09,y:.18,w:.35,h:.05};
const native=text=>({items:[item(text)]});
const code=(text,options)=>api.parseHeader(text,options)?.code??null;

assert.equal(code('Beslagskod: GS23'),'GS23');
assert.equal(code('Beslagskod\nGS24'),'GS24');
assert.equal(code('Dörrkort 140C'),'140C');
assert.equal(code('Kod: 000140-C'),'000140-C');
assert.equal(code('Beslagskod: WC'),'WC');
assert.equal(code('GS23'),'GS23');
assert.equal(code('gs23'),'GS23');
assert.equal(code('GS230'),'GS230');
assert.equal(code('GS023'),'GS023');
assert.equal(code('Beslagskod A-12'),'A-12');
assert.equal(code('Beslagskod A12'),'A12');
assert.equal(code('Beslagskod A/12'),'A/12');
assert.equal(code('Beslagskod GS 23'),'GS23');
assert.equal(code('Beslagskod GS 023'),'GS023');
assert.equal(code('Beslagskod WC 140C'),'WC140C');
assert.equal(code('Dörrkort 140 C'),'140C');
assert.equal(code('GS 23',{example:'GS23'}),'GS23');
assert.equal(code('WC 140C',{example:'WC 140C'}),'WC140C');
assert.equal(code('140 C',{example:'140C'}),'140C');
assert.equal(code('WC'),null,'Unlabeled ordinary words are not automatically codes');
assert.equal(code('WC',{example:'WC'}),'WC');
assert.equal(code('Korttyp (lokal): A-12',{prefix:'Korttyp (lokal)'}),'A-12');
assert.equal(code('Korttyp x A-12',{prefix:'Korttyp (lokal)'}),null,'Custom prefix is literal');
assert.equal(code('Beslags kod: GS23',{prefix:'Beslagskod'}),'GS23');
assert.equal(code('Kod GS23',{prefix:'Beslagskod'}),null,'Learned headings cannot match a different label');
for(const text of['',' ','Beslagskod','Beslagskod:','Kod','Dörrkort','Beslagskod: (Kod)','Dörrkort [Dörrkort]','Beslagskod ()','Beslagskod GS23 GS24','Beslagskod GS23 / GS24','Beslagskod GS23/GS24','Beslagskod GS23, GS24','Beslagskod GS23–25','Rumstyp: WC','Plan 2','Beslagskod WC GS23'])assert.equal(code(text),null,text);

assert.equal(api.readText({items:[item('Beslagskod: GS23'),item('Beslagskod: GS230',100,500),item('Dörrlittera 201',600,800)]},viewport(),rect),'Beslagskod: GS23','Text outside selected field is excluded');
assert.equal(api.readText({items:[item('Beslagskod:',10,800,80),item('GS',100,800,20),item('23',120,800,20)]},viewport(),{x:0,y:.18,w:.4,h:.05}),'Beslagskod: GS23','Adjacent glyph runs join without changing the code');
assert.equal(api.readText(native('Beslagskod: GS23 Dörrlittera 201'),viewport(),{x:.09,y:.18,w:.12,h:.05}),'Beslagskod: GS23','A text item extending outside the crop does not contribute the rest of the row');
assert.equal(api.readText({items:[item('GS23',0,0,40,[0,-10,10,0,200,300])]},viewport([0,1,1,0,0,0]),{x:.25,y:.19,w:.08,h:.04}),'GS23','Rotated PDF text uses the full viewport transform');
assert.equal(api.readText({items:[item('GS24',200,500,40)]},viewport([1,0,0,-1,-150,650],500,600),{x:.09,y:.23,w:.12,h:.05}),'GS24','Crop-box translation is applied');
assert.throws(()=>api.readText(native('GS23'),viewport(),{x:0,y:0,w:0,h:1}),/kodområde/);

function documentMock(values,options={}){
 const counters={gets:[],texts:[],images:[],active:0,maxActive:0,cleanup:0};
 const pdf={numPages:values.length,async getPage(page){
  counters.gets.push(page);counters.active++;counters.maxActive=Math.max(counters.maxActive,counters.active);
  await Promise.resolve();counters.active--;
  if(options.badPages?.includes(page))throw new Error('Sidfel');
  return{number:page,getViewport(){return viewport();},async getTextContent(){counters.texts.push(page);if(options.badText?.includes(page))throw new Error('Textfel');return native(values[page-1]);},cleanup(){counters.cleanup++;}};
 }};
 return{pdf,counters};
}

(async()=>{
 const first=documentMock(['Beslagskod GS23','Beslagskod GS23','Beslagskod GS230','','Beslagskod:']);
 const progress=[];
 const result=await api.scan({pdf:first.pdf,rect,mode:'text',readImage(){assert.fail('Text mode must never call OCR');},onProgress(value){progress.push(value);}});
 assert.deepEqual(result.groups.map(group=>[group.code,group.pages.map(page=>page.page)]),[['GS23',[1,2]],['GS230',[3]]]);
 assert.deepEqual(result.unresolved.map(entry=>entry.page),[4,5]);
 assert.equal(result.readCount,5);assert.equal(progress.length,5);
 assert.deepEqual(progress.map(event=>event.readCount),[1,2,3,4,5]);
 assert.equal(first.counters.maxActive,1,'A large PDF is loaded one page at a time');
 assert.equal(first.counters.cleanup,0,'Shared preview pages are not cleaned up');

 const fallback=documentMock(['Beslagskod GS23','','Beslagskod GS230','unknown field']);
 const auto=await api.scan({pdf:fallback.pdf,rect,readImage:async(page,selected,context)=>{
  fallback.counters.images.push(page.number);for(const key of['x','y','w','h'])assert.ok(Math.abs(selected[key]-rect[key])<1e-9);assert.equal(context.page,page.number);assert.equal(context.cancelled(),false);
  return page.number===2?{text:'Beslagskod GS23',confidence:91}:'';
 }});
 assert.deepEqual(fallback.counters.images,[2,4],'OCR only runs for empty or unparseable selected fields');
 assert.deepEqual(auto.groups[0].pages.map(entry=>entry.source),['text','image']);
 assert.equal(auto.groups[0].pages[1].confidence,91);
 assert.deepEqual(auto.unresolved.map(entry=>entry.page),[4]);
 const confidence=documentMock(['','','']);
 const confidenceResult=await api.scan({pdf:confidence.pdf,rect,readImage:async page=>({text:'Beslagskod GS 23',confidence:page.number===1?74:page.number===2?75:98})});
 assert.deepEqual(confidenceResult.groups[0].pages.map(entry=>entry.page),[2,3]);
 assert.equal(confidenceResult.groups[0].code,'GS23');
 assert.equal(confidenceResult.unresolved[0].reason,'low-confidence');
 assert.equal(confidenceResult.unresolved[0].confidence,74);

 const learned=documentMock(['Beslagskod GS23','Plan 2','Kod GS23','Beslagskod GS230','Beslagskod GS23']);
 const withExample=await api.scan({pdf:learned.pdf,rect,mode:'text',examplePage:5});
 assert.equal(withExample.prefix,'Beslagskod');
 assert.deepEqual(withExample.groups.map(group=>[group.code,group.pages.map(entry=>entry.page)]),[['GS23',[1,5]],['GS230',[4]]]);
 assert.deepEqual(withExample.unresolved.map(entry=>entry.page),[2,3]);
 assert.equal(learned.counters.gets.filter(page=>page===5).length,1,'Sample page is reused');
 assert.equal(learned.counters.texts.filter(page=>page===5).length,1,'Sample text is extracted once');
 assert.equal(learned.counters.gets.length,5);

 const raw=documentMock(['WC','HVC','WC']);
 const rawResult=await api.scan({pdf:raw.pdf,rect,mode:'text',examplePage:1});
 assert.deepEqual(rawResult.groups.map(group=>[group.code,group.pages.length]),[['WC',2],['HVC',1]],'Marked code-only alphabetic examples remain usable');
 const split=documentMock(['GS 23','GS23','GS 24']);
 const splitResult=await api.scan({pdf:split.pdf,rect,mode:'text',examplePage:1});
 assert.deepEqual(splitResult.groups.map(group=>[group.code,group.pages.length]),[['GS23',2],['GS24',1]],'A code-only example allows OCR-style spacing without requiring a heading');

 const duplicate=documentMock(['GS1','GS2','GS3']);
 const subset=await api.scan({pdf:duplicate.pdf,pages:[3,1,3],rect,mode:'text'});
 assert.deepEqual(duplicate.counters.gets,[3,1]);assert.equal(subset.readCount,2);
 await assert.rejects(api.scan({pdf:duplicate.pdf,pages:[0],rect}),/sidnummer/);
 await assert.rejects(api.scan({pdf:duplicate.pdf,examplePage:4,rect}),/Exempelsidan/);

 const failed=documentMock(['GS1','GS2','GS3'],{badPages:[1],badText:[2]});
 const failures=await api.scan({pdf:failed.pdf,rect,mode:'text'});
 assert.deepEqual(failures.unresolved.map(entry=>[entry.page,entry.reason]),[[1,'text-error'],[2,'text-error']]);
 assert.equal(failures.groups[0].code,'GS3','Individual unreadable pages do not stop all reading');
 const imageFailed=documentMock(['']);
 const imageError=await api.scan({pdf:imageFailed.pdf,rect,readImage:async()=>{throw new Error('OCR-fel');}});
 assert.equal(imageError.unresolved[0].reason,'image-error');

 let stopped=false;
 const cancelled=documentMock(['GS1','GS2','GS3']);
 await assert.rejects(api.scan({pdf:cancelled.pdf,rect,cancelled:()=>stopped,onProgress(){stopped=true;}}),error=>error.name==='AbortError');
 assert.deepEqual(cancelled.counters.gets,[1],'Cancellation prevents loading further pages');
 const cancelledImage=documentMock(['','']);
 let imageStopped=false;
 await assert.rejects(api.scan({pdf:cancelledImage.pdf,rect,cancelled:()=>imageStopped,readImage:async()=>{imageStopped=true;return'GS1';}}),error=>error.name==='AbortError');
 assert.deepEqual(cancelledImage.counters.gets,[1]);
 const rejectedCallback=documentMock(['GS1','GS2']);
 const callbackError=new Error('Progress rejected');
 await assert.rejects(api.scan({pdf:rejectedCallback.pdf,rect,onProgress:async()=>{throw callbackError;}}),error=>error===callbackError);
 assert.deepEqual(rejectedCallback.counters.gets,[1],'Rejected callbacks propagate rather than silently continuing');
 const rejectedAbort=documentMock(['','']);
 await assert.rejects(api.scan({pdf:rejectedAbort.pdf,rect,readImage:async()=>{const error=new Error('abort');error.name='AbortError';throw error;}}),error=>error.name==='AbortError');
 assert.deepEqual(rejectedAbort.counters.gets,[1]);

 console.log('drawing-card-groups: parser, crop/rotation, text/OCR fallback, sample heading, grouping and cancellation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
