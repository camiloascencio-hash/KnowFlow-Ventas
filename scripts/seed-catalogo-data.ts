/**
 * Catálogo semilla — datos verificados a julio de 2026.
 *
 * REGLA DE ORO DE ESTE ARCHIVO: no se inventan especificaciones. Solo se carga
 * lo que está respaldado. Lo que no está confirmado va con `verificado: false`
 * o directamente no se carga (queda `null`), y el agente deriva al jefe de
 * tienda en vez de deducir. Un dato inventado en piso de venta es una promesa
 * que la tienda después tiene que cumplir.
 */
import type {
  CategoriaProducto,
  Gama,
  GrupoEspecificacion,
} from "../src/db/schema";

export type SpecSeed = {
  grupo: GrupoEspecificacion;
  clave: string;
  valor: string;
  unidad?: string;
  /** Es un argumento de venta, no solo un dato de la tabla. */
  esDiferenciador?: boolean;
  /** Por defecto false: solo se marca lo respaldado por fuente. */
  verificado?: boolean;
};

export type ProductoSeed = {
  modelo: string;
  aliases: string[];
  categoria: CategoriaProducto;
  gama: Gama;
  fechaLanzamiento?: string;
  fechaLanzamientoChile?: string;
  precioListaClp?: number;
  /**
   * Vigencia comercial del precio de lista. Es un dato OPERACIONAL que la
   * tienda mantiene: vencido, el agente deja de citarlo y deriva.
   */
  precioVigenteHasta?: string;
  almacenamientos?: string[];
  colores?: string[];
  resumenVenta: string;
  estado?: "activo" | "descontinuado" | "proximo_lanzamiento";
  fuenteUrl?: string;
  /** Marca `verificadoEn = ahora`. Solo para fichas con fuente contrastada. */
  verificado?: boolean;
  specs: SpecSeed[];
};

const SAMSUNG_CL = "https://www.samsung.com/cl/";

