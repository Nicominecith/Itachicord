/* ===== Pulsecord v3: @Erwähnungen, Discord-Popups, Systembenachrichtigungen, Handy-/Tablet-Helfer ===== */
(()=>{
"use strict";
const G=id=>document.getElementById(id);

/* ---------- Navigation zu einem Chat (für Popup-Klick / Systembenachrichtigung) ---------- */
function goTo(c){
  if(!c||!ME)return;
  if(c=="@friends")return showHome("pending");
  if(c.startsWith("dm:")){const o=c.split(":").slice(1).find(n=>n!=ME.name);if(o)dmTo(o);return}
  const [sid,r]=c.split("/");if(!r||!S.find(x=>x.id==sid))return;
  if(!srv||srv.id!=sid)openSrv(sid);
  if(ch!=c){const cid=r.split("~")[0],cc=srv&&srv.channels.find(x=>x.id==cid);open_(c,r.includes("~")?"🧵 Thread":"# "+(cc?cc.name:cid))}
  const sd=G("side");if(sd)sd.classList.remove("open");
}
window.goTo=goTo;
const go=x=>x.k=="friend"?goTo("@friends"):goTo(x.ch);

/* ---------- Popups wie bei Discord ---------- */
const LBL={mention:"@ Erwähnung",reply:"↩ Antwort",everyone:"@everyone"};
const hue=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%360;return h};
const hl=t=>esc(t).replace(/@(\w+)/g,(a,n)=>{const l=n.toLowerCase();return(l=="everyone"||l=="here"||(ME&&l==ME.name))?`<span class="mn all">${a}</span>`:a});
const pav=n=>{const u=U[n]||{},c=u.color||"#8b5cf6";
  return u.avatar&&!u.avvid&&!String(u.avatar).startsWith("data:video")
    ?`<div class="npa" style="background-image:url('${u.avatar}');--c:${c}"></div>`
    :`<div class="npa ph" style="--h:${hue(n)};--c:${c}">${esc((n[0]||"?").toUpperCase())}</div>`};
function ntfBox(){let b=G("ntf");if(!b){b=document.createElement("div");b.id="ntf";b.setAttribute("aria-live","polite");document.body.append(b)}return b}
function kill(el,now){if(!el||el.dead)return;el.dead=1;if(now){el.remove();return}el.classList.add("out");setTimeout(()=>el.remove(),280)}
function swipe(el){
  let x0=0,y0=0,dx=0,dy=0,on=0;
  el.addEventListener("touchstart",e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;dx=dy=0;on=1;el.classList.add("hold");el.style.transition="none"},{passive:true});
  el.addEventListener("touchmove",e=>{if(!on)return;const t=e.touches[0];dx=t.clientX-x0;dy=t.clientY-y0;el.style.transform=`translate(${dx}px,${Math.min(0,dy)}px)`;el.style.opacity=Math.max(.2,1-Math.abs(dx)/260)},{passive:true});
  el.addEventListener("touchend",()=>{on=0;el.style.transition="";el.classList.remove("hold");
    if(Math.abs(dx)>80||dy<-40){el.dead=1;el.style.transform=`translate(${dx>80?"120%":dx<-80?"-120%":"0"},${dy<-40?"-130%":"0"})`;el.style.opacity=0;setTimeout(()=>el.remove(),260)}
    else{el.style.transform="";el.style.opacity=""}});
}
function ntfPop(x){
  const b=ntfBox();
  while(b.children.length>=4)kill(b.firstElementChild,1);
  const el=document.createElement("div");el.className="np k-"+(x.k||"dm");el.setAttribute("role","alert");
  const where=x.s?`<span class="npw">#${esc(x.c||"")} · ${esc(x.s)}</span>`:"";
  const tag=LBL[x.k]?`<span class="npk">${LBL[x.k]}</span>`:"";
  el.innerHTML=`${pav(x.u)}<div class="npb"><div class="npt"><b>${esc(x.u)}</b>${where}</div><div class="npx">${tag}${hl(x.tx||"")}</div></div><button class="npc" aria-label="Schließen">✕</button><i class="npp"></i>`;
  el.addEventListener("click",e=>{if(!e.target.closest(".npc"))go(x);kill(el)});
  el.querySelector(".npp").addEventListener("animationend",()=>kill(el));
  swipe(el);b.append(el);
}
window.ntfPop=ntfPop;

