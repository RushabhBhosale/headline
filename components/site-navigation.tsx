import Link from "next/link";
import type { CategoryLink } from "@/sanity/lib/queries";

export function SiteNavigation({ categories }: { categories: CategoryLink[] }) {
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
