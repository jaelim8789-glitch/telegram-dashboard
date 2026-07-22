import { MetadataRoute } from 'next'

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 동적으로 페이지 목록 생성
  const routes = ['', '/app', '/auth/login', '/auth/register', '/workspace', '/admin', '/offline'].map((route) => ({
    url: `https://app.telemon.online${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  // API를 통해 동적으로 생성된 경로 추가 (예: 사용자별 대시보드 등)
  const dynamicRoutes = [
    // 여기에 동적으로 생성된 경로들을 추가
    // 예: 사용자별 페이지, 게시물 상세 페이지 등
  ];

  return [...routes, ...dynamicRoutes];
}