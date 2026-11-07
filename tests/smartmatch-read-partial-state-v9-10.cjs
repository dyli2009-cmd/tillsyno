/* Keep the prior revision fixture unchanged and run its assertions against TEST9.10. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'smartmatch-read-partial-state-v9-9.cjs');
const source=fs.readFileSync(file,'utf8').replaceAll('v9-9','v9-10').replaceAll("load('9-9')","load('9-10')").replaceAll('TEST 9.9','TEST 9.10');
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
