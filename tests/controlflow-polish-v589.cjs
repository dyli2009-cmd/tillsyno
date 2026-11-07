// v2.4.589: Tidigare service / anmärkningar is readable in every theme, in Dörrautomatik / Lås and Säkerhetsservice,
// and a point without a note is not repeated. Dörrautomatik / Lås: Öppna / Stäng ritning look like Mall, the eye and
// page buttons like Ångra, and Signatur och logga is compact. Phone size, all seven themes. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const THEMES=['ice','mist','coast','sand','night','graphite','pine'];
// WCAG contrast ratio between two computed colours.
const contrast=(a,b)=>{const lum=c=>{const v=(c.match(/\d+(\.\d+)?/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([1190,842]);pg.drawRectangle({x:60,y:60,width:1070,height:720,borderColor:rgb(0,0,0),borderWidth:1});
 const b64=Buffer.from(await doc.save()).toString('base64'),base='http://127.0.0.1:'+server.address().port;
 for(const [label,url,type,group] of [['Dörrautomatik','/controlflow-revision/all-in-one.html','automation',0],['Säkerhetsservice','/all-in-one.html','alarm',1]]){
  for(const theme of THEMES){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
   await page.addInitScript(t=>{try{localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:t,device:'auto'}))}catch(_){}},theme);
   await page.goto(base+url);await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').nth(group).click();
   await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();
   await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Test.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},b64);
   await page.evaluate(t=>{const o=normalize({uid:'a',type:t,page:1,x:.3,y:.4});o.previousIssues=[{n:'1.4',title:'Kontroll fastsättning',note:'Lös skruv'},{n:'1.8',title:'Funktionskontroll av nödöppning',note:''}];o.previousNotes='Byt batteri';o.previousStatus='Åtgärd krävs';o.previousServiceDate='2025-11-07';items.push(o);save();drawMarkers();selected='a';go('protocol');showSelected();},type);
   await page.evaluate(()=>{const p=document.getElementById('secPreviousPanel');p.open=true;p.scrollIntoView();});await page.waitForTimeout(100);
   const prev=await page.evaluate(()=>{const panel=document.getElementById('secPreviousPanel'),bgOf=n=>{for(let at=n;at;at=at.parentElement){const c=getComputedStyle(at).backgroundColor;if(!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c}return 'rgb(255,255,255)'};
    const rows=[...document.querySelectorAll('#secPreviousIssues .previousIssue')];
    const pairs=[panel.querySelector('summary'),panel.querySelector(':scope>p'),...rows.flatMap(r=>[...r.querySelectorAll('strong,span')])].map(n=>({text:n.textContent,fg:getComputedStyle(n).color,bg:bgOf(n)}));
    return {pairs,row18:rows.find(r=>r.textContent.startsWith('1.8'))?.querySelectorAll('span').length}});
   for(const p of prev.pairs)assert.ok(contrast(p.fg,p.bg)>=4.5,label+' '+theme+': readable "'+p.text.slice(0,30)+'" '+p.fg+' on '+p.bg+' = '+contrast(p.fg,p.bg).toFixed(2));
   assert.equal(prev.row18,0,label+' '+theme+': a point without a note is not repeated');
   if(label==='Dörrautomatik'){
    await page.evaluate(()=>go('drawing'));await page.waitForTimeout(150);
    const c=await page.evaluate(()=>{const s=id=>getComputedStyle(document.getElementById(id));const undo=getComputedStyle(document.querySelector('.sessionHistoryBar .historyIconButton'));
     return {mall:s('securityPreview').color,open:s('secChangeDrawing').color,close:s('revCloseDrawing').color,undo:undo.color,eye:s('secToggleOverlays').color,prev:s('secPrev').color,mallBg:s('securityPreview').backgroundColor,openBg:s('secChangeDrawing').backgroundColor}});
    assert.equal(c.open,c.mall,theme+': Öppna ritning like Mall');assert.equal(c.close,c.mall,theme+': Stäng ritning like Mall');assert.equal(c.openBg,c.mallBg,theme+': same background as Mall');
    assert.equal(c.eye,c.undo,theme+': eye like Ångra');assert.equal(c.prev,c.undo,theme+': page buttons like Ångra');
    await page.locator('#secNavProject').click();await page.locator('#securityProject').waitFor({state:'visible'});
    const sig=await page.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();const a=r('revisionSignDraw'),b=r('revisionSignText'),logo=document.querySelector('label[for="secLogoFile"]').getBoundingClientRect();return {a:a.toJSON(),b:b.toJSON(),logoH:logo.height,font:parseFloat(getComputedStyle(document.getElementById('revisionSignDraw')).fontSize)}});
    assert.ok(sig.a.height<=40&&sig.b.height<=40&&sig.logoH<=40,theme+': compact signature and logo buttons');
    assert.equal(Math.round(sig.a.top),Math.round(sig.b.top),theme+': Signera för hand and Använd text side by side');
    assert.ok(sig.font<=14,theme+': smaller button text');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }
 console.log('PASS controlflow polish v589: previous service panel readable in all seven themes in Dörrautomatik and Säkerhetsservice, no repeated titles, header and tool buttons styled like Mall / Ångra, compact Signatur och logga.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
