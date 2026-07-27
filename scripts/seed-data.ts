/**
 * Contenido semilla para el cargo piloto "Vendedor de tecnología Samsung"
 * (retail en Chile). 9 unidades publicadas + 2 borradores + 1 en validación.
 *
 * Datos DEMOSTRATIVOS: los modelos, mecánicas y montos son ilustrativos para
 * la demo. Las cifras que cambian seguido (precios, cuotas de canje) se dejan
 * apuntando al sistema en vez de fijarlas, que es como debe operar en real.
 */

export type SeedUnidad = {
  tipo:
    | "ficha_producto"
    | "argumentario"
    | "objecion"
    | "comparativa"
    | "promocion"
    | "procedimiento";
  titulo: string;
  criticidad: "alta" | "media" | "baja";
  estado: "borrador" | "en_validacion" | "publicado";
  contenidoMarkdown: string;
};

export const unidadesSeed: SeedUnidad[] = [
  {
    tipo: "ficha_producto",
    titulo: "Galaxy S25 vs S25 Ultra: cuál recomendar",
    criticidad: "alta",
    estado: "publicado",
    contenidoMarkdown: `## Cuándo aplica

Cliente decidido por Galaxy de gama alta pero dudando entre los dos modelos. La diferencia de precio es grande: recomendar mal genera cambio o devolución.

## Diferencias que sí le importan al cliente

| | Galaxy S25 | Galaxy S25 Ultra |
|---|---|---|
| Pantalla | 6,2" — cabe en un bolsillo | 6,9" — para ver series y trabajar |
| Zoom | Óptico corto | Zoom potente (el diferencial real) |
| Lápiz | No tiene | **S Pen incluido** |
| Batería | Rinde el día | Rinde día y medio de uso intenso |

## Cómo recomendar

1. **Pregunta primero para qué lo usa.** "¿Qué es lo que más hace con el teléfono?"
2. Si dice **fotos de lejos** (conciertos, canchas, viajes) o **anotar a mano** → Ultra. El zoom y el S Pen son la razón, no los números.
3. Si dice **redes sociales, WhatsApp, fotos normales** y le importa que sea cómodo de llevar → S25. Es el mismo cerebro y las mismas funciones de IA.
4. **Muéstrale el zoom en vivo** (ver *Cómo demostrar Galaxy AI en 2 minutos*): apunta al letrero más lejano de la tienda.

## Errores frecuentes

- Vender Ultra "porque es el mejor": si el cliente solo usa WhatsApp, vuelve a cambiarlo y perdemos la venta y la confianza.
- Prometer duración de batería en horas exactas: varía por uso. Habla de "te rinde el día" y no de números.`,
  },
  {
    tipo: "comparativa",
    titulo: "Galaxy S25 Ultra vs iPhone 16 Pro Max",
    criticidad: "alta",
    estado: "publicado",
    contenidoMarkdown: `## Cuándo aplica

El cliente está comparando con iPhone, en la tienda o mencionando lo que vio en otra.

## Regla de oro

**Nunca hables mal de Apple.** El cliente que se siente juzgado se va. Reconoce lo bueno del otro y muestra dónde Galaxy le da más para *su* uso.

## Diferenciales concretos de Galaxy

- **S Pen incluido**: escribir y firmar documentos sin comprar nada aparte.
- **Zoom óptico superior**: la comparación se hace mirando, no discutiendo. Sacar la misma foto lejana con los dos equipos.
- **Carga y accesorios**: cargador USB-C compartido con casi todo lo que ya tiene.
- **Multiventana real**: dos apps a la vez en pantalla grande.
- **Precio/prestación**: con canje y promoción vigente la diferencia suele ser relevante (revisa *Plan Canje*).

## Si el cliente viene del ecosistema Apple

Sé honesto: si tiene **Apple Watch, iPad y Mac**, cambiar le va a costar. En ese caso:

1. Reconócelo: "si estás muy metido en Apple, el cambio tiene su curva".
2. Muestra que **el traspaso de datos es acompañado y gratis** aquí mismo (*Traspaso de datos con Smart Switch*).
3. Si sigue dudando, no fuerces: ofrece que pruebe el equipo en mano y deja la puerta abierta.

## Errores frecuentes

- Entrar en discusión técnica de números (nits, GHz): pierdes al cliente.
- Afirmar que iPhone "no tiene" algo sin estar seguro: si te equivoca delante del cliente, se cae toda tu credibilidad.`,
  },
  {
    tipo: "objecion",
    titulo: "«Está muy caro» / lo vi más barato en otro lado",
    criticidad: "alta",
    estado: "publicado",
    contenidoMarkdown: `## La objeción real

"Caro" casi nunca significa "no tengo el dinero": significa **"no veo por qué vale eso"** o **"no sé cómo pagarlo"**. Identifica cuál de las dos es antes de responder.

## Pasos

1. **No te disculpes ni bajes el precio de entrada.** Responde con una pregunta: "¿Caro comparado con qué?"
2. Si compara con **otro modelo/marca** → traslada a valor: qué hace este equipo que el otro no (zoom, S Pen, IA). Usa la comparativa correspondiente.
3. Si compara con **otra tienda** → verifica en el sistema si aplica igualación de precio y qué incluye nuestra oferta (garantía, canje, accesorio). Muchas veces el precio de la vitrina ajena no incluye lo mismo.
4. Si el tema es **cómo pagarlo** → cambia la conversación al mes: canje + cuotas (*Plan Canje* y financiamiento vigente). "Con tu equipo actual, quedaría en X al mes."
5. **Cierra con una pregunta de avance:** "Si te dejo el canje aplicado, ¿nos vamos con este?"

## Frases que funcionan

- "Te entiendo, es una inversión. Justamente por eso mejor que te sirva 3 años y no 1."
- "¿Te muestro cuánto te descuenta tu equipo actual? Puede que te sorprenda."

## Errores frecuentes

- Regalar descuento antes de haber mostrado valor: el cliente asume que el precio era inflado.
- Prometer igualación de precio sin verificar la política vigente en el sistema.`,
  },
  {
    tipo: "objecion",
    titulo: "«Prefiero iPhone, estoy acostumbrado»",
    criticidad: "media",
    estado: "publicado",
    contenidoMarkdown: `## La objeción real

Es **miedo al cambio**, no una comparación técnica. Nadie quiere perder sus fotos, sus contactos o su WhatsApp.

## Pasos

1. **Valida:** "Claro, si llevas años con iPhone es normal que dé lata cambiar."
2. **Ataca el miedo concreto, no la marca.** Pregunta: "¿Qué es lo que te da más lata perder?"
3. Según la respuesta:
   - *Mis fotos / contactos* → "Lo pasamos aquí mismo, gratis, delante de ti" (*Smart Switch*).
   - *WhatsApp* → se traspasa el historial en el mismo proceso.
   - *No sé usarlo* → ofrécele configurarlo en tienda y muéstrale lo básico.
4. **Ponle el equipo en la mano.** Que lo desbloquee, saque una foto, escriba. La objeción baja al usarlo, no al escucharte.
5. Si igual prefiere iPhone, **no insistas más de dos veces**. Deja buena impresión: vuelve o manda a un conocido.

## Errores frecuentes

- Insistir después del segundo "no": el cliente se cierra y se va de la tienda.
- Descalificar su elección ("iPhone está atrasado"): te desconecta al instante.`,
  },
  {
    tipo: "argumentario",
    titulo: "Cómo demostrar Galaxy AI en 2 minutos",
    criticidad: "media",
    estado: "publicado",
    contenidoMarkdown: `## Cuándo aplica

Cliente indeciso o que dice "todos los teléfonos son iguales". La IA se vende **mostrándola**, no explicándola.

## Demo de 2 minutos (en este orden)

1. **Círculo para buscar** (15 seg): abre una foto o página, encierra un objeto con el dedo y aparece la búsqueda. Efecto inmediato.
2. **Borrador de objetos** (30 seg): saca una foto al cliente con gente atrás y borra a alguien. Es el momento "wow" más confiable.
3. **Traducción de llamada** (30 seg): explica el caso real — "si te llama alguien en inglés, te lo traduce en vivo".
4. **Resumen de notas** (20 seg): útil para clientes que trabajan.
5. **Cierra preguntando:** "¿Cuál de esas usarías más?" — su respuesta te dice qué modelo ofrecer.

## Reglas de la demo

- **Usa el equipo del cliente como contraste**, no la ficha técnica.
- Que **él haga el gesto**, no tú: lo que prueba con sus manos, lo compra.
- Ten un equipo de demo cargado y con la pantalla limpia antes de abrir la tienda.

## Errores frecuentes

- Explicar la IA con palabras ("procesamiento en el dispositivo"): aburre y no vende.
- Prometer funciones que dependen del modelo: confirma en la ficha qué incluye el equipo que estás ofreciendo.`,
  },
  {
    tipo: "promocion",
    titulo: "Plan Canje: retoma del equipo usado",
    criticidad: "alta",
    estado: "publicado",
    contenidoMarkdown: `## Qué es

El cliente entrega su equipo usado y ese monto se descuenta del nuevo. Es la herramienta más potente para cerrar cuando la objeción es precio.

> ⚠️ El monto de canje **siempre** se consulta en el sistema al momento de la venta. Nunca lo estimes de memoria: cambia por modelo y estado.

## Pasos

1. **Pregunta qué equipo tiene** y búscalo en la tabla de canje del sistema.
2. **Evalúa el estado delante del cliente**: que enciende, pantalla sin trizaduras, batería, que no esté bloqueado.
3. **Verifica que no tenga bloqueo de cuenta** (iCloud / cuenta Google) ni reporte de robo. Sin eso, el canje no se puede tomar.
4. **Muestra el monto en pantalla**: que lo vea del sistema, no de tu boca.
5. **Respalda y borra los datos del equipo usado** con el cliente presente (ver *Smart Switch*). Debe salir de fábrica y con la cuenta desvinculada.
6. Aplica el descuento en la venta y explícale el nuevo total y las cuotas.

## Requisitos que se olvidan

- Equipo **desbloqueado de cuenta**: es la causa #1 de canjes rechazados.
- Cédula del cliente y que el equipo esté a su nombre cuando la política lo pida.

## Errores frecuentes

- Prometer un monto "aproximado" y que el sistema muestre menos: el cliente se siente engañado y se cae la venta.
- Recibir el equipo sin borrar los datos: problema de privacidad para el cliente y para la tienda.`,
  },
  {
    tipo: "procedimiento",
    titulo: "Garantía legal (Ley 19.496) vs garantía del fabricante",
    criticidad: "alta",
    estado: "publicado",
    contenidoMarkdown: `## Por qué es crítico

Informar mal la garantía es un problema **legal** para la tienda (SERNAC) y la causa más común de reclamos. Nunca improvises en este tema.

## Las dos cosas son distintas

**Garantía legal — 6 meses (Ley del Consumidor 19.496)**
- El cliente elige: **cambio, reparación o devolución del dinero**. Elige él, no la tienda.
- Corre desde la fecha de la boleta y aplica a fallas del producto (no a daño por mal uso).
- Se ejerce **en la tienda donde compró**. No lo mandes al servicio técnico para sacártelo de encima.

**Garantía del fabricante — habitualmente 12 meses**
- La otorga la marca y normalmente se gestiona vía **servicio técnico autorizado**.
- Es **adicional** a la legal: no la reemplaza ni la limita.

## Pasos ante un cliente con falla

1. **Pide la boleta** y verifica la fecha.
2. Si está **dentro de los 6 meses** → explícale las tres opciones y que la elección es suya. Deriva al jefe de tienda para gestionarla.
3. Si está **fuera de los 6 meses pero dentro del año** → corresponde garantía del fabricante: deriva al servicio técnico autorizado y entrégale los datos por escrito.
4. Si hay **daño físico o líquido**, no prometas nada: la evaluación la hace el servicio técnico.
5. **Registra el caso** en el sistema, incluso si el cliente se va sin resolverlo.

## Frases prohibidas

- ❌ "La garantía es solo del fabricante, tiene que ir al servicio técnico." (Ilegal dentro de los 6 meses.)
- ❌ "Sin la caja no hay garantía." (La boleta es lo que se exige.)
- ❌ "Ya pasaron los 3 días, no puedo hacer nada."`,
  },
  {
    tipo: "procedimiento",
    titulo: "Traspaso de datos con Smart Switch en tienda",
    criticidad: "media",
    estado: "publicado",
    contenidoMarkdown: `## Cuándo aplica

Cliente que compra equipo nuevo y viene de otro teléfono (Android o iPhone). Ofrecerlo **antes** de que lo pida: es lo que derriba el miedo al cambio.

## Pasos

1. **Avisa cuánto demora** según lo que traiga: pocos minutos si son contactos y fotos, más si trae mucho video.
2. Conecta ambos equipos con el **cable** que viene en la caja (más rápido y estable que por wifi).
3. En el equipo nuevo abre **Smart Switch** y elige recibir datos.
4. Deja que el **cliente marque qué quiere pasar** (fotos, contactos, WhatsApp, apps).
5. Si viene de **iPhone**: recuérdale desactivar el bloqueo de la cuenta para que el traspaso complete.
6. Al terminar, **verifica con el cliente** que estén sus fotos y contactos antes de que se vaya.
7. Si el equipo antiguo va a **canje**: recién ahí borra datos y desvincula la cuenta.

## Errores frecuentes

- Dejar al cliente esperando sin decirle cuánto falta: se impacienta y queda mala experiencia.
- Borrar el equipo antiguo antes de confirmar que el traspaso quedó completo. **Nunca**.`,
  },
  {
    tipo: "ficha_producto",
    titulo: "Venta cruzada: Galaxy Watch y Buds",
    criticidad: "baja",
    estado: "publicado",
    contenidoMarkdown: `## Cuándo aplica

Después de que el cliente **ya decidió** el teléfono. Nunca antes: distrae y puede caerse la venta principal.

## Cómo ofrecer (sin ser pesado)

1. Ofrece **uno** solo, el que calce con lo que te contó:
   - Habla de deporte, sueño o salud → **Watch**.
   - Escucha música, viaja o hace llamadas manos libres → **Buds**.
2. **Conéctalo al equipo nuevo en el mostrador** y que lo pruebe. Los Buds se venden al escucharlos.
3. Habla del beneficio, no del accesorio: "así contestas sin sacar el teléfono".
4. Si dice no, **acepta al primer no** y cierra la venta del teléfono con buena onda.

## Errores frecuentes

- Ofrecer tres accesorios seguidos: el cliente se siente presionado.
- Insistir con el accesorio y arriesgar la venta grande.`,
  },

  // --- Borradores (el experto los está escribiendo) ---
  {
    tipo: "objecion",
    titulo: "«Me dijeron que Samsung se pone lento con el tiempo»",
    criticidad: "media",
    estado: "borrador",
    contenidoMarkdown: `## La objeción real

Viene de experiencias con equipos de gama baja de hace varios años.

## Pasos

1. Pregunta qué equipo tuvo y cuántos años.
2. [COMPLETAR: política vigente de años de actualizaciones de Android y seguridad por modelo]
3. Muestra la fluidez en el equipo de demo.`,
  },
  {
    tipo: "ficha_producto",
    titulo: "Galaxy Tab: cuándo ofrecer tablet en vez de notebook",
    criticidad: "baja",
    estado: "borrador",
    contenidoMarkdown: `## Cuándo aplica

Cliente que busca "algo para estudiar o trabajar" y duda entre tablet y notebook.

## Pasos

1. [COMPLETAR: preguntas de calificación según uso]
2. [COMPLETAR: modelos vigentes y cuál recomendar en cada caso]`,
  },

  // --- En validación (el jefe de tienda debe aprobarla) ---
  {
    tipo: "promocion",
    titulo: "Bono por portabilidad con operador (vigente este mes)",
    criticidad: "alta",
    estado: "en_validacion",
    contenidoMarkdown: `## Qué es

Descuento adicional cuando el cliente contrata plan con portabilidad al comprar el equipo. Se acumula con el canje.

## Pasos

1. Pregunta con qué operador está hoy y si tiene deuda o contrato vigente.
2. Consulta en el sistema el **bono vigente** para su plan de destino.
3. Explica que el bono se aplica **si mantiene el plan** el período mínimo pactado.
4. Deja por escrito en la boleta/contrato el plan contratado y el bono aplicado.

## Errores frecuentes

- Prometer el bono sin verificar que el plan del cliente califica.
- No advertir el período mínimo: genera reclamo cuando quiere cambiarse antes.`,
  },
];

