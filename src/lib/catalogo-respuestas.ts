/**
 * Cómo se le muestra el catálogo al vendedor y al agente.
 *
 * Todo lo de aquí es determinista: mismo dato, misma frase. Es lo que permite
 * que el camino rápido conteste sin pasar por un modelo (y sin poder inventar).
 * Nada se renderiza como tabla markdown a propósito: las respuestas se leen en
 * voz alta en piso de venta y una tabla suena pésimo.
 */
import type { Especificacion, Producto, TerminoGlosario } from "@/db/schema";
import {
  ETIQUETAS_GRUPO,
  type FichaTecnica,
  type FilaComparacion,
  type PrecioResuelto,
  formatearFecha,
} from "@/lib/catalogo";

/** "Capacidad: 5000 mAh" */
export function lineaSpec(spec: Especificacion): string {
  const valor = spec.unidad ? `${spec.valor} ${spec.unidad}` : spec.valor;
  return `${spec.clave}: ${valor}`;
}

export function etiquetaFicha(producto: Pick<Producto, "modelo">): string {
  return `Ficha oficial — ${producto.modelo}`;
}

function avisoEstado(producto: Producto): string | null {
  if (producto.estado === "proximo_lanzamiento") {
    const fecha = producto.fechaLanzamiento
      ? ` (a la venta desde el ${formatearFecha(producto.fechaLanzamiento)})`
      : "";
    return `Aún no está en tienda${fecha}: no comprometas fecha de entrega.`;
  }
  if (producto.estado === "descontinuado") {
    return "Producto descontinuado: confirma stock antes de ofrecerlo.";
  }
  return null;
}

/** Respuesta de ficha, lista para el vendedor. */
export function renderFicha(
  ficha: FichaTecnica,
  opciones: { incluirPrecio: boolean }
): string {
  const { producto, especificaciones, precio } = ficha;
  const partes: string[] = [`**${producto.modelo}**`];

  const porGrupo = new Map<string, Especificacion[]>();
  for (const s of especificaciones) {
    porGrupo.set(s.grupo, [...(porGrupo.get(s.grupo) ?? []), s]);
  }

  for (const [grupo, specs] of porGrupo) {
    partes.push(
      `\n**${ETIQUETAS_GRUPO[grupo as keyof typeof ETIQUETAS_GRUPO] ?? grupo}**\n` +
        specs
          .map((s) => `- ${lineaSpec(s)}${s.esDiferenciador ? " ⭐" : ""}`)
          .join("\n")
    );
  }

  if (opciones.incluirPrecio) partes.push(`\n**Precio:** ${precio.texto}`);

  const sinVerificar = especificaciones.filter((s) => !s.verificado);
  if (sinVerificar.length > 0) {
    partes.push(
      `\n⚠ Sin verificar: ${sinVerificar
        .map((s) => s.clave)
        .join(", ")}. Confírmalo antes de comprometerlo con el cliente.`
    );
  }

  const aviso = avisoEstado(producto);
  if (aviso) partes.push(`\n⚠ ${aviso}`);

  return partes.join("\n");
}

/** Respuesta de comparativa: primero las diferencias, que es lo que se vende. */
export function renderComparacion(
  productoA: Producto,
  productoB: Producto,
  filas: FilaComparacion[],
  precios?: { a: PrecioResuelto; b: PrecioResuelto }
): string {
  const distintas = filas.filter((f) => !f.iguales);
  const iguales = filas.filter((f) => f.iguales);
  const partes: string[] = [`**${productoA.modelo} vs ${productoB.modelo}**`];

  if (distintas.length === 0) {
    partes.push(
      "\nEn los datos cargados no hay diferencias entre ambos. Si el cliente pregunta por algo puntual, confírmalo con tu jefe de tienda."
    );
  } else {
    // Los diferenciadores son los argumentos de venta: van arriba.
    const ordenadas = [
      ...distintas.filter((f) => f.esDiferenciador),
      ...distintas.filter((f) => !f.esDiferenciador),
    ];
    partes.push("\n**Diferencias**");
    for (const f of ordenadas) {
      const a = f.valorA ?? "no informado";
      const b = f.valorB ?? "no informado";
      partes.push(
        `- ${f.clave}${f.esDiferenciador ? " ⭐" : ""} → ${productoA.modelo}: ${a} · ${productoB.modelo}: ${b}`
      );
    }
  }

  if (iguales.length > 0) {
    partes.push(
      `\n**Iguales en:** ${iguales.map((f) => `${f.clave} (${f.valorA})`).join(", ")}`
    );
  }

  if (precios) {
    partes.push(
      `\n**Precio ${productoA.modelo}:** ${precios.a.texto}\n\n**Precio ${productoB.modelo}:** ${precios.b.texto}`
    );
  }

  const faltantes = filas.filter((f) => f.valorA === null || f.valorB === null);
  if (faltantes.length > 0) {
    partes.push(
      `\n⚠ Hay atributos que solo están cargados en uno de los dos equipos. "No informado" NO significa que el otro no lo tenga: confírmalo antes de afirmarlo.`
    );
  }

  return partes.join("\n");
}

/** Respuesta de glosario: prioriza la traducción de venta, nunca la técnica. */
export function renderTecnicismo(t: TerminoGlosario): string {
  return [
    `**${t.termino}**`,
    `\n${t.traduccionVenta}`,
    `\n**Para qué le sirve al cliente:** ${t.beneficioCliente}`,
    `\n⚠ **No digas:** ${t.erroresComunes}`,
  ].join("\n");
}

/** Versión compacta para el contexto del agente (no la ve el vendedor). */
export function fichaParaAgente(ficha: FichaTecnica): string {
  const { producto, especificaciones, precio } = ficha;
  const specs = especificaciones
    .map(
      (s) =>
        `- [${s.grupo}] ${lineaSpec(s)}${s.esDiferenciador ? " (DIFERENCIADOR)" : ""}${
          s.verificado ? "" : " (SIN VERIFICAR)"
        }`
    )
    .join("\n");

  return [
    `FICHA OFICIAL — ${producto.modelo} (${producto.categoria}, gama ${producto.gama}, estado: ${producto.estado})`,
    producto.resumenVenta ? `Resumen de venta: ${producto.resumenVenta}` : "",
    producto.almacenamientos.length
      ? `Almacenamientos: ${producto.almacenamientos.join(" / ")}`
      : "",
    producto.colores.length ? `Colores: ${producto.colores.join(", ")}` : "",
    specs || "(sin especificaciones cargadas)",
    // El precio entra YA RESUELTO por la regla del código: si no es citable,
    // el modelo nunca ve el número y por lo tanto no puede decirlo.
    `PRECIO: ${precio.texto}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function tecnicismoParaAgente(t: TerminoGlosario): string {
  return [
    `GLOSARIO — ${t.termino}`,
    `Definición técnica: ${t.definicionTecnica}`,
    `Traducción de venta (PRIORIZA ESTA): ${t.traduccionVenta}`,
    `Beneficio para el cliente: ${t.beneficioCliente}`,
    `ERRORES COMUNES (nunca los contradigas): ${t.erroresComunes}`,
  ].join("\n");
}

export function candidatosParaAgente(candidatos: Producto[]): string {
  return `El modelo no es único. Candidatos: ${candidatos
    .map((c) => c.modelo)
    .join(
      ", "
    )}. Repregunta al vendedor cuál es antes de responder; no elijas por él.`;
}
