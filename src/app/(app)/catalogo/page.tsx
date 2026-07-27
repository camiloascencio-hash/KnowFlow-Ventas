import Link from "next/link";
import { asc } from "drizzle-orm";
import { GitCompareArrows, Plus, Smartphone } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import Aviso from "@/components/Aviso";
import { ETIQUETAS_CATEGORIA, verificacionVencida } from "@/lib/catalogo";
import type { CategoriaProducto, Gama } from "@/db/schema";
import { crearProductoAction } from "@/app/actions/catalogo";
import { EstadoProductoBadge, GamaBadge } from "@/components/BadgesCatalogo";

export const dynamic = "force-dynamic";

const CATEGORIAS = Object.keys(ETIQUETAS_CATEGORIA) as CategoriaProducto[];
const GAMAS: Gama[] = ["alta", "media", "entrada"];

/** Chip de filtro: conserva el resto de los filtros activos. */
function Filtro({
  activo,
  href,
  children,
}: {
  activo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
        activo
          ? "bg-blue-600 text-white ring-blue-600"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Catálogo de producto: el dato duro que el asistente responde de forma
 * exacta. El vendedor lo consulta; el experto lo mantiene.
 */
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    gama?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const session = await requireRole();
  const { categoria, gama, ok, error } = await searchParams;
  const puedeEditar =
    session.user.rol === "experto" || session.user.rol === "admin";

  const todos = await db
    .select()
    .from(schema.productos)
    .orderBy(asc(schema.productos.categoria), asc(schema.productos.modelo));

  const productos = todos.filter(
    (p) =>
      (!categoria || p.categoria === categoria) && (!gama || p.gama === gama)
  );

  const qs = (cambios: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { categoria, gama, ...cambios };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/catalogo?${s}` : "/catalogo";
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Catálogo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Datos duros y verificados. Si algo no está aquí, no lo prometas:
            confírmalo con tu jefe de tienda.
          </p>
        </div>
        <Link
          href="/catalogo/comparar"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <GitCompareArrows size={15} />
          Comparar
        </Link>
      </div>

      <Aviso ok={ok} error={error} />

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Filtro activo={!categoria} href={qs({ categoria: undefined })}>
            Todas
          </Filtro>
          {CATEGORIAS.map((c) => (
            <Filtro key={c} activo={categoria === c} href={qs({ categoria: c })}>
              {ETIQUETAS_CATEGORIA[c]}
            </Filtro>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Filtro activo={!gama} href={qs({ gama: undefined })}>
            Toda gama
          </Filtro>
          {GAMAS.map((g) => (
            <Filtro key={g} activo={gama === g} href={qs({ gama: g })}>
              Gama {g}
            </Filtro>
          ))}
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {productos.map((p) => (
          <li key={p.id}>
            <Link
              href={`/catalogo/${p.id}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold leading-snug">{p.modelo}</h2>
                  <p className="text-xs text-slate-400">
                    {p.marca} · {ETIQUETAS_CATEGORIA[p.categoria]}
                  </p>
                </div>
                <Smartphone size={16} className="shrink-0 text-slate-300" />
              </div>
              {p.resumenVenta && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {p.resumenVenta}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <GamaBadge gama={p.gama} />
                <EstadoProductoBadge estado={p.estado} />
                {verificacionVencida(p.verificadoEn) && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    Sin verificar
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
        {productos.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            No hay productos con esos filtros.
          </li>
        )}
      </ul>

      {puedeEditar && (
        <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <details>
            <summary className="cursor-pointer list-none text-sm font-semibold text-blue-700">
              <span className="inline-flex items-center gap-1.5">
                <Plus size={15} /> Nueva ficha de producto
              </span>
            </summary>
            <form action={crearProductoAction} className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Modelo
                <input
                  name="modelo"
                  required
                  minLength={2}
                  placeholder="Ej: Galaxy S27 Ultra"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Cómo lo llaman en piso{" "}
                <span className="text-slate-400">(separado por comas)</span>
                <input
                  name="aliases"
                  placeholder="s27 ultra, s27u, el ultra"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Categoría
                  <select
                    name="categoria"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
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
                  <select
                    name="gama"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    {GAMAS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Resumen de venta
                <textarea
                  name="resumenVenta"
                  rows={2}
                  placeholder="Para quién es y por qué se elige."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Crear ficha
              </button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
