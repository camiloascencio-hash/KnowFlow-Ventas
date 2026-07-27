/**
 * Agente redactor de borradores: cierra el ciclo de aprendizaje.
 *
 * A partir de una BRECHA detectada (tema que los trabajadores preguntan y no
 * está documentado), genera un BORRADOR ESQUELETO para que un experto humano lo
 * complete y luego se valide. NO inventa el procedimiento —no lo conoce, por eso
 * es una brecha—: organiza las dudas reales de los trabajadores en preguntas
 * concretas y deja marcadores [COMPLETAR] para el experto.
 */
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { cosineSimilarity } from "@/lib/embeddings";

type UnidadBorrador = {
  tipo:
    | "ficha_producto"
    | "argumentario"
    | "objecion"
    | "comparativa"
    | "promocion"
    | "procedimiento";
  titulo: string;
  criticidad: "alta" | "media" | "baja";
  contenidoMarkdown: string;
};

const TOOL_BORRADOR: Anthropic.Tool = {
  name: "registrar_borrador",
  description:
    "Registra el borrador esqueleto del conocimiento comercial faltante para que un vendedor experto lo complete.",
  input_schema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: [
          "ficha_producto",
          "argumentario",
          "objecion",
          "comparativa",
          "promocion",
          "procedimiento",
        ],
        description:
          "Formato que corresponde al tema: ficha_producto, argumentario, objecion (el cliente dice un 'no'), comparativa (contra otro modelo o marca), promocion (canje, bono, cuotas) o procedimiento (garantía, postventa, trámite).",
      },
      titulo: {
        type: "string",
        description:
          "Título corto y buscable del conocimiento faltante, como lo preguntaría un vendedor. Sin punto final.",
      },
      criticidad: {
        type: "string",
        enum: ["alta", "media", "baja"],
        description:
          "Criticidad estimada: alta si equivocarse cuesta la venta o genera reclamo/problema legal (garantía, precios, promociones), media si afecta la experiencia del cliente, baja en otro caso.",
      },
      contenido_markdown: {
        type: "string",
        description:
          "Borrador en markdown. DEBE incluir: (1) una nota inicial de que es un borrador generado por IA a partir de una brecha, (2) una sección '## Preguntas que debe resolver' con las dudas reales de los vendedores, (3) una sección con el contenido a completar, con marcadores '[COMPLETAR: ...]'. NO inventes precios, especificaciones, coberturas, deducibles ni mecánicas reales.",
      },
    },
    required: ["tipo", "titulo", "criticidad", "contenido_markdown"],
  },
};

export type ResultadoBorrador = { unidadId: number; demo: boolean };

/** Genera un borrador esqueleto a partir de una brecha y lo deja en estado borrador. */
export async function redactarBorradorDesdeBrecha(
  brechaId: number
): Promise<ResultadoBorrador> {
  const [brecha] = await db
    .select()
    .from(schema.brechas)
    .where(eq(schema.brechas.id, brechaId))
    .limit(1);
  if (!brecha) throw new Error("Brecha no encontrada");

  const cargoId = brecha.cargoId;

  // Dudas reales de los trabajadores relacionadas con la brecha (últimos 30 días)
  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recientes = await db
    .select({
      texto: schema.consultas.textoPregunta,
      embedding: schema.consultas.embedding,
      resuelta: schema.consultas.resuelta,
    })
    .from(schema.consultas)
    .where(
      and(
        eq(schema.consultas.cargoId, cargoId),
        gte(schema.consultas.timestamp, desde),
        isNotNull(schema.consultas.embedding)
      )
    );

  const relacionadas = recientes
    .filter(
      (c) =>
        !c.resuelta &&
        brecha.embedding &&
        c.embedding &&
        cosineSimilarity(c.embedding, brecha.embedding) >= 0.6
    )
    .map((c) => c.texto);
  const preguntas = [...new Set(relacionadas)].slice(0, 12);
  const dudas = preguntas.length ? preguntas : [brecha.temaDetectado];

  const [cargo] = await db
    .select()
    .from(schema.cargos)
    .where(eq(schema.cargos.id, cargoId))
    .limit(1);

  // Experto del cargo al que se le asigna el borrador (para que lo vea)
  const [experto] = await db
    .select()
    .from(schema.usuarios)
    .where(
      and(eq(schema.usuarios.rol, "experto"), eq(schema.usuarios.cargoId, cargoId))
    )
    .limit(1);

  const { unidad, demo } = process.env.ANTHROPIC_API_KEY
    ? await generarBorrador(brecha.temaDetectado, dudas, cargo?.nombre ?? "el cargo")
    : { unidad: borradorDemo(brecha.temaDetectado, dudas), demo: true };

  const [nueva] = await db
    .insert(schema.unidadesConocimiento)
    .values({
      cargoId,
      tipo: unidad.tipo,
      titulo: unidad.titulo,
      contenidoMarkdown: unidad.contenidoMarkdown,
      criticidad: unidad.criticidad,
      estado: "borrador",
      autorExpertoId: experto?.id ?? null,
    })
    .returning();

  // La brecha pasa a "en proceso": ya hay un borrador en camino.
  await db
    .update(schema.brechas)
    .set({ estado: "en_proceso" })
    .where(eq(schema.brechas.id, brechaId));

  return { unidadId: nueva.id, demo };
}

