import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CAPACITOR ? { output: "export", distDir: "dist" } : { output: "standalone" }),
  output: "standalone",
  poweredByHeader: false,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  reactStrictMode: true,
  compress: true,
  eslint: { ignoreDuringBuilds: true },
  // TEMPORARY (2026-07-22, user-approved): unblock deploy while a backlog of
  // pre-existing type errors is cleaned up separately — see TEAM_STATUS.md.
  // Remove once the backlog is cleared.
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: [
      'cdn.telegram.org',
      'telegra.ph',
      'localhost',
      '127.0.0.1',
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.example.com", // CDN 호스트명
        port: "",
        pathname: "/images/**",
      },
      // Telegram 프로필 사진 등 외부 이미지 허용
      {
        protocol: "https",
        hostname: "cdn.telegram.org",
        port: "",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "telegra.ph",
        port: "",
        pathname: "/**",
      },
      // CDN 패턴 추가
      {
        protocol: "https",
        hostname: "**.amazonaws.com", // AWS CloudFront 또는 S3
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.cdn.telemon.online", // TeleMon 전용 CDN
        pathname: "/**",
      },
    ],
    formats: ['image/avif', 'image/webp'], // Modern image formats
    minimumCacheTTL: 60 * 60 * 24, // 24 hours caching
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

/**
 * Content Security Policy (CSP) headers
 */
export async function headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.telegram.org https://*.tma.js https://*.sentry.io",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.sentry.io https://api.telegram.org https://*.telegram.org wss: http:",
            "media-src 'self' https: http:",
            "frame-src 'self' https://*.telegram.org https://*.tma.js",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
          ].join('; ')
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=()'
        }
      ]
    }
  ];
}
