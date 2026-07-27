import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const [updated] = await db
    .update(schema.consultas)
    .set({ escalada: true })
    .where(
      and(
        eq(schema.consultas.id, Number(id)),
        eq(schema.consultas.usuarioId, Number(session.user.id))
      )
    )
    .returning({ id: schema.consultas.id });

  if (!updated) {
    return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
