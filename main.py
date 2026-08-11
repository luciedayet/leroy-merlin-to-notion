#!/usr/bin/env python3
import argparse
import os
import sys

from parser import parse_facture
from notion_sync import NotionDB

PAYEURS = ["Pierre", "Anais", "Papou", "Papou/Lucie"]
PIECES = [
    "Chambre", "Salle de bain", "Jardin", "General", "Porte",
    "Menuiserie", "Sol", "Outil", "Electricite", "Salon", "Cuisine", "chauffage",
]
POSTES = ["Chauffage", "Douches", "APP1", "APP2", "APP3"]


def choose_option(label: str, options: list[str], allow_skip: bool = False) -> str | None:
    print(f"\n{label}")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    if allow_skip:
        print(f"  0. (passer)")

    while True:
        choice = input("Choix : ").strip()
        if allow_skip and choice == "0":
            return None
        try:
            idx = int(choice)
            if 1 <= idx <= len(options):
                return options[idx - 1]
        except ValueError:
            pass
        print("Choix invalide, réessayez.")


def choose_multiple(label: str, options: list[str]) -> list[str]:
    print(f"\n{label} (plusieurs choix possibles, séparés par des virgules)")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    print(f"  0. (passer)")

    while True:
        choice = input("Choix : ").strip()
        if choice == "0":
            return []
        try:
            indices = [int(x.strip()) for x in choice.split(",")]
            if all(1 <= idx <= len(options) for idx in indices):
                return [options[idx - 1] for idx in indices]
        except ValueError:
            pass
        print("Choix invalide, réessayez.")


def main():
    arg_parser = argparse.ArgumentParser(
        description="Importer une facture Leroy Merlin dans Notion"
    )
    arg_parser.add_argument("pdf", help="Chemin vers le fichier PDF de la facture")
    arg_parser.add_argument("--api-key", help="Clé API Notion (ou variable NOTION_API_KEY)")
    arg_parser.add_argument("--database-id", help="ID de la base Notion (ou variable NOTION_DATABASE_ID)")
    arg_parser.add_argument("--payeur", choices=PAYEURS, help="Payeur pour tous les articles")
    arg_parser.add_argument("--piece", choices=PIECES, help="Pièce pour tous les articles")
    arg_parser.add_argument("--poste", action="append", choices=POSTES, help="Poste(s) pour tous les articles")
    arg_parser.add_argument("--dry-run", action="store_true", help="Afficher les articles sans les envoyer à Notion")
    args = arg_parser.parse_args()

    api_key = args.api_key or os.environ.get("NOTION_API_KEY")
    database_id = args.database_id or os.environ.get("NOTION_DATABASE_ID")

    if not args.dry_run and (not api_key or not database_id):
        print("Erreur : NOTION_API_KEY et NOTION_DATABASE_ID requis (arguments ou variables d'environnement)")
        sys.exit(1)

    print(f"Lecture de la facture : {args.pdf}")
    facture = parse_facture(args.pdf)

    print(f"\nFacture N° {facture.numero}")
    print(f"Date : {facture.date_vente.strftime('%d/%m/%Y')}")
    print(f"Magasin : {facture.magasin}")
    print(f"Total TTC : {facture.total_ttc:.2f} €")
    print(f"\n{len(facture.articles)} article(s) trouvé(s) :")
    print("-" * 80)
    for a in facture.articles:
        print(f"  [{a.categorie}] {a.designation}")
        print(f"    Réf: {a.ref} | {a.prix_unitaire_ttc:.2f} € x {a.quantite} = {a.total_ttc:.2f} €")
    print("-" * 80)

    if args.dry_run:
        print("\nMode dry-run : aucune donnée envoyée à Notion.")
        return

    payeur = args.payeur or choose_option("Qui a payé ?", PAYEURS, allow_skip=True)
    piece = args.piece
    postes = args.poste or []

    if not piece:
        same_piece = input("\nMême pièce pour tous les articles ? (o/n) : ").strip().lower()
        if same_piece == "o":
            piece = choose_option("Quelle pièce ?", PIECES, allow_skip=True)

    if not postes:
        same_poste = input("\nMême(s) poste(s) pour tous les articles ? (o/n) : ").strip().lower()
        if same_poste == "o":
            postes = choose_multiple("Quel(s) poste(s) ?", POSTES)

    notion = NotionDB(api_key, database_id)

    print(f"\nEnvoi de {len(facture.articles)} article(s) vers Notion...")
    for i, article in enumerate(facture.articles, 1):
        article_piece = piece
        article_postes = postes

        if not piece and not args.piece:
            print(f"\nArticle {i}/{len(facture.articles)} : {article.designation}")
            article_piece = choose_option("Pièce ?", PIECES, allow_skip=True)

        if not postes and not args.poste:
            if not piece:
                article_postes = choose_multiple("Poste(s) ?", POSTES)

        page_id = notion.create_article(
            article=article,
            date_achat=facture.date_vente,
            numero_facture=facture.numero,
            payeur=payeur,
            piece=article_piece,
            postes=article_postes,
        )
        print(f"  ✓ {article.designation} (Notion ID: {page_id[:8]}...)")

    print(f"\nTerminé ! {len(facture.articles)} article(s) ajouté(s) à Notion.")


if __name__ == "__main__":
    main()
