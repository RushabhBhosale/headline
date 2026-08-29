import { defineType, defineField } from "sanity";
import { author } from "./base";
import { category } from "./base";
import { topic } from "./base";
import { contentImage, richTextBlock } from "./portableText";

export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text" }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [richTextBlock, contentImage],
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
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({ name: "heroImageAlt", title: "Hero Image Alt", type: "string" }),
    defineField({ name: "heroImageCaption", title: "Hero Image Caption", type: "string" }),
    defineField({ name: "heroImageCredit", title: "Hero Image Credit", type: "string" }),
    defineField({
      name: "imageStatus",
      title: "Image Processing Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Processing", value: "processing" },
          { title: "Complete", value: "complete" },
          { title: "Partial", value: "partial" },
          { title: "Manual Review", value: "manual-review" },
          { title: "Failed", value: "failed" },
        ],
      },
    }),
    defineField({
      name: "imageRequirements",
      title: "Image Requirements",
      type: "object",
      fields: [
        defineField({ name: "heroQuery", title: "Hero Search Query", type: "string" }),
        defineField({
          name: "bodyImageQueries",
          title: "Body Image Search Queries",
          type: "array",
          of: [{ type: "string" }],
          validation: (rule) => rule.max(2),
        }),
      ],
    }),
    defineField({
      name: "imageProcessing",
      title: "Image Processing Metadata",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "workflowRunId", title: "Workflow Run ID", type: "string" }),
        defineField({ name: "status", title: "Status", type: "string" }),
        defineField({ name: "lastAttemptAt", title: "Last Attempt", type: "datetime" }),
        defineField({ name: "completedAt", title: "Completed At", type: "datetime" }),
        defineField({ name: "error", title: "Error", type: "text" }),
        defineField({ name: "reviewReason", title: "Review Reason", type: "text" }),
        defineField({
          name: "sources",
          title: "Source and Attribution Records",
          type: "array",
          of: [{
            type: "object",
            fields: [
              defineField({ name: "placement", title: "Placement", type: "string" }),
              defineField({ name: "query", title: "Search Query", type: "string" }),
              defineField({ name: "sourcePageUrl", title: "Source Page URL", type: "url" }),
              defineField({ name: "sourceImageUrl", title: "Source Image URL", type: "url" }),
              defineField({ name: "sourceDomain", title: "Source Domain", type: "string" }),
              defineField({ name: "sourceName", title: "Source Name", type: "string" }),
              defineField({ name: "licenseInfo", title: "Usage Evidence", type: "text" }),
              defineField({ name: "attribution", title: "Attribution", type: "string" }),
              defineField({ name: "retrievedAt", title: "Retrieved At", type: "datetime" }),
              defineField({ name: "assetRef", title: "Sanity Asset Reference", type: "string" }),
              defineField({ name: "contentHash", title: "Content Hash", type: "string" }),
              defineField({ name: "bodyBlockKey", title: "Body Block Key", type: "string" }),
            ],
          }],
        }),
        defineField({
          name: "reviewCandidates",
          title: "Manual Review Candidates",
          type: "array",
          of: [{
            type: "object",
            fields: [
              defineField({ name: "placement", title: "Placement", type: "string" }),
              defineField({ name: "query", title: "Search Query", type: "string" }),
              defineField({ name: "sourcePageUrl", title: "Source Page URL", type: "url" }),
              defineField({ name: "sourceImageUrl", title: "Source Image URL", type: "url" }),
              defineField({ name: "sourceDomain", title: "Source Domain", type: "string" }),
              defineField({ name: "sourceName", title: "Source Name", type: "string" }),
              defineField({ name: "reason", title: "Reason", type: "text" }),
              defineField({ name: "score", title: "Score", type: "number" }),
            ],
          }],
        }),
      ],
    }),
    defineField({ name: "publishedAt", title: "Published At", type: "datetime" }),
    defineField({ name: "updatedAt", title: "Updated At", type: "datetime" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Published", value: "published" },
          { title: "Updated", value: "updated" },
          { title: "Corrected", value: "corrected" },
        ],
      },
    }),
    defineField({ name: "featured", title: "Featured", type: "boolean" }),
    defineField({ name: "breaking", title: "Breaking", type: "boolean" }),
    defineField({ name: "trending", title: "Trending", type: "boolean" }),
    defineField({
      name: "thread",
      title: "Thread",
      type: "reference",
      to: [{ type: "storyThread" }],
    }),
    defineField({
      name: "relatedArticles",
      title: "Related Articles",
      type: "array",
      of: [{ type: "reference", to: [{ type: "article" }] }],
    }),
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
    defineField({ name: "correctionNote", title: "Correction Note", type: "text" }),
    defineField({ name: "updateNote", title: "Update Note", type: "text" }),
  ],
  preview: {
    select: {
      title: "title",
      media: "heroImage",
    },
  },
});
