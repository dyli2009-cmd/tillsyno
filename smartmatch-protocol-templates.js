/* SmartMatch reusable customer protocol templates, v1.
   Keep layout metadata independent from each project's checklist content. */
(()=>{
 'use strict';
 const egenkontroll=Object.freeze({
  id:'egenkontroll-v1',
  name:'Mall för egenkontroll',
  title:'EGENKONTROLL',
  page:'A4 portrait',
  pageMarginsMm:Object.freeze({left:12,right:12}),
  logoBoxMm:Object.freeze({x:12,y:8,width:58,height:18}),
  headerBoxMm:Object.freeze({x:12,y:8,width:186,height:18}),
  columnWidths:Object.freeze([9,101,14,23,23,16]),
  columns:Object.freeze(['Nr','Benämning / kontrollpunkt','Ingår ej','Klart utan anmärkning','Klart med anmärkning','Signatur']),
  notesHeading:'ALLMÄN INFO / ANMÄRKNING'
 });
 window.SmartMatchProtocolTemplateLibrary=Object.freeze({egenkontroll});
})();
