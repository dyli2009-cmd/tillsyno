/* A single project signature, shared by every protocol and embedded in work PDFs. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 let dialog,canvas,ctx,activePointer=null,points=[],hasInk=false;
 const hand=()=>project.signatureMode==='hand'&&/^data:image\/png;base64,/.test(project.signatureImage||'');
 function refresh(){
  const image=$('revisionSignaturePreview');if(!image)return;
  image.hidden=!hand();if(hand())image.src=project.signatureImage;else image.removeAttribute('src');
  $('revisionSignatureStatus').textContent=hand()?'Handskriven signatur sparad i projektet. Används på alla protokoll.':project.signature?'Textsignatur sparad i projektet. Används på alla protokoll.':'Samma signatur används på alla protokoll i projektet.';
  $('revisionSignRemove').hidden=!project.signature&&!project.signatureImage;
  $('secProtocolSignature').value=hand()?'Handskriven signatur':project.signature||'';
  let protocolImage=$('revisionProtocolSignaturePreview');
  if(!protocolImage){protocolImage=document.createElement('img');protocolImage.id='revisionProtocolSignaturePreview';protocolImage.alt='Projektets signatur';$('secProtocolSignature').after(protocolImage);}
  protocolImage.hidden=!hand();$('secProtocolSignature').hidden=!!hand();if(hand())protocolImage.src=project.signatureImage;else protocolImage.removeAttribute('src');
 }
 function commit(){save();refresh();showSelected();}
 function clear(){ctx.clearRect(0,0,canvas.width,canvas.height);points=[];hasInk=false;activePointer=null;$('revisionSignatureSave').disabled=true;}
 function position(event){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width,(event.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(event.clientY-r.top)*canvas.height/r.height))};}
 function open(){
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='revisionSignatureDialog';
   dialog.innerHTML='<h2>Signatur</h2><p>Skriv med finger, penna eller mus.</p><canvas id="revisionSignatureCanvas" width="1200" height="360" aria-label="Skriv din signatur här"></canvas><div class="revisionSignatureActions"><button id="revisionSignatureClear" type="button">Rensa</button><button id="revisionSignatureCancel" type="button">Avbryt</button><button id="revisionSignatureSave" type="button" class="primary" disabled>Spara signatur</button></div>';
   document.body.append(dialog);canvas=$('revisionSignatureCanvas');ctx=canvas.getContext('2d');ctx.strokeStyle='#23495e';ctx.fillStyle='#23495e';ctx.lineWidth=4.5;ctx.lineCap='round';ctx.lineJoin='round';
   canvas.addEventListener('pointerdown',event=>{
    if(activePointer!==null||event.button>0)return;event.preventDefault();activePointer=event.pointerId;canvas.setPointerCapture(event.pointerId);const p=position(event);points.push(p);ctx.beginPath();ctx.arc(p.x,p.y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(p.x,p.y);hasInk=true;$('revisionSignatureSave').disabled=false;
   });
   canvas.addEventListener('pointermove',event=>{if(activePointer!==event.pointerId)return;event.preventDefault();const p=position(event);points.push(p);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);});
   const end=event=>{if(activePointer!==event.pointerId)return;activePointer=null;};
   canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
   $('revisionSignatureClear').onclick=clear;$('revisionSignatureCancel').onclick=()=>dialog.close();
   $('revisionSignatureSave').onclick=()=>{
    if(!hasInk||!points.length)return;
    const padding=10,minX=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))-padding)),minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))-padding));
    const w=Math.max(1,Math.min(canvas.width-minX,Math.ceil(Math.max(...points.map(p=>p.x))+padding)-minX)),h=Math.max(1,Math.min(canvas.height-minY,Math.ceil(Math.max(...points.map(p=>p.y))+padding)-minY));
    const crop=document.createElement('canvas');crop.width=w;crop.height=h;crop.getContext('2d').drawImage(canvas,minX,minY,w,h,0,0,w,h);
    project.signatureImage=crop.toDataURL('image/png');project.signatureWidth=w;project.signatureHeight=h;project.signatureMode='hand';commit();dialog.close();
   };
  }
  clear();dialog.showModal();
 }
 function drawPdf(doc,x,y,w,h){
  if(!hand())return false;
  const ratio=(Number(project.signatureWidth)||3)/(Number(project.signatureHeight)||1),width=Math.min(w,h*ratio),height=width/ratio;
  doc.addImage(project.signatureImage,'PNG',x+(w-width)/2,y+(h-height)/2,width,height,'revision-project-signature','FAST');return true;
 }
 window.RevisionSignature={refresh,drawPdf};
 $('revisionSignDraw').onclick=open;
 $('revisionSignText').onclick=()=>{project.signatureMode='text';commit();$('secSignature').focus();};
 $('revisionSignRemove').onclick=()=>{project.signature='';project.signatureImage='';project.signatureMode='text';project.signatureWidth=0;project.signatureHeight=0;$('secSignature').value='';commit();};
 window.addEventListener('revision-work-loaded',refresh);refresh();
})();
