/* Keep the immutable portable-project assertions against the new work opener.
 * TEST 9.10 imports the immediate previous TEST 9.9 local archive, so the
 * migration fixture is created there. All PDFs remain generated in memory. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
process.env.READ_PROJECT_REVISION = '9-10';
const source = fs.readFileSync(path.join(__dirname, 'smartmatch-read-project-browser-v9-7.cjs'), 'utf8')
  .replaceAll('v9-6', 'v9-9')
  .replaceAll('from-9-6', 'from-9-9')
  .replaceAll('9.6', '9.9')
  .replaceAll('9.7', '9.10');
const suite = new Module(__filename, module);
suite.filename = __filename;
suite.paths = Module._nodeModulePaths(__dirname);
suite._compile(source, __filename);
