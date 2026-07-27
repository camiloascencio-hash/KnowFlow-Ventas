import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

const estadoStyle = { procesando: "bg-amber-100 text-amber-800", completado: "bg-emerald-100 text-emerald-800", fallido: "bg-red-100 text-red-800" } as const;

export default async function ContrastesPage() {
  const session = await requireRole("experto");
  const contrastes = await db.select({ id: schema.contrastes.id, titulo: schema.contrastes.titulo, estado: schema.contrastes.estado, resumen: schema.contrastes.resumen, creadoEn: schema.contrastes.creadoEn }).from(schema.contrastes).where(eq(schema.contrastes.cargoId, session.user.cargoId!)).orderBy(desc(schema.contrastes.creadoEn));
  return <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Ciclo de conocimiento</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Contrastar práctica y manual</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Revisa hallazgos trazables antes de proponer una nueva versión. Este entorno usa un caso sintético de demostración.</p><div className="mt-5 space-y-3">{contrastes.map((contraste) => <Link key={contraste.id} href={`/experto/contrastes/${contraste.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-slate-900">{contraste.titulo}</h2><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estadoStyle[contraste.estado]}`}>{contraste.estado}</span></div><p className="mt-2 text-sm text-slate-500">{contraste.resumen ?? "Comparación preparada para revisión."}</p><p className="mt-3 font-mono text-[11px] text-slate-400">CASO DEMO · {contraste.creadoEn.toLocaleDateString("es-CL")}</p></Link>)}{!contrastes.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Aún no hay contrastes para este cargo.</div>}</div></section>;
}
