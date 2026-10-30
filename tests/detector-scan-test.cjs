// node tests/detector-scan-test.cjs [optional private original drawing PDF]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PDFDocument,StandardFonts,rgb,degrees}=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js'),core=require('../detector-scan-test/core.js');
pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
async function open(bytes){return pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;}
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([600,400]);
 function label(text,x,y,color=rgb(0,0,0),frame=true){const width=font.widthOfTextAtSize(text,10)+8;if(frame)p.drawRectangle({x,y,width,height:18,borderColor:color,borderWidth:.8});p.drawText(text,{x:x+4,y:y+5,font,size:10});}
 label('1',20,300);label('3',80,300);label('1041',140,300);label('1025',200,300);label('1025',300,100);label('007',20,100);
 label('room 15',100,100);label('25',400,300,rgb(1,0,0));label('123',400,100,rgb(0,0,0),false);
 p.drawCircle({x:350,y:300,size:12,borderWidth:1,borderColor:rgb(0,0,0)});p.drawText('7',{x:347,y:297,font,size:10});
 const page2=doc.addPage([600,400]);page2.setRotation(degrees(90));page2.drawRectangle({x:50,y:100,width:30,height:18,borderColor:rgb(0,0,0),borderWidth:1});page2.drawText('1',{x:61,y:105,font,size:10});doc.addPage([600,400]);
 const scan=await open(await doc.save()),first=await core.scanPage(await scan.getPage(1),pdfjs),second=await core.scanPage(await scan.getPage(2),pdfjs),empty=await core.scanPage(await scan.getPage(3),pdfjs);
 assert.deepEqual(first.hits.map(h=>h.code).sort(),['007','1','1025','1025','1041','3'].sort());
 assert.equal(second.hits.length,1);assert.equal(second.hits[0].page,2);assert.equal(second.hits[0].code,'1');assert.equal(empty.hasText,false);assert.equal(empty.hits.length,0);
 assert(Math.abs(first.hits.find(h=>h.code==='1041').x-(140+(font.widthOfTextAtSize('1041',10)+8)/2)/600)<.001);
 const duplicates=first.hits.filter(h=>h.code==='1025'),items=duplicates.map((h,i)=>({uid:'d'+i,type:'detector',id:h.code,...h,detectorBox:{width:h.width,height:h.height},checks:{'1.1':{result:i?'':'ok'}}}));
 assert.equal(core.nearestExisting(items,duplicates[0]).uid,'d0');assert.equal(core.nearestExisting(items,duplicates[1]).uid,'d1');assert.equal(core.nearestExisting(items,{...duplicates[0],page:2}),null);
 assert.equal(core.nearestExisting(items,{...duplicates[0],x:duplicates[0].x+.0001}).uid,'d0');assert.equal(items[1].checks['1.1'].result,'');
 await scan.destroy();console.log('PASS: short and long numbers, leading zero, black rectangle, red/circle/plain-text exclusion, duplicate positions, page separation, native rotation, image-only notice.');
 if(process.argv[2]){const actual=await open(fs.readFileSync(process.argv[2]));const r=await core.scanPage(await actual.getPage(1),pdfjs);assert.equal(r.hits.length,32);assert.equal(r.hits.filter(h=>h.code==='1025').length,2);assert(r.hits.some(h=>h.code==='1032'));console.log('PASS: supplied original drawing has 32 framed numeric labels, including 1025 twice and 1032.');await actual.destroy();}
 const html=fs.readFileSync(path.resolve(__dirname,'../detector-scan-test/all-in-one.html'),'utf8'),runtime=fs.readFileSync(path.resolve(__dirname,'../detector-scan-test/security.js'),'utf8');
 assert(html.includes('auth/guard.js'));assert(!html.includes('src="all-in-one.js'));assert(runtime.includes("const APP_STORAGE_PREFIX='security-detector-test:'"));assert(runtime.includes("const APP_WORK_KEY='SecurityDetectorTestWork'"));assert(runtime.includes('out.catalog.set(PDFName.of(APP_WORK_KEY)'));console.log('PASS: test storage and PDF metadata isolated; existing sign-in retained.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
