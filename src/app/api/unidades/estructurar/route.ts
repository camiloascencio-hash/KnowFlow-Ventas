import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { estructurarConocimiento } from "@/lib/ai/estructurar";
import { eq } from "drizzle-orm";

/**
 * Etapas 1-2 del ciclo: el experto envía texto libre y la IA lo estructura
 * en una unidad estandarizada que queda como BORRADOR para su revisión.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "experto") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.user.cargoId) {
    return NextResponse.json({ error: "Usuario sin cargo" }, { status: 400 });
  }

  const { texto } = (await req.json()) as { texto?: string };
  if (!texto || texto.trim().length < 30) {
    return NextResponse.json(
      { error: "Describe el procedimiento con más detalle (mínimo 30 caracteres)" },
      { status: 400 }
    );
  }

  const [cargo] = await db
    .select()
    .from(schema.cargos)
    .where(eq(schema.cargos.id, session.user.cargoId));

  const { unidad, demo } = await estructurarConocimiento(
    texto.trim(),
    cargo?.nombre ?? "trabajador de primera línea"
  );

  const [creada] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId: session.user.cargoId,
      tipo: unidad.tipo,
      titulo: unidad.titulo,
      contenidoMarkdown: unidad.contenidoMarkdown,
      criticidad: unidad.criticidad,
      estado: "borrador",
      autorExpertoId: Number(session.user.id),
    })
    .returning();

  return NextResponse.json({ id: creada.id, demo });
}
