'use strict';
// Generated source PDFs only. The existing reader runs unchanged in Chromium.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),data=require('../smartmatch-projektering-v2-data.js'),writer=require('../smartmatch-projektering-v2-pdf.js'),lib=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const scripts=['vendor/pdf.min.js','smartmatch-read-text-v9-6.js','smartmatch-read-codes-v9-6.js','smartmatch-read-step-v9-88.js','smartmatch-read-appearance-v9-86.js','smartmatch-read-match-v9-93.js','smartmatch-read-work-v9-32.js','smartmatch-read-work-v9-98.js','smartmatch-read-work-v9-99.js','smartmatch-read-work-v9-100.js'];
const artifacts=path.join(root,'work/projektering-v2/pdf');fs.mkdirSync(artifacts,{recursive:true});
const files=new Map();
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname;
 if(name==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8">'+scripts.map(src=>'<script src="/'+src+'"></script>').join(''));return;}
 if(files.has(name)){res.setHeader('Content-Type','application/pdf');res.end(files.get(name));return;}
 const file=path.resolve(root,'.'+decodeURIComponent(name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
function count(items){return items.reduce((all,item)=>(all[item.code]=(all[item.code]||0)+1,all),{});}
async function fixture(){
 const original=await lib.PDFDocument.create(),font=await original.embedFont(lib.StandardFonts.Helvetica);
 for(let n=0;n<4;n++){
  const page=original.addPage(n%2?[900,700]:[1200,800]);page.setRotation(lib.degrees(n*90));if(n%2)page.setCropBox(50,30,800,600);
  page.drawText('PLAN '+(n+1)+' · RENT RITNINGSORIGINAL',{x:70,y:600,size:14,font});
  page.drawRectangle({x:100,y:100,width:200,height:160,borderColor:lib.rgb(.4,.5,.5),borderWidth:1});
  if(n===1){
   const appearance=original.context.register(original.context.flateStream('0 0 1 rg 0 0 100 40 re f',{Type:'XObject',Subtype:'Form',BBox:[0,0,100,40],Matrix:[1,0,0,1,5,7],Resources:{}}));
   const off=original.context.register(original.context.flateStream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,100,40],Resources:{}}));
   page.node.addAnnot(original.context.register(original.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[140,180,240,220],F:4,CA:.75,AS:'On',AP:{N:{On:appearance,Off:off}}})));
  }
 }
 const state=data.createEmpty('Provprojekt');state.drawing={name:'Fyra sidor.pdf',pages:writer.metadata(original)};
 data.addStencil(state,data.defaultStencil('EX42'));
 for(const item of [
  {id:'p-GS1',page:1,stencilId:'GS1',x:.2,y:.35},
  {id:'p-GS65',page:1,stencilId:'GS65',x:.5,y:.35},
  {id:'p-EX42',page:1,stencilId:'EX42',x:.7,y:.6,rotation:225},
  {id:'p-GS65-rotated',page:2,stencilId:'GS65',x:.25,y:.4},
  {id:'p-DGS100',page:2,stencilId:'DGS100',x:.6,y:.65,rotation:180},
  {id:'p-GS10',page:3,stencilId:'GS10',x:.5,y:.4},
  {id:'p-GS65-270',page:4,stencilId:'GS65',x:.5,y:.45,rotation:270},
  {id:'p-DA',page:1,stencilId:'DA',x:.83,y:.7},
  {id:'p-DS',page:2,stencilId:'DS',x:.8,y:.8}
 ])data.addPlacement(state,item);
 data.ensureCard(state,'EXTRA7');
 const card=data.clone(state.cards.GS65);Object.assign(card.meta,{hanging:'Vänster',doorType:'Ståldörr',fire:'EI30',security:'2'});
 for(const [id,product,quantity,delivery,installer]of [['day-lock','ST140-50',2,'GS','DT'],['day-cylinder-hinge','8882',1,'GS','GS'],['closing-sensor-hinge','Flatscan',1,'DT','DT']])Object.assign(card.rows.find(row=>row.id===id),{product,quantity,delivery,installer});
 data.updateCard(state,'GS65',card);
 return {state,original:new Uint8Array(await original.save())};
}
async function read(page,name,state,withIndex=true){
 return page.evaluate(async({name,state,codeRect,tableRect,withIndex})=>{
  pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await(await fetch(name)).arrayBuffer())}).promise;
  const content=async page=>SmartMatchReadText.joinNativeContent(await page.getTextContent()),first=state.drawing.pages.length+1;
  const discovered=await SmartMatchReadCodes.discover({pdf,examplePage:first,codeOnly:true,codeRect,tableRect,fallbackPolicy:'none',getTextContent:content}),cards=discovered.cards.filter(card=>card.code&&card.selected!==false);
  const annotations=[],pages=[];for(let p=1;p<=state.drawing.pages.length;p++){const pg=await pdf.getPage(p),vp=pg.getViewport({scale:1});pages.push({width:vp.width,height:vp.height,rotation:pg.rotate,view:[...pg.view],transform:[...vp.transform]});for(const a of await pg.getAnnotations())annotations.push({...a,page:p});}
  const matched=await SmartMatchReadMatcher.scan({pdf,codeOnly:true,codes:cards.map(c=>c.code),cardPages:cards.map(c=>c.page),annotationIndex:withIndex?annotations:[],imageMode:'text',getTextContent:content,getWorker:async()=>{throw Error('No OCR is necessary for generated vector stamps');}});
  const selected=cards.find(card=>card.code==='GS65'),cardPage=await pdf.getPage(selected.page),vp=cardPage.getViewport({scale:1}),tc=await content(cardPage),words=[];
  for(const item of tc.items){if(!item.str?.trim())continue;const h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),r=vp.convertToViewportRectangle([item.transform[4],item.transform[5]-h*.25,item.transform[4]+Math.max(1,item.width),item.transform[5]+h*.95]);const word={text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1]),confidence:100};if(word.x+word.w/2>=tableRect.x*vp.width&&word.x+word.w/2<(tableRect.x+tableRect.w)*vp.width&&word.y+word.h/2>=tableRect.y*vp.height&&word.y+word.h/2<(tableRect.y+tableRect.h)*vp.height)words.push(word);}
  const textByPage=[];for(let p=1;p<=state.drawing.pages.length;p++)textByPage.push((await content(await pdf.getPage(p))).items.filter(i=>i.str?.trim()).map(i=>i.str));
  const rotated=await pdf.getPage(2),view=rotated.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;await rotated.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;const preservedAnnotationPixel=[...canvas.getContext('2d').getImageData(170,140,1,1).data];
  return {pages,cards:cards.map(c=>({page:c.page,code:c.code})),hits:matched.hits,products:SmartMatchReadWork.read({words,policy:'gs'}),textByPage,preservedAnnotationPixel};
 },{name,state,codeRect:writer.codeRect,tableRect:writer.tableRect,withIndex});
}
(async()=>{
 const input=await fixture(),originalHash=Buffer.from(input.original).toString('base64');assert.equal(await writer.inspect(input.original),null,'a plain PDF is a drawing, not a saved project');
 const empty=data.createEmpty();data.ensureCard(empty,'GS1');const cardsOnly=await writer.build(empty,new Uint8Array(),{mode:'cards'});assert.deepEqual((await writer.inspect(cardsOnly)).state,empty,'cards can be drafted before a drawing is imported');
 const outputs={};for(const mode of ['drawing','cards','combined']){outputs[mode]=await writer.build(input.state,input.original,{mode});const restored=await writer.inspect(outputs[mode]);assert.deepEqual(restored.state,input.state);assert.equal(Buffer.from(restored.original).toString('base64'),originalHash,'every project PDF embeds the original clean source byte for byte');}
 await assert.rejects(writer.build(input.state,outputs.combined),/redan.*exporterad|Öppna den som projekt/,'an exported drawing cannot accidentally become its own dirty original');
 const mismatched=data.clone(input.state);mismatched.drawing.pages[0].width+=1;await assert.rejects(writer.build(mismatched,input.original),/stämmer inte/,'source/page geometry mismatch is rejected');
 const unicode=data.clone(input.state);unicode.cards.GS65.note='😀';await assert.rejects(writer.build(unicode,input.original),/tecken|latinska/,'unsupported text is never silently changed');
 const overlapping=data.clone(input.state);data.updatePlacement(overlapping,'p-GS1',{x:.5,y:.35});await assert.rejects(writer.build(overlapping,input.original),/överlappar/,'overpainted stamp labels are rejected before export');
 const missingAP=await lib.PDFDocument.load(input.original);missingAP.getPage(1).node.addAnnot(missingAP.context.register(missingAP.context.obj({Type:'Annot',Subtype:'Text',Rect:[100,100,120,120],F:4,Contents:lib.PDFHexString.fromText('Viktig synlig anteckning')})));await assert.rejects(writer.build(input.state,await missingAP.save()),/markering.*saknar|tillplattade/,'a visible original annotation without a preservable appearance is never silently dropped');
 const reopened=await writer.inspect(outputs.combined),previous=JSON.stringify(reopened.state);data.removePlacements(reopened.state,['p-EX42']);data.updatePlacement(reopened.state,'p-GS65',{x:.55,y:.52});data.removeCard(reopened.state,'EX42');const edited=await writer.build(reopened.state,reopened.original);assert.notEqual(previous,JSON.stringify(reopened.state));
 files.set('/combined.pdf',Buffer.from(outputs.combined));files.set('/edited.pdf',Buffer.from(edited));fs.writeFileSync(path.join(artifacts,'combined.pdf'),outputs.combined);fs.writeFileSync(path.join(artifacts,'edited.pdf'),edited);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const result=await read(page,'/combined.pdf',input.state),editedResult=await read(page,'/edited.pdf',reopened.state),withoutIndex=await read(page,'/combined.pdf',input.state,false);
  fs.writeFileSync(path.join(artifacts,'reader-result.json'),JSON.stringify({result,editedResult,withoutIndex},null,2));
  const expectedOutputPages=input.state.drawing.pages.map(p=>p.rotation?{width:p.width,height:p.height,rotation:0,view:[0,0,p.width,p.height],transform:[1,0,0,-1,0,p.height]}:p);
  assert.deepEqual(result.pages,expectedOutputPages,'rotated visible output is normalized to identical viewport dimensions; clean source keeps all original 0/90/180/270 rotation and crop metadata');
  assert(result.preservedAnnotationPixel[2]>220&&result.preservedAnnotationPixel[0]<100&&result.preservedAnnotationPixel[1]<100,'visible source annotation AP state/Matrix/BBox/opacity survives rotation normalization');
  assert.deepEqual(result.cards.map(c=>c.code).sort(),Object.keys(input.state.cards).sort(),'all actual saved cards are discovered from the top-left ID cell, including unused cards');
  const expected=input.state.placements.filter(p=>input.state.stencils[p.stencilId].kind==='card');assert.deepEqual(count(result.hits),count(expected),'whole-code matching across every page finds only the expected physical doors');
  for(const placement of expected){const hit=result.hits.find(hit=>hit.page===placement.page&&hit.code===placement.code&&Math.hypot((hit.box.x+hit.box.w/2-placement.x)*result.pages[placement.page-1].width,(hit.box.y+hit.box.h/2-placement.y)*result.pages[placement.page-1].height)<4);assert(hit,'physical stamp rectangle stays at its actual viewport center: '+placement.id);}
  const rows=input.state.cards.GS65.rows.filter(row=>row.product),products=result.products;assert.equal(products.resolved,true);assert.deepEqual(products.products.map(row=>row.value),rows.map(row=>row.product));assert.deepEqual(products.products.map(row=>row.quantity),rows.map(row=>String(row.quantity)));assert.deepEqual(products.products.map(row=>row.section.toLocaleUpperCase('sv')),rows.map(row=>row.section.toLocaleUpperCase('sv')));assert.deepEqual(products.items.map(row=>row.value),rows.filter(row=>row.delivery==='GS'||row.installer==='GS').map(row=>row.product));
  const expectedEdited=reopened.state.placements.filter(p=>reopened.state.stencils[p.stencilId].kind==='card');assert.deepEqual(count(editedResult.hits),count(expectedEdited));assert(!editedResult.textByPage.flat().includes('EX42'),'removed stamp leaves no former glyph behind after project reopening/export');assert.equal(editedResult.textByPage.flat().filter(text=>text==='GS65').length,3,'moving a stamp does not leave a duplicate old label behind');
  const restoredAgain=await writer.inspect(edited);assert.equal(Buffer.from(restoredAgain.original).toString('base64'),originalHash);assert.deepEqual(errors,[]);
  const example=await writer.example();assert.equal(example.state.placements.length,50);assert.equal(example.state.drawing.pages.length,2);assert.deepEqual((await writer.inspect(await writer.build(example.state,example.original))).state,example.state);
  console.log('PASS Projektering2 PDF: clean source/crop/rotation byte-preserved; rotated visible output normalized with source annotation appearance intact; exact physical whole-code links; products/quantity/sections/GS; clean reopen → move/delete → export has no former glyphs; 50-door example/standalone cards.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
