/* In-memory provenance for the seven test pages. A filename is never identity.
 * Import intent alone is insufficient: the active module's source bytes and
 * the completed PDF's own project catalogue must both agree. Reports, ZIPs,
 * attachments and the drawing tool's unmarked/split PDFs remain copy exports.
 * No provenance is written into customer PDFs, localStorage or production JS.
 */
import {isSharePointTestPage} from './export-bridge.mjs';
import {MAX_FILE_BYTES} from './limits.mjs';

const ROUTES = Object.freeze({
 'sharepoint-app-test.html': {kind:'dorrservice', inputs:['file']},
 'sharepoint-control-test.html': {kind:'doorservice-all-in-one', inputs:['securityFile']},
 'sharepoint-security-test.html': {kind:'security-service', inputs:['securityFile']},
 'sharepoint-smartmatch-test.html': {kind:'smartmatch', inputs:['pwFile']},
 'sharepoint-read-test.html': {kind:'smartmatch', inputs:['pwFile','rtMultiFiles']},
 'sharepoint-ce-test.html': {kind:'ce', inputs:['ceOpenPdf','ceHomePdfPicker']},
 'sharepoint-drawing-test.html': {kind:'drawing', inputs:['toolFile']},
});
const SOURCE_HASH_CHUNK_BYTES = 2 * 1024 * 1024;
const SOURCE_HASH_DOMAIN = new TextEncoder().encode('Tillsyno ordered source chunks SHA-256 v1\n');
const FULL_PROJECT_ACTIONS = Object.freeze({
 smartmatch:['smartExportBuild','smartExportSaveAs','smartExportSaveObject','smartExportDownload','smartExportShare'],
 dorrservice:['exportBtn'],
 'security-service':['secSaveWork'],
 'doorservice-all-in-one':['secSaveWork'],
 ce:['ceSavePdf','ceDialogSavePdf','ceShareDownload','ceShareSend'],
 drawing:[],
});
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const identityKey = value => nonempty(value?.accountKey) && nonempty(value?.userId) ? value.accountKey+'\n'+value.userId : '';
const sameRuntime = (a,b) => !!a && !!b && a.kind === b.kind && a.key === b.key && a.session === b.session;

function trustedSource(value) {
 if (!object(value) || !['driveId','id','parentId','name','eTag','accountKey','userId'].every(key => nonempty(value[key]))) return null;
 return Object.freeze(Object.fromEntries(['driveId','id','parentId','name','eTag','accountKey','userId','folderLabel','size','webUrl']
  .filter(key => value[key] !== undefined).map(key => [key,value[key]])));
}

// These two old modules publish their state as classic-script global lexical
// bindings, not Window properties. Reading those actual bindings avoids a DOM
// filename guess and does not replace their loaders or export implementations.
function legacyRuntime(kind) {
 try {
  if (kind === 'dorrservice' && typeof activeDrawingKey !== 'undefined' && typeof sourcePdfBytes !== 'undefined' && typeof pdf !== 'undefined' && pdf && activeDrawingKey && sourcePdfBytes)
   return {kind,key:activeDrawingKey,session:pdf,bytes:sourcePdfBytes};
  if (['security-service','doorservice-all-in-one'].includes(kind) && typeof activeKey !== 'undefined' && typeof sourceBytes !== 'undefined' && typeof pdf !== 'undefined' && pdf && activeKey && sourceBytes)
   return {kind,key:activeKey,session:pdf,bytes:sourceBytes};
 } catch (_) { /* A module that has not initialized cannot be bound. */ }
 return null;
}

function catalogueValue(doc,key,PDFLib) {
 const entry = doc.catalog.lookup(PDFLib.PDFName.of(key));
 if (!entry) return null;
 if (entry instanceof PDFLib.PDFRawStream) return JSON.parse(new TextDecoder().decode(PDFLib.decodePDFRawStream(entry).decode()));
 const text = entry.decodeText?.() || entry.asString?.();
 return text ? JSON.parse(text) : null;
}

function byteView(input) {
 if (input instanceof Uint8Array) return input;
 if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 if (input instanceof ArrayBuffer) return new Uint8Array(input);
 return null;
}
const inputSize = input => byteView(input)?.byteLength ?? input?.size;

