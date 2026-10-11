const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const PDFLib=require(path.resolve(fs.existsSync('vendor/pdf-lib.min.js')?'vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'));
const source=fs.readFileSync('smartmatch-da-v36-92-module.js','utf8');
const html=fs.readFileSync('project-workspace-smartmatch-test.html','utf8');
assert.equal(html,fs.readFileSync('project-workspace-smartmatch-v36-92.html','utf8'));
assert.match(html,/<script src="smartmatch-da-v36-92-module\.js\?v=36-92"><\/script>/);
function node(){return {hidden:false,disabled:false,textContent:'',value:'',options:[],children:[],replaceChildren(){this.children=[];this.options=[]},append(...x){this.children.push(...x);this.options.push(...x)},appendChild(x){this.children.push(x);this.options.push(x)},addEventListener(){},classList:{add(){},remove(){},toggle(){}},showModal(){this.open=true},close(){this.open=false},setAttribute(){},querySelectorAll(){return []}}}
function setup(raw,positions,texts,items,limit,cards=[]){
 const nodes=new Map();const document={body:node(),getElementById:id=>{if(id==='pwDALinkTool')return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:()=>node()};
 const models=[['24','Dorma ED 100'],['37','Dorma ED 250'],['16','Besam SW100']];
 const api={getPdf:()=>({numPages:limit}),getDrawingLimit:()=>limit,getOriginalPdfBytes:()=>raw,getModels:()=>models,getItems:()=>items,getPositions:()=>positions,getDoorCardIndex:()=>({}),getDoorCardMapping:()=>({}),getDoorCardPages:()=>cards,readPageText:async p=>texts[p]||{items:[],raw:''},groupRows:items=>items.map(x=>({items:[x],text:x.text})),looksLikeProtocol:()=>true,addItem:o=>items.push(o),save(){},redraw(){},setStatus:s=>api.lastStatus=s};
 const c=vm.createContext({console,document,PDFLib,window:{PDFLib,SmartMatchAppBridge:api},setTimeout});
 vm.runInContext(source.replace(' init(null);',' // UI tested separately in Chromium.').replace('return {init,getSLRProgress','return {testIdentity:readPlacedIdentity,testChoose:chooseNearestGS,testScan:scanObjectAutomations,init,getSLRProgress'),c);
 return {module:c.window.SmartMatchDALink,api,items,nodes};
}
const rect=(x,y)=>[x-5,y-5,x+5,y+5];
function textItem(text,x,y,angle=0){const dx=Math.cos(angle),dy=Math.sin(angle);return {text,x,y,h:10,w:text.length*5,transform:[10*dx,10*dy,-10*dy,10*dx,x,y]}}
(async()=>{
 const doc=await PDFLib.PDFDocument.create();for(let i=0;i<4;i++)doc.addPage();
 const {PDFName,PDFString}=PDFLib;
 const marks=[];
 for(let i=1;i<=14;i++)marks.push({id:`20-83-92-3-${i===6?'16':'24'}-${i}`,r:rect(i*100,20),field:i%3===0?'Subj':'Contents'});
 marks.push({id:'120-83-92-3-24-99',r:rect(1600,20),field:'Contents'});
 marks.push({id:'20-83-92-3-24-88',r:rect(1600,20),field:'Contents',page:4});
 for(const pageNo of [1,4])doc.getPages()[pageNo-1].node.set(PDFName.of('Annots'),doc.context.obj(marks.filter(x=>(x.page||1)===pageNo).map(x=>doc.context.register(doc.context.obj({Subtype:PDFName.of('FreeText'),Rect:x.r,Contents:PDFString.of(x.field==='Contents'?x.id:'Kommentar'),[x.field]:PDFString.of(x.id)})))));
 const raw=await doc.save(),positions=marks.filter(x=>!x.page&&x.id.startsWith('20-')).map((m,i)=>({id:'g'+i,code:'GS10',page:1,rect:rect((i+1)*100,50)}));
 const anchor={id:'anchor',page:1,rect:marks[0].r,objectNo:'20-83-92-3',modelCode:'37',serialNumber:'1',sourceText:marks[0].id};
 const state=setup(raw,positions,{},[anchor],4,[4]);
 const identity=await state.module.testIdentity(1,marks[0].r,'999-28-37-1');
 assert.equal(identity.objectNo,'20-83-92-3','actual drawing object wins over entered example');
 assert.equal(identity.modelCode,'24','drawing type 24 reads as ED100');assert.equal(identity.model,'Dorma ED 100');assert.equal(identity.serialNumber,'1');
 await state.module.testScan(anchor);
 assert.equal(state.items.length,14,'all 1–14 annotations found, other object and card pages excluded');
 for(const item of state.items)assert.ok(state.module.getLinkedPosition(item),'nearest GS does not depend on card content');
 assert.equal(state.items.find(x=>x.serialNumber==='6').modelCode,'16','each mark reads its own type');
 await state.module.scanFromSidebar('20-83-92-3');assert.equal(state.items.length,14,'repeat scan creates no duplicates');
 const remembered=state.items[1];remembered.gsLinkConfirmed=true;remembered.linkedGsId=positions[10].id;remembered.linkedGsCode=positions[10].code;remembered.linkedGsRect=positions[10].rect;
 const dismissed=state.items[2];dismissed.gsLinkDismissed=true;dismissed.linkedGsId='';dismissed.linkedGsCode='';
 await state.module.testScan(anchor);assert.equal(remembered.linkedGsId,positions[10].id);assert.equal(dismissed.linkedGsId,'');
 const plain={1:{raw:'kundrapport',items:[textItem('20',0,100),textItem('0154',10,100),textItem('-28-',40,100),textItem('24-',60,100),textItem('10',75,100),textItem('200154-28-37-11',0,200),textItem('200154-',300,200,Math.PI/2),textItem('28-',300,235,Math.PI/2),textItem('24-',300,250,Math.PI/2),textItem('12',300,265,Math.PI/2)]},2:{items:[textItem('200154-28-16-13',0,100)]}};
 const textAnchor={id:'text-anchor',page:1,rect:[-3,90,90,115],objectNo:'200154-28',modelCode:'24',serialNumber:'10'};
 const textState=setup(null,[{id:'t1',page:1,code:'GS1',rect:rect(50,150)},{id:'t2',page:1,code:'GS2',rect:rect(350,240)},{id:'t3',page:2,code:'GS3',rect:rect(50,150)}],plain,[textAnchor],2);
 await textState.module.testScan(textAnchor);
 assert.equal(textState.items.length,4,'split digits, vertical fragments, mixed model and second page found');
 assert.equal((await textState.module.testIdentity(1,textAnchor.rect,'1-28-24-1')).objectNo,'200154-28');
 assert.equal((await textState.module.testIdentity(2,rect(1000,1000),'20-28-92-3-24-10')).source,'manual','unreadable selection uses explicit input');
 assert.equal(textState.module.testChoose({...textAnchor,page:99}).id,'','no invented GS on another page');
 const tie=setup(null,[{id:'a',code:'GS1',page:1,rect:rect(-10,0)},{id:'b',code:'GS2',page:1,rect:rect(10,0)}],{},[],1);
 assert.equal(tie.module.testChoose({page:1,rect:rect(0,0)}).id,'','exact distance tie requires manual choice');
 console.log('Entry, placement identity, all 1–14 annotations, fragmented/vertical labels, mixed types, all pages, nearest GS and preserved manual state passed.');
 if(process.argv[2]){
  const pdfjs=require(path.resolve(fs.existsSync('vendor/pdf.min.js')?'vendor/pdf.min.js':'pdf-runtime.cjs'));pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(fs.existsSync('vendor/pdf.worker.min.js')?'vendor/pdf.worker.min.js':'pdf.worker.cjs');
  const bytes=new Uint8Array(fs.readFileSync(process.argv[2])),pdf=await pdfjs.getDocument({data:bytes.slice()}).promise,lib=await PDFLib.PDFDocument.load(bytes);
  const gs=[],texts={},markers=[];
  for(let p=1;p<=pdf.numPages;p++){
   const tc=await (await pdf.getPage(p)).getTextContent();texts[p]={items:tc.items.filter(i=>i.str?.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],h:Math.max(i.height,1),w:i.width,transform:i.transform})),raw:''};
   if(p>10)continue;
   for(const ref of lib.getPages()[p-1].node.Annots()?.asArray()||[]){const a=lib.context.lookup(ref),sub=a.get(PDFName.of('Subj'))?.decodeText?.()||'',content=a.get(PDFName.of('Contents'))?.decodeText?.()||'',r=a.get(PDFName.of('Rect'))?.asArray().map(x=>x.asNumber());if(!r)continue;if(/^GS\s*\d+$/.test(sub))gs.push({id:'gs-'+p+'-'+gs.length,page:p,code:sub.replace(/\s/g,''),rect:r});if(/^200154-28-24-\d+$/.test(content))markers.push({full:content,page:p,rect:r})}
  }
  const first=markers[0],realAnchor={id:'real-anchor',page:first.page,rect:first.rect,objectNo:'200154-28',modelCode:'24',serialNumber:first.full.split('-').at(-1),sourceText:first.full};
  const real=setup(bytes,gs,texts,[realAnchor],pdf.numPages,Array.from({length:15},(_,i)=>i+11));
  await real.module.testScan(realAnchor);assert.equal(real.items.length,17);assert.equal(real.items.filter(x=>real.module.getLinkedPosition(x)).length,17);
  console.log('Original Snidaren PDF:',real.api.lastStatus);await pdf.destroy();
 }
})().catch(err=>{console.error(err);process.exitCode=1});
