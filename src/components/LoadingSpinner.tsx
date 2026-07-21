'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = '로드 중...', 
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinnerClass = `
    animate-spin 
    rounded-full 
    border-2 
    border-solid 
    border-current 
    border-e-transparent
    align-[-0.125em]
    motion-reduce:animate-[spin_1.5s_linear_infinite]
    ${sizeClasses[size]}
  `;

  const containerClass = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white/80 z-50'
    : 'flex flex-col items-center justify-center';

  return (
    <div className={containerClass}>
      <div className={spinnerClass} role="status">
        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
          로드 중...
        </span>
      </div>
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;