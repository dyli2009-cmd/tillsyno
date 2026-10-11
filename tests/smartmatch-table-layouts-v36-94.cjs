const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'project-workspace-smartmatch-v36-94.js'),'utf8');
const previous=fs.readFileSync(path.join(root,'project-workspace-smartmatch-v36-93.js'),'utf8');
function fn(source,name){
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,'missing '+name);
 return source.slice(start,source.indexOf('\n}',start)+2);
}
const readerNames=['groupLines','labHeaderRows','smartNormalizeCardLabel','smartRowDoorCode','smartTableCardIdentity','smartFirstCardIdentity'];
for(const name of readerNames)assert.equal(fn(current,name),fn(previous,name),'locked existing reader changed: '+name);
const context=vm.createContext({window:{},isAdministrativeWorkLine:()=>false,isGsWorkLine:()=>false});
vm.runInContext(readerNames.map(name=>fn(current,name)).join('\n'),context);
vm.runInContext(fs.readFileSync(path.join(root,'smartmatch-table-layouts-v36-94.js'),'utf8'),context);
const layouts=context.window.SmartMatchTableLayouts;
assert.equal(layouts.profiles.length,1);
assert.ok(Object.isFrozen(layouts)&&Object.isFrozen(layouts.profiles)&&Object.isFrozen(layouts.profiles[0]));
const options={groupLines:context.groupLines,normalizeCardLabel:context.smartNormalizeCardLabel};
function item(text,x,y,h=10){return {text,x,y,w:text.length*h*.49,h};}
function known(id='140C'){
 return {items:[item('Dorrkort '+id,78,750,18),item('Objekt: Kontorsdorr',78,723),
  item('Komponent',104,700),item('Produkt',284,700),
  item('Dorrautomatik',104,682),item('ED100',284,682),
  item('Lashus',104,664),item('Assa Abloy',284,664)]};
}
function identify(text){return layouts.identify(text,options);}
function combined(text){return context.smartFirstCardIdentity(text,842)||identify(text);}
function reject(label,change){const text=known();change(text);assert.equal(identify(text),null,label);}

for(const [raw,expected]of [['140C','140C'],['140 C','140C'],['VC','VC'],['WC','WC'],['HWC','HWC'],['130C','130C'],['GS1','GS1'],['GS 1','GS1'],['Teknik','TEKNIK'],['Kontor','KONTOR'],['1','1'],['2','2'],['A-105','A105']]){
 const text=known(raw);
 assert.equal(context.smartFirstCardIdentity(text,842),null,'new title/object layout must use added profile: '+raw);
 const result=identify(text);
 assert.equal(result?.code,expected,raw);
 assert.equal(result?.profileId,'card-title-object-components-v1');
 assert.equal(result?.area,'known-layout-card-heading');
}
for(const scale of [.5,1,2])for(const [dx,dy]of [[0,0],[115,-300]]){
 const text=known();
 text.items=text.items.map(i=>({...i,x:i.x*scale+dx,y:i.y*scale+dy,w:i.w*scale,h:i.h*scale}));
 assert.equal(identify(text)?.code,'140C','same relative geometry at scale '+scale+' translation '+dx+','+dy);
}
const accented=known('Teknik');accented.items[0].text='Dörrkort Teknik';accented.items[4].text='Dörrautomatik';
assert.equal(identify(accented)?.code,'TEKNIK','Swedish accents');
const empty=known();empty.items=empty.items.filter(i=>!(i.x===284&&i.y===682));
assert.equal(identify(empty)?.code,'140C','first hardware value may be empty');
const split=known('140C');split.items.splice(0,1,item('Dorrkort',78,750,18),item('140 C',158,750,18));
assert.equal(identify(split)?.code,'140C','adjacent PDF title fragments');
const branding=known();branding.items.push(item('Bygghandling Snidaren',78,810,18));
assert.equal(identify(branding)?.code,'140C','non-card project title above explicit card title');
const shortObject=known();shortObject.items[1].text='Objekt: X';
assert.equal(identify(shortObject)?.code,'140C','single-character object descriptor is sufficient');

