import { randomBytes, createHash } from "crypto";
import { enviarCorreo, type ResultadoEnvio } from "@/lib/correo";

/** Vigencia del enlace de confirmación. Suficiente para un onboarding que no pasa el mismo día. */
export const HORAS_EXPIRACION_TOKEN = 48;

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    "http://localhost:3100"
  );
}

/** Token de un solo uso: se guarda solo el hash, nunca el valor en claro. */
export function generarTokenVerificacion(): { token: string; hash: string; expira: Date } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expira = new Date(Date.now() + HORAS_EXPIRACION_TOKEN * 3600_000);
  return { token, hash, expira };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function urlVerificacion(token: string): string {
  return `${baseUrl()}/verificar?token=${token}`;
}

function plantillaInvitacion(nombre: string, url: string): string {
  // Estilos inline: la mayoría de los clientes de correo ignoran <style>.
  return `
    <div style="font-family:Arial,sans-serif;background:#F5F5F5;padding:32px 16px">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-top:3px solid #14d2f3">
        <div style="padding:32px 28px">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0A66E3">
            KnowFlow
          </p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;letter-spacing:-.02em;color:#04122D">
            Confirma tu cuenta
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2B3A55">
            Hola ${nombre}, tu administrador creó una cuenta para ti en KnowFlow.
            Confirma que esta es tu dirección de correo para poder ingresar.
          </p>
          <a href="${url}"
             style="display:inline-block;margin:8px 0 20px;padding:13px 28px;background:#0A66E3;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px">
            Confirmar mi cuenta
          </a>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#5B6B87">
            Este enlace vence en ${HORAS_EXPIRACION_TOKEN} horas y solo funciona una vez.
            Si tú no esperabas este correo, ignóralo.
          </p>
        </div>
      </div>
    </div>`;
}

/** Envía (o deja constancia de) el correo de confirmación para un usuario recién creado. */
export function enviarCorreoVerificacion(
  destino: { nombre: string; email: string },
  token: string
): Promise<ResultadoEnvio> {
  return enviarCorreo({
    para: destino.email,
    asunto: "Confirma tu cuenta de KnowFlow",
    html: plantillaInvitacion(destino.nombre, urlVerificacion(token)),
  });
}

export { urlVerificacion };
