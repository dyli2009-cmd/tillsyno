'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),PDFLib=require(path.join(root,'vendor/pdf-lib.min.js'));
const {PDFDocument,PDFName:N,PDFNumber,PDFString,PDFHexString,StandardFonts,rgb}=PDFLib;
const extraKeys=['SmartMatch23ExtraPages','SmartMatch21ExtraPages','SmartMatch18ExtraPages','SmartMatch17ExtraPages'];
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function extract(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b)}
function transform(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]}
function harness(instances,protocolMap,cards={},version=79){
 const source=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-'+version+'.js'),'utf8');
 let textReads=0,cleanups=0;
 const context=vm.createContext({PDFLib,instances,protocolMap,DRAWING_IS_IOS:true,
  window:{SmartMatchReadTest:{cardFor:code=>cards[code]||{id:'card-'+code,codeRect:{x:.08,y:.16}}}},pdfjsLib:{Util:{transform}},
  pdf:{getPage:async()=>({getViewport:()=>({width:600,height:800,rotation:0,transform:[1,0,0,-1,0,800],convertToPdfPoint:(x,y)=>[x,800-y]}),
   getTextContent:async()=>{textReads++;return {items:[{str:'Beslagskod GS10',transform:[1,0,0,10,45,675]},{str:'Beslagskod GS20',transform:[1,0,0,10,350,675]}]}},cleanup(){cleanups++}})},
  smartFlattenProgressBadges:async()=>({})});
 vm.runInContext(extract(source,'function smartUpdatePositionBookmarks(','/* TEST v36.46:')+
  extract(source,'async function appendCompactProjectPdf(','// Only our indexed streams'),context);
 return {append:context.appendCompactProjectPdf,stats:()=>({textReads,cleanups})};
}
function generatedLinks(doc,page){return (page.node.Annots()?.asArray()||[]).map(ref=>doc.context.lookup(ref)).filter(a=>/^SM25:/.test(a.get(N.of('NM'))?.decodeText?.()||''))}
function action(doc,annotation){return doc.context.lookup(annotation.get(N.of('A')))}
function destination(doc,annotation){return doc.context.lookup(action(doc,annotation).get(N.of('D')))}
function outlineGroups(doc){
 const group=doc.catalog.lookup(N.of('SmartMatch28OutlineRef'),PDFLib.PDFDict),items=[];
 for(let ref=group.get(N.of('First'));ref;){
  const node=doc.context.lookup(ref),children=[];
  for(let child=node.get(N.of('First'));child;){const obj=doc.context.lookup(child);children.push({title:obj.get(N.of('Title')).decodeText(),dest:doc.context.lookup(obj.get(N.of('Dest')))});child=obj.get(N.of('Next'))}
  items.push({title:node.get(N.of('Title')).decodeText(),dest:doc.context.lookup(node.get(N.of('Dest'))),children});ref=node.get(N.of('Next'));
 }
 return items;
}
function streams(doc,pages=doc.getPageCount()){
 return doc.getPages().slice(0,pages).map(page=>(page.node.normalizedEntries().Contents?.asArray()||[]).map(ref=>({ref:String(ref),hash:hash(doc.context.lookup(ref).getContents())})));
}
function assertOriginalStreams(doc,original){
 const current=streams(doc,original.length);
 for(let i=0;i<original.length;i++)for(const stream of original[i])assert(current[i].some(v=>v.hash===stream.hash),'source content stream bytes remain unchanged on page '+(i+1));
}
async function fixture(count){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 for(let i=0;i<count;i++){const page=doc.addPage([600,800]);page.drawText('ORIGINAL VECTOR PAGE '+(i+1),{x:40,y:740,font,size:14});if(i===count-1){page.drawText('Beslagskod GS10',{x:45,y:675,font,size:10});page.drawText('Beslagskod GS20',{x:350,y:675,font,size:10})}}
 const payload=PDFHexString.fromText(JSON.stringify({schema:6,sourceName:'Originalritning.pdf',untouched:'Åäö',readTestData:{cards:{}},instances:{}}));
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])doc.catalog.set(N.of(key),payload);
 doc.catalog.set(N.of('CustomerMetadata'),PDFString.of('Preserve original customer metadata'));
 await doc.attach(Buffer.from('CUSTOMER ATTACHMENT 123'),'customer-attachment.txt',{mimeType:'text/plain'});
 const custom=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',NM:PDFString.of('CustomerLink'),Rect:[30,30,100,60],A:{S:'GoTo',D:[doc.getPage(1).ref,N.of('Fit')]}}));
 doc.getPage(0).node.set(N.of('Annots'),doc.context.obj([custom]));
 const outline=doc.context.obj({Type:'Outlines',Count:1}),outlineRef=doc.context.register(outline);
 const customerBookmark=doc.context.register(doc.context.obj({Title:PDFHexString.fromText('Customer bookmark'),Parent:outlineRef,Dest:[doc.getPage(0).ref,N.of('Fit')]}));
 outline.set(N.of('First'),customerBookmark);outline.set(N.of('Last'),customerBookmark);doc.catalog.set(N.of('Outlines'),outlineRef);
 return doc;
}
function assertMarkers(doc,count){for(const key of extraKeys)assert.equal(doc.catalog.get(N.of(key)).asNumber(),0);assert.equal(doc.catalog.get(N.of('SmartMatch21OriginalPages')).asNumber(),count)}
function assertMetadata(doc,expected){
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])assert.equal(doc.catalog.get(N.of(key)).asString(),expected);
 assert.equal(doc.catalog.get(N.of('CustomerMetadata')).decodeText(),'Preserve original customer metadata');
 const outline=doc.catalog.lookup(N.of('Outlines'),PDFLib.PDFDict),first=doc.context.lookup(outline.get(N.of('First')));assert.equal(first.get(N.of('Title')).decodeText(),'Customer bookmark');
 assert((doc.getPage(0).node.Annots()?.asArray()||[]).some(ref=>doc.context.lookup(ref).get(N.of('NM'))?.decodeText?.()==='CustomerLink'));
 const names=doc.catalog.lookup(N.of('Names'),PDFLib.PDFDict).lookup(N.of('EmbeddedFiles'),PDFLib.PDFDict).lookup(N.of('Names'),PDFLib.PDFArray);
 assert.equal(names.get(0).decodeText(),'customer-attachment.txt');
 const file=doc.context.lookup(names.get(1),PDFLib.PDFDict).lookup(N.of('EF'),PDFLib.PDFDict).lookup(N.of('F'));
 assert.equal(Buffer.from(PDFLib.decodePDFRawStream(file).decode()).toString(),'CUSTOMER ATTACHMENT 123');
}
function assertNoFallback(doc,links){for(const link of links){const a=action(doc,link);assert(!a.has(N.of('JS')));assert(!a.has(N.of('Next')));assert(!link.has(N.of('AA')));if(a.get(N.of('S')).toString()==='/Named'){assert.equal(a.get(N.of('N')).toString(),'/GoBack');assert(!a.has(N.of('D')))}}}
async function sample(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const positions=[{page:1,code:'G30',position:1,totalOfCode:2,rect:[65,420,390,490]},{page:2,code:'G30',position:2,totalOfCode:2,rect:[65,420,390,490]}];
 for(const label of ['Ritning A','Ritning B']){
  const page=doc.addPage([600,800]);page.drawText(label+' - navigationstest 9.79',{x:45,y:740,size:22,font});
  page.drawText('Tryck G30 för att öppna det gemensamma protokollet.',{x:45,y:690,size:14,font});
  page.drawRectangle({x:65,y:420,width:325,height:70,color:rgb(.88,.94,1),borderColor:rgb(.1,.35,.65),borderWidth:2});
  page.drawText('G30 - öppna protokoll',{x:85,y:447,size:23,font});
  page.drawText('Prova från båda ritningarna. Tillbaka ska återgå hit.',{x:45,y:350,size:14,font});
 }
 const card=doc.addPage([600,800]);card.drawText('Gemensamt G30-protokoll',{x:45,y:740,size:22,font});
 card.drawText('Beslagskod G30',{x:45,y:675,size:14,font});
 card.drawText('Tryck Tillbaka till ritningen ovanför Beslagskod.',{x:45,y:610,size:14,font});
 card.drawText('Knappen använder PDF-läsarens GoBack-historik.',{x:45,y:580,size:14,font});
 card.drawText('Om läsaren saknar historik: använd PDF-bokmärkena.',{x:45,y:550,size:14,font});
 const h=harness(positions,{G30:3},{G30:{id:'source-G30',codeRect:{x:.08,y:.16}}});await h.append(doc);
 const target=path.join(root,'work/navigation-v9-79/sample.pdf');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,await doc.save());
 console.log('Sample PDF: '+target);
}
(async()=>{
 const positions=Array.from({length:430},(_,i)=>({page:i%10+1,code:'GS10',position:i+1,totalOfCode:430,rect:[40+i%4*40,300,65+i%4*40,320]}));
 const h=harness(positions,{GS10:70});let doc=await fixture(70),source=await doc.save(),sourceHash=hash(source);doc=await PDFDocument.load(source);
 const original=streams(doc),metadata=doc.catalog.get(N.of('TillsynoSmartMatchV36Data')).asString();
 const result=await h.append(doc);assert.equal(doc.getPageCount(),70);assert.equal(result.extraPages,0);assert.equal(result.historyReturns,1);assert.equal(result.directReturns,0);assert.equal(result.positions,430);assertMarkers(doc,70);
 assertOriginalStreams(doc,original);assertMetadata(doc,metadata);assert.equal(hash(source),sourceHash,'input source bytes are immutable');
 let forwards=0;
 for(const position of positions){const links=generatedLinks(doc,doc.getPage(position.page-1));for(const link of links){assert.equal(String(destination(doc,link).get(0)),String(doc.getPage(69).ref))} }
 for(let i=0;i<69;i++)forwards+=generatedLinks(doc,doc.getPage(i)).length;assert.equal(forwards,430);
 let returns=generatedLinks(doc,doc.getPage(69));assert.equal(returns.length,1);assert.equal(action(doc,returns[0]).get(N.of('S')).toString(),'/Named');assertNoFallback(doc,returns);
 let groups=outlineGroups(doc);assert.equal(groups.length,1);assert.equal(groups[0].children.length,430);
 const expected=positions.map(o=>JSON.stringify([String(doc.getPage(o.page-1).ref),Math.max(0,o.rect[0]-35),Math.min(800,o.rect[3]+90)])).sort();
 assert.deepEqual(groups[0].children.map(c=>JSON.stringify([String(c.dest.get(0)),c.dest.get(2).asNumber(),c.dest.get(3).asNumber()])).sort(),expected);
 doc=await PDFDocument.load(await doc.save());await h.append(doc);assert.equal(doc.getPageCount(),70);assert.equal(generatedLinks(doc,doc.getPage(69)).length,1);assertMarkers(doc,70);assertOriginalStreams(doc,original);assertMetadata(doc,metadata);
 assert.deepEqual(h.stats(),{textReads:2,cleanups:2},'one text extraction/cleanup per physical page per export');

 // Real old exact exporter produces 500 pages; new migration removes precisely
 // its tagged 430 generated pages, retaining all source streams and metadata.
 doc=await PDFDocument.load(source);const old=harness(positions,{GS10:70},{},77);await old.append(doc,async()=>{},true);assert.equal(doc.getPageCount(),500);
 doc=await PDFDocument.load(await doc.save());await h.append(doc);assert.equal(doc.getPageCount(),70);assertMarkers(doc,70);assertOriginalStreams(doc,original);assertMetadata(doc,metadata);assert.equal(outlineGroups(doc)[0].children.length,430);

 // Distinct source cards on one physical page retain independent button placement.
 const aliases={GS10:{id:'source-A',codeRect:{x:.08,y:.16}},GSALIAS:{id:'alias-A',sourceCardId:'source-A',codeRect:{x:.08,y:.16}},GS20:{id:'source-B',codeRect:{x:.6,y:.16}}};
 const mixed=[{page:1,code:'GS10',position:1,totalOfCode:1,rect:[50,300,80,330]},
  {page:2,code:'GSALIAS',position:1,totalOfCode:1,rect:[150,400,180,430]},
  {page:2,code:'GS20',position:1,totalOfCode:1,rect:[250,500,280,530]}];
 doc=await fixture(3);const shared=harness(mixed,{GS10:3,GSALIAS:3,GS20:3},aliases);const mixedResult=await shared.append(doc);assert.equal(doc.getPageCount(),3);assert.equal(mixedResult.cards,2);assert.equal(mixedResult.historyReturns,1);assert.equal(mixedResult.directReturns,1);
 returns=generatedLinks(doc,doc.getPage(2));assert.equal(returns.length,2);assertNoFallback(doc,returns);
 const direct=returns.find(link=>action(doc,link).get(N.of('S')).toString()==='/GoTo');assert(direct);const back=destination(doc,direct);assert.equal(String(back.get(0)),String(doc.getPage(1).ref));assert.equal(back.get(2).asNumber(),215);assert.equal(back.get(3).asNumber(),620);
 assert.notEqual(returns[0].get(N.of('Rect')).get(0).asNumber(),returns[1].get(N.of('Rect')).get(0).asNumber());
 groups=outlineGroups(doc);assert.equal(groups.length,3);assert(groups.some(g=>g.title.startsWith('GS10 ')));assert(groups.some(g=>g.title.startsWith('GSALIAS ')));assert(groups.some(g=>g.title.startsWith('GS20 ')));assert.equal(groups.reduce((sum,g)=>sum+g.children.length,0),3);
 assert.deepEqual(shared.stats(),{textReads:1,cleanups:1});
 // Two aliases at the same drawing coordinates still have only one origin.
 doc=await fixture(3);const same=mixed.slice(0,2).map(row=>({...row,page:1,rect:[50,300,80,330]}));const sameResult=await harness(same,{GS10:3,GSALIAS:3},aliases).append(doc);assert.equal(sameResult.directReturns,1);assert.equal(sameResult.historyReturns,0);

 // Explicit zero is authoritative, even when legacy counts remain positive.
 for(const first of [0,1]){
  doc=await fixture(3);if(first)doc.catalog.set(N.of(extraKeys[0]),PDFNumber.of(0));
  doc.catalog.set(N.of(extraKeys[1]),PDFNumber.of(0));doc.catalog.set(N.of(extraKeys[2]),PDFNumber.of(2));doc.catalog.set(N.of(extraKeys[3]),PDFNumber.of(2));doc.catalog.set(N.of('SmartMatch21OriginalPages'),PDFNumber.of(1));
  await harness([],{ }).append(doc);assert.equal(doc.getPageCount(),3);assertMarkers(doc,3);
 }
 // Untagged pages are never heuristically deduplicated, even with an old count.
 doc=await fixture(3);doc.catalog.set(N.of('SmartMatch21OriginalPages'),PDFNumber.of(1));await harness([],{}).append(doc);assert.equal(doc.getPageCount(),3);
 for(const count of [-1,3,1.5]){doc=await fixture(3);doc.catalog.set(N.of(extraKeys[0]),PDFNumber.of(count));await assert.rejects(()=>harness([],{}).append(doc),/exportsidor/);assert.equal(doc.getPageCount(),3)}
 doc=await fixture(3);doc.catalog.set(N.of(extraKeys[0]),PDFNumber.of(1));doc.catalog.set(N.of('SmartMatch21OriginalPages'),PDFNumber.of(1));await assert.rejects(()=>harness([],{}).append(doc),/stämmer inte/);assert.equal(doc.getPageCount(),3);
 if(process.argv.includes('--sample'))await sample();
 console.log('PASS: 70 originals/430 positions stay 70; original-page forwards, shared GoBack without JS/fallback, unique exact return, alias grouping, independent cards/bookmarks, repeat export, real 500-to-70 migration, authoritative zero markers and fail-closed inconsistent counts; source streams/metadata preserved.');
})().catch(error=>{console.error(error);process.exitCode=1});
