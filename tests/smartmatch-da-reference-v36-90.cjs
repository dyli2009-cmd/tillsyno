const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const PDFLib=require(fs.existsSync('vendor/pdf-lib.min.js')?'../vendor/pdf-lib.min.js':'./pdf-lib-runtime.cjs');
const source=fs.readFileSync('smartmatch-da-v36-90-module.js','utf8');
function node(){return {hidden:false,disabled:false,textContent:'',children:[],replaceChildren(){this.children=[]},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)},addEventListener(){},classList:{add(){},remove(){},toggle(){}}}}
function setup(raw,positions,index,pageTexts,items,limit){
 const nodes=new Map();const document={body:node(),getElementById:id=>{if(id==='pwDALinkTool')return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:()=>node()};
 const models=[['24','Dorma ED 100'],['37','Dorma ED 250'],['16','Besam SW100']];
 const api={getPdf:()=>({numPages:limit}),getDrawingLimit:()=>limit,getOriginalPdfBytes:()=>raw,getModels:()=>models,getItems:()=>items,getPositions:()=>positions,getDoorCardIndex:()=>index,getDoorCardMapping:()=>({}),getDoorCardPages:()=>Object.values(index).flat(),readPageText:async p=>pageTexts[p]||{items:[],raw:''},groupRows:items=>items.map(x=>({items:[x],text:x.text})),looksLikeProtocol:()=>false,addItem:o=>items.push(o),save(){},redraw(){},setStatus:s=>api.lastStatus=s};
 const c=vm.createContext({console,document,PDFLib,window:{PDFLib,SmartMatchAppBridge:api},setTimeout});
 const testSource=source.replace(' init(null);',' // No UI binding in the controlled runtime.').replace('return {init,getSLRProgress','return {testChoose:chooseNearestGS,testCardCache:linkCardCache,testIssue:linkIssue,init,getSLRProgress');
 vm.runInContext(testSource,c);return {module:c.window.SmartMatchDALink,api,items};
}
function rect(x,y){return [x-5,y-5,x+5,y+5]}
(async()=>{
 const doc=await PDFLib.PDFDocument.create(),page=doc.addPage();
 const {PDFName,PDFString}=PDFLib;
 const annotations=[['200154-28-24-1',rect(20,20)],['200154-28-24-2',rect(120,20)],['200154-28-16-3',rect(220,20)]];
 page.node.set(PDFName.of('Annots'),doc.context.obj(annotations.map(([id,r])=>doc.context.register(doc.context.obj({Subtype:PDFName.of('FreeText'),Rect:r,Contents:PDFString.of(id)})))));
 doc.addPage();doc.addPage();doc.addPage();const raw=await doc.save();
 const positions=[{id:'g1',code:'GS1',page:1,rect:rect(50,20)},{id:'g2',code:'GS2',page:1,rect:rect(150,20)},{id:'g3',code:'GS3',page:1,rect:rect(250,20)}];
 const anchor={id:'anchor',page:1,rect:rect(20,20),objectNo:'200154-28',modelCode:'24',serialNumber:'1',sourceText:'200154-28-24-1',linkedGsId:'g1',gsLinkConfirmed:true};
 const state=setup(raw,positions,{GS1:[2],GS2:[3],GS3:[4]},{2:{items:[{text:'Dörrautomatik ED100'}]},3:{items:[{text:'Dörrautomatik'}]},4:{items:[{text:'Dörrautomatik ED100'}]}},[anchor],4);
 await state.module.scanFromSidebar('200154-28');
 assert.equal(state.items.length,3,'the whole scan creates other object markings');
 const linked=state.items.find(o=>o.serialNumber==='2');
 assert.equal(linked.linkedGsId,'g2','unknown card is linked using first manual offset');
 assert.equal(linked.gsReferenceId,'anchor');
 assert.equal(state.module.getLinkedPosition(linked)?.id,'g2','arrow validation accepts the same reference evidence');
 assert.equal(state.items.find(o=>o.serialNumber==='3').linkedGsId,'','known wrong machine type is blocked');
 assert.equal(anchor.linkedGsId,'g1','first manual link is preserved');
 positions.push({id:'g4',code:'GS2',page:1,rect:rect(151,20)});
 assert.equal(state.module.testChoose(linked,state.module.testCardCache).id,'','ambiguous fallback must not guess');
 positions.pop();
 const savedProof=state.module.testCardCache.get('GS2');
 state.module.testCardCache.set('GS2',{...savedProof,state:'no'});
 assert.equal(state.module.getLinkedPosition(linked),null,'explicit no automation blocks fallback');
 state.module.testCardCache.set('GS2',{...savedProof,hasCard:false});
 assert.equal(state.module.getLinkedPosition(linked),null,'missing card blocks fallback');
 state.module.testCardCache.set('GS2',savedProof);
 anchor.gsLinkDismissed=true;
 assert.equal(state.module.getLinkedPosition(linked),null,'reference dismissal invalidates automatic fallback');
 const restored=setup(raw,positions,{GS1:[2],GS2:[3],GS3:[4]},{2:{items:[{text:'Dörrautomatik ED100'}]},3:{items:[{text:'Dörrautomatik'}]},4:{items:[{text:'Dörrautomatik ED100'}]}},JSON.parse(JSON.stringify(state.items)),4);
 restored.items[0].gsLinkDismissed=false;
 await restored.module.onProjectOpened();
 assert.equal(restored.module.getLinkedPosition(restored.items.find(o=>o.serialNumber==='2'))?.id,'g2','reference survives project reopen');
 if(process.argv[2]){
  const pdfjs=require(fs.existsSync('vendor/pdf.min.js')?'../vendor/pdf.min.js':'./pdf-runtime.cjs');
  pdfjs.GlobalWorkerOptions.workerSrc=fs.existsSync('vendor/pdf.worker.min.js')?require.resolve('../vendor/pdf.worker.min.js'):require.resolve('./pdf.worker.cjs');
  const bytes=new Uint8Array(fs.readFileSync(process.argv[2]));
  const pdf=await pdfjs.getDocument({data:bytes.slice()}).promise,lib=await PDFLib.PDFDocument.load(bytes);
  const gs=[],idx={},texts={},markers=[];
  const root=fs.readFileSync('project-workspace-smartmatch-v36-90.js','utf8');
  const start=root.indexOf('function groupTextRowsForAutomation(');
  const group=vm.runInNewContext('('+root.slice(start,root.indexOf('\n}',start)+2)+')');
  for(let p=1;p<=pdf.numPages;p++){
   const content=await (await pdf.getPage(p)).getTextContent();
   const items=content.items.filter(i=>i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width,h:Math.max(Math.abs(i.transform[3]),i.height,1)}));
   texts[p]={items,raw:items.map(i=>i.text).join(' ')};
   if(p>=11)idx['GS'+[1,2,3,4,5,8,9,10,11,12,13,14,15,16,17][p-11]]=[p];
   if(p>10)continue;
   const annots=lib.getPages()[p-1].node.Annots();
   for(const ref of annots?.asArray()||[]){
    const a=lib.context.lookup(ref),sub=a.get(PDFName.of('Subj'))?.decodeText?.()||'',content=a.get(PDFName.of('Contents'))?.decodeText?.()||'';
    const r=a.get(PDFName.of('Rect'))?.asArray().map(x=>x.asNumber());
    if(!r)continue;
    if(/^GS\s*\d+$/.test(sub))gs.push({id:'real-gs-'+p+'-'+gs.length,code:sub.replace(/\s/g,''),page:p,rect:r});
    if(/^200154-28-24-\d+$/.test(content))markers.push({full:content,page:p,rect:r});
   }
  }
  const first=markers.find(m=>m.full==='200154-28-24-1');
  const center=r=>[(r[0]+r[2])/2,(r[1]+r[3])/2],pos=center(first.rect);
  const anchorGS=gs.filter(g=>g.page===first.page&&g.code==='GS4').sort((a,b)=>Math.hypot(center(a.rect)[0]-pos[0],center(a.rect)[1]-pos[1])-Math.hypot(center(b.rect)[0]-pos[0],center(b.rect)[1]-pos[1]))[0];
  const realAnchor={id:'real-anchor',page:first.page,rect:first.rect,objectNo:'200154-28',modelCode:'24',serialNumber:'1',sourceText:first.full,linkedGsId:anchorGS.id,gsLinkConfirmed:true};
  const real=setup(bytes,gs,idx,texts,[realAnchor],pdf.numPages);real.api.groupRows=group;
  await real.module.scanFromSidebar('200154-28');
  assert.equal(real.items.length,17,'whole pipeline finds 17 real PDF markings');
  assert.equal(realAnchor.linkedGsId,anchorGS.id,'first real manual link is retained');
  const linked=real.items.map(o=>real.module.getLinkedPosition(o)).filter(Boolean);
  assert.equal(new Set(linked.map(g=>g.id)).size,linked.length,'no duplicated GS assignments');
  console.log('Real PDF:',real.api.lastStatus);
  await pdf.destroy();
 }
 console.log('Full scan/reference/arrow validation, wrong-model and ambiguity checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
