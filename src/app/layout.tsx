import type { Metadata, Viewport } from "next";
import { Outfit, Sora } from "next/font/google";
import "./globals.css";

// Outfit para interfaz y texto; Sora para titulares y cifras.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
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
    <html lang="es" className={`${outfit.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-niebla text-abismo">
        {children}
      </body>
    </html>
  );
}
