"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EJEMPLO =
  "Ej: Cuando el cliente dice que está muy caro yo nunca bajo el precio al tiro. Le pregunto «¿caro comparado con qué?». Si me compara con otra marca le muestro el zoom en vivo, y si el tema es cómo pagarlo le calculo el canje de su equipo antiguo...";

export default function AportarPage() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/unidades/estructurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al estructurar el conocimiento");
        return;
      }
      router.push(`/experto/unidades/${data.id}?nueva=1${data.demo ? "&demo=1" : ""}`);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Aportar conocimiento</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cuenta con tus palabras cómo vendes: cómo respondes a una objeción,
        cómo explicas un producto o cómo cierras. La IA lo ordenará en una
        unidad estándar que podrás corregir antes de enviarla a validación.
      </p>

      <form onSubmit={handleSubmit} className="mt-5">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={EJEMPLO}
          rows={12}
          required
          minLength={30}
          className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-base leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-1 text-right text-xs text-slate-400">
          {texto.length} caracteres
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || texto.trim().length < 30}
          className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? "Estructurando con IA..."
            : "✨ Estructurar mi conocimiento"}
        </button>
      </form>
    </div>
  );
}
