/* A reversible display crop. The PDF and the OCR selection are unchanged. */
(function(){
 'use strict';
 async function open({pdf,page,region,save}){
  const dialog=document.createElement('dialog');dialog.className='rtCardViewDialog';
  dialog.innerHTML='<h2>Välj visningsområde</h2><p>Välj en gång för alla dörrkort i projektet. Valet följer med när filen sparas.</p><div class="rtCardViewViewport"><div class="rtCardViewBox"><canvas></canvas><div class="rtCardViewRect" hidden></div></div></div><div class="rtCardViewNumbers"></div><p class="rtCardViewStatus" role="status">Laddar originalet…</p><footer><button type="button" data-cancel>Avbryt</button><button type="button" data-reset>Visa hela originalet</button><button type="button" data-save disabled>Spara för projektet</button></footer>';
  document.body.append(dialog);dialog.showModal();
  const canvas=dialog.querySelector('canvas'),box=dialog.querySelector('.rtCardViewBox'),overlay=dialog.querySelector('.rtCardViewRect'),status=dialog.querySelector('[role=status]'),submit=dialog.querySelector('[data-save]');
  let rect=region?{...region}:null,start=null,task=null,ready=false,closed=false,saving=false;
  const inputs={};
  function paint(){overlay.hidden=!rect;if(rect)Object.assign(overlay.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});for(const key of Object.keys(inputs))inputs[key].value=rect?String(Math.round(rect[key]*1000)/10):'';submit.disabled=!ready||!rect||rect.w<.005||rect.h<.005||saving;}
  for(const [key,label]of [['x','Vänster %'],['y','Överkant %'],['w','Bredd %'],['h','Höjd %']]){
   const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='.1';input.setAttribute('aria-label',label);inputs[key]=input;wrap.append(input);dialog.querySelector('.rtCardViewNumbers').append(wrap);
   input.onchange=()=>{rect={...(rect||{x:0,y:0,w:1,h:1}),[key]:Math.max(0,Math.min(1,Number(input.value)/100))};rect.w=Math.min(rect.w,1-rect.x);rect.h=Math.min(rect.h,1-rect.y);paint();};
  }
  const point=e=>{const b=box.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};};
  box.onpointerdown=e=>{if(!ready||saving||e.button!==0)return;e.preventDefault();start={...point(e),id:e.pointerId,previous:rect};box.setPointerCapture(e.pointerId);};
  box.onpointermove=e=>{if(!start||start.id!==e.pointerId)return;const p=point(e);rect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(start.x-p.x),h:Math.abs(start.y-p.y)};paint();};
  box.onpointerup=e=>{if(start?.id===e.pointerId){if(!rect||rect.w<.005||rect.h<.005)rect=start.previous;start=null;paint();}};
  box.onpointercancel=()=>{if(start)rect=start.previous;start=null;paint();};
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{closed=true;task?.cancel();Promise.resolve(task?.promise).catch(()=>{}).finally(()=>{canvas.width=canvas.height=0;dialog.remove();});},{once:true});
  async function commit(value){if(saving)return;saving=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await save(value);dialog.close();}catch(error){status.textContent=error.message;saving=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);paint();}}
  submit.onclick=()=>commit(rect);dialog.querySelector('[data-reset]').onclick=()=>commit(null);
  try{
   const pg=await pdf.getPage(page);if(closed)return;const base=pg.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(2400000/(base.width*base.height)),2800/Math.max(base.width,base.height)),vp=pg.getViewport({scale});
   canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);box.style.aspectRatio=vp.width+' / '+vp.height;box.style.width=Math.min(dialog.clientWidth-48,(window.innerHeight*.58)*vp.width/vp.height)+'px';
   task=pg.render({canvasContext:canvas.getContext('2d'),viewport:vp});await task.promise;if(closed)return;
   ready=true;status.textContent='Markera området eller justera måtten nedan.';paint();
  }catch(error){if(!closed)status.textContent='Originalet kunde inte visas: '+error.message;}
 }
 window.SmartMatchCardView={open};
})();
