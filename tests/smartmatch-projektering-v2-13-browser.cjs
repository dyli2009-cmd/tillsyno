'use strict';
// Real-page regression: reuse deleted numbers and derive material/labor from GS cards only.
// No screenshots, generated images, remote writes or production source mocks.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared fixture boundaries changed');
function scenario(){
 const lock=card=>card.rows.find(row=>row.id==='day-lock').product;
 async function menu(page,id){const item=page.locator(id);if(!await item.isVisible())await item.locator('xpath=ancestor::details[1]').locator(':scope > summary').click();await item.click();}
 async function cardDialog(page,button,expected){await view(page,'cards');await page.locator(button).click();await page.waitForSelector('#textDialog[open]');assert.equal(await page.locator('#textValue').inputValue(),expected,'lowest available number for '+button);}
 async function acceptCard(page,code){await page.locator('#textAccept').click();await page.waitForFunction(code=>!!Proj2App.snapshot().state.cards[code],code);await idle(page);assert.equal((await snap(page)).activeCode,code);}
 async function product(page,value){const input=page.locator('#cardRows input[data-product-input][data-row-id="day-lock"]');await input.scrollIntoViewIfNeeded();await input.fill(value);await input.press('Escape');}
 async function deleteCard(page,code){await view(page,'cards');assert.equal((await snap(page)).activeCode,code);await page.locator('#deleteCard').click();await confirm(page);await page.waitForFunction(code=>!Proj2App.snapshot().state.cards[code],code);await idle(page);}
 async function pdfText(page,bytes){return page.evaluate(async data=>{const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data)}).promise,result=[];try{for(let n=1;n<=pdf.numPages;n++)result.push((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '));return result;}finally{await pdf.destroy();}},Array.from(bytes));}
 async function assertGap(page,placement,expected='GS1:2'){
  await select(page,placement.id);await view(page,'cards');
  for(const button of ['#newCard','#copyCard','#forkCard']){await cardDialog(page,button,expected);await page.locator('#textCancel').click();await idle(page);}
 }
 async function gapFlow(page){
  await cardDialog(page,'#newCard','GS1:1');await acceptCard(page,'GS1:1');await product(page,'310-50');await saveCard(page);
  const original=(await snap(page)).state.cards['GS1:1'];
  await cardDialog(page,'#copyCard','GS1:2');await acceptCard(page,'GS1:2');await product(page,'411-50 MA');await saveCard(page);
  await view(page,'stencils');await page.locator('#editStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilFill').fill('#f5c44e');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);
  const secondTemplate=(await snap(page)).state.stencils['GS1:2'];
  const two=await place(page,'GS1:2',.27,.4);
  await cardDialog(page,'#copyCard','GS1:3');await acceptCard(page,'GS1:3');await product(page,'511-50');await saveCard(page);
  const three=await place(page,'GS1:3',.55,.4),threeSibling=await place(page,'GS1:3',.75,.4),before=(await snap(page)).state;
  const thirdCard=before.cards['GS1:3'],thirdPositions=before.placements.filter(position=>position.code==='GS1:3');
  await select(page,two.id);await view(page,'cards');await page.locator('#deleteCard').click();await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmCancel').click();await idle(page);assert.deepEqual((await snap(page)).state,before,'cancel delete keeps the number and all positions');
  await deleteCard(page,'GS1:2');let current=(await snap(page)).state;
  assert(!current.placements.some(position=>position.id===two.id),'card deletion removes its physical stamp');assert.deepEqual(current.cards['GS1:3'],thirdCard);assert.deepEqual(current.placements.filter(position=>position.code==='GS1:3'),thirdPositions,'third doors are not renumbered after deleting second card');
  await view(page,'drawing');await page.locator('#undo').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards['GS1:2']);await idle(page);assert.deepEqual((await snap(page)).state.cards['GS1:2'],before.cards['GS1:2']);assert.deepEqual((await snap(page)).state.placements,before.placements,'undo restores exact deleted card links');
  await page.locator('#redo').click();await page.waitForFunction(()=>!Proj2App.snapshot().state.cards['GS1:2']);await idle(page);await assertGap(page,three);
  const gapState=(await snap(page)).state,json=await download(page,()=>menu(page,'#saveProject')),pdf=await download(page,()=>menu(page,'#exportPdf'));
  assert.equal((await PDFDocument.load(pdf.bytes)).getPageCount(),3,'drawing and remaining :1/:3 cards export without a deleted :2 card page');
  for(const [bytes,name]of [[pdf.bytes,'gap-project.pdf'],[json.bytes,'gap-project.json']]){await page.locator('#projectFile').setInputFiles(upload(bytes,name));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,gapState,'portable gap project retains exact card identities');await assertGap(page,three);}
  await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state,gapState);await assertGap(page,three);
  await cardDialog(page,'#newCard','GS1:2');await acceptCard(page,'GS1:2');assert.equal(lock((await snap(page)).state.cards['GS1:2']),'','new card reuses deleted :2 with empty products');assert.deepEqual((await snap(page)).state.stencils['GS1:2'],secondTemplate,'new card reuses the deleted slot template without changing its saved style or ID');assert.deepEqual((await snap(page)).state.cards['GS1:3'],thirdCard);await deleteCard(page,'GS1:2');
  await select(page,three.id);await cardDialog(page,'#copyCard','GS1:2');await acceptCard(page,'GS1:2');assert.equal(lock((await snap(page)).state.cards['GS1:2']),'511-50','copy reuses the gap with source products');assert.deepEqual((await snap(page)).state.cards['GS1:3'],thirdCard);
  await cardDialog(page,'#copyCard','GS1:4');await page.locator('#textCancel').click();await idle(page);await deleteCard(page,'GS1:2');
  await select(page,three.id);await cardDialog(page,'#forkCard','GS1:2');await acceptCard(page,'GS1:2');
  current=(await snap(page)).state;assert.equal(current.placements.find(position=>position.id===three.id).code,'GS1:2');assert.equal(current.placements.find(position=>position.id===threeSibling.id).code,'GS1:3','private gap reuse changes only the selected door');assert.deepEqual(current.cards['GS1:3'],thirdCard);assert.deepEqual(current.cards['GS1:1'],original);assert.deepEqual(current.stencils['GS1:2'],secondTemplate,'private gap reuse preserves the existing slot template style and ID');
  await cardDialog(page,'#forkCard','GS1:4');await page.locator('#textCancel').click();await idle(page);
 }
 async function legacyGap(page){
  const D=require('../smartmatch-projektering-v2-12-data.js'),P=require('../smartmatch-projektering-v2-12-pdf.js'),sample=await P.blank('Legacy deleted number gap');
  D.ensureCard(sample.state,'GS1:1');
  for(const code of ['GS1:2','GS1:3']){D.addStencil(sample.state,D.defaultStencil(code));D.ensureCard(sample.state,code);}
  D.updateStencil(sample.state,'GS1:2',{fill:'#77aadd',width:62,height:31});
  D.addPlacement(sample.state,{id:'legacy-two',page:1,stencilId:'GS1:2',x:.3,y:.35});const third=D.addPlacement(sample.state,{id:'legacy-three',page:1,stencilId:'GS1:3',x:.65,y:.35});
  D.removeCard(sample.state,'GS1:2',{cascade:true});assert(sample.state.stencils['GS1:2'],'old2.12 leaves a deleted card template');
  const bytes=await P.build(sample.state,sample.original,{mode:'combined'});await page.locator('#projectFile').setInputFiles(upload(bytes,'legacy-gap-2-12.pdf'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,sample.state,'old deleted-number project imports without destructive migration');
  await assertGap(page,third);await cardDialog(page,'#forkCard','GS1:2');await acceptCard(page,'GS1:2');const actual=(await snap(page)).state;
  assert.deepEqual(actual.stencils['GS1:2'],sample.state.stencils['GS1:2'],'reused legacy gap template retains style and identity');assert.deepEqual(actual.cards['GS1:3'],sample.state.cards['GS1:3'],'legacy third card keeps its code and contents');
 }
 async function materialFixture(){
  const D=require('../smartmatch-projektering-v2-13-data.js'),P=require('../smartmatch-projektering-v2-12-pdf.js'),M=require('../smartmatch-projektering-v2-13-materials.js'),sample=await P.blank('GS-only material fixture'),state=D.validate(sample.state);
  function stamp(code,productName,x,y,quantity=1){
   if(!state.stencils[code])D.addStencil(state,D.defaultStencil(code));
   const position=D.addPlacement(state,{id:'door-'+String(state.placements.length),page:1,stencilId:code,x,y});
   const card=D.clone(state.cards[code]);Object.assign(card.rows.find(row=>row.id==='day-lock'),{product:productName,quantity});D.updateCard(state,code,card);return position;
  }
  stamp('GS1:1','GS-LOCK',.15,.22,2);D.addPlacement(state,{id:'shared-gs',page:1,stencilId:'GS1:1',x:.35,y:.22});
  let card=D.clone(state.cards['GS1:1']);Object.assign(card.rows.find(row=>row.id==='closing-operator'),{product:'ED100',quantity:1});Object.assign(card.rows.find(row=>row.id==='closing-elbow'),{product:'JCK207',quantity:1});D.updateCard(state,'GS1:1',card);
  stamp('GS2-A','LEGACY-GS',.55,.22);D.removeStencil(state,'GS3:1');stamp('GS-3:1','ALIAS-GS',.75,.22);
  const excluded=['DTS','DBL:1','WC:1','HWC:1','DGS100:1'];
  for(let index=0;index<excluded.length;index++)stamp(excluded[index],'EXCLUDED-'+excluded[index].replace(':','-'),.15+index*.15,.5,9);
  card=D.clone(state.cards.DTS);Object.assign(card.rows.find(row=>row.id==='night-lock'),{product:'GS-LOCK',quantity:9});Object.assign(card.rows.find(row=>row.id==='closing-operator'),{product:'ED100',quantity:9});D.updateCard(state,'DTS',card);
  for(const [index,code]of ['DA','DS','DFS'].entries())D.addPlacement(state,{id:'symbol-'+code,page:1,stencilId:code,x:.18+index*.18,y:.74,equipment:{model:'EXCLUDED-SYMBOL-'+code,quantity:3}});
  D.addStencil(state,{...D.defaultStencil('GS99:2'),kind:'symbol',productType:'other',category:'Övrigt'});D.addPlacement(state,{id:'symbol-with-gs-code',page:1,stencilId:'GS99:2',x:.78,y:.74,equipment:{model:'EXCLUDED-GS-SYMBOL',quantity:9}});
  for(const [component,name,rate]of [['lock','GS-LOCK',7.5],['lock','LEGACY-GS',4],['lock','ALIAS-GS',3],['elbow','JCK207',2],['operator','ED100',90],['lock','EXCLUDED-DTS',999]])D.setMaterialTime(state,M.materialKey(component,name),rate);
  return{state,original:sample.original,bytes:await P.build(state,sample.original,{mode:'combined'}),excluded};
 }
 async function materialFlow(page){
  const material=await materialFixture();await page.locator('#projectFile').setInputFiles(upload(material.bytes,'gs-only-materials.pdf'));await confirm(page);await idle(page);
  const before=(await snap(page)).state;assert.deepEqual(before.cards,material.state.cards,'project import retains every GS and non-GS card');assert.deepEqual(before.placements,material.state.placements,'project import retains all drawing symbols');assert.deepEqual(before.preferences,material.state.preferences);for(const [id,stencil]of Object.entries(material.state.stencils))assert.deepEqual(before.stencils[id],stencil,'imported stencil retains its own appearance');
  await view(page,'materials');await page.waitForFunction(()=>Proj2App.snapshot().materials?.rows.some(row=>row.product==='GS-LOCK'));
  const report=(await snap(page)).materials,byName=name=>report.rows.find(row=>row.product===name);
  assert.equal(report.rows.length,5,'only five GS card product models contribute');assert.equal(byName('GS-LOCK').quantity,4,'DTS using the same product cannot inflate GS quantity');assert.equal(byName('ED100').quantity,2,'only GS card door operators enter material');assert.equal(byName('JCK207').quantity,4,'GS elbow contacts keep factor two per physical door');assert.equal(byName('LEGACY-GS').quantity,1);assert.equal(byName('ALIAS-GS').quantity,1);
  assert.equal(report.totalQuantity,12);assert.equal(report.totalMinutes,225);assert.equal(report.untimedRows,0);assert.equal(report.hasEstimates,true);assert.deepEqual([...report.excludedCards].sort(),[...material.excluded].sort(),'non-GS card exclusions are explicit');
  assert(report.rows.every(row=>row.sources.every(source=>['GS1:1','GS2-A','GS-3:1'].includes(source.code))));assert.equal(await page.locator('#materialRows tr').count(),5);assert(!await page.locator('#materialRows').textContent().then(text=>text.includes('EXCLUDED-')));
  assert((await page.locator('#materialTotalTime').textContent()).length>0);assert.deepEqual((await snap(page)).state,before,'filtering material never changes non-GS project data');
  const expectedCounts=await page.evaluate(()=>Proj2Data.placementCounts(Proj2App.snapshot().state)),actualCounts=await page.evaluate(()=>({markings:+document.getElementById('placementCount').textContent,cards:+document.getElementById('cardCount').textContent,doorAutomation:+document.getElementById('automationCount').textContent,doorCloser:+document.getElementById('closerCount').textContent,otherProducts:+document.getElementById('otherProductCount').textContent}));assert.deepEqual(actualCounts,expectedCounts);assert.equal(actualCounts.cards,8,'excluded non-GS cards still count in project overview');
  const csv=await download(page,()=>page.locator('#materialCsv').click()),pdf=await download(page,()=>page.locator('#materialPdf').click()),csvText=csv.bytes.toString('utf8'),listText=(await pdfText(page,pdf.bytes)).join(' ');
  for(const name of ['GS-LOCK','LEGACY-GS','ALIAS-GS','ED100','JCK207']){assert(csvText.includes(name));assert(listText.includes(name));}assert(csvText.includes('225'));assert(listText.includes('225'));assert(!csvText.includes('EXCLUDED-'));assert(!listText.includes('EXCLUDED-'));
  const combined=await download(page,()=>menu(page,'#exportPdf')),projectText=(await pdfText(page,combined.bytes)).join(' ');assert.equal((await PDFDocument.load(combined.bytes)).getPageCount(),9,'non-GS cards remain in project/card PDF');for(const code of material.excluded)assert(projectText.includes(code),'project PDF retains excluded material card '+code);assert(projectText.includes('EXCLUDED-DTS'),'DTS card products remain on their card PDF despite material exclusion');
  const json=await download(page,()=>menu(page,'#saveProject'));for(const [bytes,name]of [[combined.bytes,'gs-material-reopen.pdf'],[json.bytes,'gs-material-reopen.json']]){await page.locator('#projectFile').setInputFiles(upload(bytes,name));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,before);assert.equal((await snap(page)).materials.totalMinutes,225);assert.equal((await snap(page)).materials.totalQuantity,12);}
  await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state,before);assert.equal((await snap(page)).materials.totalMinutes,225);
 }
 async function run(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  try{await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.13');await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);await gapFlow(page);await legacyGap(page);await materialFlow(page);await overflow(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');console.log(device.name+': deleted-number gap reuse through new/copy/private, history, older orphan templates and PDF/JSON/reload; GS-only materials/time with retained non-GS cards/counts passed');}
  catch(error){console.error(device.name+' 2.13 diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,code:window.Proj2App?.snapshot().activeCode,cards:Object.keys(window.Proj2App?.snapshot().state.cards||{}),materials:window.Proj2App?.snapshot().materials,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>({})));throw error;}finally{await ctx.close();}
 }
}
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-13.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
