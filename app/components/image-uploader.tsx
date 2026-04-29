import { useState, useCallback, useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';

interface ImageUploaderProps {
  endpoint: string;
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  aspectRatio?: 'square' | 'banner';
}


const MAX_FILE_SIZE = '4MB';

export function ImageUploader({
  endpoint,
  currentImageUrl,
  onUploadComplete,
  onRemove,
  className = '',
  aspectRatio = 'square',
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/upload?endpoint=${endpoint}`, {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || '업로드에 실패했습니다.');
        }

        onUploadComplete(data.url);
        setPreviewUrl(data.url);
      } catch (err: any) {
        setError(err.message || '업로드에 실패했습니다.');
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [endpoint, onUploadComplete]
  );

  const handleFileChange = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      uploadFile(file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      handleFileChange(event.dataTransfer.files);
    },
    [handleFileChange]
  );





  const displayUrl = previewUrl || currentImageUrl;
  const isBanner = aspectRatio === 'banner';

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />

      <div
        onClick={() => !displayUrl && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${isBanner ? 'w-full h-40 rounded-[24px]' : 'w-full aspect-square rounded-[32px]'} ${displayUrl ? 'bg-transparent' : 'bg-[#EDE9FE] border-2 border-dashed border-[#7C3AED]/30 hover:border-[#7C3AED]/60 hover:bg-[#E8E0FF]'}`}
      >
        {displayUrl && (
          <>
            <img
              src={displayUrl}
              alt=""
              className={`w-full h-full object-cover ${isBanner ? 'rounded-[24px]' : 'rounded-[32px]'}`}
            />
            <div className={`absolute inset-0 ${isBanner ? 'rounded-[24px]' : 'rounded-[32px]'} bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <Camera className="h-5 w-5 text-[#332F3A]" />
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl(null);
                    onRemove();
                  }}
                  className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
                >
                  <X className="h-5 w-5 text-[#332F3A]" />
                </button>
              )}
            </div>
          </>
        )}
        {!displayUrl && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="p-4 bg-[#7C3AED]/10 rounded-full">
              <Upload className="h-8 w-8 text-[#7C3AED]" />
            </div>
            <p className="text-sm text-[#635F69] text-center px-4">
              이미지를 드래그하거나 클릭하세요
            </p>
            <p className="text-xs text-[#7C3AED]/60">JPG, PNG, WebP • 최대 {MAX_FILE_SIZE}</p>
          </div>
        )}
      </div>

      {isUploading && (
        <div className={`absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 ${isBanner ? 'rounded-[24px]' : 'rounded-[32px]'}`}>
          <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#332F3A] font-medium">업로드 중...</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}