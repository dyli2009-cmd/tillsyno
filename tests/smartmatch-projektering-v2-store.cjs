'use strict';
// Generated PDF and project data only. Real IndexedDB transactions in Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const root = path.resolve(__dirname, '..');
const html = '<!doctype html><meta charset="utf-8"><script src="/vendor/pdf-lib.min.js"></script><script src="/smartmatch-projektering-v2-data.js"></script><script src="/smartmatch-projektering-v2-store.js"></script>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://local').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(file)); }
  catch (_) { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await page.waitForFunction(() => window.Proj2Store && window.Proj2Data);
    const result = await page.evaluate(async () => {
      const S = Proj2Store, D = Proj2Data;
      const same = (a, b, label) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw Error(label); };
      const expectFailure = async (action, pattern) => {
        try { await action(); } catch (error) { if (!pattern || pattern.test(error.message)) return error.name; throw error; }
        throw Error('Expected an error: ' + pattern);
      };
      const empty = D.createEmpty('Tomt projekt');
      localStorage.setItem('tillsyno-unrelated-module-test', 'keep');
      await S.clear();
      if (await S.load() !== null) throw Error('clear must remove only the current record');
      await S.save(empty, new Uint8Array());
      same((await S.load()).state, D.validate(empty), 'empty project roundtrip');
      const emptyFile = await S.pack(empty, new Uint8Array());
      same((await S.unpack(emptyFile)).state, D.validate(empty), 'empty portable roundtrip');

      const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([500,700]);
      const original = new Uint8Array(await pdf.save());
      const state = D.createEmpty('Ritning');
      state.drawing = {name:'generated.pdf', pages:[{width:500,height:700,rotation:0,view:[0,0,500,700],transform:[1,0,0,-1,0,700]}]};
      const normalized = D.validate(state);
      let promiseSettled = false, settledAtRequestSuccess = null;
      const realPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = realPut.apply(this, args);
        request.addEventListener('success', () => { settledAtRequestSuccess = promiseSettled; });
        return request;
      };
      try { await S.save(state, original).then(() => { promiseSettled = true; }); }
      finally { IDBObjectStore.prototype.put = realPut; }
      if (settledAtRequestSuccess !== false || !promiseSettled) throw Error('save resolves before transaction commit');
      const first = await S.load();
      same(first.state, normalized, 'state roundtrip');
      same([...first.original], [...original], 'original bytes roundtrip');
      first.state.project.name = 'mutated returned value'; first.original[0] = 0;
      same((await S.load()).state, normalized, 'returned state cannot mutate persistent record');
      if ((await S.load()).original[0] !== 37) throw Error('returned bytes cannot mutate persistent record');

      const editable = D.clone(state), callerBytes = original.slice();
      editable.project.name = 'snapshot';
      const saving = S.save(editable, callerBytes);
      editable.project.name = 'changed before save resolves'; callerBytes[0] = 0;
      await saving;
      const snapshot = await S.load();
      if (snapshot.state.project.name !== 'snapshot' || snapshot.original[0] !== 37) throw Error('save must snapshot caller values synchronously');

      const next = D.clone(state); next.project.name = 'must not replace saved record';
      IDBObjectStore.prototype.put = function () { throw new DOMException('simulated quota', 'QuotaExceededError'); };
      try { await expectFailure(() => S.save(next, original), /utrymme/); }
      finally { IDBObjectStore.prototype.put = realPut; }
      same((await S.load()).state, snapshot.state, 'quota failure retains committed record');

      IDBObjectStore.prototype.put = function (...args) {
        const request = realPut.apply(this, args);
        request.addEventListener('success', () => request.transaction.abort());
        return request;
      };
      try { await expectFailure(() => S.save(next, original), /tidigare/); }
      finally { IDBObjectStore.prototype.put = realPut; }
      same((await S.load()).state, snapshot.state, 'abort after request success retains committed record');

      const file = await S.pack(state, original);
      const portable = await S.unpack(file);
      same(portable.state, normalized, 'portable state');
      same([...portable.original], [...original], 'portable binary');
      same((await S.load()).state, snapshot.state, 'unpack does not change local record');
      const envelope = JSON.parse(new TextDecoder().decode(file));
      for (const encoded of ['AB==', 'AAA=', '%%%=', 'QQ==junk', 'QQ=Q', 'A', 'AAAA====']) {
        await expectFailure(() => S.unpack(JSON.stringify({...envelope, originalBase64:encoded})));
      }
      await expectFailure(() => S.unpack(new Uint8Array([0xff,0xfe,0xfd])), /giltig text/);
      await expectFailure(() => S.unpack('{oops'), /kunde inte läsas/);
      await expectFailure(() => S.unpack(JSON.stringify({...envelope, format:'other'})), /inte ett/);
      await expectFailure(() => S.save(empty, original), /saknar ritningssidor/);
      await expectFailure(() => S.save(state, new Uint8Array([1,2,3,4,5])), /original-PDF/);
      await expectFailure(() => S.save(state, new Uint8Array(S.MAX_DRAWING_BYTES+1)), /50 MB/);
      same((await S.load()).state, snapshot.state, 'invalid imports cannot change local state');
      if (localStorage.getItem('tillsyno-unrelated-module-test') !== 'keep') throw Error('unrelated key changed');

      await S.close();
      same((await S.load()).state, snapshot.state, 'closed database reopens correctly');
      await S.clear();
      if (await S.load() !== null) throw Error('clear deletes current project');
      return {db:S.DB_NAME, bytes:original.length, portableBytes:file.length, transactions:'atomic', successWaitsFor:'transaction-complete'};
    });
    assert.deepEqual(errors, []);
    assert.equal(result.transactions, 'atomic');
    console.log('PASS projection storage: real IndexedDB atomic commit/abort, quota protection, source snapshots, binary/JSON roundtrip, malformed file rejection and database reopen. ' + JSON.stringify(result));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
