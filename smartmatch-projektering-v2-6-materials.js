/* Projektering 2.6: simple symbol codes and saved models in one material calculation. */
(function(root,factory){
 'use strict';
 const api=factory(
  ()=>typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-4-data.js'):root.Proj2Data,
  ()=>typeof module==='object'&&module.exports?require('./vendor/pdf-lib.min.js'):root.PDFLib
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Materials=api;
})(typeof window==='object'?window:globalThis,function(dataLibrary,pdfLibrary){
 'use strict';
 const natural=new Intl.Collator('sv',{numeric:true,sensitivity:'base'});
 const clean=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
 const fold=value=>clean(value).toLocaleLowerCase('sv');
 const present=value=>!!clean(value)&&!/^[-–—]+$/.test(clean(value));
 const COMPONENTS=Object.freeze({
  lock:'Låshus','cylinder-fittings':'Cylinderbehör',strike:'Slutbleck',handle:'Trycke',pull:'Draghandtag',
  escape:'Utrymningsbehör',cable:'Kabelöverföring',cylinder:'Cylinder',closer:'Dörrstängare',
  'closer-arm':'Dörrstängningsarm',operator:'Dörrautomatik',sensor:'Sensorlist',
  elbow:'Armbågskontakt',button:'Öppnaknapp',coordinator:'Dörrkoordinator',bolt:'Kantregel',
  magnet:'Magnetkontakt',reader:'Kortläsare',controller:'Dörrcentral'
 });
 function definitions(D){
  const result=new Map();
  for(const section of D.SECTIONS)for(const row of section.rows){
   const id=row.id==='closing-elbow'?'elbow':row.id==='access-button'?'button':row.category;
   result.set(row.id,{id,component:COMPONENTS[id]||row.label,multiplier:row.id==='closing-elbow'?2:1});
  }
  return result;
 }
 function productType(stencil){return stencil?.kind==='symbol'?(stencil.productType??(stencil.code==='DA'?'doorAutomation':stencil.code==='DS'?'doorCloser':'none')):'none';}
 function productDefinition(stencil,D){
  const type=productType(stencil);
  if(type==='doorAutomation')return{id:'operator',component:'Dörrautomatik',category:'Dörrautomatik',multiplier:1};
  if(type==='doorCloser')return{id:'closer',component:'Dörrstängare',category:'Dörrstängare',multiplier:1};
  if(type==='elbowContact')return{id:'elbow',component:'Armbågskontakt',category:'Armbågskontakt',multiplier:2};
  if(type==='none')return null;
  const category=clean(D.stencilCategory?.(stencil)||stencil.category||'Övrigt');
  return{id:'other:'+fold(category),component:category,category,multiplier:typeof D.productMultiplier==='function'?D.productMultiplier(stencil):1};
 }
 function build(input){
  const D=dataLibrary();if(!D)throw Error('Materialberäkningen kunde inte laddas. Öppna projektet igen.');
  const state=D.validate(input),byDefinition=definitions(D),groups=new Map(),placedCards=new Map(),unresolved=[];
  const add=(definition,product,quantity,source,missing=false)=>{
   if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Materialets antal är ogiltigt.');
   const name=clean(product),key=JSON.stringify([definition.id,missing,fold(name)]);
   if(!groups.has(key))groups.set(key,{key,category:definition.category||definition.component,component:definition.component,product:name,quantity:0,sources:[],unresolved:missing});
   const row=groups.get(key);row.quantity+=quantity;row.sources.push(source);
  };
  for(const placement of state.placements){
   const stencil=state.stencils[placement.stencilId];
   if(stencil.kind==='card')placedCards.set(placement.code,(placedCards.get(placement.code)||0)+1);
  }
  for(const [code,count]of placedCards){
   for(const row of state.cards[code].rows){
    if(!present(row.product))continue;
    const definition=byDefinition.get(row.id);
    if(!definition)throw Error('Produktraden '+row.id+' saknar en materialgrupp.');
    const quantity=count*row.quantity*definition.multiplier;
    add(definition,row.product,quantity,{kind:'card',code,rowId:row.id,quantity,placements:count,perPlacement:row.quantity,multiplier:definition.multiplier});
   }
  }
  for(const placement of state.placements){
   const stencil=state.stencils[placement.stencilId],definition=productDefinition(stencil,D);if(!definition)continue;
   const equipment=typeof D.equipmentFor==='function'?D.equipmentFor(placement):placement.equipment||{};
   // Simple symbols are complete as codes; a saved legacy model remains explicit.
   const model=present(equipment.model)?clean(equipment.model):stencil.code;
   const units=equipment.quantity??1,quantity=units*definition.multiplier;
   const source={kind:'product',code:placement.code,placementId:placement.id,objectNumber:equipment.objectNumber||'',page:placement.page,quantity,units,multiplier:definition.multiplier};
   add(definition,model,quantity,source);
  }
  const rows=[...groups.values()].sort((a,b)=>natural.compare(a.category,b.category)||natural.compare(a.component,b.component)||natural.compare(a.product,b.product));
  return {projectName:state.project.name,revision:state.project.revision,updatedAt:state.project.updatedAt,rows,totalQuantity:rows.reduce((sum,row)=>sum+row.quantity,0),unresolved,unplacedCards:Object.keys(state.cards).filter(code=>!placedCards.has(code)).sort(natural.compare)};
 }
 function sourceText(row){
  const grouped=new Map();for(const source of row.sources||[])grouped.set(source.code,(grouped.get(source.code)||0)+source.quantity);
  return [...grouped].sort(([a],[b])=>natural.compare(a,b)).map(([code,quantity])=>code+': '+quantity).join('; ');
 }
 function checked(report){
  if(!report||!Array.isArray(report.rows)||typeof report.projectName!=='string'||!Array.isArray(report.unresolved)||!Array.isArray(report.unplacedCards))throw Error('Materiallistan är ogiltig.');
  let total=0;
  for(const row of report.rows){
   if(!row||['category','component','product'].some(key=>typeof row[key]!=='string')||!Number.isSafeInteger(row.quantity)||row.quantity<1||!Array.isArray(row.sources))throw Error('En rad i materiallistan är ogiltig.');
   if(row.sources.some(source=>!source||typeof source.code!=='string'||!Number.isSafeInteger(source.quantity)||source.quantity<1))throw Error('Materialradens underlag är ogiltigt.');
   total+=row.quantity;
  }
  if(report.totalQuantity!==total)throw Error('Materiallistans totalsumma stämmer inte med raderna.');
  return report;
 }
 function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
 function csv(input){
  const report=checked(input),rows=[['Grupp','Komponent','Produkt','Antal','Underlag (antal)']];
  for(const row of report.rows)rows.push([row.category,row.component,row.product,row.quantity,sourceText(row)]);
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
 }
 async function pdf(input){
  const report=checked(input),lib=pdfLibrary();if(!lib)throw Error('PDF-exporten kunde inte laddas. Öppna projektet igen.');
  const document=await lib.PDFDocument.create(),normal=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold);
  document.setTitle('Materiallista - '+report.projectName);document.setSubject('Beställningsunderlag från placerade dörrkort och produkter');document.setCreator('Tillsyno Projektering');
  const left=36,right=559,bottom=47,lineHeight=12,fontSize=9,columns=[{x:36,width:115,label:'Grupp'},{x:151,width:241,label:'Produkt'},{x:392,width:46,label:'Antal'},{x:438,width:121,label:'Underlag (antal)'}];
  const ink=lib.rgb(.13,.22,.20),muted=lib.rgb(.37,.43,.39),line=lib.rgb(.81,.85,.81),light=lib.rgb(.95,.97,.94);
  function safe(value){const text=clean(value);try{normal.encodeText(text);}catch(_){throw Error('PDF-exporten kan inte återge ett tecken i ”'+text.slice(0,50)+'”. Använd svenska eller latinska bokstäver, eller exportera CSV.');}return text;}
  function wrap(value,width,font=normal,size=fontSize){
   const text=safe(value);if(!text)return [''];
   const lines=[],fits=value=>font.widthOfTextAtSize(value,size)<=width;
   let current='';
   for(const word of text.split(' ')){
    if(fits(current?current+' '+word:word)){current=current?current+' '+word:word;continue;}
    if(current){lines.push(current);current='';}
    if(fits(word)){current=word;continue;}
    let part='';for(const char of Array.from(word)){if(part&&!fits(part+char)){lines.push(part);part='';}part+=char;}current=part;
   }
   if(current)lines.push(current);return lines.length?lines:[''];
  }
  let page,y;
  function draw(value,x,top,size=fontSize,font=normal,color=ink){page.drawText(safe(value),{x,y:top,size,font,color});}
  function nextPage(){
   page=document.addPage([595,842]);y=805;draw('Materiallista',left,y,20,bold);y-=23;
   for(const label of wrap(report.projectName,right-left,bold,11)){draw(label,left,y,11,bold);y-=14;}
   draw(report.rows.length+' produktrader · '+report.totalQuantity+' st totalt',left,y,9,normal,muted);y-=16;
   draw('Armbågskontakter räknas ×2. Underlaget visar antal per beteckning.',left,y,8,normal,muted);y-=16;
   page.drawRectangle({x:left,y:y-23,width:right-left,height:23,color:light});
   for(const column of columns)draw(column.label,column.x+5,y-15,8,bold);
   y-=23;
  }
  nextPage();
  if(!report.rows.length){draw('Inga produkter att beställa från de aktuella placeringarna.',left,y-23,10);y-=42;}
  for(const row of report.rows){
   const cells=[wrap(row.component,105),wrap(row.product,231),[String(row.quantity)],wrap(sourceText(row),111)];
   const max=Math.max(...cells.map(lines=>lines.length));let offset=0;
   while(offset<max){
    let capacity=Math.floor((y-bottom-12)/lineHeight);if(capacity<1){nextPage();capacity=Math.floor((y-bottom-12)/lineHeight);}
    const count=Math.min(max-offset,capacity),height=count*lineHeight+12;
    if(row.unresolved)page.drawRectangle({x:left,y:y-height,width:right-left,height,color:lib.rgb(1,.97,.90)});
    for(let index=0;index<cells.length;index++){
     const lines=cells[index].slice(offset,offset+count),column=columns[index];
     for(let j=0;j<lines.length;j++){const value=lines[j];if(index===2){const width=normal.widthOfTextAtSize(value,fontSize);draw(value,column.x+column.width-7-width,y-15-j*lineHeight);}else draw(value,column.x+5,y-15-j*lineHeight);}
    }
    page.drawLine({start:{x:left,y:y-height},end:{x:right,y:y-height},thickness:.45,color:line});
    y-=height;offset+=count;
   }
  }
  const notes=[];
  if(report.unresolved.length)notes.push(report.unresolved.length+' produktplaceringar saknar vald typ/modell. Fyll i dem före beställning.');
  if(report.unplacedCards.length)notes.push('Dörrkort utan placering ingår inte i antalet: '+report.unplacedCards.join(', ')+'.');
  for(const note of notes){for(const value of wrap(note,right-left,normal,8)){if(y<bottom+20)nextPage();draw(value,left,y-18,8,normal,muted);y-=12;}y-=8;}
  const pages=document.getPages();for(let index=0;index<pages.length;index++){
   pages[index].drawText('Sida '+(index+1)+' av '+pages.length,{x:left,y:27,size:8,font:normal,color:muted});
   const stamp='Totalt '+report.totalQuantity+' st';pages[index].drawText(stamp,{x:right-normal.widthOfTextAtSize(stamp,8),y:27,size:8,font:normal,color:muted});
  }
  return new Uint8Array(await document.save());
 }
 return Object.freeze({build,csv,pdf,sourceText});
});
