import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

// Dimensiones del modelo de embeddings de Google Gemini (gemini-embedding-001)
export const EMBEDDING_DIM = 768;

export const rolEnum = pgEnum("rol", [
  "trabajador_nuevo",
  "experto",
  "validador",
  "admin",
]);

/**
 * Tipos de conocimiento del vendedor de tecnología. A diferencia de un cargo
 * operativo (donde todo es "procedimiento"), aquí el conocimiento que hace
 * vender tiene formas propias: qué es el producto, cómo argumentarlo, cómo
 * responder a un "no", contra qué se compara y qué promoción está vigente.
 */
export const tipoUnidadEnum = pgEnum("tipo_unidad", [
  "ficha_producto",
  "argumentario",
  "objecion",
  "comparativa",
  "promocion",
  "procedimiento",
]);

export const criticidadEnum = pgEnum("criticidad", ["alta", "media", "baja"]);

export const estadoUnidadEnum = pgEnum("estado_unidad", [
  "borrador",
  "en_validacion",
  "publicado",
  "rechazado",
]);

export const ratingEnum = pgEnum("rating", ["up", "down"]);

export const estadoBrechaEnum = pgEnum("estado_brecha", [
  "detectada",
  "en_proceso",
  "resuelta",
]);

export const tipoFuenteEnum = pgEnum("tipo_fuente_conocimiento", [
  "manual",
  "relato_experto",
  "errores_operacionales",
]);

export const estadoContrasteEnum = pgEnum("estado_contraste", [
  "procesando",
  "completado",
  "fallido",
]);

export const tipoDivergenciaEnum = pgEnum("tipo_divergencia", [
  "conocimiento_no_documentado",
  "atajo_riesgoso",
  "manual_desactualizado",
  "error_tipico_novato",
]);

// --- Catálogo de producto (datos duros, deterministas) ----------------------
//
// El conocimiento del vendedor entra como texto libre y sale por similitud
// semántica: eso sirve para argumentarios y objeciones, pero es el mecanismo
// equivocado para un dato duro. "¿Cuánta batería tiene el S26 Ultra?" no puede
// depender de que un chunk supere un umbral de coseno: es un dato exacto o
// nada. Estas tablas son la fuente determinista de esos datos.

export const categoriaProductoEnum = pgEnum("categoria_producto", [
  "smartphone",
  "plegable",
  "tablet",
  "wearable",
  "audio",
  "tv",
  "accesorio",
]);

export const gamaEnum = pgEnum("gama", ["alta", "media", "entrada"]);

export const estadoProductoEnum = pgEnum("estado_producto", [
  "activo",
  "descontinuado",
  "proximo_lanzamiento",
]);

/** Familias de atributos: ordenan la ficha y acotan las comparativas. */
export const grupoEspecificacionEnum = pgEnum("grupo_especificacion", [
  "pantalla",
  "rendimiento",
  "camara",
  "bateria",
  "conectividad",
  "durabilidad",
  "software",
  "audio",
  "imagen",
]);

export const cargos = pgTable("cargos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  // sha256 hex de la contraseña (suficiente para credenciales seed del MVP)
  passwordHash: text("password_hash").notNull(),
  rol: rolEnum("rol").notNull(),
  cargoId: integer("cargo_id").references(() => cargos.id),
  // Verificación de correo: el admin fija una clave temporal, pero la
  // persona no puede entrar hasta confirmar que esa dirección es suya.
  // null = pendiente; con fecha = confirmada.
  emailVerificadoEn: timestamp("email_verificado_en"),
  // Hash del token de confirmación (nunca el token en claro: si la base se
  // filtra, no debe alcanzar para activar una cuenta ajena).
  tokenVerificacionHash: text("token_verificacion_hash"),
  tokenVerificacionExpira: timestamp("token_verificacion_expira"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  // Se fija UNA vez, cuando el trabajador confirma la lectura de todas las
  // unidades críticas de su cargo. No se vuelve a null si luego desmarca
  // alguna: el hito ya ocurrió y el dato historico no debe moverse bajo los
  // pies de un reporte ya emitido.
  autonomiaAlcanzadaEn: timestamp("autonomia_alcanzada_en"),
});

/**
 * Lectura confirmada de una unidad crítica por un trabajador nuevo.
 *
 * Reemplaza el localStorage original: vivir solo en el navegador significaba
 * que el progreso se perdía al cambiar de equipo y que "tiempo a autonomía"
 * era, literalmente, imposible de medir. Ahora es un hecho con timestamp real
 * en el servidor — la fuente de verdad para cualquier métrica de onboarding.
 */
