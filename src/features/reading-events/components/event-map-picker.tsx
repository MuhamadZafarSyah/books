"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
  type MapRef,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

/**
 * Hasil tunggal dari endpoint geocoding `/api/reading-events/geocode`.
 *
 * Bentuknya selaras dengan kontrak route handler: nama tempat lengkap dari
 * Nominatim plus pasangan koordinat numerik.
 */
type GeocodeResult = {
  displayName: string;
  lat: number;
  lng: number;
};

type EventMapPickerProps = {
  /** Nilai latitude saat ini dari form. `undefined` saat belum ada koordinat. */
  latitude: number | undefined;
  /** Nilai longitude saat ini dari form. `undefined` saat belum ada koordinat. */
  longitude: number | undefined;
  /** Alamat tekstual saat ini. Boleh kosong saat user belum memilih lokasi. */
  locationAddress: string;
  /**
   * Callback satu pintu yang dipanggil setiap kali nilai berubah dari
   * interaksi peta, pemilihan hasil pencarian, atau input fallback manual.
   *
   * Field yang tidak diubah tetap dikirim dengan nilai semula agar parent
   * cukup memanggil satu `setValue` per field di react-hook-form.
   */
  onChange: (next: {
    latitude: number;
    longitude: number;
    locationAddress: string;
  }) => void;
  /** Disable seluruh kontrol (misalnya saat form sedang submit). */
  disabled?: boolean;
  className?: string;
};

/**
 * Koordinat pusat default ketika user belum memilih lokasi (Yogyakarta).
 * Dipilih sebagai titik representatif Indonesia agar peta tidak membuka
 * di tengah samudera saat form pertama kali tampil.
 */
const DEFAULT_CENTER: [number, number] = [110.3695, -7.7956];
const DEFAULT_ZOOM = 11;
const FOCUS_ZOOM = 15;
const SEARCH_DEBOUNCE_MS = 300;
const LOAD_TIMEOUT_MS = 8000;
const MIN_QUERY_LENGTH = 2;

/**
 * Map_Component edit-mode untuk Event_Form (Requirement 2.1–2.7).
 *
 * Tanggung jawab komponen:
 * - Menyediakan peta interaktif dengan marker yang merepresentasikan
 *   `latitude`/`longitude` saat ini (Requirement 2.1).
 * - Klik pada peta menulis koordinat baru ke parent (Requirement 2.2).
 * - Search box internal yang men-debounce 300 ms ke `/api/reading-events/geocode`;
 *   memilih hasil mengisi `locationAddress`, `latitude`, dan `longitude`
 *   sekaligus (Requirement 2.3, 2.4).
 * - Jika peta gagal dimuat dalam 8 detik, render fallback panel berisi input
 *   manual untuk alamat dan koordinat (Requirement 2.5). Saat fallback aktif,
 *   input manual dapat diedit; saat peta sukses dimuat, input manual hanya
 *   menampilkan nilai (read-only) sehingga koordinat hanya bisa diubah lewat
 *   peta (Requirement 2.6).
 * - Validasi `latitude`/`longitude` terisi tetap dilakukan oleh skema Zod
 *   parent; komponen ini hanya memastikan nilai konsisten (Requirement 2.7).
 */
