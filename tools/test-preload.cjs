// Loaded by tools/run-tests.mjs (node -r) into every test process. Test harness only.
// 1. Tests that name a browser path that does not exist on this machine use CHROMIUM_PATH.
// 2. auth/module-code-gate.js asks Supabase whether a module needs a code. Tests have no
//    Supabase, so the gate would cover the page; here it opens as if no code were required.
//    Set TILLSYNO_TEST_REAL_CODE_GATE=1 to keep the real gate.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
let playwright;
try { playwright = require(modules ? path.join(modules, 'playwright') : 'playwright'); } catch (_) { return; }
// An init script, not request routing: routing in Playwright bypasses the service worker,
// which would break the offline-cache tests. The page is presented as a module without a
// code lock (no data-code-module), so the real gate script opens the page by itself.
function openGate() {
 const strip = () => {
  const root = document.documentElement;
  if (!root) return false;
  root.removeAttribute('data-code-module');
  return true;
 };
 if (strip()) return;
 const watcher = new MutationObserver(() => { if (strip()) watcher.disconnect(); });
 watcher.observe(document, {childList: true});
}
async function prepare(context) {
 if (process.env.TILLSYNO_TEST_REAL_CODE_GATE !== '1') await context.addInitScript(openGate);
 return context;
}
function browserPath(options = {}) {
 const wanted = options.executablePath;
 if (wanted && !fs.existsSync(wanted) && process.env.CHROMIUM_PATH) return {...options, executablePath: process.env.CHROMIUM_PATH};
 return options;
}
for (const type of [playwright.chromium, playwright.firefox, playwright.webkit].filter(Boolean)) {
 const launch = type.launch.bind(type), persistent = type.launchPersistentContext.bind(type);
 type.launch = async (options) => {
  const browser = await launch(browserPath(options));
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => prepare(await newContext(...args));
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => { const page = await newPage(...args); await prepare(page.context()); return page; };
  return browser;
 };
 type.launchPersistentContext = async (dir, options) => prepare(await persistent(dir, browserPath(options)));
}
