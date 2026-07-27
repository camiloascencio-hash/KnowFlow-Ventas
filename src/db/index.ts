import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://knowflow:knowflow@localhost:5432/knowflow";

// En dev de Next.js el módulo se recarga; reutilizamos la conexión global
const globalForDb = globalThis as unknown as { dbClient?: postgres.Sql };

// `prepare: false` es compatible tanto con la conexión directa como con el
// pooler de Neon (PgBouncer en modo transacción no soporta prepared statements).
// Tamaño del pool:
//   - Serverless (Vercel): 1 por instancia → default en producción.
//   - Servidor persistente (Render): varias conexiones → set DB_POOL_MAX (ej. 10).
const maxConn = process.env.DB_POOL_MAX
  ? Number(process.env.DB_POOL_MAX)
  : process.env.NODE_ENV === "production"
    ? 1
    : undefined;

const client =
  globalForDb.dbClient ??
  postgres(connectionString, { prepare: false, max: maxConn });
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = client;

export const db = drizzle(client, { schema });
export { schema };

/** Cierra la conexión (usado por los tests para terminar el proceso). */
export async function closeDb() {
  await client.end();
}
