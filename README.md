# Leroy Merlin to Notion

Importe les articles d'une facture Leroy Merlin (PDF) dans une base de donnees Notion.

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Creer un fichier `.env` (voir `.env.example`) ou passer les variables d'environnement :

```bash
export NOTION_API_KEY=secret_xxx
export NOTION_DATABASE_ID=373aea3aab0380f0a304e52452c9266d
```

Pour obtenir la cle API Notion :
1. Aller sur https://www.notion.so/profile/integrations
2. Creer une nouvelle integration
3. Copier le "Internal Integration Secret"
4. Partager la base de donnees avec l'integration (menu "..." > "Connexions" > ajouter l'integration)

## Utilisation

```bash
# Tester le parsing sans envoyer a Notion
python main.py --dry-run facture.pdf

# Importer avec choix interactifs (payeur, piece, poste)
python main.py facture.pdf

# Importer avec options pre-remplies
python main.py facture.pdf --payeur Pierre --piece Cuisine --poste APP1
```

## Champs importes

| Facture PDF             | Champ Notion    | Mode           |
|-------------------------|-----------------|----------------|
| Designation article     | Nom             | Automatique    |
| Ref Article             | Ref produit     | Automatique    |
| Prix unit. TTC remise   | Prix unitaire   | Automatique    |
| Quantite                | Quantite        | Automatique    |
| Date de vente           | Achat           | Automatique    |
| N. Facture              | Facture         | Automatique    |
| -                       | Magasin         | "Leroy Merlin" |
| -                       | Payeur          | Interactif/arg |
| -                       | Piece           | Interactif/arg |
| -                       | Poste           | Interactif/arg |
