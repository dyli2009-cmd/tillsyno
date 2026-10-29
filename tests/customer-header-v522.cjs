const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{jsPDF}=require('../vendor/jspdf.umd.min.js'),Info=require('../tillsyno-project-info-v513.js');
const details={company:'UTFORARE',companyContact:'FORETAG KONTAKT',companyPhone:'11111',companyAddress:'FORETAG ADRESS',companyPostalCode:'111',companyPostalCity:'FORETAG ORT',customer:'BESTALLARE',contact:'KUND KONTAKT',phone:'22222',address:'KUND ADRESS',postalCode:'222',postalCity:'KUND ORT'};
const imported=Info.fromProject({name:'PROJEKT',details}),meta=imported.projectMeta;
for(const file of ['smartmatch-main-v522.js','smartmatch-read-main-v522.js']){
 const source=fs.readFileSync(file,'utf8'),a=source.indexOf('function createAutomationSelfcheckPdf('),b=source.indexOf('\nasync function renderAutomationCustomerPreview()',a),texts=[];
 function PDF(...args){const doc=new jsPDF(...args),original=doc.text;doc.text=function(value,x,y,...rest){texts.push({value:Array.isArray(value)?value.join(' '):value,x,y});return original.call(this,value,x,y,...rest)};return doc;}
 const ctx=vm.createContext({window:{jspdf:{jsPDF:PDF}},jspdf:{jsPDF:PDF},PROJECT_AUTOMATION_CHECKS:[],projectMeta:meta,projectLogoData:'',automationDisplayId:()=> '200154-45-1'});vm.runInContext(source.slice(a,b),ctx);const pdf=vm.runInContext('createAutomationSelfcheckPdf({checks:{}})',ctx);
 const find=v=>texts.find(t=>t.value===v&&t.y<90);
 for(const value of [details.company,details.companyContact,details.companyPhone,details.companyAddress,'111 FORETAG ORT'])assert(find(value)?.x<105,file+' left '+value);
 for(const value of [details.customer,details.contact,details.phone,details.address,'222 KUND ORT'])assert(find(value)?.x>105,file+' right '+value);
 assert(find('UTFÖRANDE FÖRETAG:').x<find('KUND / BESTÄLLARE:').x);assert(pdf.output('arraybuffer').byteLength>1000);
}
assert.equal(meta.company,'UTFORARE');assert.equal(meta.customer,'BESTALLARE');
console.log('PASS both actual PDF generators: performer and all contact fields left, customer and all contact fields right, correct Projection mapping');