export function EventMapPicker({
  latitude,
  longitude,
  locationAddress,
  onChange,
  disabled = false,
  className,
}: EventMapPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounceValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  /**
   * Ref ke instance MapLibre supaya `handleSelectResult` bisa memanggil
   * `flyTo` secara imperatif saat user memilih hasil pencarian — efek
   * yang sama seperti Google Maps yang animate kamera ke titik tujuan.
   * Sengaja tidak dipakai untuk klik di peta (karena titik klik sudah
   * berada di tampilan saat itu, fly lagi malah membuat kamera bergerak
   * tanpa alasan).
   */
  const mapRef = useRef<MapRef | null>(null);

  const searchListId = useId();

  /**
   * Refs untuk callback agar inner map handlers tidak perlu
   * re-attach setiap kali parent mengirim onChange baru. Refs di-update
   * lewat efek (bukan saat render) untuk mematuhi aturan React 19.
   */
  const onChangeRef = useRef(onChange);
  const locationAddressRef = useRef(locationAddress);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    locationAddressRef.current = locationAddress;
  }, [locationAddress]);

  /** Timer 8 detik untuk Requirement 2.5: tandai gagal jika map belum load. */
  useEffect(() => {
    if (mapLoaded) return;
    const timer = window.setTimeout(() => {
      setLoadFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mapLoaded]);

  /**
   * Forward-geocoding dengan debounce 300 ms (Requirement 2.3, 2.4).
   *
   * Seluruh setState sengaja di-defer ke microtask via `Promise.resolve()`
   * supaya tidak dipanggil sinkron dari body effect (`react-hooks/set-state-in-effect`).
   * `signal.aborted` dipakai untuk mengabaikan response stale ketika query
   * berubah cepat.
   */
  useEffect(() => {
    const query = debouncedSearch.trim();
    const controller = new AbortController();

    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;

      if (query.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `/api/reading-events/geocode?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as {
          results?: GeocodeResult[];
        };
        if (controller.signal.aborted) return;

        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        if (controller.signal.aborted) return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    });

    return () => controller.abort();
  }, [debouncedSearch]);

  const hasCoordinates =
    typeof latitude === "number" && typeof longitude === "number";

  /**
   * Viewport peta. Menggunakan koordinat saat ini saat tersedia, fallback ke
   * koordinat default Indonesia. Sengaja tidak controlled (tidak meneruskan
   * `onViewportChange`) agar pan/zoom user tidak dipantulkan kembali; saat
   * koordinat berubah dari luar (misalnya pilih hasil pencarian), peta akan
   * jumpTo ke nilai baru via `Map`'s controlled re-sync.
   */
  const viewport = useMemo(
    () => ({
      center: hasCoordinates
        ? ([longitude, latitude] as [number, number])
        : DEFAULT_CENTER,
      zoom: hasCoordinates ? 14 : DEFAULT_ZOOM,
    }),
    [hasCoordinates, latitude, longitude],
  );

  const handleSelectResult = useCallback(
    (result: GeocodeResult) => {
      onChange({
        latitude: result.lat,
        longitude: result.lng,
        locationAddress: result.displayName,
      });
      setSearchInput(result.displayName);
      setResults([]);

      // Fly kamera ke titik hasil pencarian. `flyTo` MapLibre menganimasikan
      // perubahan center + zoom dalam satu gerakan halus. Aman dipanggil
      // tanpa menunggu `mapLoaded` karena MapLibre antri perintah hingga
      // style siap; tetapi kita tetap cek `current` untuk menghindari
      // panggilan saat fallback aktif (peta unmount).
      mapRef.current?.flyTo({
        center: [result.lng, result.lat],
        zoom: FOCUS_ZOOM,
        speed: 1.4,
        curve: 1.42,
        essential: true,
      });
    },
    [onChange],
  );

  const handleManualAddressChange = useCallback(
    (value: string) => {
      onChange({
        latitude: latitude ?? Number.NaN,
        longitude: longitude ?? Number.NaN,
        locationAddress: value,
      });
    },
    [latitude, longitude, onChange],
  );

  const handleManualCoordinateChange = useCallback(
    (axis: "lat" | "lng", raw: string) => {
      const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
      onChange({
        latitude:
          axis === "lat" ? parsed : (latitude ?? Number.NaN),
        longitude:
          axis === "lng" ? parsed : (longitude ?? Number.NaN),
        locationAddress,
      });
    },
    [latitude, longitude, locationAddress, onChange],
  );

  const handleMapPick = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      onChangeRef.current({
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationAddress: locationAddressRef.current,
      });
    },
    [],
  );

  const handleMapLoaded = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const manualInputsDisabled = disabled || (!loadFailed && mapLoaded);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label htmlFor={`${searchListId}-search`}>Cari alamat</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={`${searchListId}-search`}
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Ketik nama tempat atau alamat"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            disabled={disabled}
            aria-controls={searchListId}
            aria-expanded={results.length > 0}
            className="pl-6 pr-8"
          />
          {searching ? (
            <Loader2
              aria-hidden
              className="absolute top-1/2 right-0 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : null}
        </div>
        {results.length > 0 ? (
          <ul
            id={searchListId}
            role="listbox"
            aria-label="Hasil pencarian alamat"
            className="overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-sm"
          >
            {results.map((result) => (
              <li key={`${result.lat},${result.lng}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={
                    locationAddress === result.displayName ? "true" : "false"
                  }
                  onClick={() => handleSelectResult(result)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm transition-colors duration-200",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span className="line-clamp-2">{result.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        className={cn(
          "relative h-72 w-full overflow-hidden rounded-2xl border border-border",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {loadFailed ? (
          <div className="flex h-full items-center justify-center bg-muted/40 px-6 text-center text-sm text-muted-foreground">
            <p>
              Peta tidak dapat dimuat. Silakan masukkan alamat dan koordinat
              secara manual di bawah ini.
            </p>
          </div>
        ) : (
          <Map ref={mapRef} viewport={viewport}>
            <MapControls position="top-right" />
            <MapClickHandler onPick={handleMapPick} disabled={disabled} />
            <MapLoadDetector onLoaded={handleMapLoaded} />
            {hasCoordinates ? (
              <MapMarker longitude={longitude} latitude={latitude}>
                <MarkerContent>
                  <MapPin
                    className="fill-[#8fb89e] shadow-md"
                    size={28}
                  />
                </MarkerContent>
              </MapMarker>
            ) : null}
          </Map>
        )}
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor={`${searchListId}-address`}>Alamat lokasi</Label>
          <Input
            id={`${searchListId}-address`}
            value={locationAddress}
            onChange={(event) => handleManualAddressChange(event.target.value)}
            placeholder="Contoh: Perpustakaan Nasional, Jakarta"
            disabled={manualInputsDisabled}
            readOnly={!loadFailed && mapLoaded}
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${searchListId}-lat`}>Latitude</Label>
          <Input
            id={`${searchListId}-lat`}
            type="number"
            inputMode="decimal"
            step="any"
            min={-90}
            max={90}
            value={typeof latitude === "number" ? latitude : ""}
            onChange={(event) =>
              handleManualCoordinateChange("lat", event.target.value)
            }
            disabled={manualInputsDisabled}
            readOnly={!loadFailed && mapLoaded}
            placeholder="-7.7956"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${searchListId}-lng`}>Longitude</Label>
          <Input
            id={`${searchListId}-lng`}
            type="number"
            inputMode="decimal"
            step="any"
            min={-180}
            max={180}
            value={typeof longitude === "number" ? longitude : ""}
            onChange={(event) =>
              handleManualCoordinateChange("lng", event.target.value)
            }
            disabled={manualInputsDisabled}
            readOnly={!loadFailed && mapLoaded}
            placeholder="110.3695"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {loadFailed
          ? "Peta tidak tersedia. Isi alamat dan koordinat secara manual."
          : "Klik di peta untuk menetapkan lokasi atau pilih hasil pencarian di atas."}
      </p>
    </div>
  );
}

/**
 * Child internal yang memasang `click` listener pada instance MapLibre
 * begitu peta tersedia. Dipisah jadi komponen sendiri agar bisa memakai
 * `useMap()` (hanya valid di dalam `<Map>`).
 */
function MapClickHandler({
  onPick,
  disabled,
}: {
  onPick: (coords: { latitude: number; longitude: number }) => void;
  disabled: boolean;
}) {
  const { map, isLoaded } = useMap();

  // Ref agar handler tidak re-attach saat callback parent berubah; ref
  // di-update lewat efek untuk menghindari mutasi saat render.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!map || !isLoaded || disabled) return;

    const handler = (event: { lngLat: { lng: number; lat: number } }) => {
      onPickRef.current({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    };

    map.on("click", handler);
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";

    return () => {
      map.off("click", handler);
      canvas.style.cursor = previousCursor;
    };
  }, [map, isLoaded, disabled]);

  return null;
}

/**
 * Child internal yang menandai parent ketika peta benar-benar siap dipakai.
 * Memakai `isLoaded` dari `useMap()` (gabungan event `load` + `styledata`)
 * sehingga timer 8 detik di parent dapat membandingkan terhadap kondisi
 * peta yang sungguh-sungguh interaktif, bukan sekadar div ter-mount.
 */
function MapLoadDetector({ onLoaded }: { onLoaded: () => void }) {
  const { isLoaded } = useMap();
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    if (isLoaded) onLoadedRef.current();
  }, [isLoaded]);

  return null;
}
