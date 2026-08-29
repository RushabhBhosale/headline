import { findTrustedSource } from "../sources";
import type { ExtractedImageCandidate, OfficialSource, ReviewCandidate, SearchResult, SourcePage } from "../types";

const MAX_SOURCE_PAGES = 10;
const MAX_HTML_BYTES = 1_500_000;
const MAX_CANDIDATES_PER_PAGE = 24;
const IMAGE_URL_PATTERN = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i;
const DISALLOWED_IMAGE_PATTERN = /(?:favicon|logo|icon|avatar|sprite|pixel|tracking|advert|banner-ad)/i;

type ExtractionResult = {
  candidates: ExtractedImageCandidate[];
  reviewCandidates: ReviewCandidate[];
};

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeEntities(match?.[1] || match?.[2] || match?.[3] || "").trim() || undefined;
}

function resolveImageUrl(value: string | undefined, pageUrl: string) {
  if (!value || value.startsWith("data:")) return undefined;
  try {
    const url = new URL(value, pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function readSourceSet(value: string | undefined, pageUrl: string) {
  if (!value) return [];
  return value.split(",")
    .map((part) => part.trim().split(/\s+/))
    .map(([url, descriptor]) => ({
      url: resolveImageUrl(url, pageUrl),
      width: descriptor?.endsWith("w") ? Number.parseInt(descriptor, 10) : undefined,
    }))
    .filter((entry): entry is { url: string; width: number | undefined } => Boolean(entry.url));
}

function parseMeta(html: string, property: string) {
  const expression = new RegExp(`<meta\\b[^>]*(?:property|name)=["']${property}["'][^>]*>`, "gi");
  return [...html.matchAll(expression)].map((match) => getAttribute(match[0], "content")).filter((value): value is string => Boolean(value));
}

function readPageTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeEntities(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 300) : "";
}

function readPageText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, 5_000);
}

function collectStructuredImages(value: unknown, pageUrl: string, urls: string[] = [], depth = 0): string[] {
  if (depth > 8 || !value) return urls;
  if (typeof value === "string") {
    const image = resolveImageUrl(value, pageUrl);
    if (image && IMAGE_URL_PATTERN.test(image)) urls.push(image);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStructuredImages(entry, pageUrl, urls, depth + 1));
    return urls;
  }
  if (typeof value !== "object") return urls;

  for (const [key, entry] of Object.entries(value)) {
    if (/^(?:image|thumbnailUrl|contentUrl|primaryImageOfPage)$/i.test(key)) {
      collectStructuredImages(entry, pageUrl, urls, depth + 1);
    } else if (typeof entry === "object") {
      collectStructuredImages(entry, pageUrl, urls, depth + 1);
    }
  }
  return urls;
}

function extractStructuredImages(html: string, pageUrl: string) {
  const urls: string[] = [];
  for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectStructuredImages(JSON.parse(script[1]), pageUrl, urls);
    } catch {
      // Structured data is optional and malformed publisher JSON is common.
    }
  }
  return urls;
}

