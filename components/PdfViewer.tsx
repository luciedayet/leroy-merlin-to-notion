"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const scale = (containerRef.current.clientWidth || 600) / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "w-full h-auto block border-b border-gray-100 last:border-b-0";
          const context = canvas.getContext("2d");
          if (!context) continue;

          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled || !containerRef.current) return;
          containerRef.current.appendChild(canvas);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur d'affichage du PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {loading && (
        <div className="p-10 text-center text-gray-400 text-sm">Chargement du PDF...</div>
      )}
      {error && <div className="p-4 text-red-600 text-sm">{error}</div>}
      <div ref={containerRef} className={`max-h-[75vh] overflow-y-auto ${loading ? "hidden" : ""}`} />
    </div>
  );
}
