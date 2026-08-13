# Leroy Merlin to Notion

Web app (Next.js) pour importer les factures Leroy Merlin PDF dans une base Notion.
Deployable sur Vercel.

## Deploiement Vercel

1. Connecter ce repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement :
   - `NOTION_API_KEY` : cle d'integration Notion
   - `NOTION_DATABASE_ID` : `373aea3aab0380f0a304e52452c9266d`
   - `ACCESS_CODE` : code d'acces demande avant d'afficher l'app (si absent, l'authentification est desactivee)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_FOLDER_NON_REMBOURSE_ID`, `GOOGLE_DRIVE_FOLDER_REMBOURSE_ID` : pour lister les factures depuis Drive et deplacer le fichier apres import (optionnel, voir ci-dessous)
3. Deployer

## Configuration Notion

1. Creer une integration sur https://www.notion.so/profile/integrations
2. Copier le "Internal Integration Secret"
3. Partager la base "Travaux / Achats" avec l'integration

## Configuration Google Drive (optionnel)

Permet d'afficher, en plus du drag-and-drop, la liste des factures PDF d'un dossier Drive, de les importer d'un clic, et de deplacer automatiquement le fichier apres import vers un dossier "rembourse" ou "non rembourse" selon la case cochee dans l'app.

1. Sur https://console.cloud.google.com, creer/choisir un projet puis activer l'API "Google Drive API"
2. Creer un compte de service (IAM & Admin > Comptes de service), puis generer une cle JSON
3. Partager le dossier Drive source contenant les factures, ainsi que les deux dossiers de destination, avec l'adresse e-mail du compte de service (role "Editeur", necessaire pour deplacer les fichiers)
4. Renseigner les variables d'environnement :
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` : l'adresse e-mail du compte de service
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` : le champ `private_key` de la cle JSON (garder les `\n`)
   - `GOOGLE_DRIVE_FOLDER_ID` : l'identifiant du dossier source, visible dans son URL (`drive.google.com/drive/folders/<ID>`)
   - `GOOGLE_DRIVE_FOLDER_NON_REMBOURSE_ID` : dossier de destination si la case "Rembourse" n'est pas cochee
   - `GOOGLE_DRIVE_FOLDER_REMBOURSE_ID` : dossier de destination si la case "Rembourse" est cochee

Sans `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`/`GOOGLE_DRIVE_FOLDER_ID`, seul le drag-and-drop reste disponible. Sans les deux variables de dossiers de destination, le deplacement apres import est simplement ignore (l'import Notion fonctionne quand meme).

## Dev local

```bash
npm install
cp .env.local.example .env.local  # remplir les valeurs
npm run dev
```

## Fonctionnement

1. Choisir une facture Leroy Merlin (drag-and-drop ou depuis Drive)
2. L'app extrait les infos de facture (numero, date, magasin) et les articles (ref, designation, prix remise, quantite), tous modifiables
3. Renseigner payeur et rembourse (communs a la facture), puis piece et poste(s) pour chaque article
4. Cliquer "Importer" pour creer une entree Notion par article ; si la facture vient de Drive, le fichier est deplace dans le dossier rembourse/non-rembourse correspondant
