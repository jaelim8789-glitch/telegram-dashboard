import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server (.next/standalone) for the Docker image,
  // instead of shipping the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
