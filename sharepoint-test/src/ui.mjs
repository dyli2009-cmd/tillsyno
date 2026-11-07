/* Shared presentation for the isolated SharePoint pickers. The app supplies
 * dynamic file/account text via textContent; no state belongs in this module. */
import {MAX_FILE_MB,MAX_SELECTION_MB} from './limits.mjs';
import {serverModification} from './file-client.mjs';
export function lastModifiedText(item){
 const metadata=serverModification(item),name=metadata.lastModifiedBy?.user?.displayName||'namn saknas';
 const date=metadata.lastModifiedDateTime?new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(metadata.lastModifiedDateTime)):'tid saknas';
 return 'Senast ändrad i SharePoint: '+name+' · '+date;
}
const paths=Object.freeze({
 cloud:'<path d="M6.2 18a4.2 4.2 0 0 1-.8-8.3A6.5 6.5 0 0 1 18 8.4 4.8 4.8 0 0 1 18.2 18Z"/>',
 folder:'<path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/>',
 file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 save:'<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 device:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1a8.3 8.3 0 0 1 13.7 4M4.2 13.9a8.3 8.3 0 0 0 13.7 4"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
 account:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
 disconnect:'<path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M9 12h12m-4-4 4 4-4 4"/>',
});
export function icon(name){return '<svg class="spIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[name]||paths.file)+'</svg>';}
export function setButtonLabel(button,text,iconName){
 if(!button)return;let label=button.querySelector('.spButtonLabel');
 if(!label||iconName){button.replaceChildren();if(iconName)button.insertAdjacentHTML('beforeend',icon(iconName));label=button.ownerDocument.createElement('span');label.className='spButtonLabel';button.append(label);}
 label.textContent=text;
}
const content=(name,label)=>icon(name)+'<span class="spButtonLabel">'+label+'</span>';
export function filePickerMarkup(){return `<form method="dialog" class="spHead">
 <div class="spHeading"><span class="spHeadingIcon">${icon('cloud')}</span><div><span class="spEyebrow">SHAREPOINT</span><h2 id="spFileTitle">Öppna fil</h2></div></div>
 <button class="spIconButton spClose" aria-label="Stäng filväljaren">${icon('close')}</button>
</form>
<div class="spActions spSourceActions"><button id="spConnect" class="spPrimary" type="button">${content('cloud','Anslut Microsoft')}</button><button id="spLocal" class="spSecondary" type="button">${content('device','Den här enheten')}</button></div>
<div class="spFolderToolbar"><nav id="spCrumbs" class="spCrumbs" aria-label="SharePoint-mappar"></nav><button id="spReload" class="spIconButton" type="button" hidden aria-label="Uppdatera filer" title="Uppdatera filer">${icon('refresh')}</button></div>
<ul id="spFiles" class="spFileList" aria-label="Filer och mappar"></ul>
<progress id="spReadProgress" max="100" value="0" hidden aria-label="Hämtning från SharePoint"></progress>
<p id="spStatus" class="spStatus" role="status" aria-live="polite"></p>
<details id="spFileOptions" class="spDetails"><summary>${icon('account')}<span>Konto &amp; alternativ</span>${icon('chevron')}</summary><div class="spDetailsBody"><p id="spAccount" class="spAccount"></p><button id="spDisconnect" class="spQuiet" type="button" hidden>${content('disconnect','Koppla från')}</button><p class="spNote">Högst ${MAX_FILE_MB} MB per fil, ${MAX_SELECTION_MB} MB per val.</p></div></details>
<div class="spFooter"><button id="spImport" class="spPrimary" type="button" disabled>${content('file','Öppna i appen')}</button></div>`;}
export function savePickerMarkup(){return `<div class="spHead">
 <div class="spHeading"><span class="spHeadingIcon">${icon('save')}</span><div><span class="spEyebrow">SHAREPOINT</span><h2 id="spSaveTitle">Spara fil</h2></div></div>
 <button id="spSaveCancel" class="spIconButton spClose" type="button" aria-label="Avbryt sparandet">${icon('close')}</button>
</div>
<p id="spSaveSummary" class="spSummary"></p>
<div id="spSaveModes" class="spModeSwitch" role="group" aria-label="Hur filen ska sparas"><button id="spSaveUpdate" type="button" aria-pressed="true">${content('save','Samma fil')}</button><button id="spSaveCopy" type="button" aria-pressed="false">${content('copy','Ny kopia')}</button></div>
<div id="spSaveExisting" class="spExisting" hidden><span class="spExistingIcon">${icon('file')}</span><div class="spExistingText"><strong id="spSaveExistingName"></strong><span id="spSaveExistingFolder"></span></div><span class="spExistingCheck">${icon('check')}</span></div>
<div id="spSaveCopyFields" class="spCopyFields"><label class="spFieldLabel" for="spSaveName">Filnamn</label><input id="spSaveName" type="text" maxlength="220" autocomplete="off" spellcheck="false">
 <div class="spFolderToolbar"><div class="spDestination"><span class="spFieldLabel">Spara i</span><nav id="spSaveCrumbs" class="spCrumbs" aria-label="Sparmapp i SharePoint"></nav></div><button id="spSaveReload" class="spIconButton" type="button" aria-label="Uppdatera mappar" title="Uppdatera mappar">${icon('refresh')}</button></div><ul id="spSaveFolders" class="spFolderList" aria-label="Undermappar"></ul>
</div>
<div class="spActions spConnection"><button id="spSaveConnect" class="spSecondary" type="button">${content('cloud','Anslut Microsoft')}</button></div>
<progress id="spSaveProgress" max="100" value="0" hidden aria-label="Uppladdning till SharePoint"></progress><p id="spSaveStatus" class="spStatus" role="status" aria-live="polite"></p>
<details id="spSaveOptions" class="spDetails"><summary>${icon('account')}<span>Konto &amp; alternativ</span>${icon('chevron')}</summary><div class="spDetailsBody"><p id="spSaveAccount" class="spAccount"></p><p class="spNote">Upp till ${MAX_FILE_MB} MB. Microsoft kan be om skrivåtkomst första gången.</p></div></details>
<div class="spSaveButtons spFooter"><button id="spSaveSubmit" class="spPrimary" type="button" disabled>${content('save','Spara i SharePoint')}</button><button id="spSaveLocal" class="spSecondary" type="button">${content('device','Den här enheten')}</button></div>`;}
