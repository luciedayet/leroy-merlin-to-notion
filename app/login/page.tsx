"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(searchParams.get("next") || "/");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto px-4 py-16 sm:py-24 min-h-screen flex flex-col justify-center">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
        Leroy Merlin → Notion
      </h1>
      <p className="text-gray-500 mb-8 text-center text-sm sm:text-base">Entrez le code d&apos;accès</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          inputMode="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code d'accès"
          autoFocus
          className="w-full border rounded-lg px-3 py-3 sm:py-2 text-base sm:text-sm"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? "Vérification..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
