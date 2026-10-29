/* Tillsyno Projektering 2.19. Product register with preserved project choices. */
(function(root,factory){
 'use strict'; const api=factory(typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-annotations.js'):root.Proj2Annotations,typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-catalog.js'):root.Proj2Catalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Data=api;
})(typeof window==='object'?window:globalThis,function(Annotations,Catalog){
 'use strict'; const AUTOMATION_MODELS=typeof module==='object'&&module.exports?require('./smartmatch-automation-models-v512.js'):globalThis.Proj2AutomationModels;
 const LIMITS=Object.freeze({cards:500,placements:5000,pages:200,stencils:2000,customProducts:1000,materialTimes:20000});
 const META_KEYS=Object.freeze(['littera','hanging','doorType','fire','security','escape','reentry']);
 const SPECIAL_CODES=Object.freeze(['WC','HWC','DBL','DA','DS','KL','DFS']);
 const TOOLBAR_TOOLS=Object.freeze(['toolPan','toolErase','undo','redo','duplicateSelection','deleteSelection','lockSelection','newStencilTool','newCardTool','rotateLeft','rotateRight','selectAllTool']);
 const DEFAULT_TOOLBAR_TOOLS=Object.freeze(['undo','redo','duplicateSelection','deleteSelection','newStencilTool','newCardTool','rotateLeft','rotateRight']);
 const PRODUCT_TYPES=Object.freeze(['none','doorAutomation','doorCloser','cardReader','elbowContact','other']);
 const PRODUCT_TYPE_LABELS=Object.freeze({none:'Ingen separat produkt',doorAutomation:'Dörrautomatik',doorCloser:'Dörrstängare',cardReader:'Kortläsare',elbowContact:'Armbågskontakt',other:'Övrig produkt'});
 const CATEGORY_DEFAULTS=Object.freeze(['Dörrkort','Dörrautomatik','Dörrstängare','Kortläsare','DFS','Armbågskontakter','Övrigt']);
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
    ] },
    { title: 'Övriga tillbehör', rows: [
      ['extra-battery', 'Batteri / backup', 'battery'],
      ['extra-hold-open-magnet', 'Dörrhållarmagnet', 'hold-open-magnet'],
      ['extra-door-stop', 'Dörrstopp / porthållare', 'door-stop'],
      ['extra-door-puller', 'Dörrtillslutare', 'door-puller'],
      ['extra-preparation', 'Arbetsmoment: förberedelse nattlås', 'preparation'],
      ['extra-microswitch', 'Mikrobrytare', 'microswitch'],
      ['extra-key', 'Nyckel', 'key'],
      ['extra-program-selector', 'Programväljare', 'program-selector'],
      ['extra-sliding-sensor', 'Skjutdörrssensor', 'sliding-sensor'],
      ['extra-espagnolette', 'Spanjolett', 'espagnolette'],
      ['extra-power-supply', 'Strömförsörjning', 'power-supply'],
      ['extra-hold-open-accessory', 'Uppställningstillbehör', 'hold-open-accessory'],
      ['extra-opening-radar', 'Öppningsradar', 'opening-radar']
    ] }
  ].map(section => Object.freeze({
    title: section.title,
    rows: Object.freeze(section.rows.map(([id, label, category]) => Object.freeze({ id, label, category })))
  }));
  Object.freeze(SECTIONS);
  const ROWS = SECTIONS.flatMap(section => section.rows.map(row => ({ ...row, section: section.title })));
  const LEGACY_ROWS=ROWS.filter(row=>row.section!=='Övriga tillbehör');
  const CATEGORIES = new Set(ROWS.map(row => row.category));

  // Model-only defaults ship with the app; project and personal choices remain separate.
  const PREVIOUS_PRODUCTS = Object.freeze([
  {
    "id": "copiax-modell-lock-f06cc90270f009a9",
    "name": "310-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-de51cec3ac50185e",
    "name": "411-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-f0c4a850a132eef1",
    "name": "411-50 MA",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-ebddad96aff7c3b8",
    "name": "511-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-b614c547fa3ba378",
    "name": "565-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-f9931cf14337a388",
    "name": "2002-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-1291d1422e403113",
    "name": "EL580",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-6da67c58e8d2db17",
    "name": "SL620",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-lock-90bf5915494397b6",
    "name": "ST110",
    "category": "lock",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-fittings-05774a019aaafbea",
    "name": "256",
    "category": "cylinder-fittings",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-fittings-78c1ebbee6c7c2fd",
    "name": "3212",
    "category": "cylinder-fittings",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-fittings-95e081eb3f3c0b4b",
    "name": "3212:2",
    "category": "cylinder-fittings",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-fittings-71d28b65bf77d551",
    "name": "4265",
    "category": "cylinder-fittings",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-9a919f5be32d9cf5",
    "name": "575",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-39e5a426fb1192b3",
    "name": "1487-1",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-b3ed99c59c8e1402",
    "name": "1487-2",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-ddc5ae2c2ba0fe64",
    "name": "ES17",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-2c6464079bcbfa80",
    "name": "STEP 40",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-strike-0cb0e6768d2e61c3",
    "name": "STEP 90",
    "category": "strike",
    "description": ""
  },
  {
    "id": "copiax-modell-handle-45d6177aa6b330d5",
    "name": "696",
    "category": "handle",
    "description": ""
  },
  {
    "id": "copiax-modell-handle-378a19edc36db47f",
    "name": "6696",
    "category": "handle",
    "description": ""
  },
  {
    "id": "copiax-modell-handle-e2b410a8ad3935b4",
    "name": "DH 7020",
    "category": "handle",
    "description": ""
  },
  {
    "id": "copiax-modell-handle-e05d295327508685",
    "name": "DH 8020",
    "category": "handle",
    "description": ""
  },
  {
    "id": "copiax-modell-pull-688e0781313760a1",
    "name": "8633",
    "category": "pull",
    "description": ""
  },
  {
    "id": "copiax-modell-pull-cc0630aee2a472f7",
    "name": "PP-604",
    "category": "pull",
    "description": ""
  },
  {
    "id": "copiax-modell-pull-d599f4c3dc2d387c",
    "name": "Slug 17",
    "category": "pull",
    "description": ""
  },
  {
    "id": "copiax-modell-escape-9d22ac7f34c01993",
    "name": "179A",
    "category": "escape",
    "description": ""
  },
  {
    "id": "copiax-modell-escape-afedf11c190c819e",
    "name": "179G",
    "category": "escape",
    "description": ""
  },
  {
    "id": "copiax-modell-escape-b82870ed3f1f32e9",
    "name": "179G-2",
    "category": "escape",
    "description": ""
  },
  {
    "id": "copiax-modell-escape-6496424400f48baa",
    "name": "ST17910",
    "category": "escape",
    "description": ""
  },
  {
    "id": "copiax-modell-cable-d14ad213d14d0b1c",
    "name": "EA280",
    "category": "cable",
    "description": ""
  },
  {
    "id": "copiax-modell-cable-4b16b7c61823080a",
    "name": "EA281",
    "category": "cable",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-a369a951b419fca2",
    "name": "03",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-84d63347c529b69d",
    "name": "13",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-7bc561ff67d9493c",
    "name": "1201",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-98b65d390714a616",
    "name": "1211",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-f68a6fd99bd68cd6",
    "name": "1212",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-cylinder-de700a6f725b0db1",
    "name": "1301",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-188bd6dc4ec218e1",
    "name": "DC300",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-ff10e8c55bb54c27",
    "name": "DC500",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-bf6d5a793ae720fd",
    "name": "DC700",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-51519eff039959e3",
    "name": "TS83",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-8065aba8b3ef10a0",
    "name": "TS93 B",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-c96fc872089df52d",
    "name": "TS4000",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-5ae51c2c6b344cba",
    "name": "TS5000",
    "category": "closer",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-e94bb92b4612f120",
    "name": "4000",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-a89b355a6b55a100",
    "name": "CL-N",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-64ce0985e993a352",
    "name": "G93N",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-8be9b88ae959be19",
    "name": "G195",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-45ab03e86d7ff095",
    "name": "L190",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-972fea1827ab3ab7",
    "name": "L191",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-closer-arm-adc5be10bd60a2f0",
    "name": "TS5000 ECline",
    "category": "closer-arm",
    "description": ""
  },
  {
    "id": "copiax-modell-operator-b9ac58cd261369af",
    "name": "ED100LE",
    "category": "operator",
    "description": ""
  },
  {
    "id": "copiax-modell-operator-80a48e243a14c640",
    "name": "ED250LE",
    "category": "operator",
    "description": ""
  },
  {
    "id": "copiax-modell-operator-f83b66d0e83501c4",
    "name": "SW100",
    "category": "operator",
    "description": ""
  },
  {
    "id": "copiax-modell-operator-e835c89f157a58a3",
    "name": "SW200",
    "category": "operator",
    "description": ""
  },
  {
    "id": "copiax-modell-operator-a135444b3aaa0393",
    "name": "SW300",
    "category": "operator",
    "description": ""
  },
  {
    "id": "copiax-modell-sensor-95ee09c6451462d3",
    "name": "4SAFE",
    "category": "sensor",
    "description": ""
  },
  {
    "id": "copiax-modell-sensor-3903b342924b8690",
    "name": "FLATSCAN 3D",
    "category": "sensor",
    "description": ""
  },
  {
    "id": "copiax-modell-sensor-fbc9be46d9b3a9fb",
    "name": "FLATSCAN SW",
    "category": "sensor",
    "description": ""
  },
  {
    "id": "copiax-modell-sensor-14b31d41bfdace04",
    "name": "SSS-5S1LED",
    "category": "sensor",
    "description": ""
  },
  {
    "id": "copiax-modell-sensor-53b3ad1a165d1cfa",
    "name": "UniScan",
    "category": "sensor",
    "description": ""
  },
  {
    "id": "copiax-modell-activation-9ae24d71fa0116f9",
    "name": "JCK207",
    "category": "activation",
    "description": ""
  },
  {
    "id": "copiax-modell-activation-63d8ea56de4c4b10",
    "name": "JCK217",
    "category": "activation",
    "description": ""
  },
  {
    "id": "copiax-modell-activation-1baf30923f6a0b62",
    "name": "KT 3-1",
    "category": "activation",
    "description": ""
  },
  {
    "id": "copiax-modell-activation-e4f6d3b90d08833d",
    "name": "PB1",
    "category": "activation",
    "description": ""
  },
  {
    "id": "copiax-modell-coordinator-40668181d72e72e2",
    "name": "25 DK",
    "category": "coordinator",
    "description": ""
  },
  {
    "id": "copiax-modell-coordinator-a4126d7b2294dad5",
    "name": "30 DK",
    "category": "coordinator",
    "description": ""
  },
  {
    "id": "copiax-modell-coordinator-87def0598225e8fd",
    "name": "SR 390",
    "category": "coordinator",
    "description": ""
  },
  {
    "id": "copiax-modell-coordinator-4d91bcc6575711a1",
    "name": "SR392/1",
    "category": "coordinator",
    "description": ""
  },
  {
    "id": "copiax-modell-bolt-c49d37a578021cd4",
    "name": "1396",
    "category": "bolt",
    "description": ""
  },
  {
    "id": "copiax-modell-bolt-4283c66c9bcf335f",
    "name": "2396",
    "category": "bolt",
    "description": ""
  },
  {
    "id": "copiax-modell-bolt-d09f37d379ef1af6",
    "name": "STEP 21",
    "category": "bolt",
    "description": ""
  },
  {
    "id": "copiax-modell-magnet-f43500f3dd63b0c9",
    "name": "DC1076",
    "category": "magnet",
    "description": ""
  },
  {
    "id": "copiax-modell-magnet-f2e196893e246251",
    "name": "MC240",
    "category": "magnet",
    "description": ""
  },
  {
    "id": "copiax-modell-magnet-8773e57970bc3893",
    "name": "MC347",
    "category": "magnet",
    "description": ""
  },
  {
    "id": "copiax-modell-reader-52d73542ad985db9",
    "name": "A73",
    "category": "reader",
    "description": ""
  },
  {
    "id": "copiax-modell-reader-b0295dcabd544736",
    "name": "KPROX",
    "category": "reader",
    "description": ""
  },
  {
    "id": "copiax-modell-reader-97f067f10b3bfaa0",
    "name": "VR40S-MF",
    "category": "reader",
    "description": ""
  },
  {
    "id": "copiax-modell-controller-15e9e42f552f67b0",
    "name": "B18",
    "category": "controller",
    "description": ""
  },
  {
    "id": "copiax-modell-controller-63648df1cfc99639",
    "name": "B28",
    "category": "controller",
    "description": ""
  },
  {
    "id": "copiax-modell-controller-d59a28309d3fa084",
    "name": "Koppla 2100",
    "category": "controller",
    "description": ""
  },
  {
    "id": "lock-st140-50",
    "name": "ST140-50",
    "category": "lock",
    "description": ""
  },
  {
    "id": "escape-17963",
    "name": "17963",
    "category": "escape",
    "description": ""
  },
  {
    "id": "cylinder-8882",
    "name": "8882",
    "category": "cylinder",
    "description": ""
  },
  {
    "id": "magnet-dc107",
    "name": "DC107",
    "category": "magnet",
    "description": ""
  }
].map(value=>Object.freeze(value)));
  // Keep existing IDs for matching models so saved hides and personal overrides
  // remain effective when the bundled register adds more short product names.
  const productNameKey=value=>value.category+':'+(Catalog?.canonicalName?Catalog.canonicalName(value.category,value.name):value.name).normalize('NFKC').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
  const bundledNames=new Set(PREVIOUS_PRODUCTS.map(productNameKey));
  const bundledIds=new Set(PREVIOUS_PRODUCTS.map(value=>value.id));
  const addedProducts=[];
  for(const value of Catalog?.products||[]){
    if(!CATEGORIES.has(value.category)||bundledNames.has(productNameKey(value))||bundledIds.has(value.id))continue;
    const product=Object.freeze({id:value.id,name:value.name,category:value.category,description:''});
    addedProducts.push(product);bundledNames.add(productNameKey(product));bundledIds.add(product.id);
  }
  const RETIRED_MISCLASSIFIED=Object.freeze(PREVIOUS_PRODUCTS.filter(value=>value.id==='copiax-modell-closer-arm-adc5be10bd60a2f0'&&value.name==='TS5000 ECline'&&value.category==='closer-arm'&&value.description===''));
  const PRODUCTS=Object.freeze(PREVIOUS_PRODUCTS.filter(value=>!RETIRED_MISCLASSIFIED.includes(value)).concat(addedProducts));
  // Exact historical snapshots distinguish shipped examples from user edits.
  const LEGACY_PRODUCTS = Object.freeze([
  {
    "id": "lock-st140-50",
    "name": "ST140-50",
    "category": "lock",
    "description": "Exempel på låshus för daglåsning."
  },
  {
    "id": "lock-511-50",
    "name": "511-50",
    "category": "lock",
    "description": "Exempel på låshus för nattlåsning."
  },
  {
    "id": "lock-demo-el",
    "name": "EL-LÅS DEMO",
    "category": "lock",
    "description": "Fiktivt ellås för att prova produktsökningen."
  },
  {
    "id": "fittings-256",
    "name": "256",
    "category": "cylinder-fittings",
    "description": "Exempel på cylinderbehör."
  },
  {
    "id": "fittings-4265",
    "name": "4265",
    "category": "cylinder-fittings",
    "description": "Exempel på cylinderbehör."
  },
  {
    "id": "strike-std",
    "name": "Slutbleck std",
    "category": "strike",
    "description": "Exempel på standardslutbleck."
  },
  {
    "id": "strike-el-demo",
    "name": "EL-SLUTBLECK DEMO",
    "category": "strike",
    "description": "Fiktivt elslutbleck."
  },
  {
    "id": "handle-demo",
    "name": "Trycke DEMO 01",
    "category": "handle",
    "description": "Fiktivt trycke."
  },
  {
    "id": "handle-demo-02",
    "name": "Trycke DEMO 02",
    "category": "handle",
    "description": "Fiktivt trycke med annan utformning."
  },
  {
    "id": "pull-demo",
    "name": "Draghandtag DEMO",
    "category": "pull",
    "description": "Fiktivt draghandtag."
  },
  {
    "id": "escape-17963",
    "name": "17963",
    "category": "escape",
    "description": "Exempel på utrymningsbehör."
  },
  {
    "id": "cable-ea281",
    "name": "EA281",
    "category": "cable",
    "description": "Exempel på kabelöverföring."
  },
  {
    "id": "cylinder-8882",
    "name": "8882",
    "category": "cylinder",
    "description": "Exempel på cylinder."
  },
  {
    "id": "cylinder-demo-thumb",
    "name": "Cylinder/vred DEMO",
    "category": "cylinder",
    "description": "Fiktiv cylinder med vred."
  },
  {
    "id": "cylinder-demo",
    "name": "Cylinder DEMO",
    "category": "cylinder",
    "description": "Fiktiv cylinder."
  },
  {
    "id": "closer-demo",
    "name": "Dörrstängare DEMO",
    "category": "closer",
    "description": "Fiktiv dörrstängare."
  },
  {
    "id": "arm-demo",
    "name": "Glidarm DEMO",
    "category": "closer-arm",
    "description": "Fiktiv dörrstängningsarm."
  },
  {
    "id": "operator-sw300",
    "name": "SW300",
    "category": "operator",
    "description": "Exempel på dörrautomatik; val av utrustning måste projekteras separat."
  },
  {
    "id": "operator-demo",
    "name": "AUTOMATIK DEMO",
    "category": "operator",
    "description": "Fiktiv dörrautomatik."
  },
  {
    "id": "sensor-flatscan",
    "name": "Flatscan",
    "category": "sensor",
    "description": "Exempel på sensorlist."
  },
  {
    "id": "sensor-demo",
    "name": "Sensorlist DEMO",
    "category": "sensor",
    "description": "Fiktiv sensor för dörrsida."
  },
  {
    "id": "activation-jck207",
    "name": "JCK207",
    "category": "activation",
    "description": "Exempel på armbågskontakt."
  },
  {
    "id": "activation-demo",
    "name": "Öppnaknapp DEMO",
    "category": "activation",
    "description": "Fiktiv öppnaknapp."
  },
  {
    "id": "coordinator-demo",
    "name": "Dörrkoordinator DEMO",
    "category": "coordinator",
    "description": "Fiktiv dörrkoordinator."
  },
  {
    "id": "bolt-demo",
    "name": "Kantregel DEMO",
    "category": "bolt",
    "description": "Fiktiv kantregel."
  },
  {
    "id": "magnet-dc107",
    "name": "DC107",
    "category": "magnet",
    "description": "Exempel på magnetkontakt."
  },
  {
    "id": "reader-demo",
    "name": "Kortläsare DEMO",
    "category": "reader",
    "description": "Fiktiv kortläsare."
  },
  {
    "id": "controller-demo",
    "name": "Dörrcentral DEMO",
    "category": "controller",
    "description": "Fiktiv dörrcentral."
  }
].map(value=>Object.freeze(value)));
  const RETIRED_PRODUCTS = Object.freeze([
  {
    "id": "copiax-lock-310-50-hoger-assa-abloy-l-119ed2a8e5",
    "name": "310-50 höger – ASSA ABLOY låshus",
    "category": "lock",
    "description": "Mekaniskt låshus, högerutförande med 50 mm dorndjup. Källa: https://www.copiax.se/produkt/lashus-310-50-hoger-mp-102941"
  },
  {
    "id": "copiax-lock-411-50-assa-abloy-lashus-8211bd3958",
    "name": "411-50 – ASSA ABLOY låshus",
    "category": "lock",
    "description": "Mekaniskt låshus med 50 mm dorndjup. Källa: https://www.copiax.se/produkt/lashus-411-50-102950"
  },
  {
    "id": "copiax-lock-411-50-ma-assa-abloy-lash-01bda666a5",
    "name": "411-50 MA – ASSA ABLOY låshus med mikrobrytare",
    "category": "lock",
    "description": "Två mikrobrytare indikerar regelns inlåsta respektive utlåsta läge. Källa: https://www.copiax.se/produkt/lashus-411-50-ma-10012805"
  },
  {
    "id": "copiax-lock-511-50-rostfri-assa-abloy-eff0d747ab",
    "name": "511-50 rostfri – ASSA ABLOY låshus",
    "category": "lock",
    "description": "Kompletteringslås med 50 mm dorndjup. Utan mikrobrytare. Källa: https://www.copiax.se/produkt/lashus-511-50-rostfri-50125509"
  },
  {
    "id": "copiax-lock-565-50-sym-vanster-assa-a-6bfdf922b8",
    "name": "565-50 sym vänster – ASSA ABLOY låshus",
    "category": "lock",
    "description": "Symmetriskt låshus, vänsterutförande med 50 mm dorndjup. Källa: https://www.copiax.se/produkt/lashus-565-50-sym-vanster-mp-102045"
  },
  {
    "id": "copiax-lock-2002-50-sym-assa-abloy-la-f78864abb8",
    "name": "2002-50 sym – ASSA ABLOY låshus",
    "category": "lock",
    "description": "Symmetriskt låshus med 50 mm dorndjup. Källa: https://www.copiax.se/produkt/lashus-2002-50-sym-sb-10012062"
  },
  {
    "id": "copiax-lock-el580-abloy-eltryckeslas-87ed3cfe2d",
    "name": "EL580 – ABLOY eltryckeslås",
    "category": "lock",
    "description": "Eltryckeslås med splitfunktion och omställbar rättvänd/omvänd funktion. Källa: https://www.copiax.se/produkt/eltryckeslas-el580-440101"
  },
  {
    "id": "copiax-lock-sl620-rattvand-safetron-e-0ef9a62c08",
    "name": "SL620 rättvänd – SAFETRON eltryckeslås",
    "category": "lock",
    "description": "Eltryckeslås med splitfunktion. Rättvänt utförande. Källa: https://www.copiax.se/produkt/eltryckeslas-sl620-rattvand-50152056"
  },
  {
    "id": "copiax-lock-st110-step-110-steplock-e-4da425c0bb",
    "name": "ST110 / STEP 110 – StepLock eltryckeslås",
    "category": "lock",
    "description": "Eltryckeslås med splitfunktion och modern kolvplacering. Källa: https://www.copiax.se/produkt/eltryckeslas-step-110-modern-split-50142554"
  },
  {
    "id": "copiax-cylinder-fittings-256-multi-16-21mm-nickel--4b75525087",
    "name": "256 multi 16–21mm nickel – ASSA ABLOY cylinderbehör",
    "category": "cylinder-fittings",
    "description": "Cylinderbehör, nickel. Copiax artikel 50101719. Källa: https://www.copiax.se/produkt/cylinderbehor-256-multi-16-21mm-nickel-50101719"
  },
  {
    "id": "copiax-cylinder-fittings-3212-nickel-assa-abloy-cy-6e2b862cf5",
    "name": "3212 nickel – ASSA ABLOY cylinderbehör",
    "category": "cylinder-fittings",
    "description": "Cylinderbehör i nickelutförande. Källa: https://www.copiax.se/produkt/cylinderbehor-3212-nickel-105898"
  },
  {
    "id": "copiax-cylinder-fittings-3212-2-nickel-assa-abloy--6d535428ff",
    "name": "3212:2 nickel – ASSA ABLOY cylinderbehör",
    "category": "cylinder-fittings",
    "description": "Behör för rund säkerhetscylinder, nickel. Källa: https://www.copiax.se/produkt/cylinderbehor-32122-nickel-105057"
  },
  {
    "id": "copiax-cylinder-fittings-4265-insida-mattkrom-assa-b3bd042d3d",
    "name": "4265 insida mattkrom – ASSA ABLOY täckbricka",
    "category": "cylinder-fittings",
    "description": "Täckbricka för insidan, mattkrom. Källa: https://www.copiax.se/produkt/tackbricka-4265-insida-mattkrom-10011446"
  },
  {
    "id": "copiax-strike-575-12-24v-assa-abloy-els-b6d83d4cf0",
    "name": "575 12–24V – ASSA ABLOY elslutbleck",
    "category": "strike",
    "description": "Elslutbleck med omställbar rättvänd/omvänd funktion. Källa: https://www.copiax.se/produkt/elslutbleck-575-12-24v-8041016"
  },
  {
    "id": "copiax-strike-1487-1-assa-abloy-connect-a2777ea77b",
    "name": "1487-1 – ASSA ABLOY Connect slutbleck",
    "category": "strike",
    "description": "Plant slutbleck, 200 × 40 mm med 13,5 mm plös. Källa: https://www.copiax.se/produkt/slutbleck-connect-1487-1-plant-h200xb40-plos-135mm-121302"
  },
  {
    "id": "copiax-strike-1487-2-assa-abloy-connect-e37d580e54",
    "name": "1487-2 – ASSA ABLOY Connect slutbleck",
    "category": "strike",
    "description": "Plant slutbleck, 200 × 40 mm med 16,5 mm plös. Källa: https://www.copiax.se/produkt/slutbleck-connect-1487-2-plant-h200xb40-plos-165mm-121303"
  },
  {
    "id": "copiax-strike-es17-rattvand-safetron-el-2a578d5a30",
    "name": "ES17 rättvänd – SAFETRON elslutbleck",
    "category": "strike",
    "description": "Elslutbleck i rättvänt utförande med kolvkontakt. Källa: https://www.copiax.se/produkt/elslutbleck-es17-rattvand-50464910"
  },
  {
    "id": "copiax-strike-step-40-rattvand-12v-step-7ae1860fa6",
    "name": "STEP 40 rättvänd 12V – StepLock elslutbleck",
    "category": "strike",
    "description": "Elslutbleck i rättvänt 12 V-utförande. Källa: https://www.copiax.se/produkt/elslutbleck-step-40-rattvand-12v-50093865"
  },
  {
    "id": "copiax-strike-step-90-omvand-24v-kolvko-60f21ca0ee",
    "name": "STEP 90 omvänd 24V kolvkontakt – StepLock elslutbleck",
    "category": "strike",
    "description": "Elslutbleck i omvänt 24 V-utförande med kolvkontakt. Källa: https://www.copiax.se/produkt/elslutbleck-step-90-omvand-24v-kolvk-50100937"
  },
  {
    "id": "copiax-handle-696-assa-abloy-trycke-nic-e4a5b5435a",
    "name": "696 – ASSA ABLOY trycke, nickel, 40–75 mm",
    "category": "handle",
    "description": "Dörrtrycke utan returfjäder. Copiax art.nr 124265. Källa: https://www.copiax.se/produkt/trycke-696-40-75mm-nickel-pp-124265"
  },
  {
    "id": "copiax-handle-6696-assa-abloy-trycke-ni-03449e04c3",
    "name": "6696 – ASSA ABLOY trycke, nickel, 40–75 mm",
    "category": "handle",
    "description": "Dörrtrycke med returfjäder. Copiax art.nr 124267. Källa: https://www.copiax.se/produkt/trycke-6696-40-75mm-nickel-pp-124267"
  },
  {
    "id": "copiax-handle-dh-7020-dormakaba-trycke--cd09bda6cb",
    "name": "DH 7020 – dormakaba trycke, krom, 35–95 mm",
    "category": "handle",
    "description": "Dörrtrycke med returfjäder för inomhusdörrar. Copiax art.nr 50459322. Källa: https://www.copiax.se/produkt/trycke-dh-7020-35-95-mm-krom-50459322"
  },
  {
    "id": "copiax-handle-dh-8020-dormakaba-trycke--868f381918",
    "name": "DH 8020 – dormakaba trycke, krom, 35–95 mm",
    "category": "handle",
    "description": "Dörrtrycke med returfjäder och genomgående infästning. Copiax art.nr 50459897. Källa: https://www.copiax.se/produkt/trycke-dh-8020-35-95mm-krom-50459897"
  },
  {
    "id": "copiax-pull-8633-wide-assa-abloy-drag-7adaadf7e3",
    "name": "8633 Wide – ASSA ABLOY draghandtag, 25/400 mm, par",
    "category": "pull",
    "description": "Par med ett standardhandtag och ett Wide-handtag i rostfritt stål. Copiax art.nr 50140410. Källa: https://www.copiax.se/produkt/draghandtag-8633-25400-rf-par-wide-50140410"
  },
  {
    "id": "copiax-pull-pp-604-roca-draghandtag-3-f26ca8aa2e",
    "name": "PP-604 – ROCA draghandtag, 32 × 400 mm, polerat, par",
    "category": "pull",
    "description": "Draghandtag i rostfritt stål för dubbelmontage; en försäljningsenhet är ett par. Copiax art.nr 50138897. Källa: https://www.copiax.se/produkt/draghandtag-pp-604-32x400-polerad-50138897"
  },
  {
    "id": "copiax-pull-slug-17-roca-draghandtag--4e6d711f63",
    "name": "Slug 17 – ROCA draghandtag, elektropolerat, styck",
    "category": "pull",
    "description": "Draghandtag för montage under nödutrymningsbeslag modell 179. Säljs styckvis. Copiax art.nr 50126208. Källa: https://www.copiax.se/produkt/draghandtag-slug-17-for-nodutrymningsbeslag-elektropolerad-50126208"
  },
  {
    "id": "copiax-escape-179a-42-90-vanster-nickel-bf871f5d09",
    "name": "179A 42–90 vänster nickel – ASSA ABLOY nödutrymningsbeslag",
    "category": "escape",
    "description": "Nödutrymningsbeslag i vänsterutförande, nickel. Källa: https://www.copiax.se/produkt/nodutrymningsbeslag-179a-42-90-vanster-nickel-50013837"
  },
  {
    "id": "copiax-escape-179g-vanster-krom-assa-ab-9c25a9efbe",
    "name": "179G vänster krom – ASSA ABLOY nödutrymningsbeslag",
    "category": "escape",
    "description": "Nödutrymningsbeslag i vänsterutförande, krom. Källa: https://www.copiax.se/produkt/nodutrymningsbeslag-179g-vanster-krom-50134607"
  },
  {
    "id": "copiax-escape-179g-2-krom-assa-abloy-no-fe7d0842b5",
    "name": "179G-2 krom – ASSA ABLOY nödutrymningsbeslag",
    "category": "escape",
    "description": "Nödutrymningsbeslag för slagdörr i modulprofilutförande. Källa: https://www.copiax.se/produkt/nodutrymningsbeslag-179g-2-krom-50142335"
  },
  {
    "id": "copiax-escape-st17910-r-1-hoger-steploc-97ae1b5409",
    "name": "ST17910-R-1 höger – StepLock nödutrymningsbeslag",
    "category": "escape",
    "description": "Nödutrymningsbeslag i högerutförande, borstat rostfritt stål. Källa: https://www.copiax.se/produkt/nodutrymningsbeslag-st17910-r-1-borstat-rostfritt-stal-hoger-50457550"
  },
  {
    "id": "copiax-cable-ea280-299mm-abloy-kabelov-5dfc8a6aa2",
    "name": "EA280 299mm – ABLOY kabelöverföring",
    "category": "cable",
    "description": "Infälld kabelöverföring mellan dörr och karm. Källa: https://www.copiax.se/produkt/kabeloverforing-ea280-299mm-10011501"
  },
  {
    "id": "copiax-cable-ea281-543mm-abloy-kabelov-c7715347e2",
    "name": "EA281 543mm – ABLOY kabelöverföring",
    "category": "cable",
    "description": "Infälld kabelöverföring mellan dörr och karm. Källa: https://www.copiax.se/produkt/kabeloverforing-ea281-543mm-10011502"
  },
  {
    "id": "copiax-cylinder-03-oval-krom-assa-abloy-v-b0799d315e",
    "name": "03 oval krom – ASSA ABLOY vredcylinder",
    "category": "cylinder",
    "description": "Oval vredcylinder, krom. Källa: https://www.copiax.se/produkt/vredcylinder-03-oval-krom-50020215"
  },
  {
    "id": "copiax-cylinder-13-rund-nickel-assa-abloy-0119576e4d",
    "name": "13 rund nickel – ASSA ABLOY vredcylinder",
    "category": "cylinder",
    "description": "Rund vredcylinder, nickel. Källa: https://www.copiax.se/produkt/vredcylinder-13-rund-nickel-50020216"
  },
  {
    "id": "copiax-cylinder-1201-3ny-nickel-assa-ablo-a18b11af16",
    "name": "1201 3ny nickel – ASSA ABLOY cylinder",
    "category": "cylinder",
    "description": "Oval enkelcylinder med tre nycklar, nickel. Källa: https://www.copiax.se/produkt/cylinder-1201-3ny-nickel-50090952"
  },
  {
    "id": "copiax-cylinder-1211-rund-3ny-assa-abloy--d622ffa2fb",
    "name": "1211 rund 3ny – ASSA ABLOY cylinder",
    "category": "cylinder",
    "description": "Rundcylinder för dörrens utsida med tre nycklar. Källa: https://www.copiax.se/produkt/cylinder-1211-rund-3ny-10032164"
  },
  {
    "id": "copiax-cylinder-1212-rund-3ny-assa-abloy--4b0e6ea0d8",
    "name": "1212 rund 3ny – ASSA ABLOY dubbelcylinder",
    "category": "cylinder",
    "description": "Rund dubbelcylinder med tre nycklar. Ange en gång per dörr, inte på båda cylinderraderna. Källa: https://www.copiax.se/produkt/cylinder-1212-rund-3ny-50090968"
  },
  {
    "id": "copiax-cylinder-1301-3ny-nickel-assa-ablo-738bf1488a",
    "name": "1301 3ny nickel – ASSA ABLOY cylinder",
    "category": "cylinder",
    "description": "Oval enkelcylinder för utsidan, tre nycklar, nickel. Källa: https://www.copiax.se/produkt/cylinder-1301-3ny-nickel-50091202"
  },
  {
    "id": "copiax-closer-dc300-assa-abloy-dorrstan-19495b6818",
    "name": "DC300 – ASSA ABLOY dörrstängare silver",
    "category": "closer",
    "description": "Dörrstängarhus med standardarmsystem. Arm väljs separat. Källa: https://www.copiax.se/produkt/dorrstangare-dc300-ob-silver-50091452"
  },
  {
    "id": "copiax-closer-dc500-assa-abloy-dorrstan-3cc92bdf44",
    "name": "DC500 – ASSA ABLOY dörrstängare silver",
    "category": "closer",
    "description": "Kamskivestängare för glidarm. Arm ingår inte. Källa: https://www.copiax.se/produkt/dorrstangare-dc500-silver-50091462"
  },
  {
    "id": "copiax-closer-dc700-assa-abloy-dorrstan-86e77a0a60",
    "name": "DC700 – ASSA ABLOY dörrstängare silver",
    "category": "closer",
    "description": "Dörrstängarhus med kamskiva. Glidarm beställs separat. Källa: https://www.copiax.se/produkt/dorrstangare-dc700-silver-50025841"
  },
  {
    "id": "copiax-closer-ts83-dormakaba-dorrstanga-11d309896a",
    "name": "TS83 – dormakaba dörrstängare 3–6 silver",
    "category": "closer",
    "description": "Armsystemstängare i TS83-serien. Standardarm finns som separat produkt. Källa: https://www.copiax.se/produkt/dorrstangare-ts83-3-6-silver-50021278"
  },
  {
    "id": "copiax-closer-ts93-b-dormakaba-dorrstan-1819cf766d",
    "name": "TS93 B – dormakaba dörrstängare 2–5 silver",
    "category": "closer",
    "description": "Kamskivestängare i TS93 B-serien för glidskena. Källa: https://www.copiax.se/produkt/dorrstangare-ts93-2-5-b-silver-50021104"
  },
  {
    "id": "copiax-closer-ts4000-geze-dorrstangare--2500197cb7",
    "name": "TS4000 – GEZE dörrstängare silver",
    "category": "closer",
    "description": "Dörrstängarhus utan standardarm. Källa: https://www.copiax.se/produkt/dorrstangare-ts4000-silver-10012670"
  },
  {
    "id": "copiax-closer-ts5000-geze-dorrstangare--c139cabe37",
    "name": "TS5000 – GEZE dörrstängare silver",
    "category": "closer",
    "description": "Dörrstängarhus utan arm och glidskena. Källa: https://www.copiax.se/produkt/dorrstangare-ts5000-silver-8151500"
  },
  {
    "id": "copiax-closer-arm-4000-geze-standardarm-sil-25dc75e763",
    "name": "4000 – GEZE standardarm silver",
    "category": "closer-arm",
    "description": "Standardarm för dörrstängare. Källa: https://www.copiax.se/produkt/standardarm-4000-std-silver-10012674"
  },
  {
    "id": "copiax-closer-arm-cl-n-dormakaba-standardar-ccad3dea26",
    "name": "CL-N – dormakaba standardarm silver",
    "category": "closer-arm",
    "description": "Delbar standardarm med justerbar armlängd. Källa: https://www.copiax.se/produkt/arm-std-cl-n-silver-351161"
  },
  {
    "id": "copiax-closer-arm-g93n-dormakaba-glidskena--be33194ee5",
    "name": "G93N – dormakaba glidskena silver",
    "category": "closer-arm",
    "description": "Glidskenesystem i G-N-serien. Källa: https://www.copiax.se/produkt/glidskena-g93n-std-silver-50021108"
  },
  {
    "id": "copiax-closer-arm-g195-assa-abloy-glidarm-s-1870ab2ffd",
    "name": "G195 – ASSA ABLOY glidarm silver",
    "category": "closer-arm",
    "description": "Glidarm för enkeldörr. Källa: https://www.copiax.se/produkt/glidarm-g195-silver-50025843"
  },
  {
    "id": "copiax-closer-arm-l190-assa-abloy-standarda-79d32c7ab2",
    "name": "L190 – ASSA ABLOY standardarm silver",
    "category": "closer-arm",
    "description": "Standardarm för dörrstängare. Källa: https://www.copiax.se/produkt/standardarm-l190-silver-50025842"
  },
  {
    "id": "copiax-closer-arm-l191-assa-abloy-uppstalln-9a9aa58b26",
    "name": "L191 – ASSA ABLOY uppställningsarm silver",
    "category": "closer-arm",
    "description": "Arm med uppställningsfunktion. Källa: https://www.copiax.se/produkt/uppstallningsarm-l191-silver-50091477"
  },
  {
    "id": "copiax-closer-arm-ts5000-ecline-geze-glidsk-3219818efc",
    "name": "TS5000 ECline – GEZE glidskena silver",
    "category": "closer-arm",
    "description": "Glidskena med öppningssupport för montage på gångjärnssidan. Källa: https://www.copiax.se/produkt/glidskena-ts5000-ecline-silver-50093885"
  },
  {
    "id": "copiax-operator-ed100le-ny-dormakaba-auto-9a816f10aa",
    "name": "ED100LE NY – dormakaba automatikhus",
    "category": "operator",
    "description": "Automatikhus utan täckkåpa. Ny modell med eget armsystem. Kompletteringar väljs separat. Källa: https://www.copiax.se/produkt/dorrautomatikhus-ed100le-ny-utan-tackkapa-50150327"
  },
  {
    "id": "copiax-operator-ed250le-ny-dormakaba-auto-1890154885",
    "name": "ED250LE NY – dormakaba automatikhus",
    "category": "operator",
    "description": "Automatikhus utan täckkåpa. Kåpa och armsystem väljs separat. Källa: https://www.copiax.se/produkt/dorrautomatikhus-ed250le-ny-utan-tackkapa-50150303"
  },
  {
    "id": "copiax-operator-sw100-assa-abloy-automati-20eb4fb417",
    "name": "SW100 – ASSA ABLOY automatik tryckande silver, komplett",
    "category": "operator",
    "description": "Slagdörrsautomatik med tryckande armsystem och kåpa. Antal avser komplett automatik; arm ingår. Källa: https://www.copiax.se/produkt/dorrautomatik-sw100-tryckande-standardarm-kpl-silver-50156091"
  },
  {
    "id": "copiax-operator-sw200-assa-abloy-automati-2099b1274a",
    "name": "SW200 – ASSA ABLOY automatik dragande silver/svart, komplett",
    "category": "operator",
    "description": "Slagdörrsautomatik med dragande armsystem och kåpa. Antal avser komplett automatik; arm ingår. Källa: https://www.copiax.se/produkt/dorrautomatik-sw200-dragande-glidarm-kpl-silversvart-50156342"
  },
  {
    "id": "copiax-operator-sw300-assa-abloy-automati-258f75fd9d",
    "name": "SW300 – ASSA ABLOY automatik tryckande silver, komplett",
    "category": "operator",
    "description": "Slagdörrsautomatik med tryckande armsystem och kåpa. Antal avser komplett automatik; arm ingår. Källa: https://www.copiax.se/produkt/dorrautomatik-sw300-tryckande-standardarm-kpl-silver-50156200"
  },
  {
    "id": "copiax-sensor-4safe-bea-sensorlist-350--1b058a25bb",
    "name": "4SAFE – BEA sensorlist 350 mm svart",
    "category": "sensor",
    "description": "Aktiv IR-sensorlist. Antal avser enskilda lister. Källa: https://www.copiax.se/produkt/sensorlist-4safe-350mm-svart-50463158"
  },
  {
    "id": "copiax-sensor-flatscan-3d-bea-sats-2-se-bc5ebae088",
    "name": "FLATSCAN 3D – BEA sats, 2 sensorer, svart",
    "category": "sensor",
    "description": "Lasersensorer, höger och vänster. Antal 1 avser en sats med 2 sensorer; lägg inte samma sats på båda sidorna. Källa: https://www.copiax.se/produkt/flatscan-3d-kit-svart-50155038"
  },
  {
    "id": "copiax-sensor-flatscan-sw-bea-sensor-ho-d02729dc40",
    "name": "FLATSCAN SW – BEA sensor höger svart",
    "category": "sensor",
    "description": "Lasersensor, enskilt högerutförande. Antal avser sensorer. Källa: https://www.copiax.se/produkt/flatscan-sw-hoger-svart-50139343"
  },
  {
    "id": "copiax-sensor-sss-5s1led-hotron-sensorl-a3977ab258",
    "name": "SSS-5S1LED – Hotron sensorlist 360 mm svart",
    "category": "sensor",
    "description": "IR-sensorlist med LED-indikering. Antal avser enskilda lister. Källa: https://www.copiax.se/article/50001925"
  },
  {
    "id": "copiax-sensor-uniscan-bircher-sensorlis-56268106ad",
    "name": "UniScan – Bircher sensorlist 350 mm vit",
    "category": "sensor",
    "description": "Infraröd närvarosensor. Antal avser enskilda lister. Källa: https://www.copiax.se/produkt/sensorlist-uniscan-350mm-vit-50463330"
  },
  {
    "id": "copiax-activation-1-9012-1-axema-oppnaknapp-2f8487a58f",
    "name": "1-9012-1 – Axema öppnaknapp, utanpåliggande, svart",
    "category": "activation",
    "description": "Öppnaknapp för utpassage med nyckelsymbol och impulsfjäder. Copiax art.nr 50006426. Källa: https://www.copiax.se/produkt/tryckknapp-utanpa-svart-nyckelsymbol-50006426"
  },
  {
    "id": "copiax-activation-jck207-jc-kontakter-armba-f81ba86c41",
    "name": "JCK207 – JC Kontakter armbågskontakt, aluminium",
    "category": "activation",
    "description": "Armbågskontakt med en mikrobrytare. Copiax art.nr 50133661. Källa: https://www.copiax.se/produkt/armbagskontakt-jck207-aluminium-50133661"
  },
  {
    "id": "copiax-activation-jck217-jc-kontakter-armba-998d028bd5",
    "name": "JCK217 – JC Kontakter armbågskontakt, svart aluminium",
    "category": "activation",
    "description": "Armbågskontakt med taktila rillor och mikrobrytare. Copiax art.nr 50155020. Källa: https://www.copiax.se/produkt/armbagskontakt-jck217-aluminium-svart-50155020"
  },
  {
    "id": "copiax-activation-kt-3-1-dormakaba-nyckelko-989e6de044",
    "name": "KT 3-1 – dormakaba nyckelkontakt, utanpåliggande",
    "category": "activation",
    "description": "Nyckelmanövrerad kontakt som ger potentialfri impuls. Copiax art.nr 10033815. Källa: https://www.copiax.se/produkt/nyckelkontakt-kt-3-1-utanpaliggande-10033815"
  },
  {
    "id": "copiax-activation-pb1-cdvi-armbagskontakt-a-21a44b8285",
    "name": "PB1 – CDVI armbågskontakt, aluminium",
    "category": "activation",
    "description": "Armbågskontakt med NO/NC-mikrobrytare. Copiax art.nr 50000008. Källa: https://www.copiax.se/produkt/armbagskontakt-pb1-aluminium-50000008"
  },
  {
    "id": "copiax-coordinator-25-dk-olda-dorrkoordinato-4d9b9e50b0",
    "name": "25 DK – OLDA dörrkoordinator, grå",
    "category": "coordinator",
    "description": "Dörrkoordinator för pardörrar, monteras på karmens överstycke. Copiax art.nr 50156014. Källa: https://www.copiax.se/produkt/koordinator-25-dk-gra-50156014"
  },
  {
    "id": "copiax-coordinator-30-dk-olda-dorrkoordinato-663c957c10",
    "name": "30 DK – OLDA dörrkoordinator, 850 mm, grå",
    "category": "coordinator",
    "description": "Dörrkoordinator för pardörrar, monteras under karmens överstycke. Copiax art.nr 8151213. Källa: https://www.copiax.se/produkt/koordinator-30-dk-850mm-gra-8151213"
  },
  {
    "id": "copiax-coordinator-sr-390-dormakaba-dorrkoor-3db02c06d8",
    "name": "SR 390 – dormakaba dörrkoordinator",
    "category": "coordinator",
    "description": "Mekanisk koordinator för pardörrar. Copiax art.nr 351296. Källa: https://www.copiax.se/produkt/koordinator-sr-390-fz-351296"
  },
  {
    "id": "copiax-coordinator-sr392-1-dormakaba-dorrkoo-7cee76630c",
    "name": "SR392/1 – dormakaba dörrkoordinator, 1050 mm",
    "category": "coordinator",
    "description": "Mekanisk koordinator för infällt montage i pardörrar. Copiax art.nr 351232. Källa: https://www.copiax.se/produkt/koordinator-sr3921-1050mm-351232"
  },
  {
    "id": "copiax-bolt-1396-assa-abloy-manuell-k-f14b20d8ff",
    "name": "1396 – ASSA ABLOY manuell kantregel",
    "category": "bolt",
    "description": "Manuellt manövrerad kantregel för pardörrar. Copiax art.nr 128304. Källa: https://www.copiax.se/produkt/kantregel-1396-128304"
  },
  {
    "id": "copiax-bolt-2396-assa-abloy-automatis-990967ccf4",
    "name": "2396 – ASSA ABLOY automatisk kantregel",
    "category": "bolt",
    "description": "Automatisk kantregel för pardörrar. Copiax art.nr 128305. Källa: https://www.copiax.se/produkt/kantregel-2396-128305"
  },
  {
    "id": "copiax-bolt-step-21-steplock-automati-ddabafc087",
    "name": "STEP 21 – StepLock automatisk kantregel",
    "category": "bolt",
    "description": "Automatisk kantregel för pardörrar. Copiax art.nr 10011421. Källa: https://www.copiax.se/Webshop/Detail?productId=9303"
  },
  {
    "id": "copiax-magnet-dc1076-6m-aritech-magnetk-3546d3a569",
    "name": "DC1076-6M – Aritech magnetkontakt, infälld",
    "category": "magnet",
    "description": "Infälld magnetkontakt med 6 m kabel och NC-funktion. Copiax art.nr 50090644. Källa: https://www.copiax.se/produkt/magnetkontakt-dc1076-6m-infalld-50090644"
  },
  {
    "id": "copiax-magnet-mc240-alarmtech-magnetkon-a42223ceea",
    "name": "MC240 – Alarmtech magnetkontakt, infälld, 2 m",
    "category": "magnet",
    "description": "Magnetkontakt med NC-funktion och 2 m anslutningskabel. Copiax art.nr 50024335. Källa: https://www.copiax.se/produkt/magnetkontakt-mc240-infalld-sb-50024335"
  },
  {
    "id": "copiax-magnet-mc347-alarmtech-magnetkon-b1b2f9e2d3",
    "name": "MC347 – Alarmtech magnetkontakt, dubbel NC",
    "category": "magnet",
    "description": "Magnetkontakt med två NC-funktioner för infällt montage. Copiax art.nr 50126416. Källa: https://www.copiax.se/produkt/magnetkontakt-mc347-50126416"
  },
  {
    "id": "copiax-reader-a73-axema-em-mif-kortlasa-4a7c9c864d",
    "name": "A73 – Axema EM/MIF kortläsare",
    "category": "reader",
    "description": "VAKA-kortläsare med knappsats. Copiax art.nr 50002021. Källa: https://www.copiax.se/produkt/kortlasare-emmif-a73-50002021"
  },
  {
    "id": "copiax-reader-kprox-cdvi-kortlasare-6aa882818f",
    "name": "KPROX – CDVI kortläsare",
    "category": "reader",
    "description": "Kortläsare för Atrium passersystem. Copiax art.nr 50004729. Källa: https://www.copiax.se/produkt/kortlasare-kprox-50004729"
  },
  {
    "id": "copiax-reader-vr40s-mf-vanderbilt-kortl-94bfe2e907",
    "name": "VR40S-MF – Vanderbilt kortläsare med knappsats",
    "category": "reader",
    "description": "Mifare-läsare med knappsats och display. Copiax art.nr 50130189. Källa: https://www.copiax.se/produkt/kortlasare-vr40s-mf-knappsats-50130189"
  },
  {
    "id": "copiax-controller-b18-axema-vaka-dorrcentra-787bf0894f",
    "name": "B18 – Axema VAKA dörrcentral",
    "category": "controller",
    "description": "Centralenhet för en dörr i VAKA-system. Copiax art.nr 50142953. Källa: https://www.copiax.se/produkt/dorrcentral-b18-50142953"
  },
  {
    "id": "copiax-controller-b28-axema-vaka-dorrcentra-8e049f6c58",
    "name": "B28 – Axema VAKA dörrcentral",
    "category": "controller",
    "description": "Dörrcentral i Axema VAKA-sortimentet. Copiax art.nr 50142999. Källa: https://www.copiax.se/produkt/dorrcentral-b28-50142999"
  },
  {
    "id": "copiax-controller-koppla-2100-aptus-dorrcen-9739023c51",
    "name": "Koppla 2100 – Aptus dörrcentral",
    "category": "controller",
    "description": "Dörrenhet för signaler och styrningar i Aptus-system. Copiax art.nr 50100917. Källa: https://www.copiax.se/produkt/dorrcentral-koppla-2100-50100917"
  }
].map(value=>Object.freeze(value)));
  const PRODUCT_ALIASES = Object.freeze({
  "lock-511-50": "copiax-modell-lock-ebddad96aff7c3b8",
  "fittings-256": "copiax-modell-cylinder-fittings-05774a019aaafbea",
  "fittings-4265": "copiax-modell-cylinder-fittings-71d28b65bf77d551",
  "cable-ea281": "copiax-modell-cable-4b16b7c61823080a",
  "operator-sw300": "copiax-modell-operator-a135444b3aaa0393",
  "activation-jck207": "copiax-modell-activation-9ae24d71fa0116f9"
});
  const historicalProducts=new Map(LEGACY_PRODUCTS.concat(RETIRED_PRODUCTS,RETIRED_MISCLASSIFIED).map(value=>[value.id,value]));
  function isRetiredProduct(value){const previous=historicalProducts.get(value?.id);return !!previous&&['name','category','description'].every(key=>value[key]===previous[key]);}
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
    if(code.length>24||!/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?::[1-9][0-9]*)?$/.test(code))throw Error('Beteckningen får ha 1–24 bokstäver A–Z, siffror och bindestreck, samt ett avslutande kolon med löpnummer, till exempel GS4:1.');
    const base=code.split(':')[0];
    if(RESERVED_CODES.has(base)||LABEL_CODES.some(label=>base.startsWith(label+'-'))||/^(?:DORRKORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|TOALETT)(?=[A-Z]{0,5}\d)/.test(base)||/^(?:DORRKORT|BESLAGSKORT)[A-Z]{2,48}$/.test(base))throw Error('Beteckningen kan förväxlas med en rubrik vid avläsning. Välj en annan beteckning.');
    return code;
  }
  const matchKey=value=>normalizeCode(value).replace(/-/g,'');
  function idValue(value,label='ID'){
    const id=text(value,label,80,false);
    if(!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(id)||['constructor','prototype'].includes(id.toLowerCase()))throw Error(label+' får innehålla bokstäver, siffror och bindestreck.');
    return id;
  }
  function stencilIdValue(value){
    if(typeof value==='string'&&value.includes(':'))return normalizeCode(value);
    return idValue(value,'Stencil-ID');
  }
  function num(value,label,min,max){
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(label+' måste ligga mellan '+min+' och '+max+'.');
    return value;
  }
  function int(value,label,min,max){num(value,label,min,max);if(!Number.isInteger(value))throw Error(label+' måste vara ett heltal.');return value;}
  function materialTimeKey(value){
    const key=text(value,'Materialradens nyckel',400,false);
    if(key!==value||['__proto__','constructor','prototype'].includes(key))throw Error('Materialradens nyckel är ogiltig.');
    return key;
  }
  function normalizedMaterialTimes(input){
    if(!isObject(input)||Object.keys(input).length>LIMITS.materialTimes)throw Error('Projektets montagetider är ogiltiga.');
    return Object.fromEntries(Object.entries(input).map(([key,value])=>[materialTimeKey(key),num(value,'Tid per styck',0,100000)]));
  }
  function defaultPreferences(){return {sizeScope:'doors',doorSize:null,toolbarTools:DEFAULT_TOOLBAR_TOOLS.slice(),autoOpenCard:true,materialTimes:{}};}
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
    return {sizeScope:value.sizeScope,doorSize,toolbarTools,autoOpenCard:value.autoOpenCard,materialTimes:normalizedMaterialTimes(value.materialTimes)};
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
  function normalizedCard(input,expectedCode,allowLegacy=false){
    if(!isObject(input))throw Error('Dörrkortet saknas.');
    const code=normalizeCode(input.code);if(code!==expectedCode)throw Error('Dörrkortets beteckning stämmer inte.');
    if(!isObject(input.meta))throw Error('Dörrkortets grunduppgifter saknas.');
    const meta=Object.fromEntries(META_KEYS.map(key=>[key,text(input.meta[key]??'', 'Kortets '+key,120)]));
    if(!Array.isArray(input.rows)||input.rows.length>139||(input.rows.length<ROWS.length&&!(allowLegacy&&input.rows.length===LEGACY_ROWS.length)))throw Error('Dörrkortet måste innehålla alla '+ROWS.length+' utrustningsrader.');
    const byId=new Map();for(const row of input.rows){if(!isObject(row)||typeof row.id!=='string'||byId.has(row.id))throw Error('Dörrkortet innehåller en ogiltig eller dubblerad rad.');byId.set(row.id,row);}
    // Migrate only a complete, exact older card template. Missing or unknown
    // older rows stay errors; the new optional section starts entirely empty.
    if(input.rows.length===LEGACY_ROWS.length){
      for(const def of LEGACY_ROWS){const row=byId.get(def.id);if(!row||row.section!==def.section||row.label!==def.label)throw Error('Dörrkortets äldre utrustningsrader stämmer inte med mallen.');}
      for(const def of ROWS)if(!byId.has(def.id))byId.set(def.id,{id:def.id,section:def.section,label:def.label,product:'',quantity:1,delivery:'GS',installer:'GS'});
    }
    const rows=ROWS.map(def=>{const row=byId.get(def.id);if(!row||row.section!==def.section||row.label!==def.label)throw Error('Dörrkortets utrustningsrader stämmer inte med mallen.');return normalizedMaterialRow(row,def);});
    for(const row of input.rows.filter(row=>!ROWS.some(def=>def.id===row.id))){
      if(!/^import-[a-z0-9-]{1,70}$/.test(row.id))throw Error('Dörrkortets extra utrustningsrader har ett ogiltigt ID.');
      const category=text(row.category,'Materialgrupp',40,false);if(category!=='other'&&!CATEGORIES.has(category))throw Error('Materialgruppen är ogiltig.');
      rows.push({...normalizedMaterialRow(row,{id:row.id,section:text(row.section,'Rubrik',80,false),label:text(row.label,'Komponent',100,false)}),category});
    }
    let note=text(input.note,'Anteckning',2000);const functions=cardFunctions(input),remaining=[];
    for(const line of note.split('\n')){const match=line.match(/^\s*(Dörrfunktion|Larmfunktion|Brandfunktion)\s*:\s*(.*)$/i);if(!match){remaining.push(line);continue;}const key={'dörrfunktion':'door','larmfunktion':'alarm','brandfunktion':'fire'}[match[1].toLowerCase()];if(match[2]&&!functions[key].split('\n').includes(match[2]))functions[key]=[functions[key],match[2]].filter(Boolean).join('\n');}
    note=remaining.join('\n').trim();
    const result={code,meta,rows,note};if(input.functions!==undefined||Object.values(functions).some(Boolean))result.functions=cardFunctions({functions});return result;
  }
  function cardFunctions(card){
    const input=card?.functions??{};if(!isObject(input)||Object.keys(input).some(key=>!['door','alarm','fire'].includes(key)))throw Error('Dörrkortets funktionsbeskrivningar är ogiltiga.');
    return Object.fromEntries([['door','Dörrfunktion'],['alarm','Larmfunktion'],['fire','Brandfunktion']].map(([key,label])=>[key,text(input[key]??'',label,2000)]));
  }
  function normalizedMaterialRow(row,def){
    const value={id:def.id,section:def.section,label:def.label,product:text(row.product,'Produkt',160),quantity:int(row.quantity,'Antal',1,999),delivery:text(row.delivery,'Levereras av',40),installer:text(row.installer,'Monteras av',40)};
    for(const [key,label,max]of [['connection','Ansluts av',40],['functionOwner','Funktionsansvar',40],['note','Materialanmärkning',1000]])if(Object.hasOwn(row,key))value[key]=text(row[key],label,max);
    if(Object.hasOwn(row,'imported')){if(row.imported!==true)throw Error('Materialradens importmarkering är ogiltig.');value.imported=true;}
    return value;
  }
  function sectionsForCard(card){
    const sections=SECTIONS.map(section=>({title:section.title,rows:section.rows.slice()}));
    for(const row of card?.rows||[]){if(!row.id.startsWith('import-'))continue;let section=sections.find(section=>section.title===row.section);if(!section){section={title:row.section,rows:[]};sections.push(section);}section.rows.push({id:row.id,label:row.label,category:row.category});}
    return sections;
  }
  function restroomSymbol(value){
    const code=normalizeCode(value),match=/^(HWC|WC)(?::?([1-9][0-9]*))?$/.exec(code);
    return match?{type:match[1],number:match[2]||''}:null;
  }
  function defaultStencil(value){
    const code=normalizeCode(value),restroom=restroomSymbol(code),specialSymbol=/^DBL(?::?[1-9][0-9]*)?$/.test(code),symbol=['DA','DS','KL','DFS','DADS'].includes(code);
    const productType=code==='DA'?'doorAutomation':code==='DS'?'doorCloser':code==='KL'?'cardReader':code==='DFS'?'other':'none';
    const restroomMark=!!restroom||specialSymbol;
    const stencil={id:code,name:code==='DA'?'Dörrautomatik':code==='DS'?'Dörrstängare':code==='KL'?'Kortläsare':code,code,kind:symbol?'symbol':'card',productType,shape:restroomMark?'oval':symbol?'square':'oval',fill:restroomMark?'#ffdb5c':symbol?(code==='KL'?'#9bd8ae':code==='DS'?'#f3b65d':'#db756c'):'#ffdb5c',stroke:restroomMark?'#97792c':symbol?(code==='KL'?'#32754c':'#815044'):'#97792c',textColor:'#26323b',width:symbol?(code==='DADS'?38:28):Math.max(52,code.length*6+14),height:symbol?28:Math.ceil(Math.max(52,code.length*6+14)/1.4),fontSize:11};
    return {...stencil,category:defaultCategory(stencil)};
  }
  // Upgrade only known standard card sizes; preserve custom styles and sizes.
  function upgradeRestroomStencils(project){
    const next=clone(project);
    for(const stencil of Object.values(next.stencils)){
      if(stencil.kind!=='card'||stencil.shape!=='oval'||stencil.fill!=='#ffdb5c'||stencil.stroke!=='#97792c'||stencil.textColor!=='#26323b'||stencil.fontSize!==11)continue;
      const restroom=restroomSymbol(stencil.code),special=restroom||/^DBL(?::?[1-9][0-9]*)?$/.test(stencil.code);
      const legacy=(stencil.height===28&&stencil.width===Math.max(48,stencil.code.length*7+16))||(special&&stencil.height===34&&stencil.width===68)||(restroom&&stencil.height===34&&stencil.width===Math.max(52,stencil.code.length*6+14));
      if(!legacy)continue;
      const oldWidth=stencil.width,oldHeight=stencil.height,{width,height}=defaultStencil(stencil.code);
      Object.assign(stencil,{width,height});
      // Keep existing stamps inside their previous bounds, including rotated ones.
      const fit=Math.min(1,oldWidth/width,oldHeight/height);
      for(const item of next.placements)if(item.stencilId===stencil.id&&item.width===oldWidth&&item.height===oldHeight)Object.assign(item,{width:width*fit,height:height*fit});
    }
    return next;
  }
  function defaultStencilFor(state,value){
    const stencil=defaultStencil(value),size=normalizedPreferences(state.preferences).doorSize;
    return stencil.kind==='card'&&size?{...stencil,...size}:stencil;
  }
  function normalizedStencil(input){
    if(!isObject(input))throw Error('Stencilen saknas.');
    const code=normalizeCode(input.code),base=defaultStencil(code),stencil={...base,...input};
    if(!['card','symbol'].includes(stencil.kind))throw Error('Välj dörrkort eller symbol som stenciltyp.');
    // KL was imported as an unclassified symbol in 2.19.3. Upgrade its type
    // on every load while preserving its ID, geometry, styling and placements.
    const reader=stencil.kind==='symbol'&&code==='KL';
    const declaredType=Object.hasOwn(input,'productType')?input.productType:stencil.kind==='symbol'?base.productType:'none';
    const productType=reader&&PRODUCT_TYPES.includes(declaredType)?'cardReader':declaredType;
    if(reader&&stencil.name==='KL')stencil.name='Kortläsare';
    if(reader&&stencil.fill.toLowerCase()==='#db756c'&&stencil.stroke.toLowerCase()==='#815044'){stencil.fill='#9bd8ae';stencil.stroke='#32754c';}
    if(!PRODUCT_TYPES.includes(productType))throw Error('Välj dörrautomatik, dörrstängare, kortläsare, övrig produkt eller ingen separat produkt.');
    if(stencil.kind==='card'&&productType!=='none')throw Error('En separat produkt ska vara en dörrstämpel utan dörrkort.');
    if(!['oval','square','rectangle'].includes(stencil.shape))throw Error('Välj oval, fyrkant eller rektangel.');
    const color=(value,label)=>{if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error(label+' måste vara en färg med sex hexadecimala siffror.');return value.toLowerCase();};
    const category=reader?'Kortläsare':Object.hasOwn(input,'category')?text(input.category,'Stencilkategori',60,false).replace(/\s+/g,' '):defaultCategory({...stencil,productType});
    return {...(input.objectGroup===true?{objectGroup:true,objectModel:text(input.objectModel,'Maskintyp / modell',160,false),...(input.modelCode?{modelCode:text(input.modelCode,'Maskinkod',4,false),objectNumber:text(input.objectNumber,'Objektnummer',16,false),nextSerial:int(input.nextSerial??1,'Nästa löpnummer',1,1000000)}:{})}:{}),id:stencilIdValue(stencil.id),name:text(stencil.name,'Stencilnamn',80,false),code,kind:stencil.kind,productType,category,shape:stencil.shape,fill:color(stencil.fill,'Fyllnadsfärg'),stroke:color(stencil.stroke,'Kantfärg'),textColor:color(stencil.textColor,'Textfärg'),width:num(stencil.width,'Stämpelbredd',6,500),height:num(stencil.height,'Stämpelhöjd',6,500),fontSize:num(stencil.fontSize,'Textstorlek',4,72)};
  }
  function stencilProductType(stencil){
    if(stencil?.kind!=='symbol')return 'none';
    return stencil.productType??(stencil.code==='DA'?'doorAutomation':stencil.code==='DS'?'doorCloser':stencil.code==='KL'?'cardReader':stencil.code==='DFS'?'other':'none');
  }
  function isProductStencil(stencil){return ['doorAutomation','doorCloser','cardReader','elbowContact','other'].includes(stencilProductType(stencil));}
  function isReferenceStencil(stencil){return stencil?.kind==='symbol'&&stencil.productType==='none'&&stencil.category==='Beteckningar';}
  function productMultiplier(stencil){return stencilProductType(stencil)==='elbowContact'?2:1;}
  function defaultCategory(stencil){
    if(stencil?.kind==='card')return 'Dörrkort';
    const type=stencilProductType(stencil);
    return type==='doorAutomation'?'Dörrautomatik':type==='doorCloser'?'Dörrstängare':type==='cardReader'?'Kortläsare':type==='elbowContact'?'Armbågskontakter':type==='other'&&stencil?.code==='DFS'?'DFS':'Övrigt';
  }
  function stencilCategory(stencil){return typeof stencil?.category==='string'&&stencil.category.trim()?stencil.category.trim().replace(/\s+/g,' '):defaultCategory(stencil);}
  function stencilLabel(stencil){
    if(isReferenceStencil(stencil))return 'Beteckning';
    const productType=stencilProductType(stencil);
    return productType==='doorAutomation'?'Dörrautomatik':productType==='doorCloser'?'Dörrstängare':productType==='cardReader'?'Kortläsare':productType==='elbowContact'?'Armbågskontakt':productType==='other'?(stencilCategory(stencil)==='Övrigt'?'Produkt':stencilCategory(stencil)):stencil?.kind==='card'?'Dörrstämpel med dörrkort':'Dörrstämpel utan dörrkort';
  }
  function normalizedEquipment(input={}){
    if(!isObject(input))throw Error('Produktens uppgifter är ogiltiga.');
    return {objectNumber:text(input.objectNumber??'','Objektnummer',40),model:text(input.model??'','Produkttyp',160),quantity:int(input.quantity??1,'Produktantal',1,999),note:text(input.note??'','Produktanteckning',1000)};
  }
  function equipmentFor(placement){return normalizedEquipment(placement?.equipment);}
  const equipmentNumberKey=value=>value.normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase('sv');
  function numberEquipment(state){
    const products=state.placements.filter(placement=>isProductStencil(state.stencils[placement.stencilId])),used=new Set(Object.values(state.stencils).filter(s=>s.objectGroup).map(s=>equipmentNumberKey(s.code)));
    for(const placement of products){const number=placement.equipment.objectNumber;if(state.stencils[placement.stencilId].objectGroup)continue;if(!number)continue;const key=equipmentNumberKey(number);if(used.has(key))throw Error('Objektnumret '+number+' används redan. Välj ett unikt objektnummer.');used.add(key);}
    let candidate=1;
    for(const placement of products)if(!placement.equipment.objectNumber){while(used.has(String(candidate)))candidate++;placement.equipment.objectNumber=String(candidate);used.add(String(candidate));candidate++;}
  }
  function nextObjectCode(state,stencil){
    const saved=state.stencils[stencil.id];const serial=saved.nextSerial||1;
    saved.nextSerial=serial+1;return normalizeCode(saved.objectNumber+'-'+saved.modelCode+'-'+serial);
  }
  function addObjectStencil(state,number,model){
    const known=AUTOMATION_MODELS.find(x=>x[0]===model),objectNumber=normalizeCode(number);
    if(known&&(!/^\d{1,12}$/.test(objectNumber)))throw Error('Ange objektnumret med högst 12 siffror för automatikmärkningen.');
    const code=known?objectNumber+'-'+known[0]:objectNumber,objectModel=known?known[1]:text(model,'Maskintyp / modell',160,false);
    if(Object.values(state.stencils).some(s=>s.code===code))throw Error('Objektet och maskintypen finns redan. Välj den befintliga stencilen.');
    return addStencil(state,{...defaultStencil('DA'),id:uid('object'),code,name:objectModel,objectGroup:true,objectModel,...(known?{objectNumber,modelCode:known[0],nextSerial:1}:{}),shape:'square',width:72,height:72,fill:'#d5e9e0',stroke:'#32754c',category:'Dörrautomatik'});
  }
  function objectRows(state){
    return Object.values(state.stencils).filter(s=>s.objectGroup).map(s=>({id:s.id,objectNumber:s.objectNumber||s.code,model:s.objectModel,quantity:state.placements.filter(p=>p.stencilId===s.id).length})).sort((a,b)=>natural.compare(a.objectNumber,b.objectNumber));
  }
  function placementCounts(state){
    const counts={markings:state.placements.length,cards:Object.keys(state.cards).length,doorAutomation:0,doorCloser:0,cardReader:0,otherProducts:0};
    for(const placement of state.placements){const stencil=state.stencils[placement.stencilId],type=stencilProductType(stencil);if(type==='doorAutomation'||type==='doorCloser'||type==='cardReader')counts[type]+=equipmentFor(placement).quantity;else if(type==='other'||type==='elbowContact')counts.otherProducts+=equipmentFor(placement).quantity*productMultiplier(stencil);}
    return counts;
  }
  function normalizedPage(input){
    if(!isObject(input))throw Error('En ritningssida är ogiltig.');
    const width=num(input.width,'Sidbredd',1,100000),height=num(input.height,'Sidhöjd',1,100000),rotation=angle(input.rotation??0);
    if(rotation%90!==0)throw Error('PDF-sidans rotation måste vara 0, 90, 180 eller 270 grader.');
    if(!Array.isArray(input.view)||input.view.length!==4||input.view.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('PDF-sidans utsnitt är ogiltigt.');
    const view=input.view.slice();if(view[2]<=view[0]||view[3]<=view[1])throw Error('PDF-sidans utsnitt måste ha en positiv storlek.');
    if(!Array.isArray(input.transform)||input.transform.length!==6||input.transform.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('PDF-sidans koordinatmatris är ogiltig.');
    const transform=input.transform.map(n=>Object.is(n,-0)?0:n);if(Math.abs(transform[0]*transform[3]-transform[1]*transform[2])<1e-12)throw Error('PDF-sidans koordinatmatris kan inte användas.');
    return {width,height,rotation,view,transform};
  }
  function normalizedPlacement(input,state){
    if(!isObject(input))throw Error('En stämpelposition är ogiltig.');
    const id=idValue(input.id,'Positions-ID'),page=int(input.page,'Sida',1,state.drawing.pages.length),stencilId=stencilIdValue(input.stencilId),stencil=state.stencils[stencilId];
    if(!stencil)throw Error('Positionen saknar en stencil.');
    const code=normalizeCode(input.code);if(stencil.modelCode){const prefix=stencil.objectNumber+'-'+stencil.modelCode+'-',serial=code.slice(prefix.length);if(!code.startsWith(prefix)||!/^([1-9][0-9]*)$/.test(serial))throw Error('Automatikens märkning stämmer inte med objektnummer och maskintyp.');if(state.placements.some(p=>p.code===code))throw Error('Automatikens märkning används redan.');stencil.nextSerial=Math.max(stencil.nextSerial,Number(serial)+1);}else if(code!==stencil.code)throw Error('Positionens beteckning stämmer inte med stencilen.');
    if(stencil.kind==='card'&&!Object.hasOwn(state.cards,code))throw Error('Positionen saknar dörrkort för '+code+'.');
    const value={id,page,code,stencilId,x:num(input.x,'Vågrät position',0,1),y:num(input.y,'Lodrät position',0,1),width:num(input.width,'Stämpelbredd',6,500),height:num(input.height,'Stämpelhöjd',6,500),rotation:angle(input.rotation??0),locked:input.locked,note:text(input.note??'','Positionsanteckning',1000)};
    if(isProductStencil(stencil)||Object.hasOwn(input,'equipment'))value.equipment=normalizedEquipment(stencil.objectGroup?{objectNumber:stencil.modelCode?code:stencil.code,model:stencil.objectModel,quantity:1}:input.equipment);
    if(typeof value.locked!=='boolean')throw Error('Positionens låsning är ogiltig.');
    const sheet=state.drawing.pages[page-1],r=value.rotation*Math.PI/180,halfX=Math.abs(Math.cos(r))*value.width/2+Math.abs(Math.sin(r))*value.height/2,halfY=Math.abs(Math.sin(r))*value.width/2+Math.abs(Math.cos(r))*value.height/2,px=value.x*sheet.width,py=value.y*sheet.height,epsilon=1e-6;
    if(px-halfX< -epsilon||px+halfX>sheet.width+epsilon||py-halfY< -epsilon||py+halfY>sheet.height+epsilon)throw Error('Stämpeln vid '+id+' hamnar utanför ritningssidan. Flytta den längre från kanten eller minska storleken.');
    return value;
  }
  function normalizedProduct(input){
    if(!isObject(input))throw Error('Produkten saknas.');
    const category=text(input.category,'Produktgrupp',40,false);if(!CATEGORIES.has(category))throw Error('Välj en känd produktgrupp.');
    return {...(input.timeMinutes!==undefined?{timeMinutes:input.timeMinutes===null?null:num(input.timeMinutes,'Montagetid',0,100000)}:{}),id:idValue(input.id,'Produkt-ID'),name:text(input.name,'Produktnamn',160,false),category,description:text(input.description??'','Produktbeskrivning',400)};
  }
  function projectDetails(input){
    if(input===undefined)input={};
    if(!isObject(input))throw Error('Projektuppgifterna är ogiltiga.');
    const designer=text(input.designer??'','Projektör',120),date=text(input.date??'','Projektdatum',10);
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw Error('Ange ett giltigt projektdatum.');
    let logo=null;
    if(input.logo!==undefined&&input.logo!==null){
      if(!isObject(input.logo)||typeof input.logo.dataUrl!=='string'||input.logo.dataUrl.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(input.logo.dataUrl))throw Error('Loggan måste vara en PNG-bild på högst 1 MB.');
      const data=input.logo.dataUrl.slice(22);if(data.length%4)throw Error('Loggan kunde inte läsas.');
      const head=Uint8Array.from(atob(data.slice(0,44)),c=>c.charCodeAt(0)),signature=[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82];
      if(!signature.every((n,i)=>head[i]===n)||head.length<24)throw Error('Loggan saknar ett giltigt PNG-huvud.');
      const number=i=>head[i]*16777216+head[i+1]*65536+head[i+2]*256+head[i+3],width=number(16),height=number(20);
      if(width<1||height<1||width>1600||height>600||width*height>960000)throw Error('Loggan är för stor. Välj bilden igen via Projektuppgifter.');
      logo={name:text(input.logo.name??'Logga','Loggans namn',160),dataUrl:input.logo.dataUrl};
    }
    return {designer,date,logo,facilityNo:text(input.facilityNo??'','Anläggningsnummer',160),order:text(input.order??'','Ordernummer / AO',160),company:text(input.company??'','Utförande företag',160),companyContact:text(input.companyContact??'','Kontaktperson',160),companyPhone:text(input.companyPhone??'','Telefonnummer',160),companyAddress:text(input.companyAddress??'','Adress',160),companyPostalCode:text(input.companyPostalCode??'','Postnummer',160),companyPostalCity:text(input.companyPostalCity??'','Postort',160),customer:text(input.customer??'','Beställare / kund',160),contact:text(input.contact??'','Kontaktperson',160),phone:text(input.phone??'','Telefonnummer',160),address:text(input.address??'','Adress',160),postalCode:text(input.postalCode??'','Postnummer',160),postalCity:text(input.postalCity??'','Postort',160)};
  }
  function validate(raw){
    if(!isObject(raw)||![2,3,4,5,6,7].includes(raw.schema))throw Error('Projektfilens version stöds inte av denna projekteringssida.');
    if(!isObject(raw.project))throw Error('Projektuppgifter saknas.');
    const project={id:idValue(raw.project.id,'Projekt-ID'),name:text(raw.project.name,'Projektnamn',120,false),revision:int(raw.project.revision,'Revision',1,1000000000),updatedAt:text(raw.project.updatedAt,'Sparad tid',40,false)};
    if(raw.project.details!==undefined||raw.schema===7)project.details=projectDetails(raw.project.details);
    if(!/^\d{4}-\d{2}-\d{2}T/.test(project.updatedAt)||!Number.isFinite(Date.parse(project.updatedAt)))throw Error('Projektets sparade tid är ogiltig.');
    if(!isObject(raw.drawing)||!Array.isArray(raw.drawing.pages)||raw.drawing.pages.length>LIMITS.pages)throw Error('Ritningen får innehålla högst '+LIMITS.pages+' sidor.');
    const drawing={name:text(raw.drawing.name,'Ritningsnamn',240),pages:raw.drawing.pages.map(normalizedPage)};
    if(!isObject(raw.cards)||Object.keys(raw.cards).length>LIMITS.cards)throw Error('Projektet får innehålla högst '+LIMITS.cards+' dörrkort.');
    const cards={},identity=new Map();
    for(const [key,value] of Object.entries(raw.cards)){const code=normalizeCode(key);if(key!==code||Object.hasOwn(cards,code))throw Error('Ett dörrkort har en ogiltig eller dubblerad beteckning.');const match=matchKey(code);if(identity.has(match)&&identity.get(match)!==code)throw Error('Två dörrkort får samma beteckning vid avläsning.');identity.set(match,code);cards[code]=normalizedCard(value,code,raw.schema<4);}
    if(!isObject(raw.stencils)||Object.keys(raw.stencils).length>LIMITS.stencils)throw Error('Projektet får innehålla högst '+LIMITS.stencils+' stenciler.');
    const stencils={},stencilCodes=new Set();
    for(const [key,value] of Object.entries(raw.stencils)){const stencil=normalizedStencil(value);if(key!==stencil.id||Object.hasOwn(stencils,key))throw Error('En stencil har ett ogiltigt eller dubblerat ID.');if(stencilCodes.has(stencil.code))throw Error('En stencil med beteckningen '+stencil.code+' finns redan.');const match=matchKey(stencil.code);if(identity.has(match)&&identity.get(match)!==stencil.code)throw Error(stencil.code+' kan förväxlas med '+identity.get(match)+' vid avläsning.');identity.set(match,stencil.code);if(stencil.kind==='symbol'&&Object.hasOwn(cards,stencil.code))throw Error(stencil.code+' är en symbol och kan inte samtidigt vara ett dörrkort.');stencilCodes.add(stencil.code);stencils[key]=stencil;}
    // Add the new default once to pre-category projects, without replacing an
    // explicit DFS card/stencil. New projects may still remove their defaults.
    if(Object.values(raw.stencils).some(stencil=>!Object.hasOwn(stencil,'category'))&&!identity.has('DFS')&&!Object.hasOwn(stencils,'DFS')&&Object.keys(stencils).length<LIMITS.stencils)stencils.DFS=normalizedStencil(defaultStencil('DFS'));
    if(!Array.isArray(raw.placements)||raw.placements.length>LIMITS.placements)throw Error('Projektet får innehålla högst '+LIMITS.placements+' stämpelpositioner.');
    const result={schema:4,project,drawing,cards,stencils,placements:[],customProducts:[],preferences:normalizedPreferences(raw.preferences)},positions=new Set();
    for(const value of raw.placements){const place=normalizedPlacement(value,result);if(positions.has(place.id))throw Error('Ritningen innehåller dubblerade positions-ID.');positions.add(place.id);result.placements.push(place);}
    result.annotations=Annotations.validate(raw.annotations,drawing.pages);
    if(raw.schema>=5||Object.values(cards).some(card=>card.rows.some(row=>row.imported||row.id.startsWith('import-')||['connection','functionOwner','note'].some(key=>Object.hasOwn(row,key)))))result.schema=5;
    if(raw.conversion!==undefined){
      if(!isObject(raw.conversion)||raw.conversion.version!==1||!Array.isArray(raw.conversion.issues)||raw.conversion.issues.length>1000)throw Error('Importöversikten är ogiltig.');
      result.conversion={version:1,sourceName:text(raw.conversion.sourceName,'Källfil',240),issues:raw.conversion.issues.map(value=>text(value,'Importanmärkning',500,false))};result.schema=5;
    }
    if(raw.schema>=6||Object.values(cards).some(card=>card.functions))result.schema=6;
    // A previous version must reject shared headers/logos instead of dropping them.
    if(raw.schema===7||project.details)result.schema=7;
    // Older readers must reject schema 6 rather than discard function fields.
    // Older archived readers reject schema 4 before saving away the extra rows
    // or annotations. Earlier schema 2/3 inputs remain readable above.
    numberEquipment(result);
    if(!Array.isArray(raw.customProducts)||raw.customProducts.length>LIMITS.customProducts)throw Error('Projektets produktlista är ogiltig.');
    // Older projects may use an ID that has since become a built-in model.
    // Such project entries remain valid overrides; only duplicate custom IDs are rejected.
    const productIds=new Set();
    result.customProducts=raw.customProducts.map(value=>{const product=normalizedProduct(value);if(productIds.has(product.id))throw Error('Produktens ID används redan.');productIds.add(product.id);return product;});
    return result;
  }
  function createEmpty(name='Nytt projekt'){
    const codes=Array.from({length:100},(_,i)=>'GS'+(i+1)).concat(SPECIAL_CODES).map(initialCardCode),stencils=Object.fromEntries(codes.map(code=>[code,defaultStencil(code)]));
    return validate({schema:2,project:{id:uid('projekt'),name,revision:1,updatedAt:now()},drawing:{name:'',pages:[]},cards:{},stencils,placements:[],customProducts:[]});
  }
  function initialCardCode(value){
    const code=normalizeCode(value);
    return /^(?:GS(?:[1-9][0-9]?|100)|DGS100|WC|HWC|DBL)$/.test(code)?code+':1':code;
  }
  function assertCardIdentity(state,code){
    const conflict=Object.keys(state.cards).concat(Object.values(state.stencils).map(s=>s.code)).find(other=>other!==code&&matchKey(other)===matchKey(code));
    if(conflict)throw Error(code+' kan förväxlas med '+conflict+' vid avläsning.');
    if(Object.values(state.stencils).some(s=>s.code===code&&s.kind==='symbol'))throw Error(code+' används som symbol. Välj en dörrkortsbeteckning.');
  }
  function ensureCard(state,value){const code=normalizeCode(value);if(Object.hasOwn(state.cards,code))return state.cards[code];return transact(state,next=>{assertCardIdentity(next,code);next.cards[code]=createCard(code);},clean=>clean.cards[code]);}
  function updateCard(state,value,card){const code=normalizeCode(value),clean=normalizedCard(card,code);return transact(state,next=>{assertCardIdentity(next,code);next.cards[code]=clean;},next=>next.cards[code]);}
  function copyCard(state,fromValue,toValue){const from=normalizeCode(fromValue),to=normalizeCode(toValue);if(!Object.hasOwn(state.cards,from))throw Error('Dörrkortet som ska kopieras saknas.');if(Object.hasOwn(state.cards,to))throw Error('Ett dörrkort med beteckningen '+to+' finns redan.');return transact(state,next=>{assertCardIdentity(next,to);next.cards[to]={...clone(next.cards[from]),code:to,meta:{...next.cards[from].meta,littera:to}};},next=>next.cards[to]);}
  function suggestSeriesCode(state,baseValue,reuseCardTemplates){
    const base=normalizeCode(baseValue).replace(/:\d+$/,''),used=new Set(Object.keys(state.cards).concat(state.placements.map(place=>place.code)).map(matchKey)),templates=new Map();
    for(const stencil of Object.values(state.stencils)){
      const key=matchKey(stencil.code);
      if(reuseCardTemplates&&stencil.kind==='card')templates.set(key,stencil.code);else used.add(key);
    }
    // Scan from one each time. Unused exact card templates can fill old holes,
    // while symbols and differently spelled aliases continue to reserve names.
    for(let index=1;index<=100000;index++){
      const suffix=String(index);
      const start=base.slice(0,23-suffix.length).replace(/-+$/,'');
      if(!start)continue;
      const candidate=normalizeCode(start+':'+suffix);
      const key=matchKey(candidate);
      if(!used.has(key)&&(!templates.has(key)||templates.get(key)===candidate))return candidate;
    }
    throw Error('Ingen ledig beteckning hittades. Skriv en egen beteckning.');
  }
  function suggestForkCode(state,baseValue){return suggestSeriesCode(state,baseValue,true);}
  function suggestStencilCode(state,baseValue){return suggestSeriesCode(state,baseValue,false);}
  function suggestCardCode(state,baseValue){
    const code=initialCardCode(baseValue),key=matchKey(code);
    const conflict=Object.keys(state.cards).concat(Object.values(state.stencils).map(stencil=>stencil.code)).some(other=>other!==code&&matchKey(other)===key);
    const symbol=Object.values(state.stencils).some(stencil=>stencil.code===code&&stencil.kind!=='card');
    // Explicit custom unnumbered templates retain their chosen identity. A
    // numbered family always fills its lowest free slot, even from a later card.
    if(!code.includes(':')&&!Object.hasOwn(state.cards,code)&&!conflict&&!symbol)return code;
    return suggestForkCode(state,code);
  }
  function forkPlacementCard(state,placementId,newValue,cardDraft,options={}){
    const positionId=idValue(placementId,'Positions-ID'),newCode=normalizeCode(newValue);
    const position=state.placements.find(placement=>placement.id===positionId),sourceStencil=position&&state.stencils[position.stencilId];
    if(!position||!sourceStencil)throw Error('Markera en dörr på ritningen.');
    if(sourceStencil.kind!=='card'||!Object.hasOwn(state.cards,position.code))throw Error('Markera en dörr med dörrkort.');
    const reusedStencil=Object.values(state.stencils).find(stencil=>stencil.code===newCode);
    if(options.reuse===true&&Object.hasOwn(state.cards,newCode)&&newCode!==position.code){
      return transact(state,next=>{const stencil=reusedStencil||{...clone(sourceStencil),id:Object.hasOwn(next.stencils,newCode)?uid('linked'):newCode,code:newCode,name:newCode};if(stencil.kind!=='card')throw Error('Beteckningen används av en symbol.');next.stencils[stencil.id]=stencil;const target=next.placements.find(p=>p.id===positionId);target.code=newCode;target.stencilId=stencil.id;},next=>next.cards[newCode]);
    }
    if(Object.hasOwn(state.cards,newCode)||reusedStencil?.kind==='symbol'||state.placements.some(place=>matchKey(place.code)===matchKey(newCode)))throw Error('Beteckningen '+newCode+' finns redan. Välj en ny beteckning.');
    assertCardIdentity(state,newCode);
    const sourceCard=normalizedCard(cardDraft===undefined?state.cards[position.code]:cardDraft,position.code);
    let stencilId=reusedStencil?.id||newCode;while(!reusedStencil&&Object.hasOwn(state.stencils,stencilId))stencilId=uid('kort');
    return transact(state,next=>{
      if(!reusedStencil)next.stencils[stencilId]=normalizedStencil({...clone(sourceStencil),id:stencilId,code:newCode,name:newCode});
      next.cards[newCode]={...clone(sourceCard),code:newCode,meta:{...sourceCard.meta,littera:newCode}};
      // A lock protects geometry. Giving this existing door its own card leaves
      // its ID, position, size, rotation, lock, notes and other data unchanged.
      const placement=next.placements.find(item=>item.id===positionId);
      placement.code=newCode;placement.stencilId=stencilId;
    },next=>next.cards[newCode]);
  }
  function renameCard(state,value,newValue){
    const code=normalizeCode(value),to=normalizeCode(newValue);if(code===to)return state.cards[code];if(!Object.hasOwn(state.cards,code))throw Error('Dörrkortet finns inte.');
    if(Object.hasOwn(state.cards,to)||Object.values(state.stencils).some(s=>s.code===to))throw Error('Beteckningen '+to+' används redan.');
    return transact(state,next=>{assertCardIdentity(next,to);const card=next.cards[code];delete next.cards[code];card.code=to;if(card.meta.littera===code)card.meta.littera=to;next.cards[to]=card;
      for(const stencil of Object.values(next.stencils))if(stencil.code===code){stencil.code=to;if(stencil.name===code)stencil.name=to;}
      for(const placement of next.placements)if(placement.code===code)placement.code=to;
    },next=>next.cards[to]);
  }
  function renameReferencePlacement(state,placementId,value){
    const code=normalizeCode(value),position=state.placements.find(p=>p.id===placementId),source=state.stencils[position?.stencilId];
    if(!position||!isReferenceStencil(source))throw Error('Välj en sifferbeteckning på ritningen.');
    if(position.code===code)return position;
    if(position.locked)throw Error('Markeringen är låst. Lås upp den före ändring.');
    const matches=Object.values(state.stencils).filter(s=>s.code===code);
    if(state.cards[code]||matches.some(s=>!isReferenceStencil(s))||(!matches.length&&['DA','DS','KL','DFS','AK'].includes(code)))throw Error('Beteckningen används av en annan typ av stämpel.');
    return transact(state,next=>{
      const stencil=matches[0]||{...clone(source),id:Object.hasOwn(next.stencils,code)?uid('reference'):code,code,name:code};next.stencils[stencil.id]=stencil;
      const target=next.placements.find(p=>p.id===placementId);target.code=code;target.stencilId=stencil.id;
    },next=>next.placements.find(p=>p.id===placementId));
  }
  function assignPlacementCard(state,placementId,value){
    const code=normalizeCode(value);if(!state.cards[code])throw Error('Dörrkortet '+code+' saknas. Skapa eller läs in kortet först.');
    return transact(state,next=>{const position=next.placements.find(p=>p.id===placementId);if(!position)throw Error('Markera en stämpel först.');const previous=position.code;
      let stencil=Object.values(next.stencils).find(s=>s.code===code);if(!stencil){stencil={...defaultStencil(code),id:Object.hasOwn(next.stencils,code)?uid('linked'):code};next.stencils[stencil.id]=stencil;}if(stencil.kind!=='card')throw Error('Beteckningen hör till en symbol.');
      position.code=code;position.stencilId=stencil.id;delete position.equipment;
      if(next.conversion){const count=next.placements.filter(p=>p.code===previous).length;next.conversion.issues=next.conversion.issues.flatMap(issue=>issue.startsWith(previous+': ')&&issue.includes('stämplar saknar ett matchande dörrkort')?(count?[issue.replace(/: \d+ stämplar/,': '+count+' stämplar')]:[]):[issue]);}
    },next=>next.cards[code]);
  }
  function removeCard(state,value,options={}){const code=normalizeCode(value);if(!Object.hasOwn(state.cards,code))throw Error('Dörrkortet finns inte.');return transact(state,next=>{const used=next.placements.filter(p=>p.code===code);if(used.length&&!options.cascade)throw Error('Dörrkortet används av '+used.length+' positioner. Ta bort positionerna först eller bekräfta att de också ska tas bort.');if(used.some(p=>p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>p.code!==code);delete next.cards[code];});}
  function addStencil(state,input){const stencil=normalizedStencil(input);if(Object.hasOwn(state.stencils,stencil.id))throw Error('Stencilens ID används redan.');return transact(state,next=>{next.stencils[stencil.id]=stencil;},next=>next.stencils[stencil.id]);}
  function updateStencil(state,id,patch){id=stencilIdValue(id);if(!Object.hasOwn(state.stencils,id))throw Error('Stencilen finns inte.');const old=state.stencils[id];if((Object.hasOwn(patch,'id')&&patch.id!==id)||(Object.hasOwn(patch,'code')&&normalizeCode(patch.code)!==old.code))throw Error('Skapa en ny stencil för en ny beteckning.');return transact(state,next=>{next.stencils[id]=normalizedStencil({...next.stencils[id],...patch,id,code:old.code});},next=>next.stencils[id]);}
  function removeStencil(state,id,options={}){id=stencilIdValue(id);if(!Object.hasOwn(state.stencils,id))throw Error('Stencilen finns inte.');return transact(state,next=>{const used=next.placements.filter(p=>p.stencilId===id);if(used.length&&!options.cascade)throw Error('Stencilen används på ritningen. Ta bort positionerna först eller bekräfta att de också ska tas bort.');if(used.some(p=>p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>p.stencilId!==id);delete next.stencils[id];});}
  function addPlacement(state,input){if(!isObject(input))throw Error('Placeringen saknas.');const stencil=state.stencils[input.stencilId];if(!stencil)throw Error('Välj en stencil som finns i projektet.');const id=input.id?idValue(input.id,'Positions-ID'):uid('pos');return transact(state,next=>{if(stencil.kind==='card'&&!Object.hasOwn(next.cards,stencil.code))next.cards[stencil.code]=createCard(stencil.code);const placement={id,page:input.page,code:stencil.modelCode?nextObjectCode(next,stencil):stencil.code,stencilId:stencil.id,x:input.x,y:input.y,width:input.width??stencil.width,height:input.height??stencil.height,rotation:input.rotation??0,locked:input.locked??false,note:input.note??''};if(isProductStencil(stencil)||Object.hasOwn(input,'equipment'))placement.equipment=normalizedEquipment(input.equipment);next.placements.push(placement);},next=>next.placements.find(p=>p.id===id));}
  function updatePlacement(state,id,patch){id=idValue(id,'Positions-ID');const old=state.placements.find(p=>p.id===id);if(!old)throw Error('Positionen finns inte.');if(!isObject(patch))throw Error('Ändringen är ogiltig.');if(Object.hasOwn(patch,'id')&&patch.id!==id)throw Error('Positionens ID får inte ändras.');if(Object.hasOwn(patch,'equipment')&&!isObject(patch.equipment))throw Error('Produktens uppgifter är ogiltiga.');if(old.locked&&Object.entries(patch).some(([key,value])=>!['locked','equipment'].includes(key)&&value!==old[key]))throw Error('Positionen är låst. Lås upp den före ändring.');return transact(state,next=>{const index=next.placements.findIndex(p=>p.id===id),stencilId=patch.stencilId??old.stencilId,stencil=next.stencils[stencilId];if(!stencil)throw Error('Stencilen finns inte.');if(Object.hasOwn(patch,'code')&&normalizeCode(patch.code)!==stencil.code)throw Error('Välj en stencil med den nya beteckningen.');if(stencil.kind==='card'&&!Object.hasOwn(next.cards,stencil.code))next.cards[stencil.code]=createCard(stencil.code);next.placements[index]={...next.placements[index],...patch,id,stencilId,code:stencil.modelCode?old.code:stencil.code};if(Object.hasOwn(patch,'equipment'))next.placements[index].equipment=normalizedEquipment({...equipmentFor(old),...patch.equipment});},next=>next.placements.find(p=>p.id===id));}
  function updateEquipment(state,id,patch){
    id=idValue(id,'Positions-ID');const placement=state.placements.find(p=>p.id===id);
    if(!placement)throw Error('Positionen finns inte.');if(!isProductStencil(state.stencils[placement.stencilId]))throw Error('Välj en produktstämpel för att fylla i produktuppgifter.');
    if(!isObject(patch))throw Error('Produktens ändring är ogiltig.');
    return updatePlacement(state,id,{equipment:patch});
  }
  function removePlacements(state,ids){if(!Array.isArray(ids))throw Error('Välj positioner att ta bort.');const selected=new Set(ids.map(id=>idValue(id,'Positions-ID')));return transact(state,next=>{if(next.placements.some(p=>selected.has(p.id)&&p.locked))throw Error('Lås upp positionerna före borttagning.');next.placements=next.placements.filter(p=>!selected.has(p.id));});}
  function duplicatePlacements(state,ids,options={}){if(!Array.isArray(ids))throw Error('Välj positioner att kopiera.');const selected=new Set(ids.map(id=>idValue(id,'Positions-ID'))),sources=state.placements.filter(p=>selected.has(p.id));if(!sources.length)throw Error('Välj minst en position att kopiera.');const dx=options.dx??.015,dy=options.dy??.015;num(dx,'Vågrät förskjutning',-1,1);num(dy,'Lodrät förskjutning',-1,1);const newIds=sources.map(()=>uid('pos'));return transact(state,next=>{sources.forEach((source,index)=>{const copy={...clone(source),id:newIds[index],page:options.page??source.page,x:source.x+dx,y:source.y+dy,locked:false};if(isProductStencil(next.stencils[source.stencilId]))copy.equipment={...equipmentFor(source),objectNumber:''};if(next.stencils[source.stencilId].modelCode)copy.code=nextObjectCode(next,next.stencils[source.stencilId]);next.placements.push(copy);});},next=>newIds.map(id=>next.placements.find(p=>p.id===id)));}
  function listStencils(state){return Object.values(state.stencils).map(s=>clone(s)).sort((a,b)=>natural.compare(a.code,b.code));}
  const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function searchProducts(state,category,query=''){const needles=fold(query).trim().split(/\s+/).filter(Boolean),entries=new Map(PRODUCTS.map(value=>[value.id,value]));for(const value of state.customProducts)if(!isRetiredProduct(value))entries.set(value.id,value);return [...entries.values()].filter(p=>(!category||category==='all'||p.category===category)&&needles.every(n=>fold(p.name+' '+p.description+' '+p.id).includes(n))).sort((a,b)=>natural.compare(a.name,b.name)).map(p=>clone(p));}
  function addProduct(state,input){const product=normalizedProduct({...input,id:input.id||uid('custom')});return transact(state,next=>{next.customProducts.push(product);},next=>next.customProducts.find(p=>p.id===product.id));}

  function setPreferences(state,patch){
    if(!isObject(patch))throw Error('Inställningarna är ogiltiga.');
    const preferences=normalizedPreferences({...normalizedPreferences(state.preferences),...patch});
    return transact(state,next=>{next.preferences=preferences;});
  }
  function setMaterialTime(state,key,minutes){
    key=materialTimeKey(key);
    const materialTimes={...normalizedPreferences(state.preferences).materialTimes};
    if(minutes===null)delete materialTimes[key];else materialTimes[key]=num(minutes,'Tid per styck',0,100000);
    return setPreferences(state,{materialTimes});
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
    const id=stencilIdValue(stencilId),stencil=state.stencils[id];
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

  return Object.freeze({addObjectStencil,objectRows,Annotations,LIMITS,META_KEYS,SPECIAL_CODES,SECTIONS,sectionsForCard,PRODUCTS,productIdentity:productNameKey,LEGACY_PRODUCTS,RETIRED_PRODUCTS,PRODUCT_ALIASES,isRetiredProduct,OWNER_VALUES,TOOLBAR_TOOLS,SIZE_SCOPES,PRODUCT_TYPES,PRODUCT_TYPE_LABELS,CATEGORY_DEFAULTS,defaultPreferences,normalizeCode,matchKey,clone,createEmpty,initialCardCode,createCard,cardFunctions,projectDetails,validate,defaultStencil,defaultStencilFor,restroomSymbol,upgradeRestroomStencils,stencilLabel,stencilCategory,isProductStencil,isReferenceStencil,renameReferencePlacement,productMultiplier,equipmentFor,placementCounts,listStencils,searchProducts,addProduct,ensureCard,updateCard,copyCard,renameCard,assignPlacementCard,suggestCardCode,suggestForkCode,suggestStencilCode,forkPlacementCard,removeCard,addStencil,updateStencil,removeStencil,addPlacement,updatePlacement,updateEquipment,removePlacements,duplicatePlacements,setPreferences,setMaterialTime,resizeTargets,resizeShared,resizeStencilShared,alignPlacements});
});

