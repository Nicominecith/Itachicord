/* ===== Pulsecord v6: Push-Benachrichtigungen, Anrufe als Benachrichtigung, Android-Sync ===== */
(()=>{
"use strict";
const G=id=>document.getElementById(id);
const isApp=!!(window.AndroidApp&&window.AndroidApp.isApp);
const b64u=s=>{const p="=".repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,"+").replace(/_/g,"/"),r=atob(b);return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
const muted=()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith("mu")&&localStorage[k]).map(k=>k.slice(2))}catch(e){return[]}};

/* ---------- Token für den Service Worker (damit „Ablehnen“ in der Benachrichtigung funktioniert) ---------- */
function saveTok(t){try{const r=indexedDB.open("pc-sw",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>{const d=r.result,x=d.transaction("kv","readwrite").objectStore("kv");t?x.put(t,"t"):x.delete("t")}}catch(e){}}

/* ---------- Web-Push anmelden ---------- */
let subKey="";
async function pushSync(force){
  try{
    if(isApp||!T||!("serviceWorker"in navigator)||!("PushManager"in window)||Notification.permission!="granted")return;
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    const k=await api("pushkey");if(!k||!k.key)return;
    if(sub&&force){try{await sub.unsubscribe()}catch(e){}sub=null}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k.key)});
    const j=JSON.stringify([sub.endpoint,muted()]);if(j==subKey&&!force)return;
    const r=await api("pushsub",{sub:sub.toJSON(),mu:muted()});
    if(r&&r.ok)subKey=j;
  }catch(e){}
}
window.pcPushSync=pushSync;

/* ---------- Hinweis „Benachrichtigungen aktivieren“ ---------- */
function bar(){
  if(isApp||!T||!ME||G("ntfbar")||!("Notification"in window))return;
  if(Notification.permission!="default"||localStorage.ntfno=="1")return;
  const d=document.createElement("div");d.id="ntfbar";
  d.innerHTML='<div class="nbi">🔔</div><div class="nbt"><b>Nichts mehr verpassen</b><span>Nachrichten, Erwähnungen und Anrufe als Benachrichtigung – auch bei geschlossener App.</span></div><button class="pri nbon">Aktivieren</button><button class="nbx" aria-label="Später">✕</button>';
  d.querySelector(".nbon").onclick=async()=>{let p="denied";try{p=await Notification.requestPermission()}catch(e){}d.remove();if(p=="granted"){pushSync(1);toast("🔔 Benachrichtigungen aktiviert")}else toast("Benachrichtigungen sind blockiert – in den Browser-Einstellungen erlauben")};
  d.querySelector(".nbx").onclick=()=>{localStorage.ntfno="1";d.remove()};
  document.body.append(d);
}

/* ---------- Anruf aus Benachrichtigung annehmen ---------- */
window.pcAcceptCall=async function(room){
  try{
    if(!ME||!room||V)return;
    const o=room.split(":").slice(1).find(n=>n!=ME.name);if(!o)return;
    try{ringHide()}catch(e){}
    api("unring",{});
    if(ch!=room)open_(room,"@"+o);
    setTimeout(()=>{try{if(!V)vjoin()}catch(e){}},350);
  }catch(e){}
};

/* ---------- Klingel-Overlay: Vibration + Titel blinkt ---------- */
let tt=null;
const _rs=window.ringShow;
if(typeof _rs=="function"){
  window.ringShow=function(r){
    _rs.apply(this,arguments);
    try{navigator.vibrate&&navigator.vibrate([500,250,500,250,500,250,500])}catch(e){}
    clearInterval(tt);const t0="Pulsecord";let on=0;tt=setInterval(()=>{if(!G("ringbox")){clearInterval(tt);document.title=t0;return}document.title=(on^=1)?"📞 Anruf von "+r.from:t0},900);
    const b=G("ringbox");if(b&&!b.querySelector(".rgn")){const n=document.createElement("div");n.className="rgn";n.textContent="Eingehender Anruf";b.querySelector(".card").prepend(n)}
  };
}
const _rh=window.ringHide;
if(typeof _rh=="function")window.ringHide=function(){clearInterval(tt);try{navigator.vibrate&&navigator.vibrate(0)}catch(e){}return _rh.apply(this,arguments)};

/* ---------- Android-App: Sitzung an den Hintergrunddienst übergeben ---------- */
let lastTok=null,lastMu="";
function appSync(){
  if(!isApp||!window.AndroidApp.setSession)return;
  const t=localStorage.t||"",m=JSON.stringify(muted());
  if(t==lastTok&&m==lastMu)return;
  lastTok=t;lastMu=m;
  try{t?AndroidApp.setSession(t,m):AndroidApp.clearSession()}catch(e){}
}

/* ---------- Takt ---------- */
setInterval(()=>{
  const t=localStorage.t||"";
  if(window.__ptok!==t){window.__ptok=t;saveTok(t)}
  appSync();
  if(T&&ME){bar();pushSync()}
},4000);
addEventListener("pointerdown",()=>{if(!isApp&&"Notification"in window&&Notification.permission=="granted")pushSync()},{once:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)appSync()});
})();
