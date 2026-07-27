"use client";

import { useState, useTransition } from "react";
import { cambiarAceptacionDivergenciaAction } from "@/app/actions/contrastes";

type DivergenciaItem = { id: number; tipo: string; descripcion: string; evidenciaManual: string | null; evidenciaOperacion: string; riesgo: string; recomendacion: string; aceptada: boolean };

export function DivergenciasClient({ divergencias }: { divergencias: DivergenciaItem[] }) {
  const [items, setItems] = useState(divergencias);
  const [pending, startTransition] = useTransition();
  function cambiar(id: number, aceptada: boolean) {
    setItems((actuales) => actuales.map((item) => item.id === id ? { ...item, aceptada } : item));
    startTransition(async () => { try { await cambiarAceptacionDivergenciaAction(id, aceptada); } catch { setItems(divergencias); } });
  }
  return <div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className={`rounded-2xl border p-4 shadow-sm ${item.aceptada ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-white"}`}><div className="flex items-start gap-3"><input aria-label={`Aceptar ${item.descripcion}`} type="checkbox" checked={item.aceptada} disabled={pending} onChange={(event) => cambiar(item.id, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{item.tipo.replaceAll("_", " ")}</p><h2 className="mt-1 font-semibold text-slate-900">{item.descripcion}</h2></div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-500">Manual oficial</dt><dd className="mt-1 text-slate-700">{item.evidenciaManual ?? "No aparece explícitamente en el manual."}</dd></div><div className="rounded-xl bg-amber-50 p-3"><dt className="text-xs font-semibold uppercase text-amber-700">Práctica observada</dt><dd className="mt-1 text-amber-950">{item.evidenciaOperacion}</dd></div></dl><p className="mt-3 text-sm text-slate-600"><strong>Riesgo:</strong> {item.riesgo}</p><p className="mt-1 text-sm text-slate-600"><strong>Propuesta:</strong> {item.recomendacion}</p></article>)}</div>;
}
