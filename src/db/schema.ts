import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
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
});

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

export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  unidadId: integer("unidad_id")
    .references(() => unidadesConocimiento.id, { onDelete: "cascade" })
    .notNull(),
  texto: text("texto").notNull(),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIM }).notNull(),
});

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

export type Usuario = typeof usuarios.$inferSelect;
export type Cargo = typeof cargos.$inferSelect;
export type UnidadConocimiento = typeof unidadesConocimiento.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
export type Consulta = typeof consultas.$inferSelect;
export type Brecha = typeof brechas.$inferSelect;
export type FuenteConocimiento = typeof fuentesConocimiento.$inferSelect;
export type Contraste = typeof contrastes.$inferSelect;
export type Divergencia = typeof divergencias.$inferSelect;
