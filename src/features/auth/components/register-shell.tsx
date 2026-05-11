import type { ReactNode } from "react";
import { Quote } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

const readingScene =
  "https://lh3.googleusercontent.com/aida-public/AB6AXA0a994KrM2mjLwn1Oh3PqqvkZTNRCQG_wqgt8NX6hLdSt9oIjX_2Cj-oMYJ-gthGd-cMooUttxqPoN3-0WHkn-uSDuAICtABcCybLxT9SDiM0_s5PSquMoj8CGA2O_znxXHQnmVGZL4axNdKFUkLpPL5EhlXyuww8YM-tsbzkufbCd41QcW2Ys4J_xbxFowIP3nzkPJ_ATOqk-TFDZVDVbAo8FXDa2EhJgcpvURo0Kf8dLHKQHeY6cajjcdYVY2LxV19IIooPuWZg";

type RegisterShellProps = {
  children: ReactNode;
};

export default function RegisterShell({ children }: RegisterShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#fbf9f4] text-[#1b1c19]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
        style={{ backgroundImage: noiseBackground }}
      />

      <main className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="relative flex min-h-128 w-full flex-col justify-between overflow-hidden bg-[#1b3022] p-5 text-[#d0e9d4] sm:min-h-152 sm:p-6 lg:min-h-screen lg:w-3/5 lg:p-12 xl:p-16">
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

          <div className="relative z-10 my-8 space-y-6 sm:my-10 sm:space-y-8 lg:my-12">
            <div className="max-w-lg">
              <Quote className="mb-5 size-12 fill-[#b4cdb8]/20 text-[#b4cdb8]/50 sm:mb-6 sm:size-14" />
              <blockquote className="font-heading text-2xl font-semibold italic leading-tight text-[#d0e9d4] sm:text-3xl lg:text-4xl">
                &quot;A room without books is like a body without a soul.&quot;
              </blockquote>
              <cite className="mt-5 block text-xs font-semibold not-italic uppercase tracking-[0.24em] text-[#819986] sm:mt-6 sm:tracking-[0.28em]">
                Marcus Tullius Cicero
              </cite>
            </div>

            <Card className="group relative aspect-4/3 max-w-2xl rounded-3xl border-0 bg-transparent p-0 shadow-2xl shadow-[#061b0e]/40 ring-0">
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
                  <CardContent className="p-4">
                    <p className="text-sm leading-6 text-[#d0e9d4]/80">
                      A quiet space to collect notes, shelves, and shared passages.
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

        <section className="flex w-full items-center justify-center bg-[#fbf9f4] p-4 sm:p-6 lg:w-2/5 lg:p-10 xl:p-12">
          {children}
        </section>
      </main>
    </div>
  );
}
