import type { ArticleDiscovery, ImageAutomationCategory, OfficialSource, SearchResult } from "./types";

type BrandSourceMap = Record<string, Omit<OfficialSource, "category">[]>;

export const brandSources: BrandSourceMap = {
  samsung: [
    { name: "Samsung Mobile Press", domain: "samsungmobilepress.com", rightsHints: ["press", "media", "newsroom"] },
    { name: "Samsung Newsroom", domain: "news.samsung.com", rightsHints: ["press", "newsroom", "media"] },
    { name: "Samsung", domain: "samsung.com", rightsHints: ["press", "media", "newsroom"] },
  ],
  apple: [
    { name: "Apple Newsroom", domain: "apple.com", pathPrefix: "/newsroom", rightsHints: ["press", "newsroom", "media"] },
    { name: "Apple", domain: "apple.com", rightsHints: ["press", "newsroom", "media"] },
  ],
  google: [
    { name: "Google Blog", domain: "blog.google", rightsHints: ["press", "media", "news"] },
    { name: "Google Store", domain: "store.google.com", rightsHints: ["press", "media", "product"] },
  ],
  oneplus: [{ name: "OnePlus", domain: "oneplus.com", rightsHints: ["press", "media", "news"] }],
  xiaomi: [{ name: "Xiaomi", domain: "mi.com", rightsHints: ["press", "media", "news"] }],
  nothing: [{ name: "Nothing", domain: "nothing.tech", rightsHints: ["press", "media", "news"] }],
  motorola: [{ name: "Motorola", domain: "motorola.com", rightsHints: ["press", "media", "news"] }],
  acer: [{ name: "Acer", domain: "acer.com", rightsHints: ["press", "media", "news"] }],
  asus: [{ name: "ASUS", domain: "asus.com", rightsHints: ["press", "media", "news"] }],
  lenovo: [{ name: "Lenovo", domain: "lenovo.com", rightsHints: ["press", "media", "news"] }],
  dell: [{ name: "Dell", domain: "dell.com", rightsHints: ["press", "media", "news"] }],
  hp: [{ name: "HP", domain: "hp.com", rightsHints: ["press", "media", "news"] }],
  microsoft: [{ name: "Microsoft News", domain: "news.microsoft.com", rightsHints: ["press", "media", "newsroom"] }],
  sony: [{ name: "Sony", domain: "sony.com", rightsHints: ["press", "media", "news"] }],
  nvidia: [{ name: "NVIDIA Newsroom", domain: "nvidianews.nvidia.com", rightsHints: ["press", "media", "newsroom"] }],
  amd: [{ name: "AMD Newsroom", domain: "amd.com", rightsHints: ["press", "media", "newsroom"] }],
  intel: [{ name: "Intel Newsroom", domain: "newsroom.intel.com", rightsHints: ["press", "media", "newsroom"] }],
  qualcomm: [{ name: "Qualcomm Newsroom", domain: "qualcomm.com", rightsHints: ["press", "media", "newsroom"] }],
};

