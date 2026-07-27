"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { contrastarConIA } from "@/lib/ai/contrastar";
import { requireRole } from "@/lib/session";

async function contrasteDelCargo(id: number, cargoId: number) {
  const [contraste] = await db.select().from(schema.contrastes).where(and(eq(schema.contrastes.id, id), eq(schema.contrastes.cargoId, cargoId))).limit(1);
  if (!contraste) throw new Error("Contraste no encontrado.");
  return contraste;
}

export async function cambiarAceptacionDivergenciaAction(id: number, aceptada: boolean) {
  const session = await requireRole("experto");
  const [divergencia] = await db.select({ id: schema.divergencias.id, contrasteId: schema.divergencias.contrasteId }).from(schema.divergencias).where(eq(schema.divergencias.id, id)).limit(1);
  if (!divergencia) throw new Error("Divergencia no encontrada.");
  await contrasteDelCargo(divergencia.contrasteId, session.user.cargoId!);
  await db.update(schema.divergencias).set({ aceptada }).where(eq(schema.divergencias.id, id));
  revalidatePath(`/experto/contrastes/${divergencia.contrasteId}`);
}

export async function reintentarContrasteAction(formData: FormData) {
  const session = await requireRole("experto");
  const id = Number(formData.get("id"));
  const contraste = await contrasteDelCargo(id, session.user.cargoId!);
  const fuentes = await db.select().from(schema.fuentesConocimiento).where(eq(schema.fuentesConocimiento.cargoId, contraste.cargoId));
  const porTipo = new Map(fuentes.map((fuente) => [fuente.tipo, fuente.contenido]));
  await db.update(schema.contrastes).set({ estado: "procesando", resumen: null }).where(eq(schema.contrastes.id, id));
  try {
    const propuestas = await contrastarConIA({ manual: porTipo.get("manual") ?? "", relatoExperto: porTipo.get("relato_experto") ?? "", errores: porTipo.get("errores_operacionales") ?? "" });
    await db.delete(schema.divergencias).where(eq(schema.divergencias.contrasteId, id));
    if (propuestas.length) await db.insert(schema.divergencias).values(propuestas.map((item) => ({ contrasteId: id, ...item })));
    await db.update(schema.contrastes).set({ estado: "completado", resumen: `${propuestas.length} divergencias con evidencia.` }).where(eq(schema.contrastes.id, id));
  } catch {
    await db.update(schema.contrastes).set({ estado: "fallido", resumen: "No se pudo completar. Reintenta cuando la IA esté disponible." }).where(eq(schema.contrastes.id, id));
  }
  revalidatePath(`/experto/contrastes/${id}`);
}

export async function generarBorradorDesdeContrasteAction(formData: FormData) {
  const session = await requireRole("experto");
  const contraste = await contrasteDelCargo(Number(formData.get("id")), session.user.cargoId!);
  const [origen] = await db.select().from(schema.unidadesConocimiento).where(and(eq(schema.unidadesConocimiento.id, contraste.unidadOrigenId), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!))).limit(1);
  if (!origen || origen.estado !== "publicado") throw new Error("La unidad de origen no está disponible.");
  const aceptadas = await db.select().from(schema.divergencias).where(and(eq(schema.divergencias.contrasteId, contraste.id), eq(schema.divergencias.aceptada, true)));
  if (!aceptadas.length) throw new Error("Selecciona al menos una divergencia antes de generar el borrador.");
  const anexo = aceptadas.map((item) => `### ${item.tipo.replaceAll("_", " ")}\n- Hallazgo: ${item.descripcion}\n- Evidencia: ${item.evidenciaOperacion}\n- Recomendación para validar: ${item.recomendacion}`).join("\n\n");
  const [borrador] = await db.insert(schema.unidadesConocimiento).values({ cargoId: origen.cargoId, tipo: origen.tipo, titulo: origen.titulo, contenidoMarkdown: `${origen.contenidoMarkdown}\n\n---\n\n> Entorno demostrativo: cambios propuestos desde contraste; requieren validación humana.\n\n## Hallazgos de contraste para revisión\n\n${anexo}`, criticidad: origen.criticidad, estado: "borrador", autorExpertoId: Number(session.user.id), version: origen.version + 1, unidadOrigenId: origen.id }).returning();
  redirect(`/experto/unidades/${borrador.id}`);
}
