import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CAPACITOR ? { output: "export", distDir: "dist" } : {}),
  output: process.env.CAPACITOR ? "export" : "standalone",
  poweredByHeader: false,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  reactStrictMode: true,
  compress: true,
  images: {
    domains: [
      'cdn.telegram.org',
      'telegra.ph',
      'localhost',
      '127.0.0.1',
    ],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com", port: "", pathname: "/images/**" },
      { protocol: "https", hostname: "cdn.telegram.org", port: "", pathname: "/file/**" },
      { protocol: "https", hostname: "telegra.ph", port: "", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", port: "", pathname: "/**" },
      { protocol: "https", hostname: "img.cdn.telemon.online", port: "", pathname: "/**" },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
  },
  outputFileTracingExcludes: {
    "/*": [
      "node_modules/@swc/core-linux-x64-gnu/**",
      "node_modules/@swc/core-linux-x64-musl/**",
      "node_modules/@esbuild/linux-x64/**",
      "node_modules/caniuse-lite/data/**",
    ],
  },
  serverExternalPackages: ["sharp", "canvas"],
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
    scrollRestoration: true,
    optimisticClientCache: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://*.telegram.org https://*.tma.js https://*.sentry.io",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.sentry.io https://api.telegram.org https://*.telegram.org https://api.telemon.online wss: http:",
            "media-src 'self' https: http:",
            "frame-src 'self' https://*.telegram.org https://*.tma.js",
            "object-src 'none'", "base-uri 'self'", "form-action 'self'",
            "frame-ancestors 'none'", "upgrade-insecure-requests"
          ].join('; ') },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ]
      }
    ];
  },
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
    }];
  },
};

if (process.env.ANALYZE) {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({ enabled: true });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

const sentryWebpackPluginOptions = { silent: true };

export default withSentryConfig(
  typeof nextConfig === "function" ? nextConfig : () => Promise.resolve(nextConfig),
  sentryWebpackPluginOptions
);
