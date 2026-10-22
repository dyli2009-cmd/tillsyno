'use strict';
// Generated in-memory vector PDFs only; no screenshots or image files.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const D=require('../smartmatch-projektering-v2-4-data.js'),P=require('../smartmatch-projektering-v2-6-pdf.js'),L=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),files=new Map();let fixture;
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://local');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:760px;height:560px;position:relative}</style><div id="host"></div><script src="/vendor/pdf.min.js"></script><script src="/smartmatch-projektering-v2-4-data.js"></script><script src="/smartmatch-projektering-v2-6-canvas.js"></script>');return;}
 if(files.has(url.pathname)){response.setHeader('Content-Type','application/pdf');response.end(files.get(url.pathname));return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{response.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'application/octet-stream');response.end(fs.readFileSync(file));}catch(_){response.writeHead(404);response.end();}
});
async function input(){
 const original=await L.PDFDocument.create(),font=await original.embedFont(L.StandardFonts.Helvetica);
 const a=original.addPage([800,600]);a.drawText('Ren originalritning PLAN A',{x:30,y:565,size:15,font});
 const b=original.addPage([700,900]);b.setCropBox(20,30,620,800);b.setRotation(L.degrees(90));b.drawText('Ren originalritning PLAN B',{x:40,y:750,size:15,font});
 const state=D.createEmpty('Produktuppgifter och dörrkort');state.drawing={name:'generated.pdf',pages:P.metadata(original)};
 D.addPlacement(state,{id:'GS',page:1,stencilId:'GS1',x:.2,y:.3});
 D.addPlacement(state,{id:'DA',page:1,stencilId:'DA',x:.5,y:.3});
 D.addPlacement(state,{id:'BLANKDA',page:1,stencilId:'DA',x:.2,y:.65});
 D.addPlacement(state,{id:'DS',page:1,stencilId:'DS',x:.8,y:.3,rotation:225});
 D.addPlacement(state,{id:'DFS',page:2,stencilId:'DFS',x:.3,y:.5});
 D.addStencil(state,D.defaultStencil('DADS'));D.addPlacement(state,{id:'DADS',page:1,stencilId:'DADS',x:.5,y:.65});
 D.addStencil(state,{...D.defaultStencil('EGEN-X'),kind:'symbol',productType:'none',shape:'square',fill:'#66cc99'});D.addPlacement(state,{id:'CUSTOM',page:1,stencilId:'EGEN-X',x:.8,y:.65});
 D.addStencil(state,{...D.defaultStencil('AK1'),kind:'symbol',productType:'elbowContact',category:'Armbågskontakter'});
 D.addPlacement(state,{id:'ELBOW',page:2,stencilId:'AK1',x:.7,y:.5});
 D.updateEquipment(state,'DA',{objectNumber:'QA-DA-01',model:'SW300 lång modellbeteckning som finns fullständigt i objektlistan',quantity:3,note:'Teknikern kompletterar produktuppgifterna. Kontrollera anslutning på plats.'});
 D.updateEquipment(state,'DS',{objectNumber:'42',model:'DC700',quantity:2});
 D.updateEquipment(state,'DFS',{objectNumber:'DFS-3',model:'Produkt DFS',quantity:1});
 D.updateEquipment(state,'ELBOW',{objectNumber:'EL-4',model:'JCK207',quantity:3,note:'Tre par ska räknas som sex kontakter.'});
 const card=D.clone(state.cards.GS1);card.rows.find(row=>row.id==='day-lock').product='ST140-50';D.updateCard(state,'GS1',card);
 return {state,original:new Uint8Array(await original.save())};
}
async function textPages(page,url){return page.evaluate(async url=>{
 pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await(await fetch(url)).arrayBuffer())}).promise,result=[];
 try{for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),tc=await p.getTextContent();result.push(tc.items.map(item=>item.str).filter(Boolean));}}finally{await pdf.destroy();}return result;
},url);}
(async()=>{
 fixture=await input();const before=JSON.stringify(fixture.state),outputs={};
 for(const mode of ['drawing','cards','combined']){
  outputs[mode]=await P.build(fixture.state,fixture.original,{mode});
  const restored=await P.inspect(outputs[mode]);assert.deepEqual(restored.state,fixture.state);assert.deepEqual(restored.original,fixture.original,'embedded clean source remains byte-identical');
  const pdf=await L.PDFDocument.load(outputs[mode]);assert.equal(pdf.getPageCount(),mode==='drawing'?2:mode==='cards'?1:4,'combined adds one readable product appendix after source and cards');
 }
 assert.equal(JSON.stringify(fixture.state),before,'export never changes active state');
 const longTitle=D.clone(fixture.state);longTitle.project.name='W'.repeat(120);D.removeCard(longTitle,'GS1',{cascade:true});await P.build(longTitle,fixture.original);
 const long=D.createEmpty('Många produktobjekt');long.drawing=D.clone(fixture.state.drawing);
 for(let i=0;i<24;i++){
  const p=D.addPlacement(long,{id:'many-'+i,page:1,stencilId:'DA',x:.08+(i%6)*.16,y:.1+Math.floor(i/6)*.2});
  D.updateEquipment(long,p.id,{model:'SW300',objectNumber:'M-'+String(i+1),note:'rad '.repeat(220)+'SLUT-'+String(i+1)});
 }
 const many=await P.build(long,fixture.original);assert((await L.PDFDocument.load(many)).getPageCount()>4,'long object notes continue across appendix pages');
 assert.deepEqual((await P.inspect(many)).state,long);
 files.set('/source.pdf',Buffer.from(fixture.original));files.set('/combined.pdf',Buffer.from(outputs.combined));files.set('/many.pdf',Buffer.from(many));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const texts=await textPages(page,'/combined.pdf'),drawing=texts.slice(0,2).flat().join(' '),appendix=texts.at(-1).join(' ');
  for(const code of ['GS1','DA','DS','DFS','AK1','DADS','EGEN-X'])assert(drawing.includes(code),'drawing retains symbol code '+code);
  for(const detail of ['QA-DA-01','SW300','DC700','DFS-3','JCK207','3 st','6 st'])assert(!drawing.includes(detail),'drawing does not show legacy product details '+detail);
  for(const text of ['PRODUKTOBJEKT','QA-DA-01','DC700','DFS-3','JCK207','Teknikern','kompletterar','Tre par'])assert(appendix.includes(text),'searchable full object appendix: '+text);
  assert(appendix.includes('SW300 lång modellbeteckning som finns fullständigt i objektlistan'),'full model survives compact drawing truncation');
  assert(!appendix.includes('Ej angiven typ'),'intentional icons are not described as incomplete products');assert(appendix.includes('Dörrautomatik · DA'),'blank model uses the symbol code in the appendix');
  assert(texts[2].join(' ').includes('BESLAGSKORT'),'door-card page remains before the appendix');
  const manyTexts=await textPages(page,'/many.pdf');assert(manyTexts.at(-1).join(' ').includes('SLUT-24'),'last continued object note remains searchable');
  const labels=await page.evaluate(async state=>{
   const original=new Uint8Array(await(await fetch('/source.pdf')).arrayBuffer());window.control=Proj2Canvas.create({host:document.getElementById('host')});await control.open(original);control.setProject(state,{selectedIds:[]});
   const result=[];for(let n=1;n<=state.drawing.pages.length;n++){await control.page(n);control.setProject(state,{selectedIds:[]});result.push(...state.placements.filter(item=>item.page===n).map(item=>{const node=document.querySelector('[data-placement-id="'+item.id+'"]'),label=node.querySelector('text'),box=label?.getBBox();return {id:item.id,aria:node.getAttribute('aria-label'),code:label?.textContent,labels:[...node.querySelectorAll('text')].map(n=>n.textContent),box:box?{x:box.x,y:box.y,width:box.width,height:box.height}:null,shapeWidth:item.width,shapeHeight:item.height,text:node.textContent};}));}return result;
  },fixture.state);
  const da=labels.find(item=>item.id==='DA');assert.deepEqual(da.labels,['DA']);assert(!da.aria.includes('produktuppgifter'));
  assert.deepEqual(labels.find(item=>item.id==='ELBOW').labels,['AK1']);
  assert.deepEqual(labels.find(item=>item.id==='DADS').labels,['DADS']);assert.deepEqual(labels.find(item=>item.id==='CUSTOM').labels,['EGEN-X']);
  for(const item of labels.filter(item=>item.id!=='GS'))assert(!/produktuppgifter|dörrkort/.test(item.aria),'no symbol activation hint for '+item.id);
  for(const label of labels.filter(item=>item.box)){const b=label.box;assert(b.x>=-label.shapeWidth/2-.2&&b.x+b.width<=label.shapeWidth/2+.2,'product text remains inside physical width '+label.id);assert(b.y>=-label.shapeHeight/2-.2&&b.y+b.height<=label.shapeHeight/2+.2,'product text remains inside physical height '+label.id);}
  assert(labels.find(item=>item.id==='GS').aria.includes('dörrkort'));assert.deepEqual(errors,[]);
  console.log('PASS Projektering2.6 PDF/canvas: code-only symbol labels, exact source/equipment roundtrip, preserved full appendix and door cards, compact label bounds and no symbol editor hints.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
