import { useState, useEffect } from 'react';
import { getImageUrl } from '../../services/api';

/**
 * Universal Entity Image / Icon Renderer for Cards, Lists, and Modals.
 * Gracefully handles uploaded images with fallback to standard design icons/initials.
 *
 * Props:
 * - src, image, image_url, imageUrl, avatar, avatar_url, avatarUrl: raw image path
 * - type: 'user' | 'vehicle' | 'part' | 'request'
 * - name: entity name for alt text or initials fallback
 * - icon: optional custom material symbol name fallback
 * - className: container CSS classes (defines dimensions, bg, text color, rounded corners)
 * - imgClassName: custom image CSS classes (defaults to "w-full h-full object-cover")
 */
export default function EntityImage({
  src,
  image,
  image_url,
  imageUrl,
  avatar,
  avatar_url,
  avatarUrl,
  type = 'part',
  name = '',
  icon,
  className = 'w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100/60',
  imgClassName = 'w-full h-full object-cover',
  children
}) {
  const [imgError, setImgError] = useState(false);

  const rawPath = src || image_url || image || imageUrl || avatar_url || avatar || avatarUrl;
  const fullUrl = getImageUrl(rawPath);

  useEffect(() => {
    setImgError(false);
  }, [rawPath, fullUrl]);

  const defaultIcons = {
    user: 'person',
    vehicle: 'directions_car',
    part: 'inventory_2',
    request: 'precision_manufacturing'
  };

  const fallbackIcon = icon || defaultIcons[type] || 'inventory_2';

  if (fullUrl && !imgError) {
    return (
      <div className={`overflow-hidden shrink-0 ${className}`}>
        <img
          src={fullUrl}
          alt={name || type}
          onError={() => setImgError(true)}
          className={imgClassName}
        />
      </div>
    );
  }

  // Fallback state: Initials for User, Icon for Assets
  if (type === 'user') {
    const initial = name ? name.trim().charAt(0) : 'م';
    return (
      <div className={`flex items-center justify-center shrink-0 font-bold ${className}`}>
        {children || <span>{initial}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      {children || <span className="material-symbols-outlined">{fallbackIcon}</span>}
    </div>
  );
}