/** Read recognized complete working-PDF formats. Existing byte views are read
 * directly: never wrap the active original in Blob and read a second copy. */
export async function inspectProjectPdf(input,{window,kind}={}) {
 const size = inputSize(input);
 if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES || !window?.PDFLib) return null;
 const bytes = byteView(input) || new Uint8Array(await input.arrayBuffer());
 if (bytes.byteLength !== size) return null;
 if (!new TextDecoder().decode(bytes.subarray(0,1024)).includes('%PDF-')) return null;
 const P = window.PDFLib, doc = await P.PDFDocument.load(bytes,{updateMetadata:false});
 if (kind === 'smartmatch') {
  const value = catalogueValue(doc,'TillsynoSmartMatchV36Data',P) || catalogueValue(doc,'TillsynoSmartMatchV30Data',P);
  if (!value) return null;
  if (!object(value) || !Number.isInteger(value.schema) || value.schema < 1 || value.schema > 6) return {kind,unsupported:true};
  if (!nonempty(value.projectId) || !object(value.instances) || !Array.isArray(value.automationItems)) return {kind,unsupported:true};
  return {kind,projectId:value.projectId};
 }
 if (kind === 'ce') {
  const value = catalogueValue(doc,'TillsynoCETestData',P);
  if (!value) return null;
  if (!object(value) || !Number.isInteger(value.schema) || value.schema < 2 || value.schema > 60 || value.format !== 'Tillsyno CE-märkning TEST '+value.schema || !nonempty(value.projectId) || !object(value.meta) || !Array.isArray(value.doors)) return {kind,unsupported:true};
  return {kind,projectId:value.projectId};
 }
 const names = kind === 'dorrservice' ? ['DorrserviceWork']
  : kind === 'doorservice-all-in-one' ? ['DoorserviceAllInOneWork','SecurityServiceWork']
  : kind === 'security-service' ? ['SecurityServiceWork'] : [];
 for (const name of names) {
  const entry = doc.catalog.lookup(P.PDFName.of(name));
  if (!(entry instanceof P.PDFDict)) continue;
  const data = entry.lookup(P.PDFName.of('Data'),P.PDFRawStream), drawing = entry.lookup(P.PDFName.of('Drawing'),P.PDFRawStream);
  const state = JSON.parse(new TextDecoder().decode(P.decodePDFRawStream(data).decode()));
  if (state?.app !== kind || Number(state.version) < 2 || !object(state.project) || !Array.isArray(kind === 'dorrservice' ? state.doors : state.items)) continue;
  const drawingBytes = P.decodePDFRawStream(drawing).decode();
  return {kind,drawingHash:await fingerprint(window,drawingBytes)};
 }
 return null;
}
async function fingerprint(window,input) {
 const bytes = byteView(input), size = inputSize(input);
 if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) throw new Error('Projektfilens storlek kan inte verifieras.');
 // This private, in-memory fingerprint covers every byte in order. It is not
 // advertised as a conventional whole-file SHA-256 checksum. Domain, file
 // length and fixed chunk size are included so equal chunks cannot be moved,
 // truncated or regrouped unnoticed. Only one <=2 MiB digest runs at a time;
 // a Blob import never needs its own 100–200 MiB arrayBuffer just for hashing.
 const headerLength = SOURCE_HASH_DOMAIN.length + 12;
 const manifest = new Uint8Array(headerLength + Math.ceil(size / SOURCE_HASH_CHUNK_BYTES) * 32);
 manifest.set(SOURCE_HASH_DOMAIN);
 const header = new DataView(manifest.buffer,SOURCE_HASH_DOMAIN.length,12);
 header.setUint32(0,Math.floor(size / 0x100000000));header.setUint32(4,size >>> 0);header.setUint32(8,SOURCE_HASH_CHUNK_BYTES);
 let index = 0;
 for (let offset = 0; offset < size; offset += SOURCE_HASH_CHUNK_BYTES) {
  const end = Math.min(size,offset + SOURCE_HASH_CHUNK_BYTES);
  const part = bytes ? bytes.subarray(offset,end) : new Uint8Array(await input.slice(offset,end).arrayBuffer());
  if (part.byteLength !== end-offset) throw new Error('Hela projektfilen kunde inte verifieras.');
  const hash = new Uint8Array(await window.crypto.subtle.digest('SHA-256',part));
  manifest.set(hash,headerLength + index++ * 32);
 }
 return Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',manifest)),n=>n.toString(16).padStart(2,'0')).join('');
}

