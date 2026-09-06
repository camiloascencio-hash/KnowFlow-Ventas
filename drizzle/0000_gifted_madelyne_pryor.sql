CREATE TYPE "public"."categoria_producto" AS ENUM('smartphone', 'plegable', 'tablet', 'wearable', 'audio', 'tv', 'accesorio');--> statement-breakpoint
CREATE TYPE "public"."criticidad" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."estado_brecha" AS ENUM('detectada', 'en_proceso', 'resuelta');--> statement-breakpoint
CREATE TYPE "public"."estado_contraste" AS ENUM('procesando', 'completado', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."estado_producto" AS ENUM('activo', 'descontinuado', 'proximo_lanzamiento');--> statement-breakpoint
CREATE TYPE "public"."estado_unidad" AS ENUM('borrador', 'en_validacion', 'publicado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."gama" AS ENUM('alta', 'media', 'entrada');--> statement-breakpoint
CREATE TYPE "public"."grupo_especificacion" AS ENUM('pantalla', 'rendimiento', 'camara', 'bateria', 'conectividad', 'durabilidad', 'software', 'audio', 'imagen');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('trabajador_nuevo', 'experto', 'validador', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tipo_divergencia" AS ENUM('conocimiento_no_documentado', 'atajo_riesgoso', 'manual_desactualizado', 'error_tipico_novato');--> statement-breakpoint
CREATE TYPE "public"."tipo_fuente_conocimiento" AS ENUM('manual', 'relato_experto', 'errores_operacionales');--> statement-breakpoint
CREATE TYPE "public"."tipo_unidad" AS ENUM('ficha_producto', 'argumentario', 'objecion', 'comparativa', 'promocion', 'procedimiento');--> statement-breakpoint
CREATE TABLE "brechas" (
	"id" serial PRIMARY KEY NOT NULL,
	"cargo_id" integer NOT NULL,
	"tema_detectado" text NOT NULL,
	"n_consultas_sin_resolver" integer NOT NULL,
	"estado" "estado_brecha" DEFAULT 'detectada' NOT NULL,
	"embedding" vector(768),
	"timestamp_deteccion" timestamp DEFAULT now() NOT NULL,
	"timestamp_resolucion" timestamp
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"unidad_id" integer NOT NULL,
	"texto" text NOT NULL,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"cargo_id" integer NOT NULL,
	"texto_pregunta" text NOT NULL,
	"respuesta" text,
	"chunks_usados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resuelta" boolean DEFAULT false NOT NULL,
	"escalada" boolean DEFAULT false NOT NULL,
	"rating" "rating",
	"embedding" vector(768),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contrastes" (
	"id" serial PRIMARY KEY NOT NULL,
	"cargo_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"unidad_origen_id" integer NOT NULL,
	"estado" "estado_contraste" DEFAULT 'procesando' NOT NULL,
	"resumen" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divergencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"contraste_id" integer NOT NULL,
	"tipo" "tipo_divergencia" NOT NULL,
	"descripcion" text NOT NULL,
	"evidencia_manual" text,
	"evidencia_operacion" text NOT NULL,
	"riesgo" text NOT NULL,
	"recomendacion" text NOT NULL,
	"aceptada" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "especificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"grupo" "grupo_especificacion" NOT NULL,
	"clave" text NOT NULL,
	"valor" text NOT NULL,
	"unidad" text,
	"es_diferenciador" boolean DEFAULT false NOT NULL,
	"orden_visual" integer DEFAULT 0 NOT NULL,
	"fuente_url" text,
	"verificado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuentes_conocimiento" (
	"id" serial PRIMARY KEY NOT NULL,
	"cargo_id" integer NOT NULL,
	"tipo" "tipo_fuente_conocimiento" NOT NULL,
	"titulo" text NOT NULL,
	"contenido" text NOT NULL,
	"autor_id" integer,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glosario_tecnico" (
	"id" serial PRIMARY KEY NOT NULL,
	"termino" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"categoria" "categoria_producto",
	"definicion_tecnica" text NOT NULL,
	"traduccion_venta" text NOT NULL,
	"beneficio_cliente" text NOT NULL,
	"errores_comunes" text NOT NULL,
	"productos_relacionados" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"marca" text DEFAULT 'Samsung' NOT NULL,
	"modelo" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"sku" text,
	"categoria" "categoria_producto" NOT NULL,
	"gama" "gama" NOT NULL,
	"fecha_lanzamiento" date,
	"fecha_lanzamiento_chile" date,
	"precio_lista_clp" integer,
	"precio_vigente_hasta" date,
	"almacenamientos" text[] DEFAULT '{}' NOT NULL,
	"colores" text[] DEFAULT '{}' NOT NULL,
	"resumen_venta" text,
	"estado" "estado_producto" DEFAULT 'activo' NOT NULL,
	"fuente_url" text,
	"verificado_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unidades_conocimiento" (
	"id" serial PRIMARY KEY NOT NULL,
	"cargo_id" integer NOT NULL,
	"tipo" "tipo_unidad" NOT NULL,
	"titulo" text NOT NULL,
	"contenido_markdown" text NOT NULL,
	"criticidad" "criticidad" NOT NULL,
	"estado" "estado_unidad" DEFAULT 'borrador' NOT NULL,
	"autor_experto_id" integer,
	"validador_id" integer,
	"comentario_rechazo" text,
	"fecha_publicacion" timestamp,
	"fecha_vigencia" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"unidad_origen_id" integer,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol" NOT NULL,
	"cargo_id" integer,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "brechas" ADD CONSTRAINT "brechas_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_unidad_id_unidades_conocimiento_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_conocimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrastes" ADD CONSTRAINT "contrastes_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrastes" ADD CONSTRAINT "contrastes_unidad_origen_id_unidades_conocimiento_id_fk" FOREIGN KEY ("unidad_origen_id") REFERENCES "public"."unidades_conocimiento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divergencias" ADD CONSTRAINT "divergencias_contraste_id_contrastes_id_fk" FOREIGN KEY ("contraste_id") REFERENCES "public"."contrastes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "especificaciones" ADD CONSTRAINT "especificaciones_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuentes_conocimiento" ADD CONSTRAINT "fuentes_conocimiento_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuentes_conocimiento" ADD CONSTRAINT "fuentes_conocimiento_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_conocimiento" ADD CONSTRAINT "unidades_conocimiento_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_conocimiento" ADD CONSTRAINT "unidades_conocimiento_autor_experto_id_usuarios_id_fk" FOREIGN KEY ("autor_experto_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_conocimiento" ADD CONSTRAINT "unidades_conocimiento_validador_id_usuarios_id_fk" FOREIGN KEY ("validador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunks_unidad_idx" ON "chunks" USING btree ("unidad_id");--> statement-breakpoint
CREATE INDEX "especificaciones_producto_grupo_idx" ON "especificaciones" USING btree ("producto_id","grupo");--> statement-breakpoint
CREATE UNIQUE INDEX "especificaciones_producto_clave_idx" ON "especificaciones" USING btree ("producto_id","clave");--> statement-breakpoint
CREATE UNIQUE INDEX "glosario_termino_idx" ON "glosario_tecnico" USING btree ("termino");--> statement-breakpoint
CREATE INDEX "glosario_aliases_idx" ON "glosario_tecnico" USING gin ("aliases");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_marca_modelo_idx" ON "productos" USING btree ("marca","modelo");--> statement-breakpoint
CREATE INDEX "productos_categoria_idx" ON "productos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "productos_aliases_idx" ON "productos" USING gin ("aliases");