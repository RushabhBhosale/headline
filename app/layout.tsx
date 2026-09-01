import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { SiteFooter, SiteNavigation } from "@/components/site-navigation";
import { getSiteNavigationData } from "@/sanity/lib/queries";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Headline — stories with context",
    template: "%s | Headline",
  },
  description:
    "Independent reporting and clear context for the stories that matter.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fbfaf8",
};

export const revalidate = 60;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let navigation: Awaited<ReturnType<typeof getSiteNavigationData>> = {
    categories: [],
  };
  try {
    navigation = await getSiteNavigationData();
  } catch {}

  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9X1TWY7CWK"
        strategy="afterInteractive"
      />

      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1425611919231559"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9X1TWY7CWK');
        `}
      </Script>
      <body>
        <SiteNavigation
          categories={navigation.categories}
          latestHeadline={navigation.latestHeadline}
        />
        <div className="site-content">{children}</div>
        <SiteFooter categories={navigation.categories} />
      </body>
    </html>
  );
}
