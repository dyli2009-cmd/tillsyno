const assert=require('node:assert/strict'),core=require('../detector-scan-core.js');
const base={width:.04,height:.02,textHeight:.014,angle:0,manual:true};
const wide=core.resizeBox(base,'width',250);assert.equal(wide.width,.1);assert.equal(wide.height,base.height);assert.equal(wide.textHeight,base.textHeight);assert.equal(core.boxScale(wide,'width'),250);assert.equal(base.baseWidth,undefined);
const tall=core.resizeBox(wide,'height',200);assert.equal(tall.width,.1);assert.equal(tall.height,.04);assert.equal(tall.textHeight,.028);
const again=core.resizeBox(tall,'width',300);assert.equal(again.width,.12);assert.equal(again.height,.04); // No compounding after save/reopen.
const reset=core.resizeBox(core.resizeBox(JSON.parse(JSON.stringify(again)),'width',100),'height',100);for(const key of ['width','height','textHeight'])assert.equal(reset[key],base[key]);
const vertical={width:.02,height:.04,textHeight:.014,angle:90,manual:true};
const vWide=core.resizeBox(vertical,'width',200,270);assert.equal(vWide.width,.02);assert.equal(vWide.height,.08);assert.equal(vWide.textHeight,.014);assert.equal(core.boxScale(vWide,'width',270),200);
const vTall=core.resizeBox(vWide,'height',150,270);assert.equal(vTall.width,.03);assert.equal(vTall.height,.08);assert.equal(vTall.textHeight,.021);
assert.equal(core.boxScale(vTall,'width',0),150);assert.equal(core.boxScale(vTall,'height',0),200);
for(const [box,unit]of [[base,2.4],[vertical,4.8],[{...base,width:.005},6.2]]){const size=core.fitLabelSize(box,600,800,unit),a=box.angle*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));assert(size*(c*unit+s)<=box.width*600+.00001);assert(size*(s*unit+c)<=box.height*800+.00001);}
assert.equal(core.resizeBox(base,'width',10000).width,base.width*6);assert.equal(core.resizeBox(base,'height',1).height,base.height*.25);assert.deepEqual(core.resizeBox(base,'height',NaN),base);
const item={type:'detector',uid:'one',page:1,x:.3,y:.3,detectorBox:core.resizeBox(base,'width',600)};
assert(core.samePosition(item,{page:1,x:.3,y:.3,width:.04,height:.02}));assert(!core.samePosition(item,{page:1,x:.34,y:.3,width:.04,height:.02}));
console.log('PASS: independent width/height, rotated view axes, stable saved baselines, reset, text fit, bounds and separate identities after enlargement.');
