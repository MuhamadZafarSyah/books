import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { checkRoutingRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OSRM_ROUTE_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ROUTES = 3;
const MAX_ROUTE_POINTS = 650;

type RouteCoordinate = [number, number];

type RouteOption = {
  id: string;
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
};

type RoutePlanningResponse = {
  routes: RouteOption[];
};

type OsrmRoute = {
  distance?: unknown;
  duration?: unknown;
  geometry?: {
    coordinates?: unknown;
  };
};

type OsrmResponse = {
  routes?: unknown;
};

const EMPTY_RESPONSE: RoutePlanningResponse = { routes: [] };

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRoutingRateLimit(
    `reading-events-route:${session.user.id}`,
  );
  if (!limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan." },
      { status: 429 },
    );
  }

  const fromLat = parseCoordinate(request.nextUrl.searchParams.get("fromLat"));
  const fromLng = parseCoordinate(request.nextUrl.searchParams.get("fromLng"));
  const toLat = parseCoordinate(request.nextUrl.searchParams.get("toLat"));
  const toLng = parseCoordinate(request.nextUrl.searchParams.get("toLng"));

  if (
    !isLatitude(fromLat) ||
    !isLatitude(toLat) ||
    !isLongitude(fromLng) ||
    !isLongitude(toLng)
  ) {
    return NextResponse.json({ error: "Koordinat tidak valid." }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `${OSRM_ROUTE_BASE_URL}/${fromLng},${fromLat};${toLng},${toLat}`,
  );
  upstreamUrl.searchParams.set("alternatives", "true");
  upstreamUrl.searchParams.set("overview", "full");
  upstreamUrl.searchParams.set("geometries", "geojson");
  upstreamUrl.searchParams.set("steps", "false");

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
      return NextResponse.json<RoutePlanningResponse>(EMPTY_RESPONSE);
    }

    const data = (await upstream.json()) as OsrmResponse;
    const sourceRoutes = Array.isArray(data.routes) ? data.routes : [];
    const routes = sourceRoutes
      .slice(0, MAX_ROUTES)
      .map(toRouteOption)
      .filter((route): route is RouteOption => route !== null);

    return NextResponse.json<RoutePlanningResponse>({ routes });
  } catch (error) {
    console.error("[reading-events/route] Route planning failed:", error);
    return NextResponse.json<RoutePlanningResponse>(EMPTY_RESPONSE);
  } finally {
    clearTimeout(timeout);
  }
}

function parseCoordinate(value: string | null): number {
  if (value === null) return NaN;
  return Number.parseFloat(value);
}

function isLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function toRouteOption(route: unknown, index: number): RouteOption | null {
  if (!route || typeof route !== "object") return null;

  const candidate = route as OsrmRoute;
  const coordinates = Array.isArray(candidate.geometry?.coordinates)
    ? candidate.geometry.coordinates
        .map(toRouteCoordinate)
        .filter((coordinate): coordinate is RouteCoordinate => coordinate !== null)
    : [];
  const distanceMeters =
    typeof candidate.distance === "number" ? candidate.distance : NaN;
  const durationSeconds =
    typeof candidate.duration === "number" ? candidate.duration : NaN;

  if (coordinates.length < 2) return null;
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    return null;
  }

  return {
    id: `route-${index + 1}`,
    coordinates: downsampleCoordinates(coordinates),
    distanceMeters,
    durationSeconds,
  };
}

function toRouteCoordinate(value: unknown): RouteCoordinate | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = typeof value[0] === "number" ? value[0] : NaN;
  const lat = typeof value[1] === "number" ? value[1] : NaN;
  if (!isLongitude(lng) || !isLatitude(lat)) return null;
  return [lng, lat];
}

function downsampleCoordinates(coordinates: RouteCoordinate[]): RouteCoordinate[] {
  if (coordinates.length <= MAX_ROUTE_POINTS) return coordinates;

  const step = Math.ceil(coordinates.length / MAX_ROUTE_POINTS);
  const sampled = coordinates.filter((_, index) => index % step === 0);
  const last = coordinates[coordinates.length - 1];

  if (last && sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}
