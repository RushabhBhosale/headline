This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Content automation image API

Set `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_API_TOKEN` in your server environment. The API token must have permission to upload assets and update article documents.
The supplied `articleId` is patched exactly: use `drafts.ARTICLE_ID` when updating a Sanity draft.

Upload an external image as an article hero:

```bash
curl -X POST http://localhost:3000/api/sanity/article-image \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "ARTICLE_ID",
    "imageUrl": "https://example.com/hero.jpg",
    "placement": "hero",
    "alt": "AI engineers working in a modern technology office",
    "caption": "AI roles are expanding across India’s technology sector.",
    "credit": "Headline Thread"
  }'
```

Upload a local file as an article hero:

```bash
curl -X POST http://localhost:3000/api/sanity/article-image \
  -F "articleId=ARTICLE_ID" \
  -F "placement=hero" \
  -F "file=@./hero.jpg;type=image/jpeg" \
  -F "alt=AI engineers working in a modern technology office" \
  -F "caption=AI roles are expanding across India’s technology sector." \
  -F "credit=Headline Thread"
```

Insert a body image after an existing Portable Text block:

```bash
curl -X POST http://localhost:3000/api/sanity/article-image \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "ARTICLE_ID",
    "imageUrl": "https://example.com/chart.png",
    "placement": "body",
    "afterBlockKey": "b28",
    "alt": "Chart showing technology hiring growth",
    "caption": "Technology hiring growth by quarter.",
    "credit": "Headline Thread"
  }'
```

Upload an image asset without attaching it to an article:

```bash
curl -X POST http://localhost:3000/api/sanity/upload-image \
  -F "file=@./image.webp;type=image/webp" \
  -F "alt=Abstract illustration of an AI network" \
  -F "caption=AI network illustration" \
  -F "credit=Headline Thread"
```

## Automated official-source article images

The automated workflow starts from `POST /api/workflows/article-images`. Configure a Sanity webhook for published `article` documents to call this URL and send `x-sanity-image-secret` with the value of `SANITY_IMAGE_WORKFLOW_SECRET`. The endpoint also accepts `Authorization: Bearer <SANITY_IMAGE_WORKFLOW_SECRET>` for a protected manual trigger.

The workflow needs these server-only variables in addition to the existing Sanity write credentials:

```bash
OPENROUTER_API_KEY=...              # Server-only OpenRouter key
SANITY_IMAGE_WORKFLOW_SECRET=...    # Long random value shared only with the Sanity webhook
```

The workflow checks registered official source pages first (for example, Samsung Mobile Press and Samsung Newsroom). Only if that produces no acceptable candidate does `OpenRouterSearchProvider` make one cached fallback discovery request using the exact `openrouter/free` model and OpenRouter's web plugin. It never asks a model to generate an image. The provider has a hard cap of `MAX_OPENROUTER_MODEL_CALLS_PER_ARTICLE = 2`; the current workflow makes at most one fallback request and reuses the result for body placements.

OpenRouter's web plugin is a separate paid search service even when the selected model is free. This setup uses Exa in auto mode with at most five results; OpenRouter currently lists this at $0.007 per request (up to 10 results), plus model prompt tokens, so check [its current pricing](https://openrouter.ai/docs/guides/features/plugins/web-search) before enabling it in production. The model output is treated only as structured analysis and a list of cited source pages: returned domains and URLs are independently validated, then the existing rights, relevance, size, hash-deduplication, and Sanity-upload checks remain authoritative.

Set an article's `imageStatus` to `pending` before publication. Optional `imageRequirements.heroQuery` and up to two `bodyImageQueries` override the generated official-source search queries.

Only configuration-controlled official domains with press, promotional, media, or public-information evidence can be selected automatically. Candidates without that evidence, with low relevance, or with insufficient resolution are stored in `imageProcessing.reviewCandidates` and the article moves to `manual-review` or `partial`; no fallback stock image is used.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
