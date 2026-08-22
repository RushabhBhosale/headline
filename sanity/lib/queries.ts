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
  author?: { name?: string; role?: string; photo?: unknown };
  category?: { title?: string; slug?: Slug };
  trending?: boolean;
  breaking?: boolean;
};

export type PortableTextBlock = {
  _key: string;
  _type: string;
  style?: string;
  children?: { _key: string; text?: string }[];
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

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return sanityClient.fetch(
    `*[_type == "article" && slug.current == $slug && status == "published"][0]{
      ${articleCardFields},
      body,
      topics[]->{title, slug},
      thread->{title, slug},
      correctionNote,
      updateNote,
      "relatedArticles": relatedArticles[]->{${articleCardFields}}
    }`,
    { slug }
  );
}
