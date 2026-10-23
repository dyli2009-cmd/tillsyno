/* Projektering 2: private, atomic local storage and portable project files. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(() => require('./smartmatch-projektering-v2-15-data.js'), () => globalThis.indexedDB);
  } else {
    root.Proj2Store = factory(() => root.Proj2Data, () => root.indexedDB);
  }
})(typeof window === 'object' ? window : globalThis, function (dataProvider, indexedDBProvider) {
  'use strict';
  const DB_NAME = 'tillsyno-projektering-v2';
  const STORE_NAME = 'projects';
  const RECORD_KEY = 'current';
  const FORMAT = 'TillsynoProjekteringV2';
  const MAX_DRAWING_BYTES = 50 * 1024 * 1024;
  const MAX_PROJECT_BYTES = 80 * 1024 * 1024;
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let opening = null;

  function storageError(error) {
    const name = error?.name || 'Error';
    const message = name === 'QuotaExceededError'
      ? 'Det finns inte tillräckligt med lagringsutrymme på enheten. Spara en projektfil innan du frigör utrymme.'
      : name === 'SecurityError' || name === 'NotAllowedError'
        ? 'Webbläsaren tillåter inte lokal projektlagring. Tillåt lagring eller spara en projektfil.'
        : name === 'AbortError'
          ? 'Projektet kunde inte sparas. Den tidigare lokala kopian har behållits.'
          : error?.message || 'Lokal projektlagring kunde inte öppnas.';
    const result = new Error(message);
    result.name = name;
    return result;
  }

  function data() {
    const api = dataProvider();
    if (!api || typeof api.validate !== 'function') throw Error('Projektmodellen kunde inte laddas. Öppna sidan igen.');
    return api;
  }

  function bytesOf(input, label = 'Ritningen') {
    if (input == null) return new Uint8Array();
    if (input instanceof Uint8Array) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength).slice();
    if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
    throw Error(label + ' måste vara PDF-byte.');
  }

  function validateSource(state, original) {
    if (original.byteLength > MAX_DRAWING_BYTES) throw Error('Originalritningen får vara högst 50 MB.');
    const count = state.drawing.pages.length;
    if (!count) {
      if (original.byteLength) throw Error('Projektet innehåller PDF-byte men saknar ritningssidor. Öppna ritningen igen.');
      return;
    }
    if (original.byteLength < 5 || original[0] !== 37 || original[1] !== 80 || original[2] !== 68 || original[3] !== 70 || original[4] !== 45) {
      throw Error('Projektet saknar en giltig original-PDF. Öppna originalritningen igen.');
    }
  }

  function snapshot(state, originalBytes) {
    const valid = data().validate(state);
    const original = bytesOf(originalBytes);
    validateSource(valid, original);
    return {state: JSON.parse(JSON.stringify(valid)), original};
  }

  function database() {
    if (opening) return opening;
    let provider;
    try { provider = indexedDBProvider(); } catch (error) { return Promise.reject(storageError(error)); }
    if (!provider) return Promise.reject(Error('Webbläsaren saknar lokal projektlagring. Spara en projektfil.'));
    let request;
    let abandoned = false;
    opening = new Promise((resolve, reject) => {
      const fail = error => { abandoned = true; opening = null; reject(storageError(error)); };
      try { request = provider.open(DB_NAME, 1); } catch (error) { fail(error); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(Error('Lokal lagring är upptagen i en annan flik. Stäng den fliken och försök igen.'));
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) { db.close(); return; }
        db.onversionchange = () => { db.close(); opening = null; };
        db.onclose = () => { opening = null; };
        resolve(db);
      };
    });
    // An open() call can throw synchronously inside the Promise executor.
    const pending = opening;
    pending.catch(() => { if (opening === pending) opening = null; });
    return pending;
  }

  async function transaction(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      let tx, result, settled = false;
      const fail = error => { if (!settled) { settled = true; reject(storageError(error)); } };
      try {
        tx = db.transaction(STORE_NAME, mode);
        tx.onabort = () => fail(tx.error || {name:'AbortError'});
        tx.onerror = () => { /* Default IndexedDB error handling aborts the transaction. */ };
        tx.oncomplete = () => { if (!settled) { settled = true; resolve(result); } };
        const request = operation(tx.objectStore(STORE_NAME));
        if (request) request.onsuccess = () => { result = request.result; };
      } catch (error) {
        if (error?.name === 'InvalidStateError') opening = null;
        try { tx?.abort(); } catch (_) { /* A failed transaction may already be closed. */ }
        fail(error);
      }
    });
  }

  async function save(state, originalBytes) {
    const saved = snapshot(state, originalBytes);
    const record = {version:2, state:saved.state, original:saved.original.buffer};
    await transaction('readwrite', store => store.put(record, RECORD_KEY));
    return saved;
  }

  async function load() {
    const record = await transaction('readonly', store => store.get(RECORD_KEY));
    if (record === undefined) return null;
    if (!record || record.version !== 2 || !(record.original instanceof ArrayBuffer)) throw Error('Den sparade lokala projektkopian är ogiltig. Öppna en sparad projektfil.');
    return snapshot(record.state, record.original);
  }

  async function clear() {
    await transaction('readwrite', store => store.delete(RECORD_KEY));
  }

  function encodeBase64(bytes) {
    if (!bytes.length) return '';
    if (typeof Buffer === 'function' && typeof Buffer.from === 'function') {
      return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
    }
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, Math.min(bytes.length, offset + 32768)));
    }
    return btoa(binary);
  }

  function decodeBase64(value) {
    if (typeof value !== 'string' || value.length > Math.ceil(MAX_DRAWING_BYTES / 3) * 4 || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
      throw Error('Projektfilens originalritning är ogiltig eller för stor.');
    }
    if ((value.endsWith('==') && (ALPHABET.indexOf(value[value.length - 3]) & 15)) ||
        (!value.endsWith('==') && value.endsWith('=') && (ALPHABET.indexOf(value[value.length - 2]) & 3))) {
      throw Error('Projektfilens originalritning har ogiltig kodning.');
    }
    let result;
    if (typeof Buffer === 'function' && typeof Buffer.from === 'function') result = new Uint8Array(Buffer.from(value, 'base64'));
    else {
      const binary = atob(value);
      result = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
    }
    if (result.length > MAX_DRAWING_BYTES) throw Error('Originalritningen får vara högst 50 MB.');
    return result;
  }

  async function pack(state, originalBytes) {
    const saved = snapshot(state, originalBytes);
    const output = new TextEncoder().encode(JSON.stringify({format:FORMAT, state:saved.state, originalBase64:encodeBase64(saved.original)}));
    if (output.byteLength > MAX_PROJECT_BYTES) throw Error('Projektfilen får vara högst 80 MB.');
    return output;
  }

  async function unpack(input) {
    let source;
    if (typeof input === 'string') {
      if (input.length > MAX_PROJECT_BYTES || new TextEncoder().encode(input).length > MAX_PROJECT_BYTES) throw Error('Projektfilen får vara högst 80 MB.');
      source = input;
    } else {
      const bytes = bytesOf(input, 'Projektfilen');
      if (bytes.byteLength > MAX_PROJECT_BYTES) throw Error('Projektfilen får vara högst 80 MB.');
      try { source = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
      catch (_) { throw Error('Projektfilen innehåller inte giltig text. Välj en projektfil som sparats från Projektering 2.'); }
    }
    let value;
    try { value = JSON.parse(source); } catch (_) { throw Error('Projektfilen kunde inte läsas. Välj en projektfil som sparats från Projektering 2.'); }
    if (!value || typeof value !== 'object' || value.format !== FORMAT) throw Error('Filen är inte ett redigerbart Projektering 2-projekt.');
    return snapshot(value.state, decodeBase64(value.originalBase64));
  }

  async function close() {
    const pending = opening;
    opening = null;
    if (pending) { try { (await pending).close(); } catch (_) { /* Failed opens have no handle to close. */ } }
  }

  return Object.freeze({DB_NAME, STORE_NAME, RECORD_KEY, FORMAT, MAX_DRAWING_BYTES, MAX_PROJECT_BYTES, save, load, clear, pack, unpack, close});
});

