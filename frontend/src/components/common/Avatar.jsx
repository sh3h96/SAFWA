import { useState, useEffect } from 'react';
import { getImageUrl } from '../../services/api';

/**
 * Avatar — Reusable user avatar component.
 * Supports image or initials fallback.
 *
 * Props:
 * - src: image url (string, optional)
 * - name: user name for alt text (string)
 * - initials: fallback initials (string)
 * - size: 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 */
export default function Avatar({ src, avatar, avatarUrl, avatar_url, image_url, imageUrl, name, initials, size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const rawSrc = src || avatar_url || avatarUrl || avatar || image_url || imageUrl;
  const fullSrc = getImageUrl(rawSrc);

  useEffect(() => {
    setImgError(false);
  }, [rawSrc, fullSrc]);

  return (
    <div 
      className={`${currentSize} rounded-full bg-slate-200 border border-outline-variant overflow-hidden flex items-center justify-center shrink-0`}
      title={name}
    >
      {fullSrc && !imgError ? (
        <img
          src={fullSrc}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-inverse-surface">
          {initials || (name ? name.charAt(0) : 'م')}
        </span>
      )}
    </div>
  );
}
