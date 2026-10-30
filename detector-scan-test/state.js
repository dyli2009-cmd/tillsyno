/* Only an explicitly saved test PDF restores controls. Cached source matches never do. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DetectorTestState=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function openingRecord({testFile=false,importedWork=null}={}){
  const own=testFile&&importedWork;
  if(own)return{...own,items:(own.items||[]).filter(o=>o.type==='detector')};
  const project={...(importedWork?.project||{})};
  delete project.detectorSample;delete project.detectorSetup;
  return{items:[],textNotes:[],drawingExtras:[],project,logoData:importedWork?.logoData||'',drawingRotations:importedWork?.drawingRotations};
 }
 function isReady(project,items){return project?.detectorSetup?.completed===true||(items||[]).some(o=>o.type==='detector');}
 return{openingRecord,isReady};
});
