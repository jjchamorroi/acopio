import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dokploy construye la imagen con el Dockerfile: standalone deja un bundle
  // mínimo (~120 MB en vez de ~1 GB con node_modules completo).
  output: "standalone",
};

export default nextConfig;
