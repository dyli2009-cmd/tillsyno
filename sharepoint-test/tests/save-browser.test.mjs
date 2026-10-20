/**
 * Integration tests for the real SharePoint UI, export bridge and upload client.
 * Microsoft authentication and every Graph/SharePoint HTTP response are local
 * fixtures. This does not verify a Microsoft tenant, consent or live uploading.
 *
 * RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/tmp/chromium \
 *   node --test tests/save-browser.test.mjs
 *
 * Playwright may be installed normally or supplied by
 * CODEX_PRIMARY_RUNTIME_NODE_MODULES. Browser tests are opt-in so ordinary
 * npm test remains usable without an installed browser.
 */
import assert from 'node:assert/strict';
import {before,after,describe,test} from 'node:test';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {createHarnessServer,GraphFixture,startExport,connect,waitFor,bounded} from './save-browser-harness.mjs';
import {projectFixture,projectData} from './save-browser-project-fixture.mjs';

const require=createRequire(import.meta.url);
const enabled=process.env.RUN_SHAREPOINT_BROWSER_TESTS==='1';
const artifactDir=process.env.SHAREPOINT_BROWSER_ARTIFACTS||'/tmp/sharepoint-save-browser';

// A valid generated one-page PDF, with an xref computed from its actual bytes.
// The fixture contains no customer content and is not an OCR substitute.
function syntheticPDF(){
  const content='BT /F1 13 Tf 50 760 Td (Synthetic SharePoint export integration) Tj ET\n';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'endstream',
  ];
  let data='%PDF-1.4\n';const offsets=[0];
  for(let index=0;index<objects.length;index++){offsets.push(Buffer.byteLength(data));data+=(index+1)+' 0 obj\n'+objects[index]+'\nendobj\n';}
  const xref=Buffer.byteLength(data);
  data+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  data+=offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
  data+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(data);
}