export const lecturasConfirmadas = pgTable(
  "lecturas_confirmadas",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .references(() => usuarios.id, { onDelete: "cascade" })
      .notNull(),
    unidadId: integer("unidad_id")
      .references(() => unidadesConocimiento.id, { onDelete: "cascade" })
      .notNull(),
    confirmadoEn: timestamp("confirmado_en").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lecturas_confirmadas_usuario_unidad_idx").on(
      t.usuarioId,
      t.unidadId
    ),
  ]
);

export const unidadesConocimiento = pgTable("unidades_conocimiento", {
  id: serial("id").primaryKey(),
  cargoId: integer("cargo_id")
    .references(() => cargos.id)
    .notNull(),
  tipo: tipoUnidadEnum("tipo").notNull(),
  titulo: text("titulo").notNull(),
  contenidoMarkdown: text("contenido_markdown").notNull(),
  criticidad: criticidadEnum("criticidad").notNull(),
  estado: estadoUnidadEnum("estado").notNull().default("borrador"),
  autorExpertoId: integer("autor_experto_id").references(() => usuarios.id),
  validadorId: integer("validador_id").references(() => usuarios.id),
  comentarioRechazo: text("comentario_rechazo"),
  fechaPublicacion: timestamp("fecha_publicacion"),
  fechaVigencia: timestamp("fecha_vigencia"),
  version: integer("version").notNull().default(1),
  // Si es una nueva versión de una unidad publicada, apunta a la original
  // (permite mostrar diff en la bandeja de validación).
  unidadOrigenId: integer("unidad_origen_id"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    unidadId: integer("unidad_id")
      .references(() => unidadesConocimiento.id, { onDelete: "cascade" })
      .notNull(),
    texto: text("texto").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }).notNull(),
  },
  (t) => [
    // Sin este indice, CADA pregunta al asistente recorre todos los chunks
    // calculando distancia coseno de a uno. Con 30 chunks no se nota; con el
    // catalogo de una cadena real son segundos, con el cliente esperando.
    index("chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
    index("chunks_unidad_idx").on(t.unidadId),
  ]
);

