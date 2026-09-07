import { desc, eq } from "drizzle-orm";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Trazabilidad de las propias preguntas al asistente.
 *
 * Es autoservicio, no supervisión: cada trabajador nuevo ve SU historial, no
 * el de otros, y nadie más lo ve por él. Jefatura solo accede a los mismos
 * datos en forma agregada (top temas, tasa de resolución) en su dashboard —
 * nunca a "qué preguntó cada persona", siguiendo el mismo principio de
 * privacidad que ya rige el resto de las métricas de este cargo.
 */
export default async function MiHistorialPage() {
  const session = await requireRole("trabajador_nuevo");

  const consultas = await db
    .select()
    .from(schema.consultas)
    .where(eq(schema.consultas.usuarioId, Number(session.user.id)))
    .orderBy(desc(schema.consultas.timestamp))
    .limit(50);

  return (
    <div>
      <h1 className="text-xl font-bold">Mi historial</h1>
      <p className="mt-1 text-sm text-slate-500">
        Lo que le has preguntado al asistente. Solo tú ves esta pantalla.
      </p>

      <ul className="mt-4 space-y-3">
        {consultas.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <div className="flex items-start gap-2.5">
              {c.resuelta ? (
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
              ) : (
                <HelpCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug text-slate-800">
                  {c.textoPregunta}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {c.timestamp.toLocaleString("es-CL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · "}
                  {c.resuelta ? "Resuelta" : "Sin cobertura — derivada"}
                  {c.escalada && " · Escalada"}
                </p>
              </div>
            </div>
          </li>
        ))}

        {consultas.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            Todavía no le has preguntado nada al asistente.
          </li>
        )}
      </ul>
    </div>
  );
}
