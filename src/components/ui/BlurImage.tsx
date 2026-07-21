"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}

export function BlurImage({ src, alt, className, wrapperClassName }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {/* Blur placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-app-card-hover transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          filter: "blur(20px) saturate(1.5)",
          transform: "scale(1.1)",
        }}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}
