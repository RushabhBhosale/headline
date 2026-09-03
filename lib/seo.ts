import type { Metadata } from "next";
import type { SanityImageSource } from "@sanity/image-url";
import { urlForImage } from "@/sanity/lib/image";

export const SITE_URL = "https://www.headlinethread.co.in";
export const SITE_NAME = "Headline Thread";

export function canonicalUrl(path = "/") {
  return `${SITE_URL}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}`;
}

export function socialImageUrl(image?: SanityImageSource) {
  return image
    ? urlForImage(image).width(1200).height(630).url()
    : undefined;
}

export function normalizeInternalUrl(href?: string) {
  if (!href) return href;

  try {
    const url = new URL(href);
    if (url.hostname === "headlinethread.co.in" || url.hostname === "www.headlinethread.co.in") {
      return `${SITE_URL}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {}

  return href;
}

export function stringifyJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  image?: SanityImageSource;
}): Metadata {
  const url = canonicalUrl(path);
  const imageUrl = socialImageUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
