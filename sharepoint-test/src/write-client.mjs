/* Whole-app test only: create a new file under the configured GStest folder.
 * Never replace/delete, and never forward a Graph token to an upload URL.
 * API: https://learn.microsoft.com/graph/api/driveitem-createuploadsession
 */
import {SharePointFiles, mimeFor} from './file-client.mjs';
import {graphUrl} from './read-only.mjs';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 5 * 1024 * 1024; // 16 × 320 KiB.
const enc = value => encodeURIComponent(value);
const ITEM_FIELDS = 'id,name,size,file,folder,remoteItem,deleted,parentReference,webUrl';
// These are existing module exports. Saving their original bytes does not add
// JSON/CSV/text import support to the separate read-only file picker.
const TEXT_EXPORTS = Object.freeze({json:'application/json', csv:'text/csv', txt:'text/plain'});
const copyMimeFor = name => {
 const mime = mimeFor(name) || TEXT_EXPORTS[String(name).split('.').at(-1).toLowerCase()];
 return typeof mime === 'string' ? mime : '';
};

function failure(message, code, status) {
 const error = new Error(message);
 error.code = code;
 if (status) error.status = status;
 return error;
}
function identifier(value) {
 return typeof value === 'string' && value.length > 0 && value.length <= 1024 &&
  value !== '.' && value !== '..' && !/[\s/\\?#\u0000-\u001f\u007f]/u.test(value);
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function validateCopyName(value) {
 if (typeof value !== 'string' || !value || value.length > 255 || value !== value.trim() ||
     /["*:<>?/\\|\u0000-\u001f\u007f]/u.test(value) || /[. ]$/u.test(value) ||
     value === '.' || value === '..' || /^~\$/u.test(value) ||
     /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/iu.test(value) ||
     /^(?:\.lock|desktop\.ini)$/iu.test(value)) {
  throw failure('Ange ett filnamn utan sökväg eller otillåtna tecken.', 'invalid_name');
 }
 if (!copyMimeFor(value)) throw failure('SharePoint-testet sparar PDF, PNG, JPEG, WebP, ZIP, JSON, CSV och TXT.', 'unsupported_file');
 return value;
}

export function safeUploadUrl(value) {
 let url;
 try { if (typeof value !== 'string' || !value) throw Error(); url = new URL(value); }
 catch { throw failure('Microsoft lämnade en ogiltig uppladdningsadress.', 'invalid_upload_url'); }
 const host = url.hostname.toLowerCase();
 const microsoft = ['sharepoint.com', 'sharepointonline.com', '1drv.com']
  .some(domain => host === domain || host.endsWith('.' + domain));
 if (url.protocol !== 'https:' || !microsoft || url.username || url.password || url.hash || url.port) {
  throw failure('Okänd uppladdningsdomän. Sparandet stoppades.', 'invalid_upload_url');
 }
 return url.href;
}

function sessionExpiry(data) {
 const expires = typeof data?.expirationDateTime === 'string' ? Date.parse(data.expirationDateTime) : NaN;
 if (!Number.isFinite(expires) || expires <= Date.now()) {
  throw failure('Uppladdningen saknar en giltig session. Försök spara på nytt.', 'invalid_session');
 }
 return expires;
}
function checkRange(data, expected, total) {
 const ranges = data?.nextExpectedRanges;
 if (!Array.isArray(ranges) || ranges.length !== 1 || typeof ranges[0] !== 'string') {
  throw failure('Microsoft bekräftade inte nästa fildel. Sparandet stoppades.', 'invalid_range');
 }
 const match = /^(\d+)-(\d*)$/u.exec(ranges[0]);
 if (!match || Number(match[1]) !== expected || (match[2] && (Number(match[2]) < expected || Number(match[2]) >= total))) {
  throw failure('Microsoft bekräftade en annan fildel. Sparandet stoppades.', 'invalid_range');
 }
}
function checkFolder(item, driveId, id) {
 if (!object(item) || item.id !== id || !object(item.folder) || item.file || item.remoteItem || item.deleted ||
     typeof item.name !== 'string' || !item.name || item.parentReference?.driveId !== driveId) {
  throw failure('Målmappen kunde inte verifieras i det tillåtna SharePoint-biblioteket.', 'invalid_destination');
 }
 return item;
}
function checkFile(item, expected, requireParent = true) {
 const parent = item?.parentReference;
 if (!object(item) || !identifier(item.id) || !object(item.file) || item.folder || item.remoteItem || item.deleted ||
     item.name !== expected.name || item.size !== expected.size ||
     (expected.id && item.id !== expected.id) ||
     (requireParent && !object(parent)) ||
     (parent && (parent.id !== expected.parentId || parent.driveId !== expected.driveId))) {
  throw failure('Microsofts svar stämmer inte med filen eller målmappen. Kontrollera SharePoint innan du försöker igen.', 'invalid_saved_file');
 }
 return item;
}
function safeWebUrl(value, config) {
 try {
  const url = new URL(value), site = new URL(config.siteUrl);
  if (url.protocol === 'https:' && url.origin === site.origin && !url.username && !url.password) return url.href;
 } catch { /* A link is optional; item identity is verified independently. */ }
 return '';
}

/** guard() must verify current online admin/module access and return a stable
 * identity (including the chosen Microsoft account). A changed identity stops
 * an in-flight save. getWriteToken is separate from the read-only token callback.
 */
export class SharePointWriter extends SharePointFiles {
 constructor({getToken, getWriteToken, guard, fetchImpl = globalThis.fetch.bind(globalThis), maxBytes = MAX_UPLOAD_BYTES}) {
  super({getToken, fetchImpl, maxBytes});
  if (typeof getWriteToken !== 'function' || typeof guard !== 'function') throw new TypeError('Skrivbehörighet och åtkomstkontroll saknas.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_UPLOAD_BYTES) throw new TypeError('Ogiltig filstorleksgräns.');
  this.getWriteToken = getWriteToken;
  this.guard = guard;
  this.saving = false;
 }
 async access(context) {
  if (context.signal?.aborted) throw failure('Sparandet avbröts.', 'cancelled');
  const user = await this.guard();
  if (typeof user !== 'string' || !user || (context.user && user !== context.user)) {
   throw failure('Inloggningen eller behörigheten ändrades. Öppna sparandet på nytt.', 'access_changed');
  }
  if (context.signal?.aborted) throw failure('Sparandet avbröts.', 'cancelled');
  context.user = user;
 }
 async request(url, options, signal, timeout = 30000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw failure('Sparandet avbröts.', 'cancelled');
  signal?.addEventListener('abort', abort, {once:true});
  const timer = setTimeout(abort, timeout);
  try {
   return await this.fetch(url, {...options, credentials:'omit', cache:'no-store',
    referrerPolicy:'no-referrer', redirect:'error', signal:controller.signal});
  } catch {
   // A preauthenticated upload URL is a secret. Never expose transport errors
   // that may include that URL, request headers or an access token.
   throw failure(signal?.aborted ? 'Sparandet avbröts.' : 'Kontakten med SharePoint avbröts. Kontrollera anslutningen och försök igen.', signal?.aborted ? 'cancelled' : 'network');
  } finally {
   clearTimeout(timer); signal?.removeEventListener('abort', abort);
  }
 }
 async responseData(response) {
  if (!response.ok) {
   const messages = {
    401:'Microsoft-inloggningen behöver förnyas innan filen kan sparas.',
    403:'Skrivåtkomst nekad. Kontrollera behörigheten till GStest.',
    404:'Målmappen eller uppladdningen finns inte längre. Öppna sparandet på nytt.',
    409:'En fil med det namnet finns redan. Välj ett nytt namn; den befintliga filen har inte skrivits över.',
    412:'Filnamnet är inte längre ledigt. Välj ett nytt namn; ingen befintlig fil skrivs över.',
    429:'Microsoft begränsar uppladdningen. Vänta en stund och försök igen.',
    507:'SharePoint saknar ledigt utrymme för filen.'
   };
   throw failure(messages[response.status] || 'SharePoint kunde inte spara filen (HTTP ' + response.status + ').',
    response.status === 409 || response.status === 412 ? 'name_conflict' : 'http', response.status);
  }
  try { const data = await response.json(); if (!object(data)) throw Error(); return data; }
  catch { throw failure('Microsoft lämnade ett ofullständigt svar. Sparandet kunde inte bekräftas.', 'invalid_response'); }
 }
 async folderInside(root, target, context) {
  if (!identifier(target?.id) || target.driveId !== root.driveId) {
   throw failure('Välj GStest eller en undermapp i samma SharePoint-bibliotek.', 'invalid_destination');
  }
  const visited = new Set(); let id = target.id;
  for (let depth = 0; depth < 64; depth++) {
   if (!identifier(id) || visited.has(id)) break;
   visited.add(id);
   const item = checkFolder(await this.json('/v1.0/drives/' + enc(root.driveId) + '/items/' + enc(id) + '?$select=' + ITEM_FIELDS), root.driveId, id);
   if (context.signal?.aborted) throw failure('Sparandet avbröts.', 'cancelled');
   if (id === root.id) return;
   id = item.parentReference.id;
  }
  throw failure('Målmappen ligger inte under den konfigurerade GStest-mappen.', 'invalid_destination');
 }
 async saveCopy({config, destination, blob, name, onProgress, signal} = {}) {
  if (this.saving) throw failure('En fil sparas redan. Vänta tills den är klar.', 'busy');
  validateCopyName(name);
  if (!(blob instanceof Blob) || !Number.isSafeInteger(blob.size) || blob.size < 1) throw failure('Ingen exporterad fil finns att spara.', 'invalid_file');
  if (blob.size > this.maxBytes) throw failure('SharePoint-testet tillåter högst 25 MiB per fil. Spara en mindre fil.', 'file_too_large');
  if (!object(config)) throw failure('Inställningarna för GStest saknas.', 'invalid_destination');
  config = {siteUrl:config.siteUrl, libraryServerRelativePath:config.libraryServerRelativePath, folderPath:config.folderPath};
  destination = destination ? {driveId:destination.driveId, id:destination.id} : null;
  this.saving = true;
  const context = {signal, user:null}; let finalStarted = false, completed = false;
  const progress = (phase, loaded = 0) => {
   // Presentation callbacks must not turn a confirmed save into a false failure.
   try { onProgress?.({phase, loaded, total:blob.size}); } catch { /* UI owns display. */ }
  };
  try {
   if (mimeFor(name) === 'application/pdf' && await blob.slice(0, 5).text() !== '%PDF-') throw failure('Den exporterade filen har ingen giltig PDF-signatur.', 'invalid_file');
   await this.access(context); progress('validating');
   // Resolve the configured folder each time. A UI-provided drive/folder ID is
   // not proof that the target belongs to this test boundary.
   const root = await this.root(config);
   if (!identifier(root.id) || !identifier(root.driveId)) throw failure('GStest kunde inte verifieras.', 'invalid_destination');
   const target = destination ? {driveId:destination.driveId, id:destination.id} : {driveId:root.driveId, id:root.id};
   await this.folderInside(root, target, context);
   const url = graphUrl('/v1.0/drives/' + enc(root.driveId) + '/items/' + enc(target.id) + ':/' + enc(name) + ':/createUploadSession');
   await this.access(context);
   const token = await this.getWriteToken();
   if (typeof token !== 'string' || !token) throw failure('Godkänn Microsoft-skrivåtkomst för att spara filen.', 'write_token_missing');
   await this.access(context);
   const session = await this.responseData(await this.request(url, {method:'POST', headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
    body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':'fail', name}})}, signal));
   const uploadUrl = safeUploadUrl(session.uploadUrl); let expires = sessionExpiry(session);
   if (session.nextExpectedRanges) checkRange(session, 0, blob.size);
   let item;
   for (let start = 0; start < blob.size; start += UPLOAD_CHUNK_BYTES) {
    await this.access(context);
    await this.folderInside(root, target, context);
    await this.access(context);
    if (Date.now() >= expires) throw failure('Uppladdningen har gått ut. Försök spara på nytt.', 'session_expired');
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, blob.size);
    finalStarted = end === blob.size;
    const response = await this.request(uploadUrl, {method:'PUT', headers:{'Content-Type':'application/octet-stream', 'Content-Range':'bytes ' + start + '-' + (end - 1) + '/' + blob.size}, body:blob.slice(start, end)}, signal, 60000);
    const data = await this.responseData(response);
    if (end < blob.size) {
     if (response.status !== 202) throw failure('Microsoft avslutade uppladdningen innan hela filen bekräftats.', 'invalid_response');
     checkRange(data, end, blob.size); expires = sessionExpiry(data);
     progress('uploading', end);
    } else {
     if (response.status !== 200 && response.status !== 201) throw failure('Microsoft har inte bekräftat att hela filen sparats.', 'invalid_response');
     item = checkFile(data, {name, size:blob.size, driveId:root.driveId, parentId:target.id}, false);
    }
   }
   progress('verifying', blob.size);
   await this.access(context);
   const saved = checkFile(await this.json('/v1.0/drives/' + enc(root.driveId) + '/items/' + enc(item.id) + '?$select=' + ITEM_FIELDS),
    {id:item.id, name, size:blob.size, driveId:root.driveId, parentId:target.id});
   await this.folderInside(root, target, context);
   await this.access(context);
   completed = true; progress('complete', blob.size);
   return {id:saved.id, name:saved.name, size:saved.size, driveId:root.driveId, parentId:target.id, webUrl:safeWebUrl(saved.webUrl, config)};
  } catch (error) {
   // The last PUT may have committed before a connection or verification error.
   // Do not retry, rename, overwrite or delete automatically.
   if (finalStarted && !completed && error.code !== 'name_conflict') {
    error.mayHaveSaved = true;
    error.message += ' Filen kan ha sparats. Kontrollera målmappen innan du försöker igen.';
   }
   throw error;
  } finally { this.saving = false; }
 }
}
