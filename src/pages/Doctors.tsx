import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { findDoctors, type Doctor, type DoctorResult } from "@/lib/strain-api";
import { ArrowLeft, Loader2, MapPin, Navigation, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type Status = "idle" | "locating" | "searching" | "ready" | "error";

const DEFAULT_RADIUS_MI = 25;
const LAST_LOCATION_KEY = "sw.doctors.lastLocation";

type SavedLocation = { city: string; state: string; lat: number; lon: number };

function loadSavedLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLocation;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      typeof parsed.city === "string" &&
      typeof parsed.state === "string"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveLocation(loc: SavedLocation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
  } catch {
    // storage may be unavailable; not fatal
  }
}

export default function Doctors() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DoctorResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MI);

  useEffect(() => {
    const saved = loadSavedLocation();
    if (saved) {
      setManualCity(saved.city);
      setManualState(saved.state);
    }
  }, []);

  const runSearch = useCallback(
    async (next: {
      lat?: number;
      lon?: number;
      city?: string;
      state?: string;
    }) => {
      setStatus("searching");
      setError(null);
      try {
        const res = await findDoctors({
          lat: next.lat,
          lon: next.lon,
          city: next.city,
          state: next.state,
          radiusMiles: radius,
        });
        setResult(res);
        if (res.resolvedLocation) {
          saveLocation(res.resolvedLocation);
        }
        setStatus("ready");
        if (res.doctors.length === 0) {
          toast.message("No clinics found within that radius.", {
            description: "Try a wider search or a different city.",
          });
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't reach the doctors directory.",
        );
        setStatus("error");
      }
    },
    [radius],
  );

  const useDeviceLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This browser doesn't support geolocation.");
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        void runSearch({ lat, lon });
      },
      (geoError) => {
        setStatus("idle");
        toast.error("Couldn't read your location.", {
          description:
            geoError.code === geoError.PERMISSION_DENIED
              ? "Allow location access in your browser, or search by city instead."
              : geoError.message,
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [runSearch]);

  const submitManual = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const city = manualCity.trim();
      const state = manualState.trim();
      if (!city || !state) {
        toast.error("Enter a city and state.");
        return;
      }
      setCoords(null);
      void runSearch({ city, state });
    },
    [manualCity, manualState, runSearch],
  );

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55%_40%_at_80%_0%,oklch(0.86_0.07_158/0.32),transparent_62%),radial-gradient(40%_32%_at_8%_18%,oklch(0.9_0.04_140/0.22),transparent_70%)]"
      />
      <AppHeader active="home" />
      <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-5 cursor-pointer rounded-full text-muted-foreground"
        >
          <Link to="/">
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </Button>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Doctors
          </p>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            Find a medical-marijuana doctor
          </h1>
          <p className="max-w-xl text-[15px] leading-6 text-muted-foreground">
            Live listings from Leafly's public doctors directory. Use your
            location for the closest clinics, or search by city.
          </p>
        </div>

        <form
          onSubmit={submitManual}
          className="mt-6 rounded-2xl border border-border/70 bg-card p-5"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                City
              </span>
              <input
                value={manualCity}
                onChange={(event) => setManualCity(event.target.value)}
                placeholder="Denver"
                className="h-11 rounded-full border border-border/70 bg-background px-4 text-sm focus:border-primary/40 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                State
              </span>
              <input
                value={manualState}
                onChange={(event) => setManualState(event.target.value)}
                placeholder="CO"
                maxLength={32}
                className="h-11 rounded-full border border-border/70 bg-background px-4 text-sm focus:border-primary/40 focus:outline-none"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={status === "searching"}
                className="h-11 w-full cursor-pointer rounded-full"
              >
                {status === "searching" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useDeviceLocation}
              disabled={status === "locating" || status === "searching"}
              className="cursor-pointer rounded-full"
            >
              {status === "locating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Navigation className="size-4" />
              )}
              Use my location
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Within
              <select
                value={radius}
                onChange={(event) =>
                  setRadius(Number.parseInt(event.target.value, 10))
                }
                className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm focus:border-primary/40 focus:outline-none"
              >
                <option value="10">10 mi</option>
                <option value="25">25 mi</option>
                <option value="50">50 mi</option>
                <option value="100">100 mi</option>
              </select>
            </label>
          </div>
        </form>

        <div className="mt-6">
          {status === "searching" && <SkeletonLines variant="doctor-list" />}
          {status === "error" && error && (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
              {error}
            </p>
          )}
          {status === "ready" && result && (
            <DoctorResults result={result} radius={radius} coords={coords} />
          )}
        </div>
      </div>
      <AppTabBar active="home" />
    </main>
  );
}

