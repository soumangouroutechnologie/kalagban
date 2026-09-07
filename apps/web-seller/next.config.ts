import type { NextConfig } from "next";

function makeHeader(k: string, v: string) {
  return { key: k, value: v };
}

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
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
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          makeHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"),
        ],
      },
      {
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
