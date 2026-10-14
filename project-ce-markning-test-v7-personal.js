/* CE TEST 7 – device-local, account-separated field presets and portable admin risk presets. */
(function () {
 'use strict';
 const FORMAT='Tillsyno CE riskmall 1',PREFIX='tillsyno-ce-test-7-account:';
 const fieldGroups=Object.freeze({
  performer:['technician','technicianCompany','technicianPhone','company','companyAddress','companyPostalPlace','companyOrgNo','companyContact','companyPhone','slrAuthorisation','documentationName','documentationAddress','documentationPostalPlace','egSignerName','egSignerTitle'],
  customer:['customer','address','customerPostalPlace','contact','phone']
 });
 const types=['glass','noGlass'];
 const cleanText=v=>typeof v==='string'?v.slice(0,400):'';
 function key(userId){if(typeof userId!=='string'||!userId.trim())throw Error('Inloggat användarkonto saknas.');return PREFIX+encodeURIComponent(userId);}
 function raw(userId){try{const data=JSON.parse(localStorage.getItem(key(userId))||'null');return data&&data.schema===1&&typeof data==='object'?data:{schema:1,groups:{},preset:null};}catch(_){return {schema:1,groups:{},preset:null};}}
 function write(userId,data){localStorage.setItem(key(userId),JSON.stringify(data));}
 function saveGroup(userId,meta,group){const keys=fieldGroups[group];if(!keys)throw Error('Okänd uppgiftsgrupp.');const data=raw(userId),fields={};for(const name of keys){const value=cleanText(meta?.[name]);if(value.trim())fields[name]=value;}if(!Object.keys(fields).length)throw Error('Fyll i uppgifter innan du sparar dem.');data.groups={...data.groups,[group]:fields};write(userId,data);return Object.keys(fields).length;}
 function getGroup(userId,group){if(!fieldGroups[group])throw Error('Okänd uppgiftsgrupp.');const found=raw(userId).groups?.[group]||{},out={};for(const name of fieldGroups[group])if(typeof found[name]==='string')out[name]=cleanText(found[name]);return out;}
 function isRiskChoice(name,value){
  return (/^4\.4 Risknivå(?: .*)?$/.test(name)||/^4\.6\.\d+(?: [^\r\n]{1,40})?$/.test(name))
    &&(typeof value==='boolean'||typeof value==='string'&&value.length<=100&&!/\r|\n/.test(value));
 }
 function normalizePreset(candidate){
  if(!candidate||candidate.format!==FORMAT||candidate.schema!==1)throw Error('Det här är inte en CE-adminmall från TEST 7.');
  const result={format:FORMAT,schema:1,profiles:{glass:{Riskanalys:{}},noGlass:{Riskanalys:{}}}};
  for(const type of types){
   const risk=candidate.profiles?.[type]?.Riskanalys;
   if(!risk||typeof risk!=='object'||Array.isArray(risk))continue;
   for(const [name,value] of Object.entries(risk))if(isRiskChoice(name,value))result.profiles[type].Riskanalys[name]=value;
  }
  return result;
 }
 function capturePreset(profileData){
  return normalizePreset({format:FORMAT,schema:1,profiles:profileData});
 }
 function savePreset(userId,candidate){const data=raw(userId);data.preset=normalizePreset(candidate);write(userId,data);return data.preset;}
 function getPreset(userId){const saved=raw(userId).preset;try{return saved?normalizePreset(saved):null;}catch(_){return null;}}
 function applyPreset(profiles,preset){
  const clean=normalizePreset(preset);
  for(const type of types){
   if(!profiles[type])profiles[type]={};
   const existing={...(profiles[type].Riskanalys||{})};
   for(const [name,value] of Object.entries(existing))if(isRiskChoice(name,value))delete existing[name];
   profiles[type].Riskanalys={...existing,...clean.profiles[type].Riskanalys};
  }
  return clean;
 }
 window.TillsynoCEPersonal={fieldGroups,saveGroup,getGroup,capturePreset,savePreset,getPreset,applyPreset,normalizePreset,format:FORMAT};
})();
