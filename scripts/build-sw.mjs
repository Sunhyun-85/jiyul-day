import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = await readdir('dist', { recursive: true });
const assets = files
  .filter((f) => /\.(html|js|css|svg|png|webp|json|mp3|wav|ogg|webmanifest)$/.test(f) && f !== 'sw.js')
  .map((f) => '/' + f);
const hash = createHash('sha256');
for (const path of assets) hash.update(await readFile('dist' + path));
const version = 'jiyul-' + hash.digest('hex').slice(0, 12);
await writeFile(
  'dist/sw.js',
  `const CACHE=${JSON.stringify(version)};const ASSETS=${JSON.stringify(['/', ...assets])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jiyul-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('/index.html'):Response.error())));
});`,
);
console.log('오프라인 캐시 생성 완료:', version);
