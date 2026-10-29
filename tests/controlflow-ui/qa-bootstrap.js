(async()=>{
 const params=new URLSearchParams(location.search),mode=params.get('qa');if(!mode)return;
 if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(alg,bytes)=>(await fetch('/__qa/hash',{method:'POST',body:bytes})).arrayBuffer()}});
 // Local HTTP preview lacks secure-context randomUUID; production uses HTTPS.
 if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const results={path:location.pathname,width:innerWidth,theme:params.get('theme')||'mist',checks:[],errors:[]};
 const assert=(ok,name,detail)=>results.checks.push({ok:!!ok,name,detail});
 window.addEventListener('error',e=>results.errors.push(e.message));
 window.addEventListener('unhandledrejection',e=>results.errors.push(String(e.reason)));
 try{
 await pause(250);document.documentElement.dataset.tillsynoTheme=results.theme;
 document.documentElement.dataset.tillsynoDevice=params.get('device')||'auto';AppTextScale.set(0);
 const revision=location.pathname.includes('controlflow-revision');
 const types=revision?['automation','automation_selfcheck','lock_revision']:['lock','alarm','access','detector','fire_panel','fire_door','fire_detector'];
 AllInOneProtocols.set(types);document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 const d=await PDFLib.PDFDocument.create(),p=d.addPage([600,400]);p.drawText('KONTROLLFLODE - TESTRITNING',{x:50,y:340,size:20});p.drawRectangle({x:60,y:70,width:470,height:230,borderWidth:2});p.drawLine({start:{x:290,y:70},end:{x:290,y:300},thickness:2});
 const bytes=await d.save();const file=new File([bytes],'Plan 2 – Entré.pdf',{type:'application/pdf'}),dt=new DataTransfer();dt.items.add(file);document.getElementById('securityFile').files=dt.files;await document.getElementById('securityFile').onchange({target:{files:[file]}});
 if(typeof renderQueue!=='undefined')await renderQueue;
 assert(!!pdf,'PDF opened');
 items=types.map((type,i)=>normalize({uid:'qa-'+type,type,number:i+1,id:'Objekt '+(i+1),page:1,x:.15+i*.08,y:.3,labelX:.2+i*.08,labelY:.6}));project.projectName='Läsbarhet och funktion';project.customer='Testkund';save();drawMarkers();refreshTop();await pause(100);
 if(mode==='visual'){AppTextScale.set(Number(params.get('scale'))||0);if(params.get('view')==='protocol'){selected=items[0].uid;showSelected();go('protocol');}return;}
 const size=sel=>{const el=document.querySelector(sel);return el?parseFloat(getComputedStyle(el).fontSize):null};
 const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
 const bodyExpected=innerWidth>=1100&&!['phone','tablet'].includes(params.get('device'))?18:16;
 assert(size('.secAppHeader .brand strong')>=24,'Header title >=24',size('.secAppHeader .brand strong'));
 for(const sel of ['#securityExport','#securityPreview','#secZoomIn','#secZoomOut','#secPrev','#secNext']){const el=document.querySelector(sel),r=el.getBoundingClientRect();assert(r.width>=43.5&&r.height>=43.5,'Target >=44 '+sel,{width:r.width,height:r.height})}
 const menu=document.querySelector('.cfAddMenu');
 if(menu.dataset.compact==='true'){
  assert(!menu.open,'Compact add menu starts closed');
  const original=items.slice();
  for(const scale of [0,6]){
   AppTextScale.set(scale);await pause(80);
   for(const type of types){
    const summary=menu.querySelector('summary');summary.scrollIntoView({block:'nearest'});summary.click();await pause(40);
    const add=menu.querySelector('[data-add="'+type+'"]');add.scrollIntoView({block:'nearest'});await pause(40);
    const r=add.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    assert(add===hit||add.contains(hit),'Object option receives pointer '+type+' scale '+scale,{hit:hit?.tagName,rect:r.toJSON()});
    assert(r.height>=44,'Add action target '+type);
    add.click();assert(addType===type,'Object type selected '+type);assert(!menu.open,'Menu closes after selection '+type);
    const count=items.length,m=document.getElementById('secMarkers'),rect=m.getBoundingClientRect();
    m.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.x+rect.width*.8,clientY:rect.y+rect.height*.8}));
    assert(items.length===count+1&&items.at(-1).type===type,'Drawing placement creates '+type);
   }
  }
  items=original;selected=null;AppTextScale.set(0);document.getElementById('secHint').hidden=true;save();drawMarkers();refreshTop();window.scrollTo(0,0);await pause(80);
 }

 function contrast(el){const doc=el.ownerDocument;const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);let c=rgb(getComputedStyle(el).color),bg=[255,255,255];let chain=[];for(let n=el;n;n=n.parentElement)chain.unshift(n);for(const n of chain){const v=rgb(getComputedStyle(n).backgroundColor);if(v.length>=3){const a=v.length===4?v[3]:1;bg=bg.map((x,i)=>v[i]*a+x*(1-a));}}const lum=v=>v.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);const l1=lum(c),l2=lum(bg);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
 for(const selector of ['.headerSubtitle','#securityExport','#securityMessage','#secPage','#secZoom']){const el=document.querySelector(selector);if(el&&visible(el))assert(contrast(el)>=4.5,'Text contrast '+selector,contrast(el));}
 assert(document.querySelector('#secViewer').clientHeight>=(revision?100:180),'Drawing usable height',document.querySelector('#secViewer').clientHeight);
 assert(document.documentElement.scrollWidth<=innerWidth+2,'No page horizontal overflow',{scroll:document.documentElement.scrollWidth,width:innerWidth});
 const baselineMarkers=[...document.querySelectorAll('.secMarker')].map(el=>({font:getComputedStyle(el).fontSize,width:el.getBoundingClientRect().width}));
 for(const o of items){selected=o.uid;showSelected();go('protocol');await pause(80);assert(size('.secCheckText')>=bodyExpected,'Checklist body '+o.type,{size:size('.secCheckText'),expected:bodyExpected});const choice=document.querySelector('.secChoices button[data-v="ok"]');if(choice){const rect=choice.getBoundingClientRect();assert(rect.width>=43.5&&rect.height>=43.5,'Result target >=44 '+o.type,{width:rect.width,height:rect.height});if(!choice.closest('.revisionCheckTable'))assert(rect.width>=100&&rect.height<=100,'Text result button fits '+o.type,{width:rect.width,height:rect.height});choice.click();assert(!!document.querySelector('.secChoices button.active[data-v="ok"]'),'Check result '+o.type)} }
 selected=items[0].uid;showSelected();go('protocol');
 assert(size('#secProgress')>=14,'Progress readable');assert(document.querySelector('#secCloseProtocol').getBoundingClientRect().width>=44,'Close protocol target >=44');
 const normal=size('#secLocation');assert(normal>=bodyExpected,'Input readable',{normal,bodyExpected});
 const origData=JSON.stringify(items);AppTextScale.set(6);await pause(80);assert(size('#secLocation')>=normal*1.99,'Text doubles',{normal,big:size('#secLocation')});
 assert(JSON.stringify(items)===origData,'Text scaling preserves project data');
 go('drawing');const biggerMarkers=[...document.querySelectorAll('.secMarker')].map(el=>({font:getComputedStyle(el).fontSize,width:el.getBoundingClientRect().width}));assert(JSON.stringify(baselineMarkers)===JSON.stringify(biggerMarkers),'UI scale preserves drawing marker dimensions');
 assert(document.documentElement.scrollWidth<=innerWidth+2,'200% no page horizontal overflow',document.documentElement.scrollWidth);
 AppTextScale.set(0);go('project');await pause(50);assert(size('#secCustomer')>=bodyExpected,'Project input readable',size('#secCustomer'));
 go('drawing');
 if(!revision){document.getElementById('secRotate').click();await renderQueue;assert(drawingRotation()===90,'Rotation works');}
 let blob;const origURL=URL.createObjectURL;URL.createObjectURL=function(value){if(value.type==='application/pdf')blob=value;return origURL.call(this,value)};
 const origClick=HTMLAnchorElement.prototype.click;let filename;HTMLAnchorElement.prototype.click=function(){if(this.download){filename=this.download;return;}return origClick.call(this)};
 await exportPdf();URL.createObjectURL=origURL;HTMLAnchorElement.prototype.click=origClick;
 assert(!!blob,'PDF export produces a file');if(blob){const savedBytes=new Uint8Array(await blob.arrayBuffer());const exported=await PDFLib.PDFDocument.load(savedBytes);assert(exported.getPageCount()>1,'Export contains drawing and protocols',exported.getPageCount());const inspected=await inspectSecurityWorkPdf(savedBytes);assert(inspected?.work.items.length===items.length,'Saved PDF preserves all objects');if(!revision){assert(exported.getPage(0).getRotation().angle===90,'Saved PDF rotation preserved');assert(filename==='Plan 2 – Entré.pdf','Original filename preserved',filename);const data=JSON.stringify(items);await closeSecurityDrawing();assert(!pdf,'Close drawing works');document.getElementById('securityFile').files=dt.files;await document.getElementById('securityFile').onchange({target:{files:[file]}});await renderQueue;assert(JSON.stringify(items)===data,'Reopen preserves edits');}}
 go('drawing');results.ok=results.checks.every(x=>x.ok)&&!results.errors.length;
 }catch(e){results.errors.push(e.stack||String(e));results.ok=false;}
 window.__qaResult=results;parent.postMessage({type:'controlflow-qa',result:results},location.origin);
 if(parent===window){const box=document.createElement('pre');box.id='qa-result';box.style='position:fixed;right:0;top:0;z-index:999999;background:white;color:black;max-height:45vh;overflow:auto;padding:12px;font:12px monospace';box.textContent=JSON.stringify(results,null,2);document.body.append(box)}
})();

