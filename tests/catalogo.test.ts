/**
 * Catálogo determinista: fichas técnicas, comparativas y glosario.
 *
 * Lo que se prueba aquí no es "que la IA responda bien", es que el dato duro
 * salga exacto o no salga: resolución de alias, filtrado por atributo,
 * comparación con atributos faltantes, y la regla de precio —la más cara de
 * equivocarse en piso de venta— que vive en el código y no en el prompt.
 *
 * Se fuerza MODO DEMO (sin API key): el catálogo no depende de la IA.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import {
  compararProductos,
  consultarFichaTecnica,
  detectarIntencionCatalogo,
  explicarTecnicismo,
  glosarioParaTextos,
  listarProductos,
  productosMencionados,
  resolverPrecio,
  resolverProducto,
} from "@/lib/catalogo";
import { fichaParaAgente } from "@/lib/catalogo-respuestas";

const MARCA = "TestMarca";
/** Cifra imposible de confundir: si aparece, el precio se filtró. */
const PRECIO_VENCIDO = 1_234_567;

let cargoId: number;
let ultraId: number;
let baseId: number;
let plusId: number;
let vencidoId: number;
let terminoId: number;

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;

  const [cargo] = await db
    .insert(schema.cargos)
    .values({ nombre: `Vendedor (test catálogo ${Date.now()})` })
    .returning();
  cargoId = cargo.id;

  const [ultra, base, plus, vencido] = await db
    .insert(schema.productos)
    .values([
      {
        marca: MARCA,
        modelo: "Zetatron Z9 Ultra",
        aliases: ["z9 ultra", "z9u", "el zeta"],
        categoria: "smartphone",
        gama: "alta",
        precioListaClp: 999_990,
        precioVigenteHasta: "2099-12-31",
        resumenVenta: "Tope de gama de prueba.",
        verificadoEn: new Date(),
      },
      {
        marca: MARCA,
        modelo: "Zetatron Z9",
        aliases: ["z9", "el z9 base"],
        categoria: "smartphone",
        gama: "alta",
        precioListaClp: 599_990,
        precioVigenteHasta: "2099-12-31",
        resumenVenta: "Modelo base de prueba.",
      },
      {
        // El "+" tiene que sobrevivir a la normalización: si no, este
        // producto y el "Zetatron Z9" son indistinguibles para el catálogo.
        marca: MARCA,
        modelo: "Zetatron Z9+",
        aliases: ["z9 plus", "z9+"],
        categoria: "smartphone",
        gama: "alta",
        resumenVenta: "Modelo plus de prueba.",
      },
      {
        marca: MARCA,
        modelo: "Zetatron Caduco",
        aliases: ["caduco", "el caduco"],
        categoria: "smartphone",
        gama: "media",
        // El caso crítico: precio cargado pero con vigencia ya pasada.
        precioListaClp: PRECIO_VENCIDO,
        precioVigenteHasta: "2020-01-01",
        resumenVenta: "Modelo con precio no vigente.",
      },
    ])
    .returning();
  ultraId = ultra.id;
  baseId = base.id;
  plusId = plus.id;
  vencidoId = vencido.id;

  await db.insert(schema.especificaciones).values([
    { productoId: ultraId, grupo: "bateria", clave: "Capacidad", valor: "5000", unidad: "mAh", verificado: true },
    { productoId: ultraId, grupo: "bateria", clave: "Carga rápida", valor: "60", unidad: "W", verificado: true },
    { productoId: ultraId, grupo: "pantalla", clave: "Tamaño", valor: "6.9", unidad: '"', verificado: true },
    // Atributo que SOLO tiene el Ultra: es el caso de la comparación incompleta.
    { productoId: ultraId, grupo: "camara", clave: "Apertura principal", valor: "f/1.4", esDiferenciador: true, verificado: true },
    { productoId: baseId, grupo: "bateria", clave: "Capacidad", valor: "4000", unidad: "mAh", verificado: true },
    { productoId: baseId, grupo: "pantalla", clave: "Tamaño", valor: "6.5", unidad: '"', verificado: true },
    { productoId: vencidoId, grupo: "bateria", clave: "Capacidad", valor: "3000", unidad: "mAh", verificado: true },
  ]);

  const [termino] = await db
    .insert(schema.glosarioTecnico)
    .values({
      termino: "Zeta Display",
      // "isp" es un alias corto a propósito: sirve para probar que la
      // detección de tecnicismos respeta límites de palabra.
      aliases: ["zetadisplay", "pantalla zeta", "isp"],
      definicionTecnica: "Panel de prueba con capa de difracción.",
      traduccionVenta: "Es una pantalla que se ve nítida desde el frente.",
      beneficioCliente: "Puede usarlo al sol sin problemas.",
      erroresComunes: "No digas que es un protector que se pega.",
    })
    .returning();
  terminoId = termino.id;
});

