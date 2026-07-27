import { isInvestorDemo } from "@/lib/app-mode";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return <LoginForm demoEnabled={isInvestorDemo()} />;
}
