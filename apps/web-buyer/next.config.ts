import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Activation de la compression Brotli et Gzip
  compress: true,

  // Sécurité : masquer l'en-tête x-powered-by
  poweredByHeader: false,

  // Optimisation et mise en cache des images (30 jours)
  images: {
    minimumCacheTTL: 2592000,
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
        // Cache pour les images et icônes publiques
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Cache pour les pages statiques d'information
        source: "/(terms|privacy-policy|shipping-policy|quality-charter|seller-guide|faq)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // En-têtes de sécurité généraux
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
