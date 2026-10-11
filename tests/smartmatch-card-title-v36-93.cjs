const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync('project-workspace-smartmatch-v36-93.js','utf8');
function fn(name){const a=source.indexOf('function '+name+'(');assert.ok(a>=0);return source.slice(a,source.indexOf('\n}',a)+2)}
const c=vm.createContext({isAdministrativeWorkLine:()=>false,isGsWorkLine:()=>false,labHeaderRows:()=>[]});
vm.runInContext(['groupLines','smartNormalizeCardLabel','smartRowDoorCode','smartTableCardIdentity','smartFirstCardIdentity'].map(fn).join('\n'),c);
function table(id){return {items:[{text:id,x:70,y:720,w:id.length*5,h:10},{text:'Dörrautomatik',x:70,y:700,w:80,h:10},{text:'ED100',x:280,y:700,w:35,h:10},{text:'Låshus',x:70,y:680,w:40,h:10},{text:'ASSA ABLOY',x:280,y:680,w:65,h:10}]}}
assert.equal(c.smartFirstCardIdentity(table('Dörrkort Teknik'),842)?.code,'TEKNIK');
assert.equal(c.smartFirstCardIdentity(table('Dörrkort Kontor'),842)?.code,'KONTOR');
for(const [raw,expected] of [['GS1','GS1'],['GS 1','GS1'],['Dörrkort GS1','GS1'],['Dörrkort GS1 1','GS1'],['Dörrkort 140 C','140C'],['Dörrkort 1','1'],['Dörrkort 2','2'],['GC1','GC1'],['WC GS1 1','GS1'],['A-105','A105']])assert.equal(c.smartFirstCardIdentity(table(raw),842)?.code,expected,raw);
assert.equal(c.smartFirstCardIdentity(table('Teknik'),842),null,'bare administrative/room word is still blocked');
assert.equal(c.smartFirstCardIdentity(table('GS1 GS2'),842),null,'ambiguous first cell remains unresolved');
const noId=table('Komponent');noId.items.push({text:'GS2',x:280,y:720,w:20,h:10});assert.equal(c.smartFirstCardIdentity(noId,842),null,'right cell never replaces ID');
const fixtures=fs.existsSync('tests/fixtures/snidaren-card-headers-v36-87.json')?'tests/fixtures/snidaren-card-headers-v36-87.json':'snidaren-card-header-fixtures.json';
for(const f of JSON.parse(fs.readFileSync(fixtures,'utf8')))assert.equal(c.smartFirstCardIdentity({items:f.items},842)?.code,f.expected,'old Snidaren card page '+f.page);
(async()=>{
 if(process.argv[2]){
  const pdfjs=require(path.resolve(fs.existsSync('vendor/pdf.min.js')?'vendor/pdf.min.js':'pdf-runtime.cjs'));pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(fs.existsSync('vendor/pdf.worker.min.js')?'vendor/pdf.worker.min.js':'pdf.worker.cjs');
  const d=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))}).promise;assert.equal(d.numPages,1);
  const tc=await(await d.getPage(1)).getTextContent();const items=tc.items.map(i=>({text:(i.str||'').trim(),x:i.transform[4],y:i.transform[5],w:i.width,h:Math.max(i.height,1)})).filter(i=>i.text);
  assert.equal(c.smartFirstCardIdentity({items},842)?.code,'TEKNIK','actual supplied PDF first spanning cell');await d.destroy();
 }
 console.log('Explicit named title, existing numeric/GS codes, first-cell restrictions and all 15 previous card fixtures passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
