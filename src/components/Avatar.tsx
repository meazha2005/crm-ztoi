'use client';

import React, { useState, useEffect } from 'react';
import { getAvatarUrl } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const sizeClassMap = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-7 h-7 text-[10px]',
  lg: 'w-8 h-8 text-xs',
  xl: 'w-20 h-20 text-2xl',
};

export function Avatar({
  src,
  name,
  size = 'sm',
  className = '',
  ring = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  const url = !hasError ? getAvatarUrl(src) : '';
  const sizeClasses = sizeClassMap[size] || sizeClassMap.sm;
  const ringClass = ring ? 'ring-2 ring-white' : '';

  return (
    <div
      className={`rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold shrink-0 relative overflow-hidden select-none ${sizeClasses} ${ringClass} ${className}`}
      title={name || undefined}
    >
      <span className="leading-none">{initial}</span>
      {url ? (
        <img
          src={url}
          alt={name || ''}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : null}
    </div>
  );
}
