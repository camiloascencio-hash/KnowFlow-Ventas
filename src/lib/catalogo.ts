/**
 * Catálogo de producto: la mitad DETERMINISTA del conocimiento del vendedor.
 *
 * El RAG resuelve bien lo argumental (cómo vender, cómo responder a un "no"),
 * pero un dato duro no puede depender de que un chunk supere un umbral de
 * coseno: "¿cuánta batería tiene el S26 Ultra?" es 5000 mAh o es nada. Este
 * módulo no usa embeddings ni LLM: resuelve el modelo contra la tabla y
 * devuelve el dato o la lista de candidatos. Nunca adivina.
 */
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type {
  CategoriaProducto,
  Especificacion,
  GrupoEspecificacion,
  Producto,
  TerminoGlosario,
} from "@/db/schema";

/** Días tras los cuales un dato verificado se considera "sin refrescar". */
export const DIAS_VERIFICACION_VIGENTE = 90;

// --- Normalización de texto -------------------------------------------------

/**
 * minúsculas, sin tildes ni diacríticos. "Batería" → "bateria".
 *
 * El "+" se convierte en "plus" ANTES de limpiar: si se cayera, el
 * "Galaxy S26+" y el "Galaxy S26" colapsarían al mismo nombre y el catálogo
 * no podría distinguir dos productos que en la vitrina están uno al lado del
 * otro y cuestan $250.000 de diferencia.
 */
export function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase("es-CL")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, "plus");
}

/** Clave canónica de un nombre de producto: "el S26 U" → "els26u". */
export function clave(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]/g, "");
}

/**
 * Palabras que NO aportan información de producto: ni identifican un modelo ni
 * nombran un dato. Se sacan antes de armar la clave (para que "el s26 u" y
 * "s26u" colapsen al mismo token) y también al comprobar qué quedó sin cubrir
 * (para que el verbo "compárame" no bloquee el camino rápido).
 */
const MULETILLAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "al", "y", "o", "con", "para", "por", "en",
  "mi", "su", "tu", "este", "ese", "aquel", "eso", "esto",
  "samsung", "galaxy", "celular", "equipo", "telefono", "modelo",
  "que", "cual", "cuanto", "cuanta", "cuantos", "cuantas", "como",
  "tiene", "trae", "es", "son", "hay", "vale", "sale", "cuesta",
  // Contexto de plaza: nunca identifican un producto ni una spec.
  "chile", "tienda", "aca", "aqui", "ahora", "hoy",
  // Cómo pide las cosas un vendedor apurado con el cliente al lado.
  "comparame", "compara", "comparar", "comparacion", "versus", "vs",
  "diferencia", "diferencias", "mejor", "conviene", "prefiero",
  "dime", "dile", "muestrame", "explicame", "explicar", "explica",
  "quiero", "necesito", "saber", "sirve", "recomiendas", "recomiendo",
  "cliente", "me", "le", "se", "lo", "ayuda", "porfa", "favor",
]);

function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Todas las claves candidatas de un texto: los n-gramas contiguos de sus
 * tokens (sin muletillas), unidos sin separador y ordenados de más específico
 * a menos. "compara el s26 ultra" → ["s26ultra", "s26", "ultra"].
 */
function clavesCandidatas(texto: string): { clave: string; largo: number }[] {
  const utiles = tokens(texto).filter((t) => !MULETILLAS.has(t));
  const salida: { clave: string; largo: number }[] = [];
  for (let largo = Math.min(utiles.length, 4); largo >= 1; largo--) {
    for (let i = 0; i + largo <= utiles.length; i++) {
      salida.push({ clave: utiles.slice(i, i + largo).join(""), largo });
    }
  }
  return salida;
}

/** Claves con las que se puede nombrar a un producto (modelo + aliases). */
export function clavesDeProducto(
  producto: Pick<Producto, "modelo" | "aliases">
): string[] {
  const desdeModelo = [producto.modelo, producto.modelo.replace(/galaxy/i, "")];
  return [...new Set([...desdeModelo, ...producto.aliases].map(clave))].filter(
    Boolean
  );
}

// --- Resolución de producto -------------------------------------------------

export type ResolucionProducto =
  | { tipo: "unico"; producto: Producto }
  | { tipo: "ambiguo"; candidatos: Producto[] }
  | { tipo: "sin_match" };

