import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server (.next/standalone) for the Docker image,
  // instead of shipping the full node_modules tree.
  output: "standalone",

  // Security: prevent information leakage via X-Powered-By header
  poweredByHeader: false,

  // Explicit React strict mode (Next.js default, made explicit for clarity)
  reactStrictMode: true,

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
    // 동적 임포트를 통한 코드 분할
    esmExternals: 'loose',
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