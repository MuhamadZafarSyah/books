"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginWithGoogle, registerByEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/auth-schemas";
import { Separator } from "@/components/ui/separator";

export default function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: RegisterFormValues) {
    startTransition(async () => {
      const result = await registerByEmail(values.email);

      if (!result.success) {
        toast.error(result.error ?? "Gagal memulai pendaftaran.");
        return;
      }

      toast.success("Cek inbox email kamu untuk link verifikasi.");
      reset();
    });
  }

  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Mobile branding */}
      <div className="mb-10 lg:hidden">
        <span className="font-heading text-xl italic text-primary">
          Shelfgram
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Buat akun
        </h1>
        <p className="text-sm text-muted-foreground">
          Mulai perjalanan membaca bersama komunitas Shelfgram.
        </p>
      </div>

      <div className="mt-8">
        <form action={loginWithGoogle}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
            className="h-11 w-full cursor-pointer gap-3 rounded-xl text-sm font-medium"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.81 15.72 17.59V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z"
                fill="#4285F4"
              />
              <path
                d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.59C14.73 18.25 13.48 18.66 12 18.66C9.13 18.66 6.7 16.73 5.82 14.14H2.15V16.99C3.96 20.59 7.69 23 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.82 14.14C5.59 13.48 5.46 12.76 5.46 12C5.46 11.24 5.59 10.52 5.82 9.86V7.01H2.15C1.4 8.51 1 10.21 1 12C1 13.79 1.4 15.49 2.15 16.99L5.82 14.14Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.34C13.62 5.34 15.06 5.89 16.2 6.98L19.36 3.82C17.45 2.03 14.97 1 12 1C7.69 1 3.96 3.41 2.15 7.01L5.82 9.86C6.7 7.27 9.13 5.34 12 5.34Z"
                fill="#EA4335"
              />
            </svg>
            Lanjutkan dengan Google
          </Button>
        </form>
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[11px] text-muted-foreground">atau</span>
        <Separator className="flex-1" />
      </div>


      {/* Form */}
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@email.com"
            autoComplete="email"
            disabled={isPending}
            aria-invalid={Boolean(errors.email)}
            className="h-11"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="mt-2 h-11 w-full cursor-pointer rounded-xl text-sm font-medium"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <>
              Buat akun
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Info hint */}
      <div className="mt-5 flex gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Link verifikasi akan dikirim ke email kamu. Cek folder spam jika
          tidak muncul dalam beberapa menit.
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
