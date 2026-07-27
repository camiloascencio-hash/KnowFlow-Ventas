import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, BookOpen, Star, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import Aviso from "@/components/Aviso";
import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_GRUPO,
  DIAS_VERIFICACION_VIGENTE,
  especificacionesDe,
  formatearFecha,
  glosarioParaTextos,
  resolverPrecio,
  verificacionVencida,
} from "@/lib/catalogo";
import { lineaSpec } from "@/lib/catalogo-respuestas";
import type { CategoriaProducto, Gama, GrupoEspecificacion } from "@/db/schema";
import {
  eliminarEspecificacionAction,
  actualizarPrecioAction,
  editarProductoAction,
  guardarEspecificacionAction,
  marcarVerificadoAction,
} from "@/app/actions/catalogo";
import { EstadoProductoBadge, GamaBadge } from "@/components/BadgesCatalogo";

export const dynamic = "force-dynamic";

const CATEGORIAS = Object.keys(ETIQUETAS_CATEGORIA) as CategoriaProducto[];
const GRUPOS = Object.keys(ETIQUETAS_GRUPO) as GrupoEspecificacion[];
const GAMAS: Gama[] = ["alta", "media", "entrada"];
const ESTADOS = [
  ["activo", "En tienda"],
  ["proximo_lanzamiento", "Próximo lanzamiento"],
  ["descontinuado", "Descontinuado"],
] as const;

const input =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";

