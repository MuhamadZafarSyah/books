"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Lock,
  Quote,
  ShieldCheck,
} from "lucide-react";
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

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

type SetPasswordPageProps = {
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

export default function SetPasswordPage({ token }: SetPasswordPageProps) {
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#fbf9f4] text-[#1b1c19]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
        style={{ backgroundImage: noiseBackground }}
      />

      <main className="relative z-10 flex min-h-screen flex-col md:flex-row">
        <section className="hidden min-h-screen overflow-hidden bg-[#1b3022] p-8 text-[#fbf9f4] md:flex md:w-1/2 md:flex-col md:justify-between lg:p-12 xl:p-16">
          <div className="relative z-10">
            <span className="font-heading text-5xl font-semibold italic tracking-tight text-[#f0eee9]">
              Shelfgram
            </span>
          </div>

          <div className="relative z-10 max-w-xl space-y-8">
            <Quote className="size-14 fill-[#f9e0a3]/20 text-[#f9e0a3]" />
            <div className="space-y-6">
              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-[#fbf9f4] lg:text-5xl">
                The beginning of a new chapter requires a secure foundation.
              </h1>
              <blockquote className="border-l-2 border-[#f9e0a3] pl-6 text-lg italic leading-8 text-[#e4e2dd]">
                &quot;A library is not a luxury but one of the necessities of
                life.&quot;
              </blockquote>
              <cite className="block text-xs font-semibold not-italic uppercase tracking-[0.28em] text-[#dcc48a]">
                Henry Ward Beecher
              </cite>
            </div>
          </div>

          <Card className="relative z-10 rounded-3xl border border-[#d0e9d4]/10 bg-[#061b0e]/30 py-0 text-[#e4e2dd] shadow-none ring-0 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <ShieldCheck className="size-5 shrink-0 text-[#f9e0a3]" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e4e2dd]">
                Joined by 12,000+ bibliophiles this month.
              </p>
            </CardContent>
          </Card>

          <div className="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-[#d0e9d4]/5 blur-3xl" />
        </section>

        <section className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10 xl:p-12">
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
                Let&apos;s secure your account with a strong password to protect
                your personal library.
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
                      This password setup link is missing or invalid. Please
                      request a new verification email.
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
        </section>
      </main>
    </div>
  );
}
