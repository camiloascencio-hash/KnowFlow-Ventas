"use client";

import Link from "next/link";
import { TipoBadge } from "@/components/Badges";
import { useUnidadesLeidas } from "@/lib/useProgresoTurnos";

type Item = { id: number; titulo: string; tipo: string };

export default function MisTurnosClient({ unidades }: { unidades: Item[] }) {
  const vistas = useUnidadesLeidas();
  const completadas = unidades.filter((unidad) =>
    vistas.includes(unidad.id)
  ).length;
  const progreso =
    unidades.length > 0 ? Math.round((completadas / unidades.length) * 100) : 0;

  return (
    <div>
      <h1 className="text-xl font-bold">🎯 Mis primeras ventas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Lo imprescindible antes de atender solo: revisa cada tema crítico y
        confirma la lectura al final.
      </p>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Tu avance</span>
          <span className="text-slate-500">
            {completadas} de {unidades.length}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {unidades.map((unidad) => {
          const vista = vistas.includes(unidad.id);
          return (
            <li key={unidad.id}>
              <Link
                href={`/mis-turnos/${unidad.id}`}
                className={`group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  vista ? "ring-emerald-300" : "ring-slate-200"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                    vista
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug text-slate-800">
                    {unidad.titulo}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <TipoBadge tipo={unidad.tipo} />
                    <span
                      className={`text-xs font-medium ${
                        vista ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {vista ? "Lectura confirmada" : "Leer"}
                    </span>
                  </div>
                </div>
                <span
                  className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {unidades.length === 0 && (
        <p className="py-10 text-center text-slate-400">
          Aún no hay unidades de criticidad alta publicadas para tu cargo.
        </p>
      )}
    </div>
  );
}
