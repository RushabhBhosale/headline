import { defineArrayMember, defineField } from "sanity";

export const richTextBlock = defineArrayMember({
  type: "block",
  styles: [
    { title: "Normal", value: "normal" },
    { title: "Heading 2", value: "h2" },
    { title: "Heading 3", value: "h3" },
    { title: "Blockquote", value: "blockquote" },
    { title: "Callout", value: "callout" },
  ],
  lists: [
    { title: "Bullet", value: "bullet" },
    { title: "Number", value: "number" },
  ],
  marks: {
    decorators: [
      { title: "Strong", value: "strong" },
      { title: "Emphasis", value: "em" },
      { title: "Code", value: "code" },
    ],
    annotations: [
      {
        name: "link",
        title: "Link",
        type: "object",
        fields: [
          defineField({ name: "href", title: "URL", type: "url", validation: (rule) => rule.required() }),
        ],
      },
    ],
  },
});
