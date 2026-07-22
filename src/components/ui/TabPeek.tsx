import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { Button } from './Button'; // 버튼 컴포넌트 추가
import { Eye } from 'lucide-react'; // 아이콘 추가

interface TabPeekProps {
  children: React.ReactNode;
  previewContent: React.ReactNode;
  tabName: string;
  className?: string;
}

export function TabPeek({ children, previewContent, tabName, className }: TabPeekProps) {
  const [isPeeking, setIsPeeking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    setIsPeeking(true);
    // 마우스를 뗐을 때 일정 시간 후에 미리보기 종료
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 1000);
  };

  const handleMouseUp = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 500);
  };

  const handleTouchStart = () => {
    setIsPeeking(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 1000);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 500);
  };

  // 클릭 기반 미리보기 토글
  const handleClick = () => {
    setIsPeeking(!isPeeking);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPeeking(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="cursor-pointer"
      >
        {children}
      </div>

      {/* 제스처 대체: 버튼 기반 미리보기 토글 */}
      <div className="mt-1 flex justify-center">
        <Button 
          size="touch" 
          variant="ghost" 
          onClick={handleClick}
          className="p-2"
          aria-label={isPeeking ? `${tabName} 미리보기 닫기` : `${tabName} 미리보기 열기`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {isPeeking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed z-50 w-64 max-h-48 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-2xl",
              "left-1/2 transform -translate-x-1/2 -translate-y-full bottom-full mb-2"
            )}
          >
            <div className="p-3 border-b border-app-border bg-app-surface/50">
              <h3 className="text-sm font-semibold text-app-text">{tabName} 미리보기</h3>
            </div>
            <div className="p-3 max-h-32 overflow-y-auto">
              {previewContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}