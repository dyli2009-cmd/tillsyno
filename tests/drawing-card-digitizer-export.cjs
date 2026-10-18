/* Structured door-card JSON/PDF export: completeness, layout, Swedish text and embedded manifest. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PDFLib=require('../vendor/pdf-lib.min.js');
const exporter=require('../drawing-card-digitizer-export.js');
const {PDFDocument,PDFName,PDFDict,PDFArray,PDFRawStream,decodePDFRawStream}=PDFLib;

function fixture(){
 const assigned={id:'t1',text:'Dörrstängare',confidence:96,box:{x:.1,y:.4,w:.2,h:.03},source:'ocr'};
 const derived={id:'t6',text:'Karmöverföring ÅÄÖ',confidence:61,box:{x:.1,y:.8,w:.3,h:.03},source:'ocr'};
 return {
  schema:'tillsyno.digital-door-card-project',schemaVersion:1,id:'project-åäö',source:{fileName:'Tånga dörrkort.pdf'},
  template:{schema:'tillsyno.door-card-template',schemaVersion:1,id:'mall-a',name:'Tånga',columns:[
   {key:'designation',label:'Benämning'},{key:'type',label:'Typ / utförande'},{key:'quantity',label:'Antal'},{key:'installer',label:'Monteras av'}]},
  cards:[{
   schema:'tillsyno.digital-door-card',schemaVersion:1,id:'kort-g69',templateId:'mall-a',source:{page:6,fileName:'Tånga dörrkort.pdf'},
   header:{code:'G69',label:'Beslagskod 4.2',fields:[{id:'door',label:'Dörr',text:'G69',tokenIds:['t0'],confidence:99}]},
   sections:[
    {key:'day',label:'Daglåsning',rows:[{id:'r1',sectionKey:'day',cells:{designation:'Låshus',type:'DL 9192',quantity:'1',installer:'GS'},tokenIds:['t2','t3'],confidence:95,reviewed:true}]},
    {key:'other',label:'Övrig utrustning',rows:[{id:'r2',sectionKey:'other',cells:{designation:'Dörrstängare',type:'DC700',quantity:'1',installer:'GS'},tokenIds:['t1','t4'],confidence:{average:68,minimum:55,low:true},reviewed:true}]}
   ],
   fixedElements:[{id:'fixed-1',kind:'column-header',text:'Benämning Typ Antal Monteras av',tokenIds:['fixed'],confidence:{average:99,minimum:99,low:false}}],
   sourceTokens:[{id:'t0',text:'G69',confidence:99},assigned,{id:'t2',text:'Låshus',confidence:95},{id:'t3',text:'DL 9192',confidence:95},
    {id:'t4',text:'DC700',confidence:93},derived,{id:'fixed',text:'Benämning Typ Antal Monteras av',confidence:99},{id:'ignored',text:'Fast rubrik',confidence:99}],
   unassignedTokens:[{id:'manual-unassigned',text:'Dörrmagnet 🔒',confidence:55,source:'ocr'}],ignoredTokenIds:['ignored'],
   review:{status:'approved',approvedAt:'2026-10-18T08:00:00.000Z'}
  },{
   schema:'tillsyno.digital-door-card',schemaVersion:1,id:'kort-wc',templateId:'mall-a',source:{page:7},header:{code:'WC',label:'Beslagskod'},
   sections:[{key:'alarm',label:'Larm / passer',rows:[{id:'r3',cells:{designation:'Öppningsknapp',type:'OPK-1',quantity:'1',installer:'GS'},tokenIds:[],confidence:88}]}],
   sourceTokens:[],unassignedTokens:[],ignoredTokenIds:[],review:{status:'needs-review'}
  }]
 };
}
function attachment(document,name){
 const names=document.catalog.lookup(PDFName.of('Names'),PDFDict),embedded=names.lookup(PDFName.of('EmbeddedFiles'),PDFDict),entries=embedded.lookup(PDFName.of('Names'),PDFArray);
 for(let index=0;index<entries.size();index+=2){
  if(entries.get(index).decodeText()!==name)continue;
  const spec=document.context.lookup(entries.get(index+1),PDFDict),ef=spec.lookup(PDFName.of('EF'),PDFDict),stream=document.context.lookup(ef.get(PDFName.of('F')));
  assert(stream instanceof PDFRawStream);return new TextDecoder().decode(decodePDFRawStream(stream).decode());
 }
 return null;
}
async function run(){
 const input=fixture(),timestamp='2026-10-18T09:00:00.000Z';
 delete global.PDFLib;
 const json=exporter.buildJson(input,{exportedAt:timestamp}),manifest=JSON.parse(json);
 assert.equal(manifest.schema,'tillsyno.digital-door-card-export');assert.equal(manifest.schemaVersion,1);assert.equal(manifest.exportedAt,timestamp);
 assert.equal(manifest.cards.length,2);assert.equal(manifest.cards[0].header.fields[0].text,'G69');
 assert.equal(manifest.cards[0].sourceTokens[5].text,'Karmöverföring ÅÄÖ','canonical JSON keeps exact Swedish source text');
 assert.equal(manifest.cards[0].unassignedTokens[0].text,'Dörrmagnet 🔒','canonical JSON keeps characters that need a visible PDF fallback');
 assert.equal(manifest.integrity.cardCount,2);assert.equal(manifest.integrity.approvedCardCount,1);assert.equal(manifest.integrity.needsReviewCount,1);
 assert.equal(manifest.integrity.unassignedTokenCount,2,'explicit and otherwise unreferenced source text are both audited');
 assert.deepEqual(manifest.integrity.cards[0].unassigned.map(token=>token.text).sort(),['Dörrmagnet 🔒','Karmöverföring ÅÄÖ'].sort());
 assert.equal(manifest.integrity.cards[0].rowCount,2);assert.equal(manifest.integrity.containsUnassignedText,true);

 const normalized=exporter.normalizeCard(input.cards[0],0,input.template);
 assert.deepEqual(normalized.columns.map(column=>column.key),['designation','type','quantity','installer']);
 assert.deepEqual(normalized.unassigned.map(token=>token.text).sort(),['Dörrmagnet 🔒','Karmöverföring ÅÄÖ'].sort());
 const layout=exporter.planCardLayout(normalized);
 assert(layout.pageHeight>=841.89);assert.equal(layout.rowCount,2);assert.equal(layout.unassignedCount,2);
 assert(layout.blocks.some(block=>block.kind==='section'&&block.label==='Övrig utrustning'));
 assert(layout.blocks.some(block=>block.kind==='row'&&block.cells.some(cell=>cell.text==='DC700')));
 assert.equal(layout.blocks.find(block=>block.kind==='row'&&block.cells.some(cell=>cell.text==='DC700')).row.confidence,68);
 assert(layout.blocks.some(block=>block.kind==='unassigned'&&block.lines.join(' ').includes('Karmöverföring ÅÄÖ')));
 assert.equal(exporter.sanitizeWinAnsi('ÅÄÖ åäö Dörrstängare'),'ÅÄÖ åäö Dörrstängare');
 assert.equal(exporter.sanitizeWinAnsi('Dörrmagnet 🔒'),'Dörrmagnet [U+1F512]');
 assert(exporter.wrapText('Öppningsknapp Karmöverföring',12).length>=2);
 assert.equal(exporter.defaultPdfName(input),'Tånga dörrkort-digitala-dorrkort.pdf');
 const browser={console,TextEncoder,Uint8Array,setTimeout,clearTimeout};browser.window=browser;
 const browserApi=Function('globalThis','window','module','exports',fs.readFileSync(path.resolve(__dirname,'../drawing-card-digitizer-export.js'),'utf8')+'\nreturn globalThis.DrawingCardDigitizerExport;')(browser,browser,undefined,undefined);
 assert(browserApi,'browser UMD API is exposed without PDFLib');
 assert.match(browserApi.buildJson(input,{exportedAt:timestamp}),/Karmöverföring ÅÄÖ/,'JSON works before PDFLib is loaded');
 browser.PDFLib=PDFLib;

 const events=[],result=await exporter.buildPdfPackage(input,{pdfLib:PDFLib,exportedAt:timestamp,onProgress:event=>events.push(event)});
 assert(result.bytes instanceof Uint8Array);assert(result.bytes.length>3000);assert.equal(result.report.cardCount,2);assert.equal(result.report.pageCount,2);
 assert.equal(result.report.unassignedTokenCount,2);assert.equal(result.report.attachmentEmbedded,true);assert.equal(events.at(-1).percent,100);
 const document=await PDFDocument.load(result.bytes,{updateMetadata:false});assert.equal(document.getPageCount(),2,'one digital card is rendered per PDF page');
 const marker=document.catalog.get(PDFName.of('TillsynoDigitalDoorCards'));assert(marker?.decodeText);assert.match(marker.decodeText(),/version=1;cards=2/);
 const embedded=attachment(document,exporter.MANIFEST_FILE);assert(embedded,'canonical JSON is attached to the PDF');
 const embeddedManifest=JSON.parse(embedded);assert.equal(embeddedManifest.cards[0].sections[1].rows[0].cells.type,'DC700');
 assert.equal(embeddedManifest.cards[0].unassignedTokens[0].text,'Dörrmagnet 🔒');
 const direct=await exporter.buildPdf(input,{pdfLib:PDFLib,exportedAt:timestamp});assert(direct instanceof Uint8Array);await PDFDocument.load(direct);
 const browserPdf=await browserApi.buildPdf(input,{exportedAt:timestamp});assert(browserPdf.length>3000);await PDFDocument.load(browserPdf);
 await assert.rejects(exporter.buildPdf(input,{pdfLib:PDFLib,requireApproved:true}),/2 dörrkort behöver godkännas/,'a stale approved status with unassigned text cannot bypass review');
 const fullyApproved=fixture();
 fullyApproved.cards[0].unassignedTokens=[];fullyApproved.cards[0].ignoredTokenIds.push('t6','manual-unassigned');
 fullyApproved.cards[0].review={status:'approved',canApprove:true,complete:true,approvedAt:timestamp};
 fullyApproved.cards[1].review={status:'approved',canApprove:true,complete:true,approvedAt:timestamp};
 assert.equal(exporter.isCompleteApproval(fullyApproved.cards[0]),true);
 const approvedBytes=await exporter.buildPdf(fullyApproved,{pdfLib:PDFLib,requireApproved:true});assert(approvedBytes.length>3000);
 const unresolvedConflict=fixture();
 unresolvedConflict.cards=[fullyApproved.cards[0]];unresolvedConflict.cards[0].sourceTokens[0].conflict=true;
 assert.equal(exporter.isCompleteApproval(unresolvedConflict.cards[0]),false,'unresolved PDF/image conflicts cannot bypass export with stale approval flags');
 await assert.rejects(exporter.buildPdf(unresolvedConflict,{pdfLib:PDFLib,requireApproved:true}),/1 dörrkort behöver godkännas/);
 await assert.rejects(exporter.buildPdf([],{pdfLib:PDFLib}),/inga digitala dörrkort/);
 assert.throws(()=>exporter.buildJson({...input,unsupported:undefined}),/inte kan sparas/,'unsupported values cannot disappear silently');
 console.log('PASS digital door-card export: lossless canonical JSON, completeness audit, Swedish WinAnsi fallback, compact searchable vector PDF, one card/page and attached manifest');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
