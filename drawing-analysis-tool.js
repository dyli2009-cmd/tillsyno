/* One view for whole-file analysis, reviewed duplicates and lossless cleanup. */
(()=>{
 'use strict';
 const app=window.DrawingToolsBridge,analysis=window.DrawingPdfAnalysis,$=id=>document.getElementById(id);
 if(!app||!analysis)return;
 let report=null,source=null,state='',active=false,aborted=false,removals=new Set(),keepers=new Map();
 const bytes=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':n>=1024?(n/1024).toFixed(1)+' KB':Math.round(n)+' B';
 const status=s=>{$('pdfAnalysisStatus').textContent=s;};
 function update(){
  $('pdfAnalyze').disabled=active||!app.getPdf();$('pdfClean').disabled=active||!report||report.signed;
  const n=[...removals].filter(p=>app.getKeptPages().includes(p)).length;
  $('pdfRemoveDuplicates').disabled=active||!report||!n||report.signed;
  $('pdfRemoveDuplicates').textContent='Ta bort valda dubblettsidor'+(n?' ('+n+')':'');
 }
 function clear(message){
  report=null;source=app.getSourceBytes();state=app.getStateKey();removals.clear();keepers.clear();
  $('pdfAnalysisReport').replaceChildren();$('pdfAnalysisReport').hidden=true;$('pdfCleanResult').hidden=true;status(message);update();
 }
 function reset(){clear(app.getPdf()?'Redo att analysera alla sidor i arbetsfilen.':'Öppna en fil och starta analysen.');}
 function changed(){clear('Arbetskopian är ändrad. Analysera igen för en aktuell rapport.');}
 function el(tag,text,css){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(css)n.className=css;return n;}
 function stat(root,label,value){const n=el('div',null,'pdfAnalysisStat');n.append(el('small',label),el('strong',value));root.append(n);}
 function preview(no){const b=el('button','Visa sida '+no);b.type='button';b.dataset.pdfPreview=String(no);b.onclick=()=>void app.showPage(no);return b;}
 function pageGroups(root){
  const list=el('div',null,'pdfDuplicateGroups');
  report.duplicatePages.forEach((pages,index)=>{
   if(!keepers.has(index))keepers.set(index,pages[0]);
   const d=el('details',null,'pdfPageGroup');d.open=true;d.dataset.pdfGroup=String(index);
   d.append(el('summary','Samma PDF-innehåll · sidor '+pages.join(', ')),el('p','Sidinnehåll, resurser, sidmått och stämpeluppgifter är lika. Kontrollera om alla exemplar behövs.','hint'));
   for(const no of pages){
    const row=el('div',null,'pdfDuplicateRow'),label=el('label'),radio=el('input');
    radio.type='radio';radio.name='pdf-keeper-'+index;radio.dataset.pdfKeep=String(no);radio.checked=keepers.get(index)===no;
    label.append(radio,document.createTextNode('Behåll sida '+no));
    const removeLabel=el('label'),check=el('input');check.type='checkbox';check.dataset.pdfRemove=String(no);check.disabled=radio.checked;check.checked=removals.has(no)&&!radio.checked;
    removeLabel.append(check,document.createTextNode('Ta bort'));
    radio.onchange=()=>{keepers.set(index,no);removals.delete(no);render();};check.onchange=()=>{if(check.checked)removals.add(no);else removals.delete(no);update();};
    row.append(label,removeLabel,preview(no));d.append(row);
   }
   list.append(d);
  });root.append(list);
 }
 function render(){
  const root=$('pdfAnalysisReport');root.replaceChildren();root.hidden=!report;if(!report){update();return;}
  const grid=el('div',null,'pdfAnalysisStats');stat(grid,'Arbetsfil',bytes(report.inputBytes));stat(grid,'Sidor kvar',report.selectedPages+' / '+report.totalPages);
  stat(grid,'Oanvänd data, uppskattat',bytes(report.stats.unusedBytes));stat(grid,'Bilddubbletter, uppskattat',bytes(report.images.potentialBytes));root.append(grid);
  const usage=el('details',null,'pdfAnalysisDetails');usage.append(el('summary','Vad tar plats i filen?'));
  for(const [label,n]of [['Bilder',report.stats.imageBytes],['Inbäddade teckensnitt',report.stats.fontBytes],['Bilagor',report.stats.attachmentBytes],['Metadata',report.stats.metadataBytes]])usage.append(el('p',label+': '+bytes(n),'pdfAnalysisLine'));
  usage.append(el('p','Måtten avser lagrade datadelar och är inte en summering av hela filstorleken. Verklig minskning mäts efter rensningen.','hint'));
  report.images.largest.forEach((image,i)=>usage.append(el('p','Stor bild '+(i+1)+': '+image.width+' × '+image.height+' px · '+bytes(image.bytes),'pdfAnalysisLine')));root.append(usage);
  root.append(el('p',report.stats.unusedObjects+' oanvända datadelar · '+report.images.extraCopies+' extra kopior av identiska bilder.','hint'));
  root.append(el('p',report.duplicatePages.length?'Välj vilka dubblettsidor du vill ta bort. Inga sidor väljs automatiskt.':'Inga sidor med exakt samma PDF-innehåll hittades. Visuellt liknande sidor kan ha annan PDF-struktur.','hint'));pageGroups(root);
  const hidden=el('details',null,'pdfAnalysisDetails');hidden.append(el('summary','Dolt innehåll som bevaras'));
  hidden.append(el('p',report.layers.total+' lager, varav '+report.layers.off+' uttryckligen avstängda i standardvyn. '+report.hiddenAnnotations+' dolda markeringar. '+report.widgets+' formulärfält.','pdfAnalysisLine'));
  hidden.append(el('p','Lager, osynlig text, stämplar och bilagor kan behövas för avläsning eller fortsatt arbete. Förlustfri rensning tar inte bort dem. Innehåll bakom vita rutor eller utanför beskärningen räknas inte automatiskt som oanvänt.','hint'));root.append(hidden);
  if(report.unresolved.length)root.append(el('p',report.unresolved.length+' sidor kunde inte jämföras fullständigt och föreslås inte som dubbletter.','pdfAnalysisWarning'));
  if(report.signed)root.append(el('p','Dokumentet är digitalt signerat. Analysen är klar; rensning och sidborttagning är spärrade för att bevara signaturen.','pdfAnalysisWarning'));update();
 }
 function progress(v){$('pdfAnalysisProgress').textContent=v.message||'Arbetar…';const m=$('pdfAnalysisMeter');if(v.total){m.max=v.total;m.value=v.current||0;}else m.removeAttribute('value');}
 function cancel(){aborted=true;$('pdfAnalysisCancel').disabled=true;progress({message:'Avbryter efter pågående PDF-steg…'});}
 async function run(clean){
  if(active||!app.getPdf()||clean&&(!report||report.signed))return;
  if(clean&&(source!==app.getSourceBytes()||state!==app.getStateKey())){changed();return;}
  active=true;aborted=false;update();let result;
  try{
   await app.withBusy(async()=>{
    $('pdfAnalysisTitle').textContent=clean?'Rensar och verifierar PDF':'Analyserar hela PDF';progress({message:'Läser PDF-strukturen…'});$('pdfAnalysisCancel').disabled=false;$('pdfAnalysisDialog').showModal();
    try{const options={cancelled:()=>aborted,onProgress:progress};result=clean?await app.prepareCleanCopy(options):await analysis.analyze(app.getSourceBytes(),{...options,pages:app.getKeptPages().map(p=>p-1)});}
    finally{$('pdfAnalysisDialog').close();}
   });
   if(aborted){status('Avbrutet. Ingen rensad fil har godkänts.');return;}
   if(clean){
    if(!result?.verified)throw Error('Arbetskopian kunde inte verifieras. Originalfilen finns kvar.');
    const before=app.getSourceBytes().length,after=result.bytes.length;$('pdfCleanResult').hidden=false;
    $('pdfCleanResult').textContent=result.original?'Ingen mindre förlustfri fil hittades. Originalets innehåll används.':bytes(before)+' → '+bytes(after)+' · '+bytes(Math.max(0,before-after))+' mindre. Sidinnehåll och dokumentdata verifierade. '+(result.cleanup?.imagesMerged||0)+' bildkopior återanvänds.';
    status('Arbetskopian är kontrollerad. Välj Spara PDF för att spara filen.');
   }else{report=result;source=app.getSourceBytes();state=app.getStateKey();removals.clear();keepers.clear();render();status('Hela arbetsfilen är analyserad. Granska rapporten och välj sedan rensning eller sidborttagning.');}
   $('analysisTools').open=true;app.showTools(true);
  }catch(error){status(error.name==='AbortError'?'Avbrutet. Inga sidor har ändrats.':error.message||'Kunde inte analysera PDF-filen.');app.message($('pdfAnalysisStatus').textContent,error.name!=='AbortError');}
  finally{active=false;update();}
 }
 $('pdfAnalyze').onclick=()=>void run(false);$('pdfClean').onclick=()=>void run(true);$('pdfAnalysisCancel').onclick=cancel;
 $('pdfAnalysisDialog').addEventListener('cancel',e=>{e.preventDefault();cancel();});
 $('pdfRemoveDuplicates').onclick=async()=>{
  const selected=[...removals];if(!selected.length||!report||report.signed)return;
  try{const count=await app.removePages(selected);status(count+' dubblettsidor är bortvalda. Ångra återställer dem. Analysera arbetskopian igen före rensning.');}catch(error){status(error.message||'Kunde inte välja bort sidorna.');}update();
 };
 window.DrawingAnalysisTool=Object.freeze({reset,changed,refresh:update});reset();
})();
