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
 async file(driveId,id,accept){
  const path='/v1.0/drives/'+enc(driveId)+'/items/'+enc(id);
  let item=await this.json(path+'?$select=id,name,size,file,@microsoft.graph.downloadUrl');
  const validate=()=>{
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