/** Consultas históricas simuladas para poblar el dashboard. */
export type SeedConsulta = {
  textoPregunta: string;
  /** Título de la unidad que la responde (null = sin cobertura → no resuelta) */
  unidadTitulo: string | null;
  respuestaResumen: string | null;
  resuelta: boolean;
  escalada: boolean;
  rating: "up" | "down" | null;
  diasAtras: number;
};

export const consultasSeed: SeedConsulta[] = [
  // --- Resueltas con conocimiento publicado ---
  {
    textoPregunta: "El cliente duda entre el S25 y el Ultra, ¿cuál le ofrezco?",
    unidadTitulo: "Galaxy S25 vs S25 Ultra: cuál recomendar",
    respuestaResumen:
      "Pregunta primero para qué lo usa: si son fotos de lejos o escribir a mano, Ultra (zoom y S Pen). Si es uso normal y cómodo de llevar, S25.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 26,
  },
  {
    textoPregunta: "Me está comparando con el iPhone 16 Pro Max, ¿qué le digo?",
    unidadTitulo: "Galaxy S25 Ultra vs iPhone 16 Pro Max",
    respuestaResumen:
      "No hables mal de Apple. Muestra S Pen incluido y el zoom en vivo, y ofrece el traspaso de datos acompañado para bajar el miedo al cambio.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 24,
  },
  {
    textoPregunta: "Me dice que está muy caro y que lo vio más barato en otra tienda",
    unidadTitulo: "«Está muy caro» / lo vi más barato en otro lado",
    respuestaResumen:
      "Pregunta «¿caro comparado con qué?». Si es otra tienda, verifica la política de igualación en el sistema; si es cómo pagarlo, pasa a canje y cuotas.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 21,
  },
  {
    textoPregunta: "¿Cuánto le descuentan por su equipo antiguo?",
    unidadTitulo: "Plan Canje: retoma del equipo usado",
    respuestaResumen:
      "El monto se consulta siempre en el sistema al momento de la venta y se muestra en pantalla al cliente. Verifica que el equipo no tenga bloqueo de cuenta.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 19,
  },
  {
    textoPregunta: "Vino con un equipo con la pantalla mala, ¿le corresponde garantía?",
    unidadTitulo: "Garantía legal (Ley 19.496) vs garantía del fabricante",
    respuestaResumen:
      "Dentro de los 6 meses de la boleta el cliente elige entre cambio, reparación o devolución. No lo derives al servicio técnico para sacártelo de encima.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 17,
  },
  {
    textoPregunta: "¿Cómo le paso las fotos del iPhone al Galaxy nuevo?",
    unidadTitulo: "Traspaso de datos con Smart Switch en tienda",
    respuestaResumen:
      "Con Smart Switch y el cable de la caja. Deja que el cliente elija qué pasar y verifica con él que estén sus fotos antes de que se vaya.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 15,
  },
  {
    textoPregunta: "Dice que todos los teléfonos son iguales, ¿cómo lo convenzo?",
    unidadTitulo: "Cómo demostrar Galaxy AI en 2 minutos",
    respuestaResumen:
      "Demo de 2 minutos: Círculo para buscar, Borrador de objetos, traducción de llamada. Que el cliente haga el gesto con sus manos.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 12,
  },
  {
    textoPregunta: "¿Le ofrezco los Buds junto con el teléfono?",
    unidadTitulo: "Venta cruzada: Galaxy Watch y Buds",
    respuestaResumen:
      "Solo después de que ya decidió el teléfono, y ofrece uno solo. Conéctalos en el mostrador para que los escuche.",
    resuelta: true,
    escalada: false,
    rating: null,
    diasAtras: 10,
  },
  {
    textoPregunta: "El cliente no se acuerda de la clave de su cuenta Google, ¿puedo tomar el canje?",
    unidadTitulo: "Plan Canje: retoma del equipo usado",
    respuestaResumen:
      "No: el equipo debe quedar desvinculado de la cuenta. Es la causa número uno de canjes rechazados.",
    resuelta: true,
    escalada: false,
    rating: "down",
    diasAtras: 8,
  },
  {
    textoPregunta: "¿Qué le digo si insiste en que prefiere iPhone?",
    unidadTitulo: "«Prefiero iPhone, estoy acostumbrado»",
    respuestaResumen:
      "Valida su costumbre, ataca el miedo concreto (fotos, WhatsApp) y ponle el equipo en la mano. Si sigue prefiriendo iPhone, no insistas más de dos veces.",
    resuelta: true,
    escalada: false,
    rating: "up",
    diasAtras: 6,
  },

  // --- BRECHA: seguro / garantía extendida (no documentado) ---
  {
    textoPregunta: "¿Cómo le vendo el seguro de pantalla del equipo?",
    unidadTitulo: null,
    respuestaResumen: null,
    resuelta: false,
    escalada: true,
    rating: null,
    diasAtras: 5,
  },
  {
    textoPregunta: "El cliente pregunta qué cubre la garantía extendida que le ofrecí, no sé qué responder",
    unidadTitulo: null,
    respuestaResumen: null,
    resuelta: false,
    escalada: false,
    rating: null,
    diasAtras: 3,
  },
  {
    textoPregunta: "¿El seguro de pantalla se puede contratar después o solo el día de la compra?",
    unidadTitulo: null,
    respuestaResumen: null,
    resuelta: false,
    escalada: false,
    rating: null,
    diasAtras: 2,
  },
  {
    textoPregunta: "¿Cuánto sale el deducible si el cliente rompe la pantalla con el seguro?",
    unidadTitulo: null,
    respuestaResumen: null,
    resuelta: false,
    escalada: false,
    rating: null,
    diasAtras: 1,
  },

  // --- Consulta con cobertura parcial ---
  {
    textoPregunta: "¿Cuántos años de actualizaciones tiene el equipo?",
    unidadTitulo: null,
    respuestaResumen: null,
    resuelta: false,
    escalada: false,
    rating: null,
    diasAtras: 4,
  },
];
