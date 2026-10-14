/* Isolated snapshot of SmartMatch TEST v36.106 PROJECT_AUTOMATION_MODELS.
   Source: project-workspace-smartmatch-v36-106.js at cf074dcfa08b0a304512690cf7b48abac7306e69.
   Existing SmartMatch code is unchanged. */
(function(){'use strict';
const list=[
 ['11','Geze EMD standardarm'],['12','Geze EMD glidarm'],['13','Faac standard'],['14','Faac glidarm'],
 ['15','Besam Powerswing'],['16','Besam SW100'],['17','Dorma ED 200'],['18','Tormax'],['19','Record standardarm'],
 ['20','Powerswing pardörr'],['21','Geze TSA 160'],['22','Record glidarm'],['23','Gilgen FDC'],['24','Dorma ED 100'],
 ['25','Besam SDE'],['26','Ditec hissmonterad'],['27','SR 2000'],['28','OVE'],['29','Dorma CD 80'],
 ['30','Cibes hissöppnare'],['31','Geze TSA 160 dubbeldörr'],['32','Dorma ED 180'],['33','Geze EC Turn'],
 ['34','Besam DHE'],['35','Entramatic PLS 100'],['36','Entramatic PLS 150'],['37','Dorma ED 250'],
 ['38','Geze Powerdrive skjutdörr'],['39','Geze EC Drive skjutdörr'],['40','Geze SL skjutdörr'],
 ['41','Faac 930 skjutdörr'],['42','Faac A140 skjutdörr'],['43','Dorma TS 93 + brandstängning'],
 ['44','Dorma TS 93'],['45','Entramatic SW 300'],['46','Unislide dubbel flyglig'],['47','Unislide enkel flyglig'],
 ['48','Entramatic SL500']
];
function resolve(code,text='',manufacturer=''){
 const entry=list.find(row=>row[0]===String(code)),raw=String(text||entry?.[1]||'').trim().replace(/\bSV\s*(\d+)/gi,'SW$1');
 const prefix=raw.match(/^(Dorma(?:kaba)?|Assa(?:\s+Abloy)?|Besam|Entramatic|Entrematic|Geze|Faac|Record|Tormax|Gilgen|Ditec|Cibes)\b\s*/i);
 let brand=manufacturer||prefix?.[1]||(/^ED\s*\d+\b/i.test(raw)?'Dorma':/^(SW|SL)\s*\d+\b|^Powerswing\b|^Unislide\b/i.test(raw)?'Assa':'');
 if(/^(Assa(?:\s+Abloy)?|Besam|Entramatic|Entrematic)$/i.test(brand))brand='Assa';
 else if(/^Dormakaba$/i.test(brand))brand='Dorma';
 const model=(prefix?raw.slice(prefix[0].length):raw).replace(/\b(ED|SW|SL|PLS|CD|TS)\s+(\d+)/gi,'$1$2');
 return {brand,model:model||raw,label:entry?.[1]||raw,code:String(code||'')};
}
window.TillsynoCEModels={list,resolve};
})();

