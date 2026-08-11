"use client";

import { useState, useCallback } from "react";
import type { Article, Facture } from "@/lib/types";
import { PAYEURS, PIECES, POSTES } from "@/lib/types";

export default function Home() {
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payeur, setPayeur] = useState("");
  const [piece, setPiece] = useState("");
  const [postes, setPostes] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setFacture(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFacture(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImport = async () => {
    if (!facture) return;
    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facture: { numero: facture.numero, dateVente: facture.dateVente },
          articles: facture.articles,
          payeur: payeur || undefined,
          piece: piece || undefined,
          postes: postes.length ? postes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`${data.count} article(s) importé(s) dans Notion !`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setImporting(false);
    }
  };

  const togglePoste = (poste: string) => {
    setPostes((prev) =>
      prev.includes(poste) ? prev.filter((p) => p !== poste) : [...prev, poste],
    );
  };

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Leroy Merlin → Notion
      </h1>
      <p className="text-gray-500 mb-8">
        Importez les articles d&apos;une facture PDF dans votre base Notion
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-green-500 bg-green-50"
            : "border-gray-300 hover:border-green-400 hover:bg-green-50/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".pdf";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFile(file);
          };
          input.click();
        }}
      >
        {loading ? (
          <div className="text-green-600 font-medium">Analyse en cours...</div>
        ) : (
          <>
            <div className="text-4xl mb-3">📄</div>
            <div className="text-gray-600 font-medium">
              Déposez votre facture PDF ici
            </div>
            <div className="text-gray-400 text-sm mt-1">
              ou cliquez pour sélectionner
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {facture && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Facture N° {facture.numero}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Date</span>
                <div className="font-medium">{formatDate(facture.dateVente)}</div>
              </div>
              <div>
                <span className="text-gray-500">Magasin</span>
                <div className="font-medium">{facture.magasin}</div>
              </div>
              <div>
                <span className="text-gray-500">Total TTC</span>
                <div className="font-medium text-lg">{facture.totalTTC.toFixed(2)} €</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payeur</label>
                <select
                  value={payeur}
                  onChange={(e) => setPayeur(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Non défini —</option>
                  {PAYEURS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pièce</label>
                <select
                  value={piece}
                  onChange={(e) => setPiece(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Non défini —</option>
                  {PIECES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste(s)</label>
                <div className="flex flex-wrap gap-2">
                  {POSTES.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePoste(p)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        postes.includes(p)
                          ? "bg-green-100 border-green-400 text-green-800"
                          : "bg-white border-gray-300 text-gray-600 hover:border-green-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">N°</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Réf</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Désignation</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Catégorie</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Prix unit.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Qté</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {facture.articles.map((a: Article, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.ref}</td>
                      <td className="px-4 py-3 font-medium">{a.designation}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {a.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{a.prixUnitaireTTC.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-right">{a.quantite}</td>
                      <td className="px-4 py-3 text-right font-medium">{a.totalTTC.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-medium">Total TTC</td>
                    <td className="px-4 py-3 text-right font-bold">{facture.totalTTC.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-xl transition-colors"
          >
            {importing
              ? "Import en cours..."
              : `Importer ${facture.articles.length} article(s) dans Notion`}
          </button>
        </div>
      )}
    </main>
  );
}
