"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function BlurImage({
  src, alt, className, wrapperClassName,
  aspectRatio, width, height, priority = false,
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={{ aspectRatio }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-app-card-hover transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          backgroundImage: inView ? `url(${src})` : undefined,
          backgroundSize: "cover",
          filter: "blur(20px) saturate(1.5)",
          transform: "scale(1.1)",
        }}
      />
      {(inView || priority) && (
        <img
          src={src}
          alt={alt}
          loading={priority ? undefined : "lazy"}
          decoding="async"
          width={width}
          height={height}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={cn(
            "relative w-full h-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
}
