"use client";

import { useEffect, useRef, useState } from "react";

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleNewWorker = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        // "installed" + un controller déjà actif = ce n'est pas la toute
        // première installation, mais une mise à jour d'une version déjà en place.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
        }
      });
    };

    const onVisibilityChange = (reg: ServiceWorkerRegistration) => () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    };

    let cleanupVisibility: (() => void) | undefined;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Une mise à jour a peut-être déjà été détectée avant le montage
        // (ex: onglet resté ouvert depuis la mise à jour précédente).
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) handleNewWorker(newWorker);
        });

        const handler = onVisibilityChange(reg);
        document.addEventListener("visibilitychange", handler);
        cleanupVisibility = () => document.removeEventListener("visibilitychange", handler);
      })
      .catch(() => {});

    const onControllerChange = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      cleanupVisibility?.();
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-50">
      <div className="bg-white rounded-xl shadow-lg border p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-700">Nouvelle version disponible</span>
        <button
          onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
          className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
