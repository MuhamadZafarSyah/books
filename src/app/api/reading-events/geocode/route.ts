import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { checkGeocodeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_TIMEOUT_MS = 6_000;
const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 5;

type GeocodeResult = {
  displayName: string;
  lat: number;
  lng: number;
};

type GeocodeResponse = {
  results: GeocodeResult[];
};

type NominatimItem = {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
};

const EMPTY_RESPONSE: GeocodeResponse = { results: [] };

/**
 * GET /api/reading-events/geocode?q=...
 *
 * Auth-gated forward-geocoding proxy backed by the public Nominatim service.
 *
 * - Requires an authenticated NextAuth session.
 * - Rate limited to 30 requests per minute per user via Upstash.
 * - Calls Nominatim with the project User-Agent and a short timeout.
 * - Returns at most 5 normalized results `{ displayName, lat, lng }`.
 * - Network or upstream failures collapse to an empty `results` array so the
 *   client search input keeps working with manual entry.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkGeocodeRateLimit(
    `reading-events-geocode:${session.user.id}`,
  );
  if (!limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan." },
      { status: 429 },
    );
  }

  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length === 0) {
    return NextResponse.json<GeocodeResponse>(EMPTY_RESPONSE);
  }

  const upstreamUrl = new URL(NOMINATIM_BASE_URL);
  upstreamUrl.searchParams.set("format", "json");
  upstreamUrl.searchParams.set("q", query);
  upstreamUrl.searchParams.set("limit", String(MAX_RESULTS));
  upstreamUrl.searchParams.set("addressdetails", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        "User-Agent": "Shelfgram/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json<GeocodeResponse>(EMPTY_RESPONSE);
    }

    const data = (await upstream.json()) as unknown;
    if (!Array.isArray(data)) {
      return NextResponse.json<GeocodeResponse>(EMPTY_RESPONSE);
    }

    const results = data
      .slice(0, MAX_RESULTS)
      .map(toGeocodeResult)
      .filter((item): item is GeocodeResult => item !== null);

    return NextResponse.json<GeocodeResponse>({ results });
  } catch (error) {
    console.error("[reading-events/geocode] Geocoding failed:", error);
    return NextResponse.json<GeocodeResponse>(EMPTY_RESPONSE);
  } finally {
    clearTimeout(timeout);
  }
}

function toGeocodeResult(item: unknown): GeocodeResult | null {
  if (!item || typeof item !== "object") return null;
  const { display_name, lat, lon } = item as NominatimItem;

  const displayName = typeof display_name === "string" ? display_name : null;
  const parsedLat = typeof lat === "string" ? Number.parseFloat(lat) : NaN;
  const parsedLng = typeof lon === "string" ? Number.parseFloat(lon) : NaN;

  if (!displayName) return null;
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  if (parsedLat < -90 || parsedLat > 90) return null;
  if (parsedLng < -180 || parsedLng > 180) return null;

  return {
    displayName,
    lat: parsedLat,
    lng: parsedLng,
  };
}
