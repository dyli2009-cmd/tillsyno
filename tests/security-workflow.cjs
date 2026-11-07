const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'security.js'),'utf8');
const html=fs.readFileSync(path.join(root,'security.html'),'utf8');

assert(js.includes("PDFName.of('SecurityServiceWork')"),'Security work-PDF metadata must be embedded/read');
assert(js.includes("app:'security-service',version:2"),'Security work-PDF state version must exist');
assert(js.includes('inspectSecurityWorkPdf'),'Security work-PDF import must exist');
assert(js.includes("project.order='';project.date=localToday();project.nextDate=suggestedNextDate;project.signature=''"),'New service must reset visit-specific fields without clearing technician');
assert(js.includes('previousIssues')&&js.includes('previousServiceDate'),'Previous service history must be preserved');
assert(html.includes('id="secNewServiceBtn"'),'New service button must exist');
assert(html.includes('id="secPreviousPanel"'),'Previous service panel must exist');


assert(js.includes("go('drawing');$('secHint').textContent=securityDrawingLabel(o)+' är tillagd."),'New Security objects must stay on drawing for arrow/label adjustment');
assert(js.includes("function localToday()"),'Security project must have a local-today helper');
assert(js.includes("date:localToday()"),'A new Security project must default to today');
assert(html.includes('id="secOpenWorkDialog"')&&html.includes('id="secOpenNewService"')&&html.includes('id="secOpenContinue"'),'Saved work PDF must ask New service vs Continue/edit');
assert(js.includes("project.order='';project.date=localToday();project.nextDate=suggestedNextDate;project.signature=''"),'New service must reset visit fields while retaining technician');
assert(!js.includes("project.technician=''"),'New Security service must not clear the technician');
assert(js.includes("project.companyContact===previous"),'Technician should auto-fill service-company contact while it remains linked');
assert(js.includes("size=label.length>16?7.5:8.5"),'Security labels in exported drawing must use larger text');
assert(js.includes("shiftedNextDate(previousDate,previousNextDate)"),'Next inspection interval should carry forward when available');

console.log('Security work-PDF / guided new-service regression checks passed.');
