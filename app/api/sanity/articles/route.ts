import { defineQuery } from "next-sanity";
import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function getLimit(request: Request) {
  const value = new URL(request.url).searchParams.get("limit");
  if (value === null) return DEFAULT_LIMIT;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return null;
  return limit;
}

export async function GET(request: Request) {
  const limit = getLimit(request);
  if (limit === null) {
    return Response.json({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` }, { status: 400 });
  }

  const articlesQuery = defineQuery(`
    *[_type == "article" && status == "published"]
      | order(publishedAt desc, _id asc)[0...${limit}] {
        "id": _id,
        title,
        "slug": slug.current,
        excerpt,
        status,
        publishedAt,
        updatedAt,
        "hasHeroImage": defined(heroImage.asset),
        category->{title, "slug": slug.current}
      }
  `);

  try {
    const articles = await getSanityServerClient().fetch(articlesQuery);
    return Response.json({ success: true, count: articles.length, articles });
  } catch (error) {
    console.error("Sanity article listing API error", error);
    return Response.json({ error: "Unable to list articles" }, { status: 500 });
  }
}
