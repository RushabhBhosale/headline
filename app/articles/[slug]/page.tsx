import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { getArticleBySlug, type Article, type ArticleCard, type PortableTextBlock } from "@/sanity/lib/queries";
import { sanityClient } from "@/sanity/lib/sanityClient";
import { urlForImage } from "@/sanity/lib/image";
import { StoryToc } from "@/components/story-toc";
import { canonicalUrl, normalizeInternalUrl, SITE_NAME, socialImageUrl, stringifyJsonLd } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getReadingTime(blocks?: PortableTextBlock[]) {
  const words = blocks?.reduce(
    (total, block) => total + (block.children?.reduce((count, child) => count + (child.text?.trim().split(/\s+/).filter(Boolean).length || 0), 0) || 0),
    0
  ) || 0;
  return Math.max(1, Math.ceil(words / 220));
}

function getSections(blocks?: PortableTextBlock[]) {
  return (blocks || [])
    .filter((block) => block.style === "h2")
    .map((block) => ({ id: slugify(block.children?.map((child) => child.text || "").join("") || ""), text: block.children?.map((child) => child.text || "").join("") || "" }))
    .filter((section) => section.text);
}

function extractImageIds(blocks?: PortableTextBlock[]): string[] {
  const ids: string[] = [];
  for (const block of blocks || []) {
    if (block._type === "image" && block.asset && typeof block.asset === "object" && "_ref" in block.asset) {
      const ref = (block.asset as { _ref: string })._ref;
      const id = ref.replace(/^image-/, "").replace(/-\d+x\d+$/, "");
      if (id) ids.push(id);
    }
  }
  return ids;
}

async function fetchImageDimensions(ids: string[]): Promise<Map<string, { width: number; height: number }>> {
  if (!ids.length) return new Map();
  const assets = await sanityClient.fetch<{ _id: string; metadata?: { dimensions?: { width: number; height: number } } }[]>(
    `*[_type == "sanity.imageAsset" && _id in $ids]{ _id, metadata { dimensions } }`,
    { ids },
  );
  const map = new Map<string, { width: number; height: number }>();
  for (const asset of assets) {
    if (asset.metadata?.dimensions) map.set(asset._id, asset.metadata.dimensions);
  }
  return map;
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  const title = article.seo?.seoTitle || article.title;
  const description = article.seo?.seoDescription || article.excerpt || undefined;
  const path = `/articles/${article.slug.current}`;
  const url = canonicalUrl(path);
  const image = article.seo?.socialImage || article.heroImage;
  const imageUrl = socialImageUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: {
      index: article.seo?.noIndex !== true,
      follow: article.seo?.noFollow !== true,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
      ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
      ...(article.author?.name ? { authors: [article.author.name] } : {}),
      ...(article.category?.title ? { section: article.category.title } : {}),
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: article.heroImageAlt || article.title }] }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

function InlineRelatedStory({ article }: { article: ArticleCard }) {
  return (
    <aside className="in-article-related" aria-label="Related story">
      <span className="in-article-related-label">A related read</span>
      <Link href={storyHref(article)} className="in-article-related-link">
        <div className="in-article-related-image">
          {article.heroImage ? (
            <Image src={urlForImage(article.heroImage).width(640).height(480).url()} alt={article.heroImageAlt || article.title} fill sizes="(max-width: 700px) 36vw, 210px" />
          ) : <span aria-hidden="true">Headline</span>}
        </div>
        <div>
          <span className="in-article-related-category">{article.category?.title || "Headline"}</span>
          <p className="in-article-related-title">{article.title}</p>
          <b>Read story <i aria-hidden="true">→</i></b>
        </div>
      </Link>
    </aside>
  );
}

