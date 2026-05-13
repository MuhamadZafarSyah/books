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

const BANNER_ASPECT = 3 / 1;

type BannerCropDialogProps = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
};

export function BannerCropDialog({
  open,
  imageSrc,
  onClose,
  onCropComplete,
}: BannerCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((_: unknown, croppedAreaPx: CropArea) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 1200);
      const previewUrl = URL.createObjectURL(blob);
      onCropComplete(blob, previewUrl);
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-heading text-lg normal-case tracking-tight">
            Sesuaikan Banner
          </DialogTitle>
          <DialogDescription>
            Geser dan zoom untuk menyesuaikan area banner profilmu.
          </DialogDescription>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative h-[280px] w-full bg-black/90 sm:h-[320px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={BANNER_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
            cropShape="rect"
            showGrid={false}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: "2px solid rgba(255,249,240,0.6)",
                borderRadius: "12px",
              },
            }}
          />
        </div>

        {/* Controls */}
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
            Batal
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
            {isProcessing ? "Memproses..." : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
