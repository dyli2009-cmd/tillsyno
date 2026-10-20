'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const PDFLib=require(path.join(root,'vendor/pdf-lib.min.js'));
const writer=require(path.join(root,'smartmatch-read-project-writer-v9-79.js'));
const reader=require(path.join(root,'smartmatch-read-project-v9-29.js'));
const N=PDFLib.PDFName,keys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'];
const noPaint=async()=>{};
function legacyParser(){
 const source=fs.readFileSync(path.join(root,'smartmatch-slr-test-main-v36-133.js'),'utf8');
 const start=source.indexOf('function parsePdfEmbeddedJson('),end=source.indexOf('\nfunction decodePdfText(',start);
 assert(start>=0&&end>start);const context=vm.createContext({});
 vm.runInContext(source.slice(start,end)+';globalThis.parse=parsePdfEmbeddedJson;',context);return context.parse;
}
async function roundtrip(payload,metadata){
 const doc=await PDFLib.PDFDocument.create();doc.addPage([200,200]);
 for(const key of keys)doc.catalog.set(N.of(key),metadata);
 const reopened=await PDFLib.PDFDocument.load(await doc.save({useObjectStreams:true}));
 assert.deepEqual(reader.read(reopened,PDFLib).payload,payload);
 for(const key of keys){
  const raw=reopened.catalog.get(N.of(key));assert(raw instanceof PDFLib.PDFHexString,'legacy keys retain direct standard PDF strings');
  assert.deepEqual(JSON.parse(raw.decodeText()),payload);
  assert.equal(JSON.stringify(legacyParser()(raw,'Projektinformation')),JSON.stringify(payload));
 }
 return reopened;
}
// Run each benchmark in a separate process, for example:
// node --expose-gc tests/smartmatch-project-writer-v9-79.cjs --bench=vendor
// node --expose-gc tests/smartmatch-project-writer-v9-79.cjs --bench=writer
// This reports this runtime's allocation; it does not measure physical Safari.
const benchmark=process.argv.find(arg=>arg.startsWith('--bench='))?.slice('--bench='.length);
if(benchmark){
 (async()=>{
  assert(['vendor','writer'].includes(benchmark),'--bench must be vendor or writer');
  const payload={readTestData:{text:'A'.repeat(4*1024*1024)}};
  global.gc?.();const before=process.memoryUsage(),started=performance.now();
  const metadata=benchmark==='vendor'?PDFLib.PDFHexString.fromText(JSON.stringify(payload)):await writer.create(payload,PDFLib,noPaint);
  const after=process.memoryUsage();
  console.log(JSON.stringify({mode:benchmark,payloadTextCodeUnits:payload.readTestData.text.length,hexChars:metadata.asString().length,
   elapsedMs:Math.round(performance.now()-started),heapBeforeMiB:Math.round(before.heapUsed/1048576),heapAfterMiB:Math.round(after.heapUsed/1048576),
   rssBeforeMiB:Math.round(before.rss/1048576),rssAfterMiB:Math.round(after.rss/1048576),peakRssMiB:Math.round(process.resourceUsage().maxRSS/1024)}));
 })().catch(error=>{console.error(error);process.exitCode=1});
}else{
 (async()=>{
  // Browser loading exposes the same API without a CommonJS module.
  const context=vm.createContext({setTimeout});
  vm.runInContext(fs.readFileSync(path.join(root,'smartmatch-read-project-writer-v9-79.js'),'utf8'),context);
  assert.equal(typeof context.SmartMatchReadProjectWriterV979.create,'function');
  const prefix=JSON.stringify({text:''}).indexOf('""')+1;
  const boundary={text:'A'.repeat(8191-prefix)+'🚪'+'B'.repeat(8192)};
  assert.equal(JSON.stringify(boundary).charCodeAt(8191),0xd83d,'emoji starts at the last unit of an encoding block');
  const cases=[{text:'Åäö / dörr 🚪 / 漢字 / (parentes) \\ " citat\n\r\t\b\f\u0000'},boundary,
   {text:'\ud800 lone high / \udc00 lone low',array:[1,true,null,undefined,NaN,Infinity,-0],omitted:undefined},
   {schema:6,readTestData:{cards:{}},automationItems:[],instances:{}}];
  for(const payload of cases){
   const expected=JSON.stringify(payload),before=JSON.stringify(payload),reports=[];
   const metadata=await writer.create(payload,PDFLib,async(...args)=>reports.push(args));
   assert(metadata instanceof PDFLib.PDFHexString);
   assert.equal(metadata.asString(),PDFLib.PDFHexString.fromText(expected).asString(),'encoding must be byte-identical to the established writer');
   assert.equal(JSON.stringify(payload),before,'writer must not mutate the project');
   assert.equal(reports[0][0],58);assert.equal(reports.at(-1)[0],62);
   assert(reports.every((r,i)=>r[0]>=58&&r[0]<=62&&(i===0||r[0]>=reports[i-1][0])));
  }
  let jsonCalls=0;
  await writer.create({toJSON(){jsonCalls++;return {value:'Å🚪'}}},PDFLib,noPaint);assert.equal(jsonCalls,1,'serialize the project exactly once');
  const payload={schema:6,sourceName:'Åtgärd 🚪.pdf',readTestData:{cards:{GS1:{work:[{label:'Lås (kontroll)',checked:true}]}}},automationItems:[],instances:{}};
  await roundtrip(payload,await writer.create(payload,PDFLib,noPaint));
  // Multi-megabyte metadata uses an independent UTF-16BE oracle, avoiding the
  // vendor's large temporary numeric arrays inside this normal regression test.
  const large={schema:6,readTestData:{text:'Å🚪abc\\'.repeat(310000)},automationItems:[],instances:{}};
  const json=JSON.stringify(large),reports=[];assert(json.length>2*1024*1024);
  const metadata=await writer.create(large,PDFLib,async(percent)=>reports.push(percent));
  const expected='FEFF'+Buffer.from(json,'utf16le').swap16().toString('hex').toUpperCase();
  assert.equal(metadata.asString(),expected);assert(reports.length>15,'large payload provides repeated paint/cancellation boundaries');
  // Current bounded reader handles large strings; decodeText in old PDFLib has
  // its own argument limit, so the legacy reader is covered with real PDFs above.
  assert.deepEqual(reader.parse(metadata),large);
  // An interrupted create never reaches the caller's installation step, leaving
  // both existing metadata keys and the PDF object graph untouched.
  const doc=await PDFLib.PDFDocument.create();doc.addPage();const original=PDFLib.PDFHexString.fromText('{"original":true}');
  for(const key of keys)doc.catalog.set(N.of(key),original);
  const objectCount=doc.context.enumerateIndirectObjects().length;let installs=0,encodedObjects=0;
  const trackedLib={PDFHexString:{of(hex){encodedObjects++;return PDFLib.PDFHexString.of(hex)}}};
  await assert.rejects(async()=>{
   const result=await writer.create(large,trackedLib,async percent=>{if(percent>=59)throw Error('cancelled during encoding')});
   for(const key of keys){doc.catalog.set(N.of(key),result);installs++;}
  },/cancelled during encoding/);
  assert.equal(encodedObjects,0);assert.equal(installs,0);assert.equal(doc.context.enumerateIndirectObjects().length,objectCount);
  for(const key of keys)assert.equal(doc.catalog.get(N.of(key)),original);
  // Cancellation at the final boundary still prevents installation.
  await assert.rejects(async()=>{
   const result=await writer.create(payload,PDFLib,async percent=>{if(percent===62)throw Error('cancelled before install')});
   doc.catalog.set(N.of(keys[0]),result);installs++;
  },/cancelled before install/);assert.equal(installs,0);
  await assert.rejects(()=>writer.create(undefined,PDFLib,noPaint),/Projektinformationen/);
  await assert.rejects(()=>writer.create({},null,noPaint),/PDF-kodaren/);
  console.log('PASS: vendor-byte parity, Swedish/Unicode/control text, surrogate block boundary, one JSON snapshot, unchanged payload, modern and legacy PDF roundtrips, multi-megabyte readback, bounded progress and cancellation without partial installation.');
 })().catch(error=>{console.error(error);process.exitCode=1});
}
