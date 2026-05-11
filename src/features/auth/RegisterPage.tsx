"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Mail, Quote } from "lucide-react";
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

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

const readingScene =
  "https://lh3.googleusercontent.com/aida-public/AB6AXA0a994KrM2mjLwn1Oh3PqqvkZTNRCQG_wqgt8NX6hLdSt9oIjX_2Cj-oMYJ-gthGd-cMooUttxqPoN3-0WHkn-uSDuAICtABcCybLxT9SDiM0_s5PSquMoj8CGA2O_znxXHQnmVGZL4axNdKFUkLpPL5EhlXyuww8YM-tsbzkufbCd41QcW2Ys4J_xbxFowIP3nzkPJ_ATOqk-TFDZVDVbAo8FXDa2EhJgcpvURo0Kf8dLHKQHeY6cajjcdYVY2LxV19IIooPuWZg";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await registerByEmail(email);

      if (!result.success) {
        toast.error(result.error ?? "Unable to start registration.");
        return;
      }

      toast.success("Check your inbox for the verification link.");
      setEmail("");
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf9f4] text-[#1b1c19]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
        style={{ backgroundImage: noiseBackground }}
      />

      <main className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="relative flex min-h-[34rem] w-full flex-col justify-between overflow-hidden bg-[#1b3022] p-6 text-[#d0e9d4] sm:min-h-[42rem] sm:p-8 lg:min-h-screen lg:w-3/5 lg:p-16 xl:p-20">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-96 rounded-full bg-[#061b0e]/40 blur-[120px]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: noiseBackground }}
          />

          <header className="relative z-10">
            <h1 className="font-heading text-4xl font-semibold italic tracking-tight text-[#d0e9d4] sm:text-5xl">
              Shelfgram
            </h1>
            <div className="mt-2 h-px w-12 bg-[#b4cdb8]" />
          </header>

          <div className="relative z-10 my-10 space-y-8 sm:my-12 sm:space-y-12 lg:my-16 xl:my-20">
            <div className="max-w-lg">
              <Quote className="mb-5 size-12 fill-[#b4cdb8]/20 text-[#b4cdb8]/50 sm:mb-6 sm:size-14" />
              <blockquote className="font-heading text-2xl font-semibold italic leading-tight text-[#d0e9d4] sm:text-3xl lg:text-4xl">
                &quot;A room without books is like a body without a soul.&quot;
              </blockquote>
              <cite className="mt-5 block text-xs font-semibold not-italic uppercase tracking-[0.24em] text-[#819986] sm:mt-6 sm:tracking-[0.28em]">
                Marcus Tullius Cicero
              </cite>
            </div>

            <Card className="group relative aspect-[4/3] max-w-2xl rounded-3xl border-0 bg-transparent p-0 shadow-2xl shadow-[#061b0e]/40 ring-0">
              <CardContent className="relative h-full overflow-hidden rounded-3xl p-0">
                <div
                  aria-label="Reading journal scene"
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${readingScene})` }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#1b3022]/75 via-transparent to-transparent" />
                <Card
                  size="sm"
                  className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[#d0e9d4]/15 bg-[#061b0e]/35 py-0 text-[#d0e9d4] shadow-none ring-0 backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-6"
                >
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-sm leading-6 text-[#d0e9d4]/80">
                      A quiet space to collect notes, shelves, and shared
                      passages.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          <footer className="relative z-10 text-xs font-semibold uppercase leading-6 tracking-[0.16em] text-[#819986] sm:tracking-[0.18em]">
            Curating the world&apos;s finest private libraries.
          </footer>
        </section>

        <section className="flex w-full items-center justify-center bg-[#fbf9f4] p-6 sm:p-8 md:p-12 lg:w-2/5 lg:p-14 xl:p-20">
          <Card className="w-full max-w-md border-0 bg-transparent p-0 shadow-none ring-0">
            <CardHeader className="space-y-4 px-0 pb-12">
              <CardTitle className="font-heading text-3xl font-semibold tracking-tight text-[#061b0e] sm:text-4xl">
                Begin your journey
              </CardTitle>
              <CardDescription className="text-base leading-7 text-[#434843]">
                Join our community of bibliophiles and start curating your
                digital shelf today.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <form className="space-y-8 sm:space-y-10" onSubmit={handleSubmit}>
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
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@library.com"
                      autoComplete="email"
                      disabled={isPending}
                      className="h-14 rounded-xl border border-[#c3c8c1] bg-[#f5f3ee] py-5 pl-14 pr-5 text-base text-[#1b1c19] shadow-none placeholder:text-[#434843]/40 focus-visible:border-[#061b0e] focus-visible:ring-2 focus-visible:ring-[#061b0e]/10 sm:h-16 sm:py-6 sm:pl-16 sm:pr-6"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-14 w-full rounded-xl bg-[#061b0e] text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-[#1b3022]/10 transition-all hover:scale-[1.01] hover:bg-[#061b0e]/90 active:scale-[0.99] sm:h-16"
                >
                  {isPending ? "Sending link" : "Create account"}
                  <ArrowRight className="size-4" />
                </Button>

                <Card
                  size="sm"
                  className="rounded-lg border border-[#c3c8c1]/30 bg-[#f0eee9] py-0 shadow-none ring-0"
                >
                  <CardContent className="flex gap-4 p-5 sm:p-6">
                    <Info className="mt-0.5 size-5 shrink-0 text-[#061b0e]" />
                    <p className="text-[13px] font-medium leading-relaxed text-[#434843]">
                      A verification link will be sent to your inbox. Please
                      check your spam folder if you don&apos;t see it within a few
                      minutes.
                    </p>
                  </CardContent>
                </Card>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col px-0 pt-14 sm:pt-20">
              <Separator className="mb-8 bg-[#c3c8c1]/30" />
              <div className="flex flex-col items-center gap-6 text-center">
                <Link
                  href="/auth"
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
        </section>
      </main>
    </div>
  );
}

export default RegisterPage;
