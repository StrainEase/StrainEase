// Medical-marijuana doctor finder.
//
// Leafly's public doctors directory at /medical-marijuana-doctors/{state}/{city}
// embeds an `__NEXT_DATA__` JSON blob whose `initialState.search.results.dispensaries`
// array carries name, address, geo, distance, rating, and review snippet for
// the top 30 clinics nearest the chosen city. We read that blob defensively
// (Leafly can change HTML structure without notice) and reverse-geocode the
// caller's coordinates via OpenStreetMap Nominatim so we can pick the right
// {state, city} page when only lat/lon is supplied.
//
// Same posture as the Leafly / Weedmaps scrapes: read-only, no auth, returns
// partial/empty results rather than throwing when the markup shifts.

export type Doctor = {
  id: string;
  name: string;
  slug: string;
  url: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  distanceMi: number | null;
  rating: number | null;
  reviewCount: number | null;
  reviewSnippet: string | null;
  logoUrl: string | null;
  timezone: string | null;
};

export type DoctorQuery = {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  zip?: string;
  radiusMiles?: number;
};

export type DoctorResult = {
  doctors: Doctor[];
  resolvedLocation: { city: string; state: string; lat: number; lon: number } | null;
  source: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const CACHE_TTL_MS = 30 * 60 * 1000;
const pageCache = new Map<string, { at: number; data: Doctor[] }>();
const geocodeCache = new Map<string, { at: number; value: GeocodeResult | null }>();

/** Test-only: drop the in-memory page+geocode caches so each case starts clean. */
export function __resetDoctorsCacheForTest(): void {
  pageCache.clear();
  geocodeCache.clear();
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type GeocodeResult = { city: string; state: string; lat: number; lon: number };

async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = geocodeCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "StrainEase/1.0 (doctor-finder)", Accept: "application/json" },
  });
  if (!res.ok) {
    geocodeCache.set(key, { at: Date.now(), value: null });
    return null;
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const addr =
    raw.address && typeof raw.address === "object"
      ? (raw.address as Record<string, unknown>)
      : {};
  const city =
    (typeof addr.city === "string" && addr.city) ||
    (typeof addr.town === "string" && addr.town) ||
    (typeof addr.village === "string" && addr.village) ||
    (typeof addr.hamlet === "string" && addr.hamlet) ||
    (typeof addr.county === "string" && addr.county) ||
    "";
  const state = typeof addr.state === "string" ? addr.state : "";
  if (!city || !state) {
    geocodeCache.set(key, { at: Date.now(), value: null });
    return null;
  }
  const value: GeocodeResult = { city, state, lat, lon };
  geocodeCache.set(key, { at: Date.now(), value });
  return value;
}

