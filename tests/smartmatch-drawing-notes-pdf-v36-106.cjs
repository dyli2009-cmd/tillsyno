'use strict';
// Actual exporter + PDF serialization using a real Canvas runtime, followed by independent Poppler rendering.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),lib=require(path.join(root,'vendor/pdf-lib.min.js'));
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
// Match the browser's system-ui fallback in the headless Canvas runtime.
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','system-ui');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','system-ui');
const source=fs.readFileSync(path.join(root,'project-workspace-smartmatch-v36-106.js'),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b)}
const sandbox={PDFLib:lib,console,Map,Set,Number,Math,JSON,Uint8Array,
 document:{createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1)}},
 ctx:createCanvas(1,1).getContext('2d'),selectedDrawingNoteId:'',inlineNoteDraft:null};
vm.createContext(sandbox);
vm.runInContext(
 extract('function smartProgressDisplayGeometry(', 'function smartPickProgressPlacement(')+
 extract('const SMART_NOTE_COLORS=', 'function smartNoteArrowMarker(')+
 extract('function smartNoteScreenSize(', 'function appendStyledText(')+
 extract('function smartRemoveDrawingNoteStreams(', 'async function verifyPortableProjectPdf('),sandbox);
const {smartFlattenDrawingNotes:flatten,smartRemoveDrawingNoteStreams:remove,smartProgressDisplayGeometry:geometry}=sandbox;
const N=lib.PDFName;
function state(doc){return doc.catalog.lookup(N.of('SmartMatch106NoteStreams'),lib.PDFArray)}
const points=(g,x,y)=>g.toPdf(x,y);
(async()=>{
 const doc=await lib.PDFDocument.create(),font=await doc.embedFont(lib.StandardFonts.Helvetica);
 const notes=[];
 const photo=createCanvas(100,60),pc=photo.getContext('2d');pc.fillStyle='#ffc000';pc.fillRect(0,0,100,60);pc.fillStyle='#0057b7';pc.fillRect(0,0,35,60);
 for(const [i,turn]of [0,90,180,270].entries()){
  const pg=doc.addPage([620,820]);pg.setRotation(lib.degrees(turn));pg.setCropBox(20,30,580,760);
  pg.drawText('ORIGINAL VECTOR '+turn,{x:40,y:55,size:12,font});
  const g=geometry(pg),p=points(g,70,90),a=points(g,70,210),b=points(g,230,210),target=points(g,70,330),label=points(g,230,300);
  const r1=points(g,70,390),r2=points(g,230,490);
  notes.push({id:'text'+i,type:'text',page:i+1,x:p.x,y:p.y,text:'Åtgärd behövs\nDörren stänger ej',fontSize:18,color:'#d32f2f',frame:'round',background:'#ffffff'},
   {id:'arrow'+i,type:'arrow',page:i+1,x1:a.x,y1:a.y,x2:b.x,y2:b.y,color:'#1565c0',lineWidth:3},
   {id:'callout'+i,type:'callout',page:i+1,x1:target.x,y1:target.y,x2:label.x,y2:label.y,text:'Kontrollera låset',fontSize:16,color:'#168147'},
   {id:'photo'+i,type:'image',page:i+1,rect:[Math.min(r1.x,r2.x),Math.min(r1.y,r2.y),Math.max(r1.x,r2.x),Math.max(r1.y,r2.y)],dataUrl:photo.toDataURL('image/png')});
 }
 const baseline=await doc.save();
 const originals=doc.getPages().map(p=>p.node.normalizedEntries().Contents.asArray().map(String));
 await flatten(doc,notes);assert.equal(state(doc).size(),16);
 doc.catalog.set(N.of('TillsynoSmartMatchV36Data'),lib.PDFHexString.fromText(JSON.stringify({drawingNotes:notes})));
 const out=path.resolve(process.env.SMARTMATCH_TEST_OUTPUT||'/tmp/smartmatch106');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'visible.pdf'),await doc.save());
 const reopened=await lib.PDFDocument.load(await doc.save());
 assert.equal(JSON.parse(reopened.catalog.get(N.of('TillsynoSmartMatchV36Data')).decodeText()).drawingNotes.length,16);
 await flatten(reopened,notes);assert.equal(state(reopened).size(),16,'repeat export replaces generated streams');
 for(const [i,pg]of reopened.getPages().entries()){
  const refs=pg.node.normalizedEntries().Contents.asArray().map(String);assert.ok(originals[i].every(r=>refs.includes(r)),'original vector streams survive');
  const visible=state(reopened).asArray().map(v=>reopened.context.lookup(v)).filter(v=>String(v.get(0))===String(pg.ref));
  assert.equal(visible.length,4,'exactly four current visible notes');
  assert.ok(visible.every(v=>refs.includes(String(v.get(1)))),'all indexed streams actually present on page');
 }
 fs.writeFileSync(path.join(out,'reexport.pdf'),await reopened.save());
 const moved=notes.filter(n=>n.type==='text');moved[0]={...moved[0],x:moved[0].x+80,text:'Flyttad text'};
 await flatten(reopened,moved);assert.equal(state(reopened).size(),4,'removed images/arrows do not survive');
 fs.writeFileSync(path.join(out,'edited.pdf'),await reopened.save());
 assert.equal(remove(reopened),4,'workspace display copy removes only the painted note layer');
 fs.writeFileSync(path.join(out,'clean.pdf'),await reopened.save());
 fs.writeFileSync(path.join(out,'original.pdf'),baseline);
 assert.equal(state(reopened).size(),0);
 // Exercise the complete production build/verify pipeline, not only the note painter.
 Object.assign(sandbox,{bytes:baseline,instances:[],protocolMap:{},makeProjectPayload:()=>({drawingNotes:notes}),decodePdfText:v=>v.decodeText()});
 vm.runInContext(extract('function smartCompactPruneUnreachablePdfObjects(', 'function downloadProjectFile('),sandbox);
 const payload={drawingNotes:notes,automationItems:[],instances:{},projectRevision:1};
 const full=await sandbox.buildPortableProjectPdf(payload);
 await sandbox.verifyPortableProjectPdf(full,payload);
 fs.writeFileSync(path.join(out,'full-export.pdf'),full);
 sandbox.bytes=full;
 const repeated=await sandbox.buildPortableProjectPdf(payload);await sandbox.verifyPortableProjectPdf(repeated,payload);
 assert.ok(repeated.length<full.length*1.15,'repeat export does not retain old image resources');
 sandbox.bytes=repeated;
 const empty={...payload,drawingNotes:[]};const cleared=await sandbox.buildPortableProjectPdf(empty);
 await sandbox.verifyPortableProjectPdf(cleared,empty);
 const cleanDoc=await lib.PDFDocument.load(cleared);
 assert.ok(cleanDoc.getPages().every(p=>!p.node.normalizedEntries().Resources.lookup(N.of('XObject'),lib.PDFDict).keys().some(n=>n.toString().startsWith('/SMNoteImage-'))),'deleted image resources removed');
 await assert.rejects(()=>flatten(reopened,[{type:'text',page:99}]),/PDF-sida saknas/);
 console.log('PASS: all four tools, Swedish text, all rotations and offset CropBoxes, metadata, repeat export, move/delete, clean editable workspace and missing-page failure. Output: '+out);
})().catch(e=>{console.error(e);process.exitCode=1});
