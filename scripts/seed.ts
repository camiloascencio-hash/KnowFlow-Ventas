/** Deterministic investor-demo seed. It is intentionally destructive and guarded. */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import * as schema from "../src/db/schema";
import { chunkMarkdown } from "../src/lib/chunking";
import { embedPassageBatch, embedQueryBatch } from "../src/lib/embeddings";
import { consultasSeed, unidadesSeed } from "./seed-data";

const ARGON_OPTIONS = { algorithm: 2, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 };

/** Unidad publicada que se usa como base del contraste manual vs. realidad. */
const UNIDAD_CONTRASTE = "Plan Canje: retoma del equipo usado";

const contrasteDemo = [
  { tipo: "conocimiento_no_documentado" as const, descripcion: "Los vendedores verifican el bloqueo de cuenta ANTES de evaluar el estado físico, pero el manual lo pide después.", evidenciaManual: "Verifica que no tenga bloqueo de cuenta", evidenciaOperacion: "Lo primero que preguntamos es la clave de la cuenta: si no la tiene, no seguimos y no perdemos 15 minutos revisando el equipo.", riesgo: "Perder tiempo de piso de venta y frustrar al cliente con un canje que se va a rechazar.", recomendacion: "Mover la verificación de cuenta al paso 1 del procedimiento." },
  { tipo: "atajo_riesgoso" as const, descripcion: "Se reporta estimar el monto de canje de memoria para apurar el cierre.", evidenciaManual: "El monto de canje siempre se consulta en el sistema", evidenciaOperacion: "Cuando hay mucha gente uno ya sabe más o menos cuánto dan por cada modelo y lo dice al tiro.", riesgo: "Si el sistema muestra menos, el cliente se siente engañado y se cae la venta completa.", recomendacion: "Reforzar que el monto se muestra en pantalla al cliente, nunca de memoria." },
  { tipo: "manual_desactualizado" as const, descripcion: "El manual menciona un formulario en papel que ya no se usa en tienda.", evidenciaManual: "firma el formulario de recepción", evidenciaOperacion: "Ya no hay formulario en papel: la recepción del equipo queda registrada en el sistema con la firma digital del cliente.", riesgo: "Entregar instrucciones que no se pueden seguir y generar dudas sobre el respaldo del canje.", recomendacion: "Actualizar el paso al registro digital vigente." },
  { tipo: "error_tipico_novato" as const, descripcion: "Los vendedores nuevos borran el equipo antiguo antes de confirmar que el traspaso terminó.", evidenciaManual: "Respalda y borra los datos del equipo usado", evidenciaOperacion: "El error más repetido de los nuevos es resetear el equipo viejo apenas empieza el traspaso, y después faltan fotos.", riesgo: "Pérdida irreversible de datos del cliente y reclamo formal.", recomendacion: "Destacar como paso obligatorio: confirmar el traspaso con el cliente ANTES de borrar." },
];

function assertDemoReset() {
  if (process.env.APP_MODE !== "investor_demo") throw new Error("demo:reset se niega a ejecutarse fuera de APP_MODE=investor_demo.");
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") throw new Error("Define ALLOW_DESTRUCTIVE_SEED=true para confirmar el reseteo destructivo.");
}

