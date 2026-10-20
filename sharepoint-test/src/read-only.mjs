/* Read-only pilot: Graph credentials never leave graph.microsoft.com. */
const GRAPH = 'https://graph.microsoft.com';
const LIMIT = 25 * 1024 * 1024;
const enc = value => encodeURIComponent(String(value));
export function canonicalUrl(value) {
  const u = new URL(value);
  return u.origin.toLowerCase() + decodeURIComponent(u.pathname).replace(/\/$/, '');
}
export function graphUrl(path) {
  const u = new URL(path, GRAPH + '/v1.0/');
  if (u.origin !== GRAPH || !u.pathname.startsWith('/v1.0/') || u.username || u.password || u.hash) {
    throw new Error('Otillåten Graph-adress.');
  }
  return u.href;
}
export function safeDownloadUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Microsoft lämnade ingen nedladdningsadress för PDF-filen. Uppdatera fillistan och försök igen.');
  }
  let u;
  try { u = new URL(value); } catch {
    throw new Error('Microsoft lämnade en ogiltig nedladdningsadress för PDF-filen.');
  }
  if (u.protocol !== 'https:' || u.username || u.password ||
      !(/^[a-z0-9.-]+\.sharepoint\.com$/i.test(u.hostname) || /^[a-z0-9.-]+\.sharepointonline\.com$/i.test(u.hostname))) {
    throw new Error('Okänd nedladdningsdomän. Hämtningen stoppades.');
  }
  return u.href;
}
export class ReadOnlySharePoint {
  constructor({ getToken, fetchImpl = globalThis.fetch.bind(globalThis), maxBytes = LIMIT }) {
    if (typeof getToken !== 'function') throw new TypeError('Tokenfunktion saknas.');
    // Window.fetch requires its global receiver, not this client instance.
    // Bind the default once; injected test transports remain unchanged.
    this.getToken = getToken; this.fetch = fetchImpl; this.maxBytes = maxBytes;
  }
  async json(path) {
    const url = graphUrl(path);
    const token = await this.getToken();
    if (!token) throw new Error('Logga in med Microsoft först.');
    const r = await this.fetch(url, { method: 'GET', headers: { Authorization: 'Bearer ' + token },
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!r.ok) {
      const hints = {401:'Microsoft-inloggningen behöver förnyas.',403:'Åtkomst nekad. Kontrollera behörighet och administratörsmedgivande.',404:'Webbplatsen, biblioteket eller filen hittades inte.',429:'Microsoft begränsar förfrågningar. Vänta och försök igen.'};
      const error = new Error(hints[r.status] || 'Microsoft Graph svarade med HTTP ' + r.status + '.');
      error.status = r.status; throw error;
    }
    return r.json();
  }
  async all(path) {
    let next = path; const out = [], seen = new Set();
    while (next) {
      const key = graphUrl(next);
      if (seen.has(key) || seen.size >= 20) throw new Error('För många resultatsidor. Begränsa testmappen.');
      seen.add(key);
      const data = await this.json(key);
      if (!Array.isArray(data.value)) throw new Error('Oväntat svar från Microsoft Graph.');
      out.push(...data.value); next = data['@odata.nextLink'] || '';
    }
    return out;
  }
  async folder(config) {
    const siteUrl = new URL(config.siteUrl);
    if (siteUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.sharepoint\.com$/i.test(siteUrl.hostname)) throw new Error('Ogiltig SharePoint-webbplats.');
    const sitePath = siteUrl.pathname.split('/').filter(Boolean).map(p => enc(decodeURIComponent(p))).join('/');
    const site = await this.json('/v1.0/sites/' + siteUrl.hostname + (sitePath ? ':/' + sitePath : ''));
    if (canonicalUrl(site.webUrl) !== canonicalUrl(config.siteUrl)) throw new Error('Fel SharePoint-webbplats returnerades.');
    const libraries = await this.all('/v1.0/sites/' + enc(site.id) + '/drives');
    const expected = siteUrl.origin + config.libraryServerRelativePath;
    const library = libraries.find(d => d.webUrl && canonicalUrl(d.webUrl) === canonicalUrl(expected));
    if (!library) throw new Error('Dokumentbiblioteket Delade dokument hittades inte.');
    const parts = String(config.folderPath).split('/');
    if (parts.some(p => !p || p === '.' || p === '..')) throw new Error('Ogiltig mappsökväg.');
    const path = parts.map(enc).join('/');
    const items = await this.all('/v1.0/drives/' + enc(library.id) + '/root:/' + path + ':/children?$select=id,name,size,file');
    return { driveId: library.id, files: items.filter(i => i.file && /\.pdf$/i.test(i.name || '')) };
  }
  async pdf(driveId, itemId) {
    const itemPath = '/v1.0/drives/' + enc(driveId) + '/items/' + enc(itemId);
    let item = await this.json(itemPath + '?$select=id,name,size,file,@microsoft.graph.downloadUrl');
    if (item.size > this.maxBytes) throw new Error('Lästestet tillåter PDF-filer upp till 25 MB.');
    // Retry full metadata if the projected response omitted the download annotation.
    if (!item['@microsoft.graph.downloadUrl']) item = await this.json(itemPath);
    if (!item.file || !/\.pdf$/i.test(item.name || '')) throw new Error('Välj en PDF-fil.');
    if (item.size > this.maxBytes) throw new Error('Lästestet tillåter PDF-filer upp till 25 MB.');
    const url = safeDownloadUrl(item['@microsoft.graph.downloadUrl']);
    // Never send a Bearer header to the preauthenticated download URL.
    const r = await this.fetch(url, { method:'GET', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', redirect:'error', signal:AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error('PDF-hämtningen misslyckades (HTTP ' + r.status + ').');
    const reader = r.body?.getReader();
    if (!reader) throw new Error('Webbläsaren saknar stöd för säker filhämtning.');
    const chunks = []; let size = 0;
    try {
      while (true) {
        const {value,done} = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > this.maxBytes) { await reader.cancel(); throw new Error('PDF-filen är större än lästestets gräns.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const blob = new Blob(chunks, {type:'application/pdf'});
    if (await blob.slice(0,5).text() !== '%PDF-') throw new Error('Filen innehåller inte en giltig PDF-signatur.');
    return { name:item.name, blob };
  }
}