async function generarBorrador(
  tema: string,
  dudas: string[],
  cargoNombre: string
): Promise<{ unidad: UnidadBorrador; demo: boolean }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `Eres el asistente de KnowFlow Ventas. Se detectó una BRECHA de conocimiento en el cargo "${cargoNombre}" (vendedores de tecnología en retail en Chile): los vendedores preguntan repetidamente sobre un tema y NO existe conocimiento validado. Genera un BORRADOR ESQUELETO para que un VENDEDOR EXPERTO lo complete y luego se valide, usando la herramienta registrar_borrador. Fidelidad total: NO inventes precios, especificaciones, coberturas, deducibles, plazos ni mecánicas (no los conoces). Convierte las dudas de los vendedores en las preguntas concretas que el experto debe responder, y deja marcadores "[COMPLETAR: ...]" donde falte el conocimiento real. Español de Chile, tono práctico de piso de venta.`,
    messages: [
      {
        role: "user",
        content: `Tema de la brecha: "${tema}"\n\nDudas reales de los vendedores:\n${dudas
          .map((d) => `- ${d}`)
          .join("\n")}`,
      },
    ],
    tools: [TOOL_BORRADOR],
    tool_choice: { type: "tool", name: "registrar_borrador" },
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { unidad: borradorDemo(tema, dudas), demo: true };
  }
  const input = toolUse.input as {
    tipo: UnidadBorrador["tipo"];
    titulo: string;
    criticidad: UnidadBorrador["criticidad"];
    contenido_markdown: string;
  };
  return {
    unidad: {
      tipo: input.tipo,
      titulo: input.titulo,
      criticidad: input.criticidad,
      contenidoMarkdown: input.contenido_markdown,
    },
    demo: false,
  };
}

/** Esqueleto de MODO DEMO, sin llamar a la API. */
function borradorDemo(tema: string, dudas: string[]): UnidadBorrador {
  const titulo = tema.length > 70 ? tema.slice(0, 67) + "…" : tema;
  const contenidoMarkdown = `> ✨ Borrador generado por IA a partir de una brecha detectada. Un experto debe completarlo antes de enviarlo a validación.

## Preguntas que debe resolver

${dudas.map((d) => `- ${d}`).join("\n")}

## Contenido (a completar por el vendedor experto)

1. [COMPLETAR: qué debe saber el vendedor]
2. [COMPLETAR: cómo explicárselo al cliente]

## Frases que funcionan

- [COMPLETAR: frase exacta para decirle al cliente]

## Errores frecuentes

- [COMPLETAR: qué NO prometer]`;

  return { tipo: "procedimiento", titulo, criticidad: "media", contenidoMarkdown };
}
