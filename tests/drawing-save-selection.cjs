/* Save selected pages without requiring the optional full-content comparison. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto');
const lib=require('../vendor/pdf-lib.min.js'),drawing=require('../drawing-pdf.js'),analysis=require('../drawing-analysis.js');
const {PDFDocument,PDFName:N,PDFString:S,PDFDict,PDFArray,PDFRawStream,StandardFonts,decodePDFRawStream}=lib;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const load=bytes=>PDFDocument.load(bytes,{updateMetadata:false});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/RsAAAAASUVORK5CYII=','base64');
const limitMessage='Sidan har för många korsreferenser för en säker jämförelse.';

async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),image=await doc.embedPng(png);
 doc.setTitle('Selected pages with shared PDF resources');
 for(let n=0;n<3;n++){
  const page=doc.addPage([600,400]);
  page.drawText('Door card '+(n+1)+' - GS'+(n+1),{x:40,y:330,size:18,font});
  page.drawLine({start:{x:40,y:300},end:{x:540,y:300},thickness:.25});
  page.drawImage(image,{x:40,y:210,width:80,height:80});
 }
 const first=doc.getPage(0),stamp=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[35,320,260,355],Subj:S.of('GS1'),Contents:S.of('Keep this stamp'),F:4}));
 first.node.set(N.of('Annots'),doc.context.obj([stamp]));
 const field=doc.getForm().createTextField('door');field.setText('GS1 checked');field.addToPage(first,{x:40,y:40,width:140,height:24});
 await doc.attach(Buffer.from('Keep this attachment'),'notes.txt',{mimeType:'text/plain'});
 const layer=doc.context.register(doc.context.obj({Type:'OCG',Name:S.of('Engineering layer')}));
 doc.catalog.set(N.of('OCProperties'),doc.context.obj({OCGs:[layer],D:{OFF:[layer],Order:[layer]}}));
 doc.catalog.set(N.of('TillsynoSmartMatchV36Data'),doc.context.register(doc.context.flateStream(JSON.stringify({code:'GS1',checked:true,position:[35,320]}))));
 // A small valid graph can exceed the comparison's expanded-node budget:
 // the same 600 scalars are reached 501 times. This is deliberately not a
 // 250 MB stress fixture, a cycle, or a reason to raise the safety limit.
 const shared=doc.context.register(doc.context.obj(Array.from({length:600},(_,i)=>i)));
 const fanout=doc.context.register(doc.context.obj(Array.from({length:501},()=>shared)));
 first.node.Resources().set(N.of('ComparisonFanout'),fanout);
 return doc.save({useObjectStreams:false});
}

function streamContents(doc,page){
 const content=page.node.Contents(),streams=content instanceof PDFArray?content.asArray():[content];
 return streams.filter(Boolean).map(ref=>Buffer.from(decodePDFRawStream(doc.context.lookup(ref)).decode()).toString('base64'));
}
function pageState(doc,page){
 const images=page.node.Resources().lookupMaybe(N.of('XObject'),PDFDict);
 return {
  size:page.getSize(),contents:streamContents(doc,page),
  font:page.node.Resources().has(N.of('Font')),
  images:(images?.values()||[]).map(ref=>{const obj=doc.context.lookup(ref);return {dictionary:obj.dict.toString(),bytes:Buffer.from(obj.getContents()).toString('base64')};}),
  annotations:(page.node.lookupMaybe(N.of('Annots'),PDFArray)?.asArray()||[]).map(ref=>{const obj=doc.context.lookup(ref);return ['Subtype','Subj','Contents','Rect','F'].map(k=>obj.get(N.of(k))?.toString()||null);})
 };
}
async function metadata(bytes){
 const doc=await load(bytes),files=doc.catalog.lookup(N.of('Names'),PDFDict).lookup(N.of('EmbeddedFiles'),PDFDict).lookup(N.of('Names'),PDFArray);
 const attachment=doc.context.lookup(files.get(1)).lookup(N.of('EF'),PDFDict).lookup(N.of('F'),PDFRawStream);
 return {
  title:doc.getTitle(),pages:doc.getPages().map(p=>pageState(doc,p)),field:doc.getForm().getTextField('door').getText(),
  attachment:Buffer.from(decodePDFRawStream(attachment).decode()).toString('base64'),
  layer:doc.catalog.lookup(N.of('OCProperties'),PDFDict).toString(),
  project:Buffer.from(decodePDFRawStream(doc.catalog.lookup(N.of('TillsynoSmartMatchV36Data'),PDFRawStream)).decode()).toString('base64')
 };
}

async function run(){
 const qa=process.env.DRAWING_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-save-selection-'));
 fs.mkdirSync(qa,{recursive:true});
 const bytes=await fixture(),sourceHash=hash(bytes),before=await metadata(bytes);
 fs.writeFileSync(path.join(qa,'source.pdf'),bytes);
 const report=await analysis.analyze(bytes);
 assert.deepEqual(report.unresolved,[{page:1,message:limitMessage}],'analysis identifies the real cross-reference comparison limit');
 await assert.rejects(drawing.optimize(bytes,{pages:[0,2],deduplicateImages:true}),error=>error.message===limitMessage,'optional strict cleanup keeps its comparison safety guard');
 const progress=[],saved=await drawing.optimize(bytes,{pages:[0,2],deduplicateImages:false,onProgress:state=>progress.push(state.message)});
 assert.equal(saved.original,false,'a requested page removal cannot silently return the original');
 assert.equal(saved.pageCount,2);assert.equal(saved.verified,false,'ordinary saving does not claim a strict comparison');
 assert.equal(saved.cleanup,undefined);assert(!progress.some(text=>/Kontrollerar|Verifierar|Återanvänder/.test(text)),'ordinary saving skips the strict snapshot and image deduplication');
 assert.deepEqual(await metadata(saved.bytes),{...before,pages:[before.pages[0],before.pages[2]]},'selected pages retain vector streams, full image bytes, stamps, editable form, attachment, layers and project metadata');
 const output=await load(saved.bytes),resources=output.getPage(0).node.Resources(),fanout=resources.lookup(N.of('ComparisonFanout'),PDFArray);
 assert.equal(fanout.size(),501);assert.equal(output.context.lookup(fanout.get(0)).size(),600,'shared PDF resources are preserved rather than flattened or removed');
 assert.equal(hash(bytes),sourceHash,'saving and rejected comparison never change the original bytes');
 fs.writeFileSync(path.join(qa,'selected-pages.pdf'),saved.bytes);
 for(const pages of [[],[2,0],[0,0],[3],[-1],[.5]])await assert.rejects(drawing.optimize(bytes,{pages,deduplicateImages:false}),/Sidvalet är ogiltigt/);
 await assert.rejects(drawing.optimize(bytes,{pages:[0,2],deduplicateImages:false,cancelled:()=>true}),error=>error.name==='AbortError');
 let stopped=false;
 await assert.rejects(drawing.optimize(bytes,{pages:[0,2],deduplicateImages:false,cancelled:()=>stopped,onProgress:()=>{stopped=true;}}),error=>error.name==='AbortError');
 assert.equal(hash(bytes),sourceHash,'cancellation leaves the source untouched');
 const signed=await load(bytes),signature=signed.context.register(signed.context.obj({Type:'Sig',ByteRange:[0,20,30,40]}));
 signed.catalog.set(N.of('Perms'),signed.context.obj({DocMDP:signature}));const signedBytes=await signed.save();
 assert.equal(hash((await drawing.optimize(signedBytes,{deduplicateImages:false})).bytes),hash(signedBytes),'unchanged signed files keep the original signature bytes');
 await assert.rejects(drawing.optimize(signedBytes,{pages:[0,2],deduplicateImages:false}),/digitalt signerad/,'ordinary saving cannot bypass signature edit protection');
 console.log('PASS ordinary selected-page saving bypasses only optional comparison; strict limit, vector/image/stamp/form/catalog data, cancellation and signature/selection protections are preserved');
 console.log('QA files: '+qa);
}
module.exports={fixture,metadata,limitMessage};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
