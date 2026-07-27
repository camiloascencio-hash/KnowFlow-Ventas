import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import {
  guardarUnidadAction,
  nuevaVersionAction,
} from "@/app/actions/unidades";
import { CriticidadBadge, EstadoBadge, TipoBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";

export default async function EditarUnidadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string; demo?: string; guardada?: string }>;
}) {
  const session = await requireRole("experto");
  const { id } = await params;
  const { nueva, demo, guardada } = await searchParams;

  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, Number(id)));

  if (!unidad || unidad.autorExpertoId !== Number(session.user.id)) {
    notFound();
  }

  const editable = unidad.estado === "borrador";

  return (
    <div>
      {nueva && (
        <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {demo
            ? "🔧 Estructurada en MODO DEMO (sin IA). Revisa con especial atención antes de enviar."
            : "✨ La IA estructuró tu conocimiento. Revisa, corrige lo que falte y envíala a validación."}
        </p>
      )}
      {guardada && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambios guardados.
        </p>
      )}
      {unidad.comentarioRechazo && unidad.estado === "borrador" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Observación del validador:</span>{" "}
          {unidad.comentarioRechazo}
        </p>
      )}

      {editable ? (
        <form action={guardarUnidadAction}>
          <input type="hidden" name="id" value={unidad.id} />

          <label className="block text-sm font-medium text-slate-700">
            Título
            <input
              name="titulo"
              defaultValue={unidad.titulo}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-500"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Tipo
              <select
                name="tipo"
                defaultValue={unidad.tipo}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="ficha_producto">Ficha de producto</option>
                <option value="argumentario">Argumentario</option>
                <option value="objecion">Manejo de objeción</option>
                <option value="comparativa">Comparativa</option>
                <option value="promocion">Promoción vigente</option>
                <option value="procedimiento">Procedimiento</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Criticidad
              <select
                name="criticidad"
                defaultValue={unidad.criticidad}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm font-medium text-slate-700">
            Contenido (markdown)
            <textarea
              name="contenidoMarkdown"
              defaultValue={unidad.contenidoMarkdown}
              rows={18}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm leading-relaxed outline-none focus:border-blue-500"
            />
          </label>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar borrador
            </button>
            <button
              type="submit"
              name="enviar"
              value="1"
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Enviar a validación →
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{unidad.titulo}</h1>
            <EstadoBadge estado={unidad.estado} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TipoBadge tipo={unidad.tipo} />
            <CriticidadBadge criticidad={unidad.criticidad} />
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
              v{unidad.version}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <Markdown>{unidad.contenidoMarkdown}</Markdown>
          </div>

          {unidad.estado === "en_validacion" && (
            <p className="mt-3 text-sm text-slate-500">
              ⏳ Esta unidad está esperando revisión del validador.
            </p>
          )}
          {unidad.estado === "publicado" && (
            <form action={nuevaVersionAction} className="mt-4">
              <input type="hidden" name="id" value={unidad.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                📝 Proponer nueva versión
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
