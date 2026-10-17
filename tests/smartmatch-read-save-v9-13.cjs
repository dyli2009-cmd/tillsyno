/* Run the real save/write race regression against TEST 9.13.
 * The immutable 9.7 suite keeps its assertions and fixtures; only the main
 * implementation under test changes. No old snapshots are rewritten. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const filename = __filename;
const source = fs.readFileSync(path.join(__dirname, 'smartmatch-read-save-v9-7.cjs'), 'utf8')
  .replaceAll('../smartmatch-read-test-main-v9-7.js', '../smartmatch-read-test-main-v9-13.js');
const suite = new Module(filename, module);
suite.filename = filename;
suite.paths = Module._nodeModulePaths(__dirname);
suite._compile(source, filename);
