"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { registerByEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/auth-schemas";

export default function RegisterForm() {
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
