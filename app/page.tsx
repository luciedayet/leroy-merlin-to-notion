"use client";

import { useState, useCallback, useEffect } from "react";
import type { Article, DriveFile, Facture } from "@/lib/types";
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
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveError, setDriveError] = useState("");

  useEffect(() => {
    fetch("/api/drive/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDriveFiles(data.files);
      })
      .catch((e: unknown) => setDriveError(e instanceof Error ? e.message : "Erreur Drive"))
      .finally(() => setDriveLoading(false));
  }, []);

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

  const handleDriveSelect = useCallback(async (fileId: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setFacture(null);

    try {
      const res = await fetch("/api/drive/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
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

  const formatDriveDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Leroy Merlin → Notion
      </h1>
      <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8">
        Importez les articles d&apos;une facture PDF dans votre base Notion
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors active:bg-green-50 ${
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
            <div className="text-3xl sm:text-4xl mb-3">📄</div>
            <div className="text-gray-600 font-medium">
              Sélectionnez votre facture PDF
            </div>
            <div className="text-gray-400 text-sm mt-1 hidden sm:block">
              ou glissez-déposez ici
            </div>
          </>
        )}
      </div>

      {!driveLoading && !driveError && driveFiles.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 mb-2">Ou choisir depuis Drive</div>
          <div className="bg-white rounded-xl border divide-y overflow-hidden">
            {driveFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => handleDriveSelect(f.id)}
                disabled={loading}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                  <div className="text-xs text-gray-400">
                    {formatDriveDate(f.modifiedTime)} · {(f.size / 1024).toFixed(0)} Ko
                  </div>
                </div>
                <span className="text-gray-300 shrink-0">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {driveError && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          Drive indisponible : {driveError}
        </div>
      )}

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
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
              Facture N° {facture.numero}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500">Date</span>
                <div className="font-medium">{formatDate(facture.dateVente)}</div>
              </div>
              <div>
                <span className="text-gray-500">Magasin</span>
                <div className="font-medium truncate">{facture.magasin}</div>
              </div>
              <div>
                <span className="text-gray-500">Total TTC</span>
                <div className="font-medium text-sm sm:text-lg">{facture.totalTTC.toFixed(2)} €</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Options</h2>
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

          <div className="bg-white rounded-xl shadow-sm border divide-y sm:hidden">
            {facture.articles.map((a: Article, i: number) => (
              <div key={i} className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{a.designation}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{a.ref}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium text-sm">{a.totalTTC.toFixed(2)} €</div>
                    <div className="text-xs text-gray-400">{a.quantite} × {a.prixUnitaireTTC.toFixed(2)} €</div>
                  </div>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                  {a.categorie}
                </span>
              </div>
            ))}
            <div className="p-4 flex justify-between items-center bg-gray-50">
              <span className="font-medium text-sm">Total TTC</span>
              <span className="font-bold">{facture.totalTTC.toFixed(2)} €</span>
            </div>
          </div>

          <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
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
            className="w-full py-3.5 sm:py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-xl transition-colors"
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
