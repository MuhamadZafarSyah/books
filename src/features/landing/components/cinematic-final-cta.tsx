"use client";

/**
 * CinematicFinalCta
 * -----------------
 * Section penutup landing page Shelfgram — ajakan terakhir yang sinematik,
 * plus footer di paling bawah.
 *
 * Konsep: headline besar yang kebuka kata per kata, deretan buku yang
 * "naik" ke rak, tombol CTA yang berdenyut lembut, dan footer cozy.
 * Vibe: hangat, ngajak, bikin user pengen langsung mulai.
 *
 * Dependencies (udah ada di project kamu):
 *   - react, react-dom
 *   - gsap (pakai ScrollTrigger)
 *   - tailwindcss
 *
 * Cara pakai (taruh paling bawah halaman):
 *   import CinematicFinalCta from "@/components/ui/cinematic-final-cta";
 *   <CinematicFinalCta />
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const HEADLINE = ["Mulai", "rak", "bacamu", "hari", "ini."];

const SHELF_BOOKS = [
  "from-[#d6b28b] to-[#8b6f4e]",
  "from-[#1f4d3a] to-[#123225]",
  "from-[#c98348] to-[#6b3d1d]",
  "from-[#8fb89e] to-[#1f4d3a]",
  "from-[#fff9f0] to-[#d6b28b]",
  "from-[#2f7d4f] to-[#17402c]",
  "from-[#bfae9c] to-[#8b6f4e]",
];

const FOOTER_COLUMNS = [
  {
    title: "Produk",
    links: [
      "Rak buku",
      "Review & quote",
      "Reading Circle",
      "Blind Match",
      "Book AI",
    ],
  },
  {
    title: "Komunitas",
    links: ["Jelajah pembaca", "Events offline", "Leaderboard"],
  },
  {
    title: "Shelfgram",
    links: ["Tentang kami", "Privasi", "Bantuan"],
  },
];

const SOCIALS = ["Instagram", "TikTok", "X", "Discord"];

export default function CinematicFinalCta() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      // background glow parallax
      gsap.to("[data-anim='glow']", {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      if (prefersReduced) {
        gsap.set(
          "[data-anim='word'], [data-anim='sub'], [data-anim='cta-group'], [data-anim='book'], [data-anim='footer']",
          { opacity: 1, yPercent: 0 },
        );
        return;
      }

      // headline kebuka kata per kata
      gsap.from("[data-anim='word']", {
        yPercent: 110,
        opacity: 0,
        ease: "power3.out",
        duration: 0.8,
        stagger: 0.1,
        scrollTrigger: { trigger: root, start: "top 65%" },
      });

      // subtitle + CTA
      gsap.from("[data-anim='sub'], [data-anim='cta-group']", {
        yPercent: 40,
        opacity: 0,
        ease: "power2.out",
        duration: 0.8,
        stagger: 0.15,
        scrollTrigger: { trigger: root, start: "top 55%" },
      });

      // buku naik ke rak
      gsap.from("[data-anim='book']", {
        yPercent: 130,
        rotation: () => gsap.utils.random(-10, 10),
        opacity: 0,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger: {
          trigger: "[data-anim='shelf']",
          start: "top 80%",
          end: "top 45%",
          scrub: 1,
        },
      });

      // CTA primary berdenyut lembut
      if (ctaRef.current) {
        gsap.to(ctaRef.current, {
          boxShadow: "0 0 36px rgba(214, 178, 139, 0.38)",
          duration: 1.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      }

      // footer fade up
      gsap.from("[data-anim='footer']", {
        yPercent: 30,
        opacity: 0,
        ease: "power2.out",
        duration: 0.8,
        scrollTrigger: { trigger: "[data-anim='footer']", start: "top 90%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative w-full overflow-hidden bg-[#0f0d0b] font-sans text-[#fff9f0]"
    >
      {/* glow */}
      <div
        data-anim="glow"
        className="pointer-events-none absolute left-1/2 top-0 h-[70vh] w-[80vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(214,178,139,0.18),_transparent_65%)] blur-3xl"
      />

      {/* Final CTA */}
      <section
        className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-32 pb-24 text-center"
        aria-label="Ajakan mulai pakai Shelfgram"
      >
        <h2 className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-balance font-heading text-5xl font-semibold leading-tight tracking-tight text-[#fff9f0] sm:text-6xl md:text-7xl">
          {HEADLINE.map((word, i) => (
            <span key={i} className="overflow-hidden pb-1">
              <span
                data-anim="word"
                className={`inline-block ${i === HEADLINE.length - 1 ? "text-[#d6b28b]" : ""
                  }`}
              >
                {word}
              </span>
            </span>
          ))}
        </h2>

        <p
          data-anim="sub"
          className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-[#fff9f0]/78 sm:text-lg sm:leading-8"
        >
          Catat bacaanmu, tulis review, dan temuin circle yang sefrekuensi.
          Gratis buat mulai—ruang bacamu nunggu di Shelfgram.
        </p>

        <div
          data-anim="cta-group"
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a
            ref={ctaRef}
            href="/auth/register"
            className="rounded-[1.25rem] bg-gradient-to-r from-[#d6b28b] to-[#c98348] px-8 py-3.5 text-sm font-bold text-[#17120d] shadow-[0_12px_30px_rgba(31,77,58,0.2)] transition-[box-shadow,filter] duration-200 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-[#0f0d0b]"
          >
            Mulai rak bacaku
          </a>
          <a
            href="/auth/login"
            className="rounded-[1.25rem] border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-[#fff9f0] transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-[#0f0d0b]"
          >
            Gabung komunitas
          </a>
        </div>

        {/* shelf buku */}
        {/* <div
          data-anim="shelf"
          className="relative mt-16 flex items-end justify-center gap-2 sm:gap-3"
        >
          {SHELF_BOOKS.map((spine, i) => (
            <div
              key={i}
              data-anim="book"
              className={`h-24 w-7 rounded-sm bg-gradient-to-b ${spine} shadow-lg shadow-black/40 sm:h-32 sm:w-9`}
            />
          ))}
        </div> */}
        <div className="mt-1 h-px w-full max-w-md bg-gradient-to-r from-transparent via-[#fff9f0]/10 to-transparent" />
      </section>

      <div className="mt-12 text-center mx-auto max-w-6xl px-6 py-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-[#bfae9c] sm:flex-row">
        <p className="text-center">
          © 2026 Shelfgram. Made with ❤️ By Readers.
        </p>
        {/* <div className="flex gap-4">
          <span>
            Support:
          </span>
          <a href="#" className="transition-colors duration-200 hover:text-[#fff9f0]">
            Syarat
          </a>
          <a href="#" className="transition-colors duration-200 hover:text-[#fff9f0]">
            Privasi
          </a>
        </div> */}
      </div>


    </div>
  );
}
