export type ImageAutomationCategory =
  | "technology"
  | "anime"
  | "entertainment"
  | "sports"
  | "india-news"
  | "unknown";

export type ImageAutomationStatus = "pending" | "processing" | "complete" | "partial" | "manual-review" | "failed";

export type ArticleBodyBlock = {
  _key?: string;
  _type?: string;
  style?: string;
  children?: { text?: string }[];
  asset?: { _ref?: string };
};

export type ImageRequirements = {
  heroQuery?: string;
  bodyImageQueries?: string[];
};

export type ImageSourceRecord = {
  _key?: string;
  placement?: "hero" | "body";
  query?: string;
  sourcePageUrl?: string;
  sourceImageUrl?: string;
  sourceDomain?: string;
  sourceName?: string;
  licenseInfo?: string;
  attribution?: string;
  retrievedAt?: string;
  assetRef?: string;
  contentHash?: string;
  bodyBlockKey?: string;
};

export type ReviewCandidate = {
  placement: "hero" | "body";
  query: string;
  sourcePageUrl: string;
  sourceImageUrl?: string;
  sourceDomain: string;
  sourceName: string;
  reason: string;
  score?: number;
};

export type ArticleForImageAutomation = {
  _id: string;
  _type: string;
  _rev: string;
  title?: string;
  excerpt?: string;
  body?: ArticleBodyBlock[];
  category?: { title?: string; slug?: { current?: string } };
  topics?: { title?: string }[];
  heroImage?: { asset?: { _ref?: string } };
  heroImageAlt?: string;
  imageStatus?: ImageAutomationStatus;
  imageRequirements?: ImageRequirements;
  imageProcessing?: {
    workflowRunId?: string;
    status?: ImageAutomationStatus;
    lastAttemptAt?: string;
    completedAt?: string;
    error?: string;
    reviewReason?: string;
    sources?: ImageSourceRecord[];
    reviewCandidates?: ReviewCandidate[];
  };
};

export type SearchOptions = {
  domains?: string[];
  count?: number;
  scope?: "official" | "free-library";
  queryVariations?: string[];
};

export type SearchResult = {
  url: string;
  title: string;
  description?: string;
  publishedAt?: string;
  licenseInfo?: string;
  attributionRequirement?: string;
};

export type ArticleDiscovery = {
  category?: Exclude<ImageAutomationCategory, "unknown">;
  primaryEntity?: string;
  subject?: string;
  physicalSubject?: string;
  searchQuery?: string;
  preferredDomains: string[];
};

export type SearchDiscovery = {
  results: SearchResult[];
  analysis?: ArticleDiscovery;
};

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchDiscovery>;
}

export type OfficialSource = {
  name: string;
  domain: string;
  pathPrefix?: string;
  category: Exclude<ImageAutomationCategory, "unknown">;
  rightsHints: string[];
};

export type SourcePage = {
  url: string;
  title: string;
  description?: string;
  source: OfficialSource;
  pageTitle: string;
  pageText: string;
  publishedAt?: string;
  rightsEvidence: string[];
  licenseInfo?: string;
  attributionRequirement?: string;
};

export type ExtractedImageCandidate = {
  imageUrl: string;
  alt?: string;
  context?: string;
  sourcePage: SourcePage;
  declaredWidth?: number;
  declaredHeight?: number;
};

export type InspectedImageCandidate = ExtractedImageCandidate & {
  contentType: string;
  size: number;
  width: number;
  height: number;
  contentHash: string;
  score: number;
  relevance: number;
  rejectionReason?: string;
};

export type ProcessingPlan = {
  category: ImageAutomationCategory;
  primaryEntity: string;
  heroQuery: string;
  bodyImageQueries: string[];
  articleText: string;
};
