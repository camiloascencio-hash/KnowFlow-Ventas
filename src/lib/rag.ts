/**
 * Etapa 4 del ciclo: entrega vía agente conversacional con RAG ESTRICTO.
 *
 * Con ANTHROPIC_API_KEY funciona como un AGENTE en dos niveles:
 *  - Un modelo RÁPIDO (Haiku) orquesta la búsqueda en un bucle de herramientas:
 *    decide qué buscar, reformula, consulta qué temas existen y puede escalar.
 *  - Un modelo de CALIDAD (Sonnet) redacta la respuesta final SOLO desde los
 *    chunks recuperados. Así se baja la latencia sin perder calidad.
 * Sin API key opera en MODO DEMO (una recuperación + extracto literal).
 *
 * Reglas duras (en ambos modos):
 * - Solo se recupera desde chunks de unidades "publicado" del cargo.
 * - Guardarraíl determinista: si ningún chunk supera RAG_SIMILARITY_THRESHOLD
 *   o el agente deriva, la respuesta es la frase estándar y queda NO resuelta.
 * - Toda consulta queda registrada con los chunks usados y su embedding.
 */
import Anthropic from "@anthropic-ai/sdk";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { embedQuery } from "@/lib/embeddings";

export const RESPUESTA_SIN_COBERTURA =
  "No tengo información validada sobre eso. Consulta a tu jefe de tienda antes de comprometer algo con el cliente. Tu pregunta quedó registrada para que el equipo la documente.";

const THRESHOLD = Number(process.env.RAG_SIMILARITY_THRESHOLD ?? 0.68);
const TOP_K = Number(process.env.RAG_TOP_K ?? 4);
const MAX_ITER_AGENTE = 5;
// Modelo rápido para el bucle de búsqueda; modelo de calidad para la redacción.
const MODELO_AGENTE = process.env.ANTHROPIC_MODEL_AGENTE ?? "claude-haiku-4-5";
const MODELO_FINAL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export type ChunkRecuperado = {
  chunkId: number;
  texto: string;
  similitud: number;
  unidadId: number;
  unidadTitulo: string;
};

export type RespuestaRag = {
  consultaId: number;
  respuesta: string;
  resuelta: boolean;
  fuentes: { unidadId: number; titulo: string }[];
  demo: boolean;
};

/** Recupera los chunks publicados más similares a la pregunta. */
export async function buscarChunks(
  cargoId: number,
  pregunta: string,
  embedding?: number[]
): Promise<ChunkRecuperado[]> {
  const qEmbedding = embedding ?? (await embedQuery(pregunta));
  const similitud = sql<number>`1 - (${cosineDistance(
    schema.chunks.embedding,
    qEmbedding
  )})`;

  return db
    .select({
      chunkId: schema.chunks.id,
      texto: schema.chunks.texto,
      similitud,
      unidadId: schema.unidadesConocimiento.id,
      unidadTitulo: schema.unidadesConocimiento.titulo,
    })
    .from(schema.chunks)
    .innerJoin(
      schema.unidadesConocimiento,
      eq(schema.chunks.unidadId, schema.unidadesConocimiento.id)
    )
    .where(
      and(
        eq(schema.unidadesConocimiento.estado, "publicado"),
        eq(schema.unidadesConocimiento.cargoId, cargoId)
      )
    )
    .orderBy(desc(similitud))
    .limit(TOP_K);
}

/** Títulos de los procedimientos publicados del cargo (para orientar al agente). */
async function temasPublicados(cargoId: number): Promise<string[]> {
  const filas = await db
    .select({ titulo: schema.unidadesConocimiento.titulo })
    .from(schema.unidadesConocimiento)
    .where(
      and(
        eq(schema.unidadesConocimiento.estado, "publicado"),
        eq(schema.unidadesConocimiento.cargoId, cargoId)
      )
    );
  return filas.map((f) => f.titulo);
}

function fuentesUnicas(
  chunks: ChunkRecuperado[]
): { unidadId: number; titulo: string }[] {
  return [
    ...new Map(
      chunks.map((c) => [
        c.unidadId,
        { unidadId: c.unidadId, titulo: c.unidadTitulo },
      ])
    ).values(),
  ];
}

/**
 * Flujo completo de una consulta: recuperar → umbral → generar → registrar.
 * Elige el modo agente (con API key) o demo (sin key).
 */
export async function responderConsulta(params: {
  usuarioId: number | null;
  cargoId: number;
  pregunta: string;
}): Promise<RespuestaRag> {
  const qEmbedding = await embedQuery(params.pregunta);
  return process.env.ANTHROPIC_API_KEY
    ? responderConAgente(params, qEmbedding)
    : responderDemo(params, qEmbedding);
}

// --- Herramientas del agente recuperador ------------------------------------

