"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashToken } from "@/lib/verificacion";

/**
 * Confirma la cuenta a partir del token del enlace de correo.
 *
 * Deliberadamente NO se confirma con un simple GET al abrir el enlace:
 * muchos clientes de correo (Outlook, escáneres antispam corporativos)
 * pre-visitan los links de un mensaje para revisarlos por malware antes de
 * que la persona lo abra, lo que consumiría el token sin que nadie lo haya
 * clickeado. Por eso la página solo muestra un botón, y este action —que
 * requiere una interacción real— es el que hace el cambio.
 */
export async function confirmarCuentaAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/verificar?error=falta_token");

  const hash = hashToken(token);
  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.tokenVerificacionHash, hash))
    .limit(1);

  if (!usuario) redirect("/verificar?error=invalido");
  if (
    !usuario.tokenVerificacionExpira ||
    usuario.tokenVerificacionExpira < new Date()
  ) {
    redirect("/verificar?error=vencido");
  }

  await db
    .update(schema.usuarios)
    .set({
      emailVerificadoEn: new Date(),
      tokenVerificacionHash: null,
      tokenVerificacionExpira: null,
    })
    .where(eq(schema.usuarios.id, usuario.id));

  redirect("/login?ok=Cuenta confirmada. Ya puedes ingresar.");
}
