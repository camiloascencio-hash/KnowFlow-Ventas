# KnowFlow Ventas

Gestión del conocimiento **comercial** con IA para vendedores de tecnología en
tiendas de retail (Chile).

Es la misma máquina de KnowFlow —captura del conocimiento del experto →
estructuración con IA → **validación humana** → entrega por chat con **RAG
estricto** → detección de brechas— pero adaptada a lo que realmente hace vender:
no procedimientos operativos, sino **fichas de producto, argumentarios, manejo
de objeciones, comparativas y promociones vigentes**.

**Cargo piloto incluido:** Vendedor de tecnología Samsung, con 9 unidades
publicadas, 2 borradores, 1 en validación y consultas históricas.

> Proyecto hermano de [KnowFlow](https://github.com/camiloascencio-hash/KnowFlow)
> (vertical de operaciones / cajero de retail). Comparten el motor; cada uno
> evoluciona por separado y usa su **propia base de datos**.

## Qué cambia respecto de KnowFlow

| | KnowFlow | KnowFlow Ventas |
|---|---|---|
| Tipos de conocimiento | paso a paso, checklist, árbol de decisión | **ficha de producto, argumentario, objeción, comparativa, promoción, procedimiento** |
| Contexto del asistente | trabajador en su turno | vendedor **con el cliente al lado** |
| Criticidad "alta" | dinero, SII, seguridad | **perder la venta, reclamo o problema legal** (Ley 19.496) |
| Ruta de inducción | Mis primeros turnos | **Mis primeras ventas** |
| Escalamiento | supervisor | **jefe de tienda** |

El agente además tiene una regla propia: **nunca inventa precios ni cifras**. Si
un dato depende del sistema de la tienda (monto de canje, stock, precio), lo
dice explícitamente en vez de arriesgar una promesa al cliente.

## Setup

Requisitos: Node.js 20+ y una API key de Google Gemini (embeddings).

```bash
npm install
cp .env.example .env    # completa GEMINI_API_KEY y DATABASE_URL
npm run db:push         # crea el esquema
npm run db:seed         # carga el cargo piloto (requiere ALLOW_DESTRUCTIVE_SEED=true)
npm run dev
```

Contraseña de todos los usuarios demo: `demo123`.

| Usuario | Rol | Qué hace |
|---|---|---|
| `vendedor@knowflow.cl` | Vendedor nuevo | Chat con voz, ruta "Mis primeras ventas" |
| `experto@knowflow.cl` | Vendedor experto | Aporta conocimiento; la IA lo estructura |
| `validador@knowflow.cl` | Jefe de tienda | Aprueba/rechaza; nada se publica sin su visto bueno |
| `admin@knowflow.cl` | Jefatura comercial | Dashboard, brechas, cargos y usuarios |

## Base de datos

Usa una base **separada** (`knowflow_ventas`) dentro del mismo proyecto Neon que
KnowFlow, de modo que los datos de una vertical nunca tocan los de la otra. La
connection string va en `DATABASE_URL`.

## Guion de demo (~5 min)

1. **Vendedor** — pregunta *"el cliente dice que está muy caro"*: el agente
   responde con el manejo de objeción validado, citando la fuente. Pregunta algo
   no documentado (*"¿qué cubre el seguro de pantalla?"*) → deriva al jefe de
   tienda y queda registrado.
2. **Experto** — "Aportar": relata cómo maneja una objeción; la IA lo estructura
   como *manejo de objeción* y lo deja en borrador.
3. **Jefe de tienda** — bandeja: aprueba y publica (se generan embeddings).
4. **Jefatura comercial** — dashboard: TRE, UPI, top de temas y la brecha
   *"seguro de pantalla y garantía extendida"* detectada automáticamente. Con
   "✨ Redactar borrador con IA" genera el esqueleto para que el experto lo
   complete.

## Arquitectura

Idéntica a KnowFlow: Next.js (App Router) + PostgreSQL/pgvector (Neon) +
embeddings de Gemini + agente con herramientas sobre el SDK de Anthropic +
NextAuth con argon2. Ver `src/lib/rag.ts` (agente y guardarraíl),
`src/lib/ai/estructurar.ts`, `src/lib/ai/redactor.ts` y `src/lib/brechas.ts`.

Umbrales en `.env`: `RAG_SIMILARITY_THRESHOLD` (0.68), `RAG_TOP_K` (4),
`BRECHA_SIMILARITY_THRESHOLD` (0.7). Calibrados con las preguntas reales de este
rubro: con cobertura 0.70–0.83, sin cobertura 0.57–0.63.

## Despliegue

`render.yaml` deja el servicio listo en Render (plan free, servidor persistente).
Solo pide `DATABASE_URL`, `GEMINI_API_KEY` y opcionalmente `ANTHROPIC_API_KEY`.

## Tests

```bash
npm test
```

## Datos demostrativos

Los modelos, mecánicas y montos del seed son **sintéticos e ilustrativos** para
la demo. Antes de usarlo en una tienda real, el conocimiento debe cargarlo y
validarlo el equipo comercial de la marca.
