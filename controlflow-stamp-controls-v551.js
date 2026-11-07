/* One size/arrow editor inside the existing stamp selection panel. */
(function(root,factory){
 'use strict';
 const style=root?.ControlflowStampStyle||(typeof module==='object'&&module.exports?require('./controlflow-stamp-style-v549.js'):null);
 const api=factory(style);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document){root.ControlflowStampControls=api;api.install(root);}
})(typeof window==='object'?window:null,function(Style){
 'use strict';
 const arrowChoices=Object.freeze([[.5,'Tunn'],[1,'Normal'],[1.5,'Lite tjockare'],[2,'Tjock'],[3,'Extra tjock']]);
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const round=value=>Math.round(value*10000)/10000;

 // The adapter supplies the same selection and history as the lock tool. A
 // placement lock never blocks a size change or changes the saved anchor.
 function createController(adapter){
  const mode=()=>adapter.mode();
  const eligible=()=>{
   const current=new Set(adapter.items());
   return (adapter.eligible?adapter.eligible():adapter.items()).filter(item=>current.has(item)&&Style.applies(item,mode()));
  };
  const selected=()=>{
   const available=new Set(eligible());
   return adapter.selected().filter(item=>available.has(item));
  };
  function edit(field,read,next,options={}){
   if(adapter.busy())return {changed:false,objects:0};
   const list=selected();if(!list.length)return {changed:false,objects:0};
   const project=adapter.project(),allItems=adapter.items(),available=eligible();
   const copies=list.map(item=>({...item,[field]:next(read(item,mode()))}));
   const modified=list.filter((item,index)=>item[field]!==copies[index][field]);
   const nextProject={...project};
   Style.remember(nextProject,allItems,copies,{stamp:field==='customerStampScale',arrow:field==='customerArrowScale'},mode(),
    {...options,all:list.length===available.length&&available.every(item=>list.includes(item))});
   const defaultChanged=JSON.stringify(nextProject[Style.DEFAULT_KEY])!==JSON.stringify(project[Style.DEFAULT_KEY]);
   if(!modified.length&&!defaultChanged)return {changed:false,objects:0};
   adapter.beforeChange?.();
   list.forEach((item,index)=>{item[field]=copies[index][field];});
   if(defaultChanged)project[Style.DEFAULT_KEY]=nextProject[Style.DEFAULT_KEY];
   adapter.afterChange?.();
   return {changed:true,objects:modified.length,selected:list.length,defaultChanged};
  }
  function setPercent(value){
   const percent=Number(value);
   if(!Number.isFinite(percent)||percent<Style.limits.stampMin*100||percent>Style.limits.stampMax*100)return {changed:false,objects:0,invalid:true};
   return edit('customerStampScale',Style.stampScale,()=>round(percent/100));
  }
  function step(direction){
   if(direction!==1&&direction!==-1)return {changed:false,objects:0,invalid:true};
   const delta=direction*.05;
   return edit('customerStampScale',Style.stampScale,value=>round(clamp(value+delta,Style.limits.stampMin,Style.limits.stampMax)),{delta});
  }
  function setArrow(value){
   const width=Number(value);if(!arrowChoices.some(([choice])=>choice===width))return {changed:false,objects:0,invalid:true};
   return edit('customerArrowScale',Style.arrowScale,()=>width);
  }
  return {selected,setPercent,step,setArrow};
 }

 function install(root){
  const document=root.document;
  if(!Style||document.documentElement.dataset.controlflowUi!=='1')return;
  let mounted=false,syncControls=null;
  function mount(){
   if(mounted)return;
   const selection=root.SecurityStampSelection,panel=document.getElementById('securityStampSelectionPanel');
   const mode=document.documentElement.dataset.cfStampMode;
   if(!selection?.selectedObjects||!panel||!['security','revision'].includes(mode)||typeof items==='undefined')return;
   mounted=true;
   const controller=createController({mode:()=>mode,items:()=>items,project:()=>project,
    selected:()=>selection.selectedObjects(),eligible:()=>selection.eligibleObjects?.()||items,busy:()=>!selection.isActive()||selection.isBusy(),
    beforeChange:()=>{securitySessionHistory.endGroup();securitySessionHistory.record();},
    afterChange:()=>{save();securitySessionHistory.endGroup();drawMarkers();}});
   const group=document.createElement('div');group.id='controlflowStampControls';group.setAttribute('role','group');group.setAttribute('aria-label','Stämpelstorlek och pillinje');
   const sizeField=document.createElement('div');sizeField.className='cfStampControlField';
   const label=document.createElement('label');label.htmlFor='controlflowStampPercent';label.textContent='Stämpelstorlek';
   const row=document.createElement('div');row.className='cfStampSizeRow';
   function button(id,text,title){const node=document.createElement('button');node.id=id;node.type='button';node.textContent=text;node.title=title;node.setAttribute('aria-label',title);return node;}
   const minus=button('controlflowStampSmaller','−','Minska stämpelstorleken med 5 procentenheter');
   const plus=button('controlflowStampLarger','+','Öka stämpelstorleken med 5 procentenheter');
   const inputWrap=document.createElement('span');inputWrap.className='cfStampPercentWrap';
   const percent=document.createElement('input');percent.id='controlflowStampPercent';percent.type='number';percent.inputMode='decimal';percent.min='25';percent.max='300';percent.step='1';percent.required=true;percent.setAttribute('aria-label','Stämpelstorlek i procent, 25 till 300');
   const suffix=document.createElement('span');suffix.textContent='%';suffix.setAttribute('aria-hidden','true');inputWrap.append(percent,suffix);
   row.append(minus,inputWrap,plus);sizeField.append(label,row);
   const arrowField=document.createElement('label');arrowField.className='cfStampControlField';arrowField.textContent='Pillinje';
   const arrow=document.createElement('select');arrow.id='controlflowStampArrow';arrow.setAttribute('aria-label','Pillinjens tjocklek');
   const mixed=document.createElement('option');mixed.value='mixed';mixed.textContent='Olika tjocklekar';mixed.disabled=true;arrow.append(mixed);
   for(const [value,text]of arrowChoices){const option=document.createElement('option');option.value=String(value);option.textContent=text;arrow.append(option);}arrowField.append(arrow);
   const scopeNote=document.createElement('small');scopeNote.id='controlflowStampScopeNote';scopeNote.hidden=true;scopeNote.setAttribute('role','status');
   group.append(sizeField,arrowField,scopeNote);panel.insertBefore(group,document.getElementById('securityStampSelectionMessage'));
   let dirty=false,previousSelection='';
   function sync(){
    const list=controller.selected(),key=JSON.stringify([selection.isActive(),list.map(item=>item.uid)]);
    const selectedCount=selection.selectedObjects().length;
    scopeNote.hidden=selectedCount===list.length;
    scopeNote.textContent=scopeNote.hidden?'':'Storlek och pillinje gäller '+list.length+(list.length===1?' pilstämpel':' pilstämplar')+' av '+selectedCount+' valda. Numreringsrutor har egna storleksverktyg.';
    if(key!==previousSelection){dirty=false;previousSelection=key;}
    const blocked=!selection.isActive()||selection.isBusy()||!list.length;
    const sizes=[...new Set(list.map(item=>Math.round(Style.stampScale(item,mode)*100)))];
    if(!dirty){percent.value=sizes.length===1?String(sizes[0]):'';percent.placeholder=list.length?'Olika':'Välj';}
    percent.disabled=blocked;
    minus.disabled=blocked||list.every(item=>Style.stampScale(item,mode)<=Style.limits.stampMin);
    plus.disabled=blocked||list.every(item=>Style.stampScale(item,mode)>=Style.limits.stampMax);
    const widths=[...new Set(list.map(item=>Style.arrowScale(item,mode)))];arrow.value=widths.length===1?String(widths[0]):'mixed';arrow.disabled=blocked;
   }
   function announce(result,kind){
    if(!result.changed)return;
    const message=document.getElementById('securityStampSelectionMessage');
    if(message)message.textContent=kind+' ändrad för '+result.selected+(result.selected===1?' vald pilstämpel':' valda pilstämplar')+'. Ångra finns i ritningsraden.';
   }
   function applyPercent(){
    if(percent.disabled||!percent.reportValidity())return;
    const value=percent.valueAsNumber;dirty=false;announce(controller.setPercent(value),'Storlek');sync();
   }
   minus.onclick=()=>{dirty=false;announce(controller.step(-1),'Storlek');sync();};
   plus.onclick=()=>{dirty=false;announce(controller.step(1),'Storlek');sync();};
   percent.addEventListener('input',()=>{dirty=true;});percent.addEventListener('change',applyPercent);
   percent.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyPercent();}});
   arrow.onchange=()=>{announce(controller.setArrow(arrow.value),'Pillinje');sync();};
   syncControls=sync;sync();
  }
  root.addEventListener('controlflow-stamp-selection-change',()=>{mount();syncControls?.();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 }
 return Object.freeze({createController,arrowChoices,install});
});
