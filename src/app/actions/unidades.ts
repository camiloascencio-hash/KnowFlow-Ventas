"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import {
  crearNuevaVersion,
  enviarAValidacion,
  publicarUnidad,
  rechazarUnidad,
} from "@/lib/unidades";

/** Experto: guarda los cambios de un borrador propio. */
export async function guardarUnidadAction(formData: FormData) {
  const session = await requireRole("experto");
  const id = Number(formData.get("id"));

  const [unidad] = await db
    .select()
    .from(schema.unidadesConocimiento)
    .where(and(eq(schema.unidadesConocimiento.id, id), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!)));
  if (!unidad || unidad.autorExpertoId !== Number(session.user.id)) {
    throw new Error("Unidad no encontrada");
  }
  if (unidad.estado !== "borrador") {
    throw new Error("Solo se pueden editar borradores");
  }

  await db
    .update(schema.unidadesConocimiento)
    .set({
      titulo: String(formData.get("titulo") ?? unidad.titulo),
      tipo: String(formData.get("tipo")) as typeof unidad.tipo,
      criticidad: String(formData.get("criticidad")) as typeof unidad.criticidad,
      contenidoMarkdown: String(
        formData.get("contenidoMarkdown") ?? unidad.contenidoMarkdown
      ),
    })
    .where(eq(schema.unidadesConocimiento.id, id));

  revalidatePath("/experto/unidades");

  if (formData.get("enviar") === "1") {
    await enviarAValidacion(id);
    redirect("/experto/unidades?enviada=1");
  }
  redirect(`/experto/unidades/${id}?guardada=1`);
}

/** Experto: crea un borrador de nueva versión de una unidad publicada. */
export async function nuevaVersionAction(formData: FormData) {
  const session = await requireRole("experto");
  const id = Number(formData.get("id"));
  const [unidad] = await db.select({ id: schema.unidadesConocimiento.id }).from(schema.unidadesConocimiento).where(and(eq(schema.unidadesConocimiento.id, id), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!))).limit(1);
  if (!unidad) throw new Error("Unidad no encontrada.");
  const nuevaId = await crearNuevaVersion(id, Number(session.user.id));
  redirect(`/experto/unidades/${nuevaId}`);
}

/** Validador: aprueba y publica (genera chunks + embeddings). */
export async function aprobarUnidadAction(formData: FormData) {
  const session = await requireRole("validador", "admin");
  const id = Number(formData.get("id"));
  const [unidad] = await db.select({ id: schema.unidadesConocimiento.id }).from(schema.unidadesConocimiento).where(and(eq(schema.unidadesConocimiento.id, id), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!))).limit(1);
  if (!unidad) throw new Error("Unidad no encontrada.");
  await publicarUnidad(id, Number(session.user.id));
  revalidatePath("/validador/bandeja");
  redirect("/validador/bandeja?aprobada=1");
}

/** Validador: rechaza con comentario (vuelve a borrador). */
export async function rechazarUnidadAction(formData: FormData) {
  const session = await requireRole("validador", "admin");
  const id = Number(formData.get("id"));
  const [unidad] = await db.select({ id: schema.unidadesConocimiento.id }).from(schema.unidadesConocimiento).where(and(eq(schema.unidadesConocimiento.id, id), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!))).limit(1);
  if (!unidad) throw new Error("Unidad no encontrada.");
  const comentario = String(formData.get("comentario") ?? "").trim();
  await rechazarUnidad(id, Number(session.user.id), comentario);
  revalidatePath("/validador/bandeja");
  redirect("/validador/bandeja?rechazada=1");
}
