/* Shared project identity only. Per-door checks and technician signatures are never imported. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TillsynoProjectInfo=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const Times=typeof module==='object'&&module.exports?require('./tillsyno-projection-times-v513.js'):globalThis.TillsynoProjectionTimes;
 const KEY='TillsynoProjectInfoV1';
 const fields=['facilityNo','order','company','companyContact','companyPhone','companyAddress','companyPostalCode','companyPostalCity','customer','contact','phone','address','postalCode','postalCity'];
 function fromProject(project){const d=project?.details||{},meta={projectName:String(project?.name||''),designer:String(d.designer||'')};for(const k of fields)meta[k]=String(d[k]||'');return {projectMeta:meta,projectLogoData:d.logo?.dataUrl||''};}
 function write(doc,project,L,projectionTimes){doc.catalog.set(L.PDFName.of(KEY),L.PDFHexString.fromText(JSON.stringify({version:1,...fromProject(project),...(projectionTimes?{projectionTimes:Times.validate(projectionTimes)}:{})})));}
 function read(doc,L){
  const raw=doc.catalog.get(L.PDFName.of(KEY));if(!raw)return {};
  const object=doc.context.lookup(raw),hex=object.asString?.();let text='';
  if(typeof hex==='string'&&hex.startsWith('FEFF')){
   for(let offset=4;offset<hex.length;offset+=32768){const codes=[];for(let i=offset;i<Math.min(hex.length,offset+32768);i+=4)codes.push(parseInt(hex.slice(i,i+4),16));text+=String.fromCharCode(...codes);}
  }else text=object.decodeText();
  const data=JSON.parse(text);if(data.version!==1||!data.projectMeta||typeof data.projectMeta!=='object')throw Error('Projektuppgifternas format stöds inte.');
  const meta={};for(const k of ['projectName','designer',...fields]){const v=data.projectMeta[k];if(v!==undefined){if(typeof v!=='string'||v.length>500)throw Error('Ogiltiga projektuppgifter: '+k);meta[k]=v;}}
  const logo=data.projectLogoData||'';if(typeof logo!=='string'||logo.length>1400000||(logo&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)))throw Error('Projektets logga är ogiltig.');
  return {projectMeta:meta,projectLogoData:logo,...(data.projectionTimes?{timeConfig:{projectionTimes:Times.validate(data.projectionTimes)}}:{})};
 }
 function merge(imported,saved){const result={...(saved||{})};if(imported?.projectMeta||saved?.projectMeta)result.projectMeta={...(imported?.projectMeta||{}),...(saved?.projectMeta||{})};if(!Object.prototype.hasOwnProperty.call(result,'projectLogoData')&&Object.prototype.hasOwnProperty.call(imported||{},'projectLogoData'))result.projectLogoData=imported.projectLogoData;if(imported?.timeConfig||saved?.timeConfig)result.timeConfig={...(imported?.timeConfig||{}),...(saved?.timeConfig||{})};return result;}
 return {KEY,fields,fromProject,write,read,merge};
});
