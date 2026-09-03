import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "Read the Headline Thread terms of use.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="prose max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      <p className="text-zinc-600 mb-4">
        Please read these terms carefully before using this website.
      </p>
      <ul className="list-disc list-inside text-zinc-500 space-y-4">
        <li>
          <strong>Usage:</strong> This website is for personal, non-commercial use.
        </li>
        <li>
          <strong>Content:</strong> All content is property of Headline Thread.
        </li>
        <li>
          <strong>Modifications:</strong> We reserve the right to modify these terms at any time.
        </li>
      </ul>
    </main>
  );
}
