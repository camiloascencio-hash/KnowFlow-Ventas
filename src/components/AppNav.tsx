"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  ClipboardCheck,
  History,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  PenLine,
  QrCode,
  ScanSearch,
  Smartphone,
  Tags,
  Target,
  Users,
} from "lucide-react";
import type { Rol } from "@/auth";
import Logo from "@/components/Logo";
import { APP_VERSION } from "@/lib/app-version";

type NavItem = { href: string; label: string; Icon: LucideIcon };

// El catalogo es la mitad dura del conocimiento: lo consulta el vendedor en
// piso y lo mantiene el experto.
const CATALOGO: NavItem = {
  href: "/catalogo",
  label: "Catalogo",
  Icon: Smartphone,
};

const NAV_BY_ROL: Record<Rol, NavItem[]> = {
  trabajador_nuevo: [
    { href: "/chat", label: "Asistente", Icon: MessageSquare },
    CATALOGO,
    { href: "/mis-turnos", label: "Mis ventas", Icon: Target },
    { href: "/mi-historial", label: "Historial", Icon: History },
  ],
  experto: [
    { href: "/experto/unidades", label: "Conocimiento", Icon: BookOpen },
    CATALOGO,
    { href: "/experto/contrastes", label: "Contrastar", Icon: ScanSearch },
    { href: "/experto/aportar", label: "Aportar", Icon: PenLine },
  ],
  validador: [
    { href: "/validador/bandeja", label: "Bandeja", Icon: ClipboardCheck },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Panel", Icon: LayoutDashboard },
    CATALOGO,
    { href: "/admin/cargos", label: "Cargos", Icon: Tags },
    { href: "/admin/usuarios", label: "Usuarios", Icon: Users },
    { href: "/admin/qr", label: "QR", Icon: QrCode },
  ],
};

export default function AppNav({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.replace("/login");
  }

  return (
    <>
      {/* Barra superior BLANCA: el logotipo tiene un ala casi negra y sobre
          fondo abismo desaparece. La marca manda sobre el color de la barra. */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Link href="/" aria-label="KnowFlow — inicio">
            <Logo variante="horizontal" ancho={128} priority />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium tracking-wide text-slate-500 sm:inline">
              {nombre}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-abismo"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <span className="fixed bottom-16 right-2 z-10 rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 ring-1 ring-slate-200">
        v{APP_VERSION}
      </span>

      <nav className="fixed inset-x-0 bottom-0 z-20 bg-abismo pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl">
          {NAV_BY_ROL[rol].map((item) => {
            const activo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                  activo
                    ? "text-white shadow-[inset_0_2px_0_var(--color-flujo)]"
                    : "text-acero hover:text-white"
                }`}
              >
                <item.Icon size={18} strokeWidth={activo ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
