'use strict';
// Tillsyno 2.4.582: module versions are read from versions.json and shown in small labels.
// 1. Static: the app version agrees everywhere, the new files are in both offline lists,
//    every page loads tillsyno-versions.js and every label key exists in versions.json.
// 2. Browser: the real label markup from each page is filled with the expected text,
//    also from controlflow-revision/, and labels keep their own text without versions.json.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const versions = JSON.parse(read('versions.json'));
const app = versions.app;
const PAGES = ['app.html', 'all-in-one.html', 'controlflow-revision/all-in-one.html',
 'smartmatch-read-v9-100.html', 'smartmatch-projektering.html', 'ce-markning.html'];
const LABEL = /<(small|span)\b[^>]*data-tillsyno-version="([^"]+)"[^>]*>([^<]*)<\/\1>/g;

// 1. Static checks
assert.match(app, /^2\.4\.\d+$/, 'app version format');
assert.equal(read('sw.js').match(/const VERSION='([^']+)'/)[1], app, 'sw.js VERSION');
assert.equal(read('offline.js').match(/const VERSION='([^']+)'/)[1], app, 'offline.js VERSION');
assert.equal(read('ce-markning-v1-2-sw.js').match(/const VERSION='([^']+)'/)[1], app, 'CE service worker VERSION');
const home = read('app.html');
assert.ok(home.includes('<meta name="tillsyno-build" content="' + app + '-'), 'app.html build meta');
assert.ok(home.includes('<small class="homeVersion">v' + app + '</small>'), 'app.html visible version');
assert.ok(read('auth/admin.html').includes('>v' + app + '</span>'), 'admin version');
assert.ok(read('auth/login.html').includes('>v' + app + '</small>'), 'login version');
for (const file of ['"tillsyno-versions.js"', '"versions.json"']) assert.ok(read('sw.js').includes(file), 'sw.js CORE has ' + file);
for (const file of ["'tillsyno-versions.js'", "'versions.json'"]) assert.ok(read('ce-markning-v1-2-sw.js').includes(file), 'CE CORE has ' + file);
assert.equal(versions.modules['ce-markning'].version, '1.2', 'CE module version');
assert.equal(versions.modules['ce-markning'].dataformat, 60, 'CE data format kept separate');
assert.ok(read('ce-markning-v1-2.js').includes("const VERSION=60,FORMAT='Tillsyno CE-märkning TEST 60'"), 'CE data format unchanged in code');
assert.ok(read('smartmatch-read-main-v524.js').includes("SMARTMATCH_TEST_LABEL='Avläsning " + versions.modules.avlasning.version + "'"), 'Avläsning label matches registry');
const labels = [];
for (const page of PAGES) {
 const html = read(page);
 const prefix = page.includes('/') ? '../' : '';
 assert.ok(html.includes('<script src="' + prefix + 'tillsyno-versions.js?v=' + app + '" defer></script>'), page + ' loads tillsyno-versions.js');
 const found = [...html.matchAll(LABEL)];
 assert.ok(found.length > 0, page + ' has version labels');
 for (const [whole, , keys] of found) {
  for (const key of keys.split(',')) assert.ok(key === 'app' || versions.modules[key], page + ': unknown key ' + key);
  labels.push({page, whole, keys});
 }
}

// 2. Browser checks
const expected = keys => keys.split(',').map(key => key === 'app' ? 'Tillsyno v' + app
 : versions.modules[key].name + ' ' + versions.modules[key].version).join(' · ');
const fixture = (prefix, items) => '<!doctype html><meta charset="utf-8"><body>'
 + items.map((item, i) => '<div id="l' + i + '">' + item.whole + '</div>').join('')
 + '<script src="' + prefix + 'tillsyno-versions.js" defer></script></body>';
let blockVersions = false;
const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://x');
 const send = (type, body) => { res.writeHead(200, {'Content-Type': type}); res.end(body); };
 if (url.pathname === '/root.html') return send('text/html', fixture('', labels));
 if (url.pathname === '/controlflow-revision/sub.html') return send('text/html', fixture('../', labels));
 if (url.pathname === '/versions.json' && blockVersions) { res.writeHead(404); return res.end(); }
 if (url.pathname === '/versions.json') return send('application/json', read('versions.json'));
 if (url.pathname === '/tillsyno-versions.js') return send('text/javascript', read('tillsyno-versions.js'));
 res.writeHead(404); res.end();
});

(async () => {
 await new Promise(done => server.listen(0, '127.0.0.1', done));
 const base = 'http://127.0.0.1:' + server.address().port;
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage();
  for (const at of ['/root.html', '/controlflow-revision/sub.html']) {
   await page.goto(base + at);
   await page.evaluate(() => window.TillsynoVersions.ready);
   for (let i = 0; i < labels.length; i++) {
    const text = await page.locator('#l' + i + ' [data-tillsyno-version]').textContent();
    assert.equal(text, expected(labels[i].keys), at + ' ' + labels[i].page + ' ' + labels[i].keys);
   }
  }
  // Without versions.json a label keeps its own text (e.g. CE-märkning 1.2) and nothing breaks.
  blockVersions = true;
  await page.goto(base + '/root.html');
  assert.equal(await page.evaluate(() => window.TillsynoVersions.ready), null);
  const ce = labels.findIndex(item => item.page === 'ce-markning.html');
  assert.equal(await page.locator('#l' + ce + ' [data-tillsyno-version]').textContent(), 'CE-märkning 1.2');
  console.log('PASS module versions: ' + labels.length + ' labels on ' + PAGES.length + ' pages, app ' + app);
 } finally {
  await browser.close();
  server.close();
 }
})().catch(error => { console.error(error); process.exit(1); });
