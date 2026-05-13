import { useState, useCallback } from "react";

type UploadState = {
  isUploading: boolean;
  progress: number;
  error: string | null;
};

type UploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

type UseFileUploadOptions = {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
};

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    folder = "shelfgram/banners",
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.";
      }
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        return `Ukuran file maksimal ${maxMB}MB.`;
      }
      return null;
    },
    [allowedTypes, maxSize],
  );

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        setState({ isUploading: false, progress: 0, error: validationError });
        onError?.(validationError);
        return null;
      }

      setState({ isUploading: true, progress: 10, error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        setState((prev) => ({ ...prev, progress: 40 }));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setState((prev) => ({ ...prev, progress: 80 }));

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.error ?? "Gagal mengunggah gambar.";
          setState({ isUploading: false, progress: 0, error: errorMsg });
          onError?.(errorMsg);
          return null;
        }

        const result: UploadResult = await response.json();
        setState({ isUploading: false, progress: 100, error: null });
        onSuccess?.(result);
        return result;
      } catch {
        const errorMsg = "Koneksi gagal. Coba lagi.";
        setState({ isUploading: false, progress: 0, error: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [folder, validateFile, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset, validateFile };
}
