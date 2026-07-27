import { and, count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import {
  detectarBrechas,
  metricasAgregadas,
  topTemasConsultados,
  SLA_HORAS,
} from "@/lib/brechas";
import {
  cambiarEstadoBrechaAction,
  redactarBorradorAction,
} from "@/app/actions/brechas";

export const dynamic = "force-dynamic";

const ESTADO_BRECHA_STYLES: Record<string, string> = {
  detectada: "bg-red-100 text-red-700",
  en_proceso: "bg-amber-100 text-amber-800",
  resuelta: "bg-emerald-100 text-emerald-800",
};

function horasDesde(fecha: Date): number {
  return Math.floor((Date.now() - fecha.getTime()) / 3600_000);
}

function fmtPct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ borrador?: string }>;
}) {
  const session = await requireRole("admin");
  const cargoId = session.user.cargoId!;
  const { borrador } = await searchParams;

  // Detección automática en cada carga (sin cron en el MVP)
  await detectarBrechas(cargoId);

  const [metricas, temas, brechas, cargo, fuentesCount, divergenciasCount, publicadasCount] = await Promise.all([
    metricasAgregadas(cargoId),
    topTemasConsultados(cargoId),
    db
      .select()
      .from(schema.brechas)
      .where(eq(schema.brechas.cargoId, cargoId))
      .orderBy(desc(schema.brechas.timestampDeteccion)),
    db.select().from(schema.cargos).where(eq(schema.cargos.id, cargoId)),
    db.select({ total: count() }).from(schema.fuentesConocimiento).where(eq(schema.fuentesConocimiento.cargoId, cargoId)),
    db.select({ total: count() }).from(schema.divergencias).innerJoin(schema.contrastes, eq(schema.divergencias.contrasteId, schema.contrastes.id)).where(and(eq(schema.contrastes.cargoId, cargoId), eq(schema.divergencias.aceptada, true))),
    db.select({ total: count() }).from(schema.unidadesConocimiento).where(and(eq(schema.unidadesConocimiento.cargoId, cargoId), eq(schema.unidadesConocimiento.estado, "publicado"))),
  ]);

  const maxSemana = Math.max(1, ...metricas.porSemana.map((s) => s.n));

  return (
    <div>
      <h1 className="text-xl font-bold">Dashboard · {cargo[0]?.nombre}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Métricas agregadas del equipo. Por diseño, nunca se muestran datos
        individuales de trabajadores.
      </p>

      {borrador && (
        <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800 ring-1 ring-violet-200">
          ✨ Borrador esqueleto generado por IA. El experto del cargo lo verá en
          “Mis unidades” para completarlo con el conocimiento real y enviarlo a
          validación.
        </p>
      )}

      <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-blue-950">Ciclo de conocimiento</h2><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Datos demostrativos</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div><p className="text-xl font-bold text-blue-900">{fuentesCount[0]?.total ?? 0}</p><p className="text-xs text-blue-800">Fuentes</p></div><div><p className="text-xl font-bold text-blue-900">{divergenciasCount[0]?.total ?? 0}</p><p className="text-xs text-blue-800">Divergencias aceptadas</p></div><div><p className="text-xl font-bold text-blue-900">{publicadasCount[0]?.total ?? 0}</p><p className="text-xs text-blue-800">Unidades publicadas</p></div><div><p className="text-xl font-bold text-blue-900">{brechas.length}</p><p className="text-xs text-blue-800">Brechas</p></div></div>
      </section>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-2xl font-bold">{metricas.totalConsultas}</p>
          <p className="mt-0.5 text-xs text-slate-500">Consultas totales</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-blue-700">
            {fmtPct(metricas.tre)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            TRE · resueltas sin escalar
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-emerald-700">
            {fmtPct(metricas.upi)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            UPI · ratings positivos
          </p>
        </div>
      </div>

      {/* Consultas por semana */}
      <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          Consultas por semana
        </h2>
        <div className="mt-3 flex h-28 items-end gap-2">
          {metricas.porSemana.map((s) => (
            <div key={s.semana} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-slate-600">{s.n}</span>
              <div
                className="w-full rounded-t-lg bg-blue-500"
                style={{ height: `${(s.n / maxSemana) * 80}px` }}
              />
              <span className="text-[10px] text-slate-400">{s.semana}</span>
            </div>
          ))}
          {metricas.porSemana.length === 0 && (
            <p className="text-sm text-slate-400">Sin consultas registradas.</p>
          )}
        </div>
      </section>

      {/* Top temas */}
      <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          Top temas más consultados (últimos 30 días)
        </h2>
        <ul className="mt-3 space-y-2">
          {temas.map((t, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-5 shrink-0 text-right font-semibold text-slate-400">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {t.tema}
              </span>
              {t.sinCobertura > 0 && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                  {t.sinCobertura} sin cobertura
                </span>
              )}
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {t.consultas}
              </span>
            </li>
          ))}
          {temas.length === 0 && (
            <p className="text-sm text-slate-400">Sin datos suficientes.</p>
          )}
        </ul>
      </section>

      {/* Brechas */}
      <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          Brechas de conocimiento
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Detección automática: ≥3 consultas sin resolver (o con 👎) sobre un
          mismo tema en 7 días. SLA de cierre: {SLA_HORAS} h.
        </p>
        <ul className="mt-3 space-y-3">
          {brechas.map((b) => {
            const horas = horasDesde(b.timestampDeteccion);
            const vencida = b.estado !== "resuelta" && horas > SLA_HORAS;
            return (
              <li
                key={b.id}
                className={`rounded-xl p-3 ring-1 ${
                  vencida ? "bg-red-50 ring-red-200" : "bg-slate-50 ring-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug text-slate-800">
                    {b.temaDetectado}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BRECHA_STYLES[b.estado]}`}
                  >
                    {b.estado.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {b.nConsultasSinResolver} consultas sin resolver · detectada
                  hace {horas < 48 ? `${horas} h` : `${Math.floor(horas / 24)} días`}
                  {b.estado !== "resuelta" && (
                    <span
                      className={`ml-2 font-semibold ${vencida ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {vencida
                        ? `⚠ SLA vencido (${horas - SLA_HORAS} h de atraso)`
                        : `dentro de SLA (quedan ${SLA_HORAS - horas} h)`}
                    </span>
                  )}
                </p>
                {b.estado !== "resuelta" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.estado === "detectada" && (
                      <form action={redactarBorradorAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100">
                          ✨ Redactar borrador con IA
                        </button>
                      </form>
                    )}
                    {b.estado === "detectada" && (
                      <form action={cambiarEstadoBrechaAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="estado" value="en_proceso" />
                        <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100">
                          Tomar (en proceso)
                        </button>
                      </form>
                    )}
                    <form action={cambiarEstadoBrechaAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="estado" value="resuelta" />
                      <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
                        Marcar resuelta
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
          {brechas.length === 0 && (
            <p className="text-sm text-slate-400">
              🎉 No hay brechas detectadas.
            </p>
          )}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          💡 Para cerrar una brecha: pide a un experto que documente el tema en
          “Aportar conocimiento” y márcala como resuelta cuando se publique.
        </p>
      </section>
    </div>
  );
}
