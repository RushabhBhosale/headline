import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { getArticleBySlug, type Article, type ArticleCard, type PortableTextBlock } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

type PageProps = { params: Promise<{ slug: string }> };

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function getReadingTime(blocks?: PortableTextBlock[]) {
  const words = blocks?.reduce(
    (total, block) => total + (block.children?.reduce((count, child) => count + (child.text?.trim().split(/\s+/).filter(Boolean).length || 0), 0) || 0),
    0
  ) || 0;
  return Math.max(1, Math.ceil(words / 220));
}

function ArticleImage({ article }: { article: Article }) {
  if (!article.heroImage) return <div className="article-image article-image-fallback" aria-hidden="true"><span>Headline</span></div>;

  return (
    <div className="article-image">
      <Image
        src={urlForImage(article.heroImage).width(1800).height(1080).url()}
        alt={article.heroImageAlt || article.title}
        fill
        priority
        sizes="(max-width: 800px) 100vw, 1400px"
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return { title: article.title, description: article.excerpt || undefined };
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
          <h2>{article.title}</h2>
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
        <Link href={storyHref(article)} className="card-read">Read story <i aria-hidden="true">→</i></Link>
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
    </aside>
  );
}

function PortableText({ blocks, inlineRelated }: { blocks?: PortableTextBlock[]; inlineRelated?: ArticleCard }) {
  if (!blocks?.length) return null;
  let paragraphCount = 0;

  return (
    <div className="article-body">
      {blocks.map((block) => {
        if (block._type === "image" && block.asset) {
          return (
            <figure className="article-body-image" key={block._key}>
              <div><Image src={urlForImage(block.asset).width(1400).url()} alt={block.alt || ""} fill sizes="(max-width: 800px) 100vw, 720px" /></div>
              {(block.caption || block.credit) && <figcaption>{block.caption}{block.credit && <span>Photo: {block.credit}</span>}</figcaption>}
            </figure>
          );
        }
        const text = block.children?.map((child) => child.text || "").join("") || "";
        if (!text) return null;
        if (block.style === "h2") return <h2 key={block._key}>{text}</h2>;
        if (block.style === "h3") return <h3 key={block._key}>{text}</h3>;
        if (block.style === "blockquote") return <blockquote key={block._key}>{text}</blockquote>;
        if (block.style === "callout") return <aside className="article-callout" key={block._key}><span>In context</span>{text}</aside>;
        paragraphCount += 1;
        return <Fragment key={block._key}><p>{text}</p>{inlineRelated && paragraphCount === 4 && <InlineRelatedStory article={inlineRelated} />}</Fragment>;
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

  const publishedDate = formatDate(article.publishedAt);
  const updatedDate = formatDate(article.updatedAt);
  const readingTime = getReadingTime(article.body);
  const inlineRelated = getParagraphCount(article.body) >= 4 ? article.relatedArticles?.[0] : undefined;
  const relatedStories = article.relatedArticles?.slice(inlineRelated ? 1 : 0, inlineRelated ? 4 : 3) || [];
  const sidebarStories = article.relatedArticles?.filter((story) => story._id !== inlineRelated?._id).slice(0, 3) || [];
  const authorName = article.author?.name || "Headline editorial desk";

  return (
    <main className="article-page">
      <article>
        <header className="article-header">
          <div className="article-title-frame">
            <div className="article-topline"><Link href="/" className="back-link"><span aria-hidden="true">←</span> All stories</Link><span>Headline / Story</span></div>
            <p className="eyebrow article-category">{article.category?.title || "The briefing"}</p>
            <h1>{article.title}</h1>
            {article.excerpt && <p className="article-dek">{article.excerpt}</p>}
            <div className="byline-row">
              <div><span>Written by</span><strong>{authorName}</strong>{article.author?.role && <small>{article.author.role}</small>}</div>
              <div><span>Published</span><strong>{publishedDate}</strong>{updatedDate && updatedDate !== publishedDate && <small>Updated {updatedDate}</small>}</div>
              <div><span>Reading time</span><strong>{readingTime} min read</strong></div>
            </div>
          </div>
        </header>

        <div className="article-hero-frame">
          <ArticleImage article={article} />
          <span className="article-image-tab">{article.category?.title || "Headline"}</span>
          {(article.heroImageCaption || article.heroImageCredit) && <p className="image-caption">{article.heroImageCaption}{article.heroImageCredit && <span>Photo: {article.heroImageCredit}</span>}</p>}
        </div>

        <div className="article-content-frame">
          <aside className="article-side-note">
            <span>Pass it on</span>
            <a href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`Read: /articles/${article.slug.current}`)}`}>Email this story <b aria-hidden="true">↗</b></a>
          </aside>
          <div className="article-main">
            {!article.body?.length && article.excerpt && <p className="article-opening">{article.excerpt}</p>}
            <PortableText blocks={article.body} inlineRelated={inlineRelated} />

            {article.topics?.length ? <div className="topic-list"><span>Filed under</span>{article.topics.map((topic) => <span key={topic.slug?.current || topic.title}>{topic.title}</span>)}</div> : null}

            {(article.correctionNote || article.updateNote) && (
              <div className="article-notes">
                {article.updateNote && <p><strong>Update</strong>{article.updateNote}</p>}
                {article.correctionNote && <p className="correction-note"><strong>Correction</strong>{article.correctionNote}</p>}
              </div>
            )}
          </div>
          <ArticleRelatedRail article={article} stories={sidebarStories} />
        </div>
      </article>

      {relatedStories.length ? (
        <section className="related-section">
          <div className="related-section-inner page-frame">
            <div className="related-heading"><p className="eyebrow">Keep reading</p><h2>{article.category?.title ? `More from ${article.category.title}` : "More stories worth your time"}</h2></div>
            <div className="related-grid">{relatedStories.map((related) => <RelatedStoryCard article={related} key={related._id} />)}</div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
