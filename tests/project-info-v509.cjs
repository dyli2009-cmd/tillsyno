'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../vendor/pdf-lib.min.js'),D=require('../smartmatch-projektering-v509-data.js'),P=require('../smartmatch-projektering-v509-pdf.js'),S=require('../smartmatch-projektering-v509-store.js'),I=require('../tillsyno-project-info-v509.js');
(async()=>{
 let count=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);count++};
 const originalDoc=await L.PDFDocument.create();originalDoc.addPage([595,842]);const original=new Uint8Array(await originalDoc.save());
 let state=D.createEmpty('Provbygget');state.drawing={name:'prov.pdf',pages:P.metadata(originalDoc)};
 const input={designer:'Projektör Åsa',date:'2026-10-29',facilityNo:'ANL-123',order:'AO-789',company:'Utföraren AB',companyContact:'Erik',companyPhone:'0123456',companyAddress:'Verkstadsgatan 1',companyPostalCode:'43200',companyPostalCity:'Varberg',customer:'Beställaren AB',contact:'Anna',phone:'0987654',address:'Byggatan 2',postalCode:'43000',postalCity:'Veddige'};
 state.project.details=D.projectDetails(input);state=D.validate(state);
 eq(state.project.details.company,input.company,'validation preserves company');eq(state.project.details.customer,input.customer,'customer separate');eq(D.projectDetails().facilityNo,'','old projects allowed');
 const packed=await S.pack(state,original),unpacked=await S.unpack(packed);eq(unpacked.state.project.details,state.project.details,'project storage roundtrip');
 const bytes=await P.build(state,original),doc=await L.PDFDocument.load(bytes),info=I.read(doc,L);eq(info.projectMeta.projectName,'Provbygget');for(const k of I.fields)eq(info.projectMeta[k],input[k],k);eq(info.projectMeta.designer,input.designer);eq(info.projectMeta.technician,undefined,'designer never becomes technician');
 const reopened=await P.inspect(bytes);eq(reopened.state.project.details,state.project.details,'exported projection project reopens');
 const merged=I.merge(info,{projectMeta:{company:'Teknikerns ändring',contact:''},projectLogoData:''});eq(merged.projectMeta.company,'Teknikerns ändring');eq(merged.projectMeta.contact,'','intentional blank respected');eq(merged.projectMeta.order,'AO-789');eq(merged.projectLogoData,'');
 const kl=D.defaultStencil('KL');eq(kl.fill,'#9bd8ae');eq(kl.stroke,'#32754c');const custom=D.clone(state);custom.stencils.KL.fill='#123456';eq(D.validate(custom).stencils.KL.fill,'#123456','custom color kept');const old=D.clone(state);old.stencils.KL.fill='#db756c';old.stencils.KL.stroke='#815044';eq(D.validate(old).stencils.KL.fill,'#9bd8ae','default KL upgrades');eq(D.defaultStencil('DA').fill,'#db756c','DA unchanged');
 const large=L.PDFDocument.create;const logoDoc=await L.PDFDocument.create();logoDoc.addPage();const logo='data:image/png;base64,'+'AAAA'.repeat(120000);I.write(logoDoc,{name:'Stort metadata',details:{...input,logo:{dataUrl:logo}}},L);eq(I.read(await L.PDFDocument.load(await logoDoc.save()),L).projectLogoData,logo,'large logo safely decoded');
 for(const f of ['smartmatch-read-main-v509.js','smartmatch-main-v509.js']){
 const source=fs.readFileSync(f,'utf8'),start=source.indexOf('async function readEmbeddedProjectState('),end=source.indexOf('\n/*',start),fragment=source.slice(start,end);
 const context=vm.createContext({window:{TillsynoProjectInfo:I,SmartMatchReadProjectV97:{read:()=>({present:false,payload:null})},SmartMatchSLRTest:{initProject(){}}},PDFLib:L,bytes:bytes.slice(),decodePdfText:()=>'',smartMakeCleanWorkspaceDrawing:async()=>null,console,Uint8Array});vm.runInContext(fragment,context);const result=await vm.runInContext('readEmbeddedProjectState()',context);eq((result.state||result).projectMeta.company,input.company,'actual importer '+f);eq((result.state||result).projectMeta.order,input.order);
 }
 for(const file of ['smartmatch-slr-test-module-read-v9-85.js','smartmatch-slr-test-module-v36-132.js']){
 const slr=fs.readFileSync(file,'utf8'),auto=slr.slice(slr.indexOf('function auto(i){'),slr.indexOf('async function loadTemplates()',slr.indexOf('function auto(i){')));
 const ctx=vm.createContext({bridge:{getProjectMeta:()=>info.projectMeta},slrDoorDesignation:()=>'',slrDoorNumber:()=>'',slrMachine:()=>({}),saved:()=>({})});vm.runInContext(auto,ctx);const mapped=vm.runInContext('auto({})',ctx);
 for(const [key,value] of [['Beställare företagsnamn',input.customer],['Tillverkare företagsnamn',input.company],['Beställare kontaktperson',input.contact],['Tillverkare kontaktperson',input.companyContact],['Offertnummer/Ordernummer',input.order],['Objekt',input.facilityNo],['Beställare adress',input.address],['Tillverkare adress',input.companyAddress]])eq(mapped[key],value,file+' '+key);
 }
 console.log('PASS '+count+' project metadata, export/import and color checks');
})().catch(e=>{console.error(e);process.exitCode=1});
