import { requireRole } from "@/lib/session";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await requireRole("trabajador_nuevo");
  return <ChatClient nombre={session.user.nombre} />;
}