/**
 * Resuelve un texto contra el catálogo. Gana la coincidencia más específica
 * (el n-grama más largo): "s26 ultra" resuelve al Ultra y no al S26 base.
 * Si empatan varios productos, devuelve candidatos: repreguntar es correcto,
 * adivinar no.
 */
export function resolverProductoEntre(
  texto: string,
  productos: Producto[]
): ResolucionProducto {
  const candidatas = clavesCandidatas(texto);
  if (candidatas.length === 0) return { tipo: "sin_match" };

  const porProducto = productos.map((p) => ({
    producto: p,
    claves: new Set(clavesDeProducto(p)),
  }));

  // 1) Coincidencia exacta, empezando por el n-grama más largo.
  let largoActual = candidatas[0].largo;
  let exactos: Producto[] = [];
  for (const { clave: c, largo } of candidatas) {
    if (largo !== largoActual && exactos.length > 0) break;
    largoActual = largo;
    for (const { producto, claves } of porProducto) {
      if (claves.has(c) && !exactos.includes(producto)) exactos.push(producto);
    }
  }
  if (exactos.length === 1) return { tipo: "unico", producto: exactos[0] };
  if (exactos.length > 1) return { tipo: "ambiguo", candidatos: exactos };

  // 2) Coincidencia parcial ("fold" → Fold8 y Fold8 Ultra): nunca decide sola,
  //    pero sirve para ofrecer candidatos y que el agente repregunte.
  const parciales: Producto[] = [];
  for (const { clave: c, largo } of candidatas) {
    if (c.length < 3 || largo > 2) continue;
    for (const { producto, claves } of porProducto) {
      const calza = [...claves].some((k) => k.includes(c));
      if (calza && !parciales.includes(producto)) parciales.push(producto);
    }
  }
  if (parciales.length === 1) return { tipo: "unico", producto: parciales[0] };
  if (parciales.length > 1) return { tipo: "ambiguo", candidatos: parciales };

  return { tipo: "sin_match" };
}

/** Igual que `resolverProductoEntre`, leyendo el catálogo completo. */
export async function resolverProducto(
  texto: string
): Promise<ResolucionProducto> {
  return resolverProductoEntre(texto, await listarProductos());
}

export function listarProductos(): Promise<Producto[]> {
  return db
    .select()
    .from(schema.productos)
    .orderBy(asc(schema.productos.categoria), asc(schema.productos.modelo));
}

export function especificacionesDe(
  productoId: number
): Promise<Especificacion[]> {
  return db
    .select()
    .from(schema.especificaciones)
    .where(eq(schema.especificaciones.productoId, productoId))
    .orderBy(
      asc(schema.especificaciones.grupo),
      asc(schema.especificaciones.ordenVisual),
      asc(schema.especificaciones.clave)
    );
}

// --- Filtro por atributo ----------------------------------------------------

/**
 * Cómo pregunta un vendedor → qué grupo de la ficha mirar. Sin esto,
 * "¿cuánta batería tiene?" no calzaría con la clave "Capacidad".
 */
const SINONIMOS_GRUPO: Record<string, GrupoEspecificacion> = {
  bateria: "bateria",
  pila: "bateria",
  duracion: "bateria",
  autonomia: "bateria",
  carga: "bateria",
  pantalla: "pantalla",
  display: "pantalla",
  brillo: "pantalla",
  nits: "pantalla",
  pulgadas: "pantalla",
  resolucion: "pantalla",
  refresco: "pantalla",
  hz: "pantalla",
  camara: "camara",
  fotos: "camara",
  megapixeles: "camara",
  mp: "camara",
  zoom: "camara",
  apertura: "camara",
  procesador: "rendimiento",
  chip: "rendimiento",
  rendimiento: "rendimiento",
  ram: "rendimiento",
  memoria: "rendimiento",
  velocidad: "rendimiento",
  conectividad: "conectividad",
  "5g": "conectividad",
  nfc: "conectividad",
  wifi: "conectividad",
  bluetooth: "conectividad",
  resistencia: "durabilidad",
  agua: "durabilidad",
  ip68: "durabilidad",
  polvo: "durabilidad",
  durabilidad: "durabilidad",
  peso: "durabilidad",
  grosor: "durabilidad",
  software: "software",
  android: "software",
  actualizaciones: "software",
  parches: "software",
  seguridad: "software",
  audio: "audio",
  sonido: "audio",
  parlante: "audio",
  imagen: "imagen",
  hdmi: "imagen",
  gaming: "imagen",
};

