import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  CODIGO_CUENTA_SIN_VERIFICAR,
  hashPassword,
  verifyStoredPassword,
} from "@/lib/auth-core";

// Reexportadas para no romper a quien ya las importaba desde "@/auth".
export { hashPassword, verifyPassword, verifyStoredPassword } from "@/lib/auth-core";

export type Rol = "trabajador_nuevo" | "experto" | "validador" | "admin";

/**
 * Error distinguible del "credenciales incorrectas" genérico: la contraseña
 * era correcta, pero la cuenta todavía no confirmó su correo.
 */
export class CuentaSinVerificarError extends CredentialsSignin {
  code = CODIGO_CUENTA_SIN_VERIFICAR;
}

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

        if (!user.emailVerificadoEn) {
          throw new CuentaSinVerificarError();
        }

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