/* ---------- Systembenachrichtigung (App im Hintergrund) ---------- */
function ntfNative(x){
  try{
    if(window.AndroidApp&&window.AndroidApp.notify){if(AndroidApp.svcActive&&AndroidApp.svcActive())return;const t0=x.k=="call"?"📞 Anruf von "+x.u:x.s?`${x.u} (#${x.c}, ${x.s})`:x.u;AndroidApp.notify(t0,(LBL[x.k]?LBL[x.k]+": ":"")+(x.tx||""),x.ch||"",x.k=="call"?1:0);return}
    if(typeof Notification=="undefined"||Notification.permission!="granted")return;
    const u=U[x.u]||{},title=x.k=="call"?"📞 Anruf von "+x.u:x.s?`${x.u} (#${x.c}, ${x.s})`:x.u;
    const o={body:(LBL[x.k]?LBL[x.k]+": ":"")+(x.tx||""),icon:u.avatar&&!u.avvid?u.avatar:"/icon-192.png",badge:"/icon-192.png",tag:x.k=="call"?"call":(x.ch||"pulsecord"),renotify:true,data:{ch:x.ch,k:x.k},vibrate:x.k=="call"?[500,250,500,250,500,250,500]:[120,60,120],requireInteraction:x.k=="call"};if(x.k=="call")o.actions=[{action:"accept",title:"✅ Annehmen"},{action:"decline",title:"❌ Ablehnen"}];
    const fb=()=>{try{const n=new Notification(title,o);n.onclick=()=>{window.focus();go(x);n.close()}}catch(e){}};
    if("serviceWorker"in navigator)navigator.serviceWorker.ready.then(r=>r.showNotification(title,o)).catch(fb);else fb();
  }catch(e){}
}
window.ntfNative=ntfNative;
if("serviceWorker"in navigator)navigator.serviceWorker.addEventListener("message",e=>{const d=e.data||{};if(d.open){goTo(d.open);if(d.accept&&window.pcAcceptCall)window.pcAcceptCall(d.open)}if(d.resub&&window.pcPushSync)window.pcPushSync(1)});
addEventListener("pointerdown",()=>{try{if(Notification.permission=="default")Notification.requestPermission()}catch(e){}},{once:true});

/* ---------- Ungelesen-Zähler (Titel + rote Badges an Server/DMs/Kanälen) ---------- */
const UN={};
const tot=()=>Object.values(UN).reduce((a,b)=>a+b,0);
const ttl=()=>{const n=tot();document.title=(n?`(${n}) `:"")+"Pulsecord"};
function setBadge(e,n,cl){
  let b=e.querySelector(":scope>i.ub");
  if(!n){if(b)b.remove();return}
  if(!b){b=document.createElement("i");b.className="bdg ub "+cl;e.insertBefore(b,e.querySelector(":scope>.x")||null)}
  const t=n>99?"99+":String(n);if(b.textContent!=t)b.textContent=t;
}
function decorate(){
  document.querySelectorAll('#rail .ic[onclick^="openSrv("]').forEach(e=>{
    const m=/openSrv\('([^']+)'\)/.exec(e.getAttribute("onclick")||"");if(!m)return;
    let n=0;for(const c in UN)if(c.startsWith(m[1]+"/"))n+=UN[c];setBadge(e,n,"");
  });
  document.querySelectorAll('#list .it[onclick^="open_("]').forEach(e=>{
    const m=/open_\('([^']+)'/.exec(e.getAttribute("onclick")||"");if(!m)return;setBadge(e,UN[m[1]]||0,"");
  });
}
let dq=0;const dec=()=>{if(dq)return;dq=requestAnimationFrame(()=>{dq=0;decorate()})};
for(const id of["rail","list"]){const e=G(id);if(e)new MutationObserver(dec).observe(e,{childList:true,subtree:true})}
const clr=c=>{if(UN[c]){delete UN[c];ttl();dec()}};
const _o3=open_;open_=function(c){clr(c);mhide();return _o3.apply(this,arguments)};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ch)clr(ch)});

