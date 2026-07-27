import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { generarBorradorDesdeContrasteAction, reintentarContrasteAction } from "@/app/actions/contrastes";
import { DivergenciasClient } from "./DivergenciasClient";

export default async function ContrasteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("experto"); const { id } = await params; const contrasteId = Number(id);
  const [contraste] = await db.select().from(schema.contrastes).where(and(eq(schema.contrastes.id, contrasteId), eq(schema.contrastes.cargoId, session.user.cargoId!))).limit(1);
  if (!contraste) notFound();
  const [unidad, fuentes, divergencias] = await Promise.all([db.select().from(schema.unidadesConocimiento).where(eq(schema.unidadesConocimiento.id, contraste.unidadOrigenId)).limit(1), db.select().from(schema.fuentesConocimiento).where(eq(schema.fuentesConocimiento.cargoId, contraste.cargoId)), db.select().from(schema.divergencias).where(eq(schema.divergencias.contrasteId, contraste.id))]);
  const manual = fuentes.find((fuente) => fuente.tipo === "manual"); const practica = fuentes.filter((fuente) => fuente.tipo !== "manual").map((fuente) => `## ${fuente.titulo}\n${fuente.contenido}`).join("\n\n");
  return <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Caso sintético de demostración</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{contraste.titulo}</h1><p className="mt-2 text-sm text-slate-600">La propuesta crea un borrador; nunca publica ni indexa contenido automáticamente.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">Manual oficial</h2><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{manual?.contenido ?? unidad[0]?.contenidoMarkdown}</pre></article><article className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"><h2 className="font-semibold">Práctica observada</h2><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">{practica}</pre></article></div>{contraste.estado === "fallido" && <form action={reintentarContrasteAction} className="mt-4"><input type="hidden" name="id" value={contraste.id} /><button className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700">Reintentar contraste</button></form>}{contraste.estado === "completado" && <><DivergenciasClient divergencias={divergencias} /><form action={generarBorradorDesdeContrasteAction} className="mt-5"><input type="hidden" name="id" value={contraste.id} /><button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">Generar borrador validable</button></form></>}</section>;
}
