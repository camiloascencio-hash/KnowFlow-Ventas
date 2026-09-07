import { requireRole } from "@/lib/session";
import { lecturasDe, unidadesCriticasDe } from "@/lib/onboarding";
import MisTurnosClient from "./MisTurnosClient";

export const dynamic = "force-dynamic";

/**
 * Ruta de aprendizaje "Mis primeras ventas": las unidades de criticidad ALTA
 * del cargo, cuya lectura se confirma al final. El progreso vive en el
 * servidor (tabla lecturas_confirmadas): permite medir tiempo real a
 * autonomía de forma agregada, sin exponer nunca el detalle individual.
 */
export default async function MisTurnosPage() {
  const session = await requireRole("trabajador_nuevo");

  const [unidades, leidas] = await Promise.all([
    unidadesCriticasDe(session.user.cargoId!),
    lecturasDe(Number(session.user.id)),
  ]);

  return <MisTurnosClient unidades={unidades} leidasIniciales={leidas} />;
}
