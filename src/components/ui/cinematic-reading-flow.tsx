"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Handshake, MessageCircle, Star } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

const steps = [
  {
    icon: BookOpen,
    eyebrow: "01 Catat",
    title: "Simpan bacaan.",
    copy: "Masukkan buku ke rak: baca, selesai, atau ingin baca.",
  },
  {
    icon: MessageCircle,
    eyebrow: "02 Review",
    title: "Bagikan kesan.",
    copy: "Rating, quote, dan catatan tampil ringkas.",
  },
  {
    icon: Handshake,
    eyebrow: "03 Pinjam",
    title: "Temukan buku fisik.",
    copy: "Lihat status dan ajukan pinjam dengan aman.",
  },
] as const;

export function CinematicReadingFlow({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const getPinDistance = () => {
      const viewport = window.innerHeight || 800;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      return Math.max(viewport * (isMobile ? 2.65 : 3.25), isMobile ? 1900 : 2600);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(section.querySelectorAll(".flow-reveal"), { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(".flow-reveal", { autoAlpha: 0, y: 48, scale: 0.94 });
      gsap.set(".flow-book", { rotateY: -18, rotateX: 8, y: 40 });
      gsap.set(".flow-spine", { transformOrigin: "left center", scaleX: 0.2 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getPinDistance()}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(".flow-book", { rotateY: -8, rotateX: 2, y: 0, ease: "power2.out", duration: 1 }, 0)
        .to(".flow-step-0", { autoAlpha: 1, y: 0, scale: 1, ease: "power3.out", duration: 0.8 }, 0.1)
        .to(".flow-spine-0", { scaleX: 1, ease: "power3.out", duration: 0.8 }, 0.1)
        .to(".flow-step-0", { autoAlpha: 0.18, y: -34, scale: 0.96, ease: "power2.inOut", duration: 0.6 }, 1.1)
        .to(".flow-step-1", { autoAlpha: 1, y: 0, scale: 1, ease: "power3.out", duration: 0.8 }, 1.25)
        .to(".flow-book", { rotateY: 9, rotateX: 0, y: -8, ease: "power2.inOut", duration: 0.8 }, 1.25)
        .to(".flow-spine-1", { scaleX: 1, ease: "power3.out", duration: 0.8 }, 1.25)
        .to(".flow-step-1", { autoAlpha: 0.18, y: -34, scale: 0.96, ease: "power2.inOut", duration: 0.6 }, 2.2)
        .to(".flow-step-2", { autoAlpha: 1, y: 0, scale: 1, ease: "power3.out", duration: 0.8 }, 2.35)
        .to(".flow-book", { rotateY: 20, rotateX: -4, y: -16, ease: "power2.inOut", duration: 0.8 }, 2.35)
        .to(".flow-spine-2", { scaleX: 1, ease: "power3.out", duration: 0.8 }, 2.35);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn("relative min-h-dvh overflow-clip bg-[#17120d] text-[#fff9f0]", className)}
    >
      <div className="flex min-h-dvh items-center px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d6b28b]">
              Alur Shelfgram
            </p>
            <h2 className="mt-4 max-w-xl font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Tiga aksi. Satu ruang baca.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#fff9f0]/78 sm:text-lg sm:leading-8">
              Fokus pada hal yang pembaca lakukan setiap hari.
            </p>
          </div>

          <div className="relative min-h-[32rem] sm:min-h-[38rem]">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_50%_35%,rgba(214,178,139,0.22),transparent_34%),linear-gradient(145deg,rgba(31,77,58,0.76),rgba(12,25,18,0.96))] shadow-[0_40px_120px_rgba(0,0,0,0.38)]"
            />

            <div className="flow-book absolute left-1/2 top-1/2 h-72 w-52 -translate-x-1/2 -translate-y-1/2 rounded-[1.4rem] bg-[#f8f1e7] p-4 shadow-[0_34px_80px_rgba(0,0,0,0.45)] will-change-transform sm:h-88 sm:w-64">
              <div className="h-full rounded-[1rem] border border-[#e0d1bd] bg-[linear-gradient(135deg,#fff9f0,#ead7bf)] p-5 text-[#241a12]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#1f4d3a] text-[#fff9f0]">
                    <BookOpen aria-hidden="true" className="size-6" />
                  </div>
                  <Star aria-hidden="true" className="size-5 fill-[#c98348] text-[#c98348]" />
                </div>
                <p className="mt-12 font-heading text-3xl font-semibold leading-none sm:text-4xl">
                  Shelfgram
                </p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#8b6f4e]">
                  Reading log
                </p>
                <div className="mt-16 grid gap-2">
                  <div className="h-2 rounded-full bg-[#e0d1bd]" />
                  <div className="h-2 w-3/4 rounded-full bg-[#e0d1bd]" />
                  <div className="h-2 w-1/2 rounded-full bg-[#e0d1bd]" />
                </div>
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-6 grid gap-3 sm:inset-x-8 lg:inset-x-10 lg:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    className={`flow-reveal flow-step-${index} rounded-2xl border border-[#fff9f0]/12 bg-[#07150f]/72 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md`}
                    key={step.title}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-[#d6b28b]/16 text-[#d6b28b]">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b28b]">
                        {step.eyebrow}
                      </p>
                    </div>
                    <h3 className="mt-4 font-heading text-2xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#fff9f0]/78">{step.copy}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#fff9f0]/10">
                      <div className={`flow-spine flow-spine-${index} h-full origin-left rounded-full bg-[#d6b28b]`} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
