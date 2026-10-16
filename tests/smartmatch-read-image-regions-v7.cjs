'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const names=['save','restore','transform','paintFormXObjectBegin','paintFormXObjectEnd','beginGroup','endGroup','paintImageXObject','paintInlineImageXObject','paintImageMaskXObject','paintSolidColorImageMask','paintImageXObjectRepeat','paintImageMaskXObjectRepeat','paintImageMaskXObjectGroup','paintInlineImageXObjectGroup','constructPath','fill','setFillColorN','paintUnknownImage','beginAnnotation','endAnnotation'];
const OPS=Object.fromEntries(names.map((name,index)=>[name,index+1]));
const window={pdfjsLib:{OPS}};
vm.runInNewContext(fs.readFileSync(require.resolve('../smartmatch-read-image-regions-v7.js'),'utf8'),{window});
const {hasImages}=window.SmartMatchReadImageRegions;
function page(operations,viewport){
 let calls=0;
 return {get calls(){return calls;},getViewport:()=>viewport||{width:1000,height:1000,convertToViewportPoint:(x,y)=>[x,1000-y]},getOperatorList:async options=>{
  assert.equal(options.annotationMode,0,'hidden annotation appearances are excluded');calls++;
  return {fnArray:operations.map(([name])=>OPS[name]),argsArray:operations.map(([,args])=>args||[])};
 }};
}
const rect=(x,y,w=.1,h=.1)=>({x,y,w,h});
(async()=>{
 const logo=page([['save'],['transform',[100,0,0,50,800,900]],['paintImageXObject',['logo',100,50]],['restore']]);
 assert.equal(await hasImages(logo,rect(.1,.1)),false,'a logo elsewhere on the page does not force selected text through OCR');
 assert.equal(await hasImages(logo,rect(.8,.05)),true,'actual logo bounds remain image content');
 assert.equal(logo.calls,1,'operator classification is cached for subsequent selected regions');
 const table=page([['save'],['transform',[500,0,0,200,100,300]],['paintInlineImageXObject',[{}]],['restore']]);
 assert.equal(await hasImages(table,rect(.2,.55)),true,'a mixed native/raster table retains its image fallback');
 assert.equal(await hasImages(table,rect(.7,.55)),false);
 const native=page([['constructPath',[[],[],[]]],['fill']]);
 assert.equal(await hasImages(native,rect(.1,.1)),false,'pure PDF text/vector content does not need image OCR');
 const nested=page([['transform',[2,0,0,2,100,100]],['paintFormXObjectBegin',[[1,0,0,1,50,50],[0,0,100,100]]],['save'],['transform',[100,0,0,100,0,0]],['paintImageMaskXObject',[{}]],['restore'],['paintFormXObjectEnd'],['save'],['transform',[50,0,0,50,300,300]],['paintSolidColorImageMask'],['restore']]);
 assert.equal(await hasImages(nested,rect(.2,.6)),true,'nested forms concatenate their matrix with the parent CTM');
 assert.equal(await hasImages(nested,rect(.7,.2)),true,'leaving a form restores the parent transform');
 assert.equal(await hasImages(nested,rect(.05,.05)),false);
 const rotated=page([['transform',[100,0,0,200,100,300]],['paintImageXObject',['r']]],{width:1000,height:1000,transform:[0,1,1,0,0,0]});
 assert.equal(await hasImages(rotated,rect(.3,.1,.2,.1)),true,'viewport rotation maps the PDF image into the same coordinates as the user selection');
 assert.equal(await hasImages(rotated,rect(.1,.5)),false);
 const repeated=page([['paintImageXObjectRepeat',['id',100,80,new Float32Array([100,100,800,800])]]]);
 assert.equal(await hasImages(repeated,rect(.8,.12,.1,.08)),true,'repeated raster images use their individual transforms');
 assert.equal(await hasImages(repeated,rect(.4,.4)),false);
 const masks=page([['paintImageMaskXObjectRepeat',[{},80,20,0,50,new Float32Array([100,100])]],['paintImageMaskXObjectGroup',[[{transform:[50,0,0,60,400,400]}]]],['paintInlineImageXObjectGroup',[{},[{transform:[70,0,0,80,700,700]}]]]]);
 assert.equal(await hasImages(masks,rect(.1,.83,.08,.07)),true);
 assert.equal(await hasImages(masks,rect(.4,.54,.05,.06)),true);
 assert.equal(await hasImages(masks,rect(.7,.22,.07,.08)),true);
 assert.equal(await hasImages(masks,rect(.9,.9,.05,.05)),false);
 const group=page([['beginGroup',[{matrix:[1,0,0,1,100,200]}]],['transform',[100,0,0,50,100,100]],['paintImageXObject',['g']],['endGroup']]);
 assert.equal(await hasImages(group,rect(.2,.65,.1,.05)),true,'transparency group matrices participate in image placement');
 for(const operations of [
  [['paintUnknownImage']],
  [['transform',[1,0,0,1,NaN,0]]],
  [['restore']],
  [['save']],
  [['paintInlineImageXObjectGroup',[{},[{transform:[1]}]]]],
  [['paintImageMaskXObjectGroup',[[{}]]]],
  [['setFillColorN',[['TilingPattern',{}]]]],
  [['beginAnnotation']]
 ])assert.equal(await hasImages(page(operations),rect(.1,.1)),true,'unsupported or malformed geometry conservatively retains OCR');
 assert.equal(await hasImages({getViewport(){},getOperatorList:async()=>{throw Error('provider failed');}},rect(.1,.1)),true,'operator-list failures retain image fallback');
 assert.equal(await hasImages(logo,rect(.1,.1,0,.2)),true,'invalid selection geometry cannot suppress fallback');
 console.log('PASS TEST 7 selected raster regions, cache, mixed tables, PDF forms, rotation, repeats, groups and conservative OCR fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
