// Generated, already-reviewed project for testing the real Avläsning exporter.
// It deliberately avoids fresh OCR: this regression concerns saving completed
// work and retaining the application's embedded project state.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
export const {PDFDocument,PDFName,PDFHexString,PDFRawStream,StandardFonts}=require('../../vendor/pdf-lib.min.js');

export async function projectFixture({paddingBytes=0,sourceTableCharacters=0,outputPath}={}){
  const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica);
  const plan=document.addPage([595,842]),card=document.addPage([595,842]);
  plan.drawText('Synthetic drawing GS23',{x:60,y:650,size:18,font});
  card.drawText('Beslagskod: GS23',{x:60,y:750,size:20,font});
  card.drawText('Synthetic lock EL580',{x:60,y:670,size:14,font});
  if(paddingBytes){
    // An application-specific page stream is valid PDF data and survives the
    // real exporter. It adds transfer size without private data, a huge decoded
    // image or hundreds of pages. Rendering speed is not the subject of this test.
    const stream=PDFRawStream.of(document.context.obj({Type:PDFName.of('SyntheticTestData')}),new Uint8Array(paddingBytes));
    plan.node.set(PDFName.of('SyntheticLargeFixture'),document.context.register(stream));
  }
  const positionId='sharepoint-fixture:GS23',itemKey='synthetic-lock',id='synthetic-card:GS23';
  const rect={x:.08,y:.08,w:.84,h:.06},table={x:.06,y:.16,w:.84,h:.26};
  // A long retained source/OCR table exercises project metadata size, which is
  // independent of the large opaque PDF stream used by the transfer test.
  const sourceLine='Synthetic door card text: lock EL580 GS. ';
  const rawTable=sourceTableCharacters?sourceLine.repeat(Math.ceil(sourceTableCharacters/sourceLine.length)).slice(0,sourceTableCharacters):'Synthetic lock EL580';
  const readTestData={
    schema:1,phase:'full',sourceId:'generated:sharepoint-save-browser',rects:{code:rect,table},pages:[2],
    cards:{[id]:{id,page:2,code:'GS23',originalCardCode:'GS23',header:'Beslagskod: GS23',codeRect:rect,tableRect:table,bounds:{x:.06,y:.08,w:.86,h:.34},rawTable,work:['Synthetic lock EL580'],workItems:[{text:'Synthetic lock EL580',key:itemKey,label:'Synthetic lock',value:'EL580',section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',choices:['GS23'],method:'PDF-text',confidence:100}},
    checks:{},matching:{version:2,hits:[{page:1,code:'GS23',rect:[60,650,160,675],box:{x:60/595,y:167/842,w:100/595,h:25/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000}],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},
    drawingSample:null,name:'Synthetic Microsoft 365 export project',
  };
  const payload={schema:6,projectId:'project:sharepoint-browser',projectRevision:1,instances:{},automationItems:[],readTestData};
  const json=JSON.stringify(payload);
  for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(json));
  const saved=await document.save(),bytes=Buffer.from(saved.buffer,saved.byteOffset,saved.byteLength);
  if(outputPath){await writeFile(outputPath,bytes);return {path:outputPath,size:bytes.length,positionId,itemKey,projectJSONLength:json.length};}
  return {bytes,positionId,itemKey,projectJSONLength:json.length};
}

export async function projectData(bytes){
  const document=await PDFDocument.load(bytes);
  const entry=document.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')),encoded=entry.asBytes();
  // Use the runtime's standard decoder for the fixture's UTF-16 PDF strings.
  // This assertion helper must not inherit pdf-lib.decodeText's argument limit.
  const text=encoded[0]===0xfe&&encoded[1]===0xff?new TextDecoder('utf-16be').decode(encoded)
    :encoded[0]===0xff&&encoded[1]===0xfe?new TextDecoder('utf-16le').decode(encoded):entry.decodeText();
  return JSON.parse(text);
}
