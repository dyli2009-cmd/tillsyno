const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('smartmatch-da-v36-89-module.js','utf8');
const PDFLib=require(fs.existsSync('vendor/pdf-lib.min.js')?'../vendor/pdf-lib.min.js':'./pdf-lib-runtime.cjs');
function fn(name){const start=source.indexOf('function '+name+'(');return source.slice(start,source.indexOf('\n }',start)+3)}
const models=[['24','ED100'],['37','ED250']];
let raw;
const api={getOriginalPdfBytes:()=>raw,getDrawingLimit:()=>20};
const ctx=vm.createContext({console,PDFLib,window:{PDFLib},ctx:()=>api,normalize:s=>String(s||'').toUpperCase().replace(/[–—]/g,'-').replace(/\s+/g,'')});
vm.runInContext(fn('parseCandidateId')+'\nasync '+fn('annotationCandidates'),ctx);
(async()=>{
 const doc=await PDFLib.PDFDocument.create(),page=doc.addPage();
 const {PDFName,PDFString}=PDFLib;
 page.node.set(PDFName.of('Annots'),doc.context.obj([
  doc.context.register(doc.context.obj({Subtype:PDFName.of('FreeText'),Rect:[10,10,100,30],Contents:PDFString.of('Dorrautomatik'),Subj:PDFString.of('200154-28-37-2')})),
  doc.context.register(doc.context.obj({Subtype:PDFName.of('FreeText'),Rect:[10,60,100,80],Contents:PDFString.of('200154-28-24-1'),Subj:PDFString.of('200154-28-24-1')}))
 ]));
 raw=await doc.save();
 const hits=await ctx.annotationCandidates('200154-28',new Set(),models);
 assert.equal(hits.length,2,'subject ID is found despite generic contents; duplicate fields count once');
 assert.deepEqual(Array.from(hits,h=>h.modelCode).sort(),['24','37'],'model is read independently for each marking');
 assert.equal((await ctx.annotationCandidates('200154',new Set(),models)).length,0,'object prefix must match completely');
 assert.equal((await ctx.annotationCandidates('200154-28',new Set([1]),models)).length,0,'door-card pages are excluded');
 if(process.argv[2]){
  raw=new Uint8Array(fs.readFileSync(process.argv[2]));
  const real=await ctx.annotationCandidates('200154-28',new Set(Array.from({length:15},(_,i)=>i+11)),models);
  assert.equal(real.length,17,'17 real Snidaren annotation IDs');
 }
 console.log('Object-only search and per-marking machine type checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
