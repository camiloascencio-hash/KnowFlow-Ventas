/**
 * Aislamiento de la base de pruebas.
 *
 * Los tests insertan y borran cargos, usuarios y consultas reales. Si corren
 * contra la misma base que sirve la demo, un `afterAll` que no alcanza a
 * ejecutarse deja basura delante de un cliente.
 *
 * Define DATABASE_URL_TEST (en Neon, una branch cuesta cero y es instantanea)
 * y los tests trabajan ahi. Si no esta definida, se avisa fuerte antes de
 * tocar nada.
 */
import "dotenv/config";

const test = process.env.DATABASE_URL_TEST;

if (test) {
  process.env.DATABASE_URL = test;
} else {
  const destino = (process.env.DATABASE_URL ?? "").split("/").pop() ?? "?";
  console.warn(
    `\n  AVISO: no hay DATABASE_URL_TEST definida.\n` +
      `  Los tests van a escribir en la base "${destino.split("?")[0]}".\n` +
      `  Define DATABASE_URL_TEST en .env para aislarlos.\n`
  );
}