describe('SharePoint save browser integration (synthetic local Microsoft stubs)',{skip:!enabled,concurrency:false},()=>{
  let browser,server;
  const fixture=syntheticPDF();

  before(async()=>{
    let playwright;
    try{playwright=require('playwright');}
    catch(error){
      if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;
      playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
    }
    browser=await playwright.chromium.launch({
      executablePath:process.env.CHROMIUM_PATH||undefined,
      args:['--no-sandbox','--disable-dev-shm-usage'],
    });
    server=await createHarnessServer(fixture);
    await mkdir(artifactDir,{recursive:true});
  });
  after(async()=>{await browser?.close();await server?.close();});

  async function scenario(name,options,fn){
    const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block',viewport:options.viewport||{width:1280,height:900}});
    const currentServer=options.server||server;
    const graph=new GraphFixture(options);
    await graph.install(context,currentServer.base);
    const page=await context.newPage(),downloads=[],pageErrors=[];
    page.on('download',download=>downloads.push(download));
    page.on('pageerror',error=>pageErrors.push(error.message));
    await page.goto(currentServer.base+'/sharepoint-read-test.html');
    try{
      if(options.setup)await page.evaluate(options.setup);
      await fn({page,graph,downloads,context});
      assert.deepEqual(pageErrors,[],'The integration must not throw uncaught browser errors.');
    }catch(error){
      await page.screenshot({path:artifactDir+'/'+name+'.png',fullPage:true}).catch(()=>{});
      const diagnostics=await page.evaluate(()=>({saveStatus:document.querySelector('#spSaveStatus')?.textContent,saveResult:document.querySelector('#spSaveResult')?.textContent,dialog:document.querySelector('#spSavePicker')?.outerHTML,state:window.__saveBrowser})).catch(()=>null);
      console.error(name,JSON.stringify(diagnostics));
      throw error;
    }finally{graph.release();await context.close();}
  }

  const state=page=>page.evaluate(()=>window.__saveBrowser.exports.at(-1));
  const receipt=page=>page.locator('#spSaveResult').textContent();

  test('native stream close waits for upload and verified readback; bytes and chosen folder survive',{timeout:45000},async()=>{
    await scenario('verified-copy',{holdUpload:true,holdReadback:true},async({page,graph,downloads})=>{
      await startExport(page);
      await connect(page);
      await page.locator('#spSaveFolders button').filter({hasText:'Protokoll'}).click();
      await page.locator('#spSaveName').fill('Reviewed copy.pdf');
      await page.locator('#spSaveSubmit').click();
      await bounded(graph.uploadReceived.promise,'the first upload chunk');
      assert.equal((await state(page)).state,'awaiting-destination','The exporter must still be awaiting stream.close.');
      assert.doesNotMatch(await receipt(page),/^Sparad i SharePoint/i);
      assert.equal(graph.parent,'child-folder');
      assert.equal(graph.name,'Reviewed copy.pdf');
      assert.deepEqual(graph.bytes,fixture);
      graph.uploadRelease.release();
      await bounded(graph.readbackReceived.promise,'the metadata readback');
      assert.equal((await state(page)).state,'awaiting-destination','A successful PUT alone is not a verified saved result.');
      assert.doesNotMatch(await receipt(page),/^Sparad i SharePoint/i);
      graph.readbackRelease.release();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
      assert.deepEqual(Buffer.from((await state(page)).returnedBytes),fixture);
      assert.match(await receipt(page),/Reviewed copy\.pdf/);
      assert.equal(downloads.length,0);
      assert.equal(await page.evaluate(()=>window.__saveBrowser.nativePickerCalls.length),0);
      const calls=await page.evaluate(()=>window.__saveBrowser.msal.calls);
      assert.ok(calls.some(call=>call.method==='acquireTokenPopup'&&call.scopes.includes('https://graph.microsoft.com/Files.ReadWrite.All')),'Write permission is acquired explicitly for saving.');
      assert.equal(graph.sessionCount,1);
      assert.equal(graph.writes.filter(request=>request.method==='PUT').length,1);
      await page.screenshot({path:artifactDir+'/verified-copy.png',fullPage:true});
    });
  });

  test('detached download anchor still exports exact bytes after its Blob URL is revoked',{timeout:30000},async()=>{
    await scenario('anchor-revoked-url',{},async({page,graph,downloads})=>{
      await startExport(page,'anchor','Anchor copy.pdf');
      await connect(page);
      await page.locator('#spSaveName').fill('Anchor copy.pdf');
      await page.locator('#spSaveSubmit').click();
      await waitFor(page,()=>document.querySelector('#spSaveResult')?.textContent.includes('Anchor copy.pdf'));
      assert.deepEqual(graph.bytes,fixture);
      assert.equal(graph.sessionCount,1);
      assert.equal(downloads.length,0,'The download transport must not run as well as the SharePoint upload.');
    });
  });

  test('explicit local choices resume the original download, native stream and file share',{timeout:45000},async()=>{
    await scenario('local-transports',{},async({page,graph,downloads})=>{
      await startExport(page,'anchor','Local download.pdf');
      const downloaded=page.waitForEvent('download');
      await page.locator('#spSaveLocal').click();
      const download=await downloaded;
      assert.equal(download.suggestedFilename(),'Local download.pdf');
      assert.deepEqual(await readFile(await download.path()),fixture);

      await startExport(page,'picker','Local native.pdf');
      await page.locator('#spSaveLocal').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
      assert.deepEqual(Buffer.from((await state(page)).returnedBytes),fixture);
      const local=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory(),handle=await root.getFileHandle('Local native.pdf');
        return Array.from(new Uint8Array(await (await handle.getFile()).arrayBuffer()));
      });
      assert.deepEqual(Buffer.from(local),fixture);

      await startExport(page,'share','Local share.pdf');
      await page.locator('#spSaveLocal').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
      const shares=await page.evaluate(()=>window.__saveBrowser.nativeShares);
      assert.equal(shares.length,1);assert.equal(shares[0].files[0].name,'Local share.pdf');
      assert.deepEqual(Buffer.from(shares[0].files[0].bytes),fixture);
      assert.equal(graph.writes.length,0);
      assert.equal(downloads.length,1);
    });
  });

  test('existing save-object control creates a copy instead of writing its prior native handle',{timeout:30000},async()=>{
    await scenario('existing-object-copy',{},async({page,graph})=>{
      assert.match(await page.locator('#smartExportSaveObject').textContent(),/kopia/i);
      await page.locator('#smartExportSaveObject').click();
      await page.locator('#spSavePicker').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>window.__saveBrowser.directWrites),0);
      await page.locator('#spSaveLocal').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
      assert.equal(await page.evaluate(()=>window.__saveBrowser.nativePickerCalls.length),1);
      assert.equal(graph.writes.length,0);
    });
  });

  test('unauthorized admin, wrong tenant and changed consent account cannot create an upload',{timeout:45000},async()=>{
    for(const [name,setup,expected] of [
      ['non-admin',()=>{window.__saveBrowser.access.role='member';},/administratör|behörig/i],
      ['wrong-tenant',()=>{window.__saveBrowser.msal.wrongTenant=true;},/testorganisation|Tillsyno/i],
      ['changed-write-account',()=>{window.__saveBrowser.msal.changedWriteAccount=true;},/konto|inloggning/i],
    ]){
      await scenario(name,{setup},async({page,graph})=>{
        await startExport(page);
        // A rejected Tillsyno administrator gate intentionally leaves Microsoft
        // disconnected; its disabled Connect control must not be bypassed.
        if(name!=='non-admin')await page.locator('#spSaveConnect').click();
        if(name==='changed-write-account'){
          await waitFor(page,()=>!document.querySelector('#spSaveSubmit').disabled);
          await page.locator('#spSaveSubmit').click();
        }
        await waitFor(page,()=>!!document.querySelector('#spSaveStatus')?.textContent&&!document.querySelector('#spSaveLocal')?.disabled);
        assert.match(await page.locator('#spSaveStatus').textContent(),expected);
        assert.equal(graph.writes.length,0);
        assert.notEqual((await state(page)).state,'saved');
      });
    }
  });

  test('409 conflict and failed upload show a recoverable error, never a saved receipt',{timeout:45000},async()=>{
    for(const [name,options,expected] of [
      ['name-conflict',{conflict:true},/finns|konflikt|409|annat namn/i],
      ['network-failure',{failUpload:true},/nät|misslyck|fetch|spar|kontakt/i],
      ['bad-readback',{badReadback:true},/bekräft|stämmer|storlek|kontroll|verifier/i],
    ]){
      await scenario(name,options,async({page,graph,downloads})=>{
        await startExport(page);
        await connect(page);
        await page.locator('#spSaveSubmit').click();
        await waitFor(page,()=>document.querySelector('#spSaveSubmit')&&!document.querySelector('#spSaveSubmit').disabled);
        assert.match(await page.locator('#spSaveStatus').textContent(),expected);
        assert.equal(await page.locator('#spSavePicker').isVisible(),true);
        assert.notEqual((await state(page)).state,'saved');
        assert.doesNotMatch(await receipt(page),/^Sparad i SharePoint/i);
        assert.equal(downloads.length,0,'An upload failure must not silently trigger a local download.');
        assert.equal(graph.sessionCount,1);
        await page.locator('#spSaveLocal').click();
        await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
        assert.deepEqual(Buffer.from((await state(page)).returnedBytes),fixture);
        assert.equal(graph.sessionCount,1,'Local fallback must not retry the failed SharePoint write.');
      });
    }
  });

  test('cancelled and oversized exports produce no SharePoint writes',{timeout:30000},async()=>{
    await scenario('cancel-save',{},async({page,graph})=>{
      await startExport(page);
      await page.locator('#spSaveCancel').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='cancelled');
      assert.equal(graph.writes.length,0);
      assert.equal(await page.evaluate(()=>window.__saveBrowser.nativePickerCalls.length),0);
    });
    await scenario('oversized-save',{},async({page,graph})=>{
      await startExport(page,'picker','Oversized.pdf',{size:25*1024*1024+1});
      await connect(page);
      await waitFor(page,()=>/25|stor/i.test(document.querySelector('#spSaveStatus')?.textContent||''));
      assert.equal(await page.locator('#spSaveSubmit').isEnabled(),false);
      assert.equal(graph.writes.length,0);
      assert.notEqual((await state(page)).state,'saved');
      await page.locator('#spSaveCancel').click();
    });
  });

  test('Stoppa aborts an active upload, keeps the bytes available and requires explicit local fallback',{timeout:30000},async()=>{
    await scenario('stop-active-upload',{holdUpload:true},async({page,graph,downloads})=>{
      await startExport(page,'picker','Stopped transfer.pdf');
      await connect(page);
      await page.locator('#spSaveSubmit').click();
      await bounded(graph.uploadReceived.promise,'the held upload before stopping');
      assert.match(await page.locator('#spSaveCancel').textContent(),/Stoppa/i);
      await page.locator('#spSaveCancel').click();
      await waitFor(page,()=>!document.querySelector('#spSaveLocal').disabled&&/stopp|avbr/i.test(document.querySelector('#spSaveStatus')?.textContent||''));
      assert.equal(await page.locator('#spSavePicker').isVisible(),true,'Stopping the transfer keeps the file available for an explicit recovery choice.');
      assert.equal((await state(page)).state,'awaiting-destination');
      assert.doesNotMatch(await receipt(page),/^Sparad i SharePoint/i);
      assert.equal(downloads.length,0);
      assert.equal(await page.evaluate(()=>window.__saveBrowser.nativePickerCalls.length),0);
      await page.locator('#spSaveLocal').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
      assert.deepEqual(Buffer.from((await state(page)).returnedBytes),fixture);
      assert.equal(graph.sessionCount,1);
      assert.equal(graph.chunks.length,1,'No implicit retry may follow an aborted transfer.');
      assert.doesNotMatch(await receipt(page),/^Sparad i SharePoint/i);
    });
  });

  test('save destination controls fit a phone and remain reachable',{timeout:30000},async()=>{
    await scenario('phone-save',{viewport:{width:390,height:844}},async({page})=>{
      await startExport(page);
      await connect(page);
      const dimensions=await page.locator('#spSavePicker').evaluate(dialog=>({left:dialog.getBoundingClientRect().left,right:dialog.getBoundingClientRect().right,viewport:innerWidth,overflow:dialog.scrollWidth-dialog.clientWidth}));
      assert.ok(dimensions.left>=0&&dimensions.right<=dimensions.viewport+1,JSON.stringify(dimensions));
      assert.ok(dimensions.overflow<=1,JSON.stringify(dimensions));
      await page.locator('#spSaveName').fill('Phone copy.pdf');
      await page.screenshot({path:artifactDir+'/phone-save.png',fullPage:true});
      await page.locator('#spSaveSubmit').click();
      await waitFor(page,()=>window.__saveBrowser.exports.at(-1)?.state==='saved');
    });
  });

  test('real Avläsning TEST 9.74 exports edited project state through the nested save dialog',{timeout:60000},async()=>{
    const input=await projectFixture(),realServer=await createHarnessServer(input.bytes,{realPage:true});
    try{
      await scenario('real-avlasning-export',{server:realServer,holdReadback:true},async({page,graph,downloads})=>{
        await waitFor(page,()=>!!window.SmartMatchAppBridge&&!document.documentElement.hasAttribute('data-auth-pending'));
        await page.locator('#smReadCodeGate input').fill('1234');
        await page.locator('#smReadCodeGate button').click();
        await waitFor(page,()=>!document.documentElement.hasAttribute('data-read-locked'));
        await page.locator('#pwFile').setInputFiles({name:'Synthetic completed project.pdf',mimeType:'application/pdf',buffer:input.bytes});
        await waitFor(page,()=>window.SmartMatchAppBridge.getPositions().length===1&&document.querySelector('#pwScanOverlay')?.hidden!==false);
        await page.evaluate(()=>window.SmartMatchAppBridge.openPosition(window.SmartMatchAppBridge.getPositions()[0]));
        await page.locator('#pwChecklist .pwCheckRow input[type="checkbox"]').first().check();
        await page.locator('#pwProtocolClose').click();
        await page.locator('#smartPdfInspect').click();
        await waitFor(page,()=>!document.querySelector('#smartExportBuild')?.disabled);
        await page.locator('#smartExportBuild').click();
        await page.locator('#spSavePicker').waitFor({state:'visible'});
        assert.equal(await page.locator('#smartExportDialog').evaluate(dialog=>dialog.open),true,'The existing workspace may hide the underlying export panel, but its save lifecycle must remain open.');
        await connect(page);
        await page.locator('#spSaveName').fill('Verified project copy.pdf');
        await page.locator('#spSaveSubmit').click();
        await bounded(graph.readbackReceived.promise,'real Avläsning export metadata');
        assert.doesNotMatch(await page.locator('#smartExportStatus').textContent(),/PDF sparad och kontrollerad/i);
        assert.equal(await page.evaluate(()=>window.SmartMatchAppBridge.hasUnsavedChanges()),true,'Unconfirmed cloud bytes must not clear the actual project dirty state.');
        const exported=await projectData(graph.bytes);
        assert.equal(exported.instances[input.positionId].checks[input.itemKey],true,'The checked work row must exist in the uploaded PDF itself.');
        assert.equal(exported.readTestData.matching.hits[0].positionId,input.positionId);
        graph.readbackRelease.release();
        await waitFor(page,()=>/^Sparad i SharePoint/.test(document.querySelector('#spSaveResult')?.textContent||''));
        await waitFor(page,()=>/PDF sparad och kontrollerad/.test(document.querySelector('#smartExportStatus')?.textContent||''));
        assert.match(await page.locator('#smartExportStatus').textContent(),/Verified project copy\.pdf/);
        assert.equal(await page.evaluate(()=>window.SmartMatchAppBridge.hasUnsavedChanges()),false);
        assert.equal(downloads.length,0);
        assert.equal(graph.sessionCount,1);
        await page.screenshot({path:artifactDir+'/real-avlasning-export.png',fullPage:true});
      });
    }finally{await realServer.close();}
  });
});
