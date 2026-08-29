import { randomUUID } from "node:crypto";
import { getWorkflowMetadata } from "workflow";
import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";
import { uploadSanityImage } from "@/sanity/lib/imageUpload";
import { extractCandidatesFromSourcePages } from "@/lib/image-automation/extractors/source-page";
import { inspectAndRankCandidates } from "@/lib/image-automation/ranking/candidates";
import { OpenRouterSearchProvider } from "@/lib/image-automation/search/openrouter";
import { detectCategory, getDirectSourcePages, getTrustedSources, resolveOpenRouterSources } from "@/lib/image-automation/sources";
import type {
  ArticleBodyBlock,
  ArticleForImageAutomation,
  ArticleDiscovery,
  ImageAutomationStatus,
  ImageSourceRecord,
  InspectedImageCandidate,
  OfficialSource,
  ProcessingPlan,
  ReviewCandidate,
  SearchResult,
} from "@/lib/image-automation/types";

type ClaimResult =
  | { state: "claimed"; article: ArticleForImageAutomation }
  | { state: "complete" | "running" | "not-article" | "missing" };

type PlacementResult = {
  attached: boolean;
  imageUrl?: string;
  contentHash?: string;
  reviewCandidates: ReviewCandidate[];
  reason?: string;
  fallbackDiscovery?: FallbackDiscovery;
};

type FallbackDiscovery = {
  results: SearchResult[];
  sources: OfficialSource[];
  analysis?: ArticleDiscovery;
  error?: string;
};

function compactText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim().slice(0, 800) || "";
}

