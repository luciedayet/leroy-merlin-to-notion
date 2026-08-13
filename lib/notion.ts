import { Client } from "@notionhq/client";
import { buildArticleFields, type ArticleWithDetails } from "./notionFields";

export async function importArticles(
  articles: ArticleWithDetails[],
  facture: { numero: string; dateVente: string },
  options: { payeur?: string; remboursed?: boolean },
): Promise<number> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error("NOTION_API_KEY et NOTION_DATABASE_ID doivent être configurés");
  }

  const notion = new Client({ auth: apiKey });
  let count = 0;

  for (const article of articles) {
    const fields = buildArticleFields(article, facture, options);
    const properties = Object.fromEntries(fields.map((f) => [f.label, f.property]));

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
    count++;
  }

  return count;
}
