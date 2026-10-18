const C="itachicord-v3";
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
  if(r.mode=="navigate"||u.pathname=="/"||u.pathname=="/v2.js"||u.pathname=="/v3.js"||u.pathname=="/index.html"){
    e.respondWith(new Promise(res=>{
      const t=setTimeout(async()=>{const m=await caches.match(r);if(m)res(m)},2500);
      fetch(r).then(x=>{clearTimeout(t);if(x.ok){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}res(x)}).catch(async()=>{clearTimeout(t);res((await caches.match(r))||Response.error())});
    }));return;
  }
  // Statische Dateien (Icons, RNNoise, Manifest): Cache zuerst
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}return x})));
});

// Klick auf eine Systembenachrichtigung: App fokussieren und den passenden Chat öffnen (wie Discord)
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const ch=e.notification.data&&e.notification.data.ch;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{
    for(const c of l){if("focus"in c){c.postMessage({open:ch});return c.focus()}}
    return clients.openWindow("/"+(ch?"?open="+encodeURIComponent(ch):""));
  }));
});
