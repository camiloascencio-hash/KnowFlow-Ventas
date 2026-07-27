/**
 * Ciclo de vida de las unidades de conocimiento (etapa 3: gobernanza).
 *
 * Regla dura del sistema: los chunks con embeddings SOLO se generan al
 * publicar. Nada llega al agente conversacional sin pasar por aquí.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { chunkMarkdown } from "@/lib/chunking";
import { embedPassage } from "@/lib/embeddings";

export async function enviarAValidacion(unidadId: number) {
  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, unidadId));
  if (!unidad) throw new Error("Unidad no encontrada");
  if (unidad.estado !== "borrador") {
    throw new Error("Solo un borrador puede enviarse a validación");
  }
  await db
    .update(schema.unidadesConocimiento)
    .set({ estado: "en_validacion" })
    .where(eq(schema.unidadesConocimiento.id, unidadId));
}

/**
 * Aprueba y publica una unidad: genera chunks + embeddings y registra
 * validador y fecha. Si la unidad es una nueva versión de una publicada
 * (unidadOrigenId), el contenido se aplica sobre la original (misma URL/QR),
 * se incrementa la versión y se regeneran sus chunks.
 *
 * Devuelve el id de la unidad publicada (la original si era nueva versión).
 */
export async function publicarUnidad(
  unidadId: number,
  validadorId: number
): Promise<number> {
  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, unidadId));
  if (!unidad) throw new Error("Unidad no encontrada");
  if (unidad.estado !== "en_validacion") {
    throw new Error("Solo una unidad en validación puede publicarse");
  }

  let targetId = unidadId;

  if (unidad.unidadOrigenId) {
    // Nueva versión: aplicar contenido sobre la unidad original
    const [original] = await db
      .select()
      .from(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, unidad.unidadOrigenId));
    if (!original) throw new Error("Unidad original no encontrada");

    await db
      .update(schema.unidadesConocimiento)
      .set({
        tipo: unidad.tipo,
        titulo: unidad.titulo,
        contenidoMarkdown: unidad.contenidoMarkdown,
        criticidad: unidad.criticidad,
        estado: "publicado",
        validadorId,
        fechaPublicacion: new Date(),
        version: original.version + 1,
        comentarioRechazo: null,
      })
      .where(eq(schema.unidadesConocimiento.id, original.id));

    // El staging de la nueva versión se elimina (su contenido ya vive en la original)
    await db
      .delete(schema.unidadesConocimiento)
      .where(eq(schema.unidadesConocimiento.id, unidadId));

    targetId = original.id;
  } else {
    await db
      .update(schema.unidadesConocimiento)
      .set({
        estado: "publicado",
        validadorId,
        fechaPublicacion: new Date(),
        comentarioRechazo: null,
      })
      .where(eq(schema.unidadesConocimiento.id, unidadId));
  }

  await regenerarChunks(targetId);
  return targetId;
}

/** Rechaza una unidad en validación: vuelve a borrador con el comentario del validador. */
export async function rechazarUnidad(
  unidadId: number,
  validadorId: number,
  comentario: string
) {
  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, unidadId));
  if (!unidad) throw new Error("Unidad no encontrada");
  if (unidad.estado !== "en_validacion") {
    throw new Error("Solo una unidad en validación puede rechazarse");
  }
  await db
    .update(schema.unidadesConocimiento)
    .set({
      estado: "borrador",
      validadorId,
      comentarioRechazo: comentario || "Rechazada sin comentario",
    })
    .where(eq(schema.unidadesConocimiento.id, unidadId));
}

/** Crea un borrador de nueva versión a partir de una unidad publicada. */
export async function crearNuevaVersion(
  unidadId: number,
  autorExpertoId: number
): Promise<number> {
  const [original] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, unidadId));
  if (!original) throw new Error("Unidad no encontrada");
  if (original.estado !== "publicado") {
    throw new Error("Solo se versionan unidades publicadas");
  }

  const [nueva] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId: original.cargoId,
      tipo: original.tipo,
      titulo: original.titulo,
      contenidoMarkdown: original.contenidoMarkdown,
      criticidad: original.criticidad,
      estado: "borrador",
      autorExpertoId,
      version: original.version + 1,
      unidadOrigenId: original.id,
    })
    .returning();
  return nueva.id;
}

async function regenerarChunks(unidadId: number) {
  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.id, unidadId));
  if (!unidad) throw new Error("Unidad no encontrada");

  await db.delete(schema.chunks).where(eq(schema.chunks.unidadId, unidadId));

  const piezas = chunkMarkdown(unidad.titulo, unidad.contenidoMarkdown);
  for (const texto of piezas) {
    const embedding = await embedPassage(texto);
    await db.insert(schema.chunks).values({ unidadId, texto, embedding });
  }
}