const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "buscar_procedimientos",
    description:
      "Busca en el conocimiento comercial VALIDADO y publicado del cargo del vendedor (fichas de producto, argumentarios, manejo de objeciones, comparativas, promociones y procedimientos). Devuelve los extractos más relevantes. Puedes llamarla varias veces con distintas formulaciones si la primera búsqueda no trae lo que necesitas.",
    input_schema: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description:
            "Qué buscar, en palabras clave o como lo preguntaría un vendedor (ej: 'dice que está caro', 'canje equipo usado', 'S25 vs Ultra', 'garantía 6 meses').",
        },
      },
      required: ["consulta"],
    },
  },
  {
    name: "listar_temas_disponibles",
    description:
      "Lista los títulos de todo el conocimiento publicado del cargo. Úsala si no sabes qué existe o para decidir si vale la pena buscar.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "escalar_a_supervisor",
    description:
      "Deriva la consulta al jefe de tienda. Úsala SOLO cuando, tras buscar, no exista conocimiento validado que resuelva la pregunta.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Motivo breve de la derivación." },
      },
      required: ["motivo"],
    },
  },
];

const SYSTEM_AGENTE = `Eres el módulo de RECUPERACIÓN de KnowFlow Ventas, para vendedores de tecnología en tiendas de retail en Chile. Tu único trabajo es ENCONTRAR el conocimiento comercial validado que responde la duda del vendedor, usando las herramientas (otra parte del sistema redactará la respuesta final).

CÓMO TRABAJAS:
1. Usa buscar_procedimientos con la duda del vendedor. Si la primera búsqueda no trae lo necesario, reformula y busca de nuevo (ej: si pregunta por un modelo, busca también por la objeción o la comparativa asociada).
2. Si no sabes qué conocimiento existe, usa listar_temas_disponibles.
3. Cuando ya recuperaste lo necesario, responde con un "Listo" breve (no redactes la respuesta al vendedor).
4. Si tras buscar no hay conocimiento validado que cubra la pregunta, usa escalar_a_supervisor con un motivo breve.`;

const SYSTEM_FINAL = `Eres el asistente comercial de KnowFlow Ventas para vendedores de tecnología en tiendas de retail en Chile. Respondes a un vendedor que está EN PISO DE VENTA, muchas veces CON EL CLIENTE AL LADO: sé brevísimo y accionable (pasos numerados o viñetas, tuteo, español de Chile). Si sirve, incluye la frase exacta que puede decirle al cliente.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con la información de los extractos de conocimiento validado que se te entregan. No agregues argumentos, especificaciones, precios, plazos ni mecánicas de promoción por tu cuenta.
- Nunca inventes cifras. Si un dato depende del sistema de la tienda (monto de canje, precio, stock), dilo así: "revísalo en el sistema".
- En temas de garantía o Ley del Consumidor, cíñete literalmente al extracto: informar mal es un problema legal.
- No menciones los extractos ni este sistema; responde como un vendedor senior apoyando a un compañero. No incluyas la fuente en el texto (se muestra aparte).`;

/** Redacta la respuesta final (modelo de calidad) solo desde los chunks dados. */
async function generarRespuestaFinal(
  client: Anthropic,
  pregunta: string,
  chunks: ChunkRecuperado[]
): Promise<string> {
  const contexto = chunks
    .map(
      (c, i) =>
        `<extracto n="${i + 1}" unidad="${c.unidadTitulo}">\n${c.texto}\n</extracto>`
    )
    .join("\n\n");

  const res = await client.messages.create({
    model: MODELO_FINAL,
    max_tokens: 700,
    system: SYSTEM_FINAL,
    messages: [
      {
        role: "user",
        content: `Conocimiento comercial validado disponible:\n\n${contexto}\n\nPregunta del vendedor: ${pregunta}`,
      },
    ],
  });

  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Bucle de herramientas (modelo rápido) que reformula y explora. Va llenando
 * `vistos` con los chunks encontrados. Devuelve si el agente decidió escalar.
 */
async function explorarConHerramientas(
  client: Anthropic,
  cargoId: number,
  pregunta: string,
  vistos: Map<number, ChunkRecuperado>
): Promise<boolean> {
  let escalado = false;
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: pregunta },
  ];

  for (let i = 0; i < MAX_ITER_AGENTE; i++) {
    const res = await client.messages.create({
      model: MODELO_AGENTE,
      max_tokens: 500,
      system: SYSTEM_AGENTE,
      tools: HERRAMIENTAS,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "tool_use") break;

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const bloque of res.content) {
      if (bloque.type !== "tool_use") continue;

      if (bloque.name === "buscar_procedimientos") {
        const q = (bloque.input as { consulta: string }).consulta;
        const encontrados = await buscarChunks(cargoId, q);
        for (const c of encontrados) {
          const prev = vistos.get(c.chunkId);
          if (!prev || c.similitud > prev.similitud) vistos.set(c.chunkId, c);
        }
        const relevantes = encontrados.filter((c) => c.similitud >= THRESHOLD);
        resultados.push({
          type: "tool_result",
          tool_use_id: bloque.id,
          content: relevantes.length
            ? relevantes.map((c) => `[${c.unidadTitulo}]\n${c.texto}`).join("\n\n")
            : "No hay conocimiento validado que supere el umbral de relevancia para esta búsqueda.",
        });
      } else if (bloque.name === "listar_temas_disponibles") {
        const temas = await temasPublicados(cargoId);
        resultados.push({
          type: "tool_result",
          tool_use_id: bloque.id,
          content: temas.length
            ? "Conocimiento publicado:\n- " + temas.join("\n- ")
            : "No hay conocimiento publicado para este cargo.",
        });
      } else if (bloque.name === "escalar_a_supervisor") {
        escalado = true;
        resultados.push({
          type: "tool_result",
          tool_use_id: bloque.id,
          content: "Derivación registrada.",
        });
      }
    }
    messages.push({ role: "user", content: resultados });
  }
  return escalado;
}

