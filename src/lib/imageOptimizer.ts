// 이미지 지연 로딩 및 성능 최적화 유틸리티
export interface ImageOptimizerOptions {
  lazy?: boolean;
  placeholder?: 'blur' | 'color' | 'svg' | 'none';
  quality?: number;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  threshold?: number; // Intersection Observer threshold
  rootMargin?: string; // Intersection Observer root margin
  cache?: boolean;
  maxSize?: number; // 최대 이미지 크기 (KB)
}

export interface OptimizedImage {
  src: string;
  width: number;
  height: number;
  aspectRatio: number;
  optimizedSrc: string;
  placeholder?: string;
  size: number;
}

class ImageOptimizer {
  private cache: Map<string, OptimizedImage> = new Map();
  private observer: IntersectionObserver | null = null;
  private loadedImages: Set<string> = new Set();

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src && !this.loadedImages.has(src)) {
              this.loadImage(src, img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  // 이미지 로드
  async loadImage(
    src: string,
    element?: HTMLImageElement,
    options: ImageOptimizerOptions = {}
  ): Promise<OptimizedImage> {
    const { 
      placeholder = 'blur', 
      quality = 80, 
      width, 
      height,
      cache = true,
      maxSize = 512 // 512KB
    } = options;

    // 캐시 확인
    if (cache && this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = async () => {
        const optimizedImage: OptimizedImage = {
          src,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          optimizedSrc: this.optimizeImage(src, { quality, width, height }),
          size: 0 // 실제 크기는 추후 계산
        };

        // 플레이스홀더 생성
        if (placeholder !== 'none') {
          optimizedImage.placeholder = await this.generatePlaceholder(
            img,
            placeholder,
            { width: width || img.width, height: height || img.height }
          );
        }

        // 실제 이미지 크기 확인 (비동기)
        this.getImageSize(src).then(size => {
          optimizedImage.size = size;
        });

        // 캐시 저장
        if (cache) {
          this.cache.set(src, optimizedImage);
        }

        // DOM 요소에 적용
        if (element && options.lazy !== false) {
          element.src = optimizedImage.optimizedSrc;
          if (optimizedImage.placeholder) {
            element.style.backgroundImage = `url("${optimizedImage.placeholder}")`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
          }
        }

        resolve(optimizedImage);
      };

      img.onerror = (error) => {
        reject(error);
      };

      img.src = src;
    });
  }

  // 이미지 최적화
  private optimizeImage(
    src: string,
    options: { quality?: number; width?: number; height?: number }
  ): string {
    const { quality = 80, width, height } = options;
    
    // Next.js 이미지 최적화 URL 생성
    const params = new URLSearchParams();
    params.append('url', encodeURIComponent(src));
    params.append('q', quality.toString());
    
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    
    return `/api/placeholder?${params.toString()}`;
  }

  // 플레이스홀더 생성
  private async generatePlaceholder(
    img: HTMLImageElement,
    type: 'blur' | 'color' | 'svg',
    dimensions: { width: number; height: number }
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return '';
    }

    const scale = Math.min(32 / dimensions.width, 32 / dimensions.height, 1);
    canvas.width = dimensions.width * scale;
    canvas.height = dimensions.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    switch (type) {
      case 'blur':
        return this.createBlurDataUrl(canvas);
      case 'color':
        return this.createDominantColorDataUrl(canvas);
      case 'svg':
        return this.createSvgPlaceholder(canvas);
      default:
        return '';
    }
  }

  // 블러 플레이스홀더 생성
  private createBlurDataUrl(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  // 지배 색상 플레이스홀더 생성
  private createDominantColorDataUrl(canvas: HTMLCanvasElement): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${canvas.width}' height='${canvas.height}'%3E%3Crect fill='%23${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}'/%3E%3C/svg%3E`;
  }

  // SVG 플레이스홀더 생성
  private createSvgPlaceholder(canvas: HTMLCanvasElement): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${canvas.width}' height='${canvas.height}' viewBox='0 0 ${canvas.width} ${canvas.height}'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3C/svg%3E`;
  }

  // 이미지 실제 크기 확인
  private async getImageSize(url: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('Content-Length');
      return contentLength ? parseInt(contentLength) : 0;
    } catch {
      return 0;
    }
  }

  // 이미지 지연 로딩 설정
  setupLazyLoading(elements: HTMLElement[], options: ImageOptimizerOptions = {}): void {
    elements.forEach(element => {
      const src = element.getAttribute('data-src');
      if (src && this.observer) {
        this.observer.observe(element as HTMLImageElement);
      }
    });
  }

  // 이미지 미리 로드
  async preloadImage(src: string, priority = false): Promise<void> {
    if (priority) {
      // 우선순위 로딩
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = (error) => reject(error);
        img.src = src;
      });
    } else {
      // 일반 로딩
      return this.loadImage(src);
    }
  }

  // 이미지 배치 로드
  async preloadImages(sources: string[], options: { concurrency?: number; priority?: boolean } = {}): Promise<void[]> {
    const { concurrency = 3, priority = false } = options;
    const promises = sources.map(src => () => this.preloadImage(src, priority));
    
    // 배치 처리
    const results: Promise<void>[] = [];
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(p => p()));
      results.push(...batchResults);
    }
    
    return results;
  }

  // 캐시 정리
  clearCache(): void {
    this.cache.clear();
  }

  // 로드된 이미지 정리
  clearLoadedImages(): void {
    this.loadedImages.clear();
  }

  // 캐시 통계
  getCacheStats(): { size: number; count: number } {
    return {
      size: this.cache.size,
      count: this.cache.size
    };
  }

  // 메모리 정리
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clearCache();
    this.clearLoadedImages();
  }
}

// 전역 이미지 최적화 인스턴스
export const imageOptimizer = new ImageOptimizer();

// React 훅 형태
export function useImageOptimizer(src: string, options: ImageOptimizerOptions = {}) {
  const [image, setImage] = useState<OptimizedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        const result = await imageOptimizer.loadImage(src, undefined, options);
        if (mounted) {
          setImage(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src, options]);

  return { image, loading, error };
}

// 이미지 컴포넌트 래퍼
export interface OptimizedImageProps extends ImageOptimizerOptions {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// 실제 React 컴포넌트는 별도 파일에서 정의되어야 함
// 여기서는 타입과 로직만 제공

// 이미지 크기 제한 검사
export function validateImageSize(file: File, maxSizeKB: number = 512): boolean {
  return file.size <= maxSizeKB * 1024;
}

// 이미지 형식 검사
export function validateImageFormat(file: File, allowedFormats: string[] = ['jpeg', 'jpg', 'png', 'webp']): boolean {
  const ext = file.type.split('/')[1]?.toLowerCase();
  return allowedFormats.includes(ext);
}

// 이미지 압축
export async function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      // 크기 조정
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 이미지 URL 생성
export function createImageUrl(
  src: string,
  options: { width?: number; height?: number; quality?: number; format?: string } = {}
): string {
  const { width, height, quality, format } = options;
  const url = new URL(src, window.location.origin);
  
  if (width) url.searchParams.append('w', width.toString());
  if (height) url.searchParams.append('h', height.toString());
  if (quality) url.searchParams.append('q', quality.toString());
  if (format) url.searchParams.append('f', format);
  
  return url.toString();
}