import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CAPACITOR ? { output: "export", distDir: "dist" } : {}),
  output: process.env.CAPACITOR ? "export" : "standalone",
  poweredByHeader: false,
  generateEtags: true, // Enable etag generation for caching
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  reactStrictMode: true,
  compress: true,
  // Enable ESLint during builds for better code quality
  eslint: { 
    ignoreDuringBuilds: false 
  },
  // Enable TypeScript build errors for better type safety
  typescript: { 
    ignoreBuildErrors: false 
  },
  images: {
    domains: [
      'localhost', 
      '127.0.0.1',
      ...(process.env.NODE_ENV === 'production' 
        ? [process.env.NEXT_PUBLIC_API_BASE_URL?.replace('https://', '') || ''] 
        : []
      ).filter(Boolean)
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' https:; connect-src 'self' https:; frame-src 'self' https:;",
    minimumCacheTTL: 60 * 60 * 24, // 1 day
  },
  outputFileTracingExcludes: {
    "/*": [
      "node_modules/@swc/core-linux-x64-gnu/**",
      "node_modules/@swc/core-linux-x64-musl/**",
      "node_modules/@esbuild/linux-x64/**",
      "node_modules/caniuse-lite/data/**",
    ],
  },
  serverExternalPackages: ["sharp", "canvas", "@tma.js/sdk-react"],
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
    scrollRestoration: true,
    optimisticClientCache: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    staleTimes: { dynamic: 30, static: 180 },
    // Performance optimization settings
    typedRoutes: true,
    instrumentationHook: true,
    workerThreads: false, // Disable worker threads for performance
    cpus: 1, // Limit CPU usage during bundling
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
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // Changed from DENY to SAMEORIGIN
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }, // Changed from strict-origin-when-cross-origin
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ]
      }
    ];
  },
  webpack: (config, { isServer, dev }) => {
    // Handle modules that shouldn't run on the server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Performance optimization settings
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 244000, // 244KB
            },
            default: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
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
