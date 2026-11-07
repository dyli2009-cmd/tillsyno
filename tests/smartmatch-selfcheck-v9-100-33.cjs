const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const viewer=require('../smartmatch-protocol-viewer-v9-100-33.js');
for(const width of [288,358,788,968]){
 const fit=viewer.pageSize(595,842,width,1),zoom=viewer.pageSize(595,842,width,2);
 assert.equal(fit.width,width);assert.equal(zoom.width,2*width);assert.equal(zoom.height,2*fit.height);
 const ratio=viewer.pixelRatio(zoom.width*2,zoom.height*2,3);
 assert(zoom.width*2*zoom.height*2*ratio*ratio<=2000001,'render pixel budget');
}
assert.equal(viewer.clampZoom(.1),1);assert.equal(viewer.clampZoom(7),4);
const source=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
const start=source.indexOf('const AUTOMATION_CHECK_ROW_LABELS='),end=source.indexOf('function renderAutomationProtocol(',start);
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.className='';this.classList={toggle:(name,on)=>{this.active=on}};}
 set innerHTML(value){this.html=value;if(this.tag==='div')this.children=[new Element('strong'),new Element('span')];}
 querySelector(tag){return this.children.find(c=>c.tag===tag);}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...nodes){this.children.push(...nodes);}
 appendChild(node){this.append(node);}
 replaceChildren(){this.children=[];}
}
const list=new Element('div');let current={id:'da1',checks:{}},saved;
const context=vm.createContext({document:{createElement:tag=>new Element(tag)},el:{automationChecks:list},PROJECT_AUTOMATION_CHECKS:[['1.1','Kontrollera fastsättning']],PROJECT_AUTOMATION_FAULTS:{},selectedAutomation:()=>current,automationProgressOf:()=>100,save:()=>{saved=JSON.parse(JSON.stringify(current))},updateDALiveStatus:()=>{},renderAutomationProtocol:o=>context.renderAutomationChecks(o)});
vm.runInContext(source.slice(start,end),context);
context.renderAutomationChecks(current);
const choices=()=>list.children[0].children[1].children;
choices()[1].onclick();assert.equal(saved.checks['1.1'].result,'ok');assert.equal(choices()[1].attrs['aria-pressed'],'true');assert.equal(choices()[2].attrs['aria-pressed'],'false');
current=JSON.parse(JSON.stringify(saved));context.renderAutomationChecks(current);assert.equal(choices()[1].attrs['aria-pressed'],'true','selected status survives reopen');
choices()[2].onclick();assert.equal(current.checks['1.1'].result,'remark');assert.equal(choices()[2].attrs['aria-pressed'],'true');assert.equal(choices()[1].attrs['aria-pressed'],'false');
choices()[2].onclick();assert.equal(current.checks['1.1'].result,'');assert(choices().every(b=>b.attrs['aria-pressed']==='false'),'second press returns to unchecked');
choices()[0].onclick();assert.equal(current.checks['1.1'].result,'na');assert.equal(choices()[0].attrs['aria-pressed'],'true');
const stale=choices()[1];current={id:'da2',checks:{}};stale.onclick();assert.deepEqual(current.checks,{},'old door controls cannot change another door');
const html=fs.readFileSync('smartmatch-read-v9-100.html','utf8');
for(const id of ['pwDetailsFontMinus','pwDetailsFontPlus','pwChecksFontMinus','pwChecksFontPlus','pwProtocolPreviewPrev','pwProtocolPreviewNext','pwProtocolPreviewZoomOut','pwProtocolPreviewZoomIn'])assert(!html.includes('id="'+id+'"'),id);
assert(html.indexOf('src="smartmatch-protocol-viewer-v9-100-33.js"')<html.indexOf('src="smartmatch-protocol-export-v36-96.js'));
console.log('PASS: viewport fitting, zoom limits and render budget; actual status click, persisted reopen, switching, undo and stale-door guard; removed controls and viewer loading order.');
