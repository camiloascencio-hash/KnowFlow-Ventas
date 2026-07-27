import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppNav from "@/components/AppNav";
import DemoBanner from "@/components/DemoBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav rol={session.user.rol} nombre={session.user.nombre} />
      <DemoBanner enabled={process.env.APP_MODE !== "production"} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
    </div>
  );
}
