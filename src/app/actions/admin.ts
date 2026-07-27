"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword, type Rol } from "@/auth";
import { requireRole } from "@/lib/session";

const ROLES: Rol[] = ["trabajador_nuevo", "experto", "validador", "admin"];

/** Vuelve a la pantalla con un mensaje de resultado (ok) o de error. */
function volver(ruta: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  revalidatePath(ruta);
  redirect(`${ruta}?${qs}`);
}

// --- Cargos -----------------------------------------------------------------

/** Admin: crea un cargo (ej: "Reponedor de sala"). */
export async function crearCargoAction(formData: FormData) {
  await requireRole("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (nombre.length < 3) {
    volver("/admin/cargos", { error: "El nombre del cargo es muy corto." });
  }

  const [existente] = await db
    .select({ id: schema.cargos.id })
    .from(schema.cargos)
    .where(eq(schema.cargos.nombre, nombre))
    .limit(1);
  if (existente) {
    volver("/admin/cargos", { error: `Ya existe un cargo llamado "${nombre}".` });
  }

  await db
    .insert(schema.cargos)
    .values({ nombre, descripcion: descripcion || null });

  volver("/admin/cargos", { ok: `Cargo "${nombre}" creado.` });
}

/** Admin: edita nombre y descripción de un cargo. */
export async function editarCargoAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (nombre.length < 3) {
    volver("/admin/cargos", { error: "El nombre del cargo es muy corto." });
  }

  await db
    .update(schema.cargos)
    .set({ nombre, descripcion: descripcion || null })
    .where(eq(schema.cargos.id, id));

  volver("/admin/cargos", { ok: "Cargo actualizado." });
}

/**
 * Admin: elimina un cargo. Se bloquea si tiene usuarios o conocimiento
 * asociado (borrarlo arrastraría unidades, chunks y consultas).
 */
export async function eliminarCargoAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));

  // Todo lo que cuelga de un cargo: si hay algo, no se borra (evita perder
  // conocimiento y romper referencias).
  const [[{ n: nUsuarios }], [{ n: nUnidades }], [{ n: nFuentes }], [{ n: nContrastes }]] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.cargoId, id)),
      db
        .select({ n: count() })
        .from(schema.unidadesConocimiento)
        .where(eq(schema.unidadesConocimiento.cargoId, id)),
      db
        .select({ n: count() })
        .from(schema.fuentesConocimiento)
        .where(eq(schema.fuentesConocimiento.cargoId, id)),
      db
        .select({ n: count() })
        .from(schema.contrastes)
        .where(eq(schema.contrastes.cargoId, id)),
    ]);

  if (nUsuarios > 0 || nUnidades > 0 || nFuentes > 0 || nContrastes > 0) {
    volver("/admin/cargos", {
      error: `No se puede eliminar: el cargo tiene ${nUsuarios} usuario(s), ${nUnidades} unidad(es), ${nFuentes} fuente(s) y ${nContrastes} contraste(s). Reasígnalos o elimínalos primero.`,
    });
  }

  await db.delete(schema.cargos).where(eq(schema.cargos.id, id));
  volver("/admin/cargos", { ok: "Cargo eliminado." });
}

// --- Usuarios ---------------------------------------------------------------

/** Admin: crea un usuario con su rol y cargo. */
export async function crearUsuarioAction(formData: FormData) {
  await requireRole("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "") as Rol;
  const cargoId = Number(formData.get("cargoId"));

  if (nombre.length < 3) {
    volver("/admin/usuarios", { error: "Ingresa el nombre completo." });
  }
  if (!email.includes("@")) {
    volver("/admin/usuarios", { error: "El email no es válido." });
  }
  if (password.length < 6) {
    volver("/admin/usuarios", {
      error: "La contraseña debe tener al menos 6 caracteres.",
    });
  }
  if (!ROLES.includes(rol)) {
    volver("/admin/usuarios", { error: "Rol no válido." });
  }
  if (!cargoId) {
    volver("/admin/usuarios", {
      error: "Selecciona un cargo (el asistente y el dashboard dependen de él).",
    });
  }

  const [existente] = await db
    .select({ id: schema.usuarios.id })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.email, email))
    .limit(1);
  if (existente) {
    volver("/admin/usuarios", { error: `Ya existe un usuario con ${email}.` });
  }

  await db.insert(schema.usuarios).values({
    nombre,
    email,
    passwordHash: await hashPassword(password),
    rol,
    cargoId,
  });

  volver("/admin/usuarios", { ok: `Usuario ${email} creado.` });
}

