/**
 * Etapa 5 del ciclo: aprendizaje continuo.
 *
 * Detección automática de brechas: cuando ≥3 consultas en los últimos 7 días
 * no se resuelven o reciben rating negativo sobre un mismo tema, se registra
 * una brecha. Los temas se agrupan por similitud coseno de los embeddings de
 * las preguntas (mismo modelo local del RAG).
 */
import { and, eq, gte, isNotNull, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { cosineSimilarity } from "@/lib/embeddings";

/** Mínimo de consultas problemáticas sobre un mismo tema para declarar brecha. */
const MIN_CONSULTAS = 3;
/** Ventana de detección en días. */
const VENTANA_DIAS = 7;
/** Similitud mínima entre preguntas para considerarlas el mismo tema. */
const UMBRAL_TEMA = Number(process.env.BRECHA_SIMILARITY_THRESHOLD ?? 0.7);

type ItemConsulta = {
  id: number;
  texto: string;
  embedding: number[];
};

export type Cluster = {
  representante: ItemConsulta;
  items: ItemConsulta[];
};

/**
 * Agrupación greedy por similitud: cada consulta se une al primer cluster
 * cuyo representante supere el umbral, o crea uno nuevo.
 */
export function agruparPorSimilitud(
  items: ItemConsulta[],
  umbral: number
): Cluster[] {
  const clusters: Cluster[] = [];
  for (const item of items) {
    let mejor: Cluster | null = null;
    let mejorSim = umbral;
    for (const cluster of clusters) {
      const sim = cosineSimilarity(item.embedding, cluster.representante.embedding);
      if (sim >= mejorSim) {
        mejor = cluster;
        mejorSim = sim;
      }
    }
    if (mejor) {
      mejor.items.push(item);
    } else {
      clusters.push({ representante: item, items: [item] });
    }
  }
  return clusters;
}

/**
 * Ejecuta la detección para un cargo. Idempotente: si el tema ya tiene una
 * brecha activa (no resuelta), actualiza el conteo en vez de duplicarla.
 * Devuelve cuántas brechas nuevas se crearon.
 */
export async function detectarBrechas(cargoId: number): Promise<number> {
  const desde = new Date(Date.now() - VENTANA_DIAS * 24 * 3600 * 1000);

  const problematicas = await db
    .select({
      id: schema.consultas.id,
      texto: schema.consultas.textoPregunta,
      embedding: schema.consultas.embedding,
    })
    .from(schema.consultas)
    .where(
      and(
        eq(schema.consultas.cargoId, cargoId),
        gte(schema.consultas.timestamp, desde),
        isNotNull(schema.consultas.embedding),
        or(
          eq(schema.consultas.resuelta, false),
          eq(schema.consultas.rating, "down")
        )
      )
    );

  const clusters = agruparPorSimilitud(
    problematicas.filter((c): c is ItemConsulta => c.embedding !== null),
    UMBRAL_TEMA
  );

  const brechasActivas = await db
    .select()
    .from(schema.brechas)
    .where(
      and(
        eq(schema.brechas.cargoId, cargoId),
        ne(schema.brechas.estado, "resuelta"),
        isNotNull(schema.brechas.embedding)
      )
    );

  let nuevas = 0;
  for (const cluster of clusters) {
    if (cluster.items.length < MIN_CONSULTAS) continue;

    // Tema = la pregunta más corta del cluster (suele ser la más general)
    const tema = cluster.items.reduce((a, b) =>
      b.texto.length < a.texto.length ? b : a
    ).texto;

    const existente = brechasActivas.find(
      (b) =>
        b.embedding &&
        cosineSimilarity(b.embedding, cluster.representante.embedding) >=
          UMBRAL_TEMA
    );

    if (existente) {
      await db
        .update(schema.brechas)
        .set({ nConsultasSinResolver: cluster.items.length })
        .where(eq(schema.brechas.id, existente.id));
    } else {
      await db.insert(schema.brechas).values({
        cargoId,
        temaDetectado: tema,
        nConsultasSinResolver: cluster.items.length,
        estado: "detectada",
        embedding: cluster.representante.embedding,
      });
      nuevas++;
    }
  }
  return nuevas;
}

/** Agrupa TODAS las consultas recientes por tema para el "top consultados". */
export async function topTemasConsultados(
  cargoId: number,
  dias = 30,
  top = 10
): Promise<{ tema: string; consultas: number; sinCobertura: number }[]> {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const todas = await db
    .select({
      id: schema.consultas.id,
      texto: schema.consultas.textoPregunta,
      embedding: schema.consultas.embedding,
      resuelta: schema.consultas.resuelta,
    })
    .from(schema.consultas)
    .where(
      and(
        eq(schema.consultas.cargoId, cargoId),
        gte(schema.consultas.timestamp, desde),
        isNotNull(schema.consultas.embedding)
      )
    );

  const resueltaPorId = new Map(todas.map((c) => [c.id, c.resuelta]));
  const clusters = agruparPorSimilitud(
    todas.filter((c): c is ItemConsulta & { resuelta: boolean } => c.embedding !== null),
    // Umbral algo más laxo: agrupa variantes de la misma duda
    0.6
  );

  return clusters
    .map((c) => ({
      tema: c.items.reduce((a, b) => (b.texto.length < a.texto.length ? b : a))
        .texto,
      consultas: c.items.length,
      sinCobertura: c.items.filter((i) => !resueltaPorId.get(i.id)).length,
    }))
    .sort((a, b) => b.consultas - a.consultas)
    .slice(0, top);
}

/** Métricas agregadas del dashboard (nunca individuales). */
export async function metricasAgregadas(cargoId: number) {
  const [fila] = await db.execute<{
    total: string;
    resueltas_sin_escalar: string;
    con_rating: string;
    rating_up: string;
  }>(sql`
    SELECT
      count(*)::text AS total,
      count(*) FILTER (WHERE resuelta AND NOT escalada)::text AS resueltas_sin_escalar,
      count(*) FILTER (WHERE rating IS NOT NULL)::text AS con_rating,
      count(*) FILTER (WHERE rating = 'up')::text AS rating_up
    FROM consultas
    WHERE cargo_id = ${cargoId}
  `);

  const total = Number(fila.total);
  const tre = total > 0 ? Number(fila.resueltas_sin_escalar) / total : null;
  const conRating = Number(fila.con_rating);
  const upi = conRating > 0 ? Number(fila.rating_up) / conRating : null;

  const porSemana = await db.execute<{ semana: string; n: string }>(sql`
    SELECT to_char(date_trunc('week', timestamp), 'DD Mon') AS semana,
           count(*)::text AS n
    FROM consultas
    WHERE cargo_id = ${cargoId}
      AND timestamp >= now() - interval '8 weeks'
    GROUP BY date_trunc('week', timestamp)
    ORDER BY date_trunc('week', timestamp)
  `);

  return {
    totalConsultas: total,
    tre,
    upi,
    porSemana: porSemana.map((r) => ({ semana: r.semana, n: Number(r.n) })),
  };
}

export const SLA_HORAS = 72;