/* ---------- Inbox: DMs, @Erwähnungen, @everyone/@here, Antworten ---------- */
let IS=0,SEEN=[],busy=0;
function onItem(x){
  if(!ME||ME.pst=="dnd")return;
  if((ME.blocked||[]).includes(x.u))return;
  if(!x.ch.startsWith("dm:")&&localStorage["mu"+x.ch.split("/")[0]])return;
  const here=x.ch==ch,vis=!document.hidden;
  if(here&&vis)return;                         // im offenen Chat: kein Popup (Ton macht der Chat selbst)
  if(!here){UN[x.ch]=(UN[x.ch]||0)+1;ttl();dec();sfx("msg")}
  if(vis)ntfPop(x);else ntfNative(x);
}
async function inboxPoll(){
  if(!T||!ME||busy)return;busy=1;
  try{
    const r=await api("inbox",0,"&since="+IS);
    if(r&&r.now&&!IS){IS=r.now;return}
    for(const x of(r&&r.items)||[]){
      if(x.t>IS)IS=x.t;
      if(SEEN.includes(x.i+x.k))continue;
      SEEN.push(x.i+x.k);if(SEEN.length>60)SEEN.shift();
      onItem(x);
    }
  }catch(e){}finally{busy=0}
}
setInterval(inboxPoll,3000);

