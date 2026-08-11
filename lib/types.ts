export interface Article {
  ref: number;
  designation: string;
  prixUnitaireTTC: number;
  quantite: number;
  totalTTC: number;
  categorie: string;
}

export interface Facture {
  numero: string;
  dateVente: string;
  articles: Article[];
  totalTTC: number;
  magasin: string;
}

export const PAYEURS = ["Pierre", "Anais", "Papou", "Papou/Lucie"] as const;
export const PIECES = [
  "Chambre", "Salle de bain", "Jardin", "General", "Porte",
  "Menuiserie", "Sol", "Outil", "Electricite", "Salon", "Cuisine", "chauffage",
] as const;
export const POSTES = ["Chauffage", "Douches", "APP1", "APP2", "APP3"] as const;
