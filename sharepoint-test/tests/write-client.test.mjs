import test from 'node:test';
import assert from 'node:assert/strict';
import {SharePointWriter, MAX_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES, safeUploadUrl, validateCopyName} from '../src/write-client.mjs';
import {ReadOnlySharePoint} from '../src/read-only.mjs';

const config = {siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno', libraryServerRelativePath:'/sites/Tillsyno/Delade dokument', folderPath:'GStest'};
const uploadUrl = 'https://tillsyno.sharepoint.com/upload/session?temporary=upload-secret';
const expiry = () => new Date(Date.now() + 3600000).toISOString();
const folder = (id, parent, extra = {}) => ({id, name:id === 'test-root' ? 'GStest' : id, folder:{}, parentReference:{driveId:'drive', id:parent}, ...extra});
const pdf = size => new Blob(['%PDF-', new Uint8Array(Math.max(0, size - 5))], {type:'application/pdf'});

function fixture(options = {}) {
 const calls = [], progress = [];
 const folders = new Map([
  ['test-root', folder('test-root', 'library-root')], ['child', folder('child', 'test-root')],
  ['grandchild', folder('grandchild', 'child')], ['outside', folder('outside', 'library-root')],
  ['library-root', folder('library-root', null)]
 ]);
 const state = {calls, progress, folders, user:'tillsyno-user:microsoft-user', allowed:true, received:0, item:null, sessionName:null, sessionParent:null, puts:0, tokens:[]};
 const fetchImpl = async (url, request) => {
  calls.push({url, request});
  const parsed = new URL(url);
  if (parsed.origin === 'https://graph.microsoft.com') {
   assert.equal(request.redirect, 'error'); assert.equal(request.credentials, 'omit');
   assert.equal(request.cache, 'no-store');
   assert.equal(request.headers.Authorization, request.method === 'POST' ? 'Bearer write-secret' : 'Bearer read-secret');
   if (request.method === 'POST') {
    assert.match(parsed.pathname, /^\/v1\.0\/drives\/drive\/items\/[^/]+:\/[^/]+:\/createUploadSession$/u);
    const body = JSON.parse(request.body);
    assert.deepEqual(Object.keys(body), ['item']);
    assert.deepEqual(body.item, {'@microsoft.graph.conflictBehavior':'fail', name:body.item.name});
    state.sessionName = body.item.name;
    state.sessionParent = decodeURIComponent(/\/items\/([^/]+):\//u.exec(parsed.pathname)[1]);
    if (options.session) return options.session(state, request);
    return Response.json({uploadUrl, expirationDateTime:expiry()});
   }
   assert.equal(request.method, 'GET', 'Graph metadata uses GET only');
   if (parsed.pathname === '/v1.0/sites/tillsyno.sharepoint.com:/sites/Tillsyno') return Response.json({id:'site', webUrl:config.siteUrl});
   if (parsed.pathname === '/v1.0/sites/site/drives') return Response.json({value:[{id:'drive', webUrl:config.siteUrl + '/Delade%20dokument'}]});
   if (parsed.pathname === '/v1.0/drives/drive/root:/GStest') return Response.json(folders.get('test-root'));
   const match = /^\/v1\.0\/drives\/([^/]+)\/items\/([^/]+)$/u.exec(parsed.pathname);
   assert.ok(match, 'unexpected Graph route: ' + parsed.pathname);
   assert.equal(decodeURIComponent(match[1]), 'drive');
   const id = decodeURIComponent(match[2]);
   if (id === 'new-file' && state.item) return Response.json(options.readback ? options.readback(state.item, state) : state.item);
   assert.ok(folders.has(id), 'unknown test folder: ' + id);
   return Response.json(folders.get(id));
  }
  assert.equal(url, uploadUrl);
  assert.equal(request.method, 'PUT');
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.credentials, 'omit'); assert.equal(request.redirect, 'error');
  assert.equal(request.referrerPolicy, 'no-referrer'); assert.equal(request.cache, 'no-store');
  assert.ok(request.body instanceof Blob);
  const range = /^bytes (\d+)-(\d+)\/(\d+)$/u.exec(request.headers['Content-Range']);
  assert.ok(range); const [start, end, total] = range.slice(1).map(Number);
  assert.equal(start, state.received); assert.equal(request.body.size, end - start + 1);
  assert.ok(request.body.size <= UPLOAD_CHUNK_BYTES);
  if (end + 1 < total) assert.equal(request.body.size % (320 * 1024), 0);
  state.received = end + 1; state.puts++;
  if (options.put) { const response = await options.put(state, {start, end, total, request}); if (response) return response; }
  if (end + 1 < total) return Response.json({nextExpectedRanges:[String(end + 1) + '-'], expirationDateTime:expiry()}, {status:202});
  state.item = {id:'new-file', name:state.sessionName, size:total, file:{}, parentReference:{driveId:'drive', id:state.sessionParent}, webUrl:config.siteUrl + '/Delade%20dokument/GStest/' + encodeURIComponent(state.sessionName)};
  return Response.json(options.finalItem ? options.finalItem(state.item, state) : state.item, {status:201});
 };
 const client = new SharePointWriter({
  fetchImpl,
  getToken:async () => { state.tokens.push('read'); return 'read-secret'; },
  getWriteToken:async () => { state.tokens.push('write'); if (options.writeToken) return options.writeToken(state); return 'write-secret'; },
  guard:async () => { if (!state.allowed) throw Error('Administratörsåtkomsten har upphört.'); return state.user; }
 });
 const save = (overrides = {}) => client.saveCopy({config, blob:pdf(18), name:'Projekt – ny kopia.pdf', onProgress:value => progress.push(value), ...overrides});
 return {client, state, save};
}

test('A new exported file is verified under the configured root before reporting success', async () => {
 const {save, state} = fixture();
 const result = await save();
 assert.deepEqual(result, {id:'new-file', name:'Projekt – ny kopia.pdf', size:18, driveId:'drive', parentId:'test-root', webUrl:config.siteUrl + '/Delade%20dokument/GStest/Projekt%20%E2%80%93%20ny%20kopia.pdf'});
 assert.equal(state.puts, 1); assert.equal(state.tokens.filter(token => token === 'write').length, 1);
 assert.equal(state.progress.at(-1).phase, 'complete');
 const putIndex = state.calls.findIndex(call => call.request.method === 'PUT');
 assert.ok(state.calls.slice(0, putIndex).some(call => call.url.includes('/items/test-root?')));
 assert.ok(state.calls.slice(putIndex + 1).some(call => call.url.includes('/items/new-file?')), 'completion requires authenticated readback');
 assert.equal(JSON.stringify(result).includes('upload-secret'), false);
 assert.equal(JSON.stringify(result).includes('write-secret'), false);
 assert.equal(state.calls.some(call => ['DELETE', 'PATCH'].includes(call.request.method)), false);
});

test('A validated nested folder is allowed and its full ancestry is checked', async () => {
 const {save, state} = fixture();
 const result = await save({destination:{driveId:'drive', id:'grandchild'}});
 assert.equal(result.parentId, 'grandchild');
 for (const id of ['grandchild', 'child', 'test-root']) assert.ok(state.calls.some(call => call.url.includes('/items/' + id + '?')));
});

test('Wrong drives, outside folders, parent cycles and shortcuts never create an upload session', async () => {
 for (const kind of ['wrong-drive', 'outside', 'cycle', 'shortcut', 'spoofed-drive', 'spoofed-id']) {
  const {save, state} = fixture();
  let destination = {driveId:'drive', id:'child'};
  if (kind === 'wrong-drive') destination.driveId = 'unrelated';
  if (kind === 'outside') destination.id = 'outside';
  if (kind === 'cycle') state.folders.set('child', folder('child', 'child'));
  if (kind === 'shortcut') state.folders.get('child').remoteItem = {id:'outside'};
  if (kind === 'spoofed-drive') state.folders.get('child').parentReference.driveId = 'unrelated';
  if (kind === 'spoofed-id') state.folders.get('child').id = 'another-folder';
  await assert.rejects(() => save({destination}), error => error.code === 'invalid_destination');
  assert.equal(state.calls.some(call => call.request.method !== 'GET'), false, kind);
 }
});

test('A folder moved outside GStest during an upload stops before the next chunk', async () => {
 const {save, state} = fixture({put:state => { state.folders.set('child', folder('child', 'outside')); }});
 await assert.rejects(() => save({destination:{driveId:'drive', id:'child'}, blob:pdf(UPLOAD_CHUNK_BYTES + 8)}), error => error.code === 'invalid_destination');
 assert.equal(state.puts, 1); assert.equal(state.item, null);
});

test('Five MiB chunks are sequential, with exact byte ranges and an arbitrary final remainder', async () => {
 const {save, state} = fixture(); const size = UPLOAD_CHUNK_BYTES * 2 + 17;
 await save({blob:pdf(size)});
 const chunks = state.calls.filter(call => call.request.method === 'PUT');
 assert.equal(chunks.length, 3);
 assert.deepEqual(chunks.map(call => call.request.headers['Content-Range']), [
  'bytes 0-5242879/' + size, 'bytes 5242880-10485759/' + size, 'bytes 10485760-10485776/' + size
 ]);
 assert.deepEqual(chunks.map(call => call.request.body.size), [UPLOAD_CHUNK_BYTES, UPLOAD_CHUNK_BYTES, 17]);
 assert.equal(state.progress.at(-1).loaded, size);
});

test('The module export is uploaded byte-for-byte without rebuilding or re-encoding it', async () => {
 const bytes = new Uint8Array(UPLOAD_CHUNK_BYTES + 317);
 for (let index = 0; index < bytes.length; index++) bytes[index] = (index * 71 + Math.floor(index / 251)) % 256;
 const blob = new Blob([bytes], {type:'image/png'}), {save, state} = fixture();
 await save({blob, name:'Exporterad bild.png'});
 const uploaded = await Promise.all(state.calls.filter(call => call.request.method === 'PUT').map(async call => Buffer.from(await call.request.body.arrayBuffer())));
 assert.deepEqual(Buffer.concat(uploaded), Buffer.from(bytes));
 assert.equal(blob.size, bytes.length);
});

test('JSON with Swedish characters, CSV and text retain their exact exported UTF-8 bytes', async () => {
 for (const [name, type, text] of [
  ['Dörrdiagnostik.json', 'application/json', '{"dörr":"ÅÄÖ åäö","åtgärd":"Byt lås – ½ varv","original":"A\u030a","rad":"rad 1\\nrad 2"}\r\n'],
  ['Mängder.csv', 'text/csv', 'Dörr;Åtgärd;Mängd\r\nGS1;"Byt lås, vänster";2\r\n'],
  ['Anteckningar.txt', 'text/plain', 'Återkontroll\r\nMått: ½ mm.\n']
 ]) {
  const blob = new Blob([text], {type}), expected = Buffer.from(await blob.arrayBuffer());
  const {save, state} = fixture();
  const result = await save({blob, name});
  const parts = await Promise.all(state.calls.filter(call => call.request.method === 'PUT').map(async call => Buffer.from(await call.request.body.arrayBuffer())));
  assert.deepEqual(Buffer.concat(parts), expected, name);
  assert.equal(result.name, name); assert.equal(result.size, expected.length);
 }
});

test('Allowing text exports never allows HTML, JavaScript or other active file types', async () => {
 for (const name of ['page.html', 'page.htm', 'script.js', 'script.mjs', 'page.xhtml', 'image.svg', 'export.json.html', 'export.constructor', 'export.__proto__']) {
  const {save, state} = fixture();
  await assert.rejects(() => save({name, blob:new Blob(['<script>alert(1)</script>'])}), error => error.code === 'unsupported_file');
  assert.equal(state.calls.length, 0); assert.equal(state.tokens.length, 0);
 }
});

test('The 25 MiB limit accepts its boundary and rejects larger files before credentials or network', async () => {
 const accepted = fixture(); await accepted.save({blob:pdf(MAX_UPLOAD_BYTES)}); assert.equal(accepted.state.puts, 5);
 const rejected = fixture();
 await assert.rejects(() => rejected.save({blob:pdf(MAX_UPLOAD_BYTES + 1)}), error => error.code === 'file_too_large');
 assert.equal(rejected.state.calls.length, 0); assert.equal(rejected.state.tokens.length, 0);
});

test('Names cannot introduce paths, reserved names or unsupported exports', () => {
 for (const name of ['../file.pdf', 'folder/file.pdf', 'folder\\file.pdf', 'a:b.pdf', 'a?.pdf', ' a.pdf', 'a.pdf ', 'a.pdf.', 'NUL.pdf', 'CON.pdf', 'COM1.pdf', '~$a.pdf', 'a\u0000.pdf', '', 'a.exe']) {
  assert.throws(() => validateCopyName(name));
 }
 for (const name of ['Kontroll 100%.pdf', 'Åtgärder #2.zip', 'Bild (ny).PNG', 'Bild.jpeg', 'Bild.webp']) assert.equal(validateCopyName(name), name);
});

test('Empty, non-Blob and invalid PDF exports fail before credentials or network', async () => {
 for (const blob of [null, {size:4}, new Blob(), new Blob(['hello'])]) {
  const {save, state} = fixture(); await assert.rejects(() => save({blob}));
  assert.equal(state.calls.length, 0); assert.equal(state.tokens.length, 0);
 }
});

test('Upload URLs must stay on HTTPS Microsoft upload domains, without credentials or redirects', () => {
 for (const url of [uploadUrl, 'https://sn3302.up.1drv.com/up/key', 'https://upload.sharepointonline.com/up/key']) assert.equal(safeUploadUrl(url), url);
 for (const url of [undefined, {}, 'not-a-url-secret', 'http://tillsyno.sharepoint.com/u', 'https://tillsyno.sharepoint.com.evil.example/u', 'https://evilsharepoint.com/u', 'https://graph.microsoft.com/v1.0/u', 'https://evil.example/u', 'https://name:secret@tillsyno.sharepoint.com/u', 'https://tillsyno.sharepoint.com:444/u', 'https://tillsyno.sharepoint.com/u#secret']) {
  assert.throws(() => safeUploadUrl(url), error => error.code === 'invalid_upload_url' && !error.message.includes('secret'));
 }
});

test('A malicious or expired session cannot receive file bytes', async () => {
 for (const session of [{uploadUrl:'https://evil.example/upload-secret', expirationDateTime:expiry()}, {uploadUrl, expirationDateTime:'2000-01-01T00:00:00Z'}, {uploadUrl}, {uploadUrl, expirationDateTime:expiry(), nextExpectedRanges:['10-']}]) {
  const {save, state} = fixture({session:() => Response.json(session)});
  await assert.rejects(() => save()); assert.equal(state.puts, 0);
 }
});

test('Name conflicts at session creation or final upload do not rename or replace', async () => {
 for (const at of ['session', 'put']) {
  const {save, state} = fixture({[at]:() => Response.json({error:{code:'nameAlreadyExists'}}, {status:409})});
  await assert.rejects(() => save(), error => error.code === 'name_conflict' && /nytt namn/u.test(error.message) && !error.mayHaveSaved);
  assert.equal(state.item, null); assert.equal(state.progress.some(value => value.phase === 'complete'), false);
  assert.equal(state.calls.filter(call => call.request.method === 'POST').length, 1);
  assert.equal(state.calls.some(call => ['DELETE', 'PATCH'].includes(call.request.method)), false);
 }
});

test('Microsoft authentication, write-permission, throttling and quota errors stay actionable without retries', async () => {
 for (const [status, message] of [[401,/förnyas/u], [403,/Skrivåtkomst nekad/u], [429,/begränsar/u], [507,/utrymme/u]]) {
  const {save, state} = fixture({session:() => new Response('', {status})});
  await assert.rejects(() => save(), error => error.status === status && message.test(error.message));
  assert.equal(state.calls.filter(call => call.request.method === 'POST').length, 1);
  assert.equal(state.puts, 0); assert.equal(state.progress.some(value => value.phase === 'complete'), false);
 }
});

test('Missing dedicated write token never falls back to the read token', async () => {
 const {save, state} = fixture({writeToken:() => ''});
 await assert.rejects(() => save(), error => error.code === 'write_token_missing');
 assert.equal(state.calls.some(call => call.request.method !== 'GET'), false);
 assert.deepEqual(state.tokens.filter(token => token === 'write'), ['write']);
});

test('Network failures never expose the preauthenticated URL and never trigger an automatic retry', async () => {
 const {save, state} = fixture({put:() => { throw Error('Failed URL ' + uploadUrl + ' write-secret'); }});
 await assert.rejects(() => save(), error => error.code === 'network' && error.mayHaveSaved === true &&
  !error.message.includes('upload-secret') && !error.message.includes('write-secret') && /Kontrollera målmappen/u.test(error.message));
 assert.equal(state.puts, 1); assert.equal(state.progress.some(value => value.phase === 'complete'), false);
 const beforeUpload = fixture({session:() => { throw Error('network failed'); }});
 await assert.rejects(() => beforeUpload.save(), error => error.code === 'network' && !error.mayHaveSaved);
 assert.equal(beforeUpload.state.puts, 0);
});

test('Lost permission or changed identity before session creation causes no mutation', async () => {
 for (const mode of ['denied', 'changed']) {
  const {save, state} = fixture({writeToken:state => { if (mode === 'denied') state.allowed = false; else state.user = 'another-user'; return 'write-secret'; }});
  await assert.rejects(() => save(), /åtkomsten|ändrades/u);
  assert.equal(state.calls.some(call => call.request.method !== 'GET'), false);
 }
 const denied = fixture(); denied.state.allowed = false;
 await assert.rejects(() => denied.save(), /åtkomsten/u); assert.equal(denied.state.calls.length, 0);
});

test('Permission loss between chunks stops before sending more bytes', async () => {
 const {save, state} = fixture({put:state => { state.allowed = false; }});
 await assert.rejects(() => save({blob:pdf(UPLOAD_CHUNK_BYTES + 8)}), /åtkomsten/u);
 assert.equal(state.puts, 1); assert.equal(state.item, null);
 assert.equal(state.progress.some(value => value.phase === 'complete'), false);
});

test('Completion requires matching final and readback file identities, parent, name and size', async () => {
 for (const stage of ['finalItem', 'readback']) {
  for (const field of ['name', 'size', 'parent', 'drive', 'type', 'id']) {
   const change = item => {
    const next = structuredClone(item);
    if (field === 'name') next.name = 'renamed.pdf';
    if (field === 'size') next.size++;
    if (field === 'parent') next.parentReference.id = 'outside';
    if (field === 'drive') next.parentReference.driveId = 'another-drive';
    if (field === 'type') { delete next.file; next.folder = {}; }
    if (field === 'id') next.id = stage === 'finalItem' ? '' : 'other-file';
    return next;
   };
   const {save, state} = fixture({[stage]:change});
   await assert.rejects(() => save(), error => error.code === 'invalid_saved_file' && error.mayHaveSaved === true, stage + ':' + field);
   assert.equal(state.progress.some(value => value.phase === 'complete'), false);
  }
 }
});

test('A minimal final item can omit parent only when authenticated readback verifies it', async () => {
 const {save} = fixture({finalItem:item => { const {parentReference, ...minimal} = item; return minimal; }});
 assert.equal((await save()).parentId, 'test-root');
});

test('Unexpected chunk acknowledgement or premature completion stops the upload', async () => {
 for (const response of [
  () => Response.json({nextExpectedRanges:['0-'], expirationDateTime:expiry()}, {status:202}),
  () => Response.json({nextExpectedRanges:['1-', '2-'], expirationDateTime:expiry()}, {status:202}),
  () => Response.json({id:'premature'}, {status:201})
 ]) {
  const {save, state} = fixture({put:response});
  await assert.rejects(() => save({blob:pdf(UPLOAD_CHUNK_BYTES + 8)}));
  assert.equal(state.puts, 1); assert.equal(state.progress.some(value => value.phase === 'complete'), false);
 }
});

test('An aborted save has no network effects; overlapping saves cannot create two sessions', async () => {
 const aborted = fixture(), controller = new AbortController(); controller.abort();
 await assert.rejects(() => aborted.save({signal:controller.signal}), error => error.code === 'cancelled');
 assert.equal(aborted.state.calls.length, 0);
 const concurrent = fixture();
 const first = concurrent.save();
 await assert.rejects(() => concurrent.save(), error => error.code === 'busy');
 await first;
 assert.equal(concurrent.state.calls.filter(call => call.request.method === 'POST').length, 1);
});

test('Read-only pilot remains read-only and no writer methods are added to it', () => {
 const client = new ReadOnlySharePoint({getToken:async () => 'read'});
 assert.equal(client.saveCopy, undefined); assert.equal(client.getWriteToken, undefined);
 assert.equal(UPLOAD_CHUNK_BYTES % (320 * 1024), 0);
 assert.throws(() => new SharePointWriter({getToken:async () => 'r', getWriteToken:async () => 'w', guard:async () => 'u', maxBytes:MAX_UPLOAD_BYTES + 1}));
});