export const productosSeed: ProductoSeed[] = [
  // --- Serie S26: gama alta ------------------------------------------------
  {
    modelo: "Galaxy S26 Ultra",
    aliases: ["s26 ultra", "s26u", "el ultra", "ultra"],
    categoria: "smartphone",
    gama: "alta",
    fechaLanzamiento: "2026-02-25",
    fechaLanzamientoChile: "2026-03-11",
    almacenamientos: ["256 GB", "512 GB", "1 TB"],
    colores: [
      "Violeta cobalto",
      "Azul cielo",
      "Negro",
      "Blanco",
      "Sombra plateada",
      "Oro rosa",
    ],
    resumenVenta:
      "El tope de gama para el cliente que no transa en cámara ni pantalla. Su argumento único es el Privacy Display: nadie más lo tiene. Precio de lista en Chile por confirmar en samsung.cl.",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      { grupo: "pantalla", clave: "Tamaño", valor: "6.9", unidad: '"', verificado: true },
      { grupo: "pantalla", clave: "Tecnología", valor: "Dynamic AMOLED 2X", verificado: true },
      { grupo: "pantalla", clave: "Resolución", valor: "1440 × 3120 (QHD+)", verificado: true },
      { grupo: "pantalla", clave: "Tasa de refresco", valor: "120", unidad: "Hz", verificado: true },
      { grupo: "pantalla", clave: "Densidad de píxeles", valor: "~505", unidad: "ppi", verificado: true },
      {
        grupo: "pantalla",
        clave: "Privacy Display",
        valor:
          "Sí — primer smartphone del mundo con reducción de visibilidad de pantalla en ángulo por hardware",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "rendimiento",
        clave: "Procesador",
        valor: "Snapdragon 8 Elite Gen 5 for Galaxy (variante overclockeada)",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "rendimiento", clave: "RAM", valor: "12", unidad: "GB", verificado: true },
      { grupo: "camara", clave: "Sistema", valor: "Cuádruple", verificado: true },
      {
        grupo: "camara",
        clave: "Cámara principal",
        valor: "200",
        unidad: "MP",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "camara",
        clave: "Apertura principal",
        valor: "f/1.4",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "camara", clave: "Cámara frontal", valor: "12", unidad: "MP", verificado: true },
      { grupo: "bateria", clave: "Capacidad", valor: "5000", unidad: "mAh", verificado: true },
      { grupo: "bateria", clave: "Carga rápida", valor: "60", unidad: "W", verificado: true },
      { grupo: "bateria", clave: "Carga inalámbrica", valor: "Sí", verificado: true },
      {
        grupo: "bateria",
        clave: "Carga inalámbrica reversa",
        valor: "Sí",
        verificado: true,
      },
      { grupo: "durabilidad", clave: "Resistencia", valor: "IP68", verificado: true },
      { grupo: "durabilidad", clave: "Lector de huella", valor: "En pantalla", verificado: true },
      { grupo: "conectividad", clave: "NFC", valor: "Sí", verificado: true },
      { grupo: "conectividad", clave: "Redes", valor: "5G", verificado: true },
    ],
  },
  {
    modelo: "Galaxy S26",
    aliases: ["s26", "el base"],
    categoria: "smartphone",
    gama: "alta",
    fechaLanzamiento: "2026-02-25",
    fechaLanzamientoChile: "2026-03-11",
    precioListaClp: 1_099_990,
    precioVigenteHasta: "2026-12-31",
    almacenamientos: ["256 GB", "512 GB"],
    colores: [
      "Violeta cobalto",
      "Azul cielo",
      "Negro",
      "Blanco",
      "Sombra plateada",
      "Oro rosa",
    ],
    resumenVenta:
      "La puerta de entrada a la gama alta: mismo ecosistema y misma serie que el Ultra en un cuerpo más manejable. Precio de lista $1.099.990 (256 GB) y $1.299.990 (512 GB).",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      // "6.7 medido como rectángulo completo": la diagonal efectiva está por
      // confirmar en las specs oficiales, así que va sin verificar.
      {
        grupo: "pantalla",
        clave: "Tamaño",
        valor: "6.7 (medida como rectángulo completo; diagonal efectiva por confirmar)",
        unidad: '"',
        verificado: false,
      },
      { grupo: "pantalla", clave: "Tecnología", valor: "Dynamic AMOLED de alta resolución", verificado: true },
      { grupo: "durabilidad", clave: "Resistencia", valor: "IP68", verificado: true },
      { grupo: "conectividad", clave: "Redes", valor: "5G", verificado: true },
    ],
  },
  {
    modelo: "Galaxy S26+",
    aliases: ["s26 plus", "s26+", "s26plus"],
    categoria: "smartphone",
    gama: "alta",
    fechaLanzamiento: "2026-02-25",
    fechaLanzamientoChile: "2026-03-11",
    precioListaClp: 1_349_990,
    precioVigenteHasta: "2026-12-31",
    almacenamientos: ["256 GB", "512 GB"],
    colores: [
      "Violeta cobalto",
      "Azul cielo",
      "Negro",
      "Blanco",
      "Sombra plateada",
      "Oro rosa",
    ],
    resumenVenta:
      "Para quien quiere pantalla grande sin pagar el Ultra. Precio de lista $1.349.990 (256 GB) y $1.549.990 (512 GB).",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "pantalla",
        clave: "Tamaño",
        valor: "6.7 como rectángulo completo / 6.5 con esquinas redondeadas",
        unidad: '"',
        verificado: true,
      },
      { grupo: "pantalla", clave: "Tecnología", valor: "Dynamic AMOLED de alta resolución", verificado: true },
      { grupo: "durabilidad", clave: "Resistencia", valor: "IP68", verificado: true },
      { grupo: "conectividad", clave: "Redes", valor: "5G", verificado: true },
    ],
  },

  // --- Plegables: recién presentados, aún no en tienda ---------------------
  {
    modelo: "Galaxy Z Fold8",
    aliases: ["fold 8", "fold8", "el fold"],
    categoria: "plegable",
    gama: "alta",
    fechaLanzamiento: "2026-08-07",
    almacenamientos: ["256 GB"],
    resumenVenta:
      "Presentado en el Unpacked del 22-jul-2026, a la venta desde el 7-ago-2026. Su gancho es el formato ancho tipo pasaporte: se usa más cómodo con una mano que un plegable libro. Precio en Chile aún no definido.",
    estado: "proximo_lanzamiento",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "pantalla",
        clave: "Pantalla interna",
        valor: "7.6",
        unidad: '"',
        verificado: true,
      },
      {
        grupo: "pantalla",
        clave: "Formato",
        valor:
          "Ancho tipo pasaporte: más bajo y ancho que un plegable libro convencional",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "rendimiento",
        clave: "Procesador",
        valor: "Snapdragon 8 Elite Gen 5 for Galaxy",
        verificado: true,
      },
      { grupo: "rendimiento", clave: "RAM", valor: "12", unidad: "GB", verificado: true },
      { grupo: "camara", clave: "Sistema", valor: "Doble", verificado: true },
      { grupo: "bateria", clave: "Capacidad", valor: "4800", unidad: "mAh", verificado: true },
      { grupo: "software", clave: "Sistema operativo", valor: "Android 17", verificado: true },
    ],
  },
  {
    modelo: "Galaxy Z Fold8 Ultra",
    aliases: ["fold 8 ultra", "fold ultra", "fold8 ultra"],
    categoria: "plegable",
    gama: "alta",
    fechaLanzamiento: "2026-08-07",
    resumenVenta:
      "Sucesor directo del Z Fold7 y tope de la línea plegable: suma cámara triple y más batería que el Fold8. Precio en Chile aún no definido.",
    estado: "proximo_lanzamiento",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "camara",
        clave: "Sistema",
        valor: "Triple",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "bateria",
        clave: "Capacidad",
        valor: "Mayor que la del Z Fold8 (capacidad exacta por confirmar)",
        verificado: false,
      },
    ],
  },
  {
    modelo: "Galaxy Z Flip8",
    aliases: ["flip 8", "flip8", "el flip"],
    categoria: "plegable",
    gama: "alta",
    fechaLanzamiento: "2026-08-07",
    resumenVenta:
      "El plegable de bolsillo: más liviano que la generación anterior y con la pantalla de cubierta mucho más útil. Entra por diseño, no por specs. Precio en Chile aún no definido.",
    estado: "proximo_lanzamiento",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "rendimiento",
        clave: "Procesador",
        valor: "Snapdragon 8 Elite Gen 5 for Galaxy",
        verificado: true,
      },
      {
        grupo: "durabilidad",
        clave: "Diseño",
        valor:
          "Más liviano, con bisagra rediseñada para abrir y cerrar con menos esfuerzo",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "pantalla",
        clave: "Pantalla de cubierta",
        valor: "Más útil y personalizable que la generación anterior",
        esDiferenciador: true,
        verificado: true,
      },
    ],
  },

  // --- Gama media: el volumen real del piso de venta -----------------------
  {
    modelo: "Galaxy A57 5G",
    aliases: ["a57", "a 57", "a57 5g"],
    categoria: "smartphone",
    gama: "media",
    fechaLanzamientoChile: "2026-03-26",
    precioListaClp: 599_990,
    precioVigenteHasta: "2026-12-31",
    almacenamientos: ["128 GB", "256 GB"],
    colores: [
      "Awesome Navy",
      "Awesome Gray",
      "Awesome Icyblue",
      "Awesome Lilac",
    ],
    resumenVenta:
      "El caballo de batalla de la gama media: 6 generaciones de Android y 6 años de parches, que es el argumento más fuerte frente a la competencia china. Lista $599.990 (128 GB). La versión de 256 GB se ofreció al mismo precio como promoción de lanzamiento: vigencia POR CONFIRMAR, no la prometas sin revisarla con tu jefe de tienda.",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "rendimiento",
        clave: "Procesador",
        valor: "Exynos 1680 (4 nm)",
        verificado: true,
      },
      { grupo: "rendimiento", clave: "GPU", valor: "Xclipse 550", verificado: true },
      { grupo: "rendimiento", clave: "NPU", valor: "Mejorada respecto de la generación anterior", verificado: true },
      {
        grupo: "durabilidad",
        clave: "Grosor",
        valor: "6,9",
        unidad: "mm",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "durabilidad",
        clave: "Peso",
        valor: "179",
        unidad: "g",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "durabilidad", clave: "Resistencia", valor: "IP68", verificado: true },
      { grupo: "camara", clave: "Cámara principal", valor: "50", unidad: "MP", verificado: true },
      { grupo: "bateria", clave: "Capacidad", valor: "5000", unidad: "mAh", verificado: true },
      {
        grupo: "software",
        clave: "Actualizaciones",
        valor:
          "Hasta 6 generaciones de Android y 6 años de parches de seguridad",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "conectividad", clave: "Redes", valor: "5G", verificado: true },
    ],
  },
  {
    modelo: "Galaxy A37",
    aliases: ["a37", "a 37"],
    categoria: "smartphone",
    gama: "media",
    fechaLanzamientoChile: "2026-03-26",
    resumenVenta:
      "Llegó a Chile junto con el A57. Sus especificaciones y su precio todavía no están cargados en el catálogo validado: confírmalos con tu jefe de tienda antes de comprometer nada.",
    estado: "activo",
    specs: [],
  },

  // --- Tablets -------------------------------------------------------------
  {
    modelo: "Galaxy Tab S11",
    aliases: ["tab s11", "tablet s11"],
    categoria: "tablet",
    gama: "alta",
    fechaLanzamiento: "2025-09-01",
    almacenamientos: ["128 GB", "512 GB", "2 TB"],
    resumenVenta:
      "La tablet para quien quiere trabajar y ver contenido: 18 horas de video y ranura microSDXC, algo que el iPad no ofrece. Precio en Chile por confirmar en samsung.cl.",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      { grupo: "pantalla", clave: "Tamaño", valor: "11", unidad: '"', verificado: true },
      { grupo: "rendimiento", clave: "Procesador", valor: "Dimensity 9400+", verificado: true },
      { grupo: "rendimiento", clave: "RAM", valor: "12", unidad: "GB", verificado: true },
      {
        grupo: "conectividad",
        clave: "Almacenamiento expandible",
        valor: "Ranura microSDXC",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "bateria", clave: "Capacidad", valor: "8400", unidad: "mAh", verificado: true },
      {
        grupo: "bateria",
        clave: "Autonomía de video",
        valor: "Hasta 18",
        unidad: "h",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "durabilidad", clave: "Grosor", valor: "5,5", unidad: "mm", verificado: true },
      { grupo: "durabilidad", clave: "Peso", valor: "469-471", unidad: "g", verificado: true },
      {
        grupo: "software",
        clave: "Sistema operativo",
        valor: "Android 16 con One UI 8.5",
        verificado: true,
      },
    ],
  },
  {
    modelo: "Galaxy Tab S11 Ultra",
    aliases: ["tab s11 ultra", "tablet s11 ultra"],
    categoria: "tablet",
    gama: "alta",
    resumenVenta:
      "Tope de la línea de tablets. Sus especificaciones aún no están cargadas en el catálogo validado: confírmalas en samsung.cl antes de comprometer algo con el cliente.",
    estado: "activo",
    specs: [],
  },

  // --- Wearables y audio ---------------------------------------------------
  {
    modelo: "Galaxy Watch8",
    aliases: ["watch 8", "watch8", "reloj"],
    categoria: "wearable",
    gama: "alta",
    fechaLanzamiento: "2025-07-25",
    almacenamientos: ["32 GB"],
    resumenVenta:
      "El reloj que completa la venta del smartphone: 3000 nits de brillo pico, o sea que se lee al sol pleno. Precio en Chile por confirmar en samsung.cl.",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      { grupo: "pantalla", clave: "Tecnología", valor: "Super AMOLED", verificado: true },
      { grupo: "pantalla", clave: "Tamaño", valor: "1,47", unidad: '"', verificado: true },
      { grupo: "pantalla", clave: "Resolución", valor: "480 × 480", verificado: true },
      {
        grupo: "pantalla",
        clave: "Brillo pico",
        valor: "3000",
        unidad: "nits",
        esDiferenciador: true,
        verificado: true,
      },
      { grupo: "rendimiento", clave: "Procesador", valor: "Exynos W1000 (3 nm)", verificado: true },
      { grupo: "rendimiento", clave: "RAM", valor: "2", unidad: "GB", verificado: true },
      { grupo: "rendimiento", clave: "Almacenamiento", valor: "32", unidad: "GB", verificado: true },
      {
        grupo: "software",
        clave: "Sistema operativo",
        valor: "Wear OS 6 con One UI 8 Watch",
        verificado: true,
      },
      { grupo: "durabilidad", clave: "Peso", valor: "30 (40 mm) / 34 (44 mm)", unidad: "g", verificado: true },
      {
        grupo: "durabilidad",
        clave: "Dimensiones",
        valor: "46 × 43,7 × 8,6",
        unidad: "mm",
        verificado: true,
      },
    ],
  },
  {
    modelo: "Galaxy Buds4 Pro",
    aliases: ["buds4 pro", "buds 4 pro", "audifonos pro"],
    categoria: "audio",
    gama: "alta",
    resumenVenta:
      "El upsell natural del smartphone gama alta: el salto real frente a los Buds3 Pro está en las llamadas, que se escuchan notoriamente más nítidas. Precio en Chile por confirmar en samsung.cl.",
    estado: "activo",
    fuenteUrl: SAMSUNG_CL,
    verificado: true,
    specs: [
      {
        grupo: "audio",
        clave: "Woofer",
        valor: "Diafragma 19,8% más grande que el de los Buds3 Pro",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "audio",
        clave: "Aislamiento de voz",
        valor: "Por red neuronal profunda (DNN)",
        esDiferenciador: true,
        verificado: true,
      },
      {
        grupo: "audio",
        clave: "Calidad de voz en llamadas",
        valor: "Super Wideband (SWB) hasta 16 kHz",
        esDiferenciador: true,
        verificado: true,
      },
    ],
  },
  {
    modelo: "Galaxy Buds4",
    aliases: ["buds4", "buds 4", "audifonos"],
    categoria: "audio",
    gama: "media",
    resumenVenta:
      "La versión estándar de los Buds4. Sus especificaciones aún no están cargadas en el catálogo validado: si el cliente compara con los Pro, confirma los datos antes de afirmar diferencias.",
    estado: "activo",
    specs: [],
  },

  // --- Televisores línea 2026 ---------------------------------------------
  // La información disponible es de lanzamientos GLOBALES. Los nombres de
  // modelo y la disponibilidad en Chile deben confirmarse en samsung.cl, así
  // que toda esta sección va sin verificar.
  {
    modelo: "Micro RGB 2026",
    aliases: ["micro rgb", "microrgb"],
    categoria: "tv",
    gama: "alta",
    resumenVenta:
      "Nuevo tope de gama LCD que reemplaza a los Neo QLED premium: es EL tecnicismo de la temporada. Disponibilidad y nombre de modelo en Chile POR CONFIRMAR en samsung.cl.",
    estado: "activo",
    specs: [
      {
        grupo: "imagen",
        clave: "Tecnología de retroiluminación",
        valor:
          "LEDs rojos, verdes y azules individuales en el backlight, en vez de LEDs blancos con filtro de color",
        esDiferenciador: true,
        verificado: false,
      },
      {
        grupo: "imagen",
        clave: "Ventaja de imagen",
        valor: "Colores más puros, mayor brillo y más control por zona",
        verificado: false,
      },
    ],
  },
  {
    modelo: "Neo QLED QN80H",
    aliases: ["qn80h", "neo qled qn80h"],
    categoria: "tv",
    gama: "alta",
    resumenVenta:
      "Reemplaza al QN80F en la línea 2026. Disponibilidad y nombre de modelo en Chile POR CONFIRMAR en samsung.cl.",
    estado: "activo",
    specs: [
      { grupo: "imagen", clave: "Panel", valor: "Quantum Dot + Mini LED", verificado: false },
      {
        grupo: "imagen",
        clave: "Atenuación local",
        valor: "Más zonas que el QN80F",
        verificado: false,
      },
      { grupo: "imagen", clave: "Resolución y refresco", valor: "4K a 144 Hz", verificado: false },
      { grupo: "conectividad", clave: "HDMI", valor: "Cuatro puertos HDMI 2.1", verificado: false },
    ],
  },
  {
    modelo: "Neo QLED QN70H",
    aliases: ["qn70h", "neo qled qn70h"],
    categoria: "tv",
    gama: "media",
    resumenVenta:
      "La opción de gaming de la línea 2026: hasta 288 Hz de refresco. Disponibilidad y nombre de modelo en Chile POR CONFIRMAR en samsung.cl.",
    estado: "activo",
    specs: [
      {
        grupo: "imagen",
        clave: "Tecnología de panel",
        valor: "Dual Line Gate",
        esDiferenciador: true,
        verificado: false,
      },
      {
        grupo: "imagen",
        clave: "Tasa de refresco",
        valor: "Hasta 288",
        unidad: "Hz",
        esDiferenciador: true,
        verificado: false,
      },
    ],
  },
  {
    modelo: "The Frame 2026",
    aliases: ["the frame", "frame"],
    categoria: "tv",
    gama: "alta",
    resumenVenta:
      "El televisor que se vende como cuadro decorativo. Versión actualizada 2026; la de 98\" es exclusiva de EE.UU. Disponibilidad en Chile POR CONFIRMAR en samsung.cl.",
    estado: "activo",
    specs: [
      {
        grupo: "imagen",
        clave: "Tamaño de 98 pulgadas",
        valor: "Solo disponible en EE.UU.",
        verificado: false,
      },
    ],
  },
];

