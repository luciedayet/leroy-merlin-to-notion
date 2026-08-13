"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Article, DriveFile, Facture } from "@/lib/types";
import { PAYEURS, PIECES, POSTES } from "@/lib/types";

interface ArticleDetail {
  piece: string;
  postes: string[];
}

export default function Home() {
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [numero, setNumero] = useState("");
  const [dateVente, setDateVente] = useState("");
  const [magasin, setMagasin] = useState("");
  const [payeur, setPayeur] = useState("");
  const [customPayeur, setCustomPayeur] = useState(false);
  const [remboursed, setRemboursed] = useState(false);
  const [articleDetails, setArticleDetails] = useState<ArticleDetail[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveError, setDriveError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

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

  const applyFacture = (data: Facture) => {
    setFacture(data);
    setNumero(data.numero);
    setDateVente(data.dateVente);
    setMagasin(data.magasin);
    setPayeur("");
    setCustomPayeur(false);
    setRemboursed(false);
    setArticleDetails(data.articles.map(() => ({ piece: "", postes: [] })));
  };

  const handleFile = useCallback(async (file: File) => {
    const id = ++requestIdRef.current;
    setPdfUrl(URL.createObjectURL(file));
    setDriveFileId(null);
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
      if (requestIdRef.current === id) applyFacture(data);
    } catch (e: unknown) {
      if (requestIdRef.current === id) setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      if (requestIdRef.current === id) setLoading(false);
    }
  }, []);

  const handleDriveSelect = useCallback(async (fileId: string) => {
    const id = ++requestIdRef.current;
    setPdfUrl(`/api/drive/file?fileId=${encodeURIComponent(fileId)}`);
    setDriveFileId(fileId);
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
      if (requestIdRef.current === id) applyFacture(data);
    } catch (e: unknown) {
      if (requestIdRef.current === id) setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      if (requestIdRef.current === id) setLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    requestIdRef.current++;
    if (pdfUrl?.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setDriveFileId(null);
    setFacture(null);
    setLoading(false);
    setNumero("");
    setDateVente("");
    setMagasin("");
    setPayeur("");
    setCustomPayeur(false);
    setRemboursed(false);
    setArticleDetails([]);
  }, [pdfUrl]);

  const resetSelection = useCallback(() => {
    clearSelection();
    setError("");
    setSuccess("");
  }, [clearSelection]);

  const setArticlePiece = (index: number, piece: string) => {
    setArticleDetails((prev) => prev.map((d, i) => (i === index ? { ...d, piece } : d)));
  };

  const toggleArticlePoste = (index: number, poste: string) => {
    setArticleDetails((prev) =>
      prev.map((d, i) =>
        i === index
          ? { ...d, postes: d.postes.includes(poste) ? d.postes.filter((p) => p !== poste) : [...d.postes, poste] }
          : d,
      ),
    );
  };

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
          facture: { numero, dateVente },
          payeur: payeur || undefined,
          remboursed,
          articles: facture.articles.map((a, i) => ({
            ...a,
            piece: articleDetails[i]?.piece || undefined,
            postes: articleDetails[i]?.postes?.length ? articleDetails[i].postes : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let message = `${data.count} article(s) importé(s) dans Notion !`;

      if (driveFileId) {
        try {
          const moveRes = await fetch("/api/drive/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: driveFileId, remboursed }),
          });
          const moveData = await moveRes.json();
          if (!moveRes.ok) throw new Error(moveData.error);
          message += " Facture déplacée dans Drive.";
          setDriveFiles((prev) => prev.filter((f) => f.id !== driveFileId));
        } catch (e: unknown) {
          message += ` (déplacement Drive échoué : ${e instanceof Error ? e.message : "erreur inconnue"})`;
        }
      }

      clearSelection();
      setSuccess(message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setImporting(false);
    }
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

      {!pdfUrl && (
        <>
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

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
            <div className="text-3xl sm:text-4xl mb-3">📄</div>
            <div className="text-gray-600 font-medium">
              Sélectionnez votre facture PDF
            </div>
            <div className="text-gray-400 text-sm mt-1 hidden sm:block">
              ou glissez-déposez ici
            </div>
          </div>

          {!driveLoading && !driveError && driveFiles.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-700 mb-2">Ou choisir depuis Drive</div>
              <div className="bg-white rounded-xl border divide-y overflow-hidden">
                {driveFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleDriveSelect(f.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
        </>
      )}

      {pdfUrl && (
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          <button
            onClick={resetSelection}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ‹ Choisir une autre facture
          </button>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <iframe src={pdfUrl} title="Aperçu de la facture" className="w-full h-64 sm:h-96" />
          </div>

          {loading && (
            <div className="text-green-600 font-medium text-sm">Analyse en cours...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {facture && (
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Informations de la facture
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de facture
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="AAAA-MM-JJ"
                    value={dateVente}
                    onChange={(e) => setDateVente(e.target.value)}
                    className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin</label>
                  <input
                    type="text"
                    value={magasin}
                    onChange={(e) => setMagasin(e.target.value)}
                    className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payeur</label>
                  <select
                    value={customPayeur ? "__other__" : payeur}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setCustomPayeur(true);
                        setPayeur("");
                      } else {
                        setCustomPayeur(false);
                        setPayeur(e.target.value);
                      }
                    }}
                    className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm"
                  >
                    <option value="">— Non défini —</option>
                    {PAYEURS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="__other__">+ Ajouter un payeur...</option>
                  </select>
                  {customPayeur && (
                    <input
                      type="text"
                      value={payeur}
                      onChange={(e) => setPayeur(e.target.value)}
                      placeholder="Nom du payeur"
                      autoFocus
                      className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm mt-2"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="rembourse"
                    type="checkbox"
                    checked={remboursed}
                    onChange={(e) => setRemboursed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="rembourse" className="text-sm font-medium text-gray-700">
                    Remboursé
                  </label>
                </div>
              </div>
            </div>
          )}

          {facture && facture.articles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Articles</h2>
              {facture.articles.map((a: Article, i: number) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">{a.designation}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">Réf {a.ref}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium text-sm sm:text-base">{a.prixUnitaireTTC.toFixed(2)} €</div>
                      <div className="text-xs text-gray-400">× {a.quantite}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pièce</label>
                      <select
                        value={articleDetails[i]?.piece ?? ""}
                        onChange={(e) => setArticlePiece(i, e.target.value)}
                        className="w-full min-w-0 border rounded-lg px-3 py-2 text-base sm:text-sm"
                      >
                        <option value="">— Non défini —</option>
                        {PIECES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Poste(s)</label>
                      <div className="flex flex-wrap gap-2">
                        {POSTES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggleArticlePoste(i, p)}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                              articleDetails[i]?.postes.includes(p)
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
              ))}
            </div>
          )}

          {facture && facture.articles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-lg">
                  {facture.articles.reduce((sum, a) => sum + a.totalTTC, 0).toFixed(2)} €
                </span>
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
        </div>
      )}
    </main>
  );
}
