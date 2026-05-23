import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient background — halaman buku yang tersebar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Halaman melayang — rotasi acak, opacity rendah */}
        {/* <div className="absolute -left-12 top-[15%] h-48 w-36 rotate-[-18deg] rounded-sm bg-primary/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)]" />
        <div className="absolute -right-8 top-[8%] h-52 w-40 rotate-[12deg] rounded-sm bg-primary/[0.03] shadow-[0_1px_3px_rgba(0,0,0,0.02)]" />
        <div className="absolute bottom-[12%] left-[10%] h-44 w-32 rotate-[24deg] rounded-sm bg-primary/[0.04]" />
        <div className="absolute -right-4 bottom-[20%] h-56 w-40 rotate-[-8deg] rounded-sm bg-primary/[0.03]" />
        <div className="absolute left-[40%] top-[5%] h-40 w-28 rotate-[6deg] rounded-sm bg-primary/[0.02]" /> */}
      </div>

      {/* Content */}
      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        {/* Nomor halaman — seperti di buku */}
        <span className="font-heading text-[8rem] font-bold leading-none tracking-tighter text-primary/35 sm:text-[10rem]">
          404
        </span>

        {/* Garis pemisah tipis — seperti separator halaman buku */}
        <div className="mt-2 h-px w-16 bg-border" />

        <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Halaman ini tidak ditemukan
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sepertinya bab yang kamu cari belum ditulis, atau mungkin sudah
          dipindahkan ke rak lain.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="sm" className="cursor-pointer rounded-full px-5">
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Kembali ke beranda
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="cursor-pointer rounded-full px-5 text-muted-foreground"
          >
            <Link href="/dashboard/explore">Jelajahi buku</Link>
          </Button>
        </div>

        {/* Kutipan kecil — sentuhan personal */}
        <blockquote className="mt-12 border-l-2 border-primary/20 pl-4 text-left">
          <p className="font-heading text-xs italic leading-relaxed text-muted-foreground/70">
            &ldquo;Not all those who wander are lost.&rdquo;
          </p>
          <cite className="mt-1 block text-[10px] not-italic text-muted-foreground/50">
            — J.R.R. Tolkien
          </cite>
        </blockquote>
      </div>
    </div>
  );
}
