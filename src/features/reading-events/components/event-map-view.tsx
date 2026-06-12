"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MapPin, MapPinOff } from "lucide-react";

import {
  Map as MapComponent,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { EventRouteDialog } from "@/features/reading-events/components/event-route-dialog";
import { cn } from "@/lib/utils";

const FALLBACK_TIMEOUT_MS = 8000;

type EventMapViewProps = {
  /** Latitude of the event location, in [-90, 90]. */
  latitude: number;
  /** Longitude of the event location, in [-180, 180]. */
  longitude: number;
  /** Human-readable address of the event location. */
  locationAddress: string;
  className?: string;
};

/**
 * Read-only map for the event detail view.
 *
 * Renders a single non-draggable marker on a pannable/zoomable map. If the map
 * fails to load within 8 seconds (Requirement 2.5), a textual fallback panel
 * is shown with the event's address so the location is still legible.
 */
export function EventMapView({
  latitude,
  longitude,
  locationAddress,
  className,
}: EventMapViewProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (hasLoaded) return;
    const timer = setTimeout(() => {
      setLoadFailed(true);
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasLoaded]);

  const routeDialog = (
    <EventRouteDialog
      latitude={latitude}
      longitude={longitude}
      locationAddress={locationAddress}
    />
  );

  if (loadFailed && !hasLoaded) {
    return (
      <EventMapFallback locationAddress={locationAddress} className={className}>
        {routeDialog}
      </EventMapFallback>
    );
  }

  return (
    <div
      className={cn(
        "border-border relative h-72 w-full overflow-hidden rounded-2xl border lg:h-80",
        className,
      )}
    >
      <MapComponent
        viewport={{ center: [longitude, latitude], zoom: 14 }}
        interactive
      >
        <MapLoadDetector onLoaded={() => setHasLoaded(true)} />
        <MapMarker longitude={longitude} latitude={latitude} draggable={false}>
          <MarkerContent>
            <MapPin
              className="text-black! fill-[#8fb89e]!   shadow-md"
              size={28}
            />
          </MarkerContent>
        </MapMarker>
      </MapComponent>
      <div className="absolute right-3 bottom-3 z-10">{routeDialog}</div>
    </div>
  );
}

/**
 * Mounts inside the Map provider so it can read `isLoaded` and signal the
 * parent when the map (and its style) have finished loading. Used to cancel
 * the fallback timer.
 */
function MapLoadDetector({ onLoaded }: { onLoaded: () => void }) {
  const { isLoaded } = useMap();

  useEffect(() => {
    if (isLoaded) onLoaded();
  }, [isLoaded, onLoaded]);

  return null;
}

function EventMapFallback({
  locationAddress,
  className,
  children,
}: {
  locationAddress: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-border bg-muted/40 relative flex h-72 w-full flex-col justify-center gap-3 rounded-2xl border p-5 text-sm lg:h-80",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2">
        <MapPinOff className="size-4" aria-hidden="true" />
        <span className="font-medium">Peta tidak dapat dimuat</span>
      </div>
      <div className="flex items-start gap-2">
        <MapPin
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <p className="text-foreground leading-relaxed">{locationAddress}</p>
      </div>
      {children ? <div className="absolute right-3 bottom-3">{children}</div> : null}
    </div>
  );
}
