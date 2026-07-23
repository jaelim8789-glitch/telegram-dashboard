"use client";
import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean; // ?∞ÏÑ† ?úÏúÑ ?¥Î?ÏßÄ (LCP???ÅÌñ•??Ï£ºÎäî Í≤ΩÏö∞)
  placeholder?: 'blur' | 'empty'; // ?åÎ†à?¥Ïä§?Ä???†Ìòï
  blurDataURL?: string; // blur ?åÎ†à?¥Ïä§?Ä???∞Ïù¥??URL
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

  // Intersection ObserverÎ•??¨Ïö©?òÏó¨ Î∑∞Ìè¨?∏Ïóê ÏßÑÏûÖ????Î°úÎìú
  useEffect(() => {
    if (priority) {
      // ?∞ÏÑ† ?úÏúÑ ?¥Î?ÏßÄ??Ï¶âÏãú Î°úÎìú
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
        threshold: 0.01, // 1%?ºÎèÑ Î≥¥Ïù¥Î©?Î°úÎìú ?úÏûë
        rootMargin: '50px' // ÎØ∏Î¶¨ 50px ?ÑÏóê Î°úÎìú ?úÏûë
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

  // ?§Ì????§Ï†ï
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
      {/* ?åÎ†à?¥Ïä§?Ä??*/}
      {placeholder !== 'empty' && (
        <div style={placeholderStyle} />
      )}
      
      {/* ?§Ï†ú ?¥Î?ÏßÄ */}
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
      
      {/* ?§Î•ò ???¥Î∞± */}
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
          <span>?¥Î?ÏßÄ Î°úÎìú ?§Ìå®</span>
        </div>
      )}
    </div>
  );
}

// ?¥Î?ÏßÄ ÏµúÏ†Å????export function useImageOptimizer() {
  /**
   * ?¥Î?ÏßÄ URL??ÏµúÏ†Å?îÌï©?àÎã§.
   * @param src ?êÎ≥∏ ?¥Î?ÏßÄ URL
   * @param width ?êÌïò???àÎπÑ
   * @param height ?êÌïò???íÏù¥
   * @returns ÏµúÏ†Å?îÎêú ?¥Î?ÏßÄ URL
   */
  const optimizeImage = (src: string, width?: number, height?: number): string => {
    // Í∞ÑÎã®???¥Î?ÏßÄ ÏµúÏ†Å?? ÏøºÎ¶¨ ?åÎùºÎØ∏ÌÑ∞ Ï∂îÍ?
    // ?§Ï†ú Íµ¨ÌòÑ?êÏÑú???úÎ≤Ñ Ï∏??¥Î?ÏßÄ ÏµúÏ†Å???úÎπÑ?§Î? ?¨Ïö©?¥Ïïº ?©Îãà??
    if (!width && !height) {
      return src;
    }

    const url = new URL(src, window.location.origin);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', '80'); // ?àÏßà 80%

    return url.toString();
  };

  return { optimizeImage };
}