import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" for Docker, "export" for Capacitor (set CAPACITOR=1 env)
  ...(process.env.CAPACITOR ? { output: "export", distDir: "dist" } : { output: "standalone" }),
  // Produces a minimal self-contained server (.next/standalone) for the Docker image,
  // instead of shipping the full node_modules tree.
  output: "standalone",

  // Security: prevent information leakage via X-Powered-By header
  poweredByHeader: false,

  // Asset CDN prefix — set NEXT_PUBLIC_ASSET_PREFIX=https://cdn.telemon.online in production
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,

  // Explicit React strict mode (Next.js default, made explicit for clarity)
  reactStrictMode: true,

  // Multiple agents commit fast with pre-existing `any`/unused-var warnings;
  // don't let ESLint warnings block production builds. tsc type errors still
  // block via the pre-commit hook and this build's own tsc step.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization domains
  images: {
    domains: ['localhost', 'telemon.online', 'www.telemon.online'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'telemon.online',
      },
      {
        protocol: 'https',
        hostname: 'www.telemon.online',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // 이미지 최적화를 위한 설정
    formats: ['image/webp'], // WebP 형식 지원
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일 캐시 TTL
  },

  // 성능 최적화를 위한 설정
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
    scrollRestoration: true,
    optimisticClientCache: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
  },

  // Rewrite /api/* to the backend so `next dev` works without nginx.
  // In production (Docker), nginx handles this proxy — the rewrite is a no-op
  // because `output: "standalone"` compiles it away and nginx runs in front.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;