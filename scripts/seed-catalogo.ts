/**
 * Carga el catálogo de producto (fichas técnicas + glosario de tecnicismos).
 *
 * A diferencia de `seed.ts`, este script NO es destructivo: es idempotente y
 * no toca las unidades de conocimiento, los usuarios ni las consultas. Se
 * puede correr las veces que haga falta para refrescar el catálogo sin perder
 * nada de lo que los expertos ya aportaron.
 *
 *   npm run seed:catalogo
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { glosarioSeed, productosSeed } from "./seed-catalogo-data";

const MARCA = "Samsung";

async function main() {
  const client = postgres(
    process.env.DATABASE_URL ??
      "postgres://knowflow:knowflow@localhost:5432/knowflow",
    { max: 1 }
  );
  const db = drizzle(client, { schema });

  try {
    const ahora = new Date();
    let productosNuevos = 0;
    let specsCargadas = 0;

    for (const p of productosSeed) {
      // Upsert por (marca, modelo): la clave natural del catálogo.
      const [existente] = await db
        .select({ id: schema.productos.id })
        .from(schema.productos)
        .where(
          and(
            eq(schema.productos.marca, MARCA),
            eq(schema.productos.modelo, p.modelo)
          )
        )
        .limit(1);

      const valores = {
        marca: MARCA,
        modelo: p.modelo,
        aliases: p.aliases,
        categoria: p.categoria,
        gama: p.gama,
        fechaLanzamiento: p.fechaLanzamiento ?? null,
        fechaLanzamientoChile: p.fechaLanzamientoChile ?? null,
        precioListaClp: p.precioListaClp ?? null,
        precioVigenteHasta: p.precioVigenteHasta ?? null,
        almacenamientos: p.almacenamientos ?? [],
        colores: p.colores ?? [],
        resumenVenta: p.resumenVenta,
        estado: p.estado ?? ("activo" as const),
        fuenteUrl: p.fuenteUrl ?? null,
        verificadoEn: p.verificado ? ahora : null,
        actualizadoEn: ahora,
      };

      let productoId: number;
      if (existente) {
        await db
          .update(schema.productos)
          .set(valores)
          .where(eq(schema.productos.id, existente.id));
        productoId = existente.id;
      } else {
        const [creado] = await db
          .insert(schema.productos)
          .values(valores)
          .returning({ id: schema.productos.id });
        productoId = creado.id;
        productosNuevos++;
      }

      if (p.specs.length === 0) continue;

      // Upsert por (producto, clave): re-correr el seed corrige un valor sin
      // duplicar la fila ni perder el orden de la ficha.
      await db
        .insert(schema.especificaciones)
        .values(
          p.specs.map((s, i) => ({
            productoId,
            grupo: s.grupo,
            clave: s.clave,
            valor: s.valor,
            unidad: s.unidad ?? null,
            esDiferenciador: s.esDiferenciador ?? false,
            ordenVisual: i,
            fuenteUrl: p.fuenteUrl ?? null,
            verificado: s.verificado ?? false,
          }))
        )
        .onConflictDoUpdate({
          target: [
            schema.especificaciones.productoId,
            schema.especificaciones.clave,
          ],
          set: {
            grupo: sql`excluded.grupo`,
            valor: sql`excluded.valor`,
            unidad: sql`excluded.unidad`,
            esDiferenciador: sql`excluded.es_diferenciador`,
            ordenVisual: sql`excluded.orden_visual`,
            fuenteUrl: sql`excluded.fuente_url`,
            verificado: sql`excluded.verificado`,
          },
        });
      specsCargadas += p.specs.length;
    }

    for (const t of glosarioSeed) {
      await db
        .insert(schema.glosarioTecnico)
        .values({
          termino: t.termino,
          aliases: t.aliases,
          categoria: t.categoria ?? null,
          definicionTecnica: t.definicionTecnica,
          traduccionVenta: t.traduccionVenta,
          beneficioCliente: t.beneficioCliente,
          erroresComunes: t.erroresComunes,
          productosRelacionados: t.productosRelacionados ?? [],
        })
        .onConflictDoUpdate({
          target: schema.glosarioTecnico.termino,
          set: {
            aliases: sql`excluded.aliases`,
            categoria: sql`excluded.categoria`,
            definicionTecnica: sql`excluded.definicion_tecnica`,
            traduccionVenta: sql`excluded.traduccion_venta`,
            beneficioCliente: sql`excluded.beneficio_cliente`,
            erroresComunes: sql`excluded.errores_comunes`,
            productosRelacionados: sql`excluded.productos_relacionados`,
          },
        });
    }

    console.log(
      `Catálogo cargado: ${productosSeed.length} productos (${productosNuevos} nuevos), ` +
        `${specsCargadas} especificaciones, ${glosarioSeed.length} términos de glosario.`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
