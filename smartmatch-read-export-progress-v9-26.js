/* Export progress reports completed work. Elapsed time never advances percent. */
(function(){
 'use strict';
 let serial=0,current=null,timer=null;
 const $=id=>document.getElementById(id);
 function elapsed(){
  if(!current)return;
  const seconds=Math.floor((performance.now()-current.started)/1000);
  const node=$('smartExportElapsed');if(node)node.textContent='Förfluten tid: '+Math.floor(seconds/60)+' min '+seconds%60+' s';
 }
 function stop(){if(timer!==null)clearInterval(timer);timer=null;}
 function reset(){serial++;stop();current=null;const box=$('smartExportProgress');if(box)box.hidden=true;}
 function start(options={}){
  const id=++serial;stop();
  current={id,mode:options.mode||'preparing',percent:0,state:'busy',started:performance.now(),title:'Förbereder PDF',detail:''};
  const valid=()=>id===serial&&(!options.valid||options.valid());
  const report=async(percent,title,detail='',extra={})=>{
   if(!valid())return;
   current.percent=Math.max(current.percent,Math.min(100,Math.floor(Number(percent)||0)));
   current.title=title;current.detail=detail;current.state=extra.state||'busy';
   const box=$('smartExportProgress');if(box){box.hidden=false;box.dataset.state=current.state;box.dataset.mode=current.mode;box.setAttribute('aria-busy',String(current.state==='busy'));}
   if($('smartExportProgressTitle'))$('smartExportProgressTitle').textContent=title;
   if($('smartExportPercent'))$('smartExportPercent').textContent=current.percent+' %';
   if($('smartExportMeter'))$('smartExportMeter').value=current.percent;
   if($('smartExportProgressDetail'))$('smartExportProgressDetail').textContent=detail;
   const help=$('smartExportProgressHelp');if(help)help.textContent=current.mode==='writing'?'Procenten visar skrivning och kontroll av filen. Vid 100 % är sparningen klar.':'Procenten visar färdiga arbetssteg. Den kan stå stilla medan en stor fil bearbetas. Vid 100 % är PDF:en kontrollerad och klar – tryck sedan Spara PDF för att välja plats.';
   elapsed();
   if(current.state!=='busy')stop();
   // Let the browser paint between real PDF operations. No invented increments.
   await new Promise(resolve=>setTimeout(resolve,0));
  };
  report.fail=message=>{void report(current?.percent||0,'Sparningen stoppades',message,{state:'error'});};
  timer=setInterval(()=>{if(valid())elapsed();else if(id===serial)stop();},1000);
  void report(0,options.mode==='writing'?'Sparar PDF till vald fil':'Förbereder projekt-PDF','Vänta medan arbetsstegen blir klara.');
  return report;
 }
 window.SmartMatchReadExportProgress=Object.freeze({start,reset,snapshot:()=>current?{...current}:null});
})();