afterAll(async () => {
  await db.delete(schema.consultas).where(eq(schema.consultas.cargoId, cargoId));
  await db
    .delete(schema.productos)
    .where(
      inArray(schema.productos.id, [ultraId, baseId, plusId, vencidoId])
    );
  await db
    .delete(schema.glosarioTecnico)
    .where(eq(schema.glosarioTecnico.id, terminoId));
  await db.delete(schema.cargos).where(eq(schema.cargos.id, cargoId));
  await closeDb();
});

describe("resolución de modelo", () => {
  it("resuelve abreviaciones y muletillas del piso de venta", async () => {
    // "el s26 u" → s26ultra: se botan las muletillas y se pegan los tokens.
    const res = await resolverProducto("el z9 u");
    expect(res.tipo).toBe("unico");
    expect(res.tipo === "unico" && res.producto.id).toBe(ultraId);
  });

  it("ignora tildes y mayúsculas", async () => {
    const res = await resolverProducto("ZÉTATRON Z9 ÚLTRA");
    expect(res.tipo).toBe("unico");
    expect(res.tipo === "unico" && res.producto.id).toBe(ultraId);
  });

  it("prefiere la coincidencia más específica sobre la genérica", async () => {
    // "z9 ultra" no puede resolver al "Zetatron Z9" solo porque contenga "z9".
    const res = await resolverProducto("z9 ultra");
    expect(res.tipo === "unico" && res.producto.id).toBe(ultraId);
  });

  it("no adivina: ante varios candidatos los devuelve para repreguntar", async () => {
    const res = await resolverProducto("zetatron");
    expect(res.tipo).toBe("ambiguo");
    expect(
      res.tipo === "ambiguo" && res.candidatos.length
    ).toBeGreaterThanOrEqual(2);
  });

  it("devuelve sin_match cuando el modelo no existe", async () => {
    const res = await resolverProducto("Nokia 3310");
    expect(res.tipo).toBe("sin_match");
  });

  it("distingue el modelo '+' del modelo base", async () => {
    // Si el "+" se pierde al normalizar, ambos colapsan al mismo nombre.
    const conPlus = await resolverProducto("z9+");
    expect(conPlus.tipo === "unico" && conPlus.producto.id).toBe(plusId);

    const sinPlus = await resolverProducto("el z9 base");
    expect(sinPlus.tipo === "unico" && sinPlus.producto.id).toBe(baseId);
  });
});

describe("detección de productos en la pregunta", () => {
  it("no confunde el modelo base con el nombre largo que lo contiene", async () => {
    // "z9" está dentro de "z9 ultra": nombrar al Ultra NO nombra al base.
    const productos = await listarProductos();
    const mencionados = productosMencionados(
      "¿cuánta batería tiene el Zetatron Z9 Ultra?",
      productos
    );
    expect(mencionados.map((p) => p.id)).toEqual([ultraId]);
  });

  it("detecta los dos productos de una comparación con '+'", async () => {
    const productos = await listarProductos();
    const mencionados = productosMencionados(
      "compárame el Z9 con el Z9+",
      productos
    );
    expect(mencionados.map((p) => p.id)).toEqual([baseId, plusId]);
  });

  it("clasifica un dato duro como ficha y no como comparativa", async () => {
    const intencion = await detectarIntencionCatalogo(
      "¿cuánta batería tiene el Zetatron Z9 Ultra?"
    );
    expect(intencion.tipo).toBe("ficha");
    expect(intencion.tipo === "ficha" && intencion.producto.id).toBe(ultraId);
  });

  it("clasifica una comparación explícita como comparativa", async () => {
    const intencion = await detectarIntencionCatalogo(
      "compárame el Z9 con el Z9+"
    );
    expect(intencion.tipo).toBe("comparacion");
  });
});

