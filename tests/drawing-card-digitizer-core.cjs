'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Core=require('../drawing-card-digitizer-core.js');

const browserSandbox={window:{},globalThis:{}};browserSandbox.window=browserSandbox;
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../drawing-card-digitizer-core.js'),'utf8'),browserSandbox,{filename:'drawing-card-digitizer-core.js'});
assert.equal(typeof browserSandbox.DrawingCardDigitizerCore.createCard,'function','UMD build exposes its browser API without CommonJS');

const rect={x:.10,y:.08,w:.80,h:.84},viewport={width:1000,height:1200};
function word(text,x,y,w=.08,h=.022,confidence=94,source='ocr'){
 return{text,source,confidence,x:(rect.x+x*rect.w)*viewport.width,y:(rect.y+y*rect.h)*viewport.height,w:w*rect.w*viewport.width,h:h*rect.h*viewport.height};
}
function fixture(){
 const ocr=[
  word('Beslagskod',.04,.035,.15),word('4.2:',.205,.035,.055),word('W C',.28,.035,.08,.022,38),
  word('Projekt',.04,.105,.08),word('Tånga',.13,.105,.09),
  word('Benämning',.04,.19,.17),word('Typ',.43,.19,.05),word('/',.49,.19,.015),word('Utförande',.515,.19,.15),word('Antal',.71,.19,.07),word('Monteras',.83,.19,.11),word('av',.95,.19,.03),
  word('OSÄKERT',.04,.245,.13,.022,31),
  word('Daglåsning',.04,.30,.18),
  word('Låshus',.05,.355,.13),word('565',.48,.355,.07),word('1',.75,.355,.025),word('GS',.90,.355,.04),
  word('Nattlasning',.04,.43,.19),
  word('Hakregel',.05,.485,.14),word('576',.48,.485,.07),word('1',.75,.485,.025),word('DT',.90,.485,.04),
  word('Övrig',.04,.56,.09),word('utrustning',.14,.56,.16),
  word('Dörrstängare',.05,.615,.21,.022,42),word('DC700',.48,.615,.10),word('1',.75,.615,.025),word('GS',.90,.615,.04),
  word('Larm',.04,.69,.07),word('/',.115,.69,.015),word('Passer',.14,.69,.10),
  word('Dörrmagnet',.05,.745,.18),word('830',.48,.745,.07),word('1',.75,.745,.025),word('GS',.90,.745,.04)
 ];
 const native=[word('WC',.28,.035,.08,.022,100,'native')];
 return{nativeWords:native,ocrWords:ocr};
}

// Public constants and normalization keep Swedish display text intact while
// matching section/header labels independently of accents and punctuation.
assert.equal(Core.SCHEMA_VERSION,1);
assert.equal(Core.cleanText('  Dörrstängare\u00a0ÅÄÖ  '),'Dörrstängare ÅÄÖ');
assert.equal(Core.searchKey('ÖVRIG utrustning'),'ovrigutrustning');
assert.equal(Core.detectSection('LARM / PASSER').key,'alarm-access');
assert.equal(Core.detectSection('Nattlasning').key,'night-locking');
const splitCodeTemplate=Core.createTemplateGroup({page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:[
 {text:'Beslags',x:.05,y:.05,w:.10,h:.03,source:'native'},{text:'kod',x:.16,y:.05,w:.05,h:.03,source:'native'},{text:'GS23',x:.24,y:.05,w:.08,h:.03,source:'native'},
 {text:'Benämning',x:.05,y:.2,w:.15,h:.03,source:'native'},{text:'Typ',x:.5,y:.2,w:.05,h:.03,source:'native'},{text:'Antal',x:.72,y:.2,w:.07,h:.03,source:'native'},{text:'Monteras av',x:.84,y:.2,w:.14,h:.03,source:'native'}
]});
assert.equal(Core.createCard({template:splitCodeTemplate,page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:[
 {text:'Beslagskod:WC',x:.05,y:.05,w:.22,h:.03,source:'native'}
]}).header.code,'WC','split and inline Beslagskod labels are both supported');
assert.equal(Core.createCard({template:splitCodeTemplate,page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:[
 {text:'Beslagskod:',x:.05,y:.05,w:.18,h:.03,source:'native'},{text:'GS23',x:.25,y:.05,w:.08,h:.03,source:'native'}
]}).header.code,'GS23','a colon-only label token never becomes the code value');
const mixedHeaderCard=Core.createCard({template:splitCodeTemplate,page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:[
 {text:'Projekt',x:.01,y:.05,w:.10,h:.03,source:'native'},{text:'Beslagskod',x:.15,y:.05,w:.16,h:.03,source:'native'},{text:'WC',x:.34,y:.05,w:.06,h:.03,source:'native'}
]});
assert.equal(mixedHeaderCard.header.code,'WC');
assert(mixedHeaderCard.unassignedTokens.some(token=>token.text==='Projekt'),'text before a code label on the same visual row is never swallowed');

