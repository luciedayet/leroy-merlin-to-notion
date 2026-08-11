# Leroy Merlin to Notion

Web app (Next.js) pour importer les factures Leroy Merlin PDF dans une base Notion.
Deployable sur Vercel.

## Deploiement Vercel

1. Connecter ce repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement :
   - `NOTION_API_KEY` : cle d'integration Notion
   - `NOTION_DATABASE_ID` : `373aea3aab0380f0a304e52452c9266d`
   - `ACCESS_CODE` : code d'acces demande avant d'afficher l'app (si absent, l'authentification est desactivee)
3. Deployer

## Configuration Notion

1. Creer une integration sur https://www.notion.so/profile/integrations
2. Copier le "Internal Integration Secret"
3. Partager la base "Travaux / Achats" avec l'integration

## Dev local

```bash
npm install
cp .env.local.example .env.local  # remplir les valeurs
npm run dev
```

## Fonctionnement

1. Deposer un PDF de facture Leroy Merlin
2. L'app extrait les articles (ref, designation, prix remise, quantite)
3. Choisir payeur, piece, poste(s)
4. Cliquer "Importer" pour creer les entrees dans Notion
