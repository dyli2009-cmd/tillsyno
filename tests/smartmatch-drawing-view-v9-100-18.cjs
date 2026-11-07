const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const view=require('../smartmatch-drawing-view-v9-100-18.js'),src=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
function extract(start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return src.slice(a,b)}
const notes=[{id:'saved',page:1,text:'Sparad märkning',rect:[1,2,3,4]}],el={toolUndo:{},toolRedo:{},toolDelete:{}};
const c=vm.createContext({window:{},el,page:1,drawingNotes:notes,drawingUndoStack:[],drawingRedoStack:[],selectedDrawingNoteId:'',inlineNoteDraft:null,drawingViewport:null,noteById:()=>null,syncDrawingNoteAutomation:()=>{},save:()=>{},renderAutomationMarkers:()=>{},smartCancelInlineNote:()=>{}});
vm.runInContext(extract('function cloneDrawingNotes(','function drawingNoteIdentity(')+extract('function applyDrawingSnapshot(','function viewportRect('),c);
vm.runInContext('updateDrawingHistoryButtons();undoDrawingNote()',c);assert.equal(el.toolUndo.disabled,true);assert.equal(c.drawingNotes.length,1,'saved mark must survive empty undo');
vm.runInContext("rememberDrawingState();drawingNotes.push({id:'new',page:1,text:'Ny markering'});updateDrawingHistoryButtons()",c);assert.equal(el.toolUndo.disabled,false);
vm.runInContext('undoDrawingNote()',c);assert.equal(c.drawingNotes.length,1);assert.equal(c.drawingNotes[0].id,'saved');assert.equal(el.toolUndo.disabled,true);assert.equal(el.toolRedo.disabled,false);
vm.runInContext('redoDrawingNote()',c);assert.equal(c.drawingNotes.length,2);
vm.runInContext('drawingUndoStack=[];drawingRedoStack=[];updateDrawingHistoryButtons();undoDrawingNote()',c);assert.equal(c.drawingNotes.length,2);assert.equal(el.toolUndo.disabled,true);
vm.runInContext('rememberDrawingState();drawingNotes[1].text="Ändrad";undoDrawingNote()',c);assert.equal(c.drawingNotes[1].text,'Ny markering');
for(const f of ['function smartResetWorkspace(){','async function openFile(']){if(!src.includes(f))continue;const part=src.slice(src.indexOf(f),src.indexOf(f)+19000);assert.match(part,/drawingUndoStack=\[\]/)}
const scales=[.1,.25,.5,1,2].map(z=>view.badgeScale(48*z,24*z));scales.forEach((v,i)=>assert(Math.abs(v-[.1,.25,.5,1,1][i])<1e-12));assert.equal(view.badgeScale(10,5),5/24);
const stage={width:1000,height:500},box={left:10,top:20};const g={startScale:1,targetScale:2,focus:{x:.25,y:.4},center:{x:210,y:220}};
let r=view.previewRect(stage,box,g);assert.equal(r.x+g.focus.x*r.width,g.center.x-box.left);assert.equal(r.y+g.focus.y*r.height,g.center.y-box.top);
g.targetScale=.2;r=view.previewRect(stage,box,g);assert.equal(r.x+g.focus.x*r.width,200);assert.equal(r.width,200);
// Actual iOS touch handlers: one bounded paint per frame and no stage transform.
let queued,paints=0,disposed=0,rendered=0;
const v={scrollLeft:0,scrollTop:0,scrollWidth:1000,clientWidth:600};
const touch=vm.createContext({pdf:{},drawingNoteDrag:null,drawingToolGesture:null,drawingTool:'',drawingTouch:null,drawingTouchPreviewFrame:0,drawingPinchPreview:null,DRAWING_IS_IOS:true,scale:1,drawingRenderVersion:0,
 el:{viewer:v,stage:{style:{}},canvas:{},drawingNotes:{},zoomInfo:{}},window:{SmartMatchDrawingView:{begin:()=>({paint:()=>paints++,dispose:()=>disposed++})}},
 cancelDrawingWheelZoom:()=>{},clearDrawingDetail:()=>{},drawingFocusRatios:(x,y)=>({x:.5,y:.5,clientX:x,clientY:y}),clampDrawingScale:x=>Math.max(.1,Math.min(8,x)),requestAnimationFrame:cb=>{queued=cb;return 1},cancelAnimationFrame:()=>{},renderDrawing:()=>{rendered++;return Promise.resolve()},inlineNoteDraft:null,changeDrawingPage:()=>{}});
vm.runInContext(extract('function drawingTouchCenter(','async function changeDrawingPage(')+extract('async function endDrawingTouch(','async function fitDrawing('),touch);
const event=(width)=>({preventDefault(){},target:{closest:()=>null},touches:[{clientX:100-width/2,clientY:100},{clientX:100+width/2,clientY:100}]});touch.e=event(100);vm.runInContext('beginDrawingTouch(e)',touch);touch.e=event(150);vm.runInContext('moveDrawingTouch(e);moveDrawingTouch(e)',touch);assert.equal(rendered,0);queued();assert.equal(paints,1);assert.equal(touch.el.stage.style.transform,undefined);
(async()=>{touch.e={touches:[]};await vm.runInContext('endDrawingTouch(e)',touch);assert.equal(touch.scale,1.5);assert.equal(rendered,1);assert.equal(disposed,1);assert.equal(touch.drawingPinchPreview,null);console.log('PASS: saved notes protected, per-opening undo/redo, proportional badges, anchored zoom and bounded iOS touch lifecycle')})().catch(e=>{console.error(e);process.exitCode=1});
