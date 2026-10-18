/* Run the established grouped-work/persistence regression against TEST 9.24.
 * The visible rows now use SmartMatch's editable checklist component. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-9.cjs');
let source=fs.readFileSync(file,'utf8').replaceAll('v9-9','v9-24').replaceAll("load('9-9')","load('9-14')");
const anchor='const task=new Module(file,module);';
source=source.replace(anchor,`source=source
 .replaceAll("#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(node=>({heading:node.querySelector('h3.rtWorkSectionTitle')?.textContent,values:[...node.querySelectorAll('label.rtWorkRow span.rtWorkValue')].map(span=>span.textContent)})))", "#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(node=>({heading:node.querySelector('h3.rtWorkSectionTitle')?.textContent,values:[...node.querySelectorAll('.pwCheckContent small')].map(span=>span.textContent)})))")
 .replaceAll("#pwChecklist .rtWorkRow span.rtWorkValue", "#pwChecklist .pwCheckContent small")
 .replaceAll("#pwChecklist .rtWorkRow input", "#pwChecklist .pwCheckRow input")
 .replaceAll(".rtWorkSection[data-section-key=\\\"daglasning\\\"] .rtWorkRow input", ".rtWorkSection[data-section-key=\\\"daglasning\\\"] .pwCheckRow input")
 .replaceAll(".rtWorkSection[data-section-key=\\\"nattlasning\\\"] .rtWorkRow input", ".rtWorkSection[data-section-key=\\\"nattlasning\\\"] .pwCheckRow input")
 .replaceAll("document.getElementById('pwChecklistMeta').textContent==='1 av 8 klara'", "document.getElementById('pwChecklistMeta').textContent==='1 / 8 klara'");
${anchor}`);
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
