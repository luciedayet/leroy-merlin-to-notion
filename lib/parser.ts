import type { Article, Facture } from "./types";

const CATEGORIES = new Set([
  "ECLAIRAGE", "RANGEMENT CUISINE", "SANITAIRE", "PLOMBERIE",
  "ELECTRICITE", "PEINTURE", "OUTILLAGE", "QUINCAILLERIE",
  "REVETEMENT SOL", "MENUISERIE", "JARDIN", "CARRELAGE",
  "AMENAGEMENT", "SALLE DE BAIN", "CUISINE", "CHAUFFAGE",
  "DECORATION", "RANGEMENT", "MATERIAUX", "LUMINAIRE",
]);

function parsePrice(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", "."));
}

function extractNumero(text: string): string {
  const match = text.match(/FACTURE\s+N°\s*(\d+)/);
  if (!match) throw new Error("Numéro de facture introuvable");
  return match[1];
}

function extractDate(text: string): string {
  const match = text.match(/Date de vente\s*:\s*\n?.*?\n?(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) throw new Error("Date de vente introuvable");
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function extractMagasin(text: string): string {
  const match = text.match(/Leroy Merlin\s+(\w+)/);
  return match ? `Leroy Merlin ${match[1]}` : "Leroy Merlin";
}

function extractTotal(text: string): number {
  const matches = text.match(/Total TTC\s*\n?\s*([\d\s]+[.,]\d{2})\s*€/g);
  if (!matches) throw new Error("Total TTC introuvable");
  const last = matches[matches.length - 1];
  const priceMatch = last.match(/([\d\s]+[.,]\d{2})\s*€/);
  return parsePrice(priceMatch![1]);
}

function extractArticles(text: string): Article[] {
  const articles: Article[] = [];
  let currentCategory = "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (CATEGORIES.has(line)) {
      currentCategory = line;
      i++;
      continue;
    }

    if (!/^\d{8}$/.test(line)) { i++; continue; }
    if (i < 1 || !/^\d{1,3}$/.test(lines[i - 1])) { i++; continue; }

    const ref = parseInt(line);
    let designation = "";
    const prices: number[] = [];
    let quantite = 1;
    let total: number | null = null;

    let j = i + 1;
    let foundEnd = false;
    while (j < lines.length && !foundEnd) {
      const next = lines[j];

      if (CATEGORIES.has(next)) break;
      if (/^\d{1,3}$/.test(next) && j + 1 < lines.length && /^\d{8}$/.test(lines[j + 1])) break;
      if (next.startsWith("Total HT") || next.startsWith("Total TTC")) break;

      if (next.startsWith("Tx TVA") || next.startsWith("Dont") || next.startsWith("Remise") || next.startsWith(": ")) {
        j++; continue;
      }

      const priceMatch = next.match(/^([\d]+[.,]\d{2})\s*€$/);
      if (priceMatch) {
        prices.push(parsePrice(priceMatch[1]));
        j++; continue;
      }

      const qtyMatch = next.match(/^(\d+)$/);
      if (qtyMatch && prices.length >= 2) {
        quantite = parseInt(qtyMatch[1]);
        if (j + 1 < lines.length) {
          const totalMatch = lines[j + 1].match(/^([\d]+[.,]\d{2})\s*€$/);
          if (totalMatch) {
            total = parsePrice(totalMatch[1]);
            j += 2;
            foundEnd = true;
            continue;
          }
        }
        j++; continue;
      }

      if (!designation) designation = next;
      j++;
    }

    if (designation && prices.length > 0) {
      const prixUnitaire = prices.length >= 3 ? prices[2] : prices[0];
      articles.push({
        ref,
        designation,
        prixUnitaireTTC: prixUnitaire,
        quantite,
        totalTTC: total ?? prixUnitaire * quantite,
        categorie: currentCategory,
      });
    }

    i = j;
  }

  return articles;
}

export async function parseFacture(buffer: Buffer): Promise<Facture> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const text = data.text;

  return {
    numero: extractNumero(text),
    dateVente: extractDate(text),
    magasin: extractMagasin(text),
    totalTTC: extractTotal(text),
    articles: extractArticles(text),
  };
}
