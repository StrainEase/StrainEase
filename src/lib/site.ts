/** Canonical public origin. Used for sitemap, Open Graph, JSON-LD, and llms.txt. */
export const SITE_ORIGIN = "https://strainease.ai";

export const SITE_NAME = "StrainEase";

export const SITE_TAGLINE = "Compare Cannabis Strains for Medical Relief";

export const SITE_DESCRIPTION =
  "StrainEase helps medical cannabis patients compare strains for their symptoms, aggregating research from Leafly, Weedmaps, Reddit, Google, and dispensary menus.";

export const SITE_OG_IMAGE_PATH = "/og-image.jpg";

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function documentTitle(page?: string): string {
  if (!page) return `${SITE_NAME} — ${SITE_TAGLINE}`;
  return `${page} — ${SITE_NAME}`;
}

export function ogImageUrl(path = SITE_OG_IMAGE_PATH): string {
  return absoluteUrl(path);
}
