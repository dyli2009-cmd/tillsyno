// v2.4.591: stämplar utan överbelastning i Kontrollflödets ritningsvy (Dörrautomatik / Lås och Säkerhetsservice / Brand).
// - stilla visas bara stämplar i och runt det synliga området; den markerade stämpeln visas alltid;
// - under snabb zoom och flyttning är de riktiga stämplarna dolda och en stämpelbild visas; stämplarna ritas inte om;
// - när rörelsen stannar ritas de om en gång, på rätt plats, och nya stämplar visas där man har flyttat.
// Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
async function sheet(){const doc=await PDFDocument.create(),pg=doc.addPage([2384,3370]),parts=['0.5 w 0 0 0 RG'];for(let y=40;y<3370;y+=40)parts.push(`20 ${y} m 2364 ${y} l S`);pg.node.set(PDFName.of('Contents'),doc.context.register(doc.context.stream(parts.join('\n'))));return Buffer.from(await doc.save());}
const upload=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},{b64:bytes.toString('base64'),name});
const idle=page=>page.waitForFunction(()=>!document.body.classList.contains('cfStampsMoving'),null,{timeout:5000}).then(()=>page.waitForTimeout(80));
// Visible stamps (by their label button), and whether the label or the arrow tip is in the visible area with the margin.
const state=page=>page.evaluate(()=>{
 const vr=viewer.getBoundingClientRect(),sr=$('secStage').getBoundingClientRect(),m=ControlflowStampView.settings.margin,w=viewer.clientWidth,h=viewer.clientHeight;
 const a={x0:(vr.left-w*m-sr.left)/sr.width,x1:(vr.left+w*(1+m)-sr.left)/sr.width,y0:(vr.top-h*m-sr.top)/sr.height,y1:(vr.top+h*(1+m)-sr.top)/sr.height};
 const buttons=[...document.querySelectorAll('#secMarkers .secMarker[data-object-uid],#secMarkers .secMarker[data-security-stamp-uid]')],shown=buttons.filter(b=>!b.classList.contains('cfStampOff'));
 const pos=b=>({x:parseFloat(b.style.left)/100,y:parseFloat(b.style.top)/100}),inArea=p=>p.x>=a.x0&&p.x<=a.x1&&p.y>=a.y0&&p.y<=a.y1;
 const uid=b=>b.dataset.objectUid||b.dataset.securityStampUid,byUid=new Map(items.map(o=>[o.uid,o]));
 return {total:buttons.length,shown:shown.length,shownOutside:shown.filter(b=>{const o=byUid.get(uid(b));return !inArea(pos(b))&&!(o&&inArea({x:o.x,y:o.y}))&&uid(b)!==selected}).length,hiddenInside:buttons.filter(b=>{const o=byUid.get(uid(b));return b.classList.contains('cfStampOff')&&(inArea(pos(b))||(o&&inArea({x:o.x,y:o.y})))}).length,
  selectedShown:!selected||shown.some(b=>uid(b)===selected),moving:document.body.classList.contains('cfStampsMoving'),image:!!document.querySelector('.cfStampImage'),
  markersDisplay:getComputedStyle($('secMarkers')).display,shownUids:shown.map(uid),
  // Unturned drawing: the label button sits at the object's label position.
  misplaced:shown.filter(b=>{const o=byUid.get(uid(b)),p=pos(b);return o&&(Math.abs(p.x-o.labelX)>.002||Math.abs(p.y-o.labelY)>.002)}).length};
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const bytes=await sheet();
 for(const [label,url,group,type] of [['Dörrautomatik','/controlflow-revision/all-in-one.html',0,'automation'],['Säkerhetsservice','/all-in-one.html',1,'alarm']]){
  const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port+url);await page.locator('#allProtocolDialog[open]').waitFor();
  await page.locator('.allProtocolGroup summary').nth(group).click();await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();
  await upload(page,bytes,'A0.pdf');await page.waitForTimeout(600);
  // 100 stamps spread over the sheet.
  await page.evaluate(type=>{let s=3;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<100;i++)createItem(type,.06+r()*.86,.08+r()*.84);go('drawing');},type);
  // Counts stamp redraws and resizes that are really done (a resize during a gesture is skipped and returns false).
  await page.evaluate(()=>{const S=window.ControlflowStampStyle,draw=S.drawWorkspace,resize=S.resizeWorkspace;window.__workspaces=0;window.ControlflowStampStyle=Object.freeze({...S,drawWorkspace(o){window.__workspaces++;return draw.call(S,o)},resizeWorkspace(...a){const r=resize.apply(S,a);if(r!==false)window.__workspaces++;return r}});});

  // 1. Still at 6×: only stamps in and around the visible area are shown, all at their place; the selected one is shown.
  await page.evaluate(async()=>{await setZoom(6)});await page.waitForTimeout(400);await idle(page);
  let s=await state(page);
  assert.equal(s.total,100,label+': all stamps exist');assert(s.shown>0&&s.shown<50,label+': only visible stamps shown at 6×, got '+s.shown);
  assert.equal(s.shownOutside,0,label+': no shown stamp outside the visible area');assert.equal(s.hiddenInside,0,label+': no hidden stamp inside the visible area');
  assert.equal(s.selectedShown,true,label+': the selected stamp is shown');assert.equal(s.misplaced,0,label+': stamps at their place');
  const before=new Set(s.shownUids);

  // 2. Fast mouse-wheel zoom: real stamps hidden, a stamp picture is shown, and the stamps are not drawn again.
  const box=await page.locator('#secViewer').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.evaluate(()=>{window.__workspaces=0});
  for(let i=0;i<14;i++){await page.mouse.wheel(0,i%2?-120:-60);await page.waitForTimeout(30);}
  s=await state(page);
  assert.equal(s.moving,true,label+': gesture under way');assert.equal(s.markersDisplay,'none',label+': real stamps hidden during the gesture');assert.equal(s.image,true,label+': stamp picture during the gesture');
  const picture=await page.evaluate(()=>{const c=document.querySelector('.cfStampImage'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let coloured=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200&&Math.abs(d[i]-119)<12&&Math.abs(d[i+1]-133)<12&&Math.abs(d[i+2]-142)<12)coloured++;return {coloured,pixels:c.width*c.height,limit:ControlflowStampView.settings.budget,workspaces:window.__workspaces}});
  assert(picture.coloured>200,label+': the picture shows the stamps in their colour');assert(picture.pixels<=picture.limit*1.01,label+': picture within its pixel limit');
  assert.equal(picture.workspaces,0,label+': stamps not drawn again or resized during the gesture');
  await idle(page);s=await state(page);
  assert.equal(s.moving,false);assert.equal(s.image,false,label+': picture removed after the gesture');assert.notEqual(s.markersDisplay,'none');
  const after=await page.evaluate(()=>window.__workspaces);assert(after>=1&&after<=2,label+': stamps drawn or resized once after the gesture, got '+after);
  assert.equal(s.shownOutside,0);assert.equal(s.hiddenInside,0);assert.equal(s.misplaced,0,label+': stamps at their place after the gesture');

  // 3. Fast panning to another part: afterwards the stamps there are shown.
  await page.evaluate(async()=>{for(let i=0;i<12;i++){viewer.scrollLeft+=220;viewer.scrollTop+=260;await new Promise(r=>setTimeout(r,25))}});
  assert.equal((await state(page)).moving,true,label+': panning is a gesture');
  await idle(page);s=await state(page);
  assert(s.shownUids.some(uid=>!before.has(uid)),label+': new stamps shown where the drawing was moved');assert.equal(s.shownOutside,0);assert.equal(s.hiddenInside,0);assert.equal(s.misplaced,0);

  // 4. Zoomed out to the whole page: all stamps are shown again.
  await page.evaluate(async()=>{await setZoom(1)});await page.waitForTimeout(300);await idle(page);s=await state(page);
  assert.equal(s.shown,100,label+': all stamps shown at 100 %');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS stamp view: only visible stamps shown when still, a stamp picture during fast zoom and panning, no stamp redraw during the gesture, one redraw after, stamps at their place, in Dörrautomatik and Säkerhetsservice.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
