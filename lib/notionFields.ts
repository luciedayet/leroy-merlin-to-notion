import type { Article } from "./types";

export interface NotionField {
  label: string;
  displayValue: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
}

const MAGASIN = "Leroy Merlin";

export function buildArticleFields(
  article: Article,
  facture: { numero: string; dateVente: string },
  options: { payeur?: string; piece?: string; postes?: string[] },
): NotionField[] {
  const fields: NotionField[] = [
    { label: "Nom", displayValue: article.designation, property: { title: [{ text: { content: article.designation } }] } },
    { label: "Ref produit", displayValue: String(article.ref), property: { number: article.ref } },
    { label: "Prix unitaire", displayValue: `${article.prixUnitaireTTC.toFixed(2)} €`, property: { number: article.prixUnitaireTTC } },
    { label: "Quantité", displayValue: String(article.quantite), property: { number: article.quantite } },
    { label: "Magasin", displayValue: MAGASIN, property: { select: { name: MAGASIN } } },
    { label: "Facture", displayValue: facture.numero, property: { rich_text: [{ text: { content: facture.numero } }] } },
    { label: "Achat", displayValue: facture.dateVente, property: { date: { start: facture.dateVente } } },
    { label: "Remboursé", displayValue: "Non", property: { checkbox: false } },
  ];

  if (options.payeur) {
    fields.push({ label: "Payeur", displayValue: options.payeur, property: { select: { name: options.payeur } } });
  }
  if (options.piece) {
    fields.push({ label: "Pièce", displayValue: options.piece, property: { select: { name: options.piece } } });
  }
  if (options.postes?.length) {
    fields.push({
      label: "Poste",
      displayValue: options.postes.join(", "),
      property: { multi_select: options.postes.map((p) => ({ name: p })) },
    });
  }

  return fields;
}
