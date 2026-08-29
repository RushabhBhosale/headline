import { inspectRemoteImage } from "@/sanity/lib/imageUpload";
import type { ExtractedImageCandidate, InspectedImageCandidate, ReviewCandidate } from "../types";

const MIN_WIDTH = { hero: 1200, body: 720 } as const;
const DISALLOWED_PATTERN = /(?:favicon|logo|icon|avatar|sprite|pixel|tracking|advert|banner-ad|placeholder|thumbnail)/i;

export type CandidateSelection = {
  selected?: InspectedImageCandidate;
  reviewCandidates: ReviewCandidate[];
};

function words(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || [])];
}

function overlap(left: string, right: string) {
  const leftWords = words(left);
  const rightWords = new Set(words(right));
  if (!leftWords.length) return 0;
  return leftWords.filter((word) => rightWords.has(word)).length / leftWords.length;
}

function freshnessScore(value: string | undefined) {
  if (!value) return 0;
  const age = value.toLowerCase();
  if (/\b(?:today|hour|hours|day|days)\b/.test(age)) return 2;
  if (/\b(?:week|weeks)\b/.test(age)) return 1;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  const days = (Date.now() - timestamp) / 86_400_000;
  return days <= 7 ? 2 : days <= 31 ? 1 : 0;
}

function toReview(candidate: ExtractedImageCandidate, placement: "hero" | "body", query: string, reason: string, score?: number): ReviewCandidate {
  return {
    placement,
    query,
    sourcePageUrl: candidate.sourcePage.url,
    sourceImageUrl: candidate.imageUrl,
    sourceDomain: candidate.sourcePage.source.domain,
    sourceName: candidate.sourcePage.source.name,
    reason,
    score,
  };
}

function calculateScore(
  candidate: ExtractedImageCandidate,
  image: { width: number; height: number },
  placement: "hero" | "body",
  articleTitle: string,
  primaryEntity: string,
) {
  const candidateText = [candidate.alt, candidate.context, candidate.imageUrl, candidate.sourcePage.pageTitle, candidate.sourcePage.description].filter(Boolean).join(" ");
  const titleRelevance = overlap(articleTitle, candidateText);
  const entityRelevance = overlap(primaryEntity, candidateText);
  const relevance = Math.max(titleRelevance, entityRelevance * 0.9);
  const ratio = image.width / image.height;
  const minimumWidth = MIN_WIDTH[placement];
  const resolutionScore = Math.min(image.width / minimumWidth, 1) * 15;
  const aspectScore = placement === "hero"
    ? (ratio >= 1.15 && ratio <= 2.6 ? 8 : 0)
    : (ratio >= 0.75 && ratio <= 2.6 ? 8 : 3);
  const filenameScore = /(?:press|media|promo|product|gallery|official|key-visual|poster)/i.test(candidate.imageUrl) ? 6 : 0;
  const altScore = candidate.alt && overlap(articleTitle, candidate.alt) >= 0.25 ? 4 : 0;
  const contextScore = overlap(articleTitle, candidate.sourcePage.pageTitle) >= 0.25 ? 5 : 0;
  const freshness = freshnessScore(candidate.sourcePage.publishedAt);
  const penalty = DISALLOWED_PATTERN.test(candidateText) ? 45 : 0;

  return {
    relevance,
    score: Math.round(relevance * 42 + 20 + resolutionScore + aspectScore + filenameScore + altScore + contextScore + freshness - penalty),
  };
}

export async function inspectAndRankCandidates(
  candidates: ExtractedImageCandidate[],
  placement: "hero" | "body",
  query: string,
  articleTitle: string,
  primaryEntity: string,
  existingUrls: string[],
  existingHashes: string[],
): Promise<CandidateSelection> {
  const reviews: ReviewCandidate[] = [];
  const inspected: InspectedImageCandidate[] = [];

  for (const candidate of candidates.slice(0, 12)) {
    if (existingUrls.includes(candidate.imageUrl)) {
      reviews.push(toReview(candidate, placement, query, "Duplicate source image already attached to this article."));
      continue;
    }
    if (DISALLOWED_PATTERN.test(`${candidate.imageUrl} ${candidate.alt || ""}`)) {
      reviews.push(toReview(candidate, placement, query, "Rejected logo, icon, placeholder, advertising, or thumbnail candidate."));
      continue;
    }

    try {
      const image = await inspectRemoteImage(candidate.imageUrl);
      if (existingHashes.includes(image.sha256)) {
        reviews.push(toReview(candidate, placement, query, "Duplicate image content already attached to this article."));
        continue;
      }
      if (image.width < MIN_WIDTH[placement]) {
        reviews.push(toReview(candidate, placement, query, `Image width ${image.width}px is below the ${MIN_WIDTH[placement]}px minimum.`));
        continue;
      }

      const ranking = calculateScore(candidate, image, placement, articleTitle, primaryEntity);
      if (ranking.relevance < 0.3) {
        reviews.push(toReview(candidate, placement, query, "Image context is not sufficiently relevant to the article entity.", ranking.score));
        continue;
      }
      if (ranking.score < 60) {
        reviews.push(toReview(candidate, placement, query, "Candidate score is below the automatic-publishing threshold.", ranking.score));
        continue;
      }

      inspected.push({
        ...candidate,
        ...ranking,
        contentType: image.contentType,
        size: image.size,
        width: image.width,
        height: image.height,
        contentHash: image.sha256,
      });
    } catch (error) {
      reviews.push(toReview(candidate, placement, query, error instanceof Error ? error.message : "Image could not be validated"));
    }
  }

  inspected.sort((left, right) => right.score - left.score || right.relevance - left.relevance || right.width - left.width);
  return { selected: inspected[0], reviewCandidates: reviews };
}