export type TerminoSeed = {
  termino: string;
  aliases: string[];
  categoria?: CategoriaProducto;
  definicionTecnica: string;
  traduccionVenta: string;
  beneficioCliente: string;
  erroresComunes: string;
  productosRelacionados?: string[];
};

export const glosarioSeed: TerminoSeed[] = [
  {
    termino: "Snapdragon 8 Elite Gen 5 for Galaxy",
    aliases: ["snapdragon 8 elite", "snapdragon", "8 elite gen 5", "el snapdragon"],
    categoria: "smartphone",
    definicionTecnica:
      "Procesador tope de gama de Qualcomm en su versión ajustada para Galaxy, con frecuencias de reloj más altas que la variante estándar del mismo chip.",
    traduccionVenta:
      "Es el motor del teléfono, y es la versión más potente que existe hoy. Samsung además le pide una vuelta más de revoluciones que a la de otras marcas.",
    beneficioCliente:
      "El teléfono no se pone lento con los años ni cuando tiene veinte cosas abiertas: juegos pesados, edición de video y las funciones de IA le corren fluido desde el primer día hasta el último.",
    erroresComunes:
      "No prometas 'X veces más rápido' con cifras que no tengas a la vista. No digas que es un procesador exclusivo de Samsung: es de Qualcomm, lo exclusivo es la variante ajustada.",
    productosRelacionados: ["Galaxy S26 Ultra", "Galaxy Z Fold8", "Galaxy Z Flip8"],
  },
  {
    termino: "Exynos 1680",
    aliases: ["exynos", "exynos 1680"],
    categoria: "smartphone",
    definicionTecnica:
      "Procesador de gama media de Samsung fabricado en 4 nm, con GPU Xclipse 550 y NPU mejorada respecto de la generación anterior.",
    traduccionVenta:
      "Es el motor de la gama media, hecho por la misma Samsung. Menos caballos que el de los modelos premium, pero pensado para gastar poca batería.",
    beneficioCliente:
      "Le rinde todo el día para lo que realmente usa —WhatsApp, redes, fotos, streaming— sin que el teléfono se caliente ni se quede sin batería a media tarde.",
    erroresComunes:
      "No lo compares diciendo que 'es casi lo mismo que el Snapdragon del Ultra': no lo es, y el cliente que sabe algo te desarma. Véndelo por eficiencia y precio, no por potencia bruta.",
    productosRelacionados: ["Galaxy A57 5G"],
  },
  {
    termino: "Dynamic AMOLED 2X",
    aliases: ["dynamic amoled", "amoled", "super amoled"],
    categoria: "smartphone",
    definicionTecnica:
      "Panel OLED de Samsung en el que cada píxel emite su propia luz; sin retroiluminación, el negro se logra apagando el píxel.",
    traduccionVenta:
      "En estas pantallas cada puntito de luz se prende solo. Cuando algo tiene que verse negro, ese puntito simplemente se apaga: por eso el negro es negro de verdad y no gris.",
    beneficioCliente:
      "Las fotos y las películas se ven con colores vivos y mucho contraste, y la pantalla se sigue leyendo bien afuera con sol.",
    erroresComunes:
      "No digas que 'no se quema nunca'. No lo llames LED ni QLED: son tecnologías distintas y en televisores significa otra cosa.",
    productosRelacionados: ["Galaxy S26 Ultra", "Galaxy S26", "Galaxy S26+"],
  },
  {
    termino: "Micro RGB",
    aliases: ["microrgb", "micro rgb"],
    categoria: "tv",
    definicionTecnica:
      "Retroiluminación de televisor LCD que usa LEDs rojos, verdes y azules individuales en lugar de LEDs blancos con filtro de color, lo que permite generar el color en la fuente de luz y controlarlo por zonas.",
    traduccionVenta:
      "En un televisor común la luz de atrás es blanca y después se filtra para darle color, como poner un celofán delante de una ampolleta. Acá la luz de atrás ya nace roja, verde o azul: no hay filtro que perder.",
    beneficioCliente:
      "Los colores se ven más puros y la imagen más brillante, y en las escenas oscuras no aparece ese halo gris alrededor de las cosas iluminadas.",
    erroresComunes:
      "No lo llames OLED ni digas que 'es lo mismo que MicroLED': son tecnologías distintas y el cliente informado lo nota. No afirmes disponibilidad ni precio en Chile sin confirmarlo: la línea 2026 todavía no está confirmada acá.",
    productosRelacionados: ["Micro RGB 2026"],
  },
  {
    termino: "Mini LED",
    aliases: ["miniled", "mini led"],
    categoria: "tv",
    definicionTecnica:
      "Retroiluminación LCD compuesta por LEDs mucho más pequeños que los convencionales, lo que permite dividir la pantalla en más zonas de atenuación local.",
    traduccionVenta:
      "Son las ampolletas de atrás de la pantalla, pero mucho más chicas y muchas más. Al ser tantas, el televisor puede apagar solo el pedacito que tiene que estar oscuro.",
    beneficioCliente:
      "Ve las películas oscuras sin ese 'lavado' gris, y los subtítulos blancos sobre fondo negro no quedan rodeados de un resplandor.",
    erroresComunes:
      "No digas que es OLED: el Mini LED sigue teniendo retroiluminación. No prometas 'negros perfectos', que es el argumento del OLED.",
    productosRelacionados: ["Neo QLED QN80H"],
  },
  {
    termino: "Quantum Dot",
    aliases: ["quantum dot", "qled", "puntos cuanticos"],
    categoria: "tv",
    definicionTecnica:
      "Capa de nanocristales que, al recibir luz, emiten color en longitudes de onda muy precisas, ampliando el volumen de color del panel.",
    traduccionVenta:
      "Es una capa de partículas diminutas que convierten la luz en colores muy exactos. Es lo que hace que un rojo sea rojo y no anaranjado.",
    beneficioCliente:
      "Los colores se mantienen igual de vivos aunque suba el brillo, así que el partido o la película se ven bien incluso con la sala iluminada.",
    erroresComunes:
      "No uses 'QLED' y 'OLED' como si fueran lo mismo: se parecen al escribirlos y son cosas distintas. No digas que el Quantum Dot ilumina por sí solo: necesita la retroiluminación de atrás.",
    productosRelacionados: ["Neo QLED QN80H"],
  },
  {
    termino: "nits / brillo pico",
    aliases: ["nits", "brillo pico", "brillo", "nit"],
    definicionTecnica:
      "El nit (candela por metro cuadrado) mide la luminancia de una pantalla. El brillo pico es el máximo que alcanza, normalmente en una porción de la pantalla y por un lapso corto.",
    traduccionVenta:
      "Es cuánta luz da la pantalla. Mientras más nits, más se impone sobre la luz de afuera.",
    beneficioCliente:
      "Puede leer la pantalla al sol pleno, en la calle o en la playa, sin tener que hacerle sombra con la mano.",
    erroresComunes:
      "No presentes el brillo pico como el brillo de siempre: es un máximo puntual, no el que va a ver todo el día. No compares nits de un reloj con los de un televisor: no son escenarios comparables.",
    productosRelacionados: ["Galaxy Watch8"],
  },
  {
    termino: "tasa de refresco (Hz)",
    aliases: ["tasa de refresco", "hz", "hercios", "refresco", "120 hz"],
    definicionTecnica:
      "Cantidad de veces por segundo que la pantalla redibuja la imagen. 120 Hz equivale a 120 actualizaciones por segundo.",
    traduccionVenta:
      "Es cuántas veces por segundo se redibuja la pantalla. Mientras más veces, más suave se ve todo lo que se mueve.",
    beneficioCliente:
      "Al deslizar por Instagram o WhatsApp el texto no se ve arrastrado, y en los juegos el movimiento va parejo. Es de esas cosas que se notan en dos segundos con el equipo en la mano: pásaselo y que deslice.",
    erroresComunes:
      "No digas que más Hz significa 'más rápido el teléfono': es fluidez de pantalla, no potencia. No prometas que siempre va a 120 Hz: baja sola para cuidar la batería.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "LTPO",
    aliases: ["ltpo", "refresco adaptativo"],
    definicionTecnica:
      "Tecnología de backplane que permite a la pantalla variar dinámicamente su tasa de refresco según el contenido, bajando a muy pocos hercios en imágenes estáticas.",
    traduccionVenta:
      "La pantalla se da cuenta de lo que está mostrando: si usted está leyendo algo quieto, baja el ritmo; si desliza o juega, lo sube.",
    beneficioCliente:
      "Tiene la suavidad de una pantalla rápida sin pagarla con la batería: el teléfono no se le descarga por tener buena pantalla.",
    erroresComunes:
      "No lo vendas como una función que el cliente pueda activar o desactivar: es automático. No afirmes que un modelo tiene LTPO sin verlo en su ficha.",
  },
  {
    termino: "ppi / densidad de píxeles",
    aliases: ["ppi", "densidad de pixeles", "pixeles por pulgada"],
    definicionTecnica:
      "Píxeles por pulgada: cuántos puntos de imagen entran en una pulgada de pantalla. Depende de la resolución y del tamaño físico.",
    traduccionVenta:
      "Es qué tan apretaditos están los puntitos de la pantalla. Mientras más apretados, menos se notan y más 'impresa' se ve la letra.",
    beneficioCliente:
      "El texto se ve nítido de cerca, sin bordes dentados, y no cansa la vista al leer harto rato.",
    erroresComunes:
      "No compares ppi entre pantallas de tamaños muy distintos como si fuera lo mismo. No digas que 'el ojo no nota la diferencia': depende de la distancia y del uso.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "QHD+ vs FHD+",
    aliases: ["qhd", "qhd+", "fhd", "fhd+", "resolucion de pantalla"],
    definicionTecnica:
      "Dos escalones de resolución en smartphones: FHD+ ronda los 1080 píxeles de ancho y QHD+ los 1440, es decir cerca del doble de píxeles totales.",
    traduccionVenta:
      "Son dos niveles de detalle de pantalla. El QHD+ tiene casi el doble de puntitos que el FHD+.",
    beneficioCliente:
      "En QHD+ ve más detalle fino: las fotos ampliadas y los textos chicos se leen sin pixelarse. Si le importa la batería sobre todo, en FHD+ el equipo rinde más y casi no va a notar la diferencia en el uso diario.",
    erroresComunes:
      "No digas que el FHD+ 'se ve mal': se ve muy bien y el cliente lo va a comprobar. No prometas QHD+ activo de fábrica: en varios modelos viene configurado en FHD+ y se cambia en ajustes.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "apertura f/1.4",
    aliases: ["apertura", "f/1.4", "f1.4", "diafragma"],
    definicionTecnica:
      "Relación entre la distancia focal y el diámetro efectivo de la apertura del lente; un número menor implica una apertura mayor y más luz al sensor.",
    traduccionVenta:
      "Es qué tan grande es la ventana por donde entra la luz a la cámara. Mientras más chico el número, más grande la ventana.",
    beneficioCliente:
      "Fotos nítidas de noche o en interiores sin flash, sin ese grano feo; los videos en el restaurante o el cumpleaños se ven limpios.",
    erroresComunes:
      "No digas 'tiene más megapíxeles, por eso se ve mejor de noche': son cosas distintas y el cliente que sabe algo te desarma. No prometas que reemplaza a una cámara profesional.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "pixel binning",
    aliases: ["pixel binning", "binning", "200 mp", "megapixeles"],
    definicionTecnica:
      "Técnica por la que el sensor combina varios píxeles vecinos en uno solo de mayor tamaño efectivo; en un sensor de 200 MP el resultado habitual es una foto de 12,5 MP con mucha más luz por píxel.",
    traduccionVenta:
      "La cámara junta de a varios puntitos para formar uno más grande. En vez de muchas fotos chicas de poca luz, arma una sola con mucha más luz.",
    beneficioCliente:
      "Las fotos le salen buenas de noche y ocupan menos espacio en el teléfono, sin que usted tenga que configurar nada.",
    erroresComunes:
      "No vendas los 200 MP como que 'todas las fotos salen en 200 MP': por defecto salen combinadas. No digas que más megapíxeles es siempre mejor: el tamaño del sensor y la apertura pesan igual o más.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "zoom óptico vs digital",
    aliases: ["zoom optico", "zoom digital", "zoom"],
    definicionTecnica:
      "El zoom óptico acerca mediante el lente sin perder información del sensor; el digital recorta y amplía la imagen ya capturada, con pérdida de detalle.",
    traduccionVenta:
      "El óptico acerca de verdad, moviendo el lente. El digital solo recorta la foto y la agranda, como cuando usted hace zoom con los dedos sobre una imagen.",
    beneficioCliente:
      "Con zoom óptico puede fotografiar a su hijo en el escenario del colegio y que se vea nítido, no como una mancha pixelada.",
    erroresComunes:
      "No sumes los dos y ofrezcas 'zoom 100x' como si fuera todo óptico. No prometas calidad en el zoom máximo: en el tramo digital la foto pierde detalle sí o sí.",
  },
  {
    termino: "NPU",
    aliases: ["npu", "unidad neuronal", "procesador de ia"],
    definicionTecnica:
      "Unidad de procesamiento neuronal: bloque del procesador dedicado a ejecutar modelos de inteligencia artificial de forma mucho más eficiente que la CPU o la GPU.",
    traduccionVenta:
      "Es una parte del motor del teléfono dedicada solo a las funciones de inteligencia artificial, para que no le robe fuerza al resto.",
    beneficioCliente:
      "Borrar a alguien del fondo de una foto, traducir una llamada o resumir un texto es instantáneo y no le deja el teléfono lento ni caliente.",
    erroresComunes:
      "No digas que la NPU 'hace más rápido el teléfono' en general: acelera las tareas de IA. No prometas funciones de IA específicas sin verificar cuáles trae ese modelo.",
    productosRelacionados: ["Galaxy A57 5G"],
  },
  {
    termino: "Galaxy AI en el dispositivo",
    aliases: ["galaxy ai", "ia en el dispositivo", "on device"],
    definicionTecnica:
      "Conjunto de funciones de IA de Samsung que se ejecutan localmente en el equipo, sin enviar los datos a un servidor externo.",
    traduccionVenta:
      "Son funciones de inteligencia artificial que se procesan dentro del mismo teléfono, sin mandar sus cosas a internet.",
    beneficioCliente:
      "Puede usarlas sin señal y sus fotos y conversaciones no salen del equipo, que es lo que a mucha gente le preocupa.",
    erroresComunes:
      "No afirmes que TODAS las funciones de Galaxy AI son locales: algunas sí usan la nube. No prometas que serán gratis para siempre sin tener la política vigente a la vista.",
  },
  {
    termino: "IP68",
    aliases: ["ip68", "resistencia al agua", "sumergible", "resistente al agua"],
    definicionTecnica:
      "Certificación de resistencia: el 6 indica protección total contra el polvo y el 8, resistencia a la inmersión en agua dulce bajo condiciones definidas por el fabricante.",
    traduccionVenta:
      "Quiere decir que no le entra polvo y que aguanta el agua: si se le cae al lavamanos o lo agarra la lluvia, no pasa nada.",
    beneficioCliente:
      "Se despreocupa de la lluvia, del vaso que se vuelca en la mesa o del bolsillo mojado.",
    erroresComunes:
      "NUNCA digas que es a prueba de agua ni que puede nadar o bucear con él. No menciones agua salada ni piscina: el cloro y la sal no están cubiertos, y la garantía normalmente excluye el daño por líquidos.",
    productosRelacionados: ["Galaxy S26 Ultra", "Galaxy A57 5G"],
  },
  {
    termino: "UFS",
    aliases: ["ufs", "almacenamiento interno", "memoria interna"],
    definicionTecnica:
      "Universal Flash Storage: estándar de almacenamiento interno de los smartphones. Las generaciones más nuevas ofrecen mayor velocidad de lectura y escritura.",
    traduccionVenta:
      "Es el disco del teléfono. No es solo cuánto guarda, también qué tan rápido lee y escribe.",
    beneficioCliente:
      "Las apps abren al toque, los juegos cargan rápido y grabar video en alta calidad no se le traba.",
    erroresComunes:
      "No confundas UFS con RAM: son cosas distintas. No digas que el almacenamiento se puede ampliar si el modelo no tiene ranura de memoria.",
  },
  {
    termino: "carga de 60 W",
    aliases: ["carga rapida", "60 w", "60w", "carga de 60 w"],
    definicionTecnica:
      "Potencia máxima de carga por cable expresada en watts. La potencia real depende del cargador, del cable y del estado de la batería.",
    traduccionVenta:
      "Es qué tan rápido puede entrar la energía a la batería. Más watts, menos rato enchufado.",
    beneficioCliente:
      "En lo que se ducha y toma desayuno, el teléfono agarra carga suficiente para todo el día.",
    erroresComunes:
      "No prometas un tiempo exacto de carga si no lo tienes en la ficha. Confirma si el cargador viene incluido antes de darlo por hecho: en varios modelos se vende aparte, y esa es una molestia clásica post-venta.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "carga inalámbrica reversa",
    aliases: ["carga reversa", "carga inalambrica reversa", "powershare"],
    definicionTecnica:
      "Función que permite usar el teléfono como base de carga inalámbrica para otro dispositivo compatible, cediendo parte de su propia batería.",
    traduccionVenta:
      "El teléfono le puede pasar batería a otro aparato: apoya los audífonos o el reloj encima y se cargan solos.",
    beneficioCliente:
      "Si se le quedaron los audífonos o el reloj sin batería fuera de la casa, los carga con el mismo teléfono, sin cables ni enchufe.",
    erroresComunes:
      "No la presentes como carga rápida: es lenta a propósito. No prometas que funciona con cualquier equipo: el otro aparato tiene que ser compatible con carga inalámbrica.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
  {
    termino: "ANC",
    aliases: ["anc", "cancelacion de ruido", "cancelacion activa de ruido"],
    categoria: "audio",
    definicionTecnica:
      "Cancelación activa de ruido: micrófonos captan el ruido ambiente y el audífono emite una onda inversa que lo cancela, sobre todo en frecuencias bajas y constantes.",
    traduccionVenta:
      "Los audífonos escuchan el ruido de afuera y emiten un sonido contrario que lo anula. El motor del bus o el aire acondicionado simplemente desaparecen.",
    beneficioCliente:
      "Puede escuchar música o hacer una reunión en el metro o en una oficina abierta sin subir el volumen a un nivel que le dañe el oído.",
    erroresComunes:
      "No digas que 'cancela todo el ruido': con voces y ruidos agudos e irregulares funciona mucho menos. No lo confundas con el aislamiento pasivo, que es simplemente el sello de la goma.",
    productosRelacionados: ["Galaxy Buds4 Pro"],
  },
  {
    termino: "Super Wideband (SWB)",
    aliases: ["super wideband", "swb", "voz swb"],
    categoria: "audio",
    definicionTecnica:
      "Códec de voz que transmite un rango de frecuencias de hasta 16 kHz, muy por encima de la telefonía tradicional, que corta cerca de los 3,4 kHz.",
    traduccionVenta:
      "En una llamada normal se transmite solo una parte de la voz, por eso suena 'a teléfono'. Esto transmite mucho más: la voz suena como si la persona estuviera al lado.",
    beneficioCliente:
      "Las llamadas de trabajo se entienden a la primera, sin tener que repetir nombres, números ni direcciones.",
    erroresComunes:
      "No prometas que toda llamada va a sonar así: depende de la red y de que el otro equipo también lo soporte. No lo vendas como que mejora la música: es para la voz.",
    productosRelacionados: ["Galaxy Buds4 Pro"],
  },
  {
    termino: "Wear OS",
    aliases: ["wear os", "sistema del reloj"],
    categoria: "wearable",
    definicionTecnica:
      "Sistema operativo de Google para relojes inteligentes; en los Galaxy Watch se entrega con la capa One UI Watch de Samsung.",
    traduccionVenta:
      "Es el sistema del reloj, el equivalente a lo que Android es en el teléfono. Por eso tiene tienda de aplicaciones propia.",
    beneficioCliente:
      "Le puede instalar apps al reloj —Spotify, mapas, su banco— y contestar mensajes sin sacar el teléfono del bolsillo.",
    erroresComunes:
      "No prometas compatibilidad con iPhone sin verificarlo: las funciones se limitan bastante. No digas que trae todas las apps del teléfono.",
    productosRelacionados: ["Galaxy Watch8"],
  },
  {
    termino: "HDMI 2.1",
    aliases: ["hdmi 2.1", "hdmi"],
    categoria: "tv",
    definicionTecnica:
      "Versión del estándar HDMI con ancho de banda suficiente para 4K a 120 Hz y superiores, además de funciones para juego como VRR y ALLM.",
    traduccionVenta:
      "Es el tipo de entrada por donde conecta la consola. La versión 2.1 es la que deja pasar toda la información que la consola nueva es capaz de mandar.",
    beneficioCliente:
      "Si tiene PlayStation o Xbox de última generación, va a jugar como corresponde y no limitado por el televisor.",
    erroresComunes:
      "No des por hecho que todos los puertos del televisor son 2.1: en varios modelos solo algunos lo son. No prometas que un cable viejo va a servir.",
    productosRelacionados: ["Neo QLED QN80H"],
  },
  {
    termino: "Dual Line Gate",
    aliases: ["dual line gate", "288 hz"],
    categoria: "tv",
    definicionTecnica:
      "Tecnología de panel que direcciona las líneas del televisor en dos grupos, lo que permite alcanzar tasas de refresco de hasta 288 Hz.",
    traduccionVenta:
      "Es la forma en que el televisor refresca la pantalla: al hacerlo en dos tandas, alcanza a redibujar muchas más veces por segundo.",
    beneficioCliente:
      "Para el gamer competitivo: el movimiento se ve limpio y sin arrastre en juegos rápidos de disparos o carreras.",
    erroresComunes:
      "No prometas 288 Hz en 4K sin confirmarlo: esas tasas suelen requerir resolución menor. No lo ofrezcas como una mejora para ver televisión o películas normales.",
    productosRelacionados: ["Neo QLED QN70H"],
  },
  {
    termino: "Privacy Display",
    aliases: ["privacy display", "pantalla de privacidad", "filtro de privacidad"],
    categoria: "smartphone",
    definicionTecnica:
      "Función por hardware que reduce la visibilidad de la pantalla vista desde ángulos laterales. El Galaxy S26 Ultra es el primer smartphone del mundo en incorporarla.",
    traduccionVenta:
      "La pantalla se ve perfecta de frente, pero desde el lado se oscurece. El de al lado en el metro no alcanza a leer lo que usted tiene abierto.",
    beneficioCliente:
      "Puede revisar su banco, sus mensajes o documentos de trabajo en el metro, en la micro o en un avión sin que nadie le lea por encima del hombro.",
    erroresComunes:
      "No digas que es un accesorio ni un protector que se pega: viene en el hardware de la pantalla y se activa desde el equipo. No prometas que es invisible al 100% desde todos los ángulos.",
    productosRelacionados: ["Galaxy S26 Ultra"],
  },
];
