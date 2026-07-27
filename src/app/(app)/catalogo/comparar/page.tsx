import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { requireRole } from "@/lib/session";
import {
  ETIQUETAS_GRUPO,
  compararProductos,
  listarProductos,
} from "@/lib/catalogo";

export const dynamic = "force-dynamic";

/**
 * Comparador de dos productos. Es la herramienta real de piso de venta: el
 * cliente casi nunca pregunta "cómo es este", pregunta "cuál de los dos".
 */
export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  await requireRole();
  const { a, b } = await searchParams;

  const productos = await listarProductos();
  const idA = Number(a) || null;
  const idB = Number(b) || null;
  const productoA = productos.find((p) => p.id === idA);
  const productoB = productos.find((p) => p.id === idB);

  const comparacion =
    productoA && productoB && productoA.id !== productoB.id
      ? await compararProductos(productoA.modelo, productoB.modelo)
      : null;

  const filas =
    comparacion?.tipo === "comparacion" ? comparacion.filas : [];
  const distintas = filas.filter((f) => !f.iguales);
  const iguales = filas.filter((f) => f.iguales);
  const ordenadas = [
    ...distintas.filter((f) => f.esDiferenciador),
    ...distintas.filter((f) => !f.esDiferenciador),
  ];

  const select =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500";

  return (
    <div>
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} /> Catálogo
      </Link>

      <h1 className="mt-2 text-xl font-bold">Comparar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Elige dos equipos y muéstrale al cliente la diferencia concreta.
      </p>

      {/* GET: la comparación queda en la URL y se puede compartir entre
          vendedores por WhatsApp, que es como circula todo en la tienda. */}
      <form method="GET" className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Equipo A
          <select name="a" defaultValue={a ?? ""} className={select}>
            <option value="">Elegir…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.modelo}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Equipo B
          <select name="b" defaultValue={b ?? ""} className={select}>
            <option value="">Elegir…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.modelo}
              </option>
            ))}
          </select>
        </label>
        <button className="col-span-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          Comparar
        </button>
      </form>

      {productoA && productoB && productoA.id === productoB.id && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          Elige dos equipos distintos.
        </p>
      )}

      {comparacion?.tipo === "comparacion" && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3">
            {[comparacion.productoA, comparacion.productoB].map((p, i) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
              >
                <Link
                  href={`/catalogo/${p.id}`}
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  {p.modelo}
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {(i === 0 ? comparacion.precioA : comparacion.precioB).texto}
                </p>
              </div>
            ))}
          </div>

          {ordenadas.length > 0 && (
            <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">
                Diferencias
              </h2>
              <ul className="mt-2 divide-y divide-slate-100">
                {ordenadas.map((f) => (
                  <li key={f.clave} className="py-2.5">
                    <p className="text-xs font-medium text-slate-500">
                      {f.clave}
                      {f.esDiferenciador && (
                        <Star size={11} className="ml-1 inline text-indigo-500" />
                      )}
                      <span className="ml-1 text-slate-300">
                        · {ETIQUETAS_GRUPO[f.grupo]}
                      </span>
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-3">
                      <p
                        className={`text-sm ${
                          f.valorA ? "text-slate-800" : "italic text-slate-400"
                        }`}
                      >
                        {f.valorA ?? "no informado"}
                      </p>
                      <p
                        className={`text-sm ${
                          f.valorB ? "text-slate-800" : "italic text-slate-400"
                        }`}
                      >
                        {f.valorB ?? "no informado"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {ordenadas.some((f) => !f.valorA || !f.valorB) && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  ⚠ &quot;No informado&quot; significa que el dato no está
                  cargado, NO que el equipo no lo tenga. Confírmalo antes de
                  afirmárselo al cliente.
                </p>
              )}
            </section>
          )}

          {iguales.length > 0 && (
            <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">
                Iguales en
              </h2>
              <ul className="mt-2 space-y-1">
                {iguales.map((f) => (
                  <li key={f.clave} className="text-sm text-slate-600">
                    {f.clave}: {f.valorA}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filas.length === 0 && (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              Ninguno de los dos tiene especificaciones cargadas todavía.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
