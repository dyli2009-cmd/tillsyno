/* Real dock script/styles, synthetic controls and project state; no customer PDF. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.env.DOCK_TEST_ROOT?path.resolve(process.env.DOCK_TEST_ROOT):path.resolve(__dirname,'..');
const script=process.env.DOCK_SCRIPT?path.resolve(process.env.DOCK_SCRIPT):path.join(root,'smartmatch-workspace-dock.js');
const css=process.env.DOCK_CSS?path.resolve(process.env.DOCK_CSS):path.join(root,'smartmatch-workspace-dock.css');
assert(fs.statSync(script).isFile());
assert(fs.statSync(css).isFile());
const fixture=`<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;display:flex;flex-direction:column;height:100dvh;font:14px system-ui;background:var(--ta-page,#edf4f7);color:var(--ta-ink,#173746)}.pwMain{flex:1;min-height:0}.pwToolbar{display:flex}.pwHeader{padding:10px}.pwToolHistory{display:flex}button{font:inherit}#pwReadContinueProducts{display:inline-flex!important}dialog{max-width:calc(100vw - 24px)}</style></head>
<body class="smCompactWorkspace"><header class="pwHeader">Syntetiskt arbetsprojekt</header>
<div class="pwToolbar"><div class="pwToolbarWork">
 <button id="pwBulkSelect">Välj</button><span class="pwToolWrap"><button id="pwToolMenuButton">Verktyg</button><div id="pwToolMenu" hidden></div></span><button id="pwTimeReport">Tid</button>
 <button id="rtOpenSettings" hidden>Förberedelse</button><button id="rtMenuProducts" hidden><span>Produkter</span><small class="smToolHelp">Läs om sparade produkter</small></button><button id="pwProjectMaterialButton" hidden>Material</button>
 <button id="exOpenExtra"><span>Koppla</span></button><button id="labDiagnoseOpen">Rapporter</button><button id="pwToolLegend">Tecken</button><button id="rtEditPreparation">Förberedelse</button><button id="pwToolDelete">Ta bort<small>vald</small></button>
 <span class="pwToolHistory"><button>Ångra</button></span><button id="pwFit">Passa</button>
</div></div><main class="pwMain" aria-label="Syntetisk ritningsyta"></main>
<nav class="pwBottomNav"><span class="pwBottomPages">1 / 2</span><span class="pwBottomZoom">100 %</span></nav>
<dialog id="fixtureProducts"><h1>Produktavläsning</h1><button id="fixtureClose">Stäng</button></dialog>
</body></html>`;

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,390,768,1280])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,serviceWorkers:'block'});
   const page=await context.newPage();
   try{
    await page.setContent(fixture);
    await page.evaluate(theme=>{
     if(theme==='dark')for(const [key,value] of Object.entries({'--ta-page':'#0d1c25','--ta-card':'#18303d','--ta-panel':'#142630','--ta-border':'#49616f','--ta-ink':'#edf5f8','--ta-soft':'#264655'}))document.documentElement.style.setProperty(key,value);
     window.savedProject={cards:{GS101:{page:2,productsPending:true}},links:[{id:'synthetic-link',card:'GS101'}],checks:{saved:true},minutes:7};
     window.projectBefore=JSON.stringify(window.savedProject);window.productClicks={pending:0,reread:0};
     window.originalControls={reread:document.getElementById('rtMenuProducts'),settings:document.getElementById('rtOpenSettings'),material:document.getElementById('pwProjectMaterialButton')};
     window.originalControls.reread.onclick=()=>{window.productClicks.reread++;document.getElementById('fixtureProducts').showModal();};
     document.getElementById('fixtureClose').onclick=()=>{document.getElementById('fixtureProducts').close();const pending=document.getElementById('pwReadContinueProducts');if(pending)pending.disabled=false;};
    },theme);
    await page.addStyleTag({path:css});
    await page.addScriptTag({path:script});
    await page.locator('#smMoreButton').click();
    assert.equal(await page.locator('#rtMenuProducts').isVisible(),false,'No cards: rereading stays hidden');
    assert.equal(await page.locator('#pwReadContinueProducts').count(),0,'Pending action is created later by the reader');

    // Match the real reader: its dynamic action starts beside the hidden settings anchor.
    await page.evaluate(()=>{
     const button=document.createElement('button');button.id='pwReadContinueProducts';button.type='button';button.className='rtSettingsButton smReadProductsAction';
     button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/></svg><span class="smToolbarLabel">Läs produkter</span>';
     button.onclick=()=>{if(button.disabled)return;button.disabled=true;window.productClicks.pending++;document.getElementById('fixtureProducts').showModal();};
     document.getElementById('rtOpenSettings').after(button);window.originalControls.pending=button;
     document.getElementById('rtMenuProducts').hidden=false;
     window.SmartMatchWorkspaceDock.syncReadActions();window.SmartMatchWorkspaceDock.syncReadActions();
    });
    await page.locator('#pwReadContinueProducts').waitFor({state:'visible'});
    const pending=await page.locator('#pwReadContinueProducts').boundingBox();
    assert(pending&&pending.width>0&&pending.height>=44,'Pending product action retains its touch target');
    assert(pending.x>=0&&pending.x+pending.width<=width+1,'Product action is reachable within the viewport');
    assert.equal(await page.locator('#pwReadContinueProducts').evaluate(button=>button.parentElement.id),'smMoreMenu');
    assert.equal(await page.locator('#rtMenuProducts').evaluate(button=>button.parentElement.id),'smMoreMenu');
    assert(await page.evaluate(()=>window.originalControls.pending===document.getElementById('pwReadContinueProducts')&&window.originalControls.reread===document.getElementById('rtMenuProducts')),'Moving actions preserves their original nodes');
    await page.locator('#pwReadContinueProducts').click();
    await page.locator('#fixtureProducts').waitFor({state:'visible'});
    assert.equal(await page.locator('#pwReadContinueProducts').isDisabled(),true,'The original callback can disable itself while the guide is open');
    assert.equal(await page.locator('#smMoreMenu').isVisible(),false,'Menu closes after its existing action is invoked');
    assert.equal(await page.locator('#smMoreButton').getAttribute('aria-expanded'),'false');
    assert.deepEqual(await page.evaluate(()=>window.productClicks),{pending:1,reread:0});

    await page.locator('#fixtureClose').click();
    await page.evaluate(()=>{document.getElementById('pwReadContinueProducts').hidden=true;window.SmartMatchWorkspaceDock.syncReadActions();});
    await page.locator('#smMoreButton').click();
    assert.equal(await page.locator('#pwReadContinueProducts').isVisible(),false,'Completed cards do not expose the pending action');
    await page.locator('#rtMenuProducts').waitFor({state:'visible'});
    await page.locator('#rtMenuProducts').click();
    await page.locator('#fixtureProducts').waitFor({state:'visible'});
    assert.deepEqual(await page.evaluate(()=>window.productClicks),{pending:1,reread:1},'Existing reread callback runs exactly once');
    assert.equal(await page.locator('#smMoreMenu').isVisible(),false);

    await page.locator('#fixtureClose').click();
    await page.evaluate(()=>{document.getElementById('pwReadContinueProducts').hidden=true;document.getElementById('rtMenuProducts').hidden=true;window.SmartMatchWorkspaceDock.syncReadActions();});
    await page.locator('#smMoreButton').click();
    assert.equal(await page.locator('#pwReadContinueProducts').isVisible(),false);
    assert.equal(await page.locator('#rtMenuProducts').isVisible(),false,'No PDF/cards: both product actions remain hidden');
    assert.equal(await page.locator('#rtOpenSettings').evaluate(button=>button.parentElement.id),'smReadOnlyActions');
    assert.equal(await page.locator('#pwProjectMaterialButton').evaluate(button=>button.parentElement.id),'smReadOnlyActions');
    assert.equal(await page.locator('.pwToolbarWork > *').count(),4,'The four primary dock tools are unchanged');
    assert(await page.evaluate(()=>JSON.stringify(window.savedProject)===window.projectBefore),'Dock operations never mutate the saved project');
    assert.equal(await page.locator('#pwReadContinueProducts').count(),1,'Repeated synchronization does not clone controls');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#smMoreMenu').isVisible(),false);
    console.log('PASS product actions:',width,theme);
   }finally{await context.close();}
  }
  console.log('PASS actual dock: dynamic pending/reread access, hidden states, original callbacks and saved data across four viewport sizes and two color schemes');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
