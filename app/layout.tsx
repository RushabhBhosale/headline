import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteNavigation } from "@/components/site-navigation";
import { getSiteNavigationData } from "@/sanity/lib/queries";
import "./globals.css";
import Script from "next/script";

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
  themeColor: "#f8f7f3",
};

export const revalidate = 60;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let navigation: Awaited<ReturnType<typeof getSiteNavigationData>> = { categories: [] };
  try {
    navigation = await getSiteNavigationData();
  } catch {}

  return (
    <html lang="en">
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9X1TWY7CWK"
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
        <SiteNavigation categories={navigation.categories} />
        <div className="site-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
