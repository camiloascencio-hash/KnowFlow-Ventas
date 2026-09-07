/**
 * Tiempo a autonomía y checklist de primeros turnos, server-side.
 *
 * Reemplaza el localStorage original: el hito de autonomía tiene que fijarse
 * exactamente una vez, con la fecha real, y no revertirse — y el resumen
 * agregado del dashboard nunca debe poder rearmarse para identificar a una
 * persona en particular.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import {
  confirmarLectura,
  lecturasDe,
  resumenAutonomia,
  unidadesCriticasDe,
} from "@/lib/onboarding";

let cargoId: number;
let unidadAId: number;
let unidadBId: number;
let trabajadorId: number;

beforeAll(async () => {
  const [cargo] = await db
    .insert(schema.cargos)
    .values({ nombre: `Cargo onboarding (test ${Date.now()})` })
    .returning();
  cargoId = cargo.id;

  const [a, b] = await db
    .insert(schema.unidadesConocimiento)
    .values([
      {
        cargoId,
        tipo: "procedimiento",
        titulo: "Crítica A",
        contenidoMarkdown: "contenido A",
        criticidad: "alta",
        estado: "publicado",
      },
      {
        cargoId,
        tipo: "procedimiento",
        titulo: "Crítica B",
        contenidoMarkdown: "contenido B",
        criticidad: "alta",
        estado: "publicado",
      },
    ])
    .returning();
  unidadAId = a.id;
  unidadBId = b.id;

  const [trabajador] = await db
    .insert(schema.usuarios)
    .values({
      nombre: "Trabajador Onboarding",
      email: `onboarding-${Date.now()}@test.cl`,
      passwordHash: "x",
      rol: "trabajador_nuevo",
      cargoId,
    })
    .returning();
  trabajadorId = trabajador.id;
});

afterAll(async () => {
  await db
    .delete(schema.lecturasConfirmadas)
    .where(eq(schema.lecturasConfirmadas.usuarioId, trabajadorId));
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, trabajadorId));
  await db
    .delete(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.cargoId, cargoId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, cargoId));
  await closeDb();
});

describe("unidadesCriticasDe", () => {
  it("lista solo las de criticidad alta y publicadas del cargo", async () => {
    const criticas = await unidadesCriticasDe(cargoId);
    expect(criticas.map((u) => u.id).sort()).toEqual(
      [unidadAId, unidadBId].sort()
    );
  });
});

describe("confirmarLectura y el hito de autonomía", () => {
  it("no fija el hito con una lectura parcial", async () => {
    await confirmarLectura(trabajadorId, cargoId, unidadAId, true);

    const leidas = await lecturasDe(trabajadorId);
    expect(leidas).toEqual([unidadAId]);

    const [usuario] = await db
      .select({ autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, trabajadorId));
    expect(usuario.autonomiaAlcanzadaEn).toBeNull();
  });

  it("fija el hito la primera vez que se completa el temario", async () => {
    await confirmarLectura(trabajadorId, cargoId, unidadBId, true);

    const [usuario] = await db
      .select({ autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, trabajadorId));
    expect(usuario.autonomiaAlcanzadaEn).not.toBeNull();
  });

  it("desmarcar una lectura despues NO revierte el hito ya alcanzado", async () => {
    const [antes] = await db
      .select({ autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, trabajadorId));

    await confirmarLectura(trabajadorId, cargoId, unidadAId, false);

    const [despues] = await db
      .select({ autonomiaAlcanzadaEn: schema.usuarios.autonomiaAlcanzadaEn })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, trabajadorId));

    expect(despues.autonomiaAlcanzadaEn).toEqual(antes.autonomiaAlcanzadaEn);
    // Pero la lectura individual sí se desmarcó: la lista vuelve a reflejarlo.
    expect(await lecturasDe(trabajadorId)).toEqual([unidadBId]);
  });

  it("es idempotente: confirmar dos veces la misma unidad no falla", async () => {
    await expect(
      confirmarLectura(trabajadorId, cargoId, unidadBId, true)
    ).resolves.not.toThrow();
  });
});

describe("resumenAutonomia", () => {
  it("cuenta a quien alcanzo el hito y calcula dias >= 0", async () => {
    const resumen = await resumenAutonomia(cargoId);
    expect(resumen.completados).toBeGreaterThanOrEqual(1);
    expect(resumen.medianaDias).not.toBeNull();
    expect(resumen.medianaDias!).toBeGreaterThanOrEqual(0);
  });

  it("nunca expone identidad: solo agregados y baldes por antigüedad", async () => {
    const resumen = await resumenAutonomia(cargoId);
    const claves = Object.keys(resumen);
    expect(claves).not.toContain("usuarioId");
    expect(claves).not.toContain("nombre");
    expect(resumen.enProgreso.every((b) => "balde" in b && "n" in b)).toBe(
      true
    );
  });
});
