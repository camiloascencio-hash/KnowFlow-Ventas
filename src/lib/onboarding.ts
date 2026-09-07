import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Tiempo a autonomía: server-side, agregado, nunca individual.
 *
 * "Autonomía" se define como el momento en que un trabajador nuevo confirma
 * haber leído TODAS las unidades de criticidad alta publicadas de su cargo.
 * Es un hito con timestamp real (usuarios.autonomiaAlcanzadaEn), no una
 * estimación: se fija una sola vez, la primera vez que se cumple la condición,
 * y no se revierte si luego el trabajador desmarca una lectura.
 */

/** Unidades de criticidad alta publicadas del cargo (el "temario obligatorio"). */
export async function unidadesCriticasDe(cargoId: number) {
  return db
    .select({
      id: schema.unidadesConocimiento.id,
      titulo: schema.unidadesConocimiento.titulo,
      tipo: schema.unidadesConocimiento.tipo,
    })
    .from(schema.unidadesConocimiento)
    .where(
      and(
        eq(schema.unidadesConocimiento.cargoId, cargoId),
        eq(schema.unidadesConocimiento.estado, "publicado"),
        eq(schema.unidadesConocimiento.criticidad, "alta")
      )
    )
    .orderBy(schema.unidadesConocimiento.id);
}

export async function lecturasDe(usuarioId: number): Promise<number[]> {
  const filas = await db
    .select({ unidadId: schema.lecturasConfirmadas.unidadId })
    .from(schema.lecturasConfirmadas)
    .where(eq(schema.lecturasConfirmadas.usuarioId, usuarioId));
  return filas.map((f) => f.unidadId);
}

/**
 * Marca (o desmarca) la lectura de una unidad. Si al marcar se completa el
 * temario obligatorio del cargo y el trabajador aún no tenía el hito, lo fija
 * — con la fecha de HOY, no la de un cálculo retroactivo.
 */
export async function confirmarLectura(
  usuarioId: number,
  cargoId: number,
  unidadId: number,
  leida: boolean
): Promise<void> {
  if (leida) {
    await db
      .insert(schema.lecturasConfirmadas)
      .values({ usuarioId, unidadId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.lecturasConfirmadas)
      .where(
        and(
          eq(schema.lecturasConfirmadas.usuarioId, usuarioId),
          eq(schema.lecturasConfirmadas.unidadId, unidadId)
        )
      );
    return; // desmarcar nunca puede completar el hito
  }

  const [criticas, [usuario]] = await Promise.all([
    unidadesCriticasDe(cargoId),
    db
      .select({ autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, usuarioId))
      .limit(1),
  ]);

  if (!usuario || usuario.autonomiaAlcanzadaEn || criticas.length === 0) return;

  const leidas = new Set(await lecturasDe(usuarioId));
  const completo = criticas.every((u) => leidas.has(u.id));
  if (completo) {
    await db
      .update(schema.usuarios)
      .set({ autonomiaAlcanzadaEn: new Date() })
      .where(eq(schema.usuarios.id, usuarioId));
  }
}

export type ResumenAutonomia = {
  /** Cuántos alcanzaron el hito en la ventana, y cuánto tardaron (en días). */
  completados: number;
  promedioDias: number | null;
  medianaDias: number | null;
  /** Trabajadores nuevos sin el hito aún, agrupados por cuánto llevan esperando. */
  enProgreso: { balde: string; n: number }[];
};

const BALDES = [
  { balde: "0-3 días", maxDias: 3 },
  { balde: "4-7 días", maxDias: 7 },
  { balde: "8-14 días", maxDias: 14 },
  { balde: "15+ días", maxDias: Infinity },
];

/**
 * Métrica agregada para el dashboard de jefatura. Nunca expone quién es quién:
 * solo cuántos completaron, cuánto tardaron (promedio y mediana) y cuántos
 * siguen en camino, baldeados por antigüedad — la señal de alerta temprana es
 * "cuántos llevan 15+ días sin autonomía", no "Juan lleva 15 días".
 */
export async function resumenAutonomia(cargoId: number): Promise<ResumenAutonomia> {
  const filas = await db
    .select({
      creadoEn: schema.usuarios.creadoEn,
      autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn,
    })
    .from(schema.usuarios)
    .where(
      and(
        eq(schema.usuarios.cargoId, cargoId),
        eq(schema.usuarios.rol, "trabajador_nuevo")
      )
    );

  const dias = filas
    .filter((f) => f.autonomiaAlcanzadaEn)
    .map(
      (f) =>
        (f.autonomiaAlcanzadaEn!.getTime() - f.creadoEn.getTime()) /
        86_400_000
    )
    .sort((a, b) => a - b);

  const promedioDias =
    dias.length > 0
      ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10
      : null;
  const medianaDias =
    dias.length > 0
      ? Math.round(dias[Math.floor(dias.length / 2)] * 10) / 10
      : null;

  const ahora = Date.now();
  const pendientes = filas.filter((f) => !f.autonomiaAlcanzadaEn);
  const enProgreso = BALDES.map(({ balde, maxDias }, i) => {
    const minDias = i === 0 ? 0 : BALDES[i - 1].maxDias;
    const n = pendientes.filter((f) => {
      const transcurridos = (ahora - f.creadoEn.getTime()) / 86_400_000;
      return transcurridos > minDias && transcurridos <= maxDias;
    }).length;
    return { balde, n };
  });

  return { completados: dias.length, promedioDias, medianaDias, enProgreso };
}
