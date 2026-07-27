"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const DEMO_USERS = [
  { email: "vendedor@knowflow.cl", label: "Vendedor nuevo" },
  { email: "experto@knowflow.cl", label: "Vendedor experto" },
  { email: "validador@knowflow.cl", label: "Jefe de tienda" },
  { email: "admin@knowflow.cl", label: "Jefatura comercial" },
];

export function LoginForm({ demoEnabled }: { demoEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  async function attemptSignIn(selectedEmail: string, selectedPassword: string) {
    setError(null);
    setLoadingEmail(selectedEmail);

    try {
      const response = await signIn("credentials", {
        email: selectedEmail,
        password: selectedPassword,
        redirect: false,
      });

      if (response?.error) {
        setError("Credenciales incorrectas. Intenta de nuevo.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("No fue posible conectarse al servidor. Intenta nuevamente.");
    } finally {
      setLoadingEmail(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await attemptSignIn(email, password);
  }

  async function handleDemoLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo123");
    await attemptSignIn(demoEmail, "demo123");
  }

  const loading = loadingEmail !== null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-blue-700">
          KnowFlow <span className="text-slate-400">Ventas</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Lo que necesitas saber para cerrar la venta, validado.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
            placeholder={demoEnabled ? "vendedor@knowflow.cl" : "tu@empresa.cl"}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder={demoEnabled ? "demo123" : "••••••••"}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      {demoEnabled && (
        <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Usuarios demo — acceso con un clic
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(user.email)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-left text-xs text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
              >
                <span className="block font-medium text-slate-800">
                  {loadingEmail === user.email ? "Ingresando..." : user.label}
                </span>
                {user.email}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