/**
 * Términos que delatan una pregunta por precio. Ojo: "peso" NO está aquí
 * (en el piso de venta "cuánto pesa" es una spec, no una pregunta de plata).
 */
const TERMINOS_PRECIO = new Set([
  "precio",
  "precios",
  "valor",
  "cuesta",
  "vale",
  "sale",
  "clp",
  "plata",
  "presupuesto",
]);

export function pideElPrecio(texto: string): boolean {
  return tokens(texto).some((t) => TERMINOS_PRECIO.has(t));
}

/** ¿Esta especificación responde al atributo que preguntó el vendedor? */
function specCalza(spec: Especificacion, atributo: string): boolean {
  const a = normalizar(atributo).trim();
  if (!a) return false;
  if (spec.grupo === a) return true;
  if (SINONIMOS_GRUPO[a] === spec.grupo) return true;
  const claveNorm = normalizar(spec.clave);
  return claveNorm.includes(a) || a.includes(claveNorm);
}

export function filtrarEspecificaciones(
  specs: Especificacion[],
  atributos?: string[]
): Especificacion[] {
  if (!atributos || atributos.length === 0) return specs;
  const filtradas = specs.filter((s) => atributos.some((a) => specCalza(s, a)));
  return filtradas;
}

// --- Precio: la regla vive en el código, no en el prompt ---------------------

export type PrecioResuelto =
  | { citable: true; texto: string }
  | { citable: false; motivo: "sin_precio" | "vencido"; texto: string };

function formatearClp(monto: number): string {
  return `$${new Intl.NumberFormat("es-CL").format(monto)}`;
}

/** "2026-03-11" → "11/03/2026". Las fechas son `date`, sin zona horaria. */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Un precio solo se puede citar si está cargado Y su vigencia no venció. El
 * precio final (plan, canje, convenio) nunca sale de aquí: lo confirma el jefe
 * de tienda. Endurecer esto en código evita que el modelo relaje la regla.
 */
export function resolverPrecio(
  producto: Pick<Producto, "modelo" | "precioListaClp" | "precioVigenteHasta">,
  hoy: Date = new Date()
): PrecioResuelto {
  const derivar = `El precio del ${producto.modelo} no está vigente en el catálogo validado. No lo estimes: confírmalo con tu jefe de tienda antes de decírselo al cliente.`;

  if (producto.precioListaClp == null || !producto.precioVigenteHasta) {
    return { citable: false, motivo: "sin_precio", texto: derivar };
  }

  const hoyIso = hoy.toISOString().slice(0, 10);
  if (producto.precioVigenteHasta < hoyIso) {
    return { citable: false, motivo: "vencido", texto: derivar };
  }

  return {
    citable: true,
    texto: `${formatearClp(producto.precioListaClp)} — precio de lista referencial al ${formatearFecha(
      producto.precioVigenteHasta
    )}; el precio final con plan, canje o convenio lo confirma tu jefe de tienda.`,
  };
}

// --- Ficha técnica ----------------------------------------------------------

export type FichaTecnica = {
  producto: Producto;
  especificaciones: Especificacion[];
  precio: PrecioResuelto;
};

export type ResultadoFicha =
  | { tipo: "ficha"; ficha: FichaTecnica }
  | { tipo: "ambiguo"; candidatos: Producto[] }
  | { tipo: "sin_match" };

/**
 * Ficha de un modelo, opcionalmente acotada a ciertos atributos. Si el modelo
 * no resuelve a un único producto devuelve los candidatos para repreguntar.
 */
export async function consultarFichaTecnica(
  modelo: string,
  atributos?: string[]
): Promise<ResultadoFicha> {
  const resolucion = await resolverProducto(modelo);
  if (resolucion.tipo === "sin_match") return { tipo: "sin_match" };
  if (resolucion.tipo === "ambiguo") {
    return { tipo: "ambiguo", candidatos: resolucion.candidatos };
  }

  const todas = await especificacionesDe(resolucion.producto.id);
  return {
    tipo: "ficha",
    ficha: {
      producto: resolucion.producto,
      especificaciones: filtrarEspecificaciones(todas, atributos),
      precio: resolverPrecio(resolucion.producto),
    },
  };
}

