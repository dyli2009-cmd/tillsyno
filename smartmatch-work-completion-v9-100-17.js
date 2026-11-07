/* Per-position installation sides. Stored with the existing project rowStages. */
(function(root){
 'use strict';
 function split(item){
  if(!item||item.kind==='extra-time')return false;
  const text=[item.label,item.value].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(!/armbags?kontakt|armbags?tryck|sensor|rokdetektor/.test(text))return false;
  // A card with separate rows for each side is already split: never halve it twice.
  const outside=/\b(?:utsida|utvandig\w*)\b/.test(text),inside=/\b(?:insida|invandig\w*)\b/.test(text);
  return outside===inside;
 }
 function sides(o,item){
  if(o.checks?.[item.key])return {outside:true,inside:true};
  const value=o.rowStages?.[item.key]?.sides;
  return {outside:value?.outside===true,inside:value?.inside===true};
 }
 function fraction(o,item){
  if(o.checks?.[item.key])return 1;
  if(!split(item))return 0;
  const state=sides(o,item);return (Number(state.outside)+Number(state.inside))/2;
 }
 function setDone(o,item,done){
  o.checks=o.checks||{};o.checks[item.key]=!!done;
  if(split(item)||o.rowStages?.[item.key]?.sides){
   o.rowStages=o.rowStages||{};
   o.rowStages[item.key]={...(o.rowStages[item.key]||{}),sides:{outside:!!done,inside:!!done}};
  }
 }
 function setSide(o,item,side,done){
  if(!split(item)||!['outside','inside'].includes(side))return;
  const state=sides(o,item);state[side]=!!done;
  o.rowStages=o.rowStages||{};o.rowStages[item.key]={...(o.rowStages[item.key]||{}),sides:state};
  o.checks=o.checks||{};o.checks[item.key]=state.outside&&state.inside;
 }
 const api=Object.freeze({split,sides,fraction,setDone,setSide});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.SmartMatchWorkCompletion=api;
})(typeof window!=='undefined'?window:globalThis);
