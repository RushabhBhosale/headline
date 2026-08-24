import { defineType, defineField } from "sanity";
import { richTextBlock } from "./portableText";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "siteName", title: "Site Name", type: "string" }),
    defineField({ name: "tagline", title: "Tagline", type: "string" }),
    defineField({ name: "siteDescription", title: "Site Description", type: "text" }),
    defineField({ name: "logo", title: "Logo", type: "image" }),
    defineField({ name: "defaultSeoImage", title: "Default SEO Image", type: "image" }),
    defineField({ name: "socialLinks", title: "Social Links", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "organizationInfo", title: "Organization Information", type: "text" }),
    defineField({ name: "publisherInfo", title: "Publisher Information", type: "text" }),
    defineField({ name: "contactDetails", title: "Contact Details", type: "text" }),
    defineField({ name: "footerSettings", title: "Footer Settings", type: "text" }),
    defineField({ name: "googleVerification", title: "Google Verification", type: "string" }),
    defineField({ name: "adsensePublisherId", title: "AdSense Publisher ID", type: "string" }),
    defineField({ 
  name: "analyticsIds", 
  title: "Analytics IDs", 
  type: "object",
  fields: [
    { name: "googleAnalytics", title: "Google Analytics", type: "string" },
    { name: "searchConsole", title: "Search Console", type: "string" }
  ] 
}),
  ],
});

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string" }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "name" } }),
    defineField({ name: "photo", title: "Photo", type: "image" }),
    defineField({ name: "shortBio", title: "Short Bio", type: "text" }),
    defineField({ name: "fullBio", title: "Full Bio", type: "array", of: [richTextBlock] }),
    defineField({ name: "role", title: "Role", type: "string" }),
    defineField({ name: "expertise", title: "Expertise", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "socialLinks", title: "Social Links", type: "array", of: [{ type: "object", fields: [{ name: "name", type: "string" }, { name: "url", type: "string" }] }] }),
    defineField({ name: "profileLinks", title: "Profile Links", type: "array", of: [{ type: "object", fields: [{ name: "name", type: "string" }, { name: "url", type: "string" }] }] }),
  ],
});

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "seoTitle", title: "SEO Title", type: "string" }),
    defineField({ name: "seoDescription", title: "SEO Description", type: "string" }),
    defineField({ name: "featuredImage", title: "Featured Image", type: "image" }),
    defineField({ name: "displayOrder", title: "Display Order", type: "number" }),
  ],
});

export const subscriber = defineType({
  name: "subscriber",
  title: "Newsletter Subscriber",
  type: "document",
  fields: [
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "subscribedAt", title: "Subscribed At", type: "datetime" }),
    defineField({ name: "unsubscribed", title: "Unsubscribed", type: "boolean", initialValue: false }),
  ],
});

export const topic = defineType({
  name: "topic",
  title: "Topic",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "seoTitle", title: "SEO Title", type: "string" }),
    defineField({ name: "seoDescription", title: "SEO Description", type: "string" }),
  ],
});
