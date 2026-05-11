import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Handshake,
  LibraryBig,
  MessageCircle,
  Quote,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const noiseBackground =
  "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

const navItems = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#komunitas", label: "Komunitas" },
  { href: "#peminjaman", label: "Peminjaman" },
];

const features = [
  {
    icon: BookOpen,
    title: "Catat perjalanan baca",
    description:
      "Simpan buku sedang dibaca, selesai, dan ingin dibaca dalam rak yang mudah dipindai.",
  },
  {
    icon: MessageCircle,
    title: "Review yang terasa personal",
    description:
      "Bagikan rating, kesan, kutipan, dan catatan tanpa membuat feed terasa terlalu ramai.",
  },
  {
    icon: Users,
    title: "Profil kebiasaan membaca",
    description:
      "Tampilkan genre favorit, statistik bacaan, dan karakter membaca yang membentuk identitasmu.",
  },
  {
    icon: Handshake,
    title: "Koleksi fisik untuk dipinjam",
    description:
      "Tandai buku fisik yang tersedia agar pembaca lain bisa mengajukan peminjaman dengan aman.",
  },
];

const steps = [
  {
    title: "Bangun rak bacaan",
    description:
      "Tambahkan buku digital atau fisik, lalu kelompokkan berdasarkan status baca dan ketersediaan.",
  },
  {
    title: "Bagikan momen membaca",
    description:
      "Tulis review, simpan quote, dan tampilkan progress membaca di feed yang tenang.",
  },
  {
    title: "Terhubung lewat buku",
    description:
      "Temukan pembaca dengan selera serupa dan ajukan peminjaman buku fisik saat tersedia.",
  },
];

const testimonials = [
  {
    name: "Nara",
    role: "Pembaca fiksi sejarah",
    quote:
      "Shelfgram terasa seperti jurnal baca yang hidup. Review teman muncul natural, bukan seperti timeline yang melelahkan.",
  },
  {
    name: "Bima",
    role: "Kolektor buku fisik",
    quote:
      "Saya bisa menampilkan buku yang boleh dipinjam tanpa membuka detail pribadi terlalu cepat.",
  },
  {
    name: "Ayu",
    role: "Book club organizer",
    quote:
      "Profil membaca membantu kami menemukan rekomendasi yang lebih personal untuk diskusi bulanan.",
  },
];

const trustItems = [
  "Status ketersediaan buku selalu jelas",
  "Request peminjaman dikirim sebelum detail lanjutan dibuka",
  "Profil pemilik buku membantu membangun konteks dan kepercayaan",
];

