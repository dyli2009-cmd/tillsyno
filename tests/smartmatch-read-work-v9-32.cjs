'use strict';
const assert=require('node:assert/strict');
const {read}=require('../smartmatch-read-work-v9-32.js');
const w=(text,x,y,width=text.length*5)=>({text,x,y,w:width,h:10});
const headers=[w('Komponent',5,10),w('Övrigt',170,10),w('Lev av',400,10),w('Mont av',450,10),w('Ansl av',510,10)];
const row=(model,y,delivery,installer,connection='')=>[w('Dörrstängare',5,y),w(model,170,y),w(delivery,400,y),w(installer,450,y),w(connection,510,y)];
const words=[...headers,...row('DC700',40,'GS','DT'),...row('ED100',60,'DT','GS'),...row('DC500',80,'GS','GS'),...row('OTHER',100,'DT','EL'),...row('CONNECTION',120,'DT','DT','GS'),...row('UNCLEAR',140,'GS/DT',''),...row('DELIVERY',160,'GS',''),...row('NONE',180,'','')];
for(const input of [words,[...words].reverse()]){
 const r=read({words:input});
 assert.deepEqual(r.work,['DC700','ED100','DC500','DELIVERY']);
 assert.equal(r.products.length,8);
 assert.equal(r.items.filter(p=>p.value==='DC500').length,1);
 assert.equal(r.products[0].installer,'DT');assert.equal(r.products[0].delivery,'GS');
 assert.equal(r.products[3].responsibility,'EL');
}
const deliveryOnly=read({words:[...headers.filter(h=>h.text!=='Mont av'),...row('DC700',40,'GS','')]});
assert.deepEqual(deliveryOnly.work,['DC700']);
const montageOnly=read({words:[...headers.filter(h=>h.text!=='Lev av'),...row('ED100',40,'','GS')]});
assert.deepEqual(montageOnly.work,['ED100']);
// Existing OCR row alignment coverage against the new parser.
const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const file=path.resolve(__dirname,'smartmatch-read-work-v9-30.cjs');
const task=new Module(file,module);task.filename=file;task.paths=module.paths;task._compile(fs.readFileSync(file,'utf8').replaceAll('work-v9-30.js','work-v9-32.js'),file);
console.log('PASS 9.32: GS delivery OR installation; both once; others inventory; connection excluded; unclear excluded; single columns; OCR alignment');
