/* Tillsyno 2.4.582: module versions from versions.json, shown in small labels.
 * Fills every element marked data-tillsyno-version="key[,key…]" (a module key from
 * versions.json, or "app" for the app version). Display only: nothing else on the page
 * is read or changed. If versions.json cannot be read, the label keeps its own text. */
(() => {
 'use strict';
 const script = document.currentScript;
 const source = new URL('versions.json', script?.src || location.href).href;
 const label = (data, key) => {
  if (key === 'app') return data.app ? 'Tillsyno v' + data.app : '';
  const module = data.modules?.[key];
  return module?.name && module?.version ? module.name + ' ' + module.version : '';
 };
 const fill = data => {
  for (const node of document.querySelectorAll('[data-tillsyno-version]')) {
   const text = node.dataset.tillsynoVersion.split(',').map(key => label(data, key.trim())).filter(Boolean).join(' · ');
   if (text && node.textContent !== text) node.textContent = text;
  }
 };
 const ready = fetch(source, {credentials: 'same-origin'})
  .then(response => { if (!response.ok) throw Error('versions.json ' + response.status); return response.json(); })
  .then(data => {
   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fill(data), {once: true});
   else fill(data);
   return data;
  })
  .catch(() => null);
 window.TillsynoVersions = {ready, label: (data, key) => label(data, key)};
})();
