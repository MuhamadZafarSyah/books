"use client";

import { useEffect, useRef } from "react";
import {
  BookOpen,
  Handshake,
  LibraryBig,
  MessageCircle,
  Quote,
  Sparkles,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

const storyScenes = [
  {
    icon: LibraryBig,
    eyebrow: "Scene 01",
    title: "Rak pribadi mulai bernapas.",
    copy: "Buku yang biasanya diam di kamar punya konteks: status baca, catatan kecil, dan alasan kenapa ia layak disimpan.",
    cue: "Rak",
    metric: "128",
    metricLabel: "buku hidup di rak",
  },
  {
    icon: Quote,
    eyebrow: "Scene 02",
    title: "Review menjadi jejak.",
    copy: "Setiap rating, quote, dan kesan pendek membentuk memori baca yang mudah ditemukan lagi.",
    cue: "Review",
    metric: "4.8",
    metricLabel: "rata-rata rating",
  },
  {
    icon: MessageCircle,
    eyebrow: "Scene 03",
    title: "Pembaca menemukan pembaca.",
    copy: "Feed tetap tenang, tapi cukup hidup untuk melihat buku apa yang sedang menggerakkan temanmu.",
    cue: "Teman",
    metric: "18",
    metricLabel: "teman pembaca",
  },
  {
    icon: Handshake,
    eyebrow: "Scene 04",
    title: "Buku fisik punya perjalanan.",
    copy: "Status pinjam, request, dan pemiliknya jelas sejak awal, jadi proses berbagi terasa aman.",
    cue: "Pinjam",
    metric: "6",
    metricLabel: "buku tersedia",
  },
] as const;

const injectedStyles = `
  .sg-story-grain {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; opacity: 0.06; mix-blend-mode: screen;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.9"/></svg>');
  }

  .sg-story-stage {
    transform-style: preserve-3d;
    background:
      linear-gradient(115deg, rgba(255,249,240,0.11) 0%, transparent 28%),
      linear-gradient(180deg, rgba(214,178,139,0.08) 0%, rgba(7,21,15,0) 45%),
      linear-gradient(145deg, #07150f 0%, #112319 52%, #17120d 100%);
    box-shadow:
      inset 0 1px 1px rgba(255,249,240,0.16),
      inset 0 -1px 1px rgba(0,0,0,0.55),
      0 42px 120px rgba(0,0,0,0.38);
  }

  .sg-story-slit {
    background:
      linear-gradient(100deg, transparent 0%, rgba(255,249,240,0.1) 42%, rgba(214,178,139,0.28) 50%, rgba(255,249,240,0.08) 58%, transparent 100%);
    filter: blur(0.5px);
    transform: skewX(-12deg);
  }

  .sg-story-book {
    transform-style: preserve-3d;
    background: linear-gradient(135deg, #fff9f0 0%, #ead7bf 48%, #c98348 100%);
    box-shadow:
      0 34px 86px rgba(0,0,0,0.45),
      inset 1px 1px 1px rgba(255,255,255,0.72),
      inset -10px 0 20px rgba(36,26,18,0.15);
  }

  .sg-story-book::before,
  .sg-story-book::after {
    content: "";
    position: absolute;
    inset-block: 8%;
    border-radius: 18px;
    pointer-events: none;
  }

  .sg-story-book::before {
    left: 12%;
    width: 9px;
    background: linear-gradient(180deg, rgba(31,77,58,0.75), rgba(31,77,58,0.32));
    box-shadow: 16px 0 0 rgba(255,249,240,0.32);
  }

  .sg-story-book::after {
    right: 10%;
    width: 34%;
    background:
      linear-gradient(90deg, rgba(255,249,240,0.28), transparent),
      repeating-linear-gradient(180deg, rgba(36,26,18,0.16) 0 1px, transparent 1px 12px);
    opacity: 0.45;
  }

  .sg-story-page {
    transform-origin: left center;
    transform-style: preserve-3d;
    background: linear-gradient(135deg, rgba(255,249,240,0.92), rgba(241,228,210,0.76));
    box-shadow: inset 1px 0 0 rgba(255,255,255,0.8), 14px 18px 40px rgba(0,0,0,0.2);
  }

  .sg-story-thread {
    transform-origin: left center;
  }
`;

export function CinematicStorytelling({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const matchMedia = gsap.matchMedia();

    matchMedia.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const ctx = gsap.context(() => {
          gsap.set(".story-kicker", { autoAlpha: 0, y: 22 });
          gsap.set(".story-title-word", {
            autoAlpha: 0,
            y: 60,
            filter: "blur(18px)",
          });
          gsap.set(".story-copy", { autoAlpha: 0, y: 26 });
          gsap.set(".story-scene", {
            autoAlpha: 0,
            y: 48,
            filter: "blur(20px)",
          });
          gsap.set(".story-scene-0", {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
          });
          gsap.set(".story-artifact", {
            rotateX: 8,
            rotateY: -22,
            rotateZ: -4,
            y: 34,
          });
          gsap.set(".story-page", { rotateY: -18, x: 0 });
          gsap.set(".story-float", {
            autoAlpha: 0,
            y: 30,
            scale: 0.86,
            filter: "blur(14px)",
          });
          gsap.set(".story-thread", { scaleX: 0.08, autoAlpha: 0.28 });
          gsap.set(".story-progress", { scaleX: 0.08 });

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${Math.max(window.innerHeight * 4.8, 3600)}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to(".story-kicker", {
              autoAlpha: 1,
              y: 0,
              ease: "power3.out",
              duration: 0.55,
            })
            .to(
              ".story-title-word",
              {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                stagger: 0.12,
                ease: "expo.out",
                duration: 0.95,
              },
              0.08,
            )
            .to(
              ".story-copy",
              { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.55 },
              0.52,
            )
            .to(
              ".story-artifact",
              {
                rotateX: 2,
                rotateY: -10,
                rotateZ: 0,
                y: 0,
                ease: "power3.out",
                duration: 1,
              },
              0.2,
            )
            .to(
              ".story-float-0",
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                ease: "back.out(1.35)",
                duration: 0.75,
              },
              0.55,
            )
            .to(
              ".story-thread-0",
              { scaleX: 1, autoAlpha: 1, duration: 0.7 },
              0.62,
            )
            .to(".story-progress", { scaleX: 0.25, duration: 0.8 }, 0.62);

          storyScenes.forEach((_, index) => {
            const position = 1.2 + index * 1.28;
            const nextIndex = index + 1;
            const rotationY = [-10, 11, -18, 18][index] ?? 0;
            const rotationZ = [0, 3, -2, 4][index] ?? 0;
            const artifactX = [0, -22, 28, -10][index] ?? 0;
            const artifactY = [0, -18, 10, -26][index] ?? 0;

            timeline
              .to(
                ".story-artifact",
                {
                  x: artifactX,
                  y: artifactY,
                  rotateY: rotationY,
                  rotateZ: rotationZ,
                  ease: "power2.inOut",
                  duration: 0.9,
                },
                position,
              )
              .to(
                ".story-page",
                {
                  rotateY: -18 - index * 18,
                  x: index * 3,
                  ease: "power2.inOut",
                  duration: 0.9,
                },
                position,
              )
              .to(
                `.story-float-${index}`,
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  ease: "back.out(1.2)",
                  duration: 0.75,
                },
                position,
              )
              .to(
                `.story-thread-${index}`,
                {
                  scaleX: 1,
                  autoAlpha: 1,
                  ease: "power2.out",
                  duration: 0.7,
                },
                position,
              )
              .to(
                ".story-progress",
                {
                  scaleX: (index + 1) / storyScenes.length,
                  ease: "power2.inOut",
                  duration: 0.8,
                },
                position,
              );

            if (nextIndex < storyScenes.length) {
              timeline
                .to(
                  `.story-scene-${index}`,
                  {
                    autoAlpha: 0,
                    y: -34,
                    filter: "blur(18px)",
                    ease: "power2.inOut",
                    duration: 0.55,
                  },
                  position + 0.76,
                )
                .to(
                  `.story-scene-${nextIndex}`,
                  {
                    autoAlpha: 1,
                    y: 0,
                    filter: "blur(0px)",
                    ease: "power3.out",
                    duration: 0.75,
                  },
                  position + 0.9,
                );
            }
          });

          timeline.to({}, { duration: 0.8 });
        }, section);

        return () => ctx.revert();
      },
    );

    return () => matchMedia.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative min-h-dvh overflow-clip bg-[#07150f] text-[#fff9f0]",
        className,
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: injectedStyles }} />
      <div className="sg-story-grain" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b28b]/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,15,0)_0%,rgba(7,21,15,0.66)_72%,#07150f_100%)]"
      />

      <div className="relative z-10 flex min-h-dvh items-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative z-10">
            <p className="story-kicker text-sm font-semibold uppercase text-[#d6b28b]">
              Story mode Shelfgram
            </p>
            <h2 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              <span className="story-title-word inline-block">Dari</span>{" "}
              <span className="story-title-word inline-block">buku</span>{" "}
              <span className="story-title-word inline-block">di</span>{" "}
              <span className="story-title-word inline-block">rak,</span>{" "}
              <span className="story-title-word inline-block">menjadi</span>{" "}
              <span className="story-title-word inline-block text-[#d6b28b]">
                perjalanan.
              </span>
            </h2>
            <p className="story-copy mt-5 max-w-xl text-base leading-7 text-[#fff9f0]/76 sm:text-lg sm:leading-8">
              Section ini mengikuti satu buku saat ia dicatat, direview,
              ditemukan teman, lalu dipinjam dengan jelas.
            </p>

            <div className="mt-9 grid gap-5 lg:relative lg:block lg:min-h-[18rem]">
              {storyScenes.map((scene, index) => {
                const Icon = scene.icon;

                return (
                  <article
                    className={`story-scene story-scene-${index} ${
                      index === 0
                        ? "relative"
                        : "relative lg:absolute lg:inset-0 lg:opacity-0"
                    } max-w-xl`}
                    key={scene.title}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-[#d6b28b]/20 bg-[#d6b28b]/10 text-[#d6b28b]">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <p className="text-xs font-bold uppercase text-[#d6b28b]">
                        {scene.eyebrow}
                      </p>
                    </div>
                    <h3 className="mt-5 font-heading text-3xl font-semibold leading-tight sm:text-4xl">
                      {scene.title}
                    </h3>
                    <p className="mt-4 text-base leading-7 text-[#fff9f0]/76">
                      {scene.copy}
                    </p>
                    <div className="mt-7 flex flex-wrap items-end gap-4">
                      <p className="font-heading text-5xl font-semibold leading-none text-[#fff9f0]">
                        {scene.metric}
                      </p>
                      <p className="max-w-40 pb-1 text-sm font-semibold text-[#d6b28b]">
                        {scene.metricLabel}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-7 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-[#fff9f0]/12">
              <div className="story-progress h-full origin-left rounded-full bg-[#d6b28b]" />
            </div>
          </div>

          <div className="sg-story-stage relative min-h-[34rem] overflow-hidden rounded-[2rem] border border-[#fff9f0]/10 p-4 sm:min-h-[40rem] sm:p-6 lg:min-h-[44rem] lg:rounded-[2.5rem]">
            <div className="sg-story-slit absolute -left-20 top-0 h-full w-1/2 opacity-70" />
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-[#fff9f0]/28 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-8 bottom-8 h-px bg-gradient-to-r from-transparent via-[#d6b28b]/32 to-transparent"
            />

            <div className="absolute left-5 top-5 z-20 rounded-full border border-[#fff9f0]/14 bg-[#07150f]/62 px-4 py-2 text-xs font-bold uppercase text-[#fff9f0]/72 backdrop-blur-md sm:left-7 sm:top-7">
              Cinematic shelf
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="story-artifact relative h-72 w-52 will-change-transform sm:h-88 sm:w-64">
                <div className="sg-story-book absolute inset-0 rounded-[1.6rem] p-5">
                  <div className="relative z-10 flex h-full flex-col justify-between rounded-[1.1rem] border border-[#241a12]/10 p-5 text-[#241a12]">
                    <div className="flex items-start justify-between gap-4">
                      <BookOpen aria-hidden="true" className="size-8" />
                      <Sparkles
                        aria-hidden="true"
                        className="size-5 fill-[#c98348] text-[#c98348]"
                      />
                    </div>
                    <div>
                      <p className="font-heading text-4xl font-semibold leading-none">
                        The
                        <br />
                        Quiet
                        <br />
                        Shelf
                      </p>
                      <p className="mt-4 text-xs font-bold uppercase text-[#8b6f4e]">
                        Shelfgram edition
                      </p>
                    </div>
                  </div>
                </div>
                <div className="story-page sg-story-page absolute left-[24%] top-[8%] h-[84%] w-[58%] rounded-r-[1.2rem]" />
              </div>
            </div>

            {storyScenes.map((scene, index) => (
              <div
                className={cn(
                  "story-float absolute z-20 max-w-[13.5rem] rounded-2xl border border-[#fff9f0]/14 bg-[#07150f]/72 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.32)] backdrop-blur-md lg:opacity-0",
                  index === 0 && "story-float-0 left-4 top-24 sm:left-10",
                  index === 1 && "story-float-1 right-4 top-32 sm:right-9",
                  index === 2 &&
                    "story-float-2 bottom-28 left-5 sm:left-12",
                  index === 3 &&
                    "story-float-3 bottom-20 right-4 sm:right-10",
                )}
                key={scene.cue}
              >
                <p className="text-xs font-bold uppercase text-[#d6b28b]">
                  {scene.cue}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#fff9f0]/76">
                  {scene.copy}
                </p>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#fff9f0]/10">
                  <div
                    className={`story-thread story-thread-${index} h-full rounded-full bg-[#d6b28b]`}
                  />
                </div>
              </div>
            ))}

            <ol className="absolute inset-x-5 bottom-5 z-20 grid grid-cols-4 gap-2 sm:inset-x-7 sm:bottom-7">
              {storyScenes.map((scene, index) => (
                <li
                  className="rounded-xl border border-[#fff9f0]/10 bg-[#fff9f0]/6 px-3 py-2 text-center text-[10px] font-bold uppercase text-[#fff9f0]/70 backdrop-blur"
                  key={scene.eyebrow}
                >
                  0{index + 1} {scene.cue}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
