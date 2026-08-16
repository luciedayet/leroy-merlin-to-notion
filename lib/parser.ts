import type { Article, Facture } from "./types";

const CATEGORIES = new Set([
  "ECLAIRAGE", "RANGEMENT CUISINE", "SANITAIRE", "PLOMBERIE",
  "ELECTRICITE", "ELECTRICITE-PLOMBERIE", "PEINTURE", "OUTILLAGE", "QUINCAILLERIE",
  "REVETEMENT SOL", "MENUISERIE", "JARDIN", "CARRELAGE",
  "SOL ET CARRELAGE MURAL",
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
  const match = text.match(/Leroy Merlin\s+([^\n]+)/);
  return match ? `Leroy Merlin ${match[1].trim()}` : "Leroy Merlin";
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
// repère via la ligne "Tx TVA" qui suit le nom de l'article, pour éviter de
// confondre avec d'autres lignes numériques. Une désignation trop longue
// peut déborder sur une ou deux lignes suivantes avant "Tx TVA" (ex: "25M
// TUYAU POLYETHYLENE 16BARS BLEU" puis "19X25" sur la ligne d'après) : on
// les rattache tant qu'elles ne ressemblent pas au début d'un autre article,
// d'une catégorie ou d'un total.
//
// La ligne de prix finale ressemble à "3.75 € 1 3.75 €" (prix unitaire
// remisé, quantité, total), sans ambiguïté.
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
    if (!rowMatch) { i++; continue; }

    const ref = parseInt(rowMatch[1], 10);
    let designation = rowMatch[2].trim();

    let j = i + 1;
    let foundTva = false;
    while (j < lines.length && j < i + 4) {
      if (lines[j].startsWith("Tx TVA")) {
        foundTva = true;
        break;
      }
      if (CATEGORIES.has(lines[j]) || lines[j].startsWith("Total") || /^\d+\s+\d+\s+.+$/.test(lines[j])) {
        break;
      }
      designation += ` ${lines[j]}`;
      j++;
    }

    if (!foundTva) { i++; continue; }

    let prixRemise: number | null = null;
    let quantite = 1;
    let total: number | null = null;

    let foundEnd = false;
    while (j < lines.length && !foundEnd) {
      const next = lines[j];

      if (CATEGORIES.has(next)) break;
      if (next.startsWith("Total HT") || next.startsWith("Total TTC") || next.startsWith("Date Réglement")) break;

      // Format 1: "prix_remisé € quantité total €" (3 values, with optional decimal qty)
      const fmt1 = next.match(/^(\d+[.,]\d{2})\s*€\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d{2})\s*€$/);
      if (fmt1) {
        prixRemise = parsePrice(fmt1[1]);
        quantite = parseFloat(fmt1[2].replace(",", "."));
        total = parsePrice(fmt1[3]);
        foundEnd = true;
        j++;
        continue;
      }
      // Format 2: "prix_orig € prix_remisé € quantité total €" (4 values)
      const fmt2 = next.match(/^(\d+[.,]\d{2})\s*€\s+(\d+[.,]\d{2})\s*€\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d{2})\s*€$/);
      if (fmt2) {
        prixRemise = parsePrice(fmt2[2]);
        quantite = parseFloat(fmt2[3].replace(",", "."));
        total = parsePrice(fmt2[4]);
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
