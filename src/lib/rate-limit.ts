/**
 * Limite de uso por usuario para los endpoints que gastan tokens de IA.
 *
 * Cada pregunta al asistente cuesta un embedding de Gemini y entre una y seis
 * llamadas a Anthropic. Sin techo, un bucle mal escrito en el cliente o una
 * demo publica que alguien deja abierta se come el presupuesto del mes.
 *
 * Ventana deslizante en memoria: suficiente para un servidor persistente como
 * Render con una instancia. Si algun dia hay varias instancias, esto tiene que
 * moverse a Postgres o a un Redis compartido.
 */
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = Number(process.env.RATE_LIMIT_CHAT_POR_MINUTO ?? 12);

type Registro = { golpes: number[] };
const porUsuario = new Map<string, Registro>();

export type ResultadoLimite = {
  permitido: boolean;
  restantes: number;
  reintentarEnSegundos: number;
};

export function consumirCuota(
  clave: string,
  max = MAX_POR_VENTANA,
  ventanaMs = VENTANA_MS
): ResultadoLimite {
  const ahora = Date.now();
  const registro = porUsuario.get(clave) ?? { golpes: [] };

  registro.golpes = registro.golpes.filter((t) => ahora - t < ventanaMs);

  if (registro.golpes.length >= max) {
    const masAntiguo = registro.golpes[0];
    porUsuario.set(clave, registro);
    return {
      permitido: false,
      restantes: 0,
      reintentarEnSegundos: Math.max(
        1,
        Math.ceil((ventanaMs - (ahora - masAntiguo)) / 1000)
      ),
    };
  }

  registro.golpes.push(ahora);
  porUsuario.set(clave, registro);

  // Poda perezosa: evita que el mapa crezca sin limite con usuarios inactivos.
  if (porUsuario.size > 500) {
    for (const [k, v] of porUsuario) {
      if (v.golpes.every((t) => ahora - t >= ventanaMs)) porUsuario.delete(k);
    }
  }

  return {
    permitido: true,
    restantes: max - registro.golpes.length,
    reintentarEnSegundos: 0,
  };
}

/** Solo para los tests: deja el contador en blanco. */
export function reiniciarCuotas() {
  porUsuario.clear();
}