/**
 * observeImport(input, files, sources): await BEFORE dispatching input change.
 * sources are verified read-client metadata plus accountKey and Tillsyno userId.
 * captureExport(): synchronous opaque ticket, taken before a transport is queued.
 * inspectExport({blob,name,context}): {projectExport,source,reason,isCurrent()}.
 * confirmSave(info,source): call only after writer acknowledgement. Returns true
 * when this full project is now bound to that receipt (including a new copy).
 */
export function createSourceBinding({window,readActive}={}) {
 const page = String(window?.location?.pathname || '').split('/').at(-1), route = ROUTES[page];
 const enabled = !!route && isSharePointTestPage(window), document = window?.document;
 const tickets = new WeakMap(), inspections = new WeakMap(), changes = new WeakMap(), byteCache = new WeakMap(), restores = [];
 let active = enabled, generation = 0, savedVersion = 0, identity = '', bound = null, pendingImport = null;
 let ceRuntime = null, ceBuild = null, exportIntent = null;
 let inspectionTail = Promise.resolve();
 const inspectSequentially = task => {
  const result = inspectionTail.then(task);inspectionTail = result.catch(()=>{});return result;
 };
 const invalidate = () => { generation++; bound = null; pendingImport = null; ceBuild = null; exportIntent = null; };
 function runtime() {
  if (!active) return null;
  try {
   if (readActive) return readActive() || null;
   if (route.kind === 'smartmatch') {
    const app = window.SmartMatchAppBridge, view = app?.getLocalView?.(), bytes = app?.getOriginalPdfBytes?.();
    if (!app?.getPdf?.() || !view?.workspaceId || !bytes?.byteLength || app.isOpeningProject?.()) return null;
    return {kind:'smartmatch',key:view.workspaceId,session:null,bytes};
   }
   if (route.kind === 'ce') return document.getElementById('ceWorkspace')?.hidden ? null : ceRuntime;
   if (route.kind === 'drawing') {
    const app = window.DrawingToolsBridge, pdf = app?.getPdf?.();
    return pdf ? {kind:'drawing',key:app.getStateKey?.() || '',session:pdf,bytes:app.getSourceBytes?.()} : null;
   }
   return legacyRuntime(route.kind);
  } catch (_) { return null; }
 }
 function isCurrent(ticket) {
  if (!active || ticket.generation !== generation || ticket.savedVersion !== savedVersion || (ticket.identity && ticket.identity !== identity)) return false;
  const now = runtime();
  return ticket.runtime ? sameRuntime(ticket.runtime,now) : !now;
 }
 function captureExport() {
  const token = Object.freeze({}), current = runtime(), intent = exportIntent;
  exportIntent = null;
  const completeProject = !!intent && intent.generation === generation &&
   (sameRuntime(intent.runtime,current) || (route.kind === 'ce' && !intent.runtime && ceBuild?.generation === generation && !!current));
  tickets.set(token,{generation,savedVersion,identity,runtime:current,completeProject});
  return token;
 }
 async function metadataFor(bytes) {
  if (!bytes || !bytes.byteLength) return null;
  let cached = byteCache.get(bytes);
  if (!cached) {
   cached = (async()=>{
    const hash = await fingerprint(window,bytes);
    // Service modules already expose their extracted drawing as active bytes;
    // its identity needs a fingerprint, not another full PDF parse. SmartMatch
    // and CE additionally need the source schema/project ID safety check.
    const metadata = ['smartmatch','ce'].includes(route.kind)
     ? await inspectProjectPdf(bytes,{window,kind:route.kind}).catch(()=>({unsupported:true})) : null;
    return {hash,metadata};
   })();
   byteCache.set(bytes,cached);
  }
  return cached;
 }
 async function observeImport(input,files,sources=[]) {
  if (!active || !route.inputs.includes(input?.id)) return false;
  invalidate();
  const ownGeneration = generation, list = Array.from(files || []);
  changes.set(input,{generation:ownGeneration,files:list});
  if (list.length !== 1 || sources.length !== 1 || !/\.pdf$/i.test(list[0]?.name || '')) return false;
  const source = trustedSource(sources[0]);
  if (!source || identityKey(source) !== identity || !Number.isSafeInteger(list[0].size) || list[0].size < 1 || list[0].size > MAX_FILE_BYTES || route.kind === 'drawing') return false;
  return inspectSequentially(async()=>{
   if (!active || generation !== ownGeneration) return false;
   let hash,metadata=null;
   if (['smartmatch','ce'].includes(route.kind)) {
    // These formats keep the imported PDF as the active original. Verify the
    // immutable File now, then parse the module's existing byte object once on
    // export. No original-import PDF document or whole-file copy is needed.
    hash = await fingerprint(window,list[0]);
   } else {
    const bytes = new Uint8Array(await list[0].arrayBuffer());
    hash = await fingerprint(window,bytes);
    metadata = await inspectProjectPdf(bytes,{window,kind:route.kind}).catch(()=>({unsupported:true}));
   }
   if (!active || generation !== ownGeneration) return false;
   pendingImport = {generation:ownGeneration,source,hash,metadata};
   return true;
  });
 }
 function setIdentity(value={}) {
  const next = identityKey(value);
  // Connecting for the first local save is allowed. An established account or
  // Tillsyno user change invalidates every queued export and the old driveItem.
  if (identity && identity !== next) invalidate();
  identity = next;
 }
 async function inspectExport({blob,name,context}={}) {
  const ticket = tickets.get(context);
  const ownTicket = ticket || {generation,savedVersion,identity,runtime:runtime()};
  return inspectSequentially(async()=>{
  let projectExport = false, source = null, reason = 'Den här exporten sparas som en separat fil.', projectKey = '';
  let output = null, original = null;
  if (ticket?.completeProject && isCurrent(ticket) && ticket.runtime && /\.pdf$/i.test(name || '') && blob?.size <= MAX_FILE_BYTES) {
   try {
    // Never hold two concurrently parsing PDF documents. The cached original
    // result contains only small identity data; its PDF document is released
    // before the completed export is read. A stale/unsupported source also
    // stops us from allocating a large output inspection unnecessarily.
    original = await metadataFor(ticket.runtime.bytes);
    if (isCurrent(ticket) && !original?.metadata?.unsupported) output = await inspectProjectPdf(blob,{window,kind:route.kind});
   } catch (_) { /* Unrecognized/malformed output can be copied, never updated. */ }
   if (output && !output.unsupported && !original?.metadata?.unsupported && isCurrent(ticket)) {
    if (route.kind === 'smartmatch') {
     projectKey = original?.metadata?.projectId || 'smartmatch-v35-'+ticket.runtime.key;
     projectExport = output.projectId === projectKey;
    } else if (route.kind === 'ce') {
     projectKey = ticket.runtime.key;
     projectExport = !!projectKey && output.projectId === projectKey;
    } else if (output.drawingHash && original) {
     projectKey = original.hash;
     projectExport = output.drawingHash === projectKey;
    }
    if (projectExport) {
     if (bound && (!sameRuntime(bound.runtime,ticket.runtime) || bound.generation !== generation || bound.projectKey !== projectKey || identityKey(bound.source) !== identity)) bound = null;
     if (!bound && pendingImport?.generation === generation && identityKey(pendingImport.source) === identity) {
      const imported = pendingImport;
      const matches = route.kind === 'smartmatch' || route.kind === 'ce'
       ? original?.hash === imported.hash
       : original?.hash === (imported.metadata?.drawingHash || imported.hash);
      if (matches) bound = {source:imported.source,runtime:ticket.runtime,generation,projectKey};
     }
     source = bound?.source || null;
     reason = source ? '' : 'Projektet har ingen verifierad SharePoint-källa. Spara det som en ny fil.';
    }
   }
  }
  if (!isCurrent(ownTicket)) reason = 'Projektet eller kontot har ändrats. Exportera det aktuella projektet igen.';
  const info = Object.freeze({projectExport,source,reason,isCurrent:()=>isCurrent(ownTicket)});
  inspections.set(info,{ticket:ownTicket,projectExport,projectKey});
  return info;
  });
 }
 function confirmSave(info,value) {
  const record = inspections.get(info), source = trustedSource(value);
  if (!record?.projectExport || !source || !info.isCurrent() || !identity || identityKey(source) !== identity) return false;
  bound = {source,runtime:record.ticket.runtime,generation,projectKey:record.projectKey};
  pendingImport = null; savedVersion++;
  return true;
 }
 function replace(object,key,wrap) {
  const original = object?.[key];
  if (typeof original !== 'function') return;
  const replacement = wrap(original); object[key] = replacement;
  restores.push(()=>{if(object[key] === replacement)object[key] = original;});
 }
 if (enabled) {
  const change = event => {
   const input = event.target;
   if (!route.inputs.includes(input?.id) || !input.files?.length) return;
   const expected = changes.get(input); changes.delete(input);
   if (expected?.generation === generation && expected.files.length === input.files.length && expected.files.every((file,index)=>file === input.files[index])) return;
   invalidate();
  };
  document.addEventListener('change',change,true);
  restores.push(()=>document.removeEventListener('change',change,true));
  const click = event => {
   const id = event.target?.closest?.('button,[role="button"]')?.id;
   if (['newServiceBtn','doorOpenNewService','secNewServiceBtn','secOpenNewService','pwFinishConfirm','ceCloseProject','ceHomeNew'].includes(id)) invalidate();
   if (route.kind === 'ce' && ['ceSavePdf','ceDialogSavePdf','ceShareProject','ceSharePrepare'].includes(id)) ceBuild = {generation,runtime:ceRuntime};
   // The older SmartMatch 'raw PDF copy' contains the original project's ID,
   // but not today's checks. A matching catalogue alone must never authorize
   // that download (or an attached working PDF) to replace the active source.
   exportIntent = FULL_PROJECT_ACTIONS[route.kind].includes(id) ? {generation,runtime:runtime()} : null;
  };
  document.addEventListener('click',click,true);
  restores.push(()=>document.removeEventListener('click',click,true));
  if (route.kind === 'smartmatch') {
   replace(window.SmartMatchAppBridge,'openCachedPdf',original=>function(...args){invalidate();return original.apply(this,args);});
   replace(window.SmartMatchAppBridge,'openReadFile',original=>function(...args){invalidate();return original.apply(this,args);});
  }
  if (route.kind === 'ce') {
   const module = window.TillsynoCETest;
   replace(module,'reset',original=>function(...args){invalidate();ceRuntime=null;return original.apply(this,args);});
   replace(module,'restore',original=>function(state,...args){invalidate();const result=original.call(this,state,...args);ceRuntime=state?.projectId?{kind:'ce',key:state.projectId,session:{},bytes:null}:null;return result;});
   replace(module,'initProject',original=>function(doc,state,bytes,...args){const result=original.call(this,doc,state,bytes,...args);ceRuntime=state?.projectId?{kind:'ce',key:state.projectId,session:{},bytes}:null;return result;});
   // Fresh CE projects receive their stable ID in the existing snapshot(). Its
   // serializer exposes that ID without reading private state. Only a current
   // explicit full-project save may establish this first runtime identity.
   replace(window.TillsynoCEStorage,'write',original=>function(doc,key,data){
    const result=original.call(this,doc,key,data);
    if(key==='TillsynoCETestData'&&nonempty(data?.projectId)&&!ceRuntime&&ceBuild?.generation===generation)ceRuntime={kind:'ce',key:data.projectId,session:{},bytes:null};
    return result;
   });
  }
 }
 return Object.freeze({observeImport,setIdentity,captureExport,inspectExport,confirmSave,
  clear:invalidate,
  uninstall(){if(!active)return;invalidate();active=false;restores.reverse().forEach(restore=>restore());},
 });
}
