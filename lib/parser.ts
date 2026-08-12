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

// pdf-parse concatène les colonnes du tableau sans séparateur : la ligne
// d'un article se présente sous la forme "<n° ligne><réf 8 chiffres><désignation>"
// (ex: "188035330LOT 3 MASQUES CUP FFP2 DEXTER" = ligne 1, réf 88035330,
// désignation "LOT 3 MASQUES..."). De même, la dernière ligne de prix
// mélange "<prix remisé> €<quantité><total> €" sans séparateur entre la
// quantité et le total (ex: "3.75 €13.75 €" = prix remisé 3.75€, quantité 1,
// total 3.75€). On retrouve la coupure exacte en cherchant la quantité qui
// rend total = prixRemisé × quantité.
function splitQuantiteTotal(prixRemise: number, blob: string): { quantite: number; total: number | null } {
  for (let k = 1; k <= blob.length - 3; k++) {
    const qtyStr = blob.slice(0, k);
    const totalStr = blob.slice(k);
    if (!/^\d+$/.test(qtyStr) || !/^\d+[.,]\d{2}$/.test(totalStr)) continue;
    const quantite = parseInt(qtyStr, 10);
    const total = parsePrice(totalStr);
    if (Math.abs(total - prixRemise * quantite) < 0.02) {
      return { quantite, total };
    }
  }
  return { quantite: 1, total: null };
}

function extractArticles(text: string): Article[] {
  const articles: Article[] = [];
  let currentCategory = "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let itemNumber = 1;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (CATEGORIES.has(line)) {
      currentCategory = line;
      i++;
      continue;
    }

    const prefix = String(itemNumber);
    if (!line.startsWith(prefix)) { i++; continue; }

    const rowMatch = line.slice(prefix.length).match(/^(\d{8})(.+)$/);
    if (!rowMatch) { i++; continue; }

    const ref = parseInt(rowMatch[1], 10);
    const designation = rowMatch[2].trim();

    const doubleMatches: { price: number; blob: string }[] = [];

    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];

      if (CATEGORIES.has(next)) break;
      if (next.startsWith("Total HT") || next.startsWith("Total TTC") || next.startsWith("DateRéglement")) break;
      const nextItemPrefix = String(itemNumber + 1);
      if (next.startsWith(nextItemPrefix) && /^\d{8}/.test(next.slice(nextItemPrefix.length))) break;

      if (next.startsWith("Tx TVA") || next.startsWith("Remise") || next.startsWith(":")) {
        j++; continue;
      }

      const doubleMatch = next.match(/^(\d+[.,]\d{2})\s*€(.+)€$/);
      if (doubleMatch) {
        doubleMatches.push({ price: parsePrice(doubleMatch[1]), blob: doubleMatch[2].trim() });
        j++; continue;
      }

      j++;
    }

    let prixRemise: number | null = null;
    let quantite = 1;
    let total: number | null = null;

    if (doubleMatches.length > 0) {
      const last = doubleMatches[doubleMatches.length - 1];
      prixRemise = last.price;
      ({ quantite, total } = splitQuantiteTotal(prixRemise, last.blob));
    }

    if (designation && prixRemise !== null) {
      articles.push({
        ref,
        designation,
        prixUnitaireTTC: prixRemise,
        quantite,
        totalTTC: total ?? prixRemise * quantite,
        categorie: currentCategory,
      });
      itemNumber++;
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
