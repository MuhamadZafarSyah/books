import type { ReactNode } from "react";

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

const readingCornerImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuANT1Vw7l_nFCWLjBoauUol2cB6ZnDAvVxQ_dBpzkZEqBqhCiqbGzJIdiRGkEtu160cuApO-96zB5nVdxooERUrctnVoTKcu512NKUrdEc8-Z1keewKPfIbiI3z1k_yZPsA5k5FPdao4TkTRDvN4vY4ELsh2MRtayUiPBf9SANcqz3ZpG2sLLKLF4L7per4StTPh6vmUGv4R82sZcaRmV7zKq5KYHbpNsbep_-YBiu38U22qjUrN1cHjvxOrSUdAjD9AY2tXgZm-3s";

type LoginShellProps = {
  children: ReactNode;
};

export default function LoginShell({ children }: LoginShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
        style={{ backgroundImage: noiseBackground }}
      />

      <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-muted/40 lg:flex">
          <div className="absolute inset-0">
            <div
              aria-label="Cozy reading corner"
              className="h-full w-full bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${readingCornerImage})` }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/30 to-primary/10 mix-blend-multiply" />
          </div>

          <div className="relative z-10 flex h-full flex-col px-12 py-14 text-primary-foreground xl:px-16 xl:py-16">
            <div className="text-2xl font-heading italic tracking-wide">
              Shelfgram
            </div>

            <div className="mt-auto max-w-xl space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-2 h-16 w-1 bg-secondary" />
                <h1 className="font-heading text-4xl italic leading-tight xl:text-5xl">
                  &quot;A room without books is like a body without a soul.&quot;
                </h1>
              </div>
              <p className="text-base text-primary-foreground/80">
                Welcome to a modern reading universe. Join our community of
                curators and bibliophiles.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
          {children}
        </section>
      </main>
    </div>
  );
}
