/* Only the Security Service overview title; the existing filter/card actions stay intact. */
(()=>{
 function start(){
  const title=document.querySelector('#securityOverview .overviewHead h2');if(!title)return;
  const original=title.textContent;
  const update=()=>{const value=document.body.hasAttribute('data-security-project-layout')?'Översikt':original;if(title.textContent!==value)title.textContent=value};
  new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-security-project-layout']});update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
