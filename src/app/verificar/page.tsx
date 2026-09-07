import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import { confirmarCuentaAction } from "@/app/actions/verificar";

export const dynamic = "force-dynamic";

const MENSAJES_ERROR: Record<string, string> = {
  falta_token: "El enlace no trae el código de confirmación.",
  invalido: "Este enlace no es válido. Puede que ya se haya usado.",
  vencido:
    "Este enlace venció. Pide a tu administrador que te reenvíe la invitación.",
};

/**
 * Confirmación de cuenta.
 *
 * A propósito no confirma solo con abrir el enlace (GET): varios clientes de
 * correo pre-visitan los links de un mensaje para escanearlos antes de que la
 * persona lo abra, lo que gastaría el token sin que nadie hiciera clic. Por
 * eso esta página solo muestra un botón — la confirmación ocurre en el
 * server action, que exige una interacción real.
 */
export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo variante="completo" ancho={168} priority />
      </div>

      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        {error ? (
          <>
            <AlertTriangle size={28} className="mx-auto text-amber-500" />
            <h1 className="mt-3 font-display text-lg font-bold text-abismo">
              No pudimos confirmar tu cuenta
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {MENSAJES_ERROR[error] ?? "Ocurrió un problema con el enlace."}
            </p>
          </>
        ) : token ? (
          <>
            <h1 className="font-display text-lg font-bold text-abismo">
              Confirma tu cuenta
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Este es el último paso antes de poder ingresar a KnowFlow.
            </p>
            <form action={confirmarCuentaAction} className="mt-5">
              <input type="hidden" name="token" value={token} />
              <button className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-700">
                Confirmar mi cuenta
              </button>
            </form>
          </>
        ) : (
          <>
            <AlertTriangle size={28} className="mx-auto text-amber-500" />
            <h1 className="mt-3 font-display text-lg font-bold text-abismo">
              Enlace incompleto
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Abre esta página desde el enlace que llegó a tu correo.
            </p>
          </>
        )}

        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-electro hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
