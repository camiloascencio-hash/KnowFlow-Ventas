import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { responderConsulta } from "@/lib/rag";
import { consumirCuota } from "@/lib/rate-limit";

/**
 * Canal web del agente conversacional (etapa 4).
 *
 * PUNTO DE EXTENSIÓN WHATSAPP: este endpoint es agnóstico del canal.
 * Un webhook de WhatsApp solo necesita mapear el teléfono → usuario/cargo
 * y llamar a responderConsulta() igual que aquí. Ver docs/EXTENSION-WHATSAPP.md.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.rol !== "trabajador_nuevo") {
    return NextResponse.json({ error: "Este canal está disponible solo para trabajadores nuevos." }, { status: 403 });
  }
  if (!session.user.cargoId) {
    return NextResponse.json({ error: "Usuario sin cargo" }, { status: 400 });
  }

  // Cada consulta gasta un embedding y hasta seis llamadas al modelo: el techo
  // por usuario evita que un bucle del cliente vacie el presupuesto.
  const cuota = consumirCuota(`chat:${session.user.id}`);
  if (!cuota.permitido) {
    return NextResponse.json(
      {
        error: `Vas muy rapido. Espera ${cuota.reintentarEnSegundos} segundos y vuelve a preguntar.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(cuota.reintentarEnSegundos) },
      }
    );
  }

  const { pregunta } = (await req.json()) as { pregunta?: string };
  if (!pregunta || !pregunta.trim()) {
    return NextResponse.json({ error: "Pregunta vacía" }, { status: 400 });
  }

  const resultado = await responderConsulta({
    usuarioId: Number(session.user.id),
    cargoId: session.user.cargoId,
    pregunta: pregunta.trim(),
  });

  return NextResponse.json(resultado);
}
