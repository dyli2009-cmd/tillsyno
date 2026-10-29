'use strict';
// Generated fixtures only. Customer drawings are never committed to the repository.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../vendor/pdf-lib.min.js'),J=require('../vendor/pdf.min.js'),D=require('../smartmatch-projektering-v2-19-data.js'),I=require('../smartmatch-projektering-v2-19-import.js'),P=require('../smartmatch-projektering-v2-19-pdf.js'),S=require('../smartmatch-projektering-v2-19-store.js'),M=require('../smartmatch-projektering-v2-19-materials.js');
J.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const clone=x=>JSON.parse(JSON.stringify(x));
async function fixture(){
 const pdf=await L.PDFDocument.create(),font=await pdf.embedFont(L.StandardFonts.Helvetica),drawing=pdf.addPage([500,700]);drawing.setRotation(L.degrees(90));drawing.setCropBox(10,20,480,660);
 drawing.drawText('Room GS1 and DS: ordinary drawing text',{x:40,y:610,font,size:11});
 function annotate(subtype,subject,rect){const ap=pdf.context.register(pdf.context.flateStream('0 0 20 20 re S',{Type:'XObject',Subtype:'Form',BBox:[0,0,20,20],Resources:{}}));drawing.node.addAnnot(pdf.context.register(pdf.context.obj({Type:'Annot',Subtype:subtype,Subj:L.PDFHexString.fromText(subject),Contents:L.PDFHexString.fromText(subject),Rect:rect,F:4,AP:{N:ap}})));}
 annotate('Stamp','GS 1',[60,100,100,125]);annotate('Stamp','GS1',[140,180,180,205]);annotate('Stamp','Dörrautomatik',[200,100,220,120]);annotate('Stamp','Dörrstängare',[240,100,260,120]);annotate('Stamp','GS ID',[280,100,320,125]);annotate('FreeText','GS1',[320,400,380,430]);
 const card=pdf.addPage([595,842]),txt=(text,x,y)=>card.drawText(text,{x,y,size:8,font});txt('GS 1',40,800);
 for(const [t,x]of [['Lev av',300],['Mont av',340],['Ansl av',380],['Funk ansvar',420],['Anm',480]])txt(t,x,710);
 txt('Daglåsning',40,690);
 function row(label,product,y,delivery='GS',installer='DT',connection='EL',fn='BH',note=''){txt(label,40,y);txt(product,180,y);for(const [t,x]of [[delivery,308],[installer,348],[connection,388],[fn,428],[note,480]])if(t)txt(t,x,y);}
 row('Låshus','SM36',670);row('Slutbleck','ES19',650,'GS','DT','EL','BH','Alternativ');row('Cylinderbehör','256',630);
 txt('Nattlåsning',40,600);row('Låshus','-',580,'','','','');row('Kabelöverföring','EA281',560,'DT','EL','DT','GS');
 txt('Dörrstängning',40,530);row('Dörrautomatik','ED100',510);row('Klämfri bakkant','ja',490);txt('Dörrfunktion',40,460);txt('Projekterad funktion',180,440);
 return new Uint8Array(await pdf.save());
}
function annotations(pdf,page=0){return pdf.context.lookup(pdf.getPage(page).node.get(L.PDFName.of('Annots')))?.asArray().map(ref=>pdf.context.lookup(ref))||[];}
function field(pdf,a,key){return pdf.context.lookup(a.get(L.PDFName.of(key)));}
(async()=>{
 const input=await fixture(),originalBefore=Buffer.from(input),result=await I.scan(input,'Generated.pdf');
 assert.deepEqual(Buffer.from(input),originalBefore,'input bytes stay untouched');assert.equal(result.stats.cards,1);assert.equal(result.stats.stamps,5);assert.equal(result.stats.matched,2);assert.equal(result.stats.unmatched,1);assert.equal(result.state.placements.length,5);assert.equal(result.state.annotations.length,0,'drawing text is not converted');
 assert.equal(result.state.drawing.pages.length,1,'source card pages are replaced, not duplicated');assert.equal(result.state.schema,6);assert(result.issues.some(t=>t.includes('GSID')));assert(!result.state.cards.GSID,'unmatched code does not invent a card or materials');
 const state=result.state,card=state.cards.GS1,strike=card.rows.find(r=>r.id==='day-strike');assert.equal(strike.product,'ES19');assert.equal(strike.delivery,'GS');assert.equal(strike.installer,'DT');assert.equal(strike.connection,'EL');assert.equal(strike.functionOwner,'BH');assert.equal(strike.note,'Alternativ');
 assert.equal(card.rows.find(r=>r.label==='Klämfri bakkant').product,'ja');assert.equal(card.rows.find(r=>r.section==='Nattlåsning'&&r.label==='Kabelöverföring').product,'EA281');assert.equal(card.functions.door,'Projekterad funktion');assert(M.build(state).rows.some(r=>r.component==='Klämfri bakkant'),'unmapped material remains in totals');
 const bg=await L.PDFDocument.load(result.original);assert.equal(annotations(bg).length,1,'only converted Stamp annotations are removed');assert.equal(String(field(bg,annotations(bg)[0],'Subtype')),'/FreeText');
 const reader=await J.getDocument({data:result.original.slice(),verbosity:0}).promise;assert((await(await reader.getPage(1)).getTextContent()).items.some(t=>t.str.includes('ordinary drawing text')));await reader.destroy();
 const manual=clone(state),unknown=manual.placements.find(p=>p.code==='GSID');D.assignPlacementCard(manual,unknown.id,'GS1');assert.equal(manual.placements.find(p=>p.id===unknown.id).code,'GS1');assert(!manual.conversion.issues.some(t=>t.startsWith('GSID:')));
 const first=state.placements.find(p=>p.code==='GS1'),second=state.placements.filter(p=>p.code==='GS1')[1];
 D.forkPlacementCard(state,first.id,'GS1:2');state.cards['GS1:2'].rows.find(r=>r.id==='day-strike').product='NEW';assert.equal(state.cards.GS1.rows.find(r=>r.id==='day-strike').product,'ES19');
 D.forkPlacementCard(state,second.id,'GS1:2',undefined,{reuse:true});assert.equal(Object.keys(state.cards).length,2);assert.equal(state.placements.filter(p=>p.code==='GS1:2').length,2);
 D.renameCard(state,'GS1:2','GS1:3');assert.equal(state.placements.filter(p=>p.code==='GS1:3').length,2);assert.equal(state.cards['GS1:3'].rows.find(r=>r.id==='day-strike').product,'NEW');
 D.removePlacements(state,[second.id]);assert(state.cards['GS1:3'],'deleting one placement keeps the shared card');
 const json=await S.pack(state,result.original);assert.deepEqual((await S.unpack(json)).state,state);
 const exported=await P.build(state,result.original),reopened=await P.inspect(exported);assert.deepEqual(reopened.state,state);assert.deepEqual(reopened.original,result.original);
 const pdf=await L.PDFDocument.load(exported),stamps=annotations(pdf).filter(a=>String(field(pdf,a,'Subtype'))==='/Stamp');assert.equal(stamps.length,state.placements.length);for(const a of stamps){const ap=field(pdf,a,'AP'),stream=field(pdf,ap,'N');assert(L.decodePDFRawStream(stream).decode().length>100,'each editable stamp carries its visible appearance');}
 const moved=stamps.find(a=>field(pdf,a,'NM').decodeText()==='projection-v2-'+first.id),rect=field(pdf,moved,'Rect').asArray().map(n=>n.asNumber());moved.set(L.PDFName.of('Rect'),pdf.context.obj([rect[0]+12,rect[1],rect[2]+12,rect[3]]));moved.set(L.PDFName.of('Subj'),L.PDFHexString.fromText('GS1:4'));
 const external=await P.inspect(await pdf.save()),position=external.state.placements.find(p=>p.id===first.id);assert.equal(position.code,'GS1:4');assert(position.x>state.placements.find(p=>p.id===first.id).x);assert.equal(external.state.cards['GS1:4'].rows.find(r=>r.id==='day-strike').product,'NEW');
 await assert.rejects(()=>I.scan(exported,'Already-converted.pdf'),/redan/);
 // Large embedded data previously overflowed pdf-lib's UTF-16 decoder.
 const big=clone(state);for(let i=0;i<120;i++){const code='TEST'+(i+1);big.cards[code]={...clone(card),code,meta:{...card.meta,littera:code},note:'X'.repeat(1200)};}assert.deepEqual((await P.inspect(await P.build(big,result.original,{mode:'drawing'}))).state,big);
 // Optional local acceptance fixture; never included in the repository.
 if(process.argv[2]){
  const real=await I.scan(fs.readFileSync(process.argv[2]),'Acceptance.pdf');assert.equal(real.stats.cards,15);assert.equal(real.stats.stamps,571);assert.equal(real.stats.references,17);assert.equal(real.state.placements.length,588);assert.equal(real.stats.matched,245);assert.equal(real.stats.rows,101);assert.equal(real.state.cards.GS4.rows.find(r=>r.id==='day-lock').installer,'DT');assert.equal(real.state.drawing.pages.length,10);assert.deepEqual((await P.inspect(await P.build(real.state,real.original))).state,real.state);console.log('PASS acceptance: 15 cards, 571 stamps, 245 linked, 101 material rows, complete PDF roundtrip');
 }
 console.log('PASS import: stamp-only conversion, rotated/cropped coordinates, independent owners, extra materials, shared cards/variants, editable PDF appearances, external move/rename, large JSON/PDF roundtrip');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
