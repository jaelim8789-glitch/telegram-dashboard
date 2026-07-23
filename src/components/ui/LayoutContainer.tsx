"use client";
import React, { useState, useEffect, useRef } from 'react';

interface LayoutContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode; // ë¡œë”© ì¤??€ì²?UI
  ssrOnly?: boolean; // SSR ?„ìš© ?¬ë?
  aspectRatio?: string; // ê°€ë¡œì„¸ë¡?ë¹„ìœ¨ (?? "16/9", "1/1")
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

  // ê°€ë¡œì„¸ë¡?ë¹„ìœ¨???„í•œ ?¤í????¤ì •
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

  // SSR ë°?ì´ˆê¸° ?Œë”ë§ì„ ?„í•œ ?Œë ˆ?´ìŠ¤?€??  if (!isMounted && fallback) {
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
  ratio: number; // ?ˆë¹„/?’ì´ ë¹„ìœ¨ (?? 16/9 = 1.77)
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

// ê³ ì •???¬ê¸°??ë°•ìŠ¤ (CLS ë°©ì?)
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