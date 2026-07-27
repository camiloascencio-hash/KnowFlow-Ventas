/** Badges del catálogo de producto (mismo lenguaje visual que Badges.tsx). */

const GAMA_STYLES: Record<string, string> = {
  alta: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  media: "bg-sky-50 text-sky-700 ring-sky-200",
  entrada: "bg-slate-50 text-slate-600 ring-slate-200",
};

export function GamaBadge({ gama }: { gama: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${GAMA_STYLES[gama] ?? ""}`}
    >
      Gama {gama}
    </span>
  );
}

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  descontinuado: "bg-slate-100 text-slate-600 ring-slate-200",
  proximo_lanzamiento: "bg-violet-50 text-violet-700 ring-violet-200",
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "En tienda",
  descontinuado: "Descontinuado",
  proximo_lanzamiento: "Próximo lanzamiento",
};

export function EstadoProductoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${ESTADO_STYLES[estado] ?? ""}`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}
