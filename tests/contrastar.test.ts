import { describe, expect, it } from "vitest";
import { validarDivergencias } from "../src/lib/ai/contrastar";

describe("validarDivergencias", () => {
  const fuentes = { manual: "El cajero debe usar su propio usuario.", relatoExperto: "A veces se abre con la cuenta del cajero anterior.", errores: "" };

  it("conserva solo divergencias de los cuatro tipos con evidencia literal", () => {
    const resultado = validarDivergencias(fuentes, [
      { tipo: "atajo_riesgoso", descripcion: "Cuenta compartida", evidenciaManual: "su propio usuario", evidenciaOperacion: "cuenta del cajero anterior", riesgo: "Sin trazabilidad", recomendacion: "Usar cuenta propia" },
      { tipo: "atajo_riesgoso", descripcion: "Sin prueba", evidenciaOperacion: "texto inventado", riesgo: "Riesgo", recomendacion: "No usar" },
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("atajo_riesgoso");
  });
});
