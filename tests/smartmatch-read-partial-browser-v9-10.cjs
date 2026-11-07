/* Run the immutable TEST9.9 partial/duplicate/product regression against9.10. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'smartmatch-read-partial-browser-v9-9.cjs');
const source=fs.readFileSync(file,'utf8').replaceAll('v9-9','v9-10').replaceAll("revision='9-9'","revision='9-10'").replaceAll('v99','v910').replaceAll('TEST 9.9','TEST 9.10');
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
