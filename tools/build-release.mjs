#!/usr/bin/env node
// Builds a clean, deployable copy of the current Tillsyno web app.
//
// Only files that the live app actually needs are copied: the service
// worker's offline list (sw.js CORE), the pages linked from the start page,
// and every local file those files reference. Development notes, tests,
// fixtures, old module versions, workflows and the SharePoint pilot are
// never copied, so a deployment cannot publish them.
//
// Usage: node tools/build-release.mjs [--out build/release] [--denylist <file>]
//   --denylist  optional, untracked text file with one forbidden term or
//               /regex/flags per line (e.g. customer or project names).
//               The build fails if any copied text file contains one.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => {const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null;};
const out = path.resolve(root, option('--out') || 'build/release');
const denylistFile = option('--denylist');

// Never deployed, even if something references them.
const EXCLUDED = [
  /(^|\/)\./,                       // dotfiles and .git/.github
  /^tests\//, /^docs\//, /^tools\//, /^build\//, /^node_modules\//,
  /^sharepoint-test\//, /^sharepoint-[^/]*\.html$/,
  /^licensed-entry[^/]*\.html$/,    // former external portal entry
  /^supabase\//,                    // server code is deployed to Supabase, not to the web host
  /^(?!vendor\/).*\.md$/i,             // notes; third-party license files in vendor/ are kept
  /\.sql$/i, /\.cjs$/i, /\.mjs$/i, /\.ts$/i,
  /\.(pdf|dwg|dxf|dgn|rvt|rfa|ifc|skp|step|stp|stl|obj|3dm|pln|pla)$/i,
  /^test\.txt$/,
];
const excluded = rel => EXCLUDED.some(rule => rule.test(rel));
const TEXT = /\.(html|js|css|json|webmanifest|svg|txt)$/i;
const REFERENCE = /[A-Za-z0-9_.\-/]+\.(?:html|js|css|json|webmanifest|png|svg|jpe?g|gif|webp|ico|wasm|gz|traineddata|csv|woff2?|ttf|txt)\b/g;

const exists = rel => {try {return fs.statSync(path.join(root, rel)).isFile();} catch (_) {return false;}};
const normal = rel => path.posix.normalize(rel).replace(/^(\.\/)+/, '');

// Seeds: the offline list and the start pages.
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const core = sw.match(/const CORE=\[([\s\S]*?)\];/);
if (!core) throw Error('sw.js CORE list not found');
const seeds = new Set(['sw.js', 'index.html', 'app.html', 'manifest.webmanifest']);
for (const m of core[1].matchAll(/"([^"]+)"/g)) if (m[1] !== './') seeds.add(normal(m[1]));

const missingCore = [...seeds].filter(rel => !exists(rel));
if (missingCore.length) throw Error('Files listed for the app are missing: ' + missingCore.join(', '));

// A page is published only when it is in the offline list or reached through a
// real link (href/src/action) in a published page. Page names that merely appear
// inside scripts (lists of page names, old URLs) are reported, not published.
const QUOTED = new RegExp('[\'"`](' + REFERENCE.source + ')(?:[?#][^\'"`]*)?[\'"`]', 'g');
const LINK = /(?:href|src|action)\s*=\s*["']([^"'#?]+)/gi;
const included = new Set();
const scriptOnlyPages = new Map();
const queue = [...seeds];
const resolve = (dir, token) => {
  if (/^(https?:|data:|blob:|mailto:|javascript:)|^\/\//i.test(token)) return [];
  const clean = token.replace(/^\/+/, '');
  return [normal(path.posix.join(dir, clean)), normal(clean)].filter(c => !c.startsWith('..') && !excluded(c) && exists(c));
};
while (queue.length) {
  const rel = queue.shift();
  if (included.has(rel) || excluded(rel) || !exists(rel)) continue;
  included.add(rel);
  if (!TEXT.test(rel) || /\.min\.js$/.test(rel) || rel.startsWith('vendor/')) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const dir = path.posix.dirname(rel);
  if (/\.html$/i.test(rel)) for (const [, token] of text.matchAll(LINK)) {
    const [candidate] = resolve(dir, token);
    if (candidate && !included.has(candidate)) queue.push(candidate);
  }
  // In scripts only quoted strings count; a file name in a comment is not a dependency.
  const tokens = /\.js$/i.test(rel)
    ? [...text.matchAll(QUOTED)].map(m => m[1])
    : [...text.matchAll(REFERENCE)].map(m => m[0]);
  for (const token of tokens) {
    const [candidate] = resolve(dir, token);
    if (!candidate || included.has(candidate)) continue;
    if (/\.html$/i.test(candidate) && !seeds.has(candidate)) {
      if (!scriptOnlyPages.has(candidate)) scriptOnlyPages.set(candidate, new Set());
      scriptOnlyPages.get(candidate).add(rel);
      continue;
    }
    queue.push(candidate);
  }
}
const reported = [...scriptOnlyPages].filter(([page]) => !included.has(page));
// The CORE list itself must survive the exclusion rules, or the offline install would fail.
const coreExcluded = [...seeds].filter(rel => !included.has(rel));
if (coreExcluded.length) throw Error('Offline files blocked by exclusion rules: ' + coreExcluded.join(', '));

// Optional content check against an untracked denylist.
if (denylistFile) {
  const rules = fs.readFileSync(path.resolve(denylistFile), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => {const r = l.match(/^\/(.+)\/([a-z]*)$/); return r ? new RegExp(r[1], r[2].includes('i') ? r[2] : r[2] + 'i') : new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');});
  const hits = [];
  for (const rel of included) {
    if (!TEXT.test(rel)) continue;
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    rules.forEach((rule, index) => {if (rule.test(text)) hits.push(rel + ' (rule ' + (index + 1) + ')');});
  }
  if (hits.length) {console.error('Denylisted content found:\n  ' + hits.join('\n  ')); process.exit(2);}
}

fs.rmSync(out, {recursive: true, force: true});
let bytes = 0;
for (const rel of [...included].sort()) {
  const target = path.join(out, rel);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, rel), target);
  bytes += fs.statSync(target).size;
}
fs.writeFileSync(path.join(out, 'release-files.txt'), [...included].sort().join('\n') + '\n');
if (reported.length) {
  console.log('Pages named only inside scripts (not published; check that none is a navigation target):');
  for (const [page, from] of reported.sort()) console.log('  ' + page + '  <-  ' + [...from].join(', '));
}
console.log(`Release: ${included.size} files, ${(bytes / 1048576).toFixed(1)} MiB -> ${path.relative(root, out)}`);
