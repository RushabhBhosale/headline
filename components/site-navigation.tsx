import Link from "next/link";
import type { CategoryLink, Slug } from "@/sanity/lib/queries";

type TickerStory = { _id: string; title: string; slug: Slug };

export function SiteNavigation({ categories, latestStories }: { categories: CategoryLink[]; latestStories: TickerStory[] }) {
  const tickerStories = [...latestStories, ...latestStories];

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="Headline home">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span>Headline<span className="brand-dot">.</span></span>
          </Link>
        </div>
      </header>

      <nav className="category-bar" aria-label="Categories">
        <div className="category-bar-inner">
          <Link href="/">All stories</Link>
          {categories.map((category) => <Link href={`/categories/${category.slug.current}`} key={category._id}>{category.title}</Link>)}
        </div>
      </nav>

      {latestStories.length ? (
        <div className="story-ticker" aria-label="Latest stories">
          <span className="story-ticker-label">Latest</span>
          <div className="story-ticker-window">
            <div className="story-ticker-track">
              {tickerStories.map((story, index) => (
                <Link href={`/articles/${story.slug.current}`} key={`${story._id}-${index}`} aria-hidden={index >= latestStories.length || undefined} tabIndex={index >= latestStories.length ? -1 : undefined}>
                  <span>{story.title}</span><i aria-hidden="true">/</i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p><span className="footer-brand">Headline.</span> Context for the stories that matter.</p>
        <div className="footer-links">
          <Link href="/privacy-policy">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} Headline</p>
      </div>
    </footer>
  );
}
