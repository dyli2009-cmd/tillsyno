'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.dataset={};this.attributes={};this.style={setProperty:(key,value)=>{this.style[key]=value;}};this.textContent='';}
 append(...children){children.forEach(child=>{this.children.push(child);child.parent=this;});}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,handler){this.listeners[name]=handler;}
 querySelector(selector){return this.all().find(node=>selector[0]==='.'?node.className?.split(' ').includes(selector.slice(1)):node.tagName===selector)||null;}
 all(){return this.children.flatMap(child=>[child,...child.all()]);}
 focus(){this.focused=true;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
}
const nodes={pwPositionChanges:new Element('section')};
const document={createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text}),getElementById:id=>nodes[id]};
const window={},context=vm.createContext({window,document,console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../smartmatch-position-changes-v9-100.js'),'utf8'),context);
const C=window.SmartMatchPositionChanges,o={id:'GS4:position-1',code:'GS4',position:1,overrides:{},checks:{da:true},customItems:[]};
const item={key:'da',source:'base',label:'Dörrautomatik',value:'ED100',responsibility:'GS'};
let changes=0;
window.SmartMatchAppBridge={setPositionChange:async(o,item,values)=>{C.set(o,item,values);changes++;C.render(o);},restorePositionChange:async(o,item)=>{C.restore(o,item);C.render(o);},setStatus(){}};
const host=new Element('div'),actions=new Element('div');host.append(actions);
const findButton=(root,text)=>root.all().find(node=>node.tagName==='button'&&node.textContent===text);
async function run(){
 C.appendAction(o,item,actions,host);assert.equal(actions.children.length,1);assert.match(actions.children[0].attributes['aria-label'],/Dörrautomatik/);
 actions.children[0].onclick();let form=host.querySelector('form');assert(form);assert.equal(changes,0);assert(form.querySelector('textarea').focused);
 assert.equal(form.querySelector('input').checked,true);findButton(form,'Avbryt').onclick();assert.equal(host.querySelector('form'),null);assert.equal(changes,0);
 actions.children[0].onclick();form=host.querySelector('form');const event={preventDefault(){},stopPropagation(){this.stopped=true;}};
 await form.onsubmit(event);assert.equal(changes,0);assert.match(form.querySelector('.pwPositionChangeError').textContent,/Skriv/);assert(event.stopped);
 form.querySelector('textarea').value='Beställaren: ingen automatik <script>alert(1)</script>';form.querySelector('select').value='red';
 await form.onsubmit(event);assert.equal(changes,1);assert.equal(host.querySelector('form'),null);assert(C.isExcluded(o,item));
 const panel=nodes.pwPositionChanges;assert.equal(panel.hidden,false);assert.match(panel.querySelector('.pwPositionChangeTitle').textContent,/× Utgår: Dörrautomatik/);assert.equal(panel.all().filter(node=>node.tagName==='input').length,0,'excluded row has no completion checkbox');
 assert.equal(panel.all().filter(node=>node.tagName==='script').length,0,'notes remain plain text');
 const marker=new Element('button');marker.title='GS4';C.decorateMarker(marker,o);assert(marker.querySelector('.pwPositionChangeBadge'));assert.match(marker.attributes['aria-label'],/Utgår/);assert.equal(marker.textContent,'');
 findButton(panel,'Återställ produkt').onclick();assert(!C.isExcluded(o,item));assert.equal(C.active(o).length,0);assert.match(panel.querySelector('.pwPositionChangeTitle').textContent,/Återställd/);
 findButton(panel,'Ändra').onclick();form=panel.querySelector('form');form.querySelector('input').checked=false;form.querySelector('textarea').value='Kontrollera placeringen';form.querySelector('select').value='blue';await form.onsubmit(event);
 assert(!C.isExcluded(o,item));assert.equal(C.active(o)[0].color,'blue');assert.match(panel.querySelector('.pwPositionChangeTitle').textContent,/⚑ Ändring/);
 assert(findButton(panel,'Avsluta flagga'));assert.equal(o.code,'GS4');
 console.log('PASS inline editor open/cancel/save, required note, exclusion and flag-only states, restore, drawing badge, text escaping, no shared-card rename');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
