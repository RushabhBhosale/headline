import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return { title: article.title, description: article.excerpt || undefined };
}

function ArticleImage({ article }: { article: Article }) {
  if (!article.heroImage) {
    return <div className="article-image article-image-fallback" aria-hidden="true"><span>Headline</span></div>;
  }
  return (
    <div className="article-image">
      <Image
        src={urlForImage(article.heroImage).width(1600).height(1000).url()}
        alt={article.heroImageAlt || article.title}
        fill
        priority
        sizes="(max-width: 800px) 100vw, 1120px"
      />
    </div>
  );
}

function PortableText({ blocks }: { blocks?: PortableTextBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="article-body">
      {blocks.map((block) => {
        if (block._type === "image" && block.asset) {
          return (
            <figure className="article-body-image" key={block._key}>
              <div>
                <Image
                  src={urlForImage(block.asset).width(1400).url()}
                  alt={block.alt || ""}
                  fill
                  sizes="(max-width: 800px) 100vw, 720px"
                />
              </div>
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
        return <p key={block._key}>{text}</p>;
      })}
    </div>
  );
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const publishedDate = formatDate(article.publishedAt);
  const updatedDate = formatDate(article.updatedAt);

  return (
    <main className="article-page">
      <article>
        <header className="article-header article-frame">
          <Link href="/" className="back-link"><span aria-hidden="true">←</span> All stories</Link>
          <p className="eyebrow article-category">{article.category?.title || "The briefing"}</p>
          <h1>{article.title}</h1>
          {article.excerpt && <p className="article-dek">{article.excerpt}</p>}
          <div className="byline-row">
            <div>{article.author?.name ? <><strong>By {article.author.name}</strong>{article.author.role && <span>{article.author.role}</span>}</> : <strong>Headline editorial desk</strong>}</div>
            <div><strong>{publishedDate}</strong>{updatedDate && updatedDate !== publishedDate && <span>Updated {updatedDate}</span>}</div>
          </div>
        </header>

        <div className="article-hero-frame"><ArticleImage article={article} />{(article.heroImageCaption || article.heroImageCredit) && <p className="image-caption">{article.heroImageCaption}{article.heroImageCredit && <span>Photo: {article.heroImageCredit}</span>}</p>}</div>

        <div className="article-content-frame">
          <aside className="article-side-note"><span>Share the story</span><a href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`Read: /articles/${article.slug.current}`)}`}>Email</a></aside>
          <div className="article-main">
            {!article.body?.length && article.excerpt && <p className="article-opening">{article.excerpt}</p>}
            <PortableText blocks={article.body} />

            {(article.correctionNote || article.updateNote) && (
              <div className="article-notes">
                {article.updateNote && <p><strong>Update</strong>{article.updateNote}</p>}
                {article.correctionNote && <p className="correction-note"><strong>Correction</strong>{article.correctionNote}</p>}
              </div>
            )}

            {article.topics?.length ? <div className="topic-list"><span>Filed under</span>{article.topics.map((topic) => <span key={topic.slug?.current || topic.title}>{topic.title}</span>)}</div> : null}
          </div>
        </div>
      </article>

      {article.relatedArticles?.length ? (
        <section className="related-section page-frame">
          <div className="section-heading"><span>Continue reading</span></div>
          <div className="related-grid">
            {article.relatedArticles.slice(0, 3).map((related) => (
              <Link href={storyHref(related)} className="related-story" key={related._id}>
                <span>{related.category?.title || "Headline"}</span>
                <h2>{related.title}</h2>
                <b>Read story <i aria-hidden="true">→</i></b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
