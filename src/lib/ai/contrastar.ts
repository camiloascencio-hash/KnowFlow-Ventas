import Anthropic from "@anthropic-ai/sdk";

export const TIPOS_DIVERGENCIA = [
  "conocimiento_no_documentado",
  "atajo_riesgoso",
  "manual_desactualizado",
  "error_tipico_novato",
] as const;

export type TipoDivergencia = (typeof TIPOS_DIVERGENCIA)[number];
export type FuenteContraste = { manual: string; relatoExperto: string; errores: string };
export type DivergenciaPropuesta = {
  tipo: TipoDivergencia;
  descripcion: string;
  evidenciaManual?: string;
  evidenciaOperacion: string;
  riesgo: string;
  recomendacion: string;
};

/** Rejects unsupported types and any claim that cannot be traced to the input. */
export function validarDivergencias(
  fuentes: FuenteContraste,
  candidatas: DivergenciaPropuesta[]
): DivergenciaPropuesta[] {
  const operacion = `${fuentes.relatoExperto}\n${fuentes.errores}`;
  return candidatas.filter((item) => {
    const tipoValido = TIPOS_DIVERGENCIA.includes(item.tipo);
    const manualValido = !item.evidenciaManual || fuentes.manual.includes(item.evidenciaManual);
    const operacionValida = operacion.includes(item.evidenciaOperacion);
    return tipoValido && manualValido && operacionValida;
  });
}

const TOOL: Anthropic.Tool = {
  name: "registrar_divergencias",
  description: "Registra solo divergencias demostrables entre las fuentes entregadas.",
  input_schema: {
    type: "object",
    properties: {
      divergencias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: [...TIPOS_DIVERGENCIA] },
            descripcion: { type: "string" },
            evidencia_manual: { type: "string" },
            evidencia_operacion: { type: "string" },
            riesgo: { type: "string" },
            recomendacion: { type: "string" },
          },
          required: ["tipo", "descripcion", "evidencia_operacion", "riesgo", "recomendacion"],
        },
      },
    },
    required: ["divergencias"],
  },
};

/** Uses a structured Anthropic call. Callers must mark the contrast as failed on error. */
export async function contrastarConIA(fuentes: FuenteContraste): Promise<DivergenciaPropuesta[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("No hay ANTHROPIC_API_KEY: el contraste se conserva para reintento.");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1600,
    system: "Compara únicamente los textos entregados. No inventes procedimientos, montos ni políticas. Cada divergencia debe citar literalmente evidencia de operación y, si existe, del manual. Si no hay evidencia, omítela.",
    messages: [{ role: "user", content: `MANUAL\n${fuentes.manual}\n\nRELATO EXPERTO\n${fuentes.relatoExperto}\n\nERRORES OPERACIONALES\n${fuentes.errores}` }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "registrar_divergencias" },
  });
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("La IA no devolvió divergencias estructuradas.");
  const input = toolUse.input as { divergencias: Array<Record<string, string>> };
  return validarDivergencias(
    fuentes,
    input.divergencias.map((item) => ({
      tipo: item.tipo as TipoDivergencia,
      descripcion: item.descripcion,
      evidenciaManual: item.evidencia_manual || undefined,
      evidenciaOperacion: item.evidencia_operacion,
      riesgo: item.riesgo,
      recomendacion: item.recomendacion,
    }))
  );
}