const codeOnlyWords=[
 {text:'GS',x:.20,y:.05,w:.06,h:.03,source:'native'},{text:'23',x:.275,y:.05,w:.05,h:.03,source:'native'},
 {text:'Benämning',x:.05,y:.2,w:.15,h:.03,source:'native'},{text:'Typ',x:.5,y:.2,w:.05,h:.03,source:'native'},{text:'Antal',x:.72,y:.2,w:.07,h:.03,source:'native'},{text:'Monteras av',x:.84,y:.2,w:.14,h:.03,source:'native'}
];
const codeOnlyTemplate=Core.createTemplateGroup({page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:codeOnlyWords});
assert(codeOnlyTemplate.header.codeAnchor&&codeOnlyTemplate.header.codeAnchor.label==='Beteckning','an unlabeled code creates a reusable position anchor');
const codeOnlyCard=Core.createCard({template:codeOnlyTemplate,page:2,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:[
 {text:'WC',x:.20,y:.05,w:.06,h:.03,source:'native'},...codeOnlyWords.slice(2)
]});
assert.equal(codeOnlyCard.header.code,'WC','the learned position reads a different short code without a Beslagskod label');
assert.equal(Core.normalizedCode(Core.createCard({template:codeOnlyTemplate,page:1,rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',words:codeOnlyWords}).header.code),'GS23');

const input=fixture();
const combined=Core.combineWords({...input,rect,viewport});
const codeToken=combined.find(token=>token.text==='WC');
assert(codeToken,'native code spelling wins at the shared position');
assert(codeToken.alternatives.some(entry=>entry.text==='W C'),'disagreeing low-confidence OCR is preserved as an alternative');
assert(codeToken.provenance.some(entry=>entry.source==='native')&&codeToken.provenance.some(entry=>entry.source==='ocr'));
assert.equal(codeToken.conflict,false,'spacing-only variants normalize to the same code');
const conflicting=Core.combineWords({rect:{x:0,y:0,w:1,h:1},wordUnits:'normalized-card',nativeWords:[{text:'DC700',x:.1,y:.1,w:.15,h:.03,source:'native'}],ocrWords:[{text:'BC700',x:.1,y:.1,w:.15,h:.03,source:'ocr',confidence:94}]})[0];
assert.equal(conflicting.conflict,true,'different native and visible OCR spellings are an explicit conflict');
assert.equal(conflicting.lowConfidence,true);assert.equal(conflicting.reviewed,false,'a native/OCR conflict always requires human review');
assert.equal(combined.some(token=>token.text==='W C'),false,'one physical word is not duplicated');
assert(combined.some(token=>token.text==='Dörrstängare'&&token.lowConfidence),'uncertain Swedish text is retained');
assert(combined.every(token=>token.box.x>=0&&token.box.x<=1&&token.pageBox.x>=rect.x-.001));
const conflictOcr=word('BC700',.48,.615,.10),conflictNative=word('DC700',.48,.615,.10,.022,100,'native'),conflictToken=Core.combineWords({nativeWords:[conflictNative],ocrWords:[conflictOcr],rect,viewport})[0];
assert.equal(conflictToken.text,'DC700');assert.equal(conflictToken.conflict,true);assert.equal(conflictToken.reviewed,false);
assert.deepEqual(new Set(conflictToken.alternatives.map(item=>item.text)),new Set(['DC700','BC700']),'native/OCR disagreement retains both readings');

const visual=Core.groupVisualRows(combined);
assert(visual.some(line=>line.text.includes('Typ / Utförande')));
assert.equal(visual.filter(line=>line.text.includes('Dörrstängare')).length,1);
const derived=Core.deriveColumns(visual);
assert.deepEqual(derived.columns.map(column=>column.key),Core.CELL_KEYS);
assert(derived.detected.includes('designation')&&derived.detected.includes('installer'));
assert(derived.columns.every((column,index,list)=>column.x0<column.x1&&(index===0||column.x0===list[index-1].x1)));

const template=Core.createTemplateGroup({name:'Tånga dörrkort',groupId:'layout-tanga',page:6,rect,viewport,...input});
assert.equal(template.schema,Core.TEMPLATE_SCHEMA);
assert.equal(template.groupId,'layout-tanga');
assert.equal(template.sections.length,4,'one template contains every canonical section');
assert(template.sections.find(section=>section.key==='day-locking').anchorY!=null);
assert(template.sections.find(section=>section.key==='night-locking').anchorY!=null,'accentless OCR still finds Nattlåsning');
assert(template.sections.find(section=>section.key==='other-equipment').anchorY!=null);
assert(template.sections.find(section=>section.key==='alarm-access').anchorY!=null);
assert.equal(template.header.codeAnchor.valueX>0,true);
assert.deepEqual(Core.validateTemplate(template),{valid:true,errors:[]});

let card=Core.createCard({template,page:7,fileName:'Tånga gg.pdf',rect,viewport,...input});
assert.equal(card.schema,Core.CARD_SCHEMA);
assert.equal(card.header.code,'WC');
assert.equal(card.header.normalizedCode,'WC');
assert.equal(card.header.fields[0].text,'Projekt Tånga');
assert.deepEqual(card.sections.map(section=>section.label),['Daglåsning','Nattlåsning','Övrig utrustning','Larm-Passer']);
assert.deepEqual(card.sections.map(section=>section.rows.length),[1,1,1,1]);
const otherRow=card.sections.find(section=>section.key==='other-equipment').rows[0];
assert.deepEqual(otherRow.cells,{designation:'Dörrstängare',type:'DC700',quantity:'1',installer:'GS'});
assert(otherRow.confidence.low,'uncertain cell remains part of the structured row and is flagged');
assert.equal(card.unassignedTokens.length,1);
assert.equal(card.unassignedTokens[0].text,'OSÄKERT');
assert.equal(card.review.status,'needs-review');
assert.equal(card.review.canApprove,false);
assert.equal(card.review.pendingLowConfidenceCount,2,'assigned and unassigned uncertain words are both reported');
assert.deepEqual(Core.validateCard(card),{valid:true,errors:[]},'unassigned text is explicit and therefore lossless/valid');

const missingOtherHeading={nativeWords:input.nativeWords,ocrWords:input.ocrWords.filter(token=>!['Övrig','utrustning'].includes(token.text)).map(token=>token.text==='Dörrstängare'?{...token,confidence:96}:token)};
let positionFallback=Core.createCard({template,page:8,fileName:'Tånga gg.pdf',rect,viewport,...missingOtherHeading});
const fallbackRow=positionFallback.sections.find(section=>section.key==='other-equipment').rows.find(row=>row.cells.type==='DC700');
assert(fallbackRow,'a missing Övrig utrustning heading uses the approved template position instead of leaving DC700 under Nattlåsning');
assert.equal(positionFallback.sections.find(section=>section.key==='night-locking').rows.some(row=>row.cells.type==='DC700'),false);
assert.equal(fallbackRow.sectionAssignment.method,'template-position');assert.equal(fallbackRow.requiresReview,true);assert.equal(fallbackRow.reviewed,false);
assert.equal(positionFallback.review.inferredSectionCount,1);assert.equal(positionFallback.review.canApprove,false,'position fallback cannot be silently approved');
positionFallback=Core.updateRow(positionFallback,fallbackRow.id,{reviewed:true});
assert.equal(positionFallback.review.inferredSectionCount,0,'explicit row review resolves the position warning');

const withoutFirstStructure={nativeWords:input.nativeWords,ocrWords:input.ocrWords.filter(token=>{
 const relativeY=(token.y/viewport.height-rect.y)/rect.h;return !(relativeY>=.17&&relativeY<=.22)&&token.text!=='Daglåsning';
})};
const firstAnchorFallback=Core.createCard({template,page:9,fileName:'Tånga gg.pdf',rect,viewport,...withoutFirstStructure});
const dayFallback=firstAnchorFallback.sections.find(section=>section.key==='day-locking').rows.find(row=>row.cells.type==='565');
assert(dayFallback,'template position recovers Daglås rows even when both the column header and Daglåsning heading are absent');
assert.equal(dayFallback.requiresReview,true);assert(firstAnchorFallback.review.inferredSectionCount>=1);

const conflictInput={nativeWords:[...input.nativeWords,conflictNative],ocrWords:input.ocrWords.map(token=>token.text==='DC700'?{...token,text:'BC700',confidence:88}:token)};
let conflictCard=Core.createCard({template,page:10,fileName:'Tånga gg.pdf',rect,viewport,...conflictInput});
const disputed=conflictCard.sourceTokens.find(token=>token.text==='DC700'&&token.conflict),disputedRow=conflictCard.sections.find(section=>section.key==='other-equipment').rows.find(row=>row.tokenIds.includes(disputed.id));
assert(disputed&&disputedRow);assert.equal(conflictCard.review.pendingConflictCount,1);assert.equal(conflictCard.review.canApprove,false);
conflictCard=Core.markTokenReviewed(conflictCard,disputed.id,true);
assert.equal(conflictCard.review.pendingConflictCount,1,'a generic reviewed flag cannot silently choose between PDF and image text');
assert.equal(conflictCard.review.canApprove,false);
conflictCard=Core.updateRow(conflictCard,disputedRow.id,{cells:{type:'BC700'}});
assert.equal(conflictCard.sourceTokens.find(token=>token.id===disputed.id).reviewed,true);assert.equal(conflictCard.sourceTokens.find(token=>token.id===disputed.id).conflict,false);assert.equal(conflictCard.review.pendingConflictCount,0,'editing the disputed cell explicitly resolves its native/OCR conflict');

// Editing one cell confirms only the OCR words in that cell. Another
// uncertain cell on the same row must remain pending until explicitly read.
let guarded=JSON.parse(JSON.stringify(card));
const guardedRow=guarded.sections.find(section=>section.key==='other-equipment').rows[0],guardedTypeId=guardedRow.cellMeta.type.tokenIds[0],guardedDesignationId=guardedRow.cellMeta.designation.tokenIds[0];
Object.assign(guarded.sourceTokens.find(token=>token.id===guardedTypeId),{confidence:35,lowConfidence:true,reviewed:false});
guarded=Core.recomputeReviewCompleteness(guarded);
const oneCellEdited=Core.updateRow(guarded,guardedRow.id,{cells:{type:'DC 700'}});
assert.equal(oneCellEdited.sourceTokens.find(token=>token.id===guardedTypeId).reviewed,true);
assert.equal(oneCellEdited.sourceTokens.find(token=>token.id===guardedDesignationId).reviewed,false,'editing Typ must not approve uncertain Benämning');
const wholeRowReviewed=Core.updateRow(oneCellEdited,guardedRow.id,{reviewed:true});
assert(wholeRowReviewed.sections.find(section=>section.key==='other-equipment').rows[0].tokenIds.every(id=>wholeRowReviewed.sourceTokens.find(token=>token.id===id).reviewed),'an explicit whole-row review confirms every cell');

let guardedCode=JSON.parse(JSON.stringify(card));
const codeLabelToken=guardedCode.sourceTokens.find(token=>token.text==='Beslagskod'),codeValueToken=guardedCode.sourceTokens.find(token=>token.text==='WC');
Object.assign(codeLabelToken,{confidence:30,lowConfidence:true,reviewed:false});Object.assign(codeValueToken,{confidence:30,lowConfidence:true,reviewed:false});guardedCode=Core.recomputeReviewCompleteness(guardedCode);
const codeEdited=Core.updateHeader(guardedCode,{code:'WC-1'});
assert.equal(codeEdited.sourceTokens.find(token=>token.id===codeValueToken.id).reviewed,true);
assert.equal(codeEdited.sourceTokens.find(token=>token.id===codeLabelToken.id).reviewed,false,'editing the code value does not silently approve an uncertain label');

// Every source token is referenced exactly once by header, fixed labels,
// structured rows, unassigned review, or an explicit ignored decision.
const assigned=new Map();
function count(id){assigned.set(id,(assigned.get(id)||0)+1);}
card.header.tokenIds.forEach(count);card.header.fields.forEach(field=>field.tokenIds.forEach(count));
card.fixedElements.forEach(fixed=>fixed.tokenIds.forEach(count));
card.sections.forEach(section=>section.rows.forEach(row=>row.tokenIds.forEach(count)));
card.unassignedTokens.forEach(token=>count(token.id));card.ignoredTokenIds.forEach(count);
assert.equal(assigned.size,card.sourceTokens.length);
assert([...assigned.values()].every(value=>value===1));

const original=card;
const lowAssigned=card.sourceTokens.find(token=>token.text==='Dörrstängare');
card=Core.markTokenReviewed(card,lowAssigned.id);
assert.equal(original.sourceTokens.find(token=>token.id===lowAssigned.id).reviewed,false,'editing helpers do not mutate saved input');
const loose=card.unassignedTokens[0];card=Core.ignoreToken(card,loose.id);
assert.equal(card.unassignedTokens.length,0);
assert.equal(card.review.pendingLowConfidenceCount,0);
assert.equal(card.review.canApprove,true);

// A reader status is optional for legacy cards. Once present, however, only a
// completed OCR/native read may be approved. Partial/error/empty and future
// unknown statuses must not silently approve the subset of words returned.
for(const readStatus of ['read','native']){
 const completeRead=JSON.parse(JSON.stringify(card));completeRead.source.readStatus=readStatus;
 const reviewed=Core.recomputeReviewCompleteness(completeRead);
 assert.equal(reviewed.review.canApprove,true,readStatus+' is a completed source read');
 assert.equal(reviewed.review.sourceReadIncomplete,false);
}
for(const readStatus of ['partial','error','excluded','pending','empty','future-reader-status']){
 const incompleteRead=JSON.parse(JSON.stringify(card));incompleteRead.source.readStatus=readStatus;
 const reviewed=Core.recomputeReviewCompleteness(incompleteRead);
 assert.equal(reviewed.review.canApprove,false,readStatus+' cannot be approved');
 assert.equal(reviewed.review.sourceReadStatus,readStatus);
 assert.equal(reviewed.review.sourceReadIncomplete,true);
 assert(reviewed.review.issues.some(issue=>issue.includes(readStatus)&&issue.includes('inte färdig')));
 assert.throws(()=>Core.approveCard(incompleteRead),/inte färdig/);
}
card=Core.approveCard(card);
assert.equal(card.review.status,'approved');assert.equal(card.review.complete,true);

const fieldId=card.header.fields[0].id,fieldBefore=card.header.fields[0].text;
let headerEdited=Core.updateHeaderField(card,fieldId,'Projekt Tånga skola');
assert.equal(card.header.fields[0].text,fieldBefore,'header editing is immutable');
assert.equal(headerEdited.header.fields[0].text,'Projekt Tånga skola');
assert.equal(headerEdited.review.status,'changed-after-approval');
assert.equal(headerEdited.audit.at(-1).action,'header-field-updated');
assert(headerEdited.header.fields[0].tokenIds.every(id=>headerEdited.sourceTokens.find(token=>token.id===id).reviewed));
headerEdited=Core.updateHeaderField(headerEdited,fieldId,{text:'Tånga skola',label:'Projekt'});
assert.equal(headerEdited.header.fields[0].text,'Tånga skola');assert.equal(headerEdited.header.fields[0].label,'Projekt');
assert.throws(()=>Core.updateHeaderField(card,'missing-field','X'),/finns inte/);

const approvedJson=Core.serialize(card);
assert(approvedJson.includes('Dörrstängare')&&approvedJson.includes('Tånga'));
assert.deepEqual(Core.parse(approvedJson),card,'JSON roundtrip preserves canonical Swedish card data');
const project=Core.createProject({name:'Tånga digitala dörrkort',template,cards:[card],source:{fileName:'Tånga gg.pdf'}});
assert.deepEqual(Core.validateProject(project),{valid:true,errors:[]});
assert.equal(Core.parse(Core.serialize(project),Core.PROJECT_SCHEMA).cards[0].header.code,'WC');

// Editing an approved card changes its review state and retains source links.
const rowId=card.sections.find(section=>section.key==='other-equipment').rows[0].id;
let edited=Core.updateRow(card,rowId,{cells:{type:'DC 700'}});
assert.equal(edited.sections.find(section=>section.key==='other-equipment').rows[0].cells.type,'DC 700');
assert.equal(edited.review.status,'changed-after-approval');
edited=Core.moveRow(edited,rowId,{sectionKey:'day-locking',index:0});
assert.equal(edited.sections.find(section=>section.key==='day-locking').rows[0].id,rowId);
assert.equal(edited.sections.find(section=>section.key==='day-locking').rows[0].sectionKey,'day-locking');
const added=Core.addRow(edited,'other-equipment',{designation:'Karmöverföring',type:'EA 280',quantity:'1',installer:'GS'},0);
assert.equal(added.sections.find(section=>section.key==='other-equipment').rows[0].cells.designation,'Karmöverföring');
assert.equal(added.sections.find(section=>section.key==='other-equipment').rows[0].manual,true);

// Removing an OCR-derived row cannot silently discard it; all its source
// words return to the explicit "not transferred" list and can be assigned.
const moved=added.sections.find(section=>section.key==='day-locking').rows.find(row=>row.id===rowId),removed=Core.removeRow(added,rowId);
assert(moved.tokenIds.every(id=>removed.unassignedTokens.some(token=>token.id===id)));
let reassigned=removed;
for(const id of moved.tokenIds){
 const token=reassigned.sourceTokens.find(item=>item.id===id);
 const column=token.text==='DC700'?'type':token.text==='1'?'quantity':token.text==='GS'?'installer':'designation';
 reassigned=Core.assignToken(reassigned,id,{sectionKey:'other-equipment',column});
}
const assignedRows=reassigned.sections.find(section=>section.key==='other-equipment').rows.filter(row=>row.tokenIds.length);
assert.equal(assignedRows.length,4,'assigning without rowId deliberately creates reviewable rows');
assert.equal(reassigned.unassignedTokens.some(token=>moved.tokenIds.includes(token.id)),false);

const malformed=JSON.parse(Core.serialize(card));
malformed.unassignedTokens.push(malformed.sourceTokens[0]);
assert.equal(Core.validateCard(malformed).valid,false,'duplicate token assignment is rejected');
assert.throws(()=>Core.parse('{bad json'),/giltig JSON/);
assert.throws(()=>Core.parse(Core.serialize(template),Core.CARD_SCHEMA),/fel slags/);

console.log('PASS door-card digitizer core: one reusable layout, lossless Swedish OCR/native observations, sections/columns, editable review, validation and JSON');
