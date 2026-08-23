import { createClient } from "@sanity/client";

const apiVersion = "2025-02-19";

export function getSanityServerClient() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity server configuration is missing");
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion,
    useCdn: false,
    perspective: "raw",
  });
}
