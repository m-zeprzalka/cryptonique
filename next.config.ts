import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Optymalizacja obrazów
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coincap.io",
        port: "",
        pathname: "/assets/icons/**",
      },
    ],
  },

  // Konfiguracja kompresji
  compress: true,

  // Optymalizacja performance
  poweredByHeader: false,
}

export default nextConfig
