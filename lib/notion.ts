import { Client } from "@notionhq/client";
import type { Article } from "./types";

export async function importArticles(
  articles: Article[],
  facture: { numero: string; dateVente: string },
  options: { payeur?: string; piece?: string; postes?: string[] },
): Promise<number> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error("NOTION_API_KEY et NOTION_DATABASE_ID doivent être configurés");
  }

  const notion = new Client({ auth: apiKey });
  let count = 0;

  for (const article of articles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {
      Nom: { title: [{ text: { content: article.designation } }] },
      "Ref produit": { number: article.ref },
      "Prix unitaire": { number: article.prixUnitaireTTC },
      "Quantité": { number: article.quantite },
      Magasin: { select: { name: "Leroy Merlin" } },
      Facture: { rich_text: [{ text: { content: facture.numero } }] },
      Achat: { date: { start: facture.dateVente } },
      "Remboursé": { checkbox: false },
    };

    if (options.payeur) {
      properties["Payeur"] = { select: { name: options.payeur } };
    }
    if (options.piece) {
      properties["Pièce"] = { select: { name: options.piece } };
    }
    if (options.postes?.length) {
      properties["Poste"] = {
        multi_select: options.postes.map((p) => ({ name: p })),
      };
    }

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
    count++;
  }

  return count;
}
