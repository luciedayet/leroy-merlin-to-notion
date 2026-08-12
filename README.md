# Leroy Merlin to Notion

Web app (Next.js) pour importer les factures Leroy Merlin PDF dans une base Notion.
Deployable sur Vercel.

## Deploiement Vercel

1. Connecter ce repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement :
   - `NOTION_API_KEY` : cle d'integration Notion
   - `NOTION_DATABASE_ID` : `373aea3aab0380f0a304e52452c9266d`
   - `ACCESS_CODE` : code d'acces demande avant d'afficher l'app (si absent, l'authentification est desactivee)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID` : pour lister les factures depuis Drive (optionnel, voir ci-dessous)
3. Deployer

## Configuration Notion

1. Creer une integration sur https://www.notion.so/profile/integrations
2. Copier le "Internal Integration Secret"
3. Partager la base "Travaux / Achats" avec l'integration

## Configuration Google Drive (optionnel)

Permet d'afficher, en plus du drag-and-drop, la liste des factures PDF d'un dossier Drive et de les importer d'un clic.

1. Sur https://console.cloud.google.com, creer/choisir un projet puis activer l'API "Google Drive API"
2. Creer un compte de service (IAM & Admin > Comptes de service), puis generer une cle JSON
3. Partager le dossier Drive contenant les factures avec l'adresse e-mail du compte de service (role "Lecteur")
4. Renseigner les variables d'environnement :
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` : l'adresse e-mail du compte de service
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` : le champ `private_key` de la cle JSON (garder les `\n`)
   - `GOOGLE_DRIVE_FOLDER_ID` : l'identifiant du dossier, visible dans son URL (`drive.google.com/drive/folders/<ID>`)

Sans ces variables, seul le drag-and-drop reste disponible.

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
