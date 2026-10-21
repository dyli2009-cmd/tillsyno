'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PDFDocument,StandardFonts}=require('../vendor/pdf-lib.min.js');
const canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
global.DOMMatrix=canvas.DOMMatrix;global.Path2D=canvas.Path2D;
const canvasFactory={create(w,h){const c=canvas.createCanvas(w,h);return {canvas:c,context:c.getContext('2d')};},reset(target,w,h){target.canvas.width=w;target.canvas.height=h;},destroy(target){target.canvas.width=target.canvas.height=0;target.canvas=null;target.context=null;}};
const pdfjs=require('../vendor/pdf.min.js');pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const sandbox={window:{},setTimeout,clearTimeout,setInterval,clearInterval,Uint8Array,Uint8ClampedArray,Int32Array,document:{createElement:()=>canvas.createCanvas(1,1)}};
for(const file of ['smartmatch-read-step-v9-88.js','smartmatch-read-appearance-v9-86.js','smartmatch-read-match-v9-88.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 for(const labels of [['GS31','GS31','GS310'],['GS31','GS31A','SGS31'],['GS32'],['GS31'],['GS31']]){
  const page=doc.addPage([400,400]);labels.forEach((text,i)=>page.drawText(text,{x:40,y:350-i*60,size:14,font}));
 }
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await doc.save()),canvasFactory,disableFontFace:true,useSystemFonts:false,standardFontDataUrl:process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/pdfjs-dist/standard_fonts/'}).promise;
 const result=await sandbox.window.SmartMatchReadMatcher.scan({pdf,codes:['GS31'],cardPages:[4,5],scanPages:[1,2,3],codeOnly:true,imageMode:'text'});
 assert.deepEqual(Array.from(result.hits,h=>h.page),[1,1,2]);assert(result.hits.every(h=>h.code==='GS31'));assert.deepEqual(Array.from(result.pages,p=>p.page),[1,2,3]);
 await pdf.destroy();console.log('PASS actual PDF scan: all three drawing pages, GS31 exact, GS310/GS31A/SGS31 rejected, door-card pages excluded');
})().catch(error=>{console.error(error);process.exitCode=1;});
