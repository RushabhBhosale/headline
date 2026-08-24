import Image from "next/image";
import Link from "next/link";
import type { CategoryLink } from "@/sanity/lib/queries";

export function SiteNavigation({ categories }: { categories: CategoryLink[] }) {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="Headline home">
            <Image
              src="/horizontal_logo.png"
              alt="Headline Thread"
              width={2172}
              height={724}
              className="site-brand-logo"
              priority
            />
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
