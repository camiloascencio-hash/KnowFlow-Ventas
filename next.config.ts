import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al servidor de desarrollo desde otros dispositivos de la
  // red local (celular/tablet vía la IP del PC). Si tu IP cambia, agrégala.
  allowedDevOrigins: ["10.169.42.79", "localhost", "*.trycloudflare.com"],
};

export default nextConfig;


