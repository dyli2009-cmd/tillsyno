/* Tillsyno SharePoint pilot: delegated Microsoft Graph file adapter.
 * TEST ONLY. Does not initialize auth or access files without a token provider.
 * Never save secrets, access tokens or customer documents in the public repo.
 */
(function (root) {
  'use strict';
  const GRAPH = 'https://graph.microsoft.com/v1.0';
  const MAX_SIMPLE_UPLOAD_BYTES = 250 * 1024 * 1024;

  function segment(value) {
    return encodeURIComponent(String(value));
  }
  function pathSegments(path) {
    return String(path || '').split('/').filter(Boolean).map(segment).join('/');
  }
  function graphUrl(relativeOrFull) {
    const u = new URL(relativeOrFull, GRAPH + '/');
    if (u.protocol !== 'https:' || u.origin !== 'https://graph.microsoft.com' ||
        !u.pathname.startsWith('/v1.0/')) {
      throw new Error('Ogiltig Microsoft Graph-adress.');
    }
    return u.href;
  }
  class SharePointGraphClient {
    constructor(options) {
      if (!options || typeof options.getAccessToken !== 'function') {
        throw new TypeError('getAccessToken krävs (Microsoft-inloggning).');
      }
      this.getAccessToken = options.getAccessToken;
      this.fetchImpl = options.fetchImpl || root.fetch.bind(root);
    }
    async request(path, options) {
      const accessToken = await this.getAccessToken();
      if (!accessToken) throw new Error('Microsoft-inloggning krävs.');
      const o = options || {};
      const headers = new Headers(o.headers || {});
      headers.set('Authorization', 'Bearer ' + accessToken);
      const res = await this.fetchImpl(graphUrl(path), { ...o, headers });
      if (!res.ok) {
        let reason = 'HTTP ' + res.status;
        try {
          const body = await res.json();
          reason = body?.error?.code || reason;
        } catch (_) {}
        const error = new Error('SharePoint-förfrågan misslyckades: ' + reason);
        error.status = res.status;
        throw error;
      }
      return res;
    }
    async json(path, options) {
      return (await this.request(path, options)).json();
    }
    async listAll(path, limit = 250) {
      let next = path, items = [];
      while (next && items.length < limit) {
        const page = await this.json(next);
        items.push(...(Array.isArray(page.value) ? page.value : []));
        next = page['@odata.nextLink'] || '';
      }
      return items.slice(0, limit);
    }
    async siteFromUrl(siteUrl) {
      const url = new URL(siteUrl);
      if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.sharepoint\.com$/i.test(url.hostname)) {
        throw new Error('Ange en HTTPS-adress till en SharePoint-webbplats.');
      }
      const pathname = url.pathname.replace(/\/$/, '');
      const location = pathname
        ? '/sites/' + url.hostname + ':' + encodeURI(pathname)
        : '/sites/' + url.hostname;
      return this.json(location);
    }
    async drives(siteId) {
      return this.listAll('/sites/' + segment(siteId) + '/drives');
    }
    async listFolder(driveId, folderPath = '') {
      const id = segment(driveId), path = pathSegments(folderPath);
      return this.listAll(path
        ? '/drives/' + id + '/root:/' + path + ':/children'
        : '/drives/' + id + '/root/children');
    }
    async getItem(driveId, itemId) {
      return this.json('/drives/' + segment(driveId) + '/items/' + segment(itemId));
    }
    async getPdf(driveId, itemId) {
      const id = segment(driveId), item = segment(itemId);
      const response = await this.request('/drives/' + id + '/items/' + item + '/content');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Filen är tom.');
      return blob;
    }
    async saveNewPdf(driveId, folderPath, filename, fileBytes) {
      if (!/\.pdf$/i.test(filename) || /[\\/]/.test(filename)) {
        throw new Error('Ange ett PDF-filnamn utan sökväg.');
      }
      if (!(fileBytes instanceof Blob || fileBytes instanceof Uint8Array || fileBytes instanceof ArrayBuffer)) {
        throw new TypeError('Filinnehållet måste vara binärt.');
      }
      const size = fileBytes.size ?? fileBytes.byteLength;
      if (size > MAX_SIMPLE_UPLOAD_BYTES) throw new Error('För stor PDF; uppladdningssession krävs.');
      const folder = pathSegments(folderPath);
      const target = (folder ? folder + '/' : '') + segment(filename);
      const response = await this.request('/drives/' + segment(driveId) + '/root:/' + target + ':/content', {
        method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'If-None-Match': '*' },
        body: fileBytes
      });
      return response.json();
    }
  }
  root.TillsynoSharePointGraphClient = SharePointGraphClient;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SharePointGraphClient };
  }
})(typeof window !== 'undefined' ? window : globalThis);