function Page() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.045] dark:opacity-[0.035]"
        style={{ backgroundImage: noiseBackground }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 z-0 size-[42rem] -translate-x-1/2 rounded-full bg-[#d9b98f]/30 blur-3xl dark:bg-[#8fb89e]/10"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-30 rounded-[1.5rem] border border-border/80 bg-card/85 px-4 py-3 shadow-[0_12px_40px_rgba(36,26,18,0.08)] backdrop-blur-md sm:px-5">
          <nav className="flex items-center justify-between gap-4" aria-label="Navigasi utama">
            <Link
              className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              href="/"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(31,77,58,0.18)]">
                <LibraryBig aria-hidden="true" className="size-5" />
              </span>
              <span className="font-heading text-xl font-semibold italic tracking-tight">
                Shelfgram
              </span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <a
                  className="rounded-full text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                className="hidden rounded-full normal-case tracking-normal sm:inline-flex"
                size="sm"
                variant="ghost"
              >
                <Link href="/login">Masuk</Link>
              </Button>
              <Button
                asChild
                className="rounded-full px-5 normal-case tracking-normal shadow-[0_8px_20px_rgba(31,77,58,0.18)]"
                size="sm"
              >
                <Link href="/register">Mulai</Link>
              </Button>
            </div>
          </nav>
        </header>

        <section className="grid min-h-[calc(100dvh-6rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <Bookmark aria-hidden="true" className="size-4 text-[#C98348]" />
              Social reading yang hangat, rapi, dan personal
            </div>
            <h1 className="font-heading text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Rak baca digital untuk pembaca yang ingin terhubung lewat buku.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
              Shelfgram menggabungkan reading log, review, profil kebiasaan membaca,
              dan koleksi buku fisik dalam pengalaman yang terasa seperti ruang baca
              pribadi dengan sentuhan sosial yang tenang.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-2xl px-6 text-base normal-case tracking-normal shadow-[0_12px_30px_rgba(31,77,58,0.2)]"
                size="lg"
              >
                <Link href="/register">
                  Mulai rak bacaan
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 rounded-2xl border-border bg-card/70 px-6 text-base normal-case tracking-normal"
                size="lg"
                variant="outline"
              >
                <a href="#fitur">Lihat fitur</a>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
              {[
                ["4.8/5", "rating review"],
                ["3 rak", "status baca"],
                ["1 komunitas", "selera serupa"],
              ].map(([value, label]) => (
                <div
                  className="rounded-2xl border border-border bg-card/75 p-4 shadow-[0_2px_10px_rgba(36,26,18,0.05)]"
                  key={label}
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[31rem] lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[3rem] bg-[#C98348]/10 blur-2xl dark:bg-[#8fb89e]/10"
            />
            <Card className="relative rounded-[2rem] border border-border bg-card/90 py-0 shadow-[0_24px_80px_rgba(36,26,18,0.14)] ring-0 backdrop-blur">
              <CardContent className="p-4 sm:p-5">
                <div className="rounded-[1.5rem] border border-border bg-background/80 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Feed hari ini
                      </p>
                      <h2 className="mt-1 font-heading text-2xl font-semibold">
                        Pembaca di sekitarmu
                      </h2>
                    </div>
                    <div className="flex -space-x-2" aria-label="Tiga avatar pembaca aktif">
                      {["N", "B", "A"].map((initial) => (
                        <span
                          className="flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground"
                          key={initial}
                        >
                          {initial}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <article className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[0_2px_10px_rgba(36,26,18,0.06)]">
                      <div className="flex gap-4">
                        <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-[#1F4D3A] p-3 shadow-[8px_10px_0_rgba(139,111,78,0.16)]">
                          <div className="h-full rounded-lg border border-[#FFF9F0]/20 bg-linear-to-br from-[#F1E4D2] via-[#C98348] to-[#1F4D3A] p-3 text-[#FFF9F0]">
                            <p className="font-heading text-sm font-semibold leading-tight">
                              Laut Bercerita
                            </p>
                            <div className="mt-12 h-px bg-[#FFF9F0]/50" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Nara</span>
                            <span aria-hidden="true">/</span>
                            <span>baru menulis review</span>
                          </div>
                          <h3 className="mt-2 font-heading text-xl font-semibold leading-snug">
                            Cerita yang membuat sejarah terasa dekat.
                          </h3>
                          <div className="mt-3 flex items-center gap-1 text-[#C98348]">
                            <span className="sr-only">Rating 5 dari 5</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                aria-hidden="true"
                                className="size-4 fill-current"
                                key={star}
                              />
                            ))}
                          </div>
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            Review ini terasa seperti catatan pinggir buku: pelan,
                            personal, tapi tetap mudah ditemukan oleh teman pembaca.
                          </p>
                        </div>
                      </div>
                    </article>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-border bg-card p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#2F7D4F]">
                          <ShieldCheck aria-hidden="true" className="size-4" />
                          Tersedia dipinjam
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Koleksi fisik Bima, kondisi sangat baik.
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-border bg-[#1F4D3A] p-4 text-[#FFF9F0]">
                        <p className="text-sm text-[#FFF9F0]/70">Reading DNA</p>
                        <p className="mt-2 font-heading text-2xl font-semibold">
                          42% sastra
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <section className="relative z-10 border-y border-border/80 bg-card/55 py-16 sm:py-20" id="fitur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F4E]">
              Fitur utama
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Dibuat untuk ritme membaca, bukan sekadar mengejar engagement.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  className="rounded-[1.5rem] border border-border bg-card/85 py-0 shadow-[0_8px_24px_rgba(36,26,18,0.06)] ring-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#C98348]/50 hover:shadow-[0_16px_40px_rgba(36,26,18,0.09)]"
                  key={feature.title}
                >
                  <CardHeader className="gap-4 p-5">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1F4D3A]/10 text-primary dark:bg-primary/15">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-xl font-semibold normal-case tracking-tight">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="mt-3 text-base leading-7">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 sm:py-20" id="cara-kerja">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F4E]">
              Cara kerja
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Dari buku yang dibaca sampai koneksi pembaca baru.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Alurnya sengaja dibuat sederhana agar user bisa mulai dari satu buku,
              lalu tumbuh menjadi profil membaca dan jejaring peminjaman yang rapi.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <article
                className="grid gap-4 rounded-[1.5rem] border border-border bg-card/80 p-5 shadow-[0_2px_10px_rgba(36,26,18,0.05)] sm:grid-cols-[auto_1fr] sm:p-6"
                key={step.title}
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary font-heading text-xl font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden bg-[#1F4D3A] py-16 text-[#FFF9F0] sm:py-20" id="komunitas">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: noiseBackground }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D6B28B]">
                Komunitas tenang
              </p>
              <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                Sosial seperti Instagram, fokus tetap pada buku.
              </h2>
            </div>
            <p className="text-lg leading-8 text-[#FFF9F0]/75">
              Aktivitas pembaca dirancang sebagai feed yang mudah dinikmati: review,
              quote, progress, dan rekomendasi. Metric sosial hadir sebagai dukungan,
              bukan pusat perhatian.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card
                className="rounded-[1.5rem] border border-[#FFF9F0]/15 bg-[#FFF9F0]/10 py-0 text-[#FFF9F0] shadow-none ring-0 backdrop-blur"
                key={testimonial.name}
              >
                <CardContent className="p-6">
                  <Quote aria-hidden="true" className="size-8 text-[#D6B28B]" />
                  <blockquote className="mt-5 text-base leading-7 text-[#FFF9F0]/80">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-[#FFF9F0] text-sm font-bold text-[#1F4D3A]">
                      {testimonial.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-[#FFF9F0]/70">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 sm:py-20" id="peminjaman">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <Card className="rounded-[2rem] border border-border bg-card/85 py-0 shadow-[0_16px_50px_rgba(36,26,18,0.09)] ring-0">
            <CardContent className="p-5 sm:p-7">
              <div className="rounded-[1.5rem] border border-border bg-background/85 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Rak fisik Bima
                    </p>
                    <h3 className="mt-2 font-heading text-3xl font-semibold">
                      18 buku tersedia
                    </h3>
                  </div>
                  <LibraryBig aria-hidden="true" className="size-9 text-primary" />
                </div>

                <div className="mt-8 grid grid-cols-4 gap-3" aria-label="Preview empat buku fisik">
                  {["#1F4D3A", "#8B6F4E", "#C98348", "#2F7D4F"].map(
                    (color, index) => (
                      <div
                        className="aspect-[2/3] rounded-xl border border-[#FFF9F0]/50 p-2 shadow-[6px_8px_0_rgba(36,26,18,0.08)]"
                        key={color}
                        style={{ backgroundColor: color }}
                      >
                        <div className="h-full rounded-lg border border-[#FFF9F0]/25" />
                        <span className="sr-only">Buku fisik nomor {index + 1}</span>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-7 rounded-2xl bg-[#F1E4D2] p-4 dark:bg-[#2C2117]">
                  <p className="text-sm font-semibold text-foreground">
                    Permintaan pinjam sebelum detail lanjutan
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Shelfgram menjaga koneksi tetap aman dengan menampilkan status,
                    kondisi, dan konteks pemilik sebelum proses peminjaman berlanjut.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F4E]">
              Peminjaman buku
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Koleksi fisik jadi jembatan koneksi antar pembaca.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              User dapat menampilkan buku fisik yang dimiliki, mengatur status
              ketersediaan, dan membuka peluang peminjaman tanpa membuat pengalaman
              terasa seperti marketplace.
            </p>
            <ul className="mt-7 grid gap-3">
              {trustItems.map((item) => (
                <li className="flex gap-3 text-base leading-7 text-muted-foreground" key={item}>
                  <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#2F7D4F]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_20px_70px_rgba(36,26,18,0.12)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F4E]">
                Siap membangun Shelfgram?
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Mulai dari satu buku, lalu biarkan profil membacamu tumbuh.
              </h2>
            </div>
            <Button
              asChild
              className="h-12 rounded-2xl px-6 text-base normal-case tracking-normal shadow-[0_12px_30px_rgba(31,77,58,0.2)]"
              size="lg"
            >
              <Link href="/register">
                Daftar sekarang
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Page;