// --- Comparativa ------------------------------------------------------------

export type FilaComparacion = {
  grupo: GrupoEspecificacion;
  clave: string;
  valorA: string | null;
  valorB: string | null;
  esDiferenciador: boolean;
  iguales: boolean;
};

export type ResultadoComparacion =
  | {
      tipo: "comparacion";
      productoA: Producto;
      productoB: Producto;
      filas: FilaComparacion[];
      precioA: PrecioResuelto;
      precioB: PrecioResuelto;
    }
  | { tipo: "ambiguo"; termino: string; candidatos: Producto[] }
  | { tipo: "sin_match"; termino: string };

function valorConUnidad(spec: Especificacion): string {
  return spec.unidad ? `${spec.valor} ${spec.unidad}` : spec.valor;
}

export function construirFilas(
  specsA: Especificacion[],
  specsB: Especificacion[],
  atributos?: string[]
): FilaComparacion[] {
  const a = filtrarEspecificaciones(specsA, atributos);
  const b = filtrarEspecificaciones(specsB, atributos);

  const porClaveA = new Map(a.map((s) => [normalizar(s.clave), s]));
  const porClaveB = new Map(b.map((s) => [normalizar(s.clave), s]));
  const claves = [...new Set([...porClaveA.keys(), ...porClaveB.keys()])];

  return claves
    .map((k) => {
      const sa = porClaveA.get(k);
      const sb = porClaveB.get(k);
      const ref = sa ?? sb!;
      const valorA = sa ? valorConUnidad(sa) : null;
      const valorB = sb ? valorConUnidad(sb) : null;
      return {
        grupo: ref.grupo,
        clave: ref.clave,
        valorA,
        valorB,
        // Un atributo que solo tiene uno de los dos es, por definición, una
        // diferencia: se marca como diferenciador si lo era en su ficha.
        esDiferenciador: (sa?.esDiferenciador || sb?.esDiferenciador) ?? false,
        iguales: valorA !== null && valorB !== null && valorA === valorB,
      };
    })
    .sort((x, y) =>
      x.grupo === y.grupo
        ? x.clave.localeCompare(y.clave, "es")
        : x.grupo.localeCompare(y.grupo, "es")
    );
}

/**
 * Tabla de diferencias entre dos modelos. Un atributo que existe en uno y no
 * en el otro aparece igual, con el faltante en null: "no está informado" es
 * una respuesta válida y honesta; deducirlo no lo es.
 */
export async function compararProductos(
  modeloA: string,
  modeloB: string,
  atributos?: string[]
): Promise<ResultadoComparacion> {
  const productos = await listarProductos();
  const resA = resolverProductoEntre(modeloA, productos);
  const resB = resolverProductoEntre(modeloB, productos);

  for (const [termino, res] of [
    [modeloA, resA],
    [modeloB, resB],
  ] as const) {
    if (res.tipo === "sin_match") return { tipo: "sin_match", termino };
    if (res.tipo === "ambiguo") {
      return { tipo: "ambiguo", termino, candidatos: res.candidatos };
    }
  }

  const productoA = (resA as { producto: Producto }).producto;
  const productoB = (resB as { producto: Producto }).producto;
  const [specsA, specsB] = await Promise.all([
    especificacionesDe(productoA.id),
    especificacionesDe(productoB.id),
  ]);

  return {
    tipo: "comparacion",
    productoA,
    productoB,
    filas: construirFilas(specsA, specsB, atributos),
    precioA: resolverPrecio(productoA),
    precioB: resolverPrecio(productoB),
  };
}

// --- Glosario ---------------------------------------------------------------

export function resolverTerminoEntre(
  texto: string,
  terminos: TerminoGlosario[]
): TerminoGlosario | null {
  const candidatas = clavesCandidatas(texto);
  const clavesTexto = new Set(candidatas.map((c) => c.clave));
  clavesTexto.add(clave(texto));

  const conClaves = terminos.map((t) => ({
    termino: t,
    claves: [...new Set([t.termino, ...t.aliases].map(clave))].filter(Boolean),
  }));

  // Gana el término cuya clave sea más larga (más específica):
  // "brillo pico" antes que "brillo".
  let mejor: { termino: TerminoGlosario; largo: number } | null = null;
  for (const { termino, claves } of conClaves) {
    for (const k of claves) {
      if (!clavesTexto.has(k)) continue;
      if (!mejor || k.length > mejor.largo) mejor = { termino, largo: k.length };
    }
  }
  return mejor?.termino ?? null;
}

