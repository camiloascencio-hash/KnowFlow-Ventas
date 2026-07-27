const ESTADO_STYLES: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-700",
  en_validacion: "bg-amber-100 text-amber-800",
  publicado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-red-100 text-red-700",
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  en_validacion: "En validación",
  publicado: "Publicado",
  rechazado: "Rechazado",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLES[estado] ?? ""}`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}

const CRITICIDAD_STYLES: Record<string, string> = {
  alta: "bg-red-50 text-red-700 ring-red-200",
  media: "bg-amber-50 text-amber-700 ring-amber-200",
  baja: "bg-slate-50 text-slate-600 ring-slate-200",
};

export function CriticidadBadge({ criticidad }: { criticidad: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${CRITICIDAD_STYLES[criticidad] ?? ""}`}
    >
      Criticidad {criticidad}
    </span>
  );
}

const TIPO_LABELS: Record<string, string> = {
  ficha_producto: "📱 Ficha de producto",
  argumentario: "🎯 Argumentario",
  objecion: "🛡️ Manejo de objeción",
  comparativa: "⚖️ Comparativa",
  promocion: "🏷️ Promoción vigente",
  procedimiento: "📋 Procedimiento",
};

const TIPO_STYLES: Record<string, string> = {
  ficha_producto: "bg-blue-50 text-blue-700",
  argumentario: "bg-violet-50 text-violet-700",
  objecion: "bg-orange-50 text-orange-700",
  comparativa: "bg-cyan-50 text-cyan-700",
  promocion: "bg-emerald-50 text-emerald-700",
  procedimiento: "bg-slate-100 text-slate-600",
};

export function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_STYLES[tipo] ?? "bg-blue-50 text-blue-700"}`}
    >
      {TIPO_LABELS[tipo] ?? tipo}
    </span>
  );
}
