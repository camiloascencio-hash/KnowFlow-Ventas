/**
 * Particiona el markdown de una unidad en chunks para RAG.
 *
 * Estrategia: separar por encabezados (## / ###) y, si una sección queda
 * muy larga, por párrafos. Cada chunk lleva el título de la unidad como
 * prefijo para mejorar la recuperación y permitir citar la fuente.
 */

const MAX_CHARS = 1200; // ~300 tokens en español

export function chunkMarkdown(titulo: string, markdown: string): string[] {
  const sections = markdown
    .split(/\n(?=#{2,3}\s)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const section of sections) {
    if (section.length <= MAX_CHARS) {
      pieces.push(section);
      continue;
    }
    // Sección larga: cortar por párrafos acumulando hasta MAX_CHARS
    let current = "";
    for (const para of section.split(/\n\n+/)) {
      if (current && current.length + para.length > MAX_CHARS) {
        pieces.push(current.trim());
        current = "";
      }
      current += para + "\n\n";
    }
    if (current.trim()) pieces.push(current.trim());
  }

  if (pieces.length === 0) pieces.push(markdown.trim());

  return pieces.map((p) => `${titulo}\n\n${p}`);
}