/** Fila del glosario para un tecnicismo, o null si no está documentado. */
export async function explicarTecnicismo(
  termino: string
): Promise<TerminoGlosario | null> {
  const todos = await db.select().from(schema.glosarioTecnico);
  return resolverTerminoEntre(termino, todos);
}

/** Texto normalizado y con límites de palabra explícitos, para buscar frases. */
function frase(texto: string): string {
  return ` ${tokens(texto).join(" ")} `;
}

/**
 * Términos del glosario mencionados en un conjunto de textos (para la ficha).
 *
 * La comparación es por PALABRAS COMPLETAS, no por subcadena: sin eso,
 * "están cargados" contiene "anc" y la ficha termina explicando cancelación
 * de ruido en un celular que no tiene audífonos.
 */
export async function glosarioParaTextos(
  textos: string[]
): Promise<TerminoGlosario[]> {
  const todos = await db.select().from(schema.glosarioTecnico);
  const frases = textos.map(frase);
  const encontrados = new Map<number, TerminoGlosario>();

  for (const t of todos) {
    const nombres = [...new Set([t.termino, ...t.aliases])]
      .map(frase)
      .filter((n) => n.trim().length >= 3);
    const calza = nombres.some((n) => frases.some((f) => f.includes(n)));
    if (calza) encontrados.set(t.id, t);
  }
  return [...encontrados.values()];
}

export function productosPorIds(ids: number[]): Promise<Producto[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return db
    .select()
    .from(schema.productos)
    .where(inArray(schema.productos.id, ids));
}

// --- Camino rápido: ¿esta pregunta se responde con la tabla? -----------------

/** Palabras que delatan una pregunta por dato duro y no por argumentario. */
const PALABRAS_SPEC = [
  ...Object.keys(SINONIMOS_GRUPO),
  ...TERMINOS_PRECIO,
  "gb",
  "tb",
  "mah",
  "watts",
  "w",
  "ficha",
  "especificaciones",
  "specs",
  "caracteristicas",
  "mide",
  "pesa",
  "trae",
];

const MARCAS_COMPARACION = [
  "vs",
  "versus",
  "compara",
  "comparame",
  "comparar",
  "comparacion",
  "diferencia",
  "diferencias",
  "mejor",
  "conviene",
  "prefiero",
];

export type IntencionCatalogo =
  | { tipo: "ficha"; producto: Producto; atributos: string[] }
  | { tipo: "comparacion"; productoA: Producto; productoB: Producto }
  | { tipo: "glosario"; termino: TerminoGlosario }
  | { tipo: "ninguna" };

/**
 * Productos nombrados en un texto, en el orden en que aparecen.
 *
 * Va CONSUMIENDO los tokens que ya identificó a un producto, del nombre más
 * largo al más corto. Sin eso, "¿cuánta batería tiene el S26 Ultra?" detecta
 * dos productos —porque "s26" también es el alias del modelo base— y la
 * pregunta termina respondida como una comparativa que nadie pidió.
 */
export function productosMencionados(
  texto: string,
  productos: Producto[]
): Producto[] {
  const utiles = tokens(texto).filter((t) => !MULETILLAS.has(t));
  const porProducto = productos.map((p) => ({
    producto: p,
    claves: new Set(clavesDeProducto(p)),
  }));

  const consumidos = new Set<number>();
  const encontrados: { producto: Producto; inicio: number }[] = [];

  for (let largo = Math.min(utiles.length, 4); largo >= 1; largo--) {
    for (let i = 0; i + largo <= utiles.length; i++) {
      const indices = Array.from({ length: largo }, (_, j) => i + j);
      if (indices.some((j) => consumidos.has(j))) continue;

      const k = utiles.slice(i, i + largo).join("");
      // La coincidencia es exacta contra los alias, no por subcadena, así que
      // un nombre corto como "z9" o "a57" es seguro.
      if (k.length < 2) continue;

      const calzan = porProducto.filter((x) => x.claves.has(k));
      // Un nombre ambiguo no identifica a nadie y tampoco consume tokens:
      // más adelante puede aparecer una mención más precisa.
      if (calzan.length !== 1) continue;

      encontrados.push({ producto: calzan[0].producto, inicio: i });
      for (const j of indices) consumidos.add(j);
    }
  }

  return encontrados
    .sort((a, b) => a.inicio - b.inicio)
    .map((e) => e.producto);
}

