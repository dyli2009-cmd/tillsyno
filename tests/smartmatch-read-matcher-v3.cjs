/* Exact ID boundaries plus real, local OCR on a mixed text/colour-image PDF. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm');
const {PDFDocument,StandardFonts}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};
const readVersion=process.env.SMARTMATCH_READ_VERSION||'v3';
assert(['v3','v4','v5'].includes(readVersion),'supported isolated matcher version');
vm.runInNewContext(fs.readFileSync(path.join(root,'smartmatch-read-match-'+readVersion+'.js'),'utf8'),sandbox);
const matcher=sandbox.window.SmartMatchReadMatcher;
const word=(text,x=.1,y=.1,w=.12,h=.03)=>({text,x,y,w,h,confidence:99});
function found(words,codes){return Array.from(matcher.textHits(words,codes),h=>h.code);}
assert.deepEqual(found([word('Dörrkort 140C')],['140c','140']),['140C']);
assert.deepEqual(found([word('Toalett 140C')],['140C']),['140C']);
for(const text of ['1140C','140C1','140CA','A140C','140C-2','1-140C','HWC','WCA','WC1','11','1-45-1','1 - 45 - 1','1.45.1']){
 assert.deepEqual(found([word(text)],['140c','wc','1']),[],text+' is a whole different label');
}
assert.deepEqual(found([word('W',.1,.1,.02),word('C',.121,.1,.02)],['wc']),['WC']);
assert.deepEqual(found([word('W',.1,.1,.02),word('C',.121,.1,.02),word('1',.142,.1,.02)],['WC']),[],'split WC1 must stay intact');
assert.deepEqual(found([word('1',.1,.1,.01),word('-',.111,.1,.01),word('45',.122,.1,.02),word('-1',.143,.1,.02)],['1']),[],'split dimension is not door 1');
assert.deepEqual(found([word('(140C)'),word('WC',.4),word('1',.7)],['140c','wc','1']).sort(),['1','140C','WC']);
assert.deepEqual(found([word('1.45.1')],['1451']),['1451'],'ID separators agree with the card reader');
assert.deepEqual(found([word('GS−47')],['GS47']),['GS47'],'Unicode minus agrees with the card reader');
console.log('PASS whole IDs, case, numeric-leading IDs, title prefixes, split glyphs and similar labels');

const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/__matcher_v3_test__'){
  res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><meta charset="utf-8"><script src="/vendor/pdf.min.js"></script><script src="/vendor/tesseract/tesseract.min.js"></script><script src="/smartmatch-read-match-'+readVersion+'.js"></script>');
 }
 const file=path.resolve(root,pathname.replace(/^\//,''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
async function fixture(images){
 const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica),other=await d.embedFont(StandardFonts.Courier),pg=d.addPage([595,842]);
 pg.drawText('140C',{x:60,y:700,size:20,font});pg.drawText('1',{x:500,y:700,size:20,font});
 pg.drawText('W',{x:100,y:150,size:20,font});pg.drawText('C',{x:119,y:150,size:20,font:other});
 for(const [i,t] of ['WCA','HWC','WC1','11','1-45-1'].entries())pg.drawText(t,{x:40+i*105,y:60,size:16,font});
 for(const [i,png] of images.entries()){const img=await d.embedPng(png);pg.drawImage(img,{x:110+i*230,y:500-i*150,width:140,height:i?50.4:36});}
 const card=d.addPage([595,842]);card.drawText('140C',{x:80,y:700,size:20,font});
 return Buffer.from(await d.save());
}
(async()=>{
 const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
 const {chromium}=require(runtime?path.join(runtime,'playwright'):'playwright');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
 try{
  const page=await browser.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/__matcher_v3_test__');
  await page.evaluate(()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';});
  const images=await page.evaluate(()=>['140C','WC'].map((text,i)=>{
   const c=document.createElement('canvas');c.width=i?500:700;c.height=180;const ctx=c.getContext('2d');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=i?'#082a63':'#b21d24';
   ctx.font='bold 116px Arial';ctx.fillText(text,85,132);return c.toDataURL('image/png').split(',')[1];
  }));
  async function run(bytes,options={}){
   return page.evaluate(async({bytes,options})=>{
    const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(bytes)}).promise;
    let worker,calls=0,maxPixels=0,cancel=false;const trace=[];
    const params={pdf,cardPages:[2],codes:['140c','WC','1'],getWorker:async()=>{
     worker ||= await Tesseract.createWorker('eng',1,{workerPath:new URL('/vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('/vendor/tesseract/tesseract-core-lstm.wasm.js',location.href).href,langPath:new URL('/vendor/tesseract/lang/',location.href).href,workerBlobURL:false,gzip:true});return worker;
    },recognize:async(w,c)=>{calls++;maxPixels=Math.max(maxPixels,c.width*c.height);const result=await w.recognize(c);trace.push((result.data.words||[]).map(w=>[w.text,w.confidence]));if(options.cancelAfterFirst)cancel=true;return result;},cancelled:()=>cancel};
    try{return {result:await SmartMatchReadMatcher.scan(params),calls,maxPixels,trace};}
    catch(e){return {error:e.message,calls,maxPixels};}
    finally{if(worker)await worker.terminate();await pdf.destroy();}
   },{bytes:Array.from(bytes),options});
  }
  const native=await run(await fixture([]));assert(!native.error,native.error);assert.equal(native.calls,0,'native page with no image does not need OCR');assert.equal(native.result.hits.length,3);
  const bytes=await fixture(images.map(v=>Buffer.from(v,'base64'))),mixed=await run(bytes);
  assert(!mixed.error,mixed.error);assert(mixed.calls>0,'images get OCR even with native matches and no example');
  assert(mixed.maxPixels<=901*901,'OCR is tiled within a bounded canvas');
  assert.deepEqual(mixed.result.hits.map(h=>h.code).sort(),['1','140C','140C','WC','WC'],'all text and coloured raster labels, without partial IDs: '+JSON.stringify(mixed.trace));
  assert.equal(mixed.result.version,2,'review payload remains compatible');assert(mixed.result.hits.every(h=>h.page===1&&h.scanSource==='read-tool-'+readVersion));
  for(const hit of mixed.result.hits){assert(hit.box.x>=0&&hit.box.y>=0&&hit.box.x+hit.box.w<=1.00001&&hit.box.y+hit.box.h<=1.00001);assert.equal(hit.rect.length,4);}
  console.log('PASS mixed native/colour-raster PDF without sample, card exclusion, bounded tiles and local assets');
  const cancelled=await run(bytes,{cancelAfterFirst:true});assert.match(cancelled.error,/avbröts/);assert.equal(cancelled.calls,1,'cancellation prevents another OCR tile');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'PDF/OCR processing stays on the app origin');console.log('PASS cancellation and no external requests');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
