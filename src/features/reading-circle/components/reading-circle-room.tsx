"use client";

import { useState } from "react";

import { ReadingCircleFeed } from "@/features/reading-circle/components/reading-circle-feed";
import { ReadingCircleHeader } from "@/features/reading-circle/components/reading-circle-header";
import type {
  ReadingCircleDetail,
  ReadingCircleSummary,
} from "@/features/reading-circle/types";

type ReadingCircleRoomProps = {
  initial: ReadingCircleDetail;
  history: ReadingCircleSummary[];
};

/**
 * Client-side orchestrator that owns the live `circle` state and shares it
 * between the header (action buttons + info drawer) and the feed (post
 * list). Mutations from any panel return a fresh `ReadingCircleDetail` and
 * update both views without a router round-trip.
 */
export function ReadingCircleRoom({ initial, history }: ReadingCircleRoomProps) {
  const [circle, setCircle] = useState<ReadingCircleDetail>(initial);

  return (
    <>
      <ReadingCircleHeader
        circle={circle}
        history={history}
        onUpdated={setCircle}
      />
      <ReadingCircleFeed circle={circle} onUpdated={setCircle} />
    </>
  );
}
