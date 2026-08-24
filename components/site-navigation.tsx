import Image from "next/image";
import Link from "next/link";
import type { ArticleCard, CategoryLink } from "@/sanity/lib/queries";

function todayLine() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function SiteNavigation({ categories, latestHeadline }: { categories: CategoryLink[]; latestHeadline?: ArticleCard | null }) {
  return (
    <>
      <div className="utility-bar">
        <div className="utility-bar-inner">
          <span>{todayLine()}</span>
          <span className="utility-tagline">Independent reporting, clear context</span>
        </div>
      </div>

      <header className="site-header">
        <div className="site-header-inner">
          <div className="masthead-teaser">
            <span className="teaser-dot" aria-hidden="true" />
            <span className="teaser-label">{latestHeadline?.breaking ? "Breaking" : "Latest"}</span>
            {latestHeadline && (
              <Link href={`/articles/${latestHeadline.slug.current}`}>{latestHeadline.title}</Link>
            )}
          </div>
          <Link href="/" className="site-brand" aria-label="Headline home">
            <Image
              src="/horizontal_logo.png"
              alt="Headline"
              width={2172}
              height={724}
              className="site-brand-logo"
              priority
            />
          </Link>
          <Link href="/contact" className="header-cta">Newsletter</Link>
        </div>
      </header>

      <nav className="category-bar" aria-label="Categories">
        <div className="category-bar-inner">
          <Link href="/">Top stories</Link>
          {categories.map((category) => (
            <Link href={`/categories/${category.slug.current}`} key={category._id}>
              {category.title}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function SiteFooter({ categories }: { categories: CategoryLink[] }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <p className="footer-brand">Headline.</p>
            <p className="footer-tagline">Independent reporting and clear context for the stories that matter.</p>
          </div>
          <div className="footer-col">
            <p className="footer-heading">Sections</p>
            <ul>
              <li><Link href="/">Top stories</Link></li>
              {categories.slice(0, 5).map((category) => (
                <li key={category._id}><Link href={`/categories/${category.slug.current}`}>{category.title}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-heading">Company</p>
            <ul>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/privacy-policy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of use</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Headline. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
