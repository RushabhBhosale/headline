import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryPage, type ArticleCard } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 60;

function formatDate(date?: string) {
  if (!date) return "Latest report";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function CategoryImage({ article }: { article: ArticleCard }) {
  if (!article.heroImage) return <div className="category-card-image category-image-fallback" aria-hidden="true">Headline</div>;
  return (
    <div className="category-card-image">
      <Image src={urlForImage(article.heroImage).width(900).height(620).url()} alt={article.heroImageAlt || article.title} fill sizes="(max-width: 700px) 100vw, 33vw" />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPage(slug);
  if (!data) return {};
  return { title: data.category.title, description: data.category.description || `Latest ${data.category.title} stories from Headline.` };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCategoryPage(slug);
  if (!data) notFound();

  return (
    <main className="category-page">
      <header className="category-page-header page-frame">
        <Link href="/" className="back-link"><span aria-hidden="true">←</span> All stories</Link>
        <p className="eyebrow">Category archive</p>
        <h1>{data.category.title}</h1>
        {data.category.description && <p>{data.category.description}</p>}
      </header>

      {data.articles.length ? (
        <section className="category-story-grid page-frame" aria-label={`${data.category.title} stories`}>
          {data.articles.map((article, index) => (
            <article className={`category-story category-story--${index + 1}`} key={article._id}>
              <Link href={`/articles/${article.slug.current}`}><CategoryImage article={article} /></Link>
              <p>{formatDate(article.publishedAt)}</p>
              <h2><Link href={`/articles/${article.slug.current}`}>{article.title}</Link></h2>
              {article.excerpt && <span>{article.excerpt}</span>}
            </article>
          ))}
        </section>
      ) : <section className="category-empty page-frame"><p>No published stories in this category yet.</p></section>}
    </main>
  );
}
