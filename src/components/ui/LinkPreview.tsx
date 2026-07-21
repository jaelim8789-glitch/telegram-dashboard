"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Image, Globe, Loader2 } from "lucide-react";

interface LinkPreviewProps {
  url: string;
  className?: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  siteName: string;
}

/**
 * Smart Link Preview — URL의 Open Graph 데이터를 카드로 표시 (Telegram 스타일)
 */
export function LinkPreview({ url, className = "" }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url || !url.startsWith("http")) return;
    setLoading(true);
    setError(false);

    // Use a proxy to avoid CORS issues
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    fetch(proxyUrl, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.text())
      .then((html) => {
        const getMeta = (prop: string) => {
          const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)`));
          return m ? m[1] : null;
        };
        const title = getMeta("og:title") || getMeta("twitter:title") || "";
        const description = getMeta("og:description") || getMeta("twitter:description") || "";
        const image = getMeta("og:image") || getMeta("twitter:image") || "";
        const siteName = getMeta("og:site_name") || new URL(url).hostname;

        if (title || description) {
          setData({ title, description, image, siteName });
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className={`flex items-center gap-2 rounded-xl border border-app-border bg-app-card p-3 text-xs text-app-text-muted ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" /> 링크 미리보기 로딩...
    </div>
  );

  if (error || !data) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`block rounded-xl border border-app-border bg-app-card overflow-hidden hover:border-app-primary/30 transition-colors ${className}`}>
      {data.image && (
        <div className="relative h-40 bg-app-border/20 overflow-hidden">
          <img src={data.image} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
          <Globe className="h-3 w-3" />
          {data.siteName}
        </div>
        <p className="text-xs font-semibold text-app-text line-clamp-2">{data.title}</p>
        {data.description && (
          <p className="text-[10px] text-app-text-subtle mt-1 line-clamp-2">{data.description}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-[10px] text-app-primary">
          <ExternalLink className="h-3 w-3" /> 링크 열기
        </div>
      </div>
    </a>
  );
}
