import { redirect } from "next/navigation";
import { auth, type Rol } from "@/auth";

/**
 * Exige sesión activa y (opcionalmente) uno de los roles indicados.
 * Redirige a /login si no hay sesión, o al home del rol si no corresponde.
 */
export async function requireRole(...roles: Rol[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (roles.length > 0 && !roles.includes(session.user.rol)) {
    redirect(homeForRol(session.user.rol));
  }
  return session;
}

export function homeForRol(rol: Rol): string {
  switch (rol) {
    case "trabajador_nuevo":
      return "/chat";
    case "experto":
      return "/experto/unidades";
    case "validador":
      return "/validador/bandeja";
    case "admin":
      return "/admin/dashboard";
  }
}
