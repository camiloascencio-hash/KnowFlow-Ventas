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

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/camiloascencio-hash/KnowFlow-Ventas)

`render.yaml` deja el servicio listo en Render (plan free, servidor persistente).
Render lee el blueprint y solo pide los 3 valores marcados `sync: false`:

| Variable | De dónde sale |
| --- | --- |
| `DATABASE_URL` | Neon → base `knowflow_ventas`, conexión **directa** (sin `-pooler`) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey — obligatoria, genera los embeddings |
| `ANTHROPIC_API_KEY` | Opcional. Sin ella el chat cae a modo demo (la búsqueda semántica sigue siendo real) |

El resto (modelos, umbrales, `NEXTAUTH_SECRET`, pool de conexiones) se configura
solo desde el blueprint. La URL pública la resuelve `RENDER_EXTERNAL_URL`, así
que los QR apuntan al dominio correcto sin tocar nada.

**Antes del primer deploy**, la base tiene que tener datos. Los seeds corren
desde tu máquina contra `DATABASE_URL`, no desde Render:

```bash
npm run db:push
npm run db:seed
npm run seed:catalogo
```

Después del deploy, en el servicio de **KnowFlow** (la otra vertical) agrega la
variable `VENTAS_URL` con la URL pública que te dé Render, para que el selector
de verticales del login apunte acá.

> Plan `free`: Render duerme el servicio tras un rato sin tráfico. El primer
> request después de dormir tarda 30-60 s en despertar — tenlo en cuenta si vas
> a mostrar la demo en vivo.

## Tests

```bash
npm test
```

## Datos demostrativos

Los modelos, mecánicas y montos del seed son **sintéticos e ilustrativos** para
la demo. Antes de usarlo en una tienda real, el conocimiento debe cargarlo y
validarlo el equipo comercial de la marca.
