import type { Metadata } from "next";
import { SiteFooter, SiteNavigation } from "@/components/site-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Headline — stories with context", template: "%s | Headline" },
  description: "Independent reporting and clear context for the stories that matter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SiteNavigation />
        <div className="site-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
