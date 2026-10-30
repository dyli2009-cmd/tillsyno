/* One PDF-derived material/time overview for both SmartMatch workspaces. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TillsynoProjectMaterial=api;})(globalThis,function(){
 function validate(input){
  if(input?.version!==1||!Array.isArray(input.rows)||input.rows.length>10000)throw Error('PDF-materialet har ogiltigt format.');
  return {version:1,source:input.source==='projection'?'projection':'scan',rows:input.rows.map(r=>{
   if(!r||['category','component','product'].some(k=>typeof r[k]!=='string'||r[k].length>200)||!Number.isFinite(r.quantity)||r.quantity<1||r.quantity>10000000||r.minutes!==null&&(!Number.isFinite(r.minutes)||r.minutes<0||r.minutes>100000))throw Error('PDF-materialets produktrad är ogiltig.');
   return {category:r.category,component:r.component,product:r.product,quantity:r.quantity,minutes:r.minutes,timeQuantity:Number.isFinite(r.timeQuantity)&&r.timeQuantity>0&&r.timeQuantity<=r.quantity?r.timeQuantity:r.quantity,timeUnit:['par','paket'].includes(r.timeUnit)?r.timeUnit:'st',sources:Array.isArray(r.sources)?r.sources.filter(s=>typeof s.code==='string'&&Number.isFinite(s.quantity)&&s.quantity>0&&Number.isFinite(s.placements)&&s.placements>0).map(s=>({code:s.code,rowId:String(s.rowId||''),label:String(s.label||''),section:String(s.section||''),package:!!s.package,requirements:Array.isArray(s.requirements)?s.requirements.map(r=>({label:String(r.label||''),section:String(r.section||''),product:String(r.product||'')})):[],quantity:s.quantity,placements:s.placements})):[]};
  })};
 }
 function read(doc,L,M){
  const raw=doc.catalog.get(L.PDFName.of('TillsynoProjekteringV2'));if(!raw)return null;
  const object=doc.context.lookup(raw),hex=object.asString?.();let text='';
  if(typeof hex==='string'&&hex.startsWith('FEFF')){if(hex.length>48*1024*1024)throw Error('Projektuppgifterna är för stora.');for(let offset=4;offset<hex.length;offset+=32768){const codes=[];for(let i=offset;i<Math.min(hex.length,offset+32768);i+=4)codes.push(parseInt(hex.slice(i,i+4),16));text+=String.fromCharCode(...codes);}}else text=object.decodeText();
  const payload=JSON.parse(text);if(payload.format!=='TillsynoProjekteringV2')throw Error('Okänt projekteringsformat.');
  const report=M.build(payload.state);
  return validate({version:1,source:'projection',rows:report.rows.map(r=>({category:r.category,component:r.component,product:r.product,quantity:r.quantity,minutes:r.timePerUnit,timeQuantity:r.timeQuantity??r.quantity,timeUnit:r.timeUnit,sources:r.sources.map(source=>{const row=payload.state.cards?.[source.code]?.rows?.find(row=>row.id===source.rowId);return {...source,label:row?.label||r.component,section:row?.section||''};})}))});
 }
 function totals(input){const data=validate(input);return {...data,total:data.rows.reduce((n,r)=>n+(r.minutes===null?0:r.minutes*r.timeQuantity),0),unknown:data.rows.reduce((n,r)=>n+(r.minutes===null?r.quantity:0),0),quantity:data.rows.reduce((n,r)=>n+r.quantity,0)};}

 const norm=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('sv').replace(/[^\p{L}\p{N}]/gu,'');
 function productMatches(item,product){return [item.originalProductName,item.productName,item.value].filter(Boolean).some(value=>{const cleaned=String(value).replace(/(?:\s+(?:GS|DT|EL|BH|BEST|ANNAN|[-–—]))+\s*$/ig,'').trim();return [cleaned,cleaned.replace(/\s+\d+(?:\s*st)?$/i,'')].some(v=>norm(v)===norm(product));});}
 function mergeState(imported,saved,Info){
  const result=Info.merge(imported,saved),fresh=imported?.timeConfig?.projectionMaterial;
  if(!fresh)return result;
  const old=result.timeConfig?.projectionMaterial;
  if(!old||old===fresh){result.timeConfig={...(result.timeConfig||{}),projectionMaterial:validate(fresh)};return result;}
  const current=validate(fresh),previous=validate(old);
  // Enrich legacy snapshots without replacing their saved times or quantities.
  const rows=current.rows.map(row=>{const matches=previous.rows.filter(r=>r.category===row.category&&r.component===row.component&&r.product===row.product);return matches.length===1?{...row,minutes:matches[0].minutes}:row;});
  result.timeConfig={...(result.timeConfig||{}),projectionMaterial:{...previous,rows}};return result;
 }
 function overview(input,positions=[]){
  const report=totals(input);report.extra=[];report.done=0;report.unlinked=0;
  const consumed=new Set();
  for(const r of report.rows){
   r.done=0;let linked=0;
   const sources=r.sources.length?r.sources:report.source==='scan'?[{code:null,quantity:r.quantity,placements:r.quantity}]:[];
   for(const source of sources){
    let used=0;
    for(const p of positions){
     if(source.code!==null&&norm(p.code)!==norm(source.code))continue;
     if(source.package&&source.requirements.length){
      const items=source.requirements.map(req=>p.items.filter(i=>i.source!=='custom'&&i.kind!=='extra-time'&&productMatches(i,req.product)&&norm(i.label)===norm(req.label)&&(!req.section||!i.section||norm(req.section)===norm(i.section))&&(!i.responsibility||String(i.responsibility).toUpperCase()==='GS')&&!consumed.has(p.id+'|'+i.key)));
      if(used>=source.quantity||items.some(list=>list.length!==1)||new Set(items.map(list=>list[0].key)).size!==items.length)continue;
      const count=Math.min(source.quantity/source.placements,source.quantity-used);used+=count;linked+=count;
      items.forEach(list=>consumed.add(p.id+'|'+list[0].key));
      if(r.minutes!==null&&items.every(list=>p.checks?.[list[0].key]))r.done+=r.minutes*count*r.timeQuantity/r.quantity;
      continue;
     }
     const matches=p.items.filter(i=>i.source!=='custom'&&i.kind!=='extra-time'&&productMatches(i,r.product)&&
      norm(i.label)===norm(source.label||r.component)&&
      (!source.section||!i.section||norm(source.section)===norm(i.section))&&
      (!i.responsibility||String(i.responsibility).toUpperCase()==='GS')&&
      !consumed.has(p.id+'|'+i.key));
     // Ambiguous same-product rows must not transfer a check from the wrong side/section.
     if(report.source==='projection'&&matches.length!==1)continue;
     for(const item of matches){
      if(used>=source.quantity)break;
      const q=report.source==='projection'?source.quantity/source.placements:Math.max(1,Number(item.quantity)||1);
      const count=Math.min(q,source.quantity-used);used+=count;linked+=count;consumed.add(p.id+'|'+item.key);
      if(p.checks?.[item.key]&&r.minutes!==null)r.done+=r.minutes*count*r.timeQuantity/r.quantity;
     }
    }
   }
   r.done=Math.min(r.done,(r.minutes||0)*r.timeQuantity);report.done+=r.done;report.unlinked+=Math.max(0,r.quantity-linked);
  }
  for(const p of positions)for(const item of p.items){
   if(item.source!=='custom'||typeof item.minutes!=='number'||!Number.isFinite(item.minutes)||item.minutes<0)continue;
   const quantity=Math.max(1,Math.min(999,Number(item.quantity)||1)),total=item.minutes*quantity,done=!!p.checks?.[item.key];
   report.extra.push({door:p.code,position:p.position,label:item.label||'Extraarbete',comment:item.note||'',quantity,minutes:item.minutes,total,done});
  }
  report.baseTotal=report.total;report.extraTotal=report.extra.reduce((n,r)=>n+r.total,0);report.total+=report.extraTotal;report.done+=report.extra.reduce((n,r)=>n+(r.done?r.total:0),0);
  report.left=Math.max(0,report.total-report.done);report.progress=report.total?Math.min(report.unknown||report.unlinked?99:100,Math.floor(report.done/report.total*100)):0;
  return report;
 }
 function render(root,input,format,positions=[]){
  const report=overview(input,positions),doc=root.ownerDocument;
  const opened=new Set(Array.from(root.querySelectorAll?.('details[open]')||[]).map(e=>e.dataset.group));
  root.replaceChildren();root.className='pwTimeRows smPdfMaterialRows';
  function element(tag,text,className){const e=doc.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;}
  function meter(done,total,label){const wrap=element('div',undefined,'smTimeMeter');wrap.setAttribute('role','meter');wrap.setAttribute('aria-label',label);wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax','100');wrap.setAttribute('aria-valuenow',String(total?Math.round(done/total*100):0));const fill=element('span');fill.style.width=(total?Math.min(100,done/total*100):0)+'%';wrap.append(fill);return wrap;}
  const chart=element('div',undefined,'smTimeChart');chart.append(element('strong',report.progress+'% klart'),element('span','Grundtid '+format(report.baseTotal)+' · Extraarbete '+format(report.extraTotal)),meter(report.done,report.total,'Andel av känd tid klar'));root.append(chart);
  if(report.unknown||report.unlinked)root.append(element('p',(report.unknown?report.unknown+' st saknar tid. ':'')+(report.unlinked?report.unlinked+' st saknar säker koppling till kontrollpunkter. ': '')+'Klart räknas bara från kopplade kontrollpunkter.','smTimeNotice'));
  const groups=new Map();for(const r of report.rows){if(!groups.has(r.category))groups.set(r.category,[]);groups.get(r.category).push(r);}
  function section(key,title,done,total){const e=element('details');e.dataset.group=key;e.open=opened.has(key);const summary=element('summary');summary.append(element('span',title),element('small',format(done)+' / '+format(total)),meter(done,total,title));e.append(summary);root.append(e);return e;}
  function table(section,headers,rows){const scroll=element('div',undefined,'smTimeTableScroll'),table=element('table'),head=element('thead'),hr=element('tr');for(const label of headers){const th=element('th',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);const body=element('tbody');for(const row of rows){const tr=element('tr');for(const label of row)tr.append(element('td',label));body.append(tr);}table.append(body);scroll.append(table);section.append(scroll);}
  for(const [category,rows]of groups){const total=rows.reduce((n,r)=>n+(r.minutes||0)*r.timeQuantity,0),done=rows.reduce((n,r)=>n+r.done,0);const e=section(category,category,done,total);table(e,['Produkt','Antal','Tid/enhet','Totalt'],rows.map(r=>[r.component+(r.sources.some(s=>s.package)?' (paket)':'')+' '+r.product,r.quantity,r.minutes===null?'Saknas':format(r.minutes)+'/'+r.timeUnit,r.minutes===null?'—':format(r.minutes*r.timeQuantity)]));}
  if(report.extra.length){const e=section('extra','Extraarbete · '+report.extra.length,report.extra.reduce((n,r)=>n+(r.done?r.total:0),0),report.extraTotal);for(const r of report.extra){const row=element('div',undefined,'smExtraRow');row.append(element('strong',r.door+' · position '+r.position),element('span',r.label),element('b',format(r.total)+' · '+(r.done?'Klart':'Kvar')));if(r.comment)row.append(element('p',r.comment));e.append(row);}}
  if(!report.rows.length&&!report.extra.length)root.append(element('p','Inget material eller extraarbete finns i projektet ännu.'));
  return report;
 }
 return {validate,read,totals,overview,render,mergeState};
});
