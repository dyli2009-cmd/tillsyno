'use strict';
/* Real production report, drawing, overview-card and work-PDF export functions.
 * Reuses the existing download/DOM harness; PDFLib, jsPDF and PDF.js are real.
 * Selection is explicit. Mixed work metadata must survive while customer-facing
 * pages, links, remarks and counts contain only the selected protocol types.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const PDFLib=require('pdf-lib');
const jspdf=require('../vendor/jspdf.umd.min.js');
const standardFontDataUrl=path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts')+path.sep;
const root=path.join(__dirname,'..');
const helperPath=path.join(__dirname,'controlflow-pdf-roundtrip-v549.cjs');
const helperSource=fs.readFileSync(helperPath,'utf8');
const helperEnd=helperSource.indexOf('\nfunction svgPoint(');
assert(helperEnd>0,'existing production PDF harness is available');
const helperContext=vm.createContext({require:createRequire(helperPath),__dirname,console,
  Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,Blob,structuredClone,Buffer});
vm.runInContext(helperSource.slice(0,helperEnd)+'\nglobalThis.pdfHelpers={harness,functionSource,Style};',helperContext);
const {harness:coreHarness,functionSource:extractFunction,Style}=helperContext.pdfHelpers;
const functionSource=(source,name)=>extractFunction(source.replace(/^[ \t]+(?=(?:async )?function )/gm,''),name);
// PDFLib checks embedPdf indices with instanceof Array across the VM boundary.
const embedPdf=PDFLib.PDFDocument.prototype.embedPdf;
PDFLib.PDFDocument.prototype.embedPdf=function(bytes,indices){
  return embedPdf.call(this,bytes,indices==null?indices:Array.from(indices));
};
const plain=value=>JSON.parse(JSON.stringify(value));
let checks=0,pdfjs;
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}

function mixedItems(){
  return ['automation','lock'].map((type,index)=>({uid:'mixed-'+type,type,number:index+1,
    id:type==='automation'?'DA-TEST-1':'LOCK-TEST-2',idMode:'manual',serialNumber:String(index+1),modelCode:'',model:'',
    page:1,x:.2+index*.45,y:.68,labelX:.3+index*.4,labelY:.58,
    status:'action',checks:{'1.1':{result:'remark',note:'UNIQUE-'+type.toUpperCase()+'-REMARK'}},
    customChecks:[],checkEdits:{},notes:'',location:'Neutral testzon '+(index+1),previousIssues:[],
    customerStampScale:1,customerArrowScale:1}));
}
function attachOverview(h,mode){
  const file=mode==='security'?'security-service-overview-v554.js':'controlflow-revision/service-overview-v12.js';
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const declarations=['clamp','dimensions'].map(name=>{
    const match=source.match(new RegExp('^\\s*const '+name+'=.*$','m'));
    assert(match,'production overview declaration '+name);return match[0];
  });
  const api=mode==='security'?'SecurityServiceOverview':'RevisionServiceOverview';
  vm.runInContext([...declarations,...['config','stats','cardDoc','drawToPdf'].map(name=>functionSource(source,name)),
    'window.'+api+'={config,stats,drawToPdf};'].join('\n'),h.context,{filename:file});
}
async function harness(mode,original,active){
  const h=await coreHarness(mode,original,original),s=h.state;
  const file=mode==='security'?'security.js':'controlflow-revision/security-v335.js';
  const source=fs.readFileSync(path.join(root,file),'utf8');
  s.pdf=await pdfjs.getDocument({data:original.slice(),useSystemFonts:true,standardFontDataUrl}).promise;
  s.document.documentElement={dataset:{controlflowUi:'1',cfStampMode:mode}};
  s.window.AllInOneProtocols={get:()=>active.slice()};
  s.jspdf=jspdf;s.logoData='';s.items=mixedItems();s.drawingRotations={};
  s.project={projectName:'Neutral blandad arbetsfil',facilityNo:'QA',date:'2026-11-02',sourceFileName:'mixed.pdf',
    serviceOverview:{enabled:true,page:1,layout:'wide',x:.08,y:.08,width:.8,height:.16}};
  const systemStart=source.indexOf('const SYSTEMS='),systemEnd=source.indexOf('const DOOR_AUTOMATION_MODELS=');
  assert(systemStart>=0&&systemEnd>systemStart,'actual protocol definitions are available');
  const names=['allInOneProtocolActive','visibleItems','normalizeSecurityCheckEdits','allChecks',
    'securityStatusText','securityPriority','customerProtocolTitle','securityProtocolReturnEnabled',
    'securityProtocolReturnView','securityProtocolReturnPdfRect','reportDoc'];
  if(mode==='security')names.push('securityCustomProtocolLabel','securityObjectIdentity','securityDefaultCheckTitle');
  vm.runInContext(source.slice(systemStart,systemEnd).replace('const SYSTEMS=','SYSTEMS=')+'\n'+
    names.map(name=>functionSource(source,name)).join('\n'),h.context,{filename:file});
  attachOverview(h,mode);
  return h;
}
function drawingDestinations(doc){
  const annots=doc.getPage(0).node.lookupMaybe(PDFLib.PDFName.of('Annots'),PDFLib.PDFArray);
  return annots?annots.asArray().map(ref=>{
    const annotation=doc.context.lookup(ref);
    equal(String(annotation.get(PDFLib.PDFName.of('Subtype'))),'/Link','drawing annotation is a real PDF link');
    return String(annotation.lookup(PDFLib.PDFName.of('Dest'),PDFLib.PDFArray).get(0));
  }):[];
}
async function checkExport(mode,original,active){
  const h=await harness(mode,original,active),s=h.state,label=mode+' '+JSON.stringify(active);
  const before=plain({items:s.items,project:s.project}),expected=s.items.filter(o=>active.includes(o.type));
  let exportedPdf;
  try{
    const built=await s.buildSecurityDrawingPdf();
    equal(built.links.map(link=>link.uid),expected.map(o=>o.uid),label+': only selected objects produce drawing stamp links');
    equal(built.stampRects.map(rect=>rect.uid),expected.map(o=>o.uid),label+': preview hit areas exclude inactive objects');
    equal(built.overviewLinks.length,1,label+': service overview retains its own link');
    equal(s.stats()[0].slice(0,2),['TOTALT',expected.length],label+': service overview counts selected objects only');

    const report=s.reportDoc();
    equal(Object.keys(report.__protocolPages).sort(),expected.map(o=>o.uid).sort(),label+': real report page map contains only selected protocols');
    equal(report.getNumberOfPages(),1+expected.length,label+': no appended inactive protocol pages');
    equal(report.__backLinks.map(link=>link.uid).sort(),expected.map(o=>o.uid).sort(),label+': report return links belong only to selected objects');

    await s.exportPdf('work','selection-'+mode+'.pdf');
    equal(h.messages.filter(message=>message.error),[],label+': production export succeeds');
    equal(h.document.downloads.length,1,label+': exactly one work PDF is downloaded');
    const bytes=new Uint8Array(await h.blobs.get(h.document.downloads[0].href).arrayBuffer());
    const doc=await PDFLib.PDFDocument.load(bytes);
    equal(doc.getPageCount(),1+report.getNumberOfPages(),label+': serialized PDF has only the intended drawing and report pages');
    const destinations=drawingDestinations(doc);
    equal(destinations.sort(),[String(doc.getPage(1).ref),...expected.map(o=>String(doc.getPage(report.__protocolPages[o.uid]).ref))].sort(),
      label+': serialized drawing links target only the overview and selected protocol pages');

    exportedPdf=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true,standardFontDataUrl}).promise;
    const pageTexts=[];
    for(let n=1;n<=exportedPdf.numPages;n++){
      const content=await(await exportedPdf.getPage(n)).getTextContent();
      pageTexts.push(content.items.map(item=>item.str).filter(text=>text.trim()));
    }
    const drawingText=pageTexts[0].join(' '),reportText=pageTexts.slice(1).flat().join(' ');
    const totalAt=pageTexts[0].indexOf('TOTALT');
    ok(totalAt>=0,label+': real first-page service overview has a total label');
    equal(pageTexts[0][totalAt+1],String(expected.length),label+': actual PDF service overview renders the selected total');
    for(const o of s.items){
      equal(drawingText.includes(s.securityDrawingMarkerLabel(o)),active.includes(o.type),label+': actual drawing stamp visibility for '+o.type);
      equal(reportText.includes(o.id),active.includes(o.type),label+': customer report identity visibility for '+o.type);
      equal(reportText.includes(o.checks['1.1'].note),active.includes(o.type),label+': customer report remark visibility for '+o.type);
    }
    const reopened=await s.inspectSecurityWorkPdf(bytes);
    ok(reopened,label+': output reopens as an editable work PDF');
    equal(reopened.work.items,before.items,label+': both active and inactive objects retain all work metadata');
    equal(reopened.work.project,before.project,label+': overview configuration and project metadata survive');
    ok(Buffer.from(reopened.drawingBytes).equals(Buffer.from(original)),label+': clean original drawing is preserved byte for byte');
    equal({items:s.items,project:s.project},before,label+': export does not mutate active or inactive data');
    equal(s.window.AllInOneProtocols.get(),active,label+': export never broadens the explicit selection');
  }finally{if(exportedPdf)await exportedPdf.destroy();await s.pdf.destroy();}
}

(async()=>{
  pdfjs=await import(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'));
  await Style.prepare(PDFLib);
  const source=await PDFLib.PDFDocument.create();
  source.addPage([600,800]).drawText('NEUTRAL MIXED DRAWING',{x:40,y:750,size:12});
  const original=await source.save();
  for(const mode of ['security','revision'])for(const active of [['lock'],['automation'],['lock','automation'],[]])
    await checkExport(mode,original,active);
  console.log('protocol-selection-pdf-v556: '+checks+' assertions passed (real customer reports, drawing links, overview counts and preserved mixed work metadata in both runtimes).');
})().catch(error=>{console.error(error);process.exitCode=1;});
