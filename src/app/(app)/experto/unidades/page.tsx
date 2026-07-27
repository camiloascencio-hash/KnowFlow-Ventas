import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { CriticidadBadge, EstadoBadge, TipoBadge } from "@/components/Badges";

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ enviada?: string }>;
}) {
  const session = await requireRole("experto");
  const { enviada } = await searchParams;

  const unidades = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(
      eq(schema.unidadesConocimiento.autorExpertoId, Number(session.user.id))
    )
    .orderBy(desc(schema.unidadesConocimiento.creadoEn));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis unidades</h1>
        <Link
          href="/experto/aportar"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          ✍️ Aportar
        </Link>
      </div>

      {enviada && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Unidad enviada a validación. Te avisaremos cuando sea revisada.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {unidades.map((u) => (
          <li key={u.id}>
            <Link
              href={`/experto/unidades/${u.id}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold leading-snug">{u.titulo}</h2>
                <EstadoBadge estado={u.estado} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TipoBadge tipo={u.tipo} />
                <CriticidadBadge criticidad={u.criticidad} />
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
                  v{u.version}
                </span>
              </div>
              {u.comentarioRechazo && u.estado === "borrador" && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">
                  Observación del validador: {u.comentarioRechazo}
                </p>
              )}
            </Link>
          </li>
        ))}
        {unidades.length === 0 && (
          <p className="py-10 text-center text-slate-400">
            Aún no has aportado conocimiento.
          </p>
        )}
      </ul>
    </div>
  );
}
