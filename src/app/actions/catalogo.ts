"use server";

/**
 * Edición del catálogo por parte de experto/admin.
 *
 * El seed carga el catálogo inicial, pero un catálogo que solo se actualiza
 * re-corriendo un script se muere: los precios cambian, los modelos llegan a
 * Chile y las specs se confirman. Esto lo pone en manos del experto, que es
 * quien está en la tienda.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import type {
  CategoriaProducto,
  Gama,
  GrupoEspecificacion,
} from "@/db/schema";

const CATEGORIAS: CategoriaProducto[] = [
  "smartphone",
  "plegable",
  "tablet",
  "wearable",
  "audio",
  "tv",
  "accesorio",
];
const GAMAS: Gama[] = ["alta", "media", "entrada"];
const ESTADOS = ["activo", "descontinuado", "proximo_lanzamiento"] as const;
const GRUPOS: GrupoEspecificacion[] = [
  "pantalla",
  "rendimiento",
  "camara",
  "bateria",
  "conectividad",
  "durabilidad",
  "software",
  "audio",
  "imagen",
];

function volver(ruta: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  revalidatePath(ruta);
  redirect(`${ruta}?${qs}`);
}

/** "s26 ultra, s26u , el ultra" → ["s26 ultra", "s26u", "el ultra"] */
function listaDesdeTexto(valor: FormDataEntryValue | null): string[] {
  return String(valor ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  const v = String(valor ?? "").trim();
  return v || null;
}

// --- Productos --------------------------------------------------------------

export async function crearProductoAction(formData: FormData) {
  await requireRole("experto", "admin");
  const marca = String(formData.get("marca") ?? "Samsung").trim() || "Samsung";
  const modelo = String(formData.get("modelo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "") as CategoriaProducto;
  const gama = String(formData.get("gama") ?? "") as Gama;

  if (modelo.length < 2) {
    volver("/catalogo", { error: "Ingresa el modelo del producto." });
  }
  if (!CATEGORIAS.includes(categoria) || !GAMAS.includes(gama)) {
    volver("/catalogo", { error: "Categoría o gama no válida." });
  }

  const [existente] = await db
    .select({ id: schema.productos.id })
    .from(schema.productos)
    .where(
      and(eq(schema.productos.marca, marca), eq(schema.productos.modelo, modelo))
    )
    .limit(1);
  if (existente) {
    volver("/catalogo", { error: `Ya existe una ficha de ${marca} ${modelo}.` });
  }

  const [creado] = await db
    .insert(schema.productos)
    .values({
      marca,
      modelo,
      aliases: listaDesdeTexto(formData.get("aliases")),
      categoria,
      gama,
      resumenVenta: textoOpcional(formData.get("resumenVenta")),
    })
    .returning({ id: schema.productos.id });

  volver(`/catalogo/${creado.id}`, { ok: `Ficha de ${modelo} creada.` });
}

export async function editarProductoAction(formData: FormData) {
  await requireRole("experto", "admin");
  const id = Number(formData.get("id"));
  const modelo = String(formData.get("modelo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "") as CategoriaProducto;
  const gama = String(formData.get("gama") ?? "") as Gama;
  const estado = String(formData.get("estado") ?? "") as (typeof ESTADOS)[number];
  const ruta = `/catalogo/${id}`;

  if (modelo.length < 2) volver(ruta, { error: "Ingresa el modelo." });
  if (!CATEGORIAS.includes(categoria) || !GAMAS.includes(gama)) {
    volver(ruta, { error: "Categoría o gama no válida." });
  }
  if (!ESTADOS.includes(estado)) volver(ruta, { error: "Estado no válido." });

  const [producto] = await db
    .select({ marca: schema.productos.marca })
    .from(schema.productos)
    .where(eq(schema.productos.id, id))
    .limit(1);
  if (!producto) volver("/catalogo", { error: "Producto no encontrado." });

  // (marca, modelo) es la clave natural: no se puede pisar otra ficha.
  const [choque] = await db
    .select({ id: schema.productos.id })
    .from(schema.productos)
    .where(
      and(
        eq(schema.productos.marca, producto.marca),
        eq(schema.productos.modelo, modelo),
        ne(schema.productos.id, id)
      )
    )
    .limit(1);
  if (choque) volver(ruta, { error: `Ya existe otra ficha de ${modelo}.` });

  await db
    .update(schema.productos)
    .set({
      modelo,
      aliases: listaDesdeTexto(formData.get("aliases")),
      categoria,
      gama,
      estado,
      resumenVenta: textoOpcional(formData.get("resumenVenta")),
      almacenamientos: listaDesdeTexto(formData.get("almacenamientos")),
      colores: listaDesdeTexto(formData.get("colores")),
      fuenteUrl: textoOpcional(formData.get("fuenteUrl")),
      actualizadoEn: new Date(),
    })
    .where(eq(schema.productos.id, id));

  volver(ruta, { ok: "Ficha actualizada." });
}

/**
 * Precio y vigencia. Son un solo formulario a propósito: un precio sin fecha
 * de vigencia es exactamente el dato que el agente NO puede citar, así que
 * pedirlos juntos evita dejar la ficha en un estado inútil.
 */
export async function actualizarPrecioAction(formData: FormData) {
  await requireRole("experto", "admin");
  const id = Number(formData.get("id"));
  const ruta = `/catalogo/${id}`;
  const precioBruto = String(formData.get("precioListaClp") ?? "").trim();
  const vigencia = String(formData.get("precioVigenteHasta") ?? "").trim();

  // Vaciar ambos campos es válido: es "este precio ya no corre".
  if (!precioBruto && !vigencia) {
    await db
      .update(schema.productos)
      .set({ precioListaClp: null, precioVigenteHasta: null, actualizadoEn: new Date() })
      .where(eq(schema.productos.id, id));
    volver(ruta, { ok: "Precio retirado de la ficha." });
  }

  const precio = Number(precioBruto.replace(/[^\d]/g, ""));
  if (!Number.isFinite(precio) || precio <= 0) {
    volver(ruta, { error: "El precio debe ser un monto en pesos." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigencia)) {
    volver(ruta, {
      error:
        "Indica hasta cuándo rige el precio: sin vigencia el asistente no puede citarlo.",
    });
  }

  await db
    .update(schema.productos)
    .set({
      precioListaClp: precio,
      precioVigenteHasta: vigencia,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.productos.id, id));

  volver(ruta, { ok: "Precio actualizado." });
}

/** Refresca la fecha de verificación: "revisé esta ficha y está correcta". */
export async function marcarVerificadoAction(formData: FormData) {
  await requireRole("experto", "admin");
  const id = Number(formData.get("id"));
  const ahora = new Date();

  await db
    .update(schema.productos)
    .set({ verificadoEn: ahora, actualizadoEn: ahora })
    .where(eq(schema.productos.id, id));

  volver(`/catalogo/${id}`, { ok: "Ficha marcada como verificada hoy." });
}

// --- Especificaciones -------------------------------------------------------

export async function guardarEspecificacionAction(formData: FormData) {
  await requireRole("experto", "admin");
  const productoId = Number(formData.get("productoId"));
  const especificacionId = Number(formData.get("especificacionId")) || null;
  const ruta = `/catalogo/${productoId}`;
  const grupo = String(formData.get("grupo") ?? "") as GrupoEspecificacion;
  const clave = String(formData.get("clave") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();

  if (!GRUPOS.includes(grupo)) volver(ruta, { error: "Grupo no válido." });
  if (!clave || !valor) {
    volver(ruta, { error: "La especificación necesita nombre y valor." });
  }

  const campos = {
    grupo,
    clave,
    valor,
    unidad: textoOpcional(formData.get("unidad")),
    esDiferenciador: formData.get("esDiferenciador") === "on",
    verificado: formData.get("verificado") === "on",
    fuenteUrl: textoOpcional(formData.get("fuenteUrl")),
  };

  if (especificacionId) {
    await db
      .update(schema.especificaciones)
      .set(campos)
      .where(eq(schema.especificaciones.id, especificacionId));
    volver(ruta, { ok: `"${clave}" actualizada.` });
  }

  const [choque] = await db
    .select({ id: schema.especificaciones.id })
    .from(schema.especificaciones)
    .where(
      and(
        eq(schema.especificaciones.productoId, productoId),
        eq(schema.especificaciones.clave, clave)
      )
    )
    .limit(1);
  if (choque) {
    volver(ruta, {
      error: `Esta ficha ya tiene una especificación "${clave}". Edítala en vez de duplicarla.`,
    });
  }

  await db.insert(schema.especificaciones).values({ productoId, ...campos });
  volver(ruta, { ok: `"${clave}" agregada.` });
}

export async function eliminarEspecificacionAction(formData: FormData) {
  await requireRole("experto", "admin");
  const productoId = Number(formData.get("productoId"));
  const id = Number(formData.get("especificacionId"));

  await db
    .delete(schema.especificaciones)
    .where(eq(schema.especificaciones.id, id));

  volver(`/catalogo/${productoId}`, { ok: "Especificación eliminada." });
}
