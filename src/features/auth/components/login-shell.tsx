import type { ReactNode } from "react";

type LoginShellProps = {
  children: ReactNode;
};

/**
 * Shell halaman login — split layout.
 *
 * Kiri: panel dekoratif dengan pola buku abstrak dan branding.
 * Kanan: form area bersih tanpa noise.
 *
 * Mobile: panel kiri tersembunyi, form full-width dengan branding inline.
 */
export default function LoginShell({ children }: LoginShellProps) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      {/* Panel dekoratif — hanya desktop */}
      <section
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex xl:p-14"
      >
        {/* Pola abstrak — spine buku vertikal */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-[12%] w-px bg-primary-foreground/10" />
          <div className="absolute inset-y-0 left-[28%] w-[3px] bg-primary-foreground/6" />
          <div className="absolute inset-y-0 left-[44%] w-px bg-primary-foreground/8" />
          <div className="absolute inset-y-0 left-[62%] w-[2px] bg-primary-foreground/5" />
          <div className="absolute inset-y-0 left-[78%] w-px bg-primary-foreground/7" />
          <div className="absolute inset-y-0 left-[91%] w-[2px] bg-primary-foreground/4" />
          {/* Horizontal accent */}
          <div className="absolute inset-x-0 top-[35%] h-px bg-primary-foreground/6" />
          <div className="absolute inset-x-0 top-[68%] h-px bg-primary-foreground/4" />
        </div>

        {/* Branding */}
        <div className="relative z-10">
          <span className="font-heading text-xl italic text-primary-foreground/90">
            Shelfgram
          </span>
        </div>

        {/* Quote */}
        <div className="relative z-10 max-w-sm space-y-4">
          <blockquote className="space-y-3">
            <p className="font-heading text-2xl leading-snug text-primary-foreground/90 xl:text-3xl">
              &ldquo;A reader lives a thousand lives before he dies.&rdquo;
            </p>
            <cite className="block text-sm not-italic text-primary-foreground/50">
              — George R.R. Martin
            </cite>
          </blockquote>
        </div>

        {/* Subtle corner accent */}
        <div className="pointer-events-none absolute bottom-0 right-0 size-64 rounded-tl-full bg-primary-foreground/3" />
      </section>

      {/* Form area */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        {children}
      </section>
    </main>
  );
}
