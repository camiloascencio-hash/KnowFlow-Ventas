import { describe, expect, it } from "vitest";
import { cosineSimilarity, fakeEmbedding } from "../src/lib/embeddings";

describe("fakeEmbedding", () => {
  it("es determinístico y conserva 768 dimensiones", () => {
    const primero = fakeEmbedding("probar POS y escáner");
    expect(primero).toHaveLength(768);
    expect(primero).toEqual(fakeEmbedding("probar POS y escáner"));
    expect(cosineSimilarity(primero, fakeEmbedding("probar POS y escáner"))).toBeCloseTo(1, 8);
  });
});
