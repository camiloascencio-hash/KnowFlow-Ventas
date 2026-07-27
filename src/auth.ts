import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { createHash, timingSafeEqual } from "crypto";
import { hash, verify } from "@node-rs/argon2";
import { db, schema } from "@/db";

const ARGON_OPTIONS = {
  algorithm: 2,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
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

export type Rol = "trabajador_nuevo" | "experto" | "validador" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nombre: string;
      email: string;
      rol: Rol;
      cargoId: number | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Permite acceder desde otros dispositivos de la red (IP local) sin
  // que NextAuth rechace el host. En producción real, fijar AUTH_URL.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(schema.usuarios)
          .where(eq(schema.usuarios.email, email))
          .limit(1);

        if (!user) return null;

        const passwordResult = await verifyStoredPassword(password, user.passwordHash);
        if (!passwordResult.valid) return null;

        if (passwordResult.needsUpgrade) {
          await db
            .update(schema.usuarios)
            .set({ passwordHash: await hashPassword(password) })
            .where(eq(schema.usuarios.id, user.id));
        }

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          cargoId: user.cargoId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { rol: Rol; cargoId: number | null };
        token.id = u.id;
        token.rol = u.rol;
        token.cargoId = u.cargoId;
        token.nombre = u.name;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id);
      session.user.nombre = String(token.nombre ?? "");
      session.user.rol = token.rol as Rol;
      session.user.cargoId = (token.cargoId as number | null) ?? null;
      return session;
    },
  },
});
