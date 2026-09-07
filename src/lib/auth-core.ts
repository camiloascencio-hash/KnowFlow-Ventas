/**
 * Criptografía de contraseñas y el código de error de verificación de correo.
 *
 * Vive separado de auth.ts a propósito: ese archivo llama a `NextAuth(...)`
 * al importarse, y esa llamada arrastra `next/server`, que no resuelve fuera
 * del runtime de Next.js (rompe en los tests de Vitest). Esta lógica es pura
 * —hashing, comparación, una constante— y no necesita ese runtime, así que
 * vive aquí y auth.ts la reexporta para no romper a quien ya la importaba
 * desde "@/auth".
 */
import { createHash, timingSafeEqual } from "crypto";
import { hash, verify } from "@node-rs/argon2";

const ARGON_OPTIONS = {
  algorithm: 2,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return verify(passwordHash, password, ARGON_OPTIONS);
}

function legacyHashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Accepts the hashes created by the original MVP once, then upgrades them on
 * successful login. This keeps the deployed demo usable while Neon is migrated.
 */
export async function verifyStoredPassword(
  password: string,
  passwordHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (passwordHash.startsWith("$argon2")) {
    return { valid: await verifyPassword(password, passwordHash), needsUpgrade: false };
  }

  if (!/^[a-f0-9]{64}$/i.test(passwordHash)) {
    return { valid: false, needsUpgrade: false };
  }

  const expected = Buffer.from(legacyHashPassword(password), "utf8");
  const stored = Buffer.from(passwordHash, "utf8");
  return {
    valid: timingSafeEqual(expected, stored),
    needsUpgrade: true,
  };
}

/** Código que Auth.js expone al cliente cuando la clave es correcta pero la cuenta no confirmó su correo. */
export const CODIGO_CUENTA_SIN_VERIFICAR = "cuenta_sin_verificar";
