const assert=require('node:assert/strict'),fs=require('node:fs'),X=require('../smartmatch-project-material-v524.js'),Info=require('../tillsyno-project-info-v513.js');
const source=(label,section='Daglåsning')=>({code:'GS42',rowId:label,label,section,quantity:2,placements:2});
const fresh={version:1,source:'projection',rows:[{category:'Cylinder',component:'Cylinder',product:'8801',quantity:4,minutes:12,sources:[source('Cylinder gångjärnssida'),source('Cylinder anslagssida')]}]};
const old={timeConfig:{projectionMaterial:{...fresh,rows:fresh.rows.map(r=>({...r,minutes:15,sources:undefined}))}},instances:{keep:{checks:{one:true}}}};
const before=JSON.stringify(old),merged=X.mergeState({timeConfig:{projectionMaterial:fresh}},old,Info);assert.equal(JSON.stringify(old),before);assert.equal(merged.timeConfig.projectionMaterial.rows[0].minutes,15);assert.deepEqual(merged.instances,old.instances);
const positions=[1,2].map(n=>({id:'p'+n,code:'GS42',checks:{a:n===1,b:false},items:[{key:'a',source:'base',label:'Cylinder gångjärnssida',section:'Daglåsning',value:'8801',responsibility:'GS'},{key:'b',source:'base',label:'Cylinder anslagssida',section:'Daglåsning',value:'8801',responsibility:'GS'}]}));
let r=X.overview(merged.timeConfig.projectionMaterial,positions);assert.equal(r.total,60);assert.equal(r.done,15);assert.equal(r.unlinked,0);assert.equal(r.progress,25);
const repeated=X.mergeState(merged,old,Info);assert.deepEqual(repeated,merged);assert.equal(X.overview(repeated.timeConfig.projectionMaterial,positions).done,15);
const other=positions.map(p=>({...p,code:'GS43'}));assert.equal(X.overview(fresh,other).done,0);assert.equal(X.overview(fresh,other).unlinked,4);
const ambiguous=positions.map(p=>({...p,items:[...p.items,{...p.items[0],key:'duplicate'}]}));assert.equal(X.overview(fresh,ambiguous).done,0);assert.equal(X.overview(fresh,ambiguous).unlinked,2);
const ak={version:1,source:'projection',rows:[{category:'Armbågskontakt',component:'Armbågskontakt',product:'AK',quantity:4,minutes:20,sources:[{...source('Armbågskontakt'),quantity:4}]}]};
assert.equal(X.overview(ak,[{id:'p1',code:'GS42',checks:{a:true},items:[{key:'a',label:'Armbågskontakt',value:'AK',quantity:2,source:'base'}]}]).done,40);
// Ordinary scanned projects retain independent per-position quantities.
const scan={version:1,source:'scan',rows:[{category:'Cylinder',component:'Cylinder gångjärnssida',product:'8801',quantity:2,minutes:12}]};assert.equal(X.overview(scan,positions).done,12);
(async()=>{
if(process.argv[2]){
 const L=require('../vendor/pdf-lib.min.js'),M=require('../smartmatch-projektering-v519-materials.js');const d=await L.PDFDocument.load(fs.readFileSync(process.argv[2]));const raw=d.context.lookup(d.catalog.get(L.PDFName.of('TillsynoSmartMatchV36Data'))),h=raw.asString();const state=JSON.parse(Buffer.from(h.slice(4),'hex').swap16().toString('utf16le'));const original=JSON.stringify(state);const imported=X.read(d,L,M);const restored=X.mergeState({timeConfig:{projectionMaterial:imported}},state,Info);const cards=Object.values(state.readTestData.cards);const ps=Object.entries(state.instances).map(([id,p])=>{const code=id.match(/^scan:([^@]+)@/)?.[1];return {...p,id,code,items:(cards.find(c=>c.code===code)?.workItems||[]).map(i=>({...i,source:'base'}))};});const report=X.overview(restored.timeConfig.projectionMaterial,ps);assert.equal(report.quantity,682);assert.equal(report.unlinked,0);assert.equal(report.progress,42);assert.equal(JSON.stringify(state),original);console.log('PASS supplied PDF: 682 linked, 0 unlinked, 42%, saved checks unchanged');
}
console.log('PASS legacy merge, saved times, repeated restoration, two sides, multiple positions, other codes, ambiguity, AK and scan fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
