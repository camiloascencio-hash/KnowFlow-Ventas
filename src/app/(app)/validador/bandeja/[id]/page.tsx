import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import {
  aprobarUnidadAction,
  rechazarUnidadAction,
} from "@/app/actions/unidades";
import { CriticidadBadge, TipoBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";
import { diffLines } from "@/lib/diff";

export default async function RevisarUnidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("validador", "admin");
  const { id } = await params;

  const autor = alias(schema.usuarios, "autor");
  const [row] = await db
    .select({ unidad: schema.unidadesConocimiento, autorNombre: autor.nombre })
    .from(schema.unidadesConocimiento)
    .leftJoin(autor, eq(schema.unidadesConocimiento.autorExpertoId, autor.id))
    .where(and(eq(schema.unidadesConocimiento.id, Number(id)), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!)));

  if (!row || row.unidad.estado !== "en_validacion") notFound();
  const { unidad, autorNombre } = row;

  // Si es actualización de una unidad publicada, calcular el diff
  let diff = null;
  if (unidad.unidadOrigenId) {
    const [original] = await db
      .select()
      .from(schema.unidadesConocimiento)
      .where(and(eq(schema.unidadesConocimiento.id, unidad.unidadOrigenId), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!)));
    if (original) {
      diff = diffLines(original.contenidoMarkdown, unidad.contenidoMarkdown);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold leading-snug">{unidad.titulo}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <TipoBadge tipo={unidad.tipo} />
        <CriticidadBadge criticidad={unidad.criticidad} />
        {unidad.unidadOrigenId && (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            Actualización → v{unidad.version}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Aportada por {autorNombre ?? "—"} ·{" "}
        {unidad.creadoEn.toLocaleDateString("es-CL")}
      </p>

      {diff ? (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-700">
            Cambios respecto a la versión publicada
          </h2>
          <pre className="mt-2 overflow-x-auto rounded-2xl bg-white p-4 text-xs leading-relaxed ring-1 ring-slate-200">
            {diff.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "add"
                    ? "bg-emerald-50 text-emerald-800"
                    : line.type === "del"
                      ? "bg-red-50 text-red-700 line-through"
                      : "text-slate-600"
                }
              >
                {line.type === "add" ? "+ " : line.type === "del" ? "− " : "  "}
                {line.text || " "}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <Markdown>{unidad.contenidoMarkdown}</Markdown>
        </div>
      )}

      <div className="mt-5 space-y-3">
        <form action={aprobarUnidadAction}>
          <input type="hidden" name="id" value={unidad.id} />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-emerald-700"
          >
            ✅ Aprobar y publicar
          </button>
          <p className="mt-1 text-center text-xs text-slate-400">
            Al publicar se generan los chunks y embeddings para el asistente.
          </p>
        </form>

        <form action={rechazarUnidadAction} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <input type="hidden" name="id" value={unidad.id} />
          <label className="block text-sm font-medium text-slate-700">
            Observación para el experto
            <textarea
              name="comentario"
              rows={2}
              required
              placeholder="Ej: falta indicar qué hacer cuando el pago fue con tarjeta"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="mt-2 w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Rechazar (vuelve a borrador)
          </button>
        </form>
      </div>
    </div>
  );
}
