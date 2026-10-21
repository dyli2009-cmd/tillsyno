'use strict';
// Real PDF rendering and the installed Tesseract engine, including mixed text/image stamps.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
global.DOMMatrix=canvas.DOMMatrix;global.Path2D=canvas.Path2D;
const factory={create(w,h){const c=canvas.createCanvas(w,h);return {canvas:c,context:c.getContext('2d')};},reset(t,w,h){t.canvas.width=w;t.canvas.height=h;},destroy(t){t.canvas.width=t.canvas.height=0;t.canvas=t.context=null;}};
const pdfjs=require('../vendor/pdf.min.js');pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const sandbox={window:{pdfjsLib:pdfjs},document:{createElement:()=>canvas.createCanvas(1,1)},setTimeout,clearTimeout,setInterval,clearInterval};
const matcher=process.env.SMARTMATCH_MATCHER||'smartmatch-read-match-v9-92.js';
for(const file of ['smartmatch-read-step-v9-88.js','smartmatch-read-appearance-v9-86.js',matcher])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
let calls=0,mode=6;
const worker={async setParameters(p){mode=Number(p.tessedit_pageseg_mode);}};
async function recognize(_,bitmap){
 calls++;
 const input=path.join(__dirname,'../work/stamp-ocr-input.png');fs.writeFileSync(input,bitmap.toBuffer('image/png'));
 const result=spawnSync('tesseract',[input,'stdout','-l','eng','--psm',String(mode),'tsv'],{encoding:'buffer',maxBuffer:8*1024*1024,timeout:15000,env:{...process.env,OMP_THREAD_LIMIT:'1'}});
 assert.equal(result.status,0,result.stderr?.toString());
 const words=result.stdout.toString().trim().split('\n').slice(1).map(line=>line.split('\t')).filter(row=>row[0]==='5'&&row[11]?.trim()).map(row=>({text:row.slice(11).join('\t'),confidence:Number(row[10]),bbox:{x0:Number(row[6]),y0:Number(row[7]),x1:Number(row[6])+Number(row[8]),y1:Number(row[7])+Number(row[9])}}));
 if(process.env.OCR_DEBUG)console.log('OCR',mode,words.map(w=>[w.text,w.confidence]));
 return {data:{words}};
}
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),page=doc.addPage([1000,700]);
 async function stamp(text,x,y,color,partial=true){
  const bitmap=canvas.createCanvas(320,180),ctx=bitmap.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,320,180);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(160,90,150,78,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='black';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,160,108);
  const png=await doc.embedPng(bitmap.toBuffer('image/png'));page.drawImage(png,{x,y,width:160,height:90});
  if(partial)page.drawText('DV',{x:x+65,y:y+40,size:12,font,opacity:0});
 }
 await stamp('DVEL',80,520,'#ffe600');await stamp('DVEL',340,520,'#ffe600');await stamp('DVEL',600,520,'#7dc9ff',false);
 await stamp('DVEL1',80,290,'#ffe600');await stamp('DVEI',340,290,'#ffe600');
 page.drawText('DVEL',{x:600,y:330,font,size:18});
 doc.addPage([500,700]).drawText('Beslagskod: DVEL',{x:40,y:600,font,size:18});
 const pdf=await pdfjs.getDocument({data:await doc.save(),canvasFactory:factory,disableFontFace:true,useSystemFonts:false,standardFontDataUrl:process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/pdfjs-dist/standard_fonts/'}).promise;
 const options={pdf,cardPages:[2],codes:['DVEL'],codeOnly:true,imageMode:'full',getWorker:async()=>worker,recognize,imageLimits:{minScale:1,maxScale:1,baseScale:1,tileSize:1100,tileStep:1100}};
 try{
  const native=await sandbox.window.SmartMatchReadMatcher.scan({...options,imageMode:'text',getWorker:()=>{throw Error('Fast mode must not OCR');}});
  assert.equal(calls,0);assert.equal(native.hits.length,1,'only the plain PDF label is readable without OCR');
  await assert.rejects(sandbox.window.SmartMatchReadMatcher.scan({...options,imageMode:'text',sample:{page:1,rect:{x:.59,y:.49,w:.12,h:.08},code:'DVEL',learnAppearance:true}}),/bakgrund och form/,'unrecognisable background must not silently broaden the sample search');
  assert.equal(calls,0);
  const all=await sandbox.window.SmartMatchReadMatcher.scan(options);
  assert.equal(all.hits.filter(h=>h.stampVerified).length,3,'two mixed stamps plus one image-only stamp; suffix and lookalike rejected');
  const selected=await sandbox.window.SmartMatchReadMatcher.scan({...options,sample:{page:1,rect:{x:.075,y:80/700,w:.17,h:100/700},code:'DVEL',learnAppearance:true}});
  assert.equal(selected.hits.length,2,'marked yellow oval selects both yellow DVEL stamps; blue/plain/other IDs excluded');
  assert(selected.hits.every(h=>h.stampVerified));
  console.log('PASS real Tesseract + PDF.js: incomplete native text retries whole stamps, three DVEL stamps found, DVEL1/DVEI excluded, marked yellow example finds exactly two, text mode starts no OCR ('+calls+' OCR calls)');
 }finally{await pdf.destroy();}
})().catch(error=>{console.error(error);process.exitCode=1;});
