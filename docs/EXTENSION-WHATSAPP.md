# Punto de extensión: canal WhatsApp

El MVP entrega el agente por chat web, pero toda la lógica del agente es
**agnóstica del canal**. El cerebro vive en `src/lib/rag.ts`:

```ts
responderConsulta({ usuarioId, cargoId, pregunta })
// → { consultaId, respuesta, resuelta, fuentes, demo }
```

`POST /api/chat` (src/app/api/chat/route.ts) es solo un adaptador del canal
web: autentica la sesión, extrae `pregunta` y delega.

## Cómo conectar WhatsApp (ej. WhatsApp Business Cloud API)

1. **Crear el webhook**: `src/app/api/webhooks/whatsapp/route.ts` con:
   - `GET` para el reto de verificación de Meta (`hub.challenge`).
   - `POST` que recibe el mensaje entrante.
2. **Mapear teléfono → usuario**: agregar columna `telefono` a `usuarios` y
   resolver `usuarioId`/`cargoId` desde el número del remitente. Números no
   registrados: responder con instrucciones de enrolamiento.
3. **Delegar al agente**: llamar `responderConsulta()` igual que el canal web.
4. **Responder**: enviar `respuesta` + títulos de `fuentes` por la API de
   Meta. El rating 👍/👎 se mapea a botones interactivos de WhatsApp que
   llaman `POST /api/consultas/[id]/rating` (requerirá un token de servicio
   en lugar de la sesión NextAuth; ver nota).
5. **Escalamiento**: el botón "Escalar" se mapea igual contra
   `POST /api/consultas/[id]/escalar`.

> Nota de auth: los endpoints de rating/escalar validan sesión NextAuth.
> Para canales externos, extraer la lógica a `src/lib/consultas.ts` (igual
> que se hizo con `responderConsulta`) y autenticar el webhook con el
> token de verificación de Meta.

La trazabilidad (tabla `consultas`) y la detección de brechas funcionan sin
cambios: son independientes del canal de entrada.
