import type { Metadata } from "next";

import { getBlindMatchHome } from "@/actions/blind-match";
import { BlindMatchShell } from "@/features/blind-match/components/blind-match-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blind Reading Match | Shelfgram",
  description: "Temukan pembaca misterius berdasarkan chemistry bacaan.",
};

export default async function BlindMatchPage() {
  const data = await getBlindMatchHome();
  return <BlindMatchShell data={data} />;
}
