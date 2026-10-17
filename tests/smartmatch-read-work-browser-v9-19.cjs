/* Keep the prior revision fixture unchanged and run its assertions against TEST 9.19. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-9.cjs');
const source=fs.readFileSync(file,'utf8').replaceAll('v9-9','v9-19').replaceAll("load('9-9')","load('9-14')");
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
