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
import {
  compararProductos,
  consultarFichaTecnica,
  detectarIntencionCatalogo,
  especificacionesDe,
  explicarTecnicismo,
  filtrarEspecificaciones,
  construirFilas,
  pideElPrecio,
  resolverPrecio,
  tokensSinCubrir,
} from "@/lib/catalogo";
import {
  candidatosParaAgente,
  etiquetaFicha,
  fichaParaAgente,
  renderComparacion,
  renderFicha,
  renderTecnicismo,
  tecnicismoParaAgente,
} from "@/lib/catalogo-respuestas";

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

/**
 * Una fuente citada. Se distingue el tipo porque no valen lo mismo: una unidad
 * de conocimiento la escribió y validó una persona; una ficha técnica es un
 * dato duro del catálogo, con su fecha de verificación a la vista.
 */
export type Fuente = {
  tipo: "unidad" | "ficha_tecnica" | "glosario";
  etiqueta: string;
  unidadId?: number;
  productoId?: number;
  verificadoEn?: Date | null;
};

export type RespuestaRag = {
  consultaId: number;
  respuesta: string;
  resuelta: boolean;
  fuentes: Fuente[];
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

function fuentesUnicas(chunks: ChunkRecuperado[]): Fuente[] {
  return [
    ...new Map(
      chunks.map((c) => [
        c.unidadId,
        {
          tipo: "unidad" as const,
          etiqueta: c.unidadTitulo,
          unidadId: c.unidadId,
        },
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
  // Camino RÁPIDO DE FICHA: antes incluso de embeber la pregunta. Si el texto
  // nombra un producto del catálogo y pide un dato duro, la tabla lo responde
  // exacto y en <1s, contra los 7-16s del camino semántico.
  const porFicha = await intentarCaminoDeFicha(params);
  if (porFicha) return porFicha;

  const qEmbedding = await embedQuery(params.pregunta);
  return process.env.ANTHROPIC_API_KEY
    ? responderConAgente(params, qEmbedding)
    : responderDemo(params, qEmbedding);
}

/** Registra la consulta y arma la respuesta. `embedding` puede ir nulo cuando
 * se resolvió por catálogo sin necesidad de embeber la pregunta. */
async function registrar(params: {
  usuarioId: number | null;
  cargoId: number;
  pregunta: string;
  respuesta: string;
  resuelta: boolean;
  escalada?: boolean;
  chunksUsados?: number[];
  embedding?: number[] | null;
  fuentes: Fuente[];
  demo: boolean;
}): Promise<RespuestaRag> {
  const [consulta] = await db
    .insert(schema.consultas)
    .values({
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      textoPregunta: params.pregunta,
      respuesta: params.respuesta,
      chunksUsados: params.chunksUsados ?? [],
      resuelta: params.resuelta,
      escalada: params.escalada ?? false,
      embedding: params.embedding ?? null,
    })
    .returning();

  return {
    consultaId: consulta.id,
    respuesta: params.respuesta,
    resuelta: params.resuelta,
    fuentes: params.fuentes,
    demo: params.demo,
  };
}

/**
 * Intenta responder solo con el catálogo. Devuelve null —y la consulta sigue
 * el camino normal— salvo que la tabla cubra la pregunta COMPLETA.
 *
 * Ese "completa" es el freno importante: "¿cuánta batería tiene el S26 Ultra?"
 * no deja ninguna palabra sin explicar y se contesta de la tabla; "¿el A57
 * tiene carga inalámbrica?" deja "inalámbrica" sin cubrir, así que NO se
 * responde por aquí: pasa al agente, que al no encontrar el dato deriva al
 * jefe de tienda. Contestar con las specs de batería sería responder otra cosa.
 */
async function intentarCaminoDeFicha(params: {
  usuarioId: number | null;
  cargoId: number;
  pregunta: string;
}): Promise<RespuestaRag | null> {
  const { pregunta } = params;
  const intencion = await detectarIntencionCatalogo(pregunta);
  const demo = !process.env.ANTHROPIC_API_KEY;

  if (intencion.tipo === "ficha") {
    const { producto, atributos } = intencion;
    const todas = await especificacionesDe(producto.id);
    const specs = filtrarEspecificaciones(todas, atributos);
    const precio = resolverPrecio(producto);
    const quierePrecio = pideElPrecio(pregunta);

    // Si pidió el precio y la regla no lo deja citar, no resolvemos por acá:
    // el dato no vigente tiene que terminar en derivación, no en una ficha.
    if (quierePrecio && !precio.citable) return null;
    if (specs.length === 0 && !quierePrecio) return null;

    const cubierto = [
      producto.modelo,
      ...producto.aliases,
      ...specs.map((s) => `${s.clave} ${s.valor} ${s.grupo}`),
    ];
    if (tokensSinCubrir(pregunta, cubierto).length > 0) return null;

    return registrar({
      ...params,
      respuesta: renderFicha(
        { producto, especificaciones: specs, precio },
        { incluirPrecio: quierePrecio }
      ),
      resuelta: true,
      fuentes: [fuenteDeFicha(producto)],
      demo,
    });
  }

  if (intencion.tipo === "comparacion") {
    const { productoA, productoB } = intencion;
    const [specsA, specsB] = await Promise.all([
      especificacionesDe(productoA.id),
      especificacionesDe(productoB.id),
    ]);
    const filas = construirFilas(specsA, specsB);
    if (filas.length === 0) return null;

    const quierePrecio = pideElPrecio(pregunta);
    const precioA = resolverPrecio(productoA);
    const precioB = resolverPrecio(productoB);
    if (quierePrecio && !(precioA.citable && precioB.citable)) return null;

    const cubierto = [
      productoA.modelo,
      productoB.modelo,
      ...productoA.aliases,
      ...productoB.aliases,
      ...filas.map((f) => `${f.clave} ${f.valorA ?? ""} ${f.valorB ?? ""} ${f.grupo}`),
    ];
    if (tokensSinCubrir(pregunta, cubierto).length > 0) return null;

    return registrar({
      ...params,
      respuesta: renderComparacion(
        productoA,
        productoB,
        filas,
        quierePrecio ? { a: precioA, b: precioB } : undefined
      ),
      resuelta: true,
      fuentes: [fuenteDeFicha(productoA), fuenteDeFicha(productoB)],
      demo,
    });
  }

  if (intencion.tipo === "glosario") {
    const t = intencion.termino;
    const cubierto = [t.termino, ...t.aliases, t.traduccionVenta];
    if (tokensSinCubrir(pregunta, cubierto).length > 0) return null;

    return registrar({
      ...params,
      respuesta: renderTecnicismo(t),
      resuelta: true,
      fuentes: [{ tipo: "glosario", etiqueta: `Glosario — ${t.termino}` }],
      demo,
    });
  }

  return null;
}

function fuenteDeFicha(producto: {
  id: number;
  modelo: string;
  verificadoEn: Date | null;
}): Fuente {
  return {
    tipo: "ficha_tecnica",
    etiqueta: etiquetaFicha(producto),
    productoId: producto.id,
    verificadoEn: producto.verificadoEn,
  };
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
  // --- Herramientas DETERMINISTAS del catálogo ------------------------------
  // Sin embeddings ni umbrales: leen la tabla. Un dato duro es exacto o no es.
  {
    name: "consultar_ficha_tecnica",
    description:
      "Devuelve la ficha técnica oficial de un producto del catálogo (specs exactas, colores, almacenamientos, precio con su vigencia). ÚSALA SIEMPRE que la pregunta sea por un dato duro de un modelo concreto: batería, pantalla, cámara, procesador, peso, resistencia, precio. Es exacta: no depende de búsqueda semántica. Si el modelo no es único te devuelve los candidatos para que repreguntes.",
    input_schema: {
      type: "object",
      properties: {
        modelo: {
          type: "string",
          description:
            "El modelo como lo dijo el vendedor: 'S26 Ultra', 's26u', 'el fold', 'A57'.",
        },
        atributos: {
          type: "array",
          items: { type: "string" },
          description:
            "Opcional. Acota la ficha a lo preguntado: ['bateria'], ['camara','pantalla'].",
        },
      },
      required: ["modelo"],
    },
  },
  {
    name: "comparar_productos",
    description:
      "Compara dos productos del catálogo y devuelve la tabla de diferencias, marcando cuáles son diferenciadores de venta. Úsala cuando el vendedor pregunte cuál conviene o pida una comparación entre dos modelos.",
    input_schema: {
      type: "object",
      properties: {
        modeloA: { type: "string", description: "Primer modelo." },
        modeloB: { type: "string", description: "Segundo modelo." },
        atributos: {
          type: "array",
          items: { type: "string" },
          description: "Opcional. Acota la comparación a ciertos atributos.",
        },
      },
      required: ["modeloA", "modeloB"],
    },
  },
  {
    name: "explicar_tecnicismo",
    description:
      "Traduce un término técnico a lenguaje de venta (qué es, cómo explicárselo a un cliente que no sabe nada, qué beneficio le da y qué NO se debe decir). Úsala cuando pregunten '¿qué es X?' o cómo explicarle algo técnico al cliente.",
    input_schema: {
      type: "object",
      properties: {
        termino: {
          type: "string",
          description: "Ej: 'Micro RGB', 'apertura f/1.4', 'IP68', 'pixel binning'.",
        },
      },
      required: ["termino"],
    },
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

TIENES DOS FUENTES DISTINTAS Y NO SON INTERCAMBIABLES:
- DATOS DUROS de un producto (batería, pantalla, cámara, procesador, peso, resistencia, precio) → consultar_ficha_tecnica / comparar_productos. Son exactos.
- CÓMO VENDER (argumentarios, objeciones, promociones, procedimientos) → buscar_procedimientos.
- QUÉ SIGNIFICA un término técnico → explicar_tecnicismo.

CÓMO TRABAJAS:
1. Si la pregunta menciona un modelo y pide un dato suyo, parte por consultar_ficha_tecnica. NO uses buscar_procedimientos para un dato duro: la búsqueda semántica puede traer algo parecido pero no exacto.
2. Usa buscar_procedimientos con la duda del vendedor. Si la primera búsqueda no trae lo necesario, reformula y busca de nuevo (ej: si pregunta por un modelo, busca también por la objeción o la comparativa asociada).
3. Si no sabes qué conocimiento existe, usa listar_temas_disponibles.
4. Cuando ya recuperaste lo necesario, responde con un "Listo" breve (no redactes la respuesta al vendedor).
5. Si tras buscar no hay conocimiento validado ni ficha que cubra la pregunta, usa escalar_a_supervisor con un motivo breve. Que la ficha del producto exista NO significa que responda la pregunta: si el dato puntual no está en ella, deriva.`;

const SYSTEM_FINAL = `Eres el asistente comercial de KnowFlow Ventas para vendedores de tecnología en tiendas de retail en Chile. Respondes a un vendedor que está EN PISO DE VENTA, muchas veces CON EL CLIENTE AL LADO: sé brevísimo y accionable (pasos numerados o viñetas, tuteo, español de Chile). Si sirve, incluye la frase exacta que puede decirle al cliente.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con la información de los extractos de conocimiento validado y de las fichas técnicas que se te entregan. No agregues argumentos, especificaciones, precios, plazos ni mecánicas de promoción por tu cuenta.
- Nunca inventes cifras. Si un dato depende del sistema de la tienda (monto de canje, precio, stock), dilo así: "revísalo en el sistema".
- Un dato que NO aparece en la ficha no existe para ti: no lo deduzcas de otro modelo, de la gama ni del precio. Di que no está confirmado y que lo revise con su jefe de tienda.
- PRECIOS: usa exactamente la frase de precio que venga en la ficha, tal cual. Si la ficha dice que el precio no está vigente, no des ninguna cifra: deriva al jefe de tienda.
- Si una spec viene marcada SIN VERIFICAR, dilo al entregarla.
- En temas de garantía o Ley del Consumidor, cíñete literalmente al extracto: informar mal es un problema legal.
- No menciones los extractos ni este sistema; responde como un vendedor senior apoyando a un compañero. No incluyas la fuente en el texto (se muestra aparte).`;

/**
 * Lo que el agente encontró en el catálogo durante su exploración: sirve de
 * contexto para la redacción final y cuenta como cobertura del guardarraíl.
 */
type HallazgosCatalogo = {
  contextos: string[];
  fuentes: Map<string, Fuente>;
};

function nuevosHallazgos(): HallazgosCatalogo {
  return { contextos: [], fuentes: new Map() };
}

/** Redacta la respuesta final (modelo de calidad) solo desde lo recuperado. */
async function generarRespuestaFinal(
  client: Anthropic,
  pregunta: string,
  chunks: ChunkRecuperado[],
  catalogo: HallazgosCatalogo
): Promise<string> {
  const extractos = chunks
    .map(
      (c, i) =>
        `<extracto n="${i + 1}" unidad="${c.unidadTitulo}">\n${c.texto}\n</extracto>`
    )
    .join("\n\n");

  const fichas = catalogo.contextos
    .map((c, i) => `<ficha n="${i + 1}">\n${c}\n</ficha>`)
    .join("\n\n");

  const contexto = [
    extractos && `Conocimiento comercial validado disponible:\n\n${extractos}`,
    fichas && `Datos duros del catálogo (exactos, no los alteres):\n\n${fichas}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await client.messages.create({
    model: MODELO_FINAL,
    max_tokens: 700,
    system: SYSTEM_FINAL,
    messages: [
      {
        role: "user",
        content: `${contexto}\n\nPregunta del vendedor: ${pregunta}`,
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
  vistos: Map<number, ChunkRecuperado>,
  catalogo: HallazgosCatalogo
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
      } else if (bloque.name === "consultar_ficha_tecnica") {
        const { modelo, atributos } = bloque.input as {
          modelo: string;
          atributos?: string[];
        };
        const res = await consultarFichaTecnica(modelo, atributos);
        let content: string;
        if (res.tipo === "ficha") {
          content = fichaParaAgente(res.ficha);
          catalogo.contextos.push(content);
          catalogo.fuentes.set(
            `p${res.ficha.producto.id}`,
            fuenteDeFicha(res.ficha.producto)
          );
        } else if (res.tipo === "ambiguo") {
          content = candidatosParaAgente(res.candidatos);
        } else {
          content = `No hay ninguna ficha cargada para "${modelo}". No inventes sus especificaciones: deriva al jefe de tienda.`;
        }
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content });
      } else if (bloque.name === "comparar_productos") {
        const { modeloA, modeloB, atributos } = bloque.input as {
          modeloA: string;
          modeloB: string;
          atributos?: string[];
        };
        const res = await compararProductos(modeloA, modeloB, atributos);
        let content: string;
        if (res.tipo === "comparacion") {
          content = renderComparacion(res.productoA, res.productoB, res.filas, {
            a: res.precioA,
            b: res.precioB,
          });
          catalogo.contextos.push(content);
          catalogo.fuentes.set(
            `p${res.productoA.id}`,
            fuenteDeFicha(res.productoA)
          );
          catalogo.fuentes.set(
            `p${res.productoB.id}`,
            fuenteDeFicha(res.productoB)
          );
        } else if (res.tipo === "ambiguo") {
          content = `Para "${res.termino}": ${candidatosParaAgente(res.candidatos)}`;
        } else {
          content = `No hay ficha cargada para "${res.termino}". No compares con datos que no tienes: deriva al jefe de tienda.`;
        }
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content });
      } else if (bloque.name === "explicar_tecnicismo") {
        const { termino } = bloque.input as { termino: string };
        const fila = await explicarTecnicismo(termino);
        if (fila) {
          const content = tecnicismoParaAgente(fila);
          catalogo.contextos.push(content);
          catalogo.fuentes.set(`g${fila.id}`, {
            tipo: "glosario",
            etiqueta: `Glosario — ${fila.termino}`,
          });
          resultados.push({
            type: "tool_result",
            tool_use_id: bloque.id,
            content,
          });
        } else {
          resultados.push({
            type: "tool_result",
            tool_use_id: bloque.id,
            content: `"${termino}" no está en el glosario validado. No lo expliques de memoria: deriva al jefe de tienda.`,
          });
        }
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
  const catalogo = nuevosHallazgos();
  let escalado = false;

  // Camino RÁPIDO: la pregunta tal cual ya calza con un procedimiento validado
  // (embedding ya calculado). Cubre la mayoría de las consultas en ~1 llamada.
  const directa = await buscarChunks(cargoId, pregunta, qEmbedding);
  for (const c of directa) vistos.set(c.chunkId, c);

  // Camino AGENTE: solo si la búsqueda directa no dio cobertura, dejamos que el
  // modelo rápido reformule y explore con herramientas (ahí sí aporta).
  if (!directa.some((c) => c.similitud >= THRESHOLD)) {
    escalado = await explorarConHerramientas(
      client,
      cargoId,
      pregunta,
      vistos,
      catalogo
    );
  }

  const relevantes = [...vistos.values()].filter((c) => c.similitud >= THRESHOLD);

  // GUARDARRAÍL (regla sagrada): la cobertura puede venir de chunks sobre el
  // umbral O de un hallazgo en el catálogo, pero si no hay ninguna de las dos
  // —o el agente derivó— la respuesta es SIEMPRE la frase estándar, sin
  // fuentes, sin importar lo que el modelo haya generado.
  const conCobertura = relevantes.length > 0 || catalogo.contextos.length > 0;
  const resuelta = conCobertura && !escalado;

  const respuesta = resuelta
    ? await generarRespuestaFinal(client, pregunta, relevantes, catalogo)
    : RESPUESTA_SIN_COBERTURA;

  const fuentes = resuelta
    ? [...fuentesUnicas(relevantes), ...catalogo.fuentes.values()]
    : [];

  return registrar({
    usuarioId,
    cargoId,
    pregunta,
    respuesta: respuesta || RESPUESTA_SIN_COBERTURA,
    resuelta,
    escalada: escalado,
    chunksUsados: relevantes.map((c) => c.chunkId),
    embedding: qEmbedding,
    fuentes,
    demo: false,
  });
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
