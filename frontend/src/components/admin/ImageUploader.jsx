import React, { useState, useEffect, useRef } from 'react';
import { uploadsAPI, getErrorMessage, getImageUrl } from '../../services/api';

export default function ImageUploader({
  entityType = 'vehicle', // 'user' | 'vehicle' | 'part'
  entityId,
  currentImageUrl,
  onImageUpdated,
  onImageDeleted,
  label = 'صورة المعاينة'
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl);
  }, [currentImageUrl]);

  const activeImage = previewUrl || currentImageUrl;
  const fullImageUrl = getImageUrl(activeImage);

  useEffect(() => {
    setImgError(false);
  }, [fullImageUrl]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً. يجب أن يكون أقل من 5 ميجابايت.');
      return;
    }

    // Validate type (JPG, PNG, WEBP)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('entityType', entityType);
      if (entityId !== undefined && entityId !== null && entityId !== '') {
        formData.append('entityId', String(entityId));
      }
      formData.append('image', file);

      const res = await uploadsAPI.uploadImage(formData);
      setSuccessMsg('تم رفع وتحديث الصورة بنجاح');
      const returnedUrl = res.imageUrl || res.image_url;
      if (returnedUrl) {
        setPreviewUrl(returnedUrl);
        setImgError(false);
        if (onImageUpdated) {
          onImageUpdated(returnedUrl);
        }
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMsg(getErrorMessage(err, 'تعذر رفع الصورة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!activeImage) return;
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذه الصورة؟')) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDeleting(true);

    try {
      await uploadsAPI.deleteImage({
        imageUrl: activeImage,
        entityType,
        entityId
      });
      setSuccessMsg('تم حذف الصورة بنجاح');
      setPreviewUrl(null);
      setImgError(false);
      if (onImageDeleted) {
        onImageDeleted();
      }
    } catch (err) {
      console.error('Image deletion error:', err);
      setErrorMsg(getErrorMessage(err, 'تعذر حذف الصورة.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      <label className="text-xs font-semibold text-gray-300 block">{label}</label>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Preview Box */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#111720] border border-gray-700/80 flex items-center justify-center group">
          {fullImageUrl && !imgError ? (
            <img
              src={fullImageUrl}
              alt="Preview"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <span className="material-symbols-outlined text-3xl">image</span>
              <span className="text-[10px] mt-1">لا توجد صورة</span>
            </div>
          )}

          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading || isDeleting}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {activeImage ? 'sync' : 'upload'}
            </span>
            {activeImage ? 'تغيير الصورة' : 'رفع صورة'}
          </button>

          {activeImage && (
            <button
              type="button"
              disabled={isUploading || isDeleting}
              onClick={handleDeleteImage}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              حذف الصورة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
