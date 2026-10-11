(() => {
'use strict';
const SMARTMATCH_RELEASE='36.65';
let manualPositions=[],positionEdits={},placement=null;
// Initialize placement pointer eagerly: PDF loading must never encounter a TDZ after another initialization failure.
let pmPointer=null,pmSuppressClickUntil=0;
let smartDAInitialized=false;
const LAB_PREFIX='tillsyno-smartmatch-v35:v1:';
const labStorage={
 getItem:key=>localStorage.getItem(LAB_PREFIX+String(key)),
 setItem:(key,value)=>localStorage.setItem(LAB_PREFIX+String(key),value),
 removeItem:key=>localStorage.removeItem(LAB_PREFIX+String(key))
};
let labManualLinks={},protocolCandidates={},labUnreadableMarks=0,labSourceMarkCount=0,labGraphicsCandidates=0,labGraphicPositions=0,labColorFirstPositions=0,labFallbackPositions=0,labDiagnosticSpot=null,labDiagnosticSequence=0;
let smartDoorCardIndex={},smartDoorCardPages=new Set(),smartScanStats={};
let smartDoorCardFirstRows={},smartCardFirstTextHits=0;
let smartBaseDrawingFile=null,smartAdditionalCardsFile=null,smartImportedCardPages=new Set(),smartImportReport={files:0,pages:0,recognized:0,unrecognized:0};
let scanCardCodes=new Set(),scanPageEligibility=new Map();
// Beteckningar användaren valt att ignorera återkommer inte efter ny PDF-analys.
let ignoredCodes=new Set();
let smartScanAudit={pages:{},reasons:{},annotationCodes:{},colorFirst:0,textColor:0,ocrCandidates:0,ocrAccepted:0,ocrErrors:[]};
let smartPendingOcr=[],smartConfirmedOcr=[],smartOcrWorker=null,smartOcrLibraryPromise=null;

const $=id=>document.getElementById(id);
const el={
 file:$('pwFile'),openProjectEmpty:$('pwOpenProjectEmpty'),saveProject:$('pwSaveProject'),saveMenu:$('pwSaveMenu'),savePortable:$('pwSavePortable'),saveAs:$('pwSaveAs'),saveCopy:$('pwSaveCopy'),saveSelfchecks:$('pwSaveSelfchecks'),fileName:$('pwFileName'),state:$('pwState'),positionCount:$('pwPositionCount'),matchedCount:$('pwMatchedCount'),doneCount:$('pwDoneCount'),totalProgress:$('pwTotalProgress'),
 prev:$('pwPrev'),next:$('pwNext'),pageInfo:$('pwPageInfo'),zoomOut:$('pwZoomOut'),zoomIn:$('pwZoomIn'),zoomInfo:$('pwZoomInfo'),fit:$('pwFit'),bulkSelect:$('pwBulkSelect'),timeReport:$('pwTimeReport'),toolMenuButton:$('pwToolMenuButton'),toolMenu:$('pwToolMenu'),toolText:$('pwToolText'),toolCallout:$('pwToolCallout'),toolArrow:$('pwToolArrow'),toolImage:$('pwToolImage'),toolDelete:$('pwToolDelete'),toolUndo:$('pwToolUndo'),toolRedo:$('pwToolRedo'),imageFile:$('pwImageFile'),
 viewer:$('pwViewer'),stage:$('pwStage'),canvas:$('pwCanvas'),drawingNotes:$('pwDrawingNotes'),selectionRect:$('pwSelectionRect'),markers:$('pwMarkers'),automationMarkers:$('pwAutomationMarkers'),empty:$('pwEmpty'),side:$('pwSide'),showPositions:$('pwShowPositions'),hidePositions:$('pwHidePositions'),groups:$('pwGroups'),currentPageOnly:$('pwCurrentPageOnly'),
 protocol:$('pwProtocol'),back:$('pwBack'),protocolClose:$('pwProtocolClose'),protocolCode:$('pwProtocolCode'),protocolPosition:$('pwProtocolPosition'),protocolPercent:$('pwProtocolPercent'),protocolBar:$('pwProtocolBar'),
 protocolCanvas:$('pwProtocolCanvas'),protocolCanvasWrap:$('pwProtocolCanvasWrap'),protocolStage:$('pwProtocolStage'),protocolGSLayer:$('pwProtocolGSLayer'),protocolShowCard:$('pwProtocolShowCard'),protocolShowGS:$('pwProtocolShowGS'),protocolDetailsToggle:$('pwProtocolDetailsToggle'),protocolMissing:$('pwProtocolMissing'),protocolFit:$('pwProtocolFit'),protocolZoomOut:$('pwProtocolZoomOut'),protocolZoomIn:$('pwProtocolZoomIn'),protocolZoomInfo:$('pwProtocolZoomInfo'),protocolMax:$('pwProtocolMax'),
 checklist:$('pwChecklist'),checklistMeta:$('pwChecklistMeta'),addChecklistItem:$('pwAddChecklistItem'),
 bulkBar:$('pwBulkBar'),bulkCount:$('pwBulkCount'),bulkPage:$('pwBulkPage'),bulkDone:$('pwBulkDone'),bulkClear:$('pwBulkClear'),
 timeDialog:$('pwTimeDialog'),timeClose:$('pwTimeClose'),timeTotal:$('pwTimeTotal'),timeDone:$('pwTimeDone'),timeLeft:$('pwTimeLeft'),timeProgress:$('pwTimeProgress'),timeUnknown:$('pwTimeUnknown'),timeRows:$('pwTimeRows'),timeAddType:$('pwTimeAddType'),timeSummaryText:$('pwTimeSummaryText'),timeTypeEditor:$('pwTimeTypeEditor'),timeTypeTitle:$('pwTimeTypeTitle'),timeTypeClose:$('pwTimeTypeClose'),timeTypeName:$('pwTimeTypeName'),timeTypeMinutes:$('pwTimeTypeMinutes'),timeTypeTerms:$('pwTimeTypeTerms'),timeTypeCancel:$('pwTimeTypeCancel'),timeTypeSave:$('pwTimeTypeSave'),
 automationDialog:$('pwAutomationDialog'),automationClose:$('pwAutomationClose'),automationPreview:$('pwAutomationPreview'),automationIdentity:$('pwAutomationIdentity'),automationModel:$('pwAutomationModel'),automationSerial:$('pwAutomationSerial'),automationId:$('pwAutomationId'),automationLocation:$('pwAutomationLocation'),automationProgress:$('pwAutomationProgress'),automationApproveAll:$('pwAutomationApproveAll'),automationChecks:$('pwAutomationChecks'),automationNotes:$('pwAutomationNotes'),
 projectName:$('pwProjectName'),projectFacility:$('pwProjectFacility'),projectOrder:$('pwProjectOrder'),projectDate:$('pwProjectDate'),projectNextDate:$('pwProjectNextDate'),projectCustomer:$('pwProjectCustomer'),projectAgreement:$('pwProjectAgreement'),projectContact:$('pwProjectContact'),projectPhone:$('pwProjectPhone'),projectAddress:$('pwProjectAddress'),projectPostalCode:$('pwProjectPostalCode'),projectPostalCity:$('pwProjectPostalCity'),projectCompany:$('pwProjectCompany'),projectCompanyContact:$('pwProjectCompanyContact'),projectCompanyPhone:$('pwProjectCompanyPhone'),projectCompanyAddress:$('pwProjectCompanyAddress'),projectCompanyPostalCode:$('pwProjectCompanyPostalCode'),projectCompanyPostalCity:$('pwProjectCompanyPostalCity'),projectTechnician:$('pwProjectTechnician'),projectSignature:$('pwProjectSignature'),projectLogo:$('pwProjectLogo'),projectLogoRemove:$('pwProjectLogoRemove'),projectLogoStatus:$('pwProjectLogoStatus'),projectLogoPreview:$('pwProjectLogoPreview'),
 automationPreviewDialog:$('pwAutomationPreviewDialog'),automationPreviewClose:$('pwAutomationPreviewClose'),automationPreviewTitle:$('pwAutomationPreviewTitle'),automationPreviewWrap:$('pwAutomationPreviewWrap'),automationPreviewCanvas:$('pwAutomationPreviewCanvas'),
 selfcheckExportDialog:$('pwSelfcheckExportDialog'),selfcheckExportClose:$('pwSelfcheckExportClose'),selfcheckSelectAll:$('pwSelfcheckSelectAll'),selfcheckSelectDone:$('pwSelfcheckSelectDone'),selfcheckExportList:$('pwSelfcheckExportList'),selfcheckExportCount:$('pwSelfcheckExportCount'),selfcheckExportCreate:$('pwSelfcheckExportCreate'),
 itemEditor:$('pwItemEditor'),itemEditorTitle:$('pwItemEditorTitle'),itemEditorClose:$('pwItemEditorClose'),editLabel:$('pwEditLabel'),editValue:$('pwEditValue'),editMinutes:$('pwEditMinutes'),editNote:$('pwEditNote'),editCancel:$('pwEditCancel'),editSave:$('pwEditSave')
};

if(!window.pdfjsLib||!window.PDFLib){el.state.textContent='PDF-biblioteket kunde inte laddas.';return}
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';

const ctx=el.canvas.getContext('2d');
const protocolCtx=el.protocolCanvas.getContext('2d');

let scanOriginalPageCount=0;
let pdf=null,bytes=null,fileKey='',projectId='',currentFileName='Tillsyno-projekt.pdf',currentFileHandle=null,embeddedState={},page=1,scale=1.1,renderTask=null;
let smartProjectTimeConfig=null,smartWorkspaceDirty=false;
let drawingDetailTimer=null,drawingDetailTask=null,drawingDetailVersion=0,drawingDetailKey="";
let drawingRenderVersion=0,drawingRenderQueue=Promise.resolve(),drawingRaster=null;
let drawingActivePdfPage=null; // Retain just the current page for fast repeated zoom.
let drawingOptionalContentPromise=null; // Hide exported status text in work view only.
let workspacePdfForDisplay=null; // Copy stripped of SmartMatch export badges; original bytes remain intact.
// Restrict temporary canvas allocations on iOS to reduce browser memory reloads.
const DRAWING_IS_MOBILE=(navigator.maxTouchPoints||0)>0&&Math.min(window.innerWidth||9999,window.screen?.width||9999)<=1024;
const DRAWING_IS_PHONE=DRAWING_IS_MOBILE&&(/iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent||'')||Math.min(window.screen?.width||9999,window.screen?.height||9999)<=600);
const DRAWING_MAX_PIXELS=DRAWING_IS_PHONE?900000:DRAWING_IS_MOBILE?1800000:4000000,DRAWING_MAX_SIDE=DRAWING_IS_MOBILE?3400:4096;
let drawingPan=null,drawingTouch=null,drawingWheelTimer=null,drawingWheelBaseScale=1,drawingWheelTargetScale=1,drawingWheelFocus=null;
let drawingTool='',drawingToolGesture=null,drawingNotes=[],drawingViewport=null,drawingNoteDrag=null,selectedDrawingNoteId='',drawingUndoStack=[],drawingRedoStack=[],pendingImage=null,inlineNoteDraft=null;
let bulkSelectMode=false,bulkSelected=new Set(),bulkDrag=null;
let stamps=[],projectStamps=[],instances=[],protocolMap={},pageTexts={},drawingPageLevels={},protocolDefs={},automationItems=[],selectedAutomationId='',focusedAutomationId='',projectMeta={},projectLogoData='',automationPreviewPdf=null,automationPreviewRenderTask=null;
let selectedId=null,protocolScale=1,protocolRenderTask=null,protocolRenderVersion=0,protocolGesture=null,currentOnly=false,restoreView=null,editingItem=null,editingTimeTypeKey=null;

/* v36.8: Live PDF/GS bridge is exposed before any asynchronous scan,
   so Koppla dörrautomatik cannot lose its document when optional init fails. */
window.SmartMatchAppBridge={
 normalizeExportPdfName,requestAction:requestSmartAction,
 getPdf:()=>pdf,getPage:()=>page,getScale:()=>scale,getPositions:()=>instances,getItems:()=>automationItems,
 getModels:()=>PROJECT_AUTOMATION_MODELS,getDrawingLimit:()=>scanPageLimit(),readPageText,
 getDoorCardIndex:()=>smartDoorCardIndex,getDoorCardPages:()=>[...smartDoorCardPages],
 getDoorCardMapping:()=>protocolMap,
 groupRows:groupTextRowsForAutomation,itemsForText:itemsForStructuredAutomationId,
 rectForItems:rectForTextItems,viewportRect,looksLikeProtocol:looksLikeAutomationProtocolPage,
 addItem:(o,render=true)=>{automationItems.push(o);if(render){save();renderAutomationMarkers();renderGroups()}},
 save,redraw:()=>{renderAutomationMarkers();renderGroups()},setStatus:setState,
 openRevision:openAutomationProtocol,closeRevision:closeAutomationProtocol,
 selectedRevision:()=>selectedAutomation(),
 exportRevision:exportSingleAutomationRevision,
 getRevisionPdf:o=>createAutomationSelfcheckPdf(o),getProjectMeta:()=>projectMeta,
 getOriginalPdfBytes:()=>bytes,hasUnsavedChanges:()=>smartWorkspaceDirty,
 snapshotForLocalArchive:()=>{
  if(!pdf||!fileKey)return false;
  // Always archive the CURRENT in-memory checks, even after a prior PDF save
  // cleared the ordinary autosave draft. The original loaded PDF may be older.
  window.SmartMatchSession?.queueDraft?.({hash:fileKey,baseRevision:Number(embeddedState?.projectRevision)||0,payload:makeProjectPayload()});
  return true;
 },
 getLocalView:()=>({fileKey,page,scale,drawingCardOpen,automationGroupOpen,currentOnly,scrollLeft:el.viewer.scrollLeft,scrollTop:el.viewer.scrollTop,sideScroll:el.side.scrollTop,revisionId:el.automationDialog.open?selectedAutomationId:''}),
 openCachedPdf:async (file,view)=>{
  smartBaseDrawingFile=file;smartAdditionalCardsFile=null;currentFileHandle=null;
  await analyze(file,{cachedResume:true,localArchive:!!view?.localArchive});
  if(!view||view.fileKey!==fileKey)return;
  await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
  await new Promise(done=>setTimeout(done,100));
  page=Math.max(1,Math.min(pdf.numPages,Number(view.page)||1));
  scale=Math.max(.25,Math.min(5,Number(view.scale)||1.1));
  drawingCardOpen=!!view.drawingCardOpen;automationGroupOpen=!!view.automationGroupOpen;currentOnly=!!view.currentOnly;
  el.currentPageOnly.setAttribute('aria-pressed',String(currentOnly));
  el.currentPageOnly.classList.toggle('active',currentOnly);
  await renderDrawing();renderGroups();
  el.viewer.scrollLeft=Number(view.scrollLeft)||0;el.viewer.scrollTop=Number(view.scrollTop)||0;
  el.side.scrollTop=Number(view.sideScroll)||0;
  const item=automationItems.find(x=>x.id===view.revisionId);
  if(item)openAutomationProtocol(item);
 },
 locate:async o=>{
  if(!pdf||!o)return;
  if(page!==o.page){page=o.page;await renderDrawing()}
  const p=await pdf.getPage(o.page),v=p.getViewport({scale}),r=viewportRect(v,o.rect);
  el.viewer.scrollTo({left:Math.max(0,r.left+r.width/2-el.viewer.clientWidth/2),
   top:Math.max(0,r.top+r.height/2-el.viewer.clientHeight/2),behavior:'smooth'});
 }
};


const PROJECT_AUTOMATION_ENABLED=true;

const PROJECT_AUTOMATION_CHECKS=[
 ['1.1','Samtal med nyttjaren.'],
 ['1.2','Okulärbesiktning av dörrautomatik/dörrmiljö.'],
 ['1.3','Kontroll av eventuella ombyggnader.'],
 ['1.4','Kontroll fastsättning, infästning och eventuella efterdragningar av skruvar.'],
 ['1.5','Funktionskontroll manuell och automatisk öppning (kraft, dämpning & hastighet).'],
 ['1.6','Funktionskontroll manuell och automatisk stängning (kraft, dämpning & hastighet).'],
 ['1.7','Funktionskontroll öppnings- & stängningstider.'],
 ['1.8','Funktionskontroll av nödöppning & utrymning.'],
 ['1.9','Funktionskontroll/justering koordinator och armsystem.'],
 ['1.10','Funktionskontroll impulsgivare (radar, armbågskontakter etc).'],
 ['1.11','Sensorlister och säkerhetsanordningar.'],
 ['1.12','Funktionskontroll låsfunktioner (dörrblad, elslutbleck, motorlås, ellås, låshus).'],
 ['1.13','Kontroll/justering uppställningsmagnet & dörrstopp.'],
 ['1.14','Kontroll gummiupphängningar, fjädrar, tryckslangar & tätning.'],
 ['1.15','Kontroll motor, pump, hydraulik och drivaxel.'],
 ['1.16','Kontroll säkringar / programväljare / styrmodul.'],
 ['1.17','Behovsrengöring dörrautomatik och sensorlister.'],
 ['1.18','Mindre justering.']
];
const PROJECT_AUTOMATION_FAULTS={
 '1.1':['Nyttjaren uppger återkommande driftstörning','Nyttjaren uppger avvikande funktion','Användning eller förutsättningar har ändrats'],
 '1.2':['Skada/slitage i dörrmiljön','Lösa eller skadade delar','Dörrblad/karm behöver justeras'],
 '1.3':['Ombyggnad påverkar dörrmiljön','Ändrad dörrmiljö kräver ny riskbedömning','Ny eller ändrad utrustning behöver kontrolleras'],
 '1.4':['Infästning lös, efterdragning krävs','Skruvar saknas/lösa','Automatikhus/arm sitter löst'],
 '1.5':['För hög öppningskraft','Fel öppningshastighet','Dämpning behöver justeras','Dörr öppnar inte fullt'],
 '1.6':['För hög stängningskraft','Fel stängningshastighet','Dämpning behöver justeras','Dörr stänger inte helt'],
 '1.7':['Öppningstid behöver justeras','Stängningstid behöver justeras','Öppethållandetid behöver justeras'],
 '1.8':['Nödöppning fungerar ej','Utrymningsfunktion behöver åtgärdas'],
 '1.9':['Armsystem behöver justeras','Koordinator fungerar ej korrekt','Glapp/slitage i armsystem'],
 '1.10':['Radar/impulsgivare fungerar ej','Armbågskontakt fungerar ej','Impulsgivare behöver justeras'],
 '1.11':['Säkerhetssensor saknas, komplettera enligt SS-EN 16005 och aktuell riskbedömning','Klämskydd saknas, komplettera enligt SS-EN 16005 där aktuell riskbedömning visar klämrisk','Säkerhetssensor/sensorlist fungerar ej','Säkerhetssensor täcker inte riskområdet','Klämskydd saknas eller är otillräckligt','Komplettera med säkerhetssensor eller klämskydd'],
 '1.12':['Elslutbleck fungerar ej korrekt','Lås släpper för sent/kort tid','Motorlås/ellås fungerar ej','Dörr/lås behöver justeras'],
 '1.13':['Dörrstopp saknas, komplettera med dörrstopp för att begränsa öppningsvinkeln till 90° där detta är angiven maxvinkel för aktuell automatik/installation','Dörrstopp saknas eller är felplacerat','Dörr öppnar för långt / fel öppningsvinkel','Uppställningsmagnet fungerar ej','Arm eller drivaxel belastas i öppet ändläge','Dörrstopp/öppningsvinkel behöver justeras enligt tillverkarens anvisning'],
 '1.14':['Gummiupphängning sliten','Fjäder behöver bytas/justeras','Tryckslang/tätning behöver åtgärdas'],
 '1.15':['Motor missljud/slitage','Pump/hydraulik läcker','Drivaxel glapp/slitage'],
 '1.16':['Programväljare fungerar ej','Styrmodul fel','Säkring/strömförsörjning behöver åtgärdas'],
 '1.17':['Rengöring av automatik krävs','Rengöring av sensor/sensorlist krävs'],
 '1.18':['Mindre justering utförd','Ytterligare justering krävs']
};
const PROJECT_AUTOMATION_MODELS=[
 ['11','Geze EMD standardarm'],['12','Geze EMD glidarm'],['13','Faac standard'],['14','Faac glidarm'],
 ['15','Besam Powerswing'],['16','Besam SW100'],['17','Dorma ED 200'],['18','Tormax'],['19','Record standardarm'],
 ['20','Powerswing pardörr'],['21','Geze TSA 160'],['22','Record glidarm'],['23','Gilgen FDC'],['24','Dorma ED 100'],
 ['25','Besam SDE'],['26','Ditec hissmonterad'],['27','SR 2000'],['28','OVE'],['29','Dorma CD 80'],
 ['30','Cibes hissöppnare'],['31','Geze TSA 160 dubbeldörr'],['32','Dorma ED 180'],['33','Geze EC Turn'],
 ['34','Besam DHE'],['35','Entramatic PLS 100'],['36','Entramatic PLS 150'],['37','Dorma ED 250'],
 ['38','Geze Powerdrive skjutdörr'],['39','Geze EC Drive skjutdörr'],['40','Geze SL skjutdörr'],
 ['41','Faac 930 skjutdörr'],['42','Faac A140 skjutdörr'],['43','Dorma TS 93 + brandstängning'],
 ['44','Dorma TS 93'],['45','Entramatic SW 300'],['46','Unislide dubbel flyglig'],['47','Unislide enkel flyglig'],
 ['48','Entramatic SL500']
];

let smartScanActive=false;

// SmartMatch TEST v36.26: real completed scan milestones, no fake timer.
let smartLoadPct=0,smartLoadStage='';
// Short, good-natured colleague humour. Each stage has several alternatives,
// chosen without immediately repeating the same line on the next PDF open.
// During lengthy PDF rasterization the joke changes, not the actual percent.
// Separate pools: short banter for normal scanning, slightly longer jokes
// when one heavy PDF page has stopped the real percentage for 12+ seconds.
// Every line is consumed at most once per scan, including stage changes.
const smartLoadShortQuips=[
 'Kaffet först. Grovjobbet tar jag. ☕',
 'Jag jobbar. Du ser upptagen ut. 😉',
 'Chefen frågar? Säg att vi skannar.',
 'En dörr i taget, tack!',
 'Det där var ingen liten ritning.',
 'Jaha. Alla dörrar skulle med?',
 'Här fanns jobb till måndag också.',
 'Jag har börjat. Din tur sen.',
 'Lugn. Jag hittar ut till slut.',
 'Vi tar korridoren först. 😎',
 'En kaffe till hade suttit fint.',
 'Säg till när det är fikarast.',
 'Nu blir det ordning i pärmen.',
 'Jag hoppas du har laddaren nära.',
 'Ritningen vann första ronden.',
 'Jodå. Jag har läst värre.',
 'Håll ställningarna. Jag räknar.',
 'Det här kallar jag teamwork.',
 'Du pekar. Jag gör resten.',
 'Har vi fått betalt för detta?',
 'Här var det fullt hus!',
 'Jag vill också ha OB-tillägg.',
 'Många dörrar. Samma tålamod.',
 'Rör inte kaffet. Det är mitt.',
 'Det är lugnt. Jag svettas bara digitalt.',
 'Undrar vem som tappade bort nyckeln.',
 'Ingen panik. Jag har extranyckeln.',
 'Går den här ritningen på övertid?',
 'En dörr till, sen rast.',
 'Jag söker. Du får ta äran.',
 'Det här blir en fin arbetsdag.',
 'Jag har koll. För det mesta.',
 'Lita på mig. Lite grann. 😅',
 'Hoppas chefen inte klockar detta.',
 'Vi kör på. Fikat får vänta.',
 'Någon beställde visst extra arbete.',
 'Pärmar? Nej tack, jag skannar.',
 'Jaha, ännu en dörr!',
 'Glöm inte att andas mellan kaffet.',
 'Det är inte jag som ritade detta.',
 'Jag öppnar dörren till ordning.',
 'Du kan sträcka på benen.',
 'Vad är det här, ett helt slott?',
 'Vi tar det snyggt och prydligt.',
 'Samma ritning, nya äventyr.',
 'Ritningen är stor. Humöret större.',
 'Det här får bli dagens träningspass.',
 'Snart klart. Håll mössan!',
 'Den här dörren får vänta på sin tur.',
 'Jag sorterar. Du kan se viktig ut.',
 'Jag jobbar tyst. Nästan. 😂',
 'Lite mindre papper, tack!',
 'Det knakar inte. Det bara laddar.',
 'Jag har nog hittat kaffemaskinen.',
 'Sista biten. Ingen genväg behövs.',
 'Bara några dörrar kvar. Typ.',
 'Har du sett min skruvmejsel?',
 'Jag föredrar dörrar som samarbetar.',
 'Kan vi fakturera väntetiden?',
 'Den här byggnaden tar aldrig slut!'
];
const smartLoadLongQuips=[
 'Den här ritningen har fler dörrar än jag har ursäkter för en lång fikarast. 😂',
 'Om chefen frågar varför du står still: säg att du övervakar en mycket avancerad maskin.',
 'Jag har gått vilse bland dörrarna. Men jag vägrar fråga efter vägen.',
 'Jag hade tänkt bli klar snabbt. Ritningen hade tydligen andra planer.',
 'Jag hittade en korridor till. Vem har nyckeln till fikarummet?',
 'Det var tänkt som en snabb skanning. Någon glömde säga det till PDF:en.',
 'Jag sorterar hundra dörrar medan du sitter där och ser arbetsledande ut. 😎',
 'Nu har jag öppnat så många dörrar att jag borde få egen huvudnyckel.',
 'Ingen fara. Jag har bara fastnat i ett väldigt långt byggmöte med ritningen.',
 'Ritningen säger att det finns fler dörrar. Jag säger att vi behöver mer kaffe.',
 'Den här sidan är tung. Jag skulle be om bärhjälp, men du sitter ju bekvämt.',
 'Fortsätter det så här behöver jag både matlåda och övernattningsrum i servern.',
 'Jag lovade att fixa ritningen. Jag lovade faktiskt aldrig hur fort. 😉',
 'Vi har gjort det svåra förr. Det här är bara fler dörrar per kvadratmeter.',
 'Jag försöker hitta utgången ur PDF:en. Det verkar vara låst från insidan.',
 'Tålamod, kollegan. Snart är det din tur att låtsas att allt gick supersnabbt.',
 'Jag har bläddrat så mycket att jag snart behöver arbetshandskar för tangentbordet.',
 'Den här byggnaden borde säljas med en karta. Tur att det är precis vad vi gör.',
 'Jag trodde det var ett dörrkort. Det visade sig vara en hel roman.',
 'Just nu gör jag grovjobbet. Du får stå för den snygga signaturen efteråt.',
 'Om du kokar mer kaffe hinner jag nog få med ännu en korridor.',
 'Det är sådana här ritningar som får en skrivare att säga upp sig.',
 'Någon ritade visst dörrar som hobby. Jag får sortera resultaten.',
 'Jag borde få friskvårdsbidrag för all digital trappspringning i den här byggnaden.'
];
let smartLoadJokeTimer=null,smartLoadJokeAt=0,smartLoadPctChangedAt=0,
    smartLoadUsedJokes=new Set(),smartLoadRecentJokes=[],
    smartLoadLastJoke='';
function smartLoadReadRecent(){
 try{
  const list=JSON.parse(sessionStorage.getItem('smartmatch-test-recent-jokes')||'[]');
  return Array.isArray(list)?list.filter(s=>typeof s==='string').slice(-18):[];
 }catch(_){return []}
}
function smartLoadSaveRecent(text){
 smartLoadRecentJokes.push(text);
 smartLoadRecentJokes=smartLoadRecentJokes.slice(-18);
 try{sessionStorage.setItem('smartmatch-test-recent-jokes',JSON.stringify(smartLoadRecentJokes))}catch(_){}
}
function smartLoadChooseJoke(now=performance.now()){
 const stalled=smartLoadPct<100&&now-smartLoadPctChangedAt>=12000;
 const pools=stalled?[smartLoadLongQuips,smartLoadShortQuips]:[smartLoadShortQuips,smartLoadLongQuips];
 // Never repeat a joke in this scan. Avoid recent jokes from prior scans
 // unless only unseen-but-recent choices remain.
 const fresh=pools.map(pool=>pool.filter(s=>!smartLoadUsedJokes.has(s)&&!smartLoadRecentJokes.includes(s)));
 const unused=pools.map(pool=>pool.filter(s=>!smartLoadUsedJokes.has(s)));
 const pool=fresh.find(x=>x.length)||unused.find(x=>x.length);
 if(!pool||!pool.length)return; // exhausted: keep the final text rather than repeat.
 const joke=pool[Math.floor(Math.random()*pool.length)];
 smartLoadUsedJokes.add(joke);smartLoadLastJoke=joke;
 smartLoadSaveRecent(joke);
 smartLoadJokeAt=now;
 const node=document.getElementById('pwScanProgressJoke');
 if(node)node.textContent=joke;
}
function smartLoadProgress(percent,label=''){
 if(!smartScanActive)return;
 const previous=smartLoadPct;
 smartLoadPct=Math.max(smartLoadPct,Math.min(100,Math.floor(Number(percent)||0)));
 if(smartLoadPct>previous)smartLoadPctChangedAt=performance.now();
 if(label)smartLoadStage=label;
 const overlay=document.getElementById('pwScanOverlay');
 if(overlay)overlay.hidden=false;
 const n=document.getElementById('pwScanPercentage');
 if(n)n.textContent=smartLoadPct+'%';
 const bar=document.getElementById('pwScanProgressBar');
 if(bar)bar.style.width=smartLoadPct+'%';
 const track=document.getElementById('pwScanProgressTrack');
 if(track)track.setAttribute('aria-valuenow',String(smartLoadPct));
 const phase=document.getElementById('pwScanProgressPhase');
 if(phase)phase.textContent=smartLoadStage||'Förbereder PDF';
 if(!smartLoadLastJoke)smartLoadChooseJoke();
 const mini=document.getElementById('pwScanText');
 if(mini)mini.textContent=(smartLoadStage||'Skannar PDF')+' · '+smartLoadPct+'%';
}
function smartLoadStart(){
 smartLoadPct=0;smartLoadStage='';
 smartLoadUsedJokes=new Set();smartLoadLastJoke='';
 smartLoadRecentJokes=smartLoadReadRecent();
 smartLoadPctChangedAt=performance.now();smartLoadJokeAt=0;
 if(smartLoadJokeTimer!==null){clearInterval(smartLoadJokeTimer);smartLoadJokeTimer=null}
 document.body.classList.add('pwIsScanning');
 smartLoadProgress(0,'Öppnar PDF');
 // Rotate the colleague jokes while the scanner works; no ETA guesses.
 smartLoadJokeTimer=setInterval(()=>{
  if(!smartScanActive)return;
  const now=performance.now();
  if(smartLoadPct<100&&now-smartLoadJokeAt>=6000)smartLoadChooseJoke(now);
 },1000);
}
function smartLoadStop(){
 if(smartLoadJokeTimer!==null){clearInterval(smartLoadJokeTimer);smartLoadJokeTimer=null}
 const overlay=document.getElementById('pwScanOverlay');if(overlay)overlay.hidden=true;
 document.body.classList.remove('pwIsScanning');
}

function updateSmartScanStatus(text){
 const status=document.getElementById('pwScanStatus');
 const label=document.getElementById('pwScanText');
 if(!status||!label)return;
 status.hidden=!smartScanActive;
 if(!smartScanActive)return;
 const message=String(text||'');
 // Detailed scanned page numbers are still kept in the internal status,
 // but the visible header only shows the scanning phase. Page controls are below.
 let stage='Skannar PDF';
 if(/dörrkortens|dörrkort/i.test(message))stage='Skannar dörrkort';
 else if(/färg|ritning|markeringar|positioner/i.test(message))stage='Skannar ritning';
 label.textContent=(smartLoadStage||stage)+' · '+smartLoadPct+'%';
}
function setState(text){
 el.state.textContent=text;
 if(smartScanActive)updateSmartScanStatus(text);
}
function setPositionsHidden(hidden){
 const isHidden=!!hidden;
 el.side.hidden=isHidden;
 el.showPositions.hidden=!isHidden;
 document.querySelector('.pwMain')?.classList.toggle('sideCollapsed',isHidden);
 try{labStorage.setItem('tillsyno-project-positions-hidden',isHidden?'1':'0')}catch(_){}
}
function loadPositionsPreference(){
 let hidden=!DRAWING_IS_MOBILE;
 try{hidden=!DRAWING_IS_MOBILE||labStorage.getItem('tillsyno-project-positions-hidden')==='1'}catch(_){}
 setPositionsHidden(hidden);
}
function closeSaveMenu(){
 el.saveMenu.hidden=true;
 el.saveProject.setAttribute('aria-expanded','false');
}
function toggleSaveMenu(){
 if(el.saveProject.disabled)return;
 const open=el.saveMenu.hidden;
 el.saveMenu.hidden=!open;
 el.saveProject.setAttribute('aria-expanded',String(open));
}
function isNativeIos(){
 try{return !!window.Capacitor?.isNativePlatform?.()&&window.Capacitor?.getPlatform?.()==='ios'}catch(_){return false}
}
function nativeFilePickerAvailable(){
 try{return isNativeIos()&&!!window.Capacitor?.isPluginAvailable?.('FilePicker')}catch(_){return false}
}
function getNativeFilePicker(){
 if(!nativeFilePickerAvailable())return null;
 try{
  if(window.Capacitor?.registerPlugin)return window.Capacitor.registerPlugin('FilePicker');
  return window.Capacitor?.Plugins?.FilePicker||null;
 }catch(_){return null}
}
async function blobFromPickedFile(picked){
 if(picked?.blob)return picked.blob;
 const urls=[];
 if(picked?.webPath)urls.push(picked.webPath);
 if(picked?.path){
  try{urls.push(window.Capacitor?.convertFileSrc?.(picked.path)||picked.path)}catch(_){urls.push(picked.path)}
 }
 let lastError=null;
 for(const url of [...new Set(urls.filter(Boolean))]){
  try{
   const response=await fetch(url);
   if(response.ok)return await response.blob();
   lastError=new Error('Filåtkomst gav status '+response.status+'.');
  }catch(err){lastError=err}
 }
 throw lastError||new Error('Den valda PDF-filen kunde inte läsas av appen.');
}
function desktopOpenPickerAvailable(){
 return !isNativeIos()&&typeof window.showOpenFilePicker==='function';
}
function desktopSavePickerAvailable(){
 return !isNativeIos()&&typeof window.showSaveFilePicker==='function';
}
const PDF_FILE_PICKER_TYPES=[{description:'PDF-filer',accept:{'application/pdf':['.pdf']}}];
function reportProjectOpenError(err,name=''){
 console.error('[SmartMatch TEST v36] PDF-inläsningen avbröts',name,err);
 const detail=String(err?.message||err||'Okänt fel').slice(0,600);
 setState('Kunde inte läsa ritningen'+(name?' '+name:'')+': '+detail);
 // Make the actual error visible on iPhone/iPad too, rather than appearing
 // to be a second request to pick the same file.
 window.alert('SmartMatch kunde inte öppna ritningen.\n\n'+detail+'\n\nFilväljaren öppnas inte igen automatiskt.');
}
async function openProjectPdf(){
 if(!isNativeIos()){
  if(desktopOpenPickerAvailable()){
   let file=null,handle=null,selectionSucceeded=false;
   setState('Öppnar filväljare…');
   try{
    const handles=await window.showOpenFilePicker({multiple:false,types:PDF_FILE_PICKER_TYPES});
    handle=handles?.[0];if(!handle){setState('Ingen fil vald.');return}
    selectionSucceeded=true;
    file=await handle.getFile();
   }catch(err){
    if(err?.name==='AbortError'){setState('Ingen fil vald.');return}
    if(selectionSucceeded){reportProjectOpenError(err,handle?.name||'');return}
    console.warn('[SmartMatch] Datorns filväljare kunde inte användas',err);
    setState('Öppnar vanlig filväljare…');
   }
   if(file){
    smartBaseDrawingFile=file;smartAdditionalCardsFile=null;
    currentFileHandle=handle;
    try{await analyze(file)}catch(err){reportProjectOpenError(err,file.name)}
    return;
   }
  }
  currentFileHandle=null;
  el.file.value='';
  el.file.click();
  return;
 }
 currentFileHandle=null;
 if(!nativeFilePickerAvailable()){
  setState('Öppnar vanlig filväljare…');
  el.file.value='';
  el.file.click();
  return;
 }
 const picker=getNativeFilePicker();
 setState('Öppnar Filer…');
 let file=null;
 try{
  const result=await picker.pickFiles({types:['application/pdf'],limit:1,readData:false});
  const picked=result?.files?.[0];
  if(!picked){setState('Ingen fil vald.');return}
  setState('PDF vald: '+(picked.name||'Projekt.pdf')+' · läser filen…');
  const blob=await blobFromPickedFile(picked);
  file=new File([blob],picked.name||'Projekt.pdf',{type:picked.mimeType||blob.type||'application/pdf',lastModified:picked.modifiedAt||Date.now()});
 }catch(err){
  if(/cancel|dismiss|avbr/i.test(String(err?.message||''))){setState('Ingen fil vald.');return}
  reportProjectOpenError(err);
  return;
 }
 smartBaseDrawingFile=file;smartAdditionalCardsFile=null;
 try{await analyze(file)}catch(err){reportProjectOpenError(err,file.name)}
}
function hashBytes(arr){let h=2166136261;const step=Math.max(1,Math.floor(arr.length/50000));for(let i=0;i<arr.length;i+=step){h^=arr[i];h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function storageKey(){return 'smartmatch-v35:'+(projectId||fileKey)}
function stateTime(s){const t=Date.parse(String(s?.updatedAt||''));return Number.isFinite(t)?t:0}
function localProjectDate(){const d=new Date(),local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function defaultProjectMeta(){return {projectName:'',facilityNo:'',order:'',date:localProjectDate(),nextDate:'',customer:'',agreement:'',contact:'',phone:'',address:'',postalCode:'',postalCity:'',company:'',companyContact:'',companyPhone:'',companyAddress:'',companyPostalCode:'',companyPostalCity:'',technician:'',signature:''}}
function normalizeProjectMeta(value){return {...defaultProjectMeta(),...(value&&typeof value==='object'?value:{})}}
// A full ID includes its model and serial at the end. Strip those two
// components rather than guessing a fixed character length. Never overwrite
// a facility number entered by the technician.
function inferredAutomationFacility(o){
 const obj=String(o?.objectNo||'').trim().replace(/[–—]/g,'-').replace(/\s*-\s*/g,'-');
 if(obj&&/^[A-Za-z0-9ÅÄÖåäö]+(?:-[A-Za-z0-9ÅÄÖåäö]+)*$/.test(obj))return obj;
 const id=String(o?.sourceText||'').trim().replace(/[–—]/g,'-').replace(/\s*-\s*/g,'-');
 const parts=id.split('-').filter(Boolean);
 return parts.length>=3?parts.slice(0,-2).join('-'):'';
}


function makeProjectPayload(){
 automationItems.forEach(o=>window.SmartMatchDALink?.getLinkedPosition?.(o));
 const payload={manualPositions:manualPositions.map(o=>({...o,rect:[...o.rect]})),positionEdits:JSON.parse(JSON.stringify(positionEdits)),ignoredCodes:[...ignoredCodes],labManualLinks:{...labManualLinks},schema:6,projectRevision:Math.max(0,Number(embeddedState?.projectRevision)||0)+1,timeConfig:JSON.parse(JSON.stringify(smartProjectTimeConfig||{})),projectId:projectId||('pf-'+fileKey),updatedAt:new Date().toISOString(),sourceName:currentFileName,drawingNotes:drawingNotes.map(n=>({...n})),projectMeta:normalizeProjectMeta(projectMeta),projectLogoData:projectLogoData||'',ocrConfirmed:smartConfirmedOcr.map(o=>({page:o.page,code:o.code,rect:[...o.rect],confidence:o.confidence||0})),automationItems:automationItems.map(o=>({
  id:o.id,page:o.page,rect:Array.isArray(o.rect)?[...o.rect]:o.rect,objectNo:o.objectNo||'',modelCode:o.modelCode||'',model:o.model||'',serialNumber:o.serialNumber||'',location:o.location||'',sourceText:o.sourceText||'',sourceKind:o.sourceKind||'',linkedGsId:o.linkedGsId||'',linkedGsCode:o.linkedGsCode||'',linkedGsRect:Array.isArray(o.linkedGsRect)?o.linkedGsRect.slice():null,gsLinkDismissed:!!o.gsLinkDismissed,arrowTip:o.arrowTip||null,daArrowTip:o.daArrowTip||null,slrDocuments:o.slrDocuments||{},checks:o.checks||{},notes:o.notes||'',progress:Number(o.progress||0)
 })),instances:{}};
 instances.forEach(o=>payload.instances[o.id]={
  checks:o.checks||{},rowStages:o.rowStages||{},progress:o.progress||0,overrides:o.overrides||{},customItems:o.customItems||[]
 });
 return payload;
}
function loadSaved(){
 // PDF data alone: never merge browser-local projects, even if empty.
 return embeddedState&&typeof embeddedState==='object'?embeddedState:{};
}
function save(){
 if(!fileKey)return;
 const payload=makeProjectPayload();
 if(!smartScanActive){
  smartWorkspaceDirty=true;
  window.SmartMatchSession?.queueDraft?.({hash:fileKey,baseRevision:Number(embeddedState?.projectRevision)||0,payload});
 }
 return payload;
}

/* Never show project-PDF status stamps over the technician's workspace.
   v36.35 hid its new optional-content layer, but older SM35 FreeText
   annotations are always visible in some PDF readers, including PDF.js.
   Remove only our generated stamps from a DISPLAY COPY of the PDF.
   The original bytes and the saved project metadata are never modified. */
async function smartMakeCleanWorkspaceDrawing(doc){
 const {PDFName,PDFArray}=PDFLib;
 const name=PDFName.of,ctx=doc.context,pages=doc.getPages();
 let removedAnnotations=0;
 for(const pg of pages){
  const array=pg.node.Annots?.();
  if(!(array instanceof PDFArray))continue;
  const refs=array.asArray();
  const kept=refs.filter(ref=>{
   try{
    const annotation=ctx.lookup(ref);
    const marker=annotation?.get?.(name('NM'))?.decodeText?.()||'';
    if(/^SM35:progress:/.test(marker)){removedAnnotations++;return false}
   }catch(err){console.warn('[SmartMatch] Kunde inte läsa statusannotering',err)}
   return true;
  });
  if(kept.length!==refs.length)pg.node.set(name('Annots'),ctx.obj(kept));
 }
 // Remove v36.35's flattened 100% page-content streams ONLY from the
 // PDF.js display copy. Project-export source 'bytes' is preserved.
 const removedStreams=smartRemoveOldProgressStreams(doc,pages);
 if(!removedAnnotations&&!removedStreams)return null;
 const clean=await doc.save({useObjectStreams:true});
 console.info('[SmartMatch] Dolda statusstämplar på arbetsritning:',removedAnnotations,'gamla PDF-anteckningar,',removedStreams,'PDF-strömmar');
 return new Uint8Array(clean);
}

async function readEmbeddedProjectState(){
 workspacePdfForDisplay=null;
 scanOriginalPageCount=0;smartImportedCardPages=new Set();
 try{
  const {PDFDocument,PDFName}=PDFLib;
  const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
  scanOriginalPageCount=Number(doc.catalog.get(PDFName.of('SmartMatch21OriginalPages'))?.asNumber?.()||0);
  const imported=decodePdfText(doc.catalog.get(PDFName.of('SmartMatch24ImportedCards'))||'');
  smartImportedCardPages=new Set(imported.split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0));
  // Separate read-only workspace canvas from the original export data.
  // A sanitization failure must never block opening the user's project.
  try{workspacePdfForDisplay=await smartMakeCleanWorkspaceDrawing(doc)}
  catch(err){console.warn('[SmartMatch] Kunde inte dölja äldre PDF-statusstämplar',err);workspacePdfForDisplay=null}
  const raw=doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV30Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV29Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV28Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV27Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV26Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV25Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV24Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV23Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV22Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV21Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV20Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV19Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV18Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV17Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV16Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV15Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV13Data'));
  if(!raw)return {};
  const json=decodePdfText(raw);
  const parsed=JSON.parse(json);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
   (parsed.automationItems!==undefined&&!Array.isArray(parsed.automationItems))||
   (parsed.instances!==undefined&&(typeof parsed.instances!=='object'||Array.isArray(parsed.instances)||!parsed.instances)))
   throw new Error('Felaktigt format på sparad projektinformation');
  return parsed;
 }catch(err){
  console.error('[SmartMatch] PDF-projektinformation kunde inte läsas',err);
  throw new Error('Projektinformationen i PDF-filen kunde inte läsas. Filen har inte ändrats. '+(err?.message||err));
 }
}

/* v35-projekt PDF: internt navigerbara dörrkort + statussidor. */
/* TEST v35 PDF: one independent, clickable door-card copy per drawing position.
   Each copy has its own GoTo "back" annotation, so the return page and position
   are deterministic in ordinary PDF readers rather than browser history. */
// v35: Den tidigare exporterfunktionen som kopierade varje dörrkort är borttagen.
// Alla sparade projekt använder en enda kompakt dörrkortssida per original.
/* Compact exporter shares each original door-card page instead of duplicating it
   for every marked position. If a card has multiple drawing locations, its
   'Till ritning' link opens a small clickable list of those locations. */
/* Remove orphaned page/resource objects left by prior per-door copies and
   replaced index pages. Reachability is traced from the PDF trailer/catalog,
   so referenced fonts, images, annotations and original page streams remain. */
function smartCompactPruneUnreachablePdfObjects(doc){
 const {PDFRef,PDFDict,PDFArray,PDFStream}=PDFLib,ctx=doc.context;
 const roots=Object.values(ctx.trailerInfo||{}).filter(Boolean);
 const reachable=new Set(),visited=new WeakSet(),queue=[...roots];
 while(queue.length){
  const item=queue.pop();
  if(!item)continue;
  if(item instanceof PDFRef){
   const id=item.toString();
   if(reachable.has(id))continue;
   reachable.add(id);
   const target=ctx.lookup(item);if(target)queue.push(target);
   continue;
  }
  if(typeof item!=='object'||visited.has(item))continue;
  visited.add(item);
  if(item instanceof PDFArray){
   for(const child of item.asArray())queue.push(child);
  }else if(item instanceof PDFStream){
   queue.push(item.dict);
  }else if(item instanceof PDFDict){
   for(const entry of item.entries())queue.push(entry[1]);
  }
 }
 const root=ctx.trailerInfo?.Root;
 if(!root||!reachable.has(String(root)))return 0;
 let removed=0;
 for(const [ref] of ctx.enumerateIndirectObjects()){
  if(!reachable.has(ref.toString())){ctx.delete(ref);removed++}
 }
 return removed;
}

/* v35: PDF outline/bookmark navigation without inserted SmartMatch report pages.
   Existing customer bookmarks are preserved and our subtree is reused on re-export. */
function smartUpdatePositionBookmarks(doc,originalPages,byCard){
 const {PDFName,PDFNumber,PDFHexString,PDFDict}=PDFLib,ctx=doc.context;
 const name=x=>PDFName.of(x),count=x=>PDFNumber.of(x);
 let rootRef=doc.catalog.get(name('Outlines'));
 let root=rootRef?ctx.lookup(rootRef,PDFDict):null;
 if(!root){
  root=ctx.obj({Type:'Outlines',Count:count(0)});
  rootRef=ctx.register(root);
  doc.catalog.set(name('Outlines'),rootRef);
 }
 let groupRef=doc.catalog.get(name('SmartMatch28OutlineRef'));
 let group=groupRef?ctx.lookup(groupRef,PDFDict):null;
 if(!group||String(group.get(name('Parent'))||'')!==String(rootRef)){
  group=ctx.obj({Title:PDFHexString.fromText('SmartMatch – Ritningspositioner'),Parent:rootRef});
  groupRef=ctx.register(group);
  const last=root.get(name('Last'));
  if(last){
   const lastObj=ctx.lookup(last,PDFDict);
   if(lastObj){lastObj.set(name('Next'),groupRef);group.set(name('Prev'),last)}
  }else root.set(name('First'),groupRef);
  root.set(name('Last'),groupRef);
  const old=Number(root.get(name('Count'))?.asNumber?.()||0);
  root.set(name('Count'),count(Math.max(1,Math.abs(old)+1)));
  doc.catalog.set(name('SmartMatch28OutlineRef'),groupRef);
 }
 group.set(name('Title'),PDFHexString.fromText('SmartMatch – Ritningspositioner'));
 // Replace children, avoiding duplicate outline entries on repeated exports.
 group.delete(name('First'));group.delete(name('Last'));group.delete(name('Count'));
 const appendChildren=(parent,parentRef,items)=>{
  let prev=null,first=null,last=null;
  for(const obj of items){
   const node=ctx.obj({Title:PDFHexString.fromText(obj.title),Parent:parentRef});
   if(obj.dest)node.set(name('Dest'),ctx.obj(obj.dest));
   const ref=ctx.register(node);
   if(prev){ctx.lookup(prev,PDFDict).set(name('Next'),ref);node.set(name('Prev'),prev)}
   if(!first)first=ref;last=ref;prev=ref;
   if(obj.children?.length)appendChildren(node,ref,obj.children);
  }
  if(first){parent.set(name('First'),first);parent.set(name('Last'),last);parent.set(name('Count'),count(-items.length))}
 };
 const items=[];
 for(const [cardIndex,positions] of byCard){
  const card=originalPages[cardIndex];
  const children=positions.map(o=>{
   const drawing=originalPages[o.page-1];
   return {title:o.code+' · sida '+o.page+' · position '+o.position+' av '+o.totalOfCode,
    dest:[drawing.ref,name('XYZ'),Math.max(0,o.rect[0]-35),
     Math.min(drawing.getHeight(),o.rect[3]+90),null]};
  });
  items.push({title:positions[0].code+' · dörrkort sida '+(cardIndex+1)+' · '+positions.length+' positioner',
   dest:[card.ref,name('Fit')],children});
 }
 if(items.length)appendChildren(group,groupRef,items);
 return {groups:items.length,positions:items.reduce((n,x)=>n+x.children.length,0)};
}


/* TEST v36.46: status is normal, flattened PDF page content, NOT FreeText.
   A catalog index points to the dedicated content streams, allowing re-export
   to replace old percentages without rasterizing or damaging original pages. */
function smartRemoveOldProgressStreams(doc,originalPages){
 const {PDFName,PDFArray}=PDFLib,name=PDFName.of,ctx=doc.context;
 const saved=doc.catalog.get(name('SmartMatch36ProgressStreams'));
 if(!(saved instanceof PDFArray)){
  // New PDFs and projects with no GS progress still need a valid empty index.
  // Verification will check any non-empty status streams as before.
  doc.catalog.set(name('SmartMatch36ProgressStreams'),ctx.obj([]));
  return 0;
 }
 const pages=new Map(originalPages.map(p=>[String(p.ref),p]));
 let removed=0;
 for(const item of saved.asArray()){
  const pair=ctx.lookup(item);
  if(!(pair instanceof PDFArray)||pair.size()<2)continue;
  const page=pages.get(String(pair.get(0))),ref=pair.get(1);
  if(!page||!ref)continue;
  const streams=page.node.normalizedEntries().Contents;
  if(!(streams instanceof PDFArray))continue;
  const existing=streams.asArray(),retained=existing.filter(entry=>String(entry)!==String(ref));
  if(existing.length!==retained.length){
   page.node.set(name('Contents'),ctx.obj(retained));removed++;
  }
 }
 doc.catalog.set(name('SmartMatch36ProgressStreams'),ctx.obj([]));
 return removed;
}
function smartProgressLayer(doc){
 const {PDFName,PDFString,PDFDict,PDFArray}=PDFLib,name=PDFName.of,ctx=doc.context;
 let ref=doc.catalog.get(name('SmartMatch36ProgressLayer'));
 if(!ref||!ctx.lookupMaybe(ref,PDFDict)){
  ref=ctx.register(ctx.obj({Type:'OCG',Name:PDFString.of('SmartMatch PDF Progress')}));
  doc.catalog.set(name('SmartMatch36ProgressLayer'),ref);
 }
 let props=doc.catalog.lookupMaybe(name('OCProperties'),PDFDict);
 if(!props){props=ctx.obj({OCGs:[],D:{Order:[],ON:[]}});doc.catalog.set(name('OCProperties'),ctx.register(props))}
 const addRef=(owner,key)=>{
  let arr=owner.lookupMaybe(name(key),PDFArray);
  if(!arr){arr=ctx.obj([]);owner.set(name(key),arr)}
  if(!arr.asArray().some(v=>String(v)===String(ref)))arr.push(ref);
 };
 addRef(props,'OCGs');
 let defaults=props.lookupMaybe(name('D'),PDFDict);
 if(!defaults){defaults=ctx.obj({Order:[],ON:[]});props.set(name('D'),defaults)}
 addRef(defaults,'Order');
 addRef(defaults,'ON');
 return ref;
}

/* TEST v36.46: All positioning is performed in the SAME upright page
   coordinates seen in PDF.js, not the raw PDF x/y coordinate system.
   This keeps each saved badge visually alongside its own GS marker,
   even on 90/180/270 degree drawings or non-zero CropBoxes. */
function smartProgressDisplayGeometry(page){
 const crop=page.getCropBox?.()||{x:0,y:0,width:page.getWidth(),height:page.getHeight()};
 const X=crop.x,Y=crop.y,W=crop.width,H=crop.height;
 const turn=((Math.round(page.getRotation()?.angle||0)%360)+360)%360;
 const width=(turn===90||turn===270)?H:W;
 const height=(turn===90||turn===270)?W:H;
 const toDisplay=(x,y)=>{
  if(turn===90)return {x:y-Y,y:x-X};
  if(turn===180)return {x:X+W-x,y:y-Y};
  if(turn===270)return {x:Y+H-y,y:X+W-x};
  return {x:x-X,y:Y+H-y};
 };
 const toPdf=(x,y)=>{
  if(turn===90)return {x:X+y,y:Y+x};
  if(turn===180)return {x:X+W-x,y:Y+y};
  if(turn===270)return {x:X+W-y,y:Y+H-x};
  return {x:X+x,y:Y+H-y};
 };
 const rectToDisplay=rect=>{
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))return null;
  const pts=[toDisplay(rect[0],rect[1]),toDisplay(rect[2],rect[1]),
   toDisplay(rect[0],rect[3]),toDisplay(rect[2],rect[3])];
  const left=Math.min(...pts.map(p=>p.x)),top=Math.min(...pts.map(p=>p.y));
  const right=Math.max(...pts.map(p=>p.x)),bottom=Math.max(...pts.map(p=>p.y));
  return {left,top,right,bottom,width:right-left,height:bottom-top};
 };
 return {turn,width,height,toDisplay,toPdf,rectToDisplay};
}
function smartPickProgressPlacement(position,w,h,otherPositions,used,displayWidth,displayHeight){
 const pad=2.5,gap=3.5,cx=(position.left+position.right)/2,cy=(position.top+position.bottom)/2;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const r={left:position.left,right:position.right,top:position.top,bottom:position.bottom};
 const candidates=[
  {x:r.right+gap,y:cy-h/2,priority:0},
  {x:r.left-w-gap,y:cy-h/2,priority:1},
  {x:cx-w/2,y:r.bottom+gap,priority:2},
  {x:cx-w/2,y:r.top-h-gap,priority:3},
  {x:r.right+gap,y:r.bottom+gap,priority:4},
  {x:r.right+gap,y:r.top-h-gap,priority:5},
  {x:r.left-w-gap,y:r.bottom+gap,priority:6},
  {x:r.left-w-gap,y:r.top-h-gap,priority:7}
 ];
 // In a dense GS cluster, move by only one label row; don't park the
 // stamp in a distant free corner, which loses the door association.
 for(const step of [-1,1,-2,2]){
  candidates.push({x:r.right+gap,y:cy-h/2+step*(h+2),priority:8+Math.abs(step)*2});
  candidates.push({x:r.left-w-gap,y:cy-h/2+step*(h+2),priority:9+Math.abs(step)*2});
 }
 const overlap=(a,b)=>{
  const x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
  const y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  return x*y;
 };
 let best=null,bestScore=Infinity;
 for(const item of candidates){
  const x=clamp(item.x,pad,displayWidth-w-pad),y=clamp(item.y,pad,displayHeight-h-pad);
  const box={left:x,top:y,right:x+w,bottom:y+h};
  const shift=Math.hypot(x-item.x,y-item.y);
  const dx=Math.max(position.left-box.right,box.left-position.right,0);
  const dy=Math.max(position.top-box.bottom,box.top-position.bottom,0);
  let score=Math.hypot(dx,dy)*1.75+shift*4+item.priority*0.9;
  score+=overlap(box,position)*48;
  for(const mark of otherPositions)score+=overlap(box,mark)*18;
  for(const stamp of used)score+=overlap(box,stamp)*68;
  if(score<bestScore){bestScore=score;best={...box,width:w,height:h}}
 }
 return best;
}

async function smartFlattenProgressBadges(doc,pages,linked){
 const {PDFName,PDFString,StandardFonts,PDFDict}=PDFLib,name=PDFName.of,ctx=doc.context;
 const cleared=smartRemoveOldProgressStreams(doc,pages);
 const active=linked.filter(o=>Number(o.progress)>0);
 if(!active.length)return {cleared,added:0};
 const layer=smartProgressLayer(doc);
 const font=await doc.embedFont(StandardFonts.HelveticaBold);
 const byPage=new Map();
 for(const o of active){
  const index=o.page-1;
  if(!byPage.has(index))byPage.set(index,[]);
  byPage.get(index).push(o);
 }
 const markers=[];
 for(const [index,positions] of byPage){
  const page=pages[index];
  if(!page)continue;
  const resources=page.node.normalizedEntries().Resources;
  let properties=resources.lookupMaybe(name('Properties'),PDFDict);
  if(!properties){properties=ctx.obj({});resources.set(name('Properties'),properties)}
  properties.set(name('SMStatus'),layer);
  const fontKey=page.node.newFontDictionary('SMStatusFont',font.ref);
  const commands=[];
  const geometry=smartProgressDisplayGeometry(page),turn=geometry.turn;
  const angle=turn*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const c=number=>Number(number.toFixed(4));
  // Check the bounding boxes of ALL scanned positions on the same page,
  // including non-linked GS, so export stamps never obscure another door ID.
  const pageRects=instances.filter(item=>item.page===index+1&&Array.isArray(item.rect))
   .map(item=>({id:item.id,box:geometry.rectToDisplay(item.rect)}))
   .filter(item=>item.box);
  const occupied=[];
  const ordered=[...positions].sort((a,b)=>a.position-b.position||a.code.localeCompare(b.code,'sv',{numeric:true}));
  for(const o of ordered){
   const box=geometry.rectToDisplay(o.rect);
   if(!box)continue;
   const complete=Number(o.progress)>=100,label=Math.min(100,Math.max(0,Math.round(o.progress)))+'%';
   const w=Math.max(32,Math.ceil(font.widthOfTextAtSize(label,9)+13)),h=15;
   if(geometry.width<w+5||geometry.height<h+5)continue;
   const others=pageRects.filter(item=>item.id!==o.id).map(item=>item.box);
   const placed=smartPickProgressPlacement(box,w,h,others,occupied,geometry.width,geometry.height);
   if(!placed)continue;
   occupied.push(placed);
   // toPdf maps the badge's lower-left SCREEN point into its correct
   // PDF local-origin; combining with +turn keeps 100% left-to-right.
   const origin=geometry.toPdf(placed.left,placed.bottom);
   commands.push('q','/OC /SMStatus BDC');
   commands.push(c(cos)+' '+c(sin)+' '+c(-sin)+' '+c(cos)+' '+origin.x.toFixed(2)+' '+origin.y.toFixed(2)+' cm');
   // When the label must move a little farther away in a crowded drawing,
   // a fine leader joins the badge to exactly the scanned GS rectangle.
   const sx=(box.left+box.right)/2,sy=(box.top+box.bottom)/2;
   const attachX=Math.max(placed.left,Math.min(placed.right,sx));
   const attachY=Math.max(placed.top,Math.min(placed.bottom,sy));
   const gsX=Math.max(box.left,Math.min(box.right,attachX));
   const gsY=Math.max(box.top,Math.min(box.bottom,attachY));
   const linkLength=Math.hypot(gsX-attachX,gsY-attachY);
   if(linkLength>6){
    const x1=gsX-placed.left,y1=placed.bottom-gsY;
    const x2=attachX-placed.left,y2=placed.bottom-attachY;
    commands.push('0.31 0.47 0.56 RG','0.6 w',
     x1.toFixed(2)+' '+y1.toFixed(2)+' m '+x2.toFixed(2)+' '+y2.toFixed(2)+' l S');
   }
   commands.push(
    complete?'0.89 0.97 0.92 rg':'0.91 0.96 0.99 rg',
    '0 0 '+w+' '+h+' re f',
    complete?'0.13 0.43 0.26 RG':'0.13 0.39 0.55 RG',
    '0.8 w 0.5 0.5 '+(w-1)+' '+(h-1)+' re S',
    complete?'0.12 0.36 0.21 rg':'0.10 0.33 0.47 rg',
    'BT '+fontKey.toString()+' 9 Tf 7 4 Td ('+label+') Tj ET',
    'EMC','Q'
   );
  }
  if(!commands.length)continue;
  const stream=ctx.flateStream(commands.join('\n')+'\n',{});
  const ref=ctx.register(stream);
  page.node.addContentStream(ref);
  markers.push(ctx.obj([page.ref,ref]));
 }
 doc.catalog.set(name('SmartMatch36ProgressStreams'),ctx.obj(markers));
 return {cleared,added:markers.length};
}

async function appendCompactProjectPdf(doc){
 const {PDFName,PDFNumber,PDFString,StandardFonts,rgb}=PDFLib;
 const extraKeys=['SmartMatch23ExtraPages','SmartMatch21ExtraPages','SmartMatch18ExtraPages','SmartMatch17ExtraPages'];
 const previous=extraKeys.map(k=>Number(doc.catalog.get(PDFName.of(k))?.asNumber?.()||0))
  .find(n=>Number.isInteger(n)&&n>0&&n<doc.getPageCount())||0;
 const removedRefs=new Set();
 if(previous){
  const total=doc.getPageCount();
  for(let i=total-previous;i<total;i++)removedRefs.add(String(doc.getPage(i).ref));
  for(let i=0;i<previous;i++)doc.removePage(doc.getPageCount()-1);
 }
 const originalCount=doc.getPageCount();
 const originalPages=Array.from({length:originalCount},(_,i)=>doc.getPage(i));
 // v24/v35 exported buttons were painted onto the source card page.
 // Preserve them once rather than painting another identical label on each save.
 const previouslyLabeled=new Set(
  String(doc.catalog.get(PDFName.of('SmartMatch25LabeledCards'))?.decodeText?.()||'')
   .split(',').map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=originalCount)
 );
 for(const [i,page] of originalPages.entries()){
  const annotArray=page.node.Annots?.();
  if(!annotArray)continue;
  for(const ref of annotArray.asArray()){
   try{
    const annot=doc.context.lookup(ref);
    const name=annot?.get?.(PDFName.of('NM'))?.decodeText?.()||'';
    if(!/^SM(?:23|25):/.test(name))continue;
    const rect=annot?.get?.(PDFName.of('Rect'));
    const x=rect?.get?.(0)?.asNumber?.(),y=rect?.get?.(1)?.asNumber?.();
    if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-6)<1&&Math.abs(y-5)<1)
     previouslyLabeled.add(i+1);
   }catch(_){}
  }
 }
 // Strip generated links (and dangling links) without touching original PDF content.
 for(const page of originalPages){
  const array=page.node.Annots?.();if(!array)continue;
  const cleaned=array.asArray().filter(ref=>{
   try{
    const annot=doc.context.lookup(ref);
    const name=annot?.get?.(PDFName.of('NM'))?.decodeText?.()||'';
    if(/^SM(?:17|18|21|23|25|35):/.test(name))return false;
    const action=doc.context.lookup(annot?.get?.(PDFName.of('A')));
    const destination=doc.context.lookup(action?.get?.(PDFName.of('D')));
    return !removedRefs.has(String(destination?.get?.(0)));
   }catch(_){return true}
  });
  if(cleaned.length!==array.size())page.node.set(PDFName.of('Annots'),doc.context.obj(cleaned));
 }
 let sequence=0;
 const link=(source,rect,target,point)=>{
  if(!source||!target||!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))return;
  const [x1,y1,x2,y2]=rect.map(Number);
  const dest=point?[target.ref,PDFName.of('XYZ'),Math.max(0,point[0]),Math.max(0,point[1]),null]:[target.ref,PDFName.of('Fit')];
  const ann=doc.context.obj({
   Type:'Annot',Subtype:'Link',NM:PDFString.of('SM25:'+(++sequence)),
   Rect:[Math.min(x1,x2),Math.min(y1,y2),Math.max(x1,x2),Math.max(y1,y2)],
   Border:[0,0,0],A:{S:'GoTo',D:dest}
  });
  let arr=source.node.Annots?.();
  if(!arr){arr=doc.context.obj([]);source.node.set(PDFName.of('Annots'),arr)}
  arr.push(doc.context.register(ann));
 };
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ascii=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();
 const clip=(v,n=82)=>{const s=ascii(v);return s.length>n?s.slice(0,n-3)+'...':s};
 const linked=instances.filter(o=>o.page>0&&o.page<=originalCount&&
  Number.isInteger(protocolMap[o.code])&&protocolMap[o.code]>0&&protocolMap[o.code]<=originalCount&&
  Array.isArray(o.rect)&&o.rect.length===4&&o.rect.every(Number.isFinite)
 ).sort((a,b)=>protocolMap[a.code]-protocolMap[b.code]||a.code.localeCompare(b.code,'sv',{numeric:true})||a.page-b.page||a.position-b.position);
 const byCard=new Map();
 for(const o of linked){
  const cardIndex=protocolMap[o.code]-1;
  if(!byCard.has(cardIndex))byCard.set(cardIndex,[]);
  byCard.get(cardIndex).push(o);
  const drawing=originalPages[o.page-1],card=originalPages[cardIndex];
  link(drawing,[o.rect[0]-4,o.rect[1]-4,o.rect[2]+4,o.rect[3]+4],card);
 }
 // Replace former editable SM35 FreeText badges with static PDF content.
 // Re-export replaces only tagged SmartMatch streams, never customer's drawing.
 const savedProgress=await smartFlattenProgressBadges(doc,originalPages,linked);
 // Bookmark entries replace all previously generated "Ritningspositioner & kontroll" pages.
 // They occupy PDF metadata only; original paper/PDF pages are unchanged.
 const bookmarkSummary=smartUpdatePositionBookmarks(doc,originalPages,byCard);
 for(const [cardIndex,rows] of byCard){
  const card=originalPages[cardIndex],w=card.getWidth();
  const many=rows.length>1;
  const text=many?'TILL RITNING | SE BOKMARKEN':'TILL RITNING';
  const boxWidth=Math.min(w-14,Math.max(116,font.widthOfTextAtSize(text,8.5)+15));
  if(boxWidth<60)continue;
  if(!previouslyLabeled.has(cardIndex+1)){
   card.drawRectangle({x:6,y:5,width:boxWidth,height:23,color:rgb(1,1,1),borderColor:rgb(.26,.53,.67),borderWidth:1});
   card.drawText(text,{x:12,y:13,size:8.5,font,color:rgb(.05,.31,.47)});
   previouslyLabeled.add(cardIndex+1);
  }
  // In a standalone PDF, GoTo has a fixed destination. The first position is a
  // useful fallback, but cannot represent "last-clicked". Bookmarks contain all
  // exact positions; browser/PDF-reader previous-view goes back to last location.
  const row=rows[0],target=originalPages[row.page-1];
  link(card,[6,5,6+boxWidth,28],target,
   [Math.max(0,row.rect[0]-35),Math.min(target.getHeight(),row.rect[3]+90)]);
 }
 doc.catalog.set(PDFName.of('SmartMatch21OriginalPages'),PDFNumber.of(originalCount));
 doc.catalog.set(PDFName.of('SmartMatch25LabeledCards'),PDFString.of([...previouslyLabeled].sort((a,b)=>a-b).join(',')));
 doc.catalog.set(PDFName.of('SmartMatch23ExtraPages'),PDFNumber.of(0));
 doc.catalog.set(PDFName.of('SmartMatch21ExtraPages'),PDFNumber.of(0));
 return {originalPages:originalCount,extraPages:0,cards:byCard.size,positions:linked.length,bookmarks:bookmarkSummary,progress:savedProgress};
}

async function buildPortableProjectPdf(payload=makeProjectPayload()){
 const {PDFDocument,PDFName,PDFHexString,PDFString}=PDFLib;
 const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 const metadata=PDFHexString.fromText(JSON.stringify(payload));
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV36Data'),metadata);
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV36Schema'),PDFString.of('6'));
 // Older test clients continue to read the same project contents.
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV30Data'),metadata);
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV30Schema'),PDFString.of('6'));
 await appendCompactProjectPdf(doc);
 const orphansRemoved=smartCompactPruneUnreachablePdfObjects(doc);
 if(orphansRemoved)console.info('[SmartMatch v36] tog bort gamla oanvända PDF-objekt:',orphansRemoved);
 return new Uint8Array(await doc.save({useObjectStreams:true}));
}
async function verifyPortableProjectPdf(data,expected){
 const {PDFDocument,PDFName}=PDFLib;
 const doc=await PDFDocument.load(data.slice(),{ignoreEncryption:true,updateMetadata:false});
 const raw=doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data'));
 if(!raw)throw new Error('Projektdata saknas i exporterad PDF.');
 // Also verify that the static GS progress layer really belongs to the saved pages.
 const progressRefs=doc.catalog.get(PDFName.of('SmartMatch36ProgressStreams'));
 if(!(progressRefs instanceof PDFLib.PDFArray))throw new Error('PDF-statuslagret saknas.');
 if(progressRefs.size()>0&&!doc.catalog.get(PDFName.of('SmartMatch36ProgressLayer')))
  throw new Error('PDF-statuslagrets synlighetsinformation saknas.');
 const savedPages=new Map(doc.getPages().map(pg=>[String(pg.ref),pg]));
 for(const pair of progressRefs.asArray()){
  const values=doc.context.lookup(pair);
  if(!(values instanceof PDFLib.PDFArray)||values.size()<2)
   throw new Error('Ett statiskt GS-statuslager har ogiltig referens.');
  const target=savedPages.get(String(values.get(0)));
  const contentList=target?.node.normalizedEntries().Contents;
  if(!target||!(contentList instanceof PDFLib.PDFArray)||
   !contentList.asArray().some(ref=>String(ref)===String(values.get(1))))
   throw new Error('GS-statusen följer inte med som fast innehåll i PDF-sidan.');
 }
 const actual=JSON.parse(decodePdfText(raw));
 if(JSON.stringify(expected)!==JSON.stringify(actual))
  throw new Error('Alla projektändringar kunde inte läsas tillbaka från PDF-filen.');
 const da=Array.isArray(actual.automationItems)?actual.automationItems:[];
 return {automations:da.length,gsLinks:da.filter(o=>o.linkedGsId||o.linkedGsCode).length,
  checks:da.reduce((n,o)=>n+Object.keys(o.checks||{}).length,0),
  positions:Object.keys(actual.instances||{}).length,revision:actual.projectRevision};
}
function downloadProjectFile(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function fileStem(name){
 return String(name||'Tillsyno-projekt.pdf').replace(/\.pdf$/i,'')||'Tillsyno-projekt';
}
function originalProjectPdfName(name=currentFileName){
 const base=String(name||'Tillsyno-projekt.pdf').split(/[\\/]/).pop().trim()||'Tillsyno-projekt.pdf';
 return /\.pdf$/i.test(base)?base:base+'.pdf';
}
function normalizeExportPdfName(value,fallback=currentFileName){
 const clean=name=>String(name||'').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'-').trim().replace(/(?:\.pdf)+$/i,'').replace(/[. ]+$/g,'').trim();
 const stem=clean(value)||clean(fallback)||'Tillsyno-projekt';
 return stem+'.pdf';
}
function chosenProjectExportName(){
 return normalizeExportPdfName(document.getElementById('smartExportFileName')?.value,currentFileName);
}
async function deliverProjectFile(file){
 let shared=false;
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
  try{
   await navigator.share({files:[file]});
   shared=true;
  }catch(err){
   if(err?.name==='AbortError')return false;
  }
 }
 if(!shared)downloadProjectFile(file);
 return true;
}
async function chooseDesktopSaveHandle(suggestedName){
 if(!desktopSavePickerAvailable())return null;
 return window.showSaveFilePicker({
  suggestedName:suggestedName||'Tillsyno-projekt.pdf',
  types:PDF_FILE_PICKER_TYPES,
  excludeAcceptAllOption:false
 });
}
async function ensureHandleWritePermission(handle){
 if(!handle)return false;
 const options={mode:'readwrite'};
 try{
  if(typeof handle.queryPermission==='function'&&await handle.queryPermission(options)==='granted')return true;
  if(typeof handle.requestPermission==='function')return await handle.requestPermission(options)==='granted';
 }catch(err){console.warn('Kunde inte kontrollera skrivbehörighet',err)}
 return typeof handle.createWritable==='function';
}
async function writePdfToHandle(handle,data){
 if(!handle||typeof handle.createWritable!=='function')throw new Error('Filen kan inte skrivas direkt i den här webbläsaren.');
 const writable=await handle.createWritable();
 try{
  await writable.write(new Blob([data],{type:'application/pdf'}));
 }finally{
  await writable.close();
 }
}
let smartExportBytes=null,smartExportMode=null,smartExportObjectUrl=null,smartExportIntent='local',smartExportRunId=0;
function releaseSmartExport(){
 smartExportRunId++;
 if(smartExportObjectUrl){URL.revokeObjectURL(smartExportObjectUrl);smartExportObjectUrl=null}
 smartExportBytes=null;smartExportMode=null;
 const proof=document.getElementById('smartExportProjectProof');
 if(proof){proof.hidden=true;proof.textContent=''}
 const detail=document.getElementById('smartExportFinalSize');
 if(detail)detail.textContent='Inte analyserad';
 smartFileSizeReviewSetSaving('Kompakt PDF har ännu inte beräknats.');
 for(const id of ['smartExportPreview','smartExportShare','smartExportDownload','smartExportSaveAs','smartExportSaveObject'])
  document.getElementById(id).disabled=true;
}
function prettyPdfSize(n){return (n/1024/1024).toLocaleString('sv-SE',{maximumFractionDigits:2,minimumFractionDigits:2})+' MB'}
function smartFileSizeReviewSetSaving(message,level='neutral'){
 const label=document.getElementById('smartFileReviewSaving');
 if(label){label.textContent=message;label.dataset.level=level}
}
function smartFileSizeReviewShowSource(){
 const name=document.getElementById('smartFileReviewName');
 const meta=document.getElementById('smartFileReviewInfo');
 if(!name||!meta)return;
 const n=scanPageLimit(),cards=smartDoorCardPages.size,drawings=Math.max(0,n-cards);
 name.textContent=fileStem(currentFileName)||'Projekt';
 meta.textContent=n+' originalsidor: '+drawings+' ritningssidor · '+cards+' dörrkort · '+
  matchedProjectInstances().length+' kopplade ritningspositioner';
}
function smartExportMessage(message,level='neutral'){
 const e=document.getElementById('smartExportStatus');e.textContent=message;e.dataset.level=level;
}
function openSmartExportDialog(intent='local'){
 if(!bytes)return;
 smartExportIntent=intent;closeSaveMenu();releaseSmartExport();
 document.getElementById('smartExportFileName').value=originalProjectPdfName();
 const saveToggle=document.getElementById('smartExportSaveMenuToggle');if(saveToggle)saveToggle.disabled=true;
 const saveChoices=document.getElementById('smartExportSaveChoices');if(saveChoices)saveChoices.hidden=true;
 const dialog=document.getElementById('smartExportDialog');
 document.getElementById('smartExportOriginalSize').textContent=prettyPdfSize(bytes.length);
 smartFileSizeReviewShowSource();
 document.getElementById('smartExportBuild').disabled=false;
 smartExportMessage('Förbereder projekt-PDF med ritningar, märkningar och dina senaste ändringar…');
 dialog.showModal();
 // Build and verify before the technician taps an action: iOS sharing needs a fresh user gesture.
 requestAnimationFrame(()=>setTimeout(()=>{if(dialog.open&&bytes)void prepareSmartExport()},35));
}
function inspectCurrentProjectPdf(){
 if(!bytes||!pdf){setState('Öppna först en PDF för att granska filstorleken.');return}
 const dialog=document.getElementById('smartExportDialog');
 if(dialog.open)return;
 openSmartExportDialog('local');
}
function currentSmartExportMode(){return 'compact'}
function currentSmartExportFile(){
 if(!smartExportBytes)return null;
 return new File([smartExportBytes],chosenProjectExportName(),{type:'application/pdf'});
}
async function prepareSmartExport(){
 const btn=document.getElementById('smartExportBuild');
 if(!bytes||btn.disabled)return;
 releaseSmartExport();btn.disabled=true;
 const attempt=smartExportRunId;
 const dialog=document.getElementById('smartExportDialog');
 const chosen=currentSmartExportMode();
 smartFileSizeReviewSetSaving('Analyserar och beräknar filstorlek…','working');
 smartExportMessage('Förbereder och kontrollerar PDF-filen…');
 try{
  const snapshot=makeProjectPayload();
  const data=await buildPortableProjectPdf(snapshot);
  const verified=await verifyPortableProjectPdf(data,snapshot);
  if(attempt!==smartExportRunId||!dialog.open)return;
  smartExportBytes=data;smartExportMode=chosen;
  const proof=document.getElementById('smartExportProjectProof');
  if(proof){proof.hidden=false;proof.textContent='✓ Verifierat: '+verified.automations+' automatiker · '+verified.gsLinks+' GS-kopplingar · '+verified.checks+' svar';}
  const before=bytes.length,after=data.length;
  document.getElementById('smartExportFinalSize').textContent=prettyPdfSize(after);
  for(const id of ['smartExportPreview','smartExportShare','smartExportDownload','smartExportSaveAs','smartExportSaveObject','smartExportSaveMenuToggle'])
   document.getElementById(id).disabled=false;
  const change=after-before;
  smartExportMessage(after>25*1024*1024?'PDF klar. Stor fil – mejltjänsten kan ha en storleksgräns.':'✓ PDF klar. Välj Spara fil eller Skicka mejl.',after>25*1024*1024?'warning':'good');
  setState('PDF klar att spara: '+originalProjectPdfName()+'.');
 }catch(e){
  if(attempt!==smartExportRunId||!dialog.open)return;
  console.error(e);smartExportMessage('PDF-exporten stoppades: sparade projektdata kunde inte verifieras. '+(e?.message||e),'warning');
  smartFileSizeReviewSetSaving('Kunde inte beräkna kompakt storlek för den här filen. Originalstorleken ovan är korrekt.','warning');
 }finally{if(attempt===smartExportRunId)btn.disabled=false}
}
function previewSmartExport(){
 const file=currentSmartExportFile();if(!file)return;
 if(smartExportObjectUrl)URL.revokeObjectURL(smartExportObjectUrl);
 smartExportObjectUrl=URL.createObjectURL(file);
 const tab=window.open(smartExportObjectUrl,'_blank');
 if(tab){try{tab.opener=null}catch(_){}}
 else smartExportMessage('Webbläsaren blockerade förhandsgranskningen. Tillåt popupfönster eller använd Ladda ner för att granska PDF:en.','warning');
}
async function saveSmartExportObject(){
 const file=currentSmartExportFile();if(!file)return;
 try{
  if(currentFileHandle&&await ensureHandleWritePermission(currentFileHandle)){
   await writePdfToHandle(currentFileHandle,smartExportBytes);
   smartWorkspaceDirty=false;await window.SmartMatchSession?.markPdfSaved?.(fileKey);
   smartExportMessage('Sparat direkt i '+(currentFileHandle.name||'öppnad PDF')+'.','good');
   setState('Sparat i öppnad PDF: '+(currentFileHandle.name||currentFileName));return;
  }
  smartExportMessage('Ingen skrivbehörighet till ursprungsfilen. Välj en plats med Spara som.','warning');
  if(desktopSavePickerAvailable())await saveSmartExportAs();
  else await saveSmartExportLocal();
 }catch(e){
  if(e?.name==='AbortError'){smartExportMessage('Sparandet avbröts.');return}
  console.error(e);smartExportMessage('Kunde inte spara direkt: '+(e?.message||e),'warning');
 }
}
async function saveSmartExportAs(){
 const file=currentSmartExportFile();if(!file)return;
 if(desktopSavePickerAvailable()){
  try{
   const handle=await chooseDesktopSaveHandle(file.name);if(!handle)return;
   await writePdfToHandle(handle,smartExportBytes);
   smartWorkspaceDirty=false;await window.SmartMatchSession?.markPdfSaved?.(fileKey);
   currentFileHandle=handle;
   smartExportMessage('Sparat som '+(handle.name||file.name)+'.','good');
   setState('Projektfilen sparad: '+(handle.name||file.name)+'.');
  }catch(e){
   if(e?.name==='AbortError'){smartExportMessage('Spara som avbröts.');return}
   console.error(e);smartExportMessage('Spara som misslyckades: '+(e?.message||e),'warning');
  }
  return;
 }
 await saveSmartExportLocal();
}
async function saveSmartExportLocal(){
 const file=currentSmartExportFile();if(!file)return;
 if(isNativeIos()||/iPhone|iPad|iPod/.test(navigator.userAgent||'')){
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{
    await navigator.share({files:[file]});
    smartExportMessage('Delningsmenyn stängdes. Kontrollera att du valde Spara i Filer.','good');
    return;
   }catch(err){if(err?.name==='AbortError')return;console.warn('Spara i Filer',err)}
  }
 }
 downloadProjectFile(file);
 smartExportMessage('PDF nedladdad. Kontrollera Hämtade filer.','good');
}
async function emailSmartExport(){
 const file=currentSmartExportFile();if(!file)return;
 if(file.size>18*1024*1024&&!window.confirm('PDF: '+prettyPdfSize(file.size)+'. Mejltjänster kan ha gränsen 25 MB, och bilagor kan växa under överföring. Fortsätta?'))return;
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
  try{
   await navigator.share({files:[file]});
   smartExportMessage('PDF delad utan extra text. Om du valde mejl: fyll i mottagare och ämne i mejlappen innan du skickar.','good');
   return;
  }catch(err){if(err?.name==='AbortError')return;console.warn('E-postdelning',err)}
 }
 // mailto: kan inte bifoga lokala filer automatiskt i vanliga webbläsare.
 downloadProjectFile(file);
 smartExportMessage('PDF nedladdad. Mejlet öppnas utan bilaga – bifoga '+file.name+' från Hämtade filer manuellt.','warning');
 window.location.href='mailto:?subject='+encodeURIComponent('SmartMatch projekt-PDF')+'&body='+encodeURIComponent('Hej,\n\nBifoga filen '+file.name+' från Hämtade filer innan du skickar.\n');
}
async function shareSmartExport(){return emailSmartExport()}
async function downloadSmartExport(){
 // Desktop gets the normal file dialog. On iPhone/iPad use the native share sheet
 // where the user selects Filer, Dropbox or another available destination.
 if(desktopSavePickerAvailable())return saveSmartExportAs();
 return saveSmartExportLocal();
}
async function savePortableProject(){openSmartExportDialog('object')}
async function saveProjectAs(){openSmartExportDialog('as')}
async function savePdfCopy(){openSmartExportDialog('email')}

function decodePdfText(obj){
 try{
  if(obj&&typeof obj.decodeText==='function')return obj.decodeText();
  if(obj&&typeof obj.asString==='function')return obj.asString();
 }catch(_){}
 return String(obj||'');
}
function normalizeCode(value){
 const raw=String(value||'').toUpperCase().replace(/[\u00A0\u2007\u202F]/g,' ').replace(/\s+/g,' ').trim();
 if(!raw)return '';
 const compactExact=raw.replace(/[\s_-]+/g,'');
 if(/^GS[A-ZÅÄÖ0-9]{1,12}$/.test(compactExact))return compactExact;
 const embedded=raw.match(/(?:^|[^A-ZÅÄÖ0-9])G[\s_-]*S[\s_-]*([A-ZÅÄÖ0-9]{1,12})(?=$|[^A-ZÅÄÖ0-9])/);
 return embedded?'GS'+embedded[1]:'';
}
function codeRegex(code){
 const compact=String(code||'').toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,'');
 if(!/^GS[A-ZÅÄÖ0-9]{1,12}$/.test(compact))return null;
 const gap='[^A-ZÅÄÖ0-9]*';
 const spread=compact.split('').join(gap);
 return new RegExp('(^|[^A-ZÅÄÖ0-9])'+spread+'($|[^A-ZÅÄÖ0-9])','i');
}
function stampCode(dict){
 const {PDFName}=PDFLib;
 for(const key of ['Subj','Contents','T','NM','Name']){
  const code=normalizeCode(decodePdfText(dict.get(PDFName.of(key))));
  if(code)return code;
 }
 return '';
}
function rectFromAnnotation(dict){
 const {PDFName,PDFArray,PDFNumber}=PDFLib;
 let rectArr;try{rectArr=dict.lookup(PDFName.of('Rect'),PDFArray)}catch(_){return null}
 if(!rectArr||rectArr.size()<4)return null;
 const rect=[];
 for(let n=0;n<4;n++){
  let num;try{num=rectArr.lookup(n,PDFNumber)}catch(_){}
  const v=num&&typeof num.asNumber==='function'?num.asNumber():Number(decodePdfText(rectArr.get(n)));
  rect.push(v);
 }
 return rect.every(Number.isFinite)?rect:null;
}
async function codeFromMarkedPageText(pageNo,rect){
 const text=await readPageText(pageNo);
 const minX=Math.min(rect[0],rect[2])-4,maxX=Math.max(rect[0],rect[2])+4,minY=Math.min(rect[1],rect[3])-7,maxY=Math.max(rect[1],rect[3])+7;
 const inside=text.items.filter(item=>{
  const cx=item.x+Math.max(item.w,1)/2,cy=item.y+Math.max(item.h,1)/2;
  return cx>=minX&&cx<=maxX&&cy>=minY&&cy<=maxY;
 }).sort((a,b)=>Math.abs(a.y-b.y)>4?b.y-a.y:a.x-b.x);
 if(!inside.length)return '';
 const joined=inside.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
 let code=normalizeCode(joined);if(code)return code;
 for(const item of inside){code=normalizeCode(item.text);if(code)return code}
 return '';
}
async function rawProjectStampText(pageNo,rect){
 const text=await readPageText(pageNo);
 const minX=Math.min(rect[0],rect[2])-4,maxX=Math.max(rect[0],rect[2])+4,minY=Math.min(rect[1],rect[3])-7,maxY=Math.max(rect[1],rect[3])+7;
 const inside=text.items.filter(item=>{
  const cx=item.x+Math.max(item.w,1)/2,cy=item.y+Math.max(item.h,1)/2;
  return cx>=minX&&cx<=maxX&&cy>=minY&&cy<=maxY;
 }).sort((a,b)=>Math.abs(a.y-b.y)>4?b.y-a.y:a.x-b.x);
 return inside.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
}
function normalizeProjectStampText(value){
 let raw=String(value||'').toUpperCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
 raw=raw.replace(/[^A-ZÅÄÖ0-9 _\/-]+/g,' ').replace(/\s+/g,' ').trim();
 if(!raw||raw.length>48||raw.split(/\s+/).length>6)return '';
 if(/^(STAMP|HIGHLIGHT|HIGHLIGHTER|FREE TEXT|FREETEXT|TEXT BOX|TEXTBOX|APPROVED|DRAFT)$/i.test(raw))return '';
 return raw;
}
function projectStampKey(value){
 const raw=normalizeProjectStampText(value);if(!raw)return '';
 if(/\d/.test(raw))return raw.replace(/[ _\/-]+/g,'');
 return raw.replace(/\s+/g,' ');
}
function projectStampRegex(value){
 const raw=normalizeProjectStampText(value),key=projectStampKey(raw);if(!raw||!key)return null;
 if(/\d/.test(key)){
  const spread=key.split('').join('[^A-ZÅÄÖ0-9]*');
  return new RegExp('(^|[^A-ZÅÄÖ0-9])'+spread+'($|[^A-ZÅÄÖ0-9])','i');
 }
 const words=raw.match(/[A-ZÅÄÖ0-9]+/g)||[];if(!words.length)return null;
 return new RegExp('(^|[^A-ZÅÄÖ0-9])'+words.join('[\\s_-]+')+'($|[^A-ZÅÄÖ0-9])','i');
}
function annotationProjectText(dict){
 const {PDFName}=PDFLib;
 for(const key of ['Contents','T','Subj']){
  const value=normalizeProjectStampText(decodePdfText(dict.get(PDFName.of(key))));
  if(value)return value;
 }
 return '';
}
async function extractProjectStamps(){
 const {PDFDocument,PDFName,PDFDict}=PDFLib;
 const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 const pending=[];
 doc.getPages().forEach((pg,pi)=>{
  const annots=pg.node.Annots();if(!annots)return;
  for(let i=0;i<annots.size();i++){
   let dict;try{dict=annots.lookup(i,PDFDict)}catch(_){continue}
   if(!dict)continue;
   const subtype=decodePdfText(dict.get(PDFName.of('Subtype'))).replace('/','');
   if(!['Stamp','Highlight','FreeText','Square'].includes(subtype))continue;
   const rect=rectFromAnnotation(dict);if(!rect)continue;
   if(stampCode(dict))continue;
   pending.push({page:pi+1,rect,order:i,meta:annotationProjectText(dict),subtype});
  }
 });
 const out=[];
 for(const mark of pending){
  const under=normalizeProjectStampText(await rawProjectStampText(mark.page,mark.rect));
  const label=under||mark.meta;
  if(!label||normalizeCode(label))continue;
  const code=projectStampKey(label);if(!code)continue;
  out.push({...mark,code,label,sourceKind:'project-code'});
 }
 return out;
}
async function extractStamps(){
 const {PDFDocument,PDFName,PDFDict,PDFArray,PDFNumber}=PDFLib;
 const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 const out=[],pending=[];
 doc.getPages().forEach((pg,pi)=>{
  const annots=pg.node.Annots();if(!annots)return;
  for(let i=0;i<annots.size();i++){
   let dict;try{dict=annots.lookup(i,PDFDict)}catch(_){continue}
   if(!dict)continue;
   const subtype=decodePdfText(dict.get(PDFName.of('Subtype'))).replace('/','');
   if(subtype!=='Stamp')continue;
   let rectArr;try{rectArr=dict.lookup(PDFName.of('Rect'),PDFArray)}catch(_){continue}
   if(!rectArr||rectArr.size()<4)continue;
   const rect=[];
   for(let n=0;n<4;n++){
    let num;try{num=rectArr.lookup(n,PDFNumber)}catch(_){}
    const v=num&&typeof num.asNumber==='function'?num.asNumber():Number(decodePdfText(rectArr.get(n)));
    rect.push(v);
   }
   if(!rect.every(Number.isFinite))continue;
   const code=stampCode(dict);
   if(code)out.push({page:pi+1,code,rect,order:i});
   else pending.push({page:pi+1,rect,order:i});
  }
 });
 for(const mark of pending){
  const code=await codeFromMarkedPageText(mark.page,mark.rect);
  if(code)out.push({...mark,code});
 }
 return out;
}
// SÖKLABB: endast markerad, läsbar text. Ingen fristående GS-textskanning.

function labCodeFromMark(value){
 const raw=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
 if(!raw)return '';
 // Treat GS 3, GS/3, 310 A, 310-A, 310/A as exact codes.
 const gs=raw.match(/(?:^|[^A-ZÅÄÖ0-9])G[\s/_-]*S[\s/_-]*(\d{1,6}[A-ZÅÄÖ]{0,3})(?=$|[^A-ZÅÄÖ0-9])/);
 if(gs)return 'GS'+gs[1];
 // Ignore common location/field labels before the actual ID, including "WC 310A" and "DÖRR 1".
 const identity=raw.match(/^(?:WC|ENTRÉ|ENTRE|DÖRR(?:NR|NUMMER)?|LITTERA|POSITION|BETECKNING|OBJEKT(?:NR|NUMMER)?|RUM|ID)\s*[:#-]?\s+(.+)$/i);
 if(identity){
  const candidate=identity[1].replace(/[\s/_-]+/g,'');
  if(/^[A-ZÅÄÖ]{0,4}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(candidate))return candidate;
 }
 const norm=raw.replace(/[\s/_-]+/g,'');
 if(/^[A-ZÅÄÖ]{0,4}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(norm))return norm;
 const tokens=raw.match(/[A-ZÅÄÖ0-9]+/g)||[];
 const candidates=[...new Set(tokens.filter(t=>/^[A-ZÅÄÖ]{0,4}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(t)))];
 return candidates.length===1?candidates[0]:'';
}
function labExactDrawingCode(value){
 // Single marked token or contiguous fragments, never unrelated neighboring labels.
 const raw=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').trim();
 // Printed room labels/fields can be adjacent to the true yellow-marked code.
 // They must never get folded into a new code such as WC310A or 310AWC.
 const tokens=raw.match(/[A-ZÅÄÖ0-9]+/g)||[];
 if(tokens.length>1&&tokens.some(t=>/^(?:WC|DÖRR|DÖRRNR|DÖRRNUMMER|LITTERA|POSITION|BETECKNING|RUM|ENTRÉ|ENTRE|ID|DT)$/.test(t)))return '';
 const compact=raw.replace(/[\s/_-]+/g,'');
 if(/^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(compact))return compact;
 if(/^[A-ZÅÄÖ]{0,4}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(compact))return compact;
 if(/^[A-ZÅÄÖ]{2,6}$/.test(compact)&&smartHasDoorCard(compact))return compact;
 return '';
}
function labSamePhysicalPosition(mark,pageNo,code,rect){
 if(mark.page!==pageNo||mark.code!==code||!Array.isArray(mark.rect))return false;
 const [a1,b1,a2,b2]=mark.rect,[c1,d1,c2,d2]=rect;
 const w1=Math.abs(a2-a1),w2=Math.abs(c2-c1),h1=Math.abs(b2-b1),h2=Math.abs(d2-d1);
 const dx=Math.abs((a1+a2-c1-c2)/2),dy=Math.abs((b1+b2-d1-d2)/2);
 const minW=Math.max(1,Math.min(w1,w2)),minH=Math.max(1,Math.min(h1,h2));
 const overlapW=Math.max(0,Math.min(Math.max(a1,a2),Math.max(c1,c2))-Math.max(Math.min(a1,a2),Math.min(c1,c2)));
 const overlapH=Math.max(0,Math.min(Math.max(b1,b2),Math.max(d1,d2))-Math.max(Math.min(b1,b2),Math.min(d1,d2)));
 // Two nearby same-code labels remain separate. Only largely coincident boxes are duplicates.
 return dx<=Math.max(2,minW*.42)&&dy<=Math.max(2,minH*.58)&&overlapW/minW>=.55&&overlapH/minH>=.42;
}
function labAlreadyLocated(list,pageNo,code,rect){
 return list.some(o=>labSamePhysicalPosition(o,pageNo,code,rect));
}
function labColorAtRect(bitmap,rect){
 // Sample an area wider than the exact PDF glyph box (some PDF baselines/widths are shifted).
 // Require colored pixels to cross the label itself, not merely touch a neighboring highlight.
 const w=Math.max(0,rect.width),h=Math.max(0,rect.height);
 if(w<1||h<1)return false;
 const padX=Math.max(3,Math.min(18,h*.9)),padY=Math.max(3,Math.min(14,h*.7));
 const x1=Math.max(0,Math.floor(rect.left-padX)),y1=Math.max(0,Math.floor(rect.top-padY));
 const x2=Math.min(bitmap.width,Math.ceil(rect.left+w+padX)),y2=Math.min(bitmap.height,Math.ceil(rect.top+h+padY));
 if(x2-x1<2||y2-y1<2)return false;
 const step=Math.max(1,Math.floor(Math.sqrt((x2-x1)*(y2-y1)/2200)));
 const bins=new Array(5).fill(0),inner=new Array(5).fill(0);
 let tested=0,colored=0,coreColored=0,coreTotal=0;
 const d=bitmap.data,width=bitmap.width;
 for(let y=y1;y<y2;y+=step)for(let x=x1;x<x2;x+=step){
  const k=(y*width+x)*4,r=d[k],g=d[k+1],b=d[k+2],a=d[k+3];
  if(a<185)continue;
  const chroma=Math.max(r,g,b)-Math.min(r,g,b);
  const qualifies=Math.max(r,g,b)>110&&chroma>=22&&chroma/Math.max(1,Math.max(r,g,b))>.08;
  tested++;if(qualifies)colored++;
  const relative=(x-rect.left)/Math.max(1,w);
  if(relative>=0&&relative<=1){
   const bin=Math.min(4,Math.floor(relative*5));
   inner[bin]++;
   if(qualifies){bins[bin]++;coreColored++}
   coreTotal++;
  }
 }
 const meaningfulBins=bins.filter((v,i)=>v>0&&v/Math.max(1,inner[i])>.045).length;
 return tested>=3&&colored>=Math.max(2,Math.ceil(tested*.027))&&
        coreColored>=Math.max(1,Math.ceil(coreTotal*.028))&&meaningfulBins>=Math.min(2,Math.ceil(coreTotal/18));
}
function labPrintedCodeCandidates(items){
 const hits=[],rows=groupTextRowsForAutomation(items);
 for(const row of rows){
  const cells=[...row.items].sort((a,b)=>a.x-b.x),occupied=new Set();
  for(let start=0;start<cells.length;start++){
   if(occupied.has(start))continue;
   let best=null;
   for(let end=start;end<Math.min(start+6,cells.length);end++){
    const segment=cells.slice(start,end+1);
    if(end>start){
     const prev=cells[end-1],now=cells[end];
     const dx=now.x-(prev.x+Math.max(prev.w,1));
     // Adjacent characters forming one code must really be close, not just in same row.
     const maxGap=Math.max(3,Math.min(13,Math.max(prev.h,now.h)*.9));
     if(dx>maxGap)break;
    }
    const raw=segment.map(o=>o.text).join(' ').replace(/\s+/g,' ').trim();
    if(raw.length>32)break;
    const code=labExactDrawingCode(raw);
    if(!code)continue;
    const rect=rectForTextItems(segment,1.8);if(!rect)continue;
    const uniquePart=segment.length===1;
    // Prefer full contiguous code 310A over truncated 310 and GS3 over G / S / 3.
    const score=code.length*10+segment.length*2+(uniquePart?1:0);
    if(!best||score>best.score)best={code,rect,label:raw,score,end,start};
   }
   if(!best)continue;
   for(let i=start;i<=best.end;i++)occupied.add(i);
   const loc={code:best.code,rect:best.rect,label:best.label};
   if(!labAlreadyLocated(hits.map(o=>({...o,page:1})),1,loc.code,loc.rect))hits.push(loc);
  }
 }
 return hits;
}

// Search TEST v6: Color-first geometry; then PDF text; then door-card matching (existing logic).
function labIsHighlightedPixel(r,g,b,a){
 if(a<185)return false;
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
 return mx>=132&&mx-mn>=27&&(mx-mn)/Math.max(1,mx)>.105;
}
function labFindColorPatches(bitmap){
 // Each rendered page is capped at 2.6 megapixels. A 2/3-pixel grid keeps iPhone memory bounded.
 const stride=Math.max(2,Math.ceil(Math.max(bitmap.width,bitmap.height)/1500));
 const gw=Math.ceil(bitmap.width/stride),gh=Math.ceil(bitmap.height/stride);
 const color=new Uint8Array(gw*gh),seen=new Uint8Array(gw*gh);
 const d=bitmap.data;
 for(let gy=0;gy<gh;gy++){
  const y=Math.min(bitmap.height-1,gy*stride+Math.floor(stride/2));
  for(let gx=0;gx<gw;gx++){
   const x=Math.min(bitmap.width-1,gx*stride+Math.floor(stride/2)),at=(y*bitmap.width+x)*4;
   if(labIsHighlightedPixel(d[at],d[at+1],d[at+2],d[at+3]))color[gy*gw+gx]=1;
  }
 }
 const regions=[],queue=new Int32Array(color.length);
 for(let i=0;i<color.length;i++){
  if(!color[i]||seen[i])continue;
  let head=0,tail=0,count=0,minX=gw,maxX=0,minY=gh,maxY=0;
  queue[tail++]=i;seen[i]=1;
  while(head<tail){
   const at=queue[head++],x=at%gw,y=(at-x)/gw;
   count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(let yy=Math.max(0,y-1);yy<=Math.min(gh-1,y+1);yy++){
    for(let xx=Math.max(0,x-1);xx<=Math.min(gw-1,x+1);xx++){
     const n=yy*gw+xx;
     if(!seen[n]&&color[n]){seen[n]=1;queue[tail++]=n}
    }
   }
  }
  const width=(maxX-minX+1)*stride,height=(maxY-minY+1)*stride;
  const fill=count/Math.max(1,(maxX-minX+1)*(maxY-minY+1));
  if(count<5||width<7||height<5||width>bitmap.width*.36||height>bitmap.height*.16)continue;
  if(width/Math.max(1,height)<.72||width/Math.max(1,height)>24||fill<.13)continue;
  regions.push({left:minX*stride,top:minY*stride,width,height,fill,count});
 }
 return regions;
}
function labPatchPdfRect(vp,patch){
 const a=vp.convertToPdfPoint(patch.left,patch.top);
 const b=vp.convertToPdfPoint(patch.left+patch.width,patch.top+patch.height);
 return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
}
function labPatchOverlap(patch,box){
 const width=Math.max(1,box.width),height=Math.max(1,box.height);
 const intersectionWidth=Math.max(0,Math.min(patch.left+patch.width,box.left+box.width)-Math.max(patch.left,box.left));
 const intersectionHeight=Math.max(0,Math.min(patch.top+patch.height,box.top+box.height)-Math.max(patch.top,box.top));
 return (intersectionWidth/width)*(intersectionHeight/height);
}
function labPatchCodes(patch,items,vp){
 const margin=Math.max(2,Math.min(8,patch.height*.38));
 const boundary={left:patch.left-margin,top:patch.top-margin,width:patch.width+margin*2,height:patch.height+margin*2};
 const relevant=items.filter(item=>{
  const r=rectForTextItems([item],0);if(!r)return false;
  const box=viewportRect(vp,r),coverage=labPatchOverlap(boundary,box);
  // A PDF text item can contain a whole line; also accept an item covering the mark.
  return coverage>.16||labPatchOverlap(box,boundary)>.38;
 });
 if(!relevant.length)return [];
 const candidates=labPrintedCodeCandidates(relevant);
 // Sometimes PDF.js keeps two adjacent words as a single text item. Extract
 // substrings and estimate their bounding boxes instead of swallowing WC/other text.
 for(const item of relevant){
  const raw=String(item.text||'');
  if(labExactDrawingCode(raw))continue; // Already read as one full ID; no substring '310' from '310 A'.
  const matches=[...raw.matchAll(/(?:G[\s/_-]*S[\s/_-]*[0-9]{1,6}[A-ZÅÄÖ0-9]{0,5}|[A-ZÅÄÖ]{0,3}[0-9]{1,6}[A-ZÅÄÖ]{0,3})/gi)];
  if(raw.length>45)continue;
  for(const match of matches){
   if(match.index===0&&match[0].length===raw.length)continue;
   const code=labExactDrawingCode(match[0]);if(!code)continue;
   const fracStart=match.index/Math.max(1,raw.length),fracEnd=(match.index+match[0].length)/Math.max(1,raw.length);
   const x=item.x+item.w*fracStart,w=item.w*(fracEnd-fracStart);
   const segment={...item,text:match[0],x,w};
   const rect=rectForTextItems([segment],1);
   if(rect)candidates.push({code,rect,label:match[0]});
  }
 }
 const accepted=[];
 for(const candidate of candidates){
  const box=viewportRect(vp,candidate.rect);
  const coverage=labPatchOverlap(patch,box);
  const marginCoverage=labPatchOverlap(boundary,box);
  if(coverage<.16||marginCoverage<.38)continue;
  if(!accepted.some(o=>o.code===candidate.code&&labSamePhysicalPosition({page:1,code:o.code,rect:o.rect},1,candidate.code,candidate.rect))){
   accepted.push({...candidate,coverage,score:coverage*100+Math.min(15,candidate.code.length)*2});
  }
 }
 return accepted.sort((a,b)=>b.score-a.score);
}
function labLegacyColorAtRect(bitmap,rect){
 // Second, independent color check used in TEST v4. Helps restore position labels
 // missed when connected-color segments are broken up by lines or outlines.
 const x1=Math.max(0,Math.floor(rect.left)),y1=Math.max(0,Math.floor(rect.top));
 const x2=Math.min(bitmap.width,Math.ceil(rect.left+rect.width));
 const y2=Math.min(bitmap.height,Math.ceil(rect.top+rect.height));
 if(x2-x1<2||y2-y1<2)return false;
 const step=Math.max(1,Math.floor(Math.sqrt((x2-x1)*(y2-y1)/2000)));
 let tested=0,colored=0;const d=bitmap.data,w=bitmap.width;
 for(let y=y1;y<y2;y+=step)for(let x=x1;x<x2;x+=step){
  const at=(y*w+x)*4,r=d[at],g=d[at+1],b=d[at+2],a=d[at+3];
  if(a<190)continue;
  tested++;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max>115&&(max-min)>=24&&(max-min)/Math.max(1,max)>.09)colored++;
 }
 return tested>0&&colored>=Math.max(2,Math.ceil(tested*.075));
}

// Instrumentation: report every rejection separately, with no document data uploaded.
function smartAuditPage(page){
 if(!smartScanAudit.pages[page])smartScanAudit.pages[page]={
   page,annotations:0,validMetadata:0,unreadableMetadata:0,
   textItems:0,rendered:false,colorPatches:0,patchesWithText:0,
   colorFirst:0,textColor:0,ocrPending:0,ocrRecovered:0,renderError:''
 };
 return smartScanAudit.pages[page];
}
function smartAuditReason(reason){
 smartScanAudit.reasons[reason]=(smartScanAudit.reasons[reason]||0)+1;
}
function smartAuditAddCode(code){
 smartScanAudit.annotationCodes[code]=(smartScanAudit.annotationCodes[code]||0)+1;
}
function smartExportAudit(){
 const pages=Object.values(smartScanAudit.pages).sort((a,b)=>a.page-b.page);
 const result={
  version:'SmartMatch TEST v36',
  documentName:currentFileName,
  pages:pdf?.numPages||0,
  totals:{
   numberedGSFromAnnotations:smartScanStats.gsAnnotationsSeen||0,
   discoveredGS:stamps.length,
   linkedGS:stamps.filter(p=>(protocolCandidates[p.code]||[]).length>0).length,
   cards:smartScanStats.cards||0,
   cardFirstTextHits:smartCardFirstTextHits,
   cardFirstRows:smartDoorCardFirstRows,
   colorFirst:smartScanAudit.colorFirst,
   textColor:smartScanAudit.textColor,
   pendingOcr:smartPendingOcr.length,
   ocrSuggestions:smartScanAudit.ocrAccepted
  },
  doorCardCodes:Object.keys(smartDoorCardIndex).sort(),
  gsCounts:Object.fromEntries([...new Set(stamps.filter(x=>/^GS\d/.test(x.code)).map(x=>x.code))].sort().map(c=>[c,stamps.filter(s=>s.code===c).length])),
  reasons:smartScanAudit.reasons,
  pages,
  ocrSuggestions:(smartScanAudit.ocrSuggestions||[]).map(x=>({page:x.page,code:x.code,confidence:x.confidence,rect:x.rect}))
 };
 const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=(currentFileName||'ritning').replace(/\.pdf$/i,'')+'-sokrapport-v35.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}

// Optional browser OCR: run only when user presses the button.
// Do not upload documents; worker and language packages are downloaded lazily.
async function smartLoadOcrLibrary(){
 if(window.Tesseract?.createWorker)return window.Tesseract;
 if(!smartOcrLibraryPromise){
  smartOcrLibraryPromise=new Promise((resolve,reject)=>{
   const sc=document.createElement('script');
   sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
   sc.async=true;sc.crossOrigin='anonymous';
   sc.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR-biblioteket laddades men kunde inte starta'));
   sc.onerror=()=>reject(new Error('OCR-biblioteket kunde inte laddas. Kontrollera internetanslutningen.'));
   document.head.appendChild(sc);
  }).catch(e=>{smartOcrLibraryPromise=null;throw e});
 }
 return smartOcrLibraryPromise;
}
async function smartAcceptOcrSuggestion(item){
 if(!pdf||!item||!item.rect)return;
 if(stamps.some(m=>labSamePhysicalPosition(m,item.page,item.code,item.rect))){
  window.alert('Den positionen finns redan på ritningen.');return;
 }
 const isGs=/^GS\d/.test(item.code);
 const confirmed={code:item.code,page:item.page,rect:item.rect,label:item.code,
  order:950000+stamps.length+projectStamps.length,
  sourceKind:isGs?'gs':'project-code',subtype:'ocr-reviewed',
  scanSource:'ocr-confirmed',confidence:item.confidence};
 // Keep only manually confirmed OCR markers in the saved project state.
 smartConfirmedOcr.push({page:item.page,code:item.code,rect:[...item.rect],confidence:item.confidence});
 (isGs?stamps:projectStamps).push(confirmed);
 buildInstances();await recalcAll();
 smartAuditReason('ocrManuallyConfirmed');
 await renderDrawing();renderGroups();updateStats();smartRenderGSReport();smartRenderScanAudit();
 if(item.button){item.button.disabled=true;item.button.textContent='Tillagd på ritningen'}
}
function smartShowOcrResult(item){
 const root=document.getElementById('smartOcrResults');if(!root)return;
 const row=document.createElement('div');row.className='smartOcrResult';
 const name=document.createElement('span');
 name.textContent='Sida '+item.page+' · '+item.code+' · OCR '+Math.round(item.confidence)+' %'+(smartHasDoorCard(item.code)?' · har dörrkort':' · dörrkort saknas');
 const button=document.createElement('button');button.type='button';button.textContent='Bekräfta position';
 item.button=button;button.onclick=()=>smartAcceptOcrSuggestion(item).catch(e=>window.alert(String(e)));
 row.append(name,button);root.appendChild(row);
}
async function smartRunOcrReview(){
 const button=document.getElementById('smartRunOcr');
 const status=document.getElementById('smartOcrStatus');
 const remaining=smartPendingOcr.length;
 if(!pdf||!remaining){status.textContent=pdf?'Ingen ytterligare färgmarkering väntar på OCR.':'Öppna först en PDF.';return}
 button.disabled=true;
 const pdfAtStart=pdf;
 let worker=null;const batch=smartPendingOcr.splice(0,Math.min(35,remaining));
 const byPage=new Map();
 for(const p of batch){const group=byPage.get(p.page)||[];group.push(p);byPage.set(p.page,group)}
 try{
  status.textContent='Laddar OCR-motorn. Biblioteket hämtas från CDN, men ritningsbilder analyseras i webbläsaren…';
  const lib=await smartLoadOcrLibrary();
  worker=await lib.createWorker('eng',1);
  await worker.setParameters({tessedit_pageseg_mode:7,tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /-'});
  let done=0;
  for(const [pageNo,entries] of byPage){
   if(pdf!==pdfAtStart){status.textContent='OCR avbruten: en annan PDF har öppnats.';break}
   const pageObj=await pdfAtStart.getPage(pageNo),vp0=pageObj.getViewport({scale:1});
   const factor=Math.max(.25,Math.min(2.5,Math.sqrt(2700000/Math.max(1,vp0.width*vp0.height))));
   const vp=pageObj.getViewport({scale:factor});
   const pageCanvas=document.createElement('canvas'),pc=pageCanvas.getContext('2d');
   if(!pc)continue;
   pageCanvas.width=Math.ceil(vp.width);pageCanvas.height=Math.ceil(vp.height);
   try{
    await pageObj.render({canvasContext:pc,viewport:vp}).promise;
    for(const entry of entries){
     done++;status.textContent='OCR-granskning '+done+'/'+batch.length+' · sida '+pageNo+'…';
     const rect=viewportRect(vp,entry.rect),margin=5;
     const left=Math.max(0,Math.floor(rect.left-margin)),top=Math.max(0,Math.floor(rect.top-margin));
     const w=Math.min(pageCanvas.width-left,Math.ceil(rect.width+margin*2));
     const h=Math.min(pageCanvas.height-top,Math.ceil(rect.height+margin*2));
     if(w<=3||h<=3)continue;
     const ratio=Math.min(4,600/Math.max(1,w),150/Math.max(1,h));
     const crop=document.createElement('canvas');crop.width=Math.ceil(w*ratio);crop.height=Math.ceil(h*ratio);
     const ctx=crop.getContext('2d');if(!ctx)continue;
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,crop.width,crop.height);
     ctx.filter='grayscale(1) contrast(1.7)';
     ctx.drawImage(pageCanvas,left,top,w,h,0,0,crop.width,crop.height);
     try{
      const {data}=await worker.recognize(crop);
      const raw=String(data?.text||'').trim();
      const normalized=labStrictAnnotationCode(raw)||labCodeFromMark(raw)||smartExactCardText(raw);
      if(!normalized||!/^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(normalized)&&!smartHasDoorCard(normalized)){
       smartAuditReason('ocrNoExactCode');continue;
      }
      const confidence=Number(data?.confidence||0);
      if(confidence<35){smartAuditReason('ocrLowConfidence');continue}
      if(stamps.some(m=>labSamePhysicalPosition(m,pageNo,normalized,entry.rect)))continue;
      const item={page:pageNo,rect:entry.rect,code:normalized,confidence};
      smartScanAudit.ocrSuggestions.push(item);
      smartScanAudit.ocrAccepted++;
      smartShowOcrResult(item);
     }catch(err){smartScanAudit.ocrErrors.push('Sida '+pageNo+': '+String(err?.message||err))}
    }
   }catch(err){smartScanAudit.ocrErrors.push('Sida '+pageNo+': '+String(err?.message||err))}
   finally{pageCanvas.width=0;pageCanvas.height=0}
  }
  status.textContent='OCR klar: '+smartScanAudit.ocrAccepted+' förslag totalt, '+smartPendingOcr.length+' områden kvar. Förslagen läggs INTE till förrän du bekräftar dem.';
 }catch(err){
  // OCR is optional: leave the PDF scan and original positions untouched.
  status.textContent='OCR kunde inte köras: '+String(err?.message||err);
  smartScanAudit.ocrErrors.push(String(err?.message||err));
  smartPendingOcr.unshift(...batch);
 }finally{
  if(worker)try{await worker.terminate()}catch(_){}
  button.disabled=false;smartRenderScanAudit();
 }
}

function smartRenderScanAudit(){
 const el=document.getElementById('smartScanAudit');
 if(!el)return;
 const pages=Object.values(smartScanAudit.pages);
 const reported=pages.filter(x=>x.rendered).length;
 const drawingPages=Math.max(0,scanPageLimit()-smartDoorCardPages.size);
 const textless=pages.filter(x=>x.rendered&&!x.textItems).length;
 const extras=smartScanAudit.ocrAccepted||0;
 const head='PDF-analys: '+(smartScanStats.gsAnnotationsSeen||0)+' GS från PDF-markeringar · '+
 (smartScanAudit.colorFirst||0)+' färg+text · '+(smartScanAudit.textColor||0)+' text+färg · '+
 smartPendingOcr.length+' färgområden för OCR-granskning · '+extras+' OCR-förslag';
 const summary=document.getElementById('smartScanAuditSummary');
 if(summary)summary.textContent='PDF-analys';
 const pageCounts=document.getElementById('smartPdfPageCounts');
 if(pageCounts)pageCounts.textContent=drawingPages+' ritningssidor · '+smartDoorCardPages.size+' dörrkort · '+scanPageLimit()+' originalsidor';
 const body=document.getElementById('smartScanAuditRows');if(!body)return;body.replaceChildren();
 const headings=['Sida','Annot.','PDF-text','Färgområden','Färg+text','Text+färg','OCR-kö','Fel'];
 const table=document.createElement('table'),th=document.createElement('thead'),tr=document.createElement('tr');
 for(const h of headings){const cell=document.createElement('th');cell.textContent=h;cell.style.cssText='text-align:left;padding:6px;border-bottom:1px solid #c7dbe3';tr.appendChild(cell)}
 th.appendChild(tr);table.appendChild(th);const tbody=document.createElement('tbody');
 for(const p of pages.sort((a,b)=>a.page-b.page)){
  const line=document.createElement('tr');
  for(const val of [p.page,p.validMetadata,p.textItems,p.colorPatches,p.colorFirst,p.textColor,p.ocrPending,p.renderError||'–']){
   const td=document.createElement('td');td.textContent=String(val);td.style.cssText='padding:6px;border-bottom:1px solid #e2eaee';line.appendChild(td)
  }
  tbody.appendChild(line);
 }
 table.appendChild(tbody);body.appendChild(table);
}

async function extractLabGraphicPositions(already=[]){
 const out=[];labGraphicsCandidates=0;labGraphicPositions=0;labColorFirstPositions=0;labFallbackPositions=0;
 let patchesFound=0,patchesWithText=0,unreadableDrawingPages=0;
 for(let p=1;p<=scanPageLimit();p++){
  smartLoadProgress(42+Math.floor(29*(p-1)/Math.max(1,scanPageLimit())),'Granskar färger och markeringar');
  const text=await readPageText(p);
  const audit=smartAuditPage(p);
  audit.textItems=text.items.length;
  // Do not reject a drawing just because it contains no PDF text.
  // OCR can inspect its colored labels later. Only known door-card pages are skipped.
  if(smartDoorCardPages.has(p)){smartAuditReason('recognizedDoorCardPage');continue}
  const hasMarker=already.some(o=>o.page===p&&scanHasDoorCard(o.code));
  if(!hasMarker&&!scanPageHasRelevantText(text,p)){
   audit.skippedNoCardId=true;smartAuditReason('skippedNoDoorCardId');continue;
  }
  const pg=await pdf.getPage(p),natural=pg.getViewport({scale:1});
  // Sequential scans: controlled resolution and one bitmap at a time.
  const scale=Math.min(1.5,Math.sqrt(3200000/Math.max(1,natural.width*natural.height)),2600/natural.width,2600/natural.height);
  const vp=pg.getViewport({scale:Math.max(.02,scale)});
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)continue;
  canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));
  try{
   setState('SmartMatch v35: granskar färg och text sida '+p+' av '+pdf.numPages+'…');
   await pg.render({canvasContext:ctx,viewport:vp}).promise;
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
   audit.rendered=true;
   const patches=labFindColorPatches(pixels);audit.colorPatches=patches.length;
   patchesFound+=patches.length;
   if(!text.items.length&&patches.length)unreadableDrawingPages++;
   for(const patch of patches){
    const codes=labPatchCodes(patch,text.items,vp);
    if(!codes.length){
     // Keep bounded OCR queue for review; color patches without readable PDF text
     // are not silently rejected and will not create false protocol links.
     if(smartPendingOcr.length<220&&audit.ocrPending<60&&patch.width>=14&&patch.height>=8&&patch.width<=260&&patch.height<=95){
      smartPendingOcr.push({page:p,rect:labPatchPdfRect(vp,patch),source:'colored-no-readable-id'});
      audit.ocrPending++;
     }
     smartAuditReason('coloredPatchWithoutReadableId');continue;
    }
    patchesWithText++;audit.patchesWithText++;
    // A colored island can contain several labels; keep distinct exact text boxes.
    for(const candidate of codes){
     if(!scanHasDoorCard(candidate.code))continue;
     const displayRect=candidate.rect; // Exact location of the read code, not a nearby label.
     if(labAlreadyLocated([...already,...out],p,candidate.code,displayRect)){smartAuditReason('duplicateColorCandidate');continue}
     out.push({page:p,code:candidate.code,rect:displayRect,
      order:200000+out.length,sourceKind:candidate.code.startsWith('GS')?'gs':'project-code',
      label:candidate.label,subtype:'color-first-pdf',scanScore:Math.round(candidate.coverage*100)});
     labColorFirstPositions++;audit.colorFirst++;smartScanAudit.colorFirst++;
    }
   }
   // Restoration pass: if the connected-color scan missed a highlighted label,
   // retain the reliable TEST v5 text candidates on the SAME rendered page.
   // This is additive, never removes any of the color-first discoveries.
   const legacyCandidates=labPrintedCodeCandidates(text.items);
   for(const candidate of legacyCandidates){
    if(!scanHasDoorCard(candidate.code))continue;
    if(labAlreadyLocated([...already,...out],p,candidate.code,candidate.rect))continue;
    const drawn=viewportRect(vp,candidate.rect);
    if(!labColorAtRect(pixels,drawn)&&!labLegacyColorAtRect(pixels,drawn))continue;
    if(labAlreadyLocated([...already,...out],p,candidate.code,candidate.rect))continue;
    out.push({...candidate,page:p,order:300000+out.length,
      sourceKind:candidate.code.startsWith('GS')?'gs':'project-code',subtype:'text-color-fallback'});
    labFallbackPositions++;audit.textColor++;smartScanAudit.textColor++;
   }
  }catch(error){audit.renderError=String(error?.message||error);smartAuditReason('renderError');console.warn('Färgscanning av ritning sida '+p,error)}
  finally{canvas.width=0;canvas.height=0;if(DRAWING_IS_MOBILE)pg.cleanup()}
 }
 smartLoadProgress(71,'Färgmarkeringar granskade');
 labGraphicPositions=out.length;labGraphicsCandidates=out.length;
 console.info('[SmartMatch v36]',{patchesFound,patchesWithText,linkedCandidates:out.length,colorFirst:labColorFirstPositions,textFallback:labFallbackPositions,unreadableDrawingPages});
 return out;
}


function labStrictAnnotationCode(value){
 // Accept ONLY the annotation's own actual identifier, not arbitrary numbers
 // in its notes, neighboring drawing, room descriptions or equipment lists.
 const raw=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').replace(/[–—]/g,'-').trim();
 if(!raw||raw.length>35)return '';
 const compact=raw.replace(/[\s/_-]+/g,'');
 if(/^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(compact))return compact;
 if(/^[A-ZÅÄÖ]{0,4}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(compact))return compact;
 return '';
}


function smartNormalizeGS(value){
 const raw=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').trim();
 const compact=raw.replace(/[\s/_-]+/g,'');
 return /^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(compact)?compact:'';
}
function smartGSInHeader(line){
 const raw=String(line||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').trim();
 if(!raw||/^(?:SIDA|PAGE|SIDNR|SIDAN|REVISION|REV|VERSION|DATUM|ANTAL|RITNINGSNUMMER|PROJEKTNUMMER|ORDERNR|AO|RUMSNAMN)\b/.test(raw))return '';
 if(/\b(?:LÅSHUS|LASHUS|SLUTBLECK|CYLINDER|TRYCKE|BESLAG|FABRIKAT|MATERIAL|MONTERAS|LEVERERAS)\b/.test(raw))return '';
 const matches=[...raw.matchAll(/(?:^|[^A-ZÅÄÖ0-9])G[\s/_-]*S[\s/_-]*(\d{1,6}[A-ZÅÄÖ]{0,3})(?=$|[^A-ZÅÄÖ0-9])/g)];
 const codes=[...new Set(matches.map(m=>'GS'+m[1]))];
 return codes.length===1?codes[0]:'';
}

function smartHeaderCode(value){
 const text=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
 if(!text)return '';
 if(/^(?:SIDA|PAGE|SIDNR|SIDAN|REVISION|REV|VERSION|DATUM|ANTAL|RITNINGSNUMMER|PROJEKTNUMMER|ORDERNR|AO|RUMSNAMN)\b/.test(text))return '';
 // Accept GS3, GS / 3, "WC GS3", "GS3 WC", "Dörrkort GS3" in header area.
 const gs=smartGSInHeader(text);if(gs)return gs;
 if(/(?:G[\s/_-]*S[\s/_-]*\d)/.test(text))return ''; // Two GS IDs or a malformed combination: never guess.
 const prefix=text.replace(/^(?:DÖRR(?:NUMMER|NR)?|LITTERA|POSITION|BETECKNING|OBJEKT(?:NR|NUMMER)?|DÖRRKORT|WC|ENTRÉ|ENTRE|ID)\s*[:#-]?\s+/i,'');
 if(prefix===text&&text.length>25)return '';
 return labStrictAnnotationCode(prefix);
}
function smartDoorCardSignals(raw,headerCodes=[]){
 const text=String(raw||'');
 const named=/(?:dörrkort|dorrkort|beslagskort|beslagsförteckning|dörrspecifikation|dorrspecifikation)/i.test(text);
 const heading=/(?:littera|dörrnummer|dorrnummer|dörrnr|dorrnr|antal)/i.test(text);
 const hardware=/(?:daglåsning|daglasning|nattlåsning|nattlasning|låshus|lashus|slutbleck|cylinder|trycke|beslag|styrbleck)/i.test(text);
 const controls=/(?:egenkontroll|besiktning|provning|kontrollpunkt|kontrollpunkter)/i.test(text);
 const gsCode=headerCodes.some(code=>/^GS\d/.test(code));
 const equipmentGroups=['låshus','lashus','slutbleck','cylinder','trycke','beslag','styrbleck','daglås','daglas','nattlås','nattlas'].filter(word=>text.toLowerCase().includes(word)).length;
 if(/\b(?:PLANRITNING|PLAN\s*RITNING|SKALA\s*1\s*:)\b/i.test(text)&&!named&&!controls&&!heading)return false;
 return (named&&(hardware||heading||controls))||
  (heading&&hardware&&(controls||/låsning|lasning/i.test(text)))||
  (gsCode&&hardware&&(controls||equipmentGroups>=2));
}


function smartNormalizeCardLabel(value){
 const raw=String(value||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').replace(/[–—]/g,'-').trim();
 if(!raw||raw.length>36)return '';
 const compact=raw.replace(/[\s/_-]+/g,'');
 if(/^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(compact))return compact;
 if(/^[A-ZÅÄÖ]{0,5}\d{1,6}[A-ZÅÄÖ]{0,4}$/.test(compact))return compact;
 // Room and entrance identity can be alphabetic: HVC, WC, RWC, STÄD...
 // Never turn a multiword document heading into a synthesized door identity.
 if(/^[A-ZÅÄÖ]{2,6}$/.test(compact) && /^[A-ZÅÄÖ]{2,6}$/.test(raw))return compact;
 if(/^[A-ZÅÄÖ]{2,6}[\s/_-]+\d{1,5}[A-ZÅÄÖ]{0,2}$/.test(raw))return compact;
 if(/^[A-ZÅÄÖ]{2,6}[\s/_-]+[A-ZÅÄÖ]$/.test(raw))return compact;
 return '';
}
function smartFirstRowIdentifier(row){
 let raw=String(row||'').toUpperCase().replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
 if(!raw)return '';
 // Skip PDF/document title rows; they cannot be card identities.
 if(/^(?:SNIDAREN|ETAPP|PROJEKT|RITNING|PLANRITNING|UPPRÄTTAD|REVIDERAD|SIDAN?|PAGE|REV(?:ISION)?|DATUM|LÅSHANDLING|HANDLING|BESKRIVNING|INNEHÅLL|KUND|BESTÄLLARE|ENTREPRENÖR|ARTIKEL|FABRIKAT|LÅSHUS|SLUTBLECK|CYLINDER|TRYCKE|BESLAG|ANTAL|ANMÄRKNING|ANSVAR|KONTROLLPUNKT)\b/.test(raw))return '';
 // A heading such as "Dörrkort WC" is valid. The stand-alone text
 // "Dörrkort" itself is not an identity.
 raw=raw.replace(/^(?:DÖRRKORT|DÖRRSPECIFIKATION|BESLAGSKORT|DÖRR(?:NUMMER|NR)?|LITTERA|BETECKNING|OBJEKT(?:NUMMER|NR)?|POSITION|ID)\s*[:#-]?\s*/,'').trim();
 if(!raw)return '';
 const gs=smartGSInHeader(raw);
 if(gs)return gs; // WC GS10 means GS10, not WC.
 if(/(?:^|[^A-ZÅÄÖ0-9])G[\s/_-]*S[\s/_-]*\d/.test(raw))return '';
 if(/^(?:DÖRRKORT|DÖRR|ID|WC\s+GS\s+\d+)$/.test(raw))return '';
 const code=smartNormalizeCardLabel(raw);
 if(!code || /^(?:GS|WCWC|LOKAL|PLAN|KORT|DÖRR|SIDA|NAMN|TYP|DATUM|VERSION|STATUS|KUND|BESLAG|ANTAL|KOD|ID)$/.test(code))return '';
 return code;
}
function smartFirstCardIdentity(text,viewportHeight){
 const rows=labHeaderRows(text);
 const topItems=(text?.items||[]).filter(o=>o.y>=viewportHeight*.58);
 const upper=labHeaderRows({items:topItems});
 // Prefer the FIRST recognizable door ID row, rather than scanning every
 // hardware/equipment row for a number that looks like a code.
 for(const [n,row] of upper.slice(0,18).entries()){
  const code=smartFirstRowIdentifier(row);
  if(code)return {code,row,order:n,area:'top'};
 }
 // Some PDFs use a nonstandard CropBox; keep a bounded fallback.
 for(const [n,row] of rows.slice(0,10).entries()){
  const code=smartFirstRowIdentifier(row);
  if(code)return {code,row,order:n,area:'first-rows'};
 }
 return null;
}
function smartExactCardText(raw){
 // A drawing match must be the whole code, not an arbitrary part of WC101.
 const key=smartNormalizeCardLabel(raw);
 return key && smartHasDoorCard(key)?key:'';
}
function smartFindCardFirstTextPositions(existing=[]){
 // Exact, card-driven PDF-text search. Works for WC/HVC without digits and
 // without colored backgrounds. Each occurrence retains independent coordinates.
 let found=[],seen=0;
 const cardPatterns=Object.keys(smartDoorCardIndex).filter(code=>code.length>=2&&code.length<=18).map(code=>({code,rx:new RegExp('(^|[^A-ZÅÄÖ0-9])('+code.replace(/[^A-ZÅÄÖ0-9]/g,'').split('').join('[\\s/_-]*')+')(?=$|[^A-ZÅÄÖ0-9])','g')}));
 return (async()=>{
  for(let p=1;p<=scanPageLimit();p++){
   smartLoadProgress(78+Math.floor(12*(p-1)/Math.max(1,scanPageLimit())),'Matchar dörr-ID på ritningen');
   if(smartDoorCardPages.has(p))continue;
   const candidateText=await readPageText(p);
   if(!scanPageHasRelevantText(candidateText,p))continue;
   setState('SmartMatch TEST v36.11: söker dörrkortens ID på ritning sida '+p+' av '+pdf.numPages+'…');
   const text=await readPageText(p),rows=groupTextRowsForAutomation(text.items);
   const matches=[];
   for(const [rowNo,row] of rows.entries()){
    const cells=[...(row.items||[])].filter(c=>String(c.text||'').trim()).sort((a,b)=>a.x-b.x);
    for(let start=0;start<cells.length;start++){
     // Search up to four adjacent PDF text fragments. Longer matches win so
     // WC1 is not shortened to WC when both labels exist as card IDs.
     for(let end=start;end<Math.min(start+4,cells.length);end++){
      if(end>start){
       const a=cells[end-1],b=cells[end],gap=b.x-(a.x+Math.max(a.w,1));
       if(Math.abs(b.y-a.y)>Math.max(4,Math.min(a.h,b.h)*.7)||
          gap>Math.max(4,Math.min(15,Math.max(a.h,b.h)*1.1)))break;
      }
      const segment=cells.slice(start,end+1);
      const raw=segment.map(v=>v.text).join(' ').trim();
      const code=smartExactCardText(raw);
      if(!code)continue;
      const rect=rectForTextItems(segment,1.2);if(!rect)continue;
      matches.push({page:p,rowNo,code,rect,raw,start,end,score:code.length*15+(end-start+1)*3});
     }
     // One PDF text item can contain the identity plus a room description.
     // Match exact token boundaries, never substrings of longer codes.
     const item=cells[start],raw=String(item.text||'').toUpperCase();
     if(raw.length<5||raw.length>90||smartExactCardText(raw))continue;
     if(/\b(?:SLUTBLECK|LÅSHUS|CYLINDER|TRYCKE|ARTIKEL|MONTERAS|ANTAL)\b/.test(raw))continue;
     for(const {code,rx} of cardPatterns){
      for(const match of raw.matchAll(rx)){
       const offset=match.index+match[1].length;
       // "WC GS10" has a contextual room prefix, not necessarily two door IDs.
       if(code==='WC'&&/^\s*WC\s+G[\s/_-]*S[\s/_-]*\d/.test(raw))continue;
       const fraction=offset/Math.max(1,raw.length),portion=match[2].length/Math.max(1,raw.length);
       const label={...item,text:match[2],x:item.x+item.w*fraction,w:item.w*portion};
       const rect=rectForTextItems([label],1.2);if(!rect)continue;
       matches.push({page:p,rowNo,code,rect,raw:match[2],start,end:start,score:code.length*15-5});
      }
     }
    }
   }
   matches.sort((a,b)=>b.score-a.score||a.start-b.start);
   for(const m of matches){
    if(labAlreadyLocated([...existing,...found],p,m.code,m.rect))continue;
    // Only suppress a weaker reading when it actually overlaps the *same*
    // physical label. Identical WC labels on different rows stay separate.
    const overwritten=found.some(x=>{
      if(x.page!==p||x.rowNo!==m.rowNo||x.score<m.score)return false;
      const r=x.rect,t=m.rect;
      const overlapW=Math.max(0,Math.min(r[2],t[2])-Math.max(r[0],t[0]));
      const overlapH=Math.max(0,Math.min(r[3],t[3])-Math.max(r[1],t[1]));
      const area=Math.max(1,Math.min(Math.abs((r[2]-r[0])*(r[3]-r[1])),Math.abs((t[2]-t[0])*(t[3]-t[1]))));
      return overlapW*overlapH/area>.67;
    });
    if(overwritten)continue;
    found.push({page:p,rowNo:m.rowNo,score:m.score,code:m.code,rect:m.rect,order:850000+seen++,
      label:m.raw,sourceKind:m.code.startsWith('GS')?'gs':'project-code',
      subtype:'doorcard-first-pdf-text',scanSource:'doorcard-first-text',scanScore:65});
   }
  }
  smartLoadProgress(90,'Dörr-ID matchade');
  smartCardFirstTextHits=found.length;
  return found;
 })();
}

/* SmartMatch TEST v36.11: detect floor/area names from the title block,
   normally in the LOWER-RIGHT of each drawing. Text is extracted from the
   original PDF at 100% scale; zoom never affects the floor label. */
function smartTitleFromDrawingRow(value){
 const text=String(value||'').toUpperCase().normalize('NFC')
  .replace(/[\u00a0\u2007\u202f]/g,' ').replace(/[–—]/g,'-')
  .replace(/\s+/g,' ').trim();
 if(!text||text.length>210)return '';
 // Prefer the printed name, not an assumed floor number.
 const rx=/\b(?:PLANRITNING\s+)?(?:PLAN|VÅNING|VÅN\.?)\s*[:.#]?\s*(-?\d{1,2}[A-Z]?(?:\s*[-/]\s*\d{1,2})?|BV|KÄLLARE|KALLARE|ENTRÉ|ENTRE|BOTTEN|MARK|VIND|TAK)\b|(?:\b(?:KÄLLARPLAN|KALLARPLAN|ENTRÉPLAN|ENTREPLAN|BOTTENPLAN|MARKPLAN|VINDSPLAN|TAKPLAN|SOUTERRÄNGSPLAN|SUTERRÄNGSPLAN|KÄLLARE|KALLARE|ENTRÉVÅNING|ENTREVANING)\b)/ig;
 const hits=[...text.matchAll(rx)];
 if(hits.length){
  const h=hits[0][0].trim();
  // PLANRITNING without floor or location is not a floor label.
  const match=h.match(/(?:PLANRITNING\s+)?(PLAN|VÅNING|VÅN\.?)\s*[:.#]?\s*(.+)/i);
  return match?(match[1].startsWith('VÅN')?'VÅNING ':'PLAN ')+match[2].trim():h;
 }
 // Free-form area names are only accepted in a title block; never treat
 // e.g. arbitrary room text in the drawing body as a whole-floor title.
 const place=text.match(/^(?:(?:RITNINGSBENÄMNING|RITNINGSNAMN|BENÄMNING|RITNING|OMRÅDE)\s*[:.-]?\s*)?(FÖRRÅD|FORRAD|UTERUM|GARAGE|TEKNIKUTRYMME|KONTOR|PARKERING|VIND|TAK|KÄLLARE|KALLARE)\s*$/i);
 return place?place[1]:'';
}
function smartFindDrawingFloorLabel(text,viewport){
 const items=(text?.items||[]).filter(o=>o?.text&&Number.isFinite(o.x)&&Number.isFinite(o.y));
 if(!items.length||!viewport?.width||!viewport?.height)return '';
 const rows=[];
 for(const item of items){
  // PDF.js transform positions are in PDF units, convert to display axes
  // so the lower-right test also handles rotated/CropBox PDF pages.
  const [x,y]=viewport.convertToViewportPoint(item.x,item.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  if(x<viewport.width*.48||y<viewport.height*.52||x>viewport.width*1.02||y>viewport.height*1.02)continue;
  const threshold=Math.max(3,Math.min(11,Math.abs(Number(item.h)||0)*.55));
  let row=rows.find(r=>Math.abs(r.y-y)<Math.max(3,threshold));
  if(!row){row={x,y,items:[]};rows.push(row)}
  row.items.push({x,y,text:String(item.text)});
  row.x=Math.min(row.x,x);
 }
 const candidates=[];
 for(const row of rows){
  const pieces=row.items.sort((a,b)=>a.x-b.x);
  // Join PDF fragments, including 'PLAN' + '2' in separate text items.
  const rowText=pieces.map(i=>i.text).join(' ').replace(/\s+/g,' ').trim();
  let label=smartTitleFromDrawingRow(rowText);
  if(!label)continue;
  // Significantly prefer lower-right *title blocks* over stray room labels.
  const x=Math.max(...pieces.map(i=>i.x));
  const lowerRight=x>viewport.width*.66&&row.y>viewport.height*.66;
  const labelIsSpecific=/^(?:PLAN|VÅNING|VÅN\.)\s+[-0-9]|(?:KÄLLAR|KALLAR|ENTRÉ|ENTRE|BOTTEN|MARK|VIND|TAK).*PLAN/i.test(label);
  if(!lowerRight&&!labelIsSpecific)continue;
  const specificity=labelIsSpecific?4:2;
  const score=(row.y/viewport.height)*4+(x/viewport.width)*3+specificity+(lowerRight?4:0);
  candidates.push({label,score});
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]?.label||'';
}
function smartSetCurrentDrawingFloor(pageNo=page){
 const e=document.getElementById('pwPlanTag');
 const title=String(drawingPageLevels[pageNo]||'').trim();
 if(e){e.hidden=!title;e.textContent=title;e.title=title?'Ritning sida '+pageNo+' · '+title+' · avläst ur ritningsstämpeln':'';}
}

async function smartIndexDoorCardsFirst(){
 smartDoorCardIndex={};smartDoorCardPages=new Set();smartDoorCardFirstRows={};
 const uncertain=[];
 for(let p=1;p<=scanPageLimit();p++){
  smartLoadProgress(12+Math.floor(23*(p-1)/Math.max(1,scanPageLimit())),'Skannar dörrkort');
  setState('SmartMatch TEST v36.11: läser dörrkortens översta ID-rad '+p+' av '+pdf.numPages+'…');
  const pg=await pdf.getPage(p),text=await readPageText(p);
  const level=smartFindDrawingFloorLabel(text,pg.getViewport({scale:1}));
  if(level)drawingPageLevels[p]=level;
  const importedDoorCard=smartImportedCardPages.has(p);
  if(!importedDoorCard&&/(?:PLANRITNING|PLAN\s*RITNING|SKALA\s*1\s*:)/i.test(text.raw)&&
     !/(?:DÖRRKORT|DORRKORT|BESLAGSKORT|DÖRRSPECIFIKATION|EGENKONTROLL)/i.test(text.raw))continue;
  const height=pg.getViewport({scale:1}).height;
  const first=smartFirstCardIdentity(text,height);
  const eligible=smartDoorCardSignals(text.raw,first?[first.code]:[]);
  // Distinguish real door cards from plan legends containing WC or HVC.
  const strongCardPattern=/(?:DÖRRKORT|DORRKORT|BESLAGSKORT|DÖRRSPECIFIKATION|EGENKONTROLL)/i.test(text.raw);
  const hasHardware=/(?:LÅSHUS|LASHUS|SLUTBLECK|CYLINDER|DAGLÅSNING|DAGLASNING|TRYCKE)/i.test(text.raw);
  const drawing=/(?:PLANRITNING|PLAN\s*RITNING|SKALA\s*1\s*:)/i.test(text.raw)&&!strongCardPattern;
  const isCard=importedDoorCard||(!drawing&&(eligible||(!!first&&strongCardPattern&&hasHardware)));
  if(!isCard)continue;
  delete drawingPageLevels[p]; // door cards cannot be floor plan pages
  smartDoorCardPages.add(p);
  if(!first){uncertain.push({page:p,reason:'ingen entydig identifieringsrad'});continue}
  const code=first.code,pages=smartDoorCardIndex[code]||[];
  pages.push(p);smartDoorCardIndex[code]=pages;
  smartDoorCardFirstRows[p]={code,row:first.row,area:first.area};
 }
 smartLoadProgress(35,'Dörrkort identifierade');
 smartImportReport.recognized=[...smartImportedCardPages].filter(p=>smartDoorCardFirstRows[p]?.code).length;
 smartImportReport.unrecognized=Math.max(0,smartImportedCardPages.size-smartImportReport.recognized);
 smartScanStats={
  cards:Object.values(smartDoorCardIndex).reduce((n,pages)=>n+pages.length,0),
  cardCodes:Object.keys(smartDoorCardIndex).length,
  gsCards:Object.keys(smartDoorCardIndex).filter(code=>code.startsWith('GS')).length,
  uncertainCardPages:uncertain,gsWithoutCard:{},
  gsAnnotationsSeen:0,gsAnnotationsLinked:0,
  annotationAccepted:0,annotationRejected:0,extraGraphic:0,linkedPositions:0
 };
 console.info('[SmartMatch TEST v36] first rows',smartDoorCardFirstRows,'index',smartDoorCardIndex,'unresolved',uncertain);
 return smartDoorCardIndex;
}
function scanPageLimit(){return scanOriginalPageCount>0?Math.min(scanOriginalPageCount,pdf.numPages):pdf.numPages}
function smartHasDoorCard(code){
 return !!(smartDoorCardIndex[String(code||'').toUpperCase()]||[]).length;
}
function scanHasDoorCard(code){return scanCardCodes.has(String(code||'').toUpperCase())}
function scanPageHasRelevantText(text,p){
 if(scanPageEligibility.has(p))return scanPageEligibility.get(p);
 const normalized=String(text?.raw||'').toUpperCase().replace(/[^A-ZÅÄÖ0-9]+/g,'');
 const ok=!!normalized&&[...scanCardCodes].some(code=>normalized.includes(code));
 scanPageEligibility.set(p,ok);return ok;
}

async function extractLabMarkedPositions(){
 const {PDFDocument,PDFName,PDFDict}=PDFLib;
 const doc=await PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});
 const candidates=[];
 let annotationCodes=0,nonIdMarks=0;
 labUnreadableMarks=0;labSourceMarkCount=0;
 // The user's real technicianunderlag PDF contains true FreeText annotations
 // with exact /Contents (310a, 310b etc), yellow /C, and precise /Rect.
 // Using 'underlying page text' first loses real markers by reading a neighboring dimension.
 for(const [index,pg] of doc.getPages().entries()){
  if(index>=scanPageLimit())break;
  smartLoadProgress(35+Math.floor(7*index/Math.max(1,scanPageLimit())),'Läser PDF-markeringar');
  const annots=pg.node.Annots();if(!annots)continue;
  for(let j=0;j<annots.size();j++){
   let dict;try{dict=annots.lookup(j,PDFDict)}catch(_){continue}
   if(!dict)continue;
   const subtype=decodePdfText(dict.get(PDFName.of('Subtype'))).replace('/','');
   if(!['Highlight','Stamp','Square','FreeText','Circle'].includes(subtype))continue;

   const rect=rectFromAnnotation(dict);if(!rect)continue;
   labSourceMarkCount++;smartAuditPage(index+1).annotations++;
   const own=decodePdfText(dict.get(PDFName.of('Contents')));
   const alternative=decodePdfText(dict.get(PDFName.of('Subj')));
   const named=decodePdfText(dict.get(PDFName.of('T')));
   const ownCode=labStrictAnnotationCode(own)||labStrictAnnotationCode(alternative)||labStrictAnnotationCode(named)||smartExactCardText(own)||smartExactCardText(alternative)||smartExactCardText(named);
   let code=ownCode;
   if(!code){
    // FreeText labels with readable, NON-ID contents (e.g. "cyl" or an
    // explanatory note) must never accidentally become door positions.
    if(String(own||'').trim()||String(alternative||'').trim()){nonIdMarks++;continue}
    // Only fall back to underlying text when an annotation has no identity
    // metadata at all. 'GS ID'/'GS IDW' are placeholders, NOT door codes.
    const inside=await rawProjectStampText(index+1,rect);
    code=labStrictAnnotationCode(inside)||smartExactCardText(inside);
   }
   if(!code){labUnreadableMarks++;smartAuditPage(index+1).unreadableMetadata++;smartAuditReason('unreadableAnnotation');continue}
   if(!scanHasDoorCard(code))continue;
   smartAuditPage(index+1).validMetadata++;smartAuditAddCode(code);
   if(code.startsWith('GS'))smartScanStats.gsAnnotationsSeen++;
   if(!smartHasDoorCard(code)){
    smartScanStats.annotationRejected++;
    if(code.startsWith('GS'))smartScanStats.gsWithoutCard[code]=(smartScanStats.gsWithoutCard[code]||0)+1;
   }else{
    smartScanStats.annotationAccepted++;
    if(code.startsWith('GS'))smartScanStats.gsAnnotationsLinked++;
   }
   if(ownCode)annotationCodes++;
   // PDF /Rect is the authoritative text-mark placement.
   candidates.push({page:index+1,code,rect,order:j,sourceKind:code.startsWith('GS')?'gs':'project-code',label:ownCode?String(own||code).trim():code,subtype,scanSource:ownCode?'annotation-metadata':'annotation-under-text'});
  }
 }
 // Different annotation objects remain DIFFERENT positions even when they
 // share a code or overlap. Only duplicate alternative scanner results are removed.
 const result=candidates.slice();
 smartLoadProgress(42,'PDF-markeringar avlästa');
 setState('SmartMatch TEST v36.11: '+annotationCodes+' riktiga PDF-markeringar hittade; söker kompletterande färgmarkeringar…');
 const graphic=await extractLabGraphicPositions(result);
 console.info('[SmartMatch TEST v36 - annotations]',{readableAnnotations:annotationCodes,nonIdMarks,totalMarkerCodes:candidates.length,extraGraphicMarkers:graphic.length});
 // Bare dimensions found near colored areas are not door positions.
 const reliableGraphic=graphic.filter(o=>scanHasDoorCard(o.code));
 const all=[...result,...reliableGraphic];
 // Exact printed GS identities only. Standalone GS in responsibility tables
 // and descriptions such as GS 230v are not door identities.
 for(let p=1;p<=scanPageLimit();p++){
  smartLoadProgress(71+Math.floor(7*(p-1)/Math.max(1,scanPageLimit())),'Söker GS-positioner');
  if(smartDoorCardPages.has(p))continue;
  const text=await readPageText(p);
  for(const item of text.items){
   if(!/^GS\s*\d{1,6}\s*$/i.test(item.text.trim()))continue;
   const code=labStrictAnnotationCode(item.text),rect=rectForTextItems([item],1.8);
   if(!rect||!scanHasDoorCard(code)||labAlreadyLocated(all,p,code,rect))continue;
   all.push({code,page:p,rect,order:800000+all.length,sourceKind:'gs',label:code,scanSource:'plain-gs-text'});
  }
 }
 smartLoadProgress(78,'GS-positioner granskade');
 return all;
}

function labHeaderRows(text){
 const items=(text?.items||[]).slice().sort((a,b)=>b.y-a.y||a.x-b.x),rows=[];
 for(const item of items){
  let row=rows.find(r=>Math.abs(r.y-item.y)<=Math.max(2.4,Math.min(5,item.h*.45)));
  if(!row){row={y:item.y,items:[]};rows.push(row)}
  row.items.push(item);
 }
 return rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
}
function labDoorCardHeader(text){
 const rows=labHeaderRows(text),ignore=/^(?:dörrkort|dorrkort|dörrspecifikation|dorrspecifikation|beslagslista|ritningsnummer|projektnummer|projektnr|upprättad|version|revision|rev\.?\s*\d|datum|sida\s*\d|page\s*\d|ritning\b)/i;
 return rows.filter(line=>!ignore.test(line)).slice(0,4);
}
function labHeaderMatch(code,lines){
 const rx=code.startsWith('GS')?codeRegex(code):projectStampRegex(code);
 if(!rx)return false;
 return lines.some(line=>{
  if(!rx.test(line))return false;
  // Dörrkort kan ha logga och projekthuvud. Beslagsrader är aldrig ett dörr-ID.
  if(/\b(?:slutbleck|elslutbleck|lås(?:hus|kista|cylinder)|låshus|cylinder|trycke|dörrstängare|dorrstangare|beslag|artikel(?:nr|nummer)?|produkt|material|antal|montering|kontrollpunkt|sensor|radar|gångjärn|gangjarn|karm|fabrikat|leverantör)\b/i.test(line))return false;
  if(/^(?:sida|page|rev|revision|datum|version|våning|ritningsnummer|projektnummer|projektnr)\b/i.test(line))return false;
  if(/^\d{1,6}$/.test(code)){
   return line.trim().toUpperCase()===code||/\b(?:DÖRR(?:NUMMER|NR)?|LITTERA|POSITION|BETECKNING|ID|WC)\b/i.test(line);
  }
  return true;
 });
}

/* TEST v4: Diagnose existing drawing-search decisions. Read only: no saved-data changes. */
function labDiagnosticCode(value){return String(value||'').toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,'').slice(0,16)}
function labDiagnosticPattern(code){
 const k=labDiagnosticCode(code);return k?new RegExp('(^|[^A-ZÅÄÖ0-9])'+k.split('').join('[^A-ZÅÄÖ0-9]*')+'($|[^A-ZÅÄÖ0-9])','i'):null;
}
function labDiagnosticTextHits(text,code,pageNo){
 const rx=labDiagnosticPattern(code),out=[];
 if(!rx)return out;
 for(const row of groupTextRowsForAutomation(text.items)){
  const cells=[...row.items].sort((a,b)=>a.x-b.x);
  for(let start=0;start<cells.length;start++){
   for(let end=start;end<Math.min(start+7,cells.length);end++){
    const part=cells.slice(start,end+1);if(!gsItemsCloseEnough(part))break;
    const raw=part.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
    if(raw.length>65)break;
    if(!rx.test(raw))continue;
    const rect=rectForTextItems(part,1);if(!rect)break;
    const x=(rect[0]+rect[2])/2,y=(rect[1]+rect[3])/2;
    if(!out.some(h=>Math.abs(h.cx-x)<2.5&&Math.abs(h.cy-y)<2.5))
     out.push({page:pageNo,code,rect,cx:x,cy:y,raw,parsed:labCodeFromMark(raw)});
    break;
   }
  }
 }
 return out;
}
async function labDiagnosticColorForPage(group){
 const pg=await pdf.getPage(group[0].page),natural=pg.getViewport({scale:1});
 const scale=Math.max(.02,Math.min(1.2,Math.sqrt(2600000/Math.max(1,natural.width*natural.height)),2200/natural.width,2200/natural.height));
 const vp=pg.getViewport({scale});
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return group.map(()=>null);
 try{
  await pg.render({canvasContext:ctx,viewport:vp}).promise;
  const bits=ctx.getImageData(0,0,canvas.width,canvas.height);
  return group.map(h=>labColorAtRect(bits,viewportRect(vp,h.rect)));
 }catch(e){console.warn('Diagnos färg sida '+group[0].page,e);return group.map(()=>null)}
 finally{canvas.width=canvas.height=0}
}
function labDiagnosticReason(h,code,cardPages){
 if(h.registered&&cardPages.length===1)return {level:'found',text:'Registrerad och kopplad till dörrkort'};
 if(h.registered&&cardPages.length>1)return {level:'found',text:'Registrerad – flera möjliga dörrkort'};
 if(h.registered)return {level:'error',text:'Registrerad men dörrkortets identifiering matchade inte'};
 if(h.parsed!==code)return {level:'error',text:'Texten delades upp: sökningen tolkade '+(h.parsed||'ingen kod')+' i stället för '+code};
 if(h.possibleDuplicate)return {level:'error',text:'Troligen bortsorterad som dubblett nära en annan position'};
 if(h.color===false)return {level:'error',text:'PDF-text finns men färgmarkeringen uppfyllde inte gränsvärdet'};
 if(h.color===true)return {level:'error',text:'PDF-text och färg finns – positionen registrerades ändå inte'};
 return {level:'error',text:'PDF-text finns, men färgavläsningen gick inte att kontrollera'};
}
function labDiagnosticOutline(vp){
 if(!labDiagnosticSpot||labDiagnosticSpot.page!==page)return;
 const r=viewportRect(vp,labDiagnosticSpot.rect);
 if(!Number.isFinite(r.left+r.top+r.width+r.height))return;
 const node=document.createElement('div');node.className='labDiagnosticFrame';
 node.style.left=r.left+'px';node.style.top=r.top+'px';
 node.style.width=Math.max(14,r.width)+'px';node.style.height=Math.max(14,r.height)+'px';
 el.markers.appendChild(node);
}
async function labDiagnosticGoTo(hit){
 document.getElementById('labDiagnosticDialog').close();
 labDiagnosticSpot={page:hit.page,rect:hit.rect};page=hit.page;
 await renderDrawing();
 const pg=await pdf.getPage(hit.page),r=viewportRect(pg.getViewport({scale}),hit.rect);
 el.viewer.scrollTo({left:Math.max(0,r.left+r.width/2-el.viewer.clientWidth/2),top:Math.max(0,r.top+r.height/2-el.viewer.clientHeight/2),behavior:'smooth'});
 renderMarkers();
}
async function labDiagnosticAnalyze(){
 const inp=document.getElementById('labDiagnosticCode'),summary=document.getElementById('labDiagnosticSummary');
 const list=document.getElementById('labDiagnosticResults'),button=document.getElementById('labDiagnosticRun');
 if(!pdf){summary.textContent='Öppna först en PDF-ritning.';return}
 const code=labDiagnosticCode(inp.value);if(!code){summary.textContent='Ange en beteckning, exempelvis 310A.';return}
 inp.value=code;button.disabled=true;list.replaceChildren();
 const seq=++labDiagnosticSequence,documentPdf=pdf;
 try{
  const rows=[],all=[...stamps,...projectStamps],marked=all.filter(x=>x.code===code);
  for(let p=1;p<=documentPdf.numPages;p++){
   if(seq!==labDiagnosticSequence||pdf!==documentPdf)return;
   summary.textContent='Undersöker text på sida '+p+' av '+documentPdf.numPages+'…';
   const text=await readPageText(p);
   if(looksLikeAutomationProtocolPage(text.raw)||likelyDoorCardPage(text))continue;
   rows.push(...labDiagnosticTextHits(text,code,p));
   if(rows.length>=500)break;
  }
  const used=new Set();
  for(const row of rows){
   row.marker=marked.find(m=>m.page===row.page&&gsPositionDuplicate([m],row.page,code,row.rect))||null;
   row.possibleDuplicate=!!row.marker&&used.has(row.marker);
   row.registered=!!row.marker&&!row.possibleDuplicate;
   if(row.registered)used.add(row.marker);
  }
  for(const m of marked)if(!used.has(m))rows.push({page:m.page,rect:m.rect,raw:m.label||code,parsed:code,marker:m,registered:true,annotation:true,color:null});
  const groups=new Map();
  for(const hit of rows)if(!hit.annotation){const g=groups.get(hit.page)||[];g.push(hit);groups.set(hit.page,g)}
  let p=0;
  for(const group of groups.values()){
   if(seq!==labDiagnosticSequence||pdf!==documentPdf)return;
   summary.textContent='Jämför färger: '+(++p)+' av '+groups.size+' sidor…';
   const colors=await labDiagnosticColorForPage(group);
   group.forEach((h,i)=>h.color=colors[i]);
  }
  const fromMap=protocolCandidates[code];
  const cardPages=Array.isArray(fromMap)?fromMap:Array.from({length:documentPdf.numPages},(_,i)=>i+1).filter(p=>labHeaderMatch(code,labDoorCardHeader(pageTexts[p]||{items:[]})));
  const located=rows.filter(h=>h.registered).length,missing=rows.length-located;
  const textSplit=rows.filter(h=>!h.registered&&h.parsed!==code).length;
  const noColor=rows.filter(h=>!h.registered&&h.color===false).length;
  summary.textContent=code+': '+rows.length+' möjliga förekomster i läsbar PDF-text/markeringar.\n'+located+' registrerade · '+missing+' inte registrerade · '+textSplit+' misstänkta textuppdelningar · '+noColor+' utan bekräftad färg.\nDörrkort: '+(cardPages.length?cardPages.join(', '):'ingen matchning i identifieringsraderna')+'.';
  if(!rows.length){
   const n=document.createElement('p');n.className='labDiagnosticIntro';n.textContent='Ingen läsbar '+code+' hittades i de sidor som tolkas som ritningar. En bildbaserad text går inte att felsöka utan bildtextigenkänning (OCR).';
   list.appendChild(n);return;
  }
  rows.sort((a,b)=>a.page-b.page||b.rect[1]-a.rect[1]||a.rect[0]-b.rect[0]);
  for(const [i,hit] of rows.slice(0,250).entries()){
   const status=labDiagnosticReason(hit,code,cardPages);
   const b=document.createElement('button');b.type='button';b.className='labDiagnosticHit';b.dataset.level=status.level;
   const title=document.createElement('b'),detail=document.createElement('span'),hint=document.createElement('small');
   title.textContent=(i+1)+'. Sida '+hit.page+' · '+status.text;
   detail.textContent='Text: '+hit.raw+' → '+(hit.parsed||'oläsbar')+(hit.annotation?' · PDF-markering':hit.color===true?' · färg hittad':hit.color===false?' · färg missad':' · färg okänd');
   hint.textContent='Visa platsen på ritningen';
   b.append(title,detail,hint);b.onclick=()=>labDiagnosticGoTo(hit).catch(console.error);list.appendChild(b);
  }
  if(rows.length>250){const more=document.createElement('p');more.textContent='Visar de första 250 av '+rows.length+' träffar.';list.appendChild(more)}
 }catch(e){console.error(e);summary.textContent='Felsökningen kunde inte slutföras: '+(e?.message||e)}
 finally{button.disabled=false}
}

async function buildProtocolMap(){
 protocolMap={};protocolCandidates={};
 // Card index is scanned BEFORE drawing positions; never match codes in
 // equipment tables, dimension text or arbitrary PDF page contents.
 for(const [code,pages] of Object.entries(smartDoorCardIndex)){
  protocolCandidates[code]=pages.slice();
  const manual=Number(labManualLinks[code]);
  if(Number.isInteger(manual)&&manual>=1&&manual<=pdf.numPages)protocolMap[code]=manual;
  else if(pages.length===1)protocolMap[code]=pages[0];
 }
 for(const [code,n] of Object.entries(labManualLinks)){const p=Number(n);if(Number.isInteger(p)&&p>=1&&p<=pdf.numPages)protocolMap[code]=p;}
}
async function buildProjectStampMap(){/* Samma söklabbsmotor söker redan alla färgmarkerade koder. */}
function labState(code){
 return protocolMap[code]?'matched':(protocolCandidates[code]?.length>1?'ambiguous':'missing');
}
function renderLabStats(){
 // Sammanställningen visas direkt i Projektflödets vanliga positionsräknare och lista.
 // Ingen separat sökpanel eller andra arbetsytor.
}
function openLabChoices(position){
 const dialog=document.getElementById('labSelectDialog'),title=document.getElementById('labDialogTitle'),caption=document.getElementById('labDialogText'),choices=document.getElementById('labChoices');
 if(!dialog||!position)return;
 const code=position.code,pages=protocolCandidates[code]||[];
 title.textContent=code+' · välj dörrkort';
 caption.textContent=pages.length?'Beteckningen finns högst upp på dessa dörrkortsidor. Välj den korrekta sidan för '+code+'.':'Inget matchande dörrkort hittades i de fyra översta relevanta raderna. Positionen ligger kvar på ritningen.';
 choices.replaceChildren();
 for(const pageNo of pages){
  const button=document.createElement('button');button.type='button';button.textContent='Koppla '+code+' till dörrkort sida '+pageNo;
  button.onclick=async()=>{labManualLinks[code]=pageNo;protocolMap[code]=pageNo;protocolDefs={};dialog.close();await recalcAll();setState(code+' är nu kopplad till dörrkort på sida '+pageNo+' i Projektflöde test.')};
  choices.appendChild(button);
 }
 const row=document.createElement('div');row.className='pwCardManualRow';
 const input=document.createElement('input');input.type='number';input.inputMode='numeric';input.min='1';input.max=String(pdf.numPages);
 input.value=String(protocolMap[code]||'');input.placeholder='Dörrkortssida';input.setAttribute('aria-label','Dörrkortssida');
 const button=document.createElement('button');button.type='button';button.textContent='Koppla sida';
 button.onclick=async()=>{
  const n=Number(input.value);
  if(!Number.isInteger(n)||n<1||n>pdf.numPages){caption.textContent='Ange ett giltigt sidnummer mellan 1 och '+pdf.numPages+'.';return}
  labManualLinks[code]=n;await buildProtocolMap();protocolDefs={};dialog.close();
  $('pmCode').value=code;$('pmCard').value=String(n);
  await recalcAll();smartRenderGSReport();smartRenderFirstCardReport();
  pmHelp(code+' kopplad till dörrkort sida '+n+'.');
 };
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();button.click()}};
 row.append(input,button);choices.appendChild(row);
 dialog.showModal();
}

async function readPageText(pageNo){
 if(pageTexts[pageNo])return pageTexts[pageNo];
 const pg=await pdf.getPage(pageNo),content=await pg.getTextContent();
 const items=content.items.map(item=>({
  text:String(item.str||'').trim(),
  x:Number(item.transform?.[4]||0),
  y:Number(item.transform?.[5]||0),
  h:Math.max(Math.abs(Number(item.transform?.[3]||0)),Number(item.height||0),1),
  w:Number(item.width||0),
  font:String(item.fontName||'')
 })).filter(x=>x.text);
 const raw=items.map(x=>x.text).join(' ');
 pageTexts[pageNo]={raw,items};
 return pageTexts[pageNo];
}


function gsItemsCloseEnough(items){
 if(items.length<2)return true;
 const ordered=[...items].sort((a,b)=>a.x-b.x);
 for(let i=1;i<ordered.length;i++){
  const prev=ordered[i-1],next=ordered[i];
  const gap=next.x-(prev.x+Math.max(prev.w,1));
  const maxGap=Math.max(14,Math.max(prev.h,next.h)*2.8);
  if(gap>maxGap)return false;
 }
 return true;
}
function gsTextCandidatesFromItems(items){
 const rows=groupTextRowsForAutomation(items),out=[];
 rows.forEach((row,rowIndex)=>{
  const ordered=[...row.items].sort((a,b)=>a.x-b.x),seen=new Set();
  for(let start=0;start<ordered.length;start++){
   for(let end=start;end<Math.min(ordered.length,start+6);end++){
    const slice=ordered.slice(start,end+1);
    if(!gsItemsCloseEnough(slice))break;
    const joined=slice.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
    if(!/[Gg][\s_-]*[Ss]/.test(joined))continue;
    const code=normalizeCode(joined);
    if(!code)continue;
    const key=code+'@'+Math.round(slice[0].x)+'@'+Math.round(slice[0].y);
    if(seen.has(key))continue;
    seen.add(key);
    const rect=rectForTextItems(slice,2.5);
    if(rect)out.push({code,rect,label:joined,rowIndex});
    break;
   }
  }
 });
 return out;
}
function likelyDoorCardPage(text){
 const raw=String(text?.raw||'').toLocaleLowerCase('sv');
 if(/dörrkort|dorrkort|beslagslista|dörrspecifikation|dorrspecifikation/.test(raw))return true;
 const workLines=groupLines(text?.items||[]).filter(line=>line.actionable).length;
 if(workLines>=2)return true;
 const standaloneGs=(text?.items||[]).filter(x=>/^GS$/i.test(String(x.text||'').trim())).length;
 const signals=['slutbleck','elslutbleck','trycke','låshus','lashus','cylinder','dörrstäng','dorrstang','monteras','levereras','ansvar'];
 const signalHits=signals.reduce((n,s)=>n+(raw.includes(s)?1:0),0);
 return standaloneGs>=2&&signalHits>=2;
}
function gsPositionDuplicate(list,pageNo,code,rect){
 const cx=(Number(rect[0])+Number(rect[2]))/2,cy=(Number(rect[1])+Number(rect[3]))/2;
 return list.some(o=>{
  if(o.page!==pageNo||o.code!==code||!Array.isArray(o.rect))return false;
  const ox=(Number(o.rect[0])+Number(o.rect[2]))/2,oy=(Number(o.rect[1])+Number(o.rect[3]))/2;
  const sx=Math.max(12,Math.abs(Number(rect[2])-Number(rect[0]))+Math.abs(Number(o.rect[2])-Number(o.rect[0])));
  const sy=Math.max(10,Math.abs(Number(rect[3])-Number(rect[1]))+Math.abs(Number(o.rect[3])-Number(o.rect[1])));
  return Math.abs(cx-ox)<=sx*.55&&Math.abs(cy-oy)<=sy*.55;
 });
}
async function extractTextGsStamps(existing=[]){
 const out=[];
 for(let p=1;p<=pdf.numPages;p++){
  const text=await readPageText(p);
  if(looksLikeAutomationProtocolPage(text.raw)||likelyDoorCardPage(text))continue;
  const candidates=gsTextCandidatesFromItems(text.items);
  candidates.forEach((candidate,index)=>{
   if(gsPositionDuplicate([...existing,...out],p,candidate.code,candidate.rect))return;
   out.push({page:p,code:candidate.code,rect:candidate.rect,order:100000+index,sourceKind:'gs-text',label:candidate.label});
  });
 }
 return out;
}

function compactAutomationText(value){return String(value||'').toLocaleLowerCase('sv').replace(/[^a-z0-9åäö]+/g,'')}
function automationModelFromText(value){
 const compact=compactAutomationText(value);
 const aliases={
  '11':['gezeemd','emdstandardarm'],'12':['gezeemdglidarm','emdglidarm'],'13':['faacstandard'],'14':['faacglidarm'],
  '15':['powerswing'],'16':['sw100'],'17':['ed200'],'18':['tormax'],'19':['recordstandardarm'],
  '20':['powerswingpardörr','powerswingpardorr'],'21':['tsa160'],'22':['recordglidarm'],'23':['gilgenfdc','fdc'],'24':['ed100'],
  '25':['besamsde','sde'],'26':['ditechissmonterad'],'27':['sr2000'],'28':['ove'],'29':['cd80'],
  '30':['cibeshissöppnare','cibeshissoppnare'],'31':['tsa160dubbeldörr','tsa160dubbeldorr'],'32':['ed180'],'33':['ecturn'],
  '34':['besamdhe','dhe'],'35':['pls100'],'36':['pls150'],'37':['ed250'],'38':['powerdrive'],
  '39':['ecdrive'],'40':['gezeslskjutdörr','gezeslskjutdorr'],'41':['faac930'],'42':['faaca140'],
  '43':['ts93brandstängning','ts93brandstangning'],'44':['dormats93','ts93'],'45':['sw300'],
  '46':['unislidedubbelflyglig'],'47':['unislideenkel flyglig','unislideenkel flyglig'.replace(/\s/g,'')],'48':['sl500']
 };
 for(const [code,name] of PROJECT_AUTOMATION_MODELS){
  const full=compactAutomationText(name);
  if(full&&compact.includes(full))return {code,name};
  if((aliases[code]||[]).some(a=>a&&compact.includes(compactAutomationText(a))))return {code,name};
 }
 return null;
}
function automationObjectNoFromItems(items,model){
 const text=items.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
 const labelled=text.match(/\b(?:objektnr|objektnummer|objekt|id|märkning|markning|littera)\s*[:#-]?\s*([A-ZÅÄÖ]?\d{2,6}(?:[-/]\d{1,4})?(?:\s*[A-ZÅÄÖ])?)\b/i);
 if(labelled)return labelled[1].toUpperCase().replace(/\s+/g,' ').trim();
 const modelCompact=compactAutomationText(model?.name||'');
 const ordered=[...items].sort((a,b)=>a._distance-b._distance);
 for(const item of ordered){
  const t=String(item.text||'').trim();
  if(!t||/^DA$/i.test(t)||/dörr.?automatik/i.test(t)||compactAutomationText(t)&&modelCompact.includes(compactAutomationText(t)))continue;
  const m=t.match(/\b([A-ZÅÄÖ]?\d{2,6}(?:[-/]\d{1,4})?(?:\s*[A-ZÅÄÖ])?)\b/i);
  if(m)return m[1].toUpperCase().replace(/\s+/g,' ').trim();
 }
 return '';
}
function automationSerialFromText(value){
 const text=String(value||'');
 const labelled=text.match(/\b(?:antal|löpnummer|lopnummer|nr)\s*[:#-]?\s*(\d{1,6})\b/i);
 return labelled?String(Number(labelled[1])||1):'';
}
function automationProgressOf(o){
 const done=PROJECT_AUTOMATION_CHECKS.filter(([id])=>['ok','remark','na'].includes(o?.checks?.[id]?.result)).length;
 return Math.round(done/PROJECT_AUTOMATION_CHECKS.length*100);
}
// Live checklist-derived status for DA overview. A fully answered checklist with
// any "Klart med anmärkning" must NEVER be marked green merely because it is 100%.
// "Ingår ej" is a completed control point, as in the existing progress logic.
function automationInspectionState(o){
 const checks=PROJECT_AUTOMATION_CHECKS.map(([id])=>String(o?.checks?.[id]?.result||''));
 const inspected=checks.filter(value=>['ok','remark','na'].includes(value)).length;
 if(checks.includes('remark'))return {kind:'remark',label:'Anmärkning'};
 if(inspected===checks.length&&checks.length>0)return {kind:'approved',label:'Godkänd'};
 return {kind:'pending',label:inspected?'Pågår':'Ej kontrollerad'};
}
function updateDALiveStatus(o){
 if(!o)return;
 const state=automationInspectionState(o),percent=automationProgressOf(o);
 o.progress=percent;
 const b=[...el.groups.querySelectorAll('.pwAutomationPosition')].find(x=>x.dataset.automationId===o.id);
 if(b){
  b.dataset.inspectionStatus=state.kind;
  const pct=b.querySelector('b');if(pct){pct.textContent=percent+'%';pct.title=state.label}
  b.title=state.label+' · '+percent+'% · visa '+automationDisplayId(o)+' på ritningen';
  b.setAttribute('aria-label',state.label+', '+percent+' procent. Visa dörrautomatiken '+automationDisplayId(o)+' på ritningen');
 }
 // Update only the actual automation on the drawing. Do not reposition GS.
 const marker=[...el.automationMarkers.querySelectorAll('.pwAutomationMarker')].find(x=>x.dataset.automationId===o.id);
 if(marker){
  marker.dataset.inspectionStatus=state.kind;marker.dataset.progress=String(percent);
  marker.dataset.slrStatus='pending';
  marker.title=automationMarkerStatusTitle(o,state,percent);
  marker.setAttribute('aria-label',marker.title);
 }
 const badge=document.getElementById('pwAutomationProgressRow');
 if(badge&&selectedAutomationId===o.id){
  badge.dataset.inspectionStatus=state.kind;
  const caption=document.getElementById('pwAutomationInspectionLabel');
  if(caption)caption.textContent=state.label;
  el.automationProgress.textContent=percent+'%';
 }
}
function automationMarkerStatusTitle(o,state,percent){
 // The drawing is split into two parts. SLR has no finished state yet.
 return 'Dörrautomatik '+automationDisplayId(o)+' · Vänster: Revision '+state.label+' '+percent+'% · Höger: SLR inte färdig · öppna checklista eller SLR';
}
function parseStructuredAutomationId(value){
 const text=String(value||'').toUpperCase();
 const matches=text.match(/\d{1,6}(?:\s*-\s*\d{1,6}){2,}/g)||[];
 for(const raw of matches){
  const parts=raw.split(/\s*-\s*/).filter(Boolean);
  if(parts.length<3)continue;
  const modelCode=String(Number(parts.at(-2))),serialNumber=String(Number(parts.at(-1)));
  const known=PROJECT_AUTOMATION_MODELS.find(([code])=>code===modelCode);
  if(!known||!Number(serialNumber))continue;
  const objectNo=parts.slice(0,-2).join('-');
  if(!objectNo)continue;
  return {fullId:[objectNo,modelCode,serialNumber].join('-'),objectNo,modelCode,model:known[1],serialNumber,matchText:raw};
 }
 return null;
}
function groupTextRowsForAutomation(items){
 const groups=[];
 [...items].sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
  let group=groups.find(g=>Math.abs(g.y-item.y)<=Math.max(3,Math.min(6,item.h*.55)));
  if(!group){group={y:item.y,items:[]};groups.push(group)}
  group.items.push(item);
 });
 return groups.map(g=>{
  const row=[...g.items].sort((a,b)=>a.x-b.x);
  return {items:row,text:row.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim()};
 });
}
function rectForTextItems(items,padding=5){
 if(!items?.length)return null;
 const left=Math.min(...items.map(x=>x.x)),right=Math.max(...items.map(x=>x.x+Math.max(x.w,1)));
 const bottom=Math.min(...items.map(x=>x.y-Math.max(x.h,1)*.35)),top=Math.max(...items.map(x=>x.y+Math.max(x.h,1)*.95));
 return [left-padding,bottom-padding,right+padding,top+padding];
}
function normalizedAutomationIdText(value){
 return String(value||'').toUpperCase().replace(/[–—]/g,'-').replace(/\s+/g,'');
}
function itemsForStructuredAutomationId(items,matchText){
 const target=normalizedAutomationIdText(matchText);
 if(!target)return [];
 const ordered=[...items].sort((a,b)=>a.x-b.x);
 let best=[];
 for(let start=0;start<ordered.length;start++){
  let combined='';
  for(let end=start;end<Math.min(ordered.length,start+12);end++){
   combined+=normalizedAutomationIdText(ordered[end].text);
   if(combined===target){
    const candidate=ordered.slice(start,end+1);
    if(!best.length||candidate.length<best.length)best=candidate;
    break;
   }
   if(!target.startsWith(combined))break;
  }
 }
 return best;
}
function looksLikeAutomationProtocolPage(raw){
 const t=String(raw||'').toLocaleLowerCase('sv');
 return /egenkontroll\s+d[oö]rrautomatik|checklista\s+revision\s+d[oö]rrautomatik|dokumentnr\s*:?\s*2519-1|kundrapport/.test(t);
}
async function discoverDoorAutomations(){
 const saved=loadSaved(),savedItems=Array.isArray(saved.automationItems)?saved.automationItems:[],savedByIdentity=new Map();
 savedItems.forEach(o=>{const key=automationDisplayId(o);if(key&&!savedByIdentity.has(key))savedByIdentity.set(key,o)});
 const found=[];

 for(let p=1;p<=pdf.numPages;p++){
  const text=await readPageText(p);
  if(looksLikeAutomationProtocolPage(text.raw))continue;

  const rows=groupTextRowsForAutomation(text.items);
  const occurrences=new Map();

  for(const row of rows){
   const parsed=parseStructuredAutomationId(row.text);
   if(!parsed)continue;

   const exactItems=itemsForStructuredAutomationId(row.items,parsed.matchText);
   if(!exactItems.length)continue;

   const rect=rectForTextItems(exactItems,2.5);
   if(!rect)continue;

   const identity=parsed.fullId;
   const occurrence=(occurrences.get(identity)||0)+1;
   occurrences.set(identity,occurrence);

   const id='automation@'+p+':'+identity+':'+occurrence;
   const old=savedItems.find(x=>x.id===id)||savedByIdentity.get(identity)||{};
   const item={
    id,
    page:p,
    rect,
    objectNo:old.objectNo??parsed.objectNo,
    modelCode:old.modelCode??parsed.modelCode,
    model:old.model??parsed.model,
    serialNumber:old.serialNumber??parsed.serialNumber,
    location:old.location||'',
    sourceText:row.text,
    checks:old.checks&&typeof old.checks==='object'?old.checks:{},
    notes:old.notes||'',
    progress:0,
    sourceKind:'structured-id'
   };
   item.progress=automationProgressOf(item);
   found.push(item);
  }
 }
 automationItems=found;
}
function selectedAutomation(){return automationItems.find(o=>o.id===selectedAutomationId)||null}
function automationDisplayId(o){
 const parts=[o?.objectNo,o?.modelCode,o?.serialNumber].filter(Boolean);
 return parts.length?parts.join('-'):(o?.objectNo||'Dörrautomatik');
}
function syncAutomationModelFromCode(o){
 const known=PROJECT_AUTOMATION_MODELS.find(([code,name])=>code===String(o.modelCode||'')||name.toLocaleLowerCase('sv')===String(o.model||'').toLocaleLowerCase('sv'));
 if(known){o.modelCode=known[0];o.model=known[1]}
}
function syncProjectMetaInputs(){
 el.projectName.value=projectMeta.projectName||'';el.projectFacility.value=projectMeta.facilityNo||'';el.projectOrder.value=projectMeta.order||'';
 el.projectDate.value=projectMeta.date||localProjectDate();el.projectNextDate.value=projectMeta.nextDate||'';
 el.projectCustomer.value=projectMeta.customer||'';el.projectAgreement.value=projectMeta.agreement||'';el.projectContact.value=projectMeta.contact||'';
 el.projectPhone.value=projectMeta.phone||'';el.projectAddress.value=projectMeta.address||'';el.projectPostalCode.value=projectMeta.postalCode||'';el.projectPostalCity.value=projectMeta.postalCity||'';
 el.projectCompany.value=projectMeta.company||'';el.projectCompanyContact.value=projectMeta.companyContact||'';el.projectCompanyPhone.value=projectMeta.companyPhone||'';
 el.projectCompanyAddress.value=projectMeta.companyAddress||'';el.projectCompanyPostalCode.value=projectMeta.companyPostalCode||'';el.projectCompanyPostalCity.value=projectMeta.companyPostalCity||'';
 el.projectTechnician.value=projectMeta.technician||'';el.projectSignature.value=projectMeta.signature||'';
 refreshProjectLogoPreview();
}
function refreshProjectLogoPreview(){
 el.projectLogoPreview.replaceChildren();
 if(projectLogoData){const img=document.createElement('img');img.src=projectLogoData;img.alt='Företagslogotyp';el.projectLogoPreview.appendChild(img)}
 el.projectLogoStatus.textContent=projectLogoData?'Logotyp inlagd och sparad för alla egenkontroller.':'Ingen logotyp vald.';
 el.projectLogoRemove.hidden=!projectLogoData;
}
async function prepareProjectLogoFile(file){
 if(!file||!file.type.startsWith('image/'))throw new Error('Välj en bildfil.');
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Kunde inte läsa bilden.'));r.readAsDataURL(file)});
 const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Bildformatet kunde inte läsas. Prova PNG eller JPG.'));im.src=data});
 const maxW=1000,maxH=500,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');c.clearRect(0,0,w,h);c.drawImage(img,0,0,w,h);
 return cv.toDataURL('image/png');
}
// Short on-screen labels keep items 1.5 and 1.12 readable in one row on iPhone.
// The full regulatory descriptions in PROJECT_AUTOMATION_CHECKS remain intact
// for generated PDF/customer protocols and inspectable hover/focus hints.
const AUTOMATION_CHECK_ROW_LABELS={
 '1.5':'Öppning: kraft, dämpning, hastighet',
 '1.12':'Lås: slutbleck, motorlås, låshus'
};
function renderAutomationChecks(o){
 el.automationChecks.replaceChildren();
 PROJECT_AUTOMATION_CHECKS.forEach(([id,title])=>{
  const check=o.checks[id]||(o.checks[id]={result:'',note:''});
  const row=document.createElement('div');row.className='pwAutomationCheck '+(check.result?'result-'+check.result:'');
  const head=document.createElement('div');head.className='pwAutomationCheckHead';head.innerHTML='<strong>'+id+'</strong><span></span>';
  const titleSpan=head.querySelector('span');titleSpan.textContent=AUTOMATION_CHECK_ROW_LABELS[id]||title;
  if(AUTOMATION_CHECK_ROW_LABELS[id]){titleSpan.title=title;titleSpan.setAttribute('aria-label',title)}
  const choices=document.createElement('div');choices.className='pwAutomationChoices';
  [['na','Ingår ej'],['ok','Klart utan anmärkning'],['remark','Klart med anmärkning']].forEach(([value,label])=>{
   const b=document.createElement('button');b.type='button';b.dataset.v=value;b.textContent=label;b.classList.toggle('active',check.result===value);
   b.setAttribute('aria-pressed',String(check.result===value));
   b.title=check.result===value?'Tryck igen för Ej kontrollerad':label;
   b.onclick=()=>{
    // Tap the selected option again to undo it. An incorrect approval can
    // return to unchecked without choosing an alternative status.
    const next=check.result===value?'':value;
    check.result=next;if(next!=='remark')check.note='';
    o.progress=automationProgressOf(o);save();
    updateDALiveStatus(o);renderAutomationProtocol(o);
   };
   choices.appendChild(b);
  });
  row.append(head,choices);
  if(check.result==='remark'){
   const fault=document.createElement('div');fault.className='pwAutomationFault';
   const faults=PROJECT_AUTOMATION_FAULTS[id]||[];
   const select=document.createElement('select');select.innerHTML='<option value="">Välj anmärkning…</option>';
   faults.forEach(v=>{const op=document.createElement('option');op.value=v;op.textContent=v;select.appendChild(op)});
   const custom=document.createElement('option');custom.value='__custom__';custom.textContent='✎ Beskriv själv…';select.appendChild(custom);
   const note=document.createElement('input');note.type='text';note.placeholder='Beskriv felet…';
   const back=document.createElement('button');back.type='button';back.className='pwAutomationFaultBack';back.textContent='‹';back.setAttribute('aria-label','Till färdiga anmärkningar');
   const known=faults.includes(check.note||'');select.value=known?check.note:'';note.value=known?'':(check.note||'');
   const showCustom=show=>{select.hidden=show;note.hidden=!show;back.hidden=!show};showCustom(!!check.note&&!known);
   select.onchange=()=>{
    if(select.value==='__custom__'){check.note='';note.value='';showCustom(true);requestAnimationFrame(()=>note.focus());save();return}
    check.note=select.value||'';save();
   };
   note.oninput=()=>{check.note=note.value;save()};
   note.onblur=()=>{check.note=note.value.trim();note.value=check.note;save()};
   back.onclick=()=>{check.note='';note.value='';select.value='';showCustom(false);save();select.focus()};
   fault.append(select,note,back);row.appendChild(fault);
  }
  el.automationChecks.appendChild(row);
 });
}
function renderAutomationProtocol(o){
 if(!o)return;
 const inferredNo=inferredAutomationFacility(o);
 if(!String(projectMeta.facilityNo||'').trim()&&inferredNo){
  projectMeta.facilityNo=inferredNo;save();
 }
 syncAutomationModelFromCode(o);
 el.automationIdentity.textContent=[automationDisplayId(o),o.model].filter(Boolean).join(' · ')||'Dörrautomatik';
 // This select is next to Placering / dörrlittra, but it always edits ONLY this automation.
 // Preserve an existing custom model on reopening; never display a blank field for it.
 el.automationModel.querySelector('option[data-saved-automation-model]')?.remove();
 const recognized=PROJECT_AUTOMATION_MODELS.some(([code])=>code===String(o.modelCode||''));
 if(recognized)el.automationModel.value=String(o.modelCode);
 else if(String(o.modelCode||o.model||'').trim()){
  const option=document.createElement('option');
  option.value='__saved_automation_model__';
  option.textContent='Egen modell · '+String(o.model||o.modelCode);
  option.dataset.savedAutomationModel='true';
  el.automationModel.insertBefore(option,el.automationModel.querySelector('option[value="custom"]'));
  el.automationModel.value=option.value;
 }else el.automationModel.value='';
 el.automationSerial.value=o.serialNumber||'';el.automationId.value=o.objectNo||'';
 const fullId=document.getElementById('pwAutomationFullId');
 if(fullId)fullId.value=automationDisplayId(o);
 el.automationLocation.value=o.location||'';el.automationNotes.value=o.notes||'';
 o.progress=automationProgressOf(o);el.automationProgress.textContent=o.progress+'%';
 syncProjectMetaInputs();renderAutomationChecks(o);updateDALiveStatus(o);
}
function openAutomationProtocol(o){
 if(!o)return;selectedAutomationId=o.id;renderAutomationProtocol(o);
 const exportStatus=document.getElementById('pwDAExportStatus');if(exportStatus){exportStatus.hidden=true;exportStatus.textContent=''}
 el.automationDialog.showModal();
}
function closeAutomationProtocol(){if(el.automationDialog.open)el.automationDialog.close();selectedAutomationId='';if(pdf)renderGroups()}

function applySelfcheckExportFilter(){
 const wanted=document.getElementById('pwProtocolStatusFilter')?.value||'all';
 el.selfcheckExportList.querySelectorAll('.pwSelfcheckExportRow').forEach(row=>{row.hidden=wanted!=='all'&&row.dataset.status!==wanted});
}
function renderSelfcheckExportList(){
 el.selfcheckExportList.replaceChildren();
 if(!automationItems.length){const p=document.createElement('p');p.className='pwMuted';p.textContent='Inga automatiker hittades.';el.selfcheckExportList.appendChild(p)}
 automationItems.forEach(o=>{
  const state=automationInspectionState(o);
  const label=document.createElement('label');label.className='pwSelfcheckExportRow';label.dataset.status=state.kind;
  const input=document.createElement('input');input.type='checkbox';input.value=o.id;input.checked=state.kind==='approved';input.dataset.state=state.kind;
  const text=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),chip=document.createElement('span');
  strong.textContent=automationDisplayId(o);
  small.textContent=[o.model||'Typ ej avläst','Sida '+o.page,automationProgressOf(o)+'%'].join(' · ');
  chip.className='smProtocolStatus';chip.dataset.state=state.kind;chip.textContent=state.label;
  text.append(strong,small,chip);label.append(input,text);el.selfcheckExportList.appendChild(label);
  input.onchange=updateSelfcheckExportCount;
 });
 applySelfcheckExportFilter();
 updateSelfcheckExportCount();
}
function updateSelfcheckExportCount(){
 const n=el.selfcheckExportList.querySelectorAll('input[type="checkbox"]:checked').length;
 el.selfcheckExportCount.textContent=n+' valda';el.selfcheckExportCreate.disabled=n===0;
}
function openSelfcheckExport(){
 if(!pdf)return;closeSaveMenu();const filter=document.getElementById('pwProtocolStatusFilter');if(filter)filter.value='all';renderSelfcheckExportList();el.selfcheckExportDialog.showModal();window.SmartMatchProtocolSave?.onDialogOpened?.();
}
function closeSelfcheckExport(){if(el.selfcheckExportDialog.open)el.selfcheckExportDialog.close()}
function safePdfName(value){return String(value||'dorrautomatik').replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g,'-').replace(/^-+|-+$/g,'')||'dorrautomatik'}
/* Standalone export for ONE automation: does not create the full project PDF. */
async function exportSingleAutomationRevision(o){
 if(!o)return;
 const button=document.getElementById('pwDAExportRevision');
 const message=document.getElementById('pwDAExportStatus');
 if(button?.disabled)return;
 const show=text=>{if(message){message.hidden=false;message.textContent=text}};
 if(button)button.disabled=true;
 show('Skapar enbart revisionsprotokollet för '+automationDisplayId(o)+'…');
 try{
  save();
  const fileName='Checklista-revision-'+safePdfName(automationDisplayId(o))+'.pdf';
  const doc=createAutomationSelfcheckPdf(o);
  const file=new File([doc.output('blob')],fileName,{type:'application/pdf'});
  const delivered=await deliverProjectFile(file,'Checklista revision dörrautomatik','Endast revisionsprotokollet för '+automationDisplayId(o));
  if(!delivered){show('Sparandet avbröts. Protokollet är kvar i SmartMatch.');return}
  show('Endast detta protokoll har exporterats: '+fileName+'.');
  setState('Revisionsprotokoll klart för '+automationDisplayId(o)+'. Ingen hel projekt-PDF skapades.');
 }catch(err){
  console.error('[SmartMatch revision PDF]',err);
  show('Kunde inte skapa protokoll-PDF: '+(err?.message||err));
  setState('Kunde inte exportera revisionsprotokollet. Kontrollera meddelandet i protokollet.');
 }finally{if(button)button.disabled=false}
}

function createAutomationSelfcheckPdf(o,options={}){
 const entries=options.entries||PROJECT_AUTOMATION_CHECKS,meta=options.meta||projectMeta,heading=options.title||'CHECKLISTA REVISION DÖRRAUTOMATIK';
 if(!window.jspdf?.jsPDF)throw new Error('PDF-generatorn kunde inte laddas.');
 const doc=new jspdf.jsPDF('p','mm','a4'),left=12,width=186;
 const txt=(value,x,y,size=8,bold=false,color=[25,40,48],opts)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(String(value||''),x,y,opts||{})};
 const addLogo=(x,y,w,h)=>{if(!projectLogoData)return;try{const im=doc.getImageProperties(projectLogoData),pad=2.5,sc=Math.min((w-pad*2)/im.width,(h-pad*2)/im.height),iw=im.width*sc,ih=im.height*sc;doc.addImage(projectLogoData,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}catch(_){}};
 const cell=(label,value,x,y,w,h=7,bold=false,signature=false)=>{doc.setFillColor(252,252,252);doc.setDrawColor(150,150,150);doc.setLineWidth(.2);doc.rect(x,y,w,h,'FD');doc.setFont('helvetica','bold');doc.setFontSize(7.4);doc.setTextColor(82,82,82);const lw=Math.min(w-7,doc.getTextWidth(label)+2.2);doc.text(label,x+1.5,y+h/2+1);if(String(value||'')){doc.setFont('helvetica',signature?'italic':(bold?'bold':'normal'));doc.setFontSize(signature?9.1:8.5);doc.setTextColor(...(signature?[70,125,165]:[20,20,20]));doc.text(doc.splitTextToSize(String(value),Math.max(5,w-lw-3)).slice(0,1),x+1.5+lw,y+h/2+1)}};
 const mark=(kind,cx,cy)=>{doc.setTextColor(20,20,20);if(kind==='na'){doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('-',cx,cy+1,{align:'center'});return}doc.setFont('zapfdingbats','normal');doc.setFontSize(10.2);doc.text(String.fromCharCode(kind==='remark'?53:51),cx,cy+1.2,{align:'center'})};
 doc.setDrawColor(55,55,55);doc.setLineWidth(.22);doc.rect(left,8,width,18);addLogo(left,8,58,18);doc.line(left+58,8,left+58,26);
 txt(options.title?'EGENKONTROLL':'Dokumentnr: 2519-1',left+61,12.4,7.8,true,[25,25,25]);
 txt(heading.toLocaleUpperCase('sv').slice(0,65),left+58+(width-58)/2,18.7,options.title?Math.min(11.9,Math.max(7.1,115/Math.max(1,heading.length))):11.9,true,[25,25,25],{align:'center'});
 txt('SERVICE',left+1.5,36.7,11.4,true,[25,25,25]);let y=40;
 cell('Bokat datum:',meta.date,left,y,93);cell('Nästa provning:',meta.nextDate,left+93,y,93);y+=7;
 cell('ANLÄGGNING:',meta.projectName,left,y,93,7,true);cell('Anläggningsnr:',meta.facilityNo,left+93,y,93,7,true);y+=7;
 cell('KUND / BESTÄLLARE:',meta.customer,left,y,93,7,true);cell('UTFÖRANDE FÖRETAG:',meta.company,left+93,y,93,7,true);y+=7;
 cell('Kontaktperson:',meta.contact,left,y,93);cell('Kontaktperson på objektet:',meta.companyContact,left+93,y,93);y+=7;
 cell('Telefon:',meta.phone,left,y,93);cell('Telefon:',meta.companyPhone,left+93,y,93);y+=7;
 cell('Adress:',meta.address,left,y,93);cell('Adress:',meta.companyAddress,left+93,y,93);y+=7;
 cell('Postnummer / Postadress:',[meta.postalCode,meta.postalCity].filter(Boolean).join(' '),left,y,93);cell('Postnummer / Postadress:',[meta.companyPostalCode,meta.companyPostalCity].filter(Boolean).join(' '),left+93,y,93);y+=7;
 // The model remains editable in the application's technical section, but
 // is not a separate customer-protocol field. Door placement carries context.
 // Identification, placement and order reference belong on the same line.
 // Location is technician-entered text only: do not append model, codes or
 // other inferred values to "Dörr till garaget".
 cell('ID / märkning:',automationDisplayId(o),left,y,66,8,true);
 cell('Placering / dörrlittra:',o.location||'',left+66,y,70,8);
 cell('AO-nummer:',meta.order,left+136,y,50,8,true);y+=10;
 const ws=[9,101,14,21,25,16],titles=['Nr','Benämning / kontrollpunkt','Ingår ej','Klart utan\nanmärkning','Klart med\nanmärkning','Signatur'];let x=left;
 titles.forEach((t,i)=>{doc.setFillColor(...(i===1?[226,226,226]:[238,238,238]));doc.setDrawColor(120,120,120);doc.rect(x,y,ws[i],10,'FD');doc.setFont('helvetica','bold');doc.setFontSize(i>1?6.8:8);doc.setTextColor(35,35,35);const lines=t.split('\n'),hy=lines.length===1?y+6.2:y+4.15;if(i===1)doc.text(lines,x+2,hy,{lineHeightFactor:1});else doc.text(lines,x+ws[i]/2,hy,{align:'center',lineHeightFactor:1});x+=ws[i]});y+=10;
 const notesReserve=30,rowH=Math.max(6.15,Math.min(7.8,(270-y-notesReserve)/Math.max(1,entries.length)));
 entries.forEach(([id,title])=>{
  if(y+rowH>260){
   doc.addPage();y=18;txt(heading+' · fortsättning',left,12,9,true,[25,40,48]);y=19;
   let tx=left;titles.forEach((t,i)=>{doc.setFillColor(...(i===1?[226,226,226]:[238,238,238]));doc.setDrawColor(120,120,120);doc.rect(tx,y,ws[i],10,'FD');doc.setFont('helvetica','bold');doc.setFontSize(i>1?6.8:8);doc.setTextColor(35,35,35);const rows=t.split('\n');doc.text(rows, i===1?tx+2:tx+ws[i]/2, y+(rows.length>1?4.15:6.2),{align:i===1?'left':'center',lineHeightFactor:1});tx+=ws[i]});y+=10;
  }
  const check=o.checks?.[id]||{};let xx=left;const vals=[id,title,'','','',meta.signature||''];
  vals.forEach((v,i)=>{doc.setFillColor(...(i===1?[248,248,248]:[255,255,255]));doc.setDrawColor(145,145,145);doc.rect(xx,y,ws[i],rowH,'FD');
   if(i===1){const titleSize=rowH<7?6.8:7.4,lines=doc.splitTextToSize(title,ws[i]-4).slice(0,2),step=rowH<7?2.4:2.7,startY=y+rowH/2-((lines.length-1)*step)/2+.7;doc.setFont('helvetica','normal');doc.setFontSize(titleSize);doc.setTextColor(25,25,25);doc.text(lines,xx+1.7,startY,{lineHeightFactor:1})}
   else if(i===2&&check.result==='na')mark('na',xx+ws[i]/2,y+rowH/2);
   else if(i===3&&check.result==='ok')mark('ok',xx+ws[i]/2,y+rowH/2);
   else if(i===4&&check.result==='remark')mark('remark',xx+ws[i]/2,y+rowH/2);
   else if(i===5&&String(v||'')){doc.setFont('times','italic');doc.setFontSize(8.8);doc.setTextColor(55,112,165);doc.text(String(v),xx+ws[i]/2,y+rowH/2+1.15,{align:'center',maxWidth:ws[i]-2})}
   else if(i===0){doc.setFont('helvetica','bold');doc.setFontSize(7.7);doc.setTextColor(25,25,25);doc.text(String(v||''),xx+ws[i]/2,y+rowH/2+1,{align:'center'})}
   xx+=ws[i];
  });
  if(options.title&&!check.result){doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.setTextColor(100,114,123);doc.text('Ej kontrollerad',left+9+101+(14+21+25)/2,y+rowH/2+1,{align:'center'})}
  y+=rowH;
 });
 y+=3;if(y+22>276){doc.addPage();y=21}doc.setFillColor(238,238,238);doc.setDrawColor(130,130,130);doc.rect(left,y,width,6,'FD');txt('ALLMÄN INFO / ANMÄRKNING',left+2,y+4.2,8.2,true,[55,55,55]);y+=6;
 const issueText=[...entries.flatMap(([id,title])=>{const c=o.checks?.[id];return c?.result==='remark'?[id+' – '+(c.note?.trim()||title)]:[]}),o.notes].filter(Boolean).join('  ·  ');
 const boxH=Math.max(12,276-y);doc.setFillColor(255,255,255);doc.setDrawColor(145,145,145);doc.rect(left,y,width,boxH,'FD');
 if(issueText){doc.setFont('helvetica','normal');doc.setFontSize(8.3);doc.setTextColor(35,35,35);doc.text(doc.splitTextToSize(issueText,width-7).slice(0,12),left+3,y+5,{lineHeightFactor:1.1})}
 const pageCount=doc.internal.getNumberOfPages();for(let n=1;n<=pageCount;n++){doc.setPage(n);doc.setDrawColor(204,215,223);doc.line(left,284,198,284);txt([meta.company,meta.projectName||meta.facilityNo].filter(Boolean).join(' · ')||'Tillsyno',left,289,7,false,[89,110,123]);txt('Sida '+n+' av '+pageCount,177,289,7,false,[89,110,123])}
 return doc;
}

async function renderAutomationCustomerPreview(){
 if(!automationPreviewPdf)return;
 if(automationPreviewRenderTask)try{automationPreviewRenderTask.cancel()}catch(_){}
 const pg=await automationPreviewPdf.getPage(1),natural=pg.getViewport({scale:1});
 const width=Math.max(280,el.automationPreviewWrap.clientWidth-20),previewScale=Math.max(.55,Math.min(2.1,width/natural.width));
 const vp=pg.getViewport({scale:previewScale}),canvas=el.automationPreviewCanvas,ctx=canvas.getContext('2d');
 const dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.ceil(vp.width*dpr);canvas.height=Math.ceil(vp.height*dpr);canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';
 ctx.setTransform(dpr,0,0,dpr,0,0);
 automationPreviewRenderTask=pg.render({canvasContext:ctx,viewport:vp});
 try{await automationPreviewRenderTask.promise}catch(err){if(err?.name!=='RenderingCancelledException')throw err}
}
async function openAutomationCustomerPreview(){
 const o=selectedAutomation();if(!o)return;
 try{
  const doc=createAutomationSelfcheckPdf(o),arrayBuffer=doc.output('arraybuffer');
  if(automationPreviewPdf)try{await automationPreviewPdf.destroy()}catch(_){}
  automationPreviewPdf=await pdfjsLib.getDocument({data:new Uint8Array(arrayBuffer)}).promise;
  el.automationPreviewTitle.textContent=[automationDisplayId(o),o.model].filter(Boolean).join(' · ');
  el.automationPreviewDialog.querySelector('.pwAutomationHead strong').textContent='Checklista revision dörrautomatik';
  el.automationPreviewDialog.showModal();
  requestAnimationFrame(()=>renderAutomationCustomerPreview().catch(console.error));
 }catch(err){console.error(err);setState('Kundmallen kunde inte visas: '+(err?.message||err))}
}
async function closeAutomationCustomerPreview(){
 if(el.automationPreviewDialog.open)el.automationPreviewDialog.close();
 if(automationPreviewRenderTask)try{automationPreviewRenderTask.cancel()}catch(_){}
 automationPreviewRenderTask=null;
 if(automationPreviewPdf)try{await automationPreviewPdf.destroy()}catch(_){}
 automationPreviewPdf=null;
}
async function exportSelectedSelfchecks(){
 const ids=[...el.selfcheckExportList.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value),selected=automationItems.filter(o=>ids.includes(o.id));
 if(!selected.length)return;
 el.selfcheckExportCreate.disabled=true;setState('Skapar '+selected.length+' egenkontroll-PDF…');
 try{
  const files=selected.map(o=>{const doc=createAutomationSelfcheckPdf(o),blob=doc.output('blob'),name='Checklista-revision-'+safePdfName(automationDisplayId(o))+'.pdf';return new File([blob],name,{type:'application/pdf'})});
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files}))){
   try{await navigator.share({files});setState(files.length+' egenkontroller klara.');closeSelfcheckExport();return}catch(err){if(err?.name==='AbortError'){setState('Exporten avbröts.');return}}
  }
  files.forEach((file,i)=>setTimeout(()=>downloadProjectFile(file),i*120));
  setState(files.length+' egenkontroller skapade som separata PDF-filer.');closeSelfcheckExport();
 }catch(err){console.error(err);setState('Egenkontrollerna kunde inte skapas: '+(err?.message||err))}
 finally{el.selfcheckExportCreate.disabled=false}
}

function isAdministrativeWorkLine(text,label){
 const t=(String(label||'')+' '+String(text||'')).toLocaleLowerCase('sv');
 return /\b(datum|version|revision|rev\.?|leverer\w*|leverans\w*|leverantör|monteras?\s+av|ansluts?\s+av|avmonter\w*|avser|ansvar\w*)\b/.test(t);
}
function isGsWorkLine(text){
 return /(^|[\s:;,\-/])GS(?=$|[\s:;,\-/])/i.test(String(text||''));
}
function groupLines(items){
 const sorted=[...items].sort((a,b)=>b.y-a.y||a.x-b.x),groups=[];
 for(const item of sorted){
  let line=groups.find(g=>Math.abs(g.y-item.y)<=Math.max(2.4,Math.min(5,item.h*.45)));
  if(!line){line={y:item.y,items:[]};groups.push(line)}
  line.items.push(item);
 }
 groups.sort((a,b)=>b.y-a.y);
 return groups.map((g,index)=>{
  const row=[...g.items].sort((a,b)=>a.x-b.x);
  const text=row.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
  let maxGap=0,gapIndex=-1;
  for(let i=1;i<row.length;i++){
   const prev=row[i-1],gap=row[i].x-(prev.x+Math.max(prev.w,prev.text.length*prev.h*.35));
   if(gap>maxGap){maxGap=gap;gapIndex=i}
  }
  const medianH=[...row].map(x=>x.h).sort((a,b)=>a-b)[Math.floor(row.length/2)]||8;
  const upperLetters=text.replace(/[^A-ZÅÄÖ]/g,'').length;
  const letters=text.replace(/[^A-Za-zÅÄÖåäö]/g,'').length;
  const upperRatio=letters?upperLetters/letters:0;
  const heading=(upperRatio>.78&&text.length>3)||Math.max(...row.map(x=>x.h))>medianH*1.35;
  let label='',value='';
  if(gapIndex>0&&maxGap>14){
   label=row.slice(0,gapIndex).map(x=>x.text).join(' ').trim();
   value=row.slice(gapIndex).map(x=>x.text).join(' ').trim();
  }else{
   const colon=text.indexOf(':');
   if(colon>0&&text.slice(colon+1).trim()){label=text.slice(0,colon).trim();value=text.slice(colon+1).trim()}
  }
  const hasPair=!!label&&!!value&&value!=='-'&&value!=='–'&&value!=='—';
  const administrative=isAdministrativeWorkLine(text,label);
  const actionable=!administrative&&!heading&&hasPair&&isGsWorkLine(text);
  return {key:'l'+index,text,actionable,administrative,label,value,y:g.y,items:row};
 });
}
// Projektflöde test: Kryssrutor ska endast komma från faktiska GS-arbetsrader i dörrkortet.
// DT-beslag, littera/antal, tomma celler och enbart streck är inte arbetsmoment.
function labGsWorkItem(line){
 const original=String(line?.text||'').replace(/\s+/g,' ').trim();
 if(!original)return null;
 const gsTag=/(^|[^A-ZÅÄÖ0-9])G[\s/_-]*S(?=$|[^A-ZÅÄÖ0-9])/i;
 const dtTag=/(^|[^A-ZÅÄÖ0-9])D[\s/_-]*T(?=$|[^A-ZÅÄÖ0-9])/i;
 if(!gsTag.test(original)||dtTag.test(original))return null;
 if(line.administrative||/dörrtillverkare|dorrtillverkare/i.test(original))return null;
 const withoutGs=original.replace(gsTag,' ').trim();
 if(/(?:^|[\s:;])[-–—]\s*$/.test(withoutGs))return null;
 const detail=withoutGs.replace(/^[\s:;,\-–—]+|[\s:;,\-–—]+$/g,'').trim();
 if(!detail||/^(?:[-–—.]+|ej\s+aktuellt|ingår\s+ej)$/i.test(detail))return null;
 if(!/[A-ZÅÄÖ]/i.test(detail))return null;
 // Ingen kryssruta för tabellhuvud eller identifieringsfält.
 if(/\b(?:littera|antal|dörr(?:nummer|nr)?|dörrkort|beslagslista|ritningsnummer|projektnummer|projektnr|anläggning|anlaggning|adress|telefon|datum|revision|version|sidnr|sida)\b/i.test(detail))return null;
 const parts=detail.match(/^(.+?)\s+(?=(?:\d|standard\b|typ\b|modell\b))/i);
 const label=parts?parts[1].trim():detail;
 const value=parts?detail.slice(parts[0].length).trim():'';
 if(!label||!/[\p{L}]/u.test(label))return null;
 if(value&&/^(?:[-–—.]+)$/.test(value))return null;
 return {...line,label,value,actionable:true};
}
async function protocolDef(code){
 const pageNo=protocolMap[code];if(!pageNo)return null;
 const key=code+'@'+pageNo;if(protocolDefs[key])return protocolDefs[key];
 const text=await readPageText(pageNo),lines=groupLines(text.items);
 const filtered=lines.map(labGsWorkItem).filter(Boolean);
 const def={code,page:pageNo,lines:filtered,checks:filtered};
 protocolDefs[key]=def;return def;
}
function effectiveChecks(o,def){
 const base=(def?.checks||[]).map(line=>{
  const override=o.overrides?.[line.key]||{};
  if(override.hidden)return null;
  return {...line,label:override.label??line.label,value:override.value??line.value,note:override.note||'',minutes:override.minutes!==null&&override.minutes!==''&&Number.isFinite(Number(override.minutes))?Math.max(0,Number(override.minutes)):null,source:'base'};
 }).filter(Boolean);
 const custom=(o.customItems||[]).map(item=>({
  key:item.id,label:item.label||'Egen punkt',value:item.value||'',note:item.note||'',minutes:item.minutes!==null&&item.minutes!==''&&Number.isFinite(Number(item.minutes))?Math.max(0,Number(item.minutes)):null,source:'custom',actionable:true
 }));
 return [...base,...custom];
}
function buildInstances(){
 const saved=loadSaved(),counts={};
 manualPositions=Array.isArray(saved.manualPositions)?saved.manualPositions:[];positionEdits=saved.positionEdits||{};
 ignoredCodes=new Set(Array.isArray(saved.ignoredCodes)?saved.ignoredCodes.filter(c=>typeof c==='string'):[]);
 drawingNotes=Array.isArray(saved.drawingNotes)?saved.drawingNotes.filter(n=>n&&Number.isFinite(Number(n.page))):[];
 labManualLinks=saved.labManualLinks&&typeof saved.labManualLinks==='object'?{...saved.labManualLinks}:{};
 projectMeta=normalizeProjectMeta(saved.projectMeta);projectLogoData=String(saved.projectLogoData||'');
 automationItems=Array.isArray(saved.automationItems)?saved.automationItems.map(o=>({...o,linkedGsId:o.linkedGsId||'',linkedGsCode:o.linkedGsCode||'',linkedGsRect:Array.isArray(o.linkedGsRect)?o.linkedGsRect.slice():null,gsLinkDismissed:!!o.gsLinkDismissed,arrowTip:o.arrowTip||null,daArrowTip:o.daArrowTip||null,slrDocuments:o.slrDocuments||{},checks:o.checks&&typeof o.checks==='object'?o.checks:{},progress:Number(o.progress||0)})):[];
 stamps.sort((a,b)=>a.page-b.page||b.rect[1]-a.rect[1]||a.rect[0]-b.rect[0]);
 projectStamps.sort((a,b)=>a.page-b.page||b.rect[1]-a.rect[1]||a.rect[0]-b.rect[0]);
 let baseGsIndex=0,baseProjectIndex=0;
 const gsInstances=stamps.map((s,index)=>{
  const legacyIndex=baseGsIndex;if(s.scanSource!=='ocr-confirmed')baseGsIndex++;
  const countKey='gs|'+s.code;counts[countKey]=(counts[countKey]||0)+1;
  const id=s.scanSource==='ocr-confirmed'?'ocr:'+s.code+'@'+s.page+':'+s.rect.map(v=>Math.round(v)).join(','):'scan:'+s.code+'@'+s.page+':'+(s.scanSource?.startsWith('annotation')?s.order:s.rect.map(v=>Math.round(v*10)/10).join(',')),old=saved.instances?.[id]||saved.instances?.[s.code+'@'+s.page+':'+s.order+':'+legacyIndex]||{};
  return {...s,sourceKind:'gs',id,position:counts[countKey],checks:old.checks||{},rowStages:old.rowStages||{},overrides:old.overrides||{},customItems:Array.isArray(old.customItems)?old.customItems:[],progress:Number(old.progress||0)};
 });
 const freeInstances=projectStamps.map((s,index)=>{
  const legacyIndex=baseProjectIndex;if(s.scanSource!=='ocr-confirmed')baseProjectIndex++;
  const countKey='project-code|'+s.code;counts[countKey]=(counts[countKey]||0)+1;
  const id=s.scanSource==='ocr-confirmed'?'ocr-door:'+s.code+'@'+s.page+':'+s.rect.map(v=>Math.round(v)).join(','):'doorcode:'+s.code+'@'+s.page+':'+(s.scanSource?.startsWith('annotation')?s.order:s.rect.map(v=>Math.round(v*10)/10).join(',')),old=saved.instances?.[id]||saved.instances?.['doorcode:'+s.code+'@'+s.page+':'+s.order+':'+legacyIndex]||{};
  return {...s,sourceKind:'project-code',id,position:counts[countKey],checks:old.checks||{},rowStages:old.rowStages||{},overrides:old.overrides||{},customItems:Array.isArray(old.customItems)?old.customItems:[],progress:Number(old.progress||0)};
 });
 instances=[...gsInstances,...freeInstances].sort((a,b)=>a.page-b.page||b.rect[1]-a.rect[1]||a.rect[0]-b.rect[0]);
 instances=instances.filter(o=>!positionEdits[o.id]?.deleted&&!ignoredCodes.has(positionEdits[o.id]?.code||o.code)).map(o=>({...o,...positionEdits[o.id]}));
 manualPositions.forEach(o=>{if(ignoredCodes.has(o.code))return;const old=saved.instances?.[o.id]||{};instances.push({...o,checks:old.checks||{},rowStages:old.rowStages||{},overrides:old.overrides||{},customItems:old.customItems||[],progress:old.progress||0})});
 const totals={};
 instances.forEach(o=>{const key=o.sourceKind+'|'+o.code;totals[key]=(totals[key]||0)+1});
 instances.forEach(o=>o.totalOfCode=totals[o.sourceKind+'|'+o.code]);pmCounts();
}
async function recalc(o){
 const def=await protocolDef(o.code);
 const checks=effectiveChecks(o,def);
 if(!checks.length){o.progress=0;o.workItemCount=0;o.estimatedMinutes=0;o.doneMinutes=0;o.unknownTimeCount=0;return}
 let totalMinutes=0,doneMinutes=0,unknownTimeCount=0;
 checks.forEach(item=>{
  const resolved=resolveItemMinutes(item);
  if(resolved.minutes===null){unknownTimeCount++;return}
  totalMinutes+=resolved.minutes;
  if(o.checks[item.key])doneMinutes+=resolved.minutes;
 });
 const doneCount=checks.filter(item=>!!o.checks[item.key]).length;
 const allDone=doneCount===checks.length;
 o.workItemCount=checks.length;o.estimatedMinutes=totalMinutes;o.doneMinutes=doneMinutes;o.unknownTimeCount=unknownTimeCount;
 if(allDone){o.progress=100;return}
 if(totalMinutes>0){o.progress=Math.min(99,Math.max(0,Math.round(doneMinutes/totalMinutes*100)));return}
 o.progress=Math.round(doneCount/checks.length*100);
}
function matchedProjectInstances(){return instances.filter(o=>!!protocolMap[o.code])}
function smartAllDetectedInstances(){
 // Searching for a GS position NEVER depends on finding a door card.
 return instances;
}
function smartVisibleInstances(){return matchedProjectInstances()}
async function recalcAll(){
 const arr=matchedProjectInstances();
 for(let i=0;i<arr.length;i++){
  await recalc(arr[i]);
  if(smartScanActive)smartLoadProgress(93+Math.floor(3*(i+1)/Math.max(1,arr.length)),'Förbereder protokoll');
 }
 if(smartScanActive)smartLoadProgress(96,'Protokoll klara');
 save();updateStats();renderGroups();renderMarkers();
}
function updateStats(){
 const matched=matchedProjectInstances();
 el.positionCount.textContent=matched.length;
 el.matchedCount.textContent=matched.length;
 el.doneCount.textContent=matched.filter(o=>o.progress===100).length;
 const trackable=matched.filter(o=>(Number(o.workItemCount)||0)>0);
 const totalMinutes=trackable.reduce((a,o)=>a+Math.max(0,Number(o.estimatedMinutes)||0),0);
 const doneMinutes=trackable.reduce((a,o)=>a+Math.max(0,Number(o.doneMinutes)||0),0);
 const allDone=trackable.length>0&&trackable.every(o=>o.progress===100);
 let progress;
 if(totalMinutes>0)progress=allDone?100:Math.min(99,Math.max(0,Math.round(doneMinutes/totalMinutes*100)));
 else progress=trackable.length?Math.round(trackable.reduce((a,o)=>a+o.progress,0)/trackable.length):0;
 el.totalProgress.textContent=progress+'%';renderLabStats();

}
function smartDrawingOptionalContent(doc){
 if(!doc?.getOptionalContentConfig)return null;
 return doc.getOptionalContentConfig().then(config=>{
  const all=config.getGroups?.()||{};
  const groups=all instanceof Map?[...all.entries()]:Object.entries(all);
  for(const [id,group] of groups){
   if(group?.name==='SmartMatch PDF Progress')config.setVisibility(id,false);
  }
  return config;
 }).catch(err=>{console.warn('[SmartMatch] Statuslager i PDF',err);return doc.getOptionalContentConfig()});
}

function renderDrawing(restoreFocus=null){
 if(!pdf)return Promise.resolve();
 clearDrawingDetail();
 const version=++drawingRenderVersion,documentPdf=pdf,pageNumber=page,targetScale=scale;
 smartSetCurrentDrawingFloor(pageNumber); // page badge updates before heavy rendering starts
 if(renderTask)try{renderTask.cancel()}catch(_){}
 drawingRenderQueue=drawingRenderQueue.catch(()=>{}).then(async()=>{
  if(version!==drawingRenderVersion)return;
  const pg=await documentPdf.getPage(pageNumber);if(version!==drawingRenderVersion)return;
  if(DRAWING_IS_MOBILE&&drawingActivePdfPage!==pg){
   drawingActivePdfPage?.cleanup();drawingActivePdfPage=pg;
  }
  const vp=pg.getViewport({scale:targetScale}),natural=pg.getViewport({scale:1});
  // Marker and note coordinates use the full logical viewport; only pixels are capped.
  const raster=pg.getViewport({scale:Math.min((DRAWING_IS_MOBILE?Infinity:targetScale*Math.min(2,window.devicePixelRatio||1)),Math.sqrt(DRAWING_MAX_PIXELS/(natural.width*natural.height)),DRAWING_MAX_SIDE/natural.width,DRAWING_MAX_SIDE/natural.height)});
  const width=Math.ceil(raster.width),height=Math.ceil(raster.height);
  if(!drawingRaster||drawingRaster.document!==documentPdf||drawingRaster.page!==pageNumber||drawingRaster.width!==width||drawingRaster.height!==height){
   const nextCanvas=document.createElement('canvas');nextCanvas.width=width;nextCanvas.height=height;
   const task=pg.render({canvasContext:nextCanvas.getContext('2d'),viewport:raster,optionalContentConfigPromise:drawingOptionalContentPromise||undefined});renderTask=task;
   try{
    await task.promise;
    if(version!==drawingRenderVersion)return;
    el.canvas.width=width;el.canvas.height=height;ctx.drawImage(nextCanvas,0,0);
   }catch(e){if(e?.name==='RenderingCancelledException')return;throw e}
   finally{if(renderTask===task)renderTask=null;nextCanvas.width=nextCanvas.height=0}
   drawingRaster={document:documentPdf,page:pageNumber,width,height};
  }
  el.canvas.style.width=vp.width+'px';el.canvas.style.height=vp.height+'px';
  el.stage.style.width=vp.width+'px';el.stage.style.height=vp.height+'px';
  // Commit the resize and anchor before Safari paints the frame.
  if(restoreFocus){el.stage.style.zoom='';el.stage.style.transform='';el.stage.style.transformOrigin='';restoreDrawingFocus(restoreFocus)}
  el.pageInfo.textContent='Sida '+pageNumber+' / '+documentPdf.numPages;el.zoomInfo.textContent=Math.round(targetScale*100)+'%';
  smartSetCurrentDrawingFloor(pageNumber);
  renderDrawingNotes(vp);renderMarkers();renderAutomationMarkers();scheduleDrawingDetail();

 });
 return drawingRenderQueue;
}

function svgNode(name){return document.createElementNS('http://www.w3.org/2000/svg',name)}
const SMART_NOTE_COLORS=['#173746','#d32f2f','#1565c0','#168147','#8e44ad'];
function smartNoteColor(v){return SMART_NOTE_COLORS.includes(String(v||'').toLowerCase())?String(v).toLowerCase():SMART_NOTE_COLORS[0]}
function smartNoteArrowMarker(color){return 'url(#pwArrowHead-'+SMART_NOTE_COLORS.indexOf(smartNoteColor(color))+')'}
function ensureArrowMarker(svg){
 const defs=svgNode('defs');
 SMART_NOTE_COLORS.forEach((color,index)=>{
  const marker=svgNode('marker'),path=svgNode('path');
  marker.setAttribute('id','pwArrowHead-'+index);marker.setAttribute('viewBox','0 0 10 10');
  marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('orient','auto-start-reverse');
  path.setAttribute('d','M 0 0 L 10 5 L 0 10 z');path.setAttribute('fill',color);
  marker.appendChild(path);defs.appendChild(marker);
 });
 svg.appendChild(defs);
}
function cloneDrawingNotes(list=drawingNotes){return list.map(n=>({...n,rect:Array.isArray(n.rect)?[...n.rect]:n.rect}))}
function rememberDrawingState(snapshot=cloneDrawingNotes()){
 drawingUndoStack.push(snapshot);
 if(drawingUndoStack.length>60)drawingUndoStack.shift();
 drawingRedoStack=[];
 updateDrawingHistoryButtons();
}
function updateDrawingHistoryButtons(){
 if(el.toolUndo)el.toolUndo.disabled=!drawingUndoStack.length&&!drawingNotes.some(n=>Number(n.page)===page);
 if(el.toolRedo)el.toolRedo.disabled=!drawingRedoStack.length;
 if(el.toolDelete)el.toolDelete.disabled=!selectedDrawingNoteId||!noteById(selectedDrawingNoteId);
}
function noteById(id){return drawingNotes.find(n=>n.id===id)||null}
function addNoteHitAttributes(node,noteId,part){
 node.dataset.noteId=noteId;node.dataset.notePart=part||'whole';node.setAttribute('aria-hidden','true');
}
function appendNoteHandle(svg,x,y,noteId,part){
 const c=svgNode('circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','7');c.setAttribute('class','pwNoteHandle');addNoteHitAttributes(c,noteId,part);svg.appendChild(c);
}
// Text is measured in the same on-screen units used by the drawing overlay,
// so the border stays wrapped tightly around each typed line at any zoom.
function smartNoteScreenSize(n,viewport){
 return Math.max(8,Math.min(55,Number(n.fontSize)||12))*(Number(viewport.scale)||1);
}
function smartNoteTextBox(n,viewport,x,baselineY){
 const fontSize=smartNoteScreenSize(n,viewport),bold=n.bold!==false;
 const rows=String(n.text||'Text…').split(String.fromCharCode(10)).slice(0,5);
 const lineHeight=fontSize*1.33,padding=Math.max(4,fontSize*.4);
 const measurement=ctx;
 measurement.save();measurement.font=(bold?'700 ':'400 ')+fontSize+'px system-ui,-apple-system,sans-serif';
 const longest=Math.max(...rows.map(row=>measurement.measureText(row||' ').width),fontSize*.8);
 measurement.restore();
 const w=longest+padding*2,h=lineHeight*rows.length+padding*1.15;
 const top=baselineY-fontSize-padding*.58;
 return {fontSize,bold,rows,lineHeight,padding,x:x-padding,y:top,width:w,height:h};
}
function appendStyledText(svg,viewport,n,x,y,callout=false){
 const box=smartNoteTextBox(n,viewport,x,y),frame=n.frame||'none';
 const frameColor=smartNoteColor(n.frameColor||'#d32f2f'),background=n.background||'none';
 if(frame!=='none'||background!=='none'){
  const rect=svgNode('rect');rect.setAttribute('x',box.x);rect.setAttribute('y',box.y);
  rect.setAttribute('width',box.width);rect.setAttribute('height',box.height);
  rect.setAttribute('rx',frame==='round'?'7':'0');
  rect.setAttribute('fill',background==='none'?'transparent':background);
  rect.setAttribute('stroke',frame==='none'?'none':frameColor);
  rect.setAttribute('stroke-width',frame==='none'?'0':'2');
  rect.setAttribute('class','pwNoteBox');svg.appendChild(rect);
 }
 const t=svgNode('text');t.setAttribute('x',x);t.setAttribute('y',y);
 t.setAttribute('class','pwNoteText'+(callout?' pwNoteCalloutText':'')+(n.id===selectedDrawingNoteId?' selected':''));
 t.style.fontSize=box.fontSize+'px';t.style.fontWeight=box.bold?'750':'400';
 t.style.fill=smartNoteColor(n.color);
 t.style.stroke=background==='none'&&frame==='none'?'#ffffff':'none';
 t.style.strokeWidth=background==='none'&&frame==='none'?'3px':'0';
 box.rows.forEach((row,index)=>{
  const span=svgNode('tspan');span.setAttribute('x',x);span.setAttribute('dy',index===0?'0':box.lineHeight);
  span.textContent=row||' ';t.appendChild(span);
 });
 svg.appendChild(t);
 const hit=svgNode('rect');hit.setAttribute('x',box.x-3);hit.setAttribute('y',box.y-3);
 hit.setAttribute('width',box.width+6);hit.setAttribute('height',box.height+6);
 hit.setAttribute('class','pwNoteTextAreaHit');hit.setAttribute('fill','transparent');
 addNoteHitAttributes(hit,n.id,'label');svg.appendChild(hit);
 return box;
}
function appendTextNote(svg,viewport,n){
 const p=viewport.convertToViewportPoint(Number(n.x),Number(n.y));
 appendStyledText(svg,viewport,n,p[0],p[1]);
 if(n.id===selectedDrawingNoteId&&!inlineNoteDraft)appendNoteHandle(svg,p[0],p[1],n.id,'label');
}
function appendArrowNote(svg,viewport,n){
 const a=viewport.convertToViewportPoint(Number(n.x1),Number(n.y1)),b=viewport.convertToViewportPoint(Number(n.x2),Number(n.y2));
 const line=svgNode('line');line.setAttribute('x1',a[0]);line.setAttribute('y1',a[1]);line.setAttribute('x2',b[0]);line.setAttribute('y2',b[1]);
 line.setAttribute('class','pwNoteArrow'+(n.id===selectedDrawingNoteId?' selected':''));
 line.style.stroke=smartNoteColor(n.color);line.style.strokeWidth=Math.max(1,Math.min(7,Number(n.lineWidth)||3))+'px';
 line.setAttribute('marker-end',smartNoteArrowMarker(n.color));svg.appendChild(line);
 const hit=svgNode('line');hit.setAttribute('x1',a[0]);hit.setAttribute('y1',a[1]);hit.setAttribute('x2',b[0]);hit.setAttribute('y2',b[1]);hit.setAttribute('class','pwNoteLineHit');addNoteHitAttributes(hit,n.id,'whole');svg.appendChild(hit);
 if(n.id===selectedDrawingNoteId&&!inlineNoteDraft){appendNoteHandle(svg,a[0],a[1],n.id,'start');appendNoteHandle(svg,b[0],b[1],n.id,'end')}
}
function appendCalloutNote(svg,viewport,n){
 const target=viewport.convertToViewportPoint(Number(n.x1),Number(n.y1)),label=viewport.convertToViewportPoint(Number(n.x2),Number(n.y2));
 const line=svgNode('line');line.setAttribute('x1',label[0]);line.setAttribute('y1',label[1]);line.setAttribute('x2',target[0]);line.setAttribute('y2',target[1]);
 line.setAttribute('class','pwNoteArrow pwNoteCalloutLine'+(n.id===selectedDrawingNoteId?' selected':''));
 line.style.stroke=smartNoteColor(n.color);line.style.strokeWidth=Math.max(1,Math.min(7,Number(n.lineWidth)||3))+'px';
 line.setAttribute('marker-end',smartNoteArrowMarker(n.color));svg.appendChild(line);
 const lineHit=svgNode('line');lineHit.setAttribute('x1',label[0]);lineHit.setAttribute('y1',label[1]);lineHit.setAttribute('x2',target[0]);lineHit.setAttribute('y2',target[1]);lineHit.setAttribute('class','pwNoteLineHit');addNoteHitAttributes(lineHit,n.id,'whole');svg.appendChild(lineHit);
 appendStyledText(svg,viewport,n,label[0]+9,label[1]-9,true);
 if(n.id===selectedDrawingNoteId&&!inlineNoteDraft){appendNoteHandle(svg,target[0],target[1],n.id,'target');appendNoteHandle(svg,label[0],label[1],n.id,'label')}
}
function appendImageNote(svg,viewport,n){
 if(!Array.isArray(n.rect)||n.rect.length<4||!n.dataUrl)return;
 const r=viewportRect(viewport,n.rect);
 const image=svgNode('image');image.setAttribute('x',r.left);image.setAttribute('y',r.top);image.setAttribute('width',Math.max(10,r.width));image.setAttribute('height',Math.max(10,r.height));image.setAttribute('href',n.dataUrl);image.setAttribute('preserveAspectRatio','xMidYMid meet');image.setAttribute('class','pwNoteImage'+(n.id===selectedDrawingNoteId?' selected':''));addNoteHitAttributes(image,n.id,'whole');svg.appendChild(image);
 if(n.id===selectedDrawingNoteId){
  const frame=svgNode('rect');frame.setAttribute('x',r.left);frame.setAttribute('y',r.top);frame.setAttribute('width',Math.max(10,r.width));frame.setAttribute('height',Math.max(10,r.height));frame.setAttribute('class','pwNoteImageFrame');svg.appendChild(frame);
  appendNoteHandle(svg,r.left+r.width,r.top+r.height,n.id,'resize');
 }
}
function renderDrawingNotes(viewport){
 drawingViewport=viewport;
 const svg=el.drawingNotes;svg.replaceChildren();
 svg.setAttribute('viewBox','0 0 '+viewport.width+' '+viewport.height);
 svg.setAttribute('width',viewport.width);svg.setAttribute('height',viewport.height);
 svg.style.width=viewport.width+'px';svg.style.height=viewport.height+'px';
 ensureArrowMarker(svg);
 const notes=drawingNotes.filter(n=>Number(n.page)===page)
  .map(n=>inlineNoteDraft&&inlineNoteDraft.originalId===n.id?inlineNoteDraft.note:n);
 if(inlineNoteDraft&&!inlineNoteDraft.originalId&&inlineNoteDraft.note.page===page)notes.push(inlineNoteDraft.note);
 notes.forEach(n=>{
  if(n.type==='text')appendTextNote(svg,viewport,n);
  else if(n.type==='arrow')appendArrowNote(svg,viewport,n);
  else if(n.type==='callout')appendCalloutNote(svg,viewport,n);
  else if(n.type==='image')appendImageNote(svg,viewport,n);
 });
 updateDrawingHistoryButtons();
}
function closeToolMenu(){
 el.toolMenu.hidden=true;
 el.toolMenuButton.setAttribute('aria-expanded','false');
}
function positionToolMenu(){
 if(el.toolMenu.hidden)return;
 const rect=el.toolMenuButton.getBoundingClientRect();
 const vw=document.documentElement.clientWidth||window.innerWidth;
 const viewport=window.visualViewport;
 const vh=(viewport?.height||window.innerHeight)+(viewport?.offsetTop||0);
 const width=Math.min(354,Math.max(180,vw-16));
 const left=Math.max(8,Math.min(rect.left,vw-width-8));
 const belowSpace=vh-rect.bottom;
 const panelHeight=Math.min(380,Math.max(140,el.toolMenu.scrollHeight||320),Math.max(150,vh-20));
 const top=belowSpace>=Math.min(240,panelHeight)?rect.bottom+5:Math.max(7,rect.top-panelHeight-5);
 el.toolMenu.style.setProperty('position','fixed','important');
 el.toolMenu.style.setProperty('top',Math.round(top)+'px','important');
 el.toolMenu.style.setProperty('left',Math.round(left)+'px','important');
 el.toolMenu.style.setProperty('right','auto','important');
 el.toolMenu.style.setProperty('bottom','auto','important');
 el.toolMenu.style.setProperty('width',Math.round(width)+'px','important');
 el.toolMenu.style.setProperty('max-height',Math.max(110,Math.floor(vh-top-12))+'px','important');
}
function toggleToolMenu(){
 const open=el.toolMenu.hidden;
 el.toolMenu.hidden=!open;
 el.toolMenuButton.setAttribute('aria-expanded',String(open));
 if(open)positionToolMenu();
}
function setDrawingTool(tool){
 if(inlineNoteDraft)smartCancelInlineNote();
 if(tool&&bulkSelectMode)setBulkSelectMode(false);
 drawingTool=drawingTool===tool?'':tool;
 el.toolText.setAttribute('aria-pressed',String(drawingTool==='text'));
 el.toolCallout.setAttribute('aria-pressed',String(drawingTool==='callout'));
 el.toolArrow.setAttribute('aria-pressed',String(drawingTool==='arrow'));
 el.toolMenuButton.classList.toggle('active',!!drawingTool);
 el.viewer.classList.toggle('noteMode',!!drawingTool);
 closeToolMenu();
}
function stagePoint(clientX,clientY){
 const r=el.stage.getBoundingClientRect();
 return {x:clientX-r.left,y:clientY-r.top};
}
function smartUpdateInlineNoteFromFields(){
 if(!inlineNoteDraft)return;
 const note=inlineNoteDraft.note;
 note.text=document.getElementById('pwInlineNoteText').value.slice(0,300);
 note.fontSize=Number(document.getElementById('pwInlineNoteSize').value)||12;
 note.bold=document.getElementById('pwInlineNoteBold').getAttribute('aria-pressed')==='true';
 note.frame=document.getElementById('pwInlineNoteFrame').value;
 note.frameColor=document.getElementById('pwInlineNoteFrameColor').value;
 note.background=document.getElementById('pwInlineNoteBackground').value;
 note.lineWidth=Number(document.getElementById('pwInlineNoteLineWidth').value)||3;
 if(drawingViewport)renderDrawingNotes(drawingViewport);
}
function smartPositionInlineEditor(point){
 const box=document.getElementById('pwInlineNoteEditor');
 const width=Math.min(340,Math.max(230,el.viewer.clientWidth-20));
 const visibleLeft=el.viewer.scrollLeft+8,visibleTop=el.viewer.scrollTop+8;
 const maxLeft=visibleLeft+Math.max(0,el.viewer.clientWidth-width-16);
 const maxTop=visibleTop+Math.max(0,el.viewer.clientHeight-290);
 box.style.left=Math.max(visibleLeft,Math.min(maxLeft,point.x+10))+'px';
 box.style.top=Math.max(visibleTop,Math.min(maxTop,point.y+13))+'px';
}
function smartOpenInlineNoteEditor(note,position=null,editing=false){
 if(!note||!pdf||!drawingViewport)return;
 if(inlineNoteDraft)smartCancelInlineNote();
 const edit=document.getElementById('pwInlineNoteEditor'),draft={...note};
 inlineNoteDraft={originalId:editing?note.id:null,note:draft,previousSelection:selectedDrawingNoteId};
 selectedDrawingNoteId=draft.id;
 const txt=document.getElementById('pwInlineNoteText');
 txt.value=String(note.text||'');
 const noText=note.type==='arrow';
 txt.closest('.smNoteTextField').hidden=noText;
 document.getElementById('pwNoteSizeLabel').hidden=noText;
 document.getElementById('pwInlineNoteBold').hidden=noText;
 for(const id of ['pwNoteFrameLabel','pwNoteFrameColorLabel','pwNoteBackgroundLabel'])
  document.getElementById(id).hidden=noText;
 document.getElementById('pwNoteLineWidthLabel').hidden=note.type==='text';
 const size=String(note.fontSize||12),sizes=document.getElementById('pwInlineNoteSize');
 sizes.value=[...sizes.options].some(o=>o.value===size)?size:'12';
 const bold=document.getElementById('pwInlineNoteBold');
 bold.setAttribute('aria-pressed',String(note.bold!==false));
 document.getElementById('pwInlineNoteFrame').value=note.frame||'none';
 document.getElementById('pwInlineNoteFrameColor').value=note.frameColor||'#d32f2f';
 document.getElementById('pwInlineNoteBackground').value=note.background||'none';
 document.getElementById('pwInlineNoteLineWidth').value=String(note.lineWidth||3);
 const color=smartNoteColor(note.color);draft.color=color;
 document.querySelectorAll('[data-note-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.noteColor===color)));
 const location=position||((note.type==='text')
  ?drawingViewport.convertToViewportPoint(note.x,note.y)
  :drawingViewport.convertToViewportPoint(note.x2,note.y2));
 edit.hidden=false;
 smartPositionInlineEditor(Array.isArray(location)?{x:location[0],y:location[1]}:location);
 renderDrawingNotes(drawingViewport);
 if(!noText)requestAnimationFrame(()=>{txt.focus({preventScroll:true});txt.setSelectionRange(txt.value.length,txt.value.length)});
}
function smartCancelInlineNote(){
 if(!inlineNoteDraft)return;
 selectedDrawingNoteId=inlineNoteDraft.originalId||inlineNoteDraft.previousSelection||null;
 inlineNoteDraft=null;document.getElementById('pwInlineNoteEditor').hidden=true;
 if(drawingViewport)renderDrawingNotes(drawingViewport);
}
function smartCommitInlineNote(){
 if(!inlineNoteDraft)return;
 smartUpdateInlineNoteFromFields();
 const {note,originalId}=inlineNoteDraft;
 if(note.type!=='arrow'&&!String(note.text||'').trim()){
  document.getElementById('pwInlineNoteText').focus();
  return;
 }
 rememberDrawingState();
 note.text=String(note.text||'').trim();
 if(originalId){
  const index=drawingNotes.findIndex(n=>n.id===originalId);
  if(index>=0)drawingNotes[index]={...note};
  else drawingNotes.push({...note});
 }else drawingNotes.push({...note});
 selectedDrawingNoteId=note.id;inlineNoteDraft=null;
 document.getElementById('pwInlineNoteEditor').hidden=true;
 save();
 if(drawingViewport)renderDrawingNotes(drawingViewport);
 setState('Markeringen är sparad i projektet. Tryck på den igen för att ändra text och färg.');
}
async function addTextNote(point){
 if(!pdf)return;
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale}),pdfPoint=vp.convertToPdfPoint(point.x,point.y);
 const note={id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:'text',
  page,x:pdfPoint[0],y:pdfPoint[1],text:'',color:'#173746',fontSize:12,bold:true,frame:'none',
  frameColor:'#d32f2f',background:'none'};
 smartOpenInlineNoteEditor(note,point,false);
}
async function finishArrowNote(start,end){
 if(!pdf||Math.hypot(end.x-start.x,end.y-start.y)<8)return;
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale}),a=vp.convertToPdfPoint(start.x,start.y),b=vp.convertToPdfPoint(end.x,end.y);
 rememberDrawingState();
 const note={id:'n'+Date.now().toString(36),type:'arrow',page,x1:a[0],y1:a[1],x2:b[0],y2:b[1],color:'#173746',lineWidth:3};
 smartOpenInlineNoteEditor(note,end,false);
}
async function finishCalloutNote(target,label){
 if(!pdf)return;
 let labelPoint=label;
 if(Math.hypot(label.x-target.x,label.y-target.y)<18)labelPoint={x:target.x+90,y:Math.max(18,target.y-42)};
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale}),a=vp.convertToPdfPoint(target.x,target.y),b=vp.convertToPdfPoint(labelPoint.x,labelPoint.y);
 const note={id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:'callout',page,
  x1:a[0],y1:a[1],x2:b[0],y2:b[1],text:'',color:'#173746',fontSize:12,bold:true,
  frame:'none',frameColor:'#d32f2f',background:'none',lineWidth:3};
 smartOpenInlineNoteEditor(note,labelPoint,false);
}
function readImageFileCompressed(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(reader.error||new Error('Fotot kunde inte läsas.'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('Fotot kunde inte öppnas.'));
   img.onload=()=>{
    const max=1200,ratio=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const c=canvas.getContext('2d');c.drawImage(img,0,0,w,h);
    let dataUrl;try{dataUrl=canvas.toDataURL('image/jpeg',.8)}catch(_){dataUrl=String(reader.result||'')}
    resolve({dataUrl,width:w,height:h,name:file.name||'Foto'});
   };
   img.src=String(reader.result||'');
  };
  reader.readAsDataURL(file);
 });
}
async function addImageNote(point){
 if(!pdf||!pendingImage)return;
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale});
 const ratio=Math.max(.25,Math.min(4,pendingImage.width/Math.max(1,pendingImage.height)));
 let w=Math.min(220,Math.max(110,vp.width*.22)),h=w/ratio;
 if(h>180){h=180;w=h*ratio}
 const left=Math.max(0,Math.min(vp.width-w,point.x-w/2)),top=Math.max(0,Math.min(vp.height-h,point.y-h/2));
 const a=vp.convertToPdfPoint(left,top),b=vp.convertToPdfPoint(left+w,top+h);
 rememberDrawingState();
 const note={id:'n'+Date.now().toString(36),type:'image',page,rect:[a[0],a[1],b[0],b[1]],dataUrl:pendingImage.dataUrl,name:pendingImage.name||'Foto'};
 drawingNotes.push(note);selectedDrawingNoteId=note.id;pendingImage=null;drawingTool='';save();renderDrawingNotes(vp);setDrawingTool('');
 setState('Foto tillagt. Markera fotot för att flytta, ändra storlek eller ta bort det.');
}
async function chooseDrawingImage(file){
 if(!file)return;
 try{
  setState('Förbereder foto…');pendingImage=await readImageFileCompressed(file);drawingTool='image';el.toolMenuButton.classList.add('active');el.viewer.classList.add('noteMode');closeToolMenu();
  setState('Fotot är klart. Tryck på ritningen där du vill placera det.');
 }catch(err){console.error(err);pendingImage=null;setDrawingTool('');setState('Fotot kunde inte läggas till: '+(err?.message||err))}
}
function deleteSelectedDrawingNote(){
 if(inlineNoteDraft)smartCancelInlineNote();
 if(!selectedDrawingNoteId)return;
 const index=drawingNotes.findIndex(n=>n.id===selectedDrawingNoteId);if(index<0)return;
 rememberDrawingState();drawingNotes.splice(index,1);selectedDrawingNoteId='';save();closeToolMenu();
 if(drawingViewport)renderDrawingNotes(drawingViewport);
}
function beginDrawingTool(e){
 if(!drawingTool||!pdf||inlineNoteDraft||e.target.closest?.('#pwInlineNoteEditor')||e.pointerType==='mouse'&&e.button!==0)return false;
 if(!el.stage.contains(e.target)||e.target.closest?.('.pwToolbar,.pwSide,.pwShowPositions'))return false;
 e.preventDefault();e.stopPropagation();
 const point=stagePoint(e.clientX,e.clientY);
 if(drawingTool==='image'){
  addImageNote(point);return true;
 }
 if(drawingTool==='text'){
  drawingToolGesture={pointerId:e.pointerId,type:'text',start:point};
 }else{
  const line=svgNode('line');
  if(drawingTool==='callout'){
   line.setAttribute('x1',point.x);line.setAttribute('y1',point.y);line.setAttribute('x2',point.x);line.setAttribute('y2',point.y);
  }else{
   line.setAttribute('x1',point.x);line.setAttribute('y1',point.y);line.setAttribute('x2',point.x);line.setAttribute('y2',point.y);
  }
  line.setAttribute('class','pwNotePreview');line.setAttribute('marker-end',smartNoteArrowMarker('#173746'));
  el.drawingNotes.appendChild(line);
  drawingToolGesture={pointerId:e.pointerId,type:drawingTool,start:point,preview:line};
 }
 try{el.viewer.setPointerCapture(e.pointerId)}catch(_){}
 return true;
}
function moveDrawingTool(e){
 if(!drawingToolGesture||drawingToolGesture.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const point=stagePoint(e.clientX,e.clientY);
 if(drawingToolGesture.type==='arrow'){
  drawingToolGesture.preview?.setAttribute('x2',point.x);drawingToolGesture.preview?.setAttribute('y2',point.y);
 }else if(drawingToolGesture.type==='callout'){
  drawingToolGesture.preview?.setAttribute('x1',point.x);drawingToolGesture.preview?.setAttribute('y1',point.y);
  drawingToolGesture.preview?.setAttribute('x2',drawingToolGesture.start.x);drawingToolGesture.preview?.setAttribute('y2',drawingToolGesture.start.y);
 }
 return true;
}
async function endDrawingTool(e){
 if(!drawingToolGesture||drawingToolGesture.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const g=drawingToolGesture;drawingToolGesture=null;
 try{el.viewer.releasePointerCapture(e.pointerId)}catch(_){}
 const end=stagePoint(e.clientX,e.clientY);g.preview?.remove();
 if(g.type==='text')await addTextNote(end);
 else if(g.type==='callout')await finishCalloutNote(g.start,end);
 else await finishArrowNote(g.start,end);
 return true;
}
function beginNoteDrag(e){
 const hit=e.target.closest?.('[data-note-id]');if(!hit||!pdf||bulkSelectMode||!drawingViewport)return false;
 if(e.pointerType==='mouse'&&e.button!==0)return false;
 const note=noteById(hit.dataset.noteId);if(!note||Number(note.page)!==page)return false;
 e.preventDefault();e.stopPropagation();
 selectedDrawingNoteId=note.id;
 const point=stagePoint(e.clientX,e.clientY),pdfPoint=drawingViewport.convertToPdfPoint(point.x,point.y);
 drawingNoteDrag={pointerId:e.pointerId,id:note.id,part:hit.dataset.notePart||'whole',startPoint:point,startPdf:pdfPoint,beforeNote:{...note,rect:Array.isArray(note.rect)?[...note.rect]:note.rect},beforeNotes:cloneDrawingNotes(),moved:false};
 renderDrawingNotes(drawingViewport);
 try{el.viewer.setPointerCapture(e.pointerId)}catch(_){}
 return true;
}
function moveNoteFromDrag(g,currentPoint){
 const note=noteById(g.id);if(!note||!drawingViewport)return;
 const pdfPoint=drawingViewport.convertToPdfPoint(currentPoint.x,currentPoint.y),dx=pdfPoint[0]-g.startPdf[0],dy=pdfPoint[1]-g.startPdf[1],b=g.beforeNote;
 if(note.type==='text'){note.x=Number(b.x)+dx;note.y=Number(b.y)+dy;return}
 const moveBoth=g.part==='whole';
 if(note.type==='arrow'){
  if(moveBoth||g.part==='start'){note.x1=Number(b.x1)+dx;note.y1=Number(b.y1)+dy}
  if(moveBoth||g.part==='end'){note.x2=Number(b.x2)+dx;note.y2=Number(b.y2)+dy}
 }else if(note.type==='callout'){
  if(moveBoth||g.part==='target'){note.x1=Number(b.x1)+dx;note.y1=Number(b.y1)+dy}
  if(moveBoth||g.part==='label'){note.x2=Number(b.x2)+dx;note.y2=Number(b.y2)+dy}
 }else if(note.type==='image'&&Array.isArray(b.rect)){
  if(g.part==='resize'){
   note.rect=[b.rect[0],b.rect[1],pdfPoint[0],pdfPoint[1]];
  }else{
   note.rect=[Number(b.rect[0])+dx,Number(b.rect[1])+dy,Number(b.rect[2])+dx,Number(b.rect[3])+dy];
  }
 }
}
function moveNoteDrag(e){
 if(!drawingNoteDrag||drawingNoteDrag.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const point=stagePoint(e.clientX,e.clientY);
 drawingNoteDrag.moved=drawingNoteDrag.moved||Math.hypot(point.x-drawingNoteDrag.startPoint.x,point.y-drawingNoteDrag.startPoint.y)>2;
 moveNoteFromDrag(drawingNoteDrag,point);renderDrawingNotes(drawingViewport);return true;
}
function endNoteDrag(e){
 if(!drawingNoteDrag||drawingNoteDrag.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const g=drawingNoteDrag;drawingNoteDrag=null;
 try{el.viewer.releasePointerCapture(e.pointerId)}catch(_){}
 if(g.moved){
  drawingUndoStack.push(g.beforeNotes);if(drawingUndoStack.length>60)drawingUndoStack.shift();drawingRedoStack=[];save();
 }else{
  const note=noteById(g.id);
  if(note&&(note.type==='text'||note.type==='callout'||note.type==='arrow')){
   smartOpenInlineNoteEditor(note,null,true);return true;
  }
 }
 renderDrawingNotes(drawingViewport);return true;
}
function cancelNoteDrag(e){
 if(!drawingNoteDrag)return false;
 const g=drawingNoteDrag;drawingNoteDrag=null;drawingNotes=g.beforeNotes;selectedDrawingNoteId=g.id;
 try{if(e)el.viewer.releasePointerCapture(e.pointerId)}catch(_){}
 if(drawingViewport)renderDrawingNotes(drawingViewport);return true;
}
function applyDrawingSnapshot(snapshot){
 drawingNotes=cloneDrawingNotes(snapshot);selectedDrawingNoteId='';save();
 if(drawingViewport)renderDrawingNotes(drawingViewport);
}
function undoDrawingNote(){
 if(inlineNoteDraft)smartCancelInlineNote();
 if(drawingUndoStack.length){
  drawingRedoStack.push(cloneDrawingNotes());applyDrawingSnapshot(drawingUndoStack.pop());updateDrawingHistoryButtons();return;
 }
 const index=drawingNotes.map((n,i)=>({n,i})).filter(x=>Number(x.n.page)===page).pop()?.i;
 if(Number.isInteger(index)){
  drawingRedoStack.push(cloneDrawingNotes());const next=cloneDrawingNotes();next.splice(index,1);applyDrawingSnapshot(next);updateDrawingHistoryButtons();
 }
}
function redoDrawingNote(){
 if(inlineNoteDraft)smartCancelInlineNote();
 if(!drawingRedoStack.length)return;
 drawingUndoStack.push(cloneDrawingNotes());applyDrawingSnapshot(drawingRedoStack.pop());updateDrawingHistoryButtons();
}
function viewportRect(viewport,rect){
 try{
  const mapped=viewport.convertToViewportRectangle(rect);
  const left=Math.min(mapped[0],mapped[2]),top=Math.min(mapped[1],mapped[3]);
  return {left,top,width:Math.abs(mapped[2]-mapped[0]),height:Math.abs(mapped[3]-mapped[1])};
 }catch(_){
  const [x1,y1,x2,y2]=rect;
  const p1=viewport.convertToViewportPoint(x1,y1),p2=viewport.convertToViewportPoint(x2,y2);
  return {left:Math.min(p1[0],p2[0]),top:Math.min(p1[1],p2[1]),width:Math.abs(p2[0]-p1[0]),height:Math.abs(p2[1]-p1[1])};
 }
}
function updateBulkBar(){
 el.bulkBar.hidden=!bulkSelectMode;
 el.bulkCount.textContent=bulkSelected.size+' valda';
 el.bulkDone.disabled=bulkSelected.size===0;
 el.bulkClear.disabled=bulkSelected.size===0;
}
function clearBulkSelection(){
 bulkSelected.clear();updateBulkBar();renderMarkers();
}
function setBulkSelectMode(enabled){
 bulkSelectMode=!!enabled;
 if(bulkSelectMode)setDrawingTool('');
 else bulkSelected.clear();
 el.bulkSelect.setAttribute('aria-pressed',String(bulkSelectMode));
 el.selectionRect.hidden=true;bulkDrag=null;
 updateBulkBar();renderMarkers();
}
function toggleBulkInstance(o){
 if(bulkSelected.has(o.id))bulkSelected.delete(o.id);else bulkSelected.add(o.id);
 updateBulkBar();renderMarkers();
}
function selectAllOnPage(){
 matchedProjectInstances().filter(o=>o.page===page).forEach(o=>bulkSelected.add(o.id));
 updateBulkBar();renderMarkers();
}
function beginBulkDrag(e){
 if(!bulkSelectMode||!pdf||e.pointerType!=='mouse'||e.button!==0||e.target.closest?.('.pwStampHit,.pwAutomationMarker'))return false;
 if(!el.stage.contains(e.target))return false;
 e.preventDefault();e.stopPropagation();
 const p=stagePoint(e.clientX,e.clientY);
 bulkDrag={pointerId:e.pointerId,start:p,last:p};
 el.selectionRect.hidden=false;
 el.selectionRect.style.left=p.x+'px';el.selectionRect.style.top=p.y+'px';el.selectionRect.style.width='0px';el.selectionRect.style.height='0px';
 try{el.viewer.setPointerCapture(e.pointerId)}catch(_){}
 return true;
}
function moveBulkDrag(e){
 if(!bulkDrag||bulkDrag.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const p=stagePoint(e.clientX,e.clientY);bulkDrag.last=p;
 const l=Math.min(bulkDrag.start.x,p.x),t=Math.min(bulkDrag.start.y,p.y),w=Math.abs(p.x-bulkDrag.start.x),h=Math.abs(p.y-bulkDrag.start.y);
 el.selectionRect.style.left=l+'px';el.selectionRect.style.top=t+'px';el.selectionRect.style.width=w+'px';el.selectionRect.style.height=h+'px';
 return true;
}
async function endBulkDrag(e){
 if(!bulkDrag||bulkDrag.pointerId!==e.pointerId)return false;
 e.preventDefault();e.stopPropagation();
 const g=bulkDrag;bulkDrag=null;el.selectionRect.hidden=true;
 try{el.viewer.releasePointerCapture(e.pointerId)}catch(_){}
 const x1=Math.min(g.start.x,g.last.x),x2=Math.max(g.start.x,g.last.x),y1=Math.min(g.start.y,g.last.y),y2=Math.max(g.start.y,g.last.y);
 if(x2-x1<6&&y2-y1<6)return true;
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale});
 matchedProjectInstances().filter(o=>o.page===page).forEach(o=>{
  const r=viewportRect(vp,o.rect),rx2=r.left+r.width,ry2=r.top+r.height;
  if(r.left<=x2&&rx2>=x1&&r.top<=y2&&ry2>=y1)bulkSelected.add(o.id);
 });
 updateBulkBar();renderMarkers();return true;
}
async function markBulkDone(){
 if(!bulkSelected.size)return;
 el.bulkDone.disabled=true;setState('Klarmarkerar '+bulkSelected.size+' valda positioner…');
 let changed=0,withoutChecks=0;
 for(const id of [...bulkSelected]){
  const o=instances.find(x=>x.id===id);if(!o)continue;
  const def=await protocolDef(o.code),checks=effectiveChecks(o,def);
  if(!checks.length){withoutChecks++;continue}
  checks.forEach(item=>o.checks[item.key]=true);
  await recalc(o);changed++;
 }
 bulkSelected.clear();updateBulkBar();save();updateStats();renderGroups();renderMarkers();
 setState(changed+' positioner klarmarkerade'+(withoutChecks?' · '+withoutChecks+' saknade kontrollpunkter':'')+'.');
 if(el.timeDialog.open)await renderTimeReport();
}
const TIME_CATEGORY_DEFS=[
 {key:'wc',label:'WC-/toalettbehör',minutes:10,rx:/(wc[\s-]*behör|wc[\s-]*behor|toalettbehör|toalettbehor|toalett)/i},
 {key:'cylinder',label:'Cylinder',minutes:20,rx:/(cylinder|cylindermontage)/i},
 {key:'strike',label:'Slutbleck / elslutbleck',minutes:10,rx:/(slutbleck|elslutbleck|elbleck|step[\s-]*(40|92))/i},
 {key:'handle',label:'Trycke / handtag',minutes:10,rx:/(trycke|tryckesats|handtag)/i},
 {key:'lockcase',label:'Låshus',minutes:20,rx:/(låshus|lashus|låskista|laskista)/i},
 {key:'closer',label:'Dörrstängare',minutes:30,rx:/(dörrstäng|dorrstang)/i},
 {key:'automation',label:'Dörrautomatik',minutes:480,rx:/(dörrautom|dorautom|automatik|sw100|sw200|sw300|ed100|ed250|emsw)/i},
 {key:'elbow',label:'Armbågskontakt',minutes:30,rx:/(armbåg|armbag|\bak\b)/i},
 {key:'magnet',label:'Magnet / dragmagnet',minutes:30,rx:/(dragmagnet|dörrmagnet|dorrmagnet|magnet|maglås|maglas)/i},
 // Recognize the 179 emergency-exit fitting, but do NOT invent a fitting time.
 // A plain drawing ID containing 179 must not create an estimated task.
 {key:'escape179',label:'179 utrymningsbehör',minutes:null,rx:/(utrymningsbehör|utrymningsbehor|utrymningsbeslag|panikregel|\b179\b[\s:/-]*(?:utrymning|beslag|behör|behor))/i}
];
// Stable app-level defaults for NEW projects on this browser/device.
// Saved project-specific times remain authoritative for that project's PDF.
const SMART_TIME_DEFAULTS_KEY='smartmatch-worktime-defaults-v1';
function loadAppTimeSettings(){
 try{
  const data=JSON.parse(window.localStorage?.getItem(SMART_TIME_DEFAULTS_KEY)||'null');
  return data?.minutes&&typeof data.minutes==='object'?data.minutes:{};
 }catch(_){return {}}
}
function saveAppTimeSettings(settings){
 try{
  const builtins={};
  for(const d of TIME_CATEGORY_DEFS)
   if(Object.prototype.hasOwnProperty.call(settings,d.key))builtins[d.key]=settings[d.key];
  window.localStorage?.setItem(SMART_TIME_DEFAULTS_KEY,JSON.stringify({schema:1,minutes:builtins}));
 }catch(err){console.warn('[SmartMatch] Appens tidsmall kunde inte lagras på den här enheten',err)}
}
function validTimeValue(value,fallback){
 if(value===null)return null; // No estimate is different from zero minutes.
 if(value===undefined||value==='')return fallback;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0?n:fallback;
}
function loadCustomTimeCategories(){
 const saved=smartProjectTimeConfig?.custom||[];
 if(!Array.isArray(saved))return [];
 return saved.map(x=>({
  key:String(x?.key||''),
  label:String(x?.label||'').trim(),
  minutes:Math.max(0,Number(x?.minutes)||0),
  terms:Array.isArray(x?.terms)?x.terms.map(v=>String(v||'').trim().toLocaleLowerCase('sv')).filter(Boolean):[]
 })).filter(x=>x.key&&x.label);
}
function saveCustomTimeCategories(list){
 smartProjectTimeConfig={...(smartProjectTimeConfig||{}),custom:JSON.parse(JSON.stringify(list))};save();
}
function allTimeCategoryDefs(){
 return [
  ...loadCustomTimeCategories().map(x=>({...x,custom:true})),
  ...TIME_CATEGORY_DEFS.map(x=>({...x,custom:false}))
 ];
}
function loadTimeSettings(){
 const saved=smartProjectTimeConfig?.minutes||{},app=loadAppTimeSettings(),out={};
 for(const d of TIME_CATEGORY_DEFS){
  const key=d.key,source=Object.prototype.hasOwnProperty.call(saved,key)?saved:
   Object.prototype.hasOwnProperty.call(app,key)?app:null;
  out[key]=source?validTimeValue(source[key],d.minutes):d.minutes;
 }
 return out;
}
function saveTimeSettings(settings){
 // Store technician-adjusted defaults for upcoming projects on this device,
 // AND embed the current project's settings in its next saved project PDF.
 smartProjectTimeConfig={...(smartProjectTimeConfig||{}),minutes:{...settings}};
 saveAppTimeSettings(settings);
 save();
}
function loadDisabledTimeCategories(){
 const saved=smartProjectTimeConfig?.disabled||[];
 return new Set(Array.isArray(saved)?saved:[]);
}
function saveDisabledTimeCategories(set){
 smartProjectTimeConfig={...(smartProjectTimeConfig||{}),disabled:[...set]};save();
}
function timeCategoryMinutes(category,settings=loadTimeSettings()){
 if(!category)return null;
 if(category.custom)return Math.max(0,Number(category.minutes)||0);
 return validTimeValue(settings[category.key],category.minutes);
}
function classifyTimeItem(item){
 const text=(String(item?.label||'')+' '+String(item?.value||'')+' '+String(item?.note||'')).toLocaleLowerCase('sv');
 const defs=allTimeCategoryDefs();
 const custom=defs.find(d=>d.custom&&d.terms?.some(term=>term&&text.includes(term)));
 if(custom)return custom;
 return defs.find(d=>!d.custom&&d.rx?.test(text))||null;
}
function resolveItemMinutes(item){
 if(item?.minutes!==null&&item?.minutes!==''&&Number.isFinite(Number(item?.minutes)))return {minutes:Math.max(0,Number(item.minutes)),source:'item',category:classifyTimeItem(item)};
 const category=classifyTimeItem(item);
 if(!category)return {minutes:null,source:'none',category:null};
 if(loadDisabledTimeCategories().has(category.key))return {minutes:null,source:'disabled',category};
 return {minutes:timeCategoryMinutes(category),source:'category',category};
}
function parseDurationInput(value){
 const raw=String(value??'').trim().replace(/\s+/g,'');
 if(!raw)return null;
 const match=raw.match(/^(\d+)(?:[,:.](\d{1,2}))?$/);
 if(!match)return NaN;
 const hours=Number(match[1]),minutes=match[2]===undefined?0:Number(match[2]);
 if(!Number.isFinite(hours)||!Number.isFinite(minutes))return NaN;
 return Math.max(0,Math.round(hours*60+minutes));
}
function formatDurationInput(minutes){
 const total=Math.max(0,Math.round(Number(minutes)||0)),hours=Math.floor(total/60),rest=total%60;
 if(!rest)return String(hours);
 return hours+','+String(rest).padStart(2,'0');
}
function readDurationField(input,allowBlank=false){
 const raw=String(input?.value||'').trim();
 if(input)input.setCustomValidity('');
 if(allowBlank&&!raw)return null;
 const minutes=parseDurationInput(raw);
 if(minutes===null&&!allowBlank)return 0;
 if(!Number.isFinite(minutes)){
  if(input){
   input.setCustomValidity('Skriv tiden som timmar,minuter. Exempel: 8 eller 0,15 eller 3,10.');
   input.reportValidity();input.focus();
  }
  return undefined;
 }
 return minutes;
}
function formatWorkMinutes(minutes){
 const m=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(m/60),rest=m%60;
 if(!h)return m+' min';
 if(!rest)return h+' h';
 return h+' h '+rest+' min';
}
async function calculateTimeReport(){
 const settings=loadTimeSettings(),disabled=loadDisabledTimeCategories(),defs=allTimeCategoryDefs(),rows={};
 defs.forEach(d=>rows[d.key]={def:d,count:0,doneCount:0,manualCount:0,unknownCount:0,totalMinutes:0,doneMinutes:0,disabled:disabled.has(d.key)});
 const manualOther={key:'manual',label:'Egna tider',count:0,doneCount:0,totalMinutes:0,doneMinutes:0};
 let unknown=0,itemCount=0,doneItemCount=0;
 for(const o of instances){
  const def=await protocolDef(o.code),checks=effectiveChecks(o,def);
  for(const item of checks){
   itemCount++;if(o.checks[item.key])doneItemCount++;
   const resolved=resolveItemMinutes(item),category=resolved.category;
   if(resolved.minutes===null){
    unknown++;
    if(category&&rows[category.key]){
     const r=rows[category.key];r.count++;r.unknownCount++;
     if(o.checks[item.key])r.doneCount++;
    }
    continue;
   }
   if(category&&rows[category.key]){
    const r=rows[category.key];r.count++;r.totalMinutes+=resolved.minutes;
    if(resolved.source==='item')r.manualCount++;
    if(o.checks[item.key]){r.doneCount++;r.doneMinutes+=resolved.minutes}
   }else{
    manualOther.count++;manualOther.totalMinutes+=resolved.minutes;
    if(o.checks[item.key]){manualOther.doneCount++;manualOther.doneMinutes+=resolved.minutes}
   }
  }
 }
 // Never populate a time report with fittings absent from the drawing's
 // matched door-card checklist. Zero-count categories are configuration, not work.
 const list=defs.map(d=>rows[d.key]).filter(r=>r.count>0);
 if(manualOther.count)list.push({def:{key:'manual',label:'Egna tider'},...manualOther,manualCount:manualOther.count,disabled:false,isManual:true});
 const total=list.reduce((a,r)=>a+r.totalMinutes,0),done=list.reduce((a,r)=>a+r.doneMinutes,0);
 const trackable=instances.filter(o=>(Number(o.workItemCount)||0)>0),allChecksDone=trackable.length>0&&trackable.every(o=>o.progress===100);
 const progress=total>0?(allChecksDone?100:Math.min(99,Math.max(0,Math.round(done/total*100)))):0;
 return {settings,disabled,rows:list,unknown,total,done,progress,itemCount,doneItemCount,categoryCount:list.filter(r=>!r.isManual&&!disabled.has(r.def.key)).length};
}
async function refreshTimeDrivenProgress(){
 await recalcAll();
 if(el.timeDialog.open)await renderTimeReport();
}
function openTimeTypeEditor(def=null){
 editingTimeTypeKey=def?.custom?def.key:null;
 el.timeTypeTitle.textContent=editingTimeTypeKey?'Ändra tidstyp':'Lägg till tidstyp';
 el.timeTypeName.value=def?.label||'';
 el.timeTypeMinutes.value=def?formatDurationInput(Math.max(0,Number(def.minutes)||0)):'';
 el.timeTypeTerms.value=def?.terms?.join(', ')||'';
 el.timeTypeEditor.showModal();
 requestAnimationFrame(()=>el.timeTypeName.focus());
}
function closeTimeTypeEditor(){if(el.timeTypeEditor.open)el.timeTypeEditor.close();editingTimeTypeKey=null}
async function saveTimeTypeEditor(){
 const label=el.timeTypeName.value.trim();
 if(!label){el.timeTypeName.focus();return}
 const minutes=readDurationField(el.timeTypeMinutes,false);if(minutes===undefined)return;
 let terms=el.timeTypeTerms.value.split(',').map(x=>x.trim().toLocaleLowerCase('sv')).filter(Boolean);
 if(!terms.length)terms=[label.toLocaleLowerCase('sv')];
 const list=loadCustomTimeCategories();
 if(editingTimeTypeKey){
  const item=list.find(x=>x.key===editingTimeTypeKey);
  if(item)Object.assign(item,{label,minutes,terms});
 }else{
  list.unshift({key:'custom-'+Date.now().toString(36),label,minutes,terms});
 }
 saveCustomTimeCategories(list);closeTimeTypeEditor();await refreshTimeDrivenProgress();
}
async function deleteCustomTimeCategory(key){
 const def=loadCustomTimeCategories().find(x=>x.key===key);if(!def)return;
 if(!window.confirm('Ta bort tidstypen "'+def.label+'"? Kontrollpunkterna tas inte bort.'))return;
 saveCustomTimeCategories(loadCustomTimeCategories().filter(x=>x.key!==key));
 const disabled=loadDisabledTimeCategories();disabled.delete(key);saveDisabledTimeCategories(disabled);
 await refreshTimeDrivenProgress();
}
async function renderTimeReport(){
 if(!pdf)return;
 el.timeRows.innerHTML='<p class="pwMuted">Räknar projektets kontrollpunkter…</p>';
 const report=await calculateTimeReport(),left=Math.max(0,report.total-report.done);
 el.timeTotal.textContent=formatWorkMinutes(report.total);
 el.timeDone.textContent=formatWorkMinutes(report.done);
 el.timeLeft.textContent=formatWorkMinutes(left);
 el.timeProgress.textContent=report.progress+'%';
 el.timeUnknown.textContent=String(report.unknown);
 el.timeSummaryText.textContent=report.itemCount+' arbetsmoment · '+report.doneItemCount+' klara · '+Math.max(0,report.itemCount-report.doneItemCount)+' kvar · '+report.categoryCount+' aktiva tidstyper';
 el.timeRows.replaceChildren();
 if(!report.rows.length){
  const p=document.createElement('p');p.className='pwMuted';
  p.textContent='Inga identifierade arbetsmoment med tidsmall i projektet ännu. Koppla dörrkort eller lägg till en egen kontrollpunkt.';
  el.timeRows.appendChild(p);return;
 }
 report.rows.forEach(r=>{
  const row=document.createElement('div');row.className='pwTimeRow'+(r.disabled?' disabled':'');
  const name=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=r.def.label;
  const details=[r.count+' punkter',formatWorkMinutes(r.totalMinutes)+' totalt'];
  if(r.unknownCount)details.push(r.unknownCount+' utan tidsestimat');
  if(r.manualCount)details.push(r.manualCount+' egna tider');
  if(r.disabled)details.push('borttagen från beräkning');
  small.textContent=details.join(' · ');name.append(strong,small);

  const input=document.createElement('input');input.type='text';input.inputMode='decimal';
  if(r.isManual){input.value='';input.placeholder='Per punkt';input.disabled=true}
  else{
   const original=timeCategoryMinutes(r.def,report.settings);
   input.value=original===null?'':formatDurationInput(original);input.placeholder=original===null?'Ange tid':'0,15';input.setAttribute('aria-label','Tid per '+r.def.label);
   input.disabled=r.disabled;
   input.onchange=async()=>{
    input.setCustomValidity('');
    const next=parseDurationInput(input.value);
    if(next!==null&&!Number.isFinite(next)){
     input.setCustomValidity('Skriv tiden som timmar,minuter. Exempel: 8 eller 0,15 eller 3,10.');
     input.reportValidity();input.value=original===null?'':formatDurationInput(original);return;
    }
    if(r.def.custom){
     const list=loadCustomTimeCategories(),item=list.find(x=>x.key===r.def.key);if(item)item.minutes=next;saveCustomTimeCategories(list);
    }else{
     const settings=loadTimeSettings();settings[r.def.key]=next;saveTimeSettings(settings);
    }
    await refreshTimeDrivenProgress();
   };
  }

  const done=document.createElement('div');done.className='pwTimeStat';done.innerHTML='<small>Klart</small><br>'+r.doneCount+'/'+r.count;
  const remain=document.createElement('div');remain.className='pwTimeStat';remain.innerHTML='<small>Kvar</small><br>'+Math.max(0,r.count-r.doneCount);

  const actions=document.createElement('div');actions.className='pwTimeActions';
  if(!r.isManual&&r.def.custom){
   const edit=document.createElement('button');edit.type='button';edit.textContent='Ändra';edit.onclick=()=>openTimeTypeEditor(r.def);
   const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Ta bort';remove.onclick=()=>deleteCustomTimeCategory(r.def.key);
   actions.append(edit,remove);
  }else if(!r.isManual){
   const toggle=document.createElement('button');toggle.type='button';toggle.textContent=r.disabled?'Återställ':'Ta bort';
   toggle.title=r.disabled?'Ta tillbaka tidsmallen i beräkningen':'Ta bort tidsmallen från beräkningen. Kontrollpunkterna finns kvar.';
   toggle.onclick=async()=>{
    const disabled=loadDisabledTimeCategories();
    if(r.disabled)disabled.delete(r.def.key);else disabled.add(r.def.key);
    saveDisabledTimeCategories(disabled);await refreshTimeDrivenProgress();
   };
   actions.appendChild(toggle);
  }
  row.append(name,input,done,remain,actions);el.timeRows.appendChild(row);
 });
}
async function openTimeReport(){
 if(!pdf)return;
 el.timeDialog.showModal();await renderTimeReport();
}
function closeTimeReport(){if(el.timeDialog.open)el.timeDialog.close()}
function renderMarkers(){
 el.markers.replaceChildren();if(!pdf)return;
 const renderPage=page,pageItems=smartVisibleInstances().filter(o=>o.page===renderPage);
 pdf.getPage(renderPage).then(pg=>{
  if(renderPage!==page)return;
  const vp=pg.getViewport({scale});
  pageItems.forEach(o=>{
   const r=viewportRect(vp,o.rect);
   if(!Number.isFinite(r.left+r.top+r.width+r.height)||r.width<=0||r.height<=0)return;
   const btn=document.createElement('button');btn.type='button';btn.className='pwStampHit';btn.dataset.progress=String(o.progress||0);btn.dataset.match=labState(o.code);btn.dataset.scanSource=o.scanSource==='doorcard-first-text'?'text-candidate':'verified';if(o.id===selectedId)btn.classList.add('selected');if(bulkSelected.has(o.id))btn.classList.add('bulkSelected');
   btn.style.left=r.left+'px';btn.style.top=r.top+'px';btn.style.width=Math.max(10,r.width)+'px';btn.style.height=Math.max(10,r.height)+'px';
   btn.title=o.code+' · position '+o.position+' av '+o.totalOfCode+(protocolMap[o.code]?' · dörrkort sida '+protocolMap[o.code]:' · '+(labState(o.code)==='ambiguous'?'välj dörrkort':'ingen dörrkortsträff'))+' · '+o.progress+'%';
   if(o.scanSource==='doorcard-first-text')btn.title+=' · PDF-textträff, kontrollera placeringen';
   btn.setAttribute('aria-label',btn.title);
   // The GS label is already printed in the underlying PDF. Keep the
   // interactive hit rectangle, but NEVER draw a second GS1 text over it.
   if(o.manual||positionEdits[o.id])btn.classList.add('pmSizedMarker');
   if(o.progress>0){const badge=document.createElement('span');badge.className='pwProgressBadge';badge.textContent=o.progress+'%';btn.appendChild(badge)}
   btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(window.SmartMatchDALink?.onGSClick?.(o))return;if(bulkSelectMode&&(protocolCandidates[o.code]||[]).length)toggleBulkInstance(o);else if(protocolMap[o.code])openProtocol(o);else openLabChoices(o)};
   el.markers.appendChild(btn);
  });
  labDiagnosticOutline(vp);
 }).catch(console.error);
}
function renderAutomationMarkers(){
 el.automationMarkers.replaceChildren();if(!PROJECT_AUTOMATION_ENABLED||!pdf)return;
 const renderPage=page,pageItems=automationItems.filter(o=>o.page===renderPage);
 pdf.getPage(renderPage).then(pg=>{
  if(renderPage!==page)return;
  const vp=pg.getViewport({scale});
  pageItems.forEach(o=>{
   const r=viewportRect(vp,o.rect);
   if(!Number.isFinite(r.left+r.top+r.width+r.height)||r.width<=0||r.height<=0)return;
   const btn=document.createElement('button');btn.type='button';btn.className='pwAutomationMarker structured';
   const inspection=automationInspectionState(o),percent=automationProgressOf(o);
   btn.dataset.automationId=o.id;btn.dataset.progress=String(percent);btn.dataset.inspectionStatus=inspection.kind;
   btn.dataset.slrStatus='pending'; // SLR stays unfinished until its own workflow is designed.
   btn.style.left=r.left+'px';btn.style.top=r.top+'px';btn.style.width=Math.max(16,r.width)+'px';btn.style.height=Math.max(14,r.height)+'px';
   btn.title=automationMarkerStatusTitle(o,inspection,percent);
   btn.setAttribute('aria-label',btn.title);
   btn.classList.add('pwDAHit');if(!window.SmartMatchDALink?.getLinkedPosition?.(o))btn.classList.add('pwDAUnlinked');
   if(o.id===focusedAutomationId)btn.classList.add('pwDAFocused');
   // Printed automation ID belongs to the original PDF.
   // Draw only a clickable transparent hit area; don't duplicate its text.
   btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(!bulkSelectMode)(window.SmartMatchDALink?.openDoor?window.SmartMatchDALink.openDoor(o):openAutomationProtocol(o))};
   el.automationMarkers.appendChild(btn);
  });
  window.SmartMatchDALink?.drawArrows?.(vp,pageItems,renderPage);
 }).catch(console.error);
}
let unlinkedFolderOpen=false; // Retained for older project/remove workflows.
let drawingCardFilter='';
let drawingCardOpen=false,automationGroupOpen=false,daGroupSettingsOpen=false,daGroupSelectedObject='';
// Preserve the existing manual GS/card editor element and ALL its listeners
// when reparenting it into Ritning & dörrkort across renderGroups() updates.
const drawingManualEditor=document.getElementById('pwPositionEditor');
let positionPopup=null,positionPopupAnchor=null;
function closePositionPopup(){
 if(positionPopup){positionPopup.remove();positionPopup=null}
 if(positionPopupAnchor)positionPopupAnchor.setAttribute('aria-expanded','false');
 positionPopupAnchor=null;
}
function positionMoreButton(name,actions){
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='pwUnifiedMore';
 trigger.textContent='⋯';trigger.setAttribute('aria-label','Visa åtgärder för '+name);
 trigger.title='Visa åtgärder för '+name;trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
 trigger.onclick=e=>{
  e.preventDefault();e.stopPropagation();
  if(positionPopupAnchor===trigger){closePositionPopup();return}
  closePositionPopup();positionPopupAnchor=trigger;
  const popup=document.createElement('div');popup.className='pwUnifiedActionPopup';popup.setAttribute('role','menu');
  popup.setAttribute('aria-label','Åtgärder för '+name);
  for(const [label,fn] of actions){
   const b=document.createElement('button');b.type='button';b.className='pwUnifiedAction';
   b.setAttribute('role','menuitem');b.textContent=label;
   b.onclick=event=>{event.preventDefault();event.stopPropagation();closePositionPopup();fn()};
   popup.appendChild(b);
  }
  document.body.appendChild(popup);positionPopup=popup;trigger.setAttribute('aria-expanded','true');
  const anchor=trigger.getBoundingClientRect(),rect=popup.getBoundingClientRect();
  const viewW=window.visualViewport?.width||window.innerWidth,viewH=window.visualViewport?.height||window.innerHeight;
  const left=Math.max(7,Math.min(viewW-rect.width-7,anchor.right-rect.width));
  const top=anchor.bottom+rect.height+7<=viewH?anchor.bottom+3:Math.max(7,anchor.top-rect.height-3);
  popup.style.left=left+'px';popup.style.top=top+'px';
 };
 return trigger;
}
document.addEventListener('click',e=>{if(positionPopup&&!positionPopup.contains(e.target)&&e.target!==positionPopupAnchor)closePositionPopup()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePositionPopup()});
window.addEventListener('resize',closePositionPopup);
window.addEventListener('scroll',closePositionPopup,{passive:true});
el.side.addEventListener('scroll',closePositionPopup,{passive:true});
function renderGroups(){
 closePositionPopup();
 pmRefresh();
 // Preserve the operator's expanded GS groups when refreshing checks or data.
 const expandedCodes=new Set([...el.groups.querySelectorAll('.pwGroupAccordion[open]')].map(n=>n.dataset.code));
 const groups={};
 instances.filter(o=>!currentOnly||o.page===page).forEach(o=>(groups[o.code]??=[]).push(o));
 const visibleAutomations=PROJECT_AUTOMATION_ENABLED?automationItems.filter(o=>!currentOnly||o.page===page):[];
 el.groups.replaceChildren();
 const codes=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'sv',{numeric:true}));
 const missingCodes=Object.keys(smartDoorCardIndex).filter(code=>!ignoredCodes.has(code)&&!instances.some(o=>o.code===code));
 // One category for all GS / drawing positions and linked door-card matches.
 // This intentionally includes positions without a door card, so GS1 / GS2
 // remain discoverable while the operator fixes their links.
 {
  const drawingWrap=document.createElement('details');drawingWrap.className='pwGroup pwDrawingCardGroup';
  drawingWrap.open=drawingCardOpen;
  drawingWrap.addEventListener('toggle',()=>{if(drawingWrap.isConnected)drawingCardOpen=drawingWrap.open});
  const header=document.createElement('summary');header.className='pwGroupTitle';
  const heading=document.createElement('strong');heading.textContent='Ritning & dörrkort';
  const count=document.createElement('span');count.textContent=instances.filter(o=>!currentOnly||o.page===page).length+' positioner';
  const toggle=document.createElement('small');toggle.className='pwGroupVisibility';toggle.textContent='Visa / dölj';
  header.append(heading,count,toggle);drawingWrap.appendChild(header);
  const manualAction=document.createElement('button');manualAction.type='button';
  manualAction.className='pwDrawingManualAdd';manualAction.textContent='＋ Lägg till position / koppla dörrkort';
  manualAction.title='Ange GS-kod, välj dörrkortssida och placera en position på ritningen';
  manualAction.onclick=()=>{
   if(!drawingManualEditor)return;
   drawingWrap.open=true;drawingCardOpen=true;
   drawingManualEditor.open=true;
   pmHelp('Ange beteckning, t.ex. GS4. Koppla till rätt dörrkortssida med ”Koppla kort” och välj sedan ”Placera” för att peka ut positionen på ritningen.');
   drawingManualEditor.scrollIntoView({behavior:'smooth',block:'nearest'});
   const input=document.getElementById('pmCode');input?.focus({preventScroll:true});
  };
  drawingWrap.appendChild(manualAction);
  if(drawingManualEditor){
   drawingManualEditor.open=!!drawingManualEditor.open;
   drawingWrap.appendChild(drawingManualEditor);
  }
  const search=document.createElement('input');search.type='search';search.className='pwDrawingCodeSearch';
  search.placeholder='Sök GS1, GS2, GS3 eller dörrkod…';search.value=drawingCardFilter;
  search.setAttribute('aria-label','Sök position i ritning eller dörrkort');
  drawingWrap.appendChild(search);
  const list=document.createElement('div');list.className='pwDrawingCodeList';
  const searchable=[];
  missingCodes.forEach(code=>{
   const section=document.createElement('section');section.className='pwGroup pwMissingDrawingCard';
   const b=document.createElement('button');b.type='button';b.className='pwPosition';
   b.textContent=code+' · dörrkort finns, placering saknas';
   b.onclick=()=>{$('pmCode').value=code;$('pmCard').value=protocolMap[code]||'';pmPlace()};
   section.appendChild(b);list.appendChild(section);searchable.push({code,section});
  });
  codes.forEach(code=>{
   const wrap=document.createElement('details');wrap.className='pwGroup pwGroupAccordion';
   wrap.dataset.code=code;wrap.open=expandedCodes.has(code);
   const title=document.createElement('summary');title.className='pwGroupTitle';
   const strong=document.createElement('strong');strong.textContent=code;
   const span=document.createElement('span');
   span.textContent=groups[code].length+' positioner · '+(protocolMap[code]?'dörrkort ✓':labState(code)==='ambiguous'?'välj dörrkort':'saknar dörrkort');
   title.append(strong,span);wrap.appendChild(title);
   const removeAll=document.createElement('button');removeAll.type='button';
   removeAll.className='pmDeleteGroup';removeAll.textContent='Ta bort alla';
   removeAll.title='Ta bort alla positioner med beteckningen '+code;
   removeAll.onclick=e=>{e.preventDefault();e.stopPropagation();void pmRemoveGroup(code)};
   wrap.appendChild(removeAll);
   const entries=document.createElement('div');entries.className='pwGroupItems';
   groups[code].forEach(o=>{
    const line=document.createElement('div');line.className='pwPositionLine';
    const b=document.createElement('button');b.type='button';b.className='pwPosition';
    const left=document.createElement('span'),s=document.createElement('strong'),small=document.createElement('small'),pct=document.createElement('b');
    s.textContent=code+' · position '+o.position+' av '+o.totalOfCode;
    small.textContent='Ritning sida '+o.page+(protocolMap[code]?' · dörrkort sida '+protocolMap[code]:' · '+(labState(code)==='ambiguous'?'flera möjliga dörrkort':'ingen säker koppling'));
    pct.textContent=o.progress+'%';left.append(s,small);b.append(left,pct);
    b.onclick=()=>{pmSelect(o);focusInstance(o)};
    const more=positionMoreButton(code+' · position '+o.position,[
     ['↔ Flytta / storlek',()=>pmPlace(o)],
     ['✎ Ändra',()=>pmRename(o)],
     ['▣ Koppla dörrkort',()=>{pmSelect(o);openLabChoices(o)}],
     ['× Ta bort',()=>pmRemove(o)]
    ]);
    line.append(b,more);entries.appendChild(line);
   });
   wrap.appendChild(entries);list.appendChild(wrap);searchable.push({code,section:wrap});
  });
  search.oninput=()=>{
   drawingCardFilter=search.value;
   const q=drawingCardFilter.trim().toLocaleUpperCase('sv').replace(/\s+/g,'');
   let shown=0;
   searchable.forEach(({code,section})=>{
    const match=!q||code.toLocaleUpperCase('sv').replace(/\s+/g,'').includes(q);
    section.hidden=!match;
    if(match){shown++;if(q&&section.tagName==='DETAILS')section.open=true}
   });
   empty.hidden=shown>0;
  };
  const empty=document.createElement('p');empty.className='pwMuted pwDrawingNoResults';
  empty.textContent='Inga positioner matchar sökningen.';empty.hidden=true;
  list.appendChild(empty);drawingWrap.appendChild(list);el.groups.appendChild(drawingWrap);
  if(drawingCardFilter)search.oninput();
 }
 {
  const wrap=document.createElement('details');wrap.className='pwGroup pwAutomationGroup';
  wrap.open=automationGroupOpen;
  wrap.addEventListener('toggle',()=>{if(wrap.isConnected)automationGroupOpen=wrap.open});
  const title=document.createElement('summary');title.className='pwGroupTitle';
  const strong=document.createElement('strong');strong.textContent='DA · Egenkontroller';
  const count=document.createElement('span');count.textContent=visibleAutomations.length+' automatiker';
  const toggle=document.createElement('small');toggle.className='pwGroupVisibility';toggle.textContent='Visa / dölj';
  title.append(strong,count,toggle);
  wrap.appendChild(title);
  // Rescan belongs under DA · Egenkontroller once positions are available,
  // rather than occupying every individual automation's choice dialog.
  if(automationItems.length){
   const settings=document.createElement('details');settings.className='pwDAGroupSettings';
   settings.open=daGroupSettingsOpen;
   settings.addEventListener('toggle',()=>{if(settings.isConnected)daGroupSettingsOpen=settings.open});
   const settingsTitle=document.createElement('summary');settingsTitle.textContent='⋯ Inställningar';
   settings.appendChild(settingsTitle);
   const tools=document.createElement('div');tools.className='pwDAGroupSettingsControls';
   const objects=[...new Set(automationItems.map(o=>String(o.objectNo||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'sv',{numeric:true}));
   if(!objects.includes(daGroupSelectedObject))daGroupSelectedObject=objects[0]||'';
   if(objects.length>1){
    const label=document.createElement('label');label.textContent='Objekt';
    const selector=document.createElement('select');selector.setAttribute('aria-label','Objekt att söka automatiker för');
    for(const code of objects){
     const option=document.createElement('option');option.value=code;option.textContent=code;selector.appendChild(option);
    }
    selector.value=daGroupSelectedObject;
    selector.onchange=()=>{daGroupSelectedObject=selector.value};
    label.appendChild(selector);tools.appendChild(label);
   }
   const scanButton=document.createElement('button');scanButton.type='button';
   scanButton.id='pwDABulkGroupRun';scanButton.textContent='↻ Hitta fler automatiker';
   scanButton.disabled=!objects.length||!!window.SmartMatchDALink?.isBulkScanning?.();
   scanButton.onclick=()=>{void window.SmartMatchDALink?.scanFromSidebar?.(daGroupSelectedObject)};
   tools.appendChild(scanButton);
   const feedback=document.createElement('p');feedback.id='pwDABulkGroupStatus';
   feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   const previous=window.SmartMatchDALink?.getBulkStatus?.()||'';
   feedback.textContent=previous;feedback.hidden=!previous;tools.appendChild(feedback);
   settings.appendChild(tools);wrap.appendChild(settings);
  }
  const list=document.createElement('div');list.className='pwGroupItems';
  visibleAutomations.forEach(o=>{
   const line=document.createElement('div');line.className='pwPositionLine pwDAControlLine';
   const b=document.createElement('button');b.type='button';b.className='pwPosition pwAutomationPosition';
   const left=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),pct=document.createElement('b');
   const inspection=automationInspectionState(o),percent=automationProgressOf(o);
   b.dataset.inspectionStatus=inspection.kind;b.dataset.automationId=o.id;
   strong.textContent=automationDisplayId(o);
   small.textContent=o.model||'Dörrautomatik';
   pct.textContent=percent+'%';pct.title=inspection.label;
   left.append(strong,small);b.append(left,pct);
   // The sidebar finds the physical position. Only tapping its marker on the drawing opens the two document choices.
   b.title=inspection.label+' · '+percent+'% · visa '+automationDisplayId(o)+' på ritningen';
   b.setAttribute('aria-label',inspection.label+', '+percent+' procent. Visa dörrautomatiken '+automationDisplayId(o)+' på ritningen');
   b.onclick=()=>{void focusAutomationOnDrawing(o)};
   const actions=[
    ['↔ Flytta / storlek',()=>window.SmartMatchDALink?.beginMove?.(o)],
    ['✎ Ändra',()=>window.SmartMatchDALink?.rename?.(o)]
   ];
   if(window.SmartMatchDALink?.getLinkedPosition?.(o))actions.push(['↗ Justera pil',()=>window.SmartMatchDALink?.beginArrowAdjust?.(o)]);
   actions.push(['× Ta bort',()=>window.SmartMatchDALink?.remove?.(o)]);
   actions.splice(2,0,['⇄ Koppla / ändra GS',()=>window.SmartMatchDALink?.openLink?.(o)]);
   const more=positionMoreButton('dörrautomatik '+automationDisplayId(o),actions);
   line.append(b,more);list.appendChild(line);
  });
  if(!visibleAutomations.length){
   const empty=document.createElement('p');empty.className='pwMuted pwDAEmptyState';
   empty.textContent='Inga egenkontroller hittade ännu. Använd Verktyg → Koppla dörrautomatik.';
   list.appendChild(empty);
  }
  wrap.appendChild(list);el.groups.appendChild(wrap);
 }
}

// Two-step DA workflow: select in sidebar -> locate/highlight on drawing -> tap marker for revision/SLR.
async function focusAutomationOnDrawing(o){
 if(!pdf||!o)return;
 const item=automationItems.find(x=>x.id===o.id);
 if(!item){setState('Automatikens position kunde inte hittas i det här projektet.');return}
 focusedAutomationId=item.id;
 try{
  await window.SmartMatchAppBridge.locate(item);
  // The highlighted marker follows normal PDF coordinates, including page switch and zoom.
  if(page!==item.page||focusedAutomationId!==item.id)return;
  renderAutomationMarkers();
  setState(automationDisplayId(item)+' visas på ritning sida '+item.page+'. Tryck på den markerade dörrautomatiken för Checklista revision eller SLR.');
 }catch(err){
  console.error('[SmartMatch DA locate]',err);
  setState('Kunde inte visa automatikens position på ritningen: '+(err?.message||err));
 }
}
async function focusInstance(o){
 if(bulkSelectMode){toggleBulkInstance(o);return}
 if(page!==o.page){page=o.page;await renderDrawing()}
 selectedId=o.id;
 const pg=await pdf.getPage(page),vp=pg.getViewport({scale}),r=viewportRect(vp,o.rect);
 const cx=r.left+r.width/2,cy=r.top+r.height/2;
 renderMarkers();
 el.viewer.scrollTo({left:Math.max(0,cx-el.viewer.clientWidth/2),top:Math.max(0,cy-el.viewer.clientHeight/2),behavior:'smooth'});
}
function clampProtocolScale(value){
 // Narrow side-by-side phone layout needs a smaller fit scale than desktop.
 const minimum=window.matchMedia('(max-width:699px)').matches ? 0.20 : 0.4;
 return Math.max(minimum,Math.min(3,Number(value)||1));
}
function currentProtocolPage(){
 const o=instances.find(x=>x.id===selectedId);
 return o?protocolMap[o.code]:null;
}
function protocolFocusRatios(clientX,clientY){
 const stageRect=el.protocolStage.getBoundingClientRect();
 const x=Number.isFinite(clientX)?clientX:stageRect.left+stageRect.width/2;
 const y=Number.isFinite(clientY)?clientY:stageRect.top+stageRect.height/2;
 return {
  x:Math.max(0,Math.min(1,stageRect.width?(x-stageRect.left)/stageRect.width:.5)),
  y:Math.max(0,Math.min(1,stageRect.height?(y-stageRect.top)/stageRect.height:.5)),
  clientX:x,clientY:y
 };
}
function restoreProtocolFocus(focus){
 if(!focus)return;
 const stageRect=el.protocolStage.getBoundingClientRect();
 const pointX=stageRect.left+focus.x*stageRect.width;
 const pointY=stageRect.top+focus.y*stageRect.height;
 el.protocolCanvasWrap.scrollLeft+=pointX-focus.clientX;
 el.protocolCanvasWrap.scrollTop+=pointY-focus.clientY;
}
async function setProtocolScale(nextScale,clientX,clientY){
 cancelProtocolWheelZoom();
 const pageNo=currentProtocolPage();if(!pageNo)return;
 const focus=protocolFocusRatios(clientX,clientY);
 protocolScale=clampProtocolScale(nextScale);
 el.protocolCanvas.style.transform='';
 await renderProtocolPage(pageNo);
 requestAnimationFrame(()=>restoreProtocolFocus(focus));
}
async function fitProtocolPage(){
 cancelProtocolWheelZoom();
 const pageNo=currentProtocolPage();if(!pageNo)return;
 const pg=await pdf.getPage(pageNo),vp=pg.getViewport({scale:1});
 const pad=20;
 const target=Math.min(
  (el.protocolCanvasWrap.clientWidth-pad)/vp.width,
  (el.protocolCanvasWrap.clientHeight-pad)/vp.height
 );
 protocolScale=clampProtocolScale(target);
 el.protocolCanvas.style.transform='';
 await renderProtocolPage(pageNo);
 el.protocolCanvasWrap.scrollTo({left:0,top:0});
}
/* SmartMatch TEST v36 – desktop wheel-to-zoom and hand panning.
   This listener is only on the original door-card viewport; project drawing,
   touch pinch, and checklist controls are kept separate. */
let protocolMousePan=null;
let protocolWheelTimer=null,protocolWheelBaseScale=1,protocolWheelTargetScale=1;
let protocolWheelBaseWidth=0,protocolWheelBaseHeight=0,protocolWheelAnchor=null;

function cancelProtocolWheelZoom(){
 if(!protocolWheelTimer)return;
 clearTimeout(protocolWheelTimer);protocolWheelTimer=null;
 el.protocolCanvas.style.transform='';
 el.protocolStage.style.width=protocolWheelBaseWidth+'px';
 el.protocolStage.style.height=protocolWheelBaseHeight+'px';
 el.protocolZoomInfo.textContent=Math.round(protocolScale*100)+'%';
 protocolWheelAnchor=null;
}
function startProtocolMousePan(e){
 if(!el.protocol.open||!currentProtocolPage()||e.pointerType!=='mouse')return;
 if(e.button!==0&&e.button!==1)return;
 if(e.target.closest?.('button,input,a,select,textarea'))return;
 // Mouse dragging never changes the PDF; it just scrolls the card viewport.
 e.preventDefault();
 protocolMousePan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,
   left:el.protocolCanvasWrap.scrollLeft,top:el.protocolCanvasWrap.scrollTop};
 el.protocolCanvasWrap.classList.add('isMousePanning');
 try{el.protocolCanvasWrap.setPointerCapture(e.pointerId)}catch(_){}
}
function moveProtocolMousePan(e){
 if(!protocolMousePan||e.pointerId!==protocolMousePan.pointerId)return;
 e.preventDefault();
 el.protocolCanvasWrap.scrollLeft=protocolMousePan.left+protocolMousePan.x-e.clientX;
 el.protocolCanvasWrap.scrollTop=protocolMousePan.top+protocolMousePan.y-e.clientY;
}
function endProtocolMousePan(e){
 if(!protocolMousePan||(e&&e.pointerId!==protocolMousePan.pointerId))return;
 const id=protocolMousePan.pointerId;protocolMousePan=null;
 el.protocolCanvasWrap.classList.remove('isMousePanning');
 try{if(el.protocolCanvasWrap.hasPointerCapture(id))el.protocolCanvasWrap.releasePointerCapture(id)}catch(_){}
}
function wheelProtocolZoom(e){
 if(!el.protocol.open||!pdf||!currentProtocolPage())return;
 // Only act inside the original canvas view, not on surrounding controls.
 e.preventDefault();
 if(protocolGesture||protocolMousePan)return;
 const wrap=el.protocolCanvasWrap;
 if(!protocolWheelTimer){
  protocolWheelBaseScale=protocolScale;protocolWheelTargetScale=protocolScale;
  protocolWheelBaseWidth=parseFloat(el.protocolStage.style.width)||el.protocolStage.getBoundingClientRect().width;
  protocolWheelBaseHeight=parseFloat(el.protocolStage.style.height)||el.protocolStage.getBoundingClientRect().height;
 }
 const anchor=protocolFocusRatios(e.clientX,e.clientY);
 const delta=(e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*wrap.clientHeight:e.deltaY);
 const clamped=Math.max(-160,Math.min(160,Number(delta)||0));
 const factor=Math.exp(-clamped*.002);
 protocolWheelTargetScale=clampProtocolScale(protocolWheelTargetScale*factor);
 const zoom=protocolWheelTargetScale/protocolWheelBaseScale;
 el.protocolCanvas.style.transformOrigin='0 0';
 el.protocolCanvas.style.transform='scale('+zoom+')';
 el.protocolStage.style.width=(protocolWheelBaseWidth*zoom)+'px';
 el.protocolStage.style.height=(protocolWheelBaseHeight*zoom)+'px';
 restoreProtocolFocus(anchor);
 protocolWheelAnchor={clientX:e.clientX,clientY:e.clientY};
 el.protocolZoomInfo.textContent=Math.round(protocolWheelTargetScale*100)+'%';
 clearTimeout(protocolWheelTimer);
 protocolWheelTimer=setTimeout(async()=>{
  const target=protocolWheelTargetScale,mouse=protocolWheelAnchor;
  const focus=protocolFocusRatios(mouse?.clientX,mouse?.clientY);
  // Cancel preview before rasterizing the PDF at its new resolution.
  cancelProtocolWheelZoom();
  protocolScale=target;
  const protocolPage=currentProtocolPage();
  if(!protocolPage||!el.protocol.open)return;
  try{
   await renderProtocolPage(protocolPage);
   if(el.protocol.open&&currentProtocolPage()===protocolPage)
    requestAnimationFrame(()=>restoreProtocolFocus(focus));
  }catch(err){
   if(err?.name!=='RenderingCancelledException')console.warn('Zooma originalprotokoll',err);
  }
 },95);
}

function protocolTouchCenter(touches){
 return {
  x:(touches[0].clientX+touches[1].clientX)/2,
  y:(touches[0].clientY+touches[1].clientY)/2
 };
}
function protocolTouchDistance(touches){
 const dx=touches[0].clientX-touches[1].clientX,dy=touches[0].clientY-touches[1].clientY;
 return Math.hypot(dx,dy);
}
function beginProtocolTouch(e){
 cancelProtocolWheelZoom();
 if(e.touches.length>=2){
  e.preventDefault();
  const center=protocolTouchCenter(e.touches),focus=protocolFocusRatios(center.x,center.y);
  protocolGesture={
   mode:'pinch',startDistance:Math.max(1,protocolTouchDistance(e.touches)),
   startScale:protocolScale,targetScale:protocolScale,focus,
   baseWidth:parseFloat(el.protocolStage.style.width)||el.protocolStage.getBoundingClientRect().width,
   baseHeight:parseFloat(el.protocolStage.style.height)||el.protocolStage.getBoundingClientRect().height,
   center
  };
  el.protocolCanvasWrap.classList.add('isPinching');
  return;
 }
 if(e.touches.length===1){
  const t=e.touches[0];
  protocolGesture={mode:'pan',x:t.clientX,y:t.clientY,left:el.protocolCanvasWrap.scrollLeft,top:el.protocolCanvasWrap.scrollTop};
 }
}
function moveProtocolTouch(e){
 if(!protocolGesture)return;
 if(protocolGesture.mode==='pan'&&e.touches.length===1){
  e.preventDefault();
  const t=e.touches[0];
  el.protocolCanvasWrap.scrollLeft=protocolGesture.left+(protocolGesture.x-t.clientX);
  el.protocolCanvasWrap.scrollTop=protocolGesture.top+(protocolGesture.y-t.clientY);
  return;
 }
 if(protocolGesture.mode==='pinch'&&e.touches.length>=2){
  e.preventDefault();
  const center=protocolTouchCenter(e.touches);
  const target=clampProtocolScale(protocolGesture.startScale*(protocolTouchDistance(e.touches)/protocolGesture.startDistance));
  protocolGesture.targetScale=target;protocolGesture.center=center;
  const factor=target/protocolGesture.startScale;
  el.protocolCanvas.style.transform='scale('+factor+')';
  el.protocolStage.style.width=(protocolGesture.baseWidth*factor)+'px';
  el.protocolStage.style.height=(protocolGesture.baseHeight*factor)+'px';
  el.protocolZoomInfo.textContent=Math.round(target*100)+'%';
  const stageRect=el.protocolStage.getBoundingClientRect();
  el.protocolCanvasWrap.scrollLeft+=stageRect.left+protocolGesture.focus.x*stageRect.width-center.x;
  el.protocolCanvasWrap.scrollTop+=stageRect.top+protocolGesture.focus.y*stageRect.height-center.y;
 }
}
async function endProtocolTouch(e){
 if(!protocolGesture)return;
 if(protocolGesture.mode==='pinch'&&e.touches.length<2){
  const g=protocolGesture;protocolGesture=null;
  el.protocolCanvasWrap.classList.remove('isPinching');
  el.protocolCanvas.style.transform='';
  protocolScale=clampProtocolScale(g.targetScale);
  const pageNo=currentProtocolPage();
  if(pageNo){
   await renderProtocolPage(pageNo);
   requestAnimationFrame(()=>restoreProtocolFocus({...g.focus,clientX:g.center.x,clientY:g.center.y}));
  }
  if(e.touches.length===1){
   const t=e.touches[0];
   protocolGesture={mode:'pan',x:t.clientX,y:t.clientY,left:el.protocolCanvasWrap.scrollLeft,top:el.protocolCanvasWrap.scrollTop};
  }
  return;
 }
 if(protocolGesture.mode==='pan'&&e.touches.length===0)protocolGesture=null;
}
async function renderProtocolPage(pageNo){
 const version=++protocolRenderVersion;
 if(protocolRenderTask)try{protocolRenderTask.cancel()}catch(_){}
 if(!pageNo){el.protocolCanvas.hidden=true;el.protocolMissing.hidden=false;el.protocolGSLayer.replaceChildren();return}
 el.protocolMissing.hidden=true;el.protocolCanvas.hidden=false;
 const pg=await pdf.getPage(pageNo);if(version!==protocolRenderVersion)return;
 const vp=pg.getViewport({scale:protocolScale});
 const ratio=Math.max(.5,Math.min(window.devicePixelRatio||1,2.5,Math.sqrt(4800000/Math.max(1,vp.width*vp.height))));
 const raster=pg.getViewport({scale:protocolScale*ratio});
 el.protocolCanvas.width=Math.ceil(raster.width);el.protocolCanvas.height=Math.ceil(raster.height);
 el.protocolCanvas.style.width=vp.width+'px';el.protocolCanvas.style.height=vp.height+'px';
 el.protocolStage.style.width=vp.width+'px';el.protocolStage.style.height=vp.height+'px';
 el.protocolGSLayer.replaceChildren();
 const task=pg.render({canvasContext:protocolCtx,viewport:raster});protocolRenderTask=task;
 try{await task.promise}catch(e){if(e?.name==='RenderingCancelledException')return;throw e}
 if(version!==protocolRenderVersion)return;
 el.protocolZoomInfo.textContent=Math.round(protocolScale*100)+'%';
 // Ingen separat GS-överläggskolumn i v35 – endast en kompakt kontrollista.
}
// v35: tidigare trestegs-kontroller borttagna. En checkruta per originalpunkt används.

function selectedInstance(){return instances.find(x=>x.id===selectedId)||null}
function openItemEditor(o,item=null){
 if(!o)return;
 editingItem=item?{source:item.source,key:item.key}:{source:'custom',key:null};
 el.itemEditorTitle.textContent=item?'Ändra punkt':'Lägg till punkt';
 el.editLabel.value=item?.label||'';
 el.editValue.value=item?.value||'';
 el.editMinutes.value=item?.minutes!==null&&item?.minutes!==''&&Number.isFinite(Number(item?.minutes))?formatDurationInput(Math.max(0,Number(item.minutes))):'';
 el.editNote.value=item?.note||'';
 el.itemEditor.showModal();
 requestAnimationFrame(()=>el.editLabel.focus());
}
function closeItemEditor(){if(el.itemEditor.open)el.itemEditor.close();editingItem=null}
async function saveItemEditor(){
 const o=selectedInstance();if(!o||!editingItem)return;
 const label=el.editLabel.value.trim(),value=el.editValue.value.trim(),note=el.editNote.value.trim();
 const minutes=readDurationField(el.editMinutes,true);if(minutes===undefined)return;
 if(!label){el.editLabel.focus();return}
 if(!editingItem.key){
  const id='c'+Date.now().toString(36)+(o.customItems.length+1).toString(36);
  o.customItems.push({id,label,value,note,minutes});
 }else if(editingItem.source==='custom'){
  const item=o.customItems.find(x=>x.id===editingItem.key);
  if(item)Object.assign(item,{label,value,note,minutes});
 }else{
  o.overrides[editingItem.key]={...(o.overrides[editingItem.key]||{}),label,value,note,minutes,hidden:false};
 }
 await recalc(o);save();syncProtocolProgress(o);updateStats();renderGroups();renderMarkers();closeItemEditor();await renderChecklist(o);
 if(el.timeDialog.open)await renderTimeReport();
}
async function removeChecklistItem(o,item){
 if(!o||!item)return;
 if(!window.confirm('Ta bort den här kontrollpunkten för just den här positionen?'))return;
 if(item.source==='custom')o.customItems=o.customItems.filter(x=>x.id!==item.key);
 else o.overrides[item.key]={...(o.overrides[item.key]||{}),hidden:true};
 delete o.checks[item.key];
 await recalc(o);save();syncProtocolProgress(o);updateStats();renderGroups();renderMarkers();await renderChecklist(o);
}
function tidyGsText(value){
 return String(value||'').replace(/\b(GS\d*)\b(?:[\s,;\/]+\1\b)+/gi,'$1')
  .replace(/\bGS\b(?:[\s,;\/]+GS\b)+/gi,'GS').replace(/\s+/g,' ').trim();
}
function appendEditableCheck(o,item){
 const row=document.createElement('div');row.className='pwCheckRow'+(o.checks[item.key]?' done':'');
 const input=document.createElement('input');input.type='checkbox';input.checked=!!o.checks[item.key];input.setAttribute('aria-label','Klarmarkera '+item.label);
 const content=document.createElement('div');content.className='pwCheckContent';
 const strong=document.createElement('strong');strong.textContent=tidyGsText(item.label);
 content.appendChild(strong);
 if(item.value){const small=document.createElement('small');small.textContent=tidyGsText(item.value);content.appendChild(small)}
 const time=resolveItemMinutes(item),timeTag=document.createElement('span');timeTag.className='pwCheckTime'+(time.minutes===null?' missing':'');
 timeTag.textContent=time.minutes===null?'⏱ Ingen tid':'⏱ '+formatWorkMinutes(time.minutes)+(time.source==='item'?' · egen':'');
 content.appendChild(timeTag);
 if(item.note){const note=document.createElement('em');note.className='pwCheckComment';note.textContent=item.note;content.appendChild(note)}
 const actions=document.createElement('div');actions.className='pwCheckActions';
 const edit=document.createElement('button');edit.type='button';edit.textContent='Ändra';edit.onclick=()=>openItemEditor(o,item);
 const remove=document.createElement('button');remove.type='button';remove.className='pwRemoveItem';remove.textContent='Ta bort';remove.onclick=()=>removeChecklistItem(o,item);
 actions.append(edit,remove);row.append(input,content,actions);
 input.onchange=async()=>{o.checks[item.key]=input.checked;row.classList.toggle('done',input.checked);await recalc(o);save();syncProtocolProgress(o);updateStats();renderGroups();renderMarkers();if(el.timeDialog.open)await renderTimeReport()};
 // Finger-friendly checkbox: tapping the point text also toggles its checkbox.
 // Action buttons keep their own behavior and never mark a point accidentally.
 row.addEventListener('click',event=>{
  if(event.target.closest('button,input,a,select,textarea'))return;
  input.checked=!input.checked;
  input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 el.checklist.appendChild(row);
}
async function renderChecklist(o){
 el.checklist.replaceChildren();
 const def=await protocolDef(o.code);
 if(!def){document.getElementById('pwChecklistMarkAll').disabled=true;document.getElementById('pwChecklistClearAll').disabled=true;el.checklistMeta.textContent='0 punkter';const p=document.createElement('p');p.className='pwMuted';p.textContent='Ingen protokollsida kunde matchas automatiskt.';el.checklist.appendChild(p);return}
 const checks=effectiveChecks(o,def);
 el.checklistMeta.textContent=checks.length+' punkter';
 const originals=checks.filter(item=>item.source==='base');
 document.getElementById('pwChecklistMarkAll').disabled=!originals.length;
 document.getElementById('pwChecklistClearAll').disabled=!originals.length;
 if(!def.lines.length&&!o.customItems.length){const p=document.createElement('p');p.className='pwMuted';p.textContent='Protokollsidan är matchad, men textstrukturen kunde inte tolkas säkert ännu.';el.checklist.appendChild(p);return}
 def.lines.forEach(line=>{
  const item=effectiveChecks(o,def).find(x=>x.source==='base'&&x.key===line.key);
  if(item)appendEditableCheck(o,item);
 });
 const custom=effectiveChecks(o,def).filter(x=>x.source==='custom');
 if(custom.length){
  const h=document.createElement('div');h.className='pwChecklistHeading';h.textContent='Tillagda punkter';el.checklist.appendChild(h);
  custom.forEach(item=>appendEditableCheck(o,item));
 }
}
async function toggleAllOriginalChecks(marked){
 const o=selectedInstance();if(!o)return;
 const def=await protocolDef(o.code);
 const items=effectiveChecks(o,def).filter(item=>item.source==='base');
 if(!items.length){setState('Inga avläsbara originalpunkter att markera på '+o.code+'.');return}
 for(const item of items)o.checks[item.key]=marked;
 await recalc(o);save();syncProtocolProgress(o);updateStats();renderGroups();renderMarkers();
 await renderChecklist(o);
 if(el.timeDialog.open)await renderTimeReport();
 setState((marked?'Markerade ':'Avmarkerade ')+items.length+' originalpunkter för '+o.code+' (position '+o.position+').');
}
function syncProtocolProgress(o){el.protocolPercent.textContent=o.progress+'%';el.protocolBar.style.width=o.progress+'%'}
async function openProtocol(o){
 // Only open the compare view after a real linked door-card page was found.
 const protocolPageNo=Number(protocolMap[o?.code])||0;
 if(!pdf||!Number.isInteger(protocolPageNo)||protocolPageNo<1||protocolPageNo>pdf.numPages){
  setState('Inget matchat dörrkort att öppna. Koppla eller välj dörrkort först.');
  return;
 }
 cancelProtocolWheelZoom();endProtocolMousePan();
 // ID + sida + ritningskoordinater identifierar klickad position, även om 100 dörrar har GS8.
 selectedId=o.id;
 restoreView={page:o.page,scale,left:el.viewer.scrollLeft,top:el.viewer.scrollTop,
  rect:Array.isArray(o.rect)?[...o.rect]:null,id:o.id,fromPage:page};
 el.protocolCode.textContent=o.code;el.protocolPosition.textContent='Position '+o.position+' av '+o.totalOfCode+' · ritningssida '+o.page+(protocolMap[o.code]?' · protokollsida '+protocolMap[o.code]:'');
 await recalc(o);syncProtocolProgress(o);protocolScale=1;el.protocol.classList.remove('pwGsCompact','pwMobileChecks');el.protocol.classList.add('pwMobileCard','pwCardCompareMode');el.protocol.showModal();
 // Both panes stay visible on phones. Initially show the full original card in
 // its left half; the technician can pinch/zoom without moving the checklist.
 if(window.matchMedia('(max-width:699px)').matches){
  const source=await pdf.getPage(protocolPageNo),size=source.getViewport({scale:1});
  const availableWidth=el.protocolCanvasWrap.clientWidth||Math.floor(window.innerWidth/2);
  protocolScale=clampProtocolScale((Math.max(70,availableWidth)-12)/Math.max(1,size.width));
 }
 await Promise.all([renderProtocolPage(protocolPageNo),renderChecklist(o)]);
}
async function closeProtocol(){
 cancelProtocolWheelZoom();endProtocolMousePan();cancelDrawingWheelZoom();
 if(el.protocol.open)el.protocol.close();
 el.protocol.classList.remove('pwCardCompareMode');
 const from=restoreView;restoreView=null;
 if(!from||!pdf)return;
 page=from.page;scale=from.scale;
 try{
  await renderDrawing();
  // Preserve the existing view if it still contains the tapped position,
  // otherwise center on that position (e.g. navigation from a different page).
  const id=from.id,found=instances.find(x=>x.id===id);
  const rect=found?.rect||from.rect;
  const view={left:from.left,top:from.top};
  if(rect&&Array.isArray(rect)&&rect.length===4){
   const pg=await pdf.getPage(from.page),vp=pg.getViewport({scale});
   const region=viewportRect(vp,rect);
   const x=region.left+region.width/2,y=region.top+region.height/2;
   const visible=from.fromPage===from.page&&x>=view.left+25&&x<=view.left+el.viewer.clientWidth-25&&
     y>=view.top+25&&y<=view.top+el.viewer.clientHeight-25;
   if(!visible){view.left=Math.max(0,x-el.viewer.clientWidth/2);view.top=Math.max(0,y-el.viewer.clientHeight/2)}
  }
  requestAnimationFrame(()=>{el.viewer.scrollTo({left:view.left,top:view.top});renderMarkers()});
 }catch(err){console.warn('Kunde inte återgå till vald ritningsposition',err)}
}
function clampDrawingScale(value){return Math.max(.25,Math.min(3.5,Number(value)||1))}
function drawingFocusRatios(clientX,clientY){
 const r=el.stage.getBoundingClientRect();
 // Toolbar +/- zooms the visible part of the PDF, not the complete drawing.
 const visible=el.viewer.getBoundingClientRect();
 const x=Number.isFinite(clientX)?clientX:visible.left+visible.width/2;
 const y=Number.isFinite(clientY)?clientY:visible.top+visible.height/2;
 return {
  x:Math.max(0,Math.min(1,r.width?(x-r.left)/r.width:.5)),
  y:Math.max(0,Math.min(1,r.height?(y-r.top)/r.height:.5)),
  clientX:x,clientY:y
 };
}
function restoreDrawingFocus(focus){
 if(!focus)return;
 const r=el.stage.getBoundingClientRect();
 const px=r.left+focus.x*r.width,py=r.top+focus.y*r.height;
 el.viewer.scrollLeft+=px-focus.clientX;
 el.viewer.scrollTop+=py-focus.clientY;
}
function cancelDrawingWheelZoom(){
 if(drawingWheelTimer){clearTimeout(drawingWheelTimer);drawingWheelTimer=null}
 el.stage.style.transform='';el.stage.style.transformOrigin='';
}
async function setDrawingScale(nextScale,clientX,clientY){
 if(!pdf)return;
 cancelDrawingWheelZoom();
 const focus=drawingFocusRatios(clientX,clientY),previous=scale,updated=clampDrawingScale(nextScale);
 if(Math.abs(updated-previous)<.0001)return;
 scale=updated;
 el.stage.style.transformOrigin=(focus.x*100)+'% '+(focus.y*100)+'%';
 el.stage.style.transform='scale('+(updated/previous)+')';
 await renderDrawing(focus);
}
function beginDrawingPan(e){
 if(!pdf||drawingTool||bulkSelectMode||e.pointerType!=='mouse')return;
 if(e.button!==0&&e.button!==1)return;
 if(e.button===0&&e.target.closest?.('.pwStampHit,.pwAutomationMarker'))return;
 e.preventDefault();
 drawingPan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:el.viewer.scrollLeft,top:el.viewer.scrollTop};
 el.viewer.classList.add('isPanning');
 try{el.viewer.setPointerCapture(e.pointerId)}catch(_){}
}
function moveDrawingPan(e){
 if(!drawingPan||drawingPan.pointerId!==e.pointerId)return;
 e.preventDefault();
 el.viewer.scrollLeft=drawingPan.left+(drawingPan.x-e.clientX);
 el.viewer.scrollTop=drawingPan.top+(drawingPan.y-e.clientY);
}
function endDrawingPan(e){
 if(!drawingPan||drawingPan.pointerId!==e.pointerId)return;
 drawingPan=null;el.viewer.classList.remove('isPanning');
 try{el.viewer.releasePointerCapture(e.pointerId)}catch(_){}
}
function previewDrawingWheelZoom(nextScale,focus){
 if(!pdf)return;
 drawingWheelTargetScale=clampDrawingScale(nextScale);
 drawingWheelFocus=focus;
 const factor=drawingWheelTargetScale/drawingWheelBaseScale;
 el.stage.style.transformOrigin=(focus.x*100)+'% '+(focus.y*100)+'%';
 el.stage.style.transform='scale('+factor+')';
 el.zoomInfo.textContent=Math.round(drawingWheelTargetScale*100)+'%';
 clearTimeout(drawingWheelTimer);
 drawingWheelTimer=setTimeout(async()=>{
  const finalScale=drawingWheelTargetScale,finalFocus=drawingWheelFocus;
  drawingWheelTimer=null;scale=finalScale;
  await renderDrawing(finalFocus);
 },80);
}
function drawingTouchCenter(touches){return{x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2}}
function drawingTouchDistance(touches){return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)}
function beginDrawingTouch(e){
 if(e.target.closest?.('#pwInlineNoteEditor'))return;
 if(!pdf||drawingNoteDrag)return;
 if(e.touches.length>=2){
  e.preventDefault();
  cancelDrawingWheelZoom();
  if(drawingToolGesture){drawingToolGesture.preview?.remove();drawingToolGesture=null}
  const center=drawingTouchCenter(e.touches),focus=drawingFocusRatios(center.x,center.y);
  drawingTouch={mode:'pinch',startDistance:Math.max(1,drawingTouchDistance(e.touches)),startScale:scale,targetScale:scale,focus,center};
  el.stage.style.transformOrigin=(focus.x*100)+'% '+(focus.y*100)+'%';
  return;
 }
 if(drawingTool||e.touches.length!==1)return;
 const t=e.touches[0];
 drawingTouch={mode:'single',startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,left:el.viewer.scrollLeft,top:el.viewer.scrollTop,horizontalScrollable:el.viewer.scrollWidth>el.viewer.clientWidth+6};
}
function moveDrawingTouch(e){
 if(!drawingTouch)return;
 if(drawingTouch.mode==='pinch'&&e.touches.length>=2){
  e.preventDefault();
  const center=drawingTouchCenter(e.touches),target=clampDrawingScale(drawingTouch.startScale*(drawingTouchDistance(e.touches)/drawingTouch.startDistance));
  drawingTouch.targetScale=target;drawingTouch.center=center;
  const dx=center.x-drawingTouch.focus.clientX,dy=center.y-drawingTouch.focus.clientY;
  if(DRAWING_IS_MOBILE){
   el.stage.style.zoom=String(target/drawingTouch.startScale);
   restoreDrawingFocus({...drawingTouch.focus,clientX:center.x,clientY:center.y});
  }else el.stage.style.transform='translate('+dx+'px,'+dy+'px) scale('+(target/drawingTouch.startScale)+')';
  el.zoomInfo.textContent=Math.round(target*100)+'%';
  return;
 }
 if(drawingTouch.mode==='single'&&e.touches.length===1){
  e.preventDefault();
  const t=e.touches[0],dx=t.clientX-drawingTouch.startX,dy=t.clientY-drawingTouch.startY;
  drawingTouch.lastX=t.clientX;drawingTouch.lastY=t.clientY;
  const horizontalSwipe=!drawingTouch.horizontalScrollable&&Math.abs(dx)>Math.abs(dy)*1.15;
  if(!horizontalSwipe){
   el.viewer.scrollLeft=drawingTouch.left-dx;
   el.viewer.scrollTop=drawingTouch.top-dy;
  }
 }
}
async function changeDrawingPage(delta){
 if(inlineNoteDraft)smartCancelInlineNote();
 if(!pdf)return;
 const next=page+delta;if(next<1||next>pdf.numPages)return;
 cancelDrawingWheelZoom();
 page=next;selectedId=null;await renderDrawing();renderGroups();
}
async function endDrawingTouch(e){
 if(!drawingTouch)return;
 if(drawingTouch.mode==='pinch'&&e.touches.length<2){
  const g=drawingTouch;drawingTouch=null;
  scale=clampDrawingScale(g.targetScale);
  const pendingRender=renderDrawing({...g.focus,clientX:g.center.x,clientY:g.center.y}),touchRenderVersion=drawingRenderVersion;
  await pendingRender;
  if(touchRenderVersion!==drawingRenderVersion||drawingTouch)return;
  if(e.touches.length===1){
   const t=e.touches[0];drawingTouch={mode:'single',startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,left:el.viewer.scrollLeft,top:el.viewer.scrollTop,horizontalScrollable:el.viewer.scrollWidth>el.viewer.clientWidth+6};
  }
  return;
 }
 if(drawingTouch.mode==='single'&&e.touches.length===0){
  const g=drawingTouch;drawingTouch=null;
  const dx=g.lastX-g.startX,dy=g.lastY-g.startY;
  if(!g.horizontalScrollable&&Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.25){
   // According to the requested workflow: swipe right = next, swipe left = previous.
   await changeDrawingPage(dx>0?1:-1);
  }
 }
}
async function fitDrawing(){
 if(!pdf)return;cancelDrawingWheelZoom();const pg=await pdf.getPage(page),vp=pg.getViewport({scale:1});
 scale=Math.max(.25,Math.min(2.5,(el.viewer.clientWidth-12)/vp.width,(el.viewer.clientHeight-12)/vp.height));
 await renderDrawing();
 el.viewer.scrollTo({left:Math.max(0,(el.stage.clientWidth-el.viewer.clientWidth)/2),top:Math.max(0,(el.stage.clientHeight-el.viewer.clientHeight)/2)});
}
async function smartMergeDrawingWithCards(drawingFile,cardsFiles){
 const {PDFDocument,PDFName,PDFString,PDFHexString}=PDFLib;
 const doc=await PDFDocument.create();
 const importedPages=[],cards=(Array.isArray(cardsFiles)?cardsFiles:[cardsFiles]).filter(Boolean);
 const copy=async(file,isCard)=>{
  const input=await PDFDocument.load(new Uint8Array(await file.arrayBuffer()),{ignoreEncryption:true,updateMetadata:false});
  const copies=await doc.copyPages(input,input.getPageIndices());
  for(const page of copies){
   doc.addPage(page);
   if(isCard)importedPages.push(doc.getPageCount());
  }
 };
 await copy(drawingFile,false);
 for(const file of cards)await copy(file,true);
 // The merged PDF has a different byte hash. Persist work-state IN it, so
 // existing placed markers, ticked rows and customer information survive.
 const payload=makeProjectPayload();
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV30Data'),PDFHexString.fromText(JSON.stringify(payload)));
 doc.catalog.set(PDFName.of('SmartMatch24ImportedCards'),PDFString.of(importedPages.join(',')));
 const output=await doc.save({useObjectStreams:true});
 return {file:new File([output],originalProjectPdfName(drawingFile.name),{type:'application/pdf'}),
  importedPages,cardFiles:cards.length};
}

function smartRenderFirstCardReport(){
 const title=document.getElementById('smartCardFirstTitle'),target=document.getElementById('smartCardFirstRows');
 if(!title||!target)return;
 const entries=Object.entries(smartDoorCardFirstRows).sort((a,b)=>Number(a[0])-Number(b[0]));
 title.textContent='Dörrkort · '+entries.length+' kort · '+Object.keys(smartDoorCardIndex).length+' ID';
 target.replaceChildren();
 if(!entries.length){target.textContent='Inga säkra dörrkort hittades. Positioner på ritningen behålls ändå.';return}
 const table=document.createElement('table');
 table.style.cssText='width:100%;border-collapse:collapse;font-size:12px';
 const heading=document.createElement('tr');
 for(const value of ['Kort sida','Första ID-raden','Beteckning','Ritningspositioner']){
  const td=document.createElement('th');td.textContent=value;td.style.cssText='text-align:left;border-bottom:1px solid #bcd6df;padding:6px';heading.appendChild(td);
 }
 table.appendChild(heading);
 for(const [page,item] of entries){
  const tr=document.createElement('tr');
  const count=instances.filter(o=>o.code===item.code).length;
  for(const value of [page,item.row,item.code,String(count)]){
   const td=document.createElement('td');td.textContent=value;td.style.cssText='padding:6px;border-bottom:1px solid #d5e5ea';tr.appendChild(td);
  }
  if((smartDoorCardIndex[item.code]||[]).length>1)tr.title='Flera dörrkort med samma beteckning – välj rätt kort vid koppling.';
  table.appendChild(tr);
 }
 target.appendChild(table);
}

function smartRenderGSReport(){
 const container=document.getElementById('smartGSReportBody');
 const caption=document.getElementById('smartGSReportTitle');
 if(!container||!caption)return;
 container.replaceChildren();
 const counts={},linked={};
 for(const stamp of matchedProjectInstances()){
  if(!/^GS\d/.test(stamp.code))continue;
  counts[stamp.code]=(counts[stamp.code]||0)+1;
  if((protocolCandidates[stamp.code]||[]).length)linked[stamp.code]=(linked[stamp.code]||0)+1;
 }
 const codes=Object.keys(counts).sort((a,b)=>a.localeCompare(b,'sv',{numeric:true}));
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 const paired=Object.values(linked).reduce((a,b)=>a+b,0);
 caption.textContent='GS-positioner · '+total+' positioner · '+paired+' med dörrkort';
 const table=document.createElement('table');
 table.style.cssText='width:100%;border-collapse:collapse;font-size:12px';
 const head=document.createElement('thead'),headRow=document.createElement('tr');
 for(const label of ['GS-kod','Hittade stämplar','Dörrkort','Kopplade']){
  const cell=document.createElement('th');cell.textContent=label;cell.style.cssText='text-align:left;padding:6px 8px;border-bottom:1px solid #bfd4df';headRow.appendChild(cell);
 }
 head.appendChild(headRow);table.appendChild(head);
 const body=document.createElement('tbody');
 for(const code of codes){
  const tr=document.createElement('tr');
  const values=[code,String(counts[code]),(protocolCandidates[code]||[]).join(', ')||'Saknas',String(linked[code]||0)];
  for(const value of values){
   const cell=document.createElement('td');cell.textContent=value;cell.style.cssText='padding:6px 8px;border-bottom:1px solid #deedf2';tr.appendChild(cell);
  }
  if(!linked[code])tr.style.color='#a33e2c';
  body.appendChild(tr);
 }
 table.appendChild(body);container.appendChild(table);
}


/* v36.46: Closing a project must NOT close Safari or silently overwrite a PDF.
   First archive the current source bytes and draft on this device, then release
   the rendering and show the in-app homepage. */
let smartProjectSwitchBusy=false,smartRecentDeleteBusy=false;
async function smartShowRecentProjects(){
 const container=document.getElementById('pwRecentProjects');
 const list=document.getElementById('pwRecentProjectsList');
 const deleteAll=document.getElementById('pwRecentDeleteAll');
 const counter=document.getElementById('pwRecentCount');
 if(!container||!list)return;
 try{
  const saved=await window.SmartMatchSession?.listProjects?.()||[];
  if(pdf||smartProjectSwitchBusy||smartRecentDeleteBusy)return;
  list.replaceChildren();
  container.hidden=!saved.length;
  if(deleteAll){deleteAll.hidden=!saved.length;deleteAll.disabled=!saved.length;deleteAll.textContent='Radera alla';}
  if(counter)counter.textContent=saved.length+' lokala projekt';
  saved.forEach(record=>{
   const row=document.createElement('div');row.className='smRecentItem';
   const open=document.createElement('button');open.type='button';open.className='smRecentOpen';
   open.setAttribute('aria-label','Öppna '+(record.name||'Projekt.pdf'));
   const title=document.createElement('strong');title.textContent=record.name||'Projekt.pdf';
   const meta=document.createElement('small');
   meta.textContent='Lokalt sparat · '+new Date(record.savedAt||Date.now()).toLocaleString('sv-SE');
   open.append(title,meta);
   open.onclick=()=>void smartOpenRecentProject(record.hash);
   const remove=document.createElement('button');remove.type='button';
   remove.className='smRecentDelete';remove.textContent='Radera';
   remove.setAttribute('aria-label','Radera lokal kopia av '+(record.name||'Projekt.pdf'));
   remove.title='Tar bara bort SmartMatchs lokala kopia';
   remove.onclick=()=>void smartDeleteRecentProjects(record.hash,record.name);
   row.append(open,remove);list.appendChild(row);
  });
 }catch(err){
  console.warn('[SmartMatch] Lokala projekt kunde inte listas',err);
  const status=document.getElementById('pwHomeStatus');
  if(status)status.textContent='Kunde inte läsa lokal historik: '+(err?.message||err);
 }
}
async function smartDeleteRecentProjects(hash=null,name=''){
 if(pdf||smartProjectSwitchBusy||smartRecentDeleteBusy)return;
 const isAll=hash===null;
 const choice=isAll
  ?'Radera ALLA lokalt sparade SmartMatch-projekt och deras arbetsutkast på den här enheten?'
  :'Radera den lokala SmartMatch-kopian av ”'+(name||'Projekt.pdf')+'” och dess arbetsutkast?';
 if(!window.confirm(choice+'\\n\\nPDF-filer i Dropbox eller Filer påverkas inte.'))return;
 const status=document.getElementById('pwHomeStatus');
 const controls=[...document.querySelectorAll('#pwRecentProjects button')];
 smartRecentDeleteBusy=true;controls.forEach(button=>button.disabled=true);
 if(status)status.textContent='Raderar lokal historik…';
 try{
  const session=window.SmartMatchSession;
  const remove=isAll?session?.deleteAllProjects:session?.deleteProject;
  if(typeof remove!=='function')throw new Error('Raderingsfunktionen saknas. Uppdatera TEST-sidan.');
  const result=isAll?await remove.call(session):await remove.call(session,hash);
  smartRecentDeleteBusy=false;
  await smartShowRecentProjects();
  if(status)status.textContent=isAll
   ?result+' lokala projekt raderade. Du kan nu öppna PDF:en från Dropbox och kontrollera vad som finns sparat där.'
   :result?'Lokal kopia raderad. PDF:en i Dropbox/Filer är oförändrad.':'Projektet fanns inte längre lokalt.';
 }catch(err){
  console.error('[SmartMatch] Kunde inte radera lokal historik',err);
  if(status)status.textContent='Raderingen misslyckades: '+(err?.message||err);
  controls.forEach(button=>button.disabled=false);
 }finally{smartRecentDeleteBusy=false}
}
async function smartOpenRecentProject(hash){
 if(smartProjectSwitchBusy||smartRecentDeleteBusy||pdf||!hash)return;
 smartProjectSwitchBusy=true;
 const homeStatus=document.getElementById('pwHomeStatus');
 const list=document.getElementById('pwRecentProjectsList');
 const buttons=list?[...list.querySelectorAll('button')]:[];
 buttons.forEach(button=>button.disabled=true);
 if(homeStatus)homeStatus.textContent='Öppnar sparat projekt…';
 try{
  await window.SmartMatchSession.openProject(hash);
  if(homeStatus)homeStatus.textContent='Projektet öppnat.';
 }catch(err){
  console.error('[SmartMatch] Återöppning misslyckades',err);
  if(homeStatus)homeStatus.textContent='Kunde inte öppna projektet: '+(err?.message||err);
  buttons.forEach(button=>button.disabled=false);
 }finally{smartProjectSwitchBusy=false}
}
// Closing a drawing is a workspace navigation action, not a file export.
// The confirmation dialog is reserved for a failed silent local safety copy.
function smartOpenFinishDialog(message){
 if(!pdf||smartScanActive)return;
 const dialog=document.getElementById('pwFinishDialog');
 document.getElementById('pwFinishFileName').textContent=originalProjectPdfName();
 const status=document.getElementById('pwFinishStatus');
 status.hidden=!message;
 status.textContent=message||'';
 if(!dialog.open)dialog.showModal();
}
function smartResetWorkspace(){
 // Prevent callbacks belonging to the old PDF from drawing over the next one.
 drawingRenderVersion++;protocolRenderVersion++;drawingDetailVersion++;
 clearDrawingDetail();cancelDrawingWheelZoom();cancelProtocolWheelZoom();
 if(renderTask){try{renderTask.cancel()}catch(_){}renderTask=null}
 if(protocolRenderTask){try{protocolRenderTask.cancel()}catch(_){}protocolRenderTask=null}
 if(automationPreviewRenderTask){try{automationPreviewRenderTask.cancel()}catch(_){}automationPreviewRenderTask=null}
 try{pmCancel();setDrawingTool('');closeToolMenu();closeSaveMenu()}catch(_){}
 for(const dialog of document.querySelectorAll('dialog'))if(dialog.open)dialog.close();
 drawingActivePdfPage=null;
 const previous=pdf;
 if(!drawingDetailTask)drawingDetailCanvas.width=drawingDetailCanvas.height=0;
 drawingDetailKey='';el.stage.style.zoom='';
 pdf=null;bytes=null;workspacePdfForDisplay=null;drawingOptionalContentPromise=null;
 scanOriginalPageCount=0;
 fileKey='';projectId='';currentFileName='Tillsyno-projekt.pdf';currentFileHandle=null;
 smartBaseDrawingFile=null;smartAdditionalCardsFile=null;
 smartImportedCardPages=new Set();smartImportReport={files:0,pages:0,recognized:0,unrecognized:0};
 embeddedState={};smartProjectTimeConfig=null;smartWorkspaceDirty=false;
 page=1;scale=1.1;protocolScale=1;
 pageTexts={};drawingPageLevels={};protocolDefs={};
 stamps=[];projectStamps=[];instances=[];automationItems=[];protocolMap={};
 inlineNoteDraft=null;document.getElementById('pwInlineNoteEditor').hidden=true;
 drawingNotes=[];drawingUndoStack=[];drawingRedoStack=[];selectedDrawingNoteId='';
 manualPositions=[];positionEdits={};ignoredCodes=new Set();labManualLinks={};
 smartDoorCardIndex={};smartDoorCardPages=new Set();scanCardCodes=new Set();scanPageEligibility=new Map();
 protocolCandidates={};smartConfirmedOcr=[];smartPendingOcr=[];
 drawingRaster=null;drawingDetailKey='';

selectedId=null;selectedAutomationId='';focusedAutomationId='';
 restoreView=null;pendingImage=null;drawingPan=null;drawingTouch=null;drawingTool='';
 bulkSelected.clear();bulkSelectMode=false;drawingCardOpen=false;automationGroupOpen=false;
 el.bulkBar.hidden=true;el.bulkSelect.setAttribute('aria-pressed','false');
 el.currentPageOnly.setAttribute('aria-pressed','false');currentOnly=false;
 el.file.value='';el.fileName.textContent='Ingen projektfil';el.fileName.title='';
 el.pageInfo.textContent='Ingen sida';el.zoomInfo.textContent='100%';
 el.positionCount.textContent='0';el.matchedCount.textContent='0';
 el.doneCount.textContent='0';el.totalProgress.textContent='0%';
 el.markers.replaceChildren();el.automationMarkers.replaceChildren();el.drawingNotes.replaceChildren();
 const arrows=document.getElementById('pwDAArrows');if(arrows)arrows.replaceChildren();
 // The manual editor is reparented INSIDE pwGroups during normal work.
 // Move it back to the permanent sidebar BEFORE clearing pwGroups, or all
 // its buttons (pmCancel, pmCode, pmCodes, pmLink...) disappear from the DOM
 // and opening the next PDF crashes at pmCancel().
 if(drawingManualEditor){
  if(drawingManualEditor.parentElement!==el.side)
   el.side.insertBefore(drawingManualEditor,el.groups);
  drawingManualEditor.open=false;
  const code=$('pmCode'),card=$('pmCard'),cancel=$('pmCancel'),help=$('pmHelp');
  if(code)code.value='';
  if(card)card.value='';
  if(cancel)cancel.hidden=true;
  if(help)help.textContent='Välj position eller skriv en beteckning.';
 }
 el.groups.replaceChildren();el.canvas.width=0;el.canvas.height=0;
 el.stage.style.width='';el.stage.style.height='';el.stage.style.transform='';
 el.viewer.scrollTo({left:0,top:0});el.side.scrollTop=0;
 const planTag=document.getElementById('pwPlanTag');if(planTag)planTag.hidden=true;
 window.SmartMatchSession?.dismissRecovery?.();
 const status=document.getElementById('pwDraftStatus');if(status){status.hidden=true;status.textContent=''}
 const intro=document.getElementById('pwHomeStatus');
 if(intro)intro.textContent='Ritningen är stängd. Öppna en ny PDF eller fortsätt från ett lokalt projekt.';
 el.empty.hidden=false;document.body.classList.add('pwStartMode');
 document.getElementById('smartPdfInspect').disabled=true;
 setState('Ritningen är stängd. Välj en ny PDF.');
 try{window.SmartMatchDALink?.onProjectOpened?.()}catch(err){console.warn('DA-städning',err)}
 // Destroy old PDF asynchronously; don't reload the page, and don't block UX.
 if(previous)void previous.destroy?.().catch(err=>console.warn('[SmartMatch] PDF cleanup',err));
}
async function smartGoHomeAfterClose({withoutArchive=false}={}){
 // The recovery module archives and removes its active-session pointer during
 // normal closing. Explicit close without a backup must also prevent a browser
 // refresh from resurrecting a drawing that the technician has already closed.
 if(withoutArchive){
  try{
   sessionStorage.removeItem('smartmatch-active-pdf-session:v1');
   sessionStorage.removeItem('smartmatch-active-view-session:v1');
   sessionStorage.removeItem('smartmatch-explicit-refresh-restore:v1');
  }catch(err){console.warn('[SmartMatch] Session could not be cleared',err)}
 }
 smartResetWorkspace();
 // Home renders its recent-file list only after the previous project has gone
 // and the switch guard is released.
 smartProjectSwitchBusy=false;
 await smartShowRecentProjects();
}
async function smartFinishCurrentProject(){
 if(!pdf||smartScanActive||smartProjectSwitchBusy)return;
 smartProjectSwitchBusy=true;
 const button=document.getElementById('pwFinishProject');
 button.disabled=true;
 const originalLabel=button.textContent;
 button.textContent='Stänger…';
 try{
  // Best-effort, silent local backup preserves current checks while the active
  // drawing closes. It never claims to update the user's PDF in Filer/Dropbox.
  const archive=window.SmartMatchSession?.archiveCurrentProject;
  if(typeof archive!=='function')throw new Error('Lokal säkerhetskopia är inte tillgänglig.');
  await archive();
  await smartGoHomeAfterClose();
 }catch(err){
  console.error('[SmartMatch] Kunde inte bevara lokal kopia vid stängning',err);
  smartOpenFinishDialog('Lokal säkerhetskopia misslyckades. Har du redan sparat PDF-filen kan du stänga ändå. Annars: välj Spara PDF först så att ändringarna inte går förlorade.');
 }finally{
  smartProjectSwitchBusy=false;
  button.disabled=false;
  button.textContent=originalLabel;
 }
}
async function smartCloseWithoutLocalBackup(){
 if(!pdf||smartProjectSwitchBusy)return;
 smartProjectSwitchBusy=true;
 const dialog=document.getElementById('pwFinishDialog'),button=document.getElementById('pwFinishConfirm');
 button.disabled=true;
 try{await smartGoHomeAfterClose({withoutArchive:true})}
 finally{button.disabled=false;smartProjectSwitchBusy=false;if(dialog.open)dialog.close()}
}

async function analyze(file,options={}){
 window.SmartMatchSession?.dismissRecovery?.();
 // Each newly opened project starts with both sidebar categories folded.
 drawingCardOpen=false;automationGroupOpen=false;drawingCardFilter='';focusedAutomationId='';
 smartScanActive=true;
 smartLoadStart();
 document.body.classList.remove('pwStartMode');
 el.fileName.textContent=fileStem(file.name);
 el.fileName.title=originalProjectPdfName(file.name);
 const planTag=document.getElementById('pwPlanTag');if(planTag)planTag.hidden=true;
 updateSmartScanStatus('Läser projekt-PDF…');
 let openedSuccessfully=false;
 try{
 pmCancel();pmPointer=null;
 labDiagnosticSequence++;labDiagnosticSpot=null;
 const dlg=document.getElementById('labDiagnosticDialog');if(dlg?.open)dlg.close();
 smartScanAudit={pages:{},reasons:{},annotationCodes:{},colorFirst:0,textColor:0,ocrCandidates:0,ocrAccepted:0,ocrErrors:[],ocrSuggestions:[]};
 smartPendingOcr=[];
 const suggestions=document.getElementById('smartOcrResults');if(suggestions)suggestions.replaceChildren();
 const ocrStatus=document.getElementById('smartOcrStatus');if(ocrStatus)ocrStatus.textContent='OCR är frivilligt. Den kräver internet för att ladda bibliotek och språkdata.';
 smartCardFirstTextHits=0;
 document.getElementById('smartPdfInspect').disabled=true;
 setState('Läser projekt-PDF…');document.body.classList.remove('pwStartMode');const ab=await file.arrayBuffer();bytes=new Uint8Array(ab);fileKey=hashBytes(bytes);currentFileName=file.name||'Tillsyno-projekt.pdf';
 smartLoadProgress(4,'Läser PDF-filen');
 embeddedState=await readEmbeddedProjectState();
 smartProjectTimeConfig=embeddedState?.timeConfig&&typeof embeddedState.timeConfig==='object'?
  JSON.parse(JSON.stringify(embeddedState.timeConfig)):{};
 smartWorkspaceDirty=false;
 smartLoadProgress(8,'Läser sparat projekt');
 projectId=String(embeddedState.projectId||('smartmatch-v35-'+fileKey));
 releaseSmartExport();pdf=await pdfjsLib.getDocument({data:(workspacePdfForDisplay||bytes).slice()}).promise;
 drawingOptionalContentPromise=smartDrawingOptionalContent(pdf);
 page=1;scale=1.1;pageTexts={};drawingPageLevels={};smartSetCurrentDrawingFloor(1);protocolDefs={};drawingNotes=[];inlineNoteDraft=null;document.getElementById('pwInlineNoteEditor').hidden=true;drawingViewport=null;drawingNoteDrag=null;selectedDrawingNoteId='';drawingUndoStack=[];drawingRedoStack=[];pendingImage=null;bulkSelected.clear();bulkSelectMode=false;el.bulkSelect.setAttribute('aria-pressed','false');updateBulkBar();setDrawingTool('');
 el.fileName.textContent=fileStem(currentFileName);el.fileName.title=originalProjectPdfName();el.empty.hidden=true;el.saveProject.disabled=false;
 smartLoadProgress(12,'Förbereder ritningen');
 // Restore v36.23–v36.25 scan order: NEVER clear saved automation objects,
 // GS links or drawing positions just to preview page one. The drawing is
 // rendered only once, after project positions/checks have been restored.
 const restoredCount=embeddedState?.instances?Object.keys(embeddedState.instances).length:0;
 setState(restoredCount?'Sparad projektstatus hittad. Läser positioner och protokoll…':'Läser projektmarkeringar och dörr-ID:n…');
 const scanStart=performance.now();
 await smartIndexDoorCardsFirst();
 const saved=loadSaved();
 scanCardCodes=new Set(Object.keys(smartDoorCardIndex));
 for(const [code,n] of Object.entries(saved.labManualLinks||{}))
  if(Number.isInteger(Number(n))&&Number(n)>0&&Number(n)<=pdf.numPages)scanCardCodes.add(code.toUpperCase());
 scanPageEligibility=new Map();
 const marked=scanCardCodes.size?await extractLabMarkedPositions():[];
 const cardFirstText=scanCardCodes.size?await smartFindCardFirstTextPositions(marked):[];
 marked.push(...cardFirstText);
 const historical=loadSaved().ocrConfirmed;
 smartConfirmedOcr=Array.isArray(historical)?historical.filter(x=>x&&labStrictAnnotationCode(x.code)===x.code&&Array.isArray(x.rect)&&x.rect.length===4&&x.rect.every(Number.isFinite)&&Number.isInteger(x.page)&&x.page>=1&&x.page<=pdf.numPages):[];
 for(const item of smartConfirmedOcr){
  if(item.page>scanPageLimit()||!scanHasDoorCard(item.code)||labAlreadyLocated(marked,item.page,item.code,item.rect))continue;
  marked.push({code:item.code,page:item.page,rect:item.rect,label:item.code,order:950000+marked.length,
   sourceKind:item.code.startsWith('GS')?'gs':'project-code',subtype:'ocr-reviewed',
   scanSource:'ocr-confirmed',confidence:item.confidence||0});
 }
 stamps=marked.filter(m=>m.sourceKind==='gs');
 projectStamps=marked.filter(m=>m.sourceKind!=='gs');
 buildInstances();
 // Show the actual recovered DA list right away, instead of leaving it
 // folded under "DA · Egenkontroller" after every project open.
 if(automationItems.length)automationGroupOpen=true;
 smartLoadProgress(91,'Positionerna identifierade');
 await buildProtocolMap();
 smartLoadProgress(92,'Kopplar dörrkort');
 await buildProjectStampMap();
 smartLoadProgress(93,'Förbereder kontroller');
 // Dörrautomatikens märkningar analyseras först när användaren väljer verktyget.
 await recalcAll();
 smartLoadProgress(97,'Kontrollerar GS-pilar');
 await window.SmartMatchDALink?.onProjectOpened?.();
 smartLoadProgress(98,'Färdigställer ritningen');
 const gsCodes=[...new Set(stamps.map(s=>s.code))],matchedGsCodes=gsCodes.filter(c=>protocolMap[c]).length,textGsCount=0;
 const freeCodes=[...new Set(projectStamps.map(s=>s.code))],matchedFreeCodes=freeCodes.filter(c=>protocolMap[c]).length,matchedPositions=instances.filter(o=>!!protocolMap[o.code]).length;
 const restored=(embeddedState&&Object.keys(embeddedState).length)?
  ' · PDF-projektversion '+(embeddedState.projectRevision||'äldre')+' · '+automationItems.length+' automatiker':'';
 if(!matchedProjectInstances().length)
  setState('SmartMatch TEST v'+SMARTMATCH_RELEASE+': inga kopplade positioner hittades. Använd Placera / koppla för att komplettera.');
 else setState('SmartMatch TEST v'+SMARTMATCH_RELEASE+': '+matchedProjectInstances().length+' positioner med dörrkort hittades'+restored+'.');
 console.info('[SmartMatch TEST v36]',{seconds:Math.round((performance.now()-scanStart)/100)/10,cards:scanCardCodes.size,linked:matchedProjectInstances().length,irrelevantPages:[...scanPageEligibility.values()].filter(v=>!v).length});
 // Scanning can retain decoded images and operators for many PDF pages.
 // All scan work has finished here; release it before the viewer allocates.
 if(DRAWING_IS_MOBILE)await pdf.cleanup();
 await renderDrawing();renderGroups();updateStats();smartRenderGSReport();smartRenderScanAudit();smartRenderFirstCardReport();
 // Original GS scan remains first; the DA tool is user-triggered and never auto-analyzes.
 smartDAInitAfterScan();
 document.getElementById('smartPdfInspect').disabled=false;
 requestAnimationFrame(fitDrawing);
 // No browser-specific project save during PDF opening.
 if(!options.cachedResume)void window.SmartMatchSession?.cachePdf?.();
 smartLoadProgress(100,'Hela ritningen är klar');
 openedSuccessfully=true;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 }finally{
  smartScanActive=false;
  smartLoadStop();
  updateSmartScanStatus('');
  if(openedSuccessfully){
   scheduleDrawingDetail();
   const openedKey=fileKey;
   setTimeout(()=>{void (async()=>{
    try{
     const payload=await window.SmartMatchSession?.offerDraftRestore?.(openedKey,Number(embeddedState?.projectRevision)||0,!!(options.localArchive||options.cachedResume));
     if(!payload||fileKey!==openedKey||smartScanActive)return;
     embeddedState=payload;buildInstances();await recalcAll();await renderDrawing();renderGroups();updateStats();
     smartWorkspaceDirty=true;
     window.SmartMatchSession?.reportStatus?.('Arbete återställt','local');
     setState('Arbete återställt.');
    }catch(err){console.warn('[SmartMatch] Kunde inte återställa lokalt arbete',err)}
   })()},0);
  }
 }
}
document.getElementById('labDiagnoseOpen').onclick=()=>{smartRenderFirstCardReport();smartRenderGSReport();smartRenderScanAudit();document.getElementById('labDiagnosticDialog').showModal()};
const smRevisionDialog=document.getElementById('pwAutomationDialog');
const smTextZoom={details:1,checks:1};
function adjustRevisionText(which,step){
 const next=Math.max(.85,Math.min(1.5,Math.round((smTextZoom[which]+step)*100)/100));
 smTextZoom[which]=next;
 smRevisionDialog.style.setProperty(which==='details'?'--sm-details-scale':'--sm-checks-scale',String(next));
 const output=document.getElementById(which==='details'?'pwDetailsFontValue':'pwChecksFontValue');
 if(output)output.textContent=Math.round(next*100)+'%';
}
for(const [id,which,step] of [
 ['pwDetailsFontMinus','details',-.1],['pwDetailsFontPlus','details',.1],
 ['pwChecksFontMinus','checks',-.1],['pwChecksFontPlus','checks',.1]
])document.getElementById(id).onclick=()=>adjustRevisionText(which,step);

document.getElementById('labDiagnosticClose').onclick=()=>document.getElementById('labDiagnosticDialog').close();
const smartReportDialog=document.getElementById('labDiagnosticDialog');
let smartReportScale=1;
const smartReportSetScale=n=>{
 smartReportScale=Math.max(.85,Math.min(1.5,n));
 smartReportDialog.style.setProperty('--report-font-scale',String(smartReportScale));
};
document.getElementById('smartReportFontMinus').onclick=()=>smartReportSetScale(smartReportScale-.1);
document.getElementById('smartReportFontPlus').onclick=()=>smartReportSetScale(smartReportScale+.1);
smartReportSetScale(1);
// Test v35 har ingen separat sökruta för felsökning av beteckningar.
document.getElementById('smartAuditExport').onclick=smartExportAudit;
document.getElementById('smartRunOcr').onclick=smartRunOcrReview;
// Endast matchade positioner används i TEST v35.
document.getElementById('smartPdfInspect').onclick=inspectCurrentProjectPdf;
document.getElementById('smartAddCards').onclick=()=>document.getElementById('smartCardsFile').click();
document.getElementById('smartCardsFile').onchange=async e=>{
 const cards=[...(e.target.files||[])].filter(file=>/\.pdf$/i.test(file.name)||file.type==='application/pdf');if(!cards.length)return;
 if(!smartBaseDrawingFile){setState('Öppna först ritningsfilen och välj sedan dörrkorten.');return}
 smartAdditionalCardsFile=[...(Array.isArray(smartAdditionalCardsFile)?smartAdditionalCardsFile:[]),...cards];currentFileHandle=null;
 try{setState('Sammanfogar ritningar och dörrkort lokalt…');
  const merged=await smartMergeDrawingWithCards(smartBaseDrawingFile,smartAdditionalCardsFile);
  await analyze(merged.file);
  smartImportReport.files=merged.cardFiles;smartImportReport.pages=merged.importedPages.length;
  const note=document.getElementById('smartCardsNote');
  if(note)note.textContent=merged.cardFiles+' PDF-filer · '+merged.importedPages.length+' tillagda sidor · '+smartImportReport.recognized+' identifierade dörrkort'+(smartImportReport.unrecognized?' · '+smartImportReport.unrecognized+' utan läsbart ID (kan kopplas manuellt)':'')+'.';
  setState('Dörrkort-PDF inlästa: '+smartImportReport.recognized+' identifierade kort av '+merged.importedPages.length+' sidor · '+matchedProjectInstances().length+' ritningspositioner kopplade.');
  e.target.value='';
 }catch(err){console.error(err);setState('Kunde inte kombinera PDF-filerna: '+(err?.message||err))}
};
el.file.onchange=e=>{const file=e.target.files?.[0];if(!file)return;smartBaseDrawingFile=file;smartAdditionalCardsFile=null;smartImportedCardPages=new Set();currentFileHandle=null;el.file.value='';analyze(file).catch(err=>reportProjectOpenError(err,file.name))};
el.openProjectEmpty.onclick=openProjectPdf;
document.getElementById('pwRecentDeleteAll').onclick=()=>void smartDeleteRecentProjects();
document.getElementById('pwFinishProject').onclick=()=>void smartFinishCurrentProject();
document.getElementById('pwFinishDialogClose').onclick=()=>document.getElementById('pwFinishDialog').close();
document.getElementById('pwFinishCancel').onclick=()=>document.getElementById('pwFinishDialog').close();
document.getElementById('pwFinishExport').onclick=()=>{
 document.getElementById('pwFinishDialog').close();
 inspectCurrentProjectPdf();
};
document.getElementById('pwFinishConfirm').onclick=()=>void smartCloseWithoutLocalBackup();
setTimeout(()=>{if(!pdf)void smartShowRecentProjects()},0);
el.saveProject.onclick=toggleSaveMenu;
el.savePortable.onclick=savePortableProject;
el.saveAs.onclick=saveProjectAs;
document.getElementById('pwSaveLocal').onclick=()=>openSmartExportDialog('local');
el.saveCopy.onclick=savePdfCopy;
document.getElementById('pwSavePdfCopy').onclick=()=>{
 if(!bytes)return;closeSaveMenu();
 const file=new File([bytes.slice()],fileStem(currentFileName)+'-pdf-kopia.pdf',{type:'application/pdf'});
 downloadProjectFile(file);setState('PDF-kopia sparad lokalt: '+file.name+'.');
};
document.getElementById('smartExportClose').onclick=()=>document.getElementById('smartExportDialog').close();
document.getElementById('smartExportDialog').addEventListener('close',releaseSmartExport);
document.getElementById('smartExportBuild').onclick=prepareSmartExport;
document.getElementById('smartExportSaveMenuToggle').onclick=()=>{const menu=document.getElementById('smartExportSaveChoices');menu.hidden=!menu.hidden};
document.getElementById('smartExportProtocolsMode').onclick=()=>{document.getElementById('smartExportDialog').close();openSelfcheckExport()};
document.getElementById('smartExportPreview').onclick=previewSmartExport;
document.getElementById('smartExportShare').onclick=()=>void shareSmartExport();
document.getElementById('smartExportDownload').onclick=()=>void downloadSmartExport();
document.getElementById('smartExportSaveObject').onclick=()=>void saveSmartExportObject();
document.getElementById('smartExportSaveAs').onclick=()=>void saveSmartExportAs();
// v35 använder alltid kompakt PDF; inget alternativ för duplicerade dörrkort.
el.hidePositions.onclick=()=>setPositionsHidden(true);
el.showPositions.onclick=()=>setPositionsHidden(false);
document.addEventListener('pointerdown',e=>{
 if(!el.saveMenu.hidden&&!e.target.closest('.pwSaveWrap'))closeSaveMenu();
 if(!el.toolMenu.hidden&&!e.target.closest('.pwToolWrap')&&!el.toolMenu.contains(e.target))closeToolMenu();
});
loadPositionsPreference();
el.prev.onclick=()=>changeDrawingPage(-1);
el.next.onclick=()=>changeDrawingPage(1);
el.zoomOut.onclick=()=>setDrawingScale(scale-.2);
el.zoomIn.onclick=()=>setDrawingScale(scale+.2);
el.fit.onclick=fitDrawing;
el.bulkSelect.onclick=()=>setBulkSelectMode(!bulkSelectMode);
el.bulkPage.onclick=selectAllOnPage;
el.bulkDone.onclick=markBulkDone;
el.bulkClear.onclick=clearBulkSelection;
el.timeReport.onclick=openTimeReport;
el.timeClose.onclick=closeTimeReport;
el.timeAddType.onclick=()=>openTimeTypeEditor();
el.timeDialog.addEventListener('cancel',e=>{e.preventDefault();closeTimeReport()});
el.timeTypeClose.onclick=closeTimeTypeEditor;
el.timeTypeCancel.onclick=closeTimeTypeEditor;
el.timeTypeSave.onclick=saveTimeTypeEditor;
el.timeTypeEditor.addEventListener('cancel',e=>{e.preventDefault();closeTimeTypeEditor()});

PROJECT_AUTOMATION_MODELS.forEach(([code,name])=>{const op=document.createElement('option');op.value=code;op.textContent=code+' · '+name;el.automationModel.appendChild(op)});
{const op=document.createElement('option');op.value='custom';op.textContent='Annan modell…';el.automationModel.appendChild(op)}
el.automationClose.onclick=closeAutomationProtocol;
el.automationDialog.addEventListener('cancel',e=>{e.preventDefault();closeAutomationProtocol()});
el.automationModel.onchange=async()=>{
 const o=selectedAutomation();if(!o)return;
 if(el.automationModel.value==='__saved_automation_model__')return;
 if(el.automationModel.value==='custom'){
  const entered=await requestSmartAction({title:'Ändra modell',label:'Modell / typ av automatik',value:o.model||'',validate:v=>v?'':'Ange modell eller typ.'});
  if(entered&&entered.trim()){o.modelCode=entered.trim();o.model=entered.trim()}else renderAutomationProtocol(o);
 }else{
  const known=PROJECT_AUTOMATION_MODELS.find(([code])=>code===el.automationModel.value);
  if(known){o.modelCode=known[0];o.model=known[1]}else{o.modelCode='';o.model=''}
 }
 save();renderAutomationProtocol(o);renderGroups();renderAutomationMarkers();
};
el.automationSerial.onchange=()=>{const o=selectedAutomation();if(!o)return;o.serialNumber=el.automationSerial.value.trim();save();renderAutomationProtocol(o);renderGroups();renderAutomationMarkers()};
el.automationId.oninput=()=>{const o=selectedAutomation();if(!o)return;o.objectNo=el.automationId.value.trim();save();el.automationIdentity.textContent=[automationDisplayId(o),o.model].filter(Boolean).join(' · ');const fullId=document.getElementById('pwAutomationFullId');if(fullId)fullId.value=automationDisplayId(o);renderGroups()};
el.automationLocation.oninput=()=>{const o=selectedAutomation();if(!o)return;o.location=el.automationLocation.value;save()};
el.automationNotes.oninput=()=>{const o=selectedAutomation();if(!o)return;o.notes=el.automationNotes.value;save()};
el.automationApproveAll.onclick=()=>{const o=selectedAutomation();if(!o)return;PROJECT_AUTOMATION_CHECKS.forEach(([id])=>o.checks[id]={...(o.checks[id]||{}),result:'ok',note:''});o.progress=100;save();updateDALiveStatus(o);renderAutomationProtocol(o)};

[
 [el.projectName,'projectName'],[el.projectFacility,'facilityNo'],[el.projectOrder,'order'],[el.projectDate,'date'],[el.projectNextDate,'nextDate'],
 [el.projectCustomer,'customer'],[el.projectAgreement,'agreement'],[el.projectContact,'contact'],[el.projectPhone,'phone'],[el.projectAddress,'address'],[el.projectPostalCode,'postalCode'],[el.projectPostalCity,'postalCity'],
 [el.projectCompany,'company'],[el.projectCompanyContact,'companyContact'],[el.projectCompanyPhone,'companyPhone'],[el.projectCompanyAddress,'companyAddress'],[el.projectCompanyPostalCode,'companyPostalCode'],[el.projectCompanyPostalCity,'companyPostalCity'],
 [el.projectTechnician,'technician'],[el.projectSignature,'signature']
].forEach(([input,key])=>input.oninput=()=>{projectMeta[key]=input.value;save()});
el.projectLogo.onchange=async e=>{
 const input=e.currentTarget,file=input.files?.[0];if(!file)return;
 el.projectLogoStatus.textContent='Läser in loggan…';
 try{projectLogoData=await prepareProjectLogoFile(file);save();refreshProjectLogoPreview()}
 catch(err){console.error(err);el.projectLogoStatus.textContent=err?.message||'Kunde inte lägga in loggan.'}
 finally{input.value=''}
};
el.projectLogoRemove.onclick=()=>{projectLogoData='';save();refreshProjectLogoPreview()};

if(el.saveSelfchecks)el.saveSelfchecks.onclick=openSelfcheckExport;
el.automationPreview.onclick=openAutomationCustomerPreview;
el.automationPreviewClose.onclick=closeAutomationCustomerPreview;
el.automationPreviewDialog.addEventListener('cancel',e=>{e.preventDefault();closeAutomationCustomerPreview()});
window.addEventListener('resize',()=>{if(el.automationPreviewDialog.open)renderAutomationCustomerPreview().catch(console.error)});
el.selfcheckExportClose.onclick=closeSelfcheckExport;
el.selfcheckExportDialog.addEventListener('cancel',e=>{e.preventDefault();closeSelfcheckExport()});
el.selfcheckSelectAll.onclick=()=>{el.selfcheckExportList.querySelectorAll('.pwSelfcheckExportRow:not([hidden]) input[type="checkbox"]').forEach(x=>x.checked=true);updateSelfcheckExportCount()};
el.selfcheckSelectDone.onclick=()=>{el.selfcheckExportList.querySelectorAll('input[type="checkbox"]').forEach(x=>{x.checked=x.dataset.state==='approved'});updateSelfcheckExportCount()};
document.getElementById('pwProtocolStatusFilter').onchange=applySelfcheckExportFilter;
el.selfcheckExportCreate.onclick=exportSelectedSelfchecks;

// Put the floating menu outside the horizontally scrolling toolbar in Safari/iOS.
// Otherwise overflow-x:auto clips fixed descendants and taps appear to do nothing.
document.body.appendChild(el.toolMenu);
el.toolMenuButton.onclick=toggleToolMenu;
function smartDAInitAfterScan(){
 if(smartDAInitialized)return;
 if(!window.SmartMatchDALink?.init){
  console.warn('[SmartMatch TEST v36] Dörrautomatikmodul saknas. Vanlig SmartMatch-scanning påverkas inte.');
  return;
 }
 try{
  window.SmartMatchDALink.init(window.SmartMatchAppBridge);
  smartDAInitialized=true;
 }catch(err){
  console.error('[SmartMatch TEST v36.11] Dörrautomatikverktygets bakgrundsfunktion kunde inte startas. GS-skanningen förblir separat.',err);
 }
}
// Connect all optional DA actions at app startup, not after PDF scanning.
// The independent menu listener is already installed by the DA module.
smartDAInitAfterScan();

document.querySelector('.pwToolbar')?.addEventListener('scroll',positionToolMenu,{passive:true});
window.addEventListener('resize',positionToolMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.toolMenu.hidden)closeToolMenu()});
document.getElementById('pwInlineNoteText').oninput=smartUpdateInlineNoteFromFields;
for(const id of ['pwInlineNoteSize','pwInlineNoteFrame','pwInlineNoteFrameColor','pwInlineNoteBackground','pwInlineNoteLineWidth'])
 document.getElementById(id).onchange=smartUpdateInlineNoteFromFields;
document.getElementById('pwInlineNoteBold').onclick=()=>{
 const button=document.getElementById('pwInlineNoteBold');
 button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));
 smartUpdateInlineNoteFromFields();
};
document.querySelectorAll('[data-note-color]').forEach(button=>button.onclick=()=>{
 if(!inlineNoteDraft)return;
 inlineNoteDraft.note.color=button.dataset.noteColor;
 document.querySelectorAll('[data-note-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 smartUpdateInlineNoteFromFields();
});
document.getElementById('pwInlineNoteSave').onclick=smartCommitInlineNote;
document.getElementById('pwInlineNoteCancel').onclick=smartCancelInlineNote;
document.getElementById('pwInlineNoteText').addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();smartCancelInlineNote()}
 if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();smartCommitInlineNote()}
});
el.toolText.onclick=()=>setDrawingTool('text');
el.toolCallout.onclick=()=>setDrawingTool('callout');
el.toolArrow.onclick=()=>setDrawingTool('arrow');
el.toolImage.onclick=()=>{closeToolMenu();el.imageFile.value='';el.imageFile.click()};
el.imageFile.onchange=e=>{const file=e.target.files?.[0];if(file)chooseDrawingImage(file)};
el.toolDelete.onclick=deleteSelectedDrawingNote;
el.toolUndo.onclick=undoDrawingNote;
el.toolRedo.onclick=redoDrawingNote;
el.viewer.addEventListener('pointerdown',e=>{if(e.target.closest?.('#pwInlineNoteEditor'))return;if(!beginNoteDrag(e)&&!beginBulkDrag(e)&&!beginDrawingTool(e))beginDrawingPan(e)});
el.viewer.addEventListener('pointermove',e=>{if(e.target.closest?.('#pwInlineNoteEditor'))return;if(!moveNoteDrag(e)&&!moveBulkDrag(e)&&!moveDrawingTool(e))moveDrawingPan(e)});
el.viewer.addEventListener('pointerup',e=>{if(e.target.closest?.('#pwInlineNoteEditor'))return;if(drawingNoteDrag)endNoteDrag(e);else if(bulkDrag)endBulkDrag(e);else if(drawingToolGesture)endDrawingTool(e);else endDrawingPan(e)});
el.viewer.addEventListener('pointercancel',e=>{if(drawingNoteDrag)cancelNoteDrag(e);if(bulkDrag){bulkDrag=null;el.selectionRect.hidden=true}if(drawingToolGesture){drawingToolGesture.preview?.remove();drawingToolGesture=null}endDrawingPan(e)});
el.viewer.addEventListener('touchstart',beginDrawingTouch,{passive:false});
el.viewer.addEventListener('touchmove',moveDrawingTouch,{passive:false});
el.viewer.addEventListener('touchend',endDrawingTouch,{passive:false});
el.viewer.addEventListener('touchcancel',endDrawingTouch,{passive:false});
el.viewer.addEventListener('wheel',e=>{
 if(!pdf)return;
 e.preventDefault();
 const focus=drawingWheelTimer?drawingWheelFocus:drawingFocusRatios(e.clientX,e.clientY);
 if(!drawingWheelTimer){drawingWheelBaseScale=scale;drawingWheelTargetScale=scale;drawingWheelFocus=focus}
 const delta=Math.max(-120,Math.min(120,Number(e.deltaY)||0));
 const factor=Math.exp(-delta*.0017);
 previewDrawingWheelZoom(drawingWheelTargetScale*factor,focus);
},{passive:false});
el.currentPageOnly.onclick=()=>{currentOnly=!currentOnly;el.currentPageOnly.setAttribute('aria-pressed',String(currentOnly));el.currentPageOnly.classList.toggle('active',currentOnly);renderGroups()};
el.back.onclick=closeProtocol;el.protocolClose.onclick=closeProtocol;
el.protocol.addEventListener('cancel',e=>{e.preventDefault();closeProtocol()});
el.protocol.addEventListener('close',()=>el.protocol.classList.remove('pwCardCompareMode'));
el.protocolFit.onclick=fitProtocolPage;
el.protocolZoomOut.onclick=()=>setProtocolScale(protocolScale-.2);
el.protocolZoomIn.onclick=()=>setProtocolScale(protocolScale+.2);
el.protocolMax.onclick=()=>setProtocolScale(3);
el.protocolShowCard.onclick=()=>{el.protocol.classList.remove('pwMobileChecks');el.protocol.classList.add('pwMobileCard');el.protocolCanvasWrap.scrollLeft=0};
el.protocolShowGS.onclick=()=>{el.protocol.classList.remove('pwMobileCard');el.protocol.classList.add('pwMobileChecks')};
document.getElementById('pwProtocolBackToCard').onclick=()=>el.protocolShowCard.click();
el.protocolCanvasWrap.addEventListener('touchstart',beginProtocolTouch,{passive:false});
el.protocolCanvasWrap.addEventListener('touchmove',moveProtocolTouch,{passive:false});
el.protocolCanvasWrap.addEventListener('touchend',endProtocolTouch,{passive:false});
el.protocolCanvasWrap.addEventListener('touchcancel',endProtocolTouch,{passive:false});
el.protocolCanvasWrap.addEventListener('pointerdown',startProtocolMousePan);
el.protocolCanvasWrap.addEventListener('pointermove',moveProtocolMousePan);
el.protocolCanvasWrap.addEventListener('pointerup',endProtocolMousePan);
el.protocolCanvasWrap.addEventListener('pointercancel',endProtocolMousePan);
el.protocolCanvasWrap.addEventListener('lostpointercapture',()=>endProtocolMousePan());
el.protocolCanvasWrap.addEventListener('dragstart',e=>e.preventDefault());
el.protocolCanvasWrap.addEventListener('wheel',wheelProtocolZoom,{passive:false});
el.addChecklistItem.onclick=()=>openItemEditor(selectedInstance());
document.getElementById('pwChecklistMarkAll').onclick=()=>void toggleAllOriginalChecks(true);
document.getElementById('pwChecklistClearAll').onclick=()=>void toggleAllOriginalChecks(false);
el.itemEditorClose.onclick=closeItemEditor;el.editCancel.onclick=closeItemEditor;el.editSave.onclick=saveItemEditor;
el.itemEditor.addEventListener('cancel',e=>{e.preventDefault();closeItemEditor()});
// Safari browser chrome height changes must not re-render the complete PDF.
window.addEventListener('resize',()=>{if(!el.toolMenu.hidden)positionToolMenu()},{passive:true});
function pmCode(value){return labStrictAnnotationCode(String(value||''))||smartNormalizeCardLabel(value)}
function pmHelp(message){$('pmHelp').textContent=message}
function pmRefresh(){
 const codes=[...new Set([...Object.keys(smartDoorCardIndex),...instances.map(o=>o.code)])].sort();
 $('pmCodes').replaceChildren(...codes.map(code=>{const o=document.createElement('option');o.value=code;return o}));
 $('pmAdd').disabled=!pdf;$('pmLink').disabled=!pdf;
}
function pmSelect(o){$('pmCode').value=o.code;$('pmCard').value=protocolMap[o.code]||'';selectedId=o.id;pmHelp('Vald '+o.code+' · position på sida '+o.page+'. Koppling gäller alla positioner med denna beteckning.');renderMarkers()}
let pmSizePreview=null;
function pmRemoveSizePreview(){if(pmSizePreview){pmSizePreview.remove();pmSizePreview=null}}
function pmCancel(){
 placement=null;pmPointer=null;pmRemoveSizePreview();
 el.stage.classList.remove('pmPlacing');
 const cancel=$('pmCancel');if(cancel)cancel.hidden=true;
}
function pmDragPreview(a,b,code){
 if(!pmSizePreview){
  pmSizePreview=document.createElement('div');pmSizePreview.className='pmDragPreview';
  pmSizePreview.setAttribute('aria-hidden','true');el.stage.appendChild(pmSizePreview);
 }
 const left=Math.max(0,Math.min(a.x,b.x)),top=Math.max(0,Math.min(a.y,b.y));
 const width=Math.max(30,Math.abs(b.x-a.x)),height=Math.max(20,Math.abs(b.y-a.y));
 Object.assign(pmSizePreview.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
 // Preview only a translucent frame around existing PDF text, with no copy.
 pmSizePreview.textContent='';
}
function pmPlace(o){
 if(!pdf)return;
 const code=o?.code||pmCode($('pmCode').value);
 if(!code){pmHelp('Ange en beteckning, till exempel GS1 eller 310A.');return}
 if(o&&page!==o.page){page=o.page;void renderDrawing()}
 document.getElementById('pwPositionEditor').open=true;
 pmRemoveSizePreview();
 placement={id:o?.id||null,code};
 el.stage.classList.add('pmPlacing');$('pmCancel').hidden=false;
 pmHelp('Tryck för att flytta den gula ramen runt den befintliga '+code+'-stämpeln. Dra med fingret eller musen för att ändra storlek. Originaltexten i PDF:en ska synas utan dubbeltext.');
}
function pmCounts(){const counts={};instances.forEach(o=>{counts[o.code]=(counts[o.code]||0)+1});const n={};instances.forEach(o=>{o.position=n[o.code]=(n[o.code]||0)+1;o.totalOfCode=counts[o.code]})}
async function pmCommit(startPoint,endPoint=null){
 if(!placement||!drawingViewport)return;
 const vp=drawingViewport;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const a={x:clamp(startPoint.x,0,vp.width),y:clamp(startPoint.y,0,vp.height)};
 const b=endPoint?{x:clamp(endPoint.x,0,vp.width),y:clamp(endPoint.y,0,vp.height)}:null;
 const old=instances.find(o=>o.id===placement.id);
 let left,top,right,bottom;
 const isDragged=b&&Math.hypot(a.x-b.x,a.y-b.y)>=12;
 if(isDragged){
  // Drag to draw an adjustable rectangle directly over the existing PDF text.
  left=Math.min(a.x,b.x);top=Math.min(a.y,b.y);
  right=Math.min(vp.width,left+Math.max(30,Math.abs(a.x-b.x)));
  bottom=Math.min(vp.height,top+Math.max(20,Math.abs(a.y-b.y)));
 }else{
  // A simple tap moves the existing marker, preserving its size rather than
  // destroying it with the former fixed 18 x 18 PDF-point rectangle.
  const prev=old?viewportRect(vp,old.rect):null;
  const labelWidth=String(placement.code||'').length*8+16;
  const width=Math.min(vp.width,Math.max(34,labelWidth,prev?.width||0));
  const height=Math.min(vp.height,Math.max(24,prev?.height||0));
  left=clamp(a.x-width/2,0,Math.max(0,vp.width-width));
  top=clamp(a.y-height/2,0,Math.max(0,vp.height-height));
  right=left+width;bottom=top+height;
 }
 // PDF page origin is bottom-left: convert two opposite viewport corners and
 // keep the resulting PDF rectangle canonical so zoom and PDF export agree.
 const p1=vp.convertToPdfPoint(left,top),p2=vp.convertToPdfPoint(right,bottom);
 const rect=[Math.min(p1[0],p2[0]),Math.min(p1[1],p2[1]),Math.max(p1[0],p2[0]),Math.max(p1[1],p2[1])];
 const mode=placement;
 let o=old;
 if(o){
  o.page=page;o.rect=rect;
  if(o.manual){
   const original=manualPositions.find(p=>p.id===o.id);
   if(original){original.page=page;original.rect=[...rect]}
  }else positionEdits[o.id]={...positionEdits[o.id],page,rect};
 }else{
  o={id:'manual:'+crypto.randomUUID(),manual:true,code:mode.code,page,rect,order:0,
   sourceKind:/^GS\d/.test(mode.code)?'gs':'project-code',checks:{},overrides:{},customItems:[],progress:0};
  manualPositions.push({...o});instances.push(o);
 }
 ignoredCodes.delete(mode.code);selectedId=o.id;pmCancel();pmCounts();
 await recalcAll();pmSelect(o);
 pmHelp(o.code+' sparad med '+(isDragged?'egen vald storlek':'bibehållen/anpassad storlek')+' på sida '+page+'. Storleken och placeringen sparas med projekt-PDF:en.');
}
async function pmRename(o){
 const value=window.prompt('Rätt beteckning för denna position:',o.code);if(value===null)return;
 const code=pmCode(value);if(!code){pmHelp('Beteckningen kunde inte läsas. Exempel: GS1, GS 1, 310A.');return}
 ignoredCodes.delete(code);o.code=code;if(o.manual)manualPositions.find(p=>p.id===o.id).code=code;else positionEdits[o.id]={...positionEdits[o.id],code};
 pmCounts();await recalcAll();pmSelect(o);
}
async function pmRemoveAllUnlinked(){
 const all=instances.filter(o=>!protocolMap[o.code]);
 if(!all.length)return;
 if(!window.confirm('Ta bort alla '+all.length+' positioner utan dörrkort i HELA projektet?\n\nKopplade positioner berörs inte. Spara projekt-PDF för att bevara ändringen.'))return;
 const ids=new Set(all.map(o=>o.id)),codes=new Set(all.map(o=>o.code));
 for(const code of codes)ignoredCodes.add(code);
 if(placement&&(codes.has(placement.code)||ids.has(placement.id)))pmCancel();
 for(const o of all){if(!o.manual)positionEdits[o.id]={...positionEdits[o.id],deleted:true};bulkSelected.delete(o.id)}
 manualPositions=manualPositions.filter(o=>!ids.has(o.id));
 instances=instances.filter(o=>!ids.has(o.id));
 if(ids.has(selectedId))selectedId='';
 unlinkedFolderOpen=false;pmCounts();
 await recalcAll();smartRenderGSReport();smartRenderFirstCardReport();
 pmHelp(all.length+' okopplade positioner borttagna. Spara projekt-PDF.');
}
async function pmRemoveGroup(code){
 const matches=instances.filter(o=>o.code===code);
 if(!matches.length)return;
 const total=matches.length;
 if(!window.confirm('Ta bort alla '+total+' positioner för '+code+' i hela projektet?\n\nDessa positioner räknas då inte med i projektets procent. Spara en projekt-PDF efteråt för att behålla ändringen.'))return;
 if(placement?.code===code)pmCancel();
 ignoredCodes.add(code);
 const ids=new Set(matches.map(o=>o.id));
 for(const o of matches){if(!o.manual)positionEdits[o.id]={...positionEdits[o.id],deleted:true};bulkSelected.delete(o.id)}
 manualPositions=manualPositions.filter(o=>!ids.has(o.id));
 instances=instances.filter(o=>!ids.has(o.id));
 if(ids.has(selectedId))selectedId='';
 pmCounts();await recalcAll();smartRenderGSReport();smartRenderFirstCardReport();
 pmHelp(total+' positioner för '+code+' borttagna ur arbetsprojektet. Spara projekt-PDF för att behålla ändringen.');
}
async function pmRemove(o){
 if(!window.confirm('Ta bort denna placering av '+o.code+' på sida '+o.page+'?'))return;
 if(placement?.id===o.id)pmCancel();
 if(o.manual)manualPositions=manualPositions.filter(p=>p.id!==o.id);else positionEdits[o.id]={...positionEdits[o.id],deleted:true};
 instances=instances.filter(p=>p.id!==o.id);pmCounts();await recalcAll();smartRenderGSReport();smartRenderFirstCardReport();pmHelp('Placeringen borttagen. Övriga positioner finns kvar.');
}
$('pmAdd').onclick=()=>pmPlace();$('pmCancel').onclick=pmCancel;
$('pmCode').oninput=()=>{$('pmCard').value=protocolMap[pmCode($('pmCode').value)]||''};
$('pmLink').onclick=async()=>{
 const code=pmCode($('pmCode').value),n=Number($('pmCard').value);
 if(!pdf||!code||!Number.isInteger(n)||n<1||n>pdf.numPages){pmHelp('Ange beteckning och en giltig dörrkortssida i PDF:en.');return}
 labManualLinks[code]=n;await buildProtocolMap();protocolDefs={};await recalcAll();pmHelp(code+' kopplad till sida '+n+'. Kontrollera dörrkortet innan du börjar bocka av.');
};
el.stage.addEventListener('pointerdown',e=>{
 if(!placement)return;
 e.stopImmediatePropagation();e.preventDefault();
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(pmPointer){pmPointer=null;pmRemoveSizePreview();pmHelp('Använd ett finger eller en muspekare.');return}
 pmPointer={id:e.pointerId,x:e.clientX,y:e.clientY,point:stagePoint(e.clientX,e.clientY),code:placement.code};
 try{el.stage.setPointerCapture(e.pointerId)}catch(_){}
},true);
el.stage.addEventListener('pointermove',e=>{
 if(!placement)return;
 e.stopImmediatePropagation();e.preventDefault();
 if(!pmPointer||pmPointer.id!==e.pointerId)return;
 const now=stagePoint(e.clientX,e.clientY);
 if(Math.hypot(now.x-pmPointer.point.x,now.y-pmPointer.point.y)>6)pmDragPreview(pmPointer.point,now,pmPointer.code);
},true);
el.stage.addEventListener('pointerup',e=>{
 if(!placement)return;
 e.stopImmediatePropagation();e.preventDefault();
 const start=pmPointer;pmPointer=null;pmRemoveSizePreview();
 if(start?.id!==e.pointerId)return;
 pmSuppressClickUntil=Date.now()+500;
 const end=stagePoint(e.clientX,e.clientY);
 // Both a click (move without shrinking) and drag (resize to fit PDF label)
 // commit to the same saved rect, including when the user uses a touch screen.
 void pmCommit(start.point,end);
},true);
el.stage.addEventListener('pointercancel',()=>{pmPointer=null;pmRemoveSizePreview()},true);
el.stage.addEventListener('click',e=>{if(placement||Date.now()<pmSuppressClickUntil){e.stopImmediatePropagation();e.preventDefault()}},true);
for(const name of ['touchstart','touchmove','touchend','touchcancel'])el.stage.addEventListener(name,e=>{if(placement||Date.now()<pmSuppressClickUntil){e.stopImmediatePropagation();e.preventDefault()}},{capture:true,passive:false});
pmRefresh();

// Keep the bounded whole-page preview during navigation. Rasterize just the
// visible PDF area at screen resolution after motion stops; coordinates stay
// in the original logical viewport, including markers and manually moved doors.
const drawingDetailCanvas=document.createElement('canvas');
drawingDetailCanvas.id='pwDrawingDetail';drawingDetailCanvas.hidden=true;
drawingDetailCanvas.style.cssText='position:absolute;pointer-events:none;box-shadow:none;';
el.canvas.after(drawingDetailCanvas);
function clearDrawingDetail(){
 clearTimeout(drawingDetailTimer);drawingDetailVersion++;
 // Keep finished original PDF pixels visible while the stage moves. A cached
 // crop stays at its PDF coordinates and scales with the rest of the stage.
 drawingDetailCanvas.hidden=!(DRAWING_IS_MOBILE&&drawingDetailKey.startsWith([fileKey,page].join(':')+':')&&drawingDetailCanvas.width);
 if(DRAWING_IS_MOBILE){
  // Let an already started crop finish. Repeated pinch/pan must not churn
  // PDF.js cancellation/restart buffers or resize a canvas that is rendering.
  return;
 }
 drawingDetailKey='';
 if(drawingDetailTask)try{drawingDetailTask.cancel()}catch(_){}
 drawingDetailCanvas.width=drawingDetailCanvas.height=0;
}
function scheduleDrawingDetail(){
 if(smartScanActive)return;
 clearTimeout(drawingDetailTimer);
 const version=drawingDetailVersion;
 drawingDetailTimer=setTimeout(()=>{
  drawingRenderQueue=drawingRenderQueue.catch(()=>{}).then(()=>{
   if(version!==drawingDetailVersion)return;
   return renderDrawingDetail();
  });
  void drawingRenderQueue.catch(err=>{if(err?.name!=='RenderingCancelledException')console.warn('Ritningens detaljvisning',err)});
 },DRAWING_IS_PHONE?120:DRAWING_IS_MOBILE?1200:300);
}
async function renderDrawingDetail(){
 if(!pdf||drawingPan||drawingTouch||drawingWheelTimer||el.stage.style.transform||el.stage.style.zoom)return;
 const documentPdf=pdf,pageNumber=page,targetScale=scale,version=++drawingDetailVersion;
 const viewer=el.viewer.getBoundingClientRect(),stage=el.stage.getBoundingClientRect();
 const width=parseFloat(el.stage.style.width)||0,height=parseFloat(el.stage.style.height)||0;
 const left=Math.max(0,viewer.left-stage.left),top=Math.max(0,viewer.top-stage.top);
 const w=Math.min(width-left,el.viewer.clientWidth),h=Math.min(height-top,el.viewer.clientHeight);
 if(w<=0||h<=0)return;
 const ratio=Math.min(window.devicePixelRatio||1,DRAWING_IS_MOBILE?2:3,Math.sqrt((DRAWING_IS_MOBILE?1000000:3000000)/(w*h)),4096/w,4096/h);
 const key=[fileKey,pageNumber,targetScale,left,top,w,h,ratio].join(':');
 // A gesture returning to the exact same view can reuse the finished image.
 if(key===drawingDetailKey&&drawingDetailCanvas.width){drawingDetailCanvas.hidden=false;return}
 const pg=await documentPdf.getPage(pageNumber);
 if(version!==drawingDetailVersion||pdf!==documentPdf||page!==pageNumber||scale!==targetScale)return;
 // On mobile render straight into ONE bounded visible-area surface. No
 // temporary surface plus full-size copy, no patchwork of separate stamps.
 const canvas=DRAWING_IS_MOBILE?drawingDetailCanvas:document.createElement('canvas');
 let task=null,committed=false;
 try{
  drawingDetailCanvas.hidden=true;drawingDetailKey='';
  canvas.width=Math.ceil(w*ratio);canvas.height=Math.ceil(h*ratio);
  task=pg.render({canvasContext:canvas.getContext('2d'),viewport:pg.getViewport({scale:targetScale*ratio}),transform:[1,0,0,1,-left*ratio,-top*ratio],optionalContentConfigPromise:drawingOptionalContentPromise||undefined});
  drawingDetailTask=task;await task.promise;
  if(version!==drawingDetailVersion||pdf!==documentPdf||page!==pageNumber||scale!==targetScale)return;
  if(!DRAWING_IS_MOBILE){
   drawingDetailCanvas.width=canvas.width;drawingDetailCanvas.height=canvas.height;
   drawingDetailCanvas.getContext('2d').drawImage(canvas,0,0);
  }
  Object.assign(drawingDetailCanvas.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px'});
  drawingDetailKey=key;drawingDetailCanvas.hidden=false;committed=true;
 }finally{
  if(drawingDetailTask===task)drawingDetailTask=null;
  if(!DRAWING_IS_MOBILE||!committed)canvas.width=canvas.height=0;
  // Reuse the current page operators for the next zoom. Cleanup on page
  // change/close avoids rebuilding the PDF for every gesture.
  if(DRAWING_IS_MOBILE&&pg!==drawingActivePdfPage)pg.cleanup();
 }
}
el.viewer.addEventListener('scroll',()=>{clearDrawingDetail();scheduleDrawingDetail()},{passive:true});
for(const event of ['pointerdown','touchstart','wheel'])el.viewer.addEventListener(event,()=>{clearDrawingDetail();scheduleDrawingDetail()},{capture:true,passive:true});
for(const event of ['pointerup','pointercancel','touchend','touchcancel'])el.viewer.addEventListener(event,scheduleDrawingDetail,{passive:true});


// Desktop floating panels keep the existing controls and listeners intact.
let smartActionResolve=null;
function requestSmartAction(options={}){
 const dialog=document.getElementById('pwSmartActionDialog'),input=document.getElementById('pwSmartActionInput'),error=document.getElementById('pwSmartActionError');
 if(smartActionResolve)smartActionResolve(null);
 if(dialog.open)dialog.close();
 return new Promise(resolve=>{
  const finish=value=>{smartActionResolve=null;dialog.close();resolve(value)};
  smartActionResolve=resolve;
  document.getElementById('pwSmartActionTitle').textContent=options.title||'Ändra';
  document.getElementById('pwSmartActionMessage').textContent=options.message||'';
  document.getElementById('pwSmartActionField').hidden=!!options.confirm;
  document.getElementById('pwSmartActionLabel').textContent=options.label||'Märkning';
  input.value=options.value||'';error.hidden=true;
  const button=document.getElementById('pwSmartActionSave');button.textContent=options.action||'Spara';button.classList.toggle('isDanger',!!options.danger);
  document.getElementById('pwSmartActionForm').onsubmit=e=>{
   e.preventDefault();const value=options.confirm?'':input.value.trim(),message=options.validate?.(value)||'';
   if(message){error.textContent=message;error.hidden=false;input.focus();return}
   finish(value);
  };
  document.getElementById('pwSmartActionCancel').onclick=()=>finish(null);
  document.getElementById('pwSmartActionClose').onclick=()=>finish(null);
  dialog.oncancel=e=>{e.preventDefault();finish(null)};
  dialog.showModal();if(!options.confirm){input.focus();input.select()}
 });
}

function clampFloatingPanel(panel,left,top){
 const rect=panel.getBoundingClientRect(),pad=8;
 const x=Math.max(pad,Math.min(left,Math.max(pad,window.innerWidth-rect.width-pad)));
 const y=Math.max(pad,Math.min(top,Math.max(pad,window.innerHeight-rect.height-pad)));
 Object.assign(panel.style,{position:'fixed',left:x+'px',top:y+'px',right:'auto',bottom:'auto',margin:'0',transform:'none'});
}
function makeDesktopPanelDraggable(panel,handle){
 if(!panel||!handle)return;
 let drag=null;
 handle.addEventListener('pointerdown',event=>{
  if((event.pointerType==='mouse'&&event.button!==0)||event.target.closest('button,input,select,a'))return;
  const rect=panel.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
  event.preventDefault();handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  clampFloatingPanel(panel,drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,event=>{
  if(drag?.id!==event.pointerId)return;drag=null;
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
 });
 window.addEventListener('resize',()=>{if(panel.style.left){const rect=panel.getBoundingClientRect();clampFloatingPanel(panel,rect.left,rect.top)}});
 handle.classList.add('pwFloatingDragHandle');handle.title='Dra för att flytta';
}
if(!DRAWING_IS_MOBILE){
 document.body.classList.add('pwDesktopFloating');
 el.side.setAttribute('role','dialog');el.side.setAttribute('aria-label','Positioner');
 makeDesktopPanelDraggable(el.side,el.side.querySelector('.pwSideHead'));
}
for(const id of ['pwDALinkDialog','pwDADoorDialog']){
 const panel=document.getElementById(id);makeDesktopPanelDraggable(panel,panel.querySelector('.pwDAHead'));
}

// Egna protokoll är borttaget. Ordinarie projektpositioner och kontrollprotokoll är kvar.
// Render the actual JS release only after all app initialization handlers have attached.
const buildLabel=document.getElementById('pwBuildVersion');
if(buildLabel){
 buildLabel.textContent='TEST v'+SMARTMATCH_RELEASE+' ✓';
 buildLabel.title='SmartMatch TEST v'+SMARTMATCH_RELEASE+' är laddad i denna webbläsare';
 buildLabel.dataset.loadedBuild=SMARTMATCH_RELEASE;
}
})();