async function fetchLeaflyDoctorsPage(stateSlug: string, citySlug: string): Promise<Doctor[]> {
  const cacheKey = `${stateSlug}/${citySlug}`;
  const hit = pageCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const path = `/medical-marijuana-doctors/${stateSlug}/${citySlug}`;
  const res = await fetch(`https://www.leafly.com${path}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) {
    pageCache.set(cacheKey, { at: Date.now(), data: [] });
    return [];
  }
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    pageCache.set(cacheKey, { at: Date.now(), data: [] });
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    pageCache.set(cacheKey, { at: Date.now(), data: [] });
    return [];
  }
  const props = parsed.props as Record<string, unknown> | undefined;
  const pageProps = props?.pageProps as Record<string, unknown> | undefined;
  // Leafly's current directory page embeds the structured clinic list at
  // props.pageProps.storeLocatorResults.data.organicStores. The old
  // props.initialState.search.results.dispensaries path is kept as a
  // fallback in case Leafly rolls back or splits the data between the two.
  const storeLocator = pageProps?.storeLocatorResults as
    | Record<string, unknown>
    | undefined;
  const locatorData = storeLocator?.data as Record<string, unknown> | undefined;
  const organicStores = Array.isArray(locatorData?.organicStores)
    ? (locatorData!.organicStores as unknown[])
    : null;
  const initialState = props?.initialState as Record<string, unknown> | undefined;
  const search = initialState?.search as Record<string, unknown> | undefined;
  const results = search?.results as Record<string, unknown> | undefined;
  const legacyStores = Array.isArray(results?.dispensaries)
    ? (results!.dispensaries as unknown[])
    : null;
  const dispensaries = organicStores ?? legacyStores ?? [];

  const doctors: Doctor[] = [];
  for (const raw of dispensaries) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === "number" ? String(row.id) : String(row.id ?? "");
    const slug = typeof row.slug === "string" ? row.slug : "";
    const name = typeof row.name === "string" ? row.name : "";
    const path = typeof row.path === "string" ? row.path : `/doctors/${slug}`;
    if (!name || !slug) continue;

    const addr =
      row.address && typeof row.address === "object"
        ? (row.address as Record<string, unknown>)
        : {};
    const lat = typeof addr.lat === "number" ? addr.lat : null;
    const lon = typeof addr.lon === "number" ? addr.lon : null;
    const distanceMi = typeof row.distanceMi === "number" ? row.distanceMi : null;
    const rating = typeof row.reviewRating === "number" ? row.reviewRating : null;
    const reviewCount = typeof row.reviewCount === "number" ? row.reviewCount : null;
    const reviewSnippet =
      row.reviewSnippet && typeof row.reviewSnippet === "object"
        ? (() => {
            const snip = row.reviewSnippet as Record<string, unknown>;
            return typeof snip.text === "string" ? snip.text : null;
          })()
        : null;
    const logoUrl = typeof row.logoUrl === "string" ? row.logoUrl : null;
    const timezone = typeof row.timeZone === "string" ? row.timeZone : null;

    doctors.push({
      id,
      name,
      slug,
      url: path.startsWith("http") ? path : `https://www.leafly.com${path}`,
      street: typeof addr.address1 === "string" ? addr.address1 : "",
      city: typeof addr.city === "string" ? addr.city : "",
      state: typeof addr.state === "string" ? addr.state : "",
      zip: typeof addr.zip === "string" ? addr.zip : "",
      lat,
      lon,
      distanceMi,
      rating,
      reviewCount,
      reviewSnippet,
      logoUrl,
      timezone,
    });
  }

  pageCache.set(cacheKey, { at: Date.now(), data: doctors });
  return doctors;
}

function stateNameToSlug(state: string): string {
  return slugify(state);
}

function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function findDoctors(query: DoctorQuery): Promise<DoctorResult> {
  const radius = typeof query.radiusMiles === "number" ? query.radiusMiles : 50;
  let resolved: { city: string; state: string; lat: number; lon: number } | null = null;

  if (
    typeof query.lat === "number" &&
    typeof query.lon === "number" &&
    Number.isFinite(query.lat) &&
    Number.isFinite(query.lon)
  ) {
    const geo = await reverseGeocode(query.lat, query.lon);
    if (geo) {
      resolved = { city: geo.city, state: geo.state, lat: query.lat, lon: query.lon };
    }
  }

  if (!resolved) {
    if (query.city && query.state) {
      const fallbackLat = typeof query.lat === "number" ? query.lat : 0;
      const fallbackLon = typeof query.lon === "number" ? query.lon : 0;
      resolved = {
        city: query.city,
        state: query.state,
        lat: fallbackLat,
        lon: fallbackLon,
      };
    }
  }

  if (!resolved) {
    return { doctors: [], resolvedLocation: null, source: "leafly.com/medical-marijuana-doctors" };
  }

  const stateSlug = stateNameToSlug(resolved.state);
  const citySlug = slugify(resolved.city);
  const doctors = await fetchLeaflyDoctorsPage(stateSlug, citySlug);

  let scored = doctors;
  if (resolved.lat !== 0 || resolved.lon !== 0) {
    scored = doctors
      .map((doctor) => {
        if (typeof doctor.lat === "number" && typeof doctor.lon === "number") {
          const miles = haversineMiles(
            { lat: resolved!.lat, lon: resolved!.lon },
            { lat: doctor.lat, lon: doctor.lon },
          );
          return { ...doctor, distanceMi: Math.round(miles * 10) / 10 };
        }
        return doctor;
      })
      .sort((a, b) => {
        const ad = a.distanceMi ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceMi ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      });
  }

  const filtered =
    resolved.lat !== 0 || resolved.lon !== 0
      ? scored.filter(
          (doctor) =>
            doctor.distanceMi === null || doctor.distanceMi <= radius,
        )
      : scored;

  return {
    doctors: filtered,
    resolvedLocation: resolved,
    source: `leafly.com/medical-marijuana-doctors/${stateSlug}/${citySlug}`,
  };
}
