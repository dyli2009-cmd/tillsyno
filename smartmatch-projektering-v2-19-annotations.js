/* Shared text-box geometry for the drawing, project files and vector PDF export. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.Proj2Annotations=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value)),clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=(value,label,min,max)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(label+' har ett ogiltigt värde.');return value;};
 const color=(value,label)=>{if(typeof value!=='string'||!/^#[a-f0-9]{6}$/i.test(value))throw Error(label+' måste vara en färg.');return value.toLowerCase();};
 const identifier=value=>{if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(value))throw Error('Textmarkeringens ID är ogiltigt.');return value;};
 const uid=()=>typeof crypto==='object'&&crypto.randomUUID?crypto.randomUUID():'text-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 function measure(value,size){return [...value].reduce((sum,c)=>sum+(/\s/.test(c)?.3:/[ilI.,!:;|']/u.test(c)?.3:/[frt()]/u.test(c)?.4:c==='W'?1:c==='M'?.95:c==='m'?.9:c==='w'?.82:/[A-ZÅÄÖ]/u.test(c)?.8:/[a-z0-9åäö]/u.test(c)?.65:1),0)*size;}
 function lines(item){
  const max=Math.max(1,item.width-16),result=[];
  for(const paragraph of item.text.replace(/\r\n?/g,'\n').split('\n')){
   let line='';
   for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(line&&measure(line+' '+word,item.fontSize)>max){result.push(line);line='';}
    for(const char of word){if(measure(line+char,item.fontSize)>max&&line){result.push(line);line='';}line+=char;}
    line+=' ';
   }
   result.push(line.trimEnd());
  }
  return result;
 }
 function normalize(input,pages){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Textmarkeringen är ogiltig.');
  const page=number(input.page,'Textens sida',1,pages.length);if(!Number.isInteger(page))throw Error('Textens sida är ogiltig.');
  const meta=pages[page-1];if(meta.width<64||meta.height<40)throw Error('Ritningssidan är för liten för en textruta.');
  if(typeof input.text!=='string'||input.text.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.text))throw Error('Texten får innehålla högst 2 000 tecken.');
  if(typeof input.bold!=='boolean')throw Error('Textens stil är ogiltig.');
  const item={id:identifier(input.id),page,text:input.text,x:number(input.x,'Textens läge',0,1),y:number(input.y,'Textens läge',0,1),width:number(input.width,'Textrutans bredd',48,Math.max(48,meta.width)),height:number(input.height,'Textrutans höjd',24,Math.max(24,meta.height)),fontSize:number(input.fontSize,'Textstorlek',6,72),bold:input.bold,textColor:color(input.textColor,'Textfärg'),fill:input.fill===null?null:color(input.fill,'Bakgrund'),borderColor:color(input.borderColor,'Kantfärg'),borderWidth:number(input.borderWidth,'Kantbredd',0,8),radius:number(input.radius,'Rundning',0,60),arrowColor:color(input.arrowColor,'Pilfärg'),arrowWidth:number(input.arrowWidth,'Pilbredd',.5,8),arrows:[]};
  if(!Array.isArray(input.arrows)||input.arrows.length>20)throw Error('En textruta kan ha högst 20 pilar.');
  const ids=new Set();item.arrows=input.arrows.map(arrow=>{const id=identifier(arrow?.id);if(ids.has(id))throw Error('Pilarna har dubblerade ID.');ids.add(id);return{id,x:number(arrow.x,'Pilens läge',0,1),y:number(arrow.y,'Pilens läge',0,1)};});
  const margin=item.borderWidth/2;
  const glyphWidth=16+Math.max(0,...[...item.text].map(char=>measure(char,item.fontSize)));
  if(glyphWidth>meta.width-2*margin)throw Error('Textstorleken är för stor för sidan.');
  item.width=Math.min(Math.max(item.width,glyphWidth),meta.width-2*margin);
  item.height=Math.max(item.height,16+lines(item).length*item.fontSize*1.3);
  if(item.height>meta.height-2*margin)throw Error('Texten får inte plats på sidan. Öka bredden, minska textstorleken eller förkorta texten.');

  item.x=clamp(item.x,(item.width/2+margin)/meta.width,1-(item.width/2+margin)/meta.width);
  item.y=clamp(item.y,(item.height/2+margin)/meta.height,1-(item.height/2+margin)/meta.height);
  return item;
 }
 function validate(values,pages){if(values===undefined)return[];if(!Array.isArray(values)||values.length>500)throw Error('Projektet får ha högst 500 textmarkeringar.');const ids=new Set();return values.map(value=>{const item=normalize(value,pages);if(ids.has(item.id))throw Error('Textmarkeringarnas ID är dubblerade.');ids.add(item.id);return item;});}
 function create(page,x,y,pages){return normalize({id:uid(),page,x,y,width:Math.min(180,pages[page-1].width-4),height:54,text:'Ny text',fontSize:14,bold:false,textColor:'#20352e',fill:'#ffffff',borderColor:'#b6c8bf',borderWidth:1,radius:8,arrowColor:'#d4443d',arrowWidth:2,arrows:[]},pages);}
 function update(item,patch,pages){return normalize({...clone(item),...clone(patch),id:item.id,page:item.page},pages);}
 function box(item,page){return{x:item.x*page.width-item.width/2,y:item.y*page.height-item.height/2,width:item.width,height:item.height};}
 function arrow(item,target,page){
  const cx=item.x*page.width,cy=item.y*page.height,x=target.x*page.width,y=target.y*page.height,dx=x-cx,dy=y-cy;
  if(Math.abs(dx)<=item.width/2&&Math.abs(dy)<=item.height/2)return null;
  const t=Math.min(dx?item.width/2/Math.abs(dx):Infinity,dy?item.height/2/Math.abs(dy):Infinity),sx=cx+dx*t,sy=cy+dy*t,len=Math.hypot(x-sx,y-sy);
  if(len<1)return null;const ux=(x-sx)/len,uy=(y-sy)/len,head=Math.min(len*.7,Math.max(8,item.arrowWidth*4)),wing=head*.44;
  return{start:{x:sx,y:sy},end:{x,y},head:[{x,y},{x:x-head*ux+wing*uy,y:y-head*uy-wing*ux},{x:x-head*ux-wing*uy,y:y-head*uy+wing*ux}]};
 }
 function roundedPath(width,height,radius){const r=Math.min(radius,width/2,height/2);return `M ${r} 0 H ${width-r} Q ${width} 0 ${width} ${r} V ${height-r} Q ${width} ${height} ${width-r} ${height} H ${r} Q 0 ${height} 0 ${height-r} V ${r} Q 0 0 ${r} 0 Z`;}
 function svg(item,page,selected=false,zoom=1){
  const b=box(item,page),handle=5/zoom,hit=11/zoom;
  const arrows=item.arrows.map(target=>{const g=arrow(item,target,page);return(g?`<path d="M ${g.start.x} ${g.start.y} L ${g.end.x} ${g.end.y}" fill="none" stroke="${item.arrowColor}" stroke-width="${item.arrowWidth}" stroke-linecap="round"/><polygon points="${g.head.map(p=>p.x+','+p.y).join(' ')}" fill="${item.arrowColor}"/>`:'')+(selected?`<g data-annotation-id="${escape(item.id)}" data-annotation-arrow="${escape(target.id)}" tabindex="0" role="button" aria-label="Flytta pilspets"><circle cx="${target.x*page.width}" cy="${target.y*page.height}" r="${hit}" fill="transparent"/><circle cx="${target.x*page.width}" cy="${target.y*page.height}" r="${handle}" fill="#fff" stroke="${item.arrowColor}" stroke-width="${1.5/zoom}"/></g>`:'');}).join('');
  const text=lines(item).map((line,i)=>`<tspan x="${b.x+8}" y="${b.y+8+item.fontSize+(i*item.fontSize*1.3)}">${escape(line)}</tspan>`).join('');
  const controls=selected?`<rect x="${b.x-3/zoom}" y="${b.y-3/zoom}" width="${b.width+6/zoom}" height="${b.height+6/zoom}" rx="${Math.min(item.radius,8)}" fill="none" stroke="#167a91" stroke-width="${1/zoom}" stroke-dasharray="${3/zoom} ${2/zoom}" pointer-events="none"/>`+['nw','ne','se','sw'].map(corner=>{const x=b.x+(corner.includes('e')?b.width:0),y=b.y+(corner.includes('s')?b.height:0);return `<g data-annotation-id="${escape(item.id)}" data-annotation-resize="${corner}" tabindex="0" role="button" aria-label="Ändra textrutans storlek"><circle cx="${x}" cy="${y}" r="${hit}" fill="transparent"/><rect x="${x-handle}" y="${y-handle}" width="${handle*2}" height="${handle*2}" rx="${2/zoom}" fill="#fff" stroke="#167a91" stroke-width="${1.5/zoom}"/></g>`;}).join(''):'';
  return `<g class="p2-annotation" data-annotation-id="${escape(item.id)}" tabindex="0" role="button" aria-label="Text: ${escape(item.text)}. Dra för att flytta." aria-pressed="${selected}">${arrows}<rect data-annotation-body="true" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${Math.min(item.radius,b.width/2,b.height/2)}" fill="${item.fill||'transparent'}" stroke="${item.borderWidth?item.borderColor:'none'}" stroke-width="${item.borderWidth}"/><text fill="${item.textColor}" font-size="${item.fontSize}" font-weight="${item.bold?700:400}" pointer-events="none">${text}</text>${controls}</g>`;
 }
 return Object.freeze({uid,validate,normalize,create,update,box,arrow,lines,roundedPath,svg});
});
