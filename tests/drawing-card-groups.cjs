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

const arbitrary=[
 ['Beslagskod: DBLB upp SD','BESLAGSKOD: DBLB UPP SD'],
 ['Beslagskod: GS23','BESLAGSKOD: GS23'],
 ['Beslagskod\nGS24','BESLAGSKOD GS24'],
 ['Dörrkort 140C','DÖRRKORT 140C'],
 ['Kod: 000140-C','KOD: 000140-C'],
 ['Beslagskod: WC','BESLAGSKOD: WC'],
 ['gs23','GS23'],['GS230','GS230'],['GS023','GS023'],
 ['GS 23','GS 23'],['140 C','140 C'],['WC 140C','WC 140C'],
 ['A-12','A-12'],['A12','A12'],['A/12','A/12'],
 ['WC','WC'],['Beslagskod','BESLAGSKOD'],['Beslagskod:','BESLAGSKOD:'],
 ['Kod','KOD'],['Dörrkort [Dörrkort]','DÖRRKORT [DÖRRKORT]'],
 ['Beslagskod ()','BESLAGSKOD ()'],['Beslagskod GS23 GS24','BESLAGSKOD GS23 GS24'],
 ['Beslagskod GS23 / GS24','BESLAGSKOD GS23 / GS24'],
 ['Beslagskod GS23/GS24','BESLAGSKOD GS23/GS24'],
 ['Beslagskod GS23, GS24','BESLAGSKOD GS23, GS24'],
 ['Beslagskod GS23–25','BESLAGSKOD GS23–25'],
 ['Rumstyp: WC','RUMSTYP: WC'],['Plan 2','PLAN 2'],
 ['Annan rubrik = A / B # 12; höger/vänster','ANNAN RUBRIK = A / B # 12; HÖGER/VÄNSTER'],
 ['🚪 (special) + ? * [valfri]','🚪 (SPECIAL) + ? * [VALFRI]'],
 ['  ＧＳ２３\t  dörr\nupp  SD  ','GS23 DÖRR UPP SD']
];
for(const[text,expected]of arbitrary){
 const parsed=api.parseHeader(text,{prefix:'Ignorera denna äldre prefixinställning',example:'GS999'});
 assert.equal(parsed?.code,expected,text);
 assert.equal(parsed.key,expected,'The entire normalized selected text is the grouping key');
 assert.equal(parsed.prefix,null,'Legacy prefix options do not restrict arbitrary selected text');
}
for(const text of['',' ','\t\n\r','\u200b\u00ad\ufeff'])assert.equal(code(text),null,'Only empty cleaned selections are skipped');
assert.notEqual(code('GS 23'),code('GS23'),'An internal space remains meaningful');
assert.notEqual(code('GS23'),code('GS230'),'Whole strings are compared, never prefixes');
assert.notEqual(code('GS23'),code('GS023'),'Leading zeroes remain meaningful');
assert.notEqual(code('Beslagskod GS23'),code('Kod GS23'),'Headings are included rather than stripped');
assert.notEqual(code('A-12'),code('A12'),'Punctuation remains meaningful');
assert.equal(code('  Beslagskod:\tDBLB\nupp   SD  '),code('beslagskod: dblb UPP sd'),'Whitespace and case variations group together');
assert.equal(code('ＧＳ２３'),code('GS23'),'NFKC equivalents group together');

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
 assert.deepEqual(result.groups.map(group=>[group.code,group.pages.map(page=>page.page)]),[['BESLAGSKOD GS23',[1,2]],['BESLAGSKOD GS230',[3]],['BESLAGSKOD:',[5]]]);
 assert.deepEqual(result.unresolved.map(entry=>entry.page),[4]);
 assert.equal(result.readCount,5);assert.equal(progress.length,5);
 assert.deepEqual(progress.map(event=>event.readCount),[1,2,3,4,5]);
 assert.equal(first.counters.maxActive,1,'A large PDF is loaded one page at a time');
 assert.equal(first.counters.cleanup,0,'Shared preview pages are not cleaned up');

 const fallback=documentMock(['Beslagskod GS23','','Beslagskod GS230','unknown field','']);
 const auto=await api.scan({pdf:fallback.pdf,rect,readImage:async(page,selected,context)=>{
  fallback.counters.images.push(page.number);for(const key of['x','y','w','h'])assert.ok(Math.abs(selected[key]-rect[key])<1e-9);assert.equal(context.page,page.number);assert.equal(context.cancelled(),false);
  return page.number===2?{text:'Beslagskod GS23',confidence:91}:'';
 }});
 assert.deepEqual(fallback.counters.images,[2,5],'OCR only runs for empty selected fields; arbitrary native text is accepted');
 assert.deepEqual(auto.groups[0].pages.map(entry=>entry.source),['text','image']);
 assert.equal(auto.groups[0].pages[1].confidence,91);
 assert.deepEqual(auto.unresolved.map(entry=>entry.page),[5]);
 assert.ok(auto.groups.some(group=>group.code==='UNKNOWN FIELD'&&group.pages[0].page===4));
 const confidence=documentMock(['','','','']);
 const confidenceResult=await api.scan({pdf:confidence.pdf,rect,readImage:async page=>({text:page.number===4?'':'Beslagskod GS 23',confidence:[74,75,98,40][page.number-1]})});
 assert.deepEqual(confidenceResult.groups[0].pages.map(entry=>entry.page),[1,2,3],'Low OCR confidence is advisory and does not reject nonempty text');
 assert.equal(confidenceResult.groups[0].code,'BESLAGSKOD GS 23');
 assert.deepEqual(confidenceResult.groups[0].pages.map(entry=>entry.confidence),[74,75,98],'OCR confidence is retained on grouped records for review');
 assert.deepEqual(confidenceResult.unresolved.map(entry=>entry.page),[4]);
 assert.equal(confidenceResult.unresolved[0].reason,'empty','Empty OCR remains unresolved regardless of confidence');

 const headings=documentMock(['Beslagskod GS23','Plan 2','Kod GS23','Beslagskod GS230','Beslagskod GS23']);
 const withExample=await api.scan({pdf:headings.pdf,rect,mode:'text',examplePage:5,prefix:'Beslagskod'});
 assert.equal(withExample.prefix,null);
 assert.deepEqual(withExample.groups.map(group=>[group.code,group.pages.map(entry=>entry.page)]),[['BESLAGSKOD GS23',[1,5]],['PLAN 2',[2]],['KOD GS23',[3]],['BESLAGSKOD GS230',[4]]]);
 assert.deepEqual(withExample.unresolved,[],'Different headings and arbitrary text are not rejected');
 assert.equal(headings.counters.gets.filter(page=>page===5).length,1,'Sample page is reused');
 assert.equal(headings.counters.texts.filter(page=>page===5).length,1,'Sample text is extracted once');
 assert.equal(headings.counters.gets.length,5);
 assert.deepEqual(headings.counters.gets,[1,2,3,4,5],'An example page does not change the requested sequential read order');

 const seven=documentMock(['Beslagskod: DBLB upp SD','beslagskod: dblb upp sd','BESLAGSKOD: DBLB UPP SD','Beslagskod:  DBLB upp SD','Beslagskod: DBLB  upp SD','Beslagskod: DBLB upp  SD','Ｂｅｓｌａｇｓｋｏｄ: ＤＢＬＢ upp SD']);
 const sevenResult=await api.scan({pdf:seven.pdf,rect,mode:'text',examplePage:3,readImage(){assert.fail('All seven native multiword headers must be accepted without OCR');}});
 assert.deepEqual(sevenResult.groups.map(group=>[group.code,group.pages.map(entry=>entry.page)]),[['BESLAGSKOD: DBLB UPP SD',[1,2,3,4,5,6,7]]]);
 assert.equal(sevenResult.readCount,7);
 assert.deepEqual(sevenResult.unresolved,[],'Regression: all seven DBLB upp SD pages are grouped');
 assert.equal(seven.counters.texts.length,7);
 const sevenImages=documentMock(Array(7).fill(''));
 const sevenImageResult=await api.scan({pdf:sevenImages.pdf,rect,readImage:async()=>({text:'Beslagskod: DBLB upp SD',confidence:40})});
 assert.deepEqual(sevenImageResult.groups.map(group=>[group.code,group.pages.map(entry=>entry.page)]),[['BESLAGSKOD: DBLB UPP SD',[1,2,3,4,5,6,7]]],'All seven OCR DBLB headers are grouped even at confidence 40');
 assert.ok(sevenImageResult.groups[0].pages.every(entry=>entry.confidence===40&&entry.source==='image'));
 assert.deepEqual(sevenImageResult.unresolved,[]);

 const raw=documentMock(['WC','HVC','WC']);
 const rawResult=await api.scan({pdf:raw.pdf,rect,mode:'text',examplePage:1});
 assert.deepEqual(rawResult.groups.map(group=>[group.code,group.pages.length]),[['WC',2],['HVC',1]],'Marked code-only alphabetic examples remain usable');
 const split=documentMock(['GS 23','GS23','GS 24']);
 const splitResult=await api.scan({pdf:split.pdf,rect,mode:'text',examplePage:1});
 assert.deepEqual(splitResult.groups.map(group=>[group.code,group.pages.length]),[['GS 23',1],['GS23',1],['GS 24',1]],'Internal spaces are preserved rather than joined');

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

 console.log('drawing-card-groups: arbitrary full-text grouping, seven DBLB headers, crop/rotation, text/OCR fallback and cancellation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
