const fs=require('fs'),assert=require('assert');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.hidden=false;this.textContent='';}
 append(...nodes){for(const node of nodes){if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);this.children.push(node);node.parentElement=this;}}
 after(node){const p=this.parentElement;if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);p.children.splice(p.children.indexOf(this)+1,0,node);node.parentElement=p;}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 scrollIntoView(){}
}
const body=new Element('body'),walk=e=>[e,...e.children.flatMap(walk)];
const document={body,createElement:tag=>new Element(tag),getElementById:id=>walk(body).find(e=>e.id===id)||null,querySelectorAll:s=>s==='[data-slr-edit]'?walk(body).filter(e=>e.dataset.slrEdit):[]};
const node=(tag,id,parent)=>{const e=new Element(tag);e.id=id;parent.append(e);return e;};
const dialog=node('dialog','slrFlowTestDialog',body),main=node('main','',dialog),root=node('div','slrTestDocRows',main),editor=node('section','slrEditor',main);editor.hidden=true;
const heading=node('h3','slrEditHeading',editor),fields=node('div','slrFields',editor);
const window={},source=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'../smartmatch-slr-test-module-v36-118.js'),'utf8').replace('window.SmartMatchSLRTest=','window.probe={draw,slrMountEditor,slrCloseEditor,set:()=>{item={id:"a"};templates={Riskanalys:new Uint8Array([1]),Loggbok:new Uint8Array([1])};names={Riskanalys:"risk.pdf",Loggbok:"log.pdf"}}};window.SmartMatchSLRTest=');
new Function('window','document',source)(window,document);const p=window.probe;p.set();p.draw();
const section=cat=>root.children.find(e=>e.dataset.slrCategory===cat);
assert.equal(root.children.length,10);assert(editor.hidden);
p.slrMountEditor('Riskanalys');assert.equal(editor.parentElement,section('Riskanalys'));assert.equal(section('Riskanalys').children[1],editor);assert(!editor.hidden);
const input=node('input','sampleField',fields);input.value='2026-10-13';p.draw();assert.equal(editor.parentElement,section('Riskanalys'));assert.equal(input.value,'2026-10-13');assert.equal(input.parentElement,fields);
p.slrCloseEditor();assert(editor.hidden);assert.equal(fields.children.length,0);assert.equal(heading.textContent,'');
p.slrMountEditor('Loggbok');assert.equal(editor.parentElement,section('Loggbok'));assert(!editor.hidden);assert.equal(section('Loggbok').children[1],editor);
p.slrCloseEditor();assert(editor.hidden);assert(document.querySelectorAll('[data-slr-edit]').every(e=>e.textContent==='Redigera fält'));
console.log('PASS: editor immediately below selected document; survives row redraw with inputs intact; close collapses and clears view; reopens under a different document.');
