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
  placeholder?: string;
}

const LandingImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = '/landing/placeholder.jpg',
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
      { threshold: 0.1 } // 10%가 보일 때 로드 시작
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
        // Placeholder로 빠르게 로드되는 이미지 또는 배경 표시
        <div className="bg-gray-800 w-full h-full animate-pulse" />
      )}
      
      {/* 로딩 완료 시 실제 이미지 표시 */}
      {isLoaded && isInView ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      )}
    </div>
  );
};

export default LandingImage;