function bodyText(body: ArticleBodyBlock[] | undefined) {
  return (body || [])
    .filter((block) => block._type === "block")
    .map((block) => block.children?.map((child) => child.text || "").join(" ") || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function entityFromTitle(title: string) {
  return title
    .split(/\s(?:launches|announces|reveals|wins|beats|releases|confirms|reports|as|after|with)\s/i)[0]
    .replace(/[:|–—].*$/, "")
    .trim()
    .slice(0, 160) || title;
}

function automaticQuery(category: ProcessingPlan["category"], entity: string, body = false) {
  const suffix = body
    ? {
      technology: "official product detail press image",
      anime: "official key visual promotional image",
      entertainment: "official promotional still press image",
      sports: "official event media photo",
      "india-news": "official press photo public information",
      unknown: "official press image",
    }[category]
    : {
      technology: "official product press image",
      anime: "official key visual",
      entertainment: "official promotional poster or press still",
      sports: "official media photo",
      "india-news": "official press photo public information",
      unknown: "official press image",
    }[category];
  return `${entity} ${suffix}`.trim();
}

function makeSourceRecord(
  placement: "hero" | "body",
  query: string,
  candidate: InspectedImageCandidate,
  assetRef: string,
  bodyBlockKey?: string,
): ImageSourceRecord {
  return {
    _key: randomUUID().replaceAll("-", ""),
    placement,
    query,
    sourcePageUrl: candidate.sourcePage.url,
    sourceImageUrl: candidate.imageUrl,
    sourceDomain: candidate.sourcePage.source.domain,
    sourceName: candidate.sourcePage.source.name,
    licenseInfo: candidate.sourcePage.licenseInfo || `Reuse evidence: ${candidate.sourcePage.rightsEvidence.join(", ")}`,
    attribution: candidate.sourcePage.attributionRequirement || candidate.sourcePage.source.name,
    retrievedAt: new Date().toISOString(),
    assetRef,
    contentHash: candidate.contentHash,
    bodyBlockKey,
  };
}

function asSafeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Image processing failed";
  return message.replace(/\s+/g, " ").slice(0, 500);
}

function dedupeReviews(items: ReviewCandidate[]) {
  return items
    .filter((item, index, values) => values.findIndex((other) => `${other.placement}:${other.sourcePageUrl}:${other.sourceImageUrl || ""}:${other.reason}` === `${item.placement}:${item.sourcePageUrl}:${item.sourceImageUrl || ""}:${item.reason}`) === index)
    .slice(0, 15);
}

function bodyInsertionPoint(body: ArticleBodyBlock[] | undefined, query: string, title: string) {
  const queryWords = new Set(`${query} ${title}`.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  let best: { key: string; score: number } | undefined;
  for (const block of body || []) {
    if (block._type !== "block" || !block._key) continue;
    const text = block.children?.map((child) => child.text || "").join(" ").toLowerCase() || "";
    if (!text) continue;
    const score = [...queryWords].filter((word) => text.includes(word)).length + (block.style === "h2" || block.style === "h3" ? 1 : 0);
    if (score > (best?.score || 0)) best = { key: block._key, score };
  }
  return best?.score ? best.key : undefined;
}

async function claimArticle(articleId: string, workflowRunId: string): Promise<ClaimResult> {
  "use step";
  const client = getSanityServerClient();
  const article = await client.getDocument<ArticleForImageAutomation>(articleId);
  if (!article) return { state: "missing" };
  if (article._type !== "article") return { state: "not-article" };
  if (article.imageStatus === "complete") return { state: "complete" };
  if (article.imageStatus === "processing" && article.imageProcessing?.workflowRunId !== workflowRunId) return { state: "running" };

  if (article.imageStatus !== "processing") {
    const patch = client.patch(article._id).ifRevisionId(article._rev).set({
      imageStatus: "processing",
      imageProcessing: {
        ...article.imageProcessing,
        status: "processing",
        workflowRunId,
        lastAttemptAt: new Date().toISOString(),
      },
    });
    patch.unset(["imageProcessing.error"]);
    await patch.commit();
  }
  console.info("Image automation: article claimed", { articleId, workflowRunId });
  return { state: "claimed", article };
}

async function deriveProcessingPlan(article: ArticleForImageAutomation): Promise<ProcessingPlan> {
  "use step";
  const title = compactText(article.title);
  const content = bodyText(article.body);
  const categoryText = [article.category?.title, article.category?.slug?.current, ...((article.topics || []).map((topic) => topic.title))].filter(Boolean).join(" ");
  const category = detectCategory(`${categoryText} ${title} ${content.slice(0, 1_500)}`);
  const primaryEntity = entityFromTitle(title);
  const requirements = article.imageRequirements || {};
  const bodyQueries = (requirements.bodyImageQueries || [])
    .map((query) => compactText(query))
    .filter(Boolean)
    .slice(0, 2);
  if (bodyQueries.length === 0 && (article.body || []).filter((block) => block._type === "block").length >= 3) {
    bodyQueries.push(automaticQuery(category, primaryEntity, true));
  }

  const plan = {
    category,
    primaryEntity,
    heroQuery: compactText(requirements.heroQuery) || automaticQuery(category, primaryEntity),
    bodyImageQueries: bodyQueries,
    articleText: `${title} ${article.excerpt || ""} ${content}`.slice(0, 8_000),
  };
  console.info("Image automation: processing plan created", { articleId: article._id, category, primaryEntity, bodyImageCount: bodyQueries.length });
  return plan;
}

async function discoverWithOpenRouter(
  query: string,
  plan: ProcessingPlan,
  articleTitle: string,
  configuredSources: OfficialSource[],
): Promise<FallbackDiscovery> {
  "use step";
  try {
    const provider = new OpenRouterSearchProvider({
      title: articleTitle,
      articleText: plan.articleText,
      category: plan.category,
      primaryEntity: plan.primaryEntity,
      configuredDomains: configuredSources.map((source) => source.domain),
    });
    const discovery = await provider.search(query, { count: 5 });
    const resolved = resolveOpenRouterSources(discovery.results, discovery.analysis, configuredSources, plan.category);
    const error = resolved.results.length === 0
      ? "OpenRouter did not return a cited, validated official source page."
      : undefined;
    console.info("Image automation: OpenRouter fallback discovery complete", {
      query,
      results: resolved.results.length,
      sources: resolved.sources.length,
      category: discovery.analysis?.category,
      subject: discovery.analysis?.subject,
      physicalSubject: discovery.analysis?.physicalSubject,
    });
    return { ...resolved, analysis: discovery.analysis, error };
  } catch (error) {
    const message = asSafeError(error);
    console.warn("Image automation: OpenRouter fallback discovery unavailable", { query, error: message });
    return { results: [], sources: configuredSources, error: message };
  }
}

// The result is cached by the workflow after its one allowed discovery attempt.
// Never let a workflow-step retry make an additional paid web-search request.
Object.assign(discoverWithOpenRouter, { maxRetries: 0 });

async function extractOfficialCandidates(
  results: SearchResult[],
  sources: OfficialSource[],
  placement: "hero" | "body",
  query: string,
) {
  "use step";
  const extraction = await extractCandidatesFromSourcePages(results, sources, placement, query);
  console.info("Image automation: candidates extracted", { query, placement, candidates: extraction.candidates.length });
  return extraction;
}

async function selectCandidate(
  candidates: Awaited<ReturnType<typeof extractOfficialCandidates>>["candidates"],
  placement: "hero" | "body",
  query: string,
  articleTitle: string,
  primaryEntity: string,
  existingUrls: string[],
  existingHashes: string[],
) {
  "use step";
  const selection = await inspectAndRankCandidates(candidates, placement, query, articleTitle, primaryEntity, existingUrls, existingHashes);
  console.info("Image automation: candidate ranking complete", {
    query,
    placement,
    selected: selection.selected ? { imageUrl: selection.selected.imageUrl, score: selection.selected.score } : undefined,
    rejected: selection.reviewCandidates.map((candidate) => ({ imageUrl: candidate.sourceImageUrl, reason: candidate.reason, score: candidate.score })),
  });
  return selection;
}

async function attachCandidate(
  articleId: string,
  placement: "hero" | "body",
  query: string,
  candidate: InspectedImageCandidate,
  articleTitle: string,
) {
  "use step";
  const client = getSanityServerClient();
  const article = await client.getDocument<ArticleForImageAutomation>(articleId);
  if (!article || article._type !== "article") throw new Error("Article was not found while attaching image");
  const sources = article.imageProcessing?.sources || [];
  if (placement === "hero" && article.heroImage?.asset?._ref) {
    return { attached: true, imageUrl: candidate.imageUrl, contentHash: candidate.contentHash, reason: "Article already has a hero image" };
  }
  if (sources.some((source) => source.sourceImageUrl === candidate.imageUrl || source.contentHash === candidate.contentHash)) {
    return { attached: true, imageUrl: candidate.imageUrl, contentHash: candidate.contentHash, reason: "Image was already attached by a prior workflow attempt" };
  }

  const afterBlockKey = placement === "body" ? bodyInsertionPoint(article.body, query, articleTitle) : undefined;
  if (placement === "body" && !afterBlockKey) {
    return { attached: false, reason: "No relevant Portable Text block was found for body-image placement" };
  }

  const bodyImageKey = placement === "body" ? randomUUID().replaceAll("-", "") : undefined;
  const asset = await uploadSanityImage({
    imageUrl: candidate.imageUrl,
    alt: candidate.alt || articleTitle,
    caption: candidate.sourcePage.pageTitle || undefined,
    credit: candidate.sourcePage.source.name,
  });
  const record = makeSourceRecord(placement, query, candidate, asset.ref, bodyImageKey);
  const imageProcessing = {
    ...article.imageProcessing,
    sources: [...sources, record],
    lastAttemptAt: new Date().toISOString(),
  };
  const patch = client.patch(article._id).ifRevisionId(article._rev).set({ imageProcessing });

  if (placement === "hero") {
    patch.set({
      heroImage: { _type: "image", asset: { _type: "reference", _ref: asset.ref } },
      heroImageAlt: candidate.alt || articleTitle,
      heroImageCredit: candidate.sourcePage.source.name,
    });
    if (candidate.sourcePage.pageTitle) patch.set({ heroImageCaption: candidate.sourcePage.pageTitle });
    else patch.unset(["heroImageCaption"]);
  } else {
    const bodyImage = {
      _key: bodyImageKey!,
      _type: "image",
      asset: { _type: "reference", _ref: asset.ref },
      alt: candidate.alt || articleTitle,
      credit: candidate.sourcePage.source.name,
      ...(candidate.sourcePage.pageTitle ? { caption: candidate.sourcePage.pageTitle } : {}),
    };
    patch.insert("after", `body[_key == \"${afterBlockKey}\"]`, [bodyImage]);
  }
  await patch.commit();
  console.info("Image automation: Sanity asset uploaded and attached", { articleId, placement, assetId: asset.ref });
  return { attached: true, imageUrl: candidate.imageUrl, contentHash: candidate.contentHash };
}

async function finishProcessing(
  articleId: string,
  workflowRunId: string,
  status: ImageAutomationStatus,
  reviewReason?: string,
  reviewCandidates: ReviewCandidate[] = [],
  error?: string,
) {
  "use step";
  const client = getSanityServerClient();
  const article = await client.getDocument<ArticleForImageAutomation>(articleId);
  if (!article || article._type !== "article") return;
  const imageProcessing = {
    ...article.imageProcessing,
    workflowRunId,
    status,
    completedAt: new Date().toISOString(),
    reviewCandidates: dedupeReviews([...(article.imageProcessing?.reviewCandidates || []), ...reviewCandidates]),
  };
  const patch = client.patch(article._id).ifRevisionId(article._rev).set({ imageStatus: status, imageProcessing });
  if (reviewReason) patch.set({ "imageProcessing.reviewReason": reviewReason });
  else patch.unset(["imageProcessing.reviewReason"]);
  if (error) patch.set({ "imageProcessing.error": error });
  else patch.unset(["imageProcessing.error"]);
  await patch.commit();
  console.info("Image automation: workflow completed", { articleId, status, reviewCandidateCount: reviewCandidates.length });
}

async function processPlacement(
  article: ArticleForImageAutomation,
  plan: ProcessingPlan,
  placement: "hero" | "body",
  query: string,
  existingUrls: string[],
  existingHashes: string[],
  cachedFallback?: FallbackDiscovery,
): Promise<PlacementResult> {
  const sources = getTrustedSources(plan.category, plan.articleText);
  const reviewCandidates: ReviewCandidate[] = [];

  if (sources.length > 0) {
    const directExtraction = await extractOfficialCandidates(getDirectSourcePages(sources), sources, placement, query);
    const directSelection = await selectCandidate(
      directExtraction.candidates,
      placement,
      query,
      article.title || plan.primaryEntity,
      plan.primaryEntity,
      existingUrls,
      existingHashes,
    );
    reviewCandidates.push(...directExtraction.reviewCandidates, ...directSelection.reviewCandidates);
    if (directSelection.selected) {
      const attachment = await attachCandidate(article._id, placement, query, directSelection.selected, article.title || plan.primaryEntity);
      return { ...attachment, reviewCandidates, fallbackDiscovery: cachedFallback };
    }
  }

  const fallback = cachedFallback || await discoverWithOpenRouter(query, plan, article.title || plan.primaryEntity, sources);
  if (fallback.error) {
    return { attached: false, reason: fallback.error, reviewCandidates, fallbackDiscovery: fallback };
  }
  const fallbackExtraction = await extractOfficialCandidates(fallback.results, fallback.sources, placement, query);
  const fallbackSelection = await selectCandidate(
    fallbackExtraction.candidates,
    placement,
    query,
    article.title || plan.primaryEntity,
    fallback.analysis?.primaryEntity || plan.primaryEntity,
    existingUrls,
    existingHashes,
  );
  reviewCandidates.push(...fallbackExtraction.reviewCandidates, ...fallbackSelection.reviewCandidates);
  if (!fallbackSelection.selected) {
    return {
      attached: false,
      reason: "No rights-cleared, relevant direct or OpenRouter-discovered candidate met the automatic-publishing threshold.",
      reviewCandidates,
      fallbackDiscovery: fallback,
    };
  }

  const attachment = await attachCandidate(article._id, placement, query, fallbackSelection.selected, article.title || plan.primaryEntity);
  return { ...attachment, reviewCandidates, fallbackDiscovery: fallback };
}

export async function processArticleImagesWorkflow(articleId: string) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const claim = await claimArticle(articleId, workflowRunId);
  if (claim.state !== "claimed") return { articleId, status: claim.state };

  try {
    const plan = await deriveProcessingPlan(claim.article);
    const existingSources = claim.article.imageProcessing?.sources || [];
    const existingUrls = existingSources.map((source) => source.sourceImageUrl).filter((value): value is string => Boolean(value));
    const existingHashes = existingSources.map((source) => source.contentHash).filter((value): value is string => Boolean(value));
    const reviewCandidates: ReviewCandidate[] = [];
    let fallbackDiscovery: FallbackDiscovery | undefined;

    const hero = claim.article.heroImage?.asset?._ref
      ? { attached: true, reviewCandidates: [] }
      : await processPlacement(claim.article, plan, "hero", plan.heroQuery, existingUrls, existingHashes, fallbackDiscovery);
    fallbackDiscovery = hero.fallbackDiscovery || fallbackDiscovery;
    reviewCandidates.push(...hero.reviewCandidates);
    if (hero.imageUrl) existingUrls.push(hero.imageUrl);
    if (hero.contentHash) existingHashes.push(hero.contentHash);

    if (!hero.attached) {
      await finishProcessing(articleId, workflowRunId, "manual-review", hero.reason, reviewCandidates);
      return { articleId, status: "manual-review" };
    }

    let bodyFailures = 0;
    for (const bodyQuery of plan.bodyImageQueries) {
      const body = await processPlacement(claim.article, plan, "body", bodyQuery, existingUrls, existingHashes, fallbackDiscovery);
      fallbackDiscovery = body.fallbackDiscovery || fallbackDiscovery;
      reviewCandidates.push(...body.reviewCandidates);
      if (body.imageUrl) existingUrls.push(body.imageUrl);
      if (body.contentHash) existingHashes.push(body.contentHash);
      if (!body.attached) bodyFailures += 1;
    }

    const status: ImageAutomationStatus = bodyFailures > 0 ? "partial" : "complete";
    const reason = bodyFailures > 0 ? "Hero image was attached, but one or more requested body images need editorial review." : undefined;
    await finishProcessing(articleId, workflowRunId, status, reason, reviewCandidates);
    return { articleId, status };
  } catch (error) {
    const message = asSafeError(error);
    await finishProcessing(articleId, workflowRunId, "failed", undefined, [], message);
    return { articleId, status: "failed", error: message };
  }
}
