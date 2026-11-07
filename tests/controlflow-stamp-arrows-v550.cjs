'use strict';
// Reads real, serialized PDF drawing operators: a wrong SVG/PDF y reflection,
// hollow head, lost width setting or tip circle must fail independently of the DOM.
const assert = require('node:assert/strict');
const PDFLib = require('pdf-lib');
const Style = require('../controlflow-stamp-style-v549.js');
let checks = 0;
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function near(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} vs ${expected}`); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }
const identity = () => [1,0,0,1,0,0];
function multiply(a, b) {
 return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
  a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
function transform(matrix, x, y) { return {x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]}; }
function readPaintedPaths(page) {
 const contents = page.node.Contents(), streams = contents instanceof PDFLib.PDFArray
  ? contents.asArray().map(ref => page.doc.context.lookup(ref, PDFLib.PDFRawStream)) : [contents];
 const source = streams.map(stream => Buffer.from(PDFLib.decodePDFRawStream(stream).decode()).toString()).join('\n');
 let matrix = identity(), points = [], closed = false, curves = false, strokeWidth = 0, lineCap = 0;
 const stack = [], painted = [];
 for (const line of source.split('\n')) {
  const parts = line.trim().split(/\s+/), op = parts.pop(), args = parts.map(Number);
  switch (op) {
   case 'q': stack.push({matrix:matrix.slice(),strokeWidth,lineCap}); break;
   case 'Q': ({matrix,strokeWidth,lineCap} = stack.pop()); break;
   case 'cm': matrix = multiply(matrix,args); break;
   case 'w': strokeWidth = args[0]; break;
   case 'J': lineCap = args[0]; break;
   case 'm': points = [transform(matrix,...args)];closed = false;curves = false;break;
   case 'l': points.push(transform(matrix,...args));break;
   case 'c': curves = true;break;
   case 'h': closed = true;break;
   case 'f': case 'S': case 'B': painted.push({op,points:points.slice(),closed,curves,strokeWidth,lineCap});points = [];break;
  }
 }
 return painted;
}

(async () => {
 const document = await PDFLib.PDFDocument.create(), font = await document.embedFont(PDFLib.StandardFonts.HelveticaBold);
 const viewport = {width:600,height:800,convertToPdfPoint:(x,y)=>[x,800-y]}, cases = [];
 for (const mode of ['security','revision']) for (const arrowScale of [.5,1,1.5,2,3]) {
  const reverse = arrowScale >= 2;
  const item = {uid:`${mode}-${arrowScale}`,type:mode === 'security' ? 'lock' : 'automation',page:1,
   x:reverse ? .2 : .8,y:arrowScale === 1 || arrowScale === 3 ? .2 : .8,labelX:.5,labelY:.5,
   customerStampScale:.85,customerArrowScale:arrowScale,positionLocked:true};
  const before = JSON.stringify(item), page = document.addPage([600,800]);
  Style.drawPdf(page,item,{mode,font,viewport,library:PDFLib,label:'D1',showTip:true,color:[35,131,84]});
  equal(JSON.stringify(item),before,mode + ': drawing does not alter saved size, position or lock');
  cases.push({item,mode,arrowScale});
 }
 const reopened = await PDFLib.PDFDocument.load(await document.save());
 for (const [index,test] of cases.entries()) {
  const {item,mode,arrowScale} = test, paths = readPaintedPaths(reopened.getPage(index));
  const triangles = paths.filter(path => path.op === 'f' && path.closed && path.points.length === 3 && !path.curves);
  equal(triangles.length,1,mode + ': serialized PDF has one closed, filled triangle');
  equal(paths.some(path => path.curves),false,mode + ': no permanent round tip is exported even with old showTip option');
  const triangle = triangles[0], [tip,a,b] = triangle.points;
  const target = {x:item.x*600,y:(1-item.y)*800}, label = {x:item.labelX*600,y:(1-item.labelY)*800};
  near(tip.x,target.x,mode + ': serialized triangle touches original x anchor');
  near(tip.y,target.y,mode + ': serialized triangle touches original y anchor');
  const distance = Math.hypot(target.x-label.x,target.y-label.y), ux = (target.x-label.x)/distance, uy = (target.y-label.y)/distance;
  const base = {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  near(Math.hypot(tip.x-base.x,tip.y-base.y),7*Math.sqrt(arrowScale),mode + ': selected width has a seven-point head at Normal');
  near(Math.hypot(a.x-b.x,a.y-b.y),7*Math.sqrt(arrowScale),mode + ': head is equally wide and long');
  near(Math.hypot(tip.x-a.x,tip.y-a.y),Math.hypot(tip.x-b.x,tip.y-b.y),mode + ': triangle sides are symmetric');
  near((base.x-tip.x)*uy-(base.y-tip.y)*ux,0,mode + ': head is centered on the leader');
  ok((base.x-tip.x)*ux+(base.y-tip.y)*uy<0,mode + ': base is behind the actual target');
  const shafts = paths.filter(path => path.op === 'S');
  equal(shafts.length,1,mode + ': one uniform shaft is exported');
  const shaft = shafts[0];
  near(shaft.strokeWidth,1.25*arrowScale,mode + ': individual width setting is preserved');
  equal(shaft.lineCap,1,mode + ': shaft has round ends');
  const end = shaft.points.at(-1);
  ok((end.x-base.x)*ux+(end.y-base.y)*uy>0,mode + ': shaft overlaps the filled head without a gap');
  const metrics = Style.metrics(item,'D1',mode,(text,size)=>font.widthOfTextAtSize(text,size));
  const start = shaft.points[0], localX = Math.abs(start.x-label.x), localY = Math.abs(start.y-label.y);
  near(Math.max(localX/(metrics.boxW/2),localY/(metrics.boxH/2)),1,mode + ': leader starts exactly at the label edge');
 }

 // A near-touching label must not create a backwards shaft or a head that
 // extends through the label. All four sides use the same short-leader rule.
 const metrics = Style.metrics({type:'lock',customerStampScale:1,customerArrowScale:1},'L1','security',()=>10);
 for (const [ux,uy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
  const edge = ux ? metrics.boxW/2 : metrics.boxH/2, distance = edge+4;
  const geometry = Style.geometry({x:200+ux*distance,y:200+uy*distance,labelX:200,labelY:200},metrics);
  ok(geometry.visible,'near-touching anchor remains visible');
  near(Math.hypot(geometry.headA.x-geometry.headB.x,geometry.headA.y-geometry.headB.y),4,'short head shrinks proportionally to available space');
  near(((geometry.headA.x+geometry.headB.x)/2-200)*ux+((geometry.headA.y+geometry.headB.y)/2-200)*uy,edge,'short head remains outside label');
  ok((geometry.end.x-geometry.start.x)*ux+(geometry.end.y-geometry.start.y)*uy>0,'short leader never reverses direction');
 }
 equal(Style.geometry({x:200,y:200,labelX:200,labelY:200},metrics).visible,false,'overlapping anchor stays hidden');
 console.log('controlflow-stamp-arrows-v550: '+checks+' assertions passed (serialized PDF vectors, symmetric filled heads, saved width and short leaders).');
})().catch(error => {console.error(error);process.exitCode = 1;});
