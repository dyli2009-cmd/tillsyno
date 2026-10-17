/* SmartMatch 10.1 — isolerad SmartScan-hjälpmodul. Ingen ändring av SmartMatch 10.0 eller produktionsflöden. */
(function(global){
 'use strict';
 function normalizeCode(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,'');}
 function matchCode(drawingCode,cardCode){return !!normalizeCode(drawingCode)&&normalizeCode(drawingCode)===normalizeCode(cardCode);}
 function scanRegion(box,pageWidth,pageHeight){
  if(!box||!pageWidth||!pageHeight)return null;
  const x=Math.max(0,Math.min(pageWidth,Number(box.x)||0));
  const y=Math.max(0,Math.min(pageHeight,Number(box.y)||0));
  const width=Math.max(0,Math.min(pageWidth-x,Number(box.width)||0));
  const height=Math.max(0,Math.min(pageHeight-y,Number(box.height)||0));
  return width&&height?{x,y,width,height}:null;
 }
 global.SmartMatch101SmartScan=Object.freeze({normalizeCode,matchCode,scanRegion});
})(window);
