/**
 * Test del RAG estricto (etapa 4):
 * - responde SOLO desde conocimiento publicado del cargo
 * - rechaza con la frase estándar cuando no hay match sobre el umbral
 * - los borradores son invisibles para el agente
 * - toda consulta queda registrada con trazabilidad
 *
 * Se fuerza MODO DEMO (sin API key) para que la generación sea determinista;
 * la recuperación vectorial es la real.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import { enviarAValidacion, publicarUnidad } from "@/lib/unidades";

let cargoId: number;
let otroCargoId: number;
let expertoId: number;
let validadorId: number;
let unidadPublicadaId: number;

beforeAll(async () => {
  // Generación determinista sin API (la recuperación no depende de la API)
  delete process.env.ANTHROPIC_API_KEY;

  const cargosCreados = await db
    .insert(schema.cargos)
    .values([
      { nombre: "Operario de bodega (test RAG)" },
      { nombre: "Reponedor (test RAG)" },
    ])
    .returning();
  cargoId = cargosCreados[0].id;
  otroCargoId = cargosCreados[1].id;

  const usuarios = await db
    .insert(schema.usuarios)
    .values([
      {
        nombre: "Experto RAG",
        email: `experto-rag-${Date.now()}@test.cl`,
        passwordHash: "x",
        rol: "experto",
        cargoId,
      },
      {
        nombre: "Validador RAG",
        email: `validador-rag-${Date.now()}@test.cl`,
        passwordHash: "x",
        rol: "validador",
        cargoId,
      },
    ])
    .returning();
  expertoId = usuarios[0].id;
  validadorId = usuarios[1].id;

  // Unidad PUBLICADA del cargo (pasa por el flujo real de publicación)
  const [publicable] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId,
      tipo: "procedimiento",
      titulo: "Carga de gas de la grúa horquilla",
      contenidoMarkdown:
        "## Pasos\n\n1. Estaciona la grúa horquilla en la zona de carga señalizada.\n2. Apaga el motor y pon el freno de mano.\n3. Cierra la válvula del cilindro de gas vacío antes de desconectarlo.\n4. Conecta el cilindro lleno y verifica fugas con agua jabonosa.",
      criticidad: "alta",
      estado: "borrador",
      autorExpertoId: expertoId,
    })
    .returning();
  await enviarAValidacion(publicable.id);
  unidadPublicadaId = await publicarUnidad(publicable.id, validadorId);

  // Unidad en BORRADOR del cargo (debe ser invisible para el agente)
  await db.insert(schema.unidadesConocimiento).values({
    cargoId,
    tipo: "procedimiento",
    titulo: "Bloqueo de ascensor de carga en mantención",
    contenidoMarkdown:
      "## Pasos\n\n1. Coloca el candado de bloqueo en el tablero del ascensor de carga.\n2. Cuelga la tarjeta de mantención.",
    criticidad: "alta",
    estado: "borrador",
    autorExpertoId: expertoId,
  });

  // Unidad PUBLICADA pero de OTRO cargo (no debe filtrarse entre cargos)
  const [ajena] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId: otroCargoId,
      tipo: "procedimiento",
      titulo: "Rotación de productos por fecha de vencimiento",
      contenidoMarkdown:
        "## Pasos\n\n1. Revisa la fecha de vencimiento de cada producto en góndola.\n2. Pon adelante los productos que vencen primero (FIFO).",
      criticidad: "media",
      estado: "borrador",
      autorExpertoId: expertoId,
    })
    .returning();
  await enviarAValidacion(ajena.id);
  await publicarUnidad(ajena.id, validadorId);
});

afterAll(async () => {
  for (const cid of [cargoId, otroCargoId]) {
    await db.delete(schema.consultas).where(eq(schema.consultas.cargoId, cid));
    await db
      .delete(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.cargoId, cid));
  }
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, expertoId));
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, validadorId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, cargoId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, otroCargoId));
  await closeDb();
});

describe("RAG estricto", () => {
  it("responde desde conocimiento publicado, citando la fuente y registrando los chunks usados", async () => {
    const { responderConsulta } = await import("@/lib/rag");
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta: "¿Cómo cambio el cilindro de gas de la grúa horquilla?",
    });

    expect(res.resuelta).toBe(true);
    expect(res.fuentes.map((f) => f.unidadId)).toContain(unidadPublicadaId);
    expect(res.respuesta).toContain("válvula");

    // Trazabilidad: la consulta quedó registrada con los chunks usados
    const [consulta] = await db
      .select()
      .from(schema.consultas)
      .where(eq(schema.consultas.id, res.consultaId));
    expect(consulta.resuelta).toBe(true);
    expect(consulta.chunksUsados.length).toBeGreaterThan(0);
    expect(consulta.embedding).not.toBeNull();
  });

  it("rechaza con la frase estándar cuando la pregunta no tiene cobertura", async () => {
    const { responderConsulta, RESPUESTA_SIN_COBERTURA } = await import(
      "@/lib/rag"
    );
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta: "¿Cómo preparo una declaración de impuestos personales?",
    });

    expect(res.resuelta).toBe(false);
    expect(res.respuesta).toBe(RESPUESTA_SIN_COBERTURA);
    expect(res.fuentes).toHaveLength(0);

    // Queda registrada como NO resuelta (insumo de brechas)
    const [consulta] = await db
      .select()
      .from(schema.consultas)
      .where(eq(schema.consultas.id, res.consultaId));
    expect(consulta.resuelta).toBe(false);
    expect(consulta.chunksUsados).toHaveLength(0);
  });

  it("NO responde desde borradores aunque el contenido coincida", async () => {
    const { responderConsulta, RESPUESTA_SIN_COBERTURA } = await import(
      "@/lib/rag"
    );
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta:
        "¿Dónde pongo el candado de bloqueo del ascensor de carga en mantención?",
    });

    expect(res.resuelta).toBe(false);
    expect(res.respuesta).toBe(RESPUESTA_SIN_COBERTURA);
  });

  it("NO responde con conocimiento publicado de otro cargo", async () => {
    const { responderConsulta, RESPUESTA_SIN_COBERTURA } = await import(
      "@/lib/rag"
    );
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta:
        "¿Cómo roto los productos por fecha de vencimiento en la góndola?",
    });

    expect(res.resuelta).toBe(false);
    expect(res.respuesta).toBe(RESPUESTA_SIN_COBERTURA);
  });
});
