"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Map as MapComponent,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

type RouteCoordinate = [number, number];

type RouteOption = {
  id: string;
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
};

type RoutePlanningResponse = {
  routes?: RouteOption[];
  error?: string;
};

type EventRouteDialogProps = {
  latitude: number;
  longitude: number;
  locationAddress: string;
  className?: string;
};

type RouteStatus = "idle" | "locating" | "routing" | "ready" | "error";

type UserLocation = {
  latitude: number;
  longitude: number;
};

const GEOLOCATION_TIMEOUT_MS = 12_000;

export function EventRouteDialog({
  latitude,
  longitude,
  locationAddress,
  className,
}: EventRouteDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const requestIdRef = useRef(0);

  const selectedRoute = routes[selectedRouteIndex] ?? null;
  const destinationCoordinate = useMemo<RouteCoordinate>(
    () => [longitude, latitude],
    [latitude, longitude],
  );
  const userCoordinate = useMemo<RouteCoordinate | null>(
    () =>
      userLocation ? [userLocation.longitude, userLocation.latitude] : null,
    [userLocation],
  );

  const handleOpenRoute = () => {
    setOpen(true);
    void planRoute();
  };

  const handleRetry = () => {
    void planRoute();
  };

  const planRoute = async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setStatus("locating");
    setError(null);
    setRoutes([]);
    setSelectedRouteIndex(0);

    try {
      const location = await getCurrentLocation();
      if (requestId !== requestIdRef.current) return;

      setUserLocation(location);
      setStatus("routing");

      const searchParams = new URLSearchParams({
        fromLat: String(location.latitude),
        fromLng: String(location.longitude),
        toLat: String(latitude),
        toLng: String(longitude),
      });
      const response = await fetch(`/api/reading-events/route?${searchParams}`, {
        method: "GET",
      });

      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        const fallbackMessage =
          response.status === 401
            ? "Sesi Anda berakhir. Masuk ulang untuk melihat rute."
            : "Rute belum bisa dihitung saat ini.";
        throw new Error(fallbackMessage);
      }

      const data = (await response.json()) as RoutePlanningResponse;
      const nextRoutes = normalizeRoutes(data.routes);
      if (nextRoutes.length === 0) {
        throw new Error("Rute dari lokasi Anda ke agenda tidak ditemukan.");
      }

      setRoutes(nextRoutes);
      setStatus("ready");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
      setError(resolveRouteError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        className={cn(
          "cursor-pointer rounded-full bg-background/95 px-4 text-foreground shadow-md backdrop-blur hover:bg-background",
          className,
        )}
        onClick={handleOpenRoute}
      >
        <Navigation aria-hidden="true" data-icon="inline-start" />
        Route Planning
      </Button>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Route Planning</DialogTitle>
          <DialogDescription>
            Izinkan akses lokasi browser untuk menghitung rekomendasi rute dari
            posisi Anda ke titik agenda baca.
          </DialogDescription>
        </DialogHeader>

        {status === "locating" ? (
          <RouteStatusPanel
            icon={<LocateFixed className="size-5 animate-pulse" aria-hidden />}
            title="Menunggu izin lokasi"
            description="Browser akan meminta permission lokasi. Aktifkan agar rute bisa dihitung otomatis."
          />
        ) : null}

        {status === "routing" ? (
          <RouteStatusPanel
            icon={<Loader2 className="size-5 animate-spin" aria-hidden />}
            title="Menghitung rekomendasi rute"
            description="Lokasi Anda sudah diterima. Map sedang menyiapkan jalur terbaik ke agenda."
          />
        ) : null}

        {status === "error" ? (
          <div className="space-y-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
            <div className="flex items-start gap-3">
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Rute belum tersedia</p>
                <p className="leading-relaxed text-destructive/80">
                  {error ?? "Aktifkan permission lokasi lalu coba lagi."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={handleRetry}
            >
              <LocateFixed aria-hidden="true" data-icon="inline-start" />
              Coba lagi
            </Button>
          </div>
        ) : null}

        {status === "ready" && selectedRoute && userCoordinate ? (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="relative h-80 overflow-hidden rounded-2xl border border-border bg-muted/30 sm:h-96">
              <MapComponent
                viewport={{ center: destinationCoordinate, zoom: 13 }}
                interactive
              >
                <MapControls position="top-right" />
                <RouteBoundsFitter
                  coordinates={selectedRoute.coordinates}
                  start={userCoordinate}
                  destination={destinationCoordinate}
                />
                {routes.map((route, index) => {
                  const selected = index === selectedRouteIndex;

                  return (
                    <MapRoute
                      key={route.id}
                      id={`reading-event-${route.id}`}
                      coordinates={route.coordinates}
                      color={selected ? "#6366f1" : "#94a3b8"}
                      width={selected ? 6 : 4}
                      opacity={selected ? 0.98 : 0.45}
                      onClick={() => setSelectedRouteIndex(index)}
                    />
                  );
                })}
                <MapMarker
                  longitude={userCoordinate[0]}
                  latitude={userCoordinate[1]}
                  draggable={false}
                >
                  <MarkerContent className="rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg ring-4 ring-background">
                    <Crosshair className="size-4" aria-hidden />
                  </MarkerContent>
                </MapMarker>
                <MapMarker
                  longitude={destinationCoordinate[0]}
                  latitude={destinationCoordinate[1]}
                  draggable={false}
                >
                  <MarkerContent>
                    <MapPin
                      className="fill-[#8fb89e]! text-black! shadow-md"
                      size={30}
                      aria-hidden
                    />
                  </MarkerContent>
                </MapMarker>
              </MapComponent>
            </div>

            <aside className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Tujuan
                </p>
                <p className="leading-relaxed text-foreground">
                  {locationAddress}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Rekomendasi rute
                </p>
                <div className="space-y-2">
                  {routes.map((route, index) => {
                    const selected = index === selectedRouteIndex;
                    return (
                      <Button
                        key={route.id}
                        type="button"
                        variant={selected ? "secondary" : "outline"}
                        className="h-auto w-full cursor-pointer justify-between gap-3 rounded-2xl px-3 py-3 text-left normal-case tracking-normal"
                        onClick={() => setSelectedRouteIndex(index)}
                      >
                        <span className="min-w-0 space-y-1">
                          <span className="block text-sm font-semibold">
                            {index === 0
                              ? "Rute tercepat"
                              : `Alternatif ${index + 1}`}
                          </span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {formatDistance(route.distanceMeters)}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatDuration(route.durationSeconds)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteStatusPanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RouteBoundsFitter({
  coordinates,
  start,
  destination,
}: {
  coordinates: RouteCoordinate[];
  start: RouteCoordinate;
  destination: RouteCoordinate;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const routeCoordinates =
      coordinates.length >= 2 ? coordinates : [start, destination];
    const lngs = routeCoordinates.map((coordinate) => coordinate[0]);
    const lats = routeCoordinates.map((coordinate) => coordinate[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: { top: 56, right: 56, bottom: 56, left: 56 },
        maxZoom: 15,
        duration: 600,
      },
    );
  }, [coordinates, destination, isLoaded, map, start]);

  return null;
}

function normalizeRoutes(routes: RoutePlanningResponse["routes"]): RouteOption[] {
  if (!Array.isArray(routes)) return [];

  return routes.filter((route): route is RouteOption => {
    return (
      typeof route.id === "string" &&
      Number.isFinite(route.distanceMeters) &&
      Number.isFinite(route.durationSeconds) &&
      Array.isArray(route.coordinates) &&
      route.coordinates.length >= 2 &&
      route.coordinates.every(isRouteCoordinate)
    );
  });
}

function isRouteCoordinate(value: unknown): value is RouteCoordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function getCurrentLocation(): Promise<UserLocation> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(
      new Error("Browser Anda tidak mendukung akses lokasi."),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );
  });
}

function resolveRouteError(error: unknown): string {
  if (isGeolocationError(error)) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Permission lokasi ditolak. Aktifkan izin lokasi browser untuk melihat rute.";
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Lokasi Anda belum bisa dibaca. Pastikan GPS atau layanan lokasi aktif.";
    }

    if (error.code === error.TIMEOUT) {
      return "Permintaan lokasi terlalu lama. Coba lagi dari area dengan sinyal lebih stabil.";
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Rute belum bisa dihitung saat ini.";
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  );
}

function formatDistance(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} km`;
  }

  return `${Math.round(value).toLocaleString("id-ID")} m`;
}

function formatDuration(value: number): string {
  const totalMinutes = Math.max(1, Math.round(value / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}
