/**
 * Envío de correo transaccional vía Resend.
 *
 * Se llama por fetch directo a su API REST (mismo patrón que embeddings.ts
 * con Gemini) en vez de sumar el SDK como dependencia.
 *
 * Sin RESEND_API_KEY configurada, no se intenta la llamada de red: se deja
 * constancia en el log y quien llama decide qué mostrar (p. ej. el enlace de
 * verificación en el aviso del admin). Así el flujo completo es probable en
 * desarrollo sin depender de una cuenta externa, y basta con agregar la key
 * en producción para que empiece a enviar de verdad — sin tocar código.
 */
const API_BASE = "https://api.resend.com/emails";
const REMITENTE_POR_DEFECTO = "KnowFlow <onboarding@resend.dev>";

export type ResultadoEnvio =
  | { enviado: true }
  | { enviado: false; motivo: "sin_configurar" | "error_proveedor"; detalle?: string };

export async function enviarCorreo(params: {
  para: string;
  asunto: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[correo] RESEND_API_KEY no configurada — no se envía "${params.asunto}" a ${params.para}.`
    );
    return { enviado: false, motivo: "sin_configurar" };
  }

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? REMITENTE_POR_DEFECTO,
      to: params.para,
      subject: params.asunto,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    console.error(`[correo] Resend respondió ${response.status}: ${detalle}`);
    return { enviado: false, motivo: "error_proveedor", detalle };
  }

  return { enviado: true };
}
