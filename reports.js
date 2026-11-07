const REPORT_COLORS={ok:{rgb:[35,131,84],light:[225,240,231]},action:{rgb:[199,124,19],light:[255,240,213]},fail:{rgb:[189,63,70],light:[251,227,227]},untested:{rgb:[119,133,142],light:[232,237,240]}};
function buildServiceReportDoc(snapshot,includeProtocols){
 const {project:p,doors:ds,logoData:logo}=snapshot,doc=new jspdf.jsPDF('p','mm','a4');
 const left=12,width=186,bottom=277,line=4.4;let y=0;
 const sorted=ds.slice().sort((a,b)=>a.page-b.page||a.id.localeCompare(b.id,'sv',{numeric:true}));
 const status=d=>isDoorRemediated(d)?'ok':d.status==='fail'?'fail':hasDoorProblem(d)?'action':d.status==='ok'?'ok':'untested';
 const label=d=>isDoorRemediated(d)?'Åtgärdad':({ok:'Godkänd',action:d.status==='action'?'Åtgärd krävs':'Anmärkningar',fail:'Ej godkänd',untested:'Ej kontrollerad'})[status(d)];
 function text(value,x,y,size=9,bold=false,color=[32,52,64],opts){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(String(value||'-'),x,y,opts||{})}
 function header(title,subtitle){
  doc.setFillColor(255,255,255);doc.setDrawColor(55,55,55);doc.setLineWidth(.22);doc.rect(left,8,width,18,'FD');doc.line(left+58,8,left+58,26);
  if(logo){try{const image=doc.getImageProperties(logo),pad=2.5,scale=Math.min((58-pad*2)/image.width,(18-pad*2)/image.height),iw=image.width*scale,ih=image.height*scale;doc.addImage(logo,left+(58-iw)/2,8+(18-ih)/2,iw,ih)}catch(e){}}
  text(title,left+58+(width-58)/2,16.2,10.6,true,[25,25,25],{align:'center'});text(subtitle,left+58+(width-58)/2,21.4,7.5,false,[70,82,90],{align:'center'});
  y=32;doc.setDrawColor(204,215,223);doc.setLineWidth(.2);
 }
 function field(label,value,x,yy,w,signature=false){
  doc.setFillColor(248,248,248);doc.setDrawColor(185,185,185);doc.setLineWidth(.22);doc.rect(x,yy,w,13,'FD');
  text(label,x+2,yy+4,7.2,true,[82,82,82]);
  doc.setFont('helvetica',signature?'italic':'normal');doc.setFontSize(signature?9.6:9.0);doc.setTextColor(...(signature?[70,125,165]:[25,25,25]));
  doc.text(doc.splitTextToSize(String(value||'-'),w-4).slice(0,2),x+2,yy+8.8,{lineHeightFactor:1.05});
 }
 function projectFields(){
  field('ANLÄGGNING',p.projectName||p.facilityNo,left,y,70);
  field('ANLÄGGNINGSNUMMER',p.facilityNo,left+70,y,50);
  field('ORDER',p.projectOrder,left+120,y,66);y+=15;
  field('DATUM',p.inspectionDate,left,y,42);
  field('NÄSTA PROVNING',p.projectNextDate,left+42,y,48);
  field('BESTÄLLARE',p.customer,left+90,y,48);
  field('SERVICEFÖRETAG',p.company,left+138,y,48);y+=17;
 }
 function overviewHeader(){
  header('ANMÄRKNINGSÖVERSIKT','DÖRRAUTOMATIK · KUNDRAPPORT');projectFields();
  const open=ds.filter(d=>status(d)==='action').length,failed=ds.filter(d=>status(d)==='fail').length,done=ds.filter(isDoorRemediated).length,ready=ds.filter(d=>d.status==='ok'&&!hasRecordedDoorProblem(d)).length,untested=ds.filter(d=>status(d)==='untested').length;
  const stats=[
   ['TOTALT',ds.length,'Alla dörrar',[243,247,249],[45,69,82]],
   ['KLARA',ready,'Godkända',REPORT_COLORS.ok.light,REPORT_COLORS.ok.rgb],
   ['ÅTGÄRDADE',done,'Klarmarkerade',REPORT_COLORS.ok.light,REPORT_COLORS.ok.rgb],
   ['ÖPPNA FEL',open,'Åtgärd krävs',REPORT_COLORS.action.light,REPORT_COLORS.action.rgb],
   ['EJ GODKÄNDA',failed,'Underkända',REPORT_COLORS.fail.light,REPORT_COLORS.fail.rgb],
   ['EJ KONTROLL.',untested,'Ej kontrollerade',REPORT_COLORS.untested.light,REPORT_COLORS.untested.rgb]
  ];
  const boxW=width/6;
  stats.forEach(([title,value,meaning,bg,fg],i)=>{
   const x=left+i*boxW;
   doc.setFillColor(...bg);doc.setDrawColor(185,195,201);doc.setLineWidth(.25);doc.rect(x,y,boxW,17,'FD');
   text(title,x+boxW/2,y+4.6,6.8,true,[65,75,82],{align:'center'});
   text(value,x+boxW/2,y+10.7,12.5,true,fg,{align:'center'});
   text(meaning,x+boxW/2,y+15.1,6.3,true,fg,{align:'center'});
  });
  y+=18.8;tableHead()
 }
 const widths=[42,102,42];
 function tableHead(){let x=left;['Dörr / placering','Anmärkning','Status / åtgärd'].forEach((title,i)=>{doc.setFillColor(232,236,239);doc.setDrawColor(150,158,164);doc.setLineWidth(.22);doc.rect(x,y,widths[i],9.5,'FD');text(title,x+2,y+5.95,8.0,true,[45,45,45]);x+=widths[i]});y+=9.5}
 function overviewPage(){doc.addPage();overviewHeader()}
 overviewHeader();const problems=sorted.filter(hasRecordedDoorProblem).sort((a,b)=>{const rank=d=>isDoorRemediated(d)?2:status(d)==='fail'?0:1;return rank(a)-rank(b)||a.page-b.page||a.id.localeCompare(b.id,'sv',{numeric:true})});
 if(!problems.length){doc.setFillColor(235,244,239);doc.rect(left,y,width,16,'F');text('Inga anmärkningar registrerade vid detta besök.',left+3,y+7,11,true,[29,112,71]);text('Se protokollen för vilka kontrollpunkter som är genomförda.',left+3,y+12,8.8);y+=20}
 problems.forEach(d=>{
  const issues=doorProblems(d).map(([n,t])=>d.checks[n].note?.trim()||t);
  if(!issues.length)issues.push(label(d));if(d.notes?.trim())issues.push('Allmän anmärkning: '+d.notes.trim());
  doc.setFont('helvetica','normal');doc.setFontSize(8.8);
  const statusText=label(d),remediation=isDoorRemediated(d)?[statusText+(d.remediationDate?' '+d.remediationDate:''),d.remediationSignature?'Signatur: '+d.remediationSignature:''].filter(Boolean).join('\n'):statusText;
  const columns=[d.id+'\nPlacering: '+(d.location||'-'),issues.join('\n'),remediation].map((value,i)=>doc.splitTextToSize(value,widths[i]-5));
  let offset=0,total=Math.max(...columns.map(c=>c.length),1);
  while(offset<total){
   const capacity=Math.floor((bottom-y-5)/line);if(capacity<1||bottom-y<12){overviewPage();continue}
   const count=Math.min(capacity,total-offset),height=Math.max(13,count*line+6),color=REPORT_COLORS[status(d)];let x=left;
   columns.forEach((lines,i)=>{const bg=i===2?color.light:[255,255,255];doc.setFillColor(...bg);doc.setDrawColor(150,150,150);doc.setLineWidth(.2);doc.rect(x,y,widths[i],height,'FD');const chunk=i===0&&offset>=lines.length?lines.slice(0,count):lines.slice(offset,offset+count);if(chunk.length){doc.setFont('helvetica',i===0||i===2?'bold':'normal');doc.setFontSize(i===2?8.4:8.8);doc.setTextColor(...(i===2?color.rgb:[30,30,30]));doc.text(chunk,x+2.5,y+5,{lineHeightFactor:line/(8.8*.3528)})}x+=widths[i]});y+=height;offset+=count;
   if(offset<total)overviewPage();
  }
 });
 if(includeProtocols)sorted.forEach(d=>{
  function cell(label,value,x,yy,w,h=7,bold=false,signature=false){
   doc.setFillColor(252,252,252);doc.setDrawColor(150,150,150);doc.setLineWidth(.2);doc.rect(x,yy,w,h,'FD');
   const labelText=String(label||'');doc.setFont('helvetica','bold');doc.setFontSize(7.4);doc.setTextColor(82,82,82);
   const labelW=Math.min(w-7,doc.getTextWidth(labelText)+2.2);doc.text(labelText,x+1.5,yy+h/2+1);
   if(value!==undefined&&value!==null&&String(value)!==''){
    doc.setFont('helvetica',signature?'italic':(bold?'bold':'normal'));doc.setFontSize(signature?9.1:8.5);doc.setTextColor(...(signature?[70,125,165]:[20,20,20]));
    doc.text(doc.splitTextToSize(String(value),Math.max(5,w-labelW-3)).slice(0,1),x+1.5+labelW,yy+h/2+1);
   }
  }
  function pdfProtocolMark(kind,cx,cy,size=11.0){
   doc.setFontSize(size);doc.setTextColor(20,20,20);
   if(kind==='na'){doc.setDrawColor(25,25,25);doc.setLineWidth(.85);doc.setLineCap('round');doc.line(cx-3.2,cy,cx+3.2,cy);doc.setLineCap('butt');return}
   doc.setFont('zapfdingbats','normal');
   doc.text(String.fromCharCode(kind==='remark'?53:51),cx,cy+size*.12,{align:'center'});
  }
  function backToDrawingButton(){
   const bx=188,by=19.1,bw=8,bh=5.8;
   doc.setFillColor(19,43,56);doc.setDrawColor(19,43,56);doc.setLineWidth(.18);doc.rect(bx,by,bw,bh,'FD');
   const cy=by+bh/2;doc.setDrawColor(255,255,255);doc.setLineWidth(.6);doc.setLineCap('round');
   doc.line(bx+2.1,cy,bx+5.9,cy);doc.line(bx+2.1,cy,bx+3.8,cy-1.35);doc.line(bx+2.1,cy,bx+3.8,cy+1.35);doc.setLineCap('butt');
   doc.__doorBackLinks=doc.__doorBackLinks||[];
   doc.__doorBackLinks.push({doorKey:d.uid||d.id,pageNo:doc.getNumberOfPages(),drawingPage:d.page,rect:[bx,by,bw,bh]});
  }
  function protocolTop(){
   doc.setDrawColor(55,55,55);doc.setLineWidth(.22);doc.rect(left,8,width,18);
   if(logo){try{const im=doc.getImageProperties(logo),boxX=left,boxY=8,boxW=58,boxH=18,pad=2.5,maxW=boxW-pad*2,maxH=boxH-pad*2,sc=Math.min(maxW/im.width,maxH/im.height),imgW=im.width*sc,imgH=im.height*sc,imgX=boxX+(boxW-imgW)/2,imgY=boxY+(boxH-imgH)/2;doc.addImage(logo,imgX,imgY,imgW,imgH)}catch(e){}}
   doc.line(left+58,8,left+58,26);doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(7.8);doc.text('Dokumentnr: 2519-1',left+61,12.4);doc.setFontSize(12.2);doc.text('CHECKLISTA REVISION AV DÖRRAUTOMATIK',left+58+(width-58)/2,18.7,{align:'center'});
   doc.setFillColor(255,255,255);doc.rect(left,31.8,28,7,'F');
   doc.setFont('helvetica','bold');doc.setFontSize(11.4);doc.setTextColor(25,25,25);doc.text('SERVICE',left+1.5,36.7);
   y=40;
   cell('Bokat datum:',p.inspectionDate,left,y,93);cell('Nästa provning:',p.projectNextDate,left+93,y,93);y+=7;
   cell('ANLÄGGNING:',p.projectName,left,y,93,7,true);cell('Anläggningsnr:',p.facilityNo,left+93,y,93,7,true);y+=7;
   cell('SERVICEFÖRETAG:',p.company,left,y,93,7,true);cell('BESTÄLLARE / KUND:',p.customer,left+93,y,93,7,true);y+=7;
   cell('Kontaktperson på objektet:',p.companyContact,left,y,93);cell('Kontaktperson:',p.contact,left+93,y,93);y+=7;
   cell('Telefon:',p.companyPhone,left,y,93);cell('Telefon:',p.phone,left+93,y,93);y+=7;
   cell('Adress:',p.companyAddress,left,y,93);cell('Adress:',p.address,left+93,y,93);y+=7;
   cell('Postnummer / Postadress:',[p.companyPostalCode,p.companyPostalCity].filter(Boolean).join(' '),left,y,93);cell('Postnummer / Postadress:',[p.postalCode,p.postalCity].filter(Boolean).join(' '),left+93,y,93);y+=7;
   cell('ID / märkning:',d.id,left,y,54,8,true);cell('Placering:',d.location,left+54,y,66,8);cell('AO nummer:',p.projectOrder,left+120,y,66,8,true);y+=8;
  }
  function checkHeader(){
   const ws=[9,99,14,21,26,17],titles=['Nr','Benämning / kontrollpunkt','Ingår ej','Klart utan\nanmärkning','Klart med\nanmärkning','Signatur'];let x=left;
   titles.forEach((t,i)=>{
    doc.setFillColor(...(i===1?[226,226,226]:[238,238,238]));doc.setDrawColor(120,120,120);doc.setLineWidth(.24);doc.rect(x,y,ws[i],10.8,'FD');
    doc.setFont('helvetica','bold');const headerSize=i===1?8.8:7.6;doc.setFontSize(headerSize);doc.setTextColor(35,35,35);const lines=t.split('\n'),headerY=lines.length===1?y+6.6:y+4.35;
    if(i===1)doc.text(lines,x+2,headerY,{lineHeightFactor:1});
    else doc.text(lines,x+ws[i]/2,headerY,{align:'center',lineHeightFactor:1});
    x+=ws[i];
   });y+=10.8;
  }
  doc.addPage();doc.__doorProtocolPages=doc.__doorProtocolPages||{};doc.__doorProtocolPages[d.uid||d.id]=doc.getNumberOfPages();backToDrawingButton();protocolTop();checkHeader();
  const ws=[9,99,14,21,26,17],checks=doorChecks(d),notesReserve=29,rowH=Math.max(5.95,Math.min(7.1,(270-y-notesReserve)/Math.max(1,checks.length)));
  checks.forEach(([n,title])=>{
   const c=d.checks[n]||{},baseTitleSize=rowH<6.7?7.0:7.6,step=rowH<6.7?2.5:2.75;doc.setFont('helvetica','normal');
   let titleSize=baseTitleSize,titleLines=[];
   for(;titleSize>=6.5;titleSize-=.15){
    doc.setFontSize(titleSize);titleLines=doc.splitTextToSize(String(title||''),ws[1]-3.8).slice(0,2);
    if(titleLines.length<2||String(titleLines[1]||'').trim().split(/\s+/).length>1)break;
   }
   let x=left;
   const vals=[n,title,c.result==='na'?'–':'','',c.result==='remark'?'X':'',p.serviceSignature||d.signature||''];
   vals.forEach((v,i)=>{
    doc.setFillColor(...(i===1?[248,248,248]:[255,255,255]));doc.setDrawColor(145,145,145);doc.setLineWidth(.18);doc.rect(x,y,ws[i],rowH,'FD');doc.setTextColor(25,25,25);
    if(i===1){
      doc.setFont('helvetica','normal');doc.setFontSize(titleSize);const startY=y+rowH/2-((titleLines.length-1)*step)/2+.7;doc.text(titleLines,x+1.7,startY,{lineHeightFactor:1});
    }else if(i===2&&c.result==='na'){
      const cx=x+ws[i]/2,cy=y+rowH/2;pdfProtocolMark('na',cx,cy,11.0);
    }else if(i===3&&c.result==='ok'){
      const cx=x+ws[i]/2,cy=y+rowH/2;pdfProtocolMark('ok',cx,cy,11.0);
    }else if(i===4&&c.result==='remark'){
      const cx=x+ws[i]/2,cy=y+rowH/2;pdfProtocolMark('remark',cx,cy,11.0);
    }else if(i===5&&String(v||'')){
      doc.setFont('times','italic');doc.setFontSize(9.5);doc.setTextColor(55,112,165);doc.text(doc.splitTextToSize(String(v),ws[i]-2.5).slice(0,1),x+ws[i]/2,y+rowH/2+1.15,{align:'center'});
    }else{
      doc.setFont('helvetica',i===0?'bold':'normal');doc.setFontSize(7.7);doc.setTextColor(25,25,25);doc.text(String(v||''),x+ws[i]/2,y+rowH/2+1,{align:'center'});
    }
    x+=ws[i];
   });y+=rowH;
  });
  function continuationTop(section='Allmän Info - fortsättning'){
   doc.setDrawColor(55,55,55);doc.setLineWidth(.22);doc.rect(left,8,width,18);
   if(logo){try{const im=doc.getImageProperties(logo),boxX=left,boxY=8,boxW=58,boxH=18,pad=2.5,maxW=boxW-pad*2,maxH=boxH-pad*2,sc=Math.min(maxW/im.width,maxH/im.height),imgW=im.width*sc,imgH=im.height*sc,imgX=boxX+(boxW-imgW)/2,imgY=boxY+(boxH-imgH)/2;doc.addImage(logo,imgX,imgY,imgW,imgH)}catch(e){}}
   doc.line(left+58,8,left+58,26);doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('Dokumentnr: 2519-1',left+61,11.7);doc.setFontSize(10.3);doc.text('CHECKLISTA REVISION AV DÖRRAUTOMATIK',left+58+(width-58)/2,17.3,{align:'center'});
   doc.setFont('helvetica','normal');doc.setFontSize(7.4);doc.text(section,112,22.4,{align:'center'});
   y=31;cell('Id nummermaskin:',d.id,left,y,62,8);cell('Placering/Dörrlittra:',d.location,left+62,y,62,8);cell('Ao nummer:',p.projectOrder,left+124,y,62,8);y+=12;
  }
  y+=3;doc.setFillColor(238,238,238);doc.setDrawColor(130,130,130);doc.setLineWidth(.2);doc.rect(left,y,width,6,'FD');text('ALLMÄN INFO / ANMÄRKNING',left+2,y+4.2,8.2,true,[55,55,55]);y+=6;
  const remediationNote=isDoorRemediated(d)?'Åtgärdad '+d.remediationDate+' · Signatur: '+d.remediationSignature:'';
  const notes=[...doorProblems(d).map(([n,t])=>n+' – '+(d.checks[n].note?.trim()||t)),remediationNote,d.notes].filter(Boolean).join('  ·  ');
  const boxH=Math.max(12,276-y);doc.setFillColor(255,255,255);doc.setDrawColor(145,145,145);doc.setLineWidth(.18);doc.rect(left,y,width,boxH,'FD');
  if(notes){
   let fs=8.3,lines=doc.splitTextToSize(notes,width-7),maxLines=Math.max(1,Math.floor((boxH-4)/(fs*.42)));
   while(lines.length>maxLines&&fs>6.7){fs-=.3;doc.setFontSize(fs);lines=doc.splitTextToSize(notes,width-7);maxLines=Math.max(1,Math.floor((boxH-4)/(fs*.42)))}
   if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=String(lines[maxLines-1]).replace(/\s*$/,'')+' …'}
   doc.setFont('helvetica','normal');doc.setFontSize(fs);doc.setTextColor(35,35,35);doc.text(lines,left+3,y+4.5,{lineHeightFactor:1.1});
  }
 });
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setDrawColor(204,215,223);doc.line(left,284,198,284);text([p.company,p.projectName||p.facilityNo].filter(Boolean).join(' · ')||'Dörrservice',left,289,7,false,[89,110,123]);text('Sida '+i+' av '+pages,177,289,7,false,[89,110,123])}
 return doc;
}

