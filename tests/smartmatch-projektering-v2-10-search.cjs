'use strict';
// Search real PDF text and transformed geometry; no images or screenshots.
const assert=require('node:assert/strict');
const {PDFDocument,StandardFonts,degrees}=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
const S=require('../smartmatch-projektering-v2-10-search.js');
const viewport={width:600,height:400,scale:1,transform:[1,0,0,-1,0,400]};
const item=(str,x,y,width=20)=>({str,width,height:12,transform:[12,0,0,12,x,y],fontName:'F'});
function pure(){
 const split=S.indexPage({styles:{F:{ascent:.8,descent:-.2}},items:[item('GS',40,300,18),item('4',60,300,7),item('GS40',120,300,28),item('GS4-1',40,250,35),item('GS',40,200,18),item('4',400,200,7),item('GS',40,150,18),item('4',40,100,7)]},viewport,1);
 const found=S.findMatches(split,'gS4');assert.equal(found.length,1);assert.equal(found[0].rects.length,2,'split PDF operators belong to one visible code');
 assert.equal(S.findMatches(split,'GS 4').length,1,'spaces in a door code are optional');
 assert.equal(S.findMatches(split,'GS40').length,1);assert.equal(S.findMatches(split,'GS4-1').length,1);
 assert.equal(S.findMatches(split,'GS4',{wholeWords:false}).length,3,'explicit substring mode can search part of a longer code');
 assert.equal(S.findMatches(split,'G S 4').length,1);assert.equal(S.findMatches(split,'').length,0);
 for(const rect of found[0].rects)for(const value of Object.values(rect))assert(Number.isFinite(value)&&value>=0&&value<=1);
 const duplicates=S.indexPage({styles:{},items:[item('GS4',40,300),item('GS4',40,300)]},viewport,1);assert.equal(S.findMatches(duplicates,'GS4').length,1,'overprinted identical text is one physical hit');
 assert.throws(()=>S.queryPattern('x'.repeat(S.LIMITS.query+1)),/högst/);
 const punctuation=S.indexPage({styles:{},items:[item('A+B [4]',40,300,60)]},viewport,1);assert.equal(S.findMatches(punctuation,'A+B [4]').length,1,'query syntax is literal, not a regular expression');
}
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const a=doc.addPage([600,400]);
 const draw=(page,text,x,y)=>page.drawText(text,{x,y,size:14,font});
 draw(a,'GS4',40,330);draw(a,'GS4',40,330);draw(a,'GS40',160,330);draw(a,'GS4-1',40,280);
 draw(a,'GS',40,230);draw(a,'4',40+font.widthOfTextAtSize('GS',14)+1,230);draw(a,'DÖRR 17',40,180);
 const b=doc.addPage([600,400]);b.setCropBox(40,30,500,300);b.setRotation(degrees(90));draw(b,'GS4',80,250);
 const c=doc.addPage([600,400]);c.drawRectangle({x:20,y:20,width:500,height:300,borderWidth:1});
 const d=doc.addPage([600,400]);for(let row=0;row<3;row++)draw(d,'GS4',40,330-row*60);
 const e=doc.addPage([600,400]);draw(e,'XGS4 GS40 GS4-2',40,330);
 return new Uint8Array(await doc.save());
}
async function real(){
 const bytes=await fixture(),before=Buffer.from(bytes),progress=[];
 const index=S.create({pdfjs,onProgress:state=>progress.push(state)});
 const opened=await index.open(bytes);assert.equal(opened.total,5);assert.equal(opened.scannedPages,0,'opening does not block the canvas while all pages index');
 assert.equal((await index.search('')).matches.length,0);assert.equal(index.stats().scannedPages,0);
 const report=await index.search('GS4');
 assert.equal(report.matches.length,6);assert.deepEqual(report.matches.map(match=>match.page),[1,1,2,4,4,4]);
 assert.equal(report.total,5);assert.equal(report.scannedPages,5);assert.equal(report.textPages,4);assert.deepEqual(report.failedPages,[]);assert.equal(report.truncated,false);
 assert(progress.some(state=>state.scannedPages>0&&state.scannedPages<5),'indexing reports page progress');
 assert.equal((await index.search('GS40')).matches.length,2);assert.equal((await index.search('gs 4')).matches.length,6);
 assert.equal((await index.search('dörr17')).matches.length,1,'Swedish case and PDF item spacing are handled');
 const limited=await index.search('GS4',{maxResults:3});assert.equal(limited.matches.length,3);assert.equal(limited.truncated,true);
 const rotated=report.matches.find(match=>match.page===2).rects[0];assert(rotated.x>.7&&rotated.x<.9);assert(rotated.y>.03&&rotated.y<.2);assert(rotated.height>rotated.width,'rotated text uses rotated crop-box viewport coordinates');
 for(const match of report.matches){assert(match.id);assert(match.text);for(const rect of match.rects){assert(rect.width>0&&rect.height>0);assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=1.00001&&rect.y+rect.height<=1.00001);}}
 assert.deepEqual(Buffer.from(bytes),before,'PDF.js receives its own bytes; original PDF data remains intact');
 const searches=await Promise.allSettled([index.search('GS4'),index.search('GS40')]);assert.equal(searches[0].status,'rejected');assert.equal(searches[0].reason.name,'AbortError');assert.equal(searches[1].value.matches.length,2,'new query wins over stale results');
 const opens=await Promise.allSettled([index.open(bytes),index.open(bytes)]);assert.equal(opens[0].status,'rejected');assert.equal(opens[0].reason.name,'AbortError');assert.equal(opens[1].status,'fulfilled');assert.equal((await index.search('GS4')).matches.length,6);
 await index.close();assert.equal(index.stats().total,0);await assert.rejects(index.search('GS4'),/Öppna/);
 await index.destroy();await assert.rejects(index.open(bytes),/stängts/);

 const sharedPdf=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true,isEvalSupported:false}).promise;
 const shared=S.create({pdfjs});await shared.useDocument(sharedPdf);assert.equal((await shared.search('GS4')).matches.length,6);await shared.destroy();
 assert.equal((await sharedPdf.getPage(1)).pageNumber,1,'the search index does not destroy a canvas-owned shared PDF');await sharedPdf.destroy();
}
(async()=>{pure();await real();console.log('PASS Projektering 2.10 PDF text search: all pages, whole codes, split text, crop/rotation geometry, progress, bounded results, source preservation and stale-request disposal.');})().catch(error=>{console.error(error);process.exitCode=1;});
