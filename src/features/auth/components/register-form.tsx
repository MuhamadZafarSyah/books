"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { registerByEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
        toast.error(result.error ?? "Unable to start registration.");
        return;
      }

      toast.success("Check your inbox for the verification link.");
      reset();
    });
  }

  return (
    <Card className="w-full max-w-md rounded-3xl border-[#c3c8c1]/40 bg-[#fbf9f4]/80 shadow-xl shadow-[#1b3022]/5 ring-0">
      <CardHeader className="gap-3">
        <CardTitle className="font-heading text-3xl font-semibold tracking-tight text-[#061b0e] sm:text-4xl">
          Begin your journey
        </CardTitle>
        <CardDescription className="text-base leading-7 text-[#434843]">
          Join our community of bibliophiles and start curating your digital
          shelf today.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="ml-1 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#434843]"
            >
              Email address
            </Label>
            <div className="group relative">
              <Mail className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#737973] transition-colors group-focus-within:text-[#061b0e] sm:left-6" />
              <Input
                id="email"
                type="email"
                placeholder="name@library.com"
                autoComplete="email"
                disabled={isPending}
                aria-invalid={Boolean(errors.email)}
                className="h-12 rounded-xl border border-[#c3c8c1] bg-[#f5f3ee] pl-14 pr-5 text-base text-[#1b1c19] shadow-none placeholder:text-[#434843]/40 focus-visible:border-[#061b0e] focus-visible:ring-2 focus-visible:ring-[#061b0e]/10 sm:h-14"
                {...register("email")}
              />
            </div>
            {errors.email ? (
              <p className="ml-1 text-sm font-medium text-[#ba1a1a]">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full rounded-xl bg-[#061b0e] text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-[#1b3022]/10 transition-all hover:bg-[#061b0e]/90 active:scale-[0.99] sm:h-14"
          >
            {isPending ? "Sending link" : "Create account"}
            <ArrowRight className="size-4" />
          </Button>

          <Card
            size="sm"
            className="rounded-lg border border-[#c3c8c1]/30 bg-[#f0eee9] py-0 shadow-none ring-0"
          >
            <CardContent className="flex gap-4 p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-[#061b0e]" />
              <p className="text-[13px] font-medium leading-relaxed text-[#434843]">
                A verification link will be sent to your inbox. Please check
                your spam folder if you don&apos;t see it within a few minutes.
              </p>
            </CardContent>
          </Card>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-5">
        <Separator className="bg-[#c3c8c1]/30" />
        <div className="flex flex-col items-center gap-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#434843] transition-colors hover:text-[#061b0e]"
          >
            <ArrowLeft className="size-4" />
            Back to Login
          </Link>

          <div className="flex flex-wrap justify-center gap-8 text-center">
            <Link
              href="#"
              className="text-xs text-[#434843]/70 underline decoration-[#c3c8c1] underline-offset-4 transition-colors hover:text-[#061b0e]"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-xs text-[#434843]/70 underline decoration-[#c3c8c1] underline-offset-4 transition-colors hover:text-[#061b0e]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
