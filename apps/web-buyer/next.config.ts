import type { NextConfig } from "next";

function makeHeader(k: string, v: string) {
  return { key: k, value: v };
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  compress: true,

  // Sécurité : masquer l'en-tête x-powered-by
  poweredByHeader: false,

  // Optimisation et mise en cache des images (30 jours)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // En-têtes HTTP de performance, Edge Caching et Sécurité
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          makeHeader("Cache-Control", "public, max-age=31536000, immutable"),
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          makeHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"),
        ],
      },
      {
        // Cache pour les pages statiques d'information
        source: "/(terms|privacy-policy|shipping-policy|quality-charter|seller-guide|faq)",
        headers: [
          makeHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"),
        ],
      },
      {
        // En-têtes de sécurité généraux
        source: "/:path*",
        headers: [
          makeHeader("X-Content-Type-Options", "nosniff"),
          makeHeader("X-Frame-Options", "SAMEORIGIN"),
          makeHeader("Referrer-Policy", "strict-origin-when-cross-origin"),
        ],
      },
    ];
  },
};

export default nextConfig;
