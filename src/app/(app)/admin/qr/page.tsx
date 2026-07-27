import QRCode from "qrcode";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { TipoBadge } from "@/components/Badges";

/**
 * Genera códigos QR descargables (PNG) para cada unidad publicada.
 * El QR apunta a la página pública /qr/[id] — para pegarlo junto al
 * puesto de trabajo (ej: la caja).
 */
export default async function QrAdminPage() {
  const session = await requireRole("admin");

  // En Render, RENDER_EXTERNAL_URL trae la URL pública del servicio; así los
  // QR apuntan al dominio correcto sin configurar nada a mano.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    "http://localhost:3000";

  const publicadas = await db
    .select({
      id: schema.unidadesConocimiento.id,
      titulo: schema.unidadesConocimiento.titulo,
      tipo: schema.unidadesConocimiento.tipo,
    })
    .from(schema.unidadesConocimiento)
    .where(and(eq(schema.unidadesConocimiento.estado, "publicado"), eq(schema.unidadesConocimiento.cargoId, session.user.cargoId!)))
    .orderBy(asc(schema.unidadesConocimiento.id));

  const conQr = await Promise.all(
    publicadas.map(async (u) => ({
      ...u,
      url: `${baseUrl}/qr/${u.id}`,
      dataUrl: await QRCode.toDataURL(`${baseUrl}/qr/${u.id}`, {
        width: 480,
        margin: 2,
      }),
    }))
  );

  return (
    <div>
      <h1 className="text-xl font-bold">Códigos QR</h1>
      <p className="mt-1 text-sm text-slate-500">
        Descarga e imprime el QR de cada unidad publicada para pegarlo en la
        isla de demo, la vitrina o la trastienda. Se abren sin necesidad de
        login.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {conQr.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.dataUrl}
              alt={`QR de ${u.titulo}`}
              className="h-24 w-24 shrink-0 rounded-lg ring-1 ring-slate-100"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{u.titulo}</p>
              <div className="mt-1">
                <TipoBadge tipo={u.tipo} />
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <a
                  href={u.dataUrl}
                  download={`knowflow-qr-${u.id}.png`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  ⬇ Descargar PNG
                </a>
                <a
                  href={u.url}
                  target="_blank"
                  className="text-slate-500 hover:underline"
                >
                  Ver página ↗
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {conQr.length === 0 && (
        <p className="py-10 text-center text-slate-400">
          No hay unidades publicadas todavía.
        </p>
      )}
    </div>
  );
}
