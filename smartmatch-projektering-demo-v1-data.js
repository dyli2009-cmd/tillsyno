/* Tillsyno projekteringsdemo v1. Separate sample data and shared doorcard model. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ProjData = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const STORAGE_KEY = 'tillsyno-projektering-demo-v1';
  const LIMITS = Object.freeze({ cards: 250, doors: 500, customProducts: 500 });
  const SPECIAL_CODES = Object.freeze(['VC', 'HVC', 'WC', 'HWC', 'DBL', 'DADS', 'DA', 'DS']);
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

  function text(value, label, max, allowEmpty = true) {
    if (typeof value !== 'string') throw new Error(label + ' måste vara text.');
    const result = value.trim();
    if ((!allowEmpty && !result) || result.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result)) {
      throw new Error(label + ' har ett ogiltigt värde.');
    }
    return result;
  }

  function normalizeCode(value) {
    if (typeof value !== 'string') throw new Error('Ange en stämpelbeteckning.');
    const code = value.normalize('NFKC').toUpperCase().replace(/\s+/g, '');
    if (code.length > 24 || !/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/.test(code)) {
      throw new Error('Beteckningen får innehålla 1–24 bokstäver A–Z, siffror och bindestreck.');
    }
    if (RESERVED_CODES.has(code) || LABEL_CODES.some(label => code.startsWith(label + '-')) ||
        /^(?:DORRKORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|TOALETT)(?=[A-Z]{0,5}\d)/.test(code) ||
        /^(?:DORRKORT|BESLAGSKORT)[A-Z]{2,48}$/.test(code)) {
      throw new Error('Beteckningen kan förväxlas med en rubrik vid avläsning. Välj en annan beteckning.');
    }
    return code;
  }

  function shapeValue(shape) {
    if (shape !== 'oval' && shape !== 'square') throw new Error('Välj oval eller fyrkantig stämpel.');
    return shape;
  }

  function defaultShape(value) {
    return ['DA', 'DS', 'DADS'].includes(normalizeCode(value)) ? 'square' : 'oval';
  }

  function createCard(value, shape) {
    const code = normalizeCode(value);
    return {
      code,
      shape: shapeValue(shape === undefined ? defaultShape(code) : shape),
      rows: ROWS.map(row => ({
        id: row.id, section: row.section, label: row.label, product: '', quantity: 1, delivery: 'GS', installer: 'GS'
      })),
      note: ''
    };
  }

  function normalizedCard(value, expectedCode) {
    if (!isObject(value)) throw new Error('Dörrkortet saknas.');
    const code = normalizeCode(value.code);
    if (code !== expectedCode) throw new Error('Dörrkortets beteckning stämmer inte med stämpeln.');
    const base = createCard(code, value.shape);
    if (!Array.isArray(value.rows) || value.rows.length !== ROWS.length) {
      throw new Error('Dörrkortet måste innehålla alla ' + ROWS.length + ' utrustningsrader.');
    }
    const byId = new Map();
    for (const row of value.rows) {
      if (!isObject(row) || typeof row.id !== 'string' || byId.has(row.id)) throw new Error('Dörrkortet innehåller en ogiltig eller dubblerad rad.');
      byId.set(row.id, row);
    }
    base.rows = ROWS.map(def => {
      const row = byId.get(def.id);
      if (!row || row.section !== def.section || row.label !== def.label) throw new Error('Dörrkortets utrustningsrader stämmer inte med mallen.');
      if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 999) throw new Error('Antal ska vara ett heltal mellan 1 och 999.');
      return {
        id: def.id, section: def.section, label: def.label,
        product: text(row.product, 'Produkt', 160), quantity: row.quantity,
        delivery: text(row.delivery, 'Levereras av', 40), installer: text(row.installer, 'Monteras av', 40)
      };
    });
    base.note = text(value.note, 'Anteckning', 2000);
    return base;
  }

  function touch(state) {
    state.project.revision += 1;
    state.project.updatedAt = now();
  }

  function matchKey(value) {
    return normalizeCode(value).replace(/-/g, '');
  }

  function assertNewCard(state, code) {
    if (Object.hasOwn(state.cards, code)) return;
    if (Object.keys(state.cards).length >= LIMITS.cards) throw new Error('Projektet kan innehålla högst ' + LIMITS.cards + ' dörrkort.');
    const conflict = Object.keys(state.cards).find(existing => matchKey(existing) === matchKey(code));
    if (conflict) throw new Error(code + ' kan förväxlas med ' + conflict + ' vid avläsning. Välj en annan beteckning.');
  }

  function ensureCard(state, value, shape) {
    const code = normalizeCode(value);
    if (!Object.hasOwn(state.cards, code)) {
      assertNewCard(state, code);
      state.cards[code] = createCard(code, shape);
      touch(state);
    }
    return state.cards[code];
  }

  function assignDoor(state, id, value, shape) {
    const door = state.doors.find(item => item.id === id);
    if (!door) throw new Error('Dörren finns inte i ritningen.');
    const code = normalizeCode(value);
    if (!Object.hasOwn(state.cards, code)) {
      assertNewCard(state, code);
      state.cards[code] = createCard(code, shape);
    }
    if (door.code !== code) {
      door.code = code;
      touch(state);
    }
    return door;
  }

  function updateCard(state, value, card) {
    const code = normalizeCode(value);
    const clean = normalizedCard(card, code);
    assertNewCard(state, code);
    state.cards[code] = clean;
    touch(state);
    return clean;
  }

  function normalizedProduct(value) {
    if (!isObject(value)) throw new Error('Produkten saknas.');
    const id = text(value.id, 'Produktens ID', 80, false);
    if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error('Produktens ID får innehålla bokstäver, siffror och bindestreck.');
    const category = text(value.category, 'Produktgrupp', 40, false);
    if (!CATEGORIES.has(category)) throw new Error('Välj en känd produktgrupp.');
    return { id, name: text(value.name, 'Produktnamn', 160, false), category, description: text(value.description || '', 'Produktbeskrivning', 400) };
  }

  function addProduct(state, value) {
    const item = { ...value };
    if (!item.id) item.id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    const product = normalizedProduct(item);
    if (PRODUCTS.some(p => p.id === product.id) || state.customProducts.some(p => p.id === product.id)) throw new Error('Produktens ID används redan.');
    if (state.customProducts.length >= LIMITS.customProducts) throw new Error('Projektet kan innehålla högst ' + LIMITS.customProducts + ' egna produkter.');
    state.customProducts.push(product);
    touch(state);
    return product;
  }

  function fold(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function searchProducts(state, category, query = '') {
    const needles = fold(query).trim().split(/\s+/).filter(Boolean);
    return PRODUCTS.concat(state.customProducts || []).filter(product => {
      if (category && category !== 'all' && product.category !== category) return false;
      const haystack = fold(product.name + ' ' + product.description + ' ' + product.id);
      return needles.every(needle => haystack.includes(needle));
    }).sort((a, b) => natural.compare(a.name, b.name)).map(product => ({ ...product }));
  }

  function listCodes(state) {
    const codes = new Set(Array.from({ length: 100 }, (_, index) => 'GS' + (index + 1)));
    SPECIAL_CODES.forEach(code => codes.add(code));
    Object.keys(state?.cards || {}).forEach(code => codes.add(code));
    return Array.from(codes).sort(natural.compare);
  }

  function validate(raw) {
    if (!isObject(raw) || raw.schema !== 1) throw new Error('Filen är inte ett projekteringsprojekt av version 1.');
    if (!isObject(raw.project)) throw new Error('Projektuppgifter saknas.');
    const project = {
      id: text(raw.project.id, 'Projekt-ID', 80, false),
      name: text(raw.project.name, 'Projektnamn', 120, false),
      revision: raw.project.revision,
      updatedAt: text(raw.project.updatedAt, 'Sparad tid', 40, false)
    };
    if (!/^[A-Za-z0-9-]+$/.test(project.id)) throw new Error('Projektets ID är ogiltigt.');
    if (!Number.isInteger(project.revision) || project.revision < 1 || project.revision > 1000000000) throw new Error('Projektets revision är ogiltig.');
    if (!/^\d{4}-\d{2}-\d{2}T/.test(project.updatedAt) || !Number.isFinite(Date.parse(project.updatedAt))) throw new Error('Projektets sparade tid är ogiltig.');
    if (!isObject(raw.cards) || Object.keys(raw.cards).length > LIMITS.cards) throw new Error('Projektet kan innehålla högst ' + LIMITS.cards + ' dörrkort.');
    const cards = {};
    const cardKeys = new Set();
    for (const [key, card] of Object.entries(raw.cards)) {
      const code = normalizeCode(key);
      if (key !== code || Object.hasOwn(cards, code)) throw new Error('Dörrkortet har en ogiltig eller dubblerad beteckning.');
      if (cardKeys.has(matchKey(code))) throw new Error('Två dörrkort får samma beteckning vid avläsning. Ändra en av beteckningarna.');
      cardKeys.add(matchKey(code));
      cards[code] = normalizedCard(card, code);
    }
    if (!Array.isArray(raw.doors) || raw.doors.length < 1 || raw.doors.length > LIMITS.doors) throw new Error('Projektet måste innehålla mellan 1 och ' + LIMITS.doors + ' dörrpositioner.');
    const seen = new Set();
    const doors = raw.doors.map(door => {
      if (!isObject(door)) throw new Error('En dörrposition är ogiltig.');
      const id = text(door.id, 'Dörr-ID', 80, false);
      if (!/^[A-Za-z0-9-]+$/.test(id) || seen.has(id)) throw new Error('Ritningen har en ogiltig eller dubblerad dörrposition.');
      seen.add(id);
      const code = normalizeCode(door.code);
      if (!Object.hasOwn(cards, code)) throw new Error('Dörren ' + id + ' saknar dörrkort för ' + code + '.');
      if (typeof door.x !== 'number' || !Number.isFinite(door.x) || door.x < 0 || door.x > 1200 || typeof door.y !== 'number' || !Number.isFinite(door.y) || door.y < 0 || door.y > 800) {
        throw new Error('Dörrens position måste ligga inom ritningen.');
      }
      return { id, code, x: door.x, y: door.y, room: text(door.room, 'Rumsnamn', 120) };
    });
    if (!Array.isArray(raw.customProducts) || raw.customProducts.length > LIMITS.customProducts) throw new Error('Projektets produktlista är ogiltig.');
    const productsSeen = new Set(PRODUCTS.map(product => product.id));
    const customProducts = raw.customProducts.map(value => {
      const product = normalizedProduct(value);
      if (productsSeen.has(product.id)) throw new Error('Projektet har dubblerade produkt-ID:n.');
      productsSeen.add(product.id);
      return product;
    });
    return { schema: 1, project, cards, doors, customProducts };
  }

  function serialize(state) {
    return JSON.stringify(validate(state), null, 2);
  }

  function save(state, storage) {
    const target = storage || globalThis.localStorage;
    if (!target) throw new Error('Lagring på enheten är inte tillgänglig. Spara en projektfil.');
    const serialized = serialize(state);
    target.setItem(STORAGE_KEY, serialized);
    return state;
  }

  function load(storage) {
    const target = storage || globalThis.localStorage;
    if (!target) return null;
    const stored = target.getItem(STORAGE_KEY);
    if (stored === null) return null;
    if (stored.length > 12000000) throw new Error('Det sparade projektet är för stort.');
    return validate(JSON.parse(stored));
  }

  function createDemo() {
    const state = {
      schema: 1,
      project: { id: 'demo-50-dorrar', name: 'Exempelhuset · 50 dörrar', revision: 1, updatedAt: now() },
      cards: {}, doors: [], customProducts: []
    };
    for (let i = 0; i < 50; i += 1) {
      const code = i >= 44 ? SPECIAL_CODES[i - 44] : i === 43 ? 'GS100' : 'GS' + ((i % 10) + 1);
      if (!Object.hasOwn(state.cards, code)) state.cards[code] = createCard(code, code === 'DADS' ? 'square' : 'oval');
      state.doors.push({
        id: 'D' + String(i + 1).padStart(3, '0'), code,
        x: 90 + (i % 10) * 112, y: 180 + Math.floor(i / 10) * 110,
        room: 'Rum ' + (101 + i)
      });
    }
    const set = (code, id, product, delivery = 'GS', installer = 'GS') => {
      const row = state.cards[code].rows.find(item => item.id === id);
      Object.assign(row, { product, delivery, installer });
    };
    for (const code of Object.keys(state.cards)) {
      set(code, 'day-lock', 'ST140-50');
      set(code, 'day-cylinder-fittings', '256');
      set(code, 'day-strike', 'Slutbleck std', 'DT', 'DT');
      set(code, 'day-handle', 'Trycke DEMO 01', 'DT', 'DT');
      set(code, 'day-cylinder-hinge', '8882');
    }
    set('GS1', 'day-cable', 'EA281');
    set('GS1', 'access-magnet', 'DC107');
    set('GS2', 'day-escape', '17963');
    set('GS3', 'night-lock', '511-50');
    set('GS3', 'night-cylinder-fittings', '4265');
    set('GS9', 'closing-closer', 'Dörrstängare DEMO');
    set('GS9', 'closing-arm', 'Glidarm DEMO');
    for (const code of ['HVC', 'HWC', 'DADS']) {
      set(code, 'closing-operator', 'SW300');
      set(code, 'closing-sensor-hinge', 'Flatscan');
      set(code, 'closing-sensor-strike', 'Flatscan');
      set(code, 'closing-elbow', 'JCK207');
    }
    for (const code of ['VC', 'WC']) set(code, 'day-cylinder-strike', 'Cylinder/vred DEMO');
    state.cards.GS1.note = 'Demokort. Samma GS1 används vid flera dörrar. Sparade ändringar gäller alla GS1-positioner.';
    return state;
  }

  return Object.freeze({
    STORAGE_KEY, LIMITS, SPECIAL_CODES, SECTIONS, PRODUCTS, OWNER_VALUES,
    normalizeCode, matchKey, defaultShape, createDemo, createCard, ensureCard, assignDoor, updateCard,
    addProduct, searchProducts, listCodes, validate, serialize, save, load, clone
  });
});
