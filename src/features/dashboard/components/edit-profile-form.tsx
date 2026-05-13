"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  AtSign,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { updateProfile } from "@/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  bio: string | null;
  location: string | null;
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return email?.[0]?.toUpperCase() ?? "U";
}

export function EditProfileForm({ user }: { user: EditableProfileUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    },
  });

  const watchedName = useWatch({ control, name: "name" }) ?? "";
  const watchedBio = useWatch({ control, name: "bio" }) ?? "";
  const watchedImage = useWatch({ control, name: "image" }) ?? "";

  function onSubmit(values: EditProfileFormValues) {
    startTransition(async () => {
      const result = await updateProfile(values);

      if (!result.success) {
        toast.error(result.error ?? "Profil gagal diperbarui.");
        return;
      }

      toast.success("Profil berhasil diperbarui.");
      router.push("/dashboard/profile");
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-xl shadow-primary/5">
      <CardHeader className="gap-4 border-b border-border/60 bg-linear-to-br from-primary/10 via-card to-accent/20 px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-4 border-card shadow-md sm:size-20">
              {watchedImage ? (
                <AvatarImage src={watchedImage} alt={watchedName || "Avatar"} />
              ) : null}
              <AvatarFallback className="text-lg font-bold">
                {getInitials(watchedName || user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-heading text-xl normal-case tracking-tight sm:text-2xl">
                Edit Profil
              </CardTitle>
              <CardDescription>
                Perbarui identitas publik yang terlihat di Shelfgram.
              </CardDescription>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-fit rounded-full normal-case tracking-normal"
          >
            <Link href="/dashboard/profile">
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Kembali
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-6 sm:px-8">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
              {errors.name ? (
                <p className="text-sm font-medium text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
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
              {errors.location ? (
                <p className="text-sm font-medium text-destructive">
                  {errors.location.message}
                </p>
              ) : null}
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
              {errors.image ? (
                <p className="text-sm font-medium text-destructive">
                  {errors.image.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bio">Bio</Label>
                <span className="text-xs text-muted-foreground">
                  {watchedBio.length}/280
                </span>
              </div>
              <textarea
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
              {errors.bio ? (
                <p className="text-sm font-medium text-destructive">
                  {errors.bio.message}
                </p>
              ) : null}
            </div>
          </div>

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
