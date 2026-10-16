(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 let users = [], busy = false, loaded = false, loadError = '', filter = 'all';
 let pendingRemove = null, editingUser = null, editingApproval = null;
 const labels = {active:'Godkänd', invited:'Bekräfta e-post', pending:'Väntar på beslut', removed:'Åtkomst borttagen', expired:'Licens utgången', revoked:'Licens avslutad'};
 const moduleNames = {smartmatch:'SmartMatch', control:'Kontrollflöde', drawing:'Ritningsverktyg'};
 const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
 };
 const emailMatches = () => !!pendingRemove && $('confirmDeleteEmail').value.trim().toLowerCase() === pendingRemove.email.toLowerCase();
 const person = user => user.name ? user.name + ' · ' + user.email : user.email;
 const date = value => new Date(Date.parse(value) - 1000).toLocaleDateString('sv-SE', {timeZone:'Europe/Stockholm'});
 const priority = user => user.protected ? 9 : user.status === 'pending' ? 0 : ['active','invited'].includes(user.status) ? 1 : 2;
 function notice(text, type = 'success') {
  $('message').textContent = text;
  $('message').className = 'notice ' + type;
  $('message').hidden = false;
 }
 function accessNote(user) {
  if (user.protected) return 'Alla moduler · ingen tidsgräns';
  if (user.status === 'pending') return user.emailVerified ? 'Välj moduler och licenstid för att godkänna.' : 'Personen behöver bekräfta sin e-postadress först.';
  if (user.status === 'removed') return 'Godkänn igen för att ge ny åtkomst.';
  if (user.status === 'revoked') return 'Kontot finns kvar. En ny licens kan tilldelas.';
  if (!user.expiresAt) return 'Ingen tidsgräns';
  return (Date.parse(user.expiresAt) <= Date.now() ? 'Gick ut ' : 'Gäller till och med ') + date(user.expiresAt);
 }
 function render() {
  $('activeCount').textContent = users.filter(u => ['active','invited'].includes(u.status)).length;
  $('pendingCount').textContent = users.filter(u => u.status === 'pending').length;
  $('totalCount').textContent = users.length;
  document.querySelectorAll('[data-user-filter]').forEach(b => {
   b.setAttribute('aria-pressed', String(b.dataset.userFilter === filter));
   b.disabled = busy;
  });
  const query = $('search').value.trim().toLocaleLowerCase('sv');
  const filtered = users.filter(u => (filter === 'all' || (filter === 'pending' ? u.status === 'pending' : ['active','invited'].includes(u.status))) && ((u.name || '') + ' ' + u.email).toLocaleLowerCase('sv').includes(query));
  $('listHeading').textContent = {all:'Alla användare', pending:'Väntande ansökningar', active:'Godkända användare'}[filter];
  $('listCount').textContent = loaded ? filtered.length + (filtered.length === 1 ? ' konto' : ' konton') : '';
  $('users').setAttribute('aria-busy', String(busy));
  $('users').replaceChildren();
  for (const user of filtered) {
   const row = node('li', 'userrow');
   const identity = node('div', 'identity');
   const initials = user.name ? user.name.trim().split(/\s+/).slice(0,2).map(n => n[0]).join('') : user.email.slice(0,2);
   const avatar = node('span', 'avatar', initials.toUpperCase());
   avatar.setAttribute('aria-hidden', 'true');
   const info = node('div', 'userInfo');
   info.append(node('strong', '', user.name || user.email), node('small', '', user.email));
   if (!user.protected && user.modules?.length && user.status !== 'pending') {
    const modules = node('div', 'userModules');
    user.modules.forEach(value => { if (moduleNames[value]) modules.append(node('span', '', moduleNames[value])); });
    info.append(modules);
   }
   identity.append(avatar, info);
   const status = node('div', 'userStatus');
   const label = user.protected ? 'Administratör' : user.status === 'pending' && !user.emailVerified ? 'Bekräfta e-post' : labels[user.status] || 'Kontrollera åtkomst';
   status.append(node('span', 'badge ' + user.status, label), node('small', 'accessNote', accessNote(user)));
   const actions = node('div', 'actions');
   const button = (text, action, style = 'secondary') => {
    const b = node('button', style, text);
    b.type = 'button'; b.disabled = busy;
    b.addEventListener('click', () => void perform(action, user));
    actions.append(b); return b;
   };
   if (user.protected) actions.append(node('span', 'ownerlabel', 'Skyddat konto'));
   else {
    if (user.status === 'pending' || user.status === 'removed') {
     const approve = button(user.status === 'pending' ? 'Godkänn' : 'Återaktivera', 'approve', 'primary');
     if (!user.emailVerified) { approve.disabled = true; approve.title = 'E-postadressen måste bekräftas först.'; }
    } else button('Behörighet & licens', 'license');
    const menu = node('details', 'userMenu');
    const toggle = node('summary', '');
    toggle.setAttribute('aria-label', 'Fler åtgärder för ' + (user.name || user.email));
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
    toggle.addEventListener('click', event => { if (busy) event.preventDefault(); });
    menu.addEventListener('toggle', () => { if (menu.open) document.querySelectorAll('.userMenu[open]').forEach(other => { if (other !== menu) other.open = false; }); });
    const options = node('div', 'userMenuOptions');
    const remove = node('button', 'danger', 'Radera konto'); remove.type = 'button'; remove.disabled = busy;
    remove.addEventListener('click', () => { menu.open = false; void perform('delete', user); });
    options.append(remove); menu.append(toggle, options); actions.append(menu);
   }
   row.append(identity, status, actions); $('users').append(row);
  }
  $('empty').hidden = filtered.length > 0;
  $('empty').textContent = loadError || (!loaded ? 'Hämtar användare…' : query ? 'Ingen användare matchar din sökning.' : filter === 'pending' ? 'Inga ansökningar väntar på beslut.' : filter === 'active' ? 'Inga godkända användare ännu.' : 'Inga användare hittades.');
 }
 function setBusy(value) {
  busy = value;
  $('refresh').disabled = value;
  document.querySelectorAll('dialog:not(.ta-modal) button, dialog:not(.ta-modal) input, dialog:not(.ta-modal) select').forEach(el => el.disabled = value);
  $('confirmRemove').disabled = value || !emailMatches();
  $('cancelLicense').disabled = value || editingUser?.status === 'revoked';
  render();
 }
 async function load() {
  if (busy) return;
  setBusy(true);
  try {
   users = (await window.TillsynoAuth.admin('list')).users.sort((a,b) => priority(a) - priority(b) || a.email.localeCompare(b.email, 'sv'));
   loaded = true; loadError = '';
  } catch (error) {
   loadError = 'Listan kunde inte hämtas. Tryck på Uppdatera för att försöka igen.';
   notice(error.message, 'error');
  } finally { setBusy(false); }
 }
 function hideCancelConfirmation() {
  $('cancelLicenseConfirm').hidden = true;
  $('cancelLicense').setAttribute('aria-expanded', 'false');
 }
 async function perform(action, user) {
  if (busy || user.protected) return;
  if (action === 'approve') {
   editingApproval = user;
   $('approvalForm').reset(); $('approvalError').hidden = true;
   $('approvalPerson').textContent = person(user);
   $('approvalDialog').showModal(); return;
  }
  if (action === 'license') {
   editingUser = user;
   $('licensePerson').textContent = person(user);
   $('licenseCurrent').textContent = accessNote(user);
   $('licenseDays').value = ''; $('licenseUntil').value = '';
   $('licenseUntil').min = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
   $('licenseDialog').querySelectorAll('details').forEach(detail => detail.open = false);
   $('extendDays').value = '30';
   $('cancelLicense').disabled = user.status === 'revoked';
   $('cancelLicense').textContent = user.status === 'revoked' ? 'Licens redan avslutad' : 'Avsluta licens nu';
   hideCancelConfirmation();
   $('cancelLicensePerson').textContent = 'Licensen för ' + user.email + ' avslutas vid nästa onlinekontroll. Kontot sparas.';
   $('licenseError').hidden = true;
   document.querySelectorAll('#licenseForm input[name="modules"]').forEach(c => c.checked = (user.modules || []).includes(c.value));
   $('licenseDialog').showModal(); return;
  }
  if (action === 'delete') {
   pendingRemove = user;
   $('confirmDeleteEmail').value = ''; $('confirmRemove').disabled = true;
   $('deletePerson').textContent = person(user); $('deleteError').hidden = true;
   $('confirmText').textContent = 'Kontot och licensen raderas permanent. Lokalt sparade PDF-filer finns kvar. Samma e-postadress kan registreras på nytt och behöver då godkännas igen.';
   $('confirmDialog').showModal();
  }
 }
 $('approvalForm').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !editingApproval) return;
  const modules = [...$('approvalForm').querySelectorAll('input[name="modules"]:checked')].map(x => x.value);
  if (!modules.length) { $('approvalError').textContent = 'Välj minst en modul.'; $('approvalError').hidden = false; return; }
  const user = editingApproval;
  setBusy(true); $('approvalError').hidden = true; $('approveUser').textContent = 'Godkänner…';
  try {
   const result = await window.TillsynoAuth.admin('approve', {userId:user.id, modules, licenseDays:Number($('approvalDays').value)});
   $('approvalDialog').close(); notice(result.message);
  } catch (error) { $('approvalError').textContent = error.message; $('approvalError').hidden = false; }
  finally { $('approveUser').textContent = 'Godkänn och aktivera'; setBusy(false); await load(); }
 });
 $('licenseForm').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !editingUser) return;
  const modules = [...$('licenseForm').querySelectorAll('input[name="modules"]:checked')].map(x => x.value);
  if (!modules.length) { $('licenseError').textContent = 'Välj minst en modul.'; $('licenseError').hidden = false; return; }
  const data = {userId:editingUser.id, modules}, days = $('licenseDays').value, until = $('licenseUntil').value;
  if (until) data.licenseExpiresOn = until; else if (days) data.licenseDays = Number(days);
  setBusy(true); $('licenseError').hidden = true; $('saveLicense').textContent = 'Sparar…';
  try { const result = await window.TillsynoAuth.admin('update', data); $('licenseDialog').close(); notice(result.message); }
  catch (error) { $('licenseError').textContent = error.message; $('licenseError').hidden = false; }
  finally { $('saveLicense').textContent = 'Spara ändringar'; setBusy(false); await load(); }
 });
 $('licenseDays').addEventListener('change', () => { if ($('licenseDays').value) $('licenseUntil').value = ''; });
 $('licenseUntil').addEventListener('input', () => { if ($('licenseUntil').value) $('licenseDays').value = ''; });
 $('cancelLicense').addEventListener('click', () => {
  if (busy || !editingUser || editingUser.status === 'revoked') return;
  const open = $('cancelLicenseConfirm').hidden;
  $('cancelLicenseConfirm').hidden = !open; $('cancelLicense').setAttribute('aria-expanded', String(open));
 });
 $('keepLicense').addEventListener('click', hideCancelConfirmation);
 async function changeLicense(action, button, data = {}) {
  if (busy || !editingUser || (action === 'cancelLicense' && editingUser.status === 'revoked')) return;
  const userId = editingUser.id, oldText = button.textContent;
  setBusy(true); $('licenseError').hidden = true; button.textContent = action === 'extend' ? 'Förlänger…' : 'Avslutar…';
  try { const result = await window.TillsynoAuth.admin(action, {userId, ...data}); $('licenseDialog').close(); notice(result.message); }
  catch (error) { $('licenseError').textContent = error.message; $('licenseError').hidden = false; }
  finally { button.textContent = oldText; setBusy(false); await load(); }
 }
 $('confirmCancelLicense').addEventListener('click', () => void changeLicense('cancelLicense', $('confirmCancelLicense')));
 $('extendLicense').addEventListener('click', () => void changeLicense('extend', $('extendLicense'), {licenseDays:Number($('extendDays').value)}));
 $('confirmDeleteEmail').addEventListener('input', () => $('confirmRemove').disabled = busy || !emailMatches());
 $('confirmRemove').addEventListener('click', async () => {
  if (busy || !emailMatches()) return;
  const user = pendingRemove;
  setBusy(true); $('deleteError').hidden = true; $('confirmRemove').textContent = 'Raderar…';
  try {
   const result = await window.TillsynoAuth.admin('delete', {userId:user.id, confirmEmail:user.email});
   $('confirmDialog').close(); notice(result.message);
  } catch (error) { $('deleteError').textContent = error.message; $('deleteError').hidden = false; }
  finally { $('confirmRemove').textContent = 'Radera konto'; setBusy(false); await load(); }
 });
 $('confirmDialog').addEventListener('close', () => { pendingRemove = null; $('confirmDeleteEmail').value = ''; $('confirmRemove').disabled = true; });
 $('licenseDialog').addEventListener('close', () => { hideCancelConfirmation(); editingUser = null; });
 $('approvalDialog').addEventListener('close', () => editingApproval = null);
 document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { if (!busy) $(b.dataset.close).close(); }));
 document.querySelectorAll('dialog:not(.ta-modal)').forEach(d => d.addEventListener('cancel', event => { if (busy) event.preventDefault(); }));
 document.addEventListener('click', event => document.querySelectorAll('.userMenu[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; }));
 document.addEventListener('keydown', event => { if (event.key === 'Escape') document.querySelectorAll('.userMenu[open]').forEach(menu => menu.open = false); });
 document.querySelectorAll('[data-user-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.userFilter; render(); }));
 $('search').addEventListener('input', render);
 $('refresh').addEventListener('click', () => void load());
 window.addEventListener('tillsyno-authorized', () => void load());
 if (window.TillsynoCurrentAccess) void load();
})();
