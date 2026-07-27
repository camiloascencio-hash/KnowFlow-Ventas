import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CriticidadBadge, TipoBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { ConfirmacionLectura } from "./ConfirmacionLectura";

export default async function DetallePrimerTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("trabajador_nuevo");
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id)) notFound();

  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(
      and(
        eq(schema.unidadesConocimiento.id, id),
        eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!),
        eq(schema.unidadesConocimiento.estado, "publicado"),
        eq(schema.unidadesConocimiento.criticidad, "alta")
      )
    )
    .limit(1);

  if (!unidad) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/mis-turnos"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        ← Mis primeras ventas
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Imprescindible para tus primeras ventas
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
          {unidad.titulo}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TipoBadge tipo={unidad.tipo} />
          <CriticidadBadge criticidad={unidad.criticidad} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            v{unidad.version}
          </span>
        </div>
      </header>

      <article className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <Markdown>{unidad.contenidoMarkdown}</Markdown>
      </article>

      <ConfirmacionLectura unidadId={unidad.id} />
    </div>
  );
}