export const consultas = pgTable("consultas", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  cargoId: integer("cargo_id")
    .references(() => cargos.id)
    .notNull(),
  textoPregunta: text("texto_pregunta").notNull(),
  respuesta: text("respuesta"),
  chunksUsados: jsonb("chunks_usados").$type<number[]>().notNull().default([]),
  resuelta: boolean("resuelta").notNull().default(false),
  escalada: boolean("escalada").notNull().default(false),
  rating: ratingEnum("rating"),
  // Embedding de la pregunta: insumo para agrupar brechas por similitud
  embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const brechas = pgTable("brechas", {
  id: serial("id").primaryKey(),
  cargoId: integer("cargo_id")
    .references(() => cargos.id)
    .notNull(),
  temaDetectado: text("tema_detectado").notNull(),
  nConsultasSinResolver: integer("n_consultas_sin_resolver").notNull(),
  estado: estadoBrechaEnum("estado").notNull().default("detectada"),
  // Embedding representativo del tema, para no duplicar brechas ya detectadas
  embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
  timestampDeteccion: timestamp("timestamp_deteccion").notNull().defaultNow(),
  timestampResolucion: timestamp("timestamp_resolucion"),
});

export const fuentesConocimiento = pgTable("fuentes_conocimiento", {
  id: serial("id").primaryKey(),
  cargoId: integer("cargo_id").references(() => cargos.id).notNull(),
  tipo: tipoFuenteEnum("tipo").notNull(),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull(),
  autorId: integer("autor_id").references(() => usuarios.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const contrastes = pgTable("contrastes", {
  id: serial("id").primaryKey(),
  cargoId: integer("cargo_id").references(() => cargos.id).notNull(),
  titulo: text("titulo").notNull(),
  unidadOrigenId: integer("unidad_origen_id")
    .references(() => unidadesConocimiento.id)
    .notNull(),
  estado: estadoContrasteEnum("estado").notNull().default("procesando"),
  resumen: text("resumen"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const divergencias = pgTable("divergencias", {
  id: serial("id").primaryKey(),
  contrasteId: integer("contraste_id")
    .references(() => contrastes.id, { onDelete: "cascade" })
    .notNull(),
  tipo: tipoDivergenciaEnum("tipo").notNull(),
  descripcion: text("descripcion").notNull(),
  evidenciaManual: text("evidencia_manual"),
  evidenciaOperacion: text("evidencia_operacion").notNull(),
  riesgo: text("riesgo").notNull(),
  recomendacion: text("recomendacion").notNull(),
  aceptada: boolean("aceptada").notNull().default(false),
});

export const productos = pgTable(
  "productos",
  {
    id: serial("id").primaryKey(),
    marca: text("marca").notNull().default("Samsung"),
    modelo: text("modelo").notNull(),
    // Como lo nombra el vendedor en piso: "s26u", "el ultra", "el fold".
    aliases: text("aliases").array().notNull().default([]),
    sku: text("sku"),
    categoria: categoriaProductoEnum("categoria").notNull(),
    gama: gamaEnum("gama").notNull(),
    fechaLanzamiento: date("fecha_lanzamiento"),
    fechaLanzamientoChile: date("fecha_lanzamiento_chile"),
    // Precio de LISTA referencial. Nunca es el precio final de la venta.
    precioListaClp: integer("precio_lista_clp"),
    precioVigenteHasta: date("precio_vigente_hasta"),
    almacenamientos: text("almacenamientos").array().notNull().default([]),
    colores: text("colores").array().notNull().default([]),
    // 1-2 frases: para quién es y por qué se elige.
    resumenVenta: text("resumen_venta"),
    estado: estadoProductoEnum("estado").notNull().default("activo"),
    fuenteUrl: text("fuente_url"),
    verificadoEn: timestamp("verificado_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("productos_marca_modelo_idx").on(t.marca, t.modelo),
    index("productos_categoria_idx").on(t.categoria),
    index("productos_aliases_idx").using("gin", t.aliases),
  ]
);

/**
 * Especificaciones en clave/valor a propósito. Un vendedor pregunta cosas
 * impredecibles ("¿cuál tiene mejor apertura?", "¿los dos son IP68?"): con
 * columnas fijas cada pregunta nueva sería una migración; así la comparativa
 * entre dos productos es un JOIN sobre `clave`.
 */
export const especificaciones = pgTable(
  "especificaciones",
  {
    id: serial("id").primaryKey(),
    productoId: integer("producto_id")
      .references(() => productos.id, { onDelete: "cascade" })
      .notNull(),
    grupo: grupoEspecificacionEnum("grupo").notNull(),
    clave: text("clave").notNull(),
    valor: text("valor").notNull(),
    unidad: text("unidad"),
    // Si es un argumento de venta, no solo un dato de la tabla.
    esDiferenciador: boolean("es_diferenciador").notNull().default(false),
    ordenVisual: integer("orden_visual").notNull().default(0),
    fuenteUrl: text("fuente_url"),
    verificado: boolean("verificado").notNull().default(false),
  },
  (t) => [
    index("especificaciones_producto_grupo_idx").on(t.productoId, t.grupo),
    uniqueIndex("especificaciones_producto_clave_idx").on(t.productoId, t.clave),
  ]
);

/** Los tecnicismos traducidos a lenguaje de venta. */
export const glosarioTecnico = pgTable(
  "glosario_tecnico",
  {
    id: serial("id").primaryKey(),
    termino: text("termino").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    categoria: categoriaProductoEnum("categoria"),
    definicionTecnica: text("definicion_tecnica").notNull(),
    // Cómo explicárselo a un cliente que no sabe nada de tecnología.
    traduccionVenta: text("traduccion_venta").notNull(),
    // El "por lo tanto, a usted le sirve para...".
    beneficioCliente: text("beneficio_cliente").notNull(),
    // Lo que un vendedor NO debe decir sobre esto.
    erroresComunes: text("errores_comunes").notNull(),
    productosRelacionados: text("productos_relacionados")
      .array()
      .notNull()
      .default([]),
  },
  (t) => [
    uniqueIndex("glosario_termino_idx").on(t.termino),
    index("glosario_aliases_idx").using("gin", t.aliases),
  ]
);

export type Usuario = typeof usuarios.$inferSelect;
export type Cargo = typeof cargos.$inferSelect;
export type UnidadConocimiento = typeof unidadesConocimiento.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
export type Consulta = typeof consultas.$inferSelect;
export type Brecha = typeof brechas.$inferSelect;
export type FuenteConocimiento = typeof fuentesConocimiento.$inferSelect;
export type Contraste = typeof contrastes.$inferSelect;
export type Divergencia = typeof divergencias.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type Especificacion = typeof especificaciones.$inferSelect;
export type TerminoGlosario = typeof glosarioTecnico.$inferSelect;
export type CategoriaProducto = Producto["categoria"];
export type Gama = Producto["gama"];
export type GrupoEspecificacion = Especificacion["grupo"];