/** Atributos preguntados explícitamente (para no volcar la ficha completa). */
export function atributosMencionados(texto: string): string[] {
  const ts = new Set(tokens(texto));
  return [...new Set(PALABRAS_SPEC.filter((p) => ts.has(p)))];
}

/**
 * Decide si la pregunta se puede responder con la tabla, ANTES de embeber
 * nada. Es el mayor salto de latencia del sistema: pasa de 7-16 s a <1 s.
 * Es deliberadamente conservador: ante la duda devuelve "ninguna" y la
 * pregunta sigue el camino normal del agente.
 */
export async function detectarIntencionCatalogo(
  pregunta: string
): Promise<IntencionCatalogo> {
  const productos = await listarProductos();
  const mencionados = productosMencionados(pregunta, productos);
  const atributos = atributosMencionados(pregunta);
  const ts = new Set(tokens(pregunta));
  const esComparacion = MARCAS_COMPARACION.some((m) => ts.has(m));

  if (mencionados.length >= 2 && (esComparacion || atributos.length > 0)) {
    return {
      tipo: "comparacion",
      productoA: mencionados[0],
      productoB: mencionados[1],
    };
  }

  // Una comparación con un solo producto identificado ("¿el S26 o el iPhone?")
  // no es un dato duro: la resuelve el argumentario, no la tabla.
  if (mencionados.length === 1 && atributos.length > 0 && !esComparacion) {
    return { tipo: "ficha", producto: mencionados[0], atributos };
  }

  // Si no se preguntó por ningún atributo, no hay ficha que servir: puede ser
  // un tecnicismo. Se intenta aunque la pregunta nombre un producto, porque
  // varios términos del glosario SON nombres de producto ("Micro RGB").
  if (atributos.length === 0) {
    const glosario = await db.select().from(schema.glosarioTecnico);
    const termino = resolverTerminoEntre(pregunta, glosario);
    if (termino) return { tipo: "glosario", termino };
  }

  return { tipo: "ninguna" };
}

/**
 * Palabras de la pregunta que NINGÚN dato recuperado explica. Es el freno del
 * camino rápido: "¿cuánta batería tiene el S26 Ultra?" no deja nada sin
 * cubrir (se responde de la tabla), pero "¿el A57 tiene carga inalámbrica?"
 * deja "inalambrica" suelta — y ahí responder con las specs de batería sería
 * contestar otra cosa. Si queda algo sin cubrir, no resolvemos por tabla.
 */
export function tokensSinCubrir(
  pregunta: string,
  cubiertoPor: string[]
): string[] {
  const cubiertos = new Set(cubiertoPor.flatMap(tokens));
  const clavesCubiertas = cubiertoPor.map(clave);
  return [
    ...new Set(
      tokens(pregunta).filter(
        (t) =>
          t.length > 2 &&
          !MULETILLAS.has(t) &&
          !PALABRAS_SPEC.includes(t) &&
          !TERMINOS_PRECIO.has(t) &&
          !cubiertos.has(t) &&
          !clavesCubiertas.some((k) => k.includes(t))
      )
    ),
  ];
}

/** ¿El dato lleva más de 90 días sin re-verificarse? */
export function verificacionVencida(
  verificadoEn: Date | null,
  hoy: Date = new Date()
): boolean {
  if (!verificadoEn) return true;
  const dias = (hoy.getTime() - verificadoEn.getTime()) / 86_400_000;
  return dias > DIAS_VERIFICACION_VIGENTE;
}

export const ETIQUETAS_CATEGORIA: Record<CategoriaProducto, string> = {
  smartphone: "Smartphone",
  plegable: "Plegable",
  tablet: "Tablet",
  wearable: "Wearable",
  audio: "Audio",
  tv: "Televisor",
  accesorio: "Accesorio",
};

export const ETIQUETAS_GRUPO: Record<GrupoEspecificacion, string> = {
  pantalla: "Pantalla",
  rendimiento: "Rendimiento",
  camara: "Cámara",
  bateria: "Batería",
  conectividad: "Conectividad",
  durabilidad: "Durabilidad",
  software: "Software",
  audio: "Audio",
  imagen: "Imagen",
};