reject('no explicit card title',t=>t.items[0].text='140C');
reject('object row required',t=>t.items.splice(1,1));
reject('empty object descriptor',t=>t.items[1].text='Objekt:');
reject('multiple explicit titles',t=>t.items.push(item('Dorrkort WC',78,805,18)));
reject('ambiguous title identifiers',t=>t.items[0].text='Dorrkort GS1 GS2');
reject('two numeric groups must not synthesize GS11',t=>t.items[0].text='Dorrkort GS1 1');
reject('qualified ambiguous title must not synthesize WCGS11',t=>t.items[0].text='Dorrkort WC GS1 1');
reject('missing identifier',t=>t.items[0].text='Dorrkort');
reject('drawing title',t=>t.items.push(item('Stor planritning med dorrkort',78,805,18)));
reject('drawing scale',t=>t.items.push(item('SKALA 1:100',78,805,10)));
reject('wrong table header',t=>t.items[2].text='Kontrollpunkt');
reject('wrong product header',t=>t.items[3].text='GS2');
reject('reversed table columns',t=>{t.items[2].text='Produkt';t.items[3].text='Komponent';});
reject('table columns too close',t=>t.items[3].x=145);
reject('title too far from object row',t=>t.items[0].y=800);
reject('object descriptor horizontally unrelated',t=>t.items[1].x=280);
reject('unrecognized first component',t=>t.items[4].text='GS2');
reject('missing body row',t=>t.items=t.items.slice(0,4));
reject('first component outside left column',t=>t.items[4].x=175);
reject('first product outside right column',t=>t.items[5].x=450);
reject('unrelated distant right-side text must not supply title ID',t=>t.items.splice(0,1,item('Dorrkort',78,750,18),item('GS2',500,750,18)));
assert.equal(layouts.identify(known()),null,'missing reader callbacks fail closed');
assert.equal(identify({items:[]}),null);

function firstCell(left,right='GS999'){
 const text={items:[item(left,30,700),item(right,210,700)]};
 for(let i=0;i<3;i++)text.items.push(item(['Låshus','Cylinder','Trycke'][i],30,680-i*20),item('Produkt '+i,210,680-i*20));
 return text;
}
for(const [raw,expected]of [['GS1','GS1'],['GS 1','GS1'],['WC GS1 1','GS1'],['140 C','140C'],['GC1','GC1'],['1','1'],['Dörrkort Teknik','TEKNIK']]){
 const text=firstCell(raw);
 assert.equal(combined(text)?.code,expected,'existing first-cell result retained: '+raw);
 assert.equal(identify(text),null,'existing first-cell layout is not claimed by new profile');
}
assert.equal(combined(firstCell('Komponent','GS2')),null,'right first cell never supplies ID');
assert.equal(combined(firstCell('GS1 GS2','GC3')),null,'ambiguous first cell stays unresolved');
const fixtures=fs.existsSync(path.join(root,'tests/fixtures/snidaren-card-headers-v36-87.json'))?
 path.join(root,'tests/fixtures/snidaren-card-headers-v36-87.json'):path.join(root,'snidaren-card-header-fixtures.json');
for(const fixture of JSON.parse(fs.readFileSync(fixtures,'utf8'))){
 const text={items:fixture.items};
 assert.equal(combined(text)?.code,fixture.expected,'previous verified card page '+fixture.page);
 assert.equal(identify(text),null,'new profile does not claim previous verified card page '+fixture.page);
}

async function suppliedPdf(file){
 const pdfjs=require(path.join(root,fs.existsSync(path.join(root,'vendor/pdf.min.js'))?'vendor/pdf.min.js':'pdf-runtime.cjs'));
 pdfjs.GlobalWorkerOptions.workerSrc=path.join(root,fs.existsSync(path.join(root,'vendor/pdf.worker.min.js'))?'vendor/pdf.worker.min.js':'pdf.worker.cjs');
 const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file))}).promise;
 try{
  assert.equal(doc.numPages,6,'reference combined PDF');
  for(let p=1;p<=doc.numPages;p++){
   const page=await doc.getPage(p),content=await page.getTextContent();
   const items=content.items.map(i=>({text:(i.str||'').trim(),x:i.transform[4],y:i.transform[5],w:i.width,h:Math.max(Math.abs(i.transform[3]),i.height,1)})).filter(i=>i.text);
   const actual=identify({items});
   const expected=[null,'140C','VC','WC','HWC','130C'][p-1];
   assert.equal(actual?.code||null,expected,'supplied PDF page '+p);
  }
  console.log('Supplied PDF: drawing rejected by profile, all five title/object/component cards identified.');
 }finally{await doc.destroy();}
}
(async()=>{
 if(process.argv[2])await suppliedPdf(process.argv[2]);
 console.log('Known-layout positives, geometry, negative fixtures, unchanged locked readers and previous 15 cards passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
