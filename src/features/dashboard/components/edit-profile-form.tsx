"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AtSign,
  Camera,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";

import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  editProfileSchema,
  type EditProfileFormValues,
} from "@/features/dashboard/schemas/profile-schemas";

type EditableProfileUser = {
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  banner: string | null;
  bio: string | null;
  location: string | null;
};

// ─── Helpers ────────────────────────────────────────────────

async function uploadImageBlob(blob: Blob, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, "image.webp");
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Gagal mengunggah gambar.");
  }

  const result = await response.json();
  return result.url as string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.";
  }
  if (file.size > MAX_SIZE) {
    return "Ukuran file maksimal 5MB.";
  }
  return null;
}

// ─── Component ──────────────────────────────────────────────

export function EditProfileForm({ user }: { user: EditableProfileUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Banner crop state
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerRawSrc, setBannerRawSrc] = useState<string | null>(null);
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      username: user.username ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      image: user.image ?? "",
      banner: user.banner ?? "",
    },
  });

  const watchedBio = useWatch({ control, name: "bio" }) ?? "";

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  // ─── Banner handlers ────────────────────────────────────

  const openBannerCropper = useCallback((file: File) => {
    const error = validateImageFile(file);
    if (error) {
      setBannerError(error);
      return;
    }
    setBannerError(null);
    const url = URL.createObjectURL(file);
    setBannerRawSrc(url);
    setBannerCropOpen(true);
  }, []);

  const handleBannerCropComplete = useCallback(
    (blob: Blob, previewUrl: string) => {
      setBannerBlob(blob);
      setBannerPreviewUrl(previewUrl);
      setBannerCropOpen(false);
      if (bannerRawSrc) URL.revokeObjectURL(bannerRawSrc);
      setBannerRawSrc(null);
    },
    [bannerRawSrc],
  );

  const handleBannerCropClose = useCallback(() => {
    setBannerCropOpen(false);
    if (bannerRawSrc) URL.revokeObjectURL(bannerRawSrc);
    setBannerRawSrc(null);
  }, [bannerRawSrc]);

  const handleBannerRemove = useCallback((onChange: (url: string) => void) => {
    onChange("");
    setBannerBlob(null);
    setBannerPreviewUrl(null);
    setBannerError(null);
  }, []);

  // ─── Form submit ────────────────────────────────────────

  function onSubmit(values: EditProfileFormValues) {
    const pendingBlob = bannerBlob;
    startTransition(async () => {
      try {
        let bannerUrl = values.banner;

        if (pendingBlob) {
          bannerUrl = await uploadImageBlob(pendingBlob, "shelfgram/banners");
          setBannerBlob(null);
        }

        const result = await updateProfile({ ...values, banner: bannerUrl });

        if (!result.success) {
          toast.error(result.error ?? "Profil gagal diperbarui.");
          return;
        }

        toast.success("Profil berhasil diperbarui.");
        router.push("/dashboard/profile");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Terjadi kesalahan.",
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden pt-0! border-border/70 bg-card/95 ">
      <CardContent className="px-5 py-6 sm:px-8">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* ─── Banner Upload (inline, matches profile header) ─── */}
          <div className="space-y-2">
            <Label>Banner profil</Label>
            <Controller
              control={control}
              name="banner"
              render={({ field }) => (
                <>
                  <BannerDropZone
                    value={bannerPreviewUrl ?? field.value}
                    isDragging={isDragging}
                    disabled={isPending}
                    inputRef={bannerInputRef}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (isPending) return;
                      const file = e.dataTransfer.files[0];
                      if (file) openBannerCropper(file);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isPending) setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onInputChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openBannerCropper(file);
                      e.target.value = "";
                    }}
                    onClick={() =>
                      !isPending && bannerInputRef.current?.click()
                    }
                  />

                  {bannerError && (
                    <p className="text-sm font-medium text-destructive">
                      {bannerError}
                    </p>
                  )}

                  {field.value && !isPending && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBannerRemove(field.onChange)}
                      className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" className="size-3" />
                      Hapus banner
                    </Button>
                  )}

                  {/* Crop Dialog */}
                  {bannerRawSrc && (
                    <ImageCropDialog
                      open={bannerCropOpen}
                      imageSrc={bannerRawSrc}
                      onClose={handleBannerCropClose}
                      onCropComplete={(blob, previewUrl) =>
                        handleBannerCropComplete(blob, previewUrl)
                      }
                      title="Sesuaikan Banner"
                      description="Geser dan zoom untuk menyesuaikan area banner profilmu."
                      aspect={3 / 1}
                      cropShape="rect"
                      outputWidth={1200}
                    />
                  )}
                </>
              )}
            />
            {errors.banner && (
              <p className="text-sm font-medium text-destructive">
                {errors.banner.message}
              </p>
            )}
          </div>

          {/* ─── Text fields ─── */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nama tampilan</Label>
              <div className="relative">
                <UserRound className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  autoComplete="name"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.name)}
                  className="pl-7"
                  placeholder="Nama yang ingin ditampilkan"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username publik</Label>
              <div className="relative">
                <AtSign className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.username)}
                  className="pl-7 lowercase"
                  placeholder="contoh: pembaca_senja"
                  {...register("username")}
                />
              </div>
              {errors.username ? (
                <p className="text-sm font-medium text-destructive">
                  {errors.username.message}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Digunakan untuk tautan profil publik kamu.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <div className="relative">
                <MapPin className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  autoComplete="address-level2"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.location)}
                  className="pl-7"
                  placeholder="Jakarta, Indonesia"
                  {...register("location")}
                />
              </div>
              {errors.location && (
                <p className="text-sm font-medium text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="image">URL foto profil</Label>
              <div className="relative">
                <ImageIcon className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="image"
                  type="url"
                  autoComplete="photo"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.image)}
                  className="pl-7"
                  placeholder="https://..."
                  {...register("image")}
                />
              </div>
              {errors.image && (
                <p className="text-sm font-medium text-destructive">
                  {errors.image.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bio">Bio</Label>
                <span className="text-xs text-muted-foreground">
                  {watchedBio.length}/280
                </span>
              </div>
              <Textarea
                id="bio"
                rows={5}
                disabled={isPending}
                aria-invalid={Boolean(errors.bio)}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
                )}
                placeholder="Ceritakan selera bacaan, genre favorit, atau buku yang sedang kamu cari."
                {...register("bio")}
              />
              {errors.bio && (
                <p className="text-sm font-medium text-destructive">
                  {errors.bio.message}
                </p>
              )}
            </div>
          </div>

          {/* ─── Actions ─── */}
          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
            <Button
              asChild
              variant="outline"
              className="rounded-full normal-case tracking-normal"
            >
              <Link href="/dashboard/profile">Batal</Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full normal-case tracking-normal"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {isPending ? "Menyimpan" : "Simpan profil"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Banner Drop Zone (matches profile header layout) ───────

function BannerDropZone({
  value,
  isDragging,
  disabled,
  inputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
  onClick,
}: {
  value: string;
  isDragging: boolean;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
}) {
  const hasBanner = Boolean(value);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload banner profil"
      aria-disabled={disabled}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative h-32 w-full cursor-pointer overflow-hidden  transition-all duration-200 sm:h-40",
        isDragging
          ? "ring-2 ring-primary ring-offset-2"
          : "hover:brightness-90",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {/* Background */}
      {hasBanner ? (
        <Image
          src={value}
          alt="Banner preview"
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          unoptimized={value.startsWith("blob:")}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-accent/30">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptLTItMjJoMnYyaC0yVjhoMnYyaC0ydi0yem0yIDEwdjJoLTEydi0yaDEyem0tMTIgNGgxMnYySDI0di0yem0xMi04SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        </div>
      )}

      {/* Hover overlay */}
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

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
}
