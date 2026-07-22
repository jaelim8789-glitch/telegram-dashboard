import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CAPACITOR ? { output: "export", distDir: "dist" } : { output: "standalone" }),
  output: "standalone",
  poweredByHeader: false,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
    scrollRestoration: true,
    optimisticClientCache: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    staleTimes: { dynamic: 30, static: 180 },
    serverComponentsExternalPackages: ["sharp", "canvas"],
  },
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/:path*`,
    }];
  },
};

// 번들 분석 활성화 (ANALYZE 환경변수가 있을 경우)
if (process.env.ANALYZE) {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

// Sentry 설정
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

// Export the config with Sentry
export default withSentryConfig(
  typeof nextConfig === "function" ? nextConfig : () => Promise.resolve(nextConfig),
  sentryWebpackPluginOptions
);
