/* Separate projection example. Searchable vector PDF and portable project data.
 * This module does not modify SmartMatch, its readers, or saved service data. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(()=>require('./vendor/pdf-lib.min.js'),()=>require('./smartmatch-projektering-demo-v1-data.js'));
 else root.ProjPDF=factory(()=>root.PDFLib,()=>root.ProjData);
})(typeof window!=='undefined'?window:globalThis,function(library,dataLibrary){
 'use strict';
 const WIDTH=1200,HEIGHT=800,CARD_WIDTH=595,CARD_HEIGHT=842,DATA_KEY='TillsynoProjekteringDemoV1';
 const codeRect=Object.freeze({x:30/595,y:44/842,w:155/595,h:36/842});
 const tableRect=Object.freeze({x:30/595,y:220/842,w:535/595,h:512/842});
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const natural=(a,b)=>a.localeCompare(b,'sv',{numeric:true,sensitivity:'base'});
 const usedCodes=state=>[...new Set(state.doors.map(door=>door.code))].sort(natural);
 function assertDrawingLabels(state){
  const labels=[state.project.name,'EXEMPELRITNING',...state.doors.flatMap(door=>[door.id,door.room])];
  for(const code of usedCodes(state)){
   const canonical=code.toUpperCase().replace(/[\s/_.-]+/g,''),pattern=new RegExp('(^|[^A-Z0-9])'+[...canonical].map(char=>char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s/_.-]*')+'(?=$|[^A-Z0-9])','u');
   if(labels.some(label=>pattern.test(String(label).toUpperCase())))throw Error('Beteckningen '+code+' finns också i ett rumsnamn, dörrnummer eller en ritningsrubrik. Ändra den texten eller välj en annan stämpelkod före PDF-export så att läsaren får entydiga träffar.');
  }
 }
 function assertDrawingGeometry(state,font){
  const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
  const rooms=geometry(state).rooms,stamps=rooms.map(room=>{const m=stampMetrics(room.code,room.shape);return {id:room.id,x:room.x-m.width/2-2,y:room.y-m.height/2-2,w:m.width+4,h:m.height+4};});
  for(const room of rooms){const m=stampMetrics(room.code,room.shape);if(room.wall.x<36||room.wall.x+room.wall.w>1164||room.wall.y<80||room.y+m.height/2>675)throw Error('Dörr '+room.id+' ligger för nära sidans kant eller ritningsrubriken. Flytta dörren före PDF-export.');}
  for(let i=0;i<stamps.length;i++)for(let j=i+1;j<stamps.length;j++)if(overlap(stamps[i],stamps[j]))throw Error('Stämplarna vid '+stamps[i].id+' och '+stamps[j].id+' överlappar. Flytta isär dem före PDF-export.');
  const labels=rooms.flatMap(room=>[[room.room,room.wall.y+22,10],[room.id,room.wall.y+38,8]].map(([value,baseline,size])=>{const w=font.widthOfTextAtSize(assertText(font,value),size);return {id:room.id,x:room.x-w/2,y:baseline-size*.95,w,h:size*1.2};}));
  for(const stamp of stamps)if(labels.some(label=>overlap(stamp,label)))throw Error('Stämpeln vid '+stamp.id+' överlappar en rums- eller dörrtext. Flytta isär märkningarna före PDF-export.');
 }
 function geometry(state){
  return {width:WIDTH,height:HEIGHT,rooms:state.doors.map((door,index)=>({
   id:door.id,code:door.code,room:door.room,x:door.x,y:door.y,index,
   wall:{x:door.x-51,y:door.y-84,w:102,h:64},door:{x:door.x-18,y:door.y-20,w:22},
   shape:state.cards[door.code]?.shape||'oval'
  }))};
 }
 function stampMetrics(code,shape){
  const max=88,fontSize=Math.min(11,Math.max(5,(max-15)/(Math.max(1,code.length)*.68))),width=Math.min(max,Math.max(shape==='square'?35:48,code.length*fontSize*.68+16));
  return {width,height:shape==='square'?27:25,fontSize};
 }
 function renderPlanSVG(state,selectedId){
  const plan=geometry(state),selected=state.doors.find(door=>door.id===selectedId),header=escape(state.project.name);
  const rooms=plan.rooms.map(room=>{
   const {wall,door,x,y,shape}=room,m=stampMetrics(room.code,shape),active=room.id===selectedId,same=selected?.code===room.code&&!active;
   const shapeElement=shape==='square'?`<rect x="${x-m.width/2}" y="${y-m.height/2}" width="${m.width}" height="${m.height}" rx="2"/>`:`<ellipse cx="${x}" cy="${y}" rx="${m.width/2}" ry="${m.height/2}"/>`;
   return `<g class="plan-room"><path class="plan-wall" d="M${door.x} ${door.y}H${wall.x}V${wall.y}H${wall.x+wall.w}V${door.y}H${door.x+door.w}"/><path class="plan-swing" d="M${door.x} ${door.y}V${door.y-door.w}M${door.x} ${door.y-door.w}A${door.w} ${door.w} 0 0 1 ${door.x+door.w} ${door.y}"/><text class="plan-room-label" x="${x}" y="${wall.y+22}" text-anchor="middle">${escape(room.room)}</text><text class="plan-door-label" x="${x}" y="${wall.y+38}" text-anchor="middle">${escape(room.id)}</text><g class="door-stamp${active?' is-selected':''}${same?' same-code':''}" data-door-id="${escape(room.id)}" tabindex="0" role="button" aria-label="Dörr ${escape(room.id)}, ${escape(room.code)}" aria-pressed="${active?'true':'false'}"><title>${escape(room.id)} · ${escape(room.code)} · ${escape(room.room)}</title><rect class="stamp-touch" x="${x-48}" y="${y-23}" width="96" height="46" rx="12" fill="transparent"/>${shapeElement}<text x="${x}" y="${y+4}" text-anchor="middle" font-size="${m.fontSize}">${escape(room.code)}</text></g></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="projection-plan" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-label="Exempelritning med ${state.doors.length} dörrar" role="group"><style>.projection-plan{background:#fff;color:#334754;font-family:Arial,sans-serif}.plan-wall{fill:none;stroke:#51616a;stroke-width:2.3;stroke-linejoin:round}.plan-swing{fill:none;stroke:#a2aeb4;stroke-width:1.15}.plan-room-label{font-size:10px;fill:#586b75}.plan-door-label{font-size:8px;fill:#7c8a91}.door-stamp{cursor:pointer;outline:none}.door-stamp>ellipse,.door-stamp>rect:not(.stamp-touch){fill:#ffdb5c;stroke:#97792c;stroke-width:.9}.door-stamp>text{fill:#26323b;font-weight:700;pointer-events:none}.door-stamp.is-selected>ellipse,.door-stamp.is-selected>rect:not(.stamp-touch){stroke:#14594e;stroke-width:3.8}.door-stamp.same-code>ellipse,.door-stamp.same-code>rect:not(.stamp-touch){stroke:#338b78;stroke-width:2.4}.door-stamp:focus>ellipse,.door-stamp:focus>rect:not(.stamp-touch){stroke:#1958a3;stroke-width:3.8}</style><rect x=".5" y=".5" width="1199" height="799" fill="#fff" stroke="#dce3e7"/><path d="M36 71H1164M36 690H1164" stroke="#dbe3e8"/><text x="38" y="35" font-size="20" font-weight="700" fill="#263e48">${header}</text><text x="38" y="56" font-size="10" fill="#6b7c84">Plan 01 · ${state.doors.length} dörrar · Digital projektering</text><text x="1162" y="35" text-anchor="end" font-size="11" font-weight="700" fill="#73828a">EXEMPELRITNING</text>${rooms}<text x="38" y="718" font-size="10" fill="#5c707a">Tryck på en gul stämpel för att öppna det gemensamma dörrkortet.</text><text x="38" y="737" font-size="10" fill="#5c707a">Samma beteckning delar produkter. Varje dörr har en egen position.</text><rect x="880" y="710" width="283" height="55" fill="#f6f9fa" stroke="#dbe3e8"/><text x="895" y="731" font-size="10" font-weight="700" fill="#425863">TILLSYNO · PROJEKTERING</text><text x="895" y="749" font-size="9" fill="#687d87">Rev ${escape(state.project.revision)} · Principritning, ej bygghandling</text></svg>`;
 }
 function assertText(font,text){
  const value=String(text??'').replace(/[\r\n\t]/g,' ');
  try{font.encodeText(value);}catch(_){throw Error('PDF-exporten kan inte återge ett tecken i ”'+value.slice(0,50)+'”. Använd svenska eller latinska bokstäver i PDF-underlaget.');}
  return value;
 }
 function text(page,font,value,x,y,size=9,color){
  const options={x,y,size,font};if(color)options.color=color;
  page.drawText(assertText(font,value),options);
 }
 function fitted(page,font,value,x,y,size,maxWidth,color){
  value=assertText(font,value);const width=font.widthOfTextAtSize(value,size);
  if(width>maxWidth)size*=maxWidth/width;
  if(size<5.2)throw Error('Texten ”'+value.slice(0,45)+'” är för lång för en läsbar dörrkortscell. Förkorta texten före PDF-export.');
  text(page,font,value,x,y,size,color);
 }
 function wrapped(page,font,value,x,y,maxWidth,size,lineHeight,maxLines=3){
  value=assertText(font,value);const words=value.split(/\s+/),lines=[];let line='';
  if(words.some(word=>font.widthOfTextAtSize(word,size)>maxWidth))throw Error('Anteckningen innehåller ett ord som är för långt för PDF-sidan. Dela upp eller förkorta ordet före export.');
  for(const word of words){const candidate=line?line+' '+word:word;if(font.widthOfTextAtSize(candidate,size)>maxWidth&&line){lines.push(line);line=word;}else line=candidate;}
  if(line)lines.push(line);if(lines.length>maxLines)throw Error('Anteckningen är för lång för PDF-sidan. Förkorta den före export.');
  lines.forEach((line,index)=>text(page,font,line,x,y-index*lineHeight,size));
 }
 function drawPlan(document,state,fonts,lib){
  const page=document.addPage([WIDTH,HEIGHT]),{regular,bold}=fonts,{rgb}=lib;
  const slate=rgb(.20,.28,.33),muted=rgb(.43,.50,.54),wall=rgb(.32,.38,.42),light=rgb(.86,.89,.91);
  const line=(x1,y1,x2,y2,thickness=1,color=wall)=>page.drawLine({start:{x:x1,y:HEIGHT-y1},end:{x:x2,y:HEIGHT-y2},thickness,color});
  fitted(page,bold,state.project.name,38,765,20,880,slate);text(page,regular,'Plan 01 · '+state.doors.length+' dörrar · Digital projektering',38,744,10,muted);
  text(page,bold,'EXEMPELRITNING',1027,765,11,muted);line(36,71,1164,71,1,light);line(36,690,1164,690,1,light);
  for(const room of geometry(state).rooms){
   const {wall:w,door:d,x,y,shape}=room,m=stampMetrics(room.code,shape);
   line(d.x,d.y,w.x,d.y,2.3);line(w.x,d.y,w.x,w.y,2.3);line(w.x,w.y,w.x+w.w,w.y,2.3);line(w.x+w.w,w.y,w.x+w.w,d.y,2.3);line(w.x+w.w,d.y,d.x+d.w,d.y,2.3);line(d.x,d.y,d.x,d.y-d.w,1.1,light);
   page.drawSvgPath(`M0 0 A${d.w} ${d.w} 0 0 1 ${d.w} ${d.w}`,{x:d.x,y:HEIGHT-(d.y-d.w),borderColor:rgb(.63,.68,.71),borderWidth:1.1});
   const center=(value,baseline,size,font,color)=>text(page,font,value,x-font.widthOfTextAtSize(assertText(font,value),size)/2,HEIGHT-baseline,size,color);
   center(room.room,w.y+22,10,regular,muted);center(room.id,w.y+38,8,regular,muted);
   const stroke=rgb(.59,.47,.17),fill=rgb(1,.86,.36);
   if(shape==='square')page.drawRectangle({x:x-m.width/2,y:HEIGHT-y-m.height/2,width:m.width,height:m.height,color:fill,borderColor:stroke,borderWidth:.9});
   else page.drawEllipse({x,y:HEIGHT-y,xScale:m.width/2,yScale:m.height/2,color:fill,borderColor:stroke,borderWidth:.9});
   center(room.code,y+4,m.fontSize,bold,slate);
   // Native page text remains the rendering source. An explicit, empty
   // annotation appearance preserves stamp identity without overpainting it.
   const appearance=document.context.register(document.context.flateStream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,m.width,m.height],Resources:{}}));
   page.node.addAnnot(document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[x-m.width/2,HEIGHT-y-m.height/2,x+m.width/2,HEIGHT-y+m.height/2],Subj:lib.PDFHexString.fromText(room.code),Contents:lib.PDFHexString.fromText(room.code),NM:lib.PDFHexString.fromText('projection-'+room.id),F:4,AP:{N:appearance}})));
  }
  text(page,regular,'Samma beteckning delar ett dörrkort. Varje dörr har en egen position.',38,82,10,muted);
  text(page,regular,'Principritning för prov och arbetssätt. Inte en bygghandling.',38,63,10,muted);
  page.drawRectangle({x:880,y:35,width:283,height:55,color:rgb(.965,.976,.98),borderColor:light,borderWidth:1});
  text(page,bold,'TILLSYNO · PROJEKTERING',895,69,10,slate);fitted(page,regular,'Rev '+state.project.revision+' · Sökbara stämplar och dörrkort',895,51,9,250,muted);
  return page;
 }
 function drawCard(document,state,code,fonts,lib,index,total){
  const card=state.cards[code],page=document.addPage([CARD_WIDTH,CARD_HEIGHT]),{regular,bold}=fonts,{rgb}=lib;
  const slate=rgb(.16,.23,.27),border=rgb(.55,.61,.64),pale=rgb(.94,.96,.97),left=30,right=565;
  const line=(x1,y1,x2,y2,width=.6)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:width,color:border});
  const cell=(x,y,w,h,fill)=>page.drawRectangle({x,y,width:w,height:h,borderColor:border,borderWidth:.6,...(fill?{color:fill}:{})});
  fitted(page,regular,state.project.name,30,819,9,420,slate);text(page,regular,'Dörrkort · '+index+'/'+total,466,819,8,slate);
  cell(left,762,155,36,pale);cell(185,762,380,36,pale);fitted(page,bold,code,38,772,18,139,slate);text(page,bold,'BESLAGSKORT',196,779,10,slate);text(page,regular,'Gemensamt för dörrar med samma beteckning',196,766,8,slate);
  const count=state.doors.filter(door=>door.code===code).length;
  const metadata=[['Littera',code],['Antal',String(count)],['Hängning','Enligt ritning'],['Dörrtyp','Exempeldörr'],['Brandkrav','-'],['Skyddsklass','-'],['Utrymningskrav','-'],['Återinrymning','-']];
  let top=762;
  for(const [label,value]of metadata){cell(left,top-17,155,17);cell(185,top-17,380,17);text(page,bold,label,38,top-12,8);fitted(page,regular,value,196,top-12,8,358);top-=17;}
  const cols=[30,185,402,441,503,565],headY=600;
  cell(left,headY,535,22,pale);for(const x of cols.slice(1,-1))line(x,headY,x,headY+22);
  for(const [label,x]of [['Komponent',38],['Produkt',196],['Antal',409],['Lev av',448],['Mont av',510]])text(page,bold,label,x,608,8);
  const groups=[];
  for(const row of card.rows){let group=groups.find(item=>item.title===row.section);if(!group){group={title:row.section,rows:[]};groups.push(group);}group.rows.push(row);}
  let y=headY;
  for(const group of groups){
   // Uppercase also carries section identity through the current reader's
   // native-word adapter, which intentionally does not preserve font weight.
   y-=18;cell(left,y,535,18,pale);text(page,bold,group.title.toLocaleUpperCase('sv'),38,y+5.5,9);
   for(const row of group.rows){
    y-=16;cell(left,y,535,16);for(const x of cols.slice(1,-1))line(x,y,x,y+16);
    fitted(page,regular,row.label,38,y+5,8,139);
    fitted(page,regular,row.product||'-',196,y+5,8,196);
    if(row.product){text(page,regular,String(row.quantity||1),409,y+5,8);fitted(page,regular,row.delivery||'-',448,y+5,8,47);fitted(page,regular,row.installer||'-',510,y+5,8,47);}
   }
  }
  if(y<90)throw Error('Dörrkortet '+code+' har för många rader för en sida.');
  if(card.note){text(page,bold,'Anteckning',30,91,8);wrapped(page,regular,card.note,30,78,535,8,10,3);}
  text(page,regular,'Exempelprodukter – produktval och kompatibilitet ska verifieras vid riktig projektering.',30,27,7,rgb(.42,.48,.51));
  fitted(page,regular,'Revision '+state.project.revision,465,27,7,100);
  return page;
 }
 async function build(input,options={}){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas. Öppna sidan igen med internet.');
  const state=data.validate(input),mode=options.mode||'combined';if(!['combined','drawing','cards'].includes(mode))throw Error('Välj ritning, dörrkort eller komplett PDF.');
  assertDrawingLabels(state);
  const document=await lib.PDFDocument.create(),regular=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold),fonts={regular,bold},codes=usedCodes(state);
  assertDrawingGeometry(state,regular);
  if(mode==='combined'||mode==='drawing')drawPlan(document,state,fonts,lib);
  if(mode==='combined'||mode==='cards')codes.forEach((code,index)=>drawCard(document,state,code,fonts,lib,index+1,codes.length));
  if(!document.getPageCount())throw Error('Projektet innehåller inga dörrar att exportera.');
  document.setTitle(state.project.name+' · Projektering');document.setAuthor('Tillsyno');document.setCreator('Tillsyno Projekteringsdemo 1');document.setSubject('Sökbar exempelritning och digitala dörrkort');
  document.catalog.set(lib.PDFName.of(DATA_KEY),lib.PDFHexString.fromText(JSON.stringify(state)));
  return document.save();
 }
 async function read(bytes){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas.');
  const document=await lib.PDFDocument.load(bytes),saved=document.catalog.get(lib.PDFName.of(DATA_KEY));
  if(!saved||typeof saved.decodeText!=='function')throw Error('PDF:en innehåller inget sparat projekteringsprojekt. Välj en PDF exporterad från denna demo.');
  let value;try{value=JSON.parse(saved.decodeText());}catch(_){throw Error('Projektuppgifterna i PDF:en kunde inte läsas.');}
  return data.validate(value);
 }
 return Object.freeze({build,read,geometry,renderPlanSVG,stampMetrics,usedCodes,codeRect,tableRect,WIDTH,HEIGHT,DATA_KEY});
});
