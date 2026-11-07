'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const lib=require('../vendor/pdf-lib.min.js'),{PDFDocument,StandardFonts,PDFName,PDFString,rgb}=lib;
const canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');global.DOMMatrix=canvas.DOMMatrix;global.Path2D=canvas.Path2D;
const pdfjs=require('../vendor/pdf.min.js');pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const canvasFactory={create(w,h){const c=canvas.createCanvas(w,h);return {canvas:c,context:c.getContext('2d')};},reset(t,w,h){t.canvas.width=w;t.canvas.height=h;},destroy(t){t.canvas.width=t.canvas.height=0;t.canvas=t.context=null;}};
const sandbox={window:{PDFLib:lib,pdfjsLib:pdfjs},document:{createElement:()=>canvas.createCanvas(1,1)},setTimeout,clearTimeout,setInterval,clearInterval};
for(const file of ['smartmatch-read-step-v9-88.js','smartmatch-read-appearance-v9-86.js','smartmatch-read-match-v9-93.js','smartmatch-read-stamps-v9-93.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
const api=sandbox.window.SmartMatchReadStamps,matcher=sandbox.window.SmartMatchReadMatcher;
const normalise=x=>JSON.parse(JSON.stringify(x));
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([1000,700]);
 function stamp(lines,subject,x,y,{contents='',flags=4,state=false,noise=false}={}){
  const ap=doc.addPage([150,100]);ap.drawEllipse({x:75,y:50,xScale:65,yScale:42,color:rgb(1,.9,0)});
  lines.forEach((text,i)=>ap.drawText(text,{x:75-font.widthOfTextAtSize(text,18)/2,y:56-i*24,font,size:18}));
  const form=doc.context.flateStream(ap.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',BBox:[0,0,150,100],Resources:ap.node.Resources()}),ref=doc.context.register(form);doc.removePage(doc.getPageCount()-1);
  const dict=doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFString.of(subject),Contents:PDFString.of(contents),Rect:[x,y,x+150,y+100],F:flags,AP:state?{N:{On:ref}}:{N:ref},...(state?{AS:PDFName.of('On')}:{})});plan.node.addAnnot(doc.context.register(dict));
  if(noise)plan.drawText('ROOM 14 AREA 23.8',{x:x+15,y:y+30,font,size:8});
 }
 stamp(['DBL'],'Reader description',30,520,{noise:true});stamp(['DBL'],'Different description',250,520);
 stamp(['DBL','ÅI'],'Reader with return',470,520,{state:true});stamp(['WC','DS'],'Toilet with closer',690,520,{noise:true});
 stamp(['DBL','DS ÅI'],'Reader closer return',30,300);stamp(['DBL','DS'],'Reader closer',250,300);
 stamp(['DBL 2'],'DBL 2',470,300);stamp(['GS1'],'GS1',690,300,{contents:'GS2'});
 stamp(['GS10'],'Unknown long ID',30,100);stamp(['DBL','b-upps'],'Reader fire hold',250,100);
 stamp(['DBL'],'Hidden reader',470,100,{flags:2});
 plan.drawText('R842',{x:800,y:230,font,size:14});plan.drawText('WC',{x:800,y:210,font,size:14});plan.drawText('12,7 m²',{x:800,y:190,font,size:12});
 plan.drawText('DBL',{x:800,y:50,font,size:18});
 doc.addPage([500,700]).drawText('Beslagskod: DBL',{x:40,y:600,font,size:18});
 return doc;
}
(async()=>{
 const doc=await PDFDocument.load(await(await fixture()).save(),{updateMetadata:false}),before=doc.context.enumerateIndirectObjects().length,index=api.readDocument(doc),codes=['DBL','DBLÅI','DBLDS','DBLDSÅI','WC','WCDS','DBL2','DBLBUPPST','GS1','GS2'];
 let loads=0,destroyed=0;
 const engine={getDocument(options){loads++;const task=pdfjs.getDocument({...options,standardFontDataUrl:process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/pdfjs-dist/standard_fonts/'});return {promise:task.promise.then(pdf=>new Proxy(pdf,{get(target,property){if(property==='destroy')return async()=>{destroyed++;return target.destroy();};const v=target[property];return typeof v==='function'?v.bind(target):v;}})),destroy:()=>task.destroy()};}};
 const enriched=await api.readAppearances({doc,index,codes,library:lib,pdfjs:engine});
 assert.equal(doc.context.enumerateIndirectObjects().length,before,'reading appearances never mutates the source PDF');assert.equal(loads,destroyed,'temporary PDF disposed');
 assert.equal(enriched.find(a=>a.subject==='Reader with return').appearanceText,'DBL ÅI');assert.equal(enriched.find(a=>a.subject==='Reader fire hold').appearanceText,'DBL b-upps');
 assert(!enriched.find(a=>a.subject==='Hidden reader').appearanceStatus,'hidden stamp never read');assert(!enriched.find(a=>a.subject==='DBL 2').appearanceStatus,'exact metadata reused');
 const again=await api.readAppearances({doc,index:enriched,codes,library:lib,pdfjs:engine});assert.deepEqual(normalise(again),normalise(enriched));assert.equal(loads,1,'same appearance cache reused');
 const pdf=await pdfjs.getDocument({data:await doc.save(),canvasFactory,disableFontFace:true,useSystemFonts:false,standardFontDataUrl:process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/pdfjs-dist/standard_fonts/'}).promise;
 try{
  const result=await matcher.scan({pdf,annotationIndex:enriched,codes,cardPages:[2],codeOnly:true,imageMode:'text',getWorker(){throw Error('No OCR for readable appearances');}});
  const count=code=>result.hits.filter(h=>h.code===code).length;
  assert.equal(count('DBL'),3);for(const code of ['DBLÅI','DBLDS','DBLDSÅI','WCDS','DBL2'])assert.equal(count(code),1,code);
  assert.equal(count('GS1'),0,'contradictory metadata stays unresolved; GS10 is not GS1');assert.equal(count('DBLBUPPST'),0,'different printed spelling not guessed');
  assert(result.hits.filter(h=>h.code!=='DBL2'&&h.source==='PDF-stämpel').every(h=>h.labelSource==='appearance'));
  const room=result.hits.find(h=>h.code==='WC');assert(room.requiresReview&&room.selected===false,'room number + name + area is retained for review, not automatically selected');
  assert(result.hits.find(h=>h.code==='DBL'&&h.source==='PDF-text').selected,'plain drawing labels without room context remain supported');
 }finally{await pdf.destroy();}
 const fresh=await PDFDocument.load(await doc.save(),{updateMetadata:false}),freshIndex=api.readDocument(fresh);let cancelled=false;
 await assert.rejects(api.readAppearances({doc:fresh,index:freshIndex,codes,library:lib,pdfjs:engine,cancelled:()=>cancelled,onDetail(info){if(info.done===1)cancelled=true;}}),/avbröts/);
 assert.equal(loads,destroyed,'cancelled reading also disposes temporary document');assert(freshIndex.every(a=>!a.appearanceStatus),'cancel does not mutate caller index');
 console.log('PASS actual PDF appearances: descriptive metadata, multiline ÅI/DS, independent source text, repeated positions, appearance states, source immutability, cache, hidden stamps, suffix/alias/conflict rejection, no OCR, disposal and cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
