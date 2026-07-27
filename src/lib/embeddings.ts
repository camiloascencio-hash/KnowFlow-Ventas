/**
 * Embeddings via Gemini in the application and deterministic vectors in tests.
 * Published chunks are the only inputs to RAG; the provider is interchangeable.
 */
const GEMINI_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
const GEMINI_DIM = 768;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_BATCH = 100;
const EMBEDDINGS_PROVIDER = process.env.EMBEDDINGS_PROVIDER ?? "gemini";

function normalizar(vector: number[]): number[] {
  const norma = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norma > 0 ? vector.map((value) => value / norma) : vector;
}

async function embedLote(
  textos: string[],
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY para generar embeddings con Gemini.");
  }

  const response = await fetch(`${API_BASE}/${GEMINI_MODEL}:batchEmbedContents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      requests: textos.map((texto) => ({
        model: `models/${GEMINI_MODEL}`,
        content: { parts: [{ text: texto }] },
        taskType,
        outputDimensionality: GEMINI_DIM,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { embeddings: { values: number[] }[] };
  return json.embeddings.map((embedding) => normalizar(embedding.values));
}

async function embed(
  textos: string[],
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  if (EMBEDDINGS_PROVIDER === "fake") {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("EMBEDDINGS_PROVIDER=fake solo se permite durante los tests.");
    }
    return textos.map(fakeEmbedding);
  }
  if (EMBEDDINGS_PROVIDER !== "gemini") {
    throw new Error("EMBEDDINGS_PROVIDER debe ser gemini o fake.");
  }

  const salida: number[][] = [];
  for (let i = 0; i < textos.length; i += MAX_BATCH) {
    salida.push(...(await embedLote(textos.slice(i, i + MAX_BATCH), taskType)));
  }
  return salida;
}

/** Deterministic token-hash vector for hermetic tests. Never use in a demo. */
export function fakeEmbedding(texto: string): number[] {
  const vector = Array.from({ length: GEMINI_DIM }, () => 0);
  const tokens = texto.toLocaleLowerCase("es-CL").match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    vector[(hash >>> 0) % GEMINI_DIM] += hash & 1 ? 1 : -1;
  }
  return normalizar(vector);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "RETRIEVAL_QUERY");
  return vector;
}

export async function embedPassage(text: string): Promise<number[]> {
  const [vector] = await embed([text], "RETRIEVAL_DOCUMENT");
  return vector;
}

export function embedPassageBatch(textos: string[]): Promise<number[][]> {
  return embed(textos, "RETRIEVAL_DOCUMENT");
}

export function embedQueryBatch(textos: string[]): Promise<number[][]> {
  return embed(textos, "RETRIEVAL_QUERY");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}
