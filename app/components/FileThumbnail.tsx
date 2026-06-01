'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import { apiService } from '@/app/services/apiService';

interface FileThumbnailProps {
  fileId: number;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

export default function FileThumbnail({
  fileId,
  alt = '',
  className = 'rounded-lg',
  iconClassName = 'w-8 h-8',
}: FileThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    apiService.getThumbnail(fileId).then((url) => {
      objectUrl = url;
      if (isMounted) setSrc(url);
    });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-700/30 ${className}`}>
        <ImageIcon className={`${iconClassName} text-slate-600`} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <NextImage src={src} alt={alt} fill className={`object-cover ${className}`} unoptimized />
    </div>
  );
}
