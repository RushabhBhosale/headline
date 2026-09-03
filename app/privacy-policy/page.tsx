import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "Read the Headline Thread privacy policy.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <main className="prose max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-zinc-600 mb-4">
        We respect your privacy and are committed to protecting it.
      </p>
      <ul className="list-disc list-inside text-zinc-500 space-y-4">
        <li>
          <strong>Data Collection:</strong> We collect minimal data necessary for site functionality.
        </li>
        <li>
          <strong>Cookies:</strong> We use cookies to improve user experience.
        </li>
        <li>
          <strong>Third-Party:</strong> We do not sell your data to third parties.
        </li>
      </ul>
    </main>
  );
}
