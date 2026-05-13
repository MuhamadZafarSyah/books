"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImageBlob, type CropArea } from "@/lib/crop-image";

export type ImageCropDialogProps = {
  /** Whether the dialog is open */
  open: boolean;
  /** Source image URL (object URL or remote) */
  imageSrc: string;
  /** Close handler */
  onClose: () => void;
  /** Called with the cropped Blob and a preview object URL */
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Crop aspect ratio (e.g. 3/1 for banner, 1 for avatar) */
  aspect?: number;
  /** Crop shape: "rect" or "round" */
  cropShape?: "rect" | "round";
  /** Output width in pixels (default: 1200) */
  outputWidth?: number;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Whether to show grid lines on the crop area */
  showGrid?: boolean;
};

export function ImageCropDialog({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  title = "Sesuaikan Gambar",
  description = "Geser dan zoom untuk menyesuaikan area gambar.",
  aspect = 1,
  cropShape = "rect",
  outputWidth = 1200,
  confirmLabel = "Terapkan",
  cancelLabel = "Batal",
  showGrid = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback(
    (_: unknown, croppedAreaPx: CropArea) => {
      setCroppedAreaPixels(croppedAreaPx);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
      );
      const previewUrl = URL.createObjectURL(blob);
      onCropComplete(blob, previewUrl);
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, outputWidth, onCropComplete]);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const borderRadius = cropShape === "round" ? "50%" : "12px";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-heading text-lg normal-case tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative h-[280px] w-full bg-black/90 sm:h-[320px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            cropShape={cropShape}
            showGrid={showGrid}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: "2px solid rgba(255,249,240,0.6)",
                borderRadius,
              },
            }}
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              aria-label="Zoom out"
              className="cursor-pointer"
            >
              <ZoomOut aria-hidden="true" className="size-4" />
            </Button>

            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-secondary accent-primary sm:w-32"
              aria-label="Zoom level"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              aria-label="Zoom in"
              className="cursor-pointer"
            >
              <ZoomIn aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            Reset
          </Button>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="cursor-pointer rounded-full"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="cursor-pointer rounded-full"
          >
            {isProcessing ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            {isProcessing ? "Memproses..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
