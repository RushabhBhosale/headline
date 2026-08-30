import { wikimediaCommonsSource } from "../sources";
import type { ArticleDiscovery, ImageAutomationCategory, OfficialSource, SearchResult } from "../types";

const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const MAX_QUERY_VARIATIONS = 4;
const MAX_RESULTS_PER_VARIATION = 8;

type CommonsMetadata = Record<string, { value?: string }>;

type CommonsPage = {
  title?: string;
  fullurl?: string;
  imageinfo?: Array<{
    descriptionurl?: string;
    extmetadata?: CommonsMetadata;
  }>;
};

type CommonsResponse = {
  query?: { pages?: Record<string, CommonsPage> };
};

function plainText(value: string | undefined) {
  return value?.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function licenceMetadata(metadata: CommonsMetadata | undefined) {
  const licence = plainText(metadata?.LicenseShortName?.value) || plainText(metadata?.UsageTerms?.value);
  if (!licence || !/(?:creative commons|\bcc(?:[- ]?by|0)\b|public domain|gfdl|gnu free documentation)/i.test(licence)) return undefined;
  return licence.slice(0, 500);
}

function attributionMetadata(metadata: CommonsMetadata | undefined) {
  const artist = plainText(metadata?.Artist?.value);
  const credit = plainText(metadata?.Credit?.value);
  const requirement = [artist, credit].filter(Boolean).join("; ");
  return requirement ? requirement.slice(0, 800) : undefined;
}

function uniqueQueries(analysis: ArticleDiscovery | undefined, fallbackEntity: string) {
  const values = [
    analysis?.physicalSubject,
    analysis?.subject,
    analysis?.primaryEntity,
    fallbackEntity,
  ]
    .map((value) => value?.replace(/\s+/g, " ").trim())
    .filter((value): value is string => Boolean(value));
  return values.filter((value, index) => values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index).slice(0, MAX_QUERY_VARIATIONS);
}

export async function discoverWikimediaCommons(
  analysis: ArticleDiscovery | undefined,
  fallbackEntity: string,
  category: ImageAutomationCategory,
) {
  const results: SearchResult[] = [];
  for (const query of uniqueQueries(analysis, fallbackEntity)) {
    const parameters = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: query,
      gsrlimit: String(MAX_RESULTS_PER_VARIATION),
      prop: "info|imageinfo",
      inprop: "url",
      iiprop: "url|extmetadata",
      iiextmetadatalanguage: "en",
      origin: "*",
    });
    const response = await fetch(`${COMMONS_API_URL}?${parameters}`, {
      headers: { Accept: "application/json", "User-Agent": "HeadlineImageAutomation/1.0 (+https://www.headlinethread.co.in)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) continue;
    const payload = await response.json() as CommonsResponse;
    for (const page of Object.values(payload.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      const licence = licenceMetadata(info?.extmetadata);
      const url = info?.descriptionurl || page.fullurl;
      if (!licence || !url || !page.title) continue;
      results.push({
        url,
        title: page.title,
        description: `Wikimedia Commons: ${licence}`,
        licenseInfo: licence,
        attributionRequirement: attributionMetadata(info?.extmetadata),
      });
    }
  }

  return {
    results: results.filter((result, index, values) => values.findIndex((candidate) => candidate.url === result.url) === index),
    sources: [{ ...wikimediaCommonsSource, category: category === "unknown" ? "india-news" : category }] as OfficialSource[],
  };
}
