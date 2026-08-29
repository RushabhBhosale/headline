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

## Mandatory real article images

Every new article starts with `imageStatus: pending` and cannot be published without a hero image. Configure a Sanity webhook for draft `article` creates/updates that match `imageStatus == "pending" && !defined(heroImage.asset)` to call `POST /api/workflows/article-images`. Include drafts, send `x-sanity-image-secret` with `SANITY_IMAGE_WORKFLOW_SECRET`, and project at least `{ "_id": _id, "_type": _type }`. The endpoint also accepts `Authorization: Bearer <SANITY_IMAGE_WORKFLOW_SECRET>` for a protected manual trigger.

The workflow needs these server-only variables in addition to the existing Sanity write credentials:

```bash
OPENROUTER_API_KEY=...              # Server-only OpenRouter key
SANITY_IMAGE_WORKFLOW_SECRET=...    # Long random value shared only with the Sanity webhook
```

The workflow never generates an image. It exhausts these real-image sources in order: expanded pages on configured official sources, OpenRouter-discovered official/public pages, individually licensed Wikimedia Commons files, then an allowlisted free-image-library source page. The first OpenRouter call handles official source discovery; the optional second call is limited to Unsplash, Pexels, and Pixabay after the prior stages fail. The provider has a hard cap of `MAX_OPENROUTER_MODEL_CALLS_PER_ARTICLE = 2`, disables workflow retries for those calls, and reuses every completed discovery stage for requested body images.

OpenRouter's web plugin is a separate paid search service even when the selected model is free. This setup uses Exa in auto mode with at most five results; OpenRouter currently lists this at $0.007 per request (up to 10 results), plus model prompt tokens, so check [its current pricing](https://openrouter.ai/docs/guides/features/plugins/web-search) before enabling it in production. The model output is treated only as structured analysis and a list of cited source pages: returned domains and URLs are independently validated, then the existing rights, relevance, size, hash-deduplication, and Sanity-upload checks remain authoritative.

The workflow broadens source queries using the entity, subject, physical subject, newsroom, press-kit, product-image, and screenshot variations. Optional `imageRequirements.heroQuery` and up to two `bodyImageQueries` further direct it. A Wikimedia file is considered only when its individual API metadata carries an accepted free licence; free-library pages must expose their own licence/reuse terms.

Candidates without verifiable source, licence/reuse evidence, relevance, or sufficient resolution are stored in `imageProcessing.reviewCandidates`. If every permitted category is exhausted, the article moves to `manual-review`; it remains blocked from publication until an editor supplies an approved real hero image. No random search result, competing publication image, stock agency image, or AI-generated image is used.

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
