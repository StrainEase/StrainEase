import { useEffect } from "react";
import { SITE_NAME, absoluteUrl, ogImageUrl } from "@/lib/site";
import type { JsonLd } from "@/lib/seo";

type SeoProps = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
  jsonLd?: JsonLd;
};

type HeadTag = {
  attr: "name" | "property";
  key: string;
  content: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-route document metadata. Tags already present in index.html are
 * overwritten so SPA navigations replace the homepage defaults instead
 * of leaving stale description/OG values in the head.
 */
export function Seo({
  title,
  description,
  path,
  image,
  noindex = false,
  type = "website",
  jsonLd,
}: SeoProps) {
  const url = absoluteUrl(path);
  const ogImage = image ?? ogImageUrl();
  const robots = noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large";
  const serialized = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    document.title = title;
    upsertLink("canonical", url);
    const tags: HeadTag[] = [
      { attr: "name", key: "description", content: description },
      { attr: "name", key: "robots", content: robots },
      { attr: "property", key: "og:type", content: type },
      { attr: "property", key: "og:site_name", content: SITE_NAME },
      { attr: "property", key: "og:title", content: title },
      { attr: "property", key: "og:description", content: description },
      { attr: "property", key: "og:url", content: url },
      { attr: "property", key: "og:image", content: ogImage },
      { attr: "property", key: "og:image:alt", content: title },
      { attr: "property", key: "og:locale", content: "en_US" },
      { attr: "name", key: "twitter:card", content: "summary_large_image" },
      { attr: "name", key: "twitter:title", content: title },
      { attr: "name", key: "twitter:description", content: description },
      { attr: "name", key: "twitter:image", content: ogImage },
      { attr: "name", key: "twitter:image:alt", content: title },
    ];
    for (const tag of tags) upsertMeta(tag.attr, tag.key, tag.content);
  }, [title, description, url, ogImage, robots, type]);

  useEffect(() => {
    const id = "StrainEase-jsonld";
    const existing = document.getElementById(id);
    if (!serialized) {
      existing?.remove();
      return;
    }
    const el =
      existing instanceof HTMLScriptElement
        ? existing
        : document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    el.text = serialized;
    if (!el.isConnected) document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [serialized]);

  return null;
}
