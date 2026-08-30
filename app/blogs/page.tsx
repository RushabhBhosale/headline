import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getArticlesPage, type ArticleCard } from "@/sanity/lib/queries";
import { urlForImage } from "@/sanity/lib/image";

const PAGE_SIZE = 12;
type BlogPageProps = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "All blogs",
  description: "Browse every report, analysis, and perspective from Headline.",
};

export const revalidate = 0;

function formatDate(date?: string) {
  if (!date) return "Latest report";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function storyHref(article: ArticleCard) {
  return `/articles/${article.slug.current}`;
}

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/blogs?${search}` : "/blogs";
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [1, currentPage - 1, currentPage, currentPage + 1, totalPages]
    .filter((page) => page >= 1 && page <= totalPages)
    .filter((page, index, list) => list.indexOf(page) === index)
    .sort((a, b) => a - b);

  return pages.flatMap((page, index) => index > 0 && page - pages[index - 1] > 1 ? ["gap", page] : [page]);
}

function BlogImage({ article, priority = false }: { article: ArticleCard; priority?: boolean }) {
  if (!article.heroImage) return <div className="blog-image-fallback" aria-hidden="true">Headline</div>;

  return (
    <Image
      src={urlForImage(article.heroImage).width(900).height(600).url()}
      alt={article.heroImageAlt || article.title}
      fill
      priority={priority}
      sizes="(max-width: 700px) 100vw, (max-width: 960px) 50vw, 33vw"
    />
  );
}

export default async function BlogsPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const pageValue = typeof params.page === "string" ? Number(params.page) : 1;
  const currentPage = Number.isInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 10_000) : 1;

  let data: Awaited<ReturnType<typeof getArticlesPage>> = { articles: [], total: 0 };
  try {
    data = await getArticlesPage({ page: currentPage, pageSize: PAGE_SIZE, query });
  } catch {}

  let totalPages = Math.ceil(data.total / PAGE_SIZE);
  let activePage = currentPage;
  if (totalPages && activePage > totalPages) {
    activePage = totalPages;
    try {
      data = await getArticlesPage({ page: activePage, pageSize: PAGE_SIZE, query });
    } catch {}
    totalPages = Math.ceil(data.total / PAGE_SIZE);
  }

  const firstResult = data.total ? (activePage - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(activePage * PAGE_SIZE, data.total);
  const paginationItems = getPaginationItems(activePage, totalPages);

  return (
    <main className="blog-archive">
      <section className="blog-search-panel page-frame" aria-label="Search blogs">
        <form action="/blogs" className="blog-search" role="search">
          <label htmlFor="blog-search" className="sr-only">Search blogs</label>
          <div className="blog-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input id="blog-search" type="search" name="q" defaultValue={query} placeholder="Search by title, topic, or section" />
          </div>
          <button type="submit">Search</button>
          {query && <Link href="/blogs" className="search-clear">Clear</Link>}
        </form>
      </section>

      <section className="blog-results page-frame" aria-labelledby="blog-results-heading">
        <header className="blog-results-head">
          <h2 id="blog-results-heading">{query ? "Search results" : "Latest blogs"}</h2>
          <p className="blog-results-count">
            {data.total
              ? <><strong>{firstResult}–{lastResult}</strong> of {data.total} {data.total === 1 ? "blog" : "blogs"}{query && <> for “{query}”</>}</>
              : query ? <>No blogs found for “{query}”</> : "No blogs published yet"}
          </p>
        </header>

        {data.articles.length ? (
          <div className="blog-story-grid">
            {data.articles.map((article, index) => (
              <article className="blog-story" key={article._id}>
                <Link href={storyHref(article)} className="blog-story-image" tabIndex={-1} aria-hidden="true">
                  <BlogImage article={article} priority={index === 0} />
                </Link>
                <p className="kicker-row">
                  {article.category?.slug?.current ? (
                    <Link href={`/categories/${article.category.slug.current}`} className="kicker">{article.category.title}</Link>
                  ) : <span className="kicker">{article.category?.title || "Headline"}</span>}
                  <span className="meta-date">{formatDate(article.publishedAt)}</span>
                </p>
                <h3><Link href={storyHref(article)}>{article.title}</Link></h3>
                {article.excerpt && <p className="card-excerpt">{article.excerpt}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="blog-empty">
            <div>
              <h2>{query ? "No matching blogs" : "The archive is just getting started."}</h2>
              <p>{query ? "Try a different search term, or clear the search to see all published blogs." : "Published stories will appear here as soon as they are ready."}</p>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="blog-pagination" aria-label="Blog pages">
            <div className="blog-pagination-full">
              {activePage > 1 && <Link href={pageHref(activePage - 1, query)} className="blog-pagination-link blog-pagination-link--direction" scroll={false}>Previous</Link>}
              {paginationItems.map((item, index) => typeof item === "string" ? (
                <span className="blog-pagination-gap" key={`gap-${index}`} aria-hidden="true">…</span>
              ) : item === activePage ? (
                <span className="blog-pagination-current" key={item} aria-current="page">{item}</span>
              ) : (
                <Link href={pageHref(item, query)} className="blog-pagination-link" key={item} scroll={false}>{item}</Link>
              ))}
              {activePage < totalPages && <Link href={pageHref(activePage + 1, query)} className="blog-pagination-link blog-pagination-link--direction" scroll={false}>Next</Link>}
            </div>
            <div className="blog-pagination-compact">
              {activePage > 1 && <Link href={pageHref(activePage - 1, query)} className="blog-pagination-link blog-pagination-link--direction" scroll={false}>Previous</Link>}
              <span className="blog-pagination-current" aria-current="page">Page {activePage} of {totalPages}</span>
              {activePage < totalPages && <Link href={pageHref(activePage + 1, query)} className="blog-pagination-link blog-pagination-link--direction" scroll={false}>Next</Link>}
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}
