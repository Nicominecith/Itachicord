const C="itachicord-v1";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!="GET"||r.url.includes("/api"))return;
e.respondWith(fetch(r).then(x=>{if(x.ok&&r.url.startsWith(self.location.origin)){const c=x.clone();caches.open(C).then(k=>k.put(r,c))}return x}).catch(()=>caches.match(r)))});