function isUsableImageUrl(imageUrl: string) {
  return !DISALLOWED_IMAGE_PATTERN.test(imageUrl) && !/\.(?:svg|gif|ico)(?:$|[?#])/i.test(imageUrl);
}

function imageCandidate(imageUrl: string | undefined, sourcePage: SourcePage, attributes = "", declaredWidth?: number, declaredHeight?: number): ExtractedImageCandidate | undefined {
  if (!imageUrl || !isUsableImageUrl(imageUrl)) return undefined;
  const alt = getAttribute(attributes, "alt") || getAttribute(attributes, "title");
  return {
    imageUrl,
    alt,
    context: [alt, getAttribute(attributes, "class"), sourcePage.pageTitle].filter(Boolean).join(" ").slice(0, 800),
    sourcePage,
    declaredWidth,
    declaredHeight,
  };
}

function extractImageCandidates(html: string, sourcePage: SourcePage) {
  const candidates: ExtractedImageCandidate[] = [];
  const ogWidth = Number.parseInt(parseMeta(html, "og:image:width")[0] || "", 10) || undefined;
  const ogHeight = Number.parseInt(parseMeta(html, "og:image:height")[0] || "", 10) || undefined;
  const metaUrls = [
    ...parseMeta(html, "og:image"),
    ...parseMeta(html, "og:image:secure_url"),
    ...parseMeta(html, "twitter:image"),
    ...parseMeta(html, "twitter:image:src"),
  ];
  for (const value of metaUrls) {
    const candidate = imageCandidate(resolveImageUrl(value, sourcePage.url), sourcePage, "", ogWidth, ogHeight);
    if (candidate) candidates.push(candidate);
  }

  for (const url of extractStructuredImages(html, sourcePage.url)) {
    const candidate = imageCandidate(url, sourcePage);
    if (candidate) candidates.push(candidate);
  }

  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = match[0];
    const declaredWidth = Number.parseInt(getAttribute(tag, "width") || "", 10) || undefined;
    const declaredHeight = Number.parseInt(getAttribute(tag, "height") || "", 10) || undefined;
    const urls = [
      resolveImageUrl(getAttribute(tag, "src") || getAttribute(tag, "data-src") || getAttribute(tag, "data-lazy-src"), sourcePage.url),
      ...readSourceSet(getAttribute(tag, "srcset") || getAttribute(tag, "data-srcset"), sourcePage.url).map((entry) => entry.url),
    ];
    for (const imageUrl of urls) {
      const candidate = imageCandidate(imageUrl, sourcePage, tag, declaredWidth, declaredHeight);
      if (candidate) candidates.push(candidate);
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*href=["'][^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?["'][^>]*>/gi)) {
    const candidate = imageCandidate(resolveImageUrl(getAttribute(match[0], "href"), sourcePage.url), sourcePage, match[0]);
    if (candidate) candidates.push(candidate);
  }

  return candidates
    .filter((candidate, index, values) => values.findIndex((other) => other.imageUrl === candidate.imageUrl) === index)
    .slice(0, MAX_CANDIDATES_PER_PAGE);
}

async function readHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "HeadlineImageAutomation/1.0 (+https://www.headlinethread.co.in)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source page returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("Source page is not HTML");
  }
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_HTML_BYTES) throw new Error("Source page is too large");
  if (!response.body) throw new Error("Source page has no content");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error("Source page is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(data);
}

function getRightsEvidence(source: OfficialSource, pageUrl: string, pageText: string) {
  const haystack = `${pageUrl} ${pageText}`.toLowerCase();
  return source.rightsHints.filter((hint) => haystack.includes(hint.toLowerCase()));
}

function contextualText(pageText: string, expression: RegExp) {
  const match = pageText.match(expression);
  return match?.[0]?.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function extractCandidatesFromSourcePages(
  results: SearchResult[],
  sources: OfficialSource[],
  placement: "hero" | "body",
  query: string,
): Promise<ExtractionResult> {
  const candidates: ExtractedImageCandidate[] = [];
  const reviewCandidates: ReviewCandidate[] = [];
  const sourceResults = results
    .map((result) => ({ result, source: findTrustedSource(result.url, sources) }))
    .filter((item): item is { result: SearchResult; source: OfficialSource } => Boolean(item.source))
    .filter((item, index, values) => values.findIndex((other) => other.result.url === item.result.url) === index)
    .slice(0, MAX_SOURCE_PAGES);

  for (const { result, source } of sourceResults) {
    try {
      const html = await readHtml(result.url);
      const pageTitle = readPageTitle(html) || result.title;
      const pageText = readPageText(html);
      const rightsEvidence = getRightsEvidence(source, result.url, `${pageTitle} ${pageText}`);
      if (rightsEvidence.length === 0) {
        reviewCandidates.push({
          placement,
          query,
          sourcePageUrl: result.url,
          sourceDomain: source.domain,
          sourceName: source.name,
          reason: "Official source found, but the page does not show press, promotional, or public-information reuse evidence.",
        });
        continue;
      }

      const sourcePage: SourcePage = {
        url: result.url,
        title: result.title,
        description: result.description,
        source,
        pageTitle,
        pageText: pageText.slice(0, 1_000),
        publishedAt: result.publishedAt,
        rightsEvidence,
        licenseInfo: contextualText(pageText, /[^.]{0,160}\b(?:licen[cs]e|copyright|rights reserved)\b[^.]{0,220}/i),
        attributionRequirement: contextualText(pageText, /[^.]{0,160}\b(?:credit|attribution)\b[^.]{0,220}/i),
      };
      candidates.push(...extractImageCandidates(html, sourcePage));
    } catch (error) {
      reviewCandidates.push({
        placement,
        query,
        sourcePageUrl: result.url,
        sourceDomain: source.domain,
        sourceName: source.name,
        reason: error instanceof Error ? error.message : "Source page could not be read",
      });
    }
  }

  return { candidates, reviewCandidates };
}
