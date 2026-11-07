/* Tillsyno v2.4.591 – skarp zoom i Kontrollflödets ritningsvy (delas av båda motorerna).
   Ritningen visas som förut med en bild av hela sidan. När den bilden inte räcker till för skarp
   visning (inzoomat) ritas bara den del som syns på skärmen, med lite marginal, i full skärpa,
   när användaren har slutat zooma eller flytta. Samma princip som Acrobat och pdf.js (detaljvy).
   - En detaljritning åt gången. Den avbryts bara vid byte av sida, rotation eller fil.
   - Detaljbilden har en fast övre gräns i pixlar (lägre på telefon) och ligger mellan ritningen och stämplarna.
   - Sparläge: pdf.js-minnet behålls en kort stund efter en detaljritning, så att nästa flyttning går fort,
     och frigörs sedan. En detalj kostar ungefär lika mycket minne som att öppna sidan, så en sida som tog mer än
     heavyMaxMs att rita första gången får inga detaljer, och efter en lika långsam detaljritning ritas inga fler. Inget av detta påverkar stämplar, export, Kundmall eller sparade filer. */
(function(){
 'use strict';
 const PHONE=(()=>{try{return matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<=600}catch(_){return false}})();
 const SETTINGS={
  budget:PHONE?2600000:6000000,// största detaljbild i pixlar
  margin:.25,// marginal runt det synliga området, andel av dess bredd och höjd
  delay:220,heavyDelay:450,// väntetid efter sista zoom eller flyttning (ms)
  keep:PHONE?5000:9000,// sparläge: så länge pdf.js-minnet behålls efter en detaljritning (ms)
  minGain:1.15,// detaljen ritas bara om den blir minst så här mycket skarpare än sidans bild
  heavyMaxMs:PHONE?4000:8000// sparläge: längsta ritning av sidan (första gången) eller av en detalj som tillåter detaljer
 };
 function freeCanvas(c){if(!c)return;c.width=c.height=0;c.remove()}
 function create(o){
  const viewer=o.viewer,stage=o.stage,base=o.base;
  let shown=null,running=null,pending=false,timer=0,keepTimer=0,failedDocument=null,slowDocument=null;
  const stats={renders:0,shown:0,cancelled:0,failed:0,released:0,stoppedSlow:0,lastMs:0,lastPixels:0};
  const target=i=>({document:i.document,pageNumber:i.pageNumber,rotation:i.rotation??null});
  const sameTarget=(a,b)=>!!a&&!!b&&a.document===b.document&&a.pageNumber===b.pageNumber&&(a.rotation??null)===(b.rotation??null);
  function hide(){if(shown){freeCanvas(shown.canvas);shown=null}}
  function release(documentPdf){
   if(!documentPdf||!o.release)return;
   Promise.resolve().then(()=>o.release(documentPdf)).then(()=>{stats.released++},()=>{
    // pdf.js frigör inte en sida som ritas just nu: försök igen när den är klar.
    clearTimeout(keepTimer);keepTimer=setTimeout(()=>{if(!running)release(documentPdf)},1500);
   });
  }
  // Det synliga området i sidans koordinater (CSS-pixlar vid aktuell zoom).
  function visibleArea(i){
   if(!viewer.clientWidth||!viewer.clientHeight)return null;
   const vr=viewer.getBoundingClientRect(),sr=stage.getBoundingClientRect(),left=vr.left+viewer.clientLeft,top=vr.top+viewer.clientTop;
   const x0=Math.max(0,left-sr.left),y0=Math.max(0,top-sr.top),x1=Math.min(i.width,left+viewer.clientWidth-sr.left),y1=Math.min(i.height,top+viewer.clientHeight-sr.top);
   if(x1-x0<8||y1-y0<8)return null;
   return {x:x0,y:y0,w:x1-x0,h:y1-y0};
  }
  // Vilken del som ska ritas och med hur många pixlar per CSS-pixel, inom pixelgränsen.
  function plan(i){
   const area=visibleArea(i);if(!area)return null;
   const dpr=Math.min(window.devicePixelRatio||1,2);if(i.baseRatio>=dpr/SETTINGS.minGain)return {none:true};
   if(i.heavy&&(i.baseMs||0)>SETTINGS.heavyMaxMs)return {none:true};// too heavy for details on this device
   const grow=m=>{const x=Math.max(0,area.x-area.w*m),y=Math.max(0,area.y-area.h*m);return {x,y,w:Math.min(i.width,area.x+area.w*(1+m))-x,h:Math.min(i.height,area.y+area.h*(1+m))-y}};
   let rect=grow(SETTINGS.margin);if(rect.w*rect.h*dpr*dpr>SETTINGS.budget)rect=grow(0);
   const ratio=Math.min(dpr,Math.sqrt(SETTINGS.budget/(rect.w*rect.h)));
   if(ratio<i.baseRatio*SETTINGS.minGain)return {none:true};
   return {area,rect,ratio};
  }
  function covers(i,p){
   if(!shown||!sameTarget(shown,i)||Math.abs(shown.scale-i.scale)>i.scale*.01||Math.abs(shown.ratio-p.ratio)>p.ratio*.05)return false;
   const n={x:p.area.x/i.width,y:p.area.y/i.height,w:p.area.w/i.width,h:p.area.h/i.height},s=shown.n,e=.002;
   return n.x>=s.x-e&&n.y>=s.y-e&&n.x+n.w<=s.x+s.w+e&&n.y+n.h<=s.y+s.h+e;
  }
  async function draw(i,p){
   const t=target(i),documentPdf=i.document,canvas=document.createElement('canvas'),w=Math.max(1,Math.ceil(p.rect.w*p.ratio)),h=Math.max(1,Math.ceil(p.rect.h*p.ratio));
   let finish;const job={...t,task:null,cancelled:false,done:new Promise(r=>{finish=r})};running=job;clearTimeout(keepTimer);
   try{
    const page=await documentPdf.getPage(i.pageNumber);if(job.cancelled)return;
    canvas.width=w;canvas.height=h;
    const scale=i.scale*p.ratio,viewport=t.rotation===null?page.getViewport({scale}):page.getViewport({scale,rotation:t.rotation});
    const started=performance.now();stats.renders++;
    job.task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[1,0,0,1,-p.rect.x*p.ratio,-p.rect.y*p.ratio]});
    await job.task.promise;stats.lastMs=Math.round(performance.now()-started);stats.lastPixels=w*h;
    if(i.heavy&&stats.lastMs>SETTINGS.heavyMaxMs&&slowDocument!==documentPdf){slowDocument=documentPdf;stats.stoppedSlow++}// shown, but no more details
    // A page, file or rotation change cancels the job (reset); during a gesture info() is empty but the detail still fits.
    const now=o.info();
    if(job.cancelled||(now&&!sameTarget(now,t)))return;
    Object.assign(canvas.style,{position:'absolute',left:(p.rect.x/i.width*100)+'%',top:(p.rect.y/i.height*100)+'%',width:(p.rect.w/i.width*100)+'%',height:(p.rect.h/i.height*100)+'%',pointerEvents:'none',display:'block'});
    canvas.className='cfSharpDetail';canvas.setAttribute('aria-hidden','true');
    base.after(canvas);const old=shown;shown={...t,canvas,scale:i.scale,ratio:p.ratio,n:{x:p.rect.x/i.width,y:p.rect.y/i.height,w:p.rect.w/i.width,h:p.rect.h/i.height}};stats.shown++;
    if(old)freeCanvas(old.canvas);
   }catch(error){
    if(error?.name==='RenderingCancelledException'||job.cancelled){stats.cancelled++;return}
    // Kan detaljen inte ritas visas sidans vanliga bild, och inga fler detaljer ritas för filen.
    stats.failed++;failedDocument=documentPdf;hide();console.warn('Skarp zoom:',error);
   }finally{
    if(running===job)running=null;finish();
    if(!shown||shown.canvas!==canvas)canvas.width=canvas.height=0;// en bild som inte visas frigörs direkt
    if(i.heavy&&!job.cancelled){clearTimeout(keepTimer);keepTimer=setTimeout(()=>{if(!running)release(documentPdf)},failedDocument===documentPdf?0:SETTINGS.keep)}
    if(pending){pending=false;schedule()}
   }
  }
  function run(){
   timer=0;const i=o.info();if(!i)return;
   if(i.document===failedDocument){hide();return}
   if(running){if(sameTarget(running,i)){pending=true;return}cancel()}
   const p=plan(i);if(!p)return;
   if(p.none){hide();return}
   if(i.document===slowDocument||covers(i,p))return;
   draw(i,p);
  }
  function cancel(){if(!running)return;running.cancelled=true;try{running.task?.cancel()}catch(_){}running=null}
  // Waits until no detail is being drawn, e.g. before Kundmall frees the drawing's memory in sparläge.
  async function idle(){clearTimeout(timer);timer=0;pending=false;while(running)await running.done}
  function check(){const i=o.info();if(shown&&i&&!sameTarget(shown,i))hide();if(running&&i&&!sameTarget(running,i))cancel();return i}
  function schedule(){clearTimeout(timer);const i=check();timer=setTimeout(run,i?.heavy?SETTINGS.heavyDelay:SETTINGS.delay)}
  // Sida, fil eller rotation byts, eller ritningen stängs: detaljen tas bort direkt.
  function reset(){clearTimeout(timer);timer=0;clearTimeout(keepTimer);keepTimer=0;pending=false;cancel();hide();failedDocument=null;slowDocument=null}
  viewer.addEventListener('scroll',schedule,{passive:true});
  viewer.addEventListener('touchend',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  if(window.ResizeObserver)new ResizeObserver(schedule).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&shown?.document&&o.info()?.heavy&&!running){clearTimeout(keepTimer);release(shown.document)}});
  return {update:schedule,reset,hide,idle,stats,settings:SETTINGS,state:()=>shown?{pageNumber:shown.pageNumber,rotation:shown.rotation,scale:shown.scale,ratio:shown.ratio,area:{...shown.n},width:shown.canvas.width,height:shown.canvas.height}:null,busy:()=>!!running||!!timer||pending};
 }
 window.ControlflowSharpZoom={create,settings:SETTINGS};
})();
