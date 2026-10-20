'use strict';
// Real PDFLib/Canvas output; verify image reuse, bounded raster lifetimes and readback.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),PDFLib=require(path.join(root,'vendor/pdf-lib.min.js'));
const metadataWriter=require(path.join(root,'smartmatch-read-project-writer-v9-82.js'));
const out=process.env.SMARTMATCH_TEST_OUTPUT||path.join(root,'work','note-export-v9-82');
// Run pdftoppm separately in restricted runtimes, then verify pixel equality.
if(process.argv.includes('--compare-renders')){
 for(let page=1;page<=4;page++){
  const pixels=name=>fs.readFileSync(path.join(out,name+'-'+page+'.png'));
  assert.notDeepEqual(pixels('visible'),pixels('original'),'notes must visibly render at rotation '+((page-1)*90));
  assert.deepEqual(pixels('reexport'),pixels('visible'),'re-export must render identically at rotation '+((page-1)*90));
 }
 console.log('PASS: independent Poppler rendering of all note tools / rotations / shifted CropBoxes; repeat export is pixel-identical.');
 process.exit(0);
}
const source=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-82.js'),'utf8');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','system-ui');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','system-ui');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
const surfaces=[];let encodingFailure=false,fallback=false;
const sandbox={PDFLib,console,Map,Set,Number,Math,JSON,Uint8Array,DRAWING_IS_IOS:true,
 document:{createElement(tag){
  assert.equal(tag,'canvas');const native=createCanvas(1,1);
  const canvas={maxPixels:1,maxSide:1,get width(){return native.width},set width(n){native.width=n;this.maxPixels=Math.max(this.maxPixels,n*native.height);this.maxSide=Math.max(this.maxSide,n)},get height(){return native.height},set height(n){native.height=n;this.maxPixels=Math.max(this.maxPixels,n*native.width);this.maxSide=Math.max(this.maxSide,n)},getContext:type=>native.getContext(type),toDataURL:type=>native.toDataURL(type)};
  if(!fallback)canvas.toBlob=(callback,type)=>encodingFailure?callback(null):native.toBlob(callback,type);
  surfaces.push(canvas);return canvas;
 }},ctx:createCanvas(1,1).getContext('2d')};
vm.createContext(sandbox);
vm.runInContext(extract('function smartProgressDisplayGeometry(','function smartPickProgressPlacement(')+
 extract('const SMART_NOTE_COLORS=','function smartNoteArrowMarker(')+
 extract('function smartNoteScreenSize(','function appendStyledText(')+
 extract('function smartRemoveDrawingNoteStreams(','async function buildPortableProjectPdf('),sandbox);
