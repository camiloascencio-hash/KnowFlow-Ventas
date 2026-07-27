import "dotenv/config";
import postgres from "postgres";

function required(name: string) { if (!process.env[name]) throw new Error(`Falta ${name}. Revisa .env o las variables de Render.`); }

async function main() {
  if (process.env.APP_MODE !== "investor_demo") throw new Error("demo:check requiere APP_MODE=investor_demo.");
  required("DATABASE_URL"); required("NEXTAUTH_SECRET"); required("GEMINI_API_KEY");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const [{ count: users }] = await client<{ count: string }[]>`select count(*) as count from usuarios`;
    const [{ count: contrastes }] = await client<{ count: string }[]>`select count(*) as count from contrastes where estado = 'completado'`;
    const [{ count: units }] = await client<{ count: string }[]>`select count(*) as count from unidades_conocimiento where estado = 'publicado'`;
    if (Number(users) < 4 || Number(contrastes) < 1 || Number(units) < 1) throw new Error("Faltan usuarios, contraste o unidades seed. Ejecuta npm run demo:reset.");
    const base = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
    const [login, turnos] = await Promise.all([fetch(`${base}/login`, { redirect: "manual" }), fetch(`${base}/mis-turnos`, { redirect: "manual" })]);
    if (!login.ok || ![200, 302, 307].includes(turnos.status)) throw new Error(`Las rutas demo no responden como se esperaba (login ${login.status}, turnos ${turnos.status}).`);
    console.log("demo:check OK — entorno, base, seed y rutas principales listos.");
  } finally { await client.end(); }
}
main().catch((error) => { console.error("demo:check falló:", error); process.exit(1); });
