"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Smartphone } from "lucide-react";
import type { Rol } from "@/auth";
import { APP_VERSION } from "@/lib/app-version";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  Icon?: typeof Smartphone;
};

// El catálogo es la mitad dura del conocimiento: lo consultan el vendedor en
// piso y el experto que lo mantiene.
const CATALOGO: NavItem = {
  href: "/catalogo",
  label: "Catálogo",
  icon: "",
  Icon: Smartphone,
};

const NAV_BY_ROL: Record<Rol, NavItem[]> = {
  trabajador_nuevo: [{ href: "/chat", label: "Asistente", icon: "💬" }, CATALOGO, { href: "/mis-turnos", label: "Mis primeras ventas", icon: "🎯" }],
  experto: [{ href: "/experto/unidades", label: "Mi conocimiento", icon: "📚" }, CATALOGO, { href: "/experto/contrastes", label: "Contrastar", icon: "🔎" }, { href: "/experto/aportar", label: "Aportar", icon: "✍️" }],
  validador: [{ href: "/validador/bandeja", label: "Bandeja", icon: "✅" }],
  admin: [{ href: "/admin/dashboard", label: "Dashboard", icon: "📊" }, CATALOGO, { href: "/admin/cargos", label: "Cargos", icon: "🏷️" }, { href: "/admin/usuarios", label: "Usuarios", icon: "👥" }, { href: "/admin/qr", label: "QR", icon: "🔲" }],
};

export default function AppNav({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname();
  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.replace("/login");
  }
  return <><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3"><span className="text-lg font-bold tracking-tight text-blue-700">KnowFlow <span className="text-slate-400">Ventas</span></span><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">{nombre}</span><button type="button" onClick={handleSignOut} className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Salir</button></div></div></header><span className="fixed bottom-16 right-2 z-10 rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 ring-1 ring-slate-100">v{APP_VERSION}</span><nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"><div className="mx-auto flex max-w-3xl">{NAV_BY_ROL[rol].map((item) => <Link key={item.href} href={item.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${pathname.startsWith(item.href) ? "text-blue-700" : "text-slate-400 hover:text-slate-600"}`}><span className="flex h-[18px] items-center text-lg leading-none">{item.Icon ? <item.Icon size={18} /> : item.icon}</span>{item.label}</Link>)}</div></nav></>;
}
