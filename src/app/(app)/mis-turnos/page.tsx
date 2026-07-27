import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import MisTurnosClient from "./MisTurnosClient";

/**
 * Ruta de aprendizaje "Mis primeros turnos": las unidades de criticidad ALTA
 * del cargo, cuya lectura se confirma al final. El progreso se guarda en
 * localStorage (privacidad por diseño: no se reporta a nadie).
 */
export default async function MisTurnosPage() {
  const session = await requireRole("trabajador_nuevo");

  const unidades = await db
    .select({
      id: schema.unidadesConocimiento.id,
      titulo: schema.unidadesConocimiento.titulo,
      tipo: schema.unidadesConocimiento.tipo,
    })
    .from(schema.unidadesConocimiento)
    .where(
      and(
        eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!),
        eq(schema.unidadesConocimiento.estado, "publicado"),
        eq(schema.unidadesConocimiento.criticidad, "alta")
      )
    )
    .orderBy(asc(schema.unidadesConocimiento.id));

  return <MisTurnosClient unidades={unidades} />;
}
