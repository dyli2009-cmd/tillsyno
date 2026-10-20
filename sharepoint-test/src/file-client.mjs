import {ReadOnlySharePoint, canonicalUrl, safeDownloadUrl} from './read-only.mjs';
import {MAX_FILE_BYTES} from './limits.mjs';
const enc=value=>encodeURIComponent(String(value));
const FOLDER_FIELDS='id,name,folder,file,remoteItem,deleted,parentReference,root';
const ROOT_STORE_PREFIX='tillsyno-sharepoint-root:v1:';
const DOWNLOAD_IDLE_MS=120000;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&value!=='.'&&value!=='..'&&!/[\s/\\?#\u0000-\u001f\u007f]/u.test(value);
function failure(message,code,status){const error=new Error(message);error.code=code;if(status)error.status=status;return error;}
function cancelled(){const error=failure('Hämtningen avbröts.','cancelled');error.name='AbortError';return error;}
function assertActive(signal){if(signal?.aborted)throw cancelled();}
function checkFolder(item,driveId,id){
 if(!object(item)||item.id!==id||!object(item.folder)||item.file||item.remoteItem||item.deleted||item.root||
  typeof item.name!=='string'||!item.name||item.parentReference?.driveId!==driveId||!identifier(item.parentReference?.id)){
  throw failure('Mappen kunde inte verifieras i det tillåtna SharePoint-biblioteket.','invalid_destination');
 }
 return item;
}
export const MIME={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',zip:'application/zip'};
// Optional presentation data from Graph. Keep it separate from source identity
// and never substitute the signed-in account or a client-generated timestamp.
export function serverModification(item){
 const result={},rawName=item?.lastModifiedBy?.user?.displayName;
 if(typeof rawName==='string'){
  const name=rawName.slice(0,1024).replace(/[\u0000-\u001f\u007f-\u009f]/gu,' ').replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,'').replace(/\s+/gu,' ').trim();
  const characters=Array.from(name);
  if(characters.length)result.lastModifiedBy={user:{displayName:characters.length>120?characters.slice(0,119).join('')+'…':name}};
 }
 const date=item?.lastModifiedDateTime;
 if(typeof date==='string'&&date.length<=40&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/u.test(date)&&Number.isFinite(Date.parse(date))){
  result.lastModifiedDateTime=date;
 }
 return result;
}
export function mimeFor(name){return MIME[String(name).split('.').pop().toLowerCase()]||'';}
export function accepts(name,accept=''){
 const mime=mimeFor(name);if(!mime)return false;
 const rules=accept.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 return !rules.length||rules.some(r=>r.startsWith('.')?name.toLowerCase().endsWith(r):r.endsWith('/*')?mime.startsWith(r.slice(0,-1)):r===mime||(mime==='application/zip'&&r==='application/x-zip-compressed'));
}
export class SharePointFiles extends ReadOnlySharePoint{
 constructor({getToken,fetchImpl=globalThis.fetch.bind(globalThis),maxBytes=MAX_FILE_BYTES,rootStore=null,getContextKey=null}){
  super({getToken,fetchImpl,maxBytes});
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_FILE_BYTES)throw new TypeError('Ogiltig filstorleksgräns.');
  if(getContextKey!==null&&typeof getContextKey!=='function')throw new TypeError('Kontonyckeln måste vara en funktion.');
  if(rootStore&&(!getContextKey||typeof rootStore.getItem!=='function'||typeof rootStore.setItem!=='function'))throw new TypeError('Beständig mappkoppling kräver lagring och en kontonyckel.');
  this.rootStore=rootStore;this.getContextKey=getContextKey;this.rootReferences=new Map();
 }
 contextKey(){
  if(!this.getContextKey)return '';
  const value=this.getContextKey();
  if(typeof value!=='string'||!value||value.length>4096)throw failure('Inloggningen måste verifieras innan SharePoint-mappen kan öppnas.','access_changed');
  return value;
 }
 assertContext(expected){if(this.contextKey()!==expected)throw failure('Inloggningen ändrades. Öppna SharePoint på nytt.','access_changed');}
 rootReference(key){
  if(this.rootReferences.has(key))return this.rootReferences.get(key);
  if(!this.rootStore)return null;
  let text,value;
  try{text=this.rootStore.getItem(key);}
  catch{this.rootStore=null;return null;}
  if(text===null||text===undefined)return null;
  try{value=JSON.parse(text);}
  catch{throw failure('Den sparade mappkopplingen kunde inte läsas. Ingen annan mapp har valts.','invalid_root_reference');}
  if(!object(value)||value.version!==1||!identifier(value.siteId)||!identifier(value.driveId)||!identifier(value.folderId)){
   throw failure('Den sparade mappkopplingen är ogiltig. Ingen annan mapp har valts.','invalid_root_reference');
  }
  this.rootReferences.set(key,value);return value;
 }
 async root(config){
  if(!object(config)||typeof config.siteUrl!=='string'||typeof config.libraryServerRelativePath!=='string'||typeof config.folderPath!=='string')throw failure('Inställningarna för SharePoint-mappen saknas.','invalid_destination');
  config={siteUrl:config.siteUrl,libraryServerRelativePath:config.libraryServerRelativePath,folderPath:config.folderPath};
  const siteUrl=new URL(config.siteUrl);
  if(siteUrl.protocol!=='https:'||!/^[a-z0-9-]+\.sharepoint\.com$/i.test(siteUrl.hostname)||siteUrl.username||siteUrl.password||siteUrl.search||siteUrl.hash||siteUrl.port)throw Error('Ogiltig SharePoint-webbplats.');
  if(!config.libraryServerRelativePath.startsWith('/')||config.libraryServerRelativePath.startsWith('//')||/[?#]/u.test(config.libraryServerRelativePath))throw Error('Ogiltigt dokumentbibliotek.');
  const parts=config.folderPath.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[\\\u0000-\u001f\u007f]/u.test(p)))throw Error('Ogiltig mappsökväg.');
  const context=this.contextKey();
  const key=ROOT_STORE_PREFIX+enc(JSON.stringify([context,canonicalUrl(config.siteUrl),canonicalUrl(siteUrl.origin+config.libraryServerRelativePath),config.folderPath]));
  const reference=this.rootReference(key);
  const sitePath=siteUrl.pathname.split('/').filter(Boolean).map(p=>enc(decodeURIComponent(p))).join('/');
  const site=await this.json('/v1.0/sites/'+siteUrl.hostname+(sitePath?':/'+sitePath:''));
  this.assertContext(context);
  if(!identifier(site?.id)||canonicalUrl(site.webUrl)!==canonicalUrl(config.siteUrl))throw Error('Fel SharePoint-webbplats.');
  const drives=await this.all('/v1.0/sites/'+enc(site.id)+'/drives');
  this.assertContext(context);
  const drive=drives.find(d=>d.webUrl&&canonicalUrl(d.webUrl)===canonicalUrl(siteUrl.origin+config.libraryServerRelativePath));
  if(!drive||!identifier(drive.id))throw Error('Dokumentbiblioteket hittades inte.');
  if(reference&&(reference.siteId!==site.id||reference.driveId!==drive.id))throw failure('Den sparade mappen tillhör inte det aktuella dokumentbiblioteket. Ingen annan mapp har valts.','root_changed');
  let folder;
  try{
   folder=await this.json('/v1.0/drives/'+enc(drive.id)+(reference?'/items/'+enc(reference.folderId):'/root:/'+parts.map(enc).join('/'))+'?$select='+FOLDER_FIELDS);
  }catch(error){
   if(reference&&(error.status===404||error.status===410))throw failure('Den tidigare valda SharePoint-mappen finns inte längre eller kan inte nås. Ingen ny mapp med samma namn har valts.','root_missing',error.status);
   throw error;
  }
  this.assertContext(context);
  if(!identifier(folder?.id))throw failure('SharePoint-mappen kunde inte identifieras.','invalid_destination');
  checkFolder(folder,drive.id,reference?reference.folderId:folder.id);
  if(!reference){
   const next={version:1,siteId:site.id,driveId:drive.id,folderId:folder.id};
   const concurrent=this.rootReference(key);
   if(concurrent&&(concurrent.siteId!==next.siteId||concurrent.driveId!==next.driveId||concurrent.folderId!==next.folderId))throw failure('Mappkopplingen ändrades under öppningen. Uppdatera och försök igen.','root_changed');
   if(this.rootStore){
    try{this.rootStore.setItem(key,JSON.stringify(next));}
    catch{this.rootStore=null;/* Continue with this session's fixed folder ID. */}
   }
   this.rootReferences.set(key,next);
  }
  return {driveId:drive.id,id:folder.id,name:folder.name};
 }
 async folderTrail(root,folderId){
  if(!identifier(root?.driveId)||!identifier(root?.id)||!identifier(folderId))throw failure('Mappens identitet saknas. Öppna SharePoint på nytt.','invalid_destination');
  const context=this.contextKey(),visited=new Set(),trail=[];
  let id=folderId;
  for(let depth=0;depth<64;depth++){
   if(!identifier(id)||visited.has(id))break;
   visited.add(id);
   const item=await this.json('/v1.0/drives/'+enc(root.driveId)+'/items/'+enc(id)+'?$select='+FOLDER_FIELDS);
   this.assertContext(context);
   checkFolder(item,root.driveId,id);
   trail.push({id:item.id,name:item.name});
   if(id===root.id)return trail.reverse();
   id=item.parentReference.id;
  }
  throw failure('Mappen ligger inte under den valda SharePoint-mappen.','invalid_destination');
 }
 children(driveId,id){return this.all('/v1.0/drives/'+enc(driveId)+'/items/'+enc(id)+'/children?$select=id,name,size,file,folder,lastModifiedBy,lastModifiedDateTime');}
 async fileWithSource(driveId,id,accept,{signal,onProgress}={}){
  // Bind the downloaded bytes to one stable cloud revision. The ordinary
  // read-only file() API is unchanged for callers that do not save back.
  const validId=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&!/[\s/\\?#\u0000-\u001f\u007f]/u.test(value)&&value!=='.'&&value!=='..';
  if(!validId(driveId)||!validId(id))throw Error('SharePoint-filen kunde inte identifieras. Öppna den igen.');
  const path='/v1.0/drives/'+enc(driveId)+'/items/'+enc(id)+'?$select=id,name,size,file,folder,remoteItem,deleted,parentReference,eTag';
  const readSource=async()=>{
   assertActive(signal);
   const item=await this.json(path),parent=item?.parentReference;
   assertActive(signal);
   if(item?.id!==id||!item.file||item.folder||item.remoteItem||item.deleted||parent?.driveId!==driveId||!validId(parent?.id)||
    !Number.isSafeInteger(item.size)||item.size<1||typeof item.name!=='string'||!accepts(item.name,accept)||
    typeof item.eTag!=='string'||!item.eTag||item.eTag.length>4096||/[\u0000-\u001f\u007f]/u.test(item.eTag)){
    throw Error('Filens plats eller version kunde inte verifieras. Uppdatera fillistan och försök igen.');
   }
   return {driveId,id,parentId:parent.id,name:item.name,size:item.size,eTag:item.eTag};
  };
  const before=await readSource();
  const file=await this.file(driveId,id,accept,before,{signal,onProgress});
  const source=await readSource();
  if(before.eTag!==source.eTag||before.parentId!==source.parentId||before.name!==source.name||before.size!==source.size||
   file.name!==source.name||file.size!==source.size){
   throw Error('Filen ändrades medan den hämtades. Öppna den senaste versionen igen.');
  }
  return {file,source};
 }
 async file(driveId,id,accept,expectedSource=null,{signal,onProgress}={}){
  assertActive(signal);
  const path='/v1.0/drives/'+enc(driveId)+'/items/'+enc(id);
  const fields=expectedSource?'id,name,size,file,folder,remoteItem,deleted,parentReference,eTag,@microsoft.graph.downloadUrl':'id,name,size,file,@microsoft.graph.downloadUrl';
  let item=await this.json(path+'?$select='+fields);
  const validate=()=>{
   assertActive(signal);
   if(expectedSource&&(item?.id!==id||item.folder||item.remoteItem||item.deleted||item.parentReference?.driveId!==driveId||
    item.parentReference?.id!==expectedSource.parentId||item.eTag!==expectedSource.eTag||item.name!==expectedSource.name||item.size!==expectedSource.size)){
    throw Error('Filens plats eller version ändrades före hämtningen. Öppna filen igen.');
   }
   if(!item.file||!accepts(item.name,accept))throw Error('Filtypen kan inte öppnas med den valda knappen.');
   if(!Number.isSafeInteger(item.size)||item.size<1)throw Error('Filens storlek kunde inte verifieras.');
   if(item.size>this.maxBytes)throw Error('SharePoint-testet tillåter högst '+(this.maxBytes/1024/1024)+' MiB per fil.');
  };
  validate();
  if(!item['@microsoft.graph.downloadUrl']){item=await this.json(path);validate();}
  const url=safeDownloadUrl(item['@microsoft.graph.downloadUrl']);
  const controller=new AbortController();let reader,timer,timedOut=false,size=0;const chunks=[];
  const stop=()=>{controller.abort();if(reader)void reader.cancel().catch(()=>{});};
  const resetIdle=()=>{clearTimeout(timer);timer=setTimeout(()=>{timedOut=true;stop();},DOWNLOAD_IDLE_MS);};
  const active=()=>{assertActive(signal);if(timedOut)throw failure('Inga filbytes har kommit från SharePoint på två minuter. Kontrollera anslutningen och försök igen.','download_timeout');};
  const progress=()=>{try{onProgress?.({loaded:size,total:item.size});}catch{/* UI feedback does not alter the original file. */}};
  signal?.addEventListener('abort',stop,{once:true});
  try{
   active();resetIdle();progress();active();
   const response=await this.fetch(url,{method:'GET',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal});
   active();
   if(!response.ok)throw Error('Filen kunde inte hämtas (HTTP '+response.status+').');
   reader=response.body?.getReader();if(!reader)throw Error('Webbläsaren saknar stöd för filhämtning.');
   while(true){
    const {value,done}=await reader.read();active();if(done)break;
    size+=value.byteLength;
    if(size>this.maxBytes||size>item.size){await reader.cancel();throw Error('Filens byteantal överskrider den verifierade storleken eller gränsen '+(this.maxBytes/1024/1024)+' MiB.');}
    chunks.push(value);resetIdle();progress();active();
   }
   if(size!==item.size)throw Error('Hela filen kunde inte hämtas. Öppna filen igen.');
  }catch(error){active();throw error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);reader?.releaseLock();}
  const blob=new Blob(chunks,{type:mimeFor(item.name)});
  if(blob.type==='application/pdf'&&await blob.slice(0,5).text()!=='%PDF-')throw Error('Filen har ingen giltig PDF-signatur.');
  assertActive(signal);
  return new File([blob],item.name,{type:blob.type});
 }
}
