/* Export transport for the seven explicit SharePoint test copies only.
 * The existing modules build and verify their own PDF/ZIP/JSON. This adapter
 * receives that completed file; it never rebuilds a PDF or changes work data.
 *
 * offerSave({blob,name,source}) must resolve to {destination:'sharepoint',item}
 * only after the upload is acknowledged, or {destination:'local'} to use the
 * original browser transport. null/false/AbortError means cancel. In particular,
 * a virtual writable.close() cannot resolve (and the module cannot mark its
 * work saved) before that acknowledgement or an actual local write completes.
 *
 * Legacy synchronous download callers cannot await their own a.click(). Their
 * old download notices are not a cloud receipt; the test save dialog is the
 * authority. No URL, fetch, Blob, FileSystemFileHandle or production code patch.
 */
const TEST_PAGES = new Map([
 ['sharepoint-app-test.html', ''],
 ['sharepoint-control-test.html', 'control'],
 ['sharepoint-security-test.html', 'control'],
 ['sharepoint-smartmatch-test.html', 'smartmatch'],
 ['sharepoint-read-test.html', 'smartmatch'],
 ['sharepoint-drawing-test.html', 'drawing'],
 ['sharepoint-ce-test.html', 'smartmatch'],
]);
const MIME = Object.freeze({pdf:'application/pdf',zip:'application/zip',json:'application/json',csv:'text/csv',txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'});
const installations = new WeakMap();
const extension = name => String(name || '').split('.').at(-1).toLowerCase();
const supportedName = name => typeof name === 'string' && /\.[^.]+$/.test(name) && Object.hasOwn(MIME, extension(name));

export function isSharePointTestPage(window) {
 const page = String(window?.location?.pathname || '').split('/').at(-1);
 const body = window?.document?.body;
 return TEST_PAGES.has(page) && body?.hasAttribute('data-sharepoint-module') === true
  && body.dataset.sharepointModule === TEST_PAGES.get(page);
}

export function installExportBridge({window, offerSave, onError = () => {}} = {}) {
 if (!isSharePointTestPage(window)) return Object.freeze({installed:false, uninstall() {}, whenIdle:async () => {}});
 if (typeof offerSave !== 'function') throw new TypeError('offerSave is required.');
 if (installations.has(window)) return installations.get(window);
 const document = window.document, navigator = window.navigator;
 const originalClick = window.HTMLAnchorElement.prototype.click;
 const originalShare = typeof navigator?.share === 'function' ? navigator.share : null;
 const originalPicker = typeof window.showSaveFilePicker === 'function' ? window.showSaveFilePicker : null;
 const restores = [], pending = new Set(), localAnchors = new WeakSet();
 let active = true, queue = Promise.resolve();
 const abortError = (message = 'Sparandet avbröts.') => new window.DOMException(message, 'AbortError');
 const failState = message => new window.DOMException(message, 'InvalidStateError');
 const report = error => { if (error?.name !== 'AbortError') try { onError(error); } catch (_) { /* Status must not start another save. */ } };
 const checkActive = () => { if (!active || !isSharePointTestPage(window)) throw abortError('SharePoint-testets sparning är inte längre aktiv.'); };
 const track = promise => { pending.add(promise); promise.then(() => pending.delete(promise), () => pending.delete(promise)); return promise; };
 function replace(object, key, value) {
  const previous = Object.getOwnPropertyDescriptor(object, key);
  Object.defineProperty(object, key, {configurable:true, writable:true, enumerable:previous?.enumerable ?? false, value});
  restores.push(() => { if (object[key] === value) { if (previous) Object.defineProperty(object, key, previous); else delete object[key]; } });
 }
 const asFile = (blob, name) => new window.File([blob], name, {type:blob.type || MIME[extension(name)] || 'application/octet-stream'});
 function downloadLocal(blob, name) {
  const url = window.URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  localAnchors.add(anchor);
  (document.querySelector('dialog[open]') || document.body).append(anchor);
  try { originalClick.call(anchor); } finally {
   anchor.remove(); localAnchors.delete(anchor);
   window.setTimeout(() => window.URL.revokeObjectURL(url), 5 * 60 * 1000);
  }
 }
 function submit(file, local) {
  // Blob URL reads begin before entering this queue, so an immediately revoked
  // detached download still supplies exactly the completed export bytes.
  const captured = Promise.resolve(file.blob); captured.catch(() => {});
  const operation = queue.then(async () => {
   checkActive();
   const blob = await captured;
   if (!(blob instanceof window.Blob) || !blob.size) throw new Error('Exportfilen är tom eller kunde inte läsas. Projektet finns kvar.');
   if (!supportedName(file.name)) throw new Error('Exportfilens namn eller filtyp stöds inte av testet.');
   checkActive();
   const result = await offerSave({blob, name:file.name, source:file.source});
   checkActive();
   if (!result) throw abortError();
   if (result.destination === 'local') {
    // No additional await before calling share/picker: the Local button in the
    // save dialog supplies the user activation required by Safari/Chromium.
    await local(blob, file.name);
    return {destination:'local'};
   }
   if (result.destination === 'sharepoint' && typeof result.item?.id === 'string' && result.item.id
    && (result.item.size === undefined || result.item.size === blob.size)) return result;
   throw new Error('SharePoint bekräftade inte en fullständig sparad fil. Projektet finns kvar.');
  });
  const safe = operation.catch(error => {
   report(error);
   // Existing share/picker callers fall back to local download for ordinary
   // errors. AbortError stops that fallback after cancellation/upload failure.
   throw error?.name === 'AbortError' ? error : abortError(error?.message || 'Sparningen misslyckades.');
  });
  queue = safe.catch(() => {});
  return track(safe);
 }
 function downloadSpec(anchor) {
  if (!active || !isSharePointTestPage(window) || localAnchors.has(anchor) || !anchor?.hasAttribute?.('download') || !supportedName(anchor.download)) return null;
  const href = String(anchor.href || '');
  try {
   const url = new window.URL(href, window.location.href);
   if (url.protocol !== 'data:' && !(url.protocol === 'blob:' && url.origin === window.location.origin)) return null;
  } catch (_) { return null; }
  return {href, name:anchor.download};
 }
 function captureDownload(anchor) {
  const spec = downloadSpec(anchor); if (!spec) return false;
  let captured;
  try {
   // Invoke fetch synchronously, preserving Window's receiver and establishing
   // access before caller code can revoke its object URL or remove the anchor.
   captured = window.fetch(spec.href).then(response => {
    if (!response.ok) throw new Error('Den färdiga exportfilen kunde inte läsas.');
    return response.blob();
   });
  } catch (error) { captured = Promise.reject(error); }
  void submit({blob:captured, name:spec.name, source:'download'}, downloadLocal).catch(() => {});
  return true;
 }
 const anchorClick = function (...args) {
  if (captureDownload(this)) return;
  return originalClick.apply(this, args);
 };
 replace(window.HTMLAnchorElement.prototype, 'click', anchorClick);
 const click = event => {
  if (!active || !isSharePointTestPage(window)) return;
  const copy = event.target?.closest?.('#smartExportSaveObject');
  if (copy && ['sharepoint-read-test.html','sharepoint-smartmatch-test.html'].includes(window.location.pathname.split('/').at(-1))) {
   event.preventDefault(); event.stopImmediatePropagation();
   if (!copy.disabled) {
    const saveAs = document.getElementById('smartExportSaveAs');
    if (saveAs && !saveAs.disabled) saveAs.click();
   }
   return;
  }
  const anchor = event.target?.closest?.('a[download]');
  if (anchor && !event.defaultPrevented && captureDownload(anchor)) { event.preventDefault(); event.stopImmediatePropagation(); }
 };
 document.addEventListener('click', click, true);
 restores.push(() => document.removeEventListener('click', click, true));
 const copy = document.getElementById('smartExportSaveObject');
 if (copy && ['sharepoint-read-test.html','sharepoint-smartmatch-test.html'].includes(window.location.pathname.split('/').at(-1))) {
  const label = copy.textContent; copy.textContent = 'Spara kopia';
  restores.push(() => { if (copy.textContent === 'Spara kopia') copy.textContent = label; });
 }
 if (originalShare) replace(navigator, 'share', function (data) {
  const files = data?.files;
  if (!active || !isSharePointTestPage(window) || !Array.isArray(files) || !files.length
   || !files.every(file => file instanceof window.Blob && supportedName(file.name))) return originalShare.call(navigator, data);
  return (async () => {
   // Existing multi-protocol exports remain independent files. Each receives a
   // destination choice; cancellation stops the rest without retry/fallback.
   for (const file of files) await submit({blob:file, name:file.name, source:'share'},
    blob => originalShare.call(navigator, {...data, files:[asFile(blob, file.name)]}));
  })();
 });
 function virtualHandle(options) {
  const suggestedName = options.suggestedName;
  let savedFile = null, localHandle = null, writableOpen = false;
  const handle = {
   kind:'file',
   get name() { return localHandle?.name || savedFile?.name || suggestedName; },
   async queryPermission() { return 'granted'; },
   async requestPermission() { return 'granted'; },
   async isSameEntry(other) { return other === handle; },
   async getFile() {
    if (!savedFile) throw failState('Sparningen har inte bekräftats.');
    // A real local write retains the module's actual disk readback validation.
    // Cloud writes expose the acknowledged immutable export snapshot; this is
    // not an additional Graph download or a claim of cloud byte readback.
    return localHandle?.getFile ? localHandle.getFile() : savedFile;
   },
   async createWritable({keepExistingData = false} = {}) {
    checkActive();
    if (writableOpen) throw failState('En sparning pågår redan.');
    writableOpen = true;
    let content = keepExistingData && savedFile ? savedFile : new window.Blob([], {type:MIME[extension(suggestedName)]});
    let position = 0, state = 'open', closing;
    const requireOpen = () => { if (state !== 'open') throw failState('Filskrivningen är inte öppen.'); };
    const validOffset = value => { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Ogiltig filposition.'); return value; };
    const mutate = action => {
     requireOpen();
     try { return action(); }
     catch (error) { state = 'aborted'; writableOpen = false; throw error; }
    };
    const stream = {
     async seek(value) { mutate(() => { position = validOffset(value); }); },
     async truncate(value) {
      mutate(() => {
       const size = validOffset(value);
       // Observed PDF writers only truncate to the completed length. Reject an
       // unbounded sparse allocation instead of silently constructing huge data.
       if (size > content.size) throw new Error('Testets PDF-skrivning kan inte utöka filen med tomma data.');
       content = content.slice(0, size, content.type); position = Math.min(position, size);
      });
     },
     async write(value) {
      requireOpen();
      if (value && typeof value === 'object' && !(value instanceof window.Blob) && 'type' in value) {
       if (value.type === 'seek') return stream.seek(value.position);
       if (value.type === 'truncate') return stream.truncate(value.size);
      }
      mutate(() => {
       if (value?.type === 'write' && !(value instanceof window.Blob)) { if (value.position !== undefined) position = validOffset(value.position); value = value.data; }
       if (position > content.size) throw new Error('Testets PDF-skrivning kan inte lämna luckor i filen.');
       const valid = value instanceof window.Blob || value instanceof window.ArrayBuffer || window.ArrayBuffer.isView(value) || typeof value === 'string';
       if (!valid) throw new TypeError('Ogiltiga exportdata.');
       const part = value instanceof window.Blob ? value : new window.Blob([value]);
       content = new window.Blob([content.slice(0, position), part, content.slice(position + part.size)], {type:content.type || part.type});
       position += part.size;
      });
     },
     close() {
      if (closing) return closing;
      requireOpen(); state = 'closing';
      const snapshot = asFile(content, suggestedName);
      let nextLocalHandle = null;
      closing = submit({blob:snapshot, name:suggestedName, source:'save-picker'}, async blob => {
       const chosen = await originalPicker.call(window, {...options, suggestedName});
       const writer = await chosen.createWritable();
       try { await writer.write(blob); await writer.close(); }
       catch (error) { try { await writer.abort?.(); } catch (_) {} throw error; }
       nextLocalHandle = chosen;
      }).then(result => {
       if (state === 'aborted') throw abortError();
       savedFile = result.destination === 'sharepoint' && typeof result.item.name === 'string' && result.item.name
        ? asFile(snapshot, result.item.name) : snapshot;
       localHandle = result.destination === 'local' ? nextLocalHandle : null;
       state = 'closed'; writableOpen = false;
      }, error => { state = 'aborted'; writableOpen = false; throw error; });
      return closing;
     },
     async abort() { state = 'aborted'; writableOpen = false; },
    };
    return stream;
   },
  };
  return handle;
 }
 if (originalPicker) replace(window, 'showSaveFilePicker', function (options = {}) {
  if (!active || !isSharePointTestPage(window) || !supportedName(options.suggestedName)) return originalPicker.call(window, options);
  return Promise.resolve(virtualHandle({...options}));
 });
 const api = Object.freeze({
  installed:true,
  async whenIdle() { while (pending.size) await Promise.allSettled([...pending]); },
  uninstall() { if (!active) return; active = false; restores.reverse().forEach(restore => restore()); installations.delete(window); },
 });
 installations.set(window, api);
 return api;
}
