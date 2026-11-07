const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'drawing-tools.html'),'utf8');
const js=fs.readFileSync(path.join(root,'drawing-tools.js'),'utf8');
const transfer=fs.readFileSync(path.join(root,'drawing-transfer.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const security=fs.readFileSync(path.join(root,'security.html'),'utf8');

assert(index.includes('Ritningsverktyg'),'Home must expose Drawing Tools');
assert(html.includes('id="removeText"')&&html.includes('id="removePage"'),'Drawing Tools must expose cleanup and page removal');
assert(js.includes('whiteOutText'),'Drawing Tools must support text cleanup');
assert(js.includes('embedJpg'),'Drawing Tools must flatten/optimize pages');
assert(js.includes('DoorServiceDrawingTransfer.putPdf'),'Drawing Tools must transfer the cleaned PDF');
assert(transfer.includes("indexedDB.open('doorservice-drawing-transfer-v1'"),'Transfer must use IndexedDB for large PDFs');
assert(index.includes('drawing-transfer.js?v=2.4.29'),'Door Automation must accept Drawing Tools transfer');
assert(security.includes('drawing-transfer.js?v=2.4.29'),'Security Service must accept Drawing Tools transfer');
assert(html.includes('Öppna i Dörrautomatik')&&html.includes('Öppna i Säkerhetsservice'),'Drawing Tools must route to both service modes');
console.log('Drawing Tools regression checks passed.');

assert(html.includes('id="aggressiveClean"'),'Aggressive cleanup control must exist');
assert(html.includes('id="eraseMode"'),'Manual area eraser must exist');
assert(html.includes('id="removeColors"'),'Colored-mark cleanup must exist');
assert(js.includes('stripColoredMarks'),'Drawing Tools must remove colored marks when requested');
assert(js.includes('applyManualMasks'),'Manual erased areas must be applied to output');
assert(js.includes("addEventListener('pointerdown'"),'Area eraser must support direct pointer dragging');
console.log('Aggressive cleanup regression checks passed.');

assert(js.includes("DorrserviceWork"),'Drawing Tools must recognize Dörrservice work PDFs');
assert(js.includes("SecurityServiceWork"),'Drawing Tools must recognize Säkerhetsservice work PDFs');
assert(js.includes("decodePDFRawStream"),'Drawing Tools must extract embedded original drawing bytes');
assert(html.includes('id="selectPages"'),'Multi-page selection control must exist');
assert(html.includes('id="removeSelectedPages"'),'Bulk page removal control must exist');
assert(js.includes("selectedPages=new Set"),'Multi-page selection state must exist');
assert(js.includes("toRemove.forEach"),'Selected pages must be removable in one action');
console.log('Structural PDF cleanup regression checks passed.');

assert(html.includes('id="analyzeSize"'),'Drawing Tools must allow measuring optimization before save');
assert(html.includes('id="sizeOriginal"')&&html.includes('id="sizeNew"'),'Size comparison must show original and new sizes');
assert(html.includes('id="sizePercent"')&&html.includes('id="sizeVerdict"'),'Size comparison must show reduction percentage and verdict');
assert(js.includes('function updateSizeComparison'),'Drawing Tools must calculate before/after size results');
assert(js.includes("Stor förbättring")&&js.includes("Filen blev större"),'Size result must explain whether optimization is worthwhile');
console.log('PDF size comparison regression checks passed.');