describe("consultar_ficha_tecnica", () => {
  it("sin atributos devuelve la ficha completa", async () => {
    const res = await consultarFichaTecnica("z9 ultra");
    expect(res.tipo).toBe("ficha");
    if (res.tipo !== "ficha") return;
    expect(res.ficha.especificaciones).toHaveLength(4);
  });

  it("con atributos la acota a lo preguntado", async () => {
    const res = await consultarFichaTecnica("z9 ultra", ["bateria"]);
    expect(res.tipo).toBe("ficha");
    if (res.tipo !== "ficha") return;

    const claves = res.ficha.especificaciones.map((s) => s.clave);
    expect(claves).toContain("Capacidad");
    expect(claves).toContain("Carga rápida");
    expect(claves).not.toContain("Tamaño");
    expect(res.ficha.especificaciones.every((s) => s.grupo === "bateria")).toBe(
      true
    );
  });

  it("resuelve el sinónimo de venta al grupo correcto de la ficha", async () => {
    // El vendedor dice "pantalla", la ficha guarda la clave "Tamaño".
    const res = await consultarFichaTecnica("z9 ultra", ["pantalla"]);
    if (res.tipo !== "ficha") throw new Error("esperaba ficha");
    expect(res.ficha.especificaciones.map((s) => s.clave)).toEqual(["Tamaño"]);
  });
});

describe("comparar_productos", () => {
  it("marca como no informado el atributo que solo tiene uno de los dos", async () => {
    const res = await compararProductos("z9 ultra", "z9");
    expect(res.tipo).toBe("comparacion");
    if (res.tipo !== "comparacion") return;

    const apertura = res.filas.find((f) => f.clave === "Apertura principal");
    expect(apertura).toBeDefined();
    expect(apertura!.valorA).toBe("f/1.4");
    // Ausencia de dato ≠ ausencia de la característica: va en null, no en "no".
    expect(apertura!.valorB).toBeNull();
    expect(apertura!.esDiferenciador).toBe(true);
  });

  it("detecta las diferencias reales y lo que es igual", async () => {
    const res = await compararProductos("z9 ultra", "z9", ["bateria"]);
    if (res.tipo !== "comparacion") throw new Error("esperaba comparación");

    const capacidad = res.filas.find((f) => f.clave === "Capacidad");
    expect(capacidad!.valorA).toBe("5000 mAh");
    expect(capacidad!.valorB).toBe("4000 mAh");
    expect(capacidad!.iguales).toBe(false);
    // El filtro por atributo aplica a los dos lados de la comparación.
    expect(res.filas.every((f) => f.grupo === "bateria")).toBe(true);
  });

  it("no compara contra un modelo que no existe", async () => {
    const res = await compararProductos("z9 ultra", "iPhone 42");
    expect(res.tipo).toBe("sin_match");
  });
});

describe("regla de precio", () => {
  it("cita el precio vigente con la fórmula obligatoria", async () => {
    const res = await consultarFichaTecnica("z9 ultra");
    if (res.tipo !== "ficha") throw new Error("esperaba ficha");

    expect(res.ficha.precio.citable).toBe(true);
    expect(res.ficha.precio.texto).toContain("$999.990");
    expect(res.ficha.precio.texto).toContain("precio de lista referencial");
    expect(res.ficha.precio.texto).toContain("lo confirma tu jefe de tienda");
  });

  it("NO entrega el precio cuando la vigencia ya pasó", async () => {
    const res = await consultarFichaTecnica("el caduco");
    if (res.tipo !== "ficha") throw new Error("esperaba ficha");

    expect(res.ficha.precio.citable).toBe(false);
    expect(res.ficha.precio.texto).toContain("jefe de tienda");
    expect(res.ficha.precio.texto).not.toContain("1.234.567");
  });

  it("el modelo NUNCA ve la cifra vencida: la regla vive en el código", async () => {
    const res = await consultarFichaTecnica("el caduco");
    if (res.tipo !== "ficha") throw new Error("esperaba ficha");

    // Esto es lo que realmente se le manda a Claude como contexto.
    const contexto = fichaParaAgente(res.ficha);
    expect(contexto).not.toContain("1.234.567");
    expect(contexto).not.toContain(String(PRECIO_VENCIDO));
    expect(contexto).toContain("jefe de tienda");
  });

  it("tampoco entrega precio si no está cargado", () => {
    const precio = resolverPrecio({
      modelo: "Sin Precio",
      precioListaClp: null,
      precioVigenteHasta: null,
    });
    expect(precio.citable).toBe(false);
    expect(precio.citable === false && precio.motivo).toBe("sin_precio");
  });

  it("la vigencia se evalúa contra la fecha del día, no contra el seed", () => {
    const producto = {
      modelo: "Zetatron Z9 Ultra",
      precioListaClp: 999_990,
      precioVigenteHasta: "2026-06-30",
    };
    expect(resolverPrecio(producto, new Date("2026-06-29")).citable).toBe(true);
    expect(resolverPrecio(producto, new Date("2026-07-01")).citable).toBe(false);
  });
});

