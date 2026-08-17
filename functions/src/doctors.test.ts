import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { __resetDoctorsCacheForTest, findDoctors, type Doctor } from "./doctors";

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response;

const originalFetch = globalThis.fetch;
let mockFetch: FetchMock | null = null;

function setFetch(fn: FetchMock) {
  mockFetch = fn;
  globalThis.fetch = fn as unknown as typeof fetch;
}

function restoreFetch() {
  mockFetch = null;
  globalThis.fetch = originalFetch;
}

beforeEach(() => {
  mockFetch = null;
  __resetDoctorsCacheForTest();
});

afterEach(() => {
  restoreFetch();
});

const SAMPLE_DOCTOR: Doctor = {
  id: "305123",
  name: "Doc Morrison",
  slug: "doc-morrison",
  url: "https://www.leafly.com/doctors/doc-morrison",
  street: "2909 Sheridan Blvd",
  city: "Wheat Ridge",
  state: "CO",
  zip: "80214",
  lat: 39.7589363,
  lon: -105.0535268,
  distanceMi: 4.2,
  rating: 4.7,
  reviewCount: 12,
  reviewSnippet: "Friendly staff, easy visit.",
  logoUrl: "https://leafly-public.imgix.net/example.jpg",
  timezone: "America/Denver",
};

const SECOND_DOCTOR: Doctor = {
  ...SAMPLE_DOCTOR,
  id: "305456",
  name: "Canna Health Clinic",
  slug: "canna-health-clinic",
  url: "https://www.leafly.com/doctors/canna-health-clinic",
  street: "65 W Alameda St.",
  city: "Denver",
  state: "CO",
  zip: "80223",
  lat: 39.7114142,
  lon: -104.989292,
  distanceMi: 9.8,
  rating: 5,
  reviewCount: 1,
};

function buildLeaflyHtml(doctors: Doctor[]): string {
  const nextData = {
    props: {
      pageProps: {
        retailType: "clinic",
        isLocationPage: true,
        storeLocatorResults: {
          data: {
            organicStores: doctors.map((doctor) => ({
              id: Number(doctor.id) || doctor.id,
              slug: doctor.slug,
              name: doctor.name,
              path: `/doctors/${doctor.slug}`,
              address: {
                address1: doctor.street,
                city: doctor.city,
                state: doctor.state,
                zip: doctor.zip,
                lat: doctor.lat,
                lon: doctor.lon,
              },
              distanceMi: doctor.distanceMi,
              reviewRating: doctor.rating,
              reviewCount: doctor.reviewCount,
              reviewSnippet: doctor.reviewSnippet
                ? { text: doctor.reviewSnippet }
                : null,
              logoUrl: doctor.logoUrl,
              timeZone: doctor.timezone,
            })),
            sponsoredStores: [],
            spotlightStores: [],
          },
          metadata: {
            pagination: {
              currentCount: doctors.length,
              skip: 0,
              totalCount: doctors.length,
            },
          },
        },
      },
    },
  };
  const json = JSON.stringify(nextData).replace(/</g, "\\u003c");
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
}

describe("findDoctors with city+state", () => {
  test("returns parsed doctors from Leafly __NEXT_DATA__", async () => {
    setFetch(async (input) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("medical-marijuana-doctors/colorado/arvada")) {
        return new Response(buildLeaflyHtml([SAMPLE_DOCTOR, SECOND_DOCTOR]), {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await findDoctors({
      city: "Arvada",
      state: "Colorado",
      radiusMiles: 50,
    });

    expect(result.doctors).toHaveLength(2);
    expect(result.doctors[0]?.name).toBe("Doc Morrison");
    expect(result.doctors[0]?.url).toBe("https://www.leafly.com/doctors/doc-morrison");
    expect(result.resolvedLocation?.city).toBe("Arvada");
    expect(result.resolvedLocation?.state).toBe("Colorado");
  });
});

describe("findDoctors with lat/lon", () => {
  test("reverse-geocodes via Nominatim and re-ranks by haversine", async () => {
    let geocodeCalled = false;
    setFetch(async (input) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("nominatim.openstreetmap.org")) {
        geocodeCalled = true;
        return new Response(
          JSON.stringify({
            address: { city: "Arvada", state: "Colorado" },
            lat: "39.81",
            lon: "-105.11",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("medical-marijuana-doctors/colorado/arvada")) {
        return new Response(buildLeaflyHtml([SECOND_DOCTOR, SAMPLE_DOCTOR]), {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    // Arvada center (~39.81, -105.11). SAMPLE is closer than SECOND.
    const result = await findDoctors({
      lat: 39.8147,
      lon: -105.1168,
      radiusMiles: 30,
    });

    expect(geocodeCalled).toBe(true);
    expect(result.resolvedLocation?.city).toBe("Arvada");
    expect(result.doctors[0]?.name).toBe("Doc Morrison");
    expect(result.doctors[0]?.distanceMi).not.toBeNull();
    expect(result.doctors[0]!.distanceMi!).toBeLessThan(
      result.doctors[1]!.distanceMi!,
    );
  });

  test("filters out doctors past the radius", async () => {
    setFetch(async (input) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("nominatim.openstreetmap.org")) {
        return new Response(
          JSON.stringify({
            address: { city: "Arvada", state: "Colorado" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("medical-marijuana-doctors/colorado/arvada")) {
        // Two doctors; SECOND is much farther (Fort Morgan).
        const far: Doctor = {
          ...SECOND_DOCTOR,
          id: "far",
          name: "Far Away Clinic",
          slug: "far-away",
          city: "Fort Morgan",
          lat: 40.2501554,
          lon: -103.7998386,
        };
        return new Response(buildLeaflyHtml([SAMPLE_DOCTOR, far]), {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await findDoctors({
      lat: 39.8147,
      lon: -105.1168,
      radiusMiles: 15,
    });

    expect(result.doctors.map((d) => d.name)).toEqual(["Doc Morrison"]);
  });
});

describe("findDoctors error handling", () => {
  test("returns empty when Leafly 404s", async () => {
    setFetch(async (input) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("nominatim.openstreetmap.org")) {
        return new Response(
          JSON.stringify({
            address: { city: "Arvada", state: "Colorado" },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const result = await findDoctors({ lat: 39.8147, lon: -105.1168 });
    expect(result.doctors).toEqual([]);
  });

  test("returns empty when neither location nor coords are given", async () => {
    setFetch(async () => new Response("", { status: 200 }));
    const result = await findDoctors({});
    expect(result.doctors).toEqual([]);
    expect(result.resolvedLocation).toBeNull();
  });
});
