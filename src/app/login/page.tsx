import { isInvestorDemo } from "@/lib/app-mode";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  return <LoginForm demoEnabled={isInvestorDemo()} okInicial={ok} />;
}
