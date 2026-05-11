"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { setPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import {
  setPasswordSchema,
  type SetPasswordFormValues,
} from "@/features/auth/schemas/auth-schemas";

type SetPasswordFormProps = {
  token: string;
};

function RequirementItem({ met, children }: { met: boolean; children: string }) {
  const Icon = met ? CheckCircle2 : Circle;

  return (
    <li
      className={
        met
          ? "flex items-center gap-3 text-xs font-semibold text-[#434843]"
          : "flex items-center gap-3 text-xs font-semibold text-[#434843]/55"
      }
    >
      <Icon
        className={
          met ? "size-4 text-[#061b0e]" : "size-4 text-[#737973]/70"
        }
        fill={met ? "currentColor" : "none"}
      />
      {children}
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
      router.replace("/auth");
    });
  }

  return (
    <Card className="w-full max-w-md rounded-3xl border-[#c3c8c1]/40 bg-[#fbf9f4]/80 shadow-xl shadow-[#1b3022]/5 ring-0">
      <CardHeader className="gap-3">
        <div className="mb-4 md:hidden">
          <span className="font-heading text-3xl font-semibold italic tracking-tight text-[#061b0e]">
            Shelfgram
          </span>
        </div>
        <CardTitle className="font-heading text-3xl font-semibold tracking-tight text-[#061b0e] sm:text-4xl">
          Welcome back
        </CardTitle>
        <CardDescription className="text-base leading-7 text-[#434843]">
          Let&apos;s secure your account with a strong password to protect your
          personal library.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <PasswordInput
            id="password"
            label="New Password"
            error={errors.password?.message}
            labelClassName="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#061b0e]"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isPending || !token}
            inputClassName="h-12 rounded-xl border border-[#c3c8c1] bg-[#fbf9f4] pl-4 pr-12 text-base text-[#1b1c19] shadow-none placeholder:text-[#434843]/35 focus-visible:border-[#061b0e] focus-visible:ring-2 focus-visible:ring-[#061b0e]/10 sm:h-14"
            {...register("password")}
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm Password"
            error={errors.confirmPassword?.message}
            labelClassName="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#061b0e]"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isPending || !token}
            inputClassName="h-12 rounded-xl border border-[#c3c8c1] bg-[#fbf9f4] pl-4 pr-12 text-base text-[#1b1c19] shadow-none placeholder:text-[#434843]/35 focus-visible:border-[#061b0e] focus-visible:ring-2 focus-visible:ring-[#061b0e]/10 sm:h-14"
            {...register("confirmPassword")}
          />

          <Card className="rounded-xl border-0 bg-[#f0eee9] py-0 shadow-none ring-0">
            <CardContent className="space-y-4 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#434843]">
                Password Requirements
              </p>
              <ul className="space-y-3">
                <RequirementItem met={hasMinimumLength}>
                  At least 8 characters long
                </RequirementItem>
                <RequirementItem met={passwordsMatch}>
                  Password confirmation matches
                </RequirementItem>
                <RequirementItem met={hasNumber || hasSpecial}>
                  Include a number or special character
                </RequirementItem>
              </ul>
            </CardContent>
          </Card>

          {!token ? (
            <Card className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6] py-0 text-[#93000a] shadow-none ring-0">
              <CardContent className="p-4 text-sm leading-6">
                This password setup link is missing or invalid. Please request a
                new verification email.
              </CardContent>
            </Card>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-full bg-[#061b0e] text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md shadow-[#1b3022]/10 transition-all hover:bg-[#1b3022] active:scale-[0.98] sm:h-14"
          >
            {isPending ? "Setting Password" : "Set Password & Continue"}
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm leading-6 text-[#434843]">
            Need help?{" "}
            <Link
              href="/auth"
              className="font-semibold text-[#6e5c2c] underline-offset-4 hover:underline"
            >
              Return to login
            </Link>
          </p>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-5">
        <Separator className="bg-[#c3c8c1]" />
        <div className="flex w-full flex-col gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#434843] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4 text-[#6e5c2c]" />
            End-to-end encryption active
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#6e5c2c]" />
            Server status: secure
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
