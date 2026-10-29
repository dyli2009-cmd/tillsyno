/* One PDF-derived material/time overview for both SmartMatch workspaces. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TillsynoProjectMaterial=api;})(globalThis,function(){
 function validate(input){
  if(input?.version!==1||!Array.isArray(input.rows)||input.rows.length>10000)throw Error('PDF-materialet har ogiltigt format.');
  return {version:1,source:input.source==='projection'?'projection':'scan',rows:input.rows.map(r=>{
   if(!r||['category','component','product'].some(k=>typeof r[k]!=='string'||r[k].length>200)||!Number.isFinite(r.quantity)||r.quantity<1||r.quantity>10000000||r.minutes!==null&&(!Number.isFinite(r.minutes)||r.minutes<0||r.minutes>100000))throw Error('PDF-materialets produktrad är ogiltig.');
   return {category:r.category,component:r.component,product:r.product,quantity:r.quantity,minutes:r.minutes};
  })};
 }
 function read(doc,L,M){
  const raw=doc.catalog.get(L.PDFName.of('TillsynoProjekteringV2'));if(!raw)return null;
  const object=doc.context.lookup(raw),hex=object.asString?.();let text='';
  if(typeof hex==='string'&&hex.startsWith('FEFF')){if(hex.length>48*1024*1024)throw Error('Projektuppgifterna är för stora.');for(let offset=4;offset<hex.length;offset+=32768){const codes=[];for(let i=offset;i<Math.min(hex.length,offset+32768);i+=4)codes.push(parseInt(hex.slice(i,i+4),16));text+=String.fromCharCode(...codes);}}else text=object.decodeText();
  const payload=JSON.parse(text);if(payload.format!=='TillsynoProjekteringV2')throw Error('Okänt projekteringsformat.');
  const report=M.build(payload.state);
  return validate({version:1,source:'projection',rows:report.rows.map(r=>({category:r.category,component:r.component,product:r.product,quantity:r.quantity,minutes:r.timePerUnit}))});
 }
 function totals(input){const data=validate(input);return {...data,total:data.rows.reduce((n,r)=>n+(r.minutes===null?0:r.minutes*r.quantity),0),unknown:data.rows.reduce((n,r)=>n+(r.minutes===null?r.quantity:0),0),quantity:data.rows.reduce((n,r)=>n+r.quantity,0)};}
 function render(root,input,format){const report=totals(input),doc=root.ownerDocument;root.replaceChildren();root.className='pwTimeRows smPdfMaterialRows';
  if(!report.rows.length){const p=doc.createElement('p');p.textContent='Inga GS-produkter finns i projektunderlaget ännu.';root.append(p);return report;}
  const groups=new Map();for(const r of report.rows){if(!groups.has(r.category))groups.set(r.category,[]);groups.get(r.category).push(r);}
  for(const [category,rows]of groups){const section=doc.createElement('details');section.open=true;const summary=doc.createElement('summary');summary.textContent=category+' · '+format(rows.reduce((n,r)=>n+(r.minutes===null?0:r.minutes*r.quantity),0));section.append(summary);const table=doc.createElement('table'),head=doc.createElement('thead'),hr=doc.createElement('tr');for(const label of ['Produkt','Antal','Tid/st','Totalt']){const th=doc.createElement('th');th.scope='col';th.textContent=label;hr.append(th);}head.append(hr);table.append(head);const body=doc.createElement('tbody');for(const r of rows){const tr=doc.createElement('tr');for(const label of [r.component+' '+r.product,r.quantity,r.minutes===null?'Tid saknas':format(r.minutes),r.minutes===null?'—':format(r.minutes*r.quantity)]){const td=doc.createElement('td');td.textContent=String(label);tr.append(td);}body.append(tr);}table.append(body);section.append(table);root.append(section);}
  return report;
 }
 return {validate,read,totals,render};
});
