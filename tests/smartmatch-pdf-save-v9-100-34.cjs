'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const lib=require('pdf-lib'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','system-ui');
global.document={createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1)}};
const api=require('../smartmatch-pdf-visuals-v9-100-34.js'),source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-main-v524.js'),'utf8');
const extract=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j)};
const box={PDFLib:lib,window:{SmartMatchPositionChanges:{active:()=>[]}},document,console,instances:[]};vm.createContext(box);
vm.runInContext(extract('function smartRemoveOldProgressStreams(','async function appendCompactProjectPdf(')+extract('function smartRemoveDrawingNoteStreams(','async function buildPortableProjectPdf('),box);
const N=lib.PDFName,index=(d,key)=>d.catalog.lookup(N.of(key),lib.PDFArray),contentCount=d=>d.getPages().map(p=>p.node.normalizedEntries().Contents.size());
(async()=>{
 const doc=await lib.PDFDocument.create(),font=await doc.embedFont(lib.StandardFonts.Helvetica),payload={textChecks:[],automationItems:[],drawingNotes:[]},original=[];
 for(const [i,turn]of [0,90,180,270].entries()){
  const page=doc.addPage([660,860]);page.setCropBox(20,30,600,800);page.setRotation(lib.degrees(turn));const g=box.smartProgressDisplayGeometry(page);
  const pdfRect=(x,y,w,h)=>{const a=g.toPdf(x,y),b=g.toPdf(x+w,y+h);return [Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y)]};
  const origin=g.toPdf(32,50);page.drawText('SOURCE '+turn+' - original drawing',{x:origin.x,y:origin.y,font,size:14,rotate:lib.degrees(turn)});original.push(page.contentStreamRef);
  page.contentStream=undefined;page.contentStreamRef=undefined;
  payload.textChecks.push({id:'text'+i,page:i+1,rect:pdfRect(80,90,80,28),name:i===1?'Dörr 16':'16',color:i===2?'#102530':'#74d8d0',kind:i===0?'region':'label',status:'done',comment:'Internal comment'});
  const gs=pdfRect(100,220,50,25),da=pdfRect(380,220,90,25);
  for(const [name,r]of [['GS15',gs],['ED100',da]]){const p=g.rectToDisplay(r),o=g.toPdf(p.left,p.bottom);page.drawRectangle({x:o.x,y:o.y,width:p.width,height:p.height,rotate:lib.degrees(turn),borderColor:lib.rgb(.3,.3,.3),borderWidth:1});page.drawText(name,{x:o.x,y:o.y,size:12,font,rotate:lib.degrees(turn)});}
  payload.automationItems.push({id:'da'+i,page:i+1,rect:da,linkedGsRect:gs,linkedGsCode:'GS15',objectNo:String(i),gsLinkConfirmed:true,arrowTip:{u:1,v:.5}});
 }
 const snapshot=JSON.stringify(payload);
 await api.flatten(doc,payload,lib,box.smartProgressDisplayGeometry);api.verify(doc,payload,lib);assert.equal(JSON.stringify(payload),snapshot,'export preserves editable state');
 assert.equal(index(doc,'SmartMatch134VisualStreams').size(),8);assert(doc.getPages().every(p=>!p.node.Annots()?.size()),'labels and arrows do not add PDF links');
 const counts=contentCount(doc);await api.flatten(doc,payload,lib,box.smartProgressDisplayGeometry);assert.deepEqual(contentCount(doc),counts,'resave replaces its streams without duplication');
 // An old percentage is removed; source content and real change flags are not erased.
 const page=doc.getPage(0),old=doc.context.register(doc.context.flateStream('q % LEGACY 100%\nQ\n'));page.node.addContentStream(old);doc.catalog.set(N.of('SmartMatch36ProgressStreams'),doc.context.obj([[page.ref,old]]));
 await box.smartFlattenProgressBadges(doc,doc.getPages(),[{id:'gs',page:1,rect:[100,100,130,120],progress:100}]);assert.equal(index(doc,'SmartMatch36ProgressStreams').size(),0);assert(!page.node.normalizedEntries().Contents.asArray().some(r=>String(r)===String(old)));
 const legend=doc.context.register(doc.context.flateStream('q % OLD COLOUR LEGEND\nQ\n'));page.node.addContentStream(legend);doc.catalog.set(N.of('SmartMatch106NoteStreams'),doc.context.obj([[page.ref,legend,[]]]));
 payload.drawingNotes=[{type:'image',name:'SmartMatch färgförklaring'}];await box.smartFlattenDrawingNotes(doc,api.exportNotes(payload.drawingNotes));assert.equal(index(doc,'SmartMatch106NoteStreams').size(),0);assert(!page.node.normalizedEntries().Contents.asArray().some(r=>String(r)===String(legend)));
 assert.equal(api.exportNotes([{type:'image',name:'Customer photo'}]).length,1,'other images retained');
 assert.equal(api.arrows([...payload.automationItems,payload.automationItems[0]]).length,4,'duplicates drawn once');assert.equal(api.arrows([{...payload.automationItems[0],gsLinkDismissed:true}]).length,0,'dismissed link omitted');assert.equal(api.arrows(payload.automationItems,()=>null).length,0,'invalid links omitted');
 // The filled triangle's tip is the nearest edge of the DA, not the GS.
 const entries=index(doc,'SmartMatch134VisualStreams').asArray(),entry=doc.context.lookup(entries[4],lib.PDFArray),stream=doc.context.lookup(entry.get(1));const commands=Buffer.from(lib.decodePDFRawStream(stream).decode()).toString();const tip=box.smartProgressDisplayGeometry(page).toPdf(380,232.5);assert(commands.includes(`${tip.x} ${tip.y} l S`),commands);
 const data=await doc.save(),loaded=await lib.PDFDocument.load(data);api.verify(loaded,payload,lib);assert.equal(loaded.getPageCount(),4);
 fs.mkdirSync('/tmp/smartmatch-pdf-qa',{recursive:true});fs.writeFileSync('/tmp/smartmatch-pdf-qa/stamps-arrows.pdf',data);
 const loadedCounts=contentCount(loaded);const changed=JSON.parse(JSON.stringify(payload));changed.textChecks[0].name='17';changed.textChecks[0].rect=changed.textChecks[0].rect.map((v,i)=>v+(i%2?0:20));await api.flatten(loaded,changed,lib,box.smartProgressDisplayGeometry);api.verify(loaded,changed,lib);assert.deepEqual(contentCount(loaded),loadedCounts,'moved and renamed label replaces old content');
 assert.equal(api.remove(loaded,lib),8);assert.equal(api.remove(loaded,lib),0,'display cleanup is idempotent');assert(loaded.getPages().every((p,i)=>p.node.normalizedEntries().Contents.asArray().some(r=>String(r)===String(original[i]))),'source survives cleanup');
 console.log('PASS: real PDF, 4 rotations, CropBox, Unicode stamps, arrow direction, no links, resave, legacy percentages/legend cleanup and display-copy cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
