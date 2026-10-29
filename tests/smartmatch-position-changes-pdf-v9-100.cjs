'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const PDFLib=require('../vendor/pdf-lib.min.js'),pdfjs=require('../vendor/pdf.min.js'),C=require('../smartmatch-position-changes-v9-100.js');
pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-main-v9-94.js'),'utf8');
const start=source.indexOf('function smartRemoveOldProgressStreams('),end=source.indexOf('\n}',source.indexOf('async function smartFlattenProgressBadges('))+2;
const instances=[0,90,180,270].map((angle,index)=>({id:'door-'+index,code:'GS4',position:index+1,page:index+1,rect:[150,180,185,200],progress:0,overrides:{},customItems:[]}));
const item={key:'da',source:'base',label:'Dörrautomatik',value:'ED100'};
for(const o of instances)C.set(o,item,{excluded:true,note:'Dörrautomatik utgår',color:'red'});
const context=vm.createContext({PDFLib,window:{SmartMatchPositionChanges:C},instances});vm.runInContext(source.slice(start,end),context);
async function text(bytes){const doc=await pdfjs.getDocument({data:bytes.slice(),verbosity:0}).promise;try{const out=[];for(let i=1;i<=doc.numPages;i++)out.push((await(await doc.getPage(i)).getTextContent()).items.map(item=>item.str).join(' '));return out;}finally{await doc.destroy();}}
(async()=>{
 const doc=await PDFLib.PDFDocument.create();
 for(const angle of [0,90,180,270]){const page=doc.addPage([400,400]);page.setRotation(PDFLib.degrees(angle));page.drawEllipse({x:167.5,y:190,xScale:20,yScale:12,borderWidth:1.5,borderColor:PDFLib.rgb(0,0,0),color:PDFLib.rgb(1,.9,.2)});page.drawText('GS4',{x:155,y:186,size:11});}
 await context.smartFlattenProgressBadges(doc,doc.getPages(),instances);
 let bytes=await doc.save();for(const page of await text(bytes)){assert.match(page,/Ändring 1 · 0%/);assert.match(page,/GS4/);}
 // Re-export must replace the change badges, not accumulate them.
 await context.smartFlattenProgressBadges(doc,doc.getPages(),instances);bytes=await doc.save();for(const page of await text(bytes))assert.equal((page.match(/Ändring/g)||[]).length,1);
 if(process.env.POSITION_CHANGE_PDF)fs.writeFileSync(process.env.POSITION_CHANGE_PDF,bytes);
 for(const o of instances)C.restore(o,item);await context.smartFlattenProgressBadges(doc,doc.getPages(),instances);
 for(const page of await text(await doc.save()))assert(!page.includes('Ändring'));
 console.log('PASS visible change label at zero progress, Swedish PDF text, four rotations, idempotent export and badge removal after restore');
})().catch(error=>{console.error(error);process.exitCode=1;});
