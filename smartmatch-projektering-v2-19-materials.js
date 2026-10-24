/* Projektering 2.19: catalogue labor suggestions with explicit project overrides. */
(function(root,factory){
 'use strict';
 const api=factory(
  ()=>typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-data.js'):root.Proj2Data,
  ()=>typeof module==='object'&&module.exports?require('./vendor/pdf-lib.min.js'):root.PDFLib,
  ()=>typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-catalog.js'):root.Proj2Catalog
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Materials=api;
})(typeof window==='object'?window:globalThis,function(dataLibrary,pdfLibrary,catalogLibrary){
 'use strict';
 const natural=new Intl.Collator('sv',{numeric:true,sensitivity:'base'});
 const clean=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
 const fold=value=>clean(value).toLocaleLowerCase('sv');
 const present=value=>!!clean(value)&&!/^[-–—]+$/.test(clean(value));
 const materialKey=(componentId,product)=>JSON.stringify([componentId,false,fold(product)]);
 const roundedMinutes=value=>Number(value.toFixed(6));
 const validRate=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000;
 function isGSCardCode(value){
  // Older GS4-A and hyphenated GS-4 share the same GS family as GS4:1.
  // DGS100, GSM1 and other named door cards remain separate families.
  try{return /^GS\d+(?:[A-Z][A-Z0-9]*)?(?::[1-9]\d*)?$/.test(dataLibrary().matchKey(value));}catch(_){return false;}
 }
 const COMPONENTS=Object.freeze({
  lock:'Låshus','cylinder-fittings':'Cylinderbehör',strike:'Slutbleck',handle:'Trycke',pull:'Draghandtag',
  escape:'Utrymningsbehör',cable:'Kabelöverföring',cylinder:'Cylinder',closer:'Dörrstängare',
  'closer-arm':'Dörrstängningsarm',operator:'Dörrautomatik',sensor:'Sensorlist',
  elbow:'Armbågskontakt',button:'Öppnaknapp',coordinator:'Dörrkoordinator',bolt:'Kantregel',
  magnet:'Magnetkontakt',reader:'Kortläsare',controller:'Dörrcentral',preparation:'Förberedelse'
 });
 function definitions(D){
  const result=new Map();
  for(const section of D.SECTIONS)for(const row of section.rows){
   const id=row.id==='closing-elbow'?'elbow':row.id==='access-button'?'button':row.category;
   result.set(row.id,{id,component:COMPONENTS[id]||row.label,catalogCategory:row.category,kind:row.category==='preparation'?'work':'material',multiplier:row.id==='closing-elbow'?2:1});
  }
  return result;
 }
 function summarize(report,selectedRows=report.rows){
  if(!Array.isArray(selectedRows))throw Error('Materiallistan är ogiltig.');
  let totalQuantity=0,materialQuantity=0,workQuantity=0,workRows=0,totalMinutes=0,untimedRows=0,timeManualRows=0,timeProvidedRows=0,timeEstimatedRows=0,timeReviewRows=0,categoryReviewRows=0;
  const rows=selectedRows.map(row=>{
   if(!row||!Number.isSafeInteger(row.quantity)||row.quantity<1)throw Error('Materialets antal är ogiltigt.');
   const timePerUnit=row.timePerUnit??null,estimated=timePerUnit!==null,timeOrigin=row.timeOrigin??(estimated?'manual':'missing'),kind=row.kind??'material';
   if(!['material','work'].includes(kind))throw Error('Materialradens typ är ogiltig.');
   if(estimated&&!validRate(timePerUnit))throw Error('Tid per styck måste vara ett tal mellan 0 och 100000 minuter.');
   const timeMinutes=estimated?roundedMinutes(row.quantity*timePerUnit):null;
   totalQuantity+=row.quantity;
   if(kind==='work'){workQuantity+=row.quantity;workRows++;}else materialQuantity+=row.quantity;
   if(estimated)totalMinutes+=timeMinutes;else untimedRows++;
   if(timeOrigin==='manual')timeManualRows++;
   else if(timeOrigin==='provided')timeProvidedRows++;
   else if(timeOrigin==='estimated')timeEstimatedRows++;
   if(row.timeRequiresReview)timeReviewRows++;
   if(row.categoryWarning)categoryReviewRows++;
   return {...row,timePerUnit,timeMinutes,estimated,timeOrigin,kind};
  });
  if(!Number.isSafeInteger(totalQuantity)||!Number.isFinite(totalMinutes))throw Error('Materiallistans totalsumma är för stor.');
  return {...report,rows,totalQuantity,materialQuantity,workQuantity,workRows,totalMinutes:roundedMinutes(totalMinutes),untimedRows,hasEstimates:untimedRows<rows.length,timeManualRows,timeProvidedRows,timeEstimatedRows,timeReviewRows,categoryReviewRows};
 }
 function timeForRow(row,rates,catalog){
  const entry=catalog?.getTime?.(row.catalogCategory,row.product);
  const categoryWarning=clean(catalog?.getCategoryWarning?.(row.catalogCategory,row.product));
  const withWarning=note=>[note,categoryWarning].filter(Boolean).join(' · ');
  if(Object.prototype.hasOwnProperty.call(rates,row.key))return {timePerUnit:rates[row.key],timeOrigin:'manual',timeRequiresReview:false,categoryWarning,timeNote:withWarning('Egen tid i projektet.'),timeLowMinutes:null,timeHighMinutes:null,timeUnit:entry?.unit||'st'};
  if(!entry)return {timePerUnit:null,timeOrigin:'missing',timeRequiresReview:false,categoryWarning,timeNote:withWarning('Ingen föreslagen tid för denna produkt. Ange egen tid.'),timeLowMinutes:null,timeHighMinutes:null,timeUnit:'st'};
  if(!validRate(entry.minutes)||!['provided','estimated'].includes(entry.origin))throw Error('Produktens föreslagna montagetid är ogiltig.');
  const low=entry.lowMinutes??null,high=entry.highMinutes??null;
  if((low!==null||high!==null)&&(!validRate(low)||!validRate(high)||low>entry.minutes||high<entry.minutes))throw Error('Produktens tidsintervall är ogiltigt.');
  const note=[...new Set([entry.note,entry.basis].map(clean).filter(Boolean))].join(' · ');
  return {timePerUnit:entry.minutes,timeOrigin:entry.origin,timeRequiresReview:!!entry.requiresReview,categoryWarning,timeNote:withWarning(note),timeLowMinutes:entry.lowMinutes??null,timeHighMinutes:entry.highMinutes??null,timeUnit:entry.unit||'st'};
 }
 function build(input){
  const D=dataLibrary();if(!D)throw Error('Materialberäkningen kunde inte laddas. Öppna projektet igen.');
  const state=D.validate(input),byDefinition=definitions(D),groups=new Map(),placedCards=new Map(),unresolved=[],excludedCards=[];
  const add=(definition,product,quantity,source,missing=false)=>{
   if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Materialets antal är ogiltigt.');
   const name=clean(product),key=materialKey(definition.id,name);
   if(!groups.has(key))groups.set(key,{key,category:definition.category||definition.component,component:definition.component,catalogCategory:definition.catalogCategory,kind:definition.kind,product:name,quantity:0,sources:[],unresolved:missing});
   const row=groups.get(key);row.quantity+=quantity;row.sources.push(source);
  };
  for(const placement of state.placements){
   const stencil=state.stencils[placement.stencilId];
   if(stencil.kind==='card')placedCards.set(placement.code,(placedCards.get(placement.code)||0)+1);
  }
  for(const [code,count]of placedCards){
   if(!isGSCardCode(code)){excludedCards.push(code);continue;}
   for(const row of state.cards[code].rows){
    if(!present(row.product))continue;
    const definition=byDefinition.get(row.id);
    if(!definition)throw Error('Produktraden '+row.id+' saknar en materialgrupp.');
    const quantity=count*row.quantity*definition.multiplier;
    add(definition,row.product,quantity,{kind:'card',code,rowId:row.id,quantity,placements:count,perPlacement:row.quantity,multiplier:definition.multiplier});
   }
  }
  const rows=[...groups.values()].sort((a,b)=>natural.compare(a.category,b.category)||natural.compare(a.component,b.component)||natural.compare(a.product,b.product));
  const rates=state.preferences.materialTimes||{},catalog=catalogLibrary();
  for(const row of rows)Object.assign(row,timeForRow(row,rates,catalog));
  return summarize({projectName:state.project.name,revision:state.project.revision,updatedAt:state.project.updatedAt,rows,unresolved,excludedCards:excludedCards.sort(natural.compare),unplacedCards:Object.keys(state.cards).filter(code=>isGSCardCode(code)&&!placedCards.has(code)).sort(natural.compare)});
 }
 function sourceText(row){
  const grouped=new Map();for(const source of row.sources||[])grouped.set(source.code,(grouped.get(source.code)||0)+source.quantity);
  return [...grouped].sort(([a],[b])=>natural.compare(a,b)).map(([code,quantity])=>code+': '+quantity).join('; ');
 }
 function checked(report){
  if(!report||!Array.isArray(report.rows)||typeof report.projectName!=='string'||!Array.isArray(report.unresolved)||!Array.isArray(report.unplacedCards)||report.unplacedCards.some(code=>!isGSCardCode(code)))throw Error('Materiallistan är ogiltig.');
  let total=0;
  for(const row of report.rows){
   if(!row||['category','component','product'].some(key=>typeof row[key]!=='string')||!Number.isSafeInteger(row.quantity)||row.quantity<1||!Array.isArray(row.sources))throw Error('En rad i materiallistan är ogiltig.');
   if(row.sources.some(source=>!source||source.kind!=='card'||!isGSCardCode(source.code)||!Number.isSafeInteger(source.quantity)||source.quantity<1)||row.sources.reduce((sum,source)=>sum+source.quantity,0)!==row.quantity)throw Error('Materialradens underlag måste komma från GS-dörrkort och stämma med antalet.');
   const estimated=row.timePerUnit!==null;
   if((estimated&&!validRate(row.timePerUnit))||row.estimated!==estimated||row.timeMinutes!==(estimated?roundedMinutes(row.quantity*row.timePerUnit):null))throw Error('Materialradens tidsberäkning är ogiltig.');
   if(row.timeOrigin!==undefined&&!['manual','provided','estimated','missing'].includes(row.timeOrigin))throw Error('Materialradens tidskälla är ogiltig.');
   if(row.timeOrigin==='missing'&&estimated||['manual','provided','estimated'].includes(row.timeOrigin)&&!estimated)throw Error('Materialradens tidskälla stämmer inte med tiden.');
   if(row.timeRequiresReview!==undefined&&typeof row.timeRequiresReview!=='boolean'||row.timeNote!==undefined&&typeof row.timeNote!=='string')throw Error('Materialradens tidsunderlag är ogiltigt.');
   if(row.categoryWarning!==undefined&&typeof row.categoryWarning!=='string')throw Error('Materialradens kategorikontroll är ogiltig.');
   if(row.kind==='work'&&row.catalogCategory!=='preparation')throw Error('Arbetsmomentets underlag är ogiltigt.');
   if(row.catalogCategory==='preparation'&&row.kind!=='work')throw Error('Ett arbetsmoment får inte räknas som material.');
   total+=row.quantity;
  }
  if(report.totalQuantity!==total)throw Error('Materiallistans totalsumma stämmer inte med raderna.');
  const expected=summarize(report);
  if(report.totalMinutes!==expected.totalMinutes||report.untimedRows!==expected.untimedRows||report.hasEstimates!==expected.hasEstimates)throw Error('Materiallistans tidsumma stämmer inte med raderna.');
  for(const key of ['materialQuantity','workQuantity','workRows','timeManualRows','timeProvidedRows','timeEstimatedRows','timeReviewRows','categoryReviewRows'])if(report[key]!==undefined&&report[key]!==expected[key])throw Error('Materiallistans tidsunderlag stämmer inte med raderna.');
  return report;
 }
 const decimal=value=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:6,useGrouping:false}).format(value);
 function formatDuration(minutes){
  if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<0)throw Error('Tiden måste vara ett positivt tal eller noll.');
  const total=roundedMinutes(minutes),hours=Math.floor(total/60),rest=roundedMinutes(total-hours*60),parts=[];
  if(hours)parts.push(decimal(hours)+' tim');
  if(rest||!hours)parts.push(decimal(rest)+' min');
  return parts.join(' ');
 }
 function timeSummary(report){
  if(!report.rows.length)return 'Inga produkter att tidsberäkna.';
  if(!report.hasEstimates)return 'Tid ej beräknad. Tid per styck saknas för '+report.untimedRows+' produktrader.';
  const total=formatDuration(report.totalMinutes);
  return report.untimedRows?'Delsumma tid: '+total+'. Tid saknas för '+report.untimedRows+' produktrader.':'Total arbetstid: '+total+'.';
 }
 function timeSourceText(row){return row.timeOrigin==='provided'?'Din tidsfil':row.timeOrigin==='estimated'?'Uppskattning':row.timeOrigin==='missing'?'Tid saknas':'Egen tid';}
 function reviewSummary(report){
  const estimated=report.timeEstimatedRows||0,review=report.timeReviewRows||0,category=report.categoryReviewRows||0,notes=[];
  if(estimated)notes.push(estimated+' rader använder uppskattad montagetid för förberett montage.');
  if(review)notes.push(review+' rader behöver kontroll av tid eller paketomfattning (*).');
  if(category)notes.push(category+' rader har fel produktkategori och behöver flyttas till rätt rad (*).');
  return notes.join(' ');
 }
 function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
 function csv(input){
  const report=checked(input),rows=[['Typ','Grupp','Komponent','Produkt','Antal','Underlag (GS, antal)','Tid/st (min)','Tid totalt (min)','Tid/st (timmar och minuter)','Tid totalt (timmar och minuter)','Tidskälla','Kontroll','Tidsunderlag']];
  for(const row of report.rows)rows.push([row.kind==='work'?'Arbetsmoment':'Material',row.category,row.component,row.product,row.quantity,sourceText(row),row.estimated?decimal(row.timePerUnit):'',row.estimated?decimal(row.timeMinutes):'',row.estimated?formatDuration(row.timePerUnit):'',row.estimated?formatDuration(row.timeMinutes):'',timeSourceText(row),row.categoryWarning?'Fel kategori':row.timeRequiresReview?'Kontrollera':'',row.timeNote||'']);
  rows.push(['SUMMA MATERIAL','','','',report.materialQuantity??report.totalQuantity]);
  if(report.workRows)rows.push(['ARBETSMOMENT','','','',report.workQuantity]);
  rows.push(['TOTAL ARBETSTID','','','','','','',report.hasEstimates?decimal(report.totalMinutes):'','',report.hasEstimates?formatDuration(report.totalMinutes):'']);
  rows.push([timeSummary(report)]);
  if(reviewSummary(report))rows.push([reviewSummary(report)]);
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
 }
 async function pdf(input){
  const report=checked(input),lib=pdfLibrary();if(!lib)throw Error('PDF-exporten kunde inte laddas. Öppna projektet igen.');
  const document=await lib.PDFDocument.create(),normal=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold);
  document.setTitle('Material och tid - '+report.projectName);document.setSubject('Material och arbetstid från placerade GS-dörrkort');document.setCreator('Tillsyno Projektering');
  const left=36,right=806,bottom=47,lineHeight=12,fontSize=9,columns=[{x:36,width:100,label:'Grupp'},{x:136,width:200,label:'Produkt'},{x:336,width:40,label:'Antal'},{x:376,width:105,label:'Tid/st'},{x:481,width:120,label:'Tid totalt'},{x:601,width:205,label:'Underlag (antal)'}];
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
  let page,y,pageDataTop;
  function draw(value,x,top,size=fontSize,font=normal,color=ink){page.drawText(safe(value),{x,y:top,size,font,color});}
  function nextPage(){
   page=document.addPage([842,595]);y=558;draw('Material och tid',left,y,20,bold);y-=23;
   for(const label of wrap(report.projectName,right-left,bold,11)){draw(label,left,y,11,bold);y-=14;}
   draw(report.rows.length+' rader · '+(report.materialQuantity??report.totalQuantity)+' st material'+(report.workRows?' · '+report.workRows+' arbetsmomentrader':''),left,y,9,normal,muted);y-=16;
   draw('Endast placerade GS-dörrkort. Armbågskontakter räknas ×2.',left,y,8,normal,muted);y-=15;
   for(const value of wrap(timeSummary(report),right-left,bold,9)){draw(value,left,y,9,bold);y-=13;}
   y-=3;
   page.drawRectangle({x:left,y:y-23,width:right-left,height:23,color:light});
   for(const column of columns)draw(column.label,column.x+5,y-15,8,bold);
   y-=23;pageDataTop=y;
  }
  nextPage();
  if(!report.rows.length){draw('Inga produkter att beställa från de aktuella placeringarna.',left,y-23,10);y-=42;}
  for(const row of report.rows){
   const timeLabel=row.estimated?formatDuration(row.timePerUnit)+(row.timeRequiresReview||row.categoryWarning?' *':''):row.categoryWarning?'*':'';
   const values=[(row.kind==='work'?'Arbetsmoment · ':'')+row.component,row.product,String(row.quantity),timeLabel+(row.estimated?' · '+timeSourceText(row):''),row.estimated?formatDuration(row.timeMinutes):'',sourceText(row)];
   const cells=values.map((value,index)=>wrap(value,columns[index].width-10));
   const max=Math.max(...cells.map(lines=>lines.length));let offset=0;
   if(max*lineHeight+12>y-bottom&&y<pageDataTop)nextPage();
   while(offset<max){
    let capacity=Math.floor((y-bottom-12)/lineHeight);if(capacity<1){nextPage();capacity=Math.floor((y-bottom-12)/lineHeight);}
    const count=Math.min(max-offset,capacity),height=count*lineHeight+12;
    if(row.unresolved)page.drawRectangle({x:left,y:y-height,width:right-left,height,color:lib.rgb(1,.97,.90)});
    for(let index=0;index<cells.length;index++){
     const lines=cells[index].slice(offset,offset+count),column=columns[index];
     for(let j=0;j<lines.length;j++){const value=lines[j];if(index>=2&&index<=4){const width=normal.widthOfTextAtSize(value,fontSize);draw(value,column.x+column.width-7-width,y-15-j*lineHeight);}else draw(value,column.x+5,y-15-j*lineHeight);}
    }
    page.drawLine({start:{x:left,y:y-height},end:{x:right,y:y-height},thickness:.45,color:line});
    y-=height;offset+=count;
   }
  }
  const notes=[];
  notes.push(timeSummary(report));
  if(reviewSummary(report))notes.push(reviewSummary(report));
  if(report.workRows)notes.push('Arbetsmoment ingår i tiden men inte i materialantalet.');
  if(report.unplacedCards.length)notes.push('GS-dörrkort utan placering ingår inte i antalet: '+report.unplacedCards.join(', ')+'.');
  for(const note of notes){for(const value of wrap(note,right-left,normal,8)){if(y<bottom+20)nextPage();draw(value,left,y-18,8,normal,muted);y-=12;}y-=8;}
  const pages=document.getPages();for(let index=0;index<pages.length;index++){
   pages[index].drawText('Sida '+(index+1)+' av '+pages.length,{x:left,y:27,size:8,font:normal,color:muted});
   const stamp='Material '+(report.materialQuantity??report.totalQuantity)+' st';pages[index].drawText(stamp,{x:right-normal.widthOfTextAtSize(stamp,8),y:27,size:8,font:normal,color:muted});
  }
  return new Uint8Array(await document.save());
 }
 return Object.freeze({build,csv,pdf,sourceText,materialKey,summarize,isGSCardCode,formatDuration,timeSourceText,reviewSummary});
});
