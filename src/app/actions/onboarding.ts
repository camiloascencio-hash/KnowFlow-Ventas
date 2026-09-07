"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { confirmarLectura } from "@/lib/onboarding";

/**
 * Confirma o desmarca la lectura de una unidad critica.
 *
 * Server-side desde el commit que reemplazo el localStorage original: el
 * progreso ahora vive en `lecturas_confirmadas`, con timestamp real, y puede
 * completar el hito de autonomia del trabajador.
 */
export async function confirmarLecturaAction(unidadId: number, leida: boolean) {
  const session = await requireRole("trabajador_nuevo");
  if (!session.user.cargoId) throw new Error("Usuario sin cargo.");

  await confirmarLectura(
    Number(session.user.id),
    session.user.cargoId,
    unidadId,
    leida
  );

  revalidatePath("/mis-turnos");
  revalidatePath(`/mis-turnos/${unidadId}`);
}
