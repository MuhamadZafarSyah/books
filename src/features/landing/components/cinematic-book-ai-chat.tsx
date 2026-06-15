"use client";

/**
 * CinematicBookAiChat
 * -------------------
 * Section sinematik scroll-driven buat fitur "Book AI Chat" Shelfgram —
 * ngobrol sama AI soal buku tertentu.
 *
 * Konsep: mockup chat yang hidup. Saat user scroll, percakapan kebuka
 * satu per satu: bubble user muncul, typing indicator AI berdenyut,
 * lalu jawaban AI nongol. AI orb di header pulse terus, dengan
 * book-context card yang nempel di atas. Vibe cozy & smart.
 *
 * Dependencies (udah ada di project kamu):
 *   - react, react-dom
 *   - gsap (pakai ScrollTrigger)
 *   - tailwindcss
 *
 * Cara pakai:
 *   import CinematicBookAiChat from "@/components/ui/cinematic-book-ai-chat";
 *   <CinematicBookAiChat />
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Send } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type ChatItem =
  | { role: "bubble"; from: "user" | "ai"; text: string }
  | { role: "typing"; from: "ai" };

const CONVERSATION: ChatItem[] = [
  {
    role: "bubble",
    from: "user",
    text: "Eh, “Laut Bercerita” tentang apa sih? Spoiler-free ya 🙏",
  },
  { role: "typing", from: "ai" },
  {
    role: "bubble",
    from: "ai",
    text: "Singkatnya: soal aktivis ’98, kehilangan, & keluarga yang terus nunggu. Melankolis tapi hangat. Tenang, no spoiler 🌊",
  },
  {
    role: "bubble",
    from: "user",
    text: "Cocok ga buat yang baru mulai baca sastra?",
  },
  { role: "typing", from: "ai" },
  {
    role: "bubble",
    from: "ai",
    text: "Cocok banget. Bahasanya ngalir, ga bikin pusing. Mulai dari sini aman 👌",
  },
];

export default function CinematicBookAiChat() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      // intro reveal
      gsap.from("[data-anim='intro']", {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root, start: "top 75%" },
      });

      // AI orb pulse terus-menerus
      gsap.to("[data-anim='orb']", {
        scale: 1.15,
        opacity: 0.9,
        duration: 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      const items = itemRefs.current.filter(Boolean);

      if (prefersReduced) {
        gsap.set("[data-anim='book']", { autoAlpha: 1, y: 0 });
        items.forEach((el) => {
          if (el.dataset.role === "typing") gsap.set(el, { display: "none" });
          else gsap.set(el, { autoAlpha: 1, y: 0 });
        });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // book-context card masuk duluan
      tl.from(
        "[data-anim='book']",
        { autoAlpha: 0, y: -24, duration: 0.5, ease: "power2.out" },
        0,
      );

      // percakapan kebuka berurutan
      items.forEach((el) => {
        if (el.dataset.role === "typing") {
          tl.fromTo(
            el,
            { autoAlpha: 0, scale: 0.8 },
            { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power1.out" },
            ">0.15",
          );
          // typing collapse, digantikan jawaban
          tl.to(
            el,
            {
              autoAlpha: 0,
              height: 0,
              marginTop: 0,
              marginBottom: 0,
              duration: 0.3,
              ease: "power1.in",
            },
            ">0.5",
          );
        } else {
          tl.from(
            el,
            { autoAlpha: 0, y: 26, duration: 0.5, ease: "power2.out" },
            ">-0.05",
          );
        }
      });

      // CTA muncul terakhir
      tl.from(
        "[data-anim='cta']",
        { autoAlpha: 0, y: 20, duration: 0.5, ease: "power2.out" },
        ">0.1",
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative w-full overflow-hidden bg-[#0f0d0b] font-sans text-[#fff9f0]"
      aria-label="Tanya buku ke AI di Shelfgram"
    >
      {/* glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(214,178,139,0.18),_transparent_60%)] blur-2xl" />

      {/* Intro */}
      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-12 text-center">
        <p
          data-anim="intro"
          className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#d6b28b]"
        >
          Book AI Chat
        </p>
        <h2
          data-anim="intro"
          className="text-balance font-heading text-4xl font-semibold leading-tight tracking-tight text-[#fff9f0] sm:text-5xl md:text-6xl"
        >
          Nanya soal buku,{" "}
          <span className="text-[#d6b28b]">kayak ngobrol sama temen.</span>
        </h2>
        <p
          data-anim="intro"
          className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-[#fff9f0]/78 sm:text-lg sm:leading-8"
        >
          Bingung mulai dari mana atau pengen bocoran ringan? Tanya aja ke AI
          yang ngerti konteks bukunya. Scroll buat lihat obrolannya.
        </p>
      </div>

      {/* Pinned chat stage */}
      <div
        ref={pinRef}
        className="relative flex min-h-screen items-center justify-center px-6"
      >
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-[#1f4d3a]/10 backdrop-blur-md">
          {/* header: AI orb + book context */}
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span
                data-anim="orb"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d6b28b] to-[#1f4d3a] opacity-60 blur-md"
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b28b] to-[#1f4d3a] font-heading text-sm font-semibold tracking-tight text-[#17120d]">
                AI
              </span>
            </div>
            <div>
              <p className="font-heading text-sm font-semibold tracking-tight text-[#fff9f0]">
                Shelfgram AI
              </p>
              <p className="text-xs leading-5 text-[#d6b28b]">lagi bahas buku kamu</p>
            </div>
          </div>

          {/* book context chip */}
          <div
            data-anim="book"
            className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm ">
              <Image
                src="/landing/cover-laut-bercerita.jpg"
                alt="Cover Laut Bercerita"
                fill
                sizes="4rem"
                className="object-contain"
              />
            </div>
            {/* <div className="h-12 w-9 shrink-0 rounded-sm bg-gradient-to-b from-amber-500/80 to-orange-700/80 shadow" /> */}

            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold tracking-tight text-[#fff9f0]">
                Laut Bercerita
              </p>
              <p className="truncate text-xs leading-5 text-[#fff9f0]/58">
                Leila S. Chudori · Fiksi sejarah
              </p>
            </div>
          </div>

          {/* chat thread */}
          <div className="flex flex-col gap-3 px-5 py-5">
            {CONVERSATION.map((item, i) => {
              const isUser = item.from === "user";

              if (item.role === "typing") {
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) itemRefs.current[i] = el;
                    }}
                    data-role="typing"
                    className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-white/[0.06] px-4 py-3"
                  >
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#d6b28b] [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#d6b28b] [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#d6b28b]" />
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  ref={(el) => {
                    if (el) itemRefs.current[i] = el;
                  }}
                  data-role="bubble"
                  className={`max-w-[80%] text-pretty rounded-2xl px-4 py-3 text-sm leading-6 ${isUser
                    ? "self-end rounded-br-sm bg-[#1f4d3a] font-medium text-[#fff9f0]"
                    : "self-start rounded-bl-sm bg-white/[0.07] text-[#fff9f0]/86"
                    }`}
                >
                  {item.text}
                </div>
              );
            })}
          </div>

          {/* fake input + CTA */}
          <div
            data-anim="cta"
            className="flex items-center gap-2 border-t border-white/10 px-4 py-4"
          >
            <div className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm leading-6 text-[#bfae9c]">
              Tanya apa aja soal buku ini…
            </div>
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b28b] to-[#1f4d3a] font-heading text-lg font-semibold text-[#17120d] transition-transform hover:scale-105">
              <Send aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        {/* <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-stone-500">
          Scroll buat lihat obrolan
        </p> */}
      </div>
    </section>
  );
}
