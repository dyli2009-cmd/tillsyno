import {ReadOnlySharePoint, canonicalUrl, safeDownloadUrl} from './read-only.mjs';
const enc=value=>encodeURIComponent(String(value));
export const MIME={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',zip:'application/zip'};
export function mimeFor(name){return MIME[String(name).split('.').pop().toLowerCase()]||'';}
export function accepts(name,accept=''){
 const mime=mimeFor(name);if(!mime)return false;
 const rules=accept.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 return !rules.length||rules.some(r=>r.startsWith('.')?name.toLowerCase().endsWith(r):r.endsWith('/*')?mime.startsWith(r.slice(0,-1)):r===mime||(mime==='application/zip'&&r==='application/x-zip-compressed'));
}
export class SharePointFiles extends ReadOnlySharePoint{
 async root(config){
  const siteUrl=new URL(config.siteUrl);
  if(siteUrl.protocol!=='https:'||!/^[a-z0-9-]+\.sharepoint\.com$/i.test(siteUrl.hostname))throw Error('Ogiltig SharePoint-webbplats.');
  const sitePath=siteUrl.pathname.split('/').filter(Boolean).map(p=>enc(decodeURIComponent(p))).join('/');
  const site=await this.json('/v1.0/sites/'+siteUrl.hostname+(sitePath?':/'+sitePath:''));
  if(canonicalUrl(site.webUrl)!==canonicalUrl(config.siteUrl))throw Error('Fel SharePoint-webbplats.');
  const drives=await this.all('/v1.0/sites/'+enc(site.id)+'/drives');
  const drive=drives.find(d=>d.webUrl&&canonicalUrl(d.webUrl)===canonicalUrl(siteUrl.origin+config.libraryServerRelativePath));
  if(!drive)throw Error('Dokumentbiblioteket hittades inte.');
  const parts=String(config.folderPath).split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'))throw Error('Ogiltig testmapp.');
  const folder=await this.json('/v1.0/drives/'+enc(drive.id)+'/root:/'+parts.map(enc).join('/')+'?$select=id,name,folder');
  if(!folder.id||!folder.folder)throw Error('GStest är inte en mapp.');
  return {driveId:drive.id,id:folder.id,name:folder.name};
 }
 children(driveId,id){return this.all('/v1.0/drives/'+enc(driveId)+'/items/'+enc(id)+'/children?$select=id,name,size,file,folder');}
 async fileWithSource(driveId,id,accept){
  // Bind the downloaded bytes to one stable cloud revision. The ordinary
  // read-only file() API is unchanged for callers that do not save back.
  const validId=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&!/[\s/\\?#\u0000-\u001f\u007f]/u.test(value)&&value!=='.'&&value!=='..';
  if(!validId(driveId)||!validId(id))throw Error('SharePoint-filen kunde inte identifieras. Öppna den igen.');
  const path='/v1.0/drives/'+enc(driveId)+'/items/'+enc(id)+'?$select=id,name,size,file,folder,remoteItem,deleted,parentReference,eTag';
  const readSource=async()=>{
   const item=await this.json(path),parent=item?.parentReference;
   if(item?.id!==id||!item.file||item.folder||item.remoteItem||item.deleted||parent?.driveId!==driveId||!validId(parent?.id)||
    !Number.isSafeInteger(item.size)||item.size<1||typeof item.name!=='string'||!accepts(item.name,accept)||
    typeof item.eTag!=='string'||!item.eTag||item.eTag.length>4096||/[\u0000-\u001f\u007f]/u.test(item.eTag)){
    throw Error('Filens plats eller version kunde inte verifieras. Uppdatera fillistan och försök igen.');
   }
   return {driveId,id,parentId:parent.id,name:item.name,size:item.size,eTag:item.eTag};
  };
  const before=await readSource();
  const file=await this.file(driveId,id,accept,before);
  const source=await readSource();
  if(before.eTag!==source.eTag||before.parentId!==source.parentId||before.name!==source.name||before.size!==source.size||
   file.name!==source.name||file.size!==source.size){
   throw Error('Filen ändrades medan den hämtades. Öppna den senaste versionen igen.');
  }
  return {file,source};
 }
 async file(driveId,id,accept,expectedSource=null){
  const path='/v1.0/drives/'+enc(driveId)+'/items/'+enc(id);
  const fields=expectedSource?'id,name,size,file,folder,remoteItem,deleted,parentReference,eTag,@microsoft.graph.downloadUrl':'id,name,size,file,@microsoft.graph.downloadUrl';
  let item=await this.json(path+'?$select='+fields);
  const validate=()=>{
   if(expectedSource&&(item?.id!==id||item.folder||item.remoteItem||item.deleted||item.parentReference?.driveId!==driveId||
    item.parentReference?.id!==expectedSource.parentId||item.eTag!==expectedSource.eTag||item.name!==expectedSource.name||item.size!==expectedSource.size)){
    throw Error('Filens plats eller version ändrades före hämtningen. Öppna filen igen.');
   }
   if(!item.file||!accepts(item.name,accept))throw Error('Filtypen kan inte öppnas med den valda knappen.');
   if(item.size>this.maxBytes)throw Error('Testet tillåter högst 25 MB per fil.');
  };
  validate();
  if(!item['@microsoft.graph.downloadUrl']){item=await this.json(path);validate();}
  const response=await this.fetch(safeDownloadUrl(item['@microsoft.graph.downloadUrl']),{method:'GET',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Filen kunde inte hämtas (HTTP '+response.status+').');
  const reader=response.body?.getReader();if(!reader)throw Error('Webbläsaren saknar stöd för filhämtning.');
  let size=0;const chunks=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>this.maxBytes){await reader.cancel();throw Error('Filen är större än 25 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
  const blob=new Blob(chunks,{type:mimeFor(item.name)});
  if(blob.type==='application/pdf'&&await blob.slice(0,5).text()!=='%PDF-')throw Error('Filen har ingen giltig PDF-signatur.');
  return new File([blob],item.name,{type:blob.type});
 }
}
