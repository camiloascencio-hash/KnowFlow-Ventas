import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CriticidadBadge, TipoBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";

/**
 * Página pública por QR (sin login): simula el código QR pegado junto a la
 * caja. SOLO muestra unidades publicadas; cualquier otro estado es 404.
 */
export default async function QrPage({
  params,
}: {
  params: Promise<{ unidadId: string }>;
}) {
  const { unidadId } = await params;
  const id = Number(unidadId);
  if (!Number.isInteger(id)) notFound();

  const [row] = await db
    .select({
      unidad: schema.unidadesConocimiento,
      cargoNombre: schema.cargos.nombre,
    })
    .from(schema.unidadesConocimiento)
    .innerJoin(
      schema.cargos,
      eq(schema.unidadesConocimiento.cargoId, schema.cargos.id)
    )
    .where(eq(schema.unidadesConocimiento.id, id));

  if (!row || row.unidad.estado !== "publicado") notFound();
  const { unidad, cargoNombre } = row;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        KnowFlow Ventas · {cargoNombre}
      </p>
      <h1 className="mt-1 text-2xl font-bold leading-tight">{unidad.titulo}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TipoBadge tipo={unidad.tipo} />
        <CriticidadBadge criticidad={unidad.criticidad} />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
          v{unidad.version}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <Markdown>{unidad.contenidoMarkdown}</Markdown>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Procedimiento validado
        {unidad.fechaPublicacion &&
          ` · publicado el ${unidad.fechaPublicacion.toLocaleDateString("es-CL")}`}
      </p>
    </main>
  );
}
