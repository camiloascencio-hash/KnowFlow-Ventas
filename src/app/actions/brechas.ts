"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { redactarBorradorDesdeBrecha } from "@/lib/ai/redactor";

/** Admin: avanza el estado de una brecha (detectada → en_proceso → resuelta). */
export async function cambiarEstadoBrechaAction(formData: FormData) {
  const session = await requireRole("admin");
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado")) as
    | "detectada"
    | "en_proceso"
    | "resuelta";

  await db
    .update(schema.brechas)
    .set({
      estado,
      timestampResolucion: estado === "resuelta" ? new Date() : null,
    })
    .where(and(eq(schema.brechas.id, id), eq(schema.brechas.cargoId, session.user.cargoId!)));

  revalidatePath("/admin/dashboard");
}

/** Admin: pide al agente redactor un borrador esqueleto a partir de la brecha. */
export async function redactarBorradorAction(formData: FormData) {
  const session = await requireRole("admin");
  const brechaId = Number(formData.get("id"));
  const [brecha] = await db.select({ id: schema.brechas.id }).from(schema.brechas).where(and(eq(schema.brechas.id, brechaId), eq(schema.brechas.cargoId, session.user.cargoId!))).limit(1);
  if (!brecha) throw new Error("Brecha no encontrada.");
  const { unidadId } = await redactarBorradorDesdeBrecha(brechaId);
  revalidatePath("/admin/dashboard");
  redirect(`/admin/dashboard?borrador=${unidadId}`);
}
