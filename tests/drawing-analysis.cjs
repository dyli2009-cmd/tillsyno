const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto');
const lib=require('../vendor/pdf-lib.min.js'),analysis=require('../drawing-analysis.js'),drawing=require('../drawing-pdf.js');
const {PDFDocument,PDFName:N,PDFString:S,PDFArray,PDFDict,PDFStream,StandardFonts,degrees}=lib;
const hash=b=>createHash('sha256').update(b).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/RsAAAAASUVORK5CYII=','base64');
async function fixture(mb=1){
 const seed=await PDFDocument.create(),font=await seed.embedFont(StandardFonts.Helvetica),p=seed.addPage([500,380]);
 p.drawText('Beslagskod GS23',{x:40,y:310,size:17,font});p.drawText('Product A - ED100',{x:40,y:270,size:12,font});
 p.node.set(N.of('Annots'),seed.context.obj([seed.context.register(seed.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[35,300,210,330],Subj:S.of('GS23'),Contents:S.of('GS23'),F:2}))]));
 const seedBytes=await seed.save(),doc=await PDFDocument.create(),copied=await doc.copyPages(await PDFDocument.load(seedBytes),[0,0,0,0,0]);copied.forEach(p=>doc.addPage(p));
 // copyPages shares the copied content array. Give this edited page its own
 // array so the fixture really has different products on just this page.
 const variant=doc.getPage(2);variant.node.set(N.of('Contents'),doc.context.obj(variant.node.Contents().asArray().slice()));
 variant.drawText('Product B - different assembly',{x:40,y:230,size:12});
 doc.getPage(3).node.set(N.of('Annots'),doc.context.obj([doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[35,300,210,330],Subj:S.of('GS24'),Contents:S.of('GS24'),F:2}))]));
 doc.getPage(4).setRotation(degrees(90));
 for(let i=0;i<2;i++){const image=await doc.embedPng(png),p=doc.addPage([500,380]);p.drawImage(image,{x:20,y:20,width:100,height:100});p.drawText('Image page '+(i+1),{x:40,y:310,size:15});}
 const last=doc.addPage([500,380]);last.drawText('Visible door GS99',{x:40,y:310,size:15});last.drawText('Hidden searchable GS99',{x:40,y:270,size:12,opacity:0});
 const field=doc.getForm().createTextField('test-door');field.setText('GS99');field.addToPage(last,{x:40,y:40,width:120,height:24});
 const layer=doc.context.register(doc.context.obj({Type:'OCG',Name:S.of('Hidden engineering layer')}));
 doc.catalog.set(N.of('OCProperties'),doc.context.obj({OCGs:[layer],D:{OFF:[layer],Order:[layer]}}));
 await doc.attach(Buffer.from('Keep this attachment'),'notes.txt',{mimeType:'text/plain'});
 doc.catalog.set(N.of('TillsynoSmartMatchV36Data'),doc.context.register(doc.context.flateStream(JSON.stringify({code:'GS23',rect:[35,300,210,330],checked:true}))));
 const garbage=new Uint8Array(Math.floor(mb*1048576));let n=17;for(let i=0;i<garbage.length;i++){n^=n<<13;n^=n>>>17;n^=n<<5;garbage[i]=n&255;}
 doc.context.register(doc.context.stream(garbage,{Type:'XObject',Subtype:'Image',Width:1024,Height:Math.max(1,Math.ceil(garbage.length/3072)),ColorSpace:'DeviceRGB',BitsPerComponent:8}));
 return doc.save({useObjectStreams:false});
}
async function metadata(bytes){
 const doc=await PDFDocument.load(bytes,{updateMetadata:false});
 return {pages:doc.getPageCount(),stamps:doc.getPages().map(p=>(p.node.lookupMaybe(N.of('Annots'),PDFArray)?.asArray()||[]).map(ref=>{const a=doc.context.lookup(ref);return ['Subtype','Subj','Contents','Rect','F'].map(k=>a.get(N.of(k))?.toString());})),field:doc.getForm().getTextField('test-door').getText(),attachment:doc.catalog.lookup(N.of('Names'),PDFDict).has(N.of('EmbeddedFiles')),layers:doc.catalog.lookup(N.of('OCProperties'),PDFDict).toString(),project:lib.decodePDFRawStream(doc.catalog.lookup(N.of('TillsynoSmartMatchV36Data'),lib.PDFRawStream)).decode().toString()};
}
async function run(){
 const qa=process.env.DRAWING_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-analysis-'));fs.mkdirSync(qa,{recursive:true});
 const bytes=await fixture(Number(process.env.DRAWING_ANALYSIS_STRESS_MB||1)),before=hash(bytes);fs.writeFileSync(path.join(qa,'source.pdf'),bytes);
 const progress=[],r=await analysis.analyze(bytes,{onProgress:v=>progress.push(v)});
 assert.equal(r.totalPages,8);assert.deepEqual(r.duplicatePages,[[1,2]],'same header with changed products, stamp identity or rotation is not a full duplicate');
 assert(r.stats.unusedBytes>=1048576*Number(process.env.DRAWING_ANALYSIS_STRESS_MB||1));assert(r.images.extraCopies>=1);assert.equal(r.layers.total,1);assert.equal(r.layers.off,1);assert(r.hiddenAnnotations>=5);assert.equal(r.widgets,1);
 assert.equal(progress.filter(x=>x.phase==='pages').length,8,'every page is inspected');assert.equal(hash(bytes),before,'analysis is read-only');
 const cleaned=await drawing.optimize(bytes,{deduplicateImages:true});assert(cleaned.verified);assert(cleaned.cleanup.imagesMerged>=1);assert(cleaned.cleanup.unusedObjects>=1);assert(cleaned.bytes.length<bytes.length);
 fs.writeFileSync(path.join(qa,'cleaned.pdf'),cleaned.bytes);assert.deepEqual(await metadata(cleaned.bytes),await metadata(bytes),'hidden stamps, editable form, layers, attachments and SmartMatch project metadata survive');
 assert.equal(hash(bytes),before,'cleanup leaves input bytes unchanged');
 const cr=await analysis.analyze(cleaned.bytes);assert.equal(cr.images.extraCopies,0);assert.equal(cr.stats.unusedObjects,0);assert.deepEqual(cr.duplicatePages,[[1,2]]);
 const removed=await drawing.optimize(bytes,{pages:[0,2,3,4,5,6,7],deduplicateImages:true});assert(removed.verified);assert.equal((await PDFDocument.load(removed.bytes)).getPageCount(),7);fs.writeFileSync(path.join(qa,'removed.pdf'),removed.bytes);
 const subset=await analysis.analyze(bytes,{pages:[0,2,3,4,5,6,7]});assert.equal(subset.selectedPages,7);assert.deepEqual(subset.duplicatePages,[]);
 let stopped=false;await assert.rejects(analysis.analyze(bytes,{cancelled:()=>stopped,onProgress:v=>{if(v.phase==='pages')stopped=true;}}),e=>e.name==='AbortError');assert.equal(hash(bytes),before);
 const signed=await PDFDocument.load(bytes),sig=signed.context.register(signed.context.obj({Type:'Sig',ByteRange:[0,20,30,40]}));signed.catalog.set(N.of('Perms'),signed.context.obj({DocMDP:sig}));const sb=await signed.save();
 assert((await analysis.analyze(sb)).signed);assert.equal(hash((await drawing.optimize(sb,{deduplicateImages:true})).bytes),hash(sb));await assert.rejects(drawing.optimize(sb,{pages:[0],deduplicateImages:true}),/signerad/);
 console.log(JSON.stringify({qa,sourceBytes:bytes.length,cleanedBytes:cleaned.bytes.length,duplicates:r.duplicatePages,cleanup:cleaned.cleanup}));
 console.log('PASS full-file analysis: real PDF bytes, distinct products/stamp metadata/rotation, safe image reuse, hidden searchable text, form, attachment, layer, project data, reviewed page removal, cancellation and signed document');
}
module.exports={fixture,metadata};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
