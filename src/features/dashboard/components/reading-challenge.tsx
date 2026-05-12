"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame } from "lucide-react";

const challenge = {
  goal: 24,
  completed: 14,
  year: 2025,
  streak: 7,
};

export function ReadingChallenge() {
  const percentage = Math.round((challenge.completed / challenge.goal) * 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-muted-foreground">
          <Trophy aria-hidden="true" className="size-4 text-chart-5" />
          Tantangan Membaca {challenge.year}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-5">
        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg
            className="-rotate-90"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-secondary"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-primary transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-heading text-xl font-bold">
              {challenge.completed}
            </span>
            <span className="text-[10px] text-muted-foreground">
              / {challenge.goal} buku
            </span>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2 rounded-full bg-chart-5/10 px-3 py-1.5">
          <Flame aria-hidden="true" className="size-3.5 text-chart-5" />
          <span className="text-xs font-medium text-chart-5">
            {challenge.streak} hari berturut-turut
          </span>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {challenge.goal - challenge.completed} buku lagi untuk mencapai
          targetmu!
        </p>
      </CardContent>
    </Card>
  );
}