const flatten=sandbox.smartFlattenDrawingNotes,N=PDFLib.PDFName;
const index=doc=>doc.catalog.lookup(N.of('SmartMatch106NoteStreams'),PDFLib.PDFArray);
const bitmap=createCanvas(120,60);bitmap.getContext('2d').fillRect(5,5,30,30);const imageData=bitmap.toDataURL('image/png');
const imageNote=(id,page=1)=>({id,type:'image',page,rect:[20,20,160,100],dataUrl:imageData});
const textNote=(id,text='Åtgärd: dörren stänger ej')=>({id,type:'text',page:1,x:40,y:300,text,fontSize:18,color:'#d32f2f'});
async function document(){const doc=await PDFLib.PDFDocument.create();const pg=doc.addPage([600,800]);pg.drawText('ORIGINAL VECTOR');return doc;}
function originalRefs(doc){return doc.getPage(0).node.normalizedEntries().Contents.asArray().map(String);}
function assertOriginal(doc,refs){assert(refs.every(ref=>doc.getPage(0).node.normalizedEntries().Contents.asArray().map(String).includes(ref)));}
function assertReleased(){assert(surfaces.every(c=>c.width===1&&c.height===1),'every temporary canvas is released');}
(async()=>{
 // Duplicate image notes on different pages must share one encoded PDF image.
 let doc=await document();doc.addPage([600,800]);const originals=originalRefs(doc),embed=doc.embedPng.bind(doc);let embeds=0;
 doc.embedPng=async data=>{embeds++;return embed(data)};
 await flatten(doc,[imageNote('a'),imageNote('b',2),imageNote('c')]);assert.equal(embeds,1);assert.equal(index(doc).size(),3);assertOriginal(doc,originals);
 let reopened=await PDFLib.PDFDocument.load(await doc.save());assert.equal(index(reopened).size(),3);assertOriginal(reopened,originals);
 // Repeated labels share the PDF image even at different positions. Styles
 // that change the pixels must remain distinct; cache keys contain no PNG data.
 doc=await document();embeds=0;const labelEmbed=doc.embedPng.bind(doc),surfaceCount=surfaces.length;
 doc.embedPng=async data=>{embeds++;assertReleased();return labelEmbed(data)};
 await flatten(doc,[textNote('same-a'),{...textNote('same-b'),x:210,y:510},
  {...textNote('color'),color:'#1565c0'},{...textNote('frame'),frame:'round'},
  {...textNote('font'),fontSize:26},{...textNote('background'),background:'#ffffff'},
  {...textNote('bold'),bold:false}]);
 assert.equal(embeds,6);assert.equal(surfaces.length-surfaceCount,6);assert.equal(index(doc).size(),7);
 assert.equal(index(await PDFLib.PDFDocument.load(await doc.save())).size(),7);
 // Browser Blob path releases raster pixels before PNG decoding/embedding.
 doc=await document();let inputTypes=[];const embedText=doc.embedPng.bind(doc);
 doc.embedPng=async data=>{assertReleased();inputTypes.push(typeof data);return embedText(data)};
 const notes=[textNote('sv'),{...textNote('callout','Kontrollera låset'),type:'callout',x1:40,y1:100,x2:180,y2:170},textNote('large',Array(5).fill('Å'.repeat(160)).join('\n'))];
 const progress=[];await flatten(doc,notes,async(...args)=>progress.push(args));
 assert.deepEqual(inputTypes,['object','object','object']);assert.equal(index(doc).size(),3);assertReleased();
 assert(surfaces.every(c=>c.maxPixels<=1000000&&c.maxSide<=2048),'iOS text surface stays within 1M pixels / 2048 per side');
 assert.deepEqual(progress.map(p=>p[0]),[47,48,49,50]);assert.match(progress[1][2],/2 av 3/);
 reopened=await PDFLib.PDFDocument.load(await doc.save());assert.equal(index(reopened).size(),3);
 // Re-export replaces indexed note streams, retaining the original drawing.
 const before=originalRefs(reopened).filter(ref=>!index(reopened).asArray().map(pair=>String(reopened.context.lookup(pair).get(1))).includes(ref));
 await flatten(reopened,[textNote('changed','Ny svensk text')]);assert.equal(index(reopened).size(),1);assertOriginal(reopened,before);
 // Canvas-runtime fallback also releases pixels before decoding.
 fallback=true;doc=await document();let fallbackInput;const fallbackEmbed=doc.embedPng.bind(doc);doc.embedPng=async data=>{assertReleased();fallbackInput=data;return fallbackEmbed(data)};
 await flatten(doc,[textNote('fallback')]);assert.equal(typeof fallbackInput,'string');fallback=false;assertReleased();
 // Both encoder failures and PNG decoder failures leave no raster surface alive.
 encodingFailure=true;await assert.rejects(()=>flatten(doc,[textNote('encoder')]),/Textnoteringen kunde inte skapas/);encodingFailure=false;assertReleased();
 doc.embedPng=async()=>{assertReleased();throw Error('decode failed')};await assert.rejects(()=>flatten(doc,[textNote('decode')]),/decode failed/);assertReleased();
 // A cancellation between real notes must stop before decoding the next one.
 doc=await document();embeds=0;const cancelEmbed=doc.embedPng.bind(doc);doc.embedPng=async data=>{embeds++;return cancelEmbed(data)};
 await assert.rejects(()=>flatten(doc,[imageNote('first'),{...imageNote('second'),dataUrl:'invalid'}],async(percent,title,detail)=>{if(/2 av 2/.test(detail))throw Error('cancelled')}),/cancelled/);assert.equal(embeds,1);
 // Independently render all four tools at all rotations / shifted CropBoxes.
 const rotated=await PDFLib.PDFDocument.create(),rotatedNotes=[],geometry=sandbox.smartProgressDisplayGeometry;
 for(const [i,turn]of [0,90,180,270].entries()){
  const pg=rotated.addPage([620,820]);pg.setRotation(PDFLib.degrees(turn));pg.setCropBox(20,30,580,760);pg.drawText('ORIGINAL VECTOR '+turn,{x:40,y:55,size:12});
  const g=geometry(pg),p=g.toPdf(70,90),a=g.toPdf(70,210),b=g.toPdf(230,210),tip=g.toPdf(70,330),label=g.toPdf(230,300),r1=g.toPdf(70,390),r2=g.toPdf(230,490);
  rotatedNotes.push({...textNote('text-'+i,'Åtgärd behövs\nDörren stänger ej'),page:i+1,x:p.x,y:p.y,frame:'round',background:'#ffffff'},
   {id:'arrow-'+i,type:'arrow',page:i+1,x1:a.x,y1:a.y,x2:b.x,y2:b.y,color:'#1565c0',lineWidth:3},
   {...textNote('callout-'+i,'Kontrollera låset'),page:i+1,type:'callout',x1:tip.x,y1:tip.y,x2:label.x,y2:label.y},
   {...imageNote('photo-'+i,i+1),rect:[Math.min(r1.x,r2.x),Math.min(r1.y,r2.y),Math.max(r1.x,r2.x),Math.max(r1.y,r2.y)]});
 }
 fs.mkdirSync(out,{recursive:true});
 const saveFixture=async(document,name)=>fs.writeFileSync(path.join(out,name+'.pdf'),await document.save());
 await saveFixture(rotated,'original');await flatten(rotated,rotatedNotes);assert.equal(index(rotated).size(),16);await saveFixture(rotated,'visible');
 const reexported=await PDFLib.PDFDocument.load(await rotated.save());await flatten(reexported,rotatedNotes);assert.equal(index(reexported).size(),16);await saveFixture(reexported,'reexport');
 // Exercise real build + strict metadata/note-layer verification, including repeated save.
 const baseline=await (await document()).save();
 Object.assign(sandbox,{bytes:baseline,pdf:{numPages:1},window:{SmartMatchReadProjectWriterV982:metadataWriter,SmartMatchReadTest:{canOpenSavedProject:()=>true},SmartMatchReadProjectV97:{read(doc){return {payload:JSON.parse(doc.catalog.get(N.of('TillsynoSmartMatchV36Data')).decodeText())}}}},appendCompactProjectPdf:async doc=>{
  doc.catalog.set(N.of('SmartMatch36ProgressStreams'),doc.context.obj([]));
  doc.catalog.set(N.of('SmartMatch21OriginalPages'),PDFLib.PDFNumber.of(doc.getPageCount()));
  for(const key of ['SmartMatch23ExtraPages','SmartMatch21ExtraPages','SmartMatch18ExtraPages','SmartMatch17ExtraPages'])
   doc.catalog.set(N.of(key),PDFLib.PDFNumber.of(0));
 }});
 vm.runInContext(extract('function smartCompactPruneUnreachablePdfObjects(','/* v35: PDF outline')+
 extract('async function buildPortableProjectPdf(','function downloadProjectFile('),sandbox);
 const payload={drawingNotes:[imageNote('one'),imageNote('two'),textNote('unicode')],automationItems:[],instances:{},projectRevision:1,readTestData:{}};
 const first=await sandbox.buildPortableProjectPdf(payload);await sandbox.verifyPortableProjectPdf(first,payload);
 sandbox.bytes=first;const second=await sandbox.buildPortableProjectPdf(payload);await sandbox.verifyPortableProjectPdf(second,payload);
 assert(second.length<first.length*1.15,'repeated export does not accumulate replaced image data');
 const wrong={...payload,projectRevision:2};await assert.rejects(()=>sandbox.verifyPortableProjectPdf(second,wrong),/Alla projektändringar/);
 // An interrupted metadata rewrite affects only the private export document.
 // The open source bytes and the last complete metadata remain recoverable.
 const sourceCopy=Buffer.from(sandbox.bytes);
 sandbox.window.SmartMatchReadProjectWriterV982={create:async()=>{throw Error('metadata cancelled')}};
 await assert.rejects(()=>sandbox.buildPortableProjectPdf(payload),/metadata cancelled/);
 assert.deepEqual(Buffer.from(sandbox.bytes),sourceCopy);
 const intactSource=await PDFLib.PDFDocument.load(sandbox.bytes);
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])
  assert.deepEqual(JSON.parse(intactSource.catalog.get(N.of(key)).decodeText()),payload,'previous metadata survives a cancelled rewrite');
 console.log('PASS: repeated-image reuse, real PNG/PDF readback, Swedish text/callout raster, bounded iOS canvas, Blob/fallback lifetime, encode/decode failure cleanup, per-note progress/cancellation, original vector preservation, strict full export and repeated save. All-tools/rotations/CropBoxes fixtures: '+out);
})().catch(error=>{console.error(error);process.exitCode=1});

