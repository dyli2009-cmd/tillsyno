'use strict';
// Generated demo only: vector/text export → unchanged PDF.js/readers → exact
// drawing links and product rows. No customer files or authentication calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),data=require('../smartmatch-projektering-demo-v1-data.js'),pdfExport=require('../smartmatch-projektering-demo-v1-pdf.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const scripts=['vendor/pdf.min.js','smartmatch-read-text-v9-6.js','smartmatch-read-codes-v9-6.js','smartmatch-read-step-v9-88.js','smartmatch-read-appearance-v9-86.js','smartmatch-read-match-v9-93.js','smartmatch-read-work-v9-32.js','smartmatch-read-work-v9-98.js','smartmatch-read-work-v9-99.js','smartmatch-read-work-v9-100.js'];
const state=data.createDemo();data.assignDoor(state,'D043','EX1','square');
data.assignDoor(state,'D011','DA','square');data.assignDoor(state,'D021','DS','square');
state.cards.GS1.rows[0].quantity=2;state.cards.GS1.rows[0].installer='DT';
const codes=pdfExport.usedCodes(state),first=codes.indexOf('GS1')+2;
let bytes;
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname;
 if(name==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8">'+scripts.map(name=>'<script src="/'+name+'"></script>').join(''));return;}
 if(name==='/demo.pdf'){res.setHeader('Content-Type','application/pdf');res.end(bytes);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
(async()=>{
 fs.mkdirSync(path.join(root,'work/projektering-demo-v1'),{recursive:true});
 bytes=Buffer.from(await pdfExport.build(state));fs.writeFileSync(path.join(root,'work/projektering-demo-v1/roundtrip.pdf'),bytes);
 assert.deepEqual(await pdfExport.read(bytes),data.validate(state),'portable PDF restores the actual committed shared cards and door positions');
 for(const mode of ['drawing','cards']){const part=await pdfExport.build(state,{mode});assert.deepEqual(await pdfExport.read(part),data.validate(state),'every exported document preserves complete editable project data');}
 const unsupported=data.clone(state);unsupported.project.name+=' 😀';await assert.rejects(pdfExport.build(unsupported),/tecken|latinska/,'unsupported PDF text is rejected explicitly, never silently changed');
 for(const code of ['D001','RUM101']){const collision=data.clone(state);data.assignDoor(collision,'D043',code);await assert.rejects(pdfExport.build(collision),/rumsnamn|dörrnummer/,'codes matching background text cannot silently add false drawing positions');}
 const titleCollision=data.clone(state);titleCollision.project.name='GS1 exempel';await assert.rejects(pdfExport.build(titleCollision),/ritningsrubrik/,'a standalone code within the project title is not exported as an extra position');
 const longerTitle=data.clone(state);longerTitle.project.name='GS1000 exempel';await pdfExport.build(longerTitle,{mode:'drawing'});
 for(const field of ['delivery','installer']){const ownerOverflow=data.clone(state);ownerOverflow.cards.GS1.rows[0][field]='A'.repeat(40);await assert.rejects(pdfExport.build(ownerOverflow),/för lång|Förkorta/,'overlong responsibility text cannot run into another cell');}
 const longToken=data.clone(state);longToken.cards.GS1.note='A'.repeat(200);await assert.rejects(pdfExport.build(longToken),/ord.*för långt|Dela upp/,'an unbroken note token cannot extend beyond the page');
 const edge=data.clone(state);edge.doors[0].x=1;await assert.rejects(pdfExport.build(edge),/kant|rubrik/,'clipped stamps are rejected before export');
 const overlap=data.clone(state);overlap.doors[1].x=overlap.doors[0].x;overlap.doors[1].y=overlap.doors[0].y;await assert.rejects(pdfExport.build(overlap),/överlappar/,'overpainted stamps are rejected before export');
 const source=JSON.stringify(state);assert(source.includes('GS100'));assert(source.includes('DADS'));
 assert.equal(state.cards.DA.shape,'square');assert.equal(state.cards.DS.shape,'square');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const result=await page.evaluate(async({first,codeRect,tableRect,codes})=>{
   pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await(await fetch('/demo.pdf')).arrayBuffer())}).promise;
   const content=async page=>SmartMatchReadText.joinNativeContent(await page.getTextContent());
   const discovered=await SmartMatchReadCodes.discover({pdf,examplePage:first,codeOnly:true,codeRect,tableRect,fallbackPolicy:'none',getTextContent:content});
   const cards=discovered.cards.filter(card=>card.code&&card.selected!==false),cardPages=cards.map(card=>card.page);
   const matched=await SmartMatchReadMatcher.scan({pdf,codeOnly:true,codes:cards.map(card=>card.code),cardPages,annotationIndex:[],imageMode:'text',getTextContent:content,getWorker:async()=>{throw Error('Clean generated PDF must not use OCR');}});
   const products={};
   for(const card of cards){
    const page=await pdf.getPage(card.page),vp=page.getViewport({scale:1}),tc=await content(page),words=[];
    for(const item of tc.items){if(!item.str?.trim())continue;const h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),r=vp.convertToViewportRectangle([item.transform[4],item.transform[5]-h*.25,item.transform[4]+Math.max(1,item.width),item.transform[5]+h*.95]);const word={text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1]),confidence:100};if(word.x+word.w/2>=tableRect.x*vp.width&&word.x+word.w/2<(tableRect.x+tableRect.w)*vp.width&&word.y+word.h/2>=tableRect.y*vp.height&&word.y+word.h/2<(tableRect.y+tableRect.h)*vp.height)words.push(word);}
    products[card.code]=SmartMatchReadWork.read({words,policy:'gs'});
   }
   const drawing=await pdf.getPage(1),annotations=await drawing.getAnnotations(),drawingText=(await content(drawing)).items.map(item=>item.str).join(' ');
   return {pages:pdf.numPages,cards:cards.map(card=>({code:card.code,page:card.page})),hits:matched.hits.map(hit=>({code:hit.code,page:hit.page,box:hit.box})),warnings:matched.warnings,products,annotations:annotations.map(item=>({subtype:item.subtype,subject:item.titleObj?.str,contents:item.contentsObj?.str})),drawingText};
  },{first,codeRect:pdfExport.codeRect,tableRect:pdfExport.tableRect,codes});
  fs.writeFileSync(path.join(root,'work/projektering-demo-v1/reader-result.json'),JSON.stringify(result,null,2));
  assert.deepEqual(result.cards.map(card=>card.code).sort(),[...codes].sort(),'every used doorcard is discovered from its actual top-left code text');
  assert.equal(result.pages,codes.length+1);assert.equal(result.hits.length,50,'every physical position matches from actual native text without supplying annotation metadata or saved SmartMatch links');
  const count=items=>items.reduce((all,item)=>(all[item.code]=(all[item.code]||0)+1,all),{});
  assert.deepEqual(count(result.hits),count(state.doors),'GS1/GS10/GS100 and alphabetical/custom codes never cross-match');
  for(const code of codes){const expected=state.cards[code].rows.filter(row=>row.product),actual=result.products[code];assert.equal(actual.resolved,true,'explicit product columns resolve '+code);assert.equal(actual.products.length,expected.length,'every actual product is preserved once '+code);assert.deepEqual(actual.products.map(row=>row.value),expected.map(row=>row.product));assert.deepEqual(actual.products.map(row=>row.quantity),expected.map(row=>String(row.quantity)),'quantity remains separate from product text '+code);assert.deepEqual(actual.items.map(row=>row.value),expected.filter(row=>row.delivery==='GS'||row.installer==='GS').map(row=>row.product),'only GS delivery or installation becomes work '+code);assert.deepEqual(actual.products.map(row=>row.section.toLocaleUpperCase('sv')),expected.map(row=>row.section.toLocaleUpperCase('sv')),'products stay in the correct sections '+code);}
  assert.equal(result.annotations.length,50,'separate stamp metadata is retained');assert.deepEqual(errors,[]);
  console.log('PASS projection PDF: 50 exact native-text links, '+codes.length+' actual doorcards, every product/section/GS responsibility, drawing+cards+combined exports, embedded project reopen, unsupported-glyph guard; no OCR or reader changes.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
