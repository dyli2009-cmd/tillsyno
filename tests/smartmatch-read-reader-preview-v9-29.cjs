'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../smartmatch-read-test-v9-29.js'),'utf8');
const render=source.match(/async function render\(\)\{[\s\S]*?\n \}/)?.[0]||'';

assert(render,'reader preview render function exists');
assert.match(render,/const raster=pg\.getViewport\(\{scale:vp\.scale\*ratio\}\)/,'PDF.js receives the effective raster scale');
assert.match(render,/canvas\.width=Math\.ceil\(raster\.width\);canvas\.height=Math\.ceil\(raster\.height\)/,'backing canvas follows the bounded raster viewport');
assert.match(render,/sizePreview\(vp\.width,vp\.height\)/,'CSS preview keeps the logical fitted size');
assert.match(render,/pg\.render\(\{canvasContext:canvas\.getContext\('2d',\{alpha:false\}\),viewport:raster\}\)/,'reader paints with the native raster viewport');
assert.doesNotMatch(render,/transform:\s*\[ratio/,'reader does not apply DPR through an external transform');
assert.equal((render.match(/pg\.render\(/g)||[]).length,1,'each preview update starts one PDF render pass');
assert.match(render,/Math\.sqrt\(2800000\/\(vp\.width\*vp\.height\)\)/,'the existing 2.8 MP preview budget remains enforced');

console.log('PASS TEST 9.29 reader preview uses one bounded native-raster PDF.js pass');
