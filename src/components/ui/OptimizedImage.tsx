import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean; // 우선 순위 이미지 (LCP에 영향을 주는 경우)
  placeholder?: 'blur' | 'empty'; // 플레이스홀더 유형
  blurDataURL?: string; // blur 플레이스홀더 데이터 URL
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer를 사용하여 뷰포트에 진입할 때 로드
  useEffect(() => {
    if (priority) {
      // 우선 순위 이미지는 즉시 로드
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold: 0.01, // 1%라도 보이면 로드 시작
        rootMargin: '50px' // 미리 50px 전에 로드 시작
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // 스타일 설정
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width || 'auto',
    height: height || 'auto',
    overflow: 'hidden'
  };

  const imageStyle: React.CSSProperties = {
    width: width ? '100%' : undefined,
    height: height ? '100%' : undefined,
    display: 'block',
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.3s ease',
    objectFit: 'cover'
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: placeholder === 'blur' && blurDataURL 
      ? `url(${blurDataURL}) center/cover no-repeat`
      : '#f3f4f6',
    display: isLoading ? 'block' : 'none'
  };

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {/* 플레이스홀더 */}
      {placeholder !== 'empty' && (
        <div style={placeholderStyle} />
      )}
      
      {/* 실제 이미지 */}
      {isVisible && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={imageStyle}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* 오류 시 폴백 */}
      {hasError && (
        <div 
          style={{
            ...placeholderStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fee2e2',
            color: '#ef4444'
          }}
        >
          <span>이미지 로드 실패</span>
        </div>
      )}
    </div>
  );
}

// 이미지 최적화 훅
export function useImageOptimizer() {
  /**
   * 이미지 URL을 최적화합니다.
   * @param src 원본 이미지 URL
   * @param width 원하는 너비
   * @param height 원하는 높이
   * @returns 최적화된 이미지 URL
   */
  const optimizeImage = (src: string, width?: number, height?: number): string => {
    // 간단한 이미지 최적화: 쿼리 파라미터 추가
    // 실제 구현에서는 서버 측 이미지 최적화 서비스를 사용해야 합니다.
    if (!width && !height) {
      return src;
    }

    const url = new URL(src, window.location.origin);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', '80'); // 품질 80%

    return url.toString();
  };

  return { optimizeImage };
}