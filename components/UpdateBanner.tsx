"use client";

import { useEffect, useRef, useState } from "react";

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPopup, setShowPopup] = useState(true);
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
          setShowPopup(true);
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
          setShowPopup(true);
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

  if (!showPopup) {
    return (
      <div className="sticky top-0 z-50 bg-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Nouvelle version disponible</span>
          <button
            onClick={() => setShowPopup(true)}
            className="shrink-0 px-3 py-1 bg-white text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 text-center space-y-4">
        <div className="text-lg font-semibold text-gray-900">Nouvelle version disponible</div>
        <p className="text-sm text-gray-500">
          Une mise à jour de l&apos;application est prête à être installée.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Mettre à jour
          </button>
          <button
            onClick={() => setShowPopup(false)}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Mettre à jour plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
