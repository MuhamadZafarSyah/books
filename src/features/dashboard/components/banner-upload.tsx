"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BannerCropDialog } from "@/features/dashboard/components/banner-crop-dialog";

type BannerUploadProps = {
  /** Current banner URL (from DB or local preview) */
  value: string;
  /** Called with the preview URL for display */
  onChange: (url: string) => void;
  /** Called with the cropped Blob to be uploaded on form submit */
  onFileReady: (blob: Blob | null) => void;
  disabled?: boolean;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Banner upload component that mirrors the exact profile header layout.
 * - Stores file locally (as Blob) until form submission
 * - Opens a crop dialog with 3:1 aspect ratio
 * - Drag & drop + click to upload
 */
export function BannerUpload({
  value,
  onChange,
  onFileReady,
  disabled,
}: BannerUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.";
    }
    if (file.size > MAX_SIZE) {
      return "Ukuran file maksimal 5MB.";
    }
    return null;
  }, []);

  const openCropperWithFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setRawImageSrc(objectUrl);
      setCropDialogOpen(true);
    },
    [validateFile],
  );

  const handleCropComplete = useCallback(
    (croppedBlob: Blob, previewUrl: string) => {
      // Store the blob locally — will be uploaded on form submit
      onFileReady(croppedBlob);
      onChange(previewUrl);
      setCropDialogOpen(false);
      // Clean up raw image URL
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
    },
    [onChange, onFileReady, rawImageSrc],
  );

  const handleCropClose = useCallback(() => {
    setCropDialogOpen(false);
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
  }, [rawImageSrc]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) openCropperWithFile(file);
    },
    [disabled, openCropperWithFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) openCropperWithFile(file);
      e.target.value = "";
    },
    [openCropperWithFile],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    onFileReady(null);
    setError(null);
  }, [onChange, onFileReady]);

  const hasBanner = Boolean(value);

  return (
    <>
      <div className="space-y-2">
        {/* Banner area — exact same shape as profile header */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload banner profil"
          aria-disabled={disabled}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!disabled) inputRef.current?.click();
            }
          }}
          className={cn(
            "group relative h-32 w-full cursor-pointer overflow-hidden rounded-t-xl transition-all duration-200 sm:h-40",
            isDragging
              ? "ring-2 ring-primary ring-offset-2"
              : "hover:brightness-90",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {/* Background — banner image or gradient fallback */}
          {hasBanner ? (
            <img
              src={value}
              alt="Banner preview"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-accent/30">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptLTItMjJoMnYyaC0yVjhoMnYyaC0ydi0yem0yIDEwdjJoLTEydi0yaDEyem0tMTIgNGgxMnYySDI0di0yem0xMi04SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            </div>
          )}

          {/* Hover overlay with upload hint */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
              hasBanner
                ? "bg-black/30 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                : "bg-black/5",
            )}
          >
            <div className="flex flex-col items-center gap-1.5">
              <Camera
                aria-hidden="true"
                className={cn(
                  "size-6",
                  hasBanner ? "text-white" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  hasBanner ? "text-white" : "text-muted-foreground",
                )}
              >
                {isDragging
                  ? "Lepaskan untuk upload"
                  : hasBanner
                    ? "Ganti banner"
                    : "Klik atau seret gambar"}
              </span>
              {!hasBanner && (
                <span className="text-[10px] text-muted-foreground/70">
                  JPG, PNG, WebP · Maks 5MB
                </span>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
            aria-hidden="true"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        {/* Remove button */}
        {hasBanner && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-3" />
            Hapus banner
          </Button>
        )}
      </div>

      {/* Crop Dialog */}
      {rawImageSrc && (
        <BannerCropDialog
          open={cropDialogOpen}
          imageSrc={rawImageSrc}
          onClose={handleCropClose}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
