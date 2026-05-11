import type { ReactNode } from "react";
import { Quote, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

type SetPasswordShellProps = {
  children: ReactNode;
};

export default function SetPasswordShell({ children }: SetPasswordShellProps) {
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
                &quot;A library is not a luxury but one of the necessities of life.&quot;
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
          {children}
        </section>
      </main>
    </div>
  );
}
