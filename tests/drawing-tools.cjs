const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'drawing-tools.html'),'utf8');
const js=fs.readFileSync(path.join(root,'drawing-tools.js'),'utf8');
const transfer=fs.readFileSync(path.join(root,'drawing-transfer.js'),'utf8');
// index.html only forwards to the start page app.html.
const index=fs.readFileSync(path.join(root,'app.html'),'utf8');
const security=fs.readFileSync(path.join(root,'security.html'),'utf8');

assert(index.includes('Ritningsverktyg'),'Home must expose Drawing Tools');
assert(html.includes('id="removeText"')&&html.includes('id="removePage"'),'Drawing Tools must expose cleanup and page removal');
assert(js.includes('whiteOutText'),'Drawing Tools must support text cleanup');
assert(js.includes('embedJpg'),'Drawing Tools must flatten/optimize pages');
// Ritningsverktyg saves the cleaned PDF; the former direct hand-over to Dörrautomatik and
// Säkerhetsservice (DoorServiceDrawingTransfer, "Öppna i …" buttons) is no longer used by any module.
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
