// Generated, already-reviewed project for testing the real Avläsning exporter.
// It deliberately avoids fresh OCR: this regression concerns saving completed
// work and retaining the application's embedded project state.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export const {PDFDocument,PDFName,PDFHexString,StandardFonts}=require('../../vendor/pdf-lib.min.js');

export async function projectFixture(){
  const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica);
  const plan=document.addPage([595,842]),card=document.addPage([595,842]);
  plan.drawText('Synthetic drawing GS23',{x:60,y:650,size:18,font});
  card.drawText('Beslagskod: GS23',{x:60,y:750,size:20,font});
  card.drawText('Synthetic lock EL580',{x:60,y:670,size:14,font});
  const positionId='sharepoint-fixture:GS23',itemKey='synthetic-lock',id='synthetic-card:GS23';
  const rect={x:.08,y:.08,w:.84,h:.06},table={x:.06,y:.16,w:.84,h:.26};
  const readTestData={
    schema:1,phase:'full',sourceId:'generated:sharepoint-save-browser',rects:{code:rect,table},pages:[2],
    cards:{[id]:{id,page:2,code:'GS23',originalCardCode:'GS23',header:'Beslagskod: GS23',codeRect:rect,tableRect:table,bounds:{x:.06,y:.08,w:.86,h:.34},rawTable:'Synthetic lock EL580',work:['Synthetic lock EL580'],workItems:[{text:'Synthetic lock EL580',key:itemKey,label:'Synthetic lock',value:'EL580',section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',choices:['GS23'],method:'PDF-text',confidence:100}},
    checks:{},matching:{version:2,hits:[{page:1,code:'GS23',rect:[60,650,160,675],box:{x:60/595,y:167/842,w:100/595,h:25/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000}],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},
    drawingSample:null,name:'Synthetic Microsoft 365 export project',
  };
  const payload={schema:6,projectId:'project:sharepoint-browser',projectRevision:1,instances:{},automationItems:[],readTestData};
  for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
  return {bytes:Buffer.from(await document.save()),positionId,itemKey};
}

export async function projectData(bytes){
  const document=await PDFDocument.load(bytes);
  return JSON.parse(document.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
}