function RelatedStoryCard({ article }: { article: ArticleCard }) {
  return (
    <article className="related-story">
      <Link href={storyHref(article)} className="related-story-image">
        {article.heroImage ? (
          <Image src={urlForImage(article.heroImage).width(720).height(520).url()} alt={article.heroImageAlt || article.title} fill sizes="(max-width: 700px) 100vw, 33vw" />
        ) : <span aria-hidden="true">Headline</span>}
      </Link>
      <div>
        <span>{article.category?.title || "Headline"}</span>
        <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
        <Link href={storyHref(article)} className="text-link">Read story <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

function ArticleRelatedRail({ article, stories }: { article: Article; stories: ArticleCard[] }) {
  const categoryHref = article.category?.slug?.current ? `/categories/${article.category.slug.current}` : undefined;

  return (
    <aside className="article-related-rail" aria-label="Story guide">
      <div className="story-file">
        <p>Story file</p>
        {article.category?.title && (categoryHref ? <Link href={categoryHref}>{article.category.title} <i aria-hidden="true">→</i></Link> : <strong>{article.category.title}</strong>)}
        {article.topics?.length ? <div>{article.topics.map((topic) => <span key={topic.slug?.current || topic.title}>{topic.title}</span>)}</div> : null}
      </div>
      {stories.length ? (
        <div className="article-rail-stories">
          <p>Related reading</p>
          {stories.map((story) => <Link href={storyHref(story)} key={story._id}><span>{story.category?.title || "Headline"}</span>{story.title}<i aria-hidden="true">→</i></Link>)}
        </div>
      ) : null}
      <div className="rail-cta">
        <p>The brief</p>
        <strong>Essential stories, explained.</strong>
        <span>A sharp daily read in your inbox each morning.</span>
        <Link href="/contact">Subscribe free <i aria-hidden="true">→</i></Link>
      </div>
    </aside>
  );
}

const shareIcons = {
  x: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
  facebook: <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />,
  linkedin: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />,
  email: (
    <>
      <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
      <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
    </>
  ),
};

function ArticleSideRail({ title, url, sections }: { title: string; url: string; sections: { id: string; text: string }[] }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <aside className="article-side-rail">
      <div className="share-block">
        <p className="rail-label">Share this story</p>
        <div className="share-row">
          <a href={`https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
            <svg viewBox="0 0 24 24" aria-hidden="true">{shareIcons.x}</svg>
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">{shareIcons.facebook}</svg>
          </a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true">{shareIcons.linkedin}</svg>
          </a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} aria-label="Share by email">
            <svg viewBox="0 0 24 24" aria-hidden="true">{shareIcons.email}</svg>
          </a>
        </div>
      </div>
      {sections.length >= 2 && <StoryToc sections={sections} />}
    </aside>
  );
}

function renderInline(block: PortableTextBlock) {
  const defMap = new Map((block.markDefs || []).map((def) => [def._key, def]));
  return (block.children || []).map((child) => {
    let content: ReactNode = child.text || "";
    const linkKey = child.marks?.find((mark) => defMap.get(mark)?.href);
    if (linkKey) {
      content = (
        <a href={normalizeInternalUrl(defMap.get(linkKey)?.href)} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    if (child.marks?.includes("strong")) content = <strong>{content}</strong>;
    if (child.marks?.includes("em")) content = <em>{content}</em>;
    return <Fragment key={child._key}>{content}</Fragment>;
  });
}

function PortableText({ blocks, inlineRelated, imageDimensions }: { blocks?: PortableTextBlock[]; inlineRelated?: ArticleCard; imageDimensions?: Map<string, { width: number; height: number }> }) {
  if (!blocks?.length) return null;
  let paragraphCount = 0;

  return (
    <div className="article-body">
      {blocks.map((block) => {
        if (block._type === "image" && block.asset) {
          let w = 1400, h = 933;
          if (typeof block.asset === "object" && "_ref" in block.asset) {
            const ref = (block.asset as { _ref: string })._ref;
            const id = ref.replace(/^image-/, "").replace(/-\d+x\d+$/, "");
            const dim = imageDimensions?.get(id);
            if (dim) { w = dim.width; h = dim.height; }
          }
          return (
            <figure className="article-body-image" key={block._key}>
              <div><Image src={urlForImage(block.asset).width(1400).url()} alt={block.alt || ""} width={w} height={h} sizes="(max-width: 800px) 100vw, 720px" /></div>
              {(block.caption || block.credit) && <figcaption>{block.caption}{block.credit && <span>Photo: {block.credit}</span>}</figcaption>}
            </figure>
          );
        }
        const text = block.children?.map((child) => child.text || "").join("") || "";
        if (!text) return null;
        const inline = renderInline(block);
        if (block.style === "h2") return <h2 key={block._key} id={slugify(text)}>{inline}</h2>;
        if (block.style === "h3") return <h3 key={block._key}>{inline}</h3>;
        if (block.style === "blockquote") return <blockquote key={block._key}>{inline}</blockquote>;
        if (block.style === "callout") return <aside className="article-callout" key={block._key}><span>In context</span>{inline}</aside>;
        paragraphCount += 1;
        return <Fragment key={block._key}><p>{inline}</p>{inlineRelated && paragraphCount === 4 && <InlineRelatedStory article={inlineRelated} />}</Fragment>;
      })}
    </div>
  );
}

function getParagraphCount(blocks?: PortableTextBlock[]) {
  return blocks?.filter((block) => {
    if (block._type === "image" || ["h2", "h3", "blockquote", "callout"].includes(block.style || "")) return false;
    return Boolean(block.children?.some((child) => child.text));
  }).length || 0;
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const imageIds = extractImageIds(article.body);
  const imageDimensions = await fetchImageDimensions(imageIds);

  const publishedDate = formatDate(article.publishedAt);
  const updatedDate = formatDate(article.updatedAt);
  const readingTime = getReadingTime(article.body);
  const inlineRelated = getParagraphCount(article.body) >= 4 ? article.relatedArticles?.[0] : undefined;
  const relatedStories = article.relatedArticles?.slice(inlineRelated ? 1 : 0, inlineRelated ? 4 : 3) || [];
  const sidebarStories = article.relatedArticles?.filter((story) => story._id !== inlineRelated?._id).slice(0, 3) || [];
  const authorName = article.author?.name || "Headline editorial desk";
  const articleUrl = canonicalUrl(`/articles/${article.slug.current}`);
  const sections = getSections(article.body);
  const socialImage = article.seo?.socialImage || article.heroImage;
  const imageUrl = socialImageUrl(socialImage);
  const authorId = article.author?.name ? `${articleUrl}#author` : undefined;
  const authorJsonLd = article.author?.name
    ? {
        "@type": "Person",
        "@id": authorId,
        name: article.author.name,
        ...(article.author.role ? { jobTitle: article.author.role } : {}),
        ...(article.author.shortBio ? { description: article.author.shortBio } : {}),
        ...(article.author.expertise?.length ? { knowsAbout: article.author.expertise } : {}),
        ...(article.author.photo ? { image: socialImageUrl(article.author.photo) } : {}),
        ...(article.author.socialLinks?.length || article.author.profileLinks?.length
          ? {
              sameAs: [...(article.author.socialLinks || []), ...(article.author.profileLinks || [])]
                .map((link) => link.url)
                .filter((url): url is string => Boolean(url)),
            }
          : {}),
      }
    : undefined;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${articleUrl}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
        headline: article.title,
        ...(article.seo?.seoDescription || article.excerpt
          ? { description: article.seo?.seoDescription || article.excerpt }
          : {}),
        ...(imageUrl ? { image: [imageUrl] } : {}),
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(authorId ? { author: { "@id": authorId } } : {}),
        publisher: { "@id": `${canonicalUrl()}/#organization` },
        ...(article.category?.title ? { articleSection: article.category.title } : {}),
      },
      ...(authorJsonLd ? [authorJsonLd] : []),
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl() },
          ...(article.category?.title && article.category.slug?.current
            ? [{ "@type": "ListItem", position: 2, name: article.category.title, item: canonicalUrl(`/categories/${article.category.slug.current}`) }]
            : []),
          {
            "@type": "ListItem",
            position: article.category?.title && article.category.slug?.current ? 3 : 2,
            name: article.title,
            item: articleUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(articleJsonLd) }}
      />
      <article>
        <header className="article-header">
          <div className="article-topline">
            <Link href="/" className="back-link"><span aria-hidden="true">←</span> Top stories</Link>
            {article.category?.title && article.category.slug?.current ? (
              <Link href={`/categories/${article.category.slug.current}`} className="article-crumb">{article.category.title}</Link>
            ) : null}
          </div>
          {article.heroImage ? (
            <figure className="hero-backdrop">
              <Image
                src={urlForImage(article.heroImage).width(2200).height(1300).url()}
                alt={article.heroImageAlt || article.title}
                fill
                priority
                sizes="100vw"
              />
              <div className="hero-scrim" aria-hidden="true" />
              <div className="hero-content">
                {article.category?.title && <p className="kicker-light">{article.category.title}</p>}
                <h1>{article.title}</h1>
                {article.excerpt && <p className="hero-dek">{article.excerpt}</p>}
              </div>
            </figure>
          ) : (
            <div className="article-title-frame">
              <h1>{article.title}</h1>
              {article.excerpt && <p className="article-dek">{article.excerpt}</p>}
            </div>
          )}

          {article.heroImage && (article.heroImageCaption || article.heroImageCredit) && (
            <p className="hero-caption">
              {article.heroImageCaption}
              {article.heroImageCredit && <span>Photo: {article.heroImageCredit}</span>}
            </p>
          )}

          <div className="byline-strip">
            <span className="byline-author">By {authorName}{article.author?.role ? `, ${article.author.role}` : ""}</span>
            <span className="sep" aria-hidden="true">·</span>
            <span>{publishedDate}</span>
            {updatedDate && updatedDate !== publishedDate && (
              <>
                <span className="sep" aria-hidden="true">·</span>
                <span>Updated {updatedDate}</span>
              </>
            )}
            <span className="sep" aria-hidden="true">·</span>
            <span>{readingTime} min read</span>
          </div>
        </header>

        <div className="article-content-frame">
          <ArticleSideRail title={article.title} url={articleUrl} sections={sections} />
          <div className="article-main">
            {!article.body?.length && article.excerpt && <p className="article-opening">{article.excerpt}</p>}
            <PortableText blocks={article.body} inlineRelated={inlineRelated} imageDimensions={imageDimensions} />

            {article.topics?.length ? <div className="topic-list"><span>Filed under</span>{article.topics.map((topic) => <span key={topic.slug?.current || topic.title}>{topic.title}</span>)}</div> : null}

            {article.correctionNote && (
              <div className="article-notes">
                <p className="correction-note"><strong>Correction</strong>{article.correctionNote}</p>
              </div>
            )}
          </div>
          <ArticleRelatedRail article={article} stories={sidebarStories} />
        </div>
      </article>

      {relatedStories.length ? (
        <section className="related-section">
          <div className="page-frame">
            <div className="related-heading"><h2>{article.category?.title ? `More from ${article.category.title}` : "More stories worth your time"}</h2><span>{String(relatedStories.length).padStart(2, "0")} stories</span></div>
            <div className="related-grid">{relatedStories.map((related) => <RelatedStoryCard article={related} key={related._id} />)}</div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
