'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface LandingImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

const LandingImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: LandingImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // 10%ê°€ ë³´ì¼ ??ë¡œë“œ ?œì‘
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isInView ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          priority={priority}
          onLoad={() => setIsLoaded(true)}
          unoptimized={false}
        />
      ) : (
        // Placeholderë¡?ë¹ ë¥´ê²?ë¡œë“œ?˜ëŠ” ?´ë?ì§€ ?ëŠ” ë°°ê²½ ?œì‹œ
        <div className="bg-gray-800 w-full h-full animate-pulse" />
      )}
      
      {/* ë¡œë”© ?„ë£Œ ???¤ì œ ?´ë?ì§€ ?œì‹œ */}
      {isLoaded && isInView ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      )}
    </div>
  );
};

export default LandingImage;