function DoctorResults({
  result,
  radius,
  coords,
}: {
  result: DoctorResult;
  radius: number;
  coords: { lat: number; lon: number } | null;
}) {
  if (result.doctors.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          No clinics within {radius} miles
          {result.resolvedLocation
            ? ` of ${result.resolvedLocation.city}, ${result.resolvedLocation.state}.`
            : "."}
        </p>
        <p className="mt-2">
          Try a wider radius, a different city, or{" "}
          <a
            href={leaflyDirectoryHref(result.resolvedLocation)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            browse Leafly's full directory
          </a>
          .
        </p>
      </div>
    );
  }

  const headerLine = result.resolvedLocation
    ? `${result.doctors.length} clinic${result.doctors.length === 1 ? "" : "s"} near ${result.resolvedLocation.city}, ${result.resolvedLocation.state}`
    : `${result.doctors.length} clinic${result.doctors.length === 1 ? "" : "s"}`;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{headerLine}</span>
        {coords && (
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
            <MapPin className="size-3" />
            Sorted from your location
          </Badge>
        )}
      </header>
      <ul className="space-y-3">
        {result.doctors.map((doctor, index) => (
          <motion.li
            key={doctor.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4 }}
            className="rounded-2xl border border-border/70 bg-card p-5"
          >
            <DoctorCard doctor={doctor} />
          </motion.li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Listings from{" "}
        <a
          href={leaflyDirectoryHref(result.resolvedLocation)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Leafly's medical-marijuana doctor directory
        </a>
        . Always verify licensing and book directly with the clinic.
      </p>
    </section>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const rating =
    typeof doctor.rating === "number" && doctor.rating > 0
      ? doctor.rating.toFixed(1)
      : null;
  const reviews =
    typeof doctor.reviewCount === "number" && doctor.reviewCount > 0
      ? doctor.reviewCount
      : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">{doctor.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[doctor.street, doctor.city, doctor.state, doctor.zip]
              .filter((part) => Boolean(part) && part !== "")
              .join(", ")}
          </p>
        </div>
        {typeof doctor.distanceMi === "number" && (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <MapPin className="size-3" />
            {doctor.distanceMi.toFixed(1)} mi
          </Badge>
        )}
      </div>
      {(rating || doctor.reviewSnippet) && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {rating && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="size-3.5 fill-current text-primary" strokeWidth={0} />
              {rating}
              {reviews !== null && (
                <span className="text-muted-foreground"> ({reviews})</span>
              )}
            </span>
          )}
          {doctor.reviewSnippet && (
            <span className="line-clamp-2 max-w-prose italic">
              “{doctor.reviewSnippet}”
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          size="sm"
          className="cursor-pointer rounded-full"
        >
          <a href={doctor.url} target="_blank" rel="noopener noreferrer">
            View on Leafly
          </a>
        </Button>
        {typeof doctor.lat === "number" && typeof doctor.lon === "number" && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="cursor-pointer rounded-full"
          >
            <a
              href={mapsHref(doctor)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Maps
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function mapsHref(doctor: Doctor): string {
  const q = encodeURIComponent(
    [doctor.name, doctor.street, doctor.city, doctor.state, doctor.zip]
      .filter(Boolean)
      .join(", "),
  );
  return `https://maps.apple.com/?q=${q}`;
}

function leaflyDirectoryHref(
  resolved: DoctorResult["resolvedLocation"],
): string {
  if (!resolved) {
    return "https://www.leafly.com/medical-marijuana-doctors";
  }
  const state = resolved.state
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const city = resolved.city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `https://www.leafly.com/medical-marijuana-doctors/${state}/${city}`;
}