async function main() {
  assertDemoReset();
  const client = postgres(process.env.DATABASE_URL ?? "postgres://knowflow:knowflow@localhost:5432/knowflow", { max: 1 });
  const db = drizzle(client, { schema });
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    await db.execute(sql`TRUNCATE divergencias, contrastes, fuentes_conocimiento, brechas, consultas, chunks, unidades_conocimiento, usuarios, cargos RESTART IDENTITY CASCADE`);
    const [cargo] = await db.insert(schema.cargos).values({ nombre: "Vendedor de tecnología Samsung", descripcion: "DATOS SINTÉTICOS — venta asistida de smartphones, tablets y wearables en tiendas de retail en Chile." }).returning();
    const passwordHash = await hash("demo123", ARGON_OPTIONS);
    const [vendedor, experto, validador] = await db.insert(schema.usuarios).values([
      { nombre: "Matías Herrera", email: "vendedor@knowflow.cl", passwordHash, rol: "trabajador_nuevo", cargoId: cargo.id },
      { nombre: "Daniela Cortés", email: "experto@knowflow.cl", passwordHash, rol: "experto", cargoId: cargo.id },
      { nombre: "Rodrigo Salas", email: "validador@knowflow.cl", passwordHash, rol: "validador", cargoId: cargo.id },
      { nombre: "Fernanda Lagos", email: "admin@knowflow.cl", passwordHash, rol: "admin", cargoId: cargo.id },
    ]).returning();
    const unidadIdPorTitulo = new Map<string, number>(); const filasChunks: { unidadId: number; texto: string }[] = [];
    for (const unidadSeed of unidadesSeed) {
      const publicada = unidadSeed.estado === "publicado";
      const [unidad] = await db.insert(schema.unidadesConocimiento).values({ cargoId: cargo.id, tipo: unidadSeed.tipo, titulo: unidadSeed.titulo, contenidoMarkdown: unidadSeed.contenidoMarkdown, criticidad: unidadSeed.criticidad, estado: unidadSeed.estado, autorExpertoId: experto.id, validadorId: publicada ? validador.id : null, fechaPublicacion: publicada ? new Date(Date.now() - 30 * 86_400_000) : null, version: 1 }).returning();
      unidadIdPorTitulo.set(unidad.titulo, unidad.id);
      if (publicada) filasChunks.push(...chunkMarkdown(unidad.titulo, unidad.contenidoMarkdown).map((texto) => ({ unidadId: unidad.id, texto })));
    }
    const embeddingsChunks = await embedPassageBatch(filasChunks.map((fila) => fila.texto));
    if (filasChunks.length) await db.insert(schema.chunks).values(filasChunks.map((fila, index) => ({ ...fila, embedding: embeddingsChunks[index] })));
    const embeddingsConsultas = await embedQueryBatch(consultasSeed.map((consulta) => consulta.textoPregunta));
    for (const [index, consulta] of consultasSeed.entries()) await db.insert(schema.consultas).values({ usuarioId: vendedor.id, cargoId: cargo.id, textoPregunta: consulta.textoPregunta, respuesta: consulta.resuelta ? `${consulta.respuestaResumen}\n\nFuente: ${consulta.unidadTitulo}` : "No tengo información validada sobre eso. Consulta a tu jefe de tienda antes de comprometer algo con el cliente.", chunksUsados: [], resuelta: consulta.resuelta, escalada: consulta.escalada, rating: consulta.rating, embedding: embeddingsConsultas[index], timestamp: new Date(Date.now() - consulta.diasAtras * 86_400_000) });
    await db.insert(schema.brechas).values({ cargoId: cargo.id, temaDetectado: "Seguro de pantalla y garantía extendida: qué cubre y cómo se vende", nConsultasSinResolver: 4, estado: "detectada" });
    const origenId = unidadIdPorTitulo.get(UNIDAD_CONTRASTE);
    if (!origenId) throw new Error("No se encontró la unidad de contraste del demo.");
    await db.insert(schema.fuentesConocimiento).values([
      { cargoId: cargo.id, tipo: "manual", titulo: `Manual oficial — ${UNIDAD_CONTRASTE}`, contenido: unidadesSeed.find((unidad) => unidad.titulo === UNIDAD_CONTRASTE)!.contenidoMarkdown, autorId: experto.id },
      { cargoId: cargo.id, tipo: "relato_experto", titulo: "Relato de vendedora senior (sintético)", contenido: "Lo primero que preguntamos es la clave de la cuenta: si no la tiene, no seguimos y no perdemos 15 minutos revisando el equipo. Cuando hay mucha gente uno ya sabe más o menos cuánto dan por cada modelo y lo dice al tiro. Ya no hay formulario en papel: la recepción del equipo queda registrada en el sistema con la firma digital del cliente.", autorId: experto.id },
      { cargoId: cargo.id, tipo: "errores_operacionales", titulo: "Errores frecuentes observados (sintéticos)", contenido: "El error más repetido de los nuevos es resetear el equipo viejo apenas empieza el traspaso, y después faltan fotos.", autorId: experto.id },
    ]);
    const [contraste] = await db.insert(schema.contrastes).values({ cargoId: cargo.id, titulo: UNIDAD_CONTRASTE, unidadOrigenId: origenId, estado: "completado", resumen: "4 divergencias sintéticas trazables para demostración." }).returning();
    await db.insert(schema.divergencias).values(contrasteDemo.map((divergencia) => ({ contrasteId: contraste.id, ...divergencia })));
    console.log("Demo de ventas reiniciada: 4 usuarios, conocimiento comercial, contraste completado y brecha sintética.");
  } finally { await client.end(); }
}

main().catch((error) => { console.error("Error en demo:reset:", error); process.exit(1); });