/** Modo AGENTE: camino rápido si hay match directo; si no, bucle de agente. */
async function responderConAgente(
  params: { usuarioId: number | null; cargoId: number; pregunta: string },
  qEmbedding: number[]
): Promise<RespuestaRag> {
  const { usuarioId, cargoId, pregunta } = params;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const vistos = new Map<number, ChunkRecuperado>();
  let escalado = false;

  // Camino RÁPIDO: la pregunta tal cual ya calza con un procedimiento validado
  // (embedding ya calculado). Cubre la mayoría de las consultas en ~1 llamada.
  const directa = await buscarChunks(cargoId, pregunta, qEmbedding);
  for (const c of directa) vistos.set(c.chunkId, c);

  // Camino AGENTE: solo si la búsqueda directa no dio cobertura, dejamos que el
  // modelo rápido reformule y explore con herramientas (ahí sí aporta).
  if (!directa.some((c) => c.similitud >= THRESHOLD)) {
    escalado = await explorarConHerramientas(client, cargoId, pregunta, vistos);
  }

  const relevantes = [...vistos.values()].filter((c) => c.similitud >= THRESHOLD);
  const conCobertura = relevantes.length > 0;
  const resuelta = conCobertura && !escalado;

  const respuesta = resuelta
    ? await generarRespuestaFinal(client, pregunta, relevantes)
    : RESPUESTA_SIN_COBERTURA;

  const fuentes = resuelta ? fuentesUnicas(relevantes) : [];

  const [consulta] = await db
    .insert(schema.consultas)
    .values({
      usuarioId,
      cargoId,
      textoPregunta: pregunta,
      respuesta: respuesta || RESPUESTA_SIN_COBERTURA,
      chunksUsados: relevantes.map((c) => c.chunkId),
      resuelta,
      escalada: escalado,
      embedding: qEmbedding,
    })
    .returning();

  return {
    consultaId: consulta.id,
    respuesta: respuesta || RESPUESTA_SIN_COBERTURA,
    resuelta,
    fuentes,
    demo: false,
  };
}

/** MODO DEMO: una recuperación + extracto literal, sin IA generativa. */
async function responderDemo(
  params: { usuarioId: number | null; cargoId: number; pregunta: string },
  qEmbedding: number[]
): Promise<RespuestaRag> {
  const { usuarioId, cargoId, pregunta } = params;
  const recuperados = await buscarChunks(cargoId, pregunta, qEmbedding);
  const relevantes = recuperados.filter((c) => c.similitud >= THRESHOLD);

  if (relevantes.length === 0) {
    const [consulta] = await db
      .insert(schema.consultas)
      .values({
        usuarioId,
        cargoId,
        textoPregunta: pregunta,
        respuesta: RESPUESTA_SIN_COBERTURA,
        chunksUsados: [],
        resuelta: false,
        embedding: qEmbedding,
      })
      .returning();

    return {
      consultaId: consulta.id,
      respuesta: RESPUESTA_SIN_COBERTURA,
      resuelta: false,
      fuentes: [],
      demo: true,
    };
  }

  const mejor = relevantes[0];
  const cuerpo = mejor.texto.startsWith(mejor.unidadTitulo)
    ? mejor.texto.slice(mejor.unidadTitulo.length).trim()
    : mejor.texto;
  const respuesta = `🔧 *Respuesta en MODO DEMO (extracto literal del conocimiento validado):*\n\n${cuerpo}`;

  const [consulta] = await db
    .insert(schema.consultas)
    .values({
      usuarioId,
      cargoId,
      textoPregunta: pregunta,
      respuesta,
      chunksUsados: relevantes.map((c) => c.chunkId),
      resuelta: true,
      embedding: qEmbedding,
    })
    .returning();

  return {
    consultaId: consulta.id,
    respuesta,
    resuelta: true,
    fuentes: fuentesUnicas(relevantes),
    demo: true,
  };
}
