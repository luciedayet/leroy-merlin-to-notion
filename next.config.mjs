/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [
      {
        // Le service worker ne doit jamais être servi depuis un cache HTTP,
        // sans quoi le navigateur peut mettre plusieurs heures à détecter
        // une nouvelle version après un déploiement.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default config;