describe("explicar_tecnicismo", () => {
  it("resuelve el término por alias y prioriza la traducción de venta", async () => {
    const t = await explicarTecnicismo("zetadisplay");
    expect(t).not.toBeNull();
    expect(t!.termino).toBe("Zeta Display");
    expect(t!.traduccionVenta).toContain("pantalla");
    expect(t!.erroresComunes).toContain("protector");
  });

  it("devuelve null si el término no está documentado", async () => {
    const t = await explicarTecnicismo("hiperdrive cuántico");
    expect(t).toBeNull();
  });

  it("detecta el término en la ficha por palabra completa", async () => {
    const encontrados = await glosarioParaTextos([
      "Tipo de panel: Zeta Display de nueva generación",
    ]);
    expect(encontrados.map((t) => t.id)).toContain(terminoId);
  });

  it("NO lo detecta cuando el alias solo aparece dentro de otra palabra", async () => {
    // El bug real: "están cargados" contiene "anc" y la ficha de un celular
    // terminaba explicando cancelación de ruido.
    const encontrados = await glosarioParaTextos(["Los crisps son ricos"]);
    expect(encontrados.map((t) => t.id)).not.toContain(terminoId);
  });
});

describe("integración con el guardarraíl", () => {
  it("responde un dato duro desde la ficha, sin pasar por embeddings", async () => {
    const { responderConsulta } = await import("@/lib/rag");
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta: "¿cuánta batería tiene el Zetatron Z9 Ultra?",
    });

    expect(res.resuelta).toBe(true);
    expect(res.respuesta).toContain("5000");
    // Una sola ficha: preguntar por el Ultra no es pedir una comparativa.
    expect(res.fuentes).toHaveLength(1);
    expect(res.fuentes[0].tipo).toBe("ficha_tecnica");
    expect(res.fuentes[0].productoId).toBe(ultraId);
    expect(res.respuesta).not.toContain("vs");

    // El camino rápido ni siquiera embebe la pregunta: ese es el salto de
    // latencia (de 7-16s a <1s). Si esto deja de ser null, se rompió.
    const [consulta] = await db
      .select()
      .from(schema.consultas)
      .where(eq(schema.consultas.id, res.consultaId));
    expect(consulta.embedding).toBeNull();
    expect(consulta.resuelta).toBe(true);
  });

  it("con el precio vencido no responde el precio: deriva al jefe de tienda", async () => {
    const { responderConsulta, RESPUESTA_SIN_COBERTURA } = await import(
      "@/lib/rag"
    );
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta: "¿cuánto sale el Zetatron Caduco?",
    });

    expect(res.respuesta).not.toContain("1.234.567");
    expect(res.respuesta).not.toContain(String(PRECIO_VENCIDO));
    expect(res.resuelta).toBe(false);
    expect(res.respuesta).toBe(RESPUESTA_SIN_COBERTURA);
    expect(res.fuentes).toHaveLength(0);
  });

  it("el guardarraíl original sigue intacto sin cobertura ni en chunks ni en fichas", async () => {
    const { responderConsulta, RESPUESTA_SIN_COBERTURA } = await import(
      "@/lib/rag"
    );
    const res = await responderConsulta({
      usuarioId: null,
      cargoId,
      pregunta: "¿Cómo preparo una declaración de impuestos personales?",
    });

    expect(res.resuelta).toBe(false);
    expect(res.respuesta).toBe(RESPUESTA_SIN_COBERTURA);
    expect(res.fuentes).toHaveLength(0);
  });
});
