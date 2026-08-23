import { sanityClient } from "./sanityClient";
import type { SanityImageSource } from "@sanity/image-url";

export type Slug = { current: string };

export type ArticleCard = {
  _id: string;
  title: string;
  excerpt?: string;
  slug: Slug;
  publishedAt?: string;
  updatedAt?: string;
  heroImage?: SanityImageSource;
  heroImageAlt?: string;
  heroImageCaption?: string;
  heroImageCredit?: string;
  author?: { name?: string; role?: string; photo?: unknown };
  category?: { title?: string; slug?: Slug };
  trending?: boolean;
  breaking?: boolean;
};

export type CategoryLink = {
  _id: string;
  title: string;
  slug: Slug;
  description?: string;
};

export type PortableTextBlock = {
  _key: string;
  _type: string;
  style?: string;
  children?: { _key: string; text?: string }[];
  asset?: SanityImageSource;
  alt?: string;
  caption?: string;
  credit?: string;
};

export type Article = ArticleCard & {
  body?: PortableTextBlock[];
  topics?: { title?: string; slug?: Slug }[];
  thread?: { title?: string; slug?: Slug };
  correctionNote?: string;
  updateNote?: string;
  relatedArticles?: ArticleCard[];
};

type Homepage = {
  breakingNewsBanner?: { enabled?: boolean; title?: string; link?: string };
  leadStory?: ArticleCard;
  secondaryStories?: ArticleCard[];
  featuredStories?: ArticleCard[];
  trendingStories?: ArticleCard[];
};

export type HomePageData = {
  homepage?: Homepage;
  latestArticles: ArticleCard[];
};

export type CategoryPageData = {
  category: CategoryLink;
  articles: ArticleCard[];
};

export type SitemapData = {
  articles: { slug: Slug; publishedAt?: string; updatedAt?: string }[];
  categories: CategoryLink[];
};

const articleCardFields = `
  _id,
  title,
  excerpt,
  slug,
  publishedAt,
  updatedAt,
  heroImage,
  heroImageAlt,
  heroImageCaption,
  heroImageCredit,
  author->{name, role, photo},
  category->{title, slug},
  trending,
  breaking
`;

export async function getHomepageData(): Promise<HomePageData> {
  return sanityClient.fetch(`{
    "homepage": *[_type == "homepage"][0]{
      breakingNewsBanner,
      "leadStory": leadStory->{${articleCardFields}},
      "secondaryStories": secondaryStories[]->{${articleCardFields}},
      "featuredStories": featuredStories[]->{${articleCardFields}},
      "trendingStories": trendingStories[]->{${articleCardFields}}
    },
    "latestArticles": *[_type == "article" && status == "published"] | order(publishedAt desc)[0...12]{${articleCardFields}}
  }`);
}

export async function getSiteNavigationData(): Promise<{ categories: CategoryLink[] }> {
  return sanityClient.fetch(`{
    "categories": *[_type == "category" && defined(slug.current)] | order(coalesce(displayOrder, 999), title asc){_id, title, slug}
  }`);
}

export async function getCategoryPage(slug: string): Promise<CategoryPageData | null> {
  const data = await sanityClient.fetch<CategoryPageData>(
    `{
      "category": *[_type == "category" && slug.current == $slug][0]{_id, title, slug, description},
      "articles": *[_type == "article" && status == "published" && category->slug.current == $slug] | order(publishedAt desc){${articleCardFields}}
    }`,
    { slug }
  );
  return data.category ? data : null;
}

export async function getSitemapData(): Promise<SitemapData> {
  return sanityClient.fetch(`{
    "articles": *[_type == "article" && status == "published" && defined(slug.current)]{slug, publishedAt, updatedAt},
    "categories": *[_type == "category" && defined(slug.current)]{_id, title, slug}
  }`);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return sanityClient.fetch(
    `*[_type == "article" && slug.current == $slug && status == "published"][0]{
      ${articleCardFields},
      body,
      topics[]->{title, slug},
      thread->{title, slug},
      correctionNote,
      updateNote,
      "relatedArticles": select(
        count(*[_type == "article" && status == "published" && _id != ^._id && defined(^.category._ref) && category._ref == ^.category._ref]) > 0 =>
          *[_type == "article" && status == "published" && _id != ^._id && category._ref == ^.category._ref] | order(publishedAt desc)[0...4]{${articleCardFields}},
        *[_type == "article" && status == "published" && _id != ^._id] | order(publishedAt desc)[0...4]{${articleCardFields}}
      )
    }`,
    { slug }
  );
}
