"use client";

import Link from "next/link";
import { setUnidadLeida, useUnidadesLeidas } from "@/lib/useProgresoTurnos";

interface ConfirmacionLecturaProps {
  unidadId: number;
}

export function ConfirmacionLectura({ unidadId }: ConfirmacionLecturaProps) {
  const confirmada = useUnidadesLeidas().includes(unidadId);

  return (
    <section
      className={`mt-5 rounded-2xl p-5 ring-1 transition ${
        confirmada
          ? "bg-emerald-50 ring-emerald-300"
          : "bg-white ring-slate-200"
      }`}
      aria-labelledby="confirmacion-lectura"
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={confirmada}
          onChange={(event) => setUnidadLeida(unidadId, event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span
            id="confirmacion-lectura"
            className="block font-semibold text-slate-900"
          >
            He leído y comprendido este contenido.
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-600">
            Al marcar esta casilla, se sumará a tu avance de primeras ventas.
          </span>
        </span>
      </label>

      {confirmada && (
        <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
          ✓ Lectura confirmada
        </p>
      )}

      <Link
        href="/mis-turnos"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        ← Volver a Mis primeras ventas
      </Link>
    </section>
  );
}
