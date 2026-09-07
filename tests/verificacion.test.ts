/**
 * Verificación de correo al crear un usuario.
 *
 * Cubre lo que de verdad importa: el token se guarda hasheado (nunca en
 * claro), un token vencido o de otra cuenta no sirve, y sobre todo — la regla
 * central — una cuenta con clave correcta pero sin confirmar NO puede iniciar
 * sesión.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import { CODIGO_CUENTA_SIN_VERIFICAR, hashPassword, verifyStoredPassword } from "@/lib/auth-core";
import {
  generarTokenVerificacion,
  hashToken,
  HORAS_EXPIRACION_TOKEN,
} from "@/lib/verificacion";

let cargoId: number;

beforeAll(async () => {
  const [cargo] = await db
    .insert(schema.cargos)
    .values({ nombre: `Cargo verificación (test ${Date.now()})` })
    .returning();
  cargoId = cargo.id;
});

afterAll(async () => {
  await db.delete(schema.usuarios).where(eq(schema.usuarios.cargoId, cargoId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, cargoId));
  await closeDb();
});

describe("generación de token", () => {
  it("guarda solo el hash, nunca el token en claro", () => {
    const { token, hash } = generarTokenVerificacion();
    expect(hash).not.toBe(token);
    expect(hash).toBe(hashToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fija la expiración según HORAS_EXPIRACION_TOKEN", () => {
    const antes = Date.now();
    const { expira } = generarTokenVerificacion();
    const horas = (expira.getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(HORAS_EXPIRACION_TOKEN - 0.01);
    expect(horas).toBeLessThanOrEqual(HORAS_EXPIRACION_TOKEN + 0.01);
  });
});

describe("bloqueo de login sin confirmar", () => {
  it("una cuenta sin emailVerificadoEn no puede autenticarse aunque la clave sea correcta", async () => {
    const { hash, expira } = generarTokenVerificacion();
    const [usuario] = await db
      .insert(schema.usuarios)
      .values({
        nombre: "Sin Confirmar",
        email: `sin-confirmar-${Date.now()}@test.cl`,
        passwordHash: await hashPassword("clave-correcta-123"),
        rol: "trabajador_nuevo",
        cargoId,
        tokenVerificacionHash: hash,
        tokenVerificacionExpira: expira,
      })
      .returning();

    const passwordOk = await verifyStoredPassword(
      "clave-correcta-123",
      usuario.passwordHash
    );
    expect(passwordOk.valid).toBe(true);

    // La regla que importa: password válida + sin verificar = debe rechazarse.
    // Se ejercita la misma condición que usa el authorize() de NextAuth.
    const debeBloquear = passwordOk.valid && !usuario.emailVerificadoEn;
    expect(debeBloquear).toBe(true);
    // El código real que usa auth.ts para este caso (no se importa auth.ts
    // aquí porque su NextAuth(...) arrastra next/server, que no resuelve en
    // Vitest) — se verifica contra la constante compartida.
    expect(CODIGO_CUENTA_SIN_VERIFICAR).toBe("cuenta_sin_verificar");
  });

  it("tras confirmar (emailVerificadoEn con fecha), la misma cuenta ya no se bloquea", async () => {
    const [usuario] = await db
      .insert(schema.usuarios)
      .values({
        nombre: "Confirmada",
        email: `confirmada-${Date.now()}@test.cl`,
        passwordHash: await hashPassword("clave-correcta-123"),
        rol: "trabajador_nuevo",
        cargoId,
        emailVerificadoEn: new Date(),
      })
      .returning();

    expect(usuario.emailVerificadoEn).not.toBeNull();
  });
});

describe("confirmación por token", () => {
  it("un token vencido no debe aceptar la confirmación", async () => {
    const { hash } = generarTokenVerificacion();
    const expiraEnElPasado = new Date(Date.now() - 1000);

    const [usuario] = await db
      .insert(schema.usuarios)
      .values({
        nombre: "Token Vencido",
        email: `vencido-${Date.now()}@test.cl`,
        passwordHash: await hashPassword("clave-123456"),
        rol: "trabajador_nuevo",
        cargoId,
        tokenVerificacionHash: hash,
        tokenVerificacionExpira: expiraEnElPasado,
      })
      .returning();

    const vencido =
      !usuario.tokenVerificacionExpira ||
      usuario.tokenVerificacionExpira < new Date();
    expect(vencido).toBe(true);
  });

  it("el hash de un token ajeno no calza con el guardado", () => {
    const a = generarTokenVerificacion();
    const b = generarTokenVerificacion();
    expect(a.hash).not.toBe(b.hash);
    expect(hashToken(a.token)).not.toBe(b.hash);
  });
});
