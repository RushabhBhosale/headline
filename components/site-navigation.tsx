"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "contact";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/contact", label: "Contact", icon: "contact" },
];

function NavIcon({ name }: { name: IconName }) {
  const paths = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />,
    contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="Headline home">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span>Headline<span className="brand-dot">.</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={pathname === link.href ? "is-active" : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/contact" className="header-cta">Get in touch</Link>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
              <NavIcon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          );
        })}
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
          <Link href="/corrections-policy">Corrections</Link>
          <Link href="/privacy-policy">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} Headline</p>
      </div>
    </footer>
  );
}
