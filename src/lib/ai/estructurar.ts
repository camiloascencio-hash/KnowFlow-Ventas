/**
 * Etapa 2 del ciclo: estructuración con IA.
 * Convierte el texto libre de un experto en una unidad de conocimiento
 * estandarizada (tipo, título, criticidad y markdown limpio).
 *
 * Sin ANTHROPIC_API_KEY opera en MODO DEMO con una heurística simple,
 * para que el flujo completo sea demostrable sin credenciales.
 */
import Anthropic from "@anthropic-ai/sdk";

export type TipoUnidad =
  | "ficha_producto"
  | "argumentario"
  | "objecion"
  | "comparativa"
  | "promocion"
  | "procedimiento";

export type UnidadEstructurada = {
  tipo: TipoUnidad;
  titulo: string;
  criticidad: "alta" | "media" | "baja";
  contenidoMarkdown: string;
};

export type ResultadoEstructuracion = {
  unidad: UnidadEstructurada;
  demo: boolean;
};

const TOOL_SCHEMA = {
  name: "registrar_unidad",
  description:
    "Registra la unidad de conocimiento estructurada a partir del relato del experto.",
  input_schema: {
    type: "object" as const,
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
          "ficha_producto: qué es el producto y a quién recomendárselo. argumentario: cómo presentar o demostrar un beneficio para vender. objecion: cómo responder a un 'no' del cliente (caro, prefiero otra marca, lo voy a pensar). comparativa: este producto frente a otro modelo o marca. promocion: mecánica de una promoción, canje, bono o financiamiento vigente. procedimiento: trámite operativo o legal (garantía, traspaso de datos, postventa).",
      },
      titulo: {
        type: "string",
        description:
          "Título corto y buscable, como lo preguntaría un vendedor nuevo con el cliente al lado. Sin punto final.",
      },
      criticidad: {
        type: "string",
        enum: ["alta", "media", "baja"],
        description:
          "alta: equivocarse cuesta la venta, genera reclamo o problema legal (garantía, Ley 19.496, promesas sobre precios o promociones). media: afecta la experiencia del cliente o la conversión. baja: mejora la venta pero sin impacto grave.",
      },
      contenido_markdown: {
        type: "string",
        description:
          "El conocimiento en markdown limpio y accionable para usar EN PISO DE VENTA: encabezados ##, pasos numerados, y cuando corresponda las secciones 'Cuándo aplica', 'Pasos', 'Frases que funcionan' y 'Errores frecuentes'. Para comparativas puedes usar una tabla. Conserva TODO el conocimiento del experto, solo ordénalo. No inventes precios, especificaciones, plazos ni mecánicas que el experto no mencionó: si un dato depende del sistema, indícalo así.",
      },
    },
    required: ["tipo", "titulo", "criticidad", "contenido_markdown"],
  },
};

export async function estructurarConocimiento(
  textoLibre: string,
  cargoNombre: string
): Promise<ResultadoEstructuracion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { unidad: estructurarDemo(textoLibre), demo: true };
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `Eres el motor de estructuración de KnowFlow Ventas, un sistema de gestión del conocimiento comercial para vendedores de tecnología en tiendas de retail en Chile. Un vendedor experto del cargo "${cargoNombre}" relata en texto libre cómo vende, cómo responde a una objeción o cómo explica un producto. Tu tarea es estructurar ese relato en una unidad de conocimiento estandarizada usando la herramienta registrar_unidad. Escribe en español de Chile, tono directo y práctico, pensado para leerse rápido con un cliente al lado (tutea al vendedor). Fidelidad total: no agregues argumentos, precios ni especificaciones que el experto no dijo.`,
    messages: [{ role: "user", content: textoLibre }],
    tools: [TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "registrar_unidad" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("La IA no devolvió una unidad estructurada");
  }
  const input = toolUse.input as {
    tipo: UnidadEstructurada["tipo"];
    titulo: string;
    criticidad: UnidadEstructurada["criticidad"];
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

/** Heurística de MODO DEMO: estructura razonable sin llamar a la API. */
export function estructurarDemo(textoLibre: string): UnidadEstructurada {
  const texto = textoLibre.trim();
  const lower = texto.toLowerCase();

  // Detección del tipo por el vocabulario del relato del vendedor
  let tipo: UnidadEstructurada["tipo"] = "procedimiento";
  if (/caro|no me alcanza|lo voy a pensar|objeci|me dice que|prefiero/.test(lower)) {
    tipo = "objecion";
  } else if (/\bvs\b|versus|compar|diferencia entre|frente a/.test(lower)) {
    tipo = "comparativa";
  } else if (/promoci|canje|retoma|bono|cuotas|descuento|financiamiento/.test(lower)) {
    tipo = "promocion";
  } else if (/demostr|mostrar|demo|argument|beneficio|cierre|vender/.test(lower)) {
    tipo = "argumentario";
  } else if (/pantalla|batería|bateria|cámara|camara|modelo|pulgadas|especific/.test(lower)) {
    tipo = "ficha_producto";
  }

  const criticidad: UnidadEstructurada["criticidad"] =
    /garant|ley|sernac|precio|boleta|reclamo|devoluci|legal|contrato/.test(lower)
      ? "alta"
      : "media";

  // Título: primera oración corta del relato
  const primeraOracion = texto.split(/[.\n]/)[0].trim();
  const titulo =
    primeraOracion.length > 80
      ? primeraOracion.slice(0, 77) + "..."
      : primeraOracion;

  // Pasos: una oración por línea
  const oraciones = texto
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-*]\s*/, ""))
    .filter((s) => s.length > 3);

  const cuerpo = oraciones.map((o, i) => `${i + 1}. ${o}`).join("\n");
  const encabezado = tipo === "objecion" ? "Cómo responder" : "Pasos";

  const contenidoMarkdown = `## ${encabezado}\n\n${cuerpo}\n\n> ⚠️ Estructurado en MODO DEMO (sin IA). Revisa y corrige antes de enviar a validación.`;

  return { tipo, titulo: titulo || "Nueva unidad de conocimiento", criticidad, contenidoMarkdown };
}
