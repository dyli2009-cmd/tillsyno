const assert=require('node:assert/strict'),core=require('../detector-scan-test/core.js');
const profile={version:1,width:48,height:24,textHeight:14,angle:0};
function image(w=420,h=240){return{width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)};}
function line(im,x1,y1,x2,y2,color=0){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){const i=(y*im.width+x)*4;im.data.set([color,color,color,255],i);}}
function frame(im,x,y,w,h,broken=false){line(im,x,y,x+w,y);line(im,x,y+h,x+w,y+h);line(im,x,y,x,y+h);if(!broken)line(im,x+w,y,x+w,y+h);}
const im=image();frame(im,10,10,48,24);frame(im,90,10,24,24);frame(im,150,10,78,24);frame(im,10,100,48,24,true);frame(im,270,10,95,80);frame(im,300,120,24,48);
const f=core.framesFromPixels(im,profile);assert.equal(f.length,4);assert(f.some(b=>b.left===90&&b.right===114));assert(f.some(b=>b.left===150&&b.right===228));assert(f.some(b=>b.left===300&&b.bottom===168));assert(!f.some(b=>b.left===10&&b.top===100));assert(!f.some(b=>b.left===270));
const scaled=image();frame(scaled,20,20,96,48);assert.equal(core.framesFromPixels(scaled,profile,2).length,1);
// Opposite corners of a magnified bitmap may differ by a drawing pixel.
const soft=image();line(soft,44,30,164,30);line(soft,40,110,164,110);line(soft,40,31,44,110);line(soft,164,30,164,110);
assert.equal(core.framesFromPixels(soft,{...profile,width:60,height:40},2).length,1);
const blank=image();frame(blank,20,20,48,24);const inkBox={left:20,top:20,right:68,bottom:44};
assert.equal(core.hasFrameInk(blank,inkBox),false,'An empty border is not an OCR candidate');line(blank,42,27,45,37);assert.equal(core.hasFrameInk(blank,inkBox),true,'Interior numeral strokes are retained');
const viewport={width:600,height:400},hits=[{code:'1',width:24/600,height:24/400,textHeight:14/400},{code:'1041',width:48/600,height:24/400,textHeight:14/400},{code:'007',width:48/600,height:24/400,textHeight:14/400},{code:'9999',width:200/600,height:100/400,textHeight:60/400}];
assert.deepEqual(core.filterByProfile(hits,profile,viewport).map(h=>h.code),['1','1041','007']);assert(core.validProfile(profile));assert(!core.validProfile({...profile,width:NaN}));assert(!core.validProfile({...profile,version:99}));
console.log('PASS: learned size, short/long numbers, leading zero, alternate orientation, scaled pixels, open/oversized-frame rejection and invalid-profile guard.');
