const fs = require("fs");
const path = require("path");

// Le navigateur ne détecte une mise à jour du service worker que si le
// contenu du fichier change (comparaison octet à octet). On y injecte donc
// un identifiant de version qui change à chaque build.
const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

const sw = `// Généré par scripts/generate-sw.js — ne pas éditer à la main.
const VERSION = ${JSON.stringify(version)};

self.addEventListener("install", () => {
  // On attend le signal explicite de l'utilisateur (SKIP_WAITING) avant de
  // prendre la main, plutôt que de sauter automatiquement l'état "waiting".
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
`;

const dest = path.join(__dirname, "..", "public", "sw.js");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, sw);
console.log(`public/sw.js généré (version ${version})`);
