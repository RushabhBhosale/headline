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
  author?: Author;
  category?: { title?: string; slug?: Slug };
  trending?: boolean;
  breaking?: boolean;
};

export type Author = {
  name?: string;
  slug?: Slug;
  role?: string;
  photo?: SanityImageSource;
  shortBio?: string;
  expertise?: string[];
  socialLinks?: { name?: string; url?: string }[];
  profileLinks?: { name?: string; url?: string }[];
};

export type ArticleSeo = {
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: SanityImageSource;
  noIndex?: boolean;
  noFollow?: boolean;
};

export type CategoryLink = {
  _id: string;
  title: string;
  slug: Slug;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  featuredImage?: SanityImageSource;
};

export type PortableTextBlock = {
  _key: string;
  _type: string;
  style?: string;
  children?: { _key: string; _type?: string; text?: string; marks?: string[] }[];
  markDefs?: { _key: string; _type?: string; href?: string }[];
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
  seo?: ArticleSeo;
};

export type SiteSettings = {
  siteName?: string;
  siteDescription?: string;
  logo?: SanityImageSource;
  defaultSeoImage?: SanityImageSource;
  socialLinks?: string[];
  organizationInfo?: string;
  publisherInfo?: string;
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

export type PaginatedArticles = {
  articles: ArticleCard[];
  total: number;
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
  author->{name, slug, role, photo, shortBio, expertise, socialLinks[]{name, url}, profileLinks[]{name, url}},
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
    "latestArticles": *[_type == "article"] | order(publishedAt desc)[0...20]{${articleCardFields}}
  }`, {}, { cache: "no-store", useCdn: false });
}

export async function getSiteNavigationData(): Promise<{ categories: CategoryLink[]; latestHeadline?: ArticleCard | null }> {
  return sanityClient.fetch(`{
    "categories": *[_type == "category" && defined(slug.current)] | order(coalesce(displayOrder, 999), title asc){_id, title, slug},
    "latestHeadline": *[_type == "article" && defined(slug.current)] | order(breaking desc, publishedAt desc)[0]{${articleCardFields}}
  }`);
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch(
    `*[_type == "siteSettings"][0]{siteName, siteDescription, logo, defaultSeoImage, socialLinks, organizationInfo, publisherInfo}`,
  );
}

export async function getCategoryPage(slug: string): Promise<CategoryPageData | null> {
  const data = await sanityClient.fetch<CategoryPageData>(
    `{
      "category": *[_type == "category" && slug.current == $slug][0]{_id, title, slug, description, seoTitle, seoDescription, featuredImage},
      "articles": *[_type == "article" && category->slug.current == $slug] | order(publishedAt desc){${articleCardFields}}
    }`,
    { slug },
    { cache: "no-store", useCdn: false }
  );
  return data.category ? data : null;
}

export async function getArticlesPage({
  page = 1,
  pageSize = 9,
  query = "",
}: {
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<PaginatedArticles> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const articleFilter = `_type == "article" && defined(slug.current) && ($search == "" || title match $search || excerpt match $search || category->title match $search)`;

  return sanityClient.fetch(
    `{
      "articles": *[${articleFilter}] | order(publishedAt desc)[$start...$end]{${articleCardFields}},
      "total": count(*[${articleFilter}])
    }`,
    { start, end, search: query ? `*${query}*` : "" },
    { cache: "no-store", useCdn: false }
  );
}

export async function getSitemapData(): Promise<SitemapData> {
  return sanityClient.fetch(`{
    "articles": *[_type == "article" && defined(slug.current) && seo.noIndex != true]{slug, publishedAt, updatedAt},
    "categories": *[_type == "category" && defined(slug.current)]{_id, title, slug}
  }`, {}, { cache: "no-store", useCdn: false });
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return sanityClient.fetch(
    `*[_type == "article" && slug.current == $slug][0]{
      ${articleCardFields},
      body,
      topics[]->{title, slug},
      thread->{title, slug},
      correctionNote,
      updateNote,
      seo{seoTitle, seoDescription, socialImage, noIndex, noFollow},
      "relatedArticles": select(
        count(*[_type == "article" && _id != ^._id && defined(^.category._ref) && category._ref == ^.category._ref]) > 0 =>
          *[_type == "article" && _id != ^._id && category._ref == ^.category._ref] | order(publishedAt desc)[0...4]{${articleCardFields}},
        *[_type == "article" && _id != ^._id] | order(publishedAt desc)[0...4]{${articleCardFields}}
      )
    }`,
    { slug },
    { cache: "no-store", useCdn: false }
  );
}
