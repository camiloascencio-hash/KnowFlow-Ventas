import { asc, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import Aviso from "@/components/Aviso";
import {
  crearCargoAction,
  editarCargoAction,
  eliminarCargoAction,
} from "@/app/actions/admin";

export const dynamic = "force-dynamic";

/**
 * Administración de cargos: cada cargo es un "silo" de conocimiento. El
 * asistente solo responde con procedimientos publicados del cargo del
 * trabajador, así que crear un cargo es el primer paso para sumar un área
 * nueva (reponedor, bodeguero, atención al cliente...).
 */
export default async function CargosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole("admin");
  const { ok, error } = await searchParams;

  const [cargos, usuariosPorCargo, unidadesPorCargo, consultasPorCargo] =
    await Promise.all([
      db.select().from(schema.cargos).orderBy(asc(schema.cargos.nombre)),
      db
        .select({ cargoId: schema.usuarios.cargoId, n: count() })
        .from(schema.usuarios)
        .groupBy(schema.usuarios.cargoId),
      db
        .select({
          cargoId: schema.unidadesConocimiento.cargoId,
          n: count(),
          publicadas: sql<number>`count(*) FILTER (WHERE ${schema.unidadesConocimiento.estado} = 'publicado')`,
        })
        .from(schema.unidadesConocimiento)
        .groupBy(schema.unidadesConocimiento.cargoId),
      db
        .select({ cargoId: schema.consultas.cargoId, n: count() })
        .from(schema.consultas)
        .groupBy(schema.consultas.cargoId),
    ]);

  const nUsuarios = new Map(usuariosPorCargo.map((r) => [r.cargoId, r.n]));
  const nUnidades = new Map(
    unidadesPorCargo.map((r) => [r.cargoId, { total: r.n, pub: Number(r.publicadas) }])
  );
  const nConsultas = new Map(consultasPorCargo.map((r) => [r.cargoId, r.n]));

  return (
    <div>
      <h1 className="text-xl font-bold">Cargos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cada cargo tiene su propia base de conocimiento: el asistente nunca
        cruza procedimientos entre cargos.
      </p>

      <Aviso ok={ok} error={error} />

      {/* Nuevo cargo */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Nuevo cargo</h2>
        <form action={crearCargoAction} className="mt-3 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Nombre
            <input
              name="nombre"
              required
              minLength={3}
              placeholder="Ej: Reponedor de sala"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Descripción <span className="text-slate-400">(opcional)</span>
            <textarea
              name="descripcion"
              rows={2}
              placeholder="Qué hace este cargo en la operación."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            + Crear cargo
          </button>
        </form>
      </section>

      {/* Listado */}
      <ul className="mt-5 space-y-3">
        {cargos.map((c) => {
          const unidades = nUnidades.get(c.id) ?? { total: 0, pub: 0 };
          const usuarios = nUsuarios.get(c.id) ?? 0;
          const vacio = usuarios === 0 && unidades.total === 0;
          return (
            <li
              key={c.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <details>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{c.nombre}</h3>
                      {c.descripcion && (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {c.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-blue-600">
                      Editar ▾
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">
                      👥 {usuarios} usuario{usuarios === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                      📚 {unidades.pub} publicada{unidades.pub === 1 ? "" : "s"}
                      {unidades.total > unidades.pub &&
                        ` (+${unidades.total - unidades.pub} en curso)`}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700">
                      💬 {nConsultas.get(c.id) ?? 0} consultas
                    </span>
                  </div>
                </summary>

                <form
                  action={editarCargoAction}
                  className="mt-3 space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="nombre"
                    defaultValue={c.nombre}
                    required
                    minLength={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <textarea
                    name="descripcion"
                    defaultValue={c.descripcion ?? ""}
                    rows={2}
                    placeholder="Descripción"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                    Guardar cambios
                  </button>
                </form>

                <form action={eliminarCargoAction} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    disabled={!vacio}
                    title={
                      vacio
                        ? "Eliminar cargo"
                        : "Solo se pueden eliminar cargos sin usuarios ni conocimiento"
                    }
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Eliminar cargo
                  </button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
