import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { CriticidadBadge, TipoBadge } from "@/components/Badges";

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<{ aprobada?: string; rechazada?: string }>;
}) {
  const session = await requireRole("validador", "admin");
  const { aprobada, rechazada } = await searchParams;

  const autor = alias(schema.usuarios, "autor");
  const pendientes = await db
    .select({
      unidad: schema.unidadesConocimiento,
      autorNombre: autor.nombre,
    })
    .from(schema.unidadesConocimiento)
    .leftJoin(autor, eq(schema.unidadesConocimiento.autorExpertoId, autor.id))
    .where(and(eq(schema.unidadesConocimiento.estado, "en_validacion"), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!)))
    .orderBy(asc(schema.unidadesConocimiento.creadoEn));

  return (
    <div>
      <h1 className="text-xl font-bold">Bandeja de validación</h1>
      <p className="mt-1 text-sm text-slate-500">
        Nada llega al asistente sin tu aprobación. Revisa cada unidad antes de
        publicarla.
      </p>

      {aprobada && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✅ Unidad publicada. Ya está disponible para los trabajadores y su
          contenido fue indexado para el asistente.
        </p>
      )}
      {rechazada && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La unidad volvió a borrador con tu observación.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {pendientes.map(({ unidad, autorNombre }) => (
          <li key={unidad.id}>
            <Link
              href={`/validador/bandeja/${unidad.id}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold leading-snug">{unidad.titulo}</h2>
                {unidad.unidadOrigenId && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    Actualización v{unidad.version}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TipoBadge tipo={unidad.tipo} />
                <CriticidadBadge criticidad={unidad.criticidad} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Aportada por {autorNombre ?? "—"} ·{" "}
                {unidad.creadoEn.toLocaleDateString("es-CL")}
              </p>
            </Link>
          </li>
        ))}
        {pendientes.length === 0 && (
          <p className="py-10 text-center text-slate-400">
            🎉 No hay unidades pendientes de validación.
          </p>
        )}
      </ul>
    </div>
  );
}
