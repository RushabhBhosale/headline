import { defineType, defineField } from "sanity";

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "leadStory",
      title: "Lead Story",
      type: "reference",
      to: [{ type: "article" }],
    }),
    defineField({
      name: "secondaryStories",
      title: "Secondary Stories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "article" }] }],
    }),
    defineField({
      name: "featuredStories",
      title: "Featured Stories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "article" }] }],
    }),
    defineField({
      name: "featuredThread",
      title: "Featured Thread",
      type: "reference",
      to: [{ type: "storyThread" }],
    }),
    defineField({
      name: "trendingStories",
      title: "Trending Stories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "article" }] }],
    }),
    defineField({
      name: "sectionOrdering",
      title: "Section Ordering",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "category", title: "Category", type: "reference", to: [{ type: "category" }] },
            { name: "order", title: "Order", type: "number" },
          ],
        },
      ],
    }),
    defineField({
      name: "breakingNewsBanner",
      title: "Breaking News Banner",
      type: "object",
      fields: [
        { name: "enabled", title: "Enabled", type: "boolean" },
        { name: "title", title: "Title", type: "string" },
        { name: "link", title: "Link", type: "string" },
      ],
    }),
  ],
});
