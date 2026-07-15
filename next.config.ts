import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server (.next/standalone) for the Docker image,
  // instead of shipping the full node_modules tree.
  output: "standalone",

  // Security: prevent information leakage via X-Powered-By header
  poweredByHeader: false,

  // Explicit React strict mode (Next.js default, made explicit for clarity)
  reactStrictMode: true,

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
