const C="pulsecord-v17";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!="GET"||u.origin!=location.origin||u.pathname.startsWith("/.netlify")||u.pathname=="/giphy")return;
  // Profil-/Server-Bilder: unveränderlich (Version im Link) -> sofort aus dem Cache
  if(u.pathname.startsWith("/api")){
    if(u.searchParams.get("a")!="img")return;
    e.respondWith(caches.open(C).then(async c=>(await c.match(r))||fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x})));return;
  }
  // App-Shell: Netzwerk zuerst, nach 2,5 s aber sofort die gespeicherte Version (schneller Start, auch bei schlechtem Netz)
  if(r.mode=="navigate"||u.pathname=="/"||u.pathname=="/v2.js"||u.pathname=="/v3.js"||u.pathname=="/v4.js"||u.pathname=="/v5.js"||u.pathname=="/v6.js"||u.pathname=="/v7.js"||u.pathname=="/v8.js"||u.pathname=="/v9.js"||u.pathname=="/v10.js"||u.pathname=="/v11.js"||u.pathname=="/v12.js"||u.pathname=="/v12.css"||u.pathname=="/v13.js"||u.pathname=="/v13.css"||u.pathname=="/v14.js"||u.pathname=="/v14.css"||u.pathname=="/v15.js"||u.pathname=="/v15.css"||u.pathname=="/v9.css"||u.pathname=="/v6.css"||u.pathname=="/v4.css"||u.pathname=="/management.html"||u.pathname=="/index.html"){
    e.respondWith(new Promise(res=>{
      const t=setTimeout(async()=>{const m=await caches.match(r);if(m)res(m)},2500);
      fetch(r).then(x=>{clearTimeout(t);if(x.ok){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}res(x)}).catch(async()=>{clearTimeout(t);res((await caches.match(r))||Response.error())});
    }));return;
  }
  // Statische Dateien (Icons, RNNoise, Manifest): Cache zuerst
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}return x})));
});

// ---------- Web-Push (kommt auch an, wenn die App komplett geschlossen ist) ----------
const tokDB=()=>new Promise((res,rej)=>{const r=indexedDB.open("pc-sw",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tokGet=async()=>{try{const d=await tokDB();return await new Promise(res=>{const q=d.transaction("kv").objectStore("kv").get("t");q.onsuccess=()=>res(q.result||"");q.onerror=()=>res("")})}catch(e){return""}};
const LBL={mention:"@ Erwähnung",reply:"↩ Antwort",everyone:"@everyone",friend:"Freundschaftsanfrage"};
self.addEventListener("push",e=>{
  let x={};try{x=e.data?e.data.json():{}}catch(_){x={tx:e.data&&e.data.text()}}
  e.waitUntil((async()=>{
    const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
    // App ist offen und sichtbar -> dort zeigt Pulsecord selbst ein Popup (kein doppelter Hinweis)
    if(wins.some(w=>w.visibilityState==="visible"&&w.focused!==false))return;
    const call=x.k==="call",u=x.u||"Pulsecord";
    const title=call?"📞 Anruf von "+u:x.k==="friend"?u:x.s?`${u} (#${x.c}, ${x.s})`:u;
    const body=call?"ruft dich an …":(LBL[x.k]&&x.k!=="friend"?LBL[x.k]+": ":"")+(x.tx||"");
    const o={body,icon:"/icon-192.png",badge:"/favicon-64.png",tag:call?"call":(x.ch||"pulsecord"),renotify:true,timestamp:x.t||Date.now(),
      data:{ch:x.ch||"",k:x.k||"",from:u},vibrate:call?[500,250,500,250,500,250,500,250,500]:[120,60,120],requireInteraction:call,silent:false};
    if(call)o.actions=[{action:"accept",title:"✅ Annehmen"},{action:"decline",title:"❌ Ablehnen"}];
    await self.registration.showNotification(title,o);
    if(call)setTimeout(async()=>{const l=await self.registration.getNotifications({tag:"call"});l.forEach(n=>n.close())},120000);
  })());
});

// Klick auf eine Systembenachrichtigung (oder auf „Annehmen“/„Ablehnen“): App fokussieren und den passenden Chat öffnen
self.addEventListener("notificationclick",e=>{
  const n=e.notification,d=n.data||{},ch=d.ch,act=e.action;
  n.close();
  if(act==="decline"){
    e.waitUntil((async()=>{const t=await tokGet();if(t)try{await fetch("/api?a=unring",{method:"POST",headers:{"x-token":t},body:"{}"})}catch(_){}})());
    return;
  }
  const accept=act==="accept"||(d.k==="call"&&!act);
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{
    for(const c of l){if("focus"in c){c.postMessage({open:ch,accept:accept&&d.k==="call"});return c.focus()}}
    return clients.openWindow("/"+(ch?"?open="+encodeURIComponent(ch)+(accept&&d.k==="call"?"&acc=1":""):""));
  }));
});
// Abo erneuern, falls der Browser es zurücksetzt
self.addEventListener("pushsubscriptionchange",e=>{e.waitUntil(clients.matchAll({includeUncontrolled:true}).then(l=>l.forEach(c=>c.postMessage({resub:1}))))});
