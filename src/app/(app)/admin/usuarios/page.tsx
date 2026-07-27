import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import Aviso from "@/components/Aviso";
import {
  actualizarUsuarioAction,
  crearUsuarioAction,
  eliminarUsuarioAction,
  resetPasswordAction,
} from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const ROL_LABELS: Record<string, string> = {
  trabajador_nuevo: "Trabajador nuevo",
  experto: "Experto",
  validador: "Validador",
  admin: "Admin / Jefatura",
};

const ROL_STYLES: Record<string, string> = {
  trabajador_nuevo: "bg-blue-50 text-blue-700 ring-blue-200",
  experto: "bg-violet-50 text-violet-700 ring-violet-200",
  validador: "bg-amber-50 text-amber-800 ring-amber-200",
  admin: "bg-slate-100 text-slate-700 ring-slate-300",
};

const ROL_AYUDA: Record<string, string> = {
  trabajador_nuevo: "Usa el asistente y la ruta de primeros turnos.",
  experto: "Aporta conocimiento; la IA lo estructura.",
  validador: "Aprueba o rechaza; nada se publica sin él.",
  admin: "Dashboard, brechas, cargos y usuarios.",
};

export default async function UsuariosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireRole("admin");
  const { ok, error } = await searchParams;

  const [usuarios, cargos] = await Promise.all([
    db
      .select()
      .from(schema.usuarios)
      .orderBy(asc(schema.usuarios.rol), asc(schema.usuarios.nombre)),
    db.select().from(schema.cargos).orderBy(asc(schema.cargos.nombre)),
  ]);

  const nombreCargo = new Map(cargos.map((c) => [c.id, c.nombre]));

  return (
    <div>
      <h1 className="text-xl font-bold">Usuarios</h1>
      <p className="mt-1 text-sm text-slate-500">
        Da de alta al equipo y define qué rol cumple cada persona en el ciclo de
        conocimiento.
      </p>

      <Aviso ok={ok} error={error} />

      {cargos.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          Primero crea un cargo en la pestaña “Cargos”: cada usuario debe
          pertenecer a uno.
        </p>
      )}

      {/* Nuevo usuario */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Nuevo usuario</h2>
        <form action={crearUsuarioAction} className="mt-3 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Nombre completo
            <input
              name="nombre"
              required
              minLength={3}
              placeholder="Ej: Camila Soto"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              placeholder="nombre@empresa.cl"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña inicial
            <input
              name="password"
              type="text"
              required
              minLength={6}
              defaultValue="demo123"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              La persona la usará para su primer ingreso.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Rol
              <select
                name="rol"
                required
                defaultValue="trabajador_nuevo"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {Object.entries(ROL_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Cargo
              <select
                name="cargoId"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            disabled={cargos.length === 0}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            + Crear usuario
          </button>
        </form>

        <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3">
          {Object.entries(ROL_AYUDA).map(([rol, ayuda]) => (
            <li key={rol} className="flex gap-2 text-xs text-slate-500">
              <span className="w-28 shrink-0 font-medium text-slate-600">
                {ROL_LABELS[rol]}
              </span>
              <span>{ayuda}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Listado */}
      <h2 className="mt-6 text-sm font-semibold text-slate-700">
        Equipo ({usuarios.length})
      </h2>
      <ul className="mt-2 space-y-3">
        {usuarios.map((u) => {
          const esYo = u.id === Number(session.user.id);
          return (
            <li
              key={u.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <details>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">
                        {u.nombre}
                        {esYo && (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            (tú)
                          </span>
                        )}
                      </h3>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-blue-600">
                      Gestionar ▾
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${ROL_STYLES[u.rol]}`}
                    >
                      {ROL_LABELS[u.rol]}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
                      {u.cargoId ? nombreCargo.get(u.cargoId) : "sin cargo"}
                    </span>
                  </div>
                </summary>

                {/* Cambiar rol y cargo */}
                <form
                  action={actualizarUsuarioAction}
                  className="mt-3 space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="rol"
                      defaultValue={u.rol}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {Object.entries(ROL_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      name="cargoId"
                      defaultValue={u.cargoId ?? ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {cargos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                    Guardar rol y cargo
                  </button>
                </form>

                {/* Resetear contraseña */}
                <form
                  action={resetPasswordAction}
                  className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <label className="flex-1 text-xs font-medium text-slate-600">
                    Nueva contraseña
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={6}
                      placeholder="mínimo 6 caracteres"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                  <button className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                    Cambiar
                  </button>
                </form>

                {/* Eliminar */}
                {!esYo && (
                  <form action={eliminarUsuarioAction} className="mt-3">
                    <input type="hidden" name="id" value={u.id} />
                    <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                      Eliminar usuario
                    </button>
                  </form>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
