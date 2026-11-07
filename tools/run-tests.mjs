#!/usr/bin/env node
// Runs every test in tests/*.cjs, one Node process per file, with the environment the
// tests expect (Playwright, Chromium, @napi-rs/canvas, pdf-lib, pdfjs-dist 3.11.174 fonts
// and the repository's own PDF libraries). Nothing is written inside the repository.
// tools/test-preload.cjs is loaded into each test: it supplies the browser path and opens the
// module code lock, which needs Supabase (see that file).
//
// Usage: node tools/run-tests.mjs [--modules <dir>] [--jobs 3] [--timeout 300] [name-filter ...]
//   A filter ending in .cjs selects that exact file; other filters match part of the name.
//   --modules  a node_modules folder that contains playwright, @napi-rs/canvas, pdf-lib and
//              pdfjs-dist@3.11.174. Default: $CODEX_PRIMARY_RUNTIME_NODE_MODULES, otherwise
//              the global npm folder. Prepare one with:
//              npm install --prefix <folder> @napi-rs/canvas pdf-lib@1.17.1 pdfjs-dist@3.11.174
//              (Playwright itself can be linked from the global installation.)
//              PyMuPDF for drawing-ocr-pdf: pip install --target <folder>/../python pymupdf
//   --report   write a JSON summary to this file.
//   --logs     save each test's full output as <name>.log in this folder.
// A test reports SKIP by printing a line that starts with "SKIP" and exiting with code 0,
// for example when it needs a real customer drawing that is not kept in the repository.
// tests/known-failures.json lists failures that wait for a decision or a fix of their own:
// they are reported as KNOWN and do not fail the run. A known test that passes is
// reported as FIXED so it can be removed from the list.
import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {const i = args.indexOf(name); if (i < 0) return fallback; const value = args[i + 1]; args.splice(i, 2); return value;};
const globalModules = () => {try {return execFileSync('npm', ['root', '-g'], {encoding: 'utf8'}).trim();} catch (_) {return '';}};
const modules = path.resolve(option('--modules', process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || globalModules()));
const jobs = Math.max(1, Number(option('--jobs', '3')));
const timeout = Math.max(10, Number(option('--timeout', '300'))) * 1000;
const report = option('--report', '');
const logs = option('--logs', '');
if (logs) fs.mkdirSync(logs, {recursive: true});
const filters = args;

const requireFrom = createRequire(path.join(modules, 'noop.js'));
let chromium = process.env.CHROMIUM_PATH || '';
if (!chromium) {try {chromium = requireFrom('playwright').chromium.executablePath();} catch (_) {}}
const missing = ['playwright', '@napi-rs/canvas', 'pdf-lib', 'pdfjs-dist'].filter(name => !fs.existsSync(path.join(modules, name)));
if (missing.length) console.warn('Missing in ' + modules + ': ' + missing.join(', ') + ' (tests that need them will fail).');

const env = {
 ...process.env,
 CODEX_PRIMARY_RUNTIME_NODE_MODULES: modules,
 NODE_PATH: [modules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
 PDFJS_DIR: process.env.PDFJS_DIR || path.join(root, 'vendor'),
 // Optional Python packages (PyMuPDF for the OCR PDF comparison) in a "python" folder next to the modules.
 ...(fs.existsSync(path.join(modules, '..', 'python')) ? {PYTHONPATH: [path.join(modules, '..', 'python'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)} : {}),
 ...(chromium ? {CHROMIUM_PATH: chromium, SMARTMATCH_CHROMIUM_PATH: process.env.SMARTMATCH_CHROMIUM_PATH || chromium, CHROMIUM_EXECUTABLE: process.env.CHROMIUM_EXECUTABLE || chromium} : {}),
};
let known = {};
try {known = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'known-failures.json'), 'utf8'));} catch (_) {}
const files = fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.cjs'))
 .filter(name => !filters.length || filters.some(f => f.endsWith('.cjs') ? name === f : name.includes(f))).sort();

function run(name) {
 return new Promise(resolve => {
  const started = Date.now(), work = fs.mkdtempSync(path.join(os.tmpdir(), 'tillsyno-test-'));
  const child = spawn(process.execPath, ['-r', path.join(root, 'tools', 'test-preload.cjs'), path.join('tests', name)], {cwd: root, env: {...env, TMPDIR: work}, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '', timedOut = false;
  child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d);
  const timer = setTimeout(() => {timedOut = true; child.kill('SIGKILL');}, timeout);
  child.on('close', code => {
   clearTimeout(timer); fs.rmSync(work, {recursive: true, force: true});
   if (logs) fs.writeFileSync(path.join(logs, name + '.log'), output);
   let status = timedOut ? 'TIMEOUT' : code === 0 ? (/^SKIP\b/m.test(output) ? 'SKIP' : 'PASS') : 'FAIL';
   if (known[name]) status = status === 'PASS' ? 'FIXED' : status === 'SKIP' ? 'SKIP' : 'KNOWN';
   const lines = output.trim().split('\n').filter(Boolean);
   const detail = status === 'PASS' ? '' : status === 'KNOWN' || status === 'FIXED' ? known[name] : status === 'SKIP' ? (lines.find(l => /^SKIP\b/.test(l)) || '') :
    (lines.find(l => /^\s*\w*Error\b.*:|ERR_|ENOENT|Cannot find|not defined|AssertionError/.test(l)) || lines.at(-1) || '');
   resolve({name, status, seconds: Math.round((Date.now() - started) / 100) / 10, detail: detail.slice(0, 300)});
  });
 });
}

const results = [];
let next = 0;
async function worker() {
 while (next < files.length) {
  const result = await run(files[next++]);
  results.push(result);
  console.log(result.status.padEnd(7), result.name, result.seconds + ' s', result.detail ? '· ' + result.detail : '');
 }
}
await Promise.all(Array.from({length: Math.min(jobs, files.length)}, worker));
const count = status => results.filter(r => r.status === status).length;
console.log(`\n${results.length} tests: ${count('PASS')} passed, ${count('FAIL')} failed, ${count('TIMEOUT')} timed out, ${count('SKIP')} skipped, ${count('KNOWN')} known failures${count('FIXED') ? ', ' + count('FIXED') + ' known failures now pass (remove them from tests/known-failures.json)' : ''}.`);
if (report) fs.writeFileSync(report, JSON.stringify(results.sort((a, b) => a.name.localeCompare(b.name)), null, 1));
process.exitCode = count('FAIL') || count('TIMEOUT') ? 1 : 0;
