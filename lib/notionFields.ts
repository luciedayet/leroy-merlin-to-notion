import type { Article } from "./types";

export interface NotionField {
  label: string;
  displayValue: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
}

// "Magasin" est un select à options fixes côté Notion (Leboncoin, Leroy
// Merlin, Cedeo) : on y envoie toujours cette valeur, indépendamment du nom
// de magasin détaillé (avec la ville) affiché/modifiable dans l'app.
const MAGASIN = "Leroy Merlin";

export interface ArticleWithDetails extends Article {
  piece?: string;
  postes?: string[];
}

export function buildArticleFields(
  article: ArticleWithDetails,
  facture: { numero: string; dateVente: string },
  options: { payeur?: string; remboursed?: boolean },
): NotionField[] {
  const fields: NotionField[] = [
    { label: "Nom", displayValue: article.designation, property: { title: [{ text: { content: article.designation } }] } },
    { label: "Ref produit", displayValue: String(article.ref), property: { number: article.ref } },
    { label: "Prix unitaire", displayValue: `${article.prixUnitaireTTC.toFixed(2)} €`, property: { number: article.prixUnitaireTTC } },
    { label: "Quantité", displayValue: String(article.quantite), property: { number: article.quantite } },
    { label: "Magasin", displayValue: MAGASIN, property: { select: { name: MAGASIN } } },
    { label: "Facture", displayValue: facture.numero, property: { rich_text: [{ text: { content: facture.numero } }] } },
    { label: "Achat", displayValue: facture.dateVente, property: { date: { start: facture.dateVente } } },
    {
      label: "Remboursé",
      displayValue: options.remboursed ? "Oui" : "Non",
      property: { checkbox: !!options.remboursed },
    },
  ];

  if (options.payeur) {
    fields.push({ label: "Payeur", displayValue: options.payeur, property: { select: { name: options.payeur } } });
  }
  if (article.piece) {
    fields.push({ label: "Pièce", displayValue: article.piece, property: { select: { name: article.piece } } });
  }
  if (article.postes?.length) {
    fields.push({
      label: "Poste",
      displayValue: article.postes.join(", "),
      property: { multi_select: article.postes.map((p) => ({ name: p })) },
    });
  }

  return fields;
}
