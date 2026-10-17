'use strict';
const assert=require('node:assert/strict');
const legacy=require('../smartmatch-read-codes-v9-1.js');
const current=require('../smartmatch-read-codes-v9-3.js');
const code={x:.07,y:.06,w:.36,h:.06},table={x:.07,y:.16,w:.36,h:.3};
const movedCode={x:.55,y:.06,w:.36,h:.06},movedTable={x:.55,y:.16,w:.36,h:.3};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const tableText='Komponent Produkt Ansvar\nLåshus ASSA GS\nCylinder TRIO GS';
const word=(text,x,y)=>({text,x,y});
function cardWords(label,dx=0){return [word('Beslagskod: '+label,.24+dx,.085),
 word('Komponent',.12+dx,.185),word('Produkt',.24+dx,.185),word('Ansvar',.36+dx,.185),
 word('Låshus',.12+dx,.25),word('ASSA',.24+dx,.25),word('GS',.36+dx,.25),
 word('Cylinder',.12+dx,.32),word('TRIO',.24+dx,.32),word('GS',.36+dx,.32)];}
function mockPdf(data){
 const calls={getPage:[],text:[]};
 const pdf={numPages:data.length,async getPage(number){calls.getPage.push(number);const value=data[number-1],size=value.size||[595,842];return {number,
  getViewport(){return {width:size[0],height:size[1],transform:[1,0,0,-1,0,size[1]]};},
  async getTextContent(){calls.text.push(number);return {items:(value.words||[]).map(({text,x,y})=>({str:text,width:70,height:10,transform:[10,0,0,10,x*size[0]-35,size[1]-y*size[1]-5]}))};}
 };}};
 return {pdf,calls};
}
const codes=(result)=>result.cards.filter(item=>item.status==='proposed').map(item=>[item.page,item.code]);
async function sameDefaults(){
 const cases=[
  {codeOnly:true,readNative:async({pageNumber,kind})=>{assert.equal(kind,'code');return ['Beslagskod: DBLB UPPST','GS 23','WC A'][pageNumber-1];}},
  {readNative:async({pageNumber,kind})=>kind==='code'?['DBLB UPPST','GS 23','WC A'][pageNumber-1]:tableText},
  {},{codeOnly:true}
 ];
 for(const options of cases){
  const data=[{words:cardWords('DBLB UPPST')},{words:cardWords('GS 23')},{words:cardWords('WC A')}];
  const oldPdf=mockPdf(data),newPdf=mockPdf(data),oldProgress=[],newProgress=[],oldDetail=[],newDetail=[];
  const before=await legacy.discover({pdf:oldPdf.pdf,examplePage:1,codeRect:code,tableRect:table,...options,onProgress:item=>oldProgress.push(item),onDetail:item=>oldDetail.push(item)});
  const after=await current.discover({pdf:newPdf.pdf,examplePage:1,codeRect:code,tableRect:table,...options,onProgress:item=>newProgress.push(item),onDetail:item=>newDetail.push(item)});
  assert.deepEqual(after,before,'discovery without overrides retains the existing result');assert.deepEqual(newProgress,oldProgress);assert.deepEqual(newDetail,oldDetail);assert.deepEqual(newPdf.calls,oldPdf.calls);
 }
 for(const label of ['GS 23','DBL-1','DBLB UPPST','WC A','Beslagskod: 140C','DBL-DS']){
  assert.equal(current.normalize(label),legacy.normalize(label));assert.deepEqual(current.extract(label),legacy.extract(label));
 }
}
async function nativeCodeOverrides(){
 const data=[{words:[word('Beslagskod: GS23',.24,.085)]},{words:[word('Beslagskod: GS24',.72,.085)]},
  {words:[word('Beslagskod: GS25',.24,.085)]},{size:[1200,600],words:[word('Beslagskod: GS26',.72,.085)]}];
 const before=mockPdf(data),original=await current.discover({pdf:before.pdf,examplePage:1,codeRect:code,codeOnly:true,fallbackPolicy:'none'});
 assert.deepEqual(codes(original),[[1,'GS23'],[3,'GS25']]);assert.deepEqual(original.excludedPages,[4]);assert(!before.calls.text.includes(4));
 const setup=mockPdf(data),progress=[],details=[];
 const result=await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,codeOnly:true,fallbackPolicy:'none',
  pageOverrides:{2:{code:movedCode},4:{code:movedCode}},onProgress:item=>progress.push(item),onDetail:item=>details.push(item)});
 assert.deepEqual(codes(result),[[1,'GS23'],[2,'GS24'],[3,'GS25'],[4,'GS26']]);assert.deepEqual(result.excludedPages,[]);
 assert.deepEqual(result.cards.find(item=>item.page===1).codeRect,code);assert.deepEqual(result.cards.find(item=>item.page===3).codeRect,code);
 for(const page of [2,4]){const record=result.cards.find(item=>item.page===page);assert.deepEqual(record.codeRect,movedCode);assert.equal(record.id,'p'+page+':code:5500-600-3600-600');assert(record.evidence.pageOverride);}
 assert.equal(result.cards.find(item=>item.page===4).evidence.samePageSize,false,'intentional page geometry correction supports another sheet size');
 assert.deepEqual(progress.map(item=>[item.done,item.total,item.page]),[[1,4,1],[2,4,2],[3,4,3],[4,4,4]]);
 assert.deepEqual(details.filter(item=>item.state==='start').map(item=>item.page),[1,2,3,4]);
 assert(result.cards.every(item=>item.codeOnly&&item.workDeferred&&item.tableRect===null&&item.tableText===''),'per-page code correction never reads products');
 // Changing a label does not change geometry, while changing the marked area
 // does change its geometry identity so a stale frame is not silently reused.
 assert.notEqual(result.cards.find(item=>item.page===2).id,original.cards.find(item=>item.page===2).id);
 const renamed=mockPdf(data.map((item,index)=>index===1?{words:[word('DBL-1',.72,.085)]}:item));
 const renamedResult=await current.discover({pdf:renamed.pdf,examplePage:1,codeRect:code,codeOnly:true,pageOverrides:{2:{code:movedCode}},fallbackPolicy:'none'});
 assert.equal(renamedResult.cards.find(item=>item.page===2).id,result.cards.find(item=>item.page===2).id);
}
async function fullOverrides(){
 const setup=mockPdf([{},{size:[1200,600]},{}]),reads=[];
 const result=await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,tableRect:table,
  pageOverrides:{2:{code:movedCode,table:movedTable},3:{table:movedTable}},
  readNative:async({pageNumber,kind,rect})=>{reads.push({pageNumber,kind,rect});const expected=pageNumber===2?(kind==='code'?movedCode:movedTable):pageNumber===3&&kind==='table'?movedTable:kind==='code'?code:table;
   return same(rect,expected)?kind==='code'?['GS23','DBL-1','WC A'][pageNumber-1]:tableText:'';}
 });
 assert.deepEqual(codes(result),[[1,'GS23'],[2,'DBL1'],[3,'WCA']]);
 for(const record of result.cards){assert.deepEqual(record.codeRect,record.page===2?movedCode:code);assert.deepEqual(record.tableRect,record.page===1?table:movedTable);assert(record.tableText.includes('Cylinder'));}
 assert.equal(reads.length,6,'each page is read once for code and once for table');assert.equal(result.cards.find(item=>item.page===2).evidence.samePageShape,false);
 const id=result.cards.find(item=>item.page===2).id;assert.equal(id,'p2:5500-600-3600-600-5500-1600-3600-3000');
 assert.deepEqual(setup.calls.text,[1,2,3],'one native stream read per page');
 // A manual correction is evidence even when the products do not resemble the
 // example. It does not invent any GS work: table text remains unfiltered.
 const custom=mockPdf([{},{}]);const uncommon=await current.discover({pdf:custom.pdf,examplePage:1,codeRect:code,tableRect:table,
  pageOverrides:{2:{table:movedTable}},readNative:async({pageNumber,kind})=>kind==='code'?'GS'+pageNumber:pageNumber===1?tableText:'Extrautrustning\nSpecialenhet Z99 DT'});
 assert.deepEqual(uncommon.cardPages,[1,2]);assert.equal(uncommon.cards[1].tableText,'Extrautrustning\nSpecialenhet Z99 DT');assert.match(uncommon.cards[1].reason,/egna markerade/);
}
async function ocrOverrides(){
 const dense=Array.from({length:9},(_,index)=>word('Projekttext'+index,.1+index*.06,.9));
 const setup=mockPdf([{words:[word('Beslagskod: GS23',.24,.085)]},{words:dense},{size:[1200,600],words:dense}]),reads=[];
 const result=await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,codeOnly:true,pageOverrides:{2:{code:movedCode},3:{code:movedCode}},fallbackPolicy:'matching-tables',
  readFallback:async({pageNumber,kind,rect})=>{reads.push({pageNumber,kind,rect});return {text:pageNumber===2?'DBL-1':'WC A',confidence:95};}});
 assert.deepEqual(codes(result),[[1,'GS23'],[2,'DBL1'],[3,'WCA']]);assert.deepEqual(reads.map(item=>[item.pageNumber,item.kind]),[[2,'code'],[3,'code']]);assert(reads.every(item=>same(item.rect,movedCode)));
 const full=mockPdf([{words:cardWords('GS23')},{size:[1200,600],words:dense},{}]),fullReads=[];
 const fullResult=await current.discover({pdf:full.pdf,examplePage:1,codeRect:code,tableRect:table,pageOverrides:{2:{code:movedCode,table:movedTable}},fallbackPolicy:'matching-tables',
  readFallback:async({pageNumber,kind,rect})=>{fullReads.push({pageNumber,kind,rect});return {text:kind==='code'?'DBL-1':'Specialutrustning\nMODUL Z99 GS',confidence:95};}});
 assert.deepEqual(codes(fullResult),[[1,'GS23'],[2,'DBL1']]);assert.deepEqual(fullReads.map(item=>[item.pageNumber,item.kind]),[[2,'code'],[2,'table']]);
 assert.deepEqual(fullReads[0].rect,movedCode);assert.deepEqual(fullReads[1].rect,movedTable);assert.deepEqual(fullResult.cards.find(item=>item.page===2).methods,['code-ocr','table-ocr']);assert.equal(fullResult.cards.find(item=>item.page===3).status,'unresolved');
 const uncertain=mockPdf([{words:[word('GS23',.24,.085)]},{}]);
 const uncertainResult=await current.discover({pdf:uncertain.pdf,examplePage:1,codeRect:code,codeOnly:true,pageOverrides:{2:{code:movedCode}},readFallback:async()=>({text:'DBL-1',confidence:20})});
 assert.equal(uncertainResult.cards.find(item=>item.page===2).status,'unresolved');assert.equal(uncertainResult.cards.find(item=>item.page===2).code,'','corrected geometry does not bypass OCR confidence checks');
}
async function repeatedCards(){
 const data=[{words:cardWords('GS23')},{words:[...cardWords('GS24'),...cardWords('GS25',.48)]},{words:[...cardWords('GS26'),...cardWords('GS27',.48)]}];
 const legacySetup=mockPdf(data),legacyResult=await legacy.discover({pdf:legacySetup.pdf,examplePage:1,codeRect:code,tableRect:table,fallbackPolicy:'none'});
 assert.equal(legacyResult.cards.filter(item=>item.page===2&&item.status==='proposed').length,2,'fixture contains two independently detectable source frames');
 const setup=mockPdf(data),result=await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,tableRect:table,fallbackPolicy:'none',pageOverrides:{2:{code:movedCode,table:movedTable}}});
 assert.equal(result.cards.filter(item=>item.page===2).length,1,'the page correction selects only its intended card frame');assert.equal(result.cards.find(item=>item.page===2).code,'GS25');
 assert.deepEqual(result.cards.filter(item=>item.page===3&&item.status==='proposed').map(item=>item.code).sort(),['GS26','GS27'],'repeated-card discovery on other pages remains available');
}
async function targetedAndCancellation(){
 for(const codeOnly of [true,false]){
  const setup=mockPdf([{words:cardWords('GS23')},{words:cardWords('GS24')},{words:cardWords('GS25')}]),progress=[],detail=[];
  const result=await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,tableRect:table,codeOnly,onlyPages:[2],onProgress:item=>progress.push(item),onDetail:item=>detail.push(item)});
  assert.deepEqual(result.pages.map(item=>item.page),[2]);assert.deepEqual(result.cards.map(item=>item.page),[2]);assert.deepEqual(result.cardPages,[2]);assert(!setup.calls.getPage.includes(3));assert(!setup.calls.text.includes(3),'unrelated pages are not parsed during a targeted read');
  assert.deepEqual(progress.map(item=>[item.done,item.total,item.page]),[[1,1,2]]);assert.deepEqual(detail.map(item=>[item.state,item.page,item.pageCount,item.pageIndex]),[['start',2,1,1],['complete',2,1,1]]);
  const none=mockPdf([{},{}]);const empty=await current.discover({pdf:none.pdf,examplePage:1,codeRect:code,tableRect:table,codeOnly,onlyPages:[]});assert.deepEqual(empty.pages,[]);assert.deepEqual(none.calls.getPage,[]);
  const alreadyCancelled=new AbortController();alreadyCancelled.abort();const stopped=mockPdf([{},{}]);await assert.rejects(current.discover({pdf:stopped.pdf,examplePage:1,codeRect:code,tableRect:table,codeOnly,signal:alreadyCancelled.signal}),{name:'AbortError'});assert.deepEqual(stopped.calls.getPage,[]);
  const cancel=new AbortController(),active=mockPdf([{words:cardWords('GS23')},{},{}]),fallback=[];
  await assert.rejects(current.discover({pdf:active.pdf,examplePage:1,codeRect:code,tableRect:table,codeOnly,pageOverrides:{2:{code:movedCode,table:movedTable}},signal:cancel.signal,
   readFallback:async({pageNumber})=>{fallback.push(pageNumber);cancel.abort();return {text:'GS24',confidence:95};}}),{name:'AbortError'});
  assert.deepEqual(fallback,[2]);assert(!active.calls.getPage.includes(3),'aborting the corrected field prevents subsequent page reads');
 }
 const setup=mockPdf([{},{}]),override={code:{...movedCode}},captured=[];
 await current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,codeOnly:true,pageOverrides:{2:override},readNative:async({pageNumber,rect})=>{captured.push({...rect});if(pageNumber===1)override.code.x=0;return 'GS'+pageNumber;}});
 assert.deepEqual(captured[1],movedCode,'running scans use a validated snapshot of the chosen geometry');
}
async function validation(){
 const invalidMaps=[null,[],false,{'0':{code}}, {'01':{code}},{'1e0':{code}},{'-1':{code}},{'1.5':{code}},{'4':{code}}, {'NaN':{code}}, {'2':null},{'2':[]},{'2':{}},{'2':{unknown:code}}, {'2':{code:null}}, {'2':{code:{...code,w:0}}}, {'2':{table:{...table,h:-1}}}, {'2':{code:{...code,x:-.1}}}, {'2':{code:{...code,x:'0.1'}}}, {'2':{code:{...code,w:Infinity}}}, {'2':{code:{...code,h:NaN}}}, {'2':{code:{x:.9,y:0,w:.2,h:.1}}}];
 for(const codeOnly of [true,false])for(const pageOverrides of invalidMaps){const setup=mockPdf([{}, {}, {}]);await assert.rejects(current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,tableRect:table,codeOnly,pageOverrides}),/sida|område|kod|tabell/i);assert.deepEqual(setup.calls.getPage,[],'invalid override is rejected before PDF work');}
 for(const onlyPages of [null,'2',2,{},[0],[4],['2'],[1.5],[NaN]]){const setup=mockPdf([{}, {}, {}]);await assert.rejects(current.discover({pdf:setup.pdf,examplePage:1,codeRect:code,tableRect:table,onlyPages}),/PDF-sidor/);assert.deepEqual(setup.calls.getPage,[]);}
 const cancelled=mockPdf([{}]);await assert.rejects(current.discover({pdf:cancelled.pdf,examplePage:1,codeRect:code,codeOnly:true,cancelled:()=>true}),{name:'AbortError'});assert.deepEqual(cancelled.calls.getPage,[]);
}
(async()=>{await sameDefaults();await nativeCodeOverrides();await fullOverrides();await ocrOverrides();await repeatedCards();await targetedAndCancellation();await validation();console.log('PASS TEST 9.3 discovery: unchanged defaults, per-page native/OCR code and table rectangles, intentional page formats, corrected source IDs, isolated repeated frames, targeted output/progress, strict validation and cancellation');})().catch(error=>{console.error(error);process.exitCode=1;});
