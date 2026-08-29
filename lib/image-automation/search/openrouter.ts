import type { ArticleDiscovery, SearchDiscovery, SearchOptions, SearchProvider, SearchResult } from "../types";

export const MAX_OPENROUTER_MODEL_CALLS_PER_ARTICLE = 2;

type OpenRouterCitation = {
  type?: string;
  url_citation?: {
    url?: string;
    title?: string;
    content?: string;
  };
};

type OpenRouterMessage = {
  content?: string | Array<{ text?: string }>;
  annotations?: OpenRouterCitation[];
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  error?: { message?: string };
};

export type OpenRouterDiscoveryContext = {
  title: string;
  articleText: string;
  category: string;
  primaryEntity: string;
  configuredDomains: string[];
};

export class OpenRouterSearchError extends Error {}

function textContent(value: OpenRouterMessage["content"]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((part) => part.text || "").join("\n");
  return "";
}

function clippedText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : undefined;
}

function parseJson(content: string) {
  const json = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new OpenRouterSearchError("OpenRouter returned invalid structured discovery output");
  }
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function parseDiscovery(content: string): ArticleDiscovery {
  const value = parseJson(content);
  const category = ["technology", "anime", "entertainment", "sports", "india-news"].includes(value.category as string)
    ? value.category as ArticleDiscovery["category"]
    : undefined;
  return {
    category,
    primaryEntity: clippedText(value.primaryEntity, 160),
    subject: clippedText(value.subject, 160),
    physicalSubject: clippedText(value.physicalSubject, 160),
    searchQuery: clippedText(value.searchQuery, 300),
    preferredDomains: Array.isArray(value.preferredDomains)
      ? value.preferredDomains.filter((domain): domain is string => typeof domain === "string").slice(0, 8)
      : [],
  };
}

function selectedSourceUrls(content: string) {
  const value = parseJson(content);
  const sourcePages = Array.isArray(value.sourcePages) ? value.sourcePages : [];
  return new Set(sourcePages
    .map((page) => typeof page === "object" && page !== null ? (page as { url?: unknown }).url : undefined)
    .filter((url): url is string => typeof url === "string")
    .map(normalizeUrl)
    .filter((url): url is string => Boolean(url)));
}

export class OpenRouterSearchProvider implements SearchProvider {
  private calls = 0;

  constructor(
    private readonly context: OpenRouterDiscoveryContext,
    private readonly apiKey = process.env.OPENROUTER_API_KEY,
  ) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchDiscovery> {
    if (!this.apiKey) throw new OpenRouterSearchError("OPENROUTER_API_KEY is not configured");
    if (this.calls >= MAX_OPENROUTER_MODEL_CALLS_PER_ARTICLE) {
      throw new OpenRouterSearchError(`OpenRouter call limit of ${MAX_OPENROUTER_MODEL_CALLS_PER_ARTICLE} per article reached`);
    }
    this.calls += 1;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://www.headlinethread.co.in",
        "X-Title": "Headline Article Image Automation",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: "You are a source-discovery assistant for an editorial image pipeline. Never generate images. Use web results only to identify real, official, press, promotional, or public-information source pages. Never suggest stock, Pinterest, Reddit, news competitors, Getty, Reuters, AP, AFP, ESPN, or Cricbuzz. Return only valid JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              article: {
                title: this.context.title,
                text: this.context.articleText.slice(0, 3_000),
                detectedCategory: this.context.category,
                detectedPrimaryEntity: this.context.primaryEntity,
              },
              requestedSearchQuery: query,
              configuredOfficialDomainsAlreadyTried: this.context.configuredDomains,
              task: "Use the web results to identify up to five relevant official source pages. If no exact image source exists, identify the main physical subject for a clearly relevant real-photo fallback and official/public-information source pages. Return exactly {category,primaryEntity,subject,physicalSubject,searchQuery,preferredDomains,sourcePages:[{url,title}]}. Only put URLs that were found in web results into sourcePages.",
            }),
          },
        ],
        plugins: [{
          id: "web",
          engine: "exa",
          mode: "auto",
          max_results: Math.min(Math.max(options.count || 5, 1), 5),
          exclude_domains: ["pinterest.com", "reddit.com", "gettyimages.com", "reuters.com", "apnews.com", "afp.com", "espn.com", "cricbuzz.com"],
        }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json() as OpenRouterResponse;
    if (!response.ok) throw new OpenRouterSearchError(payload.error?.message || `OpenRouter returned ${response.status}`);

    const message = payload.choices?.[0]?.message;
    const content = textContent(message?.content);
    if (!content) throw new OpenRouterSearchError("OpenRouter returned no discovery content");
    const analysis = parseDiscovery(content);
    const selectedUrls = selectedSourceUrls(content);
    const results = (message?.annotations || [])
      .filter((annotation) => annotation.type === "url_citation")
      .map((annotation) => ({
        url: normalizeUrl(annotation.url_citation?.url || ""),
        title: clippedText(annotation.url_citation?.title, 300) || "Official source result",
        description: clippedText(annotation.url_citation?.content, 1_000),
      }))
      .filter((result): result is { url: string; title: string; description: string | undefined } => Boolean(result.url))
      .filter((result) => selectedUrls.has(result.url))
      .filter((result, index, values) => values.findIndex((candidate) => candidate.url === result.url) === index);

    return { results, analysis };
  }
}
