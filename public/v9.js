/* v9: Discord-Bedienung – Datumstrenner, "Zu den neuesten springen", Tippen fokussiert Eingabe,
   Pfeil-hoch bearbeitet letzte Nachricht, Esc bricht Antwort ab, Bilder per Strg+V / Drag&Drop einfügen */
(function(){
var $=function(q){return document.querySelector(q)};
var box,atBottom=true,busy=false;
function g(n){try{return(0,eval)(n)}catch(e){return undefined}}
function visible(){try{var m=g("M"),po=g("pinOnly"),me=g("ME");if(!Array.isArray(m)||!me)return null;
 return m.filter(function(x){return(!po||x.pin)&&!(me.blocked||[]).includes(x.u)})}catch(e){return null}}
function dayLabel(t){var d=new Date(t),n=new Date(),y=new Date();y.setDate(n.getDate()-1);
 if(d.toDateString()==n.toDateString())return"Heute";if(d.toDateString()==y.toDateString())return"Gestern";
 return d.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:d.getFullYear()==n.getFullYear()?undefined:"numeric"})}
function dividers(){
 if(!box||busy)return;var vis=visible();if(!vis)return;
 var els=[].slice.call(box.children).filter(function(e){return e.classList.contains("m")});
 if(!els.length||els.length!=vis.length)return;
 busy=true;mo.disconnect();
 [].forEach.call(box.querySelectorAll(".dsep"),function(e){e.remove()});
 var prev="";
 els.forEach(function(el,i){var k=new Date(vis[i].t).toDateString();
  if(k!=prev){var s=document.createElement("div");s.className="dsep";s.setAttribute("data-keep","1");
   var sp=document.createElement("span");sp.textContent=dayLabel(vis[i].t);s.appendChild(sp);box.insertBefore(s,el);prev=k}});
 if(atBottom)box.scrollTop=box.scrollHeight;
 mo.observe(box,{childList:true});busy=false;jump()}
var mo=new MutationObserver(function(){dividers()});
/* Springen-Button */
var jb;
function jump(){
 if(!box||!jb)return;var far=box.scrollHeight-box.scrollTop-box.clientHeight>320;
 var r=box.getBoundingClientRect(),inn=$("#in"),ir=inn?inn.getBoundingClientRect():r;
 jb.style.left=(r.left+r.width/2)+"px";jb.style.bottom=Math.max(12,innerHeight-ir.top+10)+"px";
 jb.classList.toggle("on",far&&r.width>0)}
function init(){
 box=$("#msgs");if(!box)return false;
 jb=document.createElement("button");jb.id="jmp9";jb.setAttribute("data-keep","1");jb.textContent="Zu den neuesten Nachrichten springen ⬇";
 jb.onclick=function(){box.scrollTo({top:box.scrollHeight,behavior:"smooth"})};document.body.appendChild(jb);
 box.addEventListener("scroll",function(){atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;jump()},{passive:true});
 addEventListener("resize",jump);mo.observe(box,{childList:true});dividers();return true}
/* Tastatur */
function typingTarget(t){return t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable)}
function overlay(){return document.querySelector("#modal:not(.hide),.dlg,.sset,#auth:not(.hide)")}
addEventListener("keydown",function(e){
 var tx=$("#tx");if(!tx)return;
 if(e.target===tx){
  if(e.key=="ArrowUp"&&!tx.value&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){
   var vis=visible(),me=g("ME");if(vis&&me){for(var i=vis.length-1;i>=0;i--)if(vis[i].u==me.name&&!vis[i].file){e.preventDefault();try{edit(vis[i].id)}catch(_){}break}}}
  else if(e.key=="Escape"){try{if(g("rep")){rep=null;var rb=$("#rpb");if(rb)rb.textContent="";e.preventDefault()}else tx.blur()}catch(_){}}
  return}
 if(e.key.length==1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!typingTarget(e.target)&&!overlay()&&g("ch")&&tx.offsetParent){tx.focus()}
},true);
/* Einfügen & Drag&Drop */
async function up(f){if(!f)return;if(f.size>1e9){alert("Max. 1 GB");return}try{var m=await upFile(f,f.name||("bild-"+Date.now()+".png"));if(m)send(m)}catch(_){}}
document.addEventListener("paste",function(e){
 if(e.target!==$("#tx"))return;var fs=e.clipboardData&&e.clipboardData.files;
 if(fs&&fs.length){e.preventDefault();up(fs[0])}});
document.addEventListener("dragover",function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types,"Files")>=0&&g("ch")){e.preventDefault();document.body.classList.add("drop9")}});
["dragleave","drop"].forEach(function(n){document.addEventListener(n,function(e){if(n=="dragleave"&&e.relatedTarget)return;document.body.classList.remove("drop9");
 if(n=="drop"&&e.dataTransfer&&e.dataTransfer.files.length&&g("ch")){e.preventDefault();up(e.dataTransfer.files[0])}})});
function boot(){if(!init())setTimeout(boot,300)}
if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