/* ---------- @-Autovervollständigung (wie bei Discord) ---------- */
const tx=G("tx"),inb=G("in"),mainE=G("main");
const mb=document.createElement("div");mb.id="mnb";mb.className="hide";mb.setAttribute("role","listbox");inb.before(mb);
let MI=[],MS=0,MQ=null,LQ=null;
function mcands(q){
  q=q.toLowerCase();const dm=ch&&ch.startsWith("dm:"),out=[];
  if(srv&&!dm)for(const n of["everyone","here"])if(n.startsWith(q))out.push({n,all:1});
  const base=dm?ch.split(":").slice(1):(srv?(srv.members||[]):[]);
  const sc=n=>{const nick=(sp(n).name||"").toLowerCase(),l=n.toLowerCase();return l.startsWith(q)||nick.startsWith(q)?0:l.includes(q)||nick.includes(q)?1:9};
  const ms=base.map(n=>({n,s:sc(n)})).filter(c=>c.s<9).sort((a,b)=>a.s-b.s||((PR(b.n)!="offline")-(PR(a.n)!="offline"))||a.n.localeCompare(b.n));
  for(const c of ms){if(out.length>=8)break;out.push({n:c.n,nick:sp(c.n).name})}
  return out;
}
function mrender(){
  mb.innerHTML=MI.map((c,i)=>`<div class="mo${i==MS?" on":""}" role="option" data-i="${i}">${c.all?'<div class="npa all">@</div>':pav(c.n)}<b>${esc(c.nick||c.n)}</b>${c.nick&&c.nick!=c.n?`<small>${esc(c.n)}</small>`:""}<small class="mx">${c.all?(c.n=="everyone"?"Alle Mitglieder benachrichtigen":"Alle Online-Mitglieder"):esc(PL[PR(c.n)]||"")}</small></div>`).join("");
  mb.style.bottom=Math.max(8,mainE.clientHeight-inb.offsetTop+6)+"px";
  const on=mb.querySelector(".mo.on");if(on)on.scrollIntoView({block:"nearest"});
}
function mhide(){mb.classList.add("hide");MQ=null;LQ=null}
function mupd(){
  if(!ch||!ME)return mhide();
  const v=tx.value,c=tx.selectionStart==null?v.length:tx.selectionStart,m=/(^|\s)@(\w*)$/.exec(v.slice(0,c));
  if(!m)return mhide();
  const q=m[2];MQ={start:c-q.length-1,end:c};
  if(q!==LQ){MS=0;LQ=q}
  MI=mcands(q);if(!MI.length)return mhide();
  MS=Math.min(MS,MI.length-1);mb.classList.remove("hide");mrender();
}
function mpick(i){
  const c=MI[i];if(!c||!MQ)return;
  const v=tx.value,ins="@"+c.n+" ";
  tx.value=v.slice(0,MQ.start)+ins+v.slice(MQ.end);
  const p=MQ.start+ins.length;tx.focus();try{tx.setSelectionRange(p,p)}catch(e){}
  mhide();
}
tx.addEventListener("input",mupd);
tx.addEventListener("click",mupd);
tx.addEventListener("keyup",e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))mupd()});
tx.addEventListener("blur",()=>setTimeout(mhide,160));
inb.addEventListener("keydown",e=>{
  if(e.target!==tx||mb.classList.contains("hide"))return;
  if(e.key=="ArrowDown"||e.key=="ArrowUp"){e.preventDefault();MS=(MS+(e.key=="ArrowDown"?1:MI.length-1))%MI.length;mrender()}
  else if(e.key=="Enter"||e.key=="Tab"){e.preventDefault();e.stopImmediatePropagation();mpick(MS)}
  else if(e.key=="Escape"){e.preventDefault();mhide()}
},true);
mb.addEventListener("mousedown",e=>{e.preventDefault();const o=e.target.closest(".mo");if(o)mpick(+o.dataset.i)});

/* ---------- Handy & Tablet ---------- */
// Sichtbare Höhe (iOS-Tastatur schiebt sonst das Eingabefeld unter die Tastatur)
const vv=window.visualViewport;
if(vv&&matchMedia("(hover:none)").matches){
  const f=()=>{document.documentElement.style.setProperty("--vvh",vv.height+"px");
    if(document.activeElement===tx){window.scrollTo(0,0);const m=G("msgs");requestAnimationFrame(()=>{m.scrollTop=m.scrollHeight})}};
  vv.addEventListener("resize",f);vv.addEventListener("scroll",()=>window.scrollTo(0,0));f();
}
tx.addEventListener("focus",()=>setTimeout(()=>{const m=G("msgs");m.scrollTop=m.scrollHeight},350));
// Wisch-Geste: vom linken Rand öffnet das Menü, nach links schließt es
{let sx=0,sy=0,on=0;
 addEventListener("touchstart",e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;on=1},{passive:true});
 addEventListener("touchend",e=>{
  if(!on)return;on=0;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.6||!matchMedia("(max-width:900px)").matches)return;
  const sd=G("side");if(!sd)return;
  if(dx>0&&sx<32&&!sd.classList.contains("open")&&!document.querySelector(".sset,.dlg,#modal:not(.hide)"))sd.classList.add("open");
  else if(dx<0&&sd.classList.contains("open"))sd.classList.remove("open");
 },{passive:true});}
// Link aus Systembenachrichtigung (?open=…)
{let n=0;const iv=setInterval(()=>{if(++n>40)return clearInterval(iv);if(ME&&S){clearInterval(iv);const qp=new URLSearchParams(location.search),o=qp.get("open");if(o){history.replaceState(0,"","/");goTo(o);if(qp.get("acc")=="1"&&window.pcAcceptCall)setTimeout(()=>window.pcAcceptCall(o),400)}}},500)}
})();
