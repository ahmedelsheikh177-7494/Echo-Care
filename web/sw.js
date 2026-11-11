// ECHO CARE service worker: makes the app installable and keeps the app shell available.
// Data (Supabase) is never cached: it always comes live from the network.
const CACHE='echo-care-v4';
const SHELL=['./','index.html','staff.html','config.js','assets/app.css','assets/shared.js','assets/customer.1.js','assets/customer.2.js','assets/customer.3.js','assets/staff.1.js','assets/staff.2.js','assets/staff.3.js','assets/staff.4.js','assets/staff.5.js','assets/staff.6.js','assets/staff.7.js','assets/staff.8.js','assets/logo-dark.svg','assets/logo-light.svg','assets/icon-sand.svg','assets/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // network first so updates show immediately; cache is only the offline fallback
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
