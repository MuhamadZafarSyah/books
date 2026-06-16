"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Circle, Info, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { setPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  setPasswordSchema,
  type SetPasswordFormValues,
} from "@/features/auth/schemas/auth-schemas";

type SetPasswordFormProps = {
  token: string;
};

function RequirementItem({ met, children }: { met: boolean; children: string }) {
  return (
    <li className="flex items-center gap-2.5 text-xs">
      {met ? (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary">
          <Check className="size-2.5 text-primary-foreground" />
        </span>
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {children}
      </span>
    </li>
  );
}

export default function SetPasswordForm({ token }: SetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isValid },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";

  const hasMinimumLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = Boolean(token) && isValid && !isPending;

  function onSubmit(values: SetPasswordFormValues) {
    if (!token) {
      toast.error("Password setup link is missing or invalid.");
      return;
    }

    startTransition(async () => {
      const result = await setPassword(token, values.password);

      if (!result.success) {
        toast.error(result.error ?? "Unable to set password.");
        return;
      }

      reset();
      toast.success("Password set successfully. Please sign in.");
      router.replace("/auth/login");
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
          Set your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Secure your account with a strong password to protect your personal
          library.
        </p>
      </div>

      {/* Form */}
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            New Password
          </Label>
          <PasswordInput
            id="password"
            error={errors.password?.message}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isPending || !token}
            inputClassName="h-11"
            {...register("password")}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirm-password"
            className="text-xs text-muted-foreground"
          >
            Confirm Password
          </Label>
          <PasswordInput
            id="confirm-password"
            error={errors.confirmPassword?.message}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isPending || !token}
            inputClassName="h-11"
            {...register("confirmPassword")}
          />
        </div>

        {/* Password requirements */}
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Password requirements
          </p>
          <ul className="space-y-2.5">
            <RequirementItem met={hasMinimumLength}>
              At least 8 characters long
            </RequirementItem>
            <RequirementItem met={hasNumber || hasSpecial}>
              Include a number or special character
            </RequirementItem>
            <RequirementItem met={passwordsMatch}>
              Password confirmation matches
            </RequirementItem>
          </ul>
        </div>

        {/* Invalid token warning */}
        {!token ? (
          <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-destructive"
            />
            <p className="text-xs leading-relaxed text-destructive">
              This password setup link is missing or invalid. Please request a
              new verification email.
            </p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 h-11 w-full cursor-pointer rounded-xl text-sm font-medium"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <>
              Set Password & Continue
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Footer */}
      {/* <p className="mt-8 text-center text-sm text-muted-foreground">
        Need help?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          Return to login
        </Link>
      </p> */}
    </div>
  );
}
