import { defineType, defineField } from "sanity";
import { category } from "./base";
import { topic } from "./base";

export const storyThread = defineType({
  name: "storyThread",
  title: "Story Thread",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Completed", value: "completed" },
        ],
      },
    }),
    defineField({ name: "heroImage", title: "Hero Image", type: "image", options: { hotspot: true } }),
    defineField({ name: "startedAt", title: "Started At", type: "datetime" }),
    defineField({ name: "updatedAt", title: "Updated At", type: "datetime" }),
    defineField({
      name: "articles",
      title: "Articles",
      type: "array",
      of: [{ type: "reference", to: [{ type: "article" }] }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
    defineField({
      name: "topics",
      title: "Topics",
      type: "array",
      of: [{ type: "reference", to: [{ type: "topic" }] }],
    }),
    defineField({ name: "featured", title: "Featured", type: "boolean" }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "seoTitle", title: "SEO Title", type: "string" }),
        defineField({ name: "seoDescription", title: "SEO Description", type: "string" }),
        defineField({ name: "canonicalOverride", title: "Canonical Override", type: "string" }),
        defineField({ name: "socialImage", title: "Social Image", type: "image" }),
        defineField({ name: "noIndex", title: "No Index", type: "boolean" }),
        defineField({ name: "noFollow", title: "No Follow", type: "boolean" }),
      ],
    }),
  ],
  preview: {
    select: { title: "title", media: "heroImage" },
  },
});