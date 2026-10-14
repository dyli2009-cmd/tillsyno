/* Structural/logic regression checks for the isolated TEST 7 page. Run: node tests/ce-markning-v7-account.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const personal=read('project-ce-markning-test-v7-personal.js');
const main=read('project-ce-markning-test-v7.js');
const html=read('project-ce-markning-test-v7.html');
const service=read('project-ce-markning-test-v7-sw.js');
for(const [name,source] of [['personal',personal],['main',main],['worker',service]])assert.doesNotThrow(()=>new vm.Script(source),name+' must parse');
assert.match(main,/tillsyno-authorized/,'read project only after authorized account');
assert.match(main,/DB\+'-'\+encodeURIComponent\(accountId\)/,'account-separated DB keys');
assert.match(main,/\$\('ceImportLegacy'\)\.onclick/,'legacy import must be user initiated');
assert.match(main,/\[3,4,5,6\]/,'old PDF revisions remain readable');
assert.doesNotMatch(main,/migrated=false/,'no automatic import of unscoped old database');
for(const id of ['ceRememberPerformer','ceRecallPerformer','ceRememberCustomer','ceRecallCustomer','cePresetSave','cePresetExport','cePresetApply','cePresetImport','ceImportLegacy'])assert.ok(html.includes('id="'+id+'"'),id);
for(const name of ['project-ce-markning-test-v7.css','project-ce-markning-test-v7-personal.js','project-ce-markning-test-v7.js'])assert.ok(html.includes(name)&&service.includes(name),name);
const data=new Map(),localStorage={getItem:k=>data.get(k)||null,setItem:(k,value)=>data.set(k,value)};
const sandbox={window:{},localStorage};
vm.runInNewContext(personal,sandbox);
const p=sandbox.window.TillsynoCEPersonal;
p.saveGroup('konto-1',{technician:'Tekniker 1',customer:'Kund A',objectNo:'HEMLIGT PROJEKT'},'performer');
assert.equal(p.getGroup('konto-1','performer').technician,'Tekniker 1');
assert.equal(p.getGroup('konto-2','performer').technician,undefined);
assert.equal(p.getGroup('konto-1','performer').objectNo,undefined);
assert.equal(p.getGroup('konto-1','performer').customer,undefined);
p.saveGroup('konto-1',{customer:'Kund A',address:'Gatan 1'},'customer');
assert.equal(p.getGroup('konto-1','customer').customer,'Kund A');
const incoming=p.capturePreset({glass:{Riskanalys:{
 '4.4 Risknivå':'Hög','4.6.1':true,'4.6.1 text 1':'INDIVIDUELL RISK','Datum':'2026-10-14','10.5.1':true,
 'Fri passagehöjd':'2200','4.3 Objektsorientering 1':true
}},noGlass:{Riskanalys:{'4.6.2':false},Egenkontroll:{'10.5.2':true}}});
assert.equal(Object.keys(incoming.profiles.glass.Riskanalys).length,2);
assert.equal(incoming.profiles.glass.Riskanalys['4.6.1 text 1'],undefined);
assert.equal(incoming.profiles.glass.Riskanalys['10.5.1'],undefined);
p.savePreset('konto-1',incoming);
assert.equal(p.getPreset('konto-2'),null);
const current={glass:{Riskanalys:{'4.6.1':false,'4.6.2':true,'4.6.1 text 1':'MANUELL TEXT'}},noGlass:{}};
p.applyPreset(current,p.getPreset('konto-1'));
assert.equal(current.glass.Riskanalys['4.6.1'],true);
assert.equal(current.glass.Riskanalys['4.6.2'],undefined);
assert.equal(current.glass.Riskanalys['4.6.1 text 1'],'MANUELL TEXT');
assert.equal(current.noGlass.Riskanalys['4.6.2'],false);
assert.throws(()=>p.normalizePreset({format:'unknown',schema:1,profiles:{}}));
console.log('CE TEST 7: kontoavgränsning, valfilter, versionsreferenser och äldre import OK');
