import re
from dataclasses import dataclass
from datetime import date

import pymupdf


@dataclass
class Article:
    ref: int
    designation: str
    prix_unitaire_ttc: float
    quantite: int
    total_ttc: float
    categorie: str


@dataclass
class Facture:
    numero: str
    date_vente: date
    articles: list[Article]
    total_ttc: float
    magasin: str


CATEGORIES = {
    "ECLAIRAGE", "RANGEMENT CUISINE", "SANITAIRE", "PLOMBERIE",
    "ELECTRICITE", "PEINTURE", "OUTILLAGE", "QUINCAILLERIE",
    "REVETEMENT SOL", "MENUISERIE", "JARDIN", "CARRELAGE",
    "AMENAGEMENT", "SALLE DE BAIN", "CUISINE", "CHAUFFAGE",
    "DECORATION", "RANGEMENT", "MATERIAUX", "LUMINAIRE",
}


def parse_facture(pdf_path: str) -> Facture:
    doc = pymupdf.open(pdf_path)
    full_text = "\n".join(page.get_text() for page in doc)
    doc.close()

    numero = _extract_numero(full_text)
    date_vente = _extract_date(full_text)
    magasin = _extract_magasin(full_text)
    total_ttc = _extract_total(full_text)
    articles = _extract_articles(full_text)

    return Facture(
        numero=numero,
        date_vente=date_vente,
        articles=articles,
        total_ttc=total_ttc,
        magasin=magasin,
    )


def _extract_numero(text: str) -> str:
    match = re.search(r"FACTURE\s+N°\s*(\d+)", text)
    if not match:
        raise ValueError("Numéro de facture introuvable")
    return match.group(1)


def _extract_date(text: str) -> date:
    match = re.search(r"Date de vente\s*:\s*\n?.*?\n?(\d{2}/\d{2}/\d{4})", text)
    if not match:
        raise ValueError("Date de vente introuvable")
    parts = match.group(1).split("/")
    return date(int(parts[2]), int(parts[1]), int(parts[0]))


def _extract_magasin(text: str) -> str:
    match = re.search(r"Leroy Merlin\s+(\w+)", text)
    if match:
        return f"Leroy Merlin {match.group(1).strip()}"
    return "Leroy Merlin"


def _extract_total(text: str) -> float:
    matches = re.findall(r"Total TTC\s*\n?\s*([\d\s]+[.,]\d{2})\s*€", text)
    if not matches:
        raise ValueError("Total TTC introuvable")
    return _parse_price(matches[-1])


def _extract_articles(text: str) -> list[Article]:
    articles = []
    current_category = ""
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    i = 0
    while i < len(lines):
        line = lines[i]

        if line in CATEGORIES:
            current_category = line
            i += 1
            continue

        ref_match = re.match(r"^(\d{8})$", line)
        if not ref_match:
            i += 1
            continue

        if i < 1 or not re.match(r"^\d{1,3}$", lines[i - 1]):
            i += 1
            continue

        ref = int(ref_match.group(1))
        designation = ""
        prices = []
        quantite = 1
        total = None

        j = i + 1
        found_end = False
        while j < len(lines) and not found_end:
            next_line = lines[j]

            if next_line in CATEGORIES:
                break
            if re.match(r"^\d{1,3}$", next_line) and j + 1 < len(lines) and re.match(r"^\d{8}$", lines[j + 1]):
                break
            if next_line.startswith("Total HT") or next_line.startswith("Total TTC"):
                break

            if next_line.startswith("Tx TVA") or next_line.startswith("Dont") or next_line.startswith("Remise") or next_line.startswith(": "):
                j += 1
                continue

            price_match = re.match(r"^([\d]+[.,]\d{2})\s*€$", next_line)
            if price_match:
                prices.append(_parse_price(price_match.group(1)))
                j += 1
                continue

            qty_match = re.match(r"^(\d+)$", next_line)
            if qty_match and len(prices) >= 2:
                quantite = int(qty_match.group(1))
                if j + 1 < len(lines):
                    total_match = re.match(r"^([\d]+[.,]\d{2})\s*€$", lines[j + 1])
                    if total_match:
                        total = _parse_price(total_match.group(1))
                        j += 2
                        found_end = True
                        continue
                j += 1
                continue

            if not designation:
                designation = next_line

            j += 1

        # prices layout: [prix_initial, remise_amount, prix_remise]
        # or without discount: [prix_initial]
        if designation and prices:
            if len(prices) >= 3:
                prix_unitaire = prices[2]
            else:
                prix_unitaire = prices[0]

            articles.append(Article(
                ref=ref,
                designation=designation,
                prix_unitaire_ttc=prix_unitaire,
                quantite=quantite,
                total_ttc=total if total is not None else prix_unitaire * quantite,
                categorie=current_category,
            ))

        i = j

    return articles


def _parse_price(s: str) -> float:
    return float(s.replace(" ", "").replace(",", "."))
