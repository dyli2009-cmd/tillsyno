/* Shared product-time lookup for the Projektering library and material list. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-catalog.js'):root.Proj2Catalog,()=>typeof module==='object'&&module.exports?require('./smartmatch-projektering-v511-data.js'):root.Proj2Data);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Proj2ProductTimes=api;
})(typeof window==='object'?window:globalThis,function(C,data){
 const anchors={lock:6,'cylinder-fittings':12,strike:19.8,handle:12,pull:60,escape:30,cylinder:6,closer:30,'closer-arm':30,operator:180,sensor:90,activation:19.8,coordinator:120,bolt:30,magnet:30,reader:60,controller:90};
 function baseline(category,name){
  const known=C.getTime(category,name);if(known)return known;
  const product=data().PRODUCTS.find(p=>p.category===category&&C.normalize(p.name)===C.normalize(name));
  if(!product||anchors[category]===undefined)return null;
  const minutes=category==='lock'&&/mikro|\bMA\b/i.test(name)?90:anchors[category];
  return {minutes,origin:'estimated',requiresReview:true,note:'Uppskattning utifrån liknande produkter. Kontrollera montageomfattningen.',basis:'Kategoriankare från angivna tider; förberedd dörr, utan ny kabeldragning.',unit:'st'};
 }
 function get(category,name,product){
  const base=baseline(category,name);
  if(product&&Object.hasOwn(product,'timeMinutes')){
   if(product.timeMinutes===null)return null;
   const minutes=product.timeMinutes;if(!Number.isFinite(minutes)||minutes<0||minutes>100000)throw Error('Ogiltig montagetid.');
   if(base&&minutes===base.minutes)return base;
   return {minutes,origin:'manual',requiresReview:false,note:'Egen standardtid i produktbiblioteket.',unit:'st'};
  }
  return base;
 }
 function parse(hours,minutes){
  hours=String(hours).trim();minutes=String(minutes).trim().replace(',','.');
  if(!hours&&!minutes)return null;
  if(hours&&!/^\d+$/.test(hours)||minutes&&!/^\d+(?:\.\d+)?$/.test(minutes))throw Error('Ange hela timmar och positiva minuter.');
  const h=Number(hours||0),m=Number(minutes||0),total=Number((h*60+m).toFixed(6));
  if(m>=60||total>100000||!Number.isFinite(total))throw Error('Minuter ska vara mindre än 60 och totaltiden högst 100000 minuter.');
  return total;
 }
 function label(time){if(!time)return 'Tid saknas';const h=Math.floor(time.minutes/60),m=Number((time.minutes%60).toFixed(6));return `${h} tim ${m.toLocaleString('sv-SE',{maximumFractionDigits:6})} min · ${time.origin==='provided'?'Angiven tid':time.origin==='estimated'?'Uppskattning':'Egen tid'}`;}
 return Object.freeze({get,parse,label});
});
