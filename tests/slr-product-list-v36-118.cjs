const fs=require('fs'),path=require('path'),assert=require('assert');
const PDFLib=require(path.resolve(process.env.SLR_PDF_LIB||path.join(__dirname,'../vendor/pdf-lib.min.js')));
const window={},status={style:{}},document={getElementById:id=>id==='slrStatusText'?status:null};
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'../smartmatch-slr-test-module-v36-118.js'),'utf8').replace('window.SmartMatchSLRTest=','window.probe={slrProductRows,slrOwnProducts,createProductList,set:(i,b,s)=>{item=i;bridge=b;verificationByDoor[i.id]=s},product:id=>productFiles[id]};window.SmartMatchSLRTest=');
new Function('PDFLib','window','document',source)(PDFLib,window,document);
const items=[];let y=700;
function heading(text){items.push({text,x:40,y,h:8,w:100});y-=24;}
function row(name,value,owner,extra=''){items.push({text:name,x:40,y,h:8,w:100},{text:value,x:160,y,h:8,w:45},{text:owner,x:270,y,h:8,w:12});if(extra)items.push({text:extra,x:350,y,h:8,w:100});y-=20;}
heading('Daglåsning');row('Låshus','M32','DT','INTE EN PRODUKT');row('Cylinderbehör','256','GS');row('Trycke','-','DT');heading('Nattlåsning');row('Låshus','–','GS');heading('Larm/Passer');row('Kortläsare','ja','EL');
(async()=>{
 const rows=window.probe.slrProductRows(items);assert.deepEqual(rows,[{group:'Daglåsning',name:'Låshus',value:'M32'},{group:'Daglåsning',name:'Cylinderbehör',value:'256'},{group:'Larm/Passer',name:'Kortläsare',value:'ja'}]);
 const current={id:'door-a',objectNo:'100',modelCode:'24',serialNumber:'1'},src={gs:{id:'gs-a',code:'GS1',page:1},cardPage:2,cardPages:[2]},positions=[{id:'gs-a',code:'GS1',page:1,customItems:[{label:'Dörrstopp',value:'Golvmodell'}]},{id:'gs-b',code:'GS1',page:3,customItems:[{label:'Fel dörr',value:'B'}]}],bridge={readPageText:async()=>({items}),getPositions:()=>positions,save(){},redraw(){}};
 window.probe.set(current,bridge,src);assert.deepEqual(window.probe.slrOwnProducts(current,src),[{group:'Egna produkter',name:'Dörrstopp',value:'Golvmodell'}]);await window.probe.createProductList(current);const product=window.probe.product(current.id);assert(product,status.textContent);assert.equal(product.rowCount,4);assert.equal(product.format,'two-columns-v1');const pdf=await PDFLib.PDFDocument.load(product.bytes);assert.equal(pdf.getPageCount(),1);assert(!pdf.catalog.get(PDFLib.PDFName.of('AcroForm')));
 const ambiguous={id:'door-b'};window.probe.set(ambiguous,bridge,{...src,cardPages:[2,4]});await window.probe.createProductList(ambiguous);assert(!window.probe.product(ambiguous.id));
 const unreadable={id:'door-c'};window.probe.set(unreadable,{...bridge,readPageText:async()=>({items:[]})},src);await window.probe.createProductList(unreadable);assert(!window.probe.product(unreadable.id));
 console.log('PASS: two product columns; GS/DT/EL; no empty or dash rows, no notes; own products from exact GS marker; one-page static PDF; ambiguous or unreadable card refused.');
})().catch(error=>{console.error(error);process.exitCode=1});
