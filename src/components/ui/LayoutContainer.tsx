import React, { useState, useEffect, useRef } from 'react';

interface LayoutContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode; // 로딩 중 대체 UI
  ssrOnly?: boolean; // SSR 전용 여부
  aspectRatio?: string; // 가로세로 비율 (예: "16/9", "1/1")
}

export function LayoutContainer({ 
  children, 
  className = '', 
  style = {},
  fallback,
  ssrOnly = false,
  aspectRatio 
}: LayoutContainerProps) {
  const [isMounted, setIsMounted] = useState(ssrOnly);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ssrOnly) {
      setIsMounted(true);
    }
  }, [ssrOnly]);

  // 가로세로 비율을 위한 스타일 설정
  const containerStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio && {
      position: 'relative',
      width: '100%',
      paddingBottom: `calc(100% / (${aspectRatio}))`
    })
  };

  const contentStyle: React.CSSProperties = {
    ...(aspectRatio && {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    })
  };

  // SSR 및 초기 렌더링을 위한 플레이스홀더
  if (!isMounted && fallback) {
    return <div className={className} style={containerStyle}>{fallback}</div>;
  }

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={containerStyle}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

interface AspectRatioBoxProps {
  ratio: number; // 너비/높이 비율 (예: 16/9 = 1.77)
  children: React.ReactNode;
  className?: string;
}

export function AspectRatioBox({ ratio, children, className }: AspectRatioBoxProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const height = containerWidth / ratio;

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: `${height}px`,
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {children}
      </div>
    </div>
  );
}

// 고정된 크기의 박스 (CLS 방지)
interface FixedSizeBoxProps {
  width: number | string;
  height: number | string;
  children: React.ReactNode;
  className?: string;
}

export function FixedSizeBox({ width, height, children, className }: FixedSizeBoxProps) {
  return (
    <div 
      className={className}
      style={{ 
        width, 
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
}