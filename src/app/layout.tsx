import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { APP_VERSION } from "@/lib/app-version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KnowFlow Ventas",
  description:
    "Conocimiento comercial validado, en el momento de la venta. Para vendedores de tecnología en retail.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-slate-50 text-slate-900">
        {children}
        <span
          aria-label="Versión de KnowFlow Ventas"
          className="pointer-events-none fixed bottom-2 right-2 select-none text-[10px] text-slate-400"
        >
          v{APP_VERSION}
        </span>
      </body>
    </html>
  );
}
