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

// pdf.js regroupe le texte d'une page en items positionnés (un item par
// "cellule" de tableau la plupart du temps). Le rendu par défaut de
// pdf-parse concatène les items d'une même ligne SANS séparateur, ce qui
// colle par exemple le n° de ligne, la référence produit et la désignation
// d'un article ("188035330LOT 3 MASQUES...") — impossible à redécouper de
// façon fiable (la désignation peut elle-même commencer par un chiffre,
// ex. "5 PLINTHES..."). On force ici un espace entre deux items d'une même
// ligne pour préserver les colonnes du tableau.
function renderPage(pageData: {
  getTextContent: (opts: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }) => Promise<{
    items: { str: string; transform: number[] }[];
  }>;
}): Promise<string> {
  return pageData
    .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: true })
    .then((textContent) => {
      let lastY: number | null = null;
      let text = "";
      for (const item of textContent.items) {
        if (lastY === null) {
          text += item.str;
        } else if (lastY === item.transform[5]) {
          text += ` ${item.str}`;
        } else {
          text += `\n${item.str}`;
        }
        lastY = item.transform[5];
      }
      return text;
    });
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

// Une ligne d'article ressemble maintenant à "1 88035330 LOT 3 MASQUES ..."
// (n° de ligne, réf article, désignation, correctement espacés). On la
// repère via la ligne "Tx TVA" qui suit toujours immédiatement le nom de
// l'article, pour éviter de confondre avec d'autres lignes numériques.
//
// La ligne de prix finale ressemble à "3.75 € 1 3.75 €" (prix unitaire
// remisé, quantité, total), elle aussi désormais sans ambiguïté.
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

    const rowMatch = line.match(/^\d+\s+(\d+)\s+(.+)$/);
    const nextIsTva = i + 1 < lines.length && lines[i + 1].startsWith("Tx TVA");
    if (!rowMatch || !nextIsTva) { i++; continue; }

    const ref = parseInt(rowMatch[1], 10);
    const designation = rowMatch[2].trim();

    let prixRemise: number | null = null;
    let quantite = 1;
    let total: number | null = null;

    let j = i + 1;
    let foundEnd = false;
    while (j < lines.length && !foundEnd) {
      const next = lines[j];

      if (CATEGORIES.has(next)) break;
      if (next.startsWith("Total HT") || next.startsWith("Total TTC") || next.startsWith("Date Réglement")) break;

      const qtyTotalMatch = next.match(/^(\d+[.,]\d{2})\s*€\s+(\d+)\s+(\d+[.,]\d{2})\s*€$/);
      if (qtyTotalMatch) {
        prixRemise = parsePrice(qtyTotalMatch[1]);
        quantite = parseInt(qtyTotalMatch[2], 10);
        total = parsePrice(qtyTotalMatch[3]);
        foundEnd = true;
        j++;
        continue;
      }

      j++;
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
    }

    i = j;
  }

  return articles;
}

export async function parseFacture(buffer: Buffer): Promise<Facture> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer, { pagerender: renderPage });
  const text = data.text;

  return {
    numero: extractNumero(text),
    dateVente: extractDate(text),
    magasin: extractMagasin(text),
    totalTTC: extractTotal(text),
    articles: extractArticles(text),
  };
}
