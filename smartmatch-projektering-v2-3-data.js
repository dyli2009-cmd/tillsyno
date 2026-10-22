/* Tillsyno Projektering 2.3. Compatible schema 2 with counted automation/closer symbols. */
(function(root,factory){
 'use strict'; const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Data=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const LIMITS=Object.freeze({cards:500,placements:5000,pages:200,stencils:2000,customProducts:1000});
 const META_KEYS=Object.freeze(['littera','hanging','doorType','fire','security','escape','reentry']);
 const SPECIAL_CODES=Object.freeze(['DGS100','VC','HVC','WC','HWC','DBL','DA','DS']);
 const TOOLBAR_TOOLS=Object.freeze(['toolPan','toolErase','undo','redo','duplicateSelection','deleteSelection','lockSelection','newStencilTool','newCardTool','rotateLeft','rotateRight','selectAllTool']);
 const DEFAULT_TOOLBAR_TOOLS=Object.freeze(['undo','redo','duplicateSelection','deleteSelection','newStencilTool','newCardTool','rotateLeft','rotateRight']);
 const PRODUCT_TYPES=Object.freeze(['none','doorAutomation','doorCloser']);
 const PRODUCT_TYPE_LABELS=Object.freeze({none:'Ingen separat produkt',doorAutomation:'Dörrautomatik',doorCloser:'Dörrstängare'});
 const SIZE_SCOPES=Object.freeze(['doors','code','single']);
  // Exact words used as headings by the existing reader cannot be reliable card identities.
  const RESERVED_CODES = new Set([
    'DORRKORT', 'BESLAGSKORT', 'BESLAGSKOD', 'BESLAGKOD', 'BETECKNING', 'LITTERA', 'TOALETT',
    'DORR', 'DORRTYP', 'KOD', 'KORT', 'ANTAL', 'SIDA', 'SIDAN', 'PAGE', 'MODELL', 'PRODUKT',
    'KOMPONENT', 'BESLAG', 'RUMSTYP', 'PROJEKT', 'PLAN', 'PLANRITNING', 'RITNING', 'DATUM',
    'REV', 'REVISION', 'SKALA', 'OBJEKT', 'NUMMER', 'NR', 'ID', 'GS', 'CONSTRUCTOR', 'PROTOTYPE'
  ]);
  const LABEL_CODES = ['DORRKORT', 'BESLAGSKORT', 'BESLAGSKOD', 'BESLAGKOD', 'BETECKNING', 'LITTERA', 'DORRTYP', 'TOALETT', 'DORRNUMMER', 'DORRNR', 'DORR', 'NUMMER', 'NR', 'ID', 'KOD'];
  const SECTIONS = [
    { title: 'Daglåsning', rows: [
      ['day-lock', 'Låshus', 'lock'],
      ['day-cylinder-fittings', 'Cylinderbehör', 'cylinder-fittings'],
      ['day-strike', 'Slutbleck', 'strike'],
      ['day-handle', 'Trycke', 'handle'],
      ['day-pull', 'Draghandtag', 'pull'],
      ['day-escape', 'Utrymningsbehör', 'escape'],
      ['day-cable', 'Kabelöverföring', 'cable'],
      ['day-cylinder-hinge', 'Cylinder gångjärnssida', 'cylinder'],
      ['day-cylinder-strike', 'Cylinder anslagssida', 'cylinder']
    ] },
    { title: 'Nattlåsning', rows: [
      ['night-lock', 'Låshus', 'lock'],
      ['night-strike', 'Slutbleck', 'strike'],
      ['night-cylinder-fittings', 'Cylinderbehör', 'cylinder-fittings'],
      ['night-cylinder-hinge', 'Cylinder gångjärnssida', 'cylinder'],
      ['night-cylinder-strike', 'Cylinder anslagssida', 'cylinder']
    ] },
    { title: 'Dörrstängning', rows: [
      ['closing-closer', 'Dörrstängare', 'closer'],
      ['closing-arm', 'Dörrstängningsarm', 'closer-arm'],
      ['closing-operator', 'Dörrautomatik', 'operator'],
      ['closing-sensor-hinge', 'Sensorlist gångjärnssida', 'sensor'],
      ['closing-sensor-strike', 'Sensorlist anslagssida', 'sensor'],
      ['closing-elbow', 'Armbågskontakt', 'activation'],
      ['closing-coordinator', 'Dörrkoordinator', 'coordinator'],
      ['closing-bolt', 'Kantregel', 'bolt']
    ] },
    { title: 'Larm/Passer', rows: [
      ['access-magnet', 'Magnetkontakt', 'magnet'],
      ['access-reader', 'Kortläsare', 'reader'],
      ['access-button', 'Öppnaknapp', 'activation'],
      ['access-controller', 'Dörrcentral', 'controller']
    ] }
  ].map(section => Object.freeze({
    title: section.title,
    rows: Object.freeze(section.rows.map(([id, label, category]) => Object.freeze({ id, label, category })))
  }));
  Object.freeze(SECTIONS);
  const ROWS = SECTIONS.flatMap(section => section.rows.map(row => ({ ...row, section: section.title })));
  const CATEGORIES = new Set(ROWS.map(row => row.category));

  // Product names are illustrative catalogue entries, never a compatibility recommendation.
  const PRODUCTS = [
    ['lock-st140-50', 'ST140-50', 'lock', 'Exempel på låshus för daglåsning.'],
    ['lock-511-50', '511-50', 'lock', 'Exempel på låshus för nattlåsning.'],
    ['lock-demo-el', 'EL-LÅS DEMO', 'lock', 'Fiktivt ellås för att prova produktsökningen.'],
    ['fittings-256', '256', 'cylinder-fittings', 'Exempel på cylinderbehör.'],
    ['fittings-4265', '4265', 'cylinder-fittings', 'Exempel på cylinderbehör.'],
    ['strike-std', 'Slutbleck std', 'strike', 'Exempel på standardslutbleck.'],
    ['strike-el-demo', 'EL-SLUTBLECK DEMO', 'strike', 'Fiktivt elslutbleck.'],
    ['handle-demo', 'Trycke DEMO 01', 'handle', 'Fiktivt trycke.'],
    ['handle-demo-02', 'Trycke DEMO 02', 'handle', 'Fiktivt trycke med annan utformning.'],
    ['pull-demo', 'Draghandtag DEMO', 'pull', 'Fiktivt draghandtag.'],
    ['escape-17963', '17963', 'escape', 'Exempel på utrymningsbehör.'],
    ['cable-ea281', 'EA281', 'cable', 'Exempel på kabelöverföring.'],
    ['cylinder-8882', '8882', 'cylinder', 'Exempel på cylinder.'],
    ['cylinder-demo-thumb', 'Cylinder/vred DEMO', 'cylinder', 'Fiktiv cylinder med vred.'],
    ['cylinder-demo', 'Cylinder DEMO', 'cylinder', 'Fiktiv cylinder.'],
    ['closer-demo', 'Dörrstängare DEMO', 'closer', 'Fiktiv dörrstängare.'],
    ['arm-demo', 'Glidarm DEMO', 'closer-arm', 'Fiktiv dörrstängningsarm.'],
    ['operator-sw300', 'SW300', 'operator', 'Exempel på dörrautomatik; val av utrustning måste projekteras separat.'],
    ['operator-demo', 'AUTOMATIK DEMO', 'operator', 'Fiktiv dörrautomatik.'],
    ['sensor-flatscan', 'Flatscan', 'sensor', 'Exempel på sensorlist.'],
    ['sensor-demo', 'Sensorlist DEMO', 'sensor', 'Fiktiv sensor för dörrsida.'],
    ['activation-jck207', 'JCK207', 'activation', 'Exempel på armbågskontakt.'],
    ['activation-demo', 'Öppnaknapp DEMO', 'activation', 'Fiktiv öppnaknapp.'],
    ['coordinator-demo', 'Dörrkoordinator DEMO', 'coordinator', 'Fiktiv dörrkoordinator.'],
    ['bolt-demo', 'Kantregel DEMO', 'bolt', 'Fiktiv kantregel.'],
    ['magnet-dc107', 'DC107', 'magnet', 'Exempel på magnetkontakt.'],
    ['reader-demo', 'Kortläsare DEMO', 'reader', 'Fiktiv kortläsare.'],
    ['controller-demo', 'Dörrcentral DEMO', 'controller', 'Fiktiv dörrcentral.']
  ].map(([id, name, category, description]) => Object.freeze({ id, name, category, description }));
  Object.freeze(PRODUCTS);
  const OWNER_VALUES = Object.freeze(['GS', 'DT', 'EL', 'BH', 'BEST', 'ANNAN', '-']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const natural = new Intl.Collator('sv', { numeric: true, sensitivity: 'base' });
  const now = () => new Date().toISOString();
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function text(value,label,max,allowEmpty=true){
    if(typeof value!=='string')throw Error(label+' måste vara text.');
    const clean=value.trim();
    if((!allowEmpty&&!clean)||clean.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(clean))throw Error(label+' har ett ogiltigt värde.');
    return clean;
  }
  function normalizeCode(value){
    if(typeof value!=='string')throw Error('Ange en stämpelbeteckning.');
    const code=value.normalize('NFKC').toUpperCase().replace(/\s+/g,'');
    if(code.length>24||!/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/.test(code))throw Error('Beteckningen får innehålla 1–24 bokstäver A–Z, siffror och bindestreck.');
    if(RESERVED_CODES.has(code)||LABEL_CODES.some(label=>code.startsWith(label+'-'))||/^(?:DORRKORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|TOALETT)(?=[A-Z]{0,5}\d)/.test(code)||/^(?:DORRKORT|BESLAGSKORT)[A-Z]{2,48}$/.test(code))throw Error('Beteckningen kan förväxlas med en rubrik vid avläsning. Välj en annan beteckning.');
    return code;
  }
  const matchKey=value=>normalizeCode(value).replace(/-/g,'');
  function idValue(value,label='ID'){
    const id=text(value,label,80,false);
    if(!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(id)||['constructor','prototype'].includes(id.toLowerCase()))throw Error(label+' får innehålla bokstäver, siffror och bindestreck.');
    return id;
  }
  function num(value,label,min,max){
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(label+' måste ligga mellan '+min+' och '+max+'.');
    return value;
  }
  function int(value,label,min,max){num(value,label,min,max);if(!Number.isInteger(value))throw Error(label+' måste vara ett heltal.');return value;}
  function defaultPreferences(){return {sizeScope:'doors',doorSize:null,toolbarTools:DEFAULT_TOOLBAR_TOOLS.slice(),autoOpenCard:true};}
  function normalizedPreferences(input){
    if(input===undefined)return defaultPreferences();
    if(!isObject(input))throw Error('Projektets inställningar är ogiltiga.');
    const value={...defaultPreferences(),...input};
    if(!SIZE_SCOPES.includes(value.sizeScope))throw Error('Välj storlek för alla dörrstämplar, samma beteckning eller en stämpel.');
    let doorSize=null;
    if(value.doorSize!==null){if(!isObject(value.doorSize))throw Error('Den gemensamma dörrstorleken är ogiltig.');doorSize={width:num(value.doorSize.width,'Stämpelbredd',6,500),height:num(value.doorSize.height,'Stämpelhöjd',6,500)};}
    if(!Array.isArray(value.toolbarTools))throw Error('Verktygsfältet innehåller ett okänt eller dubblerat verktyg.');
    const toolbarTools=value.toolbarTools.filter(id=>id!=='alignTools'); // Retired in 2.3; legacy projects remain readable.
    if(toolbarTools.some(id=>typeof id!=='string'||!TOOLBAR_TOOLS.includes(id))||new Set(toolbarTools).size!==toolbarTools.length)throw Error('Verktygsfältet innehåller ett okänt eller dubblerat verktyg.');
    if(typeof value.autoOpenCard!=='boolean')throw Error('Inställningen för att öppna dörrkort är ogiltig.');
    return {sizeScope:value.sizeScope,doorSize,toolbarTools,autoOpenCard:value.autoOpenCard};
  }
  const angle=value=>((num(value,'Rotation',-360000,360000)%360)+360)%360;
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  function touch(state){state.project.revision++;state.project.updatedAt=now();}
  function transact(state,operation,select){
    const next=clone(state),result=operation(next);touch(next);
    const clean=validate(next);for(const key of Object.keys(state))delete state[key];Object.assign(state,clean);
    return select?select(state,result):state;
  }
  function createCard(value){
    const code=normalizeCode(value);
    return {code,meta:Object.fromEntries(META_KEYS.map(key=>[key,key==='littera'?code:''])),rows:ROWS.map(row=>({id:row.id,section:row.section,label:row.label,product:'',quantity:1,delivery:'GS',installer:'GS'})),note:''};
  }
  function normalizedCard(input,expectedCode){
    if(!isObject(input))throw Error('Dörrkortet saknas.');
    const code=normalizeCode(input.code);if(code!==expectedCode)throw Error('Dörrkortets beteckning stämmer inte.');
    if(!isObject(input.meta))throw Error('Dörrkortets grunduppgifter saknas.');
    const meta=Object.fromEntries(META_KEYS.map(key=>[key,text(input.meta[key]??'', 'Kortets '+key,120)]));
    if(!Array.isArray(input.rows)||input.rows.length!==ROWS.length)throw Error('Dörrkortet måste innehålla alla '+ROWS.length+' utrustningsrader.');
    const byId=new Map();for(const row of input.rows){if(!isObject(row)||typeof row.id!=='string'||byId.has(row.id))throw Error('Dörrkortet innehåller en ogiltig eller dubblerad rad.');byId.set(row.id,row);}
    const rows=ROWS.map(def=>{const row=byId.get(def.id);if(!row||row.section!==def.section||row.label!==def.label)throw Error('Dörrkortets utrustningsrader stämmer inte med mallen.');return {id:def.id,section:def.section,label:def.label,product:text(row.product,'Produkt',160),quantity:int(row.quantity,'Antal',1,999),delivery:text(row.delivery,'Levereras av',40),installer:text(row.installer,'Monteras av',40)};});
    return {code,meta,rows,note:text(input.note,'Anteckning',2000)};
  }
  function defaultStencil(value){
    const code=normalizeCode(value),symbol=['DA','DS','DADS'].includes(code);
    const productType=code==='DA'?'doorAutomation':code==='DS'?'doorCloser':'none';
    return {id:code,name:code==='DA'?'Dörrautomatik':code==='DS'?'Dörrstängare':code,code,kind:symbol?'symbol':'card',productType,shape:symbol?'square':'oval',fill:symbol?(code==='DS'?'#f3b65d':'#db756c'):'#ffdb5c',stroke:symbol?'#815044':'#97792c',textColor:'#26323b',width:symbol?(code==='DADS'?38:28):Math.max(48,code.length*7+16),height:28,fontSize:11};
  }
  function defaultStencilFor(state,value){
    const stencil=defaultStencil(value),size=normalizedPreferences(state.preferences).doorSize;
    return stencil.kind==='card'&&size?{...stencil,...size}:stencil;
  }
  function normalizedStencil(input){
    if(!isObject(input))throw Error('Stencilen saknas.');
    const code=normalizeCode(input.code),base=defaultStencil(code),stencil={...base,...input};
    if(!['card','symbol'].includes(stencil.kind))throw Error('Välj dörrkort eller symbol som stenciltyp.');
    const productType=Object.hasOwn(input,'productType')?input.productType:stencil.kind==='symbol'?base.productType:'none';
    if(!PRODUCT_TYPES.includes(productType))throw Error('Välj dörrautomatik, dörrstängare eller ingen separat produkt.');
    if(stencil.kind==='card'&&productType!=='none')throw Error('En separat produkt ska vara en dörrstämpel utan dörrkort.');
    if(!['oval','square','rectangle'].includes(stencil.shape))throw Error('Välj oval, fyrkant eller rektangel.');
    const color=(value,label)=>{if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error(label+' måste vara en färg med sex hexadecimala siffror.');return value.toLowerCase();};
    return {id:idValue(stencil.id,'Stencil-ID'),name:text(stencil.name,'Stencilnamn',80,false),code,kind:stencil.kind,productType,shape:stencil.shape,fill:color(stencil.fill,'Fyllnadsfärg'),stroke:color(stencil.stroke,'Kantfärg'),textColor:color(stencil.textColor,'Textfärg'),width:num(stencil.width,'Stämpelbredd',6,500),height:num(stencil.height,'Stämpelhöjd',6,500),fontSize:num(stencil.fontSize,'Textstorlek',4,72)};
  }
  function stencilProductType(stencil){
    if(stencil?.kind!=='symbol')return 'none';
    return stencil.productType??(stencil.code==='DA'?'doorAutomation':stencil.code==='DS'?'doorCloser':'none');
  }
  function stencilLabel(stencil){
    const productType=stencilProductType(stencil);
    return productType==='doorAutomation'?'Dörrautomatik':productType==='doorCloser'?'Dörrstängare':stencil?.kind==='card'?'Dörrstämpel med dörrkort':'Dörrstämpel utan dörrkort';
  }
  function placementCounts(state){
    const counts={markings:state.placements.length,cards:Object.keys(state.cards).length,doorAutomation:0,doorCloser:0};
    for(const placement of state.placements){const type=stencilProductType(state.stencils[placement.stencilId]);if(type==='doorAutomation'||type==='doorCloser')counts[type]++;}
    return counts;
  }
  function normalizedPage(input){
    if(!isObject(input))throw Error('En ritningssida är ogiltig.');
    const width=num(input.width,'Sidbredd',1,100000),height=num(input.height,'Sidhöjd',1,100000),rotation=angle(input.rotation??0);
    if(rotation%90!==0)throw Error('PDF-sidans rotation måste vara 0, 90, 180 eller 270 grader.');
    if(!Array.isArray(input.view)||input.view.length!==4||input.view.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('PDF-sidans utsnitt är ogiltigt.');
    const view=input.view.slice();if(view[2]<=view[0]||view[3]<=view[1])throw Error('PDF-sidans utsnitt måste ha en positiv storlek.');
    if(!Array.isArray(input.transform)||input.transform.length!==6||input.transform.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('PDF-sidans koordinatmatris är ogiltig.');
    const transform=input.transform.slice();if(Math.abs(transform[0]*transform[3]-transform[1]*transform[2])<1e-12)throw Error('PDF-sidans koordinatmatris kan inte användas.');
    return {width,height,rotation,view,transform};
  }
  function normalizedPlacement(input,state){
    if(!isObject(input))throw Error('En stämpelposition är ogiltig.');
    const id=idValue(input.id,'Positions-ID'),page=int(input.page,'Sida',1,state.drawing.pages.length),stencilId=idValue(input.stencilId,'Stencil-ID'),stencil=state.stencils[stencilId];
    if(!stencil)throw Error('Positionen saknar en stencil.');
    const code=normalizeCode(input.code);if(code!==stencil.code)throw Error('Positionens beteckning stämmer inte med stencilen.');
    if(stencil.kind==='card'&&!Object.hasOwn(state.cards,code))throw Error('Positionen saknar dörrkort för '+code+'.');
    const value={id,page,code,stencilId,x:num(input.x,'Vågrät position',0,1),y:num(input.y,'Lodrät position',0,1),width:num(input.width,'Stämpelbredd',6,500),height:num(input.height,'Stämpelhöjd',6,500),rotation:angle(input.rotation??0),locked:input.locked,note:text(input.note??'','Positionsanteckning',1000)};
    if(typeof value.locked!=='boolean')throw Error('Positionens låsning är ogiltig.');
    const sheet=state.drawing.pages[page-1],r=value.rotation*Math.PI/180,halfX=Math.abs(Math.cos(r))*value.width/2+Math.abs(Math.sin(r))*value.height/2,halfY=Math.abs(Math.sin(r))*value.width/2+Math.abs(Math.cos(r))*value.height/2,px=value.x*sheet.width,py=value.y*sheet.height,epsilon=1e-6;
    if(px-halfX< -epsilon||px+halfX>sheet.width+epsilon||py-halfY< -epsilon||py+halfY>sheet.height+epsilon)throw Error('Stämpeln vid '+id+' hamnar utanför ritningssidan. Flytta den längre från kanten eller minska storleken.');
    return value;
  }
  function normalizedProduct(input){
    if(!isObject(input))throw Error('Produkten saknas.');
    const category=text(input.category,'Produktgrupp',40,false);if(!CATEGORIES.has(category))throw Error('Välj en känd produktgrupp.');
    return {id:idValue(input.id,'Produkt-ID'),name:text(input.name,'Produktnamn',160,false),category,description:text(input.description??'','Produktbeskrivning',400)};
  }
  function validate(raw){
    if(!isObject(raw)||raw.schema!==2)throw Error('Filen är inte ett projekteringsprojekt av version 2.');
    if(!isObject(raw.project))throw Error('Projektuppgifter saknas.');
    const project={id:idValue(raw.project.id,'Projekt-ID'),name:text(raw.project.name,'Projektnamn',120,false),revision:int(raw.project.revision,'Revision',1,1000000000),updatedAt:text(raw.project.updatedAt,'Sparad tid',40,false)};
    if(!/^\d{4}-\d{2}-\d{2}T/.test(project.updatedAt)||!Number.isFinite(Date.parse(project.updatedAt)))throw Error('Projektets sparade tid är ogiltig.');
    if(!isObject(raw.drawing)||!Array.isArray(raw.drawing.pages)||raw.drawing.pages.length>LIMITS.pages)throw Error('Ritningen får innehålla högst '+LIMITS.pages+' sidor.');
    const drawing={name:text(raw.drawing.name,'Ritningsnamn',240),pages:raw.drawing.pages.map(normalizedPage)};
    if(!isObject(raw.cards)||Object.keys(raw.cards).length>LIMITS.cards)throw Error('Projektet får innehålla högst '+LIMITS.cards+' dörrkort.');
    const cards={},identity=new Map();
    for(const [key,value] of Object.entries(raw.cards)){const code=normalizeCode(key);if(key!==code||Object.hasOwn(cards,code))throw Error('Ett dörrkort har en ogiltig eller dubblerad beteckning.');const match=matchKey(code);if(identity.has(match)&&identity.get(match)!==code)throw Error('Två dörrkort får samma beteckning vid avläsning.');identity.set(match,code);cards[code]=normalizedCard(value,code);}
    if(!isObject(raw.stencils)||Object.keys(raw.stencils).length>LIMITS.stencils)throw Error('Projektet får innehålla högst '+LIMITS.stencils+' stenciler.');
    const stencils={},stencilCodes=new Set();
    for(const [key,value] of Object.entries(raw.stencils)){const stencil=normalizedStencil(value);if(key!==stencil.id||Object.hasOwn(stencils,key))throw Error('En stencil har ett ogiltigt eller dubblerat ID.');if(stencilCodes.has(stencil.code))throw Error('En stencil med beteckningen '+stencil.code+' finns redan.');const match=matchKey(stencil.code);if(identity.has(match)&&identity.get(match)!==stencil.code)throw Error(stencil.code+' kan förväxlas med '+identity.get(match)+' vid avläsning.');identity.set(match,stencil.code);if(stencil.kind==='symbol'&&Object.hasOwn(cards,stencil.code))throw Error(stencil.code+' är en symbol och kan inte samtidigt vara ett dörrkort.');stencilCodes.add(stencil.code);stencils[key]=stencil;}
    if(!Array.isArray(raw.placements)||raw.placements.length>LIMITS.placements)throw Error('Projektet får innehålla högst '+LIMITS.placements+' stämpelpositioner.');
    const result={schema:2,project,drawing,cards,stencils,placements:[],customProducts:[],preferences:normalizedPreferences(raw.preferences)},positions=new Set();
    for(const value of raw.placements){const place=normalizedPlacement(value,result);if(positions.has(place.id))throw Error('Ritningen innehåller dubblerade positions-ID.');positions.add(place.id);result.placements.push(place);}
    if(!Array.isArray(raw.customProducts)||raw.customProducts.length>LIMITS.customProducts)throw Error('Projektets produktlista är ogiltig.');
    const productIds=new Set(PRODUCTS.map(p=>p.id));
    result.customProducts=raw.customProducts.map(value=>{const product=normalizedProduct(value);if(productIds.has(product.id))throw Error('Produktens ID används redan.');productIds.add(product.id);return product;});
    return result;
  }
  function createEmpty(name='Nytt projekt'){
    const codes=Array.from({length:100},(_,i)=>'GS'+(i+1)).concat(SPECIAL_CODES),stencils=Object.fromEntries(codes.map(code=>[code,defaultStencil(code)]));
    return validate({schema:2,project:{id:uid('projekt'),name,revision:1,updatedAt:now()},drawing:{name:'',pages:[]},cards:{},stencils,placements:[],customProducts:[]});
  }
  function assertCardIdentity(state,code){
    const conflict=Object.keys(state.cards).concat(Object.values(state.stencils).map(s=>s.code)).find(other=>other!==code&&matchKey(other)===matchKey(code));
    if(conflict)throw Error(code+' kan förväxlas med '+conflict+' vid avläsning.');
    if(Object.values(state.stencils).some(s=>s.code===code&&s.kind==='symbol'))throw Error(code+' används som symbol. Välj en dörrkortsbeteckning.');
  }
  function ensureCard(state,value){const code=normalizeCode(value);if(Object.hasOwn(state.cards,code))return state.cards[code];return transact(state,next=>{assertCardIdentity(next,code);next.cards[code]=createCard(code);},clean=>clean.cards[code]);}
  function updateCard(state,value,card){const code=normalizeCode(value),clean=normalizedCard(card,code);return transact(state,next=>{assertCardIdentity(next,code);next.cards[code]=clean;},next=>next.cards[code]);}
  function copyCard(state,fromValue,toValue){const from=normalizeCode(fromValue),to=normalizeCode(toValue);if(!Object.hasOwn(state.cards,from))throw Error('Dörrkortet som ska kopieras saknas.');if(Object.hasOwn(state.cards,to))throw Error('Ett dörrkort med beteckningen '+to+' finns redan.');return transact(state,next=>{assertCardIdentity(next,to);next.cards[to]={...clone(next.cards[from]),code:to,meta:{...next.cards[from].meta,littera:to}};},next=>next.cards[to]);}
  function removeCard(state,value,options={}){const code=normalizeCode(value);if(!Object.hasOwn(state.cards,code))throw Error('Dörrkortet finns inte.');return transact(state,next=>{const used=next.placements.filter(p=>p.code===code);if(used.length&&!options.cascade)throw Error('Dörrkortet används av '+used.length+' positioner. Ta bort positionerna först eller bekräfta att de också ska tas bort.');if(used.some(p=>p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>p.code!==code);delete next.cards[code];});}
  function addStencil(state,input){const stencil=normalizedStencil(input);if(Object.hasOwn(state.stencils,stencil.id))throw Error('Stencilens ID används redan.');return transact(state,next=>{next.stencils[stencil.id]=stencil;},next=>next.stencils[stencil.id]);}
  function updateStencil(state,id,patch){id=idValue(id,'Stencil-ID');if(!Object.hasOwn(state.stencils,id))throw Error('Stencilen finns inte.');const old=state.stencils[id];if((Object.hasOwn(patch,'id')&&patch.id!==id)||(Object.hasOwn(patch,'code')&&normalizeCode(patch.code)!==old.code))throw Error('Skapa en ny stencil för en ny beteckning.');return transact(state,next=>{next.stencils[id]=normalizedStencil({...next.stencils[id],...patch,id,code:old.code});},next=>next.stencils[id]);}
  function removeStencil(state,id,options={}){id=idValue(id,'Stencil-ID');if(!Object.hasOwn(state.stencils,id))throw Error('Stencilen finns inte.');return transact(state,next=>{const used=next.placements.filter(p=>p.stencilId===id);if(used.length&&!options.cascade)throw Error('Stencilen används på ritningen. Ta bort positionerna först eller bekräfta att de också ska tas bort.');if(used.some(p=>p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>p.stencilId!==id);delete next.stencils[id];});}
  function addPlacement(state,input){if(!isObject(input))throw Error('Placeringen saknas.');const stencil=state.stencils[input.stencilId];if(!stencil)throw Error('Välj en stencil som finns i projektet.');const id=input.id?idValue(input.id,'Positions-ID'):uid('pos');return transact(state,next=>{if(stencil.kind==='card'&&!Object.hasOwn(next.cards,stencil.code))next.cards[stencil.code]=createCard(stencil.code);next.placements.push({id,page:input.page,code:stencil.code,stencilId:stencil.id,x:input.x,y:input.y,width:input.width??stencil.width,height:input.height??stencil.height,rotation:input.rotation??0,locked:input.locked??false,note:input.note??''});},next=>next.placements.find(p=>p.id===id));}
  function updatePlacement(state,id,patch){id=idValue(id,'Positions-ID');const old=state.placements.find(p=>p.id===id);if(!old)throw Error('Positionen finns inte.');if(!isObject(patch))throw Error('Ändringen är ogiltig.');if(Object.hasOwn(patch,'id')&&patch.id!==id)throw Error('Positionens ID får inte ändras.');if(old.locked&&Object.entries(patch).some(([key,value])=>key!=='locked'&&value!==old[key]))throw Error('Positionen är låst. Lås upp den före ändring.');return transact(state,next=>{const index=next.placements.findIndex(p=>p.id===id),stencilId=patch.stencilId??old.stencilId,stencil=next.stencils[stencilId];if(!stencil)throw Error('Stencilen finns inte.');if(Object.hasOwn(patch,'code')&&normalizeCode(patch.code)!==stencil.code)throw Error('Välj en stencil med den nya beteckningen.');if(stencil.kind==='card'&&!Object.hasOwn(next.cards,stencil.code))next.cards[stencil.code]=createCard(stencil.code);next.placements[index]={...next.placements[index],...patch,id,stencilId,code:stencil.code};},next=>next.placements.find(p=>p.id===id));}
  function removePlacements(state,ids){if(!Array.isArray(ids))throw Error('Välj positioner att ta bort.');const selected=new Set(ids.map(id=>idValue(id,'Positions-ID')));return transact(state,next=>{if(next.placements.some(p=>selected.has(p.id)&&p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>!selected.has(p.id));});}
  function duplicatePlacements(state,ids,options={}){if(!Array.isArray(ids))throw Error('Välj positioner att kopiera.');const selected=new Set(ids.map(id=>idValue(id,'Positions-ID'))),sources=state.placements.filter(p=>selected.has(p.id));if(!sources.length)throw Error('Välj minst en position att kopiera.');const dx=options.dx??.015,dy=options.dy??.015;num(dx,'Vågrät förskjutning',-1,1);num(dy,'Lodrät förskjutning',-1,1);const newIds=sources.map(()=>uid('pos'));return transact(state,next=>{sources.forEach((source,index)=>next.placements.push({...clone(source),id:newIds[index],page:options.page??source.page,x:source.x+dx,y:source.y+dy,locked:false}));},next=>newIds.map(id=>next.placements.find(p=>p.id===id)));}
  function listStencils(state){return Object.values(state.stencils).map(s=>clone(s)).sort((a,b)=>natural.compare(a.code,b.code));}
  const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function searchProducts(state,category,query=''){const needles=fold(query).trim().split(/\s+/).filter(Boolean);return PRODUCTS.concat(state.customProducts).filter(p=>(!category||category==='all'||p.category===category)&&needles.every(n=>fold(p.name+' '+p.description+' '+p.id).includes(n))).sort((a,b)=>natural.compare(a.name,b.name)).map(p=>clone(p));}
  function addProduct(state,input){const product=normalizedProduct({...input,id:input.id||uid('custom')});return transact(state,next=>{next.customProducts.push(product);},next=>next.customProducts.find(p=>p.id===product.id));}

  function setPreferences(state,patch){
    if(!isObject(patch))throw Error('Inställningarna är ogiltiga.');
    const preferences=normalizedPreferences({...normalizedPreferences(state.preferences),...patch});
    return transact(state,next=>{next.preferences=preferences;});
  }
  function resizeScope(state,stencil,options={}){
    if(!isObject(options))throw Error('Storleksinställningen är ogiltig.');
    const scope=options.scope??normalizedPreferences(state.preferences).sizeScope;
    if(!SIZE_SCOPES.includes(scope))throw Error('Välj storlek för alla dörrstämplar, samma beteckning eller en stämpel.');
    return scope==='doors'&&stencil.kind!=='card'?'code':scope;
  }
  // Read-only targets include all pages. A caller may use these same absolute sizes for its preview.
  function resizeTargets(state,placementId,options={}){
    const id=idValue(placementId,'Positions-ID'),reference=state.placements.find(p=>p.id===id);
    if(!reference)throw Error('Positionen finns inte.');
    const stencil=state.stencils[reference.stencilId],scope=resizeScope(state,stencil,options);
    if(scope==='single')return [reference];
    return state.placements.filter(p=>scope==='doors'?state.stencils[p.stencilId].kind==='card':p.stencilId===reference.stencilId);
  }
  function resizedDimensions(width,height){return {width:num(width,'Stämpelbredd',6,500),height:num(height,'Stämpelhöjd',6,500)};}
  function applySharedSize(next,stencilId,size,scope,targets){
    if(targets.some(p=>p.locked&&(p.width!==size.width||p.height!==size.height)))throw Error('En stämpel som ska ändra storlek är låst. Lås upp den före storleksändringen.');
    for(const placement of targets)Object.assign(placement,size);
    if(scope==='doors'){
      for(const stencil of Object.values(next.stencils))if(stencil.kind==='card')Object.assign(stencil,size);
      next.preferences={...normalizedPreferences(next.preferences),doorSize:{...size}};
    }else if(scope==='code')Object.assign(next.stencils[stencilId],size);
    // transact validates rotated bounds for every placement before committing any changes.
  }
  function resizeShared(state,placementId,width,height,options={}){
    const id=idValue(placementId,'Positions-ID'),reference=state.placements.find(p=>p.id===id);
    if(!reference)throw Error('Positionen finns inte.');
    const size=resizedDimensions(width,height),scope=resizeScope(state,state.stencils[reference.stencilId],options);
    return transact(state,next=>applySharedSize(next,reference.stencilId,size,scope,resizeTargets(next,id,{scope})));
  }
  function resizeStencilShared(state,stencilId,width,height,options={}){
    const id=idValue(stencilId,'Stencil-ID'),stencil=state.stencils[id];
    if(!stencil)throw Error('Stencilen finns inte.');
    const size=resizedDimensions(width,height),scope=resizeScope(state,stencil,options);
    return transact(state,next=>{
      const targets=scope==='single'?[]:next.placements.filter(p=>scope==='doors'?next.stencils[p.stencilId].kind==='card':p.stencilId===id);
      applySharedSize(next,id,size,scope,targets);
      if(scope==='single')Object.assign(next.stencils[id],size);
    });
  }
  function placementBounds(placement,sheet){
    const r=placement.rotation*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),width=c*placement.width+s*placement.height,height=s*placement.width+c*placement.height,cx=placement.x*sheet.width,cy=placement.y*sheet.height;
    return {placement,cx,cy,width,height,left:cx-width/2,right:cx+width/2,top:cy-height/2,bottom:cy+height/2};
  }
  function alignPlacements(state,ids,mode){
    const modes=['left','centerX','right','top','centerY','bottom','distributeX','distributeY'];
    if(!modes.includes(mode))throw Error('Välj en giltig justering.');
    if(!Array.isArray(ids))throw Error('Välj stämplar att justera.');
    const selected=new Set(ids.map(id=>idValue(id,'Positions-ID'))),placements=state.placements.filter(p=>selected.has(p.id));
    if(placements.length!==selected.size)throw Error('En vald position finns inte.');
    if(placements.length<(mode.startsWith('distribute')?3:2))throw Error(mode.startsWith('distribute')?'Välj minst tre stämplar att fördela.':'Välj minst två stämplar att justera.');
    if(placements.some(p=>p.page!==placements[0].page))throw Error('Välj stämplar på samma ritningssida.');
    if(placements.some(p=>p.locked))throw Error('Lås upp de valda stämplarna före justering.');
    return transact(state,next=>{
      const sheet=next.drawing.pages[placements[0].page-1],bounds=next.placements.filter(p=>selected.has(p.id)).map(p=>placementBounds(p,sheet));
      const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right)),top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
      if(mode==='distributeX'||mode==='distributeY'){
        const horizontal=mode==='distributeX',start=horizontal?left:top,end=horizontal?right:bottom,extent=horizontal?'width':'height',leading=horizontal?'left':'top',coordinate=horizontal?'x':'y',pageExtent=horizontal?sheet.width:sheet.height;
        bounds.sort((a,b)=>a[leading]-b[leading]||a.placement.id.localeCompare(b.placement.id));
        const gap=(end-start-bounds.reduce((sum,b)=>sum+b[extent],0))/(bounds.length-1);let cursor=start;
        for(const b of bounds){b.placement[coordinate]=(cursor+b[extent]/2)/pageExtent;cursor+=b[extent]+gap;}
      }else{
        for(const b of bounds){
          if(mode==='left')b.placement.x=(left+b.width/2)/sheet.width;
          if(mode==='centerX')b.placement.x=(left+right)/2/sheet.width;
          if(mode==='right')b.placement.x=(right-b.width/2)/sheet.width;
          if(mode==='top')b.placement.y=(top+b.height/2)/sheet.height;
          if(mode==='centerY')b.placement.y=(top+bottom)/2/sheet.height;
          if(mode==='bottom')b.placement.y=(bottom-b.height/2)/sheet.height;
        }
      }
    });
  }

  return Object.freeze({LIMITS,META_KEYS,SPECIAL_CODES,SECTIONS,PRODUCTS,OWNER_VALUES,TOOLBAR_TOOLS,SIZE_SCOPES,PRODUCT_TYPES,PRODUCT_TYPE_LABELS,defaultPreferences,normalizeCode,matchKey,clone,createEmpty,createCard,validate,defaultStencil,defaultStencilFor,stencilLabel,placementCounts,listStencils,searchProducts,addProduct,ensureCard,updateCard,copyCard,removeCard,addStencil,updateStencil,removeStencil,addPlacement,updatePlacement,removePlacements,duplicatePlacements,setPreferences,resizeTargets,resizeShared,resizeStencilShared,alignPlacements});
});