/**
 * Admin: cambia el rol y/o el cargo de un usuario.
 * Protege contra dejar el sistema sin ningún admin.
 */
export async function actualizarUsuarioAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const rol = String(formData.get("rol") ?? "") as Rol;
  const cargoId = Number(formData.get("cargoId"));

  if (!ROLES.includes(rol)) {
    volver("/admin/usuarios", { error: "Rol no válido." });
  }

  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, id))
    .limit(1);
  if (!usuario) volver("/admin/usuarios", { error: "Usuario no encontrado." });

  // Si deja de ser admin, debe quedar al menos otro admin en pie.
  if (usuario.rol === "admin" && rol !== "admin") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.rol, "admin"), ne(schema.usuarios.id, id)));
    if (n === 0) {
      volver("/admin/usuarios", {
        error: "No puedes quitar el último administrador del sistema.",
      });
    }
  }

  await db
    .update(schema.usuarios)
    .set({ rol, cargoId: cargoId || null })
    .where(eq(schema.usuarios.id, id));

  volver("/admin/usuarios", { ok: `${usuario.nombre} actualizado.` });
}

/** Admin: define una nueva contraseña para un usuario. */
export async function resetPasswordAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    volver("/admin/usuarios", {
      error: "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  await db
    .update(schema.usuarios)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(schema.usuarios.id, id));

  volver("/admin/usuarios", { ok: "Contraseña actualizada." });
}

/**
 * Admin: elimina un usuario. No permite auto-eliminarse ni borrar al último
 * admin. Si el usuario aportó o validó conocimiento, se bloquea (esas
 * referencias son parte de la trazabilidad).
 */
export async function eliminarUsuarioAction(formData: FormData) {
  const session = await requireRole("admin");
  const id = Number(formData.get("id"));

  if (id === Number(session.user.id)) {
    volver("/admin/usuarios", { error: "No puedes eliminar tu propia cuenta." });
  }

  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, id))
    .limit(1);
  if (!usuario) volver("/admin/usuarios", { error: "Usuario no encontrado." });

  if (usuario.rol === "admin") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.rol, "admin"), ne(schema.usuarios.id, id)));
    if (n === 0) {
      volver("/admin/usuarios", {
        error: "No puedes eliminar el último administrador del sistema.",
      });
    }
  }

  // Trazabilidad: no se borran autores/validadores de conocimiento existente.
  const [{ n: nAportadas }] = await db
    .select({ n: count() })
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.autorExpertoId, id));
  const [{ n: nValidadas }] = await db
    .select({ n: count() })
    .from(schema.unidadesConocimiento)
    .where(eq(schema.unidadesConocimiento.validadorId, id));

  if (nAportadas > 0 || nValidadas > 0) {
    volver("/admin/usuarios", {
      error: `No se puede eliminar: ${usuario.nombre} aportó ${nAportadas} y validó ${nValidadas} unidad(es). Cambia su rol en vez de borrarlo (se perdería la trazabilidad).`,
    });
  }

  // Las consultas del trabajador se conservan (métricas agregadas) sin autor.
  await db
    .update(schema.consultas)
    .set({ usuarioId: null })
    .where(eq(schema.consultas.usuarioId, id));

  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
  volver("/admin/usuarios", { ok: `${usuario.nombre} eliminado.` });
}
