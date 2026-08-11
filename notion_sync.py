from datetime import date

from notion_client import Client

from parser import Article


class NotionDB:
    def __init__(self, api_key: str, database_id: str):
        self.client = Client(auth=api_key)
        self.database_id = database_id

    def create_article(
        self,
        article: Article,
        date_achat: date,
        numero_facture: str,
        payeur: str | None = None,
        piece: str | None = None,
        postes: list[str] | None = None,
    ) -> str:
        properties = {
            "Nom": {"title": [{"text": {"content": article.designation}}]},
            "Ref produit": {"number": article.ref},
            "Prix unitaire": {"number": article.prix_unitaire_ttc},
            "Quantité": {"number": article.quantite},
            "Magasin": {"select": {"name": "Leroy Merlin"}},
            "Facture": {"rich_text": [{"text": {"content": numero_facture}}]},
            "Achat": {"date": {"start": date_achat.isoformat()}},
            "Remboursé": {"checkbox": False},
        }

        if payeur:
            properties["Payeur"] = {"select": {"name": payeur}}
        if piece:
            properties["Pièce"] = {"select": {"name": piece}}
        if postes:
            properties["Poste"] = {
                "multi_select": [{"name": p} for p in postes]
            }

        response = self.client.pages.create(
            parent={"database_id": self.database_id},
            properties=properties,
        )
        return response["id"]
