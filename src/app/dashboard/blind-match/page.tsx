import type { Metadata } from "next";

import { getBlindMatchHome } from "@/actions/blind-match";
import { BlindMatchShell } from "@/features/blind-match/components/blind-match-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blind Reading Match | Shelfgram",
  description: "Swipe pembaca berdasarkan profile singkat dan rak buku publik.",
};

export default async function BlindMatchPage() {
  const data = await getBlindMatchHome();
  return <BlindMatchShell data={data} />;
}
