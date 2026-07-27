/**
 * Test del flujo de gobernanza (etapa 3):
 * borrador → en_validacion → publicado genera chunks + embeddings,
 * y el rechazo devuelve la unidad a borrador con comentario.
 *
 * Requiere la base de datos de docker-compose corriendo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import {
  enviarAValidacion,
  publicarUnidad,
  rechazarUnidad,
} from "@/lib/unidades";
import { EMBEDDING_DIM } from "@/db/schema";

let cargoId: number;
let expertoId: number;
let validadorId: number;
const unidadesCreadas: number[] = [];

async function crearBorrador(titulo: string): Promise<number> {
  const [u] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId,
      tipo: "procedimiento",
      titulo,
      contenidoMarkdown:
        "## Cuándo aplica\n\nCaso de prueba.\n\n## Pasos\n\n1. Primer paso del procedimiento.\n2. Segundo paso del procedimiento.",
      criticidad: "media",
      estado: "borrador",
      autorExpertoId: expertoId,
    })
    .returning();
  unidadesCreadas.push(u.id);
  return u.id;
}

beforeAll(async () => {
  const [cargo] = await db
    .insert(schema.cargos)
    .values({ nombre: "Cargo de prueba (test validación)" })
    .returning();
  cargoId = cargo.id;

  const usuarios = await db
    .insert(schema.usuarios)
    .values([
      {
        nombre: "Experto Test",
        email: `experto-test-${Date.now()}@test.cl`,
        passwordHash: "x",
        rol: "experto",
        cargoId,
      },
      {
        nombre: "Validador Test",
        email: `validador-test-${Date.now()}@test.cl`,
        passwordHash: "x",
        rol: "validador",
        cargoId,
      },
    ])
    .returning();
  expertoId = usuarios[0].id;
  validadorId = usuarios[1].id;
});

afterAll(async () => {
  for (const id of unidadesCreadas) {
    await db
      .delete(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, id));
  }
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, expertoId));
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, validadorId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, cargoId));
  await closeDb();
});

describe("flujo de validación", () => {
  it("un borrador no tiene chunks (no es visible para el agente)", async () => {
    const id = await crearBorrador("Unidad de prueba sin publicar");
    const chunks = await db
      .select()
      .from(schema.chunks)
      .where(eq(schema.chunks.unidadId, id));
    expect(chunks).toHaveLength(0);
  });

  it("borrador → en_validacion → publicado genera chunks con embeddings", async () => {
    const id = await crearBorrador("Unidad de prueba publicable");

    await enviarAValidacion(id);
    let [unidad] = await db
      .select()
      .from(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, id));
    expect(unidad.estado).toBe("en_validacion");

    await publicarUnidad(id, validadorId);
    [unidad] = await db
      .select()
      .from(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, id));

    expect(unidad.estado).toBe("publicado");
    expect(unidad.validadorId).toBe(validadorId);
    expect(unidad.fechaPublicacion).not.toBeNull();

    const chunks = await db
      .select()
      .from(schema.chunks)
      .where(eq(schema.chunks.unidadId, id));
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.embedding).toHaveLength(EMBEDDING_DIM);
      // El texto del chunk lleva el título como prefijo (citabilidad)
      expect(chunk.texto).toContain("Unidad de prueba publicable");
    }
  });

  it("no permite publicar una unidad que no está en validación", async () => {
    const id = await crearBorrador("Unidad que sigue en borrador");
    await expect(publicarUnidad(id, validadorId)).rejects.toThrow(
      /en validación/
    );
  });

  it("rechazar devuelve la unidad a borrador con el comentario del validador", async () => {
    const id = await crearBorrador("Unidad de prueba rechazable");
    await enviarAValidacion(id);
    await rechazarUnidad(id, validadorId, "Falta el caso de pago con tarjeta");

    const [unidad] = await db
      .select()
      .from(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, id));
    expect(unidad.estado).toBe("borrador");
    expect(unidad.comentarioRechazo).toBe("Falta el caso de pago con tarjeta");

    const chunks = await db
      .select()
      .from(schema.chunks)
      .where(eq(schema.chunks.unidadId, id));
    expect(chunks).toHaveLength(0);
  });
});
