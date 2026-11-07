'use strict';
/* Actual root checklist builder and result/remark handlers. Reuses the existing
 * DOM/history fixture; physical layout and viewport clipping need browser QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const fixturePath=path.join(__dirname,'controlflow-dialogs-v552.cjs');
const fixtureSource=fs.readFileSync(fixturePath,'utf8');
const fixtureEnd=fixtureSource.indexOf('\nconst settle=');
assert(fixtureEnd>0,'existing checklist fixture declarations are available');
const fixtureContext=vm.createContext({require:createRequire(fixturePath),__dirname,console,queueMicrotask});
vm.runInContext(fixtureSource.slice(0,fixtureEnd)+'\nglobalThis.checklistFixture=coreFixture;',fixtureContext);
const fixture=fixtureContext.checklistFixture;
const plain=value=>JSON.parse(JSON.stringify(value));
let checks=0;
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}
const labels=['Ingår ej','Klart utan anmärkning','Klart med anmärkning'];
const values=['na','ok','remark'];
const supported=['automation','automation_selfcheck','lock_revision','alarm','detector','lock','access'];
function row(s,id='1.1'){return s.$('secChecklist').querySelectorAll('.secCheck').find(node=>node.dataset.checkId===id);}
function choices(s,id='1.1'){return row(s,id).querySelector('.secChoices').children;}
function choose(s,value,id='1.1'){const button=choices(s,id).find(node=>node.dataset.v===value);assert(button,'requested status button exists');button.click();}

function assertCompactStructure(s,o){
  const box=s.$('secChecklist'),tables=box.querySelectorAll('.revisionCheckTable'),rows=box.querySelectorAll('.secCheck');
  equal(tables.length,1,o.type+': compact CSS receives exactly one table wrapper');
  ok(tables[0].classList.contains('securityCheckTable'),o.type+': root checklist skin applies');
  equal(box.querySelectorAll('.revisionCheckColumns').length,1,o.type+': column headings exist once');
  equal(rows.length,s.allChecks(o).length,o.type+': every live/custom check has one row');
  for(const entry of rows){
    assert.equal(entry.parentNode,tables[0],o.type+': rows stay within the table');checks++;
    const buttons=entry.querySelector('.secChoices').children;
    equal(buttons.map(button=>button.textContent),['–','✓','×'],o.type+': full sentences cannot overflow fixed-size status buttons');
    equal(buttons.map(button=>button.dataset.v),values,o.type+': stored assessment values remain unchanged');
    equal(buttons.map(button=>button.getAttribute('aria-label')),labels.map(label=>label+', kontrollpunkt '+entry.dataset.checkId),o.type+': symbols retain full accessible labels');
    equal(buttons.map(button=>button.getAttribute('aria-pressed')),values.map(value=>String(o.checks[entry.dataset.checkId].result===value)),o.type+': pressed state follows saved result');
  }
}

function checkSupported(type){
  const s=fixture('security'),o=s.setup(type),original=plain(o),other=plain(o.checks['1.99']);
  assertCompactStructure(s,o);
  s.buildChecklist(o);s.buildChecklist(o);
  assertCompactStructure(s,o);
  equal(o,original,type+': repeated building does not alter protocol data');
  equal(s.saves,0,type+': rendering never saves');
  ok(row(s).querySelector('.secEditCheck')&&row(s).querySelector('.secRemoveCheck'),type+': row edit actions remain available');
  s.securityCheckEditUid=null;s.buildChecklist(o);
  equal(s.$('secChecklist').querySelectorAll('.secEditCheck').length,0,type+': leaving edit mode removes edit controls');

  // The initial result is a remark with existing text and remediation metadata.
  choose(s,'remark');
  equal(o.checks['1.1'],{result:'',note:'Bevarad anmärkning'},type+': clicking selected remark deselects it and preserves the draft');
  equal([o.remediationDate,o.remediationSignature],['',''],type+': deselection clears remediation metadata');
  equal(row(s).querySelector('.secFault'),null,type+': deselected remark field is removed from the row');
  equal(o.status,'untested',type+': unanswered check returns to untested');
  choose(s,'remark');
  equal(o.checks['1.1'],{result:'remark',note:'Bevarad anmärkning'},type+': selecting remark again restores draft');
  let fault=row(s).querySelector('.secFault');
  ok(fault,type+': remark editor remains within its checklist row');
  const input=fault.querySelector('.faultText');
  equal(input.value,'Bevarad anmärkning',type+': existing note appears in editor');
  input.value='Ny anmärkning för '+type;input.oninput();input.onblur();
  equal(o.checks['1.1'].note,input.value,type+': custom note uses the real input handlers');
  fault.querySelector('.secFaultBack').click();
  equal(o.checks['1.1'].note,'',type+': return to preset remarks retains existing clear-note semantics');
  const select=fault.querySelector('.faultSelect');select.value='__custom__';select.onchange();
  equal(input.hidden,false,type+': choosing custom remark reveals text input');
  input.value='Utkast att behålla';input.oninput();
  choose(s,'remark');
  equal(o.checks['1.1'],{result:'',note:'Utkast att behålla'},type+': edited draft survives deselection');
  choose(s,'remark');
  equal(row(s).querySelector('.faultText').value,'Utkast att behålla',type+': reselecting restores edited draft');

  o.manualFail=true;
  choose(s,'ok');
  equal(o.checks['1.1'],{result:'ok',note:''},type+': clear result replaces old remark consistently');
  equal(o.manualFail,false,type+': new check result clears manual fail');
  choose(s,'ok');equal(o.checks['1.1'].result,'',type+': selected OK can be undone by clicking again');
  choose(s,'na');equal(o.checks['1.1'].result,'na',type+': not applicable is stored correctly');
  choose(s,'na');equal(o.checks['1.1'].result,'',type+': selected not applicable can be undone');
  equal(o.checks['1.99'],other,type+': unrelated custom check is untouched');
  equal([o.page,o.x,o.y,o.labelX,o.labelY,o.notes],[original.page,original.x,original.y,original.labelX,original.labelY,original.notes],type+': checklist interaction does not move or rewrite the object');
  assertCompactStructure(s,o);
  ok(s.securitySessionHistory.undo(),type+': normal history can undo the last result change');
  equal(s.cur().checks['1.1'].result,'na',type+': undo restores the previous assessment');
}

function checkLegacy(type,allInOne=true){
  const s=fixture('security');s.ALL_IN_ONE=allInOne;const o=s.setup(type),box=s.$('secChecklist');
  equal(box.querySelectorAll('.revisionCheckTable').length,0,type+': outside compact scope retains legacy wrapper structure');
  equal(choices(s).map(button=>button.textContent),labels,type+': outside compact scope retains descriptive buttons');
  equal(choices(s).map(button=>button.getAttribute('aria-pressed')),[null,null,null],type+': outside compact scope is unchanged');
  choose(s,'ok');choose(s,'ok');
  equal(o.checks['1.1'].result,'ok',type+': legacy repeated status keeps its established value');
}

for(const type of supported)checkSupported(type);
for(const type of ['fire_panel','fire_detector','fire_door'])checkLegacy(type);
for(const type of ['automation','automation_selfcheck','lock_revision'])checkLegacy(type,false);
console.log('security-automation-checklist-v555: '+checks+' assertions passed (real root builder, assessment/remark handlers, rebuilds and unchanged legacy scope).');
