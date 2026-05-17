import type { LeaderboardPeriod } from "@prisma/client";

export type PeriodKey = "daily" | "weekly" | "monthly" | "all-time";

/**
 * Window waktu absolut untuk satu `period` leaderboard.
 *
 * `start` inklusif, `end` eksklusif. `null` di kedua field berarti tanpa
 * batas (untuk `all-time`).
 */
export type PeriodRange = {
  start: Date | null;
  end: Date | null;
  periodKey: string;
  enumValue: LeaderboardPeriod;
};

/**
 * Resolve period UI → window absolut server.
 *
 * Aturan kalender (sesuai plan):
 * - `daily`   = hari kalender server saat ini (00:00 → 24:00 lokal).
 * - `weekly`  = minggu kalender aktif (Senin 00:00 → Senin berikutnya 00:00).
 * - `monthly` = bulan kalender aktif (tanggal 1 00:00 → bulan berikutnya).
 * - `all-time` = tanpa filter waktu.
 *
 * `periodKey` ikut dihasilkan supaya layer snapshot fase 2 bisa langsung
 * memakainya tanpa logika tambahan.
 */
export function resolvePeriodRange(
  period: PeriodKey,
  now: Date = new Date(),
): PeriodRange {
  switch (period) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        start,
        end,
        periodKey: formatYmd(start),
        enumValue: "DAILY",
      };
    }
    case "weekly": {
      const start = startOfIsoWeek(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        start,
        end,
        periodKey: `${start.getFullYear()}-W${pad(getIsoWeekNumber(start))}`,
        enumValue: "WEEKLY",
      };
    }
    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      return {
        start,
        end,
        periodKey: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
        enumValue: "MONTHLY",
      };
    }
    case "all-time":
    default:
      return {
        start: null,
        end: null,
        periodKey: "all-time",
        enumValue: "ALL_TIME",
      };
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Awal minggu ISO 8601 (Senin) di waktu lokal. Implementasi sederhana
 * tanpa dependensi `date-fns` agar tidak menambah bundle dependency.
 */
function startOfIsoWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1 - day);
  result.setDate(result.getDate() + diff);
  return result;
}

/** Nomor minggu ISO 8601 untuk `periodKey` mingguan (1-53). */
function getIsoWeekNumber(date: Date): number {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
