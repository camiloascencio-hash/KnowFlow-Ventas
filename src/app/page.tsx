import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeForRol } from "@/lib/session";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homeForRol(session.user.rol));
}
