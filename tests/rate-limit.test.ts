/**
 * Limite de uso del asistente.
 *
 * No es una optimizacion: cada consulta gasta un embedding de Gemini y hasta
 * seis llamadas a Anthropic. Sin techo, un bucle en el cliente vacia el
 * presupuesto sin que nadie se entere hasta que llega la factura.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { consumirCuota, reiniciarCuotas } from "@/lib/rate-limit";

beforeEach(() => reiniciarCuotas());

describe("cuota por usuario", () => {
  it("deja pasar hasta el maximo y bloquea el siguiente", () => {
    for (let i = 0; i < 3; i++) {
      expect(consumirCuota("u1", 3).permitido).toBe(true);
    }
    const bloqueado = consumirCuota("u1", 3);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.restantes).toBe(0);
    expect(bloqueado.reintentarEnSegundos).toBeGreaterThan(0);
  });

  it("cuenta por usuario, no de forma global", () => {
    consumirCuota("ana", 1);
    expect(consumirCuota("ana", 1).permitido).toBe(false);
    // Que Ana llegue a su techo no puede dejar sin asistente a Bruno.
    expect(consumirCuota("bruno", 1).permitido).toBe(true);
  });

  it("libera la cuota cuando la ventana pasa", async () => {
    expect(consumirCuota("u2", 1, 30).permitido).toBe(true);
    expect(consumirCuota("u2", 1, 30).permitido).toBe(false);
    await new Promise((r) => setTimeout(r, 45));
    expect(consumirCuota("u2", 1, 30).permitido).toBe(true);
  });

  it("informa cuantas consultas quedan", () => {
    expect(consumirCuota("u3", 5).restantes).toBe(4);
    expect(consumirCuota("u3", 5).restantes).toBe(3);
  });
});