export default async function FichaProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireRole();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const puedeEditar =
    session.user.rol === "experto" || session.user.rol === "admin";

  const [producto] = await db
    .select()
    .from(schema.productos)
    .where(eq(schema.productos.id, Number(id)))
    .limit(1);
  if (!producto) notFound();

  const specs = await especificacionesDe(producto.id);
  const precio = resolverPrecio(producto);
  const diferenciadores = specs.filter((s) => s.esDiferenciador);

  // "Cómo explicárselo al cliente": resuelve los tecnicismos que aparecen en
  // esta ficha contra el glosario. Es el puente entre el dato y la venta.
  const tecnicismos = await glosarioParaTextos([
    ...specs.map((s) => `${s.clave} ${s.valor} ${s.unidad ?? ""}`),
    producto.resumenVenta ?? "",
  ]);

  const porGrupo = new Map<GrupoEspecificacion, typeof specs>();
  for (const s of specs) {
    porGrupo.set(s.grupo, [...(porGrupo.get(s.grupo) ?? []), s]);
  }

  const sinVerificar = verificacionVencida(producto.verificadoEn);

  return (
    <div>
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} /> Catálogo
      </Link>

      <h1 className="mt-2 text-xl font-bold leading-snug">{producto.modelo}</h1>
      <p className="text-xs text-slate-400">
        {producto.marca} · {ETIQUETAS_CATEGORIA[producto.categoria]}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <GamaBadge gama={producto.gama} />
        <EstadoProductoBadge estado={producto.estado} />
      </div>

      <Aviso ok={ok} error={error} />

      {/* Un dato viejo es tan peligroso como uno inventado: se avisa. */}
      {sinVerificar && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          ⚠{" "}
          {producto.verificadoEn
            ? `Dato sin verificar desde el ${formatearFecha(
                producto.verificadoEn.toISOString().slice(0, 10)
              )} (más de ${DIAS_VERIFICACION_VIGENTE} días).`
            : "Esta ficha nunca se ha verificado."}{" "}
          Confírmala en la fuente oficial antes de comprometer algo con el
          cliente.
        </p>
      )}

      {producto.resumenVenta && (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          {producto.resumenVenta}
        </p>
      )}

      {/* Diferenciadores arriba: son los argumentos, no solo datos. */}
      {diferenciadores.length > 0 && (
        <section className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4 ring-1 ring-indigo-200">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900">
            <Star size={15} /> Con esto se vende
          </h2>
          <ul className="mt-2 space-y-1.5">
            {diferenciadores.map((s) => (
              <li key={s.id} className="text-sm leading-relaxed text-indigo-900">
                <span className="font-medium">{s.clave}:</span>{" "}
                {s.unidad ? `${s.valor} ${s.unidad}` : s.valor}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Precio</h2>
        <p
          className={`mt-1 text-sm leading-relaxed ${
            precio.citable ? "text-slate-700" : "text-amber-800"
          }`}
        >
          {precio.texto}
        </p>
      </section>

      {(producto.almacenamientos.length > 0 || producto.colores.length > 0) && (
        <section className="mt-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
          {producto.almacenamientos.length > 0 && (
            <p className="text-slate-700">
              <span className="font-medium">Almacenamientos:</span>{" "}
              {producto.almacenamientos.join(" · ")}
            </p>
          )}
          {producto.colores.length > 0 && (
            <p className="mt-1 text-slate-700">
              <span className="font-medium">Colores:</span>{" "}
              {producto.colores.join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Ficha completa, agrupada */}
      {[...porGrupo.entries()].map(([grupo, filas]) => (
        <section
          key={grupo}
          className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <h2 className="text-sm font-semibold text-slate-700">
            {ETIQUETAS_GRUPO[grupo]}
          </h2>
          <dl className="mt-2 space-y-1.5">
            {filas.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-500">
                  {s.clave}
                  {s.esDiferenciador && (
                    <Star size={11} className="ml-1 inline text-indigo-500" />
                  )}
                </dt>
                <dd className="text-right text-sm font-medium text-slate-800">
                  {s.unidad ? `${s.valor} ${s.unidad}` : s.valor}
                  {!s.verificado && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      sin verificar
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {specs.length === 0 && (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
          Esta ficha todavía no tiene especificaciones cargadas. El asistente
          no va a inventar ninguna: va a derivar al jefe de tienda.
        </p>
      )}

      {/* Cómo explicárselo al cliente */}
      {tecnicismos.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <BookOpen size={15} /> Cómo explicárselo al cliente
          </h2>
          <div className="mt-2 space-y-3">
            {tecnicismos.map((t) => (
              <details key={t.id} className="rounded-xl bg-slate-50 p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
                  {t.termino}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {t.traduccionVenta}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                  <span className="font-medium">Para qué le sirve:</span>{" "}
                  {t.beneficioCliente}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-red-700">
                  <span className="font-medium">No digas:</span>{" "}
                  {t.erroresComunes}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {producto.fuenteUrl && (
        <p className="mt-3 text-xs text-slate-400">
          Fuente: {producto.fuenteUrl}
        </p>
      )}

      {/* --- Administración de la ficha (experto / admin) --------------- */}
      {puedeEditar && (
        <div className="mt-6 space-y-3">
          <form action={marcarVerificadoAction}>
            <input type="hidden" name="id" value={producto.id} />
            <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
              <BadgeCheck size={16} /> Verifiqué esta ficha hoy
            </button>
          </form>

          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <details>
              <summary className="cursor-pointer list-none text-sm font-semibold text-blue-700">
                Editar precio y vigencia
              </summary>
              <form action={actualizarPrecioAction} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={producto.id} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Precio lista (CLP)
                    <input
                      name="precioListaClp"
                      inputMode="numeric"
                      defaultValue={producto.precioListaClp ?? ""}
                      placeholder="1099990"
                      className={input}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Vigente hasta
                    <input
                      type="date"
                      name="precioVigenteHasta"
                      defaultValue={producto.precioVigenteHasta ?? ""}
                      className={input}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Sin fecha de vigencia el asistente no cita el precio: deriva
                  al jefe de tienda. Deja ambos campos vacíos para retirarlo.
                </p>
                <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                  Guardar precio
                </button>
              </form>
            </details>
          </section>

          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <details>
              <summary className="cursor-pointer list-none text-sm font-semibold text-blue-700">
                Editar datos generales
              </summary>
              <form action={editarProductoAction} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={producto.id} />
                <label className="block text-sm font-medium text-slate-700">
                  Modelo
                  <input
                    name="modelo"
                    defaultValue={producto.modelo}
                    required
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Cómo lo llaman en piso{" "}
                  <span className="text-slate-400">(comas)</span>
                  <input
                    name="aliases"
                    defaultValue={producto.aliases.join(", ")}
                    className={input}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Categoría
                    <select
                      name="categoria"
                      defaultValue={producto.categoria}
                      className={input}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {ETIQUETAS_CATEGORIA[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Gama
                    <select name="gama" defaultValue={producto.gama} className={input}>
                      {GAMAS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Estado
                  <select
                    name="estado"
                    defaultValue={producto.estado}
                    className={input}
                  >
                    {ESTADOS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Almacenamientos <span className="text-slate-400">(comas)</span>
                  <input
                    name="almacenamientos"
                    defaultValue={producto.almacenamientos.join(", ")}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Colores <span className="text-slate-400">(comas)</span>
                  <input
                    name="colores"
                    defaultValue={producto.colores.join(", ")}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Resumen de venta
                  <textarea
                    name="resumenVenta"
                    rows={3}
                    defaultValue={producto.resumenVenta ?? ""}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  URL de la fuente
                  <input
                    name="fuenteUrl"
                    defaultValue={producto.fuenteUrl ?? ""}
                    className={input}
                  />
                </label>
                <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                  Guardar cambios
                </button>
              </form>
            </details>
          </section>

          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <details>
              <summary className="cursor-pointer list-none text-sm font-semibold text-blue-700">
                Especificaciones ({specs.length})
              </summary>

              <ul className="mt-3 space-y-2">
                {specs.map((s) => (
                  <li key={s.id} className="rounded-xl bg-slate-50 p-3">
                    <details>
                      <summary className="cursor-pointer list-none text-sm text-slate-700">
                        {lineaSpec(s)}
                      </summary>
                      <form
                        action={guardarEspecificacionAction}
                        className="mt-2 space-y-2"
                      >
                        <input type="hidden" name="productoId" value={producto.id} />
                        <input type="hidden" name="especificacionId" value={s.id} />
                        <div className="grid grid-cols-2 gap-2">
                          <select name="grupo" defaultValue={s.grupo} className={input}>
                            {GRUPOS.map((g) => (
                              <option key={g} value={g}>
                                {ETIQUETAS_GRUPO[g]}
                              </option>
                            ))}
                          </select>
                          <input
                            name="clave"
                            defaultValue={s.clave}
                            required
                            className={input}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            name="valor"
                            defaultValue={s.valor}
                            required
                            className={input}
                          />
                          <input
                            name="unidad"
                            defaultValue={s.unidad ?? ""}
                            placeholder="Unidad"
                            className={input}
                          />
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              name="esDiferenciador"
                              defaultChecked={s.esDiferenciador}
                            />
                            Es diferenciador
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              name="verificado"
                              defaultChecked={s.verificado}
                            />
                            Verificado
                          </label>
                        </div>
                        <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                          Guardar
                        </button>
                      </form>
                      <form action={eliminarEspecificacionAction} className="mt-2">
                        <input type="hidden" name="productoId" value={producto.id} />
                        <input type="hidden" name="especificacionId" value={s.id} />
                        <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>

              <form
                action={guardarEspecificacionAction}
                className="mt-4 space-y-2 border-t border-slate-100 pt-3"
              >
                <p className="text-xs font-semibold text-slate-600">
                  Agregar especificación
                </p>
                <input type="hidden" name="productoId" value={producto.id} />
                <div className="grid grid-cols-2 gap-2">
                  <select name="grupo" className={input}>
                    {GRUPOS.map((g) => (
                      <option key={g} value={g}>
                        {ETIQUETAS_GRUPO[g]}
                      </option>
                    ))}
                  </select>
                  <input
                    name="clave"
                    required
                    placeholder="Capacidad"
                    className={input}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input name="valor" required placeholder="5000" className={input} />
                  <input name="unidad" placeholder="mAh" className={input} />
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="esDiferenciador" /> Es
                    diferenciador
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="verificado" /> Verificado
                  </label>
                </div>
                <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  Agregar
                </button>
              </form>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
