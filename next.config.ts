import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server (.next/standalone) for the Docker image,
  // instead of shipping the full node_modules tree.
  output: "standalone",

  // Security: prevent information leakage via X-Powered-By header
  poweredByHeader: false,

  // Explicit React strict mode (Next.js default, made explicit for clarity)
  reactStrictMode: true,
};

export default nextConfig;