const categorySources: Record<Exclude<ImageAutomationCategory, "unknown" | "technology">, OfficialSource[]> = {
  anime: [
    { name: "Aniplex", domain: "aniplex.co.jp", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
    { name: "Aniplex of America", domain: "aniplexusa.com", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
    { name: "Toei Animation", domain: "toei-anim.co.jp", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
    { name: "Toei Animation", domain: "toei-animation.com", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
    { name: "Kyoto Animation", domain: "kyoani.co.jp", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
    { name: "Crunchyroll News", domain: "crunchyroll.com", pathPrefix: "/news", category: "anime", rightsHints: ["press", "promotion", "key visual"] },
  ],
  entertainment: [
    { name: "Yash Raj Films", domain: "yashrajfilms.com", category: "entertainment", rightsHints: ["press", "media", "promotion", "poster"] },
    { name: "Red Chillies Entertainment", domain: "redchillies.com", category: "entertainment", rightsHints: ["press", "media", "promotion", "poster"] },
    { name: "T-Series", domain: "tseries.com", category: "entertainment", rightsHints: ["press", "media", "promotion", "poster"] },
    { name: "Netflix Media Center", domain: "media.netflix.com", category: "entertainment", rightsHints: ["press", "media", "promotion", "poster"] },
  ],
  sports: [
    { name: "ICC", domain: "icc-cricket.com", category: "sports", rightsHints: ["press", "media", "gallery"] },
    { name: "BCCI", domain: "bcci.tv", category: "sports", rightsHints: ["press", "media", "gallery"] },
    { name: "Indian Premier League", domain: "iplt20.com", category: "sports", rightsHints: ["press", "media", "gallery"] },
    { name: "FIFA", domain: "fifa.com", category: "sports", rightsHints: ["press", "media", "gallery"] },
    { name: "UEFA", domain: "uefa.com", category: "sports", rightsHints: ["press", "media", "gallery"] },
    { name: "Formula 1", domain: "formula1.com", category: "sports", rightsHints: ["press", "media", "gallery"] },
  ],
  "india-news": [
    { name: "Press Information Bureau", domain: "pib.gov.in", category: "india-news", rightsHints: ["press release", "photo gallery", "public information"] },
    { name: "India Portal", domain: "india.gov.in", category: "india-news", rightsHints: ["press release", "photo gallery", "public information"] },
    { name: "Government of India", domain: "gov.in", category: "india-news", rightsHints: ["press release", "photo gallery", "public information"] },
  ],
};

const categoryKeywords: Record<Exclude<ImageAutomationCategory, "unknown">, string[]> = {
  technology: ["technology", "tech", "gadget", "smartphone", "phone", "laptop", "computer", "electronics", "chip", "processor", "ai"],
  anime: ["anime", "manga", "otaku", "anime film", "anime series"],
  entertainment: ["bollywood", "film", "movie", "cinema", "actor", "actress", "trailer", "entertainment"],
  sports: ["sports", "cricket", "football", "fifa", "ipl", "formula 1", "tennis", "badminton", "match", "tournament"],
  "india-news": ["india", "government", "ministry", "pib", "policy", "parliament", "supreme court", "railway", "rbi", "sebi"],
};

export function detectCategory(value: string): ImageAutomationCategory {
  const text = value.toLowerCase();
  let best: ImageAutomationCategory = "unknown";
  let matches = 0;
  for (const [category, keywords] of Object.entries(categoryKeywords) as [Exclude<ImageAutomationCategory, "unknown">, string[]][]) {
    const score = keywords.filter((keyword) => text.includes(keyword)).length;
    if (score > matches) {
      best = category;
      matches = score;
    }
  }
  return best;
}

export function getTrustedSources(category: ImageAutomationCategory, articleText: string): OfficialSource[] {
  const sources: OfficialSource[] = [];
  if (category === "technology") {
    const normalized = articleText.toLowerCase();
    for (const [brand, brandEntries] of Object.entries(brandSources)) {
      if (normalized.includes(brand)) {
        sources.push(...brandEntries.map((entry) => ({ ...entry, category: "technology" as const })));
      }
    }
  } else if (category !== "unknown") {
    sources.push(...categorySources[category]);
  }

  return sources.filter((source, index) => sources.findIndex((candidate) => candidate.domain === source.domain && candidate.pathPrefix === source.pathPrefix) === index);
}

export function findTrustedSource(url: string, sources: OfficialSource[]) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return undefined;
    const host = parsed.hostname.toLowerCase();
    return sources.find((source) => {
      const domain = source.domain.toLowerCase();
      const matchesDomain = host === domain || host.endsWith(`.${domain}`);
      return matchesDomain && (!source.pathPrefix || parsed.pathname.startsWith(source.pathPrefix));
    });
  } catch {
    return undefined;
  }
}

const BLOCKED_DISCOVERY_DOMAINS = new Set([
  "pinterest.com",
  "reddit.com",
  "gettyimages.com",
  "reuters.com",
  "apnews.com",
  "afp.com",
  "espn.com",
  "cricbuzz.com",
]);

const DISCOVERED_SOURCE_RIGHTS_HINTS = ["press", "media", "newsroom", "promotion", "key visual", "photo gallery", "public information"];

function isMatchingDomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function normalizeDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) return undefined;
  if (BLOCKED_DISCOVERY_DOMAINS.has(domain) || [...BLOCKED_DISCOVERY_DOMAINS].some((blocked) => domain.endsWith(`.${blocked}`))) return undefined;
  return domain;
}

function entityDomainSignals(analysis: ArticleDiscovery) {
  return [analysis.primaryEntity, analysis.subject]
    .flatMap((value) => value?.toLowerCase().match(/[a-z0-9]{4,}/g) || [])
    .filter((value, index, values) => values.indexOf(value) === index);
}

function isPlausiblyOfficialDiscoveredDomain(domain: string, analysis: ArticleDiscovery) {
  if (analysis.category === "india-news" && (domain.endsWith(".gov.in") || domain.endsWith(".nic.in"))) return true;
  return entityDomainSignals(analysis).some((signal) => domain.includes(signal));
}

export function getDirectSourcePages(sources: OfficialSource[]): SearchResult[] {
  return sources
    .map((source) => ({
      url: `https://${source.domain}${source.pathPrefix || "/"}`,
      title: source.name,
      description: "Configured official source",
    }))
    .filter((result, index, values) => values.findIndex((candidate) => candidate.url === result.url) === index);
}

export function resolveOpenRouterSources(
  results: SearchResult[],
  discovery: ArticleDiscovery | undefined,
  configuredSources: OfficialSource[],
  fallbackCategory: ImageAutomationCategory,
) {
  if (!discovery) return { results: [] as SearchResult[], sources: [] as OfficialSource[] };
  const category = discovery.category || (fallbackCategory === "unknown" ? undefined : fallbackCategory);
  if (!category) return { results: [] as SearchResult[], sources: [] as OfficialSource[] };

  const configuredByDomain = configuredSources.reduce((entries, source) => {
    entries.set(source.domain, source);
    return entries;
  }, new Map<string, OfficialSource>());
  const discoveredDomains = discovery.preferredDomains
    .map(normalizeDomain)
    .filter((domain): domain is string => Boolean(domain));
  const sources = [...configuredSources];

  for (const domain of discoveredDomains) {
    if (configuredByDomain.has(domain) || sources.some((source) => source.domain === domain)) continue;
    if (!isPlausiblyOfficialDiscoveredDomain(domain, discovery)) continue;
    sources.push({
      name: domain,
      domain,
      category,
      rightsHints: DISCOVERED_SOURCE_RIGHTS_HINTS,
    });
  }

  const safeResults = results.filter((result) => {
    try {
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.username || url.password) return false;
      return sources.some((source) => isMatchingDomain(url.hostname.toLowerCase(), source.domain));
    } catch {
      return false;
    }
  });
  return { results: safeResults, sources };
}